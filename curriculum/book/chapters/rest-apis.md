# Designing REST APIs

> [!GOALS]
> - Explain what an API is, what REST means, and why consistent API design saves teams enormous amounts of time.
> - Model a domain as **resources** with clear, predictable URLs.
> - Use HTTP **methods** according to their guarantees — safe, idempotent — and choose correct **status codes**.
> - Design request and response bodies, including a consistent, machine-readable **error format**.
> - Implement **pagination** (offset and cursor), filtering, sorting and sparse fields.
> - Make operations safe to retry with **idempotency keys**, handle concurrent updates with **ETags**, and model long-running work.
> - Secure APIs against the most common real-world vulnerabilities, and design them contract-first.

## Why this matters

In {{ch:express}} you learned **how** to build endpoints. This chapter is about **what** they should look like. That question matters more than it seems.

An API is a promise. Once a mobile app is installed on a million phones, or a partner has built their system against your endpoints, you cannot simply change a URL, rename a field or alter what a status code means — the old clients will break. Badly designed APIs therefore stay bad for years. Consider what happens with an inconsistent API:

- One endpoint is `/getUser?id=7`, another `/orders/7/items`, a third `/api/v2/product_list`. Every new endpoint must be learned separately.
- Errors come back as `200 OK` with `{"success": false}` in one place, as `500` with an HTML page in another, and as `400` with a plain string in a third. Clients cannot handle them reliably.
- A payment request times out. The mobile app retries — and the customer is charged twice, because the API has no way to recognise a retry.
- Two staff members edit the same product at the same time, and one silently overwrites the other's changes.
- `GET /orders` returns all two million orders in one response.

Good API design prevents all of these. It also makes front-end and mobile developers faster, makes documentation easier, and is a frequent topic in system-design and back-end interviews ({{ch:technical-interview-guide}}).

## The simple idea

Think of a well-organised library catalogue. Every book has a fixed, unique shelf location. The same small set of actions works for any book: look it up, borrow it, return it. Signs use consistent words everywhere. If something goes wrong — the book is lost, or you are not a member — the desk tells you clearly what the problem is, in a standard way, so you know what to do next.

A **REST API** organises a system the same way: every thing (a product, an order, a customer) has its own **address** (a URL), the same small set of **actions** (HTTP methods) applies to every thing, and results and problems are reported with standard **codes**.

> [!ANALOGY]
> A REST API is like a well-organised library: every item has a fixed address, the same few actions work on every item, and the desk reports problems in a standard, understandable way.
>
> **Where the analogy breaks:** a library's books exist whether or not anyone looks at them. An API's "resources" are often **views** computed on demand — a customer's order history, a sales report — that do not exist as single stored objects. And unlike a library, an API is used mostly by **programs**, which cannot ask a librarian what an unclear message means; every response must be precise enough for code to act on.

## The proper definition and key words

An **API** (Application Programming Interface) is a defined way for one program to use another. A **web API** exposes that interface over HTTP ({{ch:how-the-web-works}}).

**REST** (Representational State Transfer) is an architectural style for networked systems, described by Roy Fielding in his 2000 doctoral dissertation. It describes systems built from **resources** identified by URLs and manipulated through a uniform interface — in practice, HTTP's methods — with each request containing all the information needed to process it. Most APIs called "REST APIs" today follow its practical core rather than every formal constraint; this chapter teaches that practical core.

The key words:

- **Resource** — a thing the API exposes: a product, an order, a customer, a collection of orders.
- **Representation** — a resource's data in a particular format, usually JSON. You never transfer the resource itself — only a representation of it.
- **Endpoint** — a URL plus a method: `GET /orders/ord_123`.
- **Collection** and **item** — `/orders` is a collection; `/orders/ord_123` is one item in it.
- **Stateless** — the server keeps no conversation state between requests; each request carries everything needed (including credentials — {{ch:frontend-authentication}}).
- **Safe method** — a method that does not change server state (GET, HEAD).
- **Idempotent method** — a method where making the same request several times has the same effect as making it once.
- **Contract** — the agreed shape of requests and responses that clients depend on, often written as an **OpenAPI** specification ({{ch:api-documentation}}).

## How it works inside: HTTP as the uniform interface

### Level 2 — The parts of a request that carry meaning

```text
  POST /orders?notify=sms HTTP/1.1                  ← method, path, query
  Host: api.cornershop.example
  Authorization: Bearer eyJ...                     ← headers: credentials, formats,
  Content-Type: application/json                     caching, idempotency, tracing
  Idempotency-Key: 4f1c8e2a-7b3d-4e9f-a1c2-55d0b8e6f901

  {"items":[{"productId":"chaunsa","quantity":2}]} ← body: the representation

  HTTP/1.1 201 Created                              ← status code: the outcome
  Location: /orders/ord_8xKp2mNq                   ← where the new resource lives
  Content-Type: application/json

  {"id":"ord_8xKp2mNq","status":"placed","totalPaisa":520000}
```

A well-designed REST API uses each part for its intended purpose:

- The **path** identifies **which** resource.
- The **method** says **what to do** with it.
- **Query parameters** refine reads: filtering, sorting, pagination.
- **Headers** carry metadata: credentials, content types, caching information, idempotency keys, request ids.
- The **body** carries the representation.
- The **status code** says what **happened**.

Because every REST API uses HTTP the same way, generic tools work with all of them: browsers, caches and CDNs ({{ch:caching}}), proxies, monitoring systems, API gateways ({{ch:api-gateway}}), client libraries and documentation generators. That uniformity is REST's main strength.

## Resources and URLs

### Level 3 — Nouns, not verbs

URLs name **things**. Methods supply the actions:

```text
  Good                              Avoid
  GET    /products                  GET  /getProducts
  GET    /products/chaunsa          GET  /product?id=chaunsa&action=view
  POST   /orders                    POST /createOrder
  PATCH  /orders/ord_8x             POST /orders/ord_8x/update
  DELETE /cart/items/chaunsa        GET  /deleteCartItem?id=chaunsa
```

Conventions most teams follow:

- **Plural nouns** for collections: `/products`, `/orders`, `/customers`.
- **Lowercase**, with hyphens between words: `/delivery-zones`.
- **Nesting** for clear ownership, at most one or two levels deep: `/orders/ord_8x/items`. Deep nesting (`/customers/7/orders/9/items/3/reviews`) becomes rigid; give items their own top-level path once they have their own identity (`/reviews/rev_3`).
- **No file extensions** or technology names in URLs (`.php`, `/api.json`). Use the `Accept` header for formats.
- **Stable identifiers**: a resource's URL should not change when its name changes.

### Level 3 — Identifiers

Avoid exposing **sequential integer ids** (`/orders/1043`) in public APIs:

- They let anyone **enumerate** your data by counting upwards — combined with a missing authorisation check, that is a data breach ({{ch:frontend-authentication}}).
- They reveal business information: a competitor can place an order on Monday and on Friday and see how many orders you received in between.

Common alternatives: random UUIDs, time-ordered **UUIDv7** values (which also work well as database keys — {{ch:indexes}}), or random ids with a readable type prefix such as `ord_8xKp2mNq` or `cus_4Lq9w2` (a style made popular by Stripe's API), which also makes it obvious in logs what kind of id you are looking at.

### Level 4 — When an action is not a simple CRUD operation

Some operations do not fit "create, read, update, delete" naturally: cancelling an order, refunding a payment, resending a verification email. Two common designs:

1. **Model the action as a state change** on the resource: `PATCH /orders/ord_8x` with `{"status": "cancelled"}`. Works when the change is simple and the server validates the transition ({{ch:object-oriented-programming}}).
2. **Model the action as a sub-resource** that is created: `POST /orders/ord_8x/cancellation`, or `POST /payments/pay_3/refunds` (a refund **is** a thing with its own id, amount and status).

The second is often clearer for operations with their own data and lifecycle. A few teams use explicit action URLs such as `POST /orders/ord_8x:cancel` (a style used in Google's API design guidelines). Pick one style and apply it consistently.

## HTTP methods and their guarantees

### Level 2 — The methods

| Method | Purpose | Safe | Idempotent | Typical success status |
|---|---|---|---|---|
| `GET` | Read a resource or collection | Yes | Yes | 200 |
| `HEAD` | Like GET, headers only | Yes | Yes | 200 |
| `POST` | Create a resource in a collection, or trigger processing | No | **No** | 201 (created) or 200/202 |
| `PUT` | **Replace** a resource entirely (or create it at a known URL) | No | Yes | 200 or 204 |
| `PATCH` | **Partially** update a resource | No | Not necessarily | 200 or 204 |
| `DELETE` | Remove a resource | No | Yes | 204 (or 200) |
| `OPTIONS` | Describe what is allowed (used by CORS preflight) | Yes | Yes | 204 |

### Level 2 — Why "safe" and "idempotent" matter

- **Safe** means "does not change anything". Browsers prefetch links, crawlers follow them ({{ch:seo}}), caches store responses, and users reload pages — all assuming GET is harmless. A `GET /orders/ord_8x/cancel` endpoint can be triggered by a link preview bot. **Never change state in a GET.**
- **Idempotent** means "repeating it is harmless". Networks fail: a request may reach the server, succeed, and then the **response** may be lost. The client cannot tell whether it succeeded. If the method is idempotent, the client — or a proxy, or a load balancer — can simply **retry**. `PUT /products/chaunsa/price {"pricePaisa": 260000}` twice leaves the price at 260,000. `DELETE /cart/items/chaunsa` twice leaves the item deleted (the second may return 404, but the **state** is the same).
- **POST is not idempotent**: `POST /orders` twice creates two orders. Retrying it blindly causes duplicate orders and double charges. The fix — **idempotency keys** — is shown later in this chapter.

### Level 3 — PUT versus PATCH

```text
  Current:  {"name":"Chaunsa, 5 kg", "pricePaisa":260000, "description":"Sweet...", "inStock":true}

  PUT   /products/chaunsa   {"name":"Chaunsa, 5 kg", "pricePaisa":250000}
        → the resource is REPLACED: description and inStock are now missing/defaulted

  PATCH /products/chaunsa   {"pricePaisa":250000}
        → only the price changes; everything else stays
```

`PUT` sends the **complete** representation; omitted fields are removed or reset. `PATCH` sends only the changes. Most application APIs use `PATCH` for updates, with a simple "merge" format (fields present are updated; fields absent are untouched). To **clear** a field with merge-patch semantics, send it as `null` explicitly. A formal standard for this format exists (JSON Merge Patch), as does a more powerful operations-based one (JSON Patch).

## Status codes

### Level 2 — The classes

| Range | Meaning |
|---|---|
| 1xx | Informational (rare in APIs) |
| 2xx | Success |
| 3xx | Redirection or "not modified" |
| 4xx | The **client** made a mistake — retrying the same request will fail again |
| 5xx | The **server** failed — retrying later may succeed |

That 4xx/5xx distinction is how clients decide whether to retry, and how monitoring decides whether to wake an engineer ({{ch:monitoring}}). Returning 500 for a validation error, or 400 for a database outage, breaks both.

### Level 3 — The codes you will actually use

| Code | When |
|---|---|
| **200 OK** | Successful GET, or PUT/PATCH returning the updated resource |
| **201 Created** | A POST created a resource; include a `Location` header with its URL and usually the resource in the body |
| **202 Accepted** | The request was accepted for processing later (asynchronous work) |
| **204 No Content** | Success with no body (often DELETE) |
| **304 Not Modified** | Conditional GET: the client's cached copy is still current |
| **400 Bad Request** | Malformed request: invalid JSON, wrong types, missing required fields |
| **401 Unauthorized** | No valid credentials (really "unauthenticated") |
| **403 Forbidden** | Authenticated but not allowed |
| **404 Not Found** | The resource does not exist — or the caller may not know it exists |
| **405 Method Not Allowed** | The method is not supported for this URL |
| **409 Conflict** | The request conflicts with the current state: duplicate email, insufficient stock, an invalid state transition |
| **412 Precondition Failed** | A conditional request's precondition (such as `If-Match`) failed |
| **415 Unsupported Media Type** | The body's `Content-Type` is not accepted |
| **422 Unprocessable Content** | Well-formed but semantically invalid (some teams use this for validation errors; others use 400 — choose one) |
| **429 Too Many Requests** | Rate limit exceeded; include `Retry-After` ({{ch:rate-limiting}}) |
| **500 Internal Server Error** | An unexpected server failure |
| **502 / 504** | A gateway or upstream service failed or timed out |
| **503 Service Unavailable** | Temporarily unavailable (maintenance, overload); include `Retry-After` |

> [!WARNING]
> The most damaging status-code mistake is **`200 OK` with an error in the body** (`{"success": false, "error": "..."}`). Every generic tool — caches, retry logic, monitoring dashboards, API gateways, client libraries — now thinks the request succeeded. Errors go unnoticed, failed responses get cached, and every client must parse every body to find out what happened. Use the status code.

## Request and response bodies

### Level 3 — Consistent representations

- **JSON** with consistent naming — choose `camelCase` (natural for JavaScript clients) or `snake_case`, and never mix them.
- **Dates and times** as ISO 8601 strings in UTC: `"2026-06-15T09:30:00Z"` ({{ch:types-of-data}}).
- **Money** as integers in the smallest unit with an explicit currency — `{"amount": 260000, "currency": "PKR"}` — never as floating-point numbers ({{ch:object-oriented-programming}}).
- **Enumerations** as readable strings: `"status": "shipped"`, not `"status": 3`.
- **Return the resource after creating or updating it**, so clients do not need a second request.
- **Only the fields clients need.** Serialise responses explicitly through a response type or schema — never `res.json(databaseRow)`, which leaks internal fields such as password hashes, internal notes or supplier costs.
- **No envelope needed for success.** Many APIs return the resource directly. Collections are usually wrapped so pagination information can sit alongside the items: `{"data": [...], "nextCursor": "..."}`.

### Level 4 — Error responses: problem details

A good error response lets **code** decide what to do and lets **people** understand what happened. An Internet standard, **Problem Details for HTTP APIs** (RFC 9457, which replaced RFC 7807), defines a common shape, served with the content type `application/problem+json`:

```json
{
  "type": "https://api.cornershop.example/problems/insufficient-stock",
  "title": "Insufficient stock",
  "status": 409,
  "detail": "Only 3 boxes of Chaunsa mangoes are left; you asked for 5.",
  "instance": "/orders",
  "code": "insufficient_stock",
  "requestId": "req_7Fx8bQKmN2",
  "errors": [{ "field": "items[0].quantity", "message": "Must be 3 or fewer" }]
}
```

- `type` — a URL identifying the kind of problem (ideally linking to documentation); `title` — a short, stable summary; `status` — the HTTP status; `detail` — a human-readable explanation of **this** occurrence; `instance` — where it happened.
- **Extension fields** are allowed: a stable machine-readable `code` that clients branch on, the **request id** for support tickets ({{ch:express}}), and field-level `errors` for validation failures ({{ch:forms}}).
- Never include stack traces, SQL or internal hostnames ({{ch:error-handling}}).

Whatever format you choose, the point is **one format for every error in the API**.

## Collections: pagination, filtering and sorting

### Level 3 — Why paginate

Never return an unbounded collection. `GET /orders` that returns two million rows is slow for the database, slow over the network, uses huge amounts of memory on both sides, and is a gift to attackers looking for a cheap way to overload you. Every collection endpoint returns a **page**, with a sensible default size and a **maximum** the client cannot exceed.

### Level 3 — Offset pagination

```text
GET /products?limit=20&offset=40      → items 41–60
```

Simple, and it supports "jump to page 7". But it has two problems:

- **It gets slower with depth.** `OFFSET 100000` makes the database read and discard 100,000 rows before returning 20 ({{ch:query-optimization}}).
- **It is unstable while data changes.** If a new product is inserted at the top while a client is paging, every item shifts down by one: the client sees one item twice and, when items are deleted, misses others.

Offset pagination is fine for small, slowly changing collections and admin screens where page numbers matter.

### Level 4 — Cursor pagination

**Cursor pagination** (also called keyset pagination) returns a **cursor** — an opaque token marking the position after the last item — and the client sends it back to get the next page:

```text
GET /products?limit=20                       → { data: [...20 items], nextCursor: "eyJ..." }
GET /products?limit=20&cursor=eyJ...         → the next 20 after that position
```

Internally, the cursor encodes the sort key of the last item, so the query becomes `WHERE (created_at, id) < (last_created_at, last_id) ORDER BY created_at DESC, id DESC LIMIT 21` — which uses an index and is equally fast on page 1 and page 10,000 ({{ch:indexes}}). New inserts do not shift later pages.

Here is a complete implementation over an in-memory array, showing the essential logic:

```ts
type Product = { id: string; name: string; createdAt: string };

const products: Product[] = Array.from({ length: 7 }, (_, i) => ({
  id: `p${i + 1}`,
  name: `Product ${i + 1}`,
  createdAt: new Date(Date.UTC(2026, 0, 1 + i)).toISOString(),
}));

type Cursor = { createdAt: string; id: string };

const encodeCursor = (c: Cursor) => Buffer.from(JSON.stringify(c)).toString("base64url");
const decodeCursor = (s: string): Cursor => JSON.parse(Buffer.from(s, "base64url").toString("utf8"));

// Newest first; ties broken by id so the order is total and stable
function isAfter(p: Product, c: Cursor): boolean {
  return p.createdAt < c.createdAt || (p.createdAt === c.createdAt && p.id < c.id);
}

function listProducts(limit: number, cursor?: string) {
  const size = Math.min(Math.max(limit, 1), 100);                    // clamp the page size
  const after = cursor ? decodeCursor(cursor) : null;
  const sorted = [...products].sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id));
  const candidates = after ? sorted.filter((p) => isAfter(p, after)) : sorted;
  const page = candidates.slice(0, size + 1);                         // fetch one extra
  const hasMore = page.length > size;
  const data = page.slice(0, size);
  const last = data.at(-1);
  return { data: data.map((p) => p.id), nextCursor: hasMore && last ? encodeCursor({ createdAt: last.createdAt, id: last.id }) : null };
}

let page = listProducts(3);
console.log(page.data, page.nextCursor !== null);
page = listProducts(3, page.nextCursor!);
console.log(page.data, page.nextCursor !== null);
page = listProducts(3, page.nextCursor!);
console.log(page.data, page.nextCursor);
```

**Output:**

```text
[ 'p7', 'p6', 'p5' ] true
[ 'p4', 'p3', 'p2' ] true
[ 'p1' ] null
```

Walk through it:

- The list is ordered newest first, with the **id as a tie-breaker**, so the order is total: no two items ever compare equal, and the cursor position is unambiguous.
- The cursor is the last item's `createdAt` and `id`, JSON-encoded and then **base64url**-encoded — a URL-safe text form. Clients must treat it as **opaque**: they pass it back unchanged and never construct or parse it, which leaves you free to change its contents later. (Because a client could still tamper with it, the server must validate a decoded cursor, or sign it.)
- The page size is **clamped** between 1 and 100, whatever the client asks.
- Fetching **one extra** item tells us whether another page exists, without a separate count query. If more exist, `nextCursor` is set; on the last page it is `null`.
- In a database, the filter and sort become a `WHERE ... ORDER BY ... LIMIT` query using an index on `(created_at, id)`.

The trade-off: cursor pagination cannot jump to an arbitrary page number, and total counts (if needed) must be computed separately, often approximately. For feeds, infinite scrolling, exports and public APIs, it is the better default.

### Level 3 — Filtering, sorting and sparse fields

```text
GET /orders?status=shipped&createdAfter=2026-06-01T00:00:00Z&sort=-createdAt&fields=id,status,totalPaisa
```

- **Filtering** with query parameters named after fields: `status=shipped`, `minPricePaisa=100000`, `category=mango`.
- **Sorting** with a `sort` parameter; a leading `-` commonly means descending; multiple fields separated by commas.
- **Sparse fieldsets**: `fields=id,status` returns only those fields, reducing payload size for list views.
- **Expansion**: `expand=customer` includes a related object inline, avoiding a second request per item — Stripe's API is a well-known example of this design.

Validate every one of these against an **allow-list**: only known filter fields, only sortable fields that have indexes, only permitted expansions. Passing arbitrary user input into sort or filter clauses invites both injection and very slow queries ({{ch:sql}}, {{ch:application-security}}).

## Making operations safe to retry: idempotency keys

### Level 3 — The problem

A customer taps "Pay". The request reaches the server; the payment succeeds; the order is created — and then the phone's connection drops before the response arrives. The app shows "Network error". The customer taps "Pay" again. Without protection, they are charged **twice**.

### Level 4 — The solution

The client generates a unique **idempotency key** for each logical operation (for example, a UUID when the checkout screen opens) and sends it with the request — and with every retry of that same operation:

```text
POST /payments
Idempotency-Key: 4f1c8e2a-7b3d-4e9f-a1c2-55d0b8e6f901
```

The server records the key with the result of the first request. A repeat with the same key returns the **stored result** instead of performing the operation again.

```ts
import express, { type Request, type Response, type NextFunction } from "express";

type Stored = { status: number; body: unknown; fingerprint: string } | "in-progress";
const idempotencyStore = new Map<string, Stored>(); // in production: Redis or a database table with expiry

function idempotent(req: Request, res: Response, next: NextFunction) {
  const key = req.get("Idempotency-Key");
  if (!key || !/^[\w-]{16,100}$/.test(key)) {
    res.status(400).json({ code: "idempotency_key_required", detail: "Send a unique Idempotency-Key header" });
    return;
  }
  const fingerprint = JSON.stringify(req.body);
  const existing = idempotencyStore.get(key);
  if (existing === "in-progress") {
    res.status(409).json({ code: "request_in_progress", detail: "A request with this key is still being processed" });
    return;
  }
  if (existing) {
    if (existing.fingerprint !== fingerprint) {
      res.status(422).json({ code: "idempotency_key_reused", detail: "This key was used with a different request body" });
      return;
    }
    res.set("Idempotent-Replayed", "true").status(existing.status).json(existing.body);
    return;
  }
  idempotencyStore.set(key, "in-progress");
  const originalJson = res.json.bind(res);
  res.json = (body: unknown) => {
    idempotencyStore.set(key, { status: res.statusCode, body, fingerprint });
    return originalJson(body);
  };
  next();
}

let charges = 0;
const app = express();
app.use(express.json());
app.post("/payments", idempotent, (req, res) => {
  charges++;
  res.status(201).json({ paymentId: `pay_${charges}`, amount: req.body.amount });
});

const server = app.listen(0, async () => {
  const url = `http://localhost:${(server.address() as { port: number }).port}/payments`;
  const pay = (key: string, amount: number) =>
    fetch(url, { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": key }, body: JSON.stringify({ amount }) });

  const key = "checkout-7f3a9c2e-0001";
  for (const attempt of [1, 2]) {
    const r = await pay(key, 520000);
    console.log(`attempt ${attempt}:`, r.status, await r.json(), r.headers.get("idempotent-replayed") ? "(replayed)" : "(new)");
  }
  const misuse = await pay(key, 1);
  console.log("same key, different body:", misuse.status, (await misuse.json()).code);
  console.log(`card charged ${charges} time(s)`);
  server.close();
});
```

**Output:**

```text
attempt 1: 201 { paymentId: 'pay_1', amount: 520000 } (new)
attempt 2: 201 { paymentId: 'pay_1', amount: 520000 } (replayed)
same key, different body: 422 idempotency_key_reused
card charged 1 time(s)
```

Walk through it:

- The middleware requires a well-formed key on this route.
- On the **first** request, it marks the key as "in progress" — so a duplicate arriving at the same moment gets a 409 instead of running in parallel — and wraps `res.json` so that the response is **stored** when the handler sends it.
- On a **retry** with the same key and the same body, the stored response is replayed, with a header saying so. The handler does not run; the card is charged once.
- Reusing a key with a **different** body is a client bug, and is rejected.
- In production, the store is shared by all server instances (Redis or a database table — {{ch:redis}}), entries **expire** after a period (Stripe documents keeping keys for 24 hours), and storing "in progress" must be atomic (for example, a database insert with a unique constraint, or Redis `SET ... NX`) so two simultaneous requests cannot both claim the key. If the handler fails with an error, the "in progress" marker must be cleared so the client can retry.
- The deeper protection is in the business logic itself: a unique constraint on, for example, `(order_id)` for payments, so even a buggy client cannot create duplicates ({{ch:database-design}}).

## Concurrency: ETags and conditional requests

### Level 4 — Lost updates

Two staff members open the same product in the admin panel. Ayesha changes the price; Bilal, a moment later, changes the description and saves — sending the whole product as he loaded it, including the **old** price. Ayesha's change is silently lost. This is the **lost update** problem.

### Level 4 — Optimistic concurrency with ETags

An **ETag** (entity tag) is a version identifier for a representation, returned in a response header. Clients send it back in conditional request headers:

- **`If-Match: "v7"`** on PUT/PATCH/DELETE: "apply this change **only if** the resource is still version v7". If it has changed, the server returns **412 Precondition Failed**, and the client must reload and reapply its change.
- **`If-None-Match: "v7"`** on GET: "send the resource only if it has changed". If not, the server returns **304 Not Modified** with no body — saving bandwidth and enabling caching ({{ch:caching}}).

```ts
import express from "express";

const product = { id: "chaunsa", name: "Chaunsa, 5 kg", pricePaisa: 260000, version: 7 };
const etagOf = () => `"v${product.version}"`;

const app = express();
app.use(express.json());

app.get("/products/chaunsa", (req, res) => {
  if (req.get("If-None-Match") === etagOf()) {
    res.status(304).end();
    return;
  }
  res.set("ETag", etagOf()).json(product);
});

app.patch("/products/chaunsa", (req, res) => {
  if (req.get("If-Match") !== etagOf()) {
    res.status(412).json({ code: "version_conflict", detail: "The product was changed by someone else. Reload and try again." });
    return;
  }
  Object.assign(product, req.body, { version: product.version + 1 });
  res.set("ETag", etagOf()).json(product);
});

const server = app.listen(0, async () => {
  const url = `http://localhost:${(server.address() as { port: number }).port}/products/chaunsa`;
  const loaded = await fetch(url);
  const etag = loaded.headers.get("etag")!;
  console.log("loaded", etag);

  const revalidate = await fetch(url, { headers: { "If-None-Match": etag } });
  console.log("revalidate:", revalidate.status);

  const patch = (body: object, version: string) =>
    fetch(url, { method: "PATCH", headers: { "Content-Type": "application/json", "If-Match": version }, body: JSON.stringify(body) });

  const ayesha = await patch({ pricePaisa: 250000 }, etag);
  console.log("Ayesha:", ayesha.status, ayesha.headers.get("etag"));
  const bilal = await patch({ name: "Chaunsa mangoes, 5 kg box" }, etag); // stale version
  console.log("Bilal:", bilal.status, (await bilal.json()).code);
  server.close();
});
```

**Output:**

```text
loaded "v7"
revalidate: 304
Ayesha: 200 "v8"
Bilal: 412 version_conflict
```

- The resource carries a `version` number that increases on every change; the ETag is derived from it. (ETags can also be hashes of the content.)
- Revalidating with `If-None-Match` and an unchanged version returns 304 with no body.
- Ayesha's update matches version 7, succeeds, and produces version 8.
- Bilal's update still says version 7, so it is **rejected** instead of silently overwriting Ayesha's price. His client shows "This product changed — reload".
- In a database, the same check is a single atomic statement: `UPDATE products SET ..., version = version + 1 WHERE id = $1 AND version = $2`, and zero updated rows means a conflict ({{ch:transactions}}). This approach is called **optimistic concurrency control**: assume conflicts are rare, and detect them instead of locking.

## Long-running operations

Some requests take too long to complete within an HTTP request: generating a large report, processing a video, importing a spreadsheet of 100,000 products. Holding the connection open for minutes is fragile (timeouts at proxies and load balancers) and wastes server resources.

The standard pattern:

```text
  POST /reports           {"type":"monthly-sales","month":"2026-05"}
  ← 202 Accepted
    Location: /reports/jobs/job_91
    {"id":"job_91","status":"queued"}

  GET /reports/jobs/job_91
  ← 200 {"id":"job_91","status":"running","progress":0.4}

  GET /reports/jobs/job_91
  ← 200 {"id":"job_91","status":"completed","resultUrl":"/reports/rep_33"}
```

- The server creates a **job**, puts the work on a queue ({{ch:queues}}), and returns **202 Accepted** with the job's URL.
- The client **polls** the job (with a sensible interval), or the server notifies it when done — by a **webhook** (an HTTP request from your server to a URL the client registered) or a real-time channel ({{ch:websockets}}).
- Jobs have clear states (`queued`, `running`, `completed`, `failed`), and failures include a problem description.

## Versioning, evolution and deprecation

APIs must change without breaking existing clients. The golden rule is to make **backwards-compatible** changes whenever possible:

- **Safe**: adding new endpoints; adding **optional** request fields; adding fields to responses (clients must ignore fields they do not know); adding new enumeration values (if clients were told to expect them).
- **Breaking**: removing or renaming fields or endpoints; changing types or meanings; making optional fields required; changing status codes or error formats; tightening validation.

When a breaking change is unavoidable, introduce a **new version** — through the URL (`/v2/orders`), a header, or a date-based version pinned per client (Stripe's documented approach) — and **deprecate** the old one with advance notice, `Deprecation` and `Sunset` headers, and usage monitoring before removal. You will study the strategies in detail in {{ch:api-versioning}}.

## Designing contract-first

The most reliable way to produce a good API is to **design before implementing**:

1. **List the resources** in your domain and their relationships.
2. **Define the operations and state transitions**: who may do what, and when.
3. **Write the contract** — an OpenAPI specification describing paths, parameters, request and response schemas and errors ({{ch:api-documentation}}).
4. **Review it with the people who will call it** — front-end, mobile and partner developers. Changing a specification costs minutes; changing a deployed API costs months.
5. **Generate code from it**: types, client libraries, validation and mock servers, so client and server cannot drift.
6. **Implement**, with tests that check responses against the contract.

Many organisations also publish **API style guides** — Google, Microsoft and Zalando, among others, have made theirs public — so every team's APIs look alike.

## REST and its alternatives

REST over HTTP and JSON is the most common style for public and internal APIs, but not the only one:

- **GraphQL** lets clients ask for exactly the fields and related objects they need in one request, through a single endpoint and a typed schema — useful for complex, client-driven data needs ({{ch:graphql}}).
- **gRPC** uses binary Protocol Buffers over HTTP/2 with generated clients — efficient for service-to-service communication inside a system ({{ch:microservices}}).
- **WebSockets and server-sent events** for real-time, server-initiated updates ({{ch:websockets}}).
- **Webhooks** for notifying other systems of events.

Many systems combine them: REST for public resources, gRPC between internal services, WebSockets for live updates.

## From beginner to enterprise

**Level 3 — first API.** Resource URLs, correct methods and status codes, JSON bodies, 404s and 400s.

**Level 4 — application API.** Consistent naming; one error format with machine codes; validated, allow-listed query parameters; cursor pagination with maximum sizes; explicit response serialisation; idempotency keys on payments and orders; ETags for admin edits.

**Level 5 — professional practice.** Contract-first OpenAPI with generated types; an API style guide; contract tests; deprecation policies; request ids in every response; monitoring per endpoint (latency, error rates by status class — {{ch:monitoring}}).

**Level 6 — platforms.** Public APIs used by thousands of third parties; long-term versioning strategies; developer portals, SDKs and sandboxes; rate limits and quotas per customer ({{ch:rate-limiting}}); API gateways handling authentication and analytics ({{ch:api-gateway}}); webhooks with signatures and retries.

## Real-world use cases

### A shop's public catalogue and checkout

- `GET /products` with cursor pagination, filters for category and price, sparse fields for list views, ETags and cache headers so CDNs can cache public responses ({{ch:cloudfront}}).
- `POST /carts`, `PUT /carts/{id}/items/{productId}` (idempotent quantity setting), `POST /orders` with an idempotency key, `POST /orders/{id}/cancellation`.
- Problem-details errors with codes such as `insufficient_stock`, `coupon_expired`, `address_outside_delivery_zone`, which the app maps to friendly messages.

### A partner integration

- **Problem:** a courier company needs to create shipments and receive status updates.
- **Design:** `POST /shipments` with idempotency keys (their system retries aggressively); `GET /shipments/{id}`; webhooks to the courier's URL for status changes, **signed** with a shared secret so they can verify authenticity, and retried with backoff if their server is down.
- **Lesson:** design for unreliable networks on both sides.

## Common mistakes

### Beginner: verbs in URLs and GET requests that change data

**Fix:** nouns for resources; methods for actions; never change state in GET.

### Beginner: everything returns 200

**Fix:** correct status codes; one error format.

### Beginner: returning database rows directly

**Consequence:** leaked internal fields; clients coupled to the database schema. **Fix:** explicit response types.

### Intermediate: unbounded collections

**Fix:** pagination by default with a maximum page size.

### Intermediate: offset pagination on large, changing data

**Fix:** cursor pagination.

### Intermediate: inconsistent naming and formats

`createdAt` here, `created_date` there; dates as local strings. **Fix:** a style guide; ISO 8601 UTC; review.

### Production: non-idempotent payments and orders

**Consequence:** double charges on retries. **Fix:** idempotency keys and unique constraints.

### Production: lost updates

**Fix:** ETags with `If-Match`, or version checks in updates.

### Enterprise: breaking changes without versioning

**Fix:** additive changes; versioning and deprecation for breaking ones; contract tests.

## Debugging and troubleshooting

- **Read the whole exchange**: method, URL, request headers and body, response status, headers and body. `curl -v`, the browser's Network panel or an API client show everything.
- **4xx means look at the request; 5xx means look at the server logs** — find them by the request id from the response.
- **A client "sees no error" but nothing happened**: a 200 with an error body, or a 202 for asynchronous work that later failed.
- **Duplicate records**: retries without idempotency; check gateway and client retry settings.
- **Slow collection endpoints**: deep offset pagination, missing indexes for filters and sorts, or N+1 queries when building each item ({{ch:query-optimization}}).
- **Intermittent 412s**: clients sending stale ETags — check that they update their stored ETag from every response.

## Security

The OWASP Foundation's **API Security Top 10** (2023 edition) lists the most common API risks. The ones you will meet most:

1. **Broken object level authorisation (BOLA)** — the endpoint authenticates the caller but does not check that **this** caller may access **that** object. Push ownership into the query (`WHERE id = $1 AND customer_id = $2`) and return 404 for objects the caller may not see ({{ch:frontend-authentication}}).
2. **Broken authentication** — weak tokens, no expiry, no revocation ({{ch:authentication}}).
3. **Broken object property level authorisation** — returning fields the caller should not see (excessive data exposure) or accepting fields they should not set (mass assignment). Use explicit response and request schemas.
4. **Unrestricted resource consumption** — no pagination limits, no body limits, no rate limits, expensive queries on demand.
5. **Broken function level authorisation** — admin endpoints reachable by ordinary users because "they are not linked in the app".
6. **Unrestricted access to sensitive business flows** — automated abuse of flows such as buying limited stock or creating accounts.
7. **Server-side request forgery (SSRF)** — endpoints that fetch user-supplied URLs can be tricked into calling internal services ({{ch:application-security}}).
8. **Security misconfiguration**, 9. **improper inventory management** (forgotten old versions still running), and 10. **unsafe consumption of other APIs** (trusting third-party responses without validation).

Also: HTTPS only; no sensitive data in URLs (they are logged); non-sequential ids; validated cursors and filters; request ids for auditing.

## How a senior engineer thinks about this

- **An API is a product with users.** They design it for the people integrating with it, and review it with them before building.
- **Consistency beats cleverness.** One naming style, one error format, one pagination scheme, one versioning policy.
- **Design for failure**: timeouts, retries, duplicates and concurrent edits are normal, so idempotency and optimistic concurrency are built in.
- **Changes are forever.** They prefer additive evolution and treat removals as projects with notice periods and metrics.
- **Security lives in every endpoint**: ownership in queries, explicit schemas, limits on everything.

## Exercises

### Exercise 1 — Design the endpoints

**Objective:** practise resource modelling.
**The scenario:** a clinic needs an API for patients, doctors and appointments. Patients book, reschedule and cancel appointments; doctors see their schedule; staff mark patients as arrived. Design the endpoints (method, path, purpose, success status).

<details>
<summary>Show the solution</summary>

| Method | Path | Purpose | Status |
|---|---|---|---|
| GET | `/doctors` | List doctors (filters: `specialty`, `date` with availability) | 200 |
| GET | `/doctors/{doctorId}/availability?date=2026-06-15` | Free slots for a day | 200 |
| GET | `/appointments?doctorId=...&date=...` | List appointments (staff, doctors); patients see only their own | 200 |
| POST | `/appointments` | Book (body: doctorId, slot start; Idempotency-Key header) | 201 + Location |
| GET | `/appointments/{id}` | One appointment (owner, its doctor, or staff) | 200 |
| PATCH | `/appointments/{id}` | Reschedule (new slot), with `If-Match` | 200 |
| POST | `/appointments/{id}/cancellation` | Cancel (body: reason) | 201 |
| POST | `/appointments/{id}/check-in` | Staff mark the patient as arrived | 201 |
| GET | `/patients/me` | The logged-in patient's profile | 200 |

**Notes:** cancellations and check-ins are modelled as sub-resources because they have their own data (reason, time, who did it) and are not simple field edits. Booking uses an idempotency key, since a double booking is costly. Rescheduling uses ETags to avoid two staff members moving the same appointment. Conflicts (slot already taken, appointment already cancelled) return **409** with codes such as `slot_unavailable`. Authorisation is checked per object: patients see only their appointments.

</details>

### Exercise 2 — Fix the API

**Objective:** practise spotting design problems.
**Starting point:**

```text
GET  /getAllOrders                       → 200 [ ...all 400,000 orders... ]
GET  /order?id=1043                      → 200 { "success": false, "msg": "not found" }
POST /orders/1043/delete                 → 200 { "success": true }
POST /updateOrderStatus  {"id":1043,"status":2}
GET  /orders/1043/cancel                 → cancels the order
```

**What to do:** list the problems and propose a corrected design.

<details>
<summary>Show the solution</summary>

**Problems:** verbs in URLs; no pagination; sequential, guessable ids; errors returned as 200; deletion via POST to a verb URL; numeric status codes in bodies; a GET that changes state (cancellable by crawlers and link previews); no idempotency; inconsistent formats.

**Corrected:**

```text
GET    /orders?status=shipped&limit=50&cursor=...   → 200 {"data":[...], "nextCursor":"..."}
GET    /orders/ord_8xKp2mNq                         → 200 {...}  or 404 problem+json
DELETE /orders/ord_8xKp2mNq                         → 204   (if deletion is allowed at all)
PATCH  /orders/ord_8xKp2mNq  {"status":"shipped"}   → 200 {...} (If-Match for concurrency)
POST   /orders/ord_8xKp2mNq/cancellation  {"reason":"customer request"} → 201
```

Statuses are readable strings; ids are random and prefixed; collections are paginated with a maximum; errors use one problem-details format with machine codes; state changes never use GET; invalid transitions (cancelling a delivered order) return 409. Orders are usually **not deleted** in real systems at all — they are cancelled and kept for accounting.

</details>

### Exercise 3 — Debug the duplicates

**Objective:** practise idempotency reasoning.
**The scenario:** a mobile app's order screen sends `POST /orders`. The app's HTTP library retries automatically on timeouts. During a busy sale, the database becomes slow, many requests take longer than the app's 10-second timeout, and customers receive two or three identical orders. What happened, and how do you fix it at every layer?

<details>
<summary>Show the solution</summary>

**What happened:** each slow request **did** succeed on the server, but after the app had already given up waiting. The app retried, creating another order; a third timeout created a third. POST is not idempotent, so every retry was a new order.

**Fixes:**
1. **Client**: generate an idempotency key when the user taps "Place order" and send it with every retry of that operation; disable the button while submitting ({{ch:browser-and-dom}}).
2. **API**: require `Idempotency-Key` on `POST /orders`; store keys atomically in a shared store with an "in progress" state and the final response; replay stored responses for retries.
3. **Database**: a unique constraint on the idempotency key column of the orders table (or on a client-generated order reference), so even a bug elsewhere cannot create duplicates.
4. **Capacity**: investigate the slow database — slow queries, missing indexes, connection pool exhaustion ({{ch:query-optimization}}) — and align timeouts (the client timeout should exceed typical server processing time; long operations should become asynchronous with 202).
5. **Clean-up**: detect and refund existing duplicates; add monitoring for duplicate orders per customer within a short window.

</details>

### Exercise 4 — Production scenario: a public API launch

**Objective:** plan a public API.
**The scenario:** your shop will offer a public API so resellers can list your products and place orders on behalf of their customers. Write a checklist of design and operational decisions before launch.

<details>
<summary>Show the solution</summary>

1. **Contract-first**: an OpenAPI specification reviewed with two pilot resellers; generated SDK or at least types.
2. **Authentication**: API keys or OAuth client credentials per reseller, with scopes (read catalogue / place orders), rotation and revocation ({{ch:oauth}}).
3. **Authorisation**: each reseller sees only their own orders; ownership enforced in queries.
4. **Resources and URLs**: products, prices, stock, orders, shipments; consistent naming; prefixed random ids.
5. **Pagination**: cursor-based with maximum page size; filters allow-listed.
6. **Idempotency keys** required on order creation; documented retention period.
7. **Errors**: problem-details with stable codes and documentation links; request ids.
8. **Versioning and deprecation policy**, published in advance; changelog ({{ch:api-versioning}}).
9. **Rate limits and quotas** per reseller, with `429` and `Retry-After` ({{ch:rate-limiting}}).
10. **Webhooks** for order and shipment status, signed, retried with backoff, with a way to replay missed events.
11. **Sandbox environment** with test data, so resellers can integrate safely.
12. **Documentation and developer portal** ({{ch:api-documentation}}).
13. **Monitoring** per reseller and endpoint: latency, errors by class, quota usage; alerts on spikes in 4xx/5xx ({{ch:monitoring}}).
14. **Security review** against the OWASP API Top 10; HTTPS only; no sensitive data in URLs; old versions inventoried.

</details>

## Summary

A REST API exposes **resources** at stable URLs and manipulates them through HTTP's uniform interface: methods for actions, status codes for outcomes, headers for metadata and bodies for representations. Because every REST API uses HTTP the same way, generic tools — caches, proxies, gateways, monitoring — work with all of them.

Name resources with plural nouns, nest shallowly, and use non-sequential ids. Respect method semantics: **GET** is safe and must never change state; **PUT** and **DELETE** are idempotent; **POST** is not; **PATCH** updates partially. Return precise **status codes** — never errors with 200 — and one consistent, machine-readable error format such as **problem details** with stable codes and request ids. Design representations consistently: one naming style, ISO 8601 UTC times, integer money with currency, readable enumerations, and explicit serialisation that never leaks internal fields.

**Paginate** every collection with a maximum size, preferring **cursor pagination** for large or changing data; allow-list filters, sorts, sparse fields and expansions. Make retries safe with **idempotency keys** and unique constraints; prevent lost updates with **ETags** and `If-Match` (optimistic concurrency), and save bandwidth with `If-None-Match` and 304. Model long-running work as jobs with **202 Accepted**. Evolve APIs with additive changes, version and deprecate deliberately, design contract-first with OpenAPI, and secure every endpoint against the OWASP API Top 10 — above all, broken object-level authorisation.

## Key terms

- **API (Application Programming Interface)** — A defined way for one program to use another's functionality or data.
- **REST (Representational State Transfer)** — An architectural style in which resources identified by URLs are manipulated through a uniform interface such as HTTP.
- **Resource** — A thing exposed by an API, such as a product, order or collection.
- **Representation** — The data of a resource in a particular format, such as JSON.
- **Endpoint** — A combination of URL and HTTP method that an API exposes.
- **Collection** — A resource that contains a list of items, such as `/orders`.
- **Stateless (API)** — Describing an API where each request contains everything needed to process it, without server-held conversation state.
- **Safe method** — An HTTP method that does not change server state, such as GET.
- **Idempotent** — Describing an operation whose effect is the same whether it is performed once or several times.
- **PUT** — The HTTP method that replaces a resource entirely.
- **PATCH** — The HTTP method that partially updates a resource.
- **Status code** — A three-digit number in an HTTP response indicating the outcome of the request.
- **Problem details** — A standard JSON format (RFC 9457) for describing errors in HTTP APIs.
- **Offset pagination** — Paging through results by skipping a number of items.
- **Cursor pagination** — Paging through results using an opaque token that marks the position after the last item returned.
- **Sparse fieldset** — A request for only certain fields of a resource.
- **Idempotency key** — A unique client-supplied identifier that lets a server recognise and safely ignore repeated requests.
- **ETag** — A response header containing a version identifier for a resource's representation.
- **Conditional request** — A request that is processed only if a condition, such as a matching ETag, holds.
- **Optimistic concurrency control** — Detecting conflicting updates by checking versions at write time instead of locking.
- **Lost update** — A concurrency problem where one change silently overwrites another made at the same time.
- **202 Accepted** — A status code indicating that a request has been accepted for processing that will complete later.
- **Webhook** — An HTTP request sent by a server to a URL registered by another system to notify it of an event.
- **Backwards-compatible change** — A change to an API that does not break existing clients.
- **Deprecation** — Announcing that an API feature will be removed, while it still works, to give clients time to migrate.
- **Contract-first design** — Designing and agreeing an API's specification before implementing it.
- **OpenAPI** — A standard format for describing HTTP APIs, their operations and their data schemas.
- **Broken object level authorisation (BOLA)** — A vulnerability where an API lets a caller access objects belonging to others.

## What comes next

Every endpoint in this chapter began by trusting nothing a client sent. The next chapter, {{ch:validation}}, makes that principle systematic: where validation belongs, how schemas describe and enforce the shape of data at every boundary — requests, responses, configuration, messages from other services — and how validation protects both correctness and security.
