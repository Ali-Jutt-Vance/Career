# Phase 2 — Chapter 11: Error Handling

> *"Errors are not exceptions — they are the normal part of any non-trivial system. Handle them explicitly."*

---

## Chapter Overview

### Why Error Handling Is Critical

Poor error handling is the difference between a production outage and a graceful degradation. Bad error handling means:
- Users see raw stack traces (security vulnerability — reveals internals)
- Errors swallowed silently — bugs invisible for weeks
- No useful logs to debug production issues
- Cascading failures — one failing service crashes others

Professional error handling means:
- **Operational errors** (expected): network timeout, not found, invalid input → handled gracefully
- **Programming errors** (bugs): null pointer, unhandled rejection → detected, logged, alerted
- Consistent error format for all clients
- Logs that enable debugging without sensitive data
- Graceful degradation — fallbacks when possible

---

## Beginner Theory

### Types of Errors

```
OPERATIONAL ERRORS (expected, predictable):
  - Database record not found
  - Input validation failure
  - Authentication failure
  - External service unavailable
  - Rate limit exceeded
  - Disk full
  → Handle explicitly, return appropriate HTTP status

PROGRAMMER ERRORS (bugs — should not happen):
  - TypeError: Cannot read property of undefined
  - RangeError: Maximum call stack exceeded
  - Unhandled promise rejection
  - Failed assertions
  → Crash fast, log with full context, alert on-call

The golden rule:
  Operational errors: catch and recover
  Programmer errors: fail fast and loud
```

### HTTP Error Codes and When to Use Them

```
400 Bad Request          — invalid input, malformed request
401 Unauthorized         — not authenticated (login required)
403 Forbidden            — authenticated but not authorized
404 Not Found            — resource doesn't exist
405 Method Not Allowed   — wrong HTTP method
408 Request Timeout      — client too slow
409 Conflict             — state conflict (duplicate, version mismatch)
410 Gone                 — permanently deleted
422 Unprocessable        — valid syntax but business rule violation
423 Locked               — resource is locked
424 Failed Dependency    — upstream failure
429 Too Many Requests    — rate limit
500 Internal Server Error — unexpected server error
502 Bad Gateway          — upstream returned invalid response
503 Service Unavailable  — server down (maintenance, overloaded)
504 Gateway Timeout      — upstream timed out
```

---

## Basic Examples

### Custom Error Classes

```javascript
// errors/AppError.js
class AppError extends Error {
  constructor(message, statusCode = 500, code = "INTERNAL_ERROR") {
    super(message);
    this.name      = this.constructor.name;
    this.statusCode = statusCode;
    this.code      = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, fields = []) {
    super(message, 400, "VALIDATION_ERROR");
    this.fields = fields;
  }
}

class NotFoundError extends AppError {
  constructor(resource, identifier) {
    super(`${resource} not found`, 404, "NOT_FOUND");
    this.resource   = resource;
    this.identifier = identifier;
  }
}

class ConflictError extends AppError {
  constructor(message) {
    super(message, 409, "CONFLICT");
  }
}

class UnauthorizedError extends AppError {
  constructor(message = "Authentication required") {
    super(message, 401, "UNAUTHORIZED");
  }
}

class ForbiddenError extends AppError {
  constructor(message = "Access denied") {
    super(message, 403, "FORBIDDEN");
  }
}

class TooManyRequestsError extends AppError {
  constructor(retryAfterSeconds) {
    super("Rate limit exceeded", 429, "RATE_LIMIT_EXCEEDED");
    this.retryAfter = retryAfterSeconds;
  }
}

class ServiceUnavailableError extends AppError {
  constructor(service) {
    super(`${service} is temporarily unavailable`, 503, "SERVICE_UNAVAILABLE");
    this.service = service;
  }
}

module.exports = {
  AppError, ValidationError, NotFoundError, ConflictError,
  UnauthorizedError, ForbiddenError, TooManyRequestsError, ServiceUnavailableError
};
```

### Express Global Error Handler

```javascript
// middleware/error-handler.js
const { AppError } = require("../errors/AppError");
const logger = require("../utils/logger");

function errorHandler(err, req, res, next) {
  // Log all errors with context
  const logContext = {
    requestId: req.requestId,
    method:    req.method,
    path:      req.path,
    userId:    req.user?.id,
    ip:        req.ip,
    error: {
      name:    err.name,
      message: err.message,
      stack:   err.stack,
      code:    err.code
    }
  };

  if (err.isOperational) {
    // Known operational error — log at warn level
    logger.warn("Operational error", logContext);
  } else {
    // Unknown error — this is a bug — log at error level + alert
    logger.error("Unexpected error", logContext);
    // In production: alert on-call via PagerDuty, Opsgenie, etc.
  }

  // Don't send a response if one was already started
  if (res.headersSent) return next(err);

  const statusCode = err.statusCode || 500;
  const isProduction = process.env.NODE_ENV === "production";

  const body = {
    error: {
      code:    err.code || "INTERNAL_ERROR",
      message: err.isOperational
        ? err.message
        : "An unexpected error occurred",
      requestId: req.requestId
    }
  };

  // Include extra detail for operational errors
  if (err.fields)     body.error.fields     = err.fields;
  if (err.retryAfter) body.error.retryAfter = err.retryAfter;

  // Include stack trace in non-production environments
  if (!isProduction) {
    body.error.stack = err.stack;
  }

  res.status(statusCode).json(body);
}

module.exports = errorHandler;
```

### Async Handler Wrapper

```javascript
// utils/async-handler.js
// Eliminates try/catch boilerplate from every async route handler

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;

// Usage — no try/catch needed in route handlers
const { NotFoundError } = require("../errors/AppError");

router.get("/:id", asyncHandler(async (req, res) => {
  const user = await userService.findById(req.params.id);
  if (!user) throw new NotFoundError("User", req.params.id);
  res.json(user);
}));

// The error is automatically passed to next(err)
// → Express calls the error handler middleware
```

---

## Intermediate Concepts

### Unhandled Rejections and Exceptions

```javascript
// In your main entry point (index.js / server.js)

// Catch synchronous uncaught exceptions
process.on("uncaughtException", (err) => {
  logger.error("UNCAUGHT EXCEPTION", {
    name:    err.name,
    message: err.message,
    stack:   err.stack
  });

  // Don't try to recover from uncaught exceptions
  // The process state is unknown — shut down and let the process manager restart it
  process.exit(1);
});

// Catch unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  logger.error("UNHANDLED REJECTION", {
    reason:  reason instanceof Error ? reason.message : reason,
    stack:   reason instanceof Error ? reason.stack : undefined,
    promise: String(promise)
  });

  // In Node.js 15+, this exits the process by default
  // In older versions, you must exit manually:
  process.exit(1);
});

// Graceful shutdown on SIGTERM (container/PM2 stop)
process.on("SIGTERM", async () => {
  logger.info("SIGTERM received — shutting down gracefully");

  // Stop accepting new connections
  server.close(async () => {
    try {
      // Wait for in-flight requests to complete
      await db.disconnect();
      await redisClient.quit();
      logger.info("Server shut down successfully");
      process.exit(0);
    } catch (err) {
      logger.error("Error during graceful shutdown", { err });
      process.exit(1);
    }
  });

  // Force shutdown after timeout
  setTimeout(() => {
    logger.error("Forcing shutdown after timeout");
    process.exit(1);
  }, 30_000);  // 30 seconds
});
```

### Error Boundaries (Service Layer)

```javascript
// Wrap external service calls to transform vendor errors into domain errors

class UserRepository {
  async findById(id) {
    try {
      return await db.users.findByPk(id);
    } catch (err) {
      if (err.name === "SequelizeConnectionError") {
        throw new ServiceUnavailableError("Database");
      }
      throw err;  // Unknown errors: re-throw for the error handler
    }
  }

  async create(data) {
    try {
      return await db.users.create(data);
    } catch (err) {
      if (err.name === "SequelizeUniqueConstraintError") {
        const field = err.errors[0]?.path;
        throw new ConflictError(`${field} already exists`);
      }
      if (err.name === "SequelizeValidationError") {
        const fields = err.errors.map(e => ({ field: e.path, message: e.message }));
        throw new ValidationError("Database validation failed", fields);
      }
      throw err;
    }
  }
}

// External API error boundary
async function callExternalService(data) {
  try {
    const response = await axios.post("https://api.external.com/endpoint", data, {
      timeout: 5000
    });
    return response.data;
  } catch (err) {
    if (err.code === "ECONNREFUSED" || err.code === "ETIMEDOUT") {
      throw new ServiceUnavailableError("External API");
    }
    if (err.response?.status === 429) {
      throw new TooManyRequestsError(60);
    }
    if (err.response?.status >= 400 && err.response?.status < 500) {
      throw new ValidationError("External service rejected request");
    }
    throw new ServiceUnavailableError("External API");
  }
}
```

### Circuit Breaker Pattern

```javascript
// Prevent cascading failures when a service is down
// npm install opossum

const CircuitBreaker = require("opossum");

function callPaymentService(paymentData) {
  return axios.post("https://payments.example.com/charge", paymentData, { timeout: 3000 });
}

const paymentBreaker = new CircuitBreaker(callPaymentService, {
  timeout:              3000,  // timeout after 3s
  errorThresholdPercentage: 50,  // open after 50% errors in 10s window
  resetTimeout:         30_000,  // try again after 30s (half-open state)
  volumeThreshold:      5       // need at least 5 calls before opening
});

paymentBreaker.on("open",     () => logger.warn("Payment circuit OPEN"));
paymentBreaker.on("halfOpen", () => logger.info("Payment circuit HALF-OPEN"));
paymentBreaker.on("close",    () => logger.info("Payment circuit CLOSED"));
paymentBreaker.on("fallback", (result) => logger.info("Payment fallback used"));

// Define fallback for when circuit is open
paymentBreaker.fallback((data, err) => ({
  success: false,
  error: "Payment service temporarily unavailable. Please try again.",
  retryAfter: 30
}));

// Use in route handler
async function processPayment(req, res) {
  const result = await paymentBreaker.fire(req.body);

  if (!result.success) {
    return res.status(503).json({
      error: result.error,
      retryAfter: result.retryAfter
    });
  }

  res.json({ charged: result.chargeId });
}
```

### Retry Logic with Exponential Backoff

```javascript
async function withRetry(fn, options = {}) {
  const {
    maxAttempts  = 3,
    baseDelay    = 1000,
    maxDelay     = 30_000,
    backoffFactor = 2,
    shouldRetry  = (err) => err.code === "ECONNRESET" || err.status === 503
  } = options;

  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;

      if (attempt === maxAttempts || !shouldRetry(err)) {
        throw err;
      }

      const delay = Math.min(
        baseDelay * backoffFactor ** (attempt - 1) + Math.random() * 1000,  // jitter
        maxDelay
      );

      logger.warn(`Attempt ${attempt}/${maxAttempts} failed, retrying in ${delay}ms`, {
        error: err.message,
        nextAttempt: attempt + 1
      });

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

// Usage
const result = await withRetry(
  () => callExternalAPI(data),
  { maxAttempts: 3, baseDelay: 500 }
);
```

---

## Advanced Concepts

### Structured Error Logging

```javascript
// Use correlation IDs for distributed tracing
const { v4: uuidv4 } = require("uuid");

// Assign request ID on every request
app.use((req, res, next) => {
  req.requestId = req.headers["x-request-id"] || uuidv4();
  res.setHeader("X-Request-ID", req.requestId);
  next();
});

// Error format for Kibana/CloudWatch/Datadog
const errorLog = {
  level:      "error",
  timestamp:  new Date().toISOString(),
  requestId:  req.requestId,
  traceId:    req.headers["x-trace-id"],
  service:    "user-service",
  environment: process.env.NODE_ENV,
  error: {
    name:       err.name,
    message:    err.message,
    code:       err.code,
    stack:      err.stack,
    isOperational: err.isOperational ?? false
  },
  request: {
    method:  req.method,
    path:    req.path,
    ip:      req.ip,
    userId:  req.user?.id
  }
};

logger.error(JSON.stringify(errorLog));
```

### Error Monitoring (Sentry)

```javascript
// npm install @sentry/node

const Sentry = require("@sentry/node");

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,  // 10% of requests traced
  beforeSend: (event) => {
    // Remove PII before sending
    if (event.user?.email) delete event.user.email;
    return event;
  }
});

// Express request handler (must be before routes)
app.use(Sentry.Handlers.requestHandler());

// Express error handler (must be before your error handler)
app.use(Sentry.Handlers.errorHandler({
  shouldHandleError: (err) => !err.isOperational  // only report bugs, not operational errors
}));

// Custom error capture with context
Sentry.captureException(err, {
  extra: {
    userId:    req.user?.id,
    requestId: req.requestId,
    body:      sanitizeBody(req.body)
  },
  tags: { service: "user-service" }
});
```

---

## Security

```javascript
// 1. Never expose internal error details to clients
// BAD:
res.status(500).json({ error: err.message, stack: err.stack });
// Could reveal: file paths, internal structure, dependencies, config values

// GOOD:
res.status(500).json({
  error: "An unexpected error occurred",
  requestId: req.requestId  // for support reference
});
// Log full details server-side, never return to client

// 2. Don't use generic error messages for operational errors
// BAD: res.status(401).json({ error: "An error occurred" })
// GOOD: res.status(401).json({ error: "Invalid token", code: "TOKEN_EXPIRED" })
// Be specific about operational errors (they help users fix issues)
// Be vague about programming errors (they prevent info leakage)

// 3. Error message consistency (prevent enumeration)
// BAD:
if (!user) res.json({ error: "Email not found" });
if (!match) res.json({ error: "Wrong password" });
// GOOD:
res.json({ error: "Invalid email or password" });  // same message either way

// 4. Log sanitization — never log secrets or PII
// Strip sensitive fields before logging
function sanitizeForLog(obj) {
  const SENSITIVE = ["password", "token", "secret", "creditCard", "ssn"];
  return JSON.parse(JSON.stringify(obj, (key, val) => {
    if (SENSITIVE.some(s => key.toLowerCase().includes(s))) return "[REDACTED]";
    return val;
  }));
}
```

---

## Interview Preparation

**Q1: What is the difference between operational and programmer errors?**
A: Operational errors are expected, predictable failures that occur even in correct code: network timeouts, record not found, rate limits exceeded, invalid user input. They should be caught and handled with appropriate responses. Programmer errors are bugs — TypeErrors, null dereferences, failed assertions — code that is incorrect. They should crash the process fast (so the process manager restarts it) and be alerted to the team. Never catch programmer errors silently.

**Q2: What happens if you don't handle a rejected Promise in Node.js?**
A: In Node.js v15+, unhandled rejections terminate the process with exit code 1. In older versions, they emit a warning but continue running (a ticking time bomb). Best practice: always handle rejections, add a global `process.on("unhandledRejection")` handler that logs and exits. Use async/await with try/catch or asyncHandler wrappers to ensure all promise rejections flow to error handlers.

**Q3: What is a circuit breaker? Why use it?**
A: A circuit breaker monitors calls to external services and "opens" (stops making calls) when too many fail. When open, it returns an immediate fallback response instead of waiting for timeouts — this prevents cascading failures where one slow service brings down your entire application. After a timeout, it tries one call (half-open state) — if successful, it closes. Like an electrical circuit breaker protecting your house from overload.

**Q4: How should you format error responses for APIs?**
A: Use a consistent error format with: (1) HTTP status code, (2) machine-readable error code (e.g., `VALIDATION_ERROR`), (3) human-readable message, (4) optional field-level details for validation errors, (5) requestId for support tracing. Never include stack traces or internal details in production error responses. Be specific for client errors (helps users fix issues), generic for server errors (prevents info leakage).

**Q5: Why should you have a global error handler in Express?**
A: Without a global error handler, unhandled errors in async routes will either crash the process, hang the request indefinitely, or send Express's default HTML error page (leaking stack traces). A global 4-parameter error handler `(err, req, res, next)` catches all errors passed via `next(err)`, providing a single place to format responses, log, and alert — without duplicating try/catch in every route.

---

## Practical Tasks

### Beginner (10 Tasks)
1. Create a hierarchy of custom error classes (AppError → NotFoundError, ValidationError, etc.).
2. Build a global error handler middleware that formats errors consistently.
3. Use asyncHandler to eliminate try/catch from 5 route handlers.
4. Add `process.on("unhandledRejection")` and `process.on("uncaughtException")`.
5. Return different response bodies for operational vs. programmer errors.
6. Add `X-Request-ID` header to all requests and include it in error responses.
7. Write a test that verifies the error format for each error class.
8. Handle database unique constraint errors by throwing ConflictError.
9. Add a 404 catch-all that returns consistent JSON.
10. Log all errors with structured JSON format (method, path, userId, error).

### Intermediate (10 Tasks)
1. Implement retry with exponential backoff for HTTP calls to external services.
2. Build a circuit breaker for an external service using opossum.
3. Transform ORm/database errors into domain errors at the repository layer.
4. Add Sentry error monitoring (only report non-operational errors).
5. Implement graceful shutdown that waits for in-flight requests before exiting.
6. Build error correlation: link errors to their causing request via traceId.
7. Implement dead letter queue for failed job retries.
8. Write integration tests that verify error responses for each error scenario.
9. Build a fallback chain: try primary service → fallback service → cached data.
10. Add alerting: send Slack notification on errors above a threshold rate.

### Advanced (10 Tasks)
1. Build distributed error tracing with OpenTelemetry (trace across 3 services).
2. Implement Bulkhead pattern to isolate resources between services.
3. Build a health check endpoint that aggregates health of all dependencies.
4. Implement error budgets: track error rate against SLA target.
5. Build a chaos engineering test that injects failures to test recovery.
6. Implement idempotent error recovery for financial transactions.
7. Add machine learning anomaly detection on error rate trends.
8. Build a developer dashboard showing error rates, types, and affected users.
9. Implement structured exception types with Zod validation for inter-service errors.
10. Build an automated runbook system triggered by specific error codes.

---

## Mini Project

**Error Handling Framework**: Build a reusable error handling package:
- AppError hierarchy with common error types
- asyncHandler wrapper
- Global error handler middleware
- Request ID middleware
- Structured error logging (JSON format, with PII sanitization)
- Sentry integration (optional, behind a flag)
- Retry utility with exponential backoff
- Circuit breaker wrapper
- Full test suite

---

## Self Assessment
1. What is the difference between operational and programmer errors?
2. What happens to an unhandled Promise rejection in Node.js v15+?
3. What is the signature of an Express error handler? Why 4 parameters?
4. What does `err.isOperational` indicate?
5. Why should programmer errors cause a process crash?
6. What is a circuit breaker? What are its three states?
7. What is exponential backoff? What is jitter and why add it?
8. What should a global error handler log? What should it NOT include in the response?
9. What is a request ID and how does it help debugging?
10. What is the difference between `next(err)` and throwing in Express?
11. What is `Error.captureStackTrace()` used for?
12. How should you transform database errors (e.g., unique constraint) in your domain?
13. What is `process.on("unhandledRejection")`? When should you use it?
14. What is the graceful shutdown pattern?
15. Why should you never log passwords or tokens even in error messages?

---

## Cheat Sheet

### Custom Errors
```javascript
class AppError extends Error {
  constructor(message, statusCode = 500, code = "INTERNAL_ERROR") {
    super(message);
    this.statusCode = statusCode;
    this.code       = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}
// Throw: throw new NotFoundError("User", id);
```

### Express Error Handler
```javascript
// MUST have 4 params — (err, req, res, next)
app.use((err, req, res, next) => {
  const status = err.statusCode || 500;
  logger.error({ err, requestId: req.requestId });
  res.status(status).json({
    error: {
      code:    err.code || "INTERNAL_ERROR",
      message: err.isOperational ? err.message : "Unexpected error"
    }
  });
});
```

### asyncHandler
```javascript
const asyncHandler = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
```

### Process Handlers
```javascript
process.on("uncaughtException",  (err) => { logger.error(err); process.exit(1); });
process.on("unhandledRejection", (err) => { logger.error(err); process.exit(1); });
process.on("SIGTERM", () => server.close(() => process.exit(0)));
```
