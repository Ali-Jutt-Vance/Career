# Sessions and Cookies

> [!GOALS]
> - Explain why a stateless protocol needs sessions, and how cookies make them work.
> - Read and write cookies precisely: the `Set-Cookie` header and every attribute that matters for security.
> - Build a server-side session system: random session ids, a session store, expiry and logout.
> - Defend sessions against **hijacking**, **fixation** and **CSRF**, and know which defence addresses which attack.
> - Choose idle and absolute timeouts, rotate session ids, and support "log out everywhere".
> - Scale sessions across many servers with a shared store such as Redis.
> - Compare server-side sessions with token-based approaches, as a bridge to the next chapter.

## Why this matters

In {{ch:authentication}} the server verified a user's password. But HTTP is **stateless** ({{ch:how-the-web-works}}): the very next request — "show my orders" — arrives with no memory of the login. Asking for the password on every request is impossible, and sending the password with every request would be dangerous.

The server needs a way to recognise that a sequence of requests comes from the same, already-authenticated user. For most web applications, the answer is a **session**: after login, the server creates a record ("this visitor is user 41, logged in at 09:30"), gives the browser a hard-to-guess **session id** in a **cookie**, and the browser sends that cookie with every following request.

Sessions sound simple, and the basic version is. But nearly every famous web vulnerability class touches them: stolen session cookies give an attacker full access to an account without the password; cross-site request forgery makes a logged-in browser perform actions the user never intended; session fixation lets an attacker log in as the victim by planting a session id before login. Getting the details right — cookie attributes, id generation, rotation, expiry, CSRF protection — is what separates a secure login system from a dangerous one.

## The simple idea

Think of a cloakroom at a theatre. You hand over your coat, and the attendant gives you a small numbered ticket. Later, you hand back the ticket and receive your coat. The attendant does not need to remember your face; the **ticket** identifies you. The coat stays safely in the cloakroom; you only carry the ticket.

A session works the same way: after login, your data stays on the **server** (the session record — the coat), and you carry only a **session id** (the ticket) in a cookie. Each request shows the ticket.

> [!ANALOGY]
> A session is like a theatre cloakroom: your belongings stay with the attendant, and you carry only a numbered ticket that you show to get them back.
>
> **Where the analogy breaks:** cloakroom tickets are usually printed in order, so ticket 42 is easy to guess from ticket 41 — harmless in a theatre, disastrous online, where anyone who guesses or copies your ticket **becomes you**. Session ids must therefore be long and random, travel only over encrypted connections, be invisible to page scripts, and change at key moments such as login.

## The proper definition and key words

A **session** is a server-side record that associates a series of requests with a user (or visitor), identified by a **session id** that the client presents with each request — usually in a **cookie**.

The key words:

- **Cookie** — a small piece of data a server asks the browser to store and send back with later requests to that site.
- **`Set-Cookie`** — the response header a server uses to create or update a cookie.
- **`Cookie`** — the request header in which the browser sends cookies back.
- **Session id** — a long, random, unguessable identifier for a session.
- **Session store** — where session records live: memory (development only), Redis, a database.
- **Idle timeout** — how long a session may go unused before it expires. **Absolute timeout** — the maximum lifetime of a session regardless of activity.
- **Session hijacking** — an attacker obtaining and using someone else's session id.
- **Session fixation** — an attacker making a victim use a session id the attacker already knows, then waiting for the victim to log in.
- **CSRF** (cross-site request forgery) — tricking a logged-in user's browser into sending a request the user did not intend ({{ch:frontend-authentication}}).
- **Signed cookie** — a cookie whose value carries a cryptographic signature so the server can detect tampering.

## How it works inside: cookies on the wire

### Level 2 — The exchange

```text
   1. Login
   browser ── POST /login {email, password} ─────────────────────────────▶ server
                                                     verify password
                                                     create session sid=k7Q9...
                                                     store {userId:41, createdAt...}
   browser ◀── 200 OK
               Set-Cookie: sid=k7Q9vX2...; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=86400

   2. Later requests (the browser adds the cookie automatically)
   browser ── GET /orders ───────────────────────────────────────────────▶ server
              Cookie: sid=k7Q9vX2...
                                                     look up sid in the store
                                                     → userId 41 → their orders
   browser ◀── 200 OK [ ...orders... ]

   3. Logout
   browser ── POST /logout   Cookie: sid=k7Q9vX2... ─────────────────────▶ server
                                                     delete session k7Q9...
   browser ◀── 204   Set-Cookie: sid=; Path=/; Max-Age=0   (browser deletes the cookie)
```

Key points:

- The browser stores the cookie and attaches it **automatically** to every matching request — the application's JavaScript does nothing. That is convenient, and it is also exactly what CSRF abuses.
- The cookie contains **only an identifier**. The user's id, roles and other session data stay on the server, where the client cannot read or modify them.
- Logout must **delete the session on the server**. Deleting only the cookie leaves the session valid for anyone who copied the id.

### Level 3 — Cookie attributes

A `Set-Cookie` header contains a name, a value and attributes:

```text
Set-Cookie: sid=k7Q9vX2pLm4...; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=86400
```

| Attribute | Meaning | Recommendation for session cookies |
|---|---|---|
| `Max-Age=seconds` / `Expires=date` | How long the browser keeps the cookie. Without either, it is a **session cookie** in the browser sense, deleted when the browser closes (though browsers that restore sessions may keep it) | Set explicitly to match your server-side timeout |
| `Path=/` | Which paths the cookie is sent for | `/` for the whole site |
| `Domain=example.com` | Send to this domain **and all subdomains**. Without it, only the exact host that set it receives it | Omit (host-only) unless subdomains truly need it |
| `Secure` | Only send over HTTPS | Always |
| `HttpOnly` | Not readable by JavaScript (`document.cookie`) | Always |
| `SameSite=Lax` / `Strict` / `None` | Whether to send on cross-site requests ({{ch:frontend-authentication}}) | `Lax` (or `Strict` for very sensitive apps); `None` only with `Secure` and a real cross-site need |
| `Partitioned` | Stores third-party cookies separately per top-level site (CHIPS) | For embedded third-party contexts only |

Two cookie name **prefixes** add guarantees that browsers enforce:

- **`__Secure-`** — the cookie must have the `Secure` attribute.
- **`__Host-`** — the cookie must be `Secure`, have `Path=/` and **no** `Domain` attribute, so it is locked to the exact host. `__Host-sid` cannot be set or overwritten by a subdomain such as a compromised `blog.example.com`.

### Level 3 — Generating a cookie header by hand

Understanding the exact format helps when debugging. Here is a small function that builds a `Set-Cookie` value:

```ts
type CookieOptions = {
  maxAgeSeconds?: number;
  path?: string;
  domain?: string;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: "Strict" | "Lax" | "None";
};

function serializeCookie(name: string, value: string, o: CookieOptions = {}): string {
  if (!/^[\w!#$%&'*+.^`|~-]+$/.test(name)) throw new Error("Invalid cookie name");
  if (o.sameSite === "None" && !o.secure) throw new Error("SameSite=None requires Secure");
  const parts = [`${name}=${encodeURIComponent(value)}`];
  if (o.maxAgeSeconds !== undefined) parts.push(`Max-Age=${Math.floor(o.maxAgeSeconds)}`);
  parts.push(`Path=${o.path ?? "/"}`);
  if (o.domain) parts.push(`Domain=${o.domain}`);
  if (o.httpOnly) parts.push("HttpOnly");
  if (o.secure) parts.push("Secure");
  if (o.sameSite) parts.push(`SameSite=${o.sameSite}`);
  return parts.join("; ");
}

console.log(serializeCookie("__Host-sid", "k7Q9vX2pLm4", { maxAgeSeconds: 86400, httpOnly: true, secure: true, sameSite: "Lax" }));
console.log(serializeCookie("__Host-sid", "", { maxAgeSeconds: 0, httpOnly: true, secure: true, sameSite: "Lax" }));
try {
  serializeCookie("tracking", "x", { sameSite: "None" });
} catch (error) {
  console.log((error as Error).message);
}
```

**Output:**

```text
__Host-sid=k7Q9vX2pLm4; Max-Age=86400; Path=/; HttpOnly; Secure; SameSite=Lax
__Host-sid=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax
SameSite=None requires Secure
```

- The value is URL-encoded so special characters cannot break the header.
- **Deleting** a cookie means setting it again with the **same name, path and domain** and `Max-Age=0` — a cookie with a different path is a different cookie and will not be removed.
- Browsers reject `SameSite=None` without `Secure`, so the function refuses to produce it.
- In practice, frameworks provide this (`res.cookie(...)` in Express — {{ch:express}}); building it once makes the header readable when you inspect it in the Network panel.

## Building server-side sessions

### Level 3 — A minimal session system

Here is a small but complete session implementation with Express, without a session library, to show every moving part:

```ts
import express, { type Request, type Response, type NextFunction } from "express";
import { randomBytes } from "node:crypto";

type Session = { id: string; userId: string | null; createdAt: number; lastSeenAt: number; data: Record<string, unknown> };

const IDLE_TIMEOUT_MS = 30 * 60_000;          // 30 minutes without activity
const ABSOLUTE_TIMEOUT_MS = 12 * 60 * 60_000; // 12 hours maximum
const store = new Map<string, Session>();     // development only: use Redis or a database in production

const COOKIE = "__Host-sid";
const cookieOptions = { httpOnly: true, secure: true, sameSite: "lax" as const, path: "/" };

function readCookie(req: Request, name: string): string | undefined {
  for (const part of (req.headers.cookie ?? "").split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return undefined;
}

function newSession(res: Response, userId: string | null, now: number): Session {
  const session: Session = { id: randomBytes(32).toString("base64url"), userId, createdAt: now, lastSeenAt: now, data: {} };
  store.set(session.id, session);
  res.cookie(COOKIE, session.id, { ...cookieOptions, maxAge: IDLE_TIMEOUT_MS });
  return session;
}

function loadSession(req: Request, res: Response, next: NextFunction) {
  const now = Date.now();
  const id = readCookie(req, COOKIE);
  const session = id ? store.get(id) : undefined;
  const expired =
    !session || now - session.lastSeenAt > IDLE_TIMEOUT_MS || now - session.createdAt > ABSOLUTE_TIMEOUT_MS;
  if (session && expired) store.delete(session.id);
  if (session && !expired) {
    session.lastSeenAt = now;                                         // sliding idle timeout
    res.cookie(COOKIE, session.id, { ...cookieOptions, maxAge: IDLE_TIMEOUT_MS });
    res.locals.session = session;
  }
  next();
}

const app = express();
app.use(express.json());
app.use(loadSession);

app.post("/login", (req, res) => {
  // (password verification from the authentication chapter goes here)
  const old = res.locals.session as Session | undefined;
  if (old) store.delete(old.id);                                       // never keep a pre-login session id
  newSession(res, "usr_41", Date.now());
  res.json({ ok: true });
});

app.get("/me", (_req, res) => {
  const session = res.locals.session as Session | undefined;
  if (!session?.userId) {
    res.status(401).json({ code: "unauthenticated" });
    return;
  }
  res.json({ userId: session.userId });
});

app.post("/logout", (_req, res) => {
  const session = res.locals.session as Session | undefined;
  if (session) store.delete(session.id);                               // end it on the server
  res.clearCookie(COOKIE, cookieOptions);
  res.status(204).end();
});

const server = app.listen(0, async () => {
  const base = `http://localhost:${(server.address() as { port: number }).port}`;
  const cookieFrom = (r: globalThis.Response) => r.headers.get("set-cookie")!.split(";")[0]!;

  console.log("before login:", (await fetch(`${base}/me`)).status);
  const login = await fetch(`${base}/login`, { method: "POST" });
  const cookie = cookieFrom(login);
  console.log("cookie attributes:", login.headers.get("set-cookie")!.split("; ").slice(1).filter((a) => !a.startsWith("Expires")).join("; "));
  console.log("after login:", await (await fetch(`${base}/me`, { headers: { cookie } })).json());
  await fetch(`${base}/logout`, { method: "POST", headers: { cookie } });
  console.log("old cookie after logout:", (await fetch(`${base}/me`, { headers: { cookie } })).status);
  server.close();
});
```

**Output:**

```text
before login: 401
cookie attributes: Max-Age=1800; Path=/; HttpOnly; Secure; SameSite=Lax
after login: { userId: 'usr_41' }
old cookie after logout: 401
```

Walk through it:

- **Session ids** are 32 random bytes from a CSPRNG ({{ch:authentication}}), encoded as base64url — impossible to guess.
- The **store** maps ids to session records. A `Map` works for a single process in development; in production, sessions must live in a shared store (below).
- **`loadSession`** middleware runs on every request: it reads the cookie, looks up the session, enforces **both** timeouts — an **idle** timeout that slides forward with activity, and an **absolute** timeout from creation — deletes expired sessions, and refreshes the cookie's lifetime.
- **Login creates a brand-new session** and deletes any previous one. This defeats session fixation (below).
- **Logout deletes the server record** and clears the cookie. The test shows that the **old cookie value no longer works** after logout — even if someone had copied it.
- Express's `res.cookie` sets the attributes; it writes `Max-Age` in seconds, and also adds an `Expires` date for older clients (filtered out of the printed output because it changes every run).


In real applications, use a maintained session library — `express-session` with a Redis store, or the session handling built into your framework or authentication library ({{ch:authentication}}) — but expect it to do exactly what this example does.

### Level 4 — What goes in a session

Keep session records **small**: the user id, perhaps the roles or tenant id, the time of authentication (for step-up checks — {{ch:authentication}}), a CSRF secret, and small preferences. Do not store large objects or data that changes elsewhere (the cart's contents, the user's profile): store an id and load fresh data when needed, so the session never holds stale information. If permissions change — a staff member is demoted — either store roles outside the session and check them per request, or update or end the user's sessions.

## Attacks on sessions, and their defences

### Level 3 — Session hijacking

If an attacker obtains a valid session id, they **are** the user until it expires. Ways ids leak, and the defences:

| How the id leaks | Defence |
|---|---|
| Read by an injected script (XSS) | `HttpOnly` cookies; preventing XSS ({{ch:html}}, {{ch:application-security}}) |
| Intercepted on an unencrypted network | HTTPS everywhere, `Secure` cookies, HSTS ({{ch:tls-ssl}}) |
| Placed in a URL (`?sid=...`) and leaked through logs, browser history or the `Referer` header | Never put session ids in URLs — cookies only |
| Logged by the server | Never log cookies or session ids ({{ch:logging}}) |
| Malware or physical access to the device | Short lifetimes, re-authentication for sensitive actions, "log out everywhere" |
| Guessed | 128+ bits of randomness |

Some systems add extra checks, such as noticing when a session suddenly appears from a different country or device and requiring re-authentication. Binding sessions strictly to IP addresses tends to break legitimate users on mobile networks whose addresses change, so such signals are usually used for risk scoring rather than hard rules.

### Level 3 — Session fixation

In a **session fixation** attack, the attacker obtains a session id from your site (simply by visiting it), then tricks the victim into using that **same** id — for example through a crafted link on a site that accepts session ids from URLs, or by setting a cookie from a compromised subdomain. When the victim logs in, if the server simply marks the **existing** session as authenticated, the attacker — who knows the id — is now logged in as the victim.

The defence is simple and essential: **issue a new session id at every change of privilege** — at login, at logout, when MFA completes, when a user switches to an administrator role — and delete the old one. The example above does this at login. `__Host-` cookies and refusing session ids from URLs remove the common ways of planting an id in the first place.

### Level 4 — Cross-site request forgery (CSRF)

Because browsers attach cookies automatically, a malicious site can make a victim's browser send a request **to your site, carrying their session cookie**:

```html
<!-- on evil.example, shown to a logged-in customer of cornershop.example -->
<form action="https://cornershop.example/account/email" method="post" id="f">
  <input type="hidden" name="email" value="attacker@evil.example">
</form>
<script>document.getElementById("f").submit();</script>
```

Without protection, the victim's account email changes to the attacker's — who then resets the password and takes over the account. The attacker never sees the response (the same-origin policy prevents that), but the **action** happens.

Defences, in layers:

1. **`SameSite` cookies.** With `SameSite=Lax`, the browser does **not** send the cookie on cross-site `POST` form submissions or `fetch` requests, which stops this attack in modern browsers. `Lax` still sends cookies when a user follows a normal link (a top-level `GET` navigation), so `GET` requests must **never** change state ({{ch:rest-apis}}).
2. **Checking the `Origin` header** (or `Sec-Fetch-Site`, a header modern browsers send indicating whether the request is same-origin, same-site or cross-site) on state-changing requests, and rejecting requests from other origins.
3. **CSRF tokens** — a random secret tied to the session, embedded in your own pages (in forms as a hidden field, or read by your JavaScript), and required in every state-changing request. A malicious site cannot read your pages, so it cannot know the token.
4. **Requiring a custom header** such as `Content-Type: application/json` or `X-Requested-With` for API calls: cross-site HTML forms cannot send JSON or custom headers without triggering a CORS preflight that your server will reject ({{ch:express}}).

`SameSite` is a strong baseline, but defence in depth is wise for important actions, older browsers, and situations where `SameSite` does not apply (for example, attacks from a compromised **subdomain**, which counts as the same site).

Here is a synchronizer-token check in a small, testable form:

```ts
import { randomBytes, createHmac, timingSafeEqual } from "node:crypto";

const SERVER_SECRET = Buffer.from("replace-with-a-real-secret-from-config-32b");

// The token is an HMAC of the session id, so it needs no extra storage
function csrfTokenFor(sessionId: string): string {
  return createHmac("sha256", SERVER_SECRET).update(`csrf:${sessionId}`).digest("base64url");
}

function isValidCsrf(sessionId: string, submitted: string | undefined): boolean {
  if (!submitted) return false;
  const expected = Buffer.from(csrfTokenFor(sessionId));
  const actual = Buffer.from(submitted);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

const sessionId = randomBytes(32).toString("base64url");
const token = csrfTokenFor(sessionId);              // embedded in the page's forms

console.log("own page submits the token:", isValidCsrf(sessionId, token));
console.log("attacker without the token:", isValidCsrf(sessionId, undefined));
console.log("attacker guessing:", isValidCsrf(sessionId, "x".repeat(token.length)));
console.log("token from another session:", isValidCsrf(randomBytes(32).toString("base64url"), token));
```

**Output:**

```text
own page submits the token: true
attacker without the token: false
attacker guessing: false
token from another session: false
```

- The token is derived from the session id with an **HMAC** and a server secret ({{ch:authentication}}), so it is unique per session and needs no extra storage. (Libraries may instead store a random token in the session; both approaches are common.)
- Your pages include the token in forms (a hidden input) or expose it to your JavaScript, which sends it in a header. A cross-site attacker cannot read your pages, so cannot obtain it.
- The comparison is constant-time.
- Framework features often handle CSRF for you — for example, Next.js Server Functions check the request origin ({{ch:nextjs}}), and many server frameworks have CSRF middleware. Know which protection your stack provides, rather than assuming.

## Timeouts, rotation and "log out everywhere"

### Level 4 — Choosing lifetimes

- **Idle timeout** limits the window in which an abandoned session (on a shared computer, say) can be used. Banking applications may use minutes; shops often use hours or days.
- **Absolute timeout** forces periodic re-authentication even for active sessions, limiting the value of a stolen id. "Remember me" features are often a long absolute lifetime for a low-privilege session, combined with re-authentication before sensitive actions.
- **Warn before expiry** in the UI, and preserve unsaved work ({{ch:frontend-authentication}}).

### Level 4 — Rotation

Besides rotating at login and privilege changes, some systems rotate session ids periodically (for example, every 15 minutes of activity), limiting how long a stolen id stays useful. Rotation must be handled carefully with concurrent requests: allow the previous id briefly, or requests in flight during the rotation will fail.

### Level 4 — Ending sessions

Keep an index of sessions **by user**, so you can:

- show users their active sessions ("Chrome on Windows, Lahore, active 5 minutes ago") and let them end any of them;
- **log out everywhere** after a password change or reset ({{ch:authentication}});
- end all sessions of an employee who leaves, or of an account flagged as compromised.

This is one of the clearest advantages of server-side sessions over self-contained tokens: revocation is immediate, because the server simply deletes the record ({{ch:jwt}}).

## Sessions at scale

### Level 4 — The problem with memory

A session store held in a process's memory works with one server process. With several processes or containers behind a load balancer ({{ch:nodejs}}, {{ch:elb}}), a user's second request may reach a different instance that has never heard of their session — they appear logged out at random. Memory stores also lose every session when a process restarts.

```text
                   load balancer
                 ┌──────┴──────┐
              instance A    instance B
              sessions:     sessions:
              {k7Q9: u41}   {}            ← request 2 lands here: "who are you?"
```

### Level 4 — Shared stores

The standard solution is a **shared session store** that all instances read and write:

- **Redis** — the most common choice: in-memory, fast, with built-in key expiry (`SET sid:k7Q9 ... EX 1800`) that matches idle timeouts naturally ({{ch:redis}}).
- **A database table** — simpler infrastructure, slower; needs a job to delete expired rows.
- Managed services from cloud providers.

```text
   instance A ──┐
                ├──▶ Redis:  sid:k7Q9 → {"userId":"usr_41","createdAt":...}  (expires in 30 min)
   instance B ──┘
```

**Sticky sessions** — configuring the load balancer to send each user to the same instance — avoid a shared store but make scaling, deployments and failover worse (a user's session dies with their instance), so shared stores are generally preferred.

### Level 5 — Costs and failure modes

- Every request now involves a store lookup. Redis lookups typically take well under a millisecond on the same network, but the store is now a **critical dependency**: if it goes down, nobody is logged in. Run it highly available ({{ch:replication}}) and handle its errors deliberately ({{ch:error-handling}}).
- Store sessions with expiry so they do not accumulate forever.
- Keep session data small to keep lookups fast and memory low.

## Sessions or tokens?

The alternative to server-side sessions is a **self-contained token**, typically a signed JWT, which carries the user's id and claims inside it; the server verifies the signature instead of looking anything up ({{ch:jwt}}).

| | Server-side session | Self-contained token (JWT) |
|---|---|---|
| What the client holds | A random id | The data itself, signed |
| Server lookup per request | Yes (fast store) | No (signature check only) |
| Revocation | Immediate: delete the record | Hard before expiry; needs short lifetimes, refresh tokens or deny-lists |
| Size on each request | Small | Larger (all the claims) |
| Best for | Browser applications with their own back end | APIs between services, mobile clients, third-party access ({{ch:oauth}}) |

For a typical web application whose front end talks to its own back end, `HttpOnly` cookie sessions are simple, secure and easy to revoke — many security practitioners recommend them as the default ({{ch:frontend-authentication}}). Tokens shine when there is no shared session store, when many independent services must verify identity, or when clients are not browsers.

## From beginner to enterprise

**Level 3 — first login.** A session library; random ids; `HttpOnly`, `Secure`, `SameSite=Lax` cookies; logout that deletes the session.

**Level 4 — real applications.** New id at login and privilege changes; idle and absolute timeouts; Redis store; CSRF protection beyond `SameSite` for sensitive actions; `__Host-` prefix; no session data in logs.

**Level 5 — professional practice.** Session listing and "log out everywhere"; ending sessions on password change; re-authentication for sensitive actions; monitoring of session-store health and login anomalies.

**Level 6 — large systems.** Highly available session stores across regions; risk-based session evaluation; central identity providers issuing sessions for many applications through single sign-on ({{ch:oauth}}); compliance-driven timeouts in regulated industries.

## Real-world use cases

### A shop behind a load balancer

- **Symptom**: customers are randomly logged out after a second instance was added.
- **Cause**: sessions stored in each process's memory.
- **Fix**: Redis-backed sessions with expiry; the session store monitored and replicated.

### An account takeover through CSRF

- **Situation**: an old admin endpoint changed a product's price on `GET /admin/products/:id/price?value=...`, and session cookies were `SameSite=None` to support an embedded widget.
- **Attack**: a link in a support email, opened by a logged-in admin, changed prices.
- **Fixes**: state changes moved to `POST` with CSRF tokens; cookies `SameSite=Lax`; the widget given its own separately scoped authentication; origin checks on admin routes.

## Common mistakes

### Beginner: predictable session ids

Sequential numbers or timestamps. **Fix:** 32 random bytes from a CSPRNG.

### Beginner: missing cookie attributes

No `HttpOnly`, `Secure` or `SameSite`. **Fix:** set all three; consider `__Host-`.

### Beginner: logout that only clears the cookie

**Fix:** delete the session on the server.

### Intermediate: keeping the same id across login

**Consequence:** session fixation. **Fix:** regenerate at every privilege change.

### Intermediate: state changes on GET

**Consequence:** CSRF through links even with `SameSite=Lax`. **Fix:** safe methods never change state.

### Intermediate: storing large or stale data in sessions

**Fix:** store ids; load fresh data.

### Production: in-memory sessions with several instances

**Fix:** a shared store.

### Production: session ids in URLs or logs

**Fix:** cookies only; never log them.

## Debugging and troubleshooting

- **The cookie is not set**: check the `Set-Cookie` header in the Network panel; browsers silently reject cookies with invalid attributes — `Secure` cookies over plain `http://` on non-localhost hosts, `SameSite=None` without `Secure`, a `__Host-` cookie with a `Domain` attribute, or a `Domain` that does not match the site.
- **The cookie is set but not sent**: wrong `Path` or `Domain`; `SameSite` blocking it on a cross-site request; a cross-origin `fetch` without `credentials: "include"` ({{ch:frontend-authentication}}).
- **Random logouts**: multiple instances without a shared store; the store evicting keys under memory pressure; clock or timeout misconfiguration; rotation racing with concurrent requests.
- **"Log out everywhere" does not work**: no index of sessions by user.
- **CSRF errors on legitimate requests**: the token is missing from some forms or AJAX calls, or the session (and therefore the token) was regenerated after the page loaded.

## How a senior engineer thinks about this

- **The session id is a password that the browser types for you.** It gets the same care: randomness, encryption in transit, invisibility to scripts, short lifetimes, no logging.
- **Change the id whenever privilege changes.**
- **Never let GET change anything**, and layer CSRF defences for actions that matter.
- **Sessions are state, and state must be shared and highly available** once there is more than one instance.
- **Prefer simple, revocable sessions** for browser apps; use tokens where their benefits are real.

## Exercises

### Exercise 1 — Audit these cookies

**Objective:** practise reading `Set-Cookie` headers.
**What to do:** for each header, list problems and a corrected version.

```text
1. Set-Cookie: session=12345
2. Set-Cookie: sid=Rk9vYmFyQmF6...; Domain=example.com; Path=/; Secure
3. Set-Cookie: sid=Rk9vYmFyQmF6...; Path=/; HttpOnly; SameSite=None
4. Set-Cookie: __Host-sid=Rk9vYmFyQmF6...; Domain=example.com; Path=/; Secure; HttpOnly
```

<details>
<summary>Show the solution</summary>

1. A **sequential, guessable** value; no `HttpOnly`, `Secure` or `SameSite`; no explicit lifetime. → `__Host-sid=<32 random bytes>; Max-Age=1800; Path=/; HttpOnly; Secure; SameSite=Lax`.
2. Missing `HttpOnly` (readable by XSS) and `SameSite`; `Domain=example.com` sends it to **every subdomain**, including any less-trusted ones. → drop `Domain`, add `HttpOnly; SameSite=Lax` (and the `__Host-` prefix).
3. `SameSite=None` without `Secure` — browsers **reject** this cookie; and `None` allows cross-site sending, enabling CSRF. → `Secure; SameSite=Lax` unless a genuine cross-site need exists (then `None; Secure` plus CSRF tokens).
4. `__Host-` cookies must **not** have a `Domain` attribute; browsers reject it. → remove `Domain=example.com`, add `SameSite=Lax` and a lifetime.

</details>

### Exercise 2 — Add session regeneration and "log out everywhere"

**Objective:** practise session management operations.
**What to build:** extend an in-memory session store with: `create(userId)`, `regenerate(oldId)` (new id, same user, old id deleted), `destroy(id)`, and `destroyAllForUser(userId)` — keeping an index of session ids by user. Demonstrate that after `destroyAllForUser`, none of the user's sessions work while another user's session still does.

<details>
<summary>Show the solution</summary>

```ts
import { randomBytes } from "node:crypto";

class SessionStore {
  readonly #sessions = new Map<string, { userId: string }>();
  readonly #byUser = new Map<string, Set<string>>();

  create(userId: string): string {
    const id = randomBytes(32).toString("base64url");
    this.#sessions.set(id, { userId });
    if (!this.#byUser.has(userId)) this.#byUser.set(userId, new Set());
    this.#byUser.get(userId)!.add(id);
    return id;
  }

  get(id: string): { userId: string } | undefined {
    return this.#sessions.get(id);
  }

  regenerate(oldId: string): string | null {
    const session = this.#sessions.get(oldId);
    if (!session) return null;
    this.destroy(oldId);
    return this.create(session.userId);
  }

  destroy(id: string): void {
    const session = this.#sessions.get(id);
    if (!session) return;
    this.#sessions.delete(id);
    this.#byUser.get(session.userId)?.delete(id);
  }

  destroyAllForUser(userId: string): number {
    const ids = [...(this.#byUser.get(userId) ?? [])];
    ids.forEach((id) => this.destroy(id));
    return ids.length;
  }
}

const store = new SessionStore();
const laptop = store.create("usr_41");
const phone = store.create("usr_41");
const other = store.create("usr_99");

const afterMfa = store.regenerate(laptop)!;
console.log("old laptop id valid:", store.get(laptop) !== undefined, "| new id valid:", store.get(afterMfa) !== undefined);

console.log("sessions ended:", store.destroyAllForUser("usr_41"));
console.log("usr_41 phone:", store.get(phone) ?? "none", "| usr_41 laptop:", store.get(afterMfa) ?? "none", "| usr_99:", store.get(other));
```

**Output:**

```text
old laptop id valid: false | new id valid: true
sessions ended: 2
usr_41 phone: none | usr_41 laptop: none | usr_99: { userId: 'usr_99' }
```

**Walkthrough:** `regenerate` gives the same user a **new** id and deletes the old one — the operation to run at login, MFA completion or privilege change. The per-user index makes "log out everywhere" a simple loop. In Redis, the same structure is a key per session (with expiry) plus a set per user listing their session ids.

</details>

### Exercise 3 — Debug the CSRF hole

**Objective:** practise reasoning about CSRF defences.
**The scenario:** an application uses `SameSite=Lax` session cookies and believes it is safe from CSRF. A penetration test still changes users' notification settings from another site. The endpoint is `GET /settings/notifications?email=off&sms=off`. Why does `SameSite=Lax` not help, and what are the fixes?

<details>
<summary>Show the solution</summary>

**Why:** `SameSite=Lax` **does** send cookies on top-level **GET navigations** from other sites — for example, when a user clicks a link, or a page redirects them with `window.location`. Because this endpoint changes state on `GET`, an attacker only needs the victim to follow a link.

**Fixes:**
1. Make the endpoint a `POST` (or `PATCH`) — state must never change on `GET` ({{ch:rest-apis}}).
2. Require a CSRF token (or a JSON body with a custom header) on state-changing requests.
3. Check the `Origin` or `Sec-Fetch-Site` header on state-changing requests.
4. Consider `SameSite=Strict` for applications where arriving logged out from external links is acceptable.

</details>

### Exercise 4 — Production scenario: sessions for a growing app

**Objective:** design session handling for production.
**The scenario:** your shop will run on four containers behind a load balancer, with customers and staff. Staff can issue refunds. Describe the session design: ids, cookies, store, timeouts, regeneration, CSRF, revocation and monitoring.

<details>
<summary>Show the solution</summary>

1. **Ids**: 32 random bytes, base64url.
2. **Cookies**: `__Host-sid`, `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`, lifetime matching the server timeout.
3. **Store**: Redis with replication and failover ({{ch:redis}}, {{ch:replication}}); keys with expiry; a per-user set of session ids.
4. **Timeouts**: customers — idle 7 days, absolute 30 days, with re-authentication before changing email, password or payment methods; staff — idle 30 minutes, absolute 12 hours.
5. **Regeneration**: on login, MFA completion, role elevation and logout.
6. **MFA**: required for staff ({{ch:authentication}}); step-up for refunds above a threshold.
7. **CSRF**: `SameSite=Lax` plus origin checks on all state-changing routes, and CSRF tokens on staff forms; no state change on GET.
8. **Revocation**: "log out everywhere" for users; automatic on password change; admin tool to end staff sessions; staff sessions ended when an account is disabled.
9. **Session contents**: user id, role, authentication time, CSRF secret — nothing large or stale.
10. **Monitoring**: Redis health and latency; login and logout rates; spikes in session creation per IP; alerts on store errors ({{ch:monitoring}}).

</details>

## Summary

HTTP is stateless, so after authentication the server remembers users with **sessions**: a server-side record identified by a long, random **session id** that the browser stores in a **cookie** and sends automatically with each request. Logout must delete the record on the server, not just the cookie.

Set cookies with care: `HttpOnly` (no script access), `Secure` (HTTPS only), `SameSite=Lax` or `Strict` (limits cross-site sending), an explicit lifetime, no `Domain` unless needed, and the `__Host-` prefix for host-locked cookies; delete a cookie by setting it again with the same name, path and domain and `Max-Age=0`. Keep session data small and fresh.

Defend against **hijacking** with randomness, HTTPS, `HttpOnly`, no ids in URLs or logs and short lifetimes; against **fixation** by issuing a new id at login and every privilege change; and against **CSRF** with `SameSite`, origin checks, CSRF tokens and never changing state on GET. Enforce idle and absolute timeouts, support listing and ending sessions and "log out everywhere", and store sessions in a shared, highly available store such as **Redis** once you run more than one instance. Server-side sessions are simple and immediately revocable — the default for browser applications — while self-contained tokens suit APIs, services and non-browser clients.

## Key terms

- **Session** — A server-side record associating a series of requests with a user, identified by a session id.
- **Cookie** — A small piece of data a server asks the browser to store and send back with later requests.
- **Set-Cookie** — The HTTP response header used to create, update or delete a cookie.
- **Session id** — A long, random, unguessable identifier that refers to a session on the server.
- **Session store** — The storage where session records are kept, such as memory, Redis or a database.
- **Cookie attributes** — Settings on a cookie, such as Max-Age, Path, Domain, Secure, HttpOnly and SameSite, that control its scope and safety.
- **__Host- prefix** — A cookie name prefix that requires the cookie to be Secure, have Path=/ and no Domain, locking it to one host.
- **Idle timeout** — The period of inactivity after which a session expires.
- **Absolute timeout** — The maximum lifetime of a session regardless of activity.
- **Sliding expiration** — Extending a session's expiry each time it is used.
- **Session hijacking** — Using a stolen session id to impersonate a user.
- **Session fixation** — An attack in which a victim is made to use a session id known to the attacker, who gains access when the victim logs in.
- **Session regeneration** — Issuing a new session id and discarding the old one, especially at login and privilege changes.
- **Cross-site request forgery (CSRF)** — Making a logged-in user's browser send an unintended request to a site.
- **CSRF token** — A secret tied to a session that must accompany state-changing requests, which other sites cannot read.
- **Sec-Fetch-Site** — A request header sent by modern browsers indicating whether a request is same-origin, same-site or cross-site.
- **Shared session store** — A session store, such as Redis, that all instances of an application use.
- **Sticky sessions** — Load-balancer configuration that sends each user's requests to the same server instance.
- **Log out everywhere** — Ending all of a user's sessions on all devices at once.

## What comes next

Sessions keep state on the server. The next chapter, {{ch:jwt}}, explores the opposite approach: **JSON Web Tokens**, which carry signed claims inside the token itself. You will learn how JWTs are structured and signed, how to verify them correctly, why they are hard to revoke, and how access and refresh tokens work together — along with the common mistakes that make JWT-based systems insecure.
