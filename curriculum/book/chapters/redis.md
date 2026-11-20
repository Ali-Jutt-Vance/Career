# Redis

> [!GOALS]
> - Explain what Redis is, why it is so fast, and where it sits in a typical architecture.
> - Use Redis's data structures — **strings**, **hashes**, **lists**, **sets**, **sorted sets** and **streams** — and choose the right one for a job.
> - Implement the everyday patterns: caching, sessions, counters, rate limiting, leaderboards, distributed locks, queues and pub/sub.
> - Make multi-step operations safe with **atomic commands**, `MULTI` transactions and **Lua scripts**.
> - Manage keys, expiry and **memory** (eviction policies), and understand **persistence** and its limits.
> - Run Redis reliably: replication, Sentinel, Cluster, managed services, connection handling and security.

## Why this matters

Almost every production web system has Redis (or a compatible store such as Valkey) somewhere. It caches expensive database results, stores sessions ({{ch:sessions}}), counts requests for rate limiting ({{ch:rate-limiting}}), holds job queues for BullMQ ({{ch:queues}}), keeps leaderboards, coordinates distributed locks ({{ch:cron-jobs}}), and broadcasts messages between real-time servers ({{ch:websockets}}). It appears in this book in a dozen places; this chapter explains it properly.

Redis is popular because it is **fast** — commands typically complete in microseconds — and because it offers **data structures**, not just keys and values: sorted sets for rankings, hashes for small objects, streams for event logs. Using the right structure turns hard problems (a real-time top-100 leaderboard, a race-free counter) into a single command.

Redis is also easy to misuse. It keeps data in memory, so it is not automatically a safe place for data you cannot lose; a full Redis evicts or rejects data according to its configuration; and a single slow command blocks every client. Knowing these properties is what separates using Redis well from creating a fragile dependency. Every example in this chapter ran against a real Redis 8 server, and the outputs are exactly what it printed.

## The simple idea

Picture a chef's workstation. The main pantry (the database) holds everything, carefully organised, but walking there takes time. The workstation holds the few ingredients the chef uses constantly — chopped, measured, within arm's reach. Grabbing from the workstation is instant; if something is not there, the chef fetches it from the pantry and keeps some at hand for next time. The workstation also has a few useful tools of its own: a ticket rail for orders, a tally board, a timer.

Redis is that workstation: a small, extremely fast store held in memory, used beside the main database for things that must be quick, temporary or coordinated.

> [!ANALOGY]
> Redis is like a chef's workstation next to the pantry: a small, instantly reachable space for the ingredients used constantly, plus handy tools — a ticket rail (queues), a tally board (counters), a ranking board (sorted sets).
>
> **Where the analogy breaks:** a workstation's ingredients do not vanish if the power flickers. Redis keeps data in memory; depending on its persistence settings, a crash can lose recent writes, and when memory fills up it may evict data deliberately. Anything that must never be lost belongs in the pantry — the database — with Redis holding copies or temporary state.

## The proper definition and key words

**Redis** is an open-source, in-memory data store that holds keys mapped to typed data structures, accessed over the network with simple commands, offering optional persistence to disk, replication and clustering.

Key words:

- **Key** — the name of a stored value, such as `session:abc123`; keys are binary-safe strings, conventionally structured with colons.
- **TTL** (time to live) — an expiry time on a key, after which Redis deletes it.
- **String** — the basic value type: text, numbers or binary data up to 512 MB.
- **Hash** — a map of fields to values under one key, like a small object.
- **List** — an ordered sequence, with fast pushes and pops at both ends.
- **Set** — an unordered collection of unique members.
- **Sorted set** (ZSET) — unique members ordered by a numeric score.
- **Stream** — an append-only log of entries with IDs, supporting consumer groups.
- **Pub/sub** — publishing messages to channels for whoever is subscribed at that moment.
- **Eviction policy** — what Redis removes when it reaches its memory limit.
- **RDB / AOF** — Redis's two persistence mechanisms: periodic snapshots and an append-only log of writes.
- **Valkey** — an open-source fork of Redis, compatible with its commands, offered by several cloud providers.

## Why Redis is fast

### Level 2 — Memory, simple commands and one thread

- **In memory**: data lives in RAM, so reads and writes avoid disk access.
- **Simple, well-defined operations**: each command does one job on one data structure, with documented complexity (`GET` is O(1); `ZADD` is O(log N)).
- **A single main thread executes commands one at a time** (with background threads for networking and persistence). There are no locks to contend for, and **every command is atomic**: two clients' `INCR`s can never interleave badly.
- **Pipelining**: clients can send many commands without waiting for each reply, cutting network round trips.

The flip side of a single command thread: a slow command (`KEYS *` on millions of keys, `SMEMBERS` on a huge set, a long Lua script) blocks **every** client until it finishes. Use incremental commands (`SCAN`, `SSCAN`, `ZSCAN`) for large collections and keep scripts short.

## Data structures

### Level 2 — The core types in action

```ts
import { Redis } from "ioredis";

const redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379");
await redis.flushdb();                                      // start empty so the example can be rerun

// Strings: values with an optional expiry
await redis.set("session:abc123", JSON.stringify({ userId: 41, role: "customer" }), "EX", 1800);
console.log("session:", JSON.parse((await redis.get("session:abc123"))!), "ttl:", await redis.ttl("session:abc123"));

// Atomic counters
await redis.incr("page:views:home");
await redis.incrby("page:views:home", 4);
console.log("views:", await redis.get("page:views:home"));

// Hashes: a small object stored field by field
await redis.hset("cart:41", { "TEA-GRN": 2, "SNK-OAT": 1 });
await redis.hincrby("cart:41", "TEA-GRN", 1);
console.log("cart:", await redis.hgetall("cart:41"));

// Lists: ordered, push and pop at either end
await redis.rpush("recently-viewed:41", "TEA-GRN", "COF-BNS", "SNK-OAT");
await redis.ltrim("recently-viewed:41", -2, -1);            // keep only the last two
console.log("recent:", await redis.lrange("recently-viewed:41", 0, -1));

// Sets: unique members, set operations
await redis.sadd("product:TEA-GRN:tags", "organic", "vegan", "vegan");
await redis.sadd("product:SNK-OAT:tags", "vegan", "gluten-free");
console.log("tags:", (await redis.smembers("product:TEA-GRN:tags")).sort(), "shared:", await redis.sinter("product:TEA-GRN:tags", "product:SNK-OAT:tags"));

// Sorted sets: members ordered by score (a leaderboard)
await redis.zadd("leaderboard:nov", 120, "sara", 340, "omar", 95, "li");
await redis.zincrby("leaderboard:nov", 50, "li");
console.log("top 2:", await redis.zrevrange("leaderboard:nov", 0, 1, "WITHSCORES"), "li's rank:", await redis.zrevrank("leaderboard:nov", "li"));

redis.disconnect();
```

**Output:**

```text
session: { userId: 41, role: 'customer' } ttl: 1800
views: 5
cart: { 'TEA-GRN': '3', 'SNK-OAT': '1' }
recent: [ 'COF-BNS', 'SNK-OAT' ]
tags: [ 'organic', 'vegan' ] shared: [ 'vegan' ]
top 2: [ 'omar', '340', 'li', '145' ] li's rank: 1
```

| Type | Commands seen here | Typical uses |
|---|---|---|
| **String** | `SET … EX`, `GET`, `TTL`, `INCR`, `INCRBY` | Cached JSON, sessions, feature flags, counters |
| **Hash** | `HSET`, `HINCRBY`, `HGETALL` | Shopping carts, small objects whose fields change independently |
| **List** | `RPUSH`, `LTRIM`, `LRANGE` | "Recently viewed", simple queues, capped logs |
| **Set** | `SADD`, `SMEMBERS`, `SINTER` | Tags, unique visitors, "who is online", relationships |
| **Sorted set** | `ZADD`, `ZINCRBY`, `ZREVRANGE`, `ZREVRANK` | Leaderboards, priority queues, time-ordered indexes, sliding-window rate limits |
| **Stream** | `XADD`, `XREADGROUP`, `XACK` | Event logs, durable work queues with consumer groups |

Points to notice:

- `SET … EX 1800` stored the session with a **30-minute expiry**; Redis deletes it automatically.
- `INCR` and `HINCRBY` are **atomic**, so thousands of concurrent increments never lose a count.
- Redis stores **strings**: the cart's quantities came back as `'3'` and `'1'`, and numbers you store are returned as text. Convert on the way out.
- Adding `"vegan"` twice to a set kept one copy; `SINTER` found the tags two products share.
- Li's score rose from 95 to 145, moving her to rank 1 (ranks start at 0). Sorted sets keep members ordered at all times, so "top 10" or "my rank" is one O(log N) command, even among millions of players.

Other structures worth knowing: **bitmaps** and **HyperLogLog** (approximate distinct counts in tiny memory — "unique visitors today"), **geospatial** indexes (`GEOADD`, `GEOSEARCH` — "stores within 5 km"), and in Redis 8, built-in JSON documents, probabilistic structures and vector search.

### Level 2 — Keys and expiry

Good key design keeps a Redis instance understandable:

- **Namespaced names**: `app:entity:id[:field]` — `product:v1:TEA-GRN`, `rate:login:203.0.113.9`. A version segment (`v1`) lets you change the cached format without clashing with old entries.
- **TTL on everything temporary**: caches, sessions, rate-limit windows, locks. Keys without expiry live until deleted — a common source of slow memory growth.
- **Small keys and values**: values are copied over the network on every read; huge hashes and lists make individual commands slow.

## Everyday patterns

### Level 3 — Caching with cache-aside

The most common use: keep the results of expensive work so it is not repeated. With **cache-aside**, the application checks Redis first and, on a miss, loads from the database and stores the result with a TTL:

```ts
import { Redis } from "ioredis";

const redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379");
await redis.flushdb();

let databaseReads = 0;
async function loadProductFromDatabase(sku: string) {        // stands in for a slow SQL query
  databaseReads++;
  return { sku, name: sku === "TEA-GRN" ? "Green Tea" : "Coffee Beans", price: "4.20" };
}

// Cache-aside: look in the cache first; on a miss, load from the database and store with a TTL
async function getProduct(sku: string) {
  const key = `product:v1:${sku}`;
  const cached = await redis.get(key);
  if (cached) return { ...JSON.parse(cached), from: "cache" };
  const product = await loadProductFromDatabase(sku);
  await redis.set(key, JSON.stringify(product), "EX", 300);
  return { ...product, from: "database" };
}

async function updateProductPrice(sku: string, price: string) {
  // ... UPDATE products SET price = ... in the database, then:
  await redis.del(`product:v1:${sku}`);                     // invalidate so the next read reloads
}

for (const sku of ["TEA-GRN", "TEA-GRN", "TEA-GRN", "COF-BNS"]) console.log((await getProduct(sku)).from);
await updateProductPrice("TEA-GRN", "4.50");
console.log("after update:", (await getProduct("TEA-GRN")).from);
console.log("database reads:", databaseReads);

redis.disconnect();
```

**Output:**

```text
database
cache
cache
database
after update: database
database reads: 3
```

Five reads cost three database queries: the first read of each product, and the read after the update deleted the stale entry. The TTL (5 minutes) bounds how stale data can be if an invalidation is ever missed. Caching has more to it — what to cache, invalidation strategies, stampedes when a popular key expires, consistency between cache and database — and the next chapter, {{ch:caching}}, covers it in depth.

### Level 3 — Locks and rate limits: atomicity in practice

```ts
import { Redis } from "ioredis";
import { randomUUID } from "node:crypto";

const redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379");
await redis.flushdb();

// A lock with an owner token and an expiry; released only by its owner (atomically, with a Lua script)
const RELEASE = `if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("del", KEYS[1]) else return 0 end`;

async function withLock(name: string, ttlMs: number, work: () => Promise<void>): Promise<boolean> {
  const token = randomUUID();
  const acquired = await redis.set(`lock:${name}`, token, "PX", ttlMs, "NX");
  if (acquired !== "OK") return false;
  try {
    await work();
    return true;
  } finally {
    await redis.eval(RELEASE, 1, `lock:${name}`, token);
  }
}

const results = await Promise.all(["worker-1", "worker-2", "worker-3"].map((w) =>
  withLock("nightly-invoices", 10_000, async () => { await new Promise((r) => setTimeout(r, 100)); })
    .then((ran) => `${w}: ${ran ? "ran the job" : "skipped (lock held)"}`)));
results.forEach((r) => console.log(r));
console.log("lock left behind:", await redis.exists("lock:nightly-invoices"));

// A fixed-window rate limiter: INCR and EXPIRE in one atomic transaction
async function allow(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const [[, count]] = (await redis.multi().incr(key).expire(key, windowSeconds, "NX").exec()) as [[null, number], unknown];
  return count <= limit;
}
const decisions = [];
for (let i = 0; i < 5; i++) decisions.push(await allow("rate:login:203.0.113.9", 3, 60));
console.log("login attempts allowed:", decisions);

redis.disconnect();
```

**Output:**

```text
worker-1: ran the job
worker-2: skipped (lock held)
worker-3: skipped (lock held)
lock left behind: 0
login attempts allowed: [ true, true, true, false, false ]
```

**The lock:**

- `SET lock:… <token> PX 10000 NX` sets the key only if it does **not** exist (`NX`), with a 10-second expiry (`PX`) — all in one atomic command. Only one of the three workers succeeds.
- The **expiry** guarantees the lock disappears even if its holder crashes.
- Release must delete the lock **only if this worker still owns it**. A plain `DEL` could delete a lock that expired and was taken by another worker. "Check the token, then delete" must be atomic, so it runs as a **Lua script** (`EVAL`), which Redis executes without interruption.
- Caveats: if the work runs longer than the TTL, the lock expires while work continues — choose a generous TTL, extend it while working, and make the work idempotent ({{ch:cron-jobs}}). A single-instance Redis lock is a coordination tool to avoid duplicate work, not a guarantee strong enough for correctness-critical decisions; for those, rely on database constraints and transactions ({{ch:transactions}}).

**The rate limiter:**

- `MULTI` … `EXEC` queues commands and executes them together, so no other client's command runs in between. `INCR` counts the attempt; `EXPIRE … NX` sets the 60-second window only when the key has no expiry yet (the first attempt).
- The fourth and fifth attempts exceed the limit of three. For sliding windows and token buckets with Lua, see {{ch:rate-limiting}}.

**Three tools for atomicity:** single commands are atomic by themselves (`INCR`, `SET … NX`, `ZINCRBY`); **`MULTI`/`EXEC`** runs a fixed batch without interleaving (but cannot make decisions based on values read inside it — `WATCH` adds optimistic checking); **Lua scripts** (`EVAL`, or Redis **functions**) run logic that reads, decides and writes atomically.

### Level 3 — Messaging: pub/sub and streams

**Pub/sub** delivers a message to every client subscribed to a channel **at that moment**:

```ts
// fragment
const subscriber = new Redis(url);
await subscriber.subscribe("orders:updates");
subscriber.on("message", (channel, message) => broadcastToWebSocketClients(JSON.parse(message)));

await publisher.publish("orders:updates", JSON.stringify({ orderId: 1042, status: "shipped" }));
```

It is fire-and-forget: subscribers that are disconnected miss messages, and nothing is stored. That suits live notifications between real-time servers ({{ch:websockets}}) and cache-invalidation broadcasts — not work that must be done.

**Streams** are durable, append-only logs. **Consumer groups** let several workers share entries, track which were acknowledged, and recover unacknowledged ones:

```ts
import { Redis } from "ioredis";

const redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379");
await redis.flushdb();

// A stream is an append-only log; consumer groups share the work and track what was processed
await redis.xgroup("CREATE", "orders:events", "emailers", "$", "MKSTREAM");
for (const id of [1042, 1043, 1044]) await redis.xadd("orders:events", "*", "type", "order.placed", "orderId", String(id));

type Entries = [string, [string, string[]][]][] | null;
const read = async (consumer: string) => {
  const res = (await redis.xreadgroup("GROUP", "emailers", consumer, "COUNT", 2, "STREAMS", "orders:events", ">")) as Entries;
  return res ? res[0]![1] : [];
};

const a = await read("emailer-a");                          // gets the first two entries
const b = await read("emailer-b");                          // gets the remaining one
console.log("emailer-a got orders", a.map(([, f]) => f[3]), "emailer-b got", b.map(([, f]) => f[3]));

await redis.xack("orders:events", "emailers", ...a.map(([id]) => id));        // a finished its work; b has not
const pending = await redis.xpending("orders:events", "emailers");
console.log("still pending:", pending[0], "message(s), held by", (pending[3] as [string, string][]).map(([c, n]) => `${c} (${n})`));
console.log("stream length:", await redis.xlen("orders:events"));

redis.disconnect();
```

**Output:**

```text
emailer-a got orders [ '1042', '1043' ] emailer-b got [ '1044' ]
still pending: 1 message(s), held by [ 'emailer-b (1)' ]
stream length: 3
```

- `XADD … *` appends an entry with an automatically generated, time-based ID.
- `XREADGROUP … >` gives each consumer **new** entries not yet delivered to the group: emailer-a received orders 1042 and 1043, emailer-b received 1044.
- `XACK` marks entries as processed. Unacknowledged entries stay in the **pending entries list** — if emailer-b crashed, another consumer could claim its entry (`XAUTOCLAIM`) and process it. This gives at-least-once delivery, so consumers should be idempotent ({{ch:queues}}).
- The stream keeps its history (length 3) until trimmed (`XTRIM` or `MAXLEN` on `XADD`).

For background jobs in Node.js, most teams use **BullMQ**, which builds retries, delays, priorities and dashboards on Redis ({{ch:queues}}). For high-volume event streaming with long retention and replay across many consumer groups, Kafka is the usual step up ({{ch:message-brokers}}).

## Memory and persistence

### Level 3 — When memory runs out

Redis holds everything in RAM, so memory is the main capacity limit. `maxmemory` sets the limit, and **`maxmemory-policy`** decides what happens when it is reached:

| Policy | Behaviour | Suits |
|---|---|---|
| `noeviction` | Reject writes with an error | Data that must not disappear: queues (BullMQ requires it), locks |
| `allkeys-lru` / `allkeys-lfu` | Evict least recently / least frequently used keys | Pure caches |
| `volatile-lru` / `volatile-ttl` | Evict only keys that have a TTL | Mixed use: caches with TTLs plus persistent keys without |

Mixing a cache that should evict with a queue that must never lose jobs in one instance invites trouble — often they belong in **separate Redis instances** with different policies. Monitor memory use, eviction counts and the largest keys (`redis-cli --bigkeys`, `MEMORY USAGE key`).

### Level 3 — Persistence: what survives a restart

- **RDB snapshots**: Redis periodically writes the whole dataset to a file. Compact and quick to restore, but a crash loses everything since the last snapshot (often minutes).
- **AOF (append-only file)**: every write is appended to a log, flushed to disk every second by default (`appendfsync everysec`), so a crash loses about one second of writes. The log is periodically rewritten to stay compact.
- **Both** can be enabled; **neither** for pure caches that can be rebuilt.

Even with AOF, Redis is not a substitute for a transactional database for important records: replication is asynchronous, and failover can lose acknowledged writes. Keep the source of truth in PostgreSQL (or similar), and use Redis for copies, temporary state and coordination.

## Running Redis in production

### Level 4 — Availability and scale

- **Replication**: replicas copy the primary asynchronously and can serve reads ({{ch:replication}}).
- **Sentinel**: monitors a primary and its replicas and promotes a replica automatically if the primary fails; clients ask Sentinel for the current primary.
- **Redis Cluster**: shards keys across several primaries by hashing them into 16,384 slots ({{ch:sharding}}). Multi-key commands and transactions work only when all keys are in the same slot — **hash tags** (`{cart:41}:items`, `{cart:41}:total`) force related keys together.
- **Managed services**: Amazon ElastiCache and MemoryDB, Google Memorystore, Azure Cache, Redis Cloud, Upstash and others handle failover, patching and backups ({{ch:aws-overview}}).

### Level 4 — Clients and connections

- **Reuse connections**: one client (or a small pool) per process, created at start-up. Pub/sub subscribers and blocking commands (`BLPOP`, `XREADGROUP … BLOCK`) need **dedicated** connections, because a subscribed connection cannot run other commands.
- **Timeouts and retries**: set connect and command timeouts; decide what the application does when Redis is unavailable — serve from the database without caching (degrade gracefully), or fail fast for features that depend on it ({{ch:error-handling}}).
- **Pipeline** batches of commands (`redis.pipeline()…exec()`) to save round trips; ioredis can pipeline automatically.
- **Avoid blocking commands on big data**: no `KEYS *` in production — use `SCAN`.
- **Monitor**: memory, evictions, hit rate (`keyspace_hits` / `keyspace_misses` in `INFO`), connected clients, command latency (`SLOWLOG`), replication lag ({{ch:monitoring}}).

## From beginner to enterprise

**Level 1–2 — first Redis.** `SET`/`GET` with TTLs, `INCR` counters, hashes and lists; connecting from Node.js; key naming conventions.

**Level 3 — application patterns.** Cache-aside with invalidation; sessions; sorted-set leaderboards; atomic locks with tokens and Lua release; `MULTI`/`EXEC` and Lua for atomic multi-step logic; pub/sub for live updates; streams with consumer groups; BullMQ queues.

**Level 4 — production.** Separate instances or policies for caches and queues; `maxmemory` and eviction policies; persistence choices; Sentinel or managed failover; dedicated connections for subscribers; timeouts and graceful degradation; monitoring hit rates, memory and slow commands.

**Level 5 — senior practice.** Redis Cluster with hash tags; capacity planning for memory; designing what may and may not live only in Redis; hot-key and big-key mitigation; multi-region caching strategies ({{ch:caching-at-scale}}).

**Level 6 — enterprises.** Fleets of Redis clusters run as a platform service; data classification for in-memory stores; standardised client libraries with retries, metrics and circuit breakers.

## Real-world use cases

### Shop-wide sessions and carts

- **Design**: sessions as strings with a TTL refreshed on activity; carts as hashes (`HINCRBY` per item) with a 30-day TTL; at checkout, the cart is read and the order written to PostgreSQL in a transaction, then the cart deleted.
- **Why Redis**: fast reads on every request; atomic per-item updates; automatic expiry of abandoned carts; any app server can serve any user.

### A live leaderboard for a tasting challenge

- **Design**: one sorted set per month; `ZINCRBY` when a customer earns points; `ZREVRANGE 0 9 WITHSCORES` for the top 10; `ZREVRANK` for "your position"; names fetched with a hash or from the database for the top entries only; the month's final standings copied to PostgreSQL.

## Common mistakes

### Beginner: keys without TTLs

**Consequence:** memory grows until eviction or errors. **Fix:** expiry on every temporary key.

### Beginner: `KEYS *` in production

**Consequence:** Redis blocked for every client. **Fix:** `SCAN`.

### Beginner: storing the only copy of important data in Redis

**Fix:** keep the source of truth in a durable database.

### Intermediate: read–modify–write across commands

`GET` a counter, add in code, `SET` it back. **Consequence:** lost updates. **Fix:** atomic commands, `MULTI`, or Lua.

### Intermediate: releasing locks with plain `DEL`

**Consequence:** deleting another holder's lock. **Fix:** token check and delete in one Lua script.

### Intermediate: one Redis for caches and queues with an evicting policy

**Consequence:** jobs evicted under memory pressure. **Fix:** separate instances, `noeviction` for queues.

### Production: huge values and collections

**Consequence:** slow commands and network spikes. **Fix:** split data; keep values small; paginate with `SSCAN`/`ZSCAN`.

### Production: no plan for Redis being down

**Fix:** timeouts, graceful degradation for caches, clear failures for dependent features.

## Debugging and troubleshooting

- **Values come back as strings**: Redis stores strings; parse numbers and JSON when reading.
- **Memory keeps growing**: keys without TTLs, or an unbounded list or stream — find big keys and keys with no expiry (`TTL` returns -1).
- **Sudden cache misses after deploy**: the key format changed — version keys (`v2`) and expect a warm-up period.
- **Latency spikes**: slow commands (`SLOWLOG GET`), big keys, persistence forks on large datasets, or network saturation.
- **"OOM command not allowed"**: the memory limit was reached with `noeviction` — increase memory, reduce data, or split workloads.
- **"MOVED" or "CROSSSLOT" errors**: Redis Cluster — use a cluster-aware client and hash tags for multi-key operations.

## Security summary

- **Never expose Redis to the internet.** Bind to private networks, use firewalls or security groups ({{ch:vpc}}); open Redis instances are attacked within minutes.
- **Require authentication** (ACL users with passwords) and **TLS** in transit; give each application its own ACL user with only the commands and key patterns it needs.
- **Disable or rename dangerous commands** for application users (`FLUSHALL`, `CONFIG`, `DEBUG`).
- **Sessions and tokens in Redis are credentials**: protect access, set TTLs, and avoid storing sensitive personal data unnecessarily.
- Treat Lua scripts and keys built from user input carefully; never let users choose arbitrary key names.

## How a senior engineer thinks about this

- **Redis is a companion, not the source of truth.** Data that must not be lost lives in a durable database.
- **Choose the structure first.** The right data type turns complex logic into one atomic command.
- **Atomicity is the superpower.** Single commands, `MULTI` and Lua scripts make concurrency simple — read–modify–write in application code throws it away.
- **Memory is the budget.** TTLs, eviction policies, separate instances and big-key monitoring are designed in.
- **Plan for absence.** Every Redis dependency has a timeout and a defined behaviour when Redis is unavailable.

## Exercises

### Exercise 1 — Choose the data structure

**Objective:** practise mapping problems to Redis types.
**What to do:** choose a structure and the main commands for: (1) counting unique visitors per day approximately; (2) storing a product's stock reservations for 15 minutes per cart; (3) "people who viewed this also viewed" for the latest 50 products a user viewed; (4) a queue of image-processing jobs that must not be lost if a worker crashes; (5) the 20 most recent orders shown on an admin dashboard; (6) online users in a support chat.

<details>
<summary>Show the solution</summary>

1. **HyperLogLog** — `PFADD visitors:2026-11-20 <userId>`, `PFCOUNT` (about 12 KB per day regardless of visitor count; ~0.8% error).
2. **String with TTL** per reservation — `SET reserve:<cartId>:<sku> <qty> EX 900` — expiry releases it automatically (the authoritative stock still lives in the database).
3. **List** — `LPUSH viewed:<userId> <sku>` then `LTRIM viewed:<userId> 0 49`.
4. **Stream with a consumer group** (or BullMQ) — `XADD`, `XREADGROUP`, `XACK`, `XAUTOCLAIM` for crashed workers; `noeviction` policy.
5. **Sorted set** scored by timestamp — `ZADD recent-orders <ts> <orderId>`, `ZREMRANGEBYRANK recent-orders 0 -21` to keep 20, `ZREVRANGE 0 19` to read (or a capped list).
6. **Set** of user ids — `SADD online:support <userId>` on connect, `SREM` on disconnect, or a sorted set scored by last heartbeat so stale entries can be removed with `ZREMRANGEBYSCORE`.

</details>

### Exercise 2 — Fix the counter

**Objective:** practise atomicity.
**What to do:** this code limits each voucher to 100 redemptions: `const used = Number(await redis.get(key) ?? 0); if (used >= 100) throw new Error("exhausted"); await redis.set(key, used + 1);`. Explain the bug and fix it with a single atomic operation.

<details>
<summary>Show the solution</summary>

**Bug:** read–modify–write across three commands. Two requests can both read 99, both pass the check, and both write 100 — allowing 101 (or more) redemptions under load.

**Fix — increment first, then check:**

```ts
// fragment
const used = await redis.incr(`voucher:${code}:redemptions`);
if (used > 100) {
  await redis.decr(`voucher:${code}:redemptions`);      // give back the slot we took
  throw new Error("voucher exhausted");
}
```

`INCR` is atomic, so every request gets a unique count; exactly 100 requests see a value of 100 or less. (A Lua script can do "increment only if below the limit" in one step without the compensating `DECR`.) For money-related vouchers, record each redemption in the database with a unique constraint as the source of truth; Redis is the fast first check ({{ch:transactions}}).

</details>

### Exercise 3 — Review a Redis set-up

**Objective:** practise spotting operational risks.
**The scenario:** one Redis instance (no password, port open to the internet for convenience) stores caches, sessions and BullMQ queues, with `maxmemory-policy allkeys-lru`. Cache keys have no TTL. A cron job runs `KEYS cache:*` hourly to find stale entries. The application crashes if Redis is unreachable. List the problems and fixes.

<details>
<summary>Show the solution</summary>

1. **Open to the internet without a password** → will be compromised. Private network, ACL authentication, TLS.
2. **`allkeys-lru` with queues** → BullMQ jobs and sessions can be evicted under memory pressure. Separate instances: caches with `allkeys-lru`, queues and sessions with `noeviction` (or `volatile-*` with TTLs on sessions).
3. **Cache keys without TTL** → unbounded growth and stale data. TTLs on all cache keys.
4. **`KEYS cache:*` hourly** → blocks Redis while it walks every key. TTLs make the job unnecessary; if scanning is needed, `SCAN` with a pattern.
5. **Crash when Redis is down** → total outage from a cache failure. Timeouts and graceful degradation (fall back to the database for caches); clear errors only for features that truly need Redis.
6. Also: no monitoring of memory, evictions or hit rate; no persistence decision for sessions.

</details>

### Exercise 4 — Production scenario: the hot key

**Objective:** practise diagnosing Redis performance.
**The scenario:** during a flash sale, Redis CPU hits 100% and latency rises for every request, although memory is fine. Monitoring shows one key — `product:v1:SALE-ITEM` — read 80,000 times per second. What is happening and what can you do?

<details>
<summary>Show the solution</summary>

**What is happening:** a **hot key**. Redis executes commands on one main thread, and one key lives on one node (or one cluster slot), so every read of the sale item queues on the same core. Network bandwidth for the value may also saturate.

**Options:**
1. **Local in-process cache** in each application server for this key with a short TTL (1–5 seconds): 80,000 reads become a handful of Redis reads per server per second ({{ch:caching}}).
2. **Smaller values**: store only what the page needs; compress large JSON.
3. **Replicas** for reads, if slightly stale data is acceptable.
4. **Key splitting**: copies under several keys (`product:v1:SALE-ITEM:{0..9}`) chosen randomly by readers — spreads load across cluster nodes.
5. **CDN caching** of the product page itself ({{ch:cloudfront}}).
6. **Afterwards**: monitor top keys (`redis-cli --hotkeys` with an LFU policy, or provider metrics), and load-test sale scenarios in advance.

</details>

## Summary

**Redis** is an in-memory data store of keys mapped to typed structures, extremely fast because data lives in RAM, commands are simple and a single main thread executes them one at a time — which also makes **every command atomic** and every slow command a problem for everyone. **Strings** hold cached values, sessions and counters (`SET … EX`, `INCR`); **hashes** hold small objects; **lists** hold ordered sequences; **sets** hold unique members; **sorted sets** keep members ordered by score for leaderboards and time-ordered data; **streams** are durable logs with consumer groups. Keys should be namespaced and temporary ones given **TTLs**.

Everyday patterns include **cache-aside** caching with invalidation, sessions, atomic counters, **rate limiting** with `MULTI`/`EXEC`, **distributed locks** with `SET … NX PX`, an owner token and a Lua-script release, **pub/sub** for live, fire-and-forget messages, and **streams** or BullMQ for durable work. Atomicity comes from single commands, `MULTI`/`EXEC`, and Lua scripts — never from read–modify–write in application code.

Memory is the main limit: set `maxmemory` and an **eviction policy** that matches the data (evict for caches, `noeviction` for queues — often separate instances). **RDB** snapshots and the **AOF** log provide persistence with some possible loss, so Redis is not the source of truth for important records. In production, use replication with Sentinel, Redis Cluster with hash tags, or a managed service; reuse connections with dedicated ones for subscribers; set timeouts and degrade gracefully; monitor memory, evictions, hit rate and slow commands; and keep Redis private, authenticated and encrypted.

## Key terms

- **Redis** — An in-memory data store holding keys mapped to typed data structures.
- **Valkey** — An open-source, command-compatible fork of Redis.
- **Key** — The name under which a value is stored in Redis.
- **TTL (time to live)** — An expiry time after which Redis deletes a key.
- **String (Redis)** — The basic value type, holding text, numbers or binary data.
- **Hash (Redis)** — A map of fields to values stored under one key.
- **List (Redis)** — An ordered sequence supporting fast operations at both ends.
- **Set (Redis)** — An unordered collection of unique members.
- **Sorted set** — A set of unique members ordered by numeric scores.
- **Stream (Redis)** — An append-only log of entries supporting consumer groups.
- **Consumer group** — A group of stream readers that share entries and acknowledge processing.
- **Pending entries list** — Stream entries delivered to a consumer but not yet acknowledged.
- **HyperLogLog** — A structure estimating the number of distinct items in very little memory.
- **Pub/sub** — A messaging pattern delivering published messages to current subscribers of a channel.
- **Atomic command** — A command that executes completely without interference from other clients.
- **MULTI / EXEC** — Commands that queue several operations and execute them together.
- **Lua script (EVAL)** — A script Redis executes atomically, able to read, decide and write.
- **Distributed lock** — A lock shared by several processes, typically with an owner token and expiry.
- **Pipelining** — Sending many commands without waiting for each reply to reduce round trips.
- **maxmemory** — The configured memory limit of a Redis instance.
- **Eviction policy** — The rule deciding which keys Redis removes, or whether it rejects writes, at the memory limit.
- **RDB** — Redis's periodic snapshot persistence.
- **AOF (append-only file)** — Redis's persistence log of every write.
- **Sentinel** — A Redis system that monitors primaries and performs automatic failover.
- **Redis Cluster** — Redis's built-in sharding across several primaries using hash slots.
- **Hash tag** — A `{...}` part of a key name forcing related keys into the same cluster slot.
- **Hot key** — A single key receiving so much traffic that it overloads one Redis node.
- **Big key** — A key whose value or collection is large enough to slow commands and the network.

## What comes next

Caching was one pattern among many here; it deserves a chapter of its own. The next chapter, {{ch:caching}}, covers caching as a discipline: where caches live (browser, CDN, application, Redis, database), what to cache, cache-aside, write-through and write-behind strategies, invalidation, TTLs and versioning, stampedes and how to prevent them, and keeping caches consistent with the source of truth.
