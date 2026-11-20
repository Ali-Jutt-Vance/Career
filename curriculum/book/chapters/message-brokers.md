# Message Brokers

> [!GOALS]
> - Explain what a message broker does and the two main models: **message queues** and **distributed logs**.
> - Understand **RabbitMQ**-style exchanges and queues and **Kafka**-style topics, partitions, offsets and consumer groups.
> - Reason about **delivery guarantees** — at most once, at least once, effectively once — and **ordering**.
> - Handle failures: acknowledgements, retries, dead-letter queues, poison messages, consumer lag and back-pressure.
> - Choose between RabbitMQ, Kafka, cloud queues and streams for a given problem.

## Why this matters

Services that call each other directly are tightly coupled: the caller waits, fails when the other service is down, and must know who to call. **Message brokers** let services communicate asynchronously through messages — the producer hands a message to the broker and moves on; consumers process it when they can. This absorbs traffic spikes, isolates failures, lets new consumers join without changing producers, and makes long-running work possible outside the request path.

{{ch:queues}} showed job queues inside an application, and {{ch:sns-sqs}} AWS's managed queues and topics. At larger scale, two broker families dominate: **RabbitMQ** (and similar message queues) and **Apache Kafka** (and similar logs, including AWS Kinesis and Redpanda). They look similar from a distance and behave very differently. Choosing the wrong one, or using one as if it were the other, leads to lost messages, duplicated work and painful rewrites.

## The simple idea

A **message queue** is like a post office's sorting room: letters arrive, are sorted into pigeonholes, and each letter is handed to **one** postman, who delivers it; the letter is then gone from the post office.

A **log** is like a newspaper archive: every edition is kept in order on the shelf. Any number of readers can come and read from wherever they stopped last time, or start again from the first edition. The archive does not care who has read what — each reader keeps a bookmark.

> [!ANALOGY]
> A message queue is like a post office handing each letter to one postman; a log is like a newspaper archive where every reader keeps their own bookmark and can reread old editions.
>
> **Where the analogy breaks:** a postman either delivers a letter or does not. Software consumers can crash **after** doing the work but **before** confirming it — so the broker hands the message out again, and it is processed twice. Every real broker delivers some messages more than once; consumers must be built for it.

## The proper definition and key words

A **message broker** is middleware that receives messages from **producers** and delivers them to **consumers**, storing them durably in between. **Message queues** deliver each message to one consumer and remove it once **acknowledged**. **Distributed logs** append messages to ordered, persistent **partitions** that consumers read at their own **offsets**.

Key words:

- **Producer / consumer** — sender / receiver.
- **Queue** — a buffer of messages, each consumed once.
- **Exchange and binding** (RabbitMQ) — routing rules from exchanges (direct, topic, fanout, headers) to queues.
- **Topic** (Kafka) — a named stream of records, split into **partitions**.
- **Partition** — an ordered, append-only log; the unit of parallelism and ordering.
- **Offset** — a record's position in a partition; consumers commit offsets to remember progress.
- **Consumer group** — consumers sharing the work of a topic; each partition is read by one member.
- **Acknowledgement (ack)** — a consumer confirming it has processed a message.
- **Retention** — how long a log keeps records (hours, days, forever, or compacted).
- **Consumer lag** — how far a consumer is behind the end of the log.
- **Dead-letter queue (DLQ)** — where messages go after failing repeatedly.
- **Delivery semantics** — at most once, at least once, exactly once (effectively once).

## Two models

### Level 1 — Queues versus logs

| | Message queue (RabbitMQ, SQS, ActiveMQ) | Distributed log (Kafka, Kinesis, Redpanda, Pulsar) |
|---|---|---|
| After consumption | Message removed when acknowledged | Record stays until retention expires |
| Multiple consumers | Compete for messages; fan-out needs several queues | Any number of consumer groups read everything independently |
| Ordering | Per queue, weakened by parallel consumers and redelivery | Strict **within a partition** |
| Replay | Not possible once consumed | Rewind offsets and reprocess history |
| Routing | Rich: exchanges, routing keys, priorities, per-message TTL | Simple: topic and partition key |
| Typical use | Task queues, commands, work distribution, RPC-style request/reply | Event streams, event sourcing, analytics pipelines, change data capture, very high throughput |

A quick rule: **"do this job"** fits a queue; **"this happened"**, read by many systems now and later, fits a log.

### Level 2 — Partitions, offsets and consumer groups

This model of a Kafka-style topic shows the key ideas:

```ts
// A tiny model of a log-based broker (Kafka-style): a topic is split into partitions; each partition
// is an append-only log. Messages with the same key always go to the same partition, so they stay ordered.
type Rec = { offset: number; key: string; value: string };
const partitions: Rec[][] = [[], [], []];
const partitionFor = (key: string) => [...key].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 0) % partitions.length;

function produce(key: string, value: string) {
  const p = partitions[partitionFor(key)]!;
  p.push({ offset: p.length, key, value });
}
for (const [order, event] of [["o-1", "placed"], ["o-2", "placed"], ["o-1", "paid"], ["o-3", "placed"], ["o-2", "paid"], ["o-1", "shipped"]]) produce(order!, event!);
partitions.forEach((p, i) => console.log(`partition ${i}: ${p.map((r) => `${r.offset}:${r.key}/${r.value}`).join("  ")}`));

// Consumer groups: each group reads the whole topic; within a group, each partition has one consumer.
// The broker keeps no "deleted" flag — each group just remembers its position (offset) per partition.
type Group = { name: string; consumers: string[]; offsets: number[] };
function assign(g: Group) {
  return partitions.map((_, i) => g.consumers[i % g.consumers.length]!);
}
function poll(g: Group) {
  const owners = assign(g);
  const seen: string[] = [];
  partitions.forEach((p, i) => {
    for (const r of p.slice(g.offsets[i]!)) seen.push(`${owners[i]}<-p${i}:${r.key}/${r.value}`);
    g.offsets[i] = p.length;                       // commit the new offset
  });
  return seen;
}
const shipping: Group = { name: "shipping", consumers: ["ship-A", "ship-B"], offsets: [0, 0, 0] };
const analytics: Group = { name: "analytics", consumers: ["stats-1"], offsets: [0, 0, 0] };
console.log("shipping group: ", poll(shipping).join(" "));
console.log("analytics group:", poll(analytics).length, "records (the same records, independently)");

produce("o-3", "paid");
console.log("after a new event, shipping reads only:", poll(shipping).join(" "));

// Replay: a bug in analytics is fixed, so it rewinds its offsets and reprocesses history
analytics.offsets = [0, 0, 0];
console.log("analytics replay:", poll(analytics).length, "records");
```

**Output:**

```text
partition 0: 0:o-3/placed
partition 1: 0:o-1/placed  1:o-1/paid  2:o-1/shipped
partition 2: 0:o-2/placed  1:o-2/paid
shipping group:  ship-A<-p0:o-3/placed ship-B<-p1:o-1/placed ship-B<-p1:o-1/paid ship-B<-p1:o-1/shipped ship-A<-p2:o-2/placed ship-A<-p2:o-2/paid
analytics group: 6 records (the same records, independently)
after a new event, shipping reads only: ship-A<-p0:o-3/paid
analytics replay: 7 records
```

- **Keys choose partitions**: every event for order `o-1` landed in partition 1, in order — placed, paid, shipped. Ordering is guaranteed **per partition only**, so use the entity whose events must stay in order (order ID, account ID) as the key.
- **Partitions are the unit of parallelism**: within the `shipping` group, `ship-A` owned partitions 0 and 2 and `ship-B` partition 1. A group can have at most as many active consumers as partitions; choose partition counts for future throughput.
- **Groups are independent**: `analytics` read the same six records without affecting `shipping`. Adding a new consumer system needs no change to producers.
- **Offsets are bookmarks**: after a new event, shipping read only the new record. A group that crashes resumes from its last committed offset.
- **Replay**: after fixing a bug, analytics rewound its offsets and reprocessed all seven records — impossible with a queue that deletes consumed messages.
- When consumers join or leave a group, the broker **rebalances** partitions between them; processing pauses briefly, and in-flight records may be processed again.

### Level 2 — RabbitMQ-style routing

```text
 producer ──"order.placed.gb"──► topic exchange "orders"
                                   ├─ binding "order.placed.*"  ──► queue email-confirmations ──► email workers
                                   ├─ binding "order.*.gb"      ──► queue uk-fulfilment       ──► warehouse workers
                                   └─ binding "#"               ──► queue audit                ──► audit writer
```

- Producers publish to an **exchange** with a **routing key**; **bindings** copy messages into matching queues (`*` matches one word, `#` zero or more).
- Each queue's messages are shared among its consumers (**competing consumers**); **prefetch** limits how many unacknowledged messages each consumer holds, giving back-pressure and fair distribution.
- Features suited to task processing: per-message TTL, priority queues, delayed retries, **quorum queues** for replicated durability.

## Guarantees and failures

### Level 3 — Delivery semantics

- **At most once**: acknowledge (or commit the offset) **before** processing. Fast, but a crash loses the message. Acceptable for some metrics or telemetry.
- **At least once**: acknowledge **after** processing. A crash after processing but before the acknowledgement causes **redelivery**. The normal choice — combined with idempotent consumers.
- **Exactly once**: the broker cannot know whether your side effects (an email, a payment, a row in another database) happened. Kafka's transactions give exactly-once **within Kafka** (read, process, write to Kafka atomically); for external effects, the practical goal is **effectively once**: at-least-once delivery plus **idempotent** processing — a processed-message table with a unique constraint, conditional writes, or idempotency keys at the payment provider ({{ch:queues}}).

### Level 3 — Ordering

- Ordering only holds within one queue with one consumer, or one partition. Parallel consumers, retries and redeliveries reorder messages.
- Choose the **narrowest** ordering you need — per order or per account — and partition by that key; global ordering forces one partition and kills throughput.
- Design consumers to tolerate **out-of-order** events where possible: include versions or timestamps and ignore older updates ("last writer wins by version").

### Level 3 — Failures and poison messages

- **Retries with backoff**: a failing message should not be retried in a tight loop. Queues use delayed redelivery; with logs, a common pattern is retry topics with increasing delays (`orders.retry.1m`, `orders.retry.10m`).
- **Poison messages** — ones that always fail (bad data, a bug) — must go to a **DLQ** after a limited number of attempts. In a log, one stuck record **blocks its whole partition** if the consumer keeps retrying it.
- **Consumer lag** is the key health metric for logs: rising lag means consumers are falling behind; alarm on it, and on DLQ size ({{ch:monitoring}}).
- **Back-pressure**: brokers buffer bursts, but buffers are finite — retention limits for logs, memory and disk limits for queues. Scale consumers or slow producers before limits are reached.

### Level 4 — Producing reliably

- **Durability settings**: Kafka producers with `acks=all` and replication factor 3 (with a minimum of 2 in-sync replicas) do not lose acknowledged records when a broker fails; RabbitMQ quorum queues with publisher confirms do the same for queues.
- **Idempotent producers** (Kafka) avoid duplicates from producer retries.
- **The dual-write problem**: writing to a database and publishing a message are two systems; if one succeeds and the other fails, data and events disagree. The **transactional outbox** writes the event to an outbox table in the same database transaction and a relay publishes it; **change data capture** turns committed database changes into events ({{ch:event-driven-systems}}).

## Choosing a broker

### Level 4 — A decision guide

| Need | Good fit |
|---|---|
| Background jobs inside one application | A library queue on Redis or the database ({{ch:queues}}) |
| Simple managed work queues and fan-out on AWS | SQS and SNS ({{ch:sns-sqs}}) |
| Rich routing, priorities, request/reply, moderate throughput | RabbitMQ (or Amazon MQ) |
| Event streams read by many systems, replay, very high throughput, CDC | Kafka (Amazon MSK, Confluent) or Kinesis |
| Routing events across AWS services and SaaS by content | EventBridge |

Operational cost matters as much as features: a self-run Kafka cluster needs expertise; managed services trade money for that work. Many organisations use more than one — SQS for jobs, Kafka for the event backbone.

## From beginner to enterprise

**Level 1–2 — first messaging.** Queues versus logs; producers, consumers and acknowledgements; RabbitMQ exchanges and bindings; Kafka topics, partitions, offsets and consumer groups.

**Level 3 — reliable consumption.** At-least-once with idempotent consumers; ordering by key; retries with backoff; DLQs; monitoring consumer lag and queue depth.

**Level 4 — reliable production.** Durable producer settings; idempotent producers; transactional outbox and CDC; capacity planning for partitions and retention.

**Level 5 — senior practice.** Choosing brokers by semantics and operations; designing event contracts and schemas; replay and reprocessing strategies.

**Level 6 — enterprises.** Event platforms shared by many teams, schema registries, multi-region replication of topics, governance of event ownership.

## Real-world use cases

### Orders as an event stream

- **Design**: the order service writes orders and an outbox row in one transaction; a relay publishes `order.*` events to a Kafka topic partitioned by order ID; shipping, email, analytics and fraud services each consume with their own group. When analytics shipped a bug, it fixed the code and replayed a week of events.

### Image processing with RabbitMQ

- **Design**: uploads produce `resize` jobs into a quorum queue; twenty workers with prefetch 1 compete for jobs; failures retry with delays and end in a DLQ after five attempts; a priority queue handles paying customers first.

## Common mistakes

### Beginner: acknowledging before processing

**Consequence:** messages lost on crashes. **Fix:** acknowledge after processing.

### Beginner: non-idempotent consumers

**Consequence:** duplicate emails and charges. **Fix:** idempotency keys and processed-message tracking.

### Intermediate: expecting global ordering

**Fix:** order per key; design for out-of-order events.

### Intermediate: too few partitions

**Consequence:** consumers cannot scale beyond the partition count. **Fix:** plan partitions for future throughput.

### Intermediate: poison messages blocking a partition

**Fix:** limited retries, retry topics and DLQs.

### Production: dual writes to database and broker

**Consequence:** lost or phantom events. **Fix:** outbox or CDC.

### Production: using Kafka as a job queue with per-message acknowledgements, or RabbitMQ as a long-term event store

**Fix:** pick the model that matches the problem.

## Debugging and troubleshooting

- **Consumer lag growing**: slow processing, too few consumers or partitions, a poison message blocking a partition, or rebalancing storms.
- **Duplicates**: redeliveries after crashes or rebalances — check idempotency.
- **Out-of-order processing**: wrong partition key, retries, or several consumers on one queue.
- **Messages "missing"**: acknowledged before processing, expired by TTL or retention, routed to no queue (unbound routing keys), or in the DLQ.
- **Frequent rebalances**: consumers exceeding the poll interval because processing takes too long; increase limits or process asynchronously within the consumer.

## Security summary

- **Authenticate and authorise** producers and consumers per topic or queue (SASL, mTLS, IAM for managed services).
- **Encrypt** in transit (TLS) and at rest.
- **Validate messages** as untrusted input; use schemas.
- **Avoid sensitive data in events** where possible; logs with long retention keep it for a long time — plan for deletion requirements.
- **Restrict replays and offset resets** in production.

## How a senior engineer thinks about this

- **Commands go to queues, facts go to logs.**
- **At-least-once plus idempotency is the real-world contract.**
- **Order only what must be ordered**, by the right key.
- **Every consumer needs a failure path**: retries, DLQs and alarms on lag.
- **The event is a contract.** Schemas, versions and ownership matter as much as the broker.

## Exercises

### Exercise 1 — Queue or log?

**Objective:** practise choosing a model.
**What to do:** choose a queue or a log for (a) sending password-reset emails; (b) recording every change to customer accounts for analytics, audit and three other services; (c) distributing video encoding jobs to workers; (d) streaming click events for real-time dashboards.

<details>
<summary>Show the solution</summary>

- (a) **Queue** — a job done once by one worker.
- (b) **Log** — facts read by many independent consumers, with replay and audit.
- (c) **Queue** — work distribution with acknowledgements, retries and perhaps priorities.
- (d) **Log** — high-volume events consumed by several systems, possibly replayed.

</details>

### Exercise 2 — Design the partition key

**Objective:** practise ordering and parallelism.
**What to do:** a bank publishes account transactions to a Kafka topic. Balances are computed by consumers. What should the partition key be, and what goes wrong with (a) no key (round robin) and (b) the bank branch as the key?

<details>
<summary>Show the solution</summary>

Use the **account ID**: all transactions of an account stay in order in one partition, and accounts are spread across partitions for parallelism.

- (a) **No key**: one account's transactions land in different partitions and may be processed out of order — a withdrawal before the deposit that funded it.
- (b) **Branch**: order is preserved, but large branches create **hot partitions** and limit parallelism to the number of branches.

</details>

### Exercise 3 — Production scenario: the stuck consumer

**Objective:** practise broker operations.
**The scenario:** the `shipping` consumer group's lag on partition 7 has grown for an hour, while other partitions are fine. Logs show the same record failing every few seconds with a parsing error. What is happening and what do you do?

<details>
<summary>Show the solution</summary>

A **poison message** on partition 7 is retried forever, blocking every later record in that partition.

**Now**: move the record aside — publish it to a DLQ topic with the error, commit the offset past it, and let the consumer continue. Inform the producer's owners.

**Then**: change the consumer to retry a limited number of times (or via retry topics) and dead-letter automatically; add schema validation at producers; alarm on per-partition lag and DLQ size; write a runbook for inspecting and replaying dead-lettered records after a fix.

</details>

## Summary

**Message brokers** decouple services: producers hand messages to the broker and continue; consumers process them asynchronously. **Message queues** (RabbitMQ, SQS) deliver each message to one consumer and delete it on **acknowledgement**, with rich routing through **exchanges** and **bindings** and competing consumers controlled by prefetch. **Distributed logs** (Kafka, Kinesis) append records to ordered **partitions**; records are kept for a retention period, **consumer groups** read independently using **offsets**, partitions are the unit of ordering and parallelism, and history can be **replayed**.

Delivery in practice is **at least once**; "exactly once" for external effects means **idempotent** consumers. Ordering holds only within a partition or single-consumer queue, so key by the entity whose order matters and tolerate out-of-order events elsewhere. Handle failures with backoff retries, **DLQs** for **poison messages**, and alarms on **consumer lag** and queue depth; produce reliably with durable acknowledgements, idempotent producers and the **transactional outbox** or CDC. Choose queues for jobs and commands, logs for shared event streams and replay, managed services where operations matter, and different tools for different jobs.

## Key terms

- **Message broker** — Middleware that stores and delivers messages between producers and consumers.
- **Message queue** — A broker model where each message is consumed once and then removed.
- **Distributed log** — A broker model of ordered, retained, append-only partitions.
- **Exchange** — A RabbitMQ component that routes messages to queues.
- **Binding** — A rule connecting an exchange to a queue.
- **Routing key** — A message attribute used by exchanges to route.
- **Competing consumers** — Several consumers sharing one queue's messages.
- **Prefetch** — The number of unacknowledged messages a consumer may hold.
- **Topic** — A named stream of records in a log-based broker.
- **Partition** — An ordered, append-only segment of a topic.
- **Offset** — A record's position in a partition.
- **Consumer group** — A set of consumers that share a topic's partitions.
- **Rebalance** — Redistributing partitions among a group's consumers.
- **Retention** — How long a log keeps records.
- **Consumer lag** — How far a consumer is behind the latest record.
- **Acknowledgement** — A consumer's confirmation that a message was processed.
- **At-most-once / at-least-once delivery** — Possible loss without duplicates / no loss with possible duplicates.
- **Effectively-once processing** — At-least-once delivery combined with idempotent processing.
- **Poison message** — A message that fails every time it is processed.
- **Transactional outbox** — Recording events in the database transaction and publishing them separately.
- **Replay** — Reprocessing past records by resetting offsets.

## What comes next

Brokers carry messages; **event-driven architecture** is the way of designing systems around them. The next chapter, {{ch:event-driven-systems}}, covers events versus commands, choreography and orchestration, sagas for multi-step business processes, event sourcing, CQRS and how to keep event-driven systems understandable.
