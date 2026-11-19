# Phase 3 — Chapter 8: Query Optimization

---

## Chapter Overview

Query optimization is the process of making database queries run faster. It involves understanding what the query planner does, identifying bottlenecks with EXPLAIN ANALYZE, rewriting slow queries, and adding targeted indexes.

**The optimization cycle:**
1. Identify slow queries (pg_stat_statements, slow query log)
2. Analyze the query plan (EXPLAIN ANALYZE)
3. Identify the bottleneck (Seq Scan? Sort? Hash Join?)
4. Optimize (add index, rewrite query, add statistics)
5. Measure improvement

---

## Beginner Theory

### Why Queries Are Slow

```
1. Full table scans (Seq Scan) on large tables
   Fix: add index on the filter column

2. Missing join indexes
   Fix: index FK columns on "many" side of joins

3. N+1 queries (ORM pitfall)
   Fix: use JOIN or eager loading

4. SELECT * fetching unneeded columns
   Fix: SELECT only needed columns

5. Sorting large result sets without index
   Fix: compound index including sort column

6. Implicit type coercion breaking index use
   Fix: match query type to column type

7. Functions on indexed columns disabling index
   Fix: create expression index

8. Stale statistics
   Fix: run ANALYZE
```

---

## Basic Examples

### Reading EXPLAIN ANALYZE

```sql
-- Example slow query
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT u.name, COUNT(o.id) AS order_count
FROM users u
JOIN orders o ON o.user_id = u.id
WHERE u.is_active = TRUE
GROUP BY u.id, u.name
ORDER BY order_count DESC
LIMIT 10;

-- Output interpretation:
-- Limit (cost=12345.67..12345.70 rows=10 width=48) (actual time=1234.567..1234.571 rows=10 loops=1)
--   -> Sort (cost=12345.67..12395.67 rows=20000 width=48) (actual time=1234.555..1234.558 rows=10 loops=1)
--       Sort Key: (count(orders.id)) DESC
--       Sort Method: top-N heapsort Memory: 25kB
--       -> HashAggregate (cost=10000.00..11000.00 rows=20000 width=48) (actual time=1200.123..1230.123 rows=50000 loops=1)
--           Group Key: users.id
--           -> Hash Join (cost=500.00..9000.00 rows=200000 width=40) (actual time=12.345..890.123 rows=200000 loops=1)
--               Hash Cond: (orders.user_id = users.id)
--               -> Seq Scan on orders (cost=0.00..5000.00 rows=200000 width=16) (actual time=0.034..456.789 rows=200000 loops=1)
--               -> Hash (cost=300.00..300.00 rows=16000 width=40) (actual time=12.234..12.234 rows=16000 loops=1)
--                   Buckets: 16384 Batches: 1 Memory Usage: 1025kB
--                   -> Seq Scan on users (cost=0.00..300.00 rows=16000 width=40) (actual time=0.034..8.234 rows=16000 loops=1)
--                       Filter: (is_active = true)
--                       Rows Removed by Filter: 4000

-- Problems spotted:
-- 1. Seq Scan on orders (200K rows) — needs index on user_id
-- 2. Seq Scan on users with filter — needs partial index WHERE is_active = TRUE

-- Fixes:
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_users_active_id ON users(id) WHERE is_active = TRUE;
```

### N+1 Query Problem

```javascript
// N+1 Problem: 1 query to get users, N queries to get orders per user
const users = await db.query("SELECT * FROM users LIMIT 20");
for (const user of users.rows) {
  // 20 additional queries!
  const orders = await db.query("SELECT * FROM orders WHERE user_id = $1", [user.id]);
  user.orders = orders.rows;
}

// Fix 1: JOIN in one query
const result = await db.query(`
  SELECT u.id, u.name, u.email,
         JSON_AGG(JSON_BUILD_OBJECT('id', o.id, 'total', o.total, 'status', o.status)) AS orders
  FROM users u
  LEFT JOIN orders o ON o.user_id = u.id
  GROUP BY u.id, u.name, u.email
  LIMIT 20
`);

// Fix 2: Two queries + in-memory join (better for large datasets)
const users = await db.query("SELECT * FROM users LIMIT 20");
const userIds = users.rows.map(u => u.id);
const orders = await db.query(
  "SELECT * FROM orders WHERE user_id = ANY($1)",
  [userIds]
);
const ordersByUser = groupBy(orders.rows, "user_id");
users.rows.forEach(u => u.orders = ordersByUser[u.id] || []);
```

### Common Query Rewrites

```sql
-- 1. Avoid functions on indexed columns
-- BAD: index on created_at not used
SELECT * FROM orders WHERE DATE(created_at) = '2025-01-15';
-- GOOD: use range comparison
SELECT * FROM orders WHERE created_at >= '2025-01-15' AND created_at < '2025-01-16';

-- 2. Avoid implicit type casting
-- BAD: if id is UUID, comparing with VARCHAR disables index
WHERE id = '550e8400...'::TEXT  -- force TEXT comparison
-- GOOD: use correct type
WHERE id = '550e8400...'::UUID

-- 3. Avoid LIKE with leading wildcard
-- BAD: can't use B-tree index
WHERE name LIKE '%smith%';
-- GOOD: use trigram index (CREATE INDEX USING gin(name gin_trgm_ops))
WHERE name ILIKE '%smith%';

-- 4. Use EXISTS instead of COUNT for existence check
-- BAD: counts all matching rows
SELECT COUNT(*) > 0 FROM orders WHERE user_id = $1;
-- GOOD: stops at first match
SELECT EXISTS (SELECT 1 FROM orders WHERE user_id = $1);

-- 5. Use ANY() instead of multiple ORs
-- BAD: planner may not optimize multiple ORs well
WHERE status = 'pending' OR status = 'processing' OR status = 'shipped'
-- GOOD: clear and efficient
WHERE status = ANY(ARRAY['pending', 'processing', 'shipped'])

-- 6. Limit rows early in CTEs
-- PostgreSQL 12+ CTEs are not optimization fences (unless MATERIALIZED)
-- For pre-12 or complex CTEs, push down WHERE into CTE
WITH recent AS (
  SELECT * FROM orders WHERE created_at > NOW() - INTERVAL '7 days'  -- push down!
)
SELECT * FROM recent WHERE status = 'pending';

-- 7. Use DISTINCT ON instead of subquery for top-N per group
-- Get the most recent order per user
SELECT DISTINCT ON (user_id) user_id, id, total, created_at
FROM orders
ORDER BY user_id, created_at DESC;
-- Much faster than correlated subquery approach
```

---

## Intermediate Concepts

### Connection Pooling

```javascript
// Without connection pool:
// Each query: TCP handshake + auth + query + close (expensive!)
// A connection takes 5-10MB of RAM and significant CPU on PostgreSQL

// With pool:
const pool = new Pool({
  max:                     20,      // max 20 connections (tune to DB capacity)
  min:                     2,       // keep 2 warm connections
  idleTimeoutMillis:       30_000,  // close idle after 30s
  connectionTimeoutMillis: 2_000    // timeout if no conn available
});

// PgBouncer (external connection pooler)
// Sits between your app and PostgreSQL
// Transaction pooling: connection returned to pool AFTER each transaction
// Session pooling: one pool connection per app connection (less multiplexing)
// Statement pooling: fastest, but can't use transactions or prepared statements
```

### Slow Query Log (PostgreSQL)

```sql
-- Find slow queries (>100ms) in postgresql.conf
-- log_min_duration_statement = 100  -- log queries taking > 100ms

-- Or use pg_stat_statements extension
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Top 20 slowest queries by total time
SELECT
  LEFT(query, 100)              AS query_snippet,
  calls,
  ROUND(total_exec_time::NUMERIC / 1000, 2) AS total_secs,
  ROUND(mean_exec_time::NUMERIC, 2) AS avg_ms,
  rows,
  ROUND(100.0 * shared_blks_hit / NULLIF(shared_blks_hit + shared_blks_read, 0), 2) AS cache_hit_pct
FROM pg_stat_statements
WHERE calls > 10
ORDER BY total_exec_time DESC
LIMIT 20;

-- Reset stats after optimization to measure improvement
SELECT pg_stat_statements_reset();
```

---

## Advanced Concepts

### Partitioning for Query Performance

```sql
-- Range partitioning on created_at — queries on date range touch only relevant partitions
CREATE TABLE orders (
  id         UUID          NOT NULL,
  user_id    UUID          NOT NULL,
  total      DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ   NOT NULL
) PARTITION BY RANGE (created_at);

CREATE TABLE orders_2024_q1 PARTITION OF orders
  FOR VALUES FROM ('2024-01-01') TO ('2024-04-01');

CREATE TABLE orders_2024_q2 PARTITION OF orders
  FOR VALUES FROM ('2024-04-01') TO ('2024-07-01');

-- Query automatically routes to correct partition:
SELECT * FROM orders WHERE created_at >= '2024-02-01' AND created_at < '2024-03-01';
-- → only touches orders_2024_q1 partition (partition pruning)
```

---

## Interview Preparation

**Q1: How do you approach optimizing a slow query?**
A: Step 1: Verify it's actually slow with timing data (don't optimize what isn't slow). Step 2: Run `EXPLAIN (ANALYZE, BUFFERS)` to get the actual query plan. Step 3: Identify the bottleneck — is it a Seq Scan on a large table? A Sort with too many rows? A Hash Join where one side is massive? Step 4: Determine the fix — add an index, rewrite the query, add a partial or covering index, or break the query into steps. Step 5: Implement, re-run EXPLAIN ANALYZE, measure improvement. Step 6: Check pg_stat_statements for regression.

**Q2: What is the N+1 query problem and how do you fix it?**
A: N+1 occurs when fetching N records triggers N additional queries — one for each record's related data. Example: fetch 100 posts, then fetch the author of each post separately = 101 queries. Fix: use a JOIN in a single query (`JOIN users ON posts.user_id = users.id`), or fetch related records in bulk using `WHERE user_id = ANY(array_of_ids)` and join them in application memory. In ORMs: use `.include()` / `.populate()` / `eager_load` to hint the ORM to use JOINs or batch queries.

**Q3: What is a query planner and what information does it use?**
A: The query planner (optimizer) is the database component that decides HOW to execute a query — which indexes to use, in what order to join tables, how to perform sorts. It uses table statistics (row count, distinct values, value histograms) stored by `ANALYZE` to estimate the cost of different execution plans and pick the cheapest. If statistics are stale (ANALYZE hasn't been run recently after large data changes), the planner may make wrong decisions — choosing a Seq Scan when an index scan would be faster, or vice versa.

---

## Practical Tasks

### Beginner (10 Tasks)
1. Run `EXPLAIN ANALYZE` on 3 different queries and read the output.
2. Identify a Seq Scan in an EXPLAIN plan and add an index to fix it.
3. Fix an N+1 problem by replacing a loop of queries with a JOIN.
4. Rewrite a `DATE(created_at) = ?` filter to a range comparison.
5. Replace `COUNT(*) > 0` with `EXISTS()` for an existence check.
6. Use `SELECT column1, column2` instead of `SELECT *` on a wide table.
7. Add a missing index on an FK column used in a JOIN.
8. Rewrite multiple OR conditions as `= ANY(ARRAY[...])`.
9. Run `ANALYZE tablename` and observe how EXPLAIN estimates change.
10. Time a query before and after adding an index.

### Intermediate (10 Tasks)
1. Set up `pg_stat_statements` and find the 5 slowest queries.
2. Create a covering index to achieve an Index Only Scan.
3. Fix a query that applies a function to an indexed column.
4. Identify and fix implicit type coercion that disables an index.
5. Rewrite a correlated subquery as a JOIN.
6. Use `DISTINCT ON` for efficient top-N per group.
7. Configure PgBouncer and measure connection overhead.
8. Implement query result caching in Redis to avoid repeated DB hits.
9. Profile an ORM-generated query and replace it with a raw SQL query.
10. Find all queries causing sequential scans using `pg_stat_user_tables`.

### Advanced (10 Tasks)
1. Optimize a complex 5-table JOIN reducing execution from 5s to <50ms.
2. Implement table partitioning and verify partition pruning in query plans.
3. Build a query performance regression test suite.
4. Use `pg_stat_statements` to build a slow query alert system.
5. Implement adaptive caching: cache results of expensive queries.
6. Profile and optimize the ORM-generated query for a specific endpoint.
7. Implement read replicas and route read queries to them.
8. Benchmark connection pool sizes (5, 10, 20, 50) under load.
9. Implement materialized views for dashboard aggregations.
10. Build a query plan monitoring system that alerts on plan changes.

---

## Self Assessment
1. What is EXPLAIN ANALYZE?
2. What is a Seq Scan and when is it appropriate?
3. What is the N+1 query problem?
4. What is pg_stat_statements?
5. Why should you avoid functions on indexed columns in WHERE clauses?
6. What is a covering index?
7. What is the query planner?
8. What does ANALYZE do (the SQL command)?
9. What is implicit type coercion and why does it matter?
10. What is partition pruning?

---

## Cheat Sheet

```sql
-- Profile
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) SELECT ...;
SELECT * FROM pg_stat_statements ORDER BY total_exec_time DESC LIMIT 20;
SELECT * FROM pg_stat_user_tables ORDER BY seq_scan DESC;

-- Common fixes
-- Seq scan → add index
CREATE INDEX idx_t_col ON t(col);
-- Date function → range
WHERE created_at >= '2025-01-15' AND created_at < '2025-01-16'
-- N+1 → JOIN
SELECT u.*, o.* FROM users u JOIN orders o ON o.user_id = u.id WHERE ...
-- Existence → EXISTS
SELECT EXISTS(SELECT 1 FROM orders WHERE user_id = $1)
-- Multiple ORs → ANY()
WHERE status = ANY(ARRAY['pending', 'processing'])
-- Slow sort → index (col DESC)
CREATE INDEX idx_t_created ON t(created_at DESC)
-- % LIKE → trigram GIN
CREATE INDEX idx_t_name ON t USING gin(name gin_trgm_ops)
-- Top N per group → DISTINCT ON
SELECT DISTINCT ON (user_id) * FROM orders ORDER BY user_id, created_at DESC
```
