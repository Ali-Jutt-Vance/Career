# Phase 2 — Chapter 4: REST APIs

> *"REST is not a standard — it's an architectural style. Getting it right means respecting the constraints, not just using HTTP."*

---

## Chapter Overview

### Why REST Exists

In the early 2000s, web services used SOAP — a complex XML-over-HTTP protocol with WSDLs, envelopes, and strict schemas. Roy Fielding's 2000 dissertation "Architectural Styles and the Design of Network-based Software Architectures" defined REST (Representational State Transfer) as a simpler, stateless alternative that embraces HTTP's existing semantics.

REST became dominant because:
- Simple to understand and implement
- Uses standard HTTP methods and status codes
- Human-readable (JSON over XML)
- Works with any HTTP client (browsers, curl, Postman, mobile)
- Cacheable by default

REST powers the majority of the world's web APIs: GitHub, Twitter, Stripe, Twilio, AWS, SendGrid.

### REST Constraints (the formal definition)

1. **Client-Server**: Separate UI and data storage concerns
2. **Stateless**: Each request contains all information needed. No session on server
3. **Cacheable**: Responses must define themselves as cacheable or not
4. **Uniform Interface**: Resources identified by URIs, manipulation through representations
5. **Layered System**: Client can't tell if connected directly to the server or via a proxy
6. **Code on Demand** (optional): Server can send executable code

---

## Beginner Theory

### Resources and Representations

A **resource** is a noun — a thing your API manages: users, orders, products, invoices.

A **representation** is how the resource is serialized for transfer — usually JSON, sometimes XML or Protocol Buffers.

```
Resource: User
URI: /users/123
Representation (JSON):
{
  "id": "123",
  "name": "Alice Smith",
  "email": "alice@example.com",
  "role": "admin",
  "createdAt": "2024-01-15T10:30:00Z"
}
```

### HTTP Methods (Verbs)

```
Method    Safe  Idempotent  Use Case
──────────────────────────────────────────────────────────────
GET       Yes   Yes         Read a resource or collection
POST      No    No          Create a resource
PUT       No    Yes         Replace a resource completely
PATCH     No    No*         Partially update a resource
DELETE    No    Yes         Delete a resource
HEAD      Yes   Yes         Like GET but no body (check existence)
OPTIONS   Yes   Yes         CORS preflight, discover methods

* PATCH can be made idempotent depending on implementation
Safe = no side effects
Idempotent = same result when called N times
```

### HTTP Status Codes

```
2xx — Success
  200 OK              — GET success, PUT/PATCH success
  201 Created         — POST success (+ Location header)
  202 Accepted        — async operation started
  204 No Content      — DELETE success, PUT with no response body

3xx — Redirection
  301 Moved Permanently  — permanent URL change
  304 Not Modified       — cached response is still valid

4xx — Client Errors
  400 Bad Request     — malformed syntax, invalid input
  401 Unauthorized    — authentication required
  403 Forbidden       — authenticated but not allowed
  404 Not Found       — resource doesn't exist
  405 Method Not Allowed — wrong HTTP method for endpoint
  409 Conflict        — resource state conflict (duplicate, version mismatch)
  410 Gone            — resource was here but deleted permanently
  422 Unprocessable   — input structure ok but business rules violated
  429 Too Many Requests — rate limit exceeded

5xx — Server Errors
  500 Internal Server Error — unexpected server error
  502 Bad Gateway     — upstream server returned invalid response
  503 Service Unavailable — server down for maintenance
  504 Gateway Timeout — upstream server timed out
```

### URL Design

```
RESOURCE-BASED URLS (nouns, not verbs)
──────────────────────────────────────────────────────────────────
✓ /users              — collection
✓ /users/123          — single resource
✓ /users/123/orders   — sub-resource (orders belonging to user 123)
✓ /orders/456/items   — nested resource

✗ /getUsers           — verb in URL
✗ /createUser         — verb in URL
✗ /users/123/delete   — verb in URL
✗ /usersList          — redundant suffix

FILTERING, SORTING, PAGINATION
──────────────────────────────────────────────────────────────────
GET /users?role=admin&isActive=true     — filtering
GET /products?minPrice=10&maxPrice=50   — range filter
GET /orders?sort=createdAt&order=desc   — sorting
GET /users?page=2&limit=20              — pagination (page-based)
GET /users?cursor=eyJpZCI6IjEyMyJ9      — cursor pagination
GET /users?search=alice                 — full-text search
GET /users?include=orders,profile       — include related resources

VERSIONING
──────────────────────────────────────────────────────────────────
/api/v1/users     — URL versioning (most common)
Accept: application/vnd.myapi.v1+json  — header versioning
```

---

## Basic Examples

### Complete REST API (Express)

```javascript
const express = require("express");
const { v4: uuidv4 } = require("uuid");
const router = express.Router();

// In-memory store for demo
const users = new Map();

// GET /users — list with filtering + pagination
router.get("/", (req, res) => {
  const { page = 1, limit = 20, role, search } = req.query;
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));

  let results = Array.from(users.values());

  if (role)   results = results.filter(u => u.role === role);
  if (search) results = results.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const total = results.length;
  const start = (pageNum - 1) * limitNum;
  const data  = results.slice(start, start + limitNum);

  res.json({
    data,
    meta: {
      total,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(total / limitNum)
    }
  });
});

// GET /users/:id — single resource
router.get("/:id", (req, res) => {
  const user = users.get(req.params.id);
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json(user);
});

// POST /users — create
router.post("/", (req, res) => {
  const { name, email, role = "user" } = req.body;

  if (!name || !email) {
    return res.status(400).json({
      error: "Validation failed",
      details: [
        !name  && { field: "name",  message: "Name is required" },
        !email && { field: "email", message: "Email is required" }
      ].filter(Boolean)
    });
  }

  const existing = Array.from(users.values()).find(u => u.email === email);
  if (existing) return res.status(409).json({ error: "Email already registered" });

  const user = { id: uuidv4(), name, email, role, createdAt: new Date().toISOString() };
  users.set(user.id, user);

  res
    .status(201)
    .set("Location", `/api/v1/users/${user.id}`)
    .json(user);
});

// PATCH /users/:id — partial update
router.patch("/:id", (req, res) => {
  const user = users.get(req.params.id);
  if (!user) return res.status(404).json({ error: "User not found" });

  const { name, role } = req.body;
  const updated = {
    ...user,
    ...(name && { name }),
    ...(role && { role }),
    updatedAt: new Date().toISOString()
  };
  users.set(user.id, updated);
  res.json(updated);
});

// DELETE /users/:id
router.delete("/:id", (req, res) => {
  if (!users.has(req.params.id)) {
    return res.status(404).json({ error: "User not found" });
  }
  users.delete(req.params.id);
  res.status(204).end();
});

module.exports = router;
```

---

## Intermediate Concepts

### Response Envelope Design

```javascript
// Consistent response shape makes clients easier to write

// Success (single resource)
{
  "data": { "id": "123", "name": "Alice" },
  "meta": { "timestamp": "2024-01-15T10:30:00Z" }
}

// Success (collection)
{
  "data": [{ "id": "1", ... }, { "id": "2", ... }],
  "meta": {
    "total": 247,
    "page": 2,
    "limit": 20,
    "pages": 13,
    "hasNext": true,
    "hasPrev": true
  }
}

// Error
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      { "field": "email", "message": "Invalid email format" },
      { "field": "password", "message": "Must be at least 8 characters" }
    ]
  },
  "meta": { "timestamp": "2024-01-15T10:30:00Z", "requestId": "req-abc123" }
}
```

### Pagination Strategies

```javascript
// ─── 1. Page-based pagination ────────────────────────────────────────────────
// Simple, allows jumping to any page
// Problem: if records are inserted between requests, pages shift
GET /users?page=2&limit=20
Response: { data: [...], meta: { total, page, limit, pages } }

// ─── 2. Cursor-based pagination ───────────────────────────────────────────────
// Stable: cursor points to a specific record
// Can't jump to page N directly
// Best for infinite scroll, real-time feeds
GET /users?limit=20                     // first page
GET /users?cursor=eyJpZCI6IjEyMyJ9&limit=20  // next page

// Implementation:
app.get("/users", async (req, res) => {
  const { limit = 20, cursor } = req.query;
  const limitNum = +limit;

  let whereClause = {};
  if (cursor) {
    const { id, createdAt } = JSON.parse(Buffer.from(cursor, "base64").toString());
    whereClause = { createdAt: { $lt: createdAt }, id: { $ne: id } };
  }

  const users = await User.find(whereClause)
    .sort({ createdAt: -1, id: -1 })
    .limit(limitNum + 1);  // fetch one extra to check if there's a next page

  const hasNext = users.length > limitNum;
  const items = hasNext ? users.slice(0, limitNum) : users;

  const nextCursor = hasNext
    ? Buffer.from(JSON.stringify({
        id: items[items.length - 1].id,
        createdAt: items[items.length - 1].createdAt
      })).toString("base64")
    : null;

  res.json({ data: items, meta: { hasNext, nextCursor } });
});

// ─── 3. Offset-based pagination ───────────────────────────────────────────────
// Simple SQL: SELECT * FROM users LIMIT 20 OFFSET 40
// Problem: slow on large offsets (DB scans all skipped rows)
GET /users?offset=40&limit=20
```

### Filtering and Sparse Fieldsets

```javascript
// Complex filtering via query params
GET /orders?status=pending&minTotal=100&maxTotal=500
GET /orders?createdAfter=2024-01-01&createdBefore=2024-12-31
GET /orders?customerId=123&include=customer,items

// Sparse fieldsets (return only needed fields — reduces payload size)
GET /users?fields=id,name,email    → { id, name, email } only
GET /orders?fields=id,total,status

// Implementation
router.get("/orders", async (req, res) => {
  const { status, minTotal, maxTotal, include, fields } = req.query;

  let query = db("orders");

  if (status)   query = query.where("status", status);
  if (minTotal) query = query.where("total", ">=", +minTotal);
  if (maxTotal) query = query.where("total", "<=", +maxTotal);

  // Include related resources
  if (include?.includes("customer")) {
    query = query.leftJoin("customers", "orders.customerId", "customers.id")
                 .select("orders.*", "customers.name as customerName");
  }

  // Sparse fieldsets
  if (fields) {
    const allowed = ["id", "total", "status", "createdAt", "customerId"];
    const selected = fields.split(",").filter(f => allowed.includes(f));
    if (selected.length) query = query.select(selected.map(f => `orders.${f}`));
  }

  const orders = await query;
  res.json({ data: orders });
});
```

### Conditional Requests (ETags and Caching)

```javascript
// ETags allow clients to check if a resource changed without downloading it
const crypto = require("crypto");

function etag(data) {
  return '"' + crypto.createHash("md5").update(JSON.stringify(data)).digest("hex") + '"';
}

app.get("/users/:id", async (req, res) => {
  const user = await userService.findById(req.params.id);
  if (!user) return res.status(404).json({ error: "Not found" });

  const userEtag = etag(user);
  res.setHeader("ETag", userEtag);
  res.setHeader("Last-Modified", user.updatedAt.toUTCString());
  res.setHeader("Cache-Control", "private, max-age=300");  // 5 min client cache

  // Conditional GET: client sends If-None-Match: "<etag>"
  if (req.headers["if-none-match"] === userEtag) {
    return res.status(304).end();  // Not Modified — no body needed
  }

  res.json(user);
});

// Conditional PUT: prevent lost updates (optimistic concurrency)
app.put("/users/:id", async (req, res) => {
  const user = await userService.findById(req.params.id);
  if (!user) return res.status(404).json({ error: "Not found" });

  const serverEtag = etag(user);

  // Client must send If-Match header with the ETag it has
  if (!req.headers["if-match"]) {
    return res.status(428).json({ error: "If-Match header required" });
  }

  if (req.headers["if-match"] !== serverEtag) {
    return res.status(412).json({ error: "Precondition Failed — resource was modified" });
  }

  const updated = await userService.update(req.params.id, req.body);
  res.json(updated);
});
```

### HATEOAS (Hypermedia as the Engine of Application State)

```javascript
// Level 3 REST: include links in responses so clients can discover actions

{
  "data": {
    "id": "123",
    "status": "pending",
    "total": 99.99
  },
  "_links": {
    "self":   { "href": "/api/v1/orders/123",         "method": "GET"    },
    "cancel": { "href": "/api/v1/orders/123/cancel",  "method": "POST"   },
    "pay":    { "href": "/api/v1/orders/123/payment", "method": "POST"   },
    "items":  { "href": "/api/v1/orders/123/items",   "method": "GET"    }
  }
}

// The client doesn't hardcode URLs — it follows links
// This allows server to change URLs without breaking clients
```

### Richardson Maturity Model

```
Level 0 — The Swamp of POX (Plain Old XML)
  One URL, one HTTP method, tunneled RPC
  POST /api with action in body

Level 1 — Resources
  Multiple URLs, one per resource
  POST /users, POST /orders

Level 2 — HTTP Verbs (what most people call "REST")
  GET, POST, PUT, PATCH, DELETE
  Correct status codes

Level 3 — Hypermedia (true REST per Fielding)
  HATEOAS: links in responses

Most APIs operate at Level 2 and that's fine for most use cases.
```

---

## Advanced Concepts

### Bulk Operations

```javascript
// Create multiple resources in one request
POST /users/bulk
{
  "items": [
    { "name": "Alice", "email": "alice@x.com" },
    { "name": "Bob",   "email": "bob@x.com"   }
  ]
}
Response: {
  "created": [...],
  "errors": []
}

// Batch update
PATCH /orders/bulk
{
  "ids": ["1", "2", "3"],
  "update": { "status": "shipped" }
}

// Batch delete
DELETE /orders/bulk
{
  "ids": ["4", "5", "6"]
}

// Implementation with transaction
app.post("/users/bulk", async (req, res) => {
  const { items } = req.body;
  const created = [];
  const errors  = [];

  await db.transaction(async (trx) => {
    for (const item of items) {
      try {
        const user = await userRepo.create(item, { trx });
        created.push(user);
      } catch (err) {
        errors.push({ item, error: err.message });
      }
    }
  });

  res.status(207).json({ created, errors });  // 207 Multi-Status
});
```

### Long-Running Operations (Async API)

```javascript
// Some operations take too long for a synchronous response
// Pattern: accept the request, return 202, provide a status URL

POST /reports/generate
Request: { "type": "monthly", "month": "2024-01" }

Response 202:
{
  "jobId": "job-xyz",
  "status": "processing",
  "_links": {
    "status": { "href": "/api/v1/jobs/job-xyz", "method": "GET" }
  }
}

// Client polls:
GET /api/v1/jobs/job-xyz
→ { "status": "processing", "progress": 45 }
→ { "status": "completed", "result": { "downloadUrl": "/reports/monthly-2024-01.pdf" } }
→ { "status": "failed", "error": "Insufficient data" }

// Or use Webhooks — server POSTs to client when done
POST /reports/generate
{
  "type": "monthly",
  "month": "2024-01",
  "webhookUrl": "https://myclient.com/webhook/reports"
}
```

### API Versioning

```javascript
// Strategy 1: URL versioning (most common, explicit)
/api/v1/users
/api/v2/users

// Strategy 2: Accept header versioning (cleaner URLs, harder to test)
GET /api/users
Accept: application/vnd.myapi.v2+json

// Strategy 3: Query parameter (dev-friendly)
GET /api/users?api-version=2

// Transition strategy:
// v1 and v2 coexist → deprecate v1 with Sunset header
res.set("Sunset", "Sat, 31 Dec 2025 23:59:59 GMT");
res.set("Deprecation", "true");
res.set("Link", '<https://api.myapp.com/v2/users>; rel="successor-version"');
```

---

## Industry Usage

**REST at Scale:**
- **Stripe**: Exemplary REST API — consistent naming, clear errors, webhook events, versioning via date strings (`2024-01-01`)
- **GitHub**: REST + GraphQL hybrid — REST for simple CRUD, GraphQL for complex queries
- **Twilio**: Strong REST with sub-resources (`/accounts/{sid}/calls/{callSid}`)
- **AWS**: REST + Query APIs (older services use query parameters)

**Common Patterns:**
- Standard pagination headers (`X-Total-Count`, `Link: <url>; rel="next"`)
- Idempotency keys for safe POST retries (`Idempotency-Key: uuid`)
- Request IDs for tracing (`X-Request-Id`)
- API deprecation notices via `Sunset` header

### What Stripe does that almost nobody else does

Stripe's API is the reference implementation, and the specific decisions are worth copying because they are the ones that show up in senior design discussions.

**Date-based versioning tied to the account, not the URL.** A merchant's account is pinned to a version like `2024-06-20`. Existing integrations never break; new integrations get the current behaviour. Stripe maintains a chain of request/response transformers between versions rather than forking the codebase. This is expensive to build and it is why their API has survived a decade of change without a `/v2`.

**Every mutating endpoint accepts an idempotency key**, and results are cached for 24 hours. This is what makes retries safe over an unreliable network, and it is the single most commonly missed feature in candidate API designs.

**Errors are typed, machine-readable, and actionable.** Not `{"error": "Invalid request"}` but:

```json
{
  "error": {
    "type": "card_error",
    "code": "insufficient_funds",
    "message": "Your card has insufficient funds.",
    "param": "payment_method",
    "doc_url": "https://stripe.com/docs/error-codes/insufficient-funds",
    "request_id": "req_7Fx8bQKmN2"
  }
}
```

The client branches on `code`, shows `message` to the user, and quotes `request_id` in a support ticket. Compare this to what most APIs return, and you can see why integrating with Stripe is pleasant and integrating with most APIs is not.

**Expandable objects instead of N+1.** `GET /charges/ch_1?expand[]=customer` inlines the related object. This solves REST's classic over-fetching problem without adopting GraphQL, and it is a good answer when an interviewer asks "why not GraphQL?"

**Cursor pagination everywhere**, never offsets. `starting_after=ch_1` rather than `offset=10000`, because offsets degrade linearly and produce duplicates when the underlying data shifts between pages.

### Designing the API before writing it

The sequence that produces good APIs, and the one to describe in an interview:

1. **List the resources** — the nouns your domain actually has. If you cannot name them without using a verb, your model is a process, not a resource, and REST may be the wrong fit.
2. **Define the state transitions** — what may change, by whom, and under what conditions.
3. **Write the OpenAPI spec first**, before any implementation. It takes an hour and it surfaces inconsistency immediately.
4. **Review the spec with a consumer** — the frontend engineer, or your own client code. Design flaws are ten times cheaper to fix here.
5. **Generate types from the spec** so the client and server cannot drift.
6. **Then implement.**

Teams that write the spec afterwards produce documentation that is permanently, quietly wrong. Teams that write it first produce a contract.

---

## Security

```javascript
// 1. Always validate and sanitize input
// Never trust client data

// 2. Use HTTPS only (no HTTP for API endpoints)
app.use((req, res, next) => {
  if (!req.secure && process.env.NODE_ENV === "production") {
    return res.redirect(301, `https://${req.hostname}${req.url}`);
  }
  next();
});

// 3. Idempotency keys for safe retries (prevent duplicate operations)
app.post("/payments", async (req, res) => {
  const idempotencyKey = req.headers["idempotency-key"];
  if (!idempotencyKey) return res.status(400).json({ error: "Idempotency-Key header required" });

  const existing = await cache.get(`idem:${idempotencyKey}`);
  if (existing) return res.json(JSON.parse(existing));  // replay cached response

  const payment = await paymentService.charge(req.body);
  await cache.set(`idem:${idempotencyKey}`, JSON.stringify(payment), "EX", 86400);
  res.status(201).json(payment);
});

// 4. Object-level authorization — check every request
app.get("/orders/:id", authenticate, async (req, res) => {
  const order = await orderRepo.findById(req.params.id);
  if (!order) return res.status(404).json({ error: "Not found" });

  // CRITICAL: check the order belongs to the authenticated user
  if (order.userId !== req.user.id && req.user.role !== "admin") {
    return res.status(403).json({ error: "Forbidden" });
  }

  res.json(order);
});

// 5. Mass assignment protection — whitelist updatable fields
app.patch("/users/:id", authenticate, async (req, res) => {
  const UPDATABLE = ["name", "bio", "avatarUrl"];
  const update = Object.fromEntries(
    Object.entries(req.body).filter(([k]) => UPDATABLE.includes(k))
  );
  // Never let clients update: id, email, role, password without extra verification
  ...
});
```

### The OWASP API Top 10, in the order they actually bite

These are the failures that appear in real breach reports, ranked by how often they show up in code review.

**1. Broken Object Level Authorization (BOLA/IDOR).** The single most common and most damaging API vulnerability. The endpoint authenticates the caller but never checks that *this* caller owns *that* object. `GET /orders/1043` returns someone else's order because the code only verified the token was valid.

The structural fix is not to add an `if` to every handler — you will forget one. Push ownership into the query itself:

```javascript
// FRAGILE — relies on remembering the check in every handler
const order = await db.order.findUnique({ where: { id } });
if (order.userId !== req.user.id) throw new ForbiddenError();

// ROBUST — the database cannot return another tenant's row
const order = await db.order.findFirst({
  where: { id, userId: req.user.id },      // ownership is part of the lookup
});
if (!order) throw new NotFoundError();      // 404, not 403 — do not confirm existence
```

Note the 404. Returning 403 tells an attacker the object exists, which is itself a leak when IDs are enumerable.

**2. Broken authentication.** Tokens that never expire, no refresh rotation, no revocation path, JWTs verified without checking `alg`.

**3. Excessive data exposure.** Returning the whole database row and relying on the client to hide fields. `password_hash`, `internal_notes`, and `stripe_customer_id` all leak this way. Serialise explicitly through a response schema — never `res.json(user)` straight from the ORM.

**4. Lack of resource and rate limiting.** No pagination cap means `?limit=1000000` becomes a denial-of-service. Always clamp:

```javascript
const limit = Math.min(Number(req.query.limit) || 20, 100);   // hard ceiling
```

**5. Broken function level authorization.** The admin endpoint is not linked in the UI, so nobody checked the role on the server. Obscurity is not authorisation.

**6. Mass assignment.** Covered above — allowlist, never denylist.

**7. Security misconfiguration.** Stack traces in responses, permissive CORS, missing TLS, debug endpoints left mounted.

**8. Injection.** Parameterised queries everywhere. Note that ORMs do not make you immune — raw query escapes and `$queryRaw` interpolation reintroduce it.

**9. Improper asset management.** The forgotten `/v1` still running unpatched next to `/v2`. Every version you have not decommissioned is attack surface you are not watching.

**10. Insufficient logging and monitoring.** You cannot respond to a breach you did not detect. Log authentication failures, authorisation denials, and rate-limit trips — and alert on their derivatives, not their absolute values.

### The enumeration problem

Sequential integer IDs let an attacker walk your entire dataset — and let a competitor count your customers from `GET /orders/1` versus the ID on today's invoice. Use UUIDv7 or a prefixed random ID (`ord_8xKp2mNq`) in the public API. UUIDv7 is preferable to UUIDv4 as a primary key because it is time-ordered and therefore index-friendly, which matters at scale.

---

## Performance

```javascript
// 1. Compression
app.use(compression());

// 2. Caching headers
app.get("/products", (req, res) => {
  res.set("Cache-Control", "public, max-age=300, stale-while-revalidate=60");
  res.json(products);
});

// 3. Sparse fieldsets reduce payload
// 4. Cursor pagination beats offset for large datasets
// 5. Include related data in one request (avoid N+1)
// 6. Use HTTP/2 (multiplexing replaces request bundling hacks)

// 7. Response time SLO tracking
app.use((req, res, next) => {
  const start = process.hrtime.bigint();
  res.on("finish", () => {
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    metrics.histogram("http_request_duration_ms", ms, {
      method: req.method,
      route: req.route?.path || "unknown",
      status: res.statusCode
    });
    if (ms > 1000) logger.warn("Slow request", { method: req.method, path: req.path, ms });
  });
  next();
});
```

### Conditional requests — the optimisation nobody implements

`ETag` and `If-None-Match` let a client skip the download entirely when nothing has changed. The server still does the work of computing the ETag, but the response becomes an empty `304` instead of a payload. On a mobile client polling a list endpoint, this is frequently a 90%+ bandwidth reduction for a few lines of code.

```javascript
app.get("/api/v1/products", async (req, res) => {
  const products = await productRepo.list();
  const etag = `"${createHash("sha1").update(JSON.stringify(products)).digest("hex")}"`;

  res.set("ETag", etag);
  res.set("Cache-Control", "private, max-age=0, must-revalidate");

  if (req.headers["if-none-match"] === etag) {
    return res.status(304).end();          // no body at all
  }
  res.json(products);
});
```

The same headers used in the *other* direction give you optimistic concurrency control, which solves the lost-update problem:

```javascript
app.put("/api/v1/products/:id", async (req, res) => {
  const current = await productRepo.findById(req.params.id);
  const etag = `"${current.version}"`;

  if (req.headers["if-match"] && req.headers["if-match"] !== etag) {
    return res.status(412).json({          // 412 Precondition Failed
      error: "The resource changed since you last read it. Re-fetch and retry.",
    });
  }
  ...
});
```

Two clients editing the same record no longer silently overwrite each other. This is a strong thing to raise unprompted in an API design interview.

### Pagination, and why offset breaks

| Strategy | Query | Breaks when |
|---|---|---|
| **Offset** | `LIMIT 20 OFFSET 10000` | The database must scan and discard 10,000 rows — cost grows linearly. Rows inserted between pages cause duplicates and skips. |
| **Keyset / cursor** | `WHERE (created_at, id) < ($1, $2) ORDER BY created_at DESC, id DESC LIMIT 20` | Constant cost at any depth; stable under concurrent writes. Cannot jump to "page 500". |

Use keyset pagination for anything a user scrolls and anything a machine consumes. Reserve offset for small, bounded admin tables where a page-number UI genuinely matters. Note the composite `(created_at, id)` — paginating on a non-unique column alone silently drops rows that share a timestamp, which is an excellent detail to mention in an interview.

### The N+1 problem, at the API layer

Returning a list of 50 orders and fetching each order's customer separately produces 51 queries. Solve it at the data layer with a join or a DataLoader-style batch, and expose it at the API layer with an explicit `?expand=customer` parameter so clients opt in rather than paying for it always.

---

## Debugging

```bash
# curl for API testing
curl -X GET http://localhost:3000/api/v1/users \
  -H "Authorization: Bearer eyJ..."

curl -X POST http://localhost:3000/api/v1/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Alice","email":"alice@example.com","password":"pass123!"}'

# Pretty-print JSON
curl ... | python -m json.tool
curl ... | jq .

# Check headers
curl -I http://localhost:3000/api/v1/users
curl -v http://localhost:3000/api/v1/users   # verbose with request/response headers

# Test rate limiting
for i in {1..20}; do curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/v1/users; done

# Common issues:
# 401 unexpectedly — check Authorization header format: "Bearer <token>"
# 403 on valid auth — check RBAC, object-level auth
# 422 vs 400 — 400 for syntax errors, 422 for business rule violations
# CORS errors — check origin allowlist, credentials mode, preflight
```

### Reading a failing request systematically

When an endpoint misbehaves, work outward from the wire rather than guessing at the code.

```bash
# 1. What did the server ACTUALLY receive and return? -v shows both directions.
curl -v -X POST http://localhost:3000/api/v1/orders \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $(uuidgen)" \
  -d '{"productId":"p_1","quantity":2}'

# 2. Timing breakdown — is it DNS, TCP, TLS, or the server?
curl -w "dns:%{time_namelookup}s tcp:%{time_connect}s tls:%{time_appconnect}s \
ttfb:%{time_starttransfer}s total:%{time_total}s\n" -o /dev/null -s https://api.example.com/health

# 3. Is it the server or the client? Replay the exact bytes the client sent.
#    In Chrome DevTools → Network → right-click the request → Copy as cURL.
```

`time_starttransfer` minus `time_appconnect` is your real server time. If that is small but `total` is large, the problem is response size or the client, not your handler — a distinction that saves hours.

### The status codes people get wrong

| Situation | Wrong | Right | Why |
|---|---|---|---|
| Validation failed | 400 | **422** | 400 means the request was malformed; 422 means it parsed but violated rules |
| Not logged in | 403 | **401** | 401 = who are you; 403 = I know who you are and no |
| Logged in, not allowed | 401 | **403** | Returning 401 makes clients try to re-authenticate in a loop |
| Object exists but not yours | 403 | **404** | 403 confirms existence, leaking information |
| Duplicate creation | 400 | **409** | Conflict with current state |
| Rate limited | 403 | **429** | Plus `Retry-After` so clients back off correctly |
| Async work accepted | 200 | **202** | With a `Location` header pointing at the status resource |
| Deleted successfully | 200 | **204** | No body to return |
| Precondition failed | 400 | **412** | Signals a stale `If-Match` specifically |

Two of these have real operational consequences rather than being pedantry. Returning 401 instead of 403 sends well-behaved clients into a refresh-token loop that will hammer your auth service. Omitting `Retry-After` on a 429 means clients retry immediately and turn a rate limit into an outage.

### Errors that are actually debuggable

```javascript
// Every error response carries a correlation ID and a stable machine-readable code.
{
  "error": {
    "code": "insufficient_inventory",           // clients branch on this — never on the message
    "message": "Only 3 units of SKU-1187 remain.",
    "details": [{ "field": "quantity", "requested": 10, "available": 3 }],
    "requestId": "req_01HQ8X2M4K",              // matches your logs
    "docs": "https://docs.example.com/errors/insufficient_inventory"
  }
}
```

The rule: **`message` is for humans and may change; `code` is part of your API contract and may not.** Teams that skip the code field end up with clients parsing error strings, and then the strings can never be improved.

---

## Interview Preparation

**Q1: What makes an API truly RESTful?**
A: True REST (per Roy Fielding) requires 6 constraints: client-server separation, statelessness, cacheability, uniform interface, layered system, and optionally code-on-demand. In practice, most "REST APIs" are Level 2 on the Richardson Maturity Model — using HTTP methods correctly and appropriate status codes, but not HATEOAS. Fielding considers Level 2 to be "HTTP APIs," not REST. Level 3 adds hypermedia links, enabling clients to discover actions without hardcoding URLs.

**Q2: What is idempotency? Give examples of idempotent HTTP methods.**
A: An idempotent operation produces the same result regardless of how many times it's called. GET, PUT, DELETE, HEAD, and OPTIONS are idempotent. POST is not (calling POST twice creates two resources). PATCH is often not idempotent (incrementing a counter twice gives different results). Idempotency keys allow POST operations to be made safe for retry — the server recognizes duplicate requests by a unique client-generated key.

**Q3: What is the difference between 401 and 403?**
A: 401 (Unauthorized) means the request requires authentication — no token was provided, or the token is invalid/expired. The client should authenticate and retry. 403 (Forbidden) means the client is authenticated but not authorized — the server understood who you are but refuses the action. Don't say "you need to log in" — say "you don't have permission."

**Q4: When would you use PUT vs. PATCH?**
A: PUT replaces the entire resource — the client sends the complete representation. If you omit a field, it gets removed (or reset to default). PATCH applies partial updates — only send what you want to change. PUT requires the client to know the full current state. In practice, PATCH is safer and more common for updates. PUT is appropriate for operations like "replace the entire configuration file."

**Q5: What is HATEOAS and why is it rarely implemented in practice?**
A: HATEOAS (Hypermedia As The Engine Of Application State) means responses include links to related actions, enabling clients to navigate the API dynamically without hardcoding URLs. Rarely implemented because: it increases response payload, clients (especially mobile apps) tend to hardcode URLs anyway, adds complexity, and the ecosystem tooling (OpenAPI, client generators) works better with static URL conventions.

**Q6: How would you design pagination for an API that serves a real-time feed?**
A: Use cursor-based pagination. Offset-based pagination breaks with real-time feeds because new inserts shift offsets — page 2 might show the same records as page 1 did. Cursor pagination uses a stable position reference (an opaque string encoding the last seen record's ID and timestamp). Clients receive a `nextCursor` in the response and pass it as a query parameter. This is stable even when new records arrive.

### Deep Dive Answers (3+ Years Experience)

**Q7: Walk me through designing a production REST API from scratch.**

**What they're testing:** End-to-end ownership — the core skill for 3 YOE backend roles.

**Deep Answer (structure this as a 3-minute spoken answer):**

"I'd start with the resource model. For an e-commerce API: Users, Products, Orders, OrderItems. Define relationships: Order belongs to User, has many OrderItems, each references Product."

"URL design: `/api/v1/orders`, `/api/v1/orders/:id/items`. Nouns not verbs. Version in URL prefix."

"For each endpoint: correct HTTP method, status code, request/response schema. POST returns 201 with Location header. DELETE returns 204. Validation errors return 400 with field-level details."

"Cross-cutting concerns: JWT auth middleware, role-based authorization, rate limiting (Redis), request ID in every log line, consistent error format `{ error: { code, message, details } }`, OpenAPI docs, health check endpoint."

"Data layer: PostgreSQL with connection pool (pg-pool), migrations (Prisma/Flyway), indexes on foreign keys and query columns."

"Deployment: Docker container, CI runs tests + lint, deploy to staging, smoke test, promote to production. Monitor with structured logs and p95 latency alerts."

---

**Q8: How do you handle API versioning in a team with mobile clients?**

**Deep Answer:**

Mobile apps can't force-update all users instantly — old app versions call old API for weeks/months.

**Strategies:**
1. **URL versioning** (`/v1/`, `/v2/`): clearest, easy to route at load balancer. Most common.
2. **Header versioning** (`Accept: application/vnd.myapi.v2+json`): cleaner URLs but harder to test in browser.
3. **Never break backward compatibility** in v1 — only add optional fields. New behavior in v2.

**Deprecation process:** Announce v1 sunset date (6+ months), return `Sunset` and `Deprecation` headers, monitor v1 traffic in metrics, only shut down when traffic is near zero.

**At 3 YOE:** Mention you version DTOs separately from DB schema — DB can evolve with migrations while API v1 response shape stays stable via mapping layer.

---

**Q9: Design error handling for a REST API used by frontend and third parties.**

**Deep Answer:**

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "request_id": "req_abc123",
    "details": [
      { "field": "email", "message": "Must be a valid email address" }
    ]
  }
}
```

**Rules:**
- Never expose stack traces or SQL errors in production
- Map internal errors to stable `code` strings (clients can switch on them)
- Log full error server-side with request_id (correlate with client report)
- Use correct HTTP status: 400 validation, 401 no auth, 403 no permission, 404 not found, 409 conflict, 422 semantic error, 429 rate limit, 500 unexpected
- Idempotent retries: 500 and 503 are retryable; 400 and 409 are not

---

## Practical Tasks

### Beginner (10 Tasks)
1. Build a CRUD REST API for a `books` resource with proper HTTP methods and status codes.
2. Implement pagination with `page` and `limit` query parameters and return metadata.
3. Add filtering and sorting query parameters to a collection endpoint.
4. Return proper `Location` header on POST (201 Created).
5. Implement a 404 handler and a consistent error response format.
6. Test your API with Postman — document all endpoints with example requests.
7. Add field validation and return detailed 400 errors with field-level messages.
8. Implement the `HEAD` method on a resource endpoint.
9. Add `Content-Type: application/json` to all responses.
10. Design URL structure for a multi-resource API (users, products, orders) following REST conventions.

### Intermediate (10 Tasks)
1. Implement ETag-based conditional requests with 304 and 412 responses.
2. Implement cursor-based pagination and compare performance vs. offset on 100k records.
3. Add an idempotency key mechanism for POST /payments.
4. Build a batch endpoint (`POST /users/bulk`) returning 207 Multi-Status.
5. Implement sparse fieldsets (`?fields=id,name`) that select only requested columns in SQL.
6. Add `Cache-Control` headers to GET endpoints and verify with browser dev tools.
7. Implement `PATCH` using JSON Merge Patch (RFC 7396).
8. Add request logging with response time and log slow requests (>500ms).
9. Implement API versioning with URL prefix and migrate one endpoint to v2.
10. Generate OpenAPI documentation from your API and serve Swagger UI.

### Advanced (10 Tasks)
1. Build a long-running job API: `POST /jobs`, `GET /jobs/:id`, webhook notification on completion.
2. Implement rate limiting with per-user and per-IP limits using Redis sliding window.
3. Add object-level authorization (ABAC) — users can only access their own resources.
4. Build a GraphQL-to-REST bridge: expose same data via both protocols.
5. Implement HATEOAS Level 3 responses with full link sets.
6. Build a REST API SDK in TypeScript from your OpenAPI spec (using openapi-typescript-codegen).
7. Implement request signing (HMAC-SHA256) for secure API-to-API communication.
8. Build a multi-tenant REST API where tenant is identified by subdomain.
9. Implement an API gateway that routes requests to multiple microservices.
10. Add distributed tracing (OpenTelemetry) to track requests across services.

---

## Mini Project

**E-commerce Product API**: A production-ready REST API for products:
- `GET /products` — filter by category, price range; cursor pagination; sort by price/rating
- `GET /products/:id` — with ETag caching
- `POST /products` — admin only; validates all fields
- `PATCH /products/:id` — partial update; ETag conditional
- `DELETE /products/:id` — soft delete (add `deletedAt`)
- `POST /products/bulk` — batch create with 207 response
- Consistent error format, request IDs, response time headers
- Swagger documentation

---

## Production Project

**Multi-Resource API with Full REST Compliance**: Build a task management API with:
- Users (auth), Projects, Tasks, Comments (nested under tasks)
- Cursor pagination throughout
- ETags on all GET endpoints
- Idempotency keys for task creation
- Object-level authorization
- Rate limiting (per user: 1000/hr, per IP: 100/hr)
- Audit log (every mutation logged)
- OpenAPI spec with Redoc documentation
- 90%+ test coverage

---

## Capstone Project

**RESTful API Review**: Review a real public API (GitHub API, Stripe API, or Twilio) and write a technical analysis:
- What REST constraints does it follow?
- What level on the Richardson Maturity Model?
- How does it handle versioning, pagination, errors?
- What would you improve?
- Then build a simplified clone of one section of the API applying your improvements.

---

## Self Assessment
1. What are the 6 REST constraints? Which is optional?
2. What HTTP method is idempotent but not safe? Give an example.
3. What is the difference between 400, 401, 403, 404, 409, and 422?
4. What status code should a successful POST return? What header should it include?
5. What is the difference between offset and cursor pagination? When use each?
6. What is an ETag? How is it used with `If-None-Match` and `If-Match`?
7. What is HATEOAS? What Richardson Maturity Model level includes it?
8. What is an idempotency key? What problem does it solve?
9. What is the difference between PUT and PATCH?
10. How should query parameters be used for filtering vs. path parameters for identity?
11. What is `207 Multi-Status` used for?
12. What does `Cache-Control: stale-while-revalidate=60` mean?
13. What is the `Sunset` header?
14. What is object-level authorization (IDOR)? Give an example of the vulnerability.
15. What is the `Location` header and when is it returned?

---

## Cheat Sheet

### URL Design
```
GET    /resources              — list
POST   /resources              — create (201 + Location)
GET    /resources/:id          — read
PUT    /resources/:id          — replace
PATCH  /resources/:id          — partial update
DELETE /resources/:id          — delete (204)
GET    /resources/:id/children — sub-resources
```

### Status Codes
```
200 OK      201 Created    204 No Content
400 Bad Request   401 Unauth   403 Forbidden
404 Not Found     409 Conflict  422 Unprocessable
429 Too Many Requests   500 Internal Error
```

### Query Parameters
```
?page=2&limit=20        — page pagination
?cursor=xxx&limit=20    — cursor pagination
?sort=name&order=asc    — sorting
?status=active&role=admin — filtering
?fields=id,name,email   — sparse fieldsets
?include=orders,profile — eager load relations
?search=alice           — full-text search
```

### Response Shape
```json
{
  "data": { ... } or [...],
  "meta": { "total", "page", "limit", "pages" },
  "error": { "code", "message", "details" }
}
```
