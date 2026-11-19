# Phase 2 — Chapter 2: Express.js

> *"Express is a minimal and flexible Node.js web application framework."*

---

## Chapter Overview

### Why Express Exists

Raw Node.js HTTP is powerful but verbose. Routing, request body parsing, cookies, static files — all require manual implementation. Express (created by TJ Holowaychuk in 2010) abstracts these into a clean, minimal framework.

Express philosophy: **do the minimum, get out of your way**. No ORM, no template engine requirement, no project structure mandate. Express is unopinionated — you compose it from middleware.

Express v4 is the stable production standard. Express v5 is now stable (released 2024) and adds async error handling and removes deprecated APIs.

**Express usage:**
- Powers APIs at IBM, MySpace, Fox Sports, and thousands of startups
- The base for NestJS, Feathers, and many other frameworks
- ~32M npm downloads per week (most downloaded Node.js framework)

**Alternatives:**
- **Fastify**: 2x faster than Express, same middleware model, TypeScript-first
- **Koa**: From Express team, async middleware stack, no bundled routing
- **Hono**: Ultra-lightweight, runs on Edge (Cloudflare Workers)
- **NestJS**: Enterprise framework (Angular-inspired, uses Express/Fastify under the hood)

---

## Beginner Theory

### Core Concepts

**Application object (`app`)**: The central Express instance. Configure middleware, define routes, start the server.

**Middleware**: A function with signature `(req, res, next)`. Called in order for each request. Can:
- Execute code
- Modify `req`/`res`
- End the response
- Call `next()` to pass to the next middleware

**Router**: A mini Express application — only handles routing. Used to modularize route definitions.

**Request (`req`)**: Enhanced `http.IncomingMessage` with parsed body, query, params, cookies.

**Response (`res`)**: Enhanced `http.ServerResponse` with `json()`, `send()`, `status()`, `redirect()`.

---

## Basic Examples

### Hello World to Full Server

```javascript
// npm install express

const express = require("express");
const app = express();

// Built-in middleware
app.use(express.json());                        // parse JSON bodies
app.use(express.urlencoded({ extended: true })); // parse form data

// Basic routes
app.get("/", (req, res) => {
  res.send("Hello World");
});

app.get("/json", (req, res) => {
  res.json({ message: "ok", timestamp: Date.now() });
});

app.get("/users/:id", (req, res) => {
  const { id } = req.params;       // path parameter
  const { include } = req.query;   // query string: ?include=posts
  res.json({ id, include });
});

app.post("/users", (req, res) => {
  const { name, email } = req.body;  // from parsed JSON body
  res.status(201).json({ name, email, id: "new-id" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server on http://localhost:${PORT}`));
```

### Request Object

```javascript
app.post("/api/example", (req, res) => {
  // URL info
  console.log(req.method);         // "POST"
  console.log(req.path);           // "/api/example"
  console.log(req.originalUrl);    // "/api/example?foo=bar"
  console.log(req.hostname);       // "localhost"
  console.log(req.ip);             // "127.0.0.1"
  console.log(req.protocol);       // "http"
  console.log(req.secure);         // false (not HTTPS)

  // Request data
  console.log(req.params);         // { id: "123" } — path params
  console.log(req.query);          // { page: "2", limit: "10" } — query string
  console.log(req.body);           // parsed JSON/form body
  console.log(req.headers);        // all headers
  console.log(req.get("Authorization")); // specific header

  // Custom data attached by middleware
  console.log(req.user);           // set by auth middleware

  res.json({ received: true });
});
```

### Response Object

```javascript
app.get("/demo", (req, res) => {
  // Status
  res.status(200);                 // set status code
  res.statusCode = 200;            // equivalent

  // Headers
  res.set("X-Custom-Header", "value");
  res.set({ "X-A": "1", "X-B": "2" });
  res.type("json");                // Content-Type: application/json

  // Sending responses (terminates the response)
  res.send("text string");         // text/html
  res.json({ key: "value" });      // application/json
  res.sendFile("/absolute/path");  // stream a file
  res.download("/path/file.pdf");  // force download
  res.redirect(301, "/new-path");  // redirect
  res.redirect("/other");          // 302 by default

  // Render template (if view engine configured)
  res.render("template", { data });

  // End without body
  res.end();
  res.sendStatus(204);             // 204 No Content
});
```

---

## Intermediate Concepts

### Middleware Architecture

```javascript
const express = require("express");
const app = express();

// ─── Application-level middleware (runs for every request) ─────────────────────
app.use((req, res, next) => {
  req.startTime = Date.now();
  console.log(`→ ${req.method} ${req.path}`);
  next();  // ALWAYS call next() or send a response, or request hangs
});

app.use(express.json({ limit: "10mb" }));

// ─── Named middleware functions ──────────────────────────────────────────────
function requestLogger(req, res, next) {
  res.on("finish", () => {
    const ms = Date.now() - req.startTime;
    console.log(`${req.method} ${req.path} ${res.statusCode} ${ms}ms`);
  });
  next();
}

function authenticate(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token provided" });

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  };
}

// ─── Route-level middleware ──────────────────────────────────────────────────
app.get("/profile", authenticate, (req, res) => {
  res.json({ user: req.user });
});

app.delete("/admin/users/:id", authenticate, authorize("admin"), (req, res) => {
  res.json({ deleted: req.params.id });
});

// ─── Middleware chain as array ───────────────────────────────────────────────
const adminMiddleware = [authenticate, authorize("admin")];
app.get("/admin/dashboard", adminMiddleware, (req, res) => {
  res.json({ dashboard: true });
});

// ─── Error-handling middleware (4 params!) ───────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  const statusCode = err.statusCode || err.status || 500;
  res.status(statusCode).json({
    error: err.message || "Internal Server Error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack })
  });
});

// ─── 404 handler (must be AFTER all routes) ──────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Cannot ${req.method} ${req.path}` });
});
```

### Routing — Modular with Express Router

```javascript
// ─── routes/users.js ──────────────────────────────────────────────────────────
const router = require("express").Router();
const userService = require("../services/user.service");

// Route-level middleware only for this router
router.use(authenticate);

router.get("/", async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const users = await userService.findAll({ page: +page, limit: +limit });
    res.json(users);
  } catch (err) {
    next(err);   // passes to error middleware
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const user = await userService.findById(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const user = await userService.create(req.body);
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
});

router.patch("/:id", async (req, res, next) => {
  try {
    const user = await userService.update(req.params.id, req.body);
    res.json(user);
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", authorize("admin"), async (req, res, next) => {
  try {
    await userService.delete(req.params.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

module.exports = router;

// ─── app.js ──────────────────────────────────────────────────────────────────
const usersRouter   = require("./routes/users");
const ordersRouter  = require("./routes/orders");
const authRouter    = require("./routes/auth");

app.use("/api/v1/auth",   authRouter);
app.use("/api/v1/users",  usersRouter);
app.use("/api/v1/orders", ordersRouter);
```

### Production Setup

```javascript
const express   = require("express");
const helmet    = require("helmet");
const cors      = require("cors");
const morgan    = require("morgan");
const rateLimit = require("express-rate-limit");

const app = express();

// ─── Security headers ─────────────────────────────────────────────────────────
app.use(helmet());

// ─── CORS ─────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: (origin, callback) => {
    const allowed = ["https://myapp.com", "https://www.myapp.com"];
    if (!origin || allowed.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "PATCH", "PUT", "DELETE"],
  allowedHeaders: ["Authorization", "Content-Type"],
  credentials: true,     // allow cookies
  maxAge: 86400          // cache preflight for 24 hours
}));

// ─── Rate limiting ────────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,   // 15 minutes
  max: 100,
  standardHeaders: true,       // Return rate limit info in headers
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." }
});
app.use("/api/", limiter);

// Stricter limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true,  // don't count successful logins
});
app.use("/api/v1/auth/login", authLimiter);

// ─── Body parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ─── Logging ──────────────────────────────────────────────────────────────────
app.use(morgan("combined"));    // Apache-style logs (or use winston/pino)

// ─── Trust proxy (behind nginx/load balancer) ─────────────────────────────────
app.set("trust proxy", 1);     // enables req.ip from X-Forwarded-For

// ─── Static files ─────────────────────────────────────────────────────────────
app.use("/static", express.static("public", {
  maxAge: "7d",                // cache for 7 days
  etag: true
}));

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use("/api/v1/auth",   require("./routes/auth"));
app.use("/api/v1/users",  require("./routes/users"));

// ─── Health check (before auth) ───────────────────────────────────────────────
app.get("/health", (req, res) => res.json({ status: "ok", uptime: process.uptime() }));

// ─── 404 ──────────────────────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: "Not Found" }));

// ─── Error handler ────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  const status = err.statusCode || 500;
  res.status(status).json({
    error: err.message,
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack })
  });
});

module.exports = app;
```

### File Structure (Industry Standard)

```
src/
├── app.js                    ← Express app (no listen)
├── server.js                 ← listen, graceful shutdown
├── config/
│   ├── index.js              ← env variables
│   └── database.js           ← db connection
├── routes/
│   ├── index.js              ← combine all routers
│   ├── auth.routes.js
│   ├── users.routes.js
│   └── orders.routes.js
├── controllers/
│   ├── auth.controller.js    ← req/res handling only
│   ├── users.controller.js
│   └── orders.controller.js
├── services/
│   ├── auth.service.js       ← business logic
│   ├── users.service.js
│   └── email.service.js
├── repositories/
│   ├── users.repository.js   ← database queries
│   └── orders.repository.js
├── middleware/
│   ├── authenticate.js
│   ├── authorize.js
│   ├── validate.js
│   └── error-handler.js
├── models/
│   └── user.model.js
├── utils/
│   └── async-handler.js
└── __tests__/
    └── users.test.js
```

### Async Handler Wrapper

```javascript
// utils/async-handler.js
// Eliminates try/catch boilerplate in route handlers
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;

// Usage in routes
const asyncHandler = require("../utils/async-handler");

router.get("/:id", asyncHandler(async (req, res) => {
  const user = await userService.findById(req.params.id);
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json(user);
  // Errors automatically pass to next(err) — no try/catch needed!
}));

// Express v5 handles this natively (no wrapper needed)
```

---

## Advanced Concepts

### Custom Error Classes

```javascript
// errors/AppError.js
class AppError extends Error {
  constructor(message, statusCode = 500, code = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;  // vs. programming errors
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, fields = {}) {
    super(message, 400, "VALIDATION_ERROR");
    this.fields = fields;
  }
}

class NotFoundError extends AppError {
  constructor(resource, id) {
    super(`${resource} with id ${id} not found`, 404, "NOT_FOUND");
  }
}

class ConflictError extends AppError {
  constructor(message) {
    super(message, 409, "CONFLICT");
  }
}

class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized") {
    super(message, 401, "UNAUTHORIZED");
  }
}

class ForbiddenError extends AppError {
  constructor(message = "Forbidden") {
    super(message, 403, "FORBIDDEN");
  }
}

// Error handler
app.use((err, req, res, next) => {
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
      ...(err.fields && { fields: err.fields })
    });
  }

  // Unexpected (programming) errors: don't leak details
  console.error("Unexpected error:", err);
  res.status(500).json({ error: "Internal server error" });
});
```

### Request Validation with Zod

```javascript
const { z } = require("zod");

function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse({
      body: req.body,
      query: req.query,
      params: req.params
    });

    if (!result.success) {
      const errors = result.error.issues.map(issue => ({
        field: issue.path.join("."),
        message: issue.message
      }));
      return res.status(400).json({ error: "Validation failed", details: errors });
    }

    // Attach parsed (coerced and stripped) data
    req.validated = result.data;
    next();
  };
}

// Schema definition
const createUserSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100),
    email: z.string().email(),
    password: z.string().min(8).regex(/^(?=.*[A-Z])(?=.*[0-9])/, {
      message: "Must have uppercase and number"
    }),
    role: z.enum(["user", "admin"]).default("user")
  })
});

const getUsersSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    search: z.string().optional()
  })
});

// Use in routes
router.post("/", validate(createUserSchema), asyncHandler(async (req, res) => {
  const { body } = req.validated;   // fully typed, coerced, validated
  const user = await userService.create(body);
  res.status(201).json(user);
}));

router.get("/", validate(getUsersSchema), asyncHandler(async (req, res) => {
  const { query } = req.validated;
  const result = await userService.findAll(query);
  res.json(result);
}));
```

### Streaming Responses

```javascript
const { createReadStream } = require("fs");
const archiver = require("archiver");

// Pipe a file to response
app.get("/download/:filename", authenticate, (req, res) => {
  const filename = path.basename(req.params.filename);   // sanitize
  const filepath = path.join("/uploads", filename);

  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  createReadStream(filepath)
    .on("error", () => res.status(404).json({ error: "File not found" }))
    .pipe(res);
});

// Stream a ZIP of multiple files on-the-fly
app.get("/download-all", authenticate, async (req, res) => {
  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", "attachment; filename=files.zip");

  const archive = archiver("zip", { zlib: { level: 6 } });
  archive.pipe(res);

  const files = await fileService.getUserFiles(req.user.id);
  for (const file of files) {
    archive.file(file.path, { name: file.originalName });
  }

  await archive.finalize();
});

// Server-Sent Events (SSE) for real-time updates
app.get("/events", authenticate, (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const sendEvent = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  // Send initial data
  sendEvent("connected", { userId: req.user.id });

  // Subscribe to events
  const unsubscribe = eventBus.subscribe(req.user.id, (event) => {
    sendEvent(event.type, event.data);
  });

  // Cleanup on disconnect
  req.on("close", () => {
    unsubscribe();
  });
});
```

---

## Industry Usage

**Common middleware stack** (what most production Express apps use):

```javascript
// Security
app.use(helmet());
app.use(cors(corsOptions));

// Request processing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Rate limiting
app.use("/api/", rateLimit(options));

// Logging
app.use(morgan("combined", { stream: logger.stream }));

// Session / Auth
app.use(session(sessionOptions));  // or JWT auth middleware

// Routes
app.use("/api/v1", apiRouter);

// Error handling (last!)
app.use(notFoundHandler);
app.use(errorHandler);
```

**The order above is not stylistic — it is load-bearing.** Security headers must precede anything that can respond. Body parsing must precede any route that reads `req.body`. Rate limiting must precede the expensive work it is meant to protect. Logging must be early enough to observe requests that later fail. And the two error handlers must be last, because Express only reaches them by falling off the end of the stack.

**Where Express sits in the real market.** It remains the most widely deployed Node framework by a wide margin, which matters practically: almost every tutorial, Stack Overflow answer, middleware package, and AI code suggestion assumes Express. That ecosystem gravity is the main reason to still choose it, and the main reason it persists despite Fastify benchmarking better and NestJS structuring better.

You will meet Express in three forms in real codebases:

| Form | What it looks like | What it needs from you |
|---|---|---|
| **The greenfield service** | Clean layered structure, TypeScript, Zod, async wrappers | Keep the discipline; add ADRs for the conventions |
| **The grown monolith** | 4,000-line `app.js`, logic in route handlers, no tests | Strangle it gradually: extract services first, routes last |
| **The BFF / gateway** | Thin proxy in front of other services | Timeouts, retries, circuit breakers on every outbound call |

The second is by far the most common thing you will be hired to work on, and being able to describe a safe incremental refactor of it — extract the service layer, add characterisation tests, then move routes — is a more valuable interview answer than reciting the ideal folder structure.

---

## Security

```bash
npm install helmet cors express-rate-limit
```

```javascript
// helmet() sets these security headers automatically:
// Content-Security-Policy
// X-Frame-Options: DENY
// X-Content-Type-Options: nosniff
// Strict-Transport-Security
// X-XSS-Protection

// Input sanitization
npm install express-mongo-sanitize  // prevent NoSQL injection
npm install xss-clean               // prevent XSS

app.use(mongoSanitize());   // strips $ and . from req.body
app.use(xss());             // sanitizes HTML in input

// SQL injection — use parameterized queries, never string concatenation
// BAD:
db.query(`SELECT * FROM users WHERE email = '${req.body.email}'`);
// GOOD:
db.query("SELECT * FROM users WHERE email = $1", [req.body.email]);

// Timing attack on authentication
// BAD: exits early on wrong email → timing reveals user existence
if (user.email !== input.email) return false;  // fast
if (hash !== input.hash) return false;          // slow

// GOOD: always compare hashes (constant time)
const match = await bcrypt.compare(input.password, user.passwordHash);
```

### The five Express-specific mistakes that cause real incidents

**1. `trust proxy` left unset behind a load balancer.** Without it, `req.ip` returns the proxy's address for every request. Your rate limiter then sees all traffic as one client and either blocks everyone or nobody, and your audit logs record the wrong IP for every action.

```javascript
app.set("trust proxy", 1);   // number of proxies in front of you — not `true`
```

Setting it to `true` blindly is its own vulnerability: it makes Express trust a client-supplied `X-Forwarded-For` header, letting an attacker spoof their IP and bypass IP-based rate limiting entirely. Set it to the actual hop count.

**2. No body size limit.** `express.json()` defaults to 100kb, which is safe, but developers routinely raise it to `50mb` for one upload route and leave it global. Now every endpoint will buffer 50MB of attacker-supplied JSON into memory. Set limits per route:

```javascript
app.use(express.json({ limit: "100kb" }));                    // global default
app.post("/import", express.json({ limit: "10mb" }), handler); // opt-in per route
```

**3. Error responses that leak internals.** A stack trace in a 500 response tells an attacker your file paths, dependency versions, and ORM. Log the detail; return a generic message and a correlation ID.

```javascript
app.use((err, req, res, next) => {
  const id = req.id ?? randomUUID();
  logger.error({ id, err: err.stack, path: req.path });     // full detail, internal
  const status = err.statusCode ?? 500;
  res.status(status).json({
    error: status < 500 ? err.message : "Internal Server Error",  // safe messages only
    correlationId: id,
  });
});
```

**4. Permissive CORS.** `cors()` with no options allows *every* origin. Combined with cookie auth, that is a cross-origin data leak. Use an explicit allowlist, and note that `origin: true` with `credentials: true` reflects whatever origin asked — effectively no protection at all.

```javascript
const allowed = new Set(["https://app.example.com", "https://admin.example.com"]);
app.use(cors({
  origin: (origin, cb) => (!origin || allowed.has(origin))
    ? cb(null, true)
    : cb(new Error("Not allowed by CORS")),
  credentials: true,
}));
```

**5. Mass assignment through spread.** `await User.update(req.body)` lets a caller set `role: "admin"` or `isVerified: true`. Always pick fields explicitly, or let a schema strip unknown keys — Zod's default `.parse()` does exactly this.

```javascript
const UpdateUser = z.object({ name: z.string(), bio: z.string().optional() }).strict();
const data = UpdateUser.parse(req.body);   // throws on unknown keys
```

---

## Performance

```javascript
// 1. Enable compression
const compression = require("compression");
app.use(compression({
  level: 6,                              // zlib level (1-9)
  threshold: 1024,                       // only compress if > 1KB
  filter: (req, res) => {
    if (req.headers["x-no-compression"]) return false;
    return compression.filter(req, res);
  }
}));

// 2. Cache static assets
app.use(express.static("public", {
  maxAge: "365d",    // browser caches for 1 year
  etag: true,
  lastModified: true
}));

// 3. Response time header
app.use((req, res, next) => {
  const start = process.hrtime.bigint();
  res.on("finish", () => {
    const ns = process.hrtime.bigint() - start;
    res.setHeader("X-Response-Time", `${Number(ns) / 1e6}ms`);
  });
  next();
});

// 4. Cluster mode via PM2
// pm2 start app.js -i max --name "api"

// 5. Keep-Alive
const server = app.listen(PORT);
server.keepAliveTimeout = 65000;   // must be > nginx keepalive_timeout
server.headersTimeout = 66000;     // must be > keepAliveTimeout
```

---

## Debugging

```bash
# Enable Express debug logs
DEBUG=express:* node app.js

# See which routes are registered
app._router.stack.forEach(r => {
  if (r.route) console.log(r.route.methods, r.route.path);
});

# Common issues:
# "Cannot set headers after they are sent" — response sent twice
#   Fix: ensure only ONE res.json()/res.send() per request path

# "next is not a function" — wrong number of params in middleware
#   Error middleware needs EXACTLY 4 params: (err, req, res, next)

# Middleware not running — wrong order
#   app.use() runs in order — error handler must be LAST
```

### The request that hangs forever

The most confusing Express bug, because nothing is logged and nothing crashes — the client just waits until it times out. There are exactly three causes:

1. **A middleware neither called `next()` nor sent a response.** Usually an early-return path that forgot one of the two.
2. **An async handler rejected in Express 4 without a wrapper.** The rejection is invisible to the router. See Q9.
3. **A conditional branch that sends nothing.** `if (user) res.json(user)` with no `else`.

Make this class of bug loud instead of silent by adding a watchdog in development:

```javascript
if (process.env.NODE_ENV !== "production") {
  app.use((req, res, next) => {
    const t = setTimeout(() => {
      console.error(`[HANG] ${req.method} ${req.originalUrl} — no response after 5s`);
    }, 5000);
    res.on("finish", () => clearTimeout(t));
    res.on("close",  () => clearTimeout(t));
    next();
  });
}
```

### Correlation IDs, which make production debugging possible at all

Without a request ID you cannot connect a user's complaint to the log lines that explain it. Add one at the very top of the stack and propagate it through async context so every log line carries it automatically.

```javascript
const { AsyncLocalStorage } = require("async_hooks");
const als = new AsyncLocalStorage();

app.use((req, res, next) => {
  const id = req.headers["x-request-id"] ?? randomUUID();
  req.id = id;
  res.setHeader("X-Request-Id", id);          // client can quote it in a bug report
  als.run({ requestId: id }, next);           // available anywhere downstream
});

// Anywhere deeper in the call stack — no plumbing required:
const log = (msg, extra) =>
  console.log(JSON.stringify({ ...extra, msg, requestId: als.getStore()?.requestId }));
```

Also propagate the header to downstream services. A single ID that traverses three services turns a distributed debugging session from hours into minutes, and being able to describe this is a strong seniority signal in an interview.

### Reading the route table when routing misbehaves

```javascript
// Print every registered route and the middleware stack, in match order.
function printRoutes(app) {
  for (const layer of app._router.stack) {
    if (layer.route) {
      const methods = Object.keys(layer.route.methods).join(",").toUpperCase();
      console.log(`${methods.padEnd(8)} ${layer.route.path}`);
    } else if (layer.name === "router" && layer.handle.stack) {
      for (const sub of layer.handle.stack) {
        if (sub.route) console.log(`  ↳ ${sub.route.path}`);
      }
    } else {
      console.log(`[mw]     ${layer.name}`);   // order matters — read it top to bottom
    }
  }
}
```

If a route "does not work," print this first. The answer is almost always that a `app.use()` earlier in the list is matching and terminating, or that the route was registered after the 404 handler.

---

## Interview Preparation

**Q1: What is middleware in Express?**
A: Middleware is a function with the signature `(req, res, next)` that has access to the request and response. Middleware runs in the order it's registered. It can modify req/res, end the request cycle, or call `next()` to pass control. Error middleware has 4 parameters: `(err, req, res, next)` and catches errors passed via `next(err)`.

**Q2: What is the difference between `app.use()` and `app.get()`?**
A: `app.use()` matches all HTTP methods and any path starting with the specified prefix. `app.get()` matches only GET requests on the exact path (with parameter matching). `app.use("/api")` matches `/api`, `/api/users`, `/api/orders`. `app.get("/api/users")` only matches GET `/api/users`.

**Q3: How does Express error handling work?**
A: Express has a special 4-argument middleware `(err, req, res, next)` that is called when `next(err)` is invoked with an error, or when a thrown error reaches Express (in v5, async errors are automatically caught). Express skips regular middleware and routes, jumping directly to the nearest error handler. Multiple error handlers can be chained.

**Q4: What is `next()` used for?**
A: `next()` passes control to the next middleware in the stack. `next(err)` passes control to the next error handler, skipping all regular middleware. `next("route")` skips the remaining handlers for the current route. Not calling `next()` and not sending a response will cause the request to hang indefinitely.

**Q5: What is `express.Router()`?**
A: Router is a mini Express application that handles routing only. It provides isolation — middleware registered on a router applies only to that router. Routers are mounted on the main app with `app.use("/prefix", router)`. This enables modular route files where each feature has its own route file.

**Q6: How do you protect against common attacks in Express?**
A: Use `helmet()` for security headers (XSS, clickjacking, MIME sniffing). Use `cors()` with an allowlist of trusted origins. Use `express-rate-limit` to prevent brute force. Validate/sanitize all input (Zod, Joi). Use parameterized queries (never string-concat SQL). Set body size limits. Use HTTPS.

### Deep Dive Answers (Senior Level)

**Q7: Express is "unopinionated." Why is that both its main strength and its main weakness?**

**What they're testing:** whether you can evaluate a framework rather than just use it.

Express gives you routing and a middleware pipeline, and deliberately nothing else. There is no prescribed project structure, no dependency injection, no validation layer, no ORM integration, no configuration system. For a small service or a team of two, that is liberating — you add exactly what you need and the whole application fits in your head.

The weakness appears at scale, and it is organisational rather than technical. Because Express prescribes nothing, **every team invents its own conventions**, and those conventions drift. One service puts business logic in controllers, another in services, a third in the route file. Error handling is reimplemented per project, usually slightly differently and usually with at least one bug. Onboarding a new engineer means learning this codebase, not learning Express.

This is precisely the gap NestJS fills — it trades flexibility for enforced structure, DI, and a consistent module system, which is why larger teams migrate toward it. The senior framing to give in an interview: *"Express is the right default for small services and for anything where the team is small enough to hold the conventions in their heads. Once you have more than about four engineers or more than a handful of services, the lack of enforced structure starts costing more than the flexibility is worth, and that's the point where NestJS earns its overhead."*

---

**Q8: Walk me through what happens, in order, when a request hits your Express app.**

**Deep answer:**

1. **Node's `http` module** accepts the TCP connection and parses the HTTP request into `req` and `res` objects. Express itself is not involved yet — `app` is just a request-handler function passed to `http.createServer`.
2. **Express's router** begins walking its stack in registration order. The stack is a flat array of layers, each with a path pattern and a handler.
3. **Each matching layer runs.** A layer matches if its path pattern matches the URL and (for route layers) the method matches. Layers registered with `app.use()` match any method and any path *prefix*.
4. **`next()` advances** to the next matching layer. Not calling it, and not sending a response, hangs the request until the client times out — this is the single most common Express bug.
5. **`next(err)` switches to the error stack**, skipping every remaining non-error layer and jumping to the first middleware with four parameters.
6. **A handler ends the cycle** with `res.send/json/end`. After that, `res.headersSent` is true, and any further attempt to write produces `ERR_HTTP_HEADERS_SENT`.
7. **The `finish` event fires** on the response once the last byte is flushed to the socket — this is where logging and metrics belong, because only here do you know the real status code and duration.

The detail that separates a senior answer: **middleware order is program order.** `helmet()` after your routes protects nothing. The error handler registered before the routes catches nothing. Body parsing after the route means `req.body` is undefined. Almost every mysterious Express bug is an ordering bug.

---

**Q9: Why does async error handling break in Express 4, and how do you fix it properly?**

**Deep answer:**

Express 4's router calls your handler inside a `try/catch`. That catch only sees **synchronous** throws. When an `async` function rejects, the rejection happens after the handler has already returned a promise, so the `try/catch` has long since exited. Express never learns about it, `next(err)` is never called, and the request **hangs forever** until the client gives up. Meanwhile Node emits an `unhandledRejection`, which in modern Node terminates the process by default.

```javascript
// BROKEN in Express 4 — hangs the request, may crash the process
app.get("/users/:id", async (req, res) => {
  const user = await db.findUser(req.params.id);   // if this rejects…
  res.json(user);
});
```

Three fixes, in order of preference:

```javascript
// 1. A wrapper applied to every async handler (the standard Express 4 answer)
const asyncHandler = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

app.get("/users/:id", asyncHandler(async (req, res) => {
  const user = await db.findUser(req.params.id);
  if (!user) throw new NotFoundError("User not found");
  res.json(user);
}));

// 2. express-async-errors — patches the router so plain async handlers work
require("express-async-errors");   // must be required before routes

// 3. Express 5 — handles rejected promises from handlers natively
```

The senior point to make: the wrapper is not optional hygiene, it is a **correctness requirement**. An unwrapped async handler is a latent request-hang and a latent process crash, and it will not show up in testing because the happy path works perfectly.

---

**Q10: How would you structure an Express application that five engineers work on?**

**Deep answer:**

The specific layout matters less than that *there is one* and it is enforced by review. What follows is the layered structure that survives contact with a growing team:

```
src/
  app.js            — builds the Express app; no listen()
  server.js         — reads config, calls listen(), wires shutdown
  config/           — env parsing + validation at boot (fail fast)
  middleware/       — cross-cutting: auth, requestId, errorHandler
  modules/
    users/
      users.routes.js       — HTTP only: parse, validate, delegate
      users.controller.js   — request → service call → response shape
      users.service.js      — business logic; knows nothing about HTTP
      users.repository.js   — data access; knows nothing about business rules
      users.schema.js       — Zod schemas for input and output
  lib/              — shared utilities, error classes
```

The rules that make it work:

- **Controllers never contain business logic.** They translate HTTP to a service call and back. If a controller has an `if` about business rules, it is in the wrong layer.
- **Services never touch `req` or `res`.** This is what makes them testable without HTTP, and reusable from a queue worker or a CLI.
- **Repositories never contain business rules.** They translate between the domain and the database.
- **Validation happens at the boundary**, before the controller, using a schema. Nothing downstream should re-check shapes.
- **One error handler**, registered last, that maps typed errors to status codes.

Separating `app.js` from `server.js` deserves special mention because it is a small change with a large payoff: it lets your tests import the app and drive it with supertest without binding a port, which makes integration tests fast and parallelisable.

---

**Q11: Express, Fastify, NestJS, Koa — how do you choose?**

**Deep answer:**

| Framework | Model | Choose it when |
|---|---|---|
| **Express** | Minimal middleware pipeline | Small team, small service, maximum ecosystem compatibility, or you need something running today |
| **Fastify** | Schema-first, JSON-schema serialisation | Throughput matters measurably; you want validation and serialisation built in; you like plugin encapsulation |
| **NestJS** | Opinionated, DI, decorators, modules | Team of 4+, multiple services, long-lived codebase, engineers coming from Angular or Spring |
| **Koa** | Minimal, async middleware, no router | You want to build your own framework and know why |
| **Hono** | Tiny, web-standards, edge-first | Deploying to Cloudflare Workers, Deno, or Bun |

Fastify's throughput advantage is real but frequently irrelevant — most APIs are bounded by the database, not the HTTP layer, so a framework that is twice as fast at routing may make no measurable difference to p99. The honest senior answer names this: *"Fastify benchmarks better, but I'd only pick it on that basis after profiling showed the framework was actually the bottleneck, which in my experience it usually isn't. I'd more likely pick it for the built-in schema validation and serialisation."*

The answer that signals seniority most strongly is the one that starts with the team rather than the technology: framework choice at this level is a **maintenance and onboarding decision**, not a benchmark decision.

---

**Q12: Your Express app's p99 latency spikes under load but CPU sits at 30%. Where do you look?**

**Deep answer:**

Low CPU with high latency means the bottleneck is *waiting*, not computing. Work through it in this order:

1. **Database connection pool exhaustion.** The most common cause by far. Requests queue waiting for a free connection. Check pool size against concurrency, and check for connections leaked by paths that error before releasing.
2. **The libuv thread pool** (default four). Heavy `fs`, `crypto.pbkdf2`, or `zlib` usage serialises behind four slots even though the event loop is idle. Raise `UV_THREADPOOL_SIZE` or move the work.
3. **A slow downstream call with no timeout.** One unresponsive third-party API holds request slots open indefinitely. Every outbound call needs a timeout — the default in most HTTP clients is *no timeout at all*, which is the wrong default for a server.
4. **Keep-alive mismatch with the proxy.** If `server.keepAliveTimeout` is shorter than the upstream proxy's, you get sporadic 502s and retries that look like latency. Node's server timeout must exceed the proxy's.
5. **Event loop lag despite low average CPU.** Average CPU hides short blocking bursts. Measure directly with `perf_hooks.monitorEventLoopDelay()` rather than inferring from CPU graphs.

The instinct to demonstrate: **measure the queue, not the throughput.** Latency problems at low CPU are almost always a concurrency limit somewhere — a pool, a thread pool, or a socket — and the fix is to find which limit is saturated rather than to add servers.

---

## Practical Tasks

### Beginner (10 Tasks)
1. Build a REST API with 5 routes (CRUD for a resource) using Express.
2. Add request body parsing, CORS, and a request logger middleware.
3. Create a 404 handler and a global error handler.
4. Use `express.Router()` to split routes into separate files by resource.
5. Add rate limiting with `express-rate-limit` (max 20 req/min).
6. Add helmet for security headers and verify them with Postman.
7. Create an `asyncHandler` wrapper and eliminate all try/catch from route handlers.
8. Serve static files from a `public/` folder with 7-day cache headers.
9. Create a health check endpoint that returns uptime, memory, and Node version.
10. Add request ID middleware that generates a UUID per request and includes it in all logs.

### Intermediate (10 Tasks)
1. Build a complete authentication system: register, login, logout with JWT.
2. Implement route-level validation using Zod schemas.
3. Create custom error classes (ValidationError, NotFoundError, etc.) and use them in a unified error handler.
4. Build a file upload endpoint with `multer` that validates file type and size.
5. Add pagination middleware that reads `page` and `limit` from query and attaches them to `req`.
6. Create an API versioning setup (`/api/v1/` and `/api/v2/`) with different route modules.
7. Add response compression and verify it with Postman's "Accept-Encoding: gzip" header.
8. Build a Server-Sent Events endpoint that streams real-time data to clients.
9. Add request logging with `pino` to a file with log rotation.
10. Write integration tests for a REST API using `supertest` and Jest.

### Advanced (10 Tasks)
1. Build a plugin system where middleware is loaded dynamically from a `plugins/` directory.
2. Implement a complete RBAC (Role-Based Access Control) system with resource-level permissions.
3. Build a request caching middleware using Redis that caches GET responses.
4. Implement HTTPS with a self-signed certificate and proper HSTS headers.
5. Build a distributed rate limiter backed by Redis (works across multiple app instances).
6. Implement response streaming for a large dataset (thousands of records as JSONL).
7. Build an API gateway that proxies requests to multiple backend services.
8. Create an OpenAPI (Swagger) spec auto-generated from route definitions and Zod schemas.
9. Implement circuit breaker pattern for calls to external services.
10. Build a multi-tenant API where data is isolated by tenant ID in the JWT.

---

## Mini Project

**Task Management REST API**: A complete Express API for a task manager:
- Auth: register, login, refresh token, logout
- Users: profile, update
- Tasks: CRUD, filtering (status, priority, assignee), pagination
- Middleware: JWT auth, Zod validation, rate limiting, request ID
- Error handling: custom error classes, unified error handler
- Tests: supertest integration tests for all endpoints

---

## Production Project

**Multi-tenant SaaS API**: Extend the task manager into multi-tenant:
- Tenant creation with subdomain routing
- Tenant data isolation via middleware
- Audit logging (every mutation logged to separate audit table)
- Webhook system (notify external URLs on events)
- Admin endpoints for tenant management
- API key authentication as alternative to JWT
- OpenAPI documentation with swagger-ui-express

---

## Capstone Project

**Open Source Express Middleware Package**: Build and publish an npm package that provides a useful Express middleware:
- Pick a gap: request deduplication, automatic retry, response normalization
- Write with TypeScript
- Include comprehensive tests (Jest + supertest)
- Write proper README with examples
- Publish to npm
- Submit to `awesome-express` list

---

## Self Assessment
1. What is the middleware function signature? What are the 4 parameters of error middleware?
2. What is the difference between `app.use()` and `app.get()`?
3. What does `next()` do? What does `next(err)` do?
4. What is `express.Router()`? Why use it?
5. What is the order of middleware execution?
6. What happens if you don't call `next()` or send a response?
7. What does `helmet()` do?
8. What does `express.json()` do?
9. What is `trust proxy` and when do you set it?
10. How does Express v5 differ from v4 in error handling?
11. What is `asyncHandler` and why is it useful?
12. How do you serve static files with caching?
13. What is `res.json()` vs `res.send()`?
14. What is the purpose of the `app.listen()` vs using `http.createServer(app).listen()`?
15. How do you get the client's real IP address when behind a load balancer?

---

## Cheat Sheet

### Quick Setup
```javascript
const app = require("express")();
app.use(require("helmet")());
app.use(require("cors")());
app.use(express.json({ limit: "10mb" }));
app.use("/api/", rateLimit({ windowMs: 15*60*1000, max: 100 }));
app.use("/api/v1/users", require("./routes/users"));
app.use((req, res) => res.status(404).json({ error: "Not Found" }));
app.use((err, req, res, next) => res.status(err.statusCode||500).json({ error: err.message }));
app.listen(process.env.PORT || 3000);
```

### Route Methods
```javascript
router.get(path, ...middleware, handler)
router.post(path, ...middleware, handler)
router.patch(path, ...middleware, handler)
router.put(path, ...middleware, handler)
router.delete(path, ...middleware, handler)
router.all(path, ...middleware, handler)   // all methods
```

### req
```javascript
req.params.id        // /users/:id
req.query.page       // ?page=2
req.body             // parsed JSON body
req.headers["authorization"]
req.get("Content-Type")
req.ip               // client IP (trust proxy first)
req.user             // set by auth middleware
```

### res
```javascript
res.status(200).json({ data })
res.status(201).json({ created })
res.status(204).end()
res.status(400).json({ error: "Bad request" })
res.status(404).json({ error: "Not found" })
res.redirect(301, "/new")
res.sendFile("/absolute/path")
res.set("Header", "value")
```
