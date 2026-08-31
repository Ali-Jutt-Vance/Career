# Phase 1 — Chapter 6: Functional Programming

> *"Functional programming is like describing your problem to a mathematician. Imperative programming is like giving instructions to an idiot."* — Archie Russell

---

## Chapter Overview

### Why Functional Programming Exists

Functional programming (FP) emerged from lambda calculus, a mathematical model of computation developed by Alonzo Church in the 1930s. Where OOP organizes code around objects that hold mutable state, FP organizes code around pure functions and immutable data.

The core problem FP solves: **mutable shared state is the primary source of bugs in software**. When any function can modify any data at any time, understanding what a program does requires tracking every possible interaction — which quickly becomes impossible.

FP's answer: make data immutable by default. Functions only compute new values from old ones; they never modify anything. A function given the same inputs always produces the same output. This property — called referential transparency — makes code predictable, testable, and parallelizable.

### Problems It Solves

1. **Predictability**: Pure functions are deterministic — same input always yields same output. No surprises from hidden state.
2. **Testability**: Pure functions require no setup, no teardown, no mocking. Pass inputs, assert outputs.
3. **Composability**: Small, focused functions combine like LEGO bricks. Build complex pipelines from simple pieces.
4. **Concurrency safety**: Immutable data eliminates race conditions. Multiple threads can read the same data safely.
5. **Reasoning**: Reading a pure function tells you exactly what it does — no need to trace through global state.

### Industry Adoption

FP concepts pervade modern JavaScript/TypeScript:
- **React**: Functional components, pure renderers, immutable state
- **Redux**: Pure reducers, immutable state updates
- **RxJS**: Observable streams, functional operators (map, filter, mergeMap)
- **lodash/fp**: Functional utility library
- **Ramda**: Purely functional JavaScript library
- **Array methods**: `map`, `filter`, `reduce` are FP primitives

**Pure FP languages in production**: Haskell (finance, compilers), Elm (web frontend), Elixir (real-time systems), Clojure (Nubank backend), Scala (Spark, Kafka, Netflix).

### Alternatives

| Paradigm | Philosophy | Best For |
|----------|-----------|---------|
| **OOP** | Objects with state + behavior | Domain modeling, large teams |
| **Procedural** | Step-by-step instructions | Scripts, imperative algorithms |
| **FP** | Pure functions + immutable data | Data pipelines, concurrent systems |
| **Reactive** | Streams of events | Real-time data, UI interactions |

---

## Beginner Theory

### Core Concepts

**1. Pure Functions**

A pure function:
- Given the same inputs, always returns the same output
- Has no side effects (doesn't modify external state, I/O, random numbers)

```javascript
// Pure — same input → same output, no side effects
function add(a, b)     { return a + b; }
function double(x)     { return x * 2; }
function greet(name)   { return `Hello, ${name}!`; }

// Impure — depends on external state
let tax = 0.2;
function calcTotal(price) { return price * (1 + tax); } // depends on external `tax`

// Impure — side effects
function save(user) { db.save(user); return user; } // modifies external system

// Impure — non-deterministic
function random()   { return Math.random(); }
function now()      { return Date.now(); }
```

**2. Immutability**

Never modify data in place. Always create new data:

```javascript
// Mutable (dangerous)
const user = { name: "Alice", age: 30 };
user.age = 31; // mutates original — unsafe if shared

// Immutable (safe)
const updatedUser = { ...user, age: 31 }; // new object, original unchanged

// Immutable array operations
const nums = [1, 2, 3, 4, 5];
const withSix  = [...nums, 6];        // add — new array
const withoutFirst = nums.slice(1);   // remove first — new array
const doubled  = nums.map(x => x * 2); // transform — new array
```

**3. First-Class Functions**

Functions are values — they can be stored, passed, returned:

```javascript
// Store function in variable
const double = x => x * 2;

// Pass function as argument (higher-order function)
[1, 2, 3].map(double); // [2, 4, 6]

// Return function from function (function factory)
function multiplier(factor) {
  return x => x * factor; // returns a closure
}
const triple = multiplier(3);
triple(5); // 15
```

**4. Higher-Order Functions**

Functions that take functions as arguments or return functions:

```javascript
// map, filter, reduce are built-in HOFs
const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

const evenSquares = numbers
  .filter(n => n % 2 === 0)     // keep evens: [2, 4, 6, 8, 10]
  .map(n => n ** 2)              // square:     [4, 16, 36, 64, 100]
  .reduce((sum, n) => sum + n, 0); // sum:      220
```

**5. Function Composition**

Combine functions to build more complex operations:

```javascript
const pipe = (...fns) => x => fns.reduce((v, f) => f(v), x);
const compose = (...fns) => x => fns.reduceRight((v, f) => f(v), x);

const normalize    = str => str.toLowerCase().trim();
const removeSpaces = str => str.replace(/\s+/g, "-");
const encode       = str => encodeURIComponent(str);

const toSlug = pipe(normalize, removeSpaces, encode);
toSlug("  Hello World! ");  // "hello-world%21"
```

---

## Basic Examples

### Pure Function Utilities

```javascript
// String transformations
const capitalize    = str => str.charAt(0).toUpperCase() + str.slice(1);
const truncate      = (str, max) => str.length > max ? str.slice(0, max) + "..." : str;
const slugify       = str => str.toLowerCase().trim().replace(/\s+/g, "-");

// Number utilities
const clamp         = (val, min, max) => Math.min(Math.max(val, min), max);
const round         = (n, decimals)   => Number(n.toFixed(decimals));
const toPercentage  = (val, total)    => round((val / total) * 100, 1);

// Array utilities
const unique        = arr => [...new Set(arr)];
const chunk         = (arr, size) => arr.reduce((acc, _, i) =>
  i % size === 0 ? [...acc, arr.slice(i, i + size)] : acc, []);
const groupBy       = (arr, key) => arr.reduce((acc, item) => {
  const group = typeof key === "function" ? key(item) : item[key];
  return { ...acc, [group]: [...(acc[group] || []), item] };
}, {});
const sortBy        = (arr, key) => [...arr].sort((a, b) =>
  a[key] < b[key] ? -1 : a[key] > b[key] ? 1 : 0);

// Object utilities
const pick    = (obj, keys) => Object.fromEntries(keys.map(k => [k, obj[k]]));
const omit    = (obj, keys) => Object.fromEntries(
  Object.entries(obj).filter(([k]) => !keys.includes(k))
);

// Usage
const users = [
  { name: "Alice", role: "admin",  age: 30 },
  { name: "Bob",   role: "user",   age: 25 },
  { name: "Carol", role: "admin",  age: 35 },
  { name: "Dave",  role: "user",   age: 28 }
];

const adminsByAge = sortBy(
  users.filter(u => u.role === "admin"),
  "age"
);
// [{ name: "Alice", role: "admin", age: 30 }, { name: "Carol", role: "admin", age: 35 }]

const byRole = groupBy(users, "role");
// { admin: [Alice, Carol], user: [Bob, Dave] }
```

### Currying

```javascript
// Currying: transform f(a, b, c) into f(a)(b)(c)
const curry = fn => {
  const arity = fn.length;
  return function curried(...args) {
    if (args.length >= arity) {
      return fn(...args);
    }
    return (...moreArgs) => curried(...args, ...moreArgs);
  };
};

const add = curry((a, b, c) => a + b + c);
add(1)(2)(3);    // 6
add(1, 2)(3);    // 6
add(1)(2, 3);    // 6
add(1, 2, 3);    // 6

// Partial application: fix some arguments
const add5 = add(5);
const add5And3 = add(5)(3);
add5(3)(2);     // 10
add5And3(2);    // 10

// Real-world: curried database query
const queryDB = curry((table, condition, fields) =>
  `SELECT ${fields.join(",")} FROM ${table} WHERE ${condition}`
);

const usersQuery  = queryDB("users");
const activeUsers = usersQuery("active = true");
activeUsers(["id", "name", "email"]);
// "SELECT id,name,email FROM users WHERE active = true"
```

### Functors and Monads (simplified)

```javascript
// Maybe monad: safely chain operations that might fail/return null
class Maybe {
  constructor(value) {
    this.value = value;
  }

  static of(value)  { return new Maybe(value); }
  static empty()    { return new Maybe(null); }

  isNothing() { return this.value === null || this.value === undefined; }

  map(fn) {
    return this.isNothing() ? Maybe.empty() : Maybe.of(fn(this.value));
  }

  flatMap(fn) {
    return this.isNothing() ? Maybe.empty() : fn(this.value);
  }

  getOrElse(defaultValue) {
    return this.isNothing() ? defaultValue : this.value;
  }
}

// Usage: safe property access chain
const getCity = user =>
  Maybe.of(user)
    .map(u => u.address)
    .map(a => a.city)
    .map(c => c.toUpperCase())
    .getOrElse("UNKNOWN");

getCity({ address: { city: "London" } }); // "LONDON"
getCity({ address: null });               // "UNKNOWN"
getCity(null);                             // "UNKNOWN"

// Without Maybe:
// user && user.address && user.address.city && user.address.city.toUpperCase() || "UNKNOWN"
// Or: user?.address?.city?.toUpperCase() ?? "UNKNOWN" (optional chaining)
```

---

## Intermediate Concepts

### Transducers (High-Performance Data Pipelines)

```javascript
// Problem: chained map/filter creates multiple intermediate arrays
const result = [1,2,3,4,5]
  .filter(x => x % 2 === 0)  // creates [2, 4]
  .map(x => x * 3);           // creates [6, 12]

// Transducers: compose transformations WITHOUT intermediate arrays
const filter   = pred => reducer => (acc, val) => pred(val) ? reducer(acc, val) : acc;
const map      = transform => reducer => (acc, val) => reducer(acc, transform(val));

const xf = compose(
  filter(x => x % 2 === 0),
  map(x => x * 3)
);

const result2 = [1,2,3,4,5].reduce(xf((acc, val) => [...acc, val]), []);
// [6, 12] — single pass, no intermediate arrays
```

### Lenses (Functional Data Updates)

```javascript
// Lens: a getter and setter that can compose
const lens = (getter, setter) => ({
  get: getter,
  set: setter,
  over: (fn, data) => setter(fn(getter(data)), data)
});

const nameLens = lens(
  user => user.name,
  (name, user) => ({ ...user, name })
);

const cityLens = lens(
  user => user.address?.city,
  (city, user) => ({ ...user, address: { ...user.address, city } })
);

const user = { name: "Alice", address: { city: "London", zip: "EC1A" } };

nameLens.get(user);                    // "Alice"
nameLens.set("Bob", user);             // { name: "Bob", address: ... }
nameLens.over(s => s.toUpperCase(), user); // { name: "ALICE", address: ... }
cityLens.set("Paris", user);          // { name: "Alice", address: { city: "Paris", zip: "EC1A" } }
```

### Algebraic Data Types

```typescript
// Sum types (discriminated unions) model mutually exclusive states
type Result<T, E = Error> =
  | { readonly _tag: "Ok";  readonly value: T }
  | { readonly _tag: "Err"; readonly error: E };

const ok  = <T>(value: T): Result<T, never> => ({ _tag: "Ok",  value });
const err = <E>(error: E): Result<never, E> => ({ _tag: "Err", error });

const map = <T, U, E>(result: Result<T, E>, fn: (v: T) => U): Result<U, E> =>
  result._tag === "Ok" ? ok(fn(result.value)) : result;

const flatMap = <T, U, E>(result: Result<T, E>, fn: (v: T) => Result<U, E>): Result<U, E> =>
  result._tag === "Ok" ? fn(result.value) : result;

// Chain operations that can fail
const parseNumber   = (s: string): Result<number> =>
  isNaN(Number(s)) ? err(new Error(`"${s}" is not a number`)) : ok(Number(s));

const safeSqrt = (n: number): Result<number> =>
  n < 0 ? err(new Error("Cannot take sqrt of negative number")) : ok(Math.sqrt(n));

const result = flatMap(parseNumber("16"), safeSqrt);
// result is { _tag: "Ok", value: 4 }

const error = flatMap(parseNumber("abc"), safeSqrt);
// error is { _tag: "Err", error: Error("abc is not a number") }
```

---

## Advanced Concepts

### Point-Free Style

```javascript
// Point-free: define functions without explicitly mentioning their arguments
// "Point" = argument in mathematical terminology

// Pointed style (mentions arguments)
const doubleAll = arr => arr.map(x => x * 2);

// Point-free (compose existing functions)
const double    = x => x * 2;
const doubleAll = map(double); // using a curried map

// More complex example
const getActiveAdminEmails = pipe(
  filter(user => user.active),
  filter(user => user.role === "admin"),
  map(user => user.email),
  map(email => email.toLowerCase()),
  unique
);

getActiveAdminEmails(users); // works without ever seeing users as an argument
```

### Memoization (Functional Caching)

```javascript
// Pure functions can always be safely memoized
function memoize(fn) {
  const cache = new Map();
  return function(...args) {
    const key = JSON.stringify(args);
    if (cache.has(key)) return cache.get(key);
    const result = fn.apply(this, args);
    cache.set(key, result);
    return result;
  };
}

// Memoize expensive pure computation
const expensiveCalc = memoize((n) => {
  // Simulate expensive work
  let result = 0;
  for (let i = 0; i < n * 1000000; i++) result += i;
  return result;
});

expensiveCalc(100); // computes (slow)
expensiveCalc(100); // returns cached (instant)
```

### Reactive Programming with Observables

```javascript
// Observables: streams of values over time, handled functionally
// Using RxJS (real implementation in production)

// Conceptual implementation
class Observable {
  constructor(subscribe) {
    this._subscribe = subscribe;
  }

  static of(...values) {
    return new Observable(observer => {
      values.forEach(v => observer.next(v));
      observer.complete();
    });
  }

  static fromEvent(element, event) {
    return new Observable(observer => {
      const handler = e => observer.next(e);
      element.addEventListener(event, handler);
      return () => element.removeEventListener(event, handler); // cleanup
    });
  }

  map(fn) {
    return new Observable(observer =>
      this._subscribe({
        next:     v => observer.next(fn(v)),
        error:    e => observer.error(e),
        complete: () => observer.complete()
      })
    );
  }

  filter(pred) {
    return new Observable(observer =>
      this._subscribe({
        next:     v => pred(v) && observer.next(v),
        error:    e => observer.error(e),
        complete: () => observer.complete()
      })
    );
  }

  subscribe(observer) {
    return this._subscribe(observer);
  }
}

// Usage
Observable.of(1, 2, 3, 4, 5)
  .filter(x => x % 2 === 0)
  .map(x => x * 10)
  .subscribe({ next: console.log }); // 20, 40
```

---

## Industry Usage

**React**: `useState`, `useReducer`, `useMemo`, `useCallback` — all functional concepts. Components are pure functions of props → UI.

**Redux**: Pure reducers (`(state, action) => newState`), immutable state updates, function composition for middleware.

**Financial systems**: Pure functions for calculations ensure auditability — same input always gives same result.

**Compilers**: Transformations represented as function pipelines (lex → parse → typecheck → optimize → emit).

**Data engineering**: Apache Spark, functional transformations on distributed datasets (map, filter, reduce, groupBy).

---

## Security

**Immutability prevents tampering**: Immutable data cannot be changed after creation — attacker cannot modify a value received from a trusted source if it's immutable.

**Pure functions are easier to audit**: No hidden side effects, no global state changes — security reviewers can reason about function behavior from its signature alone.

**Avoid imperative loops for validation** — use functional pipelines that can be composed and tested independently.

---

## Performance

- **Lazy evaluation**: Don't compute until needed. Generators and transducers process streams lazily.
- **Memoization**: Safe for all pure functions because outputs are deterministic.
- **Immutability cost**: Creating new objects instead of mutating increases GC pressure. For very hot paths, consider structural sharing (persistent data structures).
- **Structural sharing**: Libraries like Immer and Immutable.js share unchanged nodes between old and new versions of a data structure — O(log n) updates instead of O(n) copy.

---

## Debugging

Functional code is generally easier to debug:
- Pure functions can be tested in isolation with no setup
- Since data doesn't change, you can add `console.log` at any point without fear of side effects
- Pipelines can be broken at any step to inspect intermediate values

```javascript
// Debugging a pipeline
const debug = label => value => { console.log(`[${label}]`, value); return value; };

const result = numbers
  .filter(x => x % 2 === 0)
  .map(debug("after filter"))  // inspect intermediate value
  .map(x => x * 3)
  .map(debug("after multiply")); // inspect again
```

---

## Interview Preparation

**Q1: What is a pure function?**
A pure function always returns the same output for the same inputs and has no side effects (doesn't modify external state, doesn't do I/O). Example: `const add = (a, b) => a + b`. Non-example: `const random = () => Math.random()`.

**Q2: What is referential transparency?**
A function or expression is referentially transparent if it can be replaced by its return value without changing the program's behavior. All pure functions are referentially transparent. This property enables optimizations like memoization, parallel execution, and lazy evaluation.

**Q3: What is the difference between `map`, `filter`, and `reduce`?**
- `map(fn)`: Transform each element, preserve count. `[1,2,3].map(x=>x*2)` → `[2,4,6]`
- `filter(pred)`: Keep elements matching predicate. `[1,2,3].filter(x=>x>1)` → `[2,3]`
- `reduce(fn, init)`: Aggregate to single value. `[1,2,3].reduce((acc,x)=>acc+x, 0)` → `6`

**Q4: What is currying?**
Currying transforms a function of N arguments into a chain of N single-argument functions. `f(a,b,c)` becomes `f(a)(b)(c)`. Enables partial application (fixing some arguments early) and creates reusable specialized functions.

**Q5: What is function composition?**
Combining functions so the output of one becomes the input of the next. `compose(f, g)(x) = f(g(x))`. `pipe(f, g)(x) = g(f(x))` (left-to-right). Enables building complex transformations from simple, reusable pieces.

---

## Practical Tasks

### Beginner (10 Tasks)
1. Rewrite 5 common array operations (reverse, flatten, unique, groupBy, sortBy) as pure functions.
2. Implement `curry(fn)` from scratch.
3. Implement `compose` and `pipe`.
4. Write a `memoize` function that handles multiple arguments.
5. Implement `map`, `filter`, `reduce` from scratch (without using built-ins).
6. Write a pure function to deep-clone a nested object.
7. Build a pipeline that processes a list of orders: filter out cancelled, calculate totals, sort by date.
8. Implement `partial(fn, ...args)` — partial application.
9. Write a suite of pure string utilities (capitalize, slugify, truncate, pad).
10. Transform a list of user records through a pipeline: normalize → validate → format.

### Intermediate (10 Tasks)
1. Implement the `Maybe` monad with map, flatMap, getOrElse.
2. Implement the `Result` monad (Ok/Err) and use it for a parsing pipeline.
3. Implement `flatMap` (chain) for arrays from scratch.
4. Build an immutable update library: `set(obj, path, value)` that returns a new object.
5. Implement transducers for map and filter and compose them.
6. Create a functional validation library using composable validators.
7. Implement a simple state machine using pure functions (state + action → new state).
8. Build a lazy list using generators and functional operators.
9. Implement a simple Observable with map, filter, and subscribe.
10. Rewrite an OOP-based service as pure functions + external state.

### Advanced (10 Tasks)
1. Implement persistent (immutable) data structures: List, Map using path copying.
2. Build a functional reactive UI framework (inspired by Elm Architecture): Model + Update + View.
3. Implement Hindley-Milner type inference for a small expression language.
4. Build a parser combinator library for parsing structured text.
5. Implement structural sharing for immutable data (Patricia trie).
6. Create a free monad for building composable DSLs.
7. Build an interpreter for a functional expression language.
8. Implement a property-based testing library (like fast-check) with shrinking.
9. Implement trampolining to make recursive algorithms stack-safe.
10. Create a fully lazy, infinite stream library with memoization.

---

## Mini Project

**Functional Data Pipeline**: Build a CLI tool that reads a large JSON dataset (100k records), applies configurable transformations (filter, map, group, sort, paginate), and outputs results. All transformations must be pure functions; compose them into a pipeline.

---

## Production Project

**Redux-inspired State Manager**: Build a production-grade state management library:
- Pure reducers: `(state, action) => newState`
- Middleware pipeline for side effects (logging, async, devtools)
- Selector functions with memoization
- Time-travel debugging (undo/redo using state snapshots)
- DevTools integration for inspecting state history

---

## Capstone Project

**Functional Spreadsheet Engine**: Build a spreadsheet engine where:
- Cells contain formulas (pure expressions referencing other cells)
- Dependency graph tracks which cells depend on which
- Re-computation is minimal (topological order, memoization)
- All transformations are pure (no mutation during recalculation)
- History/undo is trivial (immutable state snapshots)

---

## Self Assessment
1. What defines a pure function? Name two things that make a function impure.
2. Why is immutability important in concurrent systems?
3. What is the difference between `map`, `filter`, and `reduce`? Give an example of each.
4. What is currying? Write a curried version of `function add(a, b, c) { return a + b + c; }`.
5. What is function composition? Write `compose(f, g, h)(x)`.
6. What is a higher-order function? Name three built-in HOFs in JavaScript.
7. What is referential transparency? Why does it enable memoization?
8. What is the Maybe monad used for? Give a use case.
9. What is the difference between imperative and declarative code? Give examples.
10. What is partial application? How does it differ from currying?
11. What is a closure and how does it relate to functional programming?
12. What is the difference between `map` and `flatMap` (also called `bind` or `chain`)?
13. What are transducers and why are they more efficient than chained array methods?
14. What is point-free style? Write a point-free function to double all numbers in an array.
15. What is a functor? What law must it obey?

---

## Cheat Sheet

### Core FP Patterns
```javascript
// Pure function
const add = (a, b) => a + b;

// Immutable update
const updated = { ...obj, prop: newValue };
const arr2 = [...arr, newItem];

// HOFs
arr.map(fn)         // transform
arr.filter(pred)    // select
arr.reduce(fn, init) // accumulate

// Compose (right to left)
const compose = (...fns) => x => fns.reduceRight((v, f) => f(v), x);

// Pipe (left to right)
const pipe = (...fns) => x => fns.reduce((v, f) => f(v), x);

// Curry
const curry = fn => {
  const f = (...args) =>
    args.length >= fn.length ? fn(...args) : (...more) => f(...args, ...more);
  return f;
};

// Memoize
const memo = fn => {
  const cache = new Map();
  return (...args) => {
    const key = JSON.stringify(args);
    return cache.has(key) ? cache.get(key) : (cache.set(key, fn(...args)), cache.get(key));
  };
};

// Partial application
const partial = (fn, ...presetArgs) => (...laterArgs) => fn(...presetArgs, ...laterArgs);
```

### Common Utilities
```javascript
const groupBy = (arr, key) => arr.reduce((acc, item) => ({
  ...acc,
  [item[key]]: [...(acc[item[key]] || []), item]
}), {});

const sortBy = (arr, key) => [...arr].sort((a, b) => a[key] > b[key] ? 1 : -1);

const pick   = (obj, keys) => Object.fromEntries(keys.map(k => [k, obj[k]]));
const omit   = (obj, keys) => Object.fromEntries(Object.entries(obj).filter(([k]) => !keys.includes(k)));

const unique = arr => [...new Set(arr)];
const chunk  = (arr, n) => Array.from({ length: Math.ceil(arr.length/n) }, (_,i) => arr.slice(i*n, i*n+n));

const flatten     = arr => arr.reduce((a, b) => [...a, ...(Array.isArray(b) ? flatten(b) : [b])], []);
const intersection = (a, b) => a.filter(x => b.includes(x));
const difference   = (a, b) => a.filter(x => !b.includes(x));
```
