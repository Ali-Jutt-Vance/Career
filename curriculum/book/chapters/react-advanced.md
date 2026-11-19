# React II: Effects, Hooks and Patterns

> [!GOALS]
> - Explain what **effects** are for — synchronising with things outside React — and when you do **not** need one.
> - Write `useEffect` correctly: dependencies, clean-up, and why StrictMode runs effects twice in development.
> - Fetch data without race conditions, and know why most teams use a data-fetching library or a framework instead.
> - Use **refs** for DOM access and for values that must not trigger re-renders.
> - Manage complex state with **`useReducer`**, and share data with **context** without prop drilling.
> - Extract reusable logic into **custom hooks**.
> - Measure and improve performance: why components re-render, `memo`, `useMemo`, `useCallback`, the React Compiler, transitions, code splitting and list virtualisation.
> - Handle loading and failure with **Suspense** and **error boundaries**, and use React 19's actions, `useActionState` and `useOptimistic` for forms.

## Why this matters

In {{ch:react-basics}} you learned React's core: components that turn props and state into UI, and event handlers that change state. That is enough for self-contained interfaces. Real applications must also:

- **Load data** from servers when a page opens, and reload it when the user changes a filter.
- **Talk to things outside React**: a chat connection, a map library, a timer, the browser's title bar, analytics.
- **Remember values** that should not cause re-rendering, and reach into the DOM to focus an input or measure an element.
- **Share data** — the logged-in user, the theme, the language — with components deep in the tree.
- **Stay fast** as the number of components and the amount of data grow.
- **Handle failure** gracefully: slow networks, crashed components, rejected form submissions.

These needs are where most React bugs live: effects that run in infinite loops, responses that arrive in the wrong order and show stale data, listeners that are never removed, context that re-renders the whole app on every keystroke, and "optimisations" that make things slower. This chapter teaches the tools and, more importantly, **when to use each one** — and when not to.

## The simple idea

Remember the electronic scoreboard from {{ch:react-basics}}: you update the match state, and the board redraws itself. Rendering is about the **board**.

But a stadium has more than a board. When a wicket falls, the stadium announcer must also speak, the replay screen must play the clip, and the statistics feed must notify broadcasters. These are **side effects**: things that must happen **in the outside world** as a consequence of the state, which are not part of drawing the board.

React's **effects** are those announcer duties: "after the screen shows this state, make sure the outside world matches it too" — connect to this chat room, set the page title, start this timer. And just as the announcer must stop announcing when a match ends, every effect can provide a **clean-up** to undo what it started.

> [!ANALOGY]
> Rendering draws the scoreboard; effects are the stadium's other duties — announcements, replays, outside feeds — that must stay in step with the score.
>
> **Where the analogy breaks:** a stadium's duties are triggered by events ("a wicket fell"). React effects are **not** primarily for responding to events — event handlers do that. Effects are for keeping something external **synchronised with the current state**, whatever caused it to change. Confusing these two jobs is the most common source of effect bugs.

## The proper definition and key words

- **Side effect** — any work beyond computing the UI: network requests, subscriptions, timers, changing the DOM directly, logging, writing to storage.
- **Effect** (`useEffect`) — a function React runs **after** committing a render to the screen, used to synchronise a component with an external system.
- **Dependency array** — the list of values an effect reads; React re-runs the effect when any of them changes.
- **Clean-up function** — a function an effect returns, which React calls before re-running the effect and when the component is removed.
- **Mount / unmount** — a component instance appearing on screen for the first time / being removed.
- **Ref** (`useRef`) — a mutable box that persists between renders without causing re-renders.
- **Reducer** (`useReducer`) — a pure function `(state, action) => newState` that centralises state updates ({{ch:functional-programming}}).
- **Context** — a way to make a value available to every component below a provider, without passing props through each level.
- **Custom hook** — your own function, named `use...`, that combines other hooks into reusable logic.
- **Memoisation** — caching the result of a calculation or a component's output so it is reused when inputs have not changed.
- **Suspense** — a component that shows a fallback while something inside it is not yet ready.
- **Error boundary** — a component that catches rendering errors in its children and shows a fallback instead of crashing the whole app.

## How it works inside: where effects fit

Here is the cycle from {{ch:react-basics}}, with effects added:

```text
   state change
        │
        ▼
   RENDER (pure: compute elements)       ← no side effects allowed here
        │
        ▼
   COMMIT (update the DOM)
        │
        ▼
   browser paints the screen
        │
        ▼
   EFFECTS: for each effect whose dependencies changed
        1. run the previous clean-up (if any)
        2. run the effect again
        │
   ...later, when the component is removed:
        ▼
   run the final clean-up
```

Effects run **after** the screen has been updated, so they never delay what the user sees. That is also why they are the right place for side effects: rendering may happen many times, may be interrupted and restarted, and must be pure; effects run once per commit, at a predictable moment.

## Effects

### Level 3 — A first effect: the page title

```tsx
// fragment
import { useEffect } from "react";

export function CartTitle({ itemCount }: { itemCount: number }) {
  useEffect(() => {
    document.title = itemCount > 0 ? `(${itemCount}) Corner Shop` : "Corner Shop";
  }, [itemCount]);

  return <h1>Your cart</h1>;
}
```

- The first argument is the effect function. It sets the browser tab's title — an **external system** React does not manage.
- The second argument, `[itemCount]`, is the **dependency array**. React runs the effect after the first render, and again after any render where `itemCount` changed. If a render happens for another reason with the same `itemCount`, the effect is skipped.

The dependency array has three forms:

| Form | Effect runs |
|---|---|
| `useEffect(fn, [a, b])` | After the first render, and whenever `a` or `b` changes |
| `useEffect(fn, [])` | Only after the first render (and clean-up on unmount) |
| `useEffect(fn)` | After **every** render — rarely what you want |

### Level 3 — Clean-up: undoing what you started

Many effects start something that must be stopped: a timer, a subscription, a connection, an event listener.

```tsx
// fragment
import { useEffect, useState } from "react";

export function OnlineStatus() {
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);

    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  return <p role="status">{online ? "Online" : "You are offline — orders will be sent when you reconnect."}</p>;
}
```

- The effect subscribes to the browser's `online` and `offline` events ({{ch:browser-and-dom}}).
- It **returns a clean-up function** that removes the listeners. React calls it when the component unmounts — and before re-running the effect if dependencies change.
- Without the clean-up, every time this component mounted, more listeners would be added and never removed: a **memory leak**, and handlers calling `setOnline` on components that no longer exist.

The rule is symmetric: **whatever the effect sets up, the clean-up tears down.** Connect / disconnect. Subscribe / unsubscribe. `setInterval` / `clearInterval`. Add listener / remove listener.

### Level 4 — Why StrictMode runs effects twice

In development, with `<StrictMode>` ({{ch:react-basics}}), React deliberately **mounts every component, unmounts it, and mounts it again** — running each effect, its clean-up, and the effect again. Many beginners think this is a bug when they see a request sent twice or a log printed twice.

It is a **test**. In production, components really are mounted, unmounted and remounted — when the user navigates away and back, when a list is filtered, and with newer React features that keep hidden parts of the UI ready. An effect without proper clean-up works on the first mount and then misbehaves. StrictMode makes that bug visible immediately, in development, instead of in production. The fix is never to remove StrictMode; it is to write the correct clean-up. (StrictMode also calls component functions twice during rendering, to expose impure components.)

### Level 4 — Dependencies must be honest

Every reactive value an effect uses — props, state, and anything computed from them during rendering — must be listed in its dependencies. The `react-hooks/exhaustive-deps` lint rule checks this. Leaving one out creates a **stale closure**: the effect keeps using the value from the render in which it was created ({{ch:scope-and-closures}}).

```tsx
// fragment
// BUG: the interval always sees roomId from the first render
useEffect(() => {
  const id = setInterval(() => sendHeartbeat(roomId), 5000);
  return () => clearInterval(id);
}, []); // roomId is missing

// CORRECT
useEffect(() => {
  const id = setInterval(() => sendHeartbeat(roomId), 5000);
  return () => clearInterval(id);
}, [roomId]);
```

When `roomId` changes, the corrected effect cleans up the old interval and starts a new one for the new room.

If listing a dependency makes the effect run too often, the answer is **not** to hide it from the linter. Instead: move the value inside the effect if it is only used there; use an updater function for state (`setCount(c => c + 1)` needs no `count` dependency); or restructure. Recent React versions also add `useEffectEvent`, for logic inside an effect that should read the latest values **without** re-running the effect — for example, reading the current theme when logging a connection event.

> [!WARNING]
> Objects and functions created during rendering are **new on every render**. An effect that depends on `options = { city, sort }` created in the component body re-runs after every render, because `{...} !== {...}`. Depend on the primitive values (`city`, `sort`) instead, or create the object inside the effect.

### Level 4 — You might not need an effect

The most important lesson about effects, emphasised in React's own documentation: **effects are an escape hatch** for synchronising with external systems. Many problems people solve with effects have simpler, faster, less buggy solutions:

| Want to... | Do not | Do |
|---|---|---|
| Compute a value from props or state | `useEffect` + `setState` to store it | Calculate it during render (derived state, {{ch:react-basics}}) |
| Respond to a user action (submit, click) | Set a flag in state, then react to it in an effect | Do the work in the **event handler** |
| Reset state when a prop changes | An effect that calls `setState` when the prop changes | Give the component a `key` that changes ({{ch:react-basics}}) |
| Notify a parent of a change | An effect that calls `onChange` after state changes | Call `onChange` in the same handler that changes state |
| Fetch data | (often) a hand-written effect | A framework's data loading or a data-fetching library (below) |

For example, this is a classic anti-pattern:

```tsx
// fragment
// Unnecessary: an extra render and a moment of wrong data on screen
const [fullName, setFullName] = useState("");
useEffect(() => {
  setFullName(`${firstName} ${lastName}`);
}, [firstName, lastName]);

// Better: derive it
const fullName = `${firstName} ${lastName}`;
```

The effect version renders once with the **old** full name, then runs the effect, sets state and renders again. The derived version is always correct, in one render.

A useful test: **would this code still need to run if the component appeared on screen for a reason other than the user's action?** If it exists because the component is **displayed** (connect to the chat room this screen shows), it is an effect. If it exists because the user **did something** (pressed "Buy"), it belongs in an event handler.

## Fetching data

### Level 3 — Fetching in an effect, correctly

Loading data when a component appears, and when its inputs change, is a genuine synchronisation with an external system — the server. Here is a version that handles the tricky parts:

```tsx
// fragment
import { useEffect, useState } from "react";

type Product = { id: string; name: string; pricePaisa: number };

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; products: Product[] };

export function ProductsByCategory({ category }: { category: string }) {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: "loading" });

    fetch(`/api/products?category=${encodeURIComponent(category)}`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`Server responded ${response.status}`);
        return response.json() as Promise<Product[]>;
      })
      .then((products) => setState({ status: "success", products }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return; // we cancelled it; ignore
        setState({ status: "error", message: error instanceof Error ? error.message : "Unknown error" });
      });

    return () => controller.abort();
  }, [category]);

  if (state.status === "loading") return <p>Loading products…</p>;
  if (state.status === "error") return <p role="alert">Could not load products: {state.message}</p>;
  if (state.products.length === 0) return <p>No products in this category yet.</p>;

  return (
    <ul>
      {state.products.map((p) => (
        <li key={p.id}>{p.name}</li>
      ))}
    </ul>
  );
}
```

Walk through the decisions:

- **One state object with a `status`** — a discriminated union ({{ch:typescript-advanced}}) — instead of separate `loading`, `error` and `data` variables. It makes impossible combinations (loading **and** error) impossible, and TypeScript forces each case to be handled.
- **`encodeURIComponent`** escapes the category for safe use in a URL ({{ch:browser-and-dom}}).
- **`response.ok` is checked**, because `fetch` does not reject on HTTP errors.
- **The clean-up aborts the request.** This solves a real bug called a **race condition**. Suppose the user clicks "Mangoes", then quickly "Lychees". Two requests are in flight. If the mangoes response arrives **last** — networks do not guarantee order — the screen would show mangoes under the "Lychees" heading. With the clean-up, switching category aborts the old request, so its response never updates state.
- **Aborted requests are ignored** in `catch`, since an abort rejects the promise with an `AbortError`.
- Empty, loading and error states each get a clear message. `role="alert"` makes screen readers announce the error ({{ch:accessibility}}).

### Level 5 — Why teams rarely hand-write this

Even this careful version lacks much of what real applications need:

- **Caching** — returning to a category you already visited should show data instantly, not a spinner.
- **Deduplication** — if three components need the same data, one request, not three.
- **Background refreshing** — showing cached data immediately while checking for updates ("stale-while-revalidate").
- **Retries** on temporary network failures.
- **Refetching** when the user returns to the tab, or after a mutation changes the data.
- **Avoiding waterfalls** — parent fetches, renders a child, which fetches, which renders a child that fetches...
- **Server rendering** — sending pages with data already included ({{ch:nextjs}}).

That is why most teams use one of:

- **A data-fetching library** such as **TanStack Query** (formerly React Query) or SWR, which provides caching, deduplication, retries and refetching. A component simply writes something like `const { data, isPending, error } = useQuery({ queryKey: ["products", category], queryFn: () => fetchProducts(category) })`.
- **A framework's data loading**, such as Next.js with React Server Components ({{ch:nextjs}}), which fetches on the server before sending the page.

Understanding the hand-written version is still essential: it shows you what those tools do for you, and you will need it for things they do not cover. The distinction between **server state** (data owned by the server, cached on the client) and **client state** (UI state owned by the browser) is central to {{ch:state-management}}.

## Refs

### Level 3 — Reaching the DOM

Sometimes you need the actual DOM element: to focus an input, scroll to an element, measure its size, or hand it to a non-React library such as a map or chart.

```tsx
// fragment
import { useRef } from "react";

export function CouponField() {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <label htmlFor="coupon">Coupon code</label>
      <input id="coupon" ref={inputRef} />
      <button type="button" onClick={() => inputRef.current?.focus()}>
        I have a coupon
      </button>
    </>
  );
}
```

- `useRef<HTMLInputElement>(null)` creates a ref object `{ current: null }`.
- `ref={inputRef}` asks React to put the DOM element into `inputRef.current` after it is created (and set it back to `null` when it is removed).
- In the handler, `inputRef.current?.focus()` focuses the input. Refs are filled in during the **commit**, so read them in event handlers and effects — not during rendering.

In React 19, `ref` can be passed to your own function components like any other prop, so a `TextField` component can forward it to its inner `<input>`. Older code used a wrapper called `forwardRef` for this, which you will still see.

### Level 4 — Refs for values that should not re-render

A ref is also simply a **box that survives re-renders and does not cause them**:

```tsx
// fragment
import { useRef, useState } from "react";

export function Stopwatch() {
  const [elapsedMs, setElapsedMs] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function start() {
    if (intervalRef.current !== null) return;
    const startedAt = Date.now() - elapsedMs;
    intervalRef.current = setInterval(() => setElapsedMs(Date.now() - startedAt), 100);
  }

  function stop() {
    if (intervalRef.current !== null) clearInterval(intervalRef.current);
    intervalRef.current = null;
  }

  return (
    <div>
      <output>{(elapsedMs / 1000).toFixed(1)} s</output>
      <button type="button" onClick={start}>Start</button>
      <button type="button" onClick={stop}>Stop</button>
    </div>
  );
}
```

- The interval id must be remembered between renders (to stop it later), but changing it should **not** re-render anything. That is exactly what a ref is for.
- The displayed time is **state**, because the screen must update when it changes.

**State or ref?** If the value is shown on screen or affects rendering, use state. If it is only used by handlers and effects (timer ids, previous values, a WebSocket instance, "has this already run?" flags), use a ref. Do not read or write `ref.current` during rendering — that makes the component impure. (This component should also stop the interval if it unmounts; adding an effect with a clean-up that calls `stop` would do it.)

## `useReducer`: centralised state logic

### Level 3 — When state logic gets complicated

A checkout form might have a dozen fields, validation errors, a "submitting" flag and a step number, with many event handlers each changing several of these at once. Scattered `setState` calls become hard to follow. **`useReducer`** moves all the update logic into one **pure reducer function** — the same idea as the reducers in {{ch:functional-programming}}:

```ts
type Line = { sku: string; name: string; pricePaisa: number; qty: number };
type CartState = { lines: Line[]; coupon: string | null };

type CartAction =
  | { type: "added"; sku: string; name: string; pricePaisa: number }
  | { type: "removed"; sku: string }
  | { type: "quantityChanged"; sku: string; qty: number }
  | { type: "couponApplied"; code: string };

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "added": {
      const existing = state.lines.find((l) => l.sku === action.sku);
      const lines = existing
        ? state.lines.map((l) => (l.sku === action.sku ? { ...l, qty: l.qty + 1 } : l))
        : [...state.lines, { sku: action.sku, name: action.name, pricePaisa: action.pricePaisa, qty: 1 }];
      return { ...state, lines };
    }
    case "removed":
      return { ...state, lines: state.lines.filter((l) => l.sku !== action.sku) };
    case "quantityChanged":
      return action.qty <= 0
        ? { ...state, lines: state.lines.filter((l) => l.sku !== action.sku) }
        : { ...state, lines: state.lines.map((l) => (l.sku === action.sku ? { ...l, qty: action.qty } : l)) };
    case "couponApplied":
      return { ...state, coupon: action.code.trim().toUpperCase() };
  }
}

let state: CartState = { lines: [], coupon: null };
const actions: CartAction[] = [
  { type: "added", sku: "PEN", name: "Pen", pricePaisa: 15000 },
  { type: "added", sku: "PEN", name: "Pen", pricePaisa: 15000 },
  { type: "added", sku: "INK", name: "Ink", pricePaisa: 22000 },
  { type: "quantityChanged", sku: "INK", qty: 0 },
  { type: "couponApplied", code: " eid10 " },
];
for (const action of actions) state = cartReducer(state, action);
console.log(JSON.stringify(state));
```

**Output:**

```text
{"lines":[{"sku":"PEN","name":"Pen","pricePaisa":15000,"qty":2}],"coupon":"EID10"}
```

In a component:

```tsx
// fragment
import { useReducer } from "react";

export function Cart() {
  const [state, dispatch] = useReducer(cartReducer, { lines: [], coupon: null });

  return (
    <ul>
      {state.lines.map((line) => (
        <li key={line.sku}>
          {line.name} × {line.qty}
          <button type="button" onClick={() => dispatch({ type: "removed", sku: line.sku })}>
            Remove
          </button>
        </li>
      ))}
    </ul>
  );
}
```

- `useReducer(reducer, initialState)` returns the current state and a **`dispatch`** function.
- Event handlers **describe what happened** — `dispatch({ type: "removed", sku })` — instead of computing new state themselves. Naming actions as past-tense events ("added", "removed") keeps that mindset.
- All the rules for how the cart changes live in one pure function, which you can **test without React** at all (as the plain-TypeScript run above does) — {{ch:testing}}.
- Rule: zero quantity removes the line — written once, in the reducer, not repeated in every handler.

**`useState` or `useReducer`?** `useState` for independent, simple values. `useReducer` when several values change together, when the next state depends on complex rules, or when you want the update logic tested separately. This pattern is also the core of Redux ({{ch:state-management}}).

## Context: sharing without prop drilling

### Level 2 — The problem

Some data is needed by many components at many depths: the logged-in user, the theme, the language, the currency. Passing it as props through every layer — including layers that do not use it — is called **prop drilling**. It makes components noisy and tightly coupled to the tree's shape.

### Level 3 — Creating and using context

```tsx
import { createContext, useContext } from "react";
import { renderToStaticMarkup } from "react-dom/server";

type Currency = { code: string; format: (paisa: number) => string };

const pkr: Currency = { code: "PKR", format: (p) => `Rs ${(p / 100).toLocaleString("en-US")}` };
const CurrencyContext = createContext<Currency>(pkr);

function Price({ paisa }: { paisa: number }) {
  const currency = useContext(CurrencyContext);
  return <span className="price">{currency.format(paisa)}</span>;
}

function ProductRow({ name, paisa }: { name: string; paisa: number }) {
  return (
    <li>
      {name}: <Price paisa={paisa} />
    </li>
  );
}

const aed: Currency = { code: "AED", format: (p) => `AED ${(p / 100 / 76).toFixed(2)}` };

console.log(renderToStaticMarkup(<ul><ProductRow name="Mangoes" paisa={225000} /></ul>));
console.log(
  renderToStaticMarkup(
    <CurrencyContext value={aed}>
      <ul><ProductRow name="Mangoes" paisa={225000} /></ul>
    </CurrencyContext>,
  ),
);
```

**Output:**

```text
<ul><li>Mangoes: <span class="price">Rs 2,250</span></li></ul>
<ul><li>Mangoes: <span class="price">AED 29.61</span></li></ul>
```

- `createContext(defaultValue)` creates a context object. The default is used when there is no provider above.
- `useContext(CurrencyContext)` reads the value from the **nearest provider above** in the tree.
- `<CurrencyContext value={...}>` provides a value to everything inside it. (In React 19, the context itself is the provider; older code writes `<CurrencyContext.Provider value={...}>`.)
- `ProductRow` does not mention currency at all — `Price`, deep inside, reads it directly. No drilling.
- The AED conversion rate here is a made-up constant for the example; real exchange rates come from a service.

### Level 4 — Context with state

Context passes a **value**; to share **changing** state, put state in a component and provide it — often together with update functions:

```tsx
// fragment
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

type Theme = "light" | "dark";
type ThemeContextValue = { theme: Theme; toggle: () => void };

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");
  const value = useMemo(() => ({ theme, toggle: () => setTheme((t) => (t === "light" ? "dark" : "light")) }), [theme]);
  return <ThemeContext value={value}>{children}</ThemeContext>;
}

export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useTheme must be used inside <ThemeProvider>");
  return value;
}
```

- The provider component owns the state and provides both the value and a `toggle` function.
- A custom hook, `useTheme`, wraps `useContext` and throws a clear error if someone forgets the provider — far better than a confusing `null` error later.
- `useMemo` keeps the provided object the same between renders unless `theme` changes; otherwise every render of `ThemeProvider` would create a new object and re-render **every** consumer (see Performance).

### Level 5 — When context is the wrong tool

Every component that reads a context re-renders whenever the context's value changes. That is fine for values that change **rarely** — user, theme, language, feature flags. It is a problem for values that change **frequently** — the text of a search box, a timer, a fast-updating cart — provided high in the tree: every keystroke re-renders every consumer.

Options: split contexts so fast-changing and slow-changing values are separate; keep fast-changing state local; or use a state library designed for selective subscriptions ({{ch:state-management}}). And remember the simplest alternative: **composition**. Passing components as `children` often removes the need for drilling entirely ({{ch:react-basics}}).

## Custom hooks

### Level 3 — Extracting logic

Hooks compose. A **custom hook** is any function whose name starts with `use` and which calls other hooks. It lets components share **stateful logic**, not just UI.

```tsx
// fragment
import { useEffect, useState } from "react";

export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

// Usage:
export function ProductSearch() {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 300);
  // fetch suggestions for debouncedQuery (not for every keystroke)
  return <input type="search" aria-label="Search products" value={query} onChange={(e) => setQuery(e.target.value)} />;
}
```

- This is the debounce from {{ch:browser-and-dom}}, rebuilt with React state and an effect: each change of `value` restarts a timer; only when the user pauses for `delayMs` does `debounced` update.
- The clean-up cancels the pending timer when `value` changes — which is exactly the "cancel the previous one" behaviour debouncing needs.
- `ProductSearch` stays simple: it uses the hook like a built-in.

Important facts about custom hooks:

- **They share logic, not state.** Two components calling `useDebouncedValue` each get their **own** state. (To share the same state, use context or a store.)
- **They follow the rules of hooks** — the `use` prefix is how React's lint rules know to check them.
- **Good custom hooks have clear, specific purposes**: `useOnlineStatus`, `useLocalStorage`, `useMediaQuery`, `useCart`. A custom hook that merely wraps a single `useEffect` with no clear purpose adds indirection without value.

## Performance

### Level 2 — When components re-render

A component re-renders when:

1. Its **state** changes.
2. Its **parent** re-renders (by default, all children re-render too, whether or not their props changed).
3. A **context** it reads changes.

Re-rendering is **not the same as updating the DOM**. A re-render recalculates elements; React then changes only what differs. Most re-renders are cheap, and most applications never need optimisation. But when a re-render is expensive (a large list, a heavy chart) and happens often (on every keystroke), the user feels it.

> [!TIP]
> **Measure first.** The React DevTools **Profiler** records interactions and shows which components rendered, why, and how long each took. Optimise what the profiler shows is slow — not what you guess might be.

### Level 3 — The first and best fixes: structure

Before reaching for memoisation:

- **Move state down.** If only the search box needs `query`, keep `query` in the search box component, not in the page. Then typing re-renders only the search box.
- **Lift content up as `children`.** A component that owns fast-changing state can take its expensive, unrelated content as `children`; those elements were created by the parent and are not re-rendered when the child's state changes.
- **Avoid unnecessary state and effects** (derived values, no effect chains).

### Level 4 — `memo`, `useMemo` and `useCallback`

When structure is not enough, React offers memoisation:

```tsx
// fragment
import { memo, useCallback, useMemo, useState } from "react";

type Product = { id: string; name: string; pricePaisa: number; category: string };

const ProductRow = memo(function ProductRow({ product, onAdd }: { product: Product; onAdd: (id: string) => void }) {
  return (
    <li>
      {product.name} <button type="button" onClick={() => onAdd(product.id)}>Add</button>
    </li>
  );
});

export function Catalogue({ products }: { products: Product[] }) {
  const [query, setQuery] = useState("");
  const [cartCount, setCartCount] = useState(0);

  const visible = useMemo(
    () => products.filter((p) => p.name.toLowerCase().includes(query.toLowerCase())),
    [products, query],
  );

  const handleAdd = useCallback((id: string) => {
    setCartCount((c) => c + 1);
  }, []);

  return (
    <>
      <p>Cart: {cartCount}</p>
      <input aria-label="Filter products" value={query} onChange={(e) => setQuery(e.target.value)} />
      <ul>
        {visible.map((p) => (
          <ProductRow key={p.id} product={p} onAdd={handleAdd} />
        ))}
      </ul>
    </>
  );
}
```

- **`memo(Component)`** makes a component skip re-rendering when its props are the **same** (compared with `Object.is`, property by property) as last time. When the user adds to the cart, `Catalogue` re-renders, but each `ProductRow` receives the same `product` object and the same `onAdd` function, so it skips.
- **`useMemo(fn, deps)`** caches a **computed value**, recalculating only when dependencies change. The filtered list is recomputed when `products` or `query` change, not when `cartCount` changes — and, importantly, it keeps the same array reference between unrelated renders.
- **`useCallback(fn, deps)`** caches a **function**. Without it, `handleAdd` would be a new function every render, so `memo` on `ProductRow` would always see a "changed" prop and never skip. The updater form (`c => c + 1`) means the callback needs no dependencies.

These tools only help **together and correctly**. `memo` is useless if any prop is a new object or function each render. And memoisation has costs: memory, comparisons, and code complexity. Use it when the profiler shows a real problem.

### Level 4 — The React Compiler

Writing `memo`, `useMemo` and `useCallback` by hand is tedious and easy to get wrong. The **React Compiler**, which reached its first stable release in 2025, is a build-time tool that analyses your components and inserts the equivalent memoisation **automatically**. Projects using it (it can be enabled in Vite and Next.js builds) can remove most manual memoisation. It relies on your components following React's rules — pure rendering, no mutation of props or state — which is one more reason to follow them.

### Level 4 — Keeping the interface responsive: transitions

Some updates are **urgent** (showing the character the user just typed) and some can wait a little (re-filtering a 5,000-row table). **Transitions** let you mark the second kind as non-urgent, so React keeps the interface responsive:

```tsx
// fragment
import { useState, useTransition } from "react";

export function BigTableFilter({ rows }: { rows: { id: string; name: string }[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("");
  const [isPending, startTransition] = useTransition();

  const visible = rows.filter((r) => r.name.includes(filter));

  return (
    <>
      <input
        aria-label="Filter"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);                       // urgent: update the input
          startTransition(() => setFilter(e.target.value)); // can wait: re-filter the table
        }}
      />
      {isPending && <p>Updating…</p>}
      <ul style={{ opacity: isPending ? 0.6 : 1 }}>
        {visible.map((r) => <li key={r.id}>{r.name}</li>)}
      </ul>
    </>
  );
}
```

- The input's own state updates immediately, so typing never lags.
- The filter update is wrapped in `startTransition`. React may render it in the background, interrupt it if the user types again, and show the old table (dimmed, via `isPending`) until the new one is ready.
- `useDeferredValue(value)` is a related hook: it gives you a version of a value that "lags behind" during heavy renders, achieving a similar effect when you do not control the state update.

### Level 5 — Code splitting and virtualisation

- **Code splitting.** A large application should not download all its code before showing the first screen. `lazy(() => import("./AdminDashboard"))` loads a component's code only when it is first rendered, combined with `<Suspense>` (below) to show a fallback while it downloads ({{ch:frontend-performance}}).
- **List virtualisation.** Rendering 10,000 rows creates 10,000 DOM nodes, which is slow whatever React does. **Virtualisation** libraries (such as TanStack Virtual or react-window) render only the rows currently visible, plus a few above and below, and swap them as the user scrolls.

## Suspense and error boundaries

### Level 3 — Suspense

**Suspense** lets a part of the tree say "I'm not ready yet", and shows a fallback until it is:

```tsx
// fragment
import { lazy, Suspense } from "react";

const SalesChart = lazy(() => import("./SalesChart"));

export function Dashboard() {
  return (
    <main>
      <h1>Sales</h1>
      <Suspense fallback={<p>Loading chart…</p>}>
        <SalesChart />
      </Suspense>
    </main>
  );
}
```

- `lazy` creates a component whose code is downloaded the first time it renders. Until the code arrives, it **suspends**.
- The nearest `<Suspense>` boundary above it shows its `fallback` instead. The rest of the page — here, the heading — shows immediately.
- Suspense also works for **data** when used with frameworks and libraries that support it (Next.js, TanStack Query's suspense mode), and with React 19's `use` hook, which can read a promise: `const products = use(productsPromise)` suspends until the promise resolves.
- Place Suspense boundaries where a loading state makes sense to users: around a chart, a sidebar, a list — not around every small component.

### Level 4 — Error boundaries

If a component throws an error during rendering, React removes the **whole** tree by default — the user sees a blank page. An **error boundary** catches errors in its children and shows a fallback instead:

```tsx
// fragment
import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { fallback: ReactNode; children: ReactNode };
type State = { hasError: boolean };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    reportToMonitoring(error, info.componentStack); // send to an error-tracking service
  }

  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

declare function reportToMonitoring(error: Error, stack: string | null | undefined): void;

// Usage:
// <ErrorBoundary fallback={<p>The recommendations could not be shown.</p>}>
//   <Recommendations />
// </ErrorBoundary>
```

- Error boundaries are one of the few remaining reasons to write a **class component** ({{ch:this-prototypes-classes}}): React has no hook equivalent yet. Many teams use the small `react-error-boundary` library instead of writing their own.
- `getDerivedStateFromError` switches to the fallback; `componentDidCatch` is the place to report the error to monitoring ({{ch:observability-and-incidents}}).
- Error boundaries catch errors during **rendering** and in lifecycle code. They do **not** catch errors in event handlers or asynchronous code — handle those with `try/catch` and state.
- Wrap independent sections — recommendations, reviews, a chart — so one failing widget does not take down the checkout.

## Forms and actions in React 19

### Level 4 — Actions and `useActionState`

React 19 added first-class support for **actions**: functions, usually asynchronous, that handle a form submission. Passing a function to a form's `action` prop gives you pending states, error handling and form resets with little code:

```tsx
// fragment
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

type SubscribeState = { ok: boolean; message: string };

async function subscribe(_previous: SubscribeState, formData: FormData): Promise<SubscribeState> {
  const email = String(formData.get("email") ?? "");
  const response = await fetch("/api/newsletter", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  return response.ok
    ? { ok: true, message: "Thanks! Please check your inbox to confirm." }
    : { ok: false, message: "Sorry, we could not subscribe that address." };
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending}>{pending ? "Subscribing…" : "Subscribe"}</button>;
}

export function NewsletterSignup() {
  const [state, formAction] = useActionState(subscribe, { ok: false, message: "" });

  return (
    <form action={formAction}>
      <label htmlFor="newsletter-email">Email</label>
      <input id="newsletter-email" name="email" type="email" required />
      <SubmitButton />
      {state.message && <p role="status">{state.message}</p>}
    </form>
  );
}
```

- `useActionState(actionFn, initialState)` returns the latest **result** of the action and a **wrapped action** to give to the form. (It also returns a third value, `isPending`.) The action receives the **previous state** and the form's **`FormData`**.
- `<form action={formAction}>` — React calls the action on submit (no `preventDefault` needed) and, after a successful action, resets uncontrolled fields.
- `useFormStatus()` lets a component **inside** the form know whether it is submitting — so a reusable `SubmitButton` can disable itself, preventing double submissions ({{ch:browser-and-dom}}).
- In a framework such as Next.js, the action can be a **server function** that runs on the server directly ({{ch:nextjs}}).

### Level 4 — Optimistic updates

`useOptimistic` shows the expected result **immediately**, before the server confirms, and rolls back automatically if the action fails:

```tsx
// fragment
import { useOptimistic, useState, startTransition } from "react";

type Review = { id: string; text: string; sending?: boolean };

export function Reviews({ initial, send }: { initial: Review[]; send: (text: string) => Promise<Review> }) {
  const [reviews, setReviews] = useState(initial);
  const [optimisticReviews, addOptimistic] = useOptimistic(
    reviews,
    (current: Review[], text: string) => [...current, { id: `temp-${current.length}`, text, sending: true }],
  );

  function handleSubmit(formData: FormData) {
    const text = String(formData.get("text") ?? "");
    startTransition(async () => {
      addOptimistic(text);
      const saved = await send(text);
      setReviews((r) => [...r, saved]);
    });
  }

  return (
    <>
      <ul>
        {optimisticReviews.map((r) => (
          <li key={r.id} style={{ opacity: r.sending ? 0.5 : 1 }}>{r.text}</li>
        ))}
      </ul>
      <form action={handleSubmit}>
        <label htmlFor="review">Your review</label>
        <input id="review" name="text" required />
        <button type="submit">Post</button>
      </form>
    </>
  );
}
```

The new review appears instantly, faded, while it is sent; when the real one arrives, it replaces the optimistic copy. Optimistic UI makes applications feel fast — but use it only where failure is rare and the rollback is understandable to users (a "like", a comment), not for payments.

## Testing React components

Test components the way users use them: find elements by their **role** and **label**, interact, and check what appears. **React Testing Library** encourages exactly this:

```tsx
// fragment
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it } from "vitest";
import { DeliveryOptions } from "./DeliveryOptions";

it("adds the express surcharge to the delivery fee", async () => {
  const user = userEvent.setup();
  render(<DeliveryOptions />);

  expect(screen.getByText("Delivery fee: Rs 150")).toBeDefined();
  await user.click(screen.getByRole("checkbox", { name: /express delivery/i }));
  expect(screen.getByText("Delivery fee: Rs 350")).toBeDefined();
});
```

- `render` mounts the component into a simulated DOM (jsdom); `screen` queries it.
- `getByRole("checkbox", { name: /express/i })` finds the checkbox by its **accessible name** — its label. If this query fails, real screen-reader users probably cannot find the control either; good tests and accessibility reinforce each other ({{ch:accessibility}}).
- `userEvent` simulates real user interactions (focus, click, typing) more faithfully than firing raw events.
- The test checks **what the user sees**, not internal state — so refactoring the component's internals does not break it ({{ch:testing}}).
- (Many projects add the `@testing-library/jest-dom` matchers for more readable assertions such as `toBeInTheDocument()`.)

Network requests in component tests are usually intercepted with **Mock Service Worker (MSW)**, which fakes responses at the network level so the component's real fetching code runs.

## From beginner to enterprise

**Level 3 — first effects and hooks.** Effects with correct dependencies and clean-up; refs for focus; context for theme; one or two custom hooks.

**Level 4 — a real application.** Data fetching through a library or framework; reducers for complex state; error boundaries around independent sections; Suspense with lazy-loaded routes; forms with actions; tests with Testing Library.

**Level 5 — professional practice.** The hooks lint rules enforced; "you might not need an effect" applied in review; performance work driven by the Profiler; the React Compiler enabled; monitoring of client-side errors; consistent patterns for loading, empty and error states.

**Level 6 — large applications.** Server Components and server-side data loading to send less JavaScript ({{ch:nextjs}}); streaming with Suspense so fast parts of a page appear before slow ones; strict separation of server state and client state ({{ch:state-management}}); performance budgets on real-user metrics such as Interaction to Next Paint ({{ch:frontend-performance}}); shared hooks and components across many teams.

## Real-world use cases

### Live order tracking

- **Requirement:** a customer's order page shows the rider's position, updated live.
- **Design:** a custom hook `useOrderUpdates(orderId)` opens a WebSocket in an effect ({{ch:websockets}}), dispatches updates to a reducer, and closes the connection in its clean-up. The `orderId` dependency reconnects when the customer switches orders.
- **Failure scenarios handled:** network drop (reconnect with backoff), component unmount (clean-up closes the socket), StrictMode double mount (clean-up makes it harmless).

### A slow admin dashboard

- **Symptom:** typing in a filter lags on a page with five charts and a 2,000-row table.
- **Investigation with the Profiler:** every keystroke re-rendered all charts because the filter state lived in the page component.
- **Fixes:** move the filter state into the table section; memoise the expensive chart components; use a transition for the table filter; virtualise the table.
- **Result:** typing is immediate; charts render only when their data changes.

## Common mistakes

### Beginner: missing clean-up

Intervals and listeners added in effects without removal; duplicated in development by StrictMode. **Fix:** every effect that starts something returns a clean-up that stops it.

### Beginner: effects for derived state and event responses

`useEffect(() => setTotal(...), [items])`; `useEffect(() => { if (submitted) send() }, [submitted])`. **Fix:** compute during render; do the work in the handler.

### Beginner: infinite effect loops

An effect sets state that is also in its dependencies, or depends on an object recreated every render. **Fix:** remove the unnecessary effect; depend on primitives; use updater functions.

### Intermediate: lying about dependencies

Silencing the lint rule to stop an effect re-running, creating stale closures. **Fix:** restructure; follow the rule.

### Intermediate: race conditions in fetching

Showing data for an old request. **Fix:** abort in clean-up, or use a data-fetching library.

### Intermediate: one giant context

User, cart, theme and UI flags in one context value; every change re-renders everything. **Fix:** separate contexts by how often they change; consider a store.

### Production: premature or broken memoisation

`useMemo` around trivial calculations; `memo` defeated by inline object props. **Fix:** profile first; enable the React Compiler; restructure state.

### Production: no error boundaries

One broken widget blanks the entire checkout. **Fix:** boundaries around independent regions, with reporting.

## Debugging and troubleshooting

- **An effect runs twice in development** — StrictMode testing your clean-up. Make it idempotent and cleaned up; do not disable StrictMode.
- **An effect runs on every render** — no dependency array, or an object/function dependency recreated each render.
- **"Maximum update depth exceeded"** — a loop of state updates, often an effect setting state that triggers itself.
- **"Can't perform a React state update on an unmounted component"** (older React) or stale updates — a missing clean-up or abort.
- **A value inside a handler or interval is stale** — a closure over an old render; fix dependencies or use an updater function.
- **"useX must be used inside a Provider"** (your own error) — the component is rendered outside the provider; check the tree.
- **React DevTools Profiler** — "Why did this render?" is shown when you enable "Record why each component rendered".
- **Network panel** — check whether requests are duplicated, cancelled or arriving out of order.

## Security and performance notes

**Security.** Effects and refs make it easy to reach outside React's protections: never assign user data to `innerHTML` through a ref, never put secrets or private API keys in client components (everything shipped to the browser is public), and treat data from the network as untrusted until validated ({{ch:validation}}). Form actions that run on a server must check authorisation themselves; they are public endpoints ({{ch:nextjs}}, {{ch:application-security}}).

**Performance.** Keep state local; avoid unnecessary effects and the extra renders they cause; split context by update frequency; memoise only where measured (or let the compiler do it); use transitions for heavy, non-urgent updates; split code with `lazy`; virtualise long lists; and keep effects' clean-up correct, because leaks degrade performance over time.

## How a senior engineer thinks about this

- **Effects synchronise; handlers respond.** Before writing an effect, they ask which external system it synchronises with. If there is none, there is probably no effect.
- **Server state is not client state.** Data from the server goes through a caching layer or framework; local UI state stays local.
- **Logic in pure functions, React at the edges.** Reducers and helpers are tested without React; components wire them up.
- **Structure before memoisation.** Most performance problems are solved by moving state, not by `useMemo`.
- **Design for failure and slowness.** Every data-driven region has loading, empty and error states, and a boundary.
- **Follow the rules so tools can help.** Pure renders and honest dependencies let StrictMode, the linter and the compiler catch and fix problems.

## Exercises

### Exercise 1 — A `useLocalStorage` hook

**Objective:** practise state, effects and safe storage access.
**What to build:** `useLocalStorage<T>(key, initialValue)` that behaves like `useState` but saves the value to `localStorage` (as JSON) whenever it changes, and reads the saved value on first render. It must not crash if storage is unavailable or contains invalid JSON.

<details>
<summary>Show the solution</summary>

```tsx
// fragment
import { useEffect, useState } from "react";

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? initialValue : (JSON.parse(raw) as T);
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // storage full or unavailable: keep working in memory
    }
  }, [key, value]);

  return [value, setValue] as const;
}

// const [city, setCity] = useLocalStorage("preferredCity", "lahore");
```

**Walkthrough:**
- `useState(() => ...)` uses a **lazy initialiser**: the function runs only on the first render, so `localStorage` is read once, not on every render.
- Reading is wrapped in `try/catch` for invalid JSON or blocked storage ({{ch:browser-and-dom}}).
- Saving is a genuine synchronisation with an external system — the browser's storage — so an effect is appropriate. Its dependencies are `key` and `value`.
- `as const` makes the return type a fixed tuple `[T, setter]`, like `useState`.
- **Limitations worth knowing:** in server-rendered frameworks, `localStorage` does not exist on the server, so access must be guarded; and the value is validated only by a cast — for important data, validate the parsed shape ({{ch:validation}}). Never store secrets this way.

</details>

### Exercise 2 — Remove the unnecessary effects

**Objective:** practise "you might not need an effect".
**Starting point:**

```tsx
// fragment
function Checkout({ items, onPlaced }: { items: Item[]; onPlaced: () => void }) {
  const [total, setTotal] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    setTotal(items.reduce((s, i) => s + i.pricePaisa * i.qty, 0));
  }, [items]);

  useEffect(() => {
    if (submitted) {
      fetch("/api/orders", { method: "POST", body: JSON.stringify(items) }).then(() => onPlaced());
    }
  }, [submitted]);

  return <button type="button" onClick={() => setSubmitted(true)}>Pay Rs {total / 100}</button>;
}
```

**What to do:** rewrite it without effects, and explain the bugs in the original.

<details>
<summary>Show the solution</summary>

```tsx
// fragment
function Checkout({ items, onPlaced }: { items: Item[]; onPlaced: () => void }) {
  const [submitting, setSubmitting] = useState(false);
  const totalPaisa = items.reduce((s, i) => s + i.pricePaisa * i.qty, 0);

  async function handlePay() {
    if (submitting) return;
    setSubmitting(true);
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(items),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      onPlaced();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <button type="button" onClick={handlePay} disabled={submitting}>
      {submitting ? "Placing order…" : `Pay Rs ${totalPaisa / 100}`}
    </button>
  );
}
```

**Bugs in the original:**
1. The total is duplicated state: the first render shows **Rs 0**, then an effect corrects it — a flash of wrong data and an extra render.
2. Placing an order is a response to a **user action**, so it belongs in the handler. As an effect, it depends on `submitted` but also uses `items` and `onPlaced` without listing them (a stale-closure risk), and `submitted` never resets, so the component cannot be used to retry.
3. In development, StrictMode re-running effects could send the order **twice**.
4. `response.ok` is not checked, and nothing prevents double clicks.

</details>

### Exercise 3 — Debug the chat effect

**Objective:** practise effect dependencies and clean-up.
**The scenario:** when the user switches between support chat rooms, messages from the **previous** room keep appearing, and after a few switches, every message appears several times.

```tsx
// fragment
function ChatRoom({ roomId }: { roomId: string }) {
  const [messages, setMessages] = useState<string[]>([]);

  useEffect(() => {
    const connection = createConnection(roomId);
    connection.on("message", (m: string) => setMessages([...messages, m]));
    connection.connect();
  }, [roomId]);

  return <ul>{messages.map((m, i) => <li key={i}>{m}</li>)}</ul>;
}
```

<details>
<summary>Show the solution</summary>

**Causes:**
1. **No clean-up:** switching rooms creates a new connection but never closes the old one. Old rooms keep delivering messages, and each switch adds another live connection — hence duplicates.
2. **Stale closure:** `setMessages([...messages, m])` uses `messages` from the render when the effect ran (usually `[]`), so messages overwrite each other. Use an updater.
3. **Messages from the old room are not cleared** when the room changes.
4. Index keys on a list that only grows are acceptable, but message ids are better.

**Fix:**

```tsx
// fragment
function ChatRoom({ roomId }: { roomId: string }) {
  const [messages, setMessages] = useState<string[]>([]);

  useEffect(() => {
    setMessages([]);                                   // new room, empty list
    const connection = createConnection(roomId);
    connection.on("message", (m: string) => setMessages((current) => [...current, m]));
    connection.connect();
    return () => connection.disconnect();              // close the old room
  }, [roomId]);

  return <ul>{messages.map((m, i) => <li key={i}>{m}</li>)}</ul>;
}
```

An even cleaner way to reset everything for a new room is to render `<ChatRoom key={roomId} roomId={roomId} />` from the parent: a new key gives a completely fresh component, so the `setMessages([])` line is unnecessary ({{ch:react-basics}}).

</details>

### Exercise 4 — Production scenario: a sluggish product page

**Objective:** practise performance diagnosis.
**The scenario:** a product listing page with 600 products, a search box, filters, a cart badge and a "recently viewed" carousel. Typing in the search box feels slow on mid-range phones. The component tree keeps `query`, `filters`, `cart` and `recentlyViewed` in one top-level `ProductPage` component, which also provides all of them through a single context. Propose a plan, in order.

<details>
<summary>Show the solution</summary>

1. **Measure.** Record typing in the React Profiler and the browser Performance panel on a throttled CPU. Confirm what renders on each keystroke and how long it takes.
2. **Split the context.** One context holding everything makes **every** consumer re-render on every keystroke. Separate cart (changes on add), recently viewed (changes rarely) and search/filter state (changes on typing) — or move the cart to a store with selective subscriptions ({{ch:state-management}}).
3. **Move state down.** Keep the raw `query` inside the search box; pass up a **debounced** value (or use a transition for the filter update) so the expensive list update does not run on every keystroke.
4. **Make filtering cheap and stable.** Derive the filtered list with `useMemo` (or rely on the React Compiler) keyed on the debounced query and filters; memoise `ProductCard` and give it stable props.
5. **Render less.** Virtualise the list, or paginate / "load more", so hundreds of cards are not in the DOM at once ({{ch:frontend-performance}}).
6. **Move work to the server if needed.** For larger catalogues, filter on the server with a debounced request, and put filters in the URL so results are shareable ({{ch:browser-and-dom}}).
7. **Measure again**, and add a performance check to prevent regressions.

**Why this order:** measurement prevents guessing; structural changes (contexts, state location) usually give the biggest wins; memoisation and virtualisation then finish the job.

</details>

## Summary

**Effects** (`useEffect`) synchronise components with external systems after the screen updates. List every reactive value in the **dependency array**; return a **clean-up** that undoes whatever the effect started; and treat StrictMode's double mounting in development as a test of that clean-up. Most problems people solve with effects are better solved without them: derive values during rendering, respond to user actions in event handlers, and reset state with keys.

Fetch data with cancellation to avoid **race conditions**, model loading, error and success explicitly — and in real applications prefer a data-fetching library or framework that adds caching, deduplication and refetching. Use **refs** for DOM access and for values that must not trigger renders. Use **`useReducer`** to centralise complex update logic in a pure, testable function, and **context** to share rarely-changing values deeply without prop drilling. Package reusable stateful logic as **custom hooks**.

Components re-render when state, parents or context change; re-rendering is usually cheap. Fix performance by **measuring**, then restructuring state, then memoising with `memo`, `useMemo` and `useCallback` (or the React Compiler), using **transitions** for heavy non-urgent updates, `lazy` for code splitting and virtualisation for long lists. Use **Suspense** for loading states and **error boundaries** to contain failures. React 19's **actions**, `useActionState`, `useFormStatus` and `useOptimistic` make forms simpler and more responsive. Test components through what users see, with Testing Library.

## Key terms

- **Side effect** — Work a program does beyond computing a result, such as network requests, timers, subscriptions or changing external state.
- **Effect (React)** — Code registered with `useEffect` that runs after rendering to synchronise a component with an external system.
- **Dependency array** — The list of values an effect, memo or callback depends on, which decides when it re-runs.
- **Clean-up function** — A function returned by an effect that undoes its work before the effect re-runs or the component unmounts.
- **Mount / unmount** — A component instance being added to the screen for the first time, or removed from it.
- **Stale closure** — A function that keeps using values from an earlier render because it captured them when it was created.
- **Race condition** — A bug in which the result depends on the unpredictable order in which concurrent operations finish.
- **Server state** — Data owned by a server and cached in the client, which can become out of date.
- **Ref (useRef)** — A mutable container that persists across renders without causing re-renders, often holding a DOM element.
- **useReducer** — A React hook that manages state through a reducer function and dispatched actions.
- **Dispatch** — The function used to send an action to a reducer.
- **Context (React)** — A mechanism for providing a value to all components below a provider without passing props through each level.
- **Prop drilling** — Passing props through many intermediate components that do not use them, only to reach a deep child.
- **Custom hook** — A reusable function whose name starts with `use` and which combines other hooks into stateful logic.
- **Memoisation** — Caching the result of a computation and reusing it when the inputs have not changed.
- **memo** — A React function that makes a component skip re-rendering when its props have not changed.
- **useMemo** — A React hook that caches a computed value between renders until its dependencies change.
- **useCallback** — A React hook that caches a function between renders until its dependencies change.
- **React Compiler** — A build-time tool that automatically adds memoisation to React components.
- **Transition (React)** — An update marked as non-urgent so React can keep the interface responsive while rendering it.
- **Code splitting** — Dividing an application's code into pieces that are downloaded only when needed.
- **List virtualisation** — Rendering only the items of a long list that are currently visible, plus a small buffer.
- **Suspense** — A React component that shows a fallback while something inside it, such as code or data, is not ready.
- **Error boundary** — A component that catches rendering errors in its children and displays a fallback instead of crashing the app.
- **Action (React)** — A function, usually asynchronous, passed to a form's `action` prop to handle submission.
- **useActionState** — A React hook that runs an action and keeps its latest result as state.
- **Optimistic update** — Showing the expected result of an action immediately, before the server confirms it, and rolling back on failure.
- **React Testing Library** — A testing library that renders components and queries them the way users find elements, by role and label.

## What comes next

As applications grow, the question "where should this state live?" becomes central. Local state, lifted state and context take you a long way, but larger applications must manage server data caches, global client state, URL state and form state deliberately. The next chapter, {{ch:state-management}}, surveys these kinds of state and the tools professionals use for each — from TanStack Query to Zustand and Redux Toolkit — and when each is worth its cost.
