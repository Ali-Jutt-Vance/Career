# Asynchronous JavaScript: Callbacks, Promises and async/await

> [!GOALS]
> - What "synchronous" and "asynchronous" mean, and why programs that wait must not block.
> - How timers work, and what a callback-based asynchronous function looks like.
> - Why deeply nested callbacks became a problem, and how promises solve it.
> - What a promise is: its three states, `then`, `catch` and `finally`, and how chaining works.
> - How `async` and `await` let you write asynchronous code that reads like ordinary code.
> - How to handle errors in asynchronous code, and what an "unhandled rejection" is.
> - How to run work one after another, or at the same time, with `Promise.all`, `allSettled`, `race` and `any`.
> - How to fetch data from a real web API.
> - The production essentials: timeouts, cancellation, retries with backoff and jitter, and limited concurrency.

## Why this matters

Almost every useful program spends most of its time **waiting**:

- waiting for a file to be read from disk;
- waiting for a database to answer a query;
- waiting for a payment provider to approve a card;
- waiting for a user to click a button;
- waiting for an API on the other side of the world to respond.

In {{ch:what-a-computer-is}} and {{ch:how-the-internet-works}} you saw how long these waits are compared with the speed of the processor: reading from an SSD takes thousands of times longer than reading from memory, and a network round trip can take hundreds of milliseconds — an eternity for a CPU.

If a program simply **stopped** during every wait, a web server could serve only one user at a time. While it waited 200 milliseconds for the database on behalf of user A, users B, C and D would all be stuck. A web page would freeze completely every time it fetched data.

**Asynchronous programming** solves this. It lets a program **start** a slow task, carry on with other work, and **come back** to the result when it is ready. It is the single most important idea for backend development in Node.js, and it runs through every frontend framework too. It is also where many of the most confusing bugs live — so this chapter builds the idea carefully, one step at a time.

## The simple idea

Imagine ordering food at a busy fast-food counter.

**The blocking way:** you order, and the cashier stands still, staring at the kitchen, until your food is ready. Only then do they serve the next customer. The queue grows longer and longer.

**The non-blocking way:** you order, the cashier gives you a **numbered receipt**, and immediately serves the next customer. When your food is ready, your number is called, and you collect it. One cashier serves many people, because they never stand idle waiting.

```text
  BLOCKING (synchronous)                 NON-BLOCKING (asynchronous)

  serve A  ...wait for A's food...       take A's order -> receipt #1
  serve B  ...wait for B's food...       take B's order -> receipt #2
  serve C  ...wait for C's food...       take C's order -> receipt #3
                                         #2 ready -> call "number 2!"
                                         #1 ready -> call "number 1!"
                                         #3 ready -> call "number 3!"
```

JavaScript works the second way. The cashier is your program, running on **one thread** ({{ch:loops}}) — it can only do one thing at a time. The kitchen is the operating system, the disk, the network and the database, which do the slow work **in the background**. The numbered receipt is, as you will see, a **promise**.

> [!ANALOGY]
> Asynchronous code is like the receipt system at a busy counter: start the slow job, get a receipt, serve the next person, and come back when your number is called.
>
> **Where the analogy breaks:** a customer can hold several receipts and wait for all of them at once — and so can a program. And unlike a real counter, if nobody comes to collect an order whose preparation *failed*, JavaScript does not quietly throw it away; it raises an alarm called an "unhandled rejection", which can stop a Node.js program entirely.

## The proper definition and key words

- **Synchronous** code runs one step after another, and each step **finishes** before the next begins. Everything you have written so far has been synchronous.
- **Asynchronous** code **starts** an operation that will finish **later**, and lets the program continue in the meantime. The result is handled when it arrives.
- **Blocking** describes an operation that makes the whole program wait until it finishes.
- **Non-blocking** describes an operation that returns immediately, so the program can keep working while it completes in the background.
- A **callback** is a function passed to an asynchronous operation, to be called when it finishes ({{ch:functions}}).
- A **promise** is an object representing a value that will be available **later** — or an error, if the operation fails.
- **`async` / `await`** are keywords that let you write promise-based code in a straightforward, top-to-bottom style.
- **Concurrency** means several tasks making progress during the same period of time — not necessarily at the same instant.

## Seeing asynchronous code for the first time: timers

The simplest asynchronous operation is a **timer**. `setTimeout` asks the runtime to call a function after a delay, given in **milliseconds** (thousandths of a second):

```js
console.log("1. Order placed");

setTimeout(() => {
  console.log("3. Food is ready");
}, 2000);

console.log("2. Serving the next customer");
```

**Output:**

```text
1. Order placed
2. Serving the next customer
3. Food is ready
```

(The third line appears about two seconds after the first two.)

Walkthrough:

- Line 1 runs and prints immediately.
- `setTimeout(callback, 2000)` **does not wait**. It hands the callback to the runtime with the instruction "call this in 2,000 milliseconds", and **returns immediately**.
- So the program moves straight on to the next line and prints "2. Serving the next customer".
- About two seconds later, the runtime calls the callback, which prints "3. Food is ready".

This is the most important thing to understand in this whole chapter: **the code does not run in the order it is written.** Line 3 of the output comes from code written *before* the code that printed line 2. The callback runs **later**, when its time comes.

Even a delay of **zero** does not make the callback run immediately:

```js
console.log("A");
setTimeout(() => console.log("B"), 0);
console.log("C");
```

**Output:**

```text
A
C
B
```

A timer callback always waits until the code currently running has **finished**. "Zero milliseconds" means "as soon as possible *after* the current work is done", not "now". The exact mechanism behind this — the **event loop** — is the subject of the next chapter, {{ch:the-event-loop}}. For now, remember the rule: **asynchronous callbacks run later, after the current code finishes.**

`setTimeout` returns an ID that you can use to cancel the timer before it fires:

```js
const timerId = setTimeout(() => console.log("You will never see this"), 5000);
clearTimeout(timerId);
```

There is also `setInterval`, which calls a function **repeatedly** at a fixed interval until cancelled with `clearInterval`:

```js
let checks = 0;
const intervalId = setInterval(() => {
  checks++;
  console.log(`Checking payment status... (${checks})`);
  if (checks === 3) {
    clearInterval(intervalId);
    console.log("Stopped checking");
  }
}, 1000);
```

**Output (one line per second):**

```text
Checking payment status... (1)
Checking payment status... (2)
Checking payment status... (3)
Stopped checking
```

## Callbacks: the original way

### Level 1 — Callback-style asynchronous functions

Before promises existed, every asynchronous operation in JavaScript took a **callback**: you passed a function, and the operation called it when it finished. Node.js established a firm convention for these callbacks, called **error-first callbacks**: the callback's **first** parameter is an error (or `null` if everything went well), and the result comes **second**.

Here is a real example with Node.js's file system module, using its callback-based API:

```js
import { readFile } from "node:fs";

readFile("hello.txt", "utf8", (error, contents) => {
  if (error) {
    console.log("Could not read the file:", error.message);
    return;
  }
  console.log("File contents:", contents);
});

console.log("Reading started...");
```

**Output (if `hello.txt` exists and contains "Hello from Node.js"):**

```text
Reading started...
File contents: Hello from Node.js
```

Walkthrough:

- `readFile` asks the operating system to read the file, and **returns immediately**, without the contents.
- So "Reading started..." prints first.
- When the disk has delivered the data, Node.js calls the callback. If something went wrong (for example, the file does not exist), `error` is an `Error` object and `contents` is undefined. Otherwise `error` is `null` and `contents` holds the text.
- The callback checks `error` **first** — always — and returns early if there is one (a guard clause, {{ch:functions}}).

Compare this with the synchronous `readFileSync` from {{ch:modules-and-npm}}, which made the whole program wait. Here, the program is free to do other work while the disk is busy.

### Level 2 — The problem: callback hell

Callbacks work well for one operation. But real tasks are **sequences** of asynchronous steps, where each step needs the previous result. Imagine processing an order: find the customer, then find their basket, then check stock, then charge the card, then send a confirmation email. With callbacks, each step goes **inside** the previous step's callback:

```js
findCustomer(customerId, (error, customer) => {
  if (error) return handleError(error);
  findBasket(customer.id, (error, basket) => {
    if (error) return handleError(error);
    checkStock(basket.items, (error, stockOk) => {
      if (error) return handleError(error);
      chargeCard(customer.card, basket.total, (error, payment) => {
        if (error) return handleError(error);
        sendConfirmation(customer.email, payment, (error) => {
          if (error) return handleError(error);
          console.log("Order complete");
        });
      });
    });
  });
});
```

This shape — code drifting further and further to the right — is famously called **callback hell** (or "the pyramid of doom"). Its problems are worse than its looks:

- **Hard to read and change.** The logic is a simple sequence of five steps, but it is buried in nesting.
- **Error handling is repeated** at every level, and forgetting one check means an error is silently ignored.
- **Hard to do things in parallel**, or to combine results.
- **No guarantees.** A badly written function might call your callback twice, or never.

Promises were invented to fix these problems.

## Promises

### Level 2 — What a promise is

A **promise** is an object that represents the **eventual result** of an asynchronous operation. When you start the operation, you get the promise back **immediately** — like the numbered receipt — even though the result does not exist yet.

A promise is always in one of three **states**:

```text
                     +--> FULFILLED  (it worked: here is the value)
                     |
     PENDING  -------+
   (still working)   |
                     +--> REJECTED   (it failed: here is the error)
```

- **Pending** — the operation has not finished yet.
- **Fulfilled** — it finished successfully, and the promise holds the resulting **value**.
- **Rejected** — it failed, and the promise holds the **error** (the reason).

A promise that is fulfilled or rejected is said to be **settled**. Once settled, it **never changes again**: a fulfilled promise cannot later become rejected, and its value stays the same. This guarantee is one of the things callbacks could not offer.

### Using a promise: `then`, `catch` and `finally`

Node.js offers promise-based versions of its file functions in `node:fs/promises`. Let us read the same file, the promise way:

```js
import { readFile } from "node:fs/promises";

const promise = readFile("hello.txt", "utf8");
console.log("Promise right now:", promise);

promise
  .then((contents) => {
    console.log("File contents:", contents);
  })
  .catch((error) => {
    console.log("Could not read the file:", error.message);
  })
  .finally(() => {
    console.log("Finished trying to read");
  });
```

**Output:**

```text
Promise right now: Promise { <pending> }
File contents: Hello from Node.js
Finished trying to read
```

Walkthrough:

- `readFile(...)` returns a promise **immediately**. Printing it shows `Promise { <pending> }` — the result does not exist yet.
- **`.then(callback)`** registers a function to run when the promise is **fulfilled**. It receives the value — here, the file contents.
- **`.catch(callback)`** registers a function to run if the promise is **rejected**. It receives the error.
- **`.finally(callback)`** registers a function to run when the promise **settles either way** — for clean-up, just like `finally` in {{ch:errors-and-debugging}}.

You still pass callbacks — but to the **promise**, after you have it, instead of to the operation itself. That small change has big consequences.

### Chaining: sequences without nesting

Here is the key feature that defeats callback hell: **`then` returns a new promise**, which settles with whatever your callback **returns**. If your callback returns another promise, the chain **waits** for it. So a sequence of asynchronous steps becomes a flat **chain**:

```js
findCustomer(customerId)
  .then((customer) => findBasket(customer.id))
  .then((basket) => checkStock(basket))
  .then((basket) => chargeCard(basket))
  .then((payment) => sendConfirmation(payment))
  .then(() => console.log("Order complete"))
  .catch((error) => handleError(error));
```

The five steps now read top to bottom, in order. And **one** `catch` at the end handles a failure in **any** step: when a promise in the chain rejects, every following `then` is skipped, and the rejection flows down to the first `catch` — much like an exception propagating up the call stack ({{ch:errors-and-debugging}}).

```text
  step 1 ok -> step 2 ok -> step 3 FAILS -> step 4 skipped -> step 5 skipped -> catch runs
```

### Creating your own promise

Most of the time, you **use** promises returned by functions — file reads, database queries, network requests. Occasionally, you need to **create** one, usually to turn an older callback-style or timer-based API into a promise. You do this with `new Promise`:

```js
function wait(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

console.log("Start");
wait(1500).then(() => console.log("1.5 seconds later"));
```

**Output:**

```text
Start
1.5 seconds later
```

Walkthrough:

- `new Promise(executor)` creates a promise. The **executor** is a function that JavaScript calls **immediately**, giving it two functions as arguments: `resolve` and `reject`.
- Calling **`resolve(value)`** fulfils the promise with that value. Calling **`reject(error)`** rejects it.
- Here, the executor starts a timer that calls `resolve` after the delay. Until then, the promise is pending; then it becomes fulfilled, and the `then` callback runs.

This small `wait` helper (often called `sleep` or `delay`) is extremely common, and you will use it throughout this chapter.

A promise that can fail calls `reject`:

```js
function rollDiceForBonus() {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const roll = Math.floor(Math.random() * 6) + 1;
      if (roll >= 3) {
        resolve(roll);
      } else {
        reject(new Error(`Rolled ${roll}: no bonus this time`));
      }
    }, 500);
  });
}

rollDiceForBonus()
  .then((roll) => console.log(`Bonus! You rolled ${roll}`))
  .catch((error) => console.log(error.message));
```

**Output (random — one of):**

```text
Bonus! You rolled 5
```

```text
Rolled 2: no bonus this time
```

As with `throw`, always reject with an `Error` object, so the error has a stack trace.

> [!NOTE]
> Node.js has a helper, `util.promisify`, that converts any error-first callback function into a promise-returning one: `const readFileAsync = util.promisify(fs.readFile)`. Most of Node.js and almost all modern libraries now provide promise-based APIs directly, so you will rarely need it — but you will see it in older code.

`Promise.resolve(value)` and `Promise.reject(error)` create promises that are already settled, which is useful in tests and when a function must always return a promise.

## `async` and `await`

### Level 3 — Asynchronous code that reads like synchronous code

Promise chains are much better than callback pyramids. But JavaScript went one step further. The keywords **`async`** and **`await`** let you write promise-based code that **looks** like ordinary, top-to-bottom code:

```js
import { readFile } from "node:fs/promises";

async function showFile() {
  console.log("Reading...");
  const contents = await readFile("hello.txt", "utf8");
  console.log("File contents:", contents);
  return contents.length;
}

showFile().then((length) => console.log("Length:", length));
console.log("showFile has been called");
```

**Output:**

```text
Reading...
showFile has been called
File contents: Hello from Node.js
Length: 19
```

(The file's contents include a final new-line character, which is why the length is 19.)

Walkthrough:

- **`async function`** declares an **asynchronous function**. Two things are special about it: it can use `await` inside, and it **always returns a promise**. Whatever it `return`s becomes the promise's fulfilled value; if it throws, the promise is rejected.
- **`await promise`** pauses **this function** until the promise settles. If it fulfils, `await` gives back its value — so `contents` is the file's text, not a promise. If it rejects, `await` **throws** the error, right there on that line.
- While `showFile` is paused at `await`, **the rest of the program keeps running**. That is why "showFile has been called" prints before the file contents: calling `showFile()` ran it as far as the first `await`, and then returned a pending promise to the caller, which continued.
- When the file read finishes, `showFile` **resumes** exactly where it paused, with all its local variables intact.

```text
  showFile()                                   the rest of the program
  ----------                                   -----------------------
  log "Reading..."
  await readFile(...)  -- pauses ------------> log "showFile has been called"
                                               (other work can happen here)
  <-- file ready: resumes ---------------------
  log "File contents: ..."
  return 19  --> promise fulfils with 19 ----> then: log "Length: 19"
```

**`await` does not block the program.** It only pauses the `async` function it is in. Everything else continues. This is the crucial difference from `readFileSync`, which froze everything.

### The order-processing sequence, rewritten

Here is the five-step order process from the callback-hell example, written with `async`/`await`:

```js
async function processOrder(customerId) {
  const customer = await findCustomer(customerId);
  const basket = await findBasket(customer.id);
  await checkStock(basket.items);
  const payment = await chargeCard(customer.card, basket.total);
  await sendConfirmation(customer.email, payment);
  return payment;
}
```

It reads exactly like the plain-English description of the process. Each line waits for its step, then the next line runs. No nesting, no chains.

### Errors with `await`: plain `try...catch`

Because a rejected promise makes `await` **throw**, you handle asynchronous errors with the ordinary `try...catch` you learned in {{ch:errors-and-debugging}}:

```js
import { readFile } from "node:fs/promises";

async function loadSettings() {
  try {
    const text = await readFile("settings.json", "utf8");
    return JSON.parse(text);
  } catch (error) {
    if (error.code === "ENOENT") {
      console.log("No settings file found; using defaults");
      return { theme: "light" };
    }
    throw error;
  } finally {
    console.log("Finished loading settings");
  }
}

const settings = await loadSettings();
console.log(settings);
```

**Output (when `settings.json` does not exist):**

```text
No settings file found; using defaults
Finished loading settings
{ theme: 'light' }
```

Walkthrough:

- If `readFile` rejects, `await` throws, and control jumps to `catch` — exactly as with a synchronous throw.
- Node.js file errors carry a **`code`** property. **`ENOENT`** ("Error: No ENTry") means "no such file or directory". This expected situation is handled with a default; anything else (for example, a permissions problem, or invalid JSON throwing from `JSON.parse`) is rethrown — the "catch only what you can handle" rule.
- `finally` runs either way.
- The last part uses **`await` at the top level** of the module, outside any function. This is called **top-level await**, and it is allowed in ES modules ({{ch:modules-and-npm}}). In CommonJS files, or inside ordinary non-async functions, `await` is not allowed.

This is the payoff promised in {{ch:errors-and-debugging}}: errors in code that finishes **later** could not be caught by a `try` that had already finished. With `await`, the `try` block stays open across the wait, so it **can** catch them.

## Rejected promises nobody handles

If a promise is rejected and **no** code ever handles the rejection — no `catch`, no `try` around an `await` — it is called an **unhandled rejection**:

```js
async function failSoon() {
  throw new Error("Database unavailable");
}

failSoon();
console.log("Carrying on...");
```

**Output:**

```text
Carrying on...
file:///C:/code/async/demo.js:2
  throw new Error("Database unavailable");
        ^

Error: Database unavailable
    at failSoon (file:///C:/code/async/demo.js:2:9)
    ...
```

Calling `failSoon()` returned a rejected promise, and nothing handled it. In modern Node.js, an unhandled rejection is treated like an uncaught exception: it is printed, and the **process exits** with an error code. In browsers, it is reported in the console.

This is good, strict behaviour — an ignored failure is almost always a bug — but it means that **every promise must be handled somewhere**: awaited inside a `try...catch`, given a `.catch`, or passed up to a caller that handles it.

## The most common async bugs

### Bug 1 — Forgetting `await`

```js
async function getBasketTotal() {
  return 309800;   // imagine this came from a database
}

async function showTotal() {
  const total = getBasketTotal();     // missing await!
  console.log("Total:", total);
  console.log("Total in rupees:", total / 100);
}

await showTotal();
```

**Output:**

```text
Total: Promise { 309800 }
Total in rupees: NaN
```

Without `await`, `total` is the **promise**, not the number. Dividing a promise by 100 gives `NaN`. Worse, if the promise had rejected, the error would be an unhandled rejection, because nothing awaited it.

The fix is `const total = await getBasketTotal();`. Linters can catch many of these: ESLint and TypeScript both have rules for "floating" promises that are never awaited or handled.

> [!WARNING]
> A forgotten `await` before a **write** is especially dangerous: `saveOrder(order); return "Order saved";` returns success to the customer **before** the save has finished — and if the save then fails, nobody finds out. Always await operations whose success you are reporting.

### Bug 2 — `await` inside `forEach`

```js
const orderIds = ["A1", "A2", "A3"];

orderIds.forEach(async (id) => {
  await processOrder(id);
});
console.log("All orders processed");    // printed before any order finishes!
```

`forEach` calls the async callback for each item but **does not wait** for the promises it returns — it ignores them. So "All orders processed" prints immediately, and any errors become unhandled rejections. Use a `for...of` loop (one after another) or `Promise.all` (all at once), both shown next.

### Bug 3 — The timer-in-a-loop puzzle

You met the closure-in-a-loop bug in {{ch:scope-and-closures}}. Here is its classic asynchronous form, a very common interview question:

```js
for (var i = 1; i <= 3; i++) {
  setTimeout(() => console.log(i), 100);
}
```

**Output:**

```text
4
4
4
```

The three callbacks run **after** the loop has finished, and with `var` they all share one `i`, which by then is 4. With `let i`, each iteration has its own `i`, and the output is `1`, `2`, `3`. Now you understand both halves of the answer: closures capture variables, and timer callbacks run later.

## Sequential and parallel

### Level 4 — One after another, or all at once?

Suppose you need three independent pieces of data — the customer's profile, their recent orders and their notifications — each taking about one second to fetch. Compare:

```js
function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchProfile() { await wait(1000); return { name: "Sara" }; }
async function fetchOrders() { await wait(1000); return ["ORD-1", "ORD-2"]; }
async function fetchNotifications() { await wait(1000); return 3; }

console.time("sequential");
const profile = await fetchProfile();
const orders = await fetchOrders();
const notifications = await fetchNotifications();
console.timeEnd("sequential");

console.time("parallel");
const [profile2, orders2, notifications2] = await Promise.all([
  fetchProfile(),
  fetchOrders(),
  fetchNotifications(),
]);
console.timeEnd("parallel");

console.log(profile2, orders2, notifications2);
```

**Output (approximately):**

```text
sequential: 3.012s
parallel: 1.004s
{ name: 'Sara' } [ 'ORD-1', 'ORD-2' ] 3
```

Walkthrough:

- **Sequential:** each `await` waits for one fetch to finish before **starting** the next. Total: about 1 + 1 + 1 = 3 seconds.
- **Parallel:** all three functions are **called immediately** — all three operations start at once — and `Promise.all` returns one promise that fulfils when **all** of them have fulfilled. Total: about as long as the slowest, 1 second.
- `Promise.all` fulfils with an **array** of results, in the **same order** as the promises given to it (not the order they finished). Array destructuring ({{ch:arrays}}) unpacks them.

```text
  sequential:  [--profile--][--orders--][--notifications--]      ~3s

  parallel:    [--profile--]
               [--orders---]                                     ~1s
               [--notifications--]
```

This is one of the most valuable performance techniques in backend and frontend code alike. When a page needs several **independent** pieces of data, fetching them in parallel can make it several times faster — the latency lesson from {{ch:how-the-internet-works}}, applied.

**But only when the operations are independent.** In the order-processing example, you cannot charge the card before you know the basket total. Steps that depend on earlier results **must** be sequential. Deciding which work depends on which is a real design skill.

### The four combinators

JavaScript provides four ways to combine several promises. (A function that combines things into one is often called a **combinator**.)

| Method | Settles when… | Result | Use it when… |
|---|---|---|---|
| `Promise.all(promises)` | all fulfil, **or** the first one rejects | array of values | you need every result, and one failure means the whole task fails |
| `Promise.allSettled(promises)` | all have settled, whatever happened | array of `{ status, value }` or `{ status, reason }` | you want every outcome, including failures — e.g. sending many emails |
| `Promise.race(promises)` | the **first** settles (fulfil or reject) | that first outcome | racing an operation against a timeout |
| `Promise.any(promises)` | the first **fulfils** (rejects only if all reject) | the first success | trying several equivalent sources and using whichever answers first |

`Promise.all` **fails fast**: as soon as any promise rejects, the combined promise rejects with that error, and you do not get the other results. When partial success is useful, use `Promise.allSettled`:

```js
async function sendEmail(address) {
  if (!address.includes("@")) throw new Error(`Bad address: ${address}`);
  return `Sent to ${address}`;
}

const results = await Promise.allSettled([
  sendEmail("sara@example.com"),
  sendEmail("not-an-email"),
  sendEmail("bilal@example.com"),
]);

for (const result of results) {
  if (result.status === "fulfilled") {
    console.log("OK:", result.value);
  } else {
    console.log("FAILED:", result.reason.message);
  }
}
```

**Output:**

```text
OK: Sent to sara@example.com
FAILED: Bad address: not-an-email
OK: Sent to bilal@example.com
```

One bad address did not prevent the other two emails, and the failure is reported clearly, ready for a retry or a log entry.

### Loops: `for...of` with `await`

To process items **one at a time**, in order, use `await` inside a `for...of` loop:

```js
for (const id of orderIds) {
  await processOrder(id);    // waits for each before starting the next
}
console.log("All orders processed");   // now genuinely after all of them
```

To process them **all at once**, map them to promises and await `Promise.all`:

```js
await Promise.all(orderIds.map((id) => processOrder(id)));
console.log("All orders processed");
```

Which is right depends on the situation: sequential processing is gentler on other systems and preserves order; parallel processing is faster. For large numbers of items, neither extreme is right — you want **limited** parallelism, covered in the production section below.

## Fetching data from the web

### Level 4 — `fetch`

The most common asynchronous operation in web development is an HTTP request ({{ch:how-the-web-works}}). Modern browsers and Node.js (version 18 onwards) provide the same built-in function for this: **`fetch`**.

Here is a request to a free public test API that returns sample data:

```js
const response = await fetch("https://jsonplaceholder.typicode.com/users/1");

console.log("Status:", response.status, response.ok);
console.log("Content-Type:", response.headers.get("content-type"));

const user = await response.json();
console.log(user.name, "-", user.email);
```

**Output:**

```text
Status: 200 true
Content-Type: application/json; charset=utf-8
Leanne Graham - Sincere@april.biz
```

Walkthrough:

- `fetch(url)` sends a GET request and returns a promise. It fulfils with a **Response** object as soon as the response's **headers** have arrived.
- `response.status` is the HTTP status code (200); `response.ok` is `true` for any status from 200 to 299.
- `response.headers.get(...)` reads a response header.
- The **body** may still be arriving, so reading it is **another** asynchronous step: `await response.json()` reads the whole body and parses it as JSON ({{ch:objects}}). (For plain text, use `response.text()`.)

### The `fetch` trap: HTTP errors do not reject

This surprises almost everyone: **`fetch` does not reject for HTTP error statuses.** A `404 Not Found` or `500 Internal Server Error` still **fulfils** the promise, with `response.ok` set to `false`. `fetch` only rejects when the request could not be completed at all — no network, DNS failure, connection refused ({{ch:how-the-internet-works}}).

So you must check the status yourself:

```js
async function getJSON(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request to ${url} failed with status ${response.status}`);
  }
  return response.json();
}

try {
  const post = await getJSON("https://jsonplaceholder.typicode.com/posts/1");
  console.log("Post title:", post.title);

  await getJSON("https://jsonplaceholder.typicode.com/posts/999999");
} catch (error) {
  console.log("Error:", error.message);
}
```

**Output:**

```text
Post title: sunt aut facere repellat provident occaecati excepturi optio reprehenderit
Error: Request to https://jsonplaceholder.typicode.com/posts/999999 failed with status 404
```

This small `getJSON` helper — check `ok`, throw a clear error, parse the body — is the pattern behind countless real API clients.

### Sending data

To send data, give `fetch` an options object with a method, headers and a body:

```js
const response = await fetch("https://jsonplaceholder.typicode.com/posts", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ title: "New product", body: "Cotton shirt", userId: 1 }),
});

console.log(response.status);
console.log(await response.json());
```

**Output:**

```text
201
{ title: 'New product', body: 'Cotton shirt', userId: 1, id: 101 }
```

Everything here maps directly onto the HTTP request anatomy from {{ch:how-the-web-works}}: the method, a `Content-Type` header saying the body is JSON, and the body itself — serialised with `JSON.stringify`. The test server replies `201 Created`. (This test API only pretends to save the data; a real API would store it.)

## Production essentials

Everything so far works in a tutorial. Production systems need more, because — as you learned in {{ch:how-the-internet-works}} — **networks fail**: slowly, partially and unpredictably. Every call that leaves your process needs protection. Experienced engineers apply four patterns almost automatically.

### 1. Timeouts and cancellation

By default, `fetch` waits a very long time for a slow server. A slow dependency can then tie up your whole application, as in the food-delivery example in {{ch:how-the-internet-works}}. Every network call needs a **timeout**.

Modern JavaScript cancels operations with an **`AbortSignal`**. The simplest form creates a signal that cancels automatically after a delay:

```js
try {
  const response = await fetch("https://httpbin.org/delay/5", {
    signal: AbortSignal.timeout(2000),
  });
  console.log(response.status);
} catch (error) {
  if (error.name === "TimeoutError") {
    console.log("The server took longer than 2 seconds; giving up");
  } else {
    throw error;
  }
}
```

**Output:**

```text
The server took longer than 2 seconds; giving up
```

- `https://httpbin.org/delay/5` is a public test address that deliberately waits five seconds before answering.
- `AbortSignal.timeout(2000)` creates a signal that **aborts** after two seconds. Passing it to `fetch` cancels the request at that point, and `fetch` rejects with an error named `"TimeoutError"`.

For cancellation triggered by your own code — a user leaving a page, a newer search replacing an older one — create an **`AbortController`** and call its `abort()` method; its `signal` is passed to `fetch` in the same way.

### 2. Retries with backoff and jitter

Many network failures are temporary: a brief connection drop, a server restarting, a moment of overload. Retrying a few times often succeeds. But retries must be done carefully:

```js
function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRetry(operation, { attempts = 4, baseDelayMs = 200, maxDelayMs = 5000, isRetryable = () => true } = {}) {
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const isLastAttempt = attempt === attempts - 1;
      if (isLastAttempt || !isRetryable(error)) break;

      const backoff = Math.min(baseDelayMs * 2 ** attempt, maxDelayMs);
      const delay = backoff / 2 + Math.random() * (backoff / 2);
      console.log(`Attempt ${attempt + 1} failed; retrying in ${Math.round(delay)} ms`);
      await wait(delay);
    }
  }
  throw lastError;
}
```

Walkthrough:

- The loop tries the operation up to `attempts` times. On success, it **returns** immediately.
- On failure, it stops if this was the last attempt, or if the error is **not worth retrying** — decided by the `isRetryable` function the caller supplies. For HTTP, you typically retry network errors, `429 Too Many Requests` and `5xx` server errors, but **never** `4xx` client errors like `400` or `404`: a wrong request will stay wrong.
- **Exponential backoff:** the wait doubles each time (`baseDelayMs * 2 ** attempt`): 200, 400, 800 milliseconds… capped at `maxDelayMs`. This gives a struggling service time to recover ({{ch:loops}}).
- **Jitter:** the actual wait is a **random** amount between half and all of the backoff. This is the part most people forget, and it matters enormously. If a thousand clients all failed at the same moment and all retried after exactly 200 milliseconds, they would hit the recovering service at the same instant and knock it over again — a problem called the **thundering herd**. Random jitter spreads the retries out.
- If every attempt fails, the last error is thrown.

> [!WARNING]
> **Only retry operations that are safe to repeat.** Retrying a GET is harmless. Retrying "charge this card" after a timeout might charge the customer twice, if the first attempt actually succeeded but its response was lost. Operations that change data must be **idempotent** before you retry them — typically by sending an **idempotency key** the server uses to recognise repeats ({{ch:how-the-web-works}}).

### 3. Circuit breakers

When a dependency is **completely** down, even careful retries waste time: every request waits for its full timeout and retries before failing. With heavy traffic, your own application fills up with waiting requests and fails too — the other service's outage becomes **yours**. This chain reaction is called a **cascading failure**.

A **circuit breaker** prevents it. Like an electrical circuit breaker, it "trips" after repeated failures, and for a cool-down period it **fails immediately** without even calling the dependency. After the cool-down, it lets one trial request through; if that succeeds, normal service resumes.

```text
   CLOSED  ---- too many failures ---->  OPEN  ---- cool-down passes ---->  HALF-OPEN
  (calls go                            (fail fast,                       (allow one
   through)                             no calls)                         trial call)
     ^                                                                       |
     +------------------------ trial succeeds -------------------------------+
                               (trial fails -> back to OPEN)
```

You will implement and use circuit breakers properly in {{ch:distributed-systems}}; for now, recognise the idea: **stop hammering something that is clearly broken.**

### 4. Limited concurrency

`Promise.all` starts **everything at once**. That is perfect for three requests. For ten thousand, it is a disaster:

```js
// Dangerous: 10,000 simultaneous requests
await Promise.all(userIds.map((id) => fetchUser(id)));
```

Ten thousand simultaneous connections can exhaust your server's resources, trigger the remote API's rate limits ({{ch:rate-limiting}}), and often finish **slower** than a controlled approach, because everything competes. The solution is **limited concurrency**: never more than a fixed number of operations in flight at once.

```js
async function mapWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function runWorker() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex++;
      results[index] = await worker(items[index], index);
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => runWorker());
  await Promise.all(workers);
  return results;
}

const ids = Array.from({ length: 10 }, (_, i) => i + 1);
console.time("10 items, 3 at a time");
const users = await mapWithConcurrency(ids, 3, async (id) => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  return `user-${id}`;
});
console.timeEnd("10 items, 3 at a time");
console.log(users);
```

**Output (approximately):**

```text
10 items, 3 at a time: 1.208s
[
  'user-1', 'user-2',
  'user-3', 'user-4',
  'user-5', 'user-6',
  'user-7', 'user-8',
  'user-9', 'user-10'
]
```

Walkthrough:

- `limit` "workers" are started — here, three. Each worker repeatedly takes the next unprocessed index, processes that item, and stores the result **at the same index**, so results stay in the original order.
- `nextIndex` is shared by all workers through a closure ({{ch:scope-and-closures}}). Because JavaScript runs one piece of code at a time, the two lines that read and increase `nextIndex` cannot be interrupted between workers, so no item is processed twice.
- With 10 items, 3 at a time, each taking 300 ms, the work takes about four rounds: roughly 1.2 seconds — versus 3 seconds one by one, without ever having more than three requests in flight.

Libraries such as `p-limit` provide the same capability in well-tested form; the important thing is to recognise when you need it.

## From beginner to enterprise: asynchronous code at every level

**Level 3 — A small program.** `async` functions, `await`, `try...catch`, and `fetch` with a status check. Independent requests run with `Promise.all`.

**Level 4 — A real application.** Every database query, file operation and outgoing API call in a Node.js server is asynchronous, so one process serves many users at once. Each request handler is an `async` function; errors are caught and turned into proper HTTP responses ({{ch:error-handling}}). Frontends fetch data in parallel and show loading states while waiting.

**Level 5 — Professional engineering.** Every outgoing call has a timeout. Retries are limited, use backoff with jitter, and only apply to safe, retryable operations. Batch jobs use limited concurrency. Linters forbid floating promises. Teams understand which work is waiting-bound (ideal for asynchronous code) and which is CPU-bound (where asynchronous code does **not** help, as the next chapter explains).

**Level 6 — Enterprise.** Calls between services are protected with timeouts, retries, circuit breakers and **bulkheads** (separate resource pools, so that one slow dependency cannot consume everything). Long-running work is moved out of request handling entirely, into **queues** processed by background workers ({{ch:queues}}). Requests carry deadlines across services, so that work for a user who has already given up is cancelled everywhere. These are the foundations of the distributed systems in Part XI.

## Real-world use cases

### Beginner level — A weather widget

**Situation:** a learner builds a page showing the weather for a city using a public API.

**Solution:** an `async` function that `fetch`es the data, checks `response.ok`, parses JSON and shows the temperature, with a friendly message in `catch`.

**Lesson:** the network can fail, so the code says what happens when it does.

### Intermediate level — A slow dashboard made fast

**Business problem:** a SaaS company's dashboard takes four seconds to load.

**Technical problem:** the backend fetches the account, usage statistics, invoices and team members one after another, each taking about a second.

**Solution:** the four queries are independent, so they run in parallel with `Promise.all`. Load time drops to about one second.

**Trade-off:** four queries now hit the database at the same moment. That is fine for four, but the team watches database load as traffic grows.

### Advanced level — Sending a newsletter to 200,000 customers

**Business problem:** an online shop sends a weekly newsletter through an email service whose API allows at most 50 requests per second.

**Technical problem:** a first version used `Promise.all` over all customers, which hit the rate limit immediately, received thousands of `429` errors, and crashed.

**Solution:** limited concurrency (a few dozen requests in flight), retries with backoff and jitter for `429` and `5xx`, `allSettled`-style reporting of individual failures, and a record of who has been sent the email so that a restart does not send duplicates.

**Reasoning:** the job is waiting-bound and large, so it needs concurrency — but controlled concurrency that respects the other system's limits.

### Enterprise level — A cascading failure, prevented

**Business problem (illustrative, but a common real pattern):** a travel-booking platform calls a third-party currency-conversion service on every search. One day that service becomes extremely slow.

**Without protection:** every search waits 30 seconds for the conversion call; the platform's servers fill up with waiting requests; the whole site stops responding — not just currency conversion.

**With protection:** a two-second timeout, a circuit breaker that opens after repeated failures, and a fallback that shows prices in the original currency with a note. The site stays up; one feature degrades gracefully.

**Lesson:** asynchronous code lets you wait efficiently, but you must still decide **how long** to wait, **how often** to retry, and **what to do** when waiting fails.

## Common mistakes

### Beginner mistake — Expecting asynchronous code to run in written order

**What it looks like:** using a variable that an asynchronous callback has not yet set, or logging "done" before the work is done.

**How to fix it:** use `await` (or `then`) so that code that needs a result runs **after** the result exists.

### Beginner mistake — Forgetting `await`

**What it looks like:** `Promise { <pending> }` printed instead of a value; `NaN` from arithmetic on a promise; operations "finishing" before they have.

**How to fix and prevent it:** `await` every promise whose result or completion you need; enable lint rules for floating promises.

### Beginner mistake — Using `await` outside an `async` function

**What it looks like:** `SyntaxError: await is only valid in async functions and the top level bodies of modules`.

**How to fix it:** mark the function `async`, or use top-level await in an ES module.

### Intermediate mistake — `await` in `forEach`

**What it looks like:** a loop that "finishes" instantly, with work continuing afterwards and errors becoming unhandled rejections.

**How to fix it:** `for...of` with `await` for sequential work; `Promise.all` with `map` for parallel work.

### Intermediate mistake — Not checking `response.ok`

**What it looks like:** code treating a `404` or `500` response's error page as data, often failing later with a confusing JSON parse error.

**How to fix it:** check `response.ok` (or the status) before reading the body, and throw a clear error otherwise.

### Intermediate mistake — Accidental sequential waiting

**What it looks like:** `await` on independent operations one after another, making a page several times slower than necessary.

**How to fix it:** start independent operations together and await `Promise.all`.

### Production mistake — No timeouts

**What it looks like:** a slow external service making your whole application unresponsive.

**How to prevent it:** a timeout on every call that leaves your process.

### Production mistake — Unlimited or unsafe retries

**What it looks like:** retry loops without limits, without backoff or jitter, or retrying non-idempotent operations.

**What happens:** overloaded services stay overloaded; customers are charged twice.

**How to prevent it:** limited attempts, exponential backoff with jitter, retry only retryable errors, and idempotency keys for writes.

### Enterprise mistake — Unbounded fan-out

**What it looks like:** `Promise.all` over thousands of items, or one incoming request triggering hundreds of outgoing calls.

**What happens:** resource exhaustion, rate-limit errors, and failures that spread to other services.

**How to prevent it:** limited concurrency; batching; moving large jobs to queues.

## Debugging and troubleshooting

| Symptom | Likely cause |
|---|---|
| `Promise { <pending> }` printed | Missing `await` |
| `NaN` or `undefined` where a fetched value was expected | Missing `await`, or reading `.json()` without awaiting it |
| "Done" printed before the work finishes | Missing `await`; `forEach` with an async callback |
| `UnhandledPromiseRejection` / process exits with an error | A rejected promise with no `catch` or `try` |
| `await is only valid in async functions...` | `await` used in a non-async function |
| `SyntaxError: Unexpected token '<'` when parsing JSON | The server returned an HTML error page; `response.ok` was not checked |
| `TypeError: fetch failed` | Network-level failure: DNS, connection refused, no internet ({{ch:how-the-internet-works}}) |
| The request hangs for a very long time | No timeout on a slow dependency |
| Works for a few items, fails for thousands | Unbounded concurrency hitting limits |
| Results in the wrong order | Collecting results as they finish instead of by index; `Promise.all` keeps order |

> [!TIP]
> When asynchronous code runs in a confusing order, add numbered log lines — `console.log("1 before fetch")`, `console.log("2 after fetch")`, `console.log("3 after loop")` — and compare the printed order with what you expected. The debugger ({{ch:errors-and-debugging}}) also works across `await`: set a breakpoint after an `await` line and the program pauses there once the promise settles, with all local variables visible.

## How a senior engineer thinks about asynchronous code

> [!SENIOR]
> - **What am I waiting for, and how long am I willing to wait?** Every external call gets a timeout chosen on purpose.
> - **What depends on what?** Independent work runs in parallel; dependent work runs in sequence. Drawing the dependencies is often the fastest performance win available.
> - **What if this fails halfway?** Is the operation safe to retry? Is there clean-up to do? Is anyone told?
> - **How many at once?** Concurrency is limited deliberately — enough to be fast, not so much that it overwhelms either side.
> - **Is every promise owned?** Every promise is awaited or handled somewhere; nothing floats.
> - **Is this waiting or computing?** Asynchronous code makes *waiting* efficient. It does nothing for heavy *computation*, which blocks everything — the subject of the next chapter.

## Exercises

### Exercise 1 — Predict the order

**Objective:** practise reasoning about when asynchronous code runs.

**What to do:** predict the output order, then run it.

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

<details>
<summary>Show the solution</summary>

**Output:**

```text
1
4
6
3
5
2
```

Walkthrough:

- `1` prints immediately.
- `setTimeout(..., 0)` schedules `2` for **later**.
- `Promise.resolve().then(...)` schedules `3` for later too.
- The async arrow function is **called immediately**, so `4` prints right away. Then `await null` pauses it; the rest (`5`) will continue later.
- `6` prints — the end of the synchronous code.
- Then the scheduled callbacks run: `3` and `5` (promise continuations) **before** `2` (the timer).

Why do promise callbacks run before a zero-millisecond timer? Because JavaScript keeps **two different queues** for waiting callbacks, and the promise queue is always emptied first. That is exactly what the next chapter, {{ch:the-event-loop}}, explains. For now, the key facts are: synchronous code first, then promise continuations, then timers.

**Common wrong approach:** expecting `2` to print second because its delay is zero. Zero means "after the current work", and promise callbacks have priority over timers.

</details>

### Exercise 2 — Sequential versus parallel

**Objective:** practise `async`/`await`, `Promise.all` and timing.

**What to build:** using the `wait` helper, write three async functions — `getStock()` (800 ms, returns 42), `getPrice()` (500 ms, returns 129950) and `getReviews()` (1000 ms, returns 4.6). Fetch all three sequentially and print the time taken, then in parallel and print the time taken. Then print `"42 in stock, Rs 1299.50, rated 4.6"`.

<details>
<summary>Show the solution</summary>

```js
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function getStock() { await wait(800); return 42; }
async function getPrice() { await wait(500); return 129950; }
async function getReviews() { await wait(1000); return 4.6; }

console.time("sequential");
await getStock();
await getPrice();
await getReviews();
console.timeEnd("sequential");

console.time("parallel");
const [stock, pricePaisa, rating] = await Promise.all([getStock(), getPrice(), getReviews()]);
console.timeEnd("parallel");

console.log(`${stock} in stock, Rs ${(pricePaisa / 100).toFixed(2)}, rated ${rating}`);
```

**Output (approximately):**

```text
sequential: 2.305s
parallel: 1.002s
42 in stock, Rs 1299.50, rated 4.6
```

Walkthrough:

- Sequentially, the waits add up: 800 + 500 + 1000 = 2,300 ms.
- In parallel, all three start together, and `Promise.all` finishes when the **slowest** (1,000 ms) finishes.
- The results come back in the order of the array passed to `Promise.all` — stock, price, rating — regardless of which finished first, so destructuring is reliable.

(Save the file with a `.mjs` extension, or in a project with `"type": "module"`, so top-level `await` works.)

**Common wrong approach:** writing `const stock = await getStock(); const price = await getPrice(); ...` and calling it "parallel" because the calls are close together. Each `await` waits before the next call **starts**. Parallelism comes from starting the operations before awaiting any of them.

</details>

### Exercise 3 — A robust API helper

**Objective:** practise `fetch`, status checks, timeouts and retries.

**What to build:** a function `getJSONWithRetry(url)` that:

1. fetches the URL with a 3-second timeout;
2. throws an error containing the status if `response.ok` is false, with the status attached as `error.status`;
3. retries up to 3 attempts, with backoff and jitter, **only** for network errors, timeouts, `429` and `5xx` statuses;
4. returns the parsed JSON.

Test it with `https://jsonplaceholder.typicode.com/todos/1` (should succeed) and `https://jsonplaceholder.typicode.com/todos/999999` (404 — should fail immediately, without retrying).

**Hint:** reuse the `withRetry` function from this chapter.

<details>
<summary>Show the solution</summary>

```js
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function withRetry(operation, { attempts = 3, baseDelayMs = 200, maxDelayMs = 2000, isRetryable = () => true } = {}) {
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt === attempts - 1 || !isRetryable(error)) break;
      const backoff = Math.min(baseDelayMs * 2 ** attempt, maxDelayMs);
      await wait(backoff / 2 + Math.random() * (backoff / 2));
    }
  }
  throw lastError;
}

function isRetryable(error) {
  if (error.status === undefined) return true;          // network error or timeout
  return error.status === 429 || error.status >= 500;   // rate-limited or server error
}

async function getJSONWithRetry(url) {
  return withRetry(
    async () => {
      const response = await fetch(url, { signal: AbortSignal.timeout(3000) });
      if (!response.ok) {
        const error = new Error(`GET ${url} failed with status ${response.status}`);
        error.status = response.status;
        throw error;
      }
      return response.json();
    },
    { isRetryable },
  );
}

const todo = await getJSONWithRetry("https://jsonplaceholder.typicode.com/todos/1");
console.log("Got:", todo.title);

try {
  await getJSONWithRetry("https://jsonplaceholder.typicode.com/todos/999999");
} catch (error) {
  console.log("Failed without retrying:", error.message);
}
```

**Output:**

```text
Got: delectus aut autem
Failed without retrying: GET https://jsonplaceholder.typicode.com/todos/999999 failed with status 404
```

Walkthrough:

- The operation passed to `withRetry` performs one attempt: fetch with a timeout signal, check `ok`, parse.
- HTTP errors become `Error` objects with a `status` property, so `isRetryable` can decide.
- Errors **without** a status are network failures or timeouts — worth retrying. `429` and `5xx` are retried. Everything else — like this `404` — fails immediately, because repeating a request for something that does not exist cannot succeed.

**Common wrong approach:** retrying every error. The `404` would be requested three times, wasting time, and a `400 Bad Request` caused by your own bug would be "retried" instead of being fixed.

</details>

### Exercise 4 — The order that wasn't saved (debugging)

**Objective:** practise finding asynchronous bugs.

**The scenario:** this checkout code tells customers their order was placed, but some orders never appear in the system, and the server sometimes crashes with an unhandled rejection.

```js
async function saveOrder(order) {
  await new Promise((resolve) => setTimeout(resolve, 100));
  if (order.items.length === 0) {
    throw new Error("Cannot save an empty order");
  }
  console.log(`Saved order ${order.id}`);
}

async function sendReceipts(orders) {
  orders.forEach(async (order) => {
    await sendReceipt(order);
  });
}

async function sendReceipt(order) {
  console.log(`Receipt sent for ${order.id}`);
}

async function checkout(order) {
  saveOrder(order);
  await sendReceipts([order]);
  return "Order placed!";
}

console.log(await checkout({ id: "ORD-7", items: [] }));
```

**What to do:** run it, explain the output, find both bugs and fix them.

<details>
<summary>Show the solution</summary>

**Output of the original:**

```text
Receipt sent for ORD-7
Order placed!
...then, 100 ms later, the process crashes:
Error: Cannot save an empty order
```

**Bug 1 — `saveOrder` is not awaited.** `checkout` starts the save and immediately moves on. It reports "Order placed!" before the save has finished — and, here, the save fails. Because nothing awaits that promise, its rejection is **unhandled**, which crashes the process later, far from the cause. In production, this also means orders reported as placed may never have been saved.

**Bug 2 — `forEach` with an async callback.** `sendReceipts` returns before the receipts are sent, and any failure in `sendReceipt` would also be an unhandled rejection. Here it happens to log quickly, which hides the problem.

**Fixed version:**

```js
async function sendReceipts(orders) {
  await Promise.all(orders.map((order) => sendReceipt(order)));
}

async function checkout(order) {
  await saveOrder(order);
  await sendReceipts([order]);
  return "Order placed!";
}

try {
  console.log(await checkout({ id: "ORD-7", items: [] }));
} catch (error) {
  console.log("Checkout failed:", error.message);
}

console.log(await checkout({ id: "ORD-8", items: ["Cap"] }));
```

**Output:**

```text
Checkout failed: Cannot save an empty order
Saved order ORD-8
Receipt sent for ORD-8
Order placed!
```

Walkthrough of the fix:

- `await saveOrder(order)` makes checkout wait for the save, so an error stops checkout **before** any receipt is sent or success reported — and the error reaches the caller's `catch` instead of crashing the process.
- `Promise.all(orders.map(...))` waits for every receipt (in parallel), and passes any failure up to the caller.
- The order of operations is now guaranteed: save, then receipts, then success.

**Lesson:** a missing `await` does not cause an error where it is missing. It causes wrong behaviour *now* and an error *later*, somewhere else. When asynchronous code reports success too early, or crashes with unhandled rejections, look for promises that nobody awaits.

</details>

## Summary

**Synchronous** code runs step by step, each step finishing before the next; **asynchronous** code starts slow work, continues with other things, and handles the result later. JavaScript runs on one thread, so waiting must be **non-blocking**. Timers (`setTimeout`, `setInterval`) show the core rule: asynchronous callbacks run **later**, after the current code finishes — even with a zero delay.

**Error-first callbacks** were the original pattern, but sequences of them became **callback hell**. A **promise** represents a future result and is **pending**, then **fulfilled** with a value or **rejected** with an error; once **settled**, it never changes. `then`, `catch` and `finally` register reactions; `then` returns a new promise, so steps **chain** flatly with one `catch` at the end. `new Promise((resolve, reject) => ...)` wraps older APIs.

**`async` functions** always return promises; **`await`** pauses only that function until a promise settles, returning its value or throwing its error, so ordinary `try...catch` works. **Top-level await** works in ES modules. Every promise must be handled, or an **unhandled rejection** crashes Node.js. Common bugs: forgetting `await`, `await` inside `forEach`, and timers in `var` loops.

Run dependent steps **sequentially** and independent ones **in parallel** with `Promise.all` (fails fast), `Promise.allSettled` (every outcome), `Promise.race` or `Promise.any`. **`fetch`** makes HTTP requests; it rejects only for network failures, so always check `response.ok`. In production, protect every external call with **timeouts** (`AbortSignal`), **retries** with exponential backoff and **jitter** (only for retryable, idempotent operations), **circuit breakers** against cascading failure, and **limited concurrency** instead of unbounded fan-out.

## Key terms

- **Synchronous** — Running one step at a time, with each step finishing before the next begins.
- **Asynchronous** — Starting an operation that finishes later, while the program continues with other work.
- **Blocking** — Describes an operation that makes the whole program wait until it finishes.
- **Non-blocking** — Describes an operation that returns immediately and completes in the background.
- **`setTimeout`** — A function that calls a callback once after a delay in milliseconds.
- **`setInterval`** — A function that calls a callback repeatedly at a fixed interval.
- **`clearTimeout` / `clearInterval`** — Functions that cancel a timer before it fires.
- **Error-first callback** — A Node.js callback convention in which the first parameter is an error (or `null`) and the result comes second.
- **Callback hell** — Deeply nested callbacks that make asynchronous sequences hard to read and maintain.
- **Promise** — An object representing the eventual result of an asynchronous operation.
- **Pending** — The state of a promise whose operation has not finished.
- **Fulfilled** — The state of a promise whose operation succeeded, holding a value.
- **Rejected** — The state of a promise whose operation failed, holding an error.
- **Settled** — Describes a promise that is fulfilled or rejected; it never changes state again.
- **`then` / `catch` / `finally`** — Promise methods that register functions to run on fulfilment, rejection, or either.
- **Promise chaining** — Linking `then` calls so each step runs after the previous one, with errors flowing to a single `catch`.
- **Executor** — The function passed to `new Promise`, which receives `resolve` and `reject`.
- **`resolve` / `reject`** — Functions given to a promise's executor to fulfil or reject the promise.
- **`async` function** — A function that always returns a promise and may use `await` inside.
- **`await`** — An operator that pauses an `async` function until a promise settles, returning its value or throwing its error.
- **Top-level await** — Using `await` directly at the top level of an ES module, outside any function.
- **Unhandled rejection** — A rejected promise that no code handles; in Node.js it stops the process.
- **Floating promise** — A promise that is created but never awaited or handled.
- **Concurrency** — Several tasks making progress during the same period of time.
- **Parallel (in this context)** — Several operations in progress at the same time, such as requests started together.
- **`Promise.all`** — Combines promises into one that fulfils with all values, or rejects as soon as any rejects.
- **`Promise.allSettled`** — Combines promises into one that fulfils when all have settled, with each outcome described.
- **`Promise.race`** — Combines promises into one that settles the same way as the first to settle.
- **`Promise.any`** — Combines promises into one that fulfils with the first success, rejecting only if all fail.
- **Combinator** — A function that combines several things, such as promises, into one.
- **`fetch`** — The built-in function for making HTTP requests, returning a promise for a Response.
- **Response object** — The object `fetch` provides, with the status, headers and methods to read the body.
- **`response.ok`** — True when an HTTP response's status is between 200 and 299.
- **`AbortController` / `AbortSignal`** — Built-in tools for cancelling asynchronous operations such as `fetch`.
- **Timeout** — A limit on how long to wait for an operation before giving up.
- **Retry** — Trying a failed operation again.
- **Exponential backoff** — Doubling the wait between successive retries.
- **Jitter** — Randomness added to retry delays so many clients do not retry at the same moment.
- **Thundering herd** — Many clients retrying or acting at the same instant and overwhelming a service.
- **Cascading failure** — A failure in one component that spreads to others that depend on it.
- **Circuit breaker** — A mechanism that stops calling a failing dependency for a while and fails fast instead.
- **Limited (bounded) concurrency** — Allowing only a fixed number of operations to run at the same time.
- **`ENOENT`** — The Node.js error code meaning "no such file or directory".

## What comes next

You can now write asynchronous code that waits efficiently, handles errors and survives unreliable networks. But one question remains: **how** does a single thread manage all of this? Where do callbacks wait, and who decides when they run? Why did promise callbacks run before a zero-millisecond timer? And why does one slow calculation freeze an entire Node.js server, even though everything is "asynchronous"?

In the next chapter, **The Event Loop: How JavaScript Does Many Things at Once**, you will look inside the engine and runtime at the machinery that makes asynchronous JavaScript work — the call stack, the task queues and the event loop itself — and learn how to keep it healthy in real applications.
