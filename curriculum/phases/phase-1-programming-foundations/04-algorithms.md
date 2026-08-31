# Phase 1 — Chapter 4: Algorithms

> *"An algorithm must be seen to be believed."* — Donald Knuth

---

## Chapter Overview

### Why Algorithms Matter

An algorithm is a finite, unambiguous sequence of steps that solves a problem. Every program is an algorithm. The difference between a great engineer and a mediocre one is often the ability to recognize which algorithm to apply — and understanding why it works.

**Real impact:** LinkedIn's feed algorithm determines what 900 million people see. Google's PageRank algorithm decided the order of search results for billions of queries. Uber's dispatch algorithm matches millions of rides per day. The "right" algorithm is the difference between a product that scales and one that crashes.

### Problems It Solves

Algorithms solve the fundamental challenge of **doing more with less**:
- Process 1 billion records in seconds instead of days
- Search 1 trillion web pages in under 100ms
- Route packets across the entire internet in real time
- Compress a 4K video from 100GB to 4GB without perceptible quality loss
- Rank 10 million products by relevance in milliseconds

### Industry Adoption

Algorithm knowledge is a core competency at every tech company. Google, Amazon, Meta, Apple, Microsoft — all their interview processes heavily emphasize algorithmic thinking. Beyond interviews, algorithms appear in:
- **Search engines**: TF-IDF, BM25, PageRank, neural ranking
- **Recommendation systems**: Collaborative filtering, ALS matrix factorization
- **Compression**: Huffman coding, LZ77 (used in gzip, zlib, PNG)
- **Cryptography**: RSA, AES, elliptic curve algorithms
- **Networking**: Routing algorithms, TCP congestion control
- **Machine learning**: Gradient descent, backpropagation

---

## Beginner Theory

### Core Concepts

**Divide and Conquer**: Split the problem into smaller subproblems, solve each, combine.
Example: Merge sort splits the array in half, sorts each half, merges.

**Dynamic Programming**: Solve overlapping subproblems once and store results.
Example: Fibonacci with memoization — compute each value once instead of recomputing exponentially.

**Greedy**: At each step, choose the locally optimal option.
Example: Dijkstra's — always process the nearest unvisited node.

**Backtracking**: Explore all possibilities; abandon (prune) branches that can't lead to a solution.
Example: Sudoku solver — place a digit, check validity, backtrack if stuck.

**Two Pointers**: Use two indices to scan from both ends or at different speeds.
Example: Detect cycle in linked list (Floyd), find pair summing to target.

**Sliding Window**: Maintain a range (window) over an array/string.
Example: Find maximum sum subarray of size k.

### Sorting Algorithms Summary

```
Algorithm    | Best    | Average  | Worst   | Space  | Stable
─────────────┼─────────┼──────────┼─────────┼────────┼───────
Bubble       | O(n)    | O(n²)    | O(n²)   | O(1)   | Yes
Selection    | O(n²)   | O(n²)    | O(n²)   | O(1)   | No
Insertion    | O(n)    | O(n²)    | O(n²)   | O(1)   | Yes
Merge        | O(nlogn)| O(nlogn) | O(nlogn)| O(n)   | Yes
Quick        | O(nlogn)| O(nlogn) | O(n²)   | O(logn)| No
Heap         | O(nlogn)| O(nlogn) | O(nlogn)| O(1)   | No
Counting     | O(n+k)  | O(n+k)   | O(n+k)  | O(k)   | Yes
Radix        | O(nk)   | O(nk)    | O(nk)   | O(n+k) | Yes
TimSort (V8) | O(n)    | O(nlogn) | O(nlogn)| O(n)   | Yes
```

### What "Stable" Actually Means (and Why It Matters)

A sort is stable if elements that compare as EQUAL keep their original relative order after sorting. This sounds academic until you sort by one field while a second field's order still matters.

```javascript
const orders = [
  { id: 1, customer: "Alice", priority: "normal" },
  { id: 2, customer: "Bob",   priority: "high"   },
  { id: 3, customer: "Carol", priority: "normal" },
  { id: 4, customer: "Dave",  priority: "high"   }
];

// Sort by priority — "high" should come first
const byPriority = [...orders].sort((a, b) =>
  a.priority === b.priority ? 0 : a.priority === "high" ? -1 : 1
);

// With a STABLE sort, ties (both "high" orders, both "normal" orders)
// keep their ORIGINAL relative order — Bob still comes before Dave,
// Alice still comes before Carol, because that's how they appeared
// in the input before sorting:
//   [Bob(high), Dave(high), Alice(normal), Carol(normal)]
//
// With an UNSTABLE sort, the engine is free to reorder equal elements
// however is most efficient internally — you could get:
//   [Dave(high), Bob(high), Carol(normal), Alice(normal)]
// Same sort correctness (high still comes before normal), but the
// original submission order within each priority group is LOST.

// Why this matters in practice: if orders were originally listed by
// timestamp (oldest first) and you then sort by priority, a stable sort
// guarantees "within the same priority, oldest is still first" — an
// unstable sort could silently scramble that secondary ordering, which
// is often a real business requirement (e.g., a support ticket queue
// sorted by severity, but FIFO within the same severity level).
```

```
Array.prototype.sort() in JavaScript has been REQUIRED to be stable
since ES2019 — every modern engine (V8, SpiderMonkey, JavaScriptCore)
guarantees stability. This wasn't always true: older V8 versions used
an unstable Quicksort variant for arrays above a size threshold, which
is why "is JS sort stable?" used to be a real gotcha in interviews.
```

---

## Basic Examples

### Sorting Algorithms

```javascript
// Merge Sort — stable, O(n log n), divide and conquer
function mergeSort(arr) {
  if (arr.length <= 1) return arr;

  const mid   = Math.floor(arr.length / 2);
  const left  = mergeSort(arr.slice(0, mid));
  const right = mergeSort(arr.slice(mid));

  return merge(left, right);
}

function merge(left, right) {
  const result = [];
  let i = 0, j = 0;

  while (i < left.length && j < right.length) {
    if (left[i] <= right[j]) result.push(left[i++]);
    else                      result.push(right[j++]);
  }

  return [...result, ...left.slice(i), ...right.slice(j)];
}

console.log(mergeSort([5, 2, 8, 1, 9, 3])); // [1, 2, 3, 5, 8, 9]

// Quick Sort — O(n log n) average, in-place
function quickSort(arr, low = 0, high = arr.length - 1) {
  if (low < high) {
    const pivotIdx = partition(arr, low, high);
    quickSort(arr, low,         pivotIdx - 1);
    quickSort(arr, pivotIdx + 1, high);
  }
  return arr;
}

function partition(arr, low, high) {
  const pivot = arr[high]; // choose last element as pivot
  let i = low - 1;

  for (let j = low; j < high; j++) {
    if (arr[j] <= pivot) {
      i++;
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }
  [arr[i + 1], arr[high]] = [arr[high], arr[i + 1]];
  return i + 1;
}

// Binary Search — O(log n), requires sorted array
function binarySearch(arr, target) {
  let left = 0, right = arr.length - 1;

  while (left <= right) {
    const mid = left + Math.floor((right - left) / 2);
    if (arr[mid] === target) return mid;
    if (arr[mid] < target)  left  = mid + 1;
    else                     right = mid - 1;
  }
  return -1;
}

const sorted = [1, 3, 5, 7, 9, 11, 13];
console.log(binarySearch(sorted, 7));  // 3
console.log(binarySearch(sorted, 6));  // -1
```

### Two Pointers

```javascript
// Find pair that sums to target in sorted array — O(n)
function twoSum(arr, target) {
  let left = 0, right = arr.length - 1;

  while (left < right) {
    const sum = arr[left] + arr[right];
    if (sum === target) return [left, right];
    if (sum < target)  left++;
    else               right--;
  }
  return null;
}

// Remove duplicates from sorted array in-place — O(n)
function removeDuplicates(nums) {
  if (!nums.length) return 0;
  let slow = 0;
  for (let fast = 1; fast < nums.length; fast++) {
    if (nums[fast] !== nums[slow]) {
      nums[++slow] = nums[fast];
    }
  }
  return slow + 1; // new length
}

// Valid palindrome — O(n)
function isPalindrome(s) {
  let left = 0, right = s.length - 1;
  while (left < right) {
    if (s[left] !== s[right]) return false;
    left++;
    right--;
  }
  return true;
}
```

### Sliding Window

```javascript
// Maximum sum subarray of size k — O(n)
function maxSumSubarray(arr, k) {
  let windowSum = arr.slice(0, k).reduce((a, b) => a + b, 0);
  let maxSum    = windowSum;

  for (let i = k; i < arr.length; i++) {
    windowSum += arr[i] - arr[i - k]; // slide: add new, remove old
    maxSum = Math.max(maxSum, windowSum);
  }
  return maxSum;
}

// Longest substring without repeating characters — O(n)
function lengthOfLongestSubstring(s) {
  const lastSeen = new Map();
  let maxLen = 0;
  let left   = 0;

  for (let right = 0; right < s.length; right++) {
    const char = s[right];
    if (lastSeen.has(char) && lastSeen.get(char) >= left) {
      left = lastSeen.get(char) + 1; // shrink window
    }
    lastSeen.set(char, right);
    maxLen = Math.max(maxLen, right - left + 1);
  }
  return maxLen;
}

console.log(lengthOfLongestSubstring("abcabcbb")); // 3 ("abc")
console.log(lengthOfLongestSubstring("pwwkew"));   // 3 ("wke")
```

### Dynamic Programming

```javascript
// Fibonacci — memoization (top-down DP)
function fibonacci(n, memo = {}) {
  if (n <= 1) return n;
  if (memo[n]) return memo[n];
  return (memo[n] = fibonacci(n - 1, memo) + fibonacci(n - 2, memo));
}

// Fibonacci — tabulation (bottom-up DP) — more space efficient
function fibDP(n) {
  if (n <= 1) return n;
  const dp = [0, 1];
  for (let i = 2; i <= n; i++) {
    dp[i] = dp[i - 1] + dp[i - 2];
  }
  return dp[n];
}

// Fibonacci with O(1) space
function fibOptimal(n) {
  if (n <= 1) return n;
  let prev = 0, curr = 1;
  for (let i = 2; i <= n; i++) {
    [prev, curr] = [curr, prev + curr];
  }
  return curr;
}

// Coin Change — classic DP
// Given coins [1, 5, 10, 25] and amount 36, find minimum coins
function coinChange(coins, amount) {
  const dp = new Array(amount + 1).fill(Infinity);
  dp[0] = 0;

  for (let i = 1; i <= amount; i++) {
    for (const coin of coins) {
      if (coin <= i) {
        dp[i] = Math.min(dp[i], dp[i - coin] + 1);
      }
    }
  }

  return dp[amount] === Infinity ? -1 : dp[amount];
}

console.log(coinChange([1, 5, 10, 25], 36)); // 3 (25 + 10 + 1)
console.log(coinChange([2], 3));              // -1 (impossible)

// Longest Common Subsequence — O(m×n) time and space
function lcs(s1, s2) {
  const m  = s1.length, n = s2.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }
  return dp[m][n];
}

console.log(lcs("ABCBDAB", "BDCAB")); // 4 ("BCAB" or "BDAB")
```

### Backtracking

```javascript
// Generate all permutations of an array
function permutations(arr) {
  const result = [];

  function backtrack(current, remaining) {
    if (remaining.length === 0) {
      result.push([...current]);
      return;
    }
    for (let i = 0; i < remaining.length; i++) {
      current.push(remaining[i]);
      backtrack(current, [...remaining.slice(0, i), ...remaining.slice(i + 1)]);
      current.pop(); // backtrack
    }
  }

  backtrack([], arr);
  return result;
}

console.log(permutations([1, 2, 3]));
// [[1,2,3], [1,3,2], [2,1,3], [2,3,1], [3,1,2], [3,2,1]]

// N-Queens problem
function solveNQueens(n) {
  const solutions = [];
  const board     = Array.from({ length: n }, () => new Array(n).fill("."));

  function isValid(row, col) {
    // Check column
    for (let r = 0; r < row; r++) {
      if (board[r][col] === "Q") return false;
    }
    // Check upper-left diagonal
    for (let r = row - 1, c = col - 1; r >= 0 && c >= 0; r--, c--) {
      if (board[r][c] === "Q") return false;
    }
    // Check upper-right diagonal
    for (let r = row - 1, c = col + 1; r >= 0 && c < n; r--, c++) {
      if (board[r][c] === "Q") return false;
    }
    return true;
  }

  function backtrack(row) {
    if (row === n) {
      solutions.push(board.map(row => row.join("")));
      return;
    }
    for (let col = 0; col < n; col++) {
      if (isValid(row, col)) {
        board[row][col] = "Q";
        backtrack(row + 1);
        board[row][col] = "."; // backtrack
      }
    }
  }

  backtrack(0);
  return solutions;
}

console.log(solveNQueens(4).length); // 2 solutions for 4-queens
```

---

## Intermediate Concepts

### Greedy Algorithms

```javascript
// Activity Selection Problem
// Given activities with start/end times, select maximum non-overlapping activities
function activitySelection(activities) {
  // Sort by end time
  activities.sort((a, b) => a.end - b.end);

  const selected = [activities[0]];
  let lastEnd = activities[0].end;

  for (let i = 1; i < activities.length; i++) {
    if (activities[i].start >= lastEnd) {
      selected.push(activities[i]);
      lastEnd = activities[i].end;
    }
  }
  return selected;
}

// Huffman Encoding (compression)
// Build optimal prefix-free encoding based on character frequencies
function buildHuffman(text) {
  const freq = new Map();
  for (const char of text) freq.set(char, (freq.get(char) || 0) + 1);

  // Priority queue (simplified — normally use a min-heap)
  const nodes = [...freq.entries()].map(([char, freq]) => ({ char, freq, left: null, right: null }));
  nodes.sort((a, b) => a.freq - b.freq);

  while (nodes.length > 1) {
    const left  = nodes.shift();
    const right = nodes.shift();
    const parent = { char: null, freq: left.freq + right.freq, left, right };
    const insertAt = nodes.findIndex(n => n.freq > parent.freq);
    nodes.splice(insertAt === -1 ? nodes.length : insertAt, 0, parent);
  }

  // Build code table from tree
  const codes = {};
  function traverse(node, code) {
    if (!node.left && !node.right) { codes[node.char] = code; return; }
    traverse(node.left, code + "0");
    traverse(node.right, code + "1");
  }
  traverse(nodes[0], "");
  return codes;
}

const codes = buildHuffman("abracadabra");
// a: "0", b: "110", r: "10", c: "1110", d: "1111" (example)
```

### Graph Algorithms

```javascript
// Topological Sort (for dependency resolution)
function topologicalSort(graph) {
  const inDegree = new Map();
  const queue    = [];
  const result   = [];

  // Initialize in-degrees
  for (const [vertex, neighbors] of graph) {
    if (!inDegree.has(vertex)) inDegree.set(vertex, 0);
    for (const neighbor of neighbors) {
      inDegree.set(neighbor, (inDegree.get(neighbor) || 0) + 1);
    }
  }

  // Start with nodes that have no prerequisites
  for (const [vertex, degree] of inDegree) {
    if (degree === 0) queue.push(vertex);
  }

  while (queue.length) {
    const vertex = queue.shift();
    result.push(vertex);
    for (const neighbor of (graph.get(vertex) || [])) {
      inDegree.set(neighbor, inDegree.get(neighbor) - 1);
      if (inDegree.get(neighbor) === 0) queue.push(neighbor);
    }
  }

  // If result doesn't include all vertices, there's a cycle
  return result.length === graph.size ? result : null;
}

// Package dependency example
const deps = new Map([
  ["app",    ["react", "axios"]],
  ["react",  ["js-tokens"]],
  ["axios",  []],
  ["js-tokens", []]
]);

console.log(topologicalSort(deps));
// ["js-tokens", "axios", "react", "app"] — valid build order

// Bellman-Ford (handles negative weights, detects negative cycles)
function bellmanFord(graph, V, source) {
  const dist = new Array(V).fill(Infinity);
  dist[source] = 0;

  // Relax all edges V-1 times
  for (let i = 0; i < V - 1; i++) {
    for (const [u, v, w] of graph) {
      if (dist[u] !== Infinity && dist[u] + w < dist[v]) {
        dist[v] = dist[u] + w;
      }
    }
  }

  // Check for negative-weight cycles
  for (const [u, v, w] of graph) {
    if (dist[u] !== Infinity && dist[u] + w < dist[v]) {
      return null; // negative cycle detected
    }
  }

  return dist;
}
```

### String Algorithms

```javascript
// KMP (Knuth-Morris-Pratt) — O(n + m) string search
function kmpSearch(text, pattern) {
  const n = text.length, m = pattern.length;

  // Build failure function (partial match table)
  const lps = new Array(m).fill(0);
  let len = 0, i = 1;
  while (i < m) {
    if (pattern[i] === pattern[len]) {
      lps[i++] = ++len;
    } else if (len !== 0) {
      len = lps[len - 1];
    } else {
      lps[i++] = 0;
    }
  }

  // Search
  const matches = [];
  i = 0; let j = 0;
  while (i < n) {
    if (text[i] === pattern[j]) { i++; j++; }
    if (j === m) {
      matches.push(i - j); // found at index i-j
      j = lps[j - 1];
    } else if (i < n && text[i] !== pattern[j]) {
      j = j !== 0 ? lps[j - 1] : 0;
      if (j === 0) i++;
    }
  }
  return matches;
}

console.log(kmpSearch("AABAACAADAABAABA", "AABA")); // [0, 9, 12]

// Rabin-Karp — rolling hash for string search, O(n + m) average
function rabinKarp(text, pattern) {
  const BASE = 31, MOD = 1e9 + 9;
  const n = text.length, m = pattern.length;

  function hash(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) {
      h = (h * BASE + s.charCodeAt(i)) % MOD;
    }
    return h;
  }

  const patHash    = hash(pattern);
  let   windowHash = hash(text.slice(0, m));
  let   basePow    = 1;
  for (let i = 0; i < m - 1; i++) basePow = (basePow * BASE) % MOD;

  const matches = [];
  for (let i = 0; i <= n - m; i++) {
    if (windowHash === patHash && text.slice(i, i + m) === pattern) {
      matches.push(i);
    }
    if (i < n - m) {
      windowHash = ((windowHash - text.charCodeAt(i) * basePow % MOD + MOD) * BASE
                    + text.charCodeAt(i + m)) % MOD;
    }
  }
  return matches;
}
```

---

## Advanced Concepts

### Advanced Dynamic Programming

```javascript
// 0/1 Knapsack — O(n×W)
function knapsack(weights, values, capacity) {
  const n  = weights.length;
  const dp = Array.from({ length: n + 1 }, () => new Array(capacity + 1).fill(0));

  for (let i = 1; i <= n; i++) {
    for (let w = 0; w <= capacity; w++) {
      dp[i][w] = dp[i - 1][w]; // don't take item i
      if (weights[i - 1] <= w) {
        dp[i][w] = Math.max(dp[i][w], dp[i - 1][w - weights[i - 1]] + values[i - 1]);
      }
    }
  }
  return dp[n][capacity];
}

// Edit Distance (Levenshtein) — O(m×n)
function editDistance(s1, s2) {
  const m = s1.length, n = s2.length;
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => i === 0 ? j : j === 0 ? i : 0)
  );

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(
          dp[i - 1][j],     // delete
          dp[i][j - 1],     // insert
          dp[i - 1][j - 1]  // replace
        );
      }
    }
  }
  return dp[m][n];
}

console.log(editDistance("kitten", "sitting")); // 3

// Matrix Chain Multiplication — O(n³)
// Determines optimal order to multiply a chain of matrices
function matrixChain(dims) {
  const n  = dims.length - 1;
  const dp = Array.from({ length: n }, () => new Array(n).fill(0));

  for (let len = 2; len <= n; len++) {
    for (let i = 0; i <= n - len; i++) {
      const j = i + len - 1;
      dp[i][j] = Infinity;
      for (let k = i; k < j; k++) {
        const cost = dp[i][k] + dp[k + 1][j] + dims[i] * dims[k + 1] * dims[j + 1];
        dp[i][j]   = Math.min(dp[i][j], cost);
      }
    }
  }
  return dp[0][n - 1];
}
```

### Divide and Conquer — Advanced

```javascript
// Closest Pair of Points — O(n log n)
// Naive: O(n²). Divide and conquer beats it significantly for large n.
function closestPair(points) {
  points.sort((a, b) => a[0] - b[0]); // sort by x

  function dist(p1, p2) {
    return Math.sqrt((p1[0] - p2[0]) ** 2 + (p1[1] - p2[1]) ** 2);
  }

  function closest(pts) {
    const n = pts.length;
    if (n <= 3) {
      let minDist = Infinity;
      for (let i = 0; i < n; i++)
        for (let j = i + 1; j < n; j++)
          minDist = Math.min(minDist, dist(pts[i], pts[j]));
      return minDist;
    }

    const mid   = Math.floor(n / 2);
    const left  = closest(pts.slice(0, mid));
    const right = closest(pts.slice(mid));
    let   d     = Math.min(left, right);

    // Check strip around dividing line
    const midX  = pts[mid][0];
    const strip = pts.filter(p => Math.abs(p[0] - midX) < d);
    strip.sort((a, b) => a[1] - b[1]);

    for (let i = 0; i < strip.length; i++) {
      for (let j = i + 1; j < strip.length && strip[j][1] - strip[i][1] < d; j++) {
        d = Math.min(d, dist(strip[i], strip[j]));
      }
    }
    return d;
  }

  return closest(points);
}

// Count inversions in array (merge sort variant) — O(n log n)
// An inversion is a pair (i,j) where i < j but arr[i] > arr[j]
// Used in: recommendation systems (how "unsorted" is a ranking?)
function countInversions(arr) {
  if (arr.length <= 1) return { sorted: arr, count: 0 };

  const mid   = Math.floor(arr.length / 2);
  const left  = countInversions(arr.slice(0, mid));
  const right = countInversions(arr.slice(mid));

  let count = left.count + right.count;
  const merged = [];
  let i = 0, j = 0;

  while (i < left.sorted.length && j < right.sorted.length) {
    if (left.sorted[i] <= right.sorted[j]) {
      merged.push(left.sorted[i++]);
    } else {
      merged.push(right.sorted[j++]);
      count += left.sorted.length - i; // all remaining left elements are inversions
    }
  }

  return {
    sorted: [...merged, ...left.sorted.slice(i), ...right.sorted.slice(j)],
    count
  };
}

console.log(countInversions([2, 4, 1, 3, 5]).count); // 3
```

### Randomized Algorithms

```javascript
// QuickSelect — O(n) average, find kth smallest element
function quickSelect(arr, k) {
  const pivot  = arr[Math.floor(Math.random() * arr.length)];
  const left   = arr.filter(x => x < pivot);
  const middle = arr.filter(x => x === pivot);
  const right  = arr.filter(x => x > pivot);

  if (k <= left.length) {
    return quickSelect(left, k);
  } else if (k <= left.length + middle.length) {
    return pivot; // pivot is the kth smallest
  } else {
    return quickSelect(right, k - left.length - middle.length);
  }
}

console.log(quickSelect([3, 1, 4, 1, 5, 9, 2, 6], 4)); // 4th smallest = 3

// Reservoir Sampling — O(n) — sample k items from stream of unknown size
function reservoirSample(stream, k) {
  const reservoir = stream.slice(0, k);

  for (let i = k; i < stream.length; i++) {
    const j = Math.floor(Math.random() * (i + 1));
    if (j < k) {
      reservoir[j] = stream[i];
    }
  }
  return reservoir;
}

// Fisher-Yates shuffle — O(n) unbiased shuffle
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
```

---

## Industry Usage

### Search Engines
- **Inverted index**: For each word, stores a list of documents containing it. O(1) lookup per term.
- **TF-IDF**: Ranks documents by term frequency × inverse document frequency — classic ranking algorithm.
- **BM25**: More advanced ranking; used by Elasticsearch as default.
- **PageRank**: Graph algorithm. Models web as directed graph; iteratively distributes "importance" based on incoming links.

### Compression
- **Huffman coding**: Variable-length prefix codes based on frequency. Used in: DEFLATE (used in gzip, ZIP, PNG, HTTP/2), JPEG (for entropy coding).
- **LZ77/LZ78**: Dictionary-based compression. LZ77 underlies gzip, zlib; LZ78 underlies GIF, most Unix compress.
- **Brotli**: Google's compression for web content. 20-26% better than gzip.

### Cryptography
- **RSA**: Based on difficulty of factoring large numbers. Key exchange, digital signatures.
- **AES**: Symmetric block cipher. TLS, disk encryption, file encryption.
- **SHA-256**: Cryptographic hash. Git commit hashes, Bitcoin proof-of-work, certificate fingerprints.
- **bcrypt/argon2**: Password hashing — deliberately slow to resist brute force.

### Machine Learning
- **Gradient Descent**: Optimization algorithm for training neural networks. At each step, move in direction of steepest loss decrease.
- **k-means clustering**: Partition n observations into k clusters. Used in: recommendation systems, customer segmentation, image compression.
- **Collaborative filtering**: Matrix factorization for recommendation. Netflix, Spotify, Amazon recommendations.

---

## Security

### Algorithm Security Vulnerabilities

**1. Timing Attacks on Comparisons**
```javascript
// Bad — comparison short-circuits; timing reveals password length!
function checkPassword(input, hash) {
  return hash(input) === storedHash;
}

// Good — constant-time comparison
const crypto = require("crypto");
function safeCompare(a, b) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    // Still compare to avoid timing leak on length
    crypto.timingSafeEqual(bufA, Buffer.alloc(bufA.length));
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}
```

**2. Hash Collision Attacks**
Naive hash functions can be attacked. For password storage, use bcrypt or argon2 (computationally expensive, salted). For general hash maps, Node.js V8 randomizes the hash seed.

**3. Integer Overflow**
JavaScript numbers are 64-bit floats — safe integers up to 2^53 - 1. For cryptographic purposes or financial calculations, use `BigInt`.

---

## Performance

### Algorithm Selection by Input Size

```
n ≤ 10:          Any algorithm — even O(n!) is fine
n ≤ 100:         O(n²) algorithms OK
n ≤ 10,000:      O(n²) starts to be slow; prefer O(n log n)
n ≤ 1,000,000:   Must use O(n log n) or better
n ≤ 100,000,000: Must use O(n) or O(n log n) at most
n > 100,000,000: Streaming algorithms, approximate algorithms, parallelism
```

### JavaScript-Specific Performance

```javascript
// V8 optimizes Array.sort — use it; don't implement your own sort for arrays
// V8 uses TimSort: merge sort + insertion sort hybrid
arr.sort((a, b) => a - b); // fast, stable in V8 8.0+

// For large numeric arrays, use Typed Arrays + sort
const typedArr = new Int32Array([5, 3, 8, 1, 9]);
typedArr.sort(); // integer sort, no comparator needed for ascending

// String operations that look O(n) but are O(n²) in naive implementations
// String concatenation in a loop is O(n²) — use array join instead
// Bad:
let result = "";
for (const item of items) result += item; // O(n²) in many engines

// Good:
const result = items.join(""); // O(n)
```

---

## Debugging

### Common Algorithm Bugs

**1. Off-by-one in loops**
```javascript
// Classic error in binary search — using wrong boundary
// Always verify: does this handle n=0, n=1, n=2?
// Test with: empty array, single element, two elements, target at boundaries
```

**2. Infinite recursion without proper base case**
```javascript
// Always check: does the recursive call move toward the base case?
// Does the base case cover all termination conditions?
function fib(n) {
  if (n < 0) throw new Error("n must be non-negative"); // guard!
  if (n <= 1) return n;
  return fib(n - 1) + fib(n - 2);
}
```

**3. Modifying array while iterating**
```javascript
// Dangerous — can skip elements or cause infinite loops
const arr = [1, 2, 3, 4, 5];
for (let i = 0; i < arr.length; i++) {
  if (arr[i] % 2 === 0) arr.splice(i, 1); // BUG: skips element after deletion
}

// Safe — iterate backwards
for (let i = arr.length - 1; i >= 0; i--) {
  if (arr[i] % 2 === 0) arr.splice(i, 1); // OK: deletions don't affect earlier indices
}

// Best — filter creates a new array
const odds = arr.filter(x => x % 2 !== 0);
```

---

## Interview Preparation

### Beginner Questions

**Q1: What is the time complexity of merge sort and why is it O(n log n)?**

A: Merge sort has time complexity O(n log n). At each level of recursion, we do O(n) work (merging). The number of levels is log₂(n) (we halve the array each time until we reach single elements). Therefore total work = n × log n.

**Q2: What is the difference between memoization and tabulation?**

A: Both are dynamic programming techniques that avoid recomputing the same subproblems.
- **Memoization** (top-down): Start from the original problem, recursively break into subproblems, cache results. Lazy — only computes what's needed.
- **Tabulation** (bottom-up): Start from smallest subproblems, build up table of results. Eager — computes all subproblems. Often faster due to no recursion overhead and better cache behavior.

**Q3: When would you use a greedy algorithm?**

A: When the locally optimal choice at each step leads to a globally optimal solution. This property (the "greedy choice property") must be proven or assumed. Examples: activity selection, Huffman coding, Dijkstra's algorithm, Kruskal's MST. Greedy fails for: 0/1 knapsack, coin change with arbitrary denominations.

### Intermediate Questions

**Q4: Explain divide and conquer and give three examples.**

A: Divide and conquer splits a problem into independent subproblems, solves them recursively, and combines results.
1. **Merge sort**: Split array, sort each half, merge.
2. **Binary search**: Compare with middle element, search left or right half.
3. **Fast Fourier Transform (FFT)**: Used in signal processing, polynomial multiplication, audio codecs.

**Q5: What is the difference between BFS and DFS for finding the shortest path?**

A: BFS guarantees the shortest path in an **unweighted** graph because it explores nodes layer by layer (all nodes at distance 1, then distance 2, etc.). DFS does not guarantee shortest path — it may find a path but not the shortest one. For weighted graphs, use Dijkstra's (non-negative weights) or Bellman-Ford (negative weights).

### Senior Questions

**Q6: Explain the master theorem for analyzing divide and conquer algorithms.**

A: The master theorem provides a formula for recurrences of the form T(n) = aT(n/b) + f(n) where a is number of subproblems, b is the branching factor, f(n) is the work to combine.

Three cases:
1. f(n) < O(n^log_b(a)): T(n) = O(n^log_b(a)) — subproblem work dominates
2. f(n) = O(n^log_b(a)): T(n) = O(n^log_b(a) × log n) — equal work
3. f(n) > O(n^log_b(a)): T(n) = O(f(n)) — combining work dominates

Merge sort: a=2, b=2, f(n)=O(n) → log₂(2)=1 → f(n)=O(n^1) → case 2 → O(n log n) ✓

**Q7: Explain NP-completeness and its practical implications.**

A: P = problems solvable in polynomial time. NP = problems whose solutions can be verified in polynomial time. NP-complete = problems that are in NP and at least as hard as every problem in NP (e.g., Traveling Salesman, 3-SAT, vertex cover). No polynomial-time algorithm is known for NP-complete problems. In practice: use approximation algorithms, heuristics, or exponential algorithms with aggressive pruning for small inputs.

### Coding Questions

**Q8: Find the longest increasing subsequence in O(n log n).**
```javascript
function lis(nums) {
  const tails = []; // tails[i] = smallest tail of all increasing subsequences of length i+1
  for (const num of nums) {
    let lo = 0, hi = tails.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (tails[mid] < num) lo = mid + 1;
      else                  hi = mid;
    }
    tails[lo] = num; // replace or extend
  }
  return tails.length;
}

console.log(lis([10, 9, 2, 5, 3, 7, 101, 18])); // 4 ([2,5,7,101] or [2,3,7,101])
```

---

## Practical Tasks

### Beginner (10 Tasks)
1. Implement bubble sort and count the number of swaps for a given array.
2. Implement binary search iteratively and recursively.
3. Write a function to check if a string is an anagram of another.
4. Find all pairs in an array that sum to a given target.
5. Implement the Fibonacci sequence iteratively using O(1) space.
6. Given a sorted rotated array (e.g., [4,5,6,7,0,1,2]), find a target.
7. Implement the linear search and explain when it beats binary search.
8. Find the maximum sum subarray (Kadane's algorithm).
9. Count the number of occurrences of a character in a string in O(n).
10. Reverse words in a sentence in-place.

### Intermediate (10 Tasks)
1. Implement merge sort and measure its performance vs. Array.prototype.sort.
2. Implement the Longest Common Subsequence algorithm.
3. Solve the coin change problem using both memoization and tabulation.
4. Find the number of islands in a 2D binary grid (BFS/DFS).
5. Implement Dijkstra's algorithm using a priority queue.
6. Generate all valid combinations of N pairs of parentheses.
7. Find the minimum number of operations to convert one string to another (edit distance).
8. Solve the 0/1 knapsack problem.
9. Implement topological sort for a dependency graph.
10. Find all strongly connected components using Tarjan's algorithm.

### Advanced (10 Tasks)
1. Implement the A* search algorithm for grid pathfinding with obstacles.
2. Solve the Traveling Salesman Problem for small n using dynamic programming (Held-Karp).
3. Implement FFT for polynomial multiplication.
4. Find the maximum flow in a flow network (Ford-Fulkerson / Edmonds-Karp).
5. Implement suffix array construction in O(n log n).
6. Solve the skyline problem for a list of buildings.
7. Implement a segment tree supporting range sum queries and point updates.
8. Solve the "buy and sell stock" variants (at most k transactions, with cooldown, with fee).
9. Implement the randomized Quickselect and prove O(n) expected time.
10. Design and implement a bidirectional BFS for shortest path in a graph.

---

## Mini Project

### Algorithm Visualizer

Build a web-based algorithm visualizer (React):
- Visualize merge sort, quick sort, bubble sort with animated array bars
- Show step-by-step explanation at each comparison/swap
- Allow speed control
- Compare two sorting algorithms side by side with the same data

---

## Production Project

### Search Engine Prototype

Build a simple full-text search engine:
- **Indexing**: Read documents, tokenize, build inverted index (word → [docId, position][])
- **Ranking**: TF-IDF scoring
- **Query processing**: Boolean queries (AND/OR/NOT), phrase search
- **Autocomplete**: Trie-based completion from indexed terms
- **Performance**: Index 100k documents, return results in < 10ms

---

## Capstone Project

### Route Planning Service

Build a routing service (simplified Google Maps):
- Parse OpenStreetMap data (nodes/edges with real distances)
- Implement Dijkstra's for fastest route
- Implement A* with haversine heuristic for more efficient search
- Add support for multiple waypoints (TSP approximation)
- Build an API: `POST /route` `{ start, end }` → `{ path, distance, estimatedTime }`
- Compare A* vs Dijkstra performance on real map data

---

## Self Assessment

1. What is Big O notation? What is the difference between O(n log n) and O(n²) for n = 10,000?
2. Explain the difference between memoization and tabulation in dynamic programming.
3. What is the Kadane's algorithm and what problem does it solve?
4. How does merge sort work? What is its time and space complexity?
5. Why does binary search require a sorted array? What is its time complexity?
6. Explain the two-pointer technique. Give two examples where it's applicable.
7. What is a greedy algorithm? Give an example where greedy works and one where it fails.
8. How does Dijkstra's algorithm work? When does it fail?
9. What is backtracking? How does it differ from brute force?
10. What is dynamic programming? What are the two conditions for applying it?
11. What is the time complexity of topological sort?
12. Explain the sliding window technique. Give an example.
13. What is the difference between BFS and DFS? Which finds the shortest path?
14. What is QuickSelect and why is it O(n) on average?
15. How does KMP string matching improve over naive string search?

---

## Cheat Sheet

### Sorting
```
Merge sort:  O(n log n) stable, O(n) space — best for linked lists, stable sort needed
Quick sort:  O(n log n) avg, O(n²) worst, O(log n) space — best cache performance
Heap sort:   O(n log n) in-place — constant space, not stable
Tim sort:    O(n log n) stable — used in Python, Java, V8 JavaScript
Counting sort: O(n+k) — when range k of values is small
Radix sort:  O(nk) — for fixed-width integers/strings
```

### Classic DP Patterns
```
Fibonacci:       dp[i] = dp[i-1] + dp[i-2]
Coin change:     dp[i] = min(dp[i-coin]+1) for coin in coins
Knapsack:        dp[i][w] = max(dp[i-1][w], dp[i-1][w-wt[i]]+val[i])
LCS:             dp[i][j] = dp[i-1][j-1]+1 if match, else max(dp[i-1][j],dp[i][j-1])
Edit distance:   dp[i][j] = dp[i-1][j-1] if match, else 1+min(del,ins,rep)
LIS:             Binary search on tails array — O(n log n)
```

### Graph Algorithm Summary
```
BFS:             O(V+E) — shortest path unweighted, level traversal
DFS:             O(V+E) — cycle detection, topological sort, SCC
Dijkstra:        O((V+E) log V) — shortest path positive weights
Bellman-Ford:    O(V·E) — shortest path with negative weights
Floyd-Warshall:  O(V³) — all-pairs shortest paths
Kruskal's MST:   O(E log E) — minimum spanning tree
Prim's MST:      O((V+E) log V) — minimum spanning tree (dense graphs)
Topological:     O(V+E) — dependency ordering (DAG only)
```

### Recursion Template
```javascript
function solve(input) {
  // 1. Base case
  if (base_condition) return base_value;

  // 2. Recursive case
  const subResult = solve(smaller_input);

  // 3. Combine
  return combine(subResult, current_element);
}
```

### Backtracking Template
```javascript
function backtrack(state, choices) {
  if (is_solution(state)) {
    results.push([...state]);
    return;
  }
  for (const choice of choices) {
    if (is_valid(choice, state)) {
      state.push(choice);          // choose
      backtrack(state, next_choices(choices, choice));
      state.pop();                 // unchoose (backtrack)
    }
  }
}
```
