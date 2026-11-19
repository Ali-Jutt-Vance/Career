# Phase 1 — Chapter 8: Design Patterns

> *"Each pattern describes a problem which occurs over and over again in our environment, and then describes the core of the solution to that problem."* — Christopher Alexander (architect, whose work inspired the GoF)

---

## Chapter Overview

### Why Design Patterns Exist

In 1994, four software engineers (Erich Gamma, Richard Helm, Ralph Johnson, John Vlissides — the "Gang of Four") published *Design Patterns: Elements of Reusable Object-Oriented Software*. They documented 23 recurring solutions to common software design problems.

The insight: experienced engineers kept solving the same structural problems over and over. Documenting these solutions as named patterns created a shared vocabulary. When a senior engineer says "use a Factory Pattern here," everyone on the team immediately understands the structure and intent.

Design patterns are not code you copy-paste. They're **templates** — general solutions to recurring problems, adapted to your specific context.

### Problems They Solve

- **Creational patterns**: How to create objects flexibly (Factory, Builder, Singleton)
- **Structural patterns**: How to compose objects and classes (Adapter, Decorator, Proxy, Facade)
- **Behavioral patterns**: How objects communicate and distribute responsibility (Observer, Strategy, Command, Template Method)

### Why Senior Engineers Care

Patterns are a communication tool. "This is a Strategy pattern" communicates an entire architecture in four words. Understanding patterns helps you:
- Recognize when a pattern is appropriate
- Avoid over-engineering (not every problem needs a pattern)
- Communicate design decisions clearly
- Review code more effectively

---

## Beginner Theory

### Pattern Categories

```
Design Patterns
├── Creational (how objects are created)
│   ├── Factory Method
│   ├── Abstract Factory
│   ├── Builder
│   ├── Prototype
│   └── Singleton
│
├── Structural (how objects are composed)
│   ├── Adapter
│   ├── Bridge
│   ├── Composite
│   ├── Decorator
│   ├── Facade
│   ├── Flyweight
│   └── Proxy
│
└── Behavioral (how objects communicate)
    ├── Chain of Responsibility
    ├── Command
    ├── Iterator
    ├── Mediator
    ├── Memento
    ├── Observer
    ├── State
    ├── Strategy
    ├── Template Method
    └── Visitor
```

---

## Basic Examples — Creational Patterns

### Factory Pattern

```javascript
// Problem: creating objects without specifying the exact class
// Solution: a function that creates objects based on a type parameter

// Without Factory
if (type === "email")     return new EmailNotifier(config);
if (type === "sms")       return new SMSNotifier(config);
if (type === "push")      return new PushNotifier(config);
// Scattered throughout codebase — hard to change, extend

// With Factory
class NotifierFactory {
  static #registry = new Map();

  static register(type, Notifier) {
    this.#registry.set(type, Notifier);
  }

  static create(type, config) {
    const Notifier = this.#registry.get(type);
    if (!Notifier) throw new Error(`Unknown notifier type: "${type}"`);
    return new Notifier(config);
  }
}

// Register notifiers
NotifierFactory.register("email",  EmailNotifier);
NotifierFactory.register("sms",    SMSNotifier);
NotifierFactory.register("push",   PushNotifier);
NotifierFactory.register("slack",  SlackNotifier); // easy to add new types!

// Usage
const notifier = NotifierFactory.create(user.preferredChannel, config);
await notifier.send(message);
```

### Builder Pattern

```javascript
// Problem: constructing complex objects step by step
// Solution: a builder class that constructs the object incrementally

class EmailBuilder {
  #email = {
    from:     null,
    to:       [],
    cc:       [],
    bcc:      [],
    subject:  "",
    body:     "",
    html:     null,
    attachments: []
  };

  from(address)          { this.#email.from = address;         return this; }
  to(...addresses)       { this.#email.to.push(...addresses);  return this; }
  cc(...addresses)       { this.#email.cc.push(...addresses);  return this; }
  bcc(...addresses)      { this.#email.bcc.push(...addresses); return this; }
  subject(subject)       { this.#email.subject = subject;      return this; }
  text(body)             { this.#email.body = body;            return this; }
  html(html)             { this.#email.html = html;            return this; }
  attach(path, name)     { this.#email.attachments.push({ path, name }); return this; }

  build() {
    if (!this.#email.from) throw new Error("from is required");
    if (!this.#email.to.length) throw new Error("at least one recipient required");
    if (!this.#email.subject) throw new Error("subject is required");
    return { ...this.#email }; // return immutable copy
  }
}

// Readable, chainable construction
const email = new EmailBuilder()
  .from("noreply@example.com")
  .to("alice@example.com", "bob@example.com")
  .cc("manager@example.com")
  .subject("Your order has shipped!")
  .html("<h1>Your order is on its way!</h1>")
  .attach("./invoice.pdf", "invoice.pdf")
  .build();
```

### Singleton Pattern

```javascript
// Problem: ensure only one instance of a class exists
// Solution: class manages its own single instance
// WARNING: singletons are often an anti-pattern — prefer dependency injection

class DatabaseConnection {
  static #instance = null;
  #connection = null;
  #isConnected = false;

  constructor() {
    if (DatabaseConnection.#instance) {
      return DatabaseConnection.#instance; // return existing instance
    }
    DatabaseConnection.#instance = this;
  }

  static getInstance() {
    if (!this.#instance) {
      this.#instance = new DatabaseConnection();
    }
    return this.#instance;
  }

  async connect(url) {
    if (this.#isConnected) return this;
    this.#connection = await pg.connect(url);
    this.#isConnected = true;
    return this;
  }

  // Better alternative: module-level singleton (Node.js modules are cached)
}

// Node.js module caching makes this pattern natural:
// database.js
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
module.exports = pool; // same pool everywhere this module is imported
```

### Prototype Pattern

```javascript
// Problem: create new objects by cloning an existing object
// Solution: implement a clone method

class User {
  constructor(name, email, role, permissions) {
    this.name        = name;
    this.email       = email;
    this.role        = role;
    this.permissions = [...permissions]; // copy array
  }

  clone() {
    return new User(this.name, this.email, this.role, [...this.permissions]);
  }

  withRole(role, permissions) {
    const user = this.clone();
    user.role        = role;
    user.permissions = [...permissions];
    return user;
  }
}

const defaultUser = new User("", "", "user", ["read"]);
const admin       = defaultUser.withRole("admin", ["read", "write", "delete"]);
const moderator   = defaultUser.withRole("moderator", ["read", "write"]);

// Also: Object.create() uses prototype chain for prototype pattern
const baseConfig = {
  timeout:    5000,
  retries:    3,
  logLevel:   "info",
  clone() { return Object.create(this); }
};

const devConfig  = Object.assign(baseConfig.clone(), { logLevel: "debug", timeout: 30000 });
const prodConfig = Object.assign(baseConfig.clone(), { logLevel: "warn", retries: 5 });
```

---

## Intermediate Examples — Structural Patterns

### Adapter Pattern

```javascript
// Problem: make two incompatible interfaces work together
// Solution: wrap one interface to look like another

// Legacy payment system (old interface)
class LegacyPaymentGateway {
  doPayment(amount_cents, card_number, exp, cvv) {
    // old API...
  }
}

// New interface your app expects
class PaymentProcessor {
  charge(amountDollars, cardDetails) { } // expected interface
}

// Adapter: wraps legacy to match new interface
class PaymentGatewayAdapter extends PaymentProcessor {
  constructor(legacyGateway) {
    super();
    this.legacy = legacyGateway;
  }

  async charge(amountDollars, { number, expiry, cvv }) {
    const amountCents = Math.round(amountDollars * 100); // convert
    const [month, year] = expiry.split("/");
    return this.legacy.doPayment(amountCents, number, `${month}${year}`, cvv);
  }
}

// Usage — your code only knows about PaymentProcessor interface
const processor = new PaymentGatewayAdapter(new LegacyPaymentGateway());
await processor.charge(99.99, { number: "4111...", expiry: "12/26", cvv: "123" });
```

### Decorator Pattern

```javascript
// Problem: add behavior to objects without modifying their class
// Solution: wrap the object with a decorator that adds behavior

// Base interface
class DataStore {
  async get(key)           { throw new Error("Not implemented"); }
  async set(key, value)    { throw new Error("Not implemented"); }
  async delete(key)        { throw new Error("Not implemented"); }
}

// Concrete implementation
class RedisStore extends DataStore {
  constructor(client) { super(); this.client = client; }
  async get(key)        { return this.client.get(key); }
  async set(key, value) { return this.client.set(key, value); }
  async delete(key)     { return this.client.del(key); }
}

// Decorator: adds caching layer
class CachedStore extends DataStore {
  constructor(store, ttlMs = 60000) {
    super();
    this.store  = store;
    this.cache  = new Map();
    this.ttlMs  = ttlMs;
  }

  async get(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.ttlMs) {
      return cached.value; // cache hit
    }
    const value = await this.store.get(key);
    this.cache.set(key, { value, timestamp: Date.now() });
    return value;
  }

  async set(key, value) {
    this.cache.delete(key); // invalidate cache
    return this.store.set(key, value);
  }

  async delete(key) {
    this.cache.delete(key);
    return this.store.delete(key);
  }
}

// Decorator: adds logging
class LoggedStore extends DataStore {
  constructor(store, logger) { super(); this.store = store; this.logger = logger; }

  async get(key) {
    const start = Date.now();
    const value = await this.store.get(key);
    this.logger.info("Store.get", { key, hit: value !== null, ms: Date.now() - start });
    return value;
  }

  async set(key, value) {
    const result = await this.store.set(key, value);
    this.logger.info("Store.set", { key });
    return result;
  }

  async delete(key) {
    const result = await this.store.delete(key);
    this.logger.info("Store.delete", { key });
    return result;
  }
}

// Compose decorators — order matters!
const store = new LoggedStore(
  new CachedStore(
    new RedisStore(redisClient),
    30000 // 30s TTL
  ),
  logger
);

// store transparently: logs → checks cache → goes to Redis
await store.get("user:123");
```

### Facade Pattern

```javascript
// Problem: complex subsystem is hard to use directly
// Solution: provide a simple interface to the complex subsystem

// Complex subsystem (many classes, complex interactions)
class VideoEncoder     { encode(file, codec) { ... } }
class AudioExtractor   { extract(file) { ... } }
class ThumbnailGen     { generate(file, time) { ... } }
class CdnUploader      { upload(files) { ... } }
class DatabaseUpdater  { update(id, data) { ... } }
class NotificationSvc  { notify(userId, msg) { ... } }

// Facade: simple API for uploading a video
class VideoUploadFacade {
  constructor(encoder, audio, thumbGen, cdn, db, notify) {
    this.encoder = encoder;
    this.audio   = audio;
    this.thumbGen = thumbGen;
    this.cdn     = cdn;
    this.db      = db;
    this.notify  = notify;
  }

  async uploadVideo(videoFile, userId) {
    // Orchestrate the complex subsystem behind a simple interface
    const [encodedVideo, audioTrack, thumbnail] = await Promise.all([
      this.encoder.encode(videoFile, "h264"),
      this.audio.extract(videoFile),
      this.thumbGen.generate(videoFile, 5) // thumbnail at 5 seconds
    ]);

    const urls = await this.cdn.upload({ encodedVideo, audioTrack, thumbnail });
    const video = await this.db.update(videoFile.id, { urls, status: "ready" });
    await this.notify.notify(userId, `Your video "${video.title}" is ready!`);
    return video;
  }
}

// Caller only needs to know about the Facade
const facade = new VideoUploadFacade(/* inject dependencies */);
const video  = await facade.uploadVideo(uploadedFile, userId);
```

### Proxy Pattern

```javascript
// Problem: control access to an object
// Solution: provide a surrogate that controls access to the real object

// Uses: lazy initialization, access control, logging, caching, validation

// Access control proxy
function createSecureProxy(target, user) {
  return new Proxy(target, {
    get(obj, prop) {
      // Check permission before allowing access
      const requiredPermission = `${obj.constructor.name}:${String(prop)}:read`;
      if (!user.hasPermission(requiredPermission)) {
        throw new PermissionError(`User lacks permission: ${requiredPermission}`);
      }
      const value = obj[prop];
      return typeof value === "function" ? value.bind(obj) : value;
    },

    set(obj, prop, value) {
      const requiredPermission = `${obj.constructor.name}:${String(prop)}:write`;
      if (!user.hasPermission(requiredPermission)) {
        throw new PermissionError(`User lacks permission: ${requiredPermission}`);
      }
      obj[prop] = value;
      return true;
    }
  });
}

// Lazy initialization proxy (don't create expensive object until needed)
function createLazyProxy(factory) {
  let instance = null;
  return new Proxy({}, {
    get(_, prop) {
      if (!instance) {
        console.log("Initializing expensive object...");
        instance = factory();
      }
      const value = instance[prop];
      return typeof value === "function" ? value.bind(instance) : value;
    }
  });
}

const lazyDB = createLazyProxy(() => new ExpensiveDatabaseConnection());
// Connection not made until first method call
const result = await lazyDB.query("SELECT 1"); // connects now
```

---

## Intermediate Examples — Behavioral Patterns

### Observer Pattern

```javascript
// Problem: notify multiple objects about state changes
// Solution: subject maintains list of observers, notifies on change

// Already covered in OOP chapter — here's the production version
class EventEmitter {
  #events = new Map();
  #maxListeners = 100;

  on(event, listener, { once = false } = {}) {
    if (!this.#events.has(event)) this.#events.set(event, []);
    const listeners = this.#events.get(event);
    if (listeners.length >= this.#maxListeners) {
      console.warn(`MaxListeners exceeded for event: ${event}`);
    }
    listeners.push({ listener, once });
    return () => this.off(event, listener); // return unsubscribe
  }

  once(event, listener) { return this.on(event, listener, { once: true }); }

  off(event, listener) {
    const listeners = this.#events.get(event) || [];
    this.#events.set(event, listeners.filter(l => l.listener !== listener));
  }

  emit(event, ...args) {
    const listeners = [...(this.#events.get(event) || [])];
    const toRemove  = [];

    listeners.forEach(({ listener, once }) => {
      try { listener(...args); }
      catch (err) { this.emit("error", err); }
      if (once) toRemove.push(listener);
    });

    toRemove.forEach(listener => this.off(event, listener));
    return listeners.length > 0;
  }

  removeAllListeners(event) {
    if (event) this.#events.delete(event);
    else this.#events.clear();
  }
}
```

### Strategy Pattern

```javascript
// Problem: define a family of algorithms, make them interchangeable
// Solution: encapsulate each algorithm behind a common interface

// Shipping cost calculation — different strategies for different carriers
const shippingStrategies = {
  standard: (weight, distance) => Math.max(5, weight * 0.5 + distance * 0.01),
  express:  (weight, distance) => Math.max(15, weight * 1.5 + distance * 0.05),
  overnight:(weight, distance) => Math.max(30, weight * 2.5 + distance * 0.1),
  free:     ()                 => 0
};

class Order {
  constructor(items, shippingStrategy = "standard") {
    this.items    = items;
    this.strategy = shippingStrategy;
  }

  setShippingStrategy(strategy) {
    if (!shippingStrategies[strategy]) throw new Error(`Unknown strategy: ${strategy}`);
    this.strategy = strategy;
    return this;
  }

  calculateShipping(weight, distance) {
    return shippingStrategies[this.strategy](weight, distance);
  }

  // Can also use class instances for strategies with state
}

// Sort strategy
class DataSorter {
  constructor(strategy) {
    this.strategy = strategy;
  }

  sort(data) {
    return this.strategy.sort(data);
  }
}

const bubbleSortStrategy = {
  sort(data) {
    const arr = [...data];
    for (let i = 0; i < arr.length; i++)
      for (let j = 0; j < arr.length - i - 1; j++)
        if (arr[j] > arr[j+1]) [arr[j], arr[j+1]] = [arr[j+1], arr[j]];
    return arr;
  }
};

const nativeSortStrategy = {
  sort: data => [...data].sort((a, b) => a - b)
};

// Swap strategies at runtime
const sorter = new DataSorter(nativeSortStrategy);
sorter.sort([5, 3, 1, 4, 2]); // [1, 2, 3, 4, 5]
sorter.strategy = bubbleSortStrategy; // switch algorithm
```

### Command Pattern

```javascript
// Problem: encapsulate requests as objects for queuing, logging, undo
// Solution: command objects with execute() and undo()

class TextEditor {
  constructor() {
    this.content  = "";
    this.history  = [];
    this.redoStack = [];
  }

  executeCommand(command) {
    command.execute();
    this.history.push(command);
    this.redoStack = []; // clear redo on new command
  }

  undo() {
    const command = this.history.pop();
    if (command) {
      command.undo();
      this.redoStack.push(command);
    }
  }

  redo() {
    const command = this.redoStack.pop();
    if (command) {
      command.execute();
      this.history.push(command);
    }
  }
}

// Command implementations
class InsertTextCommand {
  constructor(editor, position, text) {
    this.editor   = editor;
    this.position = position;
    this.text     = text;
  }

  execute() {
    this.editor.content =
      this.editor.content.slice(0, this.position) +
      this.text +
      this.editor.content.slice(this.position);
  }

  undo() {
    this.editor.content =
      this.editor.content.slice(0, this.position) +
      this.editor.content.slice(this.position + this.text.length);
  }
}

class DeleteTextCommand {
  constructor(editor, position, length) {
    this.editor   = editor;
    this.position = position;
    this.length   = length;
    this.deleted  = "";
  }

  execute() {
    this.deleted = this.editor.content.slice(this.position, this.position + this.length);
    this.editor.content =
      this.editor.content.slice(0, this.position) +
      this.editor.content.slice(this.position + this.length);
  }

  undo() {
    this.editor.content =
      this.editor.content.slice(0, this.position) +
      this.deleted +
      this.editor.content.slice(this.position);
  }
}

const editor = new TextEditor();
editor.executeCommand(new InsertTextCommand(editor, 0, "Hello World"));
editor.executeCommand(new InsertTextCommand(editor, 5, " Beautiful"));
console.log(editor.content); // "Hello Beautiful World"
editor.undo();
console.log(editor.content); // "Hello World"
editor.undo();
console.log(editor.content); // ""
```

### Template Method Pattern

```javascript
// Problem: define the skeleton of an algorithm; let subclasses fill in steps
// Solution: abstract base class with concrete template method

class DataMigration {
  // Template method — defines the algorithm skeleton
  async run() {
    console.log("Starting migration...");
    const data = await this.extract();
    const transformed = await this.transform(data);
    await this.load(transformed);
    await this.validate();
    await this.cleanup();
    console.log("Migration completed.");
  }

  // Abstract methods — must be implemented by subclasses
  async extract()           { throw new Error("extract() must be implemented"); }
  async transform(data)     { throw new Error("transform() must be implemented"); }
  async load(data)          { throw new Error("load() must be implemented"); }

  // Hook methods — may be overridden (have default implementations)
  async validate()          { /* default: no validation */ }
  async cleanup()           { /* default: no cleanup */ }
}

class UserMigration extends DataMigration {
  async extract() {
    return db.query("SELECT * FROM old_users");
  }

  async transform(users) {
    return users.map(user => ({
      id:         user.user_id,
      name:       `${user.first_name} ${user.last_name}`,
      email:      user.email_address.toLowerCase(),
      createdAt:  new Date(user.created_date)
    }));
  }

  async load(users) {
    await db.batchInsert("users", users, 100);
  }

  // Override hook
  async validate() {
    const count = await db.count("users");
    const oldCount = await db.count("old_users");
    if (count !== oldCount) throw new Error(`Count mismatch: ${count} vs ${oldCount}`);
  }
}

await new UserMigration().run();
```

### Chain of Responsibility

```javascript
// Problem: pass request through chain of handlers; each decides to handle or pass
// Solution: linked list of handlers; each calls next() to pass along

class MiddlewareChain {
  #middlewares = [];

  use(fn) {
    this.#middlewares.push(fn);
    return this;
  }

  async execute(context) {
    let index = -1;

    const next = async () => {
      index++;
      const middleware = this.#middlewares[index];
      if (middleware) await middleware(context, next);
    };

    await next();
    return context;
  }
}

// HTTP middleware example (like Express)
const chain = new MiddlewareChain()
  .use(async (ctx, next) => {
    console.log(`[${new Date().toISOString()}] ${ctx.method} ${ctx.path}`);
    await next(); // pass to next middleware
    console.log(`Response: ${ctx.status}`);
  })
  .use(async (ctx, next) => {
    const token = ctx.headers.authorization;
    if (!token) { ctx.status = 401; return; } // stop chain
    ctx.user = await verifyToken(token);
    await next();
  })
  .use(async (ctx, next) => {
    ctx.startTime = Date.now();
    await next();
    ctx.responseTime = Date.now() - ctx.startTime;
  })
  .use(async (ctx) => {
    ctx.body   = { message: "Hello, " + ctx.user.name };
    ctx.status = 200;
  });
```

---

## Advanced Concepts

### CQRS and Event Sourcing Patterns

```javascript
// Command Query Responsibility Segregation
// Separate read models (queries) from write models (commands)

// Command side — handles writes
class OrderCommandHandler {
  constructor(orderRepository, eventBus) {
    this.orderRepository = orderRepository;
    this.eventBus        = eventBus;
  }

  async handle(command) {
    switch (command.type) {
      case "CREATE_ORDER": {
        const order = new Order(command.payload);
        await this.orderRepository.save(order);
        this.eventBus.publish("order.created", order);
        break;
      }
      case "CANCEL_ORDER": {
        const order = await this.orderRepository.findById(command.orderId);
        order.cancel(command.reason);
        await this.orderRepository.save(order);
        this.eventBus.publish("order.cancelled", { orderId: command.orderId });
        break;
      }
    }
  }
}

// Query side — handles reads (optimized for read performance)
class OrderQueryHandler {
  constructor(readModel) {
    this.readModel = readModel; // might be a read-optimized database/cache
  }

  async getActiveOrdersByUser(userId) {
    return this.readModel.query(
      "SELECT * FROM order_summaries WHERE user_id = ? AND status = 'active'",
      [userId]
    );
  }
}
```

### Interpreter Pattern

```javascript
// Parse and evaluate simple expressions
// Used in: query languages, configuration DSLs, template engines

class AndExpression {
  constructor(left, right) { this.left = left; this.right = right; }
  interpret(context) { return this.left.interpret(context) && this.right.interpret(context); }
}

class OrExpression {
  constructor(left, right) { this.left = left; this.right = right; }
  interpret(context) { return this.left.interpret(context) || this.right.interpret(context); }
}

class NotExpression {
  constructor(expr) { this.expr = expr; }
  interpret(context) { return !this.expr.interpret(context); }
}

class PermissionExpression {
  constructor(permission) { this.permission = permission; }
  interpret(context) { return context.user.permissions.includes(this.permission); }
}

// Build expression tree for: (read AND write) OR admin
const canEdit = new OrExpression(
  new AndExpression(
    new PermissionExpression("read"),
    new PermissionExpression("write")
  ),
  new PermissionExpression("admin")
);

const context = { user: { permissions: ["read", "write"] } };
console.log(canEdit.interpret(context)); // true
```

---

## Industry Usage

**Creational patterns** appear in:
- `pg.Pool()`, `mongoose.createConnection()` — Factory
- Express `app.use()` — Chain of Responsibility
- Builder in every query builder (Knex, TypeORM)
- Singleton: database pools, logger instances, config objects

**Structural patterns** appear in:
- Express/NestJS middleware — Decorator and Chain of Responsibility
- API adapters for third-party services
- Facade: AWS SDK (complex APIs behind simple interfaces)
- Proxy: ORM lazy loading, security gateways

**Behavioral patterns** appear in:
- Redux: Command (actions), Observer (subscriptions)
- React: Observer (state changes), Strategy (different rendering paths)
- NestJS: Chain of Responsibility (middleware), Decorator (metadata decorators)
- Bull (job queue): Command pattern for jobs

---

## Security

- **Proxy for authorization**: Intercept all property access to check permissions
- **Decorator for input sanitization**: Wrap service methods to sanitize inputs before processing
- **Chain of Responsibility for security checks**: Authentication → Rate limiting → CSRF → Authorization → Handler

---

## Performance

- **Flyweight pattern**: Share common data between many small objects (font glyphs in a text editor, bullets in a game)
- **Prototype**: Cloning is faster than constructing from scratch for complex objects
- **Lazy initialization (Proxy)**: Don't create expensive objects until needed
- **Object pool**: Pre-create objects and reuse them instead of creating/destroying repeatedly

---

## Interview Preparation

**Q1: What is the Factory Pattern? When would you use it?**
A: The Factory Pattern creates objects without specifying the exact class. Use it when: the exact type is determined at runtime, when you want to encapsulate object creation logic in one place, when creating objects is complex enough to warrant a dedicated creator.

**Q2: What is the difference between the Decorator and the Proxy patterns?**
A: Both wrap an object. The **Proxy** controls access to the object (adds gatekeeping, lazy init, caching). The **Decorator** adds new behavior/functionality to the object without changing its interface. Proxies maintain the same interface; Decorators may add new methods.

**Q3: Explain the Strategy Pattern and give a real-world example.**
A: Strategy defines a family of algorithms, encapsulates each one, and makes them interchangeable. The calling code works with any strategy through a common interface. Real world: payment processing (credit card, PayPal, crypto), sorting algorithms, compression algorithms, authentication strategies (JWT, session, API key).

**Q4: What is the Observer Pattern? How does it differ from the Pub/Sub pattern?**
A: Observer: subjects and observers are tightly coupled — the subject knows about its observers. Pub/Sub: uses a message broker/event bus — publisher and subscriber are completely decoupled. Observer is synchronous; Pub/Sub can be asynchronous and distributed.

**Q5: What is the Command Pattern? When is it most useful?**
A: Command encapsulates a request as an object, allowing queuing, logging, and undoing of operations. Most useful when you need: undo/redo (text editors), operation queuing (job queues), transaction logging (audit trail), macro recording.

---

## Practical Tasks

### Beginner (10 Tasks)
1. Implement a simple Factory that creates different types of users (admin, editor, viewer).
2. Implement the Observer pattern from scratch.
3. Build a Strategy pattern for calculating shipping costs.
4. Implement a Builder for constructing HTTP request objects.
5. Create a Decorator that adds logging to any function.
6. Implement a simple Chain of Responsibility for request validation.
7. Build a Singleton logger that maintains a session log.
8. Implement a Facade for sending notifications (email, SMS, push — one method).
9. Create a Command pattern with undo for a simple drawing application.
10. Implement the Template Method for different report formats (CSV, JSON, PDF).

### Intermediate (10 Tasks)
1. Build a plugin system using the Factory and Observer patterns.
2. Implement an express-like middleware chain (Chain of Responsibility).
3. Create a rate limiter using the Proxy pattern.
4. Build a cache system using the Decorator pattern (add caching to any async function).
5. Implement a state machine using the State pattern.
6. Create a generic event bus (Pub/Sub) with namespace support.
7. Implement the Composite pattern for a file system tree.
8. Build a DSL (Domain-Specific Language) using the Interpreter pattern.
9. Implement the Flyweight pattern for a text rendering engine.
10. Create a Builder for SQL queries with validation.

### Advanced (10 Tasks)
1. Build a full CQRS system with separate read/write models.
2. Implement Event Sourcing using the Command and Observer patterns.
3. Create a micro-ORM using the Proxy pattern for lazy loading.
4. Build a dependency injection container using Factory and Prototype.
5. Implement a workflow engine using the Chain of Responsibility and State patterns.
6. Create a React-like UI library using the Composite and Observer patterns.
7. Build a plugin-based data transformation pipeline using Strategy.
8. Implement a distributed transaction using the Saga pattern.
9. Create a rule engine using the Interpreter and Strategy patterns.
10. Build a real-time collaborative editor using the Command pattern (OT algorithm).

---

## Mini Project

**Text Adventure Game Engine**: Build a text adventure game using design patterns:
- **State Pattern**: Current room/area
- **Command Pattern**: Player actions (go north, pick up, use item)
- **Observer Pattern**: Events (item picked up, door opened)
- **Factory Pattern**: Creating different types of rooms, items, enemies
- **Strategy Pattern**: Different combat behaviors for enemies

---

## Production Project

**API Gateway**: Build an API gateway using design patterns:
- **Chain of Responsibility**: Request pipeline (auth → rate limit → route → respond)
- **Proxy**: Per-service circuit breakers
- **Decorator**: Request/response transformation
- **Strategy**: Different load-balancing algorithms (round-robin, least-connections, random)
- **Observer**: Real-time metrics and alerting

---

## Capstone Project

**Workflow Engine**: Build a visual workflow engine (like Zapier/n8n):
- **Composite**: Workflow nodes (steps, branches, loops)
- **Command**: Each step is a command (triggerable, undoable in testing)
- **Strategy**: Different trigger types (webhook, schedule, event)
- **Observer**: Real-time execution log
- **Factory**: Create different action nodes (HTTP request, database query, email, transform)
- **Template Method**: Execution lifecycle (validate → execute → retry → log → notify)

---

## Self Assessment
1. What are the three categories of design patterns? Name two from each category.
2. What problem does the Factory Pattern solve? When is it appropriate?
3. Explain the Builder pattern. What makes it different from a regular constructor?
4. What is the Observer pattern? What are "subjects" and "observers"?
5. Explain the Strategy pattern. Give a real-world example.
6. What is the Decorator pattern? How does it differ from inheritance?
7. What is the Command pattern? What problem does undo/redo illustrate?
8. What is the Proxy pattern? Name three things a proxy can do.
9. What is the Facade pattern? Give an example from a real framework you've used.
10. What is the Chain of Responsibility pattern? How does Express middleware relate to it?
11. What is the Template Method pattern?
12. What is the Adapter pattern? When would you use it?
13. When is the Singleton pattern considered an anti-pattern?
14. What is the difference between the Observer pattern and Pub/Sub?
15. What is the CQRS pattern?

---

## Cheat Sheet

### Pattern Quick Reference
```
Factory:     createX(type) — create objects without knowing exact class
Builder:     builder.setA().setB().build() — construct complex object step by step
Singleton:   static getInstance() — one instance only
Prototype:   clone() — copy existing object

Adapter:     wrap old interface to match new one
Decorator:   wrap object to add behavior, same interface
Facade:      simple API over complex subsystem
Proxy:       same interface, control access (auth, cache, lazy)

Observer:    subject.subscribe(fn); subject.notify() — publish state changes
Strategy:    inject algorithm; switch without changing code
Command:     {execute(), undo()} — encapsulate requests as objects
Template:    abstract template(); concrete subclasses fill in steps
Chain:       request flows through handlers until handled
State:       behavior changes based on internal state
```

### When to Use Which
```
Object creation varies by type       → Factory
Object needs many optional params    → Builder  
Need exactly one instance            → Singleton (careful!)
Incompatible interfaces              → Adapter
Add behavior without changing class  → Decorator
Complex system, simple API needed    → Facade
Control access / add transparency    → Proxy
Notify multiple objects of changes   → Observer
Swap algorithms at runtime           → Strategy
Queue, log, undo operations          → Command
Same algorithm, different steps      → Template Method
Chain of handlers, stop or pass      → Chain of Responsibility
```
