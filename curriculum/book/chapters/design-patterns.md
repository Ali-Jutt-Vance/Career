# Design Patterns

> [!GOALS]
> - Explain what a design pattern is, where the idea came from, and why patterns are first of all a **shared vocabulary**.
> - Use the **creational** patterns that matter in modern TypeScript: factory, builder and singleton — and know the dangers of singletons.
> - Use the **structural** patterns: adapter, decorator, proxy, facade and composite.
> - Use the **behavioural** patterns: strategy, observer, command, state, chain of responsibility and template method.
> - Recognise these patterns inside tools you will use: Express middleware, Node's `EventEmitter`, React, NestJS and ORMs.
> - Tell similar patterns apart (decorator versus proxy versus adapter; observer versus publish/subscribe).
> - Judge when a pattern helps — and when a plain function or object is the better answer.

## Why this matters

In the last three chapters you learned principles: encapsulate state ({{ch:object-oriented-programming}}), keep functions pure ({{ch:functional-programming}}), write for readers ({{ch:clean-code}}), and keep dependencies pointing the right way ({{ch:solid-principles}}). Principles tell you what good design looks like. They do not tell you **how to build it** when you face a specific problem on a Tuesday afternoon:

- "We need to support three payment providers, each with a different API."
- "Every service call should be logged and timed — but I do not want logging code inside every service."
- "When an order is placed, five different things must happen, and the list keeps growing."
- "The user should be able to undo their last ten edits."

Experienced engineers kept meeting problems like these, and kept arriving at the same few solutions. In 1994, four of them — Erich Gamma, Richard Helm, Ralph Johnson and John Vlissides, now usually called the **Gang of Four** — published *Design Patterns: Elements of Reusable Object-Oriented Software*, documenting 23 such solutions with names. The idea was borrowed from the architect Christopher Alexander, who had catalogued recurring solutions in buildings and towns.

The most valuable thing the book created was **vocabulary**. When a senior engineer says "put an adapter in front of the payment SDK" or "make the pricing rules strategies", the whole team immediately understands a complete design in a few words. In code reviews, design discussions and interviews, you will hear these names constantly. This chapter teaches the patterns you will actually use, in modern TypeScript — where many of them become much simpler than in the 1994 book, because JavaScript has first-class functions.

## The simple idea

Think about how tailors work. A tailor does not invent a new way to make a collar for every shirt. There are known collar designs — the button-down, the spread, the mandarin — each with a name and a known way to construct it. When a customer says "a mandarin collar", the tailor knows exactly what to do, and any other tailor would understand too. Yet every collar is still cut to fit the particular shirt.

A **design pattern** is a named, proven solution to a problem that keeps recurring in software design — not finished code you copy, but a **shape** you adapt to your situation.

> [!ANALOGY]
> Design patterns are like a tailor's standard collar designs: named, well-understood solutions that any professional recognises, adapted to each garment.
>
> **Where the analogy breaks:** a customer *chooses* a collar style for taste. In software, a pattern should be chosen only because the **problem** calls for it. Using a pattern where the problem does not exist adds complexity with no benefit — like sewing a collar onto a garment that has no neck.

## The proper definition and key words

A **design pattern** is a general, reusable solution to a commonly occurring problem within a given context in software design. Each pattern has:

- a **name** (the vocabulary);
- a **problem** it solves, and the situations where that problem appears;
- a **solution** — the roles the objects or functions play and how they interact;
- **consequences** — the costs and trade-offs of using it.

The Gang of Four sorted their patterns into three families:

- **Creational patterns** — how objects get **created**: factory, builder, singleton, prototype.
- **Structural patterns** — how objects are **combined** into larger structures: adapter, decorator, proxy, facade, composite.
- **Behavioural patterns** — how objects **communicate** and share responsibility: strategy, observer, command, state, chain of responsibility, template method, iterator.

Two related terms:

- An **anti-pattern** is a common "solution" that looks reasonable but causes more problems than it solves — for example, the God class ({{ch:object-oriented-programming}}).
- An **idiom** is a pattern specific to one language — for example, using closures for privacy in JavaScript ({{ch:scope-and-closures}}).

## How it works inside: one trick behind most patterns

Almost every pattern in this chapter is built from the same two moves you have already learned:

1. **Program to an interface** ({{ch:object-oriented-programming}}). The client knows only a contract, never the concrete class.
2. **Compose objects** — wrap them, hold them, pass them in — instead of inheriting from them.

```text
   Client ───uses───▶ «interface» Thing
                         ▲      ▲      ▲
                         │      │      │
                       ImplA  ImplB  Wrapper ──holds──▶ another Thing
```

Once a client depends only on `Thing`, you can give it **any** object that satisfies `Thing`: a different implementation (strategy), a translator around a foreign object (adapter), a wrapper that adds behaviour (decorator), a gatekeeper (proxy), or a tree of `Thing`s that acts as one (composite). The patterns differ mainly in **why** the substitute exists. Keep this picture in mind, and the patterns will feel like variations on one idea rather than 23 things to memorise.

In JavaScript there is a second, simpler mechanism: **functions are values**. Many patterns that needed a class hierarchy in 1994 Java or C++ become a single function parameter in TypeScript. We will point this out each time.

## Creational patterns

### Factory: one place that decides what to create

#### Level 2 — The problem

Code that needs an object often has to decide **which kind** to create, based on configuration or input:

```ts
// fragment
let notifier;
if (user.preference === "sms") notifier = new SmsNotifier(smsConfig);
else if (user.preference === "email") notifier = new EmailNotifier(smtpConfig);
else notifier = new PushNotifier(pushConfig);
```

If this decision is repeated in many places, adding a new kind means finding and editing all of them, and every place must know the constructor details (configuration, credentials) of every class.

#### Level 3 — The solution

A **factory** is a function (or method) whose job is to create objects, so that callers do not use `new` on concrete classes directly. The decision lives in one place:

```ts
interface Notifier {
  send(to: string, text: string): string;
}

class SmsNotifier implements Notifier {
  constructor(private readonly senderId: string) {}
  send(to: string, text: string): string {
    return `SMS from ${this.senderId} to ${to}: ${text}`;
  }
}

class EmailNotifier implements Notifier {
  constructor(private readonly fromAddress: string) {}
  send(to: string, text: string): string {
    return `Email from ${this.fromAddress} to ${to}: ${text}`;
  }
}

type Channel = "sms" | "email";

function createNotifier(channel: Channel): Notifier {
  switch (channel) {
    case "sms":
      return new SmsNotifier("SHOP-PK");
    case "email":
      return new EmailNotifier("orders@shop.example");
  }
}

for (const channel of ["sms", "email"] as const) {
  console.log(createNotifier(channel).send("customer", "Your order has shipped"));
}
```

**Output:**

```text
SMS from SHOP-PK to customer: Your order has shipped
Email from orders@shop.example to customer: Your order has shipped
```

- `createNotifier` returns the **interface** type `Notifier`. Callers never learn which class they got, so they cannot depend on it.
- Construction details — the sender id, the from-address — live in the factory, not in every caller. In a real app they would come from configuration.
- `Channel` is a union type, so `createNotifier("fax")` does not compile, and TypeScript checks that the `switch` handles every channel.
- `as const` makes the array's element type `"sms" | "email"` instead of `string`, so each element can be passed to `createNotifier`.

The Gang of Four describe a more elaborate **Factory Method** (subclasses override a creation method) and **Abstract Factory** (an object that creates families of related objects, such as all the widgets for one visual theme). In everyday TypeScript, a **factory function** like this is by far the most common form. You also used a variant in {{ch:object-oriented-programming}}: the **static factory method** `EmailAddress.parse(...)`, which validates before creating.

#### Level 4 — In the wild

You call factories constantly: `express()` creates an application, `new Pool(...)` from the PostgreSQL driver and `createClient()` from Redis libraries create connections, and NestJS lets you register "factory providers" that build services from configuration ({{ch:nestjs-basics}}).

### Builder: constructing complex objects step by step

#### Level 2 — The problem

Some objects need many optional settings. A constructor with eleven parameters is unreadable (`new Request("GET", url, null, null, 5000, true, false, ...)`), and an object literal cannot enforce rules such as "a POST request must have a body".

#### Level 3 — The solution

A **builder** collects settings through named, chainable methods, then produces the finished object in a final `build()` step, where it can validate the whole thing:

```ts
type HttpRequest = {
  readonly method: "GET" | "POST";
  readonly url: string;
  readonly headers: Readonly<Record<string, string>>;
  readonly body?: string;
  readonly timeoutMs: number;
};

class RequestBuilder {
  #method: "GET" | "POST" = "GET";
  #headers: Record<string, string> = {};
  #body: string | undefined;
  #timeoutMs = 10_000;

  constructor(private readonly url: string) {}

  post(json: unknown): this {
    this.#method = "POST";
    this.#body = JSON.stringify(json);
    return this.header("Content-Type", "application/json");
  }

  header(name: string, value: string): this {
    this.#headers[name] = value;
    return this;
  }

  timeout(ms: number): this {
    this.#timeoutMs = ms;
    return this;
  }

  build(): HttpRequest {
    if (!this.url.startsWith("https://")) throw new Error("Only HTTPS URLs are allowed");
    if (this.#timeoutMs <= 0) throw new Error("Timeout must be positive");
    return { method: this.#method, url: this.url, headers: { ...this.#headers }, body: this.#body, timeoutMs: this.#timeoutMs };
  }
}

const request = new RequestBuilder("https://api.shop.example/orders")
  .post({ sku: "PEN", qty: 2 })
  .header("Authorization", "Bearer <token>")
  .timeout(3_000)
  .build();

console.log(request.method, request.timeoutMs, request.body);
console.log(request.headers);
```

**Output:**

```text
POST 3000 {"sku":"PEN","qty":2}
{ 'Content-Type': 'application/json', Authorization: 'Bearer <token>' }
```

- Each setter returns `this`, the builder itself, so calls can be **chained**: `.post(...).header(...).timeout(...)`. This style is called a **fluent interface**. The return type `this` (rather than `RequestBuilder`) keeps chaining correct even for subclasses.
- Defaults (GET, a 10-second timeout) are set in field initialisers; callers specify only what differs.
- `build()` validates the **complete** configuration once, and returns a plain, read-only object. `{ ...this.#headers }` copies the headers so later builder calls cannot change an already-built request.
- Node prints the `Content-Type` key in quotes because it contains a dash; `Authorization` does not need quotes.

#### Level 4 — When to use it, and when not

In JavaScript, an **options object** with named fields ({{ch:clean-code}}) solves the "many parameters" problem for most cases, and is simpler. Builders earn their place when construction happens **in steps** (adding conditions to a query one by one depending on user filters), when you want validation across fields at the end, or when the result should be immutable. You will meet builders as **query builders** — `db.select().from("orders").where(...).orderBy(...)` — in libraries such as Knex, Drizzle and TypeORM ({{ch:orms}}).

### Singleton: exactly one instance — and why to be careful

#### Level 2 — The problem

Some things should exist **once** per application: a database connection pool, a configuration object loaded at startup, a logger. Creating a second pool by accident can exhaust the database's connection limit.

#### Level 3 — The classic and the JavaScript way

The classic **singleton** pattern makes the constructor private and offers a static method that always returns the same instance:

```ts
class AppConfig {
  static #instance: AppConfig | undefined;
  private constructor(readonly environment: string, readonly maxUploadMb: number) {}

  static get(): AppConfig {
    AppConfig.#instance ??= new AppConfig("production", 25);
    return AppConfig.#instance;
  }
}

console.log(AppConfig.get() === AppConfig.get(), AppConfig.get().maxUploadMb);
```

**Output:**

```text
true 25
```

- `static #instance` is a private static field that holds the single instance.
- `??=` is the **nullish assignment** operator: assign only if the left side is `null` or `undefined`. The first call creates the instance; every later call reuses it.
- `private constructor` stops anyone else from calling `new AppConfig(...)`.

In JavaScript and TypeScript, there is a much simpler way. **An ES module is evaluated only once**, however many files import it ({{ch:modules-and-npm}}). So a value created at the top level of a module is already a singleton:

```ts
// fragment
// db.ts
import { Pool } from "pg";
export const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// anywhere else
import { pool } from "./db.js"; // always the same pool
```

#### Level 5 — Why singletons are often called an anti-pattern

Singletons are **global state** with a nicer name, and they bring the problems of global state:

- **Hidden dependencies.** A function that calls `AppConfig.get()` inside its body depends on configuration, but nothing in its signature says so.
- **Hard to test.** Tests cannot easily give it a different configuration, and state left by one test leaks into the next.
- **Order-of-startup problems.** A singleton created on first use may be created before the configuration it needs is loaded.

The professional approach: it is fine for the application to have **one instance** of something, but create it in the **composition root** and **inject** it into the code that needs it ({{ch:solid-principles}}). DI containers call this a "singleton lifetime" — one shared instance — without any code reaching for global state. Keep module-level singletons for genuinely infrastructural things like the connection pool, and access them in few, obvious places.

## Structural patterns

### Adapter: making an incompatible thing fit

#### Level 1 — The idea

A travel plug adapter lets a Pakistani charger fit a British socket. Neither the charger nor the socket changes; the adapter **translates** between them.

#### Level 3 — The solution

An **adapter** wraps an object whose interface does not match what your code expects, and translates calls from your interface to its interface. You met this in {{ch:solid-principles}} as the "adapter" in ports and adapters.

```ts
// Your application's interface (the "port")
interface PaymentGateway {
  charge(orderId: string, amountPaisa: number): Promise<{ ok: boolean; reference: string }>;
}

// A third-party SDK with its own, different shape (you cannot change it)
class FastPayClient {
  async createTransaction(req: { merchantRef: string; amount: string; currency: "PKR" }) {
    return { status: req.amount === "0.00" ? "DECLINED" : "APPROVED", txnId: `FP-${req.merchantRef}` };
  }
}

// The adapter: implements your interface using their client
class FastPayAdapter implements PaymentGateway {
  constructor(private readonly client: FastPayClient) {}

  async charge(orderId: string, amountPaisa: number) {
    const result = await this.client.createTransaction({
      merchantRef: orderId,
      amount: (amountPaisa / 100).toFixed(2),
      currency: "PKR",
    });
    return { ok: result.status === "APPROVED", reference: result.txnId };
  }
}

const gateway: PaymentGateway = new FastPayAdapter(new FastPayClient());
console.log(await gateway.charge("ORD-77", 249_900));
console.log(await gateway.charge("ORD-78", 0));
```

**Output:**

```text
{ ok: true, reference: 'FP-ORD-77' }
{ ok: false, reference: 'FP-ORD-78' }
```

- The application speaks in **paisa** as integers and wants `{ ok, reference }`.
- The SDK wants amounts as **decimal strings** in rupees, uses its own field names, and returns status words.
- The adapter does all the translation in one place: units (`249900` paisa → `"2499.00"`), names (`orderId` → `merchantRef`), and result shape (`"APPROVED"` → `ok: true`).
- The rest of the application never sees `FastPayClient`. If the business switches provider, you write a new adapter; checkout code does not change.

#### Level 4 — Why adapters matter so much

Adapters are one of the most useful patterns in professional work, because real systems are full of things you do not control: payment providers, SMS gateways, cloud storage, legacy systems, and libraries whose APIs change between major versions. An adapter **contains** each external thing's quirks in one file. When the vendor changes its API, you change one adapter. Adapters are also where you translate an external system's **errors** into your own error types, and where you validate data coming in from outside ({{ch:validation}}).

### Decorator: adding behaviour by wrapping

#### Level 2 — The problem

You want to add behaviour — logging, timing, caching, retrying — around existing operations, without editing them and without creating subclasses for every combination (`LoggingCachingRetryingRepository`...).

#### Level 3 — The solution

A **decorator** wraps an object that has some interface, implements **the same interface**, and adds behaviour before or after forwarding each call. Because the wrapper has the same interface as what it wraps, decorators can be **stacked**.

```ts
interface ProductRepository {
  findPrice(sku: string): Promise<number>;
}

class SlowDatabaseRepository implements ProductRepository {
  calls = 0;
  async findPrice(sku: string): Promise<number> {
    this.calls++;
    return sku.length * 10_000; // pretend this is a slow database query
  }
}

class CachingRepository implements ProductRepository {
  readonly #cache = new Map<string, number>();
  constructor(private readonly inner: ProductRepository) {}
  async findPrice(sku: string): Promise<number> {
    const cached = this.#cache.get(sku);
    if (cached !== undefined) return cached;
    const price = await this.inner.findPrice(sku);
    this.#cache.set(sku, price);
    return price;
  }
}

class LoggingRepository implements ProductRepository {
  constructor(private readonly inner: ProductRepository, private readonly log: string[]) {}
  async findPrice(sku: string): Promise<number> {
    const price = await this.inner.findPrice(sku);
    this.log.push(`findPrice(${sku}) = ${price}`);
    return price;
  }
}

const database = new SlowDatabaseRepository();
const log: string[] = [];
const repository: ProductRepository = new LoggingRepository(new CachingRepository(database), log);

for (const sku of ["PEN", "INK", "PEN", "PEN"]) await repository.findPrice(sku);

console.log(log);
console.log(`database queries: ${database.calls}`);
```

**Output:**

```text
[
  'findPrice(PEN) = 30000',
  'findPrice(INK) = 30000',
  'findPrice(PEN) = 30000',
  'findPrice(PEN) = 30000'
]
database queries: 2
```

- Each class implements `ProductRepository`. The two decorators hold an `inner` repository and forward to it.
- They are stacked like layers: `Logging → Caching → Database`. A call goes in through logging, then caching; only cache misses reach the database.
- The log shows four lookups, but the database was queried only twice (once for `PEN`, once for `INK`).
- No existing class changed. Each concern lives in its own small class and can be tested alone. You could reorder the layers (logging inside caching would log only cache misses) or remove one, in the composition root alone.

This is the Open/Closed Principle in action ({{ch:solid-principles}}): behaviour was added by adding code.

#### Level 3 — The functional version

When the interface is a single function, a decorator is just a **higher-order function** ({{ch:functional-programming}}):

```ts
function withRetry<A extends unknown[], R>(fn: (...args: A) => Promise<R>, attempts: number) {
  return async (...args: A): Promise<R> => {
    let lastError: unknown;
    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        return await fn(...args);
      } catch (error) {
        lastError = error;
        console.log(`attempt ${attempt} failed: ${(error as Error).message}`);
      }
    }
    throw lastError;
  };
}

let calls = 0;
async function flakyFetchRate(currency: string): Promise<number> {
  calls++;
  if (calls < 3) throw new Error("network timeout");
  return currency === "USD" ? 280 : 1;
}

const fetchRate = withRetry(flakyFetchRate, 4);
console.log(await fetchRate("USD"));
```

**Output:**

```text
attempt 1 failed: network timeout
attempt 2 failed: network timeout
280
```

- `withRetry` takes any async function and returns a new function with the same parameters (`A extends unknown[]` captures the parameter list as a tuple type) that retries on failure.
- The original function is untouched; retrying is a separate, reusable concern.
- Real retry logic should also wait between attempts, often longer each time (**exponential backoff**), and retry only errors that are likely temporary — you will see this in {{ch:queues}} and {{ch:distributed-systems}}.

> [!WARNING]
> Do not confuse the **decorator pattern** with **TypeScript decorators** — the `@Something` syntax you will see in NestJS and Angular (`@Controller()`, `@Injectable()`). TypeScript decorators are a **language feature** for attaching metadata or wrapping class members at definition time. They can be used to *implement* the decorator pattern, but they are not the same thing, and the pattern needs no special syntax.

### Proxy: controlling access to an object

A **proxy** also wraps an object with the same interface, but its purpose is to **control access** rather than add features. Common kinds:

- **Protection proxy** — checks permissions before forwarding.
- **Virtual proxy** (lazy loading) — delays creating an expensive object until it is first used.
- **Remote proxy** — looks like a local object but forwards calls over a network (for example, a generated API client).

Structurally, a proxy and a decorator look almost identical. The difference is **intent**: a decorator *adds* behaviour; a proxy *guards* or *manages* access to the real object.

Here is a protection proxy:

```ts
interface Payroll {
  salaryOf(employeeId: string): number;
}

class PayrollDatabase implements Payroll {
  salaryOf(employeeId: string): number {
    return employeeId === "E1" ? 180_000 : 95_000;
  }
}

class PayrollAccessProxy implements Payroll {
  constructor(private readonly real: Payroll, private readonly viewerRole: "hr" | "staff") {}
  salaryOf(employeeId: string): number {
    if (this.viewerRole !== "hr") throw new Error("Access denied: salaries are visible to HR only");
    return this.real.salaryOf(employeeId);
  }
}

const forHr = new PayrollAccessProxy(new PayrollDatabase(), "hr");
const forStaff = new PayrollAccessProxy(new PayrollDatabase(), "staff");
console.log(forHr.salaryOf("E1"));
try {
  forStaff.salaryOf("E1");
} catch (error) {
  console.log((error as Error).message);
}
```

**Output:**

```text
180000
Access denied: salaries are visible to HR only
```

JavaScript also has a built-in **`Proxy` object** ({{ch:advanced-javascript}}) that can intercept property access on any object. Libraries use it for tricks such as reactive state in Vue and MobX, and Immer's "drafts" ({{ch:functional-programming}}). For application code, an explicit wrapper class like the one above is usually clearer.

> [!SENIOR]
> In real systems, permission checks belong in a well-tested authorisation layer ({{ch:application-security}}), applied consistently — for example, as middleware or guards. A protection proxy is one way to build that layer; the important part is that checks are not scattered and cannot be bypassed by calling the real object directly.

### Facade: one simple entrance to a complicated subsystem

#### Level 2 — The problem

Placing an order might involve the inventory module, the pricing module, the payment gateway, the shipping service and the notification service, each with its own API. If every caller (the web controller, the mobile API, the admin tool) coordinates all five, the coordination logic is duplicated and every caller is coupled to five subsystems.

#### Level 3 — The solution

A **facade** provides one simple interface to a complex subsystem:

```ts
class Inventory {
  reserve(sku: string, qty: number): boolean {
    return qty <= 10;
  }
}
class Pricing {
  totalPaisa(sku: string, qty: number): number {
    return qty * 150_000;
  }
}
class Payments {
  charge(amountPaisa: number): string {
    return `PAY-${amountPaisa}`;
  }
}
class Shipping {
  schedule(sku: string): string {
    return `SHIP-${sku}`;
  }
}

class CheckoutFacade {
  constructor(
    private readonly inventory = new Inventory(),
    private readonly pricing = new Pricing(),
    private readonly payments = new Payments(),
    private readonly shipping = new Shipping(),
  ) {}

  placeOrder(sku: string, qty: number): string {
    if (!this.inventory.reserve(sku, qty)) return "Sorry, not enough stock";
    const total = this.pricing.totalPaisa(sku, qty);
    const payment = this.payments.charge(total);
    const shipment = this.shipping.schedule(sku);
    return `Order placed: Rs ${total / 100}, ${payment}, ${shipment}`;
  }
}

const checkout = new CheckoutFacade();
console.log(checkout.placeOrder("KURTA", 2));
console.log(checkout.placeOrder("KURTA", 50));
```

**Output:**

```text
Order placed: Rs 3000, PAY-300000, SHIP-KURTA
Sorry, not enough stock
```

- Callers see one method, `placeOrder`, and never touch the four subsystems.
- The order of steps — reserve, price, charge, ship — is written once.
- The constructor uses **default parameter values** so the example is short; in a real application the four collaborators would be injected ({{ch:solid-principles}}).

A facade does not hide the subsystem completely: code that needs fine control can still use the parts directly. Facades are everywhere: the AWS SDK's high-level helpers hide multi-step protocols, and in your own back-ends the **service layer** — `OrderService.placeOrder()` — is usually a facade over repositories and gateways ({{ch:nestjs-basics}}).

> [!WARNING]
> A facade that grows to fifty unrelated methods has become a God class. Keep facades focused on one area (checkout, reporting), and split them when they grow.

### Composite: treating a group like a single item

#### Level 2 — The problem

Some data is a **tree** where groups and single items should be handled the same way: a menu with sub-menus, a folder with files and folders, a product bundle containing products and smaller bundles. Code that must constantly check "is this a group or an item?" becomes cluttered.

#### Level 3 — The solution

In the **composite** pattern, single items (**leaves**) and groups (**composites**) share an interface. A group implements each operation by delegating to its children:

```ts
interface CatalogueItem {
  readonly name: string;
  pricePaisa(): number;
  describe(indent?: string): string;
}

class Product implements CatalogueItem {
  constructor(readonly name: string, private readonly priceInPaisa: number) {}
  pricePaisa(): number {
    return this.priceInPaisa;
  }
  describe(indent = ""): string {
    return `${indent}${this.name}: Rs ${this.priceInPaisa / 100}`;
  }
}

class Bundle implements CatalogueItem {
  constructor(readonly name: string, private readonly items: CatalogueItem[], private readonly discount = 0) {}
  pricePaisa(): number {
    const sum = this.items.reduce((total, item) => total + item.pricePaisa(), 0);
    return Math.round(sum * (1 - this.discount));
  }
  describe(indent = ""): string {
    const children = this.items.map((item) => item.describe(indent + "  "));
    return [`${indent}${this.name} (bundle): Rs ${this.pricePaisa() / 100}`, ...children].join("\n");
  }
}

const stationery = new Bundle("Stationery set", [new Product("Pen", 15_000), new Product("Notebook", 35_000)]);
const backToSchool = new Bundle("Back to school", [stationery, new Product("Backpack", 250_000)], 0.1);

console.log(backToSchool.describe());
```

**Output:**

```text
Back to school (bundle): Rs 2700
  Stationery set (bundle): Rs 500
    Pen: Rs 150
    Notebook: Rs 350
  Backpack: Rs 2500
```

- `Product` (a leaf) and `Bundle` (a composite) both implement `CatalogueItem`.
- `Bundle.pricePaisa()` asks each child for its price — and a child may itself be a bundle, so the calculation **recurses** through the tree ({{ch:recursion-sorting-searching}}) without any "is this a bundle?" checks.
- The outer bundle has a 10% discount: (Rs 500 + Rs 2,500) × 0.9 = Rs 2,700.
- `describe` uses a growing `indent` to draw the tree.

You will meet the composite idea in the browser's DOM, where elements contain elements ({{ch:browser-and-dom}}); in React, where components contain components ({{ch:react-basics}}); and in permission systems where groups contain users and other groups.

## Behavioural patterns

### Strategy: interchangeable algorithms

#### Level 2 — The problem

A task can be done in several ways, chosen at runtime: calculate shipping by courier A or B; rank search results by relevance, price or rating; authenticate by password, Google login or API key. Writing each choice as another `if` branch inside one function creates the growing-`switch` problem from {{ch:object-oriented-programming}}.

#### Level 3 — The solution

The **strategy** pattern defines a family of algorithms behind one interface, and lets the client choose which one to use. In TypeScript, when the strategy is a single operation, a **function type** is the simplest strategy interface:

```ts
type Product = { name: string; pricePaisa: number; rating: number; sold: number };
type RankingStrategy = (a: Product, b: Product) => number;

const rankings: Record<string, RankingStrategy> = {
  cheapest: (a, b) => a.pricePaisa - b.pricePaisa,
  bestRated: (a, b) => b.rating - a.rating,
  popular: (a, b) => b.sold - a.sold,
};

const products: Product[] = [
  { name: "Kettle A", pricePaisa: 450_000, rating: 4.1, sold: 900 },
  { name: "Kettle B", pricePaisa: 320_000, rating: 3.8, sold: 2_100 },
  { name: "Kettle C", pricePaisa: 610_000, rating: 4.7, sold: 450 },
];

function search(items: readonly Product[], sortBy: string): string[] {
  const strategy = rankings[sortBy] ?? rankings["popular"]!;
  return items.toSorted(strategy).map((p) => p.name);
}

console.log(search(products, "cheapest"));
console.log(search(products, "bestRated"));
console.log(search(products, "unknown-option"));
```

**Output:**

```text
[ 'Kettle B', 'Kettle A', 'Kettle C' ]
[ 'Kettle C', 'Kettle A', 'Kettle B' ]
[ 'Kettle B', 'Kettle A', 'Kettle C' ]
```

- Each strategy is a comparison function, exactly the kind `toSorted` expects ({{ch:arrays}}).
- `search` does not know any ranking rules. It looks up a strategy by name and applies it.
- An unknown option falls back to "popular" — the user's input (a query parameter, say) chooses a strategy from a **fixed table**, never arbitrary code.
- Adding "newest first" means adding one entry to the table.

When a strategy needs several operations or its own state — a payment method with `charge`, `refund` and `status` — use an interface with classes, like the `Discount` and `ShippingMethod` examples in earlier chapters. Those were strategies too.

> [!TIP]
> Strategy versus a plain `switch`: if there are two or three fixed options used in one place, a `switch` is simpler and fine. Reach for strategies when the options grow, are chosen by configuration, or the same choice appears in several places.

### Observer: notifying many listeners of an event

#### Level 2 — The problem

When an order is placed, several things must happen: send a confirmation email, update stock, notify the warehouse, record analytics, award loyalty points. If the order code calls each of these directly, it depends on all of them, and every new reaction means editing the order code.

#### Level 3 — The solution

In the **observer** pattern, an object (the **subject**) keeps a list of **observers** (listeners) and notifies them when something happens. The subject does not know what the observers do; observers subscribe themselves.

```ts
type Listener<T> = (event: T) => void;

class EventChannel<T> {
  readonly #listeners = new Set<Listener<T>>();

  subscribe(listener: Listener<T>): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener); // returns an "unsubscribe" function
  }

  publish(event: T): void {
    for (const listener of this.#listeners) listener(event);
  }
}

type OrderPlaced = { orderId: string; email: string; totalPaisa: number };
const orderPlaced = new EventChannel<OrderPlaced>();

orderPlaced.subscribe((e) => console.log(`email: confirmation for ${e.orderId} to ${e.email}`));
orderPlaced.subscribe((e) => console.log(`stock: reserve items for ${e.orderId}`));
const stopPoints = orderPlaced.subscribe((e) => console.log(`loyalty: +${Math.floor(e.totalPaisa / 10_000)} points`));

orderPlaced.publish({ orderId: "ORD-1", email: "amna@example.com", totalPaisa: 520_000 });

stopPoints(); // the loyalty programme ends
orderPlaced.publish({ orderId: "ORD-2", email: "omer@example.com", totalPaisa: 90_000 });
```

**Output:**

```text
email: confirmation for ORD-1 to amna@example.com
stock: reserve items for ORD-1
loyalty: +52 points
email: confirmation for ORD-2 to omer@example.com
stock: reserve items for ORD-2
```

- `EventChannel<T>` is generic: each channel carries one type of event, so listeners get correctly typed data.
- A `Set` stores listeners; `subscribe` adds one and returns a function that removes it. Returning an unsubscribe function is a very common modern design (React's `useEffect` cleanup uses the same idea — {{ch:react-advanced}}).
- `publish` calls every listener. The publishing code knows nothing about email, stock or loyalty.
- After `stopPoints()`, the second order gets no loyalty line — a reaction was removed without touching the order code.

#### Level 4 — Node's `EventEmitter`

Node.js has this pattern built in. Many of its core objects — HTTP servers, streams, child processes — are **event emitters**:

```ts
import { EventEmitter } from "node:events";

const uploads = new EventEmitter();
uploads.on("progress", (percent: number) => console.log(`uploaded ${percent}%`));
uploads.once("done", (file: string) => console.log(`finished ${file}`));

uploads.emit("progress", 50);
uploads.emit("progress", 100);
uploads.emit("done", "invoice.pdf");
uploads.emit("done", "invoice.pdf"); // ignored: once() listeners run one time
```

**Output:**

```text
uploaded 50%
uploaded 100%
finished invoice.pdf
```

`on` subscribes, `once` subscribes for a single event, `emit` publishes. You will use this constantly in {{ch:nodejs}}.

#### Level 5 — Pitfalls and the step to publish/subscribe

- **Memory leaks.** A listener that is never removed keeps everything it references alive. Node warns when more than ten listeners are added to one event, because that is often a leak. Always unsubscribe when a listener's owner goes away.
- **Error handling.** In this simple version, if one listener throws, the following listeners never run, and the error reaches the publisher. Production systems isolate listeners from each other.
- **Hidden flow.** With many observers, it becomes hard to see "what happens when an order is placed?" by reading code. Keep a clear list of subscriptions in one place.
- **Synchronous by default.** All listeners here run immediately, inside `publish`. A slow listener slows the publisher.

**Observer versus publish/subscribe:** in the observer pattern, the subject holds its listeners directly, usually in the same process. In **publish/subscribe** (pub/sub), publishers and subscribers do not know about each other at all: they communicate through a separate **message broker**, often across different services and machines, and usually asynchronously. Pub/sub is the observer idea scaled up to distributed systems ({{ch:message-brokers}}, {{ch:event-driven-systems}}).

### Command: turning a request into an object

#### Level 2 — The problem

Some features need to treat **actions** as data: undo and redo in an editor, queuing work to run later, recording every action for an audit trail, or retrying failed operations. A plain method call cannot be stored, inspected, queued or reversed.

#### Level 3 — The solution

The **command** pattern wraps a request in an object that contains everything needed to perform it — and, for undo, to reverse it:

```ts
interface Command {
  readonly label: string;
  execute(): void;
  undo(): void;
}

class Document {
  text = "";
}

class InsertText implements Command {
  readonly label: string;
  constructor(private readonly doc: Document, private readonly position: number, private readonly value: string) {
    this.label = `insert "${value}"`;
  }
  execute(): void {
    this.doc.text = this.doc.text.slice(0, this.position) + this.value + this.doc.text.slice(this.position);
  }
  undo(): void {
    this.doc.text = this.doc.text.slice(0, this.position) + this.doc.text.slice(this.position + this.value.length);
  }
}

class Editor {
  readonly #done: Command[] = [];
  readonly #undone: Command[] = [];

  run(command: Command): void {
    command.execute();
    this.#done.push(command);
    this.#undone.length = 0; // a new action clears the redo history
  }

  undo(): void {
    const command = this.#done.pop();
    if (!command) return;
    command.undo();
    this.#undone.push(command);
  }

  redo(): void {
    const command = this.#undone.pop();
    if (!command) return;
    command.execute();
    this.#done.push(command);
  }

  history(): string[] {
    return this.#done.map((c) => c.label);
  }
}

const doc = new Document();
const editor = new Editor();
editor.run(new InsertText(doc, 0, "Hello"));
editor.run(new InsertText(doc, 5, " world"));
editor.run(new InsertText(doc, 5, ","));
console.log(doc.text);
editor.undo();
console.log(doc.text);
editor.undo();
console.log(doc.text);
editor.redo();
console.log(doc.text, editor.history());
```

**Output:**

```text
Hello, world
Hello world
Hello
Hello world [ 'insert "Hello"', 'insert " world"' ]
```

- Each `InsertText` object remembers **what** it does (position and text) and knows how to **reverse** it.
- `Editor` does not know what any command does. It keeps two stacks ({{ch:linked-lists-stacks-queues}}): commands done, and commands undone.
- Undo pops the last command and reverses it; redo re-executes the last undone one. Running a new command clears the redo stack — which is how every text editor behaves.
- `history()` can list actions by label, because commands are data. The same commands could be written to a log, sent over a network, or stored in a queue.

#### Level 4 — Commands everywhere

The idea of "an action as a data object" appears throughout modern development. **Redux actions** — `{ type: "cart/add", sku: "PEN" }` — are commands in plain-object form, processed by reducers ({{ch:functional-programming}}). **Background jobs** in a queue ({{ch:queues}}) are commands: "send this email", "resize this image", stored and executed later by a worker. **CQRS** (Command Query Responsibility Segregation) is an architectural pattern that separates the parts of a system that handle commands (changes) from those that answer queries (reads), so each can be designed and scaled separately ({{ch:event-driven-systems}}).

### State: behaviour that depends on the current state

#### Level 2 — The problem

In {{ch:object-oriented-programming}}, the `Order` class checked its status in every method: "can only ship if paid", "can only cancel if draft or paid". With many states and many actions, those checks become a grid of conditions spread over every method.

#### Level 3 — The solution

The **state** pattern gives each state its own object, which knows what each action does **in that state**. The main object delegates to its current state object, and states decide transitions:

```ts
interface ParcelState {
  readonly name: string;
  dispatch(): ParcelState;
  deliver(): ParcelState;
  returnToSender(): ParcelState;
}

const refuse = (from: string, action: string): never => {
  throw new Error(`Cannot ${action} a parcel that is ${from}`);
};

const delivered: ParcelState = {
  name: "delivered",
  dispatch: () => refuse("delivered", "dispatch"),
  deliver: () => refuse("delivered", "deliver"),
  returnToSender: () => returned,
};

const returned: ParcelState = {
  name: "returned",
  dispatch: () => refuse("returned", "dispatch"),
  deliver: () => refuse("returned", "deliver"),
  returnToSender: () => refuse("returned", "return"),
};

const inTransit: ParcelState = {
  name: "in transit",
  dispatch: () => refuse("in transit", "dispatch"),
  deliver: () => delivered,
  returnToSender: () => returned,
};

const atWarehouse: ParcelState = {
  name: "at warehouse",
  dispatch: () => inTransit,
  deliver: () => refuse("at warehouse", "deliver"),
  returnToSender: () => refuse("at warehouse", "return"),
};

class Parcel {
  #state: ParcelState = atWarehouse;
  get status(): string {
    return this.#state.name;
  }
  dispatch(): void {
    this.#state = this.#state.dispatch();
  }
  deliver(): void {
    this.#state = this.#state.deliver();
  }
  returnToSender(): void {
    this.#state = this.#state.returnToSender();
  }
}

const parcel = new Parcel();
parcel.dispatch();
console.log(parcel.status);
try {
  parcel.dispatch();
} catch (error) {
  console.log((error as Error).message);
}
parcel.deliver();
parcel.returnToSender();
console.log(parcel.status);
```

**Output:**

```text
in transit
Cannot dispatch a parcel that is in transit
returned
```

- Each state object answers every action: either it returns the **next state**, or it refuses.
- `refuse` has the return type `never`, meaning "this function never returns normally" (it always throws). That lets it be used wherever a `ParcelState` is expected.
- `Parcel` contains no conditions at all. Each method asks the current state what happens next.
- To understand what is allowed "in transit", you read one object. To add a state ("held at customs"), you add one object and update the states that can move into it.
- The state objects reference each other (`delivered` refers to `returned`, defined below it). This works because the references are inside functions, which run later, after all the constants exist.

#### Level 4 — State machines in practice

For a handful of states, the `if` checks from {{ch:object-oriented-programming}}, or a simple **transition table** (`{ "at warehouse": { dispatch: "in transit" }, ... }`), are often clearer than a full state pattern. The pattern earns its place when each state has substantial **behaviour** of its own, not just allowed transitions. For complex workflows — multi-step sign-ups, payment flows, UI wizards — libraries such as XState model state machines explicitly and can even draw them as diagrams.

### Chain of responsibility and middleware

#### Level 2 — The problem

A request must pass several checks or processing steps — log it, check authentication, check rate limits, parse the body — and any step may decide to stop the request. Hard-coding all steps in one function makes them impossible to reuse, reorder or test separately.

#### Level 3 — The solution

In the **chain of responsibility**, a request is passed along a chain of handlers. Each handler either handles it (and possibly stops the chain) or passes it to the next. The most important modern form is **middleware**, which you will use in Express ({{ch:express}}):

```ts
type Request = { path: string; headers: Record<string, string>; user?: string };
type Response = { status: number; body: string };
type Next = () => Response;
type Middleware = (req: Request, next: Next) => Response;

function runChain(middlewares: Middleware[], finalHandler: (req: Request) => Response, req: Request): Response {
  const dispatch = (index: number): Response => {
    const middleware = middlewares[index];
    if (!middleware) return finalHandler(req);
    return middleware(req, () => dispatch(index + 1));
  };
  return dispatch(0);
}

const logRequests: Middleware = (req, next) => {
  const res = next();
  console.log(`${req.path} -> ${res.status}`);
  return res;
};

const authenticate: Middleware = (req, next) => {
  const token = req.headers["authorization"];
  if (token !== "Bearer secret-token") return { status: 401, body: "Please log in" };
  req.user = "admin";
  return next();
};

const handler = (req: Request): Response => ({ status: 200, body: `Welcome, ${req.user}` });
const chain = [logRequests, authenticate];

console.log(runChain(chain, handler, { path: "/admin", headers: { authorization: "Bearer secret-token" } }).body);
console.log(runChain(chain, handler, { path: "/admin", headers: {} }).body);
```

**Output:**

```text
/admin -> 200
Welcome, admin
/admin -> 401
Please log in
```

Walk through it:

- A `Middleware` receives the request and a `next` function. Calling `next()` passes control to the **next** link in the chain; **not** calling it stops the chain.
- `runChain` builds the chain with a small recursive function, `dispatch(index)`. Each middleware gets a `next` that dispatches the following one; after the last middleware, the final handler runs.
- `logRequests` calls `next()` **first** and logs **after** it returns, so it can see the final status — code before `next()` runs on the way in, code after it runs on the way out.
- `authenticate` stops the chain with a 401 response if the token is wrong. If it is right, it attaches the user to the request — later handlers can rely on it — and continues.
- Because each concern is a separate function, you can reorder, reuse and test them independently.

Real Express middleware has the shape `(req, res, next) => void` and is asynchronous, but the idea is exactly this. NestJS adds named variations — guards, interceptors and pipes ({{ch:nestjs-advanced}}) — that are all links in the same kind of chain.

### Template method: a fixed algorithm with replaceable steps

The **template method** pattern defines the steps of an algorithm in a base class, and lets subclasses fill in some of the steps. You saw it in {{ch:object-oriented-programming}}: `Employee.payslip()` was the template, and each subclass supplied `monthlyPayPaisa()`.

It is useful when several variants share a strict sequence — for example, every report must load data, check it, render it and add a footer, in that order. But it relies on **inheritance**, with all its coupling ({{ch:object-oriented-programming}}). In modern TypeScript, the same goal is often reached by passing the variable steps in as functions or strategies:

```ts
type ReportSteps<Row> = {
  title: string;
  load: () => Row[];
  render: (row: Row) => string;
};

function generateReport<Row>({ title, load, render }: ReportSteps<Row>): string {
  const rows = load();
  if (rows.length === 0) return `${title}\n(no data)`;
  return [title, ...rows.map(render), `-- ${rows.length} row(s)`].join("\n");
}

console.log(
  generateReport({
    title: "Low stock",
    load: () => [{ sku: "PEN", qty: 3 }, { sku: "INK", qty: 1 }],
    render: (r) => `${r.sku}: ${r.qty} left`,
  }),
);
```

**Output:**

```text
Low stock
PEN: 3 left
INK: 1 left
-- 2 row(s)
```

`generateReport` fixes the sequence (load, check for empty, render each, footer); callers supply only the steps that vary. TypeScript infers the type `Row` from the `load` function, so `render` receives correctly typed rows.

### Iterator

The **iterator** pattern provides a standard way to walk through a collection without exposing how it is stored. JavaScript built it into the language: any object with a `[Symbol.iterator]` method works with `for...of`, spread and destructuring. You learned it, with generators, in {{ch:advanced-javascript}} — and used it to build lazy pipelines in {{ch:functional-programming}}. It is a good example of a pattern so useful that languages absorbed it.

## Telling similar patterns apart

Several patterns share the same structure — "an object wrapping another" — and differ only in purpose. Interviewers love this question.

| Pattern | Wraps an object and… | Interface compared to wrapped object | Typical use |
|---|---|---|---|
| **Adapter** | translates between two incompatible interfaces | **different** from the wrapped object | Third-party SDKs, legacy systems |
| **Decorator** | adds behaviour | **same** | Logging, caching, retrying |
| **Proxy** | controls access | **same** | Permissions, lazy loading, remote calls |
| **Facade** | simplifies a whole subsystem | **new, simpler** interface over **many** objects | Service layers, SDK helpers |

And two behavioural pairs:

- **Strategy versus state:** both swap an object to change behaviour. With **strategy**, the *client* chooses the algorithm, and strategies do not know about each other. With **state**, the *states themselves* trigger transitions to other states.
- **Observer versus pub/sub:** observer keeps listeners inside the subject, usually in one process; pub/sub decouples publishers and subscribers through a broker, often across services.

## From beginner to enterprise

**Level 3 — small programs.** Use factory functions, strategies as functions, and simple observers. Prefer functions and plain objects; reach for classes when there is state to protect.

**Level 4 — applications.** Adapters around every external service. A facade-like service layer. Decorators (or middleware) for logging, caching and retrying. The observer pattern for domain events inside one application. The composition root wires it all together.

**Level 5 — professional practice.** Patterns are used **by name** in design documents and code reviews: "the notification adapters", "the pricing strategies". Teams agree on a few standard shapes so every module looks familiar. Over-patterned code is challenged in review just like under-designed code.

**Level 6 — distributed systems.** The same shapes reappear at the level of services. An **API gateway** is a facade and proxy for many services ({{ch:api-gateway}}). Pub/sub through a message broker is the observer pattern across machines ({{ch:message-brokers}}). A **circuit breaker** — which stops calling a failing service for a while — is a proxy with state ({{ch:distributed-systems}}). The **strangler fig** migration routes requests through a facade that gradually sends them to a new system ({{ch:microservices}}). Patterns at this level are often called **architectural patterns**.

## Real-world use cases

### An SMS gateway that changes every year

- **Business problem:** SMS providers in many countries change prices, reliability and APIs; the business switches providers often and sometimes uses two at once for reliability.
- **Patterns:** an `SmsSender` port with one **adapter** per provider; a **decorator** that retries and records delivery metrics; a **strategy** (or simple router) that chooses a provider per message — for example, by destination network.
- **Why it works:** switching provider is new adapter code plus configuration. Sending code never changes.
- **Failure scenario:** both providers fail. The retrying decorator keeps retrying and slows every request. **Fix:** a limit on retries, a timeout, and a circuit breaker so the system fails fast and queues messages for later ({{ch:queues}}).

### Domain events in an online shop

- **Problem:** "order placed" must trigger email, stock, analytics and loyalty, and marketing keeps adding reactions.
- **Pattern:** observer inside the application; later, as the system grows, pub/sub through a broker.
- **Limits:** with in-process observers, if the server crashes after saving the order but before the email listener runs, the email is never sent. Durable messaging ({{ch:event-driven-systems}}) — or the "outbox" technique, which saves the event in the same database transaction as the order — solves this, at the cost of more infrastructure.

### Undo in a design tool

- **Problem:** users expect unlimited undo and redo in an online invoice designer.
- **Pattern:** command, with each edit as an object that can execute and undo.
- **Alternative:** immutable state snapshots with a reducer ({{ch:functional-programming}}) — simpler to get right, but each snapshot costs memory. Many real editors combine both: commands for small edits, periodic snapshots for fast recovery.

## Common mistakes

### Beginner: using patterns to look professional

Adding a factory, a builder and an abstract strategy hierarchy for a feature that has one implementation and three lines of logic. **Consequence:** five files to understand one simple behaviour. **Fix:** start simple; introduce a pattern when the problem it solves actually appears. YAGNI applies to patterns too ({{ch:clean-code}}).

### Beginner: translating Java-style patterns literally

Writing an `AbstractRankingStrategy` class, three subclasses and a `RankingStrategyFactory` — in a language where a strategy can be one function in a table. **Fix:** in TypeScript, use functions for single-operation patterns (strategy, command callbacks, decorators of functions) and classes when there is state or several related operations.

### Intermediate: singletons as hidden globals

Business code calling `Logger.getInstance()` and `Config.get()` everywhere. **Consequence:** hidden dependencies, tests that interfere with each other. **Fix:** create one instance in the composition root and inject it.

### Intermediate: observers that are never removed

Subscribing a listener every time a page or component is created, and never unsubscribing. **Consequence:** memory grows steadily and handlers run multiple times for one event. **Fix:** always keep the unsubscribe function and call it when the owner is destroyed.

### Production: decorators in the wrong order

Placing a caching decorator **outside** a permission-checking proxy: the first authorised user's result is cached, and later unauthorised users receive it from the cache without being checked. **Fix:** think about the order of wrappers explicitly — security checks outermost, or include the user in the cache key — and test the composed stack, not only each layer.

### Enterprise: pattern-driven architecture

Choosing patterns first ("we will use CQRS and event sourcing") and fitting the business into them. **Consequence:** enormous complexity for a system that needed simple create/read/update/delete. **Fix:** let problems choose patterns. Architectural patterns are adopted where their benefits are measurable.

## Debugging and troubleshooting

**Symptom: a call goes "somewhere" and you cannot find the code that runs.** With adapters, decorators and observers, the actual code is behind an interface. Use your editor's **Go to Implementation** command (rather than Go to Definition, which lands on the interface), or set a breakpoint and step into the call. Look at the composition root to see which implementation was wired in.

**Symptom: an event handler runs twice.** It was subscribed twice — often because subscription code runs on every request or every render. Log subscriptions, check the listener count (`emitter.listenerCount("event")` in Node), and make sure each subscription has a matching unsubscribe.

**Symptom: stale data.** A caching decorator is returning old values after data changed. Check how the cache is invalidated and whether every write path clears or updates it ({{ch:caching}}).

**Symptom: "MaxListenersExceededWarning" in Node.** More than ten listeners on one event — usually a leak. Find where listeners are added in a loop or per request.

**Symptom: middleware never reaches the handler, or the request hangs.** A middleware forgot to call `next()` and also did not send a response. Every path through a middleware must do one or the other.

## Security and performance

**Security.** Several patterns are natural places for security controls: middleware chains for authentication and rate limiting ({{ch:rate-limiting}}); protection proxies for authorisation; adapters for validating and sanitising external data. The danger is **bypass**: if code can reach the real object without going through the proxy, the check is useless — so make the protected object unreachable except through its guard. Never let user input choose arbitrary strategies, commands or method names; map input to a fixed table of allowed options, as the ranking example did.

**Performance.** Each wrapper adds a function call — negligible compared with I/O. Patterns can also *improve* performance: caching decorators, lazy-loading proxies, and the **flyweight** pattern, which shares common data among many small objects (for example, one shared object for each font glyph in a text editor, rather than a separate copy for every character on the page). The main performance risks are synchronous observers doing slow work inside `publish`, and unbounded caches or listener lists growing forever.

## How a senior engineer thinks about this

- **Problem first, pattern second.** They recognise a recurring problem — "we keep switching vendors" — and then name the pattern that fits, not the reverse.
- **The simplest form that works.** In TypeScript, that is often a function, an object literal or a small class — not the full Gang of Four structure.
- **Patterns as communication.** Naming a pattern in a pull request description ("this adds a retrying decorator around the SMS adapter") lets reviewers understand the design in seconds.
- **Awareness of costs.** Every pattern adds indirection. They add one when the flexibility pays for the extra reading it requires.
- **Knowing the classics anyway.** Even when they would not write a literal Abstract Factory, they recognise one in a framework's code, and can discuss patterns fluently in interviews and design reviews.

## Exercises

### Exercise 1 — Identify the pattern

**Objective:** recognise patterns from their purpose.
**What to do:** name the pattern that best fits each description.

1. A class wraps a legacy SOAP inventory service so the rest of the app can call `stock.available(sku)`.
2. A function takes any async function and returns a version that records how long each call took.
3. Users choose "fastest", "cheapest" or "greenest" delivery, each calculated differently.
4. When a payment succeeds, the receipt service, the accounting service and the analytics service each react, and new reactions are added often.
5. An admin tool records every change as an object that can be replayed or reversed.
6. A `checkout.placeOrder()` method coordinates inventory, pricing, payment and shipping.
7. A menu where each item is either a link or a sub-menu, and the whole menu can be rendered with one call.
8. A request passes through logging, authentication and body parsing before reaching the route handler.

<details>
<summary>Show the solution</summary>

1. **Adapter** — translates the legacy interface into the one your app expects.
2. **Decorator** (in its higher-order-function form) — adds behaviour, same interface.
3. **Strategy** — interchangeable algorithms chosen by the client.
4. **Observer** (or pub/sub if the services are separate and connected through a broker).
5. **Command** — actions as objects that can be stored, replayed and undone.
6. **Facade** — one simple interface over a subsystem.
7. **Composite** — leaves (links) and groups (sub-menus) share an interface.
8. **Chain of responsibility**, in its middleware form.

</details>

### Exercise 2 — Build a caching decorator with expiry

**Objective:** practise the decorator pattern with real-world rules.
**What to build:** a `CurrencyRates` interface with `rate(currency: string): Promise<number>`, a fake implementation that counts calls, and a `CachedRates` decorator that keeps each rate for a configurable number of milliseconds. Pass a clock function `now: () => number` into the decorator so you can test expiry without waiting.

<details>
<summary>Show the solution</summary>

```ts
interface CurrencyRates {
  rate(currency: string): Promise<number>;
}

class FakeRates implements CurrencyRates {
  calls = 0;
  async rate(currency: string): Promise<number> {
    this.calls++;
    return currency === "USD" ? 280 + this.calls : 1;
  }
}

class CachedRates implements CurrencyRates {
  readonly #cache = new Map<string, { value: number; expiresAt: number }>();
  constructor(
    private readonly inner: CurrencyRates,
    private readonly ttlMs: number,
    private readonly now: () => number,
  ) {}

  async rate(currency: string): Promise<number> {
    const hit = this.#cache.get(currency);
    if (hit && hit.expiresAt > this.now()) return hit.value;
    const value = await this.inner.rate(currency);
    this.#cache.set(currency, { value, expiresAt: this.now() + this.ttlMs });
    return value;
  }
}

let fakeTime = 0;
const source = new FakeRates();
const rates = new CachedRates(source, 60_000, () => fakeTime);

console.log(await rates.rate("USD"), await rates.rate("USD"));
fakeTime = 59_999;
console.log(await rates.rate("USD"));
fakeTime = 60_000;
console.log(await rates.rate("USD"), `calls: ${source.calls}`);
```

**Output:**

```text
281 281
281
282 calls: 2
```

**Walkthrough:** the decorator implements the same interface and wraps any `CurrencyRates`. Each cache entry stores its expiry time, which is "now plus the time-to-live" (**TTL**). At time 59,999 the entry (expiring at 60,000) is still valid; at 60,000 it has expired (`expiresAt > now` is false), so the decorator fetches again — the fake returns a new value, 282, proving the source was called. The injected clock makes the expiry testable instantly; this is the same "pass time in" technique from {{ch:functional-programming}}.

**Common wrong approaches:** using `Date.now()` inside the decorator (tests must actually wait a minute); caching failures (a rejected promise should not be stored); never deleting entries for currencies that are no longer requested (fine for a few currencies, a memory leak for unbounded keys).

</details>

### Exercise 3 — Debug the observer

**Objective:** practise finding a classic observer bug.
**The scenario:** a dashboard shows a notification badge. Each time the user opens the dashboard page, this code runs. After the user has opened the page five times, a single new message makes the badge count go up by five.

```ts
// fragment
function openDashboard(messages: EventChannel<string>, badge: { count: number }) {
  messages.subscribe(() => {
    badge.count++;
  });
}
```

**What to do:** explain the cause and fix it, using the `EventChannel` from this chapter.

<details>
<summary>Show the solution</summary>

**Cause:** every call to `openDashboard` adds **another** listener, and none are ever removed. After five openings there are five listeners, so one message increments the badge five times. This is also a memory leak: each listener keeps `badge` alive.

**Fix:** keep the unsubscribe function and call it when the dashboard closes:

```ts
type Listener<T> = (event: T) => void;
class EventChannel<T> {
  readonly #listeners = new Set<Listener<T>>();
  subscribe(listener: Listener<T>): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }
  publish(event: T): void {
    for (const listener of this.#listeners) listener(event);
  }
  get size(): number {
    return this.#listeners.size;
  }
}

function openDashboard(messages: EventChannel<string>, badge: { count: number }): () => void {
  const unsubscribe = messages.subscribe(() => {
    badge.count++;
  });
  return function closeDashboard() {
    unsubscribe();
  };
}

const messages = new EventChannel<string>();
const badge = { count: 0 };

for (let visit = 0; visit < 5; visit++) {
  const close = openDashboard(messages, badge);
  close(); // user leaves the page
}
const close = openDashboard(messages, badge); // current visit
messages.publish("New order received");
console.log(badge.count, `listeners: ${messages.size}`);
close();
```

**Output:**

```text
1 listeners: 1
```

**Walkthrough:** `openDashboard` now returns a cleanup function. Whoever opens the dashboard is responsible for calling it when the dashboard closes. After five visits that were opened and closed, plus the current visit, exactly one listener exists, and the badge increases by one. React's `useEffect` follows exactly this shape: subscribe in the effect, return the unsubscribe function as the cleanup ({{ch:react-advanced}}).

</details>

### Exercise 4 — Production scenario: a notification pipeline

**Objective:** combine several patterns sensibly.
**The scenario:** your shop sends notifications by SMS and email. Requirements:
- Each provider has a different API (simulate them with two small classes with different method names).
- Every send should be logged.
- Each customer chooses a preferred channel.
- Failed sends must not crash the order process.

**What to build:** a design using an adapter per provider, a logging decorator, and a strategy-style choice of channel. Keep it short and runnable.

<details>
<summary>Show the solution</summary>

```ts
// Third-party clients (pretend you cannot change these)
class QuickSmsApi {
  async sendText(msisdn: string, body: string): Promise<{ accepted: boolean }> {
    return { accepted: msisdn.startsWith("+92") && body.length <= 160 };
  }
}
class MailCloud {
  async deliver(opts: { recipient: string; html: string }): Promise<string> {
    if (!opts.recipient.includes("@")) throw new Error("bad address");
    return "queued";
  }
}

// Our port
interface Notifier {
  notify(to: string, message: string): Promise<boolean>;
}

// Adapters
class SmsNotifier implements Notifier {
  constructor(private readonly api: QuickSmsApi) {}
  async notify(to: string, message: string): Promise<boolean> {
    return (await this.api.sendText(to, message)).accepted;
  }
}
class EmailNotifier implements Notifier {
  constructor(private readonly api: MailCloud) {}
  async notify(to: string, message: string): Promise<boolean> {
    return (await this.api.deliver({ recipient: to, html: `<p>${message}</p>` })) === "queued";
  }
}

// Decorator: logging, and never throwing
class SafeLoggingNotifier implements Notifier {
  constructor(private readonly inner: Notifier, private readonly label: string) {}
  async notify(to: string, message: string): Promise<boolean> {
    try {
      const ok = await this.inner.notify(to, message);
      console.log(`[${this.label}] ${to}: ${ok ? "sent" : "rejected"}`);
      return ok;
    } catch (error) {
      console.log(`[${this.label}] ${to}: failed (${(error as Error).message})`);
      return false;
    }
  }
}

// Composition root + strategy table
const notifiers: Record<"sms" | "email", Notifier> = {
  sms: new SafeLoggingNotifier(new SmsNotifier(new QuickSmsApi()), "sms"),
  email: new SafeLoggingNotifier(new EmailNotifier(new MailCloud()), "email"),
};

type Customer = { contact: string; prefers: "sms" | "email" };
const customers: Customer[] = [
  { contact: "+923001234567", prefers: "sms" },
  { contact: "sadia@example.com", prefers: "email" },
  { contact: "not-an-email", prefers: "email" },
];

for (const c of customers) await notifiers[c.prefers].notify(c.contact, "Your order is on its way");
console.log("order process continues");
```

**Output:**

```text
[sms] +923001234567: sent
[email] sadia@example.com: sent
[email] not-an-email: failed (bad address)
order process continues
```

**Walkthrough:** each **adapter** translates our `notify` into a provider's API and result format. One **decorator**, applied to both, adds logging and converts exceptions into a `false` result, so a failed notification never crashes order processing — a deliberate business decision that is visible in one place. The customer's preference selects a notifier from a fixed **table** (strategy). Adding WhatsApp later means one adapter and one table entry.

**A real-world note:** "return false and continue" is right for a courtesy notification, but not for something critical like a one-time password. In production you would also queue failed notifications for retry ({{ch:queues}}) rather than just logging them.

</details>

## Summary

Design patterns are named, proven solutions to recurring design problems; their greatest value is a **shared vocabulary**. Most are built from two ideas: depend on an interface, and compose objects rather than inherit. In TypeScript, many patterns become simpler because functions are values.

**Creational:** a **factory** centralises the decision of what to create; a **builder** assembles complex objects step by step and validates at the end; a **singleton** guarantees one instance, but is global state — prefer creating one instance in the composition root and injecting it.

**Structural:** an **adapter** translates a foreign interface into yours; a **decorator** adds behaviour while keeping the interface, and can be stacked; a **proxy** controls access; a **facade** offers one simple entrance to a subsystem; a **composite** lets groups and single items be treated alike.

**Behavioural:** a **strategy** makes algorithms interchangeable; an **observer** notifies listeners of events (pub/sub is its distributed cousin); a **command** turns actions into objects for undo, queues and logs; **state** gives each state its own behaviour; **chain of responsibility** passes requests along handlers, as middleware does; **template method** fixes an algorithm's steps; **iterator** is built into JavaScript.

Use patterns when the problem they solve is present, in their simplest form, and name them so others understand your design.

## Key terms

- **Design pattern** — A named, reusable solution to a commonly occurring problem in software design.
- **Gang of Four** — The four authors of the 1994 book *Design Patterns*, which catalogued 23 classic patterns.
- **Anti-pattern** — A common approach to a problem that seems reasonable but usually causes more harm than good.
- **Creational pattern** — A pattern concerned with how objects are created.
- **Structural pattern** — A pattern concerned with how objects are combined into larger structures.
- **Behavioural pattern** — A pattern concerned with how objects communicate and divide responsibilities.
- **Factory** — A function or method whose job is to create objects, hiding which concrete class is used.
- **Builder** — An object that constructs a complex object step by step and produces it in a final build step.
- **Fluent interface** — An API designed for method chaining, where each method returns the object itself.
- **Singleton** — A pattern that ensures a class has only one instance and provides global access to it.
- **Adapter** — A wrapper that converts one interface into another interface that clients expect.
- **Decorator (pattern)** — A wrapper that implements the same interface as the object it wraps and adds behaviour around its calls.
- **Proxy** — A wrapper with the same interface as an object that controls access to it, for example for permissions or lazy loading.
- **Facade** — A simple interface that hides and coordinates a more complex subsystem.
- **Composite** — A pattern in which individual items and groups of items share one interface, forming a tree.
- **Strategy** — A pattern that defines interchangeable algorithms behind one interface, chosen by the client.
- **Observer** — A pattern in which a subject notifies registered listeners when an event happens.
- **Publish/subscribe (pub/sub)** — A messaging style in which publishers and subscribers communicate through a broker without knowing each other.
- **Command** — A pattern that wraps a request in an object so it can be stored, queued, logged or undone.
- **State (pattern)** — A pattern in which an object delegates its behaviour to a state object that changes as the object's state changes.
- **Chain of responsibility** — A pattern that passes a request along a chain of handlers, each of which may handle it or pass it on.
- **Middleware** — A function in a request-processing chain that can act on a request, pass it on, or stop it.
- **Template method** — A pattern in which a base algorithm defines fixed steps and lets subclasses or callers supply some of them.
- **Iterator** — A pattern for walking through a collection's elements without exposing how it is stored.
- **Flyweight** — A pattern that saves memory by sharing common data among many similar objects.
- **Time to live (TTL)** — The length of time a cached value is considered valid before it must be refreshed.

## What comes next

You now have principles and patterns for designing code that is easy to change. But how do you **know** a change did not break anything? Every refactoring in the last four chapters assumed you could check that behaviour stayed the same. The next chapter, {{ch:testing}}, teaches you how: unit, integration and end-to-end tests, test doubles, test-driven development, and how professional teams use tests as the safety net that makes confident change possible.
