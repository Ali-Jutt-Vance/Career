# Your First Program: Values, Variables and Output

> [!GOALS]
> - What a program is made of: statements, expressions and values.
> - How to show output with `console.log`, and its useful relatives.
> - What a variable is, why programs need them, and what actually happens in memory when you create one.
> - The difference between `let`, `const` and the older `var`, and which to use when.
> - How to name variables the way professional developers do.
> - How assignment works — why `=` does not mean "equals" — and how to update a variable's value.
> - How to write useful comments.
> - How to read and fix the first errors every beginner meets.

## Why this matters

Every program, from a calculator to a banking system, does the same basic thing: it works with **values** — numbers, pieces of text, true-or-false answers — and it needs to **remember** them while it works.

A shopping basket remembers the items you chose. A bank app remembers your balance. A game remembers your score. A delivery app remembers your address. Without a way to remember values and refer to them by name, a program could only do one calculation and immediately forget the result.

This chapter teaches the two most basic ideas in programming: **values** and **variables**. Everything else in this book is built on them. If you understand this chapter properly — not just the syntax, but what happens inside the computer — the rest of Part II will make sense far more easily.

## The simple idea

Imagine you are working out a shopping bill on paper.

You write down: *shoes 4,500; socks 600; delivery 250.* You add them: *total 5,350.* Then you notice a discount code for 10 percent, so you work out *discount 535*, and write *final total 4,815.*

Notice two things you did without thinking:

1. You worked with **values** — 4,500, 600, 250 and so on.
2. You gave values **names** — "total", "discount", "final total" — so you could refer to them later without recalculating them.

A program does exactly the same. The values are numbers, text and other kinds of data. The names are called **variables**.

```js
let shoes = 4500;
let socks = 600;
let delivery = 250;
let total = shoes + socks + delivery;
console.log(total);
```

**Output:**

```text
5350
```

Even without any explanation, you can probably guess what this does. That is the point of high-level languages, as you learned in {{ch:from-code-to-running-program}}: they read almost like a description of the work. The rest of this chapter explains every piece precisely.

## The proper definition and key words

- A **value** is a single piece of data: the number `4500`, the text `"Lahore"`, the answer `true`.
- A **literal** is a value written directly in your code. `4500` and `"Lahore"` are literals — you wrote the value itself, "literally".
- A **variable** is a **name** that refers to a value, so the program can remember the value and use it later.
- An **expression** is any piece of code that produces a value. `4500` is an expression. So is `shoes + socks`, and so is `total * 0.9`.
- A **statement** is a complete instruction — one step of the program. `let total = shoes + socks + delivery;` is a statement. A program is a list of statements.
- **Declaring** a variable means creating it — telling JavaScript "a variable with this name exists".
- **Assigning** a value means making a variable refer to that value.

The difference between an **expression** and a **statement** is worth understanding now, because it appears throughout programming:

```text
  let total = shoes + socks + delivery;
  \_____________________________________/   a STATEMENT: one complete step
              \______________________/      an EXPRESSION: produces a value
```

An expression is like a phrase that produces an answer ("shoes plus socks plus delivery"). A statement is like a complete sentence that does something ("let total be shoes plus socks plus delivery").

## How a program runs: top to bottom

Before learning variables, you need one simple but essential fact: **a program runs its statements one at a time, in order, from top to bottom.**

Create a file called `order.js` in your `learning-javascript` folder from {{ch:setting-up-your-workshop}}:

```js
console.log("First");
console.log("Second");
console.log("Third");
```

Run it with `node order.js`:

**Output:**

```text
First
Second
Third
```

Each statement finishes before the next one begins. This seems obvious, but it has an important consequence: **a line can only use what earlier lines have already created.** If line 5 needs a value, some line before it must have produced that value. Much beginner confusion comes from forgetting this order.

Later, you will learn ways to change the order — making decisions ({{ch:operators-and-decisions}}), repeating things ({{ch:loops}}), and waiting for slow work ({{ch:asynchronous-javascript}}). But the default is always: one statement after another, top to bottom.

### Statements and semicolons

Each statement in this book ends with a semicolon `;`, like a full stop at the end of a sentence.

JavaScript has a feature called **automatic semicolon insertion**: if you leave a semicolon out, the engine usually adds one for you at the end of the line. Because of this, some teams write JavaScript without semicolons. Both styles are common in real projects. This book always uses semicolons, because they make the end of each statement explicit and avoid a small number of confusing cases where the automatic insertion guesses wrongly. Whichever style a project uses, the formatter (Prettier, from {{ch:setting-up-your-workshop}}) applies it consistently.

## Showing output: `console.log` and friends

You have already used `console.log`. Let us understand it fully, because you will use it every day for the rest of your career.

`console.log` writes values to the **console** — the terminal when you run code with Node.js, or the developer tools console in a browser.

```js
console.log("Hello");
console.log(42);
console.log("Price:", 4500, "rupees");
console.log();
console.log("After an empty line");
```

**Output:**

```text
Hello
42
Price: 4500 rupees

After an empty line
```

Walkthrough:

- **Line 1** logs a piece of text. The quote marks show where the text begins and ends; they are not printed.
- **Line 2** logs a number. Numbers are written without quote marks.
- **Line 3** gives `console.log` **three values**, separated by commas. It prints them all on one line, with a single space between each. This is the easiest way to label a value: a piece of text, then the value.
- **Line 4** gives it nothing, so it prints an empty line — handy for spacing out output.
- **Line 5** prints more text after that empty line.

The values you put inside the brackets are called **arguments** — the same word you met for terminal commands in {{ch:the-terminal}}. You are "passing" these arguments to `console.log`, which uses them.

### Useful relatives of `console.log`

`console` has several other abilities. Three are worth knowing now:

```js
console.error("Something went wrong");
console.warn("This might be a problem");
console.table([
  { item: "shoes", price: 4500 },
  { item: "socks", price: 600 },
]);
```

**Output (in the terminal):**

```text
Something went wrong
This might be a problem
┌─────────┬─────────┬───────┐
│ (index) │ item    │ price │
├─────────┼─────────┼───────┤
│ 0       │ 'shoes' │ 4500  │
│ 1       │ 'socks' │ 600   │
└─────────┴─────────┴───────┘
```

- `console.error` writes a message as an **error**. In the terminal it looks the same, but it is sent to a separate output channel called **standard error**, which tools and servers treat differently from normal output (for example, collecting errors into separate logs). In a browser, it appears in red.
- `console.warn` writes a warning — yellow in a browser.
- `console.table` displays a list of records as a neat table. Do not worry about the square brackets and curly braces yet; they create a list of objects, which you will learn in {{ch:arrays}} and {{ch:objects}}. Just remember that this tool exists for later.

> [!NOTE]
> Programs have two output channels. **Standard output** (often written **stdout**) is for normal results; `console.log` writes there. **Standard error** (**stderr**) is for errors and diagnostics; `console.error` writes there. In the terminal both appear on screen, but they can be redirected separately — for example, `node app.js > results.txt` from {{ch:the-terminal}} saves standard output to a file, while errors still appear on screen. This separation matters a great deal on servers, where logs are collected automatically.

## Variables

### Level 1 — Labels on values

You saw the shopping-bill example: you wrote "total: 5,350" so you could refer to it later. A variable is exactly that — a name for a value.

```js
let city = "Lahore";
console.log(city);
```

**Output:**

```text
Lahore
```

Walkthrough:

- `let` is a **keyword** — a word with a special meaning in JavaScript. It means "create a new variable".
- `city` is the **name** we chose for the variable.
- `=` is the **assignment operator**. It means "make the name on the left refer to the value on the right".
- `"Lahore"` is the value — a piece of text.
- `;` ends the statement.
- On the next line, `console.log(city)` uses the variable. Notice there are **no quote marks** around `city`. Without quotes, JavaScript treats `city` as the name of a variable and looks up its value, `"Lahore"`. With quotes, `"city"` would just be the four letters c-i-t-y.

That last point is one of the first things beginners trip over, so here it is side by side:

```js
let city = "Lahore";
console.log(city);
console.log("city");
```

**Output:**

```text
Lahore
city
```

`city` means "the value of the variable called city". `"city"` means "the text c-i-t-y".

### Level 2 — What happens in memory

In {{ch:what-a-computer-is}} you learned that a running program keeps its data in **RAM**, a long row of numbered boxes, each with an **address**. When you write `let city = "Lahore";`, roughly this happens:

1. The JavaScript engine finds some free space in memory and stores the text `"Lahore"` there.
2. It records, in its own table of names for this part of the program, that the name `city` refers to that stored value.
3. When a later line mentions `city`, the engine looks the name up in its table, finds where the value is stored, and uses it.

```text
     NAMES (the engine's table)              MEMORY (RAM)
   +------------+--------------+          +-------------------+
   |  city      |  -------------------->  |  "Lahore"         |
   +------------+--------------+          +-------------------+
   |  price     |  -------------------->  |  4500             |
   +------------+--------------+          +-------------------+
```

The diagram shows names on the left, each pointing to a value stored in memory. You never deal with memory addresses yourself in JavaScript. The engine handles all of it. You only use names.

> [!ANALOGY]
> Two common ways to picture a variable:
>
> 1. **A labelled box.** The variable is a box with a name written on it, and the value sits inside the box.
> 2. **A name tag on a string.** The value exists on its own somewhere, and the variable is a label tied to it by a piece of string.
>
> The box picture is fine for simple numbers and text, and many teachers use it. The name-tag picture is **more accurate** for JavaScript, and it will save you from real confusion later: when you meet lists and objects ({{ch:arrays}}, {{ch:objects}}), two different name tags can be tied to the *same* value, and changing that value through one name changes what you see through the other. A box cannot be in two places at once; a value with two labels can.
>
> **Where both analogies break:** the engine may keep small numbers directly in its table rather than "somewhere else", copy values, or move them around in memory as it optimises. These are internal details you never see. What you can rely on is the *behaviour*: a name refers to a value, and you reach the value through the name.

### Level 3 — Changing a variable's value

A variable created with `let` can be made to refer to a **new** value later. This is called **reassignment**:

```js
let score = 0;
console.log("Start:", score);

score = 10;
console.log("After first level:", score);

score = 25;
console.log("After second level:", score);
```

**Output:**

```text
Start: 0
After first level: 10
After second level: 25
```

Walkthrough:

- **Line 1** declares `score` and assigns it the value `0`. `let` appears here because this is where the variable is **created**.
- **Line 2** prints it.
- **Line 4** assigns a **new** value, `10`. There is no `let` this time: the variable already exists, and we are only changing what it refers to. The old value `0` is no longer referred to by anything, so the engine will eventually free that memory automatically (this automatic clean-up is called **garbage collection**; you will learn how it works in {{ch:advanced-javascript}}).
- **Lines 5 to 8** do the same again with `25`.

The program runs top to bottom, so each `console.log` shows whatever `score` refers to **at that moment**.

### `=` does not mean "equals"

This is the most important idea in this section.

In mathematics, `x = x + 1` is nonsense — no number equals itself plus one. In JavaScript, it is perfectly normal and extremely common:

```js
let count = 5;
count = count + 1;
console.log(count);
```

**Output:**

```text
6
```

The reason is that `=` in JavaScript does **not** mean "is equal to". It means **"make the name on the left refer to the value on the right"**. And the right side is always worked out **first**.

So `count = count + 1;` runs in two steps:

```text
  count = count + 1;

  Step 1: work out the right side       count + 1  ->  5 + 1  ->  6
  Step 2: make the left side refer to it   count  ->  6
```

First, JavaScript evaluates `count + 1`. At that moment `count` is 5, so the result is 6. Then it makes `count` refer to 6.

Read `=` aloud as **"becomes"** or **"is set to"**: "count becomes count plus one". This habit removes a whole category of confusion. (JavaScript does have operators for checking whether two values are equal — `===` — and you will meet them in {{ch:operators-and-decisions}}.)

### Shortcuts for updating a variable

Updating a variable based on its own value is so common that JavaScript has shorter ways to write it:

| Long form | Short form | Meaning |
|---|---|---|
| `total = total + 250;` | `total += 250;` | add 250 |
| `total = total - 100;` | `total -= 100;` | subtract 100 |
| `total = total * 2;` | `total *= 2;` | multiply by 2 |
| `total = total / 4;` | `total /= 4;` | divide by 4 |
| `count = count + 1;` | `count++;` | add exactly 1 |
| `count = count - 1;` | `count--;` | subtract exactly 1 |

```js
let basketTotal = 4500;
basketTotal += 600;
basketTotal += 250;
console.log("Total:", basketTotal);

let itemsInBasket = 2;
itemsInBasket++;
console.log("Items:", itemsInBasket);
```

**Output:**

```text
Total: 5350
Items: 3
```

Walkthrough:

- `basketTotal += 600;` means "basketTotal becomes basketTotal plus 600": 4500 becomes 5100.
- `basketTotal += 250;` then makes it 5350.
- `itemsInBasket++;` adds exactly one: 2 becomes 3. The `++` operator is called **increment**; `--` is **decrement**. You will see `++` constantly in loops ({{ch:loops}}).

The short forms do exactly the same thing as the long forms. They are just quicker to write and, once familiar, quicker to read.

## `let`, `const` and `var`

JavaScript has three keywords for creating variables. Choosing correctly is part of writing professional code.

### `const` — a name that will not be reassigned

`const` (short for **constant**) creates a variable that **cannot be reassigned** after it is created:

```js
const vatRate = 0.18;
console.log(vatRate);

vatRate = 0.2;
```

**Output:**

```text
0.18
TypeError: Assignment to constant variable.
```

Walkthrough:

- `const vatRate = 0.18;` creates the variable and gives it its one and only value.
- The first `console.log` works normally.
- `vatRate = 0.2;` tries to make it refer to a new value. JavaScript refuses and stops the program with a `TypeError`. As you learned in {{ch:from-code-to-running-program}}, this is a **runtime error**: the grammar is fine, but the rule is broken when the line actually runs.

Because a `const` can never be reassigned, it **must** be given a value when it is created:

```js
const companyName;
```

**Output:**

```text
SyntaxError: Missing initializer in const declaration
```

This one is a **syntax error** — the engine rejects it while parsing, before anything runs. (An **initializer** is the `= value` part that gives a variable its first value.)

### `let` — a name that can be reassigned

`let` creates a variable that **can** be reassigned, as you have seen with `score` and `count`.

You can also create a `let` variable without a value:

```js
let deliveryDate;
console.log(deliveryDate);
deliveryDate = "Friday";
console.log(deliveryDate);
```

**Output:**

```text
undefined
Friday
```

Before it is assigned, the variable exists but refers to the special value `undefined`, which means "no value has been given yet". You will learn exactly what `undefined` is in {{ch:types-of-data}}.

### Which should you use?

The rule used by most professional teams is simple:

> **Use `const` by default. Use `let` only when you know the variable will need to be reassigned.**

Why prefer `const`? Because it tells every reader something useful. When a colleague sees `const vatRate`, they know immediately that it will refer to the same value everywhere in that part of the code; they do not have to search for places where it changes. When they see `let`, it signals "watch out — this one changes". Fewer things changing means fewer things to keep track of, and fewer bugs. Linters such as ESLint can even warn you when you used `let` for a variable that is never reassigned.

```js
const price = 4500;          // never changes in this calculation
const quantity = 3;          // never changes
let total = price * quantity; // will change: discount and delivery below
total -= 500;
total += 250;
console.log("Total:", total);
```

**Output:**

```text
Total: 13250
```

Here, `price` and `quantity` are fixed for this calculation, so they are `const`. `total` is adjusted twice, so it is `let`.

> [!WARNING]
> `const` means the **name** cannot be pointed at a different value. It does not always mean the value itself can never change. For simple values like numbers and text, the difference does not matter, because those values cannot be changed anyway. But for lists and objects, which you will meet in {{ch:arrays}} and {{ch:objects}}, a `const` list can still have items added to it. This surprises many developers, and you will see exactly why when we get there. For now, remember the precise meaning: **`const` prevents reassignment.**

### `var` — the old way

Before 2015, JavaScript had only one keyword for variables: `var`. You will see it in older code, tutorials and many existing company projects:

```js
var oldStyle = "still works";
console.log(oldStyle);
```

**Output:**

```text
still works
```

`var` works, but it has some confusing behaviours that caused real bugs for years: a `var` variable can be used before the line that creates it without an error, and it is not limited to the block of code it was created in. `let` and `const` were added to the language precisely to fix these problems. You will understand the details properly in {{ch:scope-and-closures}}, once you know about blocks and functions.

> **Rule: in new code, never use `var`.** Use `const`, or `let` when reassignment is needed. When you work on older code that uses `var`, recognise it, and understand that it behaves a little differently.

### Summary table

| | `const` | `let` | `var` |
|---|---|---|---|
| Can be reassigned? | No | Yes | Yes |
| Must have a value when created? | Yes | No | No |
| Use in new code? | **Yes — by default** | Yes — when the value must change | No (legacy only) |

## Naming variables

Names matter far more than beginners expect. Code is read many more times than it is written — by your colleagues, by reviewers, and by you months later. A good name explains the code; a bad name hides its meaning.

### The rules (enforced by JavaScript)

A variable name:

- may contain letters, digits, `_` (underscore) and `$` (dollar sign);
- must **not start with a digit** — `2ndPlace` is not allowed, `secondPlace` is;
- must **not contain spaces or dashes** — `first name` and `first-name` are not allowed;
- must **not be a reserved word** — words JavaScript uses itself, such as `let`, `const`, `if`, `function`, `return`, `class`;
- is **case-sensitive** — `total`, `Total` and `TOTAL` are three different variables.

Breaking these rules gives a syntax error:

```js
let 2ndPlace = "Sara";
```

**Output:**

```text
SyntaxError: Invalid or unexpected token
```

### The conventions (agreed by developers)

These are not enforced by JavaScript, but almost every professional JavaScript project follows them:

**camelCase for variables.** Join words together, starting each word after the first with a capital letter: `basketTotal`, `deliveryDate`, `isLoggedIn`, `numberOfItems`. The capitals look like the humps of a camel. This is the standard style for variables and functions in JavaScript.

Other styles exist and you will meet them elsewhere:

| Style | Example | Where it is used |
|---|---|---|
| **camelCase** | `basketTotal` | JavaScript variables and functions |
| **PascalCase** | `BasketTotal` | JavaScript classes ({{ch:this-prototypes-classes}}) and React components |
| **UPPER_SNAKE_CASE** | `MAX_LOGIN_ATTEMPTS` | Fixed settings known before the program runs |
| **snake_case** | `basket_total` | Python code, database column names |
| **kebab-case** | `basket-total` | File names, URLs, CSS — never JavaScript variables |

**Descriptive, not short.** A name should say what the value *means*:

```js
// Unclear
const x = 4500;
const d = 7;
const flag = true;

// Clear
const shoePrice = 4500;
const deliveryDays = 7;
const isGiftWrapped = true;
```

In the first group, a reader must guess what `x`, `d` and `flag` are for. In the second group, the names explain themselves. Saving a few characters of typing is never worth making code harder to understand.

**True/false values read as a question.** Names like `isLoggedIn`, `hasDiscount`, `canEdit` or `shouldNotify` make it obvious that the value is a yes-or-no answer, and make later code read naturally: "if is logged in…".

**Include units when there could be doubt.** Is `timeout = 30` seconds or milliseconds? Is `price = 4500` in rupees or paisa? Names like `timeoutSeconds`, `priceInPaisa` or `distanceKm` prevent real, expensive bugs. A famous example outside software: a NASA spacecraft, the Mars Climate Orbiter, was lost in 1999 partly because one team's software used imperial units while another expected metric. Names that carry units make such mismatches visible.

> [!SENIOR]
> Experienced engineers spend real time on names. When a name is hard to choose, they take it as a sign that they do not fully understand what the value represents — and they think harder about the problem, not just the name. A well-named variable often removes the need for a comment entirely.

## Comments

You met comments in {{ch:setting-up-your-workshop}}: text that the engine ignores, written for human readers. JavaScript has two forms:

```js
// A single-line comment: everything after the two slashes is ignored.

/*
  A multi-line comment:
  everything between the opening and closing marks is ignored,
  however many lines it covers.
*/

const deliveryFee = 250; // a comment can also follow code on the same line
```

### What to write in comments

A common beginner habit is to repeat the code in words:

```js
// add 1 to count
count++;
```

This adds nothing; the code already says it. Worse, if someone later changes the code but not the comment, the comment becomes a lie.

Good comments explain **why** — the reason, the business rule, the surprising situation — which the code cannot say by itself:

```js
// Couriers do not deliver on Sundays, so a Saturday order ships on Monday.
const extraDaysForSaturdayOrders = 2;

// Stored in paisa (1 rupee = 100 paisa) to avoid rounding errors with decimals.
const priceInPaisa = 450000;
```

A good rule: **the code says what; the comment says why.** If you find yourself writing a comment to explain *what* confusing code does, first try to make the code itself clearer — with better names, for example.

### Commenting out code

Comments are also handy for temporarily disabling a line while experimenting:

```js
console.log("This runs");
// console.log("This does not run");
```

In VS Code, select lines and press <kbd>Ctrl</kbd> + <kbd>/</kbd> (<kbd>Cmd</kbd> + <kbd>/</kbd> on macOS) to comment or uncomment them. Do not leave large blocks of commented-out code in finished work, though — Git keeps the history of old code ({{ch:git}}), so there is no need to keep dead code lying around.

## Putting it together: a receipt program

Let us combine everything in one small but realistic program. Create `receipt.js`:

```js
// A simple shop receipt.
// Money is in whole rupees here; real systems store paisa, as explained earlier.

const shopName = "Ali's Shoe Corner";
const shoePrice = 4500;
const sockPrice = 600;
const socksBought = 2;
const deliveryFee = 250;

let total = shoePrice;
total += sockPrice * socksBought;
total += deliveryFee;

console.log("=== " + shopName + " ===");
console.log("Shoes:", shoePrice);
console.log("Socks:", sockPrice, "x", socksBought);
console.log("Delivery:", deliveryFee);
console.log("Total to pay:", total);
```

Run it with `node receipt.js`.

**Output:**

```text
=== Ali's Shoe Corner ===
Shoes: 4500
Socks: 600 x 2
Delivery: 250
Total to pay: 5950
```

Walkthrough:

- **Lines 1–2** are comments describing the program and noting a simplification.
- **Line 4** creates `shopName`. The text contains an apostrophe in `Ali's`; that is fine because the text is wrapped in double quotes. (If it were wrapped in single quotes, the apostrophe would end the text early. {{ch:types-of-data}} covers quotes in detail.)
- **Lines 5–8** create the fixed values with `const`, because none of them change.
- **Line 10** creates `total` with `let`, because it will change. It starts at the shoe price, 4500.
- **Line 11** adds the socks. The right side, `sockPrice * socksBought`, is worked out first: 600 × 2 = 1200. Then `+=` adds it: total becomes 5700.
- **Line 12** adds delivery: total becomes 5950.
- **Line 14** joins three pieces of text with `+` to make a heading. Because every piece is text, `+` joins them, as you saw in {{ch:from-code-to-running-program}}.
- **Lines 15–18** print labelled values by passing several arguments to `console.log`.

Every idea in this chapter appears here: statements running top to bottom, literals, `const` for fixed values, `let` for a value that changes, reassignment with `+=`, expressions evaluated before assignment, clear camelCase names, comments explaining why, and output.

> [!TRY]
> Change `socksBought` to 5 and predict the new total before running. Then try changing `deliveryFee` to `deliveryFee = 300;` on a new line at the end of the file. What happens, and why?

<details>
<summary>What happens, and why</summary>

With `socksBought` set to 5, the total is 4500 + (600 × 5) + 250 = **7750**.

Adding `deliveryFee = 300;` at the end causes `TypeError: Assignment to constant variable.` — because `deliveryFee` was created with `const`. Notice that all the earlier output still appears first: this is a **runtime** error, so everything before that line runs normally. Also notice that even if it had been `let`, changing it at the end would have no effect on the total — the total was already calculated earlier. Programs run top to bottom, and earlier lines do not re-run when later lines change a value.

</details>

## From beginner to enterprise: variables at every level

**Level 3 — A small program.** A handful of `const` and `let` variables, all in one file, as in the receipt.

**Level 4 — A real application.** An online shop's code has thousands of variables, spread across many files and functions. Values often come from outside the program — from a user's form, a database or a request — rather than being written as literals. Fixed settings such as the VAT rate are kept in one clearly named place, so they can be changed once rather than hunted for throughout the code.

**Level 5 — Professional engineering.** Teams follow a shared style guide: `const` by default, consistent naming conventions, and no `var`, all enforced automatically by the linter. Settings that differ between environments — the database address, the payment provider's key — are not written in the code at all. They are read from **environment variables** (from {{ch:the-terminal}}), so the same code runs safely on a laptop, a test server and production. Secrets such as passwords are never written as literals in code, because code is shared, copied and stored in Git history.

**Level 6 — Enterprise.** Large systems keep configuration in dedicated services, so values like feature switches ("is the new checkout enabled?") or limits can be changed without changing code or redeploying. Secrets live in secure stores such as AWS Secrets Manager ({{ch:secrets-manager}}) and are delivered to applications at runtime. The basic idea is still the one from this chapter — a name refers to a value — but *where the value comes from* is carefully controlled.

## Real-world use cases

### Beginner level — A tip calculator

**Situation:** a learner wants to work out a 10 percent tip on a restaurant bill.

**Solution:** `const bill = 3200; const tipRate = 0.1; const tip = bill * tipRate; console.log("Tip:", tip);` — values named clearly, calculated once, printed.

**Lesson:** naming the rate (`tipRate`) instead of writing `0.1` in the middle of the calculation makes the code self-explanatory and easy to change.

### Intermediate level — A magic number in an online shop

**Business problem:** the government changes the sales-tax rate. The shop's developers must update it.

**Technical problem:** the old rate, `0.17`, was typed directly into calculations in 14 different files. A value written directly in code with no name, whose meaning is unclear, is called a **magic number**. One developer updates 13 places and misses one. For weeks, one type of invoice uses the wrong rate.

**Solution:** define the rate once — `const SALES_TAX_RATE = 0.18;` — in a single settings file, and refer to that name everywhere.

**Reasoning:** one name, one place to change, no chance of missing a copy. The name also explains what the number means wherever it is used.

### Advanced level — A unit mix-up

**Business problem:** a payments integration occasionally charges customers 100 times too much.

**Technical problem:** one part of the system stored amounts in rupees; another, written by a different team, expected paisa. A variable simply called `amount` gave no hint which was meant.

**Solution:** rename variables to carry their units (`amountInPaisa`), and convert to the smallest unit at a single, well-tested boundary.

**Reasoning:** names are the cheapest form of documentation, and they appear at exactly the place where the mistake would be made.

### Enterprise level — Secrets in code

**Business problem (illustrative):** a company discovers that a database password was written directly in its code as `const dbPassword = "...";` years ago. The code has since been shared with contractors and stored in many copies of the Git history.

**Consequence:** the password must be treated as exposed. It must be changed, every system that uses it must be updated, and the company must check whether it was misused.

**Solution going forward:** secrets are read at runtime from environment variables or a secrets manager, never written as literals. Automated tools scan code for anything that looks like a password or key before it can be committed.

**Lesson:** a variable's *value* can carry risk. Where values come from is a security decision.

## Common mistakes

### Beginner mistake — Quote marks around a variable name

**What it looks like:** `console.log("total")` printing the word `total` instead of its value.

**Why it happens:** it is easy to think quote marks are always needed when printing.

**How to fix it:** quotes make text. Leave them off to use a variable: `console.log(total)`.

### Beginner mistake — Using a variable before creating it

**What it looks like:**

```js
console.log(price);
const price = 4500;
```

**Output:**

```text
ReferenceError: Cannot access 'price' before initialization
```

**Why it happens:** forgetting that programs run top to bottom.

**How to fix it:** create the variable before the line that uses it. (The exact wording of this error comes from a rule about `let` and `const` that you will understand fully in {{ch:scope-and-closures}}.)

### Beginner mistake — Misspelling a variable name

**What it looks like:**

```js
const basketTotal = 5950;
console.log(basketTotl);
```

**Output:**

```text
ReferenceError: basketTotl is not defined
```

**Why it happens:** typing quickly; capital letters in the wrong place (`BasketTotal`).

**How to spot and fix it:** the error names the misspelt variable exactly. Compare it letter by letter, including capitals. VS Code's autocomplete suggests names that already exist, which prevents most of these.

### Beginner mistake — Using `let` again to change a value

**What it looks like:**

```js
let score = 10;
let score = 20;
```

**Output:**

```text
SyntaxError: Identifier 'score' has already been declared
```

**Why it happens:** thinking `let` is needed every time a value is set.

**How to fix it:** use `let` (or `const`) only once, when the variable is created. To change it later, write `score = 20;` without `let`.

### Intermediate mistake — Using `let` everywhere

**What it looks like:** every variable declared with `let`, even those never reassigned.

**What happens:** readers cannot tell which values change and which do not, so they must read every line to be sure. Accidental reassignment is not caught.

**How to fix and prevent it:** `const` by default; let ESLint's `prefer-const` rule flag variables that should be `const`.

### Production mistake — Magic numbers and copied values

**What it looks like:** the same important value — a tax rate, a fee, a limit — typed as a literal in many places.

**What happens:** when the value changes, some copies are missed, and different parts of the system disagree.

**How to prevent it:** give every important value one clear name, in one place.

## Debugging and troubleshooting

| Error message | What it means | How to fix it |
|---|---|---|
| `ReferenceError: X is not defined` | No variable named `X` exists here | Check spelling and capitals; check it was created; check it was created before this line |
| `ReferenceError: Cannot access 'X' before initialization` | `X` is declared later with `let` or `const`, but used before that line | Move the declaration above the use |
| `SyntaxError: Identifier 'X' has already been declared` | `let` or `const` used twice for the same name | Remove the second `let`/`const`; just assign |
| `TypeError: Assignment to constant variable.` | Trying to reassign a `const` | Use `let` if the value truly must change; otherwise use a new variable |
| `SyntaxError: Missing initializer in const declaration` | `const` created without a value | Give it a value on the same line |
| Output shows a variable's name instead of its value | The name was written in quote marks | Remove the quotes |
| Output shows `undefined` | The variable exists but was never given a value | Assign a value before using it |

> [!TIP]
> When a value is not what you expect, **print it**, with a label: `console.log("total after discount:", total);`. Add labelled `console.log` lines after each step until you find the step where the value stops being what you expected. This is step 4 of the unsticking method from {{ch:learning-and-ai}}, and it solves a large share of beginner problems.

## How a senior engineer thinks about values and variables

> [!SENIOR]
> Even for something as basic as a variable, experienced engineers ask a few questions automatically:
>
> - **Does this need to change?** If not, `const`. Fewer moving parts, fewer bugs.
> - **Would a stranger understand this name?** If the name needs a comment to explain it, the name is probably wrong.
> - **What unit is this in?** Money, time and distance are the classic sources of expensive mix-ups.
> - **Where does this value come from?** A literal in the code, user input, a database, an environment variable? Values from outside the program can be missing or wrong, and must be checked ({{ch:validation}}).
> - **Should this value be in the code at all?** Settings that differ between environments, and secrets, belong outside the code.

## Exercises

### Exercise 1 — Personal details

**Objective:** practise creating variables and printing them with labels.

**What to build:** a file `profile.js` that stores your name, city and the year you started learning programming in three `const` variables, then prints each one with a label.

<details>
<summary>Show the solution</summary>

```js
const fullName = "Ali Saeed";
const city = "Lahore";
const startYear = 2026;

console.log("Name:", fullName);
console.log("City:", city);
console.log("Started learning:", startYear);
```

**Output:**

```text
Name: Ali Saeed
City: Lahore
Started learning: 2026
```

Walkthrough:

- All three values are fixed, so `const` is correct.
- The names are camelCase and descriptive. `fullName` is clearer than `name`, which could mean a first name or a user name.
- `startYear` is a number, so it has no quotes.
- Each `console.log` passes a text label and a variable, separated by a comma.

**Common wrong approach:** writing `console.log("Name: fullName")`. Everything inside the quotes is treated as text, so it prints the word `fullName` instead of your name.

</details>

### Exercise 2 — Swap two values

**Objective:** practise reassignment and think carefully about order.

**Starting point:**

```js
let morningShift = "Sara";
let eveningShift = "Bilal";
```

**What to build:** swap the two values, so that `morningShift` refers to `"Bilal"` and `eveningShift` to `"Sara"`. Print both before and after.

**Hints:** if you write `morningShift = eveningShift;` first, what happens to `"Sara"`? You may need a third variable to hold one value temporarily.

<details>
<summary>Show the solution</summary>

```js
let morningShift = "Sara";
let eveningShift = "Bilal";
console.log("Before:", morningShift, eveningShift);

const temporary = morningShift;
morningShift = eveningShift;
eveningShift = temporary;

console.log("After:", morningShift, eveningShift);
```

**Output:**

```text
Before: Sara Bilal
After: Bilal Sara
```

Walkthrough:

- `const temporary = morningShift;` — `temporary` now refers to `"Sara"`. We save it first because the next line would otherwise lose it.
- `morningShift = eveningShift;` — `morningShift` now refers to `"Bilal"`. At this moment *both* shifts refer to `"Bilal"`; without `temporary`, `"Sara"` would be gone.
- `eveningShift = temporary;` — `eveningShift` now refers to `"Sara"`. Swap complete.
- `temporary` is `const` because it is set once and never changed.

**Common wrong approach:**

```js
morningShift = eveningShift;
eveningShift = morningShift;
```

This prints `Bilal Bilal`. After the first line, both refer to `"Bilal"`, so the second line copies `"Bilal"` back again. Thinking through each line *in order*, as the computer does, reveals the problem.

(JavaScript also has a one-line way to swap values using a feature called destructuring: `[morningShift, eveningShift] = [eveningShift, morningShift];`. You will learn how it works in {{ch:arrays}}.)

</details>

### Exercise 3 — A savings tracker

**Objective:** practise `let`, the update shortcuts and choosing `const` versus `let`.

**What to build:** a program that starts with savings of 10,000, adds a monthly saving of 3,500 three times (one line per month), then subtracts a 2,000 expense, printing the savings after each step.

<details>
<summary>Show the solution</summary>

```js
const monthlySaving = 3500;
let savings = 10000;
console.log("Start:", savings);

savings += monthlySaving;
console.log("After month 1:", savings);

savings += monthlySaving;
console.log("After month 2:", savings);

savings += monthlySaving;
console.log("After month 3:", savings);

savings -= 2000;
console.log("After expense:", savings);
```

**Output:**

```text
Start: 10000
After month 1: 13500
After month 2: 17000
After month 3: 20500
After expense: 18500
```

Walkthrough:

- `monthlySaving` never changes, so it is `const`. `savings` changes, so it is `let`.
- `savings += monthlySaving;` means "savings becomes savings plus the monthly saving".
- Repeating the same two lines three times works, but it is clumsy. In {{ch:loops}} you will learn to repeat work without copying lines.

**Common wrong approach:** writing `const savings = 10000;`, which fails with `TypeError: Assignment to constant variable.` at the first `+=`. Ask, for each variable: *will this need to change?*

</details>

### Exercise 4 — Fix the broken program (debugging)

**Objective:** practise reading errors and fixing them one at a time.

**The broken program:**

```js
const itemPrice = 1200
let quantity = 3;
let Total = itemPrice * quantity;
let total = total + 150;
console.log("Order total:", totl);
```

**What to do:** run it, fix the first error, run it again, and repeat until it prints `Order total: 3750`. Write down each error and its cause.

<details>
<summary>Show the solution</summary>

**First run:** `ReferenceError: Cannot access 'total' before initialization` on line 4. Line 4 creates `total` and, on the same line, tries to read `total` to add 150 — but `total` does not have a value yet. The author meant to use the result from line 3, but named it `Total` with a capital T, which is a different variable.

**Fix:** name the line-3 variable `total` and change line 4 to update it, not create a new one.

**Second run:** `ReferenceError: totl is not defined` on line 5 — a spelling mistake.

**Fix:** change `totl` to `total`.

The corrected program:

```js
const itemPrice = 1200;
const quantity = 3;
let total = itemPrice * quantity;
total += 150;
console.log("Order total:", total);
```

**Output:**

```text
Order total: 3750
```

Other improvements made along the way:

- Added the missing semicolon on line 1 for consistency (the program worked without it, thanks to automatic semicolon insertion).
- Changed `quantity` to `const`, since it is never reassigned.

**Common wrong approach:** trying to fix all errors at once by guessing. Fix one error, run again, read the next message. Each message points at exactly one problem.

</details>

## Summary

A program is a list of **statements** that run **one at a time, top to bottom**. Statements work with **values**; an **expression** is any code that produces a value, and a **literal** is a value written directly in code.

`console.log` prints values to the console, separated by spaces when given several **arguments**; `console.error` and `console.warn` write errors and warnings, and `console.table` shows lists of records as tables. Normal output goes to **standard output** and errors to **standard error**.

A **variable** is a name that refers to a value stored in memory. **`=` is assignment, not equality**: the right side is worked out first, then the name on the left is made to refer to the result — so `count = count + 1` is normal. Shortcuts such as `+=`, `-=`, `++` and `--` update a variable based on its own value.

Use **`const` by default**, because it cannot be reassigned; use **`let`** only when a variable must change; do not use **`var`** in new code. Names must follow JavaScript's rules and should follow its conventions: **camelCase**, descriptive, questions for true/false values, and units where there could be doubt. Avoid **magic numbers**. **Comments** should explain *why*, not repeat *what*.

## Key terms

- **Value** — A single piece of data, such as a number, a piece of text or true/false.
- **Literal** — A value written directly in source code, such as `4500` or `"Lahore"`.
- **Expression** — Any piece of code that produces a value, such as `price * quantity`.
- **Statement** — A complete instruction in a program, such as creating a variable or printing a value.
- **Variable** — A name that refers to a value, so a program can remember the value and use it later.
- **Declaring a variable** — Creating a variable, using `const`, `let` or `var`.
- **Assignment** — Making a variable refer to a value, using the `=` operator.
- **Assignment operator** — The `=` symbol, which makes the name on its left refer to the value on its right.
- **Reassignment** — Making an existing variable refer to a different value.
- **Initializer** — The `= value` part that gives a variable its first value when it is declared.
- **Keyword** — A word with a special meaning in a programming language, such as `const`, `let` or `if`.
- **Reserved word** — A word the language keeps for its own use, which cannot be used as a variable name.
- **`const`** — A keyword that creates a variable which cannot be reassigned and must be given a value immediately.
- **`let`** — A keyword that creates a variable which can be reassigned.
- **`var`** — The original keyword for creating variables in JavaScript, with older, more confusing rules; not used in new code.
- **`undefined`** — The special JavaScript value meaning "no value has been given".
- **Argument** — A value passed to a function or command, such as the values inside `console.log( )`.
- **Standard output (stdout)** — A program's normal output channel, where `console.log` writes.
- **Standard error (stderr)** — A program's separate output channel for errors and diagnostics, where `console.error` writes.
- **Increment / decrement** — Adding one to (`++`) or subtracting one from (`--`) a variable.
- **Garbage collection** — The automatic process by which the engine frees memory used by values that nothing refers to any more.
- **camelCase** — A naming style that joins words and capitalises each word after the first, such as `basketTotal`.
- **PascalCase** — A naming style that capitalises every word, such as `BasketTotal`; used for classes in JavaScript.
- **Magic number** — A literal value in code with no name explaining what it means, such as an unexplained `0.17`.
- **Automatic semicolon insertion** — JavaScript's behaviour of adding missing semicolons at the ends of lines.

## What comes next

You can now create variables, give them values, change them and print them. But so far we have treated all values loosely — "numbers", "text". JavaScript is precise about what *kind* of value something is, and that kind decides what you can do with it: you can multiply numbers but not names; you can make text uppercase but not numbers.

In the next chapter, **Types of Data: Numbers, Text, True/False and Nothing**, you will learn each kind of value in JavaScript properly — how numbers behave (including that `0.1 + 0.2` surprise), how to work with text, what true and false values are for, the difference between `undefined` and `null`, and how JavaScript converts one type into another, sometimes when you least expect it.
