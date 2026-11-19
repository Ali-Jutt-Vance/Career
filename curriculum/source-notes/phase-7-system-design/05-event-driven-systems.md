# Phase 7 — Chapter 5: Event-Driven Systems

---

## Chapter Overview

Event-driven architecture (EDA) is a design paradigm where services communicate via events rather than direct calls. Services publish events when something happens; other services subscribe and react. EDA enables loose coupling, scalability, and resilience at scale.

**Topics:**
- Events vs. commands vs. queries
- Event sourcing
- CQRS (Command Query Responsibility Segregation)
- Saga pattern for distributed transactions
- Choreography vs. orchestration
- Event schema evolution
- Outbox pattern (guaranteed event delivery)

---

## Core Concepts

### Events vs. Commands vs. Queries

```
Event:   "Something happened" (past tense, immutable fact)
  OrderCreated { orderId, userId, amount, at }
  Publisher doesn't know who listens. Fire-and-forget.
  Loosely coupled.

Command: "Do this thing" (request, may be rejected)
  CreateOrder { userId, items }
  Directed at a specific service. Has a handler. Can fail.
  Tightly coupled (sender knows receiver).

Query:   "Give me this data" (no side effects)
  GetOrder { orderId } → OrderDetails
  Read-only. Response required. Synchronous.

Event-Driven is not a silver bullet:
  Use events for cross-service notifications and state changes.
  Use commands for operations requiring acknowledgment/validation.
  Use queries for synchronous reads.
```

### Event Sourcing

```
Traditional: Store current state
  orders table: { id, status: "shipped" }
  History lost. Hard to debug. Hard to audit.

Event Sourcing: Store every event, derive state
  event_store:
    { orderId, event: "OrderCreated",  data: {...}, at: t1 }
    { orderId, event: "PaymentTaken",  data: {...}, at: t2 }
    { orderId, event: "OrderShipped",  data: {...}, at: t3 }
  Current state = replay all events for that orderId
  
Benefits:
  Full audit log (legal compliance)
  Time travel: what was the state at time T?
  Bug replay: reproduce exact sequence of events
  New projections: create new read model from event history
  
Challenges:
  Event schema evolution (versioning)
  Eventual consistency (read model lags behind events)
  Snapshot optimization (for long-lived aggregates)
```

---

## Patterns

### Outbox Pattern

```
Problem: you write to DB AND publish an event. What if:
  - DB write succeeds, event publish fails? → Inconsistent
  - Event published, DB write fails? → Inconsistent

Solution: Outbox Pattern
  1. Write to DB AND write event to outbox table in SAME transaction
  2. Separate process (relay) reads outbox, publishes to broker, marks sent

  CREATE TABLE outbox_events (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aggregate   TEXT NOT NULL,   -- 'order'
    event_type  TEXT NOT NULL,   -- 'OrderCreated'
    payload     JSONB NOT NULL,
    published   BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
  );

  -- In same transaction as business logic:
  BEGIN;
    INSERT INTO orders (...) VALUES (...);
    INSERT INTO outbox_events (aggregate, event_type, payload)
      VALUES ('order', 'OrderCreated', '{"orderId": ...}');
  COMMIT;

  -- Relay process: poll outbox, publish, mark done
```

### Saga Pattern

```
Problem: Distributed transaction across services
  Order service creates order → Payment service charges card →
  Inventory service reserves items → Notification service sends email
  What if inventory reservation fails after payment succeeds?

Saga: sequence of local transactions with compensating actions
  Each step: local DB transaction + event/command to next step
  On failure: run compensating transactions in reverse

Choreography (event-based):
  OrderCreated → Payment processes → PaymentTaken → Inventory reserves
  Each service listens and reacts. Decentralized.
  Pro: loose coupling. Con: hard to trace, debug.

Orchestration (central coordinator):
  Saga orchestrator sends commands, receives events, decides next step.
  If failure: orchestrator sends compensating commands.
  Pro: centralized visibility. Con: orchestrator is new dependency.

When to use:
  Choreography: simple 2-3 step sagas, high decoupling priority
  Orchestration: complex sagas (5+ steps), need visibility, easier debugging
```

---

## Code Examples

### Event-Driven Order Service with Outbox

```typescript
// events/order.events.ts
export interface OrderCreatedEvent {
  type:    "order.created";
  payload: {
    orderId: string;
    userId:  string;
    amount:  number;
    items:   Array<{ productId: string; qty: number }>;
  };
}

export interface PaymentFailedEvent {
  type:    "payment.failed";
  payload: { orderId: string; reason: string };
}

export type OrderEvent = OrderCreatedEvent | PaymentFailedEvent;

// services/order.service.ts
import { prisma } from "@/lib/prisma";

export async function createOrder(userId: string, items: Item[]) {
  const amount = calculateTotal(items);

  // Outbox: write order + event in ONE transaction
  const order = await prisma.$transaction(async (tx) => {
    const newOrder = await tx.order.create({
      data: { userId, amount, status: "pending", items: { create: items } }
    });

    await tx.outboxEvent.create({
      data: {
        aggregate:  "order",
        eventType:  "order.created",
        payload:    {
          orderId: newOrder.id,
          userId,
          amount,
          items
        }
      }
    });

    return newOrder;
  });

  return order;
}

// relay/outbox-relay.ts — polls outbox and publishes
import { prisma }   from "@/lib/prisma";
import { producer } from "@/lib/kafka";

async function relayOutboxEvents() {
  const events = await prisma.outboxEvent.findMany({
    where:   { published: false },
    orderBy: { createdAt: "asc" },
    take:    100
  });

  for (const event of events) {
    await producer.send({
      topic:    event.aggregate,
      messages: [{
        key:   event.aggregate,
        value: JSON.stringify({
          type:    event.eventType,
          payload: event.payload
        })
      }]
    });

    await prisma.outboxEvent.update({
      where: { id: event.id },
      data:  { published: true, publishedAt: new Date() }
    });
  }
}

// Run every 1 second
setInterval(relayOutboxEvents, 1000);

// consumers/payment.consumer.ts — listens and acts
consumer.run({
  eachMessage: async ({ message }) => {
    const event = JSON.parse(message.value!.toString()) as OrderEvent;

    if (event.type === "order.created") {
      const { orderId, userId, amount } = event.payload;

      try {
        await chargePayment(userId, amount);

        // Publish next event in saga
        await producer.send({
          topic:    "payment",
          messages: [{
            value: JSON.stringify({ type: "payment.succeeded", payload: { orderId } })
          }]
        });
      } catch (err) {
        // Compensating event
        await producer.send({
          topic:    "payment",
          messages: [{
            value: JSON.stringify({
              type:    "payment.failed",
              payload: { orderId, reason: (err as Error).message }
            })
          }]
        });
      }
    }
  }
});
```

### CQRS — Separate Read and Write Models

```typescript
// ─── Write side: handle commands, emit events ─────────
export async function handleCreateOrder(cmd: CreateOrderCommand) {
  // Validate, write to write model (normalized DB), emit event
  const order = await orderRepo.save(Order.create(cmd));
  await eventBus.publish(new OrderCreatedEvent(order));
}

// ─── Read side: projections for queries ───────────────
// Different table, denormalized for fast reads
// Updated by listening to events

// Schema for read model
interface OrderReadModel {
  orderId:       string;
  userName:      string;   // denormalized from user service
  totalAmount:   number;
  statusDisplay: string;   // human-readable status
  itemCount:     number;
  createdAt:     string;
}

// Projection: update read model on OrderCreated
eventBus.subscribe("order.created", async (event: OrderCreatedEvent) => {
  const user = await userReadRepo.findById(event.userId);

  await orderReadRepo.upsert({
    orderId:       event.orderId,
    userName:      user.name,
    totalAmount:   event.amount,
    statusDisplay: "Pending",
    itemCount:     event.items.length,
    createdAt:     event.at.toISOString()
  });
});

// Query handler: fast read from read model
export async function getOrdersForUser(userId: string) {
  return orderReadRepo.findByUserId(userId);
  // No joins, no aggregations — pre-computed, very fast
}
```

---

## Interview Preparation

**Q1: What is CQRS and when should you use it?**
A: CQRS separates the write model (commands that mutate state) from the read model (queries that return data). Write side: commands, validation, business rules, domain model, normalized DB. Read side: queries, denormalized projections optimized for display, potentially different storage (Redis, Elasticsearch). When to use: when read and write requirements are very different — e.g., writes are complex business operations but reads need pre-joined, aggregated views. When reads and writes have very different scale requirements. When event sourcing is used (natural fit). When NOT to use: simple CRUD applications where read/write are similar. CQRS adds complexity — separate storage, projection logic, eventual consistency between write and read models.

**Q2: What is the Outbox Pattern and why is it needed?**
A: The problem: you need to write to your database AND publish an event. If you do them in separate operations, one can fail after the other succeeds, leaving your system inconsistent (event published but DB rolled back, or DB committed but event never published). The Outbox pattern: within a single database transaction, write your business data AND write a record to an "outbox" table. A separate relay process reads the outbox and publishes to the message broker, marking events as published. This guarantees: event is published if and only if the DB transaction committed. The relay needs to handle at-least-once delivery (publish may be retried), so consumers must be idempotent.

**Q3: What is the difference between choreography and orchestration in Sagas?**
A: Both solve distributed transactions (multi-service business processes). Choreography: no central coordinator. Each service listens to events and reacts, publishing the next event. OrderCreated → PaymentService hears it → PaymentTaken → InventoryService hears it → ItemsReserved. Loose coupling, no single point of failure. Hard to track "where is this saga now?" hard to debug. Orchestration: a Saga Orchestrator service coordinates the entire flow. Sends commands to each service, receives events, decides next step. If failure: orchestrator sends compensating commands. Easier to understand and debug (centralized view), supports complex branching. The orchestrator is a new service that must be maintained. Use choreography for simple sagas (2-3 steps); orchestration for complex flows requiring visibility.

---

## Practical Tasks

### Beginner (10 Tasks)
1. Identify events vs. commands vs. queries in a sample domain.
2. Write event schemas for an e-commerce order flow.
3. Implement a simple in-process event bus (EventEmitter).
4. Publish an event when an order is created.
5. Subscribe a notification handler to the order.created event.
6. Add a second subscriber (analytics) to the same event.
7. Implement basic outbox table schema in PostgreSQL.
8. Write the outbox insert alongside a business transaction.
9. Build a simple relay process that reads the outbox.
10. Test: verify event is published only on successful DB commit.

### Intermediate (10 Tasks)
1. Implement CQRS for an order service.
2. Build a read model projection for orders.
3. Implement saga choreography for a 3-step order flow.
4. Add compensating transactions for payment failure.
5. Implement idempotent event consumers with Redis dedup.
6. Build event schema versioning (v1, v2 backward compatible).
7. Add dead letter handling for failed event processing.
8. Implement saga state tracking (where is the saga now?).
9. Build a replay mechanism for read model projections.
10. Add distributed tracing with correlation IDs across events.

### Advanced (10 Tasks)
1. Implement full event sourcing for the order aggregate.
2. Build snapshot optimization for long-lived aggregates.
3. Implement saga orchestration with a state machine.
4. Design event schema registry for versioning.
5. Build a saga monitor dashboard.
6. Implement exactly-once event processing.
7. Build time-travel debugging via event replay.
8. Design cross-service consistency testing strategy.
9. Implement blue-green deployment for event consumers.
10. Audit event-driven system with chaos testing.

---

## Cheat Sheet

```
Event-Driven Patterns:
  Outbox:        DB + event in same transaction → guaranteed delivery
  Saga:          distributed transactions via compensating actions
  CQRS:          separate read model from write model
  Event Sourcing: store events, derive state by replay

Saga comparison:
  Choreography: loose, decentralized, hard to trace
  Orchestration: centralized, easier to debug, new dependency

CQRS decision:
  Use: complex domain, different R/W scale, event sourcing
  Skip: simple CRUD, small team, consistency issues not worth it

Common mistakes:
  Event as command (ordering, not notifying)
  No idempotency in consumers (double processing)
  No outbox (DB/event inconsistency on failure)
  Event schema breaking changes (fields removed/renamed)
```
