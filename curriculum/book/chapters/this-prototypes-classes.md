# this, Prototypes and Classes

> [!GOALS]
> - What `this` is, and the four rules that decide its value in every situation.
> - Why arrow functions handle `this` differently, and when that helps.
> - The famous "lost `this`" bug, and three ways to fix it.
> - What prototypes are, and how JavaScript objects share methods through the prototype chain.
> - What the `new` keyword actually does, step by step.
> - How to write classes: constructors, fields, methods, getters and setters, static members and truly private fields.
> - How inheritance works with `extends` and `super`, and why deep inheritance is risky.
> - When to use classes, and when plain objects and functions are the better choice.

## Why this matters

So far you have built data with object literals and logic with functions. That works well — but some situations call for something more:

- A bank has thousands of accounts. Each has its own balance, but they all need the same `deposit` and `withdraw` behaviour, with the same rules.
- A shop has many kinds of discount — percentage, fixed amount, "buy one get one" — that share some behaviour and differ in other ways.
- Frameworks you will use later, such as NestJS ({{ch:nestjs-basics}}), are built around **classes**, and expect you to write your controllers and services as classes.

**Classes** give you a clean way to describe a *kind* of object once — its data and its behaviour — and then create as many objects of that kind as you need. To use classes properly, though, you need two ideas that sit underneath them: the special keyword **`this`**, and the way JavaScript objects share behaviour, called **prototypes**. Both are a source of confusing bugs for developers who learned the syntax without the mechanism. This chapter teaches the mechanism.

## The simple idea

Think of a car factory. The factory does not design each car from scratch. It has **one blueprint** for a model, describing what every car of that model has (an engine, four doors, a colour) and what it can do (start, stop, turn). From that blueprint, it builds thousands of individual cars. Each car has its **own** colour and its **own** mileage, but they all **share** the same design.

A **class** is that blueprint. Each object built from it is called an **instance**. And `this` is how a car, while doing something, refers to *itself*: "*my* fuel level", "*my* mileage".

> [!ANALOGY]
> A class is a blueprint; instances are the houses built from it. Every house has its own furniture (its own data), but the plans for how the doors and windows work (the methods) exist only once, in the blueprint office, and every house uses them.
>
> **Where the analogy breaks:** a real house cannot ask the blueprint office how to open its door every time someone opens it. In JavaScript, that is exactly what happens: an instance does not carry its own copy of each method; it looks the method up on a shared object called its **prototype** every time. And unlike a physical blueprint, the prototype can be changed while the program runs — and every instance immediately sees the change.

## The proper definition and key words

- **`this`** is a special keyword that, inside a function, refers to an object determined by **how the function is called**.
- A **class** is a template for creating objects that share the same structure and behaviour.
- An **instance** is an object created from a class.
- A **constructor** is the special function that sets up a new instance.
- A **prototype** is an object from which another object inherits properties and methods.
- **Inheritance** is when one class (or object) receives the properties and methods of another, and can add to or change them.

## `this`: decided at call time

In {{ch:scope-and-closures}} you learned that ordinary variables follow **lexical scope**: what a name means is decided by where the code is **written**. `this` is the great exception. For normal functions, `this` is decided by **how the function is called** — at the moment of the call.

There are four rules. Learn them in order, because when more than one could apply, the earlier rules in this list take priority over the later ones — except that `new` beats everything.

### Rule 1 — Method call: `this` is the object before the dot

When you call a function as a method — `object.method()` — `this` is the object **before the dot**:

```js
const account = {
  owner: "Sara",
  balancePaisa: 500000,
  describe() {
    return `${this.owner} has Rs ${this.balancePaisa / 100}`;
  },
};

console.log(account.describe());
```

**Output:**

```text
Sara has Rs 5000
```

When `account.describe()` runs, the engine looks at the call: there is `account` before the dot, so inside `describe`, `this` is `account`. `this.owner` is therefore `account.owner`.

The same method can be shared by different objects, and `this` follows whichever object it was called on:

```js
function describe() {
  return `${this.owner} has Rs ${this.balancePaisa / 100}`;
}

const sarasAccount = { owner: "Sara", balancePaisa: 500000, describe };
const bilalsAccount = { owner: "Bilal", balancePaisa: 120000, describe };

console.log(sarasAccount.describe());
console.log(bilalsAccount.describe());
```

**Output:**

```text
Sara has Rs 5000
Bilal has Rs 1200
```

There is only **one** `describe` function. It works for both objects because `this` is decided at each call. This is the whole point of `this`: it lets one function work with many objects.

### Rule 2 — Plain call: `this` is `undefined`

When a function is called **on its own**, with nothing before the dot, there is no object for `this` to refer to:

```js
"use strict";

function showThis() {
  return this;
}

console.log(showThis());
```

**Output:**

```text
undefined
```

In **strict mode** — which, as you learned in {{ch:scope-and-closures}}, is automatic in modules and classes — `this` is `undefined` in a plain call. (In old non-strict code, `this` would instead be the global object, which caused silent and confusing bugs. That is one reason strict mode exists.)

### The "lost `this`" bug

Rules 1 and 2 together explain one of the most common bugs in JavaScript. Watch what happens when we take a method **off** its object:

```js
"use strict";

const account = {
  owner: "Sara",
  describe() {
    return `Account owner: ${this.owner}`;
  },
};

const describeLater = account.describe;
console.log(describeLater());
```

**Output:**

```text
TypeError: Cannot read properties of undefined (reading 'owner')
```

`const describeLater = account.describe;` copies a **reference to the function** — not the function "attached" to `account`. Functions do not remember which object they came from. So `describeLater()` is a **plain call** (rule 2): nothing before the dot, `this` is `undefined`, and `this.owner` crashes.

This happens constantly in real code, usually without an obvious assignment — whenever a method is **passed as a callback**:

```js
const order = {
  id: "ORD-5521",
  items: ["shirt", "cap"],
  label(item) {
    return `${this.id}: ${item}`;
  },
};

console.log(order.items.map(order.label));
```

**Output:**

```text
TypeError: Cannot read properties of undefined (reading 'id')
```

`map` receives the `label` function and calls it as a plain function for each item — so `this` is lost, exactly as before. The same thing happens when methods are passed to timers, to event handlers in a web page, and to many library functions.

### Rule 3 — Explicit binding: `call`, `apply` and `bind`

Every function has three methods that let you **choose** `this` yourself.

`call` runs the function immediately, with `this` set to the first argument; further arguments are passed normally. `apply` is the same, but takes the arguments as an array:

```js
function describe(currency) {
  return `${this.owner} has ${currency} ${this.balancePaisa / 100}`;
}

const account = { owner: "Sara", balancePaisa: 500000 };

console.log(describe.call(account, "Rs"));
console.log(describe.apply(account, ["PKR"]));
```

**Output:**

```text
Sara has Rs 5000
Sara has PKR 5000
```

`bind` does not run the function. It returns a **new function** whose `this` is **permanently fixed** to the object you give:

```js
const order = {
  id: "ORD-5521",
  items: ["shirt", "cap"],
  label(item) {
    return `${this.id}: ${item}`;
  },
};

const boundLabel = order.label.bind(order);
console.log(order.items.map(boundLabel));
```

**Output:**

```text
[ 'ORD-5521: shirt', 'ORD-5521: cap' ]
```

However `boundLabel` is called — as a plain function, by `map`, by a timer — its `this` is always `order`. This is the first fix for the lost-`this` bug.

### Rule 4 — `new`: `this` is the brand-new object

When a function is called with the keyword `new`, `this` refers to a **newly created object**. This rule is the basis of classes, and we will look at it in detail shortly.

### Arrow functions: no `this` of their own

Arrow functions ({{ch:functions}}) are the big exception to all four rules: **an arrow function does not have its own `this`.** Instead, it uses the `this` of the place where it was **written** — just like an ordinary variable, following lexical scope. This is called **lexical `this`**.

That makes arrows the second, and most common, fix for the lost-`this` bug:

```js
const order = {
  id: "ORD-5521",
  items: ["shirt", "cap"],
  labels() {
    return this.items.map((item) => `${this.id}: ${item}`);
  },
};

console.log(order.labels());
```

**Output:**

```text
[ 'ORD-5521: shirt', 'ORD-5521: cap' ]
```

Walkthrough:

- `order.labels()` is a method call, so inside `labels`, `this` is `order` (rule 1).
- The arrow function passed to `map` has no `this` of its own. When it uses `this`, it looks outward to the surrounding function, `labels`, whose `this` is `order`.
- So `this.id` inside the arrow is `order.id`, however `map` calls it.

The flip side: **do not use an arrow function as an object's method** when the method needs `this` to be the object:

```js
const account = {
  owner: "Sara",
  describe: () => `Owner: ${this?.owner}`,
};

console.log(account.describe());
```

**Output:**

```text
Owner: undefined
```

The arrow function was written at the top level of the module, where `this` is `undefined` (in an ES module), so it uses that — not `account`. The method-call rule does not apply to arrows. (The `?.` from {{ch:objects}} prevents a crash so you can see the result.)

### Summary of the `this` rules

| How the function is called | `this` is… |
|---|---|
| `new Fn()` | the brand-new object |
| `fn.call(obj)`, `fn.apply(obj)`, or a function made by `fn.bind(obj)` | `obj` |
| `obj.fn()` | `obj` — the object before the dot |
| `fn()` — a plain call | `undefined` (in strict mode) |
| An **arrow function**, however it is called | the `this` of the code around where it was **written** |

> [!TIP]
> When `this` is not what you expect, **look at the call, not the definition**. Ask: "At the moment this function runs, how is it being called? Is there an object before the dot? Was it passed somewhere as a callback?" And if the function is an arrow, look instead at the code *around* where it was written.

## Prototypes: how objects share behaviour

### Level 1 — Where do array methods live?

Here is a question you may never have thought to ask. You create an array:

```js
const prices = [4500, 600, 1200];
```

That array has three elements and a `length`. Yet you can call `prices.map(...)`, `prices.filter(...)`, `prices.push(...)` and dozens of other methods. Where are those methods? They are not inside your array — you never put them there. And if every array carried its own copy of every method, a program with a million arrays would waste enormous amounts of memory.

The answer is that every array is **linked** to a single shared object that holds all the array methods. That shared object is called **`Array.prototype`**. When you call `prices.map`, JavaScript looks for `map` on `prices`, does not find it, follows the link to `Array.prototype`, and finds it there.

```js
const prices = [4500, 600, 1200];

console.log(Object.hasOwn(prices, "map"));
console.log(Object.getPrototypeOf(prices) === Array.prototype);
console.log(typeof Array.prototype.map);
```

**Output:**

```text
false
true
function
```

- `map` is **not** an own property of `prices` (from {{ch:objects}}, `Object.hasOwn` checks own properties only).
- `Object.getPrototypeOf(prices)` returns the object `prices` is linked to — and it is `Array.prototype`.
- `Array.prototype.map` is where the `map` function actually lives.

### Level 2 — The prototype chain

Every JavaScript object has a hidden link to another object, its **prototype**. (Internally this link is called `[[Prototype]]`; you read it with `Object.getPrototypeOf`.) When you read a property:

1. JavaScript looks on the object itself.
2. If it is not there, it follows the link to the object's prototype and looks there.
3. If it is not there either, it follows **that** object's prototype link, and so on.
4. The chain ends at `null`. If the property was not found anywhere, the result is `undefined`.

This sequence of linked objects is the **prototype chain**:

```text
   prices                     [4500, 600, 1200], length: 3
     |  [[Prototype]]
     v
   Array.prototype            map, filter, push, sort, includes, ...
     |  [[Prototype]]
     v
   Object.prototype           hasOwnProperty, toString, ...
     |  [[Prototype]]
     v
   null                       end of the chain
```

When you call `prices.toString()`, JavaScript checks `prices` (no), `Array.prototype` (yes — arrays have their own `toString`). When you call `prices.hasOwnProperty("length")`, it checks `prices`, then `Array.prototype`, then `Object.prototype`, where it finds it. Every ordinary object ultimately links to `Object.prototype`, which is why every object has a few built-in methods.

The same applies to strings, numbers and functions. `"Lahore".toUpperCase()` works because, when you use a method on a string, JavaScript temporarily treats the string as an object linked to `String.prototype`, where `toUpperCase` lives.

> [!INSIDE]
> Notice how similar this is to the **scope chain** from {{ch:scope-and-closures}}. Scope chain: looking up a *variable* through nested environments. Prototype chain: looking up a *property* through linked objects. Both search outward step by step until they find a match or reach the end. Keep the two separate in your mind: the scope chain is decided by where code is written; the prototype chain is decided by how objects are linked.

### Creating your own prototype links

You can create an object with a chosen prototype using `Object.create`:

```js
const accountMethods = {
  describe() {
    return `${this.owner} has Rs ${this.balancePaisa / 100}`;
  },
};

const account = Object.create(accountMethods);
account.owner = "Sara";
account.balancePaisa = 500000;

console.log(account.describe());
console.log(Object.hasOwn(account, "describe"));
```

**Output:**

```text
Sara has Rs 5000
false
```

`account` holds only its own data, `owner` and `balancePaisa`. `describe` lives on `accountMethods`, its prototype, and is found through the chain. And because `account.describe()` is a method call on `account`, `this` is `account` — so the shared method works with this object's own data.

This is the core idea that classes are built on: **data on each object, behaviour on a shared prototype.**

> [!WARNING]
> **Never add methods to built-in prototypes** such as `Array.prototype` or `Object.prototype` in application code. Doing so changes the behaviour of every array or object in the program — including inside libraries you did not write — and can collide with methods JavaScript adds in future versions. (This has happened: a popular old library added a method called `flatten` to `Array.prototype`, which is part of why JavaScript's built-in method had to be named `flat` instead.) Changing `Object.prototype` is also exactly what the **prototype pollution** attack from {{ch:objects}} achieves — now you can see why it is so dangerous: every object in the program inherits whatever is placed there.

## Constructor functions and `new`

### Level 3 — What `new` does

Before classes existed (they arrived in 2015), JavaScript developers created many similar objects with **constructor functions** and the `new` keyword. Classes are built on exactly this mechanism, so it is worth seeing it directly once.

```js
function Account(owner, balancePaisa) {
  this.owner = owner;
  this.balancePaisa = balancePaisa;
}

Account.prototype.describe = function () {
  return `${this.owner} has Rs ${this.balancePaisa / 100}`;
};

const sara = new Account("Sara", 500000);
const bilal = new Account("Bilal", 120000);

console.log(sara.describe());
console.log(bilal.describe());
console.log(sara.describe === bilal.describe);
```

**Output:**

```text
Sara has Rs 5000
Bilal has Rs 1200
true
```

By convention, constructor functions start with a **capital letter** (PascalCase, from {{ch:first-program}}), to signal "call me with `new`".

Every function has a property called `prototype` (an ordinary object), and here we put `describe` on `Account.prototype`.

When you write `new Account("Sara", 500000)`, JavaScript performs four steps:

```text
  new Account("Sara", 500000)

  1. Create a brand-new empty object:          {}
  2. Link its prototype to Account.prototype:  {} --[[Prototype]]--> Account.prototype
  3. Run Account with `this` = the new object: this.owner = "Sara"; this.balancePaisa = 500000
  4. Return the new object (unless the function explicitly returns another object)
```

So each instance gets its **own** `owner` and `balancePaisa` (step 3), while `describe` exists **once**, on `Account.prototype`, shared by every instance (step 2). The last line of output confirms both instances use the very same `describe` function.

> [!NOTE]
> The word "prototype" is used in two related but different ways, which confuses almost everyone at first:
>
> - **An object's prototype** — the object it is linked to, read with `Object.getPrototypeOf(obj)`.
> - **A function's `prototype` property** — an ordinary property on constructor functions, holding the object that will **become** the prototype of instances created with `new`.
>
> So `Object.getPrototypeOf(sara) === Account.prototype` is `true`: `sara`'s prototype is the object stored in `Account`'s `prototype` property.

If you forget `new`, step 1, 2 and 4 do not happen, and `this` follows the plain-call rule — `undefined` in strict mode — so `this.owner = owner` throws an error. Classes protect you from this mistake, as you will see.

## Classes

### Level 3 — The class syntax

A **class** packages the constructor-and-prototype pattern into one clear, readable form. Here is the same `Account`, written as a class:

```js
class Account {
  constructor(owner, balancePaisa = 0) {
    this.owner = owner;
    this.balancePaisa = balancePaisa;
  }

  deposit(amountPaisa) {
    this.balancePaisa += amountPaisa;
  }

  describe() {
    return `${this.owner} has Rs ${this.balancePaisa / 100}`;
  }
}

const account = new Account("Sara", 500000);
account.deposit(25000);
console.log(account.describe());
console.log(account instanceof Account);
```

**Output:**

```text
Sara has Rs 5250
true
```

Walkthrough:

- `class Account { ... }` declares the class. Class names use PascalCase.
- **`constructor`** is the special method that runs when you write `new Account(...)` — it is step 3 of `new`. Its job is to set up the new instance's own data on `this`.
- **`deposit`** and **`describe`** are methods. They are written without the word `function` and without commas between them. JavaScript places them on `Account.prototype` automatically, so they are shared by all instances.
- **`new Account("Sara", 500000)`** creates an instance, exactly as with the constructor function.
- **`instanceof`** checks whether an object has a class's prototype somewhere in its chain — in other words, whether it is an instance of that class.

Classes add some protections over constructor functions:

- Calling a class without `new` is an error (`TypeError: Class constructor Account cannot be invoked without 'new'`), so the forgotten-`new` bug cannot happen silently.
- The code inside a class is always in **strict mode**.

But underneath, it is the **same mechanism**: an object linked to a prototype holding shared methods. People often call classes **syntactic sugar** over prototypes — a nicer way to write the same thing.

### Class fields

You can declare properties directly in the class body, outside the constructor. These are called **class fields**, and they make the shape of each instance obvious at a glance:

```js
class Basket {
  items = [];
  couponCode = null;

  addItem(name, pricePaisa, quantity = 1) {
    this.items.push({ name, pricePaisa, quantity });
  }

  totalPaisa() {
    return this.items.reduce((sum, item) => sum + item.pricePaisa * item.quantity, 0);
  }
}

const basket = new Basket();
basket.addItem("Cotton shirt", 129950, 2);
basket.addItem("Cap", 49900);
console.log(basket.totalPaisa());
console.log(basket);
```

**Output:**

```text
309800
Basket {
  items: [
    { name: 'Cotton shirt', pricePaisa: 129950, quantity: 2 },
    { name: 'Cap', pricePaisa: 49900, quantity: 1 }
  ],
  couponCode: null
}
```

Each instance gets its **own** `items` array — the field's initial value is created fresh for every `new Basket()`. Notice that Node.js prints the class name, `Basket`, before the object.

### Private fields: truly hidden data

In {{ch:scope-and-closures}} you built a wallet whose balance was private because it lived in a closure. Classes have their own way to make data private: **private fields**, whose names begin with `#`:

```js
class Wallet {
  #balancePaisa = 0;
  #history = [];

  deposit(amountPaisa) {
    if (amountPaisa <= 0) throw new Error("Deposit must be positive");
    this.#balancePaisa += amountPaisa;
    this.#history.push(`+${amountPaisa}`);
  }

  withdraw(amountPaisa) {
    if (amountPaisa > this.#balancePaisa) return false;
    this.#balancePaisa -= amountPaisa;
    this.#history.push(`-${amountPaisa}`);
    return true;
  }

  get balancePaisa() {
    return this.#balancePaisa;
  }

  get history() {
    return [...this.#history];
  }
}

const wallet = new Wallet();
wallet.deposit(100000);
wallet.withdraw(30000);
console.log(wallet.balancePaisa);
console.log(wallet.history);
wallet.balancePaisa = 999999999;
console.log(wallet.balancePaisa);
```

**Output:**

```text
70000
[ '+100000', '-30000' ]
70000
```

Walkthrough:

- `#balancePaisa` and `#history` are **private fields**. They can be used only by code **inside** the class body. Any attempt to write `wallet.#balancePaisa` outside the class is a **syntax error** — the program will not even start.
- `get balancePaisa() { ... }` is a **getter**: a method that is used like a property, without brackets. `wallet.balancePaisa` calls it and returns the private value.
- There is no **setter**, so `wallet.balancePaisa = 999999999` cannot change anything. (In strict mode outside a class it would throw an error; here, at the top level of a non-module script, it is silently ignored. Either way, the balance is safe.)
- `history` returns a copy, so callers cannot modify the real history.

The rules — no negative deposits, no overdrafts, every change recorded — are guaranteed, because nothing outside the class can touch the data. This is **encapsulation** again, in class form.

### Getters and setters

Getters can also **compute** values, and **setters** can **check** values when they are assigned:

```js
class Product {
  #pricePaisa;

  constructor(title, pricePaisa) {
    this.title = title;
    this.pricePaisa = pricePaisa;   // goes through the setter below
  }

  get pricePaisa() {
    return this.#pricePaisa;
  }

  set pricePaisa(value) {
    if (!Number.isInteger(value) || value < 0) {
      throw new Error(`Invalid price: ${value}`);
    }
    this.#pricePaisa = value;
  }

  get priceLabel() {
    return `Rs ${(this.#pricePaisa / 100).toFixed(2)}`;
  }
}

const shirt = new Product("Cotton shirt", 129950);
console.log(shirt.priceLabel);
shirt.pricePaisa = -5;
```

**Output:**

```text
Rs 1299.50
Error: Invalid price: -5
```

- The setter `set pricePaisa(value)` runs whenever something assigns to `pricePaisa` — including inside the constructor. It rejects anything that is not a whole, non-negative number of paisa (`Number.isInteger` checks for whole numbers).
- `priceLabel` is a computed getter: it has no stored value; it is calculated each time it is read.

Getters and setters let a class keep a simple, property-like interface while enforcing rules underneath.

### Static members

A **static** method or property belongs to the **class itself**, not to instances. You call it on the class name:

```js
class Money {
  static fromRupees(rupees) {
    return Math.round(rupees * 100);
  }

  static format(paisa) {
    return `Rs ${(paisa / 100).toFixed(2)}`;
  }
}

const paisa = Money.fromRupees(1299.5);
console.log(paisa);
console.log(Money.format(paisa));
```

**Output:**

```text
129950
Rs 1299.50
```

Static methods are useful for helpers that relate to the class but do not need a particular instance — conversions, and **factory methods** that create instances in special ways, such as `Order.fromJSON(text)`. You have used built-in static methods already: `Array.isArray`, `Object.keys`, `Number.isNaN` and `JSON.parse` are all static.

## Inheritance: `extends` and `super`

### Level 4 — One class built on another

**Inheritance** lets one class build on another. The new class — the **subclass** (or child class) — receives everything from the **superclass** (or parent class), and can add new things or replace existing ones.

```js
class Discount {
  constructor(code) {
    this.code = code;
  }

  apply(totalPaisa) {
    return totalPaisa;
  }

  describe() {
    return `Discount code ${this.code}`;
  }
}

class PercentageDiscount extends Discount {
  constructor(code, percent) {
    super(code);
    this.percent = percent;
  }

  apply(totalPaisa) {
    return Math.round(totalPaisa * (1 - this.percent / 100));
  }

  describe() {
    return `${super.describe()}: ${this.percent}% off`;
  }
}

class FixedDiscount extends Discount {
  constructor(code, amountPaisa) {
    super(code);
    this.amountPaisa = amountPaisa;
  }

  apply(totalPaisa) {
    return Math.max(0, totalPaisa - this.amountPaisa);
  }
}

const discounts = [
  new PercentageDiscount("SAVE10", 10),
  new FixedDiscount("MINUS500", 50000),
];

for (const discount of discounts) {
  console.log(discount.describe(), "->", discount.apply(300000));
}
```

**Output:**

```text
Discount code SAVE10: 10% off -> 270000
Discount code MINUS500 -> 250000
```

Walkthrough:

- `class PercentageDiscount extends Discount` makes `PercentageDiscount` a subclass of `Discount`.
- In the subclass constructor, **`super(code)`** calls the parent's constructor, which sets `this.code`. In a subclass, you **must** call `super(...)` before using `this` — otherwise JavaScript throws `ReferenceError: Must call super constructor in derived class before accessing 'this'`. The parent sets up its part of the object first.
- Each subclass **overrides** `apply` — it provides its own version, which replaces the parent's for its instances.
- `PercentageDiscount` also overrides `describe`, but **reuses** the parent's version through **`super.describe()`**, and adds to it.
- `FixedDiscount` does not override `describe`, so it **inherits** the parent's version.
- `Math.max(0, ...)` ensures a fixed discount can never make a total negative.

Under the hood, this is the prototype chain again, one level longer:

```text
  a PercentageDiscount instance     code, percent
          |
          v
  PercentageDiscount.prototype      apply, describe
          |
          v
  Discount.prototype                apply, describe
          |
          v
  Object.prototype
```

When `discount.describe()` runs on a `FixedDiscount`, JavaScript looks on the instance, then `FixedDiscount.prototype` (no `describe`), then `Discount.prototype` — found. For a `PercentageDiscount`, it is found one step earlier, on `PercentageDiscount.prototype`, which is why the override wins.

### Polymorphism

Look at the loop again:

```js
for (const discount of discounts) {
  console.log(discount.describe(), "->", discount.apply(300000));
}
```

The loop does not know or care **which kind** of discount it has. It just calls `apply`, and each object does the right thing for its kind. This ability — different kinds of object responding to the same method call in their own way — is called **polymorphism** (from Greek: "many forms").

It is extremely useful. To add a new kind of discount — "buy one get one free" — you write a new subclass with its own `apply`. The checkout code that loops over discounts **does not change at all**. Designing code so that new behaviour can be added without modifying existing code is a principle you will meet formally in {{ch:solid-principles}}.

### Extending built-in classes: custom errors

The most common real-world use of `extends` in everyday JavaScript is creating your own kinds of **error**:

```js
class OutOfStockError extends Error {
  constructor(productName) {
    super(`${productName} is out of stock`);
    this.name = "OutOfStockError";
    this.productName = productName;
  }
}

const problem = new OutOfStockError("Cotton shirt");
console.log(problem.message);
console.log(problem.name);
console.log(problem instanceof OutOfStockError, problem instanceof Error);
```

**Output:**

```text
Cotton shirt is out of stock
OutOfStockError
true true
```

`Error` is a built-in class. By extending it, `OutOfStockError` gets everything an error has — a message, a stack trace — plus its own name and extra data. Code that handles errors can then check **which kind** of problem occurred with `instanceof`, and respond appropriately (show "out of stock" to the customer, versus "something went wrong" for an unexpected failure). You will use this pattern heavily in {{ch:errors-and-debugging}} and {{ch:error-handling}}.

## Methods as callbacks in classes

The lost-`this` problem matters most with classes, because class methods are very often passed as callbacks — to timers, to event handlers, to frameworks:

```js
class OrderPrinter {
  prefix = "Order";

  print(id) {
    return `${this.prefix} #${id}`;
  }
}

const printer = new OrderPrinter();
console.log(["101", "102"].map(printer.print));
```

**Output:**

```text
TypeError: Cannot read properties of undefined (reading 'prefix')
```

`map` calls `printer.print` as a plain function, so `this` is `undefined` (class code is always strict). There are three fixes:

```js
// Fix 1: wrap the call in an arrow function, so it is a method call again
["101", "102"].map((id) => printer.print(id));

// Fix 2: bind the method to the instance
["101", "102"].map(printer.print.bind(printer));

// Fix 3: define the method as an arrow-function class field
class OrderPrinter2 {
  prefix = "Order";
  print = (id) => `${this.prefix} #${id}`;
}
const printer2 = new OrderPrinter2();
console.log(["101", "102"].map(printer2.print));
```

**Output (fix 3):**

```text
[ 'Order #101', 'Order #102' ]
```

How fix 3 works: an arrow function written as a class field is created **inside the constructor** for each instance, where `this` is the new instance. Being an arrow, it keeps that `this` forever, however it is called.

The trade-off: arrow-function fields are created **per instance** (each object gets its own copy of the function), while normal methods live **once** on the prototype. For a few objects it makes no difference; for a million instances, prototype methods use far less memory. Fix 1 — wrapping in an arrow at the point of use — is usually the clearest and most common.

## When to use classes — and when not to

JavaScript gives you a real choice. You can model the same thing with **plain objects and functions**, or with **classes**. Both are professional, and you will see both in real codebases.

```js
// Style A: plain data + functions
const account = { owner: "Sara", balancePaisa: 500000 };
function deposit(account, amountPaisa) {
  return { ...account, balancePaisa: account.balancePaisa + amountPaisa };
}

// Style B: class with methods
class Account {
  constructor(owner, balancePaisa) {
    this.owner = owner;
    this.balancePaisa = balancePaisa;
  }
  deposit(amountPaisa) {
    this.balancePaisa += amountPaisa;
  }
}
```

| Plain objects + functions are better when… | Classes are better when… |
|---|---|
| The data is simple and travels a lot — API responses, JSON, configuration | Data and behaviour truly belong together, with rules to protect (an account's balance) |
| You want immutable updates, as React and many state tools prefer | You need private state and encapsulated invariants |
| The data must be serialised to JSON and back (class instances lose their methods in JSON) | You have several kinds of a thing sharing an interface (polymorphism) |
| You want to avoid `this` entirely | A framework expects classes (NestJS, many ORMs, Angular) |

A balanced rule many teams follow: **plain objects for data, classes for things with behaviour and rules** — services, repositories, domain objects with invariants, custom errors.

### Prefer shallow hierarchies

Inheritance is powerful but easily overused. Deep chains — `Animal` → `Mammal` → `Dog` → `WorkingDog` → `PoliceDog` — become fragile: a change in a parent ripples unpredictably into every descendant, and subclasses inherit behaviour they do not want. Experienced engineers generally keep inheritance **one or two levels deep** and prefer **composition** — building objects that *contain* other objects with the behaviour they need — over inheritance. You will study this trade-off properly in {{ch:object-oriented-programming}} and {{ch:design-patterns}}.

## From beginner to enterprise: classes at every level

**Level 3 — A small program.** A class such as `Basket` or `Account` groups data and the methods that work on it. Instances are created with `new`.

**Level 4 — A real application.** Custom error classes describe the application's distinct failures. Domain classes enforce rules — a `Money` class that never allows fractional paisa, an `Order` class that only allows valid status changes (pending → shipped → delivered, never delivered → pending). Data arriving as JSON is plain objects; if class behaviour is needed, the application converts it, often with a static factory such as `Order.fromJSON`.

**Level 5 — Professional engineering.** Backend frameworks like NestJS organise applications into classes — controllers, services, modules — and use **decorators** (special annotations, covered in {{ch:typescript-advanced}}) to wire them together. Services receive the other objects they depend on through their constructors, a pattern called **dependency injection** ({{ch:nestjs-basics}}), which makes them easy to test. Hierarchies are kept shallow; behaviour is shared through composition.

**Level 6 — Enterprise.** In large systems, classes model the core business — "domain models" — and design approaches such as domain-driven design ({{ch:software-architecture}}) guide where the boundaries of each class lie. Teams set conventions on when to use classes versus plain data, especially at the edges of the system, where data is serialised to JSON, stored in databases or sent to other services, and class methods do not survive the trip.

## Real-world use cases

### Beginner level — A to-do list object

**Situation:** a learner builds a `TodoList` class with `add`, `complete` and `remaining` methods.

**Lesson:** data (the tasks) and the operations on it live together; `this` connects them.

### Intermediate level — Custom errors in an API

**Business problem:** an online shop's API returns "500 Internal Server Error" for everything that goes wrong, including "out of stock" and "invalid coupon", so the app cannot show helpful messages.

**Solution:** custom error classes — `OutOfStockError`, `InvalidCouponError`, `NotFoundError` — each mapped to the right HTTP status code ({{ch:how-the-web-works}}) and a clear message. One central error handler checks `instanceof` and builds the response.

**Reasoning:** the kind of error carries meaning; classes make that meaning checkable.

### Advanced level — Discount rules that keep growing

**Business problem:** the marketing team keeps inventing new promotions. Each new type requires changes in checkout code, and each change risks breaking existing promotions.

**Solution:** a `Discount` base class with an `apply` method, and one small subclass per promotion type. Checkout only calls `apply`. New promotions are new classes; checkout never changes.

**Trade-off and limits:** a long list of subclasses can become hard to navigate, and some promotions combine features of several others — which inheritance handles poorly. Many teams later move to composition (each discount built from small rule objects), or to configuration data rather than classes, once the variety grows.

### Enterprise level — Losing behaviour at the edges

**Business problem (illustrative):** a fintech company's `Money` class carefully prevents rounding errors. But money values are cached in Redis and sent between services as JSON, and after each round trip they come back as plain objects — without methods or checks. Some code then adds plain numbers directly, reintroducing rounding bugs.

**Solution:** explicit conversion at every boundary (`Money.fromJSON` and `toJSON` methods), validation of all incoming data, and linting rules that forbid arithmetic on raw amount fields.

**Lesson:** classes protect rules **inside** one program's memory. Across networks, storage and other services, only data travels; the rules must be re-applied wherever the data lands.

## Common mistakes

### Beginner mistake — Forgetting `new`

**What it looks like:** `const account = Account("Sara", 500000);`.

**What happens:** with a class, an immediate `TypeError`. With an old constructor function, `this` is `undefined` and setting properties throws.

**How to fix it:** always use `new` with classes and constructor functions.

### Beginner mistake — Using `this` in a subclass before `super()`

**What it looks like:** setting `this.percent` on the first line of a subclass constructor.

**What happens:** `ReferenceError: Must call super constructor in derived class before accessing 'this'`.

**How to fix it:** call `super(...)` first.

### Intermediate mistake — Losing `this` in callbacks

**What it looks like:** `TypeError: Cannot read properties of undefined` when a method is passed to `map`, a timer or an event handler.

**How to fix it:** wrap in an arrow function at the call site, `bind` the method, or define it as an arrow-function field.

### Intermediate mistake — Arrow functions as object-literal methods

**What it looks like:** `{ describe: () => this.owner }`.

**What happens:** `this` is not the object; it comes from the surrounding code.

**How to fix it:** use normal method syntax, `describe() { ... }`, when the method needs `this`.

### Production mistake — Expecting class instances to survive JSON

**What it looks like:** an `Order` instance is stored in a cache or sent to the browser, then `order.total()` fails with "is not a function".

**Why it happens:** JSON keeps only data; methods and private fields are lost ({{ch:objects}}).

**How to prevent it:** convert explicitly at boundaries (`toJSON` / `fromJSON`), and keep data that travels as plain objects.

### Enterprise mistake — Deep or changing inheritance hierarchies

**What it looks like:** five or six levels of subclasses; a change to a base class breaks distant subclasses in surprising ways.

**How to prevent it:** keep hierarchies shallow; prefer composition; treat base classes used by many teams as stable contracts.

## Debugging and troubleshooting

| Symptom | Likely cause |
|---|---|
| `TypeError: Cannot read properties of undefined (reading 'x')` inside a method | `this` was lost — the method was called as a plain function |
| `this` is the wrong object | Look at how the function was *called*; for arrows, where it was *written* |
| `TypeError: Class constructor X cannot be invoked without 'new'` | Missing `new` |
| `ReferenceError: Must call super constructor...` | Using `this` before `super()` in a subclass |
| `SyntaxError: Private field '#x' must be declared in an enclosing class` | Using a private field outside its class, or a typo in its name |
| `x.method is not a function` | The object is not an instance (often a plain object from JSON), or the method name is misspelt |
| An override does not run | Misspelt method name in the subclass, so the parent's version is found instead |

> [!TIP]
> To see where a method comes from, walk the prototype chain in the REPL: `Object.getPrototypeOf(obj)`, then `Object.getPrototypeOf` of that, and so on, checking `Object.hasOwn(proto, "methodName")` at each step. In browser developer tools, logging an object and expanding the `[[Prototype]]` entries shows the same chain visually.

## How a senior engineer thinks about `this` and classes

> [!SENIOR]
> Experienced engineers use classes deliberately:
>
> - **Is there behaviour and a rule to protect?** If the "class" would only hold data, a plain object is simpler. If it guards invariants — a balance, a valid status — a class with private fields earns its place.
> - **How will this be called?** If methods will be passed as callbacks, they plan for `this` from the start.
> - **Composition before inheritance.** Inheritance is used for genuine "is a kind of" relationships, one or two levels deep — custom errors, a small family of strategies. Shared behaviour is otherwise composed.
> - **What crosses the boundary?** Anything sent over the network or stored is treated as plain data, converted explicitly on the way in and out.
> - **Understand the mechanism.** Classes are prototypes underneath. When something odd happens, they reason about the prototype chain and the `this` rules, not about the syntax.

## Exercises

### Exercise 1 — Predict `this`

**Objective:** practise the four `this` rules and arrow functions.

**What to do:** predict each output, then run the code (save it as a `.mjs` file so that it runs as an ES module in strict mode).

```js
const shop = {
  name: "Ali's Shoe Corner",
  normal() { return this?.name; },
  arrow: () => this?.name,
  delayed() { return [1].map(() => this.name)[0]; },
};

console.log(shop.normal());
console.log(shop.arrow());
console.log(shop.delayed());

const loose = shop.normal;
console.log(loose());

console.log(shop.normal.call({ name: "Another shop" }));
```

<details>
<summary>Show the solution</summary>

**Output:**

```text
Ali's Shoe Corner
undefined
Ali's Shoe Corner
undefined
Another shop
```

Walkthrough:

1. `shop.normal()` — method call; `this` is `shop`.
2. `shop.arrow()` — arrow function; it has no own `this`, and the module's top-level `this` is `undefined`, so `this?.name` is `undefined`.
3. `shop.delayed()` — inside `delayed`, `this` is `shop`; the arrow passed to `map` uses that same `this`.
4. `loose()` — a plain call of the extracted method; `this` is `undefined` in strict mode.
5. `.call({ name: "Another shop" })` — explicit binding sets `this` to the given object.

**Common wrong approach:** assuming `this` always refers to the object a function was written inside. That is only true for arrow functions (and only in the sense of "the `this` around them"). For normal functions, always look at the call.

</details>

### Exercise 2 — A bank account class

**Objective:** practise classes, private fields, getters and validation.

**What to build:** a class `BankAccount` with a private balance in paisa, a public `owner`, methods `deposit(amount)` and `withdraw(amount)`, and a getter `balance` that returns a formatted string like `"Rs 1,250.00"`. Deposits and withdrawals must be positive whole numbers of paisa; withdrawals cannot exceed the balance (throw an error with a clear message in each invalid case).

<details>
<summary>Show the solution</summary>

```js
class BankAccount {
  #balancePaisa = 0;

  constructor(owner) {
    this.owner = owner;
  }

  #checkAmount(amountPaisa) {
    if (!Number.isInteger(amountPaisa) || amountPaisa <= 0) {
      throw new Error(`Amount must be a positive whole number of paisa, got ${amountPaisa}`);
    }
  }

  deposit(amountPaisa) {
    this.#checkAmount(amountPaisa);
    this.#balancePaisa += amountPaisa;
  }

  withdraw(amountPaisa) {
    this.#checkAmount(amountPaisa);
    if (amountPaisa > this.#balancePaisa) {
      throw new Error("Insufficient funds");
    }
    this.#balancePaisa -= amountPaisa;
  }

  get balance() {
    const rupees = this.#balancePaisa / 100;
    return `Rs ${rupees.toLocaleString("en-PK", { minimumFractionDigits: 2 })}`;
  }
}

const account = new BankAccount("Sara");
account.deposit(150000);
account.withdraw(25000);
console.log(account.owner, account.balance);

try {
  account.withdraw(999999);
} catch (error) {
  console.log("Refused:", error.message);
}
```

**Output:**

```text
Sara Rs 1,250.00
Refused: Insufficient funds
```

Walkthrough:

- `#balancePaisa` is a private field; nothing outside the class can read or change it.
- `#checkAmount` is a **private method** — the `#` works on methods too. It keeps the validation in one place, used by both `deposit` and `withdraw`.
- `withdraw` checks for sufficient funds before changing anything, so a refused withdrawal leaves the balance untouched.
- `balance` is a getter that formats for display; the stored value stays in paisa.
- The `try { ... } catch (error) { ... }` block runs code that might throw, and catches the error so the program can continue. You will learn it properly in {{ch:errors-and-debugging}}; here it lets us show the refusal.

**Common wrong approach:** a public `balancePaisa` property. Then any code anywhere can write `account.balancePaisa = -5000`, and none of the rules mean anything.

</details>

### Exercise 3 — Shapes with polymorphism

**Objective:** practise inheritance, overriding and `super`.

**What to build:** a base class `Shape` with a `name` and a method `describe()` that returns `"<name> with area <area>"`, using an `area()` method. Subclasses `Rectangle(width, height)` and `Circle(radius)` override `area()`. Put several shapes in an array and print each description. Round areas to two decimal places.

<details>
<summary>Show the solution</summary>

```js
class Shape {
  constructor(name) {
    this.name = name;
  }

  area() {
    throw new Error(`${this.name} must implement area()`);
  }

  describe() {
    return `${this.name} with area ${this.area().toFixed(2)}`;
  }
}

class Rectangle extends Shape {
  constructor(width, height) {
    super("Rectangle");
    this.width = width;
    this.height = height;
  }

  area() {
    return this.width * this.height;
  }
}

class Circle extends Shape {
  constructor(radius) {
    super("Circle");
    this.radius = radius;
  }

  area() {
    return Math.PI * this.radius ** 2;
  }
}

const shapes = [new Rectangle(3, 4), new Circle(1), new Rectangle(2.5, 2)];
for (const shape of shapes) {
  console.log(shape.describe());
}
```

**Output:**

```text
Rectangle with area 12.00
Circle with area 3.14
Rectangle with area 5.00
```

Walkthrough:

- `Shape.describe()` calls `this.area()`. Which `area` runs depends on the actual object — polymorphism. The base class does not know about rectangles or circles at all.
- The base `area()` throws a clear error. This makes `Shape` behave like an **abstract** class: a subclass that forgets to implement `area` fails loudly rather than producing a wrong number.
- `Math.PI` is the built-in value of π; `this.radius ** 2` is the radius squared.

**Common wrong approach:** writing `describe()` in the base class with an `if` checking `this.name === "Circle"` and so on. Then every new shape requires editing the base class — exactly what polymorphism avoids.

</details>

### Exercise 4 — Fix the timer bug (debugging)

**Objective:** practise diagnosing and fixing lost `this`.

**The scenario:** this class should print a reminder message with the shop name for each pending order. It crashes.

```js
class ReminderService {
  shopName = "Ali's Shoe Corner";

  formatReminder(orderId) {
    return `${this.shopName}: your order ${orderId} is waiting for payment`;
  }

  remindAll(orderIds) {
    return orderIds.map(this.formatReminder);
  }
}

const service = new ReminderService();
console.log(service.remindAll(["ORD-1", "ORD-2"]));
```

**What to do:** explain the error and fix it in two different ways.

<details>
<summary>Show the solution</summary>

**The error:**

```text
TypeError: Cannot read properties of undefined (reading 'shopName')
```

**Why:** `orderIds.map(this.formatReminder)` passes the **function** `formatReminder` to `map`, detached from the instance. `map` calls it as a plain function, so inside it `this` is `undefined` (class code is strict), and `this.shopName` fails.

**Fix 1 — arrow at the call site:**

```js
remindAll(orderIds) {
  return orderIds.map((orderId) => this.formatReminder(orderId));
}
```

The arrow function uses `remindAll`'s `this` (the instance), and calls `formatReminder` as a method on it.

**Fix 2 — arrow-function field:**

```js
formatReminder = (orderId) =>
  `${this.shopName}: your order ${orderId} is waiting for payment`;
```

Now `formatReminder` is created per instance with `this` permanently set, so `orderIds.map(this.formatReminder)` works unchanged.

**Output (either fix):**

```text
[
  "Ali's Shoe Corner: your order ORD-1 is waiting for payment",
  "Ali's Shoe Corner: your order ORD-2 is waiting for payment"
]
```

(Node.js uses double quotes when printing these strings, because they contain an apostrophe.)

**Which is better?** Fix 1 is usually preferred: it is explicit at the point of use, and the method stays on the shared prototype. Fix 2 is convenient when a method is passed around a lot — for example, as an event handler in a frontend component.

**Common wrong approach:** removing `this` and writing `shopName` alone. That looks for a *variable* named `shopName` in scope, finds none, and throws `ReferenceError` — class fields are properties of the instance, reachable only through `this`.

</details>

## Summary

**`this`** is decided by **how a function is called**: with `new`, it is the new object; with `call`/`apply`/`bind`, it is the object you choose; in a method call `obj.fn()`, it is the object before the dot; in a plain call, it is `undefined` in strict mode. **Arrow functions** have no own `this` and use the `this` of the code around where they are written (**lexical `this`**). Passing a method as a callback detaches it and **loses `this`** — fix with an arrow wrapper, `bind`, or an arrow-function field.

Every object is linked to a **prototype**, and property lookups follow the **prototype chain** until a match or `null`. Built-in methods live on shared prototypes such as `Array.prototype`. `Object.create` links objects explicitly. **`new`** creates an object, links it to the constructor's `prototype`, runs the constructor with `this` as the new object, and returns it. Never modify built-in prototypes.

**Classes** are syntactic sugar over constructors and prototypes. They have a **constructor**, **methods** on the prototype, **class fields**, **private fields and methods** (`#`), **getters and setters**, and **static** members. **`extends`** creates subclasses; **`super()`** must be called before `this` in a subclass constructor; **`super.method()`** reuses a parent's method. **Overriding** plus a shared interface gives **polymorphism**. Extending `Error` creates **custom errors**.

Use plain objects for data that travels; use classes for behaviour with rules to protect, for polymorphic families, and where frameworks expect them. Keep hierarchies shallow and prefer composition.

## Key terms

- **`this`** — A keyword whose value, inside a normal function, is decided by how the function is called.
- **Method call** — Calling a function as a property of an object (`obj.fn()`), which makes `this` that object.
- **Plain call** — Calling a function on its own (`fn()`), which makes `this` `undefined` in strict mode.
- **`call` / `apply`** — Function methods that run a function immediately with a chosen `this`; `apply` takes the arguments as an array.
- **`bind`** — A function method that returns a new function with `this` permanently fixed.
- **Lexical `this`** — The behaviour of arrow functions, which use the `this` of the code where they are written.
- **Lost `this`** — The bug where a method, detached from its object (often by being passed as a callback), runs with `this` as `undefined`.
- **Prototype** — The object another object is linked to, from which it inherits properties and methods.
- **Prototype chain** — The sequence of linked prototypes JavaScript searches when looking up a property.
- **`Object.getPrototypeOf`** — A function that returns an object's prototype.
- **`Object.create`** — A function that creates a new object with a chosen prototype.
- **Constructor function** — A function intended to be called with `new` to create objects, named in PascalCase by convention.
- **`new`** — A keyword that creates a new object, links it to a constructor's prototype, runs the constructor with `this` as the new object, and returns it.
- **Class** — A template for creating objects with shared structure and behaviour; syntactic sugar over constructors and prototypes.
- **Instance** — An object created from a class.
- **Constructor (class)** — The special method that runs when a new instance is created, setting up its data.
- **Class field** — A property declared directly in a class body, created on each instance.
- **Private field / private method** — A class member whose name starts with `#`, usable only by code inside the class.
- **Getter** — A method used like a property, run when the property is read.
- **Setter** — A method run when a property is assigned, often used to check the new value.
- **Static member** — A property or method that belongs to the class itself rather than to its instances.
- **Syntactic sugar** — Syntax that makes something easier to write without changing what it does underneath.
- **Inheritance** — A relationship in which one class receives the properties and methods of another.
- **Superclass (parent class)** — The class being extended.
- **Subclass (child class)** — A class that extends another class.
- **`extends`** — The keyword that makes one class a subclass of another.
- **`super`** — A keyword used in a subclass to call the parent's constructor (`super(...)`) or methods (`super.method()`).
- **Overriding** — Providing a subclass's own version of a method that the parent also has.
- **Polymorphism** — The ability of different kinds of objects to respond to the same method call in their own ways.
- **Abstract class** — A class meant only to be extended, not used directly, often with methods subclasses must implement.
- **`instanceof`** — An operator that checks whether an object has a class's prototype in its prototype chain.
- **Custom error** — An error class created by extending `Error`, to represent a specific kind of failure.
- **Composition** — Building objects that contain other objects providing the behaviour they need, as an alternative to inheritance.
- **Dependency injection** — Giving an object the other objects it depends on (usually through its constructor) rather than having it create them itself.

## What comes next

Several exercises in this chapter used `throw`, `new Error(...)` and `try ... catch` without explaining them fully. That is because errors deserve a chapter of their own. Every real program meets problems — invalid input, missing files, failed network calls, bugs — and how a program **reports**, **handles** and **recovers from** them separates fragile software from reliable software.

In the next chapter, **Errors, Exceptions and Debugging**, you will learn how errors work in JavaScript, how to throw and catch them properly, how to read stack traces, and how to use a real debugger to pause a running program and look inside it — the most powerful debugging tool you will ever use.
