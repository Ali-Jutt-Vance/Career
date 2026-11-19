# State Management

> [!GOALS]
> - Classify the different **kinds of state** in a front-end application — local UI, shared client, server, URL, form and persistent — and why each needs different handling.
> - Explain how a **store** works inside: holding state, notifying subscribers, and letting components subscribe to just the parts they need with **selectors**.
> - Manage server data with **TanStack Query**: query keys, caching, staleness, background refetching, mutations and invalidation.
> - Manage shared client state with **Zustand** and with **Redux Toolkit**, and know when each fits.
> - Keep state in the **URL** when it should be shareable and survive a refresh.
> - Structure state well: minimal, **normalised**, derived with selectors, updated immutably.
> - Choose the simplest tool that solves the actual problem, and recognise when global state is a mistake.

## Why this matters

In {{ch:react-basics}} and {{ch:react-advanced}} you learned React's own tools for state: `useState` and `useReducer` inside a component, lifting state up to a common parent, and context for values needed deep in the tree. For small applications, these are enough.

As applications grow, the same questions keep returning:

- The cart count in the header, the cart page and the checkout must always agree. Where does the cart live?
- The product list was loaded on the home page. When the user navigates to a category and back, must it be loaded again? How old can it be before it is out of date?
- After the user edits their address, every component showing the address must update — including ones that loaded it separately.
- The user filters products by price, then shares the link with a friend. Does the friend see the same filtered list?
- The user is halfway through a long form, accidentally refreshes the page, and loses everything.

Teams that answer these questions badly end up with **two copies of the same data that disagree**, endless loading spinners, network requests repeated for no reason, and a "global store" containing everything, which every change re-renders. Teams that answer them well have applications that feel fast and stay correct.

State management is not about learning one famous library. It is about recognising **what kind of state** you have and choosing the right home for it. This chapter teaches that judgement, and the most widely used tools for each kind.

## The simple idea

Think about how a busy restaurant keeps track of information.

- A waiter's **notepad** holds what they are writing right now — a customer's half-finished order. Nobody else needs it until it is complete. (Local state.)
- The **order board** in the kitchen shows every confirmed order. Every cook reads it, and when an order changes, everyone sees the change. (Shared client state — a store.)
- The **stock room** belongs to the supplier's system. The restaurant keeps a **copy** of what is in stock on a sheet, but the sheet can become out of date and must be checked and refreshed. (Server state — a cache.)
- The **table number** on the customer's receipt tells anyone, instantly, which table this is about. (URL state.)

Each kind of information has a natural home, and problems start when information lives in the wrong place — when the waiter's notepad is treated as the official order board, or when the kitchen trusts an old stock sheet as if it were the stock room itself.

> [!ANALOGY]
> A restaurant keeps different information in different places: the waiter's notepad, the kitchen's order board, a copy of the stock list, and the table number on each receipt. Front-end state works the same way.
>
> **Where the analogy breaks:** a restaurant's copy of the stock list is updated by a person when they remember. In software, the copy of server data (the cache) can be refreshed **automatically** — on a timer, when the user returns to the tab, or right after a change — and the tools that do this are what make modern applications feel instant.

## The proper definition and key words

**State management** is the set of decisions and tools that determine where an application's changing data lives, how it is read and updated, and how the user interface stays consistent with it.

The key words:

- **Local state** — state used by one component (or a small subtree), held with `useState` or `useReducer`.
- **Shared client state** — state created and owned by the browser application, used by many distant components: a cart before checkout, the current theme, an open dialog, a multi-step wizard.
- **Server state** — data owned by a server: products, orders, the user's profile. The client only holds a **cached copy**, which may be out of date.
- **URL state** — state encoded in the address: the page, search terms, filters, sort order, the selected tab.
- **Form state** — values, validation errors and submission status of forms in progress ({{ch:forms}}).
- **Persistent state** — state saved in the browser (for example in `localStorage`) to survive reloads.
- **Store** — an object outside the component tree that holds state, lets code update it, and notifies subscribers of changes.
- **Selector** — a function that reads a specific piece of data, or a derived value, from a store.
- **Cache** — a stored copy of data from a slower or remote source, kept to avoid fetching it again.
- **Stale data** — cached data that may no longer match the source.
- **Normalisation** — storing each entity once, by id, and referring to it by id elsewhere.

## How it works inside: what a store is

Before using any library, it helps to see that a store is a simple idea. Here is a complete, minimal store in plain TypeScript:

```ts
type Listener = () => void;

function createStore<S>(initial: S) {
  let state = initial;
  const listeners = new Set<Listener>();

  return {
    getState: () => state,
    setState(update: (current: S) => S) {
      const next = update(state);
      if (Object.is(next, state)) return;      // nothing changed: notify nobody
      state = next;
      for (const listener of listeners) listener();
    },
    subscribe(listener: Listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

// A selector-based subscription: run `onChange` only when the selected value changes
function watch<S, T>(store: ReturnType<typeof createStore<S>>, select: (s: S) => T, onChange: (v: T) => void) {
  let previous = select(store.getState());
  return store.subscribe(() => {
    const next = select(store.getState());
    if (!Object.is(next, previous)) {
      previous = next;
      onChange(next);
    }
  });
}

type ShopState = { cart: { sku: string; qty: number }[]; theme: "light" | "dark" };
const store = createStore<ShopState>({ cart: [], theme: "light" });

watch(store, (s) => s.cart.reduce((n, l) => n + l.qty, 0), (count) => console.log(`header badge: ${count}`));
watch(store, (s) => s.theme, (theme) => console.log(`theme switch: ${theme}`));

store.setState((s) => ({ ...s, cart: [...s.cart, { sku: "PEN", qty: 2 }] }));
store.setState((s) => ({ ...s, theme: "dark" }));
store.setState((s) => s); // no change
store.setState((s) => ({ ...s, cart: s.cart.map((l) => ({ ...l, qty: l.qty + 1 })) }));
```

**Output:**

```text
header badge: 2
theme switch: dark
header badge: 3
```

Walk through the mechanism, because every state library you will use is a more sophisticated version of it:

- The store holds **one state value** in a closure ({{ch:scope-and-closures}}). Nobody can change it except through `setState`.
- `setState` takes an **updater function** and expects a **new** object for any change — immutable updates ({{ch:functional-programming}}). Returning the same object means "no change", and nobody is notified.
- `subscribe` registers a listener and returns an unsubscribe function — the observer pattern ({{ch:design-patterns}}).
- `watch` adds **selectors**: each subscriber picks the slice it cares about, and is notified only when **that slice** changes. Changing the theme does not notify the cart badge; changing the cart does not notify the theme switch.

The last point is the key to performance. A store with selectors lets each component re-render only when **its** data changes — the solution to the "one big context re-renders everything" problem from {{ch:react-advanced}}. React provides a hook, `useSyncExternalStore`, that connects exactly this kind of store to components safely; libraries such as Zustand and React Redux are built on it.

## The kinds of state, and where each belongs

A practical decision guide:

```text
   Is this data owned by a server (a database, an API)?
        │ yes ──▶ SERVER STATE: a data-fetching cache (TanStack Query / framework)
        │ no
        ▼
   Should it be in the address, so it can be shared, bookmarked or refreshed?
        │ yes ──▶ URL STATE: path and query parameters
        │ no
        ▼
   Is it the content of a form being filled in?
        │ yes ──▶ FORM STATE: the form itself or a form library ({{ch:forms}})
        │ no
        ▼
   Is it used by one component or a small subtree?
        │ yes ──▶ LOCAL STATE: useState / useReducer, lifted to the nearest common parent
        │ no
        ▼
   Does it change rarely (user, theme, language)?
        │ yes ──▶ CONTEXT
        │ no
        ▼
   SHARED CLIENT STATE: a store (Zustand, Redux Toolkit...)
```

(The `{{ch:forms}}` inside the diagram is shorthand for the next chapter.)

The most common mistake is the first one: **treating server data as client state** — loading products with `useEffect`, putting them into a global store, and then hand-writing loading flags, caching, refreshing and synchronisation. Most of what used to be called "global state" in older applications was really a hand-made, buggy cache of server data. Once server state is handled by a proper cache, the remaining client state is often small.

## Server state with TanStack Query

### Level 2 — What makes server state different

Server data has properties that local state does not:

- It is **owned elsewhere** and can change without your application knowing — another user buys the last box of mangoes.
- It must be **fetched asynchronously** and may fail.
- It can become **stale**.
- Several components often need the **same** data.
- After you **change** it (a mutation), other cached data may be out of date.

A good server-state tool therefore provides caching, deduplication, background refetching, retries, staleness rules, and invalidation. **TanStack Query** (formerly React Query) is the most widely used such library for React; SWR and RTK Query (part of Redux Toolkit) are popular alternatives with similar ideas. Frameworks such as Next.js provide server-side data loading that covers some of the same ground ({{ch:nextjs}}).

### Level 3 — Setting up and querying

```tsx
// fragment
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000 } },
});

export function Root() {
  return (
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  );
}
```

- The **`QueryClient`** holds the cache. One is created for the whole application and provided through context.
- `staleTime: 30_000` means data is considered **fresh** for 30 seconds after fetching (more on this below).

A component reads data with `useQuery`:

```tsx
// fragment
import { useQuery } from "@tanstack/react-query";

type Product = { id: string; name: string; pricePaisa: number };

async function fetchProducts(category: string): Promise<Product[]> {
  const response = await fetch(`/api/products?category=${encodeURIComponent(category)}`);
  if (!response.ok) throw new Error(`Failed to load products (${response.status})`);
  return response.json();
}

export function ProductList({ category }: { category: string }) {
  const { data, isPending, isError, error, isFetching } = useQuery({
    queryKey: ["products", category],
    queryFn: () => fetchProducts(category),
  });

  if (isPending) return <p>Loading products…</p>;
  if (isError) return <p role="alert">{error.message}</p>;

  return (
    <>
      {isFetching && <p className="text-sm">Refreshing…</p>}
      <ul>
        {data.map((p) => (
          <li key={p.id}>{p.name}</li>
        ))}
      </ul>
    </>
  );
}
```

Walk through it:

- **`queryKey: ["products", category]`** identifies this data in the cache. It is an array, and everything the query depends on belongs in it. Two components anywhere in the app that use the same key share **one** cache entry and **one** request.
- **`queryFn`** fetches the data. It must **throw** on failure (note the `response.ok` check) so the library knows the request failed.
- **`isPending`** is true when there is no data yet; **`isError`** and **`error`** describe failure; **`data`** is the result (TypeScript knows it is defined once the pending and error cases are handled).
- **`isFetching`** is true whenever a request is in flight — including **background** refetches while old data is still shown. The UI can show a subtle "Refreshing…" instead of replacing the list with a spinner.
- When `category` changes, the key changes, so the library fetches (or reads from cache) the right data — and ignores responses for old keys, eliminating the race condition from {{ch:react-advanced}}.

Compare this with the hand-written effect in {{ch:react-advanced}}: no effect, no abort logic, no loading state variables — and caching, deduplication and retries come for free.

### Level 4 — Fresh, stale and garbage-collected

TanStack Query's caching model is worth understanding precisely:

```text
  fetch completes
        │
        ▼
   FRESH  (for staleTime)      ── reading it never triggers a request
        │
        ▼
   STALE                       ── still shown immediately, but refetched in the
        │                         background when: a component mounts with this key,
        │                         the window regains focus, the network reconnects
        ▼
   INACTIVE (no component uses it)
        │  after gcTime (default 5 minutes)
        ▼
   removed from the cache
```

- **`staleTime`** (default **0**): how long data counts as fresh. With the default, data is stale immediately, so it is refetched in the background on each new mount or window focus — while the cached copy is shown instantly. This "show cached, refresh in background" behaviour is called **stale-while-revalidate**.
- **`gcTime`** (garbage-collection time, default 5 minutes): how long **unused** data stays in memory, so navigating back to a page shows it instantly.
- Choose `staleTime` by how quickly the data really changes: product descriptions might be fresh for minutes; stock levels for seconds; a live order status might use polling (`refetchInterval`) or a WebSocket ({{ch:websockets}}).

### Level 4 — Mutations and invalidation

Changing server data uses `useMutation`. Afterwards, any cached data the change affects must be refreshed:

```tsx
// fragment
import { useMutation, useQueryClient } from "@tanstack/react-query";

type Address = { line1: string; city: string };

async function saveAddress(address: Address): Promise<Address> {
  const response = await fetch("/api/me/address", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(address),
  });
  if (!response.ok) throw new Error("Could not save the address");
  return response.json();
}

export function AddressForm({ current }: { current: Address }) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: saveAddress,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me"] });
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        mutation.mutate({ line1: String(data.get("line1")), city: String(data.get("city")) });
      }}
    >
      <label htmlFor="line1">Address</label>
      <input id="line1" name="line1" defaultValue={current.line1} required />
      <label htmlFor="city">City</label>
      <input id="city" name="city" defaultValue={current.city} required />
      <button type="submit" disabled={mutation.isPending}>{mutation.isPending ? "Saving…" : "Save"}</button>
      {mutation.isError && <p role="alert">{mutation.error.message}</p>}
    </form>
  );
}
```

- `useMutation` wraps the function that changes data and tracks its status (`isPending`, `isError`).
- `mutation.mutate(variables)` runs it.
- **`invalidateQueries({ queryKey: ["me"] })`** marks every cached query whose key **starts with** `["me"]` as stale, and refetches those currently in use. Every component showing the user's profile updates — without anyone wiring them together.
- For instant feedback, mutations can also update the cache **optimistically** before the server responds, and roll back on error (compare `useOptimistic` in {{ch:react-advanced}}).

### Level 5 — Designing query keys

Query keys deserve as much thought as database keys:

- **Hierarchical**: `["products"]`, `["products", "list", { category, sort }]`, `["products", "detail", id]`. Invalidating `["products"]` then refreshes all of them.
- **Include every input** of the query function. A missing input means two different requests share one cache entry — a real and confusing bug.
- **Centralise** them in a small "query key factory" module so the same keys are written consistently everywhere.

## Shared client state: Zustand

### Level 3 — A small, simple store

When genuinely shared client state remains — a cart before checkout, UI preferences, a multi-step flow — a small store library is often the simplest professional choice. **Zustand** is one of the most popular: minimal API, no providers needed, and selective subscriptions built in.

```tsx
// fragment
import { create } from "zustand";

type Line = { sku: string; name: string; pricePaisa: number; qty: number };

type CartStore = {
  lines: Line[];
  add: (item: Omit<Line, "qty">) => void;
  remove: (sku: string) => void;
  clear: () => void;
};

export const useCart = create<CartStore>()((set) => ({
  lines: [],
  add: (item) =>
    set((state) => {
      const existing = state.lines.find((l) => l.sku === item.sku);
      return {
        lines: existing
          ? state.lines.map((l) => (l.sku === item.sku ? { ...l, qty: l.qty + 1 } : l))
          : [...state.lines, { ...item, qty: 1 }],
      };
    }),
  remove: (sku) => set((state) => ({ lines: state.lines.filter((l) => l.sku !== sku) })),
  clear: () => set({ lines: [] }),
}));
```

Components use the store as a hook, **selecting** what they need:

```tsx
// fragment
export function CartBadge() {
  const count = useCart((s) => s.lines.reduce((n, l) => n + l.qty, 0));
  return <span aria-label={`${count} items in cart`}>{count}</span>;
}

export function AddButton({ sku, name, pricePaisa }: { sku: string; name: string; pricePaisa: number }) {
  const add = useCart((s) => s.add);
  return <button type="button" onClick={() => add({ sku, name, pricePaisa })}>Add to cart</button>;
}
```

- `create` builds the store **and** returns a hook. The store holds both **state** (`lines`) and **actions** (`add`, `remove`, `clear`).
- `set` merges the returned object into the state (a shallow merge), and expects immutable updates — exactly like the minimal store above.
- `useCart(selector)` subscribes the component to **just the selected value**. `CartBadge` re-renders only when the count changes. `AddButton` selects only the `add` function, which never changes, so it does not re-render when the cart changes at all.
- No provider is needed: the store lives in a module, like the module-level singletons in {{ch:design-patterns}}.

> [!WARNING]
> A selector that returns a **new object or array** every time — such as `useCart((s) => s.lines.filter(...))` or `useCart((s) => ({ count: ..., total: ... }))` — produces a "different" value on every check, which can cause needless re-renders or, in the worst case, an infinite update loop. Select primitive values, select stable pieces of state, or use the library's shallow-comparison helper (`useShallow` in Zustand) for objects.

Zustand also offers **middleware** such as `persist` (save to `localStorage` and restore on load — {{ch:browser-and-dom}}) and `devtools` (inspect state changes in the Redux DevTools browser extension).

## Shared client state: Redux Toolkit

### Level 3 — Redux in brief

**Redux**, released in 2015, popularised the single-store, reducer-based approach: all shared client state in **one store**, changed only by **dispatching actions** to **pure reducers** ({{ch:functional-programming}}, {{ch:react-advanced}}). It made state changes predictable and inspectable — with its DevTools you can replay every action and "time-travel" through states — at the cost of a lot of boilerplate in its original form.

**Redux Toolkit (RTK)** is the official, modern way to write Redux, and removes most of that boilerplate:

```ts
// fragment
import { configureStore, createSlice, type PayloadAction } from "@reduxjs/toolkit";

type Line = { sku: string; name: string; pricePaisa: number; qty: number };
type CartState = { lines: Line[] };

const cartSlice = createSlice({
  name: "cart",
  initialState: { lines: [] } as CartState,
  reducers: {
    added(state, action: PayloadAction<Omit<Line, "qty">>) {
      const existing = state.lines.find((l) => l.sku === action.payload.sku);
      if (existing) existing.qty += 1;                 // looks like mutation...
      else state.lines.push({ ...action.payload, qty: 1 });
    },
    removed(state, action: PayloadAction<string>) {
      state.lines = state.lines.filter((l) => l.sku !== action.payload);
    },
  },
});

export const { added, removed } = cartSlice.actions;

export const store = configureStore({
  reducer: { cart: cartSlice.reducer },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const selectCartCount = (state: RootState) => state.cart.lines.reduce((n, l) => n + l.qty, 0);
```

- **`createSlice`** defines a piece ("slice") of state with its reducers, and **generates action creators** automatically: `added(item)` returns `{ type: "cart/added", payload: item }`.
- Inside the reducers, the code **appears to mutate** state (`existing.qty += 1`, `push`). It does not really: Redux Toolkit uses the **Immer** library, which records these "mutations" on a temporary draft and produces a correct new immutable state ({{ch:functional-programming}}). This is only safe inside RTK reducers; everywhere else, update immutably.
- **`configureStore`** creates the store, combines slices, and sets up DevTools and development checks (for example, warnings if you accidentally mutate state outside reducers).
- `RootState` and `AppDispatch` are types derived from the store, so selectors and dispatch are fully typed.
- **Selectors** like `selectCartCount` are plain functions of the state, testable without React.

In components, the React Redux library provides hooks; the store is provided once at the root with `<Provider store={store}>`:

```tsx
// fragment
import { useDispatch, useSelector } from "react-redux";

export function CartBadge() {
  const count = useSelector(selectCartCount);
  return <span>{count}</span>;
}

export function RemoveButton({ sku }: { sku: string }) {
  const dispatch = useDispatch<AppDispatch>();
  return <button type="button" onClick={() => dispatch(removed(sku))}>Remove</button>;
}
```

`useSelector` subscribes the component to the selected value and re-renders it only when that value changes — the same selector mechanism as the minimal store.

Redux Toolkit also includes **RTK Query**, a server-state cache comparable to TanStack Query, for teams that want both in one toolkit.

### Level 5 — Zustand or Redux Toolkit?

| | Zustand | Redux Toolkit |
|---|---|---|
| Size of API | Very small | Larger, more concepts (slices, actions, middleware) |
| Structure | Free-form; you decide | Opinionated: actions, reducers, single store |
| Boilerplate | Minimal | Moderate (much less than classic Redux) |
| DevTools, time travel | Via middleware | Built in |
| Server state | Use TanStack Query alongside | RTK Query included |
| Typical fit | Small and medium apps; focused stores | Large apps and teams wanting strict, uniform patterns; existing Redux codebases |

Both are sound professional choices. Many existing applications use Redux, so you will need to read it; many new applications prefer Zustand for its simplicity. Others, such as Jotai (atom-based) and MobX (observable-based), take different approaches. What matters most is using **any** of them only for state that genuinely is shared client state.

## URL state

### Level 3 — State that belongs in the address

Some state should live in the **URL**:

- Search terms, filters, sort order, the current page of results.
- The selected tab or the open item in a list.
- Anything a user might want to **bookmark**, **share**, **refresh** or reach with the **Back** button.

Keeping this state in React state alone means a refresh loses it and a shared link shows something different. Keeping it in the URL gives all of those behaviours for free, and makes the URL the **single source of truth** for that state.

The mechanism is the History API and `URLSearchParams` you learned in {{ch:browser-and-dom}}. Routers and frameworks wrap it in hooks — for example, React Router's `useSearchParams`, or Next.js's `useSearchParams` and `useRouter` ({{ch:nextjs}}). The pattern:

```tsx
// fragment
import { useSearchParams } from "react-router";

export function ProductFilters() {
  const [params, setParams] = useSearchParams();
  const sort = params.get("sort") ?? "popular";
  const inStock = params.get("stock") === "1";

  function update(name: string, value: string | null) {
    const next = new URLSearchParams(params);
    if (value === null) next.delete(name);
    else next.set(name, value);
    next.delete("page"); // filters changed: go back to page 1
    setParams(next, { replace: true });
  }

  return (
    <>
      <label htmlFor="sort">Sort by</label>
      <select id="sort" value={sort} onChange={(e) => update("sort", e.target.value)}>
        <option value="popular">Most popular</option>
        <option value="price-asc">Price: low to high</option>
      </select>
      <label>
        <input type="checkbox" checked={inStock} onChange={(e) => update("stock", e.target.checked ? "1" : null)} />
        In stock only
      </label>
    </>
  );
}
```

- The current filters are **read from the URL** on every render — there is no separate `useState`.
- Changing a filter writes a new URL; the router re-renders, and the components reading the URL update. `replace: true` avoids filling the history with every small change.
- Data fetching then uses the URL values in its query key (`["products", { sort, inStock }]`), so the list follows the address automatically.
- Values from the URL are **user input**: anyone can type `?sort=anything`. Validate and default them.

## Structuring state well

### Level 4 — Keep it minimal and derived

The principles from {{ch:react-basics}} apply at every scale: store the **minimum**, derive the rest. A store should contain the cart's lines, not the cart's total; the selected product id, not a copy of the selected product.

### Level 4 — Normalise relational data

Suppose orders contain customers and products, and you store them nested:

```ts
// fragment
// Nested: the same customer and product objects copied into many places
type OrdersNested = {
  id: string;
  customer: { id: string; name: string };
  lines: { product: { id: string; name: string; pricePaisa: number }; qty: number }[];
}[];
```

When a product's name changes, every copy must be found and updated. Instead, **normalise**: store each entity once, by id, and refer to it by id — the same principle as database normalisation ({{ch:normalization}}):

```ts
// fragment
type Normalised = {
  products: Record<string, { id: string; name: string; pricePaisa: number }>;
  customers: Record<string, { id: string; name: string }>;
  orders: Record<string, { id: string; customerId: string; lines: { productId: string; qty: number }[] }>;
};
```

Now there is exactly one place for each product's name; orders refer to it. Selectors join the pieces when a component needs them. Redux Toolkit includes `createEntityAdapter` to manage normalised collections. (Server-state caches usually keep data in the shape the API returns, keyed by query — another reason to design APIs with this in mind.)

### Level 4 — Memoised selectors

Selectors that **compute** derived data — a filtered list, a joined view — create new arrays every time they run. Combined with subscriptions, that would re-render components needlessly. **Memoised selectors** cache their result until their inputs change:

```ts
type Product = { id: string; name: string; category: string };
type State = { products: Product[]; selectedCategory: string; cartOpen: boolean };

function createSelector<S, A, B, R>(inputA: (s: S) => A, inputB: (s: S) => B, combine: (a: A, b: B) => R) {
  let lastA: A | undefined;
  let lastB: B | undefined;
  let lastResult: R | undefined;
  let calls = 0;
  const selector = (state: S): R => {
    const a = inputA(state);
    const b = inputB(state);
    if (calls > 0 && Object.is(a, lastA) && Object.is(b, lastB)) return lastResult as R;
    calls++;
    lastA = a;
    lastB = b;
    lastResult = combine(a, b);
    return lastResult;
  };
  return Object.assign(selector, { recomputations: () => calls });
}

const selectVisibleProducts = createSelector(
  (s: State) => s.products,
  (s: State) => s.selectedCategory,
  (products, category) => products.filter((p) => p.category === category),
);

let state: State = {
  products: [
    { id: "1", name: "Sindhri", category: "mango" },
    { id: "2", name: "Lychee", category: "other" },
    { id: "3", name: "Chaunsa", category: "mango" },
  ],
  selectedCategory: "mango",
  cartOpen: false,
};

const first = selectVisibleProducts(state);
state = { ...state, cartOpen: true };              // unrelated change
const second = selectVisibleProducts(state);
state = { ...state, selectedCategory: "other" };   // relevant change
const third = selectVisibleProducts(state);

console.log(first.map((p) => p.name), first === second, third.map((p) => p.name));
console.log(`recomputed ${selectVisibleProducts.recomputations()} times`);
```

**Output:**

```text
[ 'Sindhri', 'Chaunsa' ] true [ 'Lychee' ]
recomputed 2 times
```

- The selector recomputes only when `products` or `selectedCategory` changes. Opening the cart returned the **same array** (`first === second`), so any component subscribed to it would not re-render.
- This works because state is updated immutably: unchanged parts keep their references, so a cheap `Object.is` check tells whether an input changed.
- Redux Toolkit includes `createSelector` (from the Reselect library), which works this way with any number of inputs. The React Compiler and `useMemo` serve a similar purpose inside components ({{ch:react-advanced}}).

## Persisting and synchronising state

- **Persist** client state that should survive a reload — the cart for guests, preferences — to `localStorage` (Zustand's `persist` middleware, or a custom hook as in {{ch:react-advanced}}). Version the stored shape and handle old or corrupted data. Never persist secrets ({{ch:browser-and-dom}}).
- **For logged-in users**, important state such as the cart is usually stored on the **server**, so it follows them across devices; it then becomes server state.
- **Multiple tabs**: the browser's `storage` event and the `BroadcastChannel` API let tabs of the same site notify each other, so a cart updated in one tab can update in another.

## From beginner to enterprise

**Level 3 — small apps.** Local state and lifting; context for the user and theme; fetch with care, or start with TanStack Query early.

**Level 4 — a real application.** TanStack Query (or the framework's loaders) for **all** server data; URL state for filters and pagination; one small store (Zustand or Redux Toolkit) only for truly shared client state; selectors; persistence where it helps users.

**Level 5 — professional practice.** Query key factories; agreed `staleTime` per kind of data; mutations that invalidate precisely; normalised client state; DevTools for both the query cache and the store; state logic tested as plain functions ({{ch:testing}}).

**Level 6 — large applications.** Server-first architectures where most data is loaded on the server and streamed to the client ({{ch:nextjs}}), leaving little client state; real-time updates pushed into caches through WebSockets or server-sent events ({{ch:websockets}}); offline support with local databases that synchronise later; multiple teams owning separate stores or micro-frontends with clear contracts.

## Real-world use cases

### Migrating away from a "store everything" Redux app

- **Situation:** an older app keeps products, orders, user, UI flags and form values all in Redux, with hand-written loading flags and thunks for every API call. Pages show stale data after edits; the codebase has thousands of lines of fetch boilerplate.
- **Approach:** move server data, query by query, to RTK Query or TanStack Query with mutations that invalidate; move filters to the URL; move form values into form state ({{ch:forms}}). What remains in Redux is a few slices of genuine client state.
- **Result:** much less code, fewer stale-data bugs, faster navigation thanks to caching.

### A dashboard that must stay fresh

- **Requirement:** an operations dashboard shows live order counts and rider positions.
- **Approach:** order counts with TanStack Query and a `refetchInterval` of 15 seconds and short `staleTime`; rider positions pushed by WebSocket and written into the query cache with `setQueryData`; UI-only preferences in a small Zustand store persisted locally.
- **Trade-offs:** polling is simple but costs requests; pushing is efficient but needs connection management ({{ch:websockets}}).

## Common mistakes

### Beginner: everything in global state

Form inputs, a dropdown's open flag, and API data in one global store. **Consequence:** every keystroke updates the store; components are coupled; caching is hand-written badly. **Fix:** keep state as local as possible; server data in a query cache.

### Beginner: copying server data into local state

`const [products, setProducts] = useState(data)` after a query — the copy stops updating. **Fix:** read from the query directly; derive.

### Intermediate: missing query key inputs

`queryKey: ["products"]` while the function also uses `category`. **Consequence:** different categories share one cache entry and show each other's data. **Fix:** every input in the key.

### Intermediate: forgetting invalidation

After saving, the old data stays on screen until a refresh. **Fix:** invalidate (or update) the affected queries on success.

### Intermediate: selectors creating new objects

`useStore((s) => ({ a: s.a, b: s.b }))` re-renders constantly. **Fix:** select primitives separately, use shallow comparison, or memoised selectors.

### Production: filters only in memory

Users cannot share or bookmark filtered results; Back does not work as expected. **Fix:** URL state.

### Enterprise: denormalised duplicates

The same product stored in three slices with slightly different data. **Fix:** normalise; one source of truth per entity.

## Debugging and troubleshooting

- **TanStack Query DevTools** (a small panel you add in development) shows every query key, its data, whether it is fresh, stale, fetching or inactive, and lets you refetch or invalidate manually. Most "why is this data old?" questions are answered there.
- **Redux DevTools** (browser extension) shows every action, the state before and after, and lets you step back through history. It also works with Zustand's `devtools` middleware.
- **The data does not update after a change:** missing invalidation, or a query key that does not match the invalidated prefix.
- **Too many requests:** `staleTime` of 0 with many mounts and window-focus refetches; set an appropriate `staleTime`, or turn off focus refetching for data that rarely changes.
- **A component re-renders on unrelated changes:** it selects too much, or its selector returns a new object each time; check with the React Profiler ({{ch:react-advanced}}).
- **State resets on refresh:** it lives only in memory; decide whether it belongs in the URL, persistent storage or the server.

## Security and performance

**Security.** Everything in client state — stores, caches, `localStorage`, the URL — is visible to and modifiable by the user. Never trust it for decisions the server must make (prices, permissions, roles); the server re-checks everything ({{ch:validation}}). Do not put secrets or long-lived tokens in client stores or persistent storage ({{ch:frontend-authentication}}). Be careful what goes into URLs: they are stored in history, logs and analytics, so never put personal or sensitive data there. When a user logs out, **clear** cached server data (`queryClient.clear()`) and client stores, so the next person on a shared computer cannot see it.

**Performance.** Subscribe narrowly with selectors; split state by how often it changes; cache server data with sensible `staleTime`; normalise to avoid duplicated work; memoise derived selectors; keep fast-changing state local.

## How a senior engineer thinks about this

- **Classify before choosing.** Server, URL, form, local or shared client state — each has a natural home, and most "state management" problems disappear once data is in the right one.
- **Server state is a cache.** They think about freshness, invalidation and consistency explicitly, rather than pretending client copies are the truth.
- **The URL is underused.** Anything a user might share or come back to belongs there.
- **Global state is a cost.** Every piece in a global store couples distant components; they keep stores small and focused.
- **Boring and consistent beats clever.** One agreed approach per kind of state across the codebase, documented and enforced in review.

## Exercises

### Exercise 1 — Classify the state

**Objective:** practise choosing the right home for each piece of state.
**What to do:** for an online pharmacy, classify each item and say where it should live: (1) the list of medicines in a category; (2) the text typed in the search box; (3) the selected sort order; (4) whether the mobile menu is open; (5) the guest user's cart; (6) the logged-in user's profile; (7) the current page of search results; (8) the values in a half-completed prescription upload form; (9) dark mode preference.

<details>
<summary>Show the solution</summary>

1. **Server state** — query cache, keyed by category (and sort/filter inputs).
2. **Local state** in the search box component (debounced before it affects anything else); the **submitted** search term goes in the **URL**.
3. **URL state** — shareable and survives refresh.
4. **Local state** in the header component.
5. **Shared client state** in a small store, **persisted** to `localStorage` so it survives a reload; merged into the server cart at login.
6. **Server state** — a `["me"]` query, invalidated after profile edits.
7. **URL state** (`?page=3`), used in the results query key.
8. **Form state** — the form or a form library ({{ch:forms}}), possibly saved as a draft locally.
9. **Persistent client state** — `localStorage` (or a cookie, if the server must render the right theme first) with a small context or store providing it.

**Lesson:** of nine items, only one truly needs a shared client store.

</details>

### Exercise 2 — Fix the query key

**Objective:** practise query-key design.
**Starting point:**

```tsx
// fragment
function Orders({ status, page }: { status: string; page: number }) {
  const { data } = useQuery({
    queryKey: ["orders"],
    queryFn: () => fetchOrders({ status, page }),
  });
  // ...
}
```

Users report that switching between "Pending" and "Delivered" shows the wrong orders for a moment, and sometimes does not change at all. After cancelling an order, the list is not updated. Explain and fix.

<details>
<summary>Show the solution</summary>

**Cause:** the key `["orders"]` does not include `status` or `page`, so every combination shares **one** cache entry. Switching status reads the cached data for the previous status; whether it refetches depends on staleness — hence "sometimes does not change". And nothing invalidates the list after a cancellation.

```tsx
// fragment
export const orderKeys = {
  all: ["orders"] as const,
  list: (status: string, page: number) => ["orders", "list", { status, page }] as const,
  detail: (id: string) => ["orders", "detail", id] as const,
};

function Orders({ status, page }: { status: string; page: number }) {
  const { data } = useQuery({
    queryKey: orderKeys.list(status, page),
    queryFn: () => fetchOrders({ status, page }),
  });
  // ...
}

function useCancelOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: cancelOrder,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: orderKeys.all }),
  });
}
```

**Walkthrough:** each status and page combination now has its own cache entry; switching shows the right cached data instantly (or a loading state). A **key factory** keeps keys consistent. Invalidating the `["orders"]` prefix refreshes every list and detail after a cancellation. (For smoother paging, TanStack Query can keep the previous page's data on screen while the next loads.)

</details>

### Exercise 3 — Build a selector-friendly store

**Objective:** practise stores and selective subscriptions.
**What to build:** using the `createStore` and `watch` functions from this chapter, model a notifications store with `items: { id: string; read: boolean }[]` and an action to mark one item as read. Show that a "unread count" watcher fires only when the count changes — not when an already-read item is marked read again.

<details>
<summary>Show the solution</summary>

```ts
type Listener = () => void;
function createStore<S>(initial: S) {
  let state = initial;
  const listeners = new Set<Listener>();
  return {
    getState: () => state,
    setState(update: (current: S) => S) {
      const next = update(state);
      if (Object.is(next, state)) return;
      state = next;
      for (const l of listeners) l();
    },
    subscribe(l: Listener) {
      listeners.add(l);
      return () => listeners.delete(l);
    },
  };
}
function watch<S, T>(store: ReturnType<typeof createStore<S>>, select: (s: S) => T, onChange: (v: T) => void) {
  let previous = select(store.getState());
  return store.subscribe(() => {
    const next = select(store.getState());
    if (!Object.is(next, previous)) {
      previous = next;
      onChange(next);
    }
  });
}

type Notification = { id: string; read: boolean };
const notifications = createStore<{ items: Notification[] }>({
  items: [
    { id: "a", read: false },
    { id: "b", read: false },
  ],
});

function markRead(id: string): void {
  notifications.setState((s) => {
    const target = s.items.find((n) => n.id === id);
    if (!target || target.read) return s; // nothing to change: keep the same state object
    return { items: s.items.map((n) => (n.id === id ? { ...n, read: true } : n)) };
  });
}

watch(notifications, (s) => s.items.filter((n) => !n.read).length, (count) => console.log(`unread: ${count}`));

markRead("a");
markRead("a"); // already read: no notification
markRead("b");
```

**Output:**

```text
unread: 1
unread: 0
```

**Walkthrough:** `markRead` returns the **same** state object when nothing changes, so the store notifies nobody — an important habit that avoids pointless re-renders. The watcher selects a **number** (a primitive), so `Object.is` compares values reliably. If the selector returned the filtered **array** instead, it would be a new array every time and the watcher would fire on every change — the selector pitfall from this chapter.

</details>

### Exercise 4 — Production scenario: stale prices

**Objective:** practise reasoning about server state and freshness.
**The scenario:** a flash sale changes prices every hour. Customers report that the product page sometimes shows the old price, and then checkout charges the new one. Prices are fetched with TanStack Query using `staleTime: 30 * 60 * 1000` (30 minutes). What is going on, what would you change, and what must the server do regardless?

<details>
<summary>Show the solution</summary>

**What happens:** with a 30-minute `staleTime`, a product page opened just before a price change keeps showing the cached price for up to 30 minutes without refetching. Checkout calculates the price on the server (correctly), so the customer sees a difference.

**Changes:**
1. **Shorter `staleTime` for prices** — for example 30–60 seconds — while product descriptions and images can keep a long `staleTime`. If prices and descriptions come from the same endpoint, consider splitting them, or giving the product query a short `staleTime`.
2. **Refetch at the moment it matters**: when the customer opens the cart or checkout, fetch fresh prices (`refetchOnMount: "always"` for the checkout summary, or a dedicated "quote" request).
3. **Push changes** if prices change often during sales: a server event or WebSocket message that invalidates the affected product queries ({{ch:websockets}}).
4. **Tell the user** when the price changed: "The price of this item changed from Rs 2,600 to Rs 2,200" at checkout, rather than silently charging a different amount.

**What the server must do regardless:** always calculate the price at checkout from its own data — never trust a price sent by the client ({{ch:validation}}) — and ideally honour a short-lived **quote** shown to the customer, or show the change clearly before payment. Client caching can reduce surprises; only the server can guarantee correctness.

</details>

## Summary

State management is about giving each kind of changing data the right home. **Local state** stays in components; **URL state** — searches, filters, pages — lives in the address so it can be shared and survives refresh; **form state** stays with forms; **server state** is a **cache** of data owned elsewhere; and only genuinely **shared client state** belongs in a store.

A **store** holds state, updates it immutably, and notifies subscribers; **selectors** let each component subscribe to just the data it needs, which is what keeps large applications fast. **TanStack Query** manages server state with **query keys**, caching, **stale-while-revalidate** refetching, retries, **mutations** and **invalidation** — replacing most hand-written fetching and "global state" code. **Zustand** offers a minimal store with selective subscriptions; **Redux Toolkit** offers a structured single store with slices, Immer-powered reducers, DevTools and RTK Query.

Keep state minimal and derived, **normalise** relational data, **memoise** computed selectors, persist only what helps users (and never secrets), clear caches on logout, and remember that the server must re-check everything the client sends.

## Key terms

- **State management** — The decisions and tools that determine where changing application data lives and how the UI stays consistent with it.
- **Local state** — State owned and used by one component or a small part of the component tree.
- **Shared client state** — State created by the browser application and used by many distant components.
- **Server state** — Data owned by a server, of which the client holds a cached and possibly outdated copy.
- **URL state** — State encoded in the address, such as search terms, filters and page numbers.
- **Store** — An object outside the component tree that holds state, applies updates and notifies subscribers.
- **Selector** — A function that extracts a particular piece of data or a derived value from state.
- **Memoised selector** — A selector that caches its result and recomputes only when its inputs change.
- **useSyncExternalStore** — A React hook for subscribing components safely to an external store.
- **TanStack Query** — A library that fetches, caches, deduplicates and refreshes server data in React applications.
- **Query key** — The identifier of a cached query, including every input the query depends on.
- **staleTime** — In TanStack Query, how long fetched data is considered fresh before it may be refetched.
- **gcTime** — In TanStack Query, how long unused cached data is kept before it is removed.
- **Stale-while-revalidate** — Showing cached data immediately while fetching a fresh copy in the background.
- **Mutation** — An operation that changes data on the server, such as creating or updating a record.
- **Cache invalidation** — Marking cached data as out of date so that it is fetched again.
- **Zustand** — A small React state-management library built around hooks and selective subscriptions.
- **Redux** — A state-management pattern and library based on a single store, dispatched actions and pure reducers.
- **Redux Toolkit** — The official modern toolset for writing Redux with less code.
- **Slice** — In Redux Toolkit, a piece of state together with its reducers and generated actions.
- **Immer** — A library that lets code written as mutations produce new immutable state.
- **Normalisation (state)** — Storing each entity once by id and referring to it by id elsewhere.
- **Persistent state** — Client state saved in the browser so that it survives a page reload.

## What comes next

Forms are where users give your application the information it needs — and where state, validation, accessibility and server communication all meet. The next chapter, {{ch:forms}}, builds on everything so far: controlled and uncontrolled fields, validation on the client and the server with a shared schema, error messages that help, multi-step flows, file inputs, and the libraries professionals use to keep large forms fast and maintainable.
