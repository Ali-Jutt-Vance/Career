# SNS and SQS: Messaging

> [!GOALS]
> - Explain why services communicate through messages, and the difference between a **queue** and a **topic**.
> - Use **SQS** correctly: sending, receiving, deleting, **visibility timeout**, long polling and **dead-letter queues**.
> - Choose between **standard** and **FIFO** queues, and design for **at-least-once** delivery with idempotent consumers.
> - Use **SNS** for fan-out to many subscribers, with **filter policies**, and know when **EventBridge** fits better.
> - Operate messaging in production: scaling consumers, monitoring queue age, redriving failed messages and securing queues.

## Why this matters

When the shop's checkout finishes, many things must happen: send a confirmation email, tell the warehouse to pick the items, update analytics, check for fraud, award loyalty points. If the checkout API does all of them itself, in sequence, it becomes slow, and if the email provider is down, checkout fails — even though the customer's payment succeeded.

**Messaging** decouples these steps. The checkout publishes "order placed" and returns immediately; each other system receives the message and does its job in its own time, retrying if it fails. **Amazon SQS** (Simple Queue Service) provides queues; **Amazon SNS** (Simple Notification Service) provides topics that fan messages out to many subscribers. Both are fully managed, scale to enormous volumes and are among the oldest and most used AWS services. The ideas from {{ch:queues}} — producers, consumers, retries, idempotency — apply directly; this chapter shows how they work on AWS.

## The simple idea

A **queue** is like a ticket rail in a restaurant kitchen. Waiters clip order tickets onto the rail; cooks take the next ticket when they are free. If a cook drops a ticket, it goes back on the rail for someone else. Each ticket is cooked by **one** cook.

A **topic** is like the restaurant's announcement speaker: "Table 12 has paid!" Everyone who cares — the cashier, the cleaner, the manager — hears it and does their own job. Each listener gets **its own copy**.

> [!ANALOGY]
> A queue is a ticket rail where each order is taken by one cook; a topic is an announcement that every interested person hears.
>
> **Where the analogy breaks:** in a kitchen, a ticket taken by a cook is gone from the rail. In SQS, a received message is only **hidden** for a while; if the consumer does not delete it in time — because it crashed or was slow — the message reappears and may be processed **again**. Messages can arrive twice, and in standard queues, out of order.

## The proper definition and key words

**SQS** is a managed message queue: producers **send** messages, consumers **receive** them, process them and **delete** them. **SNS** is a managed publish-subscribe service: publishers send messages to a **topic**, which delivers a copy to every **subscription** (SQS queues, Lambda functions, HTTPS endpoints, email, SMS).

Key words:

- **Producer / consumer** — the sender and the receiver of messages.
- **Visibility timeout** — how long a received message stays hidden before it becomes visible again.
- **Receive count** — how many times a message has been received.
- **Dead-letter queue (DLQ)** — a queue receiving messages that failed too many times (`maxReceiveCount`).
- **Redrive** — moving messages from a DLQ back to the source queue.
- **Long polling** — waiting up to 20 seconds for messages instead of returning empty immediately.
- **Standard queue** — nearly unlimited throughput, **at-least-once** delivery, best-effort ordering.
- **FIFO queue** — strict ordering within a **message group** and deduplication, with lower throughput.
- **Message attributes** — metadata used by consumers and SNS filter policies.
- **Fan-out** — one message delivered to many consumers through a topic.
- **Filter policy** — rules on a subscription choosing which messages it receives.

## SQS

### Level 1 — Send, receive, delete

```ts
// fragment
import { SQSClient, SendMessageCommand, ReceiveMessageCommand, DeleteMessageCommand } from "@aws-sdk/client-sqs";

const sqs = new SQSClient({ region: "eu-west-2" });
const QueueUrl = "https://sqs.eu-west-2.amazonaws.com/111122223333/orders";

// producer
await sqs.send(new SendMessageCommand({
  QueueUrl,
  MessageBody: JSON.stringify({ type: "order.placed", orderId: "1001", totalPence: 4250 }),
}));

// consumer loop
while (running) {
  const { Messages = [] } = await sqs.send(new ReceiveMessageCommand({
    QueueUrl, MaxNumberOfMessages: 10, WaitTimeSeconds: 20,      // long polling
  }));
  for (const m of Messages) {
    await handleOrder(JSON.parse(m.Body!));                      // must be idempotent
    await sqs.send(new DeleteMessageCommand({ QueueUrl, ReceiptHandle: m.ReceiptHandle! }));
  }
}
```

- **Receiving does not remove** a message. The consumer deletes it **after** successful processing, using the receipt handle from that receive.
- **Long polling** (`WaitTimeSeconds: 20`) waits for messages instead of returning empty responses, which cuts cost and latency.
- Messages can be up to 256 KB; store larger payloads in S3 and send a reference.
- With Lambda as the consumer, the event source mapping does the receiving and deleting for you ({{ch:lambda}}).

### Level 2 — Visibility timeout, redelivery and dead-letter queues

This model of a queue, with a fake clock, shows what happens to messages that fail and to workers that crash:

```ts
// A small model of SQS semantics with a fake clock: visibility timeout, redelivery and a dead-letter queue.
type Msg = { id: string; body: string; receiveCount: number; visibleAt: number };

class Queue {
  messages: Msg[] = [];
  constructor(public name: string, public visibilityTimeout: number, public dlq?: Queue, public maxReceiveCount = 3) {}
  send(id: string, body: string) { this.messages.push({ id, body, receiveCount: 0, visibleAt: 0 }); }
  receive(now: number): Msg | undefined {
    const m = this.messages.find((x) => x.visibleAt <= now);
    if (!m) return undefined;
    if (this.dlq && m.receiveCount >= this.maxReceiveCount) {           // received too often: move to the DLQ
      this.messages = this.messages.filter((x) => x !== m);
      this.dlq.messages.push({ ...m, visibleAt: 0 });
      return this.receive(now);
    }
    m.receiveCount++;
    m.visibleAt = now + this.visibilityTimeout;                          // hidden from other consumers, not deleted
    return m;
  }
  delete(m: Msg) { this.messages = this.messages.filter((x) => x !== m); }
}

const dlq = new Queue("orders-dlq", 30);
const orders = new Queue("orders", 30, dlq, 3);
orders.send("m-1", "order 1001");
orders.send("m-2", "order 1002 (corrupt)");
orders.send("m-3", "order 1003");

const processed = new Set<string>();
let crashedOnce = false;
for (let now = 0; now <= 150; now += 10) {
  const m = orders.receive(now);
  if (!m) continue;
  let outcome: string;
  if (m.body.includes("corrupt")) outcome = "failed (not deleted)";
  else if (m.id === "m-3" && !crashedOnce) { crashedOnce = true; processed.add(m.id); outcome = "processed, then worker crashed before deleting"; }
  else if (processed.has(m.id)) { orders.delete(m); outcome = "duplicate, skipped and deleted"; }
  else { processed.add(m.id); orders.delete(m); outcome = "processed and deleted"; }
  console.log(`t=${String(now).padStart(3)}s  ${m.id} receive #${m.receiveCount}: ${outcome}`);
}
console.log(`left in orders: ${orders.messages.length}, in DLQ: ${dlq.messages.map((m) => m.id).join(", ")}`);

// SNS fan-out with filter policies: one published event, delivered to each matching subscriber queue
type Sub = { queue: string; filter?: Record<string, string[]> };
const subscriptions: Sub[] = [
  { queue: "email-confirmations" },
  { queue: "warehouse-picking", filter: { delivery: ["shipping"] } },
  { queue: "fraud-checks", filter: { paymentMethod: ["card"], country: ["GB", "IE"] } },
];
function publish(attrs: Record<string, string>) {
  const to = subscriptions.filter((s) => !s.filter || Object.entries(s.filter).every(([k, allowed]) => allowed.includes(attrs[k] ?? "")));
  console.log(`publish ${JSON.stringify(attrs)} -> ${to.map((s) => s.queue).join(", ")}`);
}
publish({ delivery: "shipping", paymentMethod: "card", country: "GB" });
publish({ delivery: "collect", paymentMethod: "voucher", country: "GB" });
```

**Output:**

```text
t=  0s  m-1 receive #1: processed and deleted
t= 10s  m-2 receive #1: failed (not deleted)
t= 20s  m-3 receive #1: processed, then worker crashed before deleting
t= 40s  m-2 receive #2: failed (not deleted)
t= 50s  m-3 receive #2: duplicate, skipped and deleted
t= 70s  m-2 receive #3: failed (not deleted)
left in orders: 0, in DLQ: m-2
publish {"delivery":"shipping","paymentMethod":"card","country":"GB"} -> email-confirmations, warehouse-picking, fraud-checks
publish {"delivery":"collect","paymentMethod":"voucher","country":"GB"} -> email-confirmations
```

- A received message is **hidden** for the visibility timeout (30 seconds here). If it is not deleted in that time, it **becomes visible again** and is redelivered — this is how SQS survives crashed consumers.
- **m-3** was processed, but the worker crashed before deleting it, so it came back. Because the consumer recorded processed IDs, the second delivery was recognised as a **duplicate** and skipped. Real consumers do this with a database table and a unique constraint, or with conditional writes — **idempotency** is the only defence, because SQS standard queues guarantee **at-least-once** delivery ({{ch:queues}}).
- **m-2** failed every time. After `maxReceiveCount` (3) receives, SQS moved it to the **dead-letter queue** instead of retrying forever and blocking capacity. A DLQ needs an **alarm**, someone who looks at its messages, and a **redrive** after the bug is fixed.
- Set the **visibility timeout longer than the longest processing time** (for Lambda consumers, at least six times the function timeout). Too short, and messages are processed twice while still in progress; consumers can extend it with `ChangeMessageVisibility` for long jobs.
- **Delay queues** and per-message delays postpone delivery (up to 15 minutes) — useful for simple retry-with-delay patterns.

### Level 3 — Standard or FIFO?

| | Standard queue | FIFO queue |
|---|---|---|
| Delivery | At least once (occasionally duplicated) | Exactly-once **processing** within a 5-minute deduplication window |
| Order | Best effort | Strict within a **message group ID** |
| Throughput | Nearly unlimited | High, but limited per group and per queue (higher with high-throughput mode) |
| Use when | Order does not matter; idempotent consumers (most cases) | Order matters per entity: events for one order, one account |

- FIFO orders messages **per message group** (for example `MessageGroupId = orderId`): different orders are processed in parallel, while events for one order stay in sequence.
- A failing message **blocks its group** until it succeeds or moves to the DLQ.
- Deduplication uses a deduplication ID (or a content hash) within five minutes — it does not replace idempotent consumers for longer windows or side effects.

## SNS

### Level 2 — Fan-out with topics and filters

```text
 checkout ──publish "order.placed"──► SNS topic "orders"
                                          ├──► SQS email-confirmations   (all messages)
                                          ├──► SQS warehouse-picking     (delivery = shipping)
                                          └──► SQS fraud-checks          (card payments from GB or IE)
```

- The **SNS → SQS fan-out** pattern gives each consumer **its own queue**: it can be slow, fail and retry, or be paused for maintenance without affecting the others; the topic does not need to know who listens.
- **Filter policies** on subscriptions choose messages by attributes (or by the message body). In the example's last two lines, the shipping card order reached all three queues, while the click-and-collect voucher order went only to email confirmations.
- Subscribers can also be Lambda functions, HTTPS endpoints, email or SMS; for application events, SQS subscribers are the most robust.
- Enable **raw message delivery** to SQS to avoid the SNS envelope, and set a DLQ on subscriptions for failed deliveries.
- **SNS FIFO topics** with FIFO queues preserve ordering through fan-out.

### Level 3 — SNS, SQS or EventBridge?

| Need | Use |
|---|---|
| A work queue for one consumer service | SQS |
| The same message to several services | SNS → SQS queues |
| Routing many event types by content, from many sources, including AWS and SaaS events; schemas, archives and replay | **EventBridge** ({{ch:event-driven-systems}}) |
| Ordered processing per key with replay and high throughput streams | Kinesis or Kafka (MSK) ({{ch:message-brokers}}) |
| Multi-step workflows with waits and compensation | Step Functions |

## Messaging in production

### Level 3 — Message design

- Include a **type**, a **unique event ID**, the **time**, and the data consumers need (or IDs to look it up): `{ "type": "order.placed", "id": "evt-…", "occurredAt": "…", "orderId": "1001" }`.
- **Version** message formats and keep changes backwards compatible: add fields, do not rename or remove them while consumers depend on them ({{ch:api-versioning}}).
- **The outbox pattern**: writing to the database and sending a message are two separate systems. To avoid "order saved but message lost" (or the reverse), write the event to an **outbox table** in the same transaction as the order, and have a separate process publish outbox rows ({{ch:transactions}}).

### Level 3 — Scaling consumers

- Scale workers on **queue depth per worker** or on the **age of the oldest message** — not CPU ({{ch:auto-scaling}}).
- Lambda consumers scale automatically; cap them with maximum concurrency on the event source mapping when the downstream system has limits.
- Queues are **buffers**: during spikes, messages wait instead of overloading the database. Make sure the backlog is cleared before messages expire (retention: 4 days by default, up to 14).

### Level 4 — Monitoring and operations

- **`ApproximateAgeOfOldestMessage`** — the best single alarm: messages are waiting too long, so consumers are failing or too slow.
- **`ApproximateNumberOfMessagesVisible`** — backlog size; trends show whether consumers keep up.
- **DLQ size greater than zero** — alarm on it, always ({{ch:cloudwatch}}).
- **Redrive** messages from the DLQ back to the source queue after fixing the cause (the console and API support it).
- Log message IDs and event IDs, and propagate **correlation IDs** so a request can be traced across services ({{ch:logging}}).

### Level 4 — Security

- **Least privilege**: producers get `sqs:SendMessage` (or `sns:Publish`) on specific queues or topics; consumers get receive, delete and change-visibility ({{ch:iam}}).
- **Queue and topic policies** allow SNS topics or other accounts to send — restrict them with `aws:SourceArn` conditions so only your topic can write to your queue.
- **Encryption** at rest (SSE-SQS or SSE-KMS) and TLS in transit; with KMS, producers and SNS need permission to use the key.
- **VPC endpoints** keep traffic private ({{ch:vpc}}).
- Treat message content as **untrusted input** and validate it ({{ch:validation}}).

## From beginner to enterprise

**Level 1–2 — first queues.** Sending, receiving with long polling, deleting after processing; visibility timeout; DLQs with alarms; SNS topics fanning out to SQS queues.

**Level 3 — reliable messaging.** Idempotent consumers; standard versus FIFO by need; filter policies; message design with types, IDs and versions; the outbox pattern; scaling on backlog and age.

**Level 4 — production operations.** Alarms on oldest message age and DLQ size; redrive procedures; least-privilege queue policies with source conditions; encryption; correlation IDs.

**Level 5 — senior practice.** Choosing between SQS, SNS, EventBridge and streams; designing event contracts across teams; back-pressure and buffering strategies.

**Level 6 — enterprises.** Organisation-wide event buses and schemas, cross-account messaging patterns, governance of event ownership.

## Real-world use cases

### Checkout without waiting

- **Design**: checkout commits the order and an outbox row in one transaction; a publisher sends `order.placed` to an SNS topic; email, warehouse, analytics and loyalty services each have their own SQS queue with a DLQ. Checkout latency fell, and an email provider outage no longer affected orders — emails simply waited in their queue.

### The duplicated refunds

- **What happened**: a refund worker's visibility timeout was 30 seconds, but refunds sometimes took 45 seconds when the payment provider was slow. The message reappeared and a second worker refunded the same order again.
- **Fix**: visibility timeout well above the slowest processing time; an idempotency key per refund at the payment provider; a unique constraint on refunds per order.

## Common mistakes

### Beginner: deleting before processing

**Consequence:** messages lost when processing fails. **Fix:** delete only after success.

### Beginner: no DLQ

**Consequence:** poison messages retried forever, or silently expiring. **Fix:** a DLQ with an alarm on every queue.

### Beginner: short polling

**Consequence:** many empty, billed requests. **Fix:** `WaitTimeSeconds: 20`.

### Intermediate: non-idempotent consumers

**Consequence:** duplicate emails, charges and records. **Fix:** idempotency keys and unique constraints.

### Intermediate: visibility timeout shorter than processing

**Consequence:** concurrent duplicate processing. **Fix:** longer timeouts or heartbeats with `ChangeMessageVisibility`.

### Intermediate: one queue shared by several consumer services

**Consequence:** each message goes to only one of them. **Fix:** SNS fan-out to one queue per service.

### Production: saving to the database and publishing separately

**Consequence:** lost or phantom events. **Fix:** the outbox pattern.

## Debugging and troubleshooting

- **Messages processed twice**: visibility timeout too short, consumer crashes after processing but before deleting, or standard-queue duplicates — check idempotency.
- **Messages "disappearing"**: deleted before processing, moved to the DLQ, or expired past the retention period.
- **Backlog growing**: consumers failing (check logs and DLQ), too few consumers, or a slow downstream system.
- **FIFO queue stuck**: a failing message is blocking its message group.
- **SNS messages not arriving in SQS**: the queue policy does not allow the topic, the KMS key does not allow SNS, or the filter policy excludes them.
- **Access denied**: IAM policies plus queue or topic resource policies and KMS key policies.

## Security summary

- **Least-privilege** send and consume permissions per service.
- **Resource policies** with source conditions for SNS-to-SQS and cross-account access.
- **Encryption** at rest and in transit; KMS key policies for producers and SNS.
- **No sensitive data in messages** unless necessary and encrypted; references to protected stores instead.
- **Validate messages** as untrusted input.

## How a senior engineer thinks about this

- **Decouple with messages.** Callers should not wait for work that can happen later.
- **Assume duplicates and disorder.** Idempotent consumers, ordering only where it is truly needed.
- **Every queue has a DLQ and an alarm.** Failures must be visible.
- **One queue per consumer.** Fan out through topics.
- **Events are contracts.** Version them and keep them backwards compatible.

## Exercises

### Exercise 1 — Choose the queue

**Objective:** practise SQS design choices.
**What to do:** choose standard or FIFO, and explain: (a) sending marketing emails; (b) applying balance changes to customer wallets, which must happen in order per wallet; (c) generating thumbnails for uploaded images.

<details>
<summary>Show the solution</summary>

- (a) **Standard** — order does not matter; idempotency prevents duplicate emails.
- (b) **FIFO** with `MessageGroupId = walletId` — changes stay in order per wallet while wallets are processed in parallel; consumers still idempotent (a unique transaction ID).
- (c) **Standard** — order does not matter, and generating a thumbnail twice is harmless.

</details>

### Exercise 2 — Fix the consumer

**Objective:** practise correct consumption.
**The code:** a worker receives up to 10 messages with short polling, deletes all of them immediately, then processes them one by one; the queue has a 10-second visibility timeout and no DLQ. Processing takes up to 40 seconds. List the problems and fixes.

<details>
<summary>Show the solution</summary>

1. **Deleting before processing** loses messages when processing fails — delete each message only after it succeeds.
2. **Short polling** wastes requests — use `WaitTimeSeconds: 20`.
3. **10-second visibility timeout** with 40-second processing — once deletion moves after processing, messages would reappear and be processed again; set it above the maximum (for example 120 seconds) or extend it while working.
4. **No DLQ** — add one with `maxReceiveCount` (for example 5) and an alarm.
5. Make processing **idempotent**, since redelivery can still happen.

</details>

### Exercise 3 — Production scenario: the growing backlog

**Objective:** practise operating queues.
**The scenario:** the `ApproximateAgeOfOldestMessage` alarm for the warehouse queue fires: the oldest message is 3 hours old and the backlog is 80,000 messages. The DLQ is empty. Consumers are running. What do you check and do?

<details>
<summary>Show the solution</summary>

1. **Are consumers processing at all?** Check their logs and metrics: successful deletes per minute. An empty DLQ means messages are not failing repeatedly — so consumers may be slow, stuck, or receiving and timing out without errors.
2. **Downstream**: is the warehouse system or database slow or rate-limiting? Consumers waiting on it would explain slow throughput.
3. **Visibility timeout**: if processing takes longer than the timeout, messages keep reappearing and work is repeated without progress.
4. **Capacity**: scale consumers up if the downstream system can take more; otherwise accept a slower drain and tell stakeholders.
5. **Retention**: make sure the backlog will be processed before messages expire (raise retention if necessary).
6. Afterwards: autoscaling on backlog per worker, alarms on age at a lower threshold, and a runbook.

</details>

## Summary

**Messaging** decouples services: producers send and carry on, consumers process in their own time with retries. **SQS** queues deliver each message to one consumer: **receive** hides it for the **visibility timeout**, **delete** removes it after success, and messages not deleted reappear — so delivery is **at least once** and consumers must be **idempotent**. **Long polling** cuts cost; **dead-letter queues** catch messages that fail `maxReceiveCount` times, and need alarms and **redrive**. **Standard** queues give near-unlimited throughput with best-effort order; **FIFO** queues order messages per **message group** and deduplicate within five minutes.

**SNS** topics **fan out** each message to every subscription — usually one SQS queue per consumer service — with **filter policies** choosing what each receives; **EventBridge** adds content-based routing across many sources, schemas and replay. Design messages with types, unique IDs and versions, use the **outbox pattern** to publish reliably from database transactions, scale consumers on backlog and message age, alarm on the oldest message's age and DLQ size, and secure queues and topics with least-privilege policies, source conditions and encryption.

## Key terms

- **Message queue** — A buffer where producers put messages for consumers to process.
- **SQS** — Amazon Simple Queue Service, AWS's managed message queue.
- **SNS** — Amazon Simple Notification Service, AWS's managed publish-subscribe service.
- **Producer / consumer** — The sender and the processor of messages.
- **Topic** — A channel that delivers each published message to all subscribers.
- **Subscription** — A destination attached to a topic.
- **Fan-out** — Delivering one message to many consumers.
- **Visibility timeout** — How long a received message stays hidden from other consumers.
- **Receipt handle** — The token used to delete or change a received message.
- **At-least-once delivery** — A guarantee that messages arrive, possibly more than once.
- **Idempotent consumer** — A consumer for which processing a message twice has the same effect as once.
- **Dead-letter queue** — A queue that receives messages that failed too many times.
- **maxReceiveCount** — The number of receives before a message moves to the DLQ.
- **Redrive** — Moving messages from a DLQ back to their source queue.
- **Long polling** — Waiting for messages to arrive instead of returning empty responses.
- **Standard queue** — An SQS queue with high throughput and best-effort ordering.
- **FIFO queue** — An SQS queue with ordered, deduplicated delivery per message group.
- **Message group ID** — The key that defines ordering in FIFO queues.
- **Filter policy** — Rules that decide which messages a subscription receives.
- **Outbox pattern** — Storing events in the database transaction and publishing them separately.
- **EventBridge** — AWS's event bus service for routing events by content.

## What comes next

Messages, functions and services all need credentials: database passwords, API keys, signing keys. The next chapter, {{ch:secrets-manager}}, covers storing, retrieving and rotating secrets safely with AWS Secrets Manager and Parameter Store.
