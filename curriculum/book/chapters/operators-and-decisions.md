# Operators and Making Decisions

> [!GOALS]
> - How to compare values with `===`, `!==`, `<`, `>`, `<=` and `>=`, and why `===` is almost always better than `==`.
> - How to combine conditions with "and" (`&&`), "or" (`||`) and "not" (`!`).
> - What "short-circuit evaluation" means, and how `||` and `??` provide default values.
> - How to make a program choose what to do with `if`, `else if` and `else`.
> - What a block is, and why the curly braces matter.
> - How to choose between two values in one line with the conditional (ternary) operator.
> - When to use `switch`, and the trap of forgetting `break`.
> - How to design decisions so they are correct, readable and easy to change.

## Why this matters

So far, every program you have written does exactly the same thing every time it runs. Real software is full of choices:

- *If* the basket total is at least Rs 5,000, delivery is free; *otherwise* it costs Rs 250.
- *If* the password is wrong, show an error; *if* it is wrong five times, lock the account.
- *If* the user is an admin, *or* the owner of this order, they may cancel it.
- *If* the payment succeeded *and* the item is in stock, confirm the order.

Decisions are where a program's **rules** live — the business's rules, written precisely. They are also where many of the most expensive bugs live. A delivery rule written with `>` instead of `>=` charges customers who should get free delivery. A permission check written with "or" instead of "and" lets people do things they should not. This chapter teaches you to write decisions that are correct, clear and easy to check.

## The simple idea

Every decision a program makes comes down to a **question with a yes-or-no answer**, followed by **different actions** depending on the answer.

```text
              Is the basket total at least 5000?
                     /                 \
                   yes                  no
                   /                     \
        delivery fee = 0        delivery fee = 250
                   \                     /
                    \                   /
                  continue with the rest of the program
```

The diagram shows the shape of every decision: a question, two (or more) paths, and then the paths join up again and the program continues.

In JavaScript, the **question** is an expression that produces a boolean — `true` or `false` — like the ones you met in {{ch:types-of-data}}. The **paths** are blocks of code that run only when their condition is met.

> [!ANALOGY]
> A decision in code is like a road junction with a signpost. The signpost asks a question ("Going to Islamabad?"). Depending on the answer, you take one road or the other. Further on, the roads may join again.
>
> **Where the analogy breaks:** a driver can see both roads and change their mind. A program follows exactly one path, chosen at the moment the question is asked, using the values that exist at that moment. If a value changes later, the program does not go back and reconsider — unless you write code that asks again.

## The proper definition and key words

- An **operator** is a symbol (or word) that performs an operation on values. You have already used arithmetic operators like `+` and `*`, and the assignment operator `=`.
- An **operand** is a value an operator works on. In `5 + 3`, the operands are `5` and `3`.
- A **comparison operator** compares two values and produces a boolean.
- A **logical operator** combines or inverts conditions: "and", "or", "not".
- A **condition** is an expression whose result is used to make a decision.
- A **conditional statement** (`if`, `switch`) runs different code depending on a condition.
- **Control flow** is the order in which a program's statements actually run. Decisions are the first tool you have for changing control flow from simply "top to bottom".

## Comparing values

### Level 1 — The comparison operators

| Operator | Question it asks | Example | Result |
|---|---|---|---|
| `===` | Are these equal? | `5 === 5` | `true` |
| `!==` | Are these not equal? | `5 !== 3` | `true` |
| `<` | Is the left less than the right? | `3 < 5` | `true` |
| `>` | Is the left greater than the right? | `3 > 5` | `false` |
| `<=` | Less than or equal to? | `5 <= 5` | `true` |
| `>=` | Greater than or equal to? | `4 >= 5` | `false` |

```js
const basketTotal = 5000;
const threshold = 5000;

console.log(basketTotal === threshold);
console.log(basketTotal > threshold);
console.log(basketTotal >= threshold);
```

**Output:**

```text
true
false
true
```

The difference between `>` and `>=` here is exactly the kind of detail that matters in business rules. "Free delivery on orders **over** Rs 5,000" and "free delivery on orders **of** Rs 5,000 **or more**" are different rules. A customer spending exactly 5,000 gets free delivery under the second rule but not the first. When writing a condition, find out which one the business actually means — and write it precisely.

> [!WARNING]
> **`=` and `===` are completely different.** `=` assigns (it means "becomes", from {{ch:first-program}}). `===` compares (it asks "are these equal?"). Writing `=` where you meant `===` is one of the most common beginner mistakes, and it causes confusing bugs. You will see exactly what goes wrong later in this chapter.

### Level 2 — Strict equality (`===`) versus loose equality (`==`)

JavaScript has **two** equality operators, and choosing the right one matters.

**`===` (strict equality)** is `true` only if both values have the **same type** and the **same value**. It never converts types.

**`==` (loose equality)** first **converts** the values to a common type, using the coercion rules from {{ch:types-of-data}}, and then compares.

```js
console.log(5 === "5");
console.log(5 == "5");

console.log(0 === false);
console.log(0 == false);

console.log("" == 0);
console.log(null == undefined);
console.log(null === undefined);
```

**Output:**

```text
false
true
false
true
true
true
false
```

Walkthrough:

- `5 === "5"` — a number and a string: different types, so `false`.
- `5 == "5"` — `==` converts the string `"5"` to the number 5, then compares: `true`.
- `0 == false` — `false` is converted to 0: `true`.
- `"" == 0` — the empty string is converted to 0: `true`. Most people find this surprising.
- `null == undefined` — `==` has a special rule treating these two as equal to each other (and to nothing else).
- `null === undefined` — different types: `false`.

The rules for `==` are long and full of surprises like `"" == 0`. They make code harder to reason about and hide type bugs: if a number accidentally arrives as a string, `==` quietly hides the problem instead of revealing it.

> **Rule: always use `===` and `!==`.** Linters warn about `==` by default in most professional setups. The only common exception some teams allow is `value == null`, which is a short way of checking "is this `null` or `undefined`?" — but writing `value === null || value === undefined`, or using the `??` operator shown later, is clearer.

### Level 3 — Comparing strings and decimals

**Strings** are compared character by character, using each character's number in the Unicode table — rather like alphabetical order. You saw this in the free-delivery bug in {{ch:types-of-data}}:

```js
console.log("apple" < "banana");
console.log("Zebra" < "apple");
console.log("10" < "9");
```

**Output:**

```text
true
true
true
```

- `"apple" < "banana"` — `a` comes before `b`: `true`.
- `"Zebra" < "apple"` — capital letters come **before** all lowercase letters in the character table, so `Z` counts as "less than" `a`. Not true alphabetical order.
- `"10" < "9"` — compared as text: `"1"` comes before `"9"`, so `true`. As numbers, of course, 10 is greater than 9.

To compare strings the way people expect — ignoring case, handling accents and different languages correctly — use the `localeCompare` method, which you will use for sorting in {{ch:arrays}}. And to compare numbers that arrived as strings, convert them first.

To compare text **ignoring capital letters**, convert both sides to the same case:

```js
const typed = "ADMIN@shop.com";
const stored = "admin@shop.com";
console.log(typed === stored);
console.log(typed.toLowerCase() === stored.toLowerCase());
```

**Output:**

```text
false
true
```

**Decimals** cannot be safely compared with `===`, because of the floating-point approximation you learned about in {{ch:types-of-data}}:

```js
console.log(0.1 + 0.2 === 0.3);
console.log(Math.abs((0.1 + 0.2) - 0.3) < 0.000001);
```

**Output:**

```text
false
true
```

The second line asks a better question: "Is the difference between these two values tiny?" `Math.abs` removes the sign, so the difference is always positive. If it is smaller than a chosen **tolerance** — here one millionth — the values are treated as equal. (For money, the real solution remains the one you already know: use whole numbers of the smallest unit, which compare exactly.)

## Combining conditions: logical operators

Real rules usually involve more than one condition. JavaScript has three **logical operators** to combine them.

### `&&` — and

`a && b` is `true` only if **both** `a` and `b` are true.

```js
const isLoggedIn = true;
const hasItemsInBasket = false;

console.log(isLoggedIn && hasItemsInBasket);
```

**Output:**

```text
false
```

The user is logged in, but the basket is empty, so "logged in **and** has items" is false.

### `||` — or

`a || b` is `true` if **at least one** of `a` and `b` is true.

```js
const isAdmin = false;
const isOrderOwner = true;

console.log(isAdmin || isOrderOwner);
```

**Output:**

```text
true
```

The user is not an admin, but they own the order, so "admin **or** owner" is true.

### `!` — not

`!a` turns `true` into `false` and `false` into `true`.

```js
const isBlocked = false;
console.log(!isBlocked);
```

**Output:**

```text
true
```

"Not blocked" is true.

### Truth tables

The complete behaviour of these operators fits in small tables, called **truth tables**:

```text
   a       b      |  a && b    a || b        a      |  !a
  -----   -----   |  ------    ------       -----   |  -----
  true    true    |  true      true         true    |  false
  true    false   |  false     true         false   |  true
  false   true    |  false     true
  false   false   |  false     false
```

Read each row as one possible situation. For example, the second row says: when `a` is true and `b` is false, "a and b" is false, and "a or b" is true.

### Combining several conditions

You can combine as many conditions as you need. `!` is applied first, then `&&`, then `||` — but as with arithmetic, **use brackets to make your meaning obvious**:

```js
const total = 6200;
const isMember = false;
const hasFreeDeliveryCoupon = true;

const freeDelivery = total >= 5000 && (isMember || hasFreeDeliveryCoupon);
console.log(freeDelivery);
```

**Output:**

```text
true
```

This expresses the rule: "free delivery if the total is at least 5,000 **and** the customer is either a member **or** has a coupon". The brackets make sure the "or" is worked out first, as one combined condition.

Work through it step by step, as the engine does:

```text
  total >= 5000 && (isMember || hasFreeDeliveryCoupon)
  6200 >= 5000  && (false    || true)
  true          && true
  true
```

Writing out the values like this, step by step, is the best way to check a complicated condition — and to find out why one is giving the wrong answer.

> [!TIP]
> **Two useful rules for "not" (De Morgan's laws).** "Not (a and b)" is the same as "(not a) or (not b)". "Not (a or b)" is the same as "(not a) and (not b)". In code: `!(a && b)` equals `!a || !b`, and `!(a || b)` equals `!a && !b`. For example, "not (open **and** in stock)" means "closed **or** out of stock". These rules help you simplify confusing conditions and check that a rewritten condition still means the same thing.

### Level 4 — Short-circuit evaluation

Here is a detail of `&&` and `||` that is essential to understand, because experienced developers rely on it constantly.

JavaScript evaluates `&&` and `||` **from left to right, and stops as soon as the answer is known.** This is called **short-circuit evaluation**.

- For `a && b`: if `a` is false, the whole thing must be false, so `b` is **never evaluated**.
- For `a || b`: if `a` is true, the whole thing must be true, so `b` is **never evaluated**.

```text
  false && anything   -> stops at false; "anything" is never looked at
  true  || anything   -> stops at true;  "anything" is never looked at
```

Why does this matter? Because the right side might be something that would **fail** if the left side were false:

```js
const customer = null;
console.log(customer !== null && customer.name === "Sara");
```

**Output:**

```text
false
```

If JavaScript evaluated `customer.name` when `customer` is `null`, it would crash with a `TypeError` (as you saw in {{ch:from-code-to-running-program}}). But because the left side, `customer !== null`, is false, the right side is never evaluated. The `&&` acts as a guard: "only check the name if there is a customer".

### Level 5 — `&&` and `||` return values, not just booleans

There is one more surprise. `&&` and `||` do not always produce `true` or `false`. They actually return **one of their operands** — the one that decided the answer — using the truthy and falsy rules from {{ch:types-of-data}}:

- `a || b` returns `a` if `a` is truthy; otherwise it returns `b`.
- `a && b` returns `a` if `a` is falsy; otherwise it returns `b`.

```js
console.log("Sara" || "Guest");
console.log("" || "Guest");
console.log(0 || 10);
console.log("Sara" && "Welcome!");
console.log("" && "Welcome!");
```

**Output:**

```text
Sara
Guest
10
Welcome!

```

(The last line prints an empty string, which appears as a blank line.)

The most common use of this is providing a **default value**:

```js
const typedName = "";
const displayName = typedName || "Guest";
console.log(`Hello, ${displayName}`);
```

**Output:**

```text
Hello, Guest
```

"Use the typed name, or `"Guest"` if nothing was typed."

### `??` — the nullish coalescing operator

Using `||` for defaults has a trap: it replaces **every** falsy value, including `0` and `""`, which are often perfectly valid.

```js
const itemsInStock = 0;
console.log(itemsInStock || "unknown");
```

**Output:**

```text
unknown
```

That is wrong: we *do* know the stock — it is zero. `||` treated the genuine 0 as "missing".

JavaScript has a better operator for defaults: **`??`**, called the **nullish coalescing operator**. (A value is called **nullish** if it is `null` or `undefined`. "Coalescing" means "combining into one".) `a ?? b` returns `b` **only if `a` is `null` or `undefined`**. Other falsy values such as `0`, `""` and `false` are kept.

```js
const itemsInStock = 0;
const discount = null;

console.log(itemsInStock ?? "unknown");
console.log(discount ?? 0);
```

**Output:**

```text
0
0
```

- `itemsInStock ?? "unknown"` — 0 is not nullish, so it is kept: `0`. Correct.
- `discount ?? 0` — `null` is nullish, so the default `0` is used.

> **Rule:** use `??` for default values when `0`, `""` or `false` are legitimate values. Use `||` only when you genuinely want *any* falsy value replaced — for example, an empty name replaced by "Guest".

## Making decisions: `if`

Now you have all the pieces to make a program choose what to do.

### Level 1 — A single `if`

```js
const basketTotal = 6200;

if (basketTotal >= 5000) {
  console.log("You get free delivery!");
}

console.log("Thank you for shopping.");
```

**Output:**

```text
You get free delivery!
Thank you for shopping.
```

Walkthrough:

- `if` is a keyword that starts a decision.
- The condition goes inside **round brackets**: `(basketTotal >= 5000)`. The brackets are required.
- The code to run when the condition is true goes inside **curly braces** `{ }`. This group of statements is called a **block**.
- Because 6,200 is at least 5,000, the condition is `true`, so the block runs and prints the message.
- After the block, the program continues as normal, so the last line always runs.

Now change the first line to `const basketTotal = 3000;` and run it again:

**Output:**

```text
Thank you for shopping.
```

The condition is `false`, so the whole block is **skipped**. The program jumps straight past it and continues.

### Blocks and indentation

A **block** is a group of statements inside `{ }`, treated as a unit. It can contain as many statements as you like:

```js
if (basketTotal >= 5000) {
  console.log("You get free delivery!");
  console.log("Delivery fee: Rs 0");
}
```

Both lines run together if the condition is true, or are skipped together if it is false.

The lines inside the block are **indented** — moved right by two spaces. JavaScript ignores indentation; it uses the braces to know where the block starts and ends. But indentation is vital for **humans**, who use it to see the structure at a glance. Prettier ({{ch:setting-up-your-workshop}}) indents your code automatically when you save.

> [!WARNING]
> JavaScript allows you to leave out the braces when a block has only one statement: `if (isVip) console.log("Welcome back!");`. **Do not do this.** If someone later adds a second line, indented to look as if it belongs to the `if`, it actually runs every time, because without braces only the first statement belongs to the `if`. This exact mistake caused a famous security flaw in Apple's software in 2014 (known as the "goto fail" bug, in the C language), where a duplicated line, outside a brace-less `if`, made a critical security check get skipped. Always use braces.

### Level 2 — `if` … `else`

Often you want one action when the condition is true and a **different** one when it is false:

```js
const basketTotal = 3000;
let deliveryFee;

if (basketTotal >= 5000) {
  deliveryFee = 0;
} else {
  deliveryFee = 250;
}

console.log("Delivery fee:", deliveryFee);
```

**Output:**

```text
Delivery fee: 250
```

Walkthrough:

- `deliveryFee` is declared with `let` and no value, because its value depends on the decision.
- If the condition is true, the first block runs. **Otherwise** — `else` — the second block runs.
- **Exactly one** of the two blocks always runs. Never both, never neither.
- After the decision, `deliveryFee` has a value either way, and the program continues.

### Level 3 — Several choices: `else if`

When there are more than two possibilities, chain conditions with `else if`:

```js
const basketTotal = 3500;
let deliveryFee;

if (basketTotal >= 5000) {
  deliveryFee = 0;
} else if (basketTotal >= 2000) {
  deliveryFee = 150;
} else {
  deliveryFee = 250;
}

console.log("Delivery fee:", deliveryFee);
```

**Output:**

```text
Delivery fee: 150
```

JavaScript checks the conditions **in order, from the top**, and runs **only the first block whose condition is true**. Then it skips all the rest.

```text
  basketTotal = 3500

  Is it >= 5000?   no  -> check the next condition
  Is it >= 2000?   YES -> deliveryFee = 150, then skip everything else
  (else)           never reached
```

The order of the conditions matters. Suppose you wrote them the other way round:

```js
if (basketTotal >= 2000) {
  deliveryFee = 150;
} else if (basketTotal >= 5000) {
  deliveryFee = 0;          // can never be reached!
} else {
  deliveryFee = 250;
}
```

Now a total of 8,000 matches the **first** condition (8,000 is at least 2,000), so it gets a fee of 150 — and the free-delivery branch can never run, because any total of 5,000 or more has already been caught by the first condition. When conditions overlap like this, put the **most specific** (narrowest) first.

The final `else` is optional. Without it, if no condition is true, nothing runs.

### Level 4 — Nested decisions

A block can contain another decision. This is called **nesting**:

```js
const isLoggedIn = true;
const isAdmin = false;

if (isLoggedIn) {
  if (isAdmin) {
    console.log("Show the admin dashboard");
  } else {
    console.log("Show the customer dashboard");
  }
} else {
  console.log("Show the login page");
}
```

**Output:**

```text
Show the customer dashboard
```

The outer `if` checks login. Only if that is true does the inner `if` check the role.

Nesting is sometimes necessary, but deep nesting — decisions inside decisions inside decisions — quickly becomes hard to read. It is often possible to flatten it with combined conditions:

```js
if (!isLoggedIn) {
  console.log("Show the login page");
} else if (isAdmin) {
  console.log("Show the admin dashboard");
} else {
  console.log("Show the customer dashboard");
}
```

This does exactly the same, but reads straight down the page. Handling the "special" case first — here, "not logged in" — and then dealing with the normal cases is a powerful habit. In {{ch:functions}} you will learn an even cleaner form of it, called a **guard clause**.

### Truthiness in conditions

An `if` condition does not have to be a boolean. Any value works, and JavaScript converts it using the **truthy/falsy** rules from {{ch:types-of-data}}:

```js
const couponCode = "SAVE10";

if (couponCode) {
  console.log(`Applying coupon ${couponCode}`);
}
```

**Output:**

```text
Applying coupon SAVE10
```

A non-empty string is truthy, so this reads naturally as "if there is a coupon code". An empty string `""` would be falsy, and the block would be skipped.

This is convenient, but remember the trap with `0`:

```js
const quantity = 0;

if (quantity) {
  console.log("Quantity given");
} else {
  console.log("No quantity given");
}
```

**Output:**

```text
No quantity given
```

If 0 is a valid quantity, this is wrong. When `0` (or `""`, or `false`) is a meaningful value, check precisely instead: `if (quantity !== undefined)`, or `if (quantity !== null && quantity !== undefined)`.

### The `=` versus `===` trap

Here is the mistake promised earlier:

```js
let role = "customer";

if (role = "admin") {
  console.log("Access granted to admin tools");
}

console.log("role is now:", role);
```

**Output:**

```text
Access granted to admin tools
role is now: admin
```

The condition uses `=`, not `===`. So instead of *comparing*, it **assigns** `"admin"` to `role`. An assignment expression produces the value that was assigned — `"admin"` — which is truthy. So the block runs, *and* `role` has been changed. A customer just got admin access.

The fix is `if (role === "admin")`. Linters flag assignments inside conditions, which is one more reason to keep ESLint switched on.

## Choosing between two values: the conditional (ternary) operator

When an `if`/`else` exists only to choose between two **values**, there is a shorter form:

```js
const basketTotal = 6200;
const deliveryFee = basketTotal >= 5000 ? 0 : 250;
console.log("Delivery fee:", deliveryFee);
```

**Output:**

```text
Delivery fee: 0
```

Read `condition ? valueIfTrue : valueIfFalse` as: "Is the condition true? If so, use the first value; otherwise, use the second."

```text
  basketTotal >= 5000   ?    0     :    250
  \_________________/        |           |
     the question       if true     if false
```

This is called the **conditional operator**, or often the **ternary operator** ("ternary" means "having three parts" — the condition and two values).

It has a real advantage over `if`/`else` here: `deliveryFee` can be a `const`, because it gets its value in one expression. With `if`/`else`, it had to be `let`.

It is also handy inside template literals:

```js
const items = 1;
console.log(`You have ${items} ${items === 1 ? "item" : "items"} in your basket.`);
```

**Output:**

```text
You have 1 item in your basket.
```

> [!TIP]
> Use the ternary operator for **short, simple choices between two values**. Do not nest ternaries inside each other (`a ? b : c ? d : e`) — it becomes very hard to read. When the choice has more than two outcomes, or when each branch does more than produce a value, use `if`/`else`.

## Choosing among many fixed values: `switch`

When you compare **one value** against a list of **specific possibilities**, `switch` can be clearer than a long `else if` chain:

```js
const orderStatus = "shipped";
let message;

switch (orderStatus) {
  case "pending":
    message = "We have received your order.";
    break;
  case "shipped":
    message = "Your order is on its way.";
    break;
  case "delivered":
    message = "Your order has been delivered.";
    break;
  default:
    message = "Unknown status — please contact support.";
}

console.log(message);
```

**Output:**

```text
Your order is on its way.
```

Walkthrough:

- `switch (orderStatus)` — take this value and compare it against each `case`.
- Each `case "...":` gives one possible value. The comparison uses strict equality, exactly like `===`.
- When a case matches, JavaScript runs the statements after it.
- **`break`** means "stop here and leave the `switch`". It is essential, as you will see.
- **`default`** runs if no case matched — like the final `else`. Always include one, so that unexpected values are handled instead of silently ignored.

### The `break` trap: fall-through

If you forget `break`, JavaScript does not stop at the end of the matching case. It **continues running the next case's statements too**, regardless of whether they match. This is called **fall-through**:

```js
const orderStatus = "pending";

switch (orderStatus) {
  case "pending":
    console.log("Order received.");
  case "shipped":
    console.log("Order shipped.");
  case "delivered":
    console.log("Order delivered.");
}
```

**Output:**

```text
Order received.
Order shipped.
Order delivered.
```

The order is only pending, but all three messages print. Because there is no `break`, execution "falls through" from the matching case into every case below it.

Fall-through is occasionally useful on purpose — to make several values share the same code:

```js
const day = "Saturday";

switch (day) {
  case "Saturday":
  case "Sunday":
    console.log("Weekend: customer support closes at 4 pm.");
    break;
  default:
    console.log("Weekday: customer support closes at 8 pm.");
}
```

**Output:**

```text
Weekend: customer support closes at 4 pm.
```

Here, `"Saturday"` has no statements of its own, so it deliberately falls through to the `"Sunday"` statements. That is a clear, intentional use. Accidental fall-through — a missing `break` — is a bug, and linters warn about it.

### `switch` or `if`?

| Use `switch` when… | Use `if` / `else if` when… |
|---|---|
| Comparing **one value** against several **exact** values | Conditions involve ranges (`>=`, `<`) |
| The values are a known, fixed list (statuses, roles, days) | Conditions involve different variables |
| | Conditions combine `&&` and `||` |

Many teams use `switch` sparingly. In {{ch:objects}} you will see another common approach: a lookup table, where the possible values and their results are stored in an object instead of written as code.

## Designing good decisions

Writing a decision that *works* is only the first step. Experienced engineers also make sure it is **correct in every case** and **easy to understand and change**.

### Check the boundaries

Most bugs in decisions happen at the **edges** — the exact values where the answer changes. For the delivery rule "free at Rs 5,000 or more", the interesting test values are:

| Total | Expected fee | Why test it |
|---|---|---|
| 4,999 | 250 | Just below the boundary |
| 5,000 | 0 | Exactly on the boundary |
| 5,001 | 0 | Just above |
| 0 | 250 | The smallest possible total |
| -100 | ??? | Should this even be possible? |

The last row is important. Thinking about the boundaries reveals questions the original rule did not answer — "what about a negative total?" — which usually means **invalid input should be rejected earlier**. This kind of boundary thinking is the heart of good testing ({{ch:testing}}).

### Make rules readable with named conditions

Long conditions are hard to read and easy to get wrong. Give the parts names:

```js
// Hard to read
if (total >= 5000 && (isMember || coupon === "FREESHIP") && !isRemoteArea) {
  deliveryFee = 0;
}

// Easier to read and check
const meetsMinimumSpend = total >= 5000;
const hasFreeDeliveryRight = isMember || coupon === "FREESHIP";
const isDeliverableForFree = !isRemoteArea;

if (meetsMinimumSpend && hasFreeDeliveryRight && isDeliverableForFree) {
  deliveryFee = 0;
}
```

The second version reads almost like the business rule itself: "if the order meets the minimum spend and the customer has a free-delivery right and the address is deliverable for free". A reviewer can check each part separately against the rule.

### Decision tables

When a rule depends on several conditions, write out every combination in a table **before** writing the code. For example, a clinic's appointment fee:

| Is a new patient? | Is a weekend? | Fee |
|---|---|---|
| yes | no | 2,000 |
| yes | yes | 2,500 |
| no | no | 1,500 |
| no | yes | 2,000 |

Writing the table forces every combination to be decided — including the ones a quick conversation might miss — and gives you a ready-made list of test cases. Business people can check a table far more easily than they can check code. This is a technique experienced engineers use constantly when turning requirements into code.

## From beginner to enterprise: decisions at every level

**Level 3 — A small program.** A few `if`/`else` statements for things like delivery fees or grade boundaries, written directly in the code.

**Level 4 — A real application.** Decisions control what users see and are allowed to do: show the login page or the dashboard; allow or reject a cancellation; apply a discount or not. **Every decision that protects something important is made on the server**, never only in the browser, because — as you learned in {{ch:how-the-web-works}} — the browser is under the user's control.

**Level 5 — Professional engineering.** Business rules are kept in one place, named clearly, and covered by tests at their boundaries. Settings such as thresholds and fees live in configuration, not scattered through the code. Complicated rules are documented with decision tables that product managers can review. Permission checks follow a consistent pattern, so that no endpoint "forgets" to check.

**Level 6 — Enterprise.** Large companies often move frequently changing rules out of code entirely: **feature flags** decide which users see a new feature (so it can be switched on gradually, or off instantly if it breaks); **rules engines** let business teams change pricing or eligibility rules without a code release; and **policy systems** centralise access-control decisions across hundreds of services. Underneath, each of these still evaluates conditions — true or false, and or or — exactly as you have learned here.

## Real-world use cases

### Beginner level — An exam grade

**Situation:** turn a mark out of 100 into a grade: A for 80 or above, B for 65 or above, C for 50 or above, otherwise F.

**Solution:** an `if` / `else if` chain, checking from the highest boundary down, so that each mark is caught by the first matching grade.

**Lesson:** order matters when ranges overlap; check the boundaries 79, 80, 64, 65, 49 and 50.

### Intermediate level — Delivery fees for an online shop

**Business problem:** the shop wants free delivery over a minimum spend, a cheaper rate for mid-sized orders, a surcharge for remote areas, and free delivery for members regardless of spend — except to remote areas.

**Technical problem:** the rules interact, and a quick implementation produces combinations nobody intended, such as members getting free delivery to remote areas.

**Solution:** write a decision table with the business team, agree every combination, then implement it with clearly named conditions and test every row of the table.

**Trade-off:** the table takes an hour to agree, but prevents weeks of support tickets and refunds.

### Advanced level — Feature flags for a risky change

**Business problem:** a SaaS company is replacing its checkout. A bug in checkout directly loses revenue, so releasing it to everyone at once is risky.

**Solution:** wrap the new checkout in a decision controlled by a **feature flag**: `if (flags.newCheckout) { … } else { … }`. The flag is switched on first for staff, then for 5 percent of customers, then everyone — and can be switched off instantly if errors rise.

**Advantages:** risky changes reach users gradually and can be reversed in seconds without a new deployment.

**Disadvantages:** every flag doubles the paths through the code. Old flags must be removed once the change is complete, or the code fills with dead branches nobody understands — a common form of technical debt.

### Enterprise level — Centralised access decisions

**Business problem (illustrative):** a hospital group's software has dozens of services. Each one implements its own rules for "who may see this patient's record", and they disagree, creating both privacy risks and staff frustration.

**Solution:** move the rules into one central policy service that every other service asks. The rules — combining the user's role, department, the patient's consent and an emergency override — are written once, reviewed by both engineers and compliance staff, and tested thoroughly.

**Trade-offs:** every request now depends on the policy service being fast and available, so it must be engineered for reliability. In exchange, access rules are consistent, auditable and changeable in one place.

## Common mistakes

### Beginner mistake — `=` instead of `===`

**What it looks like:** `if (status = "paid")`.

**What happens:** the condition assigns instead of comparing, is usually truthy, and changes the variable — the block runs when it should not.

**How to prevent it:** always use `===` for comparisons; keep ESLint on, which warns about assignments in conditions.

### Beginner mistake — Using `==`

**What it looks like:** `if (quantity == "")`, which is also true when `quantity` is `0`.

**What happens:** type coercion makes different values look equal, hiding bugs.

**How to prevent it:** use `===` and `!==` everywhere.

### Beginner mistake — Wrong order in an `else if` chain

**What it looks like:** checking `>= 2000` before `>= 5000`, so the second branch can never run.

**How to spot it:** test a value that should hit each branch; one branch never runs.

**How to fix it:** put the narrowest condition first.

### Intermediate mistake — `||` for defaults when 0 is valid

**What it looks like:** `const stock = product.stock || "unknown";`, which shows "unknown" for items with zero stock.

**How to fix it:** use `??` when `0`, `""` or `false` are meaningful values.

### Intermediate mistake — Missing `break` in a `switch`

**What it looks like:** several cases' code running for one value.

**How to fix and prevent it:** end every case with `break` (or `return`, once you learn functions), and keep the linter's fall-through warning on.

### Production mistake — Off-by-one at a boundary

**What it looks like:** `total > 5000` where the business rule was "5,000 or more". Customers spending exactly Rs 5,000 are charged delivery.

**What happens:** complaints, refunds, and loss of trust — small for one customer, significant across thousands.

**How to prevent it:** confirm the exact boundary with the business ("over" or "at least"?), and always test the boundary value itself.

### Enterprise mistake — Permission checks only in the frontend

**What it looks like:** the "Delete" button is hidden for non-admins, but the server's delete endpoint does not check the user's role.

**What happens:** anyone who sends the request directly — with curl or the browser's developer tools — can delete data.

**How to prevent it:** every permission decision must also be enforced on the server. The frontend check is only for a pleasant interface.

## Debugging and troubleshooting

When a decision takes the wrong path, do not guess. **Print the condition's parts and their values**, exactly as you evaluated the free-delivery example step by step:

```js
console.log({ total, isMember, hasFreeDeliveryCoupon });
console.log("meets spend:", total >= 5000);
console.log("has right:", isMember || hasFreeDeliveryCoupon);
```

The curly braces in the first line create a small object that prints each variable with its name — a handy trick you will understand fully in {{ch:objects}}.

| Symptom | Likely cause |
|---|---|
| A block always runs, whatever the values | `=` instead of `===`; or a value that is always truthy (like the string `"false"`) |
| A branch never runs | An earlier condition always catches its cases; or the condition can never be true |
| Wrong result for one exact value | A boundary written with `>` instead of `>=` (or the reverse) |
| `0` or `""` treated as "missing" | Truthiness check or `||` where `!== undefined` or `??` was needed |
| Several `switch` cases run | Missing `break` |
| Strings compared "wrongly" | Comparing numbers stored as text, or capital versus lowercase letters |
| `TypeError: Cannot read properties of null` inside a condition | The right side of `&&` is evaluated on a missing value; put the existence check first |

## How a senior engineer thinks about decisions

> [!SENIOR]
> When an experienced engineer reads or writes a decision, they ask:
>
> - **What exactly is the rule?** "Over" or "at least"? Inclusive or exclusive? They confirm with the person who owns the rule, rather than guessing.
> - **What are the boundaries and the impossible cases?** They test exactly on each boundary, and ask what should happen with negative, missing or absurd values.
> - **Can a reviewer check this against the rule?** Named conditions and decision tables make correctness visible.
> - **Where is this decided?** Security and money decisions are made on the server, in one place, not repeated in many.
> - **Will this rule change often?** If so, they keep it in configuration or behind a feature flag, so changing it does not require changing code.
> - **Is this getting too clever?** A slightly longer `if`/`else` that anyone can read beats a dense one-liner that only its author understands.

## Exercises

### Exercise 1 — Exam grades

**Objective:** practise `if` / `else if` / `else` and boundary order.

**What to build:** given `const mark = 72;`, print the grade: A for 80 and above, B for 65 and above, C for 50 and above, F otherwise. Then test with 80, 79, 65, 50, 49 and 100.

<details>
<summary>Show the solution</summary>

```js
const mark = 72;
let grade;

if (mark >= 80) {
  grade = "A";
} else if (mark >= 65) {
  grade = "B";
} else if (mark >= 50) {
  grade = "C";
} else {
  grade = "F";
}

console.log(`Mark ${mark}: grade ${grade}`);
```

**Output (for 72):**

```text
Mark 72: grade B
```

Results for the test values: 80 → A, 79 → B, 65 → B, 50 → C, 49 → F, 100 → A.

Walkthrough:

- Conditions are checked from the highest boundary down. Once one is true, the rest are skipped.
- Because 72 is not at least 80 but is at least 65, it gets B, and the C check never runs.
- `>=` is used because the rule says "and above" — so exactly 80 is an A.

**Common wrong approach:** checking `mark >= 50` first. Then every passing mark gets a C, because 50 or more catches 65 and 80 too. Another: writing each condition as a full range, such as `mark >= 65 && mark < 80`. That works, but it is longer, and every boundary appears twice, so it is easier to get one wrong. Ordering from the top avoids both.

</details>

### Exercise 2 — Delivery fee rules

**Objective:** practise logical operators and named conditions.

**The rules:**

- Remote areas always pay Rs 400.
- Otherwise, members get free delivery.
- Otherwise, orders of Rs 5,000 or more get free delivery.
- Otherwise, delivery costs Rs 250.

**What to build:** with `const total`, `const isMember` and `const isRemoteArea`, calculate and print the fee. Test: a remote member with a 10,000 total (400); a non-remote non-member with 5,000 (0); a non-remote member with 100 (0); a non-remote non-member with 4,999 (250).

<details>
<summary>Show the solution</summary>

```js
const total = 4999;
const isMember = false;
const isRemoteArea = false;

let deliveryFee;

if (isRemoteArea) {
  deliveryFee = 400;
} else if (isMember || total >= 5000) {
  deliveryFee = 0;
} else {
  deliveryFee = 250;
}

console.log(`Delivery fee: Rs ${deliveryFee}`);
```

**Output (for the values shown):**

```text
Delivery fee: Rs 250
```

Walkthrough:

- The remote-area rule comes **first**, because it overrides everything else — even a member with a large order pays Rs 400.
- The two free-delivery rules are combined with `||`: membership **or** a large enough order.
- Everything else falls to the final `else`.

Checking all four test cases: remote member, 10,000 → first branch, 400. Non-remote non-member, 5,000 → second branch (5,000 ≥ 5,000), 0. Non-remote member, 100 → second branch (member), 0. Non-remote non-member, 4,999 → `else`, 250.

**Common wrong approach:** checking membership first. Then a remote member gets free delivery, breaking the first rule. When one rule overrides others, it must be checked before them.

</details>

### Exercise 3 — Is it a leap year?

**Objective:** practise combining conditions with `&&`, `||` and `%`.

**The rule:** a year is a leap year if it is divisible by 4, **except** years divisible by 100, which are **not** leap years — **unless** they are also divisible by 400, which **are**.

**What to build:** with `const year`, print whether it is a leap year. Test with 2024 (yes), 2023 (no), 1900 (no) and 2000 (yes).

**Hint:** "divisible by 4" means `year % 4 === 0`.

<details>
<summary>Show the solution</summary>

```js
const year = 1900;

const divisibleBy4 = year % 4 === 0;
const divisibleBy100 = year % 100 === 0;
const divisibleBy400 = year % 400 === 0;

const isLeapYear = (divisibleBy4 && !divisibleBy100) || divisibleBy400;

console.log(`${year} is ${isLeapYear ? "a leap year" : "not a leap year"}`);
```

**Output (for 1900):**

```text
1900 is not a leap year
```

Walkthrough:

- Each divisibility check uses the remainder operator from {{ch:types-of-data}}: a remainder of 0 means "divides exactly".
- Naming the three checks makes the final condition read like the rule: "divisible by 4 and not by 100, **or** divisible by 400".
- For 1900: divisible by 4 (yes) and not by 100 (no — it is divisible by 100), so the first part is false; divisible by 400? No. Result: false.
- For 2000: the first part is false (divisible by 100), but divisible by 400 is true, so the whole thing is true.
- The ternary operator inside the template literal chooses the wording.

**Common wrong approach:** `year % 4 === 0` alone. It gives the right answer for most years you will ever test — and the wrong one for 1900 and 2100. Boundary and exception cases are exactly where rules go wrong.

</details>

### Exercise 4 — Find the bugs (debugging scenario)

**Objective:** practise finding decision bugs.

**The scenario:** this code is meant to let only admins, or the customer who placed the order, cancel an order — and only while it is still `"pending"`. A support ticket says customers are cancelling orders that have already shipped, and one customer cancelled someone else's order.

```js
const userRole = "customer";
const userId = 42;
const orderOwnerId = 7;
const orderStatus = "shipped";

let canCancel = false;

if (orderStatus = "pending") {
  if (userRole == "admin" || userId == orderOwnerId || "customer") {
    canCancel = true;
  }
}

console.log("Can cancel?", canCancel);
```

**What to do:** find every bug, explain each, and fix the code so that this example prints `Can cancel? false`.

<details>
<summary>Show the solution</summary>

**Bug 1 — assignment instead of comparison.** `orderStatus = "pending"` assigns `"pending"` to `orderStatus`, and the result, `"pending"`, is truthy. So the status check always passes — which is why shipped orders could be cancelled. Use `===`.

**Bug 2 — a bare string in the condition.** `|| "customer"` adds a non-empty string as a separate condition, and a non-empty string is always truthy. So the inner condition is **always** true — which is why a customer could cancel someone else's order. The author probably meant something like `userRole === "customer"`, but even that would be wrong: being *a* customer is not enough; you must be *this order's* customer. Remove it.

**Bug 3 — loose equality.** `==` should be `===`. It is not the cause of this ticket, but it can hide type bugs (for example, if one ID arrives as the string `"7"`).

**Fixed version:**

```js
const userRole = "customer";
const userId = 42;
const orderOwnerId = 7;
const orderStatus = "shipped";

const isPending = orderStatus === "pending";
const isAdmin = userRole === "admin";
const isOwner = userId === orderOwnerId;

const canCancel = isPending && (isAdmin || isOwner);

console.log("Can cancel?", canCancel);
```

**Output:**

```text
Can cancel? false
```

Walkthrough of the fix:

- Each part of the rule is a named condition, using `===`.
- The whole rule fits in one line that matches the requirement: pending **and** (admin **or** owner).
- `canCancel` is now `const`, because it is calculated once.

**Lesson:** both serious bugs came from conditions that were **always truthy**. When a decision "always passes", look for an assignment, a bare string or another always-truthy value inside the condition. And because this is a permission check, it must live on the server.

</details>

## Summary

**Comparison operators** (`===`, `!==`, `<`, `>`, `<=`, `>=`) produce booleans. Always use **strict equality** `===` and `!==`; loose `==` converts types and hides bugs. Strings compare character by character (capitals before lowercase; `"10" < "9"`); decimals should be compared with a small **tolerance**.

**Logical operators** combine conditions: `&&` (and), `||` (or), `!` (not). They use **short-circuit evaluation**, stopping as soon as the answer is known, which lets `&&` guard against missing values. `||` and `&&` return one of their operands; `||` supplies defaults for any falsy value, while **`??`** supplies defaults only for `null` and `undefined`.

**`if`** runs a **block** when its condition is truthy; **`else`** handles the opposite; **`else if`** chains choices and runs only the first match, so order matters. Always use braces. Watch the truthiness of `0` and `""`, and never write `=` where you mean `===`. The **ternary operator** chooses between two values in one expression. **`switch`** compares one value against fixed cases; every case needs `break`, or execution **falls through**.

Good decisions are tested at their **boundaries**, use **named conditions**, are designed with **decision tables** when several factors interact, and — for anything that protects money or data — are enforced on the server.

## Key terms

- **Operator** — A symbol or word that performs an operation on one or more values, such as `+`, `===` or `&&`.
- **Operand** — A value that an operator works on.
- **Comparison operator** — An operator that compares two values and produces a boolean, such as `===` or `>=`.
- **Strict equality (`===`)** — A comparison that is true only when both values have the same type and the same value.
- **Loose equality (`==`)** — A comparison that converts values to a common type before comparing; avoided in modern code.
- **Tolerance** — A small allowed difference used when comparing decimal numbers that may not be exactly equal.
- **Logical operator** — An operator that combines or inverts conditions: `&&` (and), `||` (or) and `!` (not).
- **Truth table** — A table listing the result of a logical expression for every combination of true and false inputs.
- **De Morgan's laws** — Rules for negating combined conditions: not (a and b) equals (not a) or (not b), and not (a or b) equals (not a) and (not b).
- **Short-circuit evaluation** — Evaluating `&&` and `||` from left to right and stopping as soon as the result is known.
- **Default value** — A value used when no other value has been provided.
- **Nullish** — Describes the values `null` and `undefined`.
- **Nullish coalescing operator (`??`)** — An operator that returns its right side only when its left side is `null` or `undefined`.
- **Condition** — An expression whose truthy or falsy result decides which code runs.
- **Conditional statement** — A statement, such as `if` or `switch`, that runs different code depending on a condition.
- **Control flow** — The order in which a program's statements actually run.
- **Block** — A group of statements inside curly braces `{ }`, treated as a unit.
- **Indentation** — Spaces at the start of lines that show the structure of code to human readers.
- **`if` statement** — A statement that runs a block of code only when its condition is truthy.
- **`else`** — The part of an `if` statement that runs when the condition is falsy.
- **`else if`** — A further condition checked only if all earlier conditions in the chain were falsy.
- **Nesting** — Placing one decision (or other block) inside another.
- **Conditional (ternary) operator** — The `condition ? a : b` operator, which produces `a` if the condition is truthy and `b` otherwise.
- **`switch` statement** — A statement that compares one value against a list of cases and runs the matching code.
- **`break`** — A keyword that stops a `switch` (or a loop) immediately.
- **Fall-through** — In a `switch`, continuing into the next case's code when a case has no `break`.
- **Boundary value** — A value exactly at the point where a rule's outcome changes, important for testing.
- **Decision table** — A table listing every combination of conditions and the required outcome, used to design and test rules.
- **Feature flag** — A setting that switches a feature on or off for some or all users without changing code.

## What comes next

Your programs can now make choices. The next fundamental ability is **repetition**.

Imagine adding up the prices of 300 items in a basket, sending a reminder to every customer whose subscription ends this week, or checking every character of a password. You could not possibly write one line per item. In the next chapter, **Repeating Work: Loops**, you will learn to tell the computer "do this for each one" or "keep doing this until…", using `for`, `while` and other loops — and how to avoid the classic loop bugs, including the one that never ends.
