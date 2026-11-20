# Indexes: Making Queries Fast

> [!GOALS]
> - Explain what an index is, how a **B-tree** finds rows quickly, and what indexes cost.
> - Read basic **query plans** with `EXPLAIN` and recognise sequential scans, index scans, bitmap scans and index-only scans.
> - Design **composite indexes** with the right column order for filters and sorting.
> - Use **partial**, **expression** and **covering** indexes for real queries.
> - Know when an index **cannot** help, and why the planner sometimes ignores one.
> - Choose specialised index types — **GIN**, **GiST**, **BRIN**, hash — for JSON, text search, ranges and huge append-only tables.
> - Manage indexes in production: creating them without downtime, finding unused ones, and avoiding over-indexing.

## Why this matters

A table without suitable indexes is like a book without an index or page numbers: to find one fact, you read every page. With 200 rows nobody notices. With 200 million rows, a query that should take 2 milliseconds takes 40 seconds, holds a database connection all that time, and — multiplied by every user loading the page — takes the site down.

Indexes are the single most effective performance tool in a relational database. Adding the right one routinely makes a query a thousand times faster, with no change to application code. Adding the wrong ones wastes memory and disk and slows down every insert and update. Most "the database is slow" incidents in growing applications come down to a missing, unsuitable or unused index — so understanding how indexes work, and how to check whether a query uses one, is a core back-end skill and a favourite interview topic.

The examples in this chapter use a table of 200,000 orders in real PostgreSQL ({{ch:postgresql}}), with query plans shown exactly as PostgreSQL produces them.

## The simple idea

Think of the index at the back of a textbook. To find "photosynthesis", you do not read the whole book; you look it up in the alphabetical index, which says "pages 112, 140, 203", and turn straight to those pages. The index is a **separate, sorted list** of terms with **pointers** to where they appear.

A database index is the same: a separate structure, sorted by the indexed column, where each entry points to the row's location in the table. Looking up `customer_id = 42` means jumping through the sorted index to 42 and following its pointers — not reading every row.

> [!ANALOGY]
> A database index is like the index at the back of a textbook: a separate, sorted list of terms, each pointing to the pages where it appears, so you can jump straight to them instead of reading the whole book.
>
> **Where the analogy breaks:** a book's index is written once. A database index must be updated on **every** insert, update and delete — adding a row means adding entries to every index on the table. And unlike a reader, the database decides for itself whether to use the index; if a term appears on nearly every page, reading the whole book straight through is actually faster, and it will do exactly that.

## The proper definition and key words

An **index** is a separate data structure that stores the values of one or more columns (or expressions) in an organised form, with pointers to the corresponding table rows, so the database can find rows without scanning the whole table.

Key words:

- **B-tree** — the default index type: a balanced, sorted tree supporting equality, ranges, sorting and prefix matches.
- **Sequential scan** (seq scan) — reading every row of a table.
- **Index scan** — finding rows through an index, then fetching them from the table.
- **Bitmap scan** — collecting row locations from an index first, then reading the table pages in order.
- **Index-only scan** — answering a query from the index alone, without visiting the table.
- **Composite (multi-column) index** — an index on several columns, sorted by the first, then the second, and so on.
- **Selectivity** — the fraction of rows a condition matches; low fractions (few rows) are "highly selective".
- **Query planner** (optimiser) — the part of the database that chooses how to execute a query, based on statistics.
- **Query plan** — the steps the database will take, shown by `EXPLAIN`.
- **Partial index** — an index on only the rows matching a condition.
- **Expression index** — an index on the result of an expression, such as `lower(email)`.
- **Covering index** — an index containing every column a query needs, enabling index-only scans.

## How indexes work

### Level 1 — The test data

```sql
CREATE TABLE orders (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  customer_id  integer       NOT NULL,
  status       text          NOT NULL,
  email        text          NOT NULL,
  total        numeric(10, 2) NOT NULL,
  placed_at    timestamptz   NOT NULL
);

-- 200,000 orders from 5,000 customers, one every 5 minutes from 1 January 2025
INSERT INTO orders (customer_id, status, email, total, placed_at)
SELECT (i % 5000) + 1,
       CASE WHEN i % 100 = 0 THEN 'pending' WHEN i % 10 = 0 THEN 'cancelled' ELSE 'delivered' END,
       'Customer' || ((i % 5000) + 1) || '@Example.com',
       ((i * 37) % 20000) / 100.0,
       timestamptz '2025-01-01 00:00+00' + i * interval '5 minutes'
FROM generate_series(1, 200000) AS i;

ANALYZE orders;      -- collect statistics for the planner
```

**Result:**

```text
ANALYZE
```

`generate_series` produces numbers 1 to 200,000, and each becomes an order: 40 orders per customer, 1% pending, 9% cancelled, 90% delivered. `ANALYZE` gathers statistics (how many rows, how values are distributed) that the planner uses to choose plans; autovacuum does this automatically on real systems.

### Level 2 — Without an index: reading everything

`EXPLAIN` shows the plan PostgreSQL chooses. With `ANALYZE` it also runs the query and reports what really happened; the extra options switch off timings and cost estimates so the output is easy to read (and identical every time):

```sql
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF, BUFFERS OFF)
SELECT * FROM orders WHERE customer_id = 42;
```

**Result:**

```text
                   QUERY PLAN
------------------------------------------------
 Seq Scan on orders (actual rows=40.00 loops=1)
   Filter: (customer_id = 42)
   Rows Removed by Filter: 199960
(3 rows)
```

Read plans from the innermost line outwards. Here there is one step: a **Seq Scan** — read all 200,000 rows, keep the 40 that match (`actual rows=40`), discard the other 199,960 (`Rows Removed by Filter`). Every query for one customer's orders reads the whole table.

### Level 2 — With an index

```sql
CREATE INDEX orders_customer_id ON orders (customer_id);

EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF, BUFFERS OFF)
SELECT * FROM orders WHERE customer_id = 42;
```

**Result:**

```text
                                QUERY PLAN
---------------------------------------------------------------------------
 Bitmap Heap Scan on orders (actual rows=40.00 loops=1)
   Recheck Cond: (customer_id = 42)
   Heap Blocks: exact=40
   ->  Bitmap Index Scan on orders_customer_id (actual rows=40.00 loops=1)
         Index Cond: (customer_id = 42)
         Index Searches: 1
(6 rows)
```

Now the plan has two steps:

1. **Bitmap Index Scan** on `orders_customer_id` finds the 40 matching entries in the index (`Index Cond: (customer_id = 42)`) — one search through the tree.
2. **Bitmap Heap Scan** reads only the 40 table pages that contain those rows (`Heap Blocks: exact=40`) instead of all of them. ("Heap" is PostgreSQL's name for the table's storage.)

A bitmap scan is chosen when several rows match; for a single row (such as a primary-key lookup) PostgreSQL usually uses a plain **Index Scan**. Either way, the work is now proportional to the number of matching rows, not the size of the table.

### Level 2 — Inside a B-tree

A B-tree keeps index entries sorted in pages, arranged as a shallow tree:

```text
                          [ root:  1800 | 3600 ]
                 ┌──────────────┼───────────────┐
         [ 600 | 1200 ]   [ 2400 | 3000 ]   [ 4200 | 4800 ]        branch pages
          ┌───┼───┐         ┌───┼───┐         ┌───┼───┐
        leaf pages: sorted (customer_id → row location) entries, linked left-to-right
        … [ 41 → (p7,3) | 42 → (p12,5) | 42 → (p97,1) | … | 43 → (p3,8) ] …
```

- To find 42, the database reads the root, follows one branch, and reaches the right leaf — **a handful of page reads**, because each page holds hundreds of entries. A tree of depth 4 can index billions of rows.
- Leaf pages are linked in order, so **ranges** (`BETWEEN 40 AND 50`) and **sorting** (`ORDER BY customer_id`) walk along the leaves.
- The tree stays balanced as rows are inserted and deleted.

That is why B-trees support `=`, `<`, `>`, `BETWEEN`, `IN`, `ORDER BY`, `IS NULL`, and `LIKE 'abc%'` (prefix matches), but cannot help `LIKE '%abc'` — there is no way to find a suffix in a list sorted by prefix.

### Level 2 — What indexes cost

Indexes are not free:

```sql
SELECT pg_size_pretty(pg_relation_size('orders'))             AS table_size,
       pg_size_pretty(pg_relation_size('orders_pkey'))        AS primary_key_index,
       pg_size_pretty(pg_relation_size('orders_customer_id')) AS customer_index;
```

**Result:**

```text
 table_size | primary_key_index | customer_index
------------+-------------------+----------------
 18 MB      | 4408 kB           | 1400 kB
(1 row)
```

- **Storage and memory**: each index takes space, and the hot parts must fit in memory to be fast.
- **Slower writes**: every `INSERT` adds an entry to every index; every `UPDATE` of an indexed column (and, in many cases, any update) changes index entries; every `DELETE` leaves entries to clean up. A table with ten indexes does roughly ten times the index work per insert.
- **Maintenance**: indexes bloat and need vacuuming like tables ({{ch:postgresql}}).

So the goal is not "index everything" but "index what the important queries need".

## Designing indexes for queries

### Level 3 — Composite indexes and column order

The customer's order history page asks: "the five most recent orders for customer 42".

```sql
CREATE INDEX orders_customer_placed ON orders (customer_id, placed_at DESC);

EXPLAIN (COSTS OFF)
SELECT id, placed_at, total FROM orders
WHERE customer_id = 42
ORDER BY placed_at DESC
LIMIT 5;
```

**Result:**

```text
                       QUERY PLAN
---------------------------------------------------------
 Limit
   ->  Index Scan using orders_customer_placed on orders
         Index Cond: (customer_id = 42)
(3 rows)
```

A composite index is sorted by `customer_id`, then — within each customer — by `placed_at` descending. The database jumps to customer 42's entries, which are **already in the requested order**, and stops after five: no sorting, no reading the other 35 orders. The `Limit` node sits on top of an `Index Scan` with no `Sort` step.

Column order is everything. The index works like a phone book sorted by surname then first name: easy to find "all Khans" or "Khan, Sara", useless for "everyone called Sara". This index cannot help a query that filters only on `placed_at`:

```sql
EXPLAIN (COSTS OFF)
SELECT count(*) FROM orders WHERE placed_at >= '2026-06-01';
```

**Result:**

```text
                                    QUERY PLAN
-----------------------------------------------------------------------------------
 Aggregate
   ->  Seq Scan on orders
         Filter: (placed_at >= '2026-06-01 00:00:00+00'::timestamp with time zone)
(3 rows)
```

A useful rule of thumb for ordering columns — sometimes called **equality, sort, range**:

1. Columns compared with **`=`** first (most selective first, when it makes no other difference).
2. Then columns used for **sorting**.
3. Then columns used in **range** conditions (`>`, `<`, `BETWEEN`).

An index on `(a, b)` also serves queries on `a` alone, so `orders_customer_id` is now **redundant** — `orders_customer_placed` covers its queries. Redundant indexes only add write cost; drop them:

```sql
DROP INDEX orders_customer_id;
```

**Result:**

```text
DROP INDEX
```

### Level 3 — When the planner ignores an index

An index on `status` would not help this query:

```sql
CREATE INDEX orders_status ON orders (status);

EXPLAIN (COSTS OFF) SELECT * FROM orders WHERE status = 'delivered';
```

**Result:**

```text
               QUERY PLAN
----------------------------------------
 Seq Scan on orders
   Filter: (status = 'delivered'::text)
(2 rows)
```

90% of orders are delivered. Using the index would mean jumping around the table to fetch 180,000 rows one by one — slower than reading the table straight through. The planner, using its statistics, chooses the sequential scan. For the **rare** value, the same index is worthwhile:

```sql
EXPLAIN (COSTS OFF) SELECT * FROM orders WHERE status = 'pending';
```

**Result:**

```text
                QUERY PLAN
------------------------------------------
 Index Scan using orders_status on orders
   Index Cond: (status = 'pending'::text)
(2 rows)
```

**Selectivity** decides. Indexes pay off when a condition matches a small fraction of rows (as a rough guide, a few per cent or less), or when they provide order for `ORDER BY … LIMIT`. Indexes on low-variety columns (booleans, statuses) are usually wasteful — unless queries target the rare values, in which case a **partial index** is even better (below).

Other reasons an index is not used:

- **Functions on the column**: `WHERE date(placed_at) = '2026-06-01'` or `WHERE lower(email) = ...` cannot use a plain index on the column — use an expression index, or rewrite as a range (`placed_at >= '2026-06-01' AND placed_at < '2026-06-02'`).
- **Type mismatches**: comparing an integer column with a text parameter can force conversions.
- **Leading wildcards**: `LIKE '%tea'`.
- **Stale statistics**: the planner's estimates are wrong — run `ANALYZE`.
- **Small tables**: reading a few pages directly is cheaper than using an index; that is correct behaviour.

### Level 3 — Partial indexes

The warehouse dashboard constantly asks for **pending** orders, which are 1% of the table. A **partial index** contains only those rows:

```sql
DROP INDEX orders_status;
CREATE INDEX orders_pending ON orders (placed_at) WHERE status = 'pending';

SELECT pg_size_pretty(pg_relation_size('orders_pending')) AS pending_index_size;
```

**Result:**

```text
 pending_index_size
--------------------
 64 kB
(1 row)
```

```sql
EXPLAIN (COSTS OFF)
SELECT id, placed_at FROM orders WHERE status = 'pending' ORDER BY placed_at LIMIT 20;
```

**Result:**

```text
                   QUERY PLAN
-------------------------------------------------
 Limit
   ->  Index Scan using orders_pending on orders
(2 rows)
```

The index is tiny (it holds 2,000 entries, not 200,000), cheap to maintain (inserts of delivered orders do not touch it), and already sorted by `placed_at` for the dashboard. The query's `WHERE` must imply the index's condition for the planner to use it. Partial indexes also enforce rules ("one default address per customer", {{ch:database-design}}) and skip soft-deleted rows (`WHERE deleted_at IS NULL`).

### Level 3 — Expression indexes

Emails were stored with mixed case, and login looks them up case-insensitively:

```sql
EXPLAIN (COSTS OFF) SELECT id FROM orders WHERE lower(email) = 'customer42@example.com';
```

**Result:**

```text
                        QUERY PLAN
-----------------------------------------------------------
 Seq Scan on orders
   Filter: (lower(email) = 'customer42@example.com'::text)
(2 rows)
```

```sql
CREATE INDEX orders_email_lower ON orders (lower(email));

EXPLAIN (COSTS OFF) SELECT id FROM orders WHERE lower(email) = 'customer42@example.com';
```

**Result:**

```text
                             QUERY PLAN
---------------------------------------------------------------------
 Bitmap Heap Scan on orders
   Recheck Cond: (lower(email) = 'customer42@example.com'::text)
   ->  Bitmap Index Scan on orders_email_lower
         Index Cond: (lower(email) = 'customer42@example.com'::text)
(4 rows)
```

The index stores `lower(email)` values, so it matches queries using **exactly the same expression**. (A query with `WHERE email = 'Customer42@Example.com'` would not use it.) Expression indexes are useful for case-insensitive lookups, JSONB fields (`(details ->> 'channel')`), and computed values. The better long-term design is often to store normalised values in the first place (lower-cased emails, {{ch:validation}}).

### Level 4 — Covering indexes and index-only scans

Even with an index, the database usually visits the table to fetch the columns the query needs. If the **index itself** contains every needed column, it can skip the table entirely — an **index-only scan**:

```sql
CREATE INDEX orders_customer_placed_cover ON orders (customer_id, placed_at DESC) INCLUDE (total);
DROP INDEX orders_customer_placed;
```

**Result:**

```text
DROP INDEX
```

```sql
VACUUM orders;       -- updates the visibility map, which index-only scans rely on (run on its own)
```

**Result:**

```text
VACUUM
```

```sql
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF, BUFFERS OFF)
SELECT placed_at, total FROM orders WHERE customer_id = 42 ORDER BY placed_at DESC LIMIT 5;
```

**Result:**

```text
                                          QUERY PLAN
-----------------------------------------------------------------------------------------------
 Limit (actual rows=5.00 loops=1)
   ->  Index Only Scan using orders_customer_placed_cover on orders (actual rows=5.00 loops=1)
         Index Cond: (customer_id = 42)
         Heap Fetches: 0
         Index Searches: 1
(5 rows)
```

- `INCLUDE (total)` stores `total` in the index's leaf entries without making it part of the sort order.
- **`Index Only Scan`** with **`Heap Fetches: 0`** means no table pages were read at all.
- Index-only scans need the table's **visibility map** to show that pages contain only rows visible to everyone; `VACUUM` (or autovacuum) maintains it. On tables with constant updates, heap fetches creep back in.

Covering indexes are a precise tool for the hottest queries — but each included column makes the index larger, so include only what those queries need.

## Specialised index types

### Level 3 — Beyond B-trees

| Type | Good for | Example |
|---|---|---|
| **B-tree** (default) | Equality, ranges, sorting, prefix `LIKE` | `CREATE INDEX ON orders (customer_id, placed_at)` |
| **GIN** (generalised inverted index) | Values containing many elements: JSONB, arrays, full-text search, trigrams | `CREATE INDEX ON orders USING gin (details)` — for `@>` and `?` ({{ch:postgresql}}) |
| **GiST** (generalised search tree) | Ranges, geometry and geography, exclusion constraints, nearest-neighbour searches | `CREATE INDEX ON bookings USING gist (during)` |
| **BRIN** (block range index) | Huge tables whose rows are physically ordered by the column, such as append-only logs by time | `CREATE INDEX ON events USING brin (created_at)` — tiny, approximate |
| **Hash** | Equality only | Rarely better than B-tree in practice |

Extensions add more: `pg_trgm` operator classes for `LIKE '%…%'` searches, and `pgvector`'s HNSW and IVFFlat indexes for similarity search over embeddings ({{ch:embeddings-and-vector-databases}}).

A **BRIN** index illustrates a different trade-off: instead of an entry per row, it stores the minimum and maximum value for each block of pages. For our orders, inserted in time order, a BRIN index on `placed_at` is a few kilobytes — but it only helps when the physical order matches the column's order.

### Level 3 — Unique indexes and constraints

A `UNIQUE` constraint or primary key is implemented with a unique B-tree index, which both enforces the rule and speeds up lookups. Foreign keys, however, do **not** automatically get an index on the referencing column. An unindexed foreign key (`orders.customer_id` without an index) makes joins and, importantly, **deletes on the parent table** slow: deleting a customer must check every order for references. Index foreign-key columns that are joined or whose parents are deleted.

## Indexes in production

### Level 4 — Creating indexes without downtime

A plain `CREATE INDEX` blocks writes to the table until it finishes — minutes or hours on a large table. In production use:

```sql
-- fragment
CREATE INDEX CONCURRENTLY orders_placed_at ON orders (placed_at);
DROP INDEX CONCURRENTLY orders_old_index;
```

`CONCURRENTLY` builds the index while reads and writes continue. It takes longer, cannot run inside a transaction block (migration tools need a setting for this), and if it fails it leaves an **invalid** index that must be dropped and retried. Rebuilding a bloated index without blocking works the same way: `REINDEX INDEX CONCURRENTLY`.

### Level 4 — Finding missing and unused indexes

- **Slow queries**: `pg_stat_statements` lists queries by total time; `EXPLAIN (ANALYZE, BUFFERS)` on the worst ones shows sequential scans over large tables and large `Rows Removed by Filter` counts ({{ch:query-optimization}}).
- **Tables scanned sequentially a lot**: `pg_stat_user_tables` (`seq_scan`, `seq_tup_read`) points to tables that may need indexes.
- **Unused indexes**: `pg_stat_user_indexes` with `idx_scan = 0` over a representative period (check replicas too, since statistics are per server) are candidates for removal — after confirming they do not enforce uniqueness.

```sql
-- fragment
SELECT relname AS table_name, indexrelname AS index_name, idx_scan,
       pg_size_pretty(pg_relation_size(indexrelid)) AS size
FROM pg_stat_user_indexes
ORDER BY idx_scan, pg_relation_size(indexrelid) DESC;
```

### Level 4 — An indexing strategy

1. **Start from the queries**: list the important queries (by frequency × cost) and the `WHERE`, `JOIN` and `ORDER BY` columns each uses.
2. **Primary keys and unique constraints** come with indexes.
3. **Index foreign keys** used in joins and parent deletes.
4. **Composite indexes** for the main access paths, ordered equality → sort → range; one good composite index often replaces several single-column ones.
5. **Partial and expression indexes** for targeted needs.
6. **Covering indexes** only for the hottest queries.
7. **Verify** every new index with `EXPLAIN` on realistic data volumes — a plan on 100 development rows says nothing about production.
8. **Review regularly**: remove unused and redundant indexes; watch write latency on heavily indexed tables.

In multi-tenant systems, indexes usually start with `tenant_id`, matching queries that always filter by tenant ({{ch:postgresql}}).

## From beginner to enterprise

**Level 1–2 — first indexes.** Understanding that indexes avoid full scans; primary-key and unique indexes; single-column indexes on frequently filtered columns; reading a basic `EXPLAIN`.

**Level 3 — query-driven indexing.** Composite indexes with deliberate column order; recognising when the planner prefers a sequential scan; partial and expression indexes; indexing foreign keys; dropping redundant indexes.

**Level 4 — production practice.** Covering indexes and index-only scans; GIN, GiST and BRIN where appropriate; `CREATE INDEX CONCURRENTLY` in migrations; finding missing and unused indexes with statistics views; verifying plans on production-sized data.

**Level 5 — senior practice.** Balancing read speed against write cost on hot tables; designing indexes together with partitioning ({{ch:partitioning}}); plan regression checks for critical queries; capacity planning for index memory.

**Level 6 — enterprises.** Index management across fleets of databases; automated index recommendations reviewed by engineers; workload-specific stores (search engines, columnar warehouses) for queries that indexes in an operational database cannot serve well.

## Real-world use cases

### The slow order-history page

- **Symptom**: the "My orders" page takes 3 seconds for long-standing customers.
- **Diagnosis**: `EXPLAIN` shows an index scan on `customer_id` followed by a `Sort` of thousands of orders, then `Limit 20`.
- **Fix**: a composite index `(customer_id, placed_at DESC)`, removing the sort and stopping after 20 rows; the old single-column index dropped. Page time: 15 ms.

### The warehouse queue

- **Need**: "oldest 50 paid-but-not-shipped orders" polled every few seconds by many workers.
- **Index**: partial index `ON orders (paid_at) WHERE status = 'paid'` — small, always sorted, untouched by the vast majority of writes. Combined with `FOR UPDATE SKIP LOCKED`, it makes a fast database-backed work queue ({{ch:queues}}, {{ch:transactions}}).

## Common mistakes

### Beginner: no indexes beyond primary keys

**Consequence:** sequential scans as tables grow. **Fix:** index the columns important queries filter, join and sort on.

### Beginner: an index on every column

**Consequence:** slow writes, wasted memory, most indexes unused. **Fix:** query-driven indexes; remove unused ones.

### Beginner: testing performance on tiny data

**Fix:** check plans on realistic volumes (generate data with `generate_series`, or use a production-like copy).

### Intermediate: wrong column order in composite indexes

**Fix:** equality columns first, then sort, then range; check with `EXPLAIN`.

### Intermediate: functions on indexed columns in `WHERE`

**Fix:** expression indexes, or rewrite conditions as ranges on the raw column.

### Intermediate: unindexed foreign keys

**Consequence:** slow joins and very slow parent deletes. **Fix:** index referencing columns.

### Production: `CREATE INDEX` without `CONCURRENTLY` on a busy table

**Consequence:** writes blocked for the duration. **Fix:** concurrent builds in migrations.

### Production: keeping redundant indexes

`(a)` alongside `(a, b)`. **Fix:** drop the redundant one after checking it is not needed for uniqueness.

## Debugging and troubleshooting

- **"I added an index but the query still does a Seq Scan"**: the condition is not selective; the query uses a function or different type; the composite index's leading column is missing from the query; statistics are stale (`ANALYZE`); or the table is small.
- **Estimated rows differ wildly from actual rows** in `EXPLAIN ANALYZE`: stale or insufficient statistics; correlated columns the planner treats as independent — `ANALYZE`, raise the statistics target, or create extended statistics ({{ch:query-optimization}}).
- **An index-only scan has many heap fetches**: the visibility map is out of date — vacuum more often.
- **Inserts became slower over time**: too many indexes, or bloated ones — review usage and rebuild concurrently.
- **`CREATE INDEX CONCURRENTLY` failed**: an invalid index remains — find it (`\d table` shows `INVALID`), drop it, and retry.

## Security summary

- Indexes contain **copies of column data**: an index on an email or a national id column is as sensitive as the column itself, appears in backups, and must be considered in data deletion and encryption plans.
- **Unique indexes enforce integrity rules** — part of keeping data valid.
- Long-running index builds can be a **denial-of-service risk** if run carelessly in production; use `CONCURRENTLY` and run migrations under controlled conditions with `lock_timeout`.
- Avoid letting user input control **sort columns or filters** that bypass indexes on huge tables (an attacker can request deliberately expensive queries); allow-list sortable fields and enforce limits ({{ch:rate-limiting}}).

## How a senior engineer thinks about this

- **Indexes serve queries.** They start from the important queries and design indexes for them, not the other way round.
- **Every index is a trade.** Faster reads for those queries; slower writes, more memory and maintenance for everything else.
- **The plan is the truth.** They check `EXPLAIN (ANALYZE)` on realistic data before and after every change.
- **Column order and selectivity decide usefulness.** One well-ordered composite or partial index often beats several generic ones.
- **Production changes are non-blocking.** Concurrent builds, monitored rollouts, and cleanup of unused indexes.

## Exercises

These continue in the same session as the chapter's examples.

### Exercise 1 — Index a date-range report

**Objective:** practise range queries and expressions.
**The query:** the finance report counts delivered orders and sums their totals for June 2026. A colleague wrote it with `date_trunc('month', placed_at) = '2026-06-01'`. Rewrite it so an index on `placed_at` can be used, create a suitable index, and show the plan.

<details>
<summary>Show the solution</summary>

```sql
CREATE INDEX orders_delivered_placed ON orders (placed_at) WHERE status = 'delivered';

EXPLAIN (COSTS OFF)
SELECT count(*), sum(total)
FROM orders
WHERE status = 'delivered'
  AND placed_at >= '2026-06-01' AND placed_at < '2026-07-01';
```

**Result:**

```text
                                                                          QUERY PLAN
--------------------------------------------------------------------------------------------------------------------------------------------------------------
 Aggregate
   ->  Index Scan using orders_delivered_placed on orders
         Index Cond: ((placed_at >= '2026-06-01 00:00:00+00'::timestamp with time zone) AND (placed_at < '2026-07-01 00:00:00+00'::timestamp with time zone))
(3 rows)
```

**Walkthrough:** `date_trunc('month', placed_at) = …` applies a function to every row, so a plain index on `placed_at` cannot help. The half-open range `>= 1 June AND < 1 July` compares the raw column and uses the index (and correctly includes every moment of 30 June). The partial index contains only delivered orders, matching the report's filter. The plan scans the index for the date range and fetches only the matching rows.

</details>

### Exercise 2 — Choose the indexes

**Objective:** practise query-driven index design.
**What to do:** propose indexes for these queries on a `products` table (`id`, `shop_id`, `category_id`, `name`, `price`, `is_active`, `created_at`, `tags text[]`): (1) a shop's active products in a category, cheapest first; (2) product lookup by `lower(name)` within a shop; (3) products with a given tag; (4) a shop's newest products, 20 per page.

<details>
<summary>Show the solution</summary>

1. `CREATE INDEX ON products (shop_id, category_id, price) WHERE is_active;` — equality columns (`shop_id`, `category_id`), then the sort column (`price`); partial because only active products are listed.
2. `CREATE INDEX ON products (shop_id, lower(name));` — equality on the shop plus the expression the query uses (unique, if names must be unique per shop).
3. `CREATE INDEX ON products USING gin (tags);` — GIN for array containment (`tags @> ARRAY['vegan']` or `'vegan' = ANY (tags)` written as containment).
4. `CREATE INDEX ON products (shop_id, created_at DESC);` — equality then sort, so the page is read straight from the index; use keyset pagination (`WHERE created_at < $last`) rather than large `OFFSET`s ({{ch:query-optimization}}).

Then verify each with `EXPLAIN` on realistic data, and check whether any existing index is now redundant.

</details>

### Exercise 3 — Why is the index ignored?

**Objective:** practise diagnosing index usage.
**What to do:** for each case, explain why the index is not used and how to fix it. (a) Index on `(placed_at, customer_id)`; query `WHERE customer_id = 42`. (b) Index on `email`; query `WHERE email ILIKE 'sara%'`. (c) Index on `status`; query `WHERE status <> 'delivered'`. (d) Index on `total`; query `WHERE total * 1.2 > 100`.

<details>
<summary>Show the solution</summary>

- **(a)** The query does not constrain the leading column (`placed_at`), so the sorted order is useless for finding a customer. Fix: an index starting with `customer_id`.
- **(b)** `ILIKE` is case-insensitive, and a plain B-tree is sorted case-sensitively. Fix: an expression index on `lower(email)` with `WHERE lower(email) LIKE 'sara%'` (with a `text_pattern_ops` operator class if the database collation is not `C`), or a trigram GIN index for general patterns.
- **(c)** `<> 'delivered'` matches 10% of rows spread through the table, and "not equal" conditions are rarely selective enough for an index. Fix: if the query really means "pending or cancelled", a partial index `WHERE status <> 'delivered'` or `WHERE status IN ('pending', 'cancelled')`.
- **(d)** The expression applies arithmetic to the column. Fix: rewrite as `total > 100 / 1.2` (the column alone on one side), which can use the index.

</details>

### Exercise 4 — Production scenario: writes got slow

**Objective:** practise balancing read and write costs.
**The scenario:** after several months of adding indexes to fix slow pages, inserting orders now takes 40 ms instead of 5 ms at peak times, and the `orders` table has 14 indexes. What do you do?

<details>
<summary>Show the solution</summary>

1. **Measure**: confirm with `pg_stat_statements` that inserts (and updates) on `orders` got slower; check lock waits and I/O.
2. **Inventory the indexes**: list each with size and `idx_scan` from `pg_stat_user_indexes` (on the primary and every replica).
3. **Remove unused indexes**: zero or near-zero scans over a representative period (including monthly jobs), not backing a constraint.
4. **Remove redundant indexes**: an index whose columns are a prefix of another (`(customer_id)` when `(customer_id, placed_at)` exists); duplicates with different names.
5. **Merge**: several single-column indexes used together might be replaced by one composite index; broad indexes might become partial ones covering only the rows queried.
6. **Check updates**: indexes on frequently updated columns cost the most; PostgreSQL can avoid index updates (HOT updates) only when no indexed column changes and the page has free space — consider a lower `fillfactor` on hot tables.
7. **Drop concurrently** (`DROP INDEX CONCURRENTLY`), one at a time, watching query latency for regressions, with the `CREATE INDEX CONCURRENTLY` statement ready to restore any that turn out to matter.
8. **Prevent recurrence**: require an `EXPLAIN` and a note of which query an index serves in every migration adding one; review index usage periodically.

</details>

## Summary

An **index** is a separate, organised copy of column values with pointers to rows, letting the database find rows without a **sequential scan**. The default **B-tree** keeps entries sorted in a shallow balanced tree, so equality, ranges, sorting and prefix `LIKE` take a handful of page reads even on huge tables. `EXPLAIN` (with `ANALYZE` to run the query) shows the chosen plan: **Seq Scan**, **Index Scan**, **Bitmap Index/Heap Scan**, and **Index Only Scan**. Indexes cost storage, memory and — on every insert, update and delete — write time, so they should serve real queries.

Design indexes from queries. **Composite indexes** are sorted by their first column, then the next, so order them equality → sort → range; a composite index also serves its leading columns, making shorter duplicates redundant. The **planner** uses statistics and ignores indexes when conditions match many rows (low **selectivity**), when queries apply functions to columns, use leading wildcards or mismatched types, or when statistics are stale. **Partial indexes** cover only the rows queried; **expression indexes** match computed values such as `lower(email)`; **covering indexes** with `INCLUDE` enable index-only scans when the visibility map is current.

Specialised types serve other data: **GIN** for JSONB, arrays, full-text and trigrams; **GiST** for ranges, geometry and exclusion constraints; **BRIN** for huge naturally ordered tables. Index foreign keys used in joins and parent deletes. In production, build and drop indexes **concurrently**, verify plans on realistic data, find missing indexes through slow-query statistics, and remove unused and redundant ones to keep writes fast.

## Key terms

- **Index** — A separate data structure that lets the database find rows without scanning the whole table.
- **B-tree** — A balanced, sorted tree index supporting equality, range and ordering operations.
- **Leaf page** — The lowest level of a B-tree, holding index entries and row pointers.
- **Heap** — PostgreSQL's term for a table's main row storage.
- **Sequential scan** — Reading every row of a table to find matches.
- **Index scan** — Using an index to locate rows, then fetching them from the table.
- **Bitmap scan** — Collecting matching row locations from an index, then reading table pages in physical order.
- **Index-only scan** — Answering a query entirely from an index without reading the table.
- **Heap fetch** — A visit to the table during an index-only scan, needed when visibility is uncertain.
- **Visibility map** — PostgreSQL's record of table pages whose rows are visible to all transactions.
- **Query planner** — The database component that chooses an execution plan using statistics.
- **Query plan** — The sequence of operations the database uses to run a query.
- **EXPLAIN** — The command that shows a query's plan; with `ANALYZE`, it also runs the query and reports actual results.
- **Statistics (planner)** — Summaries of table data used to estimate how many rows conditions match.
- **Selectivity** — The proportion of rows a condition matches.
- **Composite index** — An index on several columns, ordered by each in turn.
- **Leading column** — The first column of a composite index, which queries must use for efficient lookups.
- **Redundant index** — An index whose purpose is fully served by another index.
- **Partial index** — An index covering only the rows that satisfy a condition.
- **Expression index** — An index on the result of an expression rather than a raw column.
- **Covering index** — An index containing all columns a query needs.
- **INCLUDE columns** — Extra columns stored in index entries without affecting sort order.
- **GIN index** — An inverted index for values with many elements, such as JSONB, arrays and text search vectors.
- **GiST index** — A generalised search-tree index for ranges, geometric data and similar types.
- **BRIN index** — A compact index storing value ranges per block of pages, for naturally ordered data.
- **Unique index** — An index that also enforces uniqueness of its values.
- **CREATE INDEX CONCURRENTLY** — Building an index without blocking writes to the table.
- **Index bloat** — Wasted space in an index from dead entries.

## What comes next

Indexes make individual lookups fast; the next question is what happens when many users change the same data at once. The next chapter, {{ch:transactions}}, covers transactions: atomicity and the ACID properties, commit and rollback, isolation levels and the anomalies they prevent, locks and deadlocks, optimistic and pessimistic concurrency control, and the patterns that keep data correct under concurrent load.
