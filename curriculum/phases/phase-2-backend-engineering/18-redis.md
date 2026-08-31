# Phase 2 — Chapter 18: Redis

---

## Chapter Overview

Redis (Remote Dictionary Server) is an in-memory data store used as a database, cache, message broker, and queue backend. It's one of the most widely deployed pieces of infrastructure in modern web applications.

**Primary use cases:**
- Caching (session, query, API response)
- Session storage (faster than database sessions)
- Rate limiting (atomic counters)
- Pub/Sub messaging
- Job queues (BullMQ/Bull backend)
- Leaderboards (sorted sets)
- Presence tracking (who's online)
- Distributed locks

---

## Beginner Theory

### Redis Data Types

```
String     → Most basic: SET/GET/INCR/DECR, TTL, binary-safe (up to 512MB)
List       → Linked list: LPUSH/RPUSH/LPOP/RPOP/LRANGE, FIFO queues
Hash       → Field-value object: HSET/HGET/HGETALL, user profiles
Set        → Unique members: SADD/SMEMBERS/SISMEMBER, tags, online users
Sorted Set → Set + score, ZADD/ZRANGE/ZRANK, leaderboards, rate limiting
Bitmap     → Bit-level operations, feature flags, attendance
HyperLogLog → Approximate distinct count, page views, unique visitors
Stream     → Append-only log, event sourcing, Kafka-like

Each type has O(1) to O(N) operations with specific complexity guarantees.
```

---

## Basic Examples

### Connecting with ioredis

```javascript
// npm install ioredis

const Redis = require("ioredis");

const redis = new Redis({
  host:           process.env.REDIS_HOST || "localhost",
  port:           parseInt(process.env.REDIS_PORT || "6379"),
  password:       process.env.REDIS_PASSWORD,
  db:             0,
  maxRetriesPerRequest: 3,
  enableAutoPipelining:  true,   // batch commands automatically
  lazyConnect:    true           // don't connect until first command
});

redis.on("connect",       () => logger.info("Redis connected"));
redis.on("error",  (err) => logger.error("Redis error", { err: err.message }));
redis.on("reconnecting",  () => logger.warn("Redis reconnecting..."));

// Graceful shutdown
process.on("SIGTERM", async () => {
  await redis.quit();
});
```

### Strings

```javascript
// SET with TTL
await redis.set("user:session:abc123", JSON.stringify(session), "EX", 3600);

// GET
const raw = await redis.get("user:session:abc123");
const session = raw ? JSON.parse(raw) : null;

// SETEX shorthand
await redis.setex("email:otp:user123", 300, "847291");  // 5-minute OTP

// Atomic increment (rate limiting, counters)
const count = await redis.incr("api:calls:user123");
if (count === 1) await redis.expire("api:calls:user123", 60);

// SET NX (set if not exists — distributed lock)
const acquired = await redis.set("lock:payment:order123", "1", "NX", "PX", 30000);

// DEL
await redis.del("user:session:abc123");

// TTL (time to live in seconds, -1 = no expiry, -2 = doesn't exist)
const ttl = await redis.ttl("user:session:abc123");
```

### Hashes

```javascript
// Store user profile — avoid serializing/deserializing entire object
await redis.hset("user:123", {
  name:     "Alice",
  email:    "alice@example.com",
  role:     "admin",
  updatedAt: Date.now().toString()
});

// Get single field
const email = await redis.hget("user:123", "email");

// Get all fields
const profile = await redis.hgetall("user:123");
// Returns: { name: 'Alice', email: '...', role: 'admin', updatedAt: '...' }

// Update single field
await redis.hset("user:123", "role", "user");

// Delete field
await redis.hdel("user:123", "role");

// Check existence
const exists = await redis.hexists("user:123", "email");

// Increment numeric field
await redis.hincrbyfloat("user:123", "creditBalance", -15.50);
```

### Lists

```javascript
// FIFO queue (push right, pop left)
await redis.rpush("jobs:pending", JSON.stringify({ type: "email", to: "user@example.com" }));
const job = await redis.lpop("jobs:pending");

// Stack (push right, pop right)
await redis.rpush("history:user123", "page:/dashboard");
await redis.rpush("history:user123", "page:/profile");
const lastPage = await redis.rpop("history:user123");

// Bounded list (keep last 50 items)
await redis.rpush("feed:user123", JSON.stringify(post));
await redis.ltrim("feed:user123", -50, -1);  // keep last 50

// Get range
const feed = await redis.lrange("feed:user123", 0, 19);  // first 20

// Blocking pop (wait for item to arrive — for worker processes)
const [listName, value] = await redis.blpop("jobs:pending", 5);  // wait max 5s
```

### Sets

```javascript
// Online users
await redis.sadd("online:users", socket.userId);
await redis.srem("online:users", socket.userId);
const isOnline  = await redis.sismember("online:users", userId);
const onlineAll = await redis.smembers("online:users");
const count     = await redis.scard("online:users");

// Intersection (mutual friends)
const mutual = await redis.sinter("friends:user1", "friends:user2");

// Union (all followers)
const union = await redis.sunion("followers:user1", "followers:user2");

// Difference
const diff = await redis.sdiff("friends:user1", "friends:user2");
```

### Sorted Sets

```javascript
// Leaderboard
await redis.zadd("leaderboard:game123", 1500, "alice");
await redis.zadd("leaderboard:game123", 2300, "bob");
await redis.zadd("leaderboard:game123", 1800, "charlie");

// Get rank (0-indexed, ascending)
const rank = await redis.zrank("leaderboard:game123", "alice");

// Get rank in reverse (highest score first)
const topRank = await redis.zrevrank("leaderboard:game123", "bob");  // 0 = #1

// Get top 10 (highest scores)
const top10 = await redis.zrevrange("leaderboard:game123", 0, 9, "WITHSCORES");

// Get score
const score = await redis.zscore("leaderboard:game123", "alice");

// Increment score
await redis.zincrby("leaderboard:game123", 100, "alice");

// Sliding window rate limiting with sorted sets
async function isRateLimited(userId, maxRequests = 100, windowSec = 60) {
  const now   = Date.now();
  const key   = `ratelimit:${userId}`;
  const cutoff = now - windowSec * 1000;

  const pipeline = redis.pipeline();
  pipeline.zremrangebyscore(key, 0, cutoff);       // remove old entries
  pipeline.zadd(key, now, `${now}-${Math.random()}`);  // add current request
  pipeline.zcard(key);                              // count in window
  pipeline.expire(key, windowSec);                  // set TTL

  const results = await pipeline.exec();
  const count   = results[2][1];
  return count > maxRequests;
}
```

### Pub/Sub

```javascript
// Publisher
const publisher = new Redis(redisConfig);
await publisher.publish("channel:notifications", JSON.stringify({
  type:   "new-message",
  userId: "user123",
  data:   { from: "bob", text: "Hello!" }
}));

// Subscriber (separate connection)
const subscriber = new Redis(redisConfig);
await subscriber.subscribe("channel:notifications");
subscriber.on("message", (channel, message) => {
  const data = JSON.parse(message);
  // Route to the appropriate user's WebSocket connection
  io.to(`user:${data.userId}`).emit(data.type, data.data);
});

// Pattern subscribe
await subscriber.psubscribe("channel:*");
subscriber.on("pmessage", (pattern, channel, message) => {
  console.log(channel, message);
});
```

---

## Intermediate Concepts

### Pipelines and Transactions

```javascript
// Pipeline — batch multiple commands in one round trip
const pipeline = redis.pipeline();
pipeline.set("key1", "value1");
pipeline.set("key2", "value2");
pipeline.incr("counter");
pipeline.expire("key1", 3600);
const results = await pipeline.exec();
// [[null, 'OK'], [null, 'OK'], [null, 1], [null, 1]]

// MULTI/EXEC — atomic transaction
// All commands in a MULTI block execute atomically
const results = await redis.multi()
  .decr("inventory:item123")
  .lpush("orders:pending", JSON.stringify(order))
  .exec();
// Results: [[null, 49], [null, 1]] — or null if WATCH triggered

// WATCH — optimistic locking
// Watch a key; if it changes before EXEC, the transaction is aborted
const [inventoryRaw] = await redis.watch("inventory:item123");
const current = parseInt(await redis.get("inventory:item123"));

if (current <= 0) throw new Error("Out of stock");

const pipeline = redis.multi();
pipeline.decr("inventory:item123");
pipeline.lpush("orders:pending", JSON.stringify(order));
const results = await pipeline.exec();  // null if inventory was modified
if (!results) throw new Error("Concurrent modification — retry");
```

### Redis Streams

```javascript
// Redis Streams — persistent, partitioned log (Kafka-lite)
// Good for event sourcing, audit logs, activity feeds

// Append to stream
const id = await redis.xadd(
  "stream:events",
  "*",                    // auto-generate ID
  "type",   "user.login",
  "userId", "123",
  "ip",     "1.2.3.4"
);

// Read new messages as consumer group (for distributed processing)
await redis.xgroup("CREATE", "stream:events", "processors", "0", "MKSTREAM");

const messages = await redis.xreadgroup(
  "GROUP", "processors", "worker-1",
  "COUNT", 10,
  "BLOCK", 5000,           // wait up to 5s for messages
  "STREAMS", "stream:events", ">"
);

// ACK after processing
await redis.xack("stream:events", "processors", messageId);
```

---

## Advanced Concepts

### Redis Cluster

```javascript
const Redis = require("ioredis");

const cluster = new Redis.Cluster([
  { host: "redis-1", port: 6379 },
  { host: "redis-2", port: 6379 },
  { host: "redis-3", port: 6379 }
], {
  scaleReads: "slave",      // route reads to replicas
  maxRedirections: 16       // follow cluster redirects
});

// Keys in the same hash slot for multi-key operations
// Use hash tags: {user:123}:session, {user:123}:profile
await cluster.set("{user:123}:session", "...");
await cluster.set("{user:123}:profile", "...");
await cluster.mget("{user:123}:session", "{user:123}:profile");  // same slot
```

---

## Security

```javascript
// 1. Always use password authentication
const redis = new Redis({ password: process.env.REDIS_PASSWORD });

// 2. Bind Redis to localhost only (never expose to internet)
// In redis.conf: bind 127.0.0.1

// 3. Use Redis ACLs (Redis 6+) — different credentials per service
// ACL SETUSER emailworker on >password ~email:* +GET +SET +DEL

// 4. Encrypt in transit — use Redis with TLS (Redis 6+)
const redis = new Redis({ tls: { rejectUnauthorized: true } });

// 5. Never cache sensitive data unencrypted
// Encrypt PII before caching, or don't cache it at all

// 6. Set appropriate key TTLs — no data should live forever
// Default TTL policy in redis.conf: maxmemory-policy allkeys-lru
```

---

## Interview Preparation

**Q1: What are the main data types in Redis and when would you use each?**
A: String — simple key-value, counters, session tokens, OTPs. Hash — object fields without JSON serialization, user profiles. List — queues, stacks, activity feeds. Set — unique membership, online users, tags, set operations (intersection). Sorted Set — leaderboards, rate limiting, time-series. Pub/Sub — real-time event broadcasting. Stream — persistent event log, audit trails. Choose based on access patterns — avoid fetching and deserializing entire objects when you only need one field (use Hash instead of String+JSON).

**Q2: How does Redis achieve atomicity without traditional database locking?**
A: Redis is single-threaded for command execution — commands are processed one at a time, so individual commands are atomic by nature. For multi-command atomicity, Redis provides MULTI/EXEC (transactions) and Lua scripts (`redis.call()`). WATCH implements optimistic locking — if a watched key is modified before EXEC, the transaction is aborted. Lua scripts are the preferred approach because they're atomic by design and can implement complex conditional logic.

**Q3: When should you NOT use Redis as your primary data store?**
A: Redis is in-memory — data is lost if the server crashes (unless RDB/AOF persistence is configured). It's not suited for: large datasets that exceed RAM, complex SQL queries, ACID transactions with multi-table consistency, or long-term durable storage of business-critical data. Use Redis as a cache/accelerator alongside a durable database (PostgreSQL, MongoDB), not as a replacement.

---

## Practical Tasks

### Beginner (10 Tasks)
1. Connect to Redis with ioredis, set and get a string value.
2. Store a session object as a Hash (user profile fields).
3. Implement a simple page view counter with INCR.
4. Set a key with a 1-hour TTL for session caching.
5. Use LPUSH/RPOP to implement a simple FIFO queue.
6. Add and remove users from a "online users" Set.
7. Implement a leaderboard with Sorted Set (ZADD, ZREVRANGE).
8. Delete a key and verify it's gone (DEL, EXISTS).
9. Use KEYS pattern to find all keys matching `user:*`.
10. Implement an OTP store: set "otp:userId" with 5-minute TTL.

### Intermediate (10 Tasks)
1. Implement sliding window rate limiting with Sorted Sets.
2. Use MULTI/EXEC for atomic inventory decrement + order creation.
3. Implement pub/sub: publish events, subscribe and process them.
4. Build a distributed lock with SETNX and Lua script for atomic release.
5. Use pipelines to batch 100 HSET commands in one round trip.
6. Implement LRU cache with Redis as the backend.
7. Store time-series events in a Redis Stream with consumer group.
8. Build a "recently viewed" list with RPUSH + LTRIM.
9. Implement cache invalidation: delete cache on data update.
10. Monitor Redis memory usage with INFO command.

### Advanced (10 Tasks)
1. Set up Redis Cluster with 3 nodes and test key distribution.
2. Configure Redis Sentinel for high availability failover.
3. Implement Redis ACL: separate credentials per service.
4. Enable TLS on Redis connection in production.
5. Implement CRDT-like counter with Redis (multiple writes, merge on read).
6. Build a geospatial feature with Redis GEO commands.
7. Implement Redis Streams consumer group with worker pool.
8. Benchmark Redis pipeline vs. individual commands (1000 ops).
9. Implement conditional expiry: refresh TTL on each access.
10. Build Redis-backed bloom filter for duplicate detection.

---

## Self Assessment
1. What data types does Redis support?
2. What is the difference between SET and HSET?
3. What is a Sorted Set used for?
4. How do you make multiple commands atomic in Redis?
5. What is Redis pub/sub?
6. What is a Redis pipeline and why is it useful?
7. What is the difference between Redis persistence (RDB vs AOF)?
8. How do Redis TTLs work?
9. When would you use Redis Streams over pub/sub?
10. Why should you never expose Redis directly to the internet?

---

## Cheat Sheet

### Key Commands
```bash
SET key value [EX seconds] [NX]
GET key
DEL key
TTL key
EXPIRE key seconds
INCR key / INCRBY key n

HSET hash field value
HGET hash field
HGETALL hash

LPUSH list value    RPUSH list value
LPOP list           RPOP list
LRANGE list 0 -1

SADD set member     SREM set member
SMEMBERS set        SISMEMBER set member

ZADD zset score member
ZRANK zset member   ZREVRANK zset member
ZRANGE zset 0 -1 WITHSCORES
ZINCRBY zset delta member

PUBLISH channel message
SUBSCRIBE channel
```

### ioredis
```javascript
const redis = new Redis({ host, port, password });
await redis.set("key", value, "EX", 3600);
await redis.get("key");
const pipeline = redis.pipeline();
pipeline.cmd(); const results = await pipeline.exec();
```
