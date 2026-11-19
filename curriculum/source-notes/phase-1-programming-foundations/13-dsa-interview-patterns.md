# Phase 1 — Chapter 13: DSA Interview Patterns

> **Target: 6,000 words · Core interview chapter · Week 1, then every Saturday for fifty weeks**
>
> You will sit coding tests from **week 5**, months before this plan's interview block.
> That is why the DSA drill runs from day one as a weekly rail rather than a block at the
> end. Sixty minutes every Saturday, AI-free, for fifty weeks. **215 problems.**

---

## Chapter Overview

Most people fail coding tests for one of three reasons, and only one of them is "did not
know the algorithm".

1. **They did not recognise the pattern.** They read a problem, saw nothing familiar, and
   started writing loops hoping something would emerge. Forty minutes later they had half
   a solution to a different problem.
2. **They knew it but could not produce it cold.** They have read about binary search a
   dozen times and have never written one from a blank editor with the boundary conditions
   right, under a clock, with someone watching.
3. **They solved it silently.** The interviewer had no idea what they were thinking, gave
   no hints because none seemed wanted, and scored them down on communication.

This chapter targets all three. Not by covering more algorithms — by covering **fewer,
properly**, and by drilling recognition until it is automatic.

**The honest scope.** You are a backend engineer targeting tier-2 Pakistani companies at
three years. You will be asked easy and medium problems, mostly arrays, strings, hash
maps, trees and simple dynamic programming. You will very rarely be asked anything
genuinely hard. Being *fluent* at medium beats being *shaky* at hard, and fluency is what
215 problems spread over a year produces.

**What "AI-free" means here and why it never changes.** The drill stays AI-free for all
fifty weeks — including after the unlock on 25 January — because an interview is AI-free.
A problem you solved with help is a problem you have not solved. You may read an editorial
*after* you have finished or genuinely given up, and then you re-attempt it from blank a
week later.

---

## Beginner Theory

### Complexity, said out loud

Before patterns, the vocabulary. You will be asked "what is the complexity?" after almost
every problem, and hesitating there undoes a correct solution.

| Notation | Means | Typical source |
|---|---|---|
| O(1) | constant | hash lookup, array index, arithmetic |
| O(log n) | halving | binary search, balanced tree descent |
| O(n) | one pass | a single loop, one traversal |
| O(n log n) | sort, or n × halving | sorting, heap of n items |
| O(n²) | nested pass | nested loops, comparing all pairs |
| O(2ⁿ) | branch per item | subsets, naive recursion without memo |

Two things people get wrong:

**Space includes the recursion stack.** A recursive tree traversal is O(h) space where h
is the height — O(log n) balanced, O(n) for a degenerate tree. Saying "O(1) space"
because you allocated nothing is wrong, and interviewers notice.

**The input, and the answer, are different sizes.** Generating all subsets of n items is
O(2ⁿ) *because the output is that big*, not because the algorithm is bad. There is no
faster way to produce 2ⁿ things.

**The habit to build from week 1:** every time you finish a problem, say aloud — "this is
O of n time because we pass over the array once, and O of n space because of the hash
map." Every time. By week 10 it is reflex.

### Reading the constraints — the free hint

Every problem statement tells you the intended complexity, and almost nobody reads it.

| n is up to | You need about | So the pattern is probably |
|---|---|---|
| 10–20 | O(2ⁿ) or O(n!) | backtracking, permutations |
| 100–500 | O(n³) | DP over pairs, Floyd-Warshall |
| 1,000–5,000 | O(n²) | nested loops, 2D DP |
| 10⁵–10⁶ | O(n log n) or O(n) | sorting, hashing, two pointers, sliding window |
| 10⁹ | O(log n) | binary search — on the answer, not the array |

If n ≤ 20, the exponential solution is the expected one and you should stop looking for a
clever linear trick. If n is 10⁹ you cannot even *build* the array, so the answer is
binary search or maths. **Read the constraints first, every time.** It converts a blank
page into a shortlist of two patterns.

---

## Basic Examples

### The method — the same five steps, every problem

The steps matter more than any algorithm in this chapter, because they are what an
interviewer is actually scoring.

**1. Restate the problem in your own words (30 seconds).**
Out loud. "So I have an array of integers that may contain duplicates, and I need to
return the indices of the two that sum to the target — and there is exactly one answer?"
This catches misreadings while they are still free, and it is the single clearest signal
that you engage with a problem rather than pattern-match at it.

**2. Ask about the edges (30 seconds).**
Can it be empty? Can there be negatives? Duplicates? Is it sorted? How big can it get?
Every one of those questions is also a hint to yourself: "is it sorted" is really you
checking whether two pointers or binary search are available.

**3. State the brute force, then say why it is not enough (1 minute).**
"The brute force is two nested loops, O(n²). With n up to 10⁵ that is 10¹⁰ operations, so
I need at least n log n." **Never skip this.** A brute force stated confidently is a
correct answer you can fall back to, and interviewers routinely fail candidates who
freeze while hunting for the optimal instead of banking the obvious one.

**4. Name the pattern and the trade (1 minute).**
"I can trade space for time with a hash map: one pass, storing what I have seen. O(n)
time, O(n) space."

**5. Code it, narrating, then test it by hand.**
Walk through your own code with a small input, out loud, before saying you are done. Find
your own off-by-one. An interviewer who watches you catch your own bug scores that higher
than code that happened to be right.

### Worked example — the full method on one problem

**Problem:** given an array of integers and a target, return the indices of two numbers
adding to the target.

**Restate.** "Array of ints, possibly negative, possibly duplicated. Return two *indices*,
not the values. Exactly one solution guaranteed?"

**Edges.** Length at least two? Can I use the same element twice? (No.) Sorted? (No.)

**Brute force.** Two nested loops, check every pair, O(n²) time, O(1) space. Works. Too
slow if n is large.

**Pattern.** For each number I need to know whether `target - number` has already been
seen. "Have I seen X" in constant time is a hash map. One pass.

```js
function twoSum(nums, target) {
  const seen = new Map();            // value → index

  for (let i = 0; i < nums.length; i++) {
    const need = target - nums[i];   // what would complete the pair

    if (seen.has(need)) {            // check BEFORE inserting, so we never
      return [seen.get(need), i];    // pair an element with itself
    }
    seen.set(nums[i], i);
  }
  return [];
}
```

**The detail that is the actual lesson:** checking before inserting. Insert first and
`nums[i]` can match itself when `target === 2 * nums[i]`. That ordering is the whole
problem, and it is the kind of thing you only learn by getting it wrong once.

**Complexity, aloud.** "O(n) time, one pass. O(n) space for the map. I traded space for
time, which the constraints justify."

**Test by hand.** `[3,2,4]`, target 6. i=0: need 3, map empty, store 3→0. i=1: need 4,
not seen, store 2→1. i=2: need 2, seen at index 1, return [1,2]. Correct — and note it
did *not* return [0,0], which is what the insert-first bug would have produced.

That is the shape of every answer you give for the next fifty weeks.

---

## Intermediate Concepts — the patterns

Twelve patterns cover the overwhelming majority of what you will be asked. Learn the
**tell** for each — the thing in the problem statement that points at it — because
recognition is the skill, not implementation.

### 1. Hashing
**Tell:** "have I seen this before", counting, grouping, deduplication, "find the pair".
**Cost:** O(n) time, O(n) space.
**Watch:** ordering of check-then-insert; hashing a mutable object; needing insertion
order (use a Map, not a plain object).

### 2. Two pointers
**Tell:** the array is **sorted**, or you want pairs from opposite ends, or in-place
removal.
**Why it works:** sorted order means moving one pointer tells you something definite about
everything past it.
**Watch:** the while condition (`left < right` versus `<=`); skipping duplicates when the
answer must be unique.

### 3. Sliding window
**Tell:** "contiguous subarray or substring" plus "longest / shortest / at most K".
**Shape:** expand right always; shrink left while the window is invalid.
```js
let left = 0, best = 0;
for (let right = 0; right < n; right++) {
  add(s[right]);
  while (!valid()) { remove(s[left]); left++; }
  best = Math.max(best, right - left + 1);
}
```
**Watch:** using `if` instead of `while` to shrink — a classic bug that passes the sample
and fails the hidden tests.

### 4. Prefix sums
**Tell:** many range-sum queries, or "subarray summing to K".
**Trick:** combine with hashing — store prefix sums seen; the count of subarrays ending
here with sum K is how many times `prefix - K` has appeared.
**Watch:** seed the map with `{0: 1}` so a prefix that equals K counts itself.

### 5. Binary search
**Tell:** sorted input, **or** "minimise the maximum / maximise the minimum" — that phrase
means binary search *on the answer*, not on the array.
**Template that avoids infinite loops:**
```js
let lo = 0, hi = n - 1;
while (lo < hi) {
  const mid = lo + Math.floor((hi - lo) / 2);   // never (lo+hi)/2 — overflow habit
  if (ok(mid)) hi = mid; else lo = mid + 1;
}
return lo;
```
**Watch:** this template converges on the smallest index where `ok` is true. Learn one
template and reuse it rather than re-deriving the boundaries under pressure.

### 6. Stacks
**Tell:** matching pairs, nesting, "next greater element", undo, expression parsing.
**Monotonic stack:** keep it increasing or decreasing; pop while the new element breaks
the order. That is the whole "next greater" family.

### 7. Linked lists
**Tell:** the input is a linked list. That is it.
**Two techniques cover nearly everything:** slow/fast pointers (cycle detection, middle
node) and a **dummy head node** so you never special-case the head.
**Watch:** losing the rest of the list during reversal — hold `next` before you rewire.

### 8. Trees
**Tell:** the input is a tree.
**DFS (recursive)** for path, depth, subtree questions. **BFS (queue)** when the answer
is by level or is a shortest path.
```js
// BFS by level — the shape you will reuse constantly
const q = [root];
while (q.length) {
  const size = q.length;                 // freeze the level boundary
  for (let i = 0; i < size; i++) {
    const node = q.shift();
    if (node.left)  q.push(node.left);
    if (node.right) q.push(node.right);
  }
}
```
**Watch:** forgetting to freeze `size` — without it you run into the next level.

### 9. Heaps
**Tell:** "top K", "K largest", "median of a stream", merging sorted lists.
**Rule:** for the K *largest*, keep a **min**-heap of size K. Backwards from intuition,
and asked often.

### 10. Graphs
**Tell:** nodes and edges, grids (a grid is a graph), dependencies, "can I reach".
**Step one is always to build the adjacency list.** Most graph failures are building the
wrong representation, not the wrong traversal.
**BFS** for unweighted shortest path, **DFS** for connectivity and cycles, **topological
sort** for dependency ordering, **union-find** for "are these connected".
**Watch:** the visited set — mark on *enqueue*, not on dequeue, or nodes enter twice.

### 11. Backtracking
**Tell:** "all combinations / permutations / subsets", n ≤ 20.
**Shape:** choose → recurse → **un-choose**. The un-choose is the part people forget.
**Watch:** pushing a reference to the working array into results instead of a copy — every
result then ends up identical, which is a baffling bug until you have seen it once.

### 12. Dynamic programming
**Tell:** "how many ways", "minimum cost", optimal choices with overlapping subproblems.
**Method:** write the recursion first, add a memo second, convert to a table third — and
only if you need to. Most interview DP is fine memoised.
**The three questions:** what is the state, what is the transition, what is the base case.
If you can answer those three aloud you have solved it, whatever the code looks like.

---

## Advanced Concepts

### Recognising the pattern in two minutes

This is the skill the ladder is really training. A method:

1. **Read the constraints.** They halve the search space immediately.
2. **Name the input shape.** Array, string, tree, graph, list, grid, intervals. Each shape
   has two or three likely patterns and no more.
3. **Name what is being asked.** Count, optimum, existence, all-of-them, a path. "All of
   them" plus small n means backtracking. "Optimum" plus overlapping choices means DP.
4. **Look for the giveaway words.** *Sorted* → two pointers or binary search. *Contiguous*
   → sliding window or prefix sums. *Top K* → heap. *Levels* → BFS. *Dependencies* →
   topological sort. *Minimise the maximum* → binary search on the answer.

If two minutes pass with nothing, **state the brute force and start writing it.** A
working O(n²) beats a blank page, and a surprising number of interviews are passed on the
brute force plus a clear articulation of how you would improve it.

### What to do when you are stuck

Stuck is normal and is itself being assessed. Say these things out loud, because silence
is what fails you:

- "Let me work a small example by hand and look for the structure."
- "The brute force is X — let me write that first and then optimise."
- "I think this is a sliding window because the subarray has to be contiguous, but I am
  not sure how to handle the duplicates. Let me think about that case."

An interviewer who can hear your reasoning can give you a hint. One watching silence
cannot, and will not.

### Testing your own code before you are asked

Every solution, run these three inputs in your head aloud:

1. **The example** from the problem.
2. **The empty or single-element case.** Half of all interview bugs live here.
3. **A duplicate or negative**, if the problem allows them.

Doing this unprompted is a strong senior signal.

---

## The Ladder — fifty weeks

Sixty minutes every Saturday. The app shows the week's topic on the Plan tab; this is the
whole ladder in one place. **215 problems.**

| Weeks | Focus | Per week |
|---|---|---|
| **W1–W4** | Arrays and hashing — the foundation everything else builds on | 3–4 |
| **W5–W8** | Two pointers, then sliding window (fixed, then variable) | 3–4 |
| **W9–W12** | Strings, prefix sums, matrix traversal | 3 |
| **W13–W16** | Stacks and monotonic stacks, queues, linked lists | 3–4 |
| **W17–W20** | Binary search — exact, then on the answer; sorting; intervals | 3–4 |
| **W21–W24** | Trees — DFS, BFS by level, BSTs, path problems | 3–4 |
| **W25–W28** | Heaps and top-K, streaming median, recursion, backtracking | 3–4 |
| **W29–W32** | Backtracking permutations, then graphs — build, BFS, DFS | 3–4 |
| **W33–W36** | Topological sort, cycle detection, union-find, greedy | 3 |
| **W37–W42** | Dynamic programming — 1D, 2D grids, subsequences, knapsack | 4 |
| **W43–W47** | Mixed mediums, timed and narrated; weak-area targeted sets | 4 |
| **W48–W50** | Week 48 is the full 40-problem review; then mock-format sets | 40 / 6 / 4 |

**How to run a session.** Set a 25-minute timer per problem. If it rings, stop, write down
where you got stuck, read the editorial, and put the problem on a re-attempt list for two
weeks later. **The re-attempt is where the learning happens** — the first attempt only
finds the gap.

**Keep a log.** One line per problem: name, pattern, solved unaided or not, complexity.
Fifty weeks of that file is both your revision material and evidence of what you can do.

---

## Industry Usage

What the test actually looks like at Pakistani tier-2 and tier-3 companies:

- **An online screen first** — HackerRank, Codility or similar. Two or three problems,
  60–90 minutes, easy to medium, auto-scored on hidden tests. **This is the filter that
  removes most candidates**, and it happens early — which is precisely why you drill from
  week 1 and not from week 48.
- **A live coding round** — shared editor, someone watching. Usually one medium problem
  plus discussion. Communication is scored as much as the solution.
- **Occasionally a take-home** instead, which suits you better and which your three
  shipped projects already answer.

The hidden tests are the reason edge cases matter more than elegance: an empty array or a
single element is almost always in there.

**What it does not look like:** competitive programming. You will not be asked to
implement a segment tree. Skip that entirely.

---

## Alternatives

| Approach | Worth it? |
|---|---|
| **Pattern-based practice** (this chapter) | Yes — the highest return per hour at your level |
| **NeetCode 150 / Blind 75** | Yes, as the problem source. The ladder here maps onto them |
| **Grinding 500+ random problems** | No. Volume without pattern recognition is memorisation that decays |
| **Competitive programming** | No. Different skill, different problems, not asked |
| **Reading solutions without attempting** | Actively harmful — it creates false confidence |
| **Mock interviews with a person** | Yes, from week 49 — and earlier if you can get them |

---

## Security

Not a security chapter, but two things do belong here.

- **Integer overflow in the midpoint.** `(lo + hi) / 2` overflows in fixed-width languages.
  JavaScript's numbers make it safe up to 2⁵³, but write `lo + (hi - lo) / 2` anyway — it
  is the habit interviewers look for and it matters the moment you touch Java or Go.
- **Hash collisions as a real attack.** Worst-case O(n) per lookup when an attacker
  controls the keys. Irrelevant in an interview answer, relevant in your actual API, and
  worth knowing that the two worlds connect.

---

## Performance

- **Clarify before optimising.** Half of "optimise this" questions are answered by asking
  what is actually large.
- **Know the constant factors.** `shift()` on a JavaScript array is O(n), so a BFS queue
  built on `shift()` is quietly O(n²). Use an index pointer or a deque.
- **String concatenation in a loop** builds a new string each time. Push to an array and
  `join('')`.
- **Sorting is O(n log n) and often the right answer** — do not avoid it to preserve a
  linear pass that does not exist.
- **Memoisation is usually enough.** Converting to a bottom-up table is an optimisation to
  mention, not always to write.

---

## Debugging

A method for a failing solution, in order:

1. **Which test fails — the example or a hidden one?** The example means you misread the
   problem. A hidden one means an edge case.
2. **Try the three edges:** empty, single element, all-identical.
3. **Print the state at each iteration** for one small input. For a sliding window, print
   `left`, `right` and the window contents — the bug is visible in three lines.
4. **Off by one?** Check the loop bound and the while condition first. It usually is.
5. **Reference versus copy?** In backtracking, if every result looks the same, you pushed
   a reference.
6. **Infinite loop in binary search?** A branch that does not shrink the range. Use the
   template.
7. **Wrong answer only on large inputs?** Complexity, or overflow, or the `shift()` trap.

---

## Interview Preparation

**Q: What is the time complexity, and the space?**
Answer both, unprompted, every time. Include the recursion stack in space.

**Q: Can you do better?**
The honest answers: "yes, by trading space for time with a hash map"; "no, we have to look
at every element at least once, so O(n) is the floor"; or "yes, if the input were sorted —
is it?"

**Q: Why did you choose that data structure?**
Because of the operation you need to be fast. Hash map for O(1) membership, heap for
repeated min/max, stack for most-recent-first, set for dedup.

**Q: How would you test this?**
The example, the empty and single-element cases, duplicates, negatives, and the maximum
size for performance.

**Q: You are stuck. What now?**
Say what you have tried, name the pattern you suspect and why, and ask a specific
question. That is a pass; silence is a fail.

**Q: Walk me through your code.**
Line by line, with a small input, aloud. Practise this — it feels unnatural until it is
not, and the Saturday drill from week 32 onwards is explicitly narrated for this reason.

---

## Practical Tasks

1. **Week 1:** write your three baseline problems into `BASELINE.md` — how many you solved
   unaided in 25 minutes each. That number is what week 50 gets compared against.
2. Start `DSA-LOG.md`: one line per problem — name, pattern, unaided yes/no, complexity.
3. Write out the five-step method on a card and keep it beside you for every session.
4. Memorise one binary search template and one sliding window template. Reproduce each
   from blank once a month.
5. From week 4, state complexity aloud for every problem before looking at the answer.
6. From week 10, narrate at least one problem per session out loud.
7. From week 20, record yourself once a month and watch thirty seconds of it.
8. Keep a re-attempt list. Anything you failed goes on it and comes back two weeks later.
9. Every month, write the twelve patterns and their tells from memory. Check against this
   chapter. The gaps are your next month.
10. From week 32, do at least one session a month under real conditions — no pausing, no
    looking anything up, timer running.

---

## Self Assessment

- Can you name the twelve patterns and one tell for each, from memory?
- What does `n ≤ 20` tell you, and what does `n = 10⁹` tell you?
- Why do you check before inserting in the two-sum hash map?
- Why is it a **min**-heap for the K largest?
- Why must a sliding window shrink with `while` and not `if`?
- Where do you mark a node visited in BFS, and what breaks if you do it later?
- What are the three questions that define a DP problem?
- What is the space complexity of a recursive tree traversal, and why is it not O(1)?
- What do you say out loud when you are stuck, and why does saying it matter?
- How many problems have you solved fully unaided this month?

---

## Cheat Sheet

**The method:** restate → ask edges → brute force → name the pattern → code narrating →
test by hand.

**Constraints → complexity:** n≤20 exponential · n≤500 O(n³) · n≤5,000 O(n²) ·
n≤10⁶ O(n log n) · n=10⁹ O(log n).

**Tells:**

| Sees | Pattern |
|---|---|
| "have I seen it", counting, grouping | hash map |
| sorted array, pairs from both ends | two pointers |
| contiguous + longest/shortest/at most K | sliding window |
| many range sums, subarray sum = K | prefix sums + hash |
| sorted, or "minimise the maximum" | binary search |
| matching, nesting, next greater | stack |
| by level, shortest unweighted path | BFS |
| path, depth, subtree | DFS |
| top K, K largest, stream median | heap (min-heap of size K) |
| nodes and edges, grid, dependencies | graph — build the adjacency list first |
| all subsets/permutations, n ≤ 20 | backtracking (choose, recurse, un-choose) |
| how many ways, min cost, overlapping | DP — state, transition, base case |

```js
// Binary search — one template, memorised
let lo = 0, hi = n - 1;
while (lo < hi) {
  const mid = lo + Math.floor((hi - lo) / 2);
  if (ok(mid)) hi = mid; else lo = mid + 1;
}
return lo;

// Sliding window — one template, memorised
let left = 0, best = 0;
for (let right = 0; right < n; right++) {
  add(s[right]);
  while (!valid()) { remove(s[left]); left++; }
  best = Math.max(best, right - left + 1);
}
```

**Rules:**
- Read the constraints first.
- State the brute force before hunting the optimal.
- Say the complexity aloud, time and space, unprompted.
- Test empty and single-element before saying you are done.
- Narrate. Silence fails interviews that the code would have passed.
- The drill is AI-free for all fifty weeks. Interviews are.
