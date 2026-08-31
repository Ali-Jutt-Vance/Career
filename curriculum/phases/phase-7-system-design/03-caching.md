# Phase 7 — Chapter 3: Caching Strategies

---

## Chapter Overview

Caching is storing copies of data in a fast, temporary storage layer to avoid repeated slow computations or database queries. Done correctly, caching reduces latency by 10–100x and database load dramatically.

**Topics:**
- Cache-aside, read-through, write-through, write-back
- Cache eviction policies (LRU, LFU, TTL)
- Cache invalidation strategies
- Cache stampede and how to prevent it
- Redis patterns (strings, hashes, sorted sets, pub/sub)
- CDN caching vs. application caching
- Distributed caching and consistency

---

## Caching Patterns

```
Cache-Aside (Lazy Loading) — most common
  1. Check cache for data
  2. Cache HIT: return cached data
  3. Cache MISS: query DB, store in cache, return data
  Pro: only caches what's actually needed, fault-tolerant (DB still works if cache down)
  Con: cold start latency, stale data until TTL expires

Read-Through
  Cache sits in front of DB. App only talks to cache.
  On miss: cache fetches from DB, stores, returns.
  Pro: code simplicity (no cache-aside logic in app)
  Con: cache library must support DB integration

Write-Through
  Every write: app writes to cache AND DB synchronously.
  Pro: cache always up-to-date, no stale reads
  Con: write latency increases (two writes), cache stores unused data

Write-Back (Write-Behind)
  App writes to cache only. Cache asynchronously writes to DB.
  Pro: low write latency, DB isn't a bottleneck
  Con: data loss risk (if cache fails before DB write), complexity

Write-Around
  App writes directly to DB, bypasses cache.
  Cache only populated on reads.
  Good for: write-once, read-later data (logs, audit records)

Choosing:
  Read-heavy, rarely updated:    Cache-Aside or Read-Through + TTL
  Write-heavy, eventual okay:    Write-Back
  Always consistent:             Write-Through (accept write latency)
```

---

## Code Examples

### Cache-Aside with Redis

```typescript
import { createClient } from "redis";
import { prisma }       from "@/lib/prisma";

const redis = createClient({ url: process.env.REDIS_URL });
await redis.connect();

const DEFAULT_TTL = 300;  // 5 minutes

// Cache-aside: check cache first, fall back to DB
export async function getUserById(userId: string) {
  const cacheKey = `user:${userId}`;

  // 1. Check cache
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  // 2. Cache miss: query DB
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true }
  });

  if (!user) return null;

  // 3. Store in cache
  await redis.setEx(cacheKey, DEFAULT_TTL, JSON.stringify(user));

  return user;
}

// Invalidate on update
export async function updateUser(userId: string, data: Partial<User>) {
  const updated = await prisma.user.update({ where: { id: userId }, data });
  await redis.del(`user:${userId}`);  // invalidate cache
  return updated;
}

// Cache invalidation by pattern (use sparingly — can be slow)
export async function invalidateUserCache(userId: string) {
  const keys = await redis.keys(`user:${userId}:*`);
  if (keys.length > 0) {
    await redis.del(keys);
  }
}

// Prevent cache stampede with mutex lock
import Redlock from "redlock";
const redlock = new Redlock([redis]);

export async function getUserWithLock(userId: string) {
  const cacheKey = `user:${userId}`;
  const cached   = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  // Only one process rebuilds the cache at a time
  const lock = await redlock.acquire([`lock:${cacheKey}`], 5000);
  try {
    // Double-check after acquiring lock
    const doubleCheck = await redis.get(cacheKey);
    if (doubleCheck) return JSON.parse(doubleCheck);

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user) await redis.setEx(cacheKey, DEFAULT_TTL, JSON.stringify(user));
    return user;
  } finally {
    await lock.release();
  }
}

// Stale-while-revalidate pattern
export async function getUserSWR(userId: string) {
  const cacheKey     = `user:${userId}`;
  const staleCacheKey = `user:${userId}:stale`;

  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  // Serve stale data if available while refreshing in background
  const stale = await redis.get(staleCacheKey);
  if (stale) {
    // Return stale immediately, refresh in background
    refreshUserCache(userId).catch(console.error);
    return JSON.parse(stale);
  }

  return refreshUserCache(userId);
}

async function refreshUserCache(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (user) {
    const value = JSON.stringify(user);
    await Promise.all([
      redis.setEx(`user:${userId}`, 60, value),           // fresh for 60s
      redis.setEx(`user:${userId}:stale`, 3600, value)    // stale for 1h
    ]);
  }
  return user;
}
```

### Redis Advanced Patterns

```typescript
// Sorted Sets for leaderboard (O(log N) insert + range query)
export async function addScore(userId: string, score: number) {
  await redis.zAdd("leaderboard:global", [{ score, value: userId }]);
}

export async function getTopUsers(limit: number) {
  // Get top N users with their scores, highest first
  return redis.zRangeWithScores("leaderboard:global", 0, limit - 1, { REV: true });
}

export async function getUserRank(userId: string) {
  const rank = await redis.zRevRank("leaderboard:global", userId);
  return rank !== null ? rank + 1 : null;  // 1-indexed
}

// Rate limiting with sliding window counter
export async function checkRateLimit(identifier: string, limit: number, windowSec: number) {
  const key = `ratelimit:${identifier}`;
  const now  = Date.now();
  const windowMs = windowSec * 1000;

  const pipeline = redis.multi();
  pipeline.zRemRangeByScore(key, "-inf", now - windowMs);     // remove old requests
  pipeline.zAdd(key, [{ score: now, value: `${now}` }]);      // add current request
  pipeline.zCard(key);                                          // count requests in window
  pipeline.expire(key, windowSec);                             // auto-expire key

  const results = await pipeline.exec();
  const count = results[2] as number;

  return {
    allowed: count <= limit,
    count,
    remaining: Math.max(0, limit - count),
    resetAt:   new Date(now + windowMs)
  };
}

// Pub/Sub for real-time events
const subscriber = redis.duplicate();
await subscriber.connect();

await subscriber.subscribe("order:events", (message) => {
  const event = JSON.parse(message);
  console.log("Order event:", event);
  // Handle: update dashboard, send notification, etc.
});

// Publisher
await redis.publish("order:events", JSON.stringify({
  type:    "order.created",
  orderId: "123",
  userId:  "456"
}));
```

---

## Interview Preparation

**Q1: What is cache invalidation and why is it hard?**
A: Cache invalidation: removing or updating cached data when the source of truth (database) changes. Why it's hard: caches are separate systems — when you write to the DB, the cache doesn't know automatically. Time-To-Live (TTL): simplest strategy — cache expires after N seconds. Problem: stale reads for up to TTL period. Event-driven invalidation: delete cache on write. Problem: race condition — another request might cache the old value between delete and DB write. Strategies: write-through (write to both simultaneously, cache always fresh), cache-aside with TTL (accept staleness), tag-based invalidation (all cached items for user:123 share a tag; invalidate the tag). Phil Karlton: "There are only two hard things in Computer Science: cache invalidation and naming things."

**Q2: What is a cache stampede and how do you prevent it?**
A: Cache stampede (dog-piling): when a popular cache key expires, hundreds of concurrent requests all get a cache miss simultaneously, all hit the database, all try to rebuild the cache at the same time — overloading the DB. Prevention strategies: 1) Mutex/lock: first miss acquires a lock and rebuilds; others wait or serve stale data. 2) Probabilistic early expiration: randomly expire a cache item slightly before its TTL — the first request to "early-expire" refreshes proactively, preventing the cliff-edge miss. 3) Background refresh: cache always returns current value (possibly slightly stale), background job refreshes it before expiry. 4) Stale-while-revalidate: serve stale data immediately on miss, trigger async refresh.

**Q3: What are the main Redis data structures and when do you use each?**
A: String: key-value pairs, counters, session tokens, cached JSON. SET/GET, SETEX, INCR. Hash: object with multiple fields (user profile). HSET/HGET, saves memory vs. multiple strings. List: ordered collection, message queues (push left, pop right), activity feeds. LPUSH/RPOP. Set: unique items, online users, tagging. SADD, SMEMBERS, SINTERSTORE (intersection). Sorted Set: ranking/leaderboard (score + member), rate limiting windows, scheduled tasks. ZADD, ZRANGE, ZREVRANK. Stream: append-only log, similar to Kafka. XADD, XREAD. Bitmap: very compact boolean tracking (has user completed onboarding step?). HyperLogLog: approximate cardinality (count distinct users seen) with minimal memory.

---

## Practical Tasks

### Beginner (10 Tasks)
1. Implement cache-aside for a `getUserById` function.
2. Set TTL of 5 minutes on cached data.
3. Invalidate cache on user update.
4. Implement a Redis counter with INCR.
5. Use Redis SETEX to store a session token.
6. Use Redis HSET to store a user profile.
7. Implement a sorted set leaderboard.
8. Get top 10 users from the leaderboard.
9. Use Redis KEYS to inspect cached data.
10. Monitor cache hit/miss rate with a counter.

### Intermediate (10 Tasks)
1. Implement stale-while-revalidate for user profiles.
2. Implement cache stampede prevention with Redlock.
3. Build sliding window rate limiter with Redis sorted sets.
4. Implement write-through caching for user updates.
5. Build pub/sub notification system with Redis.
6. Implement tag-based cache invalidation.
7. Add cache layer metrics (hit rate, miss rate, latency).
8. Implement LRU cache eviction (maxmemory-policy allkeys-lru).
9. Use Redis pipeline for batch operations.
10. Implement multi-level cache (in-memory + Redis).

### Advanced (10 Tasks)
1. Build a distributed cache with consistent hashing.
2. Implement cache warming strategy for cold start.
3. Design a cache hierarchy: L1 (in-process) + L2 (Redis) + L3 (DB).
4. Implement cache versioning for safe deploys.
5. Build a real-time leaderboard with Redis Sorted Sets.
6. Implement probabilistic early expiration.
7. Set up Redis cluster with hash slots.
8. Build a write-back cache with async DB persistence.
9. Implement cache monitoring with Prometheus + Grafana.
10. Analyze and optimize cache key design for a large application.

---

## Cheat Sheet

```typescript
// Redis key naming: service:type:id[:field]
// user:profile:123      → cached user
// user:session:abc123   → session data
// ratelimit:api:userId  → rate limit counter
// leaderboard:global    → sorted set

// Core patterns
await redis.setEx("key", 300, JSON.stringify(data));  // cache with 5 min TTL
await redis.get("key");                                // fetch
await redis.del("key");                                // invalidate
await redis.exists("key");                             // check existence

// Counter
await redis.incr("visits:page:home");
await redis.incrBy("user:123:points", 10);

// Sorted set (leaderboard)
await redis.zAdd("lb", [{ score: 1500, value: "user:123" }]);
await redis.zRevRange("lb", 0, 9);         // top 10
await redis.zRevRank("lb", "user:123");   // rank of user

// Rate limit
const count = await redis.incr(`rate:${userId}`);
await redis.expire(`rate:${userId}`, 60);  // reset after 60s
if (count > LIMIT) throw new Error("Rate limited");

// Pipeline (batch, atomic)
const pipeline = redis.multi();
pipeline.set("a", "1");
pipeline.set("b", "2");
const results = await pipeline.exec();
```

```
Eviction policies (maxmemory-policy):
  noeviction:      error on new writes when full (default)
  allkeys-lru:     evict least recently used (recommended for cache)
  allkeys-lfu:     evict least frequently used
  volatile-lru:    evict LRU among keys with TTL
  volatile-ttl:    evict nearest to expiration
  allkeys-random:  random eviction

Cache hit ratio target: > 90% for most caches
  < 80% → review cache keys, TTL, data size
  > 99% → great, but watch memory usage
```
