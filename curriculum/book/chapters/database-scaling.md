# Scaling Databases

> [!GOALS]
> - Follow the **scaling ladder** for relational databases, from query fixes to sharding, and know why each step comes in that order.
> - Use **read replicas** with read/write splitting and **read-your-writes** consistency.
> - Manage connections at scale with pooling and proxies.
> - Choose partitioning and **sharding** strategies, shard keys and ways to handle large tenants and cross-shard queries.
> - Understand **distributed SQL** and NoSQL options, and plan migrations between stages without downtime.

## Why this matters

Application servers are easy to scale: they are stateless, so you add more ({{ch:scalability}}). Databases are hard: they hold **state** that must stay correct, durable and consistent. Most large systems hit their database limits first — CPU saturated by queries, too many connections, write volume beyond one primary, tables too large to index and back up quickly.

The chapters in Part VIII explained the techniques — indexes ({{ch:indexes}}), query optimisation ({{ch:query-optimization}}), replication ({{ch:replication}}), partitioning ({{ch:partitioning}}), sharding ({{ch:sharding}}). This chapter puts them together as **system design** decisions: which step to take next, what it costs, and how to move between steps without stopping the business.

## The simple idea

A growing restaurant's kitchen goes through stages. First, cook smarter (better recipes, prepared ingredients). Then buy a bigger stove. Then add assistant cooks who only plate dishes the head chef has prepared (copies for reading). Only when one kitchen truly cannot cope does it open a second kitchen — and then every order must be sent to the right one, and a dish needing ingredients from both kitchens becomes complicated.

> [!ANALOGY]
> Scaling a database is like growing a restaurant kitchen: cook smarter, buy a bigger stove, add helpers for plating, and only open a second kitchen when one truly cannot cope.
>
> **Where the analogy breaks:** customers do not notice which kitchen cooked their meal. In a sharded database, queries that need data from several "kitchens" — reports, searches, joins across customers — become slower and harder, and moving a customer between kitchens is a careful migration. The second kitchen changes how the whole restaurant works.

## The proper definition and key words

**Database scaling** is increasing a database system's capacity for queries, writes, connections and data volume, while preserving correctness and acceptable latency.

Key words:

- **Scale up** — a larger database server.
- **Read replica** — an asynchronously updated copy serving reads.
- **Replication lag** — how far a replica is behind the primary.
- **Read/write splitting** — sending writes to the primary and reads to replicas.
- **Read-your-writes consistency** — a user always sees their own recent writes.
- **Connection pooler** — a proxy sharing a few database connections among many clients (PgBouncer, RDS Proxy).
- **Partitioning** — splitting a table into parts within one database.
- **Sharding** — splitting data across several independent databases by a **shard key**.
- **Directory-based sharding** — a lookup table mapping keys to shards.
- **Scatter-gather** — a query sent to every shard and combined.
- **Distributed SQL** — databases that shard and replicate automatically while offering SQL and transactions (Aurora Limitless, CockroachDB, Spanner, YugabyteDB).
- **CQRS** — separate models for writes and reads.

## The scaling ladder

### Level 1 — Climb one step at a time

```text
 1. fix queries and indexes            — usually the biggest win, cheapest
 2. connection pooling                 — protects the database from too many clients
 3. caching                            — removes repeated reads
 4. scale up                           — a bigger instance: simple, limited
 5. read replicas                      — scale reads; lag to manage
 6. partition large tables             — faster maintenance and queries on recent data
 7. move work out: queues, search, analytics stores
 8. functional split                   — separate databases per service or domain
 9. sharding / distributed SQL         — scale writes and data beyond one machine
```

Each step is more complex than the one before. Many very successful products never go past step 6. Measure first: if the database's CPU is consumed by three bad queries, a bigger instance just postpones the problem, and sharding would be a costly mistake.

### Level 2 — Queries, pooling, caching and bigger machines

- **Queries**: find the top queries by total time (`pg_stat_statements`, Performance Insights); add or fix indexes; remove N+1 query patterns from ORMs ({{ch:orms}}); paginate with keysets instead of large offsets.
- **Pooling**: each PostgreSQL connection is a process; hundreds of application instances or serverless functions each opening pools can exhaust it. Put PgBouncer or RDS Proxy in front and keep per-instance pools small ({{ch:rds}}).
- **Caching**: cache-aside for read-heavy data ({{ch:caching-at-scale}}).
- **Scale up**: modern instances have hundreds of gigabytes of memory; a working set that fits in memory makes PostgreSQL fast. It is often the right move — with a plan for the next step.

## Scaling reads

### Level 3 — Read replicas and read-your-writes

Replicas multiply read capacity, but they are slightly **behind** the primary. A user who saves their profile and immediately reloads it from a replica may see the old version — confusing, and a source of bug reports. A common fix routes a user's reads to the primary for a short time after they write:

```ts
// 1. Read/write splitting with "read your own writes": after a user writes, send their reads
//    to the primary until replicas have certainly caught up.
let now = 0;                                       // milliseconds, a fake clock
const replicaLagMs = 800;                          // measured lag, plus a safety margin in real systems
const lastWriteAt = new Map<string, number>();

function route(userId: string, kind: "read" | "write"): string {
  if (kind === "write") { lastWriteAt.set(userId, now); return "primary"; }
  const wrote = lastWriteAt.get(userId);
  return wrote !== undefined && now - wrote < replicaLagMs ? "primary (recent write)" : "replica";
}
const steps: [number, string, "read" | "write"][] = [
  [0, "sara", "read"], [100, "sara", "write"], [150, "sara", "read"], [150, "ali", "read"], [1000, "sara", "read"],
];
for (const [t, user, kind] of steps) { now = t; console.log(`t=${String(t).padStart(4)}ms ${user.padEnd(4)} ${kind.padEnd(5)} -> ${route(user, kind)}`); }

// 2. Sharding by tenant with a directory: most tenants are hashed, one huge tenant gets its own shard
const shards = ["shard-1", "shard-2", "shard-3", "shard-4"];
const directory = new Map<string, string>([["tenant-megastore", "shard-dedicated-1"]]);   // explicit placements
const hashCode = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
function shardFor(tenant: string): string {
  return directory.get(tenant) ?? shards[hashCode(tenant) % shards.length]!;
}
for (const t of ["tenant-0001", "tenant-0002", "tenant-0003", "tenant-megastore"]) console.log(`${t.padEnd(17)} -> ${shardFor(t)}`);

// A query that needs every tenant (a global report) must ask every shard: "scatter-gather"
const ordersPerShard: Record<string, number> = { "shard-1": 120_400, "shard-2": 118_900, "shard-3": 121_250, "shard-4": 119_700, "shard-dedicated-1": 610_000 };
const total = Object.values(ordersPerShard).reduce((a, b) => a + b, 0);
console.log(`global order count needs ${Object.keys(ordersPerShard).length} queries: ${total.toLocaleString("en-GB")} orders`);
```

**Output:**

```text
t=   0ms sara read  -> replica
t= 100ms sara write -> primary
t= 150ms sara read  -> primary (recent write)
t= 150ms ali  read  -> replica
t=1000ms sara read  -> replica
tenant-0001       -> shard-2
tenant-0002       -> shard-3
tenant-0003       -> shard-4
tenant-megastore  -> shard-dedicated-1
global order count needs 5 queries: 1,090,250 orders
```

The first five lines show the routing (the rest are discussed under sharding below):

- Sara's read just after her write went to the **primary**; Ali, who wrote nothing, read from a **replica**; after the lag window, Sara returned to replicas.
- The window must exceed real replication lag, which varies — **monitor lag** and stop using a replica that falls too far behind.
- Alternatives: reading from the primary for specific screens after writes; passing the write's log position and waiting for a replica to reach it; or sending all reads that require fresh data (balances, stock at checkout) to the primary always ({{ch:distributed-systems}}).
- Replicas also serve **analytics and reports** so heavy queries do not slow the primary — or move those to a separate analytics store fed by change data capture.

## Scaling writes and data

### Level 3 — Partitioning, offloading and functional splits

- **Partition** big, time-based tables (orders, events, logs) by month: queries on recent data scan small partitions, and old data is dropped or archived by detaching a partition instead of slow deletes ({{ch:partitioning}}).
- **Move work out of the main database**: full-text search into OpenSearch, analytics into a warehouse, queues into a message broker, sessions into Redis, files into S3. Each removes load and lets the right tool do the job.
- **Functional split**: give separate domains their own databases (catalogue, orders, users) — often together with service boundaries ({{ch:microservices}}). Joins across domains then move into the application or into events.

### Level 4 — Sharding

When one primary cannot take the **writes** or hold the **data**, data is spread over many databases by a **shard key**. The last five lines of the earlier example show tenant-based sharding.

- **Choosing the shard key** is the most important decision: it should be present in almost every query (so each query hits one shard), spread load evenly, and keep related data together. For multi-tenant SaaS, **tenant ID** is the classic choice; for a social app, user ID ({{ch:sharding}}).
- **Hashing** spreads tenants evenly; a **directory** (lookup table) allows explicit placements — here the huge "megastore" tenant gets a dedicated shard, because hashing it like the others would overload whichever shard it landed on (a hot spot).
- **Cross-shard queries** become **scatter-gather**: a global report asked all five shards and combined the results. Joins and transactions across shards are slow or unavailable; global uniqueness and secondary lookups (find a user by email when sharded by ID) need extra structures.
- **Resharding** — adding shards and moving data — needs planning from the start: many logical shards mapped onto fewer physical databases, so moving one logical shard is a copy-and-switch operation.
- **Operations multiply**: backups, migrations, monitoring and upgrades for every shard.

### Level 4 — Distributed SQL and NoSQL

- **Distributed SQL** databases (Aurora Limitless Database, CockroachDB, Google Spanner, YugabyteDB, Citus for PostgreSQL) shard and replicate automatically while offering SQL and transactions. They remove much of the application work of sharding, at the cost of higher latency for distributed transactions, different performance characteristics and sometimes vendor lock-in.
- **NoSQL** stores such as DynamoDB and Cassandra are built for horizontal scale with predictable latency — if data is modelled around known access patterns. They are excellent for specific workloads (sessions, carts, event streams, key-value lookups) and poor for ad-hoc relational queries ({{ch:mongodb}}).
- Choosing one is a trade-off between **flexibility** (relational), **scale with less effort** (distributed SQL, NoSQL) and **team experience**.

### Level 4 — Migrating without downtime

Moving data between databases while the system runs follows a standard pattern:

1. **Dual-write or change data capture**: keep the new store updated from the old (CDC tools such as Debezium or AWS DMS stream changes).
2. **Backfill** existing data into the new store.
3. **Verify**: compare counts and checksums; shadow-read from the new store and compare results.
4. **Switch reads** gradually (feature flags), then **switch writes**.
5. **Keep the old store** until confident; then remove dual paths.

Each step is reversible until the last. Schema changes follow expand-and-contract ({{ch:database-design}}).

## From beginner to enterprise

**Level 1–2 — the basics.** Query and index optimisation; connection pooling; caching; vertical scaling.

**Level 3 — read scale and data management.** Read replicas with lag monitoring and read-your-writes routing; partitioned time-series tables; moving search, analytics and files to specialised stores.

**Level 4 — write scale.** Functional splits; sharding with careful shard keys, directories for large tenants and plans for resharding; distributed SQL or NoSQL where appropriate; zero-downtime migrations with CDC.

**Level 5 — senior practice.** Knowing which step is next from measurements; capacity planning years ahead; choosing data stores by access patterns and team skills.

**Level 6 — enterprises.** Data platforms with many specialised stores, global databases across regions, and governance of data ownership.

## Real-world use cases

### The SaaS that sharded by tenant

- **Path**: indexes and pooling carried the product to 5,000 customers; read replicas to 20,000; then writes became the limit. The team sharded by tenant ID into 64 logical shards on 4 databases, with a directory placing the ten largest tenants on dedicated databases. Cross-tenant reports moved to a warehouse fed by CDC.

### The replica that served stale prices

- **What happened**: price updates were written to the primary, but the product page read from a replica lagging by 30 seconds during a heavy import; customers saw old prices at checkout.
- **Fix**: checkout reads prices from the primary; replica lag alarms; the import throttled to protect replication.

## Common mistakes

### Beginner: scaling hardware before fixing queries

**Fix:** profile queries first.

### Beginner: unbounded connections from many instances

**Fix:** small pools and a pooler or proxy.

### Intermediate: reading fresh data from replicas

**Consequence:** stale reads at critical moments. **Fix:** read-your-writes routing and primary reads for critical paths.

### Intermediate: sharding too early

**Consequence:** large complexity for no need. **Fix:** climb the ladder in order.

### Intermediate: a shard key missing from most queries

**Consequence:** most queries hit every shard. **Fix:** choose keys from real access patterns.

### Production: no plan for hot tenants or resharding

**Fix:** directories, logical shards and tested data-moving tools.

### Production: big-bang migrations

**Fix:** CDC, backfill, verification and gradual switching.

## Debugging and troubleshooting

- **Database CPU high**: top queries by total time; missing indexes; sudden plan changes after statistics updates.
- **Connection errors**: count connections per client; pool sizes multiplied by instance counts; idle-in-transaction sessions.
- **Replica lag growing**: heavy writes or long queries on replicas; under-sized replicas; replication slots blocked.
- **One shard overloaded**: a hot tenant or key; move it with the directory.
- **Slow global reports**: scatter-gather across shards; move them to an analytics store.

## Security summary

- **Least-privilege database users** per service; separate credentials per shard and replica role.
- **Tenant isolation** in sharded systems: every query must include the tenant; consider row-level security as a safety net.
- **Encryption and backups** for every shard and replica; restores tested for each.
- **Data movement** during migrations must keep encryption and access controls; CDC streams contain sensitive data.

## How a senior engineer thinks about this

- **Climb the ladder in order.** The cheapest step that solves the measured problem wins.
- **Consistency is a per-read decision.** Replicas for most reads, the primary for the ones that must be fresh.
- **The shard key is forever.** Choose it from access patterns and plan for hot keys and resharding.
- **Move work to the right store.** Search, analytics, queues and files do not belong in the main database.
- **Migrations are projects.** Reversible steps with verification at each.

## Exercises

### Exercise 1 — Choose the next step

**Objective:** practise the scaling ladder.
**The situation:** PostgreSQL CPU is at 85% at peak. Ten queries use 80% of database time; three of them do sequential scans on the orders table. The read:write ratio is 20:1. What do you do, in order?

<details>
<summary>Show the solution</summary>

1. **Fix the queries**: add indexes for the three sequential scans; look at the rest of the top ten ({{ch:query-optimization}}).
2. **Cache** frequently read, rarely changing data.
3. If CPU is still high, add **read replicas** for read-heavy endpoints with read-your-writes routing, or **scale up** for headroom.
4. Do not shard: the problem is reads and query efficiency, not write volume or data size.

</details>

### Exercise 2 — Pick a shard key

**Objective:** practise shard key design.
**What to do:** for an online shop platform with many independent shops (tenants), each with customers, products and orders, choose a shard key, and explain what happens to (a) a shop's order list, (b) a customer's login by email, (c) a platform-wide sales report.

<details>
<summary>Show the solution</summary>

Shard by **shop (tenant) ID**: all of a shop's data lives together.

- (a) **Order list**: a single-shard query — fast.
- (b) **Login by email**: emails are not the shard key. Use a global lookup table (email → shop and user ID) or a separate identity service, then go to the right shard.
- (c) **Platform report**: scatter-gather across all shards, or better, a warehouse fed by change data capture.

Plan a directory for very large shops and many logical shards for future resharding.

</details>

### Exercise 3 — Production scenario: moving the orders table

**Objective:** practise zero-downtime migration.
**The scenario:** the orders table (2 TB) must move from the main database to a dedicated orders database without downtime. Outline the plan.

<details>
<summary>Show the solution</summary>

1. **Create** the new database and schema.
2. **Stream changes** from the old orders table with CDC (DMS or Debezium) into the new database.
3. **Backfill** historical rows (in batches, throttled) while CDC keeps up.
4. **Verify**: row counts per day, checksums, and shadow reads comparing results from both.
5. **Switch reads** gradually with a feature flag; monitor errors and latency.
6. **Switch writes** to the new database (with a short controlled cut-over, or dual writes with reconciliation); keep CDC in reverse briefly for rollback if possible.
7. **Remove** the old table after a safe period; update joins that relied on it (now in the application or through events).

</details>

## Summary

Databases are the hardest part of a system to scale because they hold state. Climb the **scaling ladder** in order: fix queries and indexes, add **connection pooling**, **cache**, **scale up**, add **read replicas**, **partition** large tables, move search, analytics, queues and files to specialised stores, **split by domain**, and only then **shard** or adopt **distributed SQL** — each step adding complexity, so measure before climbing.

Replicas scale reads but lag; use **read/write splitting** with **read-your-writes** routing and keep critical reads on the primary. Sharding scales writes and data by a **shard key** present in most queries and evenly distributed; **directories** handle large tenants, logical shards ease resharding, and cross-shard queries become **scatter-gather** or move to an analytics store. Distributed SQL and NoSQL trade flexibility and latency for easier scale. Move data between stores with **change data capture**, backfills, verification and gradual switching, keeping every step reversible.

## Key terms

- **Scaling ladder** — The ordered sequence of database scaling steps from cheapest to most complex.
- **Vertical scaling** — Moving to a larger database server.
- **Read replica** — A copy of the database that serves reads.
- **Replication lag** — The delay between a write on the primary and its appearance on a replica.
- **Read/write splitting** — Routing writes to the primary and reads to replicas.
- **Read-your-writes consistency** — Users always see their own latest writes.
- **Connection pooler** — A proxy that shares database connections among clients.
- **Partitioning** — Splitting a table into parts within one database.
- **Sharding** — Splitting data across several databases by a key.
- **Shard key** — The value that determines which shard holds a record.
- **Directory-based sharding** — Using a lookup table to place keys on shards.
- **Logical shard** — A unit of data placement mapped onto a physical database.
- **Scatter-gather query** — A query sent to all shards and combined.
- **Hot tenant** — A tenant whose load is far larger than others'.
- **Distributed SQL** — A database that shards and replicates automatically while supporting SQL.
- **Change data capture (CDC)** — Streaming database changes to other systems.
- **Backfill** — Copying existing data into a new store.
- **Shadow read** — Reading from a new store in parallel to compare results without using them.

## What comes next

Moving work out of the database and between services depends on reliable messaging. The next chapter, {{ch:message-brokers}}, compares message brokers — RabbitMQ, Kafka and cloud queues — covering queues versus logs, delivery guarantees, ordering, partitions, consumer groups and how to choose between them.
