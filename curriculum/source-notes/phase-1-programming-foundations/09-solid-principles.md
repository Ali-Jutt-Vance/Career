# Phase 1 — Chapter 9: SOLID Principles

> *"The goal of software architecture is to minimize the human resources required to build and maintain the required system."* — Robert C. Martin (Uncle Bob)

---

## Chapter Overview

### Why SOLID Exists

SOLID is an acronym for five object-oriented design principles introduced by Robert C. Martin in the early 2000s. These principles guide software design toward systems that are:
- **Maintainable**: Easy to change without unintended consequences
- **Scalable**: Can grow without becoming brittle
- **Testable**: Units can be tested in isolation

Without SOLID, as systems grow, they develop "code rot" — accumulation of technical debt that makes each change more dangerous and expensive. SOLID is the antidote.

**The five principles:**
- **S** — Single Responsibility Principle
- **O** — Open/Closed Principle
- **L** — Liskov Substitution Principle
- **I** — Interface Segregation Principle
- **D** — Dependency Inversion Principle

### Industry Adoption

SOLID is foundational knowledge expected of mid-to-senior engineers at every major company. Understanding SOLID is:
- Required for principal/staff engineering roles
- Essential for technical architecture decisions
- Tested in system design interviews
- The basis for framework design (Spring, NestJS, Angular are built on SOLID principles)

---

## Beginner Theory

### S — Single Responsibility Principle

**"A class should have only one reason to change."**

Every class/module should do one thing and do it well. If a class changes for two different reasons (data changes AND formatting changes), it violates SRP.

```javascript
// VIOLATION: One class doing too many things
class User {
  constructor(name, email) {
    this.name  = name;
    this.email = email;
  }

  validateEmail() {          // validation responsibility
    return /\S+@\S+\.\S+/.test(this.email);
  }

  saveToDatabase(db) {       // persistence responsibility
    db.query("INSERT INTO users ...");
  }

  sendWelcomeEmail(mailer) { // notification responsibility
    mailer.send({ to: this.email, subject: "Welcome!" });
  }

  toJSON() {                 // serialization responsibility
    return JSON.stringify({ name: this.name, email: this.email });
  }
}
// Why does the user class know about the mailer? Or the database?

// CORRECT: Each class has one responsibility
class User {
  constructor(name, email) {
    this.name  = name;
    this.email = email;
  }
}

class UserValidator {
  validate(user) {
    return { isValid: /\S+@\S+\.\S+/.test(user.email) };
  }
}

class UserRepository {
  constructor(db) { this.db = db; }
  async save(user) { return this.db.query("INSERT INTO users ..."); }
}

class UserNotifier {
  constructor(mailer) { this.mailer = mailer; }
  async sendWelcome(user) { return this.mailer.send({ to: user.email }); }
}
```

### O — Open/Closed Principle

**"Software entities should be open for extension, but closed for modification."**

You should be able to add new behavior without changing existing code. This prevents existing (tested, deployed) code from breaking.

```javascript
// VIOLATION: Adding a new discount type requires modifying existing code
class Checkout {
  calculateDiscount(order) {
    if (order.coupon?.type === "percentage") {
      return order.total * (order.coupon.value / 100); // modify here for new type
    }
    if (order.coupon?.type === "fixed") {
      return order.coupon.value;                        // modify here too
    }
    if (order.coupon?.type === "bogo") {                // adding new type = modifying this function!
      return order.total / 2;
    }
    return 0;
  }
}

// CORRECT: New discount types can be added WITHOUT changing Checkout
class Checkout {
  calculateDiscount(order) {
    return order.coupon ? order.coupon.apply(order.total) : 0;
  }
}

class PercentageDiscount {
  constructor(percent) { this.percent = percent; }
  apply(total) { return total * (this.percent / 100); }
}

class FixedDiscount {
  constructor(amount) { this.amount = amount; }
  apply(total) { return Math.min(this.amount, total); }
}

class BuyOneGetOneDiscount {
  apply(total) { return total / 2; }
}

// Adding FreeshippingDiscount? Just create a new class — existing code unchanged!
```

### L — Liskov Substitution Principle

**"Objects of a subclass should be substitutable for objects of the parent class."**

If code works with `Animal`, it must work correctly with `Dog` (where `Dog extends Animal`). The subclass must honor the contract of the parent.

```javascript
// VIOLATION: Square extends Rectangle breaks LSP
class Rectangle {
  constructor(width, height) {
    this.width  = width;
    this.height = height;
  }
  setWidth(w)  { this.width  = w; }
  setHeight(h) { this.height = h; }
  area()       { return this.width * this.height; }
}

class Square extends Rectangle {
  setWidth(w)  { this.width = w; this.height = w; } // VIOLATION: changes height too!
  setHeight(h) { this.height = h; this.width = h; } // VIOLATION: changes width too!
}

function testRectangle(rect) {
  rect.setWidth(5);
  rect.setHeight(3);
  console.assert(rect.area() === 15, "Expected area 15"); // FAILS for Square!
  // Square: 3 * 3 = 9, not 15
}

// CORRECT: Don't inherit if you can't honor the contract
// Option 1: Use composition
class Square {
  constructor(side) { this.side = side; }
  setSide(s) { this.side = s; }
  area() { return this.side ** 2; }
}

// Option 2: Use an abstract shape (no width/height setters)
class Shape {
  area() { throw new Error("Must implement"); }
}

class Rectangle extends Shape {
  constructor(w, h) { super(); this.w = w; this.h = h; }
  area() { return this.w * this.h; }
}

class Square extends Shape {
  constructor(s) { super(); this.s = s; }
  area() { return this.s ** 2; }
}

// Now any code that works with Shape works correctly with both
```

### I — Interface Segregation Principle

**"No client should be forced to depend on methods it does not use."**

Large interfaces should be split into smaller, more specific ones. A class that implements an interface should not be forced to implement methods irrelevant to it.

```typescript
// VIOLATION: Fat interface forces irrelevant methods
interface Animal {
  eat(): void;
  sleep(): void;
  fly(): void;   // Not all animals fly!
  swim(): void;  // Not all animals swim!
  bark(): void;  // Only dogs bark!
}

class Dog implements Animal {
  eat()   { ... }
  sleep() { ... }
  fly()   { throw new Error("Dogs can't fly"); }  // forced to implement irrelevant method
  swim()  { ... }
  bark()  { ... }
}

// CORRECT: Split into specific interfaces
interface Eater   { eat(): void; }
interface Sleeper { sleep(): void; }
interface Flyer   { fly(): void; }
interface Swimmer { swim(): void; }
interface Barker  { bark(): void; }

class Dog implements Eater, Sleeper, Swimmer, Barker {
  eat()   { ... }
  sleep() { ... }
  swim()  { ... }
  bark()  { ... }
  // No fly() — dogs can't fly and don't need to pretend they can
}

class Duck implements Eater, Sleeper, Flyer, Swimmer {
  eat()   { ... }
  sleep() { ... }
  fly()   { ... }
  swim()  { ... }
}
```

### D — Dependency Inversion Principle

**"High-level modules should not depend on low-level modules. Both should depend on abstractions."**

```typescript
// VIOLATION: High-level module (UserService) directly depends on low-level (MySQLDatabase)
class UserService {
  private db = new MySQLDatabase(); // tightly coupled!

  async createUser(data: CreateUserDTO) {
    return this.db.execute("INSERT INTO users ..."); // depends on MySQL specifics
  }
}
// Can't use PostgreSQL or MongoDB without modifying UserService
// Can't test without a real MySQL database

// CORRECT: Both depend on the abstraction (interface)
interface UserRepository {
  findById(id: string): Promise<User | null>;
  create(data: CreateUserDTO): Promise<User>;
  update(id: string, data: UpdateUserDTO): Promise<User>;
  delete(id: string): Promise<void>;
}

// High-level module depends on the abstraction
class UserService {
  constructor(private readonly userRepository: UserRepository) {} // injected!

  async createUser(data: CreateUserDTO): Promise<User> {
    // Validation, business rules...
    return this.userRepository.create(data);
  }
}

// Low-level modules implement the abstraction
class PostgreSQLUserRepository implements UserRepository {
  async create(data: CreateUserDTO) { /* PostgreSQL-specific */ }
  // ...
}

class MongoUserRepository implements UserRepository {
  async create(data: CreateUserDTO) { /* MongoDB-specific */ }
  // ...
}

// In tests:
class InMemoryUserRepository implements UserRepository {
  private users: User[] = [];
  async create(data: CreateUserDTO) {
    const user = { id: uuid(), ...data };
    this.users.push(user);
    return user;
  }
  // ... other methods
}

// Wire up
const userService = new UserService(new PostgreSQLUserRepository());
// Or for testing:
const userService = new UserService(new InMemoryUserRepository());
```

---

## Practical Examples

### SOLID Applied to a Real Feature

**Feature: Notification System**

```typescript
// --- S: Single Responsibility ---
// Each class has ONE job

class NotificationMessage {
  constructor(
    public readonly recipient: string,
    public readonly subject: string,
    public readonly body: string,
    public readonly metadata?: Record<string, unknown>
  ) {}
}

class NotificationLogger {
  log(notification: NotificationMessage, result: "sent" | "failed", err?: Error) {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      recipient: notification.recipient,
      result,
      error: err?.message
    }));
  }
}

// --- O: Open/Closed ---
// Add new channels without modifying NotificationService

interface NotificationChannel {
  send(message: NotificationMessage): Promise<void>;
}

class EmailChannel implements NotificationChannel {
  constructor(private smtp: SMTPClient) {}
  async send(msg: NotificationMessage) {
    await this.smtp.sendMail({ to: msg.recipient, subject: msg.subject, text: msg.body });
  }
}

class SMSChannel implements NotificationChannel {
  constructor(private twilioClient: TwilioClient) {}
  async send(msg: NotificationMessage) {
    await this.twilioClient.messages.create({ to: msg.recipient, body: msg.body });
  }
}

class SlackChannel implements NotificationChannel {
  constructor(private webhookUrl: string) {}
  async send(msg: NotificationMessage) {
    await fetch(this.webhookUrl, { method: "POST", body: JSON.stringify({ text: msg.body }) });
  }
  // Adding a new channel is a new CLASS, not a modification of existing code
}

// --- I: Interface Segregation ---
// Keep NotificationChannel focused on just send()

// BAD: fat interface
interface NotificationChannel {
  send(msg): Promise<void>;
  schedule(msg, date): Promise<void>;  // not all channels support scheduling
  getDeliveryStatus(id): Promise<string>; // not all channels support status
}

// GOOD: split interfaces
interface NotificationChannel { send(msg): Promise<void>; }
interface SchedulableChannel  { schedule(msg, date): Promise<void>; }
interface TrackableChannel    { getStatus(id): Promise<string>; }

// EmailChannel can implement all three; SlackChannel only NotificationChannel

// --- D: Dependency Inversion ---

class NotificationService {
  // Depends on abstractions, not concrete implementations
  constructor(
    private readonly channels: Map<string, NotificationChannel>,
    private readonly logger: NotificationLogger
  ) {}

  async send(channel: string, message: NotificationMessage): Promise<void> {
    const notifier = this.channels.get(channel);
    if (!notifier) throw new Error(`Unknown channel: ${channel}`);

    try {
      await notifier.send(message);
      this.logger.log(message, "sent");
    } catch (err) {
      this.logger.log(message, "failed", err as Error);
      throw err;
    }
  }
}

// Composition root — wire dependencies
const channels = new Map<string, NotificationChannel>([
  ["email", new EmailChannel(smtpClient)],
  ["sms",   new SMSChannel(twilioClient)],
  ["slack", new SlackChannel(process.env.SLACK_WEBHOOK!)]
]);
const notificationService = new NotificationService(channels, new NotificationLogger());

// --- L: Liskov Substitution ---
// Any NotificationChannel can be swapped for any other
// NotificationService works with MockChannel in tests:
class MockChannel implements NotificationChannel {
  public sent: NotificationMessage[] = [];
  async send(msg: NotificationMessage) { this.sent.push(msg); }
}
```

---

## Advanced Concepts

### Dependency Injection Container

```typescript
// Simple IoC (Inversion of Control) Container
// Manages object creation and lifetime

type Constructor<T> = new (...args: any[]) => T;

class Container {
  #bindings = new Map<string, () => any>();
  #singletons = new Map<string, any>();

  // Register a transient (new instance each time)
  bind<T>(token: string, factory: () => T): void {
    this.#bindings.set(token, factory);
  }

  // Register a singleton (same instance every time)
  singleton<T>(token: string, factory: () => T): void {
    this.#bindings.set(token, () => {
      if (!this.#singletons.has(token)) {
        this.#singletons.set(token, factory());
      }
      return this.#singletons.get(token);
    });
  }

  resolve<T>(token: string): T {
    const factory = this.#bindings.get(token);
    if (!factory) throw new Error(`No binding for token: ${token}`);
    return factory();
  }
}

// Registration
const container = new Container();
container.singleton("db",          () => new PostgreSQLDatabase(process.env.DATABASE_URL!));
container.singleton("userRepo",    () => new UserRepository(container.resolve("db")));
container.singleton("emailClient", () => new EmailClient(process.env.SMTP_URL!));
container.bind("userService",      () => new UserService(
  container.resolve("userRepo"),
  container.resolve("emailClient")
));

// Resolution
const userService = container.resolve<UserService>("userService");
```

### SOLID in Practice — Refactoring Example

```typescript
// BEFORE: tightly coupled, hard to test, hard to extend
class ReportGenerator {
  generatePDFReport(data: any[], filePath: string) {
    // Connects to database directly
    const conn = new MySQLConnection("localhost", "user", "pass", "db");
    const rows = conn.query("SELECT * FROM orders WHERE status = 'completed'");

    // Generates PDF with hardcoded formatting
    const pdf = new PDFDocument();
    pdf.fontSize(14).text("Sales Report");
    rows.forEach(row => pdf.text(`${row.date}: $${row.total}`));
    pdf.save(filePath);

    // Sends email directly
    const mailer = new NodeMailer("smtp.gmail.com");
    mailer.sendEmail("reports@company.com", "Report Ready", `Report saved to ${filePath}`);
  }
}

// AFTER: SOLID, testable, extensible
// S: Separated into DataFetcher, ReportFormatter, ReportExporter, Notifier
// O: Add new formatters/exporters without changing existing code
// L: Each implementation honors its interface contract
// I: Small, focused interfaces
// D: ReportService depends on abstractions

interface DataSource   { fetchData(query: DataQuery): Promise<ReportData[]>; }
interface ReportFormatter { format(data: ReportData[], options: FormatOptions): FormattedReport; }
interface ReportExporter  { export(report: FormattedReport, destination: string): Promise<string>; }
interface Notifier        { notify(message: string, recipient: string): Promise<void>; }

class ReportService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly formatter: ReportFormatter,
    private readonly exporter: ReportExporter,
    private readonly notifier: Notifier
  ) {}

  async generateReport(query: DataQuery, options: ReportOptions): Promise<string> {
    const data     = await this.dataSource.fetchData(query);
    const report   = this.formatter.format(data, options.formatOptions);
    const location = await this.exporter.export(report, options.destination);
    await this.notifier.notify(`Report ready at: ${location}`, options.notifyEmail);
    return location;
  }
}
```

---

## Industry Usage

**NestJS** is built entirely on SOLID:
- Modules (S, D)
- Providers/Services (S, D)
- Interfaces (L, I)
- Dependency injection container (D)

**Spring Framework** (Java):
- @Service, @Repository, @Component (S)
- Spring's extension points (O)
- Interface-driven design (L, I, D)

**Angular**:
- Services injected via DI (D)
- Component isolation (S)
- Interfaces for service contracts (L, I)

---

## Security

**SRP** improves security: authentication code in one place means one place to audit. Security vulnerabilities don't spread across the codebase.

**DIP** enables secure testing: mock implementations can simulate attack scenarios without risk to production.

**OCP** allows adding security layers (decorators, middleware) without modifying existing code.

---

## Performance

SOLID principles don't directly impact runtime performance, but they improve the ability to:
- Profile individual components in isolation
- Swap in more performant implementations (DIP)
- Cache at appropriate abstraction boundaries

---

## Interview Preparation

**Q1: Explain the Single Responsibility Principle with a real-world example.**
A: SRP states a class should have only one reason to change. Example: A `UserService` should handle user business logic (registration, authentication). If it also sends emails, generates reports, and accesses the database, it changes whenever any of those concerns change. Better: separate into `UserService`, `EmailService`, `UserRepository`, `ReportService` — each changes only when its one concern changes.

**Q2: What is the Open/Closed Principle and how do you achieve it in practice?**
A: OCP says classes should be open for extension but closed for modification. Achieve it via: (1) Dependency injection — inject strategies instead of hardcoding (2) Abstract classes/interfaces — new types implement the interface (3) Event systems — add listeners without modifying the subject. Example: add new payment methods by implementing a `PaymentProvider` interface, not by modifying the `PaymentService`.

**Q3: What is the Liskov Substitution Principle? Why is it important?**
A: LSP says subclasses must be substitutable for their base classes without breaking the program. Violated when a subclass: throws exceptions the base class never throws, requires stronger preconditions (more specific input), provides weaker postconditions (less guarantees on output), or overrides methods to throw "not supported" errors. Importance: code that uses a base class reference must work correctly with any subclass.

**Q4: What is the Dependency Inversion Principle? How does it enable unit testing?**
A: DIP says high-level modules should depend on abstractions, not concrete implementations. Enables testing by: instead of `new UserRepository()`, you inject the dependency. In tests, inject a mock or in-memory implementation. The business logic (UserService) is tested independently of database or network.

**Q5: How are SOLID and design patterns related?**
A: SOLID principles are *guidelines*; design patterns are *solutions*. Many design patterns implement SOLID principles:
- Factory Pattern → OCP (add new types without modifying factory)
- Strategy Pattern → OCP + DIP (inject algorithm, depend on abstraction)
- Decorator Pattern → OCP (add behavior without modification)
- Observer Pattern → DIP (observer depends on abstract interface)

---

## Practical Tasks

### Beginner (10 Tasks)
1. Find SRP violations in provided code and refactor.
2. Implement an OCP-compliant discount system.
3. Find LSP violations in a shape hierarchy and fix them.
4. Split a fat interface into focused ones (ISP).
5. Refactor tightly coupled code to use dependency injection (DIP).
6. Write unit tests that only pass because DIP is applied correctly.
7. Design a payment system following all 5 SOLID principles.
8. Refactor a God Class into multiple SRP-compliant classes.
9. Demonstrate OCP by adding a new feature without changing existing tests.
10. Write a class that violates all 5 SOLID principles, then fix them one by one.

### Intermediate (10 Tasks)
1. Build a notification system demonstrating all 5 SOLID principles.
2. Design a plugin architecture that follows OCP.
3. Implement a DI container and use it to wire up a feature.
4. Apply SOLID to refactor a monolithic service into composable parts.
5. Design a report generator that's open for new output formats.
6. Create a test harness that proves your system follows LSP.
7. Implement ISP by showing how client classes use only what they need.
8. Design a storage abstraction that can be swapped between S3, local disk, and in-memory.
9. Refactor an Express controller to follow SRP and DIP.
10. Write an architecture diagram showing SOLID relationships in a real feature.

### Advanced (10 Tasks)
1. Build a full-featured DI container with scopes (singleton, transient, scoped).
2. Design a microservice architecture where SOLID principles operate at the service level.
3. Implement a code analysis tool that detects SOLID violations.
4. Apply SOLID to a legacy PHP codebase migration to Node.js.
5. Design a modular monolith with strict module boundaries following SOLID.
6. Create an event-driven system where OCP applies to event handlers.
7. Implement a multi-database ORM following DIP and LSP.
8. Design a testing framework following all SOLID principles.
9. Build a CMS plugin system using OCP and DIP.
10. Demonstrate how SOLID at the class level translates to SOLID at the service/microservice level.

---

## Mini Project

**Refactoring Challenge**: Take a provided "Big Ball of Mud" — a single 200-line class that reads user data from a MySQL database, validates it, transforms it, sends email notifications, and generates a PDF report. Refactor it to follow all 5 SOLID principles. Write tests for each component.

---

## Production Project

**E-Commerce Order Processing Pipeline**: Build an order processing system demonstrating SOLID:
- **S**: Separate classes for validation, pricing, inventory, payment, fulfillment, notification
- **O**: New payment methods, shipping methods, and discount types as new classes
- **L**: All payment providers honor the same contract
- **I**: Inventory checking separated from inventory reservation
- **D**: OrderService depends on interfaces; concrete implementations injected

---

## Capstone Project

**Modular Framework**: Build a minimal web framework (inspired by NestJS):
- **S**: Separate request handling, routing, DI, middleware
- **O**: Controllers, middleware, and interceptors extend the framework without modification
- **L**: Any HTTP handler can replace any other
- **I**: Separate interfaces for routing, DI, middleware, exception handling
- **D**: Framework core depends on interfaces; user code provides implementations

---

## Self Assessment
1. What does each letter in SOLID stand for?
2. Explain SRP. Name a class that violates it and explain why.
3. Explain OCP. How do you achieve it in practice?
4. What is the classic LSP violation example (Square/Rectangle)? Why is it a violation?
5. Explain ISP with an example.
6. Explain DIP. How does it differ from dependency injection?
7. What is dependency injection? Name three forms (constructor, setter, method).
8. How does SOLID relate to testability?
9. Give an example where applying OCP requires defining an abstraction first.
10. How does DIP relate to the "program to an interface, not an implementation" principle?
11. Can a class follow SRP but still be tightly coupled? Explain.
12. What is the relationship between SOLID and design patterns?
13. Does SOLID mean you should never modify existing classes?
14. What is a "God Class"? Which SOLID principle addresses it?
15. How do SOLID principles reduce the cost of changing software?

---

## Cheat Sheet

```
S — Single Responsibility
    One class = one reason to change
    Symptom of violation: "AND" in class description
    Fix: extract classes, one per responsibility

O — Open/Closed
    Add features by adding code, not modifying existing code
    Mechanism: interfaces, abstract classes, strategy/decorator patterns
    Symptom: modifying existing code to add features

L — Liskov Substitution
    Subclass can always replace parent without breaking behavior
    Symptom: subclass throws "Not supported" or changes parent semantics
    Fix: use composition instead, or restructure hierarchy

I — Interface Segregation
    Clients shouldn't depend on methods they don't use
    Symptom: "throw new Error('Not implemented')" in implemented methods
    Fix: split fat interface into smaller, role-based interfaces

D — Dependency Inversion
    Depend on abstractions (interfaces), not concretions (classes)
    Symptom: "new MySQLDatabase()" inside a high-level service
    Fix: inject dependencies via constructor, depend on interfaces
    Benefit: swap implementations, test with mocks

Remember:
  SRP — who does it?      (responsibilities)
  OCP — how it grows?     (extension points)
  LSP — who uses it?      (substitutability)
  ISP — who needs it?     (client interfaces)
  DIP — how it connects?  (abstractions)
```
