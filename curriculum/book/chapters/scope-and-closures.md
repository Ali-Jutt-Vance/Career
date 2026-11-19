# Scope, Hoisting and Closures: How JavaScript Finds Your Variables

> [!GOALS]
> - What scope is, and the four kinds of scope in JavaScript: global, module, function and block.
> - How JavaScript looks up a variable through the scope chain, and what "lexical scope" means.
> - What shadowing is, and why it causes confusion.
> - Why `var` behaves differently from `let` and `const`.
> - What hoisting really is, and what the "temporal dead zone" means.
> - What happens inside the engine when code runs: execution contexts and their two phases.
> - What a closure is, how it works, and why it is one of the most useful ideas in JavaScript.
> - Practical closure patterns: counters, factories, private data, caching and "run only once".
> - The bugs closures can cause, including the classic loop bug and memory leaks.
> - Why global variables are dangerous, and what strict mode does.

## Why this matters

You have already met several puzzling behaviours without a full explanation:

- A variable created inside a function cannot be used outside it ({{ch:functions}}).
- A `let` loop counter disappears after the loop ends ({{ch:loops}}).
- Using a `const` before the line that creates it gives "Cannot access before initialization", not "is not defined" ({{ch:first-program}}).
- A function declaration can be called above where it is written, but an arrow function stored in a `const` cannot ({{ch:functions}}).

Each of these follows from a small set of rules about **where variables live** and **how JavaScript finds them**. This chapter teaches those rules. Once you understand them, these behaviours stop being surprises and become predictable.

The chapter also introduces **closures** — functions that remember the variables around them. Closures sound abstract, but you will use them constantly: every callback, every event handler, every React component and much of Node.js relies on them. They are also a favourite interview topic, precisely because they reveal whether someone understands how JavaScript really works.

## The simple idea

Think of a large office building with many rooms.

- Inside each room there are notice boards. People in that room can read the notices on their own board.
- People in a room can also walk out into the corridor and read the notice board there, and from the corridor go down to the lobby and read the main board.
- But people in the lobby **cannot** see inside the rooms. A notice pinned inside Room 12 is invisible to everyone outside Room 12.

Variables in JavaScript work the same way. Each block of code — a function, an `if` block, a loop — is like a room. Code can see variables in its own room and in every room that **contains** it, out to the lobby. It cannot see into rooms nested inside other rooms.

> [!ANALOGY]
> Scope is like the rooms of a building: you can always look **outward** — from your room to the corridor to the lobby — but never **inward** into rooms you are not in.
>
> **Where the analogy breaks:** in a building, you might walk into the room next door. In JavaScript, there is no "next door" — only outward. Two sibling functions cannot see each other's variables at all. And, as you will see with closures, a JavaScript "room" can keep existing — with its notices intact — even after everyone has left it.

## The proper definition and key words

- **Scope** is the region of a program where a variable can be used. A variable is **in scope** where it can be accessed, and **out of scope** elsewhere.
- **Declaring** a variable creates it in a particular scope — the scope where the declaration is written.
- The **scope chain** is the sequence of scopes JavaScript searches, from the innermost outwards, when it looks up a name.
- **Lexical scope** (also called **static scope**) means that a variable's scope is decided by **where the code is written**, not by where or how it is called. "Lexical" refers to the text of the code.
- **Shadowing** happens when an inner scope declares a variable with the same name as an outer one, hiding the outer one inside the inner scope.
- **Hoisting** is the name for JavaScript setting up declarations before running a scope's code.
- A **closure** is a function together with the variables from the scope where it was created, which it keeps access to even after that scope has finished running.

## The four kinds of scope

### Global scope

A variable declared outside every function, block and module is in the **global scope**. It can be used anywhere in the program.

In older browser scripts, every top-level variable was global. In Node.js and in modern browser code organised into **modules** (files that import and export from each other — {{ch:modules-and-npm}}), top-level variables are not truly global. Instead, they belong to:

### Module scope

Each module (each file, in modern JavaScript) has its own scope. Variables declared at the top of a file can be used anywhere **in that file**, but not in other files unless they are explicitly exported. This is one of the main reasons modules exist: two files can each have a variable called `total` without any conflict.

### Function scope

Variables declared inside a function — including its parameters — exist only inside that function, as you saw in {{ch:functions}}. Each **call** of the function gets a fresh set of them.

### Block scope

A **block** is any code between `{` and `}`: the body of an `if`, a loop, or just a pair of braces on their own. Variables declared with `let` and `const` inside a block exist only inside that block.

```js
const shopName = "Ali's Shoe Corner";      // module (top-level) scope

function describeBasket(items) {           // items: function scope
  const count = items.length;              // function scope

  if (count > 3) {
    const message = "Large basket";        // block scope: only inside this if
    console.log(`${shopName}: ${message}, ${count} items`);
  }

  // console.log(message);                 // ReferenceError: not in scope here
  return count;
}

describeBasket(["shoes", "socks", "cap", "belt"]);
```

**Output:**

```text
Ali's Shoe Corner: Large basket, 4 items
```

Here is the structure of scopes, drawn as nested boxes:

```text
  +-- module scope ------------------------------------------+
  |  shopName                                                |
  |  describeBasket                                          |
  |                                                          |
  |   +-- function scope: describeBasket ----------------+   |
  |   |  items, count                                    |   |
  |   |                                                  |   |
  |   |   +-- block scope: if (count > 3) {...} -----+   |   |
  |   |   |  message                                 |   |   |
  |   |   |  can see: message, items, count,         |   |   |
  |   |   |           shopName, describeBasket       |   |   |
  |   |   +------------------------------------------+   |   |
  |   |  can see: items, count, shopName, describeBasket |   |
  |   +--------------------------------------------------+   |
  |  can see: shopName, describeBasket                       |
  +----------------------------------------------------------+
```

Each box can see its own variables and everything in the boxes **around** it. Nothing outside a box can see in. The `if` block can use `shopName` (two levels out), but the function body cannot use `message` (one level in).

## Looking up a variable: the scope chain

When JavaScript meets a name, such as `shopName` inside the `if` block, it searches for it like this:

```text
  Looking for "shopName" from inside the if block:

  1. if-block scope        -> has message only       -> not here, go out
  2. describeBasket scope  -> has items, count       -> not here, go out
  3. module scope          -> has shopName           -> FOUND, use it
```

This sequence of scopes is the **scope chain**. JavaScript always starts at the **innermost** scope and moves **outward**, one level at a time, until it finds the name. If it reaches the outermost scope without finding it, the result is `ReferenceError: X is not defined`.

### Lexical scope: where it is written, not where it is called

The chain is fixed by **where functions are written** in the code. It does not depend on who calls them. This is what "lexical scope" means, and it surprises many people:

```js
const greeting = "Hello from the module";

function speak() {
  console.log(greeting);
}

function caller() {
  const greeting = "Hello from caller";
  speak();
}

caller();
```

**Output:**

```text
Hello from the module
```

`speak` is **written** at the top level of the module, so its outer scope is the module scope. When it looks up `greeting`, it searches its own scope (nothing), then the module scope — and finds `"Hello from the module"`. The fact that it was **called** from inside `caller`, which has its own `greeting`, makes no difference. A function's view of the world is fixed when the function is written.

This is good news: you can understand which variable a function uses just by **reading where it is written**, without tracing every place it might be called from.

### Shadowing

When an inner scope declares a variable with the **same name** as an outer one, the inner one **shadows** the outer — inside the inner scope, the name refers to the inner variable, and the outer one is hidden.

```js
const discount = 0.1;

function checkoutPrice(pricePaisa) {
  const discount = 0.25;           // shadows the outer discount
  return pricePaisa * (1 - discount);
}

console.log(checkoutPrice(100000));
console.log(discount);
```

**Output:**

```text
75000
0.1
```

Inside `checkoutPrice`, `discount` means the inner variable, 0.25. Outside, it still means 0.1; the outer variable was never changed, only hidden.

Shadowing is legal and sometimes natural (a parameter called `name` inside a function, when there is also a `name` outside). But accidental shadowing causes real confusion: a developer reads `discount` in the function and assumes it is the global one. Linters can warn about it, and good naming avoids it — `campaignDiscount` versus `defaultDiscount` would make both clear.

## `var` versus `let` and `const`

Now you can understand why modern JavaScript replaced `var`. There are two key differences.

### Difference 1 — `var` ignores blocks

`var` is **function-scoped**: it ignores block boundaries and belongs to the whole enclosing function (or the global scope). `let` and `const` are **block-scoped**.

```js
function demo() {
  if (true) {
    var fromVar = "I escape the block";
    let fromLet = "I stay in the block";
  }
  console.log(fromVar);
  console.log(fromLet);
}

demo();
```

**Output:**

```text
I escape the block
ReferenceError: fromLet is not defined
```

`fromVar` "leaks" out of the `if` block into the whole function. This made it easy to reuse a variable name by accident in a long function, with one block silently changing a value another block depended on.

### Difference 2 — hoisting behaviour

The second difference concerns what happens if you use a variable **before** the line that declares it. To understand it, we need to look at how JavaScript actually runs a scope.

## Hoisting: what really happens before your code runs

### Level 2 — The two phases

When JavaScript is about to run a scope — the whole module, or a function each time it is called — it does **not** simply start at the first line. It works in two phases:

1. **The creation phase.** The engine scans the scope's code for **declarations** and sets up a place for each one before running anything:
   - **Function declarations** are set up completely — name and function — so they can be called from anywhere in the scope.
   - **`var` variables** are created and given the value `undefined`.
   - **`let` and `const` variables** are created but left **uninitialised**: they exist, but may not be used yet.
2. **The execution phase.** The code runs line by line, top to bottom. When a `let`, `const` or `var` line is reached, its value is assigned.

Because declarations are handled before the code runs, it *looks as if* they had been moved — "hoisted" — to the top of their scope. That is where the name **hoisting** comes from. Nothing is really moved; the engine just prepared them in advance.

### Seeing hoisting in action

```js
console.log(sayHello());
console.log(oldStyle);
console.log(newStyle);

function sayHello() {
  return "Hello!";
}
var oldStyle = "set later";
let newStyle = "set later";
```

**Output:**

```text
Hello!
undefined
ReferenceError: Cannot access 'newStyle' before initialization
```

Walkthrough, in terms of the two phases:

- **Creation phase:** `sayHello` is set up as a full function. `oldStyle` is created with the value `undefined`. `newStyle` is created but uninitialised.
- **Line 1:** `sayHello()` works, because the function was fully prepared in the creation phase. This is why function declarations can be called above where they are written.
- **Line 2:** `oldStyle` exists and is `undefined`, so it prints `undefined` — **no error**. This is the dangerous behaviour of `var`: using a variable too early silently gives `undefined` instead of telling you something is wrong.
- **Line 3:** `newStyle` exists but is uninitialised, so reading it throws an error that says so precisely.

### The temporal dead zone

The period between the start of a scope and the line where a `let` or `const` is declared is called the **temporal dead zone** (TDZ). "Temporal" because it is about *time* — the moment in execution — not position in the file. During it, the variable exists but cannot be touched:

```text
  {                                  <- scope starts: newStyle exists, uninitialised
    ...                                 |
    console.log(newStyle);   ERROR      |  temporal dead zone
    ...                                 |
    let newStyle = "ready";          <- initialised here; TDZ ends
    console.log(newStyle);   OK
  }
```

This explains the exact wording you saw in {{ch:first-program}}: "Cannot access 'price' before initialization" rather than "price is not defined". The engine knows `price` exists — it saw the declaration during the creation phase — but it has not yet reached the line that gives it a value.

The TDZ is a feature, not a bug. It turns the silent `undefined` of `var` into a clear, immediate error, exactly where the mistake is.

### Function declarations versus function expressions

Now the difference noted in {{ch:functions}} has a precise explanation:

```js
console.log(declared(2));
console.log(arrow(2));

function declared(n) { return n * 2; }
const arrow = (n) => n * 2;
```

**Output:**

```text
4
ReferenceError: Cannot access 'arrow' before initialization
```

`declared` is a function declaration, fully prepared in the creation phase. `arrow` is a `const` variable that happens to hold a function; like any `const`, it is in the temporal dead zone until its line runs.

| Declaration | Hoisted? | Value before its line | Scope |
|---|---|---|---|
| `function f() {}` | Yes, fully | the function | function or block |
| `var x` | Yes | `undefined` | function |
| `let x` / `const x` | Yes, but uninitialised | **TDZ error** | block |
| `const f = () => {}` | as `const` | **TDZ error** | block |

## Inside the engine: execution contexts

### Level 3 — What the engine keeps for each running scope

Every time a function is called, the engine creates an **execution context** for that call: a record holding everything needed to run it. You met part of this as the **stack frame** in {{ch:functions}}; the call stack is a stack of execution contexts.

An execution context contains, among other things:

1. **The variables declared in this scope** — parameters, local variables and inner function declarations — set up during the creation phase. The engine's internal name for this storage is the **lexical environment** (or **environment record**).
2. **A reference to the outer lexical environment** — the scope where this function was **written**. This link is what forms the scope chain.
3. **The value of `this`** for the call ({{ch:this-prototypes-classes}}).

```text
   call stack                         lexical environments
  +-------------------------+       +-----------------------------+
  | describeBasket(...)     | ----> | items, count                |
  | execution context       |       | outer: ----------------+    |
  +-------------------------+       +------------------------|----+
  | module                  | ----> | shopName, describeBasket <--+
  | execution context       |       | outer: (global)             |
  +-------------------------+       +-----------------------------+
```

When `describeBasket` looks up `shopName`, the engine checks the function's environment, then follows the **outer** link to the module's environment, where it finds it. That chain of `outer` links *is* the scope chain.

Normally, when a function returns, its execution context is removed from the call stack, and its environment — its local variables — is no longer needed, so it can be cleaned up by garbage collection ({{ch:first-program}}).

**Normally.** The exception is the subject of the rest of this chapter.

## Closures

### Level 1 — A function that remembers

Look at this function, which *creates and returns another function*:

```js
function createGreeter(greeting) {
  return function (name) {
    return `${greeting}, ${name}!`;
  };
}

const sayAssalam = createGreeter("Assalam-o-Alaikum");
const sayHello = createGreeter("Hello");

console.log(sayAssalam("Sara"));
console.log(sayHello("Bilal"));
```

**Output:**

```text
Assalam-o-Alaikum, Sara!
Hello, Bilal!
```

Think carefully about what happened. `createGreeter("Assalam-o-Alaikum")` ran, created an inner function, returned it, and **finished**. Its parameter `greeting` should be gone — the call is over.

Yet when we later call `sayAssalam("Sara")`, the inner function still knows that `greeting` is `"Assalam-o-Alaikum"`. And `sayHello`, created by a separate call, knows its `greeting` is `"Hello"`. Each returned function **remembers** the variables of the call that created it.

That is a **closure**: a function bundled together with the variables from the scope where it was created. The inner function "closes over" those variables.

### Level 2 — How it works

Remember that every function keeps a reference to its **outer lexical environment** — the scope where it was written. When the inner function is created inside `createGreeter`, its outer reference points to that particular call's environment, which holds `greeting`.

```text
  sayAssalam  ----> inner function
                       outer: -----> environment of the 1st call to createGreeter
                                       greeting = "Assalam-o-Alaikum"

  sayHello    ----> inner function
                       outer: -----> environment of the 2nd call to createGreeter
                                       greeting = "Hello"
```

Normally, a finished call's environment is cleaned up. But here, the returned function still **refers** to it. As long as something can still reach that environment, the garbage collector must keep it. So the environment survives, and the inner function can keep reading — and changing — its variables.

Two calls produced two separate environments, which is why `sayAssalam` and `sayHello` each remember their own greeting.

> [!ANALOGY]
> A closure is like a backpack. When a function is created inside another function, it packs a backpack containing the variables around it at that moment, and carries it wherever it goes. Long after it has left the place it was made, it can reach into the backpack and use what is inside.
>
> **Where the analogy breaks:** a backpack holds *copies* of things. A closure holds the **actual variables**, live. If the value of a variable in the backpack changes, the function sees the new value — and if two functions were made in the same call, they share the *same* backpack.

### Level 3 — Closures with changing state: a counter

Closures become powerful when the remembered variables **change**:

```js
function createCounter() {
  let count = 0;

  return function () {
    count++;
    return count;
  };
}

const nextTicket = createCounter();
console.log(nextTicket());
console.log(nextTicket());
console.log(nextTicket());

const nextOrderNumber = createCounter();
console.log(nextOrderNumber());
```

**Output:**

```text
1
2
3
1
```

Walkthrough:

- Each call to `createCounter` creates a new `count`, starting at 0, and returns a function that closes over it.
- Every call to `nextTicket()` increases **the same** `count` — the one in its backpack — so it returns 1, 2, 3.
- `nextOrderNumber` was made by a separate call, so it has its **own** `count`, starting again at 1.

There is something important here: `count` is completely **private**. No code outside can read it or change it except through the returned function. You cannot write `nextTicket.count = 100`. The only way to change `count` is to call `nextTicket()`, which can only add one. The closure **protects** its data.

### Several functions sharing one closure

A function can return several inner functions — usually in an object — that all close over the **same** variables:

```js
function createWallet(startingBalancePaisa) {
  let balance = startingBalancePaisa;
  const history = [];

  return {
    deposit(amount) {
      if (amount <= 0) throw new Error("Deposit must be positive");
      balance += amount;
      history.push(`+${amount}`);
    },
    withdraw(amount) {
      if (amount > balance) return false;
      balance -= amount;
      history.push(`-${amount}`);
      return true;
    },
    getBalance() {
      return balance;
    },
    getHistory() {
      return [...history];
    },
  };
}

const wallet = createWallet(100000);
wallet.deposit(50000);
console.log(wallet.withdraw(200000));
console.log(wallet.withdraw(30000));
console.log(wallet.getBalance());
console.log(wallet.getHistory());
console.log(wallet.balance);
```

**Output:**

```text
false
true
120000
[ '+50000', '-30000' ]
undefined
```

Walkthrough:

- `createWallet` creates `balance` and `history`, then returns an object with four methods. All four were created in the same call, so they share the same backpack — the same `balance` and `history`.
- `deposit` checks its input and **throws an error** for invalid amounts (`throw` stops the function and reports a problem; you will learn it properly in {{ch:errors-and-debugging}}).
- `withdraw` refuses to go below zero, returning `false`.
- `getHistory` returns a **copy** of the history (with spread), so that callers cannot change the real one — the lesson from {{ch:arrays}}.
- `wallet.balance` is `undefined`: there is no such property on the returned object. The balance exists only inside the closure.

This pattern — private variables plus a set of functions that control access to them — is called **encapsulation**. The wallet guarantees its rules (no negative deposits, no overdrafts, every change recorded) because **nothing else can touch the balance directly**. Classes, which you will learn in {{ch:this-prototypes-classes}}, offer another way to do the same, and encapsulation is a central idea in {{ch:object-oriented-programming}}.

## Practical closure patterns

Closures are not just a curiosity. Here are patterns you will see and use in real code.

### Configuring functions (function factories)

A function that creates other functions, each configured differently, is called a **factory**. You saw `createGreeter`; here is a practical one:

```js
function createPriceFormatter(currencySymbol, decimals = 2) {
  return (minorUnits) => `${currencySymbol} ${(minorUnits / 100).toFixed(decimals)}`;
}

const formatPKR = createPriceFormatter("Rs");
const formatUSD = createPriceFormatter("$");

console.log(formatPKR(129950));
console.log(formatUSD(1999));
```

**Output:**

```text
Rs 1299.50
$ 19.99
```

The configuration is supplied once; the returned function remembers it and can be passed around and called anywhere.

### Callbacks that remember context

Every time you write a callback inside another function, it is a closure:

```js
function applyDiscountToAll(pricesPaisa, discountRate) {
  return pricesPaisa.map((price) => Math.round(price * (1 - discountRate)));
}

console.log(applyDiscountToAll([100000, 49900], 0.1));
```

**Output:**

```text
[ 90000, 44910 ]
```

The arrow function given to `map` uses `discountRate`, a parameter of the **outer** function. It can, because it closes over it. You have been using closures since {{ch:arrays}} without naming them.

### Caching results (memoisation)

A closure can remember results of expensive calculations, so repeated calls with the same input are instant. This is called **memoisation**:

```js
function memoise(slowFunction) {
  const cache = new Map();

  return (input) => {
    if (cache.has(input)) {
      return cache.get(input);
    }
    const result = slowFunction(input);
    cache.set(input, result);
    return result;
  };
}

function slowSquare(n) {
  console.log(`  calculating ${n}...`);
  return n * n;
}

const fastSquare = memoise(slowSquare);
console.log(fastSquare(12));
console.log(fastSquare(12));
console.log(fastSquare(7));
```

**Output:**

```text
  calculating 12...
144
144
  calculating 7...
49
```

- `cache` is a `Map` ({{ch:objects}}) that lives in the closure.
- The first `fastSquare(12)` calculates and stores the result. The second finds it in the cache and returns immediately — "calculating 12" is not printed again.

Memoisation is a simple form of **caching**, the speed technique you met in {{ch:what-a-computer-is}}. It works well for **pure** functions ({{ch:functions}}), whose result depends only on their input. You will meet it again in {{ch:dynamic-programming-greedy}}.

### Running something only once

```js
function once(fn) {
  let hasRun = false;
  let result;

  return (...args) => {
    if (!hasRun) {
      hasRun = true;
      result = fn(...args);
    }
    return result;
  };
}

const initialiseDatabase = once(() => {
  console.log("Connecting to the database...");
  return "connection-1";
});

console.log(initialiseDatabase());
console.log(initialiseDatabase());
```

**Output:**

```text
Connecting to the database...
connection-1
connection-1
```

`hasRun` and `result` live in the closure. The wrapped function runs the first time only; later calls return the stored result. Notice the rest parameter `...args` and spread `fn(...args)` from {{ch:arrays}}, used to pass along whatever arguments arrive.

> [!SENIOR]
> Utility functions like `once` and `memoise` exist in popular libraries, and you will often use those rather than writing your own. But being able to write them from scratch — in an interview, or when you need a variation — shows that you understand closures deeply. Interviewers ask for exactly these: "implement `once`", "implement a counter with private state", "implement `memoise`".

## Closure pitfalls

### The classic loop bug

This is one of the most famous JavaScript puzzles. We create three functions in a loop, each meant to remember its own number:

```js
const printers = [];

for (var i = 1; i <= 3; i++) {
  printers.push(() => console.log("Ticket", i));
}

printers.forEach((print) => print());
```

**Output:**

```text
Ticket 4
Ticket 4
Ticket 4
```

All three print 4. Why?

- `var` is **function-scoped** (or global here), not block-scoped. So there is only **one** `i` for the whole loop.
- All three arrow functions close over **that same single `i`**. A closure holds the live variable, not a copy of its value at creation time.
- By the time the functions are called, the loop has finished, and the single `i` has reached 4 (the value that stopped the loop).

Now change one word — `var` to `let`:

```js
const printers = [];

for (let i = 1; i <= 3; i++) {
  printers.push(() => console.log("Ticket", i));
}

printers.forEach((print) => print());
```

**Output:**

```text
Ticket 1
Ticket 2
Ticket 3
```

With `let`, JavaScript creates a **new `i` for every iteration** of the loop, each with that iteration's value. Each arrow function closes over a different `i`.

```text
  with var:   one i  <------ all three functions point here (ends at 4)

  with let:   i (=1) <------ function 1
              i (=2) <------ function 2
              i (=3) <------ function 3
```

This bug was extremely common before `let` existed, typically with timers or click handlers created in loops. It remains a favourite interview question, and you will meet the timer version — with `setTimeout` — in {{ch:asynchronous-javascript}}. The lesson is the general one: **closures capture variables, not values.**

### Stale values

Because closures capture live variables, a function might see a value **different** from the one you expected — either because the variable changed after the closure was created (as in the loop bug), or because the closure captured an **old** variable that has since been replaced by a new one elsewhere. The second form is a well-known source of bugs in React, called **stale closures**, which you will meet in {{ch:react-advanced}}. The cure is always the same: understand exactly which variable a function captured, and when.

### Memory kept alive

A closure keeps its whole environment alive for as long as the function itself is reachable. Usually that is exactly what you want. But it can cause **memory leaks** ({{ch:what-a-computer-is}}) when a long-lived function accidentally keeps large data alive:

```js
function createReportButtonHandler() {
  const hugeReportData = new Array(1_000_000).fill("row");   // a large array
  return () => {
    console.log("Report has", hugeReportData.length, "rows");
  };
}
```

As long as the returned handler exists — for example, attached to a button for the life of a web page, or stored in a server's memory — the million-element array cannot be freed. Create many such handlers, or keep adding them to a list that is never cleared, and memory use grows until the program slows down or crashes. Memoisation caches that are never cleared are a classic example: the `cache` Map above grows forever if inputs keep varying.

The fixes: keep only what the closure needs (here, just the length, not the whole array); remove handlers and clear caches when they are no longer needed; and give caches a maximum size. You will learn to find leaks with memory tools in {{ch:advanced-javascript}} and {{ch:performance-engineering}}.

## Global variables and strict mode

### Why globals are dangerous

A global variable can be read and changed by **any** code anywhere in the program. In a small script, that seems convenient. In a real application, it is a serious problem:

- **Anything can change it.** When a global has a wrong value, the cause could be any line in the whole program.
- **Names collide.** Two libraries, or two developers, can both use a global called `config` or `user`, and silently overwrite each other.
- **Hidden dependencies.** A function that reads a global has an input that does not appear in its parameters, making it harder to understand, reuse and test.
- **Shared state on servers.** In a Node.js server, one process handles requests from **many users**. A global variable — or a module-level variable — holding "the current user" can leak one user's data into another user's request. This is a real and serious class of bug.

The rule: **keep variables in the smallest scope that works.** Prefer function and block scope; pass values as parameters; keep module-level variables for genuine constants and shared resources (such as a database connection), never for per-request or per-user data.

In JavaScript, the true global object is available as **`globalThis`** (in browsers it is also called `window`). Adding properties to it creates globals; you should almost never need to.

### Accidental globals and strict mode

In old JavaScript, assigning to a variable that was never declared **silently created a global**:

```js
function setTotal() {
  totl = 500;     // typo — no declaration anywhere
}
```

Without any error, a global named `totl` appeared — and the real `total` was never set. To stop this and several other dangerous behaviours, JavaScript introduced **strict mode**. In strict mode:

- assigning to an undeclared variable throws a `ReferenceError` instead of creating a global;
- assigning to read-only properties (like those of a frozen object, {{ch:objects}}) throws instead of failing silently;
- some confusing old features are disallowed.

You can switch it on by writing `"use strict";` at the top of a file or function. But in modern code you rarely need to: **ES modules and classes are always in strict mode automatically.** Node.js projects using modules ({{ch:modules-and-npm}}) and all modern frontend code get it for free. Older Node.js files (CommonJS modules) are not strict unless they opt in, which is one reason linters are still worth running everywhere.

## From beginner to enterprise: scope and closures at every level

**Level 3 — A small program.** Variables live in the smallest block or function that needs them; `let` and `const` only. Small closures appear naturally as callbacks in `map` and `filter`.

**Level 4 — A real application.** Event handlers in web pages are closures over the page's data. Server route handlers close over shared resources such as the database connection. Factories configure functions, such as a logger that remembers which part of the program it belongs to.

**Level 5 — Professional engineering.** Modules give each file its own scope, so names never collide across a large codebase. Per-request data is passed explicitly, never kept in module-level variables, so that one user's data cannot leak into another's request. Encapsulation — through closures or classes — protects invariants such as "a balance can never go negative". Linters catch shadowing, unused variables and accidental globals.

**Level 6 — Enterprise.** Frameworks build on closures heavily: React components and their hooks are closures over each render's data ({{ch:react-advanced}}); middleware in Express and NestJS ({{ch:express}}) is a chain of functions closing over configuration. Large systems must manage **long-lived closures** carefully: caches with size limits and expiry, listeners that are removed when no longer needed, and memory monitoring in production, because a slow leak in a server that runs for weeks becomes an outage.

## Real-world use cases

### Beginner level — A ticket number generator

**Situation:** a learner wants numbered tickets for a queue, with no way for other code to skip or reset numbers.

**Solution:** a `createCounter` closure. Only calling the returned function advances the number.

**Lesson:** private state, protected by scope.

### Intermediate level — A configured logger

**Business problem:** in a growing backend, log messages from different parts of the code are mixed together, and nobody can tell where a message came from.

**Solution:** a factory `createLogger(moduleName)` returns a function that prefixes every message with the module name and the time. Each file creates its own logger once, at the top: `const log = createLogger("payments");`.

**Reasoning:** configuration is captured once in a closure; every log line from that file is labelled automatically. Real logging libraries ({{ch:logging}}) work this way.

### Advanced level — A per-user rate limit

**Business problem:** an API must stop any single user from sending more than 100 requests per minute.

**Solution (in-memory version):** a closure holds a `Map` from user ID to a count and a window start time; each request updates the count and rejects the request when it exceeds the limit.

**Limitations and failure scenarios:** the counts live in **one process's memory**. With several servers behind a load balancer ({{ch:how-the-web-works}}), each server counts separately, so a user can make 100 requests to *each* server. And the `Map` grows with every user ever seen unless old entries are removed — a memory leak. Real systems store such counters in a shared store like Redis, with automatic expiry ({{ch:rate-limiting}}, {{ch:redis}}).

### Enterprise level — Data leaking between users

**Business problem (illustrative, but a real and recurring class of incident):** a Node.js backend stores "the current user" in a module-level variable at the start of each request, for convenience, so that deep functions can read it without passing it around.

**What goes wrong:** Node.js handles many requests **at the same time** in one process ({{ch:the-event-loop}}). When request A pauses to wait for the database, request B starts and overwrites the module-level "current user". When A resumes, it reads B's user — and may show, change or email B's data.

**Prevention:** never store per-request data in module or global scope. Pass it explicitly, or use tools designed to keep per-request context separate (Node.js provides `AsyncLocalStorage` for exactly this), and test with many concurrent requests.

**Lesson:** scope is not only about tidiness. On a server, putting a variable in the wrong scope can be a privacy breach.

## Common mistakes

### Beginner mistake — Using a block variable outside its block

**What it looks like:** a `const` created inside an `if` or loop, used after it — `ReferenceError: X is not defined`.

**How to fix it:** declare the variable in the outer scope (usually with `let`) and assign it inside the block — or return the value from a function.

### Beginner mistake — Using a variable before its declaration

**What it looks like:** `Cannot access 'X' before initialization`.

**How to fix it:** move the declaration above the first use. The error tells you exactly which variable.

### Intermediate mistake — Accidental shadowing

**What it looks like:** a function declares a variable with the same name as an outer one; a developer edits the inner one thinking it is the outer.

**How to prevent it:** use distinct, descriptive names; enable the linter's `no-shadow` rule.

### Intermediate mistake — `var` in loops with closures

**What it looks like:** callbacks created in a loop all see the final value.

**How to fix it:** use `let` (or `const` in `for...of`), which creates a fresh variable each iteration.

### Production mistake — Per-request data in module scope

**What it looks like:** `let currentUser;` at the top of a server file, set by each request.

**What happens:** concurrent requests overwrite each other's values; users see each other's data.

**How to prevent it:** pass request data explicitly; use per-request context tools; review code for module-level mutable variables.

### Enterprise mistake — Unbounded caches and listeners

**What it looks like:** a memoisation cache, a `Map` of sessions or a list of event listeners that only ever grows.

**What happens:** memory climbs slowly for days, then the server crashes or slows to a crawl — often at the busiest time.

**How to prevent it:** give caches a maximum size and expiry; remove listeners when finished; monitor memory in production ({{ch:monitoring}}).

## Debugging and troubleshooting

| Error or symptom | What it means |
|---|---|
| `ReferenceError: X is not defined` | `X` is not declared in any scope on the chain from here — misspelt, or declared in an inner or sibling scope |
| `ReferenceError: Cannot access 'X' before initialization` | `X` is a `let`/`const` used during its temporal dead zone |
| A variable is unexpectedly `undefined` | It may be a `var` read before its assignment line, or a different (shadowing) variable with the same name |
| All callbacks from a loop see the same last value | They close over one shared `var` variable |
| A function uses an old value | It captured a variable that has since been replaced (a stale closure) |
| Memory grows steadily over time | Long-lived closures, caches or listeners keeping data alive |
| `TypeError: Assignment to constant variable.` | Reassigning a `const` — including a parameter you shadowed with a `const` |

> [!TIP]
> When you are unsure which variable a name refers to, use your editor. In VS Code, hold <kbd>Ctrl</kbd> (<kbd>Cmd</kbd> on macOS) and click a variable name to jump to its declaration, or press <kbd>F2</kbd> to rename it everywhere it is used — VS Code understands scope, so it renames only the right variable, not others with the same name. The debugger ({{ch:errors-and-debugging}}) also shows every scope on the chain, with their variables, while your program is paused.

## How a senior engineer thinks about scope and closures

> [!SENIOR]
> Experienced engineers use scope as a design tool:
>
> - **Smallest possible scope.** A variable that exists in fewer places can be changed by fewer things, so there are fewer places to look when it is wrong.
> - **No mutable module-level state on servers** unless it is genuinely shared and safe to share — a connection pool, a constant, a well-designed cache.
> - **Encapsulate invariants.** Rules that must always hold ("balance never negative") are protected by putting the data where only the rule-enforcing functions can reach it.
> - **Closures capture variables, not values.** When a callback behaves strangely, the first question is "which variable did this capture, and what is its value *now*?"
> - **Every long-lived closure is a memory decision.** What does it keep alive, and for how long?

## Exercises

### Exercise 1 — Predict the output

**Objective:** practise reasoning about scope, shadowing and hoisting.

**What to do:** predict each output (or error), then check in Node.js. Run each snippet separately.

```js
// A
const city = "Lahore";
function showCity() {
  const city = "Karachi";
  return city;
}
console.log(showCity(), city);

// B
function test() {
  console.log(value);
  var value = 10;
}
test();

// C
let score = 1;
{
  let score = 2;
  score++;
}
console.log(score);

// D
console.log(double(4));
function double(n) { return n * 2; }
```

<details>
<summary>Show the solution</summary>

**A** prints `Karachi Lahore`. Inside `showCity`, the inner `city` shadows the outer one; the outer `city` is unchanged.

**B** prints `undefined`. `var value` is hoisted and initialised to `undefined` in the creation phase; the assignment happens only after the `console.log` line.

**C** prints `1`. The block declares its own `score` with `let`, which shadows the outer one. `score++` changes the inner variable, which disappears at the end of the block.

**D** prints `8`. Function declarations are fully hoisted, so `double` can be called before its line.

**Common wrong approach:** expecting B to throw an error. That is how `let` and `const` behave; `var` silently gives `undefined` — which is exactly why `var` is avoided.

</details>

### Exercise 2 — An ID generator with a prefix

**Objective:** practise closures with private state and configuration.

**What to build:** a function `createIdGenerator(prefix)` that returns a function. Each call of the returned function produces the next ID, such as `"ORD-0001"`, `"ORD-0002"`. Each generator has its own sequence. Numbers are padded to four digits.

**Hints:** `padStart` from {{ch:types-of-data}}; a `let` counter inside the outer function.

<details>
<summary>Show the solution</summary>

```js
function createIdGenerator(prefix) {
  let lastNumber = 0;

  return () => {
    lastNumber++;
    return `${prefix}-${String(lastNumber).padStart(4, "0")}`;
  };
}

const nextOrderId = createIdGenerator("ORD");
const nextInvoiceId = createIdGenerator("INV");

console.log(nextOrderId());
console.log(nextOrderId());
console.log(nextInvoiceId());
console.log(nextOrderId());
```

**Output:**

```text
ORD-0001
ORD-0002
INV-0001
ORD-0003
```

Walkthrough:

- Each call to `createIdGenerator` creates a separate `lastNumber`, captured by the returned arrow function together with that call's `prefix`.
- `String(lastNumber).padStart(4, "0")` converts the number to text and pads it with zeros to four characters.
- The order and invoice generators keep independent sequences, because they close over different environments.
- No outside code can change `lastNumber`, so IDs can never be skipped or repeated within a generator.

**A real-world note:** this works for one running process. If the program restarts, the counter starts again from 1, and with several servers, each would produce duplicate IDs. Real systems generate unique IDs in the database, or use random identifiers such as UUIDs (`crypto.randomUUID()`). Recognising the limits of in-memory state is part of the lesson.

**Common wrong approach:** declaring `let lastNumber = 0;` inside the returned function. Then it resets to 0 on every call, and every ID is `ORD-0001`.

</details>

### Exercise 3 — Implement `once` and a limited version

**Objective:** practise writing closure utilities.

**What to build:** (1) Write `once(fn)` from memory, without looking at the chapter. (2) Then write `limit(fn, maxCalls)`, which allows `fn` to run at most `maxCalls` times; after that, it returns `undefined` and logs `"Limit reached"`.

<details>
<summary>Show the solution</summary>

```js
function once(fn) {
  let hasRun = false;
  let result;
  return (...args) => {
    if (!hasRun) {
      hasRun = true;
      result = fn(...args);
    }
    return result;
  };
}

function limit(fn, maxCalls) {
  let calls = 0;
  return (...args) => {
    if (calls >= maxCalls) {
      console.log("Limit reached");
      return undefined;
    }
    calls++;
    return fn(...args);
  };
}

const sendOtp = limit((phone) => `OTP sent to ${phone}`, 2);
console.log(sendOtp("0300-1234567"));
console.log(sendOtp("0300-1234567"));
console.log(sendOtp("0300-1234567"));
```

**Output:**

```text
OTP sent to 0300-1234567
OTP sent to 0300-1234567
Limit reached
undefined
```

Walkthrough of `limit`:

- `calls` lives in the closure and counts how many times `fn` has actually run.
- Each call first checks the guard: once `calls` has reached `maxCalls`, it refuses.
- Otherwise it counts the call and runs `fn` with whatever arguments arrived (`...args` collects them; `fn(...args)` passes them on).
- `once(fn)` is simply a special case of `limit(fn, 1)` that also remembers the first result.

Limiting how often something can be done — such as sending a one-time password (OTP) — is a real security requirement, because attackers abuse "send code" buttons to spam people or run up SMS costs. As in Exercise 2, a real system would keep the count in a shared store with an expiry time, not in one process's memory.

**Common wrong approach:** incrementing `calls` *after* calling `fn`. If `fn` throws an error, the call is never counted, and a failing function can be retried without limit.

</details>

### Exercise 4 — Fix the delayed messages (debugging)

**Objective:** practise diagnosing closure bugs.

**The scenario:** this code prepares a "your order is being packed" message for each order, to be sent later. Every message mentions the last order instead of its own.

```js
const orderIds = ["ORD-1", "ORD-2", "ORD-3"];
const messageSenders = [];

for (var index = 0; index < orderIds.length; index++) {
  messageSenders.push(() => `Packing ${orderIds[index]}`);
}

for (const send of messageSenders) {
  console.log(send());
}
```

**What to do:** explain the actual output and fix it in two different ways.

<details>
<summary>Show the solution</summary>

**Actual output:**

```text
Packing undefined
Packing undefined
Packing undefined
```

**Why:** `index` is declared with `var`, so there is one `index` shared by all three arrow functions. They run after the loop has finished, when `index` is 3. `orderIds[3]` does not exist, so every message says `undefined` — even worse than "the last order".

**Fix 1 — use `let`**, which creates a new `index` for each iteration:

```js
for (let index = 0; index < orderIds.length; index++) {
  messageSenders.push(() => `Packing ${orderIds[index]}`);
}
```

**Fix 2 — capture the value, not the index**, using `for...of` (or `map`):

```js
const messageSenders = orderIds.map((orderId) => () => `Packing ${orderId}`);
```

Here, each call of the outer arrow receives one `orderId` as a parameter — a separate variable per element — and returns an inner arrow that closes over it.

**Output (both fixes):**

```text
Packing ORD-1
Packing ORD-2
Packing ORD-3
```

**Lesson:** closures capture variables. When several functions are created in a loop, make sure each one captures its *own* variable. Fix 2 is arguably the more robust: capturing the actual order ID, rather than an index into an array that might change later, avoids a second class of bug.

**Common wrong approach:** "fixing" it by calling the senders inside the first loop instead of later. That hides the problem in this example but defeats the purpose — the messages were meant to be sent later — and the bug reappears the moment someone moves the call.

</details>

## Summary

**Scope** decides where a variable can be used. JavaScript has **global**, **module**, **function** and **block** scope. Code can see variables in its own scope and every scope around it, never inside nested or sibling scopes. JavaScript finds a name by searching the **scope chain** from the innermost scope outwards; the chain is fixed by where code is written — **lexical scope** — not where it is called. An inner variable with the same name **shadows** an outer one.

`var` is function-scoped and ignores blocks; `let` and `const` are block-scoped. Before running a scope, the engine has a **creation phase** in which it sets up declarations — **hoisting**: function declarations are fully available, `var` variables are `undefined`, and `let`/`const` are uninitialised, in the **temporal dead zone** until their line runs. Each function call has an **execution context** with its own **lexical environment** and a link to the outer one.

A **closure** is a function together with the environment where it was created, which stays alive while the function can be reached. Closures give functions **private, persistent state** — counters, wallets, **encapsulation** — and power **factories**, callbacks, **memoisation** and `once`. Closures capture **variables, not values**: `var` in loops makes all callbacks share one variable; `let` gives each iteration its own. Long-lived closures can keep large data alive and cause **memory leaks**.

Avoid **global** and module-level mutable state — on servers it can leak data between users. **Strict mode**, automatic in modules and classes, turns accidental globals and silent failures into errors.

## Key terms

- **Scope** — The region of a program in which a variable can be used.
- **Global scope** — The outermost scope; variables there can be used anywhere in the program.
- **Module scope** — The scope of one module (file); its top-level variables are visible throughout that file only, unless exported.
- **Function scope** — The scope of a function's body, containing its parameters and local variables.
- **Block scope** — The scope of a block between `{` and `}`, where `let` and `const` variables declared inside it exist.
- **Scope chain** — The sequence of scopes, from innermost to outermost, that JavaScript searches to find a variable.
- **Lexical scope** — The rule that a function's scope chain is determined by where it is written in the code, not where it is called.
- **Shadowing** — Declaring a variable in an inner scope with the same name as one in an outer scope, hiding the outer one.
- **Function-scoped** — Describes `var` variables, which belong to the whole enclosing function and ignore blocks.
- **Block-scoped** — Describes `let` and `const` variables, which exist only inside the block where they are declared.
- **Hoisting** — The engine setting up declarations at the start of a scope, before running its code, so they appear to be "moved to the top".
- **Creation phase** — The first phase of running a scope, in which declarations are set up.
- **Execution phase** — The second phase of running a scope, in which code runs line by line.
- **Temporal dead zone (TDZ)** — The time between the start of a scope and a `let` or `const` declaration, during which the variable exists but cannot be used.
- **Execution context** — The record the engine creates for each running scope or function call, holding its variables, its outer reference and `this`.
- **Lexical environment** — The engine's storage for the variables of one scope, linked to the environment of its outer scope.
- **Closure** — A function together with the variables of the scope where it was created, which it can still access after that scope has finished.
- **Encapsulation** — Keeping data private and allowing access only through controlled functions, so that rules about the data are always enforced.
- **Factory function** — A function that creates and returns other functions or objects, often configured by its arguments.
- **Memoisation** — Storing the results of a function for each input, so repeated calls with the same input return immediately.
- **Stale closure** — A closure that uses an out-of-date variable because it captured an earlier one.
- **Memory leak** — Memory that a program no longer needs but cannot free, because something still refers to it.
- **`globalThis`** — The name for the global object in every JavaScript environment.
- **Strict mode** — A stricter set of JavaScript rules that turns silent mistakes, such as accidental globals, into errors; automatic in modules and classes.
- **UUID** — A universally unique identifier: a long random ID, such as one made by `crypto.randomUUID()`, that is practically never repeated.

## What comes next

You now understand how JavaScript finds variables, and how functions can carry their surroundings with them. One special word has been postponed twice: **`this`**, which appeared inside the basket's `totalPaisa` method in {{ch:objects}}. Unlike ordinary variables, `this` is not decided by where code is written — it is decided by **how a function is called**, and that difference catches out developers at every level.

In the next chapter, **this, Prototypes and Classes**, you will learn exactly how `this` is decided, how JavaScript objects share behaviour through prototypes, and how classes provide a clean, modern way to create many objects of the same kind — the foundation for object-oriented programming later in the book.
