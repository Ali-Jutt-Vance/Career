# How Engineers Solve Problems

> [!GOALS]
> - Why knowing a programming language is not the same as being able to solve problems with it.
> - A five-step method that works on problems you have never seen before: understand, explore examples, plan, build, check.
> - How to understand a problem precisely, including its inputs, outputs, rules and edge cases.
> - How to use small examples and drawings to discover a solution.
> - Why you should start with a simple ("brute force") solution, and how to improve it step by step.
> - How to break a large problem into smaller ones, and how to write a plan in plain language (pseudocode) before code.
> - How to test your own solution like an engineer, not just "run it once".
> - What to do when you are stuck, and how to think out loud — the way coding interviews expect.

## Why this matters

By now you know a lot of JavaScript: variables, decisions, loops, functions, arrays, objects, asynchronous code. Yet many people who know all of this still freeze when faced with a new problem. They read it, understand the words, and then stare at an empty file with no idea how to begin.

This is completely normal, and it has a clear cause: **knowing the tools is a different skill from knowing how to use them on an unfamiliar problem.** A person can know every word in a dictionary and still struggle to write a good essay.

In {{ch:learning-and-ai}} you met a story: someone in an interview is asked, "Write a function that returns the second-largest number in an array", and their mind goes blank. It is not that they did not know arrays or loops. They had no **method** for turning a problem statement into a solution.

This chapter teaches that method. It is used — consciously or not — by every good engineer, on everything from interview questions to designing payment systems. And it is precisely what coding interviews test: not whether you have memorised answers, but whether you can reason your way to one, out loud, under pressure.

## The simple idea

Solving a programming problem is like planning a journey to somewhere you have never been.

1. First, you make sure you know **exactly where you are going** — not "somewhere in Karachi", but the actual address.
2. You look at a **map** and try a few routes in your head.
3. You choose a route and **write down the turns**.
4. You **drive**.
5. You **check** that you have arrived at the right place — and if not, you work out where you went wrong.

Beginners often skip straight to step 4 — they start writing code immediately — and end up lost. Experienced engineers spend more time on steps 1 to 3, and as a result spend much **less** time in total.

> [!ANALOGY]
> Problem solving is like journey planning: destination, map, route, drive, check.
>
> **Where the analogy breaks:** on a real journey, you usually know a route exists. In programming, the first route you think of may be far too slow when the "distance" grows — a solution that works for 10 items may take hours for 10 million. So programmers also ask, "How will this route behave if the journey becomes a thousand times longer?" That question is the subject of the next chapter, {{ch:big-o}}.

## The proper definition and key words

- A **problem** (in programming) is a description of what a program must do: given certain **inputs**, produce certain **outputs**, obeying certain **rules** (often called **constraints**).
- An **algorithm** is a precise, step-by-step procedure that solves a problem — the "route". A program is an algorithm written in a programming language.
- An **edge case** is an unusual or extreme input that tests the boundaries of a solution: an empty list, a single item, very large numbers, duplicates, negative values.
- **Brute force** means solving a problem in the most direct way, often by trying every possibility, without cleverness.
- **Optimisation** means improving a working solution so that it uses less time or memory.
- **Pseudocode** is a plan for an algorithm written in plain language mixed with programming ideas, but not in any real programming language.
- **Decomposition** means breaking a large problem into smaller problems that can be solved separately.

## The five-step method

```text
  1. UNDERSTAND      What exactly are the inputs, outputs and rules?
         |
  2. EXPLORE         Work small examples by hand. Find edge cases.
         |
  3. PLAN            Start with a simple approach. Improve it. Write pseudocode.
         |
  4. BUILD           Turn the plan into code, piece by piece.
         |
  5. CHECK           Trace it, test it with your examples and edge cases,
                     and judge its speed. Improve if needed.
```

The steps are not strictly one-way. Exploring examples often reveals that you misunderstood the problem (back to step 1). Checking may reveal a flaw in the plan (back to step 3). But having the steps keeps you from flailing.

We will now go through each step using one problem, then apply the whole method to several more.

> **The problem:** Write a function that returns the second-largest number in an array of numbers.

## Step 1 — Understand the problem

**Restate it in your own words.** "I receive an array of numbers. I must return the number that would be in second place if I ranked them from largest to smallest."

**Identify the inputs and outputs precisely.**

- Input: an array of numbers.
- Output: one number.

**Ask questions about everything that is not specified.** This is the most important habit in this step. A problem statement almost never covers every situation, and the gaps are exactly where bugs and misunderstandings live. For our problem:

| Question | Why it matters |
|---|---|
| What if the array is empty? | There is no second-largest number. Return `undefined`? Throw an error? |
| What if it has only one number? | Same question. |
| What about duplicates? In `[5, 5, 3]`, is the second largest `5` or `3`? | This completely changes the solution. |
| Can numbers be negative? Decimals? | A solution that starts its "largest so far" at 0 would fail for all-negative arrays. |
| How large can the array be? Ten items? Ten million? | Decides whether a slow but simple approach is acceptable. |
| May I change (mutate) the input array? | Sorting in place would change the caller's data ({{ch:arrays}}). |

In an interview, you ask the interviewer these questions. In a job, you ask the person who owns the requirement — a product manager, a colleague, the customer. If nobody can answer, you make a **reasonable decision** and state it clearly.

For our problem, suppose the answers are: duplicates count as the same value, so for `[5, 5, 3]` the answer is `3`; return `undefined` if there is no second distinct value; numbers can be negative or decimal; the array may be large; do not change the input.

> [!SENIOR]
> Experienced engineers are recognisable in interviews within the first two minutes: they **ask questions before writing code**. Asking "what should happen with duplicates?" is not a sign of weakness; it is evidence that you think about real-world inputs. Many interview problems are deliberately underspecified to see whether you notice.

## Step 2 — Explore with examples

Before thinking about code, **work examples by hand**, the way you would if a person asked you.

| Input | Expected output | Reasoning |
|---|---|---|
| `[4, 9, 2, 7]` | `7` | Largest is 9; next is 7 |
| `[3, 1]` | `1` | Two numbers |
| `[5, 5, 3]` | `3` | Duplicates count once |
| `[8, 8, 8]` | `undefined` | Only one distinct value |
| `[42]` | `undefined` | Only one value |
| `[]` | `undefined` | No values |
| `[-3, -1, -7]` | `-3` | All negative |
| `[2.5, 2.4, 2.5]` | `2.4` | Decimals and duplicates |

Two things happen as you build this table:

1. **You clarify the rules.** Writing `[8, 8, 8]` forces you to apply the duplicates rule to an extreme case.
2. **You collect your test cases.** This table *is* the list of tests you will run in step 5. The unusual rows — empty, one item, all equal, all negative — are the **edge cases**.

Now, **watch yourself** solve one example by hand, slowly, and notice what you actually do. For `[4, 9, 2, 7]`, you probably scanned the numbers, noticed 9 was biggest, then looked for the biggest among the rest. That observation is the seed of an algorithm.

> [!TIP]
> Draw. For problems involving arrays, write the array on paper with its indexes underneath, and point at elements with your fingers as you simulate. For problems involving relationships — who follows whom, which city connects to which — draw boxes and arrows. Most experienced engineers solve hard problems on paper or a whiteboard before touching a keyboard.

## Step 3 — Plan: simple first, then better

### Start with the simplest correct idea

The simplest idea for "second largest" is: **sort the numbers from largest to smallest, remove duplicates, and take the second one.**

Is it correct? Check it against the table. `[4, 9, 2, 7]` sorted is `[9, 7, 4, 2]`; second is 7. ✔ `[5, 5, 3]` without duplicates is `[5, 3]`; second is 3. ✔ `[8, 8, 8]` without duplicates is `[8]`; no second; `undefined`. ✔ It works for every row.

This is a **brute-force** solution — direct, not clever. Starting here is not lazy; it is professional:

- A simple correct solution is far better than a clever wrong one.
- It gives you something working to compare improved versions against.
- In an interview, stating a simple solution first shows you can reach *an* answer, and gives you something to improve together with the interviewer.
- Often, the simple solution is **good enough** — and then you are done.

### Ask whether it is good enough

How much work does sorting do? You will learn to measure this precisely in {{ch:big-o}}. For now, the intuition: sorting a list involves comparing many pairs of elements — for a large array, far more work than a single pass through it. If the array can be very large and the function is called often, it is worth asking whether a single pass could do the job.

### Look for a better idea

Go back to how you solved it by hand. You did not sort anything. You kept track of the **biggest number so far**, and — if you were careful — the **second biggest so far**. That is the "finding the largest" loop pattern from {{ch:loops}}, extended to track two values.

Walk through `[4, 9, 2, 7]` keeping two variables, `first` and `second`, both starting below every possible number (`-Infinity`, from {{ch:types-of-data}}):

```text
  number   compared with first/second           first   second
  ------   -------------------------------      -----   ------
  start                                          -Inf    -Inf
  4        4 > first  -> old first becomes second   4    -Inf
  9        9 > first  -> old first becomes second   9       4
  2        2 < second -> ignore                     9       4
  7        between second and first -> new second   9       7
```

Result: `second` is 7. ✔

Now the duplicates rule: for `[5, 5, 3]`, when the second 5 arrives, it equals `first`, so it must **not** become `second`. And at the end, if `second` is still `-Infinity`, there was no second distinct value, so return `undefined`.

### Write the plan in pseudocode

Before writing JavaScript, write the plan in plain language. This separates **thinking about the algorithm** from **thinking about syntax**:

```text
function secondLargest(numbers):
    first  = minus infinity
    second = minus infinity

    for each number n in numbers:
        if n > first:
            second = first
            first  = n
        else if n < first and n > second:
            second = n
        (otherwise: n equals first, or is not bigger than second — ignore it)

    if second is still minus infinity:
        return nothing (undefined)
    return second
```

Check the pseudocode against the examples **before** coding. Does `[8, 8, 8]` work? The first 8 sets `first` to 8; the next two equal `first`, so they are ignored; `second` stays at minus infinity; return `undefined`. ✔ Does `[-3, -1, -7]` work? Yes — starting at minus infinity (not 0) is what makes all-negative arrays work.

Finding a mistake in pseudocode takes seconds. Finding it in code takes longer, because you are also dealing with syntax, and you may have convinced yourself the code is right.

## Step 4 — Build

Now translate the pseudocode, line by line:

```ts
function secondLargest(numbers: number[]): number | undefined {
  let first = -Infinity;
  let second = -Infinity;

  for (const n of numbers) {
    if (n > first) {
      second = first;
      first = n;
    } else if (n < first && n > second) {
      second = n;
    }
  }

  return second === -Infinity ? undefined : second;
}
```

Because the pseudocode was checked, the code is mostly translation. Notice:

- It is written in TypeScript ({{ch:typescript-basics}}), so the types document the contract: an array of numbers in, a number or `undefined` out.
- It does **not** change the input — no sorting, no mutation.
- It visits each number exactly once.

> [!NOTE]
> One honest limitation: if the array legitimately contains `-Infinity` as its second-largest value, this function returns `undefined`. For real-world data that will almost never matter, but a fully robust version would track whether `second` has been set using a separate boolean or `undefined` as the starting value. Spotting limits like this is part of step 5.

## Step 5 — Check

**Trace it by hand** with one or two examples, exactly as you traced loops in {{ch:loops}}.

**Run it against every example from step 2.** Write the checks as code, so you can re-run them every time you change something:

```ts
const cases: [number[], number | undefined][] = [
  [[4, 9, 2, 7], 7],
  [[3, 1], 1],
  [[5, 5, 3], 3],
  [[8, 8, 8], undefined],
  [[42], undefined],
  [[], undefined],
  [[-3, -1, -7], -3],
  [[2.5, 2.4, 2.5], 2.4],
];

for (const [input, expected] of cases) {
  const actual = secondLargest(input);
  const status = actual === expected ? "PASS" : "FAIL";
  console.log(`${status}  secondLargest([${input}]) = ${actual}, expected ${expected}`);
}
```

**Output:**

```text
PASS  secondLargest([4,9,2,7]) = 7, expected 7
PASS  secondLargest([3,1]) = 1, expected 1
PASS  secondLargest([5,5,3]) = 3, expected 3
PASS  secondLargest([8,8,8]) = undefined, expected undefined
PASS  secondLargest([42]) = undefined, expected undefined
PASS  secondLargest([]) = undefined, expected undefined
PASS  secondLargest([-3,-1,-7]) = -3, expected -3
PASS  secondLargest([2.5,2.4,2.5]) = 2.4, expected 2.4
```

This small table of inputs and expected outputs, checked automatically, is the beginning of **automated testing**, which you will do properly with real test tools in {{ch:testing}}.

**Judge the cost.** One pass through the array, two variables of memory. That is about as efficient as this problem allows: you must look at every number at least once, because any one of them could be the answer.

**Consider improvements and limits.** Could the code be clearer? Is there an input it mishandles (like the `-Infinity` limitation above)? Is the function name clear?

That is the whole method, on one problem. Now let us apply it more quickly to others.

## Decomposition: breaking big problems into small ones

### Level 3 — Solving a bigger problem in pieces

Real problems are rarely one small function. When a problem feels too big, **break it into sub-problems** that you already know how to solve, and solve each one separately. This is **decomposition**, and it is the same idea as splitting code into functions ({{ch:functions}}) and modules ({{ch:modules-and-npm}}).

> **The problem:** Given a list of orders, each with a customer ID, a date and a total, produce a report of the top 3 customers by total spending in a given month, showing each customer's total and number of orders.

At first this feels like a lot. Decompose it:

```text
  top customers report
   ├── 1. keep only the orders in the given month
   ├── 2. group the remaining orders by customer
   ├── 3. for each customer, add up their totals and count their orders
   ├── 4. sort customers by total, highest first
   └── 5. take the first 3 and format them
```

Every one of these sub-problems is something you already know: `filter` ({{ch:arrays}}), grouping with an object or `Map` ({{ch:objects}}), the accumulator pattern ({{ch:loops}}), sorting with a compare function, `slice`. The "big" problem was really five small, familiar ones.

```ts
type Order = { customerId: string; date: string; totalPaisa: number };
type CustomerSummary = { customerId: string; totalPaisa: number; orderCount: number };

function topCustomers(orders: Order[], month: string, limit = 3): CustomerSummary[] {
  const inMonth = orders.filter((order) => order.date.startsWith(month));

  const byCustomer = new Map<string, CustomerSummary>();
  for (const order of inMonth) {
    const summary = byCustomer.get(order.customerId) ?? {
      customerId: order.customerId,
      totalPaisa: 0,
      orderCount: 0,
    };
    summary.totalPaisa += order.totalPaisa;
    summary.orderCount += 1;
    byCustomer.set(order.customerId, summary);
  }

  return [...byCustomer.values()]
    .sort((a, b) => b.totalPaisa - a.totalPaisa)
    .slice(0, limit);
}

const orders: Order[] = [
  { customerId: "sara", date: "2026-11-02", totalPaisa: 250000 },
  { customerId: "bilal", date: "2026-11-05", totalPaisa: 99900 },
  { customerId: "sara", date: "2026-11-09", totalPaisa: 129950 },
  { customerId: "ayesha", date: "2026-10-30", totalPaisa: 500000 },
  { customerId: "zain", date: "2026-11-12", totalPaisa: 310000 },
  { customerId: "bilal", date: "2026-11-20", totalPaisa: 45000 },
];

console.log(topCustomers(orders, "2026-11"));
```

**Output:**

```text
[
  { customerId: 'sara', totalPaisa: 379950, orderCount: 2 },
  { customerId: 'zain', totalPaisa: 310000, orderCount: 1 },
  { customerId: 'bilal', totalPaisa: 144900, orderCount: 2 }
]
```

Walkthrough, sub-problem by sub-problem:

1. `filter` keeps orders whose date starts with `"2026-11"`. Ayesha's October order is dropped. (Comparing the start of ISO date strings works because ISO dates are written year-month-day — {{ch:advanced-javascript}}.)
2. and 3. One loop groups by customer and accumulates both totals and counts in a `Map`. `?? { ... }` creates a fresh summary the first time a customer is seen.
4. The summaries are sorted by total, highest first.
5. `slice(0, limit)` takes the top three.

Each step can be checked separately, and if the requirements change — "top 5", "by order count instead of total" — you know exactly which step to change.

> [!TIP]
> When a problem looks overwhelming, write the list of sub-problems **as comments** first, then fill in the code under each comment. This keeps you moving, and the comments often become good function names when the code grows.

## A second worked example: from brute force to better

### Level 4 — The pair that adds up

> **The problem:** A shop runs a promotion: "Buy any two items whose prices add up to exactly a gift card's value." Given a list of prices and the gift card value, return the positions (indexes) of two different items whose prices add up to the value, or `null` if no such pair exists.

This is a version of one of the most famous interview problems, usually called **Two Sum**.

**Step 1 — Understand.** Input: an array of prices and a target. Output: two indexes, or `null`. Questions: Can the same item be used twice? (No — two *different* items.) If several pairs work, which one? (Any.) Can prices repeat? (Yes.) How big is the list? (Possibly large — a whole catalogue.)

**Step 2 — Explore.** Prices `[1500, 3000, 700, 2300]`, target `3000`: 700 + 2300 = 3000, so indexes `[2, 3]`. Target `6000`: no pair → `null` (3000 + 3000 would need the same item twice). Prices `[1500, 1500]`, target `3000`: indexes `[0, 1]` — two different items with the same price. Empty array → `null`.

**Step 3 — Plan, simple first.** The brute-force idea: try **every pair** of items and check whether they add up to the target.

```ts
function findPairBruteForce(prices: number[], target: number): [number, number] | null {
  for (let i = 0; i < prices.length; i++) {
    for (let j = i + 1; j < prices.length; j++) {
      if (prices[i]! + prices[j]! === target) {
        return [i, j];
      }
    }
  }
  return null;
}

console.log(findPairBruteForce([1500, 3000, 700, 2300], 3000));
console.log(findPairBruteForce([1500, 3000, 700, 2300], 6000));
```

**Output:**

```text
[ 2, 3 ]
null
```

Walkthrough:

- The outer loop picks the first item, `i`. The inner loop picks every item **after** it, `j` — starting at `i + 1` means each pair is checked once and an item is never paired with itself.
- If a pair adds up to the target, return its indexes immediately.
- The `!` after `prices[i]` is a non-null assertion ({{ch:typescript-basics}}): with `noUncheckedIndexedAccess`, TypeScript worries that the index might be out of range, but the loop bounds guarantee it is not. (This is one of the few places where an assertion is justified by a clear, local reason.)

It is correct. But it is a **nested loop**, and you learned in {{ch:loops}} what that means: for `n` items, roughly `n × n / 2` comparisons. For a catalogue of 100,000 prices, that is about five billion comparisons.

**Look for a better idea.** Ask a powerful question: *as I look at each price, what am I actually looking for?* If the current price is 700 and the target is 3000, I am looking for exactly one thing — a price of **2300** that I have already seen. So instead of comparing against every other price, I can **remember the prices I have seen** in a lookup structure — an object or `Map` used as a lookup table ({{ch:objects}}) — and ask, in one quick step, "have I seen 2300?"

```ts
function findPair(prices: number[], target: number): [number, number] | null {
  const seen = new Map<number, number>();   // price -> index where it was seen

  for (let i = 0; i < prices.length; i++) {
    const price = prices[i]!;
    const needed = target - price;
    const matchIndex = seen.get(needed);
    if (matchIndex !== undefined) {
      return [matchIndex, i];
    }
    seen.set(price, i);
  }
  return null;
}

console.log(findPair([1500, 3000, 700, 2300], 3000));
console.log(findPair([1500, 3000, 700, 2300], 6000));
console.log(findPair([1500, 1500], 3000));
```

**Output:**

```text
[ 2, 3 ]
null
[ 0, 1 ]
```

Walkthrough, tracing `[1500, 3000, 700, 2300]` with target 3000:

```text
  i  price  needed  seen before this step        found?
  0  1500   1500    {}                           no  -> remember 1500 at 0
  1  3000   0       {1500:0}                     no  -> remember 3000 at 1
  2  700    2300    {1500:0, 3000:1}             no  -> remember 700 at 2
  3  2300   700     {1500:0, 3000:1, 700:2}      YES -> return [2, 3]
```

- For each price, compute what it would need to be paired with: `target - price`.
- `seen.get(needed)` asks the map, in one step, whether that price appeared earlier, and at which index.
- If it did, the answer is that earlier index and the current one.
- Otherwise, remember the current price and its index for future items.
- The check happens **before** the current price is stored, so an item can never pair with itself — yet two different items with the same price (`[1500, 1500]`) still work.

Now each price is visited **once**, and each lookup is a single quick step. For 100,000 prices, that is about 100,000 steps instead of five billion. The cost is some extra **memory** for the `Map`.

This trade — **using memory to save time** — is one of the most common moves in all of programming. You will meet it again and again: caches ({{ch:what-a-computer-is}}), indexes in databases ({{ch:indexes}}), memoisation ({{ch:scope-and-closures}}).

**Step 5 — Check.** Run all the examples, including edge cases: an empty array (the loop does not run; `null`), a single price (`null`), duplicates (`[0, 1]`), negative prices if they were allowed (the arithmetic still works). Then state the cost: one pass, plus a map that may hold every price.

## Strategies for finding an approach

When you understand a problem but cannot see how to solve it, these questions — used by experienced engineers, often without noticing — usually unlock it.

**1. Have I seen a similar problem?** "Find a pair that adds up to something" is like "find a duplicate": both are about remembering what you have seen. Recognising **patterns** is a skill you will build deliberately in {{ch:coding-interview-patterns}}.

**2. What would I do by hand?** Solve a small example slowly on paper and watch your own method, as with the second-largest number.

**3. What is the simplest correct solution?** Start there; improve later.

**4. What am I repeating?** Brute-force solutions usually repeat work — checking the same pairs, recomputing the same totals. Remembering earlier results (in a variable, a map or an array) often removes the repetition.

**5. Would a different organisation of the data make this easy?** If the data were **sorted**, would the answer be obvious? If it were in a **lookup table**, could I find things in one step? If it were **grouped**, could I count it easily? Part III is largely about these organisations.

**6. Can I solve a smaller or simpler version first?** Without duplicates? For two items? For one customer? Then generalise.

**7. Can I work backwards?** Start from the desired output and ask what the previous step must have produced.

**8. Can I split it?** Decompose into sub-problems, as in the report example.

## Testing your own solution like an engineer

"I ran it once and it printed the right answer" is not testing. Professional testing is deliberate. For any solution, check these categories of input:

| Category | Examples |
|---|---|
| **Typical** | A normal, realistic input |
| **Empty** | `[]`, `""`, `{}`, zero items |
| **Single** | One item, one character |
| **Boundaries** | The smallest and largest allowed values; exactly on a threshold ({{ch:operators-and-decisions}}) |
| **Duplicates** | Repeated values, all values equal |
| **Order** | Already sorted, reverse sorted, random |
| **Negative and special numbers** | Negatives, zero, decimals, very large numbers |
| **Invalid** | The wrong type, missing fields — if the function is expected to handle them |
| **Large** | A big input, to see whether the speed is acceptable |

Writing these cases **before** writing the code — as you did in step 2 — is so effective that it has a name in professional practice, **test-driven development**, which you will learn in {{ch:testing}}.

## When you are stuck

Even with a method, you will get stuck. That is normal; the unsticking method from {{ch:learning-and-ai}} applies to problem solving too. A few additions specific to algorithms:

- **Go back to examples.** Being stuck usually means you are thinking abstractly. Pick a concrete example and solve it by hand, very slowly.
- **Write the brute force anyway.** Even an obviously slow solution helps: it confirms you understand the problem, gives you something to test against, and often reveals the repeated work you can remove.
- **Say what you know and do not know.** "I know I need to compare each price with something. I don't know how to avoid comparing with every other price." Naming the exact gap often closes it.
- **Change the representation.** Draw it differently. Sort it. Put it in a table. Count things.
- **Take a short break.** Many solutions appear while walking away from the screen — your mind keeps working on a problem you have fully understood.
- **Respect the twenty-minute rule.** After genuine effort, look at a hint or a solution — then close it and solve the problem again yourself the next day ({{ch:learning-and-ai}}).

## Thinking out loud

In a coding interview, **how** you solve the problem matters almost as much as whether you solve it. Interviewers want to see your reasoning, and they cannot see inside your head. Silence for twenty minutes followed by code — even correct code — tells them very little and makes it impossible for them to help you.

The five steps give you a natural script:

1. **Understand:** "Let me restate the problem… I have a few questions: what about duplicates? Empty input?"
2. **Explore:** "Let me try a small example… for this input, I'd expect this output."
3. **Plan:** "The simplest approach is to compare every pair, which works but is slow for large inputs. I think I can do better by remembering what I've seen in a map…"
4. **Build:** narrate briefly as you write: "Now I'm storing each price with its index…"
5. **Check:** "Let me trace this example… and check the empty case… The time is one pass, and the extra memory is the map."

You will practise this skill — speaking clearly while thinking, in English, under pressure — in {{ch:talking-about-code}} and {{ch:interview-under-pressure}}. Start practising now, even alone: explain your solutions out loud as you write them.

## From beginner to enterprise: problem solving at every level

**Level 3 — Small problems.** Exercises and interview questions: one function, clear inputs and outputs. The five steps, applied consciously.

**Level 4 — Features in a real application.** "Customers should get free delivery on their first order" — a problem with inputs (the customer's order history), outputs (a fee) and rules, but also unclear edge cases (what counts as a "first order" if the first was cancelled?). The **understand** step means talking to the product owner. The **check** step means automated tests.

**Level 5 — Professional engineering.** Problems become **designs**: "How should we handle refunds across three payment providers?" The same steps scale up: understand the requirements and constraints, explore scenarios (including failures), consider simple and better designs and their trade-offs, build in pieces, and check with tests, reviews and monitoring. Engineers write short design documents — essentially steps 1 to 3 on paper — before large changes.

**Level 6 — Enterprise.** Problems involve many teams and systems: "Reduce checkout failures by half." Decomposition becomes organisational — which team owns which sub-problem. Exploring examples means analysing real production data. "Good enough" is judged against business goals, costs and risks, not just code elegance ({{ch:engineering-decisions}}).

## Real-world use cases

### Beginner level — A grading program

**Situation:** a learner must convert marks into grades and is unsure where to start.

**Method:** understand the boundaries (is 80 an A?); explore examples including 0, 100 and each boundary; plan as an `if`/`else if` chain from the top grade down; build; test every boundary.

### Intermediate level — The "first order" discount

**Business problem:** a shop wants a discount on each customer's first order.

**Step 1 reveals the real questions:** Does a cancelled first order count? A refunded one? What about a customer who registered twice with different emails?

**Lesson:** most of the effort — and most of the value — was in understanding the problem. The code, once the rules were clear, was a few lines.

### Advanced level — A slow matching feature

**Business problem:** a ride-hailing company's feature that matches riders with nearby drivers becomes slow as the city's driver count grows.

**Method:** the original approach compared every rider with every driver — the nested-loop brute force. Looking for a better organisation of the data, the engineers grouped drivers into a grid of map squares, so each rider is compared only with drivers in nearby squares.

**Lesson:** the improvement came from changing how the data was organised, exactly the strategy "would a different organisation make this easy?" Real systems use specialised geographic indexes for this ({{ch:system-design-fundamentals}}).

### Enterprise level — Decomposing a migration

**Business problem (illustrative):** a bank must move millions of customer accounts from an old system to a new one without downtime or errors.

**Method:** decomposition into sub-problems — copying historical data, keeping both systems in sync during the move, verifying balances match, switching customers over in small groups, and being able to switch back. Each sub-problem gets its own plan, tests and owner.

**Lesson:** the same five steps, applied at the scale of an organisation, are what make huge projects manageable.

## Common mistakes

### Beginner mistake — Coding immediately

**What it looks like:** reading a problem and starting to type straight away.

**What happens:** code for a misunderstood problem, rewritten several times; edge cases discovered late.

**How to fix it:** spend the first minutes on understanding and examples — it saves far more time than it costs.

### Beginner mistake — Testing only the happy case

**What it looks like:** running one typical example, seeing the right answer, and declaring the solution finished.

**What happens:** failures on empty inputs, duplicates or boundaries — often in front of an interviewer or a customer.

**How to fix it:** test every category in the testing table.

### Beginner mistake — Hunting for the clever solution first

**What it looks like:** refusing to write the brute force because "it's too slow", and then writing nothing at all.

**How to fix it:** simple and correct first; optimise second.

### Intermediate mistake — Assuming instead of asking

**What it looks like:** deciding silently how duplicates or invalid inputs should behave.

**What happens:** a solution to a slightly different problem.

**How to fix it:** ask; if you cannot ask, state your assumption explicitly.

### Intermediate mistake — Optimising what does not matter

**What it looks like:** spending an hour making a function that handles ten items twice as fast.

**How to fix it:** ask how large the input will really be and how often the code runs, before optimising.

### Production mistake — Solving the stated problem, not the real one

**What it looks like:** building exactly what the ticket says, when the ticket described a symptom ("make the report faster") rather than the need ("managers need yesterday's numbers by 9 am").

**What happens:** effort spent on the wrong solution.

**How to prevent it:** in step 1, ask *why* the problem exists and what success looks like.

## Debugging and troubleshooting your problem solving

| Symptom | What it usually means | What to do |
|---|---|---|
| You cannot start at all | The problem is not yet understood | Restate it; write examples by hand |
| You keep rewriting the code | There was no plan | Stop; write pseudocode; check it |
| The code works on your example but fails on others | Edge cases were not explored | Use the testing table |
| You have a solution but it is too slow | Brute force on a large input | Look for repeated work; consider a lookup structure or sorting |
| The solution is long and tangled | The problem was not decomposed | Split it into sub-problems and functions |
| You are stuck for a long time | You are thinking abstractly | Go back to a tiny concrete example |

## How a senior engineer thinks about problem solving

> [!SENIOR]
> - **Understanding is most of the work.** They spend real time on the problem statement, ask "why?" and "what if?", and write down assumptions.
> - **Examples before abstractions.** They work concrete cases — especially awkward ones — before generalising.
> - **Correct first, then fast, then elegant** — and they stop as soon as the solution is good enough for its real use.
> - **Every solution has a cost.** They state time and memory costs out loud, and know which one they are trading for the other.
> - **Decompose until each piece is obvious.** If a piece is still hard, it is not small enough yet.
> - **Make their thinking visible** — in interviews by talking, at work by writing short plans and clear pull-request descriptions.

## Exercises

### Exercise 1 — Understand before solving

**Objective:** practise step 1 and step 2.

**The problem:** "Write a function that checks whether a password is strong."

**What to do:** do **not** write any code. Write down (1) at least six questions you would ask before starting, and (2) a table of at least eight example inputs with the expected output, based on reasonable answers you choose.

<details>
<summary>Show the solution</summary>

**Questions:**

1. What makes a password "strong"? Minimum length? Required kinds of characters?
2. What is the minimum length — 8, 12, more?
3. Must it contain uppercase letters, lowercase letters, digits, symbols? How many of each?
4. Is there a maximum length?
5. Should common passwords (like `password123`) be rejected even if they meet the rules?
6. Should it reject passwords containing the user's name or email?
7. Are spaces and non-English characters allowed?
8. What should the function return — `true`/`false`, or a list of reasons so the user knows what to fix?

**Chosen answers (example):** at least 12 characters; at least one lowercase letter, one uppercase letter and one digit; reject a short list of very common passwords; return a list of problems (empty means strong).

**Examples:**

| Input | Expected problems |
|---|---|
| `"Lahore2026Spring"` | none (strong) |
| `"short1A"` | too short |
| `"alllowercase123"` | no uppercase letter |
| `"ALLUPPERCASE123"` | no lowercase letter |
| `"NoDigitsAtAllHere"` | no digit |
| `""` | too short, no lowercase, no uppercase, no digit |
| `"Password1234"` | too common |
| `"Exactly12Chr"` (exactly 12 characters) | none — tests the length boundary |
| `"Exactly11Ch"` (11 characters) | too short — just below the boundary |

**Lesson:** the original sentence was six words long and almost completely ambiguous. Modern security guidance, by the way, emphasises **length** and rejecting **known-breached** passwords over complicated character rules ({{ch:authentication}}) — which is exactly the kind of thing step 1 is for discovering.

**Common wrong approach:** starting with a regular expression for "strong" before deciding what strong means.

</details>

### Exercise 2 — Brute force, then better

**Objective:** practise improving a solution with a lookup structure.

**The problem:** given an array of order IDs, return the **first** ID that appears more than once, or `undefined` if none repeats. For example, `["A7", "B2", "C9", "B2", "A7"]` → `"B2"` (its second appearance comes before A7's second appearance).

**What to do:** write a brute-force solution with nested loops, then a single-pass solution with a `Set`. Test both on the example, on an array with no duplicates, and on an empty array.

<details>
<summary>Show the solution</summary>

**Brute force:**

```ts
function firstRepeatBruteForce(ids: string[]): string | undefined {
  for (let i = 0; i < ids.length; i++) {
    for (let j = 0; j < i; j++) {
      if (ids[i] === ids[j]) {
        return ids[i];
      }
    }
  }
  return undefined;
}
```

For each position `i`, check every **earlier** position `j`. The first `i` that matches something earlier is the first repeat to complete.

**Single pass with a `Set`:**

```ts
function firstRepeat(ids: string[]): string | undefined {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) {
      return id;
    }
    seen.add(id);
  }
  return undefined;
}

for (const input of [["A7", "B2", "C9", "B2", "A7"], ["A1", "B2", "C3"], []]) {
  console.log(firstRepeatBruteForce(input), firstRepeat(input));
}
```

**Output:**

```text
B2 B2
undefined undefined
undefined undefined
```

Walkthrough of the `Set` version:

- `seen` remembers every ID met so far. `has` asks "seen before?" in one quick step; `add` remembers the current one.
- The first time an ID is found in `seen`, that is the first repeat — return it.

Both are correct; the brute force does roughly `n × n / 2` comparisons, the `Set` version roughly `n` steps plus memory for the set. For a few dozen IDs either is fine; for a million, only the second is practical.

**Common wrong approach:** returning the ID that appears **most** often, or the first ID in the array that has a duplicate *anywhere* (that would be `"A7"`). Re-read the problem: "first ID that appears more than once" was defined by the example as the first repeat **to occur**. This is why step 2's examples matter.

</details>

### Exercise 3 — Decompose a report

**Objective:** practise decomposition.

**The problem:** given an array of deliveries `{ courier: string; city: string; minutesLate: number }`, return, for each city, the name of the courier with the **highest average** lateness in that city (only couriers with at least 2 deliveries in that city count). Return an object like `{ Lahore: "Bilal", Karachi: "Zain" }`.

**What to do:** first write the sub-problems as a list of comments; then implement them; then test with a small dataset you invent, including a city where no courier has 2 deliveries.

<details>
<summary>Show the solution</summary>

```ts
type Delivery = { courier: string; city: string; minutesLate: number };

function latestCourierByCity(deliveries: Delivery[]): Record<string, string> {
  // 1. Group lateness values by city, then by courier.
  const byCity = new Map<string, Map<string, number[]>>();
  for (const { courier, city, minutesLate } of deliveries) {
    const couriers = byCity.get(city) ?? new Map<string, number[]>();
    const lates = couriers.get(courier) ?? [];
    lates.push(minutesLate);
    couriers.set(courier, lates);
    byCity.set(city, couriers);
  }

  const result: Record<string, string> = {};
  for (const [city, couriers] of byCity) {
    // 2. For each courier with at least 2 deliveries, compute the average.
    // 3. Keep the courier with the highest average.
    let worstCourier: string | undefined;
    let worstAverage = -Infinity;
    for (const [courier, lates] of couriers) {
      if (lates.length < 2) continue;
      const average = lates.reduce((sum, m) => sum + m, 0) / lates.length;
      if (average > worstAverage) {
        worstAverage = average;
        worstCourier = courier;
      }
    }
    // 4. Only include cities where a courier qualified.
    if (worstCourier !== undefined) {
      result[city] = worstCourier;
    }
  }
  return result;
}

const deliveries: Delivery[] = [
  { courier: "Bilal", city: "Lahore", minutesLate: 30 },
  { courier: "Bilal", city: "Lahore", minutesLate: 10 },
  { courier: "Sara", city: "Lahore", minutesLate: 5 },
  { courier: "Sara", city: "Lahore", minutesLate: 15 },
  { courier: "Zain", city: "Karachi", minutesLate: 12 },
  { courier: "Zain", city: "Karachi", minutesLate: 20 },
  { courier: "Omar", city: "Multan", minutesLate: 60 },
];

console.log(latestCourierByCity(deliveries));
```

**Output:**

```text
{ Lahore: 'Bilal', Karachi: 'Zain' }
```

Walkthrough:

- Sub-problem 1 builds a nested lookup: city → courier → list of lateness values.
- Sub-problems 2 and 3 compute averages, skipping couriers with fewer than 2 deliveries (`continue`, from {{ch:loops}}), and track the highest average with the "best so far" pattern.
- Sub-problem 4 leaves out Multan, where Omar has only one delivery.
- Bilal's average in Lahore is 20 minutes; Sara's is 10; so Bilal is reported.

**Common wrong approach:** writing one long loop that tries to do everything at once — group, average and compare — and getting tangled. The comments-first approach kept each part simple.

</details>

### Exercise 4 — Find the flaw (debugging your reasoning)

**Objective:** practise step 5: checking edge cases.

**The scenario:** a colleague wrote this function to find the largest value in an array of daily temperature changes, and says "it works, I tested it":

```ts
function largestChange(changes: number[]): number {
  let largest = 0;
  for (const change of changes) {
    if (change > largest) largest = change;
  }
  return largest;
}

console.log(largestChange([2, -1, 5, 3]));   // their test: prints 5
```

**What to do:** find at least two inputs for which it gives a wrong or misleading answer, explain why, and fix it.

<details>
<summary>Show the solution</summary>

**Failing inputs:**

1. `largestChange([-4, -2, -7])` returns `0`. The correct answer is `-2`. Starting `largest` at `0` assumes some value is at least 0 — false when every change is negative (a week when the temperature fell every day).
2. `largestChange([])` returns `0`. That claims "the largest change was zero", when there were no changes at all — a misleading answer that will look like real data in a report.

**Fix:**

```ts
function largestChange(changes: number[]): number | undefined {
  if (changes.length === 0) return undefined;
  let largest = changes[0]!;
  for (const change of changes) {
    if (change > largest) largest = change;
  }
  return largest;
}

console.log(largestChange([2, -1, 5, 3]));
console.log(largestChange([-4, -2, -7]));
console.log(largestChange([]));
```

**Output:**

```text
5
-2
undefined
```

Walkthrough:

- An empty input is handled explicitly with a guard clause, and the return type now admits that there may be no answer.
- `largest` starts at the **first element**, not at an arbitrary number, so any values — all negative included — work. (Starting at `-Infinity` would also work, but would then need the empty check anyway.)

**Lesson:** the colleague's single test was a "typical" case. The categories from the testing table — **empty** and **all negative** — found two bugs in seconds. This is the exact bug pattern you were warned about in {{ch:loops}}, appearing in real code.

</details>

## Summary

Knowing a language is different from solving problems with it. Use a **five-step method**: **understand** the problem (inputs, outputs, rules; ask about everything unspecified), **explore** with small examples worked by hand (which become your **edge cases** and tests), **plan** (start with a simple **brute-force** solution, ask if it is good enough, look for a better idea, and write **pseudocode**), **build** by translating the plan, and **check** by tracing, testing every category of input and judging the cost.

Large problems become manageable through **decomposition** into small, familiar sub-problems. Better solutions usually come from removing repeated work — often by **trading memory for time** with a lookup structure, as in the pair-sum problem. When looking for an approach, ask what you would do by hand, what is being repeated, whether different data organisation would help, and whether a simpler version can be solved first. Test deliberately: typical, empty, single, boundaries, duplicates, order, special numbers, invalid and large inputs. When stuck, return to concrete examples and write the brute force anyway. In interviews, **think out loud**, using the five steps as your script.

## Key terms

- **Problem (programming)** — A description of the outputs a program must produce from given inputs, under given rules.
- **Input / output** — The data a function or program receives, and the result it produces.
- **Constraint** — A rule or limit in a problem, such as the maximum input size or whether values can repeat.
- **Algorithm** — A precise, step-by-step procedure for solving a problem.
- **Edge case** — An unusual or extreme input that tests the boundaries of a solution.
- **Brute force** — Solving a problem in the most direct way, often by trying every possibility.
- **Optimisation** — Improving a working solution so that it uses less time or memory.
- **Pseudocode** — A plan for an algorithm written in plain language mixed with programming ideas.
- **Decomposition** — Breaking a large problem into smaller problems that can be solved separately.
- **Tracing** — Following an algorithm step by step by hand, recording the values of variables.
- **Time–memory trade-off** — Using more memory to make a solution faster, or accepting more time to use less memory.
- **Two Sum** — A classic problem: find two items in a list whose values add up to a target.
- **Test case** — A specific input together with its expected output, used to check a solution.
- **Test-driven development** — Writing tests before writing the code that makes them pass.
- **Thinking out loud** — Explaining your reasoning while solving a problem, as expected in coding interviews.

## What comes next

Throughout this chapter, you judged solutions informally: "a nested loop is slow for large inputs", "one pass is about as good as it gets", "the map costs extra memory". Engineers need a precise, shared way to describe how a solution's cost **grows** as its input grows — so they can compare approaches, predict whether code will cope with next year's data, and answer the interview question that follows almost every coding problem: "What is the complexity of your solution?"

In the next chapter, **Measuring Speed and Memory: Big O Notation**, you will learn that language, and how to apply it to everything you write.
