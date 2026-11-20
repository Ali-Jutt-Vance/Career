# Microservices

> [!GOALS]
> - Explain what microservices are, what problems they solve, and what they cost.
> - Compare a **monolith**, a **modular monolith** and **microservices**, and decide between them.
> - Draw service boundaries around **business capabilities** and **bounded contexts**, with each service **owning its data**.
> - Choose communication styles — synchronous APIs, asynchronous events — and avoid the **distributed monolith**.
> - Handle cross-service queries, transactions, testing, deployment and observability.
> - Migrate from a monolith safely with the **strangler fig** pattern.

## Why this matters

Microservices are one of the most discussed — and most misused — ideas in software architecture. Done well, they let many teams work independently on one large product: each team owns a few services, deploys them on its own schedule, scales them separately and chooses suitable technology. Amazon, Netflix and many large companies are organised this way.

Done badly, they produce a **distributed monolith**: dozens of services that must be deployed together, call each other in long synchronous chains, share databases, fail in confusing ways and slow every change down — the complexity of a distributed system with none of its benefits. Small teams adopting microservices too early is one of the most common and expensive architecture mistakes.

This chapter explains how to think about service boundaries and when splitting is worth it. It draws on {{ch:distributed-systems}}, {{ch:event-driven-systems}}, {{ch:api-gateway}} and the architecture principles in {{ch:software-architecture}}.

## The simple idea

A small restaurant has one kitchen where everyone cooks everything — efficient, easy to coordinate. A huge restaurant with hundreds of cooks works better as separate stations — bakery, grill, salads, desserts — each with its own staff, equipment and stock, passing finished dishes through a clear counter. Stations can change their recipes without asking the others. But splitting a small kitchen into ten stations would just add walls, paperwork and waiting.

> [!ANALOGY]
> Microservices are like splitting a huge kitchen into independent stations: each owns its staff, equipment and stock, and they pass finished dishes through clear counters.
>
> **Where the analogy breaks:** stations in one kitchen can shout to each other instantly. Services talk over a network that is slow and unreliable compared with a function call — every "shout" can be lost, delayed or duplicated — and no station can look into another's fridge. Boundaries in the wrong places make every dish need five stations and five messages.

## The proper definition and key words

**Microservices** is an architectural style in which an application is built as a set of small, independently deployable services, each organised around a business capability, owning its data, and communicating over the network through well-defined APIs or events.

Key words:

- **Monolith** — one deployable unit containing the whole application.
- **Modular monolith** — one deployable unit with strong internal module boundaries.
- **Business capability** — something the business does: catalogue, ordering, payments, shipping.
- **Bounded context** — a part of the domain with its own model and language (a "product" means different things to the catalogue and to shipping) — from domain-driven design.
- **Database per service** — each service owns its data; others access it only through the service's API or events.
- **Distributed monolith** — services so coupled that they cannot be changed or deployed independently.
- **Conway's Law** — systems tend to mirror the communication structure of the organisations that build them.
- **Strangler fig** — gradually replacing parts of a legacy system by routing functionality to new services.
- **Contract test** — a test that checks a service still meets what its consumers expect.

## Monolith, modular monolith, microservices

### Level 1 — The trade-offs

| | Monolith | Modular monolith | Microservices |
|---|---|---|---|
| Deployment | One unit | One unit | Many independent units |
| Calls between parts | In-process, fast, reliable | In-process, through module APIs | Network: slow, can fail |
| Data | One database, joins and transactions | One database, schemas per module | One store per service; no cross-service joins or transactions |
| Team scaling | Hard beyond a few teams | Good to many teams if boundaries are respected | Designed for many teams |
| Operational cost | Low | Low | High: CI/CD, monitoring, tracing, platform |
| Scaling | Whole app together | Whole app together | Each service separately |

Microservices buy **team independence** and **independent scaling and deployment**, and pay with **distributed-system complexity**. For a small team, a well-structured monolith is usually faster, cheaper and more reliable.

### Level 2 — Start with a modular monolith

A modular monolith gets most of the design benefits without the network: modules aligned with business capabilities, each with a **public API** and private internals, and **enforced** dependency rules. This check — the kind teams run in CI with tools such as dependency-cruiser or ESLint boundary rules — flags imports that break the boundaries:

```ts
// 1. A boundary check for a modular monolith: modules may only import other modules' public "api" files
//    and only along allowed dependencies. Run in CI, it keeps boundaries clean before any service is split out.
const imports: [string, string][] = [
  ["orders/service.ts", "catalogue/api.ts"],
  ["orders/service.ts", "payments/api.ts"],
  ["orders/service.ts", "payments/internal/stripe-client.ts"],   // reaches inside another module
  ["catalogue/service.ts", "orders/api.ts"],                     // catalogue should not depend on orders
  ["payments/service.ts", "payments/internal/stripe-client.ts"], // inside its own module: fine
];
const allowed: Record<string, string[]> = { orders: ["catalogue", "payments"], catalogue: [], payments: [] };
const moduleOf = (path: string) => path.split("/")[0]!;
for (const [from, to] of imports) {
  const a = moduleOf(from), b = moduleOf(to);
  let verdict = "ok";
  if (a !== b && !allowed[a]!.includes(b)) verdict = `VIOLATION: ${a} may not depend on ${b}`;
  else if (a !== b && !to.endsWith("/api.ts")) verdict = `VIOLATION: ${a} uses internals of ${b}`;
  console.log(`${from.padEnd(22)} -> ${to.padEnd(36)} ${verdict}`);
}

// 2. Why long synchronous call chains hurt: availability and latency multiply along the chain
const each = 0.999, hopMs = 25;
for (const hops of [1, 3, 6, 10]) {
  console.log(`${String(hops).padStart(2)} ${hops === 1 ? "service" : "services"} in a synchronous chain: availability ${(each ** hops * 100).toFixed(2)}%, ~${hops * hopMs} ms of network and processing`);
}
```

**Output:**

```text
orders/service.ts      -> catalogue/api.ts                     ok
orders/service.ts      -> payments/api.ts                      ok
orders/service.ts      -> payments/internal/stripe-client.ts   VIOLATION: orders uses internals of payments
catalogue/service.ts   -> orders/api.ts                        VIOLATION: catalogue may not depend on orders
payments/service.ts    -> payments/internal/stripe-client.ts   ok
 1 service in a synchronous chain: availability 99.90%, ~25 ms of network and processing
 3 services in a synchronous chain: availability 99.70%, ~75 ms of network and processing
 6 services in a synchronous chain: availability 99.40%, ~150 ms of network and processing
10 services in a synchronous chain: availability 99.00%, ~250 ms of network and processing
```

The first five lines are the boundary check; the last four are discussed under communication below.

- Orders reaching into the payments module's Stripe client couples orders to payment internals — exactly what makes later extraction painful. Catalogue depending on orders creates a cycle the design forbids.
- With boundaries enforced, a module can later become a service by replacing in-process calls to its `api.ts` with network calls — the code is already shaped for it.
- Many successful companies stay with a modular monolith for years; extraction happens only for modules with a real reason (scaling needs, a separate team, a different release cadence).

## Designing services

### Level 3 — Boundaries and data ownership

- **Split by business capability and bounded context**, not by technical layer. "User service, database service, email service" is a layering mistake; "catalogue, ordering, payments, shipping" follows the business.
- **High cohesion, low coupling**: things that change together belong together. If every feature touches three services, the boundaries are wrong.
- **Each service owns its data**. No other service reads its tables. Other services get data through its API or by keeping their **own copy** updated from its events (the shipping service stores the delivery address it needs from `OrderPlaced`).
- **Size** is not the goal: "micro" means focused, not tiny. A team of five might own two to five services.
- **Conway's Law** works both ways: align services with team ownership — one team per service (or a few services), with clear responsibility for running it ("you build it, you run it").

### Level 3 — Communication: avoid long synchronous chains

The last four lines of the example's output show why long synchronous chains hurt: with each service available 99.9% of the time, a request passing through ten services succeeds only 99% of the time and spends around 250 ms on hops alone.

- **Prefer asynchronous events** between services for anything that does not need an immediate answer: checkout publishes `OrderPlaced`; shipping, email and loyalty react ({{ch:event-driven-systems}}).
- **Use synchronous APIs** (REST, gRPC) when the caller truly needs the answer now (price lookup, authorisation), with timeouts, retries for idempotent calls, circuit breakers and fallbacks ({{ch:distributed-systems}}).
- **Keep chains shallow**: an API composing two or three services in parallel, not ten in series. Duplicate (replicate) a little data rather than calling another service on every request.
- **Contracts**: version APIs and event schemas, keep changes backwards compatible, and use **consumer-driven contract tests** so a provider knows when a change would break a consumer ({{ch:api-versioning}}, {{ch:testing}}).

### Level 4 — Queries and transactions across services

- **Queries across services**: no joins across databases. Options: **API composition** (an API or BFF calls several services and combines results — fine for small data), **read models** built from events (a search or reporting store containing data from many services — CQRS), or a data warehouse for analytics.
- **Transactions across services**: no distributed ACID transactions in practice; use **sagas** with compensating actions and design for eventual consistency ({{ch:event-driven-systems}}).
- **Reliable publishing**: the transactional outbox or change data capture, so a service's database and its events agree ({{ch:message-brokers}}).

## Running microservices

### Level 4 — What the platform must provide

Microservices only work with strong automation and observability. Each service needs:

- **Its own CI/CD pipeline** and independent deployments with safe rollouts ({{ch:cicd}}).
- **Containers and orchestration** ({{ch:ecs}}, {{ch:eks}}), infrastructure as code and service templates.
- **Service discovery and routing**, an API gateway at the edge and often a service mesh inside.
- **Observability**: structured logs with correlation IDs, metrics and **distributed tracing** across services ({{ch:observability-and-incidents}}).
- **Security**: service identities, mTLS or signed tokens between services, least-privilege permissions and secrets per service ({{ch:secrets-manager}}).
- **Resilience defaults**: timeouts, retries and circuit breakers built into shared libraries or the mesh.
- **Ownership records**: a service catalogue with owners, on-call rotations, runbooks and dependencies.

Without this platform, every team reinvents it — which is why microservices adoption is often led by a platform team.

### Level 4 — Migrating from a monolith: the strangler fig

```text
 clients ──► routing layer (gateway / proxy)
               ├── /orders/*  ──► new orders service (owns orders data, synced from the monolith during migration)
               └── everything else ──► monolith
```

1. Put a **routing layer** in front of the monolith.
2. Choose a well-bounded capability with a clear reason to extract.
3. Build the new service; **move its data** (with change data capture while both run).
4. **Route traffic** for that capability to the new service gradually (feature flags or weighted routing), comparing results.
5. Remove the code from the monolith. Repeat for the next capability — or stop when the remaining monolith is fine as it is.

Never attempt a big-bang rewrite: it freezes features for months and usually fails.

## From beginner to enterprise

**Level 1–2 — foundations.** Monolith versus modular monolith versus microservices; module boundaries with public APIs; business capabilities and bounded contexts.

**Level 3 — service design.** Data ownership; boundaries by capability and team; asynchronous events first; shallow, resilient synchronous calls; contract tests.

**Level 4 — operating services.** Per-service pipelines, observability and security; API composition and read models; sagas and outbox; strangler-fig migrations.

**Level 5 — senior practice.** Deciding when (and whether) to split; designing boundaries that last; managing coupling across teams; recognising and fixing distributed monoliths.

**Level 6 — enterprises.** Platform engineering for hundreds of services, service catalogues and ownership, organisation design aligned with architecture.

## Real-world use cases

### The start-up that waited

- **Story**: a ten-engineer start-up kept a modular monolith with enforced boundaries, one PostgreSQL database with a schema per module, and a job queue. At 60 engineers, the payments and search modules — with different scaling needs and dedicated teams — were extracted as services along their existing module APIs, with little disruption.

### The distributed monolith

- **Story**: a company split its application into 40 services in a year. A typical request crossed eight services synchronously; services shared one database; releases required coordinating eight teams. Latency doubled and outages increased. The fix merged closely coupled services, introduced events for non-urgent flows, and gave each remaining service its own data.

## Common mistakes

### Beginner: microservices for a small team on a new product

**Consequence:** slow delivery and high operational cost. **Fix:** start with a modular monolith.

### Beginner: splitting by technical layer

**Fix:** split by business capability.

### Intermediate: shared databases

**Consequence:** hidden coupling; no independent changes. **Fix:** database per service; data through APIs and events.

### Intermediate: long synchronous call chains

**Consequence:** low availability and high latency. **Fix:** events, parallel composition, local copies of needed data.

### Intermediate: breaking API or event contracts

**Fix:** versioning and consumer-driven contract tests.

### Production: no platform

**Consequence:** every team reinvents deployment and monitoring badly. **Fix:** shared templates, pipelines and observability.

### Production: big-bang rewrites

**Fix:** the strangler fig pattern.

## Debugging and troubleshooting

- **A request is slow**: distributed traces show which service and which call; look for serial calls that could be parallel or avoided.
- **Data inconsistent between services**: event consumers behind or failing; check lag, DLQs and outbox relays.
- **A deployment broke another service**: an incompatible contract change; add contract tests and versioning.
- **Cascading failures**: missing timeouts, circuit breakers or bulkheads.
- **"Who owns this?"**: the service catalogue; if it does not exist, create it.

## Security summary

- **Zero trust between services**: authenticate every call (mTLS, signed tokens); authorise per service.
- **Least privilege per service**: its own database credentials, IAM role and secrets.
- **Edge security** at the gateway, plus validation in each service.
- **Data minimisation in events**: replicate only the data a consumer needs.
- **More services mean more attack surface**: consistent patching, scanning and configuration through the platform.

## How a senior engineer thinks about this

- **Microservices solve organisational scaling.** Without many teams, the cost rarely pays off.
- **Boundaries matter more than size.** Business capabilities, owned data, few dependencies.
- **Asynchronous by default, synchronous when necessary**, and always with timeouts.
- **The platform is part of the architecture.** Pipelines, observability and security for every service.
- **Evolve, do not rewrite.** Modular monolith first; strangle out services with clear reasons.

## Exercises

### Exercise 1 — Draw the boundaries

**Objective:** practise service boundaries.
**What to do:** an online shop has: product information, prices, stock levels, carts, orders, payments, shipping, customer accounts, reviews and email sending. Group them into services or modules and explain your reasoning.

<details>
<summary>Show the solution</summary>

One reasonable grouping:
- **Catalogue**: product information and reviews (content about products).
- **Pricing**: prices and promotions — changes often, used by many — possibly inside catalogue at first.
- **Inventory**: stock levels and reservations.
- **Ordering**: carts and orders (the buying flow).
- **Payments**: payment processing — separate for security and compliance.
- **Shipping**: shipments and couriers.
- **Accounts**: customers and authentication.
- **Notifications**: email and SMS, driven by events from other services.

Start as modules in a monolith; the first extraction candidates are payments (security and compliance boundary) and perhaps inventory if it has very different load.

</details>

### Exercise 2 — Break the chain

**Objective:** practise communication design.
**The flow:** placing an order synchronously calls inventory, then payments, then shipping, then loyalty, then email, then analytics, returning only after all six succeed. Redesign it.

<details>
<summary>Show the solution</summary>

- Synchronous only where the user needs an immediate answer: **reserve inventory** and **authorise payment** (perhaps as a saga, {{ch:event-driven-systems}}).
- Commit the order and publish **`OrderPlaced`** through the outbox.
- **Shipping, loyalty, email and analytics** consume the event asynchronously, each with retries and a DLQ.
- The user gets a response after two calls instead of six; a failure in loyalty or analytics no longer fails checkout.

</details>

### Exercise 3 — Production scenario: should we split?

**Objective:** practise architecture decisions.
**The scenario:** a 15-engineer company runs a monolith. Deployments take 40 minutes, tests are flaky, and two teams often block each other's releases. A manager wants to "move to microservices this year". What do you recommend?

<details>
<summary>Show the solution</summary>

The problems are **slow, unreliable delivery** and **team coupling** — microservices are one possible answer but expensive. First:
1. **Fix delivery**: speed up and stabilise the pipeline (parallel tests, fixing flaky tests, caching) ({{ch:cicd}}).
2. **Modularise**: define module boundaries along business capabilities, give each team ownership of modules, and enforce dependencies in CI.
3. **Decouple releases** with feature flags and trunk-based development.
4. **Extract selectively**: if one module has a clear need (different scaling, a separate team, security boundary), extract it with the strangler fig pattern once the platform (pipelines, observability) is ready.

Measure deployment frequency and lead time before and after, and write the decision down ({{ch:engineering-decisions}}).

</details>

## Summary

**Microservices** are independently deployable services organised around **business capabilities**, each **owning its data** and communicating over the network. They enable many teams to work and deploy independently and services to scale separately, at the cost of distributed-system complexity, operational overhead and eventual consistency. A **modular monolith** — one deployable with enforced module boundaries — gives most design benefits cheaply and is the right starting point for most teams; modules with real reasons can be extracted later.

Draw boundaries by capability and **bounded context**, aligned with teams (**Conway's Law**); avoid shared databases. Prefer **asynchronous events** between services, keep synchronous calls few, parallel and protected by timeouts and breakers — availability and latency multiply along synchronous chains — and protect contracts with versioning and **contract tests**. Cross-service queries use API composition or read models; cross-service transactions use **sagas** and the **outbox**. Microservices need a platform: per-service pipelines, orchestration, observability with tracing, security and ownership records. Migrate from monoliths gradually with the **strangler fig** pattern, never with big-bang rewrites, and beware the **distributed monolith**.

## Key terms

- **Microservices** — An architecture of small, independently deployable services around business capabilities.
- **Monolith** — An application deployed as a single unit.
- **Modular monolith** — A single deployable with strong, enforced internal module boundaries.
- **Business capability** — Something the business does, used as a service boundary.
- **Bounded context** — A part of the domain with its own consistent model and language.
- **Database per service** — Each service owning its data store exclusively.
- **Distributed monolith** — Tightly coupled services that must change and deploy together.
- **Conway's Law** — Systems mirror the communication structure of their organisations.
- **API composition** — Combining data from several services in one response.
- **Consumer-driven contract test** — A test of a provider against its consumers' expectations.
- **Service catalogue** — A registry of services, owners and dependencies.
- **Strangler fig pattern** — Incrementally replacing a legacy system by routing functionality to new services.
- **Platform team** — A team providing shared infrastructure and tooling for service teams.

## What comes next

The remaining chapters of this part apply everything to well-known systems. The next chapter, {{ch:designing-twitter}}, designs a social media feed at scale: requirements and estimates, timelines with fan-out on write and fan-out on read, the celebrity problem, caching, storage and search.
