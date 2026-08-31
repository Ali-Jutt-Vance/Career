# Phase 7 — Chapter 7: Database Scaling

---

## Chapter Overview

At scale, the database is almost always the first bottleneck. This chapter covers every technique for scaling databases: vertical, read replicas, connection pooling, sharding, partitioning, and selecting the right database for each workload.

**Topics:**
- Vertical scaling limits
- Read replicas and read/write splitting
- Connection pooling (PgBouncer, RDS Proxy)
- Table partitioning (range, list, hash)
- Horizontal sharding strategies
- Database selection by use case
- N+1 query problem and batch loading

---

## Core Concepts

### The Database Scaling Ladder

```
Step 1 — Optimize queries and indexes (FREE)
  Before scaling, ensure:
  - EXPLAIN ANALYZE on slow queries
  - Indexes on all WHERE/JOIN/ORDER BY columns
  - Avoid SELECT * — specify columns
  - Avoid N+1 queries (use JOINs or batch loading)
  - Query timeouts and cancellation

Step 2 — Vertical scale (simple, limited)
  Upgrade to larger DB instance: db.t3.medium → db.r6g.4xlarge
  More RAM → more buffer pool → more queries served from memory
  Ceiling: most expensive RDS = ~$15,000/month
  Single point of failure.

Step 3 — Connection pooling (critical)
  DB connections are expensive (128 MB each on PostgreSQL).
  PgBouncer / RDS Proxy: pool connections, reduce DB resource usage.
  100 app instances × 10 connections = 1,000 connections → too many
  → Pool: 1,000 app connections → PgBouncer → 50 real DB connections

Step 4 — Read replicas (horizontal read scale)
  Primary handles writes.
  N replicas handle reads.
  Application routes: reads → replica, writes → primary.
  RDS: up to 5 replicas. Aurora: up to 15.

Step 5 — Caching (eliminate DB reads)
  Redis: cache query results, session data, computed values.
  CDN: cache API responses (read-only endpoints).
  90% cache hit → 10x read reduction.

Step 6 — Table partitioning
  Split large table across multiple physical partitions.
  Single logical table, faster queries on each partition.
  Range: orders from 2024 / 2025 / 2026.
  Hash: user_id % 8 → partition 0..7.

Step 7 — Horizontal sharding
  Split data across multiple database instances.
  Each shard is an independent DB server.
  Application or proxy routes by shard key.
  Extreme scale: Facebook, Amazon, Uber use this.
```

---

## Table Partitioning

```sql
-- Range partitioning by date (PostgreSQL)
CREATE TABLE orders (
  id          UUID NOT NULL,
  user_id     UUID NOT NULL,
  amount      DECIMAL(10,2),
  created_at  TIMESTAMPTZ NOT NULL
) PARTITION BY RANGE (created_at);

-- Create partitions
CREATE TABLE orders_2024 PARTITION OF orders
  FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');

CREATE TABLE orders_2025 PARTITION OF orders
  FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');

CREATE TABLE orders_2026 PARTITION OF orders
  FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');

-- Create indexes on each partition
CREATE INDEX ON orders_2025 (user_id);
CREATE INDEX ON orders_2025 (created_at);

-- Query: PostgreSQL prunes partitions automatically
EXPLAIN SELECT * FROM orders
WHERE created_at >= '2025-01-01' AND created_at < '2026-01-01';
-- → Scans only orders_2025, not all 3 partitions

-- Hash partitioning by user_id (distribute evenly)
CREATE TABLE user_events (
  id      UUID NOT NULL,
  user_id UUID NOT NULL,
  type    TEXT,
  data    JSONB
) PARTITION BY HASH (user_id);

CREATE TABLE user_events_0 PARTITION OF user_events
  FOR VALUES WITH (MODULUS 4, REMAINDER 0);
CREATE TABLE user_events_1 PARTITION OF user_events
  FOR VALUES WITH (MODULUS 4, REMAINDER 1);
CREATE TABLE user_events_2 PARTITION OF user_events
  FOR VALUES WITH (MODULUS 4, REMAINDER 2);
CREATE TABLE user_events_3 PARTITION OF user_events
  FOR VALUES WITH (MODULUS 4, REMAINDER 3);
```

---

## Sharding Strategy

```
Shard Key Selection:
  Goal: evenly distribute writes, avoid cross-shard queries.
  Good: user_id (most queries are per-user)
  Bad:  created_at (hot partition — today's orders overwhelm one shard)
  Bad:  status (imbalanced — most orders are 'completed')

Shard routing:
  Hash-based:    shard = hash(userId) % numShards
  Range-based:   userIds 1-1M → shard 1, 1M-2M → shard 2
  Directory:     lookup table: userId → shardId (flexible, can rebalance)

Limitations of sharding:
  Cross-shard JOINs are impossible (or very expensive)
  Transactions across shards require distributed transactions (avoid)
  Rebalancing shards is complex (resharding)
  Schema changes must apply to all shards

Alternatives to manual sharding:
  DynamoDB:  automatic sharding by partition key, fully managed
  CockroachDB: automatically shards, SQL compatible
  YugabyteDB: PostgreSQL-compatible, auto-sharding
  Vitess:    proxy layer for MySQL sharding (YouTube uses this)

Rule: Don't shard until you've exhausted all other options.
Most companies never need manual sharding if they use DynamoDB or Cassandra.
```

---

## Code Examples

### Connection Pool with PgBouncer

```yaml
# pgbouncer.ini
[databases]
myapp = host=rds-primary.example.com port=5432 dbname=myapp

[pgbouncer]
listen_addr    = 0.0.0.0
listen_port    = 5432
auth_type      = md5
auth_file      = /etc/pgbouncer/users.txt
pool_mode      = transaction   # transaction pooling = best concurrency
max_client_conn = 10000        # max app connections to pgbouncer
default_pool_size = 50         # real connections to postgres
min_pool_size    = 10
reserve_pool_size = 5
log_connections  = 0
log_disconnections = 0
```

### Sharding in Node.js (Application-Level)

```typescript
import { Pool } from "pg";

const shards: Pool[] = [
  new Pool({ connectionString: process.env.SHARD_0_URL }),
  new Pool({ connectionString: process.env.SHARD_1_URL }),
  new Pool({ connectionString: process.env.SHARD_2_URL }),
  new Pool({ connectionString: process.env.SHARD_3_URL }),
];

function getShardIndex(userId: string): number {
  // Stable hash: same userId → same shard always
  let hash = 0;
  for (const char of userId) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return hash % shards.length;
}

function getShard(userId: string): Pool {
  return shards[getShardIndex(userId)];
}

// All user queries go to the correct shard
export async function getUserOrders(userId: string) {
  const shard = getShard(userId);
  const { rows } = await shard.query(
    "SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC",
    [userId]
  );
  return rows;
}

export async function createOrder(userId: string, amount: number) {
  const shard = getShard(userId);
  const { rows } = await shard.query(
    "INSERT INTO orders (user_id, amount) VALUES ($1, $2) RETURNING *",
    [userId, amount]
  );
  return rows[0];
}

// Cross-shard query (avoid — fan-out to all shards)
export async function getOrdersByStatus(status: string) {
  const results = await Promise.all(
    shards.map(shard =>
      shard.query("SELECT * FROM orders WHERE status = $1", [status])
        .then(r => r.rows)
    )
  );
  return results.flat();
}
```

### Solving N+1 Queries

```typescript
// ─── BAD: N+1 query ─────────────────────────────────
async function getPostsWithAuthors_BAD() {
  const posts = await db.query("SELECT * FROM posts LIMIT 100");  // 1 query
  for (const post of posts.rows) {
    post.author = await db.query(
      "SELECT * FROM users WHERE id = $1", [post.author_id]   // N queries!
    ).then(r => r.rows[0]);
  }
  return posts.rows;
  // Total: 101 queries for 100 posts
}

// ─── GOOD: JOIN (1 query) ────────────────────────────
async function getPostsWithAuthors_JOIN() {
  const { rows } = await db.query(`
    SELECT p.*, u.name as author_name, u.avatar as author_avatar
    FROM posts p
    JOIN users u ON p.author_id = u.id
    LIMIT 100
  `);
  return rows;
  // Total: 1 query
}

// ─── GOOD: Batch load (2 queries) ───────────────────
async function getPostsWithAuthors_BATCH() {
  const { rows: posts } = await db.query("SELECT * FROM posts LIMIT 100");

  const authorIds = [...new Set(posts.map(p => p.author_id))];
  const { rows: authors } = await db.query(
    "SELECT * FROM users WHERE id = ANY($1)",
    [authorIds]
  );

  const authorMap = new Map(authors.map(a => [a.id, a]));
  return posts.map(p => ({ ...p, author: authorMap.get(p.author_id) }));
  // Total: 2 queries for 100 posts
}
```

---

## Interview Preparation

**Q1: When should you use sharding vs. partitioning?**
A: Partitioning: splits a single table into multiple physical segments within one database server. Transparent to the application — you still query the same table name. PostgreSQL handles partition pruning automatically. Use when: table has grown too large for efficient querying (hundreds of millions of rows), but you don't need multiple DB servers. Common pattern: time-based range partitioning for logs/events/orders. Sharding: splits data across multiple separate database servers. Application must know which server to query. Much more complex. Use when: single database server is the bottleneck (write throughput, total data size exceeds one machine), after you've tried caching, read replicas, and partitioning. Most companies manage billions of rows without sharding using DynamoDB, Cassandra, or partitioned PostgreSQL.

**Q2: What is connection pooling and why is it critical?**
A: PostgreSQL allocates about 10 MB of memory per connection + a separate process. 1,000 connections = 10 GB of RAM just for connection overhead, and PostgreSQL performance degrades significantly with many connections. With 50 app instances each needing 10 connections = 500 connections just for small deployments. Connection pooling (PgBouncer, RDS Proxy): app instances connect to the pooler, which maintains a much smaller set of real database connections. Pool of 500 app connections → 20–50 real DB connections. Three pool modes: session pooling (one real connection per session — not much saving), transaction pooling (real connection returned to pool after each transaction — most efficient, works with most ORMs), statement pooling (per statement — breaks prepared statements). Transaction pooling is the default recommendation.

---

## Practical Tasks

### Beginner (10 Tasks)
1. Run `EXPLAIN ANALYZE` on a slow query.
2. Add missing index on a foreign key column.
3. Identify N+1 queries in a Node.js + Prisma app.
4. Fix N+1 with `include` (Prisma eager loading).
5. Set up a read replica on RDS.
6. Route read queries to the replica in application code.
7. Add `LIMIT` and `OFFSET` for pagination.
8. Use `SELECT col1, col2` instead of `SELECT *`.
9. Create a covering index for a frequent query.
10. Enable slow query logging (pg_stat_statements).

### Intermediate (10 Tasks)
1. Set up PgBouncer in transaction mode.
2. Implement connection pool metrics (active/idle/wait).
3. Partition an events table by month using range partitioning.
4. Verify partition pruning with `EXPLAIN`.
5. Implement hash partitioning on a user events table.
6. Add an index on each partition.
7. Build batch query with `IN ($1, $2, ...)` for related data.
8. Use DataLoader pattern for batching in GraphQL.
9. Measure query performance before/after index.
10. Set up RDS Proxy and connect through it.

### Advanced (10 Tasks)
1. Design sharding strategy for a multi-tenant SaaS.
2. Implement consistent hashing for shard routing.
3. Build a shard migration tool.
4. Implement cross-shard query with result fan-out.
5. Design a global secondary index for a sharded system.
6. Implement automatic connection retry on pool exhaustion.
7. Measure PgBouncer throughput vs. direct connections.
8. Design row-level TTL for time-series tables.
9. Implement partial indexes for filtered queries.
10. Build a read-your-own-writes guarantee on read replicas.

---

## Cheat Sheet

```sql
-- Check slow queries
SELECT query, mean_exec_time, calls, total_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC LIMIT 10;

-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_fetch
FROM pg_stat_user_indexes ORDER BY idx_scan ASC;

-- Check table sizes
SELECT pg_size_pretty(pg_total_relation_size(relid)) AS size, relname
FROM pg_catalog.pg_statio_user_tables
ORDER BY pg_total_relation_size(relid) DESC;

-- Explain plan
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
  SELECT * FROM orders WHERE user_id = 'abc' AND created_at > '2025-01-01';

-- Partitioning
CREATE TABLE t PARTITION BY RANGE (created_at);
CREATE TABLE t_2025 PARTITION OF t FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');

-- Batch insert
INSERT INTO table (col1, col2) SELECT unnest($1::uuid[]), unnest($2::text[]);
```

```
Scaling order (try in order):
  1. Query optimization + indexes (free, immediate)
  2. Connection pooling (PgBouncer/RDS Proxy)
  3. Vertical scale (bigger instance)
  4. Read replicas (distribute reads)
  5. Caching (Redis — eliminate DB reads)
  6. Partitioning (single server, faster per-partition)
  7. Sharding (multiple servers — last resort)
  Or: migrate to DynamoDB/Cassandra (managed auto-sharding)
```
