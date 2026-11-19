# Phase 3 — Chapter 7: Database Indexes

---

## Chapter Overview

Indexes are the single most impactful performance optimization available to a database engineer. The right index can turn a 30-second query into a 5-millisecond query. The wrong index wastes disk space and slows down writes.

**Core concept:** An index is a separate data structure (usually a B-tree) that stores a sorted copy of one or more columns, allowing the database to find rows without scanning every row in the table.

---

## Beginner Theory

### How B-Tree Indexes Work

```
Table without index (Sequential Scan):
  SELECT * FROM users WHERE email = 'alice@example.com';
  → Scan all 1,000,000 rows → expensive

B-Tree Index on email:
  Index stores: sorted list of (email, row_pointer)
  alice@example.com  → page 42, row 7
  bob@example.com    → page 15, row 2
  charlie@example.com → page 99, row 1

  Binary search on sorted index:
  → O(log N) comparisons → fast even for 10M rows

Cost tradeoffs:
  ✓ Read speed  → dramatically faster SELECTs
  ✗ Write speed → INSERT/UPDATE/DELETE must update index too
  ✗ Disk space  → index takes additional storage
  ✗ RAM         → indexes cached in buffer pool (shared_buffers)
```

---

## Basic Examples

### Creating Indexes

```sql
-- Basic B-tree index (default)
CREATE INDEX idx_users_email ON users(email);

-- Unique index (enforces uniqueness + speeds up lookups)
CREATE UNIQUE INDEX idx_users_email ON users(email);

-- Compound index — order matters!
-- Supports queries: WHERE role = ? AND created_at >= ?
--                   WHERE role = ? (leading column)
-- Does NOT support: WHERE created_at >= ? (non-leading)
CREATE INDEX idx_users_role_created ON users(role, created_at DESC);

-- Partial index — index only a subset of rows
-- Useful when you always filter on a condition
CREATE INDEX idx_active_users ON users(email) WHERE is_active = TRUE;
CREATE INDEX idx_pending_orders ON orders(created_at) WHERE status = 'pending';

-- Expression index — index the result of an expression
CREATE INDEX idx_users_email_lower ON users(LOWER(email));
-- Query must use the same expression: WHERE LOWER(email) = LOWER($1)

-- Covering index — include extra columns to enable Index Only Scan
-- Query: SELECT id, name FROM users WHERE email = ?
-- Without covering: index scan → heap fetch for name
-- With covering: index scan only (no heap fetch)
CREATE INDEX idx_users_email_covering ON users(email) INCLUDE (id, name);

-- Drop index
DROP INDEX CONCURRENTLY idx_users_email;  -- CONCURRENTLY avoids locking the table

-- Create index without blocking writes (production)
CREATE INDEX CONCURRENTLY idx_orders_status ON orders(status);
```

### Using EXPLAIN ANALYZE

```sql
-- Always use EXPLAIN ANALYZE to verify index usage
EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM users WHERE email = 'alice@example.com';

-- Output examples:
-- Index Scan using idx_users_email on users (cost=0.43..8.45 rows=1 width=145)
--                                          (actual time=0.045..0.047 rows=1 loops=1)
--   Index Cond: ((email)::text = 'alice@example.com'::text)
--   Buffers: shared hit=3
--
-- vs. Sequential Scan (BAD for large tables):
-- Seq Scan on users (cost=0.00..25432.00 rows=1000000 width=145)
--                   (actual time=0.032..245.123 rows=1 loops=1)
--   Filter: ((email)::text = 'alice@example.com'::text)
--   Rows Removed by Filter: 999999

-- Node types and their meanings:
-- Seq Scan:         full table scan — ok for small tables, bad for large
-- Index Scan:       uses index to find rows, then fetches full row from heap
-- Index Only Scan:  all needed data in index (fastest)
-- Bitmap Heap Scan: collects row locations from index, then fetches in bulk
-- Hash Join:        builds hash table from one side, probes with other
-- Nested Loop:      for each row in outer, search inner — fast if inner is indexed
-- Merge Join:       both sides sorted, merge them — good for sorted data
```

---

## Intermediate Concepts

### Index Types

```sql
-- B-Tree (default): equality, range, sort, LIKE 'prefix%'
CREATE INDEX idx_bt ON t(col);

-- Hash: equality only, faster than B-tree for exact match, not range
CREATE INDEX idx_hash ON t USING hash(col);

-- GIN (Generalized Inverted Index): arrays, JSONB, full-text search
CREATE INDEX idx_gin_tags ON products USING gin(tags);  -- array
CREATE INDEX idx_gin_payload ON events USING gin(payload);  -- JSONB
CREATE INDEX idx_gin_fts ON articles USING gin(to_tsvector('english', body));  -- FTS

-- GiST (Generalized Search Tree): geometric types, ranges, full-text
CREATE INDEX idx_gist_loc ON stores USING gist(location);  -- geospatial
CREATE INDEX idx_gist_range ON bookings USING gist(during);  -- range

-- BRIN (Block Range Index): for naturally ordered, append-only data
-- Very small index, great for timestamp columns on huge tables
CREATE INDEX idx_brin_created ON logs USING brin(created_at);

-- Trigram index (pg_trgm extension): LIKE '%middle%' search
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_trgm_name ON products USING gin(name gin_trgm_ops);
-- Supports: WHERE name ILIKE '%headphone%'
```

### Query Optimization Patterns

```sql
-- The ESR Rule for compound indexes:
-- E = Equality first  (WHERE col = ?)
-- S = Sort second     (ORDER BY col)
-- R = Range last      (WHERE col > ?)

-- Query: find active admins, sorted by name
SELECT * FROM users WHERE is_active = TRUE AND role = 'admin' ORDER BY name;
-- Best index: (is_active, role, name) — E, E, S
CREATE INDEX idx_users_esr ON users(is_active, role, name);

-- Query: orders for a user, in date range, sorted by date
SELECT * FROM orders WHERE user_id = $1 AND created_at > $2 ORDER BY created_at DESC;
-- E: user_id = $1, R: created_at > $2, S: ORDER BY created_at
-- Best index: (user_id, created_at DESC)
CREATE INDEX idx_orders_user_date ON orders(user_id, created_at DESC);

-- LIKE queries
-- B-tree supports only prefix LIKE: LIKE 'alice%' (uses index)
-- B-tree does NOT support: LIKE '%alice' or LIKE '%alice%' (no index)
-- For % anywhere: use pg_trgm GIN index or full-text search
```

### Finding Missing Indexes

```sql
-- Find tables with high sequential scan rates (needs indexes)
SELECT
  relname                            AS table_name,
  seq_scan,
  idx_scan,
  seq_tup_read,
  idx_tup_fetch,
  ROUND(seq_scan::NUMERIC / NULLIF(seq_scan + idx_scan, 0) * 100, 2) AS seq_pct
FROM pg_stat_user_tables
WHERE seq_scan > 0
ORDER BY seq_tup_read DESC;

-- Find unused indexes (waste of disk + write overhead)
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE idx_scan = 0                          -- never used
  AND indexrelname NOT LIKE '%pkey%'        -- not PK
ORDER BY pg_relation_size(indexrelid) DESC;

-- Find index usage stats
SELECT
  indexrelname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch,
  pg_size_pretty(pg_relation_size(indexrelid)) AS size
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

-- Enable pg_stat_statements for query-level stats
SELECT query, calls, total_exec_time, mean_exec_time, rows
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 20;
```

---

## Advanced Concepts

### Index Bloat

```sql
-- Over time, B-tree indexes accumulate dead entries (bloat)
-- Regular VACUUM clears this; REINDEX CONCURRENTLY for severe cases

-- Check index bloat
SELECT
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size,
  idx_scan,
  idx_tup_read
FROM pg_stat_user_indexes
ORDER BY pg_relation_size(indexrelid) DESC;

-- Rebuild a bloated index (locks table — use CONCURRENTLY in prod)
REINDEX INDEX CONCURRENTLY idx_orders_status;
```

---

## Interview Preparation

**Q1: How do you determine if a query needs a new index?**
A: Run `EXPLAIN ANALYZE` on the query. Look for Seq Scan on large tables — each one is a candidate for an index. Check the actual rows vs. estimated rows — if they differ greatly, statistics are stale (run ANALYZE). Check query execution time. Also query `pg_stat_user_tables` for tables with high `seq_scan` counts relative to `idx_scan`. Then create the appropriate index (compound, partial, covering) and re-run EXPLAIN ANALYZE to verify the planner uses it.

**Q2: What is the difference between B-tree, GIN, and GiST indexes?**
A: B-tree handles ordered data — equality, range, sort, prefix LIKE. It's the default for most columns. GIN (Generalized Inverted Index) is optimized for multi-valued data structures — arrays, JSONB keys, full-text search tsvectors. Each "value" (array element, JSON key) becomes an entry in the index. Very fast for containment queries (`@>`), slower to build. GiST (Generalized Search Tree) is extensible for complex types — geometric types, IP ranges, exclusion constraints. Used for geospatial (PostGIS 2dsphere), range types, full-text. Slower lookup than GIN for full-text, but supports partial match operators.

**Q3: What is the ESR rule?**
A: ESR (Equality, Sort, Range) is a heuristic for ordering columns in a compound index. Put Equality columns first (WHERE col = ?) — they narrow the result set the most. Put Sort columns next (ORDER BY col) — when the index is already sorted, no sorting step is needed. Put Range columns last (WHERE col BETWEEN a AND b) — ranges are least selective when combined with equality, and a scan within the range is still efficient. Violating ESR means the planner either ignores some index columns or performs an extra sort step.

---

## Practical Tasks

### Beginner (10 Tasks)
1. Create an index on `users.email` and verify with EXPLAIN ANALYZE.
2. Create a UNIQUE index and test that it rejects duplicates.
3. Create a compound index on `(status, created_at)`.
4. Create a partial index on active users only.
5. Run `EXPLAIN ANALYZE` on a query and identify Seq Scan vs. Index Scan.
6. Create an expression index on `LOWER(email)`.
7. Drop an index and verify the query falls back to Seq Scan.
8. Use `CREATE INDEX CONCURRENTLY` to avoid table locks.
9. Query `pg_stat_user_indexes` to see index usage stats.
10. Find unused indexes in a database.

### Intermediate (10 Tasks)
1. Apply the ESR rule to optimize a compound index for a specific query.
2. Create a GIN index on a JSONB column and test `@>` queries.
3. Create a GIN trigram index and test `ILIKE '%pattern%'` queries.
4. Create a covering index with `INCLUDE` columns for an Index Only Scan.
5. Find tables with high sequential scan rates.
6. Create a BRIN index on a large append-only log table.
7. Build a benchmark: measure query time before and after adding an index.
8. Find and remove a "zombie" index (never used after 30 days).
9. Identify index bloat and rebuild with REINDEX CONCURRENTLY.
10. Use `pg_stat_statements` to find the top 5 slowest queries.

### Advanced (10 Tasks)
1. Design the complete indexing strategy for an e-commerce database.
2. Implement partial index for soft-deleted records.
3. Create a GiST index for geospatial queries (store nearest search).
4. Build a query plan regression test that fails if Seq Scan appears.
5. Implement hash partitioning on a large table and index each partition.
6. Compare B-tree vs. Hash index performance for equality-only queries.
7. Implement an index advisor (detect queries that would benefit from indexes).
8. Measure index overhead on write-heavy tables (INSERT throughput with/without index).
9. Design indexes for a multi-tenant application (with tenant_id as leading column).
10. Implement covering indexes for a read-heavy API to achieve Index Only Scans.

---

## Self Assessment
1. What data structure do most database indexes use?
2. What is a Seq Scan and when is it appropriate?
3. What is an Index Only Scan?
4. What is a partial index?
5. What is a covering index?
6. What is the ESR rule?
7. What is a GIN index used for?
8. What is index bloat and how do you fix it?
9. Why does adding too many indexes hurt write performance?
10. What is `CREATE INDEX CONCURRENTLY` used for?

---

## Cheat Sheet

```sql
-- B-tree (default)
CREATE INDEX idx_t_col ON t(col);
CREATE UNIQUE INDEX idx_t_col ON t(col);

-- Compound (ESR order: equality, sort, range)
CREATE INDEX idx_t_a_b ON t(a, b DESC);

-- Partial (subset of rows)
CREATE INDEX idx_t_active ON t(col) WHERE is_active = TRUE;

-- Expression
CREATE INDEX idx_t_lower ON t(LOWER(email));

-- Covering
CREATE INDEX idx_t_col_incl ON t(col) INCLUDE (col2, col3);

-- GIN (arrays, JSONB, FTS)
CREATE INDEX idx_t_tags ON t USING gin(tags);
CREATE INDEX idx_t_payload ON t USING gin(payload);
CREATE INDEX idx_t_fts ON t USING gin(to_tsvector('english', body));

-- Trigram (LIKE '%pattern%')
CREATE INDEX idx_t_trgm ON t USING gin(col gin_trgm_ops);

-- Non-blocking (production)
CREATE INDEX CONCURRENTLY idx_name ON t(col);
DROP INDEX CONCURRENTLY idx_name;

-- Diagnose
EXPLAIN (ANALYZE, BUFFERS) SELECT ...;
SELECT * FROM pg_stat_user_indexes ORDER BY idx_scan DESC;
SELECT * FROM pg_stat_user_tables ORDER BY seq_scan DESC;
```
