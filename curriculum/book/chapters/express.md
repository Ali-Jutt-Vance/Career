# Express: Your First Web Server

> [!GOALS]
> - Explain what a web framework adds to Node's `http` module, and why Express became the most widely used one.
> - Build an Express application: routes, route parameters, query strings, request bodies and responses.
> - Understand **middleware** — the chain every request travels through — and write your own.
> - Organise an application into routers, controllers, services and repositories.
> - Validate input, handle errors centrally, and return consistent responses.
> - Add the production essentials: security headers, CORS, body limits, logging with request ids, health checks and graceful shutdown.
> - Test Express applications, and know when to choose Express, Fastify or NestJS.

## Why this matters

In {{ch:nodejs}} you built an HTTP server with Node's core `http` module. It worked — and it showed how much you must do by hand: parse URLs, match paths with regular expressions, read request bodies from streams, set headers, convert to JSON, handle errors, and repeat the same checks in every handler. A real API with fifty endpoints written that way becomes a tangle of duplicated code.

A **web framework** handles this routine work so that each endpoint contains only its own logic. **Express**, first released in 2010, became the standard Node.js framework: it is small, flexible and stable, and an enormous ecosystem of middleware grew around it. Many other tools are built on it or inspired by it — NestJS uses Express underneath by default ({{ch:nestjs-basics}}) — and countless production APIs and job listings use it. Version 5, the current major version, modernised it with built-in support for `async` route handlers.

More importantly, Express teaches the **middleware model** — a request passing through a chain of small functions — which appears in almost every back-end framework in every language. Learning it well here will make every other framework easier.

## The simple idea

Think of a passport control queue at an airport. Each traveller passes through a sequence of stations: a ticket check, a passport check, a security scan, a customs desk, and finally the gate. Each station can let the traveller continue, send them back, or stop them entirely. The stations are independent — the security team does not need to know how customs works — and new stations can be added without rebuilding the airport.

An Express application is that sequence of stations for HTTP requests. Each station is a **middleware function**: one logs the request, one parses the body, one checks that the user is logged in, one validates the input, and finally a **route handler** does the actual work and sends a response.

> [!ANALOGY]
> An Express app is like an airport's sequence of checkpoints: every request passes through independent stations — logging, parsing, authentication, validation — before reaching its gate, the route handler.
>
> **Where the analogy breaks:** an airport moves travellers one station at a time in a strict line. In Express, thousands of requests travel through the chain **concurrently** on one thread ({{ch:nodejs}}), each paused at whichever station is waiting for I/O. And a station can also act **on the way back**, after the response has been decided — for example, to measure how long the request took.

## The proper definition and key words

**Express** is a minimal web framework for Node.js that provides routing, a middleware pipeline, and helpers for working with HTTP requests and responses.

The key words:

- **Application** (`app`) — the Express object that holds your routes and middleware and handles requests.
- **Route** — a combination of an HTTP **method** (GET, POST...) and a **path** pattern, with the handler that runs for it.
- **Route handler** — the function that produces the response for a route.
- **Middleware** — a function that receives the request, the response and a `next` function; it can act on the request, end it with a response, or pass control to the next function.
- **Router** — a mini-application holding a group of related routes and middleware, mounted at a path.
- **Request object** (`req`) — information about the incoming request: method, URL, parameters, headers, body.
- **Response object** (`res`) — methods to build and send the reply: status code, headers, body.
- **Error-handling middleware** — middleware with four parameters `(err, req, res, next)` that handles errors raised anywhere earlier.

## How it works inside

### Level 2 — From `node:http` to Express

Express is a layer on top of Node's `http` module. When you call `app.listen(3000)`, Express creates a `node:http` server and passes every request to its own request handler, which runs the middleware chain:

```text
  incoming HTTP request
          │
          ▼
  node:http server ──▶ app(req, res)       Express adds helpers to req and res
                          │
                          ▼
              ┌───────────────────────────┐
              │ middleware 1  (logging)   │── next() ──┐
              └───────────────────────────┘            │
              ┌───────────────────────────┐            │
              │ middleware 2  (parse JSON)│◀───────────┘── next() ──┐
              └───────────────────────────┘                         │
              ┌───────────────────────────┐                         │
              │ route: POST /orders       │◀────────────────────────┘
              │   handler sends response  │
              └───────────────────────────┘
                          │ (if anything throws or calls next(err))
                          ▼
              ┌───────────────────────────┐
              │ error-handling middleware │
              └───────────────────────────┘
```

Express keeps an ordered **stack** of layers — every `app.use(...)` and every route you register, in the order you registered them. For each request, it walks the stack from the top, running each layer whose path (and method, for routes) matches. Each layer either **ends the response** (`res.json(...)`, `res.send(...)`) or calls **`next()`** to move on. If a layer calls `next(error)` or throws, Express skips ordinary layers and jumps to the next **error-handling** middleware.

Three consequences follow, and they explain most Express bugs:

1. **Order matters.** Middleware runs in registration order. A body parser registered after your routes is useless; an error handler registered before them never sees their errors.
2. **Every request must end exactly once.** A layer that neither responds nor calls `next()` leaves the request **hanging**; a layer that responds twice causes "Cannot set headers after they are sent".
3. **Errors flow to error handlers**, so error handling can live in **one** place.

## Your first Express application

### Level 3 — Installing and a first route

```bash
mkdir shop-api && cd shop-api
npm init -y
npm pkg set type=module
npm install express
npm install --save-dev typescript @types/express @types/node
```

```ts
import express from "express";

const app = express();

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

const server = app.listen(0, async () => {
  const { port } = server.address() as { port: number };
  const response = await fetch(`http://localhost:${port}/health`);
  console.log(response.status, response.headers.get("content-type"), await response.json());
  server.close();
});
```

**Output:**

```text
200 application/json; charset=utf-8 { status: 'ok' }
```

- `express()` creates an application.
- `app.get(path, handler)` registers a route for GET requests to `/health`. Similar methods exist for every HTTP method: `app.post`, `app.put`, `app.patch`, `app.delete`, and `app.all` for any method.
- `res.json(value)` converts the value to JSON, sets `Content-Type: application/json` and the status (200 by default), and sends it — three steps that took several lines with `node:http`.
- `app.listen(port)` starts the underlying HTTP server and returns it. Here, as in {{ch:nodejs}}, port 0 asks for any free port, and the example calls itself with `fetch` to show the result. In a real application you would use a fixed port from configuration, such as `app.listen(config.PORT)`.

### Level 3 — Route parameters and query strings

```ts
import express from "express";

const app = express();

const products = [
  { id: "sindhri", name: "Sindhri mangoes, 5 kg", category: "mango", pricePaisa: 225000 },
  { id: "chaunsa", name: "Chaunsa mangoes, 5 kg", category: "mango", pricePaisa: 260000 },
  { id: "lychee", name: "Lychees, 1 kg", category: "other", pricePaisa: 90000 },
];

// GET /products?category=mango&maxPricePaisa=250000
app.get("/products", (req, res) => {
  const category = typeof req.query.category === "string" ? req.query.category : undefined;
  const maxPrice = Number(req.query.maxPricePaisa ?? Infinity);
  const result = products.filter(
    (p) => (!category || p.category === category) && p.pricePaisa <= maxPrice,
  );
  res.json(result.map((p) => p.id));
});

// GET /products/chaunsa
app.get("/products/:id", (req, res) => {
  const product = products.find((p) => p.id === req.params.id);
  if (!product) {
    res.status(404).json({ message: `No product with id "${req.params.id}"` });
    return;
  }
  res.json(product);
});

const server = app.listen(0, async () => {
  const base = `http://localhost:${(server.address() as { port: number }).port}`;
  for (const path of ["/products?category=mango&maxPricePaisa=250000", "/products/lychee", "/products/apple"]) {
    const r = await fetch(base + path);
    console.log(r.status, JSON.stringify(await r.json()));
  }
  server.close();
});
```

**Output:**

```text
200 ["sindhri"]
200 {"id":"lychee","name":"Lychees, 1 kg","category":"other","pricePaisa":90000}
404 {"message":"No product with id \"apple\""}
```

Walk through it:

- **Route parameters**: `:id` in the path matches one segment, and its value appears in `req.params.id`. A route can have several: `/categories/:category/products/:id`.
- **Query strings**: `?category=mango&maxPricePaisa=250000` is parsed into `req.query`. Values are **strings** (or arrays, or nested objects, if the client sends repeated or bracketed keys), so check their types — `typeof req.query.category === "string"` — and convert numbers explicitly. Better still, validate the whole query with a schema (below).
- **`res.status(404).json(...)`** chains a status code with the body. After sending, `return` so no further code tries to send another response.
- Notice that `/products/:id` is registered **after** `/products`, but order does not matter here because the paths cannot both match. It would matter for paths such as `/products/featured` and `/products/:id`: the specific route must be registered first, or `:id` would capture `"featured"`.

> [!TIP]
> Express 5 uses a stricter path syntax than earlier versions. A "match everything else" wildcard is written with a name, such as `/files/*filePath`, and optional parts with braces, such as `/products{/:id}`. You will see older patterns like `*` and `/:id?` in Express 4 code.

### Level 3 — Request bodies

Clients send data in the request **body**, usually as JSON. Express does not parse bodies by default; you add **body-parsing middleware**:

```ts
import express from "express";

const app = express();
app.use(express.json({ limit: "100kb" }));

app.post("/orders", (req, res) => {
  const { productId, quantity } = req.body as { productId?: unknown; quantity?: unknown };
  if (typeof productId !== "string" || !Number.isInteger(quantity) || (quantity as number) < 1) {
    res.status(400).json({ message: "productId (string) and quantity (positive integer) are required" });
    return;
  }
  res.status(201).json({ orderId: "ORD-1001", productId, quantity });
});

const server = app.listen(0, async () => {
  const url = `http://localhost:${(server.address() as { port: number }).port}/orders`;
  const send = (body: string) =>
    fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body }).then(async (r) => `${r.status} ${(await r.text()).slice(0, 80)}`);
  console.log(await send(JSON.stringify({ productId: "chaunsa", quantity: 2 })));
  console.log(await send(JSON.stringify({ productId: "chaunsa", quantity: "lots" })));
  console.log(await send("{not json"));
  server.close();
});
```

**Output:**

```text
201 {"orderId":"ORD-1001","productId":"chaunsa","quantity":2}
400 {"message":"productId (string) and quantity (positive integer) are required"}
400 <!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Error</tit
```

- `app.use(express.json())` registers middleware for **every** request: if the request's `Content-Type` is JSON, it reads the body stream, parses it, and puts the result in `req.body`.
- **`limit: "100kb"`** caps the body size (100 KB is also the default). Without limits, an attacker could send gigabytes and exhaust your server's memory ({{ch:nodejs}}). Raise the limit only on specific routes that genuinely need it.
- `req.body` is **untrusted** and its type is unknown, so the handler checks it before use — here by hand, later with a schema.
- `201 Created` is the right status for successfully creating something ({{ch:rest-apis}}).

- The third request sends **broken JSON**. `express.json()` fails to parse it and passes an error to `next`, so our route handler **never runs**. With no error handler of our own, Express's built-in default handler replies with status 400 and an **HTML** error page — which, outside production mode, even includes the stack trace with file paths on the server. That is wrong for a JSON API (clients expect JSON) and a security problem (it leaks internal details). The error-handling section below fixes it.

### Level 3 — The response toolkit

| Method | Effect |
|---|---|
| `res.status(code)` | Sets the status code (chainable) |
| `res.json(value)` | Sends JSON |
| `res.send(body)` | Sends a string, buffer or object |
| `res.sendStatus(code)` | Sends just a status with its standard text |
| `res.set(name, value)` / `res.setHeader` | Sets a header |
| `res.cookie(name, value, options)` | Sets a cookie ({{ch:sessions}}) |
| `res.redirect(status, url)` | Redirects |
| `res.sendFile(path)` / `res.download(path)` | Sends a file (streamed) |
| `res.end()` | Ends the response with no body |

Express also provides helpers on `req`: `req.get("Header-Name")` reads a header, `req.ip` gives the client's address (see "trust proxy" below), and `req.path`, `req.method` and `req.originalUrl` describe the request.

## Middleware

### Level 2 — The shape of middleware

A middleware function has three parameters:

```ts
// fragment
import type { Request, Response, NextFunction } from "express";

function middleware(req: Request, res: Response, next: NextFunction) {
  // 1. do something with req or res
  // 2. then EITHER end the response (res.json(...))
  //    OR call next() to continue
  //    OR call next(error) to jump to the error handler
}
```

It can be registered for every request (`app.use(fn)`), for every request under a path (`app.use("/admin", fn)`), or for a single route, between the path and the handler (`app.post("/orders", authenticate, validate, handler)`).

### Level 3 — Writing middleware: timing and request ids

```ts
import express, { type Request, type Response, type NextFunction } from "express";
import { randomUUID } from "node:crypto";

const app = express();

// 1. Give every request an id, and expose it to the client
app.use((req: Request, res: Response, next: NextFunction) => {
  const incoming = req.get("X-Request-Id");
  const id = incoming && /^[\w-]{8,64}$/.test(incoming) ? incoming : randomUUID();
  res.locals.requestId = id;
  res.set("X-Request-Id", id);
  next();
});

// 2. Log each request when its response finishes
const log: string[] = [];
app.use((req, res, next) => {
  const started = performance.now();
  res.on("finish", () => {
    const ms = Math.round(performance.now() - started);
    log.push(`${req.method} ${req.originalUrl} ${res.statusCode} ${ms < 100 ? "<100ms" : `${ms}ms`}`);
  });
  next();
});

app.get("/products", (_req, res) => {
  res.json({ products: [], requestId: res.locals.requestId });
});

const server = app.listen(0, async () => {
  const base = `http://localhost:${(server.address() as { port: number }).port}`;
  const r1 = await fetch(`${base}/products`, { headers: { "X-Request-Id": "trace-abc-123" } });
  console.log(r1.headers.get("x-request-id"), (await r1.json()).requestId);
  const r2 = await fetch(`${base}/missing`);
  console.log(r2.status, r2.headers.get("x-request-id")!.length);
  server.close();
  console.log(log);
});
```

**Output:**

```text
trace-abc-123 trace-abc-123
404 36
[ 'GET /products 200 <100ms', 'GET /missing 404 <100ms' ]
```

Walk through it:

- The first middleware gives each request an **id**: it reuses a caller's `X-Request-Id` header if it is well-formed (so a request can be traced across several services), otherwise generates a random UUID (36 characters). It stores the id in **`res.locals`** — Express's place for per-request data shared between middleware and handlers — and returns it in a response header, so a customer reporting a problem can quote it.
- Validating the incoming id with a regular expression matters: anything from a client is untrusted, and this value will end up in logs.
- The second middleware records the start time, then listens for the response's **`finish`** event — which fires after the response has been sent — to log the method, URL, status and duration. This is middleware acting "on the way back".
- `/missing` matches no route. When the stack runs out, Express responds with **404**; the middleware still ran, so the request has an id and appears in the log.
- `performance.now()` is a high-resolution timer available in Node. (The log prints "<100ms" rather than exact times, which vary.)

In production you would use a structured logger rather than an array ({{ch:logging}}), and propagate the request id automatically through `AsyncLocalStorage`, a Node feature that keeps per-request context available across `await`s without passing it through every function.

### Level 3 — Middleware for one route: authentication

```ts
// fragment
function requireApiKey(req: Request, res: Response, next: NextFunction) {
  if (req.get("X-Api-Key") !== process.env.ADMIN_API_KEY) {
    res.status(401).json({ message: "Missing or invalid API key" });
    return;               // stop: do NOT call next()
  }
  next();
}

app.delete("/admin/products/:id", requireApiKey, deleteProductHandler);
```

The middleware either ends the request (401) or lets it continue. (Real authentication uses sessions or tokens, and compares secrets with a constant-time comparison — {{ch:authentication}}.)

### Level 3 — Commonly used middleware

| Middleware | Purpose |
|---|---|
| `express.json()`, `express.urlencoded()` | Parse JSON and HTML-form bodies |
| `express.static("public")` | Serve static files (images, CSS, JS) |
| `helmet` | Set security-related HTTP headers |
| `cors` | Configure Cross-Origin Resource Sharing |
| `compression` | Compress responses (often done by a reverse proxy instead — {{ch:nginx-reverse-proxy}}) |
| `express-rate-limit` | Limit request rates per client ({{ch:rate-limiting}}) |
| `pino-http` | Structured request logging ({{ch:logging}}) |
| `cookie-parser` | Parse cookies |

## Async handlers and error handling

### Level 3 — Errors in Express 5

Real handlers are asynchronous: they query databases and call other services. In **Express 5**, if an `async` handler or middleware **throws** (or returns a rejected promise), Express catches it and passes the error to the error-handling middleware automatically:

```ts
// fragment
app.get("/orders/:id", async (req, res) => {
  const order = await orderService.find(req.params.id); // if this rejects, Express 5 forwards the error
  res.json(order);
});
```

In **Express 4**, which you will meet in many existing codebases, a rejected promise in a handler was **not** caught — the request hung or the process logged an unhandled rejection — so code wrapped handlers in helpers (often called `asyncHandler`) or used a package that patched Express. Knowing this difference helps when maintaining older projects.

### Level 4 — A central error handler with typed errors

Define error classes for the expected kinds of failure ({{ch:errors-and-debugging}}), throw them from anywhere, and convert them to HTTP responses in **one** place:

```ts
import express, { type Request, type Response, type NextFunction } from "express";
import { z } from "zod";

class AppError extends Error {
  constructor(readonly status: number, message: string, readonly details?: unknown) {
    super(message);
  }
}
class NotFoundError extends AppError {
  constructor(what: string) {
    super(404, `${what} not found`);
  }
}

const app = express();
app.use(express.json());

const products = new Map([["chaunsa", { id: "chaunsa", stock: 3 }]]);

app.get("/products/:id", (req, res) => {
  const product = products.get(req.params.id);
  if (!product) throw new NotFoundError("Product");
  res.json(product);
});

app.post("/reserve", async (req, res) => {
  const { productId, quantity } = z.object({ productId: z.string(), quantity: z.number().int().positive() }).parse(req.body);
  const product = products.get(productId);
  if (!product) throw new NotFoundError("Product");
  if (product.stock < quantity) throw new AppError(409, `Only ${product.stock} left in stock`);
  product.stock -= quantity;
  res.status(201).json({ reserved: quantity, remaining: product.stock });
});

app.get("/boom", async () => {
  throw new Error("database password is hunter2"); // an unexpected bug
});

// 404 for unknown routes (after all routes)
app.use((_req, _res, next) => next(new NotFoundError("Route")));

// The error handler: four parameters, registered LAST
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof z.ZodError) {
    res.status(400).json({ message: "Invalid request", errors: z.flattenError(err).fieldErrors });
    return;
  }
  if (err instanceof AppError) {
    res.status(err.status).json({ message: err.message });
    return;
  }
  if (err instanceof SyntaxError && "status" in err && err.status === 400) {
    res.status(400).json({ message: "Malformed JSON" });
    return;
  }
  // Unexpected: log full details internally, return nothing sensitive
  console.log(`[internal] ${(err as Error).message}`);
  res.status(500).json({ message: "Something went wrong. Please try again." });
});

const server = app.listen(0, async () => {
  const base = `http://localhost:${(server.address() as { port: number }).port}`;
  const call = async (method: string, path: string, body?: string) => {
    const r = await fetch(base + path, { method, headers: { "Content-Type": "application/json" }, body });
    console.log(r.status, await r.text());
  };
  await call("GET", "/products/apple");
  await call("POST", "/reserve", JSON.stringify({ productId: "chaunsa", quantity: 5 }));
  await call("POST", "/reserve", JSON.stringify({ productId: "chaunsa", quantity: "two" }));
  await call("POST", "/reserve", "{oops");
  await call("GET", "/boom");
  await call("GET", "/nowhere");
  server.close();
});
```

**Output:**

```text
404 {"message":"Product not found"}
409 {"message":"Only 3 left in stock"}
400 {"message":"Invalid request","errors":{"quantity":["Invalid input: expected number, received string"]}}
400 {"message":"Malformed JSON"}
[internal] database password is hunter2
500 {"message":"Something went wrong. Please try again."}
404 {"message":"Route not found"}
```

Walk through the design:

- **`AppError`** carries an HTTP status with a safe, user-facing message. Subclasses such as `NotFoundError` make throwing sites read clearly: `throw new NotFoundError("Product")`.
- **Handlers throw instead of building error responses.** Whether the error happens directly in the handler, deep in a service, or in a rejected promise, it reaches the same handler. Business code stays clean.
- **Zod's `parse`** throws a `ZodError` for invalid bodies, which the error handler turns into a 400 with field errors — consistent with the forms in {{ch:forms}}.
- **Malformed JSON** from `express.json()` arrives as a `SyntaxError` with `status: 400`, and gets a JSON response instead of an HTML page.
- **Unexpected errors** are logged internally with full detail (in a real system, with the request id and a stack trace, to your logger — {{ch:logging}}) and the client receives a generic message. The "password" in the error message never leaves the server.
- **The catch-all 404 middleware** comes after every route: if no route matched, it creates a `NotFoundError`.
- **The error handler has exactly four parameters** — that is how Express recognises it — and is registered **last**.
- The reservation logic here is deliberately simple and in memory; real stock reservation needs a database transaction to be safe under concurrency ({{ch:transactions}}).

You will build a complete error-handling strategy — error codes, problem-details responses, logging and alerting — in {{ch:error-handling}}.

## Structuring a real application

### Level 3 — Routers

As the API grows, group related routes with **`express.Router()`**:

```ts
// fragment
// src/routes/products.routes.ts
import { Router } from "express";
import * as products from "../controllers/products.controller.js";

export const productsRouter = Router();

productsRouter.get("/", products.list);
productsRouter.get("/:id", products.getById);
productsRouter.post("/", requireAdmin, products.create);
```

```ts
// fragment
// src/app.ts
app.use("/api/products", productsRouter);
app.use("/api/orders", ordersRouter);
```

A router is mounted at a path; inside it, paths are relative (`/:id` becomes `/api/products/:id`). Routers can have their own middleware — for example, authentication for all admin routes.

### Level 4 — Layers: controller, service, repository

A common, maintainable structure separates responsibilities ({{ch:solid-principles}}):

```text
  HTTP request
      │
      ▼
  Router          which URL and method → which controller function
      │
      ▼
  Controller      HTTP concerns only: read and validate input, call the service,
      │           choose the status code, shape the response
      ▼
  Service         business rules: "a reservation must not exceed stock",
      │           "orders over Rs 5,000 ship free"; no knowledge of HTTP
      ▼
  Repository      data access: SQL or ORM queries ({{ch:orms}})
      │
      ▼
  Database
```

```text
src/
├── app.ts                  builds and configures the Express app (no listen)
├── server.ts               loads config, creates the app, calls listen, handles shutdown
├── config.ts               validated configuration ({{ch:nodejs}})
├── routes/                 routers
├── controllers/            HTTP adapters
├── services/               business logic
├── repositories/           database access
├── middleware/             authentication, validation, error handling
└── errors.ts               AppError and friends
```

Two decisions in that layout matter more than the rest:

- **`app.ts` builds the app; `server.ts` starts it.** Tests can import the app without starting a real server or binding a port (Supertest, below).
- **Services know nothing about Express.** They take plain data and return plain data (or throw domain errors), so they can be tested without HTTP and reused from a background job or a command-line script. Services receive repositories through their constructors — dependency injection ({{ch:solid-principles}}) — so tests can pass fakes ({{ch:testing}}).

### Level 4 — Validation middleware

Instead of repeating `schema.parse(req.body)` in every handler, write a reusable middleware:

```ts
// fragment
import type { Request, Response, NextFunction } from "express";
import type { ZodType } from "zod";

export function validateBody<T>(schema: ZodType<T>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    req.body = schema.parse(req.body);   // replaces the raw body with validated, typed data
    next();
  };
}

// productsRouter.post("/", requireAdmin, validateBody(CreateProductSchema), products.create);
```

The schema also **strips unknown fields** by default (Zod object schemas drop keys they do not define), which protects against **mass assignment** — a client sending `{ "name": "Pen", "isFeatured": true, "pricePaisa": 1 }` to set fields it should not control ({{ch:validation}}, {{ch:application-security}}). You will study validation in depth in {{ch:validation}}.

## Production essentials

### Level 4 — Security headers, CORS and proxies

```ts
// fragment
import helmet from "helmet";
import cors from "cors";

app.disable("x-powered-by");                  // do not advertise "Express"
app.use(helmet());                            // security headers

const allowedOrigins = new Set(["https://cornershop.example", "https://admin.cornershop.example"]);
app.use(
  cors({
    origin: (origin, callback) => callback(null, !origin || allowedOrigins.has(origin)),
    credentials: true,
  }),
);

app.set("trust proxy", 1);                    // exactly one proxy (the load balancer) in front
```

- **`helmet`** sets headers that make browsers safer: `Strict-Transport-Security` (always use HTTPS), `X-Content-Type-Options: nosniff`, a basic `Content-Security-Policy`, protection against framing, and more ({{ch:application-security}}).
- **CORS** — browsers block web pages from reading responses from other origins unless the server allows it ({{ch:frontend-authentication}}). Allow **only** your known front-end origins. `cors()` with no options allows every origin; combined with cookies, that is dangerous. Requests with no `Origin` header (server-to-server, curl) are not subject to CORS.
- **`trust proxy`** — in production, your app usually runs behind a load balancer or reverse proxy ({{ch:nginx-reverse-proxy}}). Every request then appears to come from the proxy's IP address. Setting `trust proxy` to the **number of proxies** makes Express read the client's real address from the `X-Forwarded-For` header, so `req.ip`, rate limiting and logs are correct. Setting it to `true` blindly lets clients **forge** their IP address by sending that header themselves.

### Level 4 — Health checks and graceful shutdown

```ts
// fragment
app.get("/health/live", (_req, res) => res.json({ status: "ok" }));          // the process is running
app.get("/health/ready", async (_req, res) => {                             // ready for traffic?
  try {
    await db.query("SELECT 1");
    res.json({ status: "ready" });
  } catch {
    res.status(503).json({ status: "not ready" });
  }
});
```

- A **liveness** check answers "is the process alive?" — platforms restart processes that fail it.
- A **readiness** check answers "can it serve traffic now?" — load balancers send traffic only to instances that pass it ({{ch:elb}}, {{ch:eks}}).
- Combine with the **graceful shutdown** from {{ch:nodejs}}: on `SIGTERM`, start failing readiness, `server.close()`, finish in-flight requests, close the database pool, exit.

### Level 4 — Timeouts

Set timeouts on everything that can hang: outgoing HTTP calls (`fetch(url, { signal: AbortSignal.timeout(5000) })`), database queries, and the server itself (`server.requestTimeout`, `server.headersTimeout`). Align the server's keep-alive timeout with the load balancer's (the server's must be longer, or the load balancer may reuse a connection the server has just closed, causing occasional 502 errors).

## Testing an Express application

**Supertest** sends requests to an Express app **in memory**, without starting a server on a port:

```ts
// fragment
import request from "supertest";
import { describe, it, expect } from "vitest";
import { buildApp } from "../src/app.js";

describe("GET /api/products/:id", () => {
  const app = buildApp({ productRepository: new InMemoryProductRepository([{ id: "chaunsa", name: "Chaunsa", pricePaisa: 260000 }]) });

  it("returns a product", async () => {
    const res = await request(app).get("/api/products/chaunsa").expect(200);
    expect(res.body.name).toBe("Chaunsa");
  });

  it("returns 404 as JSON for unknown products", async () => {
    const res = await request(app).get("/api/products/apple").expect(404);
    expect(res.body).toEqual({ message: "Product not found" });
  });

  it("rejects malformed JSON with 400", async () => {
    await request(app).post("/api/orders").set("Content-Type", "application/json").send("{oops").expect(400);
  });
});
```

- `buildApp(dependencies)` creates the app with injected repositories, so tests use in-memory fakes and run in milliseconds ({{ch:testing}}).
- Test the **failure paths** — 400, 401, 404, 409 — as carefully as the successes.
- Integration tests with a real database cover the repositories ({{ch:testing}}).

## Express, Fastify, NestJS and others

| Framework | Character | Choose it when |
|---|---|---|
| **Express** | Minimal, flexible, huge ecosystem, very stable | You want simplicity, maximum familiarity, or are maintaining existing code |
| **Fastify** | Fast, schema-based validation and serialisation built in, good TypeScript support | Throughput matters, or you like built-in schemas and a plugin system |
| **NestJS** | Structured, opinionated, decorators and dependency injection, runs on Express or Fastify | Large teams and applications that benefit from enforced architecture ({{ch:nestjs-basics}}) |
| **Hono** | Very small, built on Web standards (`Request`/`Response`), runs on Node, edge platforms and Bun | Edge or serverless deployments, or a lightweight modern API |
| **Next.js Route Handlers** | Part of a full-stack React app | The API mainly serves your own Next.js front end ({{ch:nextjs}}) |

The concepts — routing, middleware, validation, central error handling, layered structure — transfer between all of them.

## From beginner to enterprise

**Level 3 — first API.** Routes, params, query strings, `express.json()`, `res.status().json()`.

**Level 4 — a real service.** Routers; controller/service/repository layers; validation middleware; typed errors and one error handler; request ids and logging; Supertest tests.

**Level 5 — production.** Helmet, explicit CORS, `trust proxy` set correctly, body limits, timeouts, health checks, graceful shutdown, structured logs, metrics ({{ch:monitoring}}), dependency updates.

**Level 6 — large systems.** Many services behind an API gateway ({{ch:api-gateway}}); shared middleware packages for authentication, logging and tracing; OpenAPI specifications ({{ch:api-documentation}}); consistent error formats across services; versioned APIs ({{ch:api-versioning}}).

## Real-world use cases

### A shop's order API

- **Structure:** `/api/products` (public, cached), `/api/cart` and `/api/orders` (authenticated), `/api/admin/*` (admin only, separate router with its own middleware), `/webhooks/payments` (signature-verified, raw body).
- **Notes:** payment webhooks often require the **raw** body to verify the provider's signature, so that route uses `express.raw()` instead of the global JSON parser — a reason to configure body parsers per router rather than globally.

### Migrating from Express 4 to 5

- **Changes to handle:** route path syntax (wildcards need names), removal of deprecated methods, `req.query` becoming read-only, and the improved async error handling — which lets you delete `asyncHandler` wrappers.
- **Approach:** upgrade in a branch, run the full test suite, fix route patterns and deprecated calls, deploy behind a feature flag or to a canary instance first ({{ch:cicd}}).

## Common mistakes

### Beginner: forgetting to send a response or call `next()`

The request hangs until the client times out. **Fix:** every path through every middleware ends the response or calls `next()`.

### Beginner: sending two responses

"Cannot set headers after they are sent to the client". Usually a missing `return` after `res.json(...)` in an `if`. **Fix:** `return` after responding.

### Beginner: no body parser, or registered after routes

`req.body` is `undefined`. **Fix:** register `express.json()` before the routes that need it.

### Intermediate: error handler in the wrong place, or with three parameters

Errors produce HTML pages with stack traces. **Fix:** a four-parameter error handler registered last; JSON responses; no internal details.

### Intermediate: trusting `req.body` and `req.query`

Type confusion, crashes and mass assignment. **Fix:** validate with schemas; pick fields explicitly.

### Intermediate: business logic in route handlers

Untestable 200-line handlers. **Fix:** controllers call services; services call repositories.

### Production: permissive CORS and wrong `trust proxy`

Data leaks across origins; spoofable IP addresses defeating rate limits. **Fix:** an explicit origin allow-list; `trust proxy` set to the real number of proxies.

### Production: huge global body limits

Raising `express.json({ limit: "50mb" })` globally for one upload route lets every endpoint buffer 50 MB. **Fix:** small global limit; larger limits only on the routes that need them; stream uploads ({{ch:file-uploads}}).

## Debugging and troubleshooting

- **A request hangs:** some middleware neither responded nor called `next()`, or an awaited operation never settles (add timeouts). A development-only "watchdog" middleware that logs requests with no response after a few seconds makes these bugs visible.
- **404 for a route you defined:** check the mount path plus the router path, the HTTP method, and the order of routes (a parameterised route such as `/:id` registered before `/featured` captures it).
- **`req.body` is `undefined` or `{}`:** missing body parser, wrong `Content-Type` header from the client, or the parser registered after the route.
- **CORS errors in the browser:** the origin is not allowed, credentials require an exact origin, or a preflight `OPTIONS` request is being rejected (often by authentication middleware running before CORS).
- **`req.ip` is always the same:** `trust proxy` is not set behind a load balancer.
- **Debug logging:** run with `DEBUG=express:*` to see Express's internal routing decisions.

## Security summary

- Validate every input with schemas; strip unknown fields.
- Central error handling that never leaks stack traces or internal messages.
- `helmet` for security headers; `x-powered-by` disabled.
- Explicit CORS origins; credentials only with exact origins.
- Body size limits; timeouts; rate limiting on sensitive endpoints ({{ch:rate-limiting}}).
- Correct `trust proxy`.
- Authentication and authorisation middleware on every protected route ({{ch:authentication}}), with authorisation re-checked in services for resource ownership.
- Dependencies audited and updated; Express kept on a supported version.

## How a senior engineer thinks about this

- **The middleware order is the architecture.** They read `app.ts` top to bottom as the life of a request: ids, logging, security headers, CORS, parsing, rate limits, routes, 404, errors.
- **Thin controllers, rich services.** HTTP is an adapter around business logic that could also run from a queue or a script.
- **Errors are designed, not improvised.** Typed errors, one handler, consistent JSON, request ids, safe messages.
- **Production details are features.** Health checks, graceful shutdown, timeouts and correct proxy settings prevent the incidents that hurt most.
- **Frameworks are interchangeable; concepts are not.** They choose Express, Fastify or NestJS for the team and the problem, not for fashion.

## Exercises

### Exercise 1 — A small products API

**Objective:** practise routes, params, bodies and status codes.
**What to build:** an in-memory products API with `GET /products` (optional `?q=` search on the name, case-insensitive), `GET /products/:id`, and `POST /products` (body `{ name, pricePaisa }`, both required, price a positive integer), returning 201 with the created product and a generated id. Test it with `fetch` on a free port.

<details>
<summary>Show the solution</summary>

```ts
import express from "express";
import { z } from "zod";

type Product = { id: string; name: string; pricePaisa: number };
const products: Product[] = [{ id: "p1", name: "Chaunsa mangoes", pricePaisa: 260000 }];
let nextId = 2;

const CreateProduct = z.object({
  name: z.string().trim().min(2),
  pricePaisa: z.number().int().positive(),
});

const app = express();
app.use(express.json());

app.get("/products", (req, res) => {
  const q = typeof req.query.q === "string" ? req.query.q.toLowerCase() : "";
  res.json(products.filter((p) => p.name.toLowerCase().includes(q)));
});

app.get("/products/:id", (req, res) => {
  const product = products.find((p) => p.id === req.params.id);
  if (!product) {
    res.status(404).json({ message: "Product not found" });
    return;
  }
  res.json(product);
});

app.post("/products", (req, res) => {
  const parsed = CreateProduct.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid product", errors: z.flattenError(parsed.error).fieldErrors });
    return;
  }
  const product = { id: `p${nextId++}`, ...parsed.data };
  products.push(product);
  res.status(201).json(product);
});

const server = app.listen(0, async () => {
  const base = `http://localhost:${(server.address() as { port: number }).port}`;
  const post = (body: object) =>
    fetch(`${base}/products`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

  let r = await post({ name: "Sindhri mangoes", pricePaisa: 225000 });
  console.log(r.status, await r.json());
  r = await post({ name: "X", pricePaisa: -5 });
  console.log(r.status, JSON.stringify(await r.json()));
  r = await fetch(`${base}/products?q=MANGO`);
  console.log(r.status, (await r.json()).length, "matches");
  server.close();
});
```

**Output:**

```text
201 { id: 'p2', name: 'Sindhri mangoes', pricePaisa: 225000 }
400 {"message":"Invalid product","errors":{"name":["Too small: expected string to have >=2 characters"],"pricePaisa":["Too small: expected number to be >0"]}}
200 2 matches
```

**Walkthrough:** the schema validates and trims the name and checks the price; `safeParse` returns field errors for a 400 response; a successful creation returns 201 with the new resource. The search is case-insensitive because both sides are lower-cased. In a real application, ids come from the database and the error handling moves into a central handler.

</details>

### Exercise 2 — Order the middleware

**Objective:** practise reasoning about the middleware stack.
**The scenario:** this application returns HTML error pages, logs no 404s, and `req.body` is always undefined in `POST /orders`. Fix the order.

```ts
// fragment
app.use(errorHandler);
app.post("/orders", createOrder);
app.use(express.json());
app.use(requestLogger);
app.use(cors({ origin: allowList }));
```

<details>
<summary>Show the solution</summary>

```ts
// fragment
app.use(requestId);                 // first: every request gets an id
app.use(requestLogger);             // logs every request, including 404s and errors
app.use(helmet());
app.use(cors({ origin: allowList, credentials: true })); // before routes, so preflights work
app.use(express.json({ limit: "100kb" }));               // before routes that read bodies
app.post("/orders", validateBody(CreateOrder), createOrder);
app.use(notFound);                  // after all routes
app.use(errorHandler);              // last, with four parameters
```

**Why:** Express runs layers in registration order. The body parser must run **before** the route; the logger must run before routes to see every request; CORS must handle preflight `OPTIONS` requests before routes or authentication reject them; the error handler must be **last**, otherwise it never receives errors from routes registered after it — which is why the original fell back to Express's default HTML error page.

</details>

### Exercise 3 — Debug the hanging request

**Objective:** practise finding requests that never end.
**The scenario:** clients report that `GET /account` sometimes never responds. The code:

```ts
// fragment
async function loadUser(req: Request, res: Response, next: NextFunction) {
  const token = req.get("Authorization");
  if (!token) {
    res.status(401).json({ message: "Log in" });
  }
  const user = await sessions.find(token);
  if (user) {
    res.locals.user = user;
    next();
  }
}
app.get("/account", loadUser, (req, res) => res.json(res.locals.user));
```

<details>
<summary>Show the solution</summary>

**Bugs:**
1. With no token, it sends 401 but **does not return**, so it continues, calls `sessions.find(undefined)`, and may call `next()` — leading to a second response attempt ("Cannot set headers after they are sent").
2. When the token is invalid (`user` is null), it **neither responds nor calls `next()`** — the request hangs. This is the "sometimes".
3. If `sessions.find` throws, Express 5 forwards the error (Express 4 would hang or crash).

**Fix:**

```ts
// fragment
async function loadUser(req: Request, res: Response, next: NextFunction) {
  const token = req.get("Authorization")?.replace(/^Bearer /, "");
  if (!token) {
    res.status(401).json({ message: "Please log in" });
    return;
  }
  const user = await sessions.find(token);
  if (!user) {
    res.status(401).json({ message: "Your session has expired. Please log in again." });
    return;
  }
  res.locals.user = user;
  next();
}
```

Every path now ends the request exactly once or passes it on. A development watchdog that logs requests without a response after a few seconds, and tests for each branch (no token, bad token, good token), would have caught this early.

</details>

### Exercise 4 — Production scenario: prepare an API for launch

**Objective:** practise production readiness.
**The scenario:** a small team built an Express API that works on their laptops. It will run as three containers behind a cloud load balancer, serving a React front end on a different subdomain with cookie sessions. List what must be in place before launch, and why.

<details>
<summary>Show the solution</summary>

1. **Validated configuration** from environment variables, failing fast at start-up ({{ch:nodejs}}).
2. **`trust proxy` set to 1** (the load balancer), so client IPs, rate limits and secure-cookie detection work.
3. **CORS** allowing exactly the front end's origin with credentials; cookies `HttpOnly`, `Secure`, `SameSite=Lax` ({{ch:frontend-authentication}}).
4. **Security headers** with `helmet`; `x-powered-by` disabled.
5. **Body limits** (small globally), **timeouts** on outgoing calls and the server, keep-alive aligned with the load balancer.
6. **Validation** on every endpoint; mass-assignment protection; authorisation checks in services.
7. **Central error handling** returning JSON without internal details; request ids in responses and logs.
8. **Structured logging** to standard output for the platform to collect ({{ch:logging}}); **metrics** for latency, errors and event-loop delay ({{ch:monitoring}}).
9. **Health endpoints**: liveness and readiness (checking the database); the load balancer configured to use readiness.
10. **Graceful shutdown** on `SIGTERM` for zero-downtime rolling deployments.
11. **Shared state externalised**: sessions and rate-limit counters in Redis, since three containers do not share memory ({{ch:redis}}).
12. **Rate limiting** on login and other sensitive endpoints ({{ch:rate-limiting}}).
13. **Tests** (unit, integration, Supertest) running in CI, and a dependency audit ({{ch:cicd}}).

</details>

## Summary

**Express** is a minimal Node.js web framework that adds routing, a middleware pipeline and request/response helpers on top of `node:http`. An app keeps an ordered stack of middleware and routes; each request walks the stack, and each layer either **ends the response**, calls **`next()`**, or calls `next(error)` to jump to **error-handling middleware**. Order matters, and every request must end exactly once.

Define routes with methods and paths, read **route parameters** from `req.params`, **query strings** from `req.query` (strings, untrusted) and **bodies** from `req.body` after `express.json()` (with size limits). Build responses with `res.status().json()` and friends. Write middleware for cross-cutting concerns — request ids, logging, authentication, validation — and use `res.locals` for per-request data. Express 5 forwards errors from `async` handlers automatically; define typed errors, throw them anywhere, and convert them to consistent JSON in **one** error handler registered last, never leaking internal details.

Structure applications with **routers**, thin **controllers**, business **services** and data **repositories**, separating `app.ts` from `server.ts` for testing with **Supertest**. For production, add `helmet`, explicit **CORS**, correct **`trust proxy`**, body limits, timeouts, health checks and graceful shutdown. Express, Fastify, NestJS and Hono share these concepts; choose by team and needs.

## Key terms

- **Express** — A minimal web framework for Node.js providing routing and a middleware pipeline.
- **Web framework** — A library that handles routine web-server work such as routing, parsing and responses.
- **Route** — A combination of an HTTP method and a path pattern, together with the handler for it.
- **Route handler** — The function that produces the response for a matched route.
- **Route parameter** — A named segment in a route path, such as `:id`, whose value is available in `req.params`.
- **Query string** — The part of a URL after `?`, containing key–value parameters, available in `req.query`.
- **Request body** — Data sent by the client in the body of a request, such as JSON.
- **Body parser** — Middleware that reads and parses request bodies, such as `express.json()`.
- **Middleware** — A function that processes a request and either ends the response or passes control to the next function.
- **next()** — The function middleware calls to pass control to the next layer, or to the error handler when given an error.
- **res.locals** — An object for passing data between middleware and handlers during one request.
- **Error-handling middleware** — Express middleware with four parameters that handles errors from earlier layers.
- **Router (Express)** — A mini-application grouping related routes and middleware, mounted at a path.
- **Controller** — The layer that translates HTTP requests into calls to business logic and shapes responses.
- **Service (layer)** — The layer containing business rules, independent of HTTP.
- **Repository (layer)** — The layer responsible for reading and writing data in storage.
- **Request id (correlation id)** — A unique identifier attached to a request and its log lines so it can be traced.
- **helmet** — Express middleware that sets security-related HTTP headers.
- **trust proxy** — An Express setting that tells it how many proxies to trust when determining the client's IP address.
- **Liveness check** — An endpoint showing whether a process is running.
- **Readiness check** — An endpoint showing whether an instance can currently serve traffic.
- **Supertest** — A library for sending HTTP requests to a Node application in tests without starting a real server.
- **Mass assignment** — A vulnerability where a client sets fields it should not control by including them in a request body.

## What comes next

You can now build an Express server. But **what** should its endpoints look like? Which URLs, which methods, which status codes, which response shapes? The next chapter, {{ch:rest-apis}}, teaches how to design REST APIs that are predictable, consistent and pleasant to use: resources and URLs, HTTP methods and their guarantees, status codes, pagination, filtering, idempotency, error formats and versioning.
