# Phase 4 — Chapter 6: State Management

---

## Chapter Overview

State management is how you store, read, and update application data in a React app. The choice of state management approach has a huge impact on code maintainability, performance, and developer experience.

**State categories:**
- Local state: `useState`, `useReducer` — belongs to a single component
- Shared/global state: Context, Zustand, Redux Toolkit — shared across components
- Server state: TanStack Query — async data, caching, background refetch
- URL state: search params, routing — shareable via URL

---

## Beginner Theory

### When to Use What

```
Single component:      useState / useReducer
A few nearby components: lift state up / props
Distantly-related components: Context
Complex global UI state: Zustand / Redux Toolkit
Remote server data:    TanStack Query (React Query)
URL-based state:       useSearchParams (React Router / Next.js)
```

---

## Basic Examples

### Zustand (Recommended Global State)

```typescript
// store/useCartStore.ts
import { create } from "zustand";
import { persist, devtools } from "zustand/middleware";

interface CartItem {
  id:       string;
  name:     string;
  price:    number;
  quantity: number;
}

interface CartStore {
  items:    CartItem[];
  total:    number;
  isOpen:   boolean;
  addItem:  (item: Omit<CartItem, "quantity">) => void;
  removeItem: (id: string) => void;
  updateQty:  (id: string, qty: number) => void;
  clearCart:  () => void;
  toggleCart: () => void;
}

function calcTotal(items: CartItem[]) {
  return items.reduce((t, i) => t + i.price * i.quantity, 0);
}

export const useCartStore = create<CartStore>()(
  devtools(
    persist(
      (set, get) => ({
        items:  [],
        total:  0,
        isOpen: false,

        addItem(item) {
          set(state => {
            const existing = state.items.find(i => i.id === item.id);
            const items = existing
              ? state.items.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i)
              : [...state.items, { ...item, quantity: 1 }];
            return { items, total: calcTotal(items) };
          });
        },

        removeItem(id) {
          set(state => {
            const items = state.items.filter(i => i.id !== id);
            return { items, total: calcTotal(items) };
          });
        },

        updateQty(id, qty) {
          set(state => {
            const items = qty <= 0
              ? state.items.filter(i => i.id !== id)
              : state.items.map(i => i.id === id ? { ...i, quantity: qty } : i);
            return { items, total: calcTotal(items) };
          });
        },

        clearCart() {
          set({ items: [], total: 0 });
        },

        toggleCart() {
          set(state => ({ isOpen: !state.isOpen }));
        }
      }),
      { name: "cart-storage" }  // persists to localStorage
    )
  )
);

// Usage in components (no Provider needed!)
function CartButton() {
  const { items, total, isOpen, toggleCart } = useCartStore();

  return (
    <button onClick={toggleCart}>
      Cart ({items.length}) — ${total.toFixed(2)}
    </button>
  );
}

function ProductCard({ product }) {
  const addItem = useCartStore(state => state.addItem);  // selective subscription

  return (
    <button onClick={() => addItem(product)}>
      Add to Cart
    </button>
  );
}
```

---

## Intermediate Concepts

### TanStack Query (Server State)

```typescript
// lib/queryClient.ts
import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:       60_000,  // 1 min — don't refetch if data is fresh
      gcTime:          5 * 60_000,  // 5 min — keep in cache after unmount
      retry:           2,
      refetchOnWindowFocus: false
    }
  }
});

// hooks/useUsers.ts
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import { userApi } from "@/lib/api";

// Query keys as constants — prevents typos
export const userKeys = {
  all:    () => ["users"] as const,
  list:   (filters: any)  => [...userKeys.all(), "list", filters] as const,
  detail: (id: string)    => [...userKeys.all(), "detail", id] as const
};

// Fetch all users
export function useUsers(filters = {}) {
  return useQuery({
    queryKey: userKeys.list(filters),
    queryFn:  () => userApi.getAll(filters),
    select:   data => data.users  // transform response
  });
}

// Fetch single user
export function useUser(id: string) {
  return useQuery({
    queryKey: userKeys.detail(id),
    queryFn:  () => userApi.getById(id),
    enabled:  !!id  // only run if id is provided
  });
}

// Create mutation
export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: userApi.create,

    onMutate: async (newUser) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: userKeys.all() });
      const previous = queryClient.getQueryData(userKeys.list({}));
      queryClient.setQueryData(userKeys.list({}), (old: any) => ({
        ...old,
        users: [...(old?.users || []), { id: "temp", ...newUser }]
      }));
      return { previous };
    },

    onError: (_err, _vars, context) => {
      // Rollback on error
      if (context?.previous) {
        queryClient.setQueryData(userKeys.list({}), context.previous);
      }
    },

    onSettled: () => {
      // Always refetch to sync with server
      queryClient.invalidateQueries({ queryKey: userKeys.all() });
    }
  });
}

// Infinite scroll / pagination
export function useUsersInfinite() {
  return useInfiniteQuery({
    queryKey:           userKeys.list({ infinite: true }),
    queryFn:            ({ pageParam = 1 }) => userApi.getPage(pageParam, 20),
    getNextPageParam:   (lastPage) => lastPage.nextPage ?? undefined,
    initialPageParam:   1
  });
}

// Usage
function UsersList() {
  const { data, isLoading, error, isFetching } = useUsers();

  if (isLoading) return <Skeleton />;
  if (error)     return <ErrorMessage error={error} />;

  return (
    <div>
      {isFetching && <div className="top-0 w-full h-1 bg-blue-500 animate-pulse" />}
      {data?.map(user => <UserCard key={user.id} user={user} />)}
    </div>
  );
}

function CreateUserButton() {
  const { mutate, isPending, error } = useCreateUser();

  return (
    <>
      <button disabled={isPending} onClick={() => mutate({ name: "New User", email: "..." })}>
        {isPending ? "Creating..." : "Create User"}
      </button>
      {error && <p>{error.message}</p>}
    </>
  );
}
```

### Redux Toolkit (Enterprise Global State)

```typescript
// store/slices/authSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";

interface AuthState {
  user:    User | null;
  token:   string | null;
  loading: boolean;
  error:   string | null;
}

const initialState: AuthState = {
  user:    null,
  token:   localStorage.getItem("token"),
  loading: false,
  error:   null
};

// Async thunk
export const login = createAsyncThunk(
  "auth/login",
  async (credentials: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const res = await authApi.login(credentials);
      localStorage.setItem("token", res.token);
      return res;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.error ?? "Login failed");
    }
  }
);

export const authSlice = createSlice({
  name:         "auth",
  initialState,
  reducers: {
    setUser:  (state, action: PayloadAction<User>) => { state.user  = action.payload; },
    logout:   (state) => {
      state.user  = null;
      state.token = null;
      localStorage.removeItem("token");
    },
    clearError: (state) => { state.error = null; }
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending,   (state) => { state.loading = true;  state.error = null; })
      .addCase(login.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.user    = payload.user;
        state.token   = payload.token;
      })
      .addCase(login.rejected,  (state, { payload }) => {
        state.loading = false;
        state.error   = payload as string;
      });
  }
});

export const { setUser, logout, clearError } = authSlice.actions;

// store/index.ts
import { configureStore } from "@reduxjs/toolkit";
import { authSlice } from "./slices/authSlice";

export const store = configureStore({
  reducer: {
    auth:  authSlice.reducer,
    // cart: cartSlice.reducer,
  }
});

export type RootState  = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Typed hooks
import { useSelector, useDispatch } from "react-redux";
export const useAppSelector = useSelector.withTypes<RootState>();
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();

// Usage
function LoginButton() {
  const dispatch = useAppDispatch();
  const { loading, error } = useAppSelector(state => state.auth);

  const handleLogin = () => {
    dispatch(login({ email: "...", password: "..." }));
  };

  return <button onClick={handleLogin} disabled={loading}>Login</button>;
}
```

---

## Interview Preparation

**Q1: What is the difference between local state, global state, and server state?**
A: Local state (useState/useReducer) is scoped to a single component — UI toggles, form input values, loading flags. It disappears when the component unmounts. Global state (Zustand/Redux) is shared across many components and persists across component lifecycles — user authentication, shopping cart, theme preference. Server state (TanStack Query) represents data that lives on the server — user lists, product catalog, orders. It has additional concerns: loading/error states, caching, staleness, background refetching, and synchronization. The key insight: server state should not be stored in global state (Redux/Zustand) because you'd need to manually manage cache invalidation. Use TanStack Query for server state; global stores for client-only state.

**Q2: When should you use Zustand vs Redux Toolkit?**
A: Zustand for: smaller to medium apps, simple global state (cart, auth, UI preferences), teams that want minimal boilerplate. Redux Toolkit for: large enterprise apps, complex state with many slices, apps that need time-travel debugging, teams already using Redux. Redux Toolkit has eliminated most Redux boilerplate (createSlice, createAsyncThunk), but Zustand is still simpler and has no Provider requirement. Both are valid choices in 2025 — choose based on team familiarity and complexity needs.

**Q3: What is a stale-while-revalidate pattern and how does TanStack Query implement it?**
A: Stale-while-revalidate: serve cached (potentially stale) data immediately for fast perceived performance, then fetch fresh data in the background and update the UI when it arrives. TanStack Query implements this with `staleTime` (how long before data is considered stale) and `gcTime` (how long to keep data in cache after unmount). When a component mounts and the cache has data but it's stale, TanStack Query: immediately returns the stale data (fast render), fires a background refetch, updates the UI when the fresh data arrives. The user sees data instantly with no loading spinner, and the data refreshes silently.

---

## Practical Tasks

### Beginner (10 Tasks)
1. Create a Zustand store for a counter.
2. Create a Zustand store for a to-do list (add, toggle, delete).
3. Use TanStack Query to fetch a list of posts from an API.
4. Show loading and error states with TanStack Query.
5. Use `useQuery` with `enabled` to conditionally fetch.
6. Set up Redux Toolkit with `configureStore` and a basic slice.
7. Use `useSelector` and `useDispatch` to read/update Redux state.
8. Persist Zustand state to `localStorage` with `persist` middleware.
9. Add Zustand devtools middleware for Redux DevTools support.
10. Set up a `QueryClient` with custom defaults.

### Intermediate (10 Tasks)
1. Create a Zustand cart store with add, remove, update quantity.
2. Implement a `useMutation` for creating a user with error handling.
3. Implement cache invalidation after a successful mutation.
4. Implement optimistic updates with `onMutate`/`onError`/`onSettled`.
5. Create a Redux slice with `createAsyncThunk` for authentication.
6. Add Redux Toolkit Query (`RTK Query`) for API data fetching.
7. Implement infinite scroll with `useInfiniteQuery`.
8. Prefetch data on hover with `queryClient.prefetchQuery`.
9. Use `queryClient.setQueryData` for optimistic UI.
10. Implement background refetch with `refetchInterval`.

### Advanced (10 Tasks)
1. Build a full e-commerce app with Zustand cart + TanStack Query products.
2. Implement real-time state sync with WebSocket + Zustand.
3. Build a multi-step form with Zustand state.
4. Implement undo/redo with Zustand's `temporal` middleware.
5. Build a normalized cache with TanStack Query.
6. Implement selective re-rendering with Zustand slice subscriptions.
7. Use TanStack Query's `suspense` mode with React Suspense.
8. Implement Redux Toolkit's Entity Adapter for normalized list state.
9. Build a Zustand state with Immer middleware for complex nested updates.
10. Implement cross-tab state sync using `broadcastChannel` with Zustand.

---

## Self Assessment
1. What is the difference between local and global state?
2. What is server state?
3. What is TanStack Query used for?
4. What is `staleTime` in TanStack Query?
5. What is Zustand?
6. What is `useSelector` in Redux?
7. What is `createAsyncThunk`?
8. What is optimistic updating?
9. What is cache invalidation?
10. When should you lift state up vs. use global state?

---

## Cheat Sheet

```typescript
// Zustand store
const useStore = create<State>()((set) => ({
  count: 0,
  inc: () => set(s => ({ count: s.count + 1 }))
}));
const count = useStore(s => s.count);
const inc   = useStore(s => s.inc);

// Zustand with persist
create<State>()(persist((set) => ({...}), { name: "storage-key" }));

// TanStack Query
const { data, isLoading, error } = useQuery({
  queryKey: ["users", filters],
  queryFn:  () => fetch("/api/users").then(r => r.json()),
  staleTime: 60_000
});

const { mutate, isPending } = useMutation({
  mutationFn: (data) => api.create(data),
  onSuccess:  () => queryClient.invalidateQueries({ queryKey: ["users"] })
});

// Redux Toolkit slice
const slice = createSlice({
  name: "auth",
  initialState: { user: null },
  reducers: { setUser: (state, action) => { state.user = action.payload; } }
});
const { setUser } = slice.actions;

// Redux Toolkit async thunk
const fetchUser = createAsyncThunk("users/fetch", async (id) => {
  return await api.getUser(id);
});
```
