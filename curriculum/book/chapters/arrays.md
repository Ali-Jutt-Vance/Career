# Arrays: Working with Lists

> [!GOALS]
> - What an array is, why programs need lists, and how arrays are stored.
> - How to create arrays, read and change items by index, and use `length`.
> - How to add and remove items at the end, the start and the middle.
> - How to search an array: `includes`, `indexOf`, `find`, `findIndex`, `some` and `every`.
> - How to loop over arrays with `for`, `for...of` and `forEach`.
> - The three most important array tools in modern JavaScript: `map`, `filter` and `reduce`.
> - How to sort correctly — and the famous trap that sorts numbers wrongly.
> - Copying versus sharing: why changing an array in one place can change it "everywhere", and how to avoid it.
> - Spread, rest and destructuring: modern syntax you will see in every codebase.
> - Which array methods change the original and which create a new array, and why that matters.

## Why this matters

Almost everything interesting in software is a **list** of something:

- the items in a shopping basket;
- the orders a customer has placed;
- the messages in a chat;
- the stops on a delivery route;
- the search results for "running shoes";
- the users who should receive a notification.

With only the tools from the previous chapters, each value needs its own variable: `item1`, `item2`, `item3`… That cannot work when you do not know how many items there will be — a basket might hold one item or eighty.

An **array** is a single value that holds an **ordered list** of values. One variable, any number of items. Combined with loops ({{ch:loops}}) and functions ({{ch:functions}}), arrays let you work with lists of any size using a few lines of code. In modern JavaScript, a large share of everyday code is array work: transforming lists, filtering them, adding them up, sorting them.

## The simple idea

An array is like a numbered list on a piece of paper:

```text
  Shopping list
  0. shoes
  1. socks
  2. cap
```

You can read any line by its number, add lines at the bottom, cross lines out, count the lines, and go through them from top to bottom. The only unusual thing is that, as with string positions ({{ch:types-of-data}}), the numbering starts at **0**.

> [!ANALOGY]
> An array is like a row of numbered lockers. Each locker holds one thing, and you open a locker by its number. The row knows how many lockers it has.
>
> **Where the analogy breaks:** a real row of lockers has a fixed size. A JavaScript array grows and shrinks as you add and remove items. And when you add an item in the middle, everything after it shifts along to a new number — which would mean moving every locker's contents in real life, and which, as you will see, costs the computer real work too.

## The proper definition and key words

- An **array** is an ordered collection of values, stored in a single value.
- Each value in an array is an **element** (or **item**).
- Each element has an **index**: its position, starting from 0.
- The **length** of an array is the number of elements it holds.
- An **empty array** has no elements and a length of 0.
- A method that **mutates** an array changes the original array. A **non-mutating** method leaves the original alone and returns a new value.

In JavaScript, arrays are **objects** (the eighth type from {{ch:types-of-data}}), which means they behave differently from primitives in one important way — explained in "Copying versus sharing" below.

## Creating arrays and reading them

### Level 1 — Square brackets

You create an array by writing its elements inside **square brackets**, separated by commas:

```js
const basket = ["shoes", "socks", "cap"];
const prices = [4500, 600, 1200];
const empty = [];

console.log(basket);
console.log(prices.length);
console.log(empty.length);
```

**Output:**

```text
[ 'shoes', 'socks', 'cap' ]
3
0
```

- `basket` holds three strings. Node.js prints arrays with square brackets and single quotes around strings.
- `prices.length` is 3.
- `[]` creates an empty array, with length 0.

An array can hold values of any type, even a mix — `[42, "hello", true, null]` — but in practice an array usually holds values of **one kind**: all prices, all names, all orders. Mixed arrays are confusing to work with, and TypeScript ({{ch:typescript-basics}}) will usually prevent them.

> [!TIP]
> When an array is long, write one element per line, with a comma after every element — including the last. This **trailing comma** is allowed in JavaScript, and it means adding a new element later changes only one line, which keeps Git's record of changes ({{ch:git}}) clean. Prettier adds trailing commas automatically.
>
> ```js
> const deliveryCities = [
>   "Lahore",
>   "Karachi",
>   "Islamabad",
> ];
> ```

### Level 2 — Reading and changing elements by index

You read an element with its index in square brackets — exactly as you read characters of a string:

```js
const basket = ["shoes", "socks", "cap"];

console.log(basket[0]);
console.log(basket[2]);
console.log(basket[basket.length - 1]);
console.log(basket.at(-1));
console.log(basket[5]);
```

**Output:**

```text
shoes
cap
cap
cap
undefined
```

Walkthrough:

- `basket[0]` is the first element; `basket[2]` the third.
- `basket[basket.length - 1]` is the last element of any array — the same pattern as with strings.
- `basket.at(-1)` is a newer, shorter way to read from the end: negative numbers count backwards, so `-1` is the last element and `-2` the second to last.
- `basket[5]` does not exist, so it gives `undefined` — no error.

Unlike strings, arrays **can be changed**. You can replace an element by assigning to its index:

```js
const basket = ["shoes", "socks", "cap"];
basket[1] = "sandals";
console.log(basket);
```

**Output:**

```text
[ 'shoes', 'sandals', 'cap' ]
```

Notice that `basket` is a `const`, yet we changed its contents. This is the point the warning in {{ch:first-program}} promised to explain: **`const` stops the variable from being pointed at a different array; it does not stop the array itself from being changed.** The name `basket` still refers to the same array — it is the array's contents that changed. We will look at this carefully under "Copying versus sharing".

### How arrays are stored

> [!INSIDE]
> In {{ch:what-a-computer-is}} you learned that memory is a long row of numbered boxes. An array's elements are, conceptually, stored one after another, in order. That is why reading an element by index is **instant**, whatever the array's size: to find element 5,000, the engine does not count through the first 4,999; it calculates where element 5,000 must be and goes straight there.
>
> The flip side: inserting or removing an element **at the start or in the middle** means every element after it must shift one place along — for a large array, that is a lot of moving. Adding or removing at the **end** involves no shifting at all. Real JavaScript engines store arrays in clever, varied ways, but these speed differences hold in practice, and you will meet them precisely in {{ch:big-o}}.

## Adding and removing elements

### At the end: `push` and `pop`

```js
const basket = ["shoes"];

basket.push("socks");
basket.push("cap", "belt");
console.log(basket);

const removed = basket.pop();
console.log(removed);
console.log(basket);
```

**Output:**

```text
[ 'shoes', 'socks', 'cap', 'belt' ]
belt
[ 'shoes', 'socks', 'cap' ]
```

- `push` adds one or more elements to the **end**. It mutates the array.
- `pop` removes the **last** element and returns it, so you can use it — here we stored it in `removed`.

These are fast operations, because nothing else in the array needs to move.

### At the start: `unshift` and `shift`

```js
const queue = ["Sara", "Bilal"];

queue.unshift("Ayesha");
console.log(queue);

const next = queue.shift();
console.log(next, queue);
```

**Output:**

```text
[ 'Ayesha', 'Sara', 'Bilal' ]
Ayesha [ 'Sara', 'Bilal' ]
```

- `unshift` adds to the **start**. Every existing element moves up one index.
- `shift` removes the **first** element and returns it. Every remaining element moves down one index.

These are slower for very large arrays, because of the shifting. For a few thousand elements you will never notice; for millions, it matters.

> [!NOTE]
> `push` with `shift` gives a **queue**: first in, first out — like customers waiting in line. `push` with `pop` gives a **stack**: last in, first out — like a stack of plates, or the call stack from {{ch:functions}}. Queues and stacks are fundamental structures you will study properly in {{ch:linked-lists-stacks-queues}}.

### In the middle: `splice`

`splice` removes and/or inserts elements at any position. It mutates the array and returns the removed elements:

```js
const stops = ["Depot", "Gulberg", "DHA", "Johar Town", "Depot"];

const removed = stops.splice(2, 1);
console.log(removed, stops);

stops.splice(1, 0, "Model Town");
console.log(stops);
```

**Output:**

```text
[ 'DHA' ] [ 'Depot', 'Gulberg', 'Johar Town', 'Depot' ]
[ 'Depot', 'Model Town', 'Gulberg', 'Johar Town', 'Depot' ]
```

Walkthrough:

- `splice(2, 1)` means "starting at index 2, remove 1 element". It removes `"DHA"` and returns it (in an array).
- `splice(1, 0, "Model Town")` means "at index 1, remove 0 elements, and insert `"Model Town"`". Everything from index 1 onwards moves along.

`splice` is powerful but easy to misread. Its first argument is always the starting index, its second is how many to delete, and any further arguments are inserted.

## Looping over arrays

Everything you learned in {{ch:loops}} works on arrays.

**The counting `for` loop** — when you need the index:

```js
const prices = [4500, 600, 1200];

for (let i = 0; i < prices.length; i++) {
  console.log(`Item ${i + 1}: Rs ${prices[i]}`);
}
```

**Output:**

```text
Item 1: Rs 4500
Item 2: Rs 600
Item 3: Rs 1200
```

(`i + 1` turns the zero-based index into the human-friendly "Item 1, 2, 3".)

**`for...of`** — when you only need each element:

```js
const prices = [4500, 600, 1200];
let total = 0;

for (const price of prices) {
  total += price;
}

console.log("Total:", total);
```

**Output:**

```text
Total: 6300
```

**`forEach`** — a method that calls a function for each element. It is a **higher-order function** ({{ch:functions}}): you pass it a **callback**, which it calls once per element, giving it the element, its index, and the whole array:

```js
const basket = ["shoes", "socks", "cap"];

basket.forEach((item, index) => {
  console.log(`${index}: ${item}`);
});
```

**Output:**

```text
0: shoes
1: socks
2: cap
```

Walkthrough:

- `forEach` goes through the array for you. For each element, it calls your arrow function.
- The first parameter receives the element (`item`), the second its index (`index`). You can leave out parameters you do not need: `basket.forEach((item) => console.log(item))`.

Which to use? `for...of` is often the clearest, and — unlike `forEach` — it allows `break` and `continue`. `forEach` is common in existing code. The counting `for` loop is for when you need the index for something more than printing, or need to go backwards or in steps.

## Searching an array

| Method | Question it answers | Returns |
|---|---|---|
| `includes(value)` | Is this value in the array? | `true` / `false` |
| `indexOf(value)` | Where is this value? | index, or `-1` if not found |
| `find(test)` | Which is the first element that passes this test? | the element, or `undefined` |
| `findIndex(test)` | Where is the first element that passes this test? | index, or `-1` |
| `some(test)` | Does **at least one** element pass this test? | `true` / `false` |
| `every(test)` | Do **all** elements pass this test? | `true` / `false` |

`includes` and `indexOf` look for an **exact value**:

```js
const deliveryCities = ["Lahore", "Karachi", "Islamabad"];

console.log(deliveryCities.includes("Karachi"));
console.log(deliveryCities.includes("Quetta"));
console.log(deliveryCities.indexOf("Islamabad"));
```

**Output:**

```text
true
false
2
```

The other four take a **test function** — a callback that receives each element and returns `true` or `false`. Such a function is often called a **predicate**:

```js
const prices = [4500, 600, 1200, 8000];

console.log(prices.find((price) => price > 1000));
console.log(prices.findIndex((price) => price > 1000));
console.log(prices.some((price) => price > 5000));
console.log(prices.every((price) => price > 500));
console.log(prices.find((price) => price > 10000));
```

**Output:**

```text
4500
0
true
true
undefined
```

Walkthrough:

- `find` calls the test on each price in order and returns the **first** one for which it returns `true`: 4500. It stops searching immediately, like the `break` pattern from {{ch:loops}}.
- `findIndex` does the same but returns the index: 0.
- `some` asks "is any price over 5,000?" — yes, 8,000.
- `every` asks "is every price over 500?" — yes.
- When nothing passes, `find` returns `undefined`.

Each of these is a loop you no longer need to write by hand. Compare `prices.some((price) => price > 5000)` with the equivalent loop, flag variable and `break` — the method states its intention directly.

## The big three: `map`, `filter` and `reduce`

These three methods are the heart of modern JavaScript array work. Each replaces a common loop pattern from {{ch:loops}}, and none of them changes the original array.

### `map` — transform every element

`map` creates a **new array** of the same length, where each element is the result of calling your function on the corresponding original element.

```js
const pricesInRupees = [4500, 600, 1200];
const pricesInPaisa = pricesInRupees.map((rupees) => rupees * 100);

console.log(pricesInPaisa);
console.log(pricesInRupees);
```

**Output:**

```text
[ 450000, 60000, 120000 ]
[ 4500, 600, 1200 ]
```

```text
  [ 4500,   600,  1200 ]
      |      |      |      map: rupees => rupees * 100
      v      v      v
  [ 450000, 60000, 120000 ]
```

Walkthrough:

- For each element, `map` calls the arrow function and puts whatever it **returns** into the new array, at the same position.
- The original `pricesInRupees` is unchanged.

Use `map` whenever you think "turn this list of X into a list of Y": prices into formatted text, user records into names, rupees into paisa.

```js
const formatted = [450000, 60000].map((paisa) => `Rs ${(paisa / 100).toFixed(2)}`);
console.log(formatted);
```

**Output:**

```text
[ 'Rs 4500.00', 'Rs 600.00' ]
```

> [!WARNING]
> The function you give `map` must **return** a value. With braces and no `return`, it returns `undefined` — the same trap as in {{ch:functions}}:
>
> ```js
> [1, 2, 3].map((n) => { n * 2 });   // [ undefined, undefined, undefined ]
> ```

### `filter` — keep only some elements

`filter` creates a **new array** containing only the elements for which your test returns `true`.

```js
const prices = [4500, 600, 1200, 8000, 300];
const affordable = prices.filter((price) => price <= 1500);

console.log(affordable);
```

**Output:**

```text
[ 600, 1200, 300 ]
```

```text
  [ 4500,  600,  1200,  8000,  300 ]
      x     ok     ok     x     ok      filter: price <= 1500
  [        600,  1200,        300 ]
```

The new array can be shorter than the original — or empty, if nothing passes. Use `filter` whenever you think "keep only the ones that…": in-stock products, unread messages, orders from this month.

### `reduce` — combine everything into one value

`reduce` goes through the array and **combines all the elements into a single value** — a total, a maximum, a count, a combined text. It is the **accumulator pattern** from {{ch:loops}}, in method form.

```js
const prices = [4500, 600, 1200];

const total = prices.reduce((runningTotal, price) => runningTotal + price, 0);
console.log(total);
```

**Output:**

```text
6300
```

`reduce` takes two arguments: a function, and a **starting value** (here `0`). The function receives the **accumulator** — the result so far — and the current element, and returns the **new** accumulator.

```text
  start:       runningTotal = 0
  element 4500: 0    + 4500 = 4500
  element 600:  4500 + 600  = 5100
  element 1200: 5100 + 1200 = 6300   <- final result
```

The table shows each step: the value returned by one call becomes the accumulator for the next.

`reduce` can produce any kind of result. Here it finds the largest price:

```js
const prices = [4500, 600, 1200, 8000, 300];
const highest = prices.reduce((best, price) => (price > best ? price : best), -Infinity);
console.log(highest);
```

**Output:**

```text
8000
```

> [!TIP]
> **Always give `reduce` a starting value.** Without one, it uses the first element as the start — which works for adding numbers, but fails with an error on an empty array (`TypeError: Reduce of empty array with no initial value`). Empty baskets happen. A starting value makes `reduce` safe for every input.
>
> Also, `reduce` is the hardest of the three to read. For simple totals it is perfect. For anything complicated, a clear `for...of` loop is often easier for a colleague to understand — and that matters more than cleverness.

### Chaining them together

Because `map` and `filter` return new arrays, you can call another method directly on the result — **chaining**, as you did with string methods in {{ch:types-of-data}}:

```js
const pricesInRupees = [4500, 600, 1200, 8000, 300];

const totalPaisaOfAffordable = pricesInRupees
  .filter((rupees) => rupees <= 1500)
  .map((rupees) => rupees * 100)
  .reduce((sum, paisa) => sum + paisa, 0);

console.log(totalPaisaOfAffordable);
```

**Output:**

```text
210000
```

Read it from top to bottom, like a sentence: "take the prices, keep the affordable ones (600, 1200, 300), convert them to paisa (60,000, 120,000, 30,000), and add them up". Each step produces a new array that the next step works on. Putting each step on its own line, starting with a dot, makes long chains easy to read.

This style — describing *what* you want as a series of transformations, rather than *how* to loop step by step — is called **declarative**, as opposed to the **imperative** style of hand-written loops. You will explore it further in {{ch:functional-programming}}.

## Sorting

### The trap: default sort is alphabetical

`sort` arranges an array's elements in order. It **mutates** the array. And it contains one of JavaScript's most famous traps:

```js
const names = ["Sara", "bilal", "Ayesha", "Zain"];
names.sort();
console.log(names);

const prices = [4500, 600, 1200, 80, 10000];
prices.sort();
console.log(prices);
```

**Output:**

```text
[ 'Ayesha', 'Sara', 'Zain', 'bilal' ]
[ 10000, 1200, 4500, 600, 80 ]
```

Two problems:

1. The names are sorted by character code, so all capitalised names come before `"bilal"` — the same capital-letters-first behaviour you met in {{ch:operators-and-decisions}}.
2. The **numbers are in the wrong order**. By default, `sort` converts every element to a **string** and compares the strings. As strings, `"10000"` comes before `"1200"` (because `"0"` < `"2"` in the second character), and `"80"` comes last (because `"8"` is the largest first digit).

### Sorting correctly with a compare function

To sort properly, give `sort` a **compare function**. It receives two elements, `a` and `b`, and returns:

- a **negative** number if `a` should come **before** `b`;
- a **positive** number if `a` should come **after** `b`;
- **zero** if their order does not matter.

For numbers, `a - b` does exactly this:

```js
const prices = [4500, 600, 1200, 80, 10000];

prices.sort((a, b) => a - b);
console.log(prices);

prices.sort((a, b) => b - a);
console.log(prices);
```

**Output:**

```text
[ 80, 600, 1200, 4500, 10000 ]
[ 10000, 4500, 1200, 600, 80 ]
```

- `(a, b) => a - b` sorts **ascending** (smallest first). If `a` is 600 and `b` is 1200, the result is −600 — negative — so 600 goes first.
- `(a, b) => b - a` sorts **descending** (largest first).

For text in human alphabetical order, use the string method `localeCompare`, which handles capital letters, accents and different languages correctly:

```js
const names = ["Sara", "bilal", "Ayesha", "Zain"];
names.sort((a, b) => a.localeCompare(b));
console.log(names);
```

**Output:**

```text
[ 'Ayesha', 'bilal', 'Sara', 'Zain' ]
```

> [!WARNING]
> **`sort` changes the original array.** If other code is using that array, its order changes too. Modern JavaScript (2023 onwards) has a non-mutating version, **`toSorted`**, which returns a new sorted array and leaves the original alone: `const sorted = prices.toSorted((a, b) => a - b);`. Prefer it when available. In older environments, copy first and then sort: `[...prices].sort(...)` (the `...` is explained below).

## Copying versus sharing

### Level 4 — Two names, one array

This is the single most important idea about arrays, and the source of many real bugs. Look carefully:

```js
const original = ["shoes", "socks"];
const other = original;

other.push("cap");

console.log(original);
console.log(other);
```

**Output:**

```text
[ 'shoes', 'socks', 'cap' ]
[ 'shoes', 'socks', 'cap' ]
```

We pushed to `other` — and `original` changed too.

Here is why. Remember the "name tag on a string" picture from {{ch:first-program}}. The line `const other = original;` does **not** copy the array. It ties a **second name tag to the same array**. There is only one array in memory, with two names pointing at it.

```text
    original  ----+
                  +---->  [ 'shoes', 'socks', 'cap' ]   (one array in memory)
    other     ----+
```

So a change made through either name is visible through both. Programmers say that arrays (and all objects) are handled **by reference**: a variable holds a **reference** — a pointer to where the array lives — not the array itself.

Primitives behave differently. With numbers and strings, assigning makes an independent value:

```js
let a = 5;
let b = a;
b = 10;
console.log(a, b);
```

**Output:**

```text
5 10
```

Changing `b` does not affect `a`. Primitives cannot be changed in place anyway (they are immutable, {{ch:types-of-data}}), so sharing them would never be visible. Arrays *can* be changed in place, so sharing them matters.

| | Primitives (number, string, boolean…) | Arrays and objects |
|---|---|---|
| `b = a` | `b` gets its own value | `b` refers to the **same** array as `a` |
| Change through `b` | `a` unaffected | visible through `a` too |
| `===` compares | the values | whether they are the **same array** |

That last row has a surprising consequence:

```js
console.log([1, 2, 3] === [1, 2, 3]);

const list = [1, 2, 3];
const sameList = list;
console.log(list === sameList);
```

**Output:**

```text
false
true
```

Two separately created arrays with identical contents are **not** `===`, because they are two different arrays in memory. `===` on arrays asks "are these the same array?", not "do these have the same contents?". To compare contents, you must compare element by element (for example with `every`).

### Making a real copy

To get an independent copy, create a **new array** containing the same elements. The most common way is the **spread operator**, written as three dots `...`:

```js
const original = ["shoes", "socks"];
const copy = [...original];

copy.push("cap");

console.log(original);
console.log(copy);
```

**Output:**

```text
[ 'shoes', 'socks' ]
[ 'shoes', 'socks', 'cap' ]
```

`[...original]` means "a new array, spread out with all the elements of `original` inside it". Now there are two separate arrays, and changing one does not affect the other. `original.slice()` (with no arguments) also makes a copy, and you will see it in older code.

> [!NOTE]
> These copies are **shallow**: they copy the top-level elements. If the elements are themselves arrays or objects, the copy and the original still **share** those inner ones. For arrays of numbers and strings, a shallow copy is all you need. Copying nested data properly — a **deep copy** — is covered in {{ch:objects}}.

### Why this matters in real code

Consider a function that is meant to return a sorted list of prices for display:

```js
function getSortedPrices(prices) {
  return prices.sort((a, b) => a - b);
}

const basketPrices = [4500, 600, 1200];   // in the order the customer added them
const display = getSortedPrices(basketPrices);

console.log(display);
console.log(basketPrices);
```

**Output:**

```text
[ 600, 1200, 4500 ]
[ 600, 1200, 4500 ]
```

The function was supposed to produce a sorted list for display, but because `sort` mutates and arrays are shared, it also **reordered the customer's basket**. Any code relying on the original order — "remove the item added last", say — is now broken, far away from this function.

The fix is to never mutate an array you were given unless that is clearly the function's job:

```js
function getSortedPrices(prices) {
  return [...prices].sort((a, b) => a - b);   // or prices.toSorted(...)
}
```

This connects directly to the **pure functions** idea from {{ch:functions}}: a function that changes its input array has a **side effect**, even though it looks like a calculation. Many teams adopt a simple rule — **treat arrays you receive as read-only, and return new arrays instead** — precisely to avoid this whole category of bugs. Frontend frameworks such as React ({{ch:react-basics}}) depend on this rule, as you will see.

### Mutating and non-mutating methods

| Mutates the original | Returns something new, original unchanged |
|---|---|
| `push`, `pop`, `unshift`, `shift` | `map`, `filter`, `reduce` |
| `splice` | `slice`, `concat` |
| `sort`, `reverse` | `toSorted`, `toReversed`, `toSpliced` (newer) |
| assigning `arr[i] = x` | `with(i, x)` (newer), spread `[...arr]` |
| `fill` | `find`, `includes`, `some`, `every`, `join`… |

When in doubt, check the method's documentation, or test it in the REPL and print the original afterwards.

## Modern array syntax: spread, rest and destructuring

These features appear in nearly every modern JavaScript file, so it is worth learning them properly.

### Spread: unpacking an array

The **spread operator** `...` takes an array and spreads its elements out individually — wherever a list of values is expected.

```js
const shirts = ["white shirt", "blue shirt"];
const trousers = ["jeans", "chinos"];

const allClothes = [...shirts, ...trousers, "belt"];
console.log(allClothes);

const prices = [4500, 600, 1200];
console.log(Math.max(...prices));
```

**Output:**

```text
[ 'white shirt', 'blue shirt', 'jeans', 'chinos', 'belt' ]
4500
```

- `[...shirts, ...trousers, "belt"]` builds a new array from the elements of two arrays plus one extra item — combining arrays without changing either.
- `Math.max(...prices)` — `Math.max` expects separate numbers as arguments, like `Math.max(4500, 600, 1200)`, not an array. Spread unpacks the array into separate arguments.

### Rest parameters: collecting arguments into an array

The same `...` used in a function's **parameter list** does the opposite: it **collects** any number of arguments into an array. This is called a **rest parameter** (it gathers "the rest" of the arguments). In {{ch:functions}} you learned that extra arguments are ignored — unless the function asks for them; this is how it asks:

```js
function sumAll(...numbers) {
  return numbers.reduce((total, n) => total + n, 0);
}

console.log(sumAll(1, 2, 3));
console.log(sumAll(4500, 600, 1200, 250));
console.log(sumAll());
```

**Output:**

```text
6
6550
0
```

`...numbers` gathers every argument into an array called `numbers`, however many there are — even none. A rest parameter must be the **last** parameter.

The rule for telling them apart: **in a function's parameter list, `...` collects (rest). Everywhere else, `...` spreads.**

### Destructuring: unpacking into variables

**Destructuring** pulls elements out of an array into separate variables in one statement:

```js
const coordinates = [31.5204, 74.3587];
const [latitude, longitude] = coordinates;

console.log(latitude);
console.log(longitude);
```

**Output:**

```text
31.5204
74.3587
```

`const [latitude, longitude] = coordinates;` means: "create `latitude` from element 0 and `longitude` from element 1". The square brackets on the **left** of `=` are not creating an array; they describe the **shape** to unpack.

You can skip elements, collect the rest, and give defaults:

```js
const finishers = ["Sara", "Bilal", "Ayesha", "Zain", "Omar"];
const [winner, , third, ...others] = finishers;
console.log(winner, third, others);

const [first = "nobody"] = [];
console.log(first);
```

**Output:**

```text
Sara Ayesha [ 'Zain', 'Omar' ]
nobody
```

- An empty space between commas skips element 1.
- `...others` collects every remaining element into a new array.
- `= "nobody"` provides a default if the element is missing.

And here is the one-line swap promised in {{ch:first-program}}:

```js
let morningShift = "Sara";
let eveningShift = "Bilal";

[morningShift, eveningShift] = [eveningShift, morningShift];
console.log(morningShift, eveningShift);
```

**Output:**

```text
Bilal Sara
```

The right side creates a temporary array `["Bilal", "Sara"]`, then destructuring assigns its elements to the two variables. No `temporary` variable needed.

## Other useful array tools

```js
const tags = ["cotton", "summer", "men"];
console.log(tags.join(", "));

console.log(["a", "b", "c", "d", "e"].slice(1, 3));

console.log([1, [2, 3], [4, [5]]].flat());

console.log(Array.from({ length: 5 }, (_, i) => i * 10));

console.log([...new Set(["Lahore", "Karachi", "Lahore", "Multan", "Karachi"])]);

console.log(Array.isArray(tags), typeof tags);
```

**Output:**

```text
cotton, summer, men
[ 'b', 'c' ]
[ 1, 2, 3, 4, [ 5 ] ]
[ 0, 10, 20, 30, 40 ]
[ 'Lahore', 'Karachi', 'Multan' ]
true object
```

Walkthrough:

- **`join(", ")`** combines all elements into one string, with the given text between them — the opposite of `split` from {{ch:types-of-data}}.
- **`slice(1, 3)`** returns a new array from index 1 up to (not including) 3. It works just like the string `slice`, and does not mutate. (Do not confuse it with `splice`, which does mutate.)
- **`flat()`** flattens arrays inside an array by one level.
- **`Array.from({ length: 5 }, (_, i) => i * 10)`** creates a new array of length 5, filling each position by calling the function with the index. The `_` is a conventional name for a parameter you do not need.
- **`new Set(...)`** creates a **Set** — a collection in which each value can appear only once — so duplicates disappear. Spreading it back into `[...]` gives an array with duplicates removed. Sets are covered properly in {{ch:arrays-strings-hash-maps}}; this "remove duplicates" one-liner is worth remembering now.
- **`Array.isArray(tags)`** checks whether a value is an array. You need it because `typeof` says `"object"` for arrays (arrays are objects).

## A first look at lists of records

Real arrays usually hold not single numbers but **records** — groups of related values, such as a product with a name, a price and a stock count. In JavaScript, a record is an **object**, written with curly braces. Objects are the subject of the next chapter; here is just enough to see how arrays and objects work together:

```js
const products = [
  { name: "Cotton shirt", pricePaisa: 129950, inStock: true },
  { name: "Leather belt", pricePaisa: 89900, inStock: false },
  { name: "Cap", pricePaisa: 49900, inStock: true },
];

const availableNames = products
  .filter((product) => product.inStock)
  .map((product) => product.name);

console.log(availableNames);
```

**Output:**

```text
[ 'Cotton shirt', 'Cap' ]
```

Each element of `products` is an object; `product.name` reads its `name` field, and `product.inStock` its `inStock` field. The chain reads: "keep the products that are in stock, then turn each into its name". This pattern — an array of objects transformed with `filter`, `map` and `reduce` — is the most common shape of data handling in JavaScript applications. {{ch:objects}} teaches objects fully.

## From beginner to enterprise: arrays at every level

**Level 3 — A small program.** Arrays of numbers or strings, created as literals, looped over, totalled and sorted.

**Level 4 — A real application.** Arrays of objects arrive from the database or an API as JSON (JSON arrays use the same square brackets — {{ch:how-the-web-works}}). The application filters, maps and totals them for display: basket lines, order histories, search results. Arrays received from elsewhere are treated as read-only; new arrays are created instead of mutating.

**Level 5 — Professional engineering.** Developers think about **size**. Showing a customer's 20 latest orders is fine in memory; loading all 2 million orders to filter them in JavaScript is not — the database should filter, sort and limit ({{ch:sql}}), and only the needed page of results should be sent ({{ch:rest-apis}}). Developers also choose the right structure: if code repeatedly asks "is this ID in the list?", a `Set` or an object lookup ({{ch:arrays-strings-hash-maps}}) is far faster than `includes` on a large array.

**Level 6 — Enterprise.** At very large scale, data rarely fits in one array in one process. Lists are **streamed** — processed piece by piece as they arrive, rather than all at once ({{ch:nodejs}}) — or processed in batches across many machines. Ideas like `map`, `filter` and `reduce` still describe the work; in fact, large data-processing systems are often designed around exactly these operations, applied across thousands of machines in parallel.

## Real-world use cases

### Beginner level — A class's exam results

**Situation:** a teacher has a list of marks and wants the average, the highest mark, and how many students passed.

**Solution:** `reduce` for the sum (divided by `length` for the average), `Math.max(...marks)` for the highest, and `filter((m) => m >= 50).length` for the pass count.

**Lesson:** three questions, three one-line answers — no hand-written loops.

### Intermediate level — A basket summary

**Business problem:** an online shop must show each basket line, the item count and the total.

**Solution:** the basket is an array of line objects. `map` produces display lines; `reduce` computes the total in paisa; `reduce` again (or a loop) adds up the quantities.

**Failure scenario:** a developer sorts the basket for display with `sort`, which mutates it, and the "undo last item" button starts removing the wrong item. Using `toSorted` or a copy avoids it.

### Advanced level — "Is this user blocked?" made fast

**Business problem:** a messaging platform checks every incoming message against a list of 200,000 blocked user IDs.

**Technical problem:** `blockedIds.includes(senderId)` checks the list element by element — up to 200,000 comparisons per message. With thousands of messages per second, the servers struggle.

**Solution:** store the blocked IDs in a `Set`. Checking `blockedSet.has(senderId)` takes about the same short time whatever the size of the set.

**Reasoning and trade-off:** the Set uses more memory than the array, but turns the dominant cost from "proportional to the list size" to "constant". You will learn why in {{ch:big-o}} and {{ch:arrays-strings-hash-maps}}.

### Enterprise level — Paginating a huge order history

**Business problem (illustrative):** an e-commerce company's largest business customers have hundreds of thousands of orders. The "My orders" page for them times out.

**Technical problem:** the backend loads every order into one array, sorts it, then takes the first 20.

**Solution:** ask the database for only the 20 needed, already sorted, using limits and indexes ({{ch:indexes}}); return the next page only when requested.

**Lesson:** array methods are excellent for data already in memory. Deciding **what data should be in memory at all** is an architectural decision.

## Common mistakes

### Beginner mistake — Sorting numbers without a compare function

**What it looks like:** `[10, 9, 100].sort()` giving `[10, 100, 9]`.

**Why it happens:** the default sort compares elements as strings.

**How to fix it:** always pass a compare function for numbers: `(a, b) => a - b`.

### Beginner mistake — Off-by-one indexes

**What it looks like:** `arr[arr.length]` giving `undefined`; loops with `<=` running one step too far.

**How to fix it:** the last index is `length - 1`; use `at(-1)`, `for...of` or array methods to avoid index arithmetic.

### Beginner mistake — Forgetting `return` in a `map` callback

**What it looks like:** an array full of `undefined`.

**How to fix it:** use an arrow without braces for single expressions, or add `return`.

### Intermediate mistake — Accidentally sharing an array

**What it looks like:** "I changed `copy`, and `original` changed too."

**Why it happens:** `const copy = original` copies the reference, not the array.

**How to fix it:** `const copy = [...original];` — and remember copies are shallow.

### Intermediate mistake — Mutating an array you are looping over

**What it looks like:**

```js
const prices = [100, 200, 300, 400];
for (let i = 0; i < prices.length; i++) {
  if (prices[i] > 150) prices.splice(i, 1);
}
console.log(prices);  // [ 100, 300 ]
```

**What happens:** removing an element shifts the rest down, so the loop skips the element that moved into the current index. `300` should have been removed but survived.

**How to fix it:** build a new array instead: `const kept = prices.filter((p) => p <= 150);`.

### Intermediate mistake — Comparing arrays with `===`

**What it looks like:** `if (selectedIds === [1, 2])` — always false.

**How to fix it:** compare lengths and elements, e.g. `a.length === b.length && a.every((value, i) => value === b[i])`.

### Production mistake — Loading everything into one array

**What it looks like:** fetching an entire table or API result set into memory to filter or count it.

**What happens:** slow responses, high memory use, and crashes as data grows ({{ch:what-a-computer-is}}).

**How to prevent it:** filter, sort and limit at the source (the database or the API); process large data in batches or streams.

### Enterprise mistake — `includes` on huge lists in hot paths

**What it looks like:** checking membership in a large array on every request.

**What happens:** CPU usage grows with the list size; latency rises as the business grows.

**How to prevent it:** use a `Set` (or an object/`Map` keyed by ID) for repeated lookups.

## Debugging and troubleshooting

| Symptom | Likely cause |
|---|---|
| `undefined` when reading an element | Index past the end, or off by one |
| Numbers sorted "wrongly" (10 before 9) | `sort()` with no compare function |
| An array changed "by itself" | It is shared — some other code holds a reference to the same array and mutated it |
| `[undefined, undefined, ...]` from `map` | The callback does not return |
| `TypeError: Reduce of empty array with no initial value` | `reduce` without a starting value, on an empty array |
| `TypeError: x.map is not a function` | `x` is not an array (perhaps `undefined`, an object, or a string) — check with `Array.isArray(x)` |
| Some items skipped when removing in a loop | Mutating the array while looping over it |
| `[1,2] === [1,2]` is false | `===` compares references, not contents |

> [!TIP]
> To see what each step of a chain does, temporarily split it into variables and log each one:
>
> ```js
> const step1 = prices.filter((p) => p <= 1500);
> console.log("after filter:", step1);
> const step2 = step1.map((p) => p * 100);
> console.log("after map:", step2);
> ```
>
> Once the chain works, you can join it back together.

## How a senior engineer thinks about arrays

> [!SENIOR]
> When an experienced engineer works with a list, they ask:
>
> - **How big can this get?** Ten items, ten thousand, ten million? The answer decides whether to keep it in memory, page it, stream it or let the database do the work.
> - **Who else holds this array?** If it came from elsewhere, they treat it as read-only and return new arrays. Accidental shared mutation is one of the hardest bugs to trace, because the symptom appears far from the cause.
> - **Is an array the right structure?** Ordered list → array. "Is X in here?" asked often → `Set`. "Find by ID" → a `Map` or an object keyed by ID.
> - **Is this readable?** `filter` then `map` states intent clearly. A dense, clever `reduce` that does five things may be better written as a plain loop.
> - **Is the sort correct?** Numbers need a compare function; human text needs `localeCompare`; and sorting should not mutate shared data.

## Exercises

### Exercise 1 — Class statistics

**Objective:** practise `reduce`, `filter`, spread and `length`.

**What to build:** given `const marks = [72, 45, 88, 91, 39, 60, 77];`, print the average (rounded to one decimal place), the highest and lowest marks, and how many students passed (50 or more).

<details>
<summary>Show the solution</summary>

```js
const marks = [72, 45, 88, 91, 39, 60, 77];

const total = marks.reduce((sum, mark) => sum + mark, 0);
const average = total / marks.length;
const highest = Math.max(...marks);
const lowest = Math.min(...marks);
const passed = marks.filter((mark) => mark >= 50).length;

console.log(`Average: ${average.toFixed(1)}`);
console.log(`Highest: ${highest}, lowest: ${lowest}`);
console.log(`Passed: ${passed} of ${marks.length}`);
```

**Output:**

```text
Average: 67.4
Highest: 91, lowest: 39
Passed: 5 of 7
```

Walkthrough:

- `reduce` adds the marks, starting from 0: total 472. Dividing by `marks.length` (7) gives about 67.43.
- `toFixed(1)` formats to one decimal place for display.
- `Math.max(...marks)` spreads the array into separate arguments.
- `filter` keeps marks of 50 or more; its `.length` is the count.

**Common wrong approach:** `Math.max(marks)` without spread. `Math.max` receives one argument — the whole array — and returns `NaN`, because an array is not a number.

</details>

### Exercise 2 — Basket total from records

**Objective:** practise chaining with an array of objects.

**Starting point:**

```js
const basket = [
  { name: "Cotton shirt", pricePaisa: 129950, quantity: 2 },
  { name: "Cap", pricePaisa: 49900, quantity: 1 },
  { name: "Socks", pricePaisa: 29900, quantity: 3 },
];
```

**What to build:** (1) an array of text lines like `"2 x Cotton shirt"`; (2) the basket total in paisa; (3) the total number of items. Print all three.

**Hints:** the line total for each record is `item.pricePaisa * item.quantity`.

<details>
<summary>Show the solution</summary>

```js
const basket = [
  { name: "Cotton shirt", pricePaisa: 129950, quantity: 2 },
  { name: "Cap", pricePaisa: 49900, quantity: 1 },
  { name: "Socks", pricePaisa: 29900, quantity: 3 },
];

const lines = basket.map((item) => `${item.quantity} x ${item.name}`);
const totalPaisa = basket.reduce((sum, item) => sum + item.pricePaisa * item.quantity, 0);
const itemCount = basket.reduce((count, item) => count + item.quantity, 0);

console.log(lines);
console.log(`Total: Rs ${(totalPaisa / 100).toFixed(2)}`);
console.log(`Items: ${itemCount}`);
```

**Output:**

```text
[ '2 x Cotton shirt', '1 x Cap', '3 x Socks' ]
Total: Rs 3995.00
Items: 6
```

Walkthrough:

- `map` turns each record into a line of text.
- The first `reduce` adds each line's total: 259,900 + 49,900 + 89,700 = 399,500 paisa.
- The second `reduce` adds the quantities: 2 + 1 + 3 = 6.
- Both start from 0, so an empty basket safely gives a total of 0.

**Common wrong approach:** `basket.length` for the item count. That is the number of *lines* (3), not the number of *items* (6). Make sure you know which one the business means.

</details>

### Exercise 3 — Top three prices without changing the original

**Objective:** practise non-mutating sorting and `slice`.

**What to build:** given `const prices = [4500, 600, 12000, 80, 9999, 1200];`, produce a new array of the three highest prices, highest first, and prove the original is unchanged.

<details>
<summary>Show the solution</summary>

```js
const prices = [4500, 600, 12000, 80, 9999, 1200];

const topThree = [...prices]
  .sort((a, b) => b - a)
  .slice(0, 3);

console.log(topThree);
console.log(prices);
```

**Output:**

```text
[ 12000, 9999, 4500 ]
[ 4500, 600, 12000, 80, 9999, 1200 ]
```

Walkthrough:

- `[...prices]` makes a copy, so sorting cannot affect the original. (`prices.toSorted((a, b) => b - a)` does the same in modern Node.js.)
- `sort((a, b) => b - a)` sorts descending — highest first.
- `slice(0, 3)` takes the first three elements as a new array.
- Printing `prices` proves it is still in its original order.

**Common wrong approach:** `prices.sort()` with no compare function. It sorts as strings — giving `[1200, 12000, 4500, 600, 80, 9999]` — and mutates the original. Two bugs in one line.

</details>

### Exercise 4 — The vanishing items (debugging)

**Objective:** practise diagnosing shared-reference and mutation bugs.

**The scenario:** a delivery app keeps today's stops in an array. A function is meant to return only the stops in Gulberg, for a separate driver. After calling it, the main driver's list is missing stops.

```js
const todaysStops = ["DHA", "Gulberg", "Gulberg", "Johar Town", "Gulberg"];

function takeGulbergStops(stops) {
  const gulberg = [];
  for (let i = 0; i < stops.length; i++) {
    if (stops[i] === "Gulberg") {
      gulberg.push(stops[i]);
      stops.splice(i, 1);
    }
  }
  return gulberg;
}

const forSecondDriver = takeGulbergStops(todaysStops);
console.log("Second driver:", forSecondDriver);
console.log("Main driver:", todaysStops);
```

**What to do:** run it, explain the output, and rewrite the function so that it does not touch the original array and finds every Gulberg stop.

<details>
<summary>Show the solution</summary>

**Output of the original:**

```text
Second driver: [ 'Gulberg', 'Gulberg' ]
Main driver: [ 'DHA', 'Gulberg', 'Johar Town' ]
```

**Two bugs:**

1. **Mutating a shared array.** `stops` is the same array as `todaysStops` (arrays are passed by reference), so `splice` changes the main driver's list. A function described as "return the Gulberg stops" should not quietly edit its input.
2. **Skipping elements while removing in a loop.** When the Gulberg stop at index 1 is removed, the next Gulberg stop slides down into index 1 — but the loop moves on to index 2, skipping it. That is why only two of the three Gulberg stops were found, and one was left behind in the main list.

**Fixed version:**

```js
const todaysStops = ["DHA", "Gulberg", "Gulberg", "Johar Town", "Gulberg"];

function getGulbergStops(stops) {
  return stops.filter((stop) => stop === "Gulberg");
}

const forSecondDriver = getGulbergStops(todaysStops);
console.log("Second driver:", forSecondDriver);
console.log("Main driver:", todaysStops);
```

**Output:**

```text
Second driver: [ 'Gulberg', 'Gulberg', 'Gulberg' ]
Main driver: [ 'DHA', 'Gulberg', 'Gulberg', 'Johar Town', 'Gulberg' ]
```

If the business really wants the Gulberg stops *moved* to the second driver, the clear way is to compute both new lists and reassign deliberately, in the open:

```js
let mainDriverStops = ["DHA", "Gulberg", "Gulberg", "Johar Town", "Gulberg"];
const secondDriverStops = mainDriverStops.filter((stop) => stop === "Gulberg");
mainDriverStops = mainDriverStops.filter((stop) => stop !== "Gulberg");
```

**Lesson:** both bugs come from mutation. Using `filter` to build new arrays removes them entirely, and makes the function pure — it only returns a value, and changes nothing.

</details>

## Summary

An **array** is an ordered list of **elements**, written in square brackets, with zero-based **indexes** and a **length**. Read with `arr[i]` or `arr.at(-1)`. Add and remove with `push`/`pop` (end, fast), `unshift`/`shift` (start, slower for big arrays) and `splice` (anywhere).

Loop with the counting `for`, `for...of` or `forEach`. Search with `includes`, `indexOf`, `find`, `findIndex`, `some` and `every`, most of which take a **predicate** callback. **`map`** transforms every element into a new array; **`filter`** keeps elements that pass a test; **`reduce`** combines everything into one value and should always have a starting value. These can be **chained**, in a **declarative** style.

`sort` compares as **strings** by default and mutates: pass `(a, b) => a - b` for numbers, `localeCompare` for text, and prefer `toSorted` or a copy. Arrays are handled **by reference**: assigning shares the same array, `===` compares identity, and changes are visible through every reference. Copy with spread `[...arr]` (a **shallow** copy). Prefer non-mutating methods and treat received arrays as read-only.

**Spread** unpacks arrays; **rest parameters** collect arguments into arrays; **destructuring** unpacks elements into variables. Other tools include `join`, `slice`, `flat`, `Array.from`, `Array.isArray` and `Set` for removing duplicates. Real arrays usually hold **objects**, the subject of the next chapter.

## Key terms

- **Array** — An ordered collection of values stored in a single value, written in square brackets.
- **Element** — One value stored in an array.
- **Index (array)** — The position of an element in an array, starting from 0.
- **Length** — The number of elements in an array (or characters in a string).
- **Trailing comma** — A comma after the last element of a list, allowed in JavaScript to make adding items cleaner.
- **Mutate** — To change a value in place, such as adding an element to an existing array.
- **Mutating method** — An array method that changes the original array, such as `push`, `sort` or `splice`.
- **Non-mutating method** — A method that leaves the original unchanged and returns a new value, such as `map`, `filter` or `slice`.
- **`push` / `pop`** — Methods that add elements to, or remove the last element from, the end of an array.
- **`unshift` / `shift`** — Methods that add elements to, or remove the first element from, the start of an array.
- **`splice`** — A method that removes and/or inserts elements at any position, mutating the array.
- **Queue** — A collection where the first item added is the first removed (first in, first out).
- **Stack** — A collection where the last item added is the first removed (last in, first out).
- **`forEach`** — An array method that calls a function once for each element.
- **Predicate** — A function that returns true or false, used as a test.
- **`find` / `findIndex`** — Methods that return the first element (or its index) that passes a test.
- **`some` / `every`** — Methods that check whether at least one, or all, elements pass a test.
- **`map`** — A method that creates a new array by transforming each element with a function.
- **`filter`** — A method that creates a new array containing only the elements that pass a test.
- **`reduce`** — A method that combines all elements of an array into a single value using an accumulator.
- **Declarative style** — Code that describes what result is wanted, such as a chain of `filter` and `map`, rather than each step of how to compute it.
- **Imperative style** — Code that spells out each step, such as a hand-written loop with counters.
- **Compare function** — A function given to `sort` that decides the order of two elements by returning a negative, positive or zero number.
- **`localeCompare`** — A string method that compares text in the order people expect for a given language.
- **`toSorted`** — A newer, non-mutating version of `sort` that returns a new sorted array.
- **Reference** — A pointer to where an object or array lives in memory; variables holding arrays hold references.
- **By reference** — Describes values, such as arrays and objects, where assignment shares the same underlying value rather than copying it.
- **Shallow copy** — A copy of an array or object whose top-level elements are copied, but whose nested arrays or objects are still shared.
- **Deep copy** — A copy in which nested arrays and objects are copied too, so nothing is shared.
- **Spread operator (`...`)** — Syntax that unpacks the elements of an array (or properties of an object) into a new array, arguments, or object.
- **Rest parameter** — A function parameter written with `...` that collects any number of arguments into an array.
- **Destructuring** — Syntax that unpacks elements of an array (or properties of an object) into separate variables.
- **`join`** — A method that combines array elements into one string with a separator.
- **`slice` (array)** — A non-mutating method that returns part of an array as a new array.
- **`Set`** — A collection in which each value can appear only once.
- **`Array.isArray`** — A function that checks whether a value is an array.
- **Streaming** — Processing data piece by piece as it arrives, rather than holding it all in memory at once.

## What comes next

Arrays organise values into **ordered lists**. But much of the world is not a list — it is a set of **named facts** about one thing. A customer has a name, an email, a phone number and an address. A product has a title, a price, a stock count and a category. Describing these with arrays would mean remembering that "index 2 is the email", which is fragile and unreadable.

In the next chapter, **Objects: Describing Real Things in Code**, you will learn to group named values into objects, read and change them, put objects inside objects and arrays inside objects, copy them safely, and loop over them — and you will finally see how the JSON data that travels across the web maps directly onto JavaScript objects.
