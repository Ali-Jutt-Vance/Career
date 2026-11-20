# Node.js: JavaScript Outside the Browser

> [!GOALS]
> - Explain what Node.js is, why it was created, and which kinds of work it handles well — and badly.
> - Describe how Node.js runs code: V8, libuv, the event loop and its phases, the thread pool, and non-blocking I/O.
> - Use Node's core modules: the file system, paths, processes and environment variables, events, and HTTP.
> - Process large data efficiently with **streams** and **backpressure**.
> - Use modules and packages in Node (ES modules and CommonJS), and run TypeScript.
> - Use worker threads, child processes and clustering for CPU-heavy work and multiple cores.
> - Handle errors, signals and graceful shutdown the way production services must.
> - Debug, profile and secure Node.js applications.

## Why this matters

Everything you have built so far runs in the browser. But every online shop also needs code that runs on a **server**: it receives orders, checks stock in a database, charges cards, sends emails, and serves data to the front end. For many years, that meant learning a second language — PHP, Java, Python, Ruby or C# — with different tools and habits.

**Node.js** changed that. It lets JavaScript (and TypeScript) run outside the browser, on servers and developers' computers. Today Node.js powers web servers and APIs at companies of every size, nearly all front-end build tools (Vite, Next.js, ESLint and Prettier are Node programs), command-line tools, and serverless functions in the cloud. Using one language across the whole stack means shared code (validation schemas, types — {{ch:forms}}), shared tools, and developers who can work on both sides.

Node.js also has a specific way of doing work — one main thread, an event loop and non-blocking input/output — that is excellent for typical web servers and dangerous if misunderstood. A single synchronous loop over a large file, or one CPU-heavy calculation in a request handler, can freeze a server for **every** user. This chapter explains how Node works inside, so that you write servers that stay fast and stable.

You already know the language from Part II and the event loop from {{ch:the-event-loop}}. This chapter is about the **runtime**: what Node adds around the language, and how to use it professionally.

## The simple idea

Think of a single, very efficient waiter in a busy restaurant. A slow waiter would take one table's order, walk to the kitchen, **stand there** until the food is ready, carry it back, and only then go to the next table. With twenty tables, most customers would wait a very long time — or the restaurant would need twenty waiters.

The efficient waiter takes an order, hands it to the kitchen, and **immediately** goes to the next table. When the kitchen rings the bell, the waiter collects the dish and delivers it. One waiter serves many tables, because they never stand idle waiting.

Node.js is the efficient waiter. The **kitchen** is the operating system and its helpers — disks, networks, databases — which do the slow work. Node's single main thread takes requests, starts slow operations, and moves on, coming back when each operation's result is ready.

> [!ANALOGY]
> Node.js is like one efficient waiter who hands orders to the kitchen and serves other tables while the food cooks, instead of standing at the kitchen door.
>
> **Where the analogy breaks:** if a customer asks the waiter to personally peel two hundred potatoes — work that only the waiter can do — every other table waits until it is done. In Node, CPU-heavy work done in JavaScript on the main thread blocks everyone in exactly this way. The waiter model only works when the slow work is **waiting**, not **calculating**.

## The proper definition and key words

**Node.js** is an open-source, cross-platform **JavaScript runtime**: a program that executes JavaScript outside a browser, combining Google's **V8** JavaScript engine with a library for asynchronous input/output and a set of built-in modules for files, networking, processes and more. It was created by Ryan Dahl and first released in 2009.

The key words:

- **Runtime** — the environment that runs your code and provides it with capabilities beyond the language itself ({{ch:from-code-to-running-program}}).
- **V8** — the JavaScript engine (also used in Chrome) that compiles and executes JavaScript.
- **libuv** — a C library inside Node that provides the event loop, asynchronous I/O and a thread pool.
- **I/O** (input/output) — reading and writing data: files, network connections, databases, terminals.
- **Blocking** — an operation that stops the thread until it finishes.
- **Non-blocking** — an operation that starts and returns immediately; the result arrives later through a callback, promise or event.
- **Event loop** — the mechanism that repeatedly picks up completed operations and runs their callbacks ({{ch:the-event-loop}}).
- **Stream** — a sequence of data processed piece by piece instead of all at once.
- **Process** — a running program, with its own memory, managed by the operating system.
- **LTS** (Long-Term Support) — Node release lines that receive fixes for an extended period; use them in production.

## How it works inside

### Level 2 — The architecture

```text
   ┌─────────────────────────────── node process ───────────────────────────────┐
   │                                                                            │
   │   your JavaScript                                                          │
   │        │                                                                   │
   │        ▼                                                                   │
   │   Node.js APIs (fs, http, crypto, stream...) written in JS and C++         │
   │        │                                                                   │
   │        ├──────────────▶ V8: compiles and runs JavaScript (one main thread) │
   │        │                                                                   │
   │        └──────────────▶ libuv:                                             │
   │                          • event loop                                      │
   │                          • OS async I/O for network sockets                │
   │                            (epoll on Linux, kqueue on macOS, IOCP on Windows) │
   │                          • thread pool (4 threads by default) for work     │
   │                            without good OS async support: file system,     │
   │                            DNS lookups, some crypto and compression        │
   └────────────────────────────────────────────────────────────────────────────┘
```

Important facts:

- **Your JavaScript runs on one main thread.** Two pieces of your JavaScript never run at the same time in one Node process (unless you use worker threads, below). This avoids whole categories of bugs, such as two threads changing the same object simultaneously.
- **I/O does not block that thread.** Network operations use the operating system's own asynchronous mechanisms. File-system operations (and a few others) are run on libuv's **thread pool**, so they too happen in the background.
- **When an operation completes, its callback is queued**, and the event loop runs it on the main thread when it is free.

So Node is "single-threaded" for your code, but the process as a whole uses several threads behind the scenes.

### Level 2 — Why this design fits web servers

A typical web request spends most of its time **waiting**: for the database to answer, for another API to respond, for the network to deliver bytes. Very little time is spent computing in JavaScript.

The traditional alternative — common in older server designs — gives each request its own **thread**. While a thread waits for the database, it sits idle, still using memory (each thread needs its own stack, often hundreds of kilobytes to megabytes). Ten thousand simultaneous slow requests need ten thousand threads, and the operating system spends time switching between them.

Node handles the same ten thousand connections on one thread with a small amount of memory per connection, because waiting costs nothing: the thread is free to work on whichever request has data ready. This is why Node excels at **I/O-bound, highly concurrent** work — APIs, real-time chat, proxies, streaming — and why companies have reported large gains moving such services to Node (PayPal's engineering team, for example, wrote publicly about the results of moving an application from Java to Node). Part of such gains usually comes from rewriting old systems with better designs, not from the runtime alone.

It is also why Node is a poor fit, on its own main thread, for **CPU-bound** work — image and video processing, large calculations, compressing huge files, machine-learning inference — which keeps the thread busy and blocks every other request. For that, Node offers worker threads and child processes, or the work goes to services written in languages built for it.

### Level 3 — The event loop's phases

You learned the browser's event loop in {{ch:the-event-loop}}. Node's loop, provided by libuv, cycles through **phases**, each with its own queue:

```text
        ┌───────────────────────────┐
   ┌──▶ │ timers                    │  setTimeout / setInterval callbacks that are due
   │    ├───────────────────────────┤
   │    │ pending callbacks         │  some deferred system callbacks
   │    ├───────────────────────────┤
   │    │ poll                      │  wait for and run I/O callbacks (most of your code)
   │    ├───────────────────────────┤
   │    │ check                     │  setImmediate callbacks
   │    ├───────────────────────────┤
   │    │ close callbacks           │  e.g. socket 'close' events
   │    └───────────────────────────┘
   │                 │
   └─────────────────┘   repeat while there is work to do

   Between every callback:  process.nextTick queue, then the promise (microtask) queue
```

- **`process.nextTick` callbacks** run first, after the current operation, before anything else — even before promise callbacks.
- **Promise callbacks** (microtasks: `.then`, code after `await`) run next, until the queue is empty.
- Then the loop continues to the next phase.

Here is the ordering, demonstrated inside an I/O callback, where it is fully predictable:

```ts
import { readFile } from "node:fs";

readFile(import.meta.filename, () => {
  // We are now in the poll phase (an I/O callback)
  setTimeout(() => console.log("5. setTimeout (timers phase, next loop)"), 0);
  setImmediate(() => console.log("4. setImmediate (check phase, this loop)"));
  Promise.resolve().then(() => console.log("3. promise microtask"));
  process.nextTick(() => console.log("2. process.nextTick"));
  console.log("1. synchronous code in the callback");
});
```

**Output:**

```text
1. synchronous code in the callback
2. process.nextTick
3. promise microtask
4. setImmediate (check phase, this loop)
5. setTimeout (timers phase, next loop)
```

- Synchronous code always finishes first.
- `nextTick` beats promises; both run before the loop moves on.
- From the poll phase, the next phase is **check**, so `setImmediate` runs before the timer, which must wait for the next trip around the loop.
- `import.meta.filename` is the path of the current module file (available in modern Node); reading it is just a convenient way to get an I/O callback.

You rarely need to reason at this level, but knowing it explains real bugs: a recursive `process.nextTick` can **starve** I/O forever (the loop never gets past the nextTick queue), and a timer set for "0 ms" never runs before the current work and its microtasks complete.

### Level 3 — Blocking the loop, demonstrated

```ts
import { createServer } from "node:http";

function slowFibonacci(n: number): number {
  return n < 2 ? n : slowFibonacci(n - 1) + slowFibonacci(n - 2);
}

const server = createServer((req, res) => {
  if (req.url === "/slow") {
    res.end(String(slowFibonacci(30)));   // CPU-bound: blocks the only thread
  } else {
    res.end("fast");
  }
});

server.listen(0, async () => {
  const { port } = server.address() as { port: number };
  const started = Date.now();
  const slow = fetch(`http://localhost:${port}/slow`).then(() => Date.now() - started);
  const fast = fetch(`http://localhost:${port}/fast`).then(() => Date.now() - started);
  const [slowMs, fastMs] = await Promise.all([slow, fast]);
  console.log(`fast request waited for the slow one: ${fastMs >= slowMs - 5}`);
  server.close();
});
```

**Output:**

```text
fast request waited for the slow one: true
```

- `createServer` creates an HTTP server; `listen(0)` asks the operating system for any free port (useful in tests).
- The `/slow` handler computes a Fibonacci number recursively — pure CPU work, all on the main thread.
- Two requests are sent at the same moment. While `/slow` is computing, the server **cannot even start** handling `/fast`, so the fast request finishes only after the slow one. On a real server, one such request makes every user wait.
- (Exact timings vary by machine, so the program prints only whether the fast request finished at about the same time as the slow one — which it always does.)

The lesson is the most important rule of Node.js: **never block the event loop.** Avoid synchronous I/O (`readFileSync` and friends) in request handlers, avoid heavy CPU work on the main thread, and watch out for hidden CPU costs: `JSON.parse` of a huge payload, a regular expression with catastrophic backtracking, sorting a million items, synchronous password hashing.

## Running Node

### Level 3 — Installing and versions

Install Node from nodejs.org, or — better for developers — with a **version manager** such as `nvm` (or `fnm`, or `nvm-windows`), which lets you switch versions per project:

```bash
nvm install --lts
nvm use --lts
node --version
```

Node releases a new major version every six months; **even-numbered** versions become **LTS** and receive security fixes for about three years. Use an Active LTS version in production, and pin the version for each project — in a `.nvmrc` file, in `package.json`'s `engines` field, and in your Dockerfile ({{ch:docker}}) — so every developer and every server runs the same version.

### Level 3 — Running files, TypeScript and the REPL

```bash
node                       # the REPL: type JavaScript, see results
node app.js                # run a file
node --watch app.js        # rerun automatically when files change
node --env-file=.env app.js  # load environment variables from a file
node app.ts                # run TypeScript directly (current Node versions)
```

Recent Node versions can run TypeScript files directly by **stripping** the type annotations as the file loads (no type-checking happens; run `tsc --noEmit` separately for that, and some TypeScript-only syntax such as `enum` is not supported by default). Many projects still compile with `tsc` or use tools such as `tsx` for development. The built-in test runner (`node --test` — {{ch:testing}}) and built-in `fetch` mean many small projects need no extra dependencies at all.

### Level 3 — Modules in Node

Node supports two module systems ({{ch:modules-and-npm}}):

- **ES modules (ESM)** — `import`/`export`, the JavaScript standard. Used for files ending in `.mjs`, or `.js` files in a package whose `package.json` has `"type": "module"`.
- **CommonJS (CJS)** — `require()` and `module.exports`, Node's original system. Used for `.cjs` files, or `.js` files without `"type": "module"`.

New projects should use ES modules. Built-in modules are imported with the `node:` prefix, which makes clear they are part of Node, not npm packages:

```ts
// fragment
import { readFile } from "node:fs/promises";
import path from "node:path";
import { EventEmitter } from "node:events";
```

You will still meet CommonJS in older code and some packages; modern Node can `require()` many ES modules and `import` CommonJS modules, but mixing them has rough edges — prefer one system per project.

## The file system

### Level 3 — Promises API

The `node:fs/promises` module provides asynchronous file operations returning promises:

```ts
import { mkdtemp, writeFile, readFile, appendFile, readdir, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const dir = await mkdtemp(path.join(tmpdir(), "shop-"));        // a fresh temporary folder
const file = path.join(dir, "orders.csv");

await writeFile(file, "id,total\n", "utf8");
await appendFile(file, "ORD-1,2600\nORD-2,4500\n", "utf8");

const text = await readFile(file, "utf8");
console.log(text.trim().split("\n").length - 1, "orders");
console.log((await readdir(dir)).join(", "));
console.log((await stat(file)).size, "bytes");

await rm(dir, { recursive: true, force: true });                // clean up
```

**Output:**

```text
2 orders
orders.csv
31 bytes
```

- `mkdtemp` creates a uniquely named directory inside the operating system's temporary folder (`tmpdir()`), so the example never interferes with real files.
- `writeFile` creates or replaces a file; `appendFile` adds to the end; `readFile` reads all of it. The `"utf8"` encoding returns and accepts strings (without it, you get raw bytes in a `Buffer` — below).
- `readdir` lists a directory; `stat` gives metadata such as size and modification time.
- `rm` with `recursive: true` removes the directory and its contents.
- Top-level `await` works because this is an ES module.

### Level 3 — Paths

Never build file paths by joining strings with `/` — Windows uses `\`, and mistakes create security holes. Use `node:path`:

```ts
import path from "node:path";

console.log(path.join("uploads", "invoices", "2026", "inv-77.pdf").replaceAll("\\", "/"));
console.log(path.extname("inv-77.pdf"), path.basename("/data/uploads/inv-77.pdf"));
console.log(path.posix.normalize("uploads/../../etc/passwd"));
```

**Output:**

```text
uploads/invoices/2026/inv-77.pdf
.pdf inv-77.pdf
../etc/passwd
```

- `path.join` combines segments with the right separator for the operating system (the example converts `\` to `/` only so the output looks the same on every system).
- `extname` and `basename` extract parts.
- `normalize` resolves `..` segments — and the last line shows why that matters for security: a user-supplied "file name" like `../../etc/passwd` can escape the directory you intended. When building paths from user input, resolve the final path and check that it still lies inside the allowed directory (see Security below).

### Level 3 — Synchronous versions

`readFileSync`, `writeFileSync` and friends block the thread until finished. They are acceptable in **start-up code** (reading a configuration file before the server starts) and in short scripts, and dangerous in request handlers, where they block every user.

## Buffers and binary data

Not all data is text. Images, PDFs, compressed files and network packets are **bytes**. Node represents raw bytes with **`Buffer`** (a subclass of the standard `Uint8Array`):

```ts
const greeting = Buffer.from("سلام Sara", "utf8");
console.log(greeting.length, "bytes for", [..."سلام Sara"].length, "characters");
console.log(greeting.toString("hex").slice(0, 16));
console.log(greeting.toString("base64"));
console.log(Buffer.from(greeting.toString("base64"), "base64").toString("utf8"));
```

**Output:**

```text
13 bytes for 9 characters
d8b3d984d8a7d985
2LPZhNin2YUgU2FyYQ==
سلام Sara
```

- In UTF-8, each Urdu letter here takes **2 bytes**, while Latin letters and the space take 1 — so 9 characters become 13 bytes ({{ch:what-a-computer-is}}). Never assume one character is one byte.
- `toString("hex")` shows bytes as hexadecimal; `toString("base64")` encodes them as text-safe characters (used in data URLs, email attachments and some APIs); decoding base64 returns the original bytes.

## Process, environment and configuration

### Level 3 — `process`

The global `process` object describes the running program:

- `process.argv` — command-line arguments.
- `process.env` — **environment variables**: configuration supplied by the system, such as `DATABASE_URL` or `PORT`.
- `process.exitCode = 1` — set the exit code (0 means success — {{ch:the-terminal}}).
- `process.cwd()` — the current working directory; `process.pid` — the process id.
- `process.memoryUsage()` and `process.uptime()` — useful in health checks and monitoring.

### Level 3 — Configuration from the environment

Applications read their configuration from environment variables, so the same code can run in development, testing and production with different settings — and secrets stay out of the code ({{ch:git}}). Validate configuration once, at start-up, and fail fast if it is wrong:

```ts
import { z } from "zod";

const ConfigSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z.string().url(),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
});

function loadConfig(env: NodeJS.ProcessEnv) {
  const result = ConfigSchema.safeParse(env);
  if (!result.success) {
    const problems = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
    throw new Error(`Invalid configuration:\n  ${problems.join("\n  ")}`);
  }
  return result.data;
}

console.log(loadConfig({ PORT: "8080", DATABASE_URL: "postgres://localhost:5432/shop" }));
try {
  loadConfig({ PORT: "eighty", DATABASE_URL: "not a url" });
} catch (error) {
  console.log((error as Error).message);
}
```

**Output:**

```text
{
  NODE_ENV: 'development',
  PORT: 8080,
  DATABASE_URL: 'postgres://localhost:5432/shop',
  LOG_LEVEL: 'info'
}
Invalid configuration:
  PORT: Invalid input: expected number, received NaN
  DATABASE_URL: Invalid URL
```

- The schema ({{ch:forms}}) gives defaults, converts `PORT` from a string to a number, and checks the database URL.
- `loadConfig` takes the environment as a parameter (instead of reading `process.env` directly), so it can be tested with any values ({{ch:functional-programming}}). In the application, call `loadConfig(process.env)` once at start-up.
- Invalid configuration stops the program immediately with a clear message, instead of failing mysteriously at 3 a.m. when the first database query runs.
- `NodeJS.ProcessEnv` is the type of `process.env` from Node's type definitions.

In development, values usually come from a git-ignored `.env` file (loaded with `node --env-file=.env`); in production, from the hosting platform or a secrets manager ({{ch:secrets-manager}}).

## Events

Many Node objects are **event emitters** — the observer pattern from {{ch:design-patterns}}. Servers emit `request` and `close`; streams emit `data`, `end` and `error`; processes emit `exit`. You can create your own:

```ts
import { EventEmitter, once } from "node:events";

type OrderEvents = {
  placed: [orderId: string, totalPaisa: number];
  failed: [orderId: string, reason: string];
};

const orders = new EventEmitter<OrderEvents>();

orders.on("placed", (id, total) => console.log(`email: confirmation for ${id} (Rs ${total / 100})`));
orders.on("placed", (id) => console.log(`stock: reserve items for ${id}`));
orders.on("failed", (id, reason) => console.log(`alert: ${id} failed — ${reason}`));

orders.emit("placed", "ORD-21", 520000);
orders.emit("failed", "ORD-22", "card declined");

setTimeout(() => orders.emit("placed", "ORD-23", 99000), 10);
const [nextId] = await once(orders, "placed");
console.log(`awaited the next order: ${nextId}`);
```

**Output:**

```text
email: confirmation for ORD-21 (Rs 5200)
stock: reserve items for ORD-21
alert: ORD-22 failed — card declined
email: confirmation for ORD-23 (Rs 990)
stock: reserve items for ORD-23
awaited the next order: ORD-23
```

- The generic type map (`EventEmitter<OrderEvents>`) makes event names and listener arguments type-checked.
- `emit` calls listeners **synchronously**, in the order they were added.
- `once(emitter, event)` returns a promise for the next occurrence — handy for waiting on events with `await`.
- An `"error"` event is special: if one is emitted and **no listener** is registered for it, Node throws and, if nothing catches it, the process crashes. Always handle `error` events on emitters you create or use (streams, sockets).

## HTTP: the foundation of every Node web server

### Level 3 — A server from the core module

```ts
import { createServer } from "node:http";

const products = [
  { id: "sindhri", name: "Sindhri mangoes, 5 kg", pricePaisa: 225000 },
  { id: "chaunsa", name: "Chaunsa mangoes, 5 kg", pricePaisa: 260000 },
];

const server = createServer((req, res) => {
  const url = new URL(req.url ?? "/", `http://${req.headers.host}`);

  if (req.method === "GET" && url.pathname === "/products") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(products));
    return;
  }

  const match = url.pathname.match(/^\/products\/([a-z0-9-]+)$/);
  if (req.method === "GET" && match) {
    const product = products.find((p) => p.id === match[1]);
    res.writeHead(product ? 200 : 404, { "Content-Type": "application/json" });
    res.end(JSON.stringify(product ?? { message: "Product not found" }));
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ message: "Not found" }));
});

server.listen(0, async () => {
  const { port } = server.address() as { port: number };
  const base = `http://localhost:${port}`;
  for (const path of ["/products", "/products/chaunsa", "/products/lychee"]) {
    const response = await fetch(base + path);
    console.log(response.status, path, (await response.text()).slice(0, 60));
  }
  server.close();
});
```

**Output:**

```text
200 /products [{"id":"sindhri","name":"Sindhri mangoes, 5 kg","pricePaisa"
200 /products/chaunsa {"id":"chaunsa","name":"Chaunsa mangoes, 5 kg","pricePaisa":
404 /products/lychee {"message":"Product not found"}
```

Walk through it:

- `createServer(handler)` calls the handler for **every request**, with a request object (`req` — method, URL, headers, and the body as a stream) and a response object (`res`).
- `new URL(req.url, base)` parses the path and query string ({{ch:browser-and-dom}}).
- Routing is done by hand: check the method and path, match dynamic segments with a regular expression.
- `res.writeHead(status, headers)` sets the status code and headers ({{ch:how-the-web-works}}); `res.end(body)` sends the body and finishes the response. Forgetting `end` leaves the client waiting until it times out.
- The test at the bottom starts the server on a free port and calls it with `fetch`.

Even this tiny server shows why frameworks exist: manual routing, no body parsing, no validation, repetitive JSON responses, no middleware. The next chapter, {{ch:express}}, builds on exactly this foundation. But every Node framework — Express, Fastify, NestJS — is built on the `node:http` module, and knowing it helps you debug them.

## Streams

### Level 2 — Why streams?

Suppose a customer downloads a 2 GB product-catalogue export, or you process a 5 GB log file. Reading the whole file into memory with `readFile` would need gigabytes of RAM — multiplied by every concurrent request — and the first byte would only be sent after the whole file was read.

**Streams** process data **in chunks** as it flows: read a piece, process it, pass it on, repeat. Memory use stays small and constant, and work starts immediately.

```text
   readable  ──chunk──▶  transform  ──chunk──▶  writable
   (file, request,      (compress, parse,      (file, response,
    database cursor)     filter)                socket)
```

There are four kinds:

- **Readable** — a source: a file being read, an incoming HTTP request body, a database result cursor.
- **Writable** — a destination: a file being written, an HTTP response, a socket.
- **Duplex** — both readable and writable, such as a network socket.
- **Transform** — a duplex stream that changes data as it passes: compression, encryption, parsing.

### Level 3 — `pipeline`: connecting streams safely

```ts
import { createReadStream, createWriteStream } from "node:fs";
import { mkdtemp, writeFile, stat, rm } from "node:fs/promises";
import { Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { createGzip } from "node:zlib";
import { tmpdir } from "node:os";
import path from "node:path";

const dir = await mkdtemp(path.join(tmpdir(), "logs-"));
const input = path.join(dir, "access.log");
const output = path.join(dir, "errors.log.gz");

// Create a sample log: 20,000 lines, every 50th is an error
const lines = Array.from({ length: 20_000 }, (_, i) => `${i} ${i % 50 === 0 ? "ERROR" : "INFO"} request handled\n`);
await writeFile(input, lines.join(""));

let leftover = "";
let errors = 0;
const onlyErrors = new Transform({
  transform(chunk: Buffer, _encoding, callback) {
    const text = leftover + chunk.toString("utf8");
    const parts = text.split("\n");
    leftover = parts.pop() ?? "";                        // keep a partial last line for the next chunk
    const kept = parts.filter((line) => line.includes("ERROR"));
    errors += kept.length;
    callback(null, kept.length ? kept.join("\n") + "\n" : "");
  },
  flush(callback) {
    callback(null, leftover.includes("ERROR") ? leftover + "\n" : "");
  },
});

await pipeline(createReadStream(input), onlyErrors, createGzip(), createWriteStream(output));

console.log(`error lines: ${errors}`);
console.log(`input ${(await stat(input)).size} bytes -> output ${(await stat(output)).size < 5000 ? "under 5 KB" : "larger"}`);
await rm(dir, { recursive: true, force: true });
```

**Output:**

```text
error lines: 400
input 529290 bytes -> output under 5 KB
```

Walk through it:

- `createReadStream` reads the file in chunks (64 KB by default); it never loads the whole file.
- The custom **Transform** receives each chunk as a `Buffer`. A chunk boundary can fall in the middle of a line, so the code keeps the incomplete last line in `leftover` and prepends it to the next chunk — a detail every hand-written stream parser must handle. `flush` runs at the end to process whatever is left.
- `createGzip()` is a built-in transform that compresses data.
- `createWriteStream` writes chunks to the output file.
- **`pipeline`** connects the streams and, crucially, **handles errors and clean-up**: if any stream fails (the disk is full, the input is missing), all of them are destroyed and the promise rejects. The older `.pipe()` method does not propagate errors properly and can leak file handles — prefer `pipeline`.
- Memory use stays roughly constant whether the log is 400 KB or 40 GB.

### Level 4 — Backpressure

What if the source produces data faster than the destination can accept it — reading from a fast disk and sending over a slow mobile connection? Without control, chunks would pile up in memory until the process crashed.

Streams solve this with **backpressure**: when a writable stream's internal buffer is full, `write()` returns `false`, and a well-behaved source **pauses** until the writable emits `drain`. `pipeline` (and `.pipe()`) handle backpressure automatically. If you write to streams manually in a loop, you must respect the return value of `write()` — ignoring it is a classic cause of memory blow-ups.

### Level 4 — Streams everywhere

- **HTTP**: `req` is a readable stream (the request body) and `res` is a writable stream, so you can stream a file download with `pipeline(createReadStream(file), res)`, or stream uploads directly to storage ({{ch:file-uploads}}).
- **Async iteration**: readable streams work with `for await...of`, which is often the simplest way to process them line by line (with the `node:readline` module) or chunk by chunk.
- **Web Streams**: Node also supports the browser's standard `ReadableStream` API (used by `fetch` responses), and can convert between the two.

## Using more than one CPU core

A Node process runs your JavaScript on one core. Servers have many. Node offers three tools.

### Level 4 — Worker threads

`node:worker_threads` runs JavaScript on **additional threads** in the same process, each with its own V8 instance and event loop. Use it for **CPU-bound** tasks so the main thread stays responsive:

```ts
import { Worker, isMainThread, parentPort, workerData } from "node:worker_threads";

function fibonacci(n: number): number {
  return n < 2 ? n : fibonacci(n - 1) + fibonacci(n - 2);
}

if (isMainThread) {
  const runInWorker = (n: number) =>
    new Promise<number>((resolve, reject) => {
      const worker = new Worker(new URL(import.meta.url), { workerData: n });
      worker.once("message", resolve);
      worker.once("error", reject);
    });

  let ticks = 0;
  const ticker = setInterval(() => ticks++, 5);           // proves the main thread stays free
  const result = await runInWorker(32);
  clearInterval(ticker);
  console.log(`fib(32) = ${result}; main thread kept running: ${ticks > 0}`);
} else {
  parentPort!.postMessage(fibonacci(workerData as number));
}
```

**Output:**

```text
fib(32) = 2178309; main thread kept running: true
```

- The same file runs in both places: `isMainThread` tells it which role it has.
- The main thread starts a `Worker` from this file, passing the input as `workerData`, and waits for one `message` with the result.
- While the worker computes, the main thread's interval keeps firing — it is not blocked.
- Workers communicate by **messages** (data is copied, or explicitly transferred); they do not share ordinary objects, which avoids data races. (`SharedArrayBuffer` allows shared memory for specialised cases.)
- Starting a worker costs time and memory, so real applications keep a **pool** of workers and send tasks to them (libraries such as Piscina do this).

### Level 4 — Child processes

`node:child_process` starts **separate programs** — another Node script, or any command such as an image tool or a Python script:

```ts
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const { stdout } = await execFileAsync(process.execPath, ["-e", "console.log(6 * 7)"]);
console.log(`child said: ${stdout.trim()}`);
```

**Output:**

```text
child said: 42
```

- `execFile(program, args)` runs a program **directly** with an array of arguments; `process.execPath` is the path of the Node binary itself, so this runs `node -e "console.log(6 * 7)"`.
- `promisify` turns the callback-based function into one that returns a promise.
- **Security:** prefer `execFile` or `spawn` with an argument array over `exec`, which passes a single string to a **shell**. If user input is put into that string, an attacker can add `; rm -rf /` — **command injection** ({{ch:application-security}}).

### Level 4 — Multiple processes: cluster and process managers

To use every core for an HTTP server, run **several Node processes**, each with its own event loop, and spread requests among them. Node's `node:cluster` module does this inside one program (a primary process forks workers that share the listening port). In modern deployments, it is more common to run one process per container and let the **platform** run several copies behind a load balancer ({{ch:docker}}, {{ch:elb}}, {{ch:ecs}}) — or to use a process manager such as PM2 on a plain server. Because each process has its own memory, anything shared between requests — sessions, caches, rate-limit counters — must live in an external store such as Redis ({{ch:redis}}).

## Errors, crashes and graceful shutdown

### Level 3 — Asynchronous errors

The error-handling rules from {{ch:errors-and-debugging}} apply, with server-specific consequences:

- With `async`/`await`, use `try/catch`; a rejected promise that nobody handles is an **unhandled rejection**. In current Node versions, an unhandled rejection **crashes the process** by default.
- An `error` event without a listener crashes the process.
- An exception thrown in a callback (outside any `try`) is an **uncaught exception**, which also crashes the process.

### Level 4 — Crash, then restart

It sounds alarming, but for a server, **crashing on an unexpected error is often correct**. After an unknown error, the process may be in a corrupted state — a half-finished operation, a leaked connection. The robust pattern is:

1. Handle **expected** errors properly where they occur (validation failures, "not found", a downstream service timing out) and respond to the client ({{ch:error-handling}}).
2. Log **unexpected** errors with full detail ({{ch:logging}}), then let the process exit.
3. Let a **supervisor** — the container platform, systemd or PM2 — restart it automatically, while other instances keep serving.

```ts
// fragment
process.on("uncaughtException", (error) => {
  logger.fatal({ err: error }, "uncaught exception — shutting down");
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  logger.fatal({ reason }, "unhandled promise rejection — shutting down");
  process.exit(1);
});
```

These handlers exist to **log** before exiting — not to keep running as if nothing happened.

### Level 4 — Graceful shutdown

When a server is deployed or scaled down, the platform sends it a **signal** — usually `SIGTERM` — asking it to stop. A well-behaved server finishes what it is doing instead of cutting off customers mid-request:

```ts
import { createServer } from "node:http";

const server = createServer((_req, res) => {
  setTimeout(() => res.end("order placed"), 50); // a request that takes a moment
});

function shutdown(signal: string): void {
  console.log(`${signal} received: stop accepting new connections`);
  server.close(() => {
    console.log("all in-flight requests finished; closing database pool, then exiting");
    // await db.end(); await queue.close(); ...
  });
  setTimeout(() => process.exit(1), 10_000).unref(); // force exit if something hangs
}

process.once("SIGTERM", () => shutdown("SIGTERM"));

server.listen(0, async () => {
  const { port } = server.address() as { port: number };
  const inFlight = fetch(`http://localhost:${port}/`).then((r) => r.text());
  setTimeout(() => process.emit("SIGTERM"), 10);  // simulate the platform asking us to stop
  console.log(`client received: ${await inFlight}`);
});
```

**Output:**

```text
SIGTERM received: stop accepting new connections
client received: order placed
all in-flight requests finished; closing database pool, then exiting
```

- `server.close(callback)` stops accepting **new** connections and calls the callback once existing ones finish. The in-flight request completes successfully even though shutdown began while it was running.
- After that, close database pools, queue connections and other resources, then exit.
- A safety timer forces exit if something never finishes; `.unref()` means the timer itself does not keep the process alive.
- `process.emit("SIGTERM")` simulates the signal for this demonstration; in production, the operating system or container platform sends it ({{ch:docker}}).
- Load balancers usually stop sending traffic to an instance before or as it receives `SIGTERM`; health-check endpoints that start failing during shutdown help them notice ({{ch:elb}}).

## Debugging and profiling

- **The inspector**: run `node --inspect app.js` (or `--inspect-brk` to pause on the first line), then open `chrome://inspect` in Chrome, or use your editor's debugger (VS Code's JavaScript debugger supports Node directly). Set breakpoints, step through code, inspect variables — the same tools as in the browser ({{ch:browser-and-dom}}).
- **CPU profiling**: record a CPU profile in the inspector, or run `node --cpu-prof app.js`, then view it as a flame graph to find functions consuming CPU.
- **Memory**: take heap snapshots in the inspector and compare them over time to find leaks — objects that keep growing (caches without limits, listeners never removed, arrays used as queues that are never emptied).
- **Event-loop delay**: `perf_hooks.monitorEventLoopDelay()` measures how long callbacks wait; rising delay means something is blocking the loop. Production monitoring should track it ({{ch:monitoring}}).
- **Common symptoms**: a server that is slow for everyone at once → blocking code; memory that grows until the process is killed → a leak; "EADDRINUSE" → another process already uses the port; "ECONNREFUSED" → the service you are calling is not running or not reachable; a process that will not exit → open handles (timers, sockets, database pools) still active.

## Security

- **Keep Node updated** to a supported LTS version; security releases are frequent.
- **Dependencies are your biggest attack surface.** A typical project has hundreds of transitive packages. Use `npm audit`, Dependabot ({{ch:github}}), lockfiles, and caution with new or unpopular packages; malicious packages that steal environment variables or credentials do appear on public registries ({{ch:modules-and-npm}}).
- **Validate all input** from requests, files and environment variables ({{ch:validation}}).
- **Path traversal**: when serving or saving files based on user input, resolve the path and verify it stays inside the intended directory:

```ts
import path from "node:path";

const UPLOAD_ROOT = path.resolve("uploads");

function safeUploadPath(userFileName: string): string {
  const target = path.resolve(UPLOAD_ROOT, userFileName);
  if (!target.startsWith(UPLOAD_ROOT + path.sep)) {
    throw new Error("Invalid file path");
  }
  return target;
}

console.log(path.basename(safeUploadPath("invoice-77.pdf")));
try {
  safeUploadPath("../../etc/passwd");
} catch (error) {
  console.log((error as Error).message);
}
```

**Output:**

```text
invoice-77.pdf
Invalid file path
```

  `path.resolve` turns the user's name into an absolute path, resolving any `..`; if the result is not inside `UPLOAD_ROOT`, it is rejected. Better still, do not use user-supplied names as file names at all — generate your own (for example, a random id) and store the original name separately ({{ch:file-uploads}}).
- **Command injection**: use `execFile`/`spawn` with argument arrays, never shell strings containing user input.
- **Denial of service through the event loop**: limit request body sizes, avoid regular expressions that can backtrack catastrophically on crafted input, and never do unbounded CPU work per request.
- **Secrets** come from the environment or a secrets manager, never from code; do not log them.
- **The permission model**: recent Node versions offer `--permission` with flags such as `--allow-fs-read` to restrict what a process may access — useful defence in depth for scripts and tools that handle untrusted input.

## Performance

- **Never block the event loop**; use async APIs; move CPU work to worker threads or other services.
- **Stream large data** instead of buffering it.
- **Reuse connections**: database connection pools ({{ch:postgresql}}), keep-alive for outgoing HTTP.
- **Run several processes** to use all cores, behind a load balancer.
- **Cache** expensive results ({{ch:caching}}).
- **Measure** with profiles and event-loop delay metrics before optimising.

## From beginner to enterprise

**Level 3 — scripts and small servers.** Async file operations, `node:path`, environment variables, a tiny `node:http` server, the built-in test runner.

**Level 4 — application servers.** A framework on top of `node:http` ({{ch:express}}); validated configuration; streams for large files; structured logging; graceful shutdown; worker threads for occasional CPU work.

**Level 5 — production services.** Pinned LTS versions; one process per container with health checks; event-loop delay and memory monitoring; dependency scanning; crash-and-restart supervision; profiling as a routine skill.

**Level 6 — large systems.** Many Node services behind gateways ({{ch:api-gateway}}); CPU-heavy work in dedicated services or other languages; queues for background work ({{ch:queues}}); serverless functions for spiky workloads ({{ch:lambda}}); organisation-wide standards for runtime versions, base images and security patches.

## Real-world use cases

### An API for a delivery app

- **Workload:** thousands of concurrent requests, each mostly waiting on a database and a maps API.
- **Why Node fits:** I/O-bound and highly concurrent; JSON everywhere; shared TypeScript types with the React Native app.
- **Design:** a framework-based HTTP server, connection pooling, several processes per server or containers behind a load balancer, graceful shutdown for zero-downtime deployments.

### Generating invoices as PDFs

- **Problem:** generating a PDF takes 200 ms of CPU; doing it inside the request handler made the API slow for everyone during month-end, when thousands were generated.
- **Fix:** move generation to a background job processed by separate worker processes ({{ch:queues}}), or to a worker-thread pool; the API responds immediately with "your invoice is being prepared".

### Processing a large data export

- **Requirement:** import a 3 GB CSV of stock levels nightly.
- **Approach:** stream the file, parse line by line, insert in batches of 1,000 rows, with `pipeline` handling errors and backpressure; memory stays small and the import can run on a modest machine ({{ch:cron-jobs}}).

## Common mistakes

### Beginner: synchronous I/O in request handlers

`readFileSync` in a route freezes every request while the disk works. **Fix:** `fs/promises`; synchronous APIs only at start-up.

### Beginner: building paths with string concatenation

**Fix:** `path.join`/`path.resolve`, and containment checks for user input.

### Beginner: forgetting `res.end()` or `await`

The client hangs; errors go unhandled. **Fix:** always finish responses; await promises; enable the floating-promises lint rule.

### Intermediate: CPU-heavy work on the main thread

Hashing, image resizing, huge JSON processing in handlers. **Fix:** worker threads, background jobs or specialised services.

### Intermediate: loading large files into memory

**Fix:** streams and `pipeline`.

### Intermediate: ignoring `error` events

An unhandled stream or socket error crashes the process. **Fix:** `pipeline`, or `error` listeners.

### Production: no graceful shutdown

Every deployment cuts off in-flight requests. **Fix:** handle `SIGTERM`, `server.close()`, close resources.

### Production: in-memory state with several processes

Sessions or rate limits stored in a variable work on one process and break with two. **Fix:** external stores (Redis).

## How a senior engineer thinks about this

- **Protect the event loop.** For every new piece of code, they ask: is this I/O (fine) or CPU (needs care)? How does its cost grow with input size?
- **Stream by default for anything large.** Memory should not depend on data size.
- **Fail fast, restart cleanly.** Validate configuration at start-up, crash on unknown errors, let supervisors restart, shut down gracefully.
- **Use the right tool.** Node for I/O-heavy services and full-stack TypeScript; workers, queues or other languages for heavy computation.
- **Dependencies are a supply chain.** Few, well-maintained, audited and updated.
- **Measure in production.** Event-loop delay, memory, CPU and latency tell them what is really happening.

## Exercises

### Exercise 1 — Count words in a large file

**Objective:** practise streams and line splitting.
**What to build:** a function that reads a text file with a stream, line by line (using `node:readline`), and returns the 3 most common words (lower-cased, letters only). Test it on a temporary file you create.

<details>
<summary>Show the solution</summary>

```ts
import { createReadStream } from "node:fs";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { createInterface } from "node:readline";
import { tmpdir } from "node:os";
import path from "node:path";

async function topWords(file: string, count: number): Promise<[string, number][]> {
  const counts = new Map<string, number>();
  const lines = createInterface({ input: createReadStream(file, "utf8"), crlfDelay: Infinity });
  for await (const line of lines) {
    for (const word of line.toLowerCase().match(/[a-z]+/g) ?? []) {
      counts.set(word, (counts.get(word) ?? 0) + 1);
    }
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, count);
}

const dir = await mkdtemp(path.join(tmpdir(), "words-"));
const file = path.join(dir, "reviews.txt");
await writeFile(file, "Sweet mangoes, very sweet!\nMangoes arrived fresh.\nFresh, sweet and fast delivery.\n");
console.log(await topWords(file, 3));
await rm(dir, { recursive: true, force: true });
```

**Output:**

```text
[ [ 'sweet', 3 ], [ 'fresh', 2 ], [ 'mangoes', 2 ] ]
```

**Walkthrough:** `readline.createInterface` turns a byte stream into a stream of lines, handling chunk boundaries for you (`crlfDelay: Infinity` treats Windows line endings `\r\n` as one break). `for await` processes one line at a time, so memory depends only on the number of distinct words, not on file size. The regular expression extracts words; a `Map` counts them; ties are broken alphabetically so the output is deterministic.

</details>

### Exercise 2 — Find the blocking code

**Objective:** practise recognising event-loop blocking.
**What to do:** for each handler, say whether it blocks the event loop, and how to fix it: (1) `const data = fs.readFileSync("big.json")` per request; (2) `await db.query(...)`; (3) `bcrypt.hashSync(password, 12)` at sign-up; (4) `JSON.parse` of a 200 MB upload; (5) `await fetch(paymentApi)`; (6) a `for` loop summing 10 million numbers.

<details>
<summary>Show the solution</summary>

1. **Blocks** — synchronous file I/O. Use `await readFile(...)`, or better, load it once at start-up and cache it.
2. **Does not block** — the database driver performs asynchronous network I/O.
3. **Blocks** — password hashing is deliberately CPU-expensive. Use the **async** version (`await bcrypt.hash(...)`), which runs on libuv's thread pool, or `crypto.scrypt` asynchronously ({{ch:authentication}}).
4. **Blocks** — parsing a huge JSON string is CPU work on the main thread, and buffering 200 MB per request risks memory exhaustion. Limit body sizes; stream-parse very large inputs; or process uploads in a background job.
5. **Does not block** — network I/O. (But set a timeout so it cannot hang forever.)
6. **Blocks** for as long as it runs (tens of milliseconds); move such work to a worker thread, precompute it, or push it to the database.

</details>

### Exercise 3 — Debug the leak

**Objective:** practise diagnosing memory problems.
**The scenario:** a Node API's memory grows steadily until the container is killed every few hours. A heap snapshot comparison shows millions of entries in a `Map` and many `EventEmitter` listeners. The code includes:

```ts
// fragment
const cache = new Map<string, unknown>();
export async function getProduct(id: string) {
  if (!cache.has(id)) cache.set(id, await db.product.find(id));
  return cache.get(id);
}

export function subscribeToStock(res: ServerResponse) {
  stockEvents.on("change", (event) => res.write(JSON.stringify(event)));
}
```

<details>
<summary>Show the solution</summary>

1. **Unbounded cache:** every product id ever requested (including invalid ids from bots) stays in the `Map` forever. Fix: a cache with a maximum size and expiry (an LRU cache — {{ch:caching}}), or an external cache such as Redis; never cache "not found" results without a limit.
2. **Listeners never removed:** each subscription adds a listener to a long-lived emitter, and nothing removes it when the client disconnects. The listener keeps `res` (and everything it references) alive. Fix:

```ts
// fragment
export function subscribeToStock(req: IncomingMessage, res: ServerResponse) {
  const onChange = (event: unknown) => res.write(`data: ${JSON.stringify(event)}\n\n`);
  stockEvents.on("change", onChange);
  req.on("close", () => stockEvents.off("change", onChange));
}
```

**How to confirm:** take heap snapshots a few minutes apart under load and compare object counts; watch `emitter.listenerCount("change")` in a metric; Node's "MaxListenersExceededWarning" was likely in the logs.

</details>

### Exercise 4 — Production scenario: zero-downtime deployments

**Objective:** practise production lifecycle thinking.
**The scenario:** every time your team deploys the Node API (running as several containers behind a load balancer), customers see a burst of errors for about 30 seconds, and some orders are recorded twice. What would you check and change?

<details>
<summary>Show the solution</summary>

1. **Graceful shutdown:** handle `SIGTERM`: stop accepting connections (`server.close()`), finish in-flight requests, close database pools and queue connections, then exit; force-exit after a timeout shorter than the platform's kill timeout.
2. **Readiness and health checks:** new containers should report "ready" only after connecting to the database and warming up; old ones should start failing readiness when shutdown begins, so the load balancer stops sending them traffic before they exit ({{ch:elb}}).
3. **Keep-alive connections:** the load balancer may hold idle connections to the old instance; ensure the server closes idle keep-alive connections during shutdown (`server.closeIdleConnections()` in current Node) and that timeouts are aligned with the load balancer's.
4. **Rolling deployment:** replace instances gradually, never all at once ({{ch:cicd}}).
5. **Duplicate orders:** requests cut off mid-way are retried by clients or the load balancer; make order creation **idempotent** with an idempotency key ({{ch:rest-apis}}) and database constraints, so retries cannot create duplicates.
6. **Verify:** run a load test during a deployment in staging and confirm zero errors.

</details>

## Summary

Node.js is a JavaScript runtime combining the **V8** engine with **libuv**, which provides the **event loop**, asynchronous OS I/O and a thread pool. Your JavaScript runs on **one main thread**; I/O happens in the background and its callbacks are queued. This makes Node excellent for **I/O-bound, highly concurrent** work and poor for CPU-heavy work on the main thread — so the first rule is **never block the event loop**. The loop runs in phases (timers, poll, check, close), with `process.nextTick` and promise microtasks running between callbacks.

Use LTS versions, pinned per project; ES modules with `node:` imports; and Node's built-in tools: `--watch`, `--env-file`, TypeScript stripping and the test runner. Work with files through `fs/promises` and `node:path`, binary data through `Buffer`, configuration through validated environment variables, and events through typed `EventEmitter`s (always handling `error`). Every Node web framework is built on `node:http`. Process large data with **streams** connected by **`pipeline`**, which handles errors and **backpressure**. Use **worker threads** for CPU work, **child processes** (with argument arrays, never shell strings) for external programs, and **multiple processes** behind a load balancer for multiple cores, with shared state in external stores.

Handle expected errors where they occur, log and exit on unexpected ones, let supervisors restart processes, and **shut down gracefully** on `SIGTERM`. Debug with the inspector, profile CPU and memory, monitor event-loop delay, and secure Node by updating it, auditing dependencies, validating input, preventing path traversal and command injection, and keeping secrets out of code.

## Key terms

- **Node.js** — A JavaScript runtime that executes JavaScript outside the browser using V8 and libuv.
- **Runtime** — The environment that executes code and provides capabilities beyond the language itself.
- **V8** — Google's JavaScript engine, used in Chrome and Node.js.
- **libuv** — The C library that gives Node.js its event loop, asynchronous I/O and thread pool.
- **Thread pool** — A set of background threads libuv uses for operations without good asynchronous OS support, such as file access.
- **I/O-bound** — Describing work that spends most of its time waiting for input/output rather than computing.
- **CPU-bound** — Describing work limited by the speed of computation rather than by waiting.
- **Blocking the event loop** — Running long synchronous work on the main thread, which prevents all other callbacks from running.
- **Event loop phase** — One stage of Node's event loop, such as timers, poll or check, each with its own queue.
- **process.nextTick** — A Node function that schedules a callback to run immediately after the current operation, before promise callbacks.
- **setImmediate** — A Node function that schedules a callback for the check phase of the event loop.
- **LTS (Long-Term Support)** — A release line that receives fixes for an extended period and is recommended for production.
- **ES modules / CommonJS** — JavaScript's standard module system (`import`/`export`) and Node's original one (`require`/`module.exports`).
- **Buffer** — Node's representation of raw binary data as a sequence of bytes.
- **Environment variable** — A named configuration value supplied to a process by its environment.
- **EventEmitter** — A Node class that lets objects emit named events and register listeners for them.
- **Stream** — An abstraction for processing data piece by piece as it flows from a source to a destination.
- **Readable / writable / transform stream** — Streams that produce data, consume data, or modify data as it passes through.
- **pipeline** — A Node function that connects streams and handles errors, clean-up and backpressure.
- **Backpressure** — The mechanism by which a slow consumer signals a fast producer to pause, preventing memory overload.
- **Worker thread** — An additional JavaScript thread in a Node process, used for CPU-intensive tasks.
- **Child process** — A separate program started and controlled by a Node process.
- **Command injection** — An attack in which user input is executed as part of a shell command.
- **Path traversal** — An attack that uses sequences such as `../` in file names to access files outside an intended directory.
- **Unhandled rejection** — A rejected promise that no code handles, which crashes current Node processes by default.
- **Signal (SIGTERM)** — A message from the operating system to a process; SIGTERM asks the process to terminate.
- **Graceful shutdown** — Stopping a server by refusing new work, finishing in-flight work and releasing resources before exiting.
- **Event-loop delay** — How long callbacks wait to run, a key measure of whether a Node process is overloaded or blocked.

## What comes next

You have built an HTTP server with Node's core module and seen how much work it leaves to you: routing, parsing request bodies, validation, error handling, middleware. The next chapter, {{ch:express}}, introduces Express — the most widely used Node.js web framework — and shows how it organises servers into routes and middleware, and how to build a complete, well-structured API with it.
