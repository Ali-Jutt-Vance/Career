# Partitioning

> [!GOALS]
> - Explain what table partitioning is and the problems it solves for very large tables.
> - Create **range**, **list** and **hash** partitions with PostgreSQL's declarative partitioning.
> - See **partition pruning** in query plans, and design queries that benefit from it.
> - Manage partitions over time: creating future partitions, detaching and dropping old ones, default partitions.
> - Understand the rules and limits: partition keys, unique constraints, indexes, foreign keys.
> - Decide when partitioning helps — and when an index, archiving or sharding is the better answer.

## Why this matters

Some tables never stop growing: orders, payments, page-view events, audit logs, sensor readings, chat messages. At tens of millions of rows they are fine with good indexes. At billions, new problems appear. Indexes become larger than memory. Deleting old data with `DELETE … WHERE created_at < …` takes hours, bloats the table and floods replication ({{ch:replication}}). Vacuuming one giant table takes days. A single bad query on the whole table scans terabytes.

**Partitioning** splits one logical table into many smaller physical tables — for example, one per month — while queries still see a single table. Queries that filter by month touch only the relevant partitions; deleting a year of old data becomes dropping twelve tables, which takes milliseconds; maintenance runs partition by partition. It is one of the main tools for keeping a growing database manageable inside **one** server, before reaching for the much larger step of sharding across servers ({{ch:sharding}}).

Partitioning is also easy to apply where it does not help, adding complexity for nothing. This chapter shows how it works in PostgreSQL, what it does to query plans, how to operate it, and how to tell whether you need it. Every result shown is real PostgreSQL output.

## The simple idea

Think of a filing cabinet for a business's invoices. With one enormous drawer, finding last March's invoices means flipping through everything, and throwing away invoices older than seven years means pulling them out one by one. With one drawer per month, you open only the March drawer, and when invoices pass the retention limit you empty the oldest drawer in one go. From the outside it is still "the invoice cabinet".

> [!ANALOGY]
> Partitioning is like a filing cabinet with one drawer per month instead of one giant drawer: you open only the drawers you need, and discarding old records means emptying a whole drawer at once — while it is still one cabinet from the outside.
>
> **Where the analogy breaks:** a person looking for "all invoices from customer 42" can glance at drawer labels and still has to search every drawer. A database is the same — if a query does not filter by the partitioning column, it must look in **every** partition, which can be slower than one well-indexed table. Partitioning only pays off when the common queries line up with how the data is split.

## The proper definition and key words

**Table partitioning** is dividing a large table into smaller physical pieces (**partitions**) based on the values of one or more columns (the **partition key**), while presenting them as a single logical table.

Key words:

- **Partitioned table** (parent) — the logical table; it holds no rows itself.
- **Partition** — a physical table holding the rows for one range, list of values, or hash bucket.
- **Partition key** — the column(s) whose values decide which partition a row belongs to.
- **Range partitioning** — partitions cover ranges of values (dates, ids).
- **List partitioning** — partitions hold specific values (regions, tenants, statuses).
- **Hash partitioning** — rows are spread across a fixed number of partitions by a hash of the key.
- **Partition pruning** — the planner skipping partitions that cannot contain matching rows.
- **Default partition** — catches rows that match no other partition.
- **Detach / attach** — removing a partition from the parent (keeping it as a normal table) or adding an existing table as a partition.

## Partitioning in PostgreSQL

### Level 2 — Range partitioning by time

The most common case: an events table partitioned by month.

```sql
CREATE TABLE page_views (
  id          bigint GENERATED ALWAYS AS IDENTITY,
  viewed_at   timestamptz NOT NULL,
  customer_id integer,
  path        text NOT NULL
) PARTITION BY RANGE (viewed_at);

CREATE TABLE page_views_2026_09 PARTITION OF page_views FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');
CREATE TABLE page_views_2026_10 PARTITION OF page_views FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');
CREATE TABLE page_views_2026_11 PARTITION OF page_views FOR VALUES FROM ('2026-11-01') TO ('2026-12-01');

CREATE INDEX ON page_views (viewed_at);        -- creates a matching index on every partition
```

**Result:**

```text
CREATE INDEX
```

- `PARTITION BY RANGE (viewed_at)` makes `page_views` a partitioned table with no storage of its own.
- Each `CREATE TABLE … PARTITION OF … FOR VALUES FROM (a) TO (b)` creates one partition. The lower bound is **inclusive** and the upper bound **exclusive**, so months do not overlap.
- An index created on the parent is created on every partition (and on future ones).

Rows are routed automatically:

```sql
INSERT INTO page_views (viewed_at, customer_id, path)
SELECT timestamptz '2026-09-01 00:00+00' + i * interval '13 minutes', i % 300, '/products/' || (i % 50)
FROM generate_series(0, 9000) AS i;

SELECT tableoid::regclass AS partition, count(*) AS rows, min(viewed_at)::date AS first_day, max(viewed_at)::date AS last_day
FROM page_views
GROUP BY 1
ORDER BY 1;
```

**Result:**

```text
     partition      | rows | first_day  |  last_day
--------------------+------+------------+------------
 page_views_2026_09 | 3324 | 2026-09-01 | 2026-09-30
 page_views_2026_10 | 3433 | 2026-10-01 | 2026-10-31
 page_views_2026_11 | 2244 | 2026-11-01 | 2026-11-21
(3 rows)
```

`tableoid::regclass` shows which physical partition each row lives in: the 9,001 views landed in the right months without the application knowing partitions exist. A row outside every range is rejected:

```sql
INSERT INTO page_views (viewed_at, path) VALUES ('2027-01-15 10:00+00', '/');
```

**Result:**

```text
ERROR:  no partition of relation "page_views" found for row
```

Creating partitions **in advance** is therefore essential (see "Operating partitions" below), or a **default partition** must catch strays.

### Level 3 — Partition pruning

Queries that filter on the partition key only touch the partitions that can match:

```sql
EXPLAIN (COSTS OFF)
SELECT count(*) FROM page_views
WHERE viewed_at >= '2026-10-01' AND viewed_at < '2026-10-08';
```

**Result:**

```text
                                                                             QUERY PLAN
--------------------------------------------------------------------------------------------------------------------------------------------------------------------
 Aggregate
   ->  Bitmap Heap Scan on page_views_2026_10 page_views
         Recheck Cond: ((viewed_at >= '2026-10-01 00:00:00+00'::timestamp with time zone) AND (viewed_at < '2026-10-08 00:00:00+00'::timestamp with time zone))
         ->  Bitmap Index Scan on page_views_2026_10_viewed_at_idx
               Index Cond: ((viewed_at >= '2026-10-01 00:00:00+00'::timestamp with time zone) AND (viewed_at < '2026-10-08 00:00:00+00'::timestamp with time zone))
(5 rows)
```

Only `page_views_2026_10` appears in the plan: the September and November partitions were **pruned** at planning time, so they cost nothing. Compare a query that does not filter on the key:

```sql
EXPLAIN (COSTS OFF)
SELECT count(*) FROM page_views WHERE customer_id = 42;
```

**Result:**

```text
                       QUERY PLAN
---------------------------------------------------------
 Aggregate
   ->  Append
         ->  Seq Scan on page_views_2026_09 page_views_1
               Filter: (customer_id = 42)
         ->  Seq Scan on page_views_2026_10 page_views_2
               Filter: (customer_id = 42)
         ->  Seq Scan on page_views_2026_11 page_views_3
               Filter: (customer_id = 42)
(8 rows)
```

With no condition on `viewed_at`, PostgreSQL must scan **every** partition and combine the results (`Append`). With three partitions that is trivial; with 120 monthly partitions it is 120 separate scans and index lookups — often slower than one table with a good index on `customer_id`. **Partitioning only helps queries that include the partition key.** Choose the key from the most important queries (for event data, almost always time).

Pruning also happens at execution time when the value is a parameter (`WHERE viewed_at >= $1`), and during joins in some cases.

### Level 3 — Dropping old data instantly

Retention is where time-based partitioning shines. Removing September's data:

```sql
ALTER TABLE page_views DETACH PARTITION page_views_2026_09;
DROP TABLE page_views_2026_09;

SELECT count(*) AS remaining, min(viewed_at)::date AS oldest FROM page_views;
```

**Result:**

```text
 remaining |   oldest
-----------+------------
      5677 | 2026-10-01
(1 row)
```

Detaching and dropping a partition removes millions of rows in milliseconds, with no table bloat, no long-running `DELETE`, and very little WAL — instead of a `DELETE` that rewrites rows, generates huge replication traffic and leaves dead tuples for vacuum ({{ch:postgresql}}). A detached partition can also be archived first (dumped to cheap storage) and dropped afterwards. On busy systems, `DETACH PARTITION … CONCURRENTLY` avoids blocking queries on the parent.

### Level 3 — List and hash partitioning

**List partitioning** groups specific values — useful for regions, tenants with very different sizes, or splitting active from archived rows:

```sql
CREATE TABLE orders_by_region (
  id      bigint NOT NULL,
  region  text   NOT NULL,
  total   numeric(10, 2) NOT NULL
) PARTITION BY LIST (region);

CREATE TABLE orders_uk  PARTITION OF orders_by_region FOR VALUES IN ('england', 'scotland', 'wales', 'northern-ireland');
CREATE TABLE orders_eu  PARTITION OF orders_by_region FOR VALUES IN ('ireland', 'france', 'germany');
CREATE TABLE orders_other PARTITION OF orders_by_region DEFAULT;

INSERT INTO orders_by_region VALUES (1, 'scotland', 20), (2, 'france', 35), (3, 'pakistan', 12), (4, 'wales', 8);
SELECT tableoid::regclass AS partition, string_agg(region, ', ' ORDER BY id) AS regions FROM orders_by_region GROUP BY 1 ORDER BY 1;
```

**Result:**

```text
  partition   |     regions
--------------+-----------------
 orders_uk    | scotland, wales
 orders_eu    | france
 orders_other | pakistan
(3 rows)
```

The **default partition** caught Pakistan. Default partitions prevent insert failures, but beware: later creating a partition for a value already present in the default requires moving those rows, and a large default partition gives up the benefits of pruning.

**Hash partitioning** spreads rows evenly across a fixed number of partitions when there is no natural range — for example, by customer id — mainly to keep each partition's size and maintenance manageable:

```sql
CREATE TABLE carts (customer_id integer NOT NULL, items jsonb NOT NULL) PARTITION BY HASH (customer_id);
CREATE TABLE carts_p0 PARTITION OF carts FOR VALUES WITH (MODULUS 4, REMAINDER 0);
CREATE TABLE carts_p1 PARTITION OF carts FOR VALUES WITH (MODULUS 4, REMAINDER 1);
CREATE TABLE carts_p2 PARTITION OF carts FOR VALUES WITH (MODULUS 4, REMAINDER 2);
CREATE TABLE carts_p3 PARTITION OF carts FOR VALUES WITH (MODULUS 4, REMAINDER 3);

INSERT INTO carts SELECT i, '[]' FROM generate_series(1, 1000) AS i;
SELECT tableoid::regclass AS partition, count(*) FROM carts GROUP BY 1 ORDER BY 1;
```

**Result:**

```text
 partition | count
-----------+-------
 carts_p0  |   259
 carts_p1  |   234
 carts_p2  |   276
 carts_p3  |   231
(4 rows)
```

The 1,000 carts spread roughly evenly. Lookups by `customer_id` prune to one partition. Hash partitions cannot be "dropped for retention" meaningfully, and changing the number of partitions later means rewriting data, so choose the modulus with growth in mind.

## Rules and limits

### Level 3 — Keys, constraints and indexes

Partitioning changes some familiar rules:

```sql
CREATE TABLE payments (
  id       bigint NOT NULL,
  paid_at  timestamptz NOT NULL,
  amount   numeric(10, 2) NOT NULL,
  PRIMARY KEY (id)
) PARTITION BY RANGE (paid_at);
```

**Result:**

```text
ERROR:  unique constraint on partitioned table must include all partitioning columns
```

**Unique constraints (including primary keys) must include the partition key**, because each partition enforces uniqueness only within itself. The usual solution is a composite key:

```sql
CREATE TABLE payments (
  id       bigint GENERATED ALWAYS AS IDENTITY,
  paid_at  timestamptz NOT NULL,
  amount   numeric(10, 2) NOT NULL,
  PRIMARY KEY (id, paid_at)
) PARTITION BY RANGE (paid_at);
```

**Result:**

```text
CREATE TABLE
```

`id` values still come from one identity sequence, so they are unique in practice, but the database can only **guarantee** uniqueness of `(id, paid_at)`. Other points:

- **Indexes** defined on the parent are created on every partition; each partition's index is smaller and more likely to fit in memory.
- **Foreign keys referencing a partitioned table** must reference its full unique key (including the partition key). Many designs avoid foreign keys **to** huge event tables and keep them **from** partitioned tables to small reference tables.
- **Updating the partition key** moves the row to another partition (supported, but it is a delete plus an insert internally).
- **Too many partitions** slow down planning and use memory; hundreds are fine, tens of thousands are not. Monthly or weekly partitions for time series are typical; daily ones only at very high volumes.
- **Sub-partitioning** (for example, by month, then by hash) exists but multiplies the partition count — use it only when needed.

## Operating partitions

### Level 4 — Creating partitions ahead of time

Partitions must exist before data arrives. Options:

- A **scheduled job** that creates next month's partition well in advance ({{ch:cron-jobs}}), and detaches and archives partitions older than the retention period.
- The **pg_partman** extension, which automates creating, maintaining and retiring time- or id-based partitions, often driven by `pg_cron`.
- **Monitoring**: alert if the newest partition ends within, say, two weeks — missing partitions cause failed inserts, and a default partition quietly filling up causes slow queries later.

```sql
-- fragment
-- A maintenance job (run monthly) creating the partition two months ahead
DO $$
DECLARE
  start_date date := date_trunc('month', now() + interval '2 months');
  part_name  text := format('page_views_%s', to_char(start_date, 'YYYY_MM'));
BEGIN
  EXECUTE format('CREATE TABLE IF NOT EXISTS %I PARTITION OF page_views FOR VALUES FROM (%L) TO (%L)',
                 part_name, start_date, start_date + interval '1 month');
END $$;
```

### Level 4 — Converting an existing table

Turning a large existing table into a partitioned one cannot be done in place. Common approaches:

1. Create a new partitioned table with the same columns; create partitions.
2. Copy historical data in batches (or attach existing data as a partition: rename the old table, add a `CHECK` constraint matching a range so the attach is quick, and `ATTACH PARTITION` it as "everything before the cutover").
3. Write new data to the partitioned table (dual-write during the migration, or switch at a cutover moment with a short lock).
4. Swap names, update code, drop the old table — expand–contract again ({{ch:database-design}}).

## When to partition

### Level 4 — Signals and alternatives

Partitioning is worth it when **several** of these hold:

- the table is very large (hundreds of millions of rows or hundreds of gigabytes) and still growing;
- most queries filter on one column, usually time;
- old data must be removed or archived regularly (retention policies, privacy rules);
- maintenance (vacuum, reindex) on the whole table is becoming painful.

Before partitioning, consider:

- **Better indexes** — often the real fix for slow queries ({{ch:indexes}}).
- **Archiving** — moving old rows to a separate table or cheap storage, keeping the hot table small.
- **Summary tables** — querying pre-aggregated data instead of raw events ({{ch:normalization}}).
- **Purpose-built stores** — time-series databases (or TimescaleDB, which partitions automatically into "chunks"), columnar warehouses for analytics.

And remember the boundary: partitioning splits data **within one server**. When one server cannot handle the write volume or storage, the next step is **sharding** — partitioning across servers — with far greater complexity ({{ch:sharding}}).

## From beginner to enterprise

**Level 1–2 — understanding.** Knowing what partitions are; recognising time-series tables that may need them later.

**Level 3 — first partitioned tables.** Range partitions by month with indexes on the parent; checking pruning with `EXPLAIN`; dropping old partitions for retention; composite primary keys including the partition key.

**Level 4 — production operations.** Automated partition creation (pg_partman or scheduled jobs) with monitoring; concurrent detach; list and hash partitioning where appropriate; converting existing tables with minimal downtime.

**Level 5 — senior practice.** Choosing partition keys from query patterns; balancing partition count against planning cost; combining partitioning with archiving, summary tables and replicas.

**Level 6 — enterprises.** Partitioning as one layer of a data lifecycle — hot data in partitioned operational tables, warm data in archives, cold data in object storage and warehouses — with automated retention for compliance.

## Real-world use cases

### An audit log with seven-year retention

- **Design**: `audit_events` partitioned by month; indexes on `(entity_type, entity_id, occurred_at)` per partition; pg_partman creates partitions three months ahead; partitions older than seven years are detached, exported to object storage, and dropped.
- **Result**: queries for recent activity touch one or two partitions; retention is a monthly, millisecond operation instead of a multi-hour `DELETE`.

### Page-view analytics

- **Design**: raw `page_views` partitioned by week, kept for 90 days; a nightly job aggregates each completed day into `daily_page_stats`; dashboards query the small summary table; old raw partitions are dropped.

## Common mistakes

### Beginner: partitioning small tables

**Consequence:** complexity without benefit. **Fix:** indexes first; partition when size and retention demand it.

### Beginner: a partition key that common queries do not use

**Consequence:** every query scans every partition. **Fix:** choose the key from the main access pattern.

### Intermediate: forgetting to create future partitions

**Consequence:** inserts fail at midnight on the 1st. **Fix:** automated creation well ahead, with alerts.

### Intermediate: expecting a primary key on `id` alone

**Fix:** include the partition key in unique constraints.

### Intermediate: too many tiny partitions

**Consequence:** slow planning and high memory use. **Fix:** coarser partitions (monthly or weekly).

### Production: deleting old data with `DELETE`

**Consequence:** hours of work, bloat and replication load. **Fix:** detach and drop partitions.

### Production: a large, ever-growing default partition

**Fix:** monitor it; create proper partitions and move rows out.

## Debugging and troubleshooting

- **"no partition of relation … found for row"**: no partition covers the value — create the missing partition (or a default), and fix the automation.
- **Queries did not get faster after partitioning**: check `EXPLAIN` for pruning — the query may not filter on the partition key, or may wrap it in a function (`date(viewed_at) = …`) or compare with a different type.
- **"unique constraint on partitioned table must include all partitioning columns"**: add the partition key to the primary key or unique constraint.
- **Planning time is high**: too many partitions — consolidate, or make sure pruning applies at planning time.
- **Creating a partition fails because rows exist in the default partition**: move those rows out of the default (detach the default, create the partition, re-insert, reattach).

## Security summary

- Partitions inherit the parent's privileges for access through the parent, but **direct access to partitions** follows their own grants — keep permissions consistent and avoid granting access to individual partitions unless intended.
- **Retention by dropping partitions** supports privacy and compliance obligations — document and automate it.
- **Archived partitions** exported to storage contain the same sensitive data: encrypt them and control access.
- Row-level security policies must be considered on partitioned tables as on any table ({{ch:postgresql}}).

## How a senior engineer thinks about this

- **Partition for lifecycle and access patterns, not size alone.** Retention and time-filtered queries are the strongest reasons.
- **The partition key must match the queries.** Otherwise partitioning adds work.
- **Automate the calendar.** Future partitions, archiving and dropping run without anyone remembering.
- **Simpler tools first.** Indexes, archiving and summaries solve many "big table" problems.
- **Partitioning is not sharding.** It reorganises one server's data; scaling beyond one server is a different, larger decision.

## Exercises

These continue in the same session as the chapter's examples.

### Exercise 1 — Add next month and check pruning

**Objective:** practise creating partitions and verifying pruning.
**What to do:** create the December 2026 partition of `page_views`, insert one view on 5 December, and show with `EXPLAIN` that a query for December reads only that partition.

<details>
<summary>Show the solution</summary>

```sql
CREATE TABLE page_views_2026_12 PARTITION OF page_views FOR VALUES FROM ('2026-12-01') TO ('2027-01-01');
INSERT INTO page_views (viewed_at, path) VALUES ('2026-12-05 09:30+00', '/');
EXPLAIN (COSTS OFF) SELECT * FROM page_views WHERE viewed_at >= '2026-12-01' AND viewed_at < '2027-01-01';
```

**Result:**

```text
                                                                          QUERY PLAN
--------------------------------------------------------------------------------------------------------------------------------------------------------------
 Bitmap Heap Scan on page_views_2026_12 page_views
   Recheck Cond: ((viewed_at >= '2026-12-01 00:00:00+00'::timestamp with time zone) AND (viewed_at < '2027-01-01 00:00:00+00'::timestamp with time zone))
   ->  Bitmap Index Scan on page_views_2026_12_viewed_at_idx
         Index Cond: ((viewed_at >= '2026-12-01 00:00:00+00'::timestamp with time zone) AND (viewed_at < '2027-01-01 00:00:00+00'::timestamp with time zone))
(4 rows)
```

**Walkthrough:** the new partition received the index from the parent automatically, and the planner pruned October and November, scanning only `page_views_2026_12`. The earlier insert for January 2027 would still fail until a January partition exists.

</details>

### Exercise 2 — Choose the partitioning scheme

**Objective:** practise matching schemes to workloads.
**What to do:** choose a partitioning approach (or none) for: (1) chat messages queried by conversation and kept forever; (2) API request logs kept for 30 days; (3) a 2-million-row products table; (4) invoices queried mostly by month for reports and kept for 10 years; (5) a multi-tenant table where three huge tenants are as large as all others combined.

<details>
<summary>Show the solution</summary>

1. **Probably none at first** — queries are by conversation, not time; a good index on `(conversation_id, sent_at)` serves them. If the table becomes enormous, hash partitioning by `conversation_id` keeps partitions manageable (or move to a store designed for it).
2. **Range by day or week**, dropping partitions older than 30 days — retention is the main win.
3. **None** — 2 million rows is small for PostgreSQL; indexes are enough.
4. **Range by month (or year)** — reports prune to a month; old years can be archived as whole partitions.
5. **List partitioning by tenant** for the three large tenants (one partition each) plus a **default** or hash-partitioned remainder for everyone else — isolates their maintenance and queries. At much larger scale, this becomes a sharding decision ({{ch:sharding}}).

</details>

### Exercise 3 — Production scenario: the failed inserts on the 1st

**Objective:** practise diagnosing partition operations.
**The scenario:** at 00:00 UTC on 1 March, the application starts failing every insert into `events` with "no partition of relation events found for row". The maintenance job that creates partitions stopped working in January after a deployment. What do you do now, and how do you prevent it?

<details>
<summary>Show the solution</summary>

**Now:**
1. Create the March partition immediately (`CREATE TABLE events_2026_03 PARTITION OF events FOR VALUES FROM ('2026-03-01') TO ('2026-04-01')`), and April's too.
2. Replay or retry the failed events if the application buffered them or the queue retried them ({{ch:queues}}); otherwise, quantify the gap.
3. Fix the maintenance job (why did it stop? — check its logs, schedule and permissions).

**Prevent:**
- Create partitions further ahead (two or three months), so one failed run is harmless.
- Use pg_partman or a well-tested job, with **alerts** when the newest partition ends within a set period ({{ch:monitoring}}).
- Consider a default partition as a safety net — with an alert if it receives any rows.
- Add the partition check to the deployment smoke tests.

</details>

## Summary

**Partitioning** splits one large logical table into smaller physical **partitions** by a **partition key**, while queries still see one table. PostgreSQL's declarative partitioning supports **range** partitions (typically by time, with inclusive lower and exclusive upper bounds), **list** partitions (specific values, with an optional **default** partition) and **hash** partitions (even spreading by modulus and remainder). Rows are routed automatically; values with no matching partition are rejected unless a default exists.

The main benefits are **partition pruning** — queries filtering on the key touch only the relevant partitions — and painless **retention**: detaching and dropping a partition removes millions of rows in milliseconds without bloat or heavy replication traffic. Queries that do not filter on the key must scan every partition, so the key must match the important queries. **Unique constraints and primary keys must include the partition key**; indexes on the parent are created on every partition; foreign keys to partitioned tables need the full key; very large numbers of partitions slow planning.

Operating partitioned tables means creating future partitions ahead of time (scheduled jobs or **pg_partman**) with monitoring, detaching concurrently, and converting existing tables with expand–contract steps. Partition when tables are very large, queries filter on one column and data has a lifecycle; otherwise prefer indexes, archiving and summary tables. Partitioning reorganises data on **one** server — scaling across servers is **sharding**.

## Key terms

- **Table partitioning** — Splitting a large table into smaller physical partitions behind one logical table.
- **Partitioned table** — The logical parent table that holds no rows itself.
- **Partition** — A physical table holding the rows for part of the partition key's values.
- **Partition key** — The column or columns deciding which partition a row belongs to.
- **Range partitioning** — Partitioning by contiguous ranges of values, such as months.
- **List partitioning** — Partitioning by explicit lists of values.
- **Hash partitioning** — Spreading rows across a fixed number of partitions by a hash of the key.
- **Default partition** — A partition receiving rows that match no other partition.
- **Partition pruning** — The planner or executor skipping partitions that cannot contain matching rows.
- **Append node** — A plan step combining results from several partitions.
- **Detach partition** — Removing a partition from its parent so it becomes a standalone table.
- **Attach partition** — Adding an existing table to a partitioned table as a partition.
- **pg_partman** — A PostgreSQL extension that automates partition creation and retention.
- **Retention policy** — Rules defining how long data is kept before deletion or archiving.
- **Sub-partitioning** — Partitioning partitions further by another key.
- **TimescaleDB** — A PostgreSQL extension for time-series data that partitions tables automatically.

## What comes next

Partitioning keeps one server's tables manageable. When one server can no longer handle the writes or the data, the data itself must be split across many servers. The next chapter, {{ch:sharding}}, covers sharding: choosing shard keys, routing queries, rebalancing, cross-shard queries and transactions, and the tools and managed databases that make it practical.
