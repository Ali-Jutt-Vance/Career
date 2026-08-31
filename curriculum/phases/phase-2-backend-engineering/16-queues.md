# Phase 2 — Chapter 16: Queues & Background Jobs

---

## Chapter Overview

Queues decouple work from HTTP request handling. Instead of processing heavy work synchronously, you push a job to a queue and return a response immediately — a worker processes it in the background.

**When to use queues:**
- Sending emails, SMS, push notifications
- Image/video processing
- PDF generation
- Third-party API calls that can fail
- Webhook delivery
- Data export (CSV, Excel)
- Any work that takes > 100ms

**Queue benefits:**
- Responsive API (requests return immediately)
- Retry logic for transient failures
- Rate limiting (process N jobs/second)
- Priority queues (urgent tasks first)
- Observability (job history, failure tracking)

---

## Beginner Theory

### Queue Architecture

```
Producer (API)           Queue (Redis)           Consumer (Worker)
──────────────           ─────────────           ─────────────────
POST /orders    →   [job1, job2, job3]   →   Worker: processJob(job)
  ↓ 201 Created        (waiting)
(immediate)                                    retries on failure
                                               dead letter on exhausted
```

### Libraries

```
BullMQ (recommended):
  Built on Redis, feature-rich, TypeScript-native
  Retries, priorities, rate limiting, job groups
  Bull Board UI for monitoring

Bull (predecessor to BullMQ):
  Older, still widely used

Bee-Queue:
  Simpler, faster, fewer features

RabbitMQ (via amqplib):
  Dedicated message broker, more complex, enterprise features
  Better for inter-service communication

AWS SQS / Google Pub/Sub:
  Managed cloud queues, no infrastructure to maintain
```

---

## Basic Examples

### BullMQ Setup

```javascript
// npm install bullmq ioredis

const { Queue, Worker, QueueEvents } = require("bullmq");

const connection = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  password: process.env.REDIS_PASSWORD
};

// ─── QUEUES ───────────────────────────────────────────────────────────────────
const emailQueue   = new Queue("emails",   { connection });
const imageQueue   = new Queue("images",   { connection });
const reportQueue  = new Queue("reports",  { connection });
const webhookQueue = new Queue("webhooks", { connection });

// ─── PRODUCERS (in your API/service code) ────────────────────────────────────
// Add a job to the email queue
await emailQueue.add("send-welcome", {
  userId: user.id,
  email:  user.email,
  name:   user.name
}, {
  attempts:  3,
  backoff:   { type: "exponential", delay: 5000 },  // 5s, 10s, 20s
  removeOnComplete: { count: 1000, age: 24 * 3600 }, // keep last 1000 completed
  removeOnFail:     { count: 5000 }
});

// Add with priority (higher number = higher priority)
await emailQueue.add("send-otp", data, { priority: 10 });
await emailQueue.add("send-newsletter", data, { priority: 1 });

// Add with delay (run after 5 minutes)
await emailQueue.add("follow-up-email", data, { delay: 5 * 60 * 1000 });

// ─── WORKERS ──────────────────────────────────────────────────────────────────
const emailWorker = new Worker("emails", async (job) => {
  const { name, data } = job;

  // Report progress during processing
  await job.updateProgress(10);

  switch (name) {
    case "send-welcome":
      await sendWelcomeEmail(data.email, data.name);
      break;
    case "send-otp":
      await sendOTPEmail(data.email, data.code);
      break;
    default:
      throw new Error(`Unknown job type: ${name}`);
  }

  await job.updateProgress(100);
  return { sentAt: new Date().toISOString() };  // job result stored in Redis

}, {
  connection,
  concurrency: 10,                   // process 10 jobs simultaneously
  limiter: { max: 100, duration: 1000 }  // max 100 jobs/second
});

// ─── EVENT HANDLING ───────────────────────────────────────────────────────────
emailWorker.on("completed", (job, result) => {
  logger.info(`Email job completed`, { jobId: job.id, name: job.name, result });
});

emailWorker.on("failed", (job, err) => {
  logger.error(`Email job failed`, {
    jobId:    job.id,
    name:     job.name,
    attempt:  job.attemptsMade,
    error:    err.message
  });
});

// ─── QUEUE EVENTS (cross-process event tracking) ─────────────────────────────
const queueEvents = new QueueEvents("emails", { connection });
queueEvents.on("completed", ({ jobId, returnvalue }) => { ... });
queueEvents.on("failed", ({ jobId, failedReason }) => { ... });
```

### Dead Letter Queue

```javascript
// Jobs that exhaust all retries go to a dead letter queue

const emailDLQ = new Queue("emails-dead-letter", { connection });

emailWorker.on("failed", async (job, err) => {
  if (job.attemptsMade >= job.opts.attempts) {
    // Move to dead letter queue for manual inspection
    await emailDLQ.add("failed-job", {
      originalJob:     { name: job.name, data: job.data },
      failedAt:        new Date().toISOString(),
      error:           err.message,
      stack:           err.stack,
      attemptsMade:    job.attemptsMade
    });

    // Alert operations team
    await alerting.send(`Email job permanently failed: ${job.name}`, {
      jobId:  job.id,
      userId: job.data.userId
    });
  }
});

// Process dead letter queue manually
const dlqWorker = new Worker("emails-dead-letter", async (job) => {
  // Manual review and possible re-processing
  logger.error("DLQ job", job.data);
}, { connection, concurrency: 1 });
```

---

## Intermediate Concepts

### Job Flows (Parent/Child)

```javascript
const { FlowProducer } = require("bullmq");
const flowProducer = new FlowProducer({ connection });

// Parent job waits for all children to complete
const flow = await flowProducer.add({
  name: "generate-report",
  queueName: "reports",
  data: { reportId: "r-123" },
  children: [
    { name: "fetch-sales-data",    queueName: "data-fetching", data: { type: "sales" } },
    { name: "fetch-user-data",     queueName: "data-fetching", data: { type: "users" } },
    { name: "fetch-revenue-data",  queueName: "data-fetching", data: { type: "revenue" } }
  ]
});

// Parent only runs after ALL children complete
// Use case: aggregate results from parallel data fetching
```

### Job Groups / Rate Limiting Per Entity

```javascript
// Limit how many jobs run for the same entity simultaneously
// E.g., max 2 concurrent jobs per user

const { QueueEvents } = require("bullmq");

await emailQueue.add("send-email", data, {
  jobId:   `user:${userId}:${crypto.randomUUID()}`,  // unique per job
  group:   { id: `user:${userId}`, concurrency: 2 }  // BullMQ Pro feature
});
```

### Monitoring with Bull Board

```javascript
// npm install @bull-board/express @bull-board/api

const { createBullBoard }         = require("@bull-board/api");
const { BullMQAdapter }           = require("@bull-board/api/bullMQAdapter");
const { ExpressAdapter }          = require("@bull-board/express");

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath("/admin/queues");

createBullBoard({
  queues: [
    new BullMQAdapter(emailQueue),
    new BullMQAdapter(imageQueue),
    new BullMQAdapter(reportQueue)
  ],
  serverAdapter
});

// Mount on your Express app (protected by admin auth)
app.use("/admin/queues", requireRole("admin"), serverAdapter.getRouter());
// Visit http://localhost:3000/admin/queues for a visual dashboard
```

### RabbitMQ (for Inter-Service Communication)

```javascript
// npm install amqplib

const amqp = require("amqplib");

class RabbitMQClient {
  #channel = null;
  #connection = null;

  async connect() {
    this.#connection = await amqp.connect(process.env.RABBITMQ_URL);
    this.#channel    = await this.#connection.createChannel();
    await this.#channel.assertExchange("events", "topic", { durable: true });
  }

  async publish(routingKey, message) {
    const content = Buffer.from(JSON.stringify(message));
    this.#channel.publish("events", routingKey, content, {
      persistent:   true,         // survives broker restart
      contentType:  "application/json"
    });
  }

  async subscribe(pattern, queueName, handler) {
    await this.#channel.assertQueue(queueName, { durable: true });
    await this.#channel.bindQueue(queueName, "events", pattern);
    this.#channel.prefetch(10);   // process 10 messages at once

    await this.#channel.consume(queueName, async (msg) => {
      if (!msg) return;
      try {
        const data = JSON.parse(msg.content.toString());
        await handler(data);
        this.#channel.ack(msg);     // acknowledge success
      } catch (err) {
        logger.error("RabbitMQ handler error", { error: err.message });
        this.#channel.nack(msg, false, false);  // dead-letter the message
      }
    });
  }
}

const mq = new RabbitMQClient();
await mq.connect();

// Orders service: publish
await mq.publish("order.placed",  { orderId: "123", userId: "456" });
await mq.publish("order.shipped", { orderId: "123" });

// Notification service: subscribe
await mq.subscribe("order.*", "notification-service.orders", async (data) => {
  await notificationService.send(data);
});
```

### AWS SQS

```javascript
// npm install @aws-sdk/client-sqs

const { SQSClient, SendMessageCommand, ReceiveMessageCommand,
        DeleteMessageCommand } = require("@aws-sdk/client-sqs");

const sqs = new SQSClient({ region: "us-east-1" });
const QUEUE_URL = process.env.SQS_QUEUE_URL;

// Send message
await sqs.send(new SendMessageCommand({
  QueueUrl:     QUEUE_URL,
  MessageBody:  JSON.stringify({ type: "send-email", data: { email, name } }),
  DelaySeconds: 0,
  MessageAttributes: {
    jobType: { DataType: "String", StringValue: "email" }
  }
}));

// Receive and process (polling loop)
async function processMessages() {
  while (true) {
    const result = await sqs.send(new ReceiveMessageCommand({
      QueueUrl:            QUEUE_URL,
      MaxNumberOfMessages: 10,
      WaitTimeSeconds:     20,  // long polling
      VisibilityTimeout:   60   // 60s to process before reappearing
    }));

    if (!result.Messages?.length) continue;

    await Promise.allSettled(
      result.Messages.map(async (msg) => {
        try {
          const body = JSON.parse(msg.Body);
          await processJob(body);

          // Delete after successful processing
          await sqs.send(new DeleteMessageCommand({
            QueueUrl:      QUEUE_URL,
            ReceiptHandle: msg.ReceiptHandle
          }));
        } catch (err) {
          logger.error("SQS processing error", { error: err.message, messageId: msg.MessageId });
          // Don't delete — message will reappear after VisibilityTimeout
          // After maxReceiveCount, SQS moves to Dead Letter Queue
        }
      })
    );
  }
}
```

---

## Advanced Concepts

### Worker Process Architecture

```javascript
// Separate processes for different job types
// Run as separate Node.js processes or Docker containers

// workers/email-worker.js
const { Worker } = require("bullmq");

const worker = new Worker("emails", emailProcessor, {
  connection: redisConfig,
  concurrency: parseInt(process.env.CONCURRENCY || "10")
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  await worker.close();
  process.exit(0);
});

process.on("SIGINT", async () => {
  await worker.close();
  process.exit(0);
});

logger.info(`Email worker started (concurrency: ${worker.opts.concurrency})`);
```

---

## Interview Preparation

**Q1: Why use a queue instead of processing work synchronously in a request handler?**
A: Synchronous processing blocks the HTTP response until work completes. A slow operation (send email, process image, call external API) degrades user experience and wastes server threads. If the operation fails, the user request fails. Queues decouple the user action from the work: the request succeeds immediately (202 Accepted), the work happens asynchronously, and failures are retried automatically. The API stays responsive under load.

**Q2: What is the difference between BullMQ and RabbitMQ?**
A: BullMQ is a job queue built on Redis — best for background processing within a single application or microservice. It excels at retries, scheduling, rate limiting, and job history. RabbitMQ is a dedicated message broker — best for inter-service event messaging with complex routing (topic exchanges, fanout). RabbitMQ supports multiple consumers per queue and complex routing patterns; BullMQ is simpler and self-contained (just needs Redis).

**Q3: What is a dead letter queue?**
A: A dead letter queue (DLQ) is where jobs/messages go after they've exhausted all retries. Instead of losing permanently failed jobs, they're moved to the DLQ for manual inspection, alerting, or re-processing. DLQs prevent "silent loss" of work and give operations teams visibility into what failed and why.

**Q4: What is job idempotency and why does it matter?**
A: An idempotent job produces the same result whether it runs once or multiple times. Critical for queue processing because workers can fail mid-job and retry, running the job twice. If the job sends an email, a non-idempotent retry sends it twice. Solution: check before acting ("was this email already sent?"), use unique job IDs in external systems, or use database transactions to prevent duplicate state changes.

---

## Practical Tasks

### Beginner (10 Tasks)
1. Set up BullMQ with Redis and create an email queue.
2. Add a job to the queue from a POST route and return 202 Accepted.
3. Create a worker that processes jobs from the email queue.
4. Add retry logic: 3 attempts with exponential backoff.
5. Log job start, completion, and failure events.
6. Set up Bull Board to visually monitor queue status.
7. Test failure: throw in a worker and verify retry behavior.
8. Add job progress reporting with `job.updateProgress()`.
9. Add a delay: schedule an email 10 minutes after registration.
10. Implement a simple rate limiter (max 10 jobs/second).

### Intermediate (10 Tasks)
1. Build a dead letter queue with alerting on permanently failed jobs.
2. Implement job flows (parent job waits for children).
3. Build a separate worker process for image processing.
4. Add graceful shutdown in worker (finish current job before exit).
5. Implement priority queues (OTP = priority 10, newsletter = priority 1).
6. Set up RabbitMQ and publish/subscribe across two services.
7. Implement job idempotency with a unique job ID per operation.
8. Build an SQS consumer with long polling and visibility timeout.
9. Build a queue health check endpoint (queue depth, failed count).
10. Test concurrent worker behavior under load (10 workers, 1000 jobs).

### Advanced (10 Tasks)
1. Build a distributed tracing system across queue producers and workers.
2. Implement auto-scaling workers based on queue depth.
3. Build a multi-tenant job isolation system (tenant A's jobs don't affect tenant B's).
4. Implement at-exactly-once delivery using idempotency keys.
5. Build a job router that dispatches to different queues based on job type.
6. Implement back-pressure: pause producers when queue exceeds threshold.
7. Build a replay system: re-process all jobs from a specific time range.
8. Implement job encryption: encrypt sensitive job data in Redis.
9. Build a real-time job progress WebSocket (stream updates to clients).
10. Design and build a fully observable queue system (metrics, logs, traces).

---

## Self Assessment
1. What is a message queue? What problems does it solve?
2. What is BullMQ built on?
3. What is a dead letter queue?
4. What is job idempotency?
5. What is exponential backoff in retry logic?
6. What is the difference between concurrency and rate limiting in BullMQ?
7. How do you gracefully shut down a worker?
8. What is a job flow (parent/child) used for?
9. What is the difference between BullMQ and RabbitMQ?
10. What does 202 Accepted mean in the context of queued work?

---

## Cheat Sheet

### BullMQ Quick Reference
```javascript
// Producer
const q = new Queue("jobs", { connection });
await q.add("job-name", data, { attempts: 3, backoff: { type: "exponential", delay: 5000 }, delay: 0, priority: 1 });

// Worker
const w = new Worker("jobs", async (job) => {
  // process job.data
  return result;
}, { connection, concurrency: 10 });

w.on("completed", (job, result) => { ... });
w.on("failed",    (job, err)    => { ... });

// Graceful shutdown
process.on("SIGTERM", async () => { await w.close(); process.exit(0); });
```

### Job Options
```javascript
{
  attempts:         3,
  backoff:          { type: "exponential", delay: 5000 },
  delay:            60_000,           // delay in ms
  priority:         10,               // higher = sooner
  removeOnComplete: { count: 1000 },
  removeOnFail:     { count: 5000 },
  jobId:            "unique-id"       // idempotency
}
```
