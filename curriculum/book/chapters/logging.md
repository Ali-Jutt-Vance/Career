# Logging

> [!GOALS]
> - Explain what logs are for, and why `console.log` is not enough for a production service.
> - Write **structured logs** (JSON) with consistent fields, using a logging library such as pino.
> - Choose **log levels** correctly, and control verbosity per environment.
> - Attach **context** — request ids, user ids, trace ids — to every log line automatically.
> - Decide what to log and, just as importantly, what **never** to log, with redaction for secrets and personal data.
> - Understand how logs travel from a process to a searchable system, and how logs relate to metrics and traces.
> - Use logs to investigate production problems quickly, and keep logging affordable and fast.

## Why this matters

It is 2 a.m. A customer messages support: "I paid for my order, but it says payment failed." The engineer on call has the customer's email address and nothing else. What happened?

With poor logging, the answer is a long search through millions of lines like `error happened` and `order saved` with no way to connect them to this customer, this request or this moment. With good logging, the engineer searches for the order id, sees every step of that request — the payment provider's response, a timeout on the confirmation call, the retry, the decision to mark the order as failed — and has the cause within minutes.

**Logs** are a server's diary: a record of what it did, when, and with what result. When something goes wrong in production, you cannot attach a debugger to a live server handling thousands of customers; logs are often the only evidence of what happened. They are also used for security investigations ("who changed this price?"), auditing, understanding usage, and finding problems before customers notice them.

Logging is easy to do badly. Too little, and incidents are mysteries. Too much, and the important lines drown in noise while the logging bill grows. Careless, and logs become a data leak — full of passwords, tokens and customers' personal data. This chapter teaches how professionals log.

## The simple idea

Think of the logbook kept by the captain of a ship. Each entry records the time, the position, the weather, important events and decisions — written in a consistent format so anyone can read it later. If something goes wrong, investigators can reconstruct exactly what happened. The captain does not write down every wave, and does not write the crew's private letters into the logbook.

Application logs are that logbook: **timestamped, consistently formatted records of important events and decisions**, detailed enough to reconstruct what happened, but selective about what goes in.

> [!ANALOGY]
> Logs are like a ship's logbook: timestamped, consistent records of important events, kept so that anyone can reconstruct what happened later.
>
> **Where the analogy breaks:** a ship has one logbook written by one person. A modern application has many processes on many servers writing thousands of entries per second, all at the same time, and one customer's request may pass through several services. The entries must be machine-readable and linked by shared identifiers, or they cannot be put back together.

## The proper definition and key words

A **log** is an append-only, time-ordered record of events produced by a program. Each **log entry** (log line, log event) records one event.

The key words:

- **Structured logging** — writing log entries as data (usually JSON objects with named fields) rather than free-form text.
- **Log level** — the severity of an entry: for example `debug`, `info`, `warn`, `error`, `fatal`.
- **Context** — fields that describe where an event happened: request id, user id, service name, environment.
- **Correlation id / request id** — an identifier attached to every log entry produced while handling one request ({{ch:express}}).
- **Trace id** — an identifier shared by all operations belonging to one request across **several services** (distributed tracing — {{ch:observability-and-incidents}}).
- **Redaction** — removing or masking sensitive values before they are written.
- **Log aggregation** — collecting logs from many processes and servers into one searchable system.
- **Retention** — how long logs are kept.
- **Observability** — the ability to understand a system's internal state from its outputs: logs, **metrics** and **traces** ({{ch:monitoring}}).

## How it works inside: from a log call to a search result

### Level 2 — The journey of a log line

```text
  your code                    process                      platform                  log system
  logger.info({orderId},       ─▶ serialise to JSON,  ─▶   container runtime    ─▶   collector / agent
     "order placed")              write to stdout          captures stdout             (e.g. Fluent Bit,
                                  (fast, asynchronous)     with metadata                Vector, cloud agent)
                                                                                         │
                                                                                         ▼
                                                                                  store + index
                                                                                  (e.g. Elasticsearch/
                                                                                   OpenSearch, Loki,
                                                                                   CloudWatch Logs,
                                                                                   Datadog)
                                                                                         │
                                                                                         ▼
                                                                        search, dashboards, alerts
```

The modern convention, described in the widely followed "Twelve-Factor App" methodology, is that an application **writes its logs to standard output** as a stream of events and does not manage log files itself. The platform — Docker, Kubernetes, a cloud service — captures that stream, adds metadata (which container, which host), and ships it to a central system where it is stored, indexed and searchable ({{ch:docker}}, {{ch:cloudwatch}}).

This separation means application code stays simple, logs from hundreds of instances end up in one place, and log files never fill up a server's disk.

### Level 2 — Why structure matters

A text log line is easy for a human to read and hard for a machine to search:

```text
2026-06-15 09:30:12 ERROR Payment failed for order ord_8xKp2mNq (customer cus_41) after 2 attempts: provider timeout
```

To find "all failed payments for customer cus_41 in the last hour", a search must parse free text with fragile patterns — and every developer writes messages differently.

A **structured** entry carries the same information as named fields:

```json
{"time":"2026-06-15T09:30:12.418Z","level":"error","service":"checkout","requestId":"req_7Fx8bQKm","msg":"payment failed","orderId":"ord_8xKp2mNq","customerId":"cus_41","attempts":2,"reason":"provider_timeout"}
```

Now the log system can filter on `customerId = "cus_41" AND msg = "payment failed"`, count failures by `reason`, chart them over time, and alert when they spike. Structured logs are data, and data can be queried.

## Structured logging in Node.js

### Level 3 — Why not `console.log`?

`console.log` writes text, has no levels to filter by, no consistent fields, no redaction, and (when writing large amounts) can slow the event loop. It is fine for scripts and debugging. Production services use a logging library. **pino** is a widely used, very fast choice for Node.js; others include Winston and Bunyan.

### Level 3 — A first structured logger

```ts
import pino from "pino";

const logger = pino({
  base: undefined,      // for this example: omit pid and hostname
  timestamp: false,     // for this example: omit time so the output is stable
});

logger.info({ orderId: "ord_8xKp2mNq", totalPaisa: 520000 }, "order placed");
logger.warn({ productId: "prd_Chaunsa5kg", stock: 2 }, "stock running low");
logger.debug("this line is below the default level, so it is not written");
```

**Output:**

```text
{"level":30,"orderId":"ord_8xKp2mNq","totalPaisa":520000,"msg":"order placed"}
{"level":40,"productId":"prd_Chaunsa5kg","stock":2,"msg":"stock running low"}
```

Walk through it:

- `pino(options)` creates a logger that writes one **JSON object per line** to standard output (this format is called **NDJSON**, newline-delimited JSON).
- Each call takes an optional **object of fields** first, then a **message**. Fields become top-level properties; the message goes in `msg`.
- **Levels** are numbers internally: `trace` 10, `debug` 20, `info` 30, `warn` 40, `error` 50, `fatal` 60. The default minimum level is `info`, so the `debug` call writes nothing.
- In a real service you would keep pino's defaults: a `time` field (milliseconds since 1970, or an ISO string with a formatter option), and `pid` and `hostname`. They are removed here only to make the output identical every time it runs.
- For development, the `pino-pretty` tool turns these JSON lines into readable, coloured text in your terminal (`node app.js | npx pino-pretty`), while production keeps the JSON.

### Level 3 — Consistent messages and fields

Good structured logs follow a few conventions:

- **The message is a short, constant description of the event**: `"order placed"`, `"payment failed"`. Put variable data in **fields**, not inside the message. `"payment failed"` with `{ orderId }` is searchable; `"payment failed for ord_8xKp2mNq"` creates a different message for every order.
- **Field names are consistent across the codebase and across services**: always `orderId`, never sometimes `order_id` or `orderID`. Many organisations adopt a shared schema for common fields (for example, OpenTelemetry's semantic conventions or Elastic's ECS field naming).
- **Units in names** for numbers: `durationMs`, `sizeBytes`, `totalPaisa` ({{ch:clean-code}}).
- **Errors in a standard field** (pino uses `err`), so stack traces are serialised properly.

## Log levels

### Level 3 — What each level means

| Level | Use for | Example |
|---|---|---|
| `fatal` | The process cannot continue and is about to exit | "uncaught exception — shutting down" ({{ch:nodejs}}) |
| `error` | Something failed that needs attention; a request or job could not be completed due to a fault | Unhandled exception in a request; payment provider returned an unexpected response |
| `warn` | Something unexpected but handled; may need attention if frequent | Retry succeeded after failures; fallback used; deprecated API version called; rate limit hit |
| `info` | Significant normal events | Server started; order placed; job completed; configuration loaded |
| `debug` | Detailed information for diagnosing problems | Query parameters chosen; cache hit or miss; decision branches |
| `trace` | Extremely detailed, step-by-step | Rarely used outside deep debugging |

Rules of thumb:

- **`error` should mean "a human should probably look at this"**, because alerts are often based on it ({{ch:monitoring}}). Validation failures and 404s caused by clients are **not** errors in your system — log them at `info` or `debug`, or count them as metrics. If `error` fires constantly for normal events, people stop looking.
- **Production usually runs at `info`**; development at `debug`. The level is configuration, not code: `pino({ level: process.env.LOG_LEVEL ?? "info" })` ({{ch:nodejs}}).
- **Some systems allow changing the level at runtime** (for example, temporarily enabling `debug` for one service during an investigation) without redeploying.

## Context: connecting log lines

### Level 3 — Child loggers

A single request produces many log lines in different functions. To connect them, every line must carry the request's id. Passing the id to every function by hand is tedious and error-prone. **Child loggers** carry fields automatically:

```ts
import pino from "pino";

const logger = pino({ base: { service: "checkout" }, timestamp: false });

function handleCheckout(requestId: string, customerId: string) {
  const log = logger.child({ requestId, customerId });
  log.info("checkout started");
  reserveStock(log, "prd_Chaunsa5kg", 2);
  log.info({ orderId: "ord_8xKp2mNq" }, "order placed");
}

function reserveStock(log: pino.Logger, productId: string, quantity: number) {
  log.debug({ productId, quantity }, "reserving stock");
  log.info({ productId, quantity }, "stock reserved");
}

handleCheckout("req_7Fx8bQKm", "cus_41");
```

**Output:**

```text
{"level":30,"service":"checkout","requestId":"req_7Fx8bQKm","customerId":"cus_41","msg":"checkout started"}
{"level":30,"service":"checkout","requestId":"req_7Fx8bQKm","customerId":"cus_41","productId":"prd_Chaunsa5kg","quantity":2,"msg":"stock reserved"}
{"level":30,"service":"checkout","requestId":"req_7Fx8bQKm","customerId":"cus_41","orderId":"ord_8xKp2mNq","msg":"order placed"}
```

- `base: { service: "checkout" }` adds the service name to **every** line — essential when logs from many services share one system.
- `logger.child({ requestId, customerId })` creates a logger that adds those fields to every line it writes.
- `reserveStock` receives the child logger, so its lines carry the request id without knowing anything about requests. (Its `debug` line is not written at the default `info` level.)
- Searching for `requestId = "req_7Fx8bQKm"` now returns the whole story of that request.

### Level 4 — Request context without passing loggers around

Passing a logger into every function is still clumsy. Node's **`AsyncLocalStorage`** (from `node:async_hooks`) keeps a value available throughout one asynchronous flow — across every `await` and callback — without passing it explicitly:

```ts
import { AsyncLocalStorage } from "node:async_hooks";
import pino from "pino";

const baseLogger = pino({ base: undefined, timestamp: false });
const requestContext = new AsyncLocalStorage<pino.Logger>();

// Anywhere in the code: the current request's logger, or the base logger outside requests
const log = () => requestContext.getStore() ?? baseLogger;

async function chargeCard(amountPaisa: number) {
  await new Promise((r) => setTimeout(r, 5));          // simulate I/O
  log().info({ amountPaisa }, "card charged");          // no logger passed in
}

async function handleRequest(requestId: string) {
  await requestContext.run(baseLogger.child({ requestId }), async () => {
    log().info("request received");
    await chargeCard(520000);
  });
}

await Promise.all([handleRequest("req_A"), handleRequest("req_B")]);
log().info("outside any request");
```

**Output:**

```text
{"level":30,"requestId":"req_A","msg":"request received"}
{"level":30,"requestId":"req_B","msg":"request received"}
{"level":30,"requestId":"req_A","amountPaisa":520000,"msg":"card charged"}
{"level":30,"requestId":"req_B","amountPaisa":520000,"msg":"card charged"}
{"level":30,"msg":"outside any request"}
```

Walk through it:

- `requestContext.run(value, fn)` makes `value` — here, a child logger with the request id — available to everything that runs inside `fn`, including code that runs later after `await`s.
- `log()` returns the logger for the **current** flow. `chargeCard` does not receive a logger, yet its line carries the right request id.
- Two requests run **concurrently**, interleaved on one thread ({{ch:nodejs}}), and each line still gets the correct id — the context follows each asynchronous flow separately.
- Outside any request, `getStore()` is `undefined`, so the base logger is used.

In an Express application, a middleware at the very top wraps each request in `requestContext.run(...)` ({{ch:express}}); logging libraries and frameworks often provide this integration ready-made (for example, `pino-http` creates a per-request child logger and logs each completed request).

### Level 4 — Across services: trace ids

When one customer action passes through several services — the API, a pricing service, a payment service — each service has its own request ids. To connect them, services pass a **trace id** along with each call, in a standard header (`traceparent`, defined by the W3C Trace Context specification), and include it in every log line. **OpenTelemetry**, the industry-standard observability framework, generates and propagates these ids automatically and can inject them into logs. Searching one trace id then shows the whole journey across services ({{ch:observability-and-incidents}}, {{ch:distributed-systems}}).

## What to log

### Level 3 — Events worth recording

- **Service lifecycle**: start-up (with version and non-secret configuration), readiness, shutdown.
- **Each request**, once, when it completes: method, route, status, duration, request id, user or tenant id — usually produced by middleware rather than by every handler.
- **Significant business events**: order placed, payment succeeded or failed (with reason codes), refund issued, account created.
- **Decisions and their reasons**, where behaviour is not obvious: "fraud check flagged order for review (score 0.92)", "fallback quote used", "retrying after 503".
- **Calls to dependencies** that fail or are slow, with the dependency name, duration and outcome.
- **Errors**, with stack traces and causes ({{ch:error-handling}}).
- **Security-relevant events**: logins (success and failure), password changes, permission denials, admin actions, changes to roles or prices — often in a separate **audit log** with stricter retention and access controls.

### Level 3 — Avoid noise

- Do not log every line of normal flow at `info` ("entering function", "loop iteration 5"). Use `debug` for detail, and remove temporary debugging logs before merging.
- Do not log the same failure at every layer — that produces five lines for one problem. Log it **once**, where it is handled (usually the boundary handler — {{ch:error-handling}}).
- Do not log large payloads (whole request bodies, full database rows, entire API responses) by default: they are expensive, slow to search and often contain personal data.

## What never to log

### Level 3 — Secrets and personal data

Logs are copied to many places, kept for a long time and read by many people. Treat them as **far less protected** than your database. Never log:

- **Secrets**: passwords, API keys, access and refresh tokens, session ids, private keys, database connection strings with passwords, one-time codes.
- **Payment data**: full card numbers and security codes (payment-industry rules such as PCI DSS forbid storing them in logs).
- **Sensitive personal data**, unless there is a clear need and legal basis: national identity numbers (such as CNIC numbers), health information, full addresses and phone numbers, precise locations.

Data-protection laws (such as the European Union's GDPR) apply to personal data in logs exactly as in databases: people have rights to access and deletion, and logs that contain personal data must be protected and eventually deleted. Logging an **identifier** (`customerId: "cus_41"`) instead of personal details (name, email, phone) usually gives investigators everything they need while keeping logs much safer.

### Level 3 — Redaction as a safety net

Even careful developers occasionally log an object that happens to contain a secret. Configure **redaction** in the logger so known sensitive fields are masked automatically:

```ts
import pino from "pino";

const logger = pino({
  base: undefined,
  timestamp: false,
  redact: {
    paths: ["password", "token", "req.headers.authorization", "req.headers.cookie", "*.cardNumber", "*.cvv"],
    censor: "[REDACTED]",
  },
});

logger.warn(
  {
    email: "sara@example.com",
    password: "correct horse battery staple",
    req: { headers: { authorization: "Bearer eyJhbGciOi...", "user-agent": "Mozilla/5.0" } },
    payment: { cardNumber: "4111111111111111", cvv: "123", last4: "1111" },
  },
  "login attempt with payment update",
);
```

**Output:**

```text
{"level":40,"email":"sara@example.com","password":"[REDACTED]","req":{"headers":{"authorization":"[REDACTED]","user-agent":"Mozilla/5.0"}},"payment":{"cardNumber":"[REDACTED]","cvv":"[REDACTED]","last4":"1111"},"msg":"login attempt with payment update"}
```

- `redact.paths` lists field paths to mask; `*` matches any key at that level, so `*.cardNumber` catches `payment.cardNumber`.
- The password, authorisation header, card number and CVV are replaced; harmless fields such as the user agent and the last four card digits remain.
- Notice the email address was **not** redacted, because it was not listed. Redaction is a safety net for known fields; the primary defence is still **not logging sensitive data in the first place**. (Here, the email would be better replaced by a customer id.)

## Logging and performance

Logging costs CPU, memory, disk and money:

- **Serialisation and writing** take time on the event loop ({{ch:nodejs}}). Pino is designed to be fast (it can also move work to a separate thread through "transports"), but logging huge objects in hot paths still hurts.
- **Volume costs money**: log platforms usually charge by data ingested and stored. Debug-level logging of every request in a busy service can cost more than the servers.
- **Sampling** reduces volume for high-frequency, low-value events: log 1 in 100 successful health checks, but every error.
- **Retention** should match purpose: perhaps days to a few weeks for debug-level application logs, longer for audit logs as required by regulation — then delete or archive to cheap storage.
- **Do not build expensive messages that will not be written**: checking the level first (`if (logger.isLevelEnabled("debug"))`) avoids computing large debug data in production.

## Logs, metrics and traces

Logs are one of three complementary signals, often called the **three pillars of observability** ({{ch:monitoring}}, {{ch:observability-and-incidents}}):

| Signal | What it is | Good for | Example |
|---|---|---|---|
| **Logs** | Detailed records of individual events | Investigating **what happened** in a specific case | "Order ord_8x failed: provider_timeout after 2 retries" |
| **Metrics** | Numbers aggregated over time | Seeing **trends** and triggering **alerts** cheaply | "payment failures per minute = 37"; "p99 latency = 1.8 s" |
| **Traces** | The path and timing of one request through all services | Finding **where** time is spent or failures start in distributed systems | "Checkout took 2.1 s: 1.7 s in the payment service's database query" |

A common workflow: an **alert** on a metric (payment failures rising) leads to a **dashboard**, which narrows the time and service; a **trace** shows which step is slow or failing; **logs** for that trace explain exactly why. Do not try to make logs do everything: counting events by scanning logs is slow and expensive compared with emitting a metric.

## Investigating with logs

### Level 4 — A typical investigation

1. **Start from an identifier**: the request id from the error response ({{ch:error-handling}}), an order id, a customer id, or a time window from an alert.
2. **Filter**: `service = "checkout" AND orderId = "ord_8xKp2mNq"` — or the request id.
3. **Read the sequence** of events for that request, in time order: what happened before the failure?
4. **Widen**: is this one customer, or many? Query `msg = "payment failed" AND reason = "provider_timeout"` over the last hour, grouped by minute.
5. **Correlate** with deployments, dependency status and metrics.
6. **Confirm and fix**, then improve logging if something you needed was missing.

Log platforms provide query languages and saved searches for this. Common platforms include Elasticsearch or OpenSearch with Kibana-style interfaces, Grafana Loki ({{ch:grafana}}), cloud services such as AWS CloudWatch Logs ({{ch:cloudwatch}}) and Google Cloud Logging, and commercial products such as Datadog and Splunk.

### Level 4 — Logs as an input to alerts

Some alerts come from logs directly ("alert if `level=fatal` appears", "alert if more than 50 `payment failed` events in 5 minutes"). Often it is cheaper and more reliable to turn important log events into **metrics** at the source and alert on those ({{ch:monitoring}}).

## From beginner to enterprise

**Level 3 — first services.** A structured logger writing JSON to standard output; levels; consistent messages and fields; no `console.log` in production code.

**Level 4 — real applications.** Request ids on every line via child loggers or `AsyncLocalStorage`; one request-completion log per request; errors logged once with stack and cause; redaction configured; log level from configuration.

**Level 5 — professional practice.** Centralised log aggregation with search and dashboards; shared field conventions across services; separate audit logs; retention policies; sampling of noisy events; a review of new log lines for sensitive data in code review.

**Level 6 — large systems.** OpenTelemetry for logs, metrics and traces with trace ids propagated across services; per-team cost budgets for observability data; compliance-driven retention and access controls; automated detection of sensitive data in logs; log pipelines that route, filter and enrich data before storage.

## Real-world use cases

### Investigating a payment complaint

- **Customer report**: charged, but the order shows "payment failed".
- **Logs** (searching the order id): `payment authorised` from the provider → `confirmation call timed out` → `retrying confirmation` → `retry failed: 503` → `order marked failed`. The payment **succeeded** at the provider, but the shop never received confirmation.
- **Fix**: treat the provider's webhook as the source of truth for payment status ({{ch:validation}}); reconcile pending payments with the provider; refund or complete affected orders.
- **Logging improvement**: log the provider's payment id alongside the order id, so both sides can be matched instantly.

### A data leak through logs

- **Discovery**: a security review finds access tokens and customers' phone numbers in application logs, which are readable by all engineers and kept for a year.
- **Fixes**: redaction for authorisation headers, cookies and token fields; logging customer ids instead of phone numbers; shorter retention; access controls on the log system; deleting the affected historical logs; rotating the exposed tokens.

## Common mistakes

### Beginner: `console.log` everywhere

Unstructured, level-less output with no context. **Fix:** a structured logger.

### Beginner: variable data inside messages

`"Order " + id + " failed"`. **Fix:** constant messages, data in fields.

### Beginner: logging secrets

Passwords, tokens and full request bodies in logs. **Fix:** never log them; redaction as a safety net.

### Intermediate: everything at `error`

Client mistakes logged as errors; alerts become noise. **Fix:** levels by meaning; client errors at `info`/`debug` or as metrics.

### Intermediate: no request id

Thousands of interleaved lines that cannot be connected. **Fix:** request ids on every line, returned to clients in responses.

### Intermediate: logging the same error at every layer

**Fix:** log once, at the boundary, with full context.

### Production: unbounded volume and retention

Bills and search times grow without limit. **Fix:** levels, sampling, retention policies, metrics for counts.

### Enterprise: inconsistent fields across services

`orderId`, `order_id`, `oid`. **Fix:** a shared schema for common fields; shared logging libraries.

## Debugging and troubleshooting

- **Logs are missing in the log system**: check that the app writes to standard output (not a file inside the container), that the collector is running, and that lines are valid JSON (one object per line — a multi-line `console.log` of an object breaks parsing).
- **Logs arrive out of order or with wrong times**: always log in UTC with millisecond timestamps generated by the application; do not rely on the collector's arrival time.
- **The process is slow under heavy logging**: reduce level, avoid huge objects, use asynchronous transports.
- **Search is slow or expensive**: index only commonly queried fields; avoid high-cardinality free text in indexed fields; shorten retention for noisy logs.
- **Logs end abruptly before a crash**: buffered log lines may be lost if the process exits immediately; flush the logger before exiting on fatal errors.

## How a senior engineer thinks about this

- **Logs are for the person investigating at 2 a.m.** Every line should help answer "what happened, to whom, and why?".
- **Structure and consistency** turn logs from text into data that can be queried, charted and alerted on.
- **Context is everything**: request ids, trace ids, entity ids — attached automatically, not remembered by each developer.
- **Logs are a liability as well as an asset.** They avoid secrets and personal data, limit retention, and control access.
- **Use the right signal**: metrics for counts and alerts, traces for distributed timing, logs for detail.
- **Logging is code.** New log lines are reviewed for usefulness, level and sensitivity like any other change.

## Exercises

### Exercise 1 — Rewrite the log lines

**Objective:** practise structured, well-levelled logs.
**Starting point:**

```ts
// fragment
console.log("user " + user.email + " logged in with password " + password);
console.log("ERROR: order " + order.id + " not found");          // a customer requested a bad id
console.log("Payment failed!!! " + JSON.stringify(err));
console.log("Processing item " + i + " of " + items.length);    // inside a loop of 10,000 items
```

**What to do:** rewrite each line with a structured logger, the right level, and no sensitive data.

<details>
<summary>Show the solution</summary>

```ts
// fragment
log.info({ userId: user.id, method: "password" }, "user logged in");
log.info({ orderId: requestedId }, "order not found");                      // client error: not an error in our system
log.error({ err, orderId: order.id, provider: "fastpay" }, "payment failed");
// inside the loop: nothing per item; afterwards:
log.info({ itemCount: items.length, durationMs }, "items processed");
```

**Walkthrough:** the login line drops the password (never log secrets) and the email (use the id); the not-found case is a normal client error, logged at `info` (or not at all — a 404 metric may be enough); the payment failure is a real problem in our system, logged at `error` with the error object in the `err` field (so the stack and cause are serialised properly) and identifiers; the per-item progress line would produce 10,000 lines per run — replaced by one summary line, with progress shown at `debug` at most every few thousand items if needed.

</details>

### Exercise 2 — Request logging middleware

**Objective:** practise context and request logs.
**What to build:** Express middleware that, for every request, creates a child logger with a request id (reusing a valid incoming `X-Request-Id`, otherwise generating one), makes it available to handlers through `res.locals.log`, and writes **one** line when the response finishes with method, route path, status code and duration — at `info` for status below 500 and `error` for 500 and above.

<details>
<summary>Show the solution</summary>

```ts
// fragment
import { randomUUID } from "node:crypto";
import type { Request, Response, NextFunction } from "express";
import type { Logger } from "pino";

export function requestLogging(baseLogger: Logger) {
  return (req: Request, res: Response, next: NextFunction) => {
    const incoming = req.get("X-Request-Id");
    const requestId = incoming && /^[\w-]{8,64}$/.test(incoming) ? incoming : randomUUID();
    const log = baseLogger.child({ requestId });
    res.locals.log = log;
    res.set("X-Request-Id", requestId);

    const started = performance.now();
    res.on("finish", () => {
      const fields = {
        method: req.method,
        route: req.route?.path ?? req.path,
        status: res.statusCode,
        durationMs: Math.round(performance.now() - started),
      };
      if (res.statusCode >= 500) log.error(fields, "request completed");
      else log.info(fields, "request completed");
    });
    next();
  };
}
```

**Walkthrough:** the request id is validated before reuse (headers are untrusted — {{ch:validation}}); the child logger carries it into every handler's log lines through `res.locals.log` (or `AsyncLocalStorage`); one line per request is written on `finish` with the **route pattern** (`/orders/:id`) rather than the full path where available, which keeps the number of distinct values small for grouping; 5xx responses are logged at `error`. In practice, `pino-http` provides this ready-made; writing it once teaches what it does.

</details>

### Exercise 3 — Find the problems in these logs

**Objective:** practise reviewing log output.
**The scenario:** an investigation stalls because logs look like this:

```text
2026-06-15 14:02:11 INFO Starting payment
2026-06-15 14:02:11 INFO Starting payment
2026-06-15 14:02:13 ERROR Error: Request failed
2026-06-15 14:02:13 INFO Payment done Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJjdXNfNDEi...
2026-06-15 14:02:14 ERROR Error: Request failed
```

List what is wrong and what each line should contain.

<details>
<summary>Show the solution</summary>

**Problems:** plain text (not searchable by field); no request id, so the two payments cannot be told apart; no order, customer or payment ids; no service name; the time has no time zone or milliseconds; the error lines have no cause, dependency, status, stack or reason; the "payment done" line **leaks an access token**; "Request failed" twice may be one failure logged at two layers; no durations.

**Better:**

```text
{"time":"2026-06-15T09:02:11.204Z","level":30,"service":"checkout","requestId":"req_7Fx8","orderId":"ord_8xKp","msg":"payment started","provider":"fastpay","amountPaisa":520000}
{"time":"2026-06-15T09:02:13.511Z","level":50,"service":"checkout","requestId":"req_7Fx8","orderId":"ord_8xKp","msg":"payment failed","provider":"fastpay","reason":"provider_timeout","durationMs":2300,"err":{"type":"DependencyError","message":"...","stack":"..."}}
```

Plus: rotate the leaked token immediately, add redaction for authorisation headers and token fields, and purge the affected logs.

</details>

### Exercise 4 — Production scenario: a logging plan

**Objective:** design logging for a new service.
**The scenario:** your team is launching an order service running as several containers. Write a short logging plan covering format, fields, levels, context, sensitive data, collection, retention and alerting.

<details>
<summary>Show the solution</summary>

1. **Format**: pino JSON to standard output; UTC ISO timestamps with milliseconds; `pino-pretty` only in development.
2. **Standard fields**: `service`, `env`, `version`, `level`, `msg`, `requestId`, `traceId`, plus entity ids (`orderId`, `customerId`, `paymentId`) as relevant; field names from the organisation's shared conventions.
3. **Levels**: `info` in production, `debug` in development; `error` only for faults needing attention; client errors at `info` or as metrics.
4. **Context**: request-logging middleware with request ids (returned in `X-Request-Id`) and `AsyncLocalStorage`; OpenTelemetry trace ids propagated to downstream services.
5. **Events**: start-up and shutdown; one line per request; business events (order placed, payment succeeded/failed with reason codes, refunds); dependency failures and fallbacks; security events to an audit log.
6. **Sensitive data**: never secrets, card data or personal details; customer ids instead; redaction paths for headers, tokens, passwords and card fields; code-review checklist item.
7. **Collection**: the platform's agent ships stdout to the central log system; JSON parsed at ingestion.
8. **Retention**: 14 days for application logs, longer for audit logs as required; access restricted by role.
9. **Volume**: sample health-check and high-frequency success logs; dashboards of log volume per service.
10. **Alerting**: based on metrics derived from events (error rate, payment failure rate), plus direct alerts on `fatal` lines ({{ch:monitoring}}).

</details>

## Summary

Logs are a server's timestamped record of what it did, and often the only evidence of what happened in production. Write **structured logs** — one JSON object per line — to standard output, and let the platform collect them into a central, searchable system. Use a fast logging library such as pino rather than `console.log`.

Keep messages constant and put variable data in consistently named **fields**; use **levels** by meaning, with `error` reserved for faults that need attention and the level set by configuration. Attach **context** automatically: a service name on every line, request ids through child loggers or `AsyncLocalStorage`, and trace ids across services. Log lifecycle events, one line per request, significant business events, decisions, dependency failures and errors (once, with stack and cause), and security events in an audit log. **Never** log secrets, card data or sensitive personal data; prefer identifiers; configure **redaction** as a safety net.

Manage the cost with levels, sampling and retention, and use the right signal for each job: **metrics** for counts and alerts, **traces** for paths through distributed systems, and **logs** for the detailed story of what happened.

## Key terms

- **Log** — A time-ordered, append-only record of events produced by a program.
- **Log entry** — A single recorded event in a log.
- **Structured logging** — Writing log entries as data with named fields, usually JSON, instead of free text.
- **NDJSON** — Newline-delimited JSON: one JSON object per line, a common log format.
- **Log level** — The severity of a log entry, such as debug, info, warn, error or fatal.
- **Context (logging)** — Fields attached to log entries that describe where and for whom an event happened.
- **Child logger** — A logger derived from another that adds fixed fields to every entry it writes.
- **AsyncLocalStorage** — A Node.js feature that keeps a value available throughout one asynchronous flow without passing it explicitly.
- **Correlation id** — An identifier attached to all log entries produced while handling one request.
- **Trace id** — An identifier shared by all operations belonging to one request across multiple services.
- **W3C Trace Context** — A standard defining HTTP headers, such as `traceparent`, for propagating trace information between services.
- **OpenTelemetry** — An open standard and set of tools for collecting traces, metrics and logs.
- **Redaction** — Masking sensitive values in data before it is written to logs.
- **Audit log** — A log of security-relevant actions, such as logins and permission changes, kept with stricter controls.
- **Log aggregation** — Collecting logs from many sources into one searchable system.
- **Log retention** — The length of time logs are kept before deletion or archiving.
- **Sampling (logging)** — Recording only a fraction of high-volume, low-value log events.
- **Observability** — The ability to understand a system's internal behaviour from its logs, metrics and traces.
- **Metric** — A numeric measurement aggregated over time, such as a count or a latency percentile.
- **Trace** — A record of the path and timing of one request through the components of a system.
- **Twelve-Factor App** — A widely used set of principles for building deployable services, including treating logs as event streams.

## What comes next

Many of the log lines in this chapter carried a user or customer id — but how does a server know **who** is making a request in the first place? The next chapter, {{ch:authentication}}, covers the server side of proving identity: storing passwords safely with modern hashing, login flows, protecting against credential attacks, multi-factor authentication, and the building blocks that sessions, tokens and OAuth are made of.
