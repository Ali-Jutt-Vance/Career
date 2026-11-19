# Advanced JavaScript: Iterators, Generators, Proxies and Memory

> [!GOALS]
> - How `for...of`, spread and destructuring really work underneath: the iteration protocol.
> - How to make your own objects iterable.
> - What generator functions are, how they pause and resume, and how they produce values lazily — even infinite sequences.
> - How async iterators and `for await...of` handle data that arrives over time, such as paginated APIs and streams.
> - What symbols are, and the "well-known" symbols that let your objects plug into the language.
> - How proxies intercept operations on objects, and where frameworks use them.
> - How to work with dates and time zones correctly.
> - How JavaScript manages memory: the stack, the heap and garbage collection.
> - The common causes of memory leaks, how to find them, and how `WeakMap` and friends help.
> - How the V8 engine optimises code, and the few habits that keep your code fast.

## Why this matters

You now know the core of JavaScript. This chapter covers the parts of the language that appear less often in beginner code but constantly in **libraries, frameworks and production systems**:

- When a database library lets you write `for await (const row of query)`, or an API client hands you pages of results one at a time, it is using **iterators**.
- When Vue updates the screen automatically after you change a variable, or a testing tool records every call to a function, **proxies** are often involved.
- When a Node.js server's memory slowly climbs for days and then crashes, the cause is a **memory leak**, and finding it requires understanding how memory works.
- When a delivery date shows as the wrong day for customers in another country, the cause is almost always **time zones**.

None of these is needed to write your first programs. All of them are needed to understand the tools you will use, and to fix the problems that experienced engineers are called in to fix.

## The simple idea

This chapter has four themes, each with a simple core:

- **Iterators** — a standard way of saying "give me the next item", so that any collection — or any source of data — can be walked through with `for...of`.
- **Generators** — functions that can **pause** in the middle, hand out a value, and later **resume** where they left off.
- **Proxies** — a wrapper around an object that can **intercept** every attempt to read or change it, like a receptionist who sees everyone who comes in.
- **Memory management** — JavaScript automatically cleans up values that nothing can reach any more; a "leak" is when something keeps holding on to values you no longer need.

## The proper definition and key words

- An **iterable** is an object that can be walked through with `for...of` — it has a method that produces an iterator.
- An **iterator** is an object with a `next()` method that returns the items one at a time.
- The **iteration protocol** is the agreement — the set of method names and return shapes — that iterables and iterators follow.
- A **generator** is a special function, written `function*`, that produces an iterator and can pause at `yield`.
- **Lazy evaluation** means producing values only when they are asked for, rather than all in advance.
- A **symbol** is a primitive value that is guaranteed to be unique, often used as a special property key.
- A **proxy** is an object that wraps another object and intercepts operations on it.
- **Garbage collection** is the automatic process of freeing memory that a program can no longer use.
- A **memory leak** is memory that a program no longer needs but cannot free, because something still refers to it.

## The iteration protocol

### Level 1 — What `for...of` really does

You have used `for...of` on strings ({{ch:loops}}), arrays ({{ch:arrays}}), `Map`s and `Set`s ({{ch:objects}}). But you cannot use it on a plain object:

```js
const stock = { lahore: 120, karachi: 85 };
for (const item of stock) {
  console.log(item);
}
```

**Output:**

```text
TypeError: stock is not iterable
```

What makes arrays and strings "iterable" but not plain objects? A shared agreement called the **iteration protocol**. You can follow it by hand to see what `for...of` does behind the scenes:

```js
const cities = ["Lahore", "Karachi"];

const iterator = cities[Symbol.iterator]();
console.log(iterator.next());
console.log(iterator.next());
console.log(iterator.next());
```

**Output:**

```text
{ value: 'Lahore', done: false }
{ value: 'Karachi', done: false }
{ value: undefined, done: true }
```

Walkthrough:

- Every iterable has a method stored under a special key, **`Symbol.iterator`** (symbols are explained later in this chapter; for now, treat it as a special, reserved property name).
- Calling that method returns an **iterator**: an object with a **`next()`** method.
- Each call to `next()` returns an object with two properties: **`value`** — the next item — and **`done`** — `false` while there are items, `true` when finished.

A `for...of` loop simply does this for you:

```text
  for (const city of cities) { ... }

  1. iterator = cities[Symbol.iterator]()
  2. result = iterator.next()
  3. if result.done is true -> stop
  4. city = result.value; run the loop body
  5. go back to step 2
```

The same protocol powers **spread** (`[...cities]`), **array destructuring** (`const [first] = cities`), `Array.from`, `Promise.all`, and the constructors of `Map` and `Set`. Anything that follows the protocol works with all of them.

### Level 2 — Making your own iterable

Because the protocol is just methods and objects, you can make your own objects iterable. Here is a `DateRange` that produces each day between two dates (using simple day numbers to keep the focus on iteration):

```js
class DayRange {
  constructor(firstDay, lastDay) {
    this.firstDay = firstDay;
    this.lastDay = lastDay;
  }

  [Symbol.iterator]() {
    let current = this.firstDay;
    const last = this.lastDay;
    return {
      next() {
        if (current > last) {
          return { value: undefined, done: true };
        }
        return { value: current++, done: false };
      },
    };
  }
}

const week = new DayRange(1, 5);

for (const day of week) {
  console.log("Day", day);
}
console.log([...week]);
```

**Output:**

```text
Day 1
Day 2
Day 3
Day 4
Day 5
[ 1, 2, 3, 4, 5 ]
```

Walkthrough:

- `[Symbol.iterator]() { ... }` defines a method whose name is the symbol — the square brackets are a **computed key** ({{ch:objects}}).
- Each time it is called, it creates a fresh `current` counter and returns a new iterator object. Its `next` method closes over `current` ({{ch:scope-and-closures}}).
- `next` returns `{ value: current++, done: false }` — the current day, then moves on — until it passes the last day.
- Because the class follows the protocol, `for...of` and spread work on it exactly as they work on arrays. Since a **new** iterator is created on each loop, the range can be walked through any number of times.

Writing iterator objects by hand like this is a little clumsy. Generators make it far easier.

## Generators

### Level 2 — Functions that pause

A **generator function** is written with an asterisk, `function*`. Calling it does **not** run its body. Instead, it returns a **generator object** — which is an iterator. Each call to `next()` runs the body until the next **`yield`**, which hands out a value and **pauses** the function right there. The next `next()` resumes from exactly that point.

```js
function* orderStatuses() {
  console.log("  (starting)");
  yield "pending";
  console.log("  (resumed after pending)");
  yield "shipped";
  console.log("  (resumed after shipped)");
  yield "delivered";
  console.log("  (finished)");
}

const statuses = orderStatuses();
console.log("Generator created; nothing has run yet");
console.log(statuses.next());
console.log(statuses.next());
console.log(statuses.next());
console.log(statuses.next());
```

**Output:**

```text
Generator created; nothing has run yet
  (starting)
{ value: 'pending', done: false }
  (resumed after pending)
{ value: 'shipped', done: false }
  (resumed after shipped)
{ value: 'delivered', done: false }
  (finished)
{ value: undefined, done: true }
```

Walkthrough:

- Calling `orderStatuses()` printed nothing: the body had not started.
- The first `next()` ran the body from the top until the first `yield`, printing "(starting)" and producing `"pending"`.
- Each further `next()` resumed exactly after the previous `yield`, with all local variables intact — just like an `async` function resuming after `await` ({{ch:asynchronous-javascript}}). (In fact, `async`/`await` was designed with ideas from generators.)
- After the last `yield`, the function ran to its end, and `next()` reported `done: true`.

Because a generator object is an iterator, it works with `for...of` and spread:

```js
for (const status of orderStatuses()) {
  console.log(status);
}
```

And the `DayRange` iterator from earlier becomes much shorter:

```js
class DayRange {
  constructor(firstDay, lastDay) {
    this.firstDay = firstDay;
    this.lastDay = lastDay;
  }

  *[Symbol.iterator]() {
    for (let day = this.firstDay; day <= this.lastDay; day++) {
      yield day;
    }
  }
}

console.log([...new DayRange(1, 5)]);
```

**Output:**

```text
[ 1, 2, 3, 4, 5 ]
```

The `*` before the method name makes it a generator method. The loop and `yield` replace the hand-written `next` and `done` bookkeeping entirely.

### Level 3 — Lazy and infinite sequences

Generators produce values **lazily** — only when asked. That makes something possible that arrays cannot do: an **infinite** sequence.

```js
function* invoiceNumbers(prefix) {
  let n = 1;
  while (true) {
    yield `${prefix}-${String(n).padStart(5, "0")}`;
    n++;
  }
}

const numbers = invoiceNumbers("INV");
console.log(numbers.next().value);
console.log(numbers.next().value);
console.log(numbers.next().value);
```

**Output:**

```text
INV-00001
INV-00002
INV-00003
```

`while (true)` would be an infinite loop in a normal function ({{ch:loops}}), freezing everything. In a generator, it is safe: the function pauses at every `yield` and only produces the next number when asked. (Never spread an infinite generator — `[...invoiceNumbers("INV")]` would try to build an infinite array and run out of memory.)

Laziness also saves work and memory with **large** data. You can build processing pipelines that handle one item at a time:

```js
function* take(iterable, count) {
  let taken = 0;
  for (const item of iterable) {
    if (taken >= count) return;
    yield item;
    taken++;
  }
}

function* filter(iterable, test) {
  for (const item of iterable) {
    if (test(item)) yield item;
  }
}

function* naturalNumbers() {
  let n = 1;
  while (true) yield n++;
}

const firstFiveMultiplesOfSeven = take(filter(naturalNumbers(), (n) => n % 7 === 0), 5);
console.log([...firstFiveMultiplesOfSeven]);
```

**Output:**

```text
[ 7, 14, 21, 28, 35 ]
```

Each number flows through the pipeline one at a time: `naturalNumbers` produces it, `filter` passes or drops it, `take` counts it. Only 35 numbers are ever generated, and no array of intermediate results is ever built. Compare this with `map` and `filter` on arrays ({{ch:arrays}}), which build a full new array at every step — fine for small data, wasteful or impossible for huge or endless data.

> [!NOTE]
> Modern JavaScript has started adding these helpers directly to iterators — `iterator.map(...)`, `iterator.filter(...)`, `iterator.take(...)` — called **iterator helpers**, available in recent versions of Node.js and browsers. Writing them yourself, as above, is still the best way to understand how they work.

## Async iterators: data that arrives over time

### Level 4 — `for await...of`

Generators produce values that are ready immediately. But much real data arrives **over time**: pages of results from an API, rows from a database, chunks of a file or a network response. For these, JavaScript has **async iterators**, walked through with **`for await...of`**.

An async generator, written `async function*`, can both `await` and `yield`. Here is the most common real use — walking through a **paginated API**, where results come in pages and each response says whether there is another page:

```js
async function* fetchAllPosts() {
  const pageSize = 25;
  let page = 1;
  while (true) {
    const url = `https://jsonplaceholder.typicode.com/posts?_page=${page}&_limit=${pageSize}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Page ${page} failed: ${response.status}`);
    const posts = await response.json();
    if (posts.length === 0) return;          // no more pages
    for (const post of posts) {
      yield post;
    }
    page++;
  }
}

let count = 0;
for await (const post of fetchAllPosts()) {
  count++;
  if (count === 1) console.log("First title:", post.title);
}
console.log("Total posts:", count);
```

**Output:**

```text
First title: sunt aut facere repellat provident occaecati excepturi optio reprehenderit
Total posts: 100
```

Walkthrough:

- `async function* fetchAllPosts()` is an **async generator**. It fetches one page at a time with `await`, then `yield`s each post on that page.
- The `_page` and `_limit` query parameters ask this test API for a page of results ({{ch:how-the-web-works}}).
- When a page comes back empty, `return` ends the generator.
- **`for await (const post of ...)`** takes one item at a time, waiting whenever the next item requires the next page to be fetched.
- The **caller** sees a simple loop over posts. All the paging logic is hidden inside the generator — and pages are fetched only as the loop needs them. If the loop broke out early, no further pages would be requested at all.

This exact pattern is used by many official API client libraries (for payments, cloud services and others) to let you loop over "all customers" or "all invoices" without thinking about pages.

Node.js **streams** — data that arrives in chunks, such as a large file being read ({{ch:nodejs}}) — are also async iterables, so you can process a huge file one chunk at a time with `for await...of`, using little memory however large the file is.

## Symbols

### Level 3 — Unique keys

A **symbol** is a primitive value (one of the seven from {{ch:types-of-data}}) whose defining feature is that **every symbol is unique**:

```js
const id1 = Symbol("id");
const id2 = Symbol("id");

console.log(id1 === id2);
console.log(typeof id1);
console.log(id1.toString());
```

**Output:**

```text
false
symbol
Symbol(id)
```

The text `"id"` is only a **description** for debugging. Two symbols with the same description are still different values.

Symbols are mainly used as **property keys** that cannot collide with any other key:

```js
const internalId = Symbol("internalId");

const product = { title: "Cotton shirt", [internalId]: 9182 };

console.log(product[internalId]);
console.log(Object.keys(product));
console.log(JSON.stringify(product));
```

**Output:**

```text
9182
[ 'title' ]
{"title":"Cotton shirt"}
```

A symbol-keyed property is **hidden from ordinary iteration**: `Object.keys`, `for...in` and `JSON.stringify` all ignore it. This makes symbols useful for libraries that need to attach their own information to your objects without any risk of clashing with your property names, and without appearing in your JSON.

### Well-known symbols

JavaScript defines a set of built-in symbols, called **well-known symbols**, that let your objects plug into the language's own behaviour. You have already used the most important one: **`Symbol.iterator`**, which tells `for...of` how to iterate your object. A few others:

| Symbol | Lets your object control… |
|---|---|
| `Symbol.iterator` | how `for...of`, spread and destructuring walk through it |
| `Symbol.asyncIterator` | how `for await...of` walks through it |
| `Symbol.toPrimitive` | how it converts to a number or string (e.g. in `+obj` or template literals) |
| `Symbol.toStringTag` | the name shown by `Object.prototype.toString` |

This is the design idea behind symbols: the language reserves keys that **cannot** accidentally collide with your own property names, and uses them as hooks.

## Proxies and Reflect

### Level 4 — Intercepting operations on an object

A **proxy** wraps an object (the **target**) and lets you intercept fundamental operations on it — reading a property, setting a property, checking whether a property exists, deleting one — using **traps**: functions in a **handler** object.

```js
const product = { title: "Cotton shirt", pricePaisa: 129950 };

const logged = new Proxy(product, {
  get(target, property, receiver) {
    console.log(`read ${String(property)}`);
    return Reflect.get(target, property, receiver);
  },
  set(target, property, value, receiver) {
    console.log(`set ${String(property)} = ${value}`);
    return Reflect.set(target, property, value, receiver);
  },
});

const price = logged.pricePaisa;
logged.pricePaisa = 119950;
console.log(product.pricePaisa);
```

**Output:**

```text
read pricePaisa
set pricePaisa = 119950
119950
```

Walkthrough:

- `new Proxy(target, handler)` creates a proxy. Code uses the proxy exactly like a normal object.
- The **`get` trap** runs whenever a property is read through the proxy. It receives the target object, the property name and the receiver (the proxy itself). Here it logs and then forwards the operation.
- The **`set` trap** runs whenever a property is assigned. It must return `true` to signal success.
- **`Reflect`** is a built-in object with methods matching each trap — `Reflect.get`, `Reflect.set`, and so on — that perform the **default** behaviour. Using it inside traps is the standard way to say "now do what would normally happen".
- The change was made to the real `product` object underneath, as the last line shows.

### What proxies are used for

**Validation** — reject invalid values at the moment they are set:

```js
function createValidatedOrder(order) {
  return new Proxy(order, {
    set(target, property, value) {
      if (property === "quantity" && (!Number.isInteger(value) || value < 1)) {
        throw new RangeError(`Invalid quantity: ${value}`);
      }
      target[property] = value;
      return true;
    },
  });
}

const order = createValidatedOrder({ item: "Cap", quantity: 1 });
order.quantity = 3;
console.log(order.quantity);
order.quantity = -2;
```

**Output:**

```text
3
RangeError: Invalid quantity: -2
```

**Reactivity** — this is the big one. Front-end frameworks need to know **when your data changes**, so they can update the screen. **Vue 3**'s reactivity system is built on proxies: when a component reads `state.count`, the `get` trap records that the component depends on `count`; when code sets `state.count = 5`, the `set` trap knows exactly which parts of the page to update. Other tools use proxies for similar "observe changes" features, and testing libraries use them to record how objects are used.

**Other uses** include default values for missing properties, read-only views of objects, and logging access for debugging.

> [!WARNING]
> Proxies are powerful but should be used sparingly in application code. They make ordinary-looking operations — reading `order.quantity` — run hidden code, which can surprise readers, make debugging harder and slow down hot code paths. Use them when a framework or library genuinely needs to intercept access; prefer plain functions, getters and setters ({{ch:this-prototypes-classes}}) for everyday validation.

## Dates and time zones

### Level 3 — Why dates are hard

Dates look simple and cause a remarkable number of production bugs. A few reasons:

- The same **moment** is a different **local time** in different places. 9:00 am in Lahore is 4:00 am in London (outside summer time) and 11:00 pm the previous evening in New York.
- Some countries change their clocks for **daylight saving time**, so some local times happen twice in a year and some never happen at all.
- Months have different lengths; leap years add a day.
- Different countries write dates differently: `03/04/2026` is 3 April in Pakistan and the UK, but March 4 in the United States.

### The JavaScript `Date` object

JavaScript's built-in `Date` represents a single **moment in time**, stored internally as the number of milliseconds since 1 January 1970 at midnight **UTC** (Coordinated Universal Time — the world's reference time, with no time zone offset and no daylight saving).

```js
const moment = new Date("2026-11-19T10:30:00Z");

console.log(moment.getTime());
console.log(moment.toISOString());
console.log(moment.toLocaleString("en-PK", { timeZone: "Asia/Karachi" }));
console.log(moment.toLocaleString("en-GB", { timeZone: "Europe/London" }));
console.log(moment.toLocaleString("en-US", { timeZone: "America/New_York" }));
```

**Output:**

```text
1795084200000
2026-11-19T10:30:00.000Z
19/11/2026, 3:30:00 pm
19/11/2026, 10:30:00
11/19/2026, 5:30:00 AM
```

Walkthrough:

- `"2026-11-19T10:30:00Z"` is written in **ISO 8601** format, the international standard: year-month-day, a `T`, then the time. The **`Z`** at the end means "UTC".
- `getTime()` shows the internal number: milliseconds since 1970 UTC. This single number is what a `Date` really is.
- `toISOString()` gives the standard UTC text form — the best format for storing dates and sending them in JSON ({{ch:objects}}).
- `toLocaleString(locale, { timeZone })` **formats** the same moment for people in a particular place and language. One moment, three local times: 3:30 pm in Pakistan, 10:30 in London, 5:30 am in New York.

### The rules professionals follow

1. **Store and transmit moments in UTC**, in ISO 8601 format (or as a timestamp). Databases, APIs and logs all use UTC.
2. **Convert to local time only when displaying** to a person, using their time zone.
3. **Always include the `Z` (or an offset like `+05:00`) when parsing date-times.** Without it, `new Date("2026-11-19T10:30:00")` is interpreted in the **server's or browser's own** time zone — so the same code produces different moments on different machines. This single mistake causes a large share of date bugs.
4. **Distinguish a moment from a calendar date.** "The payment happened at 10:30 UTC" is a **moment**. "Your birthday is 19 November" or "delivery on Friday" is a **calendar date** with no time zone — store it as plain text such as `"2026-11-19"`, not as a midnight `Date`, which can shift to the previous day when shown in another time zone.
5. **Use `Intl.DateTimeFormat`** (or `toLocaleString`) for display, so dates appear in the format each user expects.

> [!NOTE]
> JavaScript's `Date` has well-known design flaws — months numbered from 0 (January is month 0), objects that can be changed in place, and limited time-zone support. A modern replacement called **Temporal**, with separate types for moments, calendar dates, times and time zones, has been designed by the JavaScript standards committee and is arriving in JavaScript environments. Until it is available everywhere you deploy, teams use `Date` carefully or a well-maintained library. Whichever you use, the rules above still apply.

## Memory management

### Level 3 — The stack and the heap

In {{ch:what-a-computer-is}} you learned that running programs keep their data in RAM. A JavaScript engine organises that memory into two main areas:

- **The stack** — the call stack's frames ({{ch:functions}}): each function call's parameters and local variables. Space is added when a function is called and removed automatically when it returns. Small, fast and tidy.
- **The heap** — a large, less organised area where **objects** live: arrays, objects, functions, closures' environments, and large strings. Values here stay until the engine decides they are no longer needed.

```text
     STACK (per call)                       HEAP (shared)
  +----------------------+
  | describeLine          |
  |   quantity: 2         |
  |   item: ref ---------------------->  { name: "Cap", pricePaisa: 49900 }
  +----------------------+
  | main                  |
  |   basket: ref --------------------->  { items: [ ... ] }  --> [ {...}, {...} ]
  +----------------------+
```

Variables that hold objects actually hold **references** to objects on the heap — which is exactly why objects and arrays are shared by reference ({{ch:arrays}}, {{ch:objects}}).

### Garbage collection: reachability

You never free memory yourself in JavaScript. The engine's **garbage collector** does it automatically. The key idea is **reachability**:

> An object is kept alive as long as it can be **reached** — by following references — from a set of starting points called **roots**: global variables, the variables of functions currently on the call stack, and a few others. Anything that cannot be reached from a root is garbage, and its memory can be reused.

```text
   ROOTS (globals, current stack)
      |
      v
   basket ----> items ----> item A          reachable: kept
                       \--> item B          reachable: kept

   oldBasket (no longer referenced by anything)
      |
      +----> items ----> item C             unreachable: collected
```

V8 and other engines use **mark-and-sweep** collection, refined in many ways: starting from the roots, the collector **marks** every object it can reach, then **sweeps** away everything unmarked. Because most objects in typical programs die young — temporary arrays, intermediate results — engines also use **generational** collection: new objects are kept in a small "young" area that is cleaned often and cheaply, and objects that survive several collections move to an "old" area that is cleaned less often.

Garbage collection is mostly invisible, but it is not free: collecting a large heap takes time, and while some parts run in the background, it can briefly pause your program. Code that creates huge numbers of short-lived objects in hot paths makes the collector work harder.

### Measuring memory

Node.js reports its memory use:

```js
const formatMB = (bytes) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

console.log("heap used before:", formatMB(process.memoryUsage().heapUsed));
const big = Array.from({ length: 2_000_000 }, (_, i) => ({ id: i }));
console.log("heap used after: ", formatMB(process.memoryUsage().heapUsed));
console.log("items:", big.length);
```

**Output (numbers vary):**

```text
heap used before: 4.1 MB
heap used after:  93.6 MB
items: 2000000
```

`process.memoryUsage()` returns several measurements; `heapUsed` is the memory currently used by JavaScript objects. Two million small objects took roughly 90 megabytes. Measurements like this help you estimate whether a design will fit in a server's memory ({{ch:what-a-computer-is}}).

## Memory leaks

### Level 5 — How leaks happen

A **memory leak** in JavaScript is not memory the engine "forgot" to free. It is memory that **is still reachable**, because something still refers to it — so the collector **must** keep it — even though your program will never use it again.

In a short script, leaks rarely matter; the process ends and everything is freed. In a **long-running** process — a server running for weeks, a single-page web application left open all day — a small leak grows until performance degrades or the process runs out of memory and crashes, often at the busiest time.

The common causes:

**1. Ever-growing collections.** A cache, a `Map` of sessions, an array of logs or events that is only ever added to:

```js
const requestLog = [];

function handleRequest(request) {
  requestLog.push({ url: request.url, time: Date.now(), headers: request.headers });
  // ...handle the request...
}
```

Every request adds an entry, and nothing removes them. After millions of requests, the array holds gigabytes.

**2. Forgotten timers and listeners.** An interval that is never cleared keeps its callback — and everything the callback's closure references — alive forever. The same applies to **event listeners** added to long-lived objects and never removed: each listener's closure keeps its data alive.

**3. Closures holding large data.** As you saw in {{ch:scope-and-closures}}, a long-lived function keeps its whole environment alive. A small handler that accidentally closes over a huge array keeps the array alive as long as the handler exists.

**4. Accidental globals and module-level state.** Anything referenced from a global or module-level variable is reachable for the life of the process ({{ch:modules-and-npm}}).

**5. In browsers: detached DOM elements.** Page elements removed from the page but still referenced by JavaScript variables cannot be freed ({{ch:browser-and-dom}}).

### Weak references: `WeakMap`, `WeakSet` and `WeakRef`

Sometimes you want to associate extra data with an object **without** keeping that object alive. Ordinary `Map`s hold **strong** references: an object used as a `Map` key stays reachable as long as the `Map` exists.

A **`WeakMap`** holds its keys **weakly**: if the only remaining reference to a key object is from the `WeakMap`, the key — and its value — can be garbage-collected.

```js
const cachedTotals = new WeakMap();

function basketTotal(basket) {
  if (cachedTotals.has(basket)) {
    return cachedTotals.get(basket);
  }
  const total = basket.items.reduce((sum, item) => sum + item.pricePaisa * item.quantity, 0);
  cachedTotals.set(basket, total);
  return total;
}

let basket = { items: [{ pricePaisa: 49900, quantity: 2 }] };
console.log(basketTotal(basket));
console.log(basketTotal(basket));

basket = null;   // the basket is no longer referenced anywhere else
// The WeakMap does not keep it alive; it and its cached total can now be collected.
```

**Output:**

```text
99800
99800
```

This caches each basket's total **only for as long as the basket exists**. With a normal `Map`, every basket ever processed would stay in memory forever — a leak.

The weak collections have deliberate limits: `WeakMap` keys must be objects, and you cannot list a `WeakMap`'s contents or ask its size, because entries may disappear whenever the collector runs. `WeakSet` is the same idea for sets. **`WeakRef`** lets you hold a weak reference to a single object, and **`FinalizationRegistry`** can notify you after an object has been collected; both are advanced tools, and their timing is unpredictable, so they should never be used for program logic that must happen.

### Finding leaks

The method follows the debugging process from {{ch:errors-and-debugging}}:

1. **Confirm a leak.** Watch memory over time. Memory that rises during load and falls back afterwards is normal. Memory that keeps rising across many cycles — a "staircase" pattern on a graph — suggests a leak.
2. **Take heap snapshots.** A **heap snapshot** is a complete record of every object in memory at one moment. Run Node.js with `node --inspect app.js`, open `chrome://inspect` in Chrome, and use the **Memory** tab to take a snapshot; or use the same tab in a browser's developer tools for frontend code.
3. **Compare snapshots.** Take one snapshot, perform the suspicious action many times, take another, and **compare** them. The objects whose count keeps growing — say, 50,000 more `RequestLogEntry` objects — point to the leak.
4. **Follow the retainers.** For a leaked object, the snapshot tool shows its **retainers**: the chain of references that keeps it reachable from a root. That chain leads straight to the culprit — the global array, the forgotten listener, the cache with no limit.
5. **Fix and verify.** Add limits and expiry to caches, remove listeners and clear timers when finished, release references, and repeat the measurement to confirm memory now stays flat.

## How V8 makes JavaScript fast

### Level 6 — Hidden classes and inline caches

In {{ch:from-code-to-running-program}} you learned that V8 compiles frequently used ("hot") code into fast machine code, using **guesses** that are discarded if they turn out wrong (**deoptimisation**). Two of those guesses are worth understanding, because a few simple habits keep your code on the fast path.

**Hidden classes (shapes).** JavaScript objects can have any properties added or removed at any time. To make property access fast anyway, V8 gives each object an internal **shape** (also called a **hidden class**) describing which properties it has, in which order. Objects created the same way share the same shape, so V8 can learn "for objects of this shape, `pricePaisa` is stored in slot 2" and read it directly — almost as fast as in a compiled language.

**Inline caches.** At each place in your code that reads a property, V8 remembers the shapes it has seen. If a function always receives objects of **one** shape, the access stays very fast (V8 calls this **monomorphic**). If it receives a few different shapes, it slows down a little (**polymorphic**). If it receives many different shapes, V8 gives up specialising (**megamorphic**), and it becomes much slower.

The habits that follow from this:

```js
// Good: every product created the same way, with the same properties in the same order
function createProduct(title, pricePaisa) {
  return { title, pricePaisa, stock: 0 };
}

// Less good: properties added in different orders, or added later and conditionally
const a = { title: "Shirt" };
a.pricePaisa = 129950;
const b = { pricePaisa: 49900 };
b.title = "Cap";
b.discount = 10;
```

1. **Create objects of the same kind in the same way** — ideally with one function or class, initialising all properties up front (even to `null`), in the same order.
2. **Avoid adding and `delete`-ing properties on hot objects** after creation; `delete` in particular can force an object into a slower representation.
3. **Keep the types passed to a hot function consistent** — always numbers, not sometimes numbers and sometimes strings (the deoptimisation example from {{ch:from-code-to-running-program}}).
4. **Keep arrays of one kind**: arrays holding only numbers are stored more efficiently than arrays mixing numbers, strings and objects, and arrays with "holes" (missing indexes) are slower.

> [!SENIOR]
> These optimisations matter only for **hot** code — code run millions of times. For everything else, clarity matters far more than shape-friendliness, and the habits above happen to produce clearer code anyway. Experienced engineers do not micro-optimise by instinct: they **measure** with a profiler ({{ch:the-event-loop}}), find the few functions that actually dominate, and optimise those. Most real slowness comes from algorithms ({{ch:big-o}}), unnecessary network round trips ({{ch:how-the-internet-works}}) and blocking work ({{ch:the-event-loop}}) — not from property access.

## From beginner to enterprise: advanced features at every level

**Level 3 — A small program.** Generators for simple sequences; `for...of` everywhere; dates stored as ISO strings.

**Level 4 — A real application.** Async generators wrap paginated APIs; streams process large files; all moments are stored in UTC and displayed in the user's time zone; caches have limits.

**Level 5 — Professional engineering.** Memory is monitored in production, with alerts on steady growth. Heap snapshots are part of the debugging toolkit. Libraries chosen by the team use iterators and proxies, and engineers understand them well enough to debug through them. Hot paths are profiled and kept shape-friendly where it measurably matters.

**Level 6 — Enterprise.** Data pipelines process billions of records as streams, never loading full datasets into memory. Services run with deliberate memory limits per container ({{ch:docker}}), so that a leak triggers a controlled restart rather than affecting neighbouring services, while alerts prompt investigation. Time-zone handling follows company-wide standards, because errors in scheduling, billing periods and legal deadlines can carry real financial and legal consequences.

## Real-world use cases

### Beginner level — Generating reference numbers

**Situation:** a learner needs an endless supply of formatted reference numbers.

**Solution:** an infinite generator that yields the next formatted number on demand.

**Lesson:** laziness lets you describe an endless sequence safely.

### Intermediate level — Importing a large CSV file

**Business problem:** a logistics company imports daily shipment files of several gigabytes. Reading each file entirely into memory crashes the import service.

**Solution:** read the file as a stream and process it line by line with `for await...of`, writing records to the database in batches.

**Reasoning and trade-off:** memory use stays small and constant regardless of file size. The code is a little more complex than "read everything", and errors in the middle must be handled so a partial import can be resumed.

### Advanced level — The leaking cache

**Business problem (illustrative, but a very common story):** a SaaS API's memory grows steadily each day; every few days the service crashes and restarts, briefly failing customer requests.

**Investigation:** comparing heap snapshots shows hundreds of thousands of cached report objects. A memoisation cache ({{ch:scope-and-closures}}) keyed by report parameters never removes old entries, and parameters include timestamps, so almost every request adds a new entry.

**Fix:** a cache with a maximum size and an expiry time (an "LRU" cache — least recently used entries are removed first), and later a shared cache in Redis ({{ch:redis}}).

**Lesson:** every cache needs an eviction policy; "cache everything forever" is a leak with a nicer name.

### Enterprise level — The day-shifted deadline

**Business problem (illustrative):** a global software company's invoices show payment due dates one day earlier than intended for customers in some countries, causing late-payment disputes.

**Root cause:** due dates were stored as `Date` objects at midnight in the server's time zone, then displayed in customers' local time zones — shifting them to the previous evening, and therefore the previous day.

**Fix:** store calendar dates as plain `YYYY-MM-DD` values, never as moments; reserve UTC timestamps for events that happen at a specific instant; add tests that run date logic in several time zones.

**Lesson:** "a date" and "a moment" are different things, and confusing them causes real financial problems at scale.

## Common mistakes

### Beginner mistake — Spreading an infinite generator

**What it looks like:** `[...naturalNumbers()]` or `Array.from(infiniteGenerator)`.

**What happens:** the program tries to build an infinite array and runs out of memory.

**How to fix it:** limit infinite sequences with a `take` step, or loop with a `break` condition.

### Beginner mistake — Parsing date-times without a time zone

**What it looks like:** `new Date("2026-11-19T10:30:00")` without `Z` or an offset.

**What happens:** the moment depends on the machine's time zone, so servers and browsers disagree.

**How to fix it:** always include `Z` or an explicit offset; store in UTC.

### Intermediate mistake — Reusing a used-up iterator

**What it looks like:** looping over a generator object twice; the second loop does nothing.

**Why it happens:** an iterator is consumed as it is used. Calling the generator **function** again creates a fresh one; reusing the same generator **object** does not.

**How to fix it:** create a new iterator for each pass, or collect the values into an array if you need them several times.

### Intermediate mistake — Caches with no limit

**What it looks like:** a `Map` used as a cache that only grows.

**How to fix it:** set a maximum size and expiry; use `WeakMap` when entries should live only as long as their key objects.

### Production mistake — Forgotten listeners and intervals

**What it looks like:** event listeners added on each request or page view and never removed; intervals started and never cleared.

**What happens:** steadily growing memory, duplicated work, and processes that never exit.

**How to prevent it:** pair every "add" with a "remove", every `setInterval` with a `clearInterval`, usually in `finally` or a component's clean-up code.

### Enterprise mistake — No memory monitoring

**What it looks like:** discovering leaks only through crashes.

**How to prevent it:** monitor heap usage over time, set container memory limits, alert on steady growth, and keep heap-snapshot tooling ready.

## Debugging and troubleshooting

| Symptom | Likely cause |
|---|---|
| `TypeError: X is not iterable` | Using `for...of`, spread or array destructuring on a plain object, `undefined` or a number |
| A loop over a generator runs only once | The generator object was already consumed |
| `for await` used on a normal array of promises behaves unexpectedly | Prefer `Promise.all` for an array of promises; use `for await` for async iterables |
| A date is one day off for some users | A calendar date stored as a moment, or a date-time parsed without a time zone |
| Months are off by one | `Date` months count from 0: `new Date(2026, 10, 19)` is 19 **November** |
| Memory rises steadily and never falls | A leak: growing collections, listeners, timers, or closures holding large data |
| Pauses or slowdowns as memory grows | The garbage collector working hard on a large or churning heap |
| `JavaScript heap out of memory` crash | A leak, or genuinely too much data loaded at once; stream or batch instead |
| A hot function suddenly slows down | Inconsistent object shapes or argument types causing deoptimisation (confirm with a profiler) |

> [!TIP]
> When investigating memory, always compare **at least two** heap snapshots taken after the same action has been repeated many times. A single snapshot shows what is in memory; only a comparison shows what is **growing** — and growth is what defines a leak.

## How a senior engineer thinks about these features

> [!SENIOR]
> - **Iterators and generators** are tools for **shaping data flow**: pull items when needed, keep memory constant, hide paging and chunking behind a simple loop. They reach for them when data is large, endless or arrives over time.
> - **Proxies and symbols** are mostly **library-builder tools**. They understand them in order to debug frameworks, and use them directly only when nothing simpler will do.
> - **Time** is treated as a domain with its own rules: moments in UTC, calendar dates as dates, conversion only at the edges, and tests in several time zones.
> - **Memory** is a resource with a budget. Every long-lived collection has a size limit; every subscription has an unsubscription; every service has memory monitoring and a plan for leaks.
> - **Performance** work starts with measurement. Engine-level habits matter for a few hot paths; algorithms and architecture matter everywhere else.

## Exercises

### Exercise 1 — An iterable price list

**Objective:** practise the iteration protocol with a generator method.

**What to build:** a class `PriceList` that stores items as `{ name, pricePaisa }` and is iterable, yielding strings like `"Cap: Rs 499.00"` in order of price, lowest first. Show that it works with `for...of` and with spread.

<details>
<summary>Show the solution</summary>

```js
class PriceList {
  #items = [];

  add(name, pricePaisa) {
    this.#items.push({ name, pricePaisa });
    return this;
  }

  *[Symbol.iterator]() {
    const sorted = this.#items.toSorted((a, b) => a.pricePaisa - b.pricePaisa);
    for (const item of sorted) {
      yield `${item.name}: Rs ${(item.pricePaisa / 100).toFixed(2)}`;
    }
  }
}

const list = new PriceList()
  .add("Cotton shirt", 129950)
  .add("Cap", 49900)
  .add("Belt", 89900);

for (const line of list) {
  console.log(line);
}
console.log([...list].length);
```

**Output:**

```text
Cap: Rs 499.00
Belt: Rs 899.00
Cotton shirt: Rs 1299.50
3
```

Walkthrough:

- `add` returns `this`, so calls can be **chained** — a common pattern called a **fluent interface**.
- `*[Symbol.iterator]()` is a generator method under the iterator symbol, so the class plugs into `for...of` and spread.
- It sorts a **copy** with `toSorted` ({{ch:arrays}}), so iterating never changes the stored order.
- Each `for...of` or spread calls the method afresh, so the list can be iterated any number of times.

**Common wrong approach:** making `PriceList` itself hold a single iterator and returning `this` from `[Symbol.iterator]`. Then the list can be looped over only once.

</details>

### Exercise 2 — A lazy pipeline

**Objective:** practise generators and lazy evaluation.

**What to build:** generators `map(iterable, fn)`, `filter(iterable, test)` and `take(iterable, n)`. Use them with an infinite generator of order numbers 1, 2, 3, … to produce the first 4 order numbers that are divisible by 3, formatted as `"ORD-0003"`, `"ORD-0006"` and so on. Prove that only 12 numbers were generated by counting them.

<details>
<summary>Show the solution</summary>

```js
let generatedCount = 0;

function* orderNumbers() {
  let n = 1;
  while (true) {
    generatedCount++;
    yield n++;
  }
}

function* map(iterable, fn) {
  for (const item of iterable) yield fn(item);
}

function* filter(iterable, test) {
  for (const item of iterable) {
    if (test(item)) yield item;
  }
}

function* take(iterable, count) {
  if (count <= 0) return;
  let taken = 0;
  for (const item of iterable) {
    yield item;
    taken++;
    if (taken >= count) return;
  }
}

const result = take(
  map(
    filter(orderNumbers(), (n) => n % 3 === 0),
    (n) => `ORD-${String(n).padStart(4, "0")}`,
  ),
  4,
);

console.log([...result]);
console.log("Numbers generated:", generatedCount);
```

**Output:**

```text
[ 'ORD-0003', 'ORD-0006', 'ORD-0009', 'ORD-0012' ]
Numbers generated: 12
```

Walkthrough:

- Each stage pulls one item at a time from the stage before it. Nothing is computed until spread asks `take` for values.
- `take` returns immediately after yielding its fourth item, so it never asks for a fifth — and so `orderNumbers` stops being asked after 12.
- Returning from `take` also ends the `for...of` loops inside it, which automatically tells the inner generators they are finished.

**Common wrong approach:** in `take`, checking the count only **before** each item (`if (taken >= count) return;` at the top of the loop). Then, after yielding the fourth item, the loop asks for one more item before noticing it is done — generating extra numbers that are never used. Here that means 15 numbers instead of 12 — harmless with cheap numbers, but wasteful if each item is an expensive network request.

</details>

### Exercise 3 — Show times correctly

**Objective:** practise UTC storage and time-zone display.

**What to build:** a function `formatForUser(isoTimestamp, timeZone)` that returns a human-readable date and time in the given time zone. Show a delivery slot stored as `"2026-11-20T04:00:00Z"` for users in `Asia/Karachi`, `Asia/Dubai` and `Europe/London`.

<details>
<summary>Show the solution</summary>

```js
function formatForUser(isoTimestamp, timeZone) {
  const moment = new Date(isoTimestamp);
  if (Number.isNaN(moment.getTime())) {
    throw new Error(`Invalid timestamp: ${isoTimestamp}`);
  }
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    dateStyle: "full",
    timeStyle: "short",
  }).format(moment);
}

const slot = "2026-11-20T04:00:00Z";
for (const zone of ["Asia/Karachi", "Asia/Dubai", "Europe/London"]) {
  console.log(`${zone}: ${formatForUser(slot, zone)}`);
}
```

**Output:**

```text
Asia/Karachi: Friday, 20 November 2026 at 09:00
Asia/Dubai: Friday, 20 November 2026 at 08:00
Europe/London: Friday, 20 November 2026 at 04:00
```

Walkthrough:

- The slot is stored once, as a UTC moment (note the `Z`).
- An invalid date has `getTime()` equal to `NaN`, so the function checks for it and fails loudly rather than printing "Invalid Date" to a customer.
- `Intl.DateTimeFormat` formats the same moment for each time zone; `dateStyle` and `timeStyle` choose sensible, language-appropriate formats.
- Pakistan is UTC+5, the UAE UTC+4, and the UK is on UTC in November.

**Common wrong approach:** storing `"2026-11-20 09:00"` (the Karachi local time) without a zone, then showing it to everyone. Customers in Dubai and London would see the wrong time for their delivery.

</details>

### Exercise 4 — Find the leak (debugging)

**Objective:** practise reasoning about reachability.

**The scenario:** this simplified server code handles "subscribe to price alerts" requests. Memory grows steadily in production.

```js
import { EventEmitter } from "node:events";

const priceChanges = new EventEmitter();
priceChanges.setMaxListeners(0);   // "silence that warning about too many listeners"

function handleSubscribeRequest(userId, productId) {
  const userProfile = loadLargeProfile(userId);   // about 1 MB of data
  priceChanges.on("change", (change) => {
    if (change.productId === productId) {
      notifyUser(userProfile, change);
    }
  });
  return { subscribed: true };
}
```

(`EventEmitter` is Node.js's built-in tool for named events: `on(name, listener)` adds a listener function, `emit(name, data)` calls every listener for that name, and `off(name, listener)` removes one. You will use it properly in {{ch:nodejs}}.)

**What to do:** explain exactly why memory grows, why the "fix" in the second line made things worse, and how to fix the design.

<details>
<summary>Show the solution</summary>

**Why memory grows:**

- Every request adds a **new listener** to `priceChanges`, a module-level object that lives for the whole life of the process ({{ch:modules-and-npm}}).
- Each listener is a closure that holds `userProfile` (about 1 MB) and `productId` ({{ch:scope-and-closures}}).
- Nothing ever removes a listener, so every listener — and every profile it captured — stays **reachable** from a root: module-level `priceChanges` → its listener list → each closure → each profile. The garbage collector must keep them all.
- A user who subscribes ten times adds ten listeners. A million requests means a million listeners and up to a terabyte of profiles. Every price change also calls every listener — so the service gets slower as well as larger.

**Why `setMaxListeners(0)` made it worse:** by default, Node.js prints a warning when more than ten listeners are added to one event, precisely because this usually indicates a leak. Setting the limit to zero ("unlimited") silenced the one signal that pointed at the bug.

**A better design:**

```js
const subscriptions = new Map();   // productId -> Set of userIds

function handleSubscribeRequest(userId, productId) {
  if (!subscriptions.has(productId)) {
    subscriptions.set(productId, new Set());
  }
  subscriptions.get(productId).add(userId);
  return { subscribed: true };
}

function handleUnsubscribeRequest(userId, productId) {
  subscriptions.get(productId)?.delete(userId);
}

priceChanges.on("change", (change) => {
  for (const userId of subscriptions.get(change.productId) ?? []) {
    notifyUser(loadLargeProfile(userId), change);
  }
});
```

What changed:

- There is **one** listener for the whole process, added once.
- Subscriptions store only small IDs, in a `Set` per product, so duplicates are impossible and memory per subscription is tiny.
- Profiles are loaded **when needed** and become garbage afterwards.
- Unsubscribing is possible, so the structure can shrink.

In a real system, subscriptions would live in a database so they survive restarts and are shared by all servers, but the memory lesson is the same: **never let per-request work add permanent references to long-lived objects.**

**Common wrong approach:** calling `global.gc()` or restarting the server on a timer. Both treat the symptom; the references still exist, so the memory still cannot be freed.

</details>

## Summary

The **iteration protocol** powers `for...of`, spread, destructuring and more: an **iterable** has a `[Symbol.iterator]()` method returning an **iterator**, whose `next()` returns `{ value, done }`. You can make your own objects iterable. **Generator functions** (`function*`) return iterators and **pause** at each `yield`, resuming on the next `next()` with their local state intact; they produce values **lazily**, enabling infinite sequences and memory-efficient pipelines. **Async generators** and **`for await...of`** handle data arriving over time — paginated APIs and streams.

**Symbols** are unique primitive values used as collision-free property keys, hidden from `Object.keys` and JSON; **well-known symbols** such as `Symbol.iterator` let objects plug into language features. **Proxies** wrap objects and intercept operations with **traps**, forwarding defaults with **`Reflect`**; they power validation, logging and framework **reactivity** (as in Vue 3), but should be used sparingly.

`Date` represents a **moment** in milliseconds since 1970 **UTC**. Store and transmit moments in UTC as **ISO 8601**, always parse with a `Z` or offset, keep calendar dates as plain dates, and convert to local time only for display with `Intl.DateTimeFormat`.

Objects live on the **heap**; call frames on the **stack**. The **garbage collector** frees objects that are no longer **reachable** from roots, using mark-and-sweep and generational collection. **Memory leaks** are unneeded objects that are still reachable: growing collections, forgotten listeners and timers, closures over large data, module-level state, detached DOM elements. **`WeakMap`**, **`WeakSet`** and **`WeakRef`** hold references without keeping objects alive. Find leaks by comparing **heap snapshots** and following **retainers**. V8 uses **hidden classes** and **inline caches**; consistent object shapes and argument types keep hot code fast — but measure before optimising.

## Key terms

- **Iterable** — An object that can be walked through with `for...of`, because it has a `[Symbol.iterator]` method.
- **Iterator** — An object with a `next()` method that returns `{ value, done }` for each item in turn.
- **Iteration protocol** — The agreed methods and return shapes that iterables and iterators follow.
- **`Symbol.iterator`** — The well-known symbol under which an object provides its iterator.
- **Generator function** — A function written `function*` that returns an iterator and pauses at each `yield`.
- **`yield`** — A keyword that hands out a value from a generator and pauses it until the next `next()` call.
- **Generator object** — The iterator returned by calling a generator function.
- **Lazy evaluation** — Computing values only when they are requested.
- **Infinite sequence** — A sequence with no end, possible to represent safely with a lazy generator.
- **Iterator helpers** — Built-in methods such as `map`, `filter` and `take` available directly on iterators in modern JavaScript.
- **Async iterator** — An iterator whose `next()` returns a promise, for data that arrives over time.
- **Async generator** — A function written `async function*` that can both `await` and `yield`.
- **`for await...of`** — A loop that walks through an async iterable, waiting for each item.
- **Pagination** — Delivering a large set of results in pages, one page per request.
- **Stream** — Data that arrives or is processed in chunks over time, rather than all at once.
- **Symbol** — A primitive value guaranteed to be unique, often used as a property key.
- **Well-known symbol** — A built-in symbol, such as `Symbol.iterator`, that lets objects customise language behaviour.
- **Proxy** — An object that wraps another object and intercepts operations on it through traps.
- **Trap** — A function in a proxy's handler that intercepts one kind of operation, such as `get` or `set`.
- **`Reflect`** — A built-in object whose methods perform the default behaviour of each proxy trap.
- **Reactivity** — A framework's ability to detect data changes automatically and update the screen.
- **UTC (Coordinated Universal Time)** — The world's reference time, with no time-zone offset or daylight saving.
- **ISO 8601** — The international standard text format for dates and times, such as `2026-11-19T10:30:00Z`.
- **Time zone** — A region's rule for converting UTC into local clock time, possibly including daylight saving.
- **Daylight saving time** — The practice in some countries of moving clocks forward in summer.
- **`Intl.DateTimeFormat`** — The built-in tool for formatting dates and times for a given language and time zone.
- **Temporal** — A newer JavaScript date-and-time API with separate types for moments, dates, times and time zones.
- **Stack (memory)** — The memory area holding function call frames and their local variables.
- **Heap** — The memory area where objects, arrays and other dynamically created values live.
- **Garbage collector** — The part of the engine that frees memory used by unreachable objects.
- **Reachability** — Whether an object can be reached by following references from a root; reachable objects are kept.
- **Root (garbage collection)** — A starting point for reachability, such as a global variable or a variable in a running function.
- **Mark-and-sweep** — A garbage-collection method that marks every reachable object, then frees the rest.
- **Generational garbage collection** — Collecting short-lived "young" objects frequently and long-lived "old" objects less often.
- **Memory leak** — Memory that is no longer needed but cannot be freed because something still refers to it.
- **`WeakMap` / `WeakSet`** — Collections that hold their object keys or members weakly, not preventing garbage collection.
- **`WeakRef`** — A weak reference to a single object that does not keep it alive.
- **Heap snapshot** — A complete record of the objects in memory at one moment, used to find leaks.
- **Retainer** — An object holding a reference that keeps another object reachable.
- **Eviction policy** — The rule a cache uses to remove entries, such as removing the least recently used.
- **Hidden class (shape)** — An internal description of an object's properties that V8 uses to access them quickly.
- **Inline cache** — V8's memory, at each property access in the code, of the object shapes it has seen.
- **Monomorphic / polymorphic / megamorphic** — Describes code that sees one, a few, or many object shapes, from fastest to slowest.
- **Fluent interface** — A design in which methods return the object itself, so calls can be chained.
- **`EventEmitter`** — Node.js's built-in tool for registering listeners for named events and calling them.

## What comes next

You have now covered the JavaScript language from your first variable to the internals of the engine. Every value, function and object in your programs, however, has had one weakness: JavaScript does not check, before running, whether you are using them correctly. A misspelt property, a missing argument, a string where a number belongs — all of them wait to be discovered at run time, often by a user.

In the next chapter, **TypeScript I: Why Types Matter, and the Basics**, you will learn TypeScript — JavaScript with a type system that checks your code as you write it, catching whole categories of mistakes before the program ever runs. It is the standard for professional JavaScript development today, and the language you will use for the backend and frontend projects in the rest of this book.
