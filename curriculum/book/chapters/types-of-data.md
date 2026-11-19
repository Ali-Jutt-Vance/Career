# Types of Data: Numbers, Text, True/False and Nothing

> [!GOALS]
> - What a "type" is, why every value has one, and how to check it with `typeof`.
> - The seven simple (primitive) types in JavaScript, and the one complex type.
> - How numbers work: arithmetic, remainders, powers, rounding, `NaN`, `Infinity`, the largest safe whole number, and `BigInt`.
> - Why decimal arithmetic is slightly inaccurate, and how real systems handle money correctly.
> - How to work with text: the three kinds of quotes, special characters, template literals, length, positions, and the most useful string methods.
> - What booleans are, and the difference between `undefined` and `null`.
> - How JavaScript converts one type into another — deliberately when you ask, and automatically when you don't — and the bugs this causes.
> - What "truthy" and "falsy" mean.

## Why this matters

In the previous chapter, the values in our programs were "numbers" and "text" in a loose, everyday sense. But a program must be precise about **what kind of value** it is holding, because the kind decides what makes sense:

- You can multiply two prices, but multiplying two names is meaningless.
- You can turn a name into capital letters, but not a price.
- `"5" + 3` and `5 + 3` look almost the same, yet give completely different results: `"53"` and `8`.

That last example is not a curiosity. It is behind real bugs in real products: shopping baskets that show a total of "450060025" instead of 5,350, because prices arrived from a web form as text. Understanding types — and how JavaScript converts between them — prevents a whole family of bugs that confuse beginners and catch out experienced developers too.

## The simple idea

Think about a paper form at a bank. It has boxes for different kinds of information:

- **Amount**: a number. You can add amounts together.
- **Name**: text. You can read it or check its spelling, but adding two names makes no sense.
- **"Is this a joint account?"**: tick yes or no.
- **"Second account holder"**: may be left empty.

Each box expects a particular **kind** of information, and the bank handles each kind differently. A program does the same. The kind of a value is called its **type**.

> [!ANALOGY]
> Types are like containers in a kitchen. Flour goes in a jar, milk in a bottle, eggs in a tray. Each container suits its contents and determines what you can do: you pour milk, you scoop flour, you crack eggs.
>
> **Where the analogy breaks:** you would never accidentally pour flour, but JavaScript will sometimes quietly convert a value from one type to another when you combine them — turning a number into text without asking you. Much of this chapter is about knowing when that happens.

## The proper definition and key words

A **data type** (or just **type**) is a category of values that share the same set of operations — the same things you can do with them.

JavaScript has **seven primitive types** and **one non-primitive type**:

| Type | Example values | Used for |
|---|---|---|
| **number** | `42`, `3.14`, `-7`, `0` | Quantities, prices, counts, measurements |
| **string** | `"Lahore"`, `'hello'`, `` `Hi` `` | Text of any length |
| **boolean** | `true`, `false` | Yes/no answers |
| **undefined** | `undefined` | "No value has been given yet" |
| **null** | `null` | "Deliberately empty — there is no value" |
| **bigint** | `9007199254740993n` | Whole numbers too large for `number` |
| **symbol** | `Symbol("id")` | Unique identifiers (advanced; {{ch:advanced-javascript}}) |
| **object** | `{ name: "Ali" }`, `[1, 2, 3]` | Collections and structures of other values |

A **primitive** value is a single, simple value. Primitives are **immutable**, which means the value itself can never be changed. You can make a variable refer to a *different* value, but you cannot alter the number `5` or the text `"Lahore"` itself. (Why this matters will become clear when you meet strings below.)

**Objects** are different: they group many values together, and they *can* be changed. Lists (called arrays) and records (called objects) are both of this type. They get their own chapters, {{ch:arrays}} and {{ch:objects}}. This chapter is about the primitives.

## Checking a value's type: `typeof`

JavaScript can tell you the type of any value with the `typeof` operator:

```js
console.log(typeof 42);
console.log(typeof "Lahore");
console.log(typeof true);
console.log(typeof undefined);
console.log(typeof 10n);
console.log(typeof { city: "Lahore" });
console.log(typeof null);
```

**Output:**

```text
number
string
boolean
undefined
bigint
object
object
```

Walkthrough:

- `typeof` is written before a value (or a variable) and produces the name of its type, as a piece of text.
- Most results are exactly what you would expect.
- The last line is a famous surprise: `typeof null` gives `"object"`, even though `null` is a primitive, not an object. This is a **bug from the very first version of JavaScript** in 1995. It was never fixed because fixing it would have broken millions of existing websites. Every JavaScript developer simply learns to remember it. To check for `null`, compare directly: `value === null` (you will learn `===` in {{ch:operators-and-decisions}}).

`typeof` is very useful when debugging: when a value behaves strangely, `console.log(typeof value)` often reveals that it is not the type you thought.

> [!NOTE]
> JavaScript is a **dynamically typed** language. This means a variable does not have a fixed type; only values do. The same `let` variable can refer to a number now and a string later. Many other languages — and TypeScript, which you will learn in {{ch:typescript-basics}} — are **statically typed**: each variable has a declared type that is checked before the program runs. Static typing catches many of the mistakes in this chapter automatically, which is a major reason professional teams use TypeScript.

## Numbers

### Level 1 — One type for all numbers

In JavaScript, whole numbers (**integers**) and numbers with decimal points are the same type: `number`.

```js
const quantity = 3;       // a whole number
const weightKg = 2.75;    // a decimal number
const temperature = -4;   // a negative number
console.log(typeof quantity, typeof weightKg, typeof temperature);
```

**Output:**

```text
number number number
```

You write numbers without quotes and without thousands separators. `4,500` is not a valid number in code. If you want to make large numbers easier to read, JavaScript lets you use underscores, which it ignores: `const population = 241_500_000;` is the same as `241500000`.

### Level 2 — Arithmetic operators

| Operator | Meaning | Example | Result |
|---|---|---|---|
| `+` | addition | `7 + 3` | `10` |
| `-` | subtraction | `7 - 3` | `4` |
| `*` | multiplication | `7 * 3` | `21` |
| `/` | division | `7 / 2` | `3.5` |
| `%` | remainder | `7 % 3` | `1` |
| `**` | power | `2 ** 3` | `8` |

Two of these need a closer look.

**Division always gives the exact result,** including decimals. `7 / 2` is `3.5`, not `3`. (Some other languages give `3` when both numbers are whole. JavaScript does not.)

**The remainder operator `%`** gives what is left over after dividing as many whole times as possible. `7 % 3` is `1`, because 3 goes into 7 twice (making 6), with 1 left over. It is often called "modulo" or "mod". It is surprisingly useful:

```js
console.log(10 % 2);   // 0 — 10 is even
console.log(7 % 2);    // 1 — 7 is odd
console.log(125 % 60); // 5 — 125 minutes is 2 hours and 5 minutes
```

**Output:**

```text
0
1
5
```

- A number is **even** when `number % 2` is `0`, and odd when it is `1`.
- `125 % 60` gives the minutes left over after taking out whole hours.

**The power operator `**`** raises a number to a power: `2 ** 3` means 2 × 2 × 2 = 8. `10 ** 6` is a million.

### Order of operations

When an expression has several operators, JavaScript follows the same order as school mathematics: brackets first, then powers, then multiplication, division and remainder, then addition and subtraction. Operators of the same level go from left to right.

```js
console.log(2 + 3 * 4);
console.log((2 + 3) * 4);
console.log(20 - 10 - 5);
```

**Output:**

```text
14
20
5
```

- `2 + 3 * 4` — multiplication first: 3 × 4 = 12, then 2 + 12 = 14.
- `(2 + 3) * 4` — brackets first: 5, then 5 × 4 = 20.
- `20 - 10 - 5` — same level, left to right: 20 − 10 = 10, then 10 − 5 = 5.

> [!TIP]
> When an expression is at all complicated, **add brackets even when they are not strictly needed**. `subtotal + (subtotal * taxRate)` is easier to read than `subtotal + subtotal * taxRate`, even though both give the same result. Code is for humans first.

### Level 3 — The `Math` tools

JavaScript has a built-in collection of mathematical tools called `Math`. You use them by writing `Math.` followed by the tool's name, much as you write `console.log`:

```js
console.log(Math.round(4.5));
console.log(Math.round(4.4));
console.log(Math.floor(4.9));
console.log(Math.ceil(4.1));
console.log(Math.abs(-12));
console.log(Math.max(3, 17, 8));
console.log(Math.min(3, 17, 8));
console.log(Math.sqrt(81));
console.log(Math.random());
```

**Output (the last line will differ each time):**

```text
5
4
4
5
12
17
3
9
0.7381649231
```

- `Math.round` rounds to the nearest whole number; exactly .5 rounds up.
- `Math.floor` always rounds **down** to the whole number below.
- `Math.ceil` ("ceiling") always rounds **up**.
- `Math.abs` gives the **absolute value**: the number without its minus sign.
- `Math.max` and `Math.min` give the largest and smallest of the numbers you pass.
- `Math.sqrt` gives the square root.
- `Math.random()` gives a random decimal between 0 (included) and 1 (not included).

A common use of `Math.random` with `Math.floor` is a random whole number in a range:

```js
const diceRoll = Math.floor(Math.random() * 6) + 1;
console.log(diceRoll);
```

Work through it from the inside out: `Math.random()` gives something from 0 up to (but not including) 1; times 6 gives 0 up to (but not including) 6; `Math.floor` turns that into a whole number from 0 to 5; adding 1 gives 1 to 6, like a real die.

> [!WARNING]
> `Math.random()` is **not** suitable for anything security-related — passwords, login tokens, discount codes that must not be guessable. Its results can be predicted by a determined attacker. For security, use the cryptographic random tools built into browsers and Node.js (`crypto.randomUUID()` and related functions), which you will use in {{ch:authentication}}.

### Formatting numbers for display

Two tools turn numbers into nicely formatted **text** for showing to people:

```js
const price = 4499.5;
console.log(price.toFixed(2));
console.log((1234567.891).toLocaleString("en-PK"));
```

**Output:**

```text
4499.50
1,234,567.891
```

- `price.toFixed(2)` gives the number with exactly two decimal places — as a **string**, not a number. Use it for display only.
- `toLocaleString` formats a number for a particular region, here English as used in Pakistan, adding thousands separators.

Notice the dot after `price`. Numbers, like `console`, have built-in abilities you reach with a dot. The brackets around `1234567.891` are needed because JavaScript would otherwise read the dot after a number as a decimal point.

### Level 4 — Decimals are approximations

In {{ch:what-a-computer-is}} you learned that computers store fractional numbers in binary as **floating point**, and that some simple decimals, like 0.1, cannot be stored exactly. Now you can see it directly:

```js
console.log(0.1 + 0.2);
console.log(0.1 + 0.2 === 0.3);
console.log(1.1 * 3);
```

**Output:**

```text
0.30000000000000004
false
3.3000000000000003
```

The results are extremely close to the right answers, but not exact. The second line uses `===`, which checks whether two values are equal (you will learn it properly in the next chapter); it says `false`, because the stored result is not exactly 0.3.

This is not a JavaScript bug. Almost every programming language behaves the same way, because they all use the same standard for storing decimals, called **IEEE 754**.

For most uses — measurements, percentages, averages — the tiny error does not matter. But for **money**, it matters a great deal, because small errors add up over thousands of transactions and accounts stop balancing to the paisa.

### How real systems handle money

The professional rule, which you met in {{ch:what-a-computer-is}}: **store money as a whole number of the smallest unit.** Work in paisa (or cents), not rupees with decimals. Whole numbers are stored exactly.

```js
// Prices in paisa: 1 rupee = 100 paisa
const shirtPaisa = 129_950;   // Rs 1,299.50
const capPaisa = 49_975;      // Rs 499.75
const totalPaisa = shirtPaisa + capPaisa;

console.log("Total in paisa:", totalPaisa);
console.log("Total in rupees:", (totalPaisa / 100).toFixed(2));
```

**Output:**

```text
Total in paisa: 179925
Total in rupees: 1799.25
```

Walkthrough:

- Both prices are stored as whole numbers of paisa, so the addition is exact: 129,950 + 49,975 = 179,925.
- Only when **displaying** the result do we divide by 100 and format with two decimal places.

Payment companies and banks work this way. Stripe's payment API, for example, takes amounts in the smallest currency unit — an amount of `1000` in US dollars means $10.00. Databases also offer special exact decimal types for money ({{ch:postgresql}}).

> [!WARNING]
> **Percentages and division can still produce fractions,** even when you start with whole paisa. A 15 percent discount on 999 paisa is 149.85 paisa. You must decide how to **round** it — and the rounding rule is a business decision (always in the customer's favour? to the nearest paisa?) that should be written down and applied in one place. Round once, at a clearly defined step, not repeatedly along the way.

### Level 5 — Special number values: `NaN` and `Infinity`

Some calculations do not have a sensible numeric answer. JavaScript represents these with special values of the `number` type.

**`NaN`** means "**N**ot **a** **N**umber". It is the result of a calculation that has no meaningful numeric answer:

```js
console.log(0 / 0);
console.log("apple" * 3);
console.log(Number("twelve"));
console.log(typeof NaN);
```

**Output:**

```text
NaN
NaN
NaN
number
```

Yes — the type of "Not a Number" is `number`. It is a special numeric value meaning "this calculation failed".

`NaN` has two properties that make it dangerous:

1. **It spreads.** Any arithmetic involving `NaN` gives `NaN`. One bad value early in a calculation turns the final total into `NaN`, and you may not see it until it appears on an invoice.
2. **It is not equal to anything, including itself.** `NaN === NaN` is `false`. To check for it, use `Number.isNaN(value)`.

```js
const quantity = Number("three");      // NaN — the text is not a number
const total = quantity * 450 + 250;    // NaN spreads through the calculation
console.log(total);
console.log(Number.isNaN(total));
```

**Output:**

```text
NaN
true
```

**`Infinity`** (and `-Infinity`) is the result of a number growing beyond what can be stored, or of dividing a non-zero number by zero:

```js
console.log(10 / 0);
console.log(-10 / 0);
```

**Output:**

```text
Infinity
-Infinity
```

In many other languages, dividing by zero crashes the program. JavaScript instead quietly produces `Infinity`, which can then flow through a program unnoticed — another reason to check inputs before calculating.

### Level 6 — How large can a number be? `BigInt`

The `number` type stores every number in 64 bits using floating point. That gives an enormous range, but **whole numbers are only exact up to a limit**: 9,007,199,254,740,991. JavaScript names this `Number.MAX_SAFE_INTEGER`.

```js
console.log(Number.MAX_SAFE_INTEGER);
console.log(9007199254740992 + 1);
```

**Output:**

```text
9007199254740991
9007199254740992
```

Above the limit, adding 1 does not reliably work: the result is still `9007199254740992`, because the number cannot be stored precisely any more.

For everyday counts and prices this limit is enormous. But it matters in real systems:

- Some databases and services use **64-bit integer IDs** that can exceed this limit. If such an ID arrives as a JavaScript `number`, its last digits can silently change — and you load the wrong record. This happened often enough with Twitter's IDs that its API began sending every ID twice: once as a number and once as a string (`id_str`), so JavaScript programs could use the exact text.
- Cryptography and some financial calculations need exact very large integers.

For these cases, JavaScript has a separate type, **`BigInt`**, for whole numbers of any size. You create one by adding `n` to the end of a whole number:

```js
const bigId = 9007199254740993n;
console.log(bigId + 1n);
console.log(typeof bigId);
```

**Output:**

```text
9007199254740994n
bigint
```

`BigInt` values cannot be mixed with ordinary numbers in arithmetic (`10n + 1` is a `TypeError`), cannot hold decimals, and are slower. Use them only when you genuinely need exact huge integers. For large IDs from outside systems, the most common professional approach is simpler still: **keep them as strings**, because you never do arithmetic on an ID anyway.

## Strings

### Level 1 — Text in quotes

A **string** is a sequence of characters — text. The name comes from the idea of characters "strung together" like beads. You write a string by putting text inside quotes. JavaScript accepts three kinds:

```js
const a = "double quotes";
const b = 'single quotes';
const c = `backticks`;
console.log(a, b, c);
```

**Output:**

```text
double quotes single quotes backticks
```

Double and single quotes behave identically. Backticks (the `` ` `` key, usually below <kbd>Esc</kbd>) create a special kind of string with extra powers, called a **template literal**, explained below.

Which to use? Teams pick one style for ordinary strings (Prettier enforces it automatically). This book uses double quotes. The useful thing about having two is that you can put one kind inside the other:

```js
const sentence = "Ali's shop is open";
const quote = 'She said "hello"';
```

### Special characters: escaping

What if you need a double quote inside a double-quoted string? Put a **backslash** `\` before it. The backslash says "the next character is part of the text, not the end of the string". This is called **escaping** the character.

```js
const message = "She said \"hello\" and left.";
console.log(message);
```

**Output:**

```text
She said "hello" and left.
```

The backslash also creates special characters that you cannot type directly:

| Escape | Meaning |
|---|---|
| `\n` | new line |
| `\t` | tab (a wide space, used for alignment) |
| `\\` | a single backslash |
| `\"` and `\'` | a quote mark |

```js
console.log("Line one\nLine two");
console.log("C:\\Users\\Ali");
```

**Output:**

```text
Line one
Line two
C:\Users\Ali
```

The second line shows a common trap: Windows paths contain backslashes, so each one must be written as `\\` inside a normal string. (Or use forward slashes, which Node.js accepts on Windows too, as you learned in {{ch:the-terminal}}.)

### Template literals

Building text from variables with `+` quickly becomes awkward:

```js
const customer = "Sara";
const items = 3;
const total = 5350;
console.log("Dear " + customer + ", your " + items + " items cost Rs " + total + ".");
```

**Template literals** make this much easier. Inside backticks, you can insert any expression by writing `${ }` around it:

```js
const customer = "Sara";
const items = 3;
const total = 5350;
console.log(`Dear ${customer}, your ${items} items cost Rs ${total}.`);
```

**Output:**

```text
Dear Sara, your 3 items cost Rs 5350.
```

Walkthrough:

- The whole message is inside backticks.
- Each `${customer}`, `${items}` and `${total}` is replaced by the value of that expression. This replacement is called **interpolation**.
- The rest of the text, including spaces and punctuation, appears exactly as written.

Anything that produces a value can go inside `${ }`, not just variable names:

```js
const price = 1200;
const quantity = 3;
console.log(`Subtotal: Rs ${price * quantity}`);
console.log(`Delivery: ${price * quantity > 3000 ? "free" : "Rs 250"}`);
```

**Output:**

```text
Subtotal: Rs 3600
Delivery: free
```

The second line uses a compact way of choosing between two values, which you will learn in {{ch:operators-and-decisions}}; for now just notice that a whole expression can live inside `${ }`.

Template literals can also span several lines:

```js
const receipt = `Order #5521
Items: 3
Total: Rs 5350`;
console.log(receipt);
```

**Output:**

```text
Order #5521
Items: 3
Total: Rs 5350
```

In modern JavaScript, template literals are the normal way to build text from values.

### Level 2 — Length and positions

Every string has a **length** — the number of characters in it — and each character has a **position**, called its **index**. Indexes start from **0**, not 1.

```text
  string:   L   a   h   o   r   e
  index:    0   1   2   3   4   5          length: 6
```

```js
const city = "Lahore";
console.log(city.length);
console.log(city[0]);
console.log(city[5]);
console.log(city[city.length - 1]);
console.log(city[10]);
```

**Output:**

```text
6
L
e
e
undefined
```

Walkthrough:

- `city.length` is 6 — there are six characters.
- `city[0]` is the **first** character. Square brackets after a string, with a number inside, pick out the character at that index.
- `city[5]` is the **last** character, because the indexes run from 0 to 5.
- `city[city.length - 1]` is the standard way to get the last character of *any* string, whatever its length: the last index is always one less than the length.
- `city[10]` asks for a position that does not exist, and gives `undefined` — no error, just "nothing there".

> [!NOTE]
> **Why does counting start at 0?** An index is best understood as "how far from the start". The first character is 0 steps from the start; the second is 1 step away. Most programming languages count this way, and it will feel natural within a few weeks. Until then, expect "off by one" mistakes — the most common bug category in programming, common enough to have its own name: the **off-by-one error**.

### Strings cannot be changed

Remember that primitives are **immutable**. You cannot change a character inside a string:

```js
let city = "lahore";
city[0] = "L";
console.log(city);
```

**Output:**

```text
lahore
```

The assignment `city[0] = "L"` is silently ignored. To get a different string, you create a **new** one — and the string tools below all do exactly that: they return a new string and leave the original unchanged.

```js
let city = "lahore";
city = "L" + city.slice(1);
console.log(city);
```

**Output:**

```text
Lahore
```

Here a new string is built from `"L"` and the rest of the old one, and `city` is reassigned to refer to the new string. (`slice` is explained next.)

### Level 3 — Useful string methods

Strings come with many built-in tools. A tool that belongs to a value and is used with a dot — like `toFixed` on numbers — is called a **method**. Methods are called with brackets, sometimes with arguments inside.

Here are the ones you will use most:

```js
const raw = "  Sara Khan  ";
const name = raw.trim();

console.log(`[${name}]`);
console.log(name.toUpperCase());
console.log(name.toLowerCase());
console.log(name.includes("Khan"));
console.log(name.startsWith("Sa"));
console.log(name.indexOf("Khan"));
console.log(name.slice(0, 4));
console.log(name.replace("Khan", "Ahmed"));
console.log(name.split(" "));
console.log("7".padStart(3, "0"));
console.log("ha".repeat(3));
```

**Output:**

```text
[Sara Khan]
SARA KHAN
sara khan
true
true
5
Sara
Sara Ahmed
[ 'Sara', 'Khan' ]
007
hahaha
```

Walkthrough, method by method:

- **`trim()`** removes spaces (and tabs and new lines) from both ends. Users very often type extra spaces into forms, so trimming input is a standard first step. The square brackets in the template literal show that the spaces are gone.
- **`toUpperCase()`** and **`toLowerCase()`** return the text in capitals or small letters. Lowercase is often used to compare text without caring about capitals — for example, treating `"Ali@Example.com"` and `"ali@example.com"` as the same email.
- **`includes("Khan")`** checks whether the text contains `"Khan"` anywhere, giving `true` or `false`.
- **`startsWith("Sa")`** checks the beginning. (There is also `endsWith`.)
- **`indexOf("Khan")`** gives the index where `"Khan"` begins — 5, since "Sara " takes indexes 0 to 4. If the text is not found, it gives `-1`.
- **`slice(0, 4)`** returns the part of the string from index 0 **up to but not including** index 4: `"Sara"`. With one argument, `slice(5)` would return everything from index 5 to the end: `"Khan"`. Negative numbers count from the end: `slice(-4)` gives the last four characters.
- **`replace("Khan", "Ahmed")`** returns a new string with the first `"Khan"` replaced by `"Ahmed"`. To replace every occurrence, use `replaceAll`.
- **`split(" ")`** cuts the string into pieces wherever there is a space, producing a **list** (an array, written with square brackets). Arrays are the subject of {{ch:arrays}}; for now, notice that splitting text into words or values is often useful.
- **`padStart(3, "0")`** adds `"0"` characters to the start until the string is 3 long: `"007"`. Useful for order numbers and times.
- **`repeat(3)`** repeats the string three times.

Notice that **none of these changed `name`** — each returned a new string. After all those lines, `name` is still `"Sara Khan"`.

> [!TIP]
> You do not need to memorise every method. Remember that they exist, and look up the exact name when you need one — MDN's page for "String" lists them all. In VS Code, typing a string variable followed by a dot shows a list of every available method with a short description.

### Unicode and length

In {{ch:what-a-computer-is}} you learned that text is stored using **Unicode**. JavaScript strings are Unicode, so they can hold any language:

```js
const greeting = "سلام";
console.log(greeting.length);
console.log("😀".length);
```

**Output:**

```text
4
2
```

The Urdu word has four letters, and `length` is 4 as expected. But the single emoji has a `length` of 2. This is because JavaScript measures length in units of 16 bits, and many emoji (and some rare characters) need two such units. For most text this never matters, but it explains strange results when counting characters in user names or messages with emoji — for example, a 20-character limit cutting an emoji in half. When exact character counts matter, there are proper tools for it, such as `[...text].length`, which you will understand after {{ch:arrays}}.

## Booleans

A **boolean** has only two possible values: `true` and `false`. (The type is named after George Boole, a nineteenth-century mathematician who studied the logic of true and false.)

```js
const isLoggedIn = true;
const hasDiscountCode = false;
console.log(isLoggedIn, hasDiscountCode, typeof isLoggedIn);
```

**Output:**

```text
true false boolean
```

`true` and `false` are written without quotes. `"true"` in quotes is a string — four letters — not a boolean, and confusing the two is a classic bug when reading settings from files or forms.

Booleans are usually produced by **comparisons** and **checks**, as you have already seen with `includes` and `===`:

```js
const total = 5350;
const qualifiesForFreeDelivery = total >= 5000;
console.log(qualifiesForFreeDelivery);
```

**Output:**

```text
true
```

`total >= 5000` asks "is total greater than or equal to 5000?" and produces the boolean answer. Booleans are what programs use to **make decisions** — the subject of the next chapter.

## Nothing: `undefined` and `null`

JavaScript has two different values that both mean "no value". This confuses many people, so let us be precise.

**`undefined`** means **"no value has been given"**. JavaScript itself produces it automatically:

```js
let deliveryNote;
console.log(deliveryNote);

const city = "Lahore";
console.log(city[20]);
```

**Output:**

```text
undefined
undefined
```

- A variable declared without a value is `undefined`.
- Asking for something that does not exist — a character beyond the end of a string, a missing property of an object — gives `undefined`.
- You will also see that a function that does not give back a value produces `undefined` ({{ch:functions}}) — which is why the browser console showed `undefined` after `console.log` in {{ch:from-code-to-running-program}}.

**`null`** means **"deliberately empty"**. JavaScript never produces it on its own; **programmers** use it to say "I know about this, and on purpose there is no value":

```js
let secondAccountHolder = null; // this account has no second holder
```

The difference in meaning:

| | `undefined` | `null` |
|---|---|---|
| Meaning | Not set; missing; nobody gave it a value | Intentionally empty |
| Who usually produces it | JavaScript, automatically | The programmer, on purpose |
| `typeof` | `"undefined"` | `"object"` (the historic bug) |

> [!ANALOGY]
> On a form, `undefined` is a box that was never looked at — you don't know whether it applies. `null` is a box with "N/A" written in it — someone checked, and the answer is "none".
>
> **Where the analogy breaks:** in practice, many codebases and APIs are not careful about the distinction, and you will see both used loosely. Databases, for example, have only `NULL`, and when data comes from a database into JavaScript, missing values often arrive as `null`. Write code that handles both whenever a value might be missing.

## Converting between types

Values often arrive in the wrong type. The most important example: **everything a user types into a web form arrives as a string**, even in a box labelled "Quantity". Data read from files, URLs and environment variables ({{ch:the-terminal}}) is also text. Before doing arithmetic, you must convert it.

### Explicit conversion: when you ask for it

**To a number:**

```js
console.log(Number("42"));
console.log(Number("42.5"));
console.log(Number(""));
console.log(Number("  7  "));
console.log(Number("42 apples"));
console.log(parseInt("42 apples"));
console.log(parseFloat("3.75 kg"));
console.log(parseInt("3.99"));
```

**Output:**

```text
42
42.5
0
7
NaN
42
3.75
3
```

Walkthrough:

- **`Number(value)`** converts a whole string to a number. It ignores spaces around the number, but if *anything* else is in the string, the result is `NaN`. Strict, which is usually what you want.
- Watch out: `Number("")` is `0`, not `NaN`. An **empty** form field becomes zero, which may hide the fact that the user typed nothing.
- **`parseInt(value)`** reads a whole number from the **start** of a string and stops at the first character that does not fit. `"42 apples"` gives 42. It also drops anything after a decimal point, so `parseInt("3.99")` is 3 — it does not round.
- **`parseFloat(value)`** does the same but keeps decimals.

Which should you use? For validating user input, prefer **`Number`**, because it rejects text that is not entirely a number. `parseInt` and `parseFloat` are useful when you deliberately want to read a number from the start of text like `"12px"`.

**To a string:**

```js
const quantity = 3;
console.log(String(quantity));
console.log(quantity.toString());
console.log(`${quantity}`);
```

All three produce the string `"3"`.

**To a boolean:**

```js
console.log(Boolean(1));
console.log(Boolean(0));
console.log(Boolean("hello"));
console.log(Boolean(""));
```

**Output:**

```text
true
false
true
false
```

These results follow the "truthy and falsy" rule, explained shortly.

### Implicit conversion: when JavaScript does it for you

JavaScript will also convert types **automatically** when you combine values of different types. This is called **type coercion**, and it is the source of the most famous JavaScript surprises.

The rule for `+` is the one you have already seen: **if either side is a string, `+` converts the other side to a string and joins them.**

```js
console.log("5" + 3);
console.log(3 + "5");
console.log(1 + 2 + "3");
console.log("1" + 2 + 3);
```

**Output:**

```text
53
35
33
123
```

- `"5" + 3` and `3 + "5"` — one side is text, so join: `"53"` and `"35"`.
- `1 + 2 + "3"` — left to right: `1 + 2` is 3 (both numbers, so add), then `3 + "3"` joins: `"33"`.
- `"1" + 2 + 3` — left to right: `"1" + 2` joins to `"12"`, then `"12" + 3` joins to `"123"`.

But the **other** arithmetic operators (`-`, `*`, `/`, `%`) only make sense for numbers, so they convert strings **to numbers**:

```js
console.log("10" - 3);
console.log("10" * "2");
console.log("10" / "4");
console.log("ten" * 2);
```

**Output:**

```text
7
20
2.5
NaN
```

So `"10" + 3` is `"103"`, while `"10" - 3` is `7`. This inconsistency is a well-known trap.

### The classic bug, step by step

Here is how this turns into a real bug in a shop. Imagine three prices read from a web page's form fields — so they are strings:

```js
const shoes = "4500";
const socks = "600";
const delivery = "250";

const wrongTotal = shoes + socks + delivery;
console.log("Wrong total:", wrongTotal);

const rightTotal = Number(shoes) + Number(socks) + Number(delivery);
console.log("Right total:", rightTotal);
```

**Output:**

```text
Wrong total: 4500600250
Right total: 5350
```

The first line joined three pieces of text. The second converted each to a number first, then added. **Convert input to the right type as soon as it enters your program**, check that the conversion worked (that the result is not `NaN`), and the rest of your code can trust its values. You will build this habit properly in {{ch:validation}}.

## Truthy and falsy

There is one more conversion you need to understand before the next chapter, because decisions in JavaScript depend on it.

When JavaScript needs a true-or-false answer — for example, to decide whether to run some code — and you give it a value that is not a boolean, it converts that value to a boolean. Values that become `false` are called **falsy**. Everything else becomes `true` and is called **truthy**.

There are exactly **eight falsy values** in JavaScript. Learn this list:

```text
  false
  0
  -0
  0n          (BigInt zero)
  ""          (an empty string)
  null
  undefined
  NaN
```

**Everything else is truthy** — including some values that surprise people:

```js
console.log(Boolean("0"));
console.log(Boolean("false"));
console.log(Boolean(" "));
console.log(Boolean(-5));
```

**Output:**

```text
true
true
true
true
```

- `"0"` is a non-empty string — truthy, even though it looks like zero.
- `"false"` is a non-empty string of five letters — truthy.
- `" "`, a single space, is not empty — truthy.
- Any non-zero number, including negatives, is truthy.

Why does this matter? In the next chapter you will write decisions such as "if the user typed a name, greet them". Using truthiness is convenient — an empty name `""` is falsy — but it also catches people out: a quantity of `0` is falsy too, so code that means "if a quantity was given" will wrongly treat a genuine `0` as "not given". You will learn when to rely on truthiness and when to check precisely.

## From beginner to enterprise: types at every level

**Level 3 — A small program.** You write literals of the right type and use `typeof` when unsure.

**Level 4 — A real application.** Data arrives from forms, URLs, files and databases — usually as strings or `null`. The application converts and checks it at the point of entry: quantities to numbers, flags to booleans, missing values handled deliberately. Money is kept in the smallest unit.

**Level 5 — Professional engineering.** Teams use **TypeScript** ({{ch:typescript-basics}}) so that type mismatches are caught in the editor before the code ever runs, and **validation libraries** that check and convert all incoming data in one place ({{ch:validation}}). They agree conventions: amounts always in minor units, IDs always strings, dates in a standard text format.

**Level 6 — Enterprise.** Across many services, the types of data travelling between systems are defined formally in shared **schemas** — machine-readable descriptions of each field's type — so that a service written in JavaScript and one written in Java or Go agree exactly on what an "amount" or an "order ID" is. Mismatched types between systems — a number in one, a string in another; rupees in one, paisa in another — are a classic cause of large-scale incidents, so these contracts are reviewed and tested carefully.

## Real-world use cases

### Beginner level — A quantity box that adds strangely

**Situation:** a learner builds a page where a user types two quantities and sees the sum. Typing 2 and 3 shows 23.

**Cause:** form values are strings; `+` joins strings.

**Fix:** convert with `Number` before adding, and check for `NaN`.

### Intermediate level — Rounding errors on invoices

**Business problem:** a small business's invoices are sometimes off by one paisa compared with the accountant's figures.

**Technical problem:** prices were stored as decimal rupees and percentages applied repeatedly, with floating-point errors and inconsistent rounding at different steps.

**Solution:** store all amounts in paisa as whole numbers, apply the business's rounding rule exactly once per line item, and format to rupees only for display.

**Trade-off:** converting existing data and code takes effort, and every developer must remember the convention — which is why many teams name such variables with a unit suffix like `Paisa` or `Minor`.

### Advanced level — Corrupted large IDs

**Business problem:** a logistics company's tracking page occasionally shows the wrong parcel.

**Technical problem:** parcel IDs from the company's database are 64-bit integers. Some exceed `Number.MAX_SAFE_INTEGER`. When the API sent them as JSON numbers, JavaScript in the browser read them as `number`, and their last digits changed.

**Solution:** send IDs as strings in the API, and treat them as text everywhere in the frontend.

**Reasoning:** IDs are labels, not quantities; nobody adds two parcel IDs. Strings represent them exactly and avoid the problem entirely.

### Enterprise level — A type mismatch between services

**Business problem (illustrative):** after a new release, a bank's mobile app shows some balances 100 times too large.

**Technical problem:** one internal service changed its response from amounts in rupees to amounts in paisa, as part of a clean-up. Another service consuming that response was not updated and treated the new numbers as rupees.

**Solution and prevention:** shared, versioned schemas describing every field's type and unit; automated tests that check each service against the schemas of the services it uses (often called **contract tests**); and field names that carry their units, such as `balanceMinor` with a separate `currency` field.

**Lesson:** "it's a number" is not enough information. Real systems need to agree on the type, the unit and the meaning.

## Common mistakes

### Beginner mistake — Adding strings that look like numbers

**What it looks like:** `"4500" + "600"` giving `"4500600"`.

**Why it happens:** the values look like numbers but are strings, usually because they came from a form, a file or a URL.

**How to spot it:** `console.log(typeof value)`; or output with digits suspiciously joined together.

**How to fix it:** convert with `Number()` as soon as the value enters your program.

### Beginner mistake — Writing `"true"` instead of `true`

**What it looks like:** `const isAdmin = "false";` — and then the program treats the user as an admin.

**Why it happens:** quotes added out of habit.

**What happens:** `"false"` is a non-empty string, which is truthy. Any decision based on it behaves as if it were `true`. If this controls access, it is a security bug.

**How to fix it:** booleans have no quotes. When reading true/false settings from text (such as environment variables), compare explicitly: `value === "true"`.

### Beginner mistake — Off-by-one with indexes

**What it looks like:** using `city[city.length]` for the last character, and getting `undefined`.

**How to fix it:** the last index is always `length - 1`.

### Intermediate mistake — `NaN` spreading silently

**What it looks like:** an order total showing `NaN`, or `Rs NaN` on an invoice.

**Why it happens:** one input failed to convert (for example, an empty or misspelt value), and `NaN` spread through every later calculation.

**How to fix and prevent it:** check each converted value with `Number.isNaN()` immediately after converting, and reject bad input with a clear message, rather than letting it reach calculations.

### Production mistake — Money stored as decimals

**What it looks like:** balances or totals that differ by tiny amounts; reports that do not add up.

**Why it happens:** floating-point approximation, plus rounding applied inconsistently.

**How to prevent it:** smallest-unit whole numbers (or exact decimal types in the database), with one documented rounding rule.

### Enterprise mistake — Large integer IDs as numbers

**What it looks like:** records occasionally mixed up, only for recently created items (whose IDs are largest).

**Why it happens:** IDs beyond `Number.MAX_SAFE_INTEGER` lose precision when parsed as JavaScript numbers.

**How to prevent it:** transport large IDs as strings.

## Debugging and troubleshooting

| What you see | Likely cause | What to check |
|---|---|---|
| Numbers joined instead of added (`"4500600"`) | At least one value is a string | `typeof` each value; convert input with `Number()` |
| `NaN` in a result | A conversion failed somewhere earlier | Print each input and intermediate value; use `Number.isNaN()` |
| `0.30000000000000004` | Floating-point approximation | Use smallest units for money; round only for display |
| `Infinity` | Division by zero | Check divisors before dividing |
| A large ID has changed its last digits | Number larger than `MAX_SAFE_INTEGER` | Keep IDs as strings |
| A "false" setting acts as true | The value is the string `"false"`, which is truthy | Compare with `=== "true"` |
| `undefined` where you expected a character or value | Index past the end, or a value never assigned | Check indexes against `length - 1`; check the value was set |
| Strange characters like `Ã©` | Text encoding mismatch ({{ch:what-a-computer-is}}) | Use UTF-8 everywhere |

> [!TIP]
> When a value behaves oddly, log both the value **and** its type in one line: `console.log(value, typeof value)`. A surprising number of bugs are solved the moment you see `"4500" string` instead of `4500 number`.

## How a senior engineer thinks about types

> [!SENIOR]
> Experienced engineers treat the boundary of their program — where data comes in from users, files, other services or databases — as the place where types are decided:
>
> - **Convert and check at the edge.** As soon as data arrives, turn it into the right types and reject anything invalid. Inside the program, code can then trust its values.
> - **Never trust a "number" from outside.** It may be a string, empty, `null`, `NaN`, negative, or enormous.
> - **Pick representations deliberately.** Money in minor units with a currency. IDs as strings. Missing values as `null`, consistently.
> - **Let tools catch type mistakes.** TypeScript and validation libraries find in seconds what humans find in hours of debugging.
> - **Know the language's traps.** `+` joining strings, `typeof null`, the falsy list, floating point. Knowing them is not trivia; it is how you recognise a bug the moment you see its symptom.

## Exercises

### Exercise 1 — Predict the type

**Objective:** practise recognising types.

**What to do:** predict the output of each line, then check in the Node.js REPL.

```js
console.log(typeof 3.5);
console.log(typeof "3.5");
console.log(typeof (3.5 + "1"));
console.log(typeof (3.5 * "2"));
console.log(typeof false);
console.log(typeof "false");
console.log(typeof null);
console.log(typeof undefined);
```

<details>
<summary>Show the solution</summary>

**Output:**

```text
number
string
string
number
boolean
string
object
undefined
```

Walkthrough:

- `3.5` is a number; `"3.5"` is a string, because of the quotes.
- `3.5 + "1"` — one side is a string, so `+` joins: `"3.51"`, a string.
- `3.5 * "2"` — `*` converts the string to a number: `7`, a number.
- `false` is a boolean; `"false"` is a string.
- `typeof null` is `"object"` — the historic bug.
- `typeof undefined` is `"undefined"`.

**Common wrong approach:** forgetting that `+` and `*` behave differently with strings. `+` joins when either side is text; the other arithmetic operators convert text to numbers.

</details>

### Exercise 2 — Format a receipt line

**Objective:** practise template literals, money in minor units and number formatting.

**What to build:** given `const itemName = "Cotton shirt"`, `const unitPricePaisa = 129950` and `const quantity = 3`, print exactly:

```text
3 x Cotton shirt @ Rs 1299.50 = Rs 3898.50
```

**Hints:** calculate the total in paisa first; divide by 100 and use `toFixed(2)` only when building the text.

<details>
<summary>Show the solution</summary>

```js
const itemName = "Cotton shirt";
const unitPricePaisa = 129950;
const quantity = 3;

const lineTotalPaisa = unitPricePaisa * quantity;

const unitPriceText = (unitPricePaisa / 100).toFixed(2);
const lineTotalText = (lineTotalPaisa / 100).toFixed(2);

console.log(`${quantity} x ${itemName} @ Rs ${unitPriceText} = Rs ${lineTotalText}`);
```

**Output:**

```text
3 x Cotton shirt @ Rs 1299.50 = Rs 3898.50
```

Walkthrough:

- `lineTotalPaisa` is calculated with whole numbers: 129,950 × 3 = 389,850 — exact.
- For display only, each amount is divided by 100 and formatted to two decimal places with `toFixed(2)`, which returns a string. Brackets around the division make sure it happens before `toFixed`.
- The template literal builds the line, inserting each value with `${ }`.

**Common wrong approach:** converting to rupees first and then multiplying (`1299.5 * 3`). Here it happens to give the right answer, but with other prices, decimal arithmetic can produce results like `3898.4999999999995`. Calculate in whole units; format at the end.

</details>

### Exercise 3 — Clean up a user's input

**Objective:** practise string methods and conversion.

**Starting point:** a user typed their email and quantity into a form, which arrive as:

```js
const emailInput = "   Sara.Khan@Example.COM ";
const quantityInput = " 4 ";
```

**What to build:** produce a clean, lowercase email with no spaces, and a quantity that is a real number. Print both with their types. Then check what happens if `quantityInput` were `"four"`.

<details>
<summary>Show the solution</summary>

```js
const emailInput = "   Sara.Khan@Example.COM ";
const quantityInput = " 4 ";

const email = emailInput.trim().toLowerCase();
const quantity = Number(quantityInput);

console.log(email, typeof email);
console.log(quantity, typeof quantity);
console.log("Is the quantity invalid?", Number.isNaN(quantity));

const badQuantity = Number("four");
console.log("Bad quantity:", badQuantity, Number.isNaN(badQuantity));
```

**Output:**

```text
sara.khan@example.com string
4 number
Is the quantity invalid? false
Bad quantity: NaN true
```

Walkthrough:

- `emailInput.trim().toLowerCase()` calls two methods one after the other. `trim()` returns a new string without the spaces; `.toLowerCase()` is then called on *that* result. Joining method calls like this is called **chaining**.
- `Number(" 4 ")` ignores the surrounding spaces and gives the number 4.
- `Number.isNaN` confirms the conversion worked.
- `Number("four")` gives `NaN`, and `Number.isNaN` detects it — which is how a real form would decide to show "Please enter a number".

**Common wrong approach:** using `parseInt(quantityInput)` and not checking the result. `parseInt("4 boxes")` gives 4, silently accepting input that should probably be questioned, and `parseInt("")` gives `NaN` that may then spread through calculations.

</details>

### Exercise 4 — Find the bug (debugging scenario)

**Objective:** practise diagnosing a type bug.

**The scenario:** this code is meant to apply free delivery to orders of Rs 5,000 or more. A customer with a Rs 600 order reports getting free delivery.

```js
const orderTotalText = "600";          // arrived from a form
const freeDeliveryThreshold = "5000";  // read from a settings file

const getsFreeDelivery = orderTotalText >= freeDeliveryThreshold;
console.log("Free delivery?", getsFreeDelivery);
```

**What to do:** run it, explain why it prints `true`, and fix it.

**Hint:** when *both* sides of `>=` are strings, JavaScript compares them as text, character by character, like words in a dictionary.

<details>
<summary>Show the solution</summary>

**Output of the original:**

```text
Free delivery? true
```

**Why:** both values are strings, so `>=` compares them **alphabetically**, one character at a time, not numerically. It compares the first characters: `"6"` against `"5"`. In the character table, `"6"` comes after `"5"`, so `"600"` counts as "greater" — the comparison is decided there, and the lengths never matter. Exactly as `"banana"` comes after `"apple"` in a dictionary regardless of length.

**Fix:** convert both to numbers before comparing.

```js
const orderTotal = Number("600");
const freeDeliveryThreshold = Number("5000");

const getsFreeDelivery = orderTotal >= freeDeliveryThreshold;
console.log("Free delivery?", getsFreeDelivery);
```

**Output:**

```text
Free delivery? false
```

**Lesson:** the bug was invisible in the code — the comparison *looks* numeric. Only knowing that both values were strings, and how strings compare, explains it. This is why converting types at the edge of the program matters: the threshold should have been converted when the settings file was read, and the total when the form was received.

**Common wrong approach:** "fixing" it by changing the threshold to `"05000"` or similar. That treats the symptom; the real problem is comparing numbers stored as text.

</details>

## Summary

Every value has a **type**, which decides what you can do with it. JavaScript has seven **primitive** types — `number`, `string`, `boolean`, `undefined`, `null`, `bigint` and `symbol` — plus **objects**. Primitives are **immutable**. `typeof` reports a value's type, except that `typeof null` is `"object"` because of a historic bug. JavaScript is **dynamically typed**: variables can refer to values of any type.

**Numbers** cover integers and decimals. Learn `+ - * / % **`, the order of operations, and the `Math` tools. Decimals are **floating-point approximations**, so money is stored as whole numbers of the smallest unit. `NaN` marks failed calculations and spreads; check it with `Number.isNaN`. Whole numbers are exact only up to `Number.MAX_SAFE_INTEGER`; beyond that, use `BigInt` — or strings, for IDs.

**Strings** use double quotes, single quotes or backticks; **template literals** in backticks insert values with `${ }`. Use `\` to **escape** special characters. Strings have a **length** and zero-based **indexes**, and **methods** such as `trim`, `toUpperCase`, `includes`, `slice`, `replace` and `split` — all of which return new strings.

**Booleans** are `true` and `false`, without quotes. **`undefined`** means "not given"; **`null`** means "deliberately empty". Convert types explicitly with `Number`, `String` and `Boolean`. JavaScript also **coerces** types automatically: `+` joins if either side is a string, other arithmetic converts to numbers, and string comparisons are alphabetical. There are eight **falsy** values; everything else is **truthy**.

## Key terms

- **Data type** — A category of values that share the same operations, such as number or string.
- **Primitive** — A simple, single value that is not an object, such as a number, string or boolean.
- **Immutable** — Unable to be changed after creation; a new value must be created instead.
- **`typeof`** — An operator that gives the name of a value's type as a string.
- **Dynamically typed** — Describes a language in which variables have no fixed type and can refer to values of any type.
- **Statically typed** — Describes a language in which each variable has a declared type that is checked before the program runs.
- **Integer** — A whole number, with no fractional part.
- **Remainder operator (`%`)** — An operator that gives what is left over after dividing one number by another as many whole times as possible.
- **Order of operations** — The rules deciding which operators in an expression are applied first.
- **`Math`** — JavaScript's built-in collection of mathematical tools, such as `Math.round` and `Math.max`.
- **IEEE 754** — The international standard for storing floating-point numbers, used by JavaScript and most languages.
- **Minor unit** — The smallest unit of a currency, such as paisa or cents, used to store money as whole numbers.
- **`NaN`** — A special number value meaning "Not a Number", produced by calculations with no meaningful numeric result.
- **`Infinity`** — A special number value representing a result too large to store, or a non-zero number divided by zero.
- **`Number.MAX_SAFE_INTEGER`** — The largest whole number (9,007,199,254,740,991) that JavaScript's number type can represent exactly.
- **`BigInt`** — A JavaScript type for whole numbers of any size, written with an `n` at the end.
- **String** — A sequence of characters; text.
- **Escaping** — Putting a backslash before a character so that it is treated as part of the text, or to create special characters such as a new line.
- **Template literal** — A string written in backticks that can span lines and insert values using `${ }`.
- **Interpolation** — Inserting the value of an expression into a string.
- **Index** — The position of an item in a sequence, counted from 0.
- **Off-by-one error** — A bug caused by counting one too many or one too few, often because indexes start at 0.
- **Method** — A built-in ability belonging to a value, used with a dot and brackets, such as `name.trim()`.
- **Chaining** — Calling one method directly on the result of another, as in `text.trim().toLowerCase()`.
- **Boolean** — A value that is either `true` or `false`.
- **`null`** — A value a programmer uses to mean "deliberately empty".
- **Type conversion** — Changing a value from one type to another, such as a string to a number.
- **Type coercion** — Type conversion that JavaScript performs automatically when values of different types are combined.
- **Truthy** — Describes any value that counts as `true` when JavaScript needs a boolean.
- **Falsy** — Describes the eight values that count as `false` when JavaScript needs a boolean: `false`, `0`, `-0`, `0n`, `""`, `null`, `undefined` and `NaN`.
- **Schema** — A formal description of the structure and types of data, used to check data and to agree on it between systems.
- **Contract test** — An automated test that checks that one service sends and accepts data in the form another service expects.

## What comes next

You now know the kinds of values a program works with and how JavaScript converts between them. So far, though, every program has run straight from top to bottom, doing the same thing every time.

Real programs make choices: free delivery *if* the total is high enough; show an error *if* the password is wrong; give a discount *only if* the code is valid *and* not expired. In the next chapter, **Operators and Making Decisions**, you will learn to compare values precisely, combine conditions with "and", "or" and "not", and use `if`, `else` and `switch` to make your programs choose what to do.
