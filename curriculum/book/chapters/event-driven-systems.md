# Event-Driven Systems

> [!GOALS]
> - Explain event-driven architecture: what an **event** is, and how it differs from a **command** and a **query**.
> - Compare **choreography** and **orchestration** for multi-service workflows.
> - Implement long-running business processes with **sagas** and **compensating actions**.
> - Understand **event sourcing** and **CQRS**, and when they are worth their complexity.
> - Design event contracts: schemas, versioning, idempotency, ordering and **eventual consistency**.
> - Keep event-driven systems observable and debuggable.

## Why this matters

In a request-driven system, the order service calls the payment service, which calls the fraud service, and so on — each call waits for the next. In an **event-driven** system, the order service announces "an order was placed", and every interested service reacts in its own time. Services do not need to know about each other; new behaviour (loyalty points, a recommendation update) is added by subscribing, without changing the order service; and a slow or broken consumer does not slow down checkout.

This style is behind most large modern systems — e-commerce, banking, ride-hailing, streaming — and behind AWS's own design (S3 events, EventBridge, DynamoDB Streams). It also brings real difficulties: data is **eventually consistent**, business processes span many services with no single transaction, failures are harder to see, and an innocent-looking change to an event can break consumers you did not know existed. This chapter builds on {{ch:message-brokers}} and {{ch:sns-sqs}}.

## The simple idea

Think of a school notice board. When the sports day is moved, the office pins one notice. The PE teacher rearranges lessons, the kitchen changes the lunch order, parents adjust their plans — each reads the notice and acts. The office does not phone each of them, and does not even need to know who they are. If the kitchen sees the notice an hour later, lunch is still fine.

> [!ANALOGY]
> Event-driven design is like a notice board: one notice announces what happened, and everyone who cares reacts in their own way and time.
>
> **Where the analogy breaks:** a notice board shows one notice at a time, and everyone can read the latest version. Software events arrive at different consumers at different times, sometimes twice and sometimes out of order. For a while, different services hold different views of the world, and if one consumer fails silently, nobody notices that the kitchen never saw the notice.

## The proper definition and key words

**Event-driven architecture (EDA)** is a style in which components communicate by producing and reacting to **events** — immutable records that something happened — through a broker or event bus, rather than by calling each other directly.

Key words:

- **Event** — a fact in the past tense: `OrderPlaced`, `PaymentFailed`. Immutable.
- **Command** — a request to do something: `ChargeCard`. Has one intended handler and may be refused.
- **Query** — a request for data, with no side effects.
- **Event notification / event-carried state transfer** — events with just IDs (consumers fetch details) / events carrying the data consumers need.
- **Choreography** — services react to each other's events with no central coordinator.
- **Orchestration** — a coordinator tells services what to do, step by step.
- **Saga** — a long-running business transaction made of local transactions, with **compensating actions** to undo completed steps when a later one fails.
- **Event sourcing** — storing the sequence of events as the source of truth and deriving state by replaying them.
- **CQRS** — Command Query Responsibility Segregation: separate models (and often stores) for writes and for reads.
- **Projection / read model** — a view built from events for queries.
- **Eventual consistency** — copies of data become consistent over time, not instantly.
- **Schema registry** — a central store of event schemas and their versions.

## Events, commands and coordination

### Level 1 — Events versus commands

| | Event | Command |
|---|---|---|
| Meaning | "This happened" | "Please do this" |
| Tense | Past: `OrderPlaced` | Imperative: `ShipOrder` |
| Receivers | Zero, one or many; the producer does not know | One handler |
| Can be refused? | No — it already happened | Yes |
| Coupling | Low: producers do not depend on consumers | Higher: the sender depends on the receiver |

A common mistake is "events" that are really commands in disguise (`SendWelcomeEmailEvent`): the producer still decides what others must do. A real event describes what happened (`UserRegistered`) and lets consumers decide.

### Level 2 — Choreography and orchestration

```text
 Choreography                                         Orchestration
 order-service ─OrderPlaced─►  payment-service        order saga (orchestrator)
                                 ─PaymentSucceeded─►    ├─► reserve stock     (inventory)
 inventory ◄─────────────────────┘                      ├─► charge card       (payments)
   ─StockReserved─► shipping ─ShipmentBooked─► …        └─► book courier      (shipping)
                                                         on failure: undo completed steps in reverse
```

- **Choreography**: each service listens and publishes; no single place knows the whole flow. Very loosely coupled and simple for short flows; long flows become hard to follow ("who reacts to what?") and to change.
- **Orchestration**: a coordinator (a saga service, AWS Step Functions, Temporal) drives the steps and handles failures. The flow is explicit and observable in one place, at the cost of a central component that knows every step.
- Many systems use both: choreography between domains ("an order was placed"), orchestration inside a complex process (fulfilment).

### Level 3 — Sagas and compensation

A business process across services cannot use one database transaction. A **saga** runs a sequence of local transactions and, if a step fails, runs **compensating actions** for the completed steps in reverse order. This orchestrated saga reserves stock, charges the card and books a courier:

```ts
// 1. An orchestrated saga: each step has a compensating action that undoes it if a later step fails.
type Step = { name: string; run: () => Promise<void>; compensate: () => Promise<void> };

async function runSaga(orderId: string, steps: Step[]) {
  const done: Step[] = [];
  for (const step of steps) {
    try {
      await step.run();
      done.push(step);
      console.log(`  ${step.name}: ok`);
    } catch (err) {
      console.log(`  ${step.name}: FAILED (${(err as Error).message}) -> compensating`);
      for (const s of done.reverse()) { await s.compensate(); console.log(`  undo ${s.name}: ok`); }
      return `order ${orderId} cancelled`;
    }
  }
  return `order ${orderId} confirmed`;
}

const stock = { "tea-green": 5 };
let charged = 0;
const steps = (courierAvailable: boolean): Step[] => [
  { name: "reserve stock", run: async () => { stock["tea-green"] -= 2; }, compensate: async () => { stock["tea-green"] += 2; } },
  { name: "charge card", run: async () => { charged += 900; }, compensate: async () => { charged -= 900; } },
  { name: "book courier", run: async () => { if (!courierAvailable) throw new Error("no courier slots"); }, compensate: async () => {} },
];
console.log(await runSaga("1001", steps(true)));
console.log(await runSaga("1002", steps(false)));
console.log(`stock left: ${stock["tea-green"]}, total charged: ${charged} pence`);

// 2. Event sourcing: store what happened; derive current state by replaying the events
type Ev =
  | { type: "AccountOpened"; owner: string }
  | { type: "Deposited"; amount: number }
  | { type: "Withdrawn"; amount: number }
  | { type: "Frozen"; reason: string };
const history: Ev[] = [
  { type: "AccountOpened", owner: "Sara" }, { type: "Deposited", amount: 5000 },
  { type: "Withdrawn", amount: 1200 }, { type: "Deposited", amount: 300 }, { type: "Frozen", reason: "suspicious login" },
];
type State = { owner: string; balance: number; frozen: boolean };
const apply = (s: State, e: Ev): State => {
  switch (e.type) {
    case "AccountOpened": return { owner: e.owner, balance: 0, frozen: false };
    case "Deposited": return { ...s, balance: s.balance + e.amount };
    case "Withdrawn": return { ...s, balance: s.balance - e.amount };
    case "Frozen": return { ...s, frozen: true };
  }
};
const empty: State = { owner: "", balance: 0, frozen: false };
console.log("current state:", history.reduce(apply, empty));
console.log("state after 3 events (time travel):", history.slice(0, 3).reduce(apply, empty));
```

**Output:**

```text
  reserve stock: ok
  charge card: ok
  book courier: ok
order 1001 confirmed
  reserve stock: ok
  charge card: ok
  book courier: FAILED (no courier slots) -> compensating
  undo charge card: ok
  undo reserve stock: ok
order 1002 cancelled
stock left: 3, total charged: 900 pence
current state: { owner: 'Sara', balance: 4100, frozen: true }
state after 3 events (time travel): { owner: 'Sara', balance: 3800, frozen: false }
```

The first part of the output is the saga; the last two lines come from the event-sourcing example discussed below.

- Order 1002 could not get a courier, so the saga **refunded** the card and **released** the stock: the system returned to a consistent state — two tea packs reserved for order 1001 (stock 3), one charge of 900 pence.
- Compensation is a **business action**, not a database rollback: a refund is visible on the customer's statement; an email already sent cannot be unsent (compensate with an apology). Put irreversible steps last where possible.
- Real sagas must survive **crashes**: the orchestrator stores its progress durably, every step and compensation is **idempotent** and retried, and a step that cannot be compensated needs human handling. Workflow engines (Step Functions, Temporal) provide this durable state and retrying for you.
- Between steps, the system is **temporarily inconsistent** (stock reserved but not yet paid). Design the user experience for it: "order received, confirming payment".

## Event sourcing and CQRS

### Level 3 — Event sourcing

Most systems store **current state** (a balance column) and lose the history of how it got there. **Event sourcing** stores the **events** as the source of truth and derives state by replaying them — the last two lines of the example's output:

- The current state (balance 4,100, frozen) is the result of applying all five events; replaying only the first three shows the state **at that point in time** — a complete audit trail and "time travel" for free.
- New views can be built later by replaying history (a fraud model trained on every withdrawal ever made).
- **Costs**: replaying long histories needs **snapshots**; events are permanent, so changing their structure requires **versioning** and upcasting; deleting personal data needs special techniques (crypto-shredding: encrypt per person and delete the key); queries need separate read models; the team must learn a new way of thinking.
- Use it where history is the business (ledgers, bank accounts, audit-heavy domains), not as a default for every service.

### Level 3 — CQRS and read models

**CQRS** separates the model that **handles commands** (validating and recording changes) from models that **serve queries**. Events from the write side update **projections** — denormalised read models shaped for specific screens: an order history table, a search index, a dashboard counter ({{ch:database-scaling}}).

- Reads scale and evolve independently; each read model uses the best store for its query.
- Read models are **eventually consistent**: after a command, the projection updates a moment later. The UI must handle it (show the user's own change optimistically, or wait for the projection).
- CQRS does not require event sourcing, and both add complexity — adopt them where reads and writes truly differ in shape or scale.

## Designing events

### Level 4 — Contracts that last

- **Name in the past tense** and the domain's language: `OrderPlaced`, `RefundIssued`.
- **Include an envelope**: unique event ID, type, version, time, source, correlation ID.
- **Choose content deliberately**: thin events (IDs only) force consumers to call back for data — coupling and load; fat events (all data consumers need) make consumers independent but expose more data and grow large. Include what is stable and widely needed.
- **Version and evolve compatibly**: add optional fields; never rename or remove fields that consumers use; publish a new event type (`OrderPlaced.v2`) for breaking changes and run both during a migration. A **schema registry** with compatibility checks in CI catches breaking changes before they ship ({{ch:api-versioning}}).
- **Publish reliably** with the transactional outbox or change data capture, so database state and events never disagree ({{ch:message-brokers}}).
- **Consume safely**: idempotent handlers (deduplicate by event ID), tolerate out-of-order events (versions, last-writer-wins), and dead-letter failures.

### Level 4 — Observability

- **Correlation IDs** in every event, logged by every consumer, let you follow one order through ten services; distributed tracing can link asynchronous hops ({{ch:observability-and-incidents}}).
- **Event catalogues** (AsyncAPI documents, EventBridge schema registry) list who produces and who consumes each event.
- **Monitor the flow**, not just services: consumer lag, DLQ sizes, and business checks such as "orders placed but not shipped after two hours".
- **Replay tools** with safeguards, so fixing a bug can include reprocessing affected events.

## From beginner to enterprise

**Level 1–2 — first events.** Events versus commands; publishing domain events through a broker; consumers reacting independently; choreography for simple flows.

**Level 3 — business processes.** Sagas with compensating actions; orchestration with durable state; idempotent consumers; designing for eventual consistency in the user experience.

**Level 4 — robust event systems.** Event contracts with envelopes, versions and schema checks; outbox or CDC; correlation IDs and event catalogues; monitoring flows end to end.

**Level 5 — senior practice.** Choosing between request-driven, choreographed and orchestrated designs; event sourcing and CQRS where history and read scale justify them; data ownership between domains.

**Level 6 — enterprises.** Organisation-wide event backbones, domain events as published products, governance of schemas and privacy across hundreds of services.

## Real-world use cases

### Checkout with a saga

- **Design**: a Step Functions workflow reserves stock, authorises payment, creates the shipment and captures payment; failures run compensations (release stock, void the authorisation). Every step is idempotent by order ID; stuck orders older than an hour raise an alert for manual review.

### The broken consumer nobody knew about

- **What happened**: the catalogue team renamed `price` to `priceMinor` in `ProductUpdated`. Their own services were updated; a pricing feed owned by another team silently started publishing zero prices.
- **Fix**: a schema registry with backward-compatibility checks in CI, an event catalogue listing consumers, and additive changes only — new fields alongside old ones until consumers move.

## Common mistakes

### Beginner: commands disguised as events

**Consequence:** hidden coupling. **Fix:** past-tense facts; consumers decide what to do.

### Beginner: assuming events arrive once and in order

**Fix:** idempotency and ordering per key ({{ch:message-brokers}}).

### Intermediate: long choreographies nobody understands

**Fix:** orchestrate complex processes; document flows.

### Intermediate: no compensation plan

**Consequence:** half-finished orders and charges without shipments. **Fix:** sagas with compensations and stuck-process alerts.

### Intermediate: breaking event schemas

**Fix:** versioning, compatibility checks, additive changes.

### Production: dual writes instead of an outbox

**Fix:** transactional outbox or CDC.

### Production: event sourcing everywhere

**Consequence:** complexity without benefit. **Fix:** use it where history matters.

## Debugging and troubleshooting

- **"The order never shipped"**: follow the correlation ID through logs; check each consumer's lag and DLQ; look at the saga's state.
- **Data differs between services**: a consumer failed or is behind; projections need rebuilding from events.
- **Duplicates**: missing idempotency on a consumer.
- **Events in the wrong order**: wrong partition key or retries; use version checks.
- **A consumer broke after a deployment**: an incompatible schema change; check the registry and roll forward with a compatible version.

## Security summary

- **Events contain data** that may be sensitive — publish only what consumers need, encrypt in transit and at rest, and control who may subscribe.
- **Authenticate producers**: consumers must be able to trust that `PaymentSucceeded` came from the payment service.
- **Validate events** against schemas; treat them as untrusted input.
- **Retention and deletion**: event stores and logs keep data for a long time; plan for privacy requests (crypto-shredding).

## How a senior engineer thinks about this

- **Events are facts; commands are requests.** Name and design them accordingly.
- **Consistency is a product decision.** Decide where eventual consistency is acceptable and design the experience for it.
- **Every multi-step process needs a failure story.** Compensation, retries and human escalation.
- **Event schemas are public APIs.** Version them, check compatibility, know the consumers.
- **Make the flow visible.** Correlation IDs, catalogues and business-level monitoring.

## Exercises

### Exercise 1 — Event or command?

**Objective:** practise naming.
**What to do:** classify and rename where needed: `SendInvoice`, `InvoiceSent`, `UpdateStockEvent`, `CustomerRegistered`, `NotifyWarehouse`.

<details>
<summary>Show the solution</summary>

- `SendInvoice` — a **command**.
- `InvoiceSent` — an **event**.
- `UpdateStockEvent` — a command disguised as an event; the fact is probably `OrderPlaced` or `StockReserved`.
- `CustomerRegistered` — an **event**.
- `NotifyWarehouse` — a **command**; publish `OrderPaid` and let the warehouse react.

</details>

### Exercise 2 — Design the saga

**Objective:** practise compensations.
**What to do:** a hotel booking platform books a room, a flight and a car hire for a trip. Design the saga steps, their compensations, and the order of steps.

<details>
<summary>Show the solution</summary>

Steps (each idempotent by trip ID), ordered so that steps most likely to fail and hardest to undo come carefully:
1. **Hold the room** (compensation: release the hold).
2. **Hold the car** (compensation: release).
3. **Book the flight** — often the hardest to undo (compensation: cancel, possibly with a fee).
4. **Confirm room and car** (compensation: cancel bookings).
5. **Charge the customer** last, once everything is confirmed (or authorise first and capture at the end; compensation: void or refund).

On failure, run compensations in reverse; if a compensation fails (airline cancellation rejected), escalate to customer support. Store the saga's state durably and show the customer "booking in progress".

</details>

### Exercise 3 — Production scenario: inconsistent order status

**Objective:** practise debugging event-driven systems.
**The scenario:** customers report that the "My orders" page shows "processing" for orders that were delivered days ago. The order service's database shows them as delivered. What is likely wrong and what do you do?

<details>
<summary>Show the solution</summary>

"My orders" is probably a **read model** (projection) built from events, and it stopped receiving or applying `OrderDelivered` events.

**Investigate**: the projection consumer's lag and DLQ; errors in its logs (a schema change in `OrderDelivered`?); whether the producer still publishes the event (outbox relay running?).

**Fix**: repair the consumer (handle the new schema version), reprocess the dead-lettered events, or **rebuild the projection** by replaying events from the log. Then add monitoring: consumer lag alarms, DLQ alarms, and a periodic consistency check comparing a sample of orders in the read model with the source.

</details>

## Summary

**Event-driven architecture** connects services through **events** — immutable, past-tense facts — instead of direct calls, reducing coupling and isolating failures, at the price of **eventual consistency** and harder debugging. Distinguish events from **commands** (requests to one handler) and queries.

Multi-service workflows use **choreography** (services react to each other's events; simple, but long flows get opaque) or **orchestration** (a coordinator drives steps; explicit and observable). Long business transactions are **sagas**: local transactions with **compensating actions** run in reverse on failure, idempotent, durable and designed with irreversible steps last. **Event sourcing** stores events as the source of truth, giving full history and time travel at the cost of snapshots, versioning and privacy techniques; **CQRS** separates the write model from **read models** (projections) built from events.

Design events as long-lived contracts: past-tense names, envelopes with IDs, versions and correlation IDs, deliberate content, compatible evolution checked by a **schema registry**, reliable publishing through an outbox or CDC, and idempotent, order-tolerant consumers. Make flows observable with correlation IDs, event catalogues, lag and DLQ monitoring and business-level checks.

## Key terms

- **Event-driven architecture** — Designing systems around producing and reacting to events.
- **Event** — An immutable record that something happened.
- **Command** — A request for a specific handler to perform an action.
- **Event notification** — An event carrying identifiers that consumers use to fetch details.
- **Event-carried state transfer** — An event carrying the data consumers need.
- **Choreography** — Coordination through services reacting to each other's events.
- **Orchestration** — Coordination by a central component directing each step.
- **Saga** — A sequence of local transactions with compensations for failures.
- **Compensating action** — A business action that undoes a completed step.
- **Event sourcing** — Storing events as the source of truth and deriving state from them.
- **Snapshot** — Saved state used to avoid replaying a long event history.
- **CQRS** — Separating the models for commands and queries.
- **Projection** — A read model built from events.
- **Eventual consistency** — Data that becomes consistent across components over time.
- **Correlation ID** — An identifier that links related events and requests.
- **Schema registry** — A store of event schemas with compatibility rules.
- **Event catalogue** — Documentation of events, their producers and consumers.
- **Crypto-shredding** — Deleting personal data by destroying its encryption key.

## What comes next

Events, sagas and eventual consistency are all consequences of one fact: the system runs on many machines connected by an unreliable network. The next chapter, {{ch:distributed-systems}}, looks at that directly — partial failures, timeouts and retries, clocks and ordering, replication and consensus, idempotency, and the patterns that keep distributed systems correct.
