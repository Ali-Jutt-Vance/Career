# Functional Programming

> [!GOALS]
> - Explain what functional programming is, and which problem — shared mutable state — it was designed to avoid.
> - Recognise **pure** and **impure** functions, and explain why pure functions are easy to test, reuse and trust.
> - Update objects and arrays **immutably**, including nested data, and know the limits of `const`, `readonly` and `Object.freeze`.
> - Use **higher-order functions**, **composition** (`pipe`), **currying** and **partial application** to build behaviour from small parts.
> - Handle missing values and errors functionally with `Option`-style values and a `Result` type instead of `null` checks and exceptions everywhere.
> - Write **reducers** — `(state, action) => newState` — the pattern behind React's `useReducer` and Redux.
> - Structure a real program as a **functional core** with an **imperative shell**.
> - Judge the costs — copying, readability, performance — and combine functional and object-oriented styles sensibly.

## Why this matters

In {{ch:object-oriented-programming}} you saw how object-oriented programming tames **shared mutable state**: it locks the state inside objects and lets only their methods change it. Functional programming (FP) attacks the same problem from the opposite direction. Instead of guarding mutable state carefully, it asks: **what if most of our code did not change state at all?**

Here is a bug that every JavaScript developer meets sooner or later:

```ts
type Item = { name: string; pricePaisa: number };

function applySale(items: Item[]): Item[] {
  for (const item of items) {
    item.pricePaisa = Math.round(item.pricePaisa * 0.8);
  }
  return items;
}

const catalogue: Item[] = [{ name: "Kurta", pricePaisa: 300000 }];
const salePage = applySale(catalogue);

console.log(salePage[0]!.pricePaisa);
console.log(catalogue[0]!.pricePaisa); // the "normal" price page
```

**Output:**

```text
240000
240000
```

The developer wanted a discounted copy for the sale page. Instead, `applySale` changed the original objects, because, as you learned in {{ch:objects}}, objects are passed **by reference**. Now the normal catalogue also shows the sale price. If `applySale` runs twice, the price drops by 20% twice. Nothing in the function's *name* or *type* warned anyone that it changes its input.

Bugs like this get worse as programs grow. When any function might change any data, you cannot understand a piece of code by reading it alone. You must know everything that happened before it, everywhere. Functional programming removes that whole category of problem by making two things the default:

1. **Functions do not change their inputs or anything outside themselves.** They only compute and return new values.
2. **Data is not changed after it is created.** To "change" something, you create a new version.

You already use these ideas daily: `map`, `filter` and `reduce` ({{ch:arrays}}), arrow functions and closures ({{ch:functions}}, {{ch:scope-and-closures}}), and immutable value objects like `Money` in the last chapter. Modern front-end development is built on them: React expects components to behave like pure functions of their inputs, and expects state to be replaced, never modified ({{ch:react-basics}}). This chapter turns those scattered habits into a complete way of thinking.

## The simple idea

Think of a calculator. You type `7 × 6` and it shows `42`. Every time. It does not matter what you calculated yesterday, who else used it, or what time it is. The calculator does not change the 7 or the 6; it gives you a **new** number. And pressing `×` does not send an email or delete a file.

A **pure function** is like that calculator: **the same inputs always give the same output, and nothing else in the world changes.**

Now think of a cash register in a busy shop. Pressing the same button can give different results depending on what was pressed before, and it changes things — the drawer opens, the stock count drops, a receipt is printed. That is an **impure** operation. Shops need cash registers, of course. Real programs need to save files, send messages and read the clock. Functional programming does not forbid those actions. It **pushes them to the edges** of the program, and keeps the middle — the business logic, the calculations, the decisions — pure.

> [!ANALOGY]
> Pure functions are like a calculator: predictable, repeatable and harmless. Impure code is like a cash register: necessary, but it changes the world.
>
> **Where the analogy breaks:** a calculator works only with numbers. Pure functions can take and return any kind of value — lists of orders, nested objects, even other functions. And unlike a calculator's display, a returned value can be large; creating new copies instead of editing has a real cost in memory and time, which you will learn to manage.

## The proper definition and key words

**Functional programming** is a programming paradigm that builds programs mainly by **applying and combining functions**, treating functions as ordinary values, avoiding changes to existing data (**immutability**), and keeping **side effects** separate from pure computation.

Its roots are in mathematics. In the 1930s, the mathematician Alonzo Church described the **lambda calculus**, a model of computation made of nothing but functions. Languages such as Lisp (1958), ML, Haskell, Erlang, Clojure and F# grew from those ideas. JavaScript is **not** a purely functional language — it allows mutation everywhere — but it supports the functional style very well, because functions in JavaScript are values.

The key words:

- **Pure function** — a function whose output depends only on its inputs, and which has no side effects.
- **Side effect** — anything a function does besides returning a value: changing a variable outside itself, modifying an input, writing to the console, a file, a database or the network, reading the clock or a random number.
- **Immutability** — the practice of never changing data after it is created.
- **First-class functions** — functions that can be stored in variables, passed as arguments and returned from other functions, like any other value.
- **Higher-order function** — a function that takes a function as an argument, returns a function, or both.
- **Declarative code** — code that describes **what** result you want; **imperative** code describes **how**, step by step.
- **Composition** — building a function by connecting other functions, so the output of one becomes the input of the next.

## How it works inside

> [!RECAP]
> In {{ch:functions}} and {{ch:scope-and-closures}} you learned that a function in JavaScript is an **object**. It can be stored in a variable, put in an array, passed to another function and returned. When a function is created inside another function, it keeps access to the variables around it — a **closure**.

Those two facts are everything the functional style needs from the language. Consider:

```ts
function multiplier(factor: number): (x: number) => number {
  return (x) => x * factor;
}

const double = multiplier(2);
const triple = multiplier(3);
console.log(double(5), triple(5), [1, 2, 3].map(triple));
```

**Output:**

```text
10 15 [ 3, 6, 9 ]
```

In memory, it looks like this:

```text
  double ──▶ function object          triple ──▶ function object
             code: x => x * factor               code: x => x * factor
             closure ──▶ { factor: 2 }           closure ──▶ { factor: 3 }
```

- `multiplier` is a **higher-order function**: it returns a function.
- Each call creates a **new** function object. Both share the same code, but each one holds a link to its **own** environment: one remembers `factor = 2`, the other `factor = 3`.
- `[1, 2, 3].map(triple)` passes the function `triple` as a value to `map`, which calls it for each element. `map` is also a higher-order function: it takes a function.

Notice also what did **not** happen: nothing was changed. `multiplier`, `double` and `triple` only compute. You could call them a million times, in any order, and nothing would differ. That is the property the rest of this chapter builds on.

## Pure functions

### Level 1 and 2 — What makes a function pure

A function is **pure** when both are true:

1. **Deterministic:** given the same arguments, it always returns the same result.
2. **No side effects:** it does not change anything outside itself, and does not interact with the outside world.

```ts
// Pure
const add = (a: number, b: number): number => a + b;
const fullName = (first: string, last: string): string => `${first} ${last}`;

// Impure: result depends on a variable outside the function
let taxRate = 0.17;
const withTax = (paisa: number): number => Math.round(paisa * (1 + taxRate));

// Impure: changes its input
const addItem = (cart: string[], item: string): string[] => {
  cart.push(item);
  return cart;
};

// Impure: result depends on the outside world
const isWeekend = (): boolean => [0, 6].includes(new Date().getDay());
const rollDice = (): number => Math.floor(Math.random() * 6) + 1;

console.log(add(2, 3), fullName("Bilal", "Khan"), withTax(10000));
taxRate = 0.18;
console.log(withTax(10000)); // same input, different output
```

**Output:**

```text
5 Bilal Khan 11700
11800
```

Walk through each one:

- `add` and `fullName` use only their parameters and return a value. Pure.
- `withTax` reads `taxRate`, which lives outside it and can change. The same input, `10000`, gave `11700` and then `11800`. Not deterministic, so impure.
- `addItem` calls `cart.push`, which **modifies the array the caller passed in**. The return value is fine, but the caller's array has changed behind their back. That is a side effect, so impure.
- `isWeekend` reads the clock and `rollDice` reads a random number generator. Their outputs depend on the outside world, so they are impure. (They are not *wrong* — a program needs to know the date — but they cannot be tested by simply checking "input → output".)

### Making impure functions pure

Most impure functions can be made pure by **passing in** what they secretly depend on, and **returning** instead of changing:

```ts
const withTax = (paisa: number, taxRate: number): number => Math.round(paisa * (1 + taxRate));

const addItem = (cart: readonly string[], item: string): string[] => [...cart, item];

const isWeekend = (date: Date): boolean => [0, 6].includes(date.getDay());

const original = ["pen"];
const updated = addItem(original, "notebook");

console.log(withTax(10000, 0.17), withTax(10000, 0.18));
console.log(original, updated);
console.log(isWeekend(new Date(2026, 0, 3)), isWeekend(new Date(2026, 0, 5)));
```

**Output:**

```text
11700 11800
[ 'pen' ] [ 'pen', 'notebook' ]
true false
```

- `withTax` now takes `taxRate` as a parameter. Its result depends only on its arguments.
- `addItem` builds a **new** array with the spread operator `[...cart, item]` ({{ch:arrays}}). The original `["pen"]` is untouched. The parameter type `readonly string[]` makes TypeScript reject `cart.push(...)` inside the function, so the promise "I do not change your array" is checked by the compiler.
- `isWeekend` takes the date as a parameter. The impure part — reading the real clock with `new Date()` — moves to the caller. Now we can test it with any date we like: 3 January 2026 is a Saturday, 5 January 2026 is a Monday. (Remember that JavaScript months start at 0, so `0` means January.)

This technique — **pushing the impure parts outward** — is the most practical idea in this chapter. You will see it again, at the scale of a whole program, in the section on the functional core and imperative shell.

### Why pure functions are worth it

- **Testing is trivial.** No setup, no database, no fake clock: call the function, check the result. You will appreciate this greatly in {{ch:testing}}.
- **They can be understood alone.** Everything that affects the result is in the parameter list.
- **They can be reused anywhere**, because they do not depend on, or disturb, their surroundings.
- **They can be cached.** If the same input always gives the same output, you can remember outputs (memoization, later in this chapter).
- **They are safe to run in parallel or in any order**, because they do not interfere with each other.

### Referential transparency

A related idea has a long name: **referential transparency**. An expression is referentially transparent if you could **replace it with its result** without changing what the program does.

`add(2, 3)` is referentially transparent: anywhere you see it, you could write `5`. `rollDice()` is not: replacing it with `4` changes the program's behaviour. Pure functions always give referentially transparent calls. This is what allows you — and tools like compilers and React — to reason about code by **substitution**, the way you simplify an equation in algebra.

## Immutability

### Level 1 — The idea

**Immutable** data never changes after it is created. Instead of editing a value, you create a new value that is a modified copy. The old one stays exactly as it was.

This sounds wasteful at first. Why copy, when you could just change one field? Because **a value that cannot change can be shared safely.** If ten parts of your program hold the same immutable order, none of them can surprise the others. With mutable data, every holder must worry about every other holder.

### Level 2 — `const` is not immutability

A very common misunderstanding: `const` does **not** make data immutable.

```ts
const user = { name: "Hamza", city: "Lahore" };
user.city = "Karachi"; // allowed
console.log(user);
// user = { name: "Other", city: "Multan" }; // error: cannot reassign a const
```

**Output:**

```text
{ name: 'Hamza', city: 'Karachi' }
```

`const` means the **variable** `user` will always point to the same object. It says nothing about the object's contents, which can still be changed. (You met this distinction in {{ch:objects}}.)

### Level 3 — Immutable updates with spread

The everyday tool is the **spread** syntax `...`, which copies the properties of an object or the elements of an array into a new one:

```ts
type User = { readonly name: string; readonly city: string; readonly tags: readonly string[] };

const before: User = { name: "Hamza", city: "Lahore", tags: ["new"] };

const moved: User = { ...before, city: "Karachi" };
const tagged: User = { ...before, tags: [...before.tags, "vip"] };
const untagged: User = { ...before, tags: before.tags.filter((t) => t !== "new") };

console.log(before);
console.log(moved);
console.log(tagged.tags, untagged.tags);
console.log(before.tags === moved.tags);
```

**Output:**

```text
{ name: 'Hamza', city: 'Lahore', tags: [ 'new' ] }
{ name: 'Hamza', city: 'Karachi', tags: [ 'new' ] }
[ 'new', 'vip' ] []
true
```

Line by line:

- `type User = { readonly ... }` marks every property as read-only for the compiler, and `readonly string[]` forbids `push`, `pop`, `sort` and other array changes. Writing `before.city = "X"` would now be a compile error.
- `{ ...before, city: "Karachi" }` creates a new object: first copy every property of `before`, then set `city`. Properties written later override earlier ones.
- `[...before.tags, "vip"]` creates a new array with one more element. `filter` also returns a new array, so it is a natural way to remove items immutably.
- The last line shows something important: `before.tags === moved.tags` is `true`. Spread makes a **shallow copy**: the new object is new, but its properties still point to the **same** inner objects and arrays. That is fine — even desirable — **as long as nobody mutates** those inner values. Sharing unchanged parts is called **structural sharing**, and it is what makes immutable updates cheap: you copy only the path that changed.

The modern array methods you met in {{ch:arrays}} that return new arrays fit perfectly here. Since ES2023, JavaScript also has non-mutating versions of the old mutating methods:

```ts
const scores = [72, 95, 61];

const sorted = scores.toSorted((a, b) => b - a); // new array; sort() would change scores
const reversed = scores.toReversed();             // new array; reverse() would change scores
const fixed = scores.with(2, 66);                 // copy with index 2 replaced

console.log(scores, sorted, reversed, fixed);
```

**Output:**

```text
[ 72, 95, 61 ] [ 95, 72, 61 ] [ 61, 95, 72 ] [ 72, 95, 66 ]
```

`toSorted`, `toReversed`, `toSpliced` and `with` are the immutable twins of `sort`, `reverse`, `splice` and index assignment. Prefer them whenever you do not own the array.

### Level 4 — Updating nested data

Real data is nested, and immutable updates must copy **every level along the path** to the change:

```ts
type Order = {
  readonly id: string;
  readonly customer: { readonly name: string; readonly address: { readonly city: string; readonly street: string } };
  readonly lines: readonly { readonly sku: string; readonly qty: number }[];
};

const order: Order = {
  id: "ORD-7",
  customer: { name: "Nida", address: { city: "Lahore", street: "Mall Road" } },
  lines: [{ sku: "PEN", qty: 2 }, { sku: "INK", qty: 1 }],
};

// Change the city
const relocated: Order = {
  ...order,
  customer: { ...order.customer, address: { ...order.customer.address, city: "Islamabad" } },
};

// Change the quantity of one line
const moreInk: Order = {
  ...order,
  lines: order.lines.map((line) => (line.sku === "INK" ? { ...line, qty: line.qty + 2 } : line)),
};

console.log(order.customer.address.city, relocated.customer.address.city);
console.log(order.lines[1]!.qty, moreInk.lines[1]!.qty);
console.log(order.lines[0] === moreInk.lines[0]);
```

**Output:**

```text
Lahore Islamabad
1 3
true
```

- To change the city, we copy the order, then the customer, then the address — three levels of spread — and change only `city`. Everything else is shared.
- To change one line, we `map` over the lines and return a **new** object only for the matching line; other lines are returned as they are. That is why the `PEN` line is still the same object (`true`).

This nesting becomes tiring for deep data. Two common solutions in real projects:

- **Keep data flat.** Instead of deeply nested objects, store related things by id in separate collections. This is called **normalising** state, and it is recommended for front-end state ({{ch:state-management}}).
- **Use a library such as Immer.** Immer lets you write code that *looks* like mutation on a temporary "draft", and produces a correct immutable copy with structural sharing behind the scenes. Redux Toolkit uses Immer internally.

### Freezing

For protection at **runtime**, JavaScript provides `Object.freeze`:

```ts
"use strict";
const settings = Object.freeze({ currency: "PKR", limits: { daily: 50000 } });

try {
  (settings as { currency: string }).currency = "USD";
} catch (error) {
  console.log((error as Error).constructor.name);
}

settings.limits.daily = 999999; // inner object is NOT frozen
console.log(settings.currency, settings.limits.daily);
```

**Output:**

```text
TypeError
PKR 999999
```

- `Object.freeze` makes an object's own properties unchangeable. In strict mode (which ES modules always use), trying to change one throws a `TypeError`. TypeScript also gives the frozen object read-only types, which is why we had to cast to try the change at all.
- But freezing is **shallow**: `settings.limits` is a separate object, and it was not frozen. Its `daily` property changed to 999,999.

So, in summary:

| Tool | Protects | When checked | Depth |
|---|---|---|---|
| `const` | The variable binding only | Compile and run time | — |
| `readonly`, `readonly T[]`, `Readonly<T>` | Properties and arrays | Compile time only | One level (each level must be marked) |
| `as const` | A literal value | Compile time only | Deep |
| `Object.freeze` | An object's own properties | Run time | Shallow |

In everyday TypeScript, `readonly` types plus the **habit** of immutable updates do most of the work. `Object.freeze` is useful for configuration objects and in development to catch accidental mutation.

## Higher-order functions and declarative code

> [!RECAP]
> In {{ch:arrays}} you used `map` (transform each element), `filter` (keep elements that pass a test) and `reduce` (combine all elements into one value). Each takes a function as an argument — they are higher-order functions.

The real benefit of these methods is a change of style, from **imperative** to **declarative**. Compare two ways to get the total value of paid orders over Rs 1,000:

```ts
type Order = { id: string; status: "paid" | "pending"; totalPaisa: number };

const orders: Order[] = [
  { id: "A", status: "paid", totalPaisa: 250000 },
  { id: "B", status: "pending", totalPaisa: 900000 },
  { id: "C", status: "paid", totalPaisa: 80000 },
  { id: "D", status: "paid", totalPaisa: 120000 },
];

// Imperative: how, step by step
let total1 = 0;
for (let i = 0; i < orders.length; i++) {
  const o = orders[i]!;
  if (o.status === "paid" && o.totalPaisa > 100000) {
    total1 += o.totalPaisa;
  }
}

// Declarative: what
const total2 = orders
  .filter((o) => o.status === "paid")
  .filter((o) => o.totalPaisa > 100000)
  .reduce((sum, o) => sum + o.totalPaisa, 0);

console.log(total1, total2);
```

**Output:**

```text
370000 370000
```

Both give the same answer. The imperative version is about **mechanics**: an index variable, a running total, a condition, an update. The declarative version reads almost like the requirement: *take the orders, keep the paid ones, keep the large ones, add up their totals.* There is no index to get wrong and no variable that changes. Each step is a small pure function that can be named, tested and reused:

```ts
// fragment
const isPaid = (o: Order) => o.status === "paid";
const isLarge = (o: Order) => o.totalPaisa > 100000;
const sumTotals = (sum: number, o: Order) => sum + o.totalPaisa;

const total = orders.filter(isPaid).filter(isLarge).reduce(sumTotals, 0);
```

> [!TIP]
> Declarative does not mean "always use `reduce`". A `reduce` with a complicated body is often harder to read than a plain `for...of` loop. The goal is clarity. Use `map` and `filter` freely; use `reduce` for simple sums, counts and groupings; use a loop when the logic genuinely needs steps.

## Composition: building functions from functions

### Level 2 — The idea

**Composition** connects functions so that the output of one is the input of the next. In mathematics it is written `f(g(x))`: first `g`, then `f`. If you have small functions that each do one thing, composition lets you build bigger behaviour without writing new logic.

### Level 3 — Writing `pipe`

Nesting calls such as `c(b(a(x)))` reads inside-out. A helper called `pipe` lets you list the steps in the order they happen:

```ts
function pipe<T>(...fns: Array<(value: T) => T>): (value: T) => T {
  return (input) => fns.reduce((value, fn) => fn(value), input);
}

const trim = (s: string) => s.trim();
const lower = (s: string) => s.toLowerCase();
const dashes = (s: string) => s.replace(/[^a-z0-9]+/g, "-");
const noEdgeDashes = (s: string) => s.replace(/^-+|-+$/g, "");

const slugify = pipe(trim, lower, dashes, noEdgeDashes);

console.log(slugify("  Summer Sale: 50% Off Kurtas!  "));
console.log(slugify("Men's Shoes & Sandals"));
```

**Output:**

```text
summer-sale-50-off-kurtas
men-s-shoes-sandals
```

Line by line:

- `pipe<T>(...fns)` takes any number of functions (the rest parameter `...fns`, from {{ch:functions}}), each from `T` to `T`. The `<T>` makes it **generic** ({{ch:typescript-advanced}}): it works for strings, numbers or anything else.
- It returns a **new function**. Nothing runs yet.
- When that function is called with `input`, `fns.reduce(...)` starts with `input` and passes it through each function in turn: the result of `trim` goes into `lower`, then into `dashes`, then into `noEdgeDashes`.
- Each step is tiny and obviously correct on its own. `dashes` uses a **regular expression** (a pattern for matching text): `[^a-z0-9]+` means "one or more characters that are not a lowercase letter or digit", and `/g` means "replace all matches". `^-+|-+$` matches dashes at the very start or end.
- `slugify` is defined **without mentioning its argument** — it is simply "these four steps in order". This is called **point-free style** ("point" is an old mathematical word for an argument). Use it when it reads well; avoid it when it makes code cryptic.

This simple `pipe` requires every step to take and return the same type. Libraries offer versions where each step can change the type (string → number → boolean), with dozens of overloads to keep TypeScript happy. There is also a proposal to add a pipe operator (`|>`) to JavaScript itself, but as of 2026 it is not part of the language.

`compose` is the same idea with the order reversed — `compose(f, g)(x)` means `f(g(x))` — matching mathematical notation. In everyday code, `pipe` is usually easier to read.

### Level 4 — A validation pipeline

Composition shines when you need a configurable list of rules. Here, each rule is a function that returns an error message or `null`:

```ts
type Rule = (value: string) => string | null;

const required: Rule = (v) => (v.trim() === "" ? "is required" : null);
const minLength =
  (n: number): Rule =>
  (v) =>
    v.length < n ? `must be at least ${n} characters` : null;
const matches =
  (pattern: RegExp, message: string): Rule =>
  (v) =>
    pattern.test(v) ? null : message;

const validate =
  (...rules: Rule[]) =>
  (value: string): string[] =>
    rules.map((rule) => rule(value)).filter((e): e is string => e !== null);

const passwordRules = validate(required, minLength(10), matches(/[0-9]/, "must contain a digit"));

console.log(passwordRules(""));
console.log(passwordRules("sunshine"));
console.log(passwordRules("sunshine2026!"));
```

**Output:**

```text
[
  'is required',
  'must be at least 10 characters',
  'must contain a digit'
]
[ 'must be at least 10 characters', 'must contain a digit' ]
[]
```

- `Rule` is a function type: string in, message or `null` out.
- `minLength(10)` is a function that **returns a rule**. Calling `minLength` with 10 "configures" a rule that remembers `n = 10` in its closure. `matches` works the same way. Functions that create configured functions are sometimes called **function factories**.
- `validate(...rules)` returns a function that runs every rule on a value and keeps only the messages. The filter `(e): e is string => e !== null` is a **type predicate** ({{ch:typescript-advanced}}): it tells TypeScript that the filtered array contains only strings.
- `passwordRules` is assembled from parts. A different form field — a username, a phone number — gets a different list, built from the same small rules. No class, no `if` chain, and every rule can be tested alone.

This is essentially how popular validation libraries are designed. You will use one in {{ch:validation}}.

## Currying and partial application

### Partial application

**Partial application** means fixing some arguments of a function now, and supplying the rest later. You already did it with `minLength(10)`. JavaScript's built-in `bind` can also do it, but an arrow function is usually clearer:

```ts
const formatMoney = (currency: string, decimals: number, paisa: number): string =>
  `${currency} ${(paisa / 100).toFixed(decimals)}`;

const formatPkr = (paisa: number) => formatMoney("Rs", 0, paisa);
const formatPkrExact = (paisa: number) => formatMoney("PKR", 2, paisa);

console.log([150000, 99950].map(formatPkr));
console.log([150000, 99950].map(formatPkrExact));
```

**Output:**

```text
[ 'Rs 1500', 'Rs 1000' ]
[ 'PKR 1500.00', 'PKR 999.50' ]
```

`formatPkr` is `formatMoney` with the first two arguments fixed. Because it now takes exactly one argument, it can be passed directly to `map`. (Notice `99950` paisa is Rs 999.50, which rounds to `1000` with zero decimals — `toFixed` rounds.)

### Currying

**Currying** — named after the logician Haskell Curry — transforms a function that takes several arguments into a chain of functions that each take **one**:

```ts
const add3 = (a: number, b: number, c: number) => a + b + c;        // normal
const add3Curried = (a: number) => (b: number) => (c: number) => a + b + c;  // curried

const addTen = add3Curried(10);
const addTenAndFive = addTen(5);
console.log(add3(10, 5, 1), add3Curried(10)(5)(1), addTenAndFive(1));
```

**Output:**

```text
16 16 16
```

The curried version makes partial application automatic: every call that supplies fewer than all arguments returns a function waiting for the rest.

**When it helps:** in languages such as Haskell and F#, every function is curried, and the whole style is built around it. In JavaScript and TypeScript, heavy currying is less common: it makes stack traces and type errors harder to read, and colleagues may find `f(a)(b)(c)` unusual. A good rule: write **configurable function factories** (like `minLength(n)`) where they make code clearer, and do not curry everything by default.

The difference, in one line each:

- **Partial application:** fix *some* arguments now, get a function for the rest.
- **Currying:** turn a many-argument function into a chain of one-argument functions, so partial application happens naturally.

## Handling absence and failure without surprises

Two things make functions hard to compose: values that might be **missing**, and operations that might **fail**. Functional programming handles both by making them **part of the return value**, so they cannot be ignored.

### Missing values

> [!RECAP]
> In {{ch:types-of-data}} and {{ch:typescript-basics}} you met `undefined`, `null`, optional chaining `?.` and nullish coalescing `??`, and you saw TypeScript force you to check for `undefined` before using a value.

Modern JavaScript and TypeScript already handle missing values well:

```ts
type Customer = { name: string; address?: { city?: string } };

const cityLabel = (c: Customer | undefined): string => c?.address?.city?.toUpperCase() ?? "UNKNOWN";

console.log(cityLabel({ name: "Ali", address: { city: "Quetta" } }));
console.log(cityLabel({ name: "Sara" }));
console.log(cityLabel(undefined));
```

**Output:**

```text
QUETTA
UNKNOWN
UNKNOWN
```

`?.` stops and returns `undefined` as soon as anything in the chain is missing; `??` supplies a default. Combined with TypeScript's strict null checks, `T | undefined` plays the role that languages like Haskell and Rust give to a dedicated **`Maybe`** or **`Option`** type: a value that is either "some value" or "nothing", where the compiler forces you to handle both. You will see older JavaScript libraries build `Maybe` classes with `map` methods; in TypeScript today, `T | undefined` with `?.` and `??` is usually simpler and idiomatic.

### Failure: the `Result` type

Exceptions ({{ch:errors-and-debugging}}) are invisible in a function's type. A function typed `(input: string) => number` might throw, and nothing tells the caller. For **expected** failures — invalid input, a product out of stock — many functional codebases return a **`Result`** instead:

```ts
type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
const fail = <E>(error: E): Result<never, E> => ({ ok: false, error });

function parseQuantity(input: string): Result<number, string> {
  const n = Number(input);
  if (!Number.isInteger(n)) return fail(`"${input}" is not a whole number`);
  if (n < 1 || n > 10) return fail(`quantity must be between 1 and 10, got ${n}`);
  return ok(n);
}

function reserveStock(qty: number, inStock: number): Result<number, string> {
  return qty <= inStock ? ok(inStock - qty) : fail(`only ${inStock} left`);
}

function andThen<T, U, E>(r: Result<T, E>, next: (value: T) => Result<U, E>): Result<U, E> {
  return r.ok ? next(r.value) : r;
}

for (const input of ["3", "abc", "12", "8"]) {
  const outcome = andThen(parseQuantity(input), (qty) => reserveStock(qty, 5));
  console.log(input, "->", outcome.ok ? `ok, ${outcome.value} left` : `error: ${outcome.error}`);
}
```

**Output:**

```text
3 -> ok, 2 left
abc -> error: "abc" is not a whole number
12 -> error: quantity must be between 1 and 10, got 12
8 -> error: only 5 left
```

Walk through it:

- `Result<T, E>` is a **discriminated union** ({{ch:typescript-advanced}}): either `{ ok: true, value }` or `{ ok: false, error }`. To read `value`, TypeScript forces you to check `ok` first. A forgotten error case becomes a compile error, not a crash in production.
- `ok` and `fail` are small helpers that build each case. `never` means "this side cannot happen here"; it fits into any `Result`.
- `parseQuantity` and `reserveStock` are **pure**: they never throw; failure is just a different return value.
- `andThen` **chains** two steps: if the first succeeded, run the next step on its value; if it failed, pass the failure along untouched. Each failure stops the chain at the right place, and the error explains why. Functional programmers call this operation `flatMap`, `bind` or `chain`.
- `Number("abc")` is `NaN`, which is not an integer, so the first check catches it.

When to use which:

- **Exceptions** for unexpected, programmer-level failures — a bug, a lost database connection — that the immediate caller cannot handle anyway.
- **`Result`** for expected outcomes that callers **must** handle — validation failures, business rules, "not found".

Many teams mix the two exactly this way. Libraries such as `neverthrow` and Effect offer complete `Result` types with many helpers, if a project wants to go further.

> [!SENIOR]
> If you have read about **functors** and **monads**, this is where they live. A *functor* is anything with a `map` that applies a function inside a container (arrays, `Result`, promises). A *monad* adds a way to chain steps that themselves return containers (`andThen`/`flatMap`; `then` on promises behaves similarly). You do not need the vocabulary to use the ideas — you have been using them since {{ch:asynchronous-javascript}} — but it helps when reading functional-programming material.

## Reducers: state as a series of values

### Level 1 — The idea

Earlier you saw that immutable data never changes. But programs **do** have state that changes over time: a shopping cart fills up, a form is edited. How does a functional program handle that?

By modelling change as a **sequence of values**. Each event produces a new state from the old one:

```text
  state0 ──(add pen)──▶ state1 ──(add ink)──▶ state2 ──(remove pen)──▶ state3
```

The function that computes the next state is called a **reducer**: `(state, action) => newState`. It is pure. The name comes from `reduce`: if you have a list of actions, `actions.reduce(reducer, initialState)` replays them all to get the current state.

### Level 3 — A cart reducer

```ts
type CartState = { readonly items: Readonly<Record<string, number>>; readonly coupon: string | null };

type CartAction =
  | { type: "add"; sku: string }
  | { type: "remove"; sku: string }
  | { type: "applyCoupon"; code: string }
  | { type: "clear" };

const initialCart: CartState = { items: {}, coupon: null };

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "add":
      return { ...state, items: { ...state.items, [action.sku]: (state.items[action.sku] ?? 0) + 1 } };
    case "remove": {
      const { [action.sku]: _removed, ...rest } = state.items;
      return { ...state, items: rest };
    }
    case "applyCoupon":
      return { ...state, coupon: action.code.toUpperCase() };
    case "clear":
      return initialCart;
  }
}

const actions: CartAction[] = [
  { type: "add", sku: "PEN" },
  { type: "add", sku: "INK" },
  { type: "add", sku: "PEN" },
  { type: "applyCoupon", code: "eid10" },
  { type: "remove", sku: "INK" },
];

const history = actions.reduce<CartState[]>((states, action) => [...states, cartReducer(states.at(-1)!, action)], [initialCart]);

for (const [i, s] of history.entries()) {
  console.log(i, JSON.stringify(s));
}
```

**Output:**

```text
0 {"items":{},"coupon":null}
1 {"items":{"PEN":1},"coupon":null}
2 {"items":{"PEN":1,"INK":1},"coupon":null}
3 {"items":{"PEN":2,"INK":1},"coupon":null}
4 {"items":{"PEN":2,"INK":1},"coupon":"EID10"}
5 {"items":{"PEN":2},"coupon":"EID10"}
```

Line by line:

- `CartState` is read-only. `Record<string, number>` is an object whose keys are SKUs and whose values are quantities.
- `CartAction` is a discriminated union of everything that can happen to a cart. Each action is a plain data object describing an event.
- In `"add"`, `{ ...state.items, [action.sku]: ... }` copies the items and sets one key. `[action.sku]` in square brackets is a **computed property name**: the key is the value of `action.sku`. `?? 0` handles an item that is not in the cart yet.
- In `"remove"`, `const { [action.sku]: _removed, ...rest } = state.items;` uses **destructuring with a rest element** to split the object: the property named by `action.sku` goes into `_removed` (unused, hence the underscore), and **all other** properties go into a new object `rest`. It is the immutable way to delete a key.
- The `case` with braces `{ ... }` creates a block, needed because we declare constants inside a `case`.
- `"clear"` returns the initial state. Because states are never mutated, sharing `initialCart` is perfectly safe.
- At the bottom, `reduce` replays every action and keeps **every** intermediate state in `history`. `states.at(-1)!` reads the last state (`at(-1)` means "last element"). Because the states are immutable, each snapshot is preserved exactly — the old states were never changed by later actions.

### Level 4 — Why this matters in real applications

That last point is powerful. Because each state is a separate immutable value:

- **Undo** is trivial: go back to the previous state in the history.
- **Debugging** is easier: log every action and state, and you can see exactly how the program got where it is. Redux DevTools does this for front-end apps and lets you step back and forth through history ("time-travel debugging").
- **Testing** is easy: a reducer is a pure function. Give it a state and an action; check the result.
- **Change detection** is cheap: to know whether something changed, compare references with `===`. If the reference is the same, nothing inside changed — because nothing is ever mutated. React relies on exactly this to decide what to re-render ({{ch:react-advanced}}).

This pattern is React's `useReducer`, the core of Redux ({{ch:state-management}}), and, at a much larger scale, the idea behind **event sourcing**, where a system stores the list of events rather than only the current state ({{ch:event-driven-systems}}).

## Memoization

Because a pure function always gives the same output for the same input, you can **remember** results and skip the work next time. This is called **memoization**.

```ts
function memoize<A, R>(fn: (arg: A) => R): (arg: A) => R {
  const cache = new Map<A, R>();
  return (arg) => {
    if (cache.has(arg)) return cache.get(arg)!;
    const result = fn(arg);
    cache.set(arg, result);
    return result;
  };
}

let calls = 0;
const slowShippingQuote = (city: string): number => {
  calls++;
  // Imagine an expensive calculation here.
  return city.length * 1000;
};

const quote = memoize(slowShippingQuote);
console.log(quote("Lahore"), quote("Lahore"), quote("Karachi"), quote("Lahore"));
console.log(`real calculations: ${calls}`);
```

**Output:**

```text
6000 6000 7000 6000
real calculations: 2
```

- `memoize` is a higher-order function: it takes a function and returns a new one with a `Map` cache in its closure.
- The first call for each city runs the real function and stores the result; later calls return the stored result.
- `calls` is a deliberate side effect, only so we can count real calculations. The memoized function is called four times, but the real work runs twice.

Important limits:

- Memoize **only pure functions**. Memoizing a function that reads the clock or a database would return stale answers.
- The cache **grows forever** in this simple version — a memory leak in a long-running server. Real caches limit their size or expire entries (you will build an LRU cache — "least recently used" — later, and study caching properly in {{ch:caching}}).
- With object arguments, `Map` compares by reference, so two equal-looking objects are different keys.

React's `useMemo` and memoized selectors in state libraries are this same idea.

## Laziness

Methods like `map` and `filter` are **eager**: each one processes the whole array immediately and creates a new array. For small arrays that is fine. For huge or infinite sequences, it is wasteful or impossible.

> [!RECAP]
> In {{ch:advanced-javascript}} you met **generators** (`function*`), which produce values one at a time, only when asked.

Generators let you build **lazy** pipelines, which do work only for the values that are actually needed:

```ts
function* naturals(): Generator<number> {
  let n = 1;
  while (true) yield n++;
}

function* lazyMap<T, U>(source: Iterable<T>, fn: (x: T) => U): Generator<U> {
  for (const x of source) yield fn(x);
}

function* lazyFilter<T>(source: Iterable<T>, keep: (x: T) => boolean): Generator<T> {
  for (const x of source) if (keep(x)) yield x;
}

function* take<T>(source: Iterable<T>, count: number): Generator<T> {
  if (count <= 0) return;
  for (const x of source) {
    yield x;
    if (--count === 0) return;
  }
}

let examined = 0;
const firstFive = take(
  lazyFilter(
    lazyMap(naturals(), (n) => {
      examined++;
      return n * n;
    }),
    (sq) => sq % 3 === 1,
  ),
  5,
);

console.log([...firstFive], `examined ${examined} numbers`);
```

**Output:**

```text
[ 1, 4, 16, 25, 49 ] examined 7 numbers
```

- `naturals()` is an **infinite** sequence: 1, 2, 3, … forever. An eager array version would never finish.
- `lazyMap`, `lazyFilter` and `take` each pull values from their source **one at a time**, only when the next stage asks.
- `[...firstFive]` asks for values until `take` stops after five. Only seven natural numbers were ever examined: 1, 2, 3, 4, 5, 6, 7 give squares 1, 4, 9, 16, 25, 36, 49; of those, 9 and 36 are divisible by 3 and are filtered out.

Laziness is the idea behind streaming large files line by line in Node.js ({{ch:nodejs}}) and behind iterator helper methods (`.map`, `.filter`, `.take` directly on iterators), which were added to JavaScript in 2025 and are available in current Node.js versions.

## The functional core and the imperative shell

### Level 4 — Structuring a real program

A real program must read input, call databases and send emails. Those are side effects. The most useful functional idea for everyday work is to **separate** them from the logic:

```text
   ┌───────────────────── imperative shell ─────────────────────┐
   │ read request, load data from DB, read clock                │
   │            │                                               │
   │            ▼                                               │
   │   ┌──────── functional core (pure) ────────┐               │
   │   │ decide, calculate, validate, transform  │               │
   │   │ data in ──────────────▶ decision out    │               │
   │   └─────────────────────────────────────────┘               │
   │            │                                               │
   │            ▼                                               │
   │ save to DB, send email, write response                     │
   └────────────────────────────────────────────────────────────┘
```

The **shell** is thin and does all the impure work. The **core** contains the decisions and is entirely pure. (The phrase "functional core, imperative shell" comes from a talk by Gary Bernhardt, and is now widely used.)

Here is a late-fee calculator for a library, written that way:

```ts
// ---------- functional core: pure ----------
type Loan = { memberId: string; bookTitle: string; dueDate: string };
type Notice = { memberId: string; message: string; feePaisa: number };

const DAY_MS = 24 * 60 * 60 * 1000;

const daysLate = (dueDate: string, today: Date): number =>
  Math.max(0, Math.floor((today.getTime() - new Date(dueDate).getTime()) / DAY_MS));

const feeFor = (days: number): number => Math.min(days * 2000, 50000);

const noticesFor = (loans: readonly Loan[], today: Date): Notice[] =>
  loans
    .map((loan) => ({ loan, days: daysLate(loan.dueDate, today) }))
    .filter(({ days }) => days > 0)
    .map(({ loan, days }) => ({
      memberId: loan.memberId,
      feePaisa: feeFor(days),
      message: `"${loan.bookTitle}" is ${days} day(s) late. Fee: Rs ${feeFor(days) / 100}.`,
    }));

// ---------- imperative shell: impure ----------
async function loadLoans(): Promise<Loan[]> {
  // In a real system: a database query.
  return [
    { memberId: "M1", bookTitle: "Clean Code", dueDate: "2026-03-01" },
    { memberId: "M2", bookTitle: "SQL Basics", dueDate: "2026-03-20" },
    { memberId: "M3", bookTitle: "Networks", dueDate: "2025-12-01" },
  ];
}

async function sendNotice(notice: Notice): Promise<void> {
  // In a real system: an email or SMS.
  console.log(`to ${notice.memberId}: ${notice.message}`);
}

async function runDailyJob(): Promise<void> {
  const loans = await loadLoans();
  const today = new Date("2026-03-11T09:00:00Z"); // in production: new Date()
  for (const notice of noticesFor(loans, today)) {
    await sendNotice(notice);
  }
}

await runDailyJob();
```

**Output:**

```text
to M1: "Clean Code" is 10 day(s) late. Fee: Rs 200.
to M3: "Networks" is 100 day(s) late. Fee: Rs 500.
```

Walk through the design:

- **The core** — `daysLate`, `feeFor` and `noticesFor` — takes plain data and the current date as **parameters** and returns plain data. It never reads the clock, never touches a database, never sends anything. All the business rules (how late, how much, maximum fee of Rs 500, the wording) live here.
- **The shell** — `loadLoans`, `sendNotice` and `runDailyJob` — does the impure work: loading, reading the clock, sending. It contains almost no decisions.
- `new Date("2026-03-11T09:00:00Z")` fixes "today" so the example's output is stable. In production, the shell would pass `new Date()`. Because the core receives `today` as a parameter, you can test any date — a leap year, the last day of a month — without waiting for it or faking the system clock.
- `Math.min(days * 2000, 50000)` caps the fee: M3 is 100 days late, which would be Rs 2,000, but the cap is Rs 500.
- M2's due date (20 March) is after "today" (11 March), so `daysLate` returns 0 and the filter removes it.

The payoff: the part most likely to have bugs — the business rules — is the part easiest to test. The shell is so simple there is little to get wrong. This structure works equally well inside object-oriented code: an `OrderService` class can be the shell around pure pricing functions.

## From beginner to enterprise

**Level 3 — single functions.** Write small pure helpers; use `map`, `filter`, spread and `toSorted`; never mutate inputs.

**Level 4 — application structure.** Keep business rules in pure modules (`pricing.ts`, `eligibility.ts`). Keep I/O in thin services and controllers. Use reducers for complex UI state. Use `Result` for expected failures at module boundaries.

**Level 5 — team practice.** Teams agree on rules such as "no mutation of function parameters" and enforce them with lint rules (for example, ESLint rules that flag parameter reassignment or array mutation). They choose a consistent error strategy (exceptions or `Result`) per layer. They avoid clever point-free code that only one person can read.

**Level 6 — large scale.** The same ideas scale up. **Event sourcing** stores every event and computes current state by reducing over them. Big-data frameworks such as Apache Spark run `map`, `filter` and `reduce`-style transformations across clusters of machines; this works because the transformation functions are pure, so they can run anywhere, in any order, and be retried after a failure. Message-processing systems rely on **idempotent** handlers — handlers that can safely run twice with the same effect — a property much easier to achieve when the core logic is pure ({{ch:distributed-systems}}).

## Real-world use cases

### Pricing rules in an online shop

- **Problem:** prices depend on product, customer tier, coupons, bulk quantity and taxes. Bugs cost real money, and finance must be able to audit any price.
- **Solution:** a pure function `price(cart, customer, rules, date) → breakdown`, composed from small steps (`applyTierDiscount`, `applyCoupon`, `addTax`). The service around it loads data and saves results.
- **Why it works:** the same inputs always produce the same price, so any disputed price can be **recomputed exactly** later, and thousands of test cases run in milliseconds.
- **Limits:** the inputs (especially the date and the rule set) must also be recorded, or the price cannot be reproduced.

### Front-end state with reducers

- **Problem:** a complex form or dashboard with many interacting pieces of state, edited by many events.
- **Solution:** a reducer per area of state; components dispatch actions; React re-renders when references change.
- **Cons:** for simple state, reducers add ceremony. A single `useState` is often enough ({{ch:react-basics}}).

### Data transformation scripts

- **Problem:** convert a daily export of 200,000 orders into a summary report.
- **Solution:** a pipeline: parse → filter → group → summarise → format. Each stage is a pure function, tested on a few sample rows.
- **Failure scenario:** loading all rows into memory and creating several intermediate arrays may run out of memory for very large files. Fix: stream the file and process it lazily, row by row.

## Common mistakes

### Beginner: thinking `const` means immutable

Shown earlier: `const` stops reassignment, not mutation. Use `readonly` types and immutable updates.

### Beginner: mutating with `sort` and `reverse`

```ts
const prices = [500, 100, 300];

function cheapestFirst(list: number[]): number[] {
  return list.sort((a, b) => a - b); // sorts the caller's array in place!
}

const cheap = cheapestFirst(prices);
console.log(prices, cheap === prices);
```

**Output:**

```text
[ 100, 300, 500 ] true
```

- **Why it happens:** `sort` both sorts the array **in place** and returns it, so it looks like a pure function.
- **Consequence:** the caller's data is reordered. In React, mutating state like this means the screen does not update, because the array reference did not change.
- **Fix:** `list.toSorted(...)` or `[...list].sort(...)`, and type parameters as `readonly number[]` so the compiler rejects `sort` on them.

### Intermediate: shallow copies of nested data

```ts
// fragment
const copy = { ...order };
copy.customer.address.city = "Multan"; // also changes order.customer.address.city!
```

Spread copies one level. Changing a nested object through the copy changes the original too. Copy every level on the path you change (as shown earlier), or use Immer. For a complete independent copy of plain data, `structuredClone(value)` creates a **deep** copy — but deep-copying everything is slow for large data and unnecessary when you update immutably.

### Intermediate: hidden side effects inside `map`

```ts
// fragment
const emails = users.map((u) => {
  sendWelcomeEmail(u); // a side effect hidden in a "transformation"
  return u.email;
});
```

Readers expect `map` to transform, not to act. Side effects belong in a `for...of` loop or `forEach`, where they are clearly visible. Also, if someone later makes this pipeline lazy or memoized, the emails might be sent zero times or several times.

### Intermediate: `reduce` for everything

A `reduce` that builds a complex object with nested conditions and spreads inside a loop is often unreadable — and spreading the accumulator on every step (`{ ...acc, [key]: ... }`) copies it each time, which is O(n²) for large inputs. Use `Object.groupBy` (available since ES2024), a `Map`, or a plain loop with a local variable. **Local** mutation inside a function that never escapes is perfectly compatible with the function being pure from the outside.

### Production: memoizing impure functions

Memoizing `getExchangeRate(currency)` returns yesterday's rate forever. Memoize only pure functions, or use a cache with expiry ({{ch:caching}}).

### Enterprise: pure-in-name-only cores

A "core" function that calls `new Date()`, `Math.random()` or reads environment variables deep inside is not pure, and its tests become flaky — passing or failing depending on the day. Pass time, randomness and configuration in as parameters.

## Debugging and troubleshooting

**Symptom: data changes "by itself".** Something mutated a shared object. To find it: freeze the object in development (`Object.freeze`, or a deep-freeze helper) — the code that tries to modify it will throw a `TypeError` with a stack trace pointing to the culprit. Then replace that mutation with an immutable update.

**Symptom: the UI does not update after state changes (React).** The state was mutated in place, so the reference stayed the same and React saw "no change". Fix: return a new object or array from the update.

**Symptom: a pipeline gives the wrong result, and you do not know which step.** Insert a pass-through logging step:

```ts
const tap =
  <T>(label: string) =>
  (value: T): T => {
    console.log(`[${label}]`, value);
    return value;
  };

const result = [5, 12, 8, 21]
  .filter((n) => n > 6)
  .map(tap("after filter"))
  .map((n) => n * 2);
console.log(result);
```

**Output:**

```text
[after filter] 12
[after filter] 8
[after filter] 21
[ 24, 16, 42 ]
```

`tap` logs a value and returns it unchanged, so it can be dropped into any pipeline without changing the result.

**Symptom: "Maximum call stack size exceeded" in recursive functional code.** Purely functional languages use recursion instead of loops, and optimise it. JavaScript engines (except Safari's) do **not** implement tail-call optimisation, so deep recursion overflows the stack ({{ch:recursion-sorting-searching}}). Use a loop or `reduce` for long sequences.

## Performance and trade-offs

- **Copying costs.** Each immutable update allocates new objects, which costs time and creates work for the garbage collector. With structural sharing (copying only the changed path), this is small for typical application data. In very hot code — a game loop, processing millions of rows — local mutation can be much faster. A function can mutate **its own local** variables freely and still be pure from the outside.
- **Chained array methods** create intermediate arrays. For thousands of items this does not matter; for millions, one loop or a lazy pipeline is better.
- **Readability is a trade-off too.** Deeply curried, point-free code can be compact and correct, yet hard for a team to maintain. Clarity beats cleverness.

## How a senior engineer thinks about this

Senior engineers rarely ask "OOP or FP?". They use both, each where it fits:

- **Pure functions for decisions and calculations** — pricing, validation, permission checks, data transformation.
- **Immutable data by default**, especially for anything shared or stored in UI state.
- **Objects where state must be guarded over time** — a connection pool, a cache, an entity with a life cycle — and for framework integration (NestJS services are classes).
- **Side effects at the edges**, in thin, obvious places.

They also ask: *will a teammate understand this in six months?* Functional techniques that make code shorter but less obvious are not a win.

## Exercises

### Exercise 1 — Make it pure

**Objective:** practise identifying and removing side effects.
**Starting point:**

```ts
// fragment
let discountPercent = 10;
const log: string[] = [];

function finalPrice(item: { pricePaisa: number; qty: number }): number {
  item.pricePaisa = item.pricePaisa - (item.pricePaisa * discountPercent) / 100;
  log.push(`priced item at ${item.pricePaisa}`);
  return Math.round(item.pricePaisa * item.qty);
}
```

**What to build:** list every reason `finalPrice` is impure, then rewrite it as a pure function that returns both the price and the log message. Show that calling it twice with the same input gives the same result.

<details>
<summary>Show the solution</summary>

**Why it is impure:** (1) it reads `discountPercent`, which lives outside and can change; (2) it **modifies its input** `item`, so calling it twice discounts twice; (3) it pushes to the outside `log` array.

```ts
type Item = { readonly pricePaisa: number; readonly qty: number };

function finalPrice(item: Item, discountPercent: number): { totalPaisa: number; message: string } {
  const unitPaisa = item.pricePaisa - (item.pricePaisa * discountPercent) / 100;
  return {
    totalPaisa: Math.round(unitPaisa * item.qty),
    message: `priced item at ${unitPaisa}`,
  };
}

const item: Item = { pricePaisa: 25000, qty: 3 };
console.log(finalPrice(item, 10));
console.log(finalPrice(item, 10));
console.log(item);
```

**Output:**

```text
{ totalPaisa: 67500, message: 'priced item at 22500' }
{ totalPaisa: 67500, message: 'priced item at 22500' }
{ pricePaisa: 25000, qty: 3 }
```

**Walkthrough:** the discount is now a parameter; the new unit price is a local constant, not a change to `item`; the log message is **returned** rather than pushed somewhere. The caller (the shell) decides whether to write the message to a log. Two identical calls give identical results, and `item` is unchanged. `readonly` on `Item` makes the compiler reject any attempt to assign to `item.pricePaisa`.

**Common wrong approach:** copying the item (`const copy = { ...item }`) and mutating the copy, while still reading the global discount and pushing to the global log — that fixes only one of the three problems.

</details>

### Exercise 2 — Group and summarise immutably

**Objective:** practise declarative data transformation.
**Starting point:** a list of sales: `{ region: string; amountPaisa: number }[]`.
**What to build:** a pure function `summaryByRegion(sales)` that returns an array of `{ region, count, totalPaisa }` sorted by total, largest first, without mutating the input.
**Hints:** `Object.groupBy` (ES2024) groups an array into an object of arrays; if your Node version lacks it, build a `Map` in a loop. `Object.entries` turns an object into `[key, value]` pairs.

<details>
<summary>Show the solution</summary>

```ts
type Sale = { readonly region: string; readonly amountPaisa: number };
type Summary = { region: string; count: number; totalPaisa: number };

function summaryByRegion(sales: readonly Sale[]): Summary[] {
  const groups = new Map<string, Sale[]>();
  for (const sale of sales) {
    const list = groups.get(sale.region) ?? [];
    list.push(sale);
    groups.set(sale.region, list);
  }
  return [...groups.entries()]
    .map(([region, list]) => ({
      region,
      count: list.length,
      totalPaisa: list.reduce((sum, s) => sum + s.amountPaisa, 0),
    }))
    .toSorted((a, b) => b.totalPaisa - a.totalPaisa);
}

const sales: Sale[] = [
  { region: "Punjab", amountPaisa: 120000 },
  { region: "Sindh", amountPaisa: 300000 },
  { region: "Punjab", amountPaisa: 250000 },
  { region: "KP", amountPaisa: 90000 },
];

console.log(summaryByRegion(sales));
console.log(sales.length, sales[0]!.region);
```

**Output:**

```text
[
  { region: 'Punjab', count: 2, totalPaisa: 370000 },
  { region: 'Sindh', count: 1, totalPaisa: 300000 },
  { region: 'KP', count: 1, totalPaisa: 90000 }
]
4 Punjab
```

**Walkthrough:** the grouping loop mutates a `Map` — but that `Map` is **local** and never escapes, so `summaryByRegion` is still pure from the outside. This is a deliberate, sensible choice: it is clearer and faster than spreading an accumulator object on every step. The rest is declarative: turn the map into entries, map each group to a summary, and sort into a new array with `toSorted`. The input array is unchanged.

**Common wrong approach:** `reduce((acc, s) => ({ ...acc, [s.region]: [...(acc[s.region] ?? []), s] }), {})` — correct, but it copies the whole accumulator for every sale, which is O(n²) and hard to read.

</details>

### Exercise 3 — A to-do reducer with undo

**Objective:** practise reducers and the benefit of immutable history.
**What to build:** a reducer for a to-do list with actions `add` (with text), `toggle` (by id) and `delete` (by id). Then build a small wrapper state `{ past: State[]; present: State }` with an extra action `undo` that restores the previous state.
**Hints:** ids can be generated from a counter stored in the state, so the reducer stays pure (do not call `Math.random()` or `Date.now()` inside it).

<details>
<summary>Show the solution</summary>

```ts
type Todo = { readonly id: number; readonly text: string; readonly done: boolean };
type State = { readonly todos: readonly Todo[]; readonly nextId: number };
type Action = { type: "add"; text: string } | { type: "toggle"; id: number } | { type: "delete"; id: number };

function todoReducer(state: State, action: Action): State {
  switch (action.type) {
    case "add":
      return { nextId: state.nextId + 1, todos: [...state.todos, { id: state.nextId, text: action.text, done: false }] };
    case "toggle":
      return { ...state, todos: state.todos.map((t) => (t.id === action.id ? { ...t, done: !t.done } : t)) };
    case "delete":
      return { ...state, todos: state.todos.filter((t) => t.id !== action.id) };
  }
}

type History = { readonly past: readonly State[]; readonly present: State };
type HistoryAction = Action | { type: "undo" };

function withUndo(history: History, action: HistoryAction): History {
  if (action.type === "undo") {
    const previous = history.past.at(-1);
    return previous ? { past: history.past.slice(0, -1), present: previous } : history;
  }
  return { past: [...history.past, history.present], present: todoReducer(history.present, action) };
}

const show = (h: History) => h.present.todos.map((t) => `${t.done ? "[x]" : "[ ]"} ${t.text}`).join(", ");

let h: History = { past: [], present: { todos: [], nextId: 1 } };
const steps: HistoryAction[] = [
  { type: "add", text: "buy milk" },
  { type: "add", text: "pay bill" },
  { type: "toggle", id: 1 },
  { type: "delete", id: 2 },
  { type: "undo" },
  { type: "undo" },
];
for (const step of steps) {
  h = withUndo(h, step);
  console.log(step.type.padEnd(6), "->", show(h));
}
```

**Output:**

```text
add    -> [ ] buy milk
add    -> [ ] buy milk, [ ] pay bill
toggle -> [x] buy milk, [ ] pay bill
delete -> [x] buy milk
undo   -> [x] buy milk, [ ] pay bill
undo   -> [ ] buy milk, [ ] pay bill
```

**Walkthrough:** `todoReducer` is pure: the next id comes from the state, not from a random number or the clock. `withUndo` wraps any reducer: before applying an action, it pushes the current state onto `past`; on `undo`, it pops the last state back. This works **only** because states are immutable — if `toggle` had mutated a todo, the "past" state would have changed too, and undo would restore the wrong thing. The single `let h` in the driver code is the imperative shell holding the current value.

**Common wrong approach:** storing `past` by pushing to a shared array (`history.past.push(...)`) — that mutates the previous history value and breaks the "every state is a snapshot" guarantee.

</details>

### Exercise 4 — Production scenario: test the untestable

**Objective:** apply "functional core, imperative shell" to a real problem.
**The scenario:** this function decides whether to show a "flash sale" banner. It is hard to test because it reads the clock and a global config:

```ts
// fragment
const config = { saleStartHour: 20, saleEndHour: 23, enabled: true };

function shouldShowBanner(userCountry: string): boolean {
  const hour = new Date().getHours();
  return config.enabled && userCountry === "PK" && hour >= config.saleStartHour && hour < config.saleEndHour;
}
```

**What to build:** a pure version, plus a few test-style checks (just `console.log` of `true`/`false`) for the edges: 19:59, 20:00, 22:59, 23:00, and a non-PK user.

<details>
<summary>Show the solution</summary>

```ts
type SaleConfig = { readonly saleStartHour: number; readonly saleEndHour: number; readonly enabled: boolean };

const shouldShowBanner = (config: SaleConfig, userCountry: string, now: Date): boolean => {
  const hour = now.getHours();
  return config.enabled && userCountry === "PK" && hour >= config.saleStartHour && hour < config.saleEndHour;
};

const cfg: SaleConfig = { saleStartHour: 20, saleEndHour: 23, enabled: true };
const at = (h: number, m: number) => new Date(2026, 5, 1, h, m);

console.log(
  shouldShowBanner(cfg, "PK", at(19, 59)),
  shouldShowBanner(cfg, "PK", at(20, 0)),
  shouldShowBanner(cfg, "PK", at(22, 59)),
  shouldShowBanner(cfg, "PK", at(23, 0)),
  shouldShowBanner(cfg, "AE", at(21, 0)),
  shouldShowBanner({ ...cfg, enabled: false }, "PK", at(21, 0)),
);
```

**Output:**

```text
false true true false false false
```

**Walkthrough:** the clock and configuration are now parameters. Each edge case is one line, runs instantly and gives the same result on any day of the year. In production, the shell calls `shouldShowBanner(loadConfig(), user.country, new Date())`. `new Date(2026, 5, 1, h, m)` creates a local date-time on 1 June 2026 at the given hour and minute (month 5 is June).

**A real-world note:** `getHours()` uses the **server's** time zone. If the server runs in UTC but the sale is in Pakistan time, the banner shows at the wrong hours. Making time a parameter makes this bug *visible* — you can now write a test for it — and the proper fix is to convert to the right time zone explicitly in the shell or the core.

</details>

## Summary

Functional programming avoids the bugs of shared mutable state by making **pure functions** and **immutable data** the default. A pure function's result depends only on its arguments, and it changes nothing; such functions are easy to test, reuse, cache and reason about. Make impure functions pure by passing their hidden inputs (time, configuration) as parameters and **returning** results instead of changing things.

Immutable updates use spread, `map`, `filter` and the ES2023 methods `toSorted`, `toReversed` and `with`; spread is **shallow**, so nested updates must copy each level on the path. `const`, `readonly` and `Object.freeze` each protect something different. **Higher-order functions**, **composition** with `pipe`, **partial application** and function factories build behaviour from small parts. **Optional chaining** and a **`Result`** type make absence and expected failure visible in types. **Reducers** model changing state as a series of immutable values, which makes undo, debugging and change detection simple. **Memoization** and **laziness** are performance techniques that rely on purity. In real programs, keep a **functional core** of pure decisions inside a thin **imperative shell** that does the input and output — and mix functional and object-oriented styles where each fits.

## Key terms

- **Functional programming (FP)** — A programming paradigm that builds programs from pure functions and immutable data, keeping side effects separate.
- **Pure function** — A function whose result depends only on its arguments and which has no side effects.
- **Side effect** — Any observable change a function makes besides returning a value, such as modifying data, writing output or calling a network.
- **Deterministic** — Always producing the same output for the same input.
- **Referential transparency** — The property that an expression can be replaced by its value without changing the program's behaviour.
- **Immutability** — The practice of never changing data after it has been created, and creating new values instead.
- **Shallow copy** — A copy of an object's top level whose nested objects are still shared with the original.
- **Deep copy** — A copy in which every nested object is also copied, sharing nothing with the original.
- **Structural sharing** — Reusing the unchanged parts of a data structure in a new version instead of copying them.
- **First-class function** — A function treated as an ordinary value that can be stored, passed and returned.
- **Higher-order function** — A function that takes another function as an argument or returns a function.
- **Declarative code** — Code that describes what result is wanted rather than the step-by-step procedure to get it.
- **Imperative code** — Code that describes step by step how to change the program's state to reach a result.
- **Function composition** — Combining functions so that the output of each becomes the input of the next.
- **Pipe** — A helper that composes functions from left to right, in the order they run.
- **Point-free style** — Defining functions by combining other functions without naming their arguments.
- **Partial application** — Fixing some arguments of a function to create a new function that takes the rest.
- **Currying** — Transforming a function of several arguments into a chain of functions that each take one argument.
- **Function factory** — A function that creates and returns configured functions.
- **Result type** — A value that represents either a success with a value or a failure with an error, forcing callers to handle both.
- **Reducer** — A pure function that takes the current state and an action and returns the next state.
- **Memoization** — Storing the results of a pure function so that repeated calls with the same input return the stored result.
- **Lazy evaluation** — Computing values only when they are actually needed.
- **Functional core, imperative shell** — A program structure in which pure functions make all decisions and a thin outer layer performs input and output.
- **Idempotent** — Describing an operation that has the same effect whether it runs once or several times.

## What comes next

You now have two powerful ways of organising code: objects that guard their state, and pure functions that avoid state. Both can still produce code that is hard to read — badly named, too long, too clever. The next chapter, {{ch:clean-code}}, is about the everyday craft that makes any code, in any paradigm, easy for the **next person** to understand and change: names, functions, comments, formatting, error handling and the habit of leaving code better than you found it.
