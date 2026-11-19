# Coding Interview Patterns

> [!GOALS]
> - Why most people fail coding interviews — and why it is rarely because they did not know the algorithm.
> - How to read a problem's constraints as a hint about the expected solution.
> - A catalogue of the patterns most interview problems are built on, each with its "trigger" words, a template and a solved example.
> - How to recognise which pattern a new problem needs within a couple of minutes.
> - How a typical coding interview unfolds, minute by minute, and what interviewers are actually scoring.
> - What to do when you are stuck in front of someone.
> - How to practise so that the skills hold up under pressure.

## Why this matters

Most companies — from local software houses to international technology firms — include at least one **coding interview**: you are given a problem, an editor (or a whiteboard), and around 30 to 60 minutes, while an engineer watches and asks questions. Online coding tests, often the first filter for job applications, follow the same format without the watcher.

People fail these interviews mainly for three reasons — and only one of them is "did not know the algorithm":

1. **They did not recognise the pattern.** They read the problem, saw nothing familiar, and started writing loops, hoping something would emerge.
2. **They knew it but could not produce it cold.** They had read about binary search many times, but had never written one from an empty editor with the boundaries right, under a clock, with someone watching.
3. **They solved it silently.** The interviewer could not follow their thinking, could not give hints, and scored them down on communication.

This chapter targets all three. It does not try to cover every algorithm ever invented. It covers the **patterns that appear again and again**, teaches you to recognise them quickly, and shows you how to perform — think, code and talk — under the conditions of a real interview.

> [!NOTE]
> Be realistic about scope. For most backend and full-stack roles, interview problems are mostly **easy and medium** difficulty: arrays, strings, hash maps, two pointers, sliding windows, stacks, trees, graphs and simple dynamic programming. Very hard puzzles are rare outside a small number of companies. Being **fluent** at medium problems — solving them reliably, cleanly and while explaining — beats being shaky at hard ones.

## The simple idea

Expert chess players do not calculate every move from scratch. They have seen thousands of positions, and they **recognise** familiar shapes instantly: "this is a fork", "this is a pin". Recognition frees their attention for the parts that are genuinely new.

Coding interviews work the same way. There are perhaps a dozen core **patterns**. Each has recognisable **triggers** in the problem statement, a known **approach**, and a typical **cost**. Once you can recognise them, a "new" problem usually turns out to be a familiar pattern in new clothes.

> [!ANALOGY]
> Patterns are like recipes a cook knows by heart. Given unfamiliar ingredients, an experienced cook thinks, "This is basically a stir-fry", and adapts.
>
> **Where the analogy breaks:** a cook can taste and adjust as they go; in an interview, a pattern applied to the wrong problem can take you twenty minutes in the wrong direction. Recognition must be followed by **checking** — with small examples ({{ch:problem-solving}}) — that the pattern really fits.

## The proper definition and key words

- A **coding interview** is an assessment in which a candidate solves programming problems, usually while explaining their reasoning to an interviewer.
- An **online assessment** (OA) is a timed coding test taken alone, usually on a website, often scored automatically against hidden test cases.
- A **pattern** (in this context) is a reusable approach that solves a family of problems — such as "sliding window" or "BFS".
- A **trigger** is a word or feature of a problem that suggests a particular pattern.
- **Constraints** are the stated limits of the input — size, value ranges — which hint at the required complexity.

## Read the constraints first: the free hint

Problems in interviews and online tests usually state limits: "1 ≤ n ≤ 100,000", "values up to 10⁹", "the string has at most 20 characters". These are not decoration. Combined with the table from {{ch:big-o}}, they tell you how efficient your solution must be:

| Constraint on n | Expected complexity | Typical approaches |
|---|---|---|
| n ≤ 10 to 12 | O(n!) acceptable | try every ordering |
| n ≤ 20 to 25 | O(2ⁿ) | backtracking over subsets |
| n ≤ 500 | O(n³) | three nested loops; some DP |
| n ≤ 5,000 | O(n²) | nested loops; 2D DP |
| n ≤ 10⁵ to 10⁶ | O(n log n) or O(n) | sorting, hash maps, two pointers, sliding window, heap |
| n ≥ 10⁸, or values huge | O(log n) or O(1) | binary search, maths |

So "n ≤ 100,000" says: **the nested-loop brute force will be too slow; find an O(n log n) or O(n) approach.** "n ≤ 20" says: **exponential is fine; consider backtracking.** Reading constraints before thinking about solutions saves enormous time.

When an interviewer gives no constraints, **ask**: "How large can the input be?" That question alone signals experience.

## The pattern catalogue

Each pattern below has triggers, the core idea, its typical cost, and one representative problem solved in full. You met most of them in earlier chapters; here they are organised for recognition.

### Pattern 1 — Hash map lookups and counting

**Triggers:** "find a pair/duplicate", "how many times", "have we seen", "group by", "anagram", "first unique", anything where a nested loop compares each item with every other.

**Idea:** trade memory for time — remember what you have seen in a `Map` or `Set` so each check is O(1) ({{ch:arrays-strings-hash-maps}}).

**Typical cost:** O(n) time, O(n) space.

**Example — top k frequent items:** given a list of product IDs from orders, return the k most frequently ordered.

```ts
function topKFrequent(items: string[], k: number): string[] {
  const counts = new Map<string, number>();
  for (const item of items) counts.set(item, (counts.get(item) ?? 0) + 1);

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, k)
    .map(([item]) => item);
}

console.log(topKFrequent(["cap", "shirt", "cap", "belt", "shirt", "cap", "socks"], 2));
```

**Output:**

```text
[ 'cap', 'shirt' ]
```

Counting is O(n); sorting the distinct items is O(d log d) for d distinct items. When asked to improve, mention a size-k heap (O(d log k), {{ch:trees-heaps-graphs}}) or "bucket" counting by frequency (O(n)).

### Pattern 2 — Two pointers

**Triggers:** **sorted** array; "pair with a sum", "remove duplicates in place", "reverse", "palindrome", "merge two sorted lists", "container", comparing from both ends.

**Idea:** move two indexes towards each other (or in the same direction at different speeds), ruling out possibilities at each step ({{ch:arrays-strings-hash-maps}}).

**Typical cost:** O(n) time, O(1) space.

**Example — remove duplicates from a sorted array in place**, returning the count of unique values:

```ts
function dedupeSorted(values: number[]): number {
  if (values.length === 0) return 0;
  let write = 1;
  for (let read = 1; read < values.length; read++) {
    if (values[read] !== values[write - 1]) {
      values[write] = values[read]!;
      write++;
    }
  }
  return write;
}

const ids = [101, 101, 102, 105, 105, 105, 110];
const unique = dedupeSorted(ids);
console.log(unique, ids.slice(0, unique));
```

**Output:**

```text
4 [ 101, 102, 105, 110 ]
```

`read` scans every element; `write` marks where the next unique value goes. Because the array is sorted, duplicates are adjacent, so comparing with the last written value is enough.

### Pattern 3 — Sliding window

**Triggers:** "contiguous subarray/substring", "longest/shortest … such that", "at most k", "in every window of size k", "consecutive days".

**Idea:** maintain a window over the data, updating its state as elements enter on the right and leave on the left, instead of recomputing ({{ch:arrays-strings-hash-maps}}).

**Typical cost:** O(n) time.

**Example — shortest run of consecutive days whose sales reach a target:**

```ts
function shortestRunReaching(sales: number[], target: number): number {
  let best = Infinity;
  let windowSum = 0;
  let left = 0;
  for (let right = 0; right < sales.length; right++) {
    windowSum += sales[right]!;
    while (windowSum >= target) {
      best = Math.min(best, right - left + 1);
      windowSum -= sales[left]!;
      left++;
    }
  }
  return best === Infinity ? 0 : best;
}

console.log(shortestRunReaching([2, 3, 1, 2, 4, 3], 7));
```

**Output:**

```text
2
```

The window grows to the right until it reaches the target, then shrinks from the left as far as it can while still reaching it, recording the shortest length. Here, `[4, 3]` reaches 7 in two days. (This works because sales are non-negative; with negative numbers, shrinking might be wrong, and prefix sums are needed instead.)

### Pattern 4 — Prefix sums

**Triggers:** "sum of a range", "many queries", "subarray sums to k", "running total", "product of all except".

**Idea:** precompute cumulative totals so any range can be answered by subtraction ({{ch:arrays-strings-hash-maps}}). Combined with a hash map, prefix sums count subarrays with a given sum even when values are negative.

**Typical cost:** O(n) to build, O(1) per range query.

**Example — count subarrays that sum to exactly k** (values may be negative):

```ts
function countSubarraysWithSum(values: number[], k: number): number {
  const seenPrefixCounts = new Map<number, number>([[0, 1]]);
  let prefix = 0;
  let count = 0;
  for (const value of values) {
    prefix += value;
    count += seenPrefixCounts.get(prefix - k) ?? 0;
    seenPrefixCounts.set(prefix, (seenPrefixCounts.get(prefix) ?? 0) + 1);
  }
  return count;
}

console.log(countSubarraysWithSum([1, 2, 3, -2, 2], 3));
```

**Output:**

```text
4
```

The insight: a subarray from position i to j sums to k exactly when `prefix[j] − prefix[i] = k`, that is, when an earlier prefix equal to `prefix[j] − k` exists. Counting how many earlier prefixes had each value — the Two Sum idea from {{ch:problem-solving}} applied to prefix sums — finds all such subarrays in one pass. (The four subarrays are `[1, 2]`, `[3]`, `[2, 3, -2]` and `[3, -2, 2]` — check them by hand as practice.)

### Pattern 5 — Binary search

**Triggers:** **sorted** input; "find the position/first/last"; "minimum value such that…", "maximum capacity that still works"; O(log n) requirements; huge numeric ranges.

**Idea:** halve the range each step ({{ch:recursion-sorting-searching}}). The advanced form — **binary search on the answer** — searches over possible answers rather than array positions, whenever "does answer X work?" is easy to check and the answers are ordered.

**Typical cost:** O(log n), or O(log range × cost of checking).

**Example — the smallest van capacity that delivers all parcels within d trips**, with parcels loaded in order:

```ts
function tripsNeeded(parcels: number[], capacity: number): number {
  let trips = 1;
  let load = 0;
  for (const weight of parcels) {
    if (load + weight > capacity) {
      trips++;
      load = 0;
    }
    load += weight;
  }
  return trips;
}

function smallestCapacity(parcels: number[], maxTrips: number): number {
  let low = Math.max(...parcels);                     // must carry the heaviest parcel
  let high = parcels.reduce((sum, w) => sum + w, 0);  // everything in one trip
  while (low < high) {
    const mid = low + Math.floor((high - low) / 2);
    if (tripsNeeded(parcels, mid) <= maxTrips) {
      high = mid;          // mid works; try smaller
    } else {
      low = mid + 1;       // mid too small
    }
  }
  return low;
}

console.log(smallestCapacity([10, 20, 30, 40, 50], 3));
```

**Output:**

```text
60
```

Walkthrough:

- The answer lies between the heaviest parcel (50) and the total (150).
- For a candidate capacity, `tripsNeeded` checks greedily how many trips are required — O(n).
- Larger capacities never need more trips, so the answers are **ordered**: binary search finds the smallest capacity that works. With capacity 60, the trips are [10, 20, 30], [40], [50] — three trips.
- This version uses `low < high` with `high = mid`, a standard template for "find the first value that works" — note how it differs from the exact-match template in {{ch:recursion-sorting-searching}}, and be consistent within each problem.

### Pattern 6 — Stacks

**Triggers:** matching brackets; "valid"; "next greater element"; "most recent"; "undo"; evaluating expressions; nested structures.

**Idea:** keep unresolved items on a stack; resolve them in last-in-first-out order ({{ch:linked-lists-stacks-queues}}). A **monotonic stack** — kept in increasing or decreasing order — answers "next greater/smaller" questions in O(n).

**Example — days until a warmer temperature** (for each day, how many days until a warmer one; 0 if none):

```ts
function daysUntilWarmer(temps: number[]): number[] {
  const answer = new Array<number>(temps.length).fill(0);
  const waiting: number[] = [];   // indexes of days still waiting, temperatures decreasing
  for (let day = 0; day < temps.length; day++) {
    while (waiting.length > 0 && temps[day]! > temps[waiting.at(-1)!]!) {
      const colderDay = waiting.pop()!;
      answer[colderDay] = day - colderDay;
    }
    waiting.push(day);
  }
  return answer;
}

console.log(daysUntilWarmer([30, 28, 32, 31, 29, 35]));
```

**Output:**

```text
[ 2, 1, 3, 2, 1, 0 ]
```

Each day is pushed once and popped at most once: O(n), instead of the O(n²) "look ahead from every day" brute force.

### Pattern 7 — Linked list pointer techniques

**Triggers:** "linked list"; "reverse"; "cycle"; "middle"; "k-th from the end"; "merge".

**Idea:** careful reference manipulation; often **fast and slow pointers** ({{ch:linked-lists-stacks-queues}}): the fast one moves two steps for each step of the slow one — to detect cycles or find the middle.

**Typical cost:** O(n) time, O(1) space. (Examples: reversal and cycle detection in {{ch:linked-lists-stacks-queues}}.)

### Pattern 8 — Trees: depth-first recursion

**Triggers:** "binary tree"; "depth/height"; "path sum"; "is it balanced/symmetric"; "lowest common ancestor"; "validate a BST"; anything over nested structures.

**Idea:** the recursive leap of faith ({{ch:recursion-sorting-searching}}): compute the answer for a node from its children's answers.

**Example — is a binary tree a valid binary search tree?**

```ts
type TreeNode = { value: number; left: TreeNode | null; right: TreeNode | null };

function isValidBst(node: TreeNode | null, min = -Infinity, max = Infinity): boolean {
  if (node === null) return true;
  if (node.value <= min || node.value >= max) return false;
  return isValidBst(node.left, min, node.value) && isValidBst(node.right, node.value, max);
}

const leaf = (value: number): TreeNode => ({ value, left: null, right: null });
const good: TreeNode = { value: 50, left: { value: 30, left: leaf(20), right: leaf(40) }, right: leaf(70) };
const bad: TreeNode = { value: 50, left: { value: 30, left: leaf(20), right: leaf(60) }, right: leaf(70) };

console.log(isValidBst(good), isValidBst(bad));
```

**Output:**

```text
true false
```

The common mistake is checking only each node against its **direct** children. In `bad`, 60 is greater than its parent 30 — locally fine — but it sits in 50's **left** subtree, where everything must be below 50. Passing down an allowed range (`min`, `max`) catches it. This "pass constraints down the recursion" idea solves many tree problems.

### Pattern 9 — Graphs: BFS and DFS (including grids)

**Triggers:** "network", "connected", "islands", "shortest path", "fewest steps", "dependencies", "can you reach", **grids** of cells.

**Idea:** BFS with a queue for fewest steps; DFS for exploring and connectivity; a visited set always ({{ch:trees-heaps-graphs}}). A **grid** is a graph in disguise: each cell is a vertex, connected to its up, down, left and right neighbours.

**Example — count islands** (groups of connected land cells `"#"` in a map of water `"."`):

```ts
function countIslands(map: string[]): number {
  const rows = map.length;
  const cols = map[0]?.length ?? 0;
  const seen = new Set<string>();
  let islands = 0;

  function explore(r: number, c: number): void {
    const stack: [number, number][] = [[r, c]];
    while (stack.length > 0) {
      const [row, col] = stack.pop()!;
      const key = `${row},${col}`;
      if (row < 0 || col < 0 || row >= rows || col >= cols) continue;
      if (map[row]![col] !== "#" || seen.has(key)) continue;
      seen.add(key);
      stack.push([row + 1, col], [row - 1, col], [row, col + 1], [row, col - 1]);
    }
  }

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (map[r]![c] === "#" && !seen.has(`${r},${c}`)) {
        islands++;
        explore(r, c);
      }
    }
  }
  return islands;
}

console.log(countIslands([
  "##...",
  "##..#",
  "....#",
  ".#...",
]));
```

**Output:**

```text
3
```

Each time an unvisited land cell is found, that starts a new island, and a DFS (here with an explicit **stack**, avoiding deep recursion) marks every connected land cell as seen. Every cell is visited a constant number of times: O(rows × cols). Real uses include grouping connected regions on maps, finding clusters in images, and flood-fill tools in drawing programs.

### Pattern 10 — Heaps for "top k" and "next best"

**Triggers:** "k largest/smallest", "k closest", "median of a stream", "merge k sorted lists", "always process the cheapest/most urgent next".

**Idea:** a heap keeps the best candidate available in O(log n) per operation ({{ch:trees-heaps-graphs}}); a size-k heap keeps the top k in O(n log k).

### Pattern 11 — Backtracking

**Triggers:** "all combinations/permutations/subsets", "generate every", "place N items so that…", small n (≤ 20).

**Idea:** choose, explore, undo — with pruning ({{ch:recursion-sorting-searching}}).

**Typical cost:** exponential; acceptable only for small inputs.

### Pattern 12 — Dynamic programming

**Triggers:** "number of ways", "minimum/maximum cost", "longest/shortest … subsequence", "can you reach/make", choices at each step whose best combination is wanted; a recursive brute force that repeats sub-problems.

**Idea:** define the state, write the recurrence, fill a table or memoise ({{ch:dynamic-programming-greedy}}).

**Example — the maximum total of any contiguous run of daily profits** (profits may be negative):

```ts
function maxRunProfit(profits: number[]): number {
  let bestEndingHere = profits[0]!;
  let best = profits[0]!;
  for (let i = 1; i < profits.length; i++) {
    bestEndingHere = Math.max(profits[i]!, bestEndingHere + profits[i]!);
    best = Math.max(best, bestEndingHere);
  }
  return best;
}

console.log(maxRunProfit([-2, 1, -3, 4, -1, 2, 1, -5, 4]));
```

**Output:**

```text
6
```

The state is "the best total of a run **ending at day i**": either day i alone, or day i added to the best run ending the day before. Only the previous state is needed, so memory is O(1). This one-pass DP is known as **Kadane's algorithm**; here, the best run is `[4, -1, 2, 1]`, totalling 6.

### Pattern 13 — Intervals: sort, then sweep

**Triggers:** "intervals", "meetings", "bookings", "overlapping", "merge ranges", "minimum rooms".

**Idea:** sort by start (or end) time, then sweep through once, comparing each interval with the previous ({{ch:dynamic-programming-greedy}} — greedy scheduling).

**Example — merge overlapping booking times:**

```ts
function mergeIntervals(intervals: [number, number][]): [number, number][] {
  const sorted = intervals.toSorted((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  for (const [start, end] of sorted) {
    const last = merged.at(-1);
    if (last && start <= last[1]) {
      last[1] = Math.max(last[1], end);    // overlaps: extend
    } else {
      merged.push([start, end]);           // gap: start a new interval
    }
  }
  return merged;
}

console.log(mergeIntervals([[9, 10], [13, 15], [9.5, 11], [14, 16], [17, 18]]));
```

**Output:**

```text
[ [ 9, 11 ], [ 13, 16 ], [ 17, 18 ] ]
```

After sorting, overlapping intervals are adjacent, so one comparison with the last merged interval is enough. O(n log n) for the sort, O(n) for the sweep. Real uses: calendar availability, merging maintenance windows, combining time ranges in logs.

## Recognising the pattern quickly

### Level 4 — A recognition checklist

When you read a new problem, run through these questions in order — usually within two minutes:

```text
  1. What are the constraints?        -> the target complexity
  2. Is the input sorted?             -> two pointers, binary search
  3. Contiguous subarray/substring?   -> sliding window, prefix sums
  4. Pairs, duplicates, counts?       -> hash map / set
  5. "Most recent", nesting, next greater? -> stack
  6. Tree or nested structure?        -> recursive DFS
  7. Network, grid, dependencies?     -> BFS (fewest steps) / DFS (structure)
  8. Top k, closest k, merge k?       -> heap
  9. All combinations, n small?       -> backtracking
 10. Count ways / min / max with choices? -> dynamic programming (or greedy, if proven)
 11. Intervals or schedules?         -> sort, then sweep
```

Once a pattern seems to fit, **check it** against a small example before writing code ({{ch:problem-solving}}). If it does not fit, move down the list.

## How a coding interview unfolds

### Level 5 — The shape of a 45-minute interview

Interviews vary, but most follow a shape like this:

| Phase | Roughly | What you should be doing |
|---|---|---|
| Introductions | 2–5 min | Brief, friendly, clear ({{ch:small-talk}}) |
| Problem statement | 2 min | Listen; restate the problem in your own words |
| Clarifying questions | 3–5 min | Inputs, outputs, edge cases, constraints ({{ch:problem-solving}}) |
| Approach | 5–10 min | Brute force first, its cost; then a better idea; agree with the interviewer before coding |
| Coding | 15–20 min | Clean, readable code; narrate the main steps |
| Testing | 5 min | Trace a normal example and edge cases; fix bugs calmly |
| Follow-ups | remaining | Complexity, improvements, "what if the data didn't fit in memory?" |
| Your questions | last few min | Ask something genuine about the team or work |

### What interviewers are actually scoring

Interviewers usually score several separate things, often on a written form:

1. **Problem understanding** — did you clarify before coding?
2. **Problem solving** — did you reach a working approach, consider alternatives, and improve it?
3. **Code quality** — is it correct, readable, well named, reasonably organised ({{ch:clean-code}})?
4. **Testing** — did you check your own code, including edge cases, before being asked?
5. **Communication** — could they follow your reasoning; did you respond well to hints?
6. **Complexity analysis** — can you state and justify time and space costs?

A candidate who reaches an optimal solution silently, with messy code and no testing, can score lower than one who reaches a good-but-not-optimal solution with clear reasoning, clean code and careful testing. **The process is graded, not only the answer.**

### Communicating while you code

Use the five-step script from {{ch:problem-solving}}, out loud. A few phrases that help:

- "Let me make sure I understand: …"
- "Before I code, can I ask — what should happen if the list is empty?"
- "The brute force would be to … which is O(n²). Given n can be 100,000, that's too slow, so I'm thinking of …"
- "I'll start with the main loop and handle the edge cases after."
- "Let me trace this with the example to check it."
- "I'm not sure about this boundary; let me test it with a two-element array."

Talk about **decisions**, not every keystroke. Silence while you think for a moment is fine — say "Let me think about this for a moment" first, so the silence is understood. Part XV develops this skill in depth ({{ch:talking-about-code}}, {{ch:interview-under-pressure}}).

### Taking hints well

Interviewers often give hints — "What if the array were sorted?", "Is there a data structure that gives faster lookups?" A hint is not a failure; how you **use** it is scored. Listen, acknowledge it ("That's a good point — if it were sorted, I could use two pointers…"), and build on it. Ignoring hints, or arguing with them, is far worse than needing one.

## When you are stuck in front of someone

Everyone gets stuck sometimes. What you do next matters more than the fact that it happened.

1. **Say so, calmly, and say where.** "I'm stuck on how to avoid checking every pair."
2. **Go back to a small example** and solve it by hand, out loud ({{ch:problem-solving}}).
3. **Write the brute force.** A working slow solution beats an unfinished fast one, and often reveals the repeated work to remove.
4. **Run the recognition checklist** again, explicitly.
5. **Ask a targeted question.** "Would it be acceptable to use extra memory here?" is a good question; "Can you tell me the answer?" is not.
6. **Keep going.** Partial progress, clearly reasoned, earns credit.

## Testing your own code before you are asked

Experienced candidates test without being prompted. A quick routine:

1. **Trace the main example** line by line, writing variable values as you go ({{ch:loops}}).
2. **Run the edge cases**: empty input, one element, all equal, already sorted, negative numbers, the maximum size.
3. **Re-read the code** for typical slips: off-by-one boundaries, `<` versus `<=`, forgetting to return, mutating the input when you should not.
4. **State the complexity**, time and space, and the reason.

Finding and fixing your own bug in front of the interviewer is a **positive** signal: it shows exactly the habits a team wants.

## How to practise

### Level 6 — Practice that transfers to the real thing

Practice works only if it resembles the test. A few principles make it effective:

- **Practise by pattern, then mixed.** First solve several problems of one pattern until it feels natural; then practise mixed sets, where recognising the pattern is part of the challenge — as in real interviews.
- **Practise without help.** No AI assistance and no peeking at solutions during an attempt ({{ch:learning-and-ai}}). An interview is unaided; a problem you solved with help is a problem you have not yet solved.
- **Use the twenty-minute rule.** Make a genuine attempt first. If you read a solution afterwards, close it and write your own version from an empty editor — then solve the same problem again a few days later, cold. That second, unaided solve is the one that counts.
- **Speak out loud** while practising, even alone. Talking while thinking is a separate skill that only improves with practice.
- **Time yourself.** Aim for medium problems in about 25 to 35 minutes including testing.
- **Keep a short log** of problems you could not solve: the problem, the pattern you missed, and the key insight. Review it periodically. Patterns you keep missing are your best guide to what to practise next.
- **Do mock interviews** with another person when you can. Being watched changes how your mind works; it gets much easier with exposure.
- **Prefer understanding to quantity.** Fifty problems truly understood — solvable cold and explainable — beat two hundred skimmed solutions.

Popular practice platforms offer large problem collections sorted by pattern and difficulty. Use them, but remember that the goal is the patterns and the process, not memorising specific answers.

## From beginner to enterprise: patterns beyond interviews

These patterns are not only interview tricks. In real work:

- **Hash maps** turn slow joins and duplicate checks into fast ones ({{ch:big-o}}).
- **Sliding windows** implement rate limits and moving averages ({{ch:rate-limiting}}, {{ch:monitoring}}).
- **Prefix sums** make reporting over ranges fast.
- **Binary search on the answer** sizes capacity — servers, batch sizes, timeouts.
- **Heaps** schedule jobs and power "top N" dashboards.
- **BFS and DFS** resolve dependencies, compute reachability in permission systems and find impact in service graphs.
- **Interval merging** computes availability and maintenance windows.
- **Dynamic programming** compares texts and versions ({{ch:git}}).

The interview is a compressed test of thinking you will use for the rest of your career.

## Real-world use cases

### Beginner level — An online assessment

**Situation:** a job application includes a 90-minute online test with three problems and hidden test cases.

**Approach:** read every problem and its constraints first; solve the easiest first; for each, write a brute force if needed to secure partial credit, then improve; test edge cases yourself, because hidden tests always include them.

### Intermediate level — A "new" problem that was a known pattern

**Situation:** asked to find "the longest period during which a sensor's reading never varied by more than 5 units", a candidate initially tries nested loops.

**Recognition:** "longest contiguous period … such that" — a **sliding window** (with a structure to track the window's minimum and maximum). Recognising the pattern turns an O(n²) attempt into an O(n) solution.

### Advanced level — A follow-up about scale

**Situation:** after solving "top k frequent words", the interviewer asks: "What if the words don't fit in memory?"

**A strong answer:** count words in chunks — or split them by hashing each word to one of several files so identical words land in the same file ({{ch:arrays-strings-hash-maps}}) — count each file separately, keep a size-k heap of the best candidates from each, and merge. This shows that the patterns extend to systems — exactly the bridge to system design ({{ch:system-design-fundamentals}}).

### Enterprise level — Interviewing others

**Situation:** as an experienced engineer, you will one day interview candidates yourself.

**Lesson:** you will look for the same things described here — clarification, reasoning, clean code, testing and communication — and you will learn that a candidate's **process** predicts their day-to-day work far better than whether they had memorised a particular trick.

## Common mistakes

### Beginner mistake — Coding before understanding

**What it looks like:** typing within a minute of hearing the problem.

**What happens:** solving the wrong problem; restarting under time pressure.

**How to fix it:** restate, ask, work an example, then plan.

### Beginner mistake — Silence

**What it looks like:** ten minutes of quiet typing.

**What happens:** the interviewer cannot assess or help you.

**How to fix it:** narrate decisions; announce pauses.

### Intermediate mistake — Ignoring constraints

**What it looks like:** an O(n²) solution for n = 100,000, discovered only when the interviewer asks.

**How to fix it:** read constraints first and state the target complexity before choosing an approach.

### Intermediate mistake — Not testing

**What it looks like:** "I think that's it" without tracing any input.

**How to fix it:** always trace one example and the edge cases.

### Production mistake — Memorising instead of understanding

**What it looks like:** reproducing a remembered solution that breaks the moment the problem changes slightly.

**How to prevent it:** for every pattern, be able to explain **why** it works and when it does not apply.

### Enterprise mistake — Treating interviews as purely technical

**What it looks like:** brilliant code delivered dismissively, with no collaboration.

**What happens:** "strong technically, but would they be good to work with?" — a common reason for rejection.

**How to prevent it:** treat the interviewer as a future colleague; collaborate.

## How a senior engineer thinks about coding interviews

> [!SENIOR]
> - **Constraints first, pattern second, code third.**
> - **Brute force is a step, not a failure.** It proves understanding and shows the path to improvement.
> - **The interview is a collaboration.** Clarify, explain, accept hints, and test — exactly as at work.
> - **Fluency comes from unaided repetition.** Recognition and boundary-perfect code are built by solving problems cold, many times, out loud.
> - **Every pattern has a real-world twin.** Understanding where each one appears in production makes them easier to remember — and gives you better answers to follow-up questions.

## Exercises

These exercises are practice in **recognition** and **performance**. For each, before coding: state the constraints you would assume, name the pattern, and say the target complexity. Then solve it out loud, as if in an interview.

### Exercise 1 — Name the pattern

**What to do:** for each problem, name the pattern and the target complexity. Do not code.

1. Given a string, find the length of the longest substring containing at most two distinct characters.
2. Given a list of tasks with dependencies, find an order to run them, or report that it is impossible.
3. Given sorted prices, find whether any two add up to a gift card's value, using O(1) extra memory.
4. Given daily temperatures, for each day find how many days until a colder one.
5. Given a list of words, group together those that are anagrams.
6. Given a grid of open and blocked cells, find the fewest moves from the top-left to the bottom-right.
7. Given a list of meeting times, find the minimum number of rooms needed.
8. Given coin values and an amount, count the ways to make the amount.

<details>
<summary>Show the solution</summary>

1. **Sliding window** with a map of character counts — "longest substring … such that". O(n).
2. **Graph DFS — topological sort** with cycle detection ({{ch:trees-heaps-graphs}}). O(V + E).
3. **Two pointers** — sorted input, pair sum, constant memory. O(n).
4. **Monotonic stack** — "next smaller". O(n).
5. **Hash map grouping** with sorted letters as the key. O(n × m log m) for n words of length m.
6. **BFS on a grid** — "fewest moves". O(rows × columns).
7. **Intervals: sort and sweep** — sort start and end times (or use a min-heap of end times) and track how many meetings overlap at once. O(n log n).
8. **Dynamic programming** — counting combinations ({{ch:dynamic-programming-greedy}}). O(amount × number of coins).

**Lesson:** each problem's wording contained its trigger — "longest substring", "dependencies", "sorted … pair", "next colder", "group", "fewest moves", "meeting times", "count the ways".

</details>

### Exercise 2 — Minimum meeting rooms

**Objective:** practise the interval pattern under interview conditions.

**What to build:** `minRooms(meetings)` returning the minimum number of rooms needed so that no two overlapping meetings share a room. Meetings are `[start, end]` pairs; a meeting ending at 10 and another starting at 10 do not overlap.

<details>
<summary>Show the solution</summary>

```ts
function minRooms(meetings: [number, number][]): number {
  const starts = meetings.map(([start]) => start).toSorted((a, b) => a - b);
  const ends = meetings.map(([, end]) => end).toSorted((a, b) => a - b);

  let rooms = 0;
  let maxRooms = 0;
  let e = 0;
  for (const start of starts) {
    while (e < ends.length && ends[e]! <= start) {
      rooms--;      // a meeting finished before this one starts: free its room
      e++;
    }
    rooms++;        // this meeting needs a room
    maxRooms = Math.max(maxRooms, rooms);
  }
  return maxRooms;
}

console.log(minRooms([[9, 10], [9.5, 11], [10, 12], [11, 12.5]]));
console.log(minRooms([]));
```

**Output:**

```text
2
0
```

Walkthrough:

- Sort start times and end times separately. Sweep through the starts; before counting each new meeting, free every room whose meeting has already ended (`end <= start`, so back-to-back meetings share).
- The maximum number of rooms in use at any moment is the answer.
- O(n log n) for sorting, O(n) for the sweep.

**Common wrong approach:** using `<` instead of `<=` when freeing rooms, which counts back-to-back meetings as overlapping. Clarify such boundaries with the interviewer **before** coding.

</details>

### Exercise 3 — A timed mock

**Objective:** practise performance, not just correctness.

**What to do:** set a timer for 30 minutes. Solve the following out loud, following the interview shape in this chapter: restate, clarify (write your assumptions), brute force and its cost, better approach, code, trace, edge cases, complexity.

> Given an array of numbers, return an array where each element is the product of all the **other** elements, without using division, in O(n) time.

<details>
<summary>Show the solution</summary>

**Clarifications you might state:** the array has at least two elements; numbers can be zero or negative; results fit in normal numbers.

**Brute force:** for each position, multiply all other elements — O(n²).

**Better approach (prefix products — Pattern 4):** the product of everything except position i is (the product of everything **before** i) × (the product of everything **after** i). Compute both in two passes.

```ts
function productOfOthers(values: number[]): number[] {
  const result = new Array<number>(values.length).fill(1);

  let before = 1;
  for (let i = 0; i < values.length; i++) {
    result[i] = before;
    before *= values[i]!;
  }

  let after = 1;
  for (let i = values.length - 1; i >= 0; i--) {
    result[i]! *= after;
    after *= values[i]!;
  }
  return result;
}

console.log(productOfOthers([2, 3, 4, 5]));
console.log(productOfOthers([2, 0, 4]));
```

**Output:**

```text
[ 60, 40, 30, 24 ]
[ 0, 8, 0 ]
```

**Trace (first example):** after the first pass, `result` holds products before each position: `[1, 2, 6, 24]`. The second pass multiplies by products after each position: `[60, 20, 5, 1]`, giving `[60, 40, 30, 24]`.

**Edge cases:** a zero is handled naturally — and this is exactly why "without division" matters: dividing the total product by each element breaks when an element is zero.

**Complexity:** O(n) time; O(1) extra space besides the output.

**Self-assessment:** did you clarify zero? State the brute force? Trace? State complexity? Each is scored separately in a real interview.

</details>

### Exercise 4 — Debug under pressure

**Objective:** practise finding your own bug calmly.

**The scenario:** in an interview, you wrote this to find the length of the longest run of consecutive equal values. The interviewer says, "Try it with `[1, 1, 2, 2, 2]`."

```ts
function longestRun(values: number[]): number {
  let best = 0;
  let current = 1;
  for (let i = 1; i < values.length; i++) {
    if (values[i] === values[i - 1]) {
      current++;
    } else {
      best = Math.max(best, current);
      current = 1;
    }
  }
  return best;
}
```

**What to do:** trace it out loud, find the bug(s), fix them, and re-test including edge cases.

<details>
<summary>Show the solution</summary>

**Trace for `[1, 1, 2, 2, 2]`:**

```text
  i  values[i]  equal to previous?  current  best
  1  1          yes                 2        0
  2  2          no                  1        2
  3  2          yes                 2        2
  4  2          yes                 3        2
  end: return best = 2     (expected 3)
```

**Bug 1:** `best` is updated only when a run **ends** with a different value. The final run is never compared, so a longest run at the end is missed.

**Bug 2 (an edge case):** for an empty array, it returns 0 — correct — but for a single element `[7]`, it returns 0, while the longest run is 1.

**Fix:** compare after every step (or once more after the loop), and handle empty input explicitly:

```ts
function longestRun(values: number[]): number {
  if (values.length === 0) return 0;
  let best = 1;
  let current = 1;
  for (let i = 1; i < values.length; i++) {
    current = values[i] === values[i - 1] ? current + 1 : 1;
    best = Math.max(best, current);
  }
  return best;
}

console.log(longestRun([1, 1, 2, 2, 2]), longestRun([7]), longestRun([]), longestRun([3, 3, 1]));
```

**Output:**

```text
3 1 0 2
```

**What to say while fixing:** "My trace shows the last run is never compared, because I only update `best` when the value changes. I'll update it on every step instead. Let me also check a single element and an empty array…"

**Lesson:** "the last group is never processed" is one of the most common loop bugs ({{ch:loops}}). Tracing out loud found it in a minute — and doing so calmly in front of the interviewer is itself a strong signal.

</details>

## Summary

Coding interviews test **recognition**, **unaided production** and **communication**, not just algorithm knowledge. Read the **constraints** first: they reveal the target complexity. Learn the core **patterns** and their **triggers**: hash maps for lookups and counting; **two pointers** on sorted data; **sliding windows** for contiguous ranges; **prefix sums** for range totals and subarray counts; **binary search**, including on the answer; **stacks**, including monotonic stacks; linked-list pointer techniques; recursive **tree** DFS; graph and grid **BFS/DFS**; **heaps** for top-k; **backtracking** for small exhaustive searches; **dynamic programming** for optimal counts and costs; and **sort-then-sweep** for intervals. Run the recognition checklist, then verify the pattern on a small example.

A typical interview moves through introduction, clarification, approach, coding, testing and follow-ups. Interviewers score understanding, problem solving, code quality, testing, communication and complexity analysis — the **process**, not only the answer. Think out loud, take hints constructively, write the brute force when stuck, and test your own code before being asked. Practise by pattern and then mixed, unaided, out loud and timed, revisiting missed problems until you can solve them cold.

## Key terms

- **Coding interview** — An assessment in which a candidate solves programming problems while explaining their reasoning.
- **Online assessment (OA)** — A timed coding test taken alone, usually scored against hidden test cases.
- **Pattern (algorithmic)** — A reusable approach that solves a family of problems.
- **Trigger** — A word or feature in a problem that suggests a particular pattern.
- **Constraints (problem)** — The stated limits on input size and values, which indicate the required efficiency.
- **Hidden test cases** — Tests used to score a solution that the candidate cannot see, usually including edge cases.
- **Monotonic stack** — A stack kept in increasing or decreasing order, used for "next greater or smaller" problems.
- **Fast and slow pointers** — Two pointers moving at different speeds, used to find middles and detect cycles.
- **Binary search on the answer** — Binary searching over possible answers, using a check of whether each candidate works.
- **Kadane's algorithm** — A one-pass dynamic-programming method for the maximum sum of a contiguous subarray.
- **Sweep (line sweep)** — Processing sorted events or intervals in order while tracking a running state.
- **Mock interview** — A practice interview with another person playing the interviewer.

## What comes next

Part III is complete. You can now solve problems methodically, measure their cost, choose the right data structures and recognise the patterns that interviews test.

Part IV turns from **solving problems** to **writing software that lasts**. Code that works today must be read, changed and extended for years by many people. It begins with **Object-Oriented Programming**: the ideas of encapsulation, abstraction, inheritance and polymorphism that you met in {{ch:this-prototypes-classes}}, now developed into a way of designing whole programs — with honest attention to when they help and when they get in the way.
