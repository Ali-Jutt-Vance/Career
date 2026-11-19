# Trees, Heaps and Graphs

> [!GOALS]
> - What trees are, the words used to describe them, and where they appear in real software.
> - How to walk through a tree in different orders, recursively and with a stack or queue.
> - What a binary search tree is, why it makes searching O(log n), and why it can become slow when unbalanced.
> - What a heap is, how it keeps the smallest (or largest) item instantly available, and how it powers priority queues and "top k" problems.
> - What graphs are, how to store them, and the vocabulary of networks.
> - Breadth-first search and depth-first search: how each works, what each is for, and how to find shortest paths and detect cycles.
> - How these structures appear in databases, file systems, the web page in your browser, maps and social networks.

## Why this matters

The structures in the last two chapters were **linear**: one item after another. But a great deal of real data is shaped differently:

- **Hierarchies.** A company has a chief executive, managers, team leads and staff. A file system has folders inside folders. A product catalogue has categories and sub-categories. A web page is elements inside elements ({{ch:how-the-web-works}}). These are **trees**.
- **Networks.** Cities connected by roads. People connected by friendships. Web pages connected by links. Services calling other services. Packages depending on packages ({{ch:modules-and-npm}}). These are **graphs**.
- **"What is the most important thing right now?"** The next job to run, the cheapest route to expand, the top ten best-selling products. That question is answered efficiently by a **heap**.

These three structures sit underneath much of the software you use: databases store their indexes as trees ({{ch:indexes}}), browsers represent pages as trees ({{ch:browser-and-dom}}), map applications search graphs for routes, and schedulers use heaps. They are also central to coding interviews. This chapter teaches them step by step.

## The simple idea

- A **tree** is like a family tree or an organisation chart, drawn upside down: one person at the top, branching down to their reports, who branch down to theirs.
- A **heap** is like a hospital waiting room where a nurse always knows exactly who is most urgent — without keeping everyone in perfect order.
- A **graph** is like a road map: places connected by roads, possibly in loops, with no single "top".

```text
   TREE                         GRAPH
                                 Lahore ---- Islamabad
        CEO                        |    \        |
       /   \                       |     \       |
    CTO     CFO                 Multan    Faisalabad
    / \       \                    |              \
  Dev  QA    Accounts           Karachi ------- Quetta
```

> [!ANALOGY]
> A tree is an organisation chart; a graph is a road map; a heap is a waiting room with a very good nurse.
>
> **Where the analogies break:** in a real organisation, someone can report to two managers; in a **tree**, every item except the top has exactly **one** parent — if you need two parents, you have a graph. And a heap's "nurse" knows only who is first; asking "who is fifth?" is not something a heap answers quickly.

## The proper definition and key words

**Trees:**

- A **tree** is a collection of **nodes** connected by **edges**, with one **root** node at the top, where every other node has exactly **one parent**, and there are no loops.
- A node's **children** are the nodes directly below it. Nodes with the same parent are **siblings**.
- A **leaf** is a node with no children.
- The **depth** of a node is the number of edges from the root to it. The **height** of a tree is the depth of its deepest leaf.
- A **subtree** is a node together with all of its descendants — itself a tree.
- A **binary tree** is a tree where each node has at most **two** children, called **left** and **right**.

**Heaps:**

- A **heap** is a binary tree with a special ordering rule — in a **min-heap**, every parent is smaller than or equal to its children — stored compactly in an array.

**Graphs:**

- A **graph** is a set of **vertices** (nodes) connected by **edges**.
- In a **directed** graph, edges have a direction (A follows B does not mean B follows A); in an **undirected** graph, edges go both ways (roads, friendships).
- A **weighted** graph has a number on each edge, such as a distance or a cost.
- A **cycle** is a path that returns to where it started. A tree is a graph with no cycles in which every node is reachable.

## Trees

### Level 2 — Representing a tree in code

A tree node holds a value and a list of children:

```ts
type TreeNode = {
  name: string;
  children: TreeNode[];
};

const catalogue: TreeNode = {
  name: "All products",
  children: [
    {
      name: "Men",
      children: [
        { name: "Shirts", children: [] },
        { name: "Shoes", children: [{ name: "Formal", children: [] }, { name: "Sports", children: [] }] },
      ],
    },
    { name: "Women", children: [{ name: "Dresses", children: [] }] },
    { name: "Kids", children: [] },
  ],
};
```

```text
                 All products               depth 0 (root)
              /       |        \
           Men      Women      Kids          depth 1
          /   \        |
     Shirts   Shoes  Dresses                 depth 2
              /   \
         Formal   Sports                     depth 3  (leaves)
```

Notice that this is **nested data** — exactly the nested objects and arrays from {{ch:objects}}. Much of the JSON your programs handle is really a tree.

### Level 3 — Walking a tree: recursion

To visit every node, you need to visit a node and then visit each of its children — and each child is itself the root of a smaller tree. When a problem contains smaller copies of itself, the natural tool is **recursion** — a function that calls itself ({{ch:functions}}). (Recursion gets its own full treatment in {{ch:recursion-sorting-searching}}; here is enough to work with trees.)

```ts
function printTree(node: TreeNode, depth = 0): void {
  console.log("  ".repeat(depth) + node.name);
  for (const child of node.children) {
    printTree(child, depth + 1);
  }
}

printTree(catalogue);
```

**Output:**

```text
All products
  Men
    Shirts
    Shoes
      Formal
      Sports
  Women
    Dresses
  Kids
```

Walkthrough:

- `printTree` prints the current node, indented two spaces per level of depth.
- Then it calls **itself** for each child, one level deeper.
- The recursion stops naturally at leaves, whose `children` arrays are empty, so the loop does nothing. This stopping point is called the **base case**.

The same shape answers almost any question about a tree:

```ts
function countNodes(node: TreeNode): number {
  let count = 1;
  for (const child of node.children) count += countNodes(child);
  return count;
}

function height(node: TreeNode): number {
  if (node.children.length === 0) return 0;
  return 1 + Math.max(...node.children.map(height));
}

console.log(countNodes(catalogue), height(catalogue));
```

**Output:**

```text
9 3
```

Each function asks "what is the answer for me, given the answers for my children?" — the core pattern of recursive tree algorithms.

### Depth-first and breadth-first order

There are two fundamentally different orders in which to visit a tree's nodes:

- **Depth-first** — go as **deep** as possible down one branch before backing up and trying the next. `printTree` is depth-first: it finished everything under "Men" before starting "Women".
- **Breadth-first** — visit the tree **level by level**: the root, then all depth-1 nodes, then all depth-2 nodes.

```text
  depth-first:    All products, Men, Shirts, Shoes, Formal, Sports, Women, Dresses, Kids
  breadth-first:  All products, Men, Women, Kids, Shirts, Shoes, Dresses, Formal, Sports
```

Depth-first can be done with recursion — which uses the **call stack** — or with an explicit **stack**. Breadth-first uses a **queue** ({{ch:linked-lists-stacks-queues}}):

```ts
function breadthFirstNames(root: TreeNode): string[] {
  const order: string[] = [];
  const queue: TreeNode[] = [root];
  let front = 0;

  while (front < queue.length) {
    const node = queue[front++]!;
    order.push(node.name);
    queue.push(...node.children);
  }
  return order;
}

console.log(breadthFirstNames(catalogue).join(", "));
```

**Output:**

```text
All products, Men, Women, Kids, Shirts, Shoes, Dresses, Formal, Sports
```

Walkthrough:

- Start with the root in the queue.
- Repeatedly take the node at the front, record it, and add its children to the **back**.
- Because children wait behind everything already queued, all nodes at one depth come out before any node at the next depth.
- The queue uses a moving `front` index instead of `shift`, for the reasons in {{ch:linked-lists-stacks-queues}}.

Swap the queue for a **stack** (take from the back instead of the front) and the same code becomes depth-first. That one change — queue versus stack — is the entire difference between the two orders, and it reappears with graphs later.

> [!WARNING]
> Recursion uses one call-stack frame per level ({{ch:big-o}}). For normal trees — a catalogue, an organisation, a web page — depth is small and recursion is perfect. For extremely deep or untrusted structures (deeply nested JSON from the internet, for example), recursion can exceed the call stack (`Maximum call stack size exceeded`), and an explicit stack or queue is safer. Attackers have used deeply nested input to crash parsers, which is why many systems limit nesting depth.

## Binary search trees

### Level 3 — Ordered trees for fast searching

A **binary search tree** (BST) is a binary tree with one rule:

> For every node, all values in its **left** subtree are **smaller**, and all values in its **right** subtree are **larger**.

```text
                 50
               /    \
            30        70
           /  \      /  \
         20    40  60    80
```

This rule makes searching fast. To find 60: start at 50; 60 is larger, so go right to 70; 60 is smaller, so go left — found. Each comparison discards **half** of the remaining tree, just like the halving pattern in {{ch:big-o}}: **O(log n)** in a well-shaped tree.

```ts
class BstNode {
  left: BstNode | null = null;
  right: BstNode | null = null;
  constructor(public value: number) {}
}

class BinarySearchTree {
  root: BstNode | null = null;

  insert(value: number): void {
    const node = new BstNode(value);
    if (this.root === null) {
      this.root = node;
      return;
    }
    let current = this.root;
    while (true) {
      if (value < current.value) {
        if (current.left === null) { current.left = node; return; }
        current = current.left;
      } else {
        if (current.right === null) { current.right = node; return; }
        current = current.right;
      }
    }
  }

  contains(value: number): boolean {
    let current = this.root;
    while (current !== null) {
      if (value === current.value) return true;
      current = value < current.value ? current.left : current.right;
    }
    return false;
  }

  inOrder(node = this.root, result: number[] = []): number[] {
    if (node !== null) {
      this.inOrder(node.left, result);
      result.push(node.value);
      this.inOrder(node.right, result);
    }
    return result;
  }
}

const tree = new BinarySearchTree();
for (const value of [50, 30, 70, 20, 40, 60, 80]) tree.insert(value);

console.log(tree.contains(60), tree.contains(65));
console.log(tree.inOrder());
```

**Output:**

```text
true false
[
  20, 30, 40, 50,
  60, 70, 80
]
```

Walkthrough:

- `insert` walks down from the root, going left for smaller values and right for larger ones, until it finds an empty spot.
- `contains` follows the same path; if it falls off the tree (`null`), the value is not there.
- `inOrder` visits the left subtree, then the node, then the right subtree. Because of the BST rule, this produces the values in **sorted order** — an **in-order traversal**. (Visiting the node first is a **pre-order** traversal; visiting it last is **post-order** — the three standard depth-first orders for binary trees.)

### The balance problem

A BST is only fast if it is **balanced** — roughly the same height on both sides. Insert values that are already sorted, and something bad happens:

```text
  insert 10, 20, 30, 40, 50 in order:

   10
     \
      20
        \
         30
           \
            40
              \
               50          <- just a linked list: searching is O(n)
```

Each new value is larger than everything before it, so it always goes right. The "tree" degenerates into a linked list, and every operation becomes **O(n)**. Sorted input is common in real life — IDs, timestamps — so a plain BST is unreliable.

The solution is **self-balancing trees** — red-black trees, AVL trees and others — which rearrange themselves during inserts and deletes to keep their height around log n. You will not usually implement these yourself, but you use them constantly:

- **Databases** store their indexes as **B-trees** (and the variant **B+ trees**): balanced trees where each node holds **many** keys and has **many** children. Because reading from disk is slow ({{ch:what-a-computer-is}}), a wide, shallow tree means a lookup among millions of rows reads only three or four nodes. This is exactly why a database index makes queries fast ({{ch:indexes}}).
- Many languages' **sorted maps** are balanced trees, allowing ordered iteration and range queries ("all orders between these two dates").

## Heaps

### Level 4 — Always knowing the smallest

A **priority queue** ({{ch:linked-lists-stacks-queues}}) must repeatedly answer "which item is most important?" and remove it. A sorted array makes removal fast but insertion O(n). A **heap** makes **both** O(log n), with O(1) access to the top item.

A **min-heap** is a binary tree where:

1. **Heap order:** every parent is less than or equal to its children — so the **smallest** value is always at the root.
2. **Shape:** the tree is **complete** — every level is full except possibly the last, which fills from left to right.

```text
                 3
               /   \
             5       8
            / \     /
          9    6  12
```

Notice that a heap is **not** sorted: 9 and 6 are in no particular order. It only guarantees that each parent is smaller than its children. That weaker promise is cheaper to maintain — which is the whole trick.

### Storing a heap in an array

Because the tree is complete, it can be stored in a plain array with no references at all, level by level:

```text
  index:   0   1   2   3   4   5
  value:  [3,  5,  8,  9,  6,  12]

  for the node at index i:
    left child  = 2i + 1
    right child = 2i + 2
    parent      = floor((i - 1) / 2)
```

Check it: the node at index 1 (value 5) has children at indexes 3 and 4 (9 and 6); its parent is at index 0 (3). Contiguous, cache-friendly and compact ({{ch:arrays-strings-hash-maps}}).

### Adding and removing

- **Insert:** put the new value at the end of the array (the next free spot in the bottom level), then **sift it up**: while it is smaller than its parent, swap them. At most log n swaps.
- **Remove the smallest:** take the root. Move the **last** element to the root, then **sift it down**: while it is larger than one of its children, swap it with the smaller child. At most log n swaps.

```ts
class MinHeap<T> {
  #items: T[] = [];

  constructor(private readonly priority: (item: T) => number) {}

  get size(): number {
    return this.#items.length;
  }

  peek(): T | undefined {
    return this.#items[0];
  }

  push(item: T): void {
    this.#items.push(item);
    let i = this.#items.length - 1;
    while (i > 0) {
      const parent = Math.floor((i - 1) / 2);
      if (this.#p(i) >= this.#p(parent)) break;
      this.#swap(i, parent);
      i = parent;
    }
  }

  pop(): T | undefined {
    if (this.#items.length === 0) return undefined;
    const top = this.#items[0];
    const last = this.#items.pop()!;
    if (this.#items.length > 0) {
      this.#items[0] = last;
      let i = 0;
      while (true) {
        const left = 2 * i + 1;
        const right = 2 * i + 2;
        let smallest = i;
        if (left < this.#items.length && this.#p(left) < this.#p(smallest)) smallest = left;
        if (right < this.#items.length && this.#p(right) < this.#p(smallest)) smallest = right;
        if (smallest === i) break;
        this.#swap(i, smallest);
        i = smallest;
      }
    }
    return top;
  }

  #p(index: number): number {
    return this.priority(this.#items[index]!);
  }

  #swap(a: number, b: number): void {
    [this.#items[a], this.#items[b]] = [this.#items[b]!, this.#items[a]!];
  }
}

type Job = { name: string; urgency: number };   // 1 = most urgent

const jobs = new MinHeap<Job>((job) => job.urgency);
jobs.push({ name: "weekly report", urgency: 5 });
jobs.push({ name: "payment failure alert", urgency: 1 });
jobs.push({ name: "newsletter", urgency: 9 });
jobs.push({ name: "password reset email", urgency: 2 });

while (jobs.size > 0) {
  console.log(jobs.pop()!.name);
}
```

**Output:**

```text
payment failure alert
password reset email
weekly report
newsletter
```

Walkthrough:

- The heap is generic, with a `priority` function that extracts the number to order by — so it can hold jobs, orders or anything else.
- `push` adds at the end and sifts up; `pop` removes the root, moves the last item to the top, and sifts down by swapping with the smaller child.
- The swap uses array destructuring ({{ch:arrays}}).
- Jobs come out in order of urgency, whatever order they went in.

Each `push` and `pop` is **O(log n)**; `peek` is **O(1)**. A **max-heap** is the same with the comparisons reversed (or with priorities negated).

### "Top k" problems

Heaps solve a very common practical question efficiently: "find the k largest (or smallest) of n items" — the 10 best-selling products out of a million, the 5 slowest API requests in a log. Sorting everything costs O(n log n). Instead, keep a **min-heap of size k**: push each item, and whenever the heap holds more than k items, pop the smallest. At the end, the heap holds the k largest. Cost: **O(n log k)** — and when k is 10, log k is tiny, so this is nearly linear, and it uses only O(k) memory, even if the items stream in one at a time from a huge file ({{ch:advanced-javascript}}).

Heaps also power **timers** in runtimes (the next timer to fire is the one with the earliest time — {{ch:the-event-loop}}), job schedulers, and the shortest-path algorithm later in this chapter.

## Graphs

### Level 3 — Vertices and edges

A **graph** is the most general structure of all: things (**vertices**) and connections between them (**edges**), with no rules about hierarchy. A tree is a special graph; a linked list is a special tree.

Graphs model a huge range of real problems:

| Real system | Vertices | Edges | Kind |
|---|---|---|---|
| Road map | places | roads | undirected, weighted (distances) |
| Social network | people | friendships | undirected |
| Twitter-style "follows" | accounts | follows | directed |
| The web | pages | links | directed |
| npm packages | packages | "depends on" | directed, should have no cycles |
| Microservices | services | calls | directed |
| Flights | airports | flights | directed, weighted (price or time) |

### Storing a graph: the adjacency list

The most common representation is an **adjacency list**: for each vertex, a list of its neighbours. In JavaScript, a `Map` from each vertex to an array of neighbours works well:

```ts
type Graph = Map<string, string[]>;

function addRoad(graph: Graph, a: string, b: string): void {
  if (!graph.has(a)) graph.set(a, []);
  if (!graph.has(b)) graph.set(b, []);
  graph.get(a)!.push(b);
  graph.get(b)!.push(a);   // undirected: add both directions
}

const roads: Graph = new Map();
addRoad(roads, "Lahore", "Islamabad");
addRoad(roads, "Lahore", "Faisalabad");
addRoad(roads, "Lahore", "Multan");
addRoad(roads, "Islamabad", "Peshawar");
addRoad(roads, "Multan", "Karachi");
addRoad(roads, "Faisalabad", "Quetta");
addRoad(roads, "Karachi", "Quetta");

console.log(roads.get("Lahore"));
```

**Output:**

```text
[ 'Islamabad', 'Faisalabad', 'Multan' ]
```

(The road network here is simplified for teaching; it is not a real map.)

The alternative, an **adjacency matrix** — a grid with a row and column for every vertex and a mark where an edge exists — answers "is there an edge between A and B?" in O(1), but uses O(V²) memory for V vertices. Most real graphs are **sparse** (each vertex connects to only a few others), so adjacency lists, using O(V + E) memory for E edges, are usually the right choice.

### Breadth-first search: shortest paths by number of steps

**Breadth-first search** (BFS) explores a graph level by level from a starting vertex — first all neighbours, then all neighbours' neighbours, and so on — using a **queue**, exactly as with trees. One crucial addition: graphs can have cycles, so we must remember which vertices we have **already visited**, or we would loop forever.

Because BFS reaches vertices in order of distance (in number of edges), it finds the **shortest path** in an unweighted graph — the route with the fewest stops, the fewest connections between two people, the fewest links between two web pages.

```ts
function shortestRoute(graph: Graph, start: string, goal: string): string[] | null {
  const previous = new Map<string, string | null>([[start, null]]);
  const queue = [start];
  let front = 0;

  while (front < queue.length) {
    const city = queue[front++]!;
    if (city === goal) break;
    for (const next of graph.get(city) ?? []) {
      if (!previous.has(next)) {
        previous.set(next, city);
        queue.push(next);
      }
    }
  }

  if (!previous.has(goal)) return null;

  const path: string[] = [];
  for (let at: string | null = goal; at !== null; at = previous.get(at) ?? null) {
    path.push(at);
  }
  return path.reverse();
}

console.log(shortestRoute(roads, "Peshawar", "Quetta"));
console.log(shortestRoute(roads, "Karachi", "Atlantis"));
```

**Output:**

```text
[ 'Peshawar', 'Islamabad', 'Lahore', 'Faisalabad', 'Quetta' ]
null
```

Walkthrough:

- `previous` does two jobs: it records which vertices have been **visited**, and for each one, **which vertex we came from**. The start has no previous vertex, so it maps to `null`.
- The queue processes cities in order of distance from the start. Each unvisited neighbour is marked and queued.
- Once the goal is reached, the path is rebuilt **backwards** by following `previous` links from the goal to the start, then reversed.
- If the goal was never reached (Atlantis is not in the graph), the function returns `null`.

**Cost:** each vertex is queued at most once and each edge is checked at most twice: **O(V + E)**.

This is the algorithm behind "people you may know" (friends of friends — distance 2), "degrees of separation", the fewest-transfers route in a transport app, and web crawlers exploring links outward from a starting page.

### Depth-first search: exploring and detecting cycles

**Depth-first search** (DFS) follows one path as deep as it can before backtracking — using recursion or a stack. It is the natural tool for questions about **structure** rather than distance:

- Is everything connected? Which vertices can I reach from here?
- Are there cycles?
- In what order must tasks be done, given their dependencies?

A practical example: **detecting circular dependencies**. In {{ch:modules-and-npm}} you saw that circular imports cause problems. Build tools detect them with DFS: while exploring from a module, keep track of the modules on the **current path**; if you reach a module that is already on the current path, you have found a cycle.

```ts
type Dependencies = Map<string, string[]>;   // module -> modules it imports

function findCycle(deps: Dependencies): string[] | null {
  const finished = new Set<string>();
  const onPath = new Set<string>();
  const path: string[] = [];

  function visit(module: string): string[] | null {
    if (onPath.has(module)) {
      return [...path.slice(path.indexOf(module)), module];   // the cycle
    }
    if (finished.has(module)) return null;

    onPath.add(module);
    path.push(module);
    for (const dependency of deps.get(module) ?? []) {
      const cycle = visit(dependency);
      if (cycle) return cycle;
    }
    path.pop();
    onPath.delete(module);
    finished.add(module);
    return null;
  }

  for (const module of deps.keys()) {
    const cycle = visit(module);
    if (cycle) return cycle;
  }
  return null;
}

const imports: Dependencies = new Map([
  ["checkout.ts", ["orders.ts", "payments.ts"]],
  ["orders.ts", ["customers.ts"]],
  ["customers.ts", ["orders.ts"]],
  ["payments.ts", []],
]);

console.log(findCycle(imports));
```

**Output:**

```text
[ 'orders.ts', 'customers.ts', 'orders.ts' ]
```

Walkthrough:

- `visit` explores one module's dependencies deeply, recursively.
- `onPath` holds the modules on the **current** chain of imports. Reaching one of them again means the chain loops back on itself — a cycle — and the function returns it.
- `finished` holds modules already fully explored and known to be cycle-free, so they are never explored twice: O(V + E) overall.
- `path.pop()` and `onPath.delete` on the way back out are the **backtracking** step: the module leaves the current path once all its dependencies are explored.

The same algorithm, extended, produces a **topological sort**: an order in which every task comes after the tasks it depends on — the order in which a build tool compiles modules, a package manager installs dependencies, or a spreadsheet recalculates cells. Topological order exists only if there is no cycle, which is why cycles in dependency graphs are errors.

### Weighted graphs and Dijkstra's algorithm

BFS finds the path with the fewest **edges**. But on a road map, the edges have **distances**, and the shortest route by kilometres may use more roads. For weighted graphs with non-negative weights, the classic solution is **Dijkstra's algorithm**: like BFS, but instead of a plain queue, it uses a **priority queue** (a heap), always expanding the vertex with the **smallest known total distance** next.

```ts
type WeightedGraph = Map<string, { to: string; km: number }[]>;

function shortestDistances(graph: WeightedGraph, start: string): Map<string, number> {
  const distance = new Map<string, number>([[start, 0]]);
  const heap = new MinHeap<{ city: string; km: number }>((entry) => entry.km);
  heap.push({ city: start, km: 0 });

  while (heap.size > 0) {
    const { city, km } = heap.pop()!;
    if (km > (distance.get(city) ?? Infinity)) continue;   // an outdated entry
    for (const { to, km: roadKm } of graph.get(city) ?? []) {
      const candidate = km + roadKm;
      if (candidate < (distance.get(to) ?? Infinity)) {
        distance.set(to, candidate);
        heap.push({ city: to, km: candidate });
      }
    }
  }
  return distance;
}

const network: WeightedGraph = new Map([
  ["Depot", [{ to: "A", km: 4 }, { to: "B", km: 1 }]],
  ["B", [{ to: "A", km: 2 }, { to: "C", km: 5 }]],
  ["A", [{ to: "C", km: 1 }]],
  ["C", []],
]);

console.log(shortestDistances(network, "Depot"));
```

**Output:**

```text
Map(4) { 'Depot' => 0, 'A' => 3, 'B' => 1, 'C' => 4 }
```

Walkthrough:

- `distance` holds the best-known distance to each city. The heap holds cities to expand, ordered by distance.
- The algorithm always expands the closest unexpanded city. When it finds a shorter route to a neighbour, it records it and pushes the neighbour.
- Notice that A is reached directly from the depot in 4 km, but **Depot → B → A** is only 3 km — Dijkstra finds the cheaper route even though it uses more roads. C, in turn, is 4 km via A.
- Old, longer entries left in the heap are skipped when popped (the `continue` line) — a common, simple way to handle updates.

**Cost:** O((V + E) log V) with a heap. Real map services use Dijkstra's ideas plus many optimisations (precomputed shortcuts, heuristics such as the **A\*** algorithm, which steers the search towards the goal) to answer route queries over continent-sized road networks in milliseconds.

## From beginner to enterprise: trees, heaps and graphs at every level

**Level 3 — Small programs.** Recursive functions over nested data — menus, categories, comment threads; BFS on small grids and maps; a heap for "top k".

**Level 4 — A real application.** Category trees in an online shop, stored in a database and rendered recursively; organisation charts with permissions inherited down the tree; comment replies as trees; a priority queue for urgent notifications.

**Level 5 — Professional engineering.** Engineers recognise the structures inside their tools: B-tree **indexes** in the database ({{ch:indexes}}), the **DOM** tree in the browser ({{ch:browser-and-dom}}), the **dependency graph** of their modules and packages, the **graph of service calls** that determines how failures spread ({{ch:microservices}}). They store hierarchical data in databases with care — recursive queries, closure tables or materialised paths — because walking a deep tree with one query per level is slow (the N+1 problem — {{ch:big-o}}).

**Level 6 — Enterprise.** Graph problems at enormous scale: social graphs with billions of edges stored in specialised graph databases or sharded systems; recommendation engines walking "customers who bought this also bought" graphs; fraud detection finding rings of connected accounts; route planning for delivery fleets; dependency graphs across thousands of services used to plan safe deployments.

## Real-world use cases

### Beginner level — Nested comment replies

**Situation:** a blog's comments can have replies, which can have replies.

**Solution:** a tree of comments, rendered with a recursive function that indents each level.

### Intermediate level — Category pages in an online shop

**Business problem:** a shop needs breadcrumbs ("All products › Men › Shoes › Sports") and a "show everything in this category, including sub-categories" page.

**Solution:** categories stored as a tree with parent references. Breadcrumbs walk **up** from a category to the root; the category page walks **down** (DFS or BFS) to collect all sub-categories, then fetches their products in one query.

**Pitfall:** loading each level with a separate database query; better to load the whole (small) category tree once and walk it in memory.

### Advanced level — Top sellers from a huge event stream

**Business problem:** a marketplace wants a live "top 10 products in the last hour" panel from millions of sale events.

**Solution:** count sales per product in a map over a sliding window ({{ch:arrays-strings-hash-maps}}), and maintain the top 10 with a size-10 min-heap — O(n log 10) work and tiny memory.

### Enterprise level — Delivery route planning

**Business problem (illustrative):** a logistics company must assign thousands of parcels to vans and plan each van's route through a city, every morning.

**Solution:** the road network is a weighted graph; shortest-path algorithms compute travel times between stops; the stop ordering for each van is an optimisation problem (closely related to the famous "travelling salesman problem", which is too hard to solve exactly at this size), so the company uses well-tested heuristics and optimisation libraries that produce very good — not perfect — routes in minutes.

**Lesson:** some graph problems have efficient exact algorithms (shortest path); others do not (best visiting order). Recognising which is which, and accepting "good enough" where exactness is impossible, is part of senior engineering ({{ch:engineering-decisions}}).

## Common mistakes

### Beginner mistake — Forgetting the base case in recursion

**What it looks like:** a recursive tree function with no stopping condition.

**What happens:** `Maximum call stack size exceeded`.

**How to fix it:** make sure every recursive path reaches a case that returns without recursing — leaves, empty children, `null` nodes.

### Beginner mistake — Forgetting "visited" in graph search

**What it looks like:** BFS or DFS on a graph without tracking visited vertices.

**What happens:** infinite loops on any cycle — and graphs usually have cycles.

**How to fix it:** mark vertices as visited when they are **queued** (BFS) or entered (DFS).

### Intermediate mistake — Using a plain BST on sorted data

**What it looks like:** inserting IDs or timestamps in order into an unbalanced tree.

**What happens:** O(n) operations — no better than a list.

**How to fix it:** use a balanced tree, a database index, or a different structure.

### Intermediate mistake — Expecting a heap to be sorted

**What it looks like:** reading a heap's internal array expecting sorted order.

**How to fix it:** only the top is guaranteed; pop repeatedly to get sorted output.

### Production mistake — Recursing over untrusted, deeply nested data

**What it looks like:** recursive processing of user-supplied JSON or trees with no depth limit.

**What happens:** stack overflows and crashes — a known denial-of-service technique.

**How to prevent it:** limit nesting depth at the boundary ({{ch:validation}}); use iterative traversals for deep structures.

### Enterprise mistake — Ignoring the dependency graph

**What it looks like:** services or modules added without tracking who depends on whom.

**What happens:** circular dependencies, deployments that break unexpected services, failures that cascade along call chains ({{ch:asynchronous-javascript}}).

**How to prevent it:** make dependency graphs visible (tools can draw them), forbid cycles, and design for failure along edges ({{ch:distributed-systems}}).

## Debugging and troubleshooting

| Symptom | Likely cause |
|---|---|
| `Maximum call stack size exceeded` | Missing base case, a cycle in data you assumed was a tree, or extremely deep data |
| Graph search never ends | No visited set; or vertices marked visited too late, so they are queued many times |
| BFS path is not the shortest | Visited marked when dequeued instead of when queued, or a stack used instead of a queue |
| Dijkstra gives wrong distances | Negative edge weights (Dijkstra requires non-negative weights), or outdated heap entries not skipped |
| BST operations slow | The tree is unbalanced — check its height |
| Heap returns items in the wrong order | A sift-up or sift-down comparison reversed, or index arithmetic (2i + 1, 2i + 2) wrong |
| A "tree" node appears twice when traversed | The data is actually a graph — a node has two parents |

## How a senior engineer thinks about trees, heaps and graphs

> [!SENIOR]
> - **Name the shape.** "This is a hierarchy" (tree), "this is a network" (graph), "I keep needing the most important item" (heap). Naming the shape brings decades of known algorithms with it.
> - **BFS for nearest, DFS for structure.** Fewest steps or nearest first — breadth-first. Reachability, cycles, ordering by dependency — depth-first.
> - **Balance matters.** Trees are fast only when shallow. Prefer structures that guarantee balance — and know that your database already uses them.
> - **Watch for hidden graphs.** Service calls, module imports, permissions inherited through groups — these are graphs, and their cycles and long chains cause real outages.
> - **Know when exact is impossible.** Some graph problems (best route through many stops) cannot be solved exactly at scale; good heuristics are the professional answer.

## Exercises

### Exercise 1 — Organisation chart totals

**Objective:** practise recursion on trees.

**What to build:** given a tree of employees `{ name: string; salaryPaisa: number; reports: Employee[] }`, write `teamCost(employee)` returning the total salary of an employee and everyone below them, and `findManager(root, name)` returning the name of the given person's direct manager (or `null`).

<details>
<summary>Show the solution</summary>

```ts
type Employee = { name: string; salaryPaisa: number; reports: Employee[] };

function teamCost(employee: Employee): number {
  return employee.reports.reduce((sum, report) => sum + teamCost(report), employee.salaryPaisa);
}

function findManager(root: Employee, name: string): string | null {
  for (const report of root.reports) {
    if (report.name === name) return root.name;
    const found = findManager(report, name);
    if (found !== null) return found;
  }
  return null;
}

const company: Employee = {
  name: "Ayesha", salaryPaisa: 90_000_00, reports: [
    { name: "Bilal", salaryPaisa: 60_000_00, reports: [
      { name: "Sara", salaryPaisa: 40_000_00, reports: [] },
      { name: "Zain", salaryPaisa: 35_000_00, reports: [] },
    ] },
    { name: "Omar", salaryPaisa: 55_000_00, reports: [] },
  ],
};

console.log(teamCost(company), teamCost(company.reports[0]!));
console.log(findManager(company, "Zain"), findManager(company, "Ayesha"));
```

**Output:**

```text
28000000 13500000
Bilal null
```

Walkthrough:

- `teamCost` starts the `reduce` ({{ch:arrays}}) with the employee's own salary and adds each report's **team** cost — recursion handles any depth.
- `findManager` checks the direct reports; if the person is not among them, it searches each report's own subtree. The CEO has no manager, so the search returns `null`.
- Salaries use numeric separators (`90_000_00`) for readability; they are in paisa.

**Common wrong approach:** adding only direct reports' salaries — which ignores everyone two or more levels down.

</details>

### Exercise 2 — Top k with a heap

**Objective:** practise using a heap for "top k".

**What to build:** `topK(sales, k)` that returns the k products with the most sales from an array of `{ product: string; sold: number }`, using the `MinHeap` from this chapter, in O(n log k). Return them highest first.

<details>
<summary>Show the solution</summary>

```ts
type Sale = { product: string; sold: number };

function topK(sales: Sale[], k: number): Sale[] {
  if (k <= 0) return [];
  const heap = new MinHeap<Sale>((sale) => sale.sold);
  for (const sale of sales) {
    heap.push(sale);
    if (heap.size > k) heap.pop();       // drop the smallest
  }
  const result: Sale[] = [];
  while (heap.size > 0) result.push(heap.pop()!);
  return result.reverse();
}

console.log(topK([
  { product: "Cap", sold: 120 },
  { product: "Shirt", sold: 340 },
  { product: "Belt", sold: 45 },
  { product: "Shoes", sold: 290 },
  { product: "Socks", sold: 510 },
], 3));
```

**Output:**

```text
[
  { product: 'Socks', sold: 510 },
  { product: 'Shirt', sold: 340 },
  { product: 'Shoes', sold: 290 }
]
```

Walkthrough:

- The heap never holds more than k items. Whenever it grows to k + 1, the smallest is removed — so the k largest seen so far always remain.
- Popping the final heap gives them smallest first; `reverse` makes them highest first.
- O(n log k) time, O(k) memory — suitable even for data streamed from a huge file.

**Common wrong approach:** using a **max**-heap of all n items and popping k times. Correct, but O(n log n) time and O(n) memory.

</details>

### Exercise 3 — Fewest connections

**Objective:** practise BFS on a social graph.

**What to build:** given a "follows" graph (directed) as a `Map<string, string[]>`, write `degreesOfSeparation(graph, from, to)` returning the minimum number of follow-steps from one user to another, or `-1` if unreachable.

<details>
<summary>Show the solution</summary>

```ts
function degreesOfSeparation(graph: Map<string, string[]>, from: string, to: string): number {
  if (from === to) return 0;
  const distance = new Map<string, number>([[from, 0]]);
  const queue = [from];
  let front = 0;

  while (front < queue.length) {
    const user = queue[front++]!;
    const d = distance.get(user)!;
    for (const followed of graph.get(user) ?? []) {
      if (distance.has(followed)) continue;
      if (followed === to) return d + 1;
      distance.set(followed, d + 1);
      queue.push(followed);
    }
  }
  return -1;
}

const follows = new Map([
  ["sara", ["bilal", "ayesha"]],
  ["bilal", ["zain"]],
  ["ayesha", ["zain", "omar"]],
  ["zain", ["fatima"]],
  ["omar", []],
  ["fatima", ["sara"]],
]);

console.log(degreesOfSeparation(follows, "sara", "fatima"));
console.log(degreesOfSeparation(follows, "omar", "sara"));
```

**Output:**

```text
3
-1
```

Walkthrough:

- BFS from `sara` reaches distance 1 (bilal, ayesha), then distance 2 (zain, omar), then distance 3 (fatima).
- The graph is **directed**: omar follows nobody, so nobody is reachable from omar, and the answer is −1 — even though sara can reach omar.
- `distance` serves as the visited set, preventing loops (fatima follows sara, closing a cycle).

**Common wrong approach:** using DFS. It finds *a* path, not necessarily the shortest — for example, it might reach fatima through a longer chain first.

</details>

### Exercise 4 — The order of tasks (debugging)

**Objective:** practise DFS and topological ordering.

**The scenario:** a deployment tool must run database migrations in an order where each migration runs after the ones it depends on. A colleague's tool sometimes runs a migration before its dependency, causing failures.

**What to build:** `orderMigrations(deps)`, where `deps` maps each migration to the migrations it depends on, returning a valid order — or throwing an error naming a cycle if no order exists.

<details>
<summary>Show the solution</summary>

```ts
function orderMigrations(deps: Map<string, string[]>): string[] {
  const order: string[] = [];
  const done = new Set<string>();
  const inProgress = new Set<string>();

  function visit(name: string, path: string[]): void {
    if (done.has(name)) return;
    if (inProgress.has(name)) {
      throw new Error(`Circular dependency: ${[...path, name].join(" -> ")}`);
    }
    inProgress.add(name);
    for (const dependency of deps.get(name) ?? []) {
      visit(dependency, [...path, name]);
    }
    inProgress.delete(name);
    done.add(name);
    order.push(name);           // after all its dependencies
  }

  for (const name of deps.keys()) visit(name, []);
  return order;
}

const migrations = new Map([
  ["003_add_orders", ["001_create_users", "002_create_products"]],
  ["001_create_users", []],
  ["004_add_order_index", ["003_add_orders"]],
  ["002_create_products", []],
]);

console.log(orderMigrations(migrations));

migrations.set("001_create_users", ["004_add_order_index"]);
try {
  orderMigrations(migrations);
} catch (error) {
  console.log((error as Error).message);
}
```

**Output:**

```text
[
  '001_create_users',
  '002_create_products',
  '003_add_orders',
  '004_add_order_index'
]
Circular dependency: 003_add_orders -> 001_create_users -> 004_add_order_index -> 003_add_orders
```

Walkthrough:

- DFS visits each migration's dependencies **before** adding the migration itself to `order` — so every migration appears after everything it depends on. This is a **topological sort**.
- `inProgress` tracks the current path; meeting a migration that is still in progress means a cycle, and the error shows the exact loop.
- `done` ensures each migration is processed once: O(V + E).

**What was wrong with the colleague's tool?** Most likely, it ran migrations in the order they appeared in the file or map — here, `003` first — rather than in dependency order. The fix is to compute the order from the graph.

</details>

## Summary

A **tree** is a hierarchy of **nodes** with one **root**, where every other node has exactly one **parent**; **leaves** have no children; **depth** and **height** describe its shape. Trees are naturally processed with **recursion**, which needs a **base case**. **Depth-first** traversal goes deep first (recursion or a stack); **breadth-first** goes level by level (a queue). A **binary search tree** keeps smaller values left and larger right, giving O(log n) search, insertion and sorted **in-order traversal** — but only when **balanced**; sorted input degrades it to O(n). **Self-balancing trees** and the **B-trees** inside database indexes solve this.

A **min-heap** keeps the smallest item at the root of a complete binary tree stored compactly in an array (children at 2i + 1 and 2i + 2). Insert and remove are O(log n) by **sifting up** and **down**; peek is O(1). Heaps power priority queues, timers, schedulers and **top-k** problems in O(n log k).

A **graph** is **vertices** joined by **edges** — **directed** or **undirected**, possibly **weighted** — usually stored as an **adjacency list**. **BFS** with a queue and a visited set finds shortest paths by number of edges in O(V + E). **DFS** explores structure: reachability, **cycle detection** and **topological sorting** of dependencies. **Dijkstra's algorithm** finds shortest weighted paths using a heap. These structures sit inside databases, browsers, build tools, maps and social networks.

## Key terms

- **Tree** — A hierarchy of nodes with a single root, in which every other node has exactly one parent and there are no loops.
- **Root** — The top node of a tree.
- **Parent / child** — A node directly above another, and a node directly below another.
- **Sibling** — A node with the same parent as another.
- **Leaf** — A node with no children.
- **Depth** — The number of edges from the root to a node.
- **Height** — The depth of the deepest leaf in a tree.
- **Subtree** — A node together with all its descendants.
- **Binary tree** — A tree where each node has at most two children, left and right.
- **Base case** — The condition under which a recursive function stops calling itself.
- **Depth-first traversal** — Visiting a tree or graph by going as deep as possible before backtracking.
- **Breadth-first traversal** — Visiting a tree or graph level by level.
- **Binary search tree (BST)** — A binary tree in which every left subtree holds smaller values and every right subtree larger ones.
- **In-order / pre-order / post-order traversal** — Visiting a binary tree's node between, before, or after its subtrees; in-order gives sorted output for a BST.
- **Balanced tree** — A tree whose height stays close to log n, keeping operations fast.
- **Self-balancing tree** — A tree, such as a red-black or AVL tree, that rearranges itself to stay balanced.
- **B-tree** — A balanced tree with many keys and children per node, used for database indexes.
- **Heap** — A complete binary tree, stored in an array, in which each parent is ordered relative to its children.
- **Min-heap / max-heap** — A heap with the smallest, or largest, value at the root.
- **Complete binary tree** — A binary tree whose levels are all full except possibly the last, filled from the left.
- **Sift up / sift down** — Moving an element up or down a heap until the heap order is restored.
- **Top-k problem** — Finding the k largest or smallest items among many.
- **Graph** — A set of vertices connected by edges.
- **Vertex** — A node in a graph.
- **Edge** — A connection between two vertices.
- **Directed / undirected graph** — A graph whose edges have a direction, or go both ways.
- **Weighted graph** — A graph whose edges carry numbers such as distances or costs.
- **Adjacency list** — A graph representation listing each vertex's neighbours.
- **Adjacency matrix** — A graph representation as a grid marking which pairs of vertices are connected.
- **Sparse graph** — A graph with relatively few edges compared with the number of possible edges.
- **Breadth-first search (BFS)** — Exploring a graph level by level with a queue; finds shortest paths by edge count.
- **Depth-first search (DFS)** — Exploring a graph by following paths as deep as possible, with recursion or a stack.
- **Backtracking (search)** — Stepping back after exploring a path, to try other options.
- **Topological sort** — An ordering of tasks in which each task comes after the tasks it depends on.
- **Dijkstra's algorithm** — An algorithm for shortest paths in weighted graphs with non-negative weights, using a priority queue.
- **A\* algorithm** — A shortest-path algorithm that uses an estimate of the remaining distance to search towards the goal.

## What comes next

Twice in this chapter we relied on recursion before studying it properly, and twice we used sorting and searching without looking inside them. In the next chapter, **Recursion, Sorting and Searching**, you will learn recursion thoroughly — how to design recursive solutions, how they use the call stack, and when to avoid them — and then use it to understand the classic sorting algorithms, including the efficient ones inside JavaScript's own `sort`, and binary search, the O(log n) technique behind fast lookups everywhere.
