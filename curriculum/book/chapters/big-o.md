# Measuring Speed and Memory: Big O Notation

> [!GOALS]
> - Why engineers measure how a solution's cost **grows**, rather than how many seconds it takes.
> - What Big O notation means, and the simple rules for working it out.
> - The common complexity classes — O(1), O(log n), O(n), O(n log n), O(n²), O(2ⁿ) — with a real feeling for how fast or slow each one is.
> - How to analyse the time complexity of code by reading it: sequences, loops, nested loops, halving and hidden costs.
> - Best, average and worst cases, and what "amortised" means.
> - Space complexity — how much extra memory a solution needs — including the memory used by recursion.
> - The costs of everyday JavaScript operations, and the traps that turn fast code slow.
> - How to use a problem's input size to decide which solution is good enough.
> - Where Big O stops being the whole story in real systems.

## Why this matters

In {{ch:problem-solving}} you compared two solutions to the "pair that adds up" problem. One checked every pair with a nested loop; the other made one pass with a `Map`. We said, informally, that the first did about five billion comparisons for 100,000 prices and the second about 100,000 steps.

Engineers need a **precise, shared language** for statements like this, for three reasons:

1. **To compare solutions** before building them — "the map version is much better for large inputs".
2. **To predict the future** — "this report takes two seconds with 10,000 customers. What happens when we have a million?"
3. **To communicate** — in code reviews, design discussions and, very often, interviews: "What is the time complexity of your solution?" is asked after almost every coding question.

That language is **Big O notation**. It is not difficult mathematics. It is a way of describing the **shape** of a cost: does it stay flat, grow steadily, or explode as the input grows?

## The simple idea

Imagine three ways to find a friend's phone number:

1. **You saved it under "Sara" in your phone.** You type "Sara" and it appears instantly. It does not matter whether you have 50 contacts or 5,000 — it takes the same moment.
2. **It is written somewhere in a long, unsorted list.** You read the list from the top until you find it. Twice as many names means, on average, twice as long.
3. **You have a list of everyone's numbers, and for each person you compare their number with everyone else's to find duplicates.** Twice as many people means **four times** as much work.

The question Big O answers is not "how long does it take?" but "**how does the time grow as the list grows?**" — flat, steadily, or much faster than the list itself.

> [!ANALOGY]
> Big O is like describing journeys by their shape instead of their exact time. "Walk next door" stays short however far you live from the city centre. "Walk to the end of the street" grows with the street's length. "Walk to every house and, from each one, visit every other house" grows explosively.
>
> **Where the analogy breaks:** Big O deliberately ignores the speed of the walker and the length of each step — the constant details. In real life, a fast car on a slightly longer route can beat a slow walk on a shorter one. Likewise, an algorithm with a worse Big O can be faster for small inputs. Big O describes how cost **grows**, not which program wins at every size.

## The proper definition and key words

- **Time complexity** describes how the number of steps an algorithm takes grows as the size of its input grows.
- **Space complexity** describes how the **extra** memory an algorithm needs grows as the input grows.
- **n** is the conventional name for the size of the input — the number of elements in an array, characters in a string, records in a table.
- **Big O notation** — written like O(n) or O(n²), read "order n" or "big O of n squared" — describes an **upper bound** on that growth: for large enough inputs, the cost grows **no faster than** this shape, ignoring constant factors.
- A **complexity class** is a family of algorithms with the same growth shape, such as "linear" or "quadratic".

## Why not just measure seconds?

You could time two programs with `console.time` ({{ch:errors-and-debugging}}). That is useful — and you should do it — but seconds alone are a poor way to **compare algorithms**, because they depend on:

- the computer (a fast laptop or an old phone);
- what else the computer is doing at that moment;
- the programming language and engine version;
- **the size of the test input** — the most important point.

A solution that takes 1 millisecond on 100 items may take 1 millisecond or 100 seconds on 1,000,000 items, depending entirely on how its cost grows. Timing it once on a small input tells you almost nothing about the large case.

So instead of seconds, we count **steps** — basic operations such as a comparison, an addition, an assignment, reading an array element — and ask how that count grows with n.

## Counting steps

### Level 2 — From code to a formula

Let us count the steps in a simple function:

```ts
function sumPrices(prices: number[]): number {
  let total = 0;                 // 1 step
  for (const price of prices) {  // the loop runs n times
    total += price;              //   1 step each time  -> n steps
  }
  return total;                  // 1 step
}
```

Roughly: 1 + n + 1 = **n + 2** steps. (Precisely counting the loop's own bookkeeping would add a few more per iteration; it does not change the conclusion, as you will see.)

Now one with a nested loop:

```ts
function countEqualPairs(prices: number[]): number {
  let count = 0;                                   // 1
  for (let i = 0; i < prices.length; i++) {        // n times
    for (let j = i + 1; j < prices.length; j++) {  //   about n/2 times on average
      if (prices[i] === prices[j]) count++;        //     1 step
    }
  }
  return count;                                    // 1
}
```

The inner line runs about n × (n − 1) / 2 times — the number of pairs — which is about **n²/2 − n/2 + 2** steps in total.

These exact formulas are tedious, and the precise numbers depend on details we do not care about. What we really want is the **dominant shape**. That is what Big O extracts.

### Level 3 — The rules of Big O

To turn a step count into Big O, apply two rules:

**Rule 1 — Drop constant factors.** n/2 and 3n and 100n all grow in the same shape: double the input, double the work. So all of them are **O(n)**. Constants depend on the machine, the language and the details of the code — exactly what we want to ignore.

**Rule 2 — Keep only the fastest-growing term.** In n²/2 − n/2 + 2, as n gets large, the n² part completely dominates:

| n | n² / 2 | n / 2 | 2 |
|---|---|---|---|
| 10 | 50 | 5 | 2 |
| 1,000 | 500,000 | 500 | 2 |
| 1,000,000 | 500,000,000,000 | 500,000 | 2 |

At a million items, the n/2 and the 2 are irrelevant. So the nested-loop function is **O(n²)**, and `sumPrices` (n + 2) is **O(n)**.

That is all there is to the basic idea: count roughly, drop constants, keep the biggest term.

> [!NOTE]
> Strictly, Big O is an **upper bound**: saying an algorithm is O(n²) means it grows *no faster* than n². Mathematicians also use **Θ (theta)** for a "tight" bound — grows *exactly* like — and **Ω (omega)** for a lower bound — grows *at least* like. In everyday engineering and interviews, people say "O(n)" when they mean the tight bound, and that is the convention this book follows. If an interviewer asks about Θ or Ω, it is these meanings they want.

## The common complexity classes

Almost every algorithm you meet falls into one of a few classes. Learn them as a ladder, from best to worst:

| Big O | Name | Grows like | Typical example |
|---|---|---|---|
| **O(1)** | constant | does not grow | reading `arr[5]`; `map.get(key)` |
| **O(log n)** | logarithmic | grows very slowly | binary search in a sorted array |
| **O(n)** | linear | in step with n | one loop over the array |
| **O(n log n)** | linearithmic ("n log n") | a little faster than n | good sorting algorithms |
| **O(n²)** | quadratic | n times n | comparing every pair |
| **O(n³)** | cubic | n times n times n | three nested loops |
| **O(2ⁿ)** | exponential | doubles with each extra item | trying every subset |
| **O(n!)** | factorial | astronomically | trying every ordering |

### Feeling the difference

Numbers make the classes real. This table shows roughly how many steps each class needs at different input sizes:

| n | log n | n | n log n | n² | 2ⁿ |
|---|---|---|---|---|---|
| 10 | 3 | 10 | 33 | 100 | 1,024 |
| 100 | 7 | 100 | 664 | 10,000 | 1.3 × 10³⁰ |
| 1,000 | 10 | 1,000 | about 10,000 | 1,000,000 | — |
| 1,000,000 | 20 | 1,000,000 | about 20,000,000 | 10¹² | — |
| 1,000,000,000 | 30 | 10⁹ | about 3 × 10¹⁰ | 10¹⁸ | — |

(log n here means log base 2 — how many times you can halve n before reaching 1. 10³⁰ means a 1 followed by 30 zeros.)

Now translate steps into time. A modern computer running JavaScript performs very roughly **10⁸ simple operations per second** — a rough rule of thumb, varying a lot with the kind of operation. So:

| Class | n = 1,000 | n = 1,000,000 | n = 1,000,000,000 |
|---|---|---|---|
| O(log n) | instant | instant | instant |
| O(n) | instant | about 0.01 seconds | about 10 seconds |
| O(n log n) | instant | about 0.2 seconds | about 5 minutes |
| O(n²) | about 0.01 seconds | about **3 hours** | about **300 years** |
| O(2ⁿ) | longer than the age of the universe | — | — |

Look at the O(n²) row. At 1,000 items, nobody notices. At a million, it takes hours. This is exactly the pattern from {{ch:loops}}: code that works perfectly in testing and collapses in production as the data grows.

And look at O(log n): even for a billion items, about 30 steps. That is why halving algorithms like binary search are so powerful.

```text
  steps
    ^
    |                                     O(2^n)      O(n^2)
    |                                    /           /
    |                                   /          /
    |                                  /         /
    |                                 /        /           O(n log n)
    |                                /       /         ___/
    |                               /      /      ___/       O(n)
    |                              /     /   ____/      ____/
    |                             /    / ___/      ____/
    |                            /   /__/     ____/
    |                          _/ __/    ____/          ___________ O(log n)
    |                       __/__/  ____/  ____________/
    |  ___________________/_______/_______/________________________ O(1)
    +-----------------------------------------------------------------> n
```

The sketch shows the shapes: O(1) stays flat; O(log n) rises slowly and flattens; O(n) is a straight line; O(n log n) bends up slightly; O(n²) curves up steeply; O(2ⁿ) shoots almost straight up.

## Analysing code: the patterns

You can work out the time complexity of most code by recognising a few patterns.

### Pattern 1 — Fixed work: O(1)

Code whose number of steps does not depend on n:

```ts
function firstAndLast(items: number[]): [number | undefined, number | undefined] {
  return [items[0], items[items.length - 1]];
}
```

Reading two elements by index takes the same time whether the array has 3 items or 3 million. **O(1)**. (Note: O(1) does not mean "one step"; it means "a fixed number of steps". A function doing 50 fixed steps is still O(1).)

### Pattern 2 — One loop over the input: O(n)

```ts
function containsPrice(prices: number[], target: number): boolean {
  for (const price of prices) {
    if (price === target) return true;
  }
  return false;
}
```

In the worst case — the target is last or missing — the loop visits all n elements. **O(n)**.

### Pattern 3 — Steps in sequence: add, then keep the biggest

```ts
function stats(prices: number[]) {
  let total = 0;
  for (const p of prices) total += p;          // O(n)

  let max = -Infinity;
  for (const p of prices) if (p > max) max = p; // O(n)

  return { total, max };                        // O(1)
}
```

Two loops **one after the other** cost O(n) + O(n) + O(1) = O(2n + 1) = **O(n)**. Doing things in sequence **adds** their costs, and then the biggest term wins. Two separate passes are still linear.

### Pattern 4 — Loops inside loops: multiply

```ts
function hasDuplicate(ids: string[]): boolean {
  for (let i = 0; i < ids.length; i++) {          // n times
    for (let j = i + 1; j < ids.length; j++) {    //   up to n times
      if (ids[i] === ids[j]) return true;
    }
  }
  return false;
}
```

A loop **inside** a loop **multiplies**: n × n = **O(n²)**.

Be careful: the multiplication only applies when both loops depend on the same input size. Two different inputs give two different variables:

```ts
function matchOrdersToCustomers(orders: string[], customers: string[]) {
  for (const order of orders) {          // o times
    for (const customer of customers) {  //   c times
      // ...
    }
  }
}
```

This is **O(o × c)** — with o orders and c customers. If one of them is small and fixed (say, always 5 delivery zones), the cost is effectively linear in the other.

And a nested loop that runs a **fixed** number of times is not quadratic:

```ts
for (const order of orders) {        // n times
  for (let day = 0; day < 7; day++) {  // always 7 times
    // ...
  }
}
```

That is n × 7 — **O(n)**.

### Pattern 5 — Halving each time: O(log n)

```ts
function countHalvings(n: number): number {
  let steps = 0;
  while (n > 1) {
    n = Math.floor(n / 2);
    steps++;
  }
  return steps;
}

console.log(countHalvings(8), countHalvings(1_000), countHalvings(1_000_000_000));
```

**Output:**

```text
3 9 29
```

When each step **cuts the remaining work in half**, the number of steps is the number of times you can halve n before reaching 1: the **logarithm** (base 2) of n. A billion needs only about 30 halvings. Any algorithm that throws away half of the remaining possibilities at each step — binary search ({{ch:recursion-sorting-searching}}), finding a word in a dictionary by opening it in the middle, descending a balanced tree ({{ch:trees-heaps-graphs}}) — is **O(log n)**.

> [!INSIDE]
> **What is a logarithm?** It is the reverse of repeated multiplication. 2 × 2 × 2 = 8, so "how many 2s multiply to make 8?" is 3, and log₂(8) = 3. Likewise log₂(1,024) = 10, because 2¹⁰ = 1,024. In Big O, the base of the logarithm does not matter (changing base only multiplies by a constant, which Big O ignores), so it is simply written log n.

### Pattern 6 — A halving loop inside a linear loop: O(n log n)

```ts
for (const item of items) {          // n times
  let k = items.length;
  while (k > 1) {                    //   log n times
    k = Math.floor(k / 2);
  }
}
```

n × log n = **O(n log n)**. You will rarely write this shape by hand, but it is the complexity of the best general-purpose sorting algorithms — including the one inside JavaScript's `sort` — because they split the data in half repeatedly (log n levels) and do linear work at each level ({{ch:recursion-sorting-searching}}).

### Pattern 7 — Branching recursion: often exponential

```ts
function countWays(stepsLeft: number): number {
  if (stepsLeft <= 1) return 1;
  return countWays(stepsLeft - 1) + countWays(stepsLeft - 2);
}
```

This function counts the ways to climb a staircase taking one or two steps at a time. Each call makes **two** more calls, which each make two more… The number of calls roughly doubles with each extra step: **O(2ⁿ)** (more precisely, a little less than 2ⁿ, but exponential). `countWays(40)` makes hundreds of millions of calls; `countWays(100)` would never finish. This is a classic case that **memoisation** ({{ch:scope-and-closures}}) fixes, turning it into O(n) — the heart of dynamic programming ({{ch:dynamic-programming-greedy}}).

### The hidden-cost trap

The most important practical lesson in this chapter: **a single line of code can hide a whole loop.** Built-in methods are not free — many of them loop over their input internally.

```ts
function findCommonCustomers(listA: string[], listB: string[]): string[] {
  return listA.filter((customer) => listB.includes(customer));
}
```

This looks like one loop. But `listB.includes(customer)` is itself a loop over `listB` — it checks elements one by one. So for each of the a customers in `listA`, it scans up to b customers: **O(a × b)**. With 100,000 customers in each list, that is ten billion comparisons.

The fix uses the same idea as the pair-sum problem in {{ch:problem-solving}} — put one list into a `Set`, whose lookups take constant time on average:

```ts
function findCommonCustomers(listA: string[], listB: string[]): string[] {
  const inB = new Set(listB);                          // O(b) to build
  return listA.filter((customer) => inB.has(customer)); // O(a) lookups, each O(1)
}
```

Now it is **O(a + b)**: about 200,000 steps instead of ten billion.

This exact bug — `includes`, `indexOf` or `find` inside a loop or a `filter` — is one of the most common performance problems in real JavaScript code, precisely because it does not **look** like a nested loop.

## The cost of everyday JavaScript operations

To analyse JavaScript code, you need to know what common operations cost. These are the typical costs in modern engines:

| Operation | Typical cost | Why |
|---|---|---|
| `arr[i]`, `arr.length`, `arr.at(-1)` | O(1) | direct position |
| `arr.push(x)`, `arr.pop()` | O(1) (amortised) | at the end, nothing moves |
| `arr.shift()`, `arr.unshift(x)` | O(n) | every element moves |
| `arr.splice(i, ...)` | O(n) | elements after `i` move |
| `arr.includes(x)`, `indexOf`, `find`, `some`, `every` | O(n) | check one by one |
| `arr.map`, `filter`, `forEach`, `reduce` | O(n) × cost of the callback | one pass |
| `arr.slice()`, `[...arr]`, `concat` | O(n) | copies elements |
| `arr.sort(...)`, `toSorted` | O(n log n) | efficient sorting |
| `arr.reverse()`, `join` | O(n) | touches every element |
| `map.get/set/has/delete`, `set.has/add/delete` | O(1) average | hashing ({{ch:arrays-strings-hash-maps}}) |
| `obj[key]` (lookup by key) | O(1) average | hashing |
| `Object.keys(obj)`, `Object.entries(obj)` | O(number of keys) | builds an array |
| `str.length`, `str[i]` | O(1) | direct |
| `str.includes(sub)`, `indexOf`, `slice`, `split`, `replaceAll` | O(length of string) | scans or copies characters |
| `JSON.stringify` / `JSON.parse` | O(size of data) | visits everything |

Two notes:

- "**Average**" for maps and sets: lookups are O(1) in the normal case. In rare, unlucky situations they can be slower; {{ch:arrays-strings-hash-maps}} explains why and why it almost never matters in practice.
- "**Amortised**" for `push` is explained next.

## Best, worst and average cases — and amortised cost

The same algorithm can take different amounts of time for different inputs of the same size.

```ts
function indexOfPrice(prices: number[], target: number): number {
  for (let i = 0; i < prices.length; i++) {
    if (prices[i] === target) return i;
  }
  return -1;
}
```

- **Best case:** the target is the first element — 1 step, O(1).
- **Worst case:** the target is last or missing — n steps, O(n).
- **Average case:** if the target is equally likely to be anywhere, about n/2 steps — still O(n).

When people state a complexity without qualification, they almost always mean the **worst case**, because it is the guarantee: "this will never be slower than…". Worst cases also matter for **security** — attackers deliberately send worst-case inputs, as with the catastrophic regular expressions in {{ch:the-event-loop}}.

### Amortised cost

Some operations are usually cheap but occasionally expensive. `push` is the classic example.

A JavaScript array keeps its elements in a block of memory with some spare room. Most `push`es simply use the next spare slot — O(1). But when the spare room runs out, the engine must allocate a **bigger** block (typically about double the size) and copy every element across — O(n) for that one push.

```text
  capacity 4:  [a][b][c][d]              push e -> full! allocate 8, copy 4
  capacity 8:  [a][b][c][d][e][ ][ ][ ]  next 3 pushes are cheap
  capacity 8:  [a][b][c][d][e][f][g][h]  push i -> full! allocate 16, copy 8
```

Because the block **doubles**, expensive copies happen rarely — after 4, then 8, then 16, then 32 elements — and the total copying work over n pushes adds up to less than 2n. Spread over all the pushes, each one costs O(1) **on average across the sequence**. This is called **amortised** O(1): an individual push may be slow, but any long sequence of pushes is fast.

(The word comes from finance, where a large cost is "amortised" — spread out — over many payments.)

## Space complexity

### Level 4 — How much extra memory?

Time is not the only cost. **Space complexity** measures how much **extra** memory an algorithm needs as n grows — not counting the input itself.

```ts
function totalPaisa(prices: number[]): number {
  let total = 0;
  for (const p of prices) total += p;
  return total;
}
```

One extra variable, however long the array: **O(1) space**.

```ts
function withVat(prices: number[]): number[] {
  return prices.map((p) => Math.round(p * 1.18));
}
```

A new array of n elements: **O(n) space**.

```ts
function findPair(prices: number[], target: number): [number, number] | null {
  const seen = new Map<number, number>();
  // ... (from the problem-solving chapter)
  return null;
}
```

The map may hold every price: **O(n) space** — the "memory for time" trade you made in {{ch:problem-solving}}: O(n) time and O(n) space, versus the brute force's O(n²) time and O(1) space.

### Recursion uses space too

Every function call adds a frame to the **call stack** ({{ch:functions}}), and frames take memory until the call returns. So a recursive function that goes n calls deep uses **O(n) space**, even if it creates no arrays at all:

```ts
function sumRecursive(prices: number[], index = 0): number {
  if (index >= prices.length) return 0;
  return prices[index]! + sumRecursive(prices, index + 1);
}
```

This adds the prices by calling itself once per element. Before any call returns, all n calls are waiting on the stack: **O(n) space**. For a very large array, it would overflow the stack (`RangeError: Maximum call stack size exceeded` — {{ch:functions}}), while the simple loop version would not. Interviewers often check whether you remember to count the stack.

## Using input size to choose a solution

### Level 5 — "Good enough" depends on n

Big O becomes truly practical when combined with the **size of the input** in your real situation. Using the rough rule of 10⁸ simple operations per second, and a time budget of about one second, here is the largest n each class can handle comfortably:

| If n is up to about… | Then a solution of this class is usually fine |
|---|---|
| 10 – 12 | O(n!) — trying every ordering |
| 20 – 25 | O(2ⁿ) — trying every subset |
| 500 | O(n³) |
| 5,000 – 10,000 | O(n²) |
| 1,000,000 | O(n log n) |
| 100,000,000 | O(n) |
| anything | O(log n), O(1) |

This works in both directions:

- **In interviews and coding tests**, the problem usually states limits such as "the array has at most 100,000 elements". That is a **hint**: 100,000 rules out O(n²) (10¹⁰ steps), so the expected solution is O(n log n) or O(n). Reading the constraints first tells you how clever you need to be.
- **At work**, ask how big the data is **and will become**. A list of a company's 12 offices can be searched any way you like. A list of its customers cannot.

And remember the "good enough" principle from {{ch:problem-solving}}: if n is guaranteed small, the simplest, clearest solution is the right one — even if it is O(n²).

## Beyond Big O: real performance

### Level 6 — What Big O does not tell you

Big O is essential, but experienced engineers know its limits:

**1. Constants matter at real sizes.** Big O ignores constant factors, but your users do not. An O(n) algorithm that does 50 expensive operations per item can be slower than an O(n log n) algorithm doing 1 cheap operation per item, for every input size you will ever see. Within the same class, the constant factor decides which is faster.

**2. Small inputs favour simple code.** For tiny inputs, simple algorithms with "worse" complexity often win, because the clever ones have more set-up. JavaScript engines themselves use simple sorting methods for very small arrays for this reason.

**3. Memory access patterns matter.** In {{ch:what-a-computer-is}} you saw that reading from the CPU cache is far faster than reading from RAM. Code that walks through memory in order (an array) can be much faster in practice than code that jumps around (following references between scattered objects), even with the same Big O.

**4. The network and the disk usually dominate.** In a web application, one database query or HTTP call ({{ch:how-the-internet-works}}) can take longer than millions of in-memory operations. A beautifully O(n) loop that makes **one database query per item** — the "N+1 queries" problem you will meet in {{ch:orms}} — is far slower than an O(n²) loop over a few hundred items in memory. When counting costs in real systems, count **round trips** first.

**5. Measure.** When performance matters, measure with real data and a profiler ({{ch:the-event-loop}}, {{ch:performance-engineering}}). A simple experiment can confirm a complexity: time the code at n, 2n and 4n. If the time roughly doubles each time, it is linear; if it roughly quadruples, it is quadratic.

> [!SENIOR]
> Experienced engineers use Big O as a **filter**, not a final answer. It quickly rules out designs that cannot work at the expected scale ("this is quadratic over all orders — no"). Among the designs that pass the filter, they choose by clarity, constant factors, memory use and, above all, by measuring. And they always ask where the expensive operations really are — very often they are network calls and database queries, not loops.

## From beginner to enterprise: complexity at every level

**Level 3 — Small programs.** You state the time and space complexity of your functions, and notice nested loops.

**Level 4 — A real application.** You catch `includes` inside `filter`, replace repeated lookups with `Map`s and `Set`s, avoid `shift` in loops, and know that sorting is O(n log n). You ask the database to filter and sort rather than loading everything into memory.

**Level 5 — Professional engineering.** You estimate costs during design — "this endpoint loads every order for a customer; our biggest customers have 200,000" — and design for the realistic maximum. You use complexity in code review: "this is quadratic over the product catalogue; can we use a lookup?" You verify with load tests and profiling.

**Level 6 — Enterprise.** Complexity analysis extends to whole systems: how does cost grow with users, regions, services and data volume? Will doubling traffic double the database load, or quadruple it? Design decisions — indexing ({{ch:indexes}}), caching ({{ch:caching}}), sharding ({{ch:sharding}}) — are fundamentally about keeping the growth of cost under control as the business grows.

## Real-world use cases

### Beginner level — A slow duplicate check

**Situation:** a learner's program checks a list of 50,000 email addresses for duplicates with two nested loops, and it takes minutes.

**Analysis:** O(n²) — about 1.25 billion comparisons.

**Fix:** a `Set` — O(n). It finishes in milliseconds.

### Intermediate level — The report that grew

**Business problem:** a monthly sales report took 3 seconds when the company launched. A year later it times out.

**Analysis:** for each order, the code searches the full product list with `find` to get the product's category: O(orders × products). Both numbers grew tenfold, so the work grew a hundredfold.

**Fix:** build a `Map` from product ID to product once, then look up each order's product in O(1): O(orders + products).

### Advanced level — Searching a sorted price list

**Business problem:** a pricing service must answer "which price band does this amount fall into?" millions of times per day, against a sorted list of 50,000 bands.

**Analysis:** a linear scan is O(n) per query — about 50,000 steps each time.

**Fix:** because the bands are sorted, **binary search** answers each query in about 16 steps — O(log n) ({{ch:recursion-sorting-searching}}).

**Trade-off:** the list must stay sorted; adding bands requires inserting in order. For a list that changes rarely and is read constantly, that is an excellent trade.

### Enterprise level — Quadratic behaviour hidden in a system

**Business problem (illustrative):** a messaging platform's "notify all group members" feature sends, for each new message, a notification to every member — and each notification job also loads the full member list to check settings. In large groups, load explodes.

**Analysis:** for a group of m members, each message triggers m jobs that each read m members: O(m²) per message. A 10,000-member group means 100 million reads for one message.

**Fix:** load the member list and settings once per message, then fan out notifications: O(m). Very large groups also get batching and rate limits.

**Lesson:** quadratic growth does not only hide inside single functions; it can hide in how **systems** call each other.

## Common mistakes

### Beginner mistake — Counting lines instead of work

**What it looks like:** believing a one-line `filter(x => list.includes(x))` is O(n).

**What happens:** quadratic code ships unnoticed.

**How to fix it:** know the cost of built-in operations; any method that searches or copies is O(n).

### Beginner mistake — Keeping constants and small terms

**What it looks like:** "O(2n + 5)" or "O(n²/2)".

**How to fix it:** drop constants and lower terms: O(n), O(n²).

### Intermediate mistake — Multiplying sequential loops

**What it looks like:** calling two loops one after another "O(n²)".

**How to fix it:** sequence adds (O(n) + O(n) = O(n)); nesting multiplies.

### Intermediate mistake — Forgetting space, especially the stack

**What it looks like:** claiming a recursive solution uses "no extra memory".

**How to fix it:** count the depth of recursion as space.

### Production mistake — Testing only with small data

**What it looks like:** performance tests with 100 records, production with 10 million.

**What happens:** a quadratic algorithm that seemed instant becomes an outage.

**How to prevent it:** analyse complexity, and test with realistic — and future — data sizes.

### Enterprise mistake — Optimising loops while ignoring round trips

**What it looks like:** micro-optimising in-memory code in a request that makes 200 database queries.

**How to prevent it:** measure where time actually goes; reduce round trips first.

## Debugging and troubleshooting

| Symptom | Likely cause |
|---|---|
| Fine in testing, very slow with real data | Quadratic (or worse) behaviour; look for nested loops and hidden loops (`includes`, `find`, `indexOf` inside loops) |
| Time roughly quadruples when data doubles | O(n²) |
| Time roughly doubles when data doubles | O(n) |
| Time barely changes as data grows | O(1) or O(log n) |
| `Maximum call stack size exceeded` on large input | Deep recursion: O(n) stack space — use a loop or reduce depth |
| Memory grows with input much more than expected | Copies inside loops (`slice`, spread, `concat` in a loop is O(n²) total) |
| Slow despite "efficient" code | The cost is in network or database calls, not computation |

> [!TIP]
> A quick experiment confirms a suspicion. Time the function at three sizes:
>
> ```ts
> for (const n of [10_000, 20_000, 40_000]) {
>   const data = Array.from({ length: n }, (_, i) => i);
>   console.time(`n = ${n}`);
>   suspectFunction(data);
>   console.timeEnd(`n = ${n}`);
> }
> ```
>
> Compare how the time changes as n doubles: about 2× means linear, about 4× means quadratic.

## How a senior engineer thinks about complexity

> [!SENIOR]
> - **What is n, really — today and in two years?** Complexity only matters relative to realistic input sizes.
> - **Where are the hidden loops?** Every `includes`, `find`, `indexOf`, `splice`, `shift` and copy inside a loop is suspicious.
> - **Can a better data structure remove a loop?** Lookups in maps and sets, sorted data with binary search, precomputed groupings.
> - **What does it cost in memory?** Faster solutions often use more memory; is that affordable at scale?
> - **Is computation even the bottleneck?** Round trips to databases and services usually dominate; count those first.
> - **Prove it.** Estimate with Big O, then confirm with measurements.

## Exercises

### Exercise 1 — Name the complexity

**Objective:** practise analysing code.

**What to do:** give the time and space complexity of each function (n is the length of the array; for B, s is the length of `text`).

```ts
// A
function lastThree(items: number[]) {
  return items.slice(-3);
}

// B
function countVowels(text: string) {
  let count = 0;
  for (const ch of text) if ("aeiou".includes(ch)) count++;
  return count;
}

// C
function allPairsSum(items: number[]) {
  const sums: number[] = [];
  for (const a of items) for (const b of items) sums.push(a + b);
  return sums;
}

// D
function uniqueSorted(items: number[]) {
  return [...new Set(items)].sort((a, b) => a - b);
}

// E
function shiftAll(items: number[]) {
  const copy = [...items];
  let total = 0;
  while (copy.length > 0) total += copy.shift()!;
  return total;
}
```

<details>
<summary>Show the solution</summary>

**A — O(1) time, O(1) space.** `slice(-3)` copies at most 3 elements, regardless of n. (In general, `slice` costs the number of elements copied, not the array length.)

**B — O(s) time, O(1) space.** One pass over the text. `"aeiou".includes(ch)` scans a fixed 5-character string — constant work — so it does not multiply the cost by anything that grows.

**C — O(n²) time, O(n²) space.** Nested loops over the same array, and the result array holds n × n sums.

**D — O(n log n) time, O(n) space.** Building the set is O(n), spreading is O(n), sorting the unique values is O(n log n). The sort dominates. The set and the new array use O(n) memory.

**E — O(n²) time, O(n) space.** The copy is O(n). But each `shift` moves all remaining elements: n + (n − 1) + … + 1 ≈ n²/2 steps. The loop *looks* linear but is quadratic — the hidden-cost trap. (A plain `for...of` over `items` would be O(n) time and O(1) space.)

**Common wrong approach:** calling B quadratic because of the `includes` inside the loop. `includes` is O(length of the string it searches) — and that string is always 5 characters. Ask what each hidden loop's size depends on.

</details>

### Exercise 2 — Remove the hidden loop

**Objective:** practise turning O(n × m) into O(n + m).

**The scenario:** this function returns the orders placed by blocked customers.

```ts
type Order = { id: string; customerId: string };

function ordersFromBlockedCustomers(orders: Order[], blockedCustomerIds: string[]): Order[] {
  return orders.filter((order) => blockedCustomerIds.includes(order.customerId));
}
```

**What to do:** state its complexity, rewrite it to be linear, and prove the difference with a timing experiment using 50,000 orders and 50,000 blocked IDs.

<details>
<summary>Show the solution</summary>

**Original complexity:** for each of the o orders, `includes` scans up to b blocked IDs: **O(o × b)** time.

**Rewritten:**

```ts
function ordersFromBlockedCustomersFast(orders: Order[], blockedCustomerIds: string[]): Order[] {
  const blocked = new Set(blockedCustomerIds);
  return orders.filter((order) => blocked.has(order.customerId));
}
```

**O(o + b)** time (build the set, then one O(1) lookup per order), **O(b)** extra space for the set.

**Experiment:**

```ts
const orders: Order[] = Array.from({ length: 50_000 }, (_, i) => ({ id: `o${i}`, customerId: `c${i}` }));
const blockedIds = Array.from({ length: 50_000 }, (_, i) => `c${i * 2}`);

console.time("includes");
const slow = ordersFromBlockedCustomers(orders, blockedIds);
console.timeEnd("includes");

console.time("Set");
const fast = ordersFromBlockedCustomersFast(orders, blockedIds);
console.timeEnd("Set");

console.log(slow.length, fast.length);
```

**Output (timings vary by computer):**

```text
includes: 2.871s
Set: 6.112ms
25000 25000
```

Both return the same 25,000 orders. The `Set` version is hundreds of times faster here — and the gap widens as the lists grow.

**Common wrong approach:** converting the IDs to a `Set` **inside** the `filter` callback. Then the set is rebuilt for every order, and the function is O(o × b) again — slower than the original.

</details>

### Exercise 3 — Read the constraints

**Objective:** practise choosing a complexity from input sizes.

**What to do:** for each situation, say which time complexities would be acceptable, assuming roughly 10⁸ simple operations per second and a one-second budget.

1. Find the best order to visit 8 delivery stops (trying every order is allowed if fast enough).
2. Remove duplicates from 2,000,000 tracking numbers.
3. Compare every pair of 3,000 products to find near-duplicate titles.
4. Look up a customer by ID, 10,000 times per second, among 50 million customers.

<details>
<summary>Show the solution</summary>

1. **n = 8.** 8! = 40,320 orderings — tiny. Even O(n!) is fine. (For 15 stops, 15! is about 1.3 trillion — not fine; route optimisation at real scale uses smarter methods.)
2. **n = 2,000,000.** O(n²) would be 4 × 10¹² steps — hours. O(n log n) (sort, then remove neighbours) or O(n) (a `Set`) is required.
3. **n = 3,000.** O(n²) is about 4.5 million pair comparisons — acceptable, if each comparison is cheap. If each comparison is expensive (comparing whole titles character by character), the constant factor matters: it may still be fine, but measure.
4. **Each lookup must be O(1) or O(log n).** 10,000 lookups per second over 50 million records cannot afford O(n) each (that would be 5 × 10¹¹ steps per second). A hash-based lookup or a database **index** ({{ch:indexes}}) is required.

**Lesson:** the input size, plus how often the operation runs, decides what is good enough. There is no single "best" complexity.

</details>

### Exercise 4 — The slow cleanup (debugging)

**Objective:** find a hidden quadratic cost.

**The scenario:** a job removes cancelled orders from a large in-memory list. It works, but takes minutes for 200,000 orders.

```ts
type Order = { id: string; status: string };

function removeCancelled(orders: Order[]): Order[] {
  const result = [...orders];
  for (let i = result.length - 1; i >= 0; i--) {
    if (result[i]!.status === "cancelled") {
      result.splice(i, 1);
    }
  }
  return result;
}
```

**What to do:** explain why it is slow, state its complexity, and fix it.

<details>
<summary>Show the solution</summary>

**Why it is slow:** the loop itself is O(n), but each `splice(i, 1)` removes an element from the **middle** of the array, shifting every element after it down by one — O(n) per removal. With many cancellations, that is O(n) work per removal, up to O(n²) overall. (Looping backwards does avoid the *skipping* bug from {{ch:arrays}} — the author was careful about correctness — but not the cost.)

**Complexity:** O(n × k), where k is the number of cancelled orders — O(n²) in the worst case.

**Fix:**

```ts
function removeCancelled(orders: Order[]): Order[] {
  return orders.filter((order) => order.status !== "cancelled");
}
```

**O(n)** time: one pass, building the new array with `push`-like appends at the end (amortised O(1) each), and no shifting. O(n) space for the result — the same as the original's copy.

**Lesson:** correctness was fine; performance was not, because of one innocent-looking method. And the simplest, most readable version — `filter` — was also the fastest.

</details>

## Summary

Engineers describe cost by how it **grows** with the input size **n**, not by seconds, because seconds depend on machines and on the test size. **Big O notation** describes that growth: count steps roughly, **drop constant factors**, and **keep only the fastest-growing term**. Strictly it is an upper bound; Θ and Ω describe tight and lower bounds.

The common classes, from best to worst, are **O(1)**, **O(log n)**, **O(n)**, **O(n log n)**, **O(n²)**, **O(2ⁿ)** and **O(n!)**. At a million items, O(n) takes milliseconds while O(n²) takes hours. Analyse code by patterns: fixed work is O(1); one loop is O(n); sequences **add**; nested loops **multiply**; halving gives O(log n); branching recursion is often exponential. Beware **hidden loops** in built-in methods — `includes`, `find`, `indexOf`, `splice`, `shift`, copies — and replace repeated searches with `Map`s and `Set`s.

Worst cases are the usual guarantee; **amortised** cost spreads rare expensive steps (like array growth in `push`) across many cheap ones. **Space complexity** counts extra memory, including the call stack in recursion. Use realistic input sizes to decide what is good enough. Big O is a filter, not the whole story: constants, memory access, and above all network and database round trips matter in real systems — so estimate, then measure.

## Key terms

- **Time complexity** — How the number of steps an algorithm takes grows as its input grows.
- **Space complexity** — How the extra memory an algorithm needs grows as its input grows.
- **n** — The conventional name for the size of an algorithm's input.
- **Big O notation** — A way of describing an upper bound on how an algorithm's cost grows, ignoring constant factors.
- **Complexity class** — A group of algorithms whose costs grow in the same shape, such as linear or quadratic.
- **Constant time, O(1)** — Cost that does not grow with the input size.
- **Logarithmic time, O(log n)** — Cost that grows by one step each time the input doubles, typical of halving algorithms.
- **Linear time, O(n)** — Cost that grows in direct proportion to the input size.
- **Linearithmic time, O(n log n)** — Cost of n times log n, typical of efficient sorting.
- **Quadratic time, O(n²)** — Cost that grows with the square of the input size, typical of nested loops over the same data.
- **Exponential time, O(2ⁿ)** — Cost that doubles with each additional input item.
- **Factorial time, O(n!)** — Cost that grows with the number of possible orderings of the input.
- **Logarithm** — The number of times a number must be divided by a base (here, 2) to reach 1; the reverse of repeated multiplication.
- **Dominant term** — The part of a cost formula that grows fastest and determines its Big O.
- **Theta (Θ)** — Notation for a tight bound: growth exactly like a given shape.
- **Omega (Ω)** — Notation for a lower bound: growth at least like a given shape.
- **Best / worst / average case** — The cost of an algorithm on its most favourable, least favourable, and typical inputs of a given size.
- **Amortised cost** — The average cost per operation over a long sequence, when occasional operations are expensive but most are cheap.
- **Hidden loop** — A loop performed inside a built-in method or function call, easy to overlook when analysing code.
- **Constant factor** — The fixed multiplier on an algorithm's cost that Big O ignores but real performance depends on.
- **N+1 queries problem** — Making one database query to fetch a list, then one more query for each item in it.

## What comes next

You now have a precise language for cost, and you have seen again and again that the right **organisation of data** — a `Set` instead of an array, a `Map` keyed by ID, a sorted list — can turn a quadratic solution into a linear one.

The next chapter, **Arrays, Strings and Hash Maps**, looks inside the most important of these organisations. You will learn how arrays and strings are really stored, how hash maps achieve their near-instant lookups, what can go wrong with them, and the classic techniques — counting, grouping, two pointers and sliding windows — that solve a large share of real problems and coding interview questions.
