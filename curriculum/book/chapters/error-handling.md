# Error Handling in Servers

> [!GOALS]
> - Classify errors into **operational** errors (expected failures) and **programmer** errors (bugs), and handle each correctly.
> - Design an error model: error classes with stable codes, safe messages, HTTP statuses and causes.
> - Propagate errors through the layers of an application, translating them at each boundary.
> - Turn errors into consistent, safe responses, and record them so they can be diagnosed.
> - Handle failing dependencies with **timeouts**, **retries with exponential backoff and jitter**, **circuit breakers** and **fallbacks**.
> - Handle errors in concurrent operations, background work and process-level crashes.
> - Know when to use exceptions and when to return results.

## Why this matters

A server that only works when everything goes right is not finished. In production, things go wrong constantly:

- Users send invalid data or ask for orders that do not exist.
- Two customers try to buy the last box of mangoes at the same moment.
- The database becomes slow under load; a connection drops mid-query.
- The SMS provider times out; the payment provider returns an error page instead of JSON.
- A developer's change contains a bug that throws `TypeError: Cannot read properties of undefined`.

How a server handles these moments decides whether customers see a clear message or a blank page, whether a slow dependency causes a short delay or takes the whole system down, whether a failed payment is retried safely or charged twice, and whether the engineer on call can find the cause in five minutes or five hours.

You have already met pieces of this: exceptions in {{ch:errors-and-debugging}}, the `Result` type in {{ch:functional-programming}}, the central Express error handler in {{ch:express}}, problem-details responses in {{ch:rest-apis}}, and crash-and-restart in {{ch:nodejs}}. This chapter brings them together into a complete strategy — and adds the techniques for surviving failing dependencies, which is where most real outages begin.

## The simple idea

Think about how a hospital handles problems. A patient arriving with the wrong form is redirected politely to the right desk — an expected situation with a standard procedure. A broken lift is reported and patients are sent to the stairs while it is repaired — a known kind of failure, worked around. But if a doctor discovers that a machine is giving dangerously wrong readings, the machine is **switched off immediately** and replaced, because continuing to use it could cause harm.

Servers need the same three responses:

1. **Expected problems** (bad input, missing records, conflicts) get a clear, standard answer.
2. **Failing dependencies** (a slow database, an unavailable SMS service) are worked around: wait a limited time, retry carefully, use a fallback, or report that the service is temporarily unavailable.
3. **Bugs** (code doing something impossible) mean the program can no longer be trusted: record everything, stop that work, and restart cleanly.

> [!ANALOGY]
> Error handling is like a hospital's procedures: routine problems get a standard answer, failing equipment is worked around, and equipment that behaves impossibly is switched off and replaced.
>
> **Where the analogy breaks:** a hospital handles one problem at a time with human judgement. A server may face thousands of failures per second, all handled by rules written in advance — and a badly chosen rule (such as "retry immediately, forever") can turn one small failure into a flood that overwhelms everything.

## The proper definition and key words

**Error handling** is the set of techniques a program uses to detect, report and recover from failures, so that it behaves predictably when things go wrong.

The key words:

- **Operational error** — an expected failure in a correct program: invalid input, a resource not found, a conflict, a timeout, a dependency being down. These should be handled.
- **Programmer error** (bug) — a mistake in the code: calling a function with the wrong arguments, reading a property of `undefined`, violating an assumption. These should be **fixed**, not handled.
- **Exception** — an error object thrown and caught with `throw` and `try`/`catch` ({{ch:errors-and-debugging}}).
- **Error code** — a stable, machine-readable identifier for a kind of error (`order_not_found`), separate from the human-readable message.
- **Cause** — the lower-level error that led to this one, kept for diagnosis (the standard `cause` option on `Error`).
- **Transient failure** — a failure likely to succeed if retried (a timeout, a dropped connection, a 503). **Permanent failure** — one that will fail the same way again (a 400, a 404).
- **Retry** — trying a failed operation again. **Backoff** — waiting longer between successive retries. **Jitter** — adding randomness to waits.
- **Timeout** — the maximum time to wait for an operation before giving up.
- **Circuit breaker** — a component that stops calling a failing dependency for a while, failing fast instead.
- **Fallback** — an alternative result used when the primary one fails (a cached value, a default, a simpler feature).
- **Graceful degradation** — continuing to provide reduced service when parts of the system fail.

## How it works inside: where errors come from and where they go

### Level 2 — Errors flow upward through layers

In the layered structure from {{ch:express}}, an error usually starts deep down and travels up:

```text
   client
     ▲   5. response: safe message, correct status, request id
     │
   ┌─┴───────────────────────────────┐
   │ error handler (boundary)         │  4. map error → HTTP response; log
   └─▲───────────────────────────────┘
     │
   ┌─┴───────────────────────────────┐
   │ controller                       │  (usually just lets errors pass)
   └─▲───────────────────────────────┘
     │
   ┌─┴───────────────────────────────┐
   │ service                          │  3. business errors: OutOfStock, InvalidTransition
   └─▲───────────────────────────────┘
     │
   ┌─┴───────────────────────────────┐
   │ repository / adapter             │  2. TRANSLATE technical errors:
   └─▲───────────────────────────────┘     unique violation → DuplicateEmail
     │                                     courier timeout → DependencyUnavailable
   ┌─┴───────────────────────────────┐
   │ database driver, HTTP client     │  1. raw technical error: code 23505, ECONNRESET
   └─────────────────────────────────┘
```

Each layer has one job with errors:

1. **Low-level libraries** throw technical errors in their own vocabulary.
2. **Adapters and repositories translate** those into your application's vocabulary, keeping the original as the `cause`. Higher layers should never need to know PostgreSQL error codes or a courier's HTTP status quirks ({{ch:design-patterns}}).
3. **Services** throw business errors when rules are violated.
4. **One error-handling boundary** turns errors into responses, and records them.
5. The **client** gets a safe, consistent answer.

Most code in between does **nothing** with errors: it lets them propagate. Catching an error is only useful if you can add value — translate it, add context, retry, use a fallback, or clean up.

### Level 2 — Operational errors versus bugs

This distinction (popularised in Node.js circles by an influential guide from Joyent, the company that stewarded Node in its early years) decides what to do:

| | Operational error | Programmer error |
|---|---|---|
| Examples | Invalid input; not found; conflict; timeout; dependency down; disk full | `undefined` property access; wrong argument types; broken invariant; forgotten `await` |
| Cause | The world | The code |
| Can the program continue safely? | Yes | Not reliably — state may be corrupted |
| Response | Handle: respond, retry, fall back, alert if frequent | Log everything; fail the request with 500; often restart the process; **fix the code** |
| Message to client | Specific and helpful | Generic ("Something went wrong") |

Trying to "handle" a bug — catching a `TypeError` and carrying on — usually hides it and lets corrupted state cause stranger problems later.

## Designing an error model

### Level 3 — Error classes with codes

```ts
type ErrorCode =
  | "validation_failed"
  | "not_found"
  | "conflict"
  | "insufficient_stock"
  | "unauthenticated"
  | "forbidden"
  | "rate_limited"
  | "dependency_unavailable"
  | "internal";

class AppError extends Error {
  constructor(
    readonly code: ErrorCode,
    readonly status: number,
    message: string,
    readonly details?: Record<string, unknown>,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = new.target.name;
  }
  readonly expose: boolean = true; // safe to show the message to clients
}

class NotFoundError extends AppError {
  constructor(resource: string, id: string) {
    super("not_found", 404, `${resource} not found`, { resource, id });
  }
}

class InsufficientStockError extends AppError {
  constructor(productId: string, available: number, requested: number) {
    super("insufficient_stock", 409, `Only ${available} left in stock`, { productId, available, requested });
  }
}

class DependencyError extends AppError {
  constructor(dependency: string, options?: { cause?: unknown }) {
    super("dependency_unavailable", 503, "A required service is temporarily unavailable", { dependency }, options);
  }
}

const e = new InsufficientStockError("prd_Chaunsa5kg", 3, 5);
console.log(e instanceof AppError, e.name, e.code, e.status, e.message, e.details);

const timeout = new Error("connect ETIMEDOUT 10.0.4.12:443");
const d = new DependencyError("courier-api", { cause: timeout });
console.log(d.code, d.status, (d.cause as Error).message);
```

**Output:**

```text
true InsufficientStockError insufficient_stock 409 Only 3 left in stock { productId: 'prd_Chaunsa5kg', available: 3, requested: 5 }
dependency_unavailable 503 connect ETIMEDOUT 10.0.4.12:443
```

Walk through it:

- **`code`** is a stable identifier clients and dashboards rely on. It is a union type, so only known codes compile. Messages may change wording; codes do not.
- **`status`** is the HTTP status this error maps to ({{ch:rest-apis}}).
- **`details`** carries structured, safe information — which product, how many are available — useful both to clients ("only 3 left") and to logs.
- **`cause`** keeps the original technical error, using the standard `Error` option ({{ch:clean-code}}). The courier's internal IP address stays in the cause, for logs, and never reaches the client.
- **`new.target.name`** sets `name` to the actual subclass name automatically.
- **Subclasses** make throwing sites readable: `throw new NotFoundError("Order", id)`.

Keep the set of codes **small and meaningful**. A hundred fine-grained classes are harder to use than ten well-chosen ones with details.

### Level 3 — Translating errors at the boundary

Repositories translate driver errors into application errors. PostgreSQL, for example, reports a unique-constraint violation with the code `23505` and a foreign-key violation with `23503` ({{ch:postgresql}}):

```ts
class ConflictError extends Error {
  constructor(message: string, readonly field: string, options?: { cause?: unknown }) {
    super(message, options);
  }
}
class ReferenceError_ extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
  }
}

type PgError = Error & { code?: string; constraint?: string };

function translateDbError(error: unknown): never {
  const pg = error as PgError;
  if (pg.code === "23505" && pg.constraint === "users_email_unique") {
    throw new ConflictError("An account with this email already exists", "email", { cause: error });
  }
  if (pg.code === "23503") {
    throw new ReferenceError_("A referenced record does not exist", { cause: error });
  }
  throw error; // unknown: let it propagate unchanged
}

async function insertUser(fakeDb: () => Promise<void>) {
  try {
    await fakeDb();
  } catch (error) {
    translateDbError(error);
  }
}

const duplicate = Object.assign(new Error('duplicate key value violates unique constraint "users_email_unique"'), {
  code: "23505",
  constraint: "users_email_unique",
});

try {
  await insertUser(async () => {
    throw duplicate;
  });
} catch (error) {
  const e = error as ConflictError;
  console.log(e.constructor.name, e.field, e.message, "| cause:", (e.cause as PgError).code);
}
```

**Output:**

```text
ConflictError email An account with this email already exists | cause: 23505
```

- The service and controller see a meaningful `ConflictError` on the `email` field, which maps to a 409 with a field error — not a database error code.
- The original error is kept as the `cause` for logs.
- **Unknown** errors are rethrown unchanged; translating everything into a generic error would destroy information.
- The return type `never` tells TypeScript the function always throws.
- (The class is named `ReferenceError_` only to avoid clashing with JavaScript's built-in `ReferenceError`; in real code you would name it something like `MissingReferenceError`.)

## From error to response

### Level 3 — The boundary handler

At the HTTP boundary, one handler converts any error into a response ({{ch:express}}):

```ts
// fragment
app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
  const requestId = res.locals.requestId as string;

  if (err instanceof ZodError) {
    res.status(400).type("application/problem+json").json({
      type: "https://api.cornershop.example/problems/validation",
      title: "Invalid request",
      status: 400,
      code: "validation_failed",
      errors: z.flattenError(err).fieldErrors,
      requestId,
    });
    return;
  }

  if (err instanceof AppError) {
    logger.warn({ err, requestId, code: err.code }, err.message);          // expected: warn level
    res.status(err.status).type("application/problem+json").json({
      title: err.message,
      status: err.status,
      code: err.code,
      ...(err.details && { details: err.details }),
      requestId,
    });
    return;
  }

  logger.error({ err, requestId, path: req.path }, "unhandled error");     // a bug: error level, alert
  res.status(500).type("application/problem+json").json({
    title: "Something went wrong",
    status: 500,
    code: "internal",
    requestId,
  });
});
```

The rules this handler follows:

- **Known errors** get their status, code, safe message and details.
- **Unknown errors** are treated as bugs: a generic 500, with **nothing** internal in the body — no message, no stack trace, no SQL ({{ch:application-security}}). Full details go to the logs.
- **Every response includes the request id**, so a customer's support ticket leads directly to the log entries ({{ch:logging}}).
- **Log levels differ**: expected errors (a 404, a validation failure) are routine and logged at a low level, if at all; unexpected errors are logged at `error` and usually alert someone ({{ch:monitoring}}).
- **One format** for every error, as designed in {{ch:rest-apis}}.

### Level 4 — What to log about an error

A useful error log entry contains:

- the **request id** (and trace id, if you use tracing — {{ch:observability-and-incidents}});
- the error's **name, code, message and stack trace**, and the **cause chain** (each `cause` in turn);
- **context**: route, method, user or tenant id (not their personal data), relevant entity ids, the dependency involved;
- **never** passwords, tokens, card numbers or full request bodies containing personal data ({{ch:logging}}).

In addition to logs, most teams send unexpected errors to an **error-tracking service** (Sentry is a widely used example), which groups identical errors, counts occurrences, shows stack traces with source code, and notifies the team when a new kind of error appears after a release.

## Failing dependencies

Most production incidents involve a **dependency** — a database, a cache, another service, a third-party API — that becomes slow or unavailable. How your code reacts determines whether a small problem stays small.

### Level 3 — Timeouts: never wait forever

Every call over a network must have a **timeout**. Without one, a dependency that stops responding causes requests to pile up — each holding memory, a database connection or a socket — until your service runs out of resources and fails too.

```ts
async function fetchWithTimeout(url: string, ms: number): Promise<Response> {
  try {
    return await fetch(url, { signal: AbortSignal.timeout(ms) });
  } catch (error) {
    if (error instanceof DOMException && error.name === "TimeoutError") {
      throw new Error(`Timed out after ${ms} ms`, { cause: error });
    }
    throw error;
  }
}

import { createServer } from "node:http";
const slowServer = createServer((_req, res) => setTimeout(() => res.end("late"), 500));

slowServer.listen(0, async () => {
  const { port } = slowServer.address() as { port: number };
  const started = Date.now();
  try {
    await fetchWithTimeout(`http://localhost:${port}/quote`, 100);
  } catch (error) {
    console.log((error as Error).message, "| gave up within 300 ms:", Date.now() - started < 300);
  }
  slowServer.closeAllConnections();
  slowServer.close();
});
```

**Output:**

```text
Timed out after 100 ms | gave up within 300 ms: true
```

- `AbortSignal.timeout(ms)` creates a signal that aborts after the given time; `fetch` rejects with a `TimeoutError`.
- The wrapper converts it into a clear error with the original as its cause.
- The slow server takes 500 ms; the client gives up after 100 ms, freeing its resources.

Choosing timeout values:

- Base them on the dependency's **normal** latency (for example, a little above its 99th-percentile response time — {{ch:frontend-performance}}), not on a guess.
- Make **inner** timeouts shorter than **outer** ones. If your API promises responses within 2 seconds and calls a service with a 30-second timeout, the client has long given up while your server still waits.
- Apply them everywhere: HTTP clients, database queries (a statement timeout — {{ch:postgresql}}), cache calls, queue operations.

### Level 4 — Retries with exponential backoff and jitter

Many failures are **transient**: a dropped connection, a momentary overload, a 503 during a deployment. Retrying often succeeds. But retrying badly is dangerous:

- Retrying **immediately** hammers a struggling service.
- Thousands of clients retrying **at the same moments** create synchronised waves of load — a **thundering herd** — that can keep a recovering service down.
- Retrying **non-idempotent** operations can duplicate them — double charges ({{ch:rest-apis}}).
- Retrying **permanent** failures (a 400, a 404) wastes effort.

The standard technique is **exponential backoff with jitter**: wait a base delay, double it after each failure up to a cap, and randomise each wait:

```ts
type RetryOptions = {
  attempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  isRetryable: (error: unknown) => boolean;
  random?: () => number;
  sleep?: (ms: number) => Promise<void>;
  onRetry?: (attempt: number, delayMs: number, error: unknown) => void;
};

async function withRetry<T>(operation: () => Promise<T>, o: RetryOptions): Promise<T> {
  const random = o.random ?? Math.random;
  const sleep = o.sleep ?? ((ms) => new Promise<void>((r) => setTimeout(r, ms)));
  for (let attempt = 1; ; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt >= o.attempts || !o.isRetryable(error)) throw error;
      const ceiling = Math.min(o.maxDelayMs, o.baseDelayMs * 2 ** (attempt - 1));
      const delay = Math.round(random() * ceiling); // "full jitter": anywhere between 0 and the ceiling
      o.onRetry?.(attempt, delay, error);
      await sleep(delay);
    }
  }
}

class HttpError extends Error {
  constructor(readonly status: number) {
    super(`HTTP ${status}`);
  }
}

const retryable = (e: unknown) => e instanceof HttpError && (e.status === 429 || e.status >= 500);

// A flaky dependency: fails twice with 503, then succeeds
let calls = 0;
const flaky = async () => {
  calls++;
  if (calls <= 2) throw new HttpError(503);
  return "quote: Rs 250";
};

const result = await withRetry(flaky, {
  attempts: 5,
  baseDelayMs: 100,
  maxDelayMs: 2000,
  isRetryable: retryable,
  random: () => 0.5,                    // fixed for a predictable example
  sleep: async () => {},                // do not actually wait in the example
  onRetry: (n, ms, e) => console.log(`attempt ${n} failed (${(e as Error).message}); retrying in ${ms} ms`),
});
console.log(result, `after ${calls} calls`);

try {
  await withRetry(async () => { throw new HttpError(404); }, { attempts: 5, baseDelayMs: 100, maxDelayMs: 2000, isRetryable: retryable });
} catch (error) {
  console.log(`not retried: ${(error as Error).message}`);
}
```

**Output:**

```text
attempt 1 failed (HTTP 503); retrying in 50 ms
attempt 2 failed (HTTP 503); retrying in 100 ms
quote: Rs 250 after 3 calls
not retried: HTTP 404
```

Walk through it:

- The delay **ceiling** doubles each time — 100, 200, 400, 800... — capped at `maxDelayMs`.
- **Full jitter** picks a random delay between 0 and the ceiling, which spreads retries from many clients evenly over time, avoiding synchronised waves. (This approach is described in a well-known article on the AWS Architecture Blog about backoff and jitter.) The example fixes `random` to 0.5, so the waits are half the ceilings: 50 and 100 ms.
- **Only retryable errors** are retried: 429 and 5xx. A 404 fails immediately.
- **The number of attempts is limited**; after the last, the error propagates.
- `random` and `sleep` are injectable, so the logic can be tested instantly and deterministically ({{ch:testing}}).
- If a dependency sends a `Retry-After` header (with a 429 or 503), respect it instead of your own delay.

Rules for retries in real systems:

- **Retry only idempotent operations**, or make them idempotent with keys ({{ch:rest-apis}}).
- **Retry at one layer only.** If the client retries 3 times, the API gateway 3 times, and your service 3 times, one user action can become 27 calls to the database during an outage — **retry amplification**.
- **Consider a retry budget**: allow retries only while they make up a small fraction of total traffic, so retries cannot multiply load during a large outage.
- **Keep the total time within the caller's timeout.**

### Level 4 — Circuit breakers

When a dependency is **down**, retries and timeouts still cost time: every request waits for the timeout before failing. A **circuit breaker** (named after the electrical device that cuts power when a circuit is overloaded; described for software in Michael Nygard's book *Release It!*) watches for repeated failures and, after too many, **stops calling** the dependency for a while, failing immediately instead:

```text
              failures exceed threshold
   CLOSED ──────────────────────────────▶ OPEN
   (calls pass through,                   (calls fail immediately,
    failures counted)                      no load on the dependency)
      ▲                                       │
      │ trial call succeeds                   │ after a cool-down period
      │                                       ▼
      └──────────────────────────────── HALF-OPEN
           trial call fails → back to OPEN  (one trial call allowed)
```

```ts
type State = "closed" | "open" | "half-open";

class CircuitBreaker {
  #state: State = "closed";
  #failures = 0;
  #openedAt = 0;

  constructor(
    private readonly failureThreshold: number,
    private readonly coolDownMs: number,
    private readonly now: () => number = Date.now,
  ) {}

  get state(): State {
    if (this.#state === "open" && this.now() - this.#openedAt >= this.coolDownMs) this.#state = "half-open";
    return this.#state;
  }

  async call<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === "open") throw new Error("Circuit open: failing fast");
    try {
      const result = await operation();
      this.#state = "closed";
      this.#failures = 0;
      return result;
    } catch (error) {
      this.#failures++;
      if (this.#state === "half-open" || this.#failures >= this.failureThreshold) {
        this.#state = "open";
        this.#openedAt = this.now();
      }
      throw error;
    }
  }
}

let fakeTime = 0;
let smsServiceUp = false;
const sendSms = async () => {
  if (!smsServiceUp) throw new Error("SMS provider timeout");
  return "sent";
};

const breaker = new CircuitBreaker(3, 30_000, () => fakeTime);
const attempt = async (label: string) => {
  try {
    console.log(label, await breaker.call(sendSms), `[${breaker.state}]`);
  } catch (error) {
    console.log(label, (error as Error).message, `[${breaker.state}]`);
  }
};

for (const n of [1, 2, 3, 4]) await attempt(`call ${n}:`);
fakeTime = 30_000;            // cool-down passes
await attempt("trial (still down):");
fakeTime = 60_000;
smsServiceUp = true;          // the provider recovers
await attempt("trial (recovered):");
await attempt("next call:");
```

**Output:**

```text
call 1: SMS provider timeout [closed]
call 2: SMS provider timeout [closed]
call 3: SMS provider timeout [open]
call 4: Circuit open: failing fast [open]
trial (still down): SMS provider timeout [open]
trial (recovered): sent [closed]
next call: sent [closed]
```

Walk through it:

- The first three failures are passed through and counted; the third reaches the threshold and **opens** the circuit.
- Call 4 fails **instantly**, without touching the provider: no waiting for a timeout, and no extra load on a service that is already struggling.
- After the cool-down, the breaker is **half-open**: one trial call is allowed. It fails, so the breaker opens again for another cool-down.
- Later, a trial succeeds, the breaker **closes**, and normal traffic resumes.
- The clock is injected, so the behaviour can be shown (and tested) without waiting 30 seconds.

Production circuit breakers (in libraries such as `opossum` for Node, or in service meshes and API gateways — {{ch:api-gateway}}) usually track failure **rates** over a sliding time window rather than consecutive failures, count timeouts as failures, and emit metrics when they open — an important signal for monitoring.

### Level 4 — Fallbacks and graceful degradation

When a dependency fails, the best response is often not an error at all:

- **Recommendations service down?** Show best-sellers from a cache instead.
- **Live delivery estimate unavailable?** Show "usually 1–2 days" from configuration.
- **Exchange-rate API down?** Use the last known rate, if it is recent enough, and say so.
- **Search slow?** Return the first page of a simpler query.

The principle: decide in advance which features are **critical** (checkout, payment) and which are **optional** (recommendations, reviews, personalised banners). Optional features fail quietly with fallbacks; critical ones fail clearly. In the front end, the same principle appears as error boundaries around independent sections ({{ch:react-advanced}}).

> [!WARNING]
> Fallbacks must not hide important failures. If a fallback is used, **record it** (a metric and a log line), so that "we have been showing cached prices for six hours" is noticed. And never fall back to something **wrong** for critical data — showing a stale price at checkout, or skipping a fraud check because the fraud service timed out, can cost more than an error.

### Level 5 — Bulkheads

Ships are divided into watertight compartments — **bulkheads** — so that one leak does not sink the whole ship. In software, a bulkhead **isolates** resources so one failing dependency cannot consume everything: separate connection pools or concurrency limits per dependency, so that a hanging reporting service cannot use up all the threads or connections needed by checkout. Concurrency limiters, separate worker pools, and separate services for critical paths are common forms.

## Errors in concurrent and background work

### Level 3 — Many operations at once

When running several operations in parallel ({{ch:asynchronous-javascript}}), choose deliberately:

- **`Promise.all`** rejects as soon as **any** operation fails — right when all results are required (a page cannot render without the product **and** its price).
- **`Promise.allSettled`** waits for **all** and reports each result — right when partial results are useful (send 50 notifications and report which failed).

```ts
const tasks = ["ali@example.com", "bad-address", "sana@example.com"].map(async (to) => {
  if (!to.includes("@")) throw new Error(`invalid address: ${to}`);
  return `sent to ${to}`;
});

const results = await Promise.allSettled(tasks);
const sent = results.filter((r) => r.status === "fulfilled").length;
const failed = results.flatMap((r) => (r.status === "rejected" ? [(r.reason as Error).message] : []));
console.log(`${sent} sent, ${failed.length} failed:`, failed);
```

**Output:**

```text
2 sent, 1 failed: [ 'invalid address: bad-address' ]
```

### Level 4 — Background jobs

Errors in work that is not part of a request — scheduled jobs ({{ch:cron-jobs}}), queue consumers ({{ch:queues}}) — have no client to report to, so they are easy to lose. Rules:

- **Catch, log and report** every job failure with the job id and inputs.
- **Retry with backoff** for transient failures (queue systems usually provide this), with a maximum number of attempts.
- **Move permanently failing jobs to a dead-letter queue** for inspection, instead of retrying forever or discarding them.
- **Make jobs idempotent**, because retries mean they may run more than once.
- **Alert on failure rates**, not just individual failures.

### Level 4 — Process-level errors

As covered in {{ch:nodejs}}: unhandled promise rejections and uncaught exceptions crash a Node process by default. Register handlers only to **log** them before exiting; let the platform restart the process; and shut down gracefully on `SIGTERM`. A process that swallows unknown errors and keeps running is more dangerous than one that restarts.

## Exceptions or results?

Two styles coexist in TypeScript code ({{ch:functional-programming}}):

- **Exceptions** — throw, and catch at a boundary. Concise; errors cannot be silently ignored if a boundary handler exists; but a function's type does not show which errors it can produce.
- **Result values** — return `{ ok: true, value }` or `{ ok: false, error }`. The possible failures are visible in the type, and the compiler forces callers to handle them; but they add verbosity, and unexpected bugs still throw.

A common, practical combination:

- Use **exceptions** for errors that should travel to the boundary handler — validation failures, not found, unauthorised, bugs.
- Use **results** where the caller is expected to **decide** what to do with each outcome — for example, a payment adapter returning `succeeded`, `declined` (with a reason) or `requires_action`, which are all normal business outcomes rather than errors.

A declined card is not an exceptional event for a shop; it is a normal result to show the customer. A database password being wrong is exceptional.

## From beginner to enterprise

**Level 3 — first services.** Typed errors with codes; a central error handler; safe 500s; request ids in responses.

**Level 4 — real applications.** Error translation in repositories and adapters, with causes; timeouts on every outgoing call; retries with backoff and jitter for idempotent calls; fallbacks for optional features; structured error logging; error tracking.

**Level 5 — professional practice.** Circuit breakers on critical dependencies; bulkheads; retry budgets; dead-letter queues; alerting on error rates by code and dependency ({{ch:monitoring}}); error codes documented in the API ({{ch:api-documentation}}); game days where failures are simulated deliberately.

**Level 6 — large systems.** Resilience policies (timeouts, retries, circuit breaking) applied consistently by a service mesh or gateway; chaos engineering in production; error budgets that decide when to slow feature work in favour of reliability ({{ch:observability-and-incidents}}); cross-service tracing of failures ({{ch:distributed-systems}}).

## Real-world use cases

### Checkout with several dependencies

- **Dependencies**: database (critical), payment provider (critical), fraud scoring (critical), SMS confirmation (optional), recommendations on the confirmation page (optional).
- **Design**: tight timeouts on all; payment calls with idempotency keys and limited retries on transient errors; fraud scoring behind a circuit breaker — and if it is open, orders above a threshold go to manual review instead of being accepted blindly; SMS sent asynchronously through a queue with retries; recommendations with a cached fallback.
- **Result**: an SMS provider outage delays confirmations but never blocks orders; a fraud-service outage slows down large orders but does not open the door to fraud.

### A cascading failure, and its fix

- **Incident**: a reporting query slowed the database; API requests waited without timeouts; the connection pool filled up; checkout requests queued behind report requests; the API stopped responding entirely. Clients retried immediately, tripling load.
- **Fixes**: statement timeouts; separate connection pools for reporting and checkout (a bulkhead) — or move reporting to a read replica ({{ch:replication}}); request timeouts at the API; clients retrying with backoff and jitter; a circuit breaker around the reporting endpoint.

## Common mistakes

### Beginner: swallowing errors

`catch (e) {}` or `catch (e) { console.log(e) }` and carrying on as if nothing happened. **Fix:** handle meaningfully or let it propagate ({{ch:clean-code}}).

### Beginner: leaking internals

Stack traces, SQL and exception messages in API responses. **Fix:** generic messages for unknown errors; details in logs.

### Beginner: wrong status codes

500 for validation errors; 200 with an error body. **Fix:** map error types to statuses in one place.

### Intermediate: losing the cause

`throw new Error("Failed to save order")` without the original error. **Fix:** `{ cause: error }`.

### Intermediate: no timeouts

**Consequence:** one slow dependency exhausts your resources. **Fix:** timeouts everywhere, inner shorter than outer.

### Intermediate: naive retries

Immediate, unlimited retries of everything, including POSTs and 400s. **Fix:** retry only transient errors on idempotent operations, with backoff, jitter and a limit, at one layer.

### Production: catching bugs and continuing

Catching `TypeError` to "keep the server up". **Fix:** log, fail the request, restart if state may be corrupted, fix the code.

### Production: silent fallbacks

Stale data shown for hours unnoticed. **Fix:** metrics and alerts when fallbacks are used.

### Enterprise: retry amplification

Retries at every layer multiplying load during outages. **Fix:** retry in one place; retry budgets; circuit breakers.

## Debugging and troubleshooting

- **Start from the request id** in the user's report; find all log lines for that request, including the cause chain.
- **Group errors by code and by dependency** in dashboards: a spike in `dependency_unavailable` for `courier-api` tells you where to look immediately.
- **Check whether errors started with a deployment** (error-tracking services mark releases) — a new error type right after a release is almost always a bug in that release.
- **Look at latency, not only errors.** Timeouts show up first as rising latency; circuit breakers opening show up as fast failures.
- **Reproduce failure modes deliberately** in staging: kill a dependency, add latency, return errors — and watch whether timeouts, retries, breakers and fallbacks behave as designed.

## Security

- Never include stack traces, internal messages, SQL, file paths, hostnames or library versions in responses.
- Use generic messages where specificity would help attackers: "Email or password is incorrect"; 404 instead of 403 for objects the caller should not know about ({{ch:frontend-authentication}}).
- Do not log secrets or personal data in error logs ({{ch:logging}}).
- Treat error responses from third parties as untrusted input — they may be huge, malformed or malicious ({{ch:validation}}).
- Rate-limit endpoints whose errors reveal information (login, password reset, coupon checks) ({{ch:rate-limiting}}).

## How a senior engineer thinks about this

- **Expect failure.** Every network call can be slow, fail or succeed without you finding out; design for all three.
- **Bugs are fixed; operational errors are handled.** They never paper over bugs to "keep things running".
- **Translate at boundaries.** Each layer speaks its own language of errors; causes are always kept.
- **Contain the blast radius.** Timeouts, bulkheads, circuit breakers and fallbacks stop one failure from becoming an outage.
- **Retries are load.** They add retries carefully, in one place, with backoff, jitter and limits — and only for safe operations.
- **Make failures visible.** Codes, request ids, structured logs, error tracking and alerts turn incidents from mysteries into routine work.

## Exercises

### Exercise 1 — Classify and respond

**Objective:** practise distinguishing error kinds.
**What to do:** for each situation, say whether it is operational or a programmer error, the HTTP status (if any), and the right response: (1) the requested order id does not exist; (2) `TypeError: Cannot read properties of undefined (reading 'price')` in the pricing service; (3) the payment provider times out; (4) a coupon has expired; (5) the database's unique index rejects a second account with the same email; (6) a configuration variable is missing at start-up; (7) a request body is 30 MB on an endpoint limited to 100 KB.

<details>
<summary>Show the solution</summary>

1. **Operational** — 404 `not_found`.
2. **Programmer error** — 500 `internal`, generic message; log at error level with stack; alert; fix the code (probably missing data validation or a null check that reveals a design issue).
3. **Operational** (transient dependency failure) — retry with an idempotency key if safe; otherwise 503 `dependency_unavailable` (or 202 if payment confirmation can be completed asynchronously); circuit breaker if repeated.
4. **Operational** — 409 or 422 with code `coupon_expired`.
5. **Operational** — translate to 409 `conflict` on the email field (wording chosen with account enumeration in mind).
6. **Operational at start-up**, but the right response is to **refuse to start**: fail fast with a clear message ({{ch:nodejs}}).
7. **Operational** — 413 Payload Too Large, rejected by the body parser before reading it all.

</details>

### Exercise 2 — Add resilience to a client

**Objective:** practise timeouts and retries.
**What to build:** a function `getDeliveryQuote(city)` that calls a courier API with a 2-second timeout, retries up to 3 attempts on network errors, timeouts, 429 and 5xx (with exponential backoff and full jitter from 200 ms), does **not** retry 4xx (other than 429), and if all attempts fail, returns a fallback quote `{ feePaisa: 25000, estimatedDays: 3, estimated: true }` while logging that the fallback was used.

<details>
<summary>Show the solution</summary>

```ts
// fragment
type Quote = { feePaisa: number; estimatedDays: number; estimated: boolean };

class HttpStatusError extends Error {
  constructor(readonly status: number) {
    super(`courier responded ${status}`);
  }
}

const isRetryable = (e: unknown) =>
  (e instanceof HttpStatusError && (e.status === 429 || e.status >= 500)) ||
  (e instanceof DOMException && e.name === "TimeoutError") ||
  (e instanceof TypeError); // fetch throws TypeError for network failures

async function callCourier(city: string): Promise<Quote> {
  const response = await fetch(`https://api.courier.example/quotes?city=${encodeURIComponent(city)}`, {
    signal: AbortSignal.timeout(2000),
  });
  if (!response.ok) throw new HttpStatusError(response.status);
  const body = CourierQuote.parse(await response.json()); // validate the response ({{ch:validation}})
  return { feePaisa: body.feePaisa, estimatedDays: body.estimatedDays, estimated: false };
}

export async function getDeliveryQuote(city: string): Promise<Quote> {
  try {
    return await withRetry(() => callCourier(city), {
      attempts: 3,
      baseDelayMs: 200,
      maxDelayMs: 2000,
      isRetryable,
    });
  } catch (error) {
    logger.warn({ err: error, city, fallback: true }, "courier quote failed; using fallback");
    metrics.increment("courier.quote.fallback");
    return { feePaisa: 25000, estimatedDays: 3, estimated: true };
  }
}
```

**Walkthrough:** each attempt has its own 2-second timeout; transient failures are retried with backoff and jitter (the `withRetry` from this chapter); permanent client errors fail at once; the response is validated before use; if everything fails, an explicitly marked **estimated** quote is returned, a log line and a metric record it, and the UI can say "estimated". Note the total worst-case time (three attempts plus waits — roughly 6.6 seconds): if the page must respond faster, reduce attempts or the timeout, or fetch the quote asynchronously.

</details>

### Exercise 3 — Debug the error handling

**Objective:** practise reviewing error handling.
**Starting point:**

```ts
// fragment
app.post("/orders", async (req, res) => {
  try {
    const order = await orderService.create(req.body);
    res.json(order);
  } catch (e: any) {
    console.log(e);
    res.status(500).json({ error: e.message, stack: e.stack });
  }
});

// in orderService.create:
try {
  await db.insert(order);
} catch (e) {
  throw new Error("DB error");
}
```

**What to do:** list the problems and rewrite both parts.

<details>
<summary>Show the solution</summary>

**Problems:** every error becomes a 500 (validation, conflicts and missing products included); the response leaks the message and **stack trace**; logging is unstructured and has no request id; the service throws away the original error (no cause) and its meaning (a duplicate key and a dropped connection both become "DB error"); success uses 200 instead of 201; no validation.

**Rewrite:**

```ts
// fragment
// controller: no try/catch — errors go to the central handler
app.post("/orders", validate("body", CreateOrder), async (_req, res) => {
  const order = await orderService.create(res.locals.body);
  res.status(201).location(`/orders/${order.id}`).json(order);
});

// service / repository: translate known errors, keep the cause, rethrow the rest
try {
  await db.insert(order);
} catch (error) {
  if (isUniqueViolation(error, "orders_idempotency_key_unique")) {
    throw new AppError("conflict", 409, "This order was already placed", { orderId: order.id }, { cause: error });
  }
  throw error;
}
```

The central handler (this chapter) maps `AppError` to its status and code, sends a generic 500 for unknown errors, and logs everything with the request id.

</details>

### Exercise 4 — Production scenario: surviving a provider outage

**Objective:** practise resilience design.
**The scenario:** your shop sends order confirmations by SMS through one provider. During its last outage, every checkout took 30 seconds and many failed, because the SMS call happened inside the checkout request with no timeout. Redesign the flow.

<details>
<summary>Show the solution</summary>

1. **Take SMS off the critical path.** Checkout writes the order and an "order placed" event (ideally in the same database transaction — the outbox pattern, {{ch:event-driven-systems}}) and responds immediately.
2. **Send asynchronously** from a queue consumer ({{ch:queues}}), with retries using exponential backoff and jitter, a maximum number of attempts, and a dead-letter queue for permanently failing messages.
3. **Timeouts** of a few seconds on each SMS call.
4. **Circuit breaker** around the provider: when it opens, messages stay in the queue instead of hammering the provider; metrics and an alert fire.
5. **Fallback channel**: if SMS fails repeatedly, send the confirmation by email, or switch to a second SMS provider through the same adapter interface ({{ch:design-patterns}}).
6. **Idempotency**: include the order id as a deduplication key so retries do not send multiple messages.
7. **Monitoring**: queue depth, delivery latency, failure rate by provider; a runbook for provider outages ({{ch:code-review-and-documentation}}).

**Result:** a provider outage delays confirmations but never slows or breaks checkout.

</details>

## Summary

Good error handling makes a server predictable when things go wrong. Distinguish **operational errors** — expected failures such as invalid input, missing resources, conflicts and failing dependencies — which you **handle**, from **programmer errors** — bugs — which you log, fail safely and **fix**, often restarting the process.

Design an **error model**: a small set of error classes with stable **codes**, safe messages, HTTP statuses, structured details and the original **cause**. Let errors propagate, and **translate** them at boundaries: repositories turn driver errors into domain errors, and one HTTP **error handler** turns domain errors into consistent, safe responses with request ids, logging expected errors quietly and unexpected ones loudly, and reporting bugs to error tracking.

Survive failing dependencies with **timeouts** on every network call (inner shorter than outer), **retries** only for transient failures of idempotent operations — with **exponential backoff, jitter** and limits, at one layer — **circuit breakers** that fail fast when a dependency is down, **fallbacks** and graceful degradation for optional features (always measured), and **bulkheads** that isolate resources. Use `Promise.allSettled` when partial results are acceptable, give background jobs retries and dead-letter queues, and crash cleanly on unknown errors. Use exceptions for errors that should reach the boundary, and result values for normal business outcomes the caller must decide on.

## Key terms

- **Error handling** — The techniques a program uses to detect, report and recover from failures.
- **Operational error** — An expected failure in a correct program, such as invalid input or an unavailable dependency.
- **Programmer error** — A bug in the code, such as accessing a property of undefined.
- **Error code** — A stable, machine-readable identifier for a kind of error.
- **Error cause** — The lower-level error that led to another error, kept for diagnosis.
- **Error translation** — Converting a technical error from a library into an error meaningful to the application.
- **Boundary error handler** — The single place where errors are converted into responses and recorded.
- **Error tracking** — A service that collects, groups and reports application errors with their context.
- **Transient failure** — A failure likely to succeed if the operation is tried again later.
- **Permanent failure** — A failure that will recur if the same operation is retried.
- **Timeout** — The maximum time a program waits for an operation before giving up.
- **Retry** — Performing a failed operation again.
- **Exponential backoff** — Increasing the wait between retries by a growing factor, usually doubling.
- **Jitter** — Randomness added to retry delays so that many clients do not retry at the same moment.
- **Thundering herd** — A surge of simultaneous requests, such as synchronised retries, that overwhelms a service.
- **Retry amplification** — The multiplication of load when several layers each retry a failing operation.
- **Retry budget** — A limit on retries as a fraction of total traffic, preventing retries from overwhelming a system.
- **Circuit breaker** — A component that stops calls to a failing dependency for a period and fails fast instead.
- **Half-open state** — The circuit-breaker state in which a limited trial call is allowed to test whether a dependency has recovered.
- **Fallback** — An alternative result used when the primary operation fails.
- **Graceful degradation** — Continuing to provide reduced functionality when parts of a system fail.
- **Bulkhead** — Isolating resources such as connection pools so that one failing component cannot exhaust resources needed by others.
- **Dead-letter queue** — A queue where messages that repeatedly fail processing are moved for inspection.
- **Promise.allSettled** — A function that waits for all promises and reports each result, whether fulfilled or rejected.

## What comes next

Errors are only useful if someone can see them. The next chapter, {{ch:logging}}, covers how servers record what happens: structured logs, log levels, request and trace ids, what to log and what never to log, log collection and search, and how logs fit together with metrics and traces to make production systems observable.
