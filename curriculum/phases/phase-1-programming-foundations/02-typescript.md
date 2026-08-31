# Phase 1 — Chapter 2: TypeScript

> *"TypeScript is JavaScript with syntax for types."* — TypeScript official documentation

---

## Chapter Overview

### Why TypeScript Exists

JavaScript was designed for small scripts. As web applications grew to millions of lines of code with hundreds of developers, JavaScript's dynamic typing became a liability. Bugs that would have been caught at compile time in Java or C# were only discovered in production — often by users.

TypeScript was created at Microsoft in 2012 by Anders Hejlsberg (also the creator of C# and Turbo Pascal). The goal: add a powerful, optional type system to JavaScript while maintaining 100% compatibility — TypeScript compiles to plain JavaScript, so it runs everywhere JavaScript runs.

**The problem TypeScript solves in one sentence:** Without types, you can't know what shape a value has until the program runs — TypeScript lets you know at the moment you write the code.

### Problems It Solves

**1. Catch errors before they reach production**
```typescript
// This JavaScript bug is invisible until runtime
function formatUser(user) {
  return user.firstName + " " + user.lastName; // what if user is null?
}

// TypeScript catches this at compile time
function formatUser(user: User | null) {
  if (!user) return "Anonymous"; // TypeScript forces you to handle null
  return user.firstName + " " + user.lastName;
}
```

**2. Self-documenting code — types ARE documentation**
The type signature of a function tells you everything you need to know:
```typescript
// Immediately clear what this does, what it takes, what it returns
async function getUserOrders(userId: string, options: OrderQueryOptions): Promise<Order[]>

// vs JavaScript — no information without reading the implementation
async function getUserOrders(userId, options)
```

**3. IDE intelligence (autocomplete, refactoring, navigation)**
TypeScript powers VS Code's IntelliSense. You get accurate autocomplete, inline documentation, go-to-definition, and safe rename-refactoring — because the IDE knows the exact type of every value.

**4. Safe refactoring at scale**
Renaming a property in TypeScript: the compiler tells you every place that uses it. In JavaScript, you can only hope grep finds them all.

**5. Better team collaboration**
With types, you can change an internal function's signature and immediately know which callers break — without running the application.

### Industry Adoption

TypeScript's adoption has been one of the most dramatic in software history:
- **2012**: Created at Microsoft
- **2016**: Angular adopted TypeScript as its primary language
- **2019**: Airbnb migrated to TypeScript; estimated 38% of Airbnb's bugs would have been caught
- **2020**: Deno (Node.js successor) built TypeScript support natively
- **2024**: TypeScript is the 5th most used language (Stack Overflow Survey), used by 43% of professional developers

**Notable adoption:**
- **Slack**: 44,000+ TypeScript files in their desktop app
- **Airbnb**: Estimated 38% bug prevention post-migration
- **Microsoft**: VS Code (2M+ lines of TypeScript), Azure SDK
- **Google**: Angular, Firebase SDK
- **Lyft**: Full backend migration
- **Bloomberg**: Financial terminal web platform
- **Shopify**: Polaris design system, Hydrogen framework

### Real-World Examples

**Example: The Airbnb migration story**
Airbnb migrated a large JavaScript codebase to TypeScript and published their findings: TypeScript would have prevented 38% of their production bugs. The bugs TypeScript catches most effectively:
- Null pointer exceptions (accessing `.x` on null/undefined)
- Wrong argument types (passing a string where a number is expected)
- Missing properties (forgetting required fields when constructing objects)
- API contract violations (calling a function wrong)

**Example: VS Code**
VS Code is 2+ million lines of TypeScript. It's built with TypeScript, for TypeScript development. The project demonstrates that TypeScript scales to enormous codebases maintained by hundreds of contributors.

### Companies Using It

**Tech Giants:** Microsoft, Google, Meta, Apple (Swift is similar philosophy)  
**Ride-sharing:** Uber (backend services), Lyft  
**Finance:** Bloomberg, Robinhood, Goldman Sachs (web tools)  
**E-commerce:** Shopify, Zalando  
**Developer Tools:** GitHub, GitLab, Vercel, Netlify  
**Startups:** Linear (productivity tool written entirely in TypeScript), Notion

### Alternatives

| Language | Type System | Compiles to JS | Key Difference |
|----------|------------|----------------|----------------|
| **Flow** | Structural | Yes | Meta's alternative; smaller community |
| **Elm** | Hindley-Milner | Yes | Pure functional; no runtime errors |
| **ReScript** | Hindley-Milner | Yes | OCaml-derived; very strict |
| **Dart** | Sound static | Yes | Google's language; Flutter |
| **PureScript** | Hindley-Milner | Yes | Haskell-inspired; very strict |
| **JavaScript + JSDoc** | None (optional) | N/A | Type hints in comments; no enforcement |

### When NOT to Use TypeScript

1. **Very small scripts** (< 100 lines, one-time automation): the setup overhead isn't worth it
2. **Rapid prototyping** where the data model changes every hour: types slow you down when you're still figuring out the shape of your data
3. **Projects with no build step tolerance**: TypeScript requires compilation; some environments don't permit a build process
4. **Library authors targeting non-TypeScript users**: you can ship `.d.ts` declaration files instead

### Future Relevance

TypeScript is not going anywhere. Several factors ensure its permanence:
- TC39 (the JavaScript standards committee) is actively working on **Type Annotations** (Proposal Stage 1) — native optional type syntax in JavaScript engines
- The TypeScript compiler is used in IDEs even for JavaScript files — it provides type inference from JSDoc comments
- TypeScript 5.x continues to add expressive power (const type parameters, variadic tuple types)
- The entire React, Angular, Vue, NestJS, Prisma ecosystems are TypeScript-first

---

## Beginner Theory

### Core Concepts

TypeScript adds a **type system** on top of JavaScript. The type system is:

**1. Optional and gradual**: You can adopt TypeScript file by file. Add `// @ts-check` to a `.js` file for TypeScript checking without renaming it. Migrate piece by piece.

**2. Structural (not nominal)**: TypeScript cares about the *shape* of a type, not its name. If two types have the same properties, they're compatible — even if one is named `Duck` and the other is named `Bird`.

**3. Erased at runtime**: TypeScript types only exist at compile time. After compilation, all type annotations are removed. The runtime behavior is identical to JavaScript.

**4. Inferred**: TypeScript is very good at figuring out types without you writing them. `const x = 5` — TypeScript knows `x` is `number` without you saying so.

### Terminology

| Term | Definition |
|------|-----------|
| **Type annotation** | Explicit type declaration: `let x: number = 5` |
| **Type inference** | TypeScript deducing the type: `const x = 5` → `x` is `number` |
| **Interface** | A named shape definition: `interface User { id: number; name: string }` |
| **Type alias** | A named type: `type UserId = string` |
| **Union type** | A value that can be one of several types: `string \| number` |
| **Intersection type** | A type that combines multiple types: `A & B` |
| **Generic** | A type that works with any type: `Array<T>`, `Promise<T>` |
| **Narrowing** | When TypeScript understands that inside an `if` block, a type is more specific |
| **Type guard** | A check that narrows a type: `typeof x === "string"` |
| **Assertion** | Telling TypeScript "trust me, this is type X": `value as string` |
| **Declaration file** | A `.d.ts` file that describes types for a JavaScript library |
| **Strict mode** | `"strict": true` in tsconfig — enables all strictness checks |
| **Discriminated union** | A union where each member has a unique "discriminant" property |
| **Mapped type** | A type derived by transforming properties of another type |
| **Conditional type** | A type that depends on a condition: `T extends U ? A : B` |
| **Template literal type** | A type defined with template literals: `` `get${string}` `` |

### Mental Models

**Mental Model 1: Types are sets of values**

Think of a type not as a label, but as a *set of all values that belong to it*:
```
string = { "hello", "world", "Alice", "" , ... } (infinite set)
number = { 1, 2, 3.14, -7, NaN, Infinity, ... }
boolean = { true, false }
never = {} (empty set — a value that can never exist)
unknown = all possible values (superset of everything)
```

**Union** (`A | B`) is the mathematical union of two sets — values belonging to either set.  
**Intersection** (`A & B`) is the mathematical intersection — values belonging to both sets.

**Mental Model 2: TypeScript is a two-layer language**

```
Layer 1: TypeScript (compile time)
  Types, interfaces, generics, type guards
  → ERASED during compilation

Layer 2: JavaScript (runtime)
  Values, objects, functions
  → What actually runs in the browser/Node.js
```

Variables exist at BOTH layers. Their type is layer 1; their value is layer 2. After compilation, layer 1 disappears.

**Mental Model 3: Structural typing is duck typing, but checked at compile time**

JavaScript has duck typing: "if it walks like a duck and quacks like a duck, it's a duck." TypeScript formalizes this: if an object has all the properties an interface requires, it satisfies that interface — regardless of what class it belongs to.

### Internal Architecture

```
TypeScript Source (.ts)
         │
         ▼
┌────────────────────────────────┐
│        TypeScript Compiler     │
│                                │
│  1. Scanner (tokenize)         │
│  2. Parser (AST)               │
│  3. Binder (symbol table)      │
│  4. Type Checker (the magic)   │
│  5. Emitter (JS output)        │
└────────────────────────────────┘
         │
    ┌────┴────────┐
    ▼             ▼
JavaScript    Type errors
(.js file)   (reported to IDE)
```

The **Type Checker** is where TypeScript's power lives. It:
- Walks the AST and assigns types to every node
- Infers types from assignments, function return values, control flow
- Reports errors when actual types don't match expected types
- Narrows types based on conditions (`if typeof x === "string"`)

### Simple Diagrams

**Structural Typing:**
```
interface HasName { name: string }
interface HasAge  { age: number }
interface User    { name: string; age: number; email: string }

User satisfies HasName? YES — it has `name: string`
User satisfies HasAge?  YES — it has `age: number`

const user: User = { name: "Alice", age: 30, email: "a@b.com" };
const named: HasName = user; // ✓ compatible — has `name`
```

**Type Narrowing Flow:**
```
function process(value: string | number) {
  //  value: string | number
  
  if (typeof value === "string") {
    //  value: string  ← TypeScript knows!
    return value.toUpperCase();
  }
  
  //  value: number  ← TypeScript narrowed by elimination
  return value * 2;
}
```

### Basic Workflows

```
1. Install: npm install -D typescript @types/node
2. Initialize: npx tsc --init  (creates tsconfig.json)
3. Write .ts files
4. Compile: npx tsc  (outputs .js files)
5. Or use ts-node for development: npx ts-node src/index.ts
6. Or use tsx (faster): npm install -D tsx; npx tsx src/index.ts
```

---

## Basic Examples

### Example 1: Basic Types and Annotations

```typescript
// Primitive types
let name:    string  = "Alice";
let age:     number  = 30;
let isAdmin: boolean = true;

// TypeScript infers when you initialize
const city = "London";  // inferred as string
const year = 2024;      // inferred as number

// Special types
let anything:  any;      // opt out of type checking (avoid!)
let something: unknown;  // type-safe alternative to any
let nothing:   never;    // a value that can never exist
let empty:     void;     // return type of functions that return nothing

// Arrays
const numbers: number[]      = [1, 2, 3];
const names:   Array<string> = ["Alice", "Bob"]; // generic syntax
const mixed:   (string | number)[] = ["a", 1, "b", 2];

// Tuples: fixed-length arrays with known types at each position
const point:      [number, number]          = [10, 20];
const namedPoint: [x: number, y: number]    = [10, 20]; // labeled
const entry:      [string, number]          = ["age", 30]; // like Object.entries

// Enums (compiled to JavaScript objects)
enum Direction { Up, Down, Left, Right }
enum HttpStatus { OK = 200, Created = 201, NotFound = 404 }

function move(dir: Direction) {
  if (dir === Direction.Up) console.log("moving up");
}

move(Direction.Up);
// move("Up");  // Error: Argument of type '"Up"' is not assignable to type 'Direction'

// String enums (preferred — more readable in debugging)
enum Role { User = "USER", Admin = "ADMIN", Moderator = "MODERATOR" }

// Const enums: fully erased at compile time (no JS object generated)
const enum Color { Red, Green, Blue }
const myColor = Color.Red; // compiled to: const myColor = 0;
```

### Example 2: Interfaces and Type Aliases

```typescript
// Interface: defines the shape of an object
interface User {
  readonly id:   number;      // cannot be changed after creation
  name:          string;
  email:         string;
  age?:          number;      // optional (can be undefined)
  role:          "user" | "admin" | "moderator";  // literal union
  createdAt:     Date;
  address?:      Address;
}

interface Address {
  street: string;
  city:   string;
  country: string;
  zip?:   string;
}

// Interface extension
interface Employee extends User {
  department: string;
  salary:     number;
  startDate:  Date;
}

// Interface merging (declaration merging — useful for extending library types)
interface User {
  preferences?: UserPreferences; // adds to existing User interface
}

// Type Alias: more flexible than interface
type UserId = string;
type Status = "pending" | "active" | "suspended" | "deleted";

// Union type
type StringOrNumber = string | number;

// Intersection type
type AdminUser = User & { permissions: string[] };

// Object type alias
type Point = { x: number; y: number };
type Point3D = Point & { z: number };

// Function type
type Formatter = (value: string, options?: FormatterOptions) => string;
type AsyncHandler = (req: Request, res: Response) => Promise<void>;

// Key rule: Interface vs Type Alias
// - Interface: prefer for object shapes, classes, public APIs (can be extended/merged)
// - Type: use for unions, intersections, primitives, mapped types, conditional types
```

### Example 3: Functions with TypeScript

```typescript
// Full type annotations
function divide(a: number, b: number): number {
  if (b === 0) throw new Error("Division by zero");
  return a / b;
}

// Optional and default parameters
function createUser(
  name: string,
  role: "user" | "admin" = "user",  // default value
  active?: boolean                   // optional (undefined if not provided)
): User {
  return { name, role, active: active ?? true };
}

// Rest parameters
function sumAll(...numbers: number[]): number {
  return numbers.reduce((acc, n) => acc + n, 0);
}

// Function overloads — multiple call signatures
function format(value: string): string;
function format(value: number, decimals: number): string;
function format(value: string | number, decimals?: number): string {
  if (typeof value === "string") return value.trim();
  return value.toFixed(decimals ?? 2);
}

format("  hello  ");    // "hello"
format(3.14159, 2);     // "3.14"
// format(true);        // Error: no matching overload

// Generic functions
function identity<T>(value: T): T {
  return value;
}

function first<T>(arr: T[]): T | undefined {
  return arr[0];
}

function map<T, U>(arr: T[], fn: (item: T, index: number) => U): U[] {
  return arr.map(fn);
}

// Usage — TypeScript infers the generic types
const num = identity(42);           // T inferred as number
const str = identity("hello");      // T inferred as string
const firstName = first(["Alice", "Bob"]); // T inferred as string

// Constrained generics
function getLength<T extends { length: number }>(item: T): number {
  return item.length;
}

getLength("hello");         // 5 — string has .length
getLength([1, 2, 3]);      // 3 — array has .length
// getLength(42);           // Error: number has no .length
```

### Example 4: Generics in Depth

```typescript
// Generic interfaces
interface Repository<T> {
  findById(id: string): Promise<T | null>;
  findAll(filter?: Partial<T>): Promise<T[]>;
  create(data: Omit<T, "id" | "createdAt">): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T>;
  delete(id: string): Promise<void>;
}

// Generic classes
class Stack<T> {
  private items: T[] = [];

  push(item: T): void      { this.items.push(item); }
  pop(): T | undefined     { return this.items.pop(); }
  peek(): T | undefined    { return this.items[this.items.length - 1]; }
  isEmpty(): boolean       { return this.items.length === 0; }
  get size(): number       { return this.items.length; }
}

const numStack = new Stack<number>();
numStack.push(1);
numStack.push(2);
console.log(numStack.pop()); // 2

// Generic constraints with keyof
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

const user = { name: "Alice", age: 30, email: "a@b.com" };
const name = getProperty(user, "name");  // string
const age  = getProperty(user, "age");   // number
// getProperty(user, "phone"); // Error: "phone" is not a key of typeof user

// Multiple generics
function zip<A, B>(a: A[], b: B[]): [A, B][] {
  return a.map((item, i) => [item, b[i]]);
}

const zipped = zip(["a", "b", "c"], [1, 2, 3]);
// [["a", 1], ["b", 2], ["c", 3]]
// Type: [string, number][]
```

### Example 5: Type Narrowing

```typescript
// TypeScript narrows types automatically based on checks

// 1. typeof narrowing
function process(input: string | number | boolean) {
  if (typeof input === "string") {
    return input.toUpperCase(); // input is string here
  }
  if (typeof input === "number") {
    return input.toFixed(2);   // input is number here
  }
  return input;                // input is boolean here
}

// 2. instanceof narrowing
function handleError(err: unknown) {
  if (err instanceof Error) {
    console.log(err.message);  // err is Error here — has .message
  } else if (typeof err === "string") {
    console.log(err);
  }
}

// 3. 'in' narrowing
interface Cat { meow(): void }
interface Dog { bark(): void }

function makeNoise(animal: Cat | Dog) {
  if ("meow" in animal) {
    animal.meow(); // animal is Cat here
  } else {
    animal.bark(); // animal is Dog here
  }
}

// 4. Discriminated unions — the most powerful narrowing pattern
type Shape =
  | { kind: "circle";    radius: number }
  | { kind: "rectangle"; width: number; height: number }
  | { kind: "triangle";  base: number;  height: number };

function area(shape: Shape): number {
  switch (shape.kind) {
    case "circle":
      return Math.PI * shape.radius ** 2; // shape.radius available
    case "rectangle":
      return shape.width * shape.height;  // shape.width, shape.height available
    case "triangle":
      return 0.5 * shape.base * shape.height;
    default:
      // Exhaustiveness check: if we add a new Shape variant and forget to handle it,
      // TypeScript will error here
      const _exhaustive: never = shape;
      throw new Error(`Unhandled shape: ${_exhaustive}`);
  }
}

// 5. User-defined type guards
function isUser(value: unknown): value is User {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as User).id === "number" &&
    typeof (value as User).name === "string"
  );
}

function processInput(input: unknown) {
  if (isUser(input)) {
    console.log(input.name); // input is User — TypeScript knows!
  }
}
```

---

## Intermediate Concepts

### Project Structure

```
my-app/
├── src/
│   ├── index.ts
│   ├── types/
│   │   ├── index.ts         ← barrel export for all types
│   │   ├── user.types.ts
│   │   ├── order.types.ts
│   │   └── api.types.ts
│   ├── interfaces/
│   │   └── repository.interface.ts
│   ├── config/
│   │   └── index.ts
│   ├── utils/
│   │   ├── validators.ts
│   │   └── formatters.ts
│   ├── services/
│   └── repositories/
├── tests/
├── tsconfig.json
├── tsconfig.build.json    ← excludes test files for production build
├── package.json
└── .eslintrc.js
```

### tsconfig.json — Essential Settings

```json
{
  "compilerOptions": {
    "target": "ES2022",              // output JS version
    "module": "commonjs",            // module system (use "ESNext" for ESM)
    "lib": ["ES2022"],               // available APIs
    "outDir": "./dist",              // compiled JS output
    "rootDir": "./src",              // source files
    "strict": true,                  // ALWAYS enable — enables all strictness checks
    "esModuleInterop": true,         // allows default import from CJS modules
    "skipLibCheck": true,            // skip type checking of .d.ts files
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,       // import JSON files
    "declaration": true,             // generate .d.ts files
    "declarationMap": true,          // generate .d.ts.map files
    "sourceMap": true,               // generate source maps
    "noUnusedLocals": true,          // error on unused variables
    "noUnusedParameters": true,      // error on unused parameters
    "noImplicitReturns": true,       // error if not all code paths return
    "noFallthroughCasesInSwitch": true, // error on switch fallthrough
    "exactOptionalPropertyTypes": true, // distinguish `?: T` from `: T | undefined`
    "paths": {                       // import aliases
      "@/*": ["./src/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

**What `"strict": true` enables:**
- `strictNullChecks`: null and undefined are not assignable to other types
- `strictFunctionTypes`: stricter checking of function types
- `strictBindCallApply`: stricter checking of bind, call, apply
- `strictPropertyInitialization`: class properties must be initialized
- `noImplicitAny`: error on inferred `any` types
- `noImplicitThis`: error when `this` has implicit `any` type

### Best Practices

**1. Avoid `any` — use `unknown` instead**
```typescript
// Bad — any is contagious and disables type checking
function parse(data: any) {
  return data.user.name; // no error even if data is null
}

// Good — unknown forces you to narrow before using
function parse(data: unknown) {
  if (typeof data !== "object" || data === null) throw new Error("Invalid data");
  const d = data as { user?: { name?: string } };
  return d.user?.name;
}
```

**2. Prefer interfaces for public APIs, types for internal shapes**
```typescript
// Public API (interface — can be extended by consumers)
export interface Logger {
  info(message: string, meta?: object): void;
  error(message: string, error?: Error): void;
}

// Internal implementation detail (type alias)
type LogLevel = "debug" | "info" | "warn" | "error";
type LogEntry = { level: LogLevel; message: string; timestamp: Date };
```

**3. Use utility types to derive types**
```typescript
interface User {
  id:        string;
  name:      string;
  email:     string;
  password:  string;
  createdAt: Date;
}

// Derive from User — don't duplicate
type PublicUser  = Omit<User, "password">;           // removes password
type UserInput   = Omit<User, "id" | "createdAt">;   // for creation
type UserUpdate  = Partial<UserInput>;                // all fields optional
type UserSummary = Pick<User, "id" | "name">;         // just these fields
type ReadOnlyUser = Readonly<User>;                   // no mutations allowed

// For API responses
type CreateUserDTO = Omit<User, "id" | "createdAt">;
type UpdateUserDTO = Partial<CreateUserDTO>;
```

**4. Never use non-null assertions unnecessarily**
```typescript
// Bad — crashes if element doesn't exist
const element = document.getElementById("myId")!;

// Good — handle the null case
const element = document.getElementById("myId");
if (!element) throw new Error("Element #myId not found");
```

### Type Assertions — What They Actually Do (and Don't)

A type assertion (`value as Type`) tells the compiler "trust me, I know this is type X" — it is purely a compile-time instruction with **zero runtime effect**. This is the single most important fact about assertions, and the source of most assertion-related bugs: TypeScript does not insert any check, conversion, or validation. If you're wrong, your program will crash later, somewhere far from the assertion itself.

```typescript
// The assertion compiles fine — but there's no actual User here at runtime
const data: unknown = JSON.parse('{"foo": "bar"}');
const user = data as User; // TypeScript now treats `user` as User — no check happened
console.log(user.name.toUpperCase()); // runtime crash: user.name is undefined

// Compare to a type GUARD (Example 5), which DOES check at runtime:
function isUser(value: unknown): value is User {
  return typeof value === "object" && value !== null && "name" in value;
}
if (isUser(data)) {
  console.log(data.name.toUpperCase()); // safe — actually verified at runtime
}

// `as const` is a different, safer use of the `as` keyword — it doesn't lie
// about a type, it narrows a literal to its most specific possible type
const config = { mode: "production" } as const;
// Without `as const`: config.mode is typed as `string`
// With `as const`:    config.mode is typed as the literal `"production"`
// This matters for things like Redux action types or config objects where
// you want TypeScript to catch a typo like "productoin" at the call site.

// Double assertion — a deliberate "escape hatch," used only when you are
// certain the compiler's structural check is wrong and you accept the risk
const el = document.getElementById("chart") as unknown as HTMLCanvasElement;
// Going through `unknown` is required because TypeScript blocks assertions
// between two types it considers completely unrelated — this override
// should be rare and always come with a comment explaining why.
```

**Rule of thumb:** use a type guard (runtime-checked) whenever the data came from outside your program (API response, JSON.parse, user input). Reserve `as` for cases where YOU, the developer, have information the compiler can't infer (e.g., you just confirmed via `document.getElementById` that this specific element is a canvas, and TypeScript can only infer `HTMLElement | null`).

### Writing Declaration Files (`.d.ts`)

Not every JavaScript library ships with TypeScript types. A declaration file describes the *shape* of existing JavaScript code without containing any implementation — it's pure type information the compiler reads to type-check code that calls into untyped JS.

```typescript
// Suppose you depend on a plain JavaScript library with no types:
// node_modules/legacy-math-lib/index.js
//   module.exports.add = (a, b) => a + b;
//   module.exports.PI = 3.14159;

// Without a declaration file, TypeScript treats the whole import as `any` —
// you get zero autocomplete and zero type checking on `add` or `PI`.

// Fix: write a declaration file describing its shape.
// types/legacy-math-lib.d.ts
declare module "legacy-math-lib" {
  export function add(a: number, b: number): number;
  export const PI: number;
}

// Now this works with full type safety, even though the library itself
// has no TypeScript in it at all:
import { add, PI } from "legacy-math-lib";
add(2, 3);        // typed as (a: number, b: number) => number
add("2", 3);      // Error — TypeScript now catches this
```

```typescript
// Global declaration files — augmenting the global scope (e.g., a script
// tag library that attaches itself to `window`)
// types/globals.d.ts
declare global {
  interface Window {
    myAnalyticsLib: {
      track(event: string, properties?: Record<string, unknown>): void;
    };
  }
}
export {}; // an empty export makes this file a MODULE, required for `declare global` to work

// Now `window.myAnalyticsLib.track(...)` is fully typed anywhere in the project
```

In practice, most popular libraries already have community-maintained types published separately under `@types/` (e.g., `npm install -D @types/lodash`) — you only write your own `.d.ts` when a library has no types at all, whether from the maintainer or the community.

**5. Use `satisfies` operator (TypeScript 4.9+)**
```typescript
// `satisfies` validates against a type but keeps the inferred type
const palette = {
  red:   [255, 0,   0],
  green: "#00ff00",
  blue:  [0,   0, 255]
} satisfies Record<string, string | number[]>;

// Now TypeScript knows palette.red is number[] (not string | number[])
palette.red.map(x => x); // works!
// palette.red.toUpperCase(); // Error — it's number[], not string
```

### Mapped Types

```typescript
// Mapped types: transform properties of a type
type Optional<T> = {
  [K in keyof T]?: T[K];  // make all properties optional
};

type Required<T> = {
  [K in keyof T]-?: T[K]; // remove optional (built-in)
};

type Readonly<T> = {
  readonly [K in keyof T]: T[K]; // make all properties readonly (built-in)
};

type Nullable<T> = {
  [K in keyof T]: T[K] | null; // allow null for every property
};

// Advanced: conditional mapping
type NonNullableProps<T> = {
  [K in keyof T]: NonNullable<T[K]>; // remove null/undefined from all values
};

// Remapping keys (TypeScript 4.1+)
type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};

interface User { name: string; age: number; }
type UserGetters = Getters<User>;
// { getName: () => string; getAge: () => number }
```

### Conditional Types

```typescript
// type A extends B ? if_true : if_false
type IsString<T> = T extends string ? true : false;

type A = IsString<string>;   // true
type B = IsString<number>;   // false
type C = IsString<"hello">;  // true (literal string extends string)

// Infer keyword — extract types from other types
type ReturnType<T> = T extends (...args: any[]) => infer R ? R : never;
type Parameters<T> = T extends (...args: infer P) => any ? P : never;
type Awaited<T>    = T extends Promise<infer U> ? U : T;

function fetchUser(): Promise<User> { ... }
type FetchUserReturn = Awaited<ReturnType<typeof fetchUser>>; // User

// Distributive conditional types
type ToArray<T> = T extends any ? T[] : never;
type NumberOrStringArray = ToArray<number | string>; // number[] | string[]
```

### Template Literal Types

```typescript
// Combine string literals with template syntax
type EventName = "click" | "focus" | "blur";
type EventHandler = `on${Capitalize<EventName>}`;
// "onClick" | "onFocus" | "onBlur"

// HTTP method routes
type HttpMethod = "get" | "post" | "put" | "delete";
type RouteKey = `${HttpMethod}:${string}`;

// Record<RouteKey, Handler> — ensures all routes follow the pattern

// Extract parts of a string type
type ExtractRouteParam<T extends string> =
  T extends `${string}:${infer Param}/${string}` ? Param :
  T extends `${string}:${infer Param}` ? Param :
  never;

type Param = ExtractRouteParam<"/users/:userId/orders/:orderId">;
// "userId" | "orderId"
```

### Error Handling with TypeScript

```typescript
// TypeScript can't know what type `catch (err)` is — use `unknown`
async function fetchData(url: string): Promise<Data> {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new HttpError(response.status, await response.text());
    }

    return response.json() as Promise<Data>;
  } catch (err) {
    // err is `unknown` — must narrow before using
    if (err instanceof HttpError) {
      throw err; // known error, rethrow
    }
    if (err instanceof TypeError) {
      throw new NetworkError("Network request failed", { cause: err });
    }
    throw new UnknownError("Unexpected error", { cause: err });
  }
}

// Result type pattern (like Rust's Result<T, E>)
type Result<T, E extends Error = Error> =
  | { ok: true;  value: T }
  | { ok: false; error: E };

async function safeParseUser(raw: unknown): Promise<Result<User>> {
  try {
    const user = parseUser(raw); // throws on invalid input
    return { ok: true, value: user };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

// Consumer never needs a try/catch
const result = await safeParseUser(rawData);
if (result.ok) {
  console.log(result.value.name);
} else {
  console.error(result.error.message);
}
```

---

## Advanced Concepts

### Variance (Covariance and Contravariance)

```typescript
// Covariance: output position — subtypes are assignable to supertypes
// A type is covariant when you can use a more specific type

interface Animal { name: string }
interface Dog extends Animal { breed: string }

// Functions returning more specific types are assignable to less specific
type AnimalFactory = () => Animal;
type DogFactory    = () => Dog;

const factory: AnimalFactory = (): Dog => ({ name: "Rex", breed: "Lab" });
// OK — DogFactory is assignable to AnimalFactory (covariant return type)

// Contravariance: input position — supertypes are assignable to subtypes
type AnimalHandler = (animal: Animal) => void;
type DogHandler    = (dog: Dog) => void;

const handler: DogHandler = (animal: Animal) => { console.log(animal.name); };
// OK — AnimalHandler is assignable to DogHandler (contravariant parameter type)
// A function that handles ANY Animal can certainly handle a Dog
```

### Declaration Merging and Module Augmentation

```typescript
// Augmenting existing library types
// In your project: express.d.ts

import "express";

declare module "express" {
  interface Request {
    user?: AuthenticatedUser;   // add custom properties to Express Request
    requestId: string;
  }
}

// Now throughout your code:
app.use((req, res, next) => {
  req.requestId = generateId(); // TypeScript knows this exists!
  next();
});

app.get("/profile", (req, res) => {
  if (!req.user) return res.status(401).json({ error: "Unauthenticated" });
  res.json(req.user); // req.user is AuthenticatedUser
});
```

### Decorators (TypeScript 5.0 — Stage 3 Proposal)

```typescript
// Decorators augment classes and methods
// Commonly used in NestJS, TypeORM, class-validator

// Method decorator
function log(target: any, key: string, descriptor: PropertyDescriptor) {
  const original = descriptor.value;
  descriptor.value = function(...args: unknown[]) {
    console.log(`Calling ${key} with`, args);
    const result = original.apply(this, args);
    console.log(`${key} returned`, result);
    return result;
  };
  return descriptor;
}

// Class decorator
function singleton<T extends { new(...args: any[]): {} }>(constructor: T) {
  let instance: T;
  return class extends constructor {
    constructor(...args: any[]) {
      if (instance) return instance;
      super(...args);
      instance = this as unknown as T;
    }
  };
}

@singleton
class Database {
  private connection: Connection;

  @log
  async query(sql: string, params: unknown[]) {
    return this.connection.execute(sql, params);
  }
}
```

### Advanced Generic Patterns

```typescript
// Builder pattern with fluent generics
class QueryBuilder<T, Selected extends keyof T = never> {
  private _conditions: string[] = [];
  private _selected:   (keyof T)[] = [];

  select<K extends keyof T>(...keys: K[]): QueryBuilder<T, Selected | K> {
    this._selected.push(...keys);
    return this as any;
  }

  where(condition: string): this {
    this._conditions.push(condition);
    return this;
  }

  build(): Pick<T, Selected>[] {
    // ... execute query
    return [];
  }
}

interface User { id: string; name: string; email: string; password: string }

const result = new QueryBuilder<User>()
  .select("id", "name", "email")  // Selected = "id" | "name" | "email"
  .where("age > 18")
  .build();
// result: Pick<User, "id" | "name" | "email">[] — TypeScript knows the exact shape!
```

### The `infer` keyword — Advanced Usage

```typescript
// Extract element type from array
type ArrayElement<T> = T extends (infer E)[] ? E : never;
type NumberElement = ArrayElement<number[]>; // number

// Unwrap nested types
type Unbox<T> =
  T extends Promise<infer U>    ? Unbox<U> :  // recursively unwrap
  T extends Array<infer U>      ? Unbox<U> :
  T;

type A = Unbox<Promise<Promise<string>>>;  // string
type B = Unbox<string[][]>;               // string

// Constructor parameters
type ConstructorParameters<T extends new (...args: any[]) => any> =
  T extends new (...args: infer P) => any ? P : never;

class User {
  constructor(public name: string, public age: number) {}
}

type UserConstructorParams = ConstructorParameters<typeof User>; // [string, number]
```

---

## Industry Usage

### Startup Usage
TypeScript is increasingly the default for new startups:
- **Vercel, Netlify**: TypeScript-first infrastructure platforms
- **Linear**: Project management tool written 100% TypeScript — all 150k+ lines
- **PlanetScale**: Database platform frontend and backend in TypeScript

Startups choose TypeScript for:
- Smaller teams moving faster with safety
- Better onboarding (types serve as documentation)
- Refactoring confidence as the product evolves rapidly

### Enterprise Usage
Enterprise adoption is driven by:
- **Code review efficiency**: Reviewers can trust types, focus on logic
- **Large team coordination**: 50+ engineers working on the same codebase need contract guarantees
- **Stability**: Types prevent entire categories of bugs in financial, healthcare, logistics systems

**Microsoft** uses TypeScript for Azure SDKs, VS Code, Office 365 web apps, Teams  
**Google** uses TypeScript for Angular, Firebase SDKs  
**Salesforce** uses TypeScript for Lightning Web Components

### FinTech Usage
FinTech has strict accuracy requirements — a type error in a financial calculation can cost millions:
- **Stripe**: TypeScript for payment processing SDKs
- **Robinhood**: Portfolio calculations, order management
- **Plaid**: Financial data API clients
- **Coinbase**: Cryptocurrency exchange frontend and BFF layer

TypeScript in FinTech: the `Decimal` type prevents floating-point arithmetic errors in financial calculations; discriminated unions model complex financial instruments precisely.

### Healthcare
- **Epic Systems**: Patient portal, EHR (Electronic Health Record) web interfaces
- **Veracyte**: Genomic diagnostics platforms
- HL7 FHIR resource types modeled as TypeScript interfaces — ensures API compliance

---

## Alternatives

### Flow (Meta)
**What:** Facebook's (now Meta's) type checker for JavaScript  
**Pros:** Slightly different type system; sound types  
**Cons:** Much smaller community; fewer library types; Meta is the primary maintainer  
**Verdict:** TypeScript has effectively won this battle. Flow is still used internally at Meta but rarely chosen for new projects.

### JSDoc Types
**What:** Type annotations in JavaScript comments, checked by TypeScript's `--checkJs` flag  
**Pros:** No build step; incremental adoption; works with plain `.js` files  
**Cons:** Verbose syntax; less expressive than TypeScript's type system  
**When to use:** Libraries targeting non-TypeScript users (ship `.js` + `.d.ts`); internal scripts where a build step is undesirable

### Elm
**What:** A strongly-typed functional language that compiles to JavaScript  
**Pros:** Guarantees zero runtime exceptions (literally); elegant type system; built-in The Elm Architecture  
**Cons:** Steep learning curve; small ecosystem; cannot use npm packages directly  
**When to use:** Applications where correctness is paramount and you're willing to commit to the Elm ecosystem

### Decision Matrix

| Need | TypeScript | Flow | JSDoc | Elm |
|------|-----------|------|-------|-----|
| Large team | ✓✓✓ | ✓✓ | ✓ | ✓✓ |
| Existing JS codebase | ✓✓✓ | ✓✓ | ✓✓✓ | ✗ |
| npm ecosystem access | ✓✓✓ | ✓✓ | ✓✓✓ | ✗ |
| No build step | ✗ | ✗ | ✓✓✓ | ✗ |
| Type safety | ✓✓ | ✓✓ | ✓ | ✓✓✓ |
| IDE tooling | ✓✓✓ | ✓✓ | ✓✓ | ✓✓ |
| Community size | ✓✓✓ | ✓ | ✓✓✓ | ✓ |

---

## Security

### Security Benefits of TypeScript

**1. Prevents type confusion attacks**
Type confusion is a class of vulnerability where a program uses a value assuming it has one type when it actually has another. TypeScript eliminates this in typed code paths.

**2. Forces null checks**
With `strictNullChecks`, you cannot access properties on potentially-null values without checking first — preventing null pointer exceptions that could cause crashes or unexpected behavior.

**3. Safer JSON parsing**
```typescript
// Without TypeScript: silently accept any shape from JSON.parse
const data = JSON.parse(untrustedInput);
return data.user.id; // crash if shape is wrong

// With TypeScript + runtime validation (Zod)
import { z } from "zod";

const UserSchema = z.object({
  id:    z.string().uuid(),
  name:  z.string().min(1).max(100),
  email: z.string().email(),
  role:  z.enum(["user", "admin"])
});

// This validates AND types the result
const user = UserSchema.parse(JSON.parse(untrustedInput));
// If invalid, throws ZodError with clear error messages
// If valid, user has exact TypeScript type: { id: string; name: string; email: string; role: "user" | "admin" }
```

**4. API Contract Enforcement (with tRPC)**
```typescript
// tRPC: end-to-end type safety from server to client
// The client automatically knows the exact types of every API endpoint

const appRouter = router({
  getUser: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(({ input }) => userService.findById(input.id)),

  createUser: protectedProcedure
    .input(z.object({ name: z.string(), email: z.string().email() }))
    .mutation(({ input, ctx }) => userService.create(input, ctx.user))
});

// Client — types automatically inferred from server definition
const { data: user } = trpc.getUser.useQuery({ id: "123" });
// user is User | undefined — no manual type annotation needed
```

### Environment Variable Security

```typescript
// Strongly-typed environment configuration
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV:      z.enum(["development", "test", "production"]),
  PORT:          z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL:  z.string().url(),
  JWT_SECRET:    z.string().min(32), // enforce minimum length
  REDIS_URL:     z.string().url().optional(),
  LOG_LEVEL:     z.enum(["debug", "info", "warn", "error"]).default("info")
});

export type Env = z.infer<typeof envSchema>;

let env: Env;
try {
  env = envSchema.parse(process.env);
} catch (err) {
  console.error("Invalid environment configuration:");
  console.error(err.flatten().fieldErrors);
  process.exit(1);
}

export { env };
```

---

## Performance

### TypeScript Has Zero Runtime Overhead
Types are erased at compile time. A TypeScript file compiled to JavaScript is identical in performance to hand-written JavaScript. There is no runtime type checking unless you add it explicitly (e.g., with Zod).

### Build Performance

**Development** (use `ts-node` / `tsx` / `esbuild` for fast transpilation):
```bash
# tsx — uses esbuild under the hood, very fast
npm install -D tsx
npx tsx src/index.ts

# ts-node with swc (5-10x faster than tsc)
npm install -D ts-node @swc/core @swc/helpers
npx ts-node --swc src/index.ts
```

**Production** (use `tsc` for type checking, `esbuild` or `swc` for transpilation):
```bash
# Check types only (no output)
npx tsc --noEmit

# Compile with esbuild (100x faster than tsc)
npx esbuild src/index.ts --bundle --platform=node --outfile=dist/index.js
```

**Incremental compilation:**
```json
{
  "compilerOptions": {
    "incremental": true,             // cache previous compilation
    "tsBuildInfoFile": ".tsbuildinfo" // where to store cache
  }
}
```

**Project references (monorepos):**
```json
{
  "references": [
    { "path": "../shared" },
    { "path": "../api" }
  ]
}
```

### Type Checking Performance Tips

1. Avoid recursive types that are too deep — TypeScript has a recursion limit
2. Use `interface` over complex type aliases for object shapes (faster assignability checks)
3. Use `skipLibCheck: true` to skip `.d.ts` files from `node_modules`
4. Enable `isolatedModules: true` for faster parallel type stripping

---

## Debugging

### TypeScript-Specific Issues

**Issue 1: `Type 'X' is not assignable to type 'Y'`**
```typescript
// Error example
interface User { name: string }
const obj = { name: "Alice", extraProp: 1 }; // object literal

function greet(user: User) { console.log(user.name); }
greet(obj); // ERROR? No — this works (excess properties allowed from variable)
greet({ name: "Alice", extraProp: 1 }); // ERROR — excess property in literal

// Why? Object literal checking is stricter.
// Fix 1: assign to variable first
// Fix 2: use as User
// Fix 3: add the property to User interface
```

**Issue 2: `Object is possibly 'undefined'`**
```typescript
// Error
const arr = [1, 2, 3];
const first = arr.find(x => x > 1);
console.log(first.toFixed(2)); // Error: first is number | undefined

// Fix — narrow the type
if (first !== undefined) {
  console.log(first.toFixed(2));
}
```

**Issue 3: Generic type inference fails**
```typescript
// Error — TypeScript can't infer T
function wrap<T>(value: T) { return { value }; }

const result = wrap(null); // T is inferred as null, not the type you want

// Fix — provide the type explicitly
const result = wrap<User | null>(null);
```

### tsconfig Diagnostics

```bash
# Check what files TypeScript is including
npx tsc --listFiles

# See what's slowing down compilation
npx tsc --diagnostics

# Show why a file is included
npx tsc --explainFiles
```

---

## Interview Preparation

### Beginner Questions

**Q1: What is the difference between `interface` and `type` in TypeScript?**

A: Both define shapes, but they differ in capability and convention:
- `interface` can be extended with `extends` and is subject to declaration merging (adding properties in multiple declarations merges them)
- `type` can represent unions, intersections, primitives, and can use conditional and mapped types
- Prefer `interface` for object shapes and public APIs; `type` for everything else

**Q2: What is the difference between `any` and `unknown`?**

A: Both accept any value, but `unknown` is type-safe:
- `any` bypasses all type checking — you can call any method, access any property. Contagious: functions receiving `any` return `any`.
- `unknown` forces you to narrow the type before using it. A function parameter of `unknown` type requires explicit checks before operations.

**Q3: What is the purpose of `readonly` and `const`?**

A: `const` is a JavaScript declaration that prevents reassignment of a variable binding. `readonly` is a TypeScript type modifier that prevents reassignment of an object property. They work at different levels: `const` at the binding level, `readonly` at the type level.

### Intermediate Questions

**Q4: Explain TypeScript's structural typing system.**

A: TypeScript uses structural typing ("duck typing"): a value satisfies a type if it has at least the required structure, regardless of class hierarchy. Two classes with the same properties are mutually assignable even if unrelated. This matches JavaScript's duck typing philosophy.

**Q5: What are generics and why are they useful?**

A: Generics are type parameters that allow functions, interfaces, and classes to work with any type while maintaining type safety. Without generics, you'd either use `any` (losing type safety) or duplicate code for each type. Generics give you the flexibility of `any` with the safety of specific types — the type is determined at the call site.

**Q6: Explain discriminated unions and when you'd use them.**

A: A discriminated union is a union type where each member has a common "discriminant" literal property. TypeScript uses this property to narrow the type in switch/if statements. Used for modeling state machines, API responses, command patterns — any scenario where you have multiple variants of a type with different shapes. The compiler enforces exhaustiveness checking.

### Senior Questions

**Q7: How would you model complex business rules in the type system?**

A: Use branded types (nominal types via branding), discriminated unions, and template literal types. Example: prevent passing a raw string where a validated email is required:

```typescript
type Email = string & { __brand: "Email" };
function parseEmail(input: string): Email {
  if (!/.+@.+/.test(input)) throw new Error("Invalid email");
  return input as Email;
}
function sendEmail(to: Email, body: string): void { ... }

const email = parseEmail("alice@example.com"); // Email
sendEmail(email, "Hello!");                    // works
sendEmail("alice@example.com", "Hello!");      // Error! string is not Email
```

**Q8: How does TypeScript's control flow analysis work?**

A: The TypeScript compiler performs control flow analysis (CFA) — it tracks the type of a variable through every branch of code execution. After a `typeof x === "string"` check, TypeScript knows `x` is `string` in that branch. After a `return` or `throw`, variables that were narrowed in the eliminated branch are not accessible. TypeScript models every possible path through the code.

### System Design Questions

**Q9: Design a type-safe event system.**

```typescript
interface EventMap {
  "user:created":  { user: User };
  "user:deleted":  { userId: string };
  "order:created": { order: Order };
  "payment:failed": { orderId: string; error: string };
}

class TypedEventEmitter {
  private handlers = new Map<string, Function[]>();

  on<K extends keyof EventMap>(event: K, handler: (data: EventMap[K]) => void): void {
    if (!this.handlers.has(event)) this.handlers.set(event, []);
    this.handlers.get(event)!.push(handler);
  }

  emit<K extends keyof EventMap>(event: K, data: EventMap[K]): void {
    this.handlers.get(event)?.forEach(h => h(data));
  }
}

const emitter = new TypedEventEmitter();
emitter.on("user:created", ({ user }) => {
  console.log(user.name); // TypeScript knows user is User
});
emitter.emit("user:created", { user: { id: "1", name: "Alice" } });
// emitter.emit("user:created", { orderId: "1" }); // Error!
```

---

## Practical Tasks

### Beginner (10 Tasks)

1. **Annotate a JavaScript file**: Take a 50-line JavaScript file (utility functions) and add full TypeScript type annotations without changing any logic.
2. **Model a User domain**: Create interfaces for `User`, `Address`, `UserRole`, and `UserProfile` with appropriate optional and readonly fields.
3. **Typed array operations**: Write typed versions of `map`, `filter`, and `reduce` functions.
4. **Enum and discriminated union**: Model HTTP status codes as a `const enum` and API response types as a discriminated union.
5. **Generic pair**: Create a generic `Pair<A, B>` type and a `swap` function that swaps the elements of a pair.
6. **Type guard functions**: Write type guards for `isUser`, `isArray`, `isNonNullObject`.
7. **Utility type practice**: Given a `Product` interface, create `CreateProductDTO`, `UpdateProductDTO`, and `ProductSummary` types using only TypeScript utility types.
8. **Strict null handling**: Rewrite a set of functions that use `any` to use proper nullable types with optional chaining.
9. **Function overloads**: Write a `parse` function with overloads for parsing strings to numbers, dates, and booleans.
10. **tsconfig setup**: Configure a TypeScript project from scratch with strict mode, path aliases, and source maps.

### Intermediate (10 Tasks)

1. **Generic Repository**: Implement a generic `Repository<T>` interface and a concrete `InMemoryRepository<T>` that implements it.
2. **Mapped type — Required**: Implement `DeepRequired<T>` that makes all nested properties required.
3. **Conditional type — Flatten**: Implement `Flatten<T>` that unwraps nested arrays: `Flatten<number[][][]>` = `number`.
4. **Builder pattern**: Implement a type-safe `QueryBuilder<T>` that tracks which columns were selected in the type system.
5. **Branded types**: Create branded types for `UserId`, `Email`, `Url`, `PositiveNumber` and factory functions that validate before branding.
6. **Zod integration**: Define Zod schemas for User creation and update, and derive TypeScript types from them.
7. **Typed EventEmitter**: Build a fully typed EventEmitter where the event map determines the handler signature.
8. **State machine**: Model a finite state machine for an order workflow (`pending → confirmed → shipped → delivered`) where only valid transitions are allowed by the type system.
9. **Template literal types**: Define a type that accepts only valid CSS property names (e.g., `"background-color"`, `"font-size"`).
10. **Module augmentation**: Extend the Express `Request` type to include a `user` property and `requestId`.

### Advanced (10 Tasks)

1. **Type-safe SQL builder**: Implement a query builder where the `select` method's argument list must be valid columns of the given table type, and the result type is narrowed accordingly.
2. **Recursive type — JSON**: Implement a `JSONValue` type that correctly models all valid JSON values (including nested objects and arrays).
3. **Variadic tuple types**: Implement a `concat` function that merges two tuples and returns the correct tuple type.
4. **Plugin system**: Design a plugin architecture where plugins are registered with their own types and the host system is typed to include all registered plugin contributions.
5. **Type-level arithmetic**: Implement `Add<A, B>` and `Length<T>` at the type level using tuple manipulation.
6. **Opaque types / Branding**: Design a system where `Kilometers` and `Miles` are both numbers but cannot be accidentally mixed.
7. **Derive form types**: Given any Zod schema, automatically derive form field types, validation messages, and default values.
8. **Type-safe router**: Implement a type-safe HTTP router where route parameters are extracted from the path string and passed as typed arguments to the handler.
9. **Covariance/contravariance test**: Write unit tests (using `@ts-expect-error`) that verify your type hierarchy has the correct variance properties.
10. **TypeScript compiler plugin**: Write a TypeScript transformer plugin that enforces a custom rule (e.g., "all exported functions must have a JSDoc comment").

---

## Mini Project

### Typed Todo API

Build a fully typed REST API for managing todos with TypeScript.

**Types:**
```typescript
// types/todo.types.ts
export type TodoStatus = "pending" | "in_progress" | "done" | "cancelled";
export type Priority   = "low" | "medium" | "high" | "critical";

export interface Todo {
  readonly id:    string;
  title:          string;
  description?:   string;
  status:         TodoStatus;
  priority:       Priority;
  tags:           string[];
  readonly createdAt: Date;
  updatedAt:      Date;
  dueDate?:       Date;
}

export type CreateTodoInput = Pick<Todo, "title" | "priority"> &
  Partial<Pick<Todo, "description" | "tags" | "dueDate">>;

export type UpdateTodoInput = Partial<Omit<Todo, "id" | "createdAt">>;
```

**Features:**
- Zod validation schemas derived from the TypeScript types
- Generic in-memory repository with typed CRUD
- Strongly typed Express routes
- Typed error handling with discriminated union error types

---

## Production Project

### Multi-Tenant SaaS API with TypeScript

Build a production-grade multi-tenant API where TypeScript's type system enforces:

1. **Tenant isolation**: Every database query is parameterized with a `TenantId` branded type — you cannot accidentally query across tenants
2. **Permission modeling**: A discriminated union `Permission` type models all possible permissions; a function `hasPermission(user: User, permission: Permission)` is checked at every sensitive endpoint
3. **API versioning**: Route handlers have typed request and response bodies per API version, with a type-safe migration adapter between versions
4. **Audit logging**: A generic `AuditEvent<T>` type captures before/after state for any entity change, ensuring no audit log is accidentally incomplete

---

## Capstone Project

### Type-Safe Full-Stack Monorepo

Build a monorepo with shared TypeScript types across frontend and backend:

```
packages/
├── shared/           ← shared types, validators, utilities
│   ├── types/        ← Domain types (User, Order, Product...)
│   └── schemas/      ← Zod schemas (validated and types derived)
├── api/              ← NestJS backend (uses shared types)
├── web/              ← Next.js frontend (uses shared types)
└── mobile/           ← React Native (uses shared types)
```

**The key feature**: A single source of truth for types. When you change a `User` field in `packages/shared/types`, TypeScript immediately highlights every place in API, web, and mobile that needs to be updated. No manual synchronization, no runtime surprises.

---

## Self Assessment

1. What is the difference between a `type` alias and an `interface`? When do you choose each?
2. What does `strict: true` in tsconfig enable? Name at least 4 checks it turns on.
3. What is structural typing? How does it differ from nominal typing?
4. What is the difference between `any` and `unknown`? When would you use each?
5. Write a generic function `pick<T, K extends keyof T>(obj: T, keys: K[]): Pick<T, K>`.
6. What is a discriminated union? Give a real-world example where it's useful.
7. What is the `never` type and when does TypeScript assign it?
8. What are utility types? Name and describe 8 built-in utility types.
9. What is a mapped type? Write a `Nullable<T>` mapped type.
10. What is a conditional type? Write `IsArray<T>` that returns `true` if T is an array type.
11. What is the `infer` keyword? Give an example.
12. What is declaration merging? When is it useful?
13. What is module augmentation? How would you add properties to Express's `Request` type?
14. What is the `satisfies` operator (TS 4.9)? How does it differ from `as`?
15. What is a type guard? Write a user-defined type guard for `User`.
16. What is the Temporal Dead Zone in TypeScript? (Same as JavaScript — verify understanding)
17. What is a template literal type? Give an example.
18. How do you enforce exhaustive checking in a switch statement on a discriminated union?
19. What is the difference between `Partial<T>` and `Required<T>`?
20. How would you create a "branded" or "opaque" type in TypeScript?

---

## Cheat Sheet

### Basic Types
```typescript
let s: string  = "hello";
let n: number  = 42;
let b: boolean = true;
let a: any     = anything;   // avoid
let u: unknown = anything;   // safe — must narrow before use
let v: void;                 // function return type (returns nothing)
let nv: never;               // unreachable / empty type

// Literal types
type Dir = "north" | "south" | "east" | "west";
type One = 1;

// Arrays
let arr:  number[]       = [1, 2, 3];
let arr2: Array<string>  = ["a"];

// Tuples
let pair: [string, number] = ["hello", 42];
```

### Interface vs Type
```typescript
interface User { name: string }
interface User { age: number }  // merges! { name, age }

type Id = string | number;      // union
type Pt = { x: number } & { y: number }; // intersection

// Both can extend:
interface AdminUser extends User { perms: string[] }
type AdminUser = User & { perms: string[] }
```

### Utility Types
```typescript
Partial<T>         // all optional
Required<T>        // all required
Readonly<T>        // all readonly
Pick<T, K>         // keep only K keys
Omit<T, K>         // remove K keys
Record<K, V>       // { [k: K]: V }
Exclude<T, U>      // T excluding U (union subtraction)
Extract<T, U>      // T intersected with U
NonNullable<T>     // remove null and undefined
ReturnType<F>      // return type of function F
Parameters<F>      // parameter types of function F as tuple
InstanceType<C>    // instance type of class C
Awaited<T>         // unwrap Promise<T> recursively
```

### Generics
```typescript
function id<T>(v: T): T { return v; }

// Constrained
function len<T extends { length: number }>(v: T): number { return v.length; }

// Default generic
function wrap<T = string>(v: T) { return { value: v }; }

// keyof
function get<T, K extends keyof T>(obj: T, key: K): T[K] { return obj[key]; }
```

### Narrowing
```typescript
typeof x === "string"        // type guard
x instanceof Error           // instanceof guard
"prop" in x                  // in guard
x !== null && x !== undefined // null guard
// After: x is narrowed in that branch

// Discriminated union
type Result = { ok: true; value: Data } | { ok: false; error: Error };
if (result.ok) { result.value } else { result.error }
```

### Advanced
```typescript
// Conditional
type IsStr<T> = T extends string ? true : false;

// Mapped
type Optional<T> = { [K in keyof T]?: T[K] };

// Template literal
type Evt<T extends string> = `on${Capitalize<T>}`;

// Infer
type Ret<T> = T extends (...args: any[]) => infer R ? R : never;

// Branded types
type Email = string & { __brand: "Email" };
```

### Config Snippets
```json
{
  "compilerOptions": {
    "strict": true,
    "target": "ES2022",
    "module": "commonjs",
    "outDir": "./dist",
    "rootDir": "./src",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "sourceMap": true,
    "noUnusedLocals": true,
    "noImplicitReturns": true
  }
}
```
