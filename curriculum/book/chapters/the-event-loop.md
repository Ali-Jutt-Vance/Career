# The Event Loop: How JavaScript Does Many Things at Once

> [!GOALS]
> - How a single-threaded language can serve thousands of users at the same time.
> - The parts of the machinery: the call stack, the runtime's background workers, the task queue, the microtask queue and the event loop itself.
> - The exact rules that decide the order in which callbacks run — and how to predict tricky orderings with confidence.
> - The phases of Node.js's event loop, `setImmediate` and `process.nextTick`.
> - What "blocking the event loop" means, why it is the most damaging performance mistake in Node.js, and how to detect it.
> - The ways to keep the event loop healthy: splitting work, worker threads, more processes, and background queues.
> - How the browser's event loop relates to page rendering and frozen pages.

## Why this matters

In {{ch:asynchronous-javascript}} you learned to write code that waits without blocking. But some puzzles remained:

- JavaScript runs on **one thread** — one path of execution, doing one thing at a time. How, then, can a single Node.js process serve thousands of users at once?
- Why did a promise callback run **before** a zero-millisecond timer?
- Why can one slow loop — or even one badly written regular expression — freeze an entire server for **every** user, even when all the code is "asynchronous"?

The answers all come from one mechanism: the **event loop**. Understanding it is what separates developers who use Node.js from developers who can run it reliably in production. It is also one of the most common topics in backend interviews — "Explain the event loop" appears in a large share of Node.js interviews — precisely because it reveals whether someone understands how their code actually executes.

## The simple idea

Imagine a restaurant with **one waiter** but a large kitchen staff.

- The waiter takes an order and hands it to the kitchen. The waiter does **not** cook.
- While the kitchen cooks, the waiter takes more orders, clears tables, brings water.
- When a dish is ready, the kitchen puts it on the **pass** — the counter between kitchen and dining room — with a ticket.
- Whenever the waiter has finished what they are doing, they check the pass, take the next ready dish, and deliver it.

```text
      DINING ROOM                       KITCHEN
   +----------------+            +--------------------+
   |  ONE WAITER    |  orders -> |  many cooks work   |
   |  (does one     |            |  in the background |
   |  thing at a    |  <- ready  |                    |
   |  time)         |   dishes   +--------------------+
   +----------------+       \           |
          ^                  \          v
          |                   +-> [ the PASS: dishes waiting, in order ]
          +--- "when I'm free, I take the next dish from the pass"
```

That is exactly how JavaScript works:

- **The waiter** is the JavaScript thread, running your code one piece at a time.
- **The kitchen** is the runtime and operating system: the disk, the network, timers — working in the background.
- **The pass** is a **queue** of callbacks whose work is finished and which are waiting to run.
- **"When I'm free, I take the next dish"** is the **event loop**.

> [!ANALOGY]
> One fast waiter can serve a whole restaurant, because cooking happens elsewhere and the waiter never stands idle waiting for food.
>
> **Where the analogy breaks — and this is the important part:** if a customer asks the waiter to personally carve a whole roast at the table for twenty minutes, **nobody else gets served for twenty minutes**. The kitchen being busy is fine; the *waiter* being busy stops everything. In JavaScript, any long calculation in your own code is the waiter carving a roast. That is "blocking the event loop", and it is the main subject of the second half of this chapter.

## The proper definition and key words

- **Single-threaded** — JavaScript code runs on one main thread, so only one piece of your JavaScript runs at any instant.
- **Call stack** — the stack of functions currently running ({{ch:functions}}). When it is empty, no JavaScript is running.
- **Runtime APIs** — the extra abilities the runtime provides ({{ch:from-code-to-running-program}}), such as timers, file access and networking. Their slow work happens **outside** the JavaScript thread.
- **Task** (also called a **macrotask**) — a callback waiting to run because something finished: a timer fired, a file was read, a network response arrived, a user clicked.
- **Task queue** — the line of tasks waiting their turn.
- **Microtask** — a smaller, higher-priority callback, mainly promise reactions (`then`, `catch`, `finally`, and code after `await`).
- **Microtask queue** — the line of microtasks waiting their turn.
- **Event loop** — the mechanism that repeatedly takes waiting callbacks from the queues and runs them, whenever the call stack is empty.
- **Blocking the event loop** — running JavaScript for so long that no other callbacks can run.

## The machinery

### Level 2 — The parts

Here is the whole picture. Read it slowly; each part is explained underneath.

```text
  +-----------------------------+        +--------------------------------+
  |        CALL STACK           |        |   RUNTIME (background work)    |
  |   your JavaScript runs      | -----> |   timers, file system, network,|
  |   here, one frame at a time |  start |   DNS, crypto...               |
  +-----------------------------+  slow  |   (operating system & a pool   |
              ^                     work  |    of helper threads)          |
              |                          +--------------------------------+
              |                                  |  when work finishes,
              |                                  |  its callback is queued
              |                                  v
              |        +------------------------------------------------+
              |        |  MICROTASK QUEUE   [then] [await cont.] [...]  |  <- emptied FIRST
              |        +------------------------------------------------+
              |        +------------------------------------------------+
              |        |  TASK QUEUE        [timer] [file read] [click] |  <- one at a time
              |        +------------------------------------------------+
              |                                  |
              +------------- EVENT LOOP ---------+
                    "when the call stack is empty:
                     run ALL microtasks, then ONE task, repeat"
```

**The call stack.** Your code runs here. A function call pushes a frame; a return pops it. JavaScript can only run what is on the stack, and it runs it to completion — it never pauses one function halfway to run another (except at an `await`, which ends the current piece of work).

**The runtime.** When your code calls `setTimeout`, `readFile` or `fetch`, the request is handed to the runtime, which does the slow part **outside the JavaScript thread** — the operating system waits for the timer, the disk or the network. Your JavaScript carries on immediately. In Node.js, this part is handled by a library called **libuv**, which uses the operating system's own efficient waiting mechanisms, plus a small pool of helper threads for some work (more on that later). In browsers, the browser provides these **Web APIs**.

**The queues.** When background work finishes, its callback is **not** run immediately — your code might be in the middle of something. Instead, the callback is placed in a **queue** to wait its turn. There are two important queues:

- the **task queue** for timers, I/O completions (I/O means input/output — files and network), and user events;
- the **microtask queue** for promise reactions.

**The event loop.** A simple, endless loop with one rule:

> **Whenever the call stack is empty: run every microtask in the microtask queue (including any new ones added while doing so). Then take ONE task from the task queue and run it. Then repeat.**

### Level 3 — Run-to-completion

One consequence of this design is so important that it has a name: **run-to-completion**. Once a piece of JavaScript starts — the main script, or a callback taken from a queue — it runs **until the call stack is empty**. Nothing can interrupt it. No other callback can run in the middle of it, however long it takes.

This is a blessing and a curse:

- **Blessing:** you never have to worry about another callback changing your variables halfway through a function. Two lines in a row really do run one after the other with nothing in between. (This is why the `mapWithConcurrency` workers in {{ch:asynchronous-javascript}} could safely share a counter.) Many of the hardest bugs in other languages — two threads changing the same data at the same instant ({{ch:what-a-computer-is}}) — simply cannot happen within one JavaScript thread.
- **Curse:** a long-running piece of code holds the thread for its whole duration, and **everything else waits** — every timer, every network response, every other user's request.

> [!NOTE]
> Run-to-completion does **not** mean asynchronous JavaScript is free of ordering bugs. Between one `await` and the next, other callbacks can run and change shared data. Two requests that both "read the stock, then save stock minus one" can still interleave across their `await`s and sell the same last item twice. The thread is never interrupted *mid-statement*, but logical operations that span several `await`s can still overlap. You will meet the proper solutions — database transactions and locks — in {{ch:transactions}}.

## Tracing the event loop step by step

Now the rule can explain any ordering. Here is the puzzle from {{ch:asynchronous-javascript}}:

```js
console.log("1");
setTimeout(() => console.log("2"), 0);
Promise.resolve().then(() => console.log("3"));
(async () => {
  console.log("4");
  await null;
  console.log("5");
})();
console.log("6");
```

**Output:**

```text
1
4
6
3
5
2
```

Let us trace it exactly as the engine does:

```text
  STEP  WHAT RUNS                                  MICROTASKS       TASKS
  ----  -----------------------------------------  ---------------  -------------
   1    main script: log "1"                       -                -
   2    setTimeout(..., 0): runtime starts timer   -                (timer soon)
   3    Promise.resolve().then(log 3)              [log 3]          [log 2]*
   4    async fn: log "4", reaches await null      [log 3, rest]    [log 2]
        -> the rest of the function is queued
   5    log "6"; main script ends; stack empty     [log 3, rest]    [log 2]
   6    event loop: run ALL microtasks:
          log "3"                                  [rest]           [log 2]
          rest of async fn: log "5"                -                [log 2]
   7    event loop: run ONE task: log "2"          -                -
```

\* The timer's callback is placed in the task queue once its (zero) delay has passed.

Walkthrough of the key moments:

- **Steps 1–5:** the whole main script runs first, to completion. Synchronous code always finishes before any queued callback runs — that is why `1`, `4` and `6` come first.
- **Step 3:** `Promise.resolve()` is already fulfilled, so its `then` callback goes straight into the **microtask** queue.
- **Step 4:** the async function runs synchronously **until its first `await`** — so `4` prints immediately. At `await null`, the function pauses, and "the rest of the function" is queued as a microtask (awaiting a value that is already available still yields to the queue).
- **Step 6:** the stack is empty, so the event loop **empties the microtask queue completely**: `3`, then `5`.
- **Step 7:** only then does it take **one** task: the timer, printing `2`.

The two rules that explain almost every ordering puzzle:

1. **Synchronous code runs first, to completion.**
2. **After that, all microtasks run before the next task.** Promise reactions always beat timers, I/O callbacks and events that are waiting.

### Microtasks can starve tasks

Because the event loop runs microtasks **until the microtask queue is empty** — including microtasks added while it is running them — an endless chain of microtasks would prevent tasks from ever running:

```js
let count = 0;

function scheduleForever() {
  count++;
  Promise.resolve().then(scheduleForever);   // each microtask schedules another
}

setTimeout(() => console.log("Timer finally ran"), 0);
// scheduleForever();   // uncommenting this would freeze the program: the timer never runs
```

If `scheduleForever()` were called, each microtask would add another microtask, the queue would never empty, and the timer would **never** run. This is called **starvation**. In practice, you rarely write this deliberately, but long chains of promise work that never yields can have a similar, milder effect.

## Node.js's event loop in more detail

### Level 4 — The phases

Browsers and Node.js both follow the model above, but Node.js organises its task queue into several **phases**, run in a fixed order on each turn (each turn is called a **tick** of the event loop):

```text
   +-----------------+
   |     timers      |  callbacks of setTimeout / setInterval whose time has come
   +--------+--------+
            |
   +--------v--------+
   | pending callbacks|  some system-level callbacks deferred from the previous turn
   +--------+--------+
            |
   +--------v--------+
   |      poll       |  wait for and run I/O callbacks: files, network, etc.
   +--------+--------+
            |
   +--------v--------+
   |      check      |  setImmediate callbacks
   +--------+--------+
            |
   +--------v--------+
   | close callbacks |  e.g. a socket's "close" event
   +--------+--------+
            |
            +------> back to timers (if anything is still pending)

   Between EVERY callback: process.nextTick queue, then the promise microtask queue.
```

You do not need to memorise every phase. The practical points are:

- **Timers** run in their own phase. A `setTimeout(fn, 100)` callback runs **no earlier** than 100 milliseconds — but possibly **later**, if the thread is busy. A timer's delay is a **minimum**, not a promise.
- **I/O callbacks** — a file has been read, a network response has arrived — run in the **poll** phase. When there is nothing else to do, Node.js waits here efficiently, using almost no CPU, until the operating system reports that some I/O is ready.
- **`setImmediate(fn)`** schedules `fn` for the **check** phase, which comes right after poll. Inside an I/O callback, `setImmediate` always runs before a `setTimeout(fn, 0)`.
- **Microtasks run between every single callback**, in every phase.
- When there are **no** pending timers, I/O operations or other handles, the loop has nothing left to wait for, and **the Node.js process exits**. This is why a script ends by itself after its last asynchronous operation finishes — and why a forgotten `setInterval` or open server keeps a process alive.

### `process.nextTick` and `queueMicrotask`

Node.js has one more queue with even higher priority than promises: **`process.nextTick(fn)`** schedules `fn` to run **as soon as the current operation finishes**, before promise microtasks.

```js
setTimeout(() => console.log("timeout"), 0);
setImmediate(() => console.log("immediate"));
Promise.resolve().then(() => console.log("promise"));
process.nextTick(() => console.log("nextTick"));
console.log("synchronous");
```

**Output:**

```text
synchronous
nextTick
promise
timeout
immediate
```

- `synchronous` — the main script first.
- `nextTick` — the `process.nextTick` queue is emptied before promise microtasks.
- `promise` — then the promise microtasks.
- `timeout` then `immediate` — then the event loop's phases. (When scheduled from the main script, as here, the order of `timeout` and `immediate` is **not guaranteed** — it depends on how quickly the loop starts relative to the timer. It is guaranteed only inside an I/O callback, where `immediate` comes first. Never write code that depends on this order.)

`queueMicrotask(fn)` is the standard, cross-platform way to schedule a microtask directly, with the same priority as promise reactions.

> [!TIP]
> In application code, you will rarely need `process.nextTick` or `setImmediate`. They matter mainly to library authors and in a few specific patterns (one of which — splitting up long work — appears below). What you **do** need is the two big rules: synchronous first, then microtasks, then tasks. Those explain the behaviour of real code; the finer details explain interview puzzles.

## Blocking the event loop

### Level 5 — The most important consequence

You now know that **only one callback runs at a time**, and that it runs **to completion**. So consider a Node.js server handling many users. Every incoming request is a callback. If one request's handler does something that takes two seconds of pure computation, then for those two seconds:

- no other request can be handled — not even the simplest one;
- no database response can be processed, even though the data has arrived;
- no timer can fire;
- the server appears **completely frozen** to every user.

```text
  time ---->
  request A: [===== 2 seconds of CPU work in JavaScript =====]
  request B:   (arrives)  ......waiting.........................[handled]
  request C:       (arrives) ...waiting.........................[handled]
  DB reply:  (arrives)  ........waiting.........................[processed]
```

This is called **blocking the event loop**, and it is the single most damaging performance mistake in Node.js applications. Asynchronous code helps only with **waiting**. It does nothing for **computing**: while your JavaScript is calculating, the waiter is carving the roast.

You can see it directly:

```js
setTimeout(() => console.log("Timer: I wanted to run after 10 ms"), 10);

const start = Date.now();
let total = 0;
for (let i = 0; i < 3_000_000_000; i++) {
  total += i;
}
console.log(`Loop finished after ${Date.now() - start} ms`);
```

**Output (timing varies by computer):**

```text
Loop finished after 2731 ms
Timer: I wanted to run after 10 ms
```

The timer was due after 10 milliseconds, but it could not run until the loop — a single, synchronous piece of code — finished, nearly three seconds later. (`Date.now()` returns the current time in milliseconds, so subtracting the start time measures the duration.)

### What blocks the event loop in real applications

Obvious loops are only one cause. In real Node.js services, the usual culprits are less visible:

| Culprit | Why it blocks |
|---|---|
| **Heavy computation** — image resizing, PDF generation, complex reports, large sorts | Pure CPU work in JavaScript |
| **Synchronous APIs** — `readFileSync`, `writeFileSync`, `execSync`, synchronous crypto functions | They wait for the disk or OS on the main thread |
| **Huge `JSON.parse` / `JSON.stringify`** | Parsing or serialising tens of megabytes is CPU work done in one go |
| **Nested loops over growing data** ({{ch:loops}}) | Work grows with the square of the input |
| **Catastrophic regular expressions** | Certain patterns take exponential time on certain inputs (explained below) |
| **Password hashing done synchronously** | Hashing is deliberately slow, by design |

### A security angle: ReDoS

**Regular expressions** (often shortened to **regex**) are a compact language for matching patterns in text — for example, checking whether a string looks like an email address. You will meet them properly in later chapters; what matters here is that some badly written patterns, given certain inputs, take **exponentially** long to fail a match, because the regex engine tries an enormous number of possibilities. One such check can block the event loop for seconds or minutes.

Attackers exploit this deliberately by sending crafted input to a server that validates it with a vulnerable pattern. A single request can freeze the whole service for everyone. This attack is called **ReDoS** (Regular Expression Denial of Service), and it has affected real, widely used websites and libraries. The defences: avoid nested repetition in patterns, limit input lengths before matching, use well-tested validation libraries ({{ch:validation}}), and run security tools that detect dangerous patterns.

### Detecting a blocked event loop

The key measurement is **event loop delay** (or **event loop lag**): how late scheduled callbacks run compared with when they should have. A healthy Node.js service has a delay of a few milliseconds. Hundreds of milliseconds mean something is blocking.

Node.js can measure it for you:

```js
import { monitorEventLoopDelay } from "node:perf_hooks";

const histogram = monitorEventLoopDelay({ resolution: 20 });
histogram.enable();

setTimeout(() => {
  const start = Date.now();
  while (Date.now() - start < 500) {}   // block for half a second
}, 100);

setTimeout(() => {
  histogram.disable();
  console.log(`max delay: ${(histogram.max / 1e6).toFixed(0)} ms`);
  console.log(`99th percentile: ${(histogram.percentile(99) / 1e6).toFixed(0)} ms`);
}, 1500);
```

**Output (approximately):**

```text
max delay: 501 ms
99th percentile: 501 ms
```

- `monitorEventLoopDelay` samples the event loop every 20 milliseconds and records how late each sample was.
- The second timer deliberately blocks for 500 ms with a busy loop.
- The measured maximum delay is about 500 ms — exactly the block. (The histogram reports nanoseconds, so dividing by a million, `1e6`, converts to milliseconds.)
- A **percentile** describes the distribution: the 99th percentile is the delay that 99 percent of samples were below. Percentiles are how professionals describe latency, because averages hide the bad cases ({{ch:monitoring}}).

Production services report this number continuously to their monitoring systems, and engineers set alerts on it. When a Node.js service becomes slow but its CPU usage shows **one core at 100%**, a blocked event loop is the first suspect.

## Keeping the event loop healthy

There are four main strategies, from smallest to largest change.

### Strategy 1 — Use asynchronous APIs, and do less

The simplest fixes come first:

- Never use synchronous APIs (`...Sync`) in code that handles requests. They are fine in start-up code and scripts, before the server is serving users.
- Do less work: let the database filter, sort and add up ({{ch:sql}}); paginate large results ({{ch:rest-apis}}); avoid nested loops by using lookups ({{ch:arrays-strings-hash-maps}}); stream large data instead of loading it all ({{ch:nodejs}}).
- Use the asynchronous versions of expensive library functions where they exist — for example, `crypto.pbkdf2` instead of `crypto.pbkdf2Sync` for password hashing. The asynchronous versions run on **libuv's thread pool** (explained below), keeping the main thread free.

### Strategy 2 — Split long work into chunks

If a large job must run in JavaScript on the main thread, break it into small pieces and **yield** to the event loop between them, so other callbacks get their turn:

```js
function processInChunks(items, processItem, chunkSize = 1000) {
  return new Promise((resolve) => {
    let index = 0;

    function processChunk() {
      const end = Math.min(index + chunkSize, items.length);
      for (; index < end; index++) {
        processItem(items[index]);
      }
      if (index < items.length) {
        setImmediate(processChunk);   // let other callbacks run, then continue
      } else {
        resolve();
      }
    }

    processChunk();
  });
}

const orders = Array.from({ length: 200_000 }, (_, i) => ({ id: i, totalPaisa: i * 10 }));
let grandTotal = 0;

const timer = setInterval(() => console.log("server still responsive..."), 20);
await processInChunks(orders, (order) => { grandTotal += order.totalPaisa; });
clearInterval(timer);

console.log("Grand total:", grandTotal);
```

**Output (the number of "responsive" lines varies):**

```text
server still responsive...
server still responsive...
Grand total: 199999000000
```

Walkthrough:

- `processChunk` handles up to `chunkSize` items, then, if any remain, schedules **itself** again with `setImmediate`, and returns — emptying the call stack.
- Between chunks, the event loop is free to run timers, I/O callbacks and other requests. The interval's messages prove that other work keeps happening during the job.
- The whole thing is wrapped in a promise that resolves when the last chunk is done, so callers can simply `await` it.

The total work is the same, but it no longer monopolises the thread. The trade-off: the job takes slightly longer overall, and the code is more complex. Choose chunk sizes so each chunk takes a few milliseconds.

### Strategy 3 — Worker threads

For genuinely heavy computation, the best solution is to run it **on another thread**, leaving the main thread free. Node.js provides **worker threads** for exactly this: separate JavaScript threads, each with its **own** event loop and memory, that communicate with the main thread by sending **messages**.

```js
// hash-worker.js
import { parentPort, workerData } from "node:worker_threads";
import { pbkdf2Sync } from "node:crypto";

const hash = pbkdf2Sync(workerData.password, "salt-for-demo", 300_000, 32, "sha256");
parentPort.postMessage(hash.toString("hex"));
```

```js
// main.js
import { Worker } from "node:worker_threads";

function hashInWorker(password) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./hash-worker.js", import.meta.url), {
      workerData: { password },
    });
    worker.once("message", resolve);
    worker.once("error", reject);
  });
}

const ticker = setInterval(() => console.log("main thread is free"), 100);
const hash = await hashInWorker("correct horse battery staple");
clearInterval(ticker);
console.log("Hash:", hash.slice(0, 16) + "...");
```

**Output (the number of lines varies):**

```text
main thread is free
main thread is free
main thread is free
Hash: 5a0c4b71e93d2f80...
```

Walkthrough:

- `hash-worker.js` runs on its own thread. `workerData` contains what the main thread sent; `pbkdf2Sync` is a deliberately slow password-hashing function — blocking, but only **the worker's** thread. `parentPort.postMessage` sends the result back.
- In `main.js`, `new Worker(...)` starts the worker. `new URL("./hash-worker.js", import.meta.url)` builds the worker file's location relative to the current module (`import.meta.url` is the current module's own address).
- `hashInWorker` wraps the worker in a promise that resolves with the first message, or rejects on error — the "create your own promise" pattern from {{ch:asynchronous-javascript}}.
- Meanwhile, the interval keeps printing: the main thread was never blocked.

(The hash digits shown are illustrative; yours will be a long string of hexadecimal characters.)

Starting a worker has a cost — milliseconds and memory — so real applications keep a **pool** of workers alive and send them jobs, usually through a library. Workers do not share variables with the main thread; data is **copied** in messages (some kinds of data can be shared or transferred, for advanced cases).

> [!NOTE]
> **libuv's thread pool.** Some Node.js operations already run on background threads automatically: most file-system operations, DNS lookups by name (`dns.lookup`), the asynchronous versions of expensive crypto functions such as `pbkdf2` and `scrypt`, and compression (`zlib`). These run on a small pool of threads managed by libuv — **four threads by default**, adjustable with the `UV_THREADPOOL_SIZE` environment variable. Usually this is invisible. But if an application runs many slow operations of these kinds at once, they queue up for the four threads, and things like file reads become mysteriously slow. Network requests (sockets) do **not** use this pool; they use the operating system's own efficient event mechanisms.

### Strategy 4 — More processes, and moving work elsewhere

A single Node.js process uses **one** CPU core for its JavaScript. A server with eight cores can run **several processes** — often one per core — behind a load balancer. Node.js has a built-in `cluster` module for this; in modern deployments, the same effect usually comes from running several copies of the application as containers ({{ch:docker}}, {{ch:ecs}}). Each process has its own event loop, so one blocked loop affects only the requests on that process.

For work that does not need to finish **during** a user's request — sending emails, generating reports, processing uploaded videos — the professional solution is to take it out of the web server entirely: the request puts a **job** on a **queue**, returns immediately ("Your report is being prepared"), and separate **worker processes** take jobs from the queue and do the heavy work ({{ch:queues}}). The web servers stay fast and responsive no matter how much background work there is.

```text
   user --> web server --(add job)--> QUEUE --> worker process(es) --> heavy work
             |                                        (separate machines,
             +--> responds immediately                 can scale independently)
```

### Choosing a strategy

| Situation | Best approach |
|---|---|
| Using `...Sync` functions in request handlers | Switch to async versions |
| Doing work the database could do | Push it into the query |
| Moderate JavaScript work on large arrays, occasionally | Chunk it with `setImmediate`, or reduce it |
| Heavy CPU work that must finish within the request (hashing, image processing) | Worker threads (pooled) |
| Heavy work that can finish later (reports, videos, emails) | A job queue with separate workers |
| A busy service using only one core | Run several processes |

## The browser's event loop

### Level 6 — Rendering and frozen pages

Browsers follow the same model — one main thread, tasks, microtasks — with one important addition: **rendering**. The browser's main thread is shared between your JavaScript and the work of drawing the page: calculating layout, painting pixels, responding to scrolling and clicks.

```text
   one turn of the browser event loop (simplified):

   run ONE task (e.g. a click handler, a timer, a network callback)
      -> run ALL microtasks
      -> if it is time for a new frame: update layout and paint the screen
      -> repeat
```

A screen typically refreshes 60 times per second, so the browser wants to paint a new frame about every **16 milliseconds**. If your JavaScript runs for longer than that without yielding, frames are skipped — animations stutter and scrolling jerks. If it runs for hundreds of milliseconds, the page **freezes**: buttons do not respond, text cannot be selected, and eventually the browser offers to stop the page.

Browser performance tools call any piece of work that takes more than **50 milliseconds** a **long task**, and modern measures of web performance, such as how quickly a page responds to a click ({{ch:frontend-performance}}), are heavily affected by them.

The browser solutions mirror the server ones:

- keep event handlers short, and split long work into chunks;
- move heavy computation to **Web Workers** — the browser's equivalent of worker threads;
- use `requestAnimationFrame(fn)` to run visual updates right before the next paint, at the ideal moment;
- let the browser do the work it is good at — for example, CSS animations instead of JavaScript-driven ones.

## From beginner to enterprise: the event loop at every level

**Level 3 — A small program.** Understanding the order of logs from timers and promises; knowing that a long loop freezes everything.

**Level 4 — A real application.** A Node.js server avoids synchronous APIs in request handlers, lets the database do heavy lifting, and uses asynchronous library functions. A frontend keeps click handlers fast so the page stays responsive.

**Level 5 — Professional engineering.** Teams **measure** event loop delay in production and alert on it. CPU-heavy features are designed from the start to use worker threads or background jobs. Input sizes are limited, and validation uses safe patterns, preventing ReDoS. Several processes run per server, and **load tests** — simulating many users at once — reveal blocking before real users do.

**Level 6 — Enterprise.** Architectures separate **latency-sensitive** work (serving users quickly) from **throughput-oriented** work (processing large volumes in the background), often onto different fleets of machines that scale independently. Profiling tools show exactly which functions consume CPU time across many servers. Platform teams provide shared job queues and worker infrastructure so product teams never need to block their request handlers.

## Real-world use cases

### Beginner level — A spinner that never spins

**Situation:** a learner's web page shows a "Loading..." spinner, then runs a long calculation. The spinner never appears to spin; the page simply freezes and then shows the result.

**Explanation:** the calculation blocks the main thread, so the browser cannot repaint the spinner's animation.

**Solution:** split the calculation into chunks, or move it to a Web Worker.

### Intermediate level — The report that froze the shop

**Business problem:** an online shop's admin panel has a "Download sales report" button. Whenever a manager clicks it, the whole website becomes unresponsive for customers for about ten seconds.

**Cause:** the report handler loads a large number of orders and builds a CSV file (a simple spreadsheet text format) with nested loops in JavaScript, on the same process that serves customers.

**Solution:** first, push grouping and totals into a database query, removing most of the work; then generate the remaining file in a background job and email the manager a download link.

**Lesson:** the admin feature was fine on its own. The problem was where it ran — on the same event loop as every customer.

### Advanced level — Password hashing at scale

**Business problem:** a SaaS company's login endpoint becomes slow during busy mornings, though the database is idle.

**Investigation:** the event loop delay is high. The code uses a synchronous password-hashing function, which is deliberately slow (to make stolen password databases hard to crack — {{ch:authentication}}). Under load, logins queue up behind each other on the main thread.

**Solution:** switch to the asynchronous hashing API, which runs on libuv's thread pool, and increase the pool size for the login service; monitor event loop delay after the change.

**Trade-off:** more threads use more memory and CPU; hashing cost must remain high for security. The fix is to move the work **off** the event loop, not to make hashing weaker.

### Enterprise level — A ReDoS outage

**Business problem (illustrative, but a well-documented class of real incident):** a large website's servers suddenly hit 100% CPU, and the site goes down.

**Root cause:** a regular expression used to process some text had a pattern that, for a particular unusual input, took exponential time. One piece of content triggered it on every server that handled it, blocking each process's event loop.

**Response and prevention:** remove the dangerous pattern, add input length limits, scan code for vulnerable regular expressions automatically, and alert on event loop delay so that blocking is detected in minutes rather than diagnosed from outage reports.

## Common mistakes

### Beginner mistake — Believing "asynchronous" means "runs on another thread"

**What it looks like:** wrapping a heavy calculation in an `async` function or a promise and expecting it not to block.

**What happens:** it still runs on the main thread. `async` changes *when* code runs relative to other code, not *where*.

**How to fix it:** use worker threads (or Web Workers) for heavy computation.

### Beginner mistake — Trusting timer precision

**What it looks like:** expecting `setTimeout(fn, 100)` to run exactly 100 milliseconds later, or using timers to measure time.

**What happens:** callbacks run late whenever the thread is busy.

**How to fix it:** treat delays as minimums; measure real elapsed time with `Date.now()` or `performance.now()`.

### Intermediate mistake — Synchronous APIs in request handlers

**What it looks like:** `readFileSync` or `execSync` inside code that handles requests.

**What happens:** every request waits for the disk or process, for every user.

**How to fix it:** use the asynchronous versions; keep synchronous calls for start-up and scripts only.

### Intermediate mistake — Depending on fragile ordering

**What it looks like:** code that relies on `setTimeout(fn, 0)` running before `setImmediate`, or on two independent asynchronous operations finishing in a particular order.

**How to fix it:** make dependencies explicit with `await`; never rely on scheduling details for correctness.

### Production mistake — CPU-heavy work in the web process

**What it looks like:** image processing, PDF generation or large exports done inside request handlers.

**What happens:** latency spikes for every user while the work runs; under load, the service becomes unusable.

**How to prevent it:** worker threads for work that must finish within the request; queues and background workers for everything else.

### Enterprise mistake — Not measuring event loop delay

**What it looks like:** monitoring only CPU and memory, and diagnosing slowdowns by guesswork.

**How to prevent it:** export event loop delay as a metric, alert on its high percentiles, and profile when it rises.

## Debugging and troubleshooting

| Symptom | Likely cause | What to check |
|---|---|---|
| A Node.js service is slow for everyone; one CPU core at 100% | The event loop is blocked by computation | Event loop delay; a CPU profile to find the hot function |
| Requests time out under load, but each is fast alone | Blocking work that only hurts when requests overlap | Synchronous APIs, heavy loops, large JSON handling in handlers |
| A web page freezes; clicks do nothing | A long task on the browser's main thread | The Performance panel in developer tools, which highlights long tasks |
| Timers fire much later than requested | The thread was busy | What ran just before the timer was due |
| A Node.js script never exits | Something is keeping the event loop alive: an interval, an open server or connection, a pending timer | Clear intervals and timers; close servers and connections |
| File operations slow down under load | libuv's thread pool is saturated | Number of concurrent file/crypto/zlib operations; `UV_THREADPOOL_SIZE` |
| Logs appear in a surprising order | Microtasks versus tasks | Apply the rules: synchronous, then microtasks, then one task |

> [!TIP]
> To find **what** is blocking, use a **CPU profiler**, which records which functions are running over time. Run Node.js with `node --cpu-prof app.js` to write a profile file you can open in Chrome's developer tools, or use the **Performance** panel in the browser for frontend code. The profile shows a "flame chart" in which the widest bars are the functions consuming the most time — usually pointing straight at the culprit. {{ch:performance-engineering}} covers profiling in depth.

## How a senior engineer thinks about the event loop

> [!SENIOR]
> - **Is this waiting or computing?** Waiting is cheap in Node.js — thousands of concurrent waits are fine. Computing on the main thread is expensive — every millisecond is stolen from every user.
> - **What is the worst-case input?** A function that is fast for normal input but slow for a huge or malicious one (a giant JSON body, a crafted string) is a denial-of-service risk. Limit sizes; choose algorithms that stay fast.
> - **Where should this work run?** In the request, in a worker thread, in a background job, or in the database? Choosing the right place is often the whole solution.
> - **Measure, don't guess.** Event loop delay, CPU profiles and load tests turn "it feels slow" into a specific function to fix.
> - **Correctness never depends on scheduling.** Ordering is made explicit with `await`; shared data across `await`s is protected properly, not by hoping callbacks run in a convenient order.

## Exercises

### Exercise 1 — Order puzzle

**Objective:** practise applying the event loop rules.

**What to do:** predict the output, then run it (as an ES module, `.mjs`).

```js
console.log("A");

setTimeout(() => {
  console.log("B");
  Promise.resolve().then(() => console.log("C"));
}, 0);

Promise.resolve()
  .then(() => {
    console.log("D");
    setTimeout(() => console.log("E"), 0);
  })
  .then(() => console.log("F"));

console.log("G");
```

<details>
<summary>Show the solution</summary>

**Output:**

```text
A
G
D
F
B
C
E
```

Walkthrough:

1. **Synchronous first:** `A`, then the timer for `B` is started, the first `then` is queued as a microtask, and `G` prints.
2. **All microtasks:** the first `then` runs — `D` prints, and a new timer for `E` is started. Its promise fulfils, so the second `then` is queued as a microtask, and runs immediately as part of emptying the queue — `F`.
3. **One task:** the `B` timer (it was queued first). `B` prints, and a microtask for `C` is queued.
4. **All microtasks again:** `C`.
5. **Next task:** the `E` timer.

The key insight is step 4: microtasks queued **inside** a task run immediately after that task, before the next task — so `C` comes before `E`, even though `E`'s timer was started earlier.

**Common wrong approach:** expecting `E` before `B`, or `C` after `E`. Track the two queues separately on paper, as in the trace table in this chapter.

</details>

### Exercise 2 — See the blocking

**Objective:** observe event loop blocking directly.

**What to build:** a script that schedules a "heartbeat" every 100 ms (printing the time since start), then after 300 ms runs a busy loop for 1 second, then stops the heartbeat after 2 seconds. Look at the gaps in the heartbeat output.

<details>
<summary>Show the solution</summary>

```js
const start = Date.now();
const elapsed = () => `${Date.now() - start} ms`;

const heartbeat = setInterval(() => console.log("heartbeat at", elapsed()), 100);

setTimeout(() => {
  console.log("starting 1 second of blocking work at", elapsed());
  const blockStart = Date.now();
  while (Date.now() - blockStart < 1000) {}
  console.log("blocking work finished at", elapsed());
}, 300);

setTimeout(() => clearInterval(heartbeat), 2000);
```

**Output (approximately):**

```text
heartbeat at 101 ms
heartbeat at 202 ms
starting 1 second of blocking work at 302 ms
blocking work finished at 1302 ms
heartbeat at 1303 ms
heartbeat at 1404 ms
heartbeat at 1505 ms
...
```

Walkthrough:

- The heartbeat should print roughly every 100 ms.
- During the blocking `while` loop (302 ms to 1302 ms), **no** heartbeats print — about nine are missed, because their callbacks cannot run while the thread is busy. (`setInterval` does not "catch up" by running the missed ones all at once; it simply resumes.)
- In a real server, those missing heartbeats would be ignored requests, delayed database responses and stuck users.

**Common wrong approach:** expecting the heartbeat to continue "in the background" during the loop. There is only one thread for your JavaScript; while it loops, nothing else of yours runs.

</details>

### Exercise 3 — Unblock it with chunks

**Objective:** practise splitting long work with `setImmediate`.

**What to build:** a function `sumSquares(n)` that returns a promise for the sum of the squares of `0` to `n - 1`, processing 100,000 numbers per chunk and yielding between chunks. Run it for `n = 5_000_000` alongside a heartbeat every 50 ms, and confirm heartbeats keep printing.

<details>
<summary>Show the solution</summary>

```js
function sumSquares(n, chunkSize = 100_000) {
  return new Promise((resolve) => {
    let i = 0;
    let total = 0;

    function step() {
      const end = Math.min(i + chunkSize, n);
      for (; i < end; i++) {
        total += i * i;
      }
      if (i < n) {
        setImmediate(step);
      } else {
        resolve(total);
      }
    }

    step();
  });
}

const heartbeat = setInterval(() => console.log("still responsive"), 50);
const result = await sumSquares(5_000_000);
clearInterval(heartbeat);
console.log("Sum of squares:", result);
```

**Output (the number of heartbeat lines varies by computer):**

```text
still responsive
still responsive
Sum of squares: 41666654166732900000
```

Walkthrough:

- Each call to `step` processes one chunk, then either schedules the next chunk with `setImmediate` or resolves the promise.
- Between chunks, the event loop runs other callbacks — the heartbeats prove it.
- The result is a large number — and it is **wrong** in its last digits. The exact answer is 41666654166667500000. Once the running total passed `Number.MAX_SAFE_INTEGER` ({{ch:types-of-data}}), each addition was rounded, and millions of small rounding errors added up. For an exact answer you would use `BigInt` (`total += BigInt(i) * BigInt(i)`, starting from `0n`) — a reminder that every number type has limits worth checking.

**Common wrong approach:** using `Promise.resolve().then(step)` instead of `setImmediate(step)` to "yield". Promise callbacks are **microtasks**, and the event loop empties the microtask queue completely before running any task — so the heartbeat timers would still be starved until the whole job finished.

</details>

### Exercise 4 — Why won't it exit? (debugging)

**Objective:** practise reasoning about what keeps Node.js running.

**The scenario:** this script is meant to fetch some data, print it, and exit. It prints the data but never exits; the terminal hangs until you press <kbd>Ctrl</kbd> + <kbd>C</kbd>.

```js
let attempts = 0;

const progress = setInterval(() => {
  attempts++;
  console.log(`waiting... (${attempts})`);
}, 500);

const response = await fetch("https://jsonplaceholder.typicode.com/todos/1");
const todo = await response.json();
console.log("Todo:", todo.title);
```

**What to do:** explain why the process stays alive, and fix it so it exits by itself — including when the fetch fails.

<details>
<summary>Show the solution</summary>

**Why:** Node.js exits only when the event loop has **nothing left to wait for**. The `setInterval` is still active, so there is always a pending timer, and the loop keeps running forever — printing "waiting..." every half second.

**Fix:** clear the interval when the work is finished — in `finally`, so that it is also cleared if the fetch fails:

```js
let attempts = 0;

const progress = setInterval(() => {
  attempts++;
  console.log(`waiting... (${attempts})`);
}, 500);

try {
  const response = await fetch("https://jsonplaceholder.typicode.com/todos/1");
  if (!response.ok) throw new Error(`Status ${response.status}`);
  const todo = await response.json();
  console.log("Todo:", todo.title);
} catch (error) {
  console.log("Failed:", error.message);
  process.exitCode = 1;
} finally {
  clearInterval(progress);
}
```

**Output (usually no "waiting" lines, because the fetch is fast):**

```text
Todo: delectus aut autem
```

Walkthrough:

- `finally` guarantees the interval is cleared on success **and** on failure ({{ch:errors-and-debugging}}).
- Once the interval is cleared and the fetch has completed, nothing remains on the event loop, so Node.js exits by itself.
- `process.exitCode = 1` makes the process report failure (a non-zero exit code, {{ch:the-terminal}}) when something went wrong, without forcing an abrupt exit — important when the script runs inside automation.

(Alternatively, `progress.unref()` tells Node.js "do not keep the process alive just for this timer" — useful for background timers that should not prevent exit.)

**Common wrong approach:** adding `process.exit()` at the end. It works here, but it kills the process immediately — even if other asynchronous work, such as writing a log file, has not finished. Removing the thing that keeps the loop alive is the clean fix.

</details>

## Summary

JavaScript runs on **one thread**: one piece of code at a time, on the **call stack**. Slow work — timers, files, networking — is handed to the **runtime** (libuv in Node.js, Web APIs in browsers), which does it in the background. When it finishes, its callback waits in a queue: the **task queue** for timers, I/O and events, or the **microtask queue** for promise reactions. The **event loop** repeats one rule: when the stack is empty, run **all** microtasks, then **one** task.

Code runs **to completion** — nothing interrupts it — which prevents many concurrency bugs but means long code blocks everything. To predict ordering: synchronous code first, then microtasks (`process.nextTick` before promises, in Node.js), then tasks. Microtasks can **starve** tasks. Node.js organises tasks into **phases** — timers, poll (I/O), check (`setImmediate`), close — and exits when nothing is pending. Timer delays are minimums.

**Blocking the event loop** — heavy computation, synchronous APIs, huge JSON, nested loops, catastrophic regular expressions (**ReDoS**) — freezes a server for every user. Detect it by measuring **event loop delay**. Fix it by using asynchronous APIs and doing less, **chunking** work with `setImmediate`, using **worker threads** (or Web Workers) for heavy computation, running **several processes**, and moving deferrable work to **job queues**. Some Node.js operations already run on **libuv's thread pool** (four threads by default). In browsers, the same thread also **renders** the page, so long tasks cause stutter and frozen pages.

## Key terms

- **Event loop** — The mechanism that, whenever the call stack is empty, runs waiting callbacks from the queues.
- **Single-threaded** — Running code on one thread, so only one piece of it executes at any instant.
- **Runtime APIs** — Facilities provided by the runtime, such as timers and file access, whose slow work happens outside the JavaScript thread.
- **libuv** — The library inside Node.js that provides its event loop, asynchronous I/O and thread pool.
- **Web APIs** — The facilities browsers provide to JavaScript, such as timers, `fetch` and DOM events.
- **I/O (input/output)** — Reading and writing data outside the program, such as files and network connections.
- **Task (macrotask)** — A queued callback such as a timer, an I/O completion or a user event.
- **Task queue** — The queue of tasks waiting to run.
- **Microtask** — A high-priority queued callback, mainly a promise reaction or the continuation after `await`.
- **Microtask queue** — The queue of microtasks, emptied completely before the next task runs.
- **Run-to-completion** — The rule that once a piece of JavaScript starts, it runs until the call stack is empty, without interruption.
- **Starvation** — A situation in which some work never gets a turn because other work keeps taking priority.
- **Tick** — One turn of the event loop.
- **Event loop phases** — The ordered stages of Node.js's event loop: timers, pending callbacks, poll, check and close callbacks.
- **`setImmediate`** — A Node.js function that schedules a callback for the check phase, just after I/O.
- **`process.nextTick`** — A Node.js function that schedules a callback to run immediately after the current operation, before promise microtasks.
- **`queueMicrotask`** — A standard function that schedules a microtask directly.
- **Blocking the event loop** — Running JavaScript for so long that no other callbacks can run.
- **CPU-bound** — Describes work limited by calculation speed rather than by waiting.
- **Event loop delay (lag)** — How late callbacks run compared with when they were due; a key health measure for Node.js services.
- **Percentile** — The value below which a given percentage of measurements fall, such as the 99th percentile of latency.
- **Regular expression (regex)** — A compact pattern language for matching text.
- **ReDoS** — Regular Expression Denial of Service: an attack using input that makes a vulnerable pattern take extremely long to evaluate.
- **Chunking** — Splitting long work into small pieces, yielding to the event loop between them.
- **Yielding** — Ending the current piece of work so that other callbacks can run before continuing.
- **Worker thread** — A separate JavaScript thread in Node.js, with its own event loop and memory, communicating by messages.
- **Web Worker** — The browser's equivalent of a worker thread.
- **Thread pool** — A fixed set of threads that take turns doing background work; libuv's has four threads by default.
- **`cluster`** — A Node.js module for running several processes that share the same server port.
- **Job queue** — A queue of work items that background worker processes take and perform outside user requests.
- **Long task** — In browsers, a piece of main-thread work longer than 50 milliseconds.
- **`requestAnimationFrame`** — A browser function that runs a callback just before the next screen repaint.
- **CPU profiler** — A tool that records which functions use processor time, used to find performance problems.
- **Load test** — A test that simulates many users at once to find how a system behaves under pressure.

## What comes next

You now understand JavaScript's execution model from top to bottom: values, functions, scope, objects, errors, modules, asynchronous code and the event loop beneath it. That is the core of the language.

The next chapter, **Advanced JavaScript: Iterators, Generators, Proxies and Memory**, completes Part II's tour of the language itself. You will learn how `for...of` really works and how to make your own objects iterable, how generator functions can pause and resume, how proxies can intercept operations on objects, and how JavaScript manages memory — including how to find and fix the memory leaks that bring down long-running servers.
