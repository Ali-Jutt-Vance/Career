# PostgreSQL

> [!GOALS]
> - Explain what PostgreSQL is, why it is the default choice for so many new systems, and how it works inside: processes, memory, the write-ahead log and MVCC.
> - Connect to PostgreSQL and find your way around with `psql`.
> - Organise data with databases and schemas, and secure it with **roles** and **privileges** following least privilege.
> - Use PostgreSQL's rich types well: `timestamptz`, `uuid`, enums, arrays, **JSONB**, **ranges** with exclusion constraints, and generated columns.
> - Add search with **full-text search** and fuzzy matching with trigrams.
> - Isolate tenants with **row-level security**.
> - Connect from Node.js correctly: pools, transactions, timeouts and **connection pooling** at scale.
> - Keep PostgreSQL healthy: vacuum, monitoring, configuration, backups and upgrades.

## Why this matters

{{ch:sql}} taught the language. This chapter is about the database you will most often speak it to. **PostgreSQL** ("Postgres") is an open-source relational database with more than thirty-five years of development behind it. It is the default choice for new back ends at startups and large companies alike, offered by every cloud provider (Amazon RDS and Aurora, Google Cloud SQL and AlloyDB, Azure, plus specialists such as Neon and Supabase), and consistently among the most loved databases in developer surveys.

Its popularity comes from being both **dependable** — strict about data correctness, with transactions, constraints and crash safety — and **versatile**: JSON documents, full-text search, geographic data, time series, vector embeddings for AI ({{ch:embeddings-and-vector-databases}}) and much more, often removing the need for a second database.

Knowing PostgreSQL beyond basic SQL is what lets you design tables that use its strengths, run it safely in production, keep it fast as data grows, and diagnose the problems every growing application meets: too many connections, slow queries, bloated tables, locks and failed backups. As with the previous chapter, every SQL result shown here is real PostgreSQL output.

## The simple idea

Think of PostgreSQL as a very careful library with a head librarian. Readers (connections) come in and ask for books (rows). Every change is first written in a **logbook** before the shelves are touched, so if the building loses power, the librarian replays the logbook and nothing committed is lost. When someone edits a book, the library does not erase the old copy immediately — it shelves a **new version**, so readers already looking at the old one are not disturbed. A cleaner (vacuum) later removes old copies nobody needs. And the librarian checks every reader's **library card** (role) to decide which rooms and shelves they may use.

> [!ANALOGY]
> PostgreSQL is like a careful library: every change is written in a logbook first (the write-ahead log), edits create new versions of books instead of overwriting them (MVCC), a cleaner removes versions nobody needs (vacuum), and library cards decide who may enter which rooms (roles and privileges).
>
> **Where the analogy breaks:** a library serves one reader per desk, and a few extra readers cost little. In PostgreSQL every connection is a separate operating-system process using real memory, so thousands of idle connections can exhaust a server — which is why applications share a small **pool** of connections instead of opening one per user.

## The proper definition and key words

**PostgreSQL** is an open-source, object-relational database management system that implements SQL, ACID transactions and multi-version concurrency control, and is extensible with custom types, functions and extensions.

Key words:

- **Cluster** (in PostgreSQL's sense) — one running server instance managing several **databases**.
- **Schema** — a namespace inside a database that groups tables and other objects (`public` by default).
- **Role** — a user or group that can own objects and be granted **privileges** (`SELECT`, `INSERT`, `UPDATE`…).
- **WAL** (write-ahead log) — the log of every change, written before data files, used for crash recovery and replication.
- **MVCC** (multi-version concurrency control) — keeping several versions of rows so readers and writers do not block each other.
- **Vacuum** — the process that cleans up old row versions and keeps statistics fresh.
- **Extension** — a package adding features to PostgreSQL (for example, `pg_trgm`, `postgis`, `pgvector`).
- **JSONB** — PostgreSQL's binary JSON type, indexable and queryable.
- **Row-level security (RLS)** — policies that limit which rows each role can see or change.
- **Connection pool** — a set of reusable open connections shared by an application.

## How PostgreSQL works inside

### Level 2 — Processes and memory

```text
  application ──TCP 5432──▶ postmaster (listens, starts one backend process per connection)
                                │
          ┌─────────────────────┼─────────────────────┐
          ▼                     ▼                     ▼
     backend (conn 1)     backend (conn 2)     backend (conn 3)    each: parses, plans, executes queries
          │                     │                     │
          └──────────── shared buffers (cached data pages in RAM) ────────────┘
                                │
     background workers: WAL writer · checkpointer · background writer · autovacuum
                                │
                 data files on disk            WAL files on disk
```

- Each connection gets its own **backend process**. Creating one takes time and memory, so connections should be reused through pools.
- **Shared buffers** cache table and index pages in memory; the operating system's file cache adds another layer.
- A **checkpointer** periodically writes changed pages from memory to the data files.
- **Autovacuum** workers clean up old row versions in the background.

### Level 3 — The write-ahead log: why committed data survives crashes

When a transaction commits, PostgreSQL does not immediately rewrite the table's data files — that would be slow and risky. It writes a compact description of the change to the **WAL** and makes sure the WAL reaches disk; only then does it report success. Changed data pages are written to the data files later. After a crash, PostgreSQL replays the WAL from the last checkpoint, so every committed transaction is restored and nothing half-done remains.

The WAL also powers **replication** (replicas replay the primary's WAL, {{ch:replication}}) and **point-in-time recovery** (restoring a backup and replaying archived WAL up to any moment).

### Level 3 — MVCC: readers do not block writers

When a row is updated, PostgreSQL writes a **new version** of the row and marks the old one as expired; a delete simply marks the row as expired. Each transaction sees a consistent **snapshot**: the versions that were committed when it (or its statement) began. So a long report keeps seeing consistent data while orders are updated at the same time, and neither waits for the other. Writers updating the **same** row still wait for each other ({{ch:transactions}}).

The cost of MVCC is **dead row versions**. Until vacuum removes them, they take space ("bloat") and slow down scans. Autovacuum handles this automatically in most systems; the trouble starts when it cannot keep up (very high write rates) or is blocked by **long-running transactions** that still might need old versions. A transaction left open for hours — an idle session in a GUI tool, a stuck job — prevents cleanup across the whole database. Monitoring for long transactions is part of running PostgreSQL.

## Connecting and finding your way around

### Level 1 — psql

`psql` is PostgreSQL's command-line client:

```bash
psql "postgresql://shop_app:secret@localhost:5432/cornershop"     # connection URL
psql -h localhost -U postgres -d cornershop                       # or separate options
```

Inside, SQL statements end with `;`, and **meta-commands** start with a backslash:

| Command | Does |
|---|---|
| `\l` | list databases |
| `\c cornershop` | connect to another database |
| `\dt` | list tables; `\dt+` with sizes |
| `\d orders` | describe a table: columns, indexes, constraints |
| `\di`, `\dv`, `\df` | list indexes, views, functions |
| `\du` | list roles |
| `\x` | toggle expanded output (one column per line) |
| `\timing` | show how long each statement takes |
| `\e` | edit the current query in your editor |
| `\q` | quit |

Graphical tools (DBeaver, pgAdmin, DataGrip, TablePlus) are fine for exploring; `psql` is always available on servers and in containers ({{ch:docker}}).

Applications usually connect with a **connection URL** — `postgresql://user:password@host:5432/database?sslmode=verify-full` — kept in configuration, never in code ({{ch:secrets-manager}}). Use TLS (`sslmode=verify-full` with the provider's certificate) for any connection that leaves the machine ({{ch:tls-ssl}}).

### Level 2 — Databases and schemas

A PostgreSQL server holds several **databases**; a connection is always to one database, and queries cannot join across databases. Inside a database, **schemas** are namespaces: `public.orders` and `reporting.orders` can coexist. Common uses: one schema per application module, a `reporting` schema for views used by analysts, or a schema per tenant in some multi-tenant designs.

## Roles and privileges

### Level 3 — Least privilege in practice

Every connection authenticates as a **role**. Superusers can do anything — so applications must **not** connect as superusers. A typical set-up:

- an **owner** role that owns the tables and runs migrations ({{ch:database-design}});
- an **application** role that can read and write data but not change the schema;
- a **read-only** role for reporting and support tools.

Let us set up the shop's tables and an application role:

```sql
CREATE TABLE customers (
  id      integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name    text NOT NULL,
  email   text NOT NULL UNIQUE
);
INSERT INTO customers (name, email) VALUES ('Sara Khan', 'sara@example.com'), ('Omar Ali', 'omar@example.com');

CREATE ROLE shop_app LOGIN;               -- in production: LOGIN PASSWORD '...' or IAM authentication
GRANT SELECT, INSERT, UPDATE ON customers TO shop_app;

CREATE ROLE shop_readonly LOGIN;
GRANT SELECT ON customers TO shop_readonly;
```

**Result:**

```text
GRANT
```

Now act as the application role (`SET ROLE` switches role within a session — handy for testing permissions):

```sql
SET ROLE shop_app;
UPDATE customers SET name = 'Sara K. Khan' WHERE id = 1;
```

**Result:**

```text
UPDATE 1
```

```sql
DELETE FROM customers WHERE id = 2;
```

**Result:**

```text
ERROR:  permission denied for table customers
```

```sql
DROP TABLE customers;
```

**Result:**

```text
ERROR:  must be owner of table customers
```

```sql
RESET ROLE;
```

**Result:**

```text
RESET
```

The application can update customers but cannot delete them or drop the table. If an attacker finds an SQL injection bug, or a buggy script runs the wrong statement, the damage is limited to what the role allows. In real systems, also grant `USAGE` on schemas and sequences as needed, set **default privileges** so future tables get the same grants (`ALTER DEFAULT PRIVILEGES ... GRANT ...`), and prefer short-lived credentials (for example, IAM database authentication on AWS, {{ch:rds}}).

## PostgreSQL's data types

### Level 2 — Time, identifiers and enums

- **`timestamptz`** stores an exact moment (internally in UTC) and displays it in the session's time zone. Use it for almost every timestamp. Plain `timestamp` (without time zone) has no zone at all — a common source of bugs.
- **`uuid`** stores 128-bit identifiers. `gen_random_uuid()` generates random (version 4) UUIDs; time-ordered UUIDs (version 7) insert more efficiently into indexes and are supported natively in newer PostgreSQL releases (`uuidv7()` from version 18). UUIDs suit public identifiers and ids generated outside the database; integer identities are smaller and faster ({{ch:database-design}}).
- **Enums** define a fixed set of values:

```sql
CREATE TYPE order_status AS ENUM ('paid', 'shipped', 'delivered', 'cancelled');

CREATE TABLE orders (
  id           integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  customer_id  integer NOT NULL REFERENCES customers (id),
  status       order_status NOT NULL DEFAULT 'paid',
  placed_at    timestamptz NOT NULL,
  details      jsonb NOT NULL DEFAULT '{}'
);

INSERT INTO orders (customer_id, status, placed_at, details) VALUES
  (1, 'delivered', '2026-09-02 10:00+00', '{"channel": "web",    "gift": true,  "coupon": "AUTUMN10", "tags": ["tea", "gift"]}'),
  (1, 'shipped',   '2026-10-14 18:20+00', '{"channel": "mobile", "gift": false, "tags": ["coffee"]}'),
  (2, 'paid',      '2026-10-30 09:45+00', '{"channel": "web",    "gift": false, "delivery": {"slot": "evening", "notes": "ring twice"}}');
```

**Result:**

```text
INSERT 0 3
```

A value outside the enum is rejected:

```sql
INSERT INTO orders (customer_id, status, placed_at) VALUES (2, 'returned', '2026-11-01 12:00+00');
```

**Result:**

```text
ERROR:  invalid input value for enum order_status: "returned"
```

Enums are compact and self-documenting; adding values is easy (`ALTER TYPE order_status ADD VALUE 'returned'`), but removing or renaming them is awkward. For values that change often, a `CHECK` constraint or a lookup table is more flexible.

### Level 3 — JSONB: documents inside tables

`jsonb` stores JSON in a parsed binary form you can query and index. It is ideal for data whose shape varies — order metadata, settings, event payloads, data from external APIs:

```sql
SELECT id,
       details ->> 'channel'                 AS channel,     -- ->> returns text
       details -> 'delivery' ->> 'slot'      AS slot,        -- -> returns jsonb, so it can be chained
       (details ->> 'gift')::boolean         AS gift,
       jsonb_array_length(coalesce(details -> 'tags', '[]')) AS tag_count
FROM orders
ORDER BY id;
```

**Result:**

```text
 id | channel |  slot   | gift | tag_count
----+---------+---------+------+-----------
  1 | web     |         | t    |         2
  2 | mobile  |         | f    |         1
  3 | web     | evening | f    |         0
(3 rows)
```

```sql
-- Containment: orders whose details include this JSON
SELECT id FROM orders WHERE details @> '{"channel": "web", "gift": true}';
```

**Result:**

```text
 id
----
  1
(1 row)
```

```sql
-- Key existence and array membership
SELECT id, details ->> 'coupon' AS coupon
FROM orders
WHERE details ? 'coupon' OR details -> 'tags' ? 'coffee'
ORDER BY id;
```

**Result:**

```text
 id |  coupon
----+----------
  1 | AUTUMN10
  2 |
(2 rows)
```

- **`->`** gets a JSON value; **`->>`** gets it as text; casts (`::boolean`, `::numeric`) convert values.
- **`@>`** tests containment; **`?`** tests whether a key (or array element) exists. Both can use a **GIN index** (`CREATE INDEX ON orders USING gin (details)`), keeping such queries fast on large tables ({{ch:indexes}}).
- Updates use functions such as `jsonb_set` or the `||` merge operator.

**When to use JSONB and when not.** Use real columns for data you filter, join, sort or constrain regularly — the customer, the status, the total. Use JSONB for genuinely variable or rarely queried details. A table that is "one id plus one JSONB column" gives up types, constraints and foreign keys, which is exactly what makes a relational database valuable. A JSON field you query constantly can be promoted to a **generated column** with an index:

```sql
ALTER TABLE orders ADD COLUMN channel text GENERATED ALWAYS AS (details ->> 'channel') STORED;
SELECT channel, count(*) FROM orders GROUP BY channel ORDER BY channel;
```

**Result:**

```text
 channel | count
---------+-------
 mobile  |     1
 web     |     2
(2 rows)
```

### Level 3 — Arrays

Columns can hold arrays of any type:

```sql
CREATE TABLE products (
  id      integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name    text NOT NULL,
  labels  text[] NOT NULL DEFAULT '{}'
);
INSERT INTO products (name, labels) VALUES
  ('Green Tea', '{organic,vegan}'), ('Oat Biscuits', '{vegan}'), ('Honey Flapjack', '{}');

SELECT name, labels, cardinality(labels) AS n
FROM products
WHERE 'vegan' = ANY (labels)
ORDER BY name;
```

**Result:**

```text
     name     |     labels      | n
--------------+-----------------+---
 Green Tea    | {organic,vegan} | 2
 Oat Biscuits | {vegan}         | 1
(2 rows)
```

Arrays are convenient for small lists of simple values (labels, a few phone numbers). For anything with its own attributes or relationships, use a separate table ({{ch:normalization}}).

### Level 4 — Ranges and exclusion constraints

**Range types** represent intervals: `int4range`, `numrange`, `daterange`, `tstzrange`. Combined with an **exclusion constraint**, they let the database guarantee that intervals never overlap — for example, that a delivery van is never booked twice for the same time:

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;     -- lets the constraint compare van_id with = in a GiST index

CREATE TABLE van_bookings (
  id      integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  van_id  integer NOT NULL,
  during  tstzrange NOT NULL,
  EXCLUDE USING gist (van_id WITH =, during WITH &&)
);

INSERT INTO van_bookings (van_id, during) VALUES
  (1, '[2026-11-20 09:00+00, 2026-11-20 11:00+00)'),
  (1, '[2026-11-20 11:00+00, 2026-11-20 13:00+00)'),     -- starts exactly when the first ends: fine
  (2, '[2026-11-20 10:00+00, 2026-11-20 12:00+00)');     -- different van: fine
```

**Result:**

```text
INSERT 0 3
```

```sql
INSERT INTO van_bookings (van_id, during) VALUES (1, '[2026-11-20 10:30+00, 2026-11-20 11:30+00)');
```

**Result:**

```text
ERROR:  conflicting key value violates exclusion constraint "van_bookings_van_id_during_excl"
```

- `[start, end)` includes the start and excludes the end, so back-to-back bookings do not overlap.
- `EXCLUDE USING gist (van_id WITH =, during WITH &&)` means: no two rows may have equal `van_id` **and** overlapping (`&&`) ranges.
- Doing this check in application code ("select overlapping bookings, then insert if none") has a race condition: two requests can both find no overlap and both insert. The constraint makes double-booking impossible, even under concurrency ({{ch:transactions}}).

## Searching text

### Level 3 — Full-text search

`LIKE '%word%'` is slow on large tables and knows nothing about language. PostgreSQL's **full-text search** turns text into a `tsvector` (normalised words, or **lexemes**) and searches with a `tsquery`:

```sql
CREATE TABLE articles (
  id     integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title  text NOT NULL,
  body   text NOT NULL,
  search tsvector GENERATED ALWAYS AS (
           setweight(to_tsvector('english', title), 'A') || setweight(to_tsvector('english', body), 'B')
         ) STORED
);
INSERT INTO articles (title, body) VALUES
  ('Brewing green tea',      'Use water below boiling. Green teas turn bitter when brewed too hot.'),
  ('Choosing coffee beans',  'Light roasts keep fruity flavours; dark roasts taste bitter and smoky.'),
  ('Tea for beginners',      'Start with a breakfast tea, then try green and oolong teas.');

SELECT title, ts_rank(search, query) AS rank
FROM articles, websearch_to_tsquery('english', 'green teas') AS query
WHERE search @@ query
ORDER BY rank DESC;
```

**Result:**

```text
       title       |   rank
-------------------+-----------
 Brewing green tea | 0.9988176
 Tea for beginners |  0.720979
(2 rows)
```

```sql
SELECT to_tsvector('english', 'Green teas turn bitter when brewed') AS lexemes;
```

**Result:**

```text
                    lexemes
------------------------------------------------
 'bitter':4 'brew':6 'green':1 'tea':2 'turn':3
(1 row)
```

- `to_tsvector('english', ...)` lower-cases, removes common words ("when"), and reduces words to stems ("teas" → "tea", "brewed" → "brew"), recording positions.
- `websearch_to_tsquery` accepts search-box syntax (quotes for phrases, `-word` to exclude); `@@` matches a vector against a query.
- `setweight` marks title words as more important (A) than body words (B), so `ts_rank` puts the article with "green tea" in its **title** first.
- The `search` column is **generated** from title and body, so it never goes stale; a GIN index on it makes searches fast.

PostgreSQL's built-in search covers many applications' needs. Dedicated search engines (Elasticsearch, OpenSearch, Meilisearch, Typesense) add typo tolerance, facets and relevance tuning at larger scale.

### Level 3 — Fuzzy matching with trigrams

The `pg_trgm` extension compares strings by their three-letter fragments, which handles typos — useful for "did you mean…?" and searching names:

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;

SELECT name, round(similarity(name, 'oat biscits')::numeric, 2) AS score
FROM products
WHERE name % 'oat biscits'           -- % means "similar enough" (default threshold 0.3)
ORDER BY score DESC;
```

**Result:**

```text
     name     | score
--------------+-------
 Oat Biscuits |  0.67
(1 row)
```

A GIN or GiST index with `gin_trgm_ops` also speeds up `LIKE '%…%'` and `ILIKE` searches on large tables.

## Row-level security

### Level 4 — Policies that filter rows

In a multi-tenant application, every query must be limited to the current tenant or user. Forgetting one `WHERE tenant_id = ...` leaks another customer's data. **Row-level security** adds the filter in the database, for every query:

```sql
CREATE TABLE notes (
  id        integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  shop_id   integer NOT NULL,
  body      text NOT NULL
);
INSERT INTO notes (shop_id, body) VALUES (1, 'Order more green tea'), (1, 'Van 2 needs a service'), (2, 'Holiday hours from Monday');

ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY notes_by_shop ON notes
  USING (shop_id = current_setting('app.shop_id', true)::integer)
  WITH CHECK (shop_id = current_setting('app.shop_id', true)::integer);
GRANT SELECT, INSERT ON notes TO shop_app;
```

**Result:**

```text
GRANT
```

```sql
SET ROLE shop_app;
SET app.shop_id = '1';
SELECT id, shop_id, body FROM notes ORDER BY id;     -- no WHERE clause at all
```

**Result:**

```text
 id | shop_id |         body
----+---------+-----------------------
  1 |       1 | Order more green tea
  2 |       1 | Van 2 needs a service
(2 rows)
```

```sql
INSERT INTO notes (shop_id, body) VALUES (2, 'Sneaky note for another shop');
```

**Result:**

```text
ERROR:  new row violates row-level security policy for table "notes"
```

```sql
RESET ROLE;
```

**Result:**

```text
RESET
```

- The `USING` expression filters which rows the role can see (and update or delete); `WITH CHECK` controls which rows it may write.
- The application sets `app.shop_id` at the start of each request or transaction (for example, `SELECT set_config('app.shop_id', $1, true)` inside the transaction, so it resets automatically).
- Even a query with no `WHERE` clause returns only shop 1's notes, and writing a note for shop 2 is refused.
- Policies do not apply to superusers or (by default) to the table's owner — another reason the application must connect as a separate, non-owner role. `ALTER TABLE ... FORCE ROW LEVEL SECURITY` applies policies to the owner too.

RLS is a strong safety net for multi-tenant systems (it is central to platforms such as Supabase). It does not replace authorisation in the application; it backs it up ({{ch:authentication}}).

## Connecting from Node.js

### Level 3 — Pools, transactions and timeouts

With the `pg` driver, an application creates **one pool** at start-up and reuses it:

```ts
// fragment
import { Pool } from "pg";

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,                                  // connections per application instance
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,           // fail fast if the pool is exhausted
  statement_timeout: 10_000,                // the server cancels queries running longer than 10 s
  application_name: "cornershop-api",       // shows up in pg_stat_activity
});

export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
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
    client.release();                       // always return the connection to the pool
  }
}
```

- **`pool.query()`** borrows a connection for one statement and returns it automatically.
- A **transaction** must run on **one** connection, so it uses `pool.connect()`, `BEGIN` … `COMMIT`/`ROLLBACK`, and must always `release()` — a leaked connection is never returned, and after `max` leaks the application stops.
- **Timeouts** stop one slow query or a stuck lock from holding connections for ever ({{ch:error-handling}}).
- Most teams use an ORM or query builder on top of the driver ({{ch:orms}}), but the pool and transaction rules are the same.

### Level 4 — Connection limits and poolers

Each connection is a process, and servers allow a limited number (`max_connections`, often 100–500). Twenty application instances with pools of 20, plus workers and tools, can exceed it — and serverless functions, which may run hundreds of instances, make it much worse ({{ch:lambda}}).

The fix is a **connection pooler** between the applications and PostgreSQL: **PgBouncer**, or managed equivalents such as Amazon RDS Proxy and the poolers built into Supabase and Neon. In **transaction pooling** mode, thousands of client connections share a few dozen server connections, each borrowed only for the length of a transaction. The trade-off: session-level features (session `SET`, temporary tables, some prepared-statement uses, `LISTEN`) do not work as expected, because consecutive transactions may run on different server connections — another reason to set per-request values with `set_config(..., true)` inside the transaction.

## Running PostgreSQL in production

### Level 4 — Configuration essentials

A few settings matter most (managed services choose sensible defaults; check them anyway):

- **`shared_buffers`** — PostgreSQL's own cache; commonly about a quarter of RAM.
- **`work_mem`** — memory per sort or hash operation; too low causes sorts on disk, too high with many connections exhausts memory.
- **`max_connections`** — keep it moderate and use a pooler.
- **`statement_timeout`**, **`idle_in_transaction_session_timeout`** and **`lock_timeout`** — stop runaway queries, forgotten open transactions and long lock waits.
- **Autovacuum settings** — more aggressive for large, busy tables.

### Level 4 — Extensions

Extensions are a large part of PostgreSQL's strength:

| Extension | Adds |
|---|---|
| `pg_stat_statements` | Statistics on every query: calls, total and mean time — the first place to look for slow queries ({{ch:query-optimization}}) |
| `pg_trgm` | Trigram similarity and fast `LIKE '%…%'` |
| `btree_gist` | Equality in GiST indexes (exclusion constraints with ids) |
| `postgis` | Geographic types and queries (distance, areas, routes) |
| `pgvector` | Vector similarity search for embeddings ({{ch:embeddings-and-vector-databases}}) |
| `pgcrypto` | Cryptographic functions |
| `pg_cron` | Scheduled jobs inside the database ({{ch:cron-jobs}}) |
| `timescaledb` | Time-series storage and functions |

Managed services support a curated list; check before relying on one.

### Level 4 — Monitoring

Built-in views answer most operational questions:

```sql
-- fragment
-- What is running right now, and for how long?
SELECT pid, usename, application_name, state, now() - xact_start AS in_transaction, left(query, 60) AS query
FROM pg_stat_activity
WHERE state <> 'idle'
ORDER BY in_transaction DESC NULLS LAST;

-- Which queries take the most total time? (needs pg_stat_statements)
SELECT calls, round(total_exec_time) AS total_ms, round(mean_exec_time, 1) AS mean_ms, left(query, 80) AS query
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 10;

-- Which tables have many dead rows, and when were they last vacuumed?
SELECT relname, n_live_tup, n_dead_tup, last_autovacuum
FROM pg_stat_user_tables
ORDER BY n_dead_tup DESC
LIMIT 10;
```

Watch these continuously with a monitoring system: connections in use, transaction rate, slow queries, replication lag, disk space, dead tuples, cache hit ratio and the age of the oldest transaction ({{ch:monitoring}}). Turn on logging of slow statements (`log_min_duration_statement`) and lock waits.

### Level 4 — Backups and upgrades

- **Logical backups** with `pg_dump` (and `pg_restore`) export a database as SQL or a compact archive — good for smaller databases, copies between environments and long-term archives.
- **Physical backups** copy the data files (`pg_basebackup`, or tools such as pgBackRest and Barman) and, together with **archived WAL**, allow **point-in-time recovery**: restore to any second, for example to just before a bad `DELETE`.
- **Managed services** take automated snapshots and keep WAL for point-in-time recovery; you choose the retention period ({{ch:rds}}).
- **A backup you have never restored is not a backup.** Regularly restore into a test environment and check the data — automatically, if possible.
- **Major version upgrades** (for example, 16 to 18) need `pg_upgrade`, a dump and restore, or logical replication to a new server; managed services offer guided upgrades. Test applications against the new version first. Minor versions (18.0 to 18.1) are bug and security fixes — apply them promptly.

## From beginner to enterprise

**Level 1–2 — first PostgreSQL.** Running PostgreSQL locally (often in Docker); `psql` basics; databases, schemas and tables; `timestamptz`, identities and constraints.

**Level 3 — application developer.** A non-superuser application role with least privilege; JSONB used deliberately; arrays, enums and generated columns; full-text search and trigrams; a pooled, timeout-protected connection from Node.js; correct transactions.

**Level 4 — production owner.** Exclusion constraints and RLS for correctness and isolation; a connection pooler; key configuration settings; monitoring with `pg_stat_activity`, `pg_stat_statements` and dead-row statistics; tested backups with point-in-time recovery; planned upgrades.

**Level 5 — database-aware senior engineer.** Diagnosing locks, bloat and slow queries; tuning autovacuum for hot tables; read replicas for reporting ({{ch:replication}}); partitioning large tables ({{ch:partitioning}}); safe migrations on big tables.

**Level 6 — enterprises.** High-availability clusters with automatic failover; cross-region replicas and disaster recovery; logical replication and change-data capture feeding other systems ({{ch:event-driven-systems}}); fleet-wide management of many databases; compliance controls (encryption, auditing, access reviews).

## Real-world use cases

### Bookings that can never overlap

- **Problem**: delivery slots double-booked when two staff members booked at the same moment.
- **Solution**: a `tstzrange` column with an exclusion constraint per van; the application catches the constraint error and shows "that slot was just taken". No race condition, no locking code.

### A multi-tenant shop platform

- **Design**: every tenant-owned table has `shop_id`; RLS policies on each; the API sets `app.shop_id` inside each transaction from the authenticated user; unique constraints include `shop_id` (`UNIQUE (shop_id, sku)`); indexes start with `shop_id`; a test suite tries to read across shops and must get nothing.

## Common mistakes

### Beginner: connecting the application as a superuser

**Fix:** separate owner, application and read-only roles with minimal privileges.

### Beginner: `timestamp` without time zone

**Fix:** `timestamptz` for moments in time.

### Beginner: a new connection per request

**Fix:** one pool per application instance; a pooler for many instances or serverless.

### Intermediate: leaking pool connections

**Consequence:** the application hangs once all connections are leaked. **Fix:** release in `finally`; use helpers like `withTransaction`.

### Intermediate: JSONB for everything

**Consequence:** lost types, constraints and foreign keys; awkward queries. **Fix:** columns for core data, JSONB for variable details.

### Intermediate: checking overlaps or uniqueness only in application code

**Consequence:** race conditions. **Fix:** unique and exclusion constraints.

### Production: long-running or idle-in-transaction sessions

**Consequence:** vacuum blocked, bloat, held locks. **Fix:** timeouts; monitoring the oldest transaction.

### Production: untested backups

**Fix:** automated restore tests; point-in-time recovery enabled and rehearsed.

## Debugging and troubleshooting

- **"sorry, too many clients already"** / **"remaining connection slots are reserved"**: connection limit reached — check `pg_stat_activity` for idle or leaked connections; reduce pool sizes; add a pooler.
- **"permission denied for table …"**: the role lacks a grant — also check schema `USAGE`, sequence privileges and default privileges for newly created tables.
- **Queries hang**: probably waiting for a lock — look in `pg_stat_activity` for `wait_event_type = 'Lock'` and use `pg_blocking_pids(pid)` to find the blocker, often an idle transaction.
- **Table and index sizes keep growing although row counts do not**: bloat from dead rows — check `n_dead_tup`, long transactions and autovacuum activity.
- **RLS returns no rows**: the setting (`app.shop_id`) was not set in this transaction or connection — common with transaction poolers when it was set with a session-level `SET`.
- **JSONB query is slow**: the operator cannot use the index (`->>` comparisons need an expression index; `@>` and `?` use GIN).

## Security summary

- **Least-privilege roles**: no superuser applications; separate owner, application and read-only roles; default privileges for new objects.
- **Encrypt connections** with TLS and verify the server certificate; restrict network access to the database (private networks, security groups, {{ch:vpc}}).
- **Secrets** in a secrets manager; prefer short-lived or IAM-based credentials; rotate passwords.
- **Row-level security** as a safety net for multi-tenant data.
- **Constraints** (unique, check, exclusion, foreign keys) to keep data valid under every access path.
- **Timeouts** to limit damage from runaway or malicious queries.
- **Encrypted, tested backups** with access restricted; audit logging for sensitive data where required.
- Keep PostgreSQL **patched** with minor releases.

## How a senior engineer thinks about this

- **Use the database's guarantees.** Constraints, exclusion constraints and RLS enforce rules that application code can only hope to enforce.
- **Connections are expensive; transactions should be short.** Pools, poolers and timeouts are part of the design.
- **MVCC has a cost.** They watch long transactions, dead rows and autovacuum before they become incidents.
- **One good database before many databases.** PostgreSQL's JSONB, search, extensions and vectors often avoid adding new systems — until scale or requirements truly demand them.
- **Backups exist only when restores are tested.** Recovery time and data loss limits are planned, not hoped for.

## Exercises

These continue in the same session as the examples above.

### Exercise 1 — Query JSONB

**Objective:** practise JSONB operators.
**What to write:** list every order whose details contain a delivery slot, showing the order id, the slot and the delivery notes.

<details>
<summary>Show the solution</summary>

```sql
SELECT id,
       details -> 'delivery' ->> 'slot'  AS slot,
       details -> 'delivery' ->> 'notes' AS notes
FROM orders
WHERE details -> 'delivery' ? 'slot'
ORDER BY id;
```

**Result:**

```text
 id |  slot   |   notes
----+---------+------------
  3 | evening | ring twice
(1 row)
```

**Walkthrough:** `details -> 'delivery'` returns the nested object (or `NULL` when missing); `? 'slot'` keeps only objects that contain the key; `->>` extracts the values as text. An equivalent filter is `WHERE details @> '{"delivery": {}}'` combined with a check for the slot key.

</details>

### Exercise 2 — Prevent overlapping shop opening hours

**Objective:** practise ranges and exclusion constraints.
**What to build:** a table `staff_shifts` for staff ids and time ranges where the same staff member can never have overlapping shifts. Insert two valid shifts for staff 7 and show that an overlapping one is rejected.

<details>
<summary>Show the solution</summary>

```sql
CREATE TABLE staff_shifts (
  staff_id  integer   NOT NULL,
  shift     tstzrange NOT NULL CHECK (NOT isempty(shift)),
  EXCLUDE USING gist (staff_id WITH =, shift WITH &&)
);
INSERT INTO staff_shifts VALUES
  (7, '[2026-11-21 08:00+00, 2026-11-21 12:00+00)'),
  (7, '[2026-11-21 13:00+00, 2026-11-21 17:00+00)');
```

**Result:**

```text
INSERT 0 2
```

```sql
INSERT INTO staff_shifts VALUES (7, '[2026-11-21 11:00+00, 2026-11-21 14:00+00)');
```

**Result:**

```text
ERROR:  conflicting key value violates exclusion constraint "staff_shifts_staff_id_shift_excl"
```

**Walkthrough:** the two valid shifts are inserted, and the third is refused because 11:00–14:00 overlaps both existing shifts. Run the overlapping insert as its own statement: if several statements are sent together in one batch, they run in one implicit transaction, and an error undoes all of them. The `CHECK (NOT isempty(shift))` rejects empty ranges such as `[10:00, 10:00)`.

</details>

### Exercise 3 — Design the roles

**Objective:** practise least privilege.
**What to do:** the shop has: an API service, a background worker that sends emails and updates order statuses, analysts who need reporting access to orders but not customers' emails, and a migration process run by CI. Design roles and privileges.

<details>
<summary>Show the solution</summary>

| Role | Privileges | Notes |
|---|---|---|
| `shop_owner` | Owns all tables, schemas and sequences; runs migrations | `LOGIN` only for the CI migration job; credentials only in CI's secrets |
| `shop_app` (API) | `SELECT, INSERT, UPDATE` on application tables; `DELETE` only where the product needs it; `USAGE` on sequences | Not the owner, so RLS applies; no DDL |
| `shop_worker` | `SELECT` on orders and customers' contact fields; `UPDATE (status)` on orders only (column-level grant) | Separate credentials and connection limits |
| `analyst` | `SELECT` on a `reporting` schema of views that exclude or mask personal data (no email column) | Connects to a read replica; `statement_timeout` set for the role |
| `readonly_support` | `SELECT` on specific tables for support investigations | Access logged; granted to named people through a group role |

Also: `ALTER DEFAULT PRIVILEGES FOR ROLE shop_owner ... GRANT ...` so new tables get the right grants automatically; no role except the owner can create objects in the schema (`REVOKE CREATE ON SCHEMA public FROM PUBLIC`).

</details>

### Exercise 4 — Production scenario: "the database is slow and full"

**Objective:** practise PostgreSQL operations.
**The scenario:** on Monday morning, API latency is high, the database's disk usage has grown 40% in a week although the number of orders grew 3%, and some requests fail with "remaining connection slots are reserved". Describe your investigation and fixes.

<details>
<summary>Show the solution</summary>

1. **Connections**: query `pg_stat_activity` grouped by `application_name` and `state`. Many `idle in transaction` sessions point to leaked transactions (code paths that never commit or roll back) or a tool left open; many `idle` connections point to oversized pools across many instances.
2. **Old transactions**: find the oldest `xact_start`. A transaction open since last week would explain the disk growth: it prevents vacuum from removing dead rows anywhere in the database.
3. **Bloat**: check `pg_stat_user_tables` for `n_dead_tup` and last vacuum times; check table and index sizes for the tables that grew.
4. **Immediate fixes**: terminate the stuck sessions (`pg_terminate_backend(pid)`) after identifying their owners; let autovacuum catch up (or run `VACUUM` manually on the worst tables); reduce pool sizes or deploy a pooler.
5. **Slow queries**: check `pg_stat_statements` for queries whose time grew — bloated tables and stale statistics make plans worse; run `ANALYZE` where needed.
6. **Prevention**: set `idle_in_transaction_session_timeout` and `statement_timeout`; fix the code that leaks transactions (always release in `finally`); alerts on oldest transaction age, connection usage and dead tuples; tune autovacuum for the busiest tables; capacity alerts on disk.

</details>

## Summary

**PostgreSQL** is an open-source relational database valued for correctness and versatility. Inside, a **postmaster** starts one **backend process** per connection; **shared buffers** cache data; every change is written to the **write-ahead log** before data files, so committed transactions survive crashes and can be replicated or recovered to a point in time. **MVCC** keeps multiple row versions so readers and writers do not block each other, at the cost of dead rows that **(auto)vacuum** must clean — and long-running transactions prevent that cleanup.

Connect with `psql` or a connection URL over TLS; organise objects in **databases** and **schemas**; and secure them with **roles** and **privileges** — separate owner, application and read-only roles, never a superuser application. PostgreSQL's types reward use: **`timestamptz`** for moments, `uuid` and identities for keys, enums for fixed sets, **JSONB** for variable details (with `->`, `->>`, `@>`, `?` and GIN indexes) alongside real columns for core data, **arrays** for small lists, **generated columns**, and **ranges** with **exclusion constraints** that make overlaps impossible. **Full-text search** with weighted `tsvector`s and `pg_trgm` similarity cover many search needs, and **row-level security** filters every query by tenant as a safety net.

From Node.js, use one **pool** per instance, run transactions on a single connection that is always released, and set timeouts; at scale, add a **connection pooler** such as PgBouncer and avoid session-level state. In production, tune key settings, use extensions such as `pg_stat_statements`, monitor activity, slow queries and dead rows, keep tested **backups** with point-in-time recovery, and plan upgrades.

## Key terms

- **PostgreSQL** — An open-source object-relational database with strong correctness guarantees and extensibility.
- **psql** — PostgreSQL's command-line client.
- **Meta-command** — A `psql` command starting with a backslash, such as `\dt`.
- **Database cluster** — One PostgreSQL server instance managing several databases.
- **Schema (PostgreSQL)** — A namespace grouping tables and other objects within a database.
- **Role** — A PostgreSQL user or group that can log in, own objects and receive privileges.
- **Privilege** — Permission to perform an action on an object, granted with `GRANT`.
- **Superuser** — A role that bypasses all permission checks.
- **Default privileges** — Grants applied automatically to objects created in the future.
- **Backend process** — The server process handling one client connection.
- **Shared buffers** — PostgreSQL's shared memory cache of data pages.
- **Write-ahead log (WAL)** — The log of changes written before data files, used for recovery and replication.
- **Checkpoint** — The moment when changed pages are flushed to data files, limiting how much WAL replay recovery needs.
- **MVCC** — Multi-version concurrency control: keeping row versions so transactions see consistent snapshots.
- **Dead tuple** — An obsolete row version left by an update or delete.
- **Vacuum / autovacuum** — The process that removes dead row versions and updates statistics.
- **Bloat** — Wasted space in tables and indexes caused by dead rows.
- **JSONB** — PostgreSQL's binary JSON data type, queryable and indexable.
- **GIN index** — An index type suited to values containing many elements, such as JSONB, arrays and text search vectors.
- **Generated column** — A column whose value is computed from other columns.
- **Enum type** — A data type with a fixed, ordered set of values.
- **Range type** — A data type representing an interval, such as a time range.
- **Exclusion constraint** — A constraint preventing rows whose values conflict under given operators, such as overlapping ranges.
- **Full-text search** — Searching natural-language text using normalised word stems and ranking.
- **tsvector / tsquery** — The processed document and search query types used by full-text search.
- **Trigram (pg_trgm)** — Three-character fragments used to measure string similarity.
- **Row-level security (RLS)** — Policies restricting which rows a role can see or modify.
- **Connection pool** — A set of reusable connections shared within an application.
- **Connection pooler** — A separate service such as PgBouncer that multiplexes many client connections onto few server connections.
- **Point-in-time recovery (PITR)** — Restoring a database to any moment using a base backup and archived WAL.
- **pg_stat_statements** — An extension that records execution statistics for every query.

## What comes next

Knowing PostgreSQL's features is half of the story; the other half is deciding what tables to create in the first place. The next chapter, {{ch:database-design}}, covers designing a database: modelling entities and relationships, choosing keys, representing one-to-many and many-to-many relationships, deciding what constraints to add, handling deletion, history and money, and evolving a schema safely with migrations.
