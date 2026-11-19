# Arrays, Strings and Hash Maps

> [!GOALS]
> - How arrays are laid out in memory, why reading by index is instant, and why inserting in the middle is not.
> - How dynamic arrays grow, and what typed arrays are for.
> - How strings are stored, why they cannot be changed, and how to build large strings efficiently.
> - How a hash map works inside: hash functions, buckets, collisions and resizing — by building a small one yourself.
> - Why hash map lookups are "O(1) on average", what the rare worst case is, and how attackers have exploited it.
> - When to use `Map`, `Set` or a plain object — and a real bug caused by using the wrong one.
> - Five techniques that solve a large share of real problems and interview questions: counting, grouping, two pointers, sliding windows and prefix sums.

## Why this matters

Arrays, strings and hash maps are the three data structures you will use more than all the others combined. Almost every API response is arrays of objects; almost all user input is strings; and the hash map — JavaScript's `Map`, `Set` and plain objects — is the single most useful tool for making slow code fast, as you saw in {{ch:problem-solving}} and {{ch:big-o}}.

You have used all three since Part II. This chapter looks **inside** them. Understanding how they work explains their costs — why `push` is fast and `shift` is slow, why `set.has` beats `array.includes`, why some string-building code is slow — and lets you choose correctly instead of by habit. It also teaches the core techniques built on them, which appear constantly in real code and make up a large share of coding interview questions.

## The simple idea

- An **array** is a row of numbered boxes, side by side. You can jump straight to box 5,000 because you know exactly where it is.
- A **string** is a row of characters, sealed shut once written: to change it, you write a new one.
- A **hash map** is like a library that uses a formula to decide which shelf every book goes on. To find a book, you apply the same formula to its title and walk straight to the right shelf — instead of searching every shelf.

> [!ANALOGY]
> A hash map is like a cloakroom with numbered hooks, where the attendant uses a rule — say, "the last two digits of your ticket" — to decide which hook your coat goes on. Finding your coat takes one look, however many coats there are.
>
> **Where the analogy breaks:** sometimes two tickets map to the same hook. A real cloakroom attendant would simply hang the coats together and look through them; a hash map does the same — but if a great many coats land on the same hook, finding one becomes slow again. Managing these "collisions" is the hidden engineering inside every hash map.

## The proper definition and key words

- A **data structure** is a way of organising data in memory so that certain operations are efficient.
- **Contiguous memory** means a block of memory locations next to each other, with no gaps.
- A **dynamic array** is an array that grows automatically as elements are added, by moving to a larger block when needed.
- A **hash function** turns a key (such as a string) into a number, used to decide where to store the value.
- A **bucket** is one of the slots a hash map stores entries in.
- A **collision** happens when two different keys produce the same bucket.
- The **load factor** is the number of entries divided by the number of buckets — how full the hash map is.

## Arrays inside

### Level 2 — Contiguous memory and instant access

In {{ch:what-a-computer-is}} you learned that memory is a long row of numbered boxes, each with an address. A classic array is a **contiguous** block of these boxes, one element after another, each element taking the same amount of space.

```text
  address:   1000    1008    1016    1024    1032
           +-------+-------+-------+-------+-------+
  value:   | 4500  |  600  | 1200  | 8000  |  300  |
           +-------+-------+-------+-------+-------+
  index:      0       1       2       3       4

  address of element i = start address + i * size of one element
  element 3 = 1000 + 3 * 8 = 1024
```

Because every element is the same size and they are side by side, the address of **any** element can be calculated with one multiplication and one addition. That is why `arr[i]` is **O(1)**: the computer does not count through the earlier elements; it computes where element `i` lives and goes straight there.

This is also why arrays are fast to **loop through** in practice: the elements sit next to each other, so when the CPU fetches one into its cache, the next few come along for free ({{ch:what-a-computer-is}}).

### Inserting and deleting

The same layout makes inserting or removing in the **middle** expensive. To insert at index 1, every element from index 1 onwards must move one place to the right to make room:

```text
  before:  [4500][ 600][1200][8000][ 300]
  insert 999 at index 1:
           [4500][    ][ 600][1200][8000][ 300]   <- four elements shifted right
           [4500][ 999][ 600][1200][8000][ 300]
```

For an array of n elements, that is up to n moves: **O(n)**. Removing works the same way in reverse. This is exactly why `unshift`, `shift` and `splice` are O(n) ({{ch:big-o}}), while `push` and `pop` — at the end, where nothing needs to move — are O(1).

### Dynamic arrays

A contiguous block has a fixed size. How can a JavaScript array keep growing? As you saw with amortised cost in {{ch:big-o}}, the engine allocates a block **bigger than needed**, fills it, and when it is full, allocates a new block about **twice** the size and copies everything across. Occasional expensive copies, spread over many cheap pushes, make `push` amortised O(1). Arrays that grow like this are called **dynamic arrays**, and almost every modern language provides them (Java's `ArrayList`, Python's `list`, C#'s `List`).

> [!INSIDE]
> JavaScript arrays are more flexible than classic arrays: they can hold mixed types and even have gaps. Engines handle this cleverly — an array of only small integers is stored as a tightly packed block of numbers; an array mixing numbers, strings and objects is stored as a block of **references** ({{ch:arrays}}), each pointing to a value elsewhere on the heap; and an array with large gaps may be stored more like a hash map. Keeping arrays to one kind of value, without gaps, lets the engine use the fastest representation ({{ch:advanced-javascript}}).

### Typed arrays

When you need a large block of raw numbers — image pixels, audio samples, binary file contents, network packets — JavaScript provides **typed arrays**: true fixed-size, contiguous blocks of one numeric type.

```js
const pixels = new Uint8Array(4);       // 4 unsigned 8-bit integers (0 to 255)
pixels[0] = 255;
pixels[1] = 300;                         // does not fit in 8 bits
console.log(pixels);

const prices = new Float64Array([4500.5, 600.25]);
console.log(prices.length, prices[1]);
```

**Output:**

```text
Uint8Array(4) [ 255, 44, 0, 0 ]
2 600.25
```

- `Uint8Array` holds whole numbers from 0 to 255 — one byte each ({{ch:what-a-computer-is}}). Storing 300 **wraps around** to 44 (300 − 256): the **overflow** behaviour from {{ch:what-a-computer-is}}, visible in JavaScript.
- `Float64Array` holds 64-bit decimal numbers, the same as normal JavaScript numbers.
- Typed arrays cannot grow; their length is fixed when created.

Node.js's `Buffer`, used for files and network data ({{ch:nodejs}}), is a kind of `Uint8Array`. You will rarely need typed arrays in business code, but they are how JavaScript handles binary data efficiently.

## Strings inside

### Level 2 — Immutable sequences

A string is a sequence of characters — in JavaScript, of 16-bit units ({{ch:types-of-data}}). Two facts shape everything about working with strings:

1. **Reading by index is O(1)**, like an array: `text[5]`.
2. **Strings are immutable** ({{ch:types-of-data}}). Every "change" — `toUpperCase`, `replace`, `slice`, `+` — creates a **new** string. So operations that produce a new string cost **O(length)**, because the characters must be copied.

Comparing strings costs time too: `a === b` compares character by character until a difference is found, so comparing two long strings that are equal costs O(length). Hash maps with string keys must hash the whole string, which is also O(length) — usually small, but worth knowing when keys are huge.

### Building strings efficiently

Because strings are immutable, a naive loop that adds to a string can, in principle, copy the growing string again on every step:

```js
let csv = "";
for (const order of orders) {
  csv += `${order.id},${order.totalPaisa}\n`;   // may copy the whole string each time
}
```

In theory that is O(n²) total copying. In practice, modern engines such as V8 optimise this pattern internally (by keeping the pieces linked and only joining them when needed), so `+=` in a loop is usually fine. The classic, always-efficient approach is to collect pieces in an array and **join** once at the end:

```js
const lines = orders.map((order) => `${order.id},${order.totalPaisa}`);
const csv = lines.join("\n");
```

This is O(total length), clear, and works in every language — the approach to prefer when building large text such as CSV files, reports or HTML.

## Hash maps inside

### Level 3 — The core idea

You have used hash maps since {{ch:objects}}: `Map`, `Set` and plain objects used as lookup tables. Here is how they achieve near-instant lookups.

A hash map stores its entries in an internal **array of buckets**. To store a key–value pair:

1. Compute a **hash** of the key: a number produced by a **hash function**.
2. Turn that number into a bucket index — usually the remainder after dividing by the number of buckets (`hash % bucketCount`, using `%` from {{ch:types-of-data}}).
3. Store the entry in that bucket.

To look a key up, do exactly the same calculation and go **straight to that bucket**. Because computing the hash and reaching a bucket by index ({{ch:big-o}}) do not depend on how many entries there are, lookups are **O(1)** on average.

```text
   key "sara"  --hash-->  9371  --% 8-->  bucket 3
   key "bilal" --hash-->  2210  --% 8-->  bucket 2
   key "zain"  --hash-->  6011  --% 8-->  bucket 3   <- collision with "sara"

   buckets:
   0: []
   1: []
   2: [ ("bilal", ...) ]
   3: [ ("sara", ...), ("zain", ...) ]     <- both stored, side by side
   4: []
   ...
   7: []
```

A good hash function has three properties:

- **Deterministic** — the same key always gives the same hash (or you could never find anything again).
- **Fast** to compute.
- **Spreads keys evenly** across buckets, so that most buckets hold zero or one entry.

### Collisions

Different keys can land in the same bucket, as `"sara"` and `"zain"` did above. This is a **collision**, and it is unavoidable: there are infinitely many possible keys and only a limited number of buckets.

The simplest way to handle collisions is **chaining**: each bucket holds a small list of entries, and lookups check each entry in the bucket's list. If the hash function spreads keys evenly and the table is not too full, each list stays very short — usually one or two entries — so lookups remain fast. (Another family of techniques, **open addressing**, instead looks for the next free bucket. Real engines use carefully tuned variations of both.)

### Resizing

As more entries are added, buckets fill up and lists get longer. Hash maps track their **load factor** — entries divided by buckets — and when it passes a threshold (commonly around 0.75), they **resize**: allocate about twice as many buckets and **rehash** every entry into the new array. Like a dynamic array's growth, resizing is O(n) when it happens but rare, so insertion is **amortised O(1)**.

### Level 4 — Build one yourself

Building a small hash map makes all of this concrete. (In real code, always use the built-in `Map`; this is for understanding.)

```ts
class SimpleHashMap<V> {
  #buckets: Array<Array<[string, V]>>;
  #size = 0;

  constructor(initialBuckets = 8) {
    this.#buckets = Array.from({ length: initialBuckets }, () => []);
  }

  #hash(key: string): number {
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
    }
    return hash;
  }

  #bucketFor(key: string): Array<[string, V]> {
    return this.#buckets[this.#hash(key) % this.#buckets.length]!;
  }

  set(key: string, value: V): void {
    const bucket = this.#bucketFor(key);
    const existing = bucket.find(([k]) => k === key);
    if (existing) {
      existing[1] = value;
      return;
    }
    bucket.push([key, value]);
    this.#size++;
    if (this.#size / this.#buckets.length > 0.75) {
      this.#resize();
    }
  }

  get(key: string): V | undefined {
    return this.#bucketFor(key).find(([k]) => k === key)?.[1];
  }

  #resize(): void {
    const oldEntries = this.#buckets.flat();
    this.#buckets = Array.from({ length: this.#buckets.length * 2 }, () => []);
    for (const [key, value] of oldEntries) {
      this.#bucketFor(key).push([key, value]);
    }
  }

  get size(): number {
    return this.#size;
  }

  get bucketCount(): number {
    return this.#buckets.length;
  }
}

const stock = new SimpleHashMap<number>();
for (const [sku, count] of [["SKU-1", 5], ["SKU-2", 0], ["SKU-3", 12], ["SKU-4", 7], ["SKU-5", 3], ["SKU-6", 9], ["SKU-7", 1]] as const) {
  stock.set(sku, count);
}
console.log(stock.get("SKU-3"), stock.get("SKU-9"));
console.log(`size ${stock.size}, buckets ${stock.bucketCount}`);
```

**Output:**

```text
12 undefined
size 7, buckets 16
```

Walkthrough:

- `#buckets` is an array of buckets; each bucket is an array of `[key, value]` pairs — **chaining**.
- `#hash` turns a string into a number: for each character, multiply the running hash by 31 and add the character's code ({{ch:what-a-computer-is}}). Multiplying by a prime number such as 31 helps spread similar keys apart — `"SKU-1"` and `"SKU-2"` get very different hashes. `>>> 0` keeps the result a non-negative 32-bit whole number, so it cannot overflow into imprecise values ({{ch:types-of-data}}).
- `#bucketFor` uses the remainder to pick a bucket.
- `set` replaces the value if the key already exists in its bucket; otherwise it adds the pair and, if the load factor passes 0.75, **resizes**.
- `get` repeats the calculation and searches only one small bucket.
- After 7 entries in 8 buckets (load factor 0.875 > 0.75), the map doubled to 16 buckets and rehashed everything.

Every idea in this section is visible: hashing, buckets, collisions handled by chaining, load factor, resizing.

### "O(1) on average" — and the worst case

If the hash function spreads keys well, buckets stay tiny, and every operation is O(1) on average. But if **many keys land in the same bucket**, that bucket's list grows long, and lookups degrade to scanning it — **O(n)** in the worst case.

With good hash functions and ordinary data, this essentially never happens by accident. But it **can** happen on purpose. In 2011, security researchers demonstrated a widely publicised attack, often called **hash flooding** (or "HashDoS"): many web frameworks of the time put submitted form fields into hash maps, and their hash functions were predictable. Attackers crafted requests with thousands of field names that all collided, so a single small request made the server do billions of comparisons, tying up its CPU — a denial-of-service attack, closely related to the blocked-event-loop problems in {{ch:the-event-loop}}.

The fix, now standard in languages and engines, is **randomised hashing**: each process uses a secret random value (a **seed**) in its hash function, so attackers cannot predict which keys will collide. Applications add their own defences too: limits on the number of fields and the size of request bodies ({{ch:validation}}).

## `Map`, `Set` and plain objects

JavaScript offers three hash-based tools. Choosing correctly avoids real bugs.

| | `Map` | `Set` | Plain object `{}` |
|---|---|---|---|
| Stores | key → value | unique values | string key → value |
| Key types | anything | anything | strings (and symbols) |
| Order | insertion order | insertion order | mostly insertion order (integer-like keys first) |
| Size | `.size` | `.size` | `Object.keys(obj).length` |
| Inherited keys | none | none | inherits from `Object.prototype` |
| JSON | needs conversion | needs conversion | directly |
| Best for | dynamic lookup tables | membership tests, removing duplicates | fixed-shape records; JSON data |

### A real bug: plain objects as lookup tables

Plain objects inherit properties from `Object.prototype` ({{ch:this-prototypes-classes}}). When you use an object as a lookup table keyed by **arbitrary strings** — words from user input, product names, usernames — some keys collide with inherited names:

```js
function countWords(text) {
  const counts = {};
  for (const word of text.split(" ")) {
    counts[word] = (counts[word] || 0) + 1;
  }
  return counts;
}

console.log(countWords("the constructor called the toString method"));
```

**Output:**

```text
{
  the: 2,
  constructor: 'function Object() { [native code] }1',
  called: 1,
  toString: 'function toString() { [native code] }1',
  method: 1
}
```

Walkthrough:

- For an ordinary word like `"the"`, `counts["the"]` starts as `undefined`, so `undefined || 0` gives 0, and the count becomes 1.
- But `counts["constructor"]` is **not** undefined: it finds the inherited `constructor` **function** on `Object.prototype`. A function is truthy, so `|| 0` keeps the function, and `function + 1` joins it into a string ({{ch:types-of-data}}). The same happens to `toString`.

In real systems, keys like `"__proto__"` can be worse, contributing to the **prototype pollution** vulnerability from {{ch:objects}}. The fix is to use a `Map` for lookup tables with arbitrary keys:

```js
function countWords(text) {
  const counts = new Map();
  for (const word of text.split(" ")) {
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }
  return counts;
}

console.log(countWords("the constructor called the toString method"));
```

**Output:**

```text
Map(5) {
  'the' => 2,
  'constructor' => 1,
  'called' => 1,
  'toString' => 1,
  'method' => 1
}
```

(If you must use a plain object as a dictionary, create it with `Object.create(null)`, which has **no** prototype and therefore no inherited keys.)

> **Rule:** plain objects for records with known field names; `Map` for lookup tables keyed by data; `Set` for "is this in the collection?".

## Technique 1 — Counting with a hash map

### Level 3 — Frequency counts

Many problems reduce to **counting how often each thing appears**. A hash map makes it one pass.

> **Problem:** Are two words **anagrams** — made of exactly the same letters, such as "listen" and "silent"?

```ts
function isAnagram(a: string, b: string): boolean {
  if (a.length !== b.length) return false;

  const counts = new Map<string, number>();
  for (const ch of a) {
    counts.set(ch, (counts.get(ch) ?? 0) + 1);
  }
  for (const ch of b) {
    const remaining = (counts.get(ch) ?? 0) - 1;
    if (remaining < 0) return false;
    counts.set(ch, remaining);
  }
  return true;
}

console.log(isAnagram("listen", "silent"), isAnagram("apple", "papel"), isAnagram("rat", "car"));
```

**Output:**

```text
true true false
```

Walkthrough:

- Different lengths cannot be anagrams — a quick guard clause.
- Count every letter of `a`.
- For every letter of `b`, use one up. If a letter runs out (goes below zero), `b` has more of it than `a`, so they are not anagrams.
- If every letter of `b` was available, and the lengths match, the counts must balance exactly.

**Cost:** O(n) time, and space proportional to the number of **distinct** characters. The alternative — sort both words and compare — is O(n log n), simpler to write, and perfectly fine for short words.

## Technique 2 — Grouping with a hash map

### Level 3 — Bucketing by a computed key

**Grouping** puts items into buckets according to a key you compute from each item. You did this with orders by status in {{ch:objects}} and by customer in {{ch:problem-solving}}. The power comes from choosing the right key.

> **Problem:** Group a list of words so that anagrams are together.

The insight: all anagrams have the same letters, so sorting the letters of each word gives the **same** key for every anagram — `"listen"`, `"silent"` and `"enlist"` all become `"eilnst"`.

```ts
function groupAnagrams(words: string[]): string[][] {
  const groups = new Map<string, string[]>();
  for (const word of words) {
    const key = [...word].sort().join("");
    const group = groups.get(key);
    if (group) {
      group.push(word);
    } else {
      groups.set(key, [word]);
    }
  }
  return [...groups.values()];
}

console.log(groupAnagrams(["listen", "pots", "silent", "stop", "enlist", "tops", "rat"]));
```

**Output:**

```text
[
  [ 'listen', 'silent', 'enlist' ],
  [ 'pots', 'stop', 'tops' ],
  [ 'rat' ]
]
```

`[...word]` splits the word into an array of characters, `.sort()` sorts them alphabetically (fine here — they are single letters — {{ch:arrays}}), and `.join("")` turns them back into a string key.

The same technique groups customers by city, transactions by day, log lines by error type, and products by a normalised name to find near-duplicates.

## Technique 3 — Two pointers

### Level 4 — Walking from both ends

The **two-pointer** technique uses two indexes that move through an array — often from both ends towards the middle, or both forwards at different speeds — to avoid nested loops.

> **Problem:** In a **sorted** array of prices, find two prices that add up to a target.

You solved the unsorted version with a `Map` in {{ch:problem-solving}}. When the array is already sorted, there is a solution that uses **no extra memory**:

```ts
function pairInSorted(prices: number[], target: number): [number, number] | null {
  let left = 0;
  let right = prices.length - 1;

  while (left < right) {
    const sum = prices[left]! + prices[right]!;
    if (sum === target) return [left, right];
    if (sum < target) {
      left++;          // need a bigger sum: move the small end up
    } else {
      right--;         // need a smaller sum: move the big end down
    }
  }
  return null;
}

console.log(pairInSorted([500, 700, 1500, 2300, 3000], 3000));
```

**Output:**

```text
[ 1, 3 ]
```

Trace with target 3000:

```text
  left right  prices[left] + prices[right]   decision
  0    4      500 + 3000 = 3500              too big   -> right--
  0    3      500 + 2300 = 2800              too small -> left++
  1    3      700 + 2300 = 3000              found [1, 3]
```

Why is it safe to move a pointer? Because the array is sorted:

- If the sum is **too big**, the right element is too large to pair with the **smallest** remaining element on the left — so it is too large to pair with any of them. It can be ruled out, and `right` moves inward.
- If the sum is **too small**, the left element is too small even when paired with the **largest** remaining element on the right — so it can be ruled out, and `left` moves inward.

Each step rules out one element for good, so the pointers meet after at most n steps: **O(n) time, O(1) space**.

Two pointers also solve: reversing an array in place, checking palindromes (you did this in {{ch:loops}}), merging two sorted lists, and removing duplicates from a sorted array.

## Technique 4 — Sliding window

### Level 4 — A moving range

A **sliding window** is a range of consecutive elements that moves across an array or string. Instead of recomputing everything for each position, you **update** the result as one element enters the window and another leaves.

> **Problem:** Given daily sales, find the highest total over any **7 consecutive days**.

The brute force recomputes each 7-day total from scratch: O(n × 7). Fine for a week — but if the window were 1,000 days, it would be O(n × 1,000). The sliding window does it in one pass:

```ts
function bestWindowTotal(daily: number[], days: number): number | undefined {
  if (daily.length < days) return undefined;

  let windowTotal = 0;
  for (let i = 0; i < days; i++) windowTotal += daily[i]!;

  let best = windowTotal;
  for (let i = days; i < daily.length; i++) {
    windowTotal += daily[i]! - daily[i - days]!;   // add the new day, drop the oldest
    best = Math.max(best, windowTotal);
  }
  return best;
}

console.log(bestWindowTotal([5, 1, 3, 8, 2, 9, 4, 7, 6], 3));
```

**Output:**

```text
20
```

Walkthrough:

- Add up the first window (5 + 1 + 3 = 9).
- Slide: each step adds the element entering on the right and subtracts the one leaving on the left. That keeps the total correct in O(1) per step.
- Track the best. The window `[9, 4, 7]` gives 20, the highest.

**Cost:** O(n) time, whatever the window size; O(1) space.

Windows can also **grow and shrink**. A classic interview problem — "longest substring without repeating characters" — keeps a window that grows to the right and shrinks from the left whenever a repeat appears; you will solve it in the exercises. Real systems use sliding windows constantly: "requests in the last 60 seconds" for rate limiting ({{ch:rate-limiting}}), moving averages in dashboards ({{ch:monitoring}}).

## Technique 5 — Prefix sums

### Level 4 — Precompute once, answer instantly

When many questions ask for the **total over a range** of an array, compute a **prefix sum** array once: element `i` holds the total of everything **before** position `i`.

```ts
function buildPrefixSums(values: number[]): number[] {
  const prefix = [0];
  for (const value of values) {
    prefix.push(prefix[prefix.length - 1]! + value);
  }
  return prefix;
}

function rangeTotal(prefix: number[], from: number, to: number): number {
  return prefix[to + 1]! - prefix[from]!;
}

const dailySales = [5, 1, 3, 8, 2, 9, 4];
const prefix = buildPrefixSums(dailySales);

console.log(prefix);
console.log(rangeTotal(prefix, 2, 5));
```

**Output:**

```text
[
  0,  5,  6,  9,
  17, 19, 28, 32
]
22
```

Walkthrough:

- `prefix[i]` is the total of the first `i` values: `prefix[0] = 0`, `prefix[1] = 5`, `prefix[2] = 5 + 1 = 6`, and so on.
- The total from index `from` to index `to` (inclusive) is "everything up to `to`" minus "everything before `from`": `prefix[to + 1] - prefix[from]`. Days 2 to 5 are 3 + 8 + 2 + 9 = 22.

**Cost:** O(n) once to build, then **O(1) per question** — however long the range. Reporting systems use the same idea at larger scale: precompute running totals so that "sales between any two dates" is instant ({{ch:query-optimization}}).

## From beginner to enterprise: these structures at every level

**Level 3 — Small programs.** Arrays for lists, `Set` for uniqueness, `Map` for counting and lookups; the five techniques for exercises and interview questions.

**Level 4 — A real application.** Lookups by ID use `Map`s built once per request rather than `find` in a loop; CSV and report files are built with `join`; inputs are grouped and counted in single passes; dictionaries keyed by user data use `Map`, never plain objects.

**Level 5 — Professional engineering.** Engineers choose structures by their operations — "we look up by SKU thousands of times, so index by SKU" — and watch memory as well as time: a `Map` of a million entries costs real memory. Request size limits protect hash-based parsing from flooding attacks.

**Level 6 — Enterprise.** The same structures reappear at system scale: **Redis** is essentially a networked hash map ({{ch:redis}}); **database indexes** play the role of maps and sorted arrays on disk ({{ch:indexes}}); **consistent hashing** spreads data across many servers so that adding a server moves only a small fraction of keys ({{ch:sharding}}); sliding windows count events for rate limiting and fraud detection across clusters.

## Real-world use cases

### Beginner level — Counting votes

**Situation:** count votes in a class election from a list of names.

**Solution:** one pass with a `Map` from name to count; then find the maximum.

### Intermediate level — Joining two API responses

**Business problem:** a dashboard combines 20,000 orders from one service with 5,000 customers from another, to show each order's customer name.

**Naive approach:** for each order, `customers.find(c => c.id === order.customerId)` — O(orders × customers), 100 million comparisons.

**Better:** build `new Map(customers.map(c => [c.id, c]))` once — O(customers) — then look up each order's customer in O(1): O(orders + customers). This "index then join" pattern is exactly what databases do internally when joining tables ({{ch:query-optimization}}).

### Advanced level — Detecting bursts of failed logins

**Business problem:** a SaaS company wants to lock an account after 5 failed logins within 10 minutes.

**Solution:** a sliding window per account — a list of recent failure times, from which entries older than 10 minutes are removed as new ones arrive; if 5 remain, lock.

**Scaling:** with many servers, the window lives in a shared store such as Redis, using its sorted sets or counters with expiry ({{ch:rate-limiting}}).

### Enterprise level — The hash-flooding defence

**Business problem (based on the publicly documented 2011 class of attack):** a web platform's servers could be brought down by small requests containing thousands of carefully chosen parameter names.

**Defences now standard across the industry:** randomised hash seeds in the language runtime; limits on the number of parameters and the size of bodies; and monitoring for unusually expensive requests.

**Lesson:** "O(1) on average" is a property of typical inputs. Systems exposed to the internet must also consider **adversarial** inputs.

## Common mistakes

### Beginner mistake — `includes` or `find` inside a loop

**What it looks like:** `items.filter((x) => others.includes(x))`.

**How to fix it:** build a `Set` or `Map` once, outside the loop ({{ch:big-o}}).

### Beginner mistake — Plain objects as dictionaries for arbitrary keys

**What it looks like:** `counts[word] = (counts[word] || 0) + 1` with user-supplied words.

**What happens:** inherited keys such as `constructor` and `toString` corrupt the results; `__proto__` can open security holes.

**How to fix it:** use `Map` (or `Object.create(null)`).

### Intermediate mistake — Using objects as `Map` keys and expecting value equality

**What it looks like:** `map.set({ x: 1 }, "A"); map.get({ x: 1 })` returns `undefined`.

**Why:** object keys are compared by **reference** ({{ch:arrays}}); two separate objects are different keys.

**How to fix it:** use a primitive key derived from the object, such as an ID or `"x:1"`.

### Intermediate mistake — Two pointers on unsorted data

**What it looks like:** using the sorted-pair technique on an unsorted array.

**What happens:** missed pairs — the reasoning depends on order.

**How to fix it:** sort first (O(n log n)), or use a hash map (O(n)).

### Production mistake — Unbounded maps

**What it looks like:** a `Map` keyed by something that keeps growing — user IDs, request IDs — held for the life of a server.

**What happens:** a memory leak ({{ch:advanced-javascript}}).

**How to prevent it:** bound the size, expire entries, or use a shared store with expiry.

### Enterprise mistake — Ignoring adversarial input

**What it looks like:** parsing unlimited user-supplied keys into hash maps, or unlimited text into regular expressions and string operations.

**How to prevent it:** limits on sizes and counts at the edge of the system; secure, maintained parsers.

## Debugging and troubleshooting

| Symptom | Likely cause |
|---|---|
| Counts show strange values like `function ... 1` | Plain object used as a dictionary; inherited keys |
| `map.get(obj)` returns `undefined` for an "equal" object | Object keys compare by reference |
| Lookups slow, CPU high with particular inputs | Many collisions or very long keys; check input limits |
| A sliding window gives wrong totals at the start or end | Off-by-one in the initial window or in which element leaves |
| Prefix-sum ranges off by one | Mixing "up to and including" with "before"; remember `prefix[to + 1] - prefix[from]` |
| Two-pointer search misses pairs | Input not sorted, or pointers moved the wrong way |
| Memory grows steadily in a long-running process | A map or set that only ever grows |

## How a senior engineer thinks about these structures

> [!SENIOR]
> - **Choose by operations.** What will be done most — read by position, look up by key, test membership, add at the end, add in the middle? The answer picks the structure.
> - **Index once, look up many times.** When code repeatedly searches a list, build a map first.
> - **Know the averages and the worst cases.** Hash maps are O(1) on average; inputs from the internet may not be average.
> - **Memory is part of the cost.** Faster lookups often cost memory; at millions of entries, that matters.
> - **Recognise the techniques.** Counting, grouping, two pointers, sliding windows and prefix sums cover a large share of everyday data problems — and interview questions.

## Exercises

### Exercise 1 — First unique character

**Objective:** practise counting with a map.

**What to build:** `firstUniqueChar(text)` returns the index of the first character that appears exactly once, or `-1`. Examples: `"lahore"` → 0 (`l`); `"aabbcdd"` → 4 (`c`); `"aabb"` → -1.

<details>
<summary>Show the solution</summary>

```ts
function firstUniqueChar(text: string): number {
  const counts = new Map<string, number>();
  for (const ch of text) {
    counts.set(ch, (counts.get(ch) ?? 0) + 1);
  }
  for (let i = 0; i < text.length; i++) {
    if (counts.get(text[i]!) === 1) return i;
  }
  return -1;
}

console.log(firstUniqueChar("lahore"), firstUniqueChar("aabbcdd"), firstUniqueChar("aabb"));
```

**Output:**

```text
0 4 -1
```

Walkthrough:

- The first pass counts every character.
- The second pass walks the string **in order** and returns the first index whose character has a count of exactly 1.
- Two passes of O(n) each: O(n) time; space proportional to the number of distinct characters.

**Common wrong approach:** looping over the `Map` in the second pass instead of the string. That works here, because `Map` keeps insertion order — but returning an index then requires another search. Walking the string keeps the answer and its index together.

</details>

### Exercise 2 — Longest substring without repeats

**Objective:** practise a growing and shrinking sliding window.

**What to build:** `longestUniqueRun(text)` returns the length of the longest substring with no repeated characters. Examples: `"abcabcbb"` → 3 (`"abc"`); `"bbbbb"` → 1; `"pwwkew"` → 3 (`"wke"`); `""` → 0.

**Hint:** keep a window `[start, end]` and a `Map` from character to its last index. When the character at `end` already appears inside the window, move `start` to just after its previous position.

<details>
<summary>Show the solution</summary>

```ts
function longestUniqueRun(text: string): number {
  const lastSeen = new Map<string, number>();
  let start = 0;
  let best = 0;

  for (let end = 0; end < text.length; end++) {
    const ch = text[end]!;
    const previous = lastSeen.get(ch);
    if (previous !== undefined && previous >= start) {
      start = previous + 1;
    }
    lastSeen.set(ch, end);
    best = Math.max(best, end - start + 1);
  }
  return best;
}

for (const s of ["abcabcbb", "bbbbb", "pwwkew", ""]) {
  console.log(s, longestUniqueRun(s));
}
```

**Output:**

```text
abcabcbb 3
bbbbb 1
pwwkew 3
 0
```

Walkthrough (for `"pwwkew"`):

```text
  end ch  previous  start  window  length  best
  0   p   -         0      p       1       1
  1   w   -         0      pw      2       2
  2   w   1 (>=0)   2      w       1       2
  3   k   -         2      wk      2       2
  4   e   -         2      wke     3       3
  5   w   2 (>=2)   3      kew     3       3
```

- The window grows one character at a time on the right.
- When a character repeats **inside** the window, `start` jumps past its previous occurrence, so the window again has no repeats.
- `previous >= start` ignores occurrences that are already outside the window.
- Each character is visited once: O(n) time.

**Common wrong approach:** restarting the window from scratch (`start = end`) at each repeat, or forgetting the `previous >= start` check — which makes `start` jump **backwards** for strings such as `"abba"`, giving 3 instead of the correct 2.

</details>

### Exercise 3 — Count ranges quickly

**Objective:** practise prefix sums.

**What to build:** given hourly website visits for one day (24 numbers), answer many questions of the form "how many visits between hour `a` and hour `b`, inclusive?" in O(1) each. Use your own data and answer three queries.

<details>
<summary>Show the solution</summary>

```ts
const hourlyVisits = [12, 8, 5, 4, 3, 6, 20, 45, 80, 95, 110, 120,
                      130, 125, 115, 100, 98, 105, 140, 160, 150, 90, 50, 25];

const prefix = [0];
for (const visits of hourlyVisits) {
  prefix.push(prefix[prefix.length - 1]! + visits);
}

function visitsBetween(fromHour: number, toHour: number): number {
  return prefix[toHour + 1]! - prefix[fromHour]!;
}

console.log("Morning 6-11:", visitsBetween(6, 11));
console.log("Evening 18-21:", visitsBetween(18, 21));
console.log("Whole day:", visitsBetween(0, 23));
```

**Output:**

```text
Morning 6-11: 470
Evening 18-21: 540
Whole day: 1796
```

Walkthrough:

- Building the prefix array is one pass over the 24 hours.
- Each query is two array reads and a subtraction, regardless of the range length.
- For one day of 24 numbers this is overkill; for a year of per-minute data (over 500,000 values) queried thousands of times, it is the difference between instant and slow.

**Common wrong approach:** `prefix[toHour] - prefix[fromHour]`, which leaves out the last hour. Remember: `prefix[i]` is the total **before** index `i`.

</details>

### Exercise 4 — The broken word counter (debugging)

**Objective:** practise diagnosing a dictionary bug.

**The scenario:** a support dashboard shows the three most frequent words in customer messages. Developers on an integration team keep writing about "the constructor", and the dashboard shows nonsense:

```js
function topWords(messages) {
  const counts = {};
  for (const message of messages) {
    for (const word of message.toLowerCase().split(/\s+/)) {
      counts[word] = counts[word] + 1 || 1;
    }
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 3);
}

console.log(topWords([
  "the constructor fails",
  "constructor error again",
  "the constructor is broken",
]));
```

(`split(/\s+/)` splits on runs of whitespace, using a regular expression — {{ch:the-event-loop}}.)

**What to do:** run it, explain the output, and fix it.

<details>
<summary>Show the solution</summary>

**Output of the original:**

```text
[
  [ 'the', 2 ],
  [ 'constructor', 'function Object() { [native code] }111' ],
  [ 'fails', 1 ]
]
```

**What went wrong:**

- `counts` is a plain object, which inherits from `Object.prototype` ({{ch:this-prototypes-classes}}). `counts["constructor"]` is therefore not `undefined` the first time — it is the inherited `Object` **function**.
- `function + 1` joins as text ({{ch:types-of-data}}), giving `"function Object() { [native code] }1"`, a truthy string, so `|| 1` keeps it. Each later occurrence appends another `1`.
- The sort then subtracts strings from numbers, producing `NaN`, and the order is meaningless: "constructor", the real most frequent word with 3 occurrences, is not ranked first, and its count is garbage.

**Fixed version:**

```js
function topWords(messages) {
  const counts = new Map();
  for (const message of messages) {
    for (const word of message.toLowerCase().split(/\s+/)) {
      if (word === "") continue;
      counts.set(word, (counts.get(word) ?? 0) + 1);
    }
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
}
```

**Output:**

```text
[ [ 'constructor', 3 ], [ 'the', 2 ], [ 'fails', 1 ] ]
```

Walkthrough:

- A `Map` has no inherited keys, so every word — whatever it is — starts from zero.
- `?? 0` states the intention clearly instead of relying on `|| 1` tricks.
- Empty strings (produced by leading spaces) are skipped.

**Lesson:** a lookup table keyed by **data** must not share its key space with the language's own property names. A bug like this can lie dormant for months until one unlucky word appears — exactly the kind of failure that reaches production.

</details>

## Summary

Arrays store elements in **contiguous** memory, so reading by index is O(1) and loops are cache-friendly, while inserting or removing in the middle is O(n). **Dynamic arrays** grow by doubling, making `push` amortised O(1). **Typed arrays** hold raw numbers efficiently. Strings are **immutable**: reading is O(1), every change creates a new string, and large text is best built with `join`.

A **hash map** applies a **hash function** to each key to choose a **bucket** in an internal array, giving O(1) average lookups. **Collisions** are handled by **chaining** (or open addressing); when the **load factor** passes a threshold, the map **resizes** and rehashes. The worst case is O(n), which attackers exploited through **hash flooding** until **randomised hashing** and input limits became standard. Use `Map` for lookup tables keyed by data, `Set` for membership, and plain objects for fixed-shape records — plain objects as dictionaries can collide with inherited keys.

Five techniques solve a large share of problems: **counting** and **grouping** with hash maps, **two pointers** on sorted data, **sliding windows** that update a running result, and **prefix sums** that answer range totals in O(1).

## Key terms

- **Data structure** — A way of organising data in memory so that certain operations are efficient.
- **Contiguous memory** — A block of memory locations next to each other with no gaps.
- **Dynamic array** — An array that grows automatically by moving to a larger block of memory when full.
- **Typed array** — A fixed-length, contiguous array of a single numeric type, such as `Uint8Array`.
- **Hash function** — A function that turns a key into a number used to decide where to store its value.
- **Hash** — The number produced by a hash function.
- **Bucket** — One of the slots inside a hash map where entries are stored.
- **Collision** — Two different keys mapping to the same bucket.
- **Chaining** — Handling collisions by storing several entries in each bucket as a small list.
- **Open addressing** — Handling collisions by placing an entry in another free bucket.
- **Load factor** — The number of entries in a hash map divided by its number of buckets.
- **Rehashing** — Recomputing every entry's bucket after a hash map is resized.
- **Hash flooding (HashDoS)** — An attack that sends many keys designed to collide, making hash map operations slow.
- **Randomised hashing** — Using a secret random seed in a hash function so attackers cannot predict collisions.
- **Frequency count** — A count of how often each value appears, usually stored in a map.
- **Anagram** — A word formed by rearranging the letters of another word.
- **Two-pointer technique** — Solving a problem by moving two indexes through data, often from both ends.
- **Sliding window** — A range of consecutive elements that moves through data, updating a result as elements enter and leave.
- **Prefix sum** — An array in which each element holds the total of all values before that position, allowing O(1) range totals.
- **Consistent hashing** — A way of spreading keys across servers so that adding or removing a server moves only a small fraction of keys.

## What comes next

Arrays and hash maps are superb for many jobs, but not all. Inserting at the front of a long array is slow. Processing tasks strictly in the order they arrived, or undoing the most recent action, needs a different shape. And some data is naturally a **chain** of items, each pointing to the next.

In the next chapter, **Linked Lists, Stacks and Queues**, you will learn the structures built for these jobs: linked lists that can grow and shrink anywhere in O(1), stacks for "last in, first out" work such as undo and parsing, and queues for "first in, first out" work such as job processing — and how they appear everywhere from your browser's back button to the job queues in large backends.
