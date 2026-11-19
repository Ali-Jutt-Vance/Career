# Phase 2 — Chapter 20: Rate Limiting

---

## Chapter Overview

Rate limiting controls how many requests a client can make in a given time window. It protects your API from abuse, brute force attacks, scraping, and accidental runaway clients.

**Where to apply rate limiting:**
- Authentication endpoints (login, password reset, OTP)
- Public API endpoints (per IP or API key)
- User-specific actions (post, comment, upload)
- Expensive operations (search, report generation)
- Outbound third-party API calls (honor upstream limits)

---

## Beginner Theory

### Rate Limiting Algorithms

```
Fixed Window Counter:
  Count requests per fixed time window (e.g., 100/min)
  Simple, but burst at window boundary is allowed
  Window: 12:00:00–12:01:00, 100 allowed
  Problem: 100 requests at 12:00:59 + 100 at 12:01:00 = 200 in 2 seconds

Sliding Window Log:
  Store timestamp of every request, count requests in last N seconds
  Accurate, but memory-intensive (stores every request)

Sliding Window Counter:
  Weighted blend of current + previous window counters
  Good accuracy, low memory — most common in production

Token Bucket:
  N tokens added per second, each request consumes a token
  Allows bursts (consume multiple tokens at once)
  Tokens accumulate up to max capacity
  Good for: bursty traffic patterns

Leaky Bucket:
  Requests enter a fixed-rate queue, excess is dropped
  Smooth output regardless of burst
  Good for: outbound API call rate control
```

---

## Basic Examples

### express-rate-limit

```javascript
// npm install express-rate-limit

const rateLimit = require("express-rate-limit");

// Global API rate limit
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max:      100,              // 100 requests per window per IP
  message:  { error: "Too many requests. Try again in 15 minutes." },
  standardHeaders: true,      // Return rate limit info in headers
  legacyHeaders:   false,
  keyGenerator:    (req) => req.ip,
  skip:            (req) => req.ip === "127.0.0.1"  // skip localhost
});

app.use("/api", globalLimiter);

// Strict limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      10,   // only 10 login attempts per 15 minutes
  message:  { error: "Too many login attempts. Try again later." },
  skipSuccessfulRequests: true  // don't count successful logins
});

app.use("/api/auth/login",    authLimiter);
app.use("/api/auth/register", authLimiter);

// Per-user limit (authenticated requests)
const userLimiter = rateLimit({
  windowMs: 60 * 1000,   // 1 minute
  max:      60,           // 60 requests per minute per user
  keyGenerator: (req) => req.user?.id ?? req.ip
});
```

### Redis-Based Sliding Window

```javascript
// npm install rate-limiter-flexible

const { RateLimiterRedis } = require("rate-limiter-flexible");

const loginLimiter = new RateLimiterRedis({
  storeClient:         redis,
  keyPrefix:           "login_rl",
  points:              5,      // 5 attempts
  duration:            900,    // per 15 minutes
  blockDuration:       900,    // block for 15 minutes after exhaustion
  insuranceLimiter:    new RateLimiterMemory({
    // Fallback if Redis is unreachable
    points:   3,
    duration: 900
  })
});

router.post("/login", async (req, res) => {
  const key = req.body.email || req.ip;

  try {
    await loginLimiter.consume(key);
    // Proceed with login logic
  } catch (err) {
    if (err instanceof Error) throw err;  // real error

    // Rate limit exceeded
    const secs = Math.round(err.msBeforeNext / 1000) || 1;
    res.set("Retry-After", String(secs));
    return res.status(429).json({
      error:        "Too many login attempts",
      retryAfter:   secs,
      message:      `Try again in ${secs} seconds`
    });
  }
});

// Reset on successful login (reward good behavior)
async function onLoginSuccess(email) {
  await loginLimiter.delete(email);
}
```

### Sliding Window with Sorted Sets (Pure Redis)

```javascript
// Manual sliding window — most accurate algorithm

async function checkRateLimit(key, maxRequests, windowMs) {
  const now    = Date.now();
  const window = now - windowMs;

  const pipeline = redis.pipeline();
  pipeline.zremrangebyscore(key, 0, window);                    // remove expired
  pipeline.zadd(key, now, `${now}:${crypto.randomUUID()}`);    // add current
  pipeline.zcard(key);                                          // count in window
  pipeline.expire(key, Math.ceil(windowMs / 1000));             // set TTL

  const results = await pipeline.exec();
  const count   = results[2][1];

  return {
    allowed:   count <= maxRequests,
    count,
    remaining: Math.max(0, maxRequests - count),
    resetAt:   new Date(now + windowMs)
  };
}

// Express middleware
function slidingWindowRateLimit({ key, max, windowMs }) {
  return async (req, res, next) => {
    const cacheKey = `rl:${key(req)}`;
    const result   = await checkRateLimit(cacheKey, max, windowMs);

    // Standard rate limit headers (RFC 6585)
    res.set("X-RateLimit-Limit",     String(max));
    res.set("X-RateLimit-Remaining", String(result.remaining));
    res.set("X-RateLimit-Reset",     String(Math.ceil(result.resetAt.getTime() / 1000)));

    if (!result.allowed) {
      res.set("Retry-After", String(Math.ceil(windowMs / 1000)));
      return res.status(429).json({ error: "Rate limit exceeded" });
    }

    next();
  };
}

app.post("/api/posts",
  authenticate,
  slidingWindowRateLimit({ key: (req) => `post:${req.user.id}`, max: 5, windowMs: 60_000 }),
  createPost
);
```

---

## Intermediate Concepts

### Token Bucket (Outbound Rate Limiting)

```javascript
// Control outbound rate to third-party API (e.g., Stripe 100 req/s)

class TokenBucket {
  #key;
  #capacity;
  #refillRate;  // tokens per second
  #redis;

  constructor(redis, key, capacity, refillRate) {
    this.#redis      = redis;
    this.#key        = key;
    this.#capacity   = capacity;
    this.#refillRate = refillRate;
  }

  async consume(tokens = 1) {
    const now = Date.now() / 1000;

    const script = `
      local key        = KEYS[1]
      local capacity   = tonumber(ARGV[1])
      local refillRate = tonumber(ARGV[2])
      local tokens     = tonumber(ARGV[3])
      local now        = tonumber(ARGV[4])

      local bucket = redis.call("HMGET", key, "tokens", "last_refill")
      local current = tonumber(bucket[1]) or capacity
      local last    = tonumber(bucket[2]) or now

      -- Refill tokens based on elapsed time
      local elapsed = now - last
      current = math.min(capacity, current + elapsed * refillRate)

      if current < tokens then
        -- Not enough tokens
        redis.call("HMSET", key, "tokens", current, "last_refill", now)
        redis.call("EXPIRE", key, 3600)
        return 0
      end

      -- Consume tokens
      current = current - tokens
      redis.call("HMSET", key, "tokens", current, "last_refill", now)
      redis.call("EXPIRE", key, 3600)
      return 1
    `;

    const result = await this.#redis.eval(
      script, 1, this.#key,
      this.#capacity, this.#refillRate, tokens, now
    );
    return result === 1;
  }
}

const stripeBucket = new TokenBucket(redis, "stripe:tokens", 100, 100);

async function callStripeAPI(fn) {
  let attempts = 0;
  while (!(await stripeBucket.consume())) {
    if (++attempts > 10) throw new Error("Rate limit: cannot call Stripe");
    await new Promise(r => setTimeout(r, 50));
  }
  return fn();
}
```

### IP Reputation + Progressive Penalties

```javascript
class AdaptiveRateLimiter {
  // Progressive penalties: more violations → longer blocks
  async getBlockDuration(ip) {
    const violations = parseInt(await redis.get(`violations:${ip}`) || "0");
    // 0 violations: 15min block; 1: 1hr; 2: 24hr; 3+: 7d
    const durations = [900, 3600, 86400, 604800];
    return durations[Math.min(violations, durations.length - 1)];
  }

  async recordViolation(ip) {
    const key = `violations:${ip}`;
    await redis.incr(key);
    await redis.expire(key, 604800);  // track for 7 days
  }

  async isBlocked(ip) {
    return !!(await redis.get(`blocked:${ip}`));
  }
}
```

---

## Advanced Concepts

### API Key Rate Limiting

```javascript
// Different limits per API key tier

const tierLimits = {
  free:       { rpm: 60,    rpd: 1000 },
  starter:    { rpm: 300,   rpd: 10_000 },
  pro:        { rpm: 1000,  rpd: 100_000 },
  enterprise: { rpm: 10000, rpd: Infinity }
};

async function apiKeyRateLimit(req, res, next) {
  const apiKey = req.headers["x-api-key"];
  if (!apiKey) return res.status(401).json({ error: "API key required" });

  const keyData = await apiKeyService.validate(apiKey);
  if (!keyData) return res.status(401).json({ error: "Invalid API key" });

  const limits = tierLimits[keyData.tier];

  const [minuteOk, dayOk] = await Promise.all([
    checkRateLimit(`api:${apiKey}:minute`, limits.rpm, 60_000),
    limits.rpd === Infinity ? Promise.resolve({ allowed: true })
      : checkRateLimit(`api:${apiKey}:day`, limits.rpd, 86_400_000)
  ]);

  if (!minuteOk.allowed) {
    return res.status(429).json({ error: "Rate limit exceeded (per minute)", tier: keyData.tier });
  }
  if (!dayOk.allowed) {
    return res.status(429).json({ error: "Daily rate limit exceeded", tier: keyData.tier });
  }

  next();
}
```

---

## Interview Preparation

**Q1: What is the difference between the fixed window and sliding window rate limiting algorithms?**
A: Fixed window counts requests in a fixed time period (e.g., 12:00–12:01). The problem: a client can send 100 requests at 12:00:59 and 100 more at 12:01:00, sending 200 requests in 2 seconds while technically staying within the 100/min limit. Sliding window tracks the actual time window preceding each request — a request at 12:01:30 checks the 60 seconds between 12:00:30 and 12:01:30. More accurate but more memory/compute intensive. Sliding window counter (blending current + previous window counts with a weight) approximates this accurately with constant memory.

**Q2: How do you implement distributed rate limiting across multiple server instances?**
A: Use Redis as the shared counter store. Each server instance atomically reads and increments the same Redis key (using pipelines or Lua scripts for atomicity). Redis's single-threaded model guarantees that concurrent INCR operations from multiple servers produce consistent counts. The `rate-limiter-flexible` library handles this natively with Redis as its store. Avoid using in-process memory for rate limiting in multi-instance deployments — each server has its own counter, multiplying your effective rate by N servers.

**Q3: What HTTP headers should a rate-limited response include?**
A: Standard headers (RFC 6585 and draft IETF Rate Limiting): `X-RateLimit-Limit` — total requests allowed in window. `X-RateLimit-Remaining` — requests remaining in current window. `X-RateLimit-Reset` — Unix timestamp when the window resets. `Retry-After` — seconds until the client can retry (required on 429). Return 429 Too Many Requests status code. Clients should read these headers and implement backoff rather than immediately retrying.

---

## Practical Tasks

### Beginner (10 Tasks)
1. Add `express-rate-limit` global middleware: 100 requests/15 min per IP.
2. Add strict limit to login endpoint: 10 attempts/15 min per IP.
3. Return proper 429 status with `Retry-After` header on rate limit.
4. Add rate limit headers to all responses (X-RateLimit-*).
5. Implement different rate limits for authenticated vs. anonymous users.
6. Test rate limiting with `curl` or Postman — verify 429 after limit.
7. Add `skipSuccessfulRequests: true` to auth limiter.
8. Log rate limit violations with IP and endpoint.
9. Whitelist localhost from rate limiting in development.
10. Apply rate limit to file upload endpoint (max 5 uploads/min).

### Intermediate (10 Tasks)
1. Replace in-memory limiter with Redis using `rate-limiter-flexible`.
2. Implement sliding window rate limiting with Redis Sorted Sets.
3. Add progressive penalties: more violations → longer blocks.
4. Implement token bucket for outbound Stripe API calls.
5. Build per-user rate limiting based on authenticated user ID.
6. Implement API key rate limiting with different tiers (free/pro/enterprise).
7. Add rate limit bypass for trusted IPs (webhook receivers, monitoring).
8. Implement burst allowance: 10 req/s burst, 2 req/s sustained.
9. Monitor rate limit metrics: track 429 rate per endpoint.
10. Build admin endpoint to reset rate limit for specific user.

### Advanced (10 Tasks)
1. Build distributed rate limiting across 5 Node.js instances — verify consistency.
2. Implement adaptive rate limiting: reduce limits when server load is high.
3. Build per-endpoint rate limiting configuration from database.
4. Implement geographic rate limiting (stricter limits for unusual countries).
5. Build AI-based abuse detection integrated with rate limiting.
6. Implement shadow banning (serve 200 but drop requests silently).
7. Build rate limit alerting: notify when a user exceeds 80% of limit.
8. Implement cost-based rate limiting (expensive operations cost more tokens).
9. Build rate limit dashboard showing usage per API key.
10. Implement quota system: monthly API call budgets per customer.

---

## Self Assessment
1. What is rate limiting and why is it needed?
2. What is the difference between fixed window and sliding window?
3. What is a token bucket?
4. What HTTP status code is returned when rate limited?
5. What is the `Retry-After` header?
6. Why can't you use in-memory rate limiting in a multi-server deployment?
7. What is Redis's role in distributed rate limiting?
8. What is the thundering herd and how does it relate to rate limiting?
9. What is progressive penalty in rate limiting?
10. What are the standard rate limit response headers?

---

## Cheat Sheet

```javascript
// express-rate-limit
const limiter = rateLimit({ windowMs: 15*60*1000, max: 100, standardHeaders: true });
app.use("/api", limiter);

// rate-limiter-flexible (Redis)
const rl = new RateLimiterRedis({ storeClient: redis, points: 5, duration: 900 });
try { await rl.consume(key); } catch { return res.status(429)... }

// Sliding window (Redis sorted sets)
pipeline.zremrangebyscore(key, 0, now - windowMs);
pipeline.zadd(key, now, uuid);
pipeline.zcard(key);
const count = results[2][1];
if (count > max) return 429;

// Rate limit headers
res.set("X-RateLimit-Limit",     String(max));
res.set("X-RateLimit-Remaining", String(remaining));
res.set("X-RateLimit-Reset",     String(resetTimestamp));
res.set("Retry-After",           String(secondsToWait));
```
