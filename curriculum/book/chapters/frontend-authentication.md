# Authentication in the Frontend

> [!GOALS]
> - Distinguish **authentication** (who are you?) from **authorisation** (what may you do?), and explain why the server must enforce both.
> - Design the user-facing flows: sign-up, login, logout, email verification, password reset and multi-factor authentication.
> - Compare **cookie-based sessions** and **token-based** approaches from the front end's point of view, and choose where credentials should live.
> - Understand the browser attacks that shape these choices — **XSS** and **CSRF** — and the cookie attributes and patterns that defend against them.
> - Protect pages, data and actions in a Next.js application, and in a single-page app talking to a separate API.
> - Handle expiring sessions, token refresh, logout and multiple tabs gracefully.
> - Know the role of social login, passkeys and authentication services, and the mistakes that most often lead to breaches.

## Why this matters

Almost every real application has users who must log in: customers viewing their orders, staff managing stock, doctors reading patient records. The moment there are accounts, there is something worth stealing — personal data, money, the ability to act as someone else — and attackers will try.

Authentication is also where front-end developers make some of the most damaging mistakes:

- Hiding an "Admin" link from ordinary users and assuming that makes the admin pages safe — while the API behind them answers anyone who asks.
- Storing a long-lived access token in `localStorage`, where a single cross-site scripting bug lets an attacker copy it and use the account from anywhere.
- A login form that says "No account with that email" for unknown emails, letting attackers discover which of a million leaked emails are your customers.
- Logging out by deleting a cookie in the browser while the session stays valid on the server.
- Ten simultaneous requests all receiving "401 Unauthorized" when an access token expires, each starting its own refresh, invalidating each other and logging the user out.

The core logic of authentication — password hashing, token signing, session storage — lives on the back end, and you will learn it in {{ch:authentication}}, {{ch:sessions}}, {{ch:jwt}} and {{ch:oauth}}. This chapter covers the parts the **front end** owns: the flows users go through, where credentials are kept in the browser, how requests carry them, how pages and actions are protected, and how the browser's own security model shapes every decision.

## The simple idea

Think of staying at a hotel. At the reception desk, you prove who you are with your identity card — that is **authentication**. The receptionist gives you a **key card**. From then on you do not show your identity card again; you tap the key card. The key card opens **your** room and the gym, but not other guests' rooms or the staff office — that is **authorisation**.

The key card is valuable: anyone who has it can enter your room. So you keep it safe, it stops working when you check out, and if you lose it, the hotel cancels it and issues a new one.

In a web application, logging in is showing your identity card, the **session cookie or token** is the key card, and the server is the door lock that checks the card on **every** request.

> [!ANALOGY]
> Logging in is like checking into a hotel: you prove your identity once, receive a key card, and from then on the key card — not your identity card — opens the doors you are allowed through.
>
> **Where the analogy breaks:** a hotel key card is a physical object that is hard to copy secretly. A digital credential is just a string of characters; if malicious code can **read** it, it can copy it instantly and use it from anywhere in the world without you noticing. That is why so much of front-end authentication is about making credentials impossible for scripts to read and useless to steal.

## The proper definition and key words

**Authentication** is verifying the identity of a user (or system). **Authorisation** is deciding whether an authenticated identity may perform a particular action on a particular resource.

The key words:

- **Credential** — something used to prove identity: a password, a one-time code, a passkey, or — after login — a session identifier or token.
- **Session** — the period during which a user stays logged in, and the server-side record of it.
- **Session cookie** — a cookie holding a random **session identifier** that the server looks up to find the user.
- **Access token** — a credential, often a **JWT** (JSON Web Token — {{ch:jwt}}), that a client sends with requests to prove it may access resources. Usually short-lived.
- **Refresh token** — a longer-lived credential used only to obtain new access tokens.
- **Multi-factor authentication (MFA)** — requiring two or more different kinds of proof, such as a password plus a code from a phone.
- **Passkey** — a modern, phishing-resistant credential based on public-key cryptography, stored on the user's device (the WebAuthn standard).
- **XSS** (cross-site scripting) — an attack that runs the attacker's JavaScript in your page ({{ch:html}}).
- **CSRF** (cross-site request forgery) — an attack that tricks a logged-in user's browser into sending an unwanted request to your site.
- **Same-origin policy** — the browser rule that scripts from one origin (scheme + host + port) cannot read data from another origin ({{ch:browser-and-dom}}).

## How it works inside: what happens after login

### Level 2 — The essential cycle

```text
   1. LOGIN
      browser ──POST /login {email, password}──────────────▶ server
                                                            verify password (hash)
                                                            create session / tokens
      browser ◀── Set-Cookie: session=7f3a...; HttpOnly ─── server
                  (or tokens in the response body)

   2. EVERY LATER REQUEST
      browser ──GET /api/orders  Cookie: session=7f3a... ──▶ server
                                                            look up / verify credential
                                                            → who is this? (authentication)
                                                            → may they see these orders? (authorisation)
      browser ◀── 200 orders  (or 401 / 403) ──────────────── server

   3. LOGOUT
      browser ──POST /logout─────────────────────────────▶ server
                                                            destroy session / revoke tokens
      browser ◀── Set-Cookie: session=; Max-Age=0 ────────── server
```

Two facts drive everything else:

1. **HTTP is stateless** ({{ch:how-the-web-works}}): each request stands alone. So after login, every request must carry a credential.
2. **The server decides everything.** The browser is controlled by the user — and, if your page has an XSS bug, by an attacker. Anything the front end does to "protect" data — hiding buttons, redirecting away from pages — is only for user experience. The server must authenticate and authorise **every request**.

### Level 2 — Status codes

Your front end will receive these, and must handle each differently ({{ch:rest-apis}}):

- **401 Unauthorized** — really means "unauthenticated": no valid credential (not logged in, or the session expired). Usual response: try a token refresh if applicable, otherwise send the user to log in.
- **403 Forbidden** — authenticated, but not allowed. Usual response: show "You don't have access", not a login page.
- **404 Not Found** — sometimes returned instead of 403 deliberately, so that unauthorised users cannot even learn that a resource exists.

## The user-facing flows

### Level 3 — Sign-up

Good sign-up forms follow everything in {{ch:forms}}, plus:

- **Email** with `type="email"` and `autocomplete="email"`; **password** with `autocomplete="new-password"`, so password managers offer to generate a strong one.
- **Password rules that help**: a minimum length (current guidance from bodies such as the US National Institute of Standards and Technology favours length — at least 8 characters, ideally allowing much longer passphrases — over complexity rules like "one symbol and one capital"), checking against lists of commonly used and breached passwords (on the server), and a "show password" toggle instead of a "confirm password" field.
- **No silent account enumeration** (see Security below).
- **Email verification**: send a link containing a single-use, expiring token; mark the address verified when it is used. Until then, limit what the account can do.

### Level 3 — Login

```tsx
// fragment
<form method="post" action="/api/login">
  <label htmlFor="email">Email</label>
  <input id="email" name="email" type="email" autoComplete="username" required />

  <label htmlFor="password">Password</label>
  <input id="password" name="password" type="password" autoComplete="current-password" required />

  <button type="submit">Log in</button>
  <a href="/forgot-password">Forgot your password?</a>
</form>
```

- `autocomplete="username"` on the email field and `current-password` on the password let password managers fill both reliably.
- On failure, show one **generic** message — "Email or password is incorrect" — never which of the two was wrong.
- After several failures, the **server** slows down or temporarily blocks further attempts for that account and IP address ({{ch:rate-limiting}}); the front end shows a clear message ("Too many attempts. Please wait 5 minutes or reset your password.").
- After login, redirect to where the user was going — but **only to your own paths**. A `?next=https://evil.example` parameter must be rejected, or attackers will use your login page to bounce users to phishing sites (an open redirect — {{ch:seo}}).

### Level 3 — Logout

Logout must **end the session on the server** (delete the session record or revoke the refresh token) and clear the cookie. In the browser, also clear cached private data — the data-fetching cache and any client stores ({{ch:state-management}}) — so the next person using a shared computer cannot see it. Make logout a `POST` request (a link that logs out on `GET` can be triggered by any page that embeds an image with that URL).

### Level 3 — Password reset

1. The user enters their email. Always respond with the same message: "If an account exists for that address, we've sent a reset link."
2. The server emails a link with a random, single-use token that expires quickly (for example, in 30 minutes), storing only a hash of it.
3. The link opens a page where the user chooses a new password.
4. On success, the server invalidates the token **and all existing sessions** for that account (the reason for a reset is often a suspected compromise), and notifies the user by email that their password changed.

### Level 4 — Multi-factor authentication and passkeys

**MFA** adds a second proof after the password: a time-based one-time code from an authenticator app (the **TOTP** standard), a code sent by SMS (weaker, because phone numbers can be hijacked through SIM swapping), or a security key. The front end shows a second step after the password, with `autocomplete="one-time-code"` on the code input so phones can fill codes from SMS automatically.

**Passkeys**, based on the WebAuthn standard, replace passwords entirely. The device creates a key pair per site; the private key never leaves the device (often protected by a fingerprint or face unlock), and the browser only signs challenges for the **exact website** it was created for. That makes passkeys **resistant to phishing**: a fake site at a look-alike domain cannot obtain a valid signature. Major operating systems and browsers support them, and many large services now offer them. The browser API is `navigator.credentials.create()` and `navigator.credentials.get()`; in practice, teams use a well-tested library or authentication service rather than implementing the protocol by hand.

## Where credentials live: cookies or tokens?

### Level 2 — The threats

Two browser attacks dominate the decision.

**Cross-site scripting (XSS).** If an attacker manages to run JavaScript in your page — through an unescaped review, a compromised npm package, a malicious third-party script ({{ch:html}}, {{ch:browser-and-dom}}) — that script can do anything your own code can: read `localStorage`, read non-`HttpOnly` cookies, and send requests as the user. If it can **read** a credential, it can send it to the attacker's server and use the account from anywhere, for as long as the credential is valid.

**Cross-site request forgery (CSRF).** Browsers automatically attach cookies to requests going to a site — even when the request is started by a **different** site. Without protection, a malicious page could contain a hidden form that posts to `https://cornershop.example/api/change-email`, and the victim's browser would include their session cookie. The attacker cannot **read** the response (the same-origin policy prevents that), but the action happens.

### Level 3 — Option 1: an `HttpOnly` session cookie

The traditional, and for most web applications still the recommended, approach: the server stores the session and sends a cookie containing only a random identifier:

```text
Set-Cookie: session=7f3a9c...; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=1209600
```

Each attribute matters:

| Attribute | Effect | Protects against |
|---|---|---|
| `HttpOnly` | JavaScript cannot read the cookie at all (`document.cookie` does not show it) | Stealing the session through XSS |
| `Secure` | Sent only over HTTPS | Interception on insecure networks |
| `SameSite=Lax` | Not sent on cross-site sub-requests (images, form `POST`s from other sites); sent when the user follows a normal link to your site | Most CSRF |
| `SameSite=Strict` | Never sent on any cross-site request, even following a link | CSRF, more strictly (but a user clicking a link to your site from an email arrives logged out) |
| `Path=/` | Sent for all paths | — |
| `Max-Age` / `Expires` | How long the browser keeps it | Limits lifetime |
| *(no `Domain`)* | Sent only to the exact host that set it, not subdomains | Leaks to other subdomains |

Browsers now treat cookies without a `SameSite` attribute as `Lax` by default, but set it explicitly.

**Strengths:** the credential cannot be read by scripts; the server can revoke a session instantly (delete the record); the browser handles sending it automatically.

**Remaining risks:** XSS can still **use** the session while the page is open (it can make requests that carry the cookie), even though it cannot steal it — so preventing XSS still matters. CSRF requires `SameSite`, plus extra defences for sensitive actions where needed: checking the `Origin` header on the server, or a **CSRF token** — a random value the server puts in the page and requires in every state-changing request ({{ch:sessions}}). Frameworks often provide this; Next.js Server Functions, for example, compare the request's origin with the host.

### Level 3 — Option 2: tokens held by JavaScript

In this approach, the server returns an **access token** (often a JWT) in the response body; the front end stores it and attaches it to requests in an `Authorization: Bearer <token>` header.

```text
GET /api/orders
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Where to keep it?

| Storage | Readable by injected scripts? | Survives reload? | Notes |
|---|---|---|---|
| `localStorage` | **Yes** | Yes | Simple, but an XSS bug exposes the token to theft |
| `sessionStorage` | **Yes** | Per tab only | Same XSS problem |
| In memory (a JavaScript variable) | Harder to reach, but an attacker's script running in the page can still intercept requests | **No** (lost on reload) | Often combined with a refresh token in an `HttpOnly` cookie |

**Strengths:** works naturally for APIs on different domains and for non-browser clients (mobile apps); no automatic sending, so classic CSRF does not apply to the `Authorization` header.

**Weaknesses:** if JavaScript can read the token, XSS can **steal** it; stateless JWTs cannot be revoked instantly before they expire ({{ch:jwt}}), so they must be short-lived — which then requires a refresh mechanism.

### Level 4 — A common hybrid, and the backend-for-frontend pattern

Many applications combine the two:

- A **short-lived access token** (for example, 5–15 minutes), kept **in memory**, sent in the `Authorization` header.
- A **long-lived refresh token** in an **`HttpOnly`, `Secure`, `SameSite`** cookie, restricted to the refresh endpoint's path, used only to obtain new access tokens. The server **rotates** it on each use (issues a new one and invalidates the old), and detects reuse of an old refresh token as a sign of theft.

Increasingly, teams go one step further with a **backend for frontend (BFF)**: the browser talks only to its own server (for example, the Next.js server — {{ch:nextjs}}) using an `HttpOnly` session cookie; that server holds any tokens for downstream APIs and attaches them server-side. Tokens never reach the browser at all. Security guidance for browser-based applications (for example, from the OAuth working group at the IETF) recommends this pattern where possible.

### Level 5 — A decision guide

- **A web app whose pages and API share a site** (a typical Next.js or server-rendered app): use an `HttpOnly`, `Secure`, `SameSite=Lax` **session cookie**. Simple and robust.
- **A single-page app calling an API on another subdomain you control**: cookies still work (with `credentials: "include"` and correct CORS settings — below), or use the hybrid in-memory access token plus `HttpOnly` refresh cookie, or add a BFF.
- **Mobile apps and third-party API clients**: tokens, stored in the platform's secure storage (not available in browsers).
- **Never**: long-lived tokens in `localStorage`.

## Protecting pages, data and actions in Next.js

### Level 3 — Layers of checks

In a server-rendered application ({{ch:nextjs}}), protect at several layers — but understand which ones are **security** and which are **convenience**:

```text
   proxy.ts            optimistic: "is there a session cookie?"  → redirect to /login
        │              (fast, but NOT a security boundary)
        ▼
   page / layout       verify the session; redirect if missing
        │
        ▼
   data access layer   verify session AND permission for this data  ← the real boundary
        │
        ▼
   Server Functions /  verify session AND permission for this action  ← the real boundary
   Route Handlers
```

### Level 3 — A data access layer

The most robust pattern is to put **every** read and write of protected data behind functions that check the session themselves:

```ts
// fragment
// lib/session.ts
import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { findSessionByToken } from "./session-store";

export type Session = { userId: string; role: "customer" | "staff" | "admin" };

export const verifySession = cache(async (): Promise<Session> => {
  const token = (await cookies()).get("session")?.value;
  const session = token ? await findSessionByToken(token) : null;
  if (!session) redirect("/login");
  return session;
});
```

```ts
// fragment
// lib/orders.ts
import "server-only";
import { verifySession } from "./session";
import { db } from "./db";

export async function getMyOrders() {
  const session = await verifySession();
  return db.order.findMany({
    where: { customerId: session.userId },          // only this user's orders
    select: { id: true, createdAt: true, status: true, totalPaisa: true },
  });
}

export async function getOrderForStaff(orderId: string) {
  const session = await verifySession();
  if (session.role !== "staff" && session.role !== "admin") throw new Error("Forbidden");
  return db.order.findUnique({ where: { id: orderId } });
}
```

Walk through it:

- `verifySession` reads the cookie on the server (`cookies()` from `next/headers`), looks up the session, and redirects to login if there is none. `server-only` prevents it from ever being imported into client code.
- `cache()` from React makes repeated calls within **one request** reuse the same result, so many components can call it without repeated database lookups. (This per-request deduplication is unrelated to the cross-request caching of {{ch:nextjs}}; session data must never go into a shared cache.)
- `getMyOrders` filters by the **session's** user id — never by an id from the URL or the request body. Using a client-supplied user id is the classic **insecure direct object reference** (IDOR) bug: change `?userId=17` to `?userId=18` and read someone else's orders.
- `select` returns only the fields the UI needs, so a page cannot accidentally pass sensitive fields to a Client Component ({{ch:nextjs}}).
- Role checks live next to the data, so every page, Server Function and Route Handler that uses `getOrderForStaff` is protected — including ones written next year by someone who forgot about permissions.

### Level 3 — Showing UI by role

```tsx
// fragment
// app/account/page.tsx (Server Component)
import { verifySession } from "@/lib/session";
import { getMyOrders } from "@/lib/orders";

export default async function AccountPage() {
  const session = await verifySession();
  const orders = await getMyOrders();
  return (
    <>
      <h1>Your orders</h1>
      {/* ...list orders... */}
      {session.role === "admin" && <a href="/admin">Admin dashboard</a>}
    </>
  );
}
```

Hiding the admin link from customers is good user experience — but the `/admin` pages and actions must still check the role themselves. Treat every role-based condition in the UI as **cosmetic**, and every check in the data layer as **security**.

### Level 4 — Permission logic in one place

As roles multiply, write permission rules once, as a pure function used on both server (to enforce) and client (to decide what to show):

```ts
type Role = "customer" | "staff" | "admin";
type User = { id: string; role: Role };
type Order = { id: string; customerId: string; status: "placed" | "shipped" | "delivered" };
type Action = "view" | "cancel" | "refund";

function can(user: User, action: Action, order: Order): boolean {
  const isOwner = order.customerId === user.id;
  switch (action) {
    case "view":
      return isOwner || user.role !== "customer";
    case "cancel":
      return (isOwner && order.status === "placed") || user.role === "admin";
    case "refund":
      return user.role === "admin" && order.status !== "placed";
  }
}

const customer: User = { id: "u1", role: "customer" };
const staff: User = { id: "s1", role: "staff" };
const admin: User = { id: "a1", role: "admin" };
const order: Order = { id: "o9", customerId: "u1", status: "placed" };
const shipped: Order = { ...order, status: "shipped" };

console.log(can(customer, "view", order), can({ id: "u2", role: "customer" }, "view", order));
console.log(can(customer, "cancel", order), can(customer, "cancel", shipped));
console.log(can(staff, "refund", shipped), can(admin, "refund", shipped));
```

**Output:**

```text
true false
true false
false true
```

- A customer may view their own order but not another customer's.
- A customer may cancel only while the order is still "placed".
- Only an admin may refund, and only after the order has moved on.
- Because `can` is pure, it is easy to test exhaustively ({{ch:testing}}). The server calls it before every action; the UI calls it to decide which buttons to show. This is a simple form of **role-based access control** (RBAC), with an ownership rule added — real systems may grow into **attribute-based** rules or use a policy library, but the principle stays: one authoritative definition, enforced on the server.

## Single-page apps calling an API

### Level 3 — Sending cookies across origins

When a React single-page app at `https://app.cornershop.example` calls an API at `https://api.cornershop.example`, they are different origins. To send cookies:

```ts
// fragment
const response = await fetch("https://api.cornershop.example/orders", {
  credentials: "include",           // send and accept cookies for the other origin
});
```

and the API must respond with **CORS** headers ({{ch:express}}) that explicitly allow it:

```text
Access-Control-Allow-Origin: https://app.cornershop.example
Access-Control-Allow-Credentials: true
```

The allowed origin must be the **exact** origin — `*` is not permitted together with credentials, and reflecting any requesting origin back would let any website make authenticated requests as your users. Because both are subdomains of the same **site** (`cornershop.example`), a `SameSite=Lax` cookie is still sent — `SameSite` is about **sites** (the registrable domain), while CORS is about **origins**.

### Level 4 — Handling expiry and refreshing safely

With short-lived access tokens, requests will regularly fail with 401 when the token expires. A robust client:

1. Attaches the current access token to each request.
2. On a 401, calls the refresh endpoint **once**, even if many requests failed at the same moment.
3. Retries the failed requests with the new token.
4. If refreshing fails, clears state and sends the user to log in.

Step 2 matters more than it seems. If ten parallel requests each trigger a refresh, and the server rotates refresh tokens, the first refresh invalidates the token the other nine are using — and the user is logged out. The fix is a **single-flight** refresh: share one in-progress refresh promise among all callers.

```ts
let accessToken = "expired-token";
let refreshCalls = 0;

// Fake server: accepts only "fresh-token"
async function fakeApi(path: string, token: string): Promise<{ status: number; body?: string }> {
  await new Promise((r) => setTimeout(r, 5));
  return token === "fresh-token" ? { status: 200, body: `data for ${path}` } : { status: 401 };
}

async function fakeRefresh(): Promise<string> {
  refreshCalls++;
  await new Promise((r) => setTimeout(r, 20));
  return "fresh-token";
}

let refreshing: Promise<string> | null = null;

function refreshOnce(): Promise<string> {
  refreshing ??= fakeRefresh().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

async function apiFetch(path: string): Promise<string> {
  let response = await fakeApi(path, accessToken);
  if (response.status === 401) {
    accessToken = await refreshOnce();
    response = await fakeApi(path, accessToken);
  }
  if (response.status !== 200) throw new Error(`Request failed: ${response.status}`);
  return response.body!;
}

const results = await Promise.all(["/orders", "/profile", "/cart", "/addresses"].map(apiFetch));
console.log(results);
console.log(`refresh calls: ${refreshCalls}`);
```

**Output:**

```text
[
  'data for /orders',
  'data for /profile',
  'data for /cart',
  'data for /addresses'
]
refresh calls: 1
```

Walk through it:

- Four requests start together with an expired token; all four receive 401.
- The first to call `refreshOnce` starts the refresh and stores its **promise** in `refreshing` (`??=` assigns only if empty — {{ch:design-patterns}}). The other three find the promise already there and **await the same one**.
- When the refresh completes, all four retry with the new token, and `finally` clears `refreshing` for the next expiry.
- One refresh, four successful results. (Real implementations also retry each request **once** only, to avoid loops, and handle refresh failure by logging out. Libraries for data fetching and HTTP clients often provide interceptors for this.)

## Sessions across time and tabs

- **Expiry UX.** When a session expires while the user is filling in a long form, do not discard their work: save a draft ({{ch:forms}}), ask them to log in again (ideally in a dialog), and resume.
- **Idle timeouts** for sensitive applications (banking, health): log out after a period of inactivity, with a warning first. Consumer shops typically keep sessions much longer.
- **Re-authentication for sensitive actions.** Ask for the password (or a passkey) again before changing the email address, the password, payment methods or MFA settings, even within a valid session.
- **Multiple tabs.** When the user logs out in one tab, other tabs should notice. The browser's `storage` event or `BroadcastChannel` ({{ch:state-management}}) can announce "logged out" to other tabs, which then clear their state and redirect.
- **"Log out of all devices"** — server-side deletion of all the user's sessions, offered in account settings and done automatically after a password reset.

## Social login and authentication services

**Social login** ("Continue with Google") uses **OAuth 2.0** and **OpenID Connect**: the user is redirected to the identity provider, signs in there, and is redirected back with a code that your server exchanges for identity information. The details — authorisation codes, PKCE, state parameters, ID tokens — are in {{ch:oauth}}. For the front end, the important points are: always use the authorisation-code flow with **PKCE**; validate the `state` parameter to prevent login CSRF; and decide how to link a social identity to an existing account with the same email (never automatically, unless the provider has verified the email).

Building authentication securely is a lot of work. Many teams use:

- **Libraries** that run inside your application and handle sessions, OAuth providers, CSRF and cookies (Auth.js and Better Auth are popular in the Next.js world), with your own database.
- **Hosted identity services** (for example, Auth0, Clerk, Amazon Cognito, Firebase Authentication, Supabase Auth) that provide login pages, MFA, passkeys, social login and user management, at a cost and with some lock-in.

Using a well-maintained library or service is usually wiser than writing password storage, token rotation and OAuth flows yourself. You still need to understand everything in this chapter to integrate them correctly — the data access layer and authorisation checks remain **your** job.

## From beginner to enterprise

**Level 3 — first login system.** A library or service for authentication; `HttpOnly`, `Secure`, `SameSite` session cookies; generic error messages; logout that ends the server session.

**Level 4 — a real application.** A data access layer that checks sessions and permissions; role-based UI that is cosmetic only; MFA option; password reset that invalidates sessions; rate limiting on login; expiry handled gracefully; private caches cleared on logout.

**Level 5 — professional practice.** Passkeys offered; refresh-token rotation with reuse detection (if using tokens) or a BFF; centralised permission rules with tests; security headers and a Content Security Policy to reduce XSS risk ({{ch:application-security}}); audit logs for sensitive actions; regular dependency updates.

**Level 6 — large organisations.** Single sign-on (SSO) for employees through an identity provider using OpenID Connect or SAML; separate identity platforms for customers; step-up authentication based on risk (new device, unusual location); fine-grained authorisation services; compliance requirements (PCI DSS for payments, health-data regulations) shaping session lifetimes and logging.

## Real-world use cases

### A shop with customers and staff

- **Design:** Next.js with an `HttpOnly` session cookie; one `verifySession`; data functions that filter by the session's user id for customers and check roles for staff; admin Server Functions that re-check the role; MFA required for staff accounts.
- **Why:** customers get a simple, long session; staff — who can see everyone's orders — get stronger protection.

### A React SPA with a separate API

- **Design:** the API at `api.` subdomain issues an `HttpOnly`, `SameSite=Lax` session cookie scoped to the API host; the SPA uses `credentials: "include"`; CORS allows exactly the SPA's origin with credentials; state-changing endpoints check the `Origin` header or require a CSRF token.
- **Alternative:** a small BFF on the SPA's own origin that proxies API calls and holds credentials server-side.

## Common mistakes

### Beginner: front-end-only protection

Hiding links and redirecting in the browser while the API does no checks. **Fix:** every endpoint, page and Server Function verifies the session and permissions.

### Beginner: tokens in `localStorage`

**Consequence:** any XSS becomes account theft. **Fix:** `HttpOnly` cookies or a BFF; short-lived in-memory tokens if you must use tokens in the browser.

### Beginner: revealing which credential was wrong

**Consequence:** attackers learn which emails have accounts. **Fix:** generic messages; the same response time and wording for "unknown email" and "wrong password".

### Intermediate: trusting ids from the client

`/api/orders?userId=18`. **Fix:** take the user id from the session; check ownership for every resource.

### Intermediate: logout only in the browser

**Fix:** destroy the server session or revoke tokens; clear client caches.

### Intermediate: open redirects after login

**Fix:** allow only relative paths on your own site for the `next` parameter.

### Production: refresh storms

Many parallel refreshes invalidating each other. **Fix:** single-flight refresh.

### Production: CORS misconfiguration

Reflecting any origin with credentials allowed. **Fix:** an explicit allow-list of origins.

### Enterprise: no re-authentication for sensitive changes

A stolen session can change the email address and take over the account permanently. **Fix:** require the password, a passkey or MFA again for account-level changes, and notify the old email address.

## Debugging and troubleshooting

- **"Logged in, but the next request is anonymous":** the cookie was not set or not sent. In the browser's Application panel, check whether the cookie exists and its attributes; in the Network panel, check whether the request includes it. Common causes: `Secure` cookie on `http://localhost` in some setups, wrong `Domain` or `Path`, missing `credentials: "include"` for cross-origin requests, `SameSite=Strict` blocking it after a redirect from another site.
- **CORS errors with credentials:** `Access-Control-Allow-Origin: *` cannot be used with credentials; the origin must match exactly, and `Access-Control-Allow-Credentials: true` must be present.
- **Users logged out randomly:** refresh-token rotation races (single-flight refresh), server clocks out of sync for token expiry, or sessions stored in memory on several servers behind a load balancer (sessions must live in a shared store such as Redis — {{ch:sessions}}, {{ch:redis}}).
- **403 where 401 was expected (or the reverse):** check the API's distinction between unauthenticated and forbidden, and make the front end handle each.
- **Hydration mismatch on auth-dependent UI:** the server rendered "Log in" but the client rendered "Hi, Sara"; read the session on the server and render consistently ({{ch:nextjs}}).

## Security summary

- The server authenticates and authorises **every** request; front-end checks are for usability only.
- Prefer `HttpOnly`, `Secure`, `SameSite` session cookies, or a BFF; never long-lived tokens readable by JavaScript.
- Prevent XSS with escaping, sanitisation and a Content Security Policy; prevent CSRF with `SameSite`, origin checks and CSRF tokens where needed ({{ch:application-security}}).
- Avoid account enumeration; rate-limit login, sign-up and reset endpoints.
- Validate redirect targets; use exact CORS origins.
- Offer MFA and passkeys; require re-authentication for sensitive changes.
- End sessions on the server at logout and after password changes; clear client caches.
- Prefer proven libraries or services over hand-written authentication.

## How a senior engineer thinks about this

- **Assume the browser is hostile.** Anything in it can be read, changed or replayed; the server is the only place decisions are made.
- **Make stolen credentials hard to get and short-lived.** `HttpOnly` cookies, short access tokens, rotation, revocation.
- **Put authorisation next to the data.** A data access layer means forgetting a check in one page does not leak data.
- **Design flows for real people.** Password managers, passkeys, clear messages, preserved work on expiry — security that frustrates users gets bypassed.
- **Buy the hard parts.** Well-reviewed libraries and services for cryptography and protocols; their own effort goes into authorisation, which only they can get right for their domain.

## Exercises

### Exercise 1 — Choose the storage

**Objective:** practise credential-storage decisions.
**What to do:** for each situation, recommend where the credential should live and why: (1) a Next.js shop where pages and API are on the same domain; (2) a React SPA at `app.clinic.example` calling `api.clinic.example`; (3) an internal admin tool used only on company laptops, built quickly by a junior developer who stored a JWT valid for 30 days in `localStorage`; (4) an Android app calling the same API.

<details>
<summary>Show the solution</summary>

1. **`HttpOnly`, `Secure`, `SameSite=Lax` session cookie**, verified in the data access layer and Server Functions. Simple and safe.
2. **A session cookie set by the API** (`HttpOnly`, `Secure`, `SameSite=Lax`), sent with `credentials: "include"`, CORS restricted to `https://app.clinic.example` with credentials, plus origin checks or CSRF tokens on state-changing endpoints. Alternatively a BFF on `app.` that holds tokens server-side. Health data justifies the extra care, MFA and shorter sessions.
3. **Replace it**: a 30-day token in `localStorage` turns any XSS (or any malicious browser extension) into a month of access to admin functions. Move to an `HttpOnly` session cookie (or short-lived in-memory access token with an `HttpOnly` refresh cookie), add MFA for admins, and ideally put the tool behind the company's single sign-on.
4. **Tokens** (access + refresh) stored in the platform's secure storage (Android Keystore-backed storage), since the app is not a browser and cookies are less natural; short-lived access tokens with rotation.

</details>

### Exercise 2 — Fix the authorisation bug

**Objective:** practise finding IDOR and front-end-only protection.
**Starting point:**

```ts
// fragment
// app/api/orders/route.ts
export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId");
  const orders = await db.order.findMany({ where: { customerId: userId! } });
  return NextResponse.json(orders);
}
```

The orders page calls `/api/orders?userId=${currentUser.id}`. What is wrong, and how do you fix it?

<details>
<summary>Show the solution</summary>

**Problems:** anyone can call the endpoint with any `userId` — even without logging in — and receive that customer's orders (an **IDOR** vulnerability). It also returns entire order records, possibly including fields the client should not see.

```ts
// fragment
// app/api/orders/route.ts
import { NextResponse } from "next/server";
import { getMyOrders } from "@/lib/orders";

export async function GET() {
  const orders = await getMyOrders(); // verifies the session; filters by session.userId; selects safe fields
  return NextResponse.json(orders);
}
```

**Walkthrough:** the user's identity now comes **only** from the server-side session; the client cannot choose whose orders to read. The data access layer function also limits the fields returned. If staff need to read any customer's orders, that is a **separate** function with an explicit role check. A test should assert that a request without a session gets 401, and that user A cannot read user B's orders ({{ch:testing}}).

</details>

### Exercise 3 — Debug the random logouts

**Objective:** practise diagnosing token refresh problems.
**The scenario:** a SPA uses 10-minute access tokens and rotating refresh tokens. Users complain they are "randomly logged out", especially on the dashboard page, which loads six widgets at once. Server logs show bursts of refresh requests, most rejected as "refresh token already used". Explain and fix.

<details>
<summary>Show the solution</summary>

**Cause:** when the access token expires, the six widget requests all get 401 at once and **each** calls the refresh endpoint with the same refresh token. Rotation means the first call succeeds and invalidates that refresh token; the other five present an already-used token — which the server correctly treats as possible theft, revoking the session. The user is logged out.

**Fix:** a **single-flight refresh** in the client (as in this chapter): the first 401 starts one refresh and stores its promise; all other failing requests await the same promise, then retry once with the new token. Additionally:
- Refresh **proactively** shortly before expiry when the app is active, so bursts of 401s are rare.
- Coordinate across **tabs** (for example with `BroadcastChannel` or a lock via the Web Locks API), since two tabs can race in the same way.
- On the server, consider a short grace period during which the immediately previous refresh token is still accepted, to tolerate network retries — a trade-off between robustness and theft detection.

</details>

### Exercise 4 — Production scenario: secure account settings

**Objective:** design a sensitive flow end to end.
**The scenario:** customers can change their email address, password and saved delivery addresses in an account settings page. Design the flows and protections.

<details>
<summary>Show the solution</summary>

**Delivery addresses** (moderately sensitive): normal session; Server Functions verify the session and that the address belongs to the user; validate with a schema ({{ch:forms}}).

**Password change:**
1. Require the **current password** (or passkey/MFA) even within a valid session.
2. Validate the new password (length, breached-password check on the server).
3. Hash and store; **invalidate all other sessions**, keeping (or re-issuing) the current one.
4. Email the user: "Your password was changed. If this wasn't you, reset it here."

**Email change:**
1. Require re-authentication.
2. Send a verification link to the **new** address; do not change anything until it is clicked.
3. Notify the **old** address, with a link to undo or report it, valid for some days.
4. After the change, keep the old address in an audit log.

**Across all of them:** rate-limit; log security events (who, when, from where — without logging the passwords themselves — {{ch:logging}}); CSRF protection through `SameSite` cookies and origin checks; show clear confirmations; re-render with fresh data after changes and clear any cached account data in the client.

</details>

## Summary

**Authentication** proves who a user is; **authorisation** decides what they may do. HTTP is stateless, so after login every request carries a credential — and because the browser is under the user's (or an attacker's) control, the **server must check both on every request**. Front-end protections — hidden links, client-side redirects — are only for usability.

Design flows people can complete: sign-up with password-manager support and email verification; login with generic error messages and rate limiting; logout that ends the server session and clears client caches; password reset with single-use, expiring links that end other sessions; MFA and phishing-resistant **passkeys**.

Credential storage is shaped by **XSS** and **CSRF**. Prefer an **`HttpOnly`, `Secure`, `SameSite`** session cookie — unreadable by scripts and revocable — or a **backend for frontend** that keeps tokens server-side; if tokens must live in the browser, keep access tokens short-lived and in memory with an `HttpOnly` refresh cookie, rotated, and refreshed with a **single-flight** mechanism. Never put long-lived tokens in `localStorage`. In Next.js, verify sessions in a **data access layer** that filters by the session's user id and checks permissions, treat `proxy.ts` and role-based UI as conveniences, and keep permission rules in one pure, tested function. For cross-origin SPAs, use `credentials: "include"` with exact CORS origins. Handle expiry, multiple tabs and re-authentication for sensitive changes, and rely on well-maintained libraries or services for the cryptographic and protocol work.

## Key terms

- **Authentication** — Verifying the identity of a user or system.
- **Authorisation** — Deciding whether an authenticated identity may perform an action on a resource.
- **Credential** — Information used to prove identity, such as a password, a code, a passkey or a session identifier.
- **Session** — The period a user stays logged in, and the server's record of it.
- **Session cookie** — A cookie containing a random identifier that the server uses to look up a user's session.
- **HttpOnly** — A cookie attribute that prevents JavaScript from reading the cookie.
- **Secure (cookie)** — A cookie attribute that ensures the cookie is sent only over HTTPS.
- **SameSite** — A cookie attribute controlling whether the cookie is sent with requests started by other sites.
- **Access token** — A credential, often short-lived, sent with requests to prove permission to access resources.
- **Refresh token** — A longer-lived credential used only to obtain new access tokens.
- **Token rotation** — Issuing a new refresh token each time one is used and invalidating the old one.
- **Backend for frontend (BFF)** — A server dedicated to one front end that holds credentials and calls other APIs on its behalf.
- **Cross-site scripting (XSS)** — An attack in which malicious script runs inside a trusted page.
- **Cross-site request forgery (CSRF)** — An attack that makes a logged-in user's browser send an unwanted request to a site.
- **CSRF token** — A secret value included in state-changing requests to prove they came from the site's own pages.
- **Same-origin policy** — The browser rule preventing scripts from one origin reading data from another.
- **CORS (cross-origin resource sharing)** — Headers by which a server allows specific other origins to read its responses.
- **Multi-factor authentication (MFA)** — Requiring two or more different kinds of proof of identity.
- **TOTP** — A standard for time-based one-time codes generated by authenticator apps.
- **Passkey** — A phishing-resistant credential based on a public–private key pair stored on the user's device.
- **WebAuthn** — The web standard that lets browsers create and use public-key credentials such as passkeys.
- **Account enumeration** — Discovering which accounts exist from differences in a system's responses.
- **Insecure direct object reference (IDOR)** — A vulnerability where a user can access another user's data by changing an identifier in a request.
- **Data access layer** — Server-side functions through which all protected data is read and written, each checking authentication and authorisation.
- **Role-based access control (RBAC)** — Granting permissions according to users' roles.
- **Single-flight refresh** — Ensuring that concurrent requests share one token refresh instead of starting several.
- **Re-authentication** — Asking a logged-in user to prove their identity again before a sensitive action.
- **Single sign-on (SSO)** — Logging in once with an identity provider to access many applications.

## What comes next

Authentication decides who can use your application. The last chapter of Part VI, {{ch:accessibility}}, is about making sure **everyone** can: people who are blind or have low vision, who cannot use a mouse, who are deaf, or who have cognitive or motor disabilities. It brings together and extends the accessibility practices from every chapter so far into a complete professional discipline.
