# Sharding

> [!GOALS]
> - Explain what sharding is, why it is needed, and why it is usually the **last** scaling step for a database.
> - Choose a **shard key**, and understand range, hash and directory-based sharding.
> - See why adding shards with simple modulo hashing moves most data, and how **consistent hashing** limits movement.
> - Route queries to shards, and handle queries without the shard key with **scatter-gather**.
> - Deal with the hard parts: cross-shard joins and transactions, global ids, hot shards and **resharding**.
> - Know the tools: application-level sharding, Citus, Vitess, MongoDB sharding and distributed SQL databases.

## Why this matters

Everything so far has assumed one primary database server. With good indexes, caching, read replicas and partitioning, a single modern PostgreSQL server handles a remarkable amount — terabytes of data and many thousands of transactions per second. Most applications never outgrow it.

Some do. A popular social network, a payments platform, a multi-tenant SaaS product with thousands of large customers, an IoT platform ingesting millions of readings per second — eventually the writes, the data size or the working set exceeds what any single machine can handle, however large. Replicas do not help with writes (every replica must apply every write). Partitioning helps manageability but stays on one server ({{ch:partitioning}}).

**Sharding** splits the data itself across many independent database servers, each holding a subset: customers A–M on one server, N–Z on another, or a hash-based spread across dozens. Each shard handles only its share of reads and writes, so capacity grows with the number of shards. The price is complexity: every query must know which shard to ask, queries across shards become expensive, transactions spanning shards lose simple guarantees, and moving data when adding shards is a major operation. This chapter explains the concepts and trade-offs, with runnable examples, so you can recognise when sharding is needed — and, just as important, when it is not.

## The simple idea

Imagine a library that has outgrown its building. Instead of one huge building, it opens several branches, and assigns books to branches by a rule: authors whose surnames start with A–F at the first branch, G–M at the second, and so on. To find a book, you apply the rule and go to the right branch. Each branch has fewer books and fewer visitors.

But questions spanning everything — "list all books published this year" — now require asking every branch and combining the answers. And if one branch becomes overcrowded, rebalancing means moving books between buildings and updating the rule, while the library stays open.

> [!ANALOGY]
> Sharding is like splitting a library across several branches by a rule (surnames A–F at one, G–M at another): each branch is smaller and less busy, and the rule tells you which branch holds a book.
>
> **Where the analogy breaks:** library visitors accept walking to different branches. Applications expect one database that answers anything, including joins and transactions across all data. With shards, anything that crosses branch boundaries — a join between customers on different shards, a transfer between two of them — must be orchestrated by the application or the sharding layer, and simple guarantees become hard ones.

## The proper definition and key words

**Sharding** is horizontally partitioning data across multiple independent database servers (**shards**), each storing a disjoint subset of the rows, with a rule that maps each row to its shard.

Key words:

- **Shard** — one database server (often itself replicated) holding part of the data.
- **Shard key** (partition key) — the attribute that determines which shard a row belongs to, such as `customer_id` or `tenant_id`.
- **Horizontal scaling** (scaling out) — adding more machines; the alternative, **vertical scaling** (scaling up), is a bigger machine.
- **Routing** — directing each query to the right shard(s).
- **Range sharding** — shards own ranges of key values.
- **Hash sharding** — shards own ranges of a hash of the key, spreading data evenly.
- **Directory (lookup) sharding** — a lookup table maps keys (or tenants) to shards.
- **Consistent hashing** — a hashing scheme in which adding or removing a shard moves only a small fraction of keys.
- **Scatter-gather** — sending a query to all shards and merging the results.
- **Resharding** (rebalancing) — moving data between shards to add capacity or fix imbalance.
- **Hot shard** — a shard receiving disproportionate traffic.

## Before you shard

### Level 2 — Exhaust the simpler options

Sharding is a one-way door with permanent costs. Before taking it, use everything else ({{ch:database-scaling}}):

1. **Optimise queries and indexes** — most "the database is too slow" problems are here ({{ch:query-optimization}}).
2. **Scale vertically** — a larger server with more memory and faster disks is the cheapest engineering option for a long time.
3. **Cache** read-heavy data ({{ch:caching}}).
4. **Add read replicas** for read traffic ({{ch:replication}}).
5. **Partition** huge tables and archive old data ({{ch:partitioning}}).
6. **Split by function** — move independent workloads (analytics, search, events, sessions) to their own databases or specialised stores, each with less load. This is often called vertical partitioning, and it is far simpler than sharding one dataset.

Shard when the **write rate** or **dataset size** of one logical dataset exceeds what a single primary can handle even after these steps — or when isolation requirements (for example, large tenants needing their own servers) make it natural.

## Choosing a shard key

### Level 3 — The most important decision

A good shard key:

- **appears in most queries** — so those queries go to a single shard;
- **groups data that is used together** — a customer's orders, items and payments on the same shard, so most transactions stay on one shard;
- **spreads load evenly** — many distinct values, without a few values receiving most traffic;
- **rarely or never changes** — moving a row between shards when its key changes is expensive.

For multi-tenant SaaS, **tenant id** is the classic choice: almost every query is "within tenant X", and a tenant's data naturally belongs together. For consumer applications, **user or customer id** plays the same role. Poor choices include timestamps (all new writes go to the newest shard — a permanent hot shard), countries or categories (few values, very uneven sizes), and anything frequently updated.

### Level 3 — Range, hash and directory sharding

| Strategy | How keys map to shards | Strengths | Weaknesses |
|---|---|---|---|
| **Range** | Shard 1: ids 1–1M, shard 2: 1M–2M… | Range queries stay on few shards; easy to split ranges | Hot spots when new keys are sequential |
| **Hash** | `hash(key)` decides the shard | Even spread of data and load | Range queries hit every shard; resharding moves data |
| **Directory** | A lookup table: tenant → shard | Full control: move one tenant, put big tenants on dedicated shards | The directory is a critical, extra component (cache it heavily) |

Many real systems combine them: hash or directory sharding by tenant or customer, with range partitioning by time **within** each shard.

## Routing and rebalancing

### Level 3 — Why modulo hashing hurts, and consistent hashing

The obvious hash rule is `hash(key) % numberOfShards`. It spreads keys evenly — until you add a shard. Then almost every key's shard changes, and most of the data must move. **Consistent hashing** places shards at many points on a ring of hash values; a key belongs to the next shard point clockwise. Adding a shard takes over only the keys just before its points:

```ts
import { createHash } from "node:crypto";

const hash = (key: string) => createHash("md5").update(key).digest().readUInt32BE(0);   // stable 32-bit hash
const customers = Array.from({ length: 10_000 }, (_, i) => `customer-${i}`);

// 1. Hash modulo N: simple, but changing N moves almost every key
const modShard = (key: string, n: number) => hash(key) % n;

// 2. Consistent hashing: shards own points on a ring; a key belongs to the next point clockwise
function ring(shards: string[], virtualNodes = 100) {
  const points = shards.flatMap((s) => Array.from({ length: virtualNodes }, (_, v) => ({ at: hash(`${s}#${v}`), shard: s })))
    .sort((a, b) => a.at - b.at);
  return (key: string) => {
    const h = hash(key);
    let lo = 0, hi = points.length;                                   // binary search for the first point >= h
    while (lo < hi) { const mid = (lo + hi) >> 1; if (points[mid]!.at < h) lo = mid + 1; else hi = mid; }
    return points[lo % points.length]!.shard;
  };
}

const moved = (before: (k: string) => string | number, after: (k: string) => string | number) =>
  customers.filter((c) => before(c) !== after(c)).length;

console.log("modulo, 4 → 5 shards:     ", moved((k) => modShard(k, 4), (k) => modShard(k, 5)), "of 10000 keys move");
const r4 = ring(["s0", "s1", "s2", "s3"]), r5 = ring(["s0", "s1", "s2", "s3", "s4"]);
console.log("consistent, 4 → 5 shards: ", moved(r4, r5), "of 10000 keys move");

const load = new Map<string, number>();
for (const c of customers) load.set(r5(c), (load.get(r5(c)) ?? 0) + 1);
console.log("keys per shard after adding s4:", Object.fromEntries([...load].sort()));
```

**Output:**

```text
modulo, 4 → 5 shards:      8000 of 10000 keys move
consistent, 4 → 5 shards:  1948 of 10000 keys move
keys per shard after adding s4: { s0: 1881, s1: 1999, s2: 2049, s3: 2123, s4: 1948 }
```

- With **modulo**, going from 4 to 5 shards moved **80%** of keys — exactly what theory predicts (a key stays put only if `hash % 4 === hash % 5`). Moving 80% of a large database is effectively a full migration.
- With **consistent hashing**, about **one fifth** of keys moved — the share the new shard takes over — and the others stayed put.
- **Virtual nodes** (100 points per shard on the ring) keep the distribution reasonably even; with one point per shard, some shards would own far larger arcs.

Many production systems use a related idea: split the hash space into a **fixed, large number of slots** (Redis Cluster uses 16,384, {{ch:redis}}; Vitess and Citus use similar mechanisms), assign slots to shards, and move whole slots when rebalancing. The mapping from key to slot never changes; only the slot-to-shard table does.

### Level 3 — Single-shard queries and scatter-gather

Here three separate PostgreSQL databases act as shards, with orders placed on the shard of their customer:

```ts
import { PGlite } from "@electric-sql/pglite";
import { createHash } from "node:crypto";

// Three independent databases acting as shards, split by customer
const shards = await Promise.all([0, 1, 2].map(async () => {
  const db = await PGlite.create();
  await db.exec("CREATE TABLE orders (id text PRIMARY KEY, customer_id text NOT NULL, total numeric(10,2) NOT NULL)");
  return db;
}));
const shardFor = (customerId: string) => createHash("md5").update(customerId).digest().readUInt32BE(0) % shards.length;

for (let i = 1; i <= 60; i++) {
  const customerId = `c${i % 12}`;
  await shards[shardFor(customerId)]!.query("INSERT INTO orders VALUES ($1, $2, $3)", [`o${i}`, customerId, (i * 7) % 50 + 0.5]);
}

// A query that includes the shard key goes to exactly one shard
const c5 = await shards[shardFor("c5")]!.query<{ n: number; spent: string }>(
  "SELECT count(*)::int AS n, sum(total)::text AS spent FROM orders WHERE customer_id = $1", ["c5"]);
console.log(`customer c5 → shard ${shardFor("c5")} only:`, c5.rows[0]);

// A query without the shard key must ask every shard and merge the answers (scatter-gather)
const perShard = await Promise.all(shards.map((db) =>
  db.query<{ customer_id: string; spent: string }>(
    "SELECT customer_id, sum(total)::text AS spent FROM orders GROUP BY customer_id ORDER BY sum(total) DESC LIMIT 3")));
const top3 = perShard.flatMap((r) => r.rows).sort((a, b) => Number(b.spent) - Number(a.spent)).slice(0, 3);
console.log("rows per shard:", await Promise.all(shards.map(async (db) => (await db.query<{ n: number }>("SELECT count(*)::int AS n FROM orders")).rows[0]!.n)));
console.log("top 3 customers across all shards:", top3);
```

**Output:**

```text
customer c5 → shard 0 only: { n: 5, spent: '117.50' }
rows per shard: [ 20, 20, 20 ]
top 3 customers across all shards: [
  { customer_id: 'c9', spent: '157.50' },
  { customer_id: 'c6', spent: '152.50' },
  { customer_id: 'c7', spent: '137.50' }
]
```

- **With the shard key**, the router computes the shard and asks only that one — the query costs the same as on a small single database. Design so that most queries look like this.
- **Without the shard key** ("top customers overall"), every shard must be asked, and the router merges the partial results. This works here because "top 3 overall" is contained in the union of each shard's top 3 (each customer lives on one shard). Other queries are harder: a global `AVG` needs sums and counts from each shard; global pagination needs each shard's first N rows and a merge; global sorting of large results is expensive.
- Scatter-gather latency is set by the **slowest** shard, and its cost grows with the number of shards. Frequent cross-shard queries are a sign that the data should be copied to a store built for them — a search index, a data warehouse, or a replicated reference table.
- The example uses PGlite instances so it runs anywhere; in production, shards are separate PostgreSQL (or MySQL, MongoDB) servers, each with its own replicas.

### Level 4 — Resharding without downtime

Adding shards (or moving a large tenant to its own) means copying data while the application keeps writing. A typical online process:

1. **Copy** the moving keys' existing data to the target shard (snapshot plus catch-up, often with logical replication or change data capture, {{ch:replication}}).
2. **Replicate** ongoing changes to the target until it is caught up.
3. **Switch routing** for those keys — briefly pausing writes for them, or using dual writes with careful verification.
4. **Verify** and remove the data from the old shard.

Systems built for sharding (Vitess, Citus, MongoDB, distributed SQL databases) automate much of this. Doing it by hand in application-level sharding is a substantial project — which is why choosing a scheme that keeps movement small (slots, consistent hashing, directories) matters from the start.

## The hard parts

### Level 4 — Cross-shard joins and transactions

- **Joins** across shards are not available as ordinary SQL. Keep related data on the same shard (shard customers, orders, items and payments all by `customer_id` — **co-location**), and **replicate small reference tables** (products, categories, countries) to every shard so joins with them stay local.
- **Transactions** across shards lose single-database ACID guarantees. Options: design so that transactions stay within one shard; use the database's distributed transactions where they exist (two-phase commit, at a latency and availability cost); or model the operation as a **saga** — a sequence of local transactions with compensating actions if a later step fails ({{ch:microservices}}, {{ch:distributed-systems}}).
- **Unique constraints across shards** cannot be enforced by one database. A global unique email needs a separate lookup service or table (itself a single point to design carefully), or a uniqueness rule scoped within the shard key (unique per tenant).

### Level 4 — Global identifiers

Auto-increment ids are per database, so two shards would issue the same ids. Options:

- **UUIDs** — random v4, or time-ordered **v7** for better index locality ({{ch:database-design}}).
- **Snowflake-style ids** — 64-bit numbers combining a timestamp, a worker or shard id, and a sequence; unique without coordination and roughly time-ordered:

```ts
// Snowflake-style ids: unique across shards without coordination, roughly ordered by time
const EPOCH = Date.UTC(2026, 0, 1);

function idGenerator(workerId: number, now: () => number) {
  let lastMs = -1, sequence = 0;
  return (): bigint => {
    let ms = now() - EPOCH;
    if (ms === lastMs) sequence = (sequence + 1) & 0xfff;            // up to 4096 ids per millisecond per worker
    else { sequence = 0; lastMs = ms; }
    return (BigInt(ms) << 22n) | (BigInt(workerId) << 12n) | BigInt(sequence);
  };
}

function decode(id: bigint) {
  return {
    time: new Date(Number(id >> 22n) + EPOCH).toISOString(),
    worker: Number((id >> 12n) & 0x3ffn),
    sequence: Number(id & 0xfffn),
  };
}

const fixedClock = () => Date.UTC(2026, 10, 20, 9, 30, 0);
const shardA = idGenerator(1, fixedClock), shardB = idGenerator(2, fixedClock);
const ids = [shardA(), shardA(), shardB()];
for (const id of ids) console.log(id.toString(), decode(id));
console.log("all unique:", new Set(ids).size === ids.length);
```

**Output:**

```text
117194725785604096 { time: '2026-11-20T09:30:00.000Z', worker: 1, sequence: 0 }
117194725785604097 { time: '2026-11-20T09:30:00.000Z', worker: 1, sequence: 1 }
117194725785608192 { time: '2026-11-20T09:30:00.000Z', worker: 2, sequence: 0 }
all unique: true
```

- The id packs the **milliseconds since a custom epoch** (high bits), the **worker id** (10 bits) and a **sequence** (12 bits). Two ids from the same worker in the same millisecond differ by sequence; ids from different workers differ by worker bits — so all three are unique even though they were generated at the same instant.
- Ids sort roughly by creation time, which keeps B-tree indexes efficient.
- Real implementations also handle the sequence overflowing within a millisecond (wait for the next one) and clocks moving backwards. Use `bigint` columns and send these ids to JavaScript clients as **strings** — they exceed `Number.MAX_SAFE_INTEGER`.
- The fixed clock makes the example's output reproducible.
- The shard key can also be embedded in ids (for example, a shard or tenant prefix), so any id can be routed without a lookup.

### Level 4 — Hot shards and uneven tenants

Even with a good key, load is rarely uniform: one celebrity account, one enterprise tenant, one viral product. Remedies: give the largest tenants **dedicated shards** (directory sharding makes this a configuration change); **split hot keys** (spread one user's high-volume data across sub-keys); add **caching** in front of hot data; and monitor per-shard load so imbalance is caught early.

## Sharding in practice

### Level 4 — Where the sharding logic lives

- **Application-level sharding**: the application computes the shard and holds a connection pool per shard. Full control and no new infrastructure, but every query path, migration and operational task must handle shards — common in older large systems, and a heavy maintenance burden.
- **Sharding middleware/extensions**: **Citus** (a PostgreSQL extension distributing tables across worker nodes, with co-located and reference tables and distributed queries), **Vitess** (sharding for MySQL, used at very large scale), and proxies that route queries.
- **Databases with built-in sharding**: **MongoDB** sharded clusters ({{ch:mongodb}}), Cassandra and DynamoDB (partitioned by design), Redis Cluster ({{ch:redis}}).
- **Distributed SQL** ("NewSQL"): CockroachDB, YugabyteDB, Google Spanner, TiDB — SQL databases that shard and replicate automatically with distributed transactions, at the cost of higher per-transaction latency and different operational characteristics.

The industry trend is to use a database that handles sharding internally, or a managed service, rather than building application-level sharding from scratch.

## From beginner to enterprise

**Level 1–2 — understanding.** Knowing the difference between scaling up and scaling out, replication and sharding, partitioning and sharding.

**Level 3 — design literacy.** Choosing shard keys from query patterns; range, hash and directory schemes; recognising single-shard and scatter-gather queries; co-locating related data; replicating reference tables.

**Level 4 — building sharded systems.** Consistent hashing or slot-based mapping; global id strategies; sagas instead of cross-shard transactions; online resharding; per-shard monitoring; dedicated shards for large tenants.

**Level 5 — senior practice.** Deciding whether sharding is needed at all; choosing between application-level sharding, Citus/Vitess and distributed SQL; capacity planning per shard; designing for cross-shard analytics through warehouses.

**Level 6 — enterprises.** Hundreds of shards across regions; data residency by shard placement; automated rebalancing; organisation-wide platforms abstracting sharding from product teams ({{ch:database-scaling}}).

## Real-world use cases

### A multi-tenant SaaS platform

- **Design**: directory sharding by `tenant_id`; every table carries `tenant_id` and every query filters by it; small tenants share shards, the largest have dedicated ones; reference data (plans, countries) replicated to every shard; cross-tenant analytics through a warehouse fed by change data capture.
- **Benefit**: a tenant's queries and transactions stay on one shard; moving a growing tenant is a planned operation on one row of the directory plus a data copy.

### A high-volume event platform

- **Design**: events hash-sharded by device id across many nodes, range-partitioned by day within each shard; per-device queries are single-shard; fleet-wide dashboards come from pre-aggregated streams rather than scatter-gather queries.

## Common mistakes

### Beginner: sharding too early

**Consequence:** permanent complexity for capacity you did not need. **Fix:** optimise, scale up, cache, replicate and partition first.

### Beginner: confusing replication with sharding

**Fix:** replicas copy everything (read scaling, availability); shards split data (write and storage scaling).

### Intermediate: a shard key absent from most queries

**Consequence:** constant scatter-gather. **Fix:** choose the key from the dominant access pattern.

### Intermediate: time-based or low-variety shard keys

**Consequence:** hot shards and uneven sizes. **Fix:** high-cardinality, evenly used keys; time partitioning within shards.

### Intermediate: modulo hashing with plans to add shards

**Consequence:** massive data movement. **Fix:** slots, consistent hashing or directories.

### Production: auto-increment ids per shard

**Consequence:** duplicate ids. **Fix:** UUIDs, Snowflake-style ids, or id ranges per shard.

### Production: assuming cross-shard transactions work like local ones

**Fix:** keep transactions within a shard; sagas or explicit distributed transactions otherwise.

## Debugging and troubleshooting

- **One shard is overloaded**: a hot key or large tenant — check per-shard and per-key metrics; split, move or cache.
- **Some queries are slow only on certain shards**: uneven data sizes, different indexes or statistics per shard — keep schema and maintenance identical across shards.
- **Duplicate or missing data after resharding**: routing switched before the copy caught up, or dual writes diverged — verify with checksums and counts per key before switching.
- **Scatter-gather queries time out**: the slowest shard sets the pace — add per-shard timeouts, move such queries to analytical stores, or precompute.
- **Ids collide**: per-shard sequences — switch to globally unique ids.

## Security summary

- **Tenant isolation** depends on routing correctness: a routing bug can expose one tenant's data to another; test isolation explicitly and consider row-level security within shards ({{ch:postgresql}}).
- **Data residency** can be implemented by placing shards in specific regions — make sure routing and backups respect it.
- Each shard needs the **same security controls**: encryption, least-privilege roles, patching and auditing — automation keeps them identical.
- The **shard directory** (if any) is critical infrastructure: protect, replicate and audit it.

## How a senior engineer thinks about this

- **Sharding is the last resort, not the first idea.** They exhaust simpler scaling first, because sharding's costs are permanent.
- **The shard key is the design.** It decides which queries are cheap and which are impossible.
- **Plan for change.** Slot-based, consistent-hash or directory schemes make adding shards a routine operation.
- **Keep work local.** Co-located data and replicated reference tables keep most queries and transactions on one shard.
- **Prefer systems that shard for you.** Citus, Vitess, MongoDB and distributed SQL usually beat hand-built application sharding.

## Exercises

### Exercise 1 — Pick the shard key

**Objective:** practise shard-key selection.
**What to do:** choose a shard key and justify it for: (1) a project-management SaaS (organisations, projects, tasks, comments); (2) a ride-hailing app's trips; (3) a social network's posts and likes; (4) an online shop where 95% of queries are a customer's own orders but reports are by product.

<details>
<summary>Show the solution</summary>

1. **`organisation_id`** — almost every query is within an organisation; projects, tasks and comments co-locate; large organisations can get dedicated shards.
2. **City or region** for operational queries (matching drivers and riders happens locally), possibly combined with `rider_id` hashing within large cities; historical trips per rider may live in a separate store sharded by `rider_id`. A single key rarely fits all queries — co-locate the hot path.
3. **`author_id`** for posts (profile pages, writing); likes sharded by `post_id` (counting a post's likes) — feeds are usually served from precomputed timelines rather than queries across shards ({{ch:designing-twitter}}).
4. **`customer_id`** — the dominant query is single-shard; product reports go to a warehouse fed from all shards, not scatter-gather over the operational shards.

</details>

### Exercise 2 — Make the global query work

**Objective:** practise scatter-gather reasoning.
**What to do:** with orders sharded by customer, explain how to compute across all shards: (1) total revenue; (2) average order value; (3) the 20 most recent orders; (4) the number of distinct products sold. Which are cheap and which are hard?

<details>
<summary>Show the solution</summary>

1. **Total revenue** — each shard returns its `sum(total)`; the router adds them. Cheap.
2. **Average order value** — each shard returns `sum(total)` **and** `count(*)`; the router divides the total sum by the total count. (Averaging the per-shard averages is wrong when shard sizes differ.) Cheap.
3. **20 most recent orders** — each shard returns its own 20 most recent; the router merges the up to 20 × N rows and takes the top 20. Moderate; deep pagination gets expensive.
4. **Distinct products sold** — each shard's distinct set may overlap, so the router needs the full sets (or an approximation such as HyperLogLog sketches merged across shards). Hard to do exactly at scale; a warehouse or precomputed counts are better.

</details>

### Exercise 3 — Production scenario: the overloaded shard

**Objective:** practise handling imbalance.
**The scenario:** a SaaS platform hash-shards by `tenant_id` across eight shards. One new enterprise tenant generates 40% of all writes, and its shard's CPU is at 95% while others sit at 30%. What can you do in the short and long term?

<details>
<summary>Show the solution</summary>

**Short term:**
- Add read replicas for that shard and route the tenant's read traffic there; cache its hot reads.
- Rate-limit or queue the tenant's non-urgent bulk operations ({{ch:rate-limiting}}).
- Scale the shard's server up vertically if possible.

**Long term:**
- Move to **directory sharding** (or add a directory layer above the hash) so a tenant can be placed explicitly; give this tenant a **dedicated shard** (or several, sharding its data internally by a secondary key such as project id).
- Migrate the tenant online: copy, catch up with change data capture, switch routing, verify ({{ch:replication}}).
- Add per-tenant usage monitoring and alerts, and contractual limits or pricing tiers for very large tenants.

</details>

## Summary

**Sharding** splits one dataset across multiple independent database servers, each holding a disjoint subset, so write capacity and storage grow with the number of shards. It is usually the **last** scaling step, after query optimisation, vertical scaling, caching, read replicas, partitioning and splitting workloads by function — because its costs are permanent.

The **shard key** is the central decision: it should appear in most queries, co-locate data used together, spread load evenly and rarely change; tenant or customer ids are common choices, timestamps and low-variety values poor ones. **Range**, **hash** and **directory** schemes map keys to shards; simple modulo hashing moves most data when shards are added (80% going from 4 to 5 shards in the example), whereas **consistent hashing** or fixed **slots** move only the necessary fraction.

Queries with the shard key go to one shard; queries without it need **scatter-gather** and careful merging (sums and counts rather than averages of averages). Cross-shard joins are avoided by co-location and replicated reference tables; cross-shard transactions need sagas or distributed transactions; global uniqueness needs separate mechanisms; ids must be globally unique (UUIDs or **Snowflake-style** ids). **Resharding** copies and catches up data before switching routing. Hot shards are handled by dedicated shards, key splitting and caching. Prefer databases and tools that shard for you — Citus, Vitess, MongoDB, distributed SQL — over hand-built application sharding.

## Key terms

- **Sharding** — Splitting a dataset across multiple independent database servers.
- **Shard** — One server (or replicated group) holding a subset of the data.
- **Shard key** — The attribute that determines which shard a row belongs to.
- **Vertical scaling** — Increasing the capacity of a single machine.
- **Horizontal scaling** — Adding more machines to share the load.
- **Functional partitioning** — Splitting different workloads or features into separate databases.
- **Range sharding** — Assigning contiguous ranges of key values to shards.
- **Hash sharding** — Assigning keys to shards by a hash of the key.
- **Directory sharding** — Using a lookup table to map keys or tenants to shards.
- **Consistent hashing** — A scheme where adding or removing shards moves only a small fraction of keys.
- **Virtual nodes** — Multiple ring positions per shard in consistent hashing, improving balance.
- **Hash slots** — A fixed set of buckets that keys map to and that are assigned to shards.
- **Query routing** — Directing each query to the shard or shards that hold the needed data.
- **Scatter-gather** — Querying all shards and merging their results.
- **Co-location** — Storing related data on the same shard so queries and transactions stay local.
- **Reference table** — A small table replicated to every shard for local joins.
- **Resharding** — Moving data between shards to add capacity or rebalance load.
- **Hot shard** — A shard receiving a disproportionate share of traffic.
- **Saga** — A sequence of local transactions with compensating actions, used instead of distributed transactions.
- **Snowflake ID** — A 64-bit id combining a timestamp, a worker id and a sequence.
- **Citus** — A PostgreSQL extension that distributes tables across nodes.
- **Vitess** — A sharding system for MySQL.
- **Distributed SQL** — SQL databases that shard and replicate data automatically with distributed transactions.

## What comes next

This chapter completes the part on databases. The next part moves from data to the machines and pipelines that run everything, starting with the operating system most servers use: {{ch:linux}} — the shell, files and permissions, processes, services, logs and the everyday commands every back-end engineer needs.
