# Phase 4 — Chapter 8: Frontend Authentication

---

## Chapter Overview

Frontend authentication integrates with backend auth APIs — handling login/logout flows, JWT token storage, session management, protected routes, and social OAuth. This chapter covers authentication from the frontend perspective, complementing the backend auth chapters.

**Topics:**
- JWT storage: localStorage vs. httpOnly cookie (security trade-offs)
- NextAuth.js v5 (Auth.js) for Next.js
- Protected routes
- Role-based access control (RBAC) on the frontend
- Social OAuth flows
- Token refresh

---

## Beginner Theory

### JWT Storage Security Trade-offs

```
Option 1: localStorage
  ✓ Simple implementation
  ✓ Available across browser tabs
  ✗ XSS vulnerable — any injected JS can read it
  ✗ Never safe for production with sensitive tokens

Option 2: httpOnly Cookie (RECOMMENDED)
  ✓ Not accessible by JavaScript — XSS safe
  ✓ Automatically sent with requests
  ✗ CSRF vulnerable — mitigate with SameSite=Strict or CSRF token
  ✗ Works only for same-site (or with CORS credentials config)

Option 3: sessionStorage
  ✓ Cleared when tab closes
  ✗ Still XSS vulnerable
  ✗ Not shared across tabs

Best practice: httpOnly, Secure, SameSite=Strict cookie
```

---

## Basic Examples

### NextAuth.js v5 (Auth.js) Setup

```typescript
// auth.ts (root level)
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GitHub      from "next-auth/providers/github";
import Google      from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1)
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),

  session: { strategy: "jwt" },

  pages: {
    signIn:  "/login",
    signOut: "/logout",
    error:   "/auth/error"
  },

  providers: [
    Credentials({
      async authorize(credentials) {
        const result = loginSchema.safeParse(credentials);
        if (!result.success) return null;

        const user = await prisma.user.findUnique({
          where:  { email: result.data.email },
          select: { id: true, name: true, email: true, passwordHash: true, role: true }
        });

        if (!user?.passwordHash) return null;

        const valid = await bcrypt.compare(result.data.password, user.passwordHash);
        if (!valid) return null;

        return { id: user.id, name: user.name, email: user.email, role: user.role };
      }
    }),
    GitHub({ clientId: process.env.GITHUB_ID, clientSecret: process.env.GITHUB_SECRET }),
    Google({ clientId: process.env.GOOGLE_ID,  clientSecret: process.env.GOOGLE_SECRET  })
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id   = user.id;
        token.role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id   = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    }
  }
});

// app/api/auth/[...nextauth]/route.ts
import { handlers } from "@/auth";
export const { GET, POST } = handlers;

// Extend NextAuth types
declare module "next-auth" {
  interface Session {
    user: { id: string; role: string; name: string; email: string; }
  }
  interface User { role: string; }
}
```

### Protected Routes

```typescript
// middleware.ts — server-side route protection (runs before page renders)
import { auth }        from "@/auth";
import { NextResponse } from "next/server";

export default auth(function middleware(req) {
  const isLoggedIn = !!req.auth;
  const path       = req.nextUrl.pathname;

  // Public routes (accessible to everyone)
  const publicRoutes = ["/", "/about", "/pricing", "/login", "/register"];
  if (publicRoutes.some(r => path === r || path.startsWith(r + "/"))) {
    return NextResponse.next();
  }

  // Auth routes — redirect logged-in users to dashboard
  if (["/login", "/register"].includes(path) && isLoggedIn) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Protected routes — redirect to login
  if (!isLoggedIn) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", path);
    return NextResponse.redirect(loginUrl);
  }

  // Admin-only routes
  if (path.startsWith("/admin") && req.auth?.user?.role !== "admin") {
    return NextResponse.redirect(new URL("/403", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next|favicon.ico|.*\\..*).*)"]
};

// Server Component — read session
// app/dashboard/page.tsx
import { auth }     from "@/auth";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  return <div>Hello, {session.user.name}!</div>;
}
```

### Client-Side Auth State

```typescript
// Client Component — use session
"use client";
import { useSession, signIn, signOut } from "next-auth/react";

function AuthButton() {
  const { data: session, status } = useSession();

  if (status === "loading") return <div className="w-8 h-8 skeleton rounded-full" />;

  if (!session) {
    return (
      <div className="flex gap-2">
        <button onClick={() => signIn()}>Sign in</button>
        <a href="/register">Create account</a>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <img src={session.user.image ?? "/avatar.png"} alt="" className="w-8 h-8 rounded-full" />
      <span>{session.user.name}</span>
      <button onClick={() => signOut({ callbackUrl: "/" })}>Sign out</button>
    </div>
  );
}

// app/providers.tsx — wrap app with SessionProvider
"use client";
import { SessionProvider } from "next-auth/react";

export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
```

---

## Intermediate Concepts

### RBAC on Frontend

```typescript
// hooks/usePermissions.ts
import { useSession } from "next-auth/react";

const ROLE_PERMISSIONS = {
  admin:   ["users:read", "users:write", "users:delete", "posts:read", "posts:write", "posts:delete", "settings:read", "settings:write"],
  editor:  ["posts:read", "posts:write"],
  viewer:  ["posts:read"]
} as const;

type Permission = string;
type Role = keyof typeof ROLE_PERMISSIONS;

export function usePermissions() {
  const { data: session } = useSession();
  const role = (session?.user?.role as Role) || "viewer";
  const permissions = ROLE_PERMISSIONS[role] ?? [];

  return {
    role,
    can:    (permission: Permission)    => permissions.includes(permission as any),
    canAny: (perms: Permission[])       => perms.some(p => permissions.includes(p as any)),
    canAll: (perms: Permission[])       => perms.every(p => permissions.includes(p as any))
  };
}

// Usage in components
function AdminPanel() {
  const { can } = usePermissions();

  return (
    <div>
      {can("users:write") && <CreateUserButton />}
      {can("users:delete") && <DeleteUserButton />}
      {can("settings:write") && <SettingsLink />}
    </div>
  );
}

// Permission gate component
function PermissionGate({ require: perm, fallback = null, children }) {
  const { can } = usePermissions();
  if (!can(perm)) return fallback;
  return children;
}

// Usage
<PermissionGate require="users:delete" fallback={<Tooltip>Insufficient permissions</Tooltip>}>
  <DeleteButton onClick={handleDelete} />
</PermissionGate>
```

### Manual JWT Refresh (Without NextAuth)

```typescript
// lib/apiClient.ts — Axios with token refresh interceptor
import axios from "axios";

const api = axios.create({ baseURL: "/api", withCredentials: true });

let refreshPromise: Promise<string> | null = null;

api.interceptors.response.use(
  response => response,
  async error => {
    const original = error.config;

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;

      // Deduplicate concurrent refresh calls
      if (!refreshPromise) {
        refreshPromise = axios
          .post("/api/auth/refresh", {}, { withCredentials: true })
          .then(res => res.data.accessToken)
          .finally(() => { refreshPromise = null; });
      }

      try {
        const accessToken = await refreshPromise;
        original.headers["Authorization"] = `Bearer ${accessToken}`;
        return api(original);  // retry with new token
      } catch {
        // Refresh failed — logout
        window.location.href = "/login?reason=session_expired";
      }
    }

    return Promise.reject(error);
  }
);

export default api;
```

---

## Interview Preparation

**Q1: Why should JWT tokens be stored in httpOnly cookies instead of localStorage?**
A: localStorage is accessible by JavaScript running on the page — any XSS vulnerability allows an attacker to steal the token with `localStorage.getItem("token")`. httpOnly cookies cannot be accessed by JavaScript at all (even on the same origin), so XSS cannot steal them. The main risk with cookies is CSRF — mitigated by setting `SameSite=Strict` or `SameSite=Lax`. With `SameSite=Strict`, cookies are only sent for same-site requests, making CSRF attacks impossible. For most apps, `httpOnly + Secure + SameSite=Strict` is the gold standard.

**Q2: How does NextAuth.js protect routes and how does it differ from a client-side check?**
A: NextAuth middleware runs on the Edge before the page renders — if the user is not authenticated, they're redirected to `/login` before any HTML is sent. This is true server-side protection. Client-side checks (`useSession()` in a component) run after the page loads — the page briefly renders for unauthenticated users before redirecting. This can leak information and cause flash of unauthorized content. Always use middleware for actual route protection; use `useSession()` for UI-level decisions (show/hide buttons).

**Q3: What is PKCE and why is it used in OAuth?**
A: PKCE (Proof Key for Code Exchange) prevents authorization code interception attacks in OAuth flows. The client generates a random `code_verifier`, hashes it to a `code_challenge`, sends the challenge with the auth request, and the verifier with the token request. The authorization server verifies they match. Without PKCE, a malicious app that intercepts the authorization code (via deep link redirect on mobile, or in a public client) could exchange it for tokens. PKCE ensures only the original client can complete the exchange. Required for public clients (SPAs, mobile apps). NextAuth/Auth.js handles PKCE automatically for all OAuth providers.

---

## Practical Tasks

### Beginner (10 Tasks)
1. Set up NextAuth.js in a Next.js app.
2. Add Credentials provider for email/password login.
3. Add GitHub OAuth provider.
4. Access the session in a Server Component with `auth()`.
5. Access the session in a Client Component with `useSession()`.
6. Build a login page with `signIn()`.
7. Build a logout button with `signOut()`.
8. Add `SessionProvider` to the app's provider wrapper.
9. Redirect after login to the original URL with `callbackUrl`.
10. Show user avatar and name in a navigation bar.

### Intermediate (10 Tasks)
1. Set up middleware for protected route redirection.
2. Protect admin routes with role check in middleware.
3. Add role to JWT token via `callbacks.jwt`.
4. Build a custom login page with error messages.
5. Add Google OAuth provider alongside Credentials.
6. Implement `usePermissions` hook for RBAC.
7. Build a `PermissionGate` component.
8. Add `PrismaAdapter` for database session/account storage.
9. Implement email verification on registration.
10. Add "Remember me" with longer session expiry.

### Advanced (10 Tasks)
1. Implement token refresh with Axios interceptor.
2. Build a complete forgot password / reset password flow.
3. Add 2FA (TOTP) with `otplib`.
4. Implement SSO with SAML provider.
5. Add session activity timeout (auto-logout after inactivity).
6. Implement refresh token rotation with revocation.
7. Add account linking (connect multiple OAuth providers).
8. Implement audit logging of all auth events.
9. Add rate limiting to login endpoint to prevent brute force.
10. Pass all OWASP ASVS Level 2 authentication requirements.

---

## Self Assessment
1. What is the difference between authentication and authorization?
2. Why are httpOnly cookies more secure than localStorage for JWTs?
3. What is CSRF and how does `SameSite=Strict` prevent it?
4. What does NextAuth's `callbacks.jwt` do?
5. What is `useSession()` used for?
6. What is the difference between server-side and client-side route protection?
7. What is PKCE?
8. What is a refresh token?
9. What is RBAC?
10. What does `withCredentials: true` in Axios do?

---

## Cheat Sheet

```typescript
// NextAuth setup
export const { handlers, auth, signIn, signOut } = NextAuth({ providers: [...], callbacks: {...} });

// Server Component
const session = await auth();
if (!session) redirect("/login");

// Client Component
const { data: session, status } = useSession();
// status: "loading" | "authenticated" | "unauthenticated"

// Sign in/out
await signIn("credentials", { email, password, redirect: false });
await signIn("github");
await signOut({ callbackUrl: "/" });

// Middleware
export default auth(function middleware(req) {
  if (!req.auth && req.nextUrl.pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
});

// JWT callbacks — add role to token/session
callbacks: {
  jwt:     ({ token, user })    => user ? { ...token, role: user.role } : token,
  session: ({ session, token }) => ({ ...session, user: { ...session.user, role: token.role } })
}
```
