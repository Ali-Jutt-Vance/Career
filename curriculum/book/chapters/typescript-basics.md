# TypeScript I: Why Types Matter, and the Basics

> [!GOALS]
> - What TypeScript is, what problem it solves, and what it does **not** do.
> - How TypeScript checks your code before it runs, and why the types disappear when it runs.
> - How to set up a TypeScript project, configure it sensibly and run TypeScript code.
> - How to write type annotations, and when TypeScript can work out types by itself (inference).
> - The basic types: primitives, arrays, tuples, objects, optional and read-only properties.
> - Type aliases and interfaces, and when to use each.
> - Union and literal types, and how TypeScript narrows a type as your code checks values.
> - How to type functions, and the special types `any`, `unknown`, `void` and `never`.
> - How TypeScript handles `null` and `undefined`, and why that alone prevents a huge class of bugs.
> - How classes work in TypeScript, and why data from outside your program still needs checking at run time.

## Why this matters

Look back at the bugs you have met in Part II:

- `TypeError: Cannot read properties of undefined (reading 'name')` — a value was missing.
- `"4500" + "600"` giving `"4500600"` — a string where a number was expected.
- `describeItem(2, "Cotton shirt", 1300)` — arguments in the wrong order.
- `basket.totl` — a misspelt property, silently `undefined`.
- Forgetting to `await` a promise, and dividing a promise by 100.

Every one of these was discovered **while the program was running** — in the best case by you, in the worst case by a customer. JavaScript does not check, before running, whether you are using values correctly. It finds out when it gets there.

**TypeScript** checks before running. It reads your whole program, works out what kind of value every variable, parameter and property holds, and reports mistakes like these **in your editor, as you type** — with a red underline and a precise message — before the code has run even once. In {{ch:from-code-to-running-program}} you learned that the earlier a mistake is found, the cheaper it is to fix. TypeScript moves a large share of mistakes to the earliest possible moment.

That is why TypeScript has become the standard for professional JavaScript development. The great majority of new professional JavaScript projects — backends, frontends, libraries — are written in TypeScript, and most job adverts for JavaScript developers expect it. NestJS ({{ch:nestjs-basics}}) is built around it, and React and Next.js projects default to it. The rest of this book uses TypeScript for real projects.

## The simple idea

TypeScript is **JavaScript plus labels that say what kind of value each thing holds** — and a checker that reads those labels and tells you when something does not fit.

```ts
function lineTotal(pricePaisa: number, quantity: number): number {
  return pricePaisa * quantity;
}

lineTotal("4500", 2);
```

```text
error: Argument of type 'string' is not assignable to parameter of type 'number'.
```

The labels `: number` say "this parameter must be a number" and "this function returns a number". When someone passes the string `"4500"`, the checker refuses — before anything runs.

> [!ANALOGY]
> TypeScript is like the spell-checker and grammar-checker in a word processor. As you type, it underlines words that do not fit, long before anyone reads your document. You can ignore it — but most of the time, it has caught a real mistake.
>
> **Where the analogy breaks:** a grammar checker cannot know whether your *facts* are true, and neither can TypeScript. It checks that values are of the right **kind** — that a price is a number — not that they are **correct** — that the price is the right amount. And it only checks your code; data that arrives from outside while the program runs (a web form, an API response, a database row) is not checked by TypeScript at all, as you will see at the end of this chapter.

## The proper definition and key words

- **TypeScript** is a programming language created by Microsoft (first released in 2012) that **adds a static type system to JavaScript**. Every valid JavaScript program is also, essentially, valid TypeScript — TypeScript is a **superset** of JavaScript.
- A **type** describes a set of values and what you can do with them ({{ch:types-of-data}}): `number`, `string`, "an object with a `title` string and a `pricePaisa` number".
- A **type annotation** is a label you write to state a type, such as `: number`.
- A **static type system** checks types by reading the code, **before** it runs. JavaScript's own types are **dynamic**: checked only while running ({{ch:types-of-data}}).
- **Type checking** is the process of verifying that every value is used in a way its type allows.
- The **TypeScript compiler** (`tsc`) checks the types and converts TypeScript into plain JavaScript.
- **Type inference** is TypeScript working out a type by itself, without an annotation.

## How TypeScript works

### Level 2 — Check, then erase

Browsers and Node.js run **JavaScript**. So how does TypeScript run? It is converted into JavaScript first — a process you met in {{ch:from-code-to-running-program}} as **transpiling**:

```text
   shop.ts  ----->  TYPE CHECKER  ----->  errors?  report them in the editor / terminal
   (TypeScript)        |
                       v
                  REMOVE TYPES  ----->  shop.js  ----->  Node.js / browser runs it
                                        (plain JavaScript)
```

Two separate jobs happen:

1. **Type checking.** The checker reads every file, works out every type, and reports mismatches.
2. **Emitting JavaScript.** The type annotations are **removed**, leaving ordinary JavaScript. This is called **type erasure**.

The erasure step is very simple. This TypeScript:

```ts
function lineTotal(pricePaisa: number, quantity: number): number {
  return pricePaisa * quantity;
}
```

becomes this JavaScript:

```js
function lineTotal(pricePaisa, quantity) {
  return pricePaisa * quantity;
}
```

The types are simply deleted. This has a crucial consequence, which every TypeScript developer must understand:

> **Types do not exist when the program runs.** TypeScript checks your code; it does not check your data. At run time, it is plain JavaScript, with no type information and no type checks.

This is why TypeScript adds **no run-time cost** — the running program is the same JavaScript you would have written by hand. It is also why TypeScript cannot, on its own, protect you from bad data arriving from outside (covered at the end of this chapter).

> [!NOTE]
> The type checker and the "remove types" step are separate tools in modern projects. The official compiler, `tsc`, does both. Many fast build tools (such as esbuild, SWC and Node.js's own built-in support) **only** remove types, without checking them — making them very fast. Projects then run `tsc` separately to check types, in the editor and before code is accepted ({{ch:cicd}}). Your editor runs the checker constantly in the background, which is where you will see most errors.

## Setting up a TypeScript project

### Installing

In a new project folder:

```text
> mkdir ts-shop
> cd ts-shop
> npm init -y
> npm install --save-dev typescript @types/node
> npx tsc --init
```

- `typescript` is installed as a **dev dependency** ({{ch:modules-and-npm}}), because it is a development tool — the running program is plain JavaScript.
- `@types/node` provides type information for Node.js's built-in modules (explained in {{ch:typescript-advanced}}).
- `npx tsc --init` creates a configuration file called **`tsconfig.json`**.

### `tsconfig.json`: the settings that matter

`tsc --init` creates a file full of options, most of them commented out. A sensible, modern configuration for a Node.js project looks like this:

```json
{
  "compilerOptions": {
    "target": "ES2023",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "sourceMap": true
  },
  "include": ["src"]
}
```

The most important settings:

- **`strict: true`** — turns on all of TypeScript's strict checks. **Always use it.** Without it, TypeScript lets through many of the exact bugs you are using it to catch — most importantly, it stops checking for `null` and `undefined` (explained below). Starting a project with `strict` off is one of the most regretted decisions in TypeScript codebases, because turning it on later means fixing thousands of errors at once.
- **`noUncheckedIndexedAccess: true`** — makes TypeScript admit that reading `array[5]` or `record[key]` might give `undefined` ({{ch:arrays}}). Stricter, and it catches real bugs.
- **`target`** — which version of JavaScript to produce. Modern Node.js supports modern JavaScript, so a recent target is fine.
- **`module` / `moduleResolution`: `"NodeNext"`** — follow Node.js's own rules for modules, including ES modules and the `.js` extension in imports ({{ch:modules-and-npm}}).
- **`rootDir` / `outDir`** — TypeScript source files live in `src/`; compiled JavaScript is written to `dist/`.
- **`sourceMap: true`** — produce **source maps**: files that connect each line of the compiled JavaScript back to the original TypeScript line, so stack traces and the debugger ({{ch:errors-and-debugging}}) show your TypeScript code, not the generated JavaScript.
- **`skipLibCheck: true`** — do not type-check the type definitions of installed packages, which speeds up checking and avoids errors in other people's code.

Also add `"type": "module"` to `package.json`, so the compiled output uses ES modules.

### Writing and running TypeScript

Create `src/index.ts` — note the **`.ts`** extension:

```ts
const shopName: string = "Ali's Shoe Corner";
const shoePricePaisa: number = 450000;

console.log(`${shopName}: Rs ${shoePricePaisa / 100}`);
```

There are three common ways to run it:

**1. Compile, then run** — the classic approach, and what production uses:

```text
> npx tsc
> node dist/index.js
Ali's Shoe Corner: Rs 4500
```

`npx tsc` checks every file and writes JavaScript into `dist/`. If there are type errors, they are printed (and, by default, the JavaScript is still written — the errors are warnings you must fix, not a gate, unless you set `noEmitOnError`).

**2. Run directly with Node.js** — recent versions of Node.js can run `.ts` files themselves, by stripping the types before running:

```text
> node src/index.ts
Ali's Shoe Corner: Rs 4500
```

This is **type stripping** only: Node.js removes the annotations but does **not** check them. It supports most TypeScript, but not a few features that require generating new code (such as `enum`, which you will meet below). Check the Node.js documentation for your version.

**3. Run with a tool such as `tsx`** — `npx tsx src/index.ts` — popular for development, also without type checking.

Whichever way you **run** code, keep the **checker** running too: in your editor (automatically), and with `npx tsc --noEmit` (check only, write nothing) in your npm scripts:

```json
"scripts": {
  "dev": "node --watch src/index.ts",
  "typecheck": "tsc --noEmit",
  "build": "tsc",
  "start": "node dist/index.js"
}
```

## Annotations and inference

### Level 1 — Writing types

A **type annotation** is a colon followed by a type, written after the name it describes:

```ts
let customerName: string = "Sara";
let loyaltyPoints: number = 1250;
let isMember: boolean = true;
```

If you then try to assign a value of the wrong type, the checker reports it:

```ts
loyaltyPoints = "lots";
```

```text
error TS2322: Type 'string' is not assignable to type 'number'.
```

Every TypeScript error has a code (here, `TS2322`) and a message. "Is not assignable to" is the phrase you will see most often; it means "this value does not fit where you are putting it".

### Level 2 — Inference: let TypeScript do the work

You rarely need to write annotations on variables. When a variable is created with a value, TypeScript **infers** its type from that value:

```ts
let customerName = "Sara";       // inferred: string
let loyaltyPoints = 1250;        // inferred: number
const isMember = true;           // inferred: true (see "literal types" below)

loyaltyPoints = "lots";          // still an error: Type 'string' is not assignable to type 'number'.
```

In VS Code, hover over any variable to see its inferred type.

The professional habit is: **let TypeScript infer what it can; annotate where it cannot, and at boundaries.** In practice that means:

- **Do annotate** function **parameters** — TypeScript cannot guess what a caller will pass.
- **Usually annotate** the **return type** of exported functions — it documents the contract and catches mistakes inside the function.
- **Do annotate** variables created **without** a value, and empty arrays.
- **Do not annotate** variables that are created with an obvious value.

Over-annotating clutters the code without adding safety.

## The basic types

### Primitives

The JavaScript primitives from {{ch:types-of-data}} have matching TypeScript types, written in lowercase:

| Type | Example values |
|---|---|
| `string` | `"Lahore"`, `` `Hi ${name}` `` |
| `number` | `42`, `3.14`, `NaN`, `Infinity` |
| `boolean` | `true`, `false` |
| `bigint` | `10n` |
| `symbol` | `Symbol("id")` |
| `null` | `null` |
| `undefined` | `undefined` |

(Do not use the capitalised `String`, `Number` or `Boolean` as types; they refer to rarely used wrapper objects.)

Notice that TypeScript cannot distinguish rupees from paisa, or a price from a quantity — both are `number`. Types describe the **shape** of data, not its **meaning**. ({{ch:typescript-advanced}} shows a technique called "branded types" that can add some of that meaning.)

### Arrays

An array type is written as the element type followed by `[]`:

```ts
const prices: number[] = [4500, 600, 1200];
const cities: string[] = ["Lahore", "Karachi"];

prices.push("free");
```

```text
error TS2345: Argument of type 'string' is not assignable to parameter of type 'number'.
```

An alternative spelling, `Array<number>`, means the same thing. An **empty** array needs an annotation, because there is nothing to infer from:

```ts
const basketItems: string[] = [];
```

With `noUncheckedIndexedAccess`, reading by index gives a possibly-missing value:

```ts
const first = prices[0];   // type: number | undefined
```

The `|` means "or" — a **union**, explained shortly. TypeScript is reminding you that `prices[0]` might not exist, exactly the off-by-one and empty-array cases from {{ch:arrays}}.

### Tuples

A **tuple** is a fixed-length array where each position has its own type:

```ts
const coordinates: [number, number] = [31.5204, 74.3587];
const entry: [string, number] = ["lahore", 120];

const [latitude, longitude] = coordinates;   // both: number
```

Tuples match the `[key, value]` pairs from `Object.entries` ({{ch:objects}}) and the results of `Promise.all` ({{ch:asynchronous-javascript}}).

### Object types

You describe an object's shape by listing its properties and their types:

```ts
const product: { title: string; pricePaisa: number; stock: number } = {
  title: "Cotton shirt",
  pricePaisa: 129950,
  stock: 42,
};

console.log(product.titel);
```

```text
error TS2551: Property 'titel' does not exist on type '{ title: string; pricePaisa: number; stock: number; }'. Did you mean 'title'?
```

The misspelt property that silently gave `undefined` in JavaScript ({{ch:objects}}) is now caught — with a suggestion.

TypeScript also catches **missing** and **extra** properties in object literals:

```ts
const cap: { title: string; pricePaisa: number } = { title: "Cap" };
```

```text
error TS2741: Property 'pricePaisa' is missing in type '{ title: string; }' but required in type '{ title: string; pricePaisa: number; }'.
```

### Optional and read-only properties

A `?` after a property name makes it **optional** — it may be missing:

```ts
const customer: { name: string; phone?: string } = { name: "Sara" };

console.log(customer.phone.length);
```

```text
error TS18048: 'customer.phone' is possibly 'undefined'.
```

Because `phone` is optional, its type is effectively `string | undefined`, and TypeScript will not let you use it as a definite string until you check. This is exactly the `Cannot read properties of undefined` crash from {{ch:objects}}, prevented before running. The fix is the same as before — check, or use optional chaining:

```ts
console.log(customer.phone?.length ?? 0);
```

`readonly` before a property prevents reassignment:

```ts
const order: { readonly id: string; status: string } = { id: "ORD-5521", status: "pending" };
order.status = "shipped";   // fine
order.id = "ORD-9999";
```

```text
error TS2540: Cannot assign to 'id' because it is a read-only property.
```

Like `const` and `Object.freeze` ({{ch:objects}}), `readonly` is shallow, and — like all types — it disappears at run time: it stops **your code** from changing the property, but it does not freeze the object.

## Naming types: type aliases and interfaces

Writing `{ title: string; pricePaisa: number; stock: number }` everywhere would be repetitive. You give a type a **name** in one of two ways.

### Type aliases

A **type alias** names any type with the `type` keyword:

```ts
type Product = {
  id: string;
  title: string;
  pricePaisa: number;
  stock: number;
  tags?: string[];
};

const shirt: Product = {
  id: "p-881",
  title: "Cotton shirt",
  pricePaisa: 129950,
  stock: 42,
};

function isInStock(product: Product): boolean {
  return product.stock > 0;
}
```

Type names use PascalCase, like classes. Now `Product` documents the shape in one place, and every function that takes a `Product` is checked against it.

### Interfaces

An **interface** names an **object** shape with the `interface` keyword:

```ts
interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
}

const sara: Customer = { id: "c-1", name: "Sara Khan", email: "sara@example.com" };
```

An interface can **extend** another, adding properties:

```ts
interface Person {
  name: string;
  email: string;
}

interface Employee extends Person {
  employeeId: string;
  department: string;
}

const bilal: Employee = {
  name: "Bilal",
  email: "bilal@example.com",
  employeeId: "E-204",
  department: "Logistics",
};
```

Type aliases can do the same with an **intersection**, written `&`, which means "has everything from both":

```ts
type Person = { name: string; email: string };
type Employee = Person & { employeeId: string; department: string };
```

### Which to use?

For describing object shapes, `type` and `interface` are nearly interchangeable, and you will see both in every codebase. The real differences:

| | `type` | `interface` |
|---|---|---|
| Can name any type (unions, tuples, primitives) | Yes | No — objects only |
| Extending | With `&` | With `extends` (clearer error messages) |
| Can be "re-opened" to add properties later | No | Yes (declaration merging — {{ch:typescript-advanced}}) |

A common, sensible convention: **use `interface` for object shapes that might be extended, and `type` for everything else** — or simply pick one for object shapes and use it consistently. Consistency matters more than the choice.

## Union types and literal types

### Level 3 — "This or that"

A **union type** says a value may be one of several types, written with `|`:

```ts
type Id = string | number;

function describeId(id: Id): string {
  return `ID: ${id}`;
}

describeId("ORD-5521");
describeId(5521);
describeId(true);
```

```text
error TS2345: Argument of type 'boolean' is not assignable to parameter of type 'Id'.
```

### Literal types

A **literal type** is a type that allows exactly **one** value. On their own they seem pointless; combined into unions, they are one of TypeScript's most useful features:

```ts
type OrderStatus = "pending" | "paid" | "shipped" | "delivered" | "cancelled";

let status: OrderStatus = "pending";
status = "shipped";
status = "shiped";
```

```text
error TS2322: Type '"shiped"' is not assignable to type 'OrderStatus'.
```

`OrderStatus` allows exactly five strings. A typo — which in plain JavaScript would silently create an order with a status nothing recognises — is caught immediately. Your editor will also **autocomplete** the valid values as you type.

Unions of string literals are the standard TypeScript way to describe a fixed set of options: statuses, roles, payment methods, sizes.

This also explains the inferred type of `const isMember = true` earlier: a `const` can never change, so TypeScript infers the **literal** type `true`, the narrowest possible. A `let` might be reassigned, so it gets the wider type `boolean`.

### Enums — and why unions are usually preferred

TypeScript also has **enums**, a feature for named sets of values:

```ts
enum PaymentMethod {
  Card = "CARD",
  Cash = "CASH",
  Wallet = "WALLET",
}

const method: PaymentMethod = PaymentMethod.Card;
```

Enums are common in older codebases and some frameworks. But unlike almost everything else in TypeScript, an enum **generates JavaScript code** (an object), so it cannot simply be erased — which is why type-stripping tools like Node.js's built-in TypeScript support do not accept it. Many teams now prefer string-literal unions, which give the same safety and autocompletion with no generated code:

```ts
type PaymentMethod = "CARD" | "CASH" | "WALLET";
```

If you need the list of values at run time as well (for example, to show them in a dropdown), a common pattern uses a constant array:

```ts
const PAYMENT_METHODS = ["CARD", "CASH", "WALLET"] as const;
type PaymentMethod = (typeof PAYMENT_METHODS)[number];   // "CARD" | "CASH" | "WALLET"
```

`as const` tells TypeScript to treat the array as read-only with literal types, and the second line derives the union type from it. ({{ch:typescript-advanced}} explains the `typeof` and `[number]` parts.) The values exist once, and the type always matches them.

## Narrowing

### Level 3 — TypeScript follows your checks

When a value has a union type, you cannot use it as just one of the types until you have checked which it is. TypeScript watches your `if` statements, `typeof` checks and comparisons, and **narrows** the type inside each branch:

```ts
function formatAmount(amount: number | string): string {
  if (typeof amount === "number") {
    return `Rs ${(amount / 100).toFixed(2)}`;     // here, amount is number
  }
  return amount.trim();                            // here, amount is string
}
```

- Before the `if`, `amount` is `number | string`, so calling `.toFixed` or `.trim` directly would be an error — each exists on only one of the types.
- Inside the `if (typeof amount === "number")` branch, TypeScript **knows** it is a number.
- After the `if` returns, the only possibility left is `string`, so `.trim()` is allowed.

TypeScript understands many kinds of checks:

| Check | Narrows by |
|---|---|
| `typeof x === "string"` | primitive type |
| `x === null`, `x !== undefined`, `x === "pending"` | equality |
| `if (x)` | truthiness (removes `null`, `undefined`, and other falsy values) |
| `"phone" in customer` | whether a property exists |
| `x instanceof Error` | class |
| `Array.isArray(x)` | whether it is an array |

This is the **control-flow analysis** that makes TypeScript feel natural: you write the same checks you would write in JavaScript, and the types follow them.

### Discriminated unions

The most powerful use of narrowing is the **discriminated union** (also called a **tagged union**): a union of object types that all share one property — the **discriminant** — whose literal value says which kind of object it is.

```ts
type PaymentResult =
  | { status: "succeeded"; transactionId: string; amountPaisa: number }
  | { status: "declined"; reason: string }
  | { status: "requires_verification"; verificationUrl: string };

function describePayment(result: PaymentResult): string {
  switch (result.status) {
    case "succeeded":
      return `Paid ${result.amountPaisa} paisa (transaction ${result.transactionId})`;
    case "declined":
      return `Declined: ${result.reason}`;
    case "requires_verification":
      return `Please verify at ${result.verificationUrl}`;
  }
}

console.log(describePayment({ status: "declined", reason: "Insufficient funds" }));
```

**Output:**

```text
Declined: Insufficient funds
```

Walkthrough:

- Each kind of result has different data: a successful payment has a transaction ID; a declined one has a reason; one needing verification has a URL.
- The shared `status` property tells them apart.
- Inside each `case`, TypeScript narrows `result` to exactly that variant, so `result.transactionId` is allowed only in the `"succeeded"` branch. Trying to read `result.reason` in the `"succeeded"` branch is an error.

Compare this with a single object type full of optional properties — `{ status: string; transactionId?: string; reason?: string; ... }` — where every combination is allowed, including nonsense ones like a declined payment with a transaction ID. A discriminated union makes **invalid states impossible to represent**. This idea — designing types so that illegal data cannot be constructed — is one of the most valuable habits TypeScript teaches. You will see in {{ch:typescript-advanced}} how TypeScript can also force you to handle every variant.

## Typing functions

### Parameters and return types

```ts
function calculateDeliveryFee(totalPaisa: number, isRemoteArea: boolean): number {
  if (isRemoteArea) return 40000;
  return totalPaisa >= 500000 ? 0 : 25000;
}
```

- Each parameter has a type annotation.
- The type after the closing bracket, `: number`, is the **return type**. If any `return` in the function returned something else — or a path forgot to return — TypeScript would report it.

Calling with the wrong number or kinds of arguments is caught:

```ts
calculateDeliveryFee(300000);
```

```text
error TS2554: Expected 2 arguments, but got 1.
```

Optional parameters use `?`, and default values work as in JavaScript (the type is inferred from the default):

```ts
function greet(name: string, greeting = "Assalam-o-Alaikum", title?: string): string {
  return `${greeting}, ${title ? title + " " : ""}${name}`;
}
```

Arrow functions are typed the same way, and an options object ({{ch:objects}}) is typed with an object type:

```ts
type OrderLineInput = { name: string; pricePaisa: number; quantity?: number };

const lineTotal = ({ pricePaisa, quantity = 1 }: OrderLineInput): number =>
  pricePaisa * quantity;
```

### Function types

Because functions are values ({{ch:functions}}), they have types too. A **function type** describes the parameters and return type:

```ts
type PriceAdjuster = (paisa: number) => number;

const withTax: PriceAdjuster = (paisa) => Math.round(paisa * 1.18);
const withDiscount: PriceAdjuster = (paisa) => Math.round(paisa * 0.9);

function applyToPrice(paisa: number, adjust: PriceAdjuster): number {
  return adjust(paisa);
}
```

Notice that `withTax`'s parameter needs no annotation: TypeScript infers it from `PriceAdjuster` — this is called **contextual typing**. The same happens for callbacks passed to `map`, `filter` and `forEach`: TypeScript knows the element type, so `prices.map((p) => p * 100)` knows `p` is a `number`.

### `async` functions

An `async` function always returns a promise ({{ch:asynchronous-javascript}}), and its return type says so with the built-in `Promise<...>` type:

```ts
async function loadCustomerName(id: string): Promise<string> {
  const response = await fetch(`https://jsonplaceholder.typicode.com/users/${id}`);
  const user = (await response.json()) as { name: string };
  return user.name;
}

async function show() {
  const name = loadCustomerName("1");
  console.log(name.toUpperCase());
}
```

```text
error TS2339: Property 'toUpperCase' does not exist on type 'Promise<string>'.
```

The **forgotten-`await`** bug from {{ch:asynchronous-javascript}} is caught: `name` is a `Promise<string>`, not a `string`. Add `await` and the error disappears. (The `as { name: string }` part is a **type assertion**, discussed below — and it hides a real risk you will learn to handle properly.)

## The special types

### `any` — switching the checker off

`any` means "any value at all — do not check anything about it":

```ts
let data: any = "hello";
data = 42;
data.foo.bar.baz();   // no error from TypeScript — crashes at run time
```

Every operation on an `any` value is allowed, so it removes all of TypeScript's protection — and it **spreads**: anything computed from an `any` is also unchecked. `any` exists to help migrate old JavaScript code and to deal with truly unknowable situations, but in new code it is almost always a mistake. Strict mode reports variables that would **implicitly** become `any` (such as untyped parameters), and many teams forbid explicit `any` with a lint rule.

### `unknown` — the safe alternative

`unknown` also means "could be anything" — but, unlike `any`, it lets you do **nothing** with the value until you have checked what it is:

```ts
function describe(value: unknown): string {
  if (typeof value === "string") {
    return `text of length ${value.length}`;
  }
  if (typeof value === "number") {
    return `the number ${value}`;
  }
  return "something else";
}

let parsed: unknown = JSON.parse('{"city":"Lahore"}');
parsed.city;
```

```text
error TS18046: 'parsed' is of type 'unknown'.
```

`unknown` forces you to narrow before use. It is the correct type for data whose shape you do not yet know: parsed JSON, a caught error (in strict mode, the `error` in `catch (error)` is `unknown`, because anything can be thrown — {{ch:errors-and-debugging}}), or input from outside the program. **When you would reach for `any`, reach for `unknown`.**

### `void` and `never`

- **`void`** is the return type of a function that does not return a useful value — like `console.log`:

  ```ts
  function logOrder(id: string): void {
    console.log(`Order ${id}`);
  }
  ```

- **`never`** is the type of a value that **can never exist**. It is the return type of a function that never finishes normally — it always throws, or loops forever:

  ```ts
  function fail(message: string): never {
    throw new Error(message);
  }
  ```

  `never` is also what remains when every possibility has been narrowed away — which, as {{ch:typescript-advanced}} shows, lets TypeScript check that you have handled every case of a union.

## `null`, `undefined` and strict null checks

### Level 4 — The billion-dollar mistake, fixed

The computer scientist Tony Hoare, who introduced the "null reference" into programming languages in 1965, later called it his "billion-dollar mistake", because of the countless crashes caused by code using a value that turned out to be missing. In JavaScript, these are the `Cannot read properties of undefined` and `of null` errors you have met so often.

With `strict` mode on (specifically, the `strictNullChecks` setting it includes), TypeScript treats `null` and `undefined` as **separate types** that are **not** part of `string`, `number` or any other type. A value that might be missing must say so in its type, and you must handle the missing case before using it:

```ts
type Customer = { name: string; address: { city: string } | null };

function deliveryCity(customer: Customer): string {
  return customer.address.city;
}
```

```text
error TS18047: 'customer.address' is possibly 'null'.
```

The fix is to handle the missing case explicitly:

```ts
function deliveryCity(customer: Customer): string {
  if (customer.address === null) {
    return "No address on file";
  }
  return customer.address.city;     // narrowed: address is not null here
}
```

The same applies to functions that may not find something. `Array.prototype.find` returns the element **or `undefined`**, and TypeScript's types say so:

```ts
const products: Product[] = [shirt];
const found = products.find((p) => p.id === "p-999");   // type: Product | undefined
console.log(found.title);
```

```text
error TS18048: 'found' is possibly 'undefined'.
```

This single feature — making "might be missing" visible in the type and requiring it to be handled — prevents what is probably the most common runtime error in JavaScript applications.

## Type assertions — and their danger

Sometimes you know more than TypeScript. A **type assertion**, written `value as Type`, tells the checker "trust me, this is a `Type`":

```ts
const input = document.getElementById("quantity") as HTMLInputElement;
```

Here, a browser function returns a general element type, and you assert it is specifically an input box ({{ch:browser-and-dom}}).

There is also the **non-null assertion**, a `!` after an expression, meaning "trust me, this is not `null` or `undefined`":

```ts
const first = products.find((p) => p.stock > 0)!;
```

**Assertions do not check or convert anything.** They are erased like every other type; they simply silence the checker. If your claim is wrong, the program crashes at run time exactly as plain JavaScript would — and now the type system is actively misleading every reader:

```ts
const user = JSON.parse('{"nme":"Sara"}') as { name: string };
console.log(user.name.toUpperCase());
```

TypeScript is satisfied, because you asserted the shape. At run time, the property is actually called `nme`, `user.name` is `undefined`, and the program throws `TypeError: Cannot read properties of undefined (reading 'toUpperCase')`.

Use assertions rarely, only where you genuinely have information TypeScript cannot see — and prefer narrowing with real checks. Treat every `as` and `!` in a code review as a claim that needs justifying.

## Classes in TypeScript

TypeScript adds a few features to the classes from {{ch:this-prototypes-classes}}. Fields are declared with types, and **access modifiers** control visibility:

```ts
interface Discount {
  readonly code: string;
  apply(totalPaisa: number): number;
}

class PercentageDiscount implements Discount {
  constructor(
    public readonly code: string,
    private readonly percent: number,
  ) {
    if (percent <= 0 || percent >= 100) {
      throw new RangeError(`Invalid percentage: ${percent}`);
    }
  }

  apply(totalPaisa: number): number {
    return Math.round(totalPaisa * (1 - this.percent / 100));
  }
}

const discount = new PercentageDiscount("SAVE10", 10);
console.log(discount.apply(300000));
console.log(discount.percent);
```

```text
error TS2341: Property 'percent' is private and only accessible within class 'PercentageDiscount'.
```

Walkthrough:

- **`implements Discount`** tells TypeScript to check that the class provides everything the `Discount` interface requires. Interfaces describe a **contract**; classes fulfil it. Code can then accept any `Discount` without caring which class it is — polymorphism ({{ch:this-prototypes-classes}}), now checked.
- **Parameter properties**: writing `public readonly code: string` in the constructor's parameter list both declares the field and assigns it — a shortcut for the common "copy each parameter onto `this`" pattern. It is very common in frameworks such as NestJS.
- **`public`** (the default) means visible everywhere; **`private`** means only inside the class; **`protected`** means inside the class and its subclasses.

> [!NOTE]
> TypeScript's `private` is a **compile-time** check only — like all types, it is erased, and the property is an ordinary property at run time. JavaScript's own `#private` fields ({{ch:this-prototypes-classes}}) are enforced at run time. Use `#` when privacy must be real (for example, in a library others will use), and either when you only need your own code to respect the boundary.

## Types stop at the edge of your program

### Level 5 — The most important limitation

Everything TypeScript checks is **your code**. It assumes that values have the types your code says they have. But much of a real program's data comes from **outside** — and outside data is not checked by TypeScript, because at run time there are no types:

- the body of an HTTP request sent by a browser, a mobile app or an attacker;
- the JSON response from another company's API;
- rows from a database;
- a configuration file or environment variable;
- a message from a queue.

Look again at this line from earlier:

```ts
const user = (await response.json()) as { name: string };
```

`response.json()` returns whatever the server sent. The assertion says "this has a `name` string" — but if the API changes, returns an error page, or is attacked, the claim is false, and the error appears somewhere deep in the code, far from the cause.

```text
   OUTSIDE WORLD                 BOUNDARY                    YOUR CODE
  (no types exist)                                    (TypeScript's checks hold)
  request bodies     ------>  VALIDATE AT RUN TIME  ------>  typed, trusted values
  API responses               - check every field
  database rows               - reject bad data
  env variables               - produce typed result
```

The professional solution is **run-time validation at every boundary**: check the actual data, field by field, when it enters your program, and only then treat it as typed. Libraries such as **Zod** let you write a schema once and get **both** a run-time check and a TypeScript type from it:

```ts
import { z } from "zod";

const UserSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email(),
});

type User = z.infer<typeof UserSchema>;   // { id: number; name: string; email: string }

const response = await fetch("https://jsonplaceholder.typicode.com/users/1");
const user: User = UserSchema.parse(await response.json());
console.log(user.name);
```

`UserSchema.parse` checks the real data and throws a clear error if anything is missing or the wrong type; if it succeeds, the result genuinely matches the `User` type. You will use validation like this throughout the backend chapters ({{ch:validation}}). The rule to remember:

> **TypeScript checks your code. Validation checks your data. You need both.**

## From beginner to enterprise: TypeScript at every level

**Level 3 — A small program.** Annotated function parameters, inferred variables, type aliases or interfaces for data, union types for options, and `strict` mode from the start.

**Level 4 — A real application.** Every domain object — products, orders, customers — has a named type. API responses and request bodies are validated at the boundary, producing typed values. Statuses and other fixed sets are literal unions; results with several outcomes are discriminated unions. The editor's errors are treated as seriously as failing tests.

**Level 5 — Professional engineering.** Type checking runs automatically before any change is accepted ({{ch:cicd}}). Lint rules forbid `any` and limit assertions. Types are shared between frontend and backend — for example, generated from an API description ({{ch:api-documentation}}) or a database schema ({{ch:prisma}}) — so a change on one side is immediately flagged on the other. Refactoring large codebases becomes far safer, because the checker finds every place affected by a change.

**Level 6 — Enterprise.** Very large organisations rely on TypeScript to let thousands of engineers change shared code safely. Type definitions become **contracts** between teams and services. Teams invest in type-level design — making illegal states unrepresentable — because it prevents whole categories of incidents. Build performance becomes a real concern at this scale, addressed with fast type-stripping tools for running code and incremental, parallel type checking for verification.

## Real-world use cases

### Beginner level — Catching a typo before it ships

**Situation:** a learner writes `order.staus = "shipped"` in plain JavaScript. The order's real `status` never changes, and nobody notices for days.

**With TypeScript:** `Property 'staus' does not exist on type 'Order'. Did you mean 'status'?` — the moment it is typed.

### Intermediate level — A safe status machine

**Business problem:** an online shop's orders sometimes end up with invalid statuses, such as `"Shipped"`, `"SHIPPED"` and `"shiped"`, because different developers typed them differently. Reports and filters miss these orders.

**Solution:** a single `OrderStatus` literal union used everywhere, and run-time validation of statuses arriving from outside (including from the database, via a check constraint — {{ch:database-design}}).

**Reasoning:** the type makes invalid statuses impossible to write in code; validation stops them arriving from outside.

### Advanced level — A large refactor with confidence

**Business problem:** a SaaS company needs to rename a field (`amount` to `amountMinor`) used in hundreds of places across a large codebase, to make the units explicit.

**With TypeScript:** after renaming the field in the type, the checker lists every place that must change. The editor's rename feature updates most of them automatically. The team finishes in hours instead of weeks, with confidence that nothing was missed — at least in code the checker can see.

**Limitation:** places that read the field from raw JSON with `as` assertions, or from `any` values, are **not** found. Every assertion is a hole in the safety net.

### Enterprise level — One contract for frontend and backend

**Business problem (illustrative):** a bank's mobile app and its backend are built by different teams. Frequently, the backend changes a response, and the app breaks in production.

**Solution:** the API is described in a machine-readable specification; TypeScript types for both sides are **generated** from it; the backend validates its own responses against it in tests; and changes to the specification are reviewed by both teams.

**Trade-offs:** generating and maintaining the specification takes effort, and it must be versioned carefully ({{ch:api-versioning}}). In exchange, many integration bugs are caught at build time, on both sides.

## Common mistakes

### Beginner mistake — Turning off `strict`

**What it looks like:** `"strict": false` "to get rid of all the red underlines".

**What happens:** TypeScript stops catching missing values, implicit `any`s and more — the very bugs it exists to catch.

**How to fix and prevent it:** start every project with `strict: true`. Fix errors rather than disabling the checks that report them.

### Beginner mistake — Using `any` to make errors go away

**What it looks like:** `function process(data: any)`, or `catch (error: any)`.

**What happens:** no checking at all for that value or anything derived from it.

**How to fix it:** use a proper type; use `unknown` and narrow; validate outside data.

### Beginner mistake — Annotating everything

**What it looks like:** `const count: number = 0; const name: string = "Sara";` everywhere.

**What happens:** noisy code with no extra safety.

**How to fix it:** let inference work for variables with values; annotate parameters, return types of exported functions, and empty values.

### Intermediate mistake — Trusting assertions over checks

**What it looks like:** `JSON.parse(text) as Order`, `req.body as CreateUserInput`, `value!`.

**What happens:** the type system now claims something that has never been verified, and the error appears far away at run time.

**How to fix it:** validate outside data with a schema; narrow with real checks; justify every remaining assertion.

### Intermediate mistake — One type full of optional fields

**What it looks like:** `{ status: string; transactionId?: string; reason?: string; url?: string }`.

**What happens:** invalid combinations are allowed, and every user of the type must guess which fields exist.

**How to fix it:** a discriminated union with one variant per situation.

### Production mistake — Believing TypeScript validates data

**What it looks like:** API endpoints that type their request body and never validate it.

**What happens:** attackers or buggy clients send malformed data; the server crashes or, worse, stores it.

**How to prevent it:** run-time validation at every boundary ({{ch:validation}}).

### Enterprise mistake — Letting type checking fall out of the process

**What it looks like:** running code with fast type-stripping tools during development and deployment, and never running `tsc` — so type errors accumulate unseen.

**How to prevent it:** run `tsc --noEmit` automatically on every proposed change, and treat failures as blocking.

## Debugging and troubleshooting

| Error | What it usually means |
|---|---|
| `Type 'X' is not assignable to type 'Y'` | A value of the wrong type is being stored, passed or returned |
| `Property 'X' does not exist on type 'Y'` | Misspelt property, or the type genuinely lacks it — or the value is a union and you have not narrowed it |
| `'X' is possibly 'undefined'` / `'null'` | Handle the missing case: check, use `?.` and `??`, or fix the type if it can never be missing |
| `Argument of type 'X' is not assignable to parameter of type 'Y'` | Wrong argument passed to a function |
| `Expected N arguments, but got M` | Missing or extra arguments |
| `Parameter 'x' implicitly has an 'any' type` | Add a type annotation to the parameter |
| `'x' is of type 'unknown'` | Narrow it (with `typeof`, `instanceof`, or validation) before use |
| `Property 'then' / 'toUpperCase' does not exist on type 'Promise<...>'` | A missing `await` |
| Code runs, but crashes on data that "should" match the type | The data was never validated, or an assertion was wrong |

> [!TIP]
> TypeScript's error messages can be long, especially for complex types. Read them from the **bottom** up: the last lines usually name the exact property or value that does not fit. Hovering over variables in VS Code to see their types, and using "Go to Type Definition", are the fastest ways to understand where a type came from.

## How a senior engineer thinks about TypeScript

> [!SENIOR]
> - **Types are design.** Writing the types first — what is an `Order`? what outcomes can a payment have? — often reveals unclear requirements before any logic is written.
> - **Make illegal states unrepresentable.** Discriminated unions, literal types and required fields encode the business rules so that whole classes of bugs cannot even be written.
> - **Trust boundaries are explicit.** Inside, types are trusted; at every edge, data is validated. Assertions and `any` are treated as holes to be minimised and justified.
> - **Strict from day one.** The cost of strictness is small and constant; the cost of adding it later is enormous.
> - **Inference over annotation, clarity over cleverness.** Annotate what documents a contract; let the compiler infer the rest; avoid type tricks that only their author can read.

## Exercises

### Exercise 1 — Type an order

**Objective:** practise type aliases, interfaces, unions, optional properties and arrays.

**What to build:** types for an order: an `OrderStatus` union (`"pending" | "paid" | "shipped" | "delivered" | "cancelled"`), an `OrderLine` (`productId`, `name`, `pricePaisa`, `quantity`), and an `Order` interface (`id`, `customerId`, `status`, `lines`, optional `couponCode`, read-only `createdAt` as an ISO string). Write a function `orderTotalPaisa(order: Order): number`. Then write one valid order, and try three invalid ones (wrong status, missing `lines`, negative quantity as a string) to see the errors.

<details>
<summary>Show the solution</summary>

```ts
type OrderStatus = "pending" | "paid" | "shipped" | "delivered" | "cancelled";

type OrderLine = {
  productId: string;
  name: string;
  pricePaisa: number;
  quantity: number;
};

interface Order {
  id: string;
  customerId: string;
  status: OrderStatus;
  lines: OrderLine[];
  couponCode?: string;
  readonly createdAt: string;
}

function orderTotalPaisa(order: Order): number {
  return order.lines.reduce((sum, line) => sum + line.pricePaisa * line.quantity, 0);
}

const order: Order = {
  id: "ORD-5521",
  customerId: "c-1",
  status: "paid",
  lines: [
    { productId: "p-881", name: "Cotton shirt", pricePaisa: 129950, quantity: 2 },
    { productId: "p-012", name: "Cap", pricePaisa: 49900, quantity: 1 },
  ],
  createdAt: "2026-11-19T10:30:00Z",
};

console.log(orderTotalPaisa(order));
```

**Output:**

```text
309800
```

And the three invalid attempts produce errors such as:

```text
Type '"sent"' is not assignable to type 'OrderStatus'.
Property 'lines' is missing in type '{ ... }' but required in type 'Order'.
Type 'string' is not assignable to type 'number'.
```

Walkthrough:

- `OrderStatus` restricts statuses to five values; misspellings are impossible.
- `couponCode?` may be absent; `readonly createdAt` cannot be changed after creation.
- In `orderTotalPaisa`, TypeScript knows `line` is an `OrderLine` (contextual typing), so `line.pricePaisa * line.quantity` is checked.
- `createdAt` is a UTC ISO string, following {{ch:advanced-javascript}}.

Note what the types **cannot** express: that quantities are positive whole numbers, or that prices are in paisa. Those rules still need run-time validation ({{ch:validation}}).

**Common wrong approach:** typing `status` as `string`. It accepts every typo, and the editor cannot autocomplete the valid values.

</details>

### Exercise 2 — Narrow a union

**Objective:** practise narrowing and discriminated unions.

**What to build:** a discriminated union `Shipment` with three variants, using a `method` discriminant: `"courier"` (with `trackingNumber: string`), `"pickup"` (with `storeName: string` and `readyAt: string`) and `"digital"` (with `downloadUrl: string`). Write `describeShipment(s: Shipment): string` using a `switch`. Then try reading `s.trackingNumber` outside the `"courier"` case and read the error.

<details>
<summary>Show the solution</summary>

```ts
type Shipment =
  | { method: "courier"; trackingNumber: string }
  | { method: "pickup"; storeName: string; readyAt: string }
  | { method: "digital"; downloadUrl: string };

function describeShipment(s: Shipment): string {
  switch (s.method) {
    case "courier":
      return `Track your parcel: ${s.trackingNumber}`;
    case "pickup":
      return `Collect from ${s.storeName} after ${s.readyAt}`;
    case "digital":
      return `Download: ${s.downloadUrl}`;
  }
}

console.log(describeShipment({ method: "pickup", storeName: "Gulberg branch", readyAt: "5 pm" }));
```

**Output:**

```text
Collect from Gulberg branch after 5 pm
```

Reading `s.trackingNumber` before the `switch` gives:

```text
Property 'trackingNumber' does not exist on type 'Shipment'.
  Property 'trackingNumber' does not exist on type '{ method: "pickup"; storeName: string; readyAt: string; }'.
```

Walkthrough:

- The `method` property is the discriminant; each `case` narrows `s` to one variant.
- Outside the `switch`, `s` could be any variant, so properties that exist on only some variants are refused — the error even names the variant that lacks it.
- Every variant carries exactly the data that makes sense for it; a "digital" shipment cannot have a tracking number by mistake.

**Common wrong approach:** `{ method: string; trackingNumber?: string; storeName?: string; readyAt?: string; downloadUrl?: string }`. Every function must then check for each optional field, and invalid combinations — a pickup with no store — are allowed.

</details>

### Exercise 3 — Replace `any` with `unknown`

**Objective:** practise `unknown`, narrowing and safe parsing.

**What to build:** a function `readPort(value: unknown): number` that accepts an environment-variable-style value and returns a valid port number (a whole number from 1 to 65,535, {{ch:how-the-internet-works}}), accepting either a number or a numeric string, and throwing a clear error otherwise. Test it with `3000`, `"8080"`, `"abc"`, `70000` and `undefined`.

<details>
<summary>Show the solution</summary>

```ts
function readPort(value: unknown): number {
  let port: number;

  if (typeof value === "number") {
    port = value;
  } else if (typeof value === "string" && value.trim() !== "") {
    port = Number(value);
  } else {
    throw new Error(`Port must be a number or numeric string, got ${String(value)}`);
  }

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new RangeError(`Invalid port: ${String(value)}`);
  }
  return port;
}

for (const input of [3000, "8080", "abc", 70000, undefined]) {
  try {
    console.log(readPort(input));
  } catch (error) {
    console.log(error instanceof Error ? error.message : String(error));
  }
}
```

**Output:**

```text
3000
8080
Invalid port: abc
Invalid port: 70000
Port must be a number or numeric string, got undefined
```

Walkthrough:

- The parameter is `unknown`, so TypeScript forbids any use until it is narrowed.
- `typeof` checks narrow it to `number` or `string`; anything else is rejected.
- `Number("abc")` is `NaN`, which fails `Number.isInteger` — so `"abc"` is reported as an invalid port.
- In the `catch`, `error` is `unknown` in strict mode, so `error instanceof Error` narrows it before reading `.message`.

Real applications read their configuration exactly like this — or with a validation library — once at start-up, so that a misconfigured server fails immediately with a clear message, instead of misbehaving later.

**Common wrong approach:** `function readPort(value: any) { return Number(value); }` — accepts everything, returns `NaN` for garbage, and passes the problem on to whatever uses the port.

</details>

### Exercise 4 — Fix the type errors (debugging)

**Objective:** practise reading TypeScript errors.

**The scenario:** this code has four type errors. Find and fix each one, explaining what TypeScript caught.

```ts
type Product = { id: string; title: string; pricePaisa: number; stock: number };

const catalogue: Product[] = [
  { id: "p1", title: "Cotton shirt", pricePaisa: 129950, stock: 4 },
  { id: "p2", title: "Cap", pricePaisa: "49900", stock: 0 },
];

function findProduct(id: string): Product | undefined {
  return catalogue.find((p) => p.id === id);
}

async function fetchStockFromWarehouse(id: string): Promise<number> {
  return 7;
}

async function restock(id) {
  const product = findProduct(id);
  const extra = fetchStockFromWarehouse(id);
  product.stock = product.stock + extra;
}
```

<details>
<summary>Show the solution</summary>

**Error 1 — `pricePaisa: "49900"`:** `Type 'string' is not assignable to type 'number'.` A price written as a string — the very bug from {{ch:types-of-data}} that made totals join instead of add. Fix: `pricePaisa: 49900`.

**Error 2 — `restock(id)`:** `Parameter 'id' implicitly has an 'any' type.` Strict mode refuses untyped parameters. Fix: `restock(id: string)`.

**Error 3 — `product.stock`:** `'product' is possibly 'undefined'.` `findProduct` may not find anything. Fix: handle the missing case.

**Error 4 — `product.stock + extra`:** `Operator '+' cannot be applied to types 'number' and 'Promise<number>'.` (The exact wording may vary slightly by TypeScript version.) The forgotten `await` from {{ch:asynchronous-javascript}}. Fix: `await`.

**Corrected:**

```ts
type Product = { id: string; title: string; pricePaisa: number; stock: number };

const catalogue: Product[] = [
  { id: "p1", title: "Cotton shirt", pricePaisa: 129950, stock: 4 },
  { id: "p2", title: "Cap", pricePaisa: 49900, stock: 0 },
];

function findProduct(id: string): Product | undefined {
  return catalogue.find((p) => p.id === id);
}

async function fetchStockFromWarehouse(id: string): Promise<number> {
  return 7;
}

async function restock(id: string): Promise<void> {
  const product = findProduct(id);
  if (!product) {
    throw new Error(`Product ${id} not found`);
  }
  const extra = await fetchStockFromWarehouse(id);
  product.stock = product.stock + extra;
}

await restock("p2");
console.log(catalogue[1]?.stock);
```

**Output:**

```text
7
```

**Lesson:** in plain JavaScript, these four mistakes would have produced, respectively, a joined-string price, nothing at all, a `TypeError` crash for an unknown ID, and a stock value like `"0[object Promise]"`. TypeScript reported all four before the code ran — each with a message pointing at the exact problem.

(`catalogue[1]?.stock` uses `?.` because, with `noUncheckedIndexedAccess`, `catalogue[1]` might be `undefined`.)

</details>

## Summary

**TypeScript** adds a **static type system** to JavaScript: it checks your code before it runs and reports mistakes in your editor. It is a **superset** of JavaScript, and its types are **erased** when it is compiled to JavaScript — so it has no run-time cost, and no run-time checks. Set up a project with `typescript` as a dev dependency and a `tsconfig.json` with **`strict: true`**; run code by compiling with `tsc`, or with type-stripping tools, while always keeping the checker running.

Write **type annotations** with a colon; rely on **inference** for variables with values, and annotate parameters, exported return types and empty values. Basic types include the primitives, arrays (`number[]`), **tuples**, and object types with **optional** (`?`) and **`readonly`** properties. Name types with **type aliases** (`type`) or **interfaces** (`interface`, extendable with `extends`); combine object types with **intersections** (`&`).

**Union types** (`|`) and **literal types** describe fixed sets of options, generally preferred over `enum`. TypeScript **narrows** unions as your code checks values; **discriminated unions** make invalid states unrepresentable. Type functions with parameter and return types, **function types**, and `Promise<T>` for async functions. **`any`** disables checking; **`unknown`** is the safe alternative; **`void`** and **`never`** describe absent and impossible values. Strict null checks force you to handle `null` and `undefined`. **Type assertions** (`as`, `!`) silence the checker without checking anything. Classes gain **access modifiers**, **parameter properties** and **`implements`**. Finally: TypeScript checks your code, not your data — **validate data at every boundary**.

## Key terms

- **TypeScript** — A language that adds a static type system to JavaScript and compiles to plain JavaScript.
- **Superset** — A language that includes everything in another language and adds more.
- **Static type system** — A system that checks types by reading code before it runs.
- **Type checking** — Verifying that every value is used in a way its type allows.
- **Type annotation** — A label stating a type, written with a colon, such as `: number`.
- **Type inference** — TypeScript working out a type by itself from the code.
- **Type erasure** — The removal of all type information when TypeScript is compiled to JavaScript.
- **`tsc`** — The official TypeScript compiler, which checks types and emits JavaScript.
- **`tsconfig.json`** — The configuration file for a TypeScript project.
- **Strict mode (TypeScript)** — The `strict` setting that enables all of TypeScript's strictest checks.
- **Source map** — A file that maps compiled JavaScript back to the original source lines, for debugging.
- **Type stripping** — Removing type annotations so code can run, without checking them.
- **Tuple** — A fixed-length array type where each position has its own type.
- **Object type** — A type describing the properties of an object and their types.
- **Optional property** — A property marked with `?` that may be missing.
- **`readonly`** — A modifier that prevents a property from being reassigned in code.
- **Type alias** — A name given to a type with the `type` keyword.
- **Interface** — A named description of an object's shape, declared with the `interface` keyword.
- **Intersection type** — A type combining several types with `&`, having all of their properties.
- **Union type** — A type allowing one of several types, written with `|`.
- **Literal type** — A type that allows exactly one specific value, such as `"pending"`.
- **Enum** — A TypeScript feature for named sets of values that generates JavaScript code.
- **`as const`** — An assertion that makes values read-only with the narrowest literal types.
- **Narrowing** — TypeScript refining a union type to a more specific type based on checks in the code.
- **Control-flow analysis** — TypeScript's tracking of how checks and branches affect types.
- **Discriminated (tagged) union** — A union of object types distinguished by a shared literal property.
- **Discriminant** — The shared property whose value identifies which variant of a discriminated union an object is.
- **Function type** — A type describing a function's parameters and return value.
- **Contextual typing** — TypeScript inferring parameter types from the place where a function is used.
- **`Promise<T>`** — The type of a promise that fulfils with a value of type `T`.
- **`any`** — A type that disables all type checking for a value.
- **`unknown`** — A type for a value of unknown shape that must be narrowed before use.
- **`void`** — The return type of a function that returns no useful value.
- **`never`** — The type of a value that can never exist, such as the result of a function that always throws.
- **Strict null checks** — The rule that `null` and `undefined` are separate types that must be handled explicitly.
- **Type assertion** — Telling TypeScript to treat a value as a given type with `as`, without any check.
- **Non-null assertion** — A `!` after an expression telling TypeScript it is not `null` or `undefined`.
- **Access modifier** — A keyword (`public`, `private`, `protected`) controlling where a class member can be used.
- **Parameter property** — A constructor parameter with an access modifier that also declares and sets a class field.
- **`implements`** — A keyword making TypeScript check that a class satisfies an interface.
- **Run-time validation** — Checking actual data while the program runs, field by field, before trusting it.
- **Zod** — A popular TypeScript library for defining schemas that validate data at run time and produce matching types.
- **Trust boundary** — A point where data enters a program from outside and must be validated.

## What comes next

You now have TypeScript's foundations: annotating and inferring types, describing data, narrowing unions, and knowing where types stop and validation begins. But many types in real code are **reused with different contents** — a list of products and a list of orders, an API response wrapping a user or wrapping an invoice — and writing a separate type for each would be endless repetition.

In the next chapter, **TypeScript II: Generics and Advanced Types**, you will learn **generics**, which let one type or function work with many types safely; the built-in **utility types** that transform types (making properties optional, picking or omitting fields); and the advanced tools — mapped, conditional and template literal types — that libraries and frameworks use, along with exhaustive checking, branded types and declaration files.
