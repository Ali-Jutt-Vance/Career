# Object-Oriented Programming

> [!GOALS]
> - Explain what object-oriented programming is, what problem it was invented to solve, and why so much of the industry uses it.
> - Use **encapsulation** to protect the rules of your data, so that an object can never be put into an impossible state.
> - Use **abstraction** and **interfaces** to hide details behind a small, stable surface.
> - Use **inheritance** correctly — including `abstract` classes, `protected` members and `override` — and recognise when it hurts.
> - Use **polymorphism** to replace long `if`/`switch` chains with objects that each know their own behaviour.
> - Explain why experienced engineers "prefer composition over inheritance", using a real failure of inheritance.
> - Model a small business domain (a shop's orders) with entities, value objects and safe state changes.
> - Recognise the common ways object-oriented code goes wrong, and know when not to use classes at all.

## Why this matters

In {{ch:this-prototypes-classes}} you learned the **mechanics** of classes: `this`, prototypes, constructors, `extends`, `super` and private `#fields`. You learned how to *write* a class. This chapter is about something different: how to **design with** objects. Knowing the syntax of classes is like knowing how to hold a hammer. Object-oriented design is knowing what to build.

Here is the problem object-oriented programming (OOP) was invented to solve. Imagine a small clinic writes its appointment system as a set of functions that all share the same data:

```ts
// fragment
const appointments: { patient: string; slot: string; status: string }[] = [];

function book(patient: string, slot: string) { /* ... */ }
function cancel(patient: string) { /* ... */ }
function reschedule(patient: string, newSlot: string) { /* ... */ }
function markNoShow(patient: string) { /* ... */ }
function generateInvoice(patient: string) { /* ... */ }
```

At first, this is fine. But the `appointments` array can be changed by **any** function, anywhere in the program. Six months later there are forty functions. One of them sets `status` to `"canceled"` (American spelling), while the rest check for `"cancelled"`. Another one reschedules an appointment that was already cancelled. A third sends an invoice for a no-show. Each bug is small, but finding them is hard, because **the rules are spread everywhere**. Nobody can say, "this is the one place where an appointment's status changes".

By the late 1960s and 1970s, as programs grew to hundreds of thousands of lines, this problem became serious enough that people called it a **software crisis**. Projects ran years late, or failed completely, because nobody could change one part of a program without breaking another.

Object-oriented programming was one major answer. Its central idea is simple: **put the data and the rules that protect it in the same place, and let nothing else touch the data directly.** An `Appointment` object holds its own status, and the *only* way to change that status is to ask the appointment — `appointment.cancel()` — which checks the rules itself.

Today OOP is everywhere. Java, C#, Kotlin, Swift, Python, Ruby and PHP are all built around it. In the JavaScript and TypeScript world, you will meet it in back-end frameworks such as NestJS ({{ch:nestjs-basics}}) and in ORMs such as TypeORM ({{ch:typeorm}}), which describe database tables as classes. Even when you write mostly functions — as much modern JavaScript does — you will read object-oriented code every week. And interviewers ask about it constantly.

## The simple idea

Think about how a bank works. You do not walk into the vault and take money out of a drawer. You go to a **teller**. You say, "I want to withdraw 5,000 rupees." The teller checks your identity, checks your balance, records the transaction, and gives you the money — or refuses. The vault (the data) is hidden. The teller (the object's methods) is the only way in, and the teller enforces the rules.

That is the heart of OOP:

- An **object** bundles some **data** (the vault contents) with the **behaviour** that is allowed to touch it (the teller's services).
- Other parts of the program **ask** the object to do things. They do not reach inside.
- Because every change goes through the object, the object can **guarantee its own rules**: a balance never goes negative, a cancelled appointment is never rescheduled.

> [!ANALOGY]
> An object is like a bank branch with a teller window. Customers see a small, well-defined set of services; everything behind the window is private, and the rules are enforced in one place.
>
> **Where the analogy breaks:** a real teller can use judgement and bend a rule for a good reason. An object only does exactly what its code says. And unlike a bank, in JavaScript the "vault" is only truly locked if you use real private fields (`#balance`); with ordinary properties, anyone can still reach in. The protection is something you must build deliberately.

## The proper definition and key words

**Object-oriented programming** is a way of organising programs (a **programming paradigm**) around **objects**: units that combine **state** (data) and **behaviour** (functions that operate on that data), and that interact with each other by calling each other's **methods**.

The important words:

- **Paradigm** — a general style or approach to writing programs. OOP is one paradigm; **procedural** programming (a sequence of steps with shared data) and **functional** programming ({{ch:functional-programming}}) are others. Most real codebases mix them.
- **State** — the data an object holds at a given moment. An account's state might be its owner and balance.
- **Behaviour** — what an object can do, expressed as **methods**.
- **Identity** — two objects can hold identical data and still be two different objects. Two accounts that both hold Rs 0 are not the same account.
- **Class** — a template describing the state and behaviour of a kind of object (you met this in {{ch:this-prototypes-classes}}).
- **Instance** — one particular object created from a class.
- **Interface** — the set of things other code is allowed to do with an object; in TypeScript, also a language feature that describes this shape (you met it in {{ch:typescript-basics}}).
- **Invariant** — a rule about an object's state that must *always* be true, such as "the balance is never negative".

OOP is traditionally described through **four pillars**: **encapsulation**, **abstraction**, **inheritance** and **polymorphism**. They are the main sections of this chapter. After them comes the most important lesson that experience adds: **composition**.

## How it works inside

> [!RECAP]
> In {{ch:this-prototypes-classes}} you learned that a class in JavaScript is built on **prototypes**. Each instance holds its own data. Its methods live once, on a shared prototype object. When you call `account.deposit(100)`, the engine looks for `deposit` on `account` itself, does not find it, follows the hidden link to `Account.prototype`, finds it there, and calls it with `this` set to `account`.

That lookup is what makes OOP's most powerful feature — polymorphism — possible. Look at this diagram:

```text
  circle ───────┐                    square ───────┐
  { radius: 2 } │                    { side: 3 }   │
                ▼                                  ▼
       Circle.prototype                  Square.prototype
       { area() {π·r²} }                 { area() {side²} }
                │                                  │
                └──────────────┬───────────────────┘
                               ▼
                        Shape.prototype
                        { describe() {...this.area()...} }
```

When code calls `shape.area()`, it does **not** decide in advance which `area` to run. The engine decides **at the moment of the call**, by starting from the actual object and walking up its prototype chain. A circle finds `Circle.prototype.area`; a square finds `Square.prototype.area`. The calling code is identical for both.

This is called **dynamic dispatch** (also "late binding"): the method that runs is chosen at runtime, based on the real object, not on what the calling code expected. Every object-oriented language has some version of it. In Java and C# it is done with a "virtual method table"; in JavaScript it is done with the prototype chain. The effect is the same: **the object decides how to respond to a message.**

Keep this picture in mind. Every pillar below is a way of using it well.

## Pillar 1 — Encapsulation: protecting the rules

### Level 1 — The idea

**Encapsulation** means two things that go together:

1. **Bundling**: keeping data and the code that changes it in the same unit.
2. **Information hiding**: preventing other code from changing the data directly, so it must go through the unit's methods.

The goal is not secrecy for its own sake. The goal is that **every rule about the data is enforced in exactly one place.**

### Level 2 — What goes wrong without it

Here is a wallet modelled as a plain object, with a helper function that applies the rules:

```ts
type Wallet = { owner: string; balancePaisa: number };

function withdraw(wallet: Wallet, amountPaisa: number): void {
  if (amountPaisa <= 0) throw new Error("Amount must be positive");
  if (amountPaisa > wallet.balancePaisa) throw new Error("Insufficient funds");
  wallet.balancePaisa -= amountPaisa;
}

const wallet: Wallet = { owner: "Ayesha", balancePaisa: 50000 };
withdraw(wallet, 20000);
console.log(wallet.balancePaisa);

// Somewhere else, months later, in a "quick fix":
wallet.balancePaisa -= 90000;
console.log(wallet.balancePaisa);
```

**Output:**

```text
30000
-60000
```

> [!RECAP]
> Money is stored in **paisa** (1 rupee = 100 paisa) as a whole number, because, as you saw in {{ch:types-of-data}}, decimal fractions such as 0.1 cannot be stored exactly in floating-point numbers.

Walk through it:

- `type Wallet = {...}` describes the shape of the data. It says nothing about rules.
- `withdraw` checks two rules — the amount is positive, and there is enough money — and only then subtracts. Called properly, it works: the balance goes from 50,000 to 30,000 paisa.
- The last lines skip `withdraw` and change `balancePaisa` directly. Nothing stops them. The balance becomes −60,000 paisa: an **impossible state** for a wallet that does not allow overdrafts.

The rule existed. It just was not **enforced**, because the data was open to everyone. In a codebase of 200,000 lines, "everyone" is hundreds of places.

### Level 3 — Building it with a class

Now the same wallet as a class, with a real private field:

```ts
class Wallet {
  readonly owner: string;
  #balancePaisa: number;

  constructor(owner: string, openingPaisa: number) {
    if (!Number.isInteger(openingPaisa) || openingPaisa < 0) {
      throw new Error("Opening balance must be a non-negative whole number of paisa");
    }
    this.owner = owner;
    this.#balancePaisa = openingPaisa;
  }

  get balancePaisa(): number {
    return this.#balancePaisa;
  }

  deposit(amountPaisa: number): void {
    this.#requirePositive(amountPaisa);
    this.#balancePaisa += amountPaisa;
  }

  withdraw(amountPaisa: number): void {
    this.#requirePositive(amountPaisa);
    if (amountPaisa > this.#balancePaisa) throw new Error("Insufficient funds");
    this.#balancePaisa -= amountPaisa;
  }

  #requirePositive(amountPaisa: number): void {
    if (!Number.isInteger(amountPaisa) || amountPaisa <= 0) {
      throw new Error("Amount must be a positive whole number of paisa");
    }
  }
}

const wallet = new Wallet("Ayesha", 50000);
wallet.withdraw(20000);
console.log(wallet.balancePaisa);

try {
  wallet.withdraw(90000);
} catch (error) {
  console.log((error as Error).message);
}
console.log(wallet.balancePaisa);
```

**Output:**

```text
30000
Insufficient funds
30000
```

Line by line:

- `readonly owner: string;` declares a public field that TypeScript will not let anyone reassign after the constructor. The owner of a wallet does not change. (`readonly` is checked only by the TypeScript compiler; it disappears from the JavaScript that actually runs.)
- `#balancePaisa: number;` declares a **truly private** field. The `#` is part of the name. Code outside the class body cannot read or write it — not by accident, not on purpose. Trying `wallet.#balancePaisa` from outside is a **syntax error** before the program even runs.
- The **constructor** checks the opening balance. This is important and often forgotten: an object must be valid **from the moment it exists**. If the constructor allowed −5, the class could never promise a non-negative balance.
- `get balancePaisa()` is a **getter** ({{ch:this-prototypes-classes}}). Outside code reads `wallet.balancePaisa` like a property, but there is no setter, so it cannot assign to it. The data is **readable but not writable** from outside.
- `deposit` and `withdraw` are the **only** ways to change the balance. Both call `#requirePositive` first.
- `#requirePositive` is a **private method**. It is a helper for the class's own use; it is not part of what the wallet offers to the world.
- In the test, the failed withdrawal throws, and the balance stays at 30,000. The impossible state can no longer happen.

The rule "the balance is never negative" is an **invariant**. Encapsulation is how you make invariants actually hold: check them in the constructor, check them in every method that changes state, and make it impossible to change state any other way.

### TypeScript's `private` versus JavaScript's `#`

TypeScript also has a `private` keyword:

```ts
class Counter {
  private count = 0;
  increment(): number {
    return ++this.count;
  }
}

const counter = new Counter();
counter.increment();
// counter.count = 99;            // compile error: 'count' is private
(counter as any).count = 99;      // allowed: the type check is switched off
console.log(counter.increment());
```

**Output:**

```text
100
```

- `private count = 0;` tells the **compiler** to reject `counter.count` outside the class.
- But `private` exists only during type-checking. In the JavaScript that runs, `count` is an ordinary property. `(counter as any)` turns off type-checking for that expression, and the "private" field is changed to 99. The next `increment` returns 100.

So:

| | `private` (TypeScript) | `#field` (JavaScript) |
|---|---|---|
| Checked when | Compile time only | Compile time **and** runtime |
| Can be bypassed? | Yes (`as any`, plain JS callers) | No |
| Visible in `console.log` / `JSON.stringify` | Yes | No |
| Common in | Older TypeScript code, NestJS and Angular code | Modern code that needs real protection |

Both are fine in practice when your whole team writes TypeScript and respects the compiler. Prefer `#` when the protection really matters — for example, in a library that plain JavaScript code will use.

### Level 4 — Leaking state by accident

Private fields protect the **reference** to your data, not the data inside a returned object. This is a classic leak:

```ts
class ShoppingCart {
  #items: string[] = [];

  add(item: string): void {
    if (this.#items.length >= 3) throw new Error("Cart limit is 3 items");
    this.#items.push(item);
  }

  get items(): string[] {
    return this.#items; // leaks the real array
  }
}

const cart = new ShoppingCart();
cart.add("shirt");
cart.items.push("shoes", "cap", "watch", "belt"); // bypasses the limit
console.log(cart.items.length);
```

**Output:**

```text
5
```

The getter returns the **same array** the class uses internally. As you learned in {{ch:objects}}, objects and arrays are passed by reference: whoever holds the reference can change the contents. The caller pushed four items directly, and the cart's limit was never checked.

Two fixes, depending on what you need:

```ts
class ShoppingCart {
  #items: string[] = [];

  add(item: string): void {
    if (this.#items.length >= 3) throw new Error("Cart limit is 3 items");
    this.#items.push(item);
  }

  get items(): readonly string[] {
    return [...this.#items]; // a copy; changing it cannot affect the cart
  }
}

const cart = new ShoppingCart();
cart.add("shirt");
const copy = cart.items as string[];
copy.push("shoes", "cap", "watch");
console.log(cart.items.length, copy.length);
```

**Output:**

```text
1 4
```

- `[...this.#items]` creates a **new array** with the same elements — a **defensive copy**. Callers can do what they like with it; the cart's real array is untouched.
- The return type `readonly string[]` also tells TypeScript callers that they should not modify the result: `cart.items.push(...)` would be a compile error. (The test casts it to `string[]` only to prove the copy is separate.)

Copying costs a little time and memory for every call. For small collections, that cost does not matter. For large ones, return `readonly` types without copying, or provide methods like `count` and `has(item)` instead of exposing the collection at all.

### Level 5 — Tell, don't ask

A good test of encapsulation is how calling code looks. Compare:

```ts
// fragment
// Asking: the caller pulls data out and makes the decision
if (order.status === "paid" && order.items.length > 0 && !order.shippedAt) {
  order.status = "shipped";
  order.shippedAt = new Date();
}

// Telling: the caller states what it wants; the object decides
order.ship();
```

The first version spreads the **rules for shipping** into the caller. If ten places ship orders, the rule is copied ten times, and one day they disagree. The second version keeps the rule inside `Order`. This guideline is called **"Tell, don't ask"**: tell objects what to do, rather than asking for their data and doing the work yourself.

A related guideline is the **Law of Demeter** (also called the "principle of least knowledge"): a method should talk to its direct collaborators, not reach through them. Code like `order.customer.address.city.toUpperCase()` depends on the internal structure of three different objects. If any of them changes, this line breaks. Each dot that reaches *through* an object is a small piece of coupling. It is a guideline, not a law: chains on simple data objects or fluent builders are fine.

> [!SENIOR]
> Encapsulation is not about adding a getter and a setter for every field. A class with a private field plus `getBalance()` and `setBalance()` has exactly as little protection as a public field — it just has more code. Ask instead: **what operations make sense for this thing in the real world?** A wallet supports deposit and withdraw, not "set balance". Design the methods around those operations, and the rules will have a natural home.

## Pillar 2 — Abstraction: hiding the how

### Level 1 — The idea

**Abstraction** means showing only what matters for a purpose and hiding the rest. When you drive a car, you use a steering wheel, pedals and a gear lever. You do not control fuel injection timing. The car offers an **abstraction**: a small set of controls that hides a huge amount of mechanism.

Encapsulation and abstraction are closely related, and people often confuse them. A useful way to separate them:

- **Encapsulation** is about **protection**: keeping the data and its rules together, and stopping others from breaking them.
- **Abstraction** is about **simplification**: choosing what the outside world needs to know, so it can think at a higher level.

### Level 2 — Interfaces as contracts

In TypeScript, the clearest tool for abstraction is the **interface**: a description of what something can do, with no code inside.

```ts
interface Notifier {
  send(to: string, message: string): Promise<void>;
}
```

`Notifier` is a **contract**. Anything that has a `send` method with this exact shape is a `Notifier`. Code that sends notifications can depend only on this contract, and not care whether the message goes by SMS, email or WhatsApp.

> [!RECAP]
> TypeScript uses **structural typing** ({{ch:typescript-basics}}): a value fits a type if it has the right shape, whatever it is called. A class does not have to say `implements Notifier` to be usable as one. Writing `implements` is still good practice, because the compiler then checks the class against the contract at the place where you wrote it.

### Level 3 — Programming to an interface

```ts
interface Notifier {
  send(to: string, message: string): Promise<void>;
}

class SmsNotifier implements Notifier {
  async send(to: string, message: string): Promise<void> {
    // A real version would call an SMS provider's API here.
    console.log(`[SMS to ${to}] ${message}`);
  }
}

class EmailNotifier implements Notifier {
  async send(to: string, message: string): Promise<void> {
    console.log(`[Email to ${to}] ${message}`);
  }
}

class AppointmentReminder {
  constructor(private readonly notifier: Notifier) {}

  async remind(patientContact: string, time: string): Promise<void> {
    await this.notifier.send(patientContact, `Reminder: your appointment is at ${time}.`);
  }
}

const bySms = new AppointmentReminder(new SmsNotifier());
const byEmail = new AppointmentReminder(new EmailNotifier());

await bySms.remind("+92-300-1234567", "10:30");
await byEmail.remind("sana@example.com", "14:00");
```

**Output:**

```text
[SMS to +92-300-1234567] Reminder: your appointment is at 10:30.
[Email to sana@example.com] Reminder: your appointment is at 14:00.
```

Walk through it:

- `interface Notifier` defines the contract: one method, `send`, which returns a promise (sending a message takes time, so it is asynchronous, as you learned in {{ch:asynchronous-javascript}}).
- `class SmsNotifier implements Notifier` promises to fulfil the contract. If its `send` had the wrong parameters, the compiler would complain right here.
- `constructor(private readonly notifier: Notifier) {}` uses a TypeScript shortcut called a **parameter property**. Writing `private readonly` before a constructor parameter does three things at once: it declares a field called `notifier`, makes it private and read-only, and assigns the argument to it. It is the same as declaring the field and writing `this.notifier = notifier;` in the body.
- `AppointmentReminder` knows only the `Notifier` interface. It has no idea SMS exists. This is called **programming to an interface, not an implementation**.
- At the bottom, the same `AppointmentReminder` class works with two different notifiers. We passed the notifier **in** from outside rather than creating it inside. This technique is called **dependency injection**, and it is the foundation of frameworks like NestJS ({{ch:nestjs-basics}}).
- `await` at the top level works here because this file is an ES module (the verification setup compiles every example as a module; {{ch:modules-and-npm}} explained modules).

Why does this matter so much? Three reasons:

1. **Changing providers is cheap.** If the clinic moves from one SMS provider to another, you write a new class that implements `Notifier`. `AppointmentReminder` does not change.
2. **Testing is easy.** In a test, you pass a fake notifier that records messages in an array instead of sending real SMS messages and costing money. You will do this in {{ch:testing}}.
3. **Thinking is easier.** Someone reading `AppointmentReminder` sees one clear idea: "send a reminder". The details of HTTP requests, API keys and retry logic live elsewhere.

### Level 5 — Leaky abstractions

No abstraction is perfect. A `Notifier` interface hides *how* a message is sent, but it cannot hide that SMS messages are limited in length, that email can take minutes to arrive, or that a provider can be down. When details of the hidden mechanism force their way into the code that uses the abstraction, it is called a **leaky abstraction** — a term made famous by the software writer Joel Spolsky, who argued that all non-trivial abstractions leak to some degree.

The practical lesson: design interfaces around what the callers **actually need**, include the failure modes they must handle (for example, `send` can reject its promise), and do not pretend that very different things are identical. If SMS and email need different handling, a single `send(to, message)` may be the wrong abstraction.

## Pillar 3 — Inheritance: building on an existing class

### Level 1 — The idea

**Inheritance** lets one class (the **subclass**, child or derived class) take on the state and behaviour of another (the **superclass**, parent or base class), and then add or change things. It expresses an **"is-a"** relationship: a savings account *is an* account; a delivery driver *is an* employee.

You met the syntax in {{ch:this-prototypes-classes}}: `class Child extends Parent`, with `super(...)` to call the parent's constructor. This section adds the TypeScript features that make inheritance safer, then shows honestly where it goes wrong.

### Level 3 — `abstract`, `protected` and `override`

Consider a payroll system. Every employee has a name and is paid monthly, but the pay is calculated differently for different kinds of employees.

```ts
abstract class Employee {
  constructor(readonly name: string) {}

  abstract monthlyPayPaisa(): number;

  protected formatRupees(paisa: number): string {
    return `Rs ${(paisa / 100).toLocaleString("en-US")}`;
  }

  payslip(): string {
    return `${this.name}: ${this.formatRupees(this.monthlyPayPaisa())}`;
  }
}

class SalariedEmployee extends Employee {
  constructor(name: string, private readonly annualSalaryPaisa: number) {
    super(name);
  }

  override monthlyPayPaisa(): number {
    return Math.round(this.annualSalaryPaisa / 12);
  }
}

class HourlyEmployee extends Employee {
  constructor(
    name: string,
    private readonly hourlyRatePaisa: number,
    private readonly hoursWorked: number,
  ) {
    super(name);
  }

  override monthlyPayPaisa(): number {
    const regular = Math.min(this.hoursWorked, 160);
    const overtime = Math.max(this.hoursWorked - 160, 0);
    return regular * this.hourlyRatePaisa + Math.round(overtime * this.hourlyRatePaisa * 1.5);
  }
}

const staff: Employee[] = [
  new SalariedEmployee("Hina", 240000000),
  new HourlyEmployee("Usman", 150000, 170),
];

for (const person of staff) {
  console.log(person.payslip());
}
```

**Output:**

```text
Hina: Rs 200,000
Usman: Rs 262,500
```

Line by line:

- `abstract class Employee` declares a class that **cannot be instantiated** on its own. `new Employee("x")` is a compile error. It exists only to be extended. This makes sense: there is no such thing as an employee who is "just an employee" with no pay rule.
- `constructor(readonly name: string) {}` is a parameter property again: a public, read-only `name` field.
- `abstract monthlyPayPaisa(): number;` declares a method with **no body**. Every concrete (non-abstract) subclass **must** provide it, or the compiler refuses to compile. This turns a forgotten method — which in plain JavaScript you would discover only when the program crashes — into an error you see immediately.
- `protected formatRupees(...)` is visible inside `Employee` **and its subclasses**, but not to outside code. `protected` sits between `public` (anyone) and `private` (this class only). Like `private`, it is checked only by the compiler.
- `payslip()` is a **concrete method** in the abstract class: shared behaviour, written once. Notice that it calls `this.monthlyPayPaisa()`, which the base class does not even implement. Dynamic dispatch finds the right version at runtime. This shape — a base class that defines the steps of an algorithm and lets subclasses fill in some of them — is a design pattern called the **Template Method** ({{ch:design-patterns}}).
- `super(name)` in each subclass constructor calls the parent constructor so the `name` field gets set. A subclass constructor must call `super` before using `this`.
- `override monthlyPayPaisa()` marks the method as replacing a parent method. With the compiler option `noImplicitOverride` turned on (a good habit), TypeScript **requires** this keyword when you replace a parent method, and **rejects** it if no such parent method exists. This catches a nasty bug: if someone renames the parent's method, every child that used to override it would silently stop overriding — but with `override`, the compiler reports each one.
- The hourly calculation: Usman worked 170 hours at Rs 1,500 an hour. The first 160 are regular: 160 × 150,000 paisa = 24,000,000 paisa. The other 10 are overtime at 1.5×: 10 × 150,000 × 1.5 = 2,250,000 paisa. The total is 26,250,000 paisa, which is Rs 262,500.
- `toLocaleString("en-US")` adds thousands separators: `200000` becomes `"200,000"`.

### Level 4 — When inheritance fits

Inheritance is a good choice when **all** of these are true:

- There is a genuine, stable "is-a" relationship. Every `SalariedEmployee` really is an `Employee`, in every situation, and always will be.
- The subclass can be used **anywhere** the parent is expected, without surprises. (This is the **Liskov Substitution Principle**, which you will study properly in {{ch:solid-principles}}.)
- The hierarchy is **shallow**: one or two levels.
- You control both the parent and the children, so you can change them together.

Frameworks also use inheritance in a controlled way. A typical example is custom errors: `class NotFoundError extends Error`. Error is designed to be extended, and an error that is "not found" really is an error in every respect.

### Level 5 — The fragile base class problem

Inheritance creates the **tightest** kind of coupling there is: the child depends not only on what the parent *does*, but often on *how* it does it. Here is a real-world shaped example.

A team has a class that stores tags. Another team extends it to count how many tags were ever added:

```ts
class TagSet {
  protected tags = new Set<string>();

  add(tag: string): void {
    this.tags.add(tag);
  }

  addAll(tags: string[]): void {
    for (const tag of tags) this.add(tag);
  }
}

class CountingTagSet extends TagSet {
  addedCount = 0;

  override add(tag: string): void {
    this.addedCount++;
    super.add(tag);
  }

  override addAll(tags: string[]): void {
    this.addedCount += tags.length;
    super.addAll(tags);
  }
}

const set = new CountingTagSet();
set.addAll(["urgent", "billing", "vip"]);
console.log(set.addedCount);
```

**Output:**

```text
6
```

Three tags were added, but the count says six. Why?

- `CountingTagSet.addAll` adds 3 to the counter, then calls `super.addAll`.
- The parent's `addAll` calls `this.add(tag)` for each tag. Because of dynamic dispatch, `this.add` is the **child's** overridden `add` — which adds 1 more to the counter each time.
- Result: every tag is counted twice.

The child's author could not see this by reading the parent's **public** interface. They needed to know a private **implementation detail**: that `addAll` happens to call `add`. And it gets worse. Suppose the parent team later "optimises" `addAll` to add directly to `this.tags` without calling `add`. Now the child counts correctly — by accident. Change it back, and the bug returns. **The child breaks when the parent changes in ways that should have been invisible.** This is called the **fragile base class problem**. (This exact example is adapted from Joshua Bloch's well-known book *Effective Java*, where it is used to explain the same lesson.)

### The fix: composition

Instead of *being* a `TagSet`, the counter can *have* one:

```ts
class TagSet {
  #tags = new Set<string>();

  add(tag: string): void {
    this.#tags.add(tag);
  }

  addAll(tags: string[]): void {
    for (const tag of tags) this.add(tag);
  }

  get size(): number {
    return this.#tags.size;
  }
}

class CountingTagSet {
  #inner = new TagSet();
  addedCount = 0;

  add(tag: string): void {
    this.addedCount++;
    this.#inner.add(tag);
  }

  addAll(tags: string[]): void {
    this.addedCount += tags.length;
    this.#inner.addAll(tags);
  }

  get size(): number {
    return this.#inner.size;
  }
}

const set = new CountingTagSet();
set.addAll(["urgent", "billing", "vip"]);
console.log(set.addedCount, set.size);
```

**Output:**

```text
3 3
```

Now `CountingTagSet` holds a `TagSet` in a private field and **forwards** calls to it. This is called **delegation**. When the inner `addAll` calls `this.add`, `this` is the inner `TagSet`, not the counter — so nothing is counted twice. However the `TagSet` team changes their internals, the counter keeps working, because it depends only on the public methods.

The cost is visible: the counting class must write a small forwarding method for each operation it supports. That is the trade. Composition costs a few lines of code; inheritance can cost days of debugging.

> [!WARNING]
> Never extend a class you do not control — especially a class from a library — just to change one behaviour. The library authors can change their internals in any minor version, and your subclass may break silently. Wrap the object instead.

## Pillar 4 — Polymorphism: one call, many behaviours

### Level 1 — The idea

**Polymorphism** comes from Greek and means "many forms". In programming it means: **the same call can produce different behaviour depending on which object receives it.** You already saw it twice: `person.payslip()` worked for salaried and hourly employees; `notifier.send()` worked for SMS and email.

Polymorphism is the reason OOP is worth the effort. It lets you **add new kinds of things without changing the code that uses them**.

### Level 2 — The problem it solves: the growing `switch`

Imagine a shop that offers different kinds of discount. Without polymorphism, the logic often looks like this:

```ts
type Discount =
  | { kind: "percentage"; percent: number }
  | { kind: "fixed"; amountPaisa: number }
  | { kind: "buyXGetY"; buy: number; free: number; unitPricePaisa: number };

function discountPaisa(discount: Discount, subtotalPaisa: number, quantity: number): number {
  switch (discount.kind) {
    case "percentage":
      return Math.round((subtotalPaisa * discount.percent) / 100);
    case "fixed":
      return Math.min(discount.amountPaisa, subtotalPaisa);
    case "buyXGetY": {
      const groups = Math.floor(quantity / (discount.buy + discount.free));
      return groups * discount.free * discount.unitPricePaisa;
    }
  }
}

console.log(discountPaisa({ kind: "percentage", percent: 10 }, 500000, 1));
console.log(discountPaisa({ kind: "fixed", amountPaisa: 30000 }, 500000, 1));
console.log(discountPaisa({ kind: "buyXGetY", buy: 2, free: 1, unitPricePaisa: 100000 }, 600000, 6));
```

**Output:**

```text
50000
30000
200000
```

This is a **discriminated union** ({{ch:typescript-advanced}}) handled by a `switch`. It is not wrong, and for three cases it is perfectly readable. The problem appears as the system grows. A discount does not only need `discountPaisa`. It also needs a description for the receipt, a validity check, a rule about combining with other discounts, a way to save it to the database... Each of those becomes another function with the same `switch`. When marketing invents a fourth discount type, a developer must find **every** `switch` and add a case. Miss one, and that function quietly does the wrong thing.

### Level 3 — The polymorphic version

```ts
interface Discount {
  amountPaisa(subtotalPaisa: number, quantity: number): number;
  describe(): string;
}

class PercentageDiscount implements Discount {
  constructor(private readonly percent: number) {}
  amountPaisa(subtotalPaisa: number): number {
    return Math.round((subtotalPaisa * this.percent) / 100);
  }
  describe(): string {
    return `${this.percent}% off`;
  }
}

class FixedDiscount implements Discount {
  constructor(private readonly offPaisa: number) {}
  amountPaisa(subtotalPaisa: number): number {
    return Math.min(this.offPaisa, subtotalPaisa);
  }
  describe(): string {
    return `Rs ${this.offPaisa / 100} off`;
  }
}

class BuyXGetYFree implements Discount {
  constructor(
    private readonly buy: number,
    private readonly free: number,
    private readonly unitPricePaisa: number,
  ) {}
  amountPaisa(_subtotalPaisa: number, quantity: number): number {
    const groups = Math.floor(quantity / (this.buy + this.free));
    return groups * this.free * this.unitPricePaisa;
  }
  describe(): string {
    return `Buy ${this.buy} get ${this.free} free`;
  }
}

function checkoutLine(discount: Discount, subtotalPaisa: number, quantity: number): string {
  const off = discount.amountPaisa(subtotalPaisa, quantity);
  return `${discount.describe()}: you save Rs ${off / 100}`;
}

const offers: Discount[] = [
  new PercentageDiscount(10),
  new FixedDiscount(30000),
  new BuyXGetYFree(2, 1, 100000),
];

console.log(checkoutLine(offers[0]!, 500000, 1));
console.log(checkoutLine(offers[1]!, 500000, 1));
console.log(checkoutLine(offers[2]!, 600000, 6));
```

**Output:**

```text
10% off: you save Rs 500
Rs 300 off: you save Rs 300
Buy 2 get 1 free: you save Rs 2000
```

Walk through it:

- `interface Discount` defines what **every** discount must be able to do: calculate its amount and describe itself.
- Each class owns all the logic for its kind. Everything about percentage discounts is in `PercentageDiscount`. Nothing about them is anywhere else.
- `PercentageDiscount.amountPaisa(subtotalPaisa)` takes only one parameter, although the interface lists two. TypeScript allows a method to ignore trailing parameters it does not need — a function that takes fewer arguments can safely stand in for one that is given more.
- In `BuyXGetYFree`, the first parameter is named `_subtotalPaisa`. The leading underscore is a common convention meaning "this parameter is deliberately unused".
- `checkoutLine` contains **no `if` and no `switch`**. It calls `discount.amountPaisa(...)` and `discount.describe()`, and dynamic dispatch runs the right code.
- `offers[0]!` uses the **non-null assertion** `!`. Because we compile with `noUncheckedIndexedAccess`, TypeScript treats `offers[0]` as possibly `undefined`; the `!` tells it, "I know this element exists". Use it only when you are certain, as here.

To add a "free delivery" discount next month, you write **one new class**. `checkoutLine`, and every other function that works with `Discount`, does not change. This idea — code that is **open for extension but closed for modification** — is the "O" in SOLID ({{ch:solid-principles}}).

### Which is better: `switch` or polymorphism?

Neither, always. They make opposite things easy:

| | Discriminated union + `switch` | Interface + classes |
|---|---|---|
| Adding a new **kind** (new discount) | Hard: edit every `switch` | Easy: add one class |
| Adding a new **operation** (new function on all discounts) | Easy: add one function | Hard: edit every class |
| Where logic for one kind lives | Spread across functions | Together in one class |
| Compiler help | Exhaustiveness checks find missed cases | `implements` finds missing methods |

Choose based on which will change more often. Discount *types* are invented by marketing every few months; discount *operations* are stable — so classes fit. A compiler's syntax tree is the opposite: the kinds of node are fixed by the language, but new operations (type-check, optimise, format) are added constantly — so unions and functions fit better. This tension is well known in computer science as the **expression problem**.

### Polymorphism without classes

Polymorphism is about **behaviour behind a shared interface**, not about the `class` keyword. In JavaScript, plain objects and functions can do it too:

```ts
type Formatter = (rows: { id: number; name: string }[]) => string;

const asCsv: Formatter = (rows) => rows.map((r) => `${r.id},${r.name}`).join("\n");
const asJson: Formatter = (rows) => JSON.stringify(rows);

const rows = [{ id: 1, name: "Ali" }, { id: 2, name: "Zara" }];
for (const format of [asCsv, asJson]) {
  console.log(format(rows));
}
```

**Output:**

```text
1,Ali
2,Zara
[{"id":1,"name":"Ali"},{"id":2,"name":"Zara"}]
```

Each formatter is a function with the same type. The loop calls them identically and gets different behaviour. When the "interface" has only **one** method, a function is usually simpler than a class. You will see much more of this in {{ch:functional-programming}}.

## Composition over inheritance

You have now seen the most quoted advice in object-oriented design: **favour composition over inheritance.** It comes from the 1994 book *Design Patterns* by Gamma, Helm, Johnson and Vlissides (often called the "Gang of Four"), and decades of experience have confirmed it.

- **Inheritance** says "A **is a** B". The relationship is fixed when you write the code, and A depends on B's internals.
- **Composition** says "A **has a** B". A holds B in a field and uses only its public methods. B can be swapped, even while the program runs.

### Where inheritance hierarchies break down

Inheritance forces you to arrange things in **one** tree. Real things vary in several independent ways at once. Suppose a delivery app models vehicles:

```text
                    Vehicle
          ┌────────────┴────────────┐
     PetrolVehicle            ElectricVehicle
      ┌────┴────┐               ┌────┴────┐
 PetrolBike PetrolVan    ElectricBike ElectricVan
```

This tree organises vehicles by **fuel**. Now the business adds refrigerated vans for groceries. Where does `RefrigeratedVan` go? Under petrol or electric? Both exist. You end up with `PetrolRefrigeratedVan` and `ElectricRefrigeratedVan`, duplicating the refrigeration logic. Add "has a GPS tracker" and the number of classes doubles again. This is called a **class explosion**, and it happens because inheritance can only express **one** dimension of variation at a time.

With composition, each dimension becomes a separate part:

```ts
interface Engine {
  costPerKmPaisa(): number;
  label: string;
}

class PetrolEngine implements Engine {
  label = "petrol";
  costPerKmPaisa(): number {
    return 1200;
  }
}

class ElectricMotor implements Engine {
  label = "electric";
  costPerKmPaisa(): number {
    return 400;
  }
}

interface CargoArea {
  canCarry(item: { needsCold: boolean }): boolean;
  label: string;
}

const openBox: CargoArea = { label: "open box", canCarry: (item) => !item.needsCold };
const fridge: CargoArea = { label: "refrigerated", canCarry: () => true };

class DeliveryVehicle {
  constructor(
    readonly name: string,
    private readonly engine: Engine,
    private readonly cargo: CargoArea,
  ) {}

  tripCostPaisa(km: number): number {
    return km * this.engine.costPerKmPaisa();
  }

  canDeliver(item: { needsCold: boolean }): boolean {
    return this.cargo.canCarry(item);
  }

  toString(): string {
    return `${this.name} (${this.engine.label}, ${this.cargo.label})`;
  }
}

const fleet = [
  new DeliveryVehicle("Bike 7", new PetrolEngine(), openBox),
  new DeliveryVehicle("Van 2", new ElectricMotor(), fridge),
];

const iceCream = { needsCold: true };
for (const vehicle of fleet) {
  console.log(`${vehicle}: 10 km costs Rs ${vehicle.tripCostPaisa(10) / 100}, ice cream: ${vehicle.canDeliver(iceCream)}`);
}
```

**Output:**

```text
Bike 7 (petrol, open box): 10 km costs Rs 120, ice cream: false
Van 2 (electric, refrigerated): 10 km costs Rs 40, ice cream: true
```

Walk through it:

- `Engine` and `CargoArea` are two **independent** interfaces, one for each dimension of variation.
- `openBox` and `fridge` are plain objects that satisfy `CargoArea`. Not everything needs to be a class: a simple object literal is enough when there is no state to protect.
- `DeliveryVehicle` **has** an engine and **has** a cargo area. It delegates fuel questions to the engine and cargo questions to the cargo area.
- Any engine can be combined with any cargo area. Two engines and two cargo areas give four kinds of vehicle with **no** extra classes. Add a third engine, and you get six combinations by writing one class.
- `${vehicle}` inside a template string calls `toString()` automatically, which is why our custom `toString` shapes the output.

### Why composition is easier to change

- **Swappable at runtime.** A vehicle's engine could be replaced (for example, after a conversion to electric) by assigning a new engine object. A class's parent can never change.
- **Smaller pieces.** Each part can be understood and tested alone.
- **Depends only on public interfaces**, so the fragile base class problem disappears.

The cost: more objects to wire together, and a little forwarding code. In large applications, this wiring is often done by a **dependency injection container** — a part of a framework that creates objects and passes their collaborators in automatically. You will meet one in NestJS ({{ch:nestjs-basics}}).

> [!SENIOR]
> "Favour composition" does not mean "never inherit". It means: start with composition, and use inheritance only when there is a true, stable "is-a" relationship, the hierarchy is shallow, and you control both sides. Extending `Error` for custom error types, or extending a framework base class that is designed to be extended, are fine. A five-level hierarchy of business objects almost never is.

## Interfaces versus abstract classes

Both describe "what something must be able to do". They differ in important ways:

| | `interface` | `abstract class` |
|---|---|---|
| Contains code? | No — only shapes | Yes — can have concrete methods and fields |
| Exists at runtime? | No — erased by the compiler | Yes — a real class |
| How many can a class use? | Can `implement` many | Can `extend` only one |
| Constructor logic | None | Can have a constructor |
| Works with `instanceof`? | No | Yes |
| Typical use | A contract between parts of a system | A partial implementation shared by close relatives |

A good default: **use interfaces for contracts between parts of your system** (like `Notifier`, `Discount`, `Engine`), and reach for an abstract class only when several subclasses genuinely share real code and state, as the employees shared `payslip` and `name`.

Because interfaces disappear at runtime, you cannot write `if (x instanceof Notifier)`. If you need to check at runtime, check for the behaviour instead (`typeof x.send === "function"`), or — better — design so the check is not needed.

## Static members and factory methods

Some behaviour belongs to the **kind** of thing, not to any one instance. You met `static` in {{ch:this-prototypes-classes}}: a static member lives on the class itself.

A common professional use is a **static factory method**: a named way to create instances, often with validation that a constructor cannot express well.

```ts
class EmailAddress {
  private constructor(readonly value: string) {}

  static parse(input: string): EmailAddress {
    const trimmed = input.trim().toLowerCase();
    const at = trimmed.indexOf("@");
    if (at < 1 || at !== trimmed.lastIndexOf("@") || !trimmed.slice(at + 1).includes(".")) {
      throw new Error(`Invalid email address: "${input}"`);
    }
    return new EmailAddress(trimmed);
  }

  equals(other: EmailAddress): boolean {
    return this.value === other.value;
  }
}

const a = EmailAddress.parse("  Sana@Example.COM ");
const b = EmailAddress.parse("sana@example.com");
console.log(a.value, a.equals(b));

try {
  EmailAddress.parse("not-an-email");
} catch (error) {
  console.log((error as Error).message);
}
```

**Output:**

```text
sana@example.com true
Invalid email address: "not-an-email"
```

- `private constructor` means **only code inside the class** can call `new EmailAddress(...)`. Outside code must use `EmailAddress.parse`. (This is a TypeScript check.)
- `static parse(input)` **normalises** the input (trims spaces, lower-cases it), checks it, and only then creates the object.
- The result: anywhere in your program that you hold an `EmailAddress`, you **know** it is valid and normalised. You never need to check again. This idea is sometimes summarised as **"parse, don't validate"**: turn unchecked input into a type that can only hold valid values, at the edge of your system.
- The check here is deliberately simple. Real email validation is famously complicated; in production you would use a well-tested validation library ({{ch:validation}}).

## Value objects and entities

Two kinds of object appear again and again in business software. Telling them apart is one of the most useful design skills you can learn.

An **entity** is defined by its **identity**. A customer is the same customer after changing their name and address. Two customers with the same name are still different people. Entities usually have an **id** and their state changes over time.

A **value object** is defined only by its **value**. Rs 500 is Rs 500; there is no such thing as "this particular Rs 500". An email address, a date range, a GPS coordinate and an amount of money are values. Value objects should be **immutable** — never changed after creation. To "change" one, you create a new one.

Here is a `Money` value object:

```ts
class Money {
  private constructor(readonly paisa: number, readonly currency: string) {}

  static of(rupees: number, currency = "PKR"): Money {
    return new Money(Math.round(rupees * 100), currency);
  }

  add(other: Money): Money {
    this.#sameCurrency(other);
    return new Money(this.paisa + other.paisa, this.currency);
  }

  multiply(factor: number): Money {
    return new Money(Math.round(this.paisa * factor), this.currency);
  }

  equals(other: Money): boolean {
    return this.paisa === other.paisa && this.currency === other.currency;
  }

  toString(): string {
    return `${this.currency} ${(this.paisa / 100).toFixed(2)}`;
  }

  #sameCurrency(other: Money): void {
    if (other.currency !== this.currency) {
      throw new Error(`Cannot combine ${this.currency} with ${other.currency}`);
    }
  }
}

const price = Money.of(1499.99);
const total = price.multiply(3).add(Money.of(250));
console.log(`${price} x 3 + delivery = ${total}`);
console.log(Money.of(10).equals(Money.of(10)));

try {
  price.add(Money.of(5, "USD"));
} catch (error) {
  console.log((error as Error).message);
}
```

**Output:**

```text
PKR 1499.99 x 3 + delivery = PKR 4749.97
true
Cannot combine PKR with USD
```

Walk through it:

- The fields are `readonly`, and no method changes them. `add` and `multiply` return **new** `Money` objects. `price` is still Rs 1,499.99 after the calculation.
- `Money.of(1499.99)` converts rupees to whole paisa once, at the edge, with `Math.round`, so all later arithmetic is on integers.
- `equals` compares **values**. `Money.of(10) === Money.of(10)` would be `false`, because `===` compares object identity ({{ch:objects}}); `equals` gives the answer that makes sense for money.
- `#sameCurrency` protects an invariant that a plain number never could: you cannot accidentally add dollars to rupees.

Why go to this trouble instead of using numbers? Because "a number" can be anything: paisa or rupees, PKR or USD, tax-inclusive or not. Real billing bugs come from exactly this confusion. A `Money` type makes the confusion impossible, and the compiler helps: a function that takes `Money` cannot be given a plain number by mistake.

> [!TIP]
> Immutable value objects are **safe to share**. If two orders hold the same `Money` object, neither can change it under the other. With mutable objects, sharing is a constant source of "who changed this?" bugs.

## Level 4 — Designing a real domain: an order

Let us put everything together in one realistic piece of an online shop: an **order**. An order is an entity. It moves through a life cycle:

```text
            pay()             ship()             deliver()
  draft ──────────▶ paid ──────────▶ shipped ──────────▶ delivered
    │                 │
    │ cancel()        │ cancel()  (refund needed)
    ▼                 ▼
 cancelled ◀──────────┘
```

The diagram shows the **only** legal moves. A delivered order cannot be cancelled. A draft cannot be shipped. Items can only be added while the order is a draft. A model like this, with a fixed set of states and allowed transitions, is called a **state machine**.

```ts
class Money {
  constructor(readonly paisa: number) {}
  add(other: Money): Money {
    return new Money(this.paisa + other.paisa);
  }
  times(n: number): Money {
    return new Money(this.paisa * n);
  }
  toString(): string {
    return `Rs ${(this.paisa / 100).toFixed(2)}`;
  }
}

type OrderStatus = "draft" | "paid" | "shipped" | "delivered" | "cancelled";

interface OrderLine {
  readonly sku: string;
  readonly unitPrice: Money;
  readonly quantity: number;
}

class Order {
  #status: OrderStatus = "draft";
  #lines: OrderLine[] = [];
  readonly #history: string[] = [];

  constructor(readonly id: string) {}

  get status(): OrderStatus {
    return this.#status;
  }

  get total(): Money {
    return this.#lines.reduce((sum, line) => sum.add(line.unitPrice.times(line.quantity)), new Money(0));
  }

  get history(): readonly string[] {
    return [...this.#history];
  }

  addItem(sku: string, unitPrice: Money, quantity: number): void {
    this.#requireStatus("draft", "add items");
    if (!Number.isInteger(quantity) || quantity <= 0) throw new Error("Quantity must be a positive whole number");
    this.#lines.push({ sku, unitPrice, quantity });
  }

  pay(): void {
    this.#requireStatus("draft", "pay");
    if (this.#lines.length === 0) throw new Error("Cannot pay for an empty order");
    this.#moveTo("paid");
  }

  ship(): void {
    this.#requireStatus("paid", "ship");
    this.#moveTo("shipped");
  }

  deliver(): void {
    this.#requireStatus("shipped", "deliver");
    this.#moveTo("delivered");
  }

  cancel(): void {
    if (this.#status !== "draft" && this.#status !== "paid") {
      throw new Error(`Cannot cancel order ${this.id}: it is ${this.#status}`);
    }
    this.#moveTo("cancelled");
  }

  #requireStatus(expected: OrderStatus, action: string): void {
    if (this.#status !== expected) {
      throw new Error(`Cannot ${action} order ${this.id}: it is ${this.#status}`);
    }
  }

  #moveTo(next: OrderStatus): void {
    this.#history.push(`${this.#status} -> ${next}`);
    this.#status = next;
  }
}

const order = new Order("ORD-1001");
order.addItem("SHIRT-M", new Money(249900), 2);
order.addItem("CAP", new Money(89900), 1);
console.log(order.total.toString());

order.pay();
order.ship();

for (const attempt of [() => order.addItem("SOCKS", new Money(49900), 1), () => order.cancel()]) {
  try {
    attempt();
  } catch (error) {
    console.log((error as Error).message);
  }
}

order.deliver();
console.log(order.status);
console.log(order.history.join(" | "));
```

**Output:**

```text
Rs 5897.00
Cannot add items order ORD-1001: it is shipped
Cannot cancel order ORD-1001: it is shipped
delivered
draft -> paid | paid -> shipped | shipped -> delivered
```

Walk through the design decisions:

- **All state is private.** `#status`, `#lines` and `#history` cannot be touched from outside. The getters expose read-only views.
- **Each business action is a method**: `addItem`, `pay`, `ship`, `deliver`, `cancel`. There is no `setStatus`. The methods are named after what happens in the real business, which makes the code readable to non-programmers too.
- **Every transition checks the current state first** with `#requireStatus`. Illegal moves throw a clear error that names the order and its state — exactly the information you need when debugging a production problem.
- **All state changes go through `#moveTo`**, which also records the history. Because there is exactly one place where status changes, adding an audit log, or sending an event ("order shipped") later, is a one-line change. Compare that with the clinic code at the start of the chapter.
- `total` is **computed** from the lines rather than stored. A stored total could drift out of sync with the items; a computed one cannot. (Two shirts at Rs 2,499 plus one cap at Rs 899 is Rs 5,897.)
- `OrderLine` is a plain interface with `readonly` fields — a small value with no behaviour. Not everything needs to be a class.
- `readonly #history` means the field itself is never reassigned, though the array it holds is still appended to.
- The `for` loop runs two attempts that we expect to fail. Each is wrapped in a function (`() => ...`) so we can call it inside `try`.
- The error message "Cannot add items order..." reads slightly awkwardly. In real code you would polish such messages; we kept the helper simple so the mechanism is clear.

This is what a **rich domain model** looks like: objects that hold both the data and the business rules. The opposite — classes that hold data with public getters and setters, and "service" functions elsewhere that contain all the rules — is called an **anemic domain model**. It looks object-oriented but has the same problems as the clinic code: the rules are scattered. (The software designer Martin Fowler described the anemic domain model as an anti-pattern on his website.)

In a real system, this `Order` would be loaded from and saved to a database ({{ch:orms}}), and `#moveTo` might also publish an event that other parts of the system react to ({{ch:event-driven-systems}}). The design of the object would stay the same.

## From beginner to enterprise

**Level 3 — a single program.** Classes like `Wallet` and `Order` protect their own rules. You test them by creating objects and calling methods.

**Level 4 — a real application.** A typical back-end has layers of objects with clear jobs:

```text
  HTTP request
       │
       ▼
  OrderController   ── turns HTTP into method calls, and results into HTTP
       │
       ▼
  OrderService      ── coordinates a use case: load, act, save, notify
       │        └──────────────▶ Notifier (interface)
       ▼
  OrderRepository   ── loads and saves Order objects (interface)
       │
       ▼
     Order          ── the business rules (entity)
```

The controller does not contain business rules. The service does not know SQL. The order does not know about HTTP. Each layer talks to the next through an interface. You will build exactly this structure in {{ch:nestjs-basics}}.

**Level 5 — professional practice.** Teams agree on conventions: which objects are entities and which are values, where validation happens, how errors are reported, and how deep inheritance may go (often: "one level, and only for framework base classes"). They review designs for anemic models and leaking state. They prefer small classes with one clear job — the "S" of SOLID ({{ch:solid-principles}}).

**Level 6 — enterprise scale.** In large organisations, the approach called **Domain-Driven Design** (DDD), from Eric Evans's 2003 book of the same name, extends these ideas. It adds vocabulary such as **aggregate** (a cluster of objects, like an order and its lines, that is always changed as one unit through a single "root" object) and **bounded context** (a part of the business, such as "billing" or "shipping", inside which every word has one precise meaning). In very large systems, each bounded context may become its own service ({{ch:microservices}}). At this scale, the hardest part of OOP is no longer syntax — it is drawing the right boundaries.

## Real-world use cases

### A clinic's appointment booking

- **Business problem:** double bookings and appointments in impossible states (rescheduled after cancellation) cause angry patients and lost revenue.
- **Technical problem:** the status field is changed from many places with no shared rules.
- **Solution:** an `Appointment` entity with methods `book`, `reschedule`, `cancel` and `markNoShow`, each checking the current state. A `Schedule` object owns the rule "one appointment per doctor per slot".
- **Why it works:** every rule now has one home. A new developer can read `Appointment` and know every legal move.
- **Limits:** the "no double booking" rule cannot be enforced only in memory when two receptionists book at the same moment on two servers. It also needs a database constraint or a transaction ({{ch:transactions}}). Objects protect rules inside one process; databases protect them across many.

### A payment system with several providers

- **Business problem:** the business wants card payments, bank transfers and mobile wallets, and expects to add more.
- **Solution:** a `PaymentProvider` interface with `charge` and `refund`, one class per provider, and a checkout service that depends only on the interface.
- **Pros:** adding a provider means adding a class; checkout code does not change; tests use a fake provider.
- **Cons and failure scenarios:** providers differ in ways the interface may hide badly — some confirm instantly, others hours later through a callback. If the interface pretends all payments are instant, the abstraction leaks and orders get shipped before money arrives. The interface must model the real behaviour: "charge returns *pending*, *succeeded* or *failed*".

### Where OOP is the wrong tool

- **Data pipelines** that read rows, transform them and write them out are naturally a chain of functions ({{ch:functional-programming}}).
- **Small scripts** of fifty lines gain nothing from classes.
- **Configuration and data transfer objects** — data that moves between systems as JSON — are best as plain objects with types, not classes with behaviour.
- **Very hot loops** in performance-critical code (games, simulations) sometimes avoid creating many small objects, because creating objects costs memory and garbage-collection time ({{ch:advanced-javascript}}).

## Common mistakes

### Beginner: getters and setters for everything

```ts
// fragment
class Account {
  #balance = 0;
  getBalance() { return this.#balance; }
  setBalance(value: number) { this.#balance = value; }
}
```

- **Why people do it:** they learned "fields should be private" and add accessors mechanically.
- **What happens:** `setBalance(-1000)` is allowed. The field is private in name only.
- **How to spot it:** a setter whose body is just an assignment.
- **Fix:** replace setters with **operations** that mean something (`deposit`, `withdraw`) and check the rules.

### Beginner: a shared default object

```ts
const defaultTags: string[] = [];

class Task {
  tags: string[];
  constructor(readonly title: string, tags: string[] = defaultTags) {
    this.tags = tags;
  }
}

const a = new Task("Write report");
const b = new Task("Call client");
a.tags.push("urgent");
console.log(b.tags);
```

**Output:**

```text
[ 'urgent' ]
```

- **What happens:** both tasks were given the **same** `defaultTags` array. Tagging one task tagged the other.
- **Fix:** create a fresh array for each instance — `tags: string[] = []` as a field initialiser, or `[...tags]` in the constructor. Field initialisers run once **per instance**, so each object gets its own array.

### Intermediate: deep inheritance trees

- **What it looks like:** `BaseEntity → AuditedEntity → SoftDeletableEntity → Person → Customer → PremiumCustomer`.
- **Why people do it:** each level reused a little code at the time it was written.
- **What happens:** to understand `PremiumCustomer` you must read six classes; a change in `AuditedEntity` can break any of them; there is no place for "a premium supplier".
- **Fix:** flatten. Move shared behaviour into small helper objects or functions that classes **use**, rather than parents they **are**.

### Intermediate: checking types instead of using polymorphism

```ts
// fragment
if (discount instanceof PercentageDiscount) { /* ... */ }
else if (discount instanceof FixedDiscount) { /* ... */ }
```

- **What happens:** every new subclass needs a new branch, in every such place — the very problem polymorphism solves.
- **Fix:** move the varying behaviour into a method on the interface, and call that method.

### Production: the "God class"

- **What it looks like:** an `OrderManager` or `AppService` with 4,000 lines and 120 methods that does validation, pricing, emails, PDFs and database access.
- **What happens:** every feature touches it; merge conflicts are constant; nothing can be tested alone; a bug in PDF generation can block a pricing fix from being released.
- **How to spot it:** a class whose name ends in *Manager*, *Helper*, *Util* or *Processor* and keeps growing; methods that use completely different fields.
- **Fix:** split by responsibility, one step at a time, protected by tests ({{ch:testing}}).

### Enterprise: modelling the database instead of the business

- **What it looks like:** one class per database table, with exactly the table's columns as public fields, and all behaviour in services.
- **What happens:** an anemic domain model — rules scattered, invariants unprotected — and business logic shaped by storage details.
- **Fix:** design objects around business operations and rules first; map them to tables second ({{ch:orms}}).

## Debugging and troubleshooting

**Symptom: "Cannot read properties of undefined (reading '…')" inside a method.**
Cause: usually a lost `this` ({{ch:this-prototypes-classes}}) — a method was passed as a callback, such as `items.map(order.label)`. Fix: pass an arrow function `items.map((i) => order.label(i))`, or define the method as an arrow-function field.

**Symptom: an object is in a state that "should be impossible".**
Cause: something changed the state without going through the methods — a public field, a leaked internal array, or a missing check in the constructor. To find it: make the field `#private` and let the compiler list every place that touched it directly. Then check whether any getter returns an internal mutable object.

**Symptom: a subclass method is never called.**
Cause: the method name or signature no longer matches the parent's (it was renamed). Fix: turn on `noImplicitOverride` and add `override` to every replacing method; the compiler will report mismatches.

**Symptom: changing one instance changes another.**
Cause: shared mutable state — a default object, a static field used as if it were per-instance, or two objects holding the same array. To find it: log both objects after the change, and check with `===` whether their inner arrays or objects are the same reference.

**Symptom: `instanceof` returns `false` for an object you know is the right class.**
Cause: two copies of the same class exist — for example, two versions of a library installed in `node_modules` ({{ch:modules-and-npm}}), or the object came from `JSON.parse`, which produces plain objects, never class instances. Fix: avoid relying on `instanceof` across library boundaries; after parsing JSON, construct instances explicitly with a factory such as `Order.fromJson(data)`.

## Security and performance

**Security.** Encapsulation is a design tool, not a security boundary inside one program: any code running in the same process can do harmful things in other ways. But two real security issues are connected to objects:

- **Calling methods chosen by user input.** Code like `service[request.query.action]()` lets an attacker choose which method runs — including inherited ones such as `constructor`. Always map user input through an explicit list of allowed actions.
- **Prototype pollution.** If code copies user-supplied JSON into objects key by key, a key named `__proto__` can modify `Object.prototype` and change the behaviour of **every** object in the program. You will study this in {{ch:application-security}}. The defence: validate input against a schema ({{ch:validation}}), and use `Map` or objects created with `Object.create(null)` for user-controlled keys.

**Performance.** Method calls through the prototype chain are extremely fast in modern engines: V8, the engine inside Node.js and Chrome, caches lookups and gives objects with the same properties in the same order a shared internal "shape" (often called a **hidden class**). Two practical consequences: initialise all fields in the constructor or as field initialisers, in a consistent order, rather than adding properties later; and do not worry about the cost of small classes or method calls in normal application code — database and network calls are millions of times slower.

## How a senior engineer thinks about this

A senior engineer does not ask "should this be object-oriented?" in general. They ask specific questions:

- **Are there rules to protect?** If yes, put the data and the rules together behind methods. If the thing is just data passing through, a typed plain object is enough.
- **What will change?** If new *kinds* of things will be added, use an interface and polymorphism. If new *operations* will be added to a fixed set of kinds, a union and functions may be better.
- **Is this really "is-a", forever?** If not, compose.
- **Can I explain this class in one sentence?** If the sentence needs "and" three times, it has too many jobs.
- **What is the smallest interface callers need?** Every public method is a promise that is hard to take back.

And they know when good enough is good enough. A small internal tool does not need value objects for every field. A prototype does not need a perfect domain model. Design effort should match how long the code will live and how many people will change it.

## Exercises

### Exercise 1 — A temperature value object

**Objective:** practise immutability, factory methods and invariants.
**Starting point:** an empty file `temperature.ts`.
**What to build:** a `Temperature` class that stores degrees Celsius. It needs static factories `fromCelsius` and `fromFahrenheit`, a getter `fahrenheit`, a method `warmerBy(degrees)` that returns a **new** temperature, and an `equals` method. Temperatures below absolute zero (−273.15 °C) must be rejected.
**Hints:** °F = °C × 9/5 + 32. Make the constructor private. Round results to two decimal places when displaying.

<details>
<summary>Show the solution</summary>

```ts
class Temperature {
  static readonly ABSOLUTE_ZERO_C = -273.15;

  private constructor(readonly celsius: number) {
    if (Number.isNaN(celsius) || celsius < Temperature.ABSOLUTE_ZERO_C) {
      throw new Error(`Temperature below absolute zero: ${celsius} °C`);
    }
  }

  static fromCelsius(c: number): Temperature {
    return new Temperature(c);
  }

  static fromFahrenheit(f: number): Temperature {
    return new Temperature(((f - 32) * 5) / 9);
  }

  get fahrenheit(): number {
    return (this.celsius * 9) / 5 + 32;
  }

  warmerBy(degreesC: number): Temperature {
    return new Temperature(this.celsius + degreesC);
  }

  equals(other: Temperature): boolean {
    return Math.abs(this.celsius - other.celsius) < 1e-9;
  }

  toString(): string {
    return `${this.celsius.toFixed(2)} °C`;
  }
}

const body = Temperature.fromCelsius(37);
console.log(`${body} = ${body.fahrenheit.toFixed(2)} °F`);
console.log(Temperature.fromFahrenheit(98.6).equals(body));
const fever = body.warmerBy(1.5);
console.log(`${body} -> ${fever}`);
try {
  Temperature.fromCelsius(-300);
} catch (error) {
  console.log((error as Error).message);
}
```

**Output:**

```text
37.00 °C = 98.60 °F
true
37.00 °C -> 38.50 °C
Temperature below absolute zero: -300 °C
```

**Walkthrough:**

- `static readonly ABSOLUTE_ZERO_C` is a constant that belongs to the class, not to each instance.
- The invariant is checked in the **private constructor**, so it applies no matter which factory created the object. `Number.isNaN` also rejects `NaN`, which would otherwise slip past `<` comparisons (any comparison with `NaN` is `false`).
- `warmerBy` returns a new object; `body` is still 37 °C afterwards — immutability.
- `equals` compares with a tiny tolerance, because converting 98.6 °F to Celsius involves floating-point division and may not give exactly 37 ({{ch:types-of-data}}).

**Common wrong approaches:** storing both Celsius and Fahrenheit as fields (they can drift apart — store one, compute the other); checking the absolute-zero rule only in `fromCelsius` (then `warmerBy(-400)` creates an invalid object); making `warmerBy` change `this.celsius` (breaks immutability, so shared temperatures change unexpectedly).

</details>

### Exercise 2 — Replace the switch

**Objective:** practise replacing conditional logic with polymorphism.
**Starting point:**

```ts
// fragment
type Shipping = { method: "standard" | "express" | "pickup" };

function shippingCostPaisa(s: Shipping, weightKg: number): number {
  switch (s.method) {
    case "standard": return 25000 + Math.ceil(weightKg) * 5000;
    case "express":  return 60000 + Math.ceil(weightKg) * 10000;
    case "pickup":   return 0;
  }
}

function deliveryDays(s: Shipping): number {
  switch (s.method) {
    case "standard": return 5;
    case "express":  return 1;
    case "pickup":   return 0;
  }
}
```

**What to build:** a `ShippingMethod` interface with `costPaisa(weightKg)`, `days()` and `name`, and one class per method. Then add a fourth method, "same-city courier" (Rs 400 flat, 1 day, but only for parcels up to 5 kg — heavier parcels throw an error), **without changing any existing class**. Print a quote for a 2.3 kg parcel with each method.

<details>
<summary>Show the solution</summary>

```ts
interface ShippingMethod {
  readonly name: string;
  costPaisa(weightKg: number): number;
  days(): number;
}

class StandardShipping implements ShippingMethod {
  readonly name = "Standard";
  costPaisa(weightKg: number): number {
    return 25000 + Math.ceil(weightKg) * 5000;
  }
  days(): number {
    return 5;
  }
}

class ExpressShipping implements ShippingMethod {
  readonly name = "Express";
  costPaisa(weightKg: number): number {
    return 60000 + Math.ceil(weightKg) * 10000;
  }
  days(): number {
    return 1;
  }
}

class StorePickup implements ShippingMethod {
  readonly name = "Store pickup";
  costPaisa(): number {
    return 0;
  }
  days(): number {
    return 0;
  }
}

class SameCityCourier implements ShippingMethod {
  readonly name = "Same-city courier";
  costPaisa(weightKg: number): number {
    if (weightKg > 5) throw new Error("Courier accepts parcels up to 5 kg");
    return 40000;
  }
  days(): number {
    return 1;
  }
}

function quote(method: ShippingMethod, weightKg: number): string {
  return `${method.name}: Rs ${method.costPaisa(weightKg) / 100}, ${method.days()} day(s)`;
}

const methods: ShippingMethod[] = [new StandardShipping(), new ExpressShipping(), new StorePickup(), new SameCityCourier()];
for (const m of methods) console.log(quote(m, 2.3));
```

**Output:**

```text
Standard: Rs 400, 5 day(s)
Express: Rs 900, 1 day(s)
Store pickup: Rs 0, 0 day(s)
Same-city courier: Rs 400, 1 day(s)
```

**Walkthrough:** 2.3 kg rounds **up** to 3 kg with `Math.ceil`, so standard costs 25,000 + 3 × 5,000 = 40,000 paisa = Rs 400, and express 60,000 + 3 × 10,000 = 90,000 paisa = Rs 900. `quote` never mentions a specific method. Adding `SameCityCourier` required one new class and one new entry in the list; nothing else changed. The weight limit lives inside the courier class, which is the only place that knows about it.

**Common wrong approaches:** keeping a `switch` inside `quote` "for the special case" (the special case belongs in its class); making `ShippingMethod` an abstract class with no shared code (an interface is simpler).

</details>

### Exercise 3 — Debug the inheritance

**Objective:** practise diagnosing a fragile base class.
**The scenario:** a teammate wrote a logging list that should log each item added exactly once. With `addMany(["a", "b"])`, it logs four lines instead of two.

```ts
// fragment
class ItemList {
  protected items: string[] = [];
  add(item: string): void { this.items.push(item); }
  addMany(items: string[]): void { for (const i of items) this.add(i); }
}

class LoggingItemList extends ItemList {
  override add(item: string): void {
    console.log(`added ${item}`);
    super.add(item);
  }
  override addMany(items: string[]): void {
    for (const i of items) console.log(`added ${i}`);
    super.addMany(items);
  }
}
```

**What to do:** explain the cause, then fix it using composition.

<details>
<summary>Show the solution</summary>

**Cause:** `LoggingItemList.addMany` logs each item, then calls `super.addMany`, which calls `this.add` for each item. Through dynamic dispatch, `this.add` is the **overridden** `add`, which logs again. The subclass depended on an internal detail of the parent (that `addMany` calls `add`).

**Fix with composition:**

```ts
class ItemList {
  #items: string[] = [];
  add(item: string): void {
    this.#items.push(item);
  }
  addMany(items: string[]): void {
    for (const i of items) this.add(i);
  }
  get count(): number {
    return this.#items.length;
  }
}

class LoggingItemList {
  #inner = new ItemList();
  add(item: string): void {
    console.log(`added ${item}`);
    this.#inner.add(item);
  }
  addMany(items: string[]): void {
    for (const i of items) console.log(`added ${i}`);
    this.#inner.addMany(items);
  }
  get count(): number {
    return this.#inner.count;
  }
}

const list = new LoggingItemList();
list.addMany(["a", "b"]);
console.log(list.count);
```

**Output:**

```text
added a
added b
2
```

The inner list's `this.add` refers to the inner list, so nothing is logged twice. A shorter but more fragile alternative is to delete `LoggingItemList.addMany` and rely on the parent calling `add` — it works today, but breaks the moment the parent stops calling `add` internally. Composition does not depend on that detail at all.

</details>

### Exercise 4 — Production scenario: a library loan

**Objective:** design a small entity with a state machine and invariants.
**What to build:** a `Loan` for a library. A loan is created for a book and a member with a due date. It can be `returned()` once. If it is returned after the due date, a fine of Rs 20 per late day is recorded. A loan can be `renewed()` at most twice, only while active and not overdue; each renewal moves the due date 14 days later. Use whole days (numbers) instead of real dates to keep it simple: the constructor takes `dueDay`, and `returned(onDay)` and `renewed(onDay)` take the current day.

<details>
<summary>Show the solution</summary>

```ts
type LoanStatus = "active" | "returned";

class Loan {
  #status: LoanStatus = "active";
  #dueDay: number;
  #renewals = 0;
  #finePaisa = 0;

  constructor(readonly bookId: string, readonly memberId: string, dueDay: number) {
    this.#dueDay = dueDay;
  }

  get dueDay(): number {
    return this.#dueDay;
  }
  get finePaisa(): number {
    return this.#finePaisa;
  }
  get status(): LoanStatus {
    return this.#status;
  }

  renewed(onDay: number): void {
    this.#requireActive();
    if (onDay > this.#dueDay) throw new Error("Overdue loans cannot be renewed");
    if (this.#renewals >= 2) throw new Error("A loan can be renewed at most twice");
    this.#renewals++;
    this.#dueDay += 14;
  }

  returned(onDay: number): void {
    this.#requireActive();
    const lateDays = Math.max(0, onDay - this.#dueDay);
    this.#finePaisa = lateDays * 2000;
    this.#status = "returned";
  }

  #requireActive(): void {
    if (this.#status !== "active") throw new Error("This loan is already closed");
  }
}

const loan = new Loan("BOOK-12", "MEM-7", 14);
loan.renewed(10);
loan.renewed(25);
try {
  loan.renewed(30);
} catch (error) {
  console.log((error as Error).message);
}
console.log(loan.dueDay);
loan.returned(45);
console.log(loan.status, `fine Rs ${loan.finePaisa / 100}`);
try {
  loan.returned(46);
} catch (error) {
  console.log((error as Error).message);
}
```

**Output:**

```text
A loan can be renewed at most twice
42
returned fine Rs 60
This loan is already closed
```

**Walkthrough:** the due day starts at 14, moves to 28 after the first renewal and 42 after the second. The third renewal is refused. Returned on day 45, the loan is 3 days late: 3 × 2,000 paisa = Rs 60. A second return is refused, because a returned loan is closed. All state is private; every change is a named business action that checks its rules first — the same shape as the `Order` in this chapter.

**Common wrong approaches:** exposing `dueDay` with a setter (anyone could extend a loan without the renewal rules); calculating the fine in a separate service (the rule then lives far from the data); forgetting to stop a second `returned` (the fine could be recalculated and overwritten).

</details>

## Summary

Object-oriented programming organises software around objects that combine state and behaviour. It was a response to programs whose shared data could be changed from anywhere, so that no rule was enforced in one place.

**Encapsulation** keeps data and its rules together, hides the data behind methods, and makes **invariants** hold — checked in the constructor and in every method that changes state. Watch for leaks through returned mutable objects. **Abstraction** offers a small, simple surface — usually an **interface** — and hides the details; programming to interfaces and passing collaborators in (**dependency injection**) makes code easy to change and test. **Inheritance** shares code along a true "is-a" relationship; TypeScript's `abstract`, `protected` and `override` make it safer, but it couples children to their parents' internals (the **fragile base class problem**). **Polymorphism** lets one call produce different behaviour through **dynamic dispatch**, so new kinds of things can be added without editing existing code.

Experience adds the most important rule: **favour composition over inheritance**. Distinguish **entities** (identity, changing state) from **value objects** (immutable, compared by value), model business actions as methods rather than setters, and keep classes small and focused. And remember that OOP is one tool among several: plain objects and functions are often the simpler choice.

## Key terms

- **Object-oriented programming (OOP)** — A way of organising programs around objects that combine data and the behaviour that operates on it.
- **Programming paradigm** — A general style of structuring programs, such as object-oriented, procedural or functional.
- **Encapsulation** — Keeping data together with the code that changes it, and preventing other code from changing the data directly.
- **Invariant** — A rule about an object's state that must always be true, such as a balance never being negative.
- **Abstraction** — Exposing only what a user of some code needs, and hiding the details of how it works.
- **Leaky abstraction** — An abstraction whose hidden details still affect, and must be handled by, the code that uses it.
- **Inheritance** — A relationship in which a subclass receives the fields and methods of a superclass and can add to or change them.
- **Polymorphism** — The ability of one call to produce different behaviour depending on the object that receives it.
- **Dynamic dispatch** — Choosing which method implementation to run at runtime, based on the actual object.
- **Abstract class** — A class that cannot be instantiated directly and may declare methods that subclasses must implement.
- **Abstract method** — A method declared without a body, which every concrete subclass must implement.
- **Protected member** — A field or method visible to its own class and its subclasses, but not to other code.
- **Override** — To replace a method inherited from a parent class with a new implementation in a subclass.
- **Fragile base class problem** — When changes to a parent class's internal details break subclasses that depended on them.
- **Composition** — Building an object from other objects that it holds and uses, expressing a "has-a" relationship.
- **Delegation** — Forwarding a call to another object that does the actual work.
- **Dependency injection** — Giving an object its collaborators from outside, rather than letting it create them itself.
- **Programming to an interface** — Writing code that depends on a contract rather than on one specific implementation.
- **Static factory method** — A static method that creates and returns instances of a class, often with validation.
- **Entity** — An object defined by a lasting identity, whose state can change over time.
- **Value object** — An immutable object defined only by its values and compared by those values.
- **Tell, don't ask** — The guideline that callers should tell objects what to do rather than pulling out their data to decide for them.
- **Law of Demeter** — The guideline that a method should talk only to its direct collaborators, not reach through them to others.
- **Anemic domain model** — A design in which classes hold only data and all business rules live elsewhere, losing the benefits of encapsulation.
- **State machine** — A model with a fixed set of states and a defined set of allowed transitions between them.
- **God class** — A class that has grown to take on far too many unrelated responsibilities.
- **Domain-Driven Design (DDD)** — An approach to designing large systems around a careful model of the business domain and its boundaries.

## What comes next

Object-oriented programming manages change by **protecting** mutable state inside objects. The next chapter, {{ch:functional-programming}}, takes the opposite approach: it **avoids** mutable state wherever possible, and builds programs from small, predictable functions that take values in and give values out. You have already used many of its ideas — `map`, `filter`, `reduce`, closures and immutable value objects. Next you will see them as a complete way of thinking, and learn how professional TypeScript code combines the two styles.
