# Phase 2 — Chapter 19: Caching

---

## Chapter Overview

Caching is the practice of storing computed or fetched data in a fast-access location so future requests for the same data are faster. It's one of the highest-leverage performance techniques in backend engineering.

**Cache types:**
- In-process memory (Node.js Map, LRU cache)
- Distributed cache (Redis, Memcached)
- HTTP caching (ETags, Cache-Control headers)
- CDN caching (edge nodes)
- Database query cache

**Golden rule:** Cache is an optimization — data in cache can always be stale. Correctness first, cache second.

---

## Beginner Theory

### Why Cache?

```
Without cache:
  Request → API → Database query (10ms) → Response: 15ms total
  100 req/s → 100 database queries/s

With cache:
  Request → API → Cache HIT (0.1ms) → Response: 5ms total
  100 req/s → 1 database query per cache miss (< 1/s if TTL = 60s)

Cache benefits:
  1. Reduce database load (fewer queries)
  2. Reduce response latency (RAM > disk)
  3. Reduce cost (fewer compute resources per request)
  4. Absorb traffic spikes (cache serves while DB struggles)
```

### Cache Strategies

```
Cache-Aside (Lazy Loading):
  Read:  Check cache → miss → query DB → store in cache → return
  Write: Update DB → INVALIDATE cache (don't update cache directly)
  
  Best for: read-heavy, infrequent writes, expensive queries
  Risk: cold start (first request always misses), stale data

Write-Through:
  Write: Update DB → Update cache (synchronously)
  Read:  Cache always fresh (if not evicted)
  
  Best for: data that's written and immediately read
  Risk: write latency doubles (DB + cache write)

Write-Behind (Write-Back):
  Write: Update cache → Return → DB updated async (queue)
  Read:  Always from cache
  
  Best for: very write-heavy workloads, eventual consistency OK
  Risk: data loss if cache dies before DB sync

Read-Through:
  Cache layer sits between app and DB
  Cache handles miss automatically (fetches from DB and caches)
  
  Best for: clean abstraction, consistent TTLs
  Risk: first request always slow

Refresh-Ahead:
  Cache proactively refreshes data BEFORE it expires
  Best for: predictably accessed data with known access patterns
```

---

## Basic Examples

### In-Memory Cache (Node.js)

```javascript
// npm install lru-cache

const { LRUCache } = require("lru-cache");

const cache = new LRUCache({
  max:      500,              // max 500 items
  ttl:      1000 * 60 * 5,   // 5-minute TTL per item
  sizeCalculation: (value) => JSON.stringify(value).length,
  maxSize:  5 * 1024 * 1024  // max 5MB total
});

// Cache-aside pattern
async function getUserById(userId) {
  const cacheKey = `user:${userId}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const user = await db.query("SELECT * FROM users WHERE id = $1", [userId]);
  cache.set(cacheKey, user);
  return user;
}

// Invalidate on update
async function updateUser(userId, data) {
  await db.query("UPDATE users SET ... WHERE id = $1", [userId]);
  cache.delete(`user:${userId}`);
}
```

### Redis Cache (Distributed)

```javascript
class CacheService {
  #redis;
  #defaultTTL;

  constructor(redis, defaultTTL = 300) {
    this.#redis     = redis;
    this.#defaultTTL = defaultTTL;
  }

  async get(key) {
    const raw = await this.#redis.get(key);
    return raw ? JSON.parse(raw) : null;
  }

  async set(key, value, ttl = this.#defaultTTL) {
    await this.#redis.set(key, JSON.stringify(value), "EX", ttl);
  }

  async del(key) {
    await this.#redis.del(key);
  }

  async getOrSet(key, fn, ttl = this.#defaultTTL) {
    const cached = await this.get(key);
    if (cached !== null) return cached;

    const value = await fn();
    await this.set(key, value, ttl);
    return value;
  }

  // Delete all keys matching a pattern (careful — expensive in large datasets)
  async invalidatePattern(pattern) {
    const keys = await this.#redis.keys(pattern);
    if (keys.length) await this.#redis.del(...keys);
  }
}

const cacheService = new CacheService(redis);

// Usage
const user = await cacheService.getOrSet(
  `user:${userId}`,
  () => db.query("SELECT * FROM users WHERE id = $1", [userId]),
  600  // 10 minutes
);
```

### HTTP Caching

```javascript
// Cache-Control headers
router.get("/api/products", async (req, res) => {
  const products = await productService.list();

  // Public cache (CDN + browser), 5-minute TTL
  res.set("Cache-Control", "public, max-age=300");
  res.json(products);
});

// Private cache (browser only, authenticated)
router.get("/api/me", authenticate, async (req, res) => {
  const user = await userService.findById(req.user.id);
  res.set("Cache-Control", "private, max-age=60");
  res.json(user);
});

// No cache for dynamic/sensitive data
router.get("/api/balance", authenticate, async (req, res) => {
  const balance = await walletService.getBalance(req.user.id);
  res.set("Cache-Control", "no-store");
  res.json({ balance });
});

// ETag for conditional requests
router.get("/api/products/:id", async (req, res) => {
  const product = await productService.findById(req.params.id);
  const etag    = `"${product.updatedAt.getTime()}"`;

  if (req.headers["if-none-match"] === etag) {
    return res.status(304).end();  // Not Modified
  }

  res.set("ETag", etag);
  res.set("Cache-Control", "public, max-age=60");
  res.json(product);
});
```

---

## Intermediate Concepts

### Cache Invalidation Strategies

```javascript
// 1. TTL-based (simplest — data stales naturally)
await redis.set("product:123", JSON.stringify(product), "EX", 300);

// 2. Event-based (invalidate immediately on change)
async function updateProduct(productId, data) {
  await db.update(productId, data);
  await redis.del(`product:${productId}`);
  await redis.del("products:list:*");  // invalidate list caches
}

// 3. Cache versioning — change the cache key on update
async function updateUser(userId, data) {
  await db.update(userId, data);
  const version = await redis.incr(`user:${userId}:version`);
  // Old cache key user:123:v5 becomes stale and expires naturally
  // New reads use user:123:v6
}

async function getUser(userId) {
  const version = await redis.get(`user:${userId}:version`) || 1;
  const key = `user:${userId}:v${version}`;
  return cacheService.getOrSet(key, () => db.findUser(userId), 600);
}

// 4. Tag-based invalidation
// Associate cache keys with tags, invalidate all keys with a tag
await redis.sadd("cache:tags:user:123", "user:123", "user-list", "admin-dashboard");
// On update: get all keys for tag, delete them all
```

### Thundering Herd Problem

```javascript
// Problem: 1000 concurrent requests all miss the same cache key
// All 1000 hit the database simultaneously — can kill it

// Solution: Probabilistic Early Expiration (PER) + Mutex Lock

class CacheWithLock {
  async getOrSet(key, fn, ttl) {
    const cached = await redis.get(key);
    if (cached) return JSON.parse(cached);

    // Use a distributed lock to let only ONE request populate the cache
    const lockKey  = `lock:${key}`;
    const lockAcquired = await redis.set(lockKey, "1", "NX", "PX", 10_000);

    if (lockAcquired) {
      try {
        const value = await fn();
        await redis.set(key, JSON.stringify(value), "EX", ttl);
        return value;
      } finally {
        await redis.del(lockKey);
      }
    } else {
      // Wait for the lock holder to populate the cache
      let attempts = 0;
      while (attempts < 10) {
        await new Promise(r => setTimeout(r, 100));
        const cached = await redis.get(key);
        if (cached) return JSON.parse(cached);
        attempts++;
      }
      // Fall back to direct DB call if lock holder is too slow
      return fn();
    }
  }
}
```

### Cache Stampede with Stale-While-Revalidate

```javascript
// Serve stale data while revalidating in background
// Never blocks the request — always returns (possibly stale) data immediately

async function getWithSWR(key, fn, { ttl = 60, staleFor = 30 } = {}) {
  const raw = await redis.get(key);

  if (raw) {
    const { value, expiresAt } = JSON.parse(raw);
    const now = Date.now() / 1000;

    if (now > expiresAt) {
      // Expired — revalidate in background, return stale value
      fn().then(fresh => redis.set(key, JSON.stringify({
        value: fresh,
        expiresAt: now + ttl
      }), "EX", ttl + staleFor));
    }

    return value;  // always return immediately
  }

  // Cold miss — must fetch
  const value = await fn();
  const now = Date.now() / 1000;
  await redis.set(key, JSON.stringify({ value, expiresAt: now + ttl }), "EX", ttl + staleFor);
  return value;
}
```

---

## Advanced Concepts

### Cache Warming

```javascript
// Pre-populate cache after deployment (prevent cold start degrading users)
async function warmCache() {
  logger.info("Warming cache...");

  // Popular products
  const topProducts = await db.query("SELECT * FROM products ORDER BY views DESC LIMIT 100");
  await Promise.all(topProducts.map(p =>
    redis.set(`product:${p.id}`, JSON.stringify(p), "EX", 3600)
  ));

  // Config / feature flags
  const config = await db.query("SELECT * FROM app_config");
  await redis.set("app:config", JSON.stringify(config), "EX", 3600);

  logger.info("Cache warm complete");
}

// Call after deployment, before traffic shifts
```

### Multi-Level Cache

```javascript
// L1: in-process (fastest, smallest, node-local)
// L2: Redis (fast, shared, larger)
// L3: database (source of truth)

const l1Cache = new LRUCache({ max: 100, ttl: 30_000 });  // 30s in-process
const l2Cache = new CacheService(redis);                    // 5min Redis

async function getProduct(productId) {
  const key = `product:${productId}`;

  // L1 check
  const l1 = l1Cache.get(key);
  if (l1) return l1;

  // L2 check
  const l2 = await l2Cache.get(key);
  if (l2) {
    l1Cache.set(key, l2);  // populate L1
    return l2;
  }

  // L3 (database)
  const product = await db.query("SELECT * FROM products WHERE id = $1", [productId]);
  await l2Cache.set(key, product, 300);
  l1Cache.set(key, product);
  return product;
}
```

---

## Interview Preparation

**Q1: What is cache invalidation and why is it considered hard?**
A: Cache invalidation is the process of marking cached data as stale when the underlying data changes. It's hard because: 1) Distributed systems mean multiple cache nodes can hold stale data. 2) You must track which cache keys to invalidate when data changes — complex relationships mean changing user 123's data might invalidate user lists, dashboard aggregates, and search results. 3) Timing windows exist where one request reads stale data between DB write and cache invalidation. Solutions: low TTLs, event-driven invalidation, cache versioning, and accepting eventual consistency.

**Q2: What is the thundering herd problem?**
A: When a popular cache entry expires, thousands of concurrent requests all miss the cache simultaneously and all hit the database at once — potentially overwhelming it. Solutions: use a mutex lock so only one request populates the cache while others wait; use probabilistic early expiration (refresh slightly before expiry instead of after); use stale-while-revalidate (return stale data immediately, refresh in background); or use background refresh to proactively refresh popular items before they expire.

**Q3: What is the difference between CDN caching and application caching?**
A: CDN caching stores static or semi-static content at edge nodes (geographically close to users) — HTML, CSS, JS, images, and API responses with public Cache-Control headers. Reduces round-trip latency globally. Application caching (Redis/in-memory) stores computed results (database queries, expensive calculations) at the application server layer — reduces backend computation and database load. Both are complementary: CDN for network latency reduction, application cache for computation reduction.

---

## Practical Tasks

### Beginner (10 Tasks)
1. Implement in-memory cache with LRU Cache for user lookups.
2. Add a 5-minute Redis cache for an expensive product list query.
3. Implement cache-aside pattern for a single endpoint.
4. Add Cache-Control headers to a public API response.
5. Implement ETag-based caching with 304 Not Modified response.
6. Log cache HIT and MISS with response time difference.
7. Implement cache invalidation on user update (delete cache key).
8. Add TTL expiry to all cache entries, never cache forever.
9. Test cache effectiveness: measure response time with and without cache.
10. Implement a "no-store" header for sensitive endpoints.

### Intermediate (10 Tasks)
1. Implement thundering herd prevention with distributed lock.
2. Build stale-while-revalidate cache for frequently-read products.
3. Implement tag-based cache invalidation.
4. Build multi-level cache (in-memory L1 + Redis L2).
5. Add cache hit rate metrics (track hits/misses for each cache key).
6. Implement cache warming script for post-deployment execution.
7. Build cache for database aggregation query (e.g., total sales per day).
8. Implement cache versioning for user profiles.
9. Add circuit breaker: if Redis is down, fall back to DB directly.
10. Build cache invalidation for related data (update user → invalidate user's posts cache).

### Advanced (10 Tasks)
1. Build a distributed cache with Redis Cluster.
2. Implement cache compression: gzip large JSON values before storing.
3. Build a CDN invalidation trigger when content changes.
4. Implement adaptive TTL: increase TTL for popular items, decrease for rarely accessed.
5. Build read-through cache layer as middleware.
6. Implement write-through cache (write cache and DB simultaneously).
7. Build cache analytics: track access patterns, identify hot keys.
8. Implement geo-distributed cache replication (Redis replica per region).
9. Build cache warm-up test: measure cold vs. warm cache performance under load.
10. Implement per-user cache quotas to prevent cache pollution.

---

## Self Assessment
1. What is the difference between cache-aside and read-through?
2. What is TTL and why is it important?
3. What is the thundering herd problem?
4. What is stale-while-revalidate?
5. What is cache invalidation?
6. What are Cache-Control headers?
7. What is the difference between L1 and L2 cache?
8. What is cache warming?
9. When should you use CDN caching vs. application caching?
10. Why should sensitive data never be cached with public Cache-Control?

---

## Cheat Sheet

```javascript
// Cache-aside
const cached = await redis.get(key);
if (cached) return JSON.parse(cached);
const data = await db.find(...);
await redis.set(key, JSON.stringify(data), "EX", 300);
return data;

// Invalidate on write
await db.update(...);
await redis.del(key);

// HTTP headers
res.set("Cache-Control", "public, max-age=300");  // CDN + browser
res.set("Cache-Control", "private, max-age=60");  // browser only
res.set("Cache-Control", "no-store");              // never cache

// ETag
const etag = `"${entity.updatedAt.getTime()}"`;
if (req.headers["if-none-match"] === etag) return res.status(304).end();
res.set("ETag", etag);
```
