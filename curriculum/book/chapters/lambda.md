# Lambda and Serverless

> [!GOALS]
> - Explain what "serverless" means and how AWS Lambda runs code in response to events.
> - Write handlers for HTTP requests and queue messages, using the **execution environment** correctly.
> - Understand **cold starts**, **concurrency**, timeouts, memory and how they affect performance and cost.
> - Connect Lambda to event sources: API Gateway and function URLs, SQS, SNS, EventBridge, S3 — including **partial batch failures** and **idempotency**.
> - Handle permissions, configuration, networking, observability and deployment.
> - Judge when serverless fits and when containers are the better choice.

## Why this matters

Containers removed the need to manage servers' software; **serverless** removes the need to think about servers at all. With **AWS Lambda**, you upload a function, say which events should trigger it — an HTTP request, a file arriving in S3, a message in a queue, a schedule — and AWS runs it, scales it from zero to thousands of copies, and charges only for the milliseconds it runs. No idle servers, no capacity planning, no patching.

That model is ideal for many back-end jobs: processing uploads, reacting to events between services, scheduled tasks, webhooks, glue between AWS services and APIs with spiky traffic. It also has real limits — execution time caps, cold starts, connection-hungry databases, and costs that can exceed containers at steady high load. Back-end engineers on AWS use Lambda constantly, often alongside containers ({{ch:ecs}}). This chapter shows how to use it well.

## The simple idea

Think of taxis instead of owning a car. You do not pay for a car standing in the garage; you call a taxi when you need a trip, pay for the trip, and many taxis can come at once when many people need them. The first taxi of the morning might take a moment to arrive; later, one is usually waiting nearby.

Lambda is taxis for code: nothing runs and nothing is billed until an event arrives; then AWS provides an environment, runs your function, and keeps the environment warm for a while in case another event comes.

> [!ANALOGY]
> Lambda is like calling taxis instead of owning a car: you pay per trip, many can come at once, and nothing costs money while you are not travelling.
>
> **Where the analogy breaks:** a taxi company has more cars than you will ever need. Lambda's concurrency is effectively unlimited for **your** code — but the database or API your function calls is not. A thousand taxis arriving at once at a small restaurant cause chaos; a thousand concurrent functions opening database connections do the same to a database.

## The proper definition and key words

**Serverless** computing runs code or services without provisioning or managing servers, scales automatically, and bills by use. **AWS Lambda** is AWS's function-as-a-service: it runs a **handler** function in an isolated **execution environment** for each **invocation** triggered by an **event source**.

Key words:

- **Function** — your code plus configuration: runtime, memory, timeout, role, environment variables.
- **Handler** — the function Lambda calls with the event and a context object.
- **Invocation** — one call of the function: **synchronous** (the caller waits, as with API Gateway), **asynchronous** (Lambda queues the event, as with S3 and SNS) or **poll-based** (Lambda reads batches from SQS, Kinesis or DynamoDB Streams).
- **Execution environment** — the isolated micro-VM where the code runs; reused for later invocations while warm.
- **Cold start** — creating a new environment and running initialisation code before the first invocation.
- **Concurrency** — the number of invocations running at the same time; limited per account and optionally reserved per function.
- **Provisioned concurrency** — environments kept initialised in advance to avoid cold starts.
- **Execution role** — the IAM role whose permissions the function's code uses.
- **Layer** — shared code or dependencies attached to functions.
- **Dead-letter queue / on-failure destination** — where events go after retries fail.

## How Lambda runs your code

### Level 1 — Handlers and the execution environment

A handler is an ordinary async function. Code at the **module level** runs once per execution environment (during the cold start) and is reused by later invocations; code inside the handler runs every time. Calling the handlers directly with sample events shows both — and also how to report partial failures from a queue batch:

```ts
// Lambda handlers are plain functions; Lambda calls them with an event. Here we call them ourselves.
type ApiEvent = { rawPath: string; requestContext: { http: { method: string } }; pathParameters?: Record<string, string> };
type ApiResult = { statusCode: number; headers?: Record<string, string>; body: string };
type SqsEvent = { Records: { messageId: string; body: string }[] };
type SqsResult = { batchItemFailures: { itemIdentifier: string }[] };

// --- code at module level runs once per execution environment: the "cold start" ---
let initCount = 0;
function createClients() { initCount++; return { products: new Map([["42", { id: "42", name: "Green tea", pricePence: 450 }]]) }; }
const clients = createClients();          // e.g. database pools, SDK clients, loaded configuration

// --- the handler runs for every invocation, reusing what module level created ---
let invocations = 0;
export async function getProduct(event: ApiEvent): Promise<ApiResult> {
  invocations++;
  const id = event.pathParameters?.id ?? "";
  const product = clients.products.get(id);
  if (!product) return { statusCode: 404, body: JSON.stringify({ error: "not found" }) };
  return { statusCode: 200, headers: { "content-type": "application/json" }, body: JSON.stringify(product) };
}

// An SQS handler that reports partial failures, so only the failed messages are retried
export async function sendEmails(event: SqsEvent): Promise<SqsResult> {
  const failures: { itemIdentifier: string }[] = [];
  for (const record of event.Records) {
    try {
      const msg = JSON.parse(record.body) as { to?: string };
      if (!msg.to?.includes("@")) throw new Error("invalid address");
      // ...send the email, idempotently (the same message may be delivered twice)...
    } catch {
      failures.push({ itemIdentifier: record.messageId });
    }
  }
  return { batchItemFailures: failures };
}

const ev = (id: string): ApiEvent => ({ rawPath: `/products/${id}`, requestContext: { http: { method: "GET" } }, pathParameters: { id } });
for (const id of ["42", "42", "7"]) {
  const r = await getProduct(ev(id));
  console.log(`GET /products/${id} -> ${r.statusCode} ${r.body}`);
}
console.log(`module initialised ${initCount} time(s) for ${invocations} invocations in this environment`);

const batch = await sendEmails({ Records: [
  { messageId: "m-1", body: JSON.stringify({ to: "sara@example.com" }) },
  { messageId: "m-2", body: "not json" },
  { messageId: "m-3", body: JSON.stringify({ to: "no-at-sign" }) },
  { messageId: "m-4", body: JSON.stringify({ to: "ali@example.com" }) },
] });
console.log("retry only:", batch.batchItemFailures.map((f) => f.itemIdentifier).join(", "));
```

**Output:**

```text
GET /products/42 -> 200 {"id":"42","name":"Green tea","pricePence":450}
GET /products/42 -> 200 {"id":"42","name":"Green tea","pricePence":450}
GET /products/7 -> 404 {"error":"not found"}
module initialised 1 time(s) for 3 invocations in this environment
retry only: m-2, m-3
```

- **Initialise expensive things outside the handler**: SDK clients, database pools, configuration. Three invocations reused one initialisation. Inside the handler, they would be recreated every time, adding latency and connections.
- **Do not keep request data in module variables**: the environment is shared by later invocations (of possibly different users) — and many environments run in parallel, so module state is neither shared nor reliable across them.
- The **API handler** returns a status code, headers and a string body — the format API Gateway's HTTP APIs and Lambda function URLs expect.
- The **SQS handler** returns `batchItemFailures` (with "report batch item failures" enabled on the event source mapping). Lambda deletes the successful messages and returns only `m-2` and `m-3` to the queue for retry. Without it, one bad message makes the **whole batch** fail and be retried — including emails already sent ({{ch:sns-sqs}}).
- Because messages can be **delivered more than once**, every handler for events must be **idempotent** — for example by recording processed message IDs with a unique constraint ({{ch:queues}}).
- Handlers are easy to unit-test this way: call them with sample events ({{ch:testing}}).

### Level 2 — Memory, CPU, timeouts and cold starts

- **Memory** (128 MB to 10 GB) also sets **CPU**: more memory gives proportionally more CPU, so increasing memory often makes functions faster and sometimes **cheaper** overall. Measure with real workloads (AWS Lambda Power Tuning automates this).
- **Timeout** (up to 15 minutes): set it slightly above the slowest normal execution — not the maximum. Long-running work belongs in containers or Step Functions.
- **Cold starts** happen when Lambda creates a new environment: scaling up, after idle periods, after deployments. For Node.js they are typically a few hundred milliseconds, more with large bundles or VPC set-up that the runtime must do. Reduce them with **small bundles** (bundle and tree-shake with esbuild; import only the SDK clients you use), lazy initialisation of rarely used clients, and — where latency really matters — **provisioned concurrency** or SnapStart where supported.
- **Architecture**: ARM64 (Graviton) is cheaper per millisecond for most functions.

### Level 2 — Concurrency

Each concurrent invocation needs its own environment. If 200 requests arrive at once, Lambda runs up to 200 environments.

- The **account concurrency limit** (1,000 by default per region, raisable) is shared by all functions: one runaway function can starve the others. **Reserved concurrency** guarantees — and caps — a function's share.
- **Capping concurrency protects downstream systems**: a function writing to a database with 100 connections should not run 1,000 copies. Combine a cap with a queue that absorbs bursts.
- **Throttling**: synchronous callers get `429` errors; asynchronous events are retried; queue consumers slow down.
- **Databases**: use **RDS Proxy** so many function environments share few database connections ({{ch:rds}}), or prefer DynamoDB or HTTP-based data APIs for very spiky workloads.

## Event sources

### Level 3 — The main patterns

| Event source | Invocation | What to configure |
|---|---|---|
| **API Gateway / function URL** | Synchronous | Timeouts within the HTTP limit, authentication, throttling, CORS ({{ch:api-gateway}}) |
| **SQS** | Poll-based batches | Batch size, batching window, partial failures, visibility timeout ≥ 6× function timeout, DLQ on the queue |
| **SNS / EventBridge** | Asynchronous | Retries (up to 2), on-failure destination or DLQ, event filtering ({{ch:event-driven-systems}}) |
| **S3 events** | Asynchronous | Prefix and suffix filters, avoiding loops, idempotent processing ({{ch:s3}}) |
| **EventBridge Scheduler** | Asynchronous | Schedules for cron-like jobs ({{ch:cron-jobs}}) |
| **DynamoDB / Kinesis streams** | Poll-based, ordered per shard | Batch size, bisect on error, maximum retries |

- **Asynchronous invocations** are retried twice on error, then sent to an **on-failure destination** or dead-letter queue — configure one, or failed events disappear silently.
- **Poll-based sources** retry until the message expires or moves to the queue's DLQ.
- **Step Functions** orchestrate multi-step workflows of functions with retries, waits and error handling — better than functions calling functions.

## Running Lambda in production

### Level 3 — Permissions, configuration and networking

- **Execution role**: least-privilege permissions for what the function does — its table, its bucket prefix, its queue — plus CloudWatch Logs ({{ch:iam}}). One role per function.
- **Resource-based policies** decide who may **invoke** the function (API Gateway, S3, another account).
- **Configuration**: environment variables for plain settings; secrets from Secrets Manager or Parameter Store, fetched at initialisation and cached (the Parameters and Secrets extension helps) — not in plain environment variables ({{ch:secrets-manager}}).
- **VPC access**: attach the function to private subnets only when it must reach private resources (RDS, ElastiCache). It then needs NAT or VPC endpoints for AWS services and the internet ({{ch:vpc}}).

### Level 3 — Observability

- Every `console.log` goes to **CloudWatch Logs**; log structured JSON with a request ID (the context's `awsRequestId`) ({{ch:logging}}).
- **Metrics**: invocations, errors, duration (p95/p99), throttles, concurrent executions, iterator age for streams and queue age for SQS ({{ch:cloudwatch}}).
- **Tracing** with X-Ray or OpenTelemetry shows time spent in downstream calls.
- **Powertools for AWS Lambda (TypeScript)** provides structured logging, metrics, tracing, idempotency and batch-processing helpers.

### Level 4 — Deployment

- Package with **esbuild** into a small bundle; deploy with infrastructure as code — AWS SAM, CDK, Serverless Framework or Terraform ({{ch:terraform}}, {{ch:cloudformation}}).
- **Versions and aliases**: publish immutable versions; point a `live` alias at one; shift traffic gradually (10% for five minutes) with CodeDeploy and roll back automatically on alarms ({{ch:cicd}}).
- **Container images** up to 10 GB are possible for large dependencies.

### Level 4 — When serverless fits, and what it costs

A rough comparison with two small always-on containers:

```ts
// What a Lambda costs, compared with a small always-on container (illustrative round prices in USD)
const perRequest = 0.20 / 1_000_000;
const perGbSecond = 0.0000133;                  // ARM pricing, roughly
function lambdaMonthly(requests: number, avgMs: number, memoryGb: number): number {
  return requests * perRequest + requests * (avgMs / 1000) * memoryGb * perGbSecond;
}
const containerMonthly = 2 * 0.5 * 0.033 * 730 + 2 * 1 * 0.0036 * 730;   // 2 small Fargate tasks: vCPU-hours + GB-hours

for (const perMonth of [100_000, 3_000_000, 30_000_000, 300_000_000]) {
  const l = lambdaMonthly(perMonth, 120, 0.5);
  console.log(`${perMonth.toLocaleString("en-GB").padStart(11)} requests/month: Lambda $${l.toFixed(2).padStart(7)}   2 containers $${containerMonthly.toFixed(2)}`);
}
```

**Output:**

```text
    100,000 requests/month: Lambda $   0.10   2 containers $29.35
  3,000,000 requests/month: Lambda $   2.99   2 containers $29.35
 30,000,000 requests/month: Lambda $  29.94   2 containers $29.35
300,000,000 requests/month: Lambda $ 299.40   2 containers $29.35
```

- At **low or spiky volume**, Lambda is almost free while containers cost the same whether busy or idle.
- At **steady high volume** — here around 30 million requests a month for this function shape — containers become cheaper. (The comparison is rough: it ignores API Gateway charges, which add to Lambda's side, and assumes two small containers could handle the higher loads.)
- Cost is only one factor. Lambda removes operational work, scales instantly and isolates every invocation; containers suit long-running processes, WebSockets, steady throughput, heavy in-memory caching and anything over 15 minutes.

| Good fit for Lambda | Better in containers |
|---|---|
| Event processing (S3, queues, events) | Long-running or always-busy services |
| Spiky or low-traffic APIs, webhooks | Persistent connections (WebSockets at scale, gRPC streaming) |
| Scheduled jobs and glue between services | Heavy start-up or large in-memory state |
| Prototypes and new products | Workloads needing fine control of runtime or hardware |

## From beginner to enterprise

**Level 1–2 — first functions.** Handlers for HTTP and events; module-level initialisation; memory and timeout settings; logs in CloudWatch; least-privilege execution roles.

**Level 3 — reliable event processing.** Partial batch failures, idempotency, DLQs and on-failure destinations; reserved concurrency protecting downstream systems; RDS Proxy; secrets fetched and cached; VPC access only when needed.

**Level 4 — production serverless.** Small bundles and measured memory sizes; versions, aliases and gradual traffic shifting; Powertools for logs, metrics and tracing; infrastructure as code.

**Level 5 — senior practice.** Choosing serverless versus containers per workload; event-driven architecture design; cost modelling at expected volumes; avoiding distributed-monolith chains of functions.

**Level 6 — enterprises.** Organisation-wide serverless platforms and templates, governance of concurrency and costs, standard observability across thousands of functions.

## Real-world use cases

### Image processing

- **Design**: uploads land in S3; an event triggers a function that validates, resizes and writes thumbnails to another prefix, records the result idempotently, and sends failures to a DLQ with an alarm. It costs almost nothing on quiet days and scales automatically on busy ones.

### The database that fell over

- **What happened**: a marketing email linked to an API built on Lambda. Traffic jumped; Lambda scaled to 800 concurrent environments, each opening database connections; PostgreSQL ran out of connections and every request failed.
- **Fix**: RDS Proxy; reserved concurrency matched to what the database can handle; caching of the popular read; a queue for writes.

## Common mistakes

### Beginner: initialising clients inside the handler

**Consequence:** slower invocations and connection storms. **Fix:** module-level initialisation.

### Beginner: maximum timeout "to be safe"

**Consequence:** stuck invocations run for 15 minutes and cost money. **Fix:** timeouts just above normal duration.

### Beginner: no DLQ or on-failure destination

**Consequence:** failed events disappear. **Fix:** configure failure handling for every asynchronous source.

### Intermediate: failing the whole SQS batch for one bad message

**Fix:** report batch item failures.

### Intermediate: non-idempotent event handlers

**Consequence:** duplicate emails and charges on retries. **Fix:** idempotency keys and unique constraints.

### Intermediate: unbounded concurrency against a database

**Fix:** reserved concurrency, RDS Proxy, queues.

### Production: functions calling functions synchronously

**Consequence:** paying twice, chained timeouts and failures. **Fix:** queues, events or Step Functions.

## Debugging and troubleshooting

- **Errors**: CloudWatch Logs for the request ID; error and throttle metrics.
- **Timeouts**: X-Ray traces show the slow downstream call; check VPC configuration if calls to AWS services hang (missing NAT or endpoints).
- **Cold-start latency**: duration p99 and init duration in logs; reduce bundle size, review VPC and memory settings, consider provisioned concurrency.
- **Throttles**: account or reserved concurrency limits; downstream back-pressure.
- **SQS messages retried endlessly**: visibility timeout shorter than processing time, or errors without partial batch reporting; check the DLQ.
- **AccessDenied**: the execution role's policy, or the resource policy for invocations.

## Security summary

- **Least-privilege execution role per function**; resource policies limiting who may invoke.
- **Secrets from managed stores**, cached at initialisation; not in plain environment variables or code.
- **Validate every event**: HTTP input, message bodies and S3 object contents are untrusted ({{ch:validation}}).
- **Dependencies** scanned and kept small; signed code where required.
- **Authentication** at API Gateway or in the function for HTTP endpoints; function URLs with IAM auth unless they must be public.

## How a senior engineer thinks about this

- **Events in, small functions out.** Each function does one job, triggered by events.
- **Assume at-least-once.** Idempotency is not optional.
- **Protect what does not scale.** Concurrency caps, proxies and queues in front of fixed-capacity systems.
- **Measure memory and cost.** The right size is found by testing, not guessing.
- **Choose per workload.** Serverless and containers are complementary tools.

## Exercises

### Exercise 1 — Fix the handler

**Objective:** practise handler structure.
**The code:** a handler that, on every invocation, creates a new `pg.Pool`, reads the database password from Secrets Manager, runs one query, and never ends the pool. What is wrong and how should it look?

<details>
<summary>Show the solution</summary>

Every invocation creates a pool and a secret request: slow, costly, and connections pile up because pools are never closed or reused.

**Better:** at module level, fetch the secret once (cache it, refresh occasionally), and create **one small pool** (for example `max: 1` or 2 per environment), reused by invocations. Use **RDS Proxy** so many environments share few database connections. Keep the handler focused on the query and the response.

</details>

### Exercise 2 — Design the event processing

**Objective:** practise reliable event handling.
**What to do:** design a function that sends order-confirmation emails from an SQS queue so that a bad message never blocks others and no customer gets two emails.

<details>
<summary>Show the solution</summary>

- SQS event source with batch size 10 and **report batch item failures**; return failed message IDs only.
- Queue **visibility timeout** at least six times the function timeout; a **DLQ** after, say, 5 receives, with an alarm.
- **Idempotency**: record `orderId` + "confirmation" in a table with a unique constraint before or atomically with sending; skip if it already exists (Powertools idempotency helper or a conditional write).
- Validate message bodies; invalid ones fail and end up in the DLQ for inspection.
- Reserved concurrency matching the email provider's rate limit.

</details>

### Exercise 3 — Production scenario: Lambda or containers?

**Objective:** practise workload placement.
**The scenario:** a product team has three workloads: (a) a public API with steady traffic of 400 requests per second all day; (b) a webhook receiver getting a few thousand calls a day in bursts; (c) a nightly job that takes 40 minutes. Where would you run each?

<details>
<summary>Show the solution</summary>

- (a) **Containers** (ECS Fargate behind an ALB) — steady high load is cheaper and more predictable in containers, with warm connection pools and no cold starts.
- (b) **Lambda** behind API Gateway or a function URL — bursty, low volume, almost free, scales instantly; push events to SQS for processing.
- (c) **A container task** scheduled by EventBridge Scheduler (or Step Functions orchestrating shorter steps) — Lambda's 15-minute limit rules out one long function.

</details>

## Summary

**Serverless** runs code without managing servers, scaling automatically and billing by use. **Lambda** calls a **handler** with an **event** in an isolated **execution environment** that is reused while warm: initialise clients and configuration at **module level** (run once per environment during a **cold start**), keep per-request data inside the handler, and test handlers by calling them with sample events.

**Memory** sets CPU and price, **timeouts** should be just above normal duration, and **cold starts** shrink with small bundles, lazy initialisation and provisioned concurrency. **Concurrency** scales with load up to account limits; **reserved concurrency**, RDS Proxy and queues protect databases and APIs that do not scale the same way.

Event sources invoke functions **synchronously** (API Gateway, function URLs), **asynchronously** (S3, SNS, EventBridge — with retries and on-failure destinations) or by **polling** (SQS and streams — with batches and **partial batch failures**). Delivery is at least once, so handlers must be **idempotent**. Give each function a least-privilege role, fetch secrets from managed stores, join a VPC only when needed, observe with logs, metrics and traces, and deploy versions through aliases with gradual traffic shifting. Lambda shines for events, spiky APIs, schedules and glue; containers win for steady high load, long-running work and persistent connections.

## Key terms

- **Serverless** — Running code or services without managing servers, with automatic scaling and usage billing.
- **AWS Lambda** — AWS's service for running functions in response to events.
- **Function** — Code plus configuration deployed to Lambda.
- **Handler** — The entry function Lambda calls for each invocation.
- **Invocation** — One execution of a function.
- **Synchronous invocation** — The caller waits for the function's result.
- **Asynchronous invocation** — Lambda queues the event and returns immediately.
- **Event source mapping** — Lambda polling a queue or stream and invoking a function with batches.
- **Execution environment** — The isolated runtime in which a function runs, reused while warm.
- **Cold start** — The extra latency of creating and initialising a new execution environment.
- **Concurrency** — The number of invocations running simultaneously.
- **Reserved concurrency** — A guaranteed and capped share of concurrency for a function.
- **Provisioned concurrency** — Pre-initialised environments that avoid cold starts.
- **Execution role** — The IAM role a function's code uses.
- **Partial batch failure** — Reporting which messages in a batch failed so only they are retried.
- **Idempotency** — Processing the same event more than once with the same result.
- **On-failure destination** — Where an asynchronous event is sent after retries fail.
- **Function URL** — A built-in HTTPS endpoint for a Lambda function.
- **Alias** — A named pointer to a function version.
- **Step Functions** — AWS's service for orchestrating multi-step workflows.

## What comes next

Functions and services communicate best through messages. The next chapter, {{ch:sns-sqs}}, covers SNS and SQS: queues and topics, fan-out, standard and FIFO queues, visibility timeouts, dead-letter queues, long polling and the patterns that make asynchronous systems reliable.
