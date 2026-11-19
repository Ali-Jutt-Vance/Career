# The SOLID Principles

> [!GOALS]
> - Name the five SOLID principles, where they came from, and the single problem they all address: **making change cheap and safe**.
> - Apply the **Single Responsibility Principle** by finding the different *people* a piece of code serves.
> - Apply the **Open/Closed Principle** to add new behaviour by adding code, not editing working code.
> - Recognise **Liskov Substitution** violations — including the famous rectangle and square — and fix them.
> - Split bloated interfaces with the **Interface Segregation Principle**.
> - Explain the **Dependency Inversion Principle**, and how it differs from dependency injection and inversion of control.
> - Wire a small application together in a **composition root**, and test business logic with fake dependencies.
> - Judge when SOLID helps and when applying it creates needless complexity.

## Why this matters

In {{ch:clean-code}} you learned to make individual names and functions clear. But a codebase can be full of clear functions and still be painful to change. The pain comes from how the **pieces depend on each other**.

Imagine a shop's order-processing class. It validates orders, calculates prices, talks directly to a PostgreSQL database, generates PDF invoices with a specific library, and sends emails through a specific provider. Each method is tidy. Now look at what happens when the business changes:

- The finance team changes how VAT is calculated. You edit the class — and the email tests fail, because they share setup code with pricing.
- The company switches email provider. You edit the same class again; the change touches code that pricing depends on, so pricing must be re-tested.
- You want to test the pricing rules. You cannot, without a running database and an email account, because the class creates both itself.
- A new kind of discount is introduced. You add another branch to a long `if` chain that already has nine — in code that handles real money.

None of these problems is about bad names. They are about **structure**: which code depends on which, and how many reasons each piece has to change. In the early 2000s, Robert C. Martin collected five principles of object-oriented design that address exactly this. Michael Feathers noticed their first letters spelled **SOLID**, and the name stuck:

- **S** — Single Responsibility Principle
- **O** — Open/Closed Principle
- **L** — Liskov Substitution Principle
- **I** — Interface Segregation Principle
- **D** — Dependency Inversion Principle

SOLID is expected knowledge for any mid-level or senior engineer, it comes up in interviews constantly, and frameworks such as NestJS ({{ch:nestjs-basics}}) and Angular are designed around it. More importantly, once you understand **why** each principle exists, you will see its effects in every codebase you work on.

## The simple idea

Think about a well-designed house. The electrician can rewire the kitchen without touching the plumbing. You can plug any lamp into any socket, because sockets follow a **standard** — the house does not care which lamp you bought. You can add a new room without knocking down the existing ones. And each switch controls one thing, so pressing the light switch does not start the washing machine.

SOLID is a set of rules for building software like that house:

- Each part has **one job**, so a change to one job does not disturb the others (S).
- New features are **added**, like a new room, rather than made by rebuilding what works (O).
- Anything plugged into a standard socket **behaves as the standard promises** (L).
- Sockets are **small and specific**: a phone charger does not need a three-phase industrial connector (I).
- The house depends on the **socket standard**, not on any particular brand of lamp (D).

> [!ANALOGY]
> A SOLID codebase is like a well-wired house: separate circuits, standard sockets, and rooms you can add without demolition.
>
> **Where the analogy breaks:** houses are designed once and rarely change their purpose; software changes every week, often in directions nobody predicted. In software, *too many* sockets and adaptors — abstractions nobody needs — make the system harder to understand, not easier. SOLID must be applied where change actually happens, not everywhere.

## The proper definition and key words

The **SOLID principles** are five guidelines for organising classes and modules so that software is easier to understand, change, extend and test.

The words you need:

- **Dependency** — when code A uses code B (calls it, imports it, creates it), A **depends on** B. If B changes, A may have to change.
- **Coupling** — how strongly pieces depend on each other. **Tight coupling** means a change in one usually forces changes in the other. **Loose coupling** means they can change independently.
- **Cohesion** — how strongly the parts *inside* one module belong together. **High cohesion** means everything in a module serves one purpose.
- **Abstraction** — here, an interface or type describing what something does, without saying how ({{ch:object-oriented-programming}}).
- **Concrete implementation** (or "concretion") — an actual class or function that does the work.
- **Client** — any code that uses another piece of code. If `OrderService` calls `PaymentGateway`, `OrderService` is a client of `PaymentGateway`.

The overall aim is easy to remember: **high cohesion, loose coupling.** Things that change together should live together; things that change for different reasons should be separate and connected only through narrow, stable interfaces.

## How it works inside: dependencies and the ripple of change

Every arrow in a dependency diagram is a path along which **change spreads**:

```text
   InvoiceController ──▶ OrderService ──▶ PostgresClient
                              │
                              ├──────────▶ PdfLibrary
                              │
                              └──────────▶ EmailProviderSdk
```

Read the arrows as "depends on". If `PostgresClient` changes its API, `OrderService` must change; and if `OrderService` changes, `InvoiceController` may have to change too. Change flows **backwards** along the arrows, from the thing depended on to everything that depends on it.

Two consequences follow:

1. **The more arrows point at something, the more dangerous it is to change.** A module that 200 others depend on must be very stable.
2. **The most valuable code should not depend on the most volatile code.** Business rules (how an order is priced) change for business reasons. Infrastructure (which email provider, which PDF library) changes for technical reasons. If business rules depend directly on infrastructure, every infrastructure change ripples into the rules.

Each SOLID principle is a technique for controlling these arrows: making fewer of them (S, I), pointing them at stable abstractions instead of volatile details (D), and making sure the things at the end of an arrow behave as promised (L), so that new things can be plugged in without editing the code that uses them (O).

## S — The Single Responsibility Principle

### Level 1 — The idea

> A module should have one, and only one, reason to change.

Robert C. Martin later sharpened this, because "one reason" was too easy to misread as "do one thing": **a module should be responsible to one, and only one, actor.** An **actor** is a group of people who want changes — the finance team, the warehouse team, the marketing team, the security team.

This is subtler and more useful than "a class should do one thing". The question is not "how many methods does it have?" but "**whose requests will make me change this code?**" If the answer is two different groups, their changes will collide in the same file.

### Level 2 — A violation

```ts
// fragment
class Employee {
  constructor(readonly name: string, readonly hourlyRatePaisa: number, readonly hoursWorked: number) {}

  calculatePayPaisa(): number { /* rules from the finance team */ }
  reportHoursForAudit(): string { /* format required by the HR/audit team */ }
  save(): void { /* SQL, owned by the database administrators */ }
}
```

This example is adapted from Martin's own explanation. Three actors want different things from `Employee`:

- **Finance** decides how pay is calculated.
- **HR/audit** decides how hours are reported.
- **The technical team** decides how data is stored.

Suppose both `calculatePayPaisa` and `reportHoursForAudit` call a shared private helper `regularHours()`. Finance asks for overtime to start after 40 hours a week instead of 45. A developer changes `regularHours()`. Pay is now correct — but the audit report, which needed the **old** definition, silently changes too. Nobody from HR asked for that. The bug is found months later, during an audit.

The functions looked related (all about an employee) but served **different actors**. Sharing code between them coupled their changes.

### Level 3 — Separating by actor

```ts
type TimeSheet = { readonly employeeName: string; readonly hourlyRatePaisa: number; readonly hours: number };

// Finance's rules
class PayCalculator {
  static readonly OVERTIME_AFTER_HOURS = 40;
  static readonly OVERTIME_MULTIPLIER = 1.5;

  payPaisa(sheet: TimeSheet): number {
    const regular = Math.min(sheet.hours, PayCalculator.OVERTIME_AFTER_HOURS);
    const overtime = Math.max(0, sheet.hours - PayCalculator.OVERTIME_AFTER_HOURS);
    return Math.round(regular * sheet.hourlyRatePaisa + overtime * sheet.hourlyRatePaisa * PayCalculator.OVERTIME_MULTIPLIER);
  }
}

// HR's reporting format
class HoursAuditReport {
  static readonly STANDARD_WEEK_HOURS = 45;

  line(sheet: TimeSheet): string {
    const flag = sheet.hours > HoursAuditReport.STANDARD_WEEK_HOURS ? " (above standard week)" : "";
    return `${sheet.employeeName}: ${sheet.hours} h${flag}`;
  }
}

const sheet: TimeSheet = { employeeName: "Kamran", hourlyRatePaisa: 100_000, hours: 44 };
console.log(new PayCalculator().payPaisa(sheet));
console.log(new HoursAuditReport().line(sheet));
```

**Output:**

```text
4600000
Kamran: 44 h
```

- `TimeSheet` is plain data shared by both — data is fine to share; **rules** are what must not be tangled.
- `PayCalculator` contains only finance's rules. Its constants say exactly where overtime begins (40 hours) and how it is paid. 40 regular hours at Rs 1,000 = Rs 40,000; 4 overtime hours at Rs 1,500 = Rs 6,000; total Rs 46,000 = 4,600,000 paisa.
- `HoursAuditReport` has its **own** definition of a standard week (45 hours). It does not share a helper with pay, even though both talk about "hours", because the two definitions belong to different people and can change independently.
- Persistence would live in a third place — a repository ({{ch:orms}}) — owned by the technical team.

Now finance can change overtime rules, and the audit report cannot be affected, because no code connects them.

### Level 4 — How to spot SRP problems

- **Describe the class in one sentence.** If the sentence needs "and" to join different concerns — "it calculates prices **and** sends emails **and** saves to the database" — it probably has several responsibilities.
- **Look at the imports.** A file that imports a database driver, a PDF library, an HTTP client and a templating engine is serving many masters.
- **Look at the history.** In Git ({{ch:git}}), see which commits touched the file. If unrelated features from different teams keep changing the same file, and causing merge conflicts, it has too many reasons to change.
- **Look at the tests.** If testing one behaviour requires setting up things unrelated to it — a mail server to test a price calculation — responsibilities are mixed.

> [!WARNING]
> SRP does **not** mean "every class should have one method" or "split everything as small as possible". Over-splitting creates a maze of tiny classes that each do almost nothing, and the reader must open fifteen files to follow one feature. Separate along the lines where **change actually comes from**. Code that always changes together should stay together — that is **cohesion**.

## O — The Open/Closed Principle

### Level 1 — The idea

> Software entities should be open for extension, but closed for modification.

The phrase comes from Bertrand Meyer's 1988 book *Object-Oriented Software Construction*. It sounds like a contradiction: how can something be open and closed at once? It means: **you should be able to add new behaviour by adding new code, without editing code that already works.**

Why does that matter? Code that already works has been tested, reviewed and run in production. Every edit to it risks breaking something that worked. If adding the tenth payment method means editing the same function that handles the other nine, every addition risks all nine.

### Level 2 — The violation

```ts
// fragment
function shippingCostPaisa(method: string, weightKg: number): number {
  if (method === "standard") return 25_000 + weightKg * 5_000;
  if (method === "express") return 60_000 + weightKg * 10_000;
  if (method === "pickup") return 0;
  // every new method: edit this function, re-test everything
  throw new Error(`Unknown method ${method}`);
}
```

Every new shipping method requires editing this function. And it is rarely just one function: the label printer, the delivery-time estimate and the tracking-link builder each have the same chain of `if`s.

### Level 3 — Extension points

The tool for the Open/Closed Principle is one you already know: **polymorphism through an interface** ({{ch:object-oriented-programming}}). The code that *uses* shipping methods depends on an interface; each method is a separate implementation; new methods are new code.

```ts
interface ShippingMethod {
  readonly id: string;
  costPaisa(weightKg: number): number;
  estimatedDays(): number;
}

class ShippingCatalogue {
  readonly #methods = new Map<string, ShippingMethod>();

  register(method: ShippingMethod): void {
    this.#methods.set(method.id, method);
  }

  quote(methodId: string, weightKg: number): string {
    const method = this.#methods.get(methodId);
    if (!method) throw new Error(`Unknown shipping method: ${methodId}`);
    return `${methodId}: Rs ${method.costPaisa(weightKg) / 100}, ${method.estimatedDays()} day(s)`;
  }
}

// Existing methods
const standard: ShippingMethod = { id: "standard", costPaisa: (kg) => 25_000 + kg * 5_000, estimatedDays: () => 5 };
const express: ShippingMethod = { id: "express", costPaisa: (kg) => 60_000 + kg * 10_000, estimatedDays: () => 1 };

// A new method, added later, in a new file — no existing code edited
const cashOnDeliveryBike: ShippingMethod = { id: "bike", costPaisa: () => 18_000, estimatedDays: () => 1 };

const catalogue = new ShippingCatalogue();
for (const method of [standard, express, cashOnDeliveryBike]) catalogue.register(method);

console.log(catalogue.quote("standard", 2));
console.log(catalogue.quote("bike", 2));
```

**Output:**

```text
standard: Rs 350, 5 day(s)
bike: Rs 180, 1 day(s)
```

- `ShippingCatalogue` is **closed for modification**: it never needs to change when shipping methods are added. It knows only the `ShippingMethod` interface.
- It is **open for extension** through `register`: anyone can plug in a new method.
- The methods here are plain objects that satisfy the interface — classes are not required.
- Adding `cashOnDeliveryBike` touched no existing code. Only the place that **assembles** the program (the `for` loop that registers methods) lists it. That assembling place is called the **composition root**, and you will see it again under the Dependency Inversion Principle.

### Level 4 — Other ways to make code open

Polymorphism is not the only extension mechanism. Real systems use several:

- **Configuration and data.** If shipping prices differ only by numbers, store them in a table or configuration file. Adding a method then needs no code at all. This is often the simplest and best "extension point".
- **Events.** Code publishes "order placed"; any number of listeners (send email, update stock, notify the warehouse) subscribe. Adding a listener changes nothing in the order code. You will meet the Observer pattern in {{ch:design-patterns}} and event-driven systems in {{ch:event-driven-systems}}.
- **Middleware and plugins.** Web frameworks let you insert steps (logging, authentication) into request handling without editing the framework ({{ch:express}}).
- **Higher-order functions.** Passing a function in is the functional version of the same idea ({{ch:functional-programming}}).

### Level 5 — You cannot be closed against everything

No code is closed against every possible change. Making a module open in one direction requires **predicting** which kind of change is likely. Guess wrong, and you have added an abstraction that never gets used, while the change that actually arrives needs edits anyway.

Practical advice:

- Do not add extension points speculatively (remember YAGNI from {{ch:clean-code}}).
- The **second** time a particular kind of change arrives — a second payment provider, a third report format — introduce the abstraction. Now you know the real shape of the variation.
- Some edits are simply cheaper than abstractions. Editing a three-line `switch` in one place is fine. The principle bites when the same variation is spread across many places, or the code is critical and risky to touch.

## L — The Liskov Substitution Principle

### Level 1 — The idea

> If S is a subtype of T, then objects of type T may be replaced with objects of type S without breaking the program.

Barbara Liskov introduced this idea in a 1987 conference keynote, and later formalised it with Jeannette Wing. In plain words: **a subtype must keep every promise its parent type makes.** Code written against the parent type must keep working, correctly, whatever subtype it actually receives.

The Open/Closed Principle depends on this. If you plug a new shipping method into the catalogue and it behaves differently from what the interface promised — throws where others return, returns a negative cost — then the "closed" code breaks after all.

### Level 2 — The classic example: rectangle and square

In mathematics, a square **is a** rectangle. So it seems natural to write `class Square extends Rectangle`. Watch what happens:

```ts
class Rectangle {
  constructor(protected width: number, protected height: number) {}
  setWidth(w: number): void {
    this.width = w;
  }
  setHeight(h: number): void {
    this.height = h;
  }
  area(): number {
    return this.width * this.height;
  }
}

class Square extends Rectangle {
  constructor(side: number) {
    super(side, side);
  }
  override setWidth(w: number): void {
    this.width = w;
    this.height = w;
  }
  override setHeight(h: number): void {
    this.width = h;
    this.height = h;
  }
}

function stretchToBanner(shape: Rectangle): number {
  shape.setWidth(10);
  shape.setHeight(2);
  return shape.area(); // a caller reasonably expects 20
}

console.log(stretchToBanner(new Rectangle(1, 1)));
console.log(stretchToBanner(new Square(1)));
```

**Output:**

```text
20
4
```

- `Rectangle` makes an **implicit promise**: setting the width does not change the height, and vice versa.
- `Square` must keep its sides equal, so it breaks that promise: `setHeight(2)` also sets the width to 2.
- `stretchToBanner` was written correctly against `Rectangle`. Given a real rectangle, it returns 20. Given a `Square` — which the type system happily accepts, because a `Square` *is a* `Rectangle` by inheritance — it returns 4.
- Nothing crashed. The type checker was satisfied. The program is simply **wrong**, and the bug is in neither function alone; it is in the relationship between them.

The lesson: **"is-a" in the real world does not guarantee "is substitutable" in code.** A mathematical square is a rectangle; a *mutable* `Square` object is not a substitutable `Rectangle` object, because its behaviour under `setWidth` differs.

### Level 3 — Fixing it

The fix is to stop pretending they share a contract they cannot both keep. Give them a common interface containing only what both can honestly promise:

```ts
interface Shape {
  area(): number;
}

class Rect implements Shape {
  constructor(readonly width: number, readonly height: number) {}
  area(): number {
    return this.width * this.height;
  }
  withWidth(width: number): Rect {
    return new Rect(width, this.height);
  }
}

class Sq implements Shape {
  constructor(readonly side: number) {}
  area(): number {
    return this.side * this.side;
  }
  withSide(side: number): Sq {
    return new Sq(side);
  }
}

const shapes: Shape[] = [new Rect(10, 2), new Sq(3), new Rect(1, 1).withWidth(5)];
console.log(shapes.map((s) => s.area()));
```

**Output:**

```text
[ 20, 9, 5 ]
```

- `Shape` promises only `area()`, which every shape can provide correctly.
- Each class has its own way to make a changed copy (`withWidth`, `withSide`). Making them **immutable** ({{ch:functional-programming}}) also removes the problem at its root: the conflict existed only because of setters.
- Code that works with `Shape` now works correctly for every shape.

### Level 4 — The rules of substitution

What exactly must a subtype preserve? The formal version, related to Bertrand Meyer's **Design by Contract**, comes down to a few rules you can check:

| A subtype must not… | Example violation |
|---|---|
| **Demand more** from callers (stronger preconditions) | Parent accepts any amount; subtype rejects amounts over Rs 10,000 |
| **Promise less** in return (weaker postconditions) | Parent always returns a sorted list; subtype returns it unsorted |
| **Break the parent's invariants** | Parent guarantees `balance >= 0`; subtype allows overdraft |
| **Throw new kinds of errors** that callers of the parent do not expect | `save()` on a "read-only repository" subtype throws "not supported" |
| **Change the meaning** of an operation | `Rectangle.setWidth` also changes height |

The most common real-world violation is the "not supported" method:

```ts
// fragment
class ReadOnlyFileStorage extends FileStorage {
  override write(path: string, data: string): void {
    throw new Error("Not supported: storage is read-only");
  }
}
```

Every caller that accepts a `FileStorage` assumes it can write. Handing them a `ReadOnlyFileStorage` creates a crash waiting to happen. The type said "you can write"; the object says "no". The fix is usually to split the type — which is exactly the next principle.

Liskov substitution applies to **interfaces** as much as to inheritance. Every class that `implements Notifier` must behave the way callers of `Notifier` expect: if the contract says "`send` resolves when the message is accepted, and rejects on failure", an implementation that silently drops messages and resolves anyway violates it — even though it compiles.

> [!TIP]
> A practical check for Liskov substitution: write your tests against the **interface**, then run the same test suite against every implementation. If one implementation fails a test that the others pass, it is not substitutable. This technique is sometimes called a **contract test**.

## I — The Interface Segregation Principle

### Level 1 — The idea

> No client should be forced to depend on methods it does not use.

Large, "do-everything" interfaces force every implementation to provide every method — even ones that make no sense for it — and force every client to depend on the whole interface, even when it uses one method.

### Level 2 — A fat interface

```ts
// fragment
interface Storage {
  read(path: string): Promise<string>;
  write(path: string, data: string): Promise<void>;
  delete(path: string): Promise<void>;
  listFiles(prefix: string): Promise<string[]>;
  generateSignedUrl(path: string, expiresInSeconds: number): Promise<string>;
}
```

Three problems:

- An implementation for a read-only archive must still "implement" `write` and `delete` — which leads straight to the Liskov violation above.
- An in-memory storage used in tests must implement `generateSignedUrl`, which has no meaning in memory.
- A report viewer that only ever **reads** depends on the whole interface. Changes to `generateSignedUrl`'s signature force it to be recompiled and reconsidered, even though it never uses that method.

### Level 3 — Role interfaces

Split the interface by **what clients need** — these smaller interfaces are often called **role interfaces**:

```ts
interface FileReader {
  read(path: string): Promise<string>;
}

interface FileWriter {
  write(path: string, data: string): Promise<void>;
}

class InMemoryFiles implements FileReader, FileWriter {
  readonly #files = new Map<string, string>();
  async read(path: string): Promise<string> {
    const data = this.#files.get(path);
    if (data === undefined) throw new Error(`File not found: ${path}`);
    return data;
  }
  async write(path: string, data: string): Promise<void> {
    this.#files.set(path, data);
  }
}

class ArchiveFiles implements FileReader {
  async read(path: string): Promise<string> {
    return `archived contents of ${path}`;
  }
}

// Clients ask only for the role they use
async function printReport(files: FileReader, path: string): Promise<void> {
  console.log(await files.read(path));
}

async function saveReport(files: FileWriter, path: string, body: string): Promise<void> {
  await files.write(path, body);
}

const memory = new InMemoryFiles();
await saveReport(memory, "reports/may.txt", "Sales: Rs 1,200,000");
await printReport(memory, "reports/may.txt");
await printReport(new ArchiveFiles(), "reports/2019.txt");
```

**Output:**

```text
Sales: Rs 1,200,000
archived contents of reports/2019.txt
```

- `FileReader` and `FileWriter` each describe one role.
- `InMemoryFiles` implements **both** roles; a class can implement as many interfaces as it needs. `ArchiveFiles` implements only reading — it never has to pretend it can write.
- `printReport` asks for a `FileReader`. It works with either class. `saveReport` asks for a `FileWriter`, so the compiler **prevents** anyone from passing the read-only archive to it. The mistake that caused a runtime "not supported" error before is now caught at compile time.

### Level 4 — ISP in TypeScript: you can describe exactly what you need

Because TypeScript's types are **structural** ({{ch:typescript-basics}}), a client can declare the tiny shape it needs, even from a big class it does not own, using `Pick`:

```ts
// fragment
// Only the parts of the (large) user service that this function uses
function greet(users: Pick<UserService, "findById">, id: string) { ... }
```

Now `greet` depends on one method, and a test can pass `{ findById: async () => fakeUser }` instead of building a whole `UserService`. This is interface segregation achieved from the **client's** side.

> [!SENIOR]
> A good sign of interface segregation done well: your test doubles are small. If faking a dependency in a test requires writing fifteen stub methods that the test never calls, the code under test depends on more than it uses.

## D — The Dependency Inversion Principle

### Level 1 — The idea

> 1. High-level modules should not depend on low-level modules. Both should depend on abstractions.
> 2. Abstractions should not depend on details. Details should depend on abstractions.

**High-level modules** contain the business policy: "when an order is placed, charge the customer, reserve stock and send a confirmation". **Low-level modules** contain the mechanisms: the SQL, the HTTP calls to a payment provider, the email SDK.

The natural way to write code makes high-level code depend on low-level code: `OrderService` imports `PostgresOrderRepository` and `StripeClient` and `new`s them. That points the dependency arrows the wrong way — from stable, valuable business rules towards volatile technical details.

### Level 2 — Before: high level depends on low level

```ts
// fragment
import { Pool } from "pg";
import { SomeEmailSdk } from "some-email-sdk";

class OrderService {
  private db = new Pool({ connectionString: process.env.DATABASE_URL });
  private email = new SomeEmailSdk(process.env.EMAIL_API_KEY!);

  async placeOrder(customerEmail: string, totalPaisa: number) {
    const result = await this.db.query("INSERT INTO orders (email, total) VALUES ($1, $2) RETURNING id", [customerEmail, totalPaisa]);
    await this.email.send({ to: customerEmail, subject: "Order confirmed", text: `Order ${result.rows[0].id}` });
  }
}
```

```text
   OrderService ─────────▶ pg (PostgreSQL driver)
   (business policy) ────▶ some-email-sdk
```

Problems:

- **Untestable in isolation.** To test the rule "an order confirmation is sent after saving", you need a real database and a real email account.
- **Infrastructure changes ripple into business code.** Switching email providers means editing `OrderService`.
- **Business rules are buried in technical details.** The actual policy — save, then confirm — is two lines lost among connection strings and SQL.

### Level 3 — After: both depend on an abstraction

The high-level module **declares** the interfaces it needs, in its own terms. Low-level modules **implement** them:

```text
   OrderService ─────────▶ OrderRepository ◀───────── PostgresOrderRepository
   (business policy) ────▶ OrderNotifier   ◀───────── EmailOrderNotifier
                          (interfaces owned
                           by the business side)
```

Look at the arrows from the low-level classes: they now point **towards** the abstractions, which belong to the business side. The dependency has been **inverted** — that is where the principle gets its name. Business code no longer knows that PostgreSQL or any email provider exists.

```ts
// ----- business side: owns the abstractions -----
type Order = { readonly id: string; readonly customerEmail: string; readonly totalPaisa: number };

interface OrderRepository {
  save(order: Omit<Order, "id">): Promise<Order>;
}

interface OrderNotifier {
  orderConfirmed(order: Order): Promise<void>;
}

class OrderService {
  constructor(
    private readonly orders: OrderRepository,
    private readonly notifier: OrderNotifier,
  ) {}

  async placeOrder(customerEmail: string, totalPaisa: number): Promise<Order> {
    if (totalPaisa <= 0) throw new Error("Order total must be positive");
    const order = await this.orders.save({ customerEmail, totalPaisa });
    await this.notifier.orderConfirmed(order);
    return order;
  }
}

// ----- infrastructure side: implements the abstractions -----
class InMemoryOrderRepository implements OrderRepository {
  #nextId = 1;
  readonly saved: Order[] = [];
  async save(data: Omit<Order, "id">): Promise<Order> {
    const order = { ...data, id: `ORD-${this.#nextId++}` };
    this.saved.push(order);
    return order;
  }
}

class ConsoleNotifier implements OrderNotifier {
  async orderConfirmed(order: Order): Promise<void> {
    console.log(`Email to ${order.customerEmail}: order ${order.id} confirmed (Rs ${order.totalPaisa / 100})`);
  }
}

// ----- composition root: the one place that picks concrete classes -----
const repository = new InMemoryOrderRepository();
const service = new OrderService(repository, new ConsoleNotifier());

await service.placeOrder("zain@example.com", 349_900);
await service.placeOrder("mehwish@example.com", 120_000);
console.log(repository.saved.map((o) => o.id));
```

**Output:**

```text
Email to zain@example.com: order ORD-1 confirmed (Rs 3499)
Email to mehwish@example.com: order ORD-2 confirmed (Rs 1200)
[ 'ORD-1', 'ORD-2' ]
```

Walk through it:

- `OrderRepository` and `OrderNotifier` are written **in the business's language**: `save` an order, notify that an order was `orderConfirmed`. They say nothing about SQL tables or email templates. An abstraction designed by the high-level side, for its own needs, is sometimes called a **port**; the classes that implement it for a particular technology are **adapters**. This design is known as **ports and adapters** or **hexagonal architecture**, described by Alistair Cockburn.
- `Omit<Order, "id">` is a TypeScript utility type ({{ch:typescript-advanced}}): an `Order` without its `id`, because the repository assigns ids.
- `OrderService` receives its collaborators through its **constructor**. It never uses `new` on infrastructure. Its code is now just the business policy: validate, save, notify.
- `InMemoryOrderRepository` and `ConsoleNotifier` are simple adapters. In production you would add `PostgresOrderRepository` and `EmailOrderNotifier` implementing the same interfaces — and `OrderService` would not change by a single character.
- The **composition root** — the last block — is the only place that knows which concrete classes are used. In a real application it is the program's entry point (for example, `main.ts`), or the framework's dependency injection configuration.

### Level 3 — Testing becomes easy

With dependencies injected, testing business rules needs no database and no email:

```ts
type Order = { readonly id: string; readonly customerEmail: string; readonly totalPaisa: number };
interface OrderRepository { save(order: Omit<Order, "id">): Promise<Order>; }
interface OrderNotifier { orderConfirmed(order: Order): Promise<void>; }

class OrderService {
  constructor(private readonly orders: OrderRepository, private readonly notifier: OrderNotifier) {}
  async placeOrder(customerEmail: string, totalPaisa: number): Promise<Order> {
    if (totalPaisa <= 0) throw new Error("Order total must be positive");
    const order = await this.orders.save({ customerEmail, totalPaisa });
    await this.notifier.orderConfirmed(order);
    return order;
  }
}

// Test doubles: tiny, because the interfaces are tiny
const events: string[] = [];
const fakeRepo: OrderRepository = {
  save: async (data) => {
    events.push("saved");
    return { ...data, id: "TEST-1" };
  },
};
const fakeNotifier: OrderNotifier = {
  orderConfirmed: async (order) => {
    events.push(`notified ${order.id}`);
  },
};

const service = new OrderService(fakeRepo, fakeNotifier);
await service.placeOrder("test@example.com", 1000);
console.log(events.join(" -> "));

events.length = 0;
try {
  await service.placeOrder("test@example.com", 0);
} catch (error) {
  console.log((error as Error).message, "| events:", events.length);
}
```

**Output:**

```text
saved -> notified TEST-1
Order total must be positive | events: 0
```

- The fakes are plain objects with one function each — possible because the interfaces are small (ISP) and the service receives them from outside (DIP).
- The first test proves the **order of operations**: save first, then notify. (If saving fails, no confirmation should be sent — and this structure guarantees it.)
- The second test proves that invalid orders are rejected **before** anything is saved or sent: zero events.
- `events.length = 0` empties the array in place, a common trick for resetting it.

You will write proper tests like these with a test framework in {{ch:testing}}.

### Level 4 — DIP, DI and IoC: three different things

These three terms are often confused:

- **Dependency Inversion Principle (DIP)** — a **design principle**: high-level policy should depend on abstractions it owns, not on low-level details. It is about the **direction** of dependencies.
- **Dependency Injection (DI)** — a **technique**: give an object its dependencies from outside (through the constructor, a method parameter or a property) instead of letting it create them. DI is the most common way to *achieve* DIP. You can use DI without DIP (injecting a concrete `PostgresClient` class, for example), and get only part of the benefit.
- **Inversion of Control (IoC)** — a **broader idea**: your code does not control the flow; a framework calls your code. ("Don't call us, we'll call you" — sometimes called the Hollywood Principle.) A web framework calling your route handlers is IoC. A **DI container** is IoC applied to object creation: the framework creates your objects and passes in their dependencies.

### Level 5 — DI containers

In the example above, the composition root wired three objects by hand. In an application with 200 services, writing all the `new` calls manually becomes tedious. A **DI container** automates it: you register which class provides each interface (often with a **token**, because TypeScript interfaces do not exist at runtime), and the container creates objects and passes dependencies in, in the right order.

Here is the core of how one works:

```ts
type Factory<T> = (c: Container) => T;

class Container {
  readonly #factories = new Map<string, Factory<unknown>>();
  readonly #singletons = new Map<string, unknown>();

  register<T>(token: string, factory: Factory<T>): void {
    this.#factories.set(token, factory);
  }

  resolve<T>(token: string): T {
    if (this.#singletons.has(token)) return this.#singletons.get(token) as T;
    const factory = this.#factories.get(token);
    if (!factory) throw new Error(`Nothing registered for "${token}"`);
    const instance = factory(this) as T;
    this.#singletons.set(token, instance);
    return instance;
  }
}

interface Clock { now(): Date; }
class Greeter {
  constructor(private readonly clock: Clock) {}
  greet(name: string): string {
    return this.clock.now().getUTCHours() < 12 ? `Good morning, ${name}` : `Good afternoon, ${name}`;
  }
}

const container = new Container();
container.register<Clock>("Clock", () => ({ now: () => new Date("2026-02-01T09:30:00Z") }));
container.register<Greeter>("Greeter", (c) => new Greeter(c.resolve<Clock>("Clock")));

console.log(container.resolve<Greeter>("Greeter").greet("Faisal"));
console.log(container.resolve("Greeter") === container.resolve("Greeter"));
```

**Output:**

```text
Good morning, Faisal
true
```

- `register` stores a **factory** — a function that knows how to build something, given the container.
- `resolve` builds the object the first time it is asked for, caching it as a **singleton** (one shared instance), and returns the cached one after that — hence `true` on the last line. Real containers also support other **lifetimes**: a new instance every time ("transient"), or one per HTTP request ("scoped").
- The `Greeter` factory asks the container for its `Clock`. The container resolves dependencies **recursively**.
- The registered clock is fixed to 09:30 UTC, so the output is stable. In production you would register `{ now: () => new Date() }`. Injecting a clock is the object-oriented version of passing "now" as a parameter ({{ch:functional-programming}}).

NestJS has a full container like this built in. Its classes declare dependencies in their constructors, and decorators tell the container what to inject ({{ch:nestjs-basics}}). Many smaller Node.js applications skip containers entirely and wire objects by hand in one file — which is perfectly fine, and easier to understand.

## SOLID together: a refactoring

Here is a small but realistic "before" class that breaks every principle, and the shape of the "after".

```ts
// fragment
class MonthlyReport {
  async run(month: string) {
    const db = new Pool({ connectionString: process.env.DATABASE_URL });          // D: creates its own infrastructure
    const rows = await db.query("SELECT total, region FROM orders WHERE month = $1", [month]);
    let csv = "region,total\n";                                                   // S: data access + formatting + delivery
    for (const r of rows.rows) csv += `${r.region},${r.total}\n`;
    if (process.env.REPORT_FORMAT === "pdf") { /* 60 lines of PDF code */ }        // O: every format edits this method
    await new SomeEmailSdk(process.env.KEY!).send({ to: "finance@shop.example", attachment: csv });
  }
}
```

The "after" separates the **policy** (fetch the month's sales, format them, deliver them) from each **mechanism**:

```ts
type SalesRow = { readonly region: string; readonly totalPaisa: number };

interface SalesSource { salesFor(month: string): Promise<SalesRow[]>; }          // D: owned by the report
interface ReportFormat { readonly extension: string; render(rows: SalesRow[]): string; }  // O: new formats = new classes
interface ReportDelivery { deliver(fileName: string, body: string): Promise<void>; }       // I: one small role each

class MonthlyReport {                                                             // S: only the report policy
  constructor(
    private readonly source: SalesSource,
    private readonly format: ReportFormat,
    private readonly delivery: ReportDelivery,
  ) {}

  async run(month: string): Promise<void> {
    const rows = await this.source.salesFor(month);
    await this.delivery.deliver(`sales-${month}.${this.format.extension}`, this.format.render(rows));
  }
}

const csvFormat: ReportFormat = {
  extension: "csv",
  render: (rows) => ["region,total_rs", ...rows.map((r) => `${r.region},${r.totalPaisa / 100}`)].join("\n"),
};

const textFormat: ReportFormat = {
  extension: "txt",
  render: (rows) => rows.map((r) => `${r.region.padEnd(8)} Rs ${(r.totalPaisa / 100).toLocaleString("en-US")}`).join("\n"),
};

const sampleSource: SalesSource = {
  salesFor: async () => [
    { region: "Punjab", totalPaisa: 125_000_000 },
    { region: "Sindh", totalPaisa: 98_050_000 },
  ],
};

const printDelivery: ReportDelivery = {
  deliver: async (fileName, body) => console.log(`--- ${fileName} ---\n${body}`),
};

await new MonthlyReport(sampleSource, csvFormat, printDelivery).run("2026-04");
await new MonthlyReport(sampleSource, textFormat, printDelivery).run("2026-04");
```

**Output:**

```text
--- sales-2026-04.csv ---
region,total_rs
Punjab,1250000
Sindh,980500
--- sales-2026-04.txt ---
Punjab   Rs 1,250,000
Sindh    Rs 980,500
```

How each principle appears:

- **S:** `MonthlyReport` contains only the report's policy — three lines. Fetching, formatting and delivering are separate, each changeable by the people who own it.
- **O:** a new format (PDF, Excel) is a new `ReportFormat`; `MonthlyReport` does not change. We added the text format without touching the class.
- **L:** any `ReportFormat` returns a string for any rows, and any `ReportDelivery` delivers or rejects — so all of them can be substituted freely.
- **I:** each interface has one small role. A test of formatting needs only rows, not a database or email.
- **D:** `MonthlyReport` depends on interfaces it owns; the PostgreSQL source and the email delivery would be adapters chosen in the composition root.

## From beginner to enterprise

**Level 3 — single program.** Pass collaborators into constructors instead of creating them inside. Keep interfaces small. Avoid inheritance that cannot keep its parent's promises.

**Level 4 — application.** Layers with clear dependency directions: controllers depend on services; services depend on repository and gateway **interfaces**; infrastructure implements those interfaces. One composition root (or a framework's DI module) wires everything.

**Level 5 — professional practice.** Teams enforce dependency rules automatically. For example, lint rules or tools such as `dependency-cruiser` can fail the build if code in `domain/` imports from `infrastructure/`. Contract tests run the same test suite against every implementation of an interface.

**Level 6 — architecture.** The same principles reappear at the level of whole services. **Clean Architecture** (Robert C. Martin) and **hexagonal architecture** (Alistair Cockburn) organise systems as concentric layers where all source-code dependencies point inward, towards business rules. Between services, the "interface" is an API or message format, and substitutability means a new version of a service must honour the contract older clients rely on — the subject of {{ch:api-versioning}}. Single responsibility at this scale shapes how a company splits a system into services owned by different teams ({{ch:microservices}}).

## Real-world use cases

### Swapping a payment provider

- **Business problem:** the current payment provider raises fees; the business wants to move to another within a few weeks, and run both during the transition.
- **Design:** checkout depends on a `PaymentGateway` interface (`charge`, `refund`, `status`). Each provider is an adapter.
- **Why it works:** the switch is new adapter code plus one configuration change in the composition root. Checkout logic — already tested — is not edited. Running both providers side by side is just choosing an adapter per order.
- **Failure scenario:** the interface was designed around the first provider's quirks (for example, a method `createStripePaymentIntent`). The abstraction leaks ({{ch:object-oriented-programming}}), and the "swap" turns into a rewrite. **Lesson:** name abstractions in business terms, not after one vendor.

### Testing business rules quickly

- **Problem:** the test suite takes 40 minutes because every test starts a real database.
- **Solution:** business services depend on repository interfaces; most tests use in-memory implementations and run in seconds. A smaller set of **integration tests** checks the real database adapters ({{ch:testing}}).
- **Trade-off:** in-memory fakes can behave differently from the real database (transactions, unique constraints). Contract tests run against both reduce this risk.

### Over-applied SOLID

- **Situation:** a small internal tool has an interface for every class — `IUserService` with one implementation `UserService`, `IUserRepository` with one implementation, factories that build factories.
- **Result:** every simple change touches three files; new developers cannot find where anything actually happens.
- **Lesson:** an interface with exactly one implementation and no test fake is often just noise. Introduce abstractions where there is real variation, a real testing need, or a real boundary with volatile infrastructure.

## Common mistakes

### Beginner: thinking SRP means "one method per class"

Splitting a cohesive class into many fragments — `UserNameValidator`, `UserEmailValidator`, `UserAgeValidator` — that always change together. **Fix:** group by actor and reason for change, not by count.

### Beginner: inheritance for code reuse

`class AdminUser extends User` just to reuse three methods, then overriding others to throw "not allowed". **Consequence:** Liskov violations and fragile hierarchies. **Fix:** composition, and interfaces for genuinely shared contracts.

### Intermediate: `new` inside business logic

```ts
// fragment
class InvoiceService {
  async send(id: string) {
    const mailer = new SmtpMailer(process.env.SMTP_HOST!); // hidden dependency
  }
}
```

**Consequence:** untestable without a mail server; impossible to swap. **Fix:** inject the mailer through the constructor; create it in the composition root.

### Intermediate: abstractions named after the implementation

`interface MySqlUserStore` or `interface StripeGateway` — an "abstraction" that exposes one vendor's concepts. **Fix:** name by role in the business: `UserRepository`, `PaymentGateway`; keep vendor concepts inside the adapter.

### Production: "not implemented" methods

Classes that implement an interface but throw "not implemented" for half of it. **Consequence:** runtime crashes when a caller uses a method the type said existed. **Fix:** split the interface (ISP) so each class implements only what it can honour.

### Enterprise: service locators everywhere

Code that reaches into a global container — `Container.get("UserRepository")` — from deep inside business logic. Dependencies become invisible (they are not in the constructor), and tests must configure global state. **Fix:** constructor injection; only the composition root talks to the container.

## Debugging and troubleshooting

**Symptom: a change in one feature broke an unrelated one.** Look for shared code serving two actors (SRP). Check the Git history of the file: if it is changed by unrelated features, split it along those lines.

**Symptom: "it works with the real class but fails with the new one".** Probably a Liskov violation: the new implementation breaks an implicit promise (ordering, error behaviour, side effects). Write down the contract explicitly and run the same tests against both.

**Symptom: "Nothing registered for X" or "cannot resolve dependency" at startup.** A DI container cannot build an object because a dependency was not registered, or two services depend on each other in a **cycle** (A needs B, B needs A). Check the registration list; break cycles by extracting the shared part into a third service, or by rethinking which one truly depends on the other.

**Symptom: tests need huge setup.** The code under test depends on more than it uses (ISP) or creates its own dependencies (DIP). Narrow its dependencies and inject them.

## Security and performance

**Security.** SRP and DIP make security controls easier to get right. Authentication, authorisation and input validation that live in single, dedicated components can be reviewed and tested once and reused everywhere ({{ch:application-security}}). An adapter boundary is also a natural place to translate untrusted external data into validated internal types ({{ch:validation}}). Be careful with "extension points" that load code dynamically — plugins chosen by configuration or user input can become a path for running untrusted code.

**Performance.** Interfaces and injected dependencies cost essentially nothing at runtime in JavaScript: a method call through an interface is the same as any other method call, because TypeScript interfaces disappear at compile time. The real performance benefit is indirect: when a slow component sits behind an interface, you can replace it with a faster or cached implementation without touching its callers ({{ch:caching}}).

## How a senior engineer thinks about this

Senior engineers treat SOLID as **diagnostic questions**, not rules to obey everywhere:

- *Who will ask for changes to this code?* If several unrelated groups, separate it. (S)
- *What kind of variation keeps arriving here?* Put an extension point exactly there, and nowhere else. (O)
- *Can every implementation keep the promise the interface makes?* If not, the interface is wrong. (L)
- *What does this client actually use?* Depend on that, and no more. (I)
- *Does my business logic know about a vendor, a database or a framework?* If yes, invert that dependency. (D)

They also know the costs. Every abstraction is a layer of indirection the next reader must follow. A good senior engineer adds an interface when there is a **second implementation**, a **testing need**, or a **volatile boundary** — and is comfortable writing direct, concrete code everywhere else. As Martin himself has stressed, the principles are not laws; they are tools for managing the cost of change.

## Exercises

### Exercise 1 — Name the violation

**Objective:** recognise which principle each snippet breaks.
**What to do:** for each snippet, name the principle violated and give a one-sentence fix.

```ts
// fragment
// A
class UserService {
  async register(...) { ... }
  async exportUsersToCsv() { ... }
  async renderAdminDashboardHtml() { ... }
}

// B
class PremiumAccount extends Account {
  override withdraw(amount: number) {
    if (amount > 50_000) throw new Error("Premium accounts cannot withdraw above Rs 50,000 at once");
    super.withdraw(amount);
  }
}

// C
interface Printer { print(doc: string): void; scan(): string; fax(to: string, doc: string): void; }
class BasicPrinter implements Printer { /* scan and fax throw "not supported" */ }

// D
class WeatherAlertService {
  check() { const api = new ThirdPartyWeatherClient("hardcoded-key"); /* ... */ }
}

// E
function exportReport(format: string) {
  if (format === "csv") { ... } else if (format === "pdf") { ... } else if (format === "xlsx") { ... }
  // a new format is requested every few months
}
```

<details>
<summary>Show the solution</summary>

- **A — Single Responsibility.** Registration (product/security team), CSV export (operations) and admin HTML (admin tooling) serve different actors. Fix: separate `UserRegistration`, `UserExport` and the dashboard view.
- **B — Liskov Substitution.** `Account.withdraw` accepts any amount up to the balance; `PremiumAccount` demands more from callers (a stronger precondition). Code that works with `Account` can crash with a `PremiumAccount`. Fix: make the limit part of the base contract (for example, every account has a `withdrawalLimit`), or do not model it as a subtype.
- **C — Interface Segregation** (leading to a Liskov violation). Fix: split into `Printer`, `Scanner` and `FaxMachine` role interfaces; `BasicPrinter` implements only `Printer`.
- **D — Dependency Inversion.** The service creates a concrete third-party client with a hard-coded key. Fix: define a `WeatherSource` interface in the service's terms and inject an adapter; load the key from configuration in the composition root.
- **E — Open/Closed.** Each new format edits a function that already works. Because new formats keep arriving, this is exactly the right place for an extension point. Fix: a `ReportFormat` interface with one implementation per format, registered in a map.

</details>

### Exercise 2 — Fix the bird

**Objective:** practise fixing a Liskov violation by redesigning types.
**Starting point:**

```ts
// fragment
class Bird {
  fly(): string { return "flying"; }
}
class Penguin extends Bird {
  override fly(): string { throw new Error("Penguins cannot fly"); }
}
function migrate(birds: Bird[]) { return birds.map((b) => b.fly()); }
```

**What to build:** redesign so that `migrate` only accepts birds that can fly, and the compiler rejects passing a penguin. Show it working with a sparrow and failing to compile (in a comment) with a penguin.

<details>
<summary>Show the solution</summary>

```ts
interface Bird {
  readonly name: string;
}

interface FlyingBird extends Bird {
  fly(): string;
}

interface SwimmingBird extends Bird {
  swim(): string;
}

const sparrow: FlyingBird = { name: "sparrow", fly: () => "sparrow flying south" };
const stork: FlyingBird = { name: "stork", fly: () => "stork flying south" };
const penguin: SwimmingBird = { name: "penguin", swim: () => "penguin swimming" };

function migrate(birds: readonly FlyingBird[]): string[] {
  return birds.map((b) => b.fly());
}

console.log(migrate([sparrow, stork]));
console.log(penguin.swim());
// migrate([penguin]); // compile error: property 'fly' is missing in type 'SwimmingBird'
```

**Output:**

```text
[ 'sparrow flying south', 'stork flying south' ]
penguin swimming
```

**Walkthrough:** the original design promised "every bird can fly", and penguins could not keep that promise. The new design only promises flying for `FlyingBird`. `migrate` asks for exactly what it uses (ISP), so a penguin cannot even be passed in: the error moves from **runtime** to **compile time**. `interface FlyingBird extends Bird` means a flying bird has everything a bird has, plus `fly`.

**Common wrong approach:** keeping `fly()` on `Bird` and adding `canFly(): boolean`, then checking it in `migrate`. That works, but every caller must remember the check, and forgetting it crashes at runtime.

</details>

### Exercise 3 — Invert the dependency

**Objective:** practise DIP and testing with fakes.
**Starting point:**

```ts
// fragment
class LowStockAlert {
  async check() {
    const res = await fetch("https://inventory.internal/api/stock");
    const items: { sku: string; qty: number }[] = await res.json();
    for (const item of items) {
      if (item.qty < 5) {
        await fetch("https://chat.internal/api/post", { method: "POST", body: `Low stock: ${item.sku} (${item.qty})` });
      }
    }
  }
}
```

**What to build:** introduce two interfaces owned by the alert (`StockLevels` and `AlertChannel`), inject them, move the threshold into a constructor parameter, and test with in-memory fakes.

<details>
<summary>Show the solution</summary>

```ts
type StockItem = { readonly sku: string; readonly qty: number };

interface StockLevels {
  current(): Promise<StockItem[]>;
}

interface AlertChannel {
  post(message: string): Promise<void>;
}

class LowStockAlert {
  constructor(
    private readonly stock: StockLevels,
    private readonly channel: AlertChannel,
    private readonly threshold: number,
  ) {}

  async check(): Promise<number> {
    const low = (await this.stock.current()).filter((item) => item.qty < this.threshold);
    for (const item of low) {
      await this.channel.post(`Low stock: ${item.sku} (${item.qty})`);
    }
    return low.length;
  }
}

const posted: string[] = [];
const fakeStock: StockLevels = {
  current: async () => [
    { sku: "PEN-BLUE", qty: 2 },
    { sku: "NOTEBOOK", qty: 40 },
    { sku: "INK", qty: 4 },
  ],
};
const fakeChannel: AlertChannel = { post: async (m) => void posted.push(m) };

const alertCount = await new LowStockAlert(fakeStock, fakeChannel, 5).check();
console.log(alertCount, posted);
```

**Output:**

```text
2 [ 'Low stock: PEN-BLUE (2)', 'Low stock: INK (4)' ]
```

**Walkthrough:** the alert now contains only its policy: find items below the threshold and post one message each. It knows nothing about HTTP. The real adapters (`HttpStockLevels`, `ChatAlertChannel`) would wrap the two `fetch` calls and be created in the composition root. `check` also returns how many alerts it sent, which makes testing easier. `async (m) => void posted.push(m)` uses `void` to discard `push`'s return value (the new length), so the function returns `Promise<void>` as the interface requires.

**Common wrong approach:** injecting a generic `HttpClient` instead. That is dependency *injection*, but the alert would still depend on URLs and response formats — the dependency is not *inverted*. The interfaces should be in the alert's own terms.

</details>

### Exercise 4 — Production scenario: a contract test

**Objective:** use the Liskov principle to make two implementations trustworthy.
**The scenario:** your team has a `RateLimiter` interface with `tryAcquire(key: string): boolean` — "returns true at most `limit` times per key; after that, false". There is an in-memory implementation used in tests and a Redis implementation used in production. A bug in production turned out to be the Redis version allowing one extra request.
**What to build:** a single `contractTest` function that checks the promise for **any** implementation, and run it against a correct in-memory limiter and a buggy one.

<details>
<summary>Show the solution</summary>

```ts
interface RateLimiter {
  tryAcquire(key: string): boolean;
}

class InMemoryRateLimiter implements RateLimiter {
  readonly #counts = new Map<string, number>();
  constructor(private readonly limit: number) {}
  tryAcquire(key: string): boolean {
    const used = this.#counts.get(key) ?? 0;
    if (used >= this.limit) return false;
    this.#counts.set(key, used + 1);
    return true;
  }
}

class BuggyRateLimiter implements RateLimiter {
  readonly #counts = new Map<string, number>();
  constructor(private readonly limit: number) {}
  tryAcquire(key: string): boolean {
    const used = this.#counts.get(key) ?? 0;
    this.#counts.set(key, used + 1);
    return used <= this.limit; // off by one
  }
}

function contractTest(name: string, make: (limit: number) => RateLimiter): void {
  const limiter = make(3);
  const results = Array.from({ length: 5 }, () => limiter.tryAcquire("user-1"));
  const allowed = results.filter(Boolean).length;
  const otherKeyAllowed = limiter.tryAcquire("user-2");
  const pass = allowed === 3 && results.slice(3).every((r) => !r) && otherKeyAllowed;
  console.log(`${name}: ${pass ? "PASS" : "FAIL"} (allowed ${allowed} of 5)`);
}

contractTest("InMemoryRateLimiter", (limit) => new InMemoryRateLimiter(limit));
contractTest("BuggyRateLimiter", (limit) => new BuggyRateLimiter(limit));
```

**Output:**

```text
InMemoryRateLimiter: PASS (allowed 3 of 5)
BuggyRateLimiter: FAIL (allowed 4 of 5)
```

**Walkthrough:** the contract test encodes the interface's promise: exactly `limit` successes per key, failures afterwards, and keys independent of each other. It takes a **factory** (`make`), so the same test runs against any implementation. The buggy limiter compares `used <= limit` *before* counting, letting one extra request through — exactly the kind of off-by-one that type-checking cannot catch but a shared behavioural test does. In a real project, the Redis implementation would run the same contract test against a test Redis server ({{ch:testing}}, {{ch:rate-limiting}}).

</details>

## Summary

The SOLID principles control how pieces of software **depend** on each other, so that change stays cheap and safe. Dependencies are paths along which change spreads; the aim is **high cohesion and loose coupling**.

- **Single Responsibility:** a module should answer to one actor — one group of people whose requests change it. Separate code that changes for different reasons, but keep together code that changes together.
- **Open/Closed:** add behaviour by adding code. Use interfaces, configuration, events or plugins as extension points — placed where variation really happens, not speculatively.
- **Liskov Substitution:** subtypes and implementations must keep every promise of their type: no stronger demands, no weaker guarantees, no broken invariants, no surprise errors. "Is-a" in the real world does not guarantee substitutability in code.
- **Interface Segregation:** clients should depend only on what they use. Prefer small role interfaces; in TypeScript, describe exactly the shape you need.
- **Dependency Inversion:** business policy should depend on abstractions it owns, and infrastructure should implement them. Dependency injection is the usual technique, a composition root wires the concrete objects, and DI containers automate the wiring at scale.

Use the principles as questions, not commandments. Every abstraction has a cost; introduce one when there is real variation, a testing need or a volatile boundary.

## Key terms

- **SOLID** — Five object-oriented design principles: single responsibility, open/closed, Liskov substitution, interface segregation and dependency inversion.
- **Dependency** — A relationship in which one piece of code uses another, so changes to the second may force changes to the first.
- **Coupling** — The degree to which separate pieces of code depend on each other.
- **Cohesion** — The degree to which the parts inside one module belong together and serve one purpose.
- **Single Responsibility Principle** — The principle that a module should be responsible to only one actor, and so have only one reason to change.
- **Actor** — A group of people, such as a team or role, whose needs cause a piece of software to change.
- **Open/Closed Principle** — The principle that software should allow new behaviour to be added without modifying existing working code.
- **Extension point** — A place deliberately designed so that new behaviour can be plugged in without editing existing code.
- **Liskov Substitution Principle** — The principle that any subtype must be usable wherever its parent type is expected, without breaking correctness.
- **Precondition** — A condition that must be true before an operation is called.
- **Postcondition** — A condition an operation guarantees will be true after it completes.
- **Contract test** — A shared test suite run against every implementation of an interface to check that each keeps the interface's promises.
- **Interface Segregation Principle** — The principle that clients should not be forced to depend on methods they do not use.
- **Role interface** — A small interface describing one capability that a client needs.
- **Dependency Inversion Principle** — The principle that high-level policy and low-level details should both depend on abstractions owned by the policy.
- **Dependency injection** — Supplying an object's dependencies from outside, usually through its constructor, instead of creating them inside.
- **Inversion of Control** — A design in which a framework or container controls program flow or object creation and calls your code.
- **DI container** — A component that creates objects and automatically supplies their registered dependencies.
- **Composition root** — The single place in an application where concrete classes are chosen and connected together.
- **Port** — An interface defined by the core of an application in its own terms, describing something it needs from the outside world.
- **Adapter** — A class that implements a port using a particular technology, such as a database or external API.
- **Hexagonal architecture** — An architecture, also called ports and adapters, that isolates business logic from infrastructure behind ports.
- **Test double** — A simplified stand-in for a real dependency used in tests, such as a fake or a stub.
- **Service locator** — An object code asks directly for its dependencies, which hides those dependencies and is generally avoided in favour of injection.

## What comes next

SOLID tells you **what properties** good designs have. The next chapter, {{ch:design-patterns}}, shows **proven shapes** that achieve them. Many patterns are the principles in concrete form: Strategy is the Open/Closed Principle with interchangeable algorithms; Adapter is how infrastructure implements the ports of Dependency Inversion; Decorator adds behaviour without modification; Observer lets new reactions plug into events. You will learn the most useful patterns, how they appear in modern TypeScript, and when a pattern is the wrong answer.
