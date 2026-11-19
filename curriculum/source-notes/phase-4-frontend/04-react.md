# Phase 4 — Chapter 4: React

---

## Chapter Overview

React is the dominant UI library for building component-based user interfaces. As of 2025, React 19 introduces Server Components, Actions, and `use()` hook as stable APIs. Understanding React deeply is essential for any full-stack engineer.

**Core topics:**
- JSX, components, props, state
- Hooks: useState, useEffect, useRef, useMemo, useCallback, useContext
- React 19: Server Components, Actions, `use()`, `useOptimistic`
- Performance: memoization, lazy loading, virtualization
- Component composition patterns
- Error boundaries

---

## Beginner Theory

### Mental Model

```
React = UI = f(state)
  Your UI is a pure function of state.
  When state changes, React re-renders (re-calls the function).
  React diffs the new virtual DOM against the old one and updates only what changed.

Component lifecycle:
  Mount   → function called first time, effects run
  Update  → state/props change → function called again → effects with changed deps run
  Unmount → cleanup functions from effects run
```

---

## Basic Examples

### Components and Props

```jsx
// Functional component (always use functional, not class)
function UserCard({ user, onDelete }) {
  return (
    <article className="card">
      <img src={user.avatar} alt={`${user.name}'s avatar`} />
      <div>
        <h2>{user.name}</h2>
        <p>{user.email}</p>
        <span className={`badge badge-${user.role}`}>{user.role}</span>
      </div>
      <button onClick={() => onDelete(user.id)}>Remove</button>
    </article>
  );
}

// Prop types (use TypeScript instead for production)
import PropTypes from "prop-types";
UserCard.propTypes = {
  user: PropTypes.shape({
    id:     PropTypes.string.isRequired,
    name:   PropTypes.string.isRequired,
    email:  PropTypes.string.isRequired,
    role:   PropTypes.string.isRequired,
    avatar: PropTypes.string
  }).isRequired,
  onDelete: PropTypes.func.isRequired
};

// Children prop
function Card({ title, children, className = "" }) {
  return (
    <div className={`card ${className}`}>
      {title && <h3 className="card-title">{title}</h3>}
      <div className="card-body">{children}</div>
    </div>
  );
}

// Usage with children
<Card title="User Profile">
  <UserCard user={user} onDelete={handleDelete} />
</Card>
```

### Hooks: useState, useEffect

```jsx
import { useState, useEffect, useRef } from "react";

function UserList() {
  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [search,  setSearch]  = useState("");

  // Fetch users on mount
  useEffect(() => {
    let cancelled = false;  // cleanup flag for async effects

    async function fetchUsers() {
      try {
        setLoading(true);
        const res  = await fetch(`/api/users?q=${encodeURIComponent(search)}`);
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        if (!cancelled) setUsers(data.users);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchUsers();

    return () => { cancelled = true; };  // cleanup — cancel on unmount or deps change
  }, [search]);  // re-run when search changes

  if (loading) return <div className="loading-spinner" />;
  if (error)   return <div className="error">Error: {error}</div>;

  return (
    <div>
      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search users..."
      />
      <ul>
        {users.map(user => (
          <li key={user.id}>
            <UserCard user={user} onDelete={handleDelete} />
          </li>
        ))}
      </ul>
      {users.length === 0 && <p>No users found.</p>}
    </div>
  );
}
```

---

## Intermediate Concepts

### Custom Hooks

```jsx
// Extract reusable logic into custom hooks
// Naming: always start with "use"

function useFetch(url, options) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(url, options)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data  => { if (!cancelled) { setData(data);    setLoading(false); } })
      .catch(err  => { if (!cancelled) { setError(err);    setLoading(false); } });

    return () => { cancelled = true; };
  }, [url]);

  return { data, loading, error };
}

// useLocalStorage
function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const set = useCallback((newValue) => {
    const resolved = typeof newValue === "function" ? newValue(value) : newValue;
    setValue(resolved);
    localStorage.setItem(key, JSON.stringify(resolved));
  }, [key, value]);

  return [value, set];
}

// useDebounce
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

// Usage
function SearchPage() {
  const [query, setQuery] = useState("");
  const debouncedQuery    = useDebounce(query, 300);
  const { data, loading } = useFetch(`/api/search?q=${debouncedQuery}`);

  return (
    <>
      <input value={query} onChange={e => setQuery(e.target.value)} />
      {loading && <Spinner />}
      <Results data={data} />
    </>
  );
}
```

### useReducer — Complex State

```jsx
import { useReducer } from "react";

const initialState = {
  cart:     [],
  total:    0,
  isOpen:   false
};

function cartReducer(state, action) {
  switch (action.type) {
    case "ADD_ITEM": {
      const exists = state.cart.find(item => item.id === action.product.id);
      const cart   = exists
        ? state.cart.map(item =>
            item.id === action.product.id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          )
        : [...state.cart, { ...action.product, quantity: 1 }];
      return { ...state, cart, total: cart.reduce((t, i) => t + i.price * i.quantity, 0) };
    }
    case "REMOVE_ITEM":
      const cart = state.cart.filter(item => item.id !== action.id);
      return { ...state, cart, total: cart.reduce((t, i) => t + i.price * i.quantity, 0) };
    case "TOGGLE_CART":
      return { ...state, isOpen: !state.isOpen };
    case "CLEAR":
      return initialState;
    default:
      return state;
  }
}

function ShoppingCart() {
  const [state, dispatch] = useReducer(cartReducer, initialState);

  return (
    <div>
      <button onClick={() => dispatch({ type: "TOGGLE_CART" })}>
        Cart ({state.cart.length})
      </button>
      {state.isOpen && (
        <div>
          {state.cart.map(item => (
            <div key={item.id}>
              {item.name} × {item.quantity}
              <button onClick={() => dispatch({ type: "REMOVE_ITEM", id: item.id })}>
                Remove
              </button>
            </div>
          ))}
          <strong>Total: ${state.total.toFixed(2)}</strong>
          <button onClick={() => dispatch({ type: "CLEAR" })}>Clear Cart</button>
        </div>
      )}
    </div>
  );
}
```

### Context API

```jsx
import { createContext, useContext, useReducer } from "react";

// Create context
const AuthContext  = createContext(null);
const CartContext  = createContext(null);

// Auth provider
function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  async function login(credentials) {
    const data = await authService.login(credentials);
    setUser(data.user);
    localStorage.setItem("token", data.token);
  }

  function logout() {
    setUser(null);
    localStorage.removeItem("token");
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook for using context
function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}

// Usage in component
function ProfileButton() {
  const { user, logout } = useAuth();
  if (!user) return <a href="/login">Sign in</a>;
  return (
    <div>
      <span>{user.name}</span>
      <button onClick={logout}>Sign out</button>
    </div>
  );
}

// App root
function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Home />} />
          </Routes>
        </Router>
      </CartProvider>
    </AuthProvider>
  );
}
```

### Performance Optimization

```jsx
import { memo, useMemo, useCallback, lazy, Suspense, startTransition } from "react";

// memo — skip re-render if props didn't change
const UserCard = memo(function UserCard({ user, onDelete }) {
  return (...);
});

// useMemo — memoize expensive computation
function UserList({ users, searchQuery }) {
  const filteredUsers = useMemo(
    () => users.filter(u =>
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
    ),
    [users, searchQuery]  // recompute only when these change
  );

  // ...
}

// useCallback — stable function reference (needed for memo children)
function Parent() {
  const [count, setCount] = useState(0);

  const handleDelete = useCallback((id) => {
    setUsers(prev => prev.filter(u => u.id !== id));
  }, []);  // stable — doesn't change on re-renders

  return <UserCard onDelete={handleDelete} />;  // won't re-render because of handleDelete
}

// lazy — code split component, load only when needed
const AdminDashboard = lazy(() => import("./AdminDashboard"));

function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AdminDashboard />
    </Suspense>
  );
}

// startTransition — mark updates as non-urgent (don't block input)
function SearchInput() {
  const [input,  setInput]  = useState("");
  const [search, setSearch] = useState("");

  function handleChange(e) {
    setInput(e.target.value);
    startTransition(() => {
      setSearch(e.target.value);  // defer expensive search update
    });
  }

  return <input value={input} onChange={handleChange} />;
}
```

---

## Advanced Concepts

### React 19 — Server Components & Actions

```jsx
// Server Component (no "use client" — runs on server, no hooks/events)
// app/users/page.tsx (Next.js App Router)
async function UsersPage() {
  // Direct database call — no API route needed
  const users = await prisma.user.findMany({ select: { id: true, name: true } });

  return (
    <main>
      <h1>Users</h1>
      <UserList users={users} />
      <CreateUserForm />  {/* Client Component */}
    </main>
  );
}

// Client Component
"use client";
function CreateUserForm() {
  // Server Action (runs on server when form is submitted)
  async function createUser(formData) {
    "use server";
    const name  = formData.get("name");
    const email = formData.get("email");
    await prisma.user.create({ data: { name, email } });
    revalidatePath("/users");  // refresh the page
  }

  return (
    <form action={createUser}>
      <input name="name"  placeholder="Name" required />
      <input name="email" type="email" placeholder="Email" required />
      <button type="submit">Add User</button>
    </form>
  );
}

// useOptimistic — optimistic UI updates
function TodoList({ todos }) {
  const [optimisticTodos, addOptimisticTodo] = useOptimistic(
    todos,
    (state, newTodo) => [...state, { ...newTodo, pending: true }]
  );

  async function addTodo(formData) {
    "use server";
    const text = formData.get("text");
    addOptimisticTodo({ id: Date.now(), text });
    await todoService.create(text);
    revalidatePath("/todos");
  }

  return (
    <ul>
      {optimisticTodos.map(todo => (
        <li key={todo.id} className={todo.pending ? "opacity-50" : ""}>
          {todo.text}
        </li>
      ))}
    </ul>
  );
}
```

---

## Interview Preparation

**Q1: What is the difference between `useMemo` and `useCallback`?**
A: `useMemo` memoizes the RESULT of calling a function — it caches the computed value and only recomputes when dependencies change. Use for expensive calculations. `useCallback` memoizes the FUNCTION ITSELF — it returns a stable function reference that only changes when dependencies change. Use when passing callbacks to memoized child components (with `React.memo`) to prevent unnecessary re-renders. Without `useCallback`, a new function reference is created on every render, causing `memo()` children to re-render because the prop technically changed.

**Q2: How does React's reconciliation (diffing) algorithm work?**
A: React maintains a virtual DOM (a JavaScript tree of element objects). When state changes, React calls the component function again to get the new virtual DOM tree, then diffs it against the previous tree. The diffing has two rules: elements of different types produce entirely different trees (no reuse). Elements of the same type at the same position are updated (attributes changed, children diffed). The `key` prop helps React match list items across renders — without keys, React may reuse the wrong DOM nodes when items are reordered.

**Q3: What is the difference between Server Components and Client Components in React 19?**
A: Server Components render on the server and return HTML — they can access databases, files, secrets directly (no API needed). They have zero JavaScript bundle impact. They cannot use hooks, event handlers, or browser APIs. Client Components (`"use client"` directive) are traditional React components that run in the browser with full interactivity. They can use hooks, handle events, access browser APIs. You can nest Client Components inside Server Components but not vice versa. The pattern: Server Components for data fetching and layout, Client Components for interactivity.

### Deep Dive Answers (3+ Years Experience)

**Q4: How do you optimize React application performance?**

**What they're testing:** Can you diagnose and fix real frontend performance issues?

**Deep Answer:**

**Step 1 — Measure first (never guess):**
- React DevTools Profiler: which components re-render and how long?
- Lighthouse: Core Web Vitals (LCP, INP, CLS)
- Bundle analyzer (`@next/bundle-analyzer`): what's bloating JS?

**Step 2 — Common fixes by symptom:**

| Symptom | Cause | Fix |
|---------|-------|-----|
| Slow initial load | Large JS bundle | Code splitting, lazy routes, tree-shake imports |
| Typing lag in form | Re-render whole tree on each keystroke | React Hook Form (uncontrolled), debounce |
| Slow list scroll | 10,000 DOM nodes | Virtualization (`react-window`) |
| Unnecessary child re-renders | New function/object props each render | `useCallback`, `useMemo`, `React.memo` |
| Slow data fetch | Waterfall requests | Parallel fetch, React Query cache, prefetch |
| Layout shift | Images without dimensions | `width`/`height`, skeleton loaders |

**Step 3 — Architecture:**
- Colocate state close to where it's used (don't put everything in global context)
- Server Components (Next.js) for data-heavy pages — zero client JS for static parts
- Memoize expensive selectors in Redux/Zustand

**Interview story:** "Product listing re-rendered 200 cards on every filter keystroke. Moved filter state to URL params, debounced input 300ms, wrapped card in React.memo, used useMemo for filtered list. Input latency went from 200ms to imperceptible."

---

**Q5: Explain state management choices — useState vs Context vs Redux vs React Query.**

**Deep Answer:**

**useState/useReducer:** Local component state. Use for: form inputs, toggles, UI state. Don't lift state until two siblings need it.

**Context:** Share state across subtree without prop drilling. Use for: theme, auth user, locale. **Don't** put frequently-changing values (cart with 50 updates/sec) — causes entire subtree re-render.

**Redux/Zustand:** Global client state with predictable updates. Use for: complex shared state (shopping cart, multi-step wizard), time-travel debugging needs, many components reading same state. Zustand is simpler for most 3 YOE projects.

**React Query (TanStack Query):** Server state — data from API. Handles caching, refetching, stale-while-revalidate, loading/error states. **This is not interchangeable with Redux** — most apps need both: React Query for server data, minimal client state for UI.

**Decision tree for interview:**
- "Is it from the API?" → React Query
- "Is it UI-only and local?" → useState
- "Do many distant components need it and it changes rarely?" → Context
- "Is it complex client state with many actions?" → Zustand/Redux

---

**Q6: How do you test React components effectively?**

**Deep Answer:**

**Testing Library philosophy:** Test behavior users see, not implementation details. Don't test state directly — test what appears on screen.

```javascript
// Good — tests user behavior
test('shows error when email is invalid', async () => {
  render(<LoginForm />);
  await userEvent.type(screen.getByLabelText(/email/i), 'not-an-email');
  await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
  expect(await screen.findByText(/valid email/i)).toBeInTheDocument();
});

// Bad — tests implementation
expect(component.state.emailError).toBe(true);
```

**What to test at 3 YOE:**
- User flows: login, checkout, form validation
- Edge cases: empty states, error states, loading spinners
- Accessibility: roles, labels (also helps tests find elements)

**Mock API calls** with MSW (Mock Service Worker) — intercepts at network level, works with React Query.

**Don't over-test:** Style details, third-party libraries, simple presentational components with no logic.

---

## Practical Tasks

### Beginner (10 Tasks)
1. Create a functional component with props and render it.
2. Implement `useState` for a counter with increment/decrement.
3. Fetch data with `useEffect` and display a loading/error state.
4. Build a controlled form input with `useState`.
5. Map over an array and render a list with keys.
6. Implement conditional rendering with `&&` and ternary.
7. Build a toggle component (show/hide content).
8. Pass a callback prop from parent to child.
9. Lift state up from two sibling components.
10. Build a to-do list (add, toggle, delete items).

### Intermediate (10 Tasks)
1. Extract a `useFetch` custom hook.
2. Build a `useDebounce` hook for a search input.
3. Implement `useReducer` for a shopping cart.
4. Create a Context + Provider for authentication state.
5. Use `React.memo` and `useCallback` to prevent unnecessary re-renders.
6. Use `useMemo` to memoize an expensive filter/sort operation.
7. Implement code splitting with `React.lazy` and `Suspense`.
8. Build an Error Boundary class component.
9. Implement infinite scroll with `useIntersectionObserver`.
10. Build a reusable modal component with a portal.

### Advanced (10 Tasks)
1. Implement a React 19 Server Component that fetches from DB.
2. Build a Server Action for form submission.
3. Implement `useOptimistic` for optimistic UI updates.
4. Build a virtualized list with `react-window` for 10K items.
5. Implement a comprehensive design system as React components.
6. Build a drag-and-drop list with `@dnd-kit/core`.
7. Implement real-time updates with WebSocket and React state.
8. Build a complex form with `react-hook-form` and Zod.
9. Write unit and integration tests with React Testing Library.
10. Optimize a component tree — identify and fix all re-render issues.

---

## Self Assessment
1. What is JSX?
2. What is the difference between `useState` and `useRef`?
3. What is the purpose of the `key` prop in lists?
4. What does `useEffect` cleanup function do?
5. What is a custom hook?
6. What is `React.memo`?
7. What is the difference between `useMemo` and `useCallback`?
8. What is Context used for?
9. What is the `"use client"` directive?
10. What is reconciliation?

---

## Cheat Sheet

```jsx
// Component
function MyComponent({ title, children, onClick }) {
  return <div onClick={onClick}><h2>{title}</h2>{children}</div>;
}

// State
const [count, setCount] = useState(0);
const [user,  setUser]  = useState(null);
setCount(prev => prev + 1);  // functional update

// Effect
useEffect(() => {
  const sub = subscribe();
  return () => sub.unsubscribe();  // cleanup
}, [dependency]);  // [] = mount only

// Ref
const ref = useRef(null);
<input ref={ref} /> → ref.current.focus();

// Memo / Callback
const result = useMemo(()  => expensiveCalc(data), [data]);
const fn     = useCallback(() => doThing(id), [id]);
const MemoedChild = memo(({ fn }) => <button onClick={fn} />);

// Context
const Ctx = createContext(null);
<Ctx.Provider value={...}>{children}</Ctx.Provider>
const val = useContext(Ctx);

// Lazy loading
const Admin = lazy(() => import('./Admin'));
<Suspense fallback={<Spinner />}><Admin /></Suspense>

// Conditional rendering
{condition && <Component />}
{condition ? <A /> : <B />}

// List rendering
{items.map(item => <Item key={item.id} {...item} />)}
```
