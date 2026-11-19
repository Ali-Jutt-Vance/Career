# Phase 2 — Chapter 12: Logging

> *"Logs are the black box recorder of your application. When something goes wrong at 3am, they're what you have."*

---

## Chapter Overview

### Why Logging Matters

`console.log` is not logging. It's the difference between a paper trail and a sticky note.

Professional logging gives you:
- **Observability**: see what your system is doing at any moment
- **Debugging**: trace the path of a request through your system
- **Alerting**: detect anomalies and failures automatically
- **Auditing**: know who did what, when
- **Performance**: measure where time is spent

Bad logging costs companies millions: too verbose (drowns real signals, high storage costs), too sparse (blind spots in failures), wrong format (hard to query), logs PII (compliance violations).

### Logging vs. Monitoring vs. Tracing

```
Logging:    Record events with context (what happened)
Monitoring: Track metrics over time (how many times, how fast)
Tracing:    Follow a request across multiple services (where did time go)
```

These three together form **observability**. This chapter covers logging. Monitoring (Prometheus) and tracing (OpenTelemetry) are in the DevOps phase.

---

## Beginner Theory

### Log Levels

```
FATAL:   Application is about to crash. Notify on-call immediately.
ERROR:   Something went wrong that needs attention. (Operational: warn, bug: error)
WARN:    Something unexpected but non-fatal. May indicate a problem.
INFO:    Normal application lifecycle events. (Startup, request received, job done)
DEBUG:   Detailed information for debugging. Disable in production.
TRACE:   Very detailed — function calls, loop iterations. Never in production.

Production level: INFO (see operational events, errors, warnings)
Development level: DEBUG (see more detail while developing)
```

### Logging Libraries (Node.js)

```
console.log:
  No levels, no formatting, no transports
  JSON loses context (no timestamp, level, service name)
  Never use in production

Winston:
  Most popular, highly configurable
  Multiple transports (file, console, HTTP, CloudWatch)
  Custom formats (JSON, pretty-print)
  Log rotation with winston-daily-rotate-file

Pino:
  5-10x faster than Winston (designed for low overhead)
  Structured JSON by default
  Works great with Fastify
  Recommended for high-throughput APIs

Bunyan:
  Structured JSON, older but stable
  Built-in serializers

Morgan:
  HTTP request logger middleware for Express
  Works alongside Winston/Pino (not a replacement)
```

---

## Basic Examples

### Winston Setup

```javascript
// npm install winston winston-daily-rotate-file

// utils/logger.js
const winston = require("winston");
const DailyRotateFile = require("winston-daily-rotate-file");
const path = require("path");

const { combine, timestamp, json, errors, colorize, simple, printf } = winston.format;

const isDev = process.env.NODE_ENV === "development";

// Custom format for development console
const devFormat = combine(
  colorize(),
  timestamp({ format: "HH:mm:ss.SSS" }),
  errors({ stack: true }),
  printf(({ level, message, timestamp, stack, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
    return `${timestamp} ${level}: ${message}${metaStr}${stack ? `\n${stack}` : ""}`;
  })
);

// JSON format for production (machine-readable for Elasticsearch, Datadog)
const prodFormat = combine(
  timestamp(),
  errors({ stack: true }),   // include stack trace in 'stack' field
  json()
);

const logger = winston.createLogger({
  level:      process.env.LOG_LEVEL || (isDev ? "debug" : "info"),
  defaultMeta: {
    service:     "user-service",    // every log includes service name
    environment: process.env.NODE_ENV,
    version:     process.env.npm_package_version
  },
  format: isDev ? devFormat : prodFormat,
  transports: [
    // Console (always on)
    new winston.transports.Console(),

    // Files (production only)
    ...(isDev ? [] : [
      new DailyRotateFile({
        filename:       path.join("logs", "app-%DATE%.log"),
        datePattern:    "YYYY-MM-DD",
        maxFiles:       "14d",     // keep 14 days
        maxSize:        "50m",     // rotate at 50MB
        level:          "info"
      }),
      new DailyRotateFile({
        filename:       path.join("logs", "error-%DATE%.log"),
        datePattern:    "YYYY-MM-DD",
        maxFiles:       "30d",
        maxSize:        "20m",
        level:          "error"
      })
    ])
  ],
  // Prevent logger itself from crashing the app
  exitOnError: false
});

// Stream interface for Morgan
logger.stream = {
  write: (message) => logger.http(message.trim())
};

module.exports = logger;
```

### Pino Setup (High Performance)

```javascript
// npm install pino pino-pretty

// utils/logger.js
const pino = require("pino");

const logger = pino({
  level:      process.env.LOG_LEVEL || "info",
  base: {
    service:     "user-service",
    environment: process.env.NODE_ENV
  },
  timestamp: pino.stdTimeFunctions.isoTime,

  // Redact sensitive fields from all logs
  redact: {
    paths:   ["req.headers.authorization", "body.password", "body.token", "*.creditCard"],
    censor:  "[REDACTED]"
  },

  // Development: pretty print
  ...(process.env.NODE_ENV === "development" && {
    transport: {
      target: "pino-pretty",
      options: { colorize: true, translateTime: "SYS:HH:MM:ss.l", ignore: "pid,hostname" }
    }
  })
});

module.exports = logger;
```

### HTTP Request Logging with Morgan + Winston

```javascript
// npm install morgan

const morgan = require("morgan");
const logger = require("./utils/logger");

// Custom Morgan format with request ID
morgan.token("request-id", (req) => req.requestId || "unknown");
morgan.token("user-id",    (req) => req.user?.id || "anonymous");

const morganFormat = isDev
  ? "dev"
  : ":request-id :user-id :method :url :status :res[content-length] - :response-time ms";

app.use(morgan(morganFormat, { stream: logger.stream }));

// Or with structured JSON logging (skip Morgan, use custom middleware)
app.use((req, res, next) => {
  const start = Date.now();

  res.on("finish", () => {
    logger.info({
      type:      "http_request",
      requestId: req.requestId,
      method:    req.method,
      path:      req.path,
      query:     req.query,
      status:    res.statusCode,
      duration:  Date.now() - start,
      userId:    req.user?.id,
      ip:        req.ip,
      userAgent: req.headers["user-agent"],
      bytes:     res.get("Content-Length") ?? 0
    });
  });

  next();
});
```

---

## Intermediate Concepts

### Structured Logging (JSON)

```javascript
// Structured logging = key-value pairs in JSON
// Machine-readable → queryable in Kibana, CloudWatch, Datadog

// BAD — unstructured (string concatenation)
logger.info(`User ${userId} purchased product ${productId} for $${amount}`);
// How do you query "all purchases over $100"? String parsing! Brittle.

// GOOD — structured
logger.info("purchase_completed", {
  userId,
  productId,
  amount,
  currency: "USD",
  orderId
});
// Query: { type: "purchase_completed", amount: { $gt: 100 } }

// Context propagation — add consistent fields to all logs in a request
app.use((req, res, next) => {
  // Create a child logger with request context
  req.log = logger.child({
    requestId: req.requestId,
    method:    req.method,
    path:      req.path,
    userId:    req.user?.id
  });
  next();
});

// In controllers/services — use req.log for request-scoped logging
router.post("/orders", asyncHandler(async (req, res) => {
  req.log.info("Creating order", { items: req.body.items.length });

  const order = await orderService.create(req.body, { logger: req.log });

  req.log.info("Order created", { orderId: order.id, total: order.total });
  res.status(201).json(order);
}));
```

### Log Levels in Practice

```javascript
// When to use each level

// FATAL — application cannot continue, crash imminent
logger.fatal("Database connection pool exhausted — shutting down");
process.exit(1);

// ERROR — something failed that needs investigation
logger.error("Payment processing failed", {
  orderId:   order.id,
  userId:    user.id,
  error:     err.message,
  provider:  "stripe"
});
// Rule: every ERROR should have an alert in your monitoring system

// WARN — something unexpected but the request is still being served
logger.warn("Slow database query detected", {
  duration: 2340,
  query:    "SELECT * FROM orders WHERE userId = ?",
  threshold: 1000
});
logger.warn("Redis cache miss rate high", { missRate: 0.45 });

// INFO — important business events (startup, user actions, job completion)
logger.info("Server started", { port: 3000, environment: "production" });
logger.info("User registered", { userId: user.id, via: "email" });
logger.info("Job completed", { jobId, duration: "4.2s", records: 1205 });
logger.info("Order placed", { orderId: order.id, amount: order.total });

// DEBUG — development and troubleshooting detail
logger.debug("Cache lookup", { key: cacheKey, hit: false });
logger.debug("User permissions check", { userId, resource, permission, result: "allowed" });

// TRACE — very granular (never production)
logger.trace("Database query", { sql, params, duration: "3ms" });
```

### Correlation IDs for Distributed Tracing

```javascript
// Every request gets a unique ID that follows it across services
const { v4: uuidv4 } = require("uuid");
const { AsyncLocalStorage } = require("async_hooks");

// Create context storage (follows async calls automatically)
const asyncLocalStorage = new AsyncLocalStorage();

// Middleware: start new context for each request
app.use((req, res, next) => {
  const requestId = req.headers["x-request-id"] || uuidv4();
  const traceId   = req.headers["x-trace-id"] || uuidv4();

  res.setHeader("X-Request-ID", requestId);

  // Store in async context — available in all async calls downstream
  asyncLocalStorage.run({ requestId, traceId, userId: null }, next);
});

// Auth middleware adds userId to context
app.use(authenticate, (req, res, next) => {
  const store = asyncLocalStorage.getStore();
  if (store) store.userId = req.user?.id;
  next();
});

// Logger that automatically includes request context
const contextLogger = {
  log(level, message, meta = {}) {
    const ctx = asyncLocalStorage.getStore() || {};
    logger[level](message, { ...ctx, ...meta });
  },
  info:  (msg, meta) => contextLogger.log("info",  msg, meta),
  warn:  (msg, meta) => contextLogger.log("warn",  msg, meta),
  error: (msg, meta) => contextLogger.log("error", msg, meta),
  debug: (msg, meta) => contextLogger.log("debug", msg, meta)
};

// Any code using contextLogger automatically gets request context in logs
// Even deeply nested service calls — no need to pass req everywhere!

// When calling other services, forward the trace ID
async function callOrdersService(data) {
  const { traceId } = asyncLocalStorage.getStore() || {};
  return axios.post("https://orders-service/api/orders", data, {
    headers: { "x-trace-id": traceId }
  });
}
```

### Audit Logging

```javascript
// Separate audit log for compliance (who did what, when)
// Never delete, never modify
// GDPR: 90 days retention minimum in financial contexts

const auditLogger = winston.createLogger({
  level:      "info",
  defaultMeta: { type: "audit" },
  format:     combine(timestamp(), json()),
  transports: [
    new winston.transports.File({ filename: "logs/audit.log" }),
    // Also write to tamper-proof storage (S3, CloudWatch, SIEM)
  ]
});

function auditLog(action, { actor, resource, resourceId, before, after, meta } = {}) {
  auditLogger.info({
    action,     // "user.create", "order.update", "file.delete"
    actorId:    actor?.id,
    actorEmail: actor?.email,
    actorRole:  actor?.role,
    resource,   // "User", "Order", "File"
    resourceId,
    changes: before && after ? diffObjects(before, after) : undefined,
    meta,       // additional context
    ip:         actor?.ip,
    userAgent:  actor?.userAgent
  });
}

// Usage in service
async function updateUser(id, dto, actor) {
  const before = await userRepo.findById(id);
  const updated = await userRepo.update(id, dto);

  auditLog("user.update", {
    actor,
    resource: "User",
    resourceId: id,
    before: sanitize(before),  // remove password hash before logging
    after:  sanitize(updated)
  });

  return updated;
}
```

---

## Advanced Concepts

### Log Aggregation and ELK Stack

```
┌──────────┐   ┌──────────┐   ┌──────────┐
│ App Logs │   │ App Logs │   │ App Logs │   (multiple instances)
│ (JSON)   │   │ (JSON)   │   │ (JSON)   │
└────┬─────┘   └────┬─────┘   └────┬─────┘
     │               │               │
     └───────────────▼───────────────┘
                     │
             ┌───────▼───────┐
             │   Filebeat /   │   (log shipper — reads files, ships to ES)
             │   Fluentd     │
             └───────┬───────┘
                     │
             ┌───────▼───────┐
             │ Elasticsearch │   (stores and indexes logs)
             └───────┬───────┘
                     │
             ┌───────▼───────┐
             │    Kibana     │   (query and visualize logs)
             └───────────────┘

Cloud alternatives:
  - AWS CloudWatch Logs → CloudWatch Insights
  - GCP → Cloud Logging (formerly Stackdriver)
  - Azure → Azure Monitor
  - Datadog / Splunk / Papertrail (SaaS)
```

### Log Sampling for High Traffic

```javascript
// At 100K req/sec, logging every request → 600 GB/day (too expensive)
// Solution: sample logs at high volume

class SampledLogger {
  constructor(baseLogger, sampleRate = 0.01) {  // 1% by default
    this.base       = baseLogger;
    this.sampleRate = sampleRate;
  }

  http(req, res, duration) {
    // Always log errors and slow requests
    if (res.statusCode >= 400 || duration > 2000) {
      this.base.info("http_request", { req, res, duration, sampled: false });
      return;
    }

    // Sample normal requests
    if (Math.random() < this.sampleRate) {
      this.base.info("http_request", { req, res, duration, sampled: true });
    }
  }
}
```

---

## Security

```javascript
// WHAT NEVER TO LOG:
// ✗ Passwords (including hashed)
// ✗ Tokens (access tokens, refresh tokens, API keys)
// ✗ Credit card numbers, CVVs
// ✗ SSNs, government IDs
// ✗ Private keys, certificates
// ✗ Full request bodies containing the above

// Automated PII redaction
const SENSITIVE_KEYS = ["password", "token", "secret", "authorization",
                         "creditCard", "cardNumber", "ssn", "privateKey"];

function redactSensitive(obj, depth = 0) {
  if (depth > 10) return "[DEEP_OBJECT]";  // prevent infinite recursion
  if (typeof obj !== "object" || obj === null) return obj;

  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => {
      if (SENSITIVE_KEYS.some(s => k.toLowerCase().includes(s))) {
        return [k, "[REDACTED]"];
      }
      return [k, typeof v === "object" ? redactSensitive(v, depth + 1) : v];
    })
  );
}

// Configure Pino redaction (more performant than manual)
const logger = pino({
  redact: {
    paths: ["req.headers.authorization", "*.password", "*.token", "body.*.card"],
    censor: "[REDACTED]"
  }
});
```

---

## Interview Preparation

**Q1: What is structured logging? Why is it better than string messages?**
A: Structured logging records log events as key-value pairs (JSON objects) instead of formatted strings. Benefits: (1) machine-readable — query logs in Elasticsearch without string parsing; (2) consistent fields — every log has timestamp, level, service, requestId; (3) searchable — `level:error AND service:user-service AND userId:123`; (4) aggregatable — count errors by type, measure average duration. String logs are fragile — field formats change, extraction requires brittle regex.

**Q2: What is the difference between error and warn log levels?**
A: `error` indicates something failed that requires human attention — an external service is down, a payment failed, a critical operation failed unexpectedly. Every `error` should have a corresponding alert. `warn` indicates something unusual that's not causing a failure yet — a slow query, a cache miss rate spike, a deprecated API usage. Warnings are informational about potential problems; errors signal actual problems.

**Q3: What is a correlation ID? Why is it important in microservices?**
A: A correlation ID (request ID or trace ID) is a unique identifier generated at the beginning of a request, included in all log entries and forwarded to downstream services in HTTP headers. In microservices, a single user action may touch 5 services — without a correlation ID, you can't connect log entries across services to trace a single request's journey. With it, you search logs by `traceId: "abc-123"` and see the complete picture across all services.

**Q4: What should an HTTP request log entry contain?**
A: method, URL/path, status code, response time (ms), request size, response size, user ID (if authenticated), IP address, user agent, request ID, and trace ID. In production, don't log request bodies (may contain PII or secrets). Log query parameters but redact sensitive ones. This gives you everything needed to debug performance issues, security incidents, and user complaints.

**Q5: How do you prevent logging sensitive data?**
A: Define a list of sensitive field names (password, token, authorization, creditCard, ssn). Use your logger's built-in redaction (Pino has `redact: { paths: [...], censor: "[REDACTED]" }`). Never log raw `req.body` — redact it first. In error handlers, sanitize the error object before logging. Use automated scanning in CI to detect accidental sensitive data in log fixtures.

---

## Practical Tasks

### Beginner (10 Tasks)
1. Set up Winston with console and file transports, JSON format for production.
2. Add Morgan HTTP request logging that writes to Winston's stream.
3. Create log levels: info for business events, warn for slow queries, error for failures.
4. Add request ID to every log entry using middleware.
5. Implement daily log rotation with 14-day retention.
6. Redact sensitive fields (password, token) from all log entries.
7. Add structured context to logs: service name, version, environment.
8. Create a child logger per request with request ID baked in.
9. Log application startup: port, environment, Node version, startup time.
10. Log graceful shutdown events with reason (SIGTERM, SIGINT).

### Intermediate (10 Tasks)
1. Set up Pino for high-performance structured logging with pino-pretty for dev.
2. Implement AsyncLocalStorage for automatic request context in all logs.
3. Create a separate audit logger for user action tracking.
4. Ship logs to CloudWatch Logs using the `winston-cloudwatch` transport.
5. Build a log query tool that searches structured JSON logs by field.
6. Implement log sampling: log 1% of successful requests, 100% of errors.
7. Add correlation ID propagation: include X-Request-ID in all outgoing HTTP calls.
8. Write a log sanitization utility that recursively removes PII from log objects.
9. Set up log-based alerting: alert when error rate > 1% over 5 minutes.
10. Benchmark Winston vs Pino on 100K requests — measure impact on throughput.

### Advanced (10 Tasks)
1. Set up ELK stack locally (Elasticsearch + Logstash + Kibana) and ship app logs.
2. Build a Kibana dashboard showing: error rate, request rate, p50/p95/p99 latency.
3. Implement distributed tracing with OpenTelemetry (spans across 3 services).
4. Build a log anomaly detector that alerts on unusual error patterns.
5. Implement GDPR-compliant log retention: auto-delete PII after 90 days.
6. Add dynamic log level control (change log level without restarting the app).
7. Build a developer log viewer UI (SSE stream of real-time filtered logs).
8. Implement log-based SLI: calculate availability from error logs.
9. Add log integrity: hash chain to detect tampered audit logs.
10. Build a log cost optimizer: analyze log volume by level and source, suggest reductions.

---

## Mini Project

**Structured Logging System**: Build a logging framework for a Node.js API:
- Winston with dev/prod config
- Request logging middleware with structured JSON
- Request ID + trace ID propagation
- Audit logging for user actions
- Sensitive data redaction
- Daily log rotation
- CloudWatch Logs transport (local mock for dev)
- Log query CLI tool

---

## Self Assessment
1. What are the 6 standard log levels? Describe when to use each.
2. What is structured logging? How does it differ from printf-style logging?
3. What is a correlation/request ID? How does it help debug distributed systems?
4. What is the Morgan library used for? How does it relate to Winston?
5. What is log rotation? Why is it important?
6. What data should NEVER appear in logs?
7. How does `AsyncLocalStorage` help with context propagation?
8. What is audit logging? How does it differ from application logging?
9. What is log sampling? When would you use it?
10. What is a Winston transport?
11. What is the ELK stack?
12. What is Pino? How does it compare to Winston?
13. What log level should HTTP request logging use?
14. Why should you use `logger.child()` for request-scoped logging?
15. What is log shipping? Name two tools that do it.

---

## Cheat Sheet

### Winston Quick Setup
```javascript
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  defaultMeta: { service: "myapp" },
  format: combine(timestamp(), errors({ stack: true }), json()),
  transports: [
    new winston.transports.Console(),
    new DailyRotateFile({ filename: "logs/app-%DATE%.log", maxFiles: "14d" })
  ]
});
```

### Log Levels
```
fatal > error > warn > info > debug > trace
Production: info  |  Development: debug
Alert on:   error+fatal
```

### What to Log
```
INFO:  server start, user registration, order placed, job done
WARN:  slow query (>1s), high error rate, deprecated API, cache miss spike
ERROR: payment failed, external service down, unhandled exception
NEVER: passwords, tokens, credit cards, PII
```

### Request Context (AsyncLocalStorage)
```javascript
const store = asyncLocalStorage.getStore();
logger.info("event", { ...store, additionalField: value });
```

### Sensitive Field Redaction (Pino)
```javascript
redact: { paths: ["*.password", "req.headers.authorization"], censor: "[REDACTED]" }
```
