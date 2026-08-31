# Phase 4 — Chapter 5: Next.js

---

## Chapter Overview

Next.js is the dominant React meta-framework — it adds routing, server-side rendering, API routes, image optimization, and more on top of React. The App Router (stable from Next.js 13) with React Server Components is the modern standard.

**Core topics:**
- App Router: layouts, pages, loading, error handling
- React Server Components and Client Components
- Server Actions
- Data fetching: fetch, cache, revalidate
- Routing: dynamic routes, parallel routes, intercepting routes
- Image optimization, metadata API, middleware

---

## Beginner Theory

### App Router Structure

```
app/
  layout.tsx          ← root layout (html, body, providers)
  page.tsx            ← / route
  loading.tsx         ← instant loading UI while page loads
  error.tsx           ← error boundary for this route
  not-found.tsx       ← 404 within this segment
  
  about/
    page.tsx          ← /about route
  
  users/
    page.tsx          ← /users
    [id]/
      page.tsx        ← /users/:id
    layout.tsx        ← shared layout for /users/* routes
  
  api/
    users/
      route.ts        ← /api/users (GET, POST)
    users/[id]/
      route.ts        ← /api/users/:id (GET, PUT, DELETE)
  
  (auth)/             ← route group (no URL segment)
    login/page.tsx    ← /login
    register/page.tsx ← /register
    layout.tsx        ← shared auth layout
  
  @modal/             ← parallel route (for modals, etc)
    login/page.tsx

Colocated files (not routes):
  _components/        ← private folder (not a route)
  components.tsx      ← component file (only pages.tsx are routes)
```

---

## Basic Examples

### App Layout and Pages

```tsx
// app/layout.tsx — root layout (always a Server Component)
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title:       { template: "%s | MyApp", default: "MyApp" },
  description: "The best app for managing your projects",
  openGraph:   { type: "website", siteName: "MyApp" }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}

// app/page.tsx — homepage (Server Component)
async function HomePage() {
  const products = await getProducts();  // direct DB call, no API

  return (
    <div>
      <h1>Products</h1>
      <ProductGrid products={products} />
    </div>
  );
}

async function getProducts() {
  const res = await fetch("https://api.example.com/products", {
    next: { revalidate: 60 }  // ISR: refresh every 60 seconds
  });
  return res.json();
}
```

### Dynamic Routes

```tsx
// app/users/[id]/page.tsx
import { notFound } from "next/navigation";
import type { Metadata } from "next";

type Props = {
  params: { id: string };
};

// Generate page metadata dynamically
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const user = await getUser(params.id);
  if (!user) return { title: "User Not Found" };
  return {
    title: `${user.name}'s Profile`,
    description: `View ${user.name}'s profile`
  };
}

// Statically generate known IDs at build time
export async function generateStaticParams() {
  const users = await getTopUsers(100);
  return users.map(u => ({ id: u.id }));
}

export default async function UserPage({ params }: Props) {
  const user = await getUser(params.id);
  if (!user) notFound();

  return (
    <article>
      <h1>{user.name}</h1>
      <p>{user.email}</p>
      <UserOrdersSection userId={user.id} />  {/* async Server Component */}
    </article>
  );
}
```

### API Routes

```typescript
// app/api/users/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";

const CreateUserSchema = z.object({
  email: z.string().email(),
  name:  z.string().min(2).max(100)
});

export async function GET(request: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const page  = parseInt(searchParams.get("page")  || "1");
  const limit = parseInt(searchParams.get("limit") || "20");

  const [users, total] = await prisma.user.findAndCount({
    skip:    (page - 1) * limit,
    take:    limit,
    select:  { id: true, name: true, email: true, createdAt: true },
    orderBy: { createdAt: "desc" }
  });

  return NextResponse.json({ users, total, page, limit });
}

export async function POST(request: NextRequest) {
  const body   = await request.json();
  const result = CreateUserSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json({ error: "Validation failed", issues: result.error.issues }, { status: 400 });
  }

  try {
    const user = await prisma.user.create({ data: result.data });
    return NextResponse.json(user, { status: 201 });
  } catch (err: any) {
    if (err.code === "P2002") {
      return NextResponse.json({ error: "Email already exists" }, { status: 409 });
    }
    throw err;
  }
}
```

### Server Actions

```tsx
// actions/users.ts
"use server";
import { revalidatePath } from "next/cache";
import { redirect }       from "next/navigation";
import { z }              from "zod";
import { prisma }         from "@/lib/prisma";
import { getServerSession } from "next-auth";

const schema = z.object({
  name:  z.string().min(2),
  email: z.string().email()
});

export async function createUser(formData: FormData) {
  const session = await getServerSession();
  if (!session) throw new Error("Unauthorized");

  const data   = Object.fromEntries(formData);
  const result = schema.safeParse(data);

  if (!result.success) {
    return { error: "Invalid data", issues: result.error.issues };
  }

  await prisma.user.create({ data: result.data });
  revalidatePath("/users");
  redirect("/users");
}

// components/CreateUserForm.tsx
"use client";
import { createUser } from "@/actions/users";
import { useFormState, useFormStatus } from "react-dom";

function SubmitButton() {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending}>{pending ? "Creating..." : "Create User"}</button>;
}

export function CreateUserForm() {
  const [state, action] = useFormState(createUser, null);

  return (
    <form action={action}>
      <input name="name"  placeholder="Full Name" required />
      <input name="email" type="email" placeholder="Email" required />
      {state?.error && <p className="error">{state.error}</p>}
      <SubmitButton />
    </form>
  );
}
```

---

## Intermediate Concepts

### Data Fetching Patterns

```tsx
// 1. Server Component fetch (most common)
async function ProductsPage() {
  const products = await prisma.product.findMany({ where: { isActive: true } });
  return <ProductGrid products={products} />;
}

// 2. Parallel data fetching (both requests fire simultaneously)
async function DashboardPage() {
  const [stats, users, orders] = await Promise.all([
    getStats(),
    getTopUsers(),
    getRecentOrders()
  ]);

  return (
    <>
      <StatsGrid stats={stats} />
      <div className="grid grid-cols-2 gap-8">
        <UsersList users={users} />
        <OrdersList orders={orders} />
      </div>
    </>
  );
}

// 3. Streaming — parallel components that load independently
async function DashboardStreaming() {
  return (
    <>
      <Suspense fallback={<StatsSkeleton />}>
        <StatsSection />
      </Suspense>
      <div className="grid grid-cols-2">
        <Suspense fallback={<UsersSkeleton />}>
          <UsersSection />
        </Suspense>
        <Suspense fallback={<OrdersSkeleton />}>
          <OrdersSection />
        </Suspense>
      </div>
    </>
  );
}

// 4. next/cache: cache() for deduplication
import { cache } from "react";

const getUser = cache(async (id: string) => {
  return prisma.user.findUnique({ where: { id } });
});

// Called in multiple components — only one DB query
```

### Middleware

```typescript
// middleware.ts (runs on edge before every request)
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request });

  // Protect dashboard routes
  if (request.nextUrl.pathname.startsWith("/dashboard")) {
    if (!token) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  // Protect admin routes with role check
  if (request.nextUrl.pathname.startsWith("/admin")) {
    if (!token || token.role !== "admin") {
      return NextResponse.redirect(new URL("/403", request.url));
    }
  }

  // Add security headers to all responses
  const response = NextResponse.next();
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"]
};
```

---

## Interview Preparation

**Q1: What is the difference between Server Components and Client Components in Next.js?**
A: Server Components (default in App Router) run on the server during rendering — they can access databases, secrets, file system directly. They produce no JavaScript bundle impact. They cannot use hooks, browser APIs, or event handlers. Client Components (`"use client"` at top of file) run in the browser — they enable interactivity: hooks, event handlers, browser APIs, state. The tree can mix both: Server Components render Client Components, passing data as props. Client Components cannot import Server Components directly.

**Q2: What is ISR (Incremental Static Regeneration) and when do you use it?**
A: ISR statically generates pages at build time but allows them to be regenerated in the background after a specified interval. In Next.js App Router, use `next: { revalidate: 60 }` in fetch options for time-based revalidation (regenerate if older than 60 seconds). Use `revalidatePath()` or `revalidateTag()` for on-demand revalidation (regenerate when data changes). Use ISR for: product pages, blog posts, marketing pages — content that changes but doesn't need to be real-time fresh for every request.

**Q3: What are Server Actions and how are they better than API routes for form handling?**
A: Server Actions are async functions marked `"use server"` that run on the server when called from Client Components (forms, buttons). Compared to API routes: no need to create a separate API route file, no need to write `fetch()` calls in the client, no need to manually parse request bodies. They're called directly from JSX: `<form action={serverAction}>`. They colocate data mutation logic near the UI. They work even without JavaScript (progressive enhancement). They integrate with `useFormState` for form state management. API routes are still needed for: external API consumers, webhooks, file uploads where streaming matters.

---

## Practical Tasks

### Beginner (10 Tasks)
1. Create a Next.js 14+ project with App Router.
2. Build a root layout with a navigation header.
3. Create a homepage with a hero section using a Server Component.
4. Create a `/about` page.
5. Create a dynamic route `/products/[id]`.
6. Add `not-found.tsx` for 404 handling.
7. Add `loading.tsx` for streaming UI.
8. Create an API route `GET /api/products`.
9. Use `generateMetadata` for dynamic page titles.
10. Add `error.tsx` for error handling.

### Intermediate (10 Tasks)
1. Implement `generateStaticParams` for pre-rendering product pages.
2. Build a Server Action form for creating a product.
3. Add `useFormState` and `useFormStatus` to a Server Action form.
4. Implement middleware for authentication redirects.
5. Use parallel data fetching with `Promise.all` in a Server Component.
6. Implement streaming with `Suspense` and skeleton components.
7. Add `next/image` with proper `sizes` for responsive images.
8. Implement on-demand revalidation with `revalidatePath`.
9. Set up NextAuth.js for authentication.
10. Implement route groups for separate layouts (auth layout vs app layout).

### Advanced (10 Tasks)
1. Build a complete CRUD app with Server Components and Server Actions.
2. Implement optimistic updates with `useOptimistic`.
3. Build a multi-tenant app with middleware-based tenant routing.
4. Implement Parallel Routes for a modal login.
5. Add Edge Runtime middleware with geographic routing.
6. Implement streaming SSR for a data-heavy dashboard.
7. Set up internationalization (i18n) with Next.js.
8. Implement real-time updates using Server-Sent Events from Next.js.
9. Deploy to Vercel with environment variables and edge config.
10. Implement a complete auth flow: registration, verification, login, profile.

---

## Self Assessment
1. What is the App Router file convention for a route page?
2. What is the difference between `loading.tsx` and `Suspense`?
3. What does `"use server"` directive do?
4. What is `revalidatePath()` used for?
5. What is middleware in Next.js?
6. What is `generateStaticParams`?
7. What is the difference between `fetch` with `cache: "force-cache"` and `no-store`?
8. What are route groups `(folder)` used for?
9. What is `useFormStatus()`?
10. What does `notFound()` do?

---

## Cheat Sheet

```typescript
// Route files
// app/page.tsx → / (Server Component by default)
// app/[id]/page.tsx → /:id
// app/api/resource/route.ts → /api/resource

// Server Component fetch
const data = await fetch(url, { next: { revalidate: 60 } });
const data = await fetch(url, { cache: "no-store" });      // no cache
const data = await fetch(url, { next: { tags: ["tag"] } }); // tag-based revalidation

// Revalidate
revalidatePath("/users");
revalidateTag("users");

// Redirect / NotFound
import { redirect, notFound } from "next/navigation";
if (!user) notFound();
redirect("/login");

// Server Action
"use server";
async function createItem(formData: FormData) {
  const name = formData.get("name") as string;
  await db.create({ data: { name } });
  revalidatePath("/items");
}

// Client Component form
"use client";
const [state, action] = useFormState(serverAction, null);
<form action={action}><input name="field" /><button>Submit</button></form>

// Metadata
export const metadata: Metadata = { title: "Page Title", description: "..." };
export async function generateMetadata({ params }): Promise<Metadata> { return {...}; }

// API route
export async function GET(req: NextRequest) { return NextResponse.json(data); }
export async function POST(req: NextRequest) { const body = await req.json(); ... }
```
