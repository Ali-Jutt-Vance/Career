# Caching at Scale

> [!GOALS]
> - Design **multi-layer caching**: browser, CDN, application memory, distributed cache and database.
> - Choose a caching pattern — **cache-aside**, **read-through**, **write-through**, **write-behind** — and an invalidation strategy.
> - Distribute a cache across nodes with **consistent hashing**, and understand what happens when nodes are added or fail.
> - Prevent **stampedes**, handle **hot keys**, and set TTLs and eviction policies sensibly.
> - Reason about **consistency** between caches and the source of truth.
> - Operate caches: hit ratios, memory, failure behaviour and warm-up.

## Why this matters

{{ch:caching}} introduced caching with Redis for one application. At large scale, caching becomes architecture: most requests of big websites never reach a database — they are answered by CDNs, in-memory caches on each server, and clusters of cache nodes holding terabytes of data. Caching is often the single biggest reason a system can serve millions of users on a reasonable budget.

It also introduces some of the hardest problems in system design. Data is copied, so it can be **stale**. Caches fail and take the database down with them when every request suddenly misses. A single popular key can overload one cache node. And "when do we invalidate?" has caused countless bugs. As Phil Karlton's well-known joke says, there are only two hard things in computer science: cache invalidation and naming things.

## The simple idea

A busy library keeps the most-requested books on a trolley by the front desk, and the very most popular in the librarian's hand. Most people are served in seconds; only unusual requests mean a trip to the stacks. But the trolley holds copies — if a new edition arrives, someone must swap the copies, or readers get the old one.

> [!ANALOGY]
> A cache is like the trolley of popular books at a library's front desk: most requests are served instantly, and only unusual ones need a trip to the stacks.
>
> **Where the analogy breaks:** in a library, if the trolley tips over, readers simply walk to the stacks a bit more slowly. In software, if a cache fails, **every** request goes to the database at the same moment — and a database sized for 5% of the traffic collapses under 100%. The cache becomes something the system cannot live without.

## The proper definition and key words

A **cache** is a fast store holding copies of data from a slower **source of truth**, to reduce latency and load. **Caching at scale** involves several cache layers, distribution across many nodes, and policies for freshness, eviction and failure.

Key words:

- **Hit / miss / hit ratio** — found in the cache / not found / share of requests served from cache.
- **TTL** — time to live, after which an entry expires.
- **Eviction** — removing entries when memory is full (LRU, LFU, random).
- **Cache-aside (lazy loading)** — the application reads the cache, and on a miss loads from the database and fills the cache.
- **Read-through / write-through / write-behind** — the cache loads on misses itself / writes go through the cache to the database synchronously / writes go to the cache and later to the database.
- **Invalidation** — removing or updating cached entries when the source changes.
- **Stampede (thundering herd)** — many requests missing the same key at once and all hitting the database.
- **Hot key** — a key receiving a disproportionate share of traffic.
- **Consistent hashing** — distributing keys over nodes so that adding or removing a node moves few keys.
- **Negative caching** — caching "not found" results.

## Layers and patterns

### Level 1 — Cache layers

```text
 browser cache (Cache-Control) ──► CDN edge (shared, public content)
        ──► API: in-process memory cache (per instance, microseconds, small)
        ──► distributed cache: Redis / Memcached cluster (shared, sub-millisecond)
        ──► database buffer cache ──► disk
```

| Layer | Good for | Watch out for |
|---|---|---|
| Browser and CDN | Static assets, public pages and API responses | Personal data must never be cached publicly ({{ch:cloudfront}}) |
| In-process | Tiny, very hot, rarely changing data (configuration, feature flags, reference data) | Each instance has its own copy; memory per instance; invalidation across instances |
| Distributed | Shared data: sessions, computed results, rendered fragments, rate-limit counters | Network round trip; cluster operations; it becomes critical |
| Database | Automatically caches pages and indexes | Not a substitute for application caching at very high read rates |

Each layer in front shields the ones behind. The best cache hit is the one that never leaves the user's browser.

### Level 2 — Choosing a pattern

- **Cache-aside** is the default: simple, the cache holds only data that is read, and a cache failure means slower reads rather than errors. The application is responsible for invalidation ({{ch:caching}}).
- **Read-through** moves the loading into a caching library or service; same behaviour, cleaner code.
- **Write-through** updates the cache on every write — reads are always fresh, but writes are slower and the cache fills with data that may never be read.
- **Write-behind** acknowledges writes once in the cache and persists later — very fast writes, but data can be lost if the cache fails before flushing. Use only where loss is acceptable (counters, analytics) or the cache is durable.

### Level 2 — Invalidation strategies

- **TTL only**: data may be stale for up to the TTL. Simple and often enough (product listings, profiles).
- **Delete on write**: after updating the database, delete the cache key; the next read reloads it. Prefer **deleting** to **updating** the cache: two concurrent writers updating the cache can leave the older value last.
- **Versioned keys**: include a version in the key (`product:42:v17`); writes bump the version, so old entries simply stop being read and expire.
- **Event-driven invalidation**: change events from the database (change data capture) or the application publish "product 42 changed" to all caches, including in-process caches on every instance ({{ch:event-driven-systems}}).
- Even with invalidation, keep a **TTL** as a safety net, so a missed invalidation heals itself.

## Distributing the cache

### Level 3 — Consistent hashing

A cache cluster spreads keys across nodes. The naive way, `hash(key) % numberOfNodes`, has a problem: when a node is added or removed, almost every key maps to a different node — the cache effectively empties, and the database receives a flood of misses. **Consistent hashing** places nodes and keys on a ring; each key belongs to the next node clockwise, so a new node takes only its share of keys:

```ts
import { createHash } from "node:crypto";

const hash = (s: string) => createHash("md5").update(s).digest().readUInt32BE(0);
const keys = Array.from({ length: 100_000 }, (_, i) => `product:${i}`);

// 1. Which cache node holds a key? Modulo hashing versus a consistent-hash ring
const modulo = (key: string, nodes: string[]) => nodes[hash(key) % nodes.length]!;

function ring(nodes: string[], virtualNodes = 200) {
  const points = nodes.flatMap((n) => Array.from({ length: virtualNodes }, (_, v) => ({ at: hash(`${n}#${v}`), node: n })))
    .sort((a, b) => a.at - b.at);
  return (key: string) => {
    const h = hash(key);
    let lo = 0, hi = points.length;                       // first point clockwise from the key's position
    while (lo < hi) { const mid = (lo + hi) >> 1; if (points[mid]!.at < h) lo = mid + 1; else hi = mid; }
    return points[lo % points.length]!.node;
  };
}

const before = ["cache-a", "cache-b", "cache-c", "cache-d"];
const after = [...before, "cache-e"];
const moved = (f: (k: string) => string, g: (k: string) => string) => keys.filter((k) => f(k) !== g(k)).length;
const r4 = ring(before), r5 = ring(after);
console.log(`adding a 5th node, modulo hashing:     ${(moved((k) => modulo(k, before), (k) => modulo(k, after)) / 1000).toFixed(1)}% of keys move`);
console.log(`adding a 5th node, consistent hashing: ${(moved(r4, r5) / 1000).toFixed(1)}% of keys move`);
const load: Record<string, number> = {};
for (const k of keys) load[r5(k)] = (load[r5(k)] ?? 0) + 1;
console.log("keys per node on the ring:", Object.entries(load).sort().map(([n, c]) => `${n} ${c}`).join(", "));

// 2. A cache stampede, and request coalescing ("single flight")
let dbQueries = 0;
const slowDbRead = async (key: string) => { dbQueries++; await new Promise((r) => setTimeout(r, 50)); return `value of ${key}`; };
const inFlight = new Map<string, Promise<string>>();
function coalesced(key: string): Promise<string> {
  const existing = inFlight.get(key);
  if (existing) return existing;                          // join the request already running
  const p = slowDbRead(key).finally(() => inFlight.delete(key));
  inFlight.set(key, p);
  return p;
}
// the popular key has just expired and 500 requests arrive at once
dbQueries = 0; await Promise.all(Array.from({ length: 500 }, () => slowDbRead("product:42")));
console.log(`stampede without coalescing: ${dbQueries} database queries`);
dbQueries = 0; await Promise.all(Array.from({ length: 500 }, () => coalesced("product:42")));
console.log(`with coalescing:             ${dbQueries} database query`);
```

**Output:**

```text
adding a 5th node, modulo hashing:     80.0% of keys move
adding a 5th node, consistent hashing: 19.5% of keys move
keys per node on the ring: cache-a 20308, cache-b 19069, cache-c 20200, cache-d 20915, cache-e 19508
stampede without coalescing: 500 database queries
with coalescing:             1 database query
```

- With modulo hashing, **80%** of keys moved — a near-total cache flush. With consistent hashing, about **20%** moved: just the new node's fair share (1/5).
- **Virtual nodes** (200 points per node on the ring) spread keys evenly; with one point per node, some nodes would get far more keys than others.
- Redis Cluster uses a related scheme — 16,384 **hash slots** assigned to nodes, moved between nodes when resharding — and Memcached clients typically use consistent hashing. Managed services (ElastiCache) handle the cluster, but the effects matter to your design.
- The last two lines are the **stampede** demonstration, explained next.

## Failure modes

### Level 3 — Stampedes

When a popular key expires, hundreds of concurrent requests miss at once, all query the database for the same value, and all write it back. In the example, 500 simultaneous requests caused **500** database queries. Defences:

- **Request coalescing (single flight)**: the first miss loads the value; concurrent requests for the same key wait for that one load — **one** query instead of 500. Within one process this is a map of in-flight promises; across instances, a short **lock** in Redis (`SET key:lock NX PX 5000`) lets one instance load while others wait briefly or serve the stale value.
- **Stale-while-revalidate**: keep serving the old value for a short time after expiry while one request refreshes it in the background.
- **Early refresh**: refresh popular keys a little **before** they expire, randomly (probabilistic early expiration), so they never all expire at once.
- **TTL jitter**: add random variation to TTLs (300 s ± 10%) so keys written together do not expire together.

### Level 3 — Hot keys and big keys

- A **hot key** (a celebrity's profile, a viral product, the home page) can exceed one cache node's capacity even when the cluster has plenty. Fixes: an **in-process cache** in front for the hottest keys (milliseconds of staleness, no network), **replicating** the key across several nodes (`home:v3:#1`…`#8`, readers choose one at random), and read replicas for the cache cluster.
- **Big keys** (a 10 MB list) are slow to transfer and block single-threaded Redis while being read or deleted. Split them, paginate, or store large blobs in object storage with a reference.

### Level 4 — When the cache fails

- **Cold start / cache loss**: after a restart or failover, every request misses. Protect the database with **coalescing**, **rate-limited warm-up** (preload the most popular keys), and **admission control** (shed low-priority traffic while the cache warms).
- **Design for the cache being down**: either the system works more slowly without it (good), or it fails (then the cache needs the same availability design as a database: replicas, multiple zones, automatic failover — {{ch:redis}}).
- **Timeouts on cache calls**: a slow cache must not be slower than the database it protects; fail fast and fall back.
- **Consistency surprises**: a replica of the cache may serve an older value than the primary; an in-process cache on each instance may disagree with others for its TTL.

### Level 4 — Consistency and correctness

- Decide per data type what staleness is acceptable: a product description for minutes, a price for seconds, a stock level for the last item **not at all** — read the source of truth for decisions that matter (checkout, payments) ({{ch:distributed-systems}}).
- The classic race in cache-aside: reader A misses and reads the old value from the database; writer B updates the database and deletes the key; reader A then writes the **old** value into the cache, where it stays until the TTL. Mitigations: short TTLs, versioned keys, delayed second deletes, or invalidation through change events with ordering.
- **Negative caching** ("product 999 does not exist") protects the database from repeated lookups of missing keys — including attackers probing random IDs — with short TTLs.

## Operating caches

### Level 4 — What to measure

- **Hit ratio** per key prefix or use case; a drop often means a key format change or an invalidation bug.
- **Latency** (p99) of cache calls; **evictions** (memory too small); **memory usage** and fragmentation.
- **Database load** alongside the hit ratio — the real purpose of the cache.
- **Key cardinality and size** — find big and hot keys (`redis-cli --bigkeys`, `--hotkeys`, monitoring tools).
- **Eviction policy**: `allkeys-lru` (or LFU) for pure caches; never let a cache with no eviction run out of memory.

## From beginner to enterprise

**Level 1–2 — caching basics.** Layers from browser to database; cache-aside with TTLs; delete on write; HTTP caching headers.

**Level 3 — distributed caching.** Cache clusters and consistent hashing; stampede protection with coalescing, locks, stale-while-revalidate and jitter; hot-key handling; negative caching.

**Level 4 — critical caches.** Designing for cache loss; warm-up and admission control; event-driven invalidation; per-data consistency rules; monitoring hit ratios, evictions and big keys.

**Level 5 — senior practice.** Deciding what not to cache; quantifying the database capacity needed without the cache; cache architecture across regions.

**Level 6 — enterprises.** Global multi-tier caches, cache platforms shared by many teams, cost and capacity planning for very large in-memory fleets.

## Real-world use cases

### The home page

- **Design**: the home page's data is assembled every 30 seconds by a background job and stored under a versioned key, replicated across cache nodes; each API instance keeps it in memory for 5 seconds; the CDN caches the rendered page for 10 seconds. The database sees one query per 30 seconds, whatever the traffic.

### The midnight stampede

- **What happened**: a nightly job refreshed 50,000 product cache entries with the same TTL. Exactly one hour later they all expired; the database CPU went to 100% for ten minutes.
- **Fix**: TTL jitter, stale-while-revalidate for product pages, and request coalescing in the product service.

## Common mistakes

### Beginner: caching without TTLs

**Consequence:** stale data forever when invalidation misses. **Fix:** always a TTL.

### Beginner: updating instead of deleting on write

**Consequence:** races leave old values. **Fix:** delete, or versioned keys.

### Intermediate: modulo hashing for cache nodes

**Consequence:** most keys move when a node changes. **Fix:** consistent hashing or a cluster with hash slots.

### Intermediate: no stampede protection

**Consequence:** database spikes on expiry of popular keys. **Fix:** coalescing, jitter, stale-while-revalidate.

### Intermediate: caching personalised data in shared layers

**Consequence:** data leaks between users. **Fix:** keys including the user, or no shared caching.

### Production: a database that cannot survive cache loss, without protection

**Fix:** cache availability design, warm-up, admission control.

### Production: using cached values for critical decisions

**Consequence:** overselling and wrong balances. **Fix:** source of truth for decisions.

## Debugging and troubleshooting

- **Users see old data**: check TTLs, invalidation paths and the cache-aside race; look for in-process caches with long TTLs.
- **Hit ratio dropped after a deployment**: key format or serialisation changed; caches keyed by version need warm-up.
- **One cache node at 100% CPU**: a hot key — find it and replicate or cache it in process.
- **Latency spikes in Redis**: big keys, `KEYS` commands, expensive Lua scripts or persistence forks ({{ch:redis}}).
- **Database overload after a cache failover**: cold cache; add coalescing and controlled warm-up.

## Security summary

- **Never cache private data in shared or public layers**; include user or tenant in keys where per-user caching is needed.
- **Protect cache clusters**: private networks, authentication and TLS; caches often hold sessions and personal data.
- **Negative caching and rate limits** protect against enumeration attacks.
- **Cache poisoning**: never cache responses whose content depends on unvalidated request headers.

## How a senior engineer thinks about this

- **Cache where it pays.** Read-heavy, expensive, tolerant of staleness.
- **Every cache needs a freshness rule and a failure plan.**
- **Expect stampedes and hot keys.** They are normal at scale, not rare accidents.
- **Measure the database without the cache.** That is the real capacity you depend on.
- **Correctness first.** Critical decisions read the source of truth.

## Exercises

### Exercise 1 — Choose the caching strategy

**Objective:** practise matching strategies to data.
**What to do:** choose layer, TTL and invalidation for (a) product descriptions; (b) a user's basket; (c) the list of countries; (d) stock levels shown on product pages; (e) stock checks at checkout.

<details>
<summary>Show the solution</summary>

- (a) Distributed cache plus CDN for public pages; TTL minutes; delete on write or versioned keys.
- (b) Per-user key in Redis (or the database); no CDN; updated on every change.
- (c) In-process cache with a long TTL (hours); refreshed on deployment.
- (d) Short TTL (seconds) or event-driven updates; showing "in stock" slightly late is acceptable.
- (e) **No cache** — read the source of truth inside the order transaction (or a reservation system) ({{ch:transactions}}).

</details>

### Exercise 2 — Protect against stampedes

**Objective:** practise stampede defences.
**What to do:** the "top sellers" key is read 20,000 times per second and takes 2 seconds to compute. Describe how to keep it from overloading the database.

<details>
<summary>Show the solution</summary>

- **Precompute** it in a background job on a schedule (for example every 30 seconds) and write it to the cache — requests never compute it.
- If it is computed on demand: **coalescing** within instances and a **distributed lock** so only one instance recomputes; **stale-while-revalidate** so others serve the previous value meanwhile.
- **In-process caching** for a few seconds on each instance reduces the load on the single cache key (a hot key at 20,000 reads per second).
- **Replicate** the key across several cache nodes if needed.

</details>

### Exercise 3 — Production scenario: the cache failover

**Objective:** practise failure planning.
**The scenario:** the primary node of the Redis cluster failed; the replica took over, but its data was lost because replication was misconfigured. For 15 minutes the database ran at 100% CPU and the site returned errors. How do you prevent this next time?

<details>
<summary>Show the solution</summary>

1. **Fix replication** and test failover regularly (a game day) ({{ch:redis}}).
2. **Measure database capacity** without the cache; decide whether the system must survive a cold cache.
3. **Coalescing** in every service so concurrent misses do not multiply database queries.
4. **Admission control and load shedding** during warm-up: reject or degrade low-priority traffic.
5. **Warm-up** of the hottest keys after failover, rate-limited.
6. **Timeouts and fallbacks** so cache problems produce slower responses, not errors.
7. **Alerts** on hit ratio and database load together, with a runbook.

</details>

## Summary

At scale, caching is architecture: **layers** from browser and CDN to in-process memory, distributed caches and the database each shield the next. **Cache-aside** with TTLs is the default; read-through, write-through and write-behind trade freshness, write speed and durability. Invalidate by **TTL**, **delete on write**, **versioned keys** or **change events**, always keeping a TTL as a safety net.

Distributed caches spread keys with **consistent hashing** (or hash slots): adding a node moves only its share of keys instead of nearly all of them, and virtual nodes keep the load even. Expect **stampedes** — prevent them with **request coalescing**, distributed locks, **stale-while-revalidate**, early refresh and **TTL jitter** — and **hot or big keys**, handled with in-process caching, replication and splitting.

Plan for **cache failure**: know the database's capacity without the cache, protect it with coalescing, warm-up and admission control, and give critical caches proper availability. Decide acceptable staleness per data type, beware the cache-aside race, use the source of truth for important decisions, and watch hit ratios, latency, evictions and database load together.

## Key terms

- **Cache** — A fast store holding copies of data from a slower source.
- **Source of truth** — The authoritative store of data.
- **Hit ratio** — The share of requests served from the cache.
- **TTL** — How long a cache entry remains valid.
- **Eviction** — Removing entries to free memory.
- **LRU / LFU** — Evicting the least recently / least frequently used entries.
- **Cache-aside** — The application loads and fills the cache on misses.
- **Read-through cache** — The cache loads missing values itself.
- **Write-through cache** — Writes update the cache and the database together.
- **Write-behind cache** — Writes go to the cache and are persisted later.
- **Cache invalidation** — Removing or updating entries when data changes.
- **Versioned key** — A cache key containing a version number that changes on writes.
- **Cache stampede** — Many simultaneous misses on the same key overwhelming the source.
- **Request coalescing** — Combining concurrent requests for the same key into one load.
- **Stale-while-revalidate** — Serving an expired value while refreshing it in the background.
- **TTL jitter** — Random variation in expiry times.
- **Hot key** — A key with disproportionately high traffic.
- **Consistent hashing** — A key-to-node mapping that moves few keys when nodes change.
- **Virtual node** — One of many ring positions per physical node, for even distribution.
- **Hash slot** — One of Redis Cluster's 16,384 key partitions.
- **Negative caching** — Caching the fact that something does not exist.

## What comes next

Caches take load off databases; eventually the database itself must grow. The next chapter, {{ch:database-scaling}}, covers scaling databases: vertical scaling, read replicas, connection pooling, partitioning, sharding strategies, distributed SQL and the trade-offs of each step.
