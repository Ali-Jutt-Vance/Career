# Phase 1 — Chapter 1: JavaScript

> *"Any application that can be written in JavaScript, will eventually be written in JavaScript."* — Jeff Atwood, 2007

---

## Chapter Overview

### Why JavaScript Exists

JavaScript was created in **ten days** in May 1995 by Brendan Eich at Netscape Communications. The goal was simple: give web browsers a lightweight scripting language so web pages could respond to user actions without requiring a full page reload from the server.

At the time, every interaction on the web required sending a request to a server and waiting for the server to return an entire new HTML page. Clicking a button to validate a form required a round trip to the server that could take 5–30 seconds over dial-up connections. JavaScript was created to run validation, animations, and simple logic *inside the browser*, instantly.

The name "JavaScript" was a marketing decision — the language was originally called "Mocha," then "LiveScript," and was renamed to "JavaScript" to piggyback on the popularity of Java (despite the two languages being almost completely unrelated).

**The key insight:** JavaScript is the only programming language that runs natively in web browsers. Every other language needs to be either compiled to JavaScript or run on a server. This monopoly on the browser made JavaScript unavoidable — and eventually, via Node.js, it escaped the browser entirely.

### Problems It Solves

JavaScript solves these fundamental problems:

**1. Client-side interactivity without server round trips**
Without JavaScript, every user action (hover, click, input) requires a server request. With JavaScript, the browser can respond instantly — validating a form field as the user types, showing/hiding elements, updating a counter.

**2. Dynamic content manipulation**
JavaScript can read and modify the entire structure of an HTML page after it loads. It can add elements, remove them, change text, update images — all without reloading.

**3. Asynchronous communication (AJAX)**
JavaScript can send data to a server and receive a response in the background, without the user ever seeing a page reload. This is how Gmail, Google Maps, and Facebook work.

**4. Universal runtime**
Via Node.js, JavaScript runs on servers, in CLI tools, in desktop applications (Electron), in mobile apps (React Native), in embedded devices, and in the cloud.

**5. Full-stack unification**
With JavaScript on both frontend and backend, teams share code (validation logic, data models, utility functions) between client and server — reducing duplication and context-switching.

### Industry Adoption

JavaScript is consistently the **most used programming language in the world**, a position it has held for over a decade in the Stack Overflow Developer Survey (2013–2024).

- **98.8% of all websites** use JavaScript on the client side (W3Techs, 2024)
- **6.9 million+ npm packages** in the npm registry (largest package ecosystem of any language)
- **Node.js** powers the backend at Netflix, LinkedIn, Uber, PayPal, NASA, and thousands of startups
- **React** (JavaScript/TypeScript) is the dominant UI framework, used by Facebook, Instagram, WhatsApp Web, Airbnb, Twitter, Dropbox
- **TypeScript** (JavaScript superset) is the language of choice for large-scale applications at Microsoft, Slack, Airbnb, Lyft

### Real-World Examples

| Company | JavaScript Usage |
|---------|-----------------|
| **Netflix** | Node.js server-side rendering, React UI, performance-critical streaming logic |
| **LinkedIn** | Migrated backend from Ruby to Node.js; saw 2–10x performance improvement and 27% reduction in CPU usage |
| **Uber** | Real-time geolocation, dispatch system, driver app — all Node.js |
| **PayPal** | Rewrote Java backend to Node.js; built 2x faster with 33% fewer lines of code, 35% faster response times |
| **NASA** | Node.js for EVA (spacewalk) data systems — real-time telemetry processing |
| **Walmart** | Node.js handles 6M+ requests per minute during Black Friday |
| **Airbnb** | React everywhere; isomorphic JavaScript (same code runs on server and browser) |
| **GitHub** | Extensive JavaScript use; React on frontend, Node.js services |

### Companies Using It

**FAANG/Big Tech:** Google, Amazon, Microsoft, Apple, Meta, Netflix, Twitter  
**FinTech:** Stripe, PayPal, Robinhood, Coinbase, Revolut  
**Ride-sharing:** Uber, Lyft  
**E-commerce:** Shopify, eBay, Walmart  
**SaaS:** Slack, Atlassian, Notion, Linear, Vercel  
**Healthcare:** Epic Systems (patient portals), Oscar Health  
**Gaming:** Electronic Arts (web tools), Roblox (web platform)

### Alternatives

| Language | Browser Support | Compiles to JS | Use Case |
|----------|----------------|----------------|----------|
| **TypeScript** | Via transpilation | Yes | Large-scale JS applications with type safety |
| **CoffeeScript** | Via transpilation | Yes | Historical; largely superseded by ES6+ |
| **Dart** | Via transpilation | Yes | Flutter web; Google's preferred alternative |
| **Elm** | Via transpilation | Yes | Functional frontend with no runtime errors |
| **ReScript** | Via transpilation | Yes | OCaml-like functional language for React |
| **WebAssembly** | Native in browser | No | Performance-critical code (C++, Rust, Go → WASM) |
| **Python (Pyodide)** | Via WASM | No | Scientific computing in browser |

**For server-side**, JavaScript (Node.js) competes with Python, Go, Java, Rust, and PHP.

### When NOT to Use JavaScript

JavaScript is not the right tool for every job. Do NOT use JavaScript when:

1. **CPU-intensive computations**: Number crunching, cryptography, video processing — Python with NumPy, Rust, or Go are dramatically faster for pure computation.

2. **Machine learning / AI training**: Python's ecosystem (PyTorch, TensorFlow, scikit-learn) is unmatched. JavaScript ML libraries (TensorFlow.js) are useful for inference in the browser, not training.

3. **Systems programming**: Memory management, kernel modules, device drivers — use Rust, C, or C++.

4. **Hard real-time systems**: JavaScript's garbage collector can cause unpredictable pauses. For hard real-time (aircraft, medical devices, industrial control), use C/C++ or Ada.

5. **Static websites with no interactivity**: Plain HTML/CSS is faster, simpler, and more accessible. JavaScript should be added only when it provides clear value.

6. **High-concurrency, long-lived CPU tasks**: Python with asyncio, Go, or Erlang/Elixir may be better for specific workloads.

### Future Relevance

JavaScript is not going anywhere. Several trends ensure its longevity:

- **WebAssembly** extends the browser, it doesn't replace JavaScript. WASM and JS are designed to work together.
- **TypeScript** is simply typed JavaScript — JavaScript remains the compilation target.
- **Edge computing** (Cloudflare Workers, Vercel Edge, Deno Deploy) uses the V8 JavaScript engine as the universal runtime.
- **AI coding assistants** (GitHub Copilot, etc.) generate vast amounts of JavaScript, accelerating adoption.
- **The npm ecosystem** — with 6.9M+ packages — creates a massive network effect that no other language ecosystem can easily replicate.

The JavaScript engine (V8, SpiderMonkey, JavaScriptCore) is arguably the most optimized runtime in existence, with decades of engineering investment from Google, Mozilla, and Apple. This runtime advantage underpins Node.js performance.

---

## Beginner Theory

### Core Concepts

JavaScript is a **multi-paradigm, interpreted, dynamically-typed, single-threaded** programming language with a **prototype-based** object system and **first-class functions**.

Let's unpack each term:

**Multi-paradigm:** You can write JavaScript in different styles:
- Imperative: step-by-step instructions
- Object-oriented: organize code around objects with state and behavior
- Functional: compose pure functions, avoid shared state
- Event-driven: respond to events (clicks, HTTP requests, timers)

**Interpreted:** JavaScript is not compiled ahead-of-time to machine code like C or Go. The JavaScript engine reads and executes the source code directly (with JIT compilation happening transparently at runtime).

**Dynamically-typed:** Variables do not have fixed types. A variable can hold a number, then a string, then an object. Type errors are discovered at runtime, not at compile time.

**Single-threaded:** JavaScript runs on a single thread. It can only do one thing at a time. This seems limiting but is actually a feature — it eliminates entire classes of concurrency bugs (race conditions, deadlocks).

**Prototype-based:** Objects inherit from other objects directly (not from classes). Classes in JavaScript (added in ES6) are syntactic sugar over the underlying prototype system.

**First-class functions:** Functions are values. You can assign a function to a variable, pass it as an argument to another function, and return it from a function. This is the foundation of functional programming in JavaScript.

### Terminology

| Term | Definition |
|------|-----------|
| **Variable** | A named container for a value (`let x = 5`) |
| **Scope** | Where a variable is accessible (global, function, block) |
| **Closure** | A function that retains access to its surrounding scope after the outer function has returned |
| **Hoisting** | JavaScript's behavior of moving `var` declarations and function declarations to the top of their scope |
| **Prototype** | An object that other objects inherit properties from |
| **Callback** | A function passed as an argument to be called later |
| **Promise** | An object representing an eventual value (pending, fulfilled, or rejected) |
| **Async/Await** | Syntax sugar over Promises for writing asynchronous code that reads synchronously |
| **Event Loop** | The mechanism that allows JavaScript to perform non-blocking I/O despite being single-threaded |
| **Call Stack** | A stack data structure tracking which function is currently executing |
| **Heap** | The memory area where objects are allocated |
| **DOM** | Document Object Model — the tree-structured representation of an HTML document that JavaScript can read and modify |
| **Runtime** | The environment in which JavaScript executes (browser, Node.js, Deno) |
| **Engine** | The program that executes JavaScript (V8 in Chrome/Node.js, SpiderMonkey in Firefox) |
| **Transpilation** | Converting JavaScript code from one version to another (ES2022 → ES5 for old browsers) |

### Mental Models

**Mental Model 1: JavaScript is like a chef in a single kitchen**

A single chef can only do one thing at a time. But the chef is smart: when they put something in the oven (an async operation), they don't stand there watching it. They go do other prep work (execute other code). When the oven timer goes off (the async operation completes), they go back to finish that dish (execute the callback/resolve the Promise).

This is the event loop. JavaScript doesn't block on I/O — it starts the I/O operation, goes on to other work, and comes back when the I/O completes.

**Mental Model 2: The Scope Chain is like Russian dolls**

```
Global scope (outermost doll)
  └── Function scope (middle doll)
        └── Block scope (innermost doll)
```

Each inner scope can see everything in the outer scopes. Outer scopes cannot see inside inner scopes. When you reference a variable, JavaScript looks in the current scope first, then walks up the chain.

**Mental Model 3: Prototypes are like biological inheritance**

Every JavaScript object has a hidden link to another object (its prototype). If you ask an object for a property it doesn't have, JavaScript follows the prototype link and looks there. This chain continues until it reaches `null`.

```
myObject → Object.prototype → null
```

**Mental Model 4: The Call Stack is a stack of plates**

When a function is called, a "plate" (stack frame) is added on top. When the function returns, its plate is removed. JavaScript always executes the function on top of the stack. If you call `a()` which calls `b()` which calls `c()`:

```
[c] ← currently executing
[b]
[a]
[main]
```

### Internal Architecture

Understanding how JavaScript actually runs helps you write better code.

```
┌─────────────────────────────────────────────────────────┐
│                    JavaScript Engine (V8)                │
│                                                         │
│  ┌──────────────┐    ┌──────────────────────────────┐  │
│  │  Call Stack  │    │         Heap (Memory)         │  │
│  │              │    │                              │  │
│  │  [function]  │    │   Objects, Arrays, Closures  │  │
│  │  [function]  │    │   Strings, Functions         │  │
│  │  [main]      │    │                              │  │
│  └──────────────┘    └──────────────────────────────┘  │
│                                                         │
└─────────────────────────────────────────────────────────┘
          │
          │  (async ops: timers, I/O, network)
          ▼
┌─────────────────────────────────────────────────────────┐
│                    Event Loop                           │
│                                                         │
│  ┌──────────────────┐    ┌──────────────────────────┐  │
│  │  Callback Queue  │    │   Microtask Queue        │  │
│  │  (setTimeout,    │    │   (Promises, queueMicro- │  │
│  │   setInterval,   │    │    task)                 │  │
│  │   I/O callbacks) │    │                          │  │
│  └──────────────────┘    └──────────────────────────┘  │
│                                                         │
│  Loop: if call stack is empty, take next task and push  │
│        to call stack. Microtasks run before macrotasks. │
└─────────────────────────────────────────────────────────┘
```

**V8's compilation pipeline:**

1. **Parser**: Reads JavaScript source, produces Abstract Syntax Tree (AST)
2. **Ignition (Interpreter)**: Converts AST to bytecode, executes it immediately
3. **TurboFan (Optimizing Compiler)**: Identifies "hot" code (frequently run), compiles to optimized machine code
4. **Deoptimization**: If assumptions are violated (e.g., variable type changes), falls back to bytecode

This is called **JIT (Just-In-Time) compilation** — JavaScript gets faster the longer it runs, as hot paths are compiled to native machine code.

### Simple Diagrams

**Variable Scope:**
```
┌─────────────────────────────────────────┐
│  GLOBAL SCOPE                           │
│  let globalVar = "I'm everywhere"       │
│                                         │
│  ┌──────────────────────────────────┐   │
│  │  FUNCTION SCOPE (outer)          │   │
│  │  let outerVar = "I'm in outer"   │   │
│  │                                  │   │
│  │  ┌───────────────────────────┐   │   │
│  │  │  FUNCTION SCOPE (inner)   │   │   │
│  │  │  let innerVar = "local"   │   │   │
│  │  │  ✓ can see: innerVar      │   │   │
│  │  │  ✓ can see: outerVar      │   │   │
│  │  │  ✓ can see: globalVar     │   │   │
│  │  └───────────────────────────┘   │   │
│  │  ✗ cannot see: innerVar          │   │
│  └──────────────────────────────────┘   │
│  ✗ cannot see: outerVar, innerVar       │
└─────────────────────────────────────────┘
```

**The Prototype Chain:**
```
const obj = { name: "Alice" }

obj
 ├── name: "Alice"           ← own property
 └── [[Prototype]] ──────► Object.prototype
                              ├── toString()
                              ├── hasOwnProperty()
                              ├── valueOf()
                              └── [[Prototype]] ──► null
```

### Basic Workflows

**How a JavaScript file runs in Node.js:**
```
1. Node.js reads the .js file
2. V8 engine parses it → AST
3. Ignition converts AST → bytecode
4. Bytecode executes line by line
5. Async operations are offloaded to libuv (C++ library)
6. libuv notifies Node.js when async ops complete
7. Event loop picks up callbacks and pushes to call stack
8. Execution continues
```

**How a JavaScript file runs in the browser:**
```
1. Browser fetches .js file from server
2. JavaScript engine (V8/SpiderMonkey) parses it
3. Script executes (blocking HTML parsing if in <head> without defer/async)
4. DOM is queried/modified via Web APIs
5. User events are handled via event listeners
6. Network requests (fetch/XHR) are async — handled via callbacks/promises
```

### Engine vs. Runtime vs. Transpilation

These three terms get used interchangeably by beginners, but they're distinct layers, and mixing them up causes real confusion when debugging "why doesn't this API exist here?" errors.

```
Engine: the program that actually parses and executes JavaScript code.
  Examples: V8 (Chrome, Node.js, Edge), SpiderMonkey (Firefox), JavaScriptCore (Safari)
  An engine ONLY understands the JavaScript LANGUAGE itself — variables,
  functions, objects, the syntax defined by the ECMAScript spec. It knows
  nothing about "documents," "files," or "HTTP requests."

Runtime: the engine PLUS a set of host-provided APIs bolted on around it.
  Browser runtime = V8 + Web APIs (document, window, fetch, localStorage)
  Node.js runtime  = V8 + Node APIs (fs, http, process, Buffer)
  Deno runtime     = V8 + Deno APIs (Deno.readFile, fetch, web-standard APIs)

  This is WHY `document.querySelector(...)` works in a browser but throws
  "document is not defined" in Node.js: both runtimes use the same V8
  ENGINE underneath, but the DOM is a browser-RUNTIME API, not a language
  feature — Node.js simply never bolted a DOM implementation onto V8.
  Symmetrically, `require("fs")` works in Node.js but not in a browser,
  because filesystem access is a Node-runtime API with no browser equivalent.

Transpilation: converting source code written in one syntax/version into
  a different syntax/version, WITHOUT changing what it does.
  Example: TypeScript → JavaScript. Modern ES2022 JavaScript → ES5
  (for old browsers that don't support newer syntax).

  Concretely, a transpiler like Babel takes this ES2022 code:
    const greet = (name) => \`Hello, ${name}!\`;
  and rewrites it into equivalent, older-syntax ES5 code:
    var greet = function(name) { return "Hello, " + name + "!"; };
  Both do the exact same thing at runtime — transpilation is purely a
  SOURCE CODE transformation that happens BEFORE the engine ever sees the
  file, not something the engine or runtime does at execution time.
```

---

## Basic Examples

### Example 1: Variables and Data Types

```javascript
// JavaScript has 8 data types: 7 primitive + 1 object type

// Primitives (immutable, stored by value)
let name     = "Alice";           // string
let age      = 30;                // number (integers AND floats)
let price    = 9.99;              // number
let isAdmin  = true;              // boolean
let nothing  = null;              // null (intentional absence)
let missing  = undefined;         // undefined (not yet assigned)
let id       = Symbol("userId");  // symbol (unique identifier)
let bigNum   = 9007199254740991n; // bigint (arbitrary precision)

// Object types (mutable, stored by reference)
let person   = { name: "Alice", age: 30 };  // plain object
let numbers  = [1, 2, 3, 4, 5];            // array (is an object)
let greet    = function() { return "hi"; }; // function (is an object)

// typeof operator reveals the type
console.log(typeof name);     // "string"
console.log(typeof age);      // "number"
console.log(typeof isAdmin);  // "boolean"
console.log(typeof null);     // "object" ← famous JavaScript quirk/bug
console.log(typeof missing);  // "undefined"
console.log(typeof id);       // "symbol"
console.log(typeof person);   // "object"
console.log(typeof greet);    // "function"

// Type coercion (JavaScript's automatic type conversion)
console.log("5" + 3);    // "53" ← string concatenation, not addition
console.log("5" - 3);    // 2   ← arithmetic, string coerced to number
console.log(true + 1);   // 2   ← true coerced to 1
console.log(null + 1);   // 1   ← null coerced to 0
console.log(undefined + 1); // NaN ← undefined coerces to NaN

// Always use === (strict equality) not == (loose equality)
console.log(5 == "5");   // true  ← coerces types, dangerous!
console.log(5 === "5");  // false ← checks type AND value, safe
```

**Expected Output:**
```
string
number
boolean
object
undefined
symbol
object
function
53
2
2
1
NaN
true
false
```

### Example 2: var vs let vs const

```javascript
// var — function-scoped, hoisted, can be redeclared (AVOID in modern JS)
function exampleVar() {
  console.log(x); // undefined (not ReferenceError — var is hoisted!)
  var x = 10;
  console.log(x); // 10

  if (true) {
    var x = 20;  // same variable! var ignores block scope
    console.log(x); // 20
  }
  console.log(x); // 20 ← changed! this is the bug var causes
}
exampleVar();

// let — block-scoped, not hoisted (temporal dead zone), cannot be redeclared
function exampleLet() {
  // console.log(y); // ReferenceError: Cannot access 'y' before initialization
  let y = 10;
  console.log(y); // 10

  if (true) {
    let y = 20;  // different variable in this block
    console.log(y); // 20
  }
  console.log(y); // 10 ← original unchanged
}
exampleLet();

// const — block-scoped, must be initialized, cannot be reassigned
const PI = 3.14159;
// PI = 3; // TypeError: Assignment to constant variable

// IMPORTANT: const does NOT make objects/arrays immutable!
const person = { name: "Alice" };
person.name = "Bob"; // This works! The binding is const, not the object
console.log(person.name); // "Bob"

const arr = [1, 2, 3];
arr.push(4); // This works too!
console.log(arr); // [1, 2, 3, 4]

// Use Object.freeze() to prevent object mutation
const frozen = Object.freeze({ x: 1 });
frozen.x = 999; // silently fails in non-strict mode
console.log(frozen.x); // 1

// Rule of thumb: always use const; use let only when you need to reassign
```

### Example 3: Functions — All Four Syntaxes

```javascript
// 1. Function Declaration (hoisted — available before definition)
console.log(add(2, 3)); // 5 — works! declarations are hoisted

function add(a, b) {
  return a + b;
}

// 2. Function Expression (NOT hoisted)
// console.log(multiply(2, 3)); // ReferenceError
const multiply = function(a, b) {
  return a * b;
};
console.log(multiply(4, 5)); // 20

// 3. Arrow Function (ES6 — concise, lexical `this`)
const divide = (a, b) => a / b;          // implicit return for single expression
const square = x => x * x;              // single param — no parentheses needed
const greet  = () => "Hello, World!";  // no params
const sumAll = (...nums) => nums.reduce((acc, n) => acc + n, 0); // rest params

console.log(divide(10, 2));  // 5
console.log(square(7));      // 49
console.log(greet());        // "Hello, World!"
console.log(sumAll(1,2,3,4,5)); // 15

// 4. Method shorthand (inside objects)
const calculator = {
  value: 0,
  add(n) { this.value += n; return this; },  // method shorthand
  subtract(n) { this.value -= n; return this; },
  result() { return this.value; }
};

console.log(calculator.add(10).add(5).subtract(3).result()); // 12

// Default parameters (ES6)
function createUser(name, role = "viewer", active = true) {
  return { name, role, active };
}
console.log(createUser("Alice")); // { name: 'Alice', role: 'viewer', active: true }
console.log(createUser("Bob", "admin")); // { name: 'Bob', role: 'admin', active: true }
```

### Example 4: Arrays and Common Methods

```javascript
const fruits = ["apple", "banana", "cherry", "date", "elderberry"];

// ── Access ──────────────────────────────────────────────
console.log(fruits[0]);         // "apple"
console.log(fruits.at(-1));     // "elderberry" (last element)
console.log(fruits.length);     // 5

// ── Transformation (returns NEW array) ──────────────────
const upper = fruits.map(f => f.toUpperCase());
// ["APPLE", "BANANA", "CHERRY", "DATE", "ELDERBERRY"]

const longFruits = fruits.filter(f => f.length > 5);
// ["banana", "cherry", "elderberry"]

const totalLength = fruits.reduce((acc, f) => acc + f.length, 0);
// 5+6+6+4+10 = 31

// ── Search ──────────────────────────────────────────────
console.log(fruits.find(f => f.startsWith("c")));      // "cherry"
console.log(fruits.findIndex(f => f === "date"));      // 3
console.log(fruits.includes("banana"));                 // true
console.log(fruits.some(f => f.length > 9));           // true (elderberry)
console.log(fruits.every(f => f.length > 3));          // true

// ── Sorting ─────────────────────────────────────────────
const sorted = [...fruits].sort(); // shallow copy first, sort in place
// ["apple", "banana", "cherry", "date", "elderberry"]

const nums = [10, 1, 5, 3, 8];
nums.sort((a, b) => a - b); // ascending numeric sort
// [1, 3, 5, 8, 10]

// ── Flattening ──────────────────────────────────────────
const nested = [[1, 2], [3, 4], [5, [6, 7]]];
console.log(nested.flat());    // [1, 2, 3, 4, 5, [6, 7]]
console.log(nested.flat(2));   // [1, 2, 3, 4, 5, 6, 7]

// ── Spread and Destructuring ─────────────────────────────
const [first, second, ...rest] = fruits;
console.log(first);  // "apple"
console.log(second); // "banana"
console.log(rest);   // ["cherry", "date", "elderberry"]

const combined = [...fruits, "fig", "grape"];
// spreads fruits, adds two more
```

### Example 5: Objects and Destructuring

```javascript
const user = {
  id: 1,
  name: "Alice Johnson",
  email: "alice@example.com",
  age: 30,
  address: {
    city: "London",
    country: "UK"
  },
  roles: ["user", "editor"]
};

// Property access
console.log(user.name);           // "Alice Johnson"
console.log(user["email"]);       // "alice@example.com"
console.log(user.address.city);   // "London"

// Destructuring
const { name, email, age } = user;
const { address: { city } } = user; // nested destructuring
console.log(name, email, city); // "Alice Johnson alice@example.com London"

// Destructuring with rename and default
const { name: fullName, phone = "N/A" } = user;
console.log(fullName); // "Alice Johnson"
console.log(phone);    // "N/A"  ← default because user.phone is undefined

// Computed property names
const key = "status";
const config = {
  [key]: "active",        // computed: { status: "active" }
  [`${key}_at`]: new Date() // computed: { status_at: <date> }
};

// Spread operator with objects (shallow copy / merge)
const updatedUser = {
  ...user,
  age: 31,                    // overwrites the original age
  lastLogin: new Date()       // adds new property
};

// Object methods
console.log(Object.keys(user));   // ["id", "name", "email", "age", "address", "roles"]
console.log(Object.values(user)); // [1, "Alice Johnson", ...]
console.log(Object.entries(user)); // [["id", 1], ["name", "Alice Johnson"], ...]

// Optional chaining (?.) — safe navigation
const street = user?.address?.street; // undefined (not an error)
const zip    = user?.location?.zip;   // undefined (not an error)

// Nullish coalescing (??) — default only for null/undefined
const displayName = user.nickname ?? user.name; // "Alice Johnson"
```

### Example 6: The DOM (Document Object Model)

The DOM is the browser's live, in-memory tree representation of an HTML page. JavaScript's most fundamental browser job is reading and changing this tree — every dynamic thing a webpage does (validating a form, showing a dropdown, updating a counter) comes down to DOM manipulation.

```javascript
// The DOM tree mirrors your HTML structure:
// <html>
//   <body>
//     <div id="app">
//       <h1 class="title">Hello</h1>
//       <button id="btn">Click me</button>
//     </div>
//   </body>
// </html>

// ── Selecting elements ──────────────────────────────────
const app     = document.getElementById("app");        // by ID (fastest, oldest API)
const title   = document.querySelector(".title");      // by CSS selector, first match
const allDivs = document.querySelectorAll("div");      // by CSS selector, ALL matches (NodeList)

// ── Reading and changing content ────────────────────────
console.log(title.textContent);      // "Hello" — safe, treats content as plain text
title.textContent = "Hello, World!"; // updates the visible text

title.innerHTML = "Hello <em>World</em>"; // parses as HTML — renders italics
// WARNING: innerHTML with untrusted/user input is an XSS vulnerability —
// only use textContent for user-supplied data, never innerHTML

// ── Changing styles and classes ─────────────────────────
title.style.color = "blue";               // inline style, works but hard to maintain
title.classList.add("highlighted");       // preferred — toggle CSS classes instead
title.classList.remove("highlighted");
title.classList.toggle("active");         // adds if absent, removes if present

// ── Creating and inserting new elements ─────────────────
const newItem = document.createElement("li");
newItem.textContent = "New task";
newItem.classList.add("task-item");

const list = document.querySelector("#task-list");
list.appendChild(newItem);           // adds at the end
list.prepend(newItem);               // adds at the beginning
newItem.remove();                    // removes it from the DOM entirely

// ── Handling events ──────────────────────────────────────
const button = document.getElementById("btn");

button.addEventListener("click", (event) => {
  console.log("Button clicked!", event.target);
});

// Event delegation: attach ONE listener to a parent instead of many
// listeners to individual children — crucial when children are added
// dynamically (a listener on a child added later would never fire
// unless attached this way)
list.addEventListener("click", (event) => {
  if (event.target.matches(".task-item")) {
    console.log("A task item was clicked:", event.target.textContent);
  }
});

// ── Reading form input ────────────────────────────────────
const form = document.querySelector("#login-form");
form.addEventListener("submit", (event) => {
  event.preventDefault(); // stop the browser's default full-page-reload submit
  const emailInput = document.querySelector("#email");
  console.log("Submitted email:", emailInput.value);
});
```

**Why this matters even though it's "just the browser":** the DOM is the one API in this whole chapter that ONLY exists in the browser — Node.js has no DOM at all. If you `document.querySelector(...)` inside a Node.js script, you get a `ReferenceError: document is not defined`, because `document` is a browser-provided global, not part of the JavaScript language itself.

### Example 7: Callbacks

A callback is simply a function you pass as an argument to another function, to be called later — often after some operation finishes. This is the foundation every async pattern in JavaScript (events, `setTimeout`, Promises) is built on top of.

```javascript
// The simplest possible callback: a function passed to another function
function greet(name, callback) {
  const message = `Hello, ${name}!`;
  callback(message); // "calling back" into the code that passed this function in
}

greet("Alice", function(msg) {
  console.log(msg); // "Hello, Alice!"
});

// Callbacks are everywhere in built-in array methods:
[1, 2, 3].forEach(function(num) {
  console.log(num * 2); // 2, 4, 6 — this function is a callback
});

// Asynchronous callback — the classic pattern before Promises existed
console.log("1: start");
setTimeout(function() {
  console.log("3: this runs after 1 second — the callback fired");
}, 1000);
console.log("2: this runs immediately, without waiting");
// Output order: 1, 2, 3 — setTimeout doesn't block; it registers the
// callback to run later and execution continues immediately

// "Callback hell" — the historical problem that led to Promises/async-await
getUser(userId, function(user) {
  getOrders(user.id, function(orders) {
    getOrderDetails(orders[0].id, function(details) {
      // Three levels of nesting just to do three sequential steps.
      // Real code often nested 5-6 levels deep, becoming unreadable
      // and hard to add error handling to at each level.
      console.log(details);
    });
  });
});
// This exact problem is what Promises (and later async/await, shown in the
// Advanced Concepts section) were designed to solve — see "Promises and
// Async/Await — Deep Dive" for the direct comparison.
```

---

## Intermediate Concepts

### Project Structure

For a Node.js project using pure JavaScript:

```
project/
├── src/
│   ├── index.js              ← entry point
│   ├── config/
│   │   └── index.js          ← environment configuration
│   ├── utils/
│   │   ├── logger.js
│   │   ├── validator.js
│   │   └── helpers.js
│   ├── models/               ← data structures / classes
│   ├── services/             ← business logic
│   └── errors/               ← custom error classes
├── tests/
│   ├── unit/
│   └── integration/
├── .eslintrc.js
├── .prettierrc
├── .gitignore
├── package.json
└── README.md
```

### Best Practices

**1. Prefer `const` over `let` over `var`**
Use `const` by default. Switch to `let` only when you know you'll reassign. Never use `var` in modern code.

**2. Use strict equality (`===`)**
Never use `==`. Its type coercion rules are complex and produce surprising results. Always use `===` and `!==`.

**3. Handle edge cases explicitly**
```javascript
// Bad — relies on truthiness coercion
if (name) { ... }

// Good — explicit check
if (name !== null && name !== undefined && name !== "") { ... }
// Or more idiomatically:
if (name != null && name.length > 0) { ... }
```

**4. Avoid mutating function arguments**
```javascript
// Bad — mutates the original object
function addTimestamp(user) {
  user.createdAt = new Date(); // mutates!
  return user;
}

// Good — returns a new object
function addTimestamp(user) {
  return { ...user, createdAt: new Date() };
}
```

**5. Destructure early**
Extract what you need at the top of a function rather than repeatedly accessing nested properties:
```javascript
function processOrder({ id, customer: { name, email }, items, total }) {
  // work with name, email, items, total directly
}
```

### Folder Organization

```
src/
├── config/          — environment variables, constants
├── utils/           — pure functions, helpers
├── models/          — data shapes, classes, schema definitions
├── services/        — business logic (stateless functions that operate on models)
├── repositories/    — data access (database queries)
├── controllers/     — HTTP request handlers (thin layer — delegate to services)
├── middleware/      — request/response interceptors
├── errors/          — custom error classes
└── types/           — JSDoc type definitions or TypeScript interfaces
```

### Naming Conventions

| Item | Convention | Example |
|------|------------|---------|
| Variables | camelCase | `userName`, `totalPrice` |
| Constants | SCREAMING_SNAKE_CASE | `MAX_RETRIES`, `API_BASE_URL` |
| Functions | camelCase (verb) | `getUser()`, `calculateTotal()` |
| Classes | PascalCase | `UserService`, `OrderRepository` |
| Files | kebab-case | `user-service.js`, `order-model.js` |
| Private-by-convention | underscore prefix | `_internalHelper()` |
| Boolean variables | `is`, `has`, `can` prefix | `isAdmin`, `hasPermission` |

### Clean Architecture — Separation of Concerns

```javascript
// ── models/user.js ─────────────────────────────────────────
// Pure data structure — no business logic, no DB code
class User {
  constructor({ id, name, email, createdAt = new Date() }) {
    this.id        = id;
    this.name      = name;
    this.email     = email;
    this.createdAt = createdAt;
  }

  toPublicJSON() {
    const { id, name, email } = this;
    return { id, name, email }; // omits sensitive fields
  }
}

// ── repositories/user-repository.js ────────────────────────
// All database access goes here — services never query DB directly
class UserRepository {
  constructor(db) {
    this.db = db;
  }

  async findById(id) {
    const row = await this.db.query("SELECT * FROM users WHERE id = $1", [id]);
    return row ? new User(row) : null;
  }

  async create(userData) {
    const row = await this.db.query(
      "INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *",
      [userData.name, userData.email]
    );
    return new User(row);
  }
}

// ── services/user-service.js ────────────────────────────────
// Business logic — orchestrates between repository and other services
class UserService {
  constructor(userRepository, emailService) {
    this.userRepository = userRepository;
    this.emailService   = emailService;
  }

  async createUser(userData) {
    // Business rule: email must be unique
    const existing = await this.userRepository.findByEmail(userData.email);
    if (existing) throw new ConflictError("Email already registered");

    const user = await this.userRepository.create(userData);
    await this.emailService.sendWelcomeEmail(user.email);
    return user;
  }
}
```

### Design Patterns in JavaScript

**1. Module Pattern (encapsulation)**
```javascript
const userModule = (function() {
  // Private state
  const _cache = new Map();

  // Private function
  function _validateId(id) {
    if (typeof id !== "number" || id <= 0) throw new Error("Invalid id");
  }

  // Public API
  return {
    getUser(id) {
      _validateId(id);
      return _cache.get(id);
    },
    setUser(id, user) {
      _validateId(id);
      _cache.set(id, user);
    },
    clear() {
      _cache.clear();
    }
  };
})();

userModule.setUser(1, { name: "Alice" });
console.log(userModule.getUser(1)); // { name: "Alice" }
```

**2. Observer Pattern (events)**
```javascript
class EventEmitter {
  constructor() {
    this._listeners = new Map();
  }

  on(event, listener) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, []);
    }
    this._listeners.get(event).push(listener);
    return this; // enable chaining
  }

  off(event, listener) {
    const list = this._listeners.get(event) || [];
    this._listeners.set(event, list.filter(l => l !== listener));
  }

  emit(event, ...args) {
    const listeners = this._listeners.get(event) || [];
    listeners.forEach(listener => listener(...args));
  }
}

const emitter = new EventEmitter();
emitter.on("data", (payload) => console.log("Received:", payload));
emitter.emit("data", { userId: 1, action: "login" }); // Received: { userId: 1, action: 'login' }
```

**3. Factory Pattern**
```javascript
function createLogger(prefix) {
  return {
    info:  (msg) => console.log(`[${prefix}] INFO:  ${msg}`),
    warn:  (msg) => console.warn(`[${prefix}] WARN:  ${msg}`),
    error: (msg) => console.error(`[${prefix}] ERROR: ${msg}`)
  };
}

const authLogger  = createLogger("AUTH");
const orderLogger = createLogger("ORDER");

authLogger.info("User logged in");    // [AUTH] INFO:  User logged in
orderLogger.warn("Low stock");        // [ORDER] WARN:  Low stock
```

### Common Mistakes

**Mistake 1: Mutating arrays instead of creating new ones**
```javascript
// Bad
const nums = [3, 1, 2];
nums.sort(); // mutates in place!

// Good
const sorted = [...nums].sort();
```

**Mistake 2: Forgetting async/await**
```javascript
// Bad — userPromise is a Promise, not a user
function getUser(id) {
  const user = fetchUser(id); // forgot await
  return user.name;           // TypeError: cannot read property 'name' of Promise
}

// Good
async function getUser(id) {
  const user = await fetchUser(id);
  return user.name;
}
```

**Mistake 3: `this` in callbacks**
```javascript
class Timer {
  constructor() { this.seconds = 0; }

  start() {
    // Bad — 'this' inside setInterval is the global object, not the Timer
    setInterval(function() {
      this.seconds++; // this is undefined in strict mode!
    }, 1000);

    // Good — arrow function captures 'this' from enclosing scope
    setInterval(() => {
      this.seconds++;
    }, 1000);
  }
}
```

**Mistake 4: == instead of ===**
```javascript
// These all return true with ==:
null == undefined    // true
0 == false           // true
"" == false          // true
"1" == 1             // true

// Always use === to avoid surprises
null === undefined   // false
0 === false          // false
```

### Error Handling

```javascript
// Custom error hierarchy
class AppError extends Error {
  constructor(message, statusCode = 500, code = "INTERNAL_ERROR") {
    super(message);
    this.name       = this.constructor.name;
    this.statusCode = statusCode;
    this.code       = code;
    Error.captureStackTrace(this, this.constructor);
  }
}

class NotFoundError extends AppError {
  constructor(resource, id) {
    super(`${resource} with id ${id} not found`, 404, "NOT_FOUND");
  }
}

class ValidationError extends AppError {
  constructor(field, message) {
    super(`Validation failed for ${field}: ${message}`, 400, "VALIDATION_ERROR");
    this.field = field;
  }
}

// Usage
async function getUserHandler(req, res) {
  try {
    const { id } = req.params;

    if (!Number.isInteger(Number(id))) {
      throw new ValidationError("id", "must be a positive integer");
    }

    const user = await userService.findById(Number(id));
    if (!user) throw new NotFoundError("User", id);

    res.json(user.toPublicJSON());
  } catch (err) {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({ error: err.message, code: err.code });
    } else {
      // Unknown error — log it but don't expose internals
      console.error("Unexpected error:", err);
      res.status(500).json({ error: "An unexpected error occurred" });
    }
  }
}
```

### Logging

```javascript
// Production-grade logger using a structured approach
class Logger {
  constructor(service) {
    this.service = service;
  }

  _log(level, message, meta = {}) {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      service: this.service,
      message,
      ...meta
    };
    // In production: send to Datadog, CloudWatch, Elasticsearch
    // In development: pretty-print to console
    const output = JSON.stringify(entry);
    if (level === "error") console.error(output);
    else if (level === "warn") console.warn(output);
    else console.log(output);
  }

  info(message, meta)  { this._log("info",  message, meta); }
  warn(message, meta)  { this._log("warn",  message, meta); }
  error(message, meta) { this._log("error", message, meta); }
  debug(message, meta) {
    if (process.env.NODE_ENV === "development") {
      this._log("debug", message, meta);
    }
  }
}

const logger = new Logger("user-service");
logger.info("User created", { userId: 123, email: "alice@example.com" });
// {"timestamp":"2024-01-15T10:30:00.000Z","level":"info","service":"user-service","message":"User created","userId":123,"email":"alice@example.com"}
```

### Testing (with Jest)

```javascript
// users.test.js
const { UserService } = require("../src/services/user-service");

describe("UserService", () => {
  let userService;
  let mockUserRepository;
  let mockEmailService;

  beforeEach(() => {
    // Create mocks
    mockUserRepository = {
      findByEmail: jest.fn(),
      create: jest.fn()
    };
    mockEmailService = {
      sendWelcomeEmail: jest.fn().mockResolvedValue(true)
    };

    userService = new UserService(mockUserRepository, mockEmailService);
  });

  describe("createUser", () => {
    it("creates a user when email is unique", async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue({ id: 1, name: "Alice", email: "alice@example.com" });

      const user = await userService.createUser({ name: "Alice", email: "alice@example.com" });

      expect(user.id).toBe(1);
      expect(mockEmailService.sendWelcomeEmail).toHaveBeenCalledWith("alice@example.com");
    });

    it("throws ConflictError when email already exists", async () => {
      mockUserRepository.findByEmail.mockResolvedValue({ id: 99 });

      await expect(
        userService.createUser({ name: "Bob", email: "existing@example.com" })
      ).rejects.toThrow("Email already registered");
    });
  });
});
```

---

## Advanced Concepts

### Hoisting and the Temporal Dead Zone — Deep Dive

Hoisting is one of the most misunderstood mechanics in JavaScript because most explanations describe *what* happens ("declarations move to the top") without explaining *why*. Here's the real mechanism.

**Why hoisting happens: the two-phase execution model**

Every time JavaScript enters a new scope (a function body, or the global scope), the engine processes it in two passes, not one:

```
Phase 1 — Creation (before any code runs):
  The engine scans the entire scope for declarations FIRST.
  - var declarations: memory is allocated, variable is initialized to `undefined`
  - function declarations: the ENTIRE function is stored in memory, ready to call
  - let/const declarations: memory is allocated, but NOT initialized —
    the variable exists but is in the "Temporal Dead Zone" (TDZ)

Phase 2 — Execution (code runs top to bottom):
  Now the engine executes your code line by line, in order,
  assigning real values as it reaches each line.
```

"Hoisting" is just a mental shorthand for phase 1 — it's not that your code is physically rearranged, it's that declarations are registered in memory *before* execution begins, while assignments still happen in the order you wrote them.

**Example 1: Why `var` gives you `undefined`, not an error**

```javascript
console.log(name); // undefined — NOT a ReferenceError
var name = "Alice";
console.log(name); // "Alice"

// What the engine actually does, conceptually:
// Phase 1: var name = undefined;   ← declaration hoisted, initialized to undefined
// Phase 2: console.log(name);      → prints undefined (declared, not yet assigned)
//          name = "Alice";         → NOW it gets the real value
//          console.log(name);      → prints "Alice"
```

**Example 2: Why `let`/`const` throw instead of returning `undefined`**

```javascript
console.log(age); // ReferenceError: Cannot access 'age' before initialization
let age = 30;

// `age` IS hoisted — the engine already knows it exists in this scope.
// But unlike `var`, it is NOT initialized to `undefined`. It sits in the
// "Temporal Dead Zone" — accessible in name, but touching it before its
// declaration line throws. This is a deliberate safety feature: it turns
// what would silently be `undefined` (a common source of bugs) into a
// loud, immediate error.
```

**Example 3: Function declarations are fully hoisted — including their body**

```javascript
sayHi(); // "Hi!" — works, even though the call appears before the definition

function sayHi() {
  console.log("Hi!");
}

// This works because function DECLARATIONS hoist their entire body in
// Phase 1 — not just the name, like var does. The whole function is
// ready to call before execution even starts.
```

**Example 4: Function expressions do NOT get this treatment**

```javascript
sayBye(); // TypeError: sayBye is not a function

var sayBye = function() {
  console.log("Bye!");
};

// Here, `sayBye` the VARIABLE is hoisted (as var, so it starts as undefined).
// But the FUNCTION VALUE is only assigned when execution reaches that line.
// At the point of the call, sayBye is still undefined — calling undefined()
// throws. This is the single most common hoisting-related bug: confusing
// "the function is hoisted" with "the variable holding the function is hoisted."
```

**Example 5: The classic `var` loop bug hoisting explains**

```javascript
// Bad — this famous bug is a direct consequence of var's function-scoped hoisting
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 100);
}
// Prints: 3, 3, 3   ← NOT 0, 1, 2 as most people expect

// Why: there is only ONE `i` (hoisted once, function-scoped), shared by all
// three callbacks. By the time the callbacks run, the loop has already
// finished and `i` is 3.

// Fix — let creates a NEW binding of i for each loop iteration:
for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 100);
}
// Prints: 0, 1, 2 — because `let` is block-scoped, each iteration gets
// its own `i`, and each closure captures its own copy.
```

**The practical rule this all leads to:** always use `const`/`let`, never `var`. The entire reason `let`/`const` and the Temporal Dead Zone exist is to eliminate the silent, confusing behavior of `var` hoisting — by making "used before declared" a hard error instead of a quiet `undefined`.

### Closures — Deep Dive

A closure is formed when a function is created inside another function and retains access to the outer function's variables, even after the outer function has returned.

```javascript
// Classic closure: function factory
function makeCounter(start = 0, step = 1) {
  let count = start; // this variable is "closed over"

  return {
    increment() { count += step; return count; },
    decrement() { count -= step; return count; },
    reset()     { count = start; return count; },
    value()     { return count; }
  };
}

const counter = makeCounter(10, 2);
console.log(counter.increment()); // 12
console.log(counter.increment()); // 14
console.log(counter.decrement()); // 12
console.log(counter.reset());     // 10

// Each call to makeCounter creates an independent closure
const counterB = makeCounter(0, 5);
console.log(counterB.increment()); // 5 — independent of counterA
console.log(counter.value());      // 10 — unchanged
```

**Real-world closure: memoization**
```javascript
function memoize(fn) {
  const cache = new Map(); // closed over by the wrapper

  return function(...args) {
    const key = JSON.stringify(args);

    if (cache.has(key)) {
      console.log(`Cache hit for args: ${key}`);
      return cache.get(key);
    }

    const result = fn.apply(this, args);
    cache.set(key, result);
    return result;
  };
}

function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

const memoFib = memoize(fibonacci);
console.log(memoFib(40)); // calculates
console.log(memoFib(40)); // "Cache hit" — returns instantly
```

### Prototype Chain and Inheritance

```javascript
// How JavaScript class syntax maps to prototypes
class Animal {
  constructor(name, sound) {
    this.name  = name;
    this.sound = sound;
  }

  speak() {
    return `${this.name} says ${this.sound}!`;
  }

  toString() {
    return `Animal(${this.name})`;
  }
}

class Dog extends Animal {
  constructor(name, breed) {
    super(name, "Woof"); // calls Animal constructor
    this.breed = breed;
  }

  fetch(item) {
    return `${this.name} fetches the ${item}!`;
  }
}

const rex = new Dog("Rex", "Labrador");
console.log(rex.speak());      // "Rex says Woof!" (inherited from Animal)
console.log(rex.fetch("ball")); // "Rex fetches the ball!" (own method)
console.log(rex instanceof Dog);    // true
console.log(rex instanceof Animal); // true

// Under the hood — what class syntax actually creates:
// Dog.prototype.__proto__ === Animal.prototype
// rex.__proto__ === Dog.prototype
// rex.__proto__.__proto__ === Animal.prototype
// rex.__proto__.__proto__.__proto__ === Object.prototype
// rex.__proto__.__proto__.__proto__.__proto__ === null
```

### The Event Loop — Exactly How It Works

```javascript
// Execution order demonstration
console.log("1: Script starts");

setTimeout(() => console.log("5: setTimeout (macrotask)"), 0);

Promise.resolve()
  .then(() => console.log("3: Promise.then (microtask)"))
  .then(() => console.log("4: Second Promise.then (microtask)"));

console.log("2: Script ends (synchronous)");

// Output (always in this order):
// 1: Script starts
// 2: Script ends (synchronous)
// 3: Promise.then (microtask)       ← microtasks run before macrotasks
// 4: Second Promise.then (microtask)
// 5: setTimeout (macrotask)

// The rules:
// 1. Run all synchronous code first (call stack)
// 2. Run all microtasks (Promises, queueMicrotask) — the entire queue
// 3. Run ONE macrotask (setTimeout, setInterval, I/O callback)
// 4. Run all microtasks again
// 5. Repeat
```

### Promises and Async/Await — Deep Dive

**What a Promise actually is: a state machine, not a value**

A Promise is an object wrapping a value that doesn't exist yet. It's not the value itself — it's a container that will eventually hold either a success value or a failure reason. It has exactly three states, and once it leaves "pending," it can never change again:

```javascript
// The three states — and the ONE-WAY transitions between them
//
//        ┌─────────┐
//        │ pending │  ← initial state, neither resolved nor rejected
//        └────┬────┘
//        resolve()  reject()
//             │         │
//        ┌────▼───┐ ┌───▼──────┐
//        │fulfilled│ │ rejected │  ← final states — "settled"
//        └────────┘ └──────────┘
//
// Once fulfilled or rejected, a Promise is permanently "settled" —
// calling resolve() or reject() again does nothing. This immutability
// is what makes Promises reliable: a settled Promise's outcome can
// never be changed out from under code that's already reacting to it.

const promise = new Promise((resolve, reject) => {
  const success = Math.random() > 0.5;
  setTimeout(() => {
    if (success) resolve("Data loaded");
    else reject(new Error("Failed to load"));
  }, 1000);
});
// Right here, `promise` is in the "pending" state — the executor function
// runs immediately, but resolve/reject only fire after the timeout.
```

**Example 1: `.then()` registers a callback for a future state change**

```javascript
promise
  .then(result => console.log("Success:", result))   // runs if resolve() was called
  .catch(error => console.log("Failure:", error.message)); // runs if reject() was called

// Critically: this code does NOT block. The console.log lines below
// `promise.then(...)` in your file will run BEFORE either callback fires,
// because .then()/.catch() only schedule work for later — they don't wait.
console.log("This runs immediately, before the promise settles");
```

**Example 2: async/await is syntax sugar — it doesn't change how Promises work**

```javascript
// These two functions are functionally IDENTICAL — async/await just reads
// top-to-bottom instead of nesting callbacks.

// Promise chain version:
function loadUserPromiseStyle(id) {
  return fetchUser(id)
    .then(user => fetchOrders(user.id))
    .then(orders => ({ orderCount: orders.length }))
    .catch(err => {
      console.error("Failed:", err);
      throw err;
    });
}

// async/await version — same behavior, reads like synchronous code:
async function loadUserAsyncStyle(id) {
  try {
    const user = await fetchUser(id);       // pauses HERE until fetchUser's promise settles
    const orders = await fetchOrders(user.id); // pauses HERE until fetchOrders' promise settles
    return { orderCount: orders.length };
  } catch (err) {
    console.error("Failed:", err);
    throw err;
  }
}

// Key fact: an `async function` ALWAYS returns a Promise, even if you
// `return` a plain value inside it. `return 5` inside an async function
// is automatically wrapped as `Promise.resolve(5)` for the caller.
```

**Example 3: What "pauses" actually means — it's not blocking the thread**

```javascript
console.log("1: start");

async function demo() {
  console.log("2: inside async function, before await");
  await new Promise(resolve => setTimeout(resolve, 0));
  console.log("4: after await — this resumed as a microtask");
}

demo();
console.log("3: after calling demo(), main script continues");

// Output order: 1, 2, 3, 4
//
// "await" does NOT freeze the entire program. It pauses only the async
// FUNCTION at that line, and immediately hands control back to whatever
// called it — which is why "3" logs before "4". Under the hood, the code
// after `await` is scheduled as a microtask, exactly like a `.then()`
// callback — this is why the Event Loop section's microtask rules apply
// directly to async/await too.
```

**Example 4: Common pitfall — accidentally running awaits sequentially**

```javascript
// Bad — each await blocks the next, even though these calls are independent
async function loadDashboardSlow(userId) {
  const user = await fetchUser(userId);         // waits ~200ms
  const orders = await fetchOrders(userId);     // THEN waits another ~200ms
  const notifications = await fetchNotifications(userId); // THEN another ~200ms
  return { user, orders, notifications };
  // Total time: ~600ms, even though none of these calls depend on each other
}

// Good — start all three at once, await them together
async function loadDashboardFast(userId) {
  const [user, orders, notifications] = await Promise.all([
    fetchUser(userId),
    fetchOrders(userId),
    fetchNotifications(userId)
  ]);
  return { user, orders, notifications };
  // Total time: ~200ms — all three run concurrently, limited only by the slowest one
}
```

**Example 5: Common pitfall — forgetting that `.forEach` doesn't await**

```javascript
// Bad — forEach doesn't know its callback is async, and doesn't wait for it
async function processAllBad(items) {
  items.forEach(async (item) => {
    await saveItem(item); // this Promise is created and IGNORED
  });
  console.log("Done!"); // logs immediately — before any item is actually saved
}

// Good — use a for...of loop (sequential) or Promise.all (parallel)
async function processAllSequential(items) {
  for (const item of items) {
    await saveItem(item); // each save genuinely completes before the next starts
  }
  console.log("Done!"); // logs only after ALL items are saved
}

async function processAllParallel(items) {
  await Promise.all(items.map(item => saveItem(item)));
  console.log("Done!");
}
```

The mental model to walk away with: `await` is just a readable way to write `.then()`. Every rule that applies to Promises — settling once, microtask timing, the need to explicitly opt into parallelism with `Promise.all` — applies identically to `async`/`await`, because that's all it is under the hood.

### Generators and Iterators

```javascript
// Generators: functions that can be paused and resumed
function* range(start, end, step = 1) {
  for (let i = start; i < end; i += step) {
    yield i; // pause execution and yield a value
  }
}

const r = range(0, 10, 2);
console.log(r.next()); // { value: 0, done: false }
console.log(r.next()); // { value: 2, done: false }
console.log(r.next()); // { value: 4, done: false }

// Works with for...of
for (const n of range(0, 5)) {
  console.log(n); // 0, 1, 2, 3, 4
}

// Infinite generator (lazy evaluation)
function* naturals() {
  let n = 1;
  while (true) {
    yield n++;
  }
}

// Take only what you need
function take(n, iterable) {
  const result = [];
  for (const item of iterable) {
    result.push(item);
    if (result.length === n) break;
  }
  return result;
}

console.log(take(5, naturals())); // [1, 2, 3, 4, 5]
```

### WeakMap and WeakRef (Memory Management)

```javascript
// WeakMap — keys are weakly referenced (won't prevent garbage collection)
// Used for: private data, caching without memory leaks

const _privateData = new WeakMap();

class BankAccount {
  constructor(balance) {
    // Store private balance in WeakMap (not on the object)
    _privateData.set(this, { balance, transactions: [] });
  }

  deposit(amount) {
    const data = _privateData.get(this);
    data.balance += amount;
    data.transactions.push({ type: "deposit", amount, date: new Date() });
  }

  get balance() {
    return _privateData.get(this).balance;
  }
}

const account = new BankAccount(1000);
account.deposit(500);
console.log(account.balance); // 1500
// account.balance is readable but the data can't be directly accessed
// When account is garbage collected, WeakMap entry is automatically removed
```

### Proxies and Reflection

```javascript
// Proxy — intercept and customize fundamental object operations
function createReactive(target, onChange) {
  return new Proxy(target, {
    set(obj, prop, value) {
      const oldValue = obj[prop];
      obj[prop] = value;
      if (oldValue !== value) {
        onChange({ prop, oldValue, newValue: value });
      }
      return true; // must return true to indicate success
    },
    get(obj, prop) {
      // Track property access
      const value = obj[prop];
      return typeof value === "object" && value !== null
        ? createReactive(value, onChange) // nested objects are also reactive
        : value;
    },
    deleteProperty(obj, prop) {
      const oldValue = obj[prop];
      delete obj[prop];
      onChange({ prop, oldValue, newValue: undefined, type: "delete" });
      return true;
    }
  });
}

const state = createReactive({ name: "Alice", age: 30 }, (change) => {
  console.log(`State changed:`, change);
});

state.name = "Bob";
// State changed: { prop: 'name', oldValue: 'Alice', newValue: 'Bob' }
state.age = 31;
// State changed: { prop: 'age', oldValue: 30, newValue: 31 }
```

### Symbols and Well-Known Symbols

```javascript
// Symbol — unique, non-enumerable primitive value
const ID         = Symbol("id");
const SERIALIZE  = Symbol("serialize");

class User {
  constructor(id, name) {
    this[ID]   = id;    // truly "private" — not enumerable
    this.name  = name;
  }

  [SERIALIZE]() {
    return { name: this.name }; // excludes private ID
  }

  // Well-known Symbol: customize iteration
  [Symbol.iterator]() {
    const entries = Object.entries(this).filter(([k]) => !k.startsWith("_"));
    let index = 0;
    return {
      next() {
        if (index < entries.length) {
          return { value: entries[index++], done: false };
        }
        return { value: undefined, done: true };
      }
    };
  }
}

const user = new User(42, "Alice");
console.log(user[SERIALIZE]()); // { name: 'Alice' }
console.log(Object.keys(user));  // ["name"] ← Symbol keys are not enumerable
```

### Performance Optimization

```javascript
// 1. Avoid creating objects in hot loops (GC pressure)
// Bad
function processItems(items) {
  return items.map(item => ({ ...item, processed: true })); // creates N new objects
}

// Better for very hot paths — mutate in place if safe
function processItemsMutate(items) {
  for (let i = 0; i < items.length; i++) {
    items[i].processed = true;
  }
  return items;
}

// 2. Prefer typed arrays for numeric data
const floatArray = new Float64Array(1_000_000); // 8MB, no GC overhead
for (let i = 0; i < floatArray.length; i++) {
  floatArray[i] = Math.random();
}

// 3. Debounce and throttle for event handlers
function debounce(fn, delay) {
  let timeoutId;
  return function(...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), delay);
  };
}

function throttle(fn, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      fn.apply(this, args);
      inThrottle = true;
      setTimeout(() => { inThrottle = false; }, limit);
    }
  };
}

// Usage
const debouncedSearch = debounce(search, 300);
const throttledScroll = throttle(handleScroll, 100);
```

### Concurrency Patterns

```javascript
// Pattern 1: Promise.all — parallel execution, fail fast
async function fetchUserDashboard(userId) {
  const [user, orders, notifications] = await Promise.all([
    fetchUser(userId),
    fetchOrders(userId),
    fetchNotifications(userId)
  ]);
  // All three run in parallel — total time = slowest of the three
  return { user, orders, notifications };
}

// Pattern 2: Promise.allSettled — parallel, don't fail on errors
async function fetchOptionalData(ids) {
  const results = await Promise.allSettled(ids.map(id => fetchItem(id)));
  return results.map(result =>
    result.status === "fulfilled" ? result.value : null
  );
}

// Pattern 3: Promise.race — first to complete wins (e.g., timeout)
function withTimeout(promise, ms) {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`Timed out after ${ms}ms`)), ms)
  );
  return Promise.race([promise, timeout]);
}

// Pattern 4: Sequential with async/await
async function processInSequence(items) {
  const results = [];
  for (const item of items) {
    const result = await processItem(item); // waits for each
    results.push(result);
  }
  return results;
}

// Pattern 5: Controlled concurrency (limit parallelism)
async function processWithConcurrency(items, concurrency = 5) {
  const results = [];
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map(processItem));
    results.push(...batchResults);
  }
  return results;
}
```

### Event-Driven Architecture

```javascript
// Production-grade EventBus for decoupled communication
class EventBus {
  constructor() {
    this._subscribers = new Map();
    this._onceCallbacks = new Set();
  }

  subscribe(event, callback) {
    if (!this._subscribers.has(event)) {
      this._subscribers.set(event, new Set());
    }
    this._subscribers.get(event).add(callback);

    // Return unsubscribe function
    return () => {
      this._subscribers.get(event)?.delete(callback);
    };
  }

  subscribeOnce(event, callback) {
    const wrapper = (...args) => {
      callback(...args);
      unsubscribe();
    };
    const unsubscribe = this.subscribe(event, wrapper);
    return unsubscribe;
  }

  publish(event, data) {
    const subscribers = this._subscribers.get(event);
    if (subscribers) {
      subscribers.forEach(cb => {
        try { cb(data); }
        catch (err) { console.error(`Error in subscriber for "${event}":`, err); }
      });
    }
  }
}

// Usage in a real application
const bus = new EventBus();

// Order service publishes events
const unsubscribe = bus.subscribe("order:created", (order) => {
  emailService.sendOrderConfirmation(order);
});

bus.subscribe("order:created", (order) => {
  inventoryService.reserveItems(order.items);
});

// Later: create an order
bus.publish("order:created", {
  id: 1001,
  customerId: 42,
  items: [{ productId: 1, qty: 2 }],
  total: 59.99
});

// Clean up when done
unsubscribe();
```

---

## Industry Usage

### Startup Usage
Startups overwhelmingly choose JavaScript/Node.js because:
- Single language for full stack (reduces team fragmentation)
- Fast iteration: npm ecosystem has a package for nearly everything
- Serverless-friendly: AWS Lambda, Vercel Functions, Cloudflare Workers all support Node.js natively
- Low cost: Node.js's async I/O handles many concurrent connections on cheap hardware

**Examples:** Stripe (Node.js APIs), Vercel (Next.js/Node.js), Notion (Electron + Node.js), Linear

### Enterprise Usage
Enterprises use JavaScript in:
- **Frontend**: React/Angular/Vue SPAs replacing legacy desktop apps
- **BFF (Backend for Frontend)**: Node.js layer between frontend and microservices
- **Internal tools**: Electron apps, dashboards
- **API gateways**: Express/Fastify handling request routing and transformation

**Examples:** Microsoft (Azure Functions in Node.js, VS Code built in Electron), PayPal (full Node.js backend), LinkedIn (Node.js backend)

### FinTech Usage
- **Real-time data**: Node.js WebSocket servers for live market data (stock prices, crypto)
- **Transaction processing**: High-throughput event handlers
- **Compliance tools**: Internal dashboards built with React
- **Mobile banking**: React Native

**Examples:** Stripe (Node.js), Robinhood (web frontend), Coinbase (React Native mobile)

### Healthcare
- Patient portals built with React
- FHIR API clients in Node.js
- Medical device dashboards
- Telemedicine platforms (WebRTC for video calls, built on JavaScript)

### E-commerce
- **Shopify** (Polaris React component library, Liquid templates)
- Product pages: Next.js (SSR for SEO, React for interactivity)
- Cart and checkout: client-side JavaScript for instant UX
- Recommendation engines: client-side personalization
- **Example**: Shopify's storefront API is consumed by thousands of React frontends

### Logistics
- Real-time tracking dashboards (WebSockets + React)
- Route optimization frontends
- Driver apps (React Native)
- Warehouse management interfaces

### ERP
- SAP Fiori uses SAPUI5 (JavaScript framework)
- Microsoft Dynamics 365 web client: React
- Custom ERP modules: React + Node.js APIs replacing legacy VB/C# desktop apps

### AI Applications
- LLM frontends: React chatbots, streaming responses via Server-Sent Events
- Node.js API layer between frontend and Python AI models
- Vercel AI SDK: JavaScript streaming for AI responses
- LangChain.js: JavaScript port of the Python LangChain framework

---

## Alternatives

### TypeScript
**What it is:** A statically-typed superset of JavaScript that compiles to JavaScript.  
**Advantages:** Catches type errors at compile time; excellent IDE support (autocomplete, refactoring); better for large teams and codebases; self-documenting code.  
**Disadvantages:** Requires a build step; learning curve for type system; adds complexity.  
**When to choose TypeScript:** Any project with more than 1 developer, more than 500 lines of code, or any project expected to be maintained for more than 3 months.

### Python
**What it is:** General-purpose language dominant in data science and ML.  
**Advantages:** Best ecosystem for ML/AI (PyTorch, TensorFlow, pandas); cleaner syntax for data manipulation; better for scripting.  
**Disadvantages:** Not native to browsers; GIL limits true parallelism; slower than Node.js for I/O-heavy workloads.  
**When to choose Python:** AI/ML systems, data pipelines, scientific computing, automation scripts.

### Go
**What it is:** Compiled, statically-typed language from Google.  
**Advantages:** Excellent performance; built-in concurrency (goroutines); compiles to single binary; great for microservices.  
**Disadvantages:** No generics until 1.18 (limited expressiveness); verbose error handling; smaller ecosystem than Node.js.  
**When to choose Go:** High-performance APIs, CLI tools, systems with extreme concurrency requirements.

### Decision Matrix

| Criterion | JavaScript/Node | TypeScript | Python | Go |
|-----------|----------------|------------|--------|-----|
| **Browser support** | Native | Via transpile | No | No |
| **ML/AI** | Poor | Poor | Excellent | Fair |
| **Web APIs** | Excellent | Excellent | Good | Good |
| **Performance** | Good | Good | Fair | Excellent |
| **Team scalability** | Fair | Excellent | Good | Excellent |
| **Ecosystem size** | Largest | Large | Large | Medium |
| **Serverless** | Excellent | Excellent | Good | Good |
| **Learning curve** | Low | Medium | Low | Medium |

---

## Security

### Common JavaScript Vulnerabilities

**1. Prototype Pollution**
```javascript
// Attacker-controlled input can pollute Object.prototype
const maliciousInput = JSON.parse('{"__proto__": {"isAdmin": true}}');

// Bad — merge without sanitization
function merge(target, source) {
  for (const key in source) {
    target[key] = source[key]; // sets Object.prototype.isAdmin = true!
  }
}
merge({}, maliciousInput);
console.log({}.isAdmin); // true — all objects are now "admin"!

// Protection: use Object.create(null) for pure hash maps
// Or use a library like lodash.merge which handles this
// Or validate/sanitize input against a schema
```

**2. ReDoS (Regular Expression Denial of Service)**
```javascript
// Evil regex — exponential time complexity
const evilRegex = /^(a+)+$/;
evilRegex.test("aaaaaaaaaaaaaaaaaab"); // hangs the event loop!

// Use simple regexes or a library like 're2' for user-controlled input
// npm install re2
const RE2 = require("re2");
const safe = new RE2("^[a-z]+$");
```

**3. Command Injection (Node.js)**
```javascript
const { exec } = require("child_process");

// NEVER DO THIS
function listFiles(directory) {
  exec(`ls ${directory}`, callback); // directory could be "; rm -rf /"
}

// Safe alternative: use execFile with argument arrays
const { execFile } = require("child_process");
function listFilesSafe(directory) {
  execFile("ls", [directory], callback); // arguments are escaped
}
```

**4. Path Traversal**
```javascript
const path = require("path");
const fs   = require("fs");

// Bad
function serveFile(filename) {
  return fs.readFileSync(`./public/${filename}`); // ../../etc/passwd!
}

// Good
function serveFileSafe(filename) {
  const safePath = path.resolve("./public", filename);
  const publicDir = path.resolve("./public");

  if (!safePath.startsWith(publicDir)) {
    throw new Error("Access denied: path traversal detected");
  }

  return fs.readFileSync(safePath);
}
```

### Secrets Management

```javascript
// NEVER hardcode secrets
const apiKey = "sk-abc123"; // WRONG — will be committed to git!

// ALWAYS use environment variables
const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  throw new Error("OPENAI_API_KEY environment variable is not set");
}

// Use a .env file for local development (never commit it)
// .gitignore must include: .env, .env.local, .env.*.local

// Validate required environment variables at startup
function requireEnv(name) {
  const value = process.env[name];
  if (value === undefined || value === "") {
    throw new Error(`Required environment variable '${name}' is missing`);
  }
  return value;
}

const config = {
  port:     Number(process.env.PORT) || 3000,
  dbUrl:    requireEnv("DATABASE_URL"),
  jwtSecret: requireEnv("JWT_SECRET"),
  apiKey:   requireEnv("EXTERNAL_API_KEY")
};
```

### Input Validation

```javascript
// Always validate and sanitize user input at system boundaries
// npm install joi  OR  npm install zod

// Using Joi
const Joi = require("joi");

const createUserSchema = Joi.object({
  name:     Joi.string().min(2).max(100).trim().required(),
  email:    Joi.string().email().lowercase().required(),
  age:      Joi.number().integer().min(13).max(120).required(),
  role:     Joi.string().valid("user", "editor", "admin").default("user")
});

function validateCreateUser(data) {
  const { error, value } = createUserSchema.validate(data, { abortEarly: false });
  if (error) {
    const details = error.details.map(d => ({ field: d.path[0], message: d.message }));
    throw new ValidationError(details);
  }
  return value; // clean, validated data
}
```

---

## Performance

### V8 Optimization Tips

**1. Monomorphic functions (same types every call)**
```javascript
// Bad — V8 can't optimize because types change
function add(a, b) { return a + b; }
add(1, 2);       // numbers
add("a", "b");   // strings
add(1, "2");     // mixed — deoptimizes!

// Good — dedicated functions per type
function addNumbers(a, b) { return a + b; } // always numbers
function concatStrings(a, b) { return a + b; } // always strings
```

**2. Hidden classes — keep object shapes consistent**
```javascript
// Bad — creates different hidden classes
const obj1 = {};
obj1.x = 1; // adds property in different order
obj1.y = 2;

const obj2 = {};
obj2.y = 2; // different order!
obj2.x = 1;

// Good — create objects with all properties at once
const obj1 = { x: 1, y: 2 };
const obj2 = { x: 3, y: 4 }; // same hidden class — V8 can optimize
```

**3. Avoid `delete` — it deoptimizes objects**
```javascript
// Bad
delete obj.property; // V8 switches to a slower dictionary mode

// Good — set to undefined or null
obj.property = null; // or undefined — keeps hidden class
```

### Profiling with Node.js

```bash
# CPU profiling
node --prof app.js          # generates isolate-*.log
node --prof-process isolate-*.log > profile.txt

# Memory snapshot
node --expose-gc app.js     # gives you global.gc() for manual GC

# Built-in profiler
node --inspect app.js       # open Chrome DevTools for the process
```

### Benchmarking

```javascript
// Use performance.now() for precise timing
const { performance } = require("perf_hooks");

function benchmark(name, fn, iterations = 10000) {
  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    fn();
  }
  const end = performance.now();
  const total = end - start;
  console.log(`${name}: ${total.toFixed(2)}ms total, ${(total / iterations).toFixed(4)}ms per call`);
}

benchmark("Array.push", () => {
  const arr = [];
  arr.push(1);
}, 100000);

benchmark("Array preallocated", () => {
  const arr = new Array(1);
  arr[0] = 1;
}, 100000);
```

### Memory Management

```javascript
// Identify memory leaks with WeakRef
let heavyObject = new WeakRef(new Array(1_000_000).fill(0));

// The array can be garbage collected if no other references exist
setTimeout(() => {
  const obj = heavyObject.deref();
  if (obj === undefined) {
    console.log("Object was garbage collected");
  } else {
    console.log("Object still in memory");
  }
}, 5000);

// Common memory leaks in Node.js:
// 1. Growing arrays/maps that are never cleared
// 2. Event listeners that are never removed
// 3. Closures that capture large objects unnecessarily
// 4. setInterval callbacks that accumulate state
// 5. Streams that are not properly closed
```

---

## Debugging

### Common Issues and Causes

| Issue | Cause | Fix |
|-------|-------|-----|
| `undefined is not a function` | Calling something that's not a function | Check variable holds what you expect; `typeof fn === 'function'` |
| `Cannot read property 'x' of null` | Accessing property on null | Optional chaining: `obj?.x` |
| `ReferenceError: x is not defined` | Using variable before declaration or outside scope | Check scope, fix typo |
| `Unhandled Promise rejection` | Async error with no `.catch()` | Always add `.catch()` or try/catch |
| Infinite loop | Loop condition never becomes false | Add `console.log` to trace; check loop bounds |
| `NaN` in calculation | Math on non-numeric value | `Number.isNaN()` check; validate inputs |
| Memory leak | Accumulating references | Use WeakMap/WeakRef; clear intervals/listeners |
| `this` is undefined | Arrow function vs regular function in wrong context | Use arrow function or bind |

### Debugging Workflow

```
1. Reproduce the bug reliably (find minimal test case)
2. Read the error message carefully — it often tells you exactly what's wrong
3. Identify WHERE the error occurs (file + line number from stack trace)
4. Understand WHAT state the program is in at that point
5. Form a hypothesis about WHY
6. Test hypothesis (console.log, debugger, unit test)
7. Fix and verify the fix doesn't break anything else
```

### Using the Node.js Debugger

```javascript
// Method 1: debugger statement + --inspect
function processData(data) {
  debugger; // execution pauses here when inspector is connected
  const result = data.map(x => x * 2);
  return result;
}

// Run: node --inspect-brk app.js
// Open Chrome: chrome://inspect
// Click "inspect" next to your Node process
```

```bash
# Method 2: VS Code debugging (launch.json)
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug App",
      "program": "${workspaceFolder}/src/index.js",
      "env": { "NODE_ENV": "development" }
    }
  ]
}
```

### Real Production Debugging Example

```
Scenario: Users report that certain orders are failing silently.
No error is being thrown, no log is being written.

1. Search logs for the order IDs provided by users
   → No log entries at all for those orders

2. Add temporary logging around the order processing pipeline
   → Discover the error is swallowed in an empty catch block:
   
   catch (err) {
     // TODO: handle this
   }  ← this was the bug!

3. Fix: log all errors, even if you handle them:
   catch (err) {
     logger.error("Order processing failed", { orderId, err: err.message, stack: err.stack });
     throw err; // or handle appropriately
   }

4. Add alert: set up CloudWatch alarm on error log rate
5. Write regression test: verify error is thrown (not swallowed) in failing scenario
```

---

## Interview Preparation

### Beginner Questions

**Q1: What is the difference between `null` and `undefined`?**

A: Both represent the absence of a value, but they differ in meaning and origin.
- `undefined` means a variable has been declared but not assigned a value. It's the default value of uninitialized variables, missing function arguments, and non-existent object properties.
- `null` represents the intentional absence of a value. It must be explicitly assigned.

```javascript
let x;         // undefined — declared but not assigned
let y = null;  // null — explicitly "no value"

typeof undefined // "undefined"
typeof null      // "object" ← famous bug in JavaScript
```

**Q2: What is hoisting?**

A: Hoisting is JavaScript's behavior of moving declarations to the top of their scope before execution. `var` declarations and function declarations are fully hoisted. `let` and `const` are technically hoisted but remain in the Temporal Dead Zone until their declaration is reached, causing a ReferenceError if accessed before.

```javascript
console.log(a); // undefined (hoisted, but not initialized)
var a = 5;

console.log(b); // ReferenceError (TDZ)
let b = 5;

sayHi(); // "Hi!" — function declaration is fully hoisted
function sayHi() { console.log("Hi!"); }
```

**Q3: What are the falsy values in JavaScript?**

A: There are exactly 8 falsy values: `false`, `0`, `-0`, `0n` (BigInt zero), `""` (empty string), `null`, `undefined`, `NaN`. Everything else is truthy.

**Q4: Explain the difference between `==` and `===`.**

A: `==` performs loose equality with type coercion — it converts operands to the same type before comparing. `===` performs strict equality with no coercion — it checks both type and value. Always use `===` in production code.

### Intermediate Questions

**Q5: Explain closures and give a practical use case.**

A: A closure is a function that retains access to its lexical scope even after the outer function has finished executing. The inner function "closes over" the variables of the outer scope.

Practical use case — creating private state:
```javascript
function createBankAccount(initialBalance) {
  let balance = initialBalance; // private — not accessible outside

  return {
    deposit(amount)  { balance += amount; },
    withdraw(amount) {
      if (amount > balance) throw new Error("Insufficient funds");
      balance -= amount;
    },
    getBalance()     { return balance; }
  };
}

const account = createBankAccount(100);
account.deposit(50);
console.log(account.getBalance()); // 150
// balance is inaccessible directly — true encapsulation
```

**Q6: What is the event loop and how does it work?**

A: JavaScript is single-threaded — it has one call stack. But it can handle async operations (I/O, timers, network) without blocking because of the event loop.

When an async operation starts, it's offloaded to the browser APIs or Node.js APIs (which are implemented in C++). When it completes, its callback is placed in the callback queue. The event loop constantly checks: "Is the call stack empty?" If yes, it takes the next callback from the queue and pushes it to the call stack.

Microtasks (Promises) have a separate, higher-priority queue. The event loop processes ALL microtasks before processing the next macrotask (setTimeout, I/O).

**Q7: What is prototypal inheritance?**

A: Prototypal inheritance is JavaScript's mechanism for objects to inherit properties from other objects. Every object has an internal `[[Prototype]]` link to another object. When you access a property, JavaScript first looks on the object itself, then follows the prototype chain until it finds the property or reaches `null`.

### Senior Questions

**Q8: How would you prevent prototype pollution in a library you're building?**

A: Several strategies:
1. Use `Object.create(null)` for dictionaries/hash maps (no prototype)
2. Validate property names before assignment (block `__proto__`, `constructor`, `prototype`)
3. Use `Object.freeze(Object.prototype)` in sensitive environments
4. Use `Map` instead of plain objects for dynamic key-value storage
5. Validate incoming data against a strict schema before processing

**Q9: Explain how memory management works in V8.**

A: V8 uses a generational garbage collector. Memory is divided into:
- **Young generation (new space)**: Small, frequently collected. New objects go here. Uses Scavenge algorithm (copy live objects to new space, discard dead).
- **Old generation (old space)**: Large, infrequently collected. Objects that survive two young generation collections are promoted here. Uses Mark-Sweep-Compact algorithm.

V8 runs GC incrementally and concurrently to avoid stop-the-world pauses. `process.memoryUsage()` shows heap stats. Common memory leaks: forgotten timers, growing caches, closures holding unnecessary references.

### Deep Dive Answers (3+ Years Experience)

**Q10a: Explain the JavaScript execution context and call stack in detail.**

**What they're testing:** Foundation depth — separates memorizers from engineers who understand the runtime.

**Deep Answer:**

Every function call creates an **execution context** pushed onto the **call stack**. Each context has:
1. **Variable Environment:** `var` declarations, function declarations, arguments object
2. **Lexical Environment:** `let`, `const`, outer reference for closures
3. **`this` binding**

The engine processes code in two phases per context: **Creation** (hoist declarations, set up scope chain) then **Execution** (run line by line).

When a function returns, its context is **popped** off the stack. Stack overflow happens with infinite recursion — each call adds a frame until stack limit (~10,000–50,000 frames depending on environment).

**Closure connection:** When an inner function is returned, its lexical environment survives even after outer function pops — that's the closure. The outer variables live on the **heap**, not the stack, because the inner function still references them.

**Async connection:** When `setTimeout` fires, its callback gets a **new** execution context pushed onto the stack — but the stack was empty when the event loop scheduled it.

---

**Q10b: How do Promises work internally? Explain the microtask queue.**

**Deep Answer:**

A Promise has three states: pending, fulfilled, rejected. Once settled, state is immutable.

`.then(onFulfilled, onRejected)` registers handlers. If Promise is already settled, handler goes to **microtask queue** immediately. If pending, handler is stored internally and queued when settled.

**Chaining:** `.then()` returns a NEW Promise. Return value from handler becomes its resolution value. Thrown error becomes rejection. Return another Promise → waits for it.

```javascript
Promise.resolve(1)
  .then(v => v + 1)      // 2
  .then(v => { throw new Error('fail'); })
  .catch(e => 0)          // recovery
  .then(v => console.log(v)); // 0
```

**async/await** is syntactic sugar over Promises. `await` pauses the async function (not the thread!) until Promise settles. Code after `await` runs as `.then()` callback — microtask.

**Error handling:** Unhandled Promise rejection crashes Node.js process in modern versions. Always `.catch()` or try/catch in async functions.

**Production pattern:** `Promise.all()` for parallel independent operations. `Promise.allSettled()` when you need all results regardless of failures. Never `Promise.all()` with unbounded array (10,000 parallel DB calls) — use batching with concurrency limit.

---

**Q10c: What is the module system? CommonJS vs ESM in Node.js.**

**Deep Answer:**

**CommonJS (`require`/`module.exports`):**
- Loaded synchronously at `require()` call site
- `module.exports` is the public API
- Circular dependencies partially supported (returns incomplete exports)
- Dynamic: `require(dynamicPath)` works

**ES Modules (`import`/`export`):**
- Statically analyzed at parse time — enables tree shaking
- `import` is hoisted (available before line runs)
- Asynchronous loading in browsers; Node supports sync loading for `.mjs` files
- `export` must be at top level (not inside if blocks)

**In Node.js today:** `"type": "module"` in package.json enables ESM. `.cjs` forces CommonJS, `.mjs` forces ESM.

**Interop:** ESM can `import` CJS (default export = module.exports). CJS cannot `require()` ESM — must use dynamic `import()`.

**At 3 YOE:** Mention you use TypeScript compiling to ESM, with `"module": "NodeNext"` for correct resolution.

---

A: Backpressure occurs when a writable stream is slower than the readable stream producing data. Without handling it, memory grows without bound.

```javascript
const readable = fs.createReadStream("large-file.txt");
const writable = fs.createWriteStream("output.txt");

readable.on("data", (chunk) => {
  const canContinue = writable.write(chunk);
  if (!canContinue) {
    readable.pause(); // pause reading until drain
  }
});

writable.on("drain", () => {
  readable.resume(); // resume reading
});

// Or simply use pipe() which handles backpressure automatically
readable.pipe(writable);
```

### Scenario Questions

**Q11: You have a function that processes 10,000 items sequentially. Users report it's too slow. How do you optimize it?**

A: Analyze the bottleneck first. If items are I/O-bound (database/API calls):
1. Use `Promise.all()` for parallelism — but all 10,000 at once may overwhelm the database
2. Use batch processing with controlled concurrency (e.g., 50 at a time)
3. Use a job queue (Bull/BullMQ) for background processing with retries

If items are CPU-bound:
1. Move to Worker Threads (separate thread pool)
2. Offload to a dedicated service
3. Consider streaming/pagination to avoid loading all 10,000 into memory

**Q12: How would you detect and fix a memory leak in production Node.js?**

A:
1. Monitor `process.memoryUsage().heapUsed` over time — steady growth indicates a leak
2. Take heap snapshots at intervals using `--heap-snapshot-signal` or V8 profiler API
3. Compare snapshots in Chrome DevTools to find objects that accumulate
4. Common culprits: global arrays/maps growing unbounded, event listeners never removed, closures holding large objects, unclosed database connections

### System Design Questions

**Q13: Design a rate limiter in JavaScript.**

```javascript
class RateLimiter {
  constructor(maxRequests, windowMs) {
    this.maxRequests = maxRequests;
    this.windowMs    = windowMs;
    this.clients     = new Map(); // clientId → [timestamps]
  }

  isAllowed(clientId) {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    if (!this.clients.has(clientId)) {
      this.clients.set(clientId, []);
    }

    const timestamps = this.clients.get(clientId)
      .filter(ts => ts > windowStart); // remove expired

    if (timestamps.length >= this.maxRequests) {
      return false; // rate limit exceeded
    }

    timestamps.push(now);
    this.clients.set(clientId, timestamps);
    return true;
  }
}

// 100 requests per 60 seconds per user
const limiter = new RateLimiter(100, 60 * 1000);

function apiMiddleware(req, res, next) {
  if (!limiter.isAllowed(req.ip)) {
    return res.status(429).json({ error: "Too many requests" });
  }
  next();
}
```

---

## Practical Tasks

### Beginner (10 Tasks)

1. **FizzBuzz**: Print numbers 1–100. For multiples of 3, print "Fizz"; multiples of 5, print "Buzz"; both, print "FizzBuzz".

2. **Palindrome Checker**: Write a function `isPalindrome(str)` that returns true if the string reads the same forwards and backwards (case-insensitive, ignore spaces).

3. **Array Flatten**: Write `flattenDeep(arr)` that recursively flattens a nested array of any depth without using `Array.prototype.flat()`.

4. **Count Character Frequency**: Given a string, return an object with each character as a key and its frequency as the value.

5. **Temperature Converter**: Build a module that converts between Celsius, Fahrenheit, and Kelvin.

6. **Capitalize Words**: Write a function that capitalizes the first letter of each word in a sentence.

7. **Remove Duplicates**: Remove duplicate values from an array using three different approaches (Set, filter, reduce).

8. **Fibonacci Sequence**: Write both a recursive and iterative version of a function that returns the nth Fibonacci number.

9. **Simple Calculator**: Build a calculator class with add, subtract, multiply, divide methods that maintains a running result and supports method chaining.

10. **Vowel Counter**: Count the number of vowels in a given string.

### Intermediate (10 Tasks)

1. **Debounce Implementation**: Implement `debounce(fn, delay)` from scratch. The function should only execute after `delay` ms have passed since the last call.

2. **Deep Clone**: Write `deepClone(obj)` that creates a complete deep copy of an object (handles nested objects, arrays, dates, and circular references).

3. **Event Emitter**: Build an `EventEmitter` class with `on`, `off`, `once`, and `emit` methods.

4. **Memoization with LRU**: Implement a memoize function with an LRU (Least Recently Used) cache of configurable max size.

5. **Promise.all Implementation**: Implement your own version of `Promise.all()` without using the built-in.

6. **Curry Function**: Implement `curry(fn)` that transforms a function of multiple arguments into a sequence of single-argument functions.

7. **Observable**: Build a simple Observable class with `subscribe`, `unsubscribe`, `map`, and `filter` operators.

8. **Pub/Sub System**: Build a publish/subscribe system that supports namespaced events (e.g., `"user:created"`, `"user:deleted"`).

9. **Lazy Evaluator**: Build a lazy sequence class using generators that supports `map`, `filter`, `take`, and `toArray` operations.

10. **Type-safe Config Parser**: Parse and validate environment variables into a typed config object, throwing descriptive errors for missing or malformed values.

### Advanced (10 Tasks)

1. **Rate Limiter**: Implement a sliding window rate limiter that tracks requests per client with automatic cleanup of expired entries.

2. **Connection Pool**: Build a generic connection pool that manages a fixed number of connections, queues requests when all are in use, and handles timeouts.

3. **State Machine**: Implement a finite state machine that transitions between states based on events, validates transitions, and emits hooks on state changes.

4. **Virtual DOM**: Build a minimal virtual DOM implementation with a `createElement`, `render`, and `diff`/`patch` function.

5. **Stream Pipeline**: Build a transform stream pipeline in Node.js that reads a CSV file, validates rows, transforms data, and writes output to JSON.

6. **Worker Thread Pool**: Build a worker thread pool that distributes CPU-intensive tasks across `os.cpus().length` threads with a task queue.

7. **Reactive State**: Implement a reactive state container (like MobX) using Proxies that automatically tracks dependencies and re-runs observer functions when state changes.

8. **Interpreter**: Build a simple expression interpreter that parses and evaluates arithmetic expressions with variables (e.g., `"x + 2 * y"` where x=3, y=4 → 11).

9. **Circuit Breaker**: Implement a circuit breaker pattern that wraps async functions, opens after N failures within a time window, and automatically tests recovery.

10. **Distributed Lock**: Design a distributed lock mechanism using Redis (or an in-memory simulation) that prevents concurrent access to a shared resource across multiple server instances.

---

## Mini Project

### Task Manager CLI

Build a command-line task manager with persistent storage.

**Features:**
- Add, list, complete, and delete tasks
- Tasks persist to a JSON file
- Filter tasks by status (pending/complete)
- Due date support with overdue detection

```javascript
// task-manager/index.js
const fs   = require("fs");
const path = require("path");

const DATA_FILE = path.join(__dirname, "tasks.json");

class TaskManager {
  constructor() {
    this.tasks = this._load();
  }

  _load() {
    try {
      return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
    } catch {
      return [];
    }
  }

  _save() {
    fs.writeFileSync(DATA_FILE, JSON.stringify(this.tasks, null, 2));
  }

  add(title, dueDate = null) {
    const task = {
      id:        Date.now(),
      title,
      status:    "pending",
      createdAt: new Date().toISOString(),
      dueDate
    };
    this.tasks.push(task);
    this._save();
    return task;
  }

  complete(id) {
    const task = this.tasks.find(t => t.id === id);
    if (!task) throw new Error(`Task ${id} not found`);
    task.status      = "done";
    task.completedAt = new Date().toISOString();
    this._save();
    return task;
  }

  delete(id) {
    const index = this.tasks.findIndex(t => t.id === id);
    if (index === -1) throw new Error(`Task ${id} not found`);
    const [deleted] = this.tasks.splice(index, 1);
    this._save();
    return deleted;
  }

  list(filter = "all") {
    const now = new Date();
    return this.tasks
      .filter(t => filter === "all" || t.status === filter)
      .map(t => ({
        ...t,
        overdue: t.status === "pending" && t.dueDate && new Date(t.dueDate) < now
      }));
  }
}

// CLI entry point
const [,, command, ...args] = process.argv;
const manager = new TaskManager();

switch (command) {
  case "add":
    const task = manager.add(args.join(" "));
    console.log(`✓ Added: "${task.title}" (id: ${task.id})`);
    break;

  case "list":
    const tasks = manager.list(args[0]);
    if (tasks.length === 0) { console.log("No tasks found."); break; }
    tasks.forEach(t => {
      const status  = t.status === "done" ? "✓" : t.overdue ? "!" : "○";
      const due     = t.dueDate ? ` [due: ${t.dueDate}]` : "";
      console.log(`${status} [${t.id}] ${t.title}${due}`);
    });
    break;

  case "done":
    manager.complete(Number(args[0]));
    console.log(`✓ Marked complete`);
    break;

  case "delete":
    manager.delete(Number(args[0]));
    console.log(`✓ Deleted`);
    break;

  default:
    console.log("Commands: add <title> | list [all|pending|done] | done <id> | delete <id>");
}
```

---

## Production Project

### URL Shortener Service

Build a production-grade URL shortening service using Node.js with the following components.

**Architecture:**
```
Client → Express API → Service Layer → Repository Layer → SQLite/PostgreSQL
                    ↓
              Redis Cache (frequently accessed short codes)
```

**Features:**
- `POST /shorten` — shorten a URL, return short code
- `GET /:code` — redirect to original URL (301 redirect)
- `GET /stats/:code` — access statistics (clicks, referrers, geolocation)
- Rate limiting: 100 shorten requests per IP per hour
- URL validation (must be valid, accessible)
- Custom aliases (e.g., `/my-brand`)
- Expiry dates
- Click tracking with timestamp, user agent, IP

**Key Implementation Points:**
1. Generate short codes using base62 encoding of an auto-increment ID (not random — ensures uniqueness)
2. Cache hot links in Redis with 1-hour TTL (most links are accessed many times in bursts)
3. Track clicks asynchronously (don't block redirect with analytics write)
4. Use proper HTTP 301 (permanent) vs 302 (temporary) redirects
5. Implement a cleanup job (cron) to delete expired URLs

**Files to create:**
- `src/services/url-service.js` — business logic
- `src/repositories/url-repository.js` — database access
- `src/middleware/rate-limiter.js` — Redis-backed sliding window rate limiter
- `src/utils/base62.js` — encode/decode short codes
- `src/validators/url-validator.js` — URL validation
- `tests/` — unit tests for each module

---

## Capstone Project

### Real-Time Collaborative Code Editor

Build a portfolio-quality, production-ready collaborative code editor where multiple users can edit the same document simultaneously (like Google Docs, but for code).

**Technology Stack:**
- Node.js backend with Express
- WebSockets (ws or Socket.IO) for real-time sync
- Operational Transformation (OT) algorithm for conflict resolution
- Redis for pub/sub across multiple server instances
- PostgreSQL for document persistence
- React frontend with CodeMirror 6 for the editor

**Features:**
- Real-time multi-user editing with cursor tracking
- Syntax highlighting for 20+ languages
- Document history / version timeline
- User presence (see who is editing, with colored cursors)
- Offline support with sync on reconnect
- Share via link (public/private documents)
- Export to file (`.js`, `.ts`, `.py`, etc.)

**Why This Is a Great Portfolio Piece:**
- Demonstrates understanding of real-time systems (WebSockets, pub/sub)
- Shows distributed systems thinking (Redis pub/sub for horizontal scaling)
- Involves a non-trivial algorithm (OT or CRDT)
- Solves a real problem users understand
- Showcases both frontend and backend JavaScript skills

**Architecture:**
```
                          ┌──────────┐
                          │  Client  │ (React + CodeMirror)
                          └────┬─────┘
                               │ WebSocket
                          ┌────▼─────┐
                          │  WS API  │ (Node.js)
                          └────┬─────┘
                  ┌────────────┼────────────┐
                  ▼            ▼            ▼
            ┌─────────┐  ┌─────────┐  ┌──────────┐
            │  Redis  │  │  Redis  │  │ Postgres │
            │ Pub/Sub │  │  Cache  │  │ (docs)   │
            └─────────┘  └─────────┘  └──────────┘
```

---

## Self Assessment

Answer these questions. If you cannot answer at least 80% (17/21), review the corresponding sections before moving on.

1. What are the 8 data types in JavaScript? Give an example of each.
2. What is the difference between `var`, `let`, and `const`? When would you use each?
3. Explain what hoisting is and how it differs between `var`, `let`, and function declarations.
4. What is a closure? Write a function that uses a closure to maintain private state.
5. Explain the difference between `==` and `===`. Give two examples where they differ.
6. What is the event loop? Describe the order in which synchronous code, microtasks, and macrotasks execute.
7. What is the difference between `null` and `undefined`?
8. What are the falsy values in JavaScript?
9. Explain prototypal inheritance. How does the prototype chain work?
10. What is the difference between `.call()`, `.apply()`, and `.bind()`?
11. What does `this` refer to in: a regular function? an arrow function? a class method? a callback?
12. Explain `Promise.all`, `Promise.race`, `Promise.allSettled`, and `Promise.any`. When would you use each?
13. What is the difference between a shallow copy and a deep copy? How do you create each?
14. What is prototype pollution and how do you prevent it?
15. What are generators? Write a generator function that produces an infinite sequence.
16. What is a WeakMap? When would you use it over a regular Map?
17. Explain the difference between `Map` and a plain object `{}`. When would you choose Map?
18. What is debouncing? What is throttling? When would you use each?
19. Explain the concept of tail call optimization and how JavaScript handles recursion limits.
20. What is the Temporal Dead Zone?
21. Write a function that implements a simple pub/sub system from scratch.

---

## Cheat Sheet

### Variables & Types
```
const x = 1        // block-scoped, no reassign
let y = 2          // block-scoped, can reassign
var z = 3          // function-scoped, hoisted (avoid)

// Types: string, number, boolean, null, undefined, symbol, bigint, object
typeof "str"       // "string"
typeof null        // "object" ← bug
typeof undefined   // "undefined"
typeof []          // "object"
typeof {}          // "object"
typeof function(){} // "function"

// Falsy: false, 0, -0, 0n, "", null, undefined, NaN
// Everything else is truthy
```

### Functions
```
// Declaration (hoisted)
function fn(a, b = 0) { return a + b; }

// Expression (not hoisted)
const fn = function(a, b) { return a + b; };

// Arrow (lexical this)
const fn = (a, b) => a + b;
const fn = x => x * 2;     // single param
const fn = () => {};        // no params

// Rest & Spread
function sum(...nums) { return nums.reduce((a, b) => a + b, 0); }
const merged = { ...obj1, ...obj2 };
const copy   = [...arr];
```

### Array Methods
```
arr.map(fn)          // transform each → new array
arr.filter(fn)       // keep where fn returns true → new array
arr.reduce(fn, init) // accumulate → single value
arr.find(fn)         // first match or undefined
arr.findIndex(fn)    // first matching index or -1
arr.includes(val)    // boolean
arr.some(fn)         // true if any match
arr.every(fn)        // true if all match
arr.flat(depth)      // flatten nested arrays
arr.flatMap(fn)      // map + flat(1)
arr.slice(start,end) // non-mutating subset
arr.splice(i,n,...x) // mutating insert/delete
arr.sort((a,b)=>a-b) // sort (mutates!) — always pass comparator
[...arr].sort(...)   // safe: sort a copy
```

### Object Operations
```
const { a, b } = obj          // destructure
const { a: alias } = obj      // rename
const { a = 5 } = obj         // default
const { x: { y } } = obj      // nested

obj?.prop           // optional chain → undefined if obj is null/undefined
obj ?? "default"    // nullish coalescing → only for null/undefined

Object.keys(obj)    // string[]
Object.values(obj)  // any[]
Object.entries(obj) // [string, any][]
Object.fromEntries(entries) // reverse of entries
Object.assign(target, src)  // shallow merge (mutates target)
{ ...obj, extra: 1 }        // spread merge (new object)
Object.freeze(obj)           // deep immutability (shallow)
```

### Promises & Async
```
// Create
new Promise((resolve, reject) => { ... })
Promise.resolve(value)
Promise.reject(error)

// Compose
Promise.all([p1, p2])        // parallel, fail fast
Promise.allSettled([p1, p2]) // parallel, all results
Promise.race([p1, p2])       // first to settle wins
Promise.any([p1, p2])        // first to fulfill wins

// async/await
async function fn() {
  try {
    const result = await somePromise();
    return result;
  } catch (err) {
    // handle
  }
}
```

### Event Loop Order
```
1. Synchronous code (call stack)
2. Microtasks (Promise.then, queueMicrotask) — entire queue
3. Macrotask (setTimeout, setInterval, I/O) — ONE
4. Repeat from step 2
```

### Useful Patterns
```
// Debounce
const debounceFn = (() => {
  let t; return (fn, ms) => (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
})();

// Deep clone (simple)
const clone = JSON.parse(JSON.stringify(obj)); // works for JSON-serializable data

// Range (generator)
function* range(s, e, step=1) { for(let i=s;i<e;i+=step) yield i; }

// Group by
const grouped = arr.reduce((acc, item) => {
  const key = item.category;
  (acc[key] = acc[key] || []).push(item);
  return acc;
}, {});

// Pipeline (function composition)
const pipe = (...fns) => x => fns.reduce((v, f) => f(v), x);
```

### Common Gotchas
```
// NaN is not equal to itself
NaN === NaN    // false
Number.isNaN(NaN) // true ← use this

// Array.sort default is lexicographic
[10, 1, 20].sort()          // [1, 10, 20] ← WRONG!
[10, 1, 20].sort((a,b)=>a-b) // [1, 10, 20] ← correct

// Object spread is SHALLOW
const a = { x: { y: 1 } };
const b = { ...a };
b.x.y = 999;   // also changes a.x.y!

// for...in iterates prototype chain
for (const key in obj) {
  if (obj.hasOwnProperty(key)) { ... } // always guard!
}
// Better: for (const [key, val] of Object.entries(obj))

// parseInt with strings
parseInt("10px")  // 10 ← silently drops non-numeric suffix
Number("10px")    // NaN ← stricter, usually what you want
+"10"             // 10 ← unary plus, fastest string to number
```
