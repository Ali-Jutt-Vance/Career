# Queues and Background Jobs

> [!GOALS]
> - Explain why slow, unreliable or heavy work leaves the request and runs in the **background**.
> - Describe how a job queue works: producers, the queue, workers, acknowledgements and job states.
> - Configure **retries** with exponential backoff and jitter, tell retryable errors from permanent ones, and use **dead-letter queues**.
> - Understand delivery guarantees — **at-least-once** in practice — and make consumers **idempotent**.
> - Get jobs into the queue reliably with the **transactional outbox**.
> - Choose between Redis-based job queues (BullMQ), database queues, managed queues (SQS) and message brokers (RabbitMQ, Kafka).
> - Operate queues: concurrency, rate limits, priorities, scaling workers, graceful shutdown and monitoring.

## Why this matters

When a customer places an order at the Corner Shop, a lot should happen: charge the card, reserve stock, send a confirmation email, notify the warehouse, update analytics, maybe generate a PDF invoice. If the web request did all of that before responding, the customer would stare at a spinner for several seconds — and if the email provider were slow or the PDF service crashed, the whole order might fail even though the payment went through.

**Background jobs** solve this. The request does the essential part (validate, save the order, perhaps charge the card), puts the rest into a **queue**, and responds immediately. **Workers** — separate processes — take jobs from the queue and do them, retrying when something fails.

Queues appear in almost every production back end:

- sending email, SMS and push notifications ({{ch:email}});
- processing uploads: images, video, CSV imports ({{ch:file-uploads}});
- calling third-party APIs that are slow, rate-limited or unreliable;
- delivering webhooks to other companies' servers;
- generating reports and exports;
- the work fanned out by scheduled jobs ({{ch:cron-jobs}}).

Queues also introduce new problems: jobs that run twice, jobs that fail forever, queues that grow without limit, and work that disappears between the database and the queue. This chapter explains the model and the techniques that make background processing reliable.

## The simple idea

Think of a busy restaurant. The waiter takes your order, writes it on a ticket, puts the ticket on the kitchen rail, and moves on to the next table. The waiter does not stand in the kitchen while your meal cooks. Cooks take tickets from the rail, in order, and prepare them. If there are many tickets, the restaurant adds cooks. If a dish is ruined, the cook makes it again.

- The **waiter** is your web server (the **producer**).
- The **rail of tickets** is the **queue**.
- The **cooks** are the **workers** (consumers).

> [!ANALOGY]
> A job queue is like the ticket rail in a restaurant kitchen: waiters (web servers) put tickets (jobs) on the rail and return to customers immediately; cooks (workers) take tickets and prepare them, and more cooks can be added when it gets busy.
>
> **Where the analogy breaks:** in a kitchen, a cook who takes a ticket either finishes the dish or obviously drops it. In software, a worker can crash silently half-way through a job, and the queue cannot tell whether the work was done. So the queue gives the job to another worker — and the job may run **twice**. Designing for that is the main difference between a toy queue and a reliable one.

## The proper definition and key words

A **job queue** is a system that stores units of work (**jobs** or **messages**) produced by one part of an application until **workers** process them asynchronously, typically with support for retries, delays, priorities and monitoring.

Key words:

- **Producer** — the code that adds jobs to a queue (often a request handler).
- **Consumer / worker** — a process that takes jobs from a queue and performs them.
- **Job / message** — a unit of work, usually a small JSON payload such as `{ "orderId": "1042" }`.
- **Acknowledgement (ack)** — the worker's signal that a job is finished, so the queue can remove it. Without an ack, the queue eventually gives the job to someone else.
- **Visibility timeout / lock** — how long a job is hidden from other workers while one worker processes it.
- **Retry with backoff** — trying a failed job again after increasing delays.
- **Dead-letter queue (DLQ)** — where jobs go after failing permanently, for inspection.
- **At-least-once delivery** — every job is processed, but possibly more than once.
- **Idempotent consumer** — a worker that produces the same outcome when it processes the same job twice.
- **Backlog / queue depth** — the number of jobs waiting.
- **Concurrency** — how many jobs a worker processes at the same time.

## How queues work

### Level 1 — The shape

```text
  web server (producer)              queue                          workers (consumers)
  ─────────────────────        ─────────────────────          ──────────────────────────
  POST /orders                 waiting:  [j7, j8, j9]   ──▶   worker A: j5  (active)
    save order                 active:   [j5, j6]       ──▶   worker B: j6  (active)
    add job "order-placed" ──▶ delayed:  [j3 @ 10:05]
    respond 201                failed:   [j2]                  on success: ack → completed
                               completed: [j1, j4]              on error:   retry later or fail
```

A job moves through states: **waiting** → **active** (a worker has it) → **completed**, or back to **waiting/delayed** for a retry, or **failed** when retries run out. Delayed jobs wait until a given time ("send a reminder in three days").

The response tells the client what happened: `201 Created` if the main resource was created and follow-up work is queued; `202 Accepted` when the requested work itself is queued ("your export is being prepared"), usually with a URL to check its status ({{ch:rest-apis}}).

### Level 2 — A job queue in Node.js with BullMQ

**BullMQ** is the most widely used job queue for Node.js. It stores jobs in **Redis** ({{ch:redis}}):

```ts
// fragment
import { Queue, Worker, UnrecoverableError } from "bullmq";

const connection = { host: process.env.REDIS_HOST, port: 6379 };

// Producer side (in the API)
export const emailQueue = new Queue("emails", {
  connection,
  defaultJobOptions: {
    attempts: 5,                                          // first try + 4 retries
    backoff: { type: "exponential", delay: 10_000 },      // 10s, 20s, 40s, 80s
    removeOnComplete: { age: 24 * 3600, count: 10_000 },  // keep a day of history
    removeOnFail: { age: 7 * 24 * 3600 },                 // keep failures for a week
  },
});

await emailQueue.add("order-confirmation", { orderId: "1042" }, { jobId: "order-confirmation:1042" });

// Worker side (a separate process)
const worker = new Worker("emails", async (job) => {
  const order = await orders.find(job.data.orderId);
  if (!order) throw new UnrecoverableError(`order ${job.data.orderId} does not exist`);  // no point retrying
  await mailer.sendOrderConfirmation(order, { idempotencyKey: job.id });
  return { sentTo: order.customerId };
}, { connection, concurrency: 10 });

worker.on("failed", (job, err) => logger.warn({ jobId: job?.id, attempt: job?.attemptsMade, err }, "job failed"));
```

- **Jobs carry ids, not objects.** `{ orderId }` rather than the whole order: the worker loads fresh data, payloads stay small, and personal data is not copied into Redis.
- **`jobId`** gives the job a deterministic id. BullMQ ignores an `add` with an id that already exists, which stops the same confirmation being queued twice.
- **`attempts` and `backoff`** define retries. `UnrecoverableError` marks a failure that should **not** be retried.
- **`concurrency: 10`** lets one worker process run ten jobs at once — appropriate for jobs that mostly wait on I/O such as network calls ({{ch:nodejs}}).
- **Workers run in separate processes** (or containers), so heavy jobs never slow down web requests, and the two can be scaled separately.

### Level 3 — Retries, backoff and jitter

Many failures are **temporary**: a timeout, a rate limit, a service restarting. Retrying immediately usually fails again and adds load to a struggling service. **Exponential backoff** waits longer after each failure, up to a cap:

```ts
function backoffMs(attempt: number, baseMs = 1_000, capMs = 60_000): number {
  return Math.min(capMs, baseMs * 2 ** (attempt - 1));    // 1s, 2s, 4s, 8s ... up to the cap
}

function withFullJitter(delayMs: number, random: () => number = Math.random): number {
  return Math.floor(random() * delayMs);                    // anywhere between 0 and the delay
}

for (let attempt = 1; attempt <= 8; attempt++) {
  const delay = backoffMs(attempt);
  console.log(`retry ${attempt}: up to ${delay / 1000}s`);
}
console.log("jittered retry 4 with random() = 0.37:", withFullJitter(backoffMs(4), () => 0.37), "ms");
```

**Output:**

```text
retry 1: up to 1s
retry 2: up to 2s
retry 3: up to 4s
retry 4: up to 8s
retry 5: up to 16s
retry 6: up to 32s
retry 7: up to 60s
retry 8: up to 60s
jittered retry 4 with random() = 0.37: 2960 ms
```

- The delay doubles each time but never exceeds the cap (here 60 seconds).
- **Jitter** randomises the delay. Without it, when a service fails, thousands of jobs that failed at the same moment all retry at the same moment — a "thundering herd" that knocks it over again. "Full jitter" picks a random time between zero and the backoff delay. The example passes a fixed `random` function so its output is reproducible.

Not every error deserves a retry:

| Error | Retry? |
|---|---|
| Timeout, connection reset, `503`, `429` (respect `Retry-After`) | Yes, with backoff |
| `400` validation error from an API, invalid email address, missing record | **No** — it will fail every time |
| Bug in your code (a `TypeError`) | Retrying will not help; fix and replay from the DLQ |

### Level 3 — Dead-letter queues

When a job fails permanently — a non-retryable error, or retries exhausted — it must not vanish. It goes to a **dead-letter queue** (or, in BullMQ, stays in the **failed** set), where people can see it, fix the cause and **replay** it. Here is the whole cycle on a simulated clock:

```ts
// A miniature job queue with retries, backoff and a dead-letter queue, on a simulated clock
class PermanentError extends Error {}

type Job = { id: string; data: { to: string }; attempts: number; runAt: number };

const MAX_ATTEMPTS = 4;
let clock = 0;                                     // simulated seconds
const waiting: Job[] = [];
const deadLetter: { job: Job; reason: string }[] = [];
const failuresSoFar = new Map<string, number>();

function enqueue(id: string, to: string) {
  waiting.push({ id, data: { to }, attempts: 0, runAt: clock });
}

async function sendEmail(job: Job): Promise<void> {
  if (!job.data.to.includes("@")) throw new PermanentError("invalid address");
  if (job.data.to.endsWith("@flaky.example")) {
    const n = (failuresSoFar.get(job.id) ?? 0) + 1;
    failuresSoFar.set(job.id, n);
    if (n <= 2) throw new Error("provider timeout");  // fails twice, then works
  }
  if (job.data.to.endsWith("@down.example")) throw new Error("provider unavailable");
}

async function workUntilEmpty() {
  while (waiting.length > 0) {
    waiting.sort((a, b) => a.runAt - b.runAt);
    const job = waiting.shift()!;
    clock = Math.max(clock, job.runAt);
    job.attempts++;
    try {
      await sendEmail(job);
      console.log(`t=${clock}s ${job.id} done (attempt ${job.attempts})`);
    } catch (err) {
      const reason = (err as Error).message;
      if (err instanceof PermanentError || job.attempts >= MAX_ATTEMPTS) {
        deadLetter.push({ job, reason });
        console.log(`t=${clock}s ${job.id} → dead-letter queue (${reason}, attempt ${job.attempts})`);
      } else {
        const delay = 2 ** (job.attempts - 1) * 10;     // 10s, 20s, 40s
        job.runAt = clock + delay;
        waiting.push(job);
        console.log(`t=${clock}s ${job.id} failed (${reason}), retry in ${delay}s`);
      }
    }
  }
}

enqueue("job-1", "sara@example.com");
enqueue("job-2", "omar@flaky.example");
enqueue("job-3", "not-an-email");
enqueue("job-4", "li@down.example");
await workUntilEmpty();
console.log("dead letters:", deadLetter.map((d) => `${d.job.id}: ${d.reason}`));
```

**Output:**

```text
t=0s job-1 done (attempt 1)
t=0s job-2 failed (provider timeout), retry in 10s
t=0s job-3 → dead-letter queue (invalid address, attempt 1)
t=0s job-4 failed (provider unavailable), retry in 10s
t=10s job-2 failed (provider timeout), retry in 20s
t=10s job-4 failed (provider unavailable), retry in 20s
t=30s job-2 done (attempt 3)
t=30s job-4 failed (provider unavailable), retry in 40s
t=70s job-4 → dead-letter queue (provider unavailable, attempt 4)
dead letters: [ 'job-3: invalid address', 'job-4: provider unavailable' ]
```

- **job-1** succeeds at once.
- **job-2** hits two temporary failures and succeeds on its third attempt, after waiting 10 s and then 20 s — the user still gets their email.
- **job-3** has a permanent problem and goes straight to the dead-letter queue: retrying an invalid address four times would only waste time.
- **job-4** keeps failing; after four attempts over 70 seconds it is dead-lettered, so the queue is not blocked by it for ever.

In production, **alert** when jobs reach the DLQ, record the error and payload with them, and provide a way to replay them once the cause is fixed. In Amazon SQS, a **redrive policy** moves a message to a DLQ after a set number of receives (`maxReceiveCount`) and can redrive messages back later.

### Level 3 — At-least-once delivery and idempotent consumers

Consider a worker that charges a card, then crashes before acknowledging the job. The queue cannot know the charge happened; when the lock or visibility timeout expires, it gives the job to another worker. This is **at-least-once delivery**, and it is what practically every queue provides. ("Exactly-once" exists only in narrow forms, such as deduplication windows or transactions within one system.)

The answer is to make the **consumer idempotent**: processing a job twice must have the same effect as processing it once.

```ts
// At-least-once delivery means the same message can arrive twice. The consumer makes it harmless.
type Message = { id: string; orderId: string; amount: number };

const processed = new Set<string>();     // in a real system: a table with a UNIQUE message_id
const ledger: string[] = [];

function handlePaymentCaptured(msg: Message): void {
  if (processed.has(msg.id)) {
    console.log(`${msg.id}: duplicate delivery ignored`);
    return;
  }
  ledger.push(`order ${msg.orderId} paid ${msg.amount.toFixed(2)}`);  // the side effect...
  processed.add(msg.id);                                              // ...and the record, in one transaction
  console.log(`${msg.id}: processed`);
}

const m1 = { id: "msg-81", orderId: "1042", amount: 59.9 };
const m2 = { id: "msg-82", orderId: "1043", amount: 12.5 };
for (const delivery of [m1, m2, m1]) handlePaymentCaptured(delivery);  // m1 redelivered after a lost ack
console.log(ledger);
```

**Output:**

```text
msg-81: processed
msg-82: processed
msg-81: duplicate delivery ignored
[ 'order 1042 paid 59.90', 'order 1043 paid 12.50' ]
```

Ways to make consumers idempotent:

- **Record processed message ids** in the same database transaction as the job's changes (a table with a unique `message_id`), as in the example ({{ch:transactions}}).
- **Use natural uniqueness**: a unique constraint on `(order_id, type)` for invoices means a second insert fails harmlessly.
- **Write absolute values, not increments**: "set stock to 7" is safe to repeat; "decrease stock by 1" is not.
- **Pass idempotency keys to external services**: payment providers accept a key so that a repeated charge request returns the first result instead of charging again.

### Level 3 — Getting jobs into the queue reliably: the outbox

A subtle gap exists between the database and the queue:

```ts
// fragment
await db.orders.insert(order);                 // 1. committed
await emailQueue.add("order-confirmation", { orderId: order.id });   // 2. what if this fails, or the process dies here?
```

If step 2 fails, the order exists but the confirmation never sends. Reversing the order is worse: the job could run before the order is committed, or for an order whose transaction rolled back.

The **transactional outbox** pattern fixes this. The request writes the job into an `outbox` table **in the same transaction** as the business change; a separate relay process reads new outbox rows and publishes them to the queue, marking them as sent:

```text
  request transaction                         relay (loop or change-data-capture)
  ┌──────────────────────────────┐            ┌──────────────────────────────────────┐
  │ INSERT INTO orders ...       │            │ SELECT * FROM outbox                 │
  │ INSERT INTO outbox           │  commit    │   WHERE sent_at IS NULL              │
  │   (type, payload, key) ...   │ ─────────▶ │   ORDER BY id LIMIT 100              │
  └──────────────────────────────┘            │   FOR UPDATE SKIP LOCKED;            │
                                              │ publish each → queue                 │
                                              │ UPDATE outbox SET sent_at = now()    │
                                              └──────────────────────────────────────┘
```

Either both the order and its outbox row exist, or neither does. The relay may publish a row twice (if it crashes after publishing but before marking it), which is fine — consumers are idempotent. The outbox is the standard way to connect database changes to queues and events ({{ch:event-driven-systems}}).

### Level 3 — Ordering, priorities, delays and rate limits

- **Ordering is weaker than you think.** With several workers and retries, jobs finish out of order. If order matters per entity (all updates for one account in sequence), use a feature that orders within a key — SQS FIFO **message groups**, Kafka **partitions** by key — or design jobs so that order does not matter (each job carries a version and stale ones are ignored).
- **Priorities**: separate queues per class of work (`critical`, `default`, `bulk`) with their own workers are the simplest and most predictable. Job-level priorities also exist (in BullMQ, **1 is the highest** priority and larger numbers run later).
- **Delays**: "send this in three days" as a delayed job, or as a database row with a due date scanned by a scheduled job (better for very long delays and for cancelling).
- **Rate limits**: when a provider allows 100 requests per second, limit the worker (`limiter: { max: 100, duration: 1000 }` in BullMQ) instead of letting jobs fail with `429`.

### Level 4 — Choosing a queue technology

| Option | Examples | Strengths | Consider when |
|---|---|---|---|
| **Redis-based job queues** | BullMQ (Node), Sidekiq (Ruby), Celery with Redis (Python) | Rich job features: retries, delays, priorities, schedules, dashboards | Background jobs inside one application |
| **Database queues** | pg-boss, Graphile Worker (PostgreSQL), Solid Queue (Rails) | No extra infrastructure; jobs enqueued in the **same transaction** as data | Moderate volumes, PostgreSQL already in place |
| **Managed queues** | Amazon SQS, Google Cloud Tasks, Azure Queue Storage | No servers to run, very high scale, built-in DLQs | Cloud systems; integration with serverless functions ({{ch:sns-sqs}}) |
| **Message brokers** | RabbitMQ, Amazon MQ | Flexible routing (exchanges, topics), several consumers per message type | Communication between services ({{ch:message-brokers}}) |
| **Event logs / streams** | Apache Kafka, Amazon Kinesis, Redis Streams | Ordered, replayable history; many independent consumer groups; huge throughput | Event streaming, analytics, event-driven architectures ({{ch:event-driven-systems}}) |

A practical starting point for a Node.js application is BullMQ (if Redis is available) or a PostgreSQL-based queue (if not). Two important Redis settings for BullMQ: persistence enabled, and `maxmemory-policy noeviction`, so Redis never silently deletes jobs when memory runs low.

With SQS, the mechanics are explicit: a worker **receives** messages (long polling waits up to 20 seconds for messages to arrive), processes them within the **visibility timeout**, and **deletes** them to acknowledge. Messages not deleted reappear for another attempt; after `maxReceiveCount` receives they move to the DLQ. Messages are small, so large payloads go to object storage with only a reference in the message.

## Operating workers

### Level 4 — Concurrency and scaling

How many workers do you need? **Little's law** gives a first estimate: the number of jobs in progress at once equals the arrival rate multiplied by the time each job takes. Forty jobs a second taking a quarter of a second each means about ten jobs in progress at any moment. Add headroom (aim for around 70% utilisation), divide by the concurrency per worker process, and watch real metrics. Exercise 1 turns this into code.

Scale workers on **queue depth** and **age of the oldest job**, not CPU alone: a growing backlog is the clearest sign of too few workers (or a slow dependency). Kubernetes autoscalers such as KEDA, and AWS services scaling on SQS metrics, do this automatically ({{ch:auto-scaling}}).

Concurrency must also respect what is downstream. Two hundred concurrent jobs each opening a database connection will exhaust the database's connection pool ({{ch:postgresql}}), and a provider's rate limit applies however many workers you run.

### Level 4 — Graceful shutdown and timeouts

Workers are restarted on every deployment. On `SIGTERM`, a worker should stop taking new jobs, finish (or safely abandon) the active ones, and exit:

```ts
// fragment
process.on("SIGTERM", async () => {
  logger.info("shutting down worker");
  await worker.close();          // waits for active jobs to finish; takes no new ones
  await connection.quit?.();
  process.exit(0);
});
```

Give the platform enough time for this (for example, Kubernetes' `terminationGracePeriodSeconds`). Jobs longer than that should be split into smaller steps or made **resumable**, recording progress so a restart continues rather than starting over. Every job also needs a **timeout**: a job hanging on a network call for ever holds a worker slot for ever. Set timeouts on every outgoing call inside jobs ({{ch:error-handling}}).

### Level 4 — Monitoring

Watch, per queue:

- **depth** (waiting jobs) and **age of the oldest waiting job** — the user-visible delay;
- **throughput** and **processing time** per job type;
- **failure rate**, retries, and the **dead-letter count** (alert when it grows);
- **active jobs** versus concurrency (saturation).

Dashboards such as Bull Board (for BullMQ) let developers inspect, retry and remove jobs; protect them as admin tools. Carry a **correlation id** from the request into the job's data and logs, so a support engineer can follow one order from the HTTP request through every job it triggered ({{ch:logging}}, {{ch:observability-and-incidents}}).

## From beginner to enterprise

**Level 1–2 — first background job.** Slow work (an email) moved out of the request into BullMQ, a worker process, `attempts` with exponential backoff, logs on failure.

**Level 3 — reliable jobs.** Small payloads with ids; deterministic job ids; retryable versus permanent errors; a DLQ with alerts and replay; idempotent consumers; separate queues per priority; rate-limited workers.

**Level 4 — production systems.** Transactional outbox; graceful shutdown and timeouts; resumable long jobs; autoscaling on queue depth and oldest-job age; dashboards and correlation ids; capacity planning with Little's law.

**Level 5 — professional practice.** Choosing between job queues, managed queues, brokers and logs per use case; ordering per key where needed; back-pressure (slowing producers when queues grow); load tests of worker capacity; runbooks for backlogs and DLQ floods.

**Level 6 — enterprises.** Event-driven architectures with Kafka and schema registries; durable workflow engines (Temporal, AWS Step Functions) for long multi-step processes with compensation; multi-tenant fairness so one large customer cannot starve others; cross-region queues and disaster recovery.

## Real-world use cases

### Order processing

- **Design**: the order request saves the order and an outbox row in one transaction and returns `201`. The relay publishes `order.placed`. Workers send the confirmation email, reserve stock, notify the warehouse and record analytics — each its own idempotent job, so one failing does not block the others.
- **Result**: fast checkout; a slow email provider never affects ordering; failures are retried and visible.

### Webhook delivery to partners

- **Design**: one delivery job per event per partner endpoint; signed payloads; retries with exponential backoff and jitter over about a day; after the last attempt, the delivery is dead-lettered and the partner's dashboard shows it with a "redeliver" button; endpoints that keep failing are disabled automatically with a notification.
- **Why**: partners' servers are outside your control; the queue absorbs their outages without losing events.

### Data exports

- **Design**: `POST /exports` returns `202 Accepted` with `/exports/exp_77`; a worker streams the data into a file in object storage, updating progress; when done, the status page shows a short-lived download link and the user receives an email.

## Common mistakes

### Beginner: doing slow or unreliable work in the request

**Fix:** queue it; respond `201` or `202`; process in workers.

### Beginner: putting whole objects in jobs

**Consequence:** stale data, large payloads, personal data copied into the queue. **Fix:** ids in jobs; load fresh data in the worker.

### Beginner: retrying everything immediately and for ever

**Fix:** exponential backoff with jitter; a maximum number of attempts; no retries for permanent errors; a DLQ.

### Intermediate: non-idempotent consumers

**Consequence:** duplicate emails, double charges. **Fix:** processed-id records, unique constraints, absolute writes, idempotency keys.

### Intermediate: enqueueing outside the transaction

**Consequence:** lost jobs or jobs for data that does not exist. **Fix:** transactional outbox (or a database queue in the same transaction).

### Intermediate: workers inside the web process

**Fix:** separate processes or containers, scaled independently.

### Production: no monitoring of depth, age and DLQ

**Consequence:** a backlog of hours discovered by customers. **Fix:** metrics, alerts and dashboards.

### Production: unlimited concurrency against limited resources

**Fix:** concurrency sized to database pools and provider rate limits; worker rate limiters.

## Debugging and troubleshooting

- **Jobs are added but never processed**: no worker running for that queue name; different Redis or queue configuration between producer and worker; worker crashed on start (check its logs).
- **Jobs run twice**: lock or visibility timeout shorter than the job's duration (the queue assumed the worker died); a crash after the work but before the ack; duplicates from the outbox relay — make consumers idempotent and set timeouts longer than jobs.
- **The queue keeps growing**: workers too few or too slow; a dependency slowed down; a "poison" job retrying constantly; compare arrival rate with throughput.
- **Jobs stuck "active"**: a worker died holding them; BullMQ detects stalled jobs and returns them to waiting — check stalled-job events and long-running synchronous code blocking the event loop.
- **Redis memory full**: completed and failed jobs never removed — set `removeOnComplete` and `removeOnFail`; large payloads — store data elsewhere.

## Security summary

- Keep **personal data and secrets out of job payloads**; pass ids and load data in the worker.
- Protect the **queue infrastructure**: Redis with authentication and TLS on a private network; IAM policies for SQS limiting who can send and receive ({{ch:iam}}).
- **Validate job payloads** in workers as untrusted input, especially when jobs come from other services ({{ch:validation}}).
- Protect **queue dashboards** — they can show data and replay or delete jobs.
- Run workers with **least privilege** for the jobs they perform.
- Treat **DLQ contents** as sensitive data with retention limits.

## How a senior engineer thinks about this

- **Assume every job runs at least once — and sometimes twice.** Idempotency is designed in from the start.
- **The database and the queue must agree.** Outbox or same-transaction enqueueing, never "save then hope".
- **Failures are routine.** Backoff, jitter, limits and DLQs turn them into delays rather than incidents.
- **Queues hide problems until they do not.** Depth, oldest-job age and DLQ size are first-class health signals.
- **Choose the simplest technology that fits.** A database queue or BullMQ for application jobs; brokers and logs when many services and replayable events are genuinely needed.

## Exercises

### Exercise 1 — Plan worker capacity

**Objective:** practise Little's law and backlog reasoning.
**What to build:** `capacityPlan(arrivalsPerSecond, secondsPerJob, concurrencyPerWorker, targetUtilisation = 0.7)` returning the jobs busy at once, the concurrency slots needed, the worker processes needed and the resulting throughput; and `drainMinutes(backlog, throughput, arrivalsPerSecond)` returning how long a backlog takes to clear (or `"never"`). Try 40 jobs per second at 0.25 seconds each with 5 jobs per worker, a backlog of 30,000, and a spike to 150 jobs per second.

<details>
<summary>Show the solution</summary>

```ts
function capacityPlan(arrivalsPerSecond: number, secondsPerJob: number, concurrencyPerWorker: number, targetUtilisation = 0.7) {
  const busyAtOnce = arrivalsPerSecond * secondsPerJob;                 // Little's law: L = λ × W
  const slotsNeeded = Math.ceil(busyAtOnce / targetUtilisation);
  const workers = Math.ceil(slotsNeeded / concurrencyPerWorker);
  const throughput = (workers * concurrencyPerWorker) / secondsPerJob;  // jobs per second at full use
  return { busyAtOnce, slotsNeeded, workers, throughput };
}

function drainMinutes(backlog: number, throughput: number, arrivalsPerSecond: number): number | "never" {
  const spare = throughput - arrivalsPerSecond;
  return spare <= 0 ? "never" : Math.round(backlog / spare / 60 * 10) / 10;
}

const plan = capacityPlan(40, 0.25, 5);
console.log(plan);
console.log("drain 30,000 backlog:", drainMinutes(30_000, plan.throughput, 40), "minutes");
console.log("same backlog during a 150/s spike:", drainMinutes(30_000, plan.throughput, 150));
```

**Output:**

```text
{ busyAtOnce: 10, slotsNeeded: 15, workers: 3, throughput: 60 }
drain 30,000 backlog: 25 minutes
same backlog during a 150/s spike: never
```

**Walkthrough:** ten jobs are in progress on average; with 70% target utilisation that needs 15 slots, so three workers of five. At full use they handle 60 jobs a second, leaving 20 a second spare — a 30,000-job backlog clears in 25 minutes. During a spike of 150 a second the backlog only grows, so the system must scale out (or shed or delay low-priority work). The model assumes steady averages; real traffic is burstier, which is why headroom and autoscaling on queue depth matter.

</details>

### Exercise 2 — Classify the failures

**Objective:** practise retry decisions.
**What to do:** for each failure inside a job, decide: retry with backoff, do not retry (DLQ or drop), or something else. (1) The SMS provider returns `429` with `Retry-After: 30`. (2) The order referenced by the job was deleted. (3) A `TypeError: cannot read properties of undefined` in your code. (4) The payment provider times out after you sent a charge request. (5) A partner's webhook endpoint returns `410 Gone`. (6) The database is temporarily unavailable during a failover.

<details>
<summary>Show the solution</summary>

1. **Retry**, waiting at least 30 seconds as instructed; also rate-limit the worker so it happens less.
2. **Do not retry** — the job is no longer meaningful. Complete it as "skipped" (or `UnrecoverableError`) with a log entry.
3. **Do not retry blindly** — it is a bug. Let it reach the DLQ, alert, fix the code, then **replay** the dead-lettered jobs.
4. **Retry — but only safely**: the charge may have succeeded. Retry with the **same idempotency key**, so the provider returns the original result instead of charging twice.
5. **Do not retry** — the endpoint has been removed. Disable the subscription and notify the partner.
6. **Retry** with backoff and jitter; failovers usually complete within seconds to a minute.

</details>

### Exercise 3 — Review a queue design

**Objective:** practise spotting reliability problems.
**The scenario:** after saving an order, the handler calls `queue.add("process-order", order)` with the full order object. The worker runs inside the web server process with `concurrency: 500`. It charges the card, sends the email, and updates stock with `stock = stock - quantity`. Failed jobs are retried immediately up to 50 times and then deleted. List the problems and improvements.

<details>
<summary>Show the solution</summary>

1. **Enqueue after save, outside a transaction** → lost jobs if the process dies between them. Use an outbox.
2. **Full order object in the job** → stale data, personal data in Redis, big payloads. Pass the order id.
3. **Worker in the web process** → order processing competes with user requests. Separate worker processes.
4. **Concurrency 500** → exhausts database connections and provider rate limits. Size concurrency to downstream limits.
5. **One job doing three things** → a failed email retries the charge. Split into separate jobs (charge, email, stock), each idempotent.
6. **Non-idempotent charge and stock update** → duplicate charges and double stock reductions on retries. Idempotency keys for payments; record processed ids; reserve stock with a unique reservation per order line.
7. **Immediate retries ×50** → hammering failing services. Exponential backoff with jitter, a handful of attempts, no retries for permanent errors.
8. **Deleted after failure** → silent loss. Dead-letter queue, alert and replay.

</details>

### Exercise 4 — Production scenario: the backlog

**Objective:** practise handling a queue incident.
**The scenario:** at 10:00 an alert fires: the `emails` queue has 80,000 waiting jobs, the oldest is 45 minutes old, and customers report that login codes are not arriving. Describe your investigation and actions.

<details>
<summary>Show the solution</summary>

1. **Look at the rates**: arrival rate versus completion rate since the backlog began. Did arrivals spike (a marketing send? a bug enqueueing in a loop?) or did processing slow or stop?
2. **Look at the workers**: are they running? Errors in logs? Processing time per job jumped (provider slow)? Many retries or `429` responses?
3. **Protect the urgent work now**: login codes should never wait behind bulk mail. If they share a queue, move them to a separate high-priority queue with dedicated workers (or pause the bulk job type temporarily).
4. **Fix the cause**: stop a runaway producer; scale workers if the provider has spare capacity; if the provider is rate-limiting, lower concurrency to its limit rather than retrying harder; switch to a fallback provider for critical messages if available.
5. **Drain safely**: watch the oldest-job age fall; check the DLQ for jobs that failed during the incident and replay them once healthy; consider dropping time-sensitive jobs that are now useless (expired login codes) instead of sending them late.
6. **Afterwards**: separate queues per priority; alerts on oldest-job age per queue; autoscaling on depth; limits on how fast campaigns may enqueue; a post-incident review ({{ch:observability-and-incidents}}).

</details>

## Summary

**Background jobs** move slow, unreliable or heavy work out of the request: the **producer** adds a small **job** (usually ids) to a **queue** and responds quickly, and separate **workers** process jobs, acknowledging them when done. Jobs move between waiting, active, delayed, completed and failed states.

Temporary failures are **retried** with **exponential backoff** and **jitter**, up to a limit; permanent failures are not retried. Jobs that fail permanently go to a **dead-letter queue**, with alerts and a way to replay them. Queues deliver **at least once**, so consumers must be **idempotent** — recording processed ids, relying on unique constraints, writing absolute values and passing idempotency keys to external services. The **transactional outbox** makes sure a job exists exactly when its database change does.

Ordering is weak across workers; use per-key ordering features or order-independent jobs, separate queues for priorities, delays for future work, and rate limits that match providers. Choose the technology to match the need — **BullMQ** or a **database queue** for application jobs, **SQS** for managed scale, **RabbitMQ** for routing between services, **Kafka** for replayable event streams. Size workers with **Little's law**, scale on queue depth and oldest-job age, respect downstream limits, shut down gracefully, put timeouts everywhere, and monitor depth, age, failures and dead letters.

## Key terms

- **Background job** — Work performed outside the request–response cycle by a separate process.
- **Job queue** — A system storing jobs until workers process them, with retries and monitoring.
- **Producer** — Code that adds jobs or messages to a queue.
- **Worker (consumer)** — A process that takes jobs from a queue and performs them.
- **Acknowledgement (ack)** — A worker's confirmation that a job is complete and can be removed.
- **Visibility timeout** — The period during which a received message is hidden from other consumers.
- **BullMQ** — A Redis-based job queue library for Node.js.
- **Exponential backoff** — Waiting increasingly longer between retries, usually doubling each time.
- **Jitter** — Randomness added to retry delays to stop many clients retrying at once.
- **Thundering herd** — Many clients retrying or requesting simultaneously and overloading a service.
- **Dead-letter queue (DLQ)** — A queue holding messages that failed permanently, for inspection and replay.
- **Redrive** — Moving messages from a dead-letter queue back to the main queue for reprocessing.
- **Poison message** — A message that always fails processing.
- **At-least-once delivery** — A guarantee that every message is delivered, possibly more than once.
- **Exactly-once processing** — Processing each message effectively once, achieved through deduplication and idempotency.
- **Idempotent consumer** — A consumer whose result is the same when it processes a message more than once.
- **Idempotency key** — A unique key sent with a request so a service can recognise and ignore duplicates.
- **Transactional outbox** — Writing messages to an outbox table in the same transaction as a data change, then publishing them.
- **Queue depth (backlog)** — The number of jobs waiting to be processed.
- **Concurrency (workers)** — The number of jobs processed at the same time.
- **Little's law** — The relationship: items in a system equal arrival rate multiplied by time in the system.
- **Back-pressure** — Slowing or rejecting new work when a system cannot keep up.
- **Graceful shutdown** — Stopping a worker by finishing or safely releasing active jobs before exiting.
- **Message broker** — Middleware that routes messages between producers and consumers, such as RabbitMQ.

## What comes next

Queues let the server work **after** the response. Sometimes the server must also **tell** the client when that work is done, or push live updates — new chat messages, order status changes, live dashboards. The next chapter, {{ch:websockets}}, covers real-time communication: polling, Server-Sent Events and WebSockets, connection handling and authentication, scaling real-time servers across many machines, and choosing the right tool for each live feature.
