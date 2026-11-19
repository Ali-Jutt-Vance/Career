# React I: Components, Props and State

> [!GOALS]
> - Explain what problem React solves, using what you learned about keeping the DOM in sync with state.
> - Write **components** as functions, and understand exactly what **JSX** is and what it turns into.
> - Explain how React renders: elements, the render and commit phases, reconciliation, and why **keys** matter.
> - Pass data with **props**, compose components with **children**, and handle **events**.
> - Manage changing data with **state** (`useState`): snapshots, batching, functional updates and immutable updates.
> - Render conditionally and render lists correctly.
> - Build **controlled forms**, **lift state up**, and derive values instead of duplicating them.
> - Set up a React project with Vite and TypeScript, and structure a small application the way professionals do.

## Why this matters

In {{ch:browser-and-dom}} you built a shopping cart in plain JavaScript. You discovered a good pattern — keep the data in a **state** object and write a `render()` function that rebuilds the DOM from it — and its problems: rebuilding everything on every change is wasteful and destroys focus and typed input, while updating only what changed is hard to get right by hand. And with many features on one page — product lists, filters, a cart, a user menu — organising state, rendering and events gets messy fast.

**React** is a JavaScript library, created at Facebook (now Meta) and released as open source in 2013, that solves exactly these problems. You describe what the UI should look like **for the current state**, as functions called **components**. When state changes, React calls your components again, works out the **minimal** set of DOM changes, and applies them — preserving focus, input and scroll position. You stop writing instructions like "find this element and change its text"; you write "for this data, the screen looks like this".

React is the most widely used UI library in industry, and it underpins popular frameworks such as Next.js ({{ch:nextjs}}) and mobile development with React Native. A large share of front-end and full-stack job listings mention it. And the ideas you learn here — components, one-way data flow, UI as a function of state — appear in every modern front-end framework.

This chapter covers the core: components, JSX, rendering, props, state, events, lists and forms. {{ch:react-advanced}} continues with effects, data fetching, refs, context, custom hooks and performance.

## The simple idea

Think of a scoreboard at a cricket ground. The operator does not repaint the board by hand after each ball, deciding which digits to scrape off. Instead, a computer holds the **match state** — runs, wickets, overs — and the board **displays** whatever the state says. When a run is scored, the operator updates the state; the board updates itself, changing only the digits that differ.

React makes your user interface work like that board. You keep the **state** — the cart's items, the selected filter, the text in the search box — and write components that describe the screen **for any state**. When state changes, React updates the screen, changing only what is different.

> [!ANALOGY]
> React is like an electronic scoreboard: you update the match state, and the board redraws itself to match, changing only the digits that differ.
>
> **Where the analogy breaks:** a scoreboard shows a fixed layout of numbers. A React interface can change its whole **structure** with state — new rows appear, a dialog opens, a page section disappears — and React must work out which parts of the old structure correspond to which parts of the new one. That matching process, and the "keys" that guide it, are where most of React's subtlety lies.

## The proper definition and key words

**React** is a JavaScript library for building user interfaces from **components**: reusable functions that take inputs and return a description of what should appear on screen.

The key words:

- **Component** — a function that returns a description of UI. Its name starts with a capital letter: `ProductCard`, `Cart`.
- **JSX** — a syntax extension that lets you write HTML-like markup inside JavaScript or TypeScript. It compiles to ordinary function calls.
- **Element** (React element) — a small, plain JavaScript object describing what to show: "a `button` with these props and this text". Components return elements.
- **Props** (properties) — the inputs a component receives from its parent, read-only.
- **State** — data that a component remembers between renders and that changes over time, usually because of user actions.
- **Render** — calling a component to find out what it should display.
- **Hook** — a special function whose name starts with `use` (such as `useState`) that lets a component use React features like state.
- **Declarative** — describing **what** the result should be, rather than the steps to produce it ({{ch:functional-programming}}). React UIs are declarative.
- **One-way data flow** — data flows **down** from parents to children through props; changes flow **up** through functions passed as props.

## How it works inside

### Level 2 — From state to screen

Here is the cycle React runs:

```text
      ┌──────────────────────────────────────────────────────────┐
      │                                                          │
      ▼                                                          │
   STATE ──▶ RENDER: React calls your components ──▶ new tree    │
                     (pure functions → elements)    of elements  │
                                                         │       │
                                                         ▼       │
                     RECONCILE: compare new tree with previous   │
                                                         │       │
                                                         ▼       │
                     COMMIT: apply the minimal DOM changes       │
                                                         │       │
                                                         ▼       │
             user clicks, types... ──▶ event handler ──▶ setState
```

1. **Render phase.** React calls your component functions. They return **elements** — plain objects describing the UI. Nothing touches the real DOM yet. Because rendering only computes a description, it must be **pure**: no changing outside variables, no network requests, no DOM manipulation inside the component body.
2. **Reconciliation.** React compares the new tree of elements with the tree from the previous render, to find what changed. (This tree of element descriptions is often called the **virtual DOM**.)
3. **Commit phase.** React applies only the necessary changes to the real DOM: update this text node, add that `<li>`, remove this attribute.
4. When something happens — a click, a keystroke, data arriving — an event handler calls a **state setter**. React schedules a new render, and the cycle repeats.

This is the state-to-render pattern from the vanilla cart in {{ch:browser-and-dom}}, with React doing the hard part: computing and applying the minimal changes.

### Level 2 — Reconciliation rules

Comparing two arbitrary trees perfectly is computationally very expensive. React uses two simple rules (heuristics) that make it fast in practice:

1. **Different element types produce different trees.** If a position held a `<div>` and now holds a `<section>` — or a `<ProductCard>` became a `<SoldOutCard>` — React destroys the old subtree (and its state) and builds a new one. It does not try to reuse anything inside.
2. **Same type at the same position: update in place.** If a position held a `<button>` and still holds a `<button>`, React keeps the DOM node and updates only changed attributes and children. For a component of the same type, React keeps its state and renders it again with the new props.

For **lists** of children, React needs help to know which item is which. That is the job of **keys**, covered later in this chapter.

## Setting up a project

### Level 3 — Vite and TypeScript

The standard way to start a React application without a full framework is **Vite**, a fast development server and build tool:

```bash
npm create vite@latest corner-shop -- --template react-ts
cd corner-shop
npm install
npm run dev
```

- `npm create vite@latest` runs Vite's project generator; `--template react-ts` chooses React with TypeScript. (The extra `--` passes the option through npm to the generator.)
- `npm run dev` starts a development server, usually at `http://localhost:5173`, with **hot module replacement**: when you save a file, the change appears in the browser in a fraction of a second, often without losing the page's state.

The generated project contains, among other things:

```text
corner-shop/
├── index.html          the single HTML page; contains <div id="root"></div>
├── package.json
├── vite.config.ts
└── src/
    ├── main.tsx        the entry point: mounts React into #root
    └── App.tsx         the top-level component
```

`main.tsx` connects React to the page:

```tsx
// fragment
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

- `createRoot(domNode)` tells React to take control of everything inside the `#root` element ({{ch:browser-and-dom}}).
- `.render(<App />)` renders the `App` component there.
- **`StrictMode`** is a development-only helper: it deliberately runs some code twice to expose bugs, such as impure components and effects without clean-up ({{ch:react-advanced}}). It has no effect in production builds.
- Files containing JSX use the `.tsx` extension (or `.jsx` without TypeScript).

For a production application that needs routing, server rendering and data loading, the React team recommends starting with a **framework** such as Next.js ({{ch:nextjs}}). Vite with plain React is ideal for learning, for single-page applications and for embedding React into existing pages.

## Components and JSX

### Level 3 — Your first component

```tsx
// fragment
export function Greeting() {
  return <h1 className="text-2xl font-bold">Welcome to Corner Shop</h1>;
}
```

A component is a **function** that returns JSX. To use it, write it like an HTML tag: `<Greeting />`.

Rules:

- **Component names start with a capital letter.** React treats `<greeting />` as an HTML tag named "greeting" and `<Greeting />` as your component.
- A component must return **one** root element. To return several siblings without an extra wrapper `<div>`, use a **fragment**: `<>...</>`.
- Components are usually written as named functions and exported from their own files.

### Level 2 — What JSX really is

JSX looks like HTML, but it is **JavaScript**. A build tool (Vite uses the compiler esbuild, others use Babel or TypeScript's compiler) transforms it into function calls before the browser ever sees it:

```tsx
// fragment
// You write:
const heading = <h1 className="title">Fresh mangoes</h1>;

// The compiler produces (React 17+ "automatic runtime"):
import { jsx as _jsx } from "react/jsx-runtime";
const heading = _jsx("h1", { className: "title", children: "Fresh mangoes" });
```

And the call returns a plain object — an **element**:

```tsx
const heading = <h1 className="title">Fresh mangoes</h1>;
console.log(heading.type);
console.log(heading.props);
```

**Output:**

```text
h1
{ className: 'title', children: 'Fresh mangoes' }
```

- `type` is the tag name for HTML elements, or the **function itself** for components.
- `props` holds the attributes and the children.
- An element is just a **description**. Creating it does not create a DOM node; React does that later, in the commit phase.

Understanding this removes most of the mystery of JSX: every `<Tag prop={x}>` is a function call, and `{...}` inside JSX is just a JavaScript expression.

### Level 3 — JSX syntax rules

```tsx
// fragment
export function ProductSummary() {
  const name = "Sindhri mangoes";
  const pricePaisa = 225_000;
  const inStock = true;

  return (
    <article className="product">
      <h2>{name.toUpperCase()}</h2>
      <p>Price: Rs {(pricePaisa / 100).toLocaleString("en-US")}</p>
      <p style={{ color: inStock ? "green" : "grey" }}>{inStock ? "In stock" : "Sold out"}</p>
      <label htmlFor="qty">Quantity</label>
      <input id="qty" type="number" defaultValue={1} min={1} />
      {/* A comment inside JSX */}
    </article>
  );
}
```

- **Curly braces** `{ }` insert any JavaScript **expression**: a variable, a calculation, a function call, a ternary (`a ? b : c`). Statements such as `if` or `for` cannot go inside braces — they are not expressions.
- **`className`, not `class`** — because `class` is a reserved word in JavaScript. Similarly **`htmlFor`** instead of `for`.
- Attribute names use **camelCase**: `onClick`, `tabIndex`, `readOnly`. (`aria-*` and `data-*` attributes keep their dashes.)
- **`style`** takes an **object**, not a string — hence the double braces: the outer pair means "a JavaScript expression", the inner pair is the object. Property names are camelCase (`backgroundColor`).
- Numbers and booleans as props are passed with braces: `min={1}`. A string can use quotes: `type="number"`.
- **Every tag must be closed**: `<input />`, `<br />`, `<img />`.
- Comments are written `{/* ... */}`.
- Wrapping multi-line JSX in parentheses avoids JavaScript's automatic semicolon insertion after `return`.

> [!WARNING]
> JSX **escapes** any text you insert with braces. `{userComment}` displays `<script>` as text and never runs it — React protects you from the cross-site scripting attacks described in {{ch:html}} by default. The escape hatch, `dangerouslySetInnerHTML`, turns that protection off; its name is a deliberate warning ({{ch:application-security}}).

## Props: passing data down

### Level 3 — Props are function arguments

Components receive inputs through **props** — an object of the attributes the parent wrote:

```tsx
// fragment
type ProductCardProps = {
  name: string;
  pricePaisa: number;
  imageUrl: string;
  inStock?: boolean;          // optional
};

export function ProductCard({ name, pricePaisa, imageUrl, inStock = true }: ProductCardProps) {
  return (
    <article className="card">
      <img src={imageUrl} alt={name} width={400} height={400} />
      <h3>{name}</h3>
      <p>Rs {(pricePaisa / 100).toLocaleString("en-US")}</p>
      {!inStock && <p className="badge">Sold out</p>}
    </article>
  );
}

// A parent uses it:
// <ProductCard name="Chaunsa mangoes, 5 kg" pricePaisa={260000} imageUrl="/chaunsa.jpg" />
```

- The props type describes what the component accepts; TypeScript checks every use. Passing `pricePaisa="2600"` (a string) is a compile error.
- **Destructuring** in the parameter list ({{ch:objects}}) pulls out each prop, and `inStock = true` gives a **default value**.
- Here the image's alt text reuses the product name — reasonable for a product photo ({{ch:html}}).

### Level 2 — Props are read-only

A component must **never** change its props. They belong to the parent. If a component needs to change something over time, that is **state** (below), owned either by the component itself or by a parent that passes down both the value and a function to change it.

This rule is part of React's **one-way data flow**: data moves down the tree through props. It makes applications predictable: to find out why a component shows something, you follow its props **up** to where the data comes from.

### Level 3 — Rendering a component with data

Rendering to a string on the server shows exactly what HTML a component produces:

```tsx
import { renderToStaticMarkup } from "react-dom/server";

type PriceTagProps = { label: string; pricePaisa: number; onSale?: boolean };

function PriceTag({ label, pricePaisa, onSale = false }: PriceTagProps) {
  return (
    <p className={onSale ? "price sale" : "price"}>
      {label}: Rs {(pricePaisa / 100).toFixed(2)}
    </p>
  );
}

console.log(renderToStaticMarkup(<PriceTag label="Sindhri" pricePaisa={45000} />));
console.log(renderToStaticMarkup(<PriceTag label="Chaunsa" pricePaisa={52050} onSale />));
```

**Output:**

```text
<p class="price">Sindhri: Rs 450.00</p>
<p class="price sale">Chaunsa: Rs 520.50</p>
```

- `renderToStaticMarkup` (from `react-dom/server`) renders a component to an HTML string. Servers use similar functions to send fully rendered pages ({{ch:nextjs}}); here it simply lets us see the result in a terminal.
- `className` became the HTML `class` attribute.
- Writing `onSale` with no value means `onSale={true}`.
- The text pieces — `{label}`, `": Rs "`, `{...}` — are joined into the paragraph's content.

### Level 3 — `children` and composition

Whatever you put **between** a component's opening and closing tags arrives as a special prop called `children`:

```tsx
import { renderToStaticMarkup } from "react-dom/server";
import type { ReactNode } from "react";

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="card">
      <h2>{title}</h2>
      <div className="card-body">{children}</div>
    </section>
  );
}

const html = renderToStaticMarkup(
  <Card title="Delivery">
    <p>Same-day delivery in Lahore.</p>
    <p>Cash on delivery available.</p>
  </Card>,
);
console.log(html);
```

**Output:**

```text
<section class="card"><h2>Delivery</h2><div class="card-body"><p>Same-day delivery in Lahore.</p><p>Cash on delivery available.</p></div></section>
```

- `ReactNode` is the type for anything React can render: elements, strings, numbers, arrays of these, `null`, `undefined` and booleans (the last three render nothing).
- `Card` provides a **frame** — heading and wrapper — and the parent decides what goes inside. This is **composition** ({{ch:object-oriented-programming}}): building complex UIs by nesting simple components, instead of creating ever more specialised components. Layout components, dialogs, cards, and page shells are usually built this way.

## Events

### Level 3 — Handling clicks

```tsx
// fragment
export function AddToCartButton({ productName }: { productName: string }) {
  function handleClick() {
    console.log(`Adding ${productName}`);
  }

  return (
    <button type="button" onClick={handleClick}>
      Add {productName} to cart
    </button>
  );
}
```

- Event props are camelCase: `onClick`, `onChange`, `onSubmit`, `onKeyDown`.
- You pass **the function**, not a call: `onClick={handleClick}`, not `onClick={handleClick()}`. The second form calls the function **during rendering** — every render — and passes its return value (`undefined`) as the handler. This is one of the most common beginner bugs.
- To pass arguments, wrap in an arrow function: `onClick={() => addToCart(product.id)}`.
- The handler receives an **event object** (React wraps the browser's native event in a similar "synthetic" event with the same important properties: `target`, `preventDefault()`, `stopPropagation()`). Under the hood, React uses **event delegation** at the root of your app ({{ch:browser-and-dom}}).

### Level 3 — Passing handlers as props

Often the component that **displays** the button is not the one that **owns** the data. The owner passes a function down:

```tsx
// fragment
type QuantityPickerProps = { value: number; onChange: (next: number) => void };

export function QuantityPicker({ value, onChange }: QuantityPickerProps) {
  return (
    <div className="qty">
      <button type="button" aria-label="Decrease quantity" onClick={() => onChange(value - 1)} disabled={value <= 1}>
        −
      </button>
      <output aria-live="polite">{value}</output>
      <button type="button" aria-label="Increase quantity" onClick={() => onChange(value + 1)}>
        +
      </button>
    </div>
  );
}
```

`QuantityPicker` does not store the quantity. It displays the `value` it is given and **reports** desired changes by calling `onChange`. Its parent decides what to do. By convention, handler props are named `onSomething`, and the functions that handle them in the parent `handleSomething`. This is how data flows down and changes flow up.

## State: data that changes

### Level 2 — Why ordinary variables do not work

```tsx
// fragment
export function BrokenCounter() {
  let count = 0;
  return (
    <button type="button" onClick={() => { count = count + 1; }}>
      Clicked {count} times
    </button>
  );
}
```

Clicking does nothing visible. Two reasons:

1. **Changing a local variable does not tell React to render again.** React has no idea anything changed.
2. **Even if it did render again, `count` would start at 0** — a component is a function, and each render is a fresh call with fresh local variables.

A component needs memory that **survives between renders** and a way to **trigger a new render** when it changes. That is state.

### Level 3 — `useState`

```tsx
// fragment
import { useState } from "react";

export function Counter() {
  const [count, setCount] = useState(0);

  return (
    <button type="button" onClick={() => setCount(count + 1)}>
      Clicked {count} times
    </button>
  );
}
```

- `useState(0)` declares a state variable with an **initial value** of 0.
- It returns an array of two things, destructured here: the **current value** (`count`) and a **setter** function (`setCount`).
- Calling `setCount(newValue)` stores the new value **and** tells React to render the component again. On the next render, `useState(0)` returns the **stored** value (1, then 2...), not the initial value — React ignores the initial value after the first render.
- Each instance of `<Counter />` on the page has its **own** independent state.

### Level 2 — How React remembers: the rules of hooks

How does `useState` know which state belongs to which call? React keeps, for each component instance, an internal list of its hooks, and identifies them **by the order** in which they are called during rendering: the first `useState` call gets slot 1, the second slot 2, and so on.

That is why there are two strict **rules of hooks**:

1. **Only call hooks at the top level** of a component (or of a custom hook) — never inside conditions, loops or nested functions. If a hook is skipped in one render, every later hook would read the wrong slot.
2. **Only call hooks from React components or custom hooks**, not from ordinary functions.

The official ESLint plugin, `eslint-plugin-react-hooks`, enforces these rules; every React project should use it.

### Level 4 — State is a snapshot

This is the most important — and most surprising — property of state:

```tsx
// fragment
export function TripleCounter() {
  const [count, setCount] = useState(0);

  function addThree() {
    setCount(count + 1);
    setCount(count + 1);
    setCount(count + 1);
  }

  return <button type="button" onClick={addThree}>Count: {count}</button>;
}
```

Clicking once shows **1**, not 3. Why?

- Within one render, `count` is a **constant**. It was 0 when this render happened, and it stays 0 for every line of code in that render — including inside `addThree`. Each call computes `0 + 1`.
- `setCount` does not change the variable `count`. It asks React to use a new value **in the next render**.
- React **batches** the three updates and renders once, with the last value requested: 1.

Think of each render as a photograph of the state at that moment. Event handlers created during a render see that photograph, even if they run later. (This is closures at work — {{ch:scope-and-closures}}.)

### Level 4 — Updater functions

When the next state depends on the previous state, pass a **function** to the setter:

```tsx
// fragment
function addThree() {
  setCount((c) => c + 1);
  setCount((c) => c + 1);
  setCount((c) => c + 1);
}
```

Now React queues three updater functions, and when it renders, applies them in order: 0 → 1 → 2 → 3. The parameter `c` is always the **latest** pending value, not the snapshot. Use the updater form whenever new state is calculated from old state and several updates may happen together, or when the setter is called later (for example, from a timer).

You can model this behaviour in plain TypeScript to see exactly what React does with a queue of updates:

```ts
type Update<T> = T | ((previous: T) => T);

function processQueue<T>(base: T, queue: Update<T>[]): T {
  let result = base;
  for (const update of queue) {
    result = typeof update === "function" ? (update as (p: T) => T)(result) : update;
  }
  return result;
}

const snapshot = 0;
console.log(processQueue(snapshot, [snapshot + 1, snapshot + 1, snapshot + 1]));
console.log(processQueue(snapshot, [(c: number) => c + 1, (c: number) => c + 1, (c: number) => c + 1]));
console.log(processQueue(snapshot, [5, (c: number) => c * 2]));
```

**Output:**

```text
1
3
10
```

- A plain value **replaces** the state; a function **transforms** the latest state.
- With values computed from the snapshot, three updates of "0 + 1" give 1.
- With updater functions, each builds on the previous result: 3.
- Mixed: replace with 5, then double: 10. (React's real implementation is more sophisticated, but follows this logic.)

### Level 3 — Objects and arrays in state: update immutably

React decides whether to re-render by checking whether the new state is a **different value** from the old one (using `Object.is`, similar to `===`). If you **mutate** an object or array and pass the same reference back, React sees no change and may skip the update:

```tsx
// fragment
const [cart, setCart] = useState<CartLine[]>([]);

// WRONG: mutates the existing array; React may not re-render
function addWrong(line: CartLine) {
  cart.push(line);
  setCart(cart);
}

// RIGHT: create a new array
function add(line: CartLine) {
  setCart((lines) => [...lines, line]);
}

function remove(sku: string) {
  setCart((lines) => lines.filter((l) => l.sku !== sku));
}

function increase(sku: string) {
  setCart((lines) => lines.map((l) => (l.sku === sku ? { ...l, qty: l.qty + 1 } : l)));
}
```

These are exactly the immutable update patterns from {{ch:functional-programming}}: spread to add, `filter` to remove, `map` with a spread copy to change one item. React's design is built on immutability: it is what makes "did anything change?" a cheap reference comparison.

### Level 4 — How much state? Derive, don't duplicate

Keep the **minimum** state needed, and **compute** everything else during rendering:

```tsx
// fragment
// WRONG: total is duplicated state that can drift out of sync
const [lines, setLines] = useState<CartLine[]>([]);
const [total, setTotal] = useState(0);

// RIGHT: total is derived from lines on every render
const [lines, setLines] = useState<CartLine[]>([]);
const totalPaisa = lines.reduce((sum, l) => sum + l.pricePaisa * l.qty, 0);
const itemCount = lines.reduce((sum, l) => sum + l.qty, 0);
```

If `total` were separate state, every function that changes `lines` would have to remember to update it too, and one day one would forget. Derived values are always correct. (If a derived calculation is genuinely expensive, it can be memoised — {{ch:react-advanced}} — but measure first; most calculations are fast.)

A related rule: **do not copy props into state** unless you deliberately want to ignore later changes to the prop. `const [name, setName] = useState(props.name)` captures the prop's **first** value only.

## Conditional rendering

Since JSX is JavaScript, conditions use ordinary JavaScript:

```tsx
// fragment
export function CartSummary({ itemCount, totalPaisa, isLoggedIn }: { itemCount: number; totalPaisa: number; isLoggedIn: boolean }) {
  if (itemCount === 0) {
    return <p>Your cart is empty.</p>;              // early return
  }

  return (
    <div>
      <p>
        {itemCount} {itemCount === 1 ? "item" : "items"}: Rs {totalPaisa / 100}   {/* ternary */}
      </p>
      {isLoggedIn && <button type="button">Checkout</button>}                       {/* && */}
      {!isLoggedIn && <a href="/login">Log in to check out</a>}
    </div>
  );
}
```

- **Early return** for completely different outputs.
- **Ternary** `condition ? a : b` for either-or inside JSX.
- **`&&`** to render something or nothing.

> [!WARNING]
> Be careful with `&&` and numbers. `{count && <Badge count={count} />}` renders the number **0** when `count` is 0, because `0 && anything` evaluates to `0`, and React renders numbers. Write `{count > 0 && <Badge count={count} />}` instead. (`false`, `null` and `undefined` render nothing; `0` and `NaN` are displayed.)

## Rendering lists and keys

### Level 3 — `map` to elements

```tsx
// fragment
type Product = { id: string; name: string; pricePaisa: number };

export function ProductList({ products }: { products: Product[] }) {
  return (
    <ul>
      {products.map((p) => (
        <li key={p.id}>
          {p.name} — Rs {p.pricePaisa / 100}
        </li>
      ))}
    </ul>
  );
}
```

Arrays of elements are rendered in order. `map` turns data into elements ({{ch:arrays}}).

### Level 2 — Why keys matter

The `key` prop tells React **which data item each element corresponds to**, across renders. Keys must be **unique among siblings** and **stable**: the same item must have the same key every render.

Why? Remember the reconciliation rule: React matches children by **position** unless told otherwise. Consider a list of products where each row contains an `<input>` for a quantity, and the user has typed "3" into the first row. Now a new product is inserted at the **top** of the list:

```text
  Before:                       After inserting "Lychee" at the top:
  row 0: Mango   [qty: 3]       row 0: Lychee  [qty: ?]
  row 1: Peach   [qty:  ]       row 1: Mango   [qty: ?]
                                row 2: Peach   [qty: ?]
```

- **Without keys (or with array indexes as keys)**, React matches by position: row 0 before is row 0 after. It keeps row 0's DOM input — which still contains "3" — and just changes the label to "Lychee". The quantity typed for Mango now appears next to Lychee. The user orders the wrong fruit.
- **With stable keys** (`key={product.id}`), React matches "Mango" to "Mango", wherever it moved, keeps its input with "3", and creates a **new** row for Lychee.

So:

- Use a **stable, unique id from your data** — a database id, a SKU.
- **Do not use array indexes** as keys when the list can be reordered, filtered, or have items inserted or removed. (Indexes are acceptable only for static lists that never change order.)
- **Do not generate keys during rendering** (`key={Math.random()}`): every render produces new keys, so React destroys and recreates every row every time — losing state and wasting work.
- Keys are not available as a prop inside the component; pass the id separately if the component needs it.

A useful trick follows from this: changing a component's `key` **resets** it. Rendering `<CheckoutForm key={orderId} />` gives a completely fresh form, with fresh state, whenever `orderId` changes.

## Forms

### Level 3 — Controlled inputs

In a **controlled input**, React state is the single source of truth for the input's value:

```tsx
// fragment
export function SearchBox({ onSearch }: { onSearch: (query: string) => void }) {
  const [query, setQuery] = useState("");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = query.trim();
    if (trimmed) onSearch(trimmed);
  }

  return (
    <form role="search" onSubmit={handleSubmit}>
      <label htmlFor="search">Search products</label>
      <input
        id="search"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <button type="submit" disabled={query.trim() === ""}>
        Search
      </button>
    </form>
  );
}
```

- `value={query}` makes the input always display the state.
- `onChange` fires on **every** keystroke (React's `onChange` behaves like the DOM's `input` event — {{ch:browser-and-dom}}); it updates the state, React re-renders, and the input shows the new value.
- Because the value lives in state, the component can use it anywhere: disable the button when empty, show a character count, validate as the user types.
- `onSubmit` on the form, with `preventDefault()`, handles both clicking the button and pressing Enter ({{ch:browser-and-dom}}).
- `React.FormEvent<HTMLFormElement>` types the event object.

If you set `value` without an `onChange`, the input becomes **read-only** — the user types and nothing happens, because state never changes. React warns about this in the console.

### Level 3 — Uncontrolled inputs

Alternatively, let the **DOM** keep the value, and read it when the form is submitted:

```tsx
// fragment
export function NewsletterForm() {
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    console.log(data.get("email"));
  }

  return (
    <form onSubmit={handleSubmit}>
      <label htmlFor="email">Email</label>
      <input id="email" name="email" type="email" defaultValue="" required />
      <button type="submit">Subscribe</button>
    </form>
  );
}
```

`defaultValue` sets only the starting value; after that, the browser manages the input, and `FormData` reads it on submit ({{ch:browser-and-dom}}). Uncontrolled inputs mean less code and fewer re-renders, and they work well with React 19's form actions ({{ch:react-advanced}}) and with libraries such as React Hook Form ({{ch:forms}}).

**Which to use?** Controlled when you need the value **while the user types** (live validation, dependent fields, formatting, enabling buttons). Uncontrolled when you only need the values on submit. Both are professional choices.

## Sharing state: lifting state up

### Level 3 — The problem

Two sibling components need the same data: a product list where you choose a quantity, and a cart summary that shows the total. If each kept its own state, they would disagree. State must live in **one** place: the closest common parent. This is called **lifting state up**.

### Level 4 — A small complete application

```tsx
// fragment
import { useState } from "react";

type Product = { id: string; name: string; pricePaisa: number };
type Line = { productId: string; qty: number };

const PRODUCTS: Product[] = [
  { id: "sindhri", name: "Sindhri mangoes, 5 kg", pricePaisa: 225_000 },
  { id: "chaunsa", name: "Chaunsa mangoes, 5 kg", pricePaisa: 260_000 },
  { id: "lychee", name: "Lychees, 1 kg", pricePaisa: 90_000 },
];

const formatRs = (paisa: number) => `Rs ${(paisa / 100).toLocaleString("en-US")}`;

export function App() {
  const [lines, setLines] = useState<Line[]>([]);

  function addToCart(productId: string) {
    setLines((current) => {
      const existing = current.find((l) => l.productId === productId);
      return existing
        ? current.map((l) => (l.productId === productId ? { ...l, qty: l.qty + 1 } : l))
        : [...current, { productId, qty: 1 }];
    });
  }

  function removeFromCart(productId: string) {
    setLines((current) => current.filter((l) => l.productId !== productId));
  }

  return (
    <main className="grid gap-6 md:grid-cols-[2fr_1fr]">
      <ProductGrid products={PRODUCTS} onAdd={addToCart} />
      <CartPanel products={PRODUCTS} lines={lines} onRemove={removeFromCart} />
    </main>
  );
}

function ProductGrid({ products, onAdd }: { products: Product[]; onAdd: (id: string) => void }) {
  return (
    <section aria-labelledby="products-heading">
      <h2 id="products-heading">Products</h2>
      <ul>
        {products.map((p) => (
          <li key={p.id}>
            <span>{p.name}</span> <span>{formatRs(p.pricePaisa)}</span>{" "}
            <button type="button" onClick={() => onAdd(p.id)} aria-label={`Add ${p.name} to cart`}>
              Add
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function CartPanel({ products, lines, onRemove }: { products: Product[]; lines: Line[]; onRemove: (id: string) => void }) {
  const rows = lines.map((line) => {
    const product = products.find((p) => p.id === line.productId)!;
    return { ...line, product, subtotal: product.pricePaisa * line.qty };
  });
  const totalPaisa = rows.reduce((sum, r) => sum + r.subtotal, 0);

  return (
    <aside aria-labelledby="cart-heading">
      <h2 id="cart-heading">Cart</h2>
      {rows.length === 0 ? (
        <p>Your cart is empty.</p>
      ) : (
        <>
          <ul>
            {rows.map((r) => (
              <li key={r.productId}>
                {r.product.name} × {r.qty} = {formatRs(r.subtotal)}{" "}
                <button type="button" onClick={() => onRemove(r.productId)} aria-label={`Remove ${r.product.name}`}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
          <p>
            <strong>Total: {formatRs(totalPaisa)}</strong>
          </p>
        </>
      )}
    </aside>
  );
}
```

Study the structure — it is the shape of most React applications:

- **One owner for the cart state**: `App`, the closest common parent of the product grid and the cart panel.
- **Data flows down** as props: products and lines.
- **Changes flow up** through callback props: `onAdd`, `onRemove`. The children do not know how the cart is stored; they just report what the user did.
- **State is minimal**: only product ids and quantities. Names, prices, subtotals and the total are **derived** during rendering — they can never disagree.
- **Updates are immutable** and use updater functions.
- **Keys** are stable ids.
- `{" "}` inserts a space between inline elements; JSX removes whitespace at line breaks.
- Compare this with the vanilla cart in {{ch:browser-and-dom}}: there is no `render()` to call, no manual DOM work, no delegation code — and React only changes the DOM nodes that differ after each update.

When lifting state up means passing props through many layers that do not use them ("prop drilling"), React's **context** can help — {{ch:react-advanced}} — and for larger applications, dedicated state-management tools ({{ch:state-management}}).

## Thinking in React

The React documentation describes a practical method for building an interface, which this chapter's example followed:

1. **Break the UI into a component hierarchy.** Draw boxes around parts of the design; each box that has one job is a component.
2. **Build a static version** with props only — no state — so the structure is right.
3. **Find the minimal state.** For each piece of data, ask: does it change over time? Is it passed from a parent? Can it be computed from other state or props? Only data that changes, is not passed in and cannot be computed is state.
4. **Decide where each piece of state lives**: the closest common parent of every component that uses it.
5. **Add inverse data flow**: pass setter-calling functions down so children can request changes.

## From beginner to enterprise

**Level 3 — first components.** Function components, JSX, props, `useState`, events, lists with keys, controlled forms.

**Level 4 — a real single-page application.** Component hierarchy; lifted state; derived values; reusable presentational components (`Button`, `Card`) styled with CSS Modules or Tailwind ({{ch:tailwind}}); TypeScript props everywhere; the hooks ESLint plugin.

**Level 5 — professional practice.** Components tested with React Testing Library from the user's point of view ({{ch:testing}}); a shared component library with accessibility built in; clear separation between components that only display and components that manage data; code review for state duplication and key mistakes; React DevTools for inspection.

**Level 6 — large applications.** Frameworks with server rendering and React Server Components ({{ch:nextjs}}); design systems shared by many teams; performance monitoring on real devices ({{ch:frontend-performance}}); state split carefully between server data, URL state and local UI state ({{ch:state-management}}).

## Real-world use cases

### A product configurator

- **Requirement:** customers choose box size, ripeness and delivery date; the price and delivery estimate update instantly.
- **Design:** one parent holds the selections in state; child components for each choice are controlled; price and estimate are **derived** in the parent from the selections and product data.
- **Why it works:** a single source of truth; derived values cannot be inconsistent; each choice component is reusable.

### An admin table with inline editing

- **Requirement:** staff edit stock levels directly in a table of 200 products, which can be sorted.
- **Key point:** rows keyed by product id, so sorting does not move typed values to the wrong product.
- **Limit:** rendering hundreds of rows with inputs on every keystroke can become slow; techniques such as memoisation and list virtualisation are covered in {{ch:react-advanced}} and {{ch:frontend-performance}}.

## Common mistakes

### Beginner: calling the handler instead of passing it

`onClick={addToCart(id)}` runs during every render. **Fix:** `onClick={() => addToCart(id)}`.

### Beginner: mutating state

`state.items.push(x); setState(state)` — React may not update. **Fix:** new arrays and objects.

### Beginner: expecting state to change immediately

`setCount(count + 1); console.log(count)` logs the **old** value. **Fix:** remember state is a snapshot; compute the next value in a variable if you need it now, or use an updater.

### Beginner: missing or index keys

React warns "Each child in a list should have a unique key"; with index keys, typed values jump between rows after reordering. **Fix:** stable ids.

### Intermediate: duplicated or derived state

A `total` state next to `items`, kept in sync manually. **Fix:** compute it during render.

### Intermediate: `{count && ...}` rendering 0

**Fix:** use explicit boolean conditions.

### Intermediate: hooks inside conditions

`if (loggedIn) { const [x, setX] = useState() }` breaks the order of hooks. **Fix:** hooks always at the top level; the lint rule catches it.

### Production: huge components

A 900-line `CheckoutPage` with fifteen state variables. **Fix:** extract components by responsibility; move logic into custom hooks ({{ch:react-advanced}}).

## Debugging and troubleshooting

- **React Developer Tools** (a browser extension) adds **Components** and **Profiler** panels: inspect the component tree, see each component's props and state, edit state live, and find why a component rendered.
- **Console warnings** from React in development are valuable — read them. Missing keys, controlled inputs without `onChange`, and invalid DOM nesting are all reported.
- **The screen did not update:** mutation of state, or setting state to the same value.
- **"Too many re-renders":** state is being set **during rendering** — usually a handler called instead of passed (`onClick={setOpen(true)}`) — causing an infinite loop.
- **An input loses focus after each keystroke:** a component is being **defined inside another component**, so its type is new on every render and React recreates it (rule 1 of reconciliation). Define components at the top level of a module.
- **Wrong data in a row after sorting or filtering:** index keys.

## Security and performance

**Security.** JSX escapes text by default, preventing most XSS. Avoid `dangerouslySetInnerHTML` unless the HTML is sanitised ({{ch:html}}). Be careful with URLs from users in `href` (reject `javascript:` URLs; React warns about them). Never put secrets in front-end code: everything in your React bundle is downloaded by every visitor and can be read — API keys for private services belong on the server ({{ch:application-security}}).

**Performance.** React re-renders a component when its state changes, and by default re-renders its **children** too. For most applications this is fast enough — rendering computes descriptions; React only touches the DOM where things differ. Keep state **close to where it is used** (state in `App` re-renders the whole app; state in a small component re-renders only that component). Optimisation tools — `memo`, `useMemo`, the React Compiler, virtualisation — are in {{ch:react-advanced}}. Measure with the Profiler before optimising.

## How a senior engineer thinks about this

- **UI is a function of state.** They design the state first — minimal, normalised, owned in the right place — and the components follow.
- **Derive, don't sync.** Every piece of duplicated state is a future bug.
- **Small, composable components** with clear props; presentational pieces separate from data-owning ones.
- **Keys and identity are deliberate.** They know keys control state preservation, and use that knowingly.
- **Accessibility is built in**: semantic elements, labels and real buttons inside components, so every use is accessible ({{ch:html}}).
- **Platform knowledge still matters.** Events, forms, the DOM and CSS have not gone away; React builds on them.

## Exercises

### Exercise 1 — A star rating display

**Objective:** practise props, lists and conditional rendering.
**What to build:** a `StarRating` component that takes `rating` (a number from 0 to 5, possibly with halves such as 3.5) and `max` (default 5), and renders ★ for full stars, ⯪ for a half star and ☆ for empty stars, plus visually hidden text such as "3.5 out of 5 stars" for screen readers. Render it to a string to check the output.

<details>
<summary>Show the solution</summary>

```tsx
import { renderToStaticMarkup } from "react-dom/server";

function StarRating({ rating, max = 5 }: { rating: number; max?: number }) {
  const clamped = Math.min(Math.max(rating, 0), max);
  const full = Math.floor(clamped);
  const half = clamped - full >= 0.5 ? 1 : 0;
  const empty = max - full - half;
  const stars = "★".repeat(full) + "⯪".repeat(half) + "☆".repeat(empty);

  return (
    <span className="rating">
      <span aria-hidden="true">{stars}</span>
      <span className="sr-only">{`${clamped} out of ${max} stars`}</span>
    </span>
  );
}

console.log(renderToStaticMarkup(<StarRating rating={3.5} />));
console.log(renderToStaticMarkup(<StarRating rating={9} max={5} />));
```

**Output:**

```text
<span class="rating"><span aria-hidden="true">★★★⯪☆</span><span class="sr-only">3.5 out of 5 stars</span></span>
<span class="rating"><span aria-hidden="true">★★★★★</span><span class="sr-only">5 out of 5 stars</span></span>
```

**Walkthrough:** the rating is **clamped** to the valid range, so bad data (9) cannot produce negative counts. Star characters are derived from the number — no state is needed, because nothing changes over time inside this component. The symbols are hidden from screen readers (`aria-hidden="true"`), which instead read the clear text in the visually hidden span ({{ch:css}}). The template literal makes the screen-reader text a single string.

</details>

### Exercise 2 — A controlled delivery form

**Objective:** practise controlled inputs and derived values.
**What to build:** a `DeliveryOptions` component with a `<select>` for city (Lahore, Karachi, Other) and a checkbox "Express delivery". Show the delivery fee, derived from the choices: Lahore and Karachi Rs 150, Other Rs 250, express adds Rs 200. Do not store the fee in state.

<details>
<summary>Show the solution</summary>

```tsx
// fragment
import { useState } from "react";

type City = "lahore" | "karachi" | "other";

const BASE_FEE_PAISA: Record<City, number> = { lahore: 15_000, karachi: 15_000, other: 25_000 };
const EXPRESS_SURCHARGE_PAISA = 20_000;

export function DeliveryOptions() {
  const [city, setCity] = useState<City>("lahore");
  const [express, setExpress] = useState(false);

  const feePaisa = BASE_FEE_PAISA[city] + (express ? EXPRESS_SURCHARGE_PAISA : 0);

  return (
    <fieldset>
      <legend>Delivery</legend>

      <label htmlFor="city">City</label>
      <select id="city" value={city} onChange={(e) => setCity(e.target.value as City)}>
        <option value="lahore">Lahore</option>
        <option value="karachi">Karachi</option>
        <option value="other">Other city</option>
      </select>

      <input id="express" type="checkbox" checked={express} onChange={(e) => setExpress(e.target.checked)} />
      <label htmlFor="express">Express delivery (+Rs 200)</label>

      <p aria-live="polite">Delivery fee: Rs {feePaisa / 100}</p>
    </fieldset>
  );
}
```

**Walkthrough:** two pieces of state — the only things the user changes. The fee is **derived** on every render from those two values and named constants ({{ch:clean-code}}). A `select` is controlled with `value`; a checkbox with `checked` and `e.target.checked`. The `as City` cast is safe because the options' values are exactly the `City` values; in a stricter design you would validate. `aria-live="polite"` announces the new fee to screen-reader users when it changes.

**Common wrong approach:** a third state variable `fee`, updated inside both change handlers — it works until someone adds a new option and forgets one of the updates.

</details>

### Exercise 3 — Debug the to-do list

**Objective:** practise finding state and key bugs.
**The scenario:** in this list, (1) adding a task sometimes does not show it, (2) after deleting the first task, the checkbox ticks appear on the wrong tasks, and (3) "Clear completed" shows "0" when nothing is completed.

```tsx
// fragment
type Todo = { id: number; text: string; done: boolean };

export function Todos() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [text, setText] = useState("");
  const completed = todos.filter((t) => t.done).length;

  function add() {
    todos.push({ id: Date.now(), text, done: false });
    setTodos(todos);
    setText("");
  }

  return (
    <div>
      <input value={text} onChange={(e) => setText(e.target.value)} />
      <button type="button" onClick={add}>Add</button>
      <ul>
        {todos.map((t, i) => (
          <li key={i}>
            <input type="checkbox" defaultChecked={t.done} />
            {t.text}
            <button type="button" onClick={() => setTodos(todos.filter((x) => x.id !== t.id))}>Delete</button>
          </li>
        ))}
      </ul>
      {completed && <button type="button">Clear completed ({completed})</button>}
    </div>
  );
}
```

<details>
<summary>Show the solution</summary>

1. **Mutation:** `todos.push(...)` then `setTodos(todos)` passes the **same array**; React may skip the update (here, the input clearing triggers a render, so it *sometimes* appears to work). Fix: `setTodos((current) => [...current, { id: crypto.randomUUID(), text, done: false }])`.
2. **Index keys plus uncontrolled checkboxes:** `key={i}` and `defaultChecked` mean the checkbox DOM nodes are matched by position. After deleting the first task, every task shifts up one position, but the checkbox DOM nodes (with their ticks) stay in place — so ticks appear on the wrong tasks. Fix: `key={t.id}`, and make the checkbox controlled: `checked={t.done}` with an `onChange` that maps the matching todo to `{ ...t, done: !t.done }`.
3. **`{completed && ...}` renders 0.** Fix: `{completed > 0 && ...}`.

Also: the `add` function should ignore empty text, and the input needs a label ({{ch:html}}). Using `crypto.randomUUID()` (available in modern browsers) avoids two items created in the same millisecond getting the same `Date.now()` id.

</details>

### Exercise 4 — Production scenario: plan the component structure

**Objective:** practise "thinking in React".
**The scenario:** a restaurant's online menu page shows categories (tabs), the dishes in the selected category (each with name, price, a quantity picker and an "Add" button), a search box that filters dishes across categories, and an order summary with the total and a "Place order" button. Design the component tree and decide what state exists and where it lives.

<details>
<summary>Show the solution</summary>

**Component tree:**

```text
MenuPage
├── SearchBox            (controlled input)
├── CategoryTabs         (tabs; shows the selected category)
├── DishList
│   └── DishRow          (one per dish; contains QuantityPicker + Add)
│       └── QuantityPicker
└── OrderSummary
    └── OrderLine        (one per ordered dish)
```

**State:**

| State | Lives in | Why |
|---|---|---|
| `query` (search text) | `MenuPage` | Used by `SearchBox` (display) and `DishList` (filtering) |
| `selectedCategory` | `MenuPage` | Used by `CategoryTabs` and `DishList` |
| `order: { dishId, qty }[]` | `MenuPage` | Used by `DishList` (add) and `OrderSummary` |
| quantity being chosen in a row | `DishRow` | Local to that row until "Add" is pressed |

**Not state (derived):** the filtered list of dishes (from menu data, `query` and `selectedCategory`); line subtotals and the order total (from `order` and dish prices); whether "Place order" is enabled (`order.length > 0`).

**Data flow:** `MenuPage` passes `query` and `onQueryChange` to `SearchBox`; `selectedCategory` and `onSelect` to `CategoryTabs`; the filtered dishes and `onAdd(dishId, qty)` to `DishList`; `order`, the menu data and `onRemove` to `OrderSummary`.

**Notes:** keys are dish ids; consider putting `query` and `selectedCategory` in the URL so the filtered menu can be shared and survives a refresh ({{ch:browser-and-dom}}, {{ch:state-management}}); the menu data itself is **server data**, best loaded with a data-fetching approach from {{ch:react-advanced}}.

</details>

## Summary

React builds user interfaces from **components**: functions that turn props and state into a description of the UI. **JSX** is syntax that compiles to function calls creating **elements** — plain objects describing what to show. When state changes, React **renders** (calls components), **reconciles** the new element tree with the old one — replacing subtrees whose type changed, updating those whose type stayed the same — and **commits** the minimal DOM changes.

**Props** pass data down and are read-only; **children** enable composition; handler props such as `onChange` pass changes up — **one-way data flow**. **State** (`useState`) is per-instance memory that triggers re-renders; it is a **snapshot** within each render, updates are **batched**, and **updater functions** build on the latest value. Hooks must be called at the top level, in the same order every render. Update objects and arrays **immutably**, keep state **minimal**, and **derive** everything else.

Render conditionally with early returns, ternaries and `&&` (beware of 0). Render lists with `map` and **stable keys** from your data — never indexes for changing lists. Build **controlled** inputs when you need the value while typing, and uncontrolled ones read with `FormData` when you only need it on submit. **Lift state up** to the closest common parent, and follow "thinking in React": hierarchy, static version, minimal state, owner, inverse data flow.

## Key terms

- **React** — A JavaScript library for building user interfaces from components that describe the UI for the current state.
- **Component** — A function, named with a capital letter, that returns a description of part of the user interface.
- **JSX** — An HTML-like syntax inside JavaScript that compiles to function calls creating React elements.
- **React element** — A plain object describing what should appear on screen, such as an element type and its props.
- **Fragment** — A wrapper (`<>...</>`) that groups several elements without adding an extra DOM node.
- **Props** — The read-only inputs a component receives from its parent.
- **children (prop)** — The special prop containing whatever is placed between a component's opening and closing tags.
- **Composition** — Building complex interfaces by nesting and combining simpler components.
- **State (React)** — Data a component remembers between renders, whose changes trigger re-rendering.
- **useState** — The React hook that declares a state variable and returns its current value and a setter function.
- **Hook** — A function whose name starts with `use` that lets components use React features such as state.
- **Rules of hooks** — The requirements that hooks are called only at the top level and only from components or custom hooks.
- **Render (React)** — Calling components to compute a new description of the user interface.
- **Commit phase** — The step in which React applies the computed changes to the real DOM.
- **Reconciliation** — React's process of comparing the new element tree with the previous one to decide what to change.
- **Virtual DOM** — The tree of React elements that React compares between renders, as opposed to the browser's real DOM.
- **Key (React)** — A stable, unique identifier on list items that lets React match elements to data across renders.
- **State snapshot** — The fixed value of state within a single render, seen by all code created during that render.
- **Batching** — React's grouping of several state updates into a single re-render.
- **Updater function** — A function passed to a state setter that computes the next state from the latest pending state.
- **Derived state** — A value computed during rendering from state and props instead of being stored separately.
- **One-way data flow** — The React model in which data passes down through props and changes are requested upward through callbacks.
- **Lifting state up** — Moving shared state to the closest common parent of the components that need it.
- **Controlled input** — A form field whose value is held in React state and updated through a change handler.
- **Uncontrolled input** — A form field whose value is kept by the DOM and read when needed, for example on submit.
- **Synthetic event** — React's cross-browser wrapper around a native browser event.
- **StrictMode** — A development-only React wrapper that runs extra checks to reveal common bugs.
- **Vite** — A fast development server and build tool commonly used to create React applications.
- **Hot module replacement** — Updating changed code in a running page during development without a full reload.
- **renderToStaticMarkup** — A React DOM server function that renders a component tree to an HTML string.

## What comes next

You can now build interactive interfaces from components, props and state. Real applications also need to talk to servers, react to things happening outside React, remember values without re-rendering, share data across distant components, and stay fast as they grow. The next chapter, {{ch:react-advanced}}, covers effects and data fetching, refs, reducers, context, custom hooks, performance tools, error boundaries, Suspense and the newer features of React 19.
