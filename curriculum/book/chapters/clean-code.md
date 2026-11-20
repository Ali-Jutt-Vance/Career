# Clean Code: Writing for Humans

> [!GOALS]
> - Explain why code is written mainly for **people**, and what unclear code costs a team.
> - Choose names that reveal intent, for variables, functions, booleans, classes, constants and files.
> - Write functions that do one thing, at one level of detail, with few parameters, no hidden side effects and shallow nesting.
> - Know when a comment helps and when it is a sign the code should change.
> - Handle errors cleanly: fail early, never swallow errors, and handle them at the right level.
> - Apply DRY, KISS and YAGNI — and recognise when "removing duplication" creates a worse problem.
> - Recognise common **code smells**, and **refactor** safely in small, tested steps.
> - Use tools — formatters, linters and type-checkers — so that humans can focus on what tools cannot check.

## Why this matters

Here is a function from a real-looking codebase. Read it and decide what it does:

```ts
// fragment
function proc(d: any[], f: boolean) {
  let r = 0;
  for (const x of d) {
    if (x.s === 2 || (f && x.s === 3)) {
      if (x.t > 500000) r += x.t * 0.98;
      else r += x.t;
    }
  }
  return r;
}
```

It took you a while, and you are still guessing. What is `s`? What do 2 and 3 mean? What is `f`? Why 0.98? Is `500000` rupees or paisa? Now imagine you must change it at 11 p.m. because invoices are wrong in production.

Here is the same logic, written for a reader:

```ts
// fragment
const BULK_ORDER_THRESHOLD_PAISA = 500_000;
const BULK_ORDER_DISCOUNT = 0.02;

function revenuePaisa(orders: Order[], includeRefundPending: boolean): number {
  return orders
    .filter((order) => order.status === "paid" || (includeRefundPending && order.status === "refundPending"))
    .reduce((sum, order) => sum + amountAfterBulkDiscount(order.totalPaisa), 0);
}

function amountAfterBulkDiscount(totalPaisa: number): number {
  return totalPaisa > BULK_ORDER_THRESHOLD_PAISA ? totalPaisa * (1 - BULK_ORDER_DISCOUNT) : totalPaisa;
}
```

Same behaviour. But now the code **tells you** what it does, and the business rule (a 2% discount on orders over Rs 5,000) is visible and named.

The computer does not care which version you write. **People** do. Code is read many more times than it is written: by the reviewer who checks it, by the teammate who fixes a bug in it, by the developer who adds a feature next year — very often, by you, after you have forgotten everything about it. Robert C. Martin, whose 2008 book *Clean Code* made the phrase famous, observed that time spent reading code far exceeds time spent writing it. Every unclear name and tangled function is a small tax that every future reader pays.

Unclear code also **hides bugs**. In the first version above, it is hard to notice that the discount rule might be wrong, because you cannot even see that there *is* a discount rule. Clean code is not about beauty. It is about making the next change **fast and safe**.

This chapter is about the everyday craft of writing code that other people can read. It applies to every language and every paradigm — the object-oriented code of {{ch:object-oriented-programming}} and the functional code of {{ch:functional-programming}} alike.

## The simple idea

Imagine two kitchens. In the first, every jar is labelled, knives are in one drawer, and each recipe card has clear steps. A new cook can start working in ten minutes. In the second, jars have no labels, spices are mixed in unmarked bags, and recipes are written in private abbreviations. Only the original cook can work there — and even they make mistakes when tired.

Clean code is the first kitchen: **things are named for what they are, kept where you expect them, and organised so that each part has one job.**

> [!ANALOGY]
> Clean code is a well-organised kitchen: labelled jars, one place for each tool, clear recipes — so anyone can cook safely.
>
> **Where the analogy breaks:** a kitchen's layout rarely changes, but code changes constantly. Clean code is not something you achieve once; it is a habit you apply every time you touch the code. And unlike a kitchen, code can be "tidied" by tools automatically — formatting, for example — leaving people to focus on the decisions only humans can make.

## The proper definition and key words

There is no single official definition of clean code. A practical one: **clean code is code that a competent developer who did not write it can read, understand and change correctly, quickly.**

The key words for this chapter:

- **Readability** — how easily a person can understand what code does and why.
- **Maintainability** — how easily code can be changed, fixed and extended.
- **Refactoring** — changing the structure of code **without changing its behaviour**, to make it easier to understand or change. The word was popularised by Martin Fowler's book *Refactoring* (1999; second edition 2018).
- **Code smell** — a surface sign in the code that often (not always) indicates a deeper design problem. The term comes from Kent Beck and Martin Fowler.
- **Technical debt** — the future cost created by choosing a quick or messy solution now. Like financial debt, it charges "interest": every later change takes longer until the debt is paid back by cleaning up. The metaphor was introduced by Ward Cunningham in 1992.
- **Linter** — a tool that analyses code for likely mistakes and style problems without running it. ESLint is the standard for JavaScript and TypeScript.
- **Formatter** — a tool that rewrites code layout (spaces, line breaks, quotes) into a consistent style automatically. Prettier is the most common for JavaScript and TypeScript.

## How it works inside: how people read code

To write for readers, it helps to know how reading code works in the human brain.

**Working memory is small.** Psychologists have found that people can hold only a handful of separate things in mind at once — often estimated at around four "chunks" for this kind of task. When you read `if (x.s === 2 || (f && x.s === 3))`, you must hold several unknowns in mind: what `x` is, what `s` is, what 2 and 3 mean, what `f` is. Working memory fills up, and understanding slows down or fails. A name like `order.status === "paid"` is a single chunk you already understand. **Good names reduce how much a reader must remember.**

**Readers build a mental model by skimming.** Experienced developers do not read code line by line from the top. They jump: function names first, then the parts that seem relevant. Code that is organised in **levels** — a short top-level function that calls clearly named helpers — supports this skimming. A 300-line function does not.

**Surprises are expensive.** When a function named `getUser` also changes the database, the reader's model is wrong, and they will make mistakes based on it. The **principle of least astonishment** says: code should do what a reasonable reader expects from its name and shape.

Everything in this chapter serves these three facts: keep the load on working memory low, support skimming, and avoid surprises.

## Names

Names are the most important tool you have for readability. You choose hundreds every day.

### Level 2 — Names should reveal intent

A name should answer: **what is this, and why does it exist?**

```ts
// fragment
// Bad: you must read the code to learn what these are
const d = 7;
const list = await fetchList();
const temp = user.createdAt > cutoff;

// Good: the name carries the meaning
const trialPeriodDays = 7;
const overdueInvoices = await fetchOverdueInvoices();
const isNewCustomer = user.createdAt > newCustomerCutoff;
```

Some practical rules:

- **Use full words.** `customerAddress`, not `custAddr`. Abbreviations save a few keystrokes for the writer and cost every reader a moment of decoding. Universally known abbreviations are fine: `id`, `url`, `html`, `api`.
- **Include units when there are units.** `timeoutMs`, `priceInPaisa`, `distanceKm`, `maxFileSizeBytes`. A huge number of real bugs come from mixing seconds and milliseconds, or rupees and paisa. A unit in the name makes the mistake visible: `setTimeout(callback, timeoutSeconds)` looks wrong immediately.
- **Make names searchable.** A single-letter name like `e` cannot be found with search. Single letters are acceptable only in tiny scopes where the meaning is obvious: `i` as a loop index, `(a, b) => a - b` in a sort comparison, `x` and `y` for coordinates.
- **Make length match scope.** A variable used for two lines can be short. A function exported and used across the whole codebase needs a fully descriptive name.
- **Avoid noise words.** `userData`, `userInfo`, `userObject` and `theUser` usually all mean just `user`. Add a word only if it distinguishes something: `user` and `userWithOrders` are different things.
- **Do not lie.** A variable called `userList` that holds a `Set`, or a function `isValid` that also saves the record, is worse than a meaningless name, because it makes the reader confident and wrong.

### Level 2 — Conventions by kind

| Kind | Form | Examples |
|---|---|---|
| Variables and properties | noun phrases, `camelCase` | `activeUsers`, `orderTotalPaisa` |
| Booleans | questions: `is`, `has`, `can`, `should` | `isPaid`, `hasStock`, `canRefund` |
| Functions and methods | verb phrases | `calculateShipping`, `sendReceipt`, `parseDate` |
| Classes, types, interfaces | noun phrases, `PascalCase` | `Invoice`, `PaymentProvider` |
| Constants that are true configuration | `UPPER_SNAKE_CASE` | `MAX_LOGIN_ATTEMPTS`, `VAT_RATE` |
| Files | `kebab-case` (a common convention in TypeScript projects) | `order-service.ts` |

Function verbs should also be **consistent**. If you use `get` for reading from memory, `fetch` for reading over the network, and `find` for searches that may return nothing, stick to it across the project. When `getUser` in one file reads a local object and `getUser` in another file makes an HTTP request, readers can no longer trust the verbs.

Boolean names should read naturally in an `if`: `if (order.isPaid)` reads as English. Avoid negative booleans: `if (!isNotDisabled)` forces the reader to untangle a double negative. Use `isEnabled` instead.

### Level 4 — Names from the business

The best names usually come from the people who use the software. If the warehouse staff say "pick list", "dispatch" and "back-order", use those words in the code, not `itemArray`, `sendOut` and `pendingThing`. Then developers and business people can talk about the same thing in the same words, and a bug report like "back-orders are dispatched twice" points straight to the code. Domain-Driven Design ({{ch:object-oriented-programming}}) calls this shared vocabulary the **ubiquitous language**.

> [!TIP]
> If you struggle to name something, that is useful information. A thing that is hard to name often does too many things, or is not yet clearly understood. Try describing it in one sentence; if the sentence needs "and", consider splitting it.

## Functions

### Level 2 — A function should do one thing

The most repeated advice about functions is that **a function should do one thing**. But what is "one thing"? A useful test: a function does one thing if all its steps are at **one level of detail** below its name, and you cannot meaningfully extract another function from it with a name that is not just a restatement of its code.

Consider this registration function:

```ts
// fragment
async function registerUser(input: { name: string; email: string; password: string }) {
  if (!input.name.trim()) throw new Error("Name is required");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) throw new Error("Invalid email");
  if (input.password.length < 10) throw new Error("Password too short");

  const existing = await db.query("SELECT id FROM users WHERE email = $1", [input.email]);
  if (existing.rows.length > 0) throw new Error("Email already registered");

  const hash = await bcrypt.hash(input.password, 12);
  const result = await db.query(
    "INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id",
    [input.name, input.email.toLowerCase(), hash],
  );

  await mailer.send({ to: input.email, subject: "Welcome!", html: "<h1>Thanks for joining</h1>" });
  return result.rows[0].id;
}
```

This function mixes **five** jobs at **different levels of detail**: high-level steps (register, welcome) sit next to regular expressions, SQL strings and hashing parameters. To understand "what does registration involve?", you must read all of it.

Here it is split by level:

```ts
// fragment
async function registerUser(input: NewUserInput): Promise<UserId> {
  const valid = validateNewUser(input);
  await ensureEmailIsFree(valid.email);
  const userId = await users.create({ ...valid, passwordHash: await hashPassword(valid.password) });
  await emails.sendWelcome(valid.email);
  return userId;
}
```

Now `registerUser` reads like a summary of the process. Each line is a step at the same level. If you want detail about one step — how is the password hashed? — you go to that function. A reader who only needs the overview stops here.

This idea is sometimes called the **stepdown rule**: code should read like a newspaper article, from the headline down to the details. High-level functions at the top, details below.

### Level 3 — A full worked example

Here is a complete, runnable example of this kind of refactoring. The "before" version computes a delivery quote:

```ts
type Parcel = { weightKg: number; city: string; express: boolean; fragile: boolean };

function quote(p: Parcel): string {
  let c = 0;
  if (p.city === "Lahore" || p.city === "Karachi" || p.city === "Islamabad") {
    c = 25000;
  } else {
    c = 40000;
  }
  if (p.weightKg > 2) {
    c += Math.ceil(p.weightKg - 2) * 8000;
  }
  if (p.express) {
    c = c * 1.5;
  }
  if (p.fragile) {
    c += 15000;
  }
  return "Rs " + (Math.round(c) / 100).toFixed(2);
}

console.log(quote({ weightKg: 1, city: "Lahore", express: false, fragile: false }));
console.log(quote({ weightKg: 4.2, city: "Multan", express: true, fragile: true }));
```

**Output:**

```text
Rs 250.00
Rs 1110.00
```

And the "after" version:

```ts
type Parcel = { weightKg: number; city: string; express: boolean; fragile: boolean };

const MAJOR_CITIES = new Set(["Lahore", "Karachi", "Islamabad"]);
const BASE_RATE_MAJOR_CITY_PAISA = 25_000;
const BASE_RATE_OTHER_CITY_PAISA = 40_000;
const INCLUDED_WEIGHT_KG = 2;
const RATE_PER_EXTRA_KG_PAISA = 8_000;
const EXPRESS_MULTIPLIER = 1.5;
const FRAGILE_HANDLING_FEE_PAISA = 15_000;

function deliveryQuote(parcel: Parcel): string {
  return formatRupees(deliveryCostPaisa(parcel));
}

function deliveryCostPaisa(parcel: Parcel): number {
  let cost = baseRatePaisa(parcel.city) + extraWeightChargePaisa(parcel.weightKg);
  if (parcel.express) cost *= EXPRESS_MULTIPLIER;
  if (parcel.fragile) cost += FRAGILE_HANDLING_FEE_PAISA;
  return Math.round(cost);
}

function baseRatePaisa(city: string): number {
  return MAJOR_CITIES.has(city) ? BASE_RATE_MAJOR_CITY_PAISA : BASE_RATE_OTHER_CITY_PAISA;
}

function extraWeightChargePaisa(weightKg: number): number {
  const extraKg = Math.max(0, Math.ceil(weightKg - INCLUDED_WEIGHT_KG));
  return extraKg * RATE_PER_EXTRA_KG_PAISA;
}

function formatRupees(paisa: number): string {
  return `Rs ${(paisa / 100).toFixed(2)}`;
}

console.log(deliveryQuote({ weightKg: 1, city: "Lahore", express: false, fragile: false }));
console.log(deliveryQuote({ weightKg: 4.2, city: "Multan", express: true, fragile: true }));
```

**Output:**

```text
Rs 250.00
Rs 1110.00
```

What changed, and why:

- **Same output.** This is refactoring: structure changed, behaviour did not. We checked by running both with the same inputs. (In real work, automated tests do this checking — {{ch:testing}}.)
- **Magic numbers became named constants.** `25000`, `2`, `8000`, `1.5` and `15000` were **magic numbers**: values whose meaning you had to guess. Now each has a name that states what it is and its unit. When the courier raises the fragile fee, there is exactly one place to change, and you can find it by searching for "FRAGILE".
- **Numeric separators.** `25_000` is the same number as `25000`; the underscore is allowed in JavaScript number literals purely for readability.
- **The list of cities became a `Set`** with a name. Adding Peshawar is now a one-word change, and `MAJOR_CITIES.has(city)` reads like the business rule.
- **Each function does one thing at one level.** `deliveryQuote` formats a cost. `deliveryCostPaisa` combines the pricing rules. `baseRatePaisa` and `extraWeightChargePaisa` each implement one rule. Each is short enough to verify by reading.
- **`Math.max(0, ...)`** makes the "no extra charge under 2 kg" rule explicit, instead of hiding it inside an `if`.
- **A short name became a clear one.** `quote` and `c` became `deliveryQuote` and `cost`. `p` became `parcel`.

Notice that `deliveryCostPaisa` still uses `let` and two short `if` statements. Clean code is not about removing every `if` or every mutable variable; this version is clear, and that is the goal.

Is the second version longer? Yes, by lines. But "short" is not the goal; **easy to understand and change** is. Each piece of the second version can be understood in seconds, and the business rules are visible by name.

### Level 3 — Guard clauses instead of deep nesting

Deep nesting is one of the fastest ways to overload working memory. Each level of `if` adds a condition the reader must remember:

```ts
// fragment
function canCheckout(cart: Cart, user: User | undefined): string {
  if (user) {
    if (user.isVerified) {
      if (cart.items.length > 0) {
        if (cart.totalPaisa <= user.creditLimitPaisa) {
          return "ok";
        } else {
          return "over credit limit";
        }
      } else {
        return "cart is empty";
      }
    } else {
      return "verify your email first";
    }
  } else {
    return "please log in";
  }
}
```

To understand the `"cart is empty"` line, you must look up and track three open conditions. Compare the version with **guard clauses** — early returns that handle each problem case first:

```ts
type Cart = { items: string[]; totalPaisa: number };
type User = { isVerified: boolean; creditLimitPaisa: number };

function checkoutProblem(cart: Cart, user: User | undefined): string | null {
  if (!user) return "please log in";
  if (!user.isVerified) return "verify your email first";
  if (cart.items.length === 0) return "cart is empty";
  if (cart.totalPaisa > user.creditLimitPaisa) return "over credit limit";
  return null;
}

const user: User = { isVerified: true, creditLimitPaisa: 1_000_000 };
console.log(checkoutProblem({ items: [], totalPaisa: 0 }, user));
console.log(checkoutProblem({ items: ["tv"], totalPaisa: 9_000_000 }, user));
console.log(checkoutProblem({ items: ["pen"], totalPaisa: 5_000 }, user));
console.log(checkoutProblem({ items: ["pen"], totalPaisa: 5_000 }, undefined));
```

**Output:**

```text
cart is empty
over credit limit
null
please log in
```

- Each guard checks one problem and leaves the function immediately. After a guard, the reader can **forget** that condition: it is handled.
- The "happy path" — everything fine — is the last line, not buried at the deepest indentation.
- The function was also renamed from `canCheckout` (which sounds like it returns a boolean) to `checkoutProblem`, returning `null` when there is no problem. The name now matches what it returns.

### Level 3 — Parameters

Every parameter is something a caller must provide correctly and a reader must understand. Fewer is better.

**Boolean flag arguments** are a particular problem:

```ts
// fragment
createUser("Sana", "sana@example.com", true, false, true);
```

What do `true, false, true` mean? Nobody can tell without opening the function. Two fixes:

```ts
// fragment
// 1. An options object with named fields
createUser({ name: "Sana", email: "sana@example.com", isAdmin: true, sendWelcomeEmail: false, verified: true });

// 2. Separate functions, when a flag switches between two different behaviours
createAdminUser(...);
createCustomer(...);
```

An **options object** (also called a **parameter object**) names every value at the call site and lets you add optional fields later without breaking callers. In TypeScript, give it a type so the compiler checks the names.

A flag that makes a function do **two different things** — `render(data, isPrintVersion)` — is usually a sign the function should be two functions. A flag that slightly adjusts one behaviour — `formatDate(date, { includeTime: true })` — is fine in an options object.

Also watch for **data clumps**: the same group of parameters travelling together through many functions — `(street, city, postcode)` everywhere. That group is a missing type: `Address`.

### Level 4 — No hidden side effects; commands and queries

A function's name is a promise. A function called `getUser` that also updates "last seen" in the database, or `isValid` that also saves the form, breaks that promise. Callers will call it in places where the side effect is wrong — in a loop, in a log statement, in a test — and cause bugs that are very hard to trace.

A helpful guideline from Bertrand Meyer, called **command–query separation**: a function should either be a **query** (answers a question, changes nothing) or a **command** (changes something, and returns nothing or only a status) — not both.

```ts
// fragment
// Surprising: a query with a side effect
async function getUser(id: string) {
  const user = await users.findById(id);
  await users.updateLastSeen(id, new Date()); // hidden!
  return user;
}

// Clear: separate query and command
async function getUser(id: string) {
  return users.findById(id);
}
async function recordUserVisit(id: string) {
  await users.updateLastSeen(id, new Date());
}
```

There are practical exceptions (a `stack.pop()` both changes the stack and returns a value, and everyone expects that), but the guideline is right far more often than it is wrong. It is closely related to the pure functions of {{ch:functional-programming}}.

### How long should a function be?

There is no correct number. Some style guides suggest "under 20 lines" or "fits on one screen". A better test: **can you understand what the function does, and convince yourself it is correct, in one reading?** A 40-line function that is a flat list of validations may be fine. A 15-line function with three levels of nesting and four variables that change may not be.

A measurable signal is **cyclomatic complexity**: roughly, the number of independent paths through a function — one, plus one for each `if`, loop, `case`, `&&`, `||` and `?:`. A function with complexity 25 needs at least 25 test cases to try every path, and is almost certainly too hard to read. ESLint's `complexity` rule can warn when a function passes a limit you choose (10 is a common starting point).

## Comments

### Level 2 — Comments should explain why, not what

Code already says **what** it does. A comment that repeats it adds reading time and nothing else — and it can become a lie when someone updates the code but not the comment.

```ts
// fragment
// Bad: repeats the code
// increment retries by one
retries++;

// Bad: explains unclear code instead of fixing it
// check if user can get discount (premium or 5+ orders and not suspended)
if ((u.t === "P" || u.oc >= 5) && !u.s) { ... }

// Better: make the code say it
const isLoyalCustomer = user.tier === "premium" || user.orderCount >= 5;
if (isLoyalCustomer && !user.isSuspended) { ... }
```

Good comments explain what the code **cannot** say:

```ts
// fragment
// Why: a non-obvious reason
// The payment provider rejects amounts with more than 2 decimal places,
// so we round here rather than at display time.
const amount = Math.round(totalPaisa) / 100;

// Warning of consequences
// Changing this order breaks invoices already issued: the PDF template
// reads line items by position. See ticket BILL-412.
const INVOICE_COLUMNS = ["sku", "description", "qty", "unitPrice", "total"];

// Explaining a complex pattern
// Pakistani mobile number: optional +92 or 0, then 3, then 9 digits.
const PK_MOBILE = /^(?:\+92|0)?3\d{9}$/;

// A workaround, with where to learn more
// Work around a library bug where empty arrays are serialised as null.
// Remove when we upgrade past the version that fixes it (see its changelog).
const tags = response.tags ?? [];
```

### Kinds of comment to avoid

- **Commented-out code.** Delete it. Version control ({{ch:git}}) remembers every old version. Commented-out code confuses readers ("is this needed? is it a hint?") and rots, because nobody updates it.
- **Change logs and author notes** in comments ("modified by Ali, March: fixed bug"). Git records who changed what, when and why.
- **Closing-brace comments** (`} // end if`). If you need them, the block is too long.
- **Vague TODOs.** `// TODO: fix this` helps nobody. A useful TODO says what and why, and ideally links to a ticket: `// TODO(BILL-418): support multiple currencies once the pricing API returns currency codes.`

### Documentation comments

Public functions in shared code — especially libraries and modules used by other teams — benefit from **documentation comments** in the JSDoc format (a `/** ... */` block). Editors show them when someone hovers over a function name:

```ts
/**
 * Splits a total amount into `parts` instalments that add up exactly to the total.
 * Any remainder paisa are added to the first instalments, one each.
 *
 * @param totalPaisa - The full amount, in paisa. Must be a non-negative integer.
 * @param parts - Number of instalments. Must be a positive integer.
 * @returns The instalment amounts in paisa, largest first.
 */
function splitIntoInstalments(totalPaisa: number, parts: number): number[] {
  const base = Math.floor(totalPaisa / parts);
  const remainder = totalPaisa % parts;
  return Array.from({ length: parts }, (_, i) => (i < remainder ? base + 1 : base));
}

console.log(splitIntoInstalments(100_000, 3));
```

**Output:**

```text
[ 33334, 33333, 33333 ]
```

The comment documents what types cannot express: units, rules about valid values, and how the remainder is distributed — the kind of detail a caller needs and would otherwise have to discover by reading the code. (`Array.from({ length: parts }, fn)` creates an array of `parts` elements by calling `fn` with each index.)

## Formatting and consistency

Consistent formatting does not make code correct, but inconsistent formatting makes every reader work harder — and turns code reviews into arguments about spaces.

The modern answer is: **do not format by hand, and do not debate it.** Use a formatter.

- **Prettier** reformats JavaScript, TypeScript, CSS, HTML, JSON and Markdown into one consistent style. It has very few options on purpose. You run it automatically when you save a file in your editor, and again before code is committed.
- **ESLint** finds likely bugs and risky patterns: unused variables, missing `await`, comparisons with `==`, functions that are too complex. With `typescript-eslint`, it can use type information too.
- **The TypeScript compiler** in strict mode is itself a powerful cleanliness tool: it catches whole categories of error before code runs ({{ch:typescript-basics}}).

A minimal setup in a project looks like this:

```bash
npm install --save-dev prettier eslint typescript-eslint @eslint/js
npx prettier --write .        # format every file
npx eslint .                  # report problems
```

You will automate these checks so that every change is checked before it can be merged, in {{ch:cicd}} and {{ch:github-actions}}.

Beyond tools, **vertical layout** matters:

- Put related lines together and separate groups with a blank line, like paragraphs.
- Declare variables close to where they are used.
- Keep a function's helpers near it, below it (the stepdown rule).
- Keep files focused. A file of 2,000 lines usually contains several things that each deserve their own file.

> [!SENIOR]
> Agree on formatting once, encode it in tool configuration, and never discuss it in code review again. Review time is precious; spend it on design, naming, correctness and tests — the things tools cannot check.

## Error handling

Error handling is where much code becomes messy, and where messy code causes the worst production problems. You learned the mechanics of errors in {{ch:errors-and-debugging}}. Here are the cleanliness rules.

### Never swallow errors

```ts
// fragment
try {
  await chargeCustomer(order);
} catch (error) {
  // ignore
}
markOrderAsPaid(order);
```

This is one of the most damaging patterns in software. If the charge fails, the error disappears, and the order is marked as paid anyway. Nobody is told. The bug is found weeks later by an accountant.

Every `catch` should do at least one of these: **recover** properly (retry, use a fallback that is genuinely correct), **add context and rethrow**, or **report** (log with enough detail) and convert the error into an appropriate response. An empty `catch` is almost never right; if it truly is, write a comment explaining why.

### Fail early and loudly

Check inputs at the **start** of a function and stop immediately with a clear error. A problem detected early, near its cause, is easy to diagnose. A problem detected later — after bad data has been saved and passed through five functions — is not.

```ts
function averageRating(ratings: readonly number[]): number {
  if (ratings.length === 0) throw new RangeError("averageRating: ratings must not be empty");
  if (ratings.some((r) => r < 1 || r > 5)) throw new RangeError("averageRating: each rating must be 1–5");
  return ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
}

console.log(averageRating([5, 4, 4]).toFixed(2));
try {
  averageRating([]);
} catch (error) {
  console.log((error as Error).message);
}
```

**Output:**

```text
4.33
averageRating: ratings must not be empty
```

Without the first check, an empty array would give `0 / 0`, which is `NaN` — a value that silently spreads through every later calculation and shows up as "NaN" on a customer's screen. The error message names the function and the rule, so whoever sees it in a log knows exactly what went wrong.

### Use errors, not special return values, for exceptional cases

Returning `-1`, `null` or `false` to mean "something went wrong" forces every caller to remember to check — and they will forget. Throw a clear error for genuinely exceptional cases, or use a typed `Result` for expected failures, as you saw in {{ch:functional-programming}}. Either way, the failure is impossible to ignore by accident.

### Handle errors at the right level

Low-level code usually **cannot** decide what to do about a failure. The function that reads from the database does not know whether the caller is a web request (which should return an HTTP error) or a nightly job (which should retry). So low-level code throws, adding context if helpful; a **boundary** — the HTTP request handler, the job runner — catches, logs and responds. You will build exactly this structure in {{ch:error-handling}}.

### Add context when rethrowing

```ts
// fragment
try {
  return JSON.parse(raw);
} catch (error) {
  throw new Error(`Invalid settings file at ${path}`, { cause: error });
}
```

The `cause` option (supported in all current JavaScript runtimes) keeps the original error attached, so the full chain — "invalid settings file" caused by "unexpected token at position 412" — is visible in logs.

## Duplication: DRY, and its limits

### DRY — Don't Repeat Yourself

The **DRY** principle, from the book *The Pragmatic Programmer* by Andrew Hunt and David Thomas (1999), says: **every piece of knowledge should have a single, authoritative representation in the system.**

Notice the word **knowledge**. DRY is about business rules, formulas and decisions, not about lines that happen to look alike. If the rule "orders over Rs 5,000 ship free" is written in the checkout page, the cart page, the email template and the invoice generator, then one day someone changes it to Rs 6,000 in three places and forgets the fourth. Customers see one promise in the cart and are charged differently at checkout.

The fix is to give the knowledge one home:

```ts
// fragment
export const FREE_SHIPPING_THRESHOLD_PAISA = 500_000;
export const qualifiesForFreeShipping = (subtotalPaisa: number) => subtotalPaisa >= FREE_SHIPPING_THRESHOLD_PAISA;
```

### The wrong abstraction

DRY applied mechanically causes a different problem. Two pieces of code can **look** the same today but represent **different knowledge** that will change for different reasons:

```ts
// fragment
// Two rules that happen to be identical today
const validateUsername = (s: string) => s.length >= 3 && s.length <= 20;
const validateCouponCode = (s: string) => s.length >= 3 && s.length <= 20;
```

An eager developer merges them into `validateShortString`. Next month, coupon codes must be uppercase and exactly 8 characters. Now `validateShortString` needs a parameter `isCoupon`, then another for a third use… and soon the "shared" function is a tangle of flags that serves nobody well. The software developer and teacher Sandi Metz summarised this in a widely quoted line: **"duplication is far cheaper than the wrong abstraction."**

A practical guideline, often called the **rule of three**: tolerate duplication the first and second time; extract a shared function when you see the same **knowledge** a third time and you understand what the cases truly have in common. And always ask: *if one of these changes, must the other change too?* If yes, they are the same knowledge — merge them. If not, they only look alike — leave them.

### KISS and YAGNI

Two more short principles balance the urge to engineer:

- **KISS — "Keep it simple"** (often expanded with a less polite word at the end). Choose the simplest solution that solves the actual problem. Simple code has fewer places for bugs to hide.
- **YAGNI — "You aren't gonna need it."** This comes from the Extreme Programming movement of the late 1990s. Do not build features, options or abstractions for needs you **imagine** the future might bring. Build for today's real requirements, and keep the code clean so tomorrow's changes are easy. Most predicted needs never arrive; the ones that do arrive look different from the prediction.

> [!WARNING]
> Over-engineering is a real failure mode, not a sign of skill. A plugin system for a feature that has one plugin, an interface with one implementation "in case we switch databases", and a configuration option nobody uses all cost reading time and maintenance forever. Add flexibility when a second real case appears.

## Code smells

A **code smell** is a hint that something may be wrong. Smells are not rules: each one sometimes has a good reason. But each is worth a second look. The common ones:

| Smell | What it looks like | Usual remedy |
|---|---|---|
| **Long function** | Many steps at mixed levels of detail | Extract functions with intent-revealing names |
| **Long parameter list** | Four or more parameters, boolean flags | Parameter object; split the function |
| **Duplicated knowledge** | The same rule in several places | One named function or constant |
| **Large class / God class** | A class that does everything ({{ch:object-oriented-programming}}) | Split by responsibility |
| **Magic numbers and strings** | `if (status === 3)`, `* 0.17` | Named constants or union types |
| **Primitive obsession** | Plain strings and numbers for money, emails, statuses | Small types: `Money`, `EmailAddress`, a status union |
| **Data clumps** | The same fields always passed together | A type for the group |
| **Feature envy** | A function that uses another object's data more than its own | Move the function to where the data lives |
| **Shotgun surgery** | One change requires edits in many files | Gather the related knowledge into one place |
| **Dead code** | Functions, branches and variables never used | Delete them |
| **Speculative generality** | Hooks, options and abstractions "for later" | Remove them (YAGNI) |
| **Deep nesting** | Many levels of `if` and loops | Guard clauses; extract functions |
| **Comments explaining unclear code** | Every few lines needs a comment | Rename and extract until the code is clear |

**Primitive obsession** deserves a concrete example, because TypeScript makes the fix cheap:

```ts
// fragment
// Primitive obsession: any string is accepted
function updateStatus(orderId: string, status: string) { ... }
updateStatus("ORD-1", "shiped"); // typo compiles fine, and corrupts data

// A union type: only real statuses compile
type OrderStatus = "pending" | "paid" | "shipped" | "delivered" | "cancelled";
function updateStatus(orderId: string, status: OrderStatus) { ... }
updateStatus("ORD-1", "shiped"); // compile error
```

## Refactoring safely

### Level 3 — What refactoring is, and is not

**Refactoring** means improving the structure of code without changing what it does. It is **not** adding features, and it is **not** rewriting from scratch. It is done in **small steps**, each of which keeps the program working.

The safe loop:

```text
  ┌──────────────────────────────────────────────┐
  │ 1. Make sure tests cover the behaviour       │
  │ 2. Make ONE small structural change          │
  │ 3. Run the tests                             │
  │      pass → commit, go to step 2             │
  │      fail → undo the change, take a smaller  │
  │             step                             │
  └──────────────────────────────────────────────┘
```

Without tests, refactoring is guesswork: you cannot know whether behaviour changed. That is why {{ch:testing}} matters so much. If code has no tests, the first refactoring step is to add some — even rough ones that just record what the code currently outputs for a range of inputs (sometimes called **characterisation tests**).

### Common refactorings

Martin Fowler's *Refactoring* catalogues dozens of named refactorings. The ones you will use every week:

- **Rename** a variable, function, class or file. Your editor does this safely across the whole project (in VS Code, press F2 on a name).
- **Extract function**: move a group of lines into a new, well-named function.
- **Inline**: the reverse — replace a function or variable that adds nothing with its content.
- **Extract variable**: give a complex expression a name — `const isEligibleForRefund = ...`.
- **Replace magic number with named constant.**
- **Introduce parameter object.**
- **Replace nested conditional with guard clauses.**
- **Replace conditional with polymorphism** ({{ch:object-oriented-programming}}).
- **Move function** to the module or class whose data it uses.

Modern editors automate many of these, which makes them both fast and safe. Prefer the editor's refactoring commands over manual edits for renames and extractions.

### Refactoring versus rewriting

When code is very messy, it is tempting to throw it away and rewrite it. Rewrites are much riskier than they look. The old code contains years of small bug fixes and special cases that nobody remembers; the rewrite will miss them. Meanwhile, the old system still needs fixes, so the team maintains two systems. Joel Spolsky's well-known essay "Things You Should Never Do" describes how a rewrite of the Netscape browser contributed to the company losing its market.

In most situations, **incremental refactoring** — improving the code piece by piece while it keeps working — is safer. A large-scale version of this is called the **strangler fig** pattern: build new parts beside the old system and move traffic to them gradually until the old system can be removed ({{ch:microservices}}).

### The Boy Scout Rule

"Always leave the campground cleaner than you found it." Robert C. Martin applied this scouting rule to code: whenever you work in a file, make **one small improvement** — a better name, a removed dead function, an extracted helper. Small, constant improvements keep a codebase healthy without ever needing a big, risky clean-up project.

Keep these improvements **small and separate**. A pull request that fixes a bug *and* reformats three files *and* renames forty variables is very hard to review. Many teams put clean-up in a separate commit or pull request ({{ch:code-review-and-documentation}}).

## Technical debt

**Technical debt** is the gap between how the code is and how it should be, measured in the extra time every change now costs.

Not all debt is bad. Ward Cunningham's original point was that shipping imperfect code **to learn something** — and then going back to improve it with what you learned — is a reasonable trade, like taking a loan to buy something useful. The danger is never paying it back.

Martin Fowler describes a useful way to classify debt, the **technical debt quadrant**, along two questions: was it **deliberate** or **inadvertent**, and **reckless** or **prudent**?

| | Reckless | Prudent |
|---|---|---|
| **Deliberate** | "We don't have time for design." | "We must ship now and will deal with the consequences." |
| **Inadvertent** | "What's layering?" | "Now we know how we should have done it." |

Prudent, deliberate debt is a business decision. Reckless debt is just mess. Inadvertent, prudent debt is unavoidable — you always learn as you build — and it is the reason refactoring never stops.

In professional teams, debt is made **visible**: written down as tickets, explained in terms of business cost ("each pricing change takes three days instead of half a day, because the rule is copied in six places"), and paid down steadily — often by reserving part of the team's time, or by cleaning up the area around each new feature.

## From beginner to enterprise

**Level 3 — your own code.** Good names, small functions, guard clauses, no magic numbers, no swallowed errors. Run Prettier and ESLint.

**Level 4 — a team project.** Shared tool configuration committed to the repository, so every developer and every automated check uses the same rules. Agreed naming conventions. Code review that focuses on clarity and design ({{ch:code-review-and-documentation}}).

**Level 5 — professional practice.** Linting and type-checking run automatically on every pull request and block merging on failure ({{ch:cicd}}). Complexity limits. Clean-up as part of normal feature work. Technical debt tracked and discussed with product managers in business terms.

**Level 6 — large organisations.** Code-quality platforms (for example SonarQube) track duplication, complexity and test coverage across hundreds of repositories, and show trends. Some companies have formal readability programmes; Google, for instance, has publicly described its "readability" certification, where engineers must be approved as fluent in a language's style before they can approve code in that language. At this scale, consistency across teams becomes as important as quality within one.

## Common mistakes

### Beginner: cryptic short names

`d`, `tmp`, `data2`, `x1`. **Why:** typing feels slower than thinking. **Consequence:** every reader decodes them, and mistakes happen when two similar names are confused. **Fix:** rename with your editor's rename command; it takes seconds.

### Beginner: comments instead of clear code

A comment above every line explaining what it does. **Fix:** extract variables and functions whose names carry the meaning; keep comments for "why".

### Intermediate: "clean" code that is just fragmented

Splitting a clear 20-line function into ten 2-line functions spread across files, so the reader must jump everywhere to follow one simple flow. **Why:** following "small functions" as a rule instead of as a means to clarity. **Fix:** extract when the new name **adds understanding**, not just to reduce line counts.

### Intermediate: premature abstraction

Building a generic `DataProcessor<T>` framework for two use cases that share three lines. **Fix:** rule of three; YAGNI; duplication is cheaper than the wrong abstraction.

### Intermediate: mixing refactoring with behaviour changes

A commit that renames things and also changes a calculation. If the calculation is wrong, the reviewer probably missed it among the renames. **Fix:** separate refactoring commits from behaviour-changing commits.

### Production: swallowed and context-free errors

Empty `catch` blocks, or `throw new Error("failed")`. When production fails, logs say nothing useful. **Fix:** never swallow; always include what was being attempted and with which identifiers (order id, file path) — but never secrets such as passwords or tokens ({{ch:logging}}).

### Enterprise: big-bang rewrites

"Version 2 will fix everything," built for a year beside the old system. **Consequence:** the old system keeps changing, the new one never catches up, and both must be maintained. **Fix:** incremental refactoring and the strangler fig approach.

## Debugging and troubleshooting

Clean code is easier to debug, and debugging tells you where code is not clean:

- **A stack trace full of anonymous functions** (`at <anonymous>`) is hard to follow. Named functions — even named arrow functions assigned to `const` — produce readable stack traces.
- **A bug that "should be impossible"** often hides in a function that does too many things. Extract its pieces and test each separately; the bug usually becomes obvious in one of them.
- **A bug you fixed reappears elsewhere**: duplicated knowledge. The same logic exists in a second place. Search for it and give it a single home.
- **An error message you cannot trace to code**: messages without context. Add the function name and identifiers to error messages so a log line leads straight to the source.

## Security and performance

**Security.** Clean code supports security directly. Validation and permission checks that live in **one** well-named place are easy to audit and hard to bypass; checks copied across twenty handlers will, sooner or later, be missing from the twenty-first. Clear error handling also avoids leaking internal details: errors are logged in full internally and replaced with safe messages at the boundary ({{ch:error-handling}}).

**Performance.** Clean code and fast code rarely conflict in application development. The extra function calls from small functions cost nanoseconds, and modern engines often inline them anyway. When performance does matter, clean code makes the slow part **easy to find** (profiling points to a named function) and **easy to change** (the logic exists in one place). Optimise only what measurement shows is slow ({{ch:performance-engineering}}), and when an optimisation makes code less clear, add a comment explaining why it is needed.

## How a senior engineer thinks about this

Senior engineers treat clean code as **a means, not an end**. The end is a team that can change software quickly and safely. So they:

- **Focus on what matters most:** names, boundaries between modules, error handling and tests. Formatting is automated.
- **Match effort to lifespan.** A one-off script can be quick and rough. Code at the heart of billing, used for years by dozens of developers, deserves care.
- **Explain the cost in business terms**, not aesthetics: "this duplication caused two pricing bugs last quarter".
- **Improve continuously** in small steps, rather than demanding big clean-up projects.
- **Prefer clear over clever.** Clever code is fun to write and expensive to read.
- **Stay humble about rules.** Every guideline in this chapter has exceptions. The test is always: will the next reader understand this, quickly and correctly?

## Exercises

### Exercise 1 — Rename for meaning

**Objective:** practise intent-revealing names.
**Starting point:**

```ts
// fragment
function chk(u: { a: number; c: string; v: boolean }, l: number): boolean {
  const t = Date.now() - u.a;
  return u.v && u.c === "PK" && t < l * 86400000;
}
```

Here `u.a` is the time the account was created (in milliseconds since 1970), `u.c` is a country code, `u.v` means the email is verified, and `l` is a number of days.

**What to build:** rename everything, and replace the magic number. Then make the function pure by passing the current time as a parameter. Test it with an account created 3 days ago and a 7-day limit.

<details>
<summary>Show the solution</summary>

```ts
type Account = { createdAtMs: number; countryCode: string; isEmailVerified: boolean };

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function isEligibleForNewCustomerOffer(account: Account, offerWindowDays: number, nowMs: number): boolean {
  const accountAgeMs = nowMs - account.createdAtMs;
  return account.isEmailVerified && account.countryCode === "PK" && accountAgeMs < offerWindowDays * MS_PER_DAY;
}

const now = Date.UTC(2026, 4, 10);
const threeDaysAgo = now - 3 * MS_PER_DAY;

console.log(isEligibleForNewCustomerOffer({ createdAtMs: threeDaysAgo, countryCode: "PK", isEmailVerified: true }, 7, now));
console.log(isEligibleForNewCustomerOffer({ createdAtMs: threeDaysAgo, countryCode: "PK", isEmailVerified: true }, 2, now));
console.log(isEligibleForNewCustomerOffer({ createdAtMs: threeDaysAgo, countryCode: "AE", isEmailVerified: true }, 7, now));
```

**Output:**

```text
true
false
false
```

**Walkthrough:** the function name now states the business question. Property names include their meaning and unit (`createdAtMs`). `86400000` became `MS_PER_DAY`, written as `24 * 60 * 60 * 1000` so a reader can verify it. The parameter `l` became `offerWindowDays`, with its unit. Passing `nowMs` in makes the function testable on any date (`Date.UTC(2026, 4, 10)` is 10 May 2026, midnight UTC). The country code `"PK"` could also become a parameter or constant if other countries might be added — but only if that is a real need (YAGNI).

**Common wrong approaches:** renaming to equally vague words (`data`, `limit`, `check`); keeping `Date.now()` inside, which makes tests depend on the real clock.

</details>

### Exercise 2 — Untangle nested conditions

**Objective:** practise guard clauses and extraction.
**Starting point:**

```ts
// fragment
function refund(order: Order, now: Date): string {
  if (order.status === "delivered") {
    if (now.getTime() - order.deliveredAt.getTime() <= 14 * 86400000) {
      if (!order.isFinalSale) {
        if (order.totalPaisa > 0) {
          return "refund approved";
        } else {
          return "nothing to refund";
        }
      } else {
        return "final sale items cannot be refunded";
      }
    } else {
      return "refund window has closed";
    }
  } else {
    return "only delivered orders can be refunded";
  }
}
```

**What to build:** rewrite with guard clauses, named constants and an extracted helper for the time check. Keep exactly the same messages and behaviour. Test all five outcomes.

<details>
<summary>Show the solution</summary>

```ts
type Order = { status: string; deliveredAt: Date; isFinalSale: boolean; totalPaisa: number };

const REFUND_WINDOW_DAYS = 14;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function isWithinRefundWindow(deliveredAt: Date, now: Date): boolean {
  return now.getTime() - deliveredAt.getTime() <= REFUND_WINDOW_DAYS * MS_PER_DAY;
}

function refundDecision(order: Order, now: Date): string {
  if (order.status !== "delivered") return "only delivered orders can be refunded";
  if (!isWithinRefundWindow(order.deliveredAt, now)) return "refund window has closed";
  if (order.isFinalSale) return "final sale items cannot be refunded";
  if (order.totalPaisa <= 0) return "nothing to refund";
  return "refund approved";
}

const now = new Date("2026-06-20T12:00:00Z");
const delivered = (daysAgo: number) => new Date(now.getTime() - daysAgo * MS_PER_DAY);
const base: Order = { status: "delivered", deliveredAt: delivered(5), isFinalSale: false, totalPaisa: 250_000 };

console.log(refundDecision({ ...base, status: "shipped" }, now));
console.log(refundDecision({ ...base, deliveredAt: delivered(20) }, now));
console.log(refundDecision({ ...base, isFinalSale: true }, now));
console.log(refundDecision({ ...base, totalPaisa: 0 }, now));
console.log(refundDecision(base, now));
```

**Output:**

```text
only delivered orders can be refunded
refund window has closed
final sale items cannot be refunded
nothing to refund
refund approved
```

**Walkthrough:** each guard handles one rejection reason, in the same order as the original nesting, so the behaviour is identical. The time arithmetic moved into `isWithinRefundWindow`, whose name explains the rule. `14` and `86400000` became named constants. The tests use spread (`{ ...base, status: "shipped" }`) to change one field at a time from a valid base order — a clean way to test each rule alone.

**A subtle point:** the original used `order.totalPaisa > 0` for approval, so the guard must be `<= 0` (not `< 0`) to keep behaviour identical. Changing a condition's direction is where refactoring bugs usually hide — which is exactly why the five checks are worth running.

</details>

### Exercise 3 — Find the smells

**Objective:** practise recognising smells and deciding what to change.
**Starting point:**

```ts
// fragment
// Utils.ts — 1,400 lines
export function handle(type: number, a: string, b: string, c: string, send: boolean, log: boolean) {
  // type 1 = invoice, 2 = receipt, 3 = reminder
  if (type == 1) { /* 80 lines building an invoice, including VAT at 0.17 */ }
  else if (type == 2) { /* 60 lines building a receipt, including VAT at 0.17 */ }
  else if (type == 3) { /* 40 lines */ }
  try { if (send) mailer.send(a, b, c); } catch (e) {}
  // if (log) oldLogger.write(a);
}
```

**What to do:** list every smell you can find, and say how you would fix each.

<details>
<summary>Show the solution</summary>

1. **A "utils" file of 1,400 lines** — a God module with no single purpose. Split it by responsibility (invoices, receipts, reminders, email).
2. **Meaningless names** (`handle`, `a`, `b`, `c`) — rename to `sendBillingDocument(recipientEmail, subject, body)` or better, split (below).
3. **Magic numbers for types** (`1`, `2`, `3`, explained only in a comment) — primitive obsession. Use a union type (`"invoice" | "receipt" | "reminder"`) or, better, separate functions or classes per document type.
4. **Long parameter list with boolean flags** (`send`, `log`) — replace with separate functions or an options object.
5. **A long conditional on type**, with each branch doing a different job — split into `buildInvoice`, `buildReceipt` and `buildReminder`, or use polymorphism if the types share an interface.
6. **Duplicated knowledge**: VAT at `0.17` appears in two branches — make one `VAT_RATE` constant (and remember tax rates change, so it may need to come from configuration with an effective date).
7. **Swallowed error**: `catch (e) {}` — a failed email is silently lost. At minimum, log it with context; better, let the caller decide.
8. **Commented-out code** (`// if (log) oldLogger...`) — delete it; Git remembers.
9. **`==` instead of `===`** — loose equality ({{ch:operators-and-decisions}}); ESLint's `eqeqeq` rule would flag it.

**How to proceed safely:** first write characterisation tests that capture current output for each type; then make one change at a time, running tests after each. Start with low-risk, high-value steps: rename, extract the VAT constant, stop swallowing the error.

</details>

### Exercise 4 — Production scenario: same knowledge, or different?

**Objective:** practise judging DRY correctly.
**The scenario:** your shop has two functions, written by different developers:

```ts
// fragment
// checkout.ts
const isValidPhone = (s: string) => /^03\d{9}$/.test(s);

// rider-app.ts (delivery riders' phone numbers, used for SMS dispatch)
const isValidRiderPhone = (s: string) => /^03\d{9}$/.test(s);
```

A teammate proposes merging them into one shared `isValidPhone`. Another says they should stay separate. Decide, and explain your reasoning. Then write the version you would merge (if any), accepting both `03001234567` and `+923001234567`.

<details>
<summary>Show the solution</summary>

**Reasoning:** ask, "if one rule changes, must the other change too?" Both validate the **same real-world thing**: a Pakistani mobile number. If the format of Pakistani mobile numbers changes, both must change together. That makes this the **same knowledge**, so merging is correct. (If instead the rider app later required numbers from one specific network for a business reason, that would be a separate business rule — and it should be a **separate, additional** check, not a flag inside the shared function.)

```ts
const PK_MOBILE_PATTERN = /^(?:\+92|0)3\d{9}$/;

/** True for Pakistani mobile numbers in local (03…) or international (+923…) format. */
function isPakistaniMobileNumber(input: string): boolean {
  return PK_MOBILE_PATTERN.test(input.replace(/[\s-]/g, ""));
}

for (const n of ["03001234567", "+923001234567", "0300-123 4567", "3001234567", "04235761234"]) {
  console.log(n.padEnd(15), isPakistaniMobileNumber(n));
}
```

**Output:**

```text
03001234567     true
+923001234567   true
0300-123 4567   true
3001234567      false
04235761234     false
```

**Walkthrough:** the name now says exactly what is validated, which is more precise than `isValidPhone`. The pattern accepts either `+92` or `0` followed by `3` and nine more digits. Removing spaces and dashes first makes the function tolerant of how people actually type numbers. `04235761234` is a landline (it starts with `042`, not `03`), so it is rejected. The pattern is a named constant with a documentation comment, in one shared module that both checkout and the rider app import.

**Common wrong approach:** merging into `isValidPhone(s, isRider)` "just in case" the rules diverge — that is speculative generality, and the flag will confuse every caller.

</details>

## Summary

Code is read far more often than it is written, so it should be written for **people**. Human working memory is small, readers skim, and surprises cause mistakes; clean code reduces all three costs.

Choose **names** that reveal intent, include units, follow consistent conventions and use the business's own words. Write **functions** that do one thing at one level of detail, use **guard clauses** instead of deep nesting, take few parameters (use options objects, avoid boolean flags) and have no hidden side effects — separate **commands** from **queries**. Use **comments** for why, warnings and complex patterns, not for repeating code; delete commented-out code. Automate **formatting** and linting so reviews focus on what matters. Handle **errors** by failing early with clear messages, never swallowing them, adding context, and deciding at the right level.

Apply **DRY** to knowledge, not to lines that merely look alike — duplication is cheaper than the wrong abstraction — and keep things simple (**KISS**, **YAGNI**). Learn the common **code smells**. **Refactor** in small, tested steps rather than rewriting, leave code a little better each time you touch it, and manage **technical debt** deliberately and visibly.

## Key terms

- **Clean code** — Code that a competent developer who did not write it can read, understand and change correctly and quickly.
- **Readability** — How easily a person can understand what code does and why.
- **Maintainability** — How easily code can be fixed, changed and extended over time.
- **Refactoring** — Changing the structure of code without changing its behaviour, to make it easier to understand and change.
- **Code smell** — A surface feature of code that often indicates a deeper design problem.
- **Technical debt** — The extra future cost of change caused by choosing a quick or messy solution now.
- **Magic number** — A literal value in code whose meaning is not explained by a name.
- **Guard clause** — An early check at the start of a function that handles a special or invalid case and returns or throws immediately.
- **Stepdown rule** — Organising code so it reads from high-level steps at the top down to details below.
- **Parameter object** — A single object that groups a function's parameters under names, replacing a long parameter list.
- **Flag argument** — A boolean parameter that changes what a function does, usually a sign it should be split.
- **Command–query separation** — The guideline that a function should either change state or return information, but not both.
- **Principle of least astonishment** — The guideline that code should behave the way a reasonable reader would expect from its name and shape.
- **Cyclomatic complexity** — A measure of the number of independent paths through a function, based on its branches and loops.
- **DRY (Don't Repeat Yourself)** — The principle that every piece of knowledge should have a single authoritative representation in a system.
- **Wrong abstraction** — A shared piece of code that merges things which only looked alike, becoming harder to change than the duplication it replaced.
- **Rule of three** — The guideline to extract shared code only once the same knowledge appears a third time.
- **KISS** — The principle of choosing the simplest solution that solves the actual problem.
- **YAGNI (You Aren't Gonna Need It)** — The principle of not building features or flexibility for needs that do not exist yet.
- **Primitive obsession** — Using plain strings and numbers for domain concepts that deserve their own types.
- **Characterisation test** — A test that records what existing code currently does, so it can be refactored safely.
- **Boy Scout Rule** — The habit of leaving code slightly cleaner than you found it every time you work on it.
- **Linter** — A tool that analyses source code for likely bugs and style problems without running it.
- **Formatter** — A tool that automatically rewrites code layout into a consistent style.
- **Ubiquitous language** — A shared vocabulary used by both developers and business experts, reflected directly in the code.

## What comes next

Clean code works at the level of names, lines and functions. The next chapter, {{ch:solid-principles}}, moves up a level: how to arrange **classes and modules** so that a growing system stays easy to change. The five SOLID principles — single responsibility, open/closed, Liskov substitution, interface segregation and dependency inversion — give names and reasons to many of the design ideas you have already met, such as polymorphism, composition and programming to interfaces.
