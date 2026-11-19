# Repeating Work: Loops

> [!GOALS]
> - Why programs need loops, and what problem they solve.
> - How a `while` loop works, step by step, and how to avoid loops that never end.
> - How a `for` loop works, and how to count up, count down and count in steps.
> - How to go through the characters of a string with an index and with `for...of`.
> - The core loop patterns every programmer uses: counting, summing, finding the largest or smallest, searching and building up a result.
> - How `break` and `continue` change a loop's flow, and when `do...while` is useful.
> - How loops inside loops work, and why they can become slow.
> - How loops appear in real systems: batches, pages, retries — and the production mistakes they cause.

## Why this matters

Computers are valuable because they do repetitive work without getting tired or bored. A clerk might process twenty invoices in an hour and make a mistake on one of them. A computer can process a million in a second, the same way every time.

But so far, every line in your programs runs once. To add up three prices, you wrote three additions. To add up three hundred, you would need three hundred lines — and you would need to know in advance exactly how many there would be, which you almost never do. A shopping basket might hold one item or fifty.

**Loops** solve this. A loop tells the computer: "repeat this block of code — while something is true, or once for each item." Loops appear in almost every program you will ever write: adding up a basket, sending a reminder to every customer, checking every character of a password, retrying a failed payment a few times, processing a million records in batches.

## The simple idea

Imagine a teacher marking a stack of exam papers. The teacher does not have separate instructions for paper 1, paper 2, paper 3. They have **one** set of instructions, repeated:

```text
  While there are papers left in the stack:
      take the top paper
      mark it
      add its score to the running total
      put it on the "done" pile
```

That is a loop: one set of steps, a condition that decides whether to keep going ("papers left?"), and something that changes each time round (the stack gets smaller), so that the repetition eventually stops.

> [!ANALOGY]
> A loop is like walking laps around a running track. Before each lap you ask a question — "Have I done 10 laps yet?" If not, you run another lap and add one to your count. When the answer becomes yes, you stop.
>
> **Where the analogy breaks:** a person who forgets to count their laps will eventually get tired and stop anyway. A computer never gets tired. If your loop's question can never become false — because you forgot to count — the computer will keep running laps forever, as fast as it can. This is called an **infinite loop**, and you will learn to recognise and prevent it.

## The proper definition and key words

- A **loop** is a statement that runs a block of code repeatedly.
- One run through the block is called an **iteration**. "The loop ran five iterations" means the block ran five times.
- The **loop condition** is the question asked before each iteration. While it is truthy, the loop continues; when it becomes falsy, the loop stops.
- The **loop body** is the block of code that repeats.
- A **loop variable** (or **counter**) is a variable that changes each iteration, usually to track progress and eventually make the condition false.
- To **iterate** over something means to go through it one item at a time.

## The `while` loop

### Level 1 — Repeat while a condition is true

The simplest loop is `while`. It looks very like an `if` statement — and that is a good way to understand it.

```js
let count = 1;

while (count <= 5) {
  console.log("Lap", count);
  count++;
}

console.log("Finished running");
```

**Output:**

```text
Lap 1
Lap 2
Lap 3
Lap 4
Lap 5
Finished running
```

Walkthrough:

- `let count = 1;` creates the loop variable before the loop starts. It must be `let`, because it will change.
- `while (count <= 5)` is the condition, in brackets, exactly as with `if`.
- The block in `{ }` is the loop body.
- `count++;` adds 1 to `count` at the end of each iteration (you met `++` in {{ch:first-program}}).

The difference from `if` is what happens **after** the block finishes. An `if` runs its block once and moves on. A `while` goes **back to the condition** and asks again.

### Level 2 — Tracing the loop step by step

The best way to understand a loop is to follow it exactly as the computer does, writing down the values at each step. This is called **tracing**:

```text
  step   count   condition count <= 5   what happens
  ----   -----   --------------------   ------------------------------
   1       1     true                   print "Lap 1", count becomes 2
   2       2     true                   print "Lap 2", count becomes 3
   3       3     true                   print "Lap 3", count becomes 4
   4       4     true                   print "Lap 4", count becomes 5
   5       5     true                   print "Lap 5", count becomes 6
   6       6     false                  loop ends; continue after it
```

Read the table one row at a time. Before each iteration, the condition is checked with the **current** value of `count`. On the sixth check, `count` is 6, the condition is false, and the program continues with the line after the loop.

Notice three things:

1. **The condition is checked before every iteration**, including the first. If `count` had started at 10, the condition would be false immediately and the body would never run — zero iterations.
2. **The condition is checked 6 times for 5 iterations.** The last check is the one that stops the loop.
3. **After the loop, `count` is 6**, not 5. The variable keeps its final value. This surprises people when they use it after the loop.

> [!TRY]
> Change the starting value to `let count = 3;` and predict the output before running. Then change the condition to `count < 5` and predict again. Tracing with a small table, as above, makes these predictions easy.

### Infinite loops

Here is the most famous loop mistake. Suppose you forget the line that changes the counter:

```js
let count = 1;

while (count <= 5) {
  console.log("Lap", count);
  // count++ is missing!
}
```

`count` stays 1 forever, so the condition is true forever, and the loop never ends. Your terminal fills with "Lap 1" thousands of times per second, and the program never reaches the next line.

**To stop a runaway program, press <kbd>Ctrl</kbd> + <kbd>C</kbd>** in the terminal (as you learned in {{ch:the-terminal}}). In a browser, an infinite loop freezes the page; the browser will eventually offer to stop the page, or you can close the tab.

> [!INSIDE]
> Why does an infinite loop freeze a web page completely — buttons stop working, nothing scrolls? JavaScript in a browser normally runs on **one thread**: one path of execution that does one thing at a time. While your loop is running, that thread is busy, so it cannot respond to clicks, redraw the page or do anything else. The same happens in a Node.js server: a long-running loop blocks *every* user's request until it finishes. {{ch:the-event-loop}} explains this in depth, and it is one of the most important ideas in backend JavaScript.

Every `while` loop needs something inside the body that will eventually make the condition false. When you write one, ask: **"What changes each time, and how do I know it will eventually stop?"**

### When to use `while`

`while` is best when you **do not know in advance how many iterations** there will be — when you keep going until something happens:

```js
let balance = 10000;
const monthlyPayment = 3000;
let months = 0;

while (balance > 0) {
  balance -= monthlyPayment;
  months++;
}

console.log(`Paid off after ${months} months. Final balance: ${balance}`);
```

**Output:**

```text
Paid off after 4 months. Final balance: -2000
```

Walkthrough:

- We do not know beforehand how many payments are needed; the loop keeps paying while there is still a balance.
- Each iteration reduces the balance and counts one month.
- After 3 payments the balance is 1,000 — still above 0 — so a fourth payment is made, taking it to -2,000. The loop then stops.
- The final balance of -2,000 reveals a real detail: the last payment was larger than needed. A real loan system would make the last payment exactly the remaining amount. Tracing the loop is how you notice such things.

## The `for` loop

### Level 1 — Counting made compact

Most loops follow the same three-part pattern: **set up** a counter, **check** a condition, **update** the counter. The `for` loop puts all three parts on one line:

```js
for (let i = 1; i <= 5; i++) {
  console.log("Lap", i);
}
```

**Output:**

```text
Lap 1
Lap 2
Lap 3
Lap 4
Lap 5
```

This does exactly what the first `while` loop did. Inside the round brackets are three parts, separated by **semicolons**:

```text
  for ( let i = 1 ;   i <= 5 ;   i++ )
        \_______/     \____/     \_/
        1. start      2. check   3. update
        (runs once)   (before    (after
                      each        each
                      iteration)  iteration)
```

1. **Initialisation** — `let i = 1` runs **once**, before the loop begins. It creates the loop variable.
2. **Condition** — `i <= 5` is checked **before each iteration**. If false, the loop ends.
3. **Update** — `i++` runs **after each iteration**, before the condition is checked again.

The order of events is: start → check → body → update → check → body → update → … → check (false) → done.

> [!NOTE]
> **Why is the loop variable called `i`?** It is a long tradition, from "index" or "iterator", going back to early programming languages and mathematics. For short counting loops, `i` is perfectly acceptable and universally understood. For loops inside loops, `j` and `k` are used next. When the counter means something specific, a descriptive name — `day`, `page`, `attempt` — is better.

### Level 2 — Variations: down, in steps, from zero

The three parts can be changed to count in any way you need:

```js
// Count down
for (let i = 5; i >= 1; i--) {
  console.log(i);
}
console.log("Lift off!");
```

**Output:**

```text
5
4
3
2
1
Lift off!
```

Start at 5, keep going while `i` is at least 1, and subtract 1 each time.

```js
// Count in steps of 5
for (let minutes = 0; minutes <= 20; minutes += 5) {
  console.log(`Reminder at ${minutes} minutes`);
}
```

**Output:**

```text
Reminder at 0 minutes
Reminder at 5 minutes
Reminder at 10 minutes
Reminder at 15 minutes
Reminder at 20 minutes
```

The update `minutes += 5` adds 5 each time. Here the variable has a descriptive name, because it means something.

```js
// The most common form: start at 0, go up to (but not including) a count
const numberOfItems = 3;
for (let i = 0; i < numberOfItems; i++) {
  console.log("Item index", i);
}
```

**Output:**

```text
Item index 0
Item index 1
Item index 2
```

This last form — **start at 0, continue while less than the count** — is by far the most common `for` loop in real code. It produces exactly `count` iterations, with values 0, 1, 2 … up to `count - 1`. Those are exactly the **indexes** of a string (from {{ch:types-of-data}}) or a list (from {{ch:arrays}}), which start at 0. That is why this pattern matters so much.

### The loop variable lives only inside the loop

A variable created with `let` in a `for` loop's first part exists **only inside the loop**:

```js
for (let i = 0; i < 3; i++) {
  console.log(i);
}
console.log(i);
```

**Output:**

```text
0
1
2
ReferenceError: i is not defined
```

After the loop, `i` no longer exists. This is deliberate and helpful: it prevents a counter from one loop accidentally being used, or changed, elsewhere. The area of code where a variable exists is called its **scope**; you will study scope properly in {{ch:scope-and-closures}}. (With the old `var` keyword, `i` would still exist after the loop — one of the confusing behaviours `let` was created to fix.)

### `for` or `while`?

| Use `for` when… | Use `while` when… |
|---|---|
| You know how many iterations there will be, or you are counting through positions | You repeat until something happens, and cannot know how many times in advance |
| e.g. "do this 10 times", "go through every character" | e.g. "keep paying until the balance is zero", "keep asking until the input is valid" |

Both can do anything the other can; the choice is about which makes the intention clearest.

## Going through a string

Strings have a `length` and zero-based indexes, so a `for` loop can visit every character:

```js
const word = "Lahore";

for (let i = 0; i < word.length; i++) {
  console.log(i, word[i]);
}
```

**Output:**

```text
0 L
1 a
2 h
3 o
4 r
5 e
```

Walkthrough:

- The loop runs from `i = 0` while `i < word.length` — that is, while `i < 6` — so `i` takes the values 0 to 5, exactly the valid indexes.
- `word[i]` picks out the character at the current index.

Notice the condition is `i < word.length`, not `i <= word.length`. With `<=`, the loop would also run for `i = 6`, and `word[6]` is `undefined`, because there is no seventh character. This is the classic **off-by-one error** from {{ch:types-of-data}}.

### `for...of` — when you only need the items

When you need each **character** but do not care about its index, JavaScript has a simpler loop, `for...of`:

```js
const word = "Lahore";

for (const letter of word) {
  console.log(letter);
}
```

**Output:**

```text
L
a
h
o
r
e
```

Read it as: "for each `letter` **of** `word`, run the block". JavaScript handles the counting, the indexes and the stopping for you, so there is no possibility of an off-by-one error.

- `const letter` — each iteration gets a fresh variable holding the current character. It can be `const`, because within one iteration it never changes.
- `of word` — the thing to go through.

`for...of` works on strings, and on **arrays** and several other collections that you will meet soon. Things that can be gone through one item at a time like this are called **iterables**. You will learn exactly what makes something iterable in {{ch:advanced-javascript}}.

> [!TIP]
> Use `for...of` when you need **each item**. Use the counting `for` loop when you need the **index** — for example, to compare each character with the next one, or to go backwards. (A bonus: `for...of` handles emoji properly, giving each emoji as one item, while indexing with `word[i]` can split an emoji into two halves, as you saw in {{ch:types-of-data}}.)

## The core loop patterns

Almost every loop you will ever write is one of a handful of patterns. Learn them as patterns, and you will recognise them everywhere.

### Pattern 1 — The accumulator (adding up)

An **accumulator** is a variable that collects a result as the loop goes round. Start it at a neutral value, and update it each iteration.

```js
// Add up the numbers 1 to 100
let sum = 0;

for (let n = 1; n <= 100; n++) {
  sum += n;
}

console.log("Sum:", sum);
```

**Output:**

```text
Sum: 5050
```

Walkthrough:

- `sum` starts at **0** — the neutral starting point for addition, because adding 0 changes nothing.
- Each iteration adds the current number: 0 + 1 = 1, then 1 + 2 = 3, then 3 + 3 = 6, and so on.
- The `let sum` is declared **outside** the loop. If it were declared inside, it would be created fresh — at 0 — every iteration, and would disappear after each one.

The same pattern works for multiplication (start at **1**, not 0, since multiplying by 0 always gives 0) and for building text (start with an **empty string** `""`):

```js
// Build a string: reverse a word
const word = "stressed";
let reversed = "";

for (let i = word.length - 1; i >= 0; i--) {
  reversed += word[i];
}

console.log(reversed);
```

**Output:**

```text
desserts
```

This loop counts **backwards** from the last index (`word.length - 1`, which is 7) down to 0, adding each character to the end of `reversed`.

### Pattern 2 — Counting matches

Count how many items meet a condition: a counter that starts at 0 and increases only when an `if` is true.

```js
const sentence = "Programming is about practice";
let vowelCount = 0;

for (const letter of sentence.toLowerCase()) {
  if ("aeiou".includes(letter)) {
    vowelCount++;
  }
}

console.log("Vowels:", vowelCount);
```

**Output:**

```text
Vowels: 10
```

Walkthrough:

- `sentence.toLowerCase()` makes every letter lowercase first, so capital vowels are counted too.
- For each letter, `"aeiou".includes(letter)` asks "is this letter one of the vowels?" — a neat use of the string method from {{ch:types-of-data}}.
- The counter only increases when the answer is yes.

This combines a loop with a decision from {{ch:operators-and-decisions}}. Loops and `if` statements together can express almost any process.

### Pattern 3 — Finding the largest or smallest

Keep track of the "best so far", and replace it whenever you find something better.

```js
const digits = "4829175";
let largest = -Infinity;

for (const character of digits) {
  const digit = Number(character);
  if (digit > largest) {
    largest = digit;
  }
}

console.log("Largest digit:", largest);
```

**Output:**

```text
Largest digit: 9
```

Walkthrough:

- `largest` starts at `-Infinity`, a value smaller than any real number (from {{ch:types-of-data}}). This guarantees the very first digit replaces it. Starting at 0 would be a subtle bug if all the values could be negative.
- Each character is converted to a number with `Number(character)` — remember that characters of a string are strings, and comparing strings gives alphabetical results, not numeric ones.
- Whenever a digit beats the current largest, it becomes the new largest.

### Pattern 4 — Searching (and stopping early with `break`)

Often you are looking for **one** thing, and once you have found it, there is no reason to keep going. The `break` keyword ends a loop immediately:

```js
const password = "secret7word";
let firstDigitPosition = -1;

for (let i = 0; i < password.length; i++) {
  const character = password[i];
  if (character >= "0" && character <= "9") {
    firstDigitPosition = i;
    break;
  }
}

console.log("First digit at index:", firstDigitPosition);
```

**Output:**

```text
First digit at index: 6
```

Walkthrough:

- `firstDigitPosition` starts at `-1`, a common convention meaning "not found" (the same convention `indexOf` uses).
- `character >= "0" && character <= "9"` checks whether the character is a digit. This compares strings, and it works because the digit characters `"0"` to `"9"` sit together, in order, in the character table.
- When a digit is found, its index is saved and `break` **stops the loop instantly**. The remaining characters are never checked.
- If no digit existed, the loop would finish normally and the value would stay `-1`.

`break` saves work — on a list of a million items, stopping at item 10 is a big difference. It is the same `break` you used in `switch` in {{ch:operators-and-decisions}}: it exits the nearest enclosing loop or `switch`.

### `continue` — skip to the next iteration

`continue` skips **the rest of the current iteration** and goes straight on to the next one. The loop itself keeps going.

```js
const items = "apple,,banana,,,cherry";

for (const part of items.split(",")) {
  if (part === "") {
    continue;
  }
  console.log("Item:", part);
}
```

**Output:**

```text
Item: apple
Item: banana
Item: cherry
```

Walkthrough:

- `items.split(",")` cuts the text at each comma, giving a list of pieces — some of which are empty, because of the doubled commas. (You saw `split` in {{ch:types-of-data}}; `for...of` works on the list it returns.)
- For empty pieces, `continue` skips the `console.log` and moves on to the next piece.

`continue` is useful for skipping invalid or irrelevant items at the start of a loop body, rather than wrapping all the real work in a big `if`. Like the guard clause you saw hinted at in {{ch:operators-and-decisions}}, it keeps the main logic flat and readable.

```text
  break     -> leave the loop completely, now
  continue  -> skip the rest of this lap, start the next one
```

## `do...while` — run at least once

There is one more form, used less often. A `do...while` loop runs its body **first**, and checks the condition **afterwards**. So it always runs at least once.

```js
let attempt = 0;
let succeeded = false;

do {
  attempt++;
  succeeded = Math.random() > 0.5; // pretend: 50% chance of success
  console.log(`Attempt ${attempt}: ${succeeded ? "success" : "failed"}`);
} while (!succeeded && attempt < 5);
```

**Output (random — one possible run):**

```text
Attempt 1: failed
Attempt 2: failed
Attempt 3: success
```

Walkthrough:

- The body runs once before any check, because a first attempt must always happen.
- After each attempt, the condition asks: "not yet succeeded, **and** fewer than 5 attempts made?" If both are true, try again.
- `Math.random() > 0.5` simulates an operation that succeeds about half the time (you met `Math.random` in {{ch:types-of-data}}).
- The `attempt < 5` part is a **limit**: even if success never comes, the loop stops after 5 tries. This is a vital safety net, as you will see in the real-world section.

Use `do...while` when the body must run at least once before you can know whether to repeat — attempts, menus, "ask until valid" input. Note the semicolon after the closing `while (...)`.

## Loops inside loops

A loop body can contain another loop. For every single iteration of the **outer** loop, the **inner** loop runs **completely**.

```js
for (let row = 1; row <= 3; row++) {
  let line = "";
  for (let col = 1; col <= 4; col++) {
    line += `${row * col}\t`;
  }
  console.log(line);
}
```

**Output:**

```text
1	2	3	4
2	4	6	8
3	6	9	12
```

Walkthrough:

- The outer loop runs 3 times, once per `row`.
- For **each** row, `line` starts empty, and the inner loop runs 4 times, once per `col`, adding `row * col` followed by a tab character (`\t`, from {{ch:types-of-data}}) to line things up.
- After the inner loop finishes, the completed line is printed, and the outer loop moves on to the next row.
- In total the inner body runs 3 × 4 = **12** times.

Nested loops are natural for anything with rows and columns — tables, grids, seating plans, comparing every item with every other item.

### Why nested loops can become slow

Count the work. If the outer loop runs `n` times and the inner loop runs `n` times for each, the inner body runs **n × n** times:

| n (items) | Iterations of the inner body |
|---|---|
| 10 | 100 |
| 1,000 | 1,000,000 |
| 100,000 | 10,000,000,000 |

With 10 items, nobody notices. With 100,000, the program does ten billion steps and may take minutes — or freeze a server. The amount of work grows with the **square** of the input size.

This is one of the most common causes of real performance problems: code that compares every item with every other item, works perfectly with test data, and becomes painfully slow when real data grows. {{ch:big-o}} gives you a precise way to describe and predict this, and {{ch:arrays-strings-hash-maps}} shows how a different way of organising data can often replace a nested loop with a single loop.

## From beginner to enterprise: loops at every level

**Level 3 — A small program.** Loops count, add up and search through strings and small lists, all in memory, in a fraction of a second.

**Level 4 — A real application.** Loops go through baskets, order histories and search results. Data usually comes from a database, and a common professional rule appears: **ask the database to do the filtering and adding up when possible**, rather than fetching everything and looping in JavaScript. Fetching 100,000 rows to count 12 of them wastes time, memory and network.

**Level 5 — Professional engineering.** Large jobs are processed in **batches**: instead of loading a million records at once (and running out of memory, as you learned in {{ch:what-a-computer-is}}), a loop fetches 1,000, processes them, then fetches the next 1,000. Data from APIs is fetched **page by page** in a loop until no pages remain. Operations that can fail, such as network calls, are **retried in a loop** with a maximum number of attempts and increasing waits between them. Every loop that depends on something outside the program has a **limit**, so a surprise cannot make it run forever.

**Level 6 — Enterprise.** At very large scale, a single loop on a single machine is too slow, so the work is split across many machines that each process part of the data at the same time — through **queues** of jobs that many workers take from ({{ch:queues}}), or through data-processing systems built for this purpose. The loop has not disappeared; it has been divided up and run in parallel, with careful tracking so that every item is processed once and failures are retried.

## Real-world use cases

### Beginner level — A times-table practice program

**Situation:** a learner wants to print the 7 times table.

**Solution:** `for (let i = 1; i <= 10; i++) { console.log(`7 x ${i} = ${7 * i}`); }`.

**Lesson:** ten lines of output from one line of logic — and changing `7` or `10` changes everything instantly.

### Intermediate level — Sending reminder emails

**Business problem:** an online course platform must email every student whose subscription ends within seven days.

**Solution:** query the database for exactly those students (letting the database filter), then loop over the results and send each an email.

**Failure scenario:** the email service fails halfway through the loop. Without care, the loop crashes, half the students get emails and half do not — and re-running the job emails the first half **again**. Professional versions record which emails have been sent (so a re-run skips them), and handle each student's failure without stopping the whole loop.

**Trade-off:** tracking progress adds a little complexity, but makes the job safe to re-run — a property you met as **idempotency** in {{ch:how-the-web-works}}.

### Advanced level — Retrying a payment call

**Business problem:** a shop's calls to its payment provider occasionally fail because of brief network problems ({{ch:how-the-internet-works}}). Failing the customer's order in those cases loses sales.

**Solution:** retry the call in a loop, up to 3 attempts, waiting longer between each (for example 0.5, 1 and 2 seconds — called **exponential backoff**), and only for errors that are temporary.

**Reasoning:** most brief failures fix themselves within a second or two; the growing wait avoids hammering a struggling service.

**Failure scenarios:** a retry loop with **no limit** can run forever. One that retries a payment that actually *succeeded* (but whose response was lost) can charge the customer twice — so payment retries must use **idempotency keys**. Retrying non-temporary errors such as "card declined" is pointless and annoying.

### Enterprise level — A nightly report over a huge table

**Business problem (illustrative):** a logistics company builds a nightly report over 200 million delivery records.

**Technical problem:** a first attempt loads all records into a Node.js process and loops over them. It runs out of memory and crashes, and while it runs it blocks the server it shares with live traffic.

**Solution:** let the database compute the totals where possible; where processing in code is unavoidable, read records in batches of a few thousand, process each batch, and move on — on a separate machine from the live application, or as parallel jobs.

**Lesson:** a loop that is fine for 1,000 items can be dangerous for 200 million. The size of the data decides the design.

## Common mistakes

### Beginner mistake — The infinite loop

**What it looks like:** the program never finishes; the terminal floods with output, or a web page freezes.

**Why it happens:** the loop variable is never updated, is updated in the wrong direction (`i++` when counting down), or the condition can never become false (`i !== 10` when `i` goes 1, 3, 5, 7, 9, 11…).

**How to spot it:** output that repeats forever; a process using 100% of one CPU core ({{ch:what-a-computer-is}}).

**How to fix and prevent it:** press <kbd>Ctrl</kbd> + <kbd>C</kbd>. Then check that something in the body moves the condition towards false. Prefer `<` and `>` over `!==` in loop conditions, so overshooting the target still stops the loop.

### Beginner mistake — Off-by-one

**What it looks like:** `for (let i = 0; i <= word.length; i++)` — one iteration too many, producing `undefined`. Or `for (let i = 1; i < 10; i++)` when ten iterations were wanted — one too few.

**How to spot it:** trace the first and last iterations by hand. What is `i` on the first iteration? On the last?

**How to fix and prevent it:** for indexes, use the standard form `for (let i = 0; i < length; i++)`, or avoid indexes entirely with `for...of`.

### Beginner mistake — Resetting the accumulator inside the loop

**What it looks like:**

```js
for (let n = 1; n <= 5; n++) {
  let sum = 0;
  sum += n;
}
```

**What happens:** `sum` is recreated at 0 every iteration, and does not exist after the loop.

**How to fix it:** declare the accumulator **before** the loop.

### Intermediate mistake — Changing what you are looping over

**What it looks like:** while looping through a list of items, adding or removing items from that same list.

**What happens:** items are skipped or processed twice, depending on exactly how the list changed. You will see this concretely with arrays in {{ch:arrays}}.

**How to prevent it:** build a new list instead of changing the one you are going through.

### Production mistake — Loops without limits around external operations

**What it looks like:** `while (!succeeded) { tryAgain(); }` — a retry loop with no maximum, or a "fetch the next page" loop that trusts the other service to eventually say "no more pages".

**What happens:** when the other service is down, or returns the same page forever because of a bug, the loop never ends. Servers hang, logs fill disks, and other services are flooded with requests.

**How to prevent it:** every loop that depends on something outside your program gets a maximum number of iterations, and logs clearly when that limit is hit.

### Enterprise mistake — Nested loops over growing data

**What it looks like:** code that compares every order with every customer, written when there were 500 of each, still running after the company has 2 million.

**What happens:** a job that took a second now takes hours, or times out.

**How to prevent it:** think about how the data will grow. Replace "loop inside a loop" with smarter lookups ({{ch:arrays-strings-hash-maps}}) or with database queries ({{ch:sql}}).

## Debugging and troubleshooting

The single most powerful tool for loop bugs is to **print the loop's state each iteration**:

```js
for (let i = 0; i < word.length; i++) {
  console.log({ i, character: word[i], reversed });
  // ... the loop's real work
}
```

This shows exactly what the loop sees on every lap. Compare it with what you *expected* — your hand trace — and the first iteration where they differ is where the bug is.

| Symptom | Likely cause |
|---|---|
| Never finishes | Loop variable not updated, updated the wrong way, or a `!==` condition that is skipped over |
| Runs zero times | The condition is false from the very start — check the starting value and the comparison |
| One iteration too many, `undefined` at the end | `<=` where `<` was needed |
| One iteration too few | `<` where `<=` was needed, or starting at 1 instead of 0 |
| Result is only the last item, not the total | Accumulator declared inside the loop |
| Results look alphabetical, not numeric | Comparing digit characters as strings — convert with `Number` |
| Slow with real data, fine with test data | Nested loops over large inputs |

> [!TIP]
> When a loop runs thousands of times, printing every iteration floods the terminal. Print only around the problem: add a condition such as `if (i > 995) console.log(...)`, or print every thousandth iteration with `if (i % 1000 === 0)`. The remainder operator from {{ch:types-of-data}} is handy here.

## How a senior engineer thinks about loops

> [!SENIOR]
> When an experienced engineer writes or reviews a loop, they ask:
>
> - **How do I know it stops?** For every loop, there must be a clear answer — and for loops that depend on the outside world, an explicit maximum.
> - **How big can the input get?** Not today's size — next year's. Ten items and ten million items need different designs.
> - **Is this the right place for the loop?** Filtering and totalling are often better done by the database. Heavy processing is often better done in batches, in background jobs, away from the code serving live users.
> - **What happens if one iteration fails?** Should one bad item stop everything, or be recorded and skipped? Can the job be re-run safely?
> - **Is there a clearer form?** `for...of` instead of index juggling. Array methods like `map` and `filter` ({{ch:arrays}}) instead of manual accumulators. Clear loops are easier to get right.

## Exercises

### Exercise 1 — Sum of even numbers

**Objective:** practise the accumulator pattern with a condition.

**What to build:** add up all the **even** numbers from 1 to 50 and print the total.

**Hints:** use the remainder operator — a number is even when `n % 2 === 0`. Alternatively, count in steps of 2.

<details>
<summary>Show the solution</summary>

**Version 1 — check each number:**

```js
let sumOfEvens = 0;

for (let n = 1; n <= 50; n++) {
  if (n % 2 === 0) {
    sumOfEvens += n;
  }
}

console.log("Sum of even numbers 1-50:", sumOfEvens);
```

**Version 2 — only visit even numbers:**

```js
let sumOfEvens = 0;

for (let n = 2; n <= 50; n += 2) {
  sumOfEvens += n;
}

console.log("Sum of even numbers 1-50:", sumOfEvens);
```

**Output (both):**

```text
Sum of even numbers 1-50: 650
```

Walkthrough:

- Both start the accumulator at 0, **outside** the loop.
- Version 1 visits all 50 numbers and adds only those where the remainder after dividing by 2 is 0.
- Version 2 starts at 2 and steps by 2, so it only ever visits even numbers — 25 iterations instead of 50, and no `if` needed.

Both are correct. Version 2 does half the work and is arguably clearer about its intention. Recognising that you can change *how you count* to avoid unnecessary checks is a useful habit.

**Common wrong approach:** starting Version 2 at `n = 1` — then it visits 1, 3, 5… and adds the **odd** numbers instead.

</details>

### Exercise 2 — FizzBuzz

**Objective:** practise combining loops and decisions — a classic interview warm-up.

**What to build:** print the numbers from 1 to 20, except: for multiples of 3 print `Fizz`, for multiples of 5 print `Buzz`, and for multiples of **both** 3 and 5 print `FizzBuzz`.

**Hint:** think carefully about the **order** of your conditions.

<details>
<summary>Show the solution</summary>

```js
for (let n = 1; n <= 20; n++) {
  if (n % 3 === 0 && n % 5 === 0) {
    console.log("FizzBuzz");
  } else if (n % 3 === 0) {
    console.log("Fizz");
  } else if (n % 5 === 0) {
    console.log("Buzz");
  } else {
    console.log(n);
  }
}
```

**Output:**

```text
1
2
Fizz
4
Buzz
Fizz
7
8
Fizz
Buzz
11
Fizz
13
14
FizzBuzz
16
17
Fizz
19
Buzz
```

Walkthrough:

- The loop visits each number from 1 to 20.
- The "both" case is checked **first**. As you learned in {{ch:operators-and-decisions}}, an `else if` chain runs only the first true branch, so the most specific condition must come first.
- `n % 3 === 0` means "divisible by 3"; likewise for 5. (Divisible by both 3 and 5 is the same as divisible by 15, so `n % 15 === 0` also works for the first check.)

**Common wrong approach:** checking `n % 3 === 0` first. Then 15 prints `Fizz`, because the "Fizz" branch catches it before the "FizzBuzz" branch is ever reached. Interviewers use this exercise precisely because it tests whether you think about condition order.

</details>

### Exercise 3 — Is it a palindrome?

**Objective:** practise looping through a string with indexes and stopping early.

**What to build:** check whether a word reads the same forwards and backwards (a **palindrome**), such as `"level"` or `"racecar"`. Print `true` or `false`. Test with `"level"`, `"lahore"` and `"noon"`.

**Hints:** compare the first character with the last, the second with the second-to-last, and so on. You only need to go halfway. As soon as one pair differs, you know the answer.

<details>
<summary>Show the solution</summary>

```js
const word = "level";
let isPalindrome = true;

for (let i = 0; i < word.length / 2; i++) {
  const fromStart = word[i];
  const fromEnd = word[word.length - 1 - i];
  if (fromStart !== fromEnd) {
    isPalindrome = false;
    break;
  }
}

console.log(`"${word}" is a palindrome: ${isPalindrome}`);
```

**Output (for "level"):**

```text
"level" is a palindrome: true
```

Results for the other tests: `"lahore"` → false, `"noon"` → true.

Walkthrough:

- `isPalindrome` starts as `true` — "innocent until proven guilty". The loop only has to find **one** mismatch to prove it false.
- `i` goes from 0 up to half the length. For `"level"` (length 5), `i` takes the values 0, 1 and 2 (2 < 2.5 is still true). The middle letter is compared with itself, which is harmless.
- `word[word.length - 1 - i]` is the matching character from the end: when `i` is 0, it is the last character; when `i` is 1, the second-to-last, and so on.
- On the first mismatch, the result is set to `false` and `break` stops the loop, because nothing more needs checking.

Tracing `"lahore"`: `i = 0` compares `"l"` with `"e"` — different — so the result is false after just one comparison.

**Common wrong approach:** building the reversed string and comparing (as in the accumulator example). That works and is simple, but does more work: it always processes every character and builds a new string, even when the first pair already differs. Both are acceptable for short words; the halfway check is what interviewers often hope to see.

</details>

### Exercise 4 — Fix the frozen program (debugging)

**Objective:** practise finding loop bugs by tracing.

**The scenario:** this program is meant to print the countdown 10, 8, 6, 4, 2 and then "Done". Instead, it never finishes. (Run it, then stop it with <kbd>Ctrl</kbd> + <kbd>C</kbd>.)

```js
let n = 10;

while (n !== 1) {
  console.log(n);
  n -= 2;
}

console.log("Done");
```

**What to do:** trace the first few iterations, explain why it never stops, and fix it.

<details>
<summary>Show the solution</summary>

**Trace:**

```text
  n    n !== 1   action
  10   true      print 10, n becomes 8
  8    true      print 8,  n becomes 6
  6    true      print 6,  n becomes 4
  4    true      print 4,  n becomes 2
  2    true      print 2,  n becomes 0
  0    true      print 0,  n becomes -2
  -2   true      ...and so on, forever
```

**Why:** `n` takes only even values — 10, 8, 6, 4, 2, 0, -2… — so it **jumps over** 1 and never equals it. The condition `n !== 1` is therefore always true.

**Fix:** use a condition that stops once `n` has gone **past** the target, instead of waiting for it to hit an exact value:

```js
let n = 10;

while (n >= 2) {
  console.log(n);
  n -= 2;
}

console.log("Done");
```

**Output:**

```text
10
8
6
4
2
Done
```

(Equally correct: `for (let n = 10; n >= 2; n -= 2) { console.log(n); }`.)

**Lesson:** `!==` conditions in loops are fragile, because the loop variable may skip the exact value. `<`, `<=`, `>` and `>=` keep working even if the variable jumps past the target. Tracing a few iterations by hand revealed the problem in seconds.

**Common wrong approach:** changing the condition to `n !== 0`. It works for this exact starting value, but would loop forever if the start were changed to 9. Fix the *kind* of condition, not just the number.

</details>

## Summary

A **loop** repeats a block of code; each repeat is an **iteration**. A **`while`** loop checks its condition before every iteration and repeats while it is truthy — best when the number of iterations is unknown. Every loop needs something that eventually makes its condition false, or it becomes an **infinite loop** (stop it with <kbd>Ctrl</kbd> + <kbd>C</kbd>), which blocks everything else in a JavaScript program.

A **`for`** loop combines initialisation, condition and update in one line; the standard form `for (let i = 0; i < length; i++)` visits every index exactly once. A `let` loop variable exists only inside the loop. **`for...of`** goes through the items of a string or other **iterable** without indexes. **`do...while`** runs at least once.

The core patterns are the **accumulator** (summing or building, with the variable declared before the loop), **counting matches**, **finding the largest or smallest** (starting from `-Infinity` or `Infinity`), and **searching** with **`break`** to stop early. **`continue`** skips to the next iteration. **Nested loops** multiply work — n × n — and become slow as data grows.

Trace loops by hand and print their state to debug them. In real systems, loops process data in **batches** and **pages**, retry with limits and backoff, and every loop that depends on the outside world has a maximum.

## Key terms

- **Loop** — A statement that runs a block of code repeatedly.
- **Iteration** — One run through a loop's body.
- **Loop condition** — The expression checked to decide whether a loop continues.
- **Loop body** — The block of code that a loop repeats.
- **Loop variable (counter)** — A variable that changes each iteration, usually to track progress and end the loop.
- **Iterate** — To go through a collection one item at a time.
- **Tracing** — Following a program by hand, step by step, writing down the values of variables at each step.
- **Infinite loop** — A loop whose condition never becomes false, so it never ends.
- **Thread** — A single path of execution in a program, doing one thing at a time.
- **`while` loop** — A loop that repeats while its condition is truthy, checking before each iteration.
- **`for` loop** — A loop with initialisation, condition and update written together in its header.
- **`for...of` loop** — A loop that goes through each item of an iterable, such as each character of a string.
- **Iterable** — A value, such as a string or an array, that can be gone through one item at a time with `for...of`.
- **`do...while` loop** — A loop that runs its body first and checks its condition afterwards, so it always runs at least once.
- **Accumulator** — A variable that collects a result, such as a total, as a loop runs.
- **`break`** — A keyword that ends the nearest loop (or `switch`) immediately.
- **`continue`** — A keyword that skips the rest of the current iteration and moves on to the next.
- **Nested loop** — A loop inside the body of another loop.
- **Scope** — The region of a program in which a variable exists and can be used.
- **Palindrome** — A word or phrase that reads the same forwards and backwards.
- **Batch processing** — Handling a large amount of data in smaller groups, one group at a time.
- **Pagination** — Fetching or showing data one page at a time rather than all at once.
- **Exponential backoff** — Waiting a growing amount of time between retries, such as 0.5, 1, then 2 seconds.

## What comes next

You can now store values, make decisions and repeat work — the three building blocks of every program. But as programs grow, you will notice the same pieces of code being written again and again: calculating a delivery fee in three places, formatting a price in ten.

In the next chapter, **Functions: Naming and Reusing Work**, you will learn to give a piece of code a name, give it inputs and get a result back, so you can write it once and use it everywhere. Functions are how real programs are organised, and they unlock nearly everything that follows in this book.
