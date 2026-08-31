# Phase 1 — Chapter 5: Object-Oriented Programming

> *"Object-oriented programming is an exceptionally bad idea which could only have originated in California."* — Edsger Dijkstra (provocatively). Yet OOP is how the industry organizes most large codebases.

---

## Chapter Overview

### Why OOP Exists

As programs grew beyond a few hundred lines in the 1960s–70s, procedural code became impossible to manage. Global variables were modified by any function, making behavior unpredictable. Adding features broke unrelated parts of the system. Debugging became forensic work.

Object-oriented programming emerged as a solution to the "software crisis": organize code around **objects** — self-contained units that bundle **data** (state) and **behavior** (methods) together. Objects interact via well-defined interfaces; internal details are hidden.

**The core insight**: Model your software the way the real world works. A `BankAccount` object knows its balance and exposes `deposit()` and `withdraw()` methods. Other objects can't directly manipulate the balance — they must go through the account's interface.

### Problems It Solves

1. **Encapsulation**: Hide implementation details; reduce coupling between parts
2. **Reusability**: Inheritance and composition let you build on existing code
3. **Extensibility**: Add new behavior without modifying existing code (Open/Closed Principle)
4. **Modeling**: Map real-world entities to code naturally
5. **Team scalability**: Different teams work on different classes with minimal interference

### Industry Adoption

OOP is the dominant paradigm in:
- **Java** (still the most popular enterprise language): everything is a class
- **C#**: .NET ecosystem, heavily OOP
- **Python**: Classes are everywhere, though Python also supports other paradigms
- **JavaScript/TypeScript**: Prototype-based OOP + ES6 class syntax
- **C++**: Systems programming with OOP
- **Swift/Kotlin**: Mobile development (iOS/Android)

Every major framework is built around OOP: Spring (Java), Django (Python), Laravel (PHP), Angular (TypeScript), NestJS (TypeScript), Rails (Ruby).

### When NOT to Use OOP

- **Data pipelines**: Functional/procedural is cleaner for `transform → filter → aggregate`
- **Mathematical computations**: Pure functions with no state are simpler and more testable
- **Simple scripts**: Classes are overkill for a 50-line automation script
- **Very performance-critical hot paths**: Object allocation triggers garbage collection; typed arrays or procedural code may be faster

---

## Beginner Theory

### The Four Pillars of OOP

**1. Encapsulation** — bundling data and methods, controlling access

```
┌──────────────────────────────────┐
│         BankAccount              │
│  ────────────────────────────    │
│  - balance: number  (private)    │
│  - owner: string    (private)    │
│  ────────────────────────────    │
│  + deposit(amount)               │
│  + withdraw(amount)              │
│  + getBalance()                  │
└──────────────────────────────────┘
```

**2. Inheritance** — a class derives from another, inheriting its properties and methods

```
Animal (base class)
  ├── Dog extends Animal
  │     └── Labrador extends Dog
  └── Cat extends Animal
```

**3. Polymorphism** — objects of different types respond to the same interface

```javascript
animals.forEach(animal => animal.speak());
// Dog: "Woof!", Cat: "Meow!", Bird: "Tweet!"
// Same method call, different behavior per class
```

**4. Abstraction** — expose only what's necessary; hide complexity

```javascript
// User of the class sees this:
emailService.send({ to: "alice@example.com", subject: "Hello" });

// Internal complexity (SMTP handshake, retry logic, templating) is hidden
```

### Core Terminology

| Term | Definition |
|------|-----------|
| **Class** | Blueprint for creating objects |
| **Object/Instance** | A concrete realization of a class |
| **Constructor** | Special method called when creating an instance |
| **Property/Field** | Data stored on a class instance |
| **Method** | Function defined on a class |
| **`this`** | Reference to the current object instance |
| **`super`** | Reference to the parent class |
| **Inheritance** | A class extends another, inheriting its members |
| **Override** | Redefine a parent method in a child class |
| **Abstract class** | A class that can't be instantiated directly |
| **Interface** | A contract defining required methods (TypeScript/Java) |
| **Composition** | Including one object as a property of another |
| **Encapsulation** | Making properties private; exposing only public API |
| **Polymorphism** | Same interface, different behavior per class |
| **Static member** | Belongs to the class itself, not instances |
| **Getter/Setter** | Computed properties with get/set syntax |

---

## Basic Examples

### Classes and Instances

```javascript
class Vehicle {
  // Static property — shared across all instances
  static count = 0;

  // Constructor — called when creating a new Vehicle
  constructor(make, model, year) {
    this.make  = make;
    this.model = model;
    this.year  = year;
    this.speed = 0;       // default state
    Vehicle.count++;
  }

  // Methods
  accelerate(amount) {
    this.speed += amount;
    return this; // allow chaining
  }

  brake(amount) {
    this.speed = Math.max(0, this.speed - amount);
    return this;
  }

  // Getter — accessed like a property
  get age() {
    return new Date().getFullYear() - this.year;
  }

  // toString — called when object is used as string
  toString() {
    return `${this.year} ${this.make} ${this.model} (${this.speed}km/h)`;
  }

  // Static method — called on the class, not instances
  static getCount() {
    return `${Vehicle.count} vehicles created`;
  }
}

// Create instances
const car = new Vehicle("Toyota", "Corolla", 2020);
const truck = new Vehicle("Ford", "F-150", 2019);

car.accelerate(60).accelerate(20); // method chaining
console.log(`${car}`);             // "2020 Toyota Corolla (80km/h)"
console.log(car.age);              // 4 (if current year is 2024)
console.log(Vehicle.getCount());   // "2 vehicles created"
```

### Inheritance

```javascript
// Base class (parent)
class Shape {
  constructor(color = "black") {
    this.color = color;
  }

  // Abstract-like method — subclasses SHOULD override
  area() {
    throw new Error(`${this.constructor.name} must implement area()`);
  }

  toString() {
    return `${this.color} ${this.constructor.name} with area ${this.area().toFixed(2)}`;
  }
}

// Derived class (child)
class Circle extends Shape {
  constructor(radius, color) {
    super(color);           // MUST call super() before accessing `this`
    this.radius = radius;
  }

  area() {
    return Math.PI * this.radius ** 2;
  }

  circumference() {
    return 2 * Math.PI * this.radius;
  }
}

class Rectangle extends Shape {
  constructor(width, height, color) {
    super(color);
    this.width  = width;
    this.height = height;
  }

  area()      { return this.width * this.height; }
  perimeter() { return 2 * (this.width + this.height); }
}

class Square extends Rectangle {
  constructor(side, color) {
    super(side, side, color); // reuse Rectangle's constructor
  }
}

const shapes = [
  new Circle(5, "red"),
  new Rectangle(4, 6, "blue"),
  new Square(3, "green")
];

// Polymorphism in action — same method call, different behavior
shapes.forEach(s => console.log(`${s}`));
// "red Circle with area 78.54"
// "blue Rectangle with area 24.00"
// "green Square with area 9.00"

// instanceof checks inheritance chain
const sq = new Square(3);
console.log(sq instanceof Square);    // true
console.log(sq instanceof Rectangle); // true
console.log(sq instanceof Shape);     // true
```

### Private Fields (ES2022)

```javascript
class BankAccount {
  #balance;      // private field — truly inaccessible from outside
  #owner;
  #transactions = [];

  constructor(owner, initialBalance = 0) {
    this.#owner   = owner;
    this.#balance = initialBalance;
  }

  deposit(amount) {
    if (amount <= 0) throw new Error("Deposit amount must be positive");
    this.#balance += amount;
    this.#transactions.push({ type: "deposit", amount, date: new Date() });
    return this;
  }

  withdraw(amount) {
    if (amount <= 0) throw new Error("Withdrawal amount must be positive");
    if (amount > this.#balance) throw new Error("Insufficient funds");
    this.#balance -= amount;
    this.#transactions.push({ type: "withdrawal", amount, date: new Date() });
    return this;
  }

  get balance()      { return this.#balance; }
  get owner()        { return this.#owner; }
  get transactions() { return [...this.#transactions]; } // defensive copy

  toString() {
    return `Account(${this.#owner}): $${this.#balance.toFixed(2)}`;
  }
}

const account = new BankAccount("Alice", 1000);
account.deposit(500).withdraw(200);
console.log(account.balance);   // 1300
// account.#balance = 9999;     // SyntaxError — truly private!
console.log(account.transactions.length); // 2
```

---

## Intermediate Concepts

### Composition Over Inheritance

Inheritance creates tight coupling. Composition creates flexibility. The rule: **favor composition over inheritance**.

```javascript
// Problem with deep inheritance: the "Gorilla-Banana" problem
// "You wanted a banana but what you got was a gorilla holding the banana
//  and the entire jungle." — Joe Armstrong

// BAD: Deep inheritance hierarchy
class Animal { ... }
class Mammal extends Animal { ... }
class Primate extends Mammal { ... }
class Gorilla extends Primate { ... }
// Adding a "FlyingAnimal" breaks the hierarchy

// GOOD: Compose behavior from mixins/traits
const canSwim = (superclass) => class extends superclass {
  swim() { return `${this.name} is swimming`; }
};

const canFly = (superclass) => class extends superclass {
  fly() { return `${this.name} is flying`; }
};

const canRun = (superclass) => class extends superclass {
  run() { return `${this.name} is running`; }
};

class Animal {
  constructor(name) { this.name = name; }
}

class Duck extends canSwim(canFly(canRun(Animal))) { }
class Penguin extends canSwim(canRun(Animal)) { }
class Eagle extends canFly(canRun(Animal)) { }

const duck = new Duck("Donald");
console.log(duck.swim()); // "Donald is swimming"
console.log(duck.fly());  // "Donald is flying"
console.log(duck.run());  // "Donald is running"

const penguin = new Penguin("Pingu");
// penguin.fly(); // Method doesn't exist — compile error in TypeScript!
```

**Composition with strategy objects:**
```javascript
// A class that uses pluggable strategies instead of inheriting behavior
class DataExporter {
  constructor(formatter, logger) {
    this.formatter = formatter; // injected strategy
    this.logger    = logger;
  }

  export(data) {
    const formatted = this.formatter.format(data);
    this.logger.log(`Exported ${data.length} records`);
    return formatted;
  }
}

const jsonFormatter  = { format: data => JSON.stringify(data, null, 2) };
const csvFormatter   = { format: data => data.map(r => Object.values(r).join(",")).join("\n") };
const xmlFormatter   = { format: data => `<records>${data.map(r => `<record>${r.id}</record>`).join("")}</records>` };

const exporter = new DataExporter(csvFormatter, console);
exporter.export([{ id: 1, name: "Alice" }]);
// Swap formatters without modifying DataExporter — Open/Closed Principle
```

### Abstract Classes (TypeScript)

```typescript
abstract class Repository<T> {
  protected abstract tableName: string;

  // Concrete method shared by all subclasses
  async findAll(): Promise<T[]> {
    return this.db.query(`SELECT * FROM ${this.tableName}`);
  }

  // Abstract methods — subclasses MUST implement
  abstract findById(id: string): Promise<T | null>;
  abstract create(data: Omit<T, "id">): Promise<T>;
  abstract update(id: string, data: Partial<T>): Promise<T>;
  abstract delete(id: string): Promise<void>;

  // Cannot do: new Repository() — abstract class can't be instantiated
}

class UserRepository extends Repository<User> {
  protected tableName = "users";

  async findById(id: string): Promise<User | null> {
    const row = await this.db.query("SELECT * FROM users WHERE id = $1", [id]);
    return row ? new User(row) : null;
  }

  // ... implement other abstract methods
}
```

### Mixins Pattern

```typescript
// TypeScript mixin pattern — adding behavior without inheritance
type Constructor<T = {}> = new (...args: any[]) => T;

function Serializable<TBase extends Constructor>(Base: TBase) {
  return class extends Base {
    serialize(): string {
      return JSON.stringify(this);
    }

    static deserialize<T>(this: new (...args: any[]) => T, data: string): T {
      return Object.assign(new this(), JSON.parse(data));
    }
  };
}

function Timestamped<TBase extends Constructor>(Base: TBase) {
  return class extends Base {
    createdAt: Date = new Date();
    updatedAt: Date = new Date();

    touch(): void {
      this.updatedAt = new Date();
    }
  };
}

function Validatable<TBase extends Constructor>(Base: TBase) {
  return class extends Base {
    validate(): boolean {
      // Custom validation logic
      return true;
    }
  };
}

class User {
  constructor(public name: string, public email: string) {}
}

class EnhancedUser extends Serializable(Timestamped(Validatable(User))) {}

const user = new EnhancedUser("Alice", "alice@example.com");
console.log(user.createdAt);         // Date object
console.log(user.serialize());        // JSON string
console.log(user.validate());         // true
```

---

## Advanced Concepts

### Design by Contract

```javascript
// Pre and post conditions, invariants
class BoundedStack {
  #items;
  #maxSize;

  constructor(maxSize) {
    // Precondition
    if (!Number.isInteger(maxSize) || maxSize <= 0) {
      throw new Error("maxSize must be a positive integer");
    }
    this.#items   = [];
    this.#maxSize = maxSize;
    this.#checkInvariant();
  }

  push(item) {
    // Precondition
    if (this.isFull()) throw new Error("Stack is full");

    this.#items.push(item);

    // Postcondition
    console.assert(!this.isEmpty(), "Stack should not be empty after push");
    this.#checkInvariant();
  }

  pop() {
    // Precondition
    if (this.isEmpty()) throw new Error("Stack is empty");

    const item = this.#items.pop();

    // Postcondition: size decreased by 1
    this.#checkInvariant();
    return item;
  }

  #checkInvariant() {
    // Class invariant — must always be true
    console.assert(this.#items.length >= 0, "Size cannot be negative");
    console.assert(this.#items.length <= this.#maxSize, "Size cannot exceed maxSize");
  }

  get size()   { return this.#items.length; }
  isEmpty()    { return this.#items.length === 0; }
  isFull()     { return this.#items.length === this.#maxSize; }
}
```

### Prototype-Based OOP (JavaScript Internals)

```javascript
// Understanding how class syntax maps to prototypes

// Class syntax:
class Animal {
  constructor(name) { this.name = name; }
  speak() { return `${this.name} makes a noise.`; }
}

// Is equivalent to:
function AnimalOld(name) { this.name = name; }
AnimalOld.prototype.speak = function() { return `${this.name} makes a noise.`; };

// Both produce the same prototype chain
const a1 = new Animal("Dog");
const a2 = new AnimalOld("Dog");

console.log(Object.getPrototypeOf(a1) === Animal.prototype); // true
console.log(Object.getPrototypeOf(a2) === AnimalOld.prototype); // true

// Manually setting up inheritance
function Dog(name, breed) {
  AnimalOld.call(this, name); // call parent constructor
  this.breed = breed;
}
Dog.prototype = Object.create(AnimalOld.prototype);
Dog.prototype.constructor = Dog;
Dog.prototype.bark = function() { return "Woof!"; };

// This is what ES6 `extends` does under the hood
```

---

## Industry Usage

### Enterprise Applications
OOP is the standard in enterprise Java/C# applications:
- **Domain-Driven Design (DDD)**: Entities, Value Objects, Repositories, Services — all classes
- **Spring Framework**: Dependency injection container manages class instances (beans)
- **Hibernate/JPA**: ORM maps class hierarchies to database tables
- **Banking**: Transaction, Account, Customer — all OOP entities

### Game Development
Unity (C#), Unreal (C++) are heavily OOP:
- `GameObject` base class
- `Player extends Character`
- Component pattern for composition

### UI Frameworks
React, Angular, Vue — built around component classes (or class-like functional components):
- Angular: TypeScript classes with decorators
- NestJS: Controllers, services, modules as decorated classes

---

## Alternatives

**Functional Programming**: Avoids mutable state and classes. Better for data pipelines, mathematical operations. Haskell, Elm, parts of JavaScript/TypeScript.

**Procedural**: Simple scripts and data processing. C, older Python.

**Data-oriented Design**: Used in game engines (ECS — Entity Component System). Separates data from behavior for cache efficiency. Antithesis of OOP.

---

## Security

**Object Injection** (PHP-specific but principle applies):
```javascript
// Don't use eval() or dynamic method calls with user input
const method = req.query.action; // could be "prototype.constructor"
obj[method](); // Remote Code Execution!

// Whitelist allowed methods
const ALLOWED = ["getStatus", "getInfo"];
if (!ALLOWED.includes(method)) throw new Error("Method not allowed");
```

**Encapsulation prevents unintended modification**: Private fields ensure state is only modified through validated methods, preventing invalid states.

---

## Performance

- **Object creation**: Creating objects allocates heap memory and triggers GC. In hot paths (game loops, high-frequency trading), reuse objects or use object pools.
- **Method calls**: Virtual dispatch (polymorphism) has a tiny overhead vs. direct function calls. In practice, negligible except in extremely hot loops.
- **Memory layout**: Objects with the same "shape" (same properties in same order) are stored more efficiently by V8's hidden classes.

---

## Debugging

**Common Issues:**
- `Cannot read property 'x' of undefined`: Method called on null/undefined instead of object
- Shared mutable state between instances (forgetting `this.x = []` in constructor, instead using a class-level `x = []` — all instances share the same array)
- `this` is undefined in callbacks — use arrow functions or `.bind(this)`

---

## Interview Preparation

**Q1: What are the four pillars of OOP?**
Encapsulation (bundling data + methods, controlling access), Inheritance (deriving from parent class), Polymorphism (same interface, different behavior), Abstraction (hiding implementation complexity).

**Q2: What is the difference between composition and inheritance?**
Inheritance establishes an "is-a" relationship (Dog is-a Animal). Composition establishes a "has-a" relationship (Car has-a Engine). Composition is preferred because it's more flexible (you can swap the Engine), while inheritance creates tight coupling and fragile hierarchies. Deep inheritance hierarchies are a code smell.

**Q3: What is polymorphism? Give an example.**
Polymorphism means "many forms" — the same interface produces different behavior depending on the actual object type. Example: `shapes.forEach(s => s.area())` — Circle, Rectangle, and Triangle all respond to `area()` but compute it differently.

**Q4: What is the Liskov Substitution Principle?**
A subclass must be substitutable for its parent class. If code works correctly with a `Rectangle`, it must work correctly with a `Square` (if `Square extends Rectangle`). Famous counter-example: if `setWidth` on a Square also changes height, it violates LSP.

**Q5: Explain the difference between abstract classes and interfaces (in TypeScript).**
Abstract classes can have concrete (implemented) methods and constructors; they represent a partial implementation. Interfaces are purely contracts — no implementation, only method signatures. Classes can implement multiple interfaces but can only extend one class.

---

## Practical Tasks

### Beginner (10 Tasks)
1. Model a `Library` system with `Book`, `Member`, and `Loan` classes.
2. Implement a `Vector2D` class with add, subtract, scale, and dot product methods.
3. Build a `Stack` and `Queue` using OOP with private internals.
4. Create a `Temperature` class with Celsius/Fahrenheit/Kelvin conversions.
5. Implement a simple `LinkedList` class with all CRUD operations.
6. Build an `Animal` hierarchy with `Dog`, `Cat`, `Bird` — each with a `sound()` method.
7. Create a `Calculator` with a method history and undo functionality.
8. Implement a `Timer` class with start, stop, pause, resume, and reset.
9. Build a `PaginatedList` class that wraps an array and supports page navigation.
10. Create a `Matrix` class supporting addition, subtraction, and multiplication.

### Intermediate (10 Tasks)
1. Implement a generic `EventEmitter` class.
2. Build a `FileSystem` simulator (files, directories, move, copy, delete).
3. Design a `ShoppingCart` with products, discounts, taxes, and checkout.
4. Implement a `Chess` board with pieces; validate legal moves for each piece type.
5. Create a `Pipeline` class using composition that chains transform functions.
6. Build a `Cache` class with TTL (time-to-live) and LRU eviction using OOP.
7. Implement a `State Machine` where transitions are validated against a schema.
8. Design an `IoC Container` (Inversion of Control) that manages object lifetimes.
9. Create a `Form Validator` class with composable validation rules.
10. Build a `PriorityQueue` using a heap as the internal implementation.

### Advanced (10 Tasks)
1. Implement a `React-like` component class with props, state, and lifecycle hooks.
2. Build a `Query Builder` using the Builder and Fluent Interface patterns.
3. Design a `Plugin System` where plugins extend a base class and are loaded dynamically.
4. Implement a `Persistent Object` base class that auto-saves state changes to storage.
5. Create an `Observable` class using the Observer pattern and decorators.
6. Build a `Proxy Decorator` that adds logging/caching to any object method.
7. Implement a `Dependency Injection Container` similar to NestJS or Angular.
8. Design a `Document Object Model` (simplified) with nodes, elements, and traversal.
9. Implement a `Unit of Work` pattern for batching database operations.
10. Build an `Entity Component System (ECS)` for a simple 2D game.

---

## Mini Project
**Task Manager OOP Edition**: Refactor the CLI task manager from Chapter 1 using OOP:
- `Task` class with status transitions (pending → in_progress → done)
- `TaskRepository` managing persistence
- `TaskService` handling business logic (overdue detection, statistics)
- `CLI` class orchestrating user input/output

---

## Production Project
**Order Management System**: Build an OOP-based order system:
- `Product`, `Inventory`, `Order`, `OrderLine`, `Customer`, `Payment` classes
- Strategy pattern for payment processors (CreditCard, PayPal, BankTransfer)
- Observer pattern for order events (OrderCreated → email, inventory update)
- Repository pattern for database access

---

## Capstone Project
**E-Commerce Engine**: A complete product catalog and shopping engine:
- Domain model: `Product`, `Category`, `Cart`, `Order`, `User`, `Review`
- Polymorphic discounts: `PercentageDiscount`, `FixedDiscount`, `BuyXGetY`
- Plugin-based shipping calculators
- Event-sourced order history (every state change is an event, reconstructable)
- TypeScript throughout with full type safety

---

## Self Assessment
1. What are the four pillars of OOP? Define each in one sentence.
2. What is the difference between a class and an object?
3. What does `super()` do in a constructor? Why must it be called before `this`?
4. What is the difference between `extends` (inheritance) and composition?
5. What are JavaScript private class fields (#)? How do they differ from WeakMap-based private state?
6. What is a getter/setter? When would you use one?
7. What is polymorphism? Give a code example.
8. What is an abstract class? Can you instantiate one?
9. What is the Liskov Substitution Principle?
10. What is the difference between static and instance methods?
11. What problem does the "composition over inheritance" principle solve?
12. What is a mixin? When would you use one?
13. What is method overriding? How does it differ from method overloading?
14. What does `instanceof` check?
15. How does `this` behave differently in regular methods vs arrow methods in a class?

---

## Cheat Sheet

### Class Syntax
```javascript
class MyClass extends ParentClass {
  static count = 0;    // static field
  #private = 0;        // private field (ES2022)
  public = "hello";    // public field

  constructor(arg) {
    super(arg);         // call parent constructor
    this.prop = arg;
  }

  // Instance method
  method() { return this.prop; }

  // Getter / Setter
  get value()      { return this.#private; }
  set value(v)     { this.#private = v; }

  // Static method
  static create(arg) { return new MyClass(arg); }

  // Override parent
  toString() { return `MyClass(${this.prop})`; }
}
```

### OOP Principles
```
Encapsulation:  Private data, public API
Inheritance:    extends, super(), is-a relationship
Polymorphism:   Same interface, different behavior (method override)
Abstraction:    Hide complexity, expose minimal interface
LSP:            Subtypes must be substitutable for their supertypes
Composition:    has-a relationship, prefer over inheritance
```

### Prototype Chain
```javascript
const obj = new MyClass();
// obj → MyClass.prototype → ParentClass.prototype → Object.prototype → null
Object.getPrototypeOf(obj) === MyClass.prototype; // true
obj instanceof MyClass;   // true
obj instanceof ParentClass; // true
```
