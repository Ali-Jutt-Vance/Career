# Caching

> [!GOALS]
> - Explain what caching is, why it works, and what it costs: **staleness** and complexity.
> - Know the layers where caches live — browser, CDN, application memory, distributed caches such as Redis, and the database — and what each is good for.
> - Choose what to cache, for how long, and under which **keys**.
> - Apply the main strategies: **cache-aside**, **read-through**, **write-through**, **write-behind** and **refresh-ahead**.
> - Keep caches correct with **invalidation**, TTLs and versioned keys.
> - Prevent **stampedes** with request coalescing, locks, jittered expiry and **stale-while-revalidate**.
> - Use **HTTP caching** correctly: `Cache-Control`, `ETag` and conditional requests, and never cache private data in shared caches.

## Why this matters

The fastest work is work you do not do. A product page that queries the database five times for data that changes once a day, a "bestsellers" list recomputed on every request, an exchange-rate API called thousands of times an hour — each can be answered from a copy kept nearby, in a fraction of the time and at a fraction of the cost. Caching is how large sites serve millions of users from modest databases, and how small teams keep their infrastructure bills reasonable.

Caching is also, famously, one of the two hard things in computer science (with naming things). A cache is a **copy**, and copies go stale: a customer sees an old price, a deleted product still appears, an updated permission is not respected for ten minutes. Badly designed caches cause outages too — when a popular entry expires, thousands of requests rush to the database at once and knock it over. Personal data cached in the wrong layer can even leak one user's page to another.

{{ch:redis}} showed the mechanics of one cache. This chapter is about caching as a design discipline: where to cache, what to cache, how to keep caches correct, and how to stop them from failing in dangerous ways. All examples ran as shown.

## The simple idea

Think of keeping a notebook of answers you looked up recently. When someone asks you a question you answered an hour ago, you check your notebook instead of going back to the library. That is a cache. Three questions decide whether the notebook helps or hurts: Which answers are worth writing down? How long can you trust an answer before it may have changed? And when you learn that an answer changed, how do you make sure you cross out the old one?

> [!ANALOGY]
> A cache is like a notebook of answers you looked up recently: checking it is much faster than going back to the library, as long as you only write down answers worth keeping, trust them only for a sensible time, and cross them out when you learn they changed.
>
> **Where the analogy breaks:** your notebook belongs to you alone. Real caches are shared by many users and many servers at once — so one wrong entry is served to thousands of people, and when an entry expires, everyone may run to the library at the same moment. Caches need rules for sharing, not just for remembering.

## The proper definition and key words

A **cache** is a store holding copies of data — or results of computation — closer to where they are needed, so that future requests can be served faster than from the original source.

Key words:

- **Hit / miss** — the requested item was found in the cache, or was not.
- **Hit rate** (hit ratio) — the fraction of requests served from the cache.
- **Source of truth** — the authoritative store the cache copies from (usually the database).
- **TTL** (time to live) — how long an entry is kept before it expires.
- **Staleness** — how out of date a cached value may be compared with the source of truth.
- **Invalidation** — removing or updating cache entries when the source data changes.
- **Eviction** — removing entries to make room, according to a policy such as **LRU** (least recently used).
- **Cache stampede** (thundering herd, dog-piling) — many requests missing at once and all hitting the source.
- **Request coalescing** (single-flight) — letting one request load a missing value while others wait for its result.
- **Stale-while-revalidate** — serving a slightly expired value immediately while refreshing it in the background.

## Why caching works

### Level 1 — Locality and repetition

Caches work because access patterns are uneven:

- **Popularity**: a small fraction of data receives most requests — the home page, the bestsellers, the top categories. Caching that small fraction serves most traffic.
- **Repetition**: the same user, page or query repeats within short periods.
- **Cost difference**: a memory lookup takes microseconds; a database query, milliseconds; an external API call, hundreds of milliseconds.

The benefits are lower latency for users, less load on databases and services (which therefore stay healthy under traffic peaks), and lower costs. The price is **staleness** and **complexity**: every cache adds a way for users to see old data and a component that can fail.

## Where caches live

### Level 2 — The layers

```text
  browser cache ─▶ CDN / edge cache ─▶ reverse proxy ─▶ application (in-process) ─▶ distributed cache (Redis) ─▶ database (+ its own buffer cache)
   per user          shared, global       shared          per server instance          shared by all servers         source of truth
```

| Layer | What it caches | Strengths | Watch out for |
|---|---|---|---|
| **Browser** | Responses per `Cache-Control`, static files | Zero network for repeat visits | You cannot clear it remotely — use versioned file names |
| **CDN / edge** | Public responses, images, scripts, whole pages | Global, absorbs traffic peaks ({{ch:cloudfront}}) | Never cache personal responses; purge on change |
| **Application memory** | Hot objects, configuration, computed results | Fastest (nanoseconds), no network | Per instance: copies differ between servers; lost on restart; memory limits |
| **Distributed cache** (Redis, Memcached) | Query results, sessions, rendered fragments | Shared by all instances; survives app restarts ({{ch:redis}}) | Network hop; another system to run |
| **Database** | Pages in memory, materialised views ({{ch:normalization}}) | Automatic (buffer cache) or explicit (summaries) | Still uses database resources |

Large systems combine layers — for example, a short in-process cache in front of Redis, in front of the database ({{ch:caching-at-scale}}).

### Level 2 — An in-process cache with limits

The simplest cache is a `Map` in your application. Unbounded, it grows until the process runs out of memory, so real in-process caches have a **size limit**, an **eviction policy** and **expiry**:

```ts
// A bounded in-process cache that evicts the least recently used entry
class LruCache<V> {
  private map = new Map<string, { value: V; expiresAt: number }>();
  hits = 0; misses = 0;
  constructor(private maxEntries: number, private now: () => number = Date.now) {}

  get(key: string): V | undefined {
    const entry = this.map.get(key);
    if (!entry || entry.expiresAt <= this.now()) { this.misses++; this.map.delete(key); return undefined; }
    this.map.delete(key); this.map.set(key, entry);          // move to the "most recent" end
    this.hits++;
    return entry.value;
  }

  set(key: string, value: V, ttlMs: number): void {
    this.map.delete(key);
    this.map.set(key, { value, expiresAt: this.now() + ttlMs });
    if (this.map.size > this.maxEntries) this.map.delete(this.map.keys().next().value!);   // oldest first
  }

  keys() { return [...this.map.keys()]; }
}

let clock = 0;
const cache = new LruCache<string>(3, () => clock);
for (const sku of ["TEA", "COF", "OAT"]) cache.set(sku, `product ${sku}`, 60_000);
cache.get("TEA");                                            // TEA becomes most recently used
cache.set("HNY", "product HNY", 60_000);                     // over capacity: evicts COF, the least recent
console.log("in cache:", cache.keys());
console.log("COF:", cache.get("COF"), "| TEA:", cache.get("TEA"));
clock += 61_000;                                             // a minute passes: everything has expired
console.log("TEA after expiry:", cache.get("TEA"));
console.log(`hits ${cache.hits}, misses ${cache.misses}, hit rate ${(100 * cache.hits / (cache.hits + cache.misses)).toFixed(0)}%`);
```

**Output:**

```text
in cache: [ 'OAT', 'TEA', 'HNY' ]
COF: undefined | TEA: product TEA
TEA after expiry: undefined
hits 2, misses 2, hit rate 50%
```

- A JavaScript `Map` remembers insertion order, so deleting and re-inserting an entry on each access keeps the **least recently used** entry first. When the cache exceeds three entries, the first one goes.
- Reading TEA made it recent, so adding HNY evicted **COF** instead.
- Every entry has an **expiry**; after 61 seconds, TEA is gone.
- Tracking **hit rate** matters: a cache with a low hit rate costs memory and complexity for little benefit.
- The clock is a parameter so the example runs instantly and the same way every time; in production, libraries such as `lru-cache` provide this with more features.

## What to cache and for how long

### Level 3 — Good candidates

Cache data that is **read much more often than it changes**, **expensive** to produce, and **tolerant of some staleness**:

- product details, categories, prices (with care), configuration and feature flags;
- results of expensive queries and aggregations (bestsellers, dashboards);
- responses from slow or rate-limited external APIs (exchange rates, shipping quotes);
- rendered page fragments and API responses for anonymous users;
- authentication-related lookups such as public keys (JWKS, {{ch:jwt}}) and permission sets — with short TTLs.

Be careful with: stock levels and prices at checkout (verify against the database before charging), anything where staleness causes harm (permissions after revocation, account balances), and highly personalised data with low reuse.

### Level 3 — Choosing TTLs

A TTL is a business decision: **how stale may this be?**

- Categories: hours. Product details: minutes. Stock shown on listing pages: seconds to a minute. Exchange rates: whatever the provider guarantees.
- Shorter TTLs mean fresher data and more load; longer ones the reverse. Explicit invalidation (below) lets you use longer TTLs safely, with the TTL as a safety net.
- Add **jitter** — randomise TTLs slightly (for example, 300 s ± 10%) — so entries written at the same moment do not all expire at the same moment.

### Level 3 — Cache keys

A cache key must include **everything that affects the result**:

- the entity and id: `product:v1:TEA-GRN`;
- request parameters that change the output: `products:list:v1:category=tea:sort=price:page=2`;
- variations: language, currency, user role or tenant (`…:lang=en:currency=GBP`);
- a **version** segment, changed when the cached format or computation changes.

A missing component is a correctness bug — British customers seeing euro prices, or worse, one tenant seeing another's data. A key that includes too much (a timestamp, a random request id) never hits.

## Caching strategies

### Level 3 — How reads and writes interact with the cache

- **Cache-aside** (lazy loading): the application reads the cache; on a miss it loads from the database and stores the result. Writes go to the database, then **invalidate** (delete) the cache entry. Simple, resilient (if the cache is down, read the database) and the most common pattern ({{ch:redis}}).
- **Read-through**: the cache itself loads missing data from the source (a caching library or service with a loader function). The same idea as cache-aside, with the logic in one place.
- **Write-through**: every write updates the database **and** the cache together, so reads are always warm. Costs a cache write on every change, including data nobody reads.
- **Write-behind** (write-back): writes go to the cache and are flushed to the database later in batches. Very fast writes, but data can be **lost** if the cache fails before flushing; use only where that is acceptable (view counters, analytics).
- **Refresh-ahead**: popular entries are refreshed **before** they expire, by a background job or on access near expiry, so users never wait.

For most application data, **cache-aside with invalidation on write and a TTL as a safety net** is the right default.

### Level 3 — Invalidation

When the source changes, cached copies must be removed or replaced:

- **Delete on write**: after updating a product, delete its cache entries (`product:v1:TEA-GRN`, and lists that include it). Deleting is safer than overwriting, which can race with another request writing an older value.
- **Delete after commit**: invalidate only after the database transaction commits — otherwise a concurrent request may reload the old value and cache it again. For important data, a short **delayed second delete** or event-based invalidation (from the outbox, {{ch:queues}}) closes the remaining race window.
- **Versioned keys**: instead of deleting many keys, store a version number per entity or collection (`catalogue:version = 42`) and include it in keys (`products:list:v42:…`). Bumping the version makes all old keys unreachable; their TTLs clean them up.
- **Tags**: some caches and CDNs support tagging entries (`product:TEA-GRN`) and purging by tag — the Next.js cache ({{ch:nextjs}}) and several CDNs work this way.
- **Events across instances**: in-process caches on many servers need a broadcast (Redis pub/sub) to invalidate everywhere, or short TTLs.

Lists and aggregates are the hard part: one product change may affect many list pages and summaries. Versioned keys, tags and short TTLs for lists are usually more practical than tracking every dependency.

## When caches fail

### Level 4 — Stampedes and request coalescing

When a popular entry expires, every request that arrives before it is reloaded misses — and each one runs the expensive query. Here 100 concurrent requests arrive for the bestsellers list just after it expired:

```ts
// 100 requests arrive at once for a popular key that has just expired
let databaseCalls = 0;
async function loadBestsellers(): Promise<string[]> {
  databaseCalls++;
  await new Promise((r) => setTimeout(r, 50));               // a slow, expensive query
  return ["Green Tea", "Coffee Beans", "Oat Biscuits"];
}

const cache = new Map<string, string[]>();

async function naiveGet(): Promise<string[]> {
  const hit = cache.get("bestsellers");
  if (hit) return hit;
  const value = await loadBestsellers();                     // every concurrent miss queries the database
  cache.set("bestsellers", value);
  return value;
}

const inFlight = new Map<string, Promise<string[]>>();
async function coalescedGet(): Promise<string[]> {
  const hit = cache.get("bestsellers");
  if (hit) return hit;
  let pending = inFlight.get("bestsellers");
  if (!pending) {                                            // only the first miss starts a load...
    pending = loadBestsellers()
      .then((value) => { cache.set("bestsellers", value); return value; })
      .finally(() => inFlight.delete("bestsellers"));
    inFlight.set("bestsellers", pending);
  }
  return pending;                                            // ...everyone else waits for the same promise
}

for (const [name, get] of [["naive", naiveGet], ["coalesced", coalescedGet]] as const) {
  cache.clear(); databaseCalls = 0;
  const results = await Promise.all(Array.from({ length: 100 }, () => get()));
  console.log(`${name.padEnd(10)} ${results.length} requests → ${databaseCalls} database call(s)`);
}
```

**Output:**

```text
naive      100 requests → 100 database call(s)
coalesced  100 requests → 1 database call(s)
```

- **Naive**: 100 simultaneous misses, 100 identical expensive queries. With a truly popular key — thousands of requests per second — this is how a cache expiry takes a database down, often at the worst moment (a sale, a launch).
- **Coalesced**: the first miss stores its **promise** in `inFlight`; the other 99 requests await that same promise. One query serves everyone.
- This works within one process. Across many servers, each server still makes one call (acceptable for most cases); to get one call cluster-wide, use a short **Redis lock** around the reload (`SET … NX PX`, {{ch:redis}}), with other servers briefly waiting or serving stale data.

Other defences: **jittered TTLs** (so related keys do not expire together), **refresh-ahead** for the hottest keys, and **stale-while-revalidate**.

### Level 4 — Stale-while-revalidate

For many kinds of data, a value that is a few minutes old is perfectly fine for a moment longer. **Stale-while-revalidate** keeps entries in two phases: **fresh** (serve normally) and **stale** (serve immediately, but start one background refresh). Only when an entry is older than both periods must a request wait:

```ts
// Stale-while-revalidate: serve the old value instantly while one background refresh runs
type Entry<V> = { value: V; freshUntil: number; staleUntil: number };

function swrCache<V>(load: () => Promise<V>, freshMs: number, staleMs: number, now: () => number) {
  let entry: Entry<V> | undefined;
  let refreshing: Promise<void> | undefined;
  const refresh = () => (refreshing ??= load().then((value) => {
    entry = { value, freshUntil: now() + freshMs, staleUntil: now() + freshMs + staleMs };
  }).finally(() => { refreshing = undefined; }));

  return async (): Promise<{ value: V; state: string }> => {
    if (entry && now() < entry.freshUntil) return { value: entry.value, state: "fresh" };
    if (entry && now() < entry.staleUntil) { void refresh(); return { value: entry.value, state: "stale (refreshing in background)" }; }
    await refresh();                                         // nothing usable: the caller must wait
    return { value: entry!.value, state: "loaded" };
  };
}

let clock = 0, version = 0;
const getPrices = swrCache(async () => `price list v${++version}`, 60_000, 300_000, () => clock);

const show = async (label: string) => { const r = await getPrices(); console.log(label.padEnd(10), r.value, `(${r.state})`); };
await show("t=0s");
clock = 30_000;  await show("t=30s");
clock = 90_000;  await show("t=90s");
await new Promise((r) => setTimeout(r, 0));                  // let the background refresh finish
await show("t=90s+");
clock = 600_000; await show("t=600s");
```

**Output:**

```text
t=0s       price list v1 (loaded)
t=30s      price list v1 (fresh)
t=90s      price list v1 (stale (refreshing in background))
t=90s+     price list v2 (fresh)
t=600s     price list v3 (loaded)
```

- At 30 s the entry is **fresh**. At 90 s it is past its 60-second freshness but within the 5-minute stale window: the caller gets v1 **immediately**, and one refresh starts. The next call sees v2.
- At 600 s the entry is beyond both windows, so that caller waits for a load.
- `refreshing ??= …` ensures only one refresh runs at a time — coalescing again.
- The same idea exists in HTTP (`Cache-Control: max-age=60, stale-while-revalidate=300`), in CDNs, and in front-end data libraries such as TanStack Query and SWR ({{ch:state-management}}).

### Level 4 — Other failure modes

- **Cache penetration**: requests for keys that do not exist (deleted products, attackers probing random ids) always miss and always hit the database. Cache "not found" results briefly (a **negative cache**, short TTL), and validate ids early.
- **Hot keys**: one entry receiving enormous traffic overloads a single Redis node — add a short in-process cache in front ({{ch:redis}}).
- **Cold start**: after a deployment or cache restart, every request misses at once. **Warm** the most important keys before sending traffic, and protect the database with coalescing and rate limits.
- **Cache dependency**: if the cache is down, the application should fall back to the source (slower but working), with timeouts so a slow cache does not slow every request ({{ch:error-handling}}).

## HTTP caching

### Level 3 — `Cache-Control`, `ETag` and conditional requests

HTTP has caching built in: responses tell browsers and CDNs whether and how long they may reuse them. Express sets an `ETag` (a fingerprint of the body) automatically; your code sets `Cache-Control`:

```ts
import express from "express";
import { get } from "node:http";
import type { AddressInfo } from "node:net";

const app = express();
app.get("/api/categories", (_req, res) => {
  res.set("Cache-Control", "public, max-age=300");            // browsers and CDNs may reuse it for 5 minutes
  res.json([{ id: 1, name: "Tea" }, { id: 2, name: "Coffee" }]);   // Express adds an ETag automatically
});
app.get("/api/account", (_req, res) => {
  res.set("Cache-Control", "private, no-store");              // personal data: never store in shared caches
  res.json({ name: "Sara Khan", storeCredit: "6.00" });
});

const server = app.listen(0);
await new Promise((r) => server.once("listening", r));
const base = `http://localhost:${(server.address() as AddressInfo).port}`;

const first = await fetch(`${base}/api/categories`);
const etag = first.headers.get("etag")!;
console.log(first.status, first.headers.get("cache-control"), "etag present:", etag.startsWith('W/"'), "body bytes:", (await first.text()).length);

// What a browser does when its cached copy is old: ask "has it changed since this ETag?"
const revalidate = await new Promise<{ status: number; bytes: number }>((resolve) =>
  get(`${base}/api/categories`, { headers: { "If-None-Match": etag } }, (res) => {
    let bytes = 0;
    res.on("data", (c: Buffer) => (bytes += c.length)).on("end", () => resolve({ status: res.statusCode!, bytes }));
  }));
console.log(revalidate.status, "body bytes:", revalidate.bytes);   // 304: "your copy is still valid"

const account = await fetch(`${base}/api/account`);
console.log(account.status, account.headers.get("cache-control"));
server.close();
```

**Output:**

```text
200 public, max-age=300 etag present: true body bytes: 48
304 body bytes: 0
200 private, no-store
```

- **`public, max-age=300`**: any cache — browser or CDN — may reuse the response for 300 seconds without asking the server.
- **`ETag`** (here a weak validator, `W/"…"`): after `max-age` passes, the browser asks again with **`If-None-Match: <etag>`**. If the content has not changed, the server answers **`304 Not Modified`** with no body — saving bandwidth and rendering work, though not the request itself.
- **`private, no-store`**: personal data. `private` forbids shared caches (CDNs, proxies) from storing it; `no-store` forbids storing it at all.

Key `Cache-Control` directives:

| Directive | Meaning |
|---|---|
| `max-age=N` | Reuse for N seconds |
| `s-maxage=N` | Like `max-age`, for shared caches (CDNs) only |
| `no-cache` | May store, but must revalidate with the server before each use |
| `no-store` | Must not store at all |
| `public` / `private` | May be stored by shared caches / only by the user's browser |
| `stale-while-revalidate=N` | May serve stale for N seconds while revalidating in the background |
| `immutable` | Will never change during `max-age` — for versioned static files |

Two practical rules:

- **Static assets with hashed file names** (`app.3f9a1c.js`) get `Cache-Control: public, max-age=31536000, immutable`: cached for a year, and a new deployment uses new file names ({{ch:frontend-performance}}).
- **Responses that vary** by a request header must say so with `Vary` (for example, `Vary: Accept-Encoding, Accept-Language`), or a shared cache may serve the wrong variant. Never let a CDN cache responses that depend on cookies or `Authorization` unless the cache key includes them — a misconfigured CDN serving one user's account page to others is a real and serious class of incident.

## From beginner to enterprise

**Level 1–2 — first caches.** Recognising expensive, repeated work; a bounded in-process cache with TTLs; `Cache-Control` on static files and public API responses.

**Level 3 — application caching.** Cache-aside with Redis; well-designed keys with versions; TTLs chosen per data type with jitter; delete-on-write invalidation after commit; ETags and conditional requests; private data never in shared caches.

**Level 4 — production.** Request coalescing and locks against stampedes; stale-while-revalidate; negative caching; cache warming; graceful degradation when the cache fails; CDN caching with purges; monitoring hit rates, latencies and evictions per cache.

**Level 5 — senior practice.** Multi-layer caches (in-process, Redis, CDN) with consistent invalidation; event-driven invalidation from the outbox; capacity and cost planning; deciding where staleness is acceptable with product owners.

**Level 6 — enterprises.** Global caching at the edge, cache tiers per region, cache platforms with tagging and observability, and contracts on freshness for critical data ({{ch:caching-at-scale}}).

## Real-world use cases

### The product page

- **Layers**: CDN caches the anonymous product page for 60 s with `stale-while-revalidate=300`; the API caches product details in Redis for 10 minutes (key `product:v3:<sku>:lang=<lang>`), invalidated when staff edit the product; stock is fetched separately with a 15-second cache; checkout always reads stock from the database.
- **Result**: most page views never reach the API; edits appear within about a minute; checkout is always correct.

### An external exchange-rate API

- **Design**: the rate is cached in Redis for 10 minutes with refresh-ahead by a scheduled job ({{ch:cron-jobs}}); if the provider is down, the last known rate is served (with its timestamp) for up to an hour; beyond that, prices in foreign currencies are hidden rather than wrong.

## Common mistakes

### Beginner: caching without expiry or size limits

**Consequence:** memory exhaustion and permanently stale data. **Fix:** bounded caches and TTLs.

### Beginner: incomplete cache keys

**Consequence:** wrong language, currency or user's data served. **Fix:** include every input that affects the result.

### Beginner: caching personal responses publicly

**Consequence:** one user's data shown to others. **Fix:** `private, no-store`; CDNs must not cache authenticated responses unless keyed per user.

### Intermediate: invalidating before the transaction commits

**Consequence:** old values re-cached. **Fix:** invalidate after commit; consider a delayed second delete or events.

### Intermediate: no stampede protection for hot keys

**Fix:** coalescing, locks, jitter, stale-while-revalidate.

### Intermediate: trusting cached data for critical decisions

**Fix:** verify stock, prices and permissions against the source of truth where it matters.

### Production: the application fails when the cache fails

**Fix:** timeouts and fallback to the source.

### Production: caching everything "just in case"

**Consequence:** low hit rates, complexity, stale-data bugs. **Fix:** cache measured hot spots; track hit rates.

## Debugging and troubleshooting

- **Users see old data after an update**: invalidation missed a key (lists, other languages), happened before commit, or a CDN or browser layer is still serving it — check each layer's TTL and purge.
- **Low hit rate**: keys too specific (timestamps, unnecessary parameters), TTLs too short, or caching data that is rarely reused.
- **Database spikes at regular intervals**: many entries expiring together — add jitter and coalescing.
- **Memory or eviction alarms**: unbounded keys, large values, or no TTLs ({{ch:redis}}).
- **Inconsistent results between requests**: in-process caches on different servers holding different versions — shorter TTLs or broadcast invalidation.
- **Browser keeps an old script after deploy**: assets not fingerprinted, or HTML cached too long — cache HTML briefly (`no-cache`) and assets for long with hashed names.

## Security summary

- **Never cache private or authenticated responses in shared caches**; use `Cache-Control: private, no-store` and make sure CDN rules respect it.
- **Include tenant and user identity in keys** for per-user data; a missing key component is a data leak.
- **Do not cache authorisation decisions for long**; revoked permissions must take effect quickly.
- **Cache poisoning**: if unkeyed request headers influence a cached response, attackers can store malicious content for everyone — key on everything that changes the response, and ignore untrusted headers ({{ch:application-security}}).
- Protect cache infrastructure like any datastore: private network, authentication, encryption ({{ch:redis}}).

## How a senior engineer thinks about this

- **A cache is a copy, and copies go stale.** Every cache has an explicit answer to "how stale may this be?".
- **Correctness first, then speed.** Keys include every input; private data never reaches shared caches; critical decisions read the source.
- **Design for failure.** Stampedes, cold starts, hot keys and cache outages are planned for, not discovered.
- **Measure.** Hit rates, latency and source load decide whether a cache earns its complexity.
- **The best cache is the layer closest to the user that is still correct.** Static assets at the edge, shared data in Redis, hot values in process.

## Exercises

### Exercise 1 — Design the keys

**Objective:** practise cache-key design.
**What to do:** write cache keys for: (1) a product's details shown in English or Arabic, priced in GBP or PKR; (2) page 3 of the tea category sorted by price; (3) a logged-in customer's order history page; (4) the shop's opening hours. For each, say what should invalidate it.

<details>
<summary>Show the solution</summary>

1. `product:v2:TEA-GRN:lang=ar:currency=PKR` — invalidated when the product (name, description, price) changes, by deleting all its language/currency variants (or bumping a per-product version stored in `product:TEA-GRN:version` and included in the key).
2. `catalogue:v{N}:category=tea:sort=price:page=3` — `{N}` is a catalogue version bumped when any product in the catalogue changes; old pages expire through a short TTL (a few minutes).
3. `customer:41:orders:v1:page=1` — or do not cache at all; per-user data has low reuse. If cached, invalidate when that customer places or updates an order, and store only in a private cache layer (never a CDN).
4. `shop:opening-hours:v1` — long TTL (hours), invalidated when staff edit opening hours; safe for CDNs.

</details>

### Exercise 2 — Choose the strategy

**Objective:** practise matching strategies to data.
**What to do:** choose a caching strategy and TTL for: (1) product page view counters; (2) a customer's shopping cart; (3) the public "bestsellers this week" list; (4) feature flags read on every request; (5) the current price at checkout.

<details>
<summary>Show the solution</summary>

1. **Write-behind**: `INCR` in Redis on each view, flushed to the database every minute — losing a few counts in a crash is acceptable.
2. **Not a cache** — store the cart in Redis as primary storage with a long TTL (or in the database); it is the user's data, not a copy ({{ch:redis}}).
3. **Refresh-ahead** or cache-aside with **stale-while-revalidate**: recompute every 10 minutes in a job, serve stale while refreshing; CDN `s-maxage` for anonymous users.
4. **In-process cache** with a short TTL (10–30 s) refreshed in the background, or pushed updates via pub/sub — they are read constantly and change rarely.
5. **No cache for the decision**: read the price from the database inside the checkout transaction; cached prices may be shown on pages, but the charge uses the source of truth.

</details>

### Exercise 3 — Review a caching implementation

**Objective:** practise spotting caching bugs.
**The scenario:** an API caches `GET /products?category=…` in Redis under the key `products` for 24 hours. Product updates do not touch the cache. The account endpoint responds with `Cache-Control: public, max-age=600` "for speed". When Redis times out, the API returns `500`. Every product entry was cached at deployment time with the same TTL. List the problems and fixes.

<details>
<summary>Show the solution</summary>

1. **Key ignores the category** → every category shows whichever list was cached first. Key on all parameters: `products:v1:category=<c>:page=<p>`.
2. **No invalidation, 24-hour TTL** → edits invisible for a day. Invalidate (or version) on product changes; shorter TTL for lists.
3. **Account endpoint public for 10 minutes** → CDNs and proxies can serve one customer's account to others. `private, no-store`.
4. **500 when Redis times out** → cache failure becomes an outage. Short timeout, fall back to the database.
5. **Same TTL for everything cached at once** → all entries expire together, causing a stampede every 24 hours. Jittered TTLs, coalescing, warming.

</details>

### Exercise 4 — Production scenario: the midnight spike

**Objective:** practise diagnosing cache-related incidents.
**The scenario:** every night at exactly 00:00, database CPU jumps to 100% for about two minutes and API latency rises, then everything recovers. Traffic is low at that time. What is likely happening and how do you fix it?

<details>
<summary>Show the solution</summary>

**Likely cause:** a synchronised expiry. Something writes many cache entries at the same time with the same TTL — for example, a nightly job that warms the cache at 00:00 with 24-hour TTLs, or entries keyed by date (`bestsellers:2026-11-20`) that all become new keys at midnight. At 00:00 they all miss together, and every miss runs an expensive query: a stampede, even with low traffic, because each entry is recomputed by many concurrent requests.

**How to confirm:** cache miss rate and database query counts per minute around midnight; which keys are recomputed (logging on misses).

**Fixes:**
1. **Jitter** TTLs so entries expire spread over a window.
2. **Coalescing** (and a Redis lock for cluster-wide single loads) so each key is recomputed once.
3. **Refresh-ahead**: have the job recompute the next day's entries before midnight, or refresh popular keys before expiry.
4. **Stale-while-revalidate** for date-keyed entries: serve the previous day's value briefly while the new day's is computed.
5. Watch the effect on the database dashboard for the next few nights.

</details>

## Summary

A **cache** keeps copies of data or results closer to where they are needed, exploiting the fact that a small fraction of data receives most requests and that memory is far faster than databases or remote services. The price is **staleness** and complexity. Caches live in layers — **browser**, **CDN**, reverse proxy, **in-process** memory (bounded, with LRU eviction and expiry), **distributed caches** such as Redis, and the database — and systems often combine them.

Cache data that is read far more than it changes, expensive to produce and tolerant of staleness; choose **TTLs** as business decisions with jitter; and build **keys** from everything that affects the result, plus a version. **Cache-aside** with delete-on-write **invalidation** after commit and a TTL safety net is the usual default; read-through, write-through, write-behind and refresh-ahead serve special needs. Versioned keys and tags make invalidating lists practical.

Caches fail in specific ways: **stampedes** when hot entries expire (prevent with **request coalescing**, locks, jitter and **stale-while-revalidate**), penetration (negative caching), hot keys, cold starts and cache outages (fall back to the source). **HTTP caching** uses `Cache-Control` (`max-age`, `s-maxage`, `no-cache`, `no-store`, `public`, `private`, `immutable`, `stale-while-revalidate`), `ETag`s with `304 Not Modified`, and `Vary`; private data must never be stored by shared caches.

## Key terms

- **Cache** — A store of copies of data or results kept closer to where they are needed.
- **Cache hit / cache miss** — A request served from the cache, or one that must go to the source.
- **Hit rate** — The proportion of requests served from the cache.
- **Source of truth** — The authoritative store that a cache copies.
- **Staleness** — How out of date a cached value may be.
- **TTL (cache)** — The time an entry remains valid before expiring.
- **TTL jitter** — Randomising expiry times so entries do not expire simultaneously.
- **Eviction** — Removing entries to make room under a size limit.
- **LRU (least recently used)** — An eviction policy removing the entry unused for the longest time.
- **In-process cache** — A cache in an application's own memory.
- **Distributed cache** — A cache shared by many application instances, such as Redis.
- **CDN cache** — Copies of responses stored at edge locations near users.
- **Cache key** — The identifier under which an entry is stored, including all inputs that affect it.
- **Cache-aside** — Loading from the source on a miss and storing the result; invalidating on writes.
- **Read-through** — A cache that loads missing entries from the source itself.
- **Write-through** — Updating the cache and the source together on every write.
- **Write-behind (write-back)** — Writing to the cache first and flushing to the source later.
- **Refresh-ahead** — Refreshing entries before they expire.
- **Cache invalidation** — Removing or updating entries when the source data changes.
- **Versioned keys** — Including a version in keys so bumping it makes old entries unreachable.
- **Cache stampede** — Many requests missing simultaneously and overloading the source.
- **Request coalescing (single-flight)** — Sharing one in-progress load among concurrent requests for the same key.
- **Stale-while-revalidate** — Serving a slightly expired value while refreshing it in the background.
- **Negative caching** — Caching "not found" results briefly to protect the source.
- **Cache warming** — Loading important entries before traffic arrives.
- **Cache-Control** — The HTTP header that controls how responses are cached.
- **ETag** — An HTTP fingerprint of a response used to check whether a cached copy is still valid.
- **304 Not Modified** — The HTTP response indicating a cached copy remains valid.
- **Vary** — The HTTP header listing request headers that change the response.
- **Cache poisoning** — Tricking a shared cache into storing and serving malicious content.

## What comes next

Caching reduces load on a single database; eventually one database server is not enough on its own. The next chapter, {{ch:replication}}, covers keeping copies of the whole database on several servers: primaries and replicas, synchronous and asynchronous replication, read replicas and replication lag, failover and high availability, and the consistency questions that every copy raises.
