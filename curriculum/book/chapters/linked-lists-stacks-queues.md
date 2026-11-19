# Linked Lists, Stacks and Queues

> [!GOALS]
> - What a linked list is, how it is built from nodes and references, and how it differs from an array.
> - How to add, remove, search and reverse items in a linked list — and what each operation costs.
> - Singly and doubly linked lists, and when either is worth using.
> - What a stack is ("last in, first out"), how to build one, and where stacks appear: undo, the call stack, matching brackets.
> - What a queue is ("first in, first out"), why `shift` makes a poor queue, and how to build an efficient one.
> - Deques, priority queues, and the real job queues used in backend systems.
> - Classic interview problems on these structures, solved step by step.

## Why this matters

Arrays are wonderful for reading by position and adding at the end. But some work has a different shape:

- A support system must handle tickets **in the order they arrived** — first come, first served.
- A text editor must **undo** the most recent change first, then the one before it.
- A browser's **back** button returns to the page you visited most recently.
- A music app's playlist lets you insert a song **between** two others, or remove one, instantly.
- A backend processes thousands of background jobs — emails, invoices, image resizing — **one after another**, from a waiting line.

For these jobs, the right structures are **linked lists**, **stacks** and **queues**. They are simple, but they appear everywhere: in your programs, in the JavaScript engine itself (the call stack, the event loop's queues — {{ch:the-event-loop}}), and in large backend systems built around job queues ({{ch:queues}}). They are also a staple of coding interviews.

## The simple idea

- A **linked list** is like a treasure hunt: each clue tells you where the next clue is. You cannot jump to clue number 7; you must follow the chain from the start. But adding a new clue between two others only means changing one note.
- A **stack** is like a stack of plates: you add to the top and take from the top. The last plate put on is the first taken off.
- A **queue** is like a line at a bank counter: people join at the back and are served from the front. The first to arrive is the first served.

```text
  LINKED LIST:  [A] --> [B] --> [C] --> [D] --> nothing

  STACK:        push/pop here
                     |
                   [ C ]   <- top (last in, first out)
                   [ B ]
                   [ A ]

  QUEUE:        leave here                      join here
                   |                                |
                [ A ]  [ B ]  [ C ]  [ D ]  <-------+
                front                    back   (first in, first out)
```

> [!ANALOGY]
> A linked list is a treasure hunt; a stack is a pile of plates; a queue is a bank line.
>
> **Where the analogies break:** in a treasure hunt, losing one clue means you can never find the rest — and the same is true of a linked list: lose the reference to one node, and every node after it becomes unreachable (and is garbage-collected — {{ch:advanced-javascript}}). In a real queue, people sometimes push in or leave early; in a strict queue data structure, they cannot — although **priority queues**, later in this chapter, deliberately let urgent items jump ahead.

## The proper definition and key words

- A **node** is a small object holding one value and one or more **references** to other nodes.
- A **linked list** is a sequence of nodes in which each node refers to the next. The first node is the **head**; the last is the **tail**.
- A **singly linked list** has one reference per node (to the next node); a **doubly linked list** has two (to the next and the previous).
- A **stack** is a collection where items are added and removed at the same end: **last in, first out** (**LIFO**). Adding is called **push**; removing is called **pop**; looking at the top without removing is **peek**.
- A **queue** is a collection where items are added at one end and removed from the other: **first in, first out** (**FIFO**). Adding is called **enqueue**; removing is called **dequeue**.
- A **deque** (pronounced "deck", short for **double-ended queue**) allows adding and removing at both ends.
- An **abstract data type** describes *what* operations a collection supports (push, pop…), not *how* it is built. A stack is an abstract data type; it can be built from an array or a linked list.

## Linked lists

### Level 2 — Nodes and references

An array keeps its elements side by side in memory ({{ch:arrays-strings-hash-maps}}). A linked list does not. Each element lives in its own **node**, which can be anywhere in memory, and each node holds a **reference** to the next one ({{ch:arrays}} — references are what variables hold for objects).

```ts
class ListNode<T> {
  constructor(
    public value: T,
    public next: ListNode<T> | null = null,
  ) {}
}

const third = new ListNode("Johar Town");
const second = new ListNode("Gulberg", third);
const first = new ListNode("Depot", second);

let current: ListNode<string> | null = first;
while (current !== null) {
  console.log(current.value);
  current = current.next;
}
```

**Output:**

```text
Depot
Gulberg
Johar Town
```

Walkthrough:

- `ListNode` is a generic class ({{ch:typescript-advanced}}) with two fields: the `value` it holds, and `next`, a reference to another node or `null` when there is no next node. (The constructor uses parameter properties — {{ch:typescript-basics}}.)
- We build the list backwards: `third` first, then `second` pointing to `third`, then `first` pointing to `second`.
- To visit every node, start at the head and follow `next` until it is `null`. This is called **traversing** the list.

```text
  memory (nodes can be anywhere):

  first --> +---------+-----+     +----------+-----+     +-------------+------+
            | "Depot" | ----+---> | "Gulberg"| ----+---> | "Johar Town"| null |
            +---------+-----+     +----------+-----+     +-------------+------+
             value     next        value      next        value         next
```

### Level 3 — Costs compared with arrays

The structure explains the costs:

| Operation | Array | Linked list | Why |
|---|---|---|---|
| Read the item at position i | **O(1)** | O(i) | the list must be followed from the head |
| Search for a value | O(n) | O(n) | both check one by one |
| Add or remove at the **start** | O(n) | **O(1)** | the array must shift; the list just changes the head |
| Add or remove at the **end** | O(1) amortised | O(1) if the list keeps a tail reference | |
| Add or remove in the **middle**, once you are at that position | O(n) | **O(1)** | the list changes two references; the array shifts |
| Memory per item | small | larger | each node also stores a reference (two in a doubly linked list) |
| Speed of a full pass, in practice | faster | slower | arrays are contiguous and cache-friendly ({{ch:what-a-computer-is}}) |

The key trade: **arrays are fast at finding positions; linked lists are fast at changing structure.** A linked list can insert or remove in O(1) **once you hold a reference to the right node** — but getting to that node takes O(n) if you have to walk there.

> [!SENIOR]
> In everyday JavaScript application code, you will **rarely** build a linked list yourself: arrays are usually faster in practice because of how CPU caches work, and they are built in. Linked lists matter for three reasons: they are the foundation of other structures (efficient queues, LRU caches, the internal lists inside hash map buckets — {{ch:arrays-strings-hash-maps}}); they appear inside systems you use (operating systems, databases, the JavaScript engine itself); and they are a classic interview topic, because manipulating references precisely is a good test of careful thinking.

### Building a linked list class

```ts
class LinkedList<T> {
  #head: ListNode<T> | null = null;
  #tail: ListNode<T> | null = null;
  #size = 0;

  addFirst(value: T): void {
    const node = new ListNode(value, this.#head);
    this.#head = node;
    if (this.#tail === null) this.#tail = node;
    this.#size++;
  }

  addLast(value: T): void {
    const node = new ListNode(value);
    if (this.#tail === null) {
      this.#head = node;
      this.#tail = node;
    } else {
      this.#tail.next = node;
      this.#tail = node;
    }
    this.#size++;
  }

  removeFirst(): T | undefined {
    if (this.#head === null) return undefined;
    const value = this.#head.value;
    this.#head = this.#head.next;
    if (this.#head === null) this.#tail = null;
    this.#size--;
    return value;
  }

  remove(value: T): boolean {
    let previous: ListNode<T> | null = null;
    let current = this.#head;
    while (current !== null) {
      if (current.value === value) {
        if (previous === null) {
          this.#head = current.next;
        } else {
          previous.next = current.next;
        }
        if (current === this.#tail) this.#tail = previous;
        this.#size--;
        return true;
      }
      previous = current;
      current = current.next;
    }
    return false;
  }

  *[Symbol.iterator](): Generator<T> {
    let current = this.#head;
    while (current !== null) {
      yield current.value;
      current = current.next;
    }
  }

  get size(): number {
    return this.#size;
  }
}

const route = new LinkedList<string>();
route.addLast("Gulberg");
route.addLast("DHA");
route.addFirst("Depot");
route.addLast("Johar Town");
route.remove("DHA");

console.log([...route], route.size);
console.log(route.removeFirst(), [...route]);
```

**Output:**

```text
[ 'Depot', 'Gulberg', 'Johar Town' ] 3
Depot [ 'Gulberg', 'Johar Town' ]
```

Walkthrough of each method:

- **`addFirst`** creates a node whose `next` is the current head, then makes it the new head. If the list was empty, it is also the tail. O(1).
- **`addLast`** uses the stored **tail** reference to attach the new node in O(1) — without a tail reference, it would have to walk the whole list. An empty list is a special case: the new node is both head and tail.
- **`removeFirst`** moves the head to the second node. The old first node is no longer referenced by anything, so the garbage collector frees it ({{ch:advanced-javascript}}). If the list becomes empty, the tail must be cleared too. O(1).
- **`remove`** walks the list keeping **two** references: `previous` and `current`. To remove `current`, it makes `previous.next` skip over it. Special cases: removing the head (no previous node) and removing the tail (the tail must move back). O(n) for the walk, O(1) for the actual unlinking.
- **`[Symbol.iterator]`** is a generator ({{ch:advanced-javascript}}), so the list works with spread and `for...of`.

Removing `"DHA"` looks like this:

```text
  before:  Depot --> Gulberg --> DHA --> Johar Town --> null
                       ^          ^
                   previous    current

  after:   Depot --> Gulberg ------------> Johar Town --> null
                                DHA (unreferenced; garbage-collected)
```

Notice how much of the code handles **special cases** — empty list, first node, last node. Linked-list bugs almost always hide in those cases, which is why tracing them by hand is so important.

### Doubly linked lists

In a **doubly linked list**, each node also has a `previous` reference:

```text
  null <-- [A] <==> [B] <==> [C] --> null
```

This costs a little more memory per node, but allows walking **backwards** and removing a node in O(1) **given only that node** (because it knows its own previous neighbour). Doubly linked lists are the classic building block for **LRU caches** — caches that evict the **least recently used** entry, mentioned in {{ch:advanced-javascript}}: a hash map finds an entry in O(1), and a doubly linked list keeps entries in order of use, so moving an entry to the "most recent" end and evicting from the "least recent" end are both O(1). You will build one in the exercises.

### Level 4 — Reversing a linked list

Reversing a linked list is one of the most common interview questions, because it tests careful reference handling:

```ts
function reverse<T>(head: ListNode<T> | null): ListNode<T> | null {
  let previous: ListNode<T> | null = null;
  let current = head;
  while (current !== null) {
    const next = current.next;   // 1. remember the rest of the list
    current.next = previous;     // 2. point this node backwards
    previous = current;          // 3. move previous forward
    current = next;              // 4. move current forward
  }
  return previous;               // the old tail is the new head
}

const head = new ListNode(1, new ListNode(2, new ListNode(3)));
let node = reverse(head);
const values: number[] = [];
while (node) {
  values.push(node.value);
  node = node.next;
}
console.log(values);
```

**Output:**

```text
[ 3, 2, 1 ]
```

Trace:

```text
  start:     prev = null   curr = 1 -> 2 -> 3 -> null
  step 1:    1 -> null     prev = 1       curr = 2 -> 3 -> null
  step 2:    2 -> 1 -> null               curr = 3 -> null
  step 3:    3 -> 2 -> 1 -> null          curr = null   -> return 3
```

The crucial line is the first in the loop: `const next = current.next`. Without saving it, step 2 overwrites `current.next`, and the rest of the list is lost forever — the "lost clue" from the analogy. O(n) time, O(1) extra space.

## Stacks

### Level 2 — Last in, first out

A **stack** has three essential operations, all O(1):

- **push(x)** — put x on top;
- **pop()** — remove and return the top item;
- **peek()** — look at the top item without removing it.

In JavaScript, an array is already a perfect stack, because `push` and `pop` work at the **end**:

```ts
const undoStack: string[] = [];

undoStack.push("typed 'Hello'");
undoStack.push("made text bold");
undoStack.push("deleted a word");

console.log("Undo:", undoStack.pop());
console.log("Undo:", undoStack.pop());
console.log("Next to undo:", undoStack.at(-1));
```

**Output:**

```text
Undo: deleted a word
Undo: made text bold
Next to undo: typed 'Hello'
```

The most recent action is undone first — exactly how undo works in editors. (Real editors also keep a **redo** stack: undone actions are pushed onto it, and a new action clears it.)

### Where stacks appear

Stacks are everywhere "the most recent thing must be dealt with first":

- **The call stack** ({{ch:functions}}): the most recently called function must return first.
- **Undo** in editors and design tools; the **back** button in browsers.
- **Checking nested structures**: brackets in code, tags in HTML ({{ch:html}}), nested JSON.
- **Evaluating expressions**, such as calculators turning `2 + 3 * 4` into a result.
- **Depth-first search** — exploring a tree or graph by going as deep as possible first ({{ch:trees-heaps-graphs}}).
- **Recursion** itself: every recursive algorithm can be rewritten with an explicit stack ({{ch:recursion-sorting-searching}}).

### Level 3 — Matching brackets

A classic problem that shows why stacks fit nested structures:

> **Problem:** Check whether a string's brackets — `()`, `[]` and `{}` — are balanced and properly nested. `"{[()]}"` is valid; `"([)]"` is not; `"(("` is not.

The insight: whenever a bracket **closes**, it must match the **most recently opened** bracket that is still open. "Most recent first" means a stack.

```ts
function isBalanced(text: string): boolean {
  const pairs: Record<string, string> = { ")": "(", "]": "[", "}": "{" };
  const open: string[] = [];

  for (const ch of text) {
    if (ch === "(" || ch === "[" || ch === "{") {
      open.push(ch);
    } else if (ch in pairs) {
      if (open.pop() !== pairs[ch]) return false;
    }
  }
  return open.length === 0;
}

for (const s of ["{[()]}", "([)]", "((", "())", "price(a[1]) * {b}"]) {
  console.log(s, isBalanced(s));
}
```

**Output:**

```text
{[()]} true
([)] false
(( false
()) false
price(a[1]) * {b} true
```

Walkthrough:

- Opening brackets are pushed.
- For a closing bracket, pop the most recent open bracket and check it is the matching kind. `pairs` is a lookup table ({{ch:objects}}) from each closer to its opener.
- If a closer arrives when nothing is open, `pop()` returns `undefined`, which does not match — false (the `"())"` case).
- At the end, anything still open means unbalanced (the `"(("` case).
- Other characters are ignored, so it works on real code.

Code editors and compilers use this idea to highlight matching brackets and report "missing closing bracket" errors ({{ch:from-code-to-running-program}}).

## Queues

### Level 2 — First in, first out

A **queue** supports:

- **enqueue(x)** — add x at the back;
- **dequeue()** — remove and return the item at the front;
- **peek()** — look at the front item.

### Why an array with `shift` is a poor queue

The obvious JavaScript queue uses `push` to enqueue and `shift` to dequeue. It works:

```ts
const tickets: string[] = [];
tickets.push("T-1", "T-2", "T-3");
console.log(tickets.shift(), tickets.shift());
```

**Output:**

```text
T-1 T-2
```

But as you learned in {{ch:big-o}}, `shift` is **O(n)**: removing the first element moves every other element down one place. For a few hundred items that is fine. For a queue holding hundreds of thousands of jobs, each dequeue does hundreds of thousands of moves, and processing the whole queue becomes O(n²).

### An efficient queue

Two good ways to build a queue with O(1) operations:

**1. A linked list with head and tail** — enqueue with `addLast`, dequeue with `removeFirst`. The `LinkedList` class above is already a correct queue.

**2. An array with a moving front index** — never shift; just remember where the front is:

```ts
class Queue<T> {
  #items: (T | undefined)[] = [];
  #front = 0;

  enqueue(item: T): void {
    this.#items.push(item);
  }

  dequeue(): T | undefined {
    if (this.#front >= this.#items.length) return undefined;
    const item = this.#items[this.#front];
    this.#items[this.#front] = undefined;   // let the garbage collector free it
    this.#front++;

    if (this.#front > 1000 && this.#front * 2 > this.#items.length) {
      this.#items = this.#items.slice(this.#front);   // occasionally compact
      this.#front = 0;
    }
    return item;
  }

  peek(): T | undefined {
    return this.#items[this.#front];
  }

  get size(): number {
    return this.#items.length - this.#front;
  }
}

const jobs = new Queue<string>();
jobs.enqueue("send-email:41");
jobs.enqueue("resize-image:17");
jobs.enqueue("generate-invoice:9");

console.log(jobs.dequeue(), jobs.peek(), jobs.size);
```

**Output:**

```text
send-email:41 resize-image:17 2
```

Walkthrough:

- `enqueue` is an ordinary `push`: amortised O(1).
- `dequeue` reads the element at `#front` and moves the front index forward. Nothing shifts: O(1).
- The used slot is set to `undefined`, so the dequeued item is no longer referenced and can be garbage-collected — otherwise the queue would leak memory ({{ch:advanced-javascript}}).
- Occasionally, when more than half of the array is used-up slots, it **compacts** by copying the remaining items to a fresh array. That copy is O(n) but rare, so dequeue stays amortised O(1) — the same reasoning as dynamic arrays ({{ch:big-o}}).

Let us measure the difference:

```ts
const n = 100_000;

console.time("array shift");
const arr: number[] = [];
for (let i = 0; i < n; i++) arr.push(i);
while (arr.length > 0) arr.shift();
console.timeEnd("array shift");

console.time("Queue class");
const q = new Queue<number>();
for (let i = 0; i < n; i++) q.enqueue(i);
while (q.size > 0) q.dequeue();
console.timeEnd("Queue class");
```

**Output (timings vary; the gap grows with n):**

```text
array shift: 712.334ms
Queue class: 6.891ms
```

> [!NOTE]
> JavaScript engines optimise `shift` in some situations, so for small arrays you may see little difference — and timings vary between engine versions. Measure in your own environment. The principle holds: a structure designed for queue operations stays fast as the queue grows.

### Where queues appear

- **Job queues** in backends: emails, invoices, image processing, imports ({{ch:queues}}).
- **Message queues** between services, such as Amazon SQS ({{ch:sns-sqs}}) and message brokers ({{ch:message-brokers}}).
- **The event loop's task queues** ({{ch:the-event-loop}}).
- **Breadth-first search** — exploring a graph level by level, used for "shortest path" questions ({{ch:trees-heaps-graphs}}).
- **Buffers** between fast producers and slow consumers — keystrokes, network packets, log lines.
- **Rate limiting and fair scheduling**: requests waiting their turn.

### Deques

A **deque** allows adding and removing at **both** ends in O(1). It can act as a stack, a queue, or both — useful for sliding-window problems ({{ch:arrays-strings-hash-maps}}) where elements leave from one end and enter from the other, and for "work-stealing" schedulers in which idle workers take jobs from the other end of a busy worker's queue. A doubly linked list with head and tail references is a natural deque.

### Priority queues

Sometimes the order should not be strictly "first come, first served". In a hospital emergency department, the most urgent patient is seen first. In a delivery system, express orders jump ahead of standard ones.

A **priority queue** always removes the item with the **highest priority** (or lowest value) next. A naive implementation keeps a sorted array — O(n) to insert. The efficient implementation uses a structure called a **heap**, giving O(log n) for both insert and remove. Heaps are explained in {{ch:trees-heaps-graphs}}; for now, know that the abstract idea exists and is used for task scheduling, timers, and "find the top k" problems.

## From toy structures to real systems

### Level 5 — Queues in professional backends

The in-memory `Queue` class lives inside one process. If the process restarts, every waiting job is lost; with several servers, each has its own separate queue. Real backends therefore use **dedicated queue systems** that store jobs durably and share them between many workers:

```text
   web servers (producers)                         workers (consumers)
   +-----------+                                   +-----------+
   | checkout  |--- enqueue "send receipt" --+     | worker 1  |
   +-----------+                             |     +-----------+
   +-----------+                             v           ^
   | signup    |--- enqueue "welcome" --> [  QUEUE  ] ---+---> dequeue
   +-----------+                         (Redis, SQS,    |
                                          RabbitMQ...)   v
                                                   +-----------+
                                                   | worker 2  |
                                                   +-----------+
```

Producers add jobs; workers take them, one at a time, in roughly first-in-first-out order. Real queue systems add what the toy version lacks:

- **Durability** — jobs survive restarts.
- **Acknowledgements** — a job is only removed once a worker confirms it finished; if the worker crashes, the job becomes available again.
- **Retries** with backoff ({{ch:asynchronous-javascript}}), and **dead-letter queues** for jobs that keep failing, so a single bad job cannot block the line forever.
- **Visibility timeouts**, **delays** and **priorities**.
- **At-least-once delivery** — a job may occasionally be delivered twice, so workers must be **idempotent** ({{ch:how-the-web-works}}).

You will build with these in {{ch:queues}} and {{ch:sns-sqs}}. The data structure is the same idea you learned here; the engineering is about what happens when things fail.

## Real-world use cases

### Beginner level — A to-do list with undo

**Situation:** a learner's to-do app should undo the last action.

**Solution:** push each action onto a stack; undo pops and reverses it.

### Intermediate level — Customer support tickets

**Business problem:** tickets must be handled in arrival order, but "urgent" tickets must jump ahead.

**Solution:** a priority queue ordered first by urgency, then by arrival time — so tickets of equal urgency stay first come, first served.

**Trade-off:** pure priority ordering can **starve** low-priority tickets if urgent ones keep arriving (the same idea as microtask starvation in {{ch:the-event-loop}}). Many systems slowly raise the priority of tickets that have waited a long time — a technique called **ageing**.

### Advanced level — A slow import job

**Business problem:** a logistics company's nightly import processes 500,000 shipment records from an in-memory array, using `shift` to take each one. The job takes hours.

**Analysis:** each `shift` is O(n), making the whole job O(n²).

**Fix:** iterate with an index (or use a proper queue), turning the job O(n): it finishes in seconds.

### Enterprise level — Order processing with durable queues

**Business problem (illustrative):** an e-commerce platform's checkout calls the warehouse, payment, email and analytics systems directly. When any of them is slow, checkout is slow; when one is down, orders fail.

**Solution:** checkout records the order and publishes an "order placed" message to a durable queue, then returns immediately. Separate workers handle the warehouse, email and analytics, each at its own pace, with retries and dead-letter queues.

**Trade-offs:** the system becomes **eventually consistent** — the warehouse learns of an order a few seconds later, not instantly — and engineers must design for duplicate deliveries and monitor queue lengths. In exchange, checkout stays fast and reliable even when other systems struggle ({{ch:event-driven-systems}}).

## Common mistakes

### Beginner mistake — Using `shift` for large queues

**What it looks like:** `while (queue.length) process(queue.shift())` over a huge array.

**What happens:** O(n²) total work.

**How to fix it:** iterate by index, or use a real queue structure.

### Beginner mistake — Losing the rest of a linked list

**What it looks like:** changing `current.next` before saving it, while reversing or inserting.

**What happens:** every node after `current` becomes unreachable.

**How to fix it:** save `next` first; draw the references on paper before coding.

### Intermediate mistake — Forgetting the special cases

**What it looks like:** linked-list code that works in the middle but fails on an empty list, a single node, the head or the tail.

**How to prevent it:** test exactly those cases every time.

### Intermediate mistake — Forgetting to update the tail

**What it looks like:** removing the last node without moving `tail`; later `addLast` attaches to a node that is no longer in the list.

**What happens:** silently lost items.

**How to fix it:** whenever the last node changes, update the tail.

### Production mistake — In-memory queues for important work

**What it looks like:** keeping jobs such as "send invoice" in an array in a web server's memory.

**What happens:** restarts or crashes lose jobs; multiple servers process separate, inconsistent queues.

**How to prevent it:** use a durable queue system for anything that must not be lost.

### Enterprise mistake — Non-idempotent queue consumers

**What it looks like:** a worker that charges a card or sends an email every time it receives a message.

**What happens:** queues deliver **at least once**; duplicates cause double charges or duplicate emails.

**How to prevent it:** make consumers idempotent — record processed message IDs, use idempotency keys with external services.

## Debugging and troubleshooting

| Symptom | Likely cause |
|---|---|
| Traversal never ends | A cycle in the list — some node's `next` points back to an earlier node |
| Items disappear from a linked list | A reference overwritten before it was saved; the tail not updated |
| `TypeError: Cannot read properties of null (reading 'next')` | Walking past the end, or not handling an empty list |
| A queue gets slower as it grows | `shift` on a large array |
| Memory grows in a long-running queue | Dequeued items still referenced (slots not cleared, or never compacted) |
| Jobs processed twice | At-least-once delivery without idempotent consumers |
| Some jobs never processed | Starvation in a priority queue, or failing jobs blocking the line without a dead-letter queue |

> [!TIP]
> For linked-list bugs, **draw boxes and arrows** on paper and redraw them after every line of code. It feels slow, but it finds reference mistakes far faster than staring at the code. In the debugger ({{ch:errors-and-debugging}}), expand `head` in the Variables panel and follow the `next` properties to see the actual chain.

## How a senior engineer thinks about these structures

> [!SENIOR]
> - **Choose the abstraction first.** Does the work need "most recent first" (stack), "oldest first" (queue), "most important first" (priority queue), or arbitrary insertion and removal (linked list)?
> - **Then choose the implementation by cost.** Arrays make good stacks; arrays with `shift` make bad large queues; linked lists shine for O(1) insertion and removal at known positions.
> - **Prefer built-ins and proven libraries** for production; write these structures yourself to understand them and in interviews.
> - **Ask what happens on failure.** In-memory structures vanish on restart. Anything important waits in a durable queue, with retries, dead-letter handling and idempotent consumers.

## Exercises

### Exercise 1 — Browser history

**Objective:** practise stacks.

**What to build:** a `BrowserHistory` class with `visit(url)`, `back()` and `forward()`. Visiting a new page clears the forward history. `back` and `forward` return the current URL after moving (or stay put if there is nowhere to go).

<details>
<summary>Show the solution</summary>

```ts
class BrowserHistory {
  #backStack: string[] = [];
  #forwardStack: string[] = [];

  constructor(private current: string) {}

  visit(url: string): void {
    this.#backStack.push(this.current);
    this.current = url;
    this.#forwardStack = [];
  }

  back(): string {
    const previous = this.#backStack.pop();
    if (previous !== undefined) {
      this.#forwardStack.push(this.current);
      this.current = previous;
    }
    return this.current;
  }

  forward(): string {
    const next = this.#forwardStack.pop();
    if (next !== undefined) {
      this.#backStack.push(this.current);
      this.current = next;
    }
    return this.current;
  }
}

const history = new BrowserHistory("home");
history.visit("shoes");
history.visit("shoes/881");
console.log(history.back());
console.log(history.back());
console.log(history.forward());
history.visit("cart");
console.log(history.forward());
```

**Output:**

```text
shoes
home
shoes
cart
```

Walkthrough:

- Two stacks: pages you can go **back** to, and pages you can go **forward** to.
- `back` pops from the back stack and pushes the current page onto the forward stack; `forward` does the reverse.
- `visit` clears the forward stack — after going back and visiting a new page, the old "forward" pages no longer make sense.
- At the end, `forward()` stays on `cart`, because visiting it cleared the forward history.

**Common wrong approach:** a single array with an index, where `visit` forgets to discard pages after the index — "forward" then leads to pages from an abandoned path.

</details>

### Exercise 2 — Process tickets in order

**Objective:** practise queues and compare implementations.

**What to build:** using the `Queue` class from this chapter, simulate a support desk: enqueue 10 tickets `T-1` … `T-10`, then dequeue them in rounds of 3, printing each round, until the queue is empty.

<details>
<summary>Show the solution</summary>

```ts
const desk = new Queue<string>();
for (let i = 1; i <= 10; i++) desk.enqueue(`T-${i}`);

let round = 1;
while (desk.size > 0) {
  const batch: string[] = [];
  for (let i = 0; i < 3 && desk.size > 0; i++) {
    batch.push(desk.dequeue()!);
  }
  console.log(`Round ${round}:`, batch.join(", "));
  round++;
}
```

**Output:**

```text
Round 1: T-1, T-2, T-3
Round 2: T-4, T-5, T-6
Round 3: T-7, T-8, T-9
Round 4: T-10
```

Walkthrough:

- Tickets leave in exactly the order they arrived — FIFO.
- The inner loop stops early when the queue empties, so the last round can be smaller.
- `desk.dequeue()!` uses a non-null assertion, justified by the `desk.size > 0` check on the same line ({{ch:typescript-basics}}).

**Common wrong approach:** dequeuing exactly 3 per round without checking the size, which pushes `undefined` into the last batch.

</details>

### Exercise 3 — An LRU cache

**Objective:** combine a hash map with ordering — a classic interview question.

**What to build:** an `LruCache<K, V>` with a fixed `capacity`, supporting `get(key)` and `set(key, value)` in O(1). When full, `set` evicts the **least recently used** entry. Both `get` and `set` count as "use".

**Hint:** JavaScript's `Map` remembers insertion order, and deleting and re-inserting a key moves it to the end. The **first** key in `map.keys()` is therefore the least recently used one.

<details>
<summary>Show the solution</summary>

```ts
class LruCache<K, V> {
  #entries = new Map<K, V>();

  constructor(private readonly capacity: number) {}

  get(key: K): V | undefined {
    if (!this.#entries.has(key)) return undefined;
    const value = this.#entries.get(key)!;
    this.#entries.delete(key);
    this.#entries.set(key, value);       // move to the "most recent" end
    return value;
  }

  set(key: K, value: V): void {
    if (this.#entries.has(key)) this.#entries.delete(key);
    this.#entries.set(key, value);
    if (this.#entries.size > this.capacity) {
      const leastRecent = this.#entries.keys().next().value as K;
      this.#entries.delete(leastRecent);
    }
  }

  keys(): K[] {
    return [...this.#entries.keys()];
  }
}

const cache = new LruCache<string, number>(3);
cache.set("p1", 100);
cache.set("p2", 200);
cache.set("p3", 300);
cache.get("p1");          // p1 is now the most recently used
cache.set("p4", 400);     // evicts p2, the least recently used
console.log(cache.keys());
```

**Output:**

```text
[ 'p3', 'p1', 'p4' ]
```

Walkthrough:

- `Map` keeps keys in insertion order. Deleting and setting a key moves it to the end, so the **end** is "most recently used" and the **start** is "least recently used".
- `get` refreshes a key's position; `set` inserts or refreshes, and evicts the first key when over capacity.
- `this.#entries.keys().next().value` reads the first key from the map's iterator ({{ch:advanced-javascript}}) — O(1).
- Every operation is O(1).

**In an interview**, you may be asked to build it without relying on `Map`'s ordering: the classic answer is a hash map from key to node, plus a **doubly linked list** of nodes in order of use — exactly the structures from this chapter.

**Common wrong approach:** storing keys in an array and using `indexOf` and `splice` to move them — correct, but O(n) per operation.

</details>

### Exercise 4 — Find the cycle (debugging)

**Objective:** practise reasoning about references.

**The scenario:** a routing service builds delivery routes as linked lists. Sometimes the function that prints a route never finishes, and the server's CPU goes to 100%. A colleague suspects that a bug occasionally makes a node point back to an earlier node.

**What to build:** a function `hasCycle(head)` that detects whether a linked list contains a cycle, using O(1) extra memory.

**Hint:** use two pointers moving at different speeds — one moves one node at a time, the other two. If there is a cycle, the fast one eventually laps the slow one, like a faster runner on a circular track.

<details>
<summary>Show the solution</summary>

```ts
function hasCycle<T>(head: ListNode<T> | null): boolean {
  let slow = head;
  let fast = head;
  while (fast !== null && fast.next !== null) {
    slow = slow!.next;
    fast = fast.next.next;
    if (slow === fast) return true;
  }
  return false;
}

const a = new ListNode("Depot");
const b = new ListNode("Gulberg");
const c = new ListNode("DHA");
a.next = b;
b.next = c;
console.log(hasCycle(a));

c.next = b;               // the bug: DHA points back to Gulberg
console.log(hasCycle(a));
```

**Output:**

```text
false
true
```

Walkthrough:

- `slow` moves one step, `fast` two steps, per loop.
- Without a cycle, `fast` reaches the end (`null`) and the loop stops: no cycle.
- With a cycle, both pointers end up going round it forever; because `fast` gains one node per step, it must eventually land on the same node as `slow`. `slow === fast` compares **references** — the same node object ({{ch:arrays}}).
- O(n) time and O(1) extra space. This is called **Floyd's cycle-finding algorithm**, or the "tortoise and hare" — a classic interview question.

A simpler alternative stores every visited node in a `Set` and reports a cycle when a node repeats: also O(n) time, but O(n) memory.

**Fixing the real bug:** the detection tells you a cycle exists; the routing code that wired `c.next = b` must still be found and fixed. Meanwhile, `hasCycle` can be used as a guard — refuse to print or process a route that contains a cycle, and log an error with the route's ID.

</details>

## Summary

A **linked list** is a chain of **nodes**, each holding a value and a reference to the next; the **head** starts it and the **tail** ends it. Reading by position is O(n), but adding or removing at the start — or at any position you already hold — is O(1), because only references change. A **tail reference** makes adding at the end O(1); **doubly linked lists** add a previous reference for backward travel and O(1) removal of a known node. Linked-list bugs hide in special cases (empty, head, tail) and in overwriting a `next` before saving it. Arrays are usually faster in practice, but linked lists underpin queues, LRU caches and much system software.

A **stack** is **LIFO**: push, pop and peek in O(1); a JavaScript array is a fine stack. Stacks power undo, back buttons, the call stack, bracket matching and depth-first search. A **queue** is **FIFO**: enqueue and dequeue. `shift` makes queues O(n) per dequeue; use a linked list or an array with a moving front index for O(1). Queues power job processing, messaging, the event loop and breadth-first search. **Deques** work at both ends; **priority queues** remove the most important item first, usually with a heap. Real backends use **durable queue systems** with acknowledgements, retries and dead-letter queues, delivering **at least once** — so consumers must be idempotent.

## Key terms

- **Node** — An object holding a value and one or more references to other nodes.
- **Linked list** — A sequence of nodes in which each node refers to the next.
- **Head / tail** — The first and last nodes of a linked list.
- **Singly linked list** — A linked list whose nodes refer only to the next node.
- **Doubly linked list** — A linked list whose nodes refer to both the next and previous nodes.
- **Traversal** — Visiting every element of a structure, such as following a linked list from head to tail.
- **Stack** — A collection where the last item added is the first removed (LIFO).
- **LIFO** — Last in, first out.
- **Push / pop / peek** — Adding to the top of a stack, removing from the top, and looking at the top without removing.
- **Queue** — A collection where the first item added is the first removed (FIFO).
- **FIFO** — First in, first out.
- **Enqueue / dequeue** — Adding to the back of a queue and removing from the front.
- **Deque** — A double-ended queue allowing additions and removals at both ends.
- **Priority queue** — A collection that always removes the item with the highest priority next.
- **Abstract data type** — A description of what operations a collection supports, independent of how it is built.
- **LRU cache** — A cache that evicts the least recently used entry when full.
- **Cycle (linked list)** — A situation where following `next` references eventually returns to an earlier node.
- **Floyd's cycle-finding algorithm** — Detecting a cycle with two pointers moving at different speeds; also called "tortoise and hare".
- **Job queue** — A queue of tasks waiting to be processed by background workers.
- **Durable queue** — A queue whose contents survive restarts and failures.
- **Acknowledgement (queue)** — A worker's confirmation that it finished a job, after which the job is removed.
- **Dead-letter queue** — A separate queue for messages that repeatedly fail, so they do not block others.
- **At-least-once delivery** — A guarantee that every message is delivered, possibly more than once.
- **Ageing** — Gradually raising the priority of waiting items so they are not starved.
- **Eventually consistent** — Describes a system where updates reach all parts after a short delay rather than instantly.

## What comes next

Linked lists, stacks and queues are all **linear**: one item after another. Much of the world is not linear. A company has managers with teams, who have teams of their own. A file system has folders inside folders. A city's roads connect many places in many directions. Social networks connect people to people.

In the next chapter, **Trees, Heaps and Graphs**, you will learn the structures for **hierarchies** and **networks**: trees and binary search trees, the heaps that make priority queues fast, and graphs with the classic ways to explore them — depth-first and breadth-first search — which power everything from folder browsers to route planning and recommendation systems.
