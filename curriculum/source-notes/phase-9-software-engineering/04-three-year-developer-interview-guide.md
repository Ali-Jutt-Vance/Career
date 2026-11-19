# Phase 9 — Chapter 4: 3-Year Developer Interview Mastery Guide

> **Who this chapter is for:** Developers with 2–4 years of experience targeting mid-level (SDE II / Software Engineer II) roles at product companies, startups, and consultancies. Every answer below is written at the depth interviewers expect — not one-liners, but structured explanations you can speak aloud for 2–5 minutes.

---

## Chapter Overview

At **3 years of experience**, interviewers stop asking "can you write a for-loop?" and start asking:

- **Can you own a feature end-to-end?** (design → code → test → deploy → monitor)
- **Do you understand trade-offs?** (not just "use Redis" but *when* and *why*)
- **Can you debug production issues?** (logs, metrics, root cause, fix, prevent recurrence)
- **Do you write maintainable code?** (patterns, testing, reviews, documentation)
- **Can you explain your past work with impact?** (STAR stories with numbers)

### What Companies Expect at 3 YOE

| Area | Junior (0–2 yr) | **Mid-Level (2–5 yr)** | Senior (5+ yr) |
|------|-----------------|------------------------|----------------|
| Scope | Single tasks | **Own features end-to-end** | Own systems / teams |
| Design | Given specs | **Propose approach, justify trade-offs** | Architecture decisions |
| Debugging | With help | **Independent root-cause analysis** | Cross-service debugging |
| Code quality | Works | **Testable, reviewed, documented** | Sets team standards |
| System design | Not expected | **Basic designs (API, DB, cache)** | Large-scale distributed |
| Leadership | Learn | **Mentor juniors informally** | Formal tech lead |

### Typical Interview Rounds (3 YOE)

```
Round 1 — Recruiter Screen (30 min)
  Your experience, salary expectations, visa/location, timeline.
  Prepare: 2-minute intro, why this company, expected compensation range.

Round 2 — Technical Phone Screen (45–60 min)
  1–2 coding problems (Easy–Medium LeetCode level)
  OR live coding on a shared editor (build a small API endpoint, fix a bug)
  Basic technical questions about your stack.

Round 3 — Technical Onsite / Virtual Loop (3–5 hours)
  ├── Coding 1: Arrays, strings, hash maps (45 min)
  ├── Coding 2: Trees, graphs, or DP (45 min)
  ├── System Design Lite: Design a URL shortener, rate limiter, or notification system (45 min)
  ├── Backend/Frontend Deep Dive: Questions on your resume stack (45 min)
  └── Behavioral: STAR stories, teamwork, conflict (30–45 min)

Round 4 — Hiring Manager (30–45 min)
  Culture fit, career goals, team dynamics, your questions for them.

Round 5 — (Sometimes) Bar Raiser / Director
  At Amazon: Leadership Principles. At others: senior engineer assesses "would I want this person on my team?"
```

### How to Use This Chapter

1. Read each **Deep Answer** out loud — if you stumble, that's your study gap.
2. For every technical answer, practice the **"First sentence → Detail → Trade-off → Example"** structure.
3. Pair this chapter with the topic-specific chapters (JavaScript, Node, React, PostgreSQL, REST APIs).
4. Complete the **8-Week Study Plan** at the end before your first interview.

---

## How to Structure Any Technical Answer

Interviewers at 3 YOE want to hear **structured thinking**, not memorized definitions.

### The 4-Part Answer Framework

```
1. DIRECT ANSWER (10 seconds)
   "A closure is a function that remembers variables from where it was created."

2. HOW IT WORKS (30–60 seconds)
   Explain the mechanism — execution context, scope chain, heap vs stack.

3. REAL-WORLD USE (30 seconds)
   "We used closures in our payment service to create per-request logger contexts
    that automatically included userId and requestId in every log line."

4. TRADE-OFF OR GOTCHA (20 seconds)
   "The common mistake is creating closures inside loops without let/const,
    which captures the wrong variable. Also, closures can cause memory leaks
    if they hold references to large objects."
```

### Red Flags Interviewers Watch For

- **Buzzwords without depth:** "We use microservices" but can't explain when you'd choose monolith.
- **No numbers in behavioral answers:** "I improved performance" vs "I reduced p95 latency from 800ms to 120ms."
- **Blaming others:** Always show what *you* did, even in team projects.
- **Not asking clarifying questions:** In coding and system design, silence then wrong assumption = fail.
- **Ignoring edge cases:** Empty input, null, concurrent access, network failure.

---

## JavaScript — Deep Interview Answers

### Beginner / Core

**Q1: What is the difference between `null` and `undefined`?**

**What they're testing:** Do you understand JavaScript's type system and intentional vs accidental absence of value?

**Deep Answer:**

`undefined` means a variable exists but has no assigned value. JavaScript assigns `undefined` automatically in these cases: a declared variable without initialization (`let x;`), a function parameter that wasn't passed, a function with no `return` statement, and accessing a property that doesn't exist on an object.

`null` is an intentional assignment meaning "no value" or "empty." A developer explicitly sets `user.avatar = null` to mean "this user has no avatar" — different from `undefined` which would mean "we haven't checked yet."

The famous `typeof null === "object"` is a bug from the first JavaScript implementation (null was represented as zero pointer, same tag as objects). Use `value === null` or `value == null` (checks both null and undefined) instead of relying on `typeof`.

In APIs, use `null` in JSON responses for known-empty fields. Use omission or `undefined` (which JSON.stringify strips) for optional fields not provided.

**Follow-up they might ask:** "How do you check for null or undefined safely?" → Optional chaining (`user?.address?.city`), nullish coalescing (`name ?? "Anonymous"`), or explicit `value == null` for both.

---

**Q2: Explain hoisting in detail.**

**What they're testing:** Do you understand how JavaScript parses and executes code before runtime?

**Deep Answer:**

JavaScript has two phases: **creation** (compile) and **execution**. During creation, the engine scans the scope and registers all declarations — this is hoisting.

For `var`: the declaration is hoisted and initialized to `undefined`. So `console.log(x); var x = 5` prints `undefined`, not ReferenceError.

For `let` and `const`: declarations are hoisted but NOT initialized. They sit in the **Temporal Dead Zone (TDZ)** from the start of the block until the declaration line. Accessing them before that line throws `ReferenceError`.

For `function` declarations: the entire function is hoisted. You can call `sayHi()` before its declaration in the same scope.

For `function` expressions and arrow functions assigned to `const`/`let`: only the variable is hoisted (TDZ applies), not the function body.

**Real interview tip:** Draw the scope on a whiteboard. Show creation phase vs execution phase. This demonstrates depth beyond memorization.

---

**Q3: What are closures and why do they matter in production?**

**What they're testing:** One of the most asked JS questions at every level. At 3 YOE they want practical examples.

**Deep Answer:**

A closure is created when a function is defined inside another function and the inner function references variables from the outer function's scope. The inner function "closes over" those variables, keeping them alive even after the outer function has returned.

Mechanically: when the outer function executes, it creates a lexical environment. The inner function carries a reference to that environment. When the inner function runs later (even asynchronously), it still has access to those variables via the scope chain.

**Production use cases:**

1. **Data privacy / encapsulation:** Module pattern, factory functions that hide internal state.
2. **Partial application / currying:** `const multiplyBy5 = multiply(5)` in functional pipelines.
3. **Event handlers with context:** Button click handler that remembers which item was clicked without global state.
4. **Debouncing/throttling:** The timer ID is stored in closure scope.
5. **Middleware in Express:** Each request gets a closure over `req`, `res`, `next`.

**Common bug — loop closure:**
```javascript
// BUG: all buttons log "5"
for (var i = 0; i < 5; i++) {
  buttons[i].onclick = () => console.log(i);
}

// FIX: use let (block scope) or IIFE
for (let i = 0; i < 5; i++) {
  buttons[i].onclick = () => console.log(i);
}
```

**Memory leak warning:** Closures keep referenced variables alive. If a closure captures a large object unnecessarily (e.g., entire `req` object in a long-lived callback), GC cannot free it.

---

**Q4: Explain the event loop — how does async JavaScript actually work?**

**What they're testing:** Critical for Node.js and frontend roles. Shows you understand concurrency model.

**Deep Answer:**

JavaScript runs on a **single thread** with one call stack. It cannot do two things simultaneously. But it handles thousands of concurrent operations through the **event loop**.

When you call an async operation (`setTimeout`, `fetch`, `fs.readFile`, database query):

1. The sync code runs on the call stack until empty.
2. The async operation is handed to the **browser/Node APIs** (implemented in C++ / libuv) — outside the JS thread.
3. JS continues executing other code (non-blocking).
4. When the async operation completes, its callback is placed in a **queue**.
5. The **event loop** checks: "Is the call stack empty?" If yes, it takes the next callback from the queue and pushes it onto the stack.

**Two queue types:**

- **Macrotask queue:** `setTimeout`, `setInterval`, I/O callbacks, `setImmediate` (Node).
- **Microtask queue:** `Promise.then`, `queueMicrotask`, `process.nextTick` (Node — highest priority).

**Rule:** After each macrotask, the event loop drains the **entire** microtask queue before the next macrotask.

```javascript
console.log("1");
setTimeout(() => console.log("2"), 0);
Promise.resolve().then(() => console.log("3"));
console.log("4");
// Output: 1, 4, 3, 2
```

**Why this matters in production:** Long synchronous code blocks the event loop — no timers fire, no HTTP responses sent, health checks fail. In Node.js, a 200ms CPU-heavy sync loop blocks ALL requests on that process. Solution: Worker Threads, breaking work into chunks with `setImmediate`, or moving CPU work to a separate service.

---

### Intermediate / Mid-Level

**Q5: Explain prototypal inheritance vs classical inheritance.**

**Deep Answer:**

JavaScript doesn't have classes in the traditional sense (ES6 `class` is syntactic sugar over prototypes). Every object has an internal `[[Prototype]]` link (accessible via `Object.getPrototypeOf()` or deprecated `__proto__`).

When you access `obj.color`, the engine: (1) looks on `obj`, (2) if not found, looks on `obj.[[Prototype]]`, (3) repeats until `null`.

`class Dog extends Animal` sets `Dog.prototype.[[Prototype]] = Animal.prototype`. `new Dog()` creates an object whose `[[Prototype]]` is `Dog.prototype`.

**vs Classical (Java/Java/C#):** Classes are blueprints copied at instantiation. JS objects delegate to prototypes at lookup time — you can modify `Dog.prototype.bark` after instances exist and all dogs get the update.

**Interview follow-up:** "How do you create an object with no prototype?" → `Object.create(null)` — used for pure dictionaries to avoid prototype pollution attacks.

---

**Q6: What is the difference between `==` and `===`? Give surprising examples.**

**Deep Answer:**

`===` (strict equality): compares type AND value. No coercion. **Always use in production.**

`==` (loose equality): applies Abstract Equality Comparison algorithm with type coercion:

```javascript
0 == false        // true  (false → 0)
"" == false       // true
null == undefined // true  (special case)
"5" == 5          // true  (string → number)
[] == false       // true  ([] → "" → 0, false → 0)
[] == ![]         // true  (both coerce to 0!)
```

The only acceptable `==` use: `value == null` checks both `null` and `undefined` in one expression.

---

**Q7: How does `this` work in JavaScript?**

**Deep Answer:**

`this` is determined by **how a function is called**, not where it's defined (except arrows).

| Call pattern | `this` value |
|-------------|-------------|
| `obj.method()` | `obj` |
| `func()` (standalone) | `undefined` (strict) or `global` (sloppy) |
| `new Func()` | new object being created |
| `func.call(ctx)` / `apply` / `bind` | `ctx` |
| Arrow function | lexical `this` from enclosing scope |

**Common production bug:** Extracting a method loses `this`:
```javascript
const user = { name: "Ali", greet() { console.log(this.name); } };
const fn = user.greet;
fn(); // undefined — this is not user

// Fix: bind, arrow in class field, or call as user.greet()
```

In React class components, always bind event handlers or use arrow class fields.

---

## Node.js — Deep Interview Answers

**Q8: Explain the Node.js event loop phases in detail.**

**What they're testing:** Core Node.js competency for any backend role.

**Deep Answer:**

Node.js uses **libuv** for the event loop. Unlike browser JS (which has one queue), Node has **phases**:

1. **timers:** Executes `setTimeout` and `setInterval` callbacks whose deadline has passed.
2. **pending callbacks:** I/O callbacks deferred from previous cycle (e.g., TCP errors).
3. **idle, prepare:** Internal libuv use.
4. **poll:** Retrieves new I/O events. Blocks here if no timers are scheduled and no pending callbacks. Executes I/O callbacks.
5. **check:** `setImmediate` callbacks run here.
6. **close callbacks:** e.g., `socket.on('close', ...)`.

**Between every phase:** Process all `process.nextTick` callbacks, then all Promise microtasks.

**setImmediate vs setTimeout(0):** In I/O cycle, `setImmediate` runs before `setTimeout`. Outside I/O, order can vary.

**Thread pool:** CPU/disk work (`fs`, `crypto`, `dns.lookup`, `zlib`) runs on libuv's thread pool (default 4 threads). Heavy crypto blocks the pool — use `UV_THREADPOOL_SIZE` or worker threads.

**Production implication:** Monitor event loop lag (`perf_hooks.monitorEventLoopDelay()`). Lag > 100ms means your server is struggling to respond on time.

---

**Q9: When would you use streams instead of reading a full file?**

**Deep Answer:**

Streams process data in **chunks** (default 64KB in Node). Memory stays constant regardless of file size.

Without streams: `fs.readFile('2gb.log')` allocates 2GB RAM → OOM crash on small containers.

With streams: `fs.createReadStream('2gb.log').pipe(res)` uses ~64KB at a time.

**Four stream types:** Readable, Writable, Duplex, Transform.

**Backpressure:** When writable is slower than readable, `write()` returns `false`. Pause readable until `drain` event. `.pipe()` handles this automatically.

**Real example:** CSV import API — stream file upload → parse line by line → batch insert to DB. Never load 500MB upload into memory.

---

**Q10: Cluster vs Worker Threads — when to use each?**

**Deep Answer:**

**Cluster module:** Forks separate OS processes, each with own V8 instance and event loop. Shares server port via master process. Use for: scaling HTTP servers across CPU cores (one process per core). Processes don't share memory — communicate via IPC.

**Worker Threads:** Threads within same process. Share memory via `SharedArrayBuffer` / `MessageChannel`. Use for: CPU-intensive tasks (image resize, PDF generation, complex JSON parsing) without blocking main event loop. Lower overhead than cluster for single heavy task.

**Rule of thumb:**
- Many concurrent HTTP connections → Cluster (or container replicas behind load balancer).
- One request needs heavy CPU → Worker Thread for that task.
- At 3 YOE: mention you'd use container orchestration (K8s/ECS) with horizontal scaling rather than Node cluster in modern deployments.

---

## REST APIs — Deep Interview Answers

**Q11: What makes an API truly RESTful?**

**Deep Answer:**

Roy Fielding defined REST as an **architectural style** with 6 constraints:

1. **Client-Server:** Separation of concerns — UI independent from data storage.
2. **Stateless:** Each request contains all information needed. Server stores no client session state (auth token in header is fine — it's client-provided state).
3. **Cacheable:** Responses must define themselves as cacheable or not (`Cache-Control`, `ETag`).
4. **Uniform Interface:** Resources identified by URIs, manipulation through representations, self-descriptive messages, HATEOAS.
5. **Layered System:** Client can't tell if connected to end server or intermediary (load balancer, CDN).
6. **Code on Demand (optional):** Server sends executable code (rarely used).

**Richardson Maturity Model:**
- Level 0: Single URI, single HTTP method (RPC over HTTP).
- Level 1: Multiple URIs (resources).
- Level 2: HTTP verbs + status codes (most "REST" APIs).
- Level 3: HATEOAS — responses include links to related actions.

Fielding says most Level 2 APIs are "HTTP APIs," not REST. That's fine — Level 2 is industry standard.

**What interviewers want at 3 YOE:** Correct HTTP method usage, proper status codes, stateless design, versioning strategy, pagination, error format consistency.

---

**Q12: Explain idempotency with real API examples.**

**Deep Answer:**

An operation is **idempotent** if calling it N times has the same effect as calling it once.

| Method | Idempotent? | Why |
|--------|------------|-----|
| GET | Yes | Read-only |
| PUT | Yes | Replaces entire resource — 2nd PUT with same body = same state |
| DELETE | Yes | 1st delete removes resource; 2nd returns 404 but state unchanged |
| PATCH | Usually No | `PATCH {count: +1}` twice ≠ once |
| POST | No | Creates new resource each time |

**Why it matters:** Networks fail. Clients retry. Without idempotency, a payment POST retried 3 times charges the customer 3 times.

**Idempotency key pattern:**
```javascript
// Client sends: Idempotency-Key: uuid-v4
async function createPayment(req, res) {
  const key = req.headers['idempotency-key'];
  const existing = await redis.get(`idem:${key}`);
  if (existing) return res.status(200).json(JSON.parse(existing));

  const result = await processPayment(req.body);
  await redis.setex(`idem:${key}`, 86400, JSON.stringify(result));
  return res.status(201).json(result);
}
```

Store key for 24 hours. Same key → return cached response without reprocessing.

---

**Q13: 401 vs 403 — explain with scenarios.**

**Deep Answer:**

- **401 Unauthorized:** Authentication failed or missing. "Who are you?" Client should provide credentials (login, refresh token). Include `WWW-Authenticate` header.
- **403 Forbidden:** Authenticated but not permitted. "I know who you are, but you can't do this."

**Scenarios:**
- No JWT sent → **401**
- Expired JWT → **401** (re-authenticate)
- Valid JWT, user role is `viewer`, tries `DELETE /admin/users` → **403**
- Valid JWT, user tries to access another user's private data → **403**
- IP blocked by firewall → sometimes **403** (debated — some use 404 to hide existence)

**Common mistake:** Returning 401 when user IS logged in but lacks permission. This confuses clients into redirecting to login instead of showing "access denied."

---

**Q14: Design pagination for a real-time feed.**

**Deep Answer:**

**Offset pagination** (`?page=2&limit=20`): `OFFSET 20 LIMIT 20`. Simple but broken for real-time feeds — new items inserted at top shift all offsets. Page 2 might show duplicates from page 1. Also slow on large offsets (DB scans all skipped rows).

**Cursor pagination** (`?cursor=eyJpZCI6MTIzfQ&limit=20`): Cursor encodes position (last seen ID + timestamp). Query: `WHERE (created_at, id) < (cursor_ts, cursor_id) ORDER BY created_at DESC LIMIT 20`.

**Advantages:** Stable with concurrent inserts, efficient with index on `(created_at, id)`, no duplicate/skipped items.

**Response format:**
```json
{
  "data": [...],
  "pagination": {
    "next_cursor": "eyJpZCI6MTA1fQ",
    "has_more": true
  }
}
```

**Trade-off:** Can't jump to "page 47." Only forward/backward navigation. Fine for feeds; bad for admin tables where users need random page access.

---

## PostgreSQL — Deep Interview Answers

**Q15: Explain MVCC and why it matters.**

**Deep Answer:**

**Multi-Version Concurrency Control** lets readers and writers work simultaneously without row-level read locks.

When you `UPDATE` a row, PostgreSQL doesn't overwrite in place. It creates a **new row version** with a new `xmin` (transaction ID that created it). The old version remains visible to transactions that started before the update.

Each transaction gets a **snapshot** at start — it sees only row versions valid at that snapshot time. `SELECT` never blocks `UPDATE`. `UPDATE` never blocks `SELECT`.

**Downside:** Dead tuples accumulate. **VACUUM** reclaims space from dead rows. **Autovacuum** runs automatically but can fall behind on write-heavy tables → table bloat → slow queries.

**Interview tip:** Mention `EXPLAIN ANALYZE` shows seq scans on bloated tables. Check `pg_stat_user_tables.n_dead_tup`.

---

**Q16: How do you optimize a slow query?**

**Deep Answer — step by step (say this in interviews):**

1. **Identify:** Application logs slow query alerts, or `pg_stat_statements` extension shows top queries by total time.
2. **EXPLAIN ANALYZE:** Run the actual query with real parameters. Look for: Seq Scan (bad on large tables), high actual rows vs estimated rows (stale statistics), nested loops with high row counts.
3. **Add index:** B-tree for equality/range (`WHERE status = 'active' AND created_at > ...`). Composite index column order matters — most selective first, or match `ORDER BY`.
4. **Partial index:** `CREATE INDEX ON orders (user_id) WHERE status = 'pending'` — smaller, faster for hot queries.
5. **Rewrite query:** Avoid `SELECT *`, avoid functions on indexed columns (`WHERE YEAR(created_at) = 2024` kills index — use range instead).
6. **Update statistics:** `ANALYZE table_name;`
7. **Connection pooling:** PgBouncer if connection overhead is high.

**Real example:** Query taking 3 seconds with Seq Scan on 2M rows. Add index on `user_id` → 12ms Index Scan. Mention you verified with `EXPLAIN ANALYZE` before and after.

---

**Q17: Optimistic vs Pessimistic locking.**

**Deep Answer:**

**Pessimistic:** Lock row before reading. `SELECT * FROM accounts WHERE id = 1 FOR UPDATE`. Other transactions wait. Use when: high contention, conflicts are common (ticket booking, inventory).

**Optimistic:** Read without lock. On update, check version: `UPDATE accounts SET balance = 90, version = 2 WHERE id = 1 AND version = 1`. If 0 rows updated, someone else modified it → retry. Use when: low contention, reads >> writes (user profile updates).

**At 3 YOE:** Describe implementing optimistic locking with a `version` integer column. Show you understand retry logic and user-facing conflict messages ("Someone else edited this — please refresh").

---

## React — Deep Interview Answers

**Q18: Explain React re-rendering — when does a component re-render?**

**Deep Answer:**

A component re-renders when:
1. Its **state** changes (`useState`, `useReducer`).
2. Its **parent** re-renders (child re-renders by default).
3. **Context** value it consumes changes.

Re-render ≠ DOM update. React calls the component function, gets new virtual DOM, diffs against previous (reconciliation), updates only changed DOM nodes.

**Optimization tools:**
- `React.memo(Component)` — skip re-render if props shallow-equal.
- `useMemo` — cache expensive computed value.
- `useCallback` — stable function reference for memo children.
- Split context — don't put frequently-changing values in same context as static config.

**Don't premature optimize:** `useMemo`/`useCallback` have overhead. Profile first. At 3 YOE, show you know WHEN to optimize (list with 10,000 items, expensive filter) not blanket wrapping everything.

---

**Q19: useEffect pitfalls and the dependency array.**

**Deep Answer:**

`useEffect(fn, deps)` runs `fn` after render when `deps` change.

**Common bugs:**

1. **Missing dependencies:** ESLint `react-hooks/exhaustive-deps` warns. Stale closure — effect uses old state value.
2. **Object/array in deps:** New reference every render → infinite loop. Fix: depend on primitives, use `useMemo` for objects, or move object inside effect.
3. **Missing cleanup:** `useEffect(() => { const sub = subscribe(); return () => sub.unsubscribe(); }, [])` — without cleanup: memory leaks, duplicate subscriptions.
4. **Fetching in useEffect without abort:** Race condition — slow request returns after fast one, shows stale data. Fix: `AbortController` or ignore flag.

```javascript
useEffect(() => {
  const controller = new AbortController();
  fetch(`/api/user/${id}`, { signal: controller.signal })
    .then(r => r.json())
    .then(setUser)
    .catch(err => { if (err.name !== 'AbortError') setError(err); });
  return () => controller.abort();
}, [id]);
```

---

**Q20: Controlled vs uncontrolled components.**

**Deep Answer:**

**Controlled:** React state is single source of truth. `value={email} onChange={e => setEmail(e.target.value)}`. React controls the input. Required for: instant validation, conditional disable, formatting as user types.

**Uncontrolled:** DOM holds the value. Access via `ref.current.value`. Use for: simple forms, file inputs (always uncontrolled), integrating non-React libraries.

**At 3 YOE:** Mention form libraries (React Hook Form) use uncontrolled inputs with refs for performance — fewer re-renders on every keystroke — while still providing validation.

---

## System Design — Mid-Level (3 YOE)

At 3 YOE you won't design Netflix, but you **will** design:

- URL shortener
- Rate limiter
- Notification system
- File upload service
- Simple chat / polling API
- Cache layer for existing API

### Framework (45-minute design)

```
Minutes 0–5:   Clarify requirements (write them down)
Minutes 5–10:  Estimate scale (users, QPS, storage)
Minutes 10–20: High-level boxes (client → LB → API → DB → cache)
Minutes 20–35: Deep dive on hardest part (data model OR scaling)
Minutes 35–40: Bottlenecks and how to fix them
Minutes 40–45: Summary and trade-offs you considered
```

### Example: Design a Rate Limiter

**Clarify:**
- Per user? Per IP? Global?
- Limit: 100 requests/minute?
- Distributed (multiple API servers)? → needs Redis, not in-memory Map.

**High-level:**
```
Client → API Gateway (rate limit check) → Backend Services
                    ↓
                  Redis (sliding window counters)
```

**Algorithm — Sliding Window Log:**
- Key: `ratelimit:{userId}`
- Value: sorted set of timestamps
- On request: remove entries older than 60s, count remaining, if < 100 allow and add timestamp, else 429.

**Trade-offs:**
- Fixed window: simpler but allows 2× burst at window boundary.
- Token bucket: allows controlled bursts, more complex.
- In-memory: fast but doesn't work across multiple servers.

---

## Coding Interview — Patterns for 3 YOE

### Must-Know Patterns (NeetCode 150 focus)

| Pattern | When to use | Example problems |
|---------|------------|------------------|
| Hash Map | O(1) lookup, counting, duplicates | Two Sum, Group Anagrams |
| Two Pointers | Sorted array, palindrome, pairs | 3Sum, Container With Most Water |
| Sliding Window | Subarray/substring with constraint | Longest Substring Without Repeating |
| Binary Search | Sorted data, search space | Search Rotated Array |
| BFS/DFS | Trees, graphs, islands | Number of Islands, Level Order |
| Dynamic Programming | Optimal substructure + overlap | Climbing Stairs, Coin Change |
| Stack | Matching, monotonic, parsing | Valid Parentheses, Daily Temperatures |
| Heap | Top K, merge K sorted | Kth Largest Element |

### How to Solve Any Problem (say out loud)

```
1. "Let me clarify the input constraints..."
2. "I'll trace through an example: input [2,7,11,15], target 9..."
3. "Brute force would be O(n²) — check every pair."
4. "I can optimize with a hash map — for each number, check if (target - num) exists."
5. "Time O(n), space O(n)."
6. [Write clean code]
7. "Let me test edge cases: empty array, no solution, duplicate values."
```

### Top 20 Must-Practice Problems for 3 YOE

1. Two Sum
2. Valid Parentheses
3. Merge Two Sorted Lists
4. Best Time to Buy and Sell Stock
5. Valid Anagram
6. Maximum Subarray (Kadane's)
7. Product of Array Except Self
8. 3Sum
9. Container With Most Water
10. Longest Substring Without Repeating Characters
11. Longest Repeating Character Replacement
12. Binary Search
13. Search in Rotated Sorted Array
14. Reverse Linked List
15. Merge K Sorted Lists
16. Number of Islands (BFS/DFS)
17. Clone Graph
18. Climbing Stairs
19. Coin Change
20. LRU Cache

---

## Behavioral Interview — STAR Stories for 3 YOE

Prepare **2 stories each** for these themes. Each story should be 2 minutes spoken, with a **quantified result**.

### Story Template

```
Situation (15 sec): "On the payments team, we had a checkout API failing silently for 2% of transactions."
Task (10 sec):      "I was asked to investigate because customer complaints were rising."
Action (60 sec):    "I added structured logging with correlation IDs, traced failed requests
                     in Datadog, found a race condition in our idempotency check when two
                     requests arrived within 50ms. I wrote a fix using Redis SET NX with TTL,
                     added an integration test reproducing the race, and deployed behind a feature flag."
Result (15 sec):    "Error rate dropped from 2% to 0.01%. Chargebacks decreased by $40K/month.
                     The pattern became our team's standard for payment endpoints."
```

### Questions to Prepare

1. Tell me about a challenging bug you fixed.
2. Tell me about a time you disagreed with a teammate.
3. Tell me about a project you're proud of.
4. Tell me about a time you missed a deadline.
5. Tell me about mentoring or helping a junior developer.
6. Tell me about a time you improved a process.
7. Why are you leaving your current role?
8. Where do you see yourself in 3 years?

---

## Resume & Portfolio Tips for 3 YOE

### Bullet Formula

```
[Action verb] + [what you built] + [technology] + [measurable impact]

Bad:  "Worked on REST APIs"
Good: "Designed and built REST APIs serving 50K daily active users,
       reducing average response time from 400ms to 85ms by adding
       Redis caching and PostgreSQL query optimization"
```

### Skills to Highlight

- **Languages:** JavaScript/TypeScript (primary for most roles)
- **Backend:** Node.js, Express/NestJS, REST API design, authentication
- **Database:** PostgreSQL, indexing, query optimization, transactions
- **Frontend:** React, state management, performance
- **DevOps basics:** Docker, CI/CD, AWS fundamentals (EC2, S3, RDS)
- **Practices:** Testing (Jest), Git, code reviews, Agile

---

## 8-Week Interview Preparation Plan

### Weeks 1–2: Foundations Review
- Re-read JavaScript, TypeScript, Node.js chapters
- Complete 3 problems/day on NeetCode Easy
- Write 4 STAR stories

### Weeks 3–4: Core Skills
- PostgreSQL + REST API chapters
- 2 Medium problems/day
- Build one mini project (rate limiter API or URL shortener)
- Practice explaining past projects out loud (record yourself)

### Weeks 5–6: System Design + React
- System design fundamentals chapter
- Practice 2 designs/week (whiteboard or paper)
- React deep dive chapter
- 2 Medium problems/day

### Weeks 7–8: Mock Interviews
- 3 full mock interviews (use Pramp, Interviewing.io, or friends)
- Review all Interview Q&A sections in this book
- Apply to 5–10 companies
- Refine STAR stories based on mock feedback

### Daily Routine (2 hours)
```
30 min — coding problem (1 Easy or Medium)
30 min — read/study one chapter section
30 min — interview Q&A out loud practice
30 min — system design or behavioral prep
```

---

## Interview Preparation

### Quick-Fire Round (30 Questions — Know These Cold)

**Q1: What happens when you type a URL in the browser?**
A: DNS lookup → TCP connection (3-way handshake) → TLS handshake (HTTPS) → HTTP request → server processes → response → browser parses HTML → requests CSS/JS/images → renders (HTML parsing → DOM, CSS → CSSOM → render tree → layout → paint). Mention CDN, caching headers, and service workers for follow-up depth.

**Q2: Difference between SQL and NoSQL?**
A: SQL (PostgreSQL): structured schema, ACID transactions, joins, vertical + horizontal scaling (with effort). NoSQL (MongoDB): flexible schema, eventual consistency options, horizontal scaling built-in. Choose SQL for: financial data, complex relationships, strong consistency. Choose NoSQL for: rapid prototyping, document-shaped data, extreme write scale with denormalization.

**Q3: What is JWT and how does authentication work?**
A: JWT is a signed token (header.payload.signature) sent by client in Authorization header. Server verifies signature with secret/public key — no DB lookup needed (stateless). Payload contains claims (userId, role, exp). Refresh tokens handle expiry securely. Vulnerabilities: store in httpOnly cookie (not localStorage), short expiry, validate alg header (prevent algorithm confusion attack).

**Q4: What is Docker and why use it?**
A: Containers package app + dependencies in isolated environment. Shares host kernel (lighter than VMs). Same image runs on dev, CI, production — "works on my machine" solved. Use multi-stage builds for smaller images. Don't run as root in production.

**Q5: CI/CD pipeline — what stages?**
A: Trigger (push/PR) → Lint → Unit tests → Build → Integration tests → Deploy to staging → Smoke tests → Deploy to production (manual approval or automated). Tools: GitHub Actions, GitLab CI. At 3 YOE: describe a pipeline you actually used.

**Q6: What is the CAP theorem?**
A: In a network partition, choose Consistency (all nodes see same data — reject writes) OR Availability (every request gets response — may be stale). Partition tolerance is mandatory in distributed systems. CP: banking. AP: social media feeds.

**Q7: HTTP/1.1 vs HTTP/2?**
A: HTTP/1.1: one request per TCP connection (head-of-line blocking), text headers. HTTP/2: multiplexing (many requests on one connection), binary framing, header compression (HPACK), server push. HTTP/3: QUIC over UDP, faster connection setup.

**Q8: What is CORS?**
A: Browser security — blocks JS from reading responses from different origin. Server must send `Access-Control-Allow-Origin` header. Preflight OPTIONS request for non-simple requests (custom headers, PUT/DELETE). Fix: configure server CORS, or use reverse proxy in dev.

**Q9: ACID in databases?**
A: Atomicity (all or nothing), Consistency (valid state before/after), Isolation (concurrent transactions don't interfere), Durability (committed data survives crash). PostgreSQL provides full ACID. MongoDB added multi-document ACID in v4.0.

**Q10: What is indexing?**
A: Data structure (usually B-tree) that speeds up reads at cost of write overhead and storage. Without index: sequential scan O(n). With index: O(log n) lookup. Index columns used in WHERE, JOIN, ORDER BY. Too many indexes slow writes.

**Q11: Monolith vs microservices?**
A: Monolith: single deployable unit, simpler debugging, good for small teams/startups. Microservices: independent deploy/scale, team autonomy, but adds network complexity, distributed tracing needs, eventual consistency. At 3 YOE: "I'd start monolith, extract services when team scale or performance isolation demands it."

**Q12: What is Redis used for?**
A: In-memory data store. Use cases: caching (TTL keys), session storage, rate limiting (INCR + EXPIRE), pub/sub, leaderboards (sorted sets), distributed locks (SET NX). Not a primary database — data can be lost (persistence optional).

**Q13: Git merge vs rebase?**
A: Merge: creates merge commit, preserves history, safe for shared branches. Rebase: replays commits on top of target, linear history, never rebase public/shared branches. Feature branch → rebase onto main before PR for clean history.

**Q14: What is unit test vs integration test?**
A: Unit: test one function/module in isolation (mock dependencies). Fast, many. Integration: test components together (API + DB). Slower, fewer. E2E: full user flow in browser. Pyramid: many unit, some integration, few E2E.

**Q15: Explain OAuth 2.0 flow.**
A: User clicks "Login with Google" → redirect to Google → user approves → Google redirects back with authorization code → your server exchanges code for access token (using client secret) → use token to fetch user info. Never expose client secret in frontend. Use PKCE for mobile/SPA.

**Q16: What is WebSocket?**
A: Persistent bidirectional TCP connection after HTTP upgrade handshake. Use for: chat, live notifications, collaborative editing. Unlike polling: no repeated HTTP overhead. Fallback: Server-Sent Events (server → client only).

**Q17: How do you handle errors in Express?**
A: Centralized error middleware `(err, req, res, next) => {}` as last middleware. Operational errors (expected: 404, validation) vs programmer errors (bugs). Never expose stack traces in production. Log with request ID, return consistent JSON error format.

**Q18: What is load balancing?**
A: Distribute traffic across multiple servers. Algorithms: round robin, least connections, IP hash. Layer 4 (TCP) vs Layer 7 (HTTP — can route by URL). Health checks remove unhealthy instances. Tools: Nginx, AWS ALB, HAProxy.

**Q19: What is CDN?**
A: Geographically distributed cache servers. Static assets served from edge closest to user. Reduces latency and origin server load. Cache invalidation on deploy (versioned filenames: `app.a1b2c3.js`). CloudFront, Cloudflare.

**Q20: Difference between authentication and authorization?**
A: Authentication: verify identity (who are you?) — login, JWT, OAuth. Authorization: verify permissions (what can you do?) — RBAC, ACLs, middleware checking roles. AuthN first, then AuthZ on every protected action.

**Q21–Q30:** Review corresponding chapters for Docker, Kubernetes basics, message queues (SQS/RabbitMQ), caching strategies, database replication, graceful shutdown, health checks, 12-factor app principles, SOLID principles, and design patterns (Singleton, Factory, Observer, Middleware).

---

## Self Assessment

Before applying, honestly check:

- [ ] I can solve NeetCode Easy in under 20 minutes
- [ ] I can solve 50%+ of NeetCode Medium with hints
- [ ] I can explain closures, event loop, and `this` for 3+ minutes each
- [ ] I can design a URL shortener or rate limiter in 45 minutes
- [ ] I have 8+ STAR stories with quantified results
- [ ] I can walk through a slow query optimization with EXPLAIN ANALYZE
- [ ] I can explain my last project's architecture in 5 minutes
- [ ] I've done at least 2 mock interviews

---

## Cheat Sheet

```
3 YOE interview formula:
  Coding:     NeetCode 150 (focus Medium) + talk through approach
  System:     URL shortener, rate limiter, notification system
  Backend:    Node event loop, REST design, auth, error handling
  Database:   Indexes, MVCC, query optimization, transactions
  Frontend:   React hooks, re-renders, state management
  Behavioral: STAR + numbers + what YOU did

Answer structure:
  Direct answer → How it works → Production example → Trade-off

Daily practice (2 hrs):
  30m coding + 30m study + 30m Q&A aloud + 30m design/behavioral

Key resources:
  neetcode.io, levels.fyi, "System Design Interview" (Alex Xu)
```
