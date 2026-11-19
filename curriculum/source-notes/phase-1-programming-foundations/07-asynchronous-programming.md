# Phase 1 — Chapter 7: Asynchronous Programming

> *"Callback hell is the punishment for not understanding asynchronous programming."*

---

## Chapter Overview

### Why Asynchronous Programming Exists

Real applications don't just compute — they wait. They wait for:
- A database query to return results
- An HTTP API to respond
- A file to be read from disk
- A user to click a button
- A timer to expire

If JavaScript blocked on each of these, your server would freeze for every single user. A Node.js server handling 10,000 concurrent connections cannot afford to stop and wait for each database query to complete. **Asynchronous programming** is the mechanism that lets a single-threaded JavaScript environment do many things "at once."

### The Core Problem

JavaScript runs on a single thread — one call stack, one thing at a time. But I/O operations (network, disk, timers) are not CPU-bound — they're *waiting* operations. The insight: while JavaScript waits for I/O, it can do other work. The operating system handles the I/O; JavaScript merely needs to be notified when it's done.

This is accomplished by:
1. Starting the I/O operation (non-blocking)
2. Registering a callback/Promise
3. Going on to handle other code
4. When I/O completes, the OS notifies Node.js/browser
5. The callback/Promise resolution is queued
6. The event loop picks it up when the call stack is clear

### Problems It Solves

- **Concurrency without threads**: Handle thousands of simultaneous connections on one thread
- **Responsive UIs**: Browser UIs stay interactive while network requests are in flight
- **Resource efficiency**: Idle time (waiting for I/O) is used productively
- **Scalability**: Node.js servers can handle 100x more concurrent connections than thread-per-connection servers (Apache, PHP-FPM)

### Industry Adoption

Async programming is fundamental to:
- **Node.js**: The entire ecosystem is built on async (Express, Fastify, NestJS)
- **Browser JavaScript**: All DOM events, fetch calls, setTimeout are async
- **React**: useEffect, data fetching, event handlers
- **React Query, SWR**: Async data management libraries
- **Databases**: pg, mongoose, Prisma — all return Promises

---

## Beginner Theory

### The Event Loop — Detailed

```
┌─────────────────────────────────────────────────────────┐
│                     Node.js Process                     │
│                                                         │
│  JavaScript Engine (V8)                                 │
│  ┌──────────┐   ┌──────────────────────────────────┐   │
│  │   Call   │   │              Heap                │   │
│  │  Stack   │   │  (Objects, Closures, Buffers)    │   │
│  │          │   └──────────────────────────────────┘   │
│  │  [fn c]  │                                           │
│  │  [fn b]  │                                           │
│  │  [fn a]  │                                           │
│  └──────────┘                                           │
│       ↑ picks up tasks when empty                       │
│       │                                                 │
│  Event Loop                                             │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Phase 1: Timers  (setTimeout, setInterval)      │   │
│  │ Phase 2: I/O callbacks                          │   │
│  │ Phase 3: Idle, Prepare (internal)               │   │
│  │ Phase 4: Poll (wait for new I/O events)         │   │
│  │ Phase 5: Check (setImmediate)                   │   │
│  │ Phase 6: Close callbacks                        │   │
│  └─────────────────────────────────────────────────┘   │
│       ↑ between each phase: drain microtask queue       │
│                                                         │
│  Microtask Queue (highest priority)                     │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Promise.then callbacks, queueMicrotask()        │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  libuv (C++ library)                                    │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Thread pool (4 threads by default)               │   │
│  │ - File system operations                        │   │
│  │ - DNS resolution                                │   │
│  │ - Crypto operations                             │   │
│  │ - User-added heavy computation                  │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### Execution Order — The Rules

```javascript
// Memorize this order:
// 1. Synchronous code
// 2. Microtasks (all of them): Promise.then, queueMicrotask
// 3. Macrotask (one): setTimeout, setInterval, I/O

console.log("1"); // sync

setTimeout(() => console.log("6"), 0); // macrotask (setTimeout queue)
setImmediate(() => console.log("7")); // macrotask (check phase)

Promise.resolve()
  .then(() => console.log("3"))  // microtask
  .then(() => console.log("4")); // microtask (queued after "3" runs)

queueMicrotask(() => console.log("5")); // microtask

console.log("2"); // sync

// Output (in Node.js): 1, 2, 3, 4, 5, 6, 7
// Note: setImmediate vs setTimeout(0) order can vary when not nested
```

---

## Basic Examples

### Callbacks (Legacy Pattern)

```javascript
const fs = require("fs");

// Callback pattern: error-first (Node.js convention)
function readFile(path, callback) {
  fs.readFile(path, "utf8", (err, data) => {
    if (err) {
      callback(err, null);
      return;
    }
    callback(null, data);
  });
}

readFile("./data.json", (err, data) => {
  if (err) {
    console.error("Error reading file:", err.message);
    return;
  }
  console.log("File content:", data);
});

// Callback Hell — the classic problem
getUser(userId, (err, user) => {
  if (err) return handleError(err);
  getOrders(user.id, (err, orders) => {
    if (err) return handleError(err);
    getPaymentInfo(orders[0].id, (err, payment) => {
      if (err) return handleError(err);
      // Finally do something...
      // This nesting = "Pyramid of Doom"
    });
  });
});
```

### Promises

```javascript
// Promisify a callback-based function
const { promisify } = require("util");
const readFileAsync = promisify(require("fs").readFile);

// Promise chain — flat and readable
function getUserWithOrders(userId) {
  return getUser(userId)
    .then(user => getOrders(user.id).then(orders => ({ user, orders })))
    .then(({ user, orders }) => getPaymentInfo(orders[0].id)
      .then(payment => ({ user, orders, payment })))
    .catch(err => {
      console.error("Error:", err.message);
      throw err; // re-throw to propagate
    });
}

// Creating Promises
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function fetchWithRetry(url, maxRetries = 3) {
  return new Promise(async (resolve, reject) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return resolve(await response.json());
      } catch (err) {
        if (attempt === maxRetries) return reject(err);
        console.log(`Attempt ${attempt} failed, retrying in ${attempt}s...`);
        await delay(attempt * 1000); // exponential backoff
      }
    }
  });
}
```

### Async/Await — The Modern Standard

```javascript
// Async/await is syntactic sugar over Promises
// It makes async code read like synchronous code

async function getUserDashboard(userId) {
  try {
    // Sequential — each awaits the previous
    const user = await userService.findById(userId);
    if (!user) throw new NotFoundError("User", userId);

    const orders = await orderService.getByUser(userId);
    const notifications = await notificationService.getUnread(userId);

    return { user, orders, notifications };
  } catch (err) {
    logger.error("Failed to load dashboard", { userId, err: err.message });
    throw err;
  }
}

// Parallel — don't await sequentially when you don't need to!
async function getUserDashboardFast(userId) {
  const user = await userService.findById(userId);
  if (!user) throw new NotFoundError("User", userId);

  // These don't depend on each other — run in parallel!
  const [orders, notifications, preferences] = await Promise.all([
    orderService.getByUser(userId),
    notificationService.getUnread(userId),
    preferenceService.getByUser(userId)
  ]);

  return { user, orders, notifications, preferences };
  // Total time = slowest of the three (not sum of all three!)
}

// Top-level await (Node.js 14.8+ / ES2022)
// Only in ES modules (.mjs or "type": "module" in package.json)
const config = await loadConfig();
const server = await startServer(config);
```

### Error Handling in Async Code

```javascript
// Pattern 1: try/catch in async function (recommended)
async function processOrder(orderId) {
  try {
    const order = await orderService.findById(orderId);
    const payment = await paymentService.charge(order);
    await orderService.markPaid(order.id);
    return { success: true, payment };
  } catch (err) {
    // Handle all errors from any await in this block
    if (err instanceof PaymentError) {
      await orderService.markFailed(orderId, err.message);
      throw err; // re-throw for caller to handle
    }
    logger.error("Unexpected error processing order", { orderId, err });
    throw new InternalError("Order processing failed");
  } finally {
    // Always executes — good for cleanup
    logger.info("Order processing completed", { orderId });
  }
}

// Pattern 2: Safe wrapper (avoids try/catch repetition)
async function safe(promise) {
  try {
    const result = await promise;
    return [null, result];
  } catch (err) {
    return [err, null];
  }
}

// Usage
const [err, user] = await safe(userService.findById(id));
if (err) return res.status(404).json({ error: err.message });
res.json(user);

// Pattern 3: Promise .catch() for non-critical errors
async function enrichUser(user) {
  const preferences = await preferenceService.get(user.id)
    .catch(() => defaultPreferences); // fallback if preferences fail

  return { ...user, preferences };
}

// Pattern 4: Promise.allSettled for parallel fallible operations
async function loadDashboardWidgets(userId) {
  const results = await Promise.allSettled([
    statsService.get(userId),
    feedService.get(userId),
    adsService.get(userId)   // non-critical — OK if it fails
  ]);

  return {
    stats:  results[0].status === "fulfilled" ? results[0].value : null,
    feed:   results[1].status === "fulfilled" ? results[1].value : null,
    ads:    results[2].status === "fulfilled" ? results[2].value : null
  };
}
```

---

## Intermediate Concepts

### Async Iteration

```javascript
// for await...of — iterate over async sources
async function processStream() {
  const response = await fetch("https://api.example.com/large-dataset");
  const reader   = response.body.getReader();

  // AsyncIterator
  async function* readChunks() {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      yield value;
    }
  }

  for await (const chunk of readChunks()) {
    await processChunk(chunk);
  }
}

// Async generators — produce values asynchronously
async function* paginatedFetch(baseUrl, pageSize = 100) {
  let page = 1;
  while (true) {
    const response = await fetch(`${baseUrl}?page=${page}&size=${pageSize}`);
    const data     = await response.json();

    if (!data.items.length) break;

    for (const item of data.items) {
      yield item; // yield each item individually
    }

    if (!data.hasNextPage) break;
    page++;
  }
}

// Process all items without loading everything into memory
for await (const user of paginatedFetch("/api/users")) {
  await processUser(user);
}
```

### Concurrency Control

```javascript
// Problem: 10,000 tasks but don't want to run all at once
// (overwhelms database, rate limits, OOM)

// Solution 1: Run in batches
async function processBatch(items, batchSize, processor) {
  const results = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch        = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(processor));
    results.push(...batchResults);
    console.log(`Processed ${Math.min(i + batchSize, items.length)}/${items.length}`);
  }
  return results;
}

// Solution 2: Semaphore — limit concurrent operations
class Semaphore {
  constructor(maxConcurrent) {
    this.maxConcurrent = maxConcurrent;
    this.current       = 0;
    this.queue         = [];
  }

  async acquire() {
    if (this.current < this.maxConcurrent) {
      this.current++;
      return;
    }
    // Wait for a slot to open
    await new Promise(resolve => this.queue.push(resolve));
  }

  release() {
    this.current--;
    if (this.queue.length > 0) {
      this.current++;
      this.queue.shift()(); // resolve the next waiter
    }
  }

  async run(fn) {
    await this.acquire();
    try {
      return await fn();
    } finally {
      this.release();
    }
  }
}

// Limit to 5 concurrent API calls
const sem = new Semaphore(5);
const results = await Promise.all(
  thousandItems.map(item => sem.run(() => fetchItem(item.id)))
);

// Solution 3: Queue with concurrency control (use p-limit in production)
// npm install p-limit
const pLimit = require("p-limit");
const limit  = pLimit(5); // max 5 concurrent

const results = await Promise.all(
  thousandItems.map(item => limit(() => fetchItem(item.id)))
);
```

### Timeouts and Cancellation

```javascript
// AbortController — cancel fetch and other async operations
async function fetchWithTimeout(url, timeoutMs) {
  const controller = new AbortController();
  const timeoutId  = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });
    return await response.json();
  } catch (err) {
    if (err.name === "AbortError") {
      throw new Error(`Request to ${url} timed out after ${timeoutMs}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

// Timeout helper using Promise.race
function withTimeout(promise, ms, message = `Timed out after ${ms}ms`) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
}

// Cancellable operations
function makeCancellable(promise) {
  let isCancelled = false;

  const wrappedPromise = new Promise((resolve, reject) => {
    promise.then(
      value => isCancelled ? reject({ isCancelled: true }) : resolve(value),
      error => isCancelled ? reject({ isCancelled: true }) : reject(error)
    );
  });

  return {
    promise: wrappedPromise,
    cancel:  () => { isCancelled = true; }
  };
}
```

### Worker Threads (CPU-Heavy Work)

```javascript
// Worker threads run CPU-intensive code off the main thread
const { Worker, isMainThread, parentPort, workerData } = require("worker_threads");

// worker.js
if (!isMainThread) {
  const { data, chunkStart, chunkEnd } = workerData;
  let sum = 0;
  for (let i = chunkStart; i < chunkEnd; i++) {
    sum += data[i] ** 2;
  }
  parentPort.postMessage(sum);
}

// main.js
async function computeParallel(data) {
  const cpuCount = require("os").cpus().length;
  const chunkSize = Math.ceil(data.length / cpuCount);

  const workers = Array.from({ length: cpuCount }, (_, i) => {
    const chunkStart = i * chunkSize;
    const chunkEnd   = Math.min(chunkStart + chunkSize, data.length);

    return new Promise((resolve, reject) => {
      const worker = new Worker(__filename, {
        workerData: { data: data.buffer, chunkStart, chunkEnd },
        transferList: [data.buffer] // zero-copy transfer!
      });
      worker.on("message", resolve);
      worker.on("error",   reject);
    });
  });

  const partialSums = await Promise.all(workers);
  return partialSums.reduce((a, b) => a + b, 0);
}
```

---

## Advanced Concepts

### Custom Promise Implementation

```javascript
// Implementing Promise from scratch (educational — use native in production)
class MyPromise {
  #state    = "pending";
  #value    = undefined;
  #handlers = [];

  constructor(executor) {
    const resolve = value => {
      if (this.#state !== "pending") return;
      this.#state = "fulfilled";
      this.#value = value;
      this.#handlers.forEach(h => this.#runHandler(h));
    };

    const reject = reason => {
      if (this.#state !== "pending") return;
      this.#state = "rejected";
      this.#value = reason;
      this.#handlers.forEach(h => this.#runHandler(h));
    };

    try {
      executor(resolve, reject);
    } catch (err) {
      reject(err);
    }
  }

  #runHandler({ onFulfilled, onRejected, resolve, reject }) {
    queueMicrotask(() => {
      try {
        if (this.#state === "fulfilled") {
          resolve(onFulfilled ? onFulfilled(this.#value) : this.#value);
        } else {
          if (onRejected) resolve(onRejected(this.#value));
          else reject(this.#value);
        }
      } catch (err) {
        reject(err);
      }
    });
  }

  then(onFulfilled, onRejected) {
    return new MyPromise((resolve, reject) => {
      const handler = { onFulfilled, onRejected, resolve, reject };
      if (this.#state === "pending") {
        this.#handlers.push(handler);
      } else {
        this.#runHandler(handler);
      }
    });
  }

  catch(onRejected) { return this.then(null, onRejected); }
  finally(fn) {
    return this.then(
      value  => MyPromise.resolve(fn()).then(() => value),
      reason => MyPromise.resolve(fn()).then(() => { throw reason; })
    );
  }

  static resolve(value) { return new MyPromise(r => r(value)); }
  static reject(reason) { return new MyPromise((_, r) => r(reason)); }

  static all(promises) {
    return new MyPromise((resolve, reject) => {
      const results = [];
      let completed  = 0;
      promises.forEach((p, i) => {
        MyPromise.resolve(p).then(value => {
          results[i] = value;
          if (++completed === promises.length) resolve(results);
        }, reject);
      });
    });
  }
}
```

### Streams (Node.js)

```javascript
const { Transform, pipeline } = require("stream");
const { promisify }           = require("util");

const pipe = promisify(pipeline);

// Transform stream: a duplex stream that transforms data
class JSONParser extends Transform {
  constructor() {
    super({ objectMode: true }); // emit objects, not buffers
    this._buffer = "";
  }

  _transform(chunk, encoding, callback) {
    this._buffer += chunk.toString();
    const lines = this._buffer.split("\n");
    this._buffer = lines.pop(); // save incomplete line

    for (const line of lines) {
      if (line.trim()) {
        try {
          this.push(JSON.parse(line)); // push parsed object
        } catch (err) {
          this.emit("error", new Error(`Invalid JSON: ${line}`));
          return;
        }
      }
    }
    callback();
  }

  _flush(callback) {
    if (this._buffer.trim()) {
      try {
        this.push(JSON.parse(this._buffer));
      } catch {}
    }
    callback();
  }
}

// Process a 10GB JSONL file without loading it all into memory
await pipe(
  fs.createReadStream("large-file.jsonl"),
  new JSONParser(),
  new Transform({
    objectMode: true,
    transform(record, _, cb) {
      if (record.active) this.push(record); // filter
      cb();
    }
  }),
  new Transform({
    objectMode: true,
    transform(record, _, cb) {
      this.push(JSON.stringify(pick(record, ["id", "name", "email"])) + "\n");
      cb();
    }
  }),
  fs.createWriteStream("output.jsonl")
);
```

---

## Industry Usage

**Node.js servers**: Every request is handled asynchronously. A Node.js server reading from a database doesn't block — it starts the query, handles other requests, and comes back when the query completes.

**Real-time applications**: WebSocket servers, live dashboards, chat applications — all use async event handling.

**Streaming**: Netflix, YouTube — video is streamed in chunks (async streams) rather than downloaded completely first.

**Cloud Functions (Lambda, etc.)**: Event-driven, short-lived async functions that respond to triggers (HTTP request, S3 upload, SQS message).

### The four resilience patterns every production async call needs

An `await fetch(url)` with no other protection is fine in a tutorial and negligent in production. Every call that crosses a process boundary needs all four of these, and being able to implement them from memory is a genuine seniority marker.

**1. Timeout — because the default is "wait forever."**

```javascript
async function withTimeout(promise, ms, label = "operation") {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await promise(controller.signal);
  } catch (err) {
    if (err.name === "AbortError") throw new Error(`${label} timed out after ${ms}ms`);
    throw err;
  } finally {
    clearTimeout(timer);      // always clear — a dangling timer keeps the process alive
  }
}

const data = await withTimeout(
  signal => fetch("https://api.example.com/items", { signal }).then(r => r.json()),
  3000,
  "items fetch"
);
```

Note the `finally`. A forgotten `clearTimeout` keeps an active handle in the event loop, which is why some Node processes refuse to exit cleanly.

**2. Retry with exponential backoff *and jitter*.**

```javascript
async function retry(fn, { attempts = 4, baseMs = 200, maxMs = 5000, isRetryable } = {}) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      // Never retry a client error — the request is wrong and will stay wrong.
      if (isRetryable && !isRetryable(err)) throw err;
      if (i === attempts - 1) break;

      const backoff = Math.min(baseMs * 2 ** i, maxMs);
      const jitter  = Math.random() * backoff;        // spread the herd
      await new Promise(r => setTimeout(r, backoff / 2 + jitter / 2));
    }
  }
  throw lastErr;
}

// Retry 5xx and network errors; never retry 4xx.
const isRetryable = err => !err.status || err.status >= 500 || err.status === 429;
```

**Jitter is the part everyone omits and it is the part that matters.** Without it, a thousand clients that failed at the same moment retry at the same moment, and your recovering service is knocked over again by its own clients. This is the *thundering herd*, and pure exponential backoff does not prevent it — it synchronises it.

**3. Circuit breaker — stop calling a service that is clearly down.**

```javascript
class CircuitBreaker {
  #failures = 0;
  #state = "closed";          // closed → open → half-open → closed
  #openedAt = 0;

  constructor({ threshold = 5, cooldownMs = 30_000 } = {}) {
    this.threshold = threshold;
    this.cooldownMs = cooldownMs;
  }

  async call(fn) {
    if (this.#state === "open") {
      if (Date.now() - this.#openedAt < this.cooldownMs) {
        throw new Error("Circuit open — failing fast");   // no network call at all
      }
      this.#state = "half-open";   // allow exactly one probe through
    }
    try {
      const result = await fn();
      this.#failures = 0;
      this.#state = "closed";
      return result;
    } catch (err) {
      if (++this.#failures >= this.threshold) {
        this.#state = "open";
        this.#openedAt = Date.now();
      }
      throw err;
    }
  }
}
```

Without a breaker, a dead dependency causes every request to wait for its full timeout, exhausting your own connection pool and turning *their* outage into *your* outage. This is cascading failure, and the breaker is the standard defence.

**4. Bounded concurrency — never fan out unbounded.**

```javascript
async function mapWithConcurrency(items, limit, fn) {
  const results = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const i = cursor++;
      results[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}

// 10_000 items, 8 at a time — not 10_000 simultaneous sockets.
await mapWithConcurrency(userIds, 8, id => api.fetchUser(id));
```

`await Promise.all(items.map(fetchOne))` on ten thousand items opens ten thousand concurrent operations. It will exhaust file descriptors, trigger the remote API's rate limiter, and very likely take *longer* than a bounded version because of contention. Interviewers ask about this specifically because it is the most common async mistake made by competent engineers.

---

## Security

**Race conditions in async code**:
```javascript
// VULNERABLE: check-then-act race condition
async function withdraw(accountId, amount) {
  const account = await getAccount(accountId);
  if (account.balance < amount) throw new Error("Insufficient funds");
  // Between the check above and the update below, another request could also pass the check!
  await updateBalance(accountId, -amount); // race condition!
}

// SAFE: atomic operation with database transaction
async function withdrawSafe(accountId, amount) {
  await db.transaction(async (trx) => {
    const account = await trx.query(
      "SELECT balance FROM accounts WHERE id = $1 FOR UPDATE", // row lock!
      [accountId]
    );
    if (account.balance < amount) throw new Error("Insufficient funds");
    await trx.query("UPDATE accounts SET balance = balance - $1 WHERE id = $2", [amount, accountId]);
  });
}
```

**Unhandled rejections**:
```javascript
// Always handle Promise rejections
process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Promise rejection", { reason });
  // In production: alert monitoring, graceful shutdown
});

// Or enable --unhandled-rejections=throw in Node.js 15+
```

---

## Performance

**Don't await sequentially when you can parallelize:**
```javascript
// SLOW — sequential: total time = sum of all
const user   = await getUser(id);        // 100ms
const orders = await getOrders(id);      // 200ms
const prefs  = await getPrefs(id);       // 150ms
// Total: 450ms

// FAST — parallel: total time = slowest
const [user, orders, prefs] = await Promise.all([
  getUser(id),     // 100ms  \
  getOrders(id),   // 200ms   > run simultaneously
  getPrefs(id)     // 150ms  /
]);
// Total: 200ms
```

**Avoid creating too many concurrent Promises (memory pressure):**
```javascript
// 100,000 concurrent fetch calls = likely OOM crash
await Promise.all(thousandItems.map(item => fetch(item.url))); // DON'T DO THIS

// Use p-limit or batch processing to control concurrency
```

---

## Debugging

**Common async bugs and fixes:**

**1. Forgetting await:**
```javascript
async function getUser(id) {
  const user = userService.findById(id); // BUG: missing await
  return user.name; // TypeError: user is a Promise, not a User
}
```

**2. Swallowed errors:**
```javascript
// Bug: error is swallowed
async function process() {
  await doSomething().catch(err => {}); // empty catch!
}

// Fix: always log or rethrow
async function process() {
  await doSomething().catch(err => {
    logger.error("doSomething failed", err);
    throw err; // rethrow if caller needs to know
  });
}
```

**3. Using Promise constructor unnecessarily:**
```javascript
// BAD: "Promise constructor anti-pattern"
const result = new Promise(async (resolve, reject) => {
  try {
    const data = await fetchData();
    resolve(data);
  } catch (err) {
    reject(err); // errors from other awaits are swallowed here!
  }
});

// GOOD: just use async function
async function getResult() {
  return await fetchData(); // errors propagate naturally
}
```

---

## Interview Preparation

**Q1: What is the event loop? How does Node.js handle multiple concurrent connections with a single thread?**

A: The event loop is a loop that continuously checks if the call stack is empty, and if so, takes the next callback from the queue. Node.js delegates I/O operations (network, disk) to libuv, a C++ library that uses the OS's async I/O APIs (epoll on Linux, kqueue on macOS, IOCP on Windows). While one request waits for a database query, Node.js handles other requests. When the query completes, the OS notifies libuv, which queues the callback, which the event loop picks up and executes.

**Q2: What is the difference between `setTimeout(fn, 0)` and `Promise.resolve().then(fn)`?**

A: `setTimeout(fn, 0)` schedules a macrotask — it runs after the current call stack and ALL pending microtasks. `Promise.resolve().then(fn)` schedules a microtask — it runs before the next macrotask. Microtasks have higher priority.

**Q3: What is Promise.all vs Promise.allSettled vs Promise.race vs Promise.any?**

- `Promise.all`: Resolves when ALL resolve; rejects when ANY rejects. Returns array of results.
- `Promise.allSettled`: Resolves when ALL settle (fulfill or reject). Returns array of `{status, value/reason}`. Never rejects.
- `Promise.race`: Settles when FIRST settles (fulfill or reject). Returns first result.
- `Promise.any`: Resolves when FIRST resolves. Rejects only when ALL reject. Returns first fulfilled value.

**Q4: What is the "Promise constructor anti-pattern"?**

A: Wrapping an async function in a `new Promise()` constructor unnecessarily. This is dangerous because unhandled errors inside `async` callbacks passed to the Promise constructor can silently swallow exceptions. Always prefer direct async functions.

**Q5: These two loops look equivalent. Why does one take 10 seconds and the other 1?**

```javascript
// A — sequential: each await blocks the next iteration
for (const id of ids) {                    // 10 ids × 1s = 10s
  results.push(await fetchUser(id));
}

// B — concurrent: all requests start immediately
const results = await Promise.all(ids.map(id => fetchUser(id)));   // ≈ 1s
```

A: In A, `await` suspends the loop body until the promise settles, so the requests are strictly serial. In B, `.map()` synchronously *starts* every promise before `Promise.all` awaits any of them, so all ten are in flight at once and total time is roughly the slowest one.

The senior addition — and the reason this is a good interview question — is that **B is not automatically correct.** With ten items it is right. With ten thousand it is a denial-of-service against your own downstream, and it will likely be slower than a bounded version because of socket contention and rate limiting. The correct production answer is bounded concurrency: run eight or sixteen at a time. Volunteering that distinction unprompted is what separates a good answer from a complete one.

**Q6: What is the difference between `Promise.all` and `Promise.allSettled` in terms of failure handling, and which should a batch job use?**

A: `Promise.all` rejects as soon as *any* promise rejects, and the results of the successful ones are discarded — you get one error and no data. `Promise.allSettled` always resolves, returning an array of `{status, value}` or `{status, reason}` for every input.

For a batch job, `allSettled` is almost always correct: processing 500 records should not lose 499 successes because one record was malformed. Use `all` only when the operations are genuinely atomic in meaning — where partial success is not a valid state.

One subtlety worth mentioning: `Promise.all` rejecting does **not** cancel the other promises. They continue running, and if one of them later rejects with nothing attached to catch it, you get an unhandled rejection. Promises are not cancellable; only the *work behind them* is, via `AbortController`.

**Q7: Explain `async`/`await` in terms of promises. What is `await` actually doing?**

A: An `async` function always returns a promise. `await` unwraps a promise: it suspends the function, registers a continuation as a microtask on that promise, and returns control to the caller. When the promise settles, the continuation resumes the function body with the resolved value — or throws the rejection reason at the `await` expression, which is why `try/catch` works.

Three consequences that interviews probe:

- **`await` yields to the event loop.** Between two awaits, other code runs. Your function is not atomic, so state read before an await may be stale after it.
- **`await` on a non-promise still yields.** `await 5` resolves immediately but still defers the continuation by one microtask tick.
- **`return await x` inside `try` differs from `return x`.** With plain `return x`, the function returns before the promise settles, so a rejection escapes the local `try/catch`. Inside a `try`, you need `return await`.

**Q8: How do you cancel an in-flight async operation in JavaScript?**

A: You cannot cancel a promise — a promise is a notification of a result, not a handle on the work. What you cancel is the underlying operation, and the standard mechanism is `AbortController`.

```javascript
const controller = new AbortController();
const promise = fetch(url, { signal: controller.signal });
controller.abort();                         // fetch rejects with AbortError
```

The signal is cooperative: it works because `fetch` (and Node's `fs`, `http`, and timers) explicitly listen for it. Your own long-running async functions must check `signal.aborted` themselves, or subscribe to `signal.addEventListener("abort", ...)`, or they will keep going regardless.

The practical use is request cancellation — a user navigates away, or types a new search term, and the in-flight request should stop rather than resolving into a stale UI update. On the server, the same mechanism enforces timeouts and propagates client disconnects down through the call chain so you stop doing work nobody is waiting for.

**Q5: What is backpressure in streams?**

A: Backpressure occurs when a writable stream is slower than the readable stream producing data. Without handling it, unbounded memory growth occurs. Node.js streams handle this automatically when using `pipe()` — when the writable stream's buffer fills, `write()` returns false, signaling the readable to pause. When the buffer drains, a `drain` event is emitted, and reading resumes.

---

## Practical Tasks

### Beginner (10 Tasks)
1. Promisify the Node.js fs.readFile callback API manually.
2. Implement a `delay(ms)` function that returns a Promise.
3. Write a function that retries a failing Promise N times with exponential backoff.
4. Use async/await to fetch data from a public API and display it.
5. Implement a rate-limited fetch queue that makes at most 5 requests per second.
6. Build a `timeout(promise, ms)` wrapper that rejects if the promise takes too long.
7. Implement parallel vs sequential fetching and measure the time difference.
8. Process a large array using `for await...of` with an async generator.
9. Implement `Promise.all` from scratch.
10. Write a function that reads multiple files in parallel and returns their contents.

### Intermediate (10 Tasks)
1. Implement a `Semaphore` class that limits concurrent async operations.
2. Build an async queue (FIFO) that processes items one at a time with concurrency control.
3. Implement a cancellable fetch using AbortController.
4. Build an async event emitter with `emit` and `on`/`off`.
5. Implement `Promise.race` from scratch.
6. Create a circuit breaker that wraps async functions.
7. Build a connection pool for database connections.
8. Implement an async pipeline using Transform streams.
9. Create a scheduler that runs tasks at specific intervals without drift.
10. Implement a backoff strategy (exponential, linear, jitter) for retrying operations.

### Advanced (10 Tasks)
1. Implement the Promises/A+ specification from scratch.
2. Build a distributed task queue with retry, dead-letter queue, and priority.
3. Implement a streaming JSON parser that handles arbitrarily large files.
4. Create a worker thread pool that distributes CPU-bound tasks.
5. Build a cache with async population and stampede protection (only one fetcher runs at a time).
6. Implement a fully featured Observable class with operators (map, filter, merge, switchMap).
7. Build an async state machine with guards, actions, and side effects.
8. Implement Node.js cluster mode with IPC for sharing state.
9. Create a high-throughput event bus using shared memory between worker threads.
10. Build a real-time data pipeline: read from Kafka → transform → write to database.

---

## Mini Project

**Async Web Scraper**: Build a web scraper with:
- Concurrency-limited fetching (max 5 concurrent)
- Exponential backoff retry
- Rate limiting (max 2 req/sec per domain)
- Progress tracking
- Output to JSONL file (streaming)

---

## Production Project

**Job Queue System**: Build a production job queue:
- Add jobs with priority and delay
- Process jobs with configurable concurrency
- Retry failed jobs with backoff
- Track job status (pending/running/completed/failed)
- Dashboard showing queue depth, throughput, error rate
- Persistent storage (Redis or PostgreSQL)

---

## Capstone Project

**Real-Time Data Pipeline**: Build a stream processing system:
- Ingest events from a WebSocket source
- Apply windowed aggregations (last 1 minute, 5 minutes)
- Detect anomalies using simple statistical methods
- Emit alerts via WebSocket to connected dashboards
- Handle backpressure gracefully
- Process 10,000+ events/second

---

## Self Assessment
1. What is the event loop? How does JavaScript handle multiple async operations with one thread?
2. What is the execution order of synchronous code, microtasks, and macrotasks?
3. What is callback hell and how do Promises solve it?
4. What is the difference between async/await and Promises?
5. What is the difference between `Promise.all`, `Promise.allSettled`, `Promise.race`, `Promise.any`?
6. What happens if you forget `await` before a Promise?
7. How do you handle errors in async/await code?
8. What is the Promise constructor anti-pattern?
9. When should you run async operations in parallel vs sequentially?
10. What is backpressure in Node.js streams?
11. What is a semaphore in the context of async programming?
12. How does AbortController work for cancelling fetch requests?
13. What is `setImmediate` and how does it differ from `setTimeout(fn, 0)`?
14. What are microtasks? Name two sources of microtasks in JavaScript.
15. What is a Worker Thread and when would you use one?

---

## Cheat Sheet

### Async Patterns
```javascript
// Sequential (one at a time)
const a = await fa();
const b = await fb(a);

// Parallel (all at once)
const [a, b, c] = await Promise.all([fa(), fb(), fc()]);

// Fail-safe parallel
const results = await Promise.allSettled([fa(), fb(), fc()]);

// First wins
const first = await Promise.race([fa(), timeout(5000)]);

// First success
const first = await Promise.any([fa(), fb(), fc()]);
```

### Event Loop Order
```
1. Synchronous code
2. Microtasks (Promise.then, queueMicrotask) — ALL
3. One macrotask (setTimeout/setInterval/I/O)
4. Repeat from 2
```

### Error Handling
```javascript
// async/await
try { await fn(); } catch (err) { ... } finally { ... }

// Promise chain
fn().then(res => ...).catch(err => ...).finally(() => ...);

// Parallel with individual error handling
const results = await Promise.allSettled([p1, p2]);
results.forEach(r => r.status === "fulfilled" ? use(r.value) : handle(r.reason));

// Global unhandled rejection
process.on("unhandledRejection", (reason) => { logger.error(reason); });
```

### Concurrency Control
```javascript
// Batch processing
for (let i = 0; i < items.length; i += BATCH_SIZE) {
  await Promise.all(items.slice(i, i+BATCH_SIZE).map(processItem));
}

// p-limit
const limit = pLimit(5);
await Promise.all(items.map(item => limit(() => processItem(item))));
```
