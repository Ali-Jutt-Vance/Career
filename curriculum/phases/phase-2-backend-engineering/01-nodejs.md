# Phase 2 — Chapter 1: Node.js

> *"Node.js is a JavaScript runtime built on Chrome's V8 engine. It allows JavaScript to run on the server, enabling full-stack JavaScript development."*

---

## Chapter Overview

### Why Node.js Exists

Before Node.js (created by Ryan Dahl in 2009), server-side development required languages like Java, PHP, Python, or Ruby. JavaScript was browser-only. The problem with traditional server architectures was **blocking I/O**: when a PHP server handled a database query, the thread sat idle waiting for the response — consuming memory, blocking other requests.

Ryan Dahl's insight: **I/O is inherently asynchronous**. Waiting for a disk or network response is like making a phone call and waiting on hold. Non-blocking I/O lets the server handle other requests during that wait. JavaScript's event-driven model (already used in browsers) was a perfect fit.

**Node.js key characteristics:**
- Single-threaded event loop (no thread-per-request overhead)
- Non-blocking I/O (callbacks, Promises, async/await)
- Built on V8 (Google's JavaScript engine — extremely fast)
- npm — world's largest package registry (2M+ packages)
- Same language on frontend and backend (full-stack JS)

**Where Node.js excels:**
- High-concurrency API servers (many simultaneous connections)
- Real-time applications (chat, gaming, collaborative tools)
- Streaming data (video, file processing)
- Microservices (lightweight, fast startup)
- CLI tools and build tooling

**Where Node.js struggles:**
- CPU-intensive tasks (video encoding, ML training, complex calculations)
- Applications that need multi-core parallelism without Worker Threads

### Companies Using Node.js
Netflix (reduced startup time from 40min to 70sec), LinkedIn (reduced servers from 30 to 3), PayPal (doubled requests/second vs. Java), Walmart, Uber, Airbnb, GitHub, Slack.

---

## Beginner Theory

### Node.js vs. Browser JavaScript

```
Browser JavaScript          Node.js JavaScript
──────────────────          ──────────────────
window, document, DOM       No browser APIs
fetch() (browser API)       http, https modules
localStorage                File system (fs module)
XMLHttpRequest              net, tls, dgram
alert, confirm              process, child_process
<script> tag execution      require() / import / node command
Sandboxed (security)        Full OS access
```

### The Event Loop

The event loop is the core of Node.js. It processes events and callbacks, enabling non-blocking behavior on a single thread.

```
┌─────────────────────────────────────────────────────┐
│                    CALL STACK                        │
│         (synchronous code executes here)             │
└───────────────────────┬─────────────────────────────┘
                        │ when empty
                        ▼
┌─────────────────────────────────────────────────────┐
│              EVENT LOOP PHASES (libuv)               │
│                                                      │
│  1. timers         — setTimeout, setInterval         │
│  2. pending I/O    — I/O callbacks from prev cycle   │
│  3. idle/prepare   — internal use                    │
│  4. poll           — retrieve new I/O events ◄────┐  │
│  5. check          — setImmediate callbacks        │  │
│  6. close cbs      — socket.on('close', ...)       │  │
└─────────────────────────────┬────────────────────────┘
                              │
              ┌───────────────▼──────────────────┐
              │  Microtask Queue (PRIORITY)       │
              │  process.nextTick()               │
              │  Promise .then() callbacks        │
              └───────────────────────────────────┘

              ┌───────────────────────────────────┐
              │  libuv Thread Pool (4 threads)    │
              │  fs, crypto, dns, zlib            │
              │  (CPU/disk work off event loop)   │
              └───────────────────────────────────┘
```

```javascript
// Execution order demonstration
console.log("1 - synchronous");

setTimeout(() => console.log("5 - timer (phase 1)"), 0);

setImmediate(() => console.log("6 - setImmediate (phase 5)"));

Promise.resolve().then(() => console.log("3 - Promise microtask"));

process.nextTick(() => console.log("2 - nextTick (highest priority)"));

queueMicrotask(() => console.log("4 - queueMicrotask"));

console.log("7 - synchronous");

// Output:
// 1 - synchronous
// 7 - synchronous
// 2 - nextTick (highest priority)
// 3 - Promise microtask
// 4 - queueMicrotask
// 5 - timer (phase 1)
// 6 - setImmediate (phase 5)
```

### Core Modules

```javascript
// No installation needed — built into Node.js

const fs      = require("fs");      // file system
const path    = require("path");    // path utilities
const os      = require("os");      // operating system info
const http    = require("http");    // HTTP server
const https   = require("https");   // HTTPS server
const url     = require("url");     // URL parsing
const crypto  = require("crypto");  // cryptography
const events  = require("events");  // EventEmitter
const stream  = require("stream");  // streams
const child_process = require("child_process"); // spawn processes
const cluster = require("cluster"); // multi-core
const worker_threads = require("worker_threads"); // CPU tasks
const net     = require("net");     // TCP sockets
const dns     = require("dns");     // DNS lookup
const readline = require("readline"); // CLI input
const zlib    = require("zlib");    // compression
const buffer  = require("buffer");  // binary data
```

### The mental model, in one paragraph

Node.js is **V8 (the JavaScript engine) + libuv (the async I/O library) + a standard library**. Your JavaScript runs on exactly one thread. Whenever that code asks for something slow — a file, a socket, a DNS lookup — Node hands the request to the operating system or to libuv's small thread pool, registers a callback, and *immediately returns to running your code*. When the slow thing finishes, its callback is queued, and the event loop runs it the next time your code is idle.

That is the entire idea. Everything else — streams, promises, workers, clusters — is machinery built on top of it. And the one rule that follows from it is the rule that governs all Node.js performance: **never do slow synchronous work on the main thread**, because there is only one, and while it is busy, every other user is waiting.

---

## Basic Examples

### Your first server, and what each line actually does

```javascript
const http = require("http");

const server = http.createServer((req, res) => {
  // This callback runs once PER REQUEST, on the single main thread.
  // Anything slow and synchronous here blocks EVERY other request.
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ ok: true, pid: process.pid }));
});

server.listen(3000, () => console.log("http://localhost:3000"));
```

Prove the single-thread rule to yourself — this is the most useful five minutes in the chapter:

```javascript
const http = require("http");

http.createServer((req, res) => {
  if (req.url === "/slow") {
    // Synchronous busy-wait: 5 seconds of blocked event loop.
    const until = Date.now() + 5000;
    while (Date.now() < until) { /* burn CPU */ }
    return res.end("slow done");
  }
  res.end("fast done");
}).listen(3000);
```

Open two terminals. Hit `/slow` in one, then immediately hit `/` in the other. The fast request waits the full five seconds. **One blocked handler froze the entire server.** This is the failure mode behind most "Node.js is slow" complaints, and it is always a blocking-code problem rather than a Node problem.

### Blocking versus non-blocking, measured

```javascript
const fs = require("fs");
const fsp = require("fs/promises");

// ─── Blocking: the thread stops here ─────────────────────────────
console.time("sync");
for (let i = 0; i < 100; i++) fs.readFileSync("package.json", "utf8");
console.timeEnd("sync");        // e.g. sync: 42ms — 42ms of frozen server

// ─── Non-blocking: all 100 reads are in flight at once ───────────
console.time("async");
await Promise.all(
  Array.from({ length: 100 }, () => fsp.readFile("package.json", "utf8"))
);
console.timeEnd("async");       // e.g. async: 11ms — and the loop stayed free
```

The async version is faster *and* — far more importantly — it never stopped the server from serving other users. Notice also that it does not scale linearly past four concurrent operations, because `fs` uses libuv's thread pool, which defaults to four threads. That detail comes back under **Performance**.

### Reading input without loading it into memory

```javascript
const fs = require("fs");
const readline = require("readline");

// Count lines in a 5GB file using a constant ~64KB of memory.
async function countLines(file) {
  const rl = readline.createInterface({
    input: fs.createReadStream(file),
    crlfDelay: Infinity,
  });
  let n = 0;
  for await (const _line of rl) n++;   // async iteration handles backpressure
  return n;
}

console.log(await countLines("huge.csv"));
```

Compare with the naive version, `fs.readFileSync(file).split("\n").length`, which needs 5GB of RAM and will crash the process. This contrast — streaming versus buffering — is the second-most-common source of Node.js production incidents after blocking the loop.

### A tiny but complete service

```javascript
const http = require("http");
const { randomUUID } = require("crypto");

const users = new Map();

const routes = {
  "GET /health": (req, res) => json(res, 200, { status: "ok", uptime: process.uptime() }),

  "GET /users": (req, res) => json(res, 200, [...users.values()]),

  "POST /users": async (req, res) => {
    const body = await readBody(req);          // bounded — see Security
    if (!body?.email) return json(res, 400, { error: "email is required" });
    const user = { id: randomUUID(), email: body.email, createdAt: new Date() };
    users.set(user.id, user);
    json(res, 201, user);
  },
};

const server = http.createServer(async (req, res) => {
  const { pathname } = new URL(req.url, `http://${req.headers.host}`);
  const handler = routes[`${req.method} ${pathname}`];
  try {
    if (!handler) return json(res, 404, { error: "Not Found" });
    await handler(req, res);
  } catch (err) {
    // One place where every unhandled error lands. Never leak err.message.
    console.error({ msg: "request failed", err: err.message, path: pathname });
    json(res, 500, { error: "Internal Server Error" });
  }
});

function json(res, status, payload) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(payload));
}

async function readBody(req, limit = 1e6) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) { req.destroy(); throw new Error("Payload too large"); }
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : null;
}

server.listen(3000);
```

Ninety lines, no dependencies, and it already has the four things a real service needs: routing, a body-size limit, a single error boundary, and a health endpoint. Everything Express gives you is ergonomics on top of this.

---

## Working with the File System

```javascript
const fs = require("fs");
const fsPromises = require("fs").promises; // or: require("fs/promises")
const path = require("path");

// ─── SYNCHRONOUS (blocks event loop — use only at startup) ───────────────────
const data = fs.readFileSync("config.json", "utf-8");
const config = JSON.parse(data);

// ─── CALLBACK-BASED ────────────────────────────────────────────────────────────
fs.readFile("data.txt", "utf-8", (err, data) => {
  if (err) return console.error(err);
  console.log(data);
});

// ─── PROMISE-BASED (recommended) ──────────────────────────────────────────────
async function readConfig() {
  try {
    const content = await fsPromises.readFile("config.json", "utf-8");
    return JSON.parse(content);
  } catch (err) {
    if (err.code === "ENOENT") throw new Error("Config file not found");
    throw err;
  }
}

// Write file
await fsPromises.writeFile("output.txt", "Hello World", "utf-8");

// Append to file
await fsPromises.appendFile("log.txt", `${new Date().toISOString()} - Event\n`);

// Create directory (recursive = no error if exists)
await fsPromises.mkdir("logs/archive", { recursive: true });

// List directory
const entries = await fsPromises.readdir("src", { withFileTypes: true });
const files   = entries.filter(e => e.isFile()).map(e => e.name);
const dirs    = entries.filter(e => e.isDirectory()).map(e => e.name);

// File stats
const stats = await fsPromises.stat("package.json");
console.log(stats.size, stats.mtime, stats.isFile());

// Delete
await fsPromises.unlink("temp.txt");
await fsPromises.rm("old-dir", { recursive: true, force: true });

// Copy
await fsPromises.copyFile("src.txt", "dst.txt");

// Path utilities
const full  = path.join(__dirname, "data", "users.json");  // safe join
const ext   = path.extname("file.ts");                     // ".ts"
const base  = path.basename("/path/to/file.js");           // "file.js"
const dir   = path.dirname("/path/to/file.js");            // "/path/to"
const rel   = path.relative("/src", "/src/utils/log.js");  // "utils/log.js"
```

### HTTP Server

```javascript
const http = require("http");

const server = http.createServer((req, res) => {
  const { method, url, headers } = req;

  // Parse URL
  const parsedUrl = new URL(url, `http://${headers.host}`);
  const pathname = parsedUrl.pathname;  // "/users"
  const query    = parsedUrl.searchParams.get("page"); // "2"

  // Read request body (streams)
  let body = "";
  req.on("data", chunk => { body += chunk; });
  req.on("end", () => {
    try {
      const data = body ? JSON.parse(body) : null;

      // Route handling
      if (method === "GET" && pathname === "/") {
        res.writeHead(200, { "Content-Type": "text/plain" });
        res.end("Hello World");

      } else if (method === "GET" && pathname === "/json") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ message: "ok" }));

      } else {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Not Found" }));
      }
    } catch (err) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Invalid JSON" }));
    }
  });
});

server.listen(3000, () => console.log("Server on http://localhost:3000"));

// Graceful shutdown
process.on("SIGTERM", () => {
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});
```

---

## Intermediate Concepts

### EventEmitter

Node.js is built on the Observer pattern. The `EventEmitter` class is the backbone of most Node.js APIs.

```javascript
const { EventEmitter } = require("events");

class OrderService extends EventEmitter {
  #orders = new Map();

  async placeOrder(order) {
    const created = { ...order, id: crypto.randomUUID(), createdAt: new Date() };
    this.#orders.set(created.id, created);

    this.emit("order:placed", created);      // notify all listeners
    return created;
  }

  async shipOrder(id) {
    const order = this.#orders.get(id);
    if (!order) throw new Error(`Order ${id} not found`);

    const shipped = { ...order, shippedAt: new Date() };
    this.#orders.set(id, shipped);

    this.emit("order:shipped", shipped);
    return shipped;
  }
}

const orderService = new OrderService();

// Register listeners
orderService.on("order:placed", async (order) => {
  console.log("Email customer: order placed", order.id);
  // await emailService.sendOrderConfirmation(order);
});

orderService.on("order:placed", async (order) => {
  console.log("Notify warehouse: new order", order.id);
  // await warehouseService.createPickList(order);
});

orderService.on("order:shipped", (order) => {
  console.log("Update tracking:", order.id);
});

// Error events — ALWAYS handle!
orderService.on("error", (err) => {
  console.error("OrderService error:", err);
});

// One-time listener
orderService.once("order:placed", (order) => {
  console.log("First order ever:", order.id);
});

// Use it
const order = await orderService.placeOrder({ product: "Widget", qty: 2 });
```

### Streams

Streams process data piece by piece, enabling handling of files/data larger than available memory.

```javascript
const { Readable, Writable, Transform, pipeline } = require("stream");
const { promisify } = require("util");
const pipelineAsync = promisify(pipeline);
const fs = require("fs");
const zlib = require("zlib");

// ─── Readable stream from array ───────────────────────────────────────────────
const readable = Readable.from(["line 1\n", "line 2\n", "line 3\n"]);

// ─── Transform: uppercase ────────────────────────────────────────────────────
const uppercase = new Transform({
  transform(chunk, encoding, callback) {
    callback(null, chunk.toString().toUpperCase());
  }
});

// ─── File compression pipeline ───────────────────────────────────────────────
async function compressFile(input, output) {
  await pipelineAsync(
    fs.createReadStream(input),
    zlib.createGzip(),              // compress with gzip
    fs.createWriteStream(output)
  );
  console.log(`Compressed ${input} → ${output}`);
}

await compressFile("large-file.csv", "large-file.csv.gz");

// ─── Custom Transform stream ─────────────────────────────────────────────────
class JSONLParser extends Transform {
  #buffer = "";

  constructor() {
    super({ readableObjectMode: true });
  }

  _transform(chunk, encoding, done) {
    this.#buffer += chunk;
    const lines = this.#buffer.split("\n");
    this.#buffer = lines.pop();  // keep incomplete last line

    for (const line of lines) {
      if (line.trim()) {
        try {
          this.push(JSON.parse(line));  // emit parsed object
        } catch (err) {
          this.emit("error", new Error(`Invalid JSON: ${line}`));
        }
      }
    }
    done();
  }

  _flush(done) {
    if (this.#buffer.trim()) {
      try {
        this.push(JSON.parse(this.#buffer));
      } catch (err) {
        this.emit("error", new Error(`Invalid JSON: ${this.#buffer}`));
      }
    }
    done();
  }
}

// Process large JSONL file line by line (no memory limit)
async function processLargeFile(path) {
  const results = [];
  await pipelineAsync(
    fs.createReadStream(path),
    new JSONLParser(),
    new Writable({
      objectMode: true,
      write(obj, enc, done) {
        results.push(obj);
        done();
      }
    })
  );
  return results;
}
```

### Worker Threads

Use Worker Threads for CPU-intensive work that would block the event loop.

```javascript
const { Worker, isMainThread, parentPort, workerData } = require("worker_threads");
const path = require("path");

// ─── Worker file: worker.js ───────────────────────────────────────────────────
if (!isMainThread) {
  const { numbers } = workerData;
  // CPU-intensive: sort 1 million numbers
  const sorted = numbers.slice().sort((a, b) => a - b);
  parentPort.postMessage({ sorted, sum: sorted.reduce((a, b) => a + b, 0) });
  process.exit(0);
}

// ─── Main thread ──────────────────────────────────────────────────────────────
function runWorker(data) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(__filename, { workerData: data });
    worker.on("message", resolve);
    worker.on("error", reject);
    worker.on("exit", (code) => {
      if (code !== 0) reject(new Error(`Worker exited with code ${code}`));
    });
  });
}

// Run CPU work without blocking the event loop
const numbers = Array.from({ length: 1_000_000 }, () => Math.random());
console.log("Starting CPU work in worker...");
const result = await runWorker({ numbers });
console.log("Done:", result.sum);
```

### Child Processes

```javascript
const { exec, execFile, spawn, fork } = require("child_process");
const { promisify } = require("util");
const execAsync = promisify(exec);

// exec — simple command, buffers output (security risk with user input!)
const { stdout, stderr } = await execAsync("git log --oneline -5");
console.log(stdout);

// spawn — streaming output, no shell (safer for user input)
const ls = spawn("ls", ["-la", "/tmp"], { stdio: "pipe" });
ls.stdout.on("data", data => process.stdout.write(data));
ls.stderr.on("data", data => process.stderr.write(data));
ls.on("close", code => console.log("exit code:", code));

// fork — spawn another Node.js process with IPC channel
const child = fork("./worker.js", { silent: true });
child.send({ task: "process", data: items });
child.on("message", result => console.log("Child result:", result));
child.on("exit", code => console.log("Child done:", code));
```

### Module System

```javascript
// ─── CommonJS (CJS) — require/module.exports ──────────────────────────────────
// math.js
const PI = Math.PI;
function add(a, b) { return a + b; }
module.exports = { PI, add };    // named exports
// module.exports = add;         // default export

// app.js
const { PI, add } = require("./math");

// ─── ES Modules (ESM) — import/export ─────────────────────────────────────────
// math.mjs or math.js with "type": "module" in package.json
export const PI = Math.PI;
export function add(a, b) { return a + b; }
export default function multiply(a, b) { return a * b; }

// app.mjs
import multiply, { PI, add } from "./math.js";

// Dynamic import (works in both CJS and ESM)
const module = await import("./math.js");

// Detect ESM vs CJS
// __dirname and __filename are NOT available in ESM
import { fileURLToPath } from "url";
import { dirname } from "path";
const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
```

### Process and Environment

```javascript
// Environment variables
const PORT = parseInt(process.env.PORT || "3000", 10);
const NODE_ENV = process.env.NODE_ENV || "development";
const isProduction = NODE_ENV === "production";

// Process info
console.log(process.pid);        // process ID
console.log(process.version);    // Node.js version
console.log(process.platform);   // "win32", "linux", "darwin"
console.log(process.arch);       // "x64", "arm64"
console.log(process.cwd());      // current working directory
console.log(process.uptime());   // seconds since start

// Memory usage
const { rss, heapTotal, heapUsed, external } = process.memoryUsage();
console.log(`Heap: ${(heapUsed / 1024 / 1024).toFixed(1)} MB`);

// CPU usage
const startUsage = process.cpuUsage();
// ... do work ...
const elapsed = process.cpuUsage(startUsage);
console.log(`CPU: user=${elapsed.user}μs sys=${elapsed.system}μs`);

// Command line args
// node app.js --port 3001 --verbose
const args = process.argv.slice(2);  // ["--port", "3001", "--verbose"]

// Signal handlers
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT",  () => gracefulShutdown("SIGINT"));

process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection:", reason);
  process.exit(1);
});

async function gracefulShutdown(signal) {
  console.log(`Received ${signal}. Closing connections...`);
  await server.close();
  await db.disconnect();
  process.exit(0);
}
```

---

## Advanced Concepts

### Cluster Module — Multi-Core

Node.js is single-threaded. Cluster forks a worker process per CPU core to maximize throughput.

```javascript
const cluster = require("cluster");
const os = require("os");
const http = require("http");

if (cluster.isPrimary) {
  const numCPUs = os.cpus().length;
  console.log(`Primary ${process.pid} running on ${numCPUs} cores`);

  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on("exit", (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died (${signal || code}). Restarting...`);
    cluster.fork();  // auto-restart dead workers
  });

  // Zero-downtime reload: replace workers one by one
  process.on("SIGUSR2", () => {
    const workers = Object.values(cluster.workers);
    let i = 0;
    function restartNext() {
      const worker = workers[i++];
      if (!worker) return;
      worker.once("exit", restartNext);
      worker.kill("SIGTERM");
    }
    restartNext();
  });

} else {
  // Worker: each worker handles requests independently
  const server = http.createServer((req, res) => {
    res.writeHead(200);
    res.end(`Worker ${process.pid}: Hello\n`);
  });

  server.listen(3000);
  console.log(`Worker ${process.pid} started`);

  process.on("SIGTERM", () => {
    server.close(() => process.exit(0));
  });
}
```

### Performance Profiling

```bash
# Built-in profiler
node --prof app.js          # generate isolate-*.log

# Process the log
node --prof-process isolate-*.log > profile.txt

# CPU profiling with clinic.js
npm install -g clinic
clinic doctor   -- node app.js    # diagnoses performance issues
clinic flame    -- node app.js    # flame graph
clinic bubbleprof -- node app.js  # async profiling

# Heap snapshot
# In code:
const v8 = require("v8");
const fs = require("fs");
const heap = v8.writeHeapSnapshot();
console.log("Heap snapshot written to:", heap);

# Or use --inspect flag
node --inspect app.js
# Open chrome://inspect
```

### N-API / Native Addons

Node.js can call native C/C++ code via N-API:
```bash
npm install bcrypt         # has C++ binding for password hashing
npm install sharp          # C++ image processing
npm install sqlite3        # C++ SQLite bindings
```

These run in the libuv thread pool, so they don't block the event loop.

---

## Industry Usage

**Common use cases:**
- **REST API servers**: Express.js, Fastify, NestJS (most common)
- **GraphQL servers**: Apollo Server, Yoga
- **Real-time**: Socket.io, WebSockets for chat/gaming/collaboration
- **Microservices**: Lightweight services with shared npm packages
- **BFF (Backend for Frontend)**: Next.js API routes, Remix loaders
- **CLI tools**: Create React App, Angular CLI, Vite, ESLint — all Node.js
- **Serverless**: AWS Lambda, Vercel Functions, Cloudflare Workers

**Version considerations:**
- Use **LTS (Long-Term Support)** versions in production
- Use `nvm` (Node Version Manager) to manage multiple Node versions
- Check package compatibility on `node.green`
- Pin the version in `.nvmrc` and in your Dockerfile. "Works on my machine" is usually a Node version difference.

### What the famous migrations actually proved

The frequently-quoted numbers are real but often misunderstood, and an interviewer may probe this.

| Company | Result | What actually caused it |
|---|---|---|
| **PayPal** | 2× requests/sec, 35% lower response time, 33% fewer lines | Java→Node, but much of the gain was rewriting a legacy codebase with a modern design |
| **LinkedIn** | 30 servers → 3 | Ruby's thread-per-request model was the bottleneck; the workload was almost purely I/O-bound |
| **Netflix** | Startup 40 min → 70 sec | Removed a heavyweight Java build/boot pipeline, not a language speed difference |
| **Walmart** | 6M req/min on Black Friday | Node handled I/O concurrency well; CPU work was pushed to other services |

**The honest reading:** Node.js wins decisively when the workload is *I/O-bound and highly concurrent*. It wins nothing when the workload is CPU-bound. Saying "Node is faster than Java" in an interview is wrong and will be challenged; saying "Node's concurrency model suits I/O-bound workloads, which is what most web APIs are" is correct and shows judgement.

---

## Alternatives

You will be asked "why Node?" — and the answer must include the cases where it is the wrong choice.

| Runtime / language | Concurrency model | Where it beats Node | Where Node beats it |
|---|---|---|---|
| **Deno** | Same event loop, V8 | Secure by default, native TypeScript, built-in tooling | Ecosystem maturity, npm compatibility, hiring pool |
| **Bun** | Event loop, JavaScriptCore | Much faster startup and installs, batteries included | Production track record, edge-case compatibility |
| **Go** | Goroutines (M:N threads) | CPU-bound work, true parallelism, single static binary | Iteration speed, ecosystem breadth, shared language with frontend |
| **Python (FastAPI)** | asyncio event loop | Data science and ML ecosystem | Raw throughput, single-language full-stack |
| **Java / Spring** | Thread-per-request or reactive | CPU-bound work, mature enterprise tooling, JIT peak performance | Memory footprint, startup time, development velocity |
| **Rust (Actix/Axum)** | Async runtime, no GC | Maximum throughput, predictable latency, memory safety | Development speed, hiring, compile times |
| **Elixir / Phoenix** | BEAM processes | Massive concurrent connections, fault tolerance | Ecosystem size, hiring pool |

**The decision framework worth memorising:**

- **I/O-bound, high concurrency, fast iteration needed** → Node.js. This is most web APIs.
- **CPU-bound** (video, image processing, simulation, ML) → Go, Rust, or a dedicated service. Node needs Worker Threads and still loses.
- **Hard real-time or predictable tail latency** → Rust or Go. Node's garbage collector introduces pauses.
- **Team already writes TypeScript on the frontend** → Node. Shared types, shared validation, shared people. This is frequently the decisive argument in practice and interviewers respect it.

**On Bun and Deno specifically:** the correct interview answer in the current market is that Node remains the default for production because of ecosystem and operational maturity, while Bun is increasingly attractive for tooling and scripts where startup time dominates. Claiming you would migrate a production service to Bun today, without a specific reason, reads as inexperience.

---

## Security

```javascript
// 1. Never execute user input as code
// BAD:
eval(userInput);              // code injection
new Function(userInput)();    // same risk
child_process.exec(`ls ${userInput}`);  // shell injection

// GOOD: use execFile with args array (no shell)
execFile("ls", [userInput]);  // userInput can't inject shell commands

// 2. Protect against path traversal
const safePath = path.resolve("/uploads", path.basename(userFileName));
if (!safePath.startsWith("/uploads")) throw new Error("Path traversal detected");

// 3. Limit request body size (in raw http server)
let body = "";
req.on("data", chunk => {
  body += chunk;
  if (body.length > 1e6) {  // 1MB limit
    req.destroy();
    throw new Error("Request body too large");
  }
});

// 4. Use helmet with Express for security headers (covered in Express chapter)

// 5. Environment variables for secrets — never hardcode
const dbPassword = process.env.DB_PASSWORD;  // ✓
// const dbPassword = "abc123";              // ✗

// 6. Prototype pollution protection
const userInput = JSON.parse('{"__proto__":{"admin":true}}');
// Safe: use Object.assign or spread with care, or use Map instead of plain objects
```

---

## Performance

```javascript
// 1. Use async/await — never block the event loop
// BAD: synchronous crypto blocks the event loop for ALL requests
const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, "sha512"); // blocks!

// GOOD: async version
const hash = await new Promise((resolve, reject) =>
  crypto.pbkdf2(password, salt, 100000, 64, "sha512", (err, key) =>
    err ? reject(err) : resolve(key))
);
// Or use bcrypt / argon2 which use the thread pool

// 2. Pool database connections (don't open per-request)
const pg = require("pg");
const pool = new pg.Pool({ max: 10, connectionTimeoutMillis: 5000 });

// 3. Enable HTTP keep-alive
const http = require("http");
const agent = new http.Agent({ keepAlive: true });
// Reuses TCP connections to the same host

// 4. Stream large responses
app.get("/large-file", (req, res) => {
  const stream = fs.createReadStream("large.csv");
  res.setHeader("Content-Type", "text/csv");
  stream.pipe(res);  // no memory pressure — streams chunk by chunk
});

// 5. Use compression middleware
const compression = require("compression");
app.use(compression());  // gzip/brotli responses

// 6. PM2 — production process manager
// npm install -g pm2
// pm2 start app.js -i max      # cluster mode: 1 process per CPU
// pm2 start ecosystem.config.js
// pm2 logs / pm2 monit / pm2 reload app
```

---

## Debugging

```bash
# Built-in inspector (Chrome DevTools)
node --inspect app.js          # attach at chrome://inspect
node --inspect-brk app.js     # pause at first line

# VS Code: .vscode/launch.json
{
  "type": "node",
  "request": "launch",
  "name": "Debug",
  "program": "${workspaceFolder}/src/app.js",
  "restart": true,
  "runtimeExecutable": "nodemon"
}

# Common issues
# "EADDRINUSE" — port already in use
lsof -ti:3000 | xargs kill -9    # Linux/Mac
netstat -ano | findstr :3000      # Windows, then: taskkill /PID <PID> /F

# "ENOMEM" — heap out of memory
node --max-old-space-size=4096 app.js    # increase from default ~1.5GB

# Event loop blocked? Use clinic.js or blocked-at
const { blockedAt } = require("blocked-at");
blockedAt((time, stack) => {
  console.log(`Event loop blocked for ${time}ms`, stack);
});
```

---

## Interview Preparation

**Q1: What is the event loop? How does it enable non-blocking I/O?**
A: The event loop is a loop in libuv that picks up completed I/O events and runs their registered callbacks. JavaScript is single-threaded — only one thing runs at a time. When Node.js encounters I/O (file read, network request), it delegates the work to the OS or libuv's thread pool, registers a callback, and immediately continues processing other events. When the I/O completes, the callback is queued for the event loop. This enables handling thousands of concurrent connections with a single thread, because the thread is rarely blocked — it's always moving between event handlers.

**Q2: What's the difference between `process.nextTick()` and `Promise.then()`?**
A: Both schedule microtasks, but `process.nextTick()` has higher priority — it runs before Promises and before the event loop moves to the next phase. `nextTick` callbacks run immediately after the current operation completes, emptying the nextTick queue fully before any Promise callbacks. This means: nextTick > Promise.then > setImmediate > setTimeout.

**Q3: What are streams? Why use them instead of loading the entire file?**
A: Streams are objects that read/write data in chunks rather than loading everything into memory. Without streams, reading a 2GB file requires 2GB of RAM. With streams, Node.js processes data chunk by chunk — constant memory usage regardless of file size. Streams are also composable via `.pipe()` — you can chain a readable stream through transform streams (compression, encryption, parsing) to a writable stream efficiently.

**Q4: When would you use Worker Threads vs. the Cluster module?**
A: Worker Threads run within the same process and share memory (via SharedArrayBuffer), suited for CPU-intensive single tasks (image processing, complex calculations). Cluster forks separate OS processes, each with its own event loop, sharing the same port — suited for scaling an HTTP server across all CPU cores. Cluster handles high-concurrency I/O servers. Worker Threads handle CPU-intensive tasks without blocking the main event loop.

**Q5: What is the difference between `require()` and `import`?**
A: `require()` is CommonJS (CJS) — synchronous, dynamic, available in Node.js from the start. `import` is ES Modules (ESM) — asynchronous by spec, statically analyzable (enables tree-shaking), the standard in browsers and modern Node.js. Node.js supports both, but mixing requires care (CJS can `require()` CJS, ESM can `import` ESM or CJS; CJS cannot `require()` ESM — must use dynamic `import()`).

### Deep Dive Answers (3+ Years Experience)

**Q6: How would you debug high event loop lag in production?**

**What they're testing:** Can you diagnose real production Node.js issues?

**Deep Answer:**

Event loop lag means the main thread is blocked — callbacks queue up, response times spike, health checks fail.

**Step 1 — Detect:** Use `perf_hooks.monitorEventLoopDelay()` or APM tools (Datadog, New Relic). Alert when p99 lag exceeds 100ms.

**Step 2 — Profile:** Run with `--inspect`, take CPU profile in Chrome DevTools. Look for long synchronous functions: JSON.parse on huge payloads, synchronous bcrypt (use worker thread), regex catastrophic backtracking, large array operations in request handler.

**Step 3 — Common culprits:**
- Sync file I/O (`fs.readFileSync`) in request path → switch to async or streams
- Unbounded in-memory caches growing forever → add TTL and max size
- Logging huge objects synchronously → truncate, async transport
- CPU work on main thread → Worker Threads or separate service

**Step 4 — Prevent:** Request timeouts, body size limits (`express.json({ limit: '1mb' })`), circuit breakers for downstream calls, horizontal scaling behind load balancer.

**Real story for interview:** "We had p99 latency spikes to 2 seconds. CPU profile showed synchronous PDF generation in the API handler. Moved to Bull queue + worker process. API returned job ID immediately. p99 dropped to 120ms."

---

**Q7: Explain graceful shutdown in Node.js.**

**Deep Answer:**

When Kubernetes/ECS sends SIGTERM, you have ~30 seconds before SIGKILL. Graceful shutdown:

```javascript
const server = app.listen(PORT);

function shutdown(signal) {
  console.log(`${signal} received — closing server`);
  server.close(() => {
    console.log('HTTP server closed');
    dbPool.end().then(() => process.exit(0));
  });
  // Force exit after 25s
  setTimeout(() => process.exit(1), 25000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
```

`server.close()` stops accepting new connections but finishes in-flight requests. Also: stop cron jobs, drain message queue consumers, flush logs. In Kubernetes: `preStop` hook + `terminationGracePeriodSeconds: 30`.

---

**Q8: How does the libuv thread pool affect performance?**

**Deep Answer:**

By default libuv has **4 threads** for: `fs.*` operations, `crypto.pbkdf2`, `crypto.randomBytes`, `dns.lookup`, compression. If 4 slow `fs.readFile` calls run simultaneously, the 5th queues until one completes — even though event loop is "free."

**Fixes:**
- Increase pool: `UV_THREADPOOL_SIZE=16` (max ~128, but more threads = more contention)
- Use native async DNS: `dns.promises.resolve()` with `setDefaultResultOrder`
- Offload crypto to Worker Threads for many parallel password hashes
- Use dedicated storage service instead of local disk I/O in API path

**Interview tip:** Connect this to why Node.js is great for I/O-bound (many concurrent DB/network calls) but bad for CPU-bound without workers.

---

## Practical Tasks

### Beginner (10 Tasks)
1. Build a file reader CLI that takes a filename argument and prints its content.
2. Create an HTTP server that responds with different content for `/`, `/about`, `/api/users`.
3. Use the EventEmitter to build a simple publish/subscribe system with 3 event types.
4. Read a large CSV file using streams and count the number of lines without loading it all into memory.
5. Use `child_process.spawn` to run a Git command and print its output.
6. Build a timer that uses `setInterval` to print the current time every second, stops after 10.
7. Demonstrate the event loop order: log numbers 1-7 using various timing mechanisms.
8. Write a file compression utility using `zlib.createGzip()` and streams.
9. Create a directory watcher using `fs.watch()` that logs all file changes.
10. Build a simple TCP server using the `net` module that echoes data back to clients.

### Intermediate (10 Tasks)
1. Build a cluster HTTP server that shows the worker PID in the response header.
2. Implement a custom Transform stream that parses JSONL files line by line.
3. Build a Worker Thread pool that limits concurrency for CPU-intensive tasks.
4. Create a graceful shutdown handler that waits for all in-flight requests to complete.
5. Build a file watcher that triggers a rebuild when source files change.
6. Implement a custom EventEmitter subclass with error handling, `once()`, and cleanup.
7. Create a reverse proxy using Node.js HTTP that load balances between two backend ports.
8. Build a streaming HTTP client that downloads a large file and shows progress.
9. Implement a rate limiter using a sliding window algorithm without external libraries.
10. Profile a Node.js app with `--prof` and identify the hottest function call.

### Advanced (10 Tasks)
1. Build a zero-downtime reload for a Cluster-based server (rolling worker restart).
2. Implement a connection pool abstraction over raw TCP sockets.
3. Build a real-time metrics collector using `process.cpuUsage()` and `process.memoryUsage()`.
4. Create a custom stream that implements backpressure correctly.
5. Build a plugin system using dynamic `import()` that loads plugins from a directory.
6. Implement an in-memory job queue backed by EventEmitter with concurrency control.
7. Write a Node.js HTTP/2 server and compare throughput vs. HTTP/1.1.
8. Build a test harness that intercepts `require()` calls (module mocking without a library).
9. Implement a lightweight dependency injection container using WeakRef and FinalizationRegistry.
10. Build a Node.js native addon wrapper for a C library using N-API.

---

## Mini Project

**File Processing Server**: Build a Node.js HTTP server that:
- Accepts file uploads via multipart/form-data (parse manually using streams)
- Processes the file (parse CSV, count records, compute stats)
- Compresses the output using gzip
- Returns the result as a streaming response
- Uses Worker Threads for parsing if the file > 10MB
- Logs all requests with timing and bytes transferred

---

## Production Project

**High-Performance API Gateway**: Build a Node.js reverse proxy/API gateway:
- Cluster mode: 1 worker per CPU core
- Load balance between backend services (round-robin)
- Rate limiting per IP (sliding window, in-memory)
- Request/response logging (non-blocking, async write to file stream)
- Circuit breaker (stop forwarding if backend is failing)
- Health check endpoint
- Graceful shutdown with in-flight request tracking

---

## Capstone Project

**Real-Time Collaboration Server**: Build a WebSocket server (using raw `ws` or Node.js `http`) that enables multiple users to edit a shared document:
- Operational Transform or CRDT for conflict resolution
- Room management (multiple documents)
- Presence tracking (who is online, cursor positions)
- Persistence to the file system using streams
- Cluster-safe (use Redis pub/sub for cross-process communication)

---

## Self Assessment
1. What is the Node.js event loop? Describe its 6 phases.
2. What is the order of execution: nextTick, Promise.then, setImmediate, setTimeout?
3. What is the difference between synchronous and asynchronous file operations in Node.js?
4. What are streams? What are the 4 types?
5. What is the difference between Worker Threads and the Cluster module?
6. What is `process.env` used for? Why should you never hardcode secrets?
7. What does the `--inspect` flag do?
8. What is `child_process.exec` vs `child_process.spawn`? Which is safer with user input?
9. What is `SIGTERM`? How do you handle it for graceful shutdown?
10. What does the libuv thread pool do? What operations use it?
11. What is the difference between CommonJS and ES Modules in Node.js?
12. What causes "EADDRINUSE" errors? How do you fix them?
13. How does `--max-old-space-size` help? What is the default heap size?
14. What is PM2 and what is cluster mode?
15. What is backpressure in streams? How do you handle it?

---

## Cheat Sheet

### Core Modules
```javascript
fs.promises  // file system (async)
path         // path.join, .resolve, .extname, .basename
os           // os.cpus(), os.totalmem(), os.platform()
http/https   // raw servers
crypto       // randomBytes, createHash, pbkdf2
events       // EventEmitter
stream       // Readable, Writable, Transform, pipeline
worker_threads  // Worker, isMainThread, parentPort
cluster      // isPrimary, fork(), workers
child_process // spawn, exec, fork
```

### Event Loop Order (fastest to slowest)
```
synchronous code
process.nextTick()
Promise.then() / queueMicrotask()
setImmediate()
setTimeout(0)
I/O callbacks
```

### File Operations
```javascript
await fs.promises.readFile(path, "utf-8")
await fs.promises.writeFile(path, data)
await fs.promises.mkdir(path, { recursive: true })
await fs.promises.readdir(path, { withFileTypes: true })
await fs.promises.stat(path)
fs.createReadStream(path).pipe(transform).pipe(dest)
```

### Process
```javascript
process.env.NAME        // env variable
process.argv.slice(2)   // CLI args
process.exit(0)         // exit successfully
process.on("SIGTERM", handler)
process.on("unhandledRejection", handler)
process.memoryUsage()   // { rss, heapUsed, heapTotal }
```

### Common Patterns
```javascript
// Graceful shutdown
process.on("SIGTERM", async () => {
  await server.close();
  await db.disconnect();
  process.exit(0);
});

// Worker thread for CPU work
const result = await new Promise((res, rej) => {
  const w = new Worker("./worker.js", { workerData: input });
  w.on("message", res);
  w.on("error", rej);
});
```
