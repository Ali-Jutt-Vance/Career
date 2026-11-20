# Query Optimization

> [!GOALS]
> - Follow a **systematic process** for finding and fixing slow queries instead of guessing.
> - Read `EXPLAIN ANALYZE` output in detail: plan nodes, estimated versus actual rows, loops and filters.
> - Understand how PostgreSQL **joins** tables (nested loop, hash join, merge join) and why it picks each one.
> - Fix **bad estimates** with statistics, including extended statistics for correlated columns.
> - Apply the most valuable rewrites: sargable conditions, `EXISTS`, **keyset pagination**, top-N per group, avoiding unnecessary work.
> - Eliminate the **N+1 query problem** from application code.
> - Find slow queries in production with `pg_stat_statements` and slow-query logs, and know when the fix is not in SQL at all.

## Why this matters

Every growing application reaches the moment when the database becomes the bottleneck. Pages that loaded in 50 milliseconds take three seconds; the database's CPU sits at 90%; connections pile up waiting. Often the cause is a handful of queries — sometimes a single one — that were fine with 1,000 rows and are disastrous with 10 million.

The temptation is to guess: add an index here, a cache there, upgrade the server. Guessing wastes time and often makes things worse — extra indexes slow writes, caches hide problems until they fail, and bigger servers cost money while the inefficient query keeps getting worse. Experienced engineers instead **measure**: they find the queries that cost the most in total, read the plan the database actually used, understand **why** it is slow, and change exactly that.

{{ch:indexes}} covered the most common fix. This chapter covers the whole craft: reading plans properly, understanding the planner's decisions and mistakes, rewriting queries, fixing application-side patterns such as N+1 queries, and running the investigation in production. Every plan shown is real PostgreSQL output.

## The simple idea

Think of a satnav planning a route. It knows the roads (tables and indexes) and keeps statistics about typical traffic. For each journey (query), it considers several routes (plans), estimates how long each will take, and picks the fastest. Usually it chooses well. But if its traffic data is out of date, or it does not know that two roads always jam together, it confidently sends you down a road that takes an hour.

Query optimisation is learning to read the satnav's chosen route (`EXPLAIN`), compare its estimates with what actually happened (`ANALYZE`), and fix the cause: better maps (indexes), fresher traffic data (statistics), or a clearer description of where you are going (a rewritten query).

> [!ANALOGY]
> The query planner is like a satnav: it knows the roads (tables and indexes), keeps traffic statistics, estimates the cost of several routes, and picks the cheapest. Optimisation is checking its chosen route against reality and fixing what misled it.
>
> **Where the analogy breaks:** you can ignore a satnav and drive your own way. PostgreSQL has no built-in way to force a particular plan — you influence it indirectly, by giving it better indexes, better statistics or a better-written question. That is by design: the right plan changes as data grows, and the planner re-decides every time.

## The proper definition and key words

**Query optimisation** is the process of making database queries use fewer resources (time, I/O, CPU, memory) by improving how they are written, the structures that support them, and the information the planner uses to choose execution plans.

Key words:

- **Planner / optimiser** — chooses an execution plan by estimating the cost of alternatives.
- **Cost** — the planner's estimate of work, in arbitrary units; not milliseconds.
- **Cardinality estimate** — how many rows the planner expects a step to produce.
- **Plan node** — one step in a plan: a scan, join, sort, aggregate, limit.
- **Nested loop join** — for each row from one input, look up matching rows in the other.
- **Hash join** — build a hash table from one input, then probe it with the other.
- **Merge join** — walk two inputs sorted on the join key side by side.
- **Statistics** — samples of each column's values (common values, histograms, distinct counts) gathered by `ANALYZE`.
- **Sargable** — a condition the database can use an index for (from "search argument able"); `col = value` is sargable, `f(col) = value` usually is not.
- **N+1 queries** — one query to fetch a list, then one more query per item.
- **Keyset pagination** — paging by "rows after the last one seen" instead of `OFFSET`.

## The process

### Level 1 — Measure, explain, change, verify

1. **Find the queries that matter.** Not the slowest single execution, but the biggest **total** cost: a 5 ms query run 10 million times a day costs more than a 10-second report run once. `pg_stat_statements` ranks them ({{ch:postgresql}}).
2. **Reproduce with real data.** Run `EXPLAIN (ANALYZE, BUFFERS)` with production-like volumes and realistic parameter values — plans on small development databases are meaningless.
3. **Find the expensive step.** Where do the rows explode? Where are estimates wrong? Which step does the most work?
4. **Change one thing.** An index, a statistics fix, a rewrite, an application change.
5. **Verify.** Re-run `EXPLAIN ANALYZE`, then watch the production metrics. Keep the change only if it helped.

This chapter's examples use 20,000 customers and 300,000 orders:

```sql
CREATE TABLE customers (
  id             integer PRIMARY KEY,
  name           text NOT NULL,
  city           text NOT NULL,
  postcode_area  text NOT NULL
);
INSERT INTO customers
SELECT i, 'Customer ' || i,
       (ARRAY['Leeds', 'York', 'Manchester', 'Bristol', 'Glasgow'])[1 + i % 5],
       (ARRAY['LS', 'YO', 'M', 'BS', 'G'])[1 + i % 5]
FROM generate_series(1, 20000) AS i;

CREATE TABLE orders (
  id           bigint PRIMARY KEY,
  customer_id  integer NOT NULL REFERENCES customers (id),
  status       text NOT NULL,
  total        numeric(10, 2) NOT NULL,
  placed_at    timestamptz NOT NULL
);
INSERT INTO orders
SELECT i,
       1 + (i::bigint * 7919) % 20000,                      -- spreads orders across customers
       CASE WHEN i % 50 = 0 THEN 'pending' ELSE 'delivered' END,
       ((i * 37) % 20000) / 100.0,
       timestamptz '2025-01-01 00:00+00' + i * interval '2 minutes'
FROM generate_series(1, 300000) AS i;

ANALYZE customers;
ANALYZE orders;
```

**Result:**

```text
ANALYZE
```

## Reading plans

### Level 2 — The anatomy of `EXPLAIN ANALYZE`

```sql
EXPLAIN (ANALYZE, TIMING OFF, SUMMARY OFF, BUFFERS OFF)
SELECT * FROM customers WHERE city = 'Leeds';
```

**Result:**

```text
                                         QUERY PLAN
---------------------------------------------------------------------------------------------
 Seq Scan on customers  (cost=0.00..398.00 rows=4000 width=27) (actual rows=4000.00 loops=1)
   Filter: (city = 'Leeds'::text)
   Rows Removed by Filter: 16000
(3 rows)
```

Each node shows two sets of numbers:

- **`(cost=0.00..398.00 rows=… width=…)`** — the planner's **estimates** before running: start-up cost, total cost (arbitrary units), expected rows, and average row width in bytes.
- **`(actual rows=… loops=…)`** — what **really** happened. (Timings are switched off here so the output is reproducible; in real investigations leave them on.) If `loops` is greater than 1, `actual rows` is **per loop**.

Here the estimate matches reality: the planner expected 4,000 Leeds customers and found 4,000. When estimates are accurate, the planner usually chooses well. When they are far off — by a factor of 10 or more — it often chooses badly. Comparing **estimated** and **actual** rows is the most important skill in reading plans.

Useful options: `BUFFERS` (how many pages came from memory versus disk — the clearest measure of I/O), `VERBOSE` (output columns), `FORMAT JSON` (for visualisation tools such as explain.dalibo.com or pgMustard). Remember that `EXPLAIN ANALYZE` really executes the query: wrap `UPDATE` or `DELETE` in a transaction you roll back.

### Level 3 — When estimates go wrong: correlated columns

Postcode areas and cities are strongly related — every Leeds customer here has postcode area `LS`. The planner does not know that:

```sql
EXPLAIN (ANALYZE, TIMING OFF, SUMMARY OFF, BUFFERS OFF)
SELECT * FROM customers WHERE city = 'Leeds' AND postcode_area = 'LS';
```

**Result:**

```text
                                         QUERY PLAN
--------------------------------------------------------------------------------------------
 Seq Scan on customers  (cost=0.00..448.00 rows=800 width=27) (actual rows=4000.00 loops=1)
   Filter: ((city = 'Leeds'::text) AND (postcode_area = 'LS'::text))
   Rows Removed by Filter: 16000
(3 rows)
```

The planner estimated **800** rows; there were **4,000**. It assumes conditions are **independent**: 20% of customers are in Leeds, 20% are in `LS`, so it guesses 20% × 20% = 4% of 20,000 = 800. Here the error is harmless (it is a sequential scan either way), but in a larger query a fivefold underestimate can make the planner choose a nested loop that runs thousands of times instead of a hash join. **Extended statistics** teach the planner about relationships between columns:

```sql
CREATE STATISTICS customers_city_postcode (dependencies) ON city, postcode_area FROM customers;
ANALYZE customers;

EXPLAIN (ANALYZE, TIMING OFF, SUMMARY OFF, BUFFERS OFF)
SELECT * FROM customers WHERE city = 'Leeds' AND postcode_area = 'LS';
```

**Result:**

```text
                                         QUERY PLAN
---------------------------------------------------------------------------------------------
 Seq Scan on customers  (cost=0.00..448.00 rows=4000 width=27) (actual rows=4000.00 loops=1)
   Filter: ((city = 'Leeds'::text) AND (postcode_area = 'LS'::text))
   Rows Removed by Filter: 16000
(3 rows)
```

Now the estimate is right. Other causes of bad estimates:

- **Stale statistics** after big data changes (bulk imports, mass deletes) — run `ANALYZE`; autovacuum does this eventually, but not immediately.
- **Skewed data** with too small a sample — raise the statistics target for that column (`ALTER TABLE … ALTER COLUMN … SET STATISTICS 1000`).
- **Expressions and functions** the planner cannot see into — expression indexes also collect statistics on the expression.
- **Parameters in prepared statements** whose best plan depends on the value (a rare status versus a common one) — PostgreSQL re-plans for specific values at first and may switch to a generic plan; the setting `plan_cache_mode` controls this.

## How tables are joined

### Level 3 — Hash joins

Revenue per city joins all orders to their customers:

```sql
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF, BUFFERS OFF)
SELECT c.city, count(*) AS orders
FROM orders o
JOIN customers c ON c.id = o.customer_id
GROUP BY c.city;
```

**Result:**

```text
                                QUERY PLAN
--------------------------------------------------------------------------
 HashAggregate (actual rows=5.00 loops=1)
   Group Key: c.city
   Batches: 1  Memory Usage: 32kB
   ->  Hash Join (actual rows=300000.00 loops=1)
         Hash Cond: (o.customer_id = c.id)
         ->  Seq Scan on orders o (actual rows=300000.00 loops=1)
         ->  Hash (actual rows=20000.00 loops=1)
               Buckets: 32768  Batches: 1  Memory Usage: 847kB
               ->  Seq Scan on customers c (actual rows=20000.00 loops=1)
(9 rows)
```

Reading from the inside out:

1. **Seq Scan on customers** reads all 20,000 customers, and **Hash** builds an in-memory hash table keyed by `id` (about 850 kB).
2. **Seq Scan on orders** reads all 300,000 orders, and **Hash Join** looks up each one's customer in the hash table.
3. **HashAggregate** groups the 300,000 joined rows by city into 5 rows.

A **hash join** is ideal when joining large sets: each input is read once. It needs memory (`work_mem`); when the hash table does not fit, it spills to disk in batches (`Batches:` greater than 1 is a hint to raise `work_mem` for that query). No index would make this query fundamentally faster: it needs every order. For such queries the options are precomputing (a materialised view or summary table, {{ch:normalization}}), running them on a replica ({{ch:replication}}), or an analytics database.

### Level 3 — Nested loops

Fetching the orders of three specific customers is a different shape:

```sql
CREATE INDEX orders_customer_id ON orders (customer_id);

EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF, BUFFERS OFF)
SELECT o.id, o.total
FROM customers c
JOIN orders o ON o.customer_id = c.id
WHERE c.id IN (1, 2, 3);
```

**Result:**

```text
                                      QUERY PLAN
--------------------------------------------------------------------------------------
 Nested Loop (actual rows=45.00 loops=1)
   ->  Index Only Scan using customers_pkey on customers c (actual rows=3.00 loops=1)
         Index Cond: (id = ANY ('{1,2,3}'::integer[]))
         Heap Fetches: 3
         Index Searches: 1
   ->  Bitmap Heap Scan on orders o (actual rows=15.00 loops=3)
         Recheck Cond: (c.id = customer_id)
         Heap Blocks: exact=45
         ->  Bitmap Index Scan on orders_customer_id (actual rows=15.00 loops=3)
               Index Cond: (customer_id = c.id)
               Index Searches: 3
(11 rows)
```

A **nested loop**: find the 3 customers (using the primary key), then **for each one** (`loops=3`) look up their orders through the new index — 15 orders per customer, 45 in total. Nested loops are excellent when the outer side is small and the inner side has an index on the join column. They are terrible when the outer side is large: 100,000 outer rows means 100,000 index lookups. That is exactly what happens when the planner **underestimates** the outer side — and why bad estimates matter.

### Level 3 — Merge joins

A **merge join** sorts both inputs by the join key (or reads them already sorted from indexes) and walks them together, like merging two sorted lists. PostgreSQL chooses it for large inputs that are already sorted, or when a sorted result is needed anyway. Recognising all three in plans — and knowing which fits the data — is enough to understand most join performance problems.

## Rewriting queries

### Level 3 — Sargable conditions

Conditions that apply a function or arithmetic to an indexed column hide it from the index ({{ch:indexes}}). Rewrite them so the column stands alone:

| Not sargable | Sargable rewrite |
|---|---|
| `WHERE date(placed_at) = '2026-03-01'` | `WHERE placed_at >= '2026-03-01' AND placed_at < '2026-03-02'` |
| `WHERE total * 1.2 > 100` | `WHERE total > 100 / 1.2` |
| `WHERE lower(email) = $1` (no expression index) | an index on `lower(email)`, or store emails lower-cased |
| `WHERE extract(year FROM placed_at) = 2026` | `WHERE placed_at >= '2026-01-01' AND placed_at < '2027-01-01'` |
| `WHERE id::text = $1` | pass the parameter as the column's type |

### Level 3 — Existence checks and counts

"Has this customer ever ordered?" does not need to count every order:

```sql
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF, BUFFERS OFF)
SELECT EXISTS (SELECT 1 FROM orders WHERE status = 'delivered');
```

**Result:**

```text
                      QUERY PLAN
-------------------------------------------------------
 Result (actual rows=1.00 loops=1)
   InitPlan 1
     ->  Seq Scan on orders (actual rows=1.00 loops=1)
           Filter: (status = 'delivered'::text)
(4 rows)
```

`EXISTS` stops at the first matching row (`actual rows=1`), whereas `count(*) > 0` must find all 294,000. Similarly, avoid `SELECT count(*)` on large tables for page counters ("page 1 of 18,750"); show "next page" links, or an approximate count from statistics (`SELECT reltuples FROM pg_class WHERE relname = 'orders'`).

### Level 4 — Pagination: `OFFSET` versus keyset

Listing orders 20 at a time with `OFFSET` looks innocent:

```sql
CREATE INDEX orders_placed_id ON orders (placed_at, id);
```

**Result:**

```text
CREATE INDEX
```

```sql
VACUUM orders;        -- keeps the visibility map current, so index-only scans skip the table
```

**Result:**

```text
VACUUM
```

```sql
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF, BUFFERS OFF)
SELECT id, placed_at FROM orders ORDER BY placed_at, id OFFSET 200000 LIMIT 20;
```

**Result:**

```text
                                       QUERY PLAN
----------------------------------------------------------------------------------------
 Limit (actual rows=20.00 loops=1)
   ->  Index Only Scan using orders_placed_id on orders (actual rows=200020.00 loops=1)
         Heap Fetches: 0
         Index Searches: 1
(4 rows)
```

To return page 10,001, the database reads **200,020** index entries and throws away 200,000. Every page is slower than the one before, and deep pages are slow for everyone. **Keyset pagination** (also called cursor or seek pagination) remembers the last row of the previous page and asks for rows after it:

```sql
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF, BUFFERS OFF)
SELECT id, placed_at FROM orders
WHERE (placed_at, id) > ('2025-10-05 18:40+00', 200000)     -- the last row of the previous page
ORDER BY placed_at, id
LIMIT 20;
```

**Result:**

```text
                                                 QUERY PLAN
------------------------------------------------------------------------------------------------------------
 Limit (actual rows=20.00 loops=1)
   ->  Index Only Scan using orders_placed_id on orders (actual rows=20.00 loops=1)
         Index Cond: (ROW(placed_at, id) > ROW('2025-10-05 18:40:00+00'::timestamp with time zone, 200000))
         Heap Fetches: 0
         Index Searches: 1
(5 rows)
```

The index jumps straight to the right place and reads exactly 20 entries, however deep the page. The **row comparison** `(placed_at, id) > (…)` includes `id` as a tie-breaker, so orders with identical timestamps are neither skipped nor repeated; the index on `(placed_at, id)` matches the sort order exactly. APIs expose this as an opaque **cursor** (the encoded last values) instead of page numbers ({{ch:rest-apis}}). The trade-off: no jumping straight to page 500 — which users rarely need.

### Level 4 — Top N per group

"Each customer's most recent order" appears constantly. PostgreSQL offers `DISTINCT ON`:

```sql
SELECT DISTINCT ON (customer_id) customer_id, id AS latest_order, placed_at
FROM orders
WHERE customer_id <= 3
ORDER BY customer_id, placed_at DESC;
```

**Result:**

```text
 customer_id | latest_order |       placed_at
-------------+--------------+------------------------
           1 |       300000 | 2026-02-21 16:00:00+00
           2 |       297679 | 2026-02-18 10:38:00+00
           3 |       295358 | 2026-02-15 05:16:00+00
(3 rows)
```

`DISTINCT ON (customer_id)` keeps the first row for each customer according to the `ORDER BY`. For "top N" (say, the last three orders per customer) for a small set of customers, a **`LATERAL` join** with an index on `(customer_id, placed_at DESC)` runs one tiny index lookup per customer; for all customers at once, `row_number()` in a window function ({{ch:sql}}) is usually best. Measure the alternatives on your data.

### Level 4 — Do less work

Many slow queries are slow because they do work nobody needs:

- **Select only the needed columns.** `SELECT *` fetches large text and JSON columns, prevents index-only scans and sends more data over the network.
- **Filter early.** Push conditions into subqueries and CTEs; aggregate before joining when possible ({{ch:sql}}).
- **Avoid repeated work in loops.** Correlated subqueries in the `SELECT` list run once per row — often rewritable as a join plus aggregate.
- **Batch writes.** One `INSERT … VALUES (…), (…), …` or `COPY` instead of thousands of single-row inserts, and updates in batches of a few thousand rows.
- **Cache or precompute** results that are expensive and rarely change ({{ch:caching}}).

## The N+1 problem

### Level 3 — Death by a thousand small queries

The most common performance problem in web applications is not one slow query but **many fast ones**. The "recent orders" page loads 20 orders, then, for each order, loads its customer:

```ts
import { PGlite } from "@electric-sql/pglite";

const db = await PGlite.create();
await db.exec(`
  CREATE TABLE customers (id int PRIMARY KEY, name text NOT NULL);
  CREATE TABLE orders (id int PRIMARY KEY, customer_id int NOT NULL REFERENCES customers (id), total numeric NOT NULL);
  INSERT INTO customers SELECT i, 'Customer ' || i FROM generate_series(1, 50) i;
  INSERT INTO orders SELECT i, 1 + i % 7, i * 1.5 FROM generate_series(1, 20) i;
`);

let queries = 0;
const query = async (sql: string, params: unknown[] = []) => { queries++; return (await db.query<any>(sql, params)).rows; };

// N+1: one query for the list, then one per row
queries = 0;
const orders = await query("SELECT id, customer_id, total FROM orders ORDER BY id DESC LIMIT 20");
for (const o of orders) o.customer = (await query("SELECT name FROM customers WHERE id = $1", [o.customer_id]))[0];
console.log(`N+1 version:   ${queries} queries`);

// Fix 1: one query with a join
queries = 0;
const joined = await query(`
  SELECT o.id, o.total, c.name AS customer
  FROM orders o JOIN customers c ON c.id = o.customer_id
  ORDER BY o.id DESC LIMIT 20`);
console.log(`join version:  ${queries} query, ${joined.length} rows`);

// Fix 2: two queries — the list, then all needed customers at once
queries = 0;
const list = await query("SELECT id, customer_id, total FROM orders ORDER BY id DESC LIMIT 20");
const ids = [...new Set(list.map((o) => o.customer_id))];
const customers = await query("SELECT id, name FROM customers WHERE id = ANY($1)", [ids]);
const byId = new Map(customers.map((c) => [c.id, c.name]));
for (const o of list) o.customer = byId.get(o.customer_id);
console.log(`batched:       ${queries} queries (${ids.length} distinct customers loaded once)`);
console.log("first row:", { id: list[0].id, customer: list[0].customer });
```

**Output:**

```text
N+1 version:   21 queries
join version:  1 query, 20 rows
batched:       2 queries (7 distinct customers loaded once)
first row: { id: 20, customer: 'Customer 7' }
```

- Each of the 21 queries is fast, but each costs a **network round trip** (often 0.5–2 ms to a database in the same data centre) plus parsing and planning. With 100 orders and two relationships, a page makes 201 queries; under load, the database spends its time on overhead.
- **A join** gets everything in one query — best for one-to-one or many-to-one data such as an order's customer.
- **Batching** with `WHERE id = ANY($1)` — two queries regardless of page size — is better for one-to-many data (an order's items), where joins would repeat the parent's columns for every child. It is what ORMs' "eager loading" and GraphQL's DataLoader do ({{ch:orms}}, {{ch:graphql}}).
- The example uses PGlite (PostgreSQL in WebAssembly) so it runs without a server; the pattern is identical with `pg` or any ORM.

N+1 problems hide in ORM code, where `order.customer` looks like a property but is a query ({{ch:orms}}). Detect them by logging the number of queries per request, or with tools that flag repeated query patterns in development.

## Finding slow queries in production

### Level 4 — Tools

- **`pg_stat_statements`** — normalised statistics per query shape: calls, total and mean time, rows, buffer usage. Sort by `total_exec_time` to find what costs the most overall.
- **Slow query log** — `log_min_duration_statement = 500ms` logs every statement slower than half a second, with its parameters.
- **`auto_explain`** — logs the plans of slow queries automatically, capturing the plan actually used in production with real parameters.
- **APM and tracing** — application monitoring that shows which endpoint issued which queries and how long they took ({{ch:observability-and-incidents}}).
- **`pg_stat_activity`** — what is running right now, and what it is waiting for.

```sql
-- fragment
SELECT round(total_exec_time) AS total_ms, calls, round(mean_exec_time, 2) AS mean_ms,
       round(100 * total_exec_time / sum(total_exec_time) OVER (), 1) AS pct, left(query, 70) AS query
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 10;
```

### Level 4 — When the fix is not in the query

Some slowness has other causes:

- **Locks**: the query is fast but waits for a lock held by another transaction ({{ch:transactions}}).
- **Bloat and vacuum**: tables full of dead rows read slowly ({{ch:postgresql}}).
- **Memory**: the working set no longer fits in RAM, so reads go to disk — `BUFFERS` output shows `read=` instead of `hit=`.
- **Connection exhaustion**: requests queue for a connection, not for the query ({{ch:postgresql}}).
- **Too much traffic**: the query is as good as it gets, and the answer is caching, read replicas ({{ch:replication}}), partitioning ({{ch:partitioning}}) or reducing how often it runs.
- **The wrong database for the job**: large analytical scans belong in a column-oriented warehouse, full-text relevance at scale in a search engine.

## From beginner to enterprise

**Level 1–2 — first optimisations.** Running `EXPLAIN`; spotting sequential scans on large tables; adding indexes for filters and joins; selecting only needed columns.

**Level 3 — systematic tuning.** Reading `EXPLAIN ANALYZE` (estimates versus actuals, loops); recognising hash, nested-loop and merge joins; sargable rewrites; `EXISTS`; removing N+1 queries with joins and batching.

**Level 4 — production investigation.** `pg_stat_statements`, slow-query logs and `auto_explain`; statistics targets and extended statistics; keyset pagination; top-N-per-group patterns; recognising lock, memory and bloat problems.

**Level 5 — senior practice.** Performance budgets per endpoint; query-count and plan regression checks in CI; capacity planning; choosing among caching, replicas, partitioning and schema changes based on measurements ({{ch:performance-engineering}}).

**Level 6 — enterprises.** Fleet-wide query analytics; workload separation (operational versus analytical stores); automated detection of regressions after deployments; database reliability engineering as a discipline.

## Real-world use cases

### The dashboard that got slower every week

- **Symptom**: the admin order list slows steadily as data grows; page 1 is fine, later pages time out.
- **Diagnosis**: `OFFSET` pagination plus a `count(*)` for the page total, both scanning hundreds of thousands of rows.
- **Fix**: keyset pagination with an index matching the sort order; "load more" instead of page numbers; approximate totals. Every page now takes the same few milliseconds.

### The endpoint with 400 queries

- **Symptom**: a product listing endpoint takes 1.5 s, though no single query exceeds 3 ms.
- **Diagnosis**: query logging shows 401 queries per request — an ORM loading each product's category, images and reviews lazily.
- **Fix**: eager loading of categories (join) and batched loading of images and review summaries (`WHERE product_id = ANY($1)`), plus a precomputed rating summary column. Four queries per request; 60 ms.

## Common mistakes

### Beginner: optimising without measuring

**Fix:** find the highest total-cost queries first; read their plans.

### Beginner: testing on tiny data

**Fix:** realistic volumes and parameter values.

### Beginner: `SELECT *` everywhere

**Fix:** select needed columns.

### Intermediate: ignoring estimate errors

**Fix:** compare estimated and actual rows; fix statistics.

### Intermediate: functions on indexed columns

**Fix:** sargable rewrites or expression indexes.

### Intermediate: `OFFSET` pagination on large tables

**Fix:** keyset pagination.

### Production: N+1 queries from ORMs

**Fix:** joins, eager loading or batching; monitor queries per request.

### Production: one-off fixes without verification

**Fix:** compare plans and production metrics before and after; keep changes that help.

## Debugging and troubleshooting

- **Fast in `psql`, slow in the application**: different parameter values (a rare versus common value), generic prepared-statement plans, network round trips (N+1), or the application waiting for connections.
- **Plan suddenly changed for the worse**: statistics changed after `ANALYZE`, data grew past a threshold, or an index was dropped; compare old and new plans (`auto_explain` logs help).
- **Hash join with many batches, or "external merge" sorts**: not enough `work_mem` for that query; raise it for the session or query rather than globally.
- **Nested loop with huge `loops`**: the outer side was underestimated — fix estimates, or check for missing join conditions.
- **Query is fast but the endpoint is slow**: count queries per request; check application-side processing and serialisation.

## Security summary

- **Expensive queries are a denial-of-service risk**: user-controlled filters, sorts and deep pagination can make the database do enormous amounts of work. Allow-list sort fields, cap page sizes, prefer keyset pagination and set `statement_timeout` ({{ch:rate-limiting}}).
- **`EXPLAIN ANALYZE` executes the query** — never run it casually on production writes; use a transaction you roll back, or a replica.
- Query logs and `pg_stat_statements` may contain **sensitive parameter values**; restrict access and avoid logging parameters for sensitive queries.
- Optimisations must keep **authorisation filters** intact (for example, tenant conditions) — a faster query that returns other customers' data is a breach.

## How a senior engineer thinks about this

- **Measure, don't guess.** Total cost first, plan second, change third, verification always.
- **Estimates drive plans.** When a plan is bad, they look for where estimated and actual rows diverge.
- **Round trips are expensive.** Many small queries can cost more than one large one; they count queries per request.
- **The best query is the one you don't run.** Caching, precomputation and better product design (no deep pagination, no exact counts) are optimisations too.
- **Know the limits of tuning.** When a workload outgrows one database, they change the architecture rather than squeezing ever-smaller gains.

## Exercises

These continue in the same session as the chapter's examples.

### Exercise 1 — Make the date filter sargable

**Objective:** practise rewriting conditions.
**What to do:** this query counts pending orders placed on 1 March 2025: `SELECT count(*) FROM orders WHERE status = 'pending' AND date(placed_at) = '2025-03-01'`. Rewrite it so that the existing index on `(placed_at, id)` can be used, and show the plan.

<details>
<summary>Show the solution</summary>

```sql
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF, BUFFERS OFF)
SELECT count(*) FROM orders
WHERE status = 'pending'
  AND placed_at >= '2025-03-01' AND placed_at < '2025-03-02';
```

**Result:**

```text
                                                                          QUERY PLAN
--------------------------------------------------------------------------------------------------------------------------------------------------------------
 Aggregate (actual rows=1.00 loops=1)
   ->  Index Scan using orders_placed_id on orders (actual rows=14.00 loops=1)
         Index Cond: ((placed_at >= '2025-03-01 00:00:00+00'::timestamp with time zone) AND (placed_at < '2025-03-02 00:00:00+00'::timestamp with time zone))
         Filter: (status = 'pending'::text)
         Rows Removed by Filter: 706
         Index Searches: 1
(6 rows)
```

**Walkthrough:** `date(placed_at)` would force the database to compute the date for every row; the half-open range compares the raw column, so the index on `(placed_at, id)` narrows the search to one day's 720 orders, and the status filter is applied to those. (The session's time zone is UTC here; in an application, compute the day's boundaries in the business's time zone, {{ch:cron-jobs}}.) If this report runs constantly, a partial index `ON orders (placed_at) WHERE status = 'pending'` would read only the matching pending orders.

</details>

### Exercise 2 — Read the plan

**Objective:** practise interpreting plans.
**What to do:** a plan shows `Nested Loop (actual rows=480000 loops=1)` whose outer side is `Seq Scan on customers (cost=… rows=12 …) (actual rows=20000 loops=1)` and inner side `Index Scan using orders_customer_id on orders (actual rows=24 loops=20000)`. Explain what happened and what you would do.

<details>
<summary>Show the solution</summary>

The planner expected **12** customers from the outer scan, so a nested loop (12 index lookups) looked cheap. In reality **20,000** customers matched, so the inner index scan ran **20,000 times** (`loops=20000`), producing 480,000 rows. The root cause is an estimate error of more than 1,000× on the customers filter.

What to do:
1. Look at the customers filter: correlated columns (create extended statistics), stale statistics (`ANALYZE`), a skewed column (raise the statistics target), or a condition the planner cannot estimate (a function — consider an expression index, which also gathers statistics).
2. Re-run `EXPLAIN ANALYZE`: with a correct estimate, the planner should choose a hash join reading each table once.
3. If the query really processes most customers, consider whether it should run on a replica or from precomputed data.

</details>

### Exercise 3 — Keyset pagination in an API

**Objective:** practise designing pagination.
**What to do:** design the request and response of `GET /orders` using keyset pagination sorted newest first, and write the SQL for fetching the next page.

<details>
<summary>Show the solution</summary>

**API**
- Request: `GET /orders?limit=20&cursor=eyJwIjoiMjAyNS0xMC0wNVQxODo0MDowMFoiLCJpIjoyMDAwMDB9`
- Response: `{ "data": [ … 20 orders … ], "nextCursor": "…" }` — `nextCursor` is the base64url-encoded JSON `{"p": <placed_at of last row>, "i": <id of last row>}`, or `null` on the last page. The cursor is opaque to clients ({{ch:rest-apis}}).

**SQL (newest first)**

```sql
-- fragment
SELECT id, placed_at, total
FROM orders
WHERE customer_id = $1
  AND (placed_at, id) < ($2, $3)          -- values decoded from the cursor; omit on the first page
ORDER BY placed_at DESC, id DESC
LIMIT 21;                                  -- one extra row tells you whether another page exists
```

**Index:** `(customer_id, placed_at DESC, id DESC)` — equality column first, then the sort columns in the same order and direction. Validate and sign (or at least validate) decoded cursors, and cap `limit` on the server.

</details>

### Exercise 4 — Production scenario: the CPU spike after a release

**Objective:** practise production investigation.
**The scenario:** after a release, database CPU rises from 30% to 85%. No single query appears in the slow-query log (threshold 500 ms). How do you find the cause?

<details>
<summary>Show the solution</summary>

1. **`pg_stat_statements` by total time**: compare with a snapshot from before the release (or reset statistics and observe). Look for a query whose `calls` exploded — many fast queries add up — or whose mean time rose from, say, 0.2 ms to 4 ms.
2. **Suspect N+1**: a new feature that loads related data per row produces thousands of calls of one fast query shape. Check queries per request in APM traces for the endpoints changed in the release.
3. **Suspect a plan change**: a new query shape or parameter pattern may use a worse plan; capture it with `EXPLAIN ANALYZE` (or `auto_explain` with a lower threshold for a short time).
4. **Check missing indexes for new filters**: a new filter or sort in the release may scan a table that is small enough to stay under 500 ms but runs constantly.
5. **Fix**: batch or join the N+1, add the needed index (concurrently), or roll back the feature flag while fixing.
6. **Prevent**: a CI check on queries per request for key endpoints; alerting on database CPU and on `calls` growth per query; reviewing new queries' plans in code review.

</details>

## Summary

Query optimisation is a process: find the queries with the highest **total** cost (`pg_stat_statements`), reproduce them on realistic data with **`EXPLAIN (ANALYZE, BUFFERS)`**, locate the expensive step, change one thing and verify. Plans are read from the inside out; each node shows **estimates** (cost, rows) and **actuals** (rows per loop, loops). Large gaps between estimated and actual rows are the main cause of bad plans; fix them with `ANALYZE`, higher statistics targets, expression indexes or **extended statistics** for correlated columns.

PostgreSQL joins with **hash joins** (large sets, each read once, needs memory), **nested loops** (small outer side with an indexed inner side — disastrous when the outer side is underestimated) and **merge joins** (sorted inputs). The most valuable rewrites make conditions **sargable**, use `EXISTS` instead of counts, replace `OFFSET` with **keyset pagination** using row comparisons and matching indexes, solve top-N-per-group with `DISTINCT ON`, `LATERAL` or window functions, and simply **do less work**: fewer columns, earlier filters, batched writes.

In applications, the **N+1 problem** — one query per item — is fixed with joins for many-to-one data and batched `= ANY($1)` queries for one-to-many data. In production, use `pg_stat_statements`, slow-query logs, `auto_explain` and tracing, and remember that slowness may come from locks, bloat, memory, connections or sheer volume, where the fix is caching, replicas, partitioning or a different kind of database.

## Key terms

- **Query optimisation** — Reducing the resources queries use by improving queries, structures and statistics.
- **Query planner** — The component that chooses an execution plan by estimating costs.
- **Cost (planner)** — The planner's estimate of the work a plan requires, in arbitrary units.
- **Cardinality estimate** — The planner's prediction of how many rows a plan step produces.
- **Plan node** — One operation in a query plan, such as a scan, join or sort.
- **EXPLAIN ANALYZE** — Running a query and showing its plan with actual row counts and timings.
- **BUFFERS (EXPLAIN option)** — Reporting how many data pages were read from memory or disk.
- **Loops** — How many times a plan node was executed; actual rows are reported per loop.
- **Nested loop join** — A join that looks up matching inner rows for each outer row.
- **Hash join** — A join that builds a hash table from one input and probes it with the other.
- **Merge join** — A join that walks two inputs sorted on the join key.
- **work_mem** — The memory each sort or hash operation may use before spilling to disk.
- **Statistics target** — How detailed the statistics PostgreSQL collects for a column are.
- **Extended statistics** — Statistics about relationships between columns, created with `CREATE STATISTICS`.
- **Correlated columns** — Columns whose values depend on each other, which the planner assumes are independent.
- **Sargable condition** — A condition written so that an index can be used to evaluate it.
- **N+1 query problem** — Issuing one query for a list and one additional query per item.
- **Eager loading** — Loading related data together with the main data instead of on access.
- **Batching (queries)** — Loading many related rows in one query, for example with `= ANY($1)`.
- **OFFSET pagination** — Paging by skipping a number of rows, which grows slower for deeper pages.
- **Keyset pagination** — Paging by requesting rows after the last row seen, using an indexed sort key.
- **Row comparison** — Comparing tuples such as `(placed_at, id) > (x, y)` in SQL.
- **DISTINCT ON** — A PostgreSQL feature keeping the first row per group according to an ordering.
- **LATERAL join** — A join where the right side can refer to columns of each left row.
- **pg_stat_statements** — An extension recording execution statistics per query shape.
- **auto_explain** — A module that logs the plans of slow queries automatically.
- **Slow query log** — Logging of statements exceeding a duration threshold.

## What comes next

Writing SQL by hand gives full control, but most applications reach the database through a library that maps tables to objects. The next chapter, {{ch:orms}}, covers ORMs and query builders: what they do, the patterns they implement (active record, data mapper, unit of work), their benefits and traps — including the N+1 problem from the ORM's side — and how to use them without losing sight of the SQL underneath.
