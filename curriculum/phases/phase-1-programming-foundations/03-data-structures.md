# Phase 1 — Chapter 3: Data Structures

> *"Bad programmers worry about the code. Good programmers worry about data structures and their relationships."* — Linus Torvalds

---

## Chapter Overview

### Why Data Structures Exist

A data structure is a way of organizing data in memory so that it can be accessed and modified efficiently. The choice of data structure determines the performance of your entire application.

Without data structures, every problem would require custom, ad-hoc memory management. Data structures are the "containers" that computer science has discovered and proven to be optimal for specific patterns of use.

**The fundamental insight:** Every operation on data has a cost — accessing an element, searching for an element, inserting, deleting. Different data structures make different operations fast or slow. Choosing the right data structure is the most important engineering decision in algorithm design.

### Problems It Solves

- **Efficient search**: A sorted array with binary search finds an item in O(log n) — in a list of 1 billion items, that's 30 comparisons. Linear search requires 500 million on average.
- **Fast insertion/deletion**: A linked list inserts in O(1); an array requires O(n) to shift elements.
- **Priority management**: A heap finds the minimum/maximum in O(1).
- **Key-value lookup**: A hash map retrieves any value in O(1) average time.
- **Hierarchical data**: Trees model file systems, HTML DOM, organization charts.
- **Graph traversal**: Graphs model social networks, routing, dependency resolution.

### Industry Adoption

Data structures are the foundation of every system:
- **Google's PageRank**: Graph data structure (directed graph of web pages)
- **DNS resolution**: Trie (prefix tree) for domain lookups
- **File systems**: B-trees (ext4, NTFS, HFS+)
- **Databases**: B+ trees for indexes, hash tables for in-memory caches
- **Compilers**: Abstract Syntax Trees, symbol tables (hash maps)
- **Undo/Redo**: Stacks
- **Breadth-first web crawlers**: Queues
- **Auto-complete**: Tries
- **Redis**: Skip lists (sorted sets), hash tables, linked lists (lists)

### Real-World Examples

| Data Structure | Real-World Use |
|----------------|---------------|
| **Array** | Pixels in an image, CSV rows, API response items |
| **Linked List** | Browser history (back/forward), Redis List |
| **Stack** | Call stack, undo history, expression parsing |
| **Queue** | Task queues (BullMQ), print queues, BFS algorithm |
| **Hash Map** | Session storage, DNS cache, database index |
| **Tree (BST)** | Database index (simplified), sorted collections |
| **Tree (B+)** | PostgreSQL, MySQL indexes — optimized for disk I/O |
| **Heap** | Priority queues, Dijkstra's algorithm, median finding |
| **Trie** | Autocomplete, spell checkers, IP routing |
| **Graph** | Social networks, road maps, package dependency trees |

### When NOT to Use Complex Data Structures

- **Use an array** when you have a small, fixed-size dataset and linear search is acceptable
- **Use the simplest structure that works** — premature optimization is the root of all evil
- **Consider readability**: a sorted array + binary search is sometimes better than a self-balancing BST because it's simpler to implement and understand
- For most application-level programming, arrays + hash maps solve 90% of problems

---

## Beginner Theory

### Core Concepts

**Big O Notation** — the language of performance

Big O notation describes how an algorithm's time or space requirements grow as the input size (`n`) grows. It describes the *worst case* and *upper bound*.

```
O(1)       — Constant: regardless of input size, takes the same time
O(log n)   — Logarithmic: doubles input → one extra operation (binary search)
O(n)       — Linear: one operation per element (array scan)
O(n log n) — Log-linear: merge sort, heap sort
O(n²)      — Quadratic: nested loops (bubble sort, naive search)
O(2ⁿ)      — Exponential: brute-force subset enumeration
O(n!)      — Factorial: brute-force permutations (travelling salesman brute force)
```

**Complexity growth visualization:**
```
n = 1,000 operations for each:
O(1)      = 1
O(log n)  = 10
O(n)      = 1,000
O(n log n)= 10,000
O(n²)     = 1,000,000
O(2ⁿ)     = 10^301 (unreachable)
```

### Terminology

| Term | Definition |
|------|-----------|
| **Time complexity** | How execution time grows with input size |
| **Space complexity** | How memory usage grows with input size |
| **Amortized complexity** | Average cost per operation over a sequence of operations |
| **Worst case** | Maximum time for any input of size n |
| **Best case** | Minimum time (often not interesting) |
| **Average case** | Expected time over random inputs |
| **In-place** | Algorithm uses O(1) extra space (operates on the data itself) |
| **Stable sort** | Equal elements maintain their original relative order |
| **Node** | An element in a linked list, tree, or graph |
| **Edge** | A connection between two nodes in a graph |
| **Root** | The top node of a tree |
| **Leaf** | A node with no children |
| **Height** | Longest path from root to leaf |
| **Depth** | Distance from root to a given node |

### Simple Diagrams

**Array (index-based):**
```
Index:  0    1    2    3    4
       ┌────┬────┬────┬────┬────┐
Data:  │"a" │"b" │"c" │"d" │"e" │
       └────┴────┴────┴────┴────┘
Access: O(1) — arr[2] directly reads memory address (base + 2 * elementSize)
Insert at end: O(1) amortized
Insert at middle: O(n) — must shift elements right
```

**Linked List:**
```
Head ──► [A│●]──► [B│●]──► [C│●]──► [D│null]
          data next   data next

Access: O(n) — must traverse from head
Insert at head: O(1)
Insert after known node: O(1)
Search: O(n)
```

**Stack (LIFO — Last In, First Out):**
```
push(D) →  ┌───┐   pop() → D
           │ D │
           │ C │
           │ B │
           │ A │   ← bottom
           └───┘
```

**Queue (FIFO — First In, First Out):**
```
enqueue(D) →  front [A][B][C][D] back  → dequeue() → A
```

**Binary Search Tree:**
```
         50
        /   \
      30     70
     /  \   /  \
   20   40 60   80

Left child < parent < right child
Search: O(log n) average, O(n) worst (unbalanced)
```

**Hash Map:**
```
Key "alice" → hash function → index 3
Key "bob"   → hash function → index 7
Key "charlie" → hash function → index 1

Buckets:
[0] → empty
[1] → ("charlie", {id: 3})
[2] → empty
[3] → ("alice", {id: 1})
...
[7] → ("bob", {id: 2})

Lookup: O(1) average
```

---

## Basic Examples

### Understanding Amortized Complexity

"O(1) amortized" is used throughout this chapter, but it's worth understanding exactly what it means, because it's not the same claim as "O(1) always."

```
A dynamic array (like a JS array) doesn't resize on every push — it would
be wasteful to reallocate memory for every single element added. Instead,
when the array's backing storage is full, it allocates a NEW block of
memory (typically DOUBLE the current size) and copies every existing
element into it.

Sequence of 8 pushes into an array that starts with capacity 1:
  push 1: capacity 1 full → resize to 2, copy 1 element   → cost: 2
  push 2: capacity 2 full → resize to 4, copy 2 elements  → cost: 3
  push 3: fits in capacity 4                              → cost: 1
  push 4: capacity 4 full → resize to 8, copy 4 elements  → cost: 5
  push 5-8: all fit in capacity 8                         → cost: 1 each

Total cost for 8 pushes: 2+3+1+5+1+1+1+1 = 15
Average cost per push:   15 / 8 ≈ 1.9 → rounds to O(1)

This is what "amortized" means: individual operations can occasionally be
expensive (the O(n) resize-and-copy), but SPREAD ACROSS a long sequence of
operations, the average cost per operation is O(1). It is a claim about
the average over many calls, not a guarantee about any single call —
which is why amortized O(1) operations can occasionally cause a visible
latency spike in performance-sensitive code (a very large array push
occasionally taking noticeably longer than the others).
```

### In-Place vs. Out-of-Place Operations

"In-place" means an algorithm transforms the input using only O(1) extra memory — it doesn't allocate a new data structure proportional to the input size. This distinction matters directly for memory usage at scale.

```javascript
// Out-of-place reverse — allocates a full NEW array (O(n) extra space)
function reverseOutOfPlace(arr) {
  const result = [];
  for (let i = arr.length - 1; i >= 0; i--) {
    result.push(arr[i]);
  }
  return result; // original `arr` is untouched
}

// In-place reverse — mutates the ORIGINAL array using only two index
// variables as extra memory (O(1) extra space), swapping from both ends
function reverseInPlace(arr) {
  let left = 0, right = arr.length - 1;
  while (left < right) {
    [arr[left], arr[right]] = [arr[right], arr[left]]; // swap
    left++;
    right--;
  }
  return arr; // same array, now reversed
}

const a = [1, 2, 3, 4, 5];
reverseInPlace(a);
console.log(a); // [5, 4, 3, 2, 1] — original array itself was modified

// Trade-off: in-place saves memory but mutates the caller's data — this
// can be a bug if other code still holds a reference expecting the
// original order. Out-of-place is safer but doubles memory usage for
// large arrays. Array.prototype.reverse() in JS is in-place, by the way —
// a common source of surprise bugs when someone expects a new array back.
```

### Arrays

```javascript
// JavaScript arrays are dynamic — they resize automatically
const arr = [];
arr.push(1, 2, 3);     // O(1) amortized
arr.unshift(0);         // O(n) — shifts all elements
arr.splice(2, 0, 99);  // O(n) — inserts at index 2

// Accessing: O(1)
console.log(arr[0]); // 0

// Searching: O(n)
const idx = arr.indexOf(99); // 2

// Two-dimensional array (matrix)
const matrix = [
  [1, 2, 3],
  [4, 5, 6],
  [7, 8, 9]
];
console.log(matrix[1][2]); // 6 — row 1, column 2
```

### Linked List Implementation

```javascript
class ListNode {
  constructor(value, next = null) {
    this.value = value;
    this.next  = next;
  }
}

class LinkedList {
  constructor() {
    this.head = null;
    this.size = 0;
  }

  // O(1) — prepend to front
  prepend(value) {
    this.head = new ListNode(value, this.head);
    this.size++;
  }

  // O(n) — append to end
  append(value) {
    const node = new ListNode(value);
    if (!this.head) {
      this.head = node;
    } else {
      let current = this.head;
      while (current.next) current = current.next;
      current.next = node;
    }
    this.size++;
  }

  // O(n) — find and remove
  remove(value) {
    if (!this.head) return false;
    if (this.head.value === value) {
      this.head = this.head.next;
      this.size--;
      return true;
    }
    let current = this.head;
    while (current.next) {
      if (current.next.value === value) {
        current.next = current.next.next;
        this.size--;
        return true;
      }
      current = current.next;
    }
    return false;
  }

  // Convert to array for display
  toArray() {
    const result = [];
    let current = this.head;
    while (current) {
      result.push(current.value);
      current = current.next;
    }
    return result;
  }
}

const list = new LinkedList();
list.append(1);
list.append(2);
list.append(3);
list.prepend(0);
console.log(list.toArray()); // [0, 1, 2, 3]
list.remove(2);
console.log(list.toArray()); // [0, 1, 3]
```

### Stack Implementation

```javascript
class Stack {
  #items = []; // private class field

  push(item)  { this.#items.push(item); }
  pop()       { return this.#items.pop(); }
  peek()      { return this.#items[this.#items.length - 1]; }
  isEmpty()   { return this.#items.length === 0; }
  get size()  { return this.#items.length; }

  // Useful: check balanced parentheses
  static isBalanced(str) {
    const stack = new Stack();
    const pairs = { ')': '(', ']': '[', '}': '{' };

    for (const char of str) {
      if ("([{".includes(char)) {
        stack.push(char);
      } else if (")]}" .includes(char)) {
        if (stack.isEmpty() || stack.pop() !== pairs[char]) return false;
      }
    }
    return stack.isEmpty();
  }
}

console.log(Stack.isBalanced("({[]})")); // true
console.log(Stack.isBalanced("({[}])"));  // false
```

### Queue Implementation

```javascript
// Efficient queue using a doubly-ended structure (avoids O(n) shift)
class Queue {
  #data = {};
  #head = 0;
  #tail = 0;

  enqueue(item) {
    this.#data[this.#tail++] = item;
  }

  dequeue() {
    if (this.isEmpty()) return undefined;
    const item = this.#data[this.#head];
    delete this.#data[this.#head++];
    return item;
  }

  peek()    { return this.#data[this.#head]; }
  isEmpty() { return this.#head === this.#tail; }
  get size(){ return this.#tail - this.#head; }
}

const q = new Queue();
q.enqueue("first");
q.enqueue("second");
q.enqueue("third");
console.log(q.dequeue()); // "first"
console.log(q.peek());    // "second"
console.log(q.size);      // 2
```

### Hash Map (understanding the internals)

```javascript
// JavaScript's built-in Map is a hash map — use it
const map = new Map();

// O(1) average: set, get, has, delete
map.set("alice", { id: 1, role: "admin" });
map.set("bob",   { id: 2, role: "user" });

console.log(map.get("alice"));     // { id: 1, role: 'admin' }
console.log(map.has("charlie"));   // false
console.log(map.size);             // 2

// Iteration — maintains insertion order (unlike plain objects)
for (const [key, value] of map) {
  console.log(`${key}: ${value.role}`);
}

// Use Map over plain object when:
// - Keys are non-strings (numbers, objects)
// - You need guaranteed insertion order
// - Keys could conflict with Object.prototype properties
// - You need to frequently add/remove entries

// Frequency counter pattern
function countWords(text) {
  const counts = new Map();
  for (const word of text.toLowerCase().split(/\s+/)) {
    counts.set(word, (counts.get(word) || 0) + 1);
  }
  return counts;
}
```

---

## Intermediate Concepts

### Binary Search Tree

```javascript
class BSTNode {
  constructor(value) {
    this.value = value;
    this.left  = null;
    this.right = null;
  }
}

class BinarySearchTree {
  constructor() { this.root = null; }

  insert(value) {
    const node = new BSTNode(value);
    if (!this.root) { this.root = node; return this; }

    let current = this.root;
    while (true) {
      if (value === current.value) return this; // duplicates ignored
      if (value < current.value) {
        if (!current.left)  { current.left  = node; return this; }
        current = current.left;
      } else {
        if (!current.right) { current.right = node; return this; }
        current = current.right;
      }
    }
  }

  search(value) {
    let current = this.root;
    while (current) {
      if (value === current.value) return true;
      current = value < current.value ? current.left : current.right;
    }
    return false;
  }

  // In-order traversal: returns sorted array
  inOrder(node = this.root, result = []) {
    if (node) {
      this.inOrder(node.left, result);
      result.push(node.value);
      this.inOrder(node.right, result);
    }
    return result;
  }
}

const bst = new BinarySearchTree();
[50, 30, 70, 20, 40, 60, 80].forEach(v => bst.insert(v));
console.log(bst.inOrder()); // [20, 30, 40, 50, 60, 70, 80]
console.log(bst.search(40)); // true
console.log(bst.search(35)); // false
```

### Heap (Priority Queue)

```javascript
class MinHeap {
  #heap = [];

  get size() { return this.#heap.length; }

  insert(value) {
    this.#heap.push(value);
    this._bubbleUp(this.#heap.length - 1);
  }

  extractMin() {
    if (this.size === 0) return null;
    const min = this.#heap[0];
    const last = this.#heap.pop();
    if (this.size > 0) {
      this.#heap[0] = last;
      this._sinkDown(0);
    }
    return min;
  }

  peek() { return this.#heap[0]; }

  _bubbleUp(idx) {
    while (idx > 0) {
      const parent = Math.floor((idx - 1) / 2);
      if (this.#heap[parent] <= this.#heap[idx]) break;
      [this.#heap[parent], this.#heap[idx]] = [this.#heap[idx], this.#heap[parent]];
      idx = parent;
    }
  }

  _sinkDown(idx) {
    const n = this.size;
    while (true) {
      let smallest = idx;
      const left   = 2 * idx + 1;
      const right  = 2 * idx + 2;

      if (left  < n && this.#heap[left]  < this.#heap[smallest]) smallest = left;
      if (right < n && this.#heap[right] < this.#heap[smallest]) smallest = right;

      if (smallest === idx) break;
      [this.#heap[idx], this.#heap[smallest]] = [this.#heap[smallest], this.#heap[idx]];
      idx = smallest;
    }
  }
}

const heap = new MinHeap();
[5, 3, 8, 1, 9, 2].forEach(v => heap.insert(v));
console.log(heap.extractMin()); // 1
console.log(heap.extractMin()); // 2
console.log(heap.extractMin()); // 3
```

### Trie (Prefix Tree)

```javascript
class TrieNode {
  constructor() {
    this.children  = {};
    this.isEndWord = false;
    this.data      = null; // optional: store data at word end
  }
}

class Trie {
  constructor() { this.root = new TrieNode(); }

  insert(word, data = null) {
    let node = this.root;
    for (const char of word) {
      if (!node.children[char]) {
        node.children[char] = new TrieNode();
      }
      node = node.children[char];
    }
    node.isEndWord = true;
    node.data = data;
  }

  search(word) {
    let node = this.root;
    for (const char of word) {
      if (!node.children[char]) return false;
      node = node.children[char];
    }
    return node.isEndWord;
  }

  // Auto-complete: return all words with given prefix
  autocomplete(prefix) {
    let node = this.root;
    for (const char of prefix) {
      if (!node.children[char]) return [];
      node = node.children[char];
    }
    return this._collect(node, prefix);
  }

  _collect(node, prefix) {
    const results = [];
    if (node.isEndWord) results.push(prefix);
    for (const [char, child] of Object.entries(node.children)) {
      results.push(...this._collect(child, prefix + char));
    }
    return results;
  }
}

const trie = new Trie();
["apple", "app", "application", "apply", "apt", "banana"].forEach(w => trie.insert(w));
console.log(trie.autocomplete("app")); // ["app", "apple", "application", "apply"]
console.log(trie.search("apply"));    // true
console.log(trie.search("appl"));     // false (not a complete word)
```

### Graph

```javascript
class Graph {
  constructor(directed = false) {
    this.adjacencyList = new Map();
    this.directed      = directed;
  }

  addVertex(vertex) {
    if (!this.adjacencyList.has(vertex)) {
      this.adjacencyList.set(vertex, new Set());
    }
  }

  addEdge(v1, v2, weight = 1) {
    this.addVertex(v1);
    this.addVertex(v2);
    this.adjacencyList.get(v1).add({ vertex: v2, weight });
    if (!this.directed) {
      this.adjacencyList.get(v2).add({ vertex: v1, weight });
    }
  }

  // BFS — shortest path in unweighted graph
  bfs(start) {
    const visited = new Set([start]);
    const queue   = [start];
    const order   = [];

    while (queue.length) {
      const vertex = queue.shift();
      order.push(vertex);

      for (const { vertex: neighbor } of this.adjacencyList.get(vertex) || []) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
    }
    return order;
  }

  // DFS — explore deep paths
  dfs(start, visited = new Set()) {
    visited.add(start);
    const result = [start];

    for (const { vertex: neighbor } of this.adjacencyList.get(start) || []) {
      if (!visited.has(neighbor)) {
        result.push(...this.dfs(neighbor, visited));
      }
    }
    return result;
  }

  // Dijkstra's shortest path (weighted graph)
  dijkstra(start, end) {
    const distances  = new Map();
    const previous   = new Map();
    const unvisited  = new Set(this.adjacencyList.keys());

    for (const v of this.adjacencyList.keys()) distances.set(v, Infinity);
    distances.set(start, 0);

    while (unvisited.size) {
      // Find unvisited vertex with minimum distance
      let current = null;
      for (const v of unvisited) {
        if (current === null || distances.get(v) < distances.get(current)) {
          current = v;
        }
      }

      if (current === end) break;
      unvisited.delete(current);

      for (const { vertex: neighbor, weight } of this.adjacencyList.get(current) || []) {
        const alt = distances.get(current) + weight;
        if (alt < distances.get(neighbor)) {
          distances.set(neighbor, alt);
          previous.set(neighbor, current);
        }
      }
    }

    // Reconstruct path
    const path = [];
    let current = end;
    while (current !== undefined) {
      path.unshift(current);
      current = previous.get(current);
    }
    return { distance: distances.get(end), path };
  }
}

// Example: city road network
const roads = new Graph();
roads.addEdge("A", "B", 4);
roads.addEdge("A", "C", 2);
roads.addEdge("B", "D", 3);
roads.addEdge("C", "D", 1);
roads.addEdge("D", "E", 5);

const result = roads.dijkstra("A", "E");
console.log(result); // { distance: 8, path: ['A', 'C', 'D', 'E'] }
```

---

## Advanced Concepts

### Self-Balancing Trees (AVL, Red-Black)

In the worst case, a naive BST becomes a linked list (e.g., inserting 1, 2, 3, 4, 5 in order). **Self-balancing trees** automatically rebalance on insertion and deletion, guaranteeing O(log n) for all operations.

**AVL Tree:** After each insertion/deletion, calculates "balance factor" = height(left) - height(right). If |factor| > 1, performs rotations to restore balance.

**Red-Black Tree:** Each node is colored red or black. Enforces properties that guarantee the tree height is at most 2 × log(n). Used in: Java's TreeMap, C++ std::map, Linux kernel (CFS scheduler), PostgreSQL (memory management).

**B+ Tree:** Generalization allowing each node to have many children (not just 2). Optimized for disk I/O — entire node fits in one disk page. Used in: all major database indexes (PostgreSQL, MySQL, SQLite).

```
B+ Tree structure (simplified):
                [30 | 70]
               /    |    \
         [10|20] [40|60] [80|90]
         /  |  \
       [10][20][30] ← all data in leaves
              ↕ ↕    ← leaves linked for range queries
```

### Skip List (Redis Sorted Set)

A skip list is a probabilistic data structure that allows O(log n) search, insertion, and deletion — similar to a balanced BST but easier to implement and more cache-friendly.

```
Level 3: [head]───────────────────────────────[30]──────────[tail]
Level 2: [head]─────────[10]──────────────────[30]──[40]───[tail]
Level 1: [head]─────────[10]──[20]────────────[30]──[40]───[tail]
Level 0: [head]──[5]────[10]──[20]──[25]──────[30]──[40]───[tail]
```

Redis uses skip lists for Sorted Sets (ZADD, ZRANGE, ZRANK) because:
- O(log n) operations
- Range queries are efficient (scan from found position)
- Simpler to implement than red-black trees
- Cache-friendly for sequential access

### LRU Cache (Linked List + Hash Map)

The LRU (Least Recently Used) cache is a classic interview problem that combines a doubly linked list with a hash map to achieve O(1) for both get and put.

```javascript
class LRUCache {
  constructor(capacity) {
    this.capacity = capacity;
    this.cache    = new Map(); // key → node

    // Sentinel nodes — simplify edge cases
    this.head = { key: null, value: null, prev: null, next: null };
    this.tail = { key: null, value: null, prev: null, next: null };
    this.head.next = this.tail;
    this.tail.prev = this.head;
  }

  get(key) {
    if (!this.cache.has(key)) return -1;
    const node = this.cache.get(key);
    this._moveToFront(node);
    return node.value;
  }

  put(key, value) {
    if (this.cache.has(key)) {
      const node = this.cache.get(key);
      node.value = value;
      this._moveToFront(node);
    } else {
      const node = { key, value, prev: null, next: null };
      this._addToFront(node);
      this.cache.set(key, node);

      if (this.cache.size > this.capacity) {
        const lru = this.tail.prev; // least recently used
        this._remove(lru);
        this.cache.delete(lru.key);
      }
    }
  }

  _addToFront(node) {
    node.prev = this.head;
    node.next = this.head.next;
    this.head.next.prev = node;
    this.head.next = node;
  }

  _remove(node) {
    node.prev.next = node.next;
    node.next.prev = node.prev;
  }

  _moveToFront(node) {
    this._remove(node);
    this._addToFront(node);
  }
}

const cache = new LRUCache(3);
cache.put(1, "one");
cache.put(2, "two");
cache.put(3, "three");
cache.get(1);           // "one" — 1 is now most recently used
cache.put(4, "four");   // evicts 2 (least recently used)
console.log(cache.get(2)); // -1 (evicted)
console.log(cache.get(1)); // "one" (still in cache)
```

### Union-Find (Disjoint Set)

Used for: detecting cycles in graphs, Kruskal's MST algorithm, network connectivity.

```javascript
class UnionFind {
  constructor(n) {
    this.parent = Array.from({ length: n }, (_, i) => i);
    this.rank   = new Array(n).fill(0);
    this.count  = n; // number of connected components
  }

  find(x) {
    if (this.parent[x] !== x) {
      this.parent[x] = this.find(this.parent[x]); // path compression
    }
    return this.parent[x];
  }

  union(x, y) {
    const px = this.find(x);
    const py = this.find(y);
    if (px === py) return false; // already connected

    // Union by rank — attach smaller tree to larger tree
    if (this.rank[px] < this.rank[py]) {
      this.parent[px] = py;
    } else if (this.rank[px] > this.rank[py]) {
      this.parent[py] = px;
    } else {
      this.parent[py] = px;
      this.rank[px]++;
    }
    this.count--;
    return true;
  }

  connected(x, y) { return this.find(x) === this.find(y); }
}

// Example: determine if all nodes in a network are connected
const uf = new UnionFind(6); // nodes 0-5
uf.union(0, 1);
uf.union(1, 2);
uf.union(3, 4);
console.log(uf.connected(0, 2)); // true
console.log(uf.connected(0, 3)); // false
console.log(uf.count);           // 3 (components: {0,1,2}, {3,4}, {5})
```

---

## Industry Usage

### Databases
- **B+ Trees**: Every database index (PostgreSQL's `CREATE INDEX`, MySQL's InnoDB). Guarantees O(log n) lookup and efficient range queries.
- **Hash indexes**: PostgreSQL hash indexes for equality lookups. O(1) average.
- **LSM Trees**: Used in Cassandra, RocksDB, LevelDB. Write-optimized: batch writes to memory, merge to disk periodically.

### Caching Systems (Redis)
- **String**: Simple hash map
- **List**: Doubly linked list (O(1) push/pop from both ends)
- **Hash**: Hash map within Redis (small hashes use compact encoding)
- **Set**: Hash table
- **Sorted Set**: Skip list + hash map (O(log n) add, O(log n) range query)

### Networking
- **Routing tables**: Tries (IP prefix trees) in routers for longest-prefix match
- **DNS**: Hash tables (DNS cache), tries (domain hierarchy)
- **TCP segment buffers**: Ring buffers (circular queues)

### Operating Systems
- **Process scheduling**: Heaps (priority queues), red-black trees (Linux CFS)
- **File systems**: B-trees (ext4 directory entries), hash tables (inode cache)
- **Virtual memory**: Red-black trees (Linux mm: virtual memory areas)
- **Page cache**: Hash tables (quick page lookup by address)

---

## Alternatives

### When to Use What

| Need | Best Data Structure | Why |
|------|-------------------|-----|
| Random access by index | Array | O(1) access |
| Fast insert/delete at ends | Deque (double-ended queue) | O(1) |
| Fast insert/delete anywhere | Doubly Linked List | O(1) at known position |
| Fast lookup by key | Hash Map | O(1) average |
| Sorted data + range queries | BST / B+ Tree | O(log n) + ordered |
| Priority queue | Binary Heap | O(log n) insert, O(1) peek |
| Prefix search / autocomplete | Trie | O(m) where m = word length |
| Cycle detection | Union-Find | Near O(1) amortized |
| Shortest path (unweighted) | BFS on Graph | O(V + E) |
| Shortest path (weighted) | Dijkstra + Min-Heap | O((V+E) log V) |
| All-pairs shortest paths | Floyd-Warshall | O(V³) — dense graphs |

---

## Security

### Hash Map DoS (Hash Flooding)
Naive hash maps using predictable hash functions are vulnerable to attackers crafting inputs that all hash to the same bucket, causing O(n²) performance (DoS).

**Prevention**: Use a randomized hash seed (Node.js V8 uses a random seed per process restart). For user-controlled keys, consider using a Map with a stronger hash or limiting input size.

### Denial of Service via Infinite Loops
Complex graph algorithms on attacker-controlled input (e.g., a cyclic graph when the algorithm doesn't handle cycles) can cause infinite loops.

**Prevention**: Always track visited nodes; set maximum depth/iteration limits.

---

## Performance

### Array vs Linked List — When to Choose

```
Operation          | Array  | Linked List
───────────────────┼────────┼────────────
Access by index    | O(1)   | O(n)
Search             | O(n)   | O(n)
Insert at start    | O(n)   | O(1)
Insert at end      | O(1)†  | O(1)‡
Insert in middle   | O(n)   | O(1) at pos
Delete             | O(n)   | O(1) at pos
Memory (overhead)  | Low    | High (pointers)
Cache performance  | ★★★★★  | ★★☆☆☆

† amortized (resize is O(n) but rare)
‡ if tail pointer maintained
```

**In practice**: Arrays almost always win due to cache locality. Modern CPUs are highly optimized for sequential memory access (cache lines). Linked lists cause cache misses on every `next` pointer traversal. Use arrays unless you have a demonstrated need for O(1) insertion at an arbitrary position.

### Space Complexity

| Data Structure | Space |
|----------------|-------|
| Array | O(n) |
| Linked List | O(n) — with pointer overhead |
| Stack | O(n) |
| Queue | O(n) |
| Hash Map | O(n) |
| BST | O(n) |
| Heap | O(n) — stored as array |
| Graph | O(V + E) |
| Trie | O(ALPHABET_SIZE × N × word_length) |

---

## Debugging

### Common Issues

**1. Stack overflow from unbounded recursion**
Tree/graph traversal without base cases or cycle detection causes infinite recursion, filling the call stack.

```javascript
// Bad — infinite loop if graph has a cycle
function dfs(node) {
  process(node);
  node.children.forEach(dfs); // no visited tracking!
}

// Good
function dfs(node, visited = new Set()) {
  if (visited.has(node.id)) return;
  visited.add(node.id);
  process(node);
  node.children.forEach(child => dfs(child, visited));
}
```

**2. Off-by-one errors in binary search**
The most common bug in binary search — using `<` vs `<=`, `mid + 1` vs `mid`.

```javascript
// Template — always gets binary search right
function binarySearch(arr, target) {
  let left = 0;
  let right = arr.length - 1;  // inclusive

  while (left <= right) {       // <= not <
    const mid = left + Math.floor((right - left) / 2); // avoids integer overflow
    if (arr[mid] === target) return mid;
    if (arr[mid] < target)  left  = mid + 1;
    else                     right = mid - 1;
  }
  return -1;
}
```

**3. Hash collision causing incorrect results**
Using objects as hash keys by reference when you meant by value:

```javascript
// Bug — object keys use reference equality
const map = {};
const key1 = { x: 1 };
const key2 = { x: 1 };
map[key1] = "value";
console.log(map[key2]); // undefined! (different reference)

// Fix — stringify the key
const map2 = new Map();
map2.set(JSON.stringify(key1), "value");
console.log(map2.get(JSON.stringify(key2))); // "value"
```

---

## Interview Preparation

### Beginner Questions

**Q1: What is Big O notation? What is the time complexity of common array operations?**

A: Big O notation describes the upper bound on how an algorithm's time or space requirements grow with input size. Common array operations:
- Access by index: O(1)
- Search (unsorted): O(n)
- Search (sorted, binary search): O(log n)
- Insert at end: O(1) amortized
- Insert at arbitrary position: O(n)
- Delete: O(n)

**Q2: When would you use a linked list over an array?**

A: Linked lists are better when you need O(1) insertion at the beginning or a known position, and you never need random access by index. In practice, linked lists are rarely the best choice in high-performance applications because arrays have much better cache locality. The most common use case is implementing queues efficiently.

**Q3: Explain a hash collision and how it's handled.**

A: A hash collision occurs when two different keys produce the same hash (bucket index). Two common resolution strategies:
1. **Separate chaining**: Each bucket holds a linked list of all key-value pairs that hash to it.
2. **Open addressing**: When a collision occurs, probe sequentially (linear probing) or with a formula (quadratic probing) until an empty slot is found.

### Intermediate Questions

**Q4: Implement an LRU cache with O(1) get and put.**

See the LRU Cache implementation above. Key insight: use a doubly linked list to maintain access order (most recently used at head, least at tail) and a hash map for O(1) access to any node.

**Q5: How does a heap maintain its invariant?**

A: A min-heap maintains the invariant that every parent is ≤ its children. When inserting: add to end, "bubble up" by swapping with parent while smaller than parent. When extracting min: replace root with last element, remove last, "sink down" by swapping with the smaller child while larger than either child.

**Q6: What are the tradeoffs between a BST and a hash map?**

A: Hash map provides O(1) average for get/set/delete but has no ordering — you can't find the minimum/maximum or do range queries efficiently. BST provides O(log n) for all operations and maintains sorted order, enabling range queries, in-order traversal, and min/max in O(log n). Choose hash map for pure key-value lookup, BST for ordered collections.

### Senior Questions

**Q7: Design a system to find the k most frequent elements in a stream of data in real time.**

A: Use a **min-heap of size k** combined with a **hash map** for frequency counting:
1. Hash map: `element → count`
2. Min-heap: stores (count, element) pairs, size ≤ k
3. For each new element: increment count in hash map; if element is in heap, update its position; if heap size < k, add element; if new count > heap minimum, replace heap minimum with this element.
4. At any point, heap contains the k most frequent elements.
Time: O(n log k) overall, O(log k) per element.

**Q8: Explain B+ tree and why databases use it instead of a hash index.**

A: B+ trees support both equality lookup (O(log n)) and range queries (O(log n + result size)) efficiently because leaves are linked and sorted. Hash indexes support equality in O(1) but cannot do range queries (WHERE age BETWEEN 20 AND 30) because hash values have no ordering relationship. Databases primarily use B+ trees because SQL queries heavily use range conditions, ORDER BY, and inequality comparisons. Hash indexes are only beneficial when all queries are equality comparisons.

### Coding Questions

**Q9: Reverse a linked list in-place.**
```javascript
function reverseList(head) {
  let prev    = null;
  let current = head;
  while (current) {
    const next  = current.next;
    current.next = prev;
    prev    = current;
    current = next;
  }
  return prev;
}
```

**Q10: Detect a cycle in a linked list (Floyd's algorithm).**
```javascript
function hasCycle(head) {
  let slow = head;
  let fast = head;
  while (fast && fast.next) {
    slow = slow.next;
    fast = fast.next.next;
    if (slow === fast) return true; // cycle detected
  }
  return false;
}
```

---

## Practical Tasks

### Beginner (10 Tasks)
1. Implement a stack using two queues.
2. Implement a queue using two stacks.
3. Write `isBalanced(str)` to check matching parentheses/brackets/braces.
4. Implement binary search on a sorted array.
5. Find the middle element of a linked list in one pass.
6. Reverse an array in place without using built-in reverse.
7. Remove duplicates from an unsorted linked list.
8. Implement a basic hash map from scratch using arrays.
9. Find the first non-repeating character in a string using a frequency map.
10. Given an array, find two numbers that sum to a target (two-sum problem).

### Intermediate (10 Tasks)
1. Implement an LRU Cache with O(1) operations.
2. Serialize and deserialize a binary tree.
3. Find the Kth largest element in an unsorted array (use a min-heap of size K).
4. Implement a Trie with insert, search, and startsWith methods.
5. Given a graph as an adjacency list, find all connected components using BFS/DFS.
6. Implement Dijkstra's shortest path algorithm.
7. Given a BST, find the lowest common ancestor of two nodes.
8. Design a data structure that supports push, pop, and getMin in O(1).
9. Implement a median finder that processes a stream of numbers in O(log n).
10. Given a directed graph, detect if it has a cycle (topological sort approach).

### Advanced (10 Tasks)
1. Implement a self-balancing AVL tree with insert and delete.
2. Build a real-time leaderboard using a skip list (manual implementation).
3. Implement Kruskal's Minimum Spanning Tree algorithm using Union-Find.
4. Design a consistent hash ring for distributing data across N servers.
5. Implement a B-tree with branching factor t = 2.
6. Build a thread-safe LRU cache (simulate with locks).
7. Implement a persistent (immutable) data structure: persistent array (fat node or path copying).
8. Given a weighted directed graph, find all shortest paths between all pairs of nodes (Floyd-Warshall).
9. Design a time-series data structure supporting insert, range query, and aggregation in O(log n).
10. Implement a bloom filter with configurable false positive rate.

---

## Mini Project

### Word Frequency Analyzer

Build a CLI tool that analyzes text files and reports:
- Top N most frequent words
- Word count distribution
- Average word length
- Words that appear exactly once (hapax legomena)

Use: Hash map for frequency, min-heap for top-N, trie for prefix grouping.

---

## Production Project

### Autocomplete Service

Build a production autocomplete API:
- Trie backend for prefix matching
- Query frequency tracking (boost popular completions)
- LRU cache layer for sub-millisecond repeat queries
- Persistent storage (Redis ZSET for sorted suggestions)
- Rate limiting (sliding window using a sorted set)

---

## Capstone Project

### Database Index Engine

Build a minimal key-value store with a B+ tree index:
- `set(key, value)` — insert with B+ tree balancing
- `get(key)` — point lookup
- `range(start, end)` — range query (traverse leaf linked list)
- Persistence: write-ahead log for crash recovery
- Benchmarks: compare with linear scan for various data sizes

---

## Self Assessment

1. What is Big O notation? What does O(n log n) mean?
2. What is the time complexity of get/set/delete in a hash map? What causes worst-case O(n)?
3. When does a binary search tree degrade to O(n)? How do self-balancing trees fix this?
4. What is the difference between BFS and DFS? When would you use each?
5. How does a heap maintain its invariant? What is the time complexity of insert and extract-min?
6. What data structure would you use to implement autocomplete? Why?
7. What is an LRU cache? What two data structures are used to implement O(1) get and put?
8. What is a trie and what is its time complexity for insert/search?
9. Explain Dijkstra's algorithm. What data structure makes it efficient?
10. What is Union-Find used for? What is path compression?
11. What is a B+ tree and why do databases prefer it over a BST for disk-based indexes?
12. What is the difference between a stack and a queue? Give a real-world example of each.
13. What is the time complexity of building a heap from an unsorted array? (Hint: not O(n log n))
14. How would you find all strongly connected components in a directed graph?
15. What is amortized time complexity? Why is array push O(1) amortized?

---

## Cheat Sheet

### Complexity Quick Reference
```
Data Structure | Access | Search | Insert | Delete
───────────────┼────────┼────────┼────────┼───────
Array          | O(1)   | O(n)   | O(n)   | O(n)
Sorted Array   | O(1)   | O(logn)| O(n)   | O(n)
Linked List    | O(n)   | O(n)   | O(1)*  | O(1)*
Hash Map       | O(1)   | O(1)   | O(1)   | O(1)
BST (balanced) | O(logn)| O(logn)| O(logn)| O(logn)
Heap           | O(1)†  | O(n)   | O(logn)| O(logn)
Trie           | O(m)   | O(m)   | O(m)   | O(m)

* at known position   † peek only
m = key/word length
```

### Algorithm Complexities
```
Binary Search:      O(log n)
Bubble Sort:        O(n²)
Merge Sort:         O(n log n)    space: O(n)
Quick Sort:         O(n log n) avg, O(n²) worst
Heap Sort:          O(n log n)    space: O(1)
BFS/DFS:            O(V + E)
Dijkstra:           O((V+E) log V) with min-heap
Kruskal's MST:      O(E log E)
Floyd-Warshall:     O(V³)
Build heap (heapify): O(n)        (not O(n log n)!)
```

### JavaScript Built-ins
```javascript
// Array: O(1) access, O(n) insert/delete (except end)
arr.push(x)      // O(1) amortized
arr.pop()        // O(1)
arr.shift()      // O(n) — avoid in hot loops
arr.unshift(x)   // O(n)

// Map: O(1) average all operations
new Map()
map.set(key, val)
map.get(key)
map.has(key)
map.delete(key)

// Set: O(1) average all operations
new Set()
set.add(val)
set.has(val)
set.delete(val)

// Sort: O(n log n), stable in modern V8
arr.sort((a, b) => a - b)

// Binary search: O(log n) — requires sorted array
// No built-in; implement or use a library like 'bisect'
```
