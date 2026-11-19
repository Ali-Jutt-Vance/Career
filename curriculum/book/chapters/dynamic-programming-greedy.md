# Dynamic Programming and Greedy Algorithms

> [!GOALS]
> - What dynamic programming is, and the two signs that a problem needs it: overlapping sub-problems and optimal substructure.
> - The two ways to write it: top-down with memoisation, and bottom-up with a table.
> - A reliable five-step recipe for designing a dynamic-programming solution.
> - Classic problems solved step by step: climbing stairs, making change with the fewest coins, the knapsack problem, and the longest common subsequence.
> - How to reduce memory once a table works.
> - What greedy algorithms are, why they are attractive, and how to tell when the locally best choice is also globally best.
> - How these ideas appear in real systems: pricing, scheduling, text comparison, route planning and resource allocation.

## Why this matters

Some problems ask for the **best** answer among an enormous number of possibilities:

- What is the cheapest way to pay Rs 1,700 using the fewest notes and coins?
- Which items should go into a delivery van with a weight limit, to maximise their value?
- What are the smallest changes that turn one version of a file into another — the thing Git shows you as a "diff"?
- How should a cloud budget be split across projects to maximise return?

Trying every possibility is exponential ({{ch:big-o}}) — impossible beyond tiny inputs. Two powerful families of techniques make many such problems practical:

- **Dynamic programming** solves each smaller piece of the problem **once**, remembers the answer, and builds the full answer from those pieces. It turned the staircase problem in {{ch:recursion-sorting-searching}} from exponential to linear.
- **Greedy algorithms** make the choice that looks best **right now**, at every step, without reconsidering. When that works, it is the simplest and fastest approach of all — but it does not always work, and knowing when it does is the real skill.

Dynamic programming has a reputation for being the hardest interview topic. It is much less mysterious once you see that it is just **recursion plus memory**, organised carefully. This chapter builds it up slowly.

## The simple idea

Imagine you are asked, "What is 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1?" You count: 8. Now someone adds "+ 1" to the end and asks again. You do not recount from the beginning — you say "9", because you **remember** the previous answer and build on it.

That is dynamic programming: **remember the answers to smaller problems so you never solve the same one twice.**

A greedy approach is different: at each moment, take what looks best immediately. When paying for something, a person hands over the largest note that does not exceed the remaining amount, then the next largest, and so on. With Pakistani rupee notes, that habit always gives the fewest notes. With some other note systems, it does not — as you will see.

> [!ANALOGY]
> Dynamic programming is like climbing a building and writing on each floor's wall the fastest way to reach it. To find the fastest way to the tenth floor, you read the notes on the floors below instead of re-exploring every staircase.
>
> Greedy is like always taking the staircase that climbs the most in the next step.
>
> **Where the analogies break:** in a real building, the fastest way to a floor rarely depends on anything above it. In dynamic programming, you must carefully decide **what** a "floor" is — what exactly a sub-problem means — and in which **order** to fill them in. Choosing the sub-problem well is most of the work.

## The proper definition and key words

- **Dynamic programming** (DP) is a technique for solving problems by breaking them into **overlapping sub-problems**, solving each sub-problem once, storing its answer, and combining stored answers to solve larger problems.
- **Overlapping sub-problems:** the same smaller problems are needed again and again.
- **Optimal substructure:** the best solution to the whole problem can be built from the best solutions to its sub-problems.
- **State:** the information that identifies one sub-problem — for example, "the number of stairs left" or "the amount still to pay".
- **Recurrence** (or **transition**): the rule that computes a state's answer from smaller states' answers.
- **Memoisation (top-down DP):** recursion that stores each state's answer the first time it is computed ({{ch:scope-and-closures}}).
- **Tabulation (bottom-up DP):** filling a table of answers from the smallest states upwards, with loops instead of recursion.
- A **greedy algorithm** builds a solution step by step, always taking the choice that looks best at that moment, never undoing it.
- The **greedy-choice property** holds when a locally best choice can always be part of a globally best solution.

## Seeing the problem: repeated work

### Level 2 — The staircase again

In {{ch:recursion-sorting-searching}} you met this function, which counts the ways to climb `n` stairs taking 1 or 2 steps at a time:

```ts
function countWays(n: number): number {
  if (n <= 1) return 1;
  return countWays(n - 1) + countWays(n - 2);
}
```

Draw the calls for `countWays(5)`:

```text
                            countWays(5)
                     /                        \
              countWays(4)                   countWays(3)
             /           \                  /           \
       countWays(3)    countWays(2)    countWays(2)   countWays(1)
       /        \       /       \       /       \
   cW(2)      cW(1)  cW(1)    cW(0)  cW(1)    cW(0)
   /    \
 cW(1) cW(0)
```

`countWays(3)` is computed **twice**, `countWays(2)` **three** times, and as n grows, the repetition explodes: the call tree roughly doubles in size with each extra stair — O(2ⁿ). These are **overlapping sub-problems**.

And the answer for n is built from the answers for n − 1 and n − 2: **optimal substructure** (here, the "best" is simply "the count").

Those are the two signs that dynamic programming applies.

### Level 3 — Two ways to remove the repetition

**Top-down (memoisation):** keep the recursion, but remember each answer.

```ts
function countWaysTopDown(n: number, memo = new Map<number, number>()): number {
  if (n <= 1) return 1;
  const cached = memo.get(n);
  if (cached !== undefined) return cached;
  const ways = countWaysTopDown(n - 1, memo) + countWaysTopDown(n - 2, memo);
  memo.set(n, ways);
  return ways;
}
```

**Bottom-up (tabulation):** start from the smallest cases and fill a table upwards, with a loop.

```ts
function countWaysBottomUp(n: number): number {
  const ways = new Array<number>(n + 1).fill(0);
  ways[0] = 1;
  ways[1] = 1;
  for (let i = 2; i <= n; i++) {
    ways[i] = ways[i - 1]! + ways[i - 2]!;
  }
  return ways[n]!;
}

console.log(countWaysTopDown(30), countWaysBottomUp(30));
```

**Output:**

```text
1346269 1346269
```

```text
  i:      0  1  2  3  4  5   6   7   8 ...
  ways:   1  1  2  3  5  8  13  21  34 ...
          base     each = the two before it added together
```

Both are **O(n)** time. They differ in style:

| | Top-down (memoisation) | Bottom-up (tabulation) |
|---|---|---|
| Written as | recursion + cache | loops + table |
| Computes | only the states actually needed | every state up to n |
| Easiest when | the recurrence is natural to write recursively | the order of states is clear |
| Risk | deep recursion can overflow the stack ({{ch:recursion-sorting-searching}}) | must fill the table in the right order |
| Memory tricks | harder | easy to shrink (below) |

A good habit: **write the recursive version first** (it is closest to how you think about the problem), add memoisation, then convert to bottom-up if you need speed, safety from stack overflow, or less memory.

(You may recognise the sequence 1, 1, 2, 3, 5, 8, 13… — these are the **Fibonacci numbers**, a sequence that appears in countless DP examples.)

## A recipe for dynamic programming

DP feels hard because people try to jump straight to the table. A step-by-step recipe works much better:

```text
  1. DEFINE THE STATE      What does one sub-problem's answer mean, in one sentence?
  2. WRITE THE RECURRENCE  How is a state's answer built from smaller states?
  3. BASE CASES            Which states can be answered directly?
  4. ORDER                 In what order must states be computed (bottom-up)?
  5. ANSWER                Which state (or states) hold the final answer?
```

Then check the cost: (number of states) × (work per state).

Step 1 is the most important. Write the state as a full sentence: "`ways[i]` is the number of distinct ways to climb exactly `i` stairs." If you cannot write that sentence clearly, you are not ready to write code.

We will now apply the recipe to three classic problems, each a little harder.

## Problem 1 — Making change with the fewest coins

### Level 4 — Where greedy fails and DP succeeds

> **Problem:** A vending machine must give change of a given amount using the **fewest** coins. Coin values are given. Return the minimum number of coins, or −1 if the amount cannot be made.

First, the tempting **greedy** approach: always use the largest coin that fits.

```ts
function changeGreedy(coins: number[], amount: number): number {
  const sorted = coins.toSorted((a, b) => b - a);
  let count = 0;
  for (const coin of sorted) {
    while (amount >= coin) {
      amount -= coin;
      count++;
    }
  }
  return amount === 0 ? count : -1;
}

console.log(changeGreedy([1, 2, 5, 10, 20, 50, 100], 186));
console.log(changeGreedy([1, 3, 4], 6));
```

**Output:**

```text
6
3
```

For coins like real rupees, greedy gives the right answer: 186 = 100 + 50 + 20 + 10 + 5 + 1 — six coins. But with coins `[1, 3, 4]` and an amount of 6, greedy takes 4, then 1, then 1 — **three** coins — while the best answer is 3 + 3: **two** coins. The locally best choice (the biggest coin) led away from the best overall answer.

So we need dynamic programming. Apply the recipe:

1. **State:** `fewest[a]` = the minimum number of coins that make exactly amount `a` (or `Infinity` if impossible).
2. **Recurrence:** to make amount `a`, the **last** coin used is one of the coin values `c`. If we use `c`, the rest is the best way to make `a − c`, plus one coin. Try every coin and keep the minimum:
   `fewest[a] = min over coins c ≤ a of (fewest[a − c] + 1)`
3. **Base case:** `fewest[0] = 0` — zero coins make zero.
4. **Order:** each amount depends on smaller amounts, so fill from 1 up to the target.
5. **Answer:** `fewest[amount]`.

```ts
function fewestCoins(coins: number[], amount: number): number {
  const fewest = new Array<number>(amount + 1).fill(Infinity);
  fewest[0] = 0;

  for (let a = 1; a <= amount; a++) {
    for (const coin of coins) {
      if (coin <= a && fewest[a - coin]! + 1 < fewest[a]!) {
        fewest[a] = fewest[a - coin]! + 1;
      }
    }
  }
  return fewest[amount] === Infinity ? -1 : fewest[amount]!;
}

console.log(fewestCoins([1, 3, 4], 6));
console.log(fewestCoins([1, 2, 5, 10, 20, 50, 100], 186));
console.log(fewestCoins([5, 10], 3));
```

**Output:**

```text
2
6
-1
```

Trace for coins `[1, 3, 4]`:

```text
  a:          0   1   2   3   4   5   6
  fewest[a]:  0   1   2   1   1   2   2

  fewest[6] = min( fewest[5]+1 (coin 1) = 3,
                   fewest[3]+1 (coin 3) = 2,   <- best: 3 + 3
                   fewest[2]+1 (coin 4) = 3 )
```

Walkthrough:

- Every amount starts at `Infinity`, meaning "not yet possible".
- For each amount, every coin is tried as the last coin, and the best result is kept.
- An amount that no combination can make stays at `Infinity`, and the function reports −1 (you cannot make Rs 3 from 5s and 10s).

**Cost:** O(amount × number of coins) time, O(amount) memory. Compare that with trying every combination of coins, which is exponential.

> [!NOTE]
> Coin systems where greedy always works are called **canonical**. Most real currencies are designed to be canonical, so cashiers can give change greedily — but not all systems are, and in software you are often not dealing with real currency: package sizes, server instance sizes, discount bundles. Never assume greedy works without a reason.

## Problem 2 — The knapsack problem

### Level 5 — Choosing items under a limit

> **Problem:** A courier van can carry at most a given weight. Each parcel has a weight and a value (say, its delivery fee). Each parcel can be taken or left — not split. Which parcels maximise the total value without exceeding the weight limit?

This is the famous **0/1 knapsack** problem ("0/1" because each item is taken zero or one times). It models countless real decisions: which projects to fund within a budget, which features to build within a sprint's capacity ({{ch:agile-and-scrum}}), which ads to show within a page's space, which files to cache within memory limits.

Greedy ideas fail here. "Take the most valuable first" can fill the van with one heavy item. "Take the best value per kilogram first" sounds smart, but also fails:

```text
  van capacity: 10 kg
  parcel A: 6 kg, Rs 300   (50 per kg)
  parcel B: 5 kg, Rs 240   (48 per kg)
  parcel C: 5 kg, Rs 240   (48 per kg)

  best value per kg first:  take A (6 kg), then B does not fit -> Rs 300
  the best answer:          take B and C (10 kg)              -> Rs 480
```

Apply the recipe:

1. **State:** `best[i][w]` = the maximum value achievable using only the **first `i` parcels**, with a weight limit of `w`.
2. **Recurrence:** for parcel `i` (weight `wt`, value `val`), there are two choices:
   - **leave it:** `best[i − 1][w]`;
   - **take it** (only if `wt ≤ w`): `val + best[i − 1][w − wt]` — its value, plus the best we can do with the earlier parcels in the remaining capacity.

   `best[i][w] = max(leave, take)`.
3. **Base cases:** `best[0][w] = 0` (no parcels, no value), and `best[i][0] = 0` (no capacity).
4. **Order:** row by row, `i` from 1 upwards; each row depends only on the row above.
5. **Answer:** `best[n][capacity]`.

```ts
type Parcel = { id: string; kg: number; value: number };

function bestLoad(parcels: Parcel[], capacityKg: number): { value: number; chosen: string[] } {
  const n = parcels.length;
  const best: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(capacityKg + 1).fill(0));

  for (let i = 1; i <= n; i++) {
    const { kg, value } = parcels[i - 1]!;
    for (let w = 0; w <= capacityKg; w++) {
      const leave = best[i - 1]![w]!;
      const take = kg <= w ? value + best[i - 1]![w - kg]! : -Infinity;
      best[i]![w] = Math.max(leave, take);
    }
  }

  // Walk back through the table to find which parcels were chosen.
  const chosen: string[] = [];
  let w = capacityKg;
  for (let i = n; i >= 1; i--) {
    if (best[i]![w] !== best[i - 1]![w]) {
      const parcel = parcels[i - 1]!;
      chosen.push(parcel.id);
      w -= parcel.kg;
    }
  }
  return { value: best[n]![capacityKg]!, chosen: chosen.reverse() };
}

console.log(bestLoad(
  [
    { id: "A", kg: 6, value: 300 },
    { id: "B", kg: 5, value: 240 },
    { id: "C", kg: 5, value: 240 },
    { id: "D", kg: 2, value: 90 },
  ],
  10,
));
```

**Output:**

```text
{ value: 480, chosen: [ 'B', 'C' ] }
```

Walkthrough:

- `best` is a two-dimensional table: one row per number of parcels considered (0 to n), one column per capacity (0 to the limit).
- Each cell takes the better of leaving or taking the current parcel. "Taking" looks at the row above, at the capacity reduced by the parcel's weight.
- **Reconstructing the choice:** if a cell's value differs from the cell directly above it, the parcel for that row **must** have been taken — so we record it and reduce the remaining capacity. Walking from the last row upwards rebuilds the exact selection. (Most DP problems ask for the choices, not just the best number; keeping the table makes this possible.)

**Cost:** O(n × capacity) time and memory. Note that the cost depends on the **numeric size** of the capacity: a capacity of 10 kg is tiny, but a capacity measured in grams (10,000) makes the table a thousand times bigger. For very large capacities, other approaches are needed.

## Problem 3 — Longest common subsequence

### Level 5 — Comparing two sequences

> **Problem:** Given two strings, find the length of their **longest common subsequence**: the longest sequence of characters that appears in both, in the same order, but not necessarily next to each other. For `"ABCBDAB"` and `"BDCABA"`, one longest common subsequence is `"BCBA"`, of length 4.

This problem is the heart of **diff tools**: when Git shows which lines changed between two versions of a file ({{ch:git}}), it is essentially finding the longest common subsequence of lines — the lines that stayed the same — and reporting everything else as added or removed. Similar ideas power spell-checkers ("did you mean…?"), DNA comparison in biology, and plagiarism detection.

Apply the recipe:

1. **State:** `lcs[i][j]` = the length of the longest common subsequence of the **first `i` characters** of `a` and the **first `j` characters** of `b`.
2. **Recurrence:**
   - if the `i`-th character of `a` equals the `j`-th character of `b`, that character can extend the best answer for the shorter prefixes: `lcs[i][j] = lcs[i − 1][j − 1] + 1`;
   - otherwise, drop the last character of one string or the other, whichever gives more: `lcs[i][j] = max(lcs[i − 1][j], lcs[i][j − 1])`.
3. **Base cases:** `lcs[0][j] = lcs[i][0] = 0` — an empty prefix has nothing in common with anything.
4. **Order:** row by row, left to right.
5. **Answer:** `lcs[a.length][b.length]`.

```ts
function longestCommonSubsequence(a: string, b: string): number {
  const lcs: number[][] = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) {
        lcs[i]![j] = lcs[i - 1]![j - 1]! + 1;
      } else {
        lcs[i]![j] = Math.max(lcs[i - 1]![j]!, lcs[i]![j - 1]!);
      }
    }
  }
  return lcs[a.length]![b.length]!;
}

console.log(longestCommonSubsequence("ABCBDAB", "BDCABA"));
console.log(longestCommonSubsequence("delivery", "delivered"));
```

**Output:**

```text
4
7
```

For `"delivery"` and `"delivered"`, the common subsequence `"deliver"` has length 7. **Cost:** O(len(a) × len(b)) time and memory.

A close relative, the **edit distance** (or **Levenshtein distance**) — the minimum number of single-character insertions, deletions and substitutions to turn one string into another — uses the same kind of table. It powers "did you mean *delivery*?" suggestions and fuzzy search; you will build it in the exercises.

## Reducing memory

Once a bottom-up solution works, you can often reduce its memory, because each row (or state) depends only on the previous one or two.

The staircase needs only the last two values:

```ts
function countWaysConstantMemory(n: number): number {
  let previous = 1;   // ways[i - 2]
  let current = 1;    // ways[i - 1]
  for (let i = 2; i <= n; i++) {
    [previous, current] = [current, previous + current];
  }
  return current;
}

console.log(countWaysConstantMemory(30));
```

**Output:**

```text
1346269
```

O(n) time, now **O(1)** memory. Similarly, the knapsack and LCS tables can be reduced to one or two rows, at the cost of no longer being able to reconstruct the chosen items from the table. Optimise memory only when it matters — first get a clear, correct table.

## Greedy algorithms

### Level 4 — Taking the best choice now

A **greedy algorithm** makes the choice that looks best at each step and never revisits it. When greedy works, it is usually **simple and fast** — often just a sort followed by one pass. The difficulty is knowing **whether** it works.

Greedy works when a problem has the **greedy-choice property** — some locally best choice is always part of an optimal solution — together with **optimal substructure**. Proving this formally is beyond everyday work, but you can test it: try to construct a small example where the greedy choice leads to a worse answer, as with the coins `[1, 3, 4]` and the knapsack parcels. If you cannot find one after a genuine effort, and the problem resembles a known greedy problem, greedy is probably right. If you find one, you need DP or another method.

### A problem where greedy is correct: scheduling meetings

> **Problem:** A meeting room receives many booking requests, each with a start and end time. Accept as **many** meetings as possible, with no overlaps.

Several greedy rules are tempting: shortest meeting first? Earliest start first? Only one is correct: **always take the meeting that ends earliest**, then the next one that starts after it ends, and so on. Finishing early leaves the most room for the rest.

```ts
type Booking = { team: string; start: number; end: number };   // hours, e.g. 9.5 = 9:30

function maxBookings(requests: Booking[]): Booking[] {
  const byEnd = requests.toSorted((a, b) => a.end - b.end);
  const accepted: Booking[] = [];
  let roomFreeAt = -Infinity;
  for (const booking of byEnd) {
    if (booking.start >= roomFreeAt) {
      accepted.push(booking);
      roomFreeAt = booking.end;
    }
  }
  return accepted;
}

console.log(maxBookings([
  { team: "Sales", start: 9, end: 12 },
  { team: "Design", start: 9, end: 10 },
  { team: "Support", start: 10, end: 11 },
  { team: "Finance", start: 11.5, end: 13 },
  { team: "HR", start: 10.5, end: 14 },
]).map((b) => b.team));
```

**Output:**

```text
[ 'Design', 'Support', 'Finance' ]
```

Walkthrough:

- Sort by end time (O(n log n)), then one pass (O(n)).
- Accept a booking whenever it starts after the room becomes free.
- Three meetings fit; the long Sales and HR meetings would have blocked more.

Why is "earliest end" right, while "shortest first" is wrong? A short meeting placed in the middle of the day can overlap two others and block both; a meeting that ends earliest never blocks more than an optimal solution's first meeting would. (That exchange argument is the usual shape of greedy proofs.)

### Other famous greedy algorithms

You have already met several:

- **Dijkstra's shortest paths** ({{ch:trees-heaps-graphs}}) greedily expands the closest unexplored vertex — correct for non-negative edge weights.
- **Making change** with canonical currencies.
- **Huffman coding** — the basis of many compression formats — greedily merges the two least frequent symbols to build an efficient code.
- **Minimum spanning trees** (connecting all towns with the least total road length) — Kruskal's and Prim's algorithms are greedy.

And greedy is often used **deliberately as a heuristic** — a fast rule that gives a good, though not guaranteed best, answer — for problems where the exact solution is far too slow, like planning delivery routes through many stops ({{ch:trees-heaps-graphs}}).

## DP or greedy? A decision guide

```text
  Is the problem asking for an optimum (min/max/count) over many choices?
     |
     yes
     |
  Can I find a small example where the "obvious best choice now" fails?
     |                                   |
    yes                                  no (and it resembles a known greedy problem)
     |                                   |
  Do sub-problems repeat?            GREEDY: sort + one pass, simple and fast
     |                (verify with tests; look for a counter-example)
    yes
     |
  DYNAMIC PROGRAMMING: define state, recurrence, base cases, order, answer
     |
  Is the number of states too large?  ->  heuristics, approximations, or
                                          specialised solvers
```

## From beginner to enterprise: these techniques at every level

**Level 3 — Small programs.** Memoising recursive functions; filling small tables; recognising when a greedy rule fails on an example.

**Level 4 — A real application.** Choosing the best combination of discounts for a basket; packing items into boxes; showing "did you mean?" suggestions using edit distance; scheduling rooms or delivery slots greedily.

**Level 5 — Professional engineering.** Engineers recognise optimisation problems hidden in business requests ("use as few vans as possible", "fit the most ads"), estimate the size of the state space before building, and choose between exact DP, a greedy rule with a known guarantee, or a heuristic. They test greedy rules against brute force on small random inputs to catch counter-examples.

**Level 6 — Enterprise.** Large optimisation problems — airline crew scheduling, warehouse slotting, fleet routing, ad auctions, cloud resource allocation — are handled with specialised **solvers** (linear and integer programming, constraint solvers) and carefully tuned heuristics, often combined with DP on smaller sub-problems. Text-diffing algorithms based on DP run inside every version-control system and code-review tool you will use.

## Real-world use cases

### Beginner level — Counting paths on a grid

**Situation:** how many routes are there from the top-left to the bottom-right of a city grid, moving only right or down?

**Solution:** `paths[r][c] = paths[r − 1][c] + paths[r][c − 1]` — each cell's count is the sum of the cells above and to the left.

### Intermediate level — The best discount combination

**Business problem:** a shop allows customers to combine coupons, each with conditions and values, but the total discount cannot exceed a cap. Which coupons give the most saving?

**Analysis:** with a cap, this is a knapsack problem: coupons are items, the cap is the capacity. A greedy "biggest coupon first" can leave value unused.

**Solution:** DP over coupons and remaining cap, in the smallest currency unit ({{ch:types-of-data}}) — keeping the cap's numeric size in mind, since it determines the table size.

### Advanced level — Fuzzy product search

**Business problem:** customers type "delivry boots" and see no results.

**Solution:** compute the edit distance between the query words and known product terms, suggesting matches within a small distance ("did you mean *delivery boots*?"). Because comparing against every term is expensive, the system first narrows candidates (for example, by the first letters or by indexes built for fuzzy matching) and runs DP only on those.

### Enterprise level — Allocating a cloud budget

**Business problem (illustrative):** a platform team must choose which of 40 proposed infrastructure improvements to fund within a fixed quarterly budget, each with an estimated cost and benefit.

**Analysis:** a knapsack problem. With 40 items and a budget measured in thousands of dollars, DP over (items × budget in units of, say, $1,000) is small and exact.

**Limits:** the "values" are estimates, not facts. Engineers treat the optimiser's output as a starting point for discussion, not a final answer — a reminder that the hardest part of optimisation in business is getting the numbers right ({{ch:engineering-decisions}}).

## Common mistakes

### Beginner mistake — Jumping straight to the table

**What it looks like:** trying to write a two-dimensional loop before defining what a cell means.

**How to fix it:** write the state as a sentence first; then the recurrence; then the code.

### Beginner mistake — Wrong base cases

**What it looks like:** `fewest[0] = Infinity` instead of 0, or forgetting the first row of a table.

**What happens:** every answer is wrong or impossible.

**How to fix it:** compute the smallest cases by hand and check them against the table.

### Intermediate mistake — Assuming greedy works

**What it looks like:** "always take the biggest", "always take the best ratio", without a reason.

**What happens:** answers that are usually right and occasionally wrong — the worst kind of bug.

**How to fix it:** search for counter-examples; compare greedy with brute force on small random inputs.

### Intermediate mistake — Filling the table in the wrong order

**What it looks like:** a cell reads a neighbour that has not been computed yet.

**How to fix it:** for each state, list which states it depends on, and loop so they are always filled first.

### Production mistake — Ignoring the state-space size

**What it looks like:** a DP table indexed by a value that can be huge — an amount in paisa up to 10⁹, a capacity in grams.

**What happens:** gigantic memory use or timeouts.

**How to prevent it:** estimate (states × work per state) before building; change units, reduce the state, or use another method.

### Enterprise mistake — Optimising precisely on imprecise data

**What it looks like:** perfect optimisation of costs or values that are rough guesses.

**How to prevent it:** test how sensitive the answer is to the estimates; prefer robust, explainable choices.

## Debugging and troubleshooting

| Symptom | Likely cause |
|---|---|
| Recursive DP still exponential | Memo not stored, not checked, or keyed incorrectly (for multiple parameters, the key must include all of them) |
| `Maximum call stack size exceeded` in top-down DP | Recursion depth too large — convert to bottom-up |
| Answers off by one or always zero | Wrong base cases or table sized one too small |
| `undefined`/`NaN` in table cells | Reading outside the table, or a cell not yet filled |
| Greedy gives a wrong answer on some inputs | The problem lacks the greedy-choice property |
| Reconstructed choices are inconsistent with the best value | Reconstruction logic does not mirror the recurrence |

> [!TIP]
> Print the DP table for a tiny input — with `console.table` ({{ch:first-program}}) — and check a few cells by hand. Most DP bugs become obvious the moment you see the table.

## How a senior engineer thinks about DP and greedy

> [!SENIOR]
> - **Recognise the shape.** "Best combination under a limit" is a knapsack; "minimum edits" is edit distance; "count the ways" is usually DP; "most non-overlapping intervals" is greedy.
> - **State first, code second.** A clear one-sentence state definition is the whole solution in disguise.
> - **Greedy needs a reason.** Either a known guarantee, or a serious search for counter-examples.
> - **Count the states.** Before building, multiply the dimensions; if the table is enormous, rethink.
> - **Exact is not always required.** For huge problems, good heuristics and specialised solvers beat perfect answers that never finish.

## Exercises

### Exercise 1 — Grid paths with blocked roads

**Objective:** practise a two-dimensional DP.

**What to build:** `countPaths(grid)` where `grid` is an array of strings using `"."` for open cells and `"#"` for blocked ones. Count the routes from the top-left to the bottom-right moving only right or down. For:

```text
...
.#.
...
```

the answer is 2.

<details>
<summary>Show the solution</summary>

```ts
function countPaths(grid: string[]): number {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  if (rows === 0 || cols === 0) return 0;

  const paths: number[][] = Array.from({ length: rows }, () => new Array<number>(cols).fill(0));
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r]![c] === "#") continue;          // blocked: 0 paths
      if (r === 0 && c === 0) {
        paths[r]![c] = 1;                          // base case: the start
        continue;
      }
      const fromAbove = r > 0 ? paths[r - 1]![c]! : 0;
      const fromLeft = c > 0 ? paths[r]![c - 1]! : 0;
      paths[r]![c] = fromAbove + fromLeft;
    }
  }
  return paths[rows - 1]![cols - 1]!;
}

console.log(countPaths(["...", ".#.", "..."]));
console.log(countPaths(["....", "....", "...."]));
```

**Output:**

```text
2
10
```

Walkthrough:

- **State:** `paths[r][c]` = the number of routes from the start to cell `(r, c)`.
- **Recurrence:** a cell can be entered only from above or from the left, so its count is the sum of theirs.
- **Base case:** the start has one route (staying put); blocked cells have zero.
- **Order:** row by row, left to right, so above and left are always ready.
- A 3 × 4 open grid has 10 routes.

**Common wrong approach:** counting routes with recursion and no memo — exponential, and painfully slow for a 20 × 20 grid.

</details>

### Exercise 2 — Edit distance

**Objective:** practise LCS-style DP.

**What to build:** `editDistance(a, b)` — the minimum number of single-character insertions, deletions or substitutions to turn `a` into `b`. Examples: `("delivry", "delivery")` → 1; `("kitten", "sitting")` → 3.

**Hint:** state `d[i][j]` = the distance between the first `i` characters of `a` and the first `j` of `b`. If the last characters match, it costs nothing extra; otherwise take the best of insert, delete or substitute, plus one.

<details>
<summary>Show the solution</summary>

```ts
function editDistance(a: string, b: string): number {
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) {
        d[i]![j] = d[i - 1]![j - 1]!;
      } else {
        d[i]![j] = 1 + Math.min(
          d[i - 1]![j]!,       // delete a character from a
          d[i]![j - 1]!,       // insert a character into a
          d[i - 1]![j - 1]!,   // substitute one character
        );
      }
    }
  }
  return d[a.length]![b.length]!;
}

console.log(editDistance("delivry", "delivery"), editDistance("kitten", "sitting"), editDistance("", "abc"));
```

**Output:**

```text
1 3 3
```

Walkthrough:

- **Base cases:** turning a prefix of length `i` into an empty string takes `i` deletions; turning an empty string into a prefix of length `j` takes `j` insertions. The table's first row and column are initialised with these.
- **Recurrence:** matching last characters cost nothing more; otherwise, one operation plus the cheapest smaller problem.
- "kitten" → "sitting": substitute k→s, substitute e→i, insert g — 3 edits.

**Common wrong approach:** initialising the first row and column to 0, which claims that turning `"abc"` into `""` costs nothing.

</details>

### Exercise 3 — Greedy or not?

**Objective:** practise finding counter-examples.

**What to do:** for each greedy rule, decide whether it always gives the best answer. If not, give a counter-example.

1. Fewest coins with coins `[1, 5, 10, 25]`, always taking the largest coin that fits.
2. Fewest coins with coins `[1, 7, 10]`, always taking the largest coin that fits.
3. Most meetings in one room, always taking the **shortest** meeting first (that does not overlap already accepted ones).
4. Maximum value in a knapsack, always taking the item with the best value per kilogram that still fits.

<details>
<summary>Show the solution</summary>

1. **Works.** This coin system is canonical. (You can check small amounts against `fewestCoins`; they always match.)
2. **Fails.** Amount 14: greedy takes 10 + 1 + 1 + 1 + 1 = 5 coins; the best is 7 + 7 = 2 coins.
3. **Fails.** Meetings 9–12, 12–15 and 11–13: the shortest (11–13, two hours) overlaps both others, so greedy accepts one meeting; the best is 9–12 and 12–15 — two meetings.
4. **Fails** for the 0/1 knapsack (items cannot be split) — the example in this chapter: A (6 kg, Rs 300) beats B and C individually per kilogram, but B + C is worth Rs 480 against A's Rs 300. (It **does** work if items can be split into fractions — the "fractional knapsack" — which shows how a small change in the rules changes the right technique.)

**Lesson:** greedy rules feel convincing. A two-minute search for a counter-example is cheap insurance.

</details>

### Exercise 4 — The slow price combinations (debugging)

**Objective:** practise adding memoisation correctly.

**The scenario:** this function counts the ways to make an amount from coins (order does not matter), but it is extremely slow for amounts above a few hundred, and a colleague's attempt to add a cache "made no difference":

```ts
function countCombos(coins: number[], amount: number, index = 0, cache = new Map<number, number>()): number {
  if (amount === 0) return 1;
  if (amount < 0 || index === coins.length) return 0;
  const cached = cache.get(amount);
  if (cached !== undefined) return cached;
  const result =
    countCombos(coins, amount - coins[index]!, index, cache) +   // use this coin again
    countCombos(coins, amount, index + 1, cache);                // move to the next coin
  cache.set(amount, result);
  return result;
}

console.log(countCombos([1, 2, 5], 5));
```

**What to do:** run it, explain why the cache is wrong (not just ineffective), and fix it.

<details>
<summary>Show the solution</summary>

**Output of the original:**

```text
9
```

The correct answer is 4 (5; 2+2+1; 2+1+1+1; 1+1+1+1+1). So the cache is not merely ineffective — it gives **wrong answers**.

**Why:** the result of `countCombos` depends on **two** things: the `amount` **and** the `index` (which coins are still allowed). The cache is keyed only by `amount`, so "ways to make 3 using all coins" and "ways to make 3 using only the coin 5" — very different numbers — share one cache entry. Whichever is computed first is returned for both.

**Fix:** the cache key must include **every** parameter that affects the result:

```ts
function countCombos(coins: number[], amount: number, index = 0, cache = new Map<string, number>()): number {
  if (amount === 0) return 1;
  if (amount < 0 || index === coins.length) return 0;
  const key = `${amount}:${index}`;
  const cached = cache.get(key);
  if (cached !== undefined) return cached;
  const result =
    countCombos(coins, amount - coins[index]!, index, cache) +
    countCombos(coins, amount, index + 1, cache);
  cache.set(key, result);
  return result;
}

console.log(countCombos([1, 2, 5], 5), countCombos([1, 2, 5, 10, 20, 50, 100], 500));
```

**Output:**

```text
4 5824071
```

**Lesson:** a memo is only correct if its key captures the **entire state**. This is one of the most common DP bugs, and it is dangerous because the program still runs and still returns plausible numbers — just wrong ones. Always test a memoised function against the slow version on small inputs.

</details>

## Summary

**Dynamic programming** applies when a problem has **overlapping sub-problems** and **optimal substructure**. It solves each sub-problem — identified by a **state** — once, stores the answer, and builds larger answers with a **recurrence**. Write it **top-down** with recursion and **memoisation**, or **bottom-up** by filling a table from the **base cases** in a safe **order**. Follow the recipe: define the state in a sentence, write the recurrence, set base cases, choose the order, identify the answer — then estimate cost as states × work per state. Classic examples: climbing stairs (Fibonacci), fewest coins, the **0/1 knapsack** (with reconstruction of the chosen items), and **longest common subsequence** and **edit distance**, which power diff tools and fuzzy search. Once a table works, memory can often be reduced to a row or a few variables.

**Greedy algorithms** take the locally best choice at each step and never undo it. They are simple and fast — typically a sort and a pass — and correct only when the **greedy-choice property** holds, as in earliest-end meeting scheduling, Dijkstra's algorithm and change-making with canonical coins. Always look for counter-examples: greedy fails for coins like `[1, 3, 4]` and for the 0/1 knapsack. For problems too large for exact methods, greedy rules and other heuristics give good, practical answers.

## Key terms

- **Dynamic programming (DP)** — Solving a problem by solving overlapping sub-problems once each, storing their answers, and combining them.
- **Overlapping sub-problems** — Smaller problems that are needed repeatedly while solving a larger one.
- **Optimal substructure** — The property that the best solution can be built from the best solutions of sub-problems.
- **State (DP)** — The information that identifies one sub-problem.
- **Recurrence (transition)** — The rule computing a state's answer from smaller states.
- **Memoisation (top-down DP)** — Recursion that caches each state's answer the first time it is computed.
- **Tabulation (bottom-up DP)** — Filling a table of answers from the smallest states upwards using loops.
- **Fibonacci numbers** — The sequence 1, 1, 2, 3, 5, 8, … in which each number is the sum of the two before it.
- **Canonical coin system** — A set of coin values for which always taking the largest coin gives the fewest coins.
- **0/1 knapsack problem** — Choosing items, each taken whole or not at all, to maximise value within a weight or cost limit.
- **Reconstruction (DP)** — Walking back through a DP table to recover the choices that produced the best answer.
- **Longest common subsequence (LCS)** — The longest sequence appearing in the same order (not necessarily adjacent) in two sequences.
- **Edit (Levenshtein) distance** — The minimum number of insertions, deletions and substitutions to turn one string into another.
- **Diff** — A description of the differences between two versions of a text, as shown by Git.
- **Greedy algorithm** — An algorithm that always makes the choice that looks best at the moment and never reconsiders it.
- **Greedy-choice property** — The property that a locally best choice can always be part of a globally best solution.
- **Counter-example** — A specific input that shows a rule or algorithm gives a wrong answer.
- **Heuristic** — A practical rule that gives good, but not guaranteed best, answers quickly.
- **Interval scheduling** — Choosing the most non-overlapping intervals, solved greedily by earliest end time.
- **Fractional knapsack** — A knapsack variant where items can be split, solvable greedily by value per unit weight.
- **Solver (optimisation)** — Specialised software for large optimisation problems, such as integer programming.

## What comes next

You now have the full toolkit of Part III: a method for solving problems, Big O for measuring them, and the core data structures and algorithms. The final chapter of this part brings them together for one specific, high-stakes purpose: **coding interviews**.

In **Coding Interview Patterns**, you will learn the dozen patterns that most interview problems are built on, how to recognise which one a new problem needs within a couple of minutes, how to communicate while you solve, and how to practise so that the skills hold up under pressure — on a clock, with a stranger watching.
