# Phase 2 — Chapter 9: Session Management

> *"A session is a server-maintained state that ties multiple requests together into a coherent user interaction."*

---

## Chapter Overview

### Sessions vs. Tokens — When to Choose What

Most modern tutorials jump straight to JWT. But sessions are still the right choice for many applications, and understanding both is essential.

```
SESSIONS (server-side state)              JWT TOKENS (stateless)
────────────────────────────────────────────────────────────────
Server stores session data                Server stores nothing
Session ID in cookie                      Token contains everything
Easy to revoke (delete from store)        Hard to revoke
Works great for traditional web apps     Great for APIs, mobile apps
Stateful — doesn't scale as easily       Scales horizontally easily
More secure (ID reveals nothing)          Token leakage = full access
CSRF protection via SameSite cookie      CSRF not relevant (no auto-cookie)
Built-in support in most frameworks      Implementation in your hands
```

**Use sessions when:** Traditional server-rendered web apps, admin panels, high-security contexts where revocation matters.

**Use JWT when:** REST APIs, mobile clients, microservices, SPA frontends where you control the client.

---

## Beginner Theory

### How Sessions Work

```
┌──────────┐         1. Login              ┌──────────────────┐
│  Client  │────────────────────────────►  │   Auth Server    │
│ (Browser)│                               │                  │
│          │◄────────────────────────────  │  Creates session:│
│          │  2. Set-Cookie: sid=ABC123    │  { ABC123: {     │
│          │     (HttpOnly, Secure)        │    userId: "1",  │
└──────────┘                               │    role: "admin" │
                                           │  }}              │
      │                                    └──────────────────┘
      │ 3. Subsequent requests:
      │    Cookie: sid=ABC123
      ▼
┌──────────────────┐
│   API Server     │
│                  │
│ Look up ABC123   │
│ in session store │
│ → userId: "1"    │
└──────────────────┘

On logout: DELETE session from store → future requests with that ID fail
```

### Session Storage Options

```
Memory (default):
  Fast, simple
  ✗ Lost on restart
  ✗ Not shared between processes/instances
  Use only for development

Database (PostgreSQL, MySQL):
  Persistent, works in multi-instance environments
  Slightly slower (DB query per request)

Redis:
  Fast, persistent, distributed
  ✓ Recommended for production
  ✓ Built-in TTL/expiry
  ✓ Scales horizontally

Cookie-based (express-session with cookie-session):
  Session data stored in the cookie itself
  No server-side storage
  Limited to 4KB
  Vulnerable if secret is compromised
  Use for non-sensitive, small data
```

---

## Basic Examples

### Express Sessions with Redis

```javascript
// npm install express-session connect-redis ioredis

const express        = require("express");
const session        = require("express-session");
const { createClient } = require("redis");
const RedisStore     = require("connect-redis").default;

const app = express();

// Create Redis client
const redisClient = createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379"
});
await redisClient.connect();

// Session middleware
app.use(session({
  store: new RedisStore({
    client: redisClient,
    prefix: "sess:"          // key prefix in Redis: sess:ABC123
  }),
  name:   "sid",             // cookie name (don't use default 'connect.sid')
  secret: process.env.SESSION_SECRET,  // min 32 chars, random, from env
  resave: false,             // don't save session if unmodified
  saveUninitialized: false,  // don't create session until data is set
  rolling: true,             // reset expiry on every request
  cookie: {
    httpOnly:  true,         // not accessible via JavaScript
    secure:    process.env.NODE_ENV === "production",  // HTTPS only in prod
    sameSite:  "lax",        // CSRF protection
    maxAge:    24 * 60 * 60 * 1000  // 24 hours
  }
}));

// ─── AUTH ROUTES ──────────────────────────────────────────────────────────────
app.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;

  const user = await userService.authenticate(email, password);
  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  // Regenerate session to prevent session fixation
  req.session.regenerate((err) => {
    if (err) return res.status(500).json({ error: "Session error" });

    // Store user data in session
    req.session.userId   = user.id;
    req.session.role     = user.role;
    req.session.loginAt  = new Date().toISOString();
    req.session.ip       = req.ip;
    req.session.userAgent = req.headers["user-agent"];

    res.json({ user: { id: user.id, name: user.name, email: user.email } });
  });
});

app.post("/auth/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) console.error("Session destroy error:", err);
    res.clearCookie("sid");
    res.status(204).end();
  });
});

// ─── AUTH MIDDLEWARE ──────────────────────────────────────────────────────────
function requireAuth(req, res, next) {
  if (!req.session?.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    if (!roles.includes(req.session.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    next();
  };
}

// ─── PROTECTED ROUTES ─────────────────────────────────────────────────────────
app.get("/api/me", requireAuth, async (req, res) => {
  const user = await userService.findById(req.session.userId);
  res.json(user);
});

app.delete("/api/admin/users/:id", requireRole("admin"), async (req, res) => {
  await userService.delete(req.params.id);
  res.status(204).end();
});
```

### Session Data Best Practices

```javascript
// ─── WHAT TO STORE IN SESSION ─────────────────────────────────────────────────
// ✓ User ID (lookup rest on demand)
// ✓ Role (avoid DB lookup on every request)
// ✓ Login timestamp
// ✗ Sensitive data (passwords, tokens, credit cards)
// ✗ Large objects (keep session small)
// ✗ Anything you could derive from userId

// ─── FLASH MESSAGES ───────────────────────────────────────────────────────────
// Temporary session data (one-time display)
// npm install connect-flash
app.use(require("connect-flash")());

// After redirect:
req.flash("success", "Profile updated successfully");
req.flash("error", "Failed to update profile");

// In the next request:
const messages = req.flash("success");  // consumed and cleared
```

---

## Intermediate Concepts

### CSRF Protection

Sessions are vulnerable to CSRF (Cross-Site Request Forgery). A malicious site can trick a logged-in user's browser into making a request to your API using their session cookie.

```javascript
// APPROACH 1: SameSite=Strict or Lax cookie attribute
// SameSite=Strict: cookie never sent on cross-site requests (breaks OAuth flows)
// SameSite=Lax: cookie not sent on cross-site POST (recommended default)

cookie: { sameSite: "lax" }   // Prevents most CSRF; may be sufficient

// APPROACH 2: Double Submit Cookie (stateless CSRF token)
// npm install csurf

const csrf = require("csurf");
app.use(csrf({ cookie: { httpOnly: true, sameSite: "strict" } }));

app.get("/api/csrf-token", (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

// Client must include token in header or body:
// X-CSRF-Token: <token>
// Or: _csrf=<token> in form body

// Error handler for CSRF validation failures
app.use((err, req, res, next) => {
  if (err.code === "EBADCSRFTOKEN") {
    return res.status(403).json({ error: "Invalid CSRF token" });
  }
  next(err);
});

// APPROACH 3: Synchronizer Token Pattern
// Server generates token, stores in session, validates on state-changing requests
app.get("/form", requireAuth, (req, res) => {
  req.session.csrfToken = crypto.randomBytes(32).toString("hex");
  res.render("form", { csrfToken: req.session.csrfToken });
});

app.post("/form", requireAuth, (req, res) => {
  if (req.body._csrf !== req.session.csrfToken) {
    return res.status(403).json({ error: "CSRF token invalid" });
  }
  // Process form...
});
```

### Concurrent Session Management

```javascript
// Limit active sessions per user
// Useful for: "max 3 devices", "kick other sessions on new login"

class SessionManager {
  constructor(redisClient) {
    this.redis = redisClient;
  }

  // Track all session IDs for a user
  async addSession(userId, sessionId) {
    const key = `user:sessions:${userId}`;
    await this.redis.sadd(key, sessionId);
    await this.redis.expire(key, 30 * 24 * 60 * 60);  // 30 days
  }

  async getUserSessions(userId) {
    const key = `user:sessions:${userId}`;
    return this.redis.smembers(key);
  }

  async revokeSession(userId, sessionId) {
    const key = `user:sessions:${userId}`;
    await Promise.all([
      this.redis.del(`sess:${sessionId}`),
      this.redis.srem(key, sessionId)
    ]);
  }

  async revokeAllSessions(userId) {
    const sessions = await this.getUserSessions(userId);
    await Promise.all([
      ...sessions.map(sid => this.redis.del(`sess:${sid}`)),
      this.redis.del(`user:sessions:${userId}`)
    ]);
  }

  async enforceLimit(userId, maxSessions = 3) {
    const sessions = await this.getUserSessions(userId);
    if (sessions.length >= maxSessions) {
      // Revoke oldest session
      const oldest = sessions[0];  // assuming insertion order (Redis 6+ LMPOP)
      await this.revokeSession(userId, oldest);
    }
  }
}

// In login route:
app.post("/auth/login", async (req, res) => {
  // ... authenticate user ...

  req.session.regenerate(async (err) => {
    req.session.userId = user.id;

    // Track and limit sessions
    await sessionManager.addSession(user.id, req.session.id);
    await sessionManager.enforceLimit(user.id, 3);

    res.json({ user: sanitizeUser(user) });
  });
});

// Active sessions dashboard
app.get("/api/me/sessions", requireAuth, async (req, res) => {
  const sessionIds = await sessionManager.getUserSessions(req.session.userId);

  const sessions = await Promise.all(
    sessionIds.map(async (sid) => {
      const data = await redisClient.get(`sess:${sid}`);
      if (!data) return null;
      const parsed = JSON.parse(data);
      return {
        id: sid,
        current: sid === req.session.id,
        loginAt: parsed.loginAt,
        ip: parsed.ip,
        userAgent: parsed.userAgent
      };
    })
  );

  res.json({ sessions: sessions.filter(Boolean) });
});

// Revoke a specific session
app.delete("/api/me/sessions/:sessionId", requireAuth, async (req, res) => {
  await sessionManager.revokeSession(req.session.userId, req.params.sessionId);
  res.status(204).end();
});
```

### Session Fixation Prevention

```javascript
// Session fixation: attacker sets a known session ID before login
// Prevention: ALWAYS call req.session.regenerate() after login

// VULNERABLE:
app.post("/login", async (req, res) => {
  const user = await authenticate(req.body);
  req.session.userId = user.id;   // ← attacker knows this session ID if pre-set
  res.json({ user });
});

// SAFE:
app.post("/login", async (req, res) => {
  const user = await authenticate(req.body);
  req.session.regenerate((err) => {  // ← new session ID issued after authentication
    req.session.userId = user.id;
    res.json({ user });
  });
});
```

---

## Advanced Concepts

### Sliding vs. Absolute Sessions

```javascript
// ABSOLUTE EXPIRY: session expires N hours after creation (regardless of activity)
// Use for security-sensitive apps (banking, healthcare)
// User gets logged out even if actively using the app

const session = require("express-session");
app.use(session({
  rolling: false,  // don't extend on activity
  cookie: { maxAge: 8 * 60 * 60 * 1000 }  // 8 hours absolute
}));

// Check creation time in middleware:
function enforceAbsoluteTimeout(req, res, next) {
  if (!req.session.loginAt) return next();
  const loginTime = new Date(req.session.loginAt).getTime();
  const elapsed = Date.now() - loginTime;
  if (elapsed > 8 * 60 * 60 * 1000) {
    req.session.destroy(() => {});
    return res.status(401).json({ error: "Session expired — please log in again" });
  }
  next();
}

// SLIDING EXPIRY: extends on every request (most apps)
app.use(session({
  rolling: true,   // extend on activity
  cookie: { maxAge: 30 * 60 * 1000 }  // 30 minutes of inactivity
}));
```

### Distributed Sessions with Redis Cluster

```javascript
// For high-availability deployments
const { createClient } = require("redis");
const RedisStore = require("connect-redis").default;

const redisClient = createClient({
  socket: { host: process.env.REDIS_HOST, port: 6379 },
  password: process.env.REDIS_PASSWORD,
  tls: process.env.NODE_ENV === "production" ? {} : undefined
});

// All app instances share the same Redis — session works across instances
// nginx/load balancer can distribute requests without sticky sessions
```

---

## Security

```javascript
// SESSION SECURITY CHECKLIST:

// 1. Strong session secret
const secret = crypto.randomBytes(64).toString("hex");
// Store in .env, never hardcode

// 2. HTTP-only cookie (no JavaScript access)
cookie: { httpOnly: true }

// 3. Secure flag (HTTPS only in production)
cookie: { secure: process.env.NODE_ENV === "production" }

// 4. SameSite (CSRF protection)
cookie: { sameSite: "lax" }

// 5. Short session name (don't reveal technology)
name: "sid"  // not "connect.sid"

// 6. Session regeneration after login (prevent fixation)
req.session.regenerate(callback)

// 7. Complete destroy on logout (not just clear user data)
req.session.destroy()   // remove from store
res.clearCookie("sid")  // remove from browser

// 8. Don't store sensitive data in session
// Only store userId, role — fetch sensitive data from DB when needed

// 9. Absolute timeout for high-security contexts
// 10. IP binding (optional — breaks legitimate mobile users)
```

---

## Interview Preparation

**Q1: How do sessions work? What is stored where?**
A: When a user logs in, the server creates a session object in the session store (Redis, database) with a unique random ID. The session ID is sent to the browser as an HTTP-only cookie. On subsequent requests, the browser sends the cookie; the server looks up the session by ID in the store and retrieves the user's data. No user data travels in the cookie itself — only the opaque session ID.

**Q2: What is session fixation? How is it prevented?**
A: Session fixation is an attack where the attacker establishes a known session ID (before the victim logs in), then waits for the victim to authenticate with that ID. After login, the attacker's pre-known ID now has the victim's privileges. Prevention: always call `req.session.regenerate()` after successful authentication — this invalidates the old session and creates a new ID.

**Q3: When would you choose sessions over JWT?**
A: Sessions are better when: (1) you need guaranteed immediate revocation (JWT can't be invalidated before expiry without extra state); (2) building a traditional server-rendered web app; (3) regulatory requirements mandate controlled session management; (4) the client is always a browser (automatic cookie handling). JWT is better for: REST APIs, mobile apps, microservices needing stateless auth, or when you don't want to store session state.

**Q4: What is CSRF? How does SameSite protect against it?**
A: CSRF (Cross-Site Request Forgery) tricks a user's browser into making a request to your site using their session cookie — from a malicious third-party site. `SameSite=Strict` prevents cookies from being sent on any cross-site request. `SameSite=Lax` (recommended) allows cookies on top-level navigations (GET) but blocks them on cross-site POST/PUT/DELETE requests. This prevents most CSRF attacks without requiring explicit CSRF tokens.

**Q5: Why store sessions in Redis instead of in-memory?**
A: In-memory sessions are lost on app restart and can't be shared between multiple app instances (horizontal scaling). Redis solves both problems: sessions survive restarts (Redis persists to disk), and all instances share the same session store (no sticky sessions needed). Redis also has built-in TTL support for automatic session expiry.

---

## Practical Tasks

### Beginner (10 Tasks)
1. Set up express-session with a RedisStore and test that sessions persist across requests.
2. Implement login that stores userId and role in the session.
3. Implement logout that destroys the session and clears the cookie.
4. Create an authentication middleware that checks session.userId.
5. Set up HTTP-only, Secure, SameSite=Lax cookie configuration.
6. Call `req.session.regenerate()` after login to prevent session fixation.
7. Add `rolling: true` for a sliding window session.
8. Test that sessions are shared between two Express instances on different ports (same Redis).
9. Implement a "remember me" checkbox that extends session to 30 days.
10. Add session logging: log session ID, userId, and IP on every authenticated request.

### Intermediate (10 Tasks)
1. Build a concurrent session manager: track all sessions per user in Redis.
2. Implement an active sessions dashboard where users can see and revoke sessions.
3. Add absolute session timeout (e.g., 8 hours from login, regardless of activity).
4. Implement CSRF protection using the Double Submit Cookie pattern.
5. Add anomaly detection: flag sessions with IP or user-agent changes.
6. Build a "sign out of all devices" endpoint that revokes all user sessions.
7. Add session metadata: store device type, login time, and geo-location in session.
8. Implement step-up authentication: require re-authentication for sensitive operations.
9. Build session-based rate limiting per user (not per IP).
10. Test session security with OWASP ZAP or Burp Suite.

### Advanced (10 Tasks)
1. Implement a distributed session manager using Redis Cluster.
2. Build session replication across multiple Redis nodes with failover.
3. Implement hardware-bound sessions (bind to browser fingerprint).
4. Add real-time session monitoring: notify user of new login from unfamiliar location.
5. Implement session-based audit trail with tamper detection.
6. Build a session migration tool (from one store to another without logging users out).
7. Implement zero-downtime session store migration.
8. Add post-quantum safe session tokens.
9. Build a session analytics dashboard (concurrent users, average session duration, geo).
10. Implement PCI-DSS compliant session management for a payment flow.

---

## Mini Project

**Secure Session-Based Auth**: Build a web app authentication system:
- Registration, login with session, logout
- Email verification
- Password reset
- Concurrent session management (max 3 sessions)
- Active sessions dashboard
- Sliding + absolute timeout
- CSRF protection
- IP/UA anomaly detection

---

## Self Assessment
1. Where is session data stored with express-session?
2. What is stored in the cookie vs. on the server?
3. Why must sessions be stored in Redis (not memory) in production?
4. What is session fixation? How is it prevented?
5. What is CSRF? How does SameSite prevent it?
6. What is the difference between `rolling: true` and `rolling: false`?
7. Why call `req.session.destroy()` on logout instead of just clearing properties?
8. What does `saveUninitialized: false` do?
9. What does `resave: false` do?
10. When would you choose sessions over JWT?
11. What is the `secure` cookie flag?
12. What information should (and should not) be stored in a session?
13. How do you implement a max concurrent sessions limit?
14. What is an absolute session timeout and when is it required?
15. What is the `httpOnly` cookie flag and why is it important?

---

## Cheat Sheet

### Express Session Setup
```javascript
app.use(session({
  store:             new RedisStore({ client: redisClient }),
  name:              "sid",
  secret:            process.env.SESSION_SECRET,
  resave:            false,
  saveUninitialized: false,
  rolling:           true,
  cookie: {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge:   24 * 60 * 60 * 1000
  }
}));
```

### Login
```javascript
req.session.regenerate(() => {
  req.session.userId = user.id;
  req.session.role   = user.role;
  req.session.loginAt = new Date().toISOString();
  res.json({ user });
});
```

### Logout
```javascript
req.session.destroy(() => {
  res.clearCookie("sid");
  res.status(204).end();
});
```

### Auth Middleware
```javascript
function requireAuth(req, res, next) {
  if (!req.session?.userId) return res.status(401).json({ error: "Not authenticated" });
  next();
}
```
