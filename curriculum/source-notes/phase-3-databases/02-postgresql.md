# Phase 3 — Chapter 2: PostgreSQL

---

## Chapter Overview

PostgreSQL is the world's most advanced open-source relational database. It extends SQL with powerful features: JSONB, arrays, full-text search, table inheritance, custom types, extensions (PostGIS, pgcrypto, uuid-ossp), and world-class concurrency control via MVCC.

**Why PostgreSQL over MySQL or SQLite:**
- ACID compliant with true MVCC (no table-level locks on reads)
- Native JSONB for hybrid relational+document storage
- Extremely expressive: window functions, CTEs, lateral joins, ranges
- PostGIS extension for geospatial data
- Row-level security (RLS) for multi-tenant applications
- Partial indexes, expression indexes, covering indexes

---

## Beginner Theory

### PostgreSQL Architecture

```
Client (psql / pg / application)
  ↓
Postmaster Process (port 5432)
  ↓ forks per connection
Backend Process
  ↓
Shared Buffer Pool (shared_buffers) ─── WAL (Write-Ahead Log)
  ↓                                       ↓
Data Files (heap files)             WAL files (crash recovery)
(base/ directory)

Key processes:
  postmaster     — master process, accepts connections
  bgwriter       — writes dirty buffers to disk
  checkpointer   — periodically flushes all dirty pages
  autovacuum     — reclaims dead row versions (MVCC cleanup)
  wal writer     — writes WAL to disk
```

---

## Basic Examples

### Connection & Common Extensions

```sql
-- Connect (psql)
psql -h localhost -U postgres -d mydb

-- Useful meta-commands
\l              -- list databases
\c mydb         -- connect to database
\dt             -- list tables
\d users        -- describe table
\di             -- list indexes
\du             -- list users/roles
\x              -- expanded output (one field per line)
\timing         -- show query execution time
\e              -- open editor for multi-line query

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";    -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";     -- crypt(), gen_salt()
CREATE EXTENSION IF NOT EXISTS "pg_trgm";      -- trigram similarity search
CREATE EXTENSION IF NOT EXISTS "postgis";      -- geospatial
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements"; -- query statistics
```

### PostgreSQL-Specific Data Types

```sql
-- UUID
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);

-- Arrays
CREATE TABLE tags (
  id   SERIAL PRIMARY KEY,
  name TEXT,
  meta TEXT[]  -- array of text
);
INSERT INTO tags (name, meta) VALUES ('PostgreSQL', ARRAY['database', 'sql', 'open-source']);
SELECT * FROM tags WHERE 'sql' = ANY(meta);
SELECT * FROM tags WHERE meta @> ARRAY['database'];

-- JSONB (binary JSON with indexing)
CREATE TABLE events (
  id         UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  type       TEXT    NOT NULL,
  payload    JSONB   NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
INSERT INTO events (type, payload) VALUES
  ('user.login', '{"userId": "123", "ip": "1.2.3.4", "device": "mobile"}');

-- Query JSONB
SELECT payload->>'userId' AS user_id          -- text
FROM events WHERE type = 'user.login';

SELECT payload->'device' AS device            -- JSON value
FROM events WHERE payload->>'ip' = '1.2.3.4';

SELECT * FROM events
WHERE payload @> '{"device": "mobile"}';      -- contains operator

-- JSONB indexing (GIN — fast for @> queries)
CREATE INDEX idx_events_payload ON events USING gin(payload);

-- Range types
CREATE TABLE bookings (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id     UUID    NOT NULL,
  during      TSTZRANGE NOT NULL,
  EXCLUDE USING gist (room_id WITH =, during WITH &&)  -- no overlapping bookings!
);
INSERT INTO bookings (room_id, during) VALUES
  ('room-1', '[2025-01-15 09:00, 2025-01-15 10:00)');

-- Check for conflicts
SELECT * FROM bookings
WHERE room_id = 'room-1'
  AND during && '[2025-01-15 09:30, 2025-01-15 11:00)';

-- Enum types
CREATE TYPE order_status AS ENUM ('pending', 'processing', 'shipped', 'delivered', 'cancelled');
ALTER TABLE orders ADD COLUMN status order_status DEFAULT 'pending';
```

### Full-Text Search

```sql
-- tsvector: pre-processed document representation
-- tsquery:  parsed search query

-- Simple search
SELECT id, title
FROM articles
WHERE to_tsvector('english', title || ' ' || body) @@ to_tsquery('english', 'postgresql & indexing');

-- Ranking results
SELECT
  id,
  title,
  ts_rank(to_tsvector('english', title || ' ' || body), query) AS rank
FROM articles, to_tsquery('english', 'database & performance') AS query
WHERE to_tsvector('english', title || ' ' || body) @@ query
ORDER BY rank DESC;

-- Pre-computed tsvector column (better performance)
ALTER TABLE articles ADD COLUMN search_vector tsvector;
CREATE INDEX idx_articles_fts ON articles USING gin(search_vector);

-- Trigger to keep it updated
CREATE FUNCTION articles_search_trigger() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector('english', NEW.title || ' ' || coalesce(NEW.body, ''));
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

CREATE TRIGGER articles_search_update
  BEFORE INSERT OR UPDATE ON articles
  FOR EACH ROW EXECUTE FUNCTION articles_search_trigger();
```

---

## Intermediate Concepts

### Row-Level Security (Multi-Tenancy)

```sql
-- Enable RLS on the table
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts FORCE ROW LEVEL SECURITY;

-- Policy: users can only see their own posts
CREATE POLICY posts_user_isolation ON posts
  USING (user_id = current_setting('app.current_user_id')::UUID);

-- Policy: admins see all
CREATE POLICY posts_admin_access ON posts
  USING (current_setting('app.current_role') = 'admin');

-- Set context in your application
SET app.current_user_id = 'user-uuid-here';
SET app.current_role    = 'user';

-- All subsequent queries on `posts` are automatically filtered
SELECT * FROM posts;  -- only returns current user's posts
```

### Node.js with pg

```javascript
// npm install pg

const { Pool } = require("pg");

const pool = new Pool({
  host:     process.env.DB_HOST,
  port:     parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max:      20,                      // max connections in pool
  idleTimeoutMillis: 30_000,         // close idle connections after 30s
  connectionTimeoutMillis: 2_000,    // error if no connection in 2s
  ssl:      process.env.NODE_ENV === "production"
    ? { rejectUnauthorized: true, ca: process.env.DB_SSL_CERT }
    : false
});

// Query with parameterized placeholders ($1, $2, ...)
async function getUserById(id) {
  const { rows } = await pool.query(
    "SELECT id, email, name, role FROM users WHERE id = $1 AND is_active = TRUE",
    [id]
  );
  return rows[0] ?? null;
}

// Transaction helper
async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

// Use transaction
const order = await withTransaction(async (client) => {
  const { rows: [order] } = await client.query(
    "INSERT INTO orders (user_id, total) VALUES ($1, $2) RETURNING *",
    [userId, total]
  );

  await client.query(
    "UPDATE products SET stock = stock - $1 WHERE id = $2 AND stock >= $1",
    [quantity, productId]
  );

  return order;
});
```

---

## Advanced Concepts

### EXPLAIN ANALYZE

```sql
-- Always use EXPLAIN ANALYZE to understand query plans
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT u.name, COUNT(o.id) AS order_count
FROM users u
LEFT JOIN orders o ON o.user_id = u.id
GROUP BY u.id, u.name
ORDER BY order_count DESC
LIMIT 10;

-- Reading the output:
-- Seq Scan          → full table scan (usually bad for large tables)
-- Index Scan        → uses an index (good)
-- Index Only Scan   → covers all needed columns from index (best)
-- Hash Join         → joins via hash table (fast for large datasets)
-- Nested Loop Join  → outer rows × inner rows (fast when inner is small)
-- Merge Join        → sorted merge (fast when both sides sorted)
-- Rows=N actual=M   → if N is far from M, statistics are stale (run ANALYZE)

-- When to add an index: Seq Scan on a large table, repeated in hot queries
```

### Vacuum and Autovacuum

```sql
-- MVCC creates "dead rows" on every UPDATE and DELETE
-- VACUUM reclaims space, autovacuum runs automatically

-- Check dead row count
SELECT relname, n_live_tup, n_dead_tup, last_autovacuum, last_autoanalyze
FROM pg_stat_user_tables
ORDER BY n_dead_tup DESC;

-- Manual vacuum
VACUUM ANALYZE users;        -- reclaim space, update statistics
VACUUM FULL users;           -- rewrite table (locks table, use with caution)

-- Tuning autovacuum for high-write tables
ALTER TABLE orders SET (
  autovacuum_vacuum_scale_factor = 0.01,   -- vacuum when 1% of rows dead
  autovacuum_analyze_scale_factor = 0.005  -- analyze when 0.5% changed
);
```

---

## Interview Preparation

**Q1: What is MVCC and how does PostgreSQL implement it?**
A: MVCC (Multi-Version Concurrency Control) allows readers and writers to operate concurrently without blocking each other. Instead of locking a row for a read, PostgreSQL maintains multiple versions of each row — the old version remains visible to existing transactions while a new version is created by the write. Each transaction gets a snapshot of the database at the start of the transaction, and reads always see data consistent with that snapshot. Dead row versions are cleaned up by VACUUM. This means SELECT never blocks UPDATE, and UPDATE never blocks SELECT.

**Q2: What is JSONB and when would you use it over a relational column?**
A: JSONB stores JSON as a binary format (parsed, indexed), unlike JSON which stores the raw text. JSONB supports GIN indexing for fast `@>` (contains) queries. Use JSONB when: data has a variable, schema-less structure (event metadata, settings, audit logs), data doesn't need to be queried by individual fields often, or you're prototyping and schema isn't finalized. Don't use JSONB when: you need referential integrity, foreign keys, or frequently query individual fields — create proper columns instead. Hybrid: use relational columns for queried fields, JSONB for flexible metadata.

**Q3: What is Row-Level Security (RLS)?**
A: RLS enforces data isolation at the database level — users can only see and modify rows that match their policy, even if they run unrestricted SELECT queries. Essential for multi-tenant applications where tenant A must never see tenant B's data. Policy is attached to the table; the application sets a context variable (e.g., `SET app.current_user_id = 'uuid'`) which the policy reads using `current_setting()`. If your application has a bug and runs `SELECT * FROM orders` without a WHERE clause, RLS ensures only the current user's orders are returned.

### Deep Dive Answers (3+ Years Experience)

**Q4: A query was fast in development but slow in production. How do you investigate?**

**What they're testing:** Real-world DBA skills expected at 3 YOE backend roles.

**Deep Answer:**

**Step 1 — Gather data:** Get the exact SQL (from `pg_stat_statements`, ORM logging, or APM). Note execution time, frequency, and when it regressed.

**Step 2 — EXPLAIN ANALYZE in production-like environment:** Never run blindly on production without understanding impact. Use read replica if available.

Look for:
- `Seq Scan` on large table → missing index
- `Rows Removed by Filter` high → index not selective enough
- `Nested Loop` with high row estimate → bad join order or stale stats
- `Buffers: shared hit/read` — high disk reads mean cache miss

**Step 3 — Common dev vs prod differences:**
- Dev has 100 rows, prod has 10 million (seq scan was "fast enough" in dev)
- Dev database fits in RAM, prod doesn't (cold cache)
- Missing index in prod migration
- Different PostgreSQL version or config (`work_mem`, `shared_buffers`)
- Lock contention in prod (not present in dev)

**Step 4 — Fix and verify:** Add index, rewrite query, update statistics (`ANALYZE`), or add covering index. Re-run EXPLAIN ANALYZE. Deploy during low traffic. Monitor p95 query time after.

**Quantified example for interview:** "Orders list query went from 15ms to 4.2 seconds at 2M rows. EXPLAIN showed Seq Scan. Added composite index on `(user_id, created_at DESC)`. Back to 18ms."

---

**Q5: Explain database transactions and when you need them.**

**Deep Answer:**

A transaction groups operations into one atomic unit: **all succeed (COMMIT) or all fail (ROLLBACK)**.

**ACID in practice:**
- **Transfer money:** Debit account A, credit account B — both or neither. Wrap in `BEGIN...COMMIT`.
- **Create order:** Insert order + order items + decrement inventory. If inventory fails, roll back entire order.
- **Idempotent webhook processing:** Begin transaction, check if event already processed, if not process and mark done, commit.

**Isolation levels (PostgreSQL defaults to READ COMMITTED):**
- `READ COMMITTED`: sees committed data at statement start. Default. Good for most apps.
- `REPEATABLE READ`: snapshot at transaction start. Same query returns same rows. Phantom reads possible in PG.
- `SERIALIZABLE`: strongest. Use for critical financial operations. Higher lock rate.

**Node.js pattern:**
```javascript
async function transfer(fromId, toId, amount) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('UPDATE accounts SET balance = balance - $1 WHERE id = $2', [amount, fromId]);
    await client.query('UPDATE accounts SET balance = balance + $1 WHERE id = $2', [amount, toId]);
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}
```

**Pitfall:** Long-running transactions hold locks → blocks other queries. Keep transactions short. Don't call external APIs inside a transaction.

---

**Q6: How would you design a multi-tenant database schema?**

**Deep Answer:**

Three approaches:

1. **Separate database per tenant:** Best isolation, hardest to manage at scale. Enterprise SaaS with few large clients.

2. **Shared database, separate schema per tenant:** Good isolation, moderate complexity. `tenant_a.orders`, `tenant_b.orders`.

3. **Shared tables with `tenant_id` column (most common):** Every table has `tenant_id`. Index every query with `tenant_id` first. Enforce with Row-Level Security.

```sql
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON orders
  USING (tenant_id = current_setting('app.tenant_id')::uuid);
```

**Application:** Set `app.tenant_id` at connection start from JWT. Even if developer forgets WHERE clause, RLS protects data.

**At 3 YOE:** Mention trade-off — shared tables scale better but require discipline. Always include `tenant_id` in unique constraints (`UNIQUE(tenant_id, email)`).

---

## Practical Tasks

### Beginner (10 Tasks)
1. Install PostgreSQL and connect via psql.
2. Create a database and run `\dt` to list tables.
3. Create a `users` table with UUID PK, email, and timestamps.
4. Insert 5 users and query them with `SELECT *`.
5. Use psql meta-commands: `\d users`, `\timing`, `\x`.
6. Add a JSONB column `metadata` to users and insert a JSON object.
7. Query a JSONB field using `->>` operator.
8. Create a GIN index on the JSONB column.
9. Use `gen_random_uuid()` to generate UUIDs automatically.
10. Create an ENUM type and use it in a table column.

### Intermediate (10 Tasks)
1. Set up a Node.js connection pool with `pg` and write a query helper.
2. Implement a `withTransaction()` helper for atomic operations.
3. Use `ON CONFLICT DO UPDATE` for upsert.
4. Add a full-text search column with a trigger to keep it updated.
5. Enable Row-Level Security on the `posts` table.
6. Run `EXPLAIN ANALYZE` on a slow query and identify the bottleneck.
7. Create a partial index (`WHERE is_active = TRUE`).
8. Use `ARRAY` type and `ANY()` for tag filtering.
9. Use `TSTZRANGE` for booking conflict exclusion.
10. Query `pg_stat_user_tables` to find tables with high dead row counts.

### Advanced (10 Tasks)
1. Implement optimistic locking using a `version` column.
2. Use `SELECT FOR UPDATE SKIP LOCKED` for job queue implementation.
3. Create a materialized view and schedule automatic refresh.
4. Implement partitioned table for time-series data (monthly partitions).
5. Use `pg_stat_statements` to find the top 10 slowest queries.
6. Implement pub/sub with `LISTEN/NOTIFY` for cross-connection events.
7. Build a multi-tenant app with RLS and test isolation.
8. Use `LATERAL JOIN` to get each user's most recent order.
9. Implement full-text search with ranking and snippet highlighting.
10. Configure autovacuum tuning for a high-write table.

---

## Self Assessment
1. What is MVCC?
2. What is the difference between JSON and JSONB in PostgreSQL?
3. What is a GIN index used for?
4. What is Row-Level Security?
5. What does EXPLAIN ANALYZE show?
6. What are dead rows and what cleans them up?
7. What is `gen_random_uuid()` from?
8. What is a range type and what problem does it solve?
9. What is `RETURNING` in an INSERT/UPDATE?
10. What is `SELECT FOR UPDATE` used for?

---

## Cheat Sheet

```sql
-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- JSONB
SELECT payload->>'field' FROM t;       -- text extraction
SELECT payload->'nested' FROM t;       -- JSON extraction
SELECT * FROM t WHERE payload @> '{"k":"v"}';  -- contains
CREATE INDEX idx_payload ON t USING gin(payload);

-- Arrays
SELECT * FROM t WHERE 'tag' = ANY(tags);
SELECT * FROM t WHERE tags @> ARRAY['a','b'];

-- Full-text
SELECT * FROM t WHERE to_tsvector('english', body) @@ to_tsquery('english', 'search & term');

-- Range
INSERT INTO bookings VALUES (room_id, '[2025-01-15 09:00, 2025-01-15 10:00)');
SELECT * FROM bookings WHERE during && '[2025-01-15 09:30, 2025-01-15 11:00)';

-- RLS
ALTER TABLE t ENABLE ROW LEVEL SECURITY;
CREATE POLICY p ON t USING (user_id = current_setting('app.uid')::UUID);

-- Explain
EXPLAIN (ANALYZE, BUFFERS) SELECT ...;
```
