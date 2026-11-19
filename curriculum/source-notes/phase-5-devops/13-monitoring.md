# Phase 5 — Chapter 13: Monitoring

---

## Chapter Overview

Monitoring is how you know your production system is healthy — before users report problems. Modern observability is built on three pillars: Metrics (numerical measurements over time), Logs (event records), and Traces (distributed request flows). This chapter covers the full monitoring stack.

**Topics:**
- The three pillars: metrics, logs, traces
- Structured logging with Winston/Pino
- Application metrics (custom + built-in)
- Health check endpoints
- Alerting principles
- AWS CloudWatch integration
- Error tracking with Sentry

---

## Beginner Theory

### The Three Pillars of Observability

```
Metrics:  Numerical measurements aggregated over time
          CPU%, memory, request rate (req/s), error rate, latency p50/p95/p99
          Stored as time series. Query with PromQL (Prometheus).
          Use for: dashboards, alerting, capacity planning

Logs:     Event records with timestamp, level, message, and structured context
          {timestamp, level, message, traceId, userId, duration, statusCode}
          Stored in log aggregation system (CloudWatch, Elasticsearch).
          Use for: debugging, audit trail, compliance

Traces:   Record of a request as it flows through distributed systems
          trace_id: 550e8400 spans: [gateway 2ms] → [api 45ms] → [db 12ms]
          Use for: finding latency bottlenecks across services

Tools:
  Metrics:  Prometheus + Grafana (open source), Datadog, CloudWatch
  Logs:     ELK Stack (Elastic), CloudWatch Logs, Loki + Grafana
  Traces:   Jaeger, Zipkin, AWS X-Ray, Datadog APM, OpenTelemetry
```

---

## Basic Examples

### Structured Logging with Pino

```typescript
// lib/logger.ts
import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL || "info",

  // Production: JSON output (machine-readable)
  // Development: pretty output (human-readable)
  transport: process.env.NODE_ENV === "development"
    ? { target: "pino-pretty", options: { colorize: true, translateTime: "SYS:standard" } }
    : undefined,

  // Base fields on every log entry
  base: {
    service: process.env.SERVICE_NAME || "myapp",
    version: process.env.APP_VERSION  || "unknown",
    env:     process.env.NODE_ENV     || "development"
  },

  // Redact sensitive fields
  redact: {
    paths: ["req.headers.authorization", "*.password", "*.token", "*.creditCard"],
    censor: "[REDACTED]"
  },

  serializers: {
    req:  pino.stdSerializers.req,
    res:  pino.stdSerializers.res,
    err:  pino.stdSerializers.err
  }
});

// Express middleware
import { v4 as uuidv4 } from "uuid";

export function requestLogger() {
  return (req, res, next) => {
    const traceId  = req.headers["x-trace-id"] || uuidv4();
    const start    = Date.now();

    // Attach trace ID to request and response
    req.traceId = traceId;
    res.setHeader("X-Trace-ID", traceId);

    // Attach child logger with request context
    req.log = logger.child({ traceId, path: req.path, method: req.method });
    req.log.info("request started");

    res.on("finish", () => {
      const duration = Date.now() - start;
      req.log.info({
        statusCode: res.statusCode,
        duration,
        contentLength: res.getHeader("content-length")
      }, "request completed");
    });

    next();
  };
}

// Usage in routes
router.post("/orders", async (req, res) => {
  req.log.info({ userId: req.user.id }, "creating order");

  try {
    const order = await orderService.create(req.body, req.user.id);
    req.log.info({ orderId: order.id, total: order.total }, "order created");
    res.json(order);
  } catch (err) {
    req.log.error({ err }, "failed to create order");
    throw err;
  }
});
```

### Health Check Endpoint

```typescript
// routes/health.ts
import { Router }   from "express";
import { prisma }   from "@/lib/prisma";
import { redis }    from "@/lib/redis";
import os           from "os";

const router = Router();

// Basic health check (fast — for load balancer health checks)
router.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Detailed health check (for monitoring dashboards)
router.get("/health/detailed", async (_req, res) => {
  const checks: Record<string, { status: "ok" | "error"; message?: string; latency?: number }> = {};

  // Database check
  const dbStart = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = { status: "ok", latency: Date.now() - dbStart };
  } catch (err: any) {
    checks.database = { status: "error", message: err.message };
  }

  // Redis check
  const redisStart = Date.now();
  try {
    await redis.ping();
    checks.redis = { status: "ok", latency: Date.now() - redisStart };
  } catch (err: any) {
    checks.redis = { status: "error", message: err.message };
  }

  // System metrics
  const uptime  = process.uptime();
  const memUsed = process.memoryUsage();
  const loadAvg = os.loadavg();

  const allOk = Object.values(checks).every(c => c.status === "ok");

  res.status(allOk ? 200 : 503).json({
    status:  allOk ? "ok" : "degraded",
    checks,
    system: {
      uptime:         Math.floor(uptime),
      memoryMB:       Math.round(memUsed.heapUsed / 1024 / 1024),
      memoryTotalMB:  Math.round(memUsed.heapTotal / 1024 / 1024),
      cpuLoad1m:      loadAvg[0].toFixed(2),
      nodeVersion:    process.version
    },
    timestamp: new Date().toISOString()
  });
});

export default router;
```

---

## Intermediate Concepts

### Application Metrics with Prometheus

```typescript
// lib/metrics.ts — expose Prometheus metrics
import promClient from "prom-client";

// Enable default metrics (CPU, memory, event loop, etc.)
promClient.collectDefaultMetrics({ prefix: "myapp_" });

// Custom metrics
export const httpRequestDuration = new promClient.Histogram({
  name:    "myapp_http_request_duration_seconds",
  help:    "HTTP request duration in seconds",
  labelNames: ["method", "route", "status"],
  buckets: [0.001, 0.005, 0.015, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5]
});

export const httpRequestTotal = new promClient.Counter({
  name:       "myapp_http_requests_total",
  help:       "Total HTTP requests",
  labelNames: ["method", "route", "status"]
});

export const activeConnections = new promClient.Gauge({
  name: "myapp_active_connections",
  help: "Number of active connections"
});

export const orderCreated = new promClient.Counter({
  name:       "myapp_orders_created_total",
  help:       "Total orders created",
  labelNames: ["payment_method", "status"]
});

export const jobQueueSize = new promClient.Gauge({
  name:       "myapp_job_queue_size",
  help:       "Number of pending jobs",
  labelNames: ["queue"]
});

// Express middleware for automatic metrics
export function metricsMiddleware() {
  return (req, res, next) => {
    const start = process.hrtime.bigint();

    res.on("finish", () => {
      const route  = req.route?.path ?? req.path;
      const labels = { method: req.method, route, status: res.statusCode.toString() };
      const duration = Number(process.hrtime.bigint() - start) / 1e9;

      httpRequestDuration.observe(labels, duration);
      httpRequestTotal.inc(labels);
    });

    next();
  };
}

// Metrics endpoint (scrape target for Prometheus)
// GET /metrics — returns Prometheus text format
router.get("/metrics", async (req, res) => {
  // Optionally protect this endpoint
  if (req.headers.authorization !== `Bearer ${process.env.METRICS_SECRET}`) {
    return res.status(401).end();
  }
  res.set("Content-Type", promClient.register.contentType);
  res.send(await promClient.register.metrics());
});

// Business metric tracking
export async function trackOrderCreated(paymentMethod: string, status: string) {
  orderCreated.inc({ payment_method: paymentMethod, status });
}
```

### Error Tracking with Sentry

```typescript
// lib/sentry.ts
import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";

Sentry.init({
  dsn:         process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  release:     process.env.APP_VERSION,

  integrations: [
    nodeProfilingIntegration()
  ],

  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,  // 10% in prod
  profilesSampleRate: 0.1,

  // Don't send sensitive data
  beforeSend(event) {
    if (event.request?.headers?.authorization) {
      delete event.request.headers.authorization;
    }
    return event;
  }
});

// In Express app (after routes):
// Sentry.setupExpressErrorHandler(app);

// Set user context when available
export function setSentryUser(userId: string, email: string) {
  Sentry.setUser({ id: userId, email });
}

// Capture error with context
export function captureError(err: Error, context?: Record<string, unknown>) {
  Sentry.captureException(err, { extra: context });
}

// Manual span for performance tracing
export async function withSpan<T>(name: string, fn: () => Promise<T>): Promise<T> {
  return Sentry.startSpan({ name }, fn);
}
```

### AWS CloudWatch Integration

For applications running on AWS (EC2, ECS, Lambda), CloudWatch is often the path of least resistance for both logs and metrics — it's already wired into the platform without standing up your own Prometheus/Grafana stack.

```typescript
// lib/cloudwatch.ts — sending custom application metrics to CloudWatch
import { CloudWatchClient, PutMetricDataCommand } from "@aws-sdk/client-cloudwatch";

const cloudwatch = new CloudWatchClient({ region: "us-east-1" });

export async function recordMetric(name: string, value: number, unit: "Count" | "Milliseconds" = "Count") {
  await cloudwatch.send(new PutMetricDataCommand({
    Namespace: "MyApp/Production",
    MetricData: [{
      MetricName: name,
      Value: value,
      Unit: unit,
      Timestamp: new Date(),
      Dimensions: [{ Name: "Environment", Value: process.env.NODE_ENV || "production" }]
    }]
  }));
}

// Usage — track a business event as a CloudWatch metric
await recordMetric("OrdersCreated", 1);
await recordMetric("OrderProcessingTime", durationMs, "Milliseconds");
```

```typescript
// Sending structured logs to CloudWatch Logs — on ECS/EC2, the simplest
// approach is just writing JSON to stdout; the CloudWatch Logs agent
// (or ECS awslogs driver) ships it automatically — no SDK code needed.
console.log(JSON.stringify({
  timestamp: new Date().toISOString(),
  level: "info",
  message: "order created",
  orderId: order.id,
  userId: order.userId
}));
```

```hcl
# Terraform: CloudWatch alarm on a custom metric
resource "aws_cloudwatch_metric_alarm" "high_error_rate" {
  alarm_name          = "myapp-high-error-rate"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "5xxErrorRate"
  namespace           = "MyApp/Production"
  period              = 60
  statistic           = "Average"
  threshold           = 5
  alarm_actions       = [aws_sns_topic.alerts.arn]
}

# CloudWatch Logs Insights query (run from console or CLI) — same job as
# a PromQL query, but over log data instead of metrics
# fields @timestamp, level, message, orderId
# | filter level = "error"
# | sort @timestamp desc
# | limit 50
```

The trade-off versus Prometheus: CloudWatch requires zero infrastructure to run, but custom metric API calls cost money per data point, and CloudWatch's query language (Logs Insights) is less powerful than PromQL for complex aggregations. Many AWS-native teams use CloudWatch for logs and basic alarms, while still running Prometheus/Grafana for detailed application dashboards.

---

## Interview Preparation

**Q1: What is the difference between the three pillars of observability?**
A: Metrics (what is happening): numerical measurements over time, aggregated. CPU%, request rate, error rate, p95 latency. Cheap to store, queryable for trends, perfect for dashboards and alerting. Logs (what happened): discrete events with context. Each request, each error, each state change. More storage-intensive but essential for debugging specific incidents. Traces (how it happened): follow a request across multiple services. A trace shows that user request A went through: load balancer (2ms) → API service (45ms) → auth service (8ms) → database (35ms). Essential for finding latency bottlenecks in distributed systems. You need all three: metrics tell you something is wrong, logs tell you what's wrong, traces tell you where.

**Q2: What is structured logging and why is it better than plain text logging?**
A: Plain text: `"2025-01-15 09:00:00 ERROR Failed to process order for user 123 order 456"`. Hard to search programmatically, no consistent format. Structured logging (JSON): `{"timestamp":"2025-01-15T09:00:00Z","level":"error","message":"order processing failed","userId":"123","orderId":"456","errorCode":"PAYMENT_FAILED"}`. Benefits: easily searchable and filterable in log aggregators (CloudWatch Insights: `filter userId = "123"`), consistent fields enable metrics derivation from logs, fields can be indexed separately, correlation via traceId lets you link all logs from a single request. Use Pino or Winston for structured logging; always include traceId and userId where available.

**Q3: What alerting strategy prevents alert fatigue?**
A: Alert fatigue occurs when too many low-priority alerts cause engineers to ignore them — leading to missed critical alerts. Principles: alert on symptoms, not causes (alert on "error rate > 5%" not "CPU > 80%" — CPU high doesn't always mean users are affected). Use burn rate alerts (SLO-based) instead of threshold alerts — alert when you're burning through your error budget at a rate that will exhaust it within hours. Have three severity levels: Critical (wake up on-call — real user impact NOW), Warning (investigate soon — leading indicator), Info (log only). Keep a low number of Critical alerts. Review alert quality regularly — if an alert never fires or always fires and is ignored, remove or tune it.

---

## Practical Tasks

### Beginner (10 Tasks)
1. Add Pino structured logging to a Node.js app.
2. Log request method, path, status code, and duration.
3. Add a `/health` endpoint that returns `{"status":"ok"}`.
4. Add trace ID to every log entry and response header.
5. Redact sensitive fields (password, token) from logs.
6. Set up different log levels (DEBUG in dev, INFO in production).
7. Add error logging with stack trace.
8. Configure log output to stdout (for container log collection).
9. Add the Sentry SDK and report unhandled exceptions.
10. Set user context in Sentry after login.

### Intermediate (10 Tasks)
1. Build a detailed `/health/detailed` endpoint checking DB and Redis.
2. Add Prometheus client and expose `/metrics` endpoint.
3. Track HTTP request duration with a Histogram.
4. Add a business metric counter (orders created, users registered).
5. Add a Gauge for active WebSocket connections.
6. Add child logger per request with traceId.
7. Set up CloudWatch log group and stream for the app.
8. Create a CloudWatch alarm for error rate > 5%.
9. Add structured error logging with `captureError` context.
10. Implement health check for ALB with start period for startup time.

### Advanced (10 Tasks)
1. Set up full observability stack: Prometheus + Grafana + Loki + Tempo.
2. Build a Grafana dashboard with key SLI panels.
3. Implement SLO error budget tracking.
4. Set up OpenTelemetry for distributed tracing.
5. Correlate logs, metrics, and traces via traceId.
6. Implement structured alerting with Alertmanager + PagerDuty.
7. Build an on-call runbook per alert.
8. Implement CPU profiling with Sentry Profiling.
9. Monitor memory leaks with heap snapshot analysis.
10. Achieve zero alert fatigue: audit all alerts, remove noise.

---

## Self Assessment
1. What are the three pillars of observability?
2. What is structured logging?
3. What is a trace ID?
4. What is a health check endpoint?
5. What is Prometheus used for?
6. What is the difference between Counter, Gauge, and Histogram?
7. What is Sentry?
8. What is alert fatigue?
9. What is an SLO?
10. What should a good `/health` endpoint check?

---

## Cheat Sheet

```typescript
// Pino logger
import pino from "pino";
const logger = pino({ level: "info", redact: ["*.password"] });
logger.info({ userId, action: "login" }, "user logged in");
logger.error({ err, traceId }, "request failed");
const childLog = logger.child({ traceId: req.traceId });

// Prometheus
import promClient from "prom-client";
promClient.collectDefaultMetrics();
const counter   = new promClient.Counter({ name: "requests_total", help: "...", labelNames: ["method"] });
const gauge     = new promClient.Gauge({ name: "active_conns", help: "..." });
const histogram = new promClient.Histogram({ name: "duration_seconds", help: "...", buckets: [0.1, 0.5, 1, 5] });
counter.inc({ method: "GET" });
gauge.set(activeCount);
histogram.observe({ route: "/api/users" }, 0.42);
router.get("/metrics", async (req, res) => { res.set("Content-Type", promClient.register.contentType); res.send(await promClient.register.metrics()); });

// Health check
router.get("/health", async (req, res) => {
  const db = await prisma.$queryRaw`SELECT 1`.then(() => "ok").catch(() => "error");
  const all = db === "ok";
  res.status(all ? 200 : 503).json({ status: all ? "ok" : "degraded", checks: { db } });
});

// Sentry
import * as Sentry from "@sentry/node";
Sentry.init({ dsn: process.env.SENTRY_DSN, environment: "production", tracesSampleRate: 0.1 });
Sentry.captureException(err);
Sentry.setUser({ id: userId });
```
