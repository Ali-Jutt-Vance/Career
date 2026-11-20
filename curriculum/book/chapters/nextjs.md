# Next.js

> [!GOALS]
> - Explain what a React **framework** adds, and compare rendering strategies: client-side, server-side, static, revalidated and streamed.
> - Build pages with the **App Router**: file-based routes, layouts, dynamic segments, loading and error states, and navigation.
> - Explain **React Server Components** and Client Components precisely: where each runs, what crosses the boundary, and how to compose them.
> - Fetch data on the server without waterfalls, and stream slow parts with Suspense.
> - Understand Next.js **caching** in its current form — dynamic by default, `"use cache"`, cache lifetimes and tags — and how to refresh data after changes.
> - Write **Server Functions** (server actions) for forms and mutations, safely, and **Route Handlers** for APIs.
> - Use `proxy.ts`, the Metadata API, `next/image`, `next/font` and environment variables correctly.
> - Deploy a Next.js application and avoid the common security mistakes.

## Why this matters

In {{ch:react-basics}} and {{ch:react-advanced}} you built React applications with Vite: the server sends an almost empty HTML page, the browser downloads JavaScript, React renders the interface, and then the app fetches its data. That works well for dashboards behind a login. For a public shop, it has real problems:

- **Slow first view.** The user sees nothing useful until JavaScript downloads, runs and fetches data — a long wait on a mid-range phone ({{ch:frontend-performance}}).
- **Weak search visibility.** Search engines and link previews receive an empty page ({{ch:seo}}).
- **Data waterfalls.** The browser must load code before it can even start requesting data.
- **No back end.** Checkout, order history and admin pages need server code — secrets, database access — somewhere else.
- **Lots of assembly.** Routing, code splitting, image optimisation, metadata and build configuration must all be chosen and wired together by hand.

A **React framework** solves these by running React on the **server** as well as in the browser, and by providing routing, data loading, caching and deployment conventions. **Next.js**, created by the company Vercel and released in 2016, is the most widely used React framework; the React team itself recommends starting new production apps with a framework, and React's newest features — Server Components and Server Functions — are designed to be used through one. Knowing Next.js is a common requirement in front-end and full-stack job listings.

This chapter teaches the App Router, the current way to build Next.js applications, as of Next.js 16. Next.js changes quickly; the **concepts** here — where code runs, what is cached, what crosses the network — are what will stay useful as details change.

## The simple idea

Think about two ways to get furniture.

In the first, a flat-pack box arrives at your door with every part and an instruction booklet. Before you can sit down, you must assemble everything yourself. That is **client-side rendering**: the browser receives code and builds the page itself.

In the second, the shop assembles the furniture in its workshop and delivers it ready to use. Some pieces, like a sofa that never changes, were built in advance and wait in the warehouse; others, like a custom-sized table, are built when you order. That is **server rendering**: the server builds the page and sends HTML that is ready to display, either prepared in advance or built per request.

Next.js lets you choose, **for each part of each page**, where and when it is built: in advance on the server, per request on the server, or in the browser when interactivity is needed.

> [!ANALOGY]
> Client-side rendering is like receiving flat-pack furniture to assemble yourself; server rendering is like receiving furniture already assembled — some built in advance, some built to order.
>
> **Where the analogy breaks:** delivered furniture stays as it is. A server-rendered web page usually still needs some JavaScript to become **interactive** — buttons that respond, menus that open — and Next.js sends only the code for the interactive parts. And unlike furniture, server-built pages can be **cached and reused** for many customers, then rebuilt when the data changes.

## The proper definition and key words

**Next.js** is a full-stack React framework that renders React components on the server and in the browser, and provides file-based routing, data fetching, caching, server-side mutations, API endpoints and build tooling.

The key words:

- **Client-side rendering (CSR)** — the browser builds the page with JavaScript.
- **Server-side rendering (SSR)** — the server renders HTML for each request.
- **Static rendering / static site generation (SSG)** — HTML rendered ahead of time (at build time) and reused for every request.
- **Revalidation** — re-rendering cached content after a time or when told data changed.
- **Streaming** — sending HTML in pieces as each part becomes ready, instead of waiting for the slowest part.
- **Hydration** — attaching React's event handlers to server-rendered HTML in the browser so it becomes interactive.
- **React Server Component (RSC)** — a component that runs **only on the server**; its code is never sent to the browser.
- **Client Component** — a component that is rendered on the server for the first HTML **and** runs in the browser, so it can use state, effects and event handlers. Marked with `"use client"`.
- **Server Function** (often called a **server action** when used for forms and mutations) — an async function marked `"use server"` that runs on the server but can be called from the browser.
- **Route** — a URL path and the code that handles it.

## How it works inside

### Level 2 — A request, end to end

When a user opens `https://cornershop.example/fruit/mangoes`:

```text
   browser                         Next.js server
     │  GET /fruit/mangoes            │
     │──────────────────────────────▶ │  1. match the route: app/fruit/[category]/page.tsx
     │                                │  2. render Server Components (fetch data,
     │                                │     query the database) → React's RSC payload
     │                                │  3. render the result to HTML (Client
     │                                │     Components included, as HTML only)
     │  ◀── HTML (streamed) ──────────│  4. stream HTML; slow parts arrive later
     │  page visible immediately      │     inside <Suspense> boundaries
     │                                │
     │  download JS for CLIENT         │
     │  components only               │
     │  hydrate them → interactive    │
     │                                │
     │  later: click a <Link>          │
     │──── request RSC payload ──────▶│  render the new route's Server Components
     │  ◀── RSC payload ──────────────│  (no full page reload; layouts kept)
```

Key consequences:

- The user sees real content **as soon as the HTML arrives**, before any JavaScript runs.
- Server Components' **code and their dependencies** (a database client, a Markdown library) are never downloaded by the browser. Only Client Components' code is.
- Navigations after the first page do not reload the whole page: the router requests a compact description of the new route's Server Component output — the **RSC payload** — and React merges it into the page, keeping shared layouts and client state.

### Level 2 — Comparing rendering strategies

| Strategy | When HTML is built | Data freshness | Speed | Typical use |
|---|---|---|---|---|
| CSR | In the browser, after JS loads | Fetched by the browser | Slow first view | Logged-in dashboards |
| Static | At build time (or first request), reused | As fresh as the last build/revalidation | Fastest (served from a CDN) | Marketing pages, docs, blog posts |
| Revalidated static | Cached, rebuilt after a time or on demand | Fresh within minutes, or on change | Very fast | Product and category pages |
| Dynamic (SSR) | On each request | Always fresh | Depends on data speed | Personalised pages, carts, search results |
| Streaming | Per request, sent in pieces | Fresh | Fast first bytes; slow parts later | Pages mixing fast and slow data |

In Next.js you do not choose one strategy for the whole site. Each route — and, with streaming and caching, each **part** of a route — can be static, cached or dynamic.

## Getting started

### Level 3 — Creating a project

```bash
npx create-next-app@latest corner-shop
cd corner-shop
npm run dev
```

The generator asks a few questions (TypeScript, ESLint, Tailwind CSS, the `src/` folder, the App Router). Accept TypeScript, Tailwind ({{ch:tailwind}}) and the App Router. `npm run dev` starts a development server at `http://localhost:3000`; `npm run build` creates an optimised production build and `npm start` serves it. Next.js 16 uses **Turbopack**, its fast bundler, by default.

### Level 3 — The `app` folder: routes are folders

In the App Router, **folders define URL paths** and special **files** inside them define what is shown:

```text
app/
├── layout.tsx                 shared shell for every page (html, body, header)
├── page.tsx                   /
├── not-found.tsx              404 page
├── fruit/
│   ├── page.tsx               /fruit
│   └── [category]/
│       ├── page.tsx           /fruit/mangoes, /fruit/lychees ...
│       ├── loading.tsx        shown while this route's content loads
│       └── error.tsx          shown if this route throws an error
├── (shop)/                    a route GROUP: organises files, not part of the URL
│   └── cart/
│       └── page.tsx           /cart
└── api/
    └── orders/
        └── route.ts           an API endpoint: /api/orders
```

The special files:

| File | Purpose |
|---|---|
| `page.tsx` | The UI for a route; makes the folder publicly reachable |
| `layout.tsx` | UI shared by a route and its children; **stays mounted** across navigation |
| `loading.tsx` | Instant loading UI (wraps the page in a Suspense boundary) |
| `error.tsx` | Error UI (wraps the page in an error boundary — {{ch:react-advanced}}) |
| `not-found.tsx` | UI for `notFound()` and unknown URLs |
| `route.ts` | An HTTP endpoint (no UI) |

Other files in a route folder — components, helpers, tests — are **not** routes unless they are named `page` or `route`, so you can keep related code together ("colocation").

### Level 3 — The root layout

```tsx
// fragment
// app/layout.tsx
import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Corner Shop", template: "%s | Corner Shop" },
  description: "Fresh fruit delivered the same day in Lahore.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header>
          <a href="/">Corner Shop</a>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
```

- The root layout must render `<html>` and `<body>`. Every page is placed where `{children}` is.
- `export const metadata` sets the default `<title>` and description ({{ch:seo}}). The `template` means a page that sets its title to "Mangoes" produces "Mangoes | Corner Shop".
- Global CSS is imported once here.
- Layouts nest: `app/fruit/layout.tsx` would wrap every page under `/fruit`, inside the root layout. Because layouts stay mounted during navigation, state inside them (a sidebar's open/closed state, a playing video) is preserved.

## Routing

### Level 3 — Pages and dynamic segments

```tsx
// fragment
// app/fruit/[category]/page.tsx
import { notFound } from "next/navigation";
import { getProductsByCategory } from "@/lib/products";

type Props = { params: Promise<{ category: string }> };

export default async function CategoryPage({ params }: Props) {
  const { category } = await params;
  const products = await getProductsByCategory(category);
  if (products === null) notFound();

  return (
    <section>
      <h1>{category[0]!.toUpperCase() + category.slice(1)}</h1>
      <ul>
        {products.map((p) => (
          <li key={p.id}>
            {p.name} — Rs {(p.pricePaisa / 100).toLocaleString("en-US")}
          </li>
        ))}
      </ul>
    </section>
  );
}
```

- A folder in square brackets, `[category]`, is a **dynamic segment**: it matches any value, which arrives in `params`.
- In current Next.js, `params` (and `searchParams`) are **promises**, so you `await` them. This lets Next.js begin rendering before it knows every dynamic value.
- The page is an **async component** — possible because it is a Server Component (below). It can `await` data directly, with no `useEffect`.
- `notFound()` stops rendering and shows the nearest `not-found.tsx` with a real **404 status** — no soft 404s ({{ch:seo}}).
- `@/lib/products` uses a path alias that `create-next-app` sets up: `@/` means the project's root (or `src/`).
- Variations: `[...slug]` catches several segments (`/docs/a/b/c` gives `slug: ["a", "b", "c"]`); `[[...slug]]` also matches the bare path.
- Running `next typegen` (or a build) generates global helper types such as `PageProps<"/fruit/[category]">`, so you need not write the props type by hand; the explicit type above shows what it contains.

### Level 3 — Search parameters

```tsx
// fragment
// app/search/page.tsx
type Props = { searchParams: Promise<{ q?: string; page?: string }> };

export default async function SearchPage({ searchParams }: Props) {
  const { q = "", page = "1" } = await searchParams;
  const pageNumber = Math.max(1, Number.parseInt(page, 10) || 1);
  // ... query the products for q and pageNumber
  return <h1>Results for “{q}” (page {pageNumber})</h1>;
}
```

The URL's query string (`?q=mango&page=2`) arrives as `searchParams`. Treat it as **untrusted user input**: validate and default it ({{ch:state-management}}). Reading `searchParams` makes the route **dynamic** — rendered per request — because the result depends on each request.

### Level 3 — Navigation

```tsx
// fragment
import Link from "next/link";

export function CategoryNav() {
  return (
    <nav aria-label="Fruit categories">
      <ul>
        <li><Link href="/fruit/mangoes">Mangoes</Link></li>
        <li><Link href="/fruit/lychees">Lychees</Link></li>
      </ul>
    </nav>
  );
}
```

- `<Link>` renders a real `<a href>` — crawlable and accessible ({{ch:seo}}, {{ch:html}}) — and intercepts clicks for **client-side navigation** without a full reload.
- Next.js **prefetches** the routes of links visible in the viewport (in production), so navigation feels instant.
- In Client Components, the hooks `useRouter()` (navigate programmatically: `router.push("/cart")`), `usePathname()` and `useSearchParams()` come from `next/navigation`.
- On the server, `redirect("/login")` (from `next/navigation`) sends the user elsewhere.

## Server Components and Client Components

### Level 2 — The default: Server Components

In the App Router, **every component is a Server Component unless you say otherwise**. Server Components:

- **Run only on the server** — at build time or per request. Their code is never sent to the browser.
- **Can be async** and can access server resources directly: databases, files, environment secrets, internal services.
- **Cannot** use state (`useState`), effects (`useEffect`), event handlers (`onClick`), or browser APIs (`window`, `localStorage`) — there is no browser where they run, and they do not re-render on the client.

### Level 2 — Opting in: Client Components

When a component needs interactivity, mark its file with the `"use client"` directive at the top:

```tsx
// fragment
// app/fruit/[category]/AddToCartButton.tsx
"use client";

import { useState } from "react";

export function AddToCartButton({ productId, name }: { productId: string; name: string }) {
  const [added, setAdded] = useState(false);
  return (
    <button type="button" onClick={() => setAdded(true)} aria-label={`Add ${name} to cart`}>
      {added ? "Added ✓" : "Add to cart"}
    </button>
  );
}
```

- `"use client"` marks a **boundary**: this module and everything it imports become part of the browser bundle.
- Client Components are still rendered to HTML on the server for the first view, then **hydrated** in the browser.
- Use them for interactivity: state, event handlers, effects, browser APIs, and third-party libraries that need them.

### Level 3 — Composing the two

A Server Component can render a Client Component and pass it **props**:

```tsx
// fragment
// app/fruit/[category]/page.tsx (Server Component)
import { AddToCartButton } from "./AddToCartButton";

export default async function Page() {
  const products = await getProductsByCategory("mangoes");
  return (
    <ul>
      {products!.map((p) => (
        <li key={p.id}>
          {p.name} <AddToCartButton productId={p.id} name={p.name} />
        </li>
      ))}
    </ul>
  );
}
```

Rules at the boundary:

- **Props must be serialisable**, because they travel from the server to the browser: strings, numbers, booleans, plain objects and arrays, `Date`s, and a few other built-in types — and **Server Functions**. Ordinary functions, class instances and database connections cannot be passed.
- **Only send what the client needs.** Passing a whole database record (with internal fields, a supplier's cost price, a customer's email) to a Client Component sends it to every browser, where anyone can read it in the page source. Pass exactly the fields required.
- **A Client Component cannot import a Server Component**, but it **can render one passed in as `children`** (or another prop). This keeps server-only parts on the server even inside interactive wrappers:

```tsx
// fragment
// A client-side collapsible panel...
"use client";
import { useState, type ReactNode } from "react";

export function Collapsible({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <section>
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)}>{title}</button>
      {open && children}
    </section>
  );
}

// ...wrapping server-rendered content, in a Server Component:
// <Collapsible title="Delivery details"><DeliveryInfo /></Collapsible>
```

`DeliveryInfo` (a Server Component, perhaps reading delivery zones from the database) is rendered on the server; the collapsible behaviour runs in the browser.

### Level 4 — Where to put the boundary

Push `"use client"` **down the tree**, to the smallest interactive parts — the button, the quantity picker, the search box — and keep layouts, pages and data-displaying components as Server Components. The less code behind `"use client"`, the less JavaScript users download ({{ch:frontend-performance}}).

To guarantee that a module containing secrets or database access can **never** be imported into client code by accident, import the small `server-only` package at its top. The build fails if any Client Component imports it.

```ts
// fragment
// lib/db.ts
import "server-only";
// ... database connection using process.env.DATABASE_URL
```

## Fetching data

### Level 3 — Data in Server Components

Because Server Components run on the server, data fetching is just `await`:

```tsx
// fragment
// app/products/[id]/page.tsx
import { db } from "@/lib/db";
import { notFound } from "next/navigation";

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await db.product.findUnique({ where: { id } });   // direct database access
  if (!product) notFound();
  return <h1>{product.name}</h1>;
}
```

There is no API layer between the page and the database for reads, no loading state to manage in the browser, and no secret ever reaches the client. (The `db` object here stands for an ORM client such as Prisma — {{ch:prisma}}.)

### Level 4 — Avoiding waterfalls

Sequential `await`s for **independent** data create a waterfall: the second request starts only after the first finishes.

```tsx
// fragment
// Slow: about (time of product) + (time of reviews) + (time of related)
const product = await getProduct(id);
const reviews = await getReviews(id);
const related = await getRelated(id);

// Fast: about the time of the slowest one
const [product, reviews, related] = await Promise.all([getProduct(id), getReviews(id), getRelated(id)]);
```

`Promise.all` ({{ch:asynchronous-javascript}}) starts all three at once. Fetch sequentially only when one request genuinely needs the result of another.

### Level 4 — Streaming slow parts

Some data is slow — personalised recommendations, a third-party review service. Waiting for it delays the **whole** page. Instead, wrap the slow part in `<Suspense>`: the rest of the page is sent immediately, and the slow part is **streamed** in when ready ({{ch:react-advanced}}):

```tsx
// fragment
import { Suspense } from "react";

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getProduct(id); // fast, needed for the main content

  return (
    <article>
      <h1>{product.name}</h1>
      <p>{product.description}</p>
      <Suspense fallback={<p>Loading reviews…</p>}>
        <Reviews productId={id} />
      </Suspense>
    </article>
  );
}

async function Reviews({ productId }: { productId: string }) {
  const reviews = await getReviewsFromSlowService(productId);
  return (
    <ul>
      {reviews.map((r) => <li key={r.id}>{r.text}</li>)}
    </ul>
  );
}
```

The product name and description appear at once; the reviews arrive a moment later in the same response, replacing the fallback. A `loading.tsx` file does the same for a whole route segment. Streaming improves both perceived speed and LCP ({{ch:frontend-performance}}).

## Caching

### Level 2 — The model in current Next.js

Caching is where Next.js has changed most between versions, so it is important to know which model you are reading about. In current Next.js (version 16 with **Cache Components** enabled, as new projects increasingly do):

- **Rendering is dynamic by default.** Data is fetched fresh on each request unless you opt in to caching. (Early App Router versions cached `fetch` automatically, which surprised many developers; that default was removed.)
- **You mark what can be cached** with the `"use cache"` directive, set **how long** with `cacheLife`, and **label** cached data with `cacheTag` so it can be refreshed when it changes.
- Next.js prerenders as much of each route as possible ahead of time — the static "shell" — and fills dynamic parts in per request, streamed through Suspense. This combination was previously called **Partial Prerendering**.

Enable it in `next.config.ts`:

```ts
// fragment
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
};

export default nextConfig;
```

### Level 3 — `"use cache"`, `cacheLife` and `cacheTag`

```ts
// fragment
// lib/products.ts
import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "./db";

export async function getProductsByCategory(category: string) {
  "use cache";
  cacheLife("hours");                       // a built-in profile: refresh at most every few hours
  cacheTag("products", `category:${category}`);

  return db.product.findMany({ where: { category }, orderBy: { name: "asc" } });
}
```

- `"use cache"` at the top of an async function (or a component, or a whole file) tells Next.js the result can be cached and reused. The function's **arguments become part of the cache key**, so each category is cached separately — like query keys in {{ch:state-management}}.
- `cacheLife("hours")` chooses a lifetime profile. Built-in profiles range from `"seconds"` to `"max"`; you can also define your own. Choose by how often the data changes and how stale it may be ({{ch:caching}}).
- `cacheTag(...)` labels the cached entry. Later, when products change, you can invalidate every entry with that tag.
- Cached functions must not read request-specific data (cookies, headers) inside them — otherwise one user's data could be served to another. Read those outside and pass only what is needed as arguments.

### Level 4 — Refreshing cached data

When data changes — an admin edits a product — the cache must be refreshed. Next.js provides functions in `next/cache`:

| Function | Effect | Typical place |
|---|---|---|
| `updateTag(tag)` | Expire the tag **immediately**; the next read waits for fresh data. The user who made the change sees it at once ("read your own writes"). | A Server Function after a mutation |
| `revalidateTag(tag, profile)` | Mark the tag stale; serve the cached version once more while refreshing in the background (stale-while-revalidate). | A webhook or route handler, for example when a CMS publishes |
| `revalidatePath(path)` | Refresh everything cached for a path. | Simple cases |

You will see these used in the Server Function example below.

> [!WARNING]
> Caching personalised data is one of the most serious mistakes in server-rendered applications: if a page containing one customer's name, address or cart is cached and served to others, it is a **data leak**. Cache only data that is the same for every user (or include the user's identity explicitly in the key, with great care), and keep personalised parts dynamic.

## Server Functions: mutations and forms

### Level 3 — A server action for a form

A **Server Function** is an async function marked `"use server"`. When passed to a form's `action` ({{ch:react-advanced}}), the browser posts the form to the server, the function runs there, and the UI updates with the result.

```ts
// fragment
// app/admin/products/actions.ts
"use server";

import { z } from "zod";
import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

const ProductInput = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(2, "Name is too short"),
  pricePaisa: z.coerce.number().int().positive("Price must be positive"),
});

export type SaveState = { ok: boolean; errors?: Record<string, string[] | undefined> };

export async function saveProduct(_previous: SaveState, formData: FormData): Promise<SaveState> {
  await requireAdmin();                                   // 1. authorise: this is a public endpoint

  const parsed = ProductInput.safeParse(Object.fromEntries(formData));   // 2. validate
  if (!parsed.success) {
    return { ok: false, errors: z.flattenError(parsed.error).fieldErrors };
  }

  const { id, name, pricePaisa } = parsed.data;
  const product = await db.product.update({ where: { id }, data: { name, pricePaisa } });   // 3. mutate

  updateTag("products");                                   // 4. refresh cached data
  updateTag(`category:${product.category}`);
  redirect(`/admin/products/${id}`);                       // 5. navigate
}
```

And a form using it (a Client Component, so it can show pending and error state):

```tsx
// fragment
// app/admin/products/[id]/EditForm.tsx
"use client";

import { useActionState } from "react";
import { saveProduct, type SaveState } from "../actions";

export function EditForm({ id, name, pricePaisa }: { id: string; name: string; pricePaisa: number }) {
  const [state, action, pending] = useActionState<SaveState, FormData>(saveProduct, { ok: false });

  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <label htmlFor="name">Name</label>
      <input id="name" name="name" defaultValue={name} aria-describedby="name-error" />
      {state.errors?.name && <p id="name-error">{state.errors.name[0]}</p>}

      <label htmlFor="price">Price (paisa)</label>
      <input id="price" name="pricePaisa" type="number" defaultValue={pricePaisa} aria-describedby="price-error" />
      {state.errors?.pricePaisa && <p id="price-error">{state.errors.pricePaisa[0]}</p>}

      <button type="submit" disabled={pending}>{pending ? "Saving…" : "Save"}</button>
    </form>
  );
}
```

Walk through the important points:

- `"use server"` at the top of the file makes every exported function a Server Function. The client never receives their code — only a reference that lets it call them.
- **Every Server Function is a public HTTP endpoint.** Anyone can call it with any data, not just through your form. So it must, every time: **authenticate and authorise** the caller (`requireAdmin()` — {{ch:authentication}}), **validate** the input with a schema ({{ch:forms}}, {{ch:validation}}), and only then act. Hiding a button from non-admins is not protection.
- The **hidden `id` field** is user-controlled too: the server must check that this admin may edit this product.
- `Object.fromEntries(formData)` turns the form data into a plain object for Zod; `z.coerce.number()` converts the price from a string.
- On validation failure, the function **returns** errors, which `useActionState` exposes as `state`, shown next to the fields.
- On success, `updateTag` refreshes every cached page using product data, and `redirect` navigates (it works by throwing a special signal, so code after it does not run).
- `useActionState` gives the form its latest state and a `pending` flag; the form works even before JavaScript loads (progressive enhancement), because it is a real form posting to the server.

### Level 4 — When to use Server Functions, and when not

Server Functions are excellent for **mutations from your own UI**: forms, "add to cart", "mark as read". For **reading** data, prefer Server Components (data fetched during rendering). For APIs consumed by **other** clients — a mobile app, a partner, a webhook — use Route Handlers (below), which give you full control of URLs, methods and response formats.

## Route Handlers: API endpoints

A `route.ts` file exports functions named after HTTP methods:

```ts
// fragment
// app/api/products/[id]/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { getProduct } from "@/lib/products";

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const product = await getProduct(id);
  if (!product) {
    return NextResponse.json({ message: "Product not found" }, { status: 404 });
  }
  return NextResponse.json({ id: product.id, name: product.name, pricePaisa: product.pricePaisa });
}
```

- `GET`, `POST`, `PUT`, `PATCH` and `DELETE` functions handle the corresponding methods; others get `405 Method Not Allowed`.
- They use the standard Web `Request` and `Response` objects (`NextRequest` and `NextResponse` add conveniences such as cookies and JSON helpers).
- Return only the fields clients need, with proper status codes ({{ch:rest-apis}}).
- Route Handlers are a good fit for webhooks (a payment provider notifying you of a payment — {{ch:express}} explains the same ideas in a plain Node server), public APIs, file downloads and `revalidateTag` calls from a content system.

For large back-ends with many services, background jobs and complex business logic, many teams keep a **separate back-end** (Express, NestJS — {{ch:express}}, {{ch:nestjs-basics}}) and use Next.js for the front end and a thin layer of server code. Both architectures are common.

## `proxy.ts`: running code before requests

A file named `proxy.ts` at the project root (called `middleware.ts` before Next.js 16) runs **before** a request reaches a route. It is used for redirects, rewrites, and quick checks such as "is there a session cookie?":

```ts
// fragment
// proxy.ts
import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const session = request.cookies.get("session")?.value;
  if (!session) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/account/:path*", "/admin/:path*"],
};
```

- `matcher` limits which paths the proxy runs for.
- Without a session cookie, the user is redirected to `/login?next=/account/orders`.
- **This is an optimisation, not your security.** The proxy only checks that a cookie **exists**; pages, Server Functions and Route Handlers must still verify the session and permissions themselves ({{ch:frontend-authentication}}). Keep proxy logic fast and simple — it runs on every matched request.

## Metadata, images and fonts

### Level 3 — Metadata per page

```tsx
// fragment
// app/products/[id]/page.tsx
import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const product = await getProduct(id);
  if (!product) return { title: "Product not found" };
  return {
    title: product.name,
    description: product.summary,
    alternates: { canonical: `/products/${id}` },
    openGraph: { images: [product.imageUrl] },
  };
}
```

`generateMetadata` produces the title, description, canonical URL and Open Graph tags **on the server** — exactly what search engines and link previews need ({{ch:seo}}). Next.js deduplicates the `getProduct` call shared with the page. Files named `sitemap.ts` and `robots.ts` in `app/` generate the sitemap and `robots.txt` from code.

### Level 3 — `next/image`

```tsx
// fragment
import Image from "next/image";

<Image src="/img/chaunsa.jpg" alt="Three ripe Chaunsa mangoes" width={800} height={600} priority />
```

The `Image` component serves resized images in modern formats for each screen, generates `srcset`, lazy-loads by default and requires dimensions (preventing layout shift). `priority` marks the LCP image to load eagerly with high priority ({{ch:frontend-performance}}). Remote images must be allowed in `next.config.ts` (`images.remotePatterns`), to stop your server being used to resize arbitrary images from anywhere.

### Level 3 — `next/font`

```tsx
// fragment
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"], display: "swap" });
// <body className={inter.className}>
```

`next/font` downloads fonts at **build time** and serves them from your own domain (no request to a third party at runtime), subset to the characters you need, with fallback metrics adjusted to reduce layout shift.

## Environment variables and secrets

Next.js loads environment variables from `.env` files (`.env.local` for local secrets — git-ignored — {{ch:git}}):

```text
DATABASE_URL=postgres://...
PAYMENT_SECRET_KEY=sk_live_...
NEXT_PUBLIC_SITE_URL=https://cornershop.example
```

- Variables **without** a prefix are available **only on the server** (`process.env.DATABASE_URL` in Server Components, Server Functions, Route Handlers).
- Variables starting with **`NEXT_PUBLIC_`** are **inlined into the browser JavaScript at build time** — visible to everyone. Use the prefix only for values that are genuinely public.

> [!WARNING]
> Renaming `PAYMENT_SECRET_KEY` to `NEXT_PUBLIC_PAYMENT_SECRET_KEY` "because it was undefined in a Client Component" publishes your secret to every visitor. The fix is never to expose the secret: move the code that needs it to the server (a Server Function or Route Handler).

## Errors and not found

```tsx
// fragment
// app/fruit/[category]/error.tsx
"use client";

export default function CategoryError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div role="alert">
      <h2>We could not load this category.</h2>
      <button type="button" onClick={() => reset()}>Try again</button>
    </div>
  );
}
```

- `error.tsx` must be a Client Component; it becomes the error boundary for its route segment ({{ch:react-advanced}}). The rest of the layout stays usable.
- In production, Next.js does **not** send server error messages to the browser — only a `digest` identifier you can match with server logs ({{ch:logging}}). Never show raw error details to users.
- `reset()` tries to re-render the segment.
- `not-found.tsx` handles `notFound()` calls and unknown URLs with a 404 status. `global-error.tsx` catches errors in the root layout itself.

## Deployment

Options:

- **Vercel** (the company behind Next.js) supports every feature with no configuration — push to Git, and each branch gets a preview deployment.
- **Any Node.js server**: `npm run build` then `npm start`. With `output: "standalone"` in `next.config.ts`, the build produces a minimal folder containing only what is needed to run, ideal for a **Docker** image ({{ch:docker}}) on any cloud ({{ch:ecs}}).
- **Other platforms** provide Next.js adapters; check which features (caching, image optimisation, streaming) each supports.
- **Static export** (`output: "export"`) produces plain HTML/CSS/JS files for any static host — but only for sites that use no server features.

In production, put a CDN in front ({{ch:cloudfront}}), make sure caching headers are correct, and monitor errors and Core Web Vitals ({{ch:frontend-performance}}).

## From beginner to enterprise

**Level 3 — a first site.** App Router pages and layouts; Server Components fetching data; small Client Components for interactivity; `<Link>`; metadata; `next/image`.

**Level 4 — a real application.** Streaming with Suspense; Server Functions with validation and authorisation; caching with `"use cache"` and tags; Route Handlers for webhooks; `proxy.ts` for redirects; environment variables handled correctly; errors and not-found pages.

**Level 5 — professional practice.** `server-only` on all server modules; minimal data passed to Client Components; cache strategy documented per data type; preview deployments per pull request with tests run against them ({{ch:cicd}}); bundle and Web Vitals budgets.

**Level 6 — large applications.** Separate back-end services with Next.js as the presentation layer (a "backend for frontend"); edge and CDN caching strategies; incremental adoption in large codebases (migrating route by route from older frameworks or the Pages Router); multi-region deployment; observability across server and client.

## Real-world use cases

### An online shop

- **Catalogue pages** (home, categories, products): Server Components with cached data (`"use cache"`, hours-long lifetime, tagged), revalidated when products change — fast and search-friendly.
- **Stock and price badges**, which change often: smaller cached lifetimes, or dynamic components streamed inside Suspense.
- **Cart and checkout**: dynamic, per user, never cached; Server Functions for adding items and placing orders, with authorisation and idempotency ({{ch:rest-apis}}).
- **Admin**: Server Functions that validate, mutate and `updateTag`.
- **Payment webhooks**: a Route Handler that verifies the provider's signature.

### A content site with a headless CMS

- Content is written in a content management system and delivered through its API. Pages are cached indefinitely and tagged by content id; when an editor publishes, the CMS calls a Route Handler that verifies a shared secret and calls `revalidateTag` for the changed content. Readers get static-site speed with near-instant updates.

## Common mistakes

### Beginner: `"use client"` at the top of every file

**Consequence:** large JavaScript bundles; the benefits of Server Components lost. **Fix:** keep pages and layouts as Server Components; mark only interactive leaves as client.

### Beginner: using hooks in Server Components

`useState` in a page file causes a build error. **Fix:** move the interactive part into a Client Component.

### Beginner: forgetting to await `params`

`params.id` is a promise property access, giving `undefined`. **Fix:** `const { id } = await params`.

### Intermediate: passing whole database records to Client Components

**Consequence:** private fields shipped to every browser. **Fix:** pass only the needed fields.

### Intermediate: sequential awaits for independent data

**Fix:** `Promise.all`, or separate components with Suspense.

### Production: trusting the UI to protect Server Functions

**Consequence:** anyone can call the action directly. **Fix:** authenticate, authorise and validate inside every Server Function and Route Handler.

### Production: caching personalised content

**Consequence:** one user's data shown to another. **Fix:** cache only shared data; keep personal data dynamic.

### Production: `NEXT_PUBLIC_` on secrets

**Fix:** keep secrets server-side; never prefix them.

## Debugging and troubleshooting

- **"You're importing a component that needs useState…"** — a Server Component uses client features; add `"use client"` to the right (smallest) component.
- **"Functions cannot be passed directly to Client Components"** — a non-serialisable prop crosses the boundary; pass data, or a Server Function.
- **Hydration mismatch warnings** — the HTML rendered on the server differs from the first client render: for example, rendering `new Date()` or `Math.random()`, reading `localStorage` during render, or invalid HTML nesting ({{ch:html}}). Render such values in an effect, or make the server and client output identical.
- **Data does not update after a change** — a cached function or page was not invalidated; check `"use cache"` lifetimes and that the mutation calls `updateTag`/`revalidateTag` with matching tags.
- **A page is unexpectedly dynamic (slow)** — it reads cookies, headers or `searchParams`; move those reads into a Suspense-wrapped component so the rest can be prerendered.
- **An environment variable is `undefined` in the browser** — server-only variables are not sent to the client, by design; move the code to the server.
- **Build output** (`npm run build`) lists every route and whether it is static, partially prerendered or dynamic — check it after significant changes.

## Security

- **Server Functions and Route Handlers are public APIs**: authenticate, authorise and validate every call ({{ch:authentication}}, {{ch:validation}}).
- **Never expose secrets**: no `NEXT_PUBLIC_` prefix on secrets; `server-only` on server modules.
- **Minimise data sent to the client**: Client Component props and RSC payloads are visible to the user.
- **Do not cache personal data** in shared caches.
- **Escape and sanitise** user content as everywhere else; React escapes text by default, but JSON-LD and `dangerouslySetInnerHTML` need care ({{ch:seo}}, {{ch:html}}).
- **Restrict remote image sources** and validate redirect targets (no open redirects with the `next` parameter — {{ch:seo}}).
- **Keep Next.js updated**: frameworks that run on servers receive security fixes regularly; subscribe to their security advisories ({{ch:application-security}}).

## How a senior engineer thinks about this

- **Know where every line runs.** Server, client, build time or request time — and what data crosses between them.
- **Server by default, client by exception.** Interactivity is added in small islands.
- **Caching is a product decision.** For each kind of data: how stale may it be, who may see it, and what invalidates it?
- **Every server entry point is an API.** Server Functions get the same scrutiny as REST endpoints.
- **Concepts outlive APIs.** Next.js will keep changing; understanding rendering, caching and boundaries lets them adapt quickly — and read the version-specific documentation critically.

## Exercises

### Exercise 1 — Server or client?

**Objective:** practise placing the boundary.
**What to do:** for each component of a product page, say whether it should be a Server or Client Component and why: (1) the page itself, which loads the product from the database; (2) the image gallery with thumbnails you can click; (3) the product description; (4) the quantity picker and "Add to cart" button; (5) the reviews list from a slow service; (6) the "recently viewed" list stored in `localStorage`; (7) the breadcrumb trail.

<details>
<summary>Show the solution</summary>

1. **Server** — loads data directly, renders HTML, no interactivity.
2. **Client** — state for the selected image and click handlers; receives image URLs and alt texts as props.
3. **Server** — static text; no reason to ship code.
4. **Client** — state and events; calls a Server Function to add to the cart.
5. **Server**, wrapped in `<Suspense>` so it streams without delaying the page.
6. **Client** — `localStorage` exists only in the browser; render it after mount (to avoid hydration mismatches).
7. **Server** — links derived from the product's category.

**Principle:** only (2), (4) and (6) need browser features; everything else stays on the server, so very little JavaScript is shipped.

</details>

### Exercise 2 — Fix the waterfall

**Objective:** practise parallel fetching and streaming.
**Starting point:**

```tsx
// fragment
export default async function Dashboard() {
  const user = await getUser();
  const orders = await getRecentOrders(user.id);
  const promotions = await getPromotions();
  const recommendations = await getRecommendations(user.id); // slow: 2 seconds
  return <DashboardView user={user} orders={orders} promotions={promotions} recommendations={recommendations} />;
}
```

**What to do:** restructure for speed.

<details>
<summary>Show the solution</summary>

```tsx
// fragment
import { Suspense } from "react";

export default async function Dashboard() {
  const [user, promotions] = await Promise.all([getUser(), getPromotions()]); // independent
  const orders = await getRecentOrders(user.id);                             // needs user

  return (
    <>
      <Header user={user} />
      <Orders orders={orders} />
      <Promotions items={promotions} />
      <Suspense fallback={<p>Finding recommendations for you…</p>}>
        <Recommendations userId={user.id} />
      </Suspense>
    </>
  );
}

async function Recommendations({ userId }: { userId: string }) {
  const items = await getRecommendations(userId);
  return <RecommendationList items={items} />;
}
```

**Walkthrough:** `getPromotions` does not depend on the user, so it runs in parallel with `getUser`. Orders genuinely need the user id, so they wait for it. The slow recommendations move into their own async Server Component inside Suspense, so the page streams immediately and recommendations arrive when ready. Total time to the main content is now roughly `max(user, promotions) + orders` instead of the sum of all four.

</details>

### Exercise 3 — Secure the action

**Objective:** practise securing a Server Function.
**Starting point:**

```ts
// fragment
"use server";
export async function deleteReview(formData: FormData) {
  const id = formData.get("id") as string;
  await db.review.delete({ where: { id } });
  revalidatePath("/products");
}
```

The delete button is shown only to the review's author. What is wrong, and how do you fix it?

<details>
<summary>Show the solution</summary>

**Problems:** the function is a public endpoint; **anyone** can call it with **any** id — including other users' reviews — because hiding the button protects nothing. The id is not validated. There is no error handling.

```ts
// fragment
"use server";

import { z } from "zod";
import { updateTag } from "next/cache";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

const Input = z.object({ id: z.string().uuid() });

export async function deleteReview(formData: FormData): Promise<{ ok: boolean; message?: string }> {
  const session = await getSession();
  if (!session) return { ok: false, message: "Please log in." };

  const parsed = Input.safeParse({ id: formData.get("id") });
  if (!parsed.success) return { ok: false, message: "Invalid review." };

  const review = await db.review.findUnique({ where: { id: parsed.data.id } });
  if (!review || (review.authorId !== session.userId && session.role !== "moderator")) {
    return { ok: false, message: "You cannot delete this review." };
  }

  await db.review.delete({ where: { id: review.id } });
  updateTag(`reviews:${review.productId}`);
  return { ok: true };
}
```

**Walkthrough:** authenticate (session), validate the input, **authorise** (only the author or a moderator — checked on the server against the database), then mutate and refresh exactly the affected cached data. The same "not found or not allowed" message is used for both cases, so attackers cannot probe which ids exist ({{ch:authentication}}).

</details>

### Exercise 4 — Production scenario: caching plan

**Objective:** practise caching decisions.
**The scenario:** a pharmacy site has: medicine information pages (change rarely, edited by pharmacists), prices (change daily), stock per branch (changes constantly), a personalised "your prescriptions" page, and a search page. Propose rendering and caching for each, and how updates propagate.

<details>
<summary>Show the solution</summary>

| Content | Approach | Updates |
|---|---|---|
| Medicine information | `"use cache"`, `cacheLife("max")` or `"days"`, tagged `medicine:<id>` | Admin Server Function calls `updateTag("medicine:<id>")` on save |
| Prices | Cached with a short life (`"hours"` or a custom profile), tagged `prices` | Nightly price import calls `revalidateTag("prices", "max")` from a Route Handler protected by a secret |
| Stock per branch | Dynamic component inside Suspense (or very short cache, `"seconds"`), never blocking the page | Fresh on each request; optionally live updates via polling |
| "Your prescriptions" | Fully dynamic, per user, **never cached**; behind authentication checks in the page and data layer | Server Functions refill/cancel, then `refresh()` or re-render |
| Search | Dynamic (depends on `searchParams`); the search query itself may be cached briefly per query string; results streamed | Follows prices/stock caches |

**Principles:** shared, rarely changing data is cached long and invalidated precisely by tag; frequently changing data is short-lived or dynamic and streamed so it never delays the page; personal data is never put in shared caches. The build output and monitoring confirm which routes are static, partial or dynamic.

</details>

## Summary

Next.js is a full-stack React framework that renders on the server and the client. It lets each route — and each part of a route — be **static**, **cached and revalidated**, **dynamic** or **streamed**, so users see real HTML quickly, search engines can read it, and only interactive parts ship JavaScript.

In the **App Router**, folders are URL paths and special files define pages, layouts (which persist across navigation), loading and error states, not-found pages and route handlers. Dynamic segments arrive in `params`, query strings in `searchParams` — both promises, both untrusted. `<Link>` gives crawlable, prefetched, client-side navigation.

Components are **Server Components** by default: async, server-only, able to read databases and secrets, never shipped to the browser. `"use client"` marks interactive **Client Components**; props crossing the boundary must be serialisable and minimal, and server content can be passed into client wrappers as `children`. Fetch data in Server Components with `await`, in parallel where possible, and stream slow parts with Suspense.

Current Next.js renders dynamically by default; `"use cache"`, `cacheLife` and `cacheTag` opt data into caching, and `updateTag`, `revalidateTag` and `revalidatePath` refresh it after changes — never cache personal data. **Server Functions** handle mutations and forms but are public endpoints that must authenticate, authorise and validate every call; **Route Handlers** serve APIs and webhooks; `proxy.ts` handles quick pre-request redirects. Use the Metadata API, `next/image`, `next/font`, server-only environment variables, error boundaries, and deploy on Vercel, a Node server or a container.

## Key terms

- **Next.js** — A full-stack React framework providing server rendering, file-based routing, data fetching, caching and server-side mutations.
- **React framework** — A framework built on React that adds routing, server rendering, data loading and build tooling.
- **Server-side rendering (SSR)** — Rendering a page's HTML on the server for each request.
- **Static rendering** — Rendering HTML ahead of time and reusing it for many requests.
- **Revalidation** — Re-rendering cached content after a period or when notified that data changed.
- **Streaming (rendering)** — Sending HTML to the browser in parts as each becomes ready.
- **App Router** — The Next.js routing system in which folders in `app/` define routes and special files define their UI.
- **Layout** — A component that wraps a route and its children and stays mounted across navigation.
- **Dynamic segment** — A route folder in square brackets that matches any value in that part of the URL.
- **React Server Component** — A component that runs only on the server and whose code is never sent to the browser.
- **Client Component** — A component marked with `"use client"` that is hydrated and runs in the browser.
- **"use client"** — A directive marking the boundary where modules become part of the browser bundle.
- **RSC payload** — The compact description of Server Component output that the server sends to the client.
- **Serialisable** — Able to be converted into a format that can be sent over the network and rebuilt, such as plain data.
- **server-only** — A package that causes a build error if a server module is imported into client code.
- **Waterfall (data)** — A sequence of requests where each starts only after the previous finishes.
- **"use cache"** — A Next.js directive that marks a function or component's result as cacheable.
- **cacheLife** — A Next.js function that sets how long cached data stays fresh.
- **cacheTag** — A Next.js function that labels cached data so it can be invalidated by tag.
- **updateTag / revalidateTag** — Next.js functions that expire or refresh cached data carrying a given tag.
- **Server Function (server action)** — An async function marked `"use server"` that runs on the server and can be called from the client.
- **Route Handler** — A `route.ts` file exporting functions that handle HTTP requests for a path.
- **proxy.ts** — A Next.js file that runs before matching requests, used for redirects and quick checks (formerly middleware).
- **Hydration mismatch** — An error when HTML rendered on the server differs from the first render in the browser.
- **NEXT_PUBLIC_ variable** — An environment variable whose value is embedded in browser JavaScript and therefore public.
- **Standalone output** — A Next.js build mode producing a minimal folder for running the server, suited to containers.

## What comes next

Almost every real application needs to know **who the user is** and **what they may do**. The next chapter, {{ch:frontend-authentication}}, covers authentication from the front end's side: login and sign-up flows, sessions versus tokens and where to store them, protecting pages and data in Next.js and single-page apps, social login, and the security pitfalls that matter most.
