# Phase 3 — Chapter 10: Database Partitioning & Sharding

---

## Chapter Overview

Partitioning splits one large table into smaller physical pieces while presenting a single logical table. Sharding splits data across multiple database servers entirely. Both are strategies for handling data sets that are too large for a single machine.

**Partitioning (single server):**
- Split large tables into partitions for query performance and manageability
- PostgreSQL native: RANGE, LIST, HASH partitioning
- Each partition is a separate physical file; the planner prunes irrelevant ones

**Sharding (multiple servers):**
- Horizontal scaling: each shard holds a subset of rows
- Application or middleware routes queries to the correct shard
- Much more complex: no cross-shard JOINs, no cross-shard transactions

---

## Beginner Theory

### When to Partition

```
Signs a table needs partitioning:
  - Table has hundreds of millions of rows
  - Most queries filter on a column (e.g., created_at, tenant_id)
  - Table maintenance (VACUUM, ANALYZE) takes hours
  - Archiving old data is painful

Benefits of partitioning:
  - Partition pruning: queries only touch relevant partitions
  - Parallel query execution per partition
  - Faster VACUUM (per-partition maintenance)
  - Easy old data archival: detach partition → drop or archive

PostgreSQL partition types:
  RANGE   → continuous values (dates, numbers): "2025-01" to "2025-02"
  LIST    → discrete values (region, status, tenant_id)
  HASH    → hash of a column (even distribution when no natural grouping)
```

---

## Basic Examples

### Range Partitioning (Time Series)

```sql
-- Parent table (defines structure and partition strategy)
CREATE TABLE events (
  id         UUID          NOT NULL DEFAULT gen_random_uuid(),
  type       TEXT          NOT NULL,
  payload    JSONB,
  created_at TIMESTAMPTZ   NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (created_at);

-- Create monthly partitions
CREATE TABLE events_2025_01 PARTITION OF events
  FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

CREATE TABLE events_2025_02 PARTITION OF events
  FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');

CREATE TABLE events_2025_03 PARTITION OF events
  FOR VALUES FROM ('2025-03-01') TO ('2025-04-01');

-- Index on each partition (or parent — PostgreSQL propagates to partitions)
CREATE INDEX ON events(created_at);
CREATE INDEX ON events(type, created_at);

-- INSERT automatically routes to correct partition
INSERT INTO events (type, payload) VALUES ('login', '{"userId": "123"}');

-- Query uses partition pruning — only touches relevant partitions
EXPLAIN SELECT * FROM events
WHERE created_at >= '2025-02-01' AND created_at < '2025-03-01';
-- → only scans events_2025_02

-- Detach old partition for archival (no downtime)
ALTER TABLE events DETACH PARTITION events_2025_01;
-- events_2025_01 still exists as a standalone table
-- DROP TABLE events_2025_01; -- or copy to cold storage first
```

### List Partitioning (Region / Tenant)

```sql
-- Partition by region (e.g., for GDPR: EU data must stay in EU)
CREATE TABLE user_data (
  id      UUID NOT NULL,
  user_id UUID NOT NULL,
  region  TEXT NOT NULL,
  data    JSONB
) PARTITION BY LIST (region);

CREATE TABLE user_data_us  PARTITION OF user_data FOR VALUES IN ('US', 'CA', 'MX');
CREATE TABLE user_data_eu  PARTITION OF user_data FOR VALUES IN ('DE', 'FR', 'UK', 'IT');
CREATE TABLE user_data_apac PARTITION OF user_data FOR VALUES IN ('JP', 'AU', 'SG', 'IN');

-- Default partition catches anything not in other lists
CREATE TABLE user_data_other PARTITION OF user_data DEFAULT;
```

### Hash Partitioning (Even Distribution)

```sql
-- When no natural range/list partitioning column exists
CREATE TABLE orders (
  id      UUID          NOT NULL,
  user_id UUID          NOT NULL,
  total   DECIMAL(10,2),
  status  TEXT
) PARTITION BY HASH (id);

-- 8 partitions — even distribution by hash of id
CREATE TABLE orders_p0 PARTITION OF orders FOR VALUES WITH (MODULUS 8, REMAINDER 0);
CREATE TABLE orders_p1 PARTITION OF orders FOR VALUES WITH (MODULUS 8, REMAINDER 1);
-- ... repeat for p2 through p7
```

### Automatic Partition Creation

```javascript
// Create next month's partition automatically
// Run as a monthly cron job

async function createNextMonthPartition(tableName) {
  const now   = new Date();
  const next  = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const after = new Date(now.getFullYear(), now.getMonth() + 2, 1);

  const partitionName = `${tableName}_${next.getFullYear()}_${String(next.getMonth() + 1).padStart(2, "0")}`;
  const fromDate      = next.toISOString().split("T")[0];
  const toDate        = after.toISOString().split("T")[0];

  await db.query(`
    CREATE TABLE IF NOT EXISTS ${partitionName} PARTITION OF ${tableName}
    FOR VALUES FROM ('${fromDate}') TO ('${toDate}')
  `);

  logger.info(`Created partition: ${partitionName}`);
}
```

---

## Intermediate Concepts

### Sharding Concepts

```
Sharding splits data across N database servers (shards).
Each shard holds a subset of rows.

Shard key: the column used to decide which shard a row belongs to.
  Examples: user_id, tenant_id, geographic region

Shard routing strategies:
  Range sharding:
    Shard 1: user_id 1–1,000,000
    Shard 2: user_id 1,000,001–2,000,000
    Hotspot risk: if most activity is from recent users (high IDs), shard 2 overloaded
  
  Hash sharding:
    shard = hash(user_id) % num_shards
    Even distribution, but range queries are difficult
  
  Directory sharding:
    A lookup table maps entity → shard
    Maximum flexibility, but the lookup table itself is a bottleneck/SPOF

Sharding challenges:
  ✗ No cross-shard JOINs (must denormalize or do app-level joins)
  ✗ No cross-shard transactions (use Saga pattern)
  ✗ Resharding is painful (rebalancing data when adding shards)
  ✗ Global IDs (use UUIDs, snowflake IDs — not auto-increment)
  ✗ Schema changes on all shards simultaneously

When to shard:
  - Single node is at disk/CPU/memory capacity
  - Write throughput exceeds single PostgreSQL node (~50K writes/sec)
  - Partitioning and read replicas are not enough
  - Consider: Citus (PostgreSQL sharding extension), PlanetScale, CockroachDB first
```

### Application-Level Sharding

```javascript
// Shard routing middleware
const SHARD_COUNT = 4;
const shardPools  = Array.from({ length: SHARD_COUNT }, (_, i) =>
  new Pool({ host: `db-shard-${i}.internal`, database: "myapp" })
);

function getShardForUser(userId) {
  // Consistent hashing using fnv32 or murmurhash
  const hash = murmurhash3(userId);
  return hash % SHARD_COUNT;
}

class ShardedDB {
  // Get shard pool for a specific user
  pool(userId) {
    return shardPools[getShardForUser(userId)];
  }

  // Query specific shard
  async queryUser(userId, sql, params) {
    return this.pool(userId).query(sql, params);
  }

  // Scatter-gather: run query on all shards, merge results
  async queryAll(sql, params) {
    const results = await Promise.all(
      shardPools.map(pool => pool.query(sql, params))
    );
    // Merge and sort
    const allRows = results.flatMap(r => r.rows);
    return allRows;
  }
}

const shardedDB = new ShardedDB();

// Insert user — routes to correct shard based on userId
await shardedDB.queryUser(userId,
  "INSERT INTO orders (id, user_id, total) VALUES ($1, $2, $3)",
  [orderId, userId, total]
);

// Get all pending orders across all shards (scatter-gather)
const pendingOrders = await shardedDB.queryAll(
  "SELECT * FROM orders WHERE status = 'pending' LIMIT 100"
);
```

---

## Advanced Concepts

### Citus (PostgreSQL Sharding Extension)

```sql
-- Citus distributes PostgreSQL tables across worker nodes
-- Transparent to applications — uses standard SQL

-- Install Citus, then:
SELECT citus_add_node('worker1', 5432);
SELECT citus_add_node('worker2', 5432);

-- Distribute a table across shards by user_id
SELECT create_distributed_table('orders', 'user_id');

-- Collocate reference tables on all workers (small lookup tables)
SELECT create_reference_table('products');

-- Now regular SQL queries are automatically sharded:
SELECT user_id, SUM(total) FROM orders GROUP BY user_id;
-- Citus runs this on each worker, merges results on coordinator
```

---

## Interview Preparation

**Q1: What is the difference between partitioning and sharding?**
A: Partitioning splits a table into physical pieces on a SINGLE database server. The database engine manages routing transparently — queries still go to the same server. It helps with query performance (partition pruning) and table maintenance. Sharding splits data across MULTIPLE database servers. The application (or middleware) must route writes and reads to the correct shard. It's the solution for when a single server can no longer handle the write throughput or data volume. Sharding is far more complex — no cross-shard transactions, no cross-shard JOINs, resharding is painful.

**Q2: What is partition pruning?**
A: Partition pruning is when the PostgreSQL query planner determines that only a subset of partitions can contain rows matching the WHERE clause, and skips the others entirely. Example: `WHERE created_at >= '2025-02'` on a monthly-partitioned table — the planner knows it only needs to scan `events_2025_02` onward, skipping months in the past. You can verify pruning with `EXPLAIN` — pruned partitions don't appear in the plan. For pruning to work, the WHERE clause must filter on the partition key column directly (no functions that hide the column value).

**Q3: What is a hotspot in sharding and how do you avoid it?**
A: A hotspot is when one shard receives disproportionately more traffic than others. Common causes: range sharding on sequential IDs (most recent data gets all writes), celebrity effect (one user generates most traffic). Solutions: use hash sharding instead of range sharding for even distribution. Use composite shard keys. For the celebrity problem, add the entity ID as a secondary shard key to spread their data. In social media, a post from a celebrity may need dedicated shards or a separate caching layer rather than being stored alongside regular users.

---

## Practical Tasks

### Beginner (10 Tasks)
1. Create a range-partitioned `events` table with monthly partitions.
2. Insert data and verify it routes to the correct partition.
3. Run `EXPLAIN` and verify partition pruning occurs.
4. Create a list-partitioned table by region.
5. Create a hash-partitioned table with 4 partitions.
6. Detach an old partition and drop it.
7. Add an index on a partitioned table (verify it applies to all partitions).
8. Create a default partition for unmatched values.
9. Count rows per partition using `pg_stat_user_tables`.
10. Write a script to create the next month's partition automatically.

### Intermediate (10 Tasks)
1. Implement automatic monthly partition creation with a cron job.
2. Measure query performance before and after partitioning a 10M-row table.
3. Implement application-level shard routing based on user_id hash.
4. Build a scatter-gather query that runs on all shards and merges results.
5. Handle cross-shard aggregation in application code.
6. Implement a shard router that handles shard failover.
7. Set up Citus on PostgreSQL and distribute a table.
8. Monitor partition sizes over time.
9. Implement partition archival: move old partitions to a cold storage table.
10. Add a range partition with a default for catch-all rows.

### Advanced (10 Tasks)
1. Design a resharding strategy that doesn't require downtime.
2. Implement consistent hashing for shard routing (allows adding shards without full reshard).
3. Build a directory-based sharding system with a metadata database.
4. Implement the Saga pattern for cross-shard transactions.
5. Build a global ID generator (Snowflake-like) for sharded systems.
6. Implement cross-shard join in application layer using denormalization.
7. Set up Citus with 3 worker nodes and test auto-routing.
8. Benchmark partitioned vs. non-partitioned table at 100M rows.
9. Implement multi-tenant isolation using list partitioning by tenant_id.
10. Design and implement a full sharded architecture for a multi-tenant SaaS.

---

## Self Assessment
1. What is table partitioning?
2. What is the difference between RANGE and HASH partitioning?
3. What is partition pruning?
4. What is sharding?
5. What is a shard key?
6. What is a hotspot in sharding?
7. What is scatter-gather querying?
8. What is Citus?
9. Why can't you do cross-shard JOINs?
10. When should you choose sharding over partitioning?

---

## Cheat Sheet

```sql
-- Range partition
CREATE TABLE t (...) PARTITION BY RANGE (created_at);
CREATE TABLE t_2025_01 PARTITION OF t FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

-- List partition
CREATE TABLE t (...) PARTITION BY LIST (region);
CREATE TABLE t_us PARTITION OF t FOR VALUES IN ('US', 'CA');
CREATE TABLE t_default PARTITION OF t DEFAULT;

-- Hash partition
CREATE TABLE t (...) PARTITION BY HASH (id);
CREATE TABLE t_p0 PARTITION OF t FOR VALUES WITH (MODULUS 4, REMAINDER 0);

-- Attach/detach
ALTER TABLE t ATTACH PARTITION t_old FOR VALUES FROM (...) TO (...);
ALTER TABLE t DETACH PARTITION t_old;

-- Verify pruning
EXPLAIN SELECT * FROM t WHERE created_at >= '2025-02-01';
-- Should show only relevant partition
```

```javascript
// Shard routing
const shard = murmur3(userId) % NUM_SHARDS;
const pool  = shardPools[shard];
await pool.query(sql, params);
```
