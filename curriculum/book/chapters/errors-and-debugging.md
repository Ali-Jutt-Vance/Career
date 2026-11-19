# Errors, Exceptions and Debugging

> [!GOALS]
> - What an error object is: its message, its name, its stack trace and its cause.
> - The built-in kinds of error in JavaScript, and what each one usually means.
> - How to throw errors, and why you should always throw `Error` objects rather than strings.
> - How `try`, `catch` and `finally` change the flow of a program, step by step.
> - When to catch an error and when to let it travel — and why "swallowing" errors is so dangerous.
> - The difference between expected problems (bad input, missing records) and real bugs, and how to treat each.
> - How to read a stack trace with confidence.
> - A reliable method for debugging any problem, and the professional tools for it: advanced `console` features, breakpoints and the VS Code debugger.

## Why this matters

Every program meets problems. Users type "abc" where a number belongs. Files are missing. The network drops. The database is slow. And programmers make mistakes — every programmer, every day.

What separates professional software from fragile software is not the absence of problems. It is what happens **when** they occur:

- Does the program crash completely, or fail gracefully with a helpful message?
- Does the customer see "Something went wrong", or "That coupon has expired"?
- When a payment fails halfway, is the order left in a broken state, or cleaned up properly?
- When engineers investigate, do they find a clear record of what failed and where — or nothing at all, because the error was silently ignored?

This chapter teaches you to handle errors properly, and — just as important — to **find and fix** the causes of problems quickly. Debugging is the activity you will spend more time on than any other as an engineer. Doing it methodically, with the right tools, is one of the most valuable skills you can build.

## The simple idea

When something goes wrong deep inside a program, the code that discovers the problem often cannot fix it. A function that reads a price cannot decide what the customer should be shown when the price is invalid. So it **raises an alarm**, and the alarm travels **up** through the functions that called it, until it reaches code that knows what to do.

> [!ANALOGY]
> Think of a factory assembly line. A worker finds a faulty part. They do not try to redesign the product themselves; they pull an alarm cord. The alarm goes up to the supervisor. If the supervisor knows how to handle it — swap the part — they do, and the line continues. If not, it goes up to the manager. If nobody handles it, the whole line stops.
>
> **Where the analogy breaks:** in a factory, a person decides when to pull the cord. In a program, *you* must write code that raises the alarm (throws), and code that answers it (catches). If you write no catching code, JavaScript stops the program — the line halts. And unlike a factory, a careless programmer can install a handler that hears every alarm and does nothing, so the faulty part goes straight to the customer.

In JavaScript, the alarm is an **error object**, raising it is called **throwing**, and answering it is called **catching**. Together, this mechanism is called **exception handling** — an **exception** being an unusual situation that interrupts the normal flow of the program.

## The proper definition and key words

- An **error** (in JavaScript, an `Error` object) is a value that describes something that went wrong.
- An **exception** is an error that has been **thrown**, interrupting the normal flow of execution.
- **Throwing** means raising an exception with the `throw` statement.
- **Catching** means handling a thrown exception with `try...catch`.
- An **uncaught exception** is one that nobody catches; it stops the program (or, in some environments, the current task).
- **Debugging** is the process of finding the cause of a problem and fixing it.
- A **bug** is a mistake in a program that makes it behave incorrectly.

## The error object

### Level 1 — What is inside an error

Create an error and look at it:

```js
const problem = new Error("Coupon has expired");

console.log(problem.name);
console.log(problem.message);
console.log(problem.stack);
```

**Output:**

```text
Error
Coupon has expired
Error: Coupon has expired
    at Object.<anonymous> (C:\code\learning-javascript\errors.js:1:17)
    at Module._compile (node:internal/modules/cjs/loader:1554:14)
    ...
```

An error object has three important properties:

- **`name`** — the kind of error. Here, the plain `Error`.
- **`message`** — a human-readable description, which you supply.
- **`stack`** — the **stack trace**: where the error was created, and the chain of function calls that led there. You met stack traces in {{ch:functions}}; we will read them in depth shortly.

Notice that **creating** an error does nothing dramatic. The program carries on. An error object is just a value — until it is **thrown**.

### Level 2 — Built-in kinds of error

JavaScript throws several built-in kinds of error by itself. Each is a subclass of `Error` ({{ch:this-prototypes-classes}}), and its name tells you a lot about the cause:

| Error type | Thrown when… | Typical cause |
|---|---|---|
| **SyntaxError** | Code breaks the grammar; also invalid JSON in `JSON.parse` | A typo, missing bracket, or malformed JSON |
| **ReferenceError** | A name is not found in scope, or used in its temporal dead zone | Misspelt variable, missing declaration, use before declaration ({{ch:scope-and-closures}}) |
| **TypeError** | A value is the wrong type for the operation | Reading a property of `undefined`; calling something that is not a function; reassigning a `const` |
| **RangeError** | A number is outside an allowed range | Invalid array length, `toFixed(200)`, too much recursion |
| **URIError** | Malformed web-address encoding | `decodeURIComponent("%")` |
| **AggregateError** | Several errors are reported together | Several operations failing at once ({{ch:asynchronous-javascript}}) |

**TypeError** is by far the most common in everyday work, especially its most famous form:

```text
TypeError: Cannot read properties of undefined (reading 'name')
```

You now know exactly what this means: something before `.name` was `undefined` — usually missing data.

## Throwing errors

### Level 2 — The `throw` statement

You raise an exception with `throw`:

```js
function parseQuantity(text) {
  const quantity = Number(text);
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new Error(`Invalid quantity: "${text}"`);
  }
  return quantity;
}

console.log(parseQuantity("3"));
console.log(parseQuantity("lots"));
console.log("This line never runs");
```

**Output:**

```text
3
Error: Invalid quantity: "lots"
    at parseQuantity (C:\code\learning-javascript\errors.js:4:11)
    at Object.<anonymous> (C:\code\learning-javascript\errors.js:10:13)
    ...
```

Walkthrough:

- The first call succeeds and returns 3.
- In the second call, `Number("lots")` is `NaN`, which is not an integer, so the guard clause runs `throw new Error(...)`.
- `throw` **immediately stops** the current function — like `return`, nothing after it runs. But instead of handing a value back to the caller, it starts the exception travelling **up the call stack**.
- Nobody catches it, so it reaches the top of the program, Node.js prints the error and its stack trace, and the program **stops**. The last line never runs.

### Always throw `Error` objects

JavaScript technically lets you throw **anything** — a string, a number, an object:

```js
throw "Invalid quantity";
```

Do not do this. A string has no **stack trace**, so whoever has to debug it later cannot tell where it came from. It has no `name`, so code cannot tell what kind of problem it was. Tools for monitoring errors in production expect `Error` objects. **Always throw `new Error(...)`, or an instance of a subclass of `Error`.**

### Custom errors with extra information

In {{ch:this-prototypes-classes}} you created a custom error class. Custom errors let you mark **what kind** of problem happened and carry **extra details** for whoever handles it:

```js
class ValidationError extends Error {
  constructor(field, message) {
    super(message);
    this.name = "ValidationError";
    this.field = field;
  }
}

class NotFoundError extends Error {
  constructor(resource, id) {
    super(`${resource} ${id} not found`);
    this.name = "NotFoundError";
    this.resource = resource;
    this.id = id;
  }
}

const error = new ValidationError("quantity", "Quantity must be at least 1");
console.log(error.name, error.field, error.message);
console.log(error instanceof ValidationError, error instanceof Error);
```

**Output:**

```text
ValidationError quantity Quantity must be at least 1
true true
```

`ValidationError` carries the `field` that was wrong, so a web form can highlight exactly that field. `NotFoundError` carries what was not found. Each is still an `Error`, with a stack trace.

### Wrapping errors with a cause

Often a low-level error happens inside a higher-level operation. You want to report the high-level problem ("Could not load the order") **without losing** the original detail ("connection refused"). Errors can carry a **cause**:

```js
function loadSettings(text) {
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error("Could not load settings file", { cause: error });
  }
}

try {
  loadSettings("{ broken json");
} catch (error) {
  console.log(error.message);
  console.log("Caused by:", error.cause.message);
}
```

**Output:**

```text
Could not load settings file
Caused by: Expected property name or '}' in JSON at position 2 (line 1 column 3)
```

The second argument to `new Error`, an options object with `cause`, attaches the original error. Whoever reads the error later sees both the meaning ("could not load settings") and the root cause (the exact JSON problem). This example also uses `try...catch`, which is next.

## Catching errors: `try`, `catch` and `finally`

### Level 3 — The basic shape

```js
try {
  // code that might throw
} catch (error) {
  // runs only if something in the try block threw
}
```

Here is a complete example:

```js
function parseQuantity(text) {
  const quantity = Number(text);
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new Error(`Invalid quantity: "${text}"`);
  }
  return quantity;
}

for (const input of ["2", "lots", "5"]) {
  try {
    const quantity = parseQuantity(input);
    console.log(`Adding ${quantity} to the basket`);
  } catch (error) {
    console.log(`Could not add item: ${error.message}`);
  }
}

console.log("Basket updated");
```

**Output:**

```text
Adding 2 to the basket
Could not add item: Invalid quantity: "lots"
Adding 5 to the basket
Basket updated
```

Follow the flow for each input:

```text
  input "2":     try: parseQuantity returns 2 -> log "Adding 2"  -> catch skipped
  input "lots":  try: parseQuantity THROWS    -> rest of try skipped
                 catch: log "Could not add item: ..."
  input "5":     try: parseQuantity returns 5 -> log "Adding 5"  -> catch skipped
```

Walkthrough:

- The code in the `try` block runs normally. If nothing throws, the `catch` block is skipped entirely.
- If anything in the `try` block throws — even deep inside a function it calls — the rest of the `try` block is **skipped**, and execution jumps straight to the `catch` block.
- `catch (error)` receives the thrown error object in the variable `error` (a block-scoped variable, existing only inside the `catch` block).
- After the `catch` block finishes, the program **continues normally** after the whole `try...catch`. The exception has been handled; the program did not stop.

Compare this with the previous section, where the same error stopped the whole program. Catching it turned a crash into a helpful message, and let the loop carry on with the next item.

### How an exception travels up the call stack

An exception does not have to be caught where it is thrown. It travels **up through the callers**, function by function, until it reaches a `try...catch` — or the top of the program.

```js
function readPrice(product) {
  if (typeof product.pricePaisa !== "number") {
    throw new TypeError(`Product ${product.id} has no valid price`);
  }
  return product.pricePaisa;
}

function lineTotal(product, quantity) {
  return readPrice(product) * quantity;
}

function basketTotal(lines) {
  return lines.reduce((sum, line) => sum + lineTotal(line.product, line.quantity), 0);
}

try {
  const total = basketTotal([
    { product: { id: "p1", pricePaisa: 129950 }, quantity: 1 },
    { product: { id: "p2" }, quantity: 2 },
  ]);
  console.log("Total:", total);
} catch (error) {
  console.log("Checkout failed:", error.message);
}
```

**Output:**

```text
Checkout failed: Product p2 has no valid price
```

```text
  call stack when the error is thrown:      the exception travels up:

  readPrice      <- throws TypeError          readPrice      (no catch) -> up
  lineTotal                                   lineTotal      (no catch) -> up
  (reduce's callback)                         reduce         (no catch) -> up
  basketTotal                                 basketTotal    (no catch) -> up
  main program (inside try)                   main program   CATCH -> handled
```

When `readPrice` throws, it stops immediately. So does `lineTotal`, so does the `reduce` callback, so does `basketTotal` — each function is abandoned in turn, with no return value — until the exception reaches the `try` block in the main program, whose `catch` handles it. This journey up the stack is called **propagation**.

This design is powerful: low-level functions only need to **detect** problems and throw; one well-placed `catch` higher up decides what to **do** about them. `readPrice` does not need to know whether it is being used in checkout, a report or an email.

### `finally`: code that always runs

A `try` statement can have a third part, **`finally`**, which runs **whatever happens** — whether the `try` succeeded, threw and was caught, or even returned early:

```js
function processPayment(amountPaisa) {
  console.log("Locking the order");
  try {
    if (amountPaisa <= 0) {
      throw new Error("Amount must be positive");
    }
    console.log(`Charging ${amountPaisa} paisa`);
    return "paid";
  } catch (error) {
    console.log("Payment failed:", error.message);
    return "failed";
  } finally {
    console.log("Unlocking the order");
  }
}

console.log(processPayment(50000));
console.log("---");
console.log(processPayment(-1));
```

**Output:**

```text
Locking the order
Charging 50000 paisa
Unlocking the order
paid
---
Locking the order
Payment failed: Amount must be positive
Unlocking the order
failed
```

Notice that "Unlocking the order" prints in **both** cases — even though the `try` block in the first case **returned** before reaching it. `finally` runs on the way out, no matter how the code leaves.

`finally` exists for **clean-up**: releasing something that must always be released — closing a file, ending a database transaction, hiding a loading spinner, unlocking a record. Without `finally`, a single unexpected error can leave things locked or open forever, and those problems are notoriously hard to trace.

### Rethrowing: catch only what you can handle

A `catch` block catches **every** error thrown inside its `try` — including ones you did not expect. Often, you only know how to handle **certain kinds**. The professional pattern is to handle those and **rethrow** the rest:

```js
class OutOfStockError extends Error {
  constructor(productName) {
    super(`${productName} is out of stock`);
    this.name = "OutOfStockError";
  }
}

function reserveItem(productName, stock) {
  if (stock === 0) throw new OutOfStockError(productName);
  return `${productName} reserved`;
}

function addToBasket(productName, stock) {
  try {
    return reserveItem(productName, stock);
  } catch (error) {
    if (error instanceof OutOfStockError) {
      return `Sorry — ${error.message}. We'll email you when it's back.`;
    }
    throw error;
  }
}

console.log(addToBasket("Cotton shirt", 0));
```

**Output:**

```text
Sorry — Cotton shirt is out of stock. We'll email you when it's back.
```

- If the error is an `OutOfStockError`, this function knows what to do: show a friendly message.
- **Anything else** — a bug, a database failure — is **rethrown** with `throw error;`, so it continues up the stack to code that can deal with it (usually a central error handler that logs it and shows a generic message).

Catching everything and treating it all as "out of stock" would hide real bugs behind a misleading message. **Catch the errors you can handle; let the others travel.**

## The most dangerous mistake: swallowing errors

Here is code that looks harmless and is one of the most damaging habits in software:

```js
function saveOrder(order) {
  try {
    writeToDatabase(order);
  } catch (error) {
    // ignore
  }
}
```

The `catch` block is empty. If saving fails — the database is down, the data is invalid, there is a bug in `writeToDatabase` — the error is caught and **thrown away**. The caller believes the order was saved. The customer sees "Thank you for your order". No error appears anywhere. Days later, someone notices that orders are missing, and there is **no record** of why.

This is called **swallowing** an error. It turns a loud, easy-to-find failure into a silent, hard-to-find one — often with real consequences: lost orders, lost money, corrupted data.

Rules that prevent it:

1. **Never leave a `catch` block empty.**
2. **If you catch an error, do something meaningful with it**: recover properly, show the user a real message, retry, or record it — and usually still report it.
3. **If you cannot handle it, do not catch it** — or rethrow it.
4. **At minimum, log it** with its stack trace, so it can be investigated ({{ch:logging}}).

```js
function saveOrder(order) {
  try {
    writeToDatabase(order);
  } catch (error) {
    throw new Error(`Failed to save order ${order.id}`, { cause: error });
  }
}
```

Now the failure is reported to the caller, with context ("which order?") and the original cause attached.

> [!WARNING]
> A related trap is catching an error and returning a "safe-looking" default — `return 0`, `return []`, `return null` — so that the program carries on with wrong data. A price lookup that fails and returns 0 gives products away for free. An order lookup that fails and returns an empty list tells the customer they have no orders. Defaults are only safe when "nothing" is genuinely a correct answer.

## Expected problems and real bugs

Not all errors are the same kind of thing, and experienced engineers treat two broad categories very differently.

**Operational errors** (expected problems) are things that will **definitely happen sometimes** in a correctly written program, because the world is imperfect:

- the user typed invalid input;
- the requested record does not exist;
- the network timed out;
- the payment card was declined;
- a file is missing.

The program should **anticipate** these and **handle** them deliberately: show a helpful message, retry, return a `404` status ({{ch:how-the-web-works}}), offer another option.

**Programmer errors** (bugs) are mistakes in the code itself:

- reading a property of `undefined` because of a typo;
- passing arguments in the wrong order;
- forgetting to `return` a value.

The program **cannot** sensibly handle these, because by definition it is not behaving as designed. The right response is to **fail loudly**, record the error with all its details, show the user a generic "something went wrong" message, and — most importantly — **fix the code**. Trying to "handle" a bug usually just hides it.

| | Operational error (expected) | Programmer error (bug) |
|---|---|---|
| Examples | Invalid input, not found, timeout, declined card | `undefined` property, wrong argument order |
| Cause | The outside world | The code |
| Response | Handle deliberately; tell the user something specific | Log everything; show a generic message; fix the code |
| HTTP status | Usually 4xx (or 503 for a dependency down) | 500 |
| Represent with | Specific custom errors (`ValidationError`, `NotFoundError`) | Whatever JavaScript threw (`TypeError`, etc.) |

This distinction, popularised in the Node.js community, will guide how you design error handling for servers in {{ch:error-handling}}.

### Throwing versus returning a result

For some expected outcomes, throwing is not the only option. A function can instead **return** a value that describes success or failure:

```js
function validateCoupon(code) {
  if (code === "SAVE10") {
    return { ok: true, discountPercent: 10 };
  }
  return { ok: false, reason: "Unknown coupon code" };
}

const result = validateCoupon("WELCOME");
if (result.ok) {
  console.log(`Applying ${result.discountPercent}% off`);
} else {
  console.log(`Coupon rejected: ${result.reason}`);
}
```

**Output:**

```text
Coupon rejected: Unknown coupon code
```

Which approach is better?

- **Return a result** when failure is a **normal, frequent outcome** that the caller must always consider — "is this coupon valid?", "is this username available?". The caller cannot forget to handle it, because the result is right there.
- **Throw** when failure is **exceptional** for that function, when the caller usually cannot handle it locally, or when it must travel up several levels.

Both are used in professional code; the important thing is to be consistent within a project, and never to mix them confusingly in one function.

## Errors you cannot catch this way

Two important limits are worth knowing now.

**1. Syntax errors in the file itself** stop the whole file before anything runs ({{ch:from-code-to-running-program}}), so no `try...catch` in that file can catch them. (`JSON.parse` throws a `SyntaxError` at run time, which *can* be caught — that is about the data, not your code.)

**2. Errors in code that runs later.** `try...catch` only catches errors thrown **while the `try` block is running**. Code scheduled to run later — after a timer, or when a network request finishes — runs after the `try` block has already finished:

```js
try {
  setTimeout(() => {
    throw new Error("Failed later");
  }, 100);
} catch (error) {
  console.log("Caught:", error.message);   // never runs
}
```

`setTimeout` (which you will meet properly in {{ch:asynchronous-javascript}}) schedules the function to run after 100 milliseconds. The `try` block finishes immediately, long before the function runs, so the later error is **not** caught — it becomes an uncaught exception. Handling errors in asynchronous code needs the tools in {{ch:asynchronous-javascript}}, which make `try...catch` work properly with `async`/`await`.

### When nothing catches the error

In Node.js, an uncaught exception prints the error and stops the process. For a server, that means the whole application stops for every user. Node.js lets you register a last-resort listener — `process.on("uncaughtException", ...)` — but its proper use is narrow: **log the error and then shut down cleanly**, letting a process manager restart the application ({{ch:docker}}, {{ch:ecs}}). Continuing to run after an unknown failure risks running in a broken, unpredictable state. In browsers, an uncaught error stops only the current piece of code; the page carries on, possibly half-broken.

## Reading a stack trace

A stack trace is the single most useful piece of information when something goes wrong. Learn to read it calmly and in full.

```text
TypeError: Cannot read properties of undefined (reading 'pricePaisa')
    at lineTotal (C:\code\shop\pricing.js:12:24)
    at Array.reduce (<anonymous>)
    at basketTotal (C:\code\shop\pricing.js:18:16)
    at checkout (C:\code\shop\checkout.js:41:19)
    at Object.<anonymous> (C:\code\shop\index.js:7:1)
    at Module._compile (node:internal/modules/cjs/loader:1554:14)
    at node:internal/main/run_main_module:36:49
```

Read it in this order:

1. **The first line: the type and message.** `TypeError` — a value was the wrong type. `Cannot read properties of undefined (reading 'pricePaisa')` — something was `undefined`, and the code tried to read `.pricePaisa` from it.
2. **The second line: exactly where it happened.** In the function `lineTotal`, in the file `pricing.js`, at **line 12, column 24**. Open that line first.
3. **The following lines: how the program got there**, newest first. `lineTotal` was called by `Array.reduce`, which was called by `basketTotal` (line 18), which was called by `checkout` in `checkout.js` (line 41), which was called from `index.js` line 7.
4. **Lines from `node:internal` or `node_modules`** are Node.js itself or libraries. Usually skip them and focus on **your own files** — the bug is almost always in your code, or in what your code passed to a library.

```text
  TypeError ... (reading 'pricePaisa')      <- WHAT went wrong
    at lineTotal (pricing.js:12:24)         <- WHERE it went wrong   (look here first)
    at basketTotal (pricing.js:18:16)       <- who called it
    at checkout (checkout.js:41:19)         <- who called that
    at index.js:7:1                         <- where it all started
```

With this trace, a likely story forms immediately: at line 12, something like `line.product.pricePaisa` was read, and `line.product` was `undefined` — perhaps a basket line whose product was deleted. The trace tells you where to look; looking at the data tells you why.

> [!TIP]
> In VS Code's terminal, you can <kbd>Ctrl</kbd>+click (<kbd>Cmd</kbd>+click on macOS) a file path with a line number in a stack trace to jump straight to that line. Make this a reflex.

## Debugging: a method that always works

Debugging is not guessing until something works. It is a methodical search, very like a scientist's method. Here is a process that works on every kind of problem, from a beginner's loop to a production outage.

```text
  1. REPRODUCE   Make the problem happen on purpose, reliably.
        |
  2. OBSERVE     Collect facts: the error, the inputs, the actual values.
        |
  3. HYPOTHESISE Form one specific guess about the cause.
        |
  4. TEST        Check the guess with an experiment (a log, a breakpoint, a change).
        |
     right? --no--> back to 2 with the new facts
        |
       yes
        |
  5. FIX         Fix the cause, not just the symptom.
        |
  6. VERIFY      Confirm the problem is gone and nothing else broke;
                 add a test so it cannot return.
```

**1. Reproduce.** Find the exact steps or inputs that make the problem happen. A bug you can trigger on demand is half solved. If it only happens "sometimes", look for what differs between the times it happens and the times it does not — particular data, timing, a particular user.

**2. Observe.** Gather facts before forming opinions: the full error message and stack trace, the input, the **actual** values of variables at key points. Beginners often skip this and jump to guessing.

**3. Hypothesise.** Make one specific, testable guess: "I think `line.product` is `undefined` for basket lines whose products were deleted."

**4. Test the hypothesis.** Design a quick experiment that would prove or disprove it: log `line` before line 12, or pause the program there and look. If the guess was wrong, you have still learned something — go back to step 2 with the new facts.

**5. Fix the cause.** Fix *why* it happens, not just the symptom. Adding `?.` to stop the crash is a symptom fix if the real problem is that deleted products should never remain in baskets.

**6. Verify.** Confirm the original problem is gone, check you have not broken anything else, and — ideally — add an automated test that reproduces the bug, so it can never quietly return ({{ch:testing}}).

### Narrowing down: divide and conquer

When you do not know where a problem is, **halve the search space** each time. Put a check (a log line or a breakpoint) roughly in the middle of the suspect code. Is the data already wrong at that point? Then the problem is in the first half; otherwise, the second. Repeat. Ten halvings can narrow ten thousand lines down to about ten.

The same idea works across **time**: if something worked last week and is broken now, the cause is in one of the changes made since. Git can binary-search through commits for you with a command called `git bisect` ({{ch:git}}), testing the version halfway between a known-good and a known-bad version, then halfway again, until it finds the exact change that broke things.

## Debugging tools

### Getting more from `console`

You have used `console.log` throughout. A few more `console` features make it far more powerful:

```js
const order = { id: "ORD-5521", items: [{ name: "Cap", pricePaisa: 49900 }], status: "paid" };

console.log({ order });                          // label + value in one go
console.dir(order, { depth: null });             // show every nested level
console.table(order.items);                      // lists of records as a table

console.time("pricing");
let total = 0;
for (let i = 0; i < 1_000_000; i++) total += i;
console.timeEnd("pricing");                      // how long the code took

console.assert(order.status === "shipped", "Expected a shipped order", order.id);

function deepFunction() {
  console.trace("How did we get here?");         // prints a stack trace without an error
}
deepFunction();
```

**Output (shortened):**

```text
{ order: { id: 'ORD-5521', items: [ [Object] ], status: 'paid' } }
{ id: 'ORD-5521', items: [ { name: 'Cap', pricePaisa: 49900 } ], status: 'paid' }
┌─────────┬───────┬────────────┐
│ (index) │ name  │ pricePaisa │
├─────────┼───────┼────────────┤
│ 0       │ 'Cap' │ 49900      │
└─────────┴───────┴────────────┘
pricing: 4.217ms
Assertion failed: Expected a shipped order ORD-5521
Trace: How did we get here?
    at deepFunction (C:\code\learning-javascript\debug.js:14:11)
    ...
```

- **`console.log({ order })`** — property shorthand ({{ch:objects}}) prints the value with its name.
- **`console.dir(value, { depth: null })`** — shows all nested levels instead of `[Object]`.
- **`console.table`** — ideal for arrays of records.
- **`console.time` / `console.timeEnd`** — measures how long a piece of code takes; the label links the two calls.
- **`console.assert(condition, ...)`** — prints a message **only if the condition is false**. A quick way to check assumptions.
- **`console.trace`** — prints the current call stack without any error: "who called this function?"

### The debugger: pausing a running program

Logging shows values you **decided in advance** to print. A **debugger** lets you **pause** a running program at any line and look at **everything**: every variable in every scope, the whole call stack — and then move forward one line at a time, watching values change. It is the most powerful debugging tool there is, and many beginners never learn it. Learn it now.

**Breakpoints.** A **breakpoint** marks a line where the program should pause. In VS Code, click in the margin to the left of a line number; a red dot appears.

**Starting the debugger in VS Code:**

1. Open the JavaScript file you want to debug and set a breakpoint.
2. Open the **Run and Debug** view in the activity bar (the play-button icon with a small bug), or press <kbd>F5</kbd>.
3. If asked, choose **Node.js**. VS Code runs your file with the debugger attached.
   - Alternatively, open a **JavaScript Debug Terminal** (from the dropdown next to the `+` in the terminal panel) and run your program normally with `node file.js` — the debugger attaches automatically.
4. The program runs until it reaches the breakpoint, then **pauses**. The paused line is highlighted.

While paused, the Run and Debug view shows:

- **Variables** — every variable in the current scope, the scopes around it, and the global scope — the **scope chain** from {{ch:scope-and-closures}}, made visible. Expand objects and arrays to see inside them.
- **Watch** — expressions you add yourself, such as `line.product` or `total / 100`, re-evaluated at every step.
- **Call Stack** — the stack of functions, exactly as in a stack trace. Click a lower frame to see that function's variables at the moment it called the next one.

You can also hover over any variable in the editor to see its value.

**Stepping.** A small toolbar appears while paused. Its buttons control execution:

| Button | Shortcut | What it does |
|---|---|---|
| **Continue** | <kbd>F5</kbd> | Run until the next breakpoint |
| **Step Over** | <kbd>F10</kbd> | Run the current line, and pause on the next line of *this* function (calls on the line run completely) |
| **Step Into** | <kbd>F11</kbd> | If the current line calls a function, go inside it and pause on its first line |
| **Step Out** | <kbd>Shift</kbd> + <kbd>F11</kbd> | Finish the current function and pause back in its caller |
| **Restart** / **Stop** | <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>F5</kbd> / <kbd>Shift</kbd> + <kbd>F5</kbd> | Start again / end the session |

A typical session: set a breakpoint just before the suspicious code, start the debugger, look at the variables when it pauses, then **step over** line by line, watching which value changes unexpectedly. When a call looks suspicious, **step into** it.

**Advanced breakpoints.** Right-click a breakpoint to make it smarter:

- **Conditional breakpoint** — pause only when an expression is true, such as `line.product === undefined`. Indispensable when a loop runs ten thousand times and fails on one item.
- **Logpoint** — instead of pausing, print a message (such as `Line {line.id} total {total}`) each time the line runs. Like adding `console.log`, but without editing and saving the code.

**The `debugger` statement.** Writing `debugger;` in your code acts as a breakpoint whenever a debugger is attached. It is handy in browsers, where you might not easily find the line in the developer tools. Never leave it in committed code — linters flag it.

**Debugging in the browser.** For frontend code, the browser's own developer tools have the same features in the **Sources** panel (Chrome and Edge) or **Debugger** panel (Firefox): breakpoints, stepping, variables, call stack and watch expressions. Node.js programs can also be debugged in Chrome by running `node --inspect-brk file.js` and opening `chrome://inspect`.

> [!TRY]
> Take the `basketTotal` example from "How an exception travels up the call stack" above, save it as a file, and put a breakpoint on the `throw` line inside `readPrice`. Run it under the debugger. When it pauses, look at the **Call Stack** panel and click each frame in turn: `readPrice`, `lineTotal`, the reduce callback, `basketTotal`. In each, look at the **Variables** panel. You are looking at exactly the call stack diagram from this chapter — live.

## From beginner to enterprise: errors at every level

**Level 3 — A small program.** Invalid input is checked and reported with `throw new Error(...)`; `try...catch` turns crashes into helpful messages; the debugger finds problems.

**Level 4 — A real application.** The application defines custom error classes for its expected problems — validation, not found, conflict, out of stock — each mapped to an HTTP status and a safe message. Low-level code throws; a central handler catches, decides the response, and logs the details. Clean-up happens in `finally`. Users never see stack traces or internal messages, which could reveal security-sensitive details.

**Level 5 — Professional engineering.** Errors are **logged** with context — request ID, user ID, the operation, the cause chain — to a central system ({{ch:logging}}). **Error-monitoring services** (such as Sentry) collect uncaught errors from servers and browsers, group identical ones, and alert the team when a new kind appears or a known one spikes. Every production bug is reproduced in a test before it is fixed. Teams agree conventions: which errors are thrown, which returned as results, and how they are named.

**Level 6 — Enterprise.** Across many services, errors must be understood end to end: a timeout in the payment service must be traceable back to the user's checkout request that started the chain, through **distributed tracing** ({{ch:observability-and-incidents}}). Systems are designed to **fail gracefully**: if recommendations are down, the shop still sells; if a dependency keeps failing, a **circuit breaker** stops calling it for a while instead of piling up failures ({{ch:distributed-systems}}). Error rates are tracked as reliability targets, and major failures lead to written incident reviews focused on preventing recurrence rather than blaming individuals.

## Real-world use cases

### Beginner level — A calculator that does not crash

**Situation:** a learner's command-line calculator crashes when the user types a letter.

**Solution:** validate input with `Number` and `Number.isNaN`, throw a clear error for invalid input, and catch it around each calculation to print "Please enter a number" and continue.

**Lesson:** expected problems should produce helpful messages, not crashes.

### Intermediate level — Form validation errors

**Business problem:** a clinic's booking form returns "Error 500" whenever any field is wrong, so patients do not know what to fix.

**Solution:** the backend throws `ValidationError` objects that carry the field name and a message; the API returns them with status 422 and a list of field problems; the form highlights each field.

**Reasoning:** expected problems are part of the product's design. Users need to know *what* to fix.

### Advanced level — The swallowed error that lost orders

**Business problem (illustrative, but a very common story):** an online shop discovers, weeks later, that roughly one order in two hundred never reached the warehouse.

**Investigation:** the code that sends orders to the warehouse system was wrapped in `try { ... } catch (e) {}` "to stop the checkout from failing". When the warehouse system timed out, the error was silently discarded.

**Fix:** never swallow; record the failure, put the order into a retry queue ({{ch:queues}}), alert the team when retries keep failing, and show staff a dashboard of stuck orders.

**Lesson:** the original code did prevent checkout failures — by turning a visible problem into an invisible one that cost far more.

### Enterprise level — Error monitoring and release safety

**Business problem (illustrative):** a SaaS company releases new code several times a day. A release occasionally introduces an error that affects only one customer type, and it is noticed hours later through support tickets.

**Solution:** error-monitoring tools collect every uncaught error with its release version; a new error type, or a jump in error rate after a release, triggers an alert and an automatic rollback to the previous version.

**Trade-offs:** monitoring costs money, and noisy alerts get ignored, so errors must be carefully grouped and only meaningful changes should alert. Error reports must also avoid collecting personal data such as passwords or payment details.

## Common mistakes

### Beginner mistake — Throwing strings

**What it looks like:** `throw "Something went wrong";`

**What happens:** no stack trace, no error type; whoever debugs it cannot find its source.

**How to fix it:** `throw new Error("Something went wrong");`

### Beginner mistake — Wrapping everything in `try...catch`

**What it looks like:** every function body wrapped in `try...catch` that logs "Error!" and carries on.

**What happens:** bugs are hidden, wrong data flows onward, and the messages are useless.

**How to fix it:** catch only where you can genuinely handle a specific problem, or at a central boundary that logs and responds.

### Intermediate mistake — Swallowing errors

**What it looks like:** empty `catch` blocks, or `catch` blocks that return misleading defaults.

**What happens:** silent data loss and wrong behaviour, discovered late, with no evidence.

**How to fix and prevent it:** never leave `catch` empty; rethrow, wrap with a cause, or log with full details. Linters can flag empty blocks.

### Intermediate mistake — Losing the original error

**What it looks like:** `catch (error) { throw new Error("Save failed"); }` — the original error is discarded.

**What happens:** the report says "Save failed" but not *why*.

**How to fix it:** `throw new Error("Save failed", { cause: error });`

### Production mistake — Showing internal errors to users

**What it looks like:** an API returning `"TypeError: Cannot read properties of undefined"` with a stack trace, or database error messages showing table names.

**What happens:** users are confused, and attackers learn about the system's internals.

**How to prevent it:** show users safe, helpful messages; keep technical details in logs.

### Enterprise mistake — Continuing after an unknown failure

**What it looks like:** a global handler that catches every uncaught exception and lets the server keep running.

**What happens:** the process may be in a corrupted state — half-finished operations, broken connections — and keep producing wrong results for every user.

**How to prevent it:** log, then shut down cleanly and let the platform restart a fresh instance; handle expected errors properly so that uncaught ones are genuinely rare.

## Debugging and troubleshooting

| You see | First thing to check |
|---|---|
| `TypeError: Cannot read properties of undefined (reading 'x')` | Which value before `.x` is `undefined`, and why — print or inspect each part of the path |
| `TypeError: x is not a function` | What `x` actually holds (`typeof x`); misspelt method; lost `this`; a plain object from JSON |
| `ReferenceError: x is not defined` | Spelling, declaration, scope |
| `SyntaxError` with a file and line | The exact line and the one before it — often a missing bracket, quote or comma |
| `SyntaxError ... in JSON` | The text being parsed — print it; it may be an HTML error page, not JSON |
| `RangeError: Maximum call stack size exceeded` | A function calling itself without stopping |
| The program "does nothing" with no error | Is the code reached at all? Is an error being swallowed? Add a log or breakpoint at the start |
| A wrong value, no error | Logic error — find the first point where a value differs from what it should be |

## How a senior engineer thinks about errors and debugging

> [!SENIOR]
> Experienced engineers treat errors as **information**, not embarrassment:
>
> - **Fail loudly, early and clearly.** An error at the point of the mistake, with a precise message, is a gift. Silent wrong data is the enemy.
> - **Expected or bug?** Expected problems get specific handling and user-friendly messages. Bugs get logged, surfaced and fixed — not "handled".
> - **Catch with a purpose.** Every `catch` must be able to say what it handles and why. Everything else travels up to a central boundary.
> - **Preserve context.** Messages say *which* order, *which* user, *which* operation; causes are chained, not discarded.
> - **Debug with method, not hope.** Reproduce, observe, hypothesise, test. Change one thing at a time. Prove the cause before fixing it.
> - **Make it unable to return.** Every fixed bug gets a test, and every surprising failure prompts the question: "How could we have detected this sooner?"

## Exercises

### Exercise 1 — A safe JSON reader

**Objective:** practise `try...catch` and the result pattern.

**What to build:** a function `safeParseJSON(text)` that returns `{ ok: true, value }` when the text is valid JSON, and `{ ok: false, error }` (with the error message) when it is not. Test it with `'{"city":"Lahore"}'`, `'{city:"Lahore"}'` and `''`.

<details>
<summary>Show the solution</summary>

```js
function safeParseJSON(text) {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

console.log(safeParseJSON('{"city":"Lahore"}'));
console.log(safeParseJSON('{city:"Lahore"}'));
console.log(safeParseJSON(""));
```

**Output:**

```text
{ ok: true, value: { city: 'Lahore' } }
{
  ok: false,
  error: "Expected property name or '}' in JSON at position 1 (line 1 column 2)"
}
{ ok: false, error: 'Unexpected end of JSON input' }
```

Walkthrough:

- `JSON.parse` is called inside `try`. If it succeeds, the function returns a success result containing the parsed value.
- If it throws — invalid JSON — execution jumps to `catch`, and the function returns a failure result with the message.
- The empty string is not valid JSON either; its message, "Unexpected end of JSON input", is one you will see often when a server returns an empty body.
- Node.js prints the second message in double quotes because the message itself contains a single quote.

This turns a throwing function into one that returns results — useful when invalid JSON is an expected, normal outcome (for example, a user pasting settings).

**Common wrong approach:** `catch (error) { return {}; }` — returning an empty object as if parsing succeeded. The caller cannot tell "valid but empty" from "invalid", and continues with wrong data.

</details>

### Exercise 2 — Validation errors with fields

**Objective:** practise custom errors and selective catching.

**What to build:** a `ValidationError` class with a `field` property. A function `validateSignup({ email, age })` throws a `ValidationError` for an email without `@` (field `"email"`) or an age that is not a whole number of at least 18 (field `"age"`). Write a function `trySignup(data)` that returns `"Welcome!"` on success, or `"<field>: <message>"` for validation errors — and **rethrows** any other error.

<details>
<summary>Show the solution</summary>

```js
class ValidationError extends Error {
  constructor(field, message) {
    super(message);
    this.name = "ValidationError";
    this.field = field;
  }
}

function validateSignup({ email, age }) {
  if (typeof email !== "string" || !email.includes("@")) {
    throw new ValidationError("email", "Please enter a valid email address");
  }
  if (!Number.isInteger(age) || age < 18) {
    throw new ValidationError("age", "You must be at least 18");
  }
}

function trySignup(data) {
  try {
    validateSignup(data);
    return "Welcome!";
  } catch (error) {
    if (error instanceof ValidationError) {
      return `${error.field}: ${error.message}`;
    }
    throw error;
  }
}

console.log(trySignup({ email: "sara@example.com", age: 25 }));
console.log(trySignup({ email: "sara.example.com", age: 25 }));
console.log(trySignup({ email: "sara@example.com", age: 16 }));
```

**Output:**

```text
Welcome!
email: Please enter a valid email address
age: You must be at least 18
```

Walkthrough:

- `validateSignup` destructures its options object ({{ch:objects}}) and throws a specific error for each problem, carrying the field name.
- `trySignup` handles **only** `ValidationError`s, turning them into messages. Any other error — for example, if `data` were `undefined`, destructuring it would throw a `TypeError` — is rethrown, because it indicates a bug, not bad user input.
- `typeof email !== "string"` guards against a missing email before calling `includes`, which would otherwise throw a `TypeError` itself.

**Common wrong approach:** `catch (error) { return error.message; }` for every error. Then a programming bug like `Cannot destructure property 'email' of 'undefined'` is shown to the user as if it were a form problem.

</details>

### Exercise 3 — Always clean up

**Objective:** practise `finally`.

**What to build:** a function `withLoadingIndicator(task)` that prints `"Loading..."`, runs `task()`, and always prints `"Done loading"` afterwards — whether `task` succeeds or throws. It returns the task's result, or lets the task's error propagate. Test it with a task that returns `"data"` and one that throws.

<details>
<summary>Show the solution</summary>

```js
function withLoadingIndicator(task) {
  console.log("Loading...");
  try {
    return task();
  } finally {
    console.log("Done loading");
  }
}

console.log(withLoadingIndicator(() => "data"));

try {
  withLoadingIndicator(() => {
    throw new Error("Server unavailable");
  });
} catch (error) {
  console.log("Caller saw:", error.message);
}
```

**Output:**

```text
Loading...
Done loading
data
Loading...
Done loading
Caller saw: Server unavailable
```

Walkthrough:

- There is **no `catch`** in `withLoadingIndicator` — `try...finally` is allowed on its own. The function does not know how to handle the task's errors, so it does not catch them; it only guarantees the clean-up.
- On success, `return task()` evaluates the result, then `finally` prints, then the result is returned.
- On failure, the error starts propagating, `finally` prints on the way out, and the error continues to the caller, who catches it.

This is the shape of countless real functions: show a spinner, open a connection, lock a record — and **always** undo it, however the work ends.

**Common wrong approach:** printing "Done loading" after the `try` block instead of in `finally`. When the task throws, that line never runs, and in a real interface the loading spinner would spin forever.

</details>

### Exercise 4 — Investigate with the debugger (debugging)

**Objective:** practise the debugging method and the VS Code debugger.

**The scenario:** this program should report `Average order value: Rs 1500.00`, but prints `Average order value: Rs NaN`.

```js
const orders = [
  { id: "A1", totalPaisa: 120000 },
  { id: "A2", totalPaisa: 180000 },
  { id: "A3", total: 150000 },
];

function averageOrderValue(list) {
  let sum = 0;
  for (const order of list) {
    sum += order.totalPaisa;
  }
  return sum / list.length;
}

const average = averageOrderValue(orders);
console.log(`Average order value: Rs ${(average / 100).toFixed(2)}`);
```

**What to do:** follow the method — reproduce, observe, hypothesise, test, fix, verify — using a breakpoint on the `sum += order.totalPaisa;` line. Write down what you see at each iteration.

<details>
<summary>Show the solution</summary>

**Reproduce:** running the program prints `Rs NaN` every time.

**Observe (with the debugger):** with a breakpoint on `sum += order.totalPaisa;`, the program pauses three times. In the Variables panel (or with a Watch expression on `order.totalPaisa`):

```text
  pause 1: order = { id: 'A1', totalPaisa: 120000 }   sum = 0
  pause 2: order = { id: 'A2', totalPaisa: 180000 }   sum = 120000
  pause 3: order = { id: 'A3', total: 150000 }        sum = 300000
           order.totalPaisa = undefined
  after:   sum = NaN
```

**Hypothesise:** order A3 uses a different property name, `total`, so `order.totalPaisa` is `undefined`, and `300000 + undefined` is `NaN` — which then spreads through the division ({{ch:types-of-data}}).

**Test:** step over the line on pause 3 and watch `sum` change from 300000 to `NaN`. Confirmed.

**Fix:** the real cause is inconsistent data. The right fix depends on where the data comes from — the best fix is at the source, so every order has `totalPaisa`. In this code, we can also make the function **fail loudly** rather than silently produce `NaN`:

```js
function averageOrderValue(list) {
  if (list.length === 0) {
    throw new Error("Cannot average an empty list of orders");
  }
  let sum = 0;
  for (const order of list) {
    if (!Number.isInteger(order.totalPaisa)) {
      throw new TypeError(`Order ${order.id} has no valid totalPaisa`);
    }
    sum += order.totalPaisa;
  }
  return sum / list.length;
}
```

With the data fixed (`{ id: "A3", totalPaisa: 150000 }`), the output is:

```text
Average order value: Rs 1500.00
```

With the data still broken, the program now stops with a clear message: `TypeError: Order A3 has no valid totalPaisa` — pointing straight at the bad record instead of producing a mysterious `NaN`.

**Verify:** run with the corrected data; also try an empty list, which now gives a clear error instead of `NaN` from dividing 0 by 0.

**Lesson:** the debugger showed *exactly* which iteration went wrong in seconds. And the fix did not just patch the symptom — it made the function refuse bad data loudly, so the next data problem will be found immediately.

**Common wrong approach:** writing `sum += order.totalPaisa ?? 0;`. The `NaN` disappears, but order A3 is now silently counted as zero, and the average is wrong: Rs 1000.00. A plausible wrong number is worse than an obvious `NaN`.

</details>

## Summary

An **`Error` object** has a `name`, a `message`, a `stack` trace and optionally a `cause`. JavaScript throws built-in errors — **SyntaxError**, **ReferenceError**, **TypeError**, **RangeError** and others — whose names point to their likely causes. Raise exceptions with **`throw`**, always using `Error` objects or **custom error** subclasses carrying extra details; wrap low-level errors with `{ cause }` to keep the original.

**`try...catch`** runs code that might throw; if it does, the rest of the `try` is skipped and `catch` receives the error, after which the program continues. Exceptions **propagate** up the call stack until caught. **`finally`** always runs, for clean-up. **Catch only what you can handle and rethrow the rest.** Never **swallow** errors with empty `catch` blocks or misleading defaults.

Distinguish **operational errors** (expected: bad input, not found, timeouts — handle deliberately) from **programmer errors** (bugs — log, fail loudly, fix the code). For frequent expected failures, **returning a result** object can be clearer than throwing. `try...catch` cannot catch errors from code that runs later (asynchronous code) or syntax errors in its own file. Uncaught exceptions in Node.js stop the process.

Read a **stack trace** from the top: what went wrong, where, and how the program got there. Debug methodically: **reproduce, observe, hypothesise, test, fix, verify**, narrowing the search by halves. Use advanced `console` methods, and the **debugger**: breakpoints, stepping, variables, watch expressions, the call stack, conditional breakpoints and logpoints.

## Key terms

- **Error object** — A value describing something that went wrong, with a name, a message and a stack trace.
- **Exception** — An error that has been thrown, interrupting the normal flow of a program.
- **`throw`** — A statement that raises an exception, immediately stopping the current function.
- **Exception handling** — Detecting, raising and responding to errors in a controlled way.
- **`try...catch`** — A statement that runs code and, if it throws, passes the error to a `catch` block instead of stopping the program.
- **`finally`** — A block that always runs after `try` (and `catch`), whatever happened, used for clean-up.
- **Propagation** — An exception travelling up the call stack, function by function, until it is caught.
- **Uncaught exception** — An exception that no code catches, which stops the program or task.
- **Rethrowing** — Throwing a caught error again because the current code cannot handle it.
- **Swallowing an error** — Catching an error and discarding it without handling or reporting it.
- **Error cause** — An original error attached to a new, higher-level error using `{ cause }`.
- **SyntaxError** — An error for code that breaks the language's grammar, or for invalid JSON passed to `JSON.parse`.
- **ReferenceError** — An error for a name that cannot be found in scope, or is used before initialisation.
- **TypeError** — An error for an operation on a value of the wrong type, such as reading a property of `undefined`.
- **RangeError** — An error for a number outside an allowed range, including exceeding the call stack size.
- **Operational error** — An expected problem caused by the outside world, such as invalid input or a timeout, which the program should handle.
- **Programmer error** — A bug in the code itself, which should be logged and fixed rather than handled.
- **Result object** — A returned value that describes success or failure, such as `{ ok: false, reason }`, used instead of throwing.
- **Stack trace** — The list of function calls that led to the point where an error was created.
- **Debugging** — Finding and fixing the cause of a problem in a program.
- **Bug** — A mistake in a program that makes it behave incorrectly.
- **Reproducing a bug** — Making a bug happen reliably on purpose, as the first step in fixing it.
- **Hypothesis (debugging)** — A specific, testable guess about the cause of a bug.
- **Divide and conquer** — Narrowing down the location of a problem by repeatedly checking the middle of the suspect range.
- **`git bisect`** — A Git command that binary-searches through commits to find the one that introduced a problem.
- **Debugger** — A tool that pauses a running program so you can inspect its variables and step through it line by line.
- **Breakpoint** — A marked line where the debugger pauses the program.
- **Conditional breakpoint** — A breakpoint that pauses only when a given expression is true.
- **Logpoint** — A breakpoint that prints a message instead of pausing.
- **Step over / step into / step out** — Debugger commands that run the current line, enter a called function, or finish the current function.
- **Watch expression** — An expression the debugger re-evaluates and displays at every pause.
- **`console.assert`** — A console method that prints a message only when a condition is false.
- **`console.trace`** — A console method that prints the current call stack.
- **Error monitoring** — A service that collects, groups and alerts on errors from running applications.
- **Circuit breaker** — A pattern that stops calling a failing dependency for a while, so failures do not pile up.

## What comes next

Your programs can now handle problems gracefully, and you can find and fix bugs methodically. But all of your code so far has lived in single files, using only what JavaScript and Node.js provide.

Real projects are made of **many files**, each responsible for one part of the program, and they rely on **libraries** written by other people — for dates, payments, web servers, databases. In the next chapter, **Modules and npm: Code Across Many Files**, you will learn how to split a program into modules that import and export from each other, how to install and use libraries with npm, and how professional projects record exactly which versions they depend on — so that "it works on my machine" becomes "it works everywhere".
