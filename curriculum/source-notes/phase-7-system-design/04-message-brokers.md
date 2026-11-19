# Phase 7 — Chapter 4: Message Brokers

---

## Chapter Overview

A message broker is middleware that enables asynchronous communication between services. Instead of Service A calling Service B directly (tight coupling), A sends a message to the broker and B reads it in its own time. This decouples producers from consumers.

**Topics:**
- Message broker fundamentals (queue vs. topic vs. stream)
- Apache Kafka architecture (topics, partitions, consumer groups)
- RabbitMQ (AMQP, exchanges, queues, bindings)
- AWS SQS/SNS
- When to use each broker
- Delivery guarantees (at-most-once, at-least-once, exactly-once)
- Message ordering

---

## Core Concepts

### Queue vs. Topic vs. Stream

```
Queue (Point-to-Point):
  Producer sends → one queue → one consumer receives
  Each message consumed by exactly ONE consumer
  Used for: job queues, work distribution
  Examples: SQS Standard, RabbitMQ queues

Topic (Publish-Subscribe):
  Producer sends → one topic → ALL subscribers receive a copy
  Each subscriber gets its own copy of every message
  Used for: event broadcasting, notifications
  Examples: SNS topics, Kafka topics (with separate consumer groups)

Stream (Log-based):
  Append-only log. Consumers read at their own position (offset).
  Messages retained for days/weeks. Can be replayed.
  Each consumer group maintains its own offset independently.
  Used for: event sourcing, analytics, replaying history
  Examples: Kafka, AWS Kinesis, Redis Streams
```

### Delivery Guarantees

```
At-Most-Once (fire-and-forget):
  Message sent once. If delivery fails, it's lost.
  No retry. Fastest.
  Use: non-critical metrics, logging (can tolerate loss)

At-Least-Once (acknowledgment-based):
  Message delivered until consumer ACKs.
  On failure: redelivery. Consumer may see duplicates.
  Most common. Consumers must be idempotent.
  SQS Standard, Kafka with auto-commit disabled.

Exactly-Once:
  Message delivered exactly once, never duplicated.
  Hardest to achieve. Requires transactions.
  Kafka with transactions (EOS — exactly-once semantics).
  SQS FIFO with deduplication ID.
  Use: financial transactions, billing.

In practice:
  Design consumers to be IDEMPOTENT (safe to process message twice).
  Then at-least-once delivery is effectively exactly-once.
  Check for duplicate IDs before processing.
```

---

## Kafka Architecture

```
Broker:          One Kafka server node
Cluster:         Multiple brokers
Topic:           Named log/channel. Data stored here.
Partition:       Topic is divided into N partitions (parallelism)
Offset:          Sequential ID of a message within a partition
Consumer Group:  Set of consumers sharing work. Each partition
                 consumed by exactly ONE consumer in the group.
Producer:        Writes to topic
Consumer:        Reads from topic at its own pace
ZooKeeper/KRaft: Cluster metadata and leader election

Ordering guarantee:
  Within a partition: guaranteed ordered
  Across partitions: NOT guaranteed
  Use message key to route related messages to same partition

Replication:
  Each partition replicated to N brokers (replication factor)
  Leader handles reads/writes; followers replicate
  If leader dies, follower becomes new leader (no message loss)

Retention:
  Messages kept for configured duration (default: 7 days)
  Consumers can replay from any offset
  Disk-based — very high throughput
```

---

## Code Examples

### Kafka with Node.js (kafkajs)

```typescript
import { Kafka, Partitioners } from "kafkajs";

const kafka = new Kafka({
  clientId: "myapp",
  brokers: ["localhost:9092"],
  retry: {
    initialRetryTime: 300,
    retries: 8
  }
});

// ─── Producer ────────────────────────────────────────
const producer = kafka.producer({
  createPartitioner: Partitioners.LegacyPartitioner,
  transactionalId: "myapp-producer"  // for exactly-once
});

await producer.connect();

// Send a single message
await producer.send({
  topic: "order.events",
  messages: [{
    key:   "order-123",   // same key → same partition → ordered
    value: JSON.stringify({
      orderId:  "order-123",
      userId:   "user-456",
      amount:   99.99,
      status:   "created"
    }),
    headers: {
      "event-type": "order.created",
      "source":     "order-service"
    }
  }]
});

// Batch send (much more efficient)
await producer.sendBatch({
  topicMessages: [
    {
      topic: "order.events",
      messages: events.map(e => ({
        key:   e.orderId,
        value: JSON.stringify(e)
      }))
    }
  ]
});

await producer.disconnect();

// ─── Consumer ────────────────────────────────────────
const consumer = kafka.consumer({ groupId: "notification-service" });
await consumer.connect();
await consumer.subscribe({ topic: "order.events", fromBeginning: false });

await consumer.run({
  eachMessage: async ({ topic, partition, message }) => {
    const event = JSON.parse(message.value!.toString());
    console.log(`Processing ${message.headers?.["event-type"]}: ${event.orderId}`);

    // Process the event (must be idempotent)
    await processOrderEvent(event);

    // Offset committed automatically after eachMessage resolves
    // Use eachBatch for manual offset control
  }
});

// ─── Admin: create topics ─────────────────────────────
const admin = kafka.admin();
await admin.connect();
await admin.createTopics({
  topics: [{
    topic:             "order.events",
    numPartitions:     12,   // parallelism = max 12 consumers in group
    replicationFactor: 3,    // store on 3 brokers
    configEntries: [
      { name: "retention.ms", value: "604800000" }  // 7 days
    ]
  }]
});
await admin.disconnect();
```

### Docker Compose: Local Kafka

```yaml
# docker-compose.yml — Kafka + UI for local dev
services:
  kafka:
    image: confluentinc/cp-kafka:7.6.0
    environment:
      KAFKA_NODE_ID:                        1
      KAFKA_PROCESS_ROLES:                  "broker,controller"
      KAFKA_LISTENERS:                      "PLAINTEXT://0.0.0.0:9092,CONTROLLER://0.0.0.0:9093"
      KAFKA_ADVERTISED_LISTENERS:           "PLAINTEXT://localhost:9092"
      KAFKA_CONTROLLER_QUORUM_VOTERS:       "1@kafka:9093"
      KAFKA_CONTROLLER_LISTENER_NAMES:      "CONTROLLER"
      KAFKA_LOG_DIRS:                       "/var/lib/kafka/data"
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
      KAFKA_AUTO_CREATE_TOPICS_ENABLE:      "true"
      CLUSTER_ID:                           "MkU3OEVBNTcwNTJENDM2Qk"
    ports:
      - "9092:9092"
    volumes:
      - kafka-data:/var/lib/kafka/data

  kafka-ui:
    image: provectuslabs/kafka-ui:latest
    environment:
      KAFKA_CLUSTERS_0_NAME:              local
      KAFKA_CLUSTERS_0_BOOTSTRAPSERVERS: kafka:9092
    ports:
      - "8080:8080"
    depends_on: [kafka]

volumes:
  kafka-data:
```

---

## Interview Preparation

**Q1: What is a consumer group in Kafka?**
A: A consumer group is a set of consumer instances that share the work of reading from a topic. Kafka assigns each partition to exactly one consumer in the group at any time. Key behaviors: if a group has fewer consumers than partitions, some consumers read multiple partitions. If it has more, some are idle. When a consumer dies or joins, Kafka triggers a rebalance and reassigns partitions. Why it matters: consumer groups enable parallel processing (more consumers = more throughput, up to the number of partitions) and independent consumption (a different group can read the same topic from the beginning without affecting other groups). For example: "notification-service" and "analytics-service" can both read "order.events" independently, each maintaining their own offset.

**Q2: What is the difference between Kafka and SQS?**
A: Kafka: pull-based, log-based, messages persist after consumption, multiple consumer groups read independently, replay support, very high throughput (millions/sec), complex to self-host (requires ZooKeeper/KRaft), AWS MSK for managed. SQS: push-based (Lambda), messages deleted after consumption, single consumer per message (Standard), FIFO ordering option, simple to use (fully managed), scales automatically, at-least-once delivery. When to use Kafka: event sourcing, replaying events, multiple independent consumers, very high throughput, data pipeline. When to use SQS: simple task queues, Lambda workers, point-to-point work distribution, need full AWS management. Rule of thumb: SQS if AWS-native simplicity matters; Kafka if replay, multiple consumers, or very high throughput required.

**Q3: What does it mean for a consumer to be idempotent?**
A: Idempotent: processing the same message multiple times produces the same result as processing it once. Required for at-least-once delivery (which is the default for most brokers). Techniques: deduplication ID — store processed message IDs in Redis/DB, skip if already seen. Conditional updates — `UPDATE orders SET status='shipped' WHERE status='processing' AND id=$1` — safe to run twice. Natural idempotency — `SET user.emailVerified = true` — running it twice changes nothing. Upsert operations — `INSERT ... ON CONFLICT DO UPDATE`. Examples of non-idempotent operations: send email (user gets two emails), charge credit card (double charge), increment counter without dedup check. Design every Kafka/SQS consumer to be idempotent before deploying to production.

---

## Practical Tasks

### Beginner (10 Tasks)
1. Set up Kafka locally with Docker Compose.
2. Create a topic with 3 partitions.
3. Produce 10 messages to a topic.
4. Consume messages in a consumer group.
5. Observe offset progression in Kafka UI.
6. Add a second consumer to the same group and watch partition reassignment.
7. Stop a consumer and watch the remaining one take over its partitions.
8. Produce messages with a key (same key → same partition).
9. Read a topic from the beginning (fromBeginning: true).
10. List topics and describe consumer group lag.

### Intermediate (10 Tasks)
1. Implement idempotent order processing consumer with Redis dedup.
2. Set up a Dead Letter Topic for failed message processing.
3. Implement retry logic: 3 retries before sending to DLT.
4. Set message retention to 3 days.
5. Use batch processing (eachBatch) for high-throughput consumer.
6. Implement a Kafka producer with compression (snappy).
7. Build a fan-out pattern: one topic, two consumer groups.
8. Monitor consumer lag with admin API.
9. Implement health check endpoint for Kafka connectivity.
10. Test consumer with simulated message processing failure.

### Advanced (10 Tasks)
1. Implement exactly-once semantics with Kafka transactions.
2. Design a Kafka-based event sourcing system.
3. Build an event replay mechanism for a service.
4. Implement a Kafka Streams aggregation pipeline.
5. Design partition strategy for high-cardinality keys.
6. Implement Kafka Schema Registry with Avro schemas.
7. Monitor Kafka with Prometheus + Grafana.
8. Implement consumer group rebalance listener.
9. Build a Kafka connector for PostgreSQL CDC (Change Data Capture).
10. Migrate SQS-based system to Kafka.

---

## Cheat Sheet

```
Kafka vs SQS vs RabbitMQ:
  Kafka:     log-based, replay, millions/sec, multi-consumer groups
  SQS:       AWS managed, simple, per-message deletion, FIFO option
  RabbitMQ:  AMQP, flexible routing (exchanges), medium scale

Kafka key concepts:
  Partition count = max parallel consumers in one group
  Same message key → same partition (ordering guarantee)
  Replication factor = copies on N brokers (fault tolerance)
  Consumer lag = (latest offset) - (consumer offset) — alert if large

Delivery semantics:
  At-most-once:  no retry, possible loss
  At-least-once: ACK-based retry, possible duplicates (most common)
  Exactly-once:  Kafka transactions or SQS FIFO with dedup ID

Node.js kafkajs essentials:
  producer.send({ topic, messages: [{ key, value, headers }] })
  consumer.subscribe({ topic, fromBeginning })
  consumer.run({ eachMessage: async ({ partition, message }) => {} })
  consumer.run({ eachBatch: async ({ batch, resolveOffset }) => {} })
```
