# Rate Limiting

> [!GOALS]
> - Explain why APIs need limits: abuse, brute-force attacks, scraping, runaway clients, cost and fairness.
> - Understand the main algorithms — **fixed window**, **sliding window**, **token bucket** and **leaky bucket** — and their trade-offs.
> - Choose what to limit by (**keys**: IP address, user, API key, account) and set sensible limits.
> - Implement limits across **many servers** with a shared store such as Redis, atomically.
> - Communicate limits with **`429 Too Many Requests`**, `Retry-After` and rate-limit headers, and write clients that respect them.
> - Protect sensitive endpoints such as login and password reset, and know where rate limiting fits among other defences.

## Why this matters

Every API has a finite capacity — servers, database connections, money spent on third-party calls — and the internet is full of clients that will use all of it if allowed:

- An attacker tries 10,000 passwords against one customer's account, or one common password against 10,000 accounts (**credential stuffing**).
- A scraper downloads your entire product catalogue every hour, slowing the shop for real customers.
- A partner's integration has a bug and retries a failing request in a tight loop, 500 times a second.
- Someone uses your "send verification SMS" endpoint to send thousands of messages — at your expense — to random numbers.
- One large customer runs a giant export at noon, and every other customer's requests slow down.

**Rate limiting** controls how many requests a client may make in a period of time. It protects availability, security, cost and fairness. Done well, it is invisible to normal users and firm with abusers; done badly, it blocks a whole office behind one IP address while letting a distributed attack straight through. This chapter covers the algorithms, the design decisions and the implementation details that make the difference.

## The simple idea

Picture a ticket machine at a popular museum. It hands out a ticket every minute, and visitors may hold up to ten tickets saved up. A visitor who arrives after a quiet hour can walk straight in with a small group — they have saved tickets. A crowd that arrives all at once gets in at the rate tickets are produced, and the rest must wait. Nobody can enter faster than the machine allows over time, but short bursts are fine.

That is a **token bucket**, the most widely used rate-limiting algorithm. Each client has a bucket that fills with tokens at a steady rate up to a maximum. Each request spends a token. No tokens left? Wait.

> [!ANALOGY]
> A rate limiter is like a museum ticket machine: tickets (tokens) are produced at a steady rate and can be saved up to a maximum, each visitor (request) needs one, and when they run out, visitors must wait. Bursts are allowed; sustained floods are not.
>
> **Where the analogy breaks:** a museum can see each visitor's face. An API often cannot tell who is really behind a request — attackers rotate through thousands of IP addresses, while hundreds of honest users may share a single one. Choosing *whose* bucket a request draws from is the hardest part of rate limiting, harder than the algorithm itself.

## The proper definition and key words

**Rate limiting** is restricting the number of requests (or the amount of work) a client can perform within a time period, rejecting or delaying requests beyond the limit.

Key words:

- **Limit** — the allowed amount, such as 100 requests per minute.
- **Key** — what a limit is counted per: an IP address, a user id, an API key, an account, or a combination.
- **Window** — the time period over which requests are counted.
- **Burst** — many requests in a short time.
- **Token bucket** — an algorithm where tokens refill at a steady rate up to a capacity, and each request spends tokens.
- **Leaky bucket** — an algorithm where requests drain from a queue at a fixed rate, smoothing output.
- **Quota** — a larger allowance over a long period, such as 1,000,000 calls per month.
- **Throttling** — slowing clients down; often used as a synonym for rate limiting.
- **`429 Too Many Requests`** — the HTTP status for "you have exceeded a rate limit" (RFC 6585).
- **`Retry-After`** — the response header telling the client how long to wait.
- **Load shedding** — rejecting some requests when the whole system is overloaded, regardless of who sent them.

## The algorithms

### Level 2 — Four ways to count

**Fixed window counter.** Count requests per key in fixed blocks of time (12:00:00–12:00:59, 12:01:00–12:01:59…). Simple and cheap — one counter per key — but it allows **double bursts at boundaries**: 100 requests at 12:00:59 and 100 more at 12:01:00 all pass a "100 per minute" limit.

**Sliding window log.** Store the timestamp of every request and count those within the last 60 seconds. Exact, but memory grows with the limit (a sorted set per key in Redis).

**Sliding window counter.** Keep counts for the current and previous fixed windows and estimate the last 60 seconds with a weighted sum: `previous × (portion of the previous window still inside the last 60 s) + current`. Nearly exact with two counters — a common production choice.

**Token bucket.** Tokens refill continuously at `rate` per second up to `capacity`; each request spends one (or more). The capacity sets the allowed **burst**, the rate sets the **sustained** throughput. Flexible, cheap (two numbers per key) and the most widely used algorithm in API gateways and cloud services.

(**Leaky bucket** is the mirror image: requests enter a queue that drains at a fixed rate, producing a perfectly smooth output — useful when *you* call a provider with a strict rate, less so for answering clients.)

### Level 3 — The boundary problem, measured

Here are three of the algorithms enforcing "10 requests per 60 seconds" against the same traffic: ten requests at second 59 and ten more at second 61:

```ts
// Three algorithms, one limit ("10 requests per 60 seconds"), the same burst of traffic
interface Limiter { allow(t: number): boolean }

class FixedWindow implements Limiter {
  private window = -1; private count = 0;
  constructor(private limit: number, private size: number) {}
  allow(t: number) {
    const w = Math.floor(t / this.size);
    if (w !== this.window) { this.window = w; this.count = 0; }
    return ++this.count <= this.limit || (this.count--, false);
  }
}

class SlidingWindowCounter implements Limiter {
  private window = -1; private current = 0; private previous = 0;
  constructor(private limit: number, private size: number) {}
  allow(t: number) {
    const w = Math.floor(t / this.size);
    if (w !== this.window) { this.previous = w === this.window + 1 ? this.current : 0; this.current = 0; this.window = w; }
    const elapsed = (t % this.size) / this.size;                       // how far into the current window
    const estimate = this.previous * (1 - elapsed) + this.current;      // weighted count over the last 60 s
    if (estimate + 1 > this.limit) return false;
    this.current++;
    return true;
  }
}

class TokenBucket implements Limiter {
  private tokens: number; private last = 0;
  constructor(private capacity: number, private refillPerSecond: number) { this.tokens = capacity; }
  allow(t: number) {
    this.tokens = Math.min(this.capacity, this.tokens + (t - this.last) * this.refillPerSecond);
    this.last = t;
    if (this.tokens < 1) return false;
    this.tokens -= 1;
    return true;
  }
}

// 10 requests at second 59, then 10 more at second 61 — just across a window boundary
const times = [...Array(10).fill(59), ...Array(10).fill(61)];
const limiters: Record<string, Limiter> = {
  "fixed window": new FixedWindow(10, 60),
  "sliding window counter": new SlidingWindowCounter(10, 60),
  "token bucket (10, 1 per 6 s)": new TokenBucket(10, 1 / 6),
};
for (const [name, limiter] of Object.entries(limiters)) {
  const allowed = times.filter((t) => limiter.allow(t)).length;
  console.log(`${name.padEnd(28)} allowed ${allowed} of 20 within 2 seconds`);
}
```

**Output:**

```text
fixed window                 allowed 20 of 20 within 2 seconds
sliding window counter       allowed 10 of 20 within 2 seconds
token bucket (10, 1 per 6 s) allowed 10 of 20 within 2 seconds
```

- The **fixed window** resets at second 60, so it lets all 20 through — double the intended rate within two seconds.
- The **sliding window counter** estimates that at second 61 almost all of the previous window's 10 requests are still within the last 60 seconds (10 × 59/60 ≈ 9.8), so it rejects the second burst.
- The **token bucket** spent its 10 saved tokens at second 59; by second 61 it has refilled only a third of a token.

Fixed windows are still fine for coarse limits ("1,000 per day"), where a boundary burst does not matter. For protection against short floods, use a token bucket or sliding window.

## Designing limits

### Level 3 — Choosing the key

What you count by decides who shares a limit:

| Key | Good for | Problems |
|---|---|---|
| **IP address** | Anonymous traffic, first line of defence | Many users share one IP (offices, mobile carriers' NAT, universities); attackers rotate IPs; IPv6 users can have huge address blocks (limit per /64 prefix rather than per address) |
| **User id** | Logged-in actions (posting, uploads) | Not available before login |
| **API key / client id** | Partner and developer APIs; limits per plan | Keys can leak; one customer may have many keys (limit per account too) |
| **Account / tenant** | Fairness between customers | Large customers may need custom limits |
| **Target resource** | Login attempts **per account being attacked**, SMS **per phone number** | Attackers can lock out victims deliberately — use slowing and challenges rather than hard locks |

Real systems combine them: for example, login attempts limited per IP **and** per username, product searches per IP for anonymous visitors and per user once logged in, partner calls per API key **and** per account.

**Finding the client's real IP** matters behind proxies and load balancers: the connection comes from the proxy, and the client's address is in the `X-Forwarded-For` header — which clients can also forge. Trust only the entries added by **your own** proxies (in Express, configure `app.set("trust proxy", <number of proxies>)`), or every request will appear to come from the load balancer and share one bucket — or attackers will fake a new IP for every request ({{ch:nginx-reverse-proxy}}).

### Level 3 — Choosing the numbers

- Start from **real usage**: look at the distribution of requests per key (for example, the 99th percentile of honest users) and set limits comfortably above it ({{ch:monitoring}}).
- Use **several layers**: a generous global limit per IP, tighter limits on expensive or sensitive endpoints, plan-based limits per API key, and long-period **quotas** for billing.
- **Weigh by cost**: a search or report costs far more than reading one product; give expensive operations a higher cost in the same budget (Exercise 1), as GraphQL APIs do with query cost ({{ch:graphql}}).
- Roll out new limits in **"log only" mode** first: record who would have been limited, check that no legitimate client is affected, then enforce.
- Make limits **configurable without deploying**, and allow per-customer overrides for large partners.

## Implementing limits

### Level 3 — Middleware and responses

A rate limiter is usually middleware that runs early, before expensive work. This Express example uses a token bucket per API key and answers correctly when the limit is exceeded:

```ts
import express, { type Request, type Response, type NextFunction } from "express";
import type { AddressInfo } from "node:net";

type Bucket = { tokens: number; last: number };

function rateLimit(opts: { capacity: number; refillPerSecond: number; key: (req: Request) => string; now?: () => number }) {
  const buckets = new Map<string, Bucket>();          // in production: Redis, shared by all servers
  const now = opts.now ?? (() => Date.now() / 1000);
  return (req: Request, res: Response, next: NextFunction) => {
    const key = opts.key(req);
    const t = now();
    const b = buckets.get(key) ?? { tokens: opts.capacity, last: t };
    b.tokens = Math.min(opts.capacity, b.tokens + (t - b.last) * opts.refillPerSecond);
    b.last = t;
    const allowed = b.tokens >= 1;
    if (allowed) b.tokens -= 1;
    buckets.set(key, b);

    res.set("RateLimit-Limit", String(opts.capacity));
    res.set("RateLimit-Remaining", String(Math.floor(b.tokens)));
    if (allowed) return next();
    const retryAfter = Math.ceil((1 - b.tokens) / opts.refillPerSecond);
    res.set("Retry-After", String(retryAfter));
    res.status(429).type("application/problem+json").json({
      type: "https://docs.cornershop.example/errors/rate-limited", title: "Too many requests", status: 429,
      detail: `Limit is ${opts.capacity} requests; try again in ${retryAfter} s.`,
    });
  };
}

let fakeClock = 1000;                                   // a controllable clock keeps the example reproducible
const app = express();
app.use("/api", rateLimit({
  capacity: 3, refillPerSecond: 0.5,                    // bursts of 3, then one request every 2 seconds
  key: (req) => String(req.headers["x-api-key"] ?? req.ip),
  now: () => fakeClock,
}));
app.get("/api/products", (_req, res) => res.json({ ok: true }));
const server = app.listen(0);
await new Promise((r) => server.once("listening", r));
const url = `http://localhost:${(server.address() as AddressInfo).port}/api/products`;

async function call(label: string, key = "key_partner_a") {
  const res = await fetch(url, { headers: { "X-API-Key": key } });
  const extra = res.status === 429 ? ` retry-after=${res.headers.get("retry-after")}` : "";
  console.log(`${label.padEnd(22)} ${res.status} remaining=${res.headers.get("ratelimit-remaining")}${extra}`);
}

for (let i = 1; i <= 4; i++) await call(`t=0s request ${i}`);
await call("t=0s other partner", "key_partner_b");
fakeClock += 2; await call("t=2s request 5");
fakeClock += 1; await call("t=3s request 6");
server.close();
```

**Output:**

```text
t=0s request 1         200 remaining=2
t=0s request 2         200 remaining=1
t=0s request 3         200 remaining=0
t=0s request 4         429 remaining=0 retry-after=2
t=0s other partner     200 remaining=2
t=2s request 5         200 remaining=0
t=3s request 6         429 remaining=0 retry-after=1
```

- Partner A's burst of three is allowed; the fourth request gets **`429`** with **`Retry-After: 2`** — the time until one token is back.
- Partner B has **its own bucket**, unaffected by A.
- After two seconds, one token has refilled and request 5 succeeds; request 6, one second later, must wait another second.
- Every response reports the remaining allowance, so well-behaved clients can slow down **before** hitting the limit. The example uses the `RateLimit-Limit` / `RateLimit-Remaining` names from the IETF work on standard rate-limit headers; many APIs use the older `X-RateLimit-Limit`, `X-RateLimit-Remaining` and `X-RateLimit-Reset`. Pick one convention and document it ({{ch:api-documentation}}).
- The error body uses the Problem Details format with a link to documentation.
- A fake clock makes the example's timing exact. The `Map` is the part that must change for production, as the next section explains.

In practice, use a maintained library: **`express-rate-limit`** (with a Redis store for multiple servers), **`rate-limiter-flexible`** (many algorithms and stores), or NestJS's **`@nestjs/throttler`** ({{ch:nestjs-advanced}}).

### Level 4 — Many servers: a shared, atomic store

An in-memory `Map` gives **each server its own counters**. With four servers behind a load balancer, a "100 per minute" limit becomes roughly 400 per minute, and restarts reset everything. The standard fix is a shared store — usually **Redis** ({{ch:redis}}) — and the operation must be **atomic**: if two servers read "99 used", both add one and both allow the request, the limit is exceeded. Redis solves this with atomic commands or a short **Lua script** that runs as one indivisible step:

```ts
// fragment
// Token bucket in Redis: one atomic script per request
const TOKEN_BUCKET = `
  local tokens = tonumber(redis.call("HGET", KEYS[1], "tokens") or ARGV[1])
  local last   = tonumber(redis.call("HGET", KEYS[1], "last")   or ARGV[3])
  local capacity, rate, now, cost = tonumber(ARGV[1]), tonumber(ARGV[2]), tonumber(ARGV[3]), tonumber(ARGV[4])
  tokens = math.min(capacity, tokens + (now - last) * rate)
  local allowed = tokens >= cost
  if allowed then tokens = tokens - cost end
  redis.call("HSET", KEYS[1], "tokens", tokens, "last", now)
  redis.call("EXPIRE", KEYS[1], math.ceil(capacity / rate) + 1)
  return { allowed and 1 or 0, tostring(tokens) }
`;

const [allowed, remaining] = await redis.eval(TOKEN_BUCKET, 1, `rl:${key}`, capacity, rate, Date.now() / 1000, cost);
```

Design points:

- **Expire keys** so idle clients do not fill memory.
- Use **one clock** — the Redis server's time (`TIME`) or careful server clocks — so buckets refill consistently.
- Decide what happens **when Redis is unavailable**: **fail open** (allow requests, losing protection briefly) for general API limits, or **fail closed** (reject) for limits guarding costly or dangerous actions such as SMS sending. Libraries offer an in-memory "insurance" limiter as a fallback.
- Keep the check **fast** — it runs on every request; one round trip to Redis is typical.

### Level 4 — Where to enforce

Rate limits can live at several layers, and large systems use more than one:

- **Edge / CDN / WAF** (Cloudflare, AWS WAF, {{ch:cloudfront}}) — blocks floods before they reach your servers; rules per IP, path, country or bot score.
- **API gateway** — per-API-key limits and quotas tied to plans (for example, usage plans in AWS API Gateway, or Kong and similar gateways, {{ch:api-gateway}}).
- **Reverse proxy** — Nginx's `limit_req` for simple per-IP limits ({{ch:nginx-reverse-proxy}}).
- **Application** — limits that need business knowledge: per user, per account, per target phone number, cost-based limits.

The edge handles volume; the application handles meaning.

## Protecting sensitive endpoints

### Level 3 — Login, passwords and verification codes

Authentication endpoints are the most attacked ({{ch:authentication}}):

- **Login**: limit per IP and per username; after several failures for one account, add **increasing delays** or a CAPTCHA rather than a hard lock (hard locks let attackers lock out real users on purpose). Track failures across IPs to detect credential stuffing — many usernames, few attempts each, from many addresses.
- **Password reset and verification emails**: limit per target address and per IP; respond identically whether or not the account exists ({{ch:email}}).
- **SMS codes**: strict limits per phone number, per account and per IP, plus country restrictions — SMS fraud ("toll fraud") costs real money.
- **One-time code verification**: a 6-digit code has only a million possibilities; allow a handful of attempts per code, then invalidate it.

Rate limits slow attackers down; they are one layer among several: strong password hashing, breached-password checks, multi-factor authentication and bot detection ({{ch:application-security}}).

### Level 4 — Rate limits are not enough against distributed attacks

A determined attacker with a botnet sends a few requests from each of 100,000 IP addresses, staying under every per-IP limit. Defences beyond simple limits include bot detection and device signals, CAPTCHAs or proof-of-work challenges for suspicious traffic, reputation data for IP ranges, anomaly detection on global rates per endpoint, and DDoS protection services at the network edge. Rate limiting is necessary but not sufficient.

## Being a good client

### Level 3 — Respecting other people's limits

Your servers also call APIs with limits — payment providers, email services, partners. Good clients:

- **Read `Retry-After`** and wait at least that long on `429` (and `503`).
- **Retry with exponential backoff and jitter**, a capped number of times ({{ch:queues}}).
- **Limit themselves**: a token bucket or a queue with a rate limit in front of the provider, shared across all your workers, so you never exceed their limit in the first place.
- **Spread scheduled work** instead of firing everything at midnight ({{ch:cron-jobs}}).
- **Cache** responses that do not change often ({{ch:caching}}).

### Level 4 — Load shedding and concurrency limits

Rate limits are per client. When the whole system is overloaded — a traffic spike, a slow database — even well-behaved clients together can exceed capacity. **Load shedding** rejects some requests early (`503 Service Unavailable` with `Retry-After`) to keep the rest fast, preferably dropping low-priority traffic first (analytics before checkout). **Concurrency limits** cap how many requests are in progress at once — for example, at most 20 simultaneous report generations — which protects slow resources better than per-second limits ({{ch:performance-engineering}}).

## From beginner to enterprise

**Level 1–2 — first limits.** A rate-limiting middleware on the API, stricter limits on login, `429` with `Retry-After`.

**Level 3 — well-designed limits.** Token bucket or sliding window; keys chosen per endpoint (IP, user, API key, target); correct client IP behind proxies; rate-limit headers; limits documented; good-client behaviour when calling others.

**Level 4 — production systems.** Shared atomic store in Redis; fail-open or fail-closed decided per limit; log-only roll-outs; per-plan limits and quotas; edge or gateway limits for volume; cost-based limits for expensive operations; dashboards of `429`s per key and endpoint.

**Level 5 — professional practice.** Credential-stuffing detection; adaptive limits under load; load shedding and concurrency limits; per-customer overrides managed by support tools; alerts when a key approaches its limit.

**Level 6 — enterprises.** Global rate limiting across regions; DDoS protection at the network edge; bot management; quotas tied to billing and contracts; fairness guarantees for multi-tenant platforms.

## Real-world use cases

### A public partner API

- **Design**: API gateway enforcing per-key plans (free: 60 requests per minute and 10,000 per day; pro: 600 per minute and 1,000,000 per month); application-level cost limits for search and exports; rate-limit headers on every response; a usage dashboard per partner; documented limits and an upgrade path.

### Protecting login

- **Design**: per-IP token bucket (20 attempts per minute, bursting to 10); per-username progressive delays after 5 failures within 15 minutes; CAPTCHA after repeated failures; global alert when failed logins per minute exceed a baseline (credential stuffing); successful logins do not count against the limit.

## Common mistakes

### Beginner: no limits on login, SMS or email endpoints

**Fix:** strict limits per IP and per target, plus delays and challenges.

### Beginner: in-memory limits on several servers

**Consequence:** the real limit is multiplied by the number of servers and reset by every restart. **Fix:** a shared Redis store with atomic updates.

### Beginner: `429` without `Retry-After`

**Consequence:** clients retry immediately and make things worse. **Fix:** always tell clients when to retry.

### Intermediate: the wrong client IP

**Consequence:** everyone shares the load balancer's bucket, or attackers spoof `X-Forwarded-For`. **Fix:** trust only your own proxies' headers.

### Intermediate: per-IP limits only

**Consequence:** offices and mobile networks blocked; distributed attacks ignored. **Fix:** combine keys; use user, API key and target-based limits.

### Intermediate: fixed windows for short-term protection

**Fix:** token bucket or sliding window.

### Production: hard account lockouts

**Consequence:** attackers lock real users out deliberately. **Fix:** progressive delays and challenges.

### Production: enforcing new limits without measuring

**Consequence:** legitimate integrations broken. **Fix:** log-only mode first; base limits on real usage.

## Debugging and troubleshooting

- **Every user gets `429` at once**: all requests appear to come from one IP — check proxy configuration and `trust proxy`.
- **Limits seem several times higher than configured**: counters per server instance instead of a shared store.
- **A partner complains about `429`s at low volume**: their requests share a key with others (one API key used by many systems, or one office IP); look at the key's real traffic; consider per-key overrides.
- **Limits stop working after Redis problems**: the limiter fails open — expected for general limits; add alerting so you know when protection is off.
- **Clients keep hammering after `429`**: missing `Retry-After`, or client libraries without backoff — document expected client behaviour, and consider temporary blocks for clients that ignore limits.

## Security summary

- Rate-limit **authentication, verification, password reset, SMS and email** endpoints strictly, per IP and per target.
- Prefer **progressive delays and challenges** to hard lockouts.
- Determine the **client IP correctly** and never trust forged forwarding headers.
- Use a **shared, atomic** store; decide **fail-open or fail-closed** per limit.
- Combine rate limits with **bot detection, MFA, CAPTCHAs, WAF and DDoS protection** — rate limiting alone does not stop distributed attacks.
- **Monitor** `429` rates and failed-login patterns; alert on spikes.
- Protect **costly operations** (SMS, AI model calls, exports) with limits and budgets, as they are targets for financial abuse.

## How a senior engineer thinks about this

- **Limits protect everyone.** They exist so one client — malicious or buggy — cannot harm the others.
- **The key matters more than the algorithm.** Who shares a bucket decides whether honest users suffer and attackers slip through.
- **Communicate, don't just reject.** Headers, `Retry-After`, documentation and dashboards turn limits into a contract clients can work with.
- **Layers, from edge to application.** Volume is stopped early; business-aware limits live in the application.
- **Measure before and after.** Limits come from data, roll out in log-only mode, and are watched once enforced.

## Exercises

### Exercise 1 — Cost-based limiting

**Objective:** practise weighting operations by cost.
**What to build:** a token bucket where each operation has a **cost**: reading products costs 1, a search costs 5, generating a report costs 50. The bucket holds 100 points and refills at 1 point per second. Return whether each call is allowed, the remaining points, and how long to wait when it is not. Simulate: a product read and a report at second 0, a search at second 1, another report at second 2, and a report at second 30.

<details>
<summary>Show the solution</summary>

```ts
// Cost-based limiting: expensive operations spend more of the budget
const COSTS: Record<string, number> = { "GET /products": 1, "GET /search": 5, "POST /reports": 50 };

class CostBucket {
  private tokens: number; private last = 0;
  constructor(private capacity: number, private refillPerSecond: number) { this.tokens = capacity; }
  take(cost: number, t: number): { ok: boolean; remaining: number; retryAfter?: number } {
    if (cost > this.capacity) return { ok: false, remaining: Math.floor(this.tokens) };   // can never succeed
    this.tokens = Math.min(this.capacity, this.tokens + (t - this.last) * this.refillPerSecond);
    this.last = t;
    if (this.tokens < cost) return { ok: false, remaining: Math.floor(this.tokens), retryAfter: Math.ceil((cost - this.tokens) / this.refillPerSecond) };
    this.tokens -= cost;
    return { ok: true, remaining: Math.floor(this.tokens) };
  }
}

const budget = new CostBucket(100, 1);                  // 100 points, refilled at 1 point per second
const calls: [number, string][] = [[0, "GET /products"], [0, "POST /reports"], [1, "GET /search"], [2, "POST /reports"], [30, "POST /reports"]];
for (const [t, op] of calls) {
  const r = budget.take(COSTS[op]!, t);
  console.log(`t=${String(t).padStart(2)}s ${op.padEnd(14)} cost ${String(COSTS[op]).padStart(2)} → ${r.ok ? "ok" : "429"}  remaining ${r.remaining}${r.retryAfter ? `, retry in ${r.retryAfter}s` : ""}`);
}
```

**Output:**

```text
t= 0s GET /products  cost  1 → ok  remaining 99
t= 0s POST /reports  cost 50 → ok  remaining 49
t= 1s GET /search    cost  5 → ok  remaining 45
t= 2s POST /reports  cost 50 → 429  remaining 46, retry in 4s
t=30s POST /reports  cost 50 → ok  remaining 24
```

**Walkthrough:** the first report spends half the budget; by second 2 the bucket has refilled to 46 points, not enough for a 50-point report, so the client is told to wait 4 seconds. By second 30 it has 74 points and the report succeeds. One budget now covers all operations fairly: a client can make many cheap calls or a few expensive ones. A request costing more than the capacity can never succeed, so it is rejected without a retry time — in a real API, with a clear error explaining why.

</details>

### Exercise 2 — Choose keys and limits

**Objective:** practise designing limits per endpoint.
**What to do:** propose keys and limits for: (1) `POST /login`; (2) `POST /password-reset`; (3) `GET /products` for anonymous visitors; (4) `POST /reviews` for logged-in customers; (5) the partner API; (6) `POST /phone/verify` (sends an SMS).

<details>
<summary>Show the solution</summary>

1. **Login** — per IP (e.g. 20 per minute, burst 10) **and** per username (progressive delays after 5 failures in 15 minutes; CAPTCHA after 10); successful logins not counted.
2. **Password reset** — per target email (3 per hour) and per IP (10 per hour); identical responses whether or not the account exists.
3. **Anonymous product browsing** — per IP, generous (e.g. 300 per minute, burst 100) to allow shared IPs; edge bot protection against scrapers; caching makes this cheap anyway.
4. **Reviews** — per user (5 per hour, 20 per day) plus content checks; per IP as a backstop for many new accounts.
5. **Partner API** — per API key by plan (requests per minute plus monthly quota) and per account across keys; cost weights for search and exports; headers and dashboards.
6. **SMS verification** — per phone number (3 per hour, 10 per day), per account, per IP, plus a global budget per country and alerts on spikes; fail **closed** if the limiter is unavailable, because each message costs money.

</details>

### Exercise 3 — Review a rate-limiting set-up

**Objective:** practise spotting implementation problems.
**The scenario:** an app running on six servers behind a load balancer uses `express-rate-limit` with the default memory store, `max: 100` per 15 minutes per `req.ip`, applied only to `/api/products`. `trust proxy` is not set. Login has no limit. When limited, the API returns `403 Forbidden` with an HTML page. List the problems and fixes.

<details>
<summary>Show the solution</summary>

1. **Memory store on six servers** → effective limit up to 600 and reset on restarts. Use a Redis store.
2. **`trust proxy` not set** → `req.ip` is the load balancer's address, so all users share one bucket and get blocked together. Configure trusted proxies correctly.
3. **Only `/api/products` limited** → login, password reset and other sensitive endpoints unprotected. Add strict limits there first.
4. **Fixed 15-minute window** → boundary bursts; acceptable for coarse limits, but use a token bucket or sliding window for protection against floods.
5. **`403` with HTML** → wrong status and unusable for API clients. Return `429` with `Retry-After`, rate-limit headers and a JSON Problem Details body.
6. **Per-IP only** → shared IPs suffer; consider per-user and per-key limits for authenticated traffic.

</details>

### Exercise 4 — Production scenario: the scraping incident

**Objective:** practise responding to abuse.
**The scenario:** at 03:00 your monitoring shows product API traffic at ten times normal, database CPU at 95%, and slow pages for real customers. Requests come from about 4,000 different IP addresses, each making 20–40 requests per minute — below your per-IP limit of 60 — all walking through product pages in order. What do you do now, and what do you change afterwards?

<details>
<summary>Show the solution</summary>

**Now**
1. **Confirm the pattern**: shared characteristics — user agent, IP ranges or hosting providers, request order, missing cookies or JavaScript execution.
2. **Block or challenge at the edge**: WAF rules for the identified IP ranges, autonomous system numbers or signatures; managed bot protection or a challenge for suspicious clients. The edge absorbs the traffic before it reaches your servers.
3. **Protect the database**: serve product pages from cache (CDN or Redis) with longer lifetimes during the incident; apply load shedding to non-essential endpoints if needed ({{ch:caching}}).
4. **Communicate**: status page if customers are affected; incident channel with timeline.

**Afterwards**
5. **Global and aggregate limits**: alert and act on total traffic per endpoint and per network range, not only per IP.
6. **Bot management**: device and behaviour signals, challenges for anonymous high-volume browsing.
7. **Cheaper reads**: product pages cached at the CDN so scraping costs little even when it happens.
8. **Offer a legitimate path**: if people want catalogue data, a documented partner feed or API with keys and limits.
9. **Post-incident review** with detection time, response time and the new safeguards ({{ch:observability-and-incidents}}).

</details>

## Summary

**Rate limiting** restricts how many requests — or how much work — a client can perform in a period, protecting availability, security, cost and fairness. The **fixed window** counter is simple but allows bursts at window boundaries; the **sliding window** log is exact but memory-hungry; the **sliding window counter** approximates it with two counters; the **token bucket** — tokens refilling at a steady rate up to a capacity — allows controlled bursts and is the most common choice; the **leaky bucket** smooths output.

The **key** decides who shares a limit: IP addresses (with care for shared addresses, IPv6 blocks and forged forwarding headers behind proxies), user ids, API keys, accounts and target resources such as usernames and phone numbers — usually combined. Limits come from real usage data, roll out in log-only mode, and can weigh operations by **cost**. With several servers, counters must live in a **shared, atomic store** such as Redis (atomic commands or Lua scripts), with a deliberate fail-open or fail-closed choice. Enforcement happens in layers: edge and WAF for volume, API gateways for plans and quotas, the application for business-aware limits.

Rejected requests get **`429 Too Many Requests`** with **`Retry-After`**, and every response can report remaining allowance in rate-limit headers. Sensitive endpoints — login, password reset, SMS — need strict limits per IP and per target, progressive delays rather than hard lockouts, and support from MFA, bot detection and DDoS protection. Your own clients should respect others' limits with backoff, jitter and self-limiting, and systems under overall overload use **load shedding** and **concurrency limits**.

## Key terms

- **Rate limiting** — Restricting the number of requests or amount of work a client may perform in a time period.
- **Throttling** — Slowing down or limiting clients' requests; often used interchangeably with rate limiting.
- **Rate-limit key** — The identity a limit is counted per, such as an IP address, user or API key.
- **Fixed window counter** — Counting requests in fixed time blocks that reset at boundaries.
- **Sliding window log** — Storing request timestamps and counting those within the last period.
- **Sliding window counter** — Estimating a rolling count from weighted current and previous window counters.
- **Token bucket** — An algorithm where tokens refill at a steady rate up to a capacity and requests spend tokens.
- **Leaky bucket** — An algorithm where requests drain from a queue at a fixed rate.
- **Burst** — A large number of requests in a short time.
- **Quota** — A large allowance over a long period, such as a monthly call budget.
- **Cost-based rate limiting** — Charging different amounts of a budget for operations of different expense.
- **429 Too Many Requests** — The HTTP status indicating a client exceeded a rate limit.
- **Retry-After** — A response header stating how long the client should wait before retrying.
- **Rate-limit headers** — Response headers reporting a client's limit, remaining allowance and reset time.
- **X-Forwarded-For** — A header listing client and proxy addresses, which must only be trusted from your own proxies.
- **Trust proxy** — Configuration telling a framework which proxies' forwarding headers to believe.
- **Atomic operation** — An operation that completes as one indivisible step, preventing race conditions.
- **Lua script (Redis)** — A script executed atomically inside Redis, often used for rate limiting.
- **Fail open / fail closed** — Allowing requests or rejecting them when the rate limiter's store is unavailable.
- **Credential stuffing** — Trying leaked username and password pairs against many accounts.
- **Brute-force attack** — Trying many possible passwords or codes against one target.
- **Load shedding** — Rejecting some requests during overload to keep the system responsive.
- **Concurrency limit** — A cap on how many requests or jobs run at the same time.
- **Web application firewall (WAF)** — An edge service that filters HTTP traffic using rules and threat data.

## What comes next

This chapter ends the part on building back ends. Almost everything in it — sessions, rate-limit counters, queues, caches — sits on top of data stores, and the most important of those is the relational database. The next part begins with {{ch:sql}}: tables, rows and relationships, and the SQL language for querying and changing data, from the first `SELECT` to joins, grouping and subqueries.
