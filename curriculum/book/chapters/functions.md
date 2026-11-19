# Functions: Naming and Reusing Work

> [!GOALS]
> - What a function is, and the problems functions solve: repetition, readability and change.
> - How to define a function, call it, give it inputs (parameters) and get a result back (`return`).
> - The crucial difference between **returning** a value and **printing** it.
> - How `return` ends a function early, and how guard clauses keep code flat and readable.
> - Default parameter values, and what happens when you pass too few or too many arguments.
> - The three ways to write functions in JavaScript: declarations, expressions and arrow functions.
> - That functions are values: they can be stored in variables and passed to other functions.
> - What happens inside the computer when one function calls another — the call stack.
> - What makes a function good: one job, a clear name, few inputs, and no surprising side effects.

## Why this matters

Look back at the programs you have written. The delivery-fee rule appeared in several examples. Formatting a price — divide by 100, two decimal places, "Rs" in front — appeared again and again. In a real shop, the same calculations are needed in the basket, at checkout, on the invoice, in the confirmation email and in the mobile app.

If each place has its own copy of the code, three things go wrong:

1. **Changes get missed.** When the delivery fee changes from 250 to 300, someone updates four copies and misses the fifth. Now the basket and the invoice disagree.
2. **Code becomes unreadable.** A 400-line block of decisions and loops is impossible to understand at a glance.
3. **Bugs multiply.** A mistake in copied code exists in every copy.

**Functions** solve all three. A function lets you write a piece of logic **once**, give it a **name**, and **use it** anywhere by that name. Change it in one place, and every user of it changes. Read `calculateDeliveryFee(total)` and you know what that line does without reading the logic inside.

Functions are the most important organising tool in programming. Nearly everything else in this book — objects, classes, frameworks, servers — is built from them.

## The simple idea

You already use functions without writing them. `console.log`, `Math.round`, `Number` and `"text".toUpperCase()` are all functions somebody else wrote. You give them something, and they do a job — sometimes giving something back:

```text
         input                FUNCTION                 output
   4.6  ---------->   [  Math.round  ]   ---------->     5
```

> [!ANALOGY]
> A function is like a recipe card. The card has a name ("Chicken karahi"), a list of ingredients it needs (the inputs), steps to follow, and a finished dish at the end (the output). Once the card is written, anyone can cook the dish just by asking for it by name and handing over the ingredients — they do not need to remember the steps.
>
> **Where the analogy breaks:** a cook might adjust a recipe to taste. A function follows its steps exactly, every time. And a function can be "cooked" millions of times per second, with different ingredients each time, which no kitchen can do.

## The proper definition and key words

- A **function** is a named, reusable block of code that performs a task. It can receive input values and can produce an output value.
- **Defining** (or **declaring**) a function means writing it — its name, its inputs and its steps. Defining a function does **not** run it.
- **Calling** (or **invoking**) a function means running it. You call a function by writing its name followed by round brackets.
- **Parameters** are the names a function uses for its inputs, listed in its definition.
- **Arguments** are the actual values passed in when the function is called.
- The **return value** is the value a function gives back to the code that called it.
- The **function body** is the block of code inside the function.

## Defining and calling a function

### Level 1 — A function with no inputs

```js
function printDivider() {
  console.log("--------------------");
}

printDivider();
console.log("Order summary");
printDivider();
```

**Output:**

```text
--------------------
Order summary
--------------------
```

Walkthrough:

- `function` is the keyword that starts a function definition.
- `printDivider` is the function's name. Function names follow the same rules as variable names ({{ch:first-program}}) and are written in camelCase. They usually **start with a verb**, because a function *does* something: `print`, `calculate`, `format`, `send`, `is`, `get`.
- `()` — the empty round brackets mean this function takes no inputs.
- `{ ... }` is the function body: the code that runs each time the function is called.
- `printDivider();` **calls** the function. The brackets are what make it run.

Here is the order in which things happen:

```text
  1. The definition is read. Nothing is printed yet —
     JavaScript just remembers "printDivider means: print a line".
  2. printDivider()            -> jump into the function, print the line, come back
  3. console.log("Order...")   -> print the heading
  4. printDivider()            -> jump in again, print the line, come back
```

**Defining a function does not run it.** The steps inside only run when, and each time, the function is called.

### Level 2 — Inputs: parameters and arguments

Most functions need inputs. You list **parameters** inside the brackets of the definition:

```js
function greet(name) {
  console.log(`Hello, ${name}!`);
}

greet("Sara");
greet("Bilal");
```

**Output:**

```text
Hello, Sara!
Hello, Bilal!
```

Walkthrough:

- `name` is a **parameter**: a variable that exists inside the function and holds whatever value is passed in.
- `greet("Sara")` calls the function with the **argument** `"Sara"`. For this call, `name` refers to `"Sara"`.
- `greet("Bilal")` calls it again with a different argument. This time `name` refers to `"Bilal"`.

The words are easily mixed up, so here they are side by side:

```text
  function greet(name) {        <- "name" is a PARAMETER: a placeholder name
    ...
  }

  greet("Sara");                <- "Sara" is an ARGUMENT: the actual value
```

A parameter is like a labelled empty slot on the recipe card ("flour: ___"). An argument is what you actually put in the slot when you cook ("2 cups").

A function can have several parameters, separated by commas. Arguments are matched to parameters **by position** — the first argument goes to the first parameter, the second to the second:

```js
function describeItem(name, priceInRupees, quantity) {
  console.log(`${quantity} x ${name} at Rs ${priceInRupees}`);
}

describeItem("Cotton shirt", 1300, 2);
```

**Output:**

```text
2 x Cotton shirt at Rs 1300
```

`"Cotton shirt"` goes to `name`, `1300` to `priceInRupees`, and `2` to `quantity`. If you passed them in a different order, they would land in the wrong parameters — JavaScript has no way to know you meant otherwise.

### Level 3 — Outputs: `return`

So far our functions *print* things. Far more often, a function **calculates a value and gives it back** so the rest of the program can use it. That is what `return` does:

```js
function calculateDeliveryFee(basketTotal) {
  if (basketTotal >= 5000) {
    return 0;
  }
  return 250;
}

const fee = calculateDeliveryFee(3200);
console.log("Delivery fee:", fee);
console.log("Fee for a big order:", calculateDeliveryFee(8000));
```

**Output:**

```text
Delivery fee: 250
Fee for a big order: 0
```

Walkthrough:

- `return 0;` means "stop running this function, and give back the value 0 to whoever called it".
- `calculateDeliveryFee(3200)` is an **expression** (from {{ch:first-program}}): when it runs, it **becomes** the value the function returned. So the line `const fee = calculateDeliveryFee(3200);` works just like `const fee = 250;`.
- In the last line, the function call sits directly inside `console.log`. It is evaluated first, becoming `0`, and then `console.log` prints it.

```text
  const fee = calculateDeliveryFee(3200);
                       |
                       |  run the function with basketTotal = 3200
                       |  3200 >= 5000? no  ->  return 250
                       v
  const fee = 250;
```

The diagram shows the key idea: **a function call is replaced by the value it returns.**

### Returning is not the same as printing

This is the most important distinction in this chapter, and the source of endless beginner confusion.

```js
function addPrinting(a, b) {
  console.log(a + b);
}

function addReturning(a, b) {
  return a + b;
}

const x = addPrinting(2, 3);
const y = addReturning(2, 3);

console.log("x is", x);
console.log("y is", y);
```

**Output:**

```text
5
x is undefined
y is 5
```

Walkthrough:

- `addPrinting(2, 3)` **prints** 5 to the screen — that is the first line of output — but returns nothing. A function with no `return` gives back `undefined` (the "no value" value from {{ch:types-of-data}}). So `x` is `undefined`.
- `addReturning(2, 3)` prints nothing, but **returns** 5. So `y` is 5, and the program can use it — add it to a total, compare it, store it.

**Printing** shows a value to a human. **Returning** hands a value back to the program. A function that only prints its result is like a calculator that shows the answer on its screen but will not let you use it in the next calculation.

> [!TIP]
> As a rule, functions that **calculate** something should **return** the result and not print anything. Leave the decision about printing to the code that calls them. This makes the function useful everywhere — in a receipt, a web page, an email or a test — rather than only in the terminal. (This is why the browser console showed `undefined` after `console.log` in {{ch:from-code-to-running-program}}: `console.log` prints, and returns nothing.)

### `return` ends the function immediately

When a `return` statement runs, the function **stops right there**. Any code after it in the function does not run:

```js
function checkAge(age) {
  if (age < 18) {
    return "Too young to register";
  }
  console.log("This line runs only for adults");
  return "Registration allowed";
}

console.log(checkAge(15));
console.log(checkAge(30));
```

**Output:**

```text
Too young to register
This line runs only for adults
Registration allowed
```

For `checkAge(15)`, the first `return` runs, and the function ends — the `console.log` inside and the second `return` are never reached. For `checkAge(30)`, the `if` is skipped and the rest of the function runs.

This is also why, in `calculateDeliveryFee` above, we did not need an `else`: if the first `return` runs, the function has already ended, so the line `return 250;` can only be reached when the condition was false.

### Guard clauses

That observation leads to a powerful style for writing readable functions. A **guard clause** is an early `return` that handles a special, invalid or simple case **at the top** of the function, so the main logic below does not need to be wrapped in `if` blocks.

Without guard clauses, checks pile up into deep nesting:

```js
function calculateDiscount(total, couponCode) {
  if (total > 0) {
    if (couponCode) {
      if (couponCode === "SAVE10") {
        return total * 0.1;
      } else {
        return 0;
      }
    } else {
      return 0;
    }
  } else {
    return 0;
  }
}
```

With guard clauses, each special case is dealt with and dismissed immediately:

```js
function calculateDiscount(total, couponCode) {
  if (total <= 0) return 0;
  if (!couponCode) return 0;
  if (couponCode !== "SAVE10") return 0;

  return total * 0.1;
}

console.log(calculateDiscount(5000, "SAVE10"));
console.log(calculateDiscount(5000, "WRONG"));
console.log(calculateDiscount(5000));
```

**Output:**

```text
500
0
0
```

Both versions do the same thing. The second reads like a checklist: "no positive total — nothing. No code — nothing. Wrong code — nothing. Otherwise, 10 percent." The main calculation sits at the bottom, with no nesting at all.

> [!NOTE]
> Earlier, in {{ch:operators-and-decisions}}, you learned to always use braces with `if`. One-line guard clauses such as `if (total <= 0) return 0;` are the one widely accepted exception in many codebases, because the `return` makes it impossible to accidentally add a second line that seems to belong to the `if`. Many teams still prefer braces even here; follow whichever style your project uses.

The last call, `calculateDiscount(5000)`, passes only one argument. What happens to the missing one? That is next.

## Arguments: too few, too many, and defaults

JavaScript is relaxed about the number of arguments:

- **Too few:** any parameter without an argument gets the value `undefined`.
- **Too many:** extra arguments are simply ignored (unless the function asks for them, which you will learn in {{ch:arrays}}).

```js
function describe(name, city) {
  console.log(`${name} lives in ${city}`);
}

describe("Sara", "Karachi");
describe("Sara");
describe("Sara", "Karachi", "Pakistan");
```

**Output:**

```text
Sara lives in Karachi
Sara lives in undefined
Sara lives in Karachi
```

The second call shows the danger: no error, just a silently wrong result. That is why, in `calculateDiscount(5000)`, `couponCode` was `undefined` — which happened to be handled by the guard `if (!couponCode) return 0;`.

### Default parameter values

You can give a parameter a **default value**, used when no argument (or `undefined`) is passed:

```js
function calculateDeliveryFee(basketTotal, freeDeliveryThreshold = 5000, standardFee = 250) {
  if (basketTotal >= freeDeliveryThreshold) return 0;
  return standardFee;
}

console.log(calculateDeliveryFee(4000));
console.log(calculateDeliveryFee(4000, 3000));
console.log(calculateDeliveryFee(4000, 8000, 300));
```

**Output:**

```text
250
0
300
```

Walkthrough:

- `freeDeliveryThreshold = 5000` means "if no value is given, use 5000".
- The first call gives only the total, so both defaults are used: 4,000 is below 5,000, so the fee is 250.
- The second call overrides the threshold with 3,000: 4,000 is above it, so the fee is 0.
- The third call overrides both: below the 8,000 threshold, so the fee is the given 300.

Defaults make functions flexible while keeping the common case simple. Parameters with defaults usually go **last**, so callers can leave them out.

## Functions are values

Here is an idea that sounds strange at first but becomes central to modern JavaScript: **a function is a value**, just like a number or a string. It can be stored in a variable, passed to another function, and returned from a function. Programmers describe this by saying JavaScript has **first-class functions**.

### Function expressions

Because functions are values, you can create one and assign it to a variable:

```js
const formatPrice = function (paisa) {
  return `Rs ${(paisa / 100).toFixed(2)}`;
};

console.log(formatPrice(129950));
```

**Output:**

```text
Rs 1299.50
```

This is a **function expression**: the function itself has no name after the word `function`; instead, it is stored in the variable `formatPrice`, and called through that name. Notice the semicolon at the end — this is an ordinary `const` statement, assigning a value.

### Arrow functions

Modern JavaScript has a shorter way to write function expressions, called **arrow functions**, because of the `=>` symbol:

```js
const formatPrice = (paisa) => {
  return `Rs ${(paisa / 100).toFixed(2)}`;
};
```

Read `(paisa) => { ... }` as "a function that takes `paisa` and does this". The word `function` disappears, and `=>` separates the parameters from the body.

Arrow functions have two further shortcuts:

**1. If the body is a single expression, you can drop the braces and the word `return`.** The value of the expression is returned automatically — this is called an **implicit return**:

```js
const formatPrice = (paisa) => `Rs ${(paisa / 100).toFixed(2)}`;
```

**2. If there is exactly one parameter, the brackets around it are optional:**

```js
const double = n => n * 2;
const add = (a, b) => a + b;        // two parameters: brackets required
const sayHi = () => "Hi!";          // no parameters: empty brackets required

console.log(double(21), add(2, 3), sayHi());
```

**Output:**

```text
42 5 Hi!
```

> [!WARNING]
> The implicit return only happens **without braces**. This is a common mistake:
>
> ```js
> const double = (n) => { n * 2 };
> console.log(double(21));    // undefined
> ```
>
> With braces, the body is a normal block, and a normal block needs an explicit `return`. Without one, the function returns `undefined`. Either write `(n) => n * 2` or `(n) => { return n * 2; }`.

### Which form should you use?

| Form | Example | Typical use |
|---|---|---|
| **Function declaration** | `function calculateFee(total) { ... }` | Main, named functions of a file or module |
| **Arrow function** | `const calculateFee = (total) => { ... };` | Short functions; functions passed to other functions; widely used for everything in modern codebases |
| **Function expression** | `const calculateFee = function (total) { ... };` | Older code; less common today |

All three work, and you will see all three in real projects. One practical difference: a function **declaration** can be called from lines **above** where it is written in the file, because JavaScript sets up declarations before running any code (a behaviour called **hoisting**, explained fully in {{ch:scope-and-closures}}). A function stored in a `const` can only be used after the line that creates it, just like any other `const`.

There is one more important difference between arrow functions and the others, concerning a special word called `this`. It matters when functions belong to objects, and you will learn it in {{ch:this-prototypes-classes}}. Until then, both forms behave the same for everything in these chapters.

Many teams choose declarations for top-level named functions and arrows for short functions passed around. This book follows that style.

### Passing functions to functions

Because functions are values, you can give one function to another as an argument. This is used everywhere in JavaScript, so it is worth meeting now with a simple example:

```js
function applyToPrice(paisa, adjust) {
  const adjusted = adjust(paisa);
  return `Rs ${(adjusted / 100).toFixed(2)}`;
}

const withTax = (paisa) => paisa * 1.18;
const withDiscount = (paisa) => paisa * 0.9;

console.log(applyToPrice(100000, withTax));
console.log(applyToPrice(100000, withDiscount));
```

**Output:**

```text
Rs 1180.00
Rs 900.00
```

Walkthrough:

- `applyToPrice` takes two parameters: a price, and `adjust` — which is expected to be a **function**.
- Inside, `adjust(paisa)` **calls** whatever function was passed in.
- The first call passes `withTax`, so `adjust(paisa)` runs `withTax`: 100,000 × 1.18 = 118,000 paisa.
- The second call passes `withDiscount`: 100,000 × 0.9 = 90,000 paisa.
- Notice we pass `withTax` **without brackets**. `withTax` is the function itself; `withTax()` would *call* it immediately and pass its result instead.

A function passed to another function to be called by it is named a **callback**. A function that receives or returns other functions is called a **higher-order function**. You have already used callbacks without the name: the "framework calls your code" idea from {{ch:from-code-to-running-program}} is exactly this. They become essential in {{ch:arrays}} (where you will loop over lists with `map` and `filter`) and in {{ch:asynchronous-javascript}} (where the computer calls your function when slow work finishes).

## Variables inside functions

A variable created inside a function exists **only inside that function**, and only while that call is running. Each call gets its own fresh set:

```js
function calculateTotal(price, quantity) {
  const total = price * quantity;
  return total;
}

console.log(calculateTotal(500, 3));
console.log(total);
```

**Output:**

```text
1500
ReferenceError: total is not defined
```

`total` lives inside `calculateTotal`. Outside, it does not exist. Parameters behave the same way: `price` and `quantity` exist only inside the function.

This is a very good thing. It means a function's inner workings cannot accidentally collide with variables elsewhere in the program — two functions can both have a variable called `total` without interfering. The function is a sealed box with a clear way in (parameters) and a clear way out (`return`). You will study the exact rules, called **scope**, in {{ch:scope-and-closures}}.

A function *can* read and even change variables created **outside** it. But doing so has consequences, explained next.

## Pure functions and side effects

### Level 4 — What a function changes

Compare these two functions:

```js
// Version A
function addToTotalA(currentTotal, amount) {
  return currentTotal + amount;
}

// Version B
let runningTotal = 0;
function addToTotalB(amount) {
  runningTotal += amount;
  console.log("Total is now", runningTotal);
}
```

**Version A** only uses its inputs and only produces a return value. Call it with the same arguments and you always get the same answer, and nothing else in the program changes. This is called a **pure function**.

**Version B** changes a variable outside itself, and prints to the screen. Anything a function does besides returning a value — changing outside variables, printing, writing to a file or database, sending an email, making a network request — is called a **side effect**.

Side effects are not bad. They are the whole point of many programs: a shop that never saves an order or sends an email would be useless. But side effects make code **harder to reason about**:

- With pure functions, you can understand a function by reading only the function.
- With side effects, you must also know what else in the program touches the same variables, and in what order.
- Pure functions are easy to **test** ({{ch:testing}}): give inputs, check the output. Side effects require setting up and checking the outside world.

The professional approach is to **keep calculations pure, and push side effects to the edges** of the program — a few clearly named places that save, send or print — rather than scattering them through every function. A function called `calculateDeliveryFee` should calculate and return a fee, not also update a database and send an email. You will meet this idea again, more formally, in {{ch:functional-programming}}.

## How function calls work inside: the call stack

### Level 5 — Who called whom

When one function calls another, which calls another, how does the computer remember where to return to? It uses a structure called the **call stack**.

```js
function formatPrice(paisa) {
  return `Rs ${(paisa / 100).toFixed(2)}`;
}

function lineTotal(unitPricePaisa, quantity) {
  return unitPricePaisa * quantity;
}

function describeLine(name, unitPricePaisa, quantity) {
  const total = lineTotal(unitPricePaisa, quantity);
  return `${quantity} x ${name} = ${formatPrice(total)}`;
}

console.log(describeLine("Cap", 49900, 2));
```

**Output:**

```text
2 x Cap = Rs 998.00
```

The call stack is like a stack of plates: you can only add a plate on top, and only remove the top plate. Each time a function is called, a new "plate" — called a **stack frame** — is put on top, holding that call's parameters, its local variables and where to return to. When the function returns, its frame is removed, and execution continues in the function underneath.

```text
 1. describeLine called          2. it calls lineTotal         3. lineTotal returns 99800
 +--------------------+         +--------------------+         +--------------------+
 |                    |         | lineTotal          |  <-top  |                    |
 |                    |         |  49900, 2          |         |                    |
 +--------------------+         +--------------------+         +--------------------+
 | describeLine       |  <-top  | describeLine       |         | describeLine       | <-top
 |  "Cap", 49900, 2   |         |  (waiting)         |         |  total = 99800     |
 +--------------------+         +--------------------+         +--------------------+
 | (main program)     |         | (main program)     |         | (main program)     |
 +--------------------+         +--------------------+         +--------------------+

 4. it calls formatPrice         5. formatPrice returns,       6. describeLine returns
                                    describeLine finishes         its text; console.log
 +--------------------+                                           prints it
 | formatPrice  99800 |  <-top
 +--------------------+
 | describeLine       |
 +--------------------+
 | (main program)     |
 +--------------------+
```

Follow the pictures from 1 to 6. At each moment, only the **top** frame is running; the frames underneath are paused, waiting for the one above to return. When `lineTotal` returns, its frame disappears, and `describeLine` continues exactly where it paused, with the returned value.

You will see the call stack directly when errors happen. An error message includes a **stack trace** — the list of functions that were on the stack at the moment of the error, newest first:

```text
TypeError: Cannot read properties of undefined (reading 'toFixed')
    at formatPrice (C:\code\learning-javascript\shop.js:2:31)
    at describeLine (C:\code\learning-javascript\shop.js:11:39)
    at Object.<anonymous> (C:\code\learning-javascript\shop.js:14:13)
```

Read it from the top: the error happened in `formatPrice`, on line 2, column 31; `formatPrice` was called by `describeLine` on line 11; which was called by the main program on line 14. A stack trace tells you not just *where* something broke, but *how the program got there*. {{ch:errors-and-debugging}} teaches you to read them in detail.

> [!INSIDE]
> The call stack has a limited size. If functions keep calling functions without ever returning — most often a function that calls **itself** with no way to stop — the stack fills up, and JavaScript stops with `RangeError: Maximum call stack size exceeded`. This is called a **stack overflow** (and it is where the famous programming question-and-answer website got its name). A function calling itself is called **recursion**; used correctly, with a stopping condition, it is a powerful technique that you will learn in {{ch:recursion-sorting-searching}}.

## What makes a good function

Writing functions that work is the start. Writing functions that a team can understand, test and change for years is the skill.

**1. One job.** A function should do one thing, and its name should say what that is. If you need the word "and" to describe it — "calculates the total *and* saves the order *and* emails the customer" — it should probably be several functions. Small, focused functions are easier to name, test and reuse.

**2. A name that says what it does.** Start with a verb: `calculateDeliveryFee`, `formatPrice`, `sendReceiptEmail`. Functions returning true/false read best as questions: `isValidEmail`, `hasStock`, `canCancelOrder`. A reader should be able to guess what the function does — and what it returns — from the name alone.

**3. Few parameters.** One to three is comfortable. With five or six, callers mix up the order (was it price then quantity, or quantity then price?). In {{ch:objects}} you will learn to pass a single object with named fields instead, which solves this.

**4. Return values rather than printing.** As discussed above.

**5. Prefer purity; make side effects obvious.** Calculations should be pure. Functions with side effects should have names that admit it: `saveOrder`, `sendEmail`, `logError`.

**6. Short.** There is no strict rule, but a function you cannot see on one screen is usually doing too much.

### Documenting a function

For functions that others will use, a short comment above the function describing its purpose, parameters and return value is very helpful. JavaScript developers use a standard format called **JSDoc**:

```js
/**
 * Calculates the delivery fee for a basket.
 *
 * @param {number} basketTotalPaisa - The basket total, in paisa.
 * @param {boolean} isRemoteArea - Whether the address is in a remote area.
 * @returns {number} The delivery fee, in paisa.
 */
function calculateDeliveryFee(basketTotalPaisa, isRemoteArea) {
  if (isRemoteArea) return 40000;
  if (basketTotalPaisa >= 500000) return 0;
  return 25000;
}
```

The comment starts with `/**` (two stars). Lines starting with `@param` describe each parameter — its type in braces, its name, and a description — and `@returns` describes the return value. VS Code reads these comments and shows them when you hover over the function anywhere it is used. When you learn TypeScript ({{ch:typescript-basics}}), much of this information moves into the code itself, checked automatically.

## From beginner to enterprise: functions at every level

**Level 3 — A small program.** You extract repeated code — formatting prices, calculating fees — into functions in the same file, and call them where needed.

**Level 4 — A real application.** An online shop's business rules live in well-named functions — `calculateDeliveryFee`, `applyCoupon`, `calculateTax` — used by the basket page, checkout, invoices and emails alike. A rule changes in one place and is correct everywhere. Functions are grouped into separate files by topic, called **modules** ({{ch:modules-and-npm}}).

**Level 5 — Professional engineering.** Teams keep business logic in **pure functions**, separate from the code that talks to databases, networks and users. That makes the logic easy to test thoroughly — every boundary of the delivery rule can be checked in milliseconds without a database. Functions have clear names, documented parameters, and are reviewed for doing one job. Frameworks such as Express and NestJS ({{ch:express}}, {{ch:nestjs-basics}}) are built around your functions: you write a function for each kind of request, and the framework calls it.

**Level 6 — Enterprise.** In large systems, a "function" can be an entire deployed unit. **Serverless** platforms such as AWS Lambda ({{ch:lambda}}) run a single function in the cloud each time an event happens — an image is uploaded, a payment arrives — scaling automatically from zero to thousands of simultaneous calls. Shared functions used across many teams are published as internal **libraries**, versioned carefully, because a change in one function might affect hundreds of services. The principles stay the same: clear inputs, clear outputs, one job, controlled side effects.

## Real-world use cases

### Beginner level — A unit converter

**Situation:** a learner wants to convert temperatures between Celsius and Fahrenheit in several places in a program.

**Solution:** two small pure functions, `celsiusToFahrenheit(c)` and `fahrenheitToCelsius(f)`, each returning the converted value.

**Lesson:** a formula written once, named clearly, and reused — no chance of typing it slightly differently in two places.

### Intermediate level — One fee rule for web and mobile

**Business problem:** an online shop's website and its mobile app showed different delivery fees for the same basket, because each had its own copy of the rules.

**Solution:** the fee rules move into one backend function, `calculateDeliveryFee`, and both the website and the app ask the backend for the fee through the API ({{ch:how-the-web-works}}).

**Reasoning:** a single source of truth. The backend function is the only place the rule exists.

**Trade-off:** the app now needs a network call to show the fee, which adds a little delay; the business decides consistency is worth it.

### Advanced level — Making a pricing engine testable

**Business problem:** a SaaS company's pricing has grown complicated — plans, seats, annual discounts, regional taxes — and every change risks breaking something.

**Technical problem:** the pricing logic is tangled with database reads and email sending inside one 600-line function, so it cannot be tested without a real database.

**Solution:** split it into small pure functions (`basePrice`, `seatPrice`, `applyAnnualDiscount`, `applyRegionalTax`), each tested thoroughly at its boundaries, and one thin outer function that loads data, calls them, and saves the result.

**Advantages:** each rule can be checked alone in milliseconds; changes are safer; new engineers can understand one piece at a time.

**Disadvantages:** more functions to name and navigate. Split too finely, code becomes a maze of tiny pieces. The skill is finding the natural boundaries.

### Enterprise level — Image processing with serverless functions

**Business problem (illustrative):** an e-commerce marketplace receives hundreds of thousands of product photos a day, each needing thumbnails in several sizes.

**Solution:** each upload triggers a serverless function that creates the thumbnails. The cloud provider runs as many copies as needed in parallel and charges only for the time they run.

**Advantages:** no servers to manage; automatic scaling for busy periods.

**Disadvantages and failure scenarios:** each function call has limits on how long it may run and how much memory it may use; a sudden flood of uploads can multiply costs; failures must be retried safely without creating duplicate thumbnails. The function is still a function — inputs, work, outputs — but running at enormous scale raises new design questions you will meet in Part X.

## Common mistakes

### Beginner mistake — Forgetting to call the function

**What it looks like:** `console.log(calculateDeliveryFee);` — no brackets.

**What happens:** it prints the function itself, something like `[Function: calculateDeliveryFee]`, instead of a fee.

**How to fix it:** add brackets and arguments: `calculateDeliveryFee(3200)`.

### Beginner mistake — Printing instead of returning

**What it looks like:** a function that `console.log`s its result, and a caller that gets `undefined`.

**How to spot it:** the right value appears on screen, but variables holding the result are `undefined`.

**How to fix it:** `return` the value; let the caller decide whether to print it.

### Beginner mistake — Forgetting `return`

**What it looks like:**

```js
function lineTotal(price, quantity) {
  price * quantity;
}
```

**What happens:** the multiplication is calculated and thrown away; the function returns `undefined`. Later arithmetic gives `NaN`.

**How to fix it:** `return price * quantity;`. Watch especially for arrow functions with braces, which need an explicit `return`.

### Intermediate mistake — Arguments in the wrong order

**What it looks like:** `describeItem(2, "Cotton shirt", 1300)` for a function defined as `describeItem(name, price, quantity)`.

**What happens:** each value lands in the wrong parameter — no error, just wrong results.

**How to prevent it:** keep parameter lists short; for more than two or three inputs, pass an object with named fields ({{ch:objects}}); use TypeScript, which catches many such mistakes.

### Intermediate mistake — Hidden side effects

**What it looks like:** a function named `calculateTotal` that also changes a global variable, saves to a database or sends an email.

**What happens:** calling it "just to check the total" changes data unexpectedly; behaviour depends on how many times and in what order it was called.

**How to prevent it:** keep calculations pure; give side-effecting functions names that say what they do.

### Production mistake — Copy-pasted logic instead of a shared function

**What it looks like:** the same rule implemented in several places that slowly drift apart.

**What happens:** customers see different prices in different parts of the product; support and finance teams cannot explain the differences.

**How to prevent it:** one function per business rule, used everywhere — the "don't repeat yourself" principle, often called **DRY**.

### Enterprise mistake — Changing a widely used function carelessly

**What it looks like:** changing what a shared function returns, or the order of its parameters, without checking who calls it.

**What happens:** dozens of callers across the codebase — or other teams' services — break at once.

**How to prevent it:** search for all callers before changing a function's contract; add new parameters with defaults rather than changing existing ones; cover shared functions with tests; and for shared libraries, use version numbers so callers upgrade deliberately ({{ch:modules-and-npm}}).

## Debugging and troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Result is `undefined` | Missing `return`, arrow function with braces but no `return`, or the function prints instead of returning | Add `return` |
| `[Function: name]` printed | Function referenced without calling it | Add `()` |
| `TypeError: X is not a function` | Calling something that is not a function — a misspelt name, or a variable holding a value instead of a function | Check the name and what the variable holds (`typeof`) |
| `ReferenceError: X is not defined` | Function name misspelt, or a variable from inside a function used outside it | Check spelling and where the variable was created |
| `Cannot access 'X' before initialization` | An arrow function or function expression stored in `const` is called above the line that creates it | Move the call below, or use a function declaration |
| `NaN` from a calculation | An argument is missing (`undefined`) or the wrong type | Log the parameters at the start of the function |
| `RangeError: Maximum call stack size exceeded` | A function calls itself (directly or indirectly) without stopping | Find the recursion and add a stopping condition |

> [!TIP]
> When a function returns the wrong thing, log **what goes in and what comes out**: put `console.log("in:", a, b);` at the start of the function and `console.log("out:", result);` just before the `return`. If the inputs are wrong, the bug is in the caller. If the inputs are right and the output is wrong, the bug is inside the function. This one technique halves the search space immediately.

## How a senior engineer thinks about functions

> [!SENIOR]
> Experienced engineers think of a function as a **contract**: given these inputs, it promises this output — and nothing surprising besides. When designing one, they ask:
>
> - **What is the one job?** If the name needs "and", split it.
> - **What does it need, and what does it give back?** As few inputs as possible, with clear types and units; a clear return value.
> - **What can it change?** Pure where possible. If it saves, sends or prints, the name says so.
> - **What happens with bad input?** Missing arguments, wrong types, negative numbers — guard clauses at the top handle them explicitly.
> - **Who calls it?** Before changing a function, they find every caller. A function used in forty places is part of forty features.
> - **Is this abstraction earning its keep?** They extract a function when it removes real repetition or gives a meaningful name to a step — not to create layers for their own sake. Three slightly different, clear pieces of code can be better than one function full of options trying to serve them all.

## Exercises

### Exercise 1 — A price formatter

**Objective:** practise writing a function that returns a value.

**What to build:** a function `formatPrice(paisa)` that returns a string such as `"Rs 1,299.50"` for 129950. Use it to print three prices.

**Hints:** divide by 100 for rupees. `toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })` formats a number with thousands separators and exactly two decimals. (The curly braces pass options as an object, which you will learn in {{ch:objects}}.)

<details>
<summary>Show the solution</summary>

```js
function formatPrice(paisa) {
  const rupees = paisa / 100;
  const formatted = rupees.toLocaleString("en-PK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `Rs ${formatted}`;
}

console.log(formatPrice(129950));
console.log(formatPrice(5000));
console.log(formatPrice(123456789));
```

**Output:**

```text
Rs 1,299.50
Rs 50.00
Rs 1,234,567.89
```

Walkthrough:

- The function takes one parameter, `paisa`, and **returns** the formatted text. It does not print anything itself; the caller decides to print.
- `paisa / 100` converts to rupees — the only place the conversion happens, so it cannot be done inconsistently elsewhere.
- `toLocaleString` with the two options always shows exactly two decimal places and adds separators.
- The template literal adds `"Rs "` in front.

**Common wrong approach:** writing `console.log(...)` inside the function instead of `return`. Then `const text = formatPrice(5000)` gives `undefined`, and the function cannot be used inside an email or a web page.

</details>

### Exercise 2 — Turn decisions into a function

**Objective:** practise parameters, guard clauses and defaults.

**What to build:** a function `calculateDeliveryFee(totalPaisa, isMember = false, isRemoteArea = false)` implementing the rules from {{ch:operators-and-decisions}} exercise 2 (remote areas pay 40,000 paisa; otherwise members, or orders of at least 500,000 paisa, pay 0; otherwise 25,000). Write it with guard clauses. Test all four cases from that exercise.

<details>
<summary>Show the solution</summary>

```js
function calculateDeliveryFee(totalPaisa, isMember = false, isRemoteArea = false) {
  if (isRemoteArea) return 40000;
  if (isMember) return 0;
  if (totalPaisa >= 500000) return 0;
  return 25000;
}

console.log(calculateDeliveryFee(1000000, true, true));  // remote member
console.log(calculateDeliveryFee(500000));               // non-member, exactly 5,000
console.log(calculateDeliveryFee(10000, true));          // member, small order
console.log(calculateDeliveryFee(499900));               // non-member, just below
```

**Output:**

```text
40000
0
0
25000
```

Walkthrough:

- Each rule is a guard clause, in priority order: the remote-area rule overrides everything, so it comes first.
- Defaults let callers omit `isMember` and `isRemoteArea` when they are false, which keeps the common calls short.
- The function is **pure**: same inputs, same output, nothing else changes. That makes it trivial to test, as the four lines show.
- All amounts are in paisa, following the money rule from {{ch:types-of-data}}.

**Common wrong approach:** putting the membership check before the remote-area check — the same ordering bug from the earlier chapter, now hidden inside a function. Moving code into a function does not make it correct; testing the boundaries does.

</details>

### Exercise 3 — Pass a function

**Objective:** practise functions as values and callbacks.

**What to build:** a function `repeatForEachCharacter(text, action)` that calls `action` once for each character of `text`, passing the character. Use it twice: once with an arrow function that prints each character in uppercase, and once with one that prints each character's position in the alphabet table (use `character.charCodeAt(0)`, which gives a character's number in the character table).

<details>
<summary>Show the solution</summary>

```js
function repeatForEachCharacter(text, action) {
  for (const character of text) {
    action(character);
  }
}

repeatForEachCharacter("abc", (character) => console.log(character.toUpperCase()));
repeatForEachCharacter("abc", (character) => console.log(character, character.charCodeAt(0)));
```

**Output:**

```text
A
B
C
a 97
b 98
c 99
```

Walkthrough:

- `repeatForEachCharacter` does not know or care *what* will be done with each character. It only knows *how to go through* the text, and calls `action` for each one.
- The first call passes an arrow function that prints the uppercase character.
- The second passes a different arrow function that prints the character and its code — 97 for `a`, matching the ASCII table from {{ch:what-a-computer-is}}.
- The arrow functions are written directly inside the call, without storing them in a variable first. This is extremely common in JavaScript.

This "loop here, decide what to do there" design is exactly how the array method `forEach` works, which you will meet in {{ch:arrays}}.

**Common wrong approach:** passing `console.log(character.toUpperCase())` as the second argument, without the arrow. That *calls* `console.log` immediately (where `character` does not even exist yet) and passes its result, `undefined`, instead of a function.

</details>

### Exercise 4 — Fix the function (debugging)

**Objective:** practise finding function bugs.

**The scenario:** this program should print `Order total: Rs 2,850.00`, but prints `Order total: Rs NaN`.

```js
const lineTotal = (pricePaisa, quantity) => {
  pricePaisa * quantity;
};

function orderTotal(shirtPaisa, shirtQty, capPaisa, capQty, deliveryPaisa) {
  return lineTotal(shirtPaisa, shirtQty) + lineTotal(capPaisa, capQty) + deliveryPaisa;
}

function formatPrice(paisa) {
  return `Rs ${(paisa / 100).toLocaleString("en-PK", { minimumFractionDigits: 2 })}`;
}

console.log("Order total:", formatPrice(orderTotal(100000, 2, 30000, 25000, 2)));
```

The order is 2 shirts at Rs 1,000, 2 caps at Rs 300, and Rs 250 delivery.

**What to do:** find both bugs, using the "log what goes in and what comes out" technique, and fix them.

<details>
<summary>Show the solution</summary>

**Investigation.** Logging inside `orderTotal` shows that each `lineTotal(...)` call returns `undefined`. `undefined + undefined + 25000` is `NaN`, which then spreads (from {{ch:types-of-data}}).

**Bug 1 — the arrow function has braces but no `return`.** With braces, the body is a normal block; the multiplication is calculated and thrown away. Fix: `(pricePaisa, quantity) => pricePaisa * quantity` (implicit return), or add `return`.

**After fixing bug 1**, the program prints `Order total: Rs 7,502,000.02` — no longer `NaN`, but absurdly large. So there is a second bug. Logging the parameters at the start of `orderTotal` shows:

```text
shirtPaisa 100000  shirtQty 2  capPaisa 30000  capQty 25000  deliveryPaisa 2
```

**Bug 2 — arguments in the wrong order.** The function expects `(shirtPaisa, shirtQty, capPaisa, capQty, deliveryPaisa)`, but the call passes the delivery fee (`25000`) fourth and the cap quantity (`2`) fifth. So the caps line becomes 30,000 × 25,000 = 750,000,000 paisa, and the delivery fee becomes 2 paisa. Swapping the last two arguments fixes it: 200,000 + 60,000 + 25,000 = 285,000 paisa = Rs 2,850.00.

**Fixed version:**

```js
const lineTotal = (pricePaisa, quantity) => pricePaisa * quantity;

function orderTotal(shirtPaisa, shirtQty, capPaisa, capQty, deliveryPaisa) {
  return lineTotal(shirtPaisa, shirtQty) + lineTotal(capPaisa, capQty) + deliveryPaisa;
}

function formatPrice(paisa) {
  return `Rs ${(paisa / 100).toLocaleString("en-PK", { minimumFractionDigits: 2 })}`;
}

console.log("Order total:", formatPrice(orderTotal(100000, 2, 30000, 2, 25000)));
```

**Output:**

```text
Order total: Rs 2,850.00
```

**Lessons:**

1. A missing `return` in an arrow function with braces produces `undefined`, which turns into `NaN` later — far from the real cause. Logging what each function returns finds it quickly.
2. With five positional parameters, it is very easy to pass values in the wrong order. Here the result was obviously wrong; with values of similar size, it might have looked plausible and reached customers. This function is a good candidate for receiving a single object with named fields — `{ shirtPaisa, shirtQty, ... }` — which you will learn in {{ch:objects}}.
3. When a fix gives a different wrong answer, you have found one bug, not all of them. Keep checking each value against what it should be.

</details>

## Summary

A **function** is a named, reusable block of code. **Defining** it does not run it; **calling** it with `()` does. **Parameters** are the input names in the definition; **arguments** are the values passed in, matched by position. Missing arguments become `undefined`; **default parameters** supply values instead.

**`return`** gives a value back to the caller and ends the function immediately; a function without `return` returns `undefined`. **Returning is not printing** — calculating functions should return, and let callers decide what to do with the result. **Guard clauses** handle special cases with early returns at the top, keeping the main logic flat.

Functions can be written as **declarations**, **function expressions** or **arrow functions**; arrows with a single expression and no braces **return implicitly**. Functions are **values** (first-class): they can be stored, passed as **callbacks** to **higher-order functions**, and returned. Variables inside a function exist only inside it.

A **pure function** depends only on its inputs and has no **side effects**; keep calculations pure and side effects at the edges. The **call stack** tracks which functions are running; **stack traces** show it when errors happen, and runaway recursion causes a **stack overflow**. Good functions do one job, have verb names, take few parameters and are documented — for example with **JSDoc**.

## Key terms

- **Function** — A named, reusable block of code that performs a task, optionally taking inputs and returning an output.
- **Defining a function** — Writing a function's name, parameters and body; this does not run it.
- **Calling (invoking) a function** — Running a function, by writing its name followed by round brackets.
- **Parameter** — A name listed in a function's definition that receives an input value when the function is called.
- **Argument** — An actual value passed to a function when it is called.
- **Function body** — The block of code inside a function.
- **Return value** — The value a function gives back to the code that called it.
- **`return`** — A statement that ends a function and gives back a value.
- **Guard clause** — An early `return` at the top of a function that handles a special or invalid case.
- **Default parameter** — A value a parameter takes when no argument (or `undefined`) is passed for it.
- **First-class functions** — The property of a language in which functions are values that can be stored, passed and returned.
- **Function declaration** — A function defined with the `function` keyword and a name, as a statement.
- **Function expression** — A function created as a value, usually stored in a variable.
- **Arrow function** — A shorter way to write a function expression, using `=>`.
- **Implicit return** — In an arrow function without braces, automatically returning the value of its single expression.
- **Hoisting** — JavaScript's behaviour of setting up declarations, such as function declarations, before running the code, so they can be used earlier in the file.
- **Callback** — A function passed to another function, to be called by it.
- **Higher-order function** — A function that receives other functions as arguments or returns a function.
- **Pure function** — A function whose result depends only on its inputs and which has no side effects.
- **Side effect** — Anything a function does besides returning a value, such as changing outside variables, printing, saving data or sending a request.
- **Call stack** — The structure that tracks which functions are currently running, with the most recently called on top.
- **Stack frame** — The record on the call stack for one function call, holding its parameters, local variables and return position.
- **Stack trace** — A list of the functions on the call stack at the moment of an error, shown in error messages.
- **Stack overflow** — An error caused by the call stack running out of space, usually because of runaway recursion.
- **Recursion** — A function calling itself.
- **JSDoc** — A standard comment format for documenting JavaScript functions, their parameters and return values.
- **DRY (Don't Repeat Yourself)** — The principle of keeping each piece of knowledge or logic in one place rather than copying it.
- **Serverless function** — A function run by a cloud provider in response to events, without the developer managing servers.

## What comes next

You can now store values, make decisions, repeat work and organise logic into reusable functions. But so far, each variable holds just one value. A real basket holds many items; a customer has many orders; a delivery route has many stops.

In the next chapter, **Arrays: Working with Lists**, you will learn to store many values in a single ordered list, add and remove items, loop through them, and use powerful array functions — `map`, `filter`, `find`, `reduce` and others — that combine everything you have learned about loops and functions into some of the most useful tools in JavaScript.
