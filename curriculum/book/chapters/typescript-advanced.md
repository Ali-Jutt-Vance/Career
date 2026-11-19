# TypeScript II: Generics and Advanced Types

> [!GOALS]
> - What generics are, and why they let one function or type work safely with many types.
> - How to write generic functions, generic types and generic classes, and how to limit them with constraints.
> - The type operators `keyof`, `typeof` and indexed access, which let you build types from other types.
> - The built-in utility types — `Partial`, `Required`, `Pick`, `Omit`, `Record`, `Readonly`, `ReturnType`, `Awaited` and others — and when each is useful.
> - How mapped types, conditional types, `infer` and template literal types work, and where libraries use them.
> - How to make TypeScript check that you have handled every case (exhaustiveness checking).
> - The `satisfies` operator, function overloads and branded types.
> - Where type definitions for libraries come from (`.d.ts` files and `@types` packages), and what decorators are.
> - How experienced engineers decide how much type cleverness is worth it.

## Why this matters

In {{ch:typescript-basics}} you learned to describe specific data: a `Product`, an `Order`, an `OrderStatus`. But much code is **general**. Consider:

- A function that returns the first element of an array — of products, of orders, of numbers.
- An API response wrapper, `{ data: ..., error: ... }`, used for users, invoices and reports alike.
- A cache that stores values of whatever kind it is given.
- A form library that knows, for any form you describe, exactly which field names are valid.

Without the tools in this chapter, you would either write the same code many times — one version per type — or give up and use `any`, losing all safety. **Generics** solve this: they let you write code once, for "some type `T`", and TypeScript keeps track of which actual type is being used each time.

This chapter also covers the type-level tools that libraries and frameworks are built on. You will use them directly sometimes, but you will **read** them constantly — in the type definitions of every library you install, and in the error messages those libraries produce. Understanding them turns intimidating errors into readable ones.

## The simple idea

A generic is a **type with a blank in it**, to be filled in later.

Think of a labelled storage box sold in a shop: "Box for ______". Before you buy it, the label is blank. Once you write "Shoes" on it, it is a box for shoes, and it would be a mistake to put a cake in it. The **same design** of box works for anything, but **each particular box** is for one kind of thing.

```ts
function firstItem<T>(items: T[]): T | undefined {
  return items[0];
}

const firstPrice = firstItem([4500, 600]);        // T is number  -> number | undefined
const firstCity = firstItem(["Lahore", "Karachi"]); // T is string -> string | undefined
```

`T` is the blank. Each call fills it in — `number` for the first call, `string` for the second — and TypeScript tracks the result precisely.

> [!ANALOGY]
> A generic function is like a vending machine that can be loaded with any product. Load it with juice, and it dispenses juice; load it with crisps, and it dispenses crisps. The machine's design does not care what the product is — but once loaded, it only ever gives out what was put in.
>
> **Where the analogy breaks:** a vending machine physically holds the product. A generic type parameter holds nothing at run time — like all types, it is erased ({{ch:typescript-basics}}). Generics are purely a compile-time promise that "what comes out has the same type as what went in".

## The proper definition and key words

- A **generic** is a function, type, interface or class that takes one or more **type parameters**.
- A **type parameter** is a placeholder for a type, written in angle brackets: `<T>`. By convention, single capital letters are used — `T` for "type", `K` for "key", `V` for "value", `E` for "element" — or descriptive names such as `TItem`.
- A **type argument** is the actual type that fills a type parameter, either written explicitly (`firstItem<number>(...)`) or **inferred** from the arguments.
- A **constraint** limits which types a type parameter may be, written `T extends SomeType`.
- A **utility type** is a built-in generic type that transforms another type, such as `Partial<T>`.

## Generic functions

### Level 2 — Why not `any`?

Here is the same `firstItem` function written with `any`:

```ts
function firstItemAny(items: any[]): any {
  return items[0];
}

const price = firstItemAny([4500, 600]);
price.toUpperCase();   // no error from TypeScript — crashes at run time
```

The function works, but the result is `any`, so TypeScript has forgotten that it is a number. The mistake is not caught.

With a generic, the information flows through:

```ts
function firstItem<T>(items: T[]): T | undefined {
  return items[0];
}

const price = firstItem([4500, 600]);
price.toUpperCase();
```

```text
error TS18048: 'price' is possibly 'undefined'.
```

And once you handle the missing case, `price` is known to be a `number`, so calling `toUpperCase` is reported as an error — exactly as it should be. Generics keep the **relationship** between input and output: "whatever type goes in, that type comes out".

### Level 3 — Reading and writing generic signatures

```ts
function firstItem<T>(items: T[]): T | undefined
//               \_/  \__________/  \___________/
//                |        |             |
//   type parameter   parameter uses T   return type uses T
```

- `<T>` after the name declares the type parameter.
- `items: T[]` says "an array of whatever `T` is".
- `T | undefined` says "returns one of those, or `undefined`".

You will rarely write the type argument yourself, because TypeScript **infers** it from the arguments. But you can:

```ts
const nothing = firstItem<string>([]);   // explicitly: an empty array of strings
```

Generic functions can have several type parameters:

```ts
function pairUp<A, B>(first: A, second: B): [A, B] {
  return [first, second];
}

const entry = pairUp("lahore", 120);   // [string, number]
```

And arrow functions can be generic too:

```ts
const lastItem = <T>(items: T[]): T | undefined => items[items.length - 1];
```

### A generic you already use

You have used generics since {{ch:typescript-basics}} without the name. `Array<number>` and `Promise<string>` are generic types: `Array<T>` and `Promise<T>` with the blank filled in. And array methods are generic functions — `map` is declared roughly like this:

```ts
interface Array<T> {
  map<U>(callback: (value: T, index: number) => U): U[];
}
```

Read it as: "on an array of `T`, `map` takes a function from `T` to some `U`, and returns an array of `U`". That is why `[4500, 600].map((p) => `Rs ${p}`)` is known to be a `string[]`: `T` is `number`, your callback returns a `string`, so `U` is `string`.

## Constraints: limiting what `T` can be

### Level 3 — `extends`

Sometimes a generic function needs to **do something** with its values that not every type supports. Then you **constrain** the type parameter:

```ts
function longest<T extends { length: number }>(a: T, b: T): T {
  return a.length >= b.length ? a : b;
}

console.log(longest("Lahore", "Karachi"));
console.log(longest([1, 2, 3], [4, 5]));
longest(10, 20);
```

```text
Karachi
[ 1, 2, 3 ]
error TS2345: Argument of type 'number' is not assignable to parameter of type '{ length: number; }'.
```

`T extends { length: number }` means "`T` can be any type, **as long as** it has a numeric `length` property". Strings and arrays qualify; numbers do not. Inside the function, TypeScript therefore allows `a.length`. Without the constraint, `a.length` would be an error, because an arbitrary `T` might not have a `length`.

A very common constraint is "objects that have an `id`":

```ts
interface HasId {
  id: string;
}

function findById<T extends HasId>(items: T[], id: string): T | undefined {
  return items.find((item) => item.id === id);
}

type Product = { id: string; title: string; pricePaisa: number };
type Customer = { id: string; name: string };

const products: Product[] = [{ id: "p1", title: "Cap", pricePaisa: 49900 }];
const customers: Customer[] = [{ id: "c1", name: "Sara" }];

const cap = findById(products, "p1");        // Product | undefined
const sara = findById(customers, "c1");      // Customer | undefined
console.log(cap?.title, sara?.name);
```

**Output:**

```text
Cap Sara
```

One function, any record type with an `id`, and each result keeps its exact type — `cap?.title` is allowed, and `sara?.title` would be an error.

## Generic types and classes

### Generic type aliases and interfaces

Types can have type parameters too. A very common real example is a wrapper for API responses:

```ts
type ApiResponse<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };

type User = { id: number; name: string };

function render(response: ApiResponse<User[]>): string {
  if (!response.ok) {
    return `Error ${response.error.code}: ${response.error.message}`;
  }
  return response.data.map((user) => user.name).join(", ");
}

console.log(render({ ok: true, data: [{ id: 1, name: "Sara" }, { id: 2, name: "Bilal" }] }));
console.log(render({ ok: false, error: { code: "TIMEOUT", message: "Upstream service timed out" } }));
```

**Output:**

```text
Sara, Bilal
Error TIMEOUT: Upstream service timed out
```

`ApiResponse<T>` is a **discriminated union** ({{ch:typescript-basics}}) with a blank for the data type. `ApiResponse<User[]>`, `ApiResponse<Invoice>` and `ApiResponse<Report>` all share the same structure, defined once. It is also the typed version of the "result object" pattern from {{ch:errors-and-debugging}}.

Type parameters can have **defaults**, just like function parameters:

```ts
type Paginated<TItem, TCursor = string> = {
  items: TItem[];
  nextCursor: TCursor | null;
};

const page: Paginated<User> = { items: [], nextCursor: null };   // TCursor is string
```

### Generic classes

```ts
class TtlCache<K, V> {
  #entries = new Map<K, { value: V; expiresAt: number }>();

  constructor(private readonly ttlMs: number) {}

  set(key: K, value: V): void {
    this.#entries.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }

  get(key: K): V | undefined {
    const entry = this.#entries.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.#entries.delete(key);
      return undefined;
    }
    return entry.value;
  }
}

const priceCache = new TtlCache<string, number>(60_000);
priceCache.set("p-881", 129950);
priceCache.set("p-012", "cheap");
```

```text
error TS2345: Argument of type 'string' is not assignable to parameter of type 'number'.
```

`TtlCache<K, V>` is a cache whose entries **expire** after a time-to-live (TTL) — the eviction idea from {{ch:advanced-javascript}}. The class is written once; `new TtlCache<string, number>(...)` creates a cache that accepts only string keys and number values. `Map<K, ...>` inside it is itself generic.

## Building types from other types

### `keyof`: the names of an object type's properties

`keyof T` produces a union of the property names of `T`:

```ts
type Product = { id: string; title: string; pricePaisa: number };

type ProductField = keyof Product;   // "id" | "title" | "pricePaisa"
```

Combined with generics, `keyof` lets you write functions that accept only **real** property names:

```ts
function pluck<T, K extends keyof T>(items: T[], key: K): T[K][] {
  return items.map((item) => item[key]);
}

const products: Product[] = [
  { id: "p1", title: "Cotton shirt", pricePaisa: 129950 },
  { id: "p2", title: "Cap", pricePaisa: 49900 },
];

const titles = pluck(products, "title");        // string[]
const prices = pluck(products, "pricePaisa");   // number[]
pluck(products, "colour");
```

```text
error TS2345: Argument of type '"colour"' is not assignable to parameter of type 'keyof Product'.
```

Walkthrough:

- `K extends keyof T` constrains `K` to be one of `T`'s property names.
- **`T[K]`** is an **indexed access type**: "the type of property `K` of `T`". For `K = "title"`, it is `string`; for `"pricePaisa"`, it is `number`.
- So the return type, `T[K][]`, is exactly right for each call — and invalid property names are rejected, with autocompletion of the valid ones in your editor.

This is the kind of typing that makes libraries feel "magic": sorting tables by column, form libraries that know every field name, database tools that know every column.

### `typeof` in types: types from values

In {{ch:types-of-data}}, `typeof` was a **run-time** operator returning a string. In a **type position**, `typeof` does something different: it gives you the **TypeScript type of a variable**:

```ts
const defaultSettings = {
  theme: "light",
  fontSize: 16,
  notifications: { email: true, sms: false },
};

type Settings = typeof defaultSettings;
// { theme: string; fontSize: number; notifications: { email: boolean; sms: boolean } }
```

The value comes first, and the type is derived from it, so the two can never drift apart. Combined with `as const` and indexed access, this explains the pattern from {{ch:typescript-basics}}:

```ts
const PAYMENT_METHODS = ["CARD", "CASH", "WALLET"] as const;
type PaymentMethod = (typeof PAYMENT_METHODS)[number];   // "CARD" | "CASH" | "WALLET"
```

`typeof PAYMENT_METHODS` is the read-only tuple type `readonly ["CARD", "CASH", "WALLET"]`, and indexing it with `[number]` — "the type of any numeric index" — gives the union of its elements.

## Utility types

TypeScript includes a set of generic **utility types** that transform other types. They are used constantly, so it is worth knowing the common ones well.

```ts
interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  passwordHash: string;
  createdAt: string;
}
```

| Utility | Result | Typical use |
|---|---|---|
| `Partial<User>` | every property optional | an "update" request that may change any field |
| `Required<User>` | every property required | after defaults have been filled in |
| `Readonly<User>` | every property read-only | values that must not be changed |
| `Pick<User, "id" \| "name">` | only `id` and `name` | a small public view of a user |
| `Omit<User, "passwordHash">` | everything **except** `passwordHash` | a safe response type |
| `Record<"admin" \| "staff", string[]>` | an object with exactly those keys, each a `string[]` | lookup tables ({{ch:objects}}) |
| `NonNullable<string \| null \| undefined>` | `string` | removing `null` and `undefined` |
| `ReturnType<typeof fn>` | the return type of a function | reusing a function's result type |
| `Parameters<typeof fn>` | a tuple of a function's parameter types | wrapping functions |
| `Awaited<Promise<User>>` | `User` | the value inside a promise |
| `Exclude<"a" \| "b" \| "c", "a">` | `"b" \| "c"` | removing members from a union |
| `Extract<"a" \| "b" \| "c", "a" \| "z">` | `"a"` | keeping only some members |

Here they are in realistic use:

```ts
type PublicUser = Omit<User, "passwordHash">;
type UserUpdate = Partial<Pick<User, "name" | "email" | "phone">>;

function toPublicUser(user: User): PublicUser {
  const { passwordHash, ...rest } = user;
  return rest;
}

function applyUpdate(user: User, update: UserUpdate): User {
  return { ...user, ...update };
}

const permissionsByRole: Record<"admin" | "staff" | "customer", string[]> = {
  admin: ["orders:read", "orders:write", "users:write"],
  staff: ["orders:read", "orders:write"],
  customer: ["orders:read:own"],
};
```

Walkthrough:

- `PublicUser` is `User` without `passwordHash`. The function `toPublicUser` removes it with object destructuring and rest ({{ch:objects}}); if someone later changes the function so that it accidentally returns the hash, the return type catches it. This is the typed version of the "never return whole records from an API" lesson in {{ch:objects}}.
- `UserUpdate` lets a caller change `name`, `email` or `phone` — any of them, or none — but never `id` or `passwordHash`.
- `Record<...>` requires **every** role to be present. If a new role is added to the union later, TypeScript reports that `permissionsByRole` is missing it.

Notice that utility types **compose**: `Partial<Pick<User, ...>>` picks three fields, then makes them optional.

## Making TypeScript check every case

### Level 4 — Exhaustiveness checking with `never`

Recall the discriminated union of payment results from {{ch:typescript-basics}}. Suppose a new variant is added later:

```ts
type PaymentResult =
  | { status: "succeeded"; transactionId: string }
  | { status: "declined"; reason: string }
  | { status: "refunded"; refundId: string };   // newly added
```

Every `switch` over `status` elsewhere in the codebase now silently ignores refunds. How can TypeScript tell you about **every** such place? With `never`:

```ts
function assertNever(value: never): never {
  throw new Error(`Unhandled case: ${JSON.stringify(value)}`);
}

function describePayment(result: PaymentResult): string {
  switch (result.status) {
    case "succeeded":
      return `Paid (${result.transactionId})`;
    case "declined":
      return `Declined: ${result.reason}`;
    default:
      return assertNever(result);
  }
}
```

```text
error TS2345: Argument of type '{ status: "refunded"; refundId: string; }' is not assignable to parameter of type 'never'.
```

Walkthrough:

- Each `case` narrows `result`. After the handled cases, in `default`, the remaining type is whatever has **not** been handled.
- If every variant were handled, the remaining type would be `never` — there would be nothing left — and passing it to `assertNever` would be fine.
- Because `"refunded"` is not handled, the remaining type is the refunded variant, which is not assignable to `never`. TypeScript reports an error **at every `switch` that forgot the new case**.
- At run time, if bad data ever slips through (perhaps from an unvalidated source), `assertNever` throws a clear error instead of silently doing nothing.

This technique turns "add a new status" from a risky search through the codebase into a guided list of every place that must be updated. Experienced TypeScript teams use it for every important union.

## Mapped types

### Level 5 — Transforming every property

How are `Partial` and `Readonly` built? With **mapped types**: a type that takes each property of another type and transforms it.

```ts
type MyPartial<T> = {
  [K in keyof T]?: T[K];
};

type MyReadonly<T> = {
  readonly [K in keyof T]: T[K];
};
```

Read `[K in keyof T]` as "for each property name `K` in `T`" — like a `for...of` loop over keys, but for types. Each property keeps its type, `T[K]`, and gains `?` or `readonly`.

You can write your own mapped types for real needs. For example, a type describing validation error messages for any form:

```ts
type FormErrors<T> = {
  [K in keyof T]?: string;
};

type SignupForm = { email: string; password: string; age: number };

const errors: FormErrors<SignupForm> = {
  email: "Please enter a valid email",
  age: "You must be at least 18",
};
```

`FormErrors<SignupForm>` allows an optional error message for each field of the form — and no others, so a typo like `emial` is caught.

Mapped types can also **rename** keys, using the `as` clause and template literal types (below):

```ts
type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};

type ProductGetters = Getters<{ title: string; pricePaisa: number }>;
// { getTitle: () => string; getPricePaisa: () => number }
```

`Capitalize` is another built-in utility that capitalises the first letter of a string literal type; `string & K` ensures `K` is treated as a string.

## Conditional types and `infer`

### Level 5 — Types that choose

A **conditional type** chooses between two types based on a condition, using the same `? :` shape as the ternary operator ({{ch:operators-and-decisions}}):

```ts
type IsString<T> = T extends string ? "yes" : "no";

type A = IsString<"Lahore">;   // "yes"
type B = IsString<42>;         // "no"
```

`T extends string` here means "is `T` assignable to `string`?".

When given a **union**, a conditional type is applied to **each member separately** (this is called **distribution**). That is how `Exclude` and `NonNullable` work:

```ts
type MyExclude<T, U> = T extends U ? never : T;

type Status = "pending" | "paid" | "cancelled";
type OpenStatus = MyExclude<Status, "cancelled">;   // "pending" | "paid"
```

Each member is checked: `"pending"` is not `"cancelled"`, so it is kept; `"cancelled"` is, so it becomes `never` — and `never` disappears from a union.

### `infer`: extracting a type from inside another

Inside a conditional type, **`infer`** declares a type variable that TypeScript fills in by matching. It is how `ReturnType` and `Awaited` are built:

```ts
type MyReturnType<F> = F extends (...args: any[]) => infer R ? R : never;
type Unwrap<P> = P extends Promise<infer V> ? V : P;

async function loadOrder() {
  return { id: "ORD-5521", totalPaisa: 309800 };
}

type LoadOrderResult = MyReturnType<typeof loadOrder>;   // Promise<{ id: string; totalPaisa: number }>
type Order = Unwrap<LoadOrderResult>;                   // { id: string; totalPaisa: number }
```

Read `F extends (...args: any[]) => infer R ? R : never` as: "if `F` is a function, call its return type `R`, and give me `R`".

With these two lines, the `Order` type was **derived** from the function itself. Change what `loadOrder` returns, and `Order` changes with it. (The built-in `Awaited<ReturnType<typeof loadOrder>>` does the same.)

You will rarely write `infer` in application code. But it is everywhere in library type definitions — and reading it is how you understand why a library's types behave as they do.

## Template literal types

**Template literal types** build string literal types with the same backtick syntax as template literals ({{ch:types-of-data}}):

```ts
type Entity = "order" | "invoice" | "customer";
type Action = "created" | "updated" | "deleted";

type EventName = `${Entity}.${Action}`;
// "order.created" | "order.updated" | "order.deleted" | "invoice.created" | ... (9 in total)

function emit(event: EventName, payload: unknown): void {
  console.log(`emitting ${event}`);
}

emit("order.created", { id: "ORD-1" });
emit("order.shipped", { id: "ORD-1" });
```

```text
emitting order.created
error TS2345: Argument of type '"order.shipped"' is not assignable to parameter of type 'EventName'.
```

When the parts are unions, TypeScript produces every combination. This is used for event names, permission strings (`"orders:read"`), CSS class names, and route paths in typed routers.

## Other essential tools

### `satisfies`: check without widening

Sometimes you want TypeScript to **check** that a value matches a type, while still **remembering the value's exact details**. An annotation loses detail; `satisfies` keeps it:

```ts
type Route = { path: string; method: "GET" | "POST" };

const routesAnnotated: Record<string, Route> = {
  listOrders: { path: "/orders", method: "GET" },
  createOrder: { path: "/orders", method: "POST" },
};
routesAnnotated.listOrderz;   // no error: any string key is allowed

const routes = {
  listOrders: { path: "/orders", method: "GET" },
  createOrder: { path: "/orders", method: "POST" },
} satisfies Record<string, Route>;

routes.listOrderz;
```

```text
error TS2551: Property 'listOrderz' does not exist on type '{ listOrders: ...; createOrder: ...; }'. Did you mean 'listOrders'?
```

- With the annotation, the variable's type **is** `Record<string, Route>`, so TypeScript forgets which keys actually exist, and typos are not caught.
- With `satisfies`, TypeScript **checks** that every entry is a valid `Route** — a `method` of `"PUT"` would be an error — but the variable keeps its precise type, including the exact key names.

Use `satisfies` for configuration objects, lookup tables and route definitions.

### Function overloads

Occasionally a function's return type depends on its arguments in a way a single signature cannot express. **Overloads** list several signatures, followed by one implementation:

```ts
function parseAmount(input: string): number;
function parseAmount(input: string[]): number[];
function parseAmount(input: string | string[]): number | number[] {
  return Array.isArray(input) ? input.map(Number) : Number(input);
}

const single = parseAmount("4500");             // number
const many = parseAmount(["4500", "600"]);      // number[]
```

Callers see only the overload signatures, so each call gets the precise return type. Overloads are useful but easy to overuse; often a union parameter, generics, or two separate functions are clearer.

### Branded types: giving numbers meaning

In {{ch:typescript-basics}} you saw that TypeScript cannot tell rupees from paisa — both are `number`. **Branded types** (also called **nominal** or **opaque** types) add an invisible "brand" so that values of the same underlying type cannot be mixed up:

```ts
type Paisa = number & { readonly __brand: "Paisa" };
type Rupees = number & { readonly __brand: "Rupees" };

function toPaisa(rupees: Rupees): Paisa {
  return Math.round(rupees * 100) as Paisa;
}

function rupees(value: number): Rupees {
  return value as Rupees;
}

function chargeCard(amount: Paisa): void {
  console.log(`Charging ${amount} paisa`);
}

const price = rupees(1299.5);
chargeCard(toPaisa(price));
chargeCard(price);
```

```text
Charging 129950 paisa
error TS2345: Argument of type 'Rupees' is not assignable to parameter of type 'Paisa'.
```

Walkthrough:

- `number & { readonly __brand: "Paisa" }` is a number with an extra, imaginary property. No real number has that property, so plain numbers — and `Rupees` — cannot be passed where `Paisa` is required.
- The only way to create one is through functions like `toPaisa` and `rupees`, which use a type assertion once, in a single, well-reviewed place.
- At run time the brand does not exist; the values are ordinary numbers.

This turns the unit mix-up from {{ch:first-program}} and the enterprise incident in {{ch:types-of-data}} — rupees treated as paisa — into a compile-time error. Branded types are equally useful for IDs: `CustomerId` and `OrderId` are both strings, but passing one where the other is expected is a real bug.

## Types for libraries: `.d.ts` files and `@types`

When you import a package, how does TypeScript know its types?

- Many packages are **written in TypeScript** and ship their types with them.
- Others are written in JavaScript but include **declaration files** — files ending in **`.d.ts`** that contain only type information, no code. For example:

  ```ts
  // price-utils.d.ts
  export declare function formatPrice(paisa: number): string;
  export declare const VAT_RATE: number;
  ```

  `declare` means "this exists at run time; here is its type".
- For JavaScript packages without their own types, the community maintains declaration files in a huge shared project called **DefinitelyTyped**, published to npm under the **`@types`** scope. That is why you installed `@types/node` in {{ch:typescript-basics}}: Node.js itself is not written in TypeScript, so its types come from `@types/node`. Similarly, `npm install --save-dev @types/express` adds types for the Express framework.

If no types exist at all, importing the package gives an error saying it has no type declarations. You can then write a minimal `.d.ts` file yourself describing just the parts you use — and validate its outputs at run time if they come from outside.

### Extending existing types

Sometimes you need to **add** to a type you do not own — for example, a web framework's request object, to which your login code attaches the current user. Interfaces can be **re-opened** and extended, a feature called **declaration merging**; doing it for another module's types is called **module augmentation**:

```ts
// types/express.d.ts
import "express";

declare module "express-serve-static-core" {
  interface Request {
    user?: { id: string; role: "admin" | "staff" | "customer" };
  }
}
```

After this, every Express request handler in the project knows that `request.user` may exist, with that exact shape. You will see this in {{ch:authentication}}. This is the main practical reason the `interface` keyword can be re-opened while `type` cannot ({{ch:typescript-basics}}).

## Decorators

A **decorator** is a function, written with an `@` before a class, method or property, that modifies or annotates it:

```ts
function logCalls<This, Args extends unknown[], Return>(
  method: (this: This, ...args: Args) => Return,
  context: ClassMethodDecoratorContext<This, (this: This, ...args: Args) => Return>,
) {
  return function (this: This, ...args: Args): Return {
    console.log(`Calling ${String(context.name)} with`, args);
    return method.call(this, ...args);
  };
}

class OrderService {
  @logCalls
  cancel(orderId: string): string {
    return `Order ${orderId} cancelled`;
  }
}

console.log(new OrderService().cancel("ORD-5521"));
```

**Output:**

```text
Calling cancel with [ 'ORD-5521' ]
Order ORD-5521 cancelled
```

The decorator receives the original method and returns a replacement that logs, then calls the original. The heavy generic signature is there so that the replacement keeps the original method's exact types — a good example of advanced generics in practice.

You will mostly **use** decorators rather than write them. Frameworks such as **NestJS** ({{ch:nestjs-basics}}) and the ORM **TypeORM** ({{ch:typeorm}}) use them heavily — `@Controller("orders")`, `@Get(":id")`, `@Column()` — to describe what classes and methods are for.

> [!NOTE]
> There are two decorator systems. Older TypeScript projects (including most NestJS and TypeORM projects) use **legacy "experimental" decorators**, enabled with `"experimentalDecorators": true` in `tsconfig.json`. Modern TypeScript (5.0 onwards) also supports the **standard** decorators that are being added to JavaScript itself, which the example above uses. They are not interchangeable; follow whatever your framework requires.

## How much type cleverness is worth it?

### Level 6 — The trade-off

With mapped, conditional and template literal types, TypeScript's type system is extremely powerful — powerful enough to compute surprisingly complex things at compile time. That power has costs:

- **Readability.** A five-line conditional type with nested `infer` can take a colleague half an hour to understand — and its error messages can be pages long.
- **Compile speed.** Very complex types slow down the checker and the editor, which matters in large codebases.
- **Fragility.** Clever types can break in surprising ways when TypeScript versions change.

A useful guideline: **put clever types in libraries and shared foundations, and keep application code plain.** A well-typed utility used by a hundred files — a typed API client, a form helper, an event emitter — repays its complexity many times over. A clever type used once, in one feature, usually does not.

```text
   Most valuable, least clever            Clever, use sparingly
   --------------------------------       --------------------------------
   named types for your data              mapped types for shared helpers
   literal unions, discriminated unions   conditional types and infer
   strict null checks                     template literal types
   generics on reusable functions         overloads
   exhaustiveness with never              deep type-level computation
   validation at boundaries
```

## From beginner to enterprise: advanced types at every level

**Level 3 — A small program.** Generic helper functions (`firstItem`, `findById`), generic wrappers (`ApiResponse<T>`), and utility types such as `Omit` and `Partial` for variations of your data.

**Level 4 — A real application.** Response types are derived with `Omit` so sensitive fields can never be returned; update types use `Partial<Pick<...>>`; every union of statuses has exhaustive `switch` statements; configuration objects use `satisfies`. Types for libraries come from their own packages or `@types`.

**Level 5 — Professional engineering.** Types are generated from single sources of truth — a database schema ({{ch:prisma}}), an API specification ({{ch:api-documentation}}) or a validation schema ({{ch:validation}}) — rather than written twice. Branded types protect money and IDs. Shared internal libraries use generics and mapped types so that application code stays simple and safe.

**Level 6 — Enterprise.** Platform teams build typed foundations — typed API clients, event systems with template-literal event names, permission systems with typed keys — that hundreds of engineers use daily. They watch type-checking performance in large monorepos, and treat public type definitions as versioned contracts, because changing a widely used type is a breaking change for everyone who depends on it.

## Real-world use cases

### Beginner level — One helper for every list

**Situation:** a learner writes `firstProduct`, `firstOrder` and `firstCustomer` — three identical functions with different types.

**Solution:** one generic `firstItem<T>`.

**Lesson:** generics remove duplication without giving up type safety.

### Intermediate level — Never leaking password hashes

**Business problem:** a code review discovers that an API endpoint returned users' password hashes, because a developer returned the database record directly.

**Solution:** define `type PublicUser = Omit<User, "passwordHash" | "resetToken">`, and require every user-facing endpoint to return `PublicUser`. Returning a full `User` where `PublicUser` is expected still compiles (extra properties are allowed for variables), so the team also builds response objects explicitly with a `toPublicUser` function, and tests that sensitive fields never appear.

**Lesson and limitation:** types help guide developers towards safe shapes, but TypeScript's structural typing allows objects with **extra** properties in many places. Security-critical shaping must be done explicitly, in code, and tested.

### Advanced level — Adding a new order status safely

**Business problem:** a logistics company adds a new status, `"returned_to_sender"`, to its `ShipmentStatus` union. Previously, a similar change took a week and still caused a production bug in an overlooked report.

**Solution:** every `switch` on status uses `assertNever` in its `default`. After adding the new status, the type checker lists eleven places that must handle it. The team updates all eleven the same day.

**Reasoning:** exhaustiveness checking converts a search problem into a checklist generated by the compiler.

### Enterprise level — A typed event system

**Business problem (illustrative):** a large e-commerce platform has hundreds of internal event types (`order.created`, `payment.refunded`, …) flowing between services. Mistyped event names and mismatched payloads cause silent failures.

**Solution:** a shared library defines a single map from event name to payload type, and a generic `publish<E extends EventName>(event: E, payload: EventPayload<E>)` function, so that each event name only accepts its own payload shape. The same definitions generate run-time validation schemas.

**Trade-offs:** the shared types become a critical, centrally owned contract; changes require coordination and versioning. In exchange, a large class of integration bugs is caught at compile time across teams.

## Common mistakes

### Beginner mistake — Using `any` instead of a generic

**What it looks like:** `function first(items: any[]): any`.

**What happens:** callers lose all type information about the result.

**How to fix it:** `function first<T>(items: T[]): T | undefined`.

### Beginner mistake — Unconstrained type parameters used as if they had properties

**What it looks like:** `function getId<T>(item: T) { return item.id; }` — error: property `id` does not exist on type `T`.

**How to fix it:** add a constraint: `<T extends { id: string }>`.

### Intermediate mistake — Generics that do nothing

**What it looks like:** `function log<T>(value: T): void { console.log(value); }`.

**What happens:** extra complexity with no benefit — `T` is used only once, so it relates nothing to anything. `value: unknown` says the same thing more simply.

**How to fix it:** use a type parameter only when it connects two or more places (an input and an output, or two inputs).

### Intermediate mistake — A missing default case

**What it looks like:** switches over unions without exhaustiveness checks.

**What happens:** new variants are silently ignored.

**How to fix it:** `default: return assertNever(value);`.

### Production mistake — Trusting types for security shaping

**What it looks like:** relying on a `PublicUser` type alone to prevent sensitive fields from being returned.

**What happens:** extra properties can still flow through in some situations, because TypeScript checks shapes structurally.

**How to prevent it:** construct response objects explicitly; test that sensitive fields never appear.

### Enterprise mistake — Type-level cleverness in application code

**What it looks like:** deeply nested conditional and mapped types in ordinary feature code.

**What happens:** slow builds, unreadable errors, and code only one person can maintain.

**How to prevent it:** keep advanced types in shared, well-documented libraries; keep application types plain.

## Debugging and troubleshooting

| Error or symptom | Likely cause |
|---|---|
| `Property 'x' does not exist on type 'T'` | The type parameter needs a constraint |
| `Argument of type '"y"' is not assignable to parameter of type 'keyof X'` | Not a real property name — check spelling |
| `... is not assignable to parameter of type 'never'` | An exhaustiveness check found an unhandled case |
| `Could not find a declaration file for module 'x'` | Install `@types/x`, or write a minimal `.d.ts` |
| An inferred type is too wide (`string` instead of `"GET"`) | Use `as const` or `satisfies`, or annotate |
| An inferred type is `unknown` from a generic | TypeScript could not infer `T`; pass the type argument explicitly |
| A very long, nested error message | Read it from the bottom; hover over each part; simplify the types involved |
| The editor becomes slow | Very complex types; simplify, or split large union types |

> [!TIP]
> To see what a complex type actually resolves to, hover over it in VS Code — or create a temporary alias, `type Check = Partial<Pick<User, "name" | "email">>;`, and hover over `Check`. For types that are hard to read, wrap them as `type Show<T> = { [K in keyof T]: T[K] } & {};` and hover over `Show<YourType>`: this small mapped type forces the editor to display the final, flattened object shape.

## How a senior engineer thinks about advanced types

> [!SENIOR]
> - **Does this type parameter connect anything?** Generics earn their place by relating inputs to outputs. If `T` appears once, it is probably unnecessary.
> - **Derive, don't duplicate.** Types are derived from one source — a schema, a constant, a function — with `typeof`, `keyof`, utility types and `infer`, so that changes flow everywhere automatically.
> - **Let the compiler find the work.** Exhaustiveness checks, `Record` over unions and `satisfies` turn requirement changes into compiler-generated to-do lists.
> - **Encode meaning where mistakes are costly.** Branded types for money and IDs; discriminated unions for states.
> - **Clever types belong in foundations.** A complex type must pay for itself across many uses — and must come with clear documentation and readable errors.
> - **Types are not security.** Shapes that protect data are built explicitly and tested; types guide, code enforces.

## Exercises

### Exercise 1 — A generic `groupBy`

**Objective:** practise generics with `keyof` and indexed access.

**What to build:** a function `groupBy<T, K extends keyof T>(items: T[], key: K)` that returns a `Map` from each distinct value of `item[key]` to the array of items with that value. Use it to group orders by `status`.

<details>
<summary>Show the solution</summary>

```ts
function groupBy<T, K extends keyof T>(items: T[], key: K): Map<T[K], T[]> {
  const groups = new Map<T[K], T[]>();
  for (const item of items) {
    const groupKey = item[key];
    const group = groups.get(groupKey);
    if (group) {
      group.push(item);
    } else {
      groups.set(groupKey, [item]);
    }
  }
  return groups;
}

type Order = { id: string; status: "pending" | "paid" | "shipped"; totalPaisa: number };

const orders: Order[] = [
  { id: "A1", status: "paid", totalPaisa: 250000 },
  { id: "A2", status: "pending", totalPaisa: 99900 },
  { id: "A3", status: "paid", totalPaisa: 129950 },
];

const byStatus = groupBy(orders, "status");
for (const [status, group] of byStatus) {
  console.log(status, group.map((order) => order.id));
}
```

**Output:**

```text
paid [ 'A1', 'A3' ]
pending [ 'A2' ]
```

Walkthrough:

- `K extends keyof T` allows only real property names of `T`; `groupBy(orders, "colour")` would be an error.
- The return type `Map<T[K], T[]>` uses indexed access: for `key = "status"`, the map's keys have type `"pending" | "paid" | "shipped"` — exactly the statuses — and its values are `Order[]`.
- Inside the loop, `groups.get(groupKey)` returns `T[] | undefined`, so the code checks before pushing.

**Common wrong approach:** typing the result as `Record<string, T[]>`. The map's keys are then plain strings, losing the information that only three statuses exist, and grouping by a numeric property would silently convert keys to strings.

</details>

### Exercise 2 — Safe response and update types

**Objective:** practise utility types.

**Starting point:**

```ts
interface Account {
  id: string;
  ownerName: string;
  email: string;
  balancePaisa: number;
  pinHash: string;
  createdAt: string;
}
```

**What to build:** (1) `AccountSummary` — everything except `pinHash`; (2) `ContactUpdate` — an optional `ownerName` and/or `email` only; (3) a function `updateContact(account: Account, update: ContactUpdate): Account` that returns a new account. Show that trying to update `balancePaisa` through `updateContact` is a type error.

<details>
<summary>Show the solution</summary>

```ts
type AccountSummary = Omit<Account, "pinHash">;
type ContactUpdate = Partial<Pick<Account, "ownerName" | "email">>;

function updateContact(account: Account, update: ContactUpdate): Account {
  return { ...account, ...update };
}

function summarise(account: Account): AccountSummary {
  const { pinHash: _removed, ...summary } = account;
  return summary;
}

const account: Account = {
  id: "acc-1",
  ownerName: "Sara Khan",
  email: "sara@example.com",
  balancePaisa: 500000,
  pinHash: "$2b$12$...",
  createdAt: "2026-11-19T10:30:00Z",
};

const updated = updateContact(account, { email: "sara.khan@example.com" });
console.log(summarise(updated));

updateContact(account, { balancePaisa: 999999999 });
```

**Output and error:**

```text
{
  id: 'acc-1',
  ownerName: 'Sara Khan',
  email: 'sara.khan@example.com',
  balancePaisa: 500000,
  createdAt: '2026-11-19T10:30:00Z'
}
error TS2353: Object literal may only specify known properties, and 'balancePaisa' does not exist in type 'ContactUpdate'.
```

Walkthrough:

- `Omit` removes the PIN hash; `Pick` then `Partial` allow only the two contact fields, each optional.
- `summarise` removes `pinHash` **in code** — renaming it to `_removed` during destructuring (an underscore prefix conventionally marks an unused variable) — so the returned object genuinely lacks it.
- The object-literal check rejects `balancePaisa` in a contact update. (Note: this "excess property" check applies to object literals written directly in the call; validating request bodies at run time is still required — {{ch:validation}}.)

**Common wrong approach:** `function updateContact(account: Account, update: Partial<Account>)` — which lets callers change the balance, the ID and the PIN hash.

</details>

### Exercise 3 — Exhaustive handling

**Objective:** practise discriminated unions with `assertNever`.

**What to build:** a union `Notification` with variants `{ channel: "email"; address: string }`, `{ channel: "sms"; phone: string }` and `{ channel: "push"; deviceToken: string }`. Write `sendNotification(n: Notification, message: string): string` with a `switch` and an `assertNever` default. Then add a fourth variant, `{ channel: "whatsapp"; phone: string }`, and observe the error before handling it.

<details>
<summary>Show the solution</summary>

```ts
type Notification =
  | { channel: "email"; address: string }
  | { channel: "sms"; phone: string }
  | { channel: "push"; deviceToken: string }
  | { channel: "whatsapp"; phone: string };

function assertNever(value: never): never {
  throw new Error(`Unhandled notification: ${JSON.stringify(value)}`);
}

function sendNotification(n: Notification, message: string): string {
  switch (n.channel) {
    case "email":
      return `Email to ${n.address}: ${message}`;
    case "sms":
      return `SMS to ${n.phone}: ${message}`;
    case "push":
      return `Push to device ${n.deviceToken.slice(0, 6)}...: ${message}`;
    case "whatsapp":
      return `WhatsApp to ${n.phone}: ${message}`;
    default:
      return assertNever(n);
  }
}

console.log(sendNotification({ channel: "whatsapp", phone: "0300-1234567" }, "Your order has shipped"));
```

**Output:**

```text
WhatsApp to 0300-1234567: Your order has shipped
```

Before the `"whatsapp"` case was added, TypeScript reported:

```text
error TS2345: Argument of type '{ channel: "whatsapp"; phone: string; }' is not assignable to parameter of type 'never'.
```

Walkthrough:

- After the handled cases, the type left in `default` is whatever was not handled. When everything is handled, it is `never`, and `assertNever(n)` compiles.
- Adding the WhatsApp variant without handling it left that variant in `default`, and the compiler flagged it.
- The device token is shortened in the message — a small habit of not printing secrets in full, even in logs.

**Common wrong approach:** `default: return "Unsupported channel";`. It compiles, and new channels are silently "unsupported" in production instead of being flagged at compile time.

</details>

### Exercise 4 — Stop mixing up IDs (debugging)

**Objective:** practise branded types.

**The scenario:** this function sometimes refunds the wrong customer. Find the bug, then use branded types so that the compiler would have caught it.

```ts
function refundOrder(orderId: string, customerId: string, amountPaisa: number): string {
  return `Refunding ${amountPaisa} paisa for order ${orderId} to customer ${customerId}`;
}

const order = { id: "ord_5521", customerId: "cus_204", totalPaisa: 309800 };
console.log(refundOrder(order.customerId, order.id, order.totalPaisa));
```

<details>
<summary>Show the solution</summary>

**The bug:** the arguments for `orderId` and `customerId` are swapped. Both are strings, so TypeScript cannot tell them apart, and the output is wrong:

```text
Refunding 309800 paisa for order cus_204 to customer ord_5521
```

**With branded types:**

```ts
type OrderId = string & { readonly __brand: "OrderId" };
type CustomerId = string & { readonly __brand: "CustomerId" };
type Paisa = number & { readonly __brand: "Paisa" };

const asOrderId = (value: string) => value as OrderId;
const asCustomerId = (value: string) => value as CustomerId;
const asPaisa = (value: number) => value as Paisa;

function refundOrder(orderId: OrderId, customerId: CustomerId, amount: Paisa): string {
  return `Refunding ${amount} paisa for order ${orderId} to customer ${customerId}`;
}

const order = {
  id: asOrderId("ord_5521"),
  customerId: asCustomerId("cus_204"),
  totalPaisa: asPaisa(309800),
};

refundOrder(order.customerId, order.id, order.totalPaisa);
```

```text
error TS2345: Argument of type 'CustomerId' is not assignable to parameter of type 'OrderId'.
```

Fixing the order of arguments:

```ts
console.log(refundOrder(order.id, order.customerId, order.totalPaisa));
```

**Output:**

```text
Refunding 309800 paisa for order ord_5521 to customer cus_204
```

Walkthrough:

- Each brand makes its string or number incompatible with the others at compile time; at run time they are still plain values.
- The brand is applied once, when data enters the system — in a real application, by the same validation step that checks the data ({{ch:validation}}), not with bare assertions scattered around.
- Another sound fix is an **options object** with named fields ({{ch:objects}}): `refundOrder({ orderId, customerId, amount })`. Branded types and named parameters together make this class of bug very hard to write.

</details>

## Summary

**Generics** let functions, types and classes work with many types while keeping the relationship between inputs and outputs: `firstItem<T>(items: T[]): T | undefined`. Type arguments are usually **inferred**. **Constraints** (`T extends { id: string }`) let generic code use properties. Generic types such as `ApiResponse<T>` and generic classes such as `TtlCache<K, V>` define a structure once; `Array<T>` and `Promise<T>` are built-in generics.

**`keyof`** gives a union of property names; **indexed access** `T[K]` gives a property's type; **`typeof`** in a type position derives a type from a value. **Utility types** — `Partial`, `Required`, `Readonly`, `Pick`, `Omit`, `Record`, `NonNullable`, `ReturnType`, `Parameters`, `Awaited`, `Exclude`, `Extract` — transform types and compose. **Exhaustiveness checking** with `never` and `assertNever` makes the compiler list every unhandled case of a union.

**Mapped types** transform every property (`[K in keyof T]`); **conditional types** choose types (`T extends U ? X : Y`) and distribute over unions; **`infer`** extracts types from inside others; **template literal types** build string unions. **`satisfies`** checks a value without losing its precise type; **overloads** give argument-dependent signatures; **branded types** stop mixing up values with the same underlying type, such as rupees and paisa or different IDs. Library types come from the package itself, **`.d.ts`** declaration files or **`@types`** packages; **module augmentation** extends them. **Decorators** annotate classes and methods, mainly through frameworks. Put type cleverness in shared foundations and keep application types plain — and remember that types guide, but only code and validation enforce.

## Key terms

- **Generic** — A function, type, interface or class that takes type parameters, so it can work with many types.
- **Type parameter** — A placeholder for a type, written in angle brackets, such as `<T>`.
- **Type argument** — The actual type that fills a type parameter, written explicitly or inferred.
- **Constraint** — A limit on a type parameter, written `T extends SomeType`.
- **Generic class** — A class with type parameters, such as `TtlCache<K, V>`.
- **Default type parameter** — A type used for a type parameter when none is given, such as `<T = string>`.
- **TTL (time to live)** — How long a cached value remains valid before it expires.
- **`keyof`** — A type operator producing a union of an object type's property names.
- **Indexed access type** — The type of a property of another type, written `T[K]`.
- **`typeof` (type position)** — A type operator giving the TypeScript type of a variable or value.
- **Utility type** — A built-in generic type that transforms another type, such as `Partial<T>` or `Omit<T, K>`.
- **`Partial` / `Required` / `Readonly`** — Utility types that make every property optional, required or read-only.
- **`Pick` / `Omit`** — Utility types that keep only, or remove, chosen properties.
- **`Record`** — A utility type for an object with given keys, each holding a given value type.
- **`ReturnType` / `Parameters` / `Awaited`** — Utility types giving a function's return type, its parameter types, or the value inside a promise.
- **`Exclude` / `Extract` / `NonNullable`** — Utility types that remove or keep union members, or remove `null` and `undefined`.
- **Exhaustiveness checking** — Making the compiler verify that every variant of a union is handled.
- **`assertNever`** — A helper that accepts only `never`, used in `default` branches to enforce exhaustiveness.
- **Mapped type** — A type that transforms each property of another type, using `[K in keyof T]`.
- **Conditional type** — A type that chooses between two types based on a condition, `T extends U ? X : Y`.
- **Distribution (conditional types)** — Applying a conditional type to each member of a union separately.
- **`infer`** — A keyword inside a conditional type that captures a type by matching.
- **Template literal type** — A string literal type built with backtick syntax from other types.
- **`satisfies`** — An operator that checks a value against a type while keeping the value's precise inferred type.
- **Function overload** — One of several signatures declared for a single function implementation.
- **Branded (nominal) type** — A type made incompatible with others of the same underlying type by an imaginary brand property.
- **Structural typing** — TypeScript's rule that types are compatible if their shapes match, regardless of their names.
- **Declaration file (`.d.ts`)** — A file containing only type information for code written elsewhere.
- **`declare`** — A keyword stating that something exists at run time and giving its type.
- **DefinitelyTyped / `@types`** — The community project and npm scope that provide type definitions for JavaScript packages.
- **Declaration merging** — Combining several declarations of the same interface into one.
- **Module augmentation** — Extending the types declared by another module.
- **Decorator** — A function applied with `@` to a class, method or property to modify or annotate it.

## What comes next

Part II is complete. You have learned JavaScript from your first variable to the event loop, and TypeScript from basic annotations to generics and type-level design. You can now write real programs.

The next part shifts from **the language** to **thinking**. In Part III, you will learn how engineers solve problems they have never seen before, how to measure whether code will stay fast as data grows, and the classic ways of organising data that every engineer — and every coding interview — relies on. It begins with **How Engineers Solve Problems**: a practical method for going from a blank page and an unfamiliar problem to a working, well-reasoned solution.
