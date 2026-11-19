# Recursion, Sorting and Searching

> [!GOALS]
> - What recursion really is, how to design a recursive solution, and how it uses the call stack.
> - The "leap of faith": trusting a recursive call to solve the smaller problem.
> - When recursion is the right tool, when a loop is better, and how to avoid stack overflows.
> - Backtracking: exploring choices and undoing them, for problems like generating combinations.
> - Why sorting matters, and what "stable" sorting means.
> - How the classic sorting algorithms work — selection, insertion, merge sort and quicksort — and what each costs.
> - What JavaScript's built-in `sort` does, and how to use it correctly with compare functions and multiple keys.
> - Binary search: how to write it correctly (boundaries are where everyone goes wrong) and its many uses.

## Why this matters

Recursion appeared in the last chapter whenever data had smaller copies of itself inside it — a category containing categories, an employee managing employees. Sorting and searching appeared everywhere: sorting prices for display, searching sorted price bands, finding a value in an index.

These three topics belong together. Recursion is the thinking tool behind the fastest sorting algorithms; sorting is what makes fast searching possible; and binary search is the most important algorithm built on sorted data — used, in one form or another, inside databases, version-control tools and countless libraries.

They are also staples of coding interviews: "Implement merge sort", "Find this value in a sorted array in O(log n)", "Generate all subsets", "Explain what a stable sort is". This chapter teaches each one from the ground up.

## The simple idea

- **Recursion** is solving a problem by solving a **smaller version of the same problem** and building on its answer. "How many people are in this queue?" can be answered by each person asking the person behind them, "How many are behind you?", and adding one.
- **Sorting** is putting items in order — and once they are in order, many problems become easy.
- **Searching a sorted list** is like finding a word in a dictionary: open it in the middle, decide whether your word is in the first or second half, and repeat. Each step halves the pages left.

> [!ANALOGY]
> Recursion is like a set of Russian nesting dolls: to count the dolls, open the outer one and count the dolls inside — which is the same problem, one size smaller — and add one. When you reach the smallest doll, which opens to nothing, you stop.
>
> **Where the analogy breaks:** real dolls get physically smaller, so you always reach the last one. A recursive function only stops if **you** design it so that each call really is smaller and a stopping point really exists. Forget that, and the "dolls" never end — the program calls itself until it runs out of stack space.

## The proper definition and key words

- **Recursion** is when a function calls itself, directly or indirectly.
- The **base case** is the simplest version of the problem, solved directly, without recursion. Every recursive function needs at least one.
- The **recursive case** reduces the problem to smaller versions and calls the function on them.
- **Backtracking** is a recursive technique for exploring choices: make a choice, explore what follows, then undo the choice and try the next.
- **Sorting** means arranging items in an order defined by a **comparison**.
- A **stable** sort keeps items that compare as equal in their original relative order.
- An **in-place** algorithm rearranges data inside the original array, using only a small amount of extra memory.
- **Binary search** finds a target in sorted data by repeatedly halving the range that could contain it.

## Recursion

### Level 2 — The structure of every recursive function

Every correct recursive function has the same two parts:

```ts
function sumTo(n: number): number {
  if (n === 0) return 0;          // base case: the answer for the smallest problem
  return n + sumTo(n - 1);        // recursive case: build on a smaller problem
}

console.log(sumTo(4));
```

**Output:**

```text
10
```

`sumTo(4)` means 4 + 3 + 2 + 1 + 0. The function says: "the sum up to n is n plus the sum up to n − 1", and "the sum up to 0 is 0".

### Level 3 — What happens on the call stack

Each call gets its own **stack frame** ({{ch:functions}}), with its own `n`. The calls pile up until the base case is reached, then the results flow back down as each call returns:

```text
  calling down (stack grows)              returning up (stack shrinks)

  sumTo(4)  waits for sumTo(3)            sumTo(4) = 4 + 6  = 10   <- final answer
   sumTo(3)  waits for sumTo(2)            sumTo(3) = 3 + 3  = 6
    sumTo(2)  waits for sumTo(1)            sumTo(2) = 2 + 1  = 3
     sumTo(1)  waits for sumTo(0)            sumTo(1) = 1 + 0  = 1
      sumTo(0)  base case: returns 0          sumTo(0) = 0
```

Read the left column top to bottom: each call is paused, waiting for the call it made. The right column, read bottom to top, shows the answers returning and being combined. At the deepest point, five frames are on the stack at once — so this function uses **O(n)** stack space ({{ch:big-o}}).

### The leap of faith

Beginners often try to trace every recursive call in their head, and get lost. Experienced engineers use a different mindset, sometimes called the **recursive leap of faith**:

1. **Handle the base case** correctly.
2. **Assume** the function already works correctly for any **smaller** input.
3. Using that assumption, solve the current input.

For `sumTo(n)`: "Suppose `sumTo(n - 1)` correctly returns the sum up to n − 1. Then the sum up to n is just n plus that." You do not need to trace further. If the base case is right and each step is right, the whole thing is right — this is the same reasoning as mathematical induction.

Apply it to a more interesting problem:

> **Problem:** Flatten nested arrays of any depth: `[1, [2, [3, [4]], 5]]` → `[1, 2, 3, 4, 5]`.

```ts
type Nested = number | Nested[];

function flatten(items: Nested[]): number[] {
  const result: number[] = [];
  for (const item of items) {
    if (Array.isArray(item)) {
      result.push(...flatten(item));   // trust: this flattens the inner array
    } else {
      result.push(item);               // a plain number
    }
  }
  return result;
}

console.log(flatten([1, [2, [3, [4]], 5]]));
```

**Output:**

```text
[ 1, 2, 3, 4, 5 ]
```

Walkthrough:

- `Nested` is a **recursive type**: a value is either a number or an array of `Nested` values ({{ch:typescript-advanced}}).
- For each item: if it is a number, keep it. If it is an array, **trust** that `flatten` correctly flattens it — it is a smaller problem — and add its results.
- The base case is implicit: an array of plain numbers involves no recursive calls.

You never needed to think about how deep the nesting goes. That is the power of the leap of faith.

### When to use recursion — and when not to

Recursion shines when the **data** or the **problem** is naturally recursive:

- trees and nested structures — file systems, categories, the DOM, JSON ({{ch:trees-heaps-graphs}});
- **divide and conquer** — split a problem into halves, solve each, combine (merge sort and quicksort, below);
- exploring choices — backtracking (below).

A loop is usually better when the problem is a simple sequence. `sumTo` is clearer, faster and safer as a loop:

```ts
function sumToLoop(n: number): number {
  let total = 0;
  for (let i = 1; i <= n; i++) total += i;
  return total;
}
```

Why "safer"? Because of the stack:

```ts
console.log(sumToLoop(100_000));
console.log(sumTo(100_000));
```

**Output:**

```text
5000050000
RangeError: Maximum call stack size exceeded
```

The loop version uses O(1) memory. The recursive version needs 100,000 frames on the call stack, and JavaScript's stack holds only roughly ten thousand frames (the exact limit depends on the engine and on how big each frame is). Some languages optimise certain recursive calls so they do not use extra stack ("tail-call optimisation"), but in practice JavaScript engines do not, so you cannot rely on it.

The rule of thumb: **use recursion when the depth is naturally small** (tree height, nesting levels, the log n depth of divide and conquer), and **use a loop or an explicit stack when the depth grows with the size of the input**.

### Recursion with memoisation

In {{ch:big-o}} you met a recursive function that is fatally slow:

```ts
function countWays(steps: number): number {
  if (steps <= 1) return 1;
  return countWays(steps - 1) + countWays(steps - 2);
}
```

It counts the ways to climb a staircase taking one or two steps at a time. The problem is not recursion itself; it is that the same sub-problems are solved **again and again**. `countWays(5)` calls `countWays(3)` twice, `countWays(2)` three times, and so on — exponential repetition. The fix is **memoisation** ({{ch:scope-and-closures}}): remember each answer the first time.

```ts
function countWaysMemo(steps: number, memo = new Map<number, number>()): number {
  if (steps <= 1) return 1;
  const known = memo.get(steps);
  if (known !== undefined) return known;
  const ways = countWaysMemo(steps - 1, memo) + countWaysMemo(steps - 2, memo);
  memo.set(steps, ways);
  return ways;
}

console.log(countWaysMemo(50));
```

**Output:**

```text
20365011074
```

Each value is computed once: **O(n)** instead of O(2ⁿ). Recognising overlapping sub-problems and remembering their answers is the essence of **dynamic programming**, the subject of {{ch:dynamic-programming-greedy}}.

## Backtracking

### Level 4 — Exploring every choice, and undoing

Some problems require trying **combinations of choices**: every subset of items, every arrangement of seats, every way to split a budget. **Backtracking** explores them systematically with recursion:

1. Make a choice.
2. Recurse to explore everything that follows from it.
3. **Undo** the choice (backtrack), and try the next option.

> **Problem:** A customer has a gift card for Rs 1,500. Which combinations of products add up exactly to that amount?

```ts
function exactCombinations(prices: number[], target: number): number[][] {
  const results: number[][] = [];
  const chosen: number[] = [];

  function explore(start: number, remaining: number): void {
    if (remaining === 0) {
      results.push([...chosen]);           // found one: save a copy
      return;
    }
    for (let i = start; i < prices.length; i++) {
      const price = prices[i]!;
      if (price > remaining) continue;     // too expensive: skip
      chosen.push(price);                  // 1. choose
      explore(i + 1, remaining - price);   // 2. explore with this choice
      chosen.pop();                        // 3. undo the choice
    }
  }

  explore(0, target);
  return results;
}

console.log(exactCombinations([500, 1000, 700, 300, 800, 200], 1500));
```

**Output:**

```text
[
  [ 500, 1000 ],
  [ 500, 700, 300 ],
  [ 500, 800, 200 ],
  [ 1000, 300, 200 ],
  [ 700, 800 ]
]
```

> [!TRY]
> Before reading the walkthrough, trace the function by hand for the first few branches and predict the combinations yourself. Backtracking output is easy to guess wrongly — the reliable way to know it, as {{ch:problem-solving}} taught, is to **trace it** or **run it**. Then check your trace against the output above.

Walkthrough:

- `chosen` holds the current partial combination; `remaining` is how much of the target is still unspent.
- When `remaining` reaches 0, a valid combination has been found, and a **copy** is saved (`[...chosen]`) — because `chosen` will keep changing.
- The loop tries each remaining product from `start` onwards. Starting from `i + 1` in the recursive call means each product is used at most once, and each combination is found only once (not once per ordering).
- `if (price > remaining) continue` **prunes** choices that cannot possibly work, saving time.
- `chosen.pop()` undoes the choice so the next option can be tried from the same state — the "backtrack".

```text
  explore(start 0, remaining 1500), chosen []
   ├─ choose 500 -> remaining 1000
   │   ├─ choose 1000 -> remaining 0   FOUND [500, 1000]
   │   ├─ choose 700  -> remaining 300
   │   │   └─ choose 300 -> remaining 0   FOUND [500, 700, 300]
   │   ├─ choose 300  -> remaining 700
   │   │   └─ choose 200 -> 500 left, nothing else fits ... dead end
   │   ├─ choose 800  -> remaining 200
   │   │   └─ choose 200 -> remaining 0   FOUND [500, 800, 200]
   │   └─ choose 200  -> remaining 800 ... dead end
   ├─ choose 1000 -> remaining 500
   │   ├─ choose 300 -> 200 left
   │   │   └─ choose 200 -> remaining 0   FOUND [1000, 300, 200]
   │   ...
   ├─ choose 700 -> remaining 800
   │   ├─ choose 800 -> remaining 0   FOUND [700, 800]
   │   ...
   ...
```

**Cost:** in the worst case, backtracking explores every subset — **O(2ⁿ)** — so it is only practical for small inputs (the constraint table in {{ch:big-o}}: n up to about 20–25). Pruning makes it much faster in practice. Backtracking solves puzzles (Sudoku), scheduling with constraints, generating permutations and subsets, and searching for configurations.

## Sorting

### Why sorting matters

Sorted data makes many problems easy:

- **Searching** becomes O(log n) with binary search, instead of O(n).
- **Duplicates** sit next to each other, so finding them takes one pass.
- **Ranges** ("all orders between two dates") are contiguous.
- **Two-pointer** techniques work ({{ch:arrays-strings-hash-maps}}).
- **Merging** and comparing lists becomes linear.
- **People** need sorted data: price low to high, newest first, alphabetical.

### Stability

A sort is **stable** if items that compare as **equal** keep their original relative order. This matters whenever you sort by one property after another:

```ts
const orders = [
  { id: "A", status: "shipped", placedAt: "09:00" },
  { id: "B", status: "pending", placedAt: "09:05" },
  { id: "C", status: "shipped", placedAt: "09:10" },
  { id: "D", status: "pending", placedAt: "09:15" },
];

const byStatus = [...orders].sort((a, b) => a.status.localeCompare(b.status));
console.log(byStatus.map((o) => o.id).join(" "));
```

**Output:**

```text
B D A C
```

The orders were already in time order. Sorting by status puts "pending" before "shipped", and — because JavaScript's `sort` is **stable** (guaranteed by the language standard since 2019) — within each status they **stay** in time order: B before D, A before C. An unstable sort might produce `D B C A`, scrambling the time order and confusing anyone reading the list.

### Level 3 — Simple sorts: selection and insertion

Simple sorts are worth understanding because they show the basic ideas clearly, and because one of them is genuinely useful.

**Selection sort** repeatedly finds the smallest remaining item and moves it to the front:

```ts
function selectionSort(values: number[]): number[] {
  const a = [...values];
  for (let i = 0; i < a.length; i++) {
    let smallest = i;
    for (let j = i + 1; j < a.length; j++) {
      if (a[j]! < a[smallest]!) smallest = j;
    }
    [a[i], a[smallest]] = [a[smallest]!, a[i]!];
  }
  return a;
}
```

Always O(n²) comparisons, even for sorted input. Simple, but too slow for real use.

**Insertion sort** builds a sorted section at the front, taking each next item and sliding it back into its correct place — the way many people sort playing cards in their hand:

```ts
function insertionSort(values: number[]): number[] {
  const a = [...values];
  for (let i = 1; i < a.length; i++) {
    const current = a[i]!;
    let j = i - 1;
    while (j >= 0 && a[j]! > current) {
      a[j + 1] = a[j]!;    // shift larger items right
      j--;
    }
    a[j + 1] = current;    // drop the item into its place
  }
  return a;
}

console.log(insertionSort([5, 2, 9, 1, 5, 6]));
```

**Output:**

```text
[ 1, 2, 5, 5, 6, 9 ]
```

```text
  start:           [5 | 2 9 1 5 6]
  insert 2:        [2 5 | 9 1 5 6]
  insert 9:        [2 5 9 | 1 5 6]
  insert 1:        [1 2 5 9 | 5 6]   1 slides past 9, 5, 2
  insert 5:        [1 2 5 5 9 | 6]
  insert 6:        [1 2 5 5 6 9]
```

Insertion sort is O(n²) in the worst case, but **O(n) on data that is already almost sorted** (each item slides only a short way), it is stable, it sorts in place, and it is very fast for small arrays. That is why real sorting implementations switch to insertion sort for small pieces of data.

### Level 4 — Merge sort: divide and conquer

**Merge sort** is the classic efficient sort, and a perfect example of recursion's power. The idea:

1. **Divide:** split the array into two halves.
2. **Conquer:** sort each half — recursively (leap of faith!).
3. **Combine:** **merge** the two sorted halves into one sorted array.

The base case: an array of zero or one items is already sorted.

```ts
function mergeSort(values: number[]): number[] {
  if (values.length <= 1) return values;

  const middle = Math.floor(values.length / 2);
  const left = mergeSort(values.slice(0, middle));
  const right = mergeSort(values.slice(middle));

  return merge(left, right);
}

function merge(left: number[], right: number[]): number[] {
  const result: number[] = [];
  let i = 0;
  let j = 0;
  while (i < left.length && j < right.length) {
    if (left[i]! <= right[j]!) {
      result.push(left[i]!);
      i++;
    } else {
      result.push(right[j]!);
      j++;
    }
  }
  while (i < left.length) result.push(left[i++]!);
  while (j < right.length) result.push(right[j++]!);
  return result;
}

console.log(mergeSort([38, 27, 43, 3, 9, 82, 10]));
```

**Output:**

```text
[
   3,  9, 10, 27,
  38, 43, 82
]
```

```text
                  [38 27 43 3 9 82 10]
                  /                  \
           [38 27 43]              [3 9 82 10]          divide
           /       \               /         \
        [38]     [27 43]        [3 9]      [82 10]
                 /    \         /   \      /    \
               [27]  [43]     [3]   [9]  [82]  [10]
                 \    /         \   /      \    /
        [38]    [27 43]        [3 9]      [10 82]       merge
           \       /               \         /
           [27 38 43]              [3 9 10 82]
                  \                  /
                  [3 9 10 27 38 43 82]
```

Walkthrough:

- `mergeSort` splits until pieces have one element, then merges them back up.
- `merge` walks two **sorted** arrays with two pointers ({{ch:arrays-strings-hash-maps}}), always taking the smaller front item. When one side runs out, the rest of the other is copied over.
- `<=` (rather than `<`) takes from the left first on ties, which keeps equal items in their original order — so merge sort is **stable**.

**Cost:** the array is halved log n times, and each level of merging touches all n items: **O(n log n)** in every case — best, average and worst. It uses **O(n)** extra memory for the merged arrays. Its predictability and stability make it the backbone of many real sorting implementations, and its merge step is the basis of **external sorting** — sorting data too large for memory by sorting chunks and merging them from disk.

### Quicksort

**Quicksort** is the other famous divide-and-conquer sort:

1. Choose a **pivot** element.
2. **Partition:** put everything smaller than the pivot before it, and everything larger after it.
3. Recursively sort the two parts.

```ts
function quickSort(values: number[]): number[] {
  if (values.length <= 1) return values;
  const pivot = values[Math.floor(values.length / 2)]!;
  const smaller = values.filter((v) => v < pivot);
  const equal = values.filter((v) => v === pivot);
  const larger = values.filter((v) => v > pivot);
  return [...quickSort(smaller), ...equal, ...quickSort(larger)];
}

console.log(quickSort([38, 27, 43, 3, 9, 82, 10]));
```

**Output:**

```text
[
   3,  9, 10, 27,
  38, 43, 82
]
```

This short version shows the idea clearly but creates many new arrays; production quicksorts partition **in place**, swapping elements within the array, using O(log n) extra memory for recursion. Quicksort is **O(n log n) on average** and very fast in practice — but **O(n²) in the worst case**, when the pivots keep splitting the data very unevenly (for example, always choosing the smallest element). Good implementations choose pivots carefully (randomly, or the middle of three samples) to make that worst case vanishingly unlikely. Quicksort is not stable.

### Comparing the sorts

| Algorithm | Best | Average | Worst | Extra memory | Stable? |
|---|---|---|---|---|---|
| Selection sort | O(n²) | O(n²) | O(n²) | O(1) | No |
| Insertion sort | O(n) | O(n²) | O(n²) | O(1) | Yes |
| Merge sort | O(n log n) | O(n log n) | O(n log n) | O(n) | Yes |
| Quicksort | O(n log n) | O(n log n) | O(n²) | O(log n) | No |
| Heap sort (using a heap, {{ch:trees-heaps-graphs}}) | O(n log n) | O(n log n) | O(n log n) | O(1) | No |

A mathematical fact worth knowing: no sorting method that works only by **comparing** items can beat **O(n log n)** in general. (Special methods such as **counting sort** can sort small whole numbers — ages, ratings from 1 to 5 — in O(n) by counting instead of comparing.)

### JavaScript's `sort`, used correctly

In real code, you almost never write your own sort. JavaScript's `sort` (and the non-mutating `toSorted`) use **TimSort** in V8: a hybrid of merge sort and insertion sort that is O(n log n), **stable**, and especially fast on data that is already partly sorted — common in real life.

What you **do** need is to use it correctly, as you learned in {{ch:arrays}}:

```ts
type Product = { name: string; category: string; pricePaisa: number; rating: number };

const products: Product[] = [
  { name: "Cap", category: "Accessories", pricePaisa: 49900, rating: 4.2 },
  { name: "Shirt", category: "Clothing", pricePaisa: 129950, rating: 4.8 },
  { name: "Belt", category: "Accessories", pricePaisa: 89900, rating: 4.8 },
  { name: "Jeans", category: "Clothing", pricePaisa: 249900, rating: 4.5 },
];

const sorted = products.toSorted(
  (a, b) =>
    a.category.localeCompare(b.category) ||   // 1st: category A-Z
    b.rating - a.rating ||                    // 2nd: highest rating first
    a.pricePaisa - b.pricePaisa,              // 3rd: cheapest first
);

console.log(sorted.map((p) => `${p.category} | ${p.name} | ${p.rating}`));
```

**Output:**

```text
[
  'Accessories | Belt | 4.8',
  'Accessories | Cap | 4.2',
  'Clothing | Shirt | 4.8',
  'Clothing | Jeans | 4.5'
]
```

Walkthrough:

- A compare function returns a negative number if `a` comes first, positive if `b` comes first, and 0 for a tie ({{ch:arrays}}).
- **Several sort keys** are combined with `||`: if the first comparison gives 0 (a tie), `||` moves on to the next comparison ({{ch:operators-and-decisions}} — 0 is falsy). This is the standard way to sort by multiple fields.
- `b.rating - a.rating` reverses the order for "highest first".
- `localeCompare` sorts text the way people expect.

Common mistakes with `sort`, briefly — each covered in {{ch:arrays}}: calling `sort()` with no compare function on numbers (it sorts them as strings), forgetting that `sort` mutates the array, and returning `true`/`false` from a compare function instead of a number.

## Searching

### Linear search

Searching an **unsorted** array has no shortcut: you must check items one by one — **O(n)**. That is what `includes`, `indexOf` and `find` do ({{ch:big-o}}).

### Level 4 — Binary search

If the array is **sorted**, you can do dramatically better. Look at the middle element:

- If it is the target, done.
- If the target is **smaller**, it can only be in the **left** half — discard the right half.
- If the target is **larger**, it can only be in the **right** half — discard the left half.

Each step halves the search range: **O(log n)**. For a billion sorted items, about 30 comparisons ({{ch:big-o}}).

```ts
function binarySearch(sorted: number[], target: number): number {
  let low = 0;
  let high = sorted.length - 1;

  while (low <= high) {
    const mid = low + Math.floor((high - low) / 2);
    const value = sorted[mid]!;
    if (value === target) return mid;
    if (value < target) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return -1;
}

const prices = [200, 450, 700, 1200, 1500, 2300, 3000, 4500];
console.log(binarySearch(prices, 2300), binarySearch(prices, 1000));
```

**Output:**

```text
5 -1
```

Trace for 2300:

```text
  low high mid  sorted[mid]  decision
  0   7    3    1200         1200 < 2300 -> low = 4
  4   7    5    2300         found at index 5
```

Trace for 1000 (not present):

```text
  low high mid  sorted[mid]  decision
  0   7    3    1200         1200 > 1000 -> high = 2
  0   2    1    450          450 < 1000  -> low = 2
  2   2    2    700          700 < 1000  -> low = 3
  3   2    -    -            low > high  -> not found, -1
```

### Getting the boundaries right

Binary search is short, but notoriously easy to get subtly wrong. The details that matter:

- **The range is inclusive:** `low` and `high` are both possible positions, so the loop runs **while `low <= high`**. With `<`, a target in the last remaining position is missed.
- **Move past `mid`:** set `low = mid + 1` or `high = mid - 1`. Setting `low = mid` can loop forever when `low` and `high` are next to each other.
- **Computing `mid`:** `low + Math.floor((high - low) / 2)` is the safe form. In languages with fixed-size integers, the obvious `(low + high) / 2` can overflow for very large arrays — a bug that famously sat unnoticed for years in widely used library implementations, including Java's. JavaScript numbers do not overflow at realistic array sizes, but the safe form is a good habit.

> [!WARNING]
> Binary search only works on **sorted** data, sorted by the same comparison you search with. Searching unsorted data returns wrong answers — not errors — which makes the bug hard to notice.

### Binary search beyond "find this value"

Binary search is really a tool for finding a **boundary** in anything ordered. A very useful variation finds the **first position where a condition becomes true**:

> **Problem:** Delivery fee bands start at these order totals: `[0, 100000, 250000, 500000]` (in paisa) with fees `[25000, 15000, 10000, 0]`. Which band does an order of 300,000 paisa fall into?

```ts
function bandIndex(bandStarts: number[], amount: number): number {
  // find the last band whose start is <= amount
  let low = 0;
  let high = bandStarts.length - 1;
  let answer = -1;
  while (low <= high) {
    const mid = low + Math.floor((high - low) / 2);
    if (bandStarts[mid]! <= amount) {
      answer = mid;        // this band works; is there a later one?
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return answer;
}

const bandStarts = [0, 100000, 250000, 500000];
const fees = [25000, 15000, 10000, 0];
for (const amount of [50000, 250000, 300000, 900000]) {
  console.log(amount, "->", fees[bandIndex(bandStarts, amount)]);
}
```

**Output:**

```text
50000 -> 25000
250000 -> 10000
300000 -> 10000
900000 -> 0
```

The search keeps the best answer found so far and continues looking right for a later band that still qualifies. This "find the last (or first) position satisfying a condition" pattern solves pricing bands, tax brackets, version lookups, and "the first day the stock ran out".

The same idea works on **things that are not arrays at all**, whenever you can ask "is it too big or too small?":

- **`git bisect`** ({{ch:errors-and-debugging}}) binary-searches through a project's history to find the commit that introduced a bug.
- **Capacity planning:** "what is the largest number of users this server handles without slowing down?" — test at a midpoint, then halve the range.
- **Database indexes** ({{ch:indexes}}) use tree-shaped versions of binary search to find rows among millions in a few steps.

## From beginner to enterprise: these techniques at every level

**Level 3 — Small programs.** Recursion over nested data; `sort` with correct compare functions; binary search over a sorted array.

**Level 4 — A real application.** Sorting by several keys for display; lookups in sorted reference data (bands, brackets) with binary search; recursive processing of categories and menus with sensible depth limits.

**Level 5 — Professional engineering.** Sorting is pushed into the database whenever data comes from there (`ORDER BY`, backed by indexes — {{ch:sql}}), because sorting in application memory means first loading everything. Engineers know which built-ins are stable, avoid deep recursion on untrusted input, and use memoisation where sub-problems repeat.

**Level 6 — Enterprise.** Sorting data far larger than memory with external merge sorts; merging sorted streams from many machines; distributed systems that partition data by key ranges and route lookups with binary-search-like logic; capacity and incident investigations using bisection over time and configuration.

## Real-world use cases

### Beginner level — Ranking students

**Situation:** list students by grade, and alphabetically within each grade.

**Solution:** one `toSorted` call with two keys combined using `||`.

### Intermediate level — Tax brackets

**Business problem:** a payroll system must find each employee's tax bracket from a sorted table of income thresholds.

**Solution:** binary search for the last threshold not exceeding the income.

**Why not a loop?** For a table of ten brackets, a loop is fine and arguably clearer. Binary search matters when the table is large or the lookup runs millions of times — choose based on n, as {{ch:big-o}} taught.

### Advanced level — A crash caused by recursion

**Business problem:** an API that accepts nested JSON filters ("this AND (that OR (other AND …))") crashes when an attacker sends a filter nested 50,000 levels deep.

**Cause:** the filter parser is recursive; deep nesting exhausts the call stack.

**Fix:** limit nesting depth at validation time ({{ch:validation}}) and reject anything deeper with a clear `400` error ({{ch:how-the-web-works}}).

### Enterprise level — Merging sorted logs

**Business problem (illustrative):** a platform with hundreds of servers needs one time-ordered view of their logs for incident investigation.

**Solution:** each server's log is already sorted by time; a **k-way merge** — merge sort's merge step generalised to k sorted inputs, using a heap ({{ch:trees-heaps-graphs}}) to pick the earliest next line — produces the combined, ordered stream in O(N log k) without loading everything into memory.

## Common mistakes

### Beginner mistake — Missing or unreachable base case

**What it looks like:** a recursive function that never stops, or whose recursive calls do not get closer to the base case.

**What happens:** `RangeError: Maximum call stack size exceeded`.

**How to fix it:** check that every call moves strictly towards the base case.

### Beginner mistake — Binary search on unsorted data

**What happens:** wrong answers with no error.

**How to fix it:** sort first, with the same comparison used for searching.

### Intermediate mistake — Off-by-one in binary search

**What it looks like:** `while (low < high)` with an inclusive range, or `low = mid` instead of `mid + 1`.

**What happens:** missed targets or infinite loops on small ranges.

**How to fix it:** use the standard inclusive template, and test with arrays of length 0, 1 and 2, and targets at both ends.

### Intermediate mistake — Saving the backtracking array instead of a copy

**What it looks like:** `results.push(chosen)` instead of `results.push([...chosen])`.

**What happens:** every saved result is the same array, which is empty by the end ({{ch:arrays}} — shared references).

### Production mistake — Recursion on unbounded input

**What it looks like:** recursive processing of user-supplied nested data, or recursion whose depth grows with the size of the data.

**How to prevent it:** depth limits; iterative versions with explicit stacks.

### Enterprise mistake — Sorting in the wrong place

**What it looks like:** loading every record from the database to sort it in JavaScript.

**How to prevent it:** sort, filter and limit in the database, where indexes make it efficient.

## Debugging and troubleshooting

| Symptom | Likely cause |
|---|---|
| `Maximum call stack size exceeded` | No base case, a base case never reached, or recursion depth proportional to large input |
| Recursive function very slow | Repeated sub-problems — add memoisation |
| Backtracking results all empty or identical | Saved a reference to the shared array instead of a copy |
| Binary search never ends | `low = mid` or `high = mid` without `+1`/`-1` |
| Binary search misses the last element | `while (low < high)` with an inclusive `high` |
| Sorted output scrambles equal items | An unstable sort, or sorting by keys in the wrong order |
| Numbers sorted like `10, 9, 100` | `sort()` without a compare function |

> [!TIP]
> To understand a recursive function, add a `depth` parameter and indent your log lines by it: `console.log("  ".repeat(depth) + "enter", n)`. The printed shape matches the call tree, showing exactly how calls nest and return.

## How a senior engineer thinks about recursion, sorting and searching

> [!SENIOR]
> - **Recursion for recursive shapes, loops for sequences.** And always ask: how deep can this go, and who controls that depth?
> - **Repeated sub-problems are a signal.** If a recursive solution recomputes things, remember them.
> - **Never write your own sort in production.** Use the built-in, with a correct, multi-key compare function — or better, let the database sort.
> - **Sorted data is an asset.** Keeping data sorted (or indexed) turns searches from O(n) into O(log n). That idea runs from binary search to database indexes.
> - **Bisection is a debugging superpower.** Halving the space — of code, commits, configurations or load levels — finds problems fast.

## Exercises

### Exercise 1 — Recursive folder size

**Objective:** practise designing a recursive function with the leap of faith.

**What to build:** given `type Entry = { name: string; sizeBytes?: number; children?: Entry[] }` — files have `sizeBytes`, folders have `children` — write `totalSize(entry)`.

<details>
<summary>Show the solution</summary>

```ts
type Entry = { name: string; sizeBytes?: number; children?: Entry[] };

function totalSize(entry: Entry): number {
  if (entry.children === undefined) {
    return entry.sizeBytes ?? 0;                        // base case: a file
  }
  return entry.children.reduce((sum, child) => sum + totalSize(child), 0);
}

const project: Entry = {
  name: "shop",
  children: [
    { name: "README.md", sizeBytes: 1_200 },
    { name: "src", children: [
      { name: "index.ts", sizeBytes: 3_400 },
      { name: "pricing", children: [{ name: "fees.ts", sizeBytes: 2_100 }] },
    ] },
    { name: "empty-folder", children: [] },
  ],
};

console.log(totalSize(project));
```

**Output:**

```text
6700
```

Walkthrough:

- Base case: a file's size is its `sizeBytes`.
- Recursive case: a folder's size is the sum of its children's sizes — trusting `totalSize` for each child, whatever it contains.
- An empty folder sums nothing and gives 0.

**Common wrong approach:** handling only two levels with nested loops. Real folder trees can be any depth; recursion handles all of them.

</details>

### Exercise 2 — All subsets

**Objective:** practise backtracking.

**What to build:** `subsets(items)` returning every subset (including the empty one) of an array of distinct strings. For `["cap", "belt", "socks"]` there are 8.

<details>
<summary>Show the solution</summary>

```ts
function subsets(items: string[]): string[][] {
  const results: string[][] = [];
  const current: string[] = [];

  function explore(start: number): void {
    results.push([...current]);
    for (let i = start; i < items.length; i++) {
      current.push(items[i]!);
      explore(i + 1);
      current.pop();
    }
  }

  explore(0);
  return results;
}

console.log(subsets(["cap", "belt", "socks"]));
```

**Output:**

```text
[
  [],
  [ 'cap' ],
  [ 'cap', 'belt' ],
  [ 'cap', 'belt', 'socks' ],
  [ 'cap', 'socks' ],
  [ 'belt' ],
  [ 'belt', 'socks' ],
  [ 'socks' ]
]
```

Walkthrough:

- Every state of `current` is itself a valid subset, so it is saved (as a copy) on entry.
- For each item from `start` onwards: choose it, explore further, undo.
- n items produce 2ⁿ subsets — 8 for 3 items — so this is O(2ⁿ) and only practical for small n.

**Common wrong approach:** `results.push(current)` without copying, giving eight references to the same (finally empty) array.

</details>

### Exercise 3 — First occurrence

**Objective:** practise binary-search boundaries.

**What to build:** `firstIndexOf(sorted, target)` returning the index of the **first** occurrence of `target` in a sorted array with duplicates, or −1. For `[1, 2, 2, 2, 3, 5]` and 2, return 1.

<details>
<summary>Show the solution</summary>

```ts
function firstIndexOf(sorted: number[], target: number): number {
  let low = 0;
  let high = sorted.length - 1;
  let found = -1;
  while (low <= high) {
    const mid = low + Math.floor((high - low) / 2);
    if (sorted[mid]! === target) {
      found = mid;        // a match — but there may be an earlier one
      high = mid - 1;     // keep searching left
    } else if (sorted[mid]! < target) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return found;
}

console.log(firstIndexOf([1, 2, 2, 2, 3, 5], 2), firstIndexOf([1, 2, 2, 2, 3, 5], 4), firstIndexOf([], 1));
```

**Output:**

```text
1 -1 -1
```

Walkthrough:

- On a match, record it but **continue searching the left half**, because an earlier match may exist.
- The loop still halves the range each time: O(log n), even with many duplicates.
- An empty array never enters the loop and returns −1.

**Common wrong approach:** finding any match with normal binary search, then walking left one step at a time. With a million duplicates, that walk is O(n).

</details>

### Exercise 4 — Fix the merge (debugging)

**Objective:** practise finding a subtle bug in a divide-and-conquer algorithm.

**The scenario:** a colleague's merge function sometimes drops items:

```ts
function brokenMerge(left: number[], right: number[]): number[] {
  const result: number[] = [];
  let i = 0;
  let j = 0;
  while (i < left.length && j < right.length) {
    if (left[i]! < right[j]!) {
      result.push(left[i++]!);
    } else {
      result.push(right[j++]!);
    }
  }
  return result;
}

console.log(brokenMerge([1, 4, 9], [2, 3]));
```

**What to do:** run it, explain what is missing, fix it — and also explain a second, quieter problem with `<`.

<details>
<summary>Show the solution</summary>

**Output of the original:**

```text
[ 1, 2, 3 ]
```

**Problem 1 — leftover items are dropped.** The loop stops as soon as **either** side runs out. Here, `right` runs out after 3, and `left` still holds `4` and `9`, which are never copied — two of the five items vanish silently. Any items left on one side after the other is exhausted must be appended.

**Problem 2 — stability.** Using `<` means that on a tie, the **right** item is taken first. Equal items from the left half (which came earlier in the original array) end up after equal items from the right half — the merge is no longer **stable**. With plain numbers you cannot see it; with records sorted by one field, the original order of ties is lost.

**Fixed version:**

```ts
function merge(left: number[], right: number[]): number[] {
  const result: number[] = [];
  let i = 0;
  let j = 0;
  while (i < left.length && j < right.length) {
    if (left[i]! <= right[j]!) {
      result.push(left[i++]!);
    } else {
      result.push(right[j++]!);
    }
  }
  while (i < left.length) result.push(left[i++]!);
  while (j < right.length) result.push(right[j++]!);
  return result;
}

console.log(merge([1, 4, 9], [2, 3]));
```

**Output:**

```text
[ 1, 2, 3, 4, 9 ]
```

**Lesson:** the bug only appeared when one side was exhausted first while the other still had items — an **edge case** the colleague's tests did not cover. Testing with uneven halves, empty halves and equal values ({{ch:problem-solving}}) would have found both problems.

</details>

## Summary

**Recursion** solves a problem by solving smaller versions of it. Every recursive function needs a **base case** and a **recursive case** that moves towards it. Each call takes a **stack frame**, so recursion uses stack space proportional to its depth; JavaScript's stack is limited, so use recursion when depth is naturally small and loops or explicit stacks when depth grows with input. Use the **leap of faith**: handle the base case, trust the recursive call on smaller input, and build on it. Add **memoisation** when sub-problems repeat. **Backtracking** explores choices — choose, explore, undo — and is O(2ⁿ) in the worst case, improved by **pruning**.

Sorting makes searching, de-duplication, ranges and merging easy. A **stable** sort keeps equal items in their original order; JavaScript's `sort` is stable. **Selection** and **insertion** sort are O(n²); insertion sort is fast on small or nearly sorted data. **Merge sort** divides, sorts halves recursively and merges: O(n log n) always, stable, O(n) extra memory. **Quicksort** partitions around a pivot: O(n log n) on average, O(n²) worst case, not stable. Comparison sorts cannot beat O(n log n) in general. In practice, use the built-in sort with a correct multi-key compare function — or sort in the database.

**Binary search** finds values in sorted data in O(log n) by halving the range. Use an inclusive range with `low <= high`, move past `mid`, and compute `mid` safely. It also finds **boundaries** — the first or last position satisfying a condition — and the same halving idea powers `git bisect`, capacity testing and database indexes.

## Key terms

- **Recursion** — A function calling itself, directly or indirectly.
- **Base case** — The simplest case of a recursive problem, solved without further recursion.
- **Recursive case** — The part of a recursive function that reduces the problem and calls itself.
- **Recursive leap of faith** — Designing recursion by assuming the function already works on smaller inputs.
- **Recursive type** — A type defined in terms of itself, such as an array that can contain arrays of the same type.
- **Tail-call optimisation** — A compiler technique that lets certain recursive calls reuse stack space; not relied on in JavaScript.
- **Divide and conquer** — Splitting a problem into parts, solving them recursively, and combining the results.
- **Backtracking** — Exploring choices recursively, undoing each choice after exploring it.
- **Pruning** — Skipping choices that cannot lead to a valid solution.
- **Stable sort** — A sort that keeps equal items in their original relative order.
- **In-place algorithm** — An algorithm that rearranges data within the original structure using little extra memory.
- **Selection sort** — Repeatedly selecting the smallest remaining item and moving it into place; O(n²).
- **Insertion sort** — Inserting each item into its place within a growing sorted section; fast on small or nearly sorted data.
- **Merge sort** — A stable divide-and-conquer sort that sorts halves and merges them; O(n log n).
- **Merge (sorting)** — Combining two sorted lists into one sorted list in linear time.
- **Quicksort** — A divide-and-conquer sort that partitions data around a pivot; O(n log n) on average.
- **Pivot** — The element quicksort uses to split data into smaller and larger parts.
- **Partition** — Rearranging data so that items smaller than a pivot come before it and larger ones after.
- **Counting sort** — A non-comparison sort for small whole numbers that works by counting occurrences.
- **TimSort** — A hybrid of merge sort and insertion sort used by JavaScript engines and other languages.
- **External sorting** — Sorting data too large for memory by sorting chunks and merging them.
- **Linear search** — Checking items one by one; O(n).
- **Binary search** — Finding a target in sorted data by repeatedly halving the search range; O(log n).
- **k-way merge** — Merging k sorted inputs into one sorted output, usually with a heap.

## What comes next

You have met dynamic programming twice already — memoising the staircase problem in this chapter and the expensive square function in {{ch:scope-and-closures}} — and **greedy** choices hidden in algorithms like Dijkstra's. In the next chapter, **Dynamic Programming and Greedy Algorithms**, you will learn both properly: how to recognise problems with overlapping sub-problems and solve them efficiently, how to build solutions from the bottom up with tables, when making the locally best choice at each step gives the best overall answer — and when it does not.
