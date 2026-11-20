# Software Architecture

> [!GOALS]
> - Explain what software architecture is: the decisions that are hard to change, and the qualities they serve.
> - Identify and prioritise **quality attributes** — maintainability, scalability, reliability, security, performance, cost.
> - Compare architectural styles: **layered**, **hexagonal (ports and adapters)**, **clean architecture**, modular monolith, microservices, event-driven, serverless.
> - Manage **dependencies and coupling**, and keep business rules independent of frameworks and infrastructure.
> - Record decisions with **architecture decision records (ADRs)** and communicate architecture with diagrams such as **C4**.
> - Let architecture **evolve** with fitness functions and incremental change.

## Why this matters

Every codebase has an architecture, whether anyone designed it or not. In a good one, adding a feature touches a few predictable places, tests run fast without real databases, a team can change its part without breaking others, and replacing a payment provider is a week of work, not a year. In a bad one — the "big ball of mud" — every change risks breaking something unexpected, nobody understands the whole, and the team slows down every month.

Architecture is the senior engineer's long game. Earlier chapters covered the building blocks: clean code ({{ch:clean-code}}), SOLID ({{ch:solid-principles}}), design patterns ({{ch:design-patterns}}), system design ({{ch:system-design-fundamentals}}) and microservices ({{ch:microservices}}). This chapter is about the **structure** of systems over time: which decisions matter, how to keep options open, and how to explain and record choices so others can build on them.

## The simple idea

Architecture is like the structure of a building: where the load-bearing walls, staircases, pipes and wiring go. You can repaint rooms, change furniture and even move non-load-bearing walls cheaply. Moving a staircase or the main water pipe is expensive. A good architect puts the hard-to-change parts where they will serve the building's purpose for decades, and keeps everything else easy to change.

> [!ANALOGY]
> Software architecture is like a building's structure: load-bearing walls and pipes are expensive to move, so they must serve the building's purpose, while everything else stays easy to change.
>
> **Where the analogy breaks:** buildings rarely change purpose. Software is asked to change constantly — new features, new scale, new teams — so good software architecture is less about getting the structure perfect at the start and more about keeping as much as possible **changeable**, and making the few fixed decisions consciously.

## The proper definition and key words

**Software architecture** is the set of significant decisions about a system's structure — its components, their responsibilities and relationships, and the principles guiding their design and evolution — chosen to achieve its **quality attributes**. A common short definition: architecture is the decisions that are expensive to change.

Key words:

- **Quality attribute (non-functional requirement)** — a property such as maintainability, performance, availability, security, scalability, testability, cost.
- **Component / module** — a unit with a clear responsibility and interface.
- **Coupling / cohesion** — how much components depend on each other / how closely related the things inside one component are.
- **Dependency rule** — dependencies point towards stable, abstract, business-level code.
- **Layered architecture** — presentation → business → data layers.
- **Hexagonal architecture (ports and adapters)** — the domain defines **ports** (interfaces); **adapters** connect them to the outside world.
- **Clean architecture / onion architecture** — variations with the domain at the centre and infrastructure at the edges.
- **Domain-driven design (DDD)** — modelling software around the business domain, its language and its bounded contexts.
- **Architecture decision record (ADR)** — a short document recording a decision, its context and consequences.
- **C4 model** — diagrams at four levels: context, containers, components, code.
- **Fitness function** — an automated check that the architecture keeps a desired property.
- **Technical debt** — the future cost of shortcuts taken now.

## Qualities and trade-offs

### Level 1 — Architecture serves qualities

Requirements describe **what** a system does; architecture mainly decides **how well**. Typical quality attributes:

| Quality | Question | Architectural levers |
|---|---|---|
| Maintainability | Can we change it safely and quickly? | Modularity, clear boundaries, tests, simplicity |
| Scalability | Can it handle growth? | Statelessness, partitioning, caching, async processing ({{ch:scalability}}) |
| Availability / reliability | Does it keep working through failures? | Redundancy, isolation, graceful degradation ({{ch:distributed-systems}}) |
| Performance | Is it fast enough? | Data locality, caching, fewer hops ({{ch:performance-engineering}}) |
| Security | Is it safe? | Trust boundaries, least privilege, defence in depth ({{ch:application-security}}) |
| Testability | Can we verify it cheaply? | Dependency inversion, ports and adapters |
| Cost | Is it affordable to run and build? | Managed services, simplicity ({{ch:cost-optimization}}) |

Qualities conflict — more availability costs money, more flexibility adds complexity — so architecture starts by **ranking** them for this product. A start-up's top quality is usually speed of change; a payments platform's is correctness and security.

### Level 2 — Architectural styles

- **Layered**: controllers, services, repositories. Familiar and fine for many applications; the risk is business logic leaking into controllers or depending on the database layer.
- **Hexagonal / clean**: the **domain** (business rules) at the centre depends on nothing; it defines **ports** — interfaces for what it needs (save an order, charge a card). **Adapters** implement them (PostgreSQL repository, Stripe client, HTTP controller). Infrastructure depends on the domain, never the reverse.
- **Modular monolith**: one deployable divided into modules by business capability with enforced boundaries — often the best default ({{ch:microservices}}).
- **Microservices**: independently deployable services for large organisations.
- **Event-driven**: components communicate through events ({{ch:event-driven-systems}}).
- **Serverless**: functions and managed services wired by events ({{ch:lambda}}).

These combine: a modular monolith whose modules use hexagonal structure inside, communicating through in-process events.

## Structure inside the code

### Level 3 — Ports and adapters in practice

The business rule — "order totals must be positive; record the payment result" — lives in a use case that knows only the **interfaces** it needs. In this example, tests plug in in-memory adapters; production would plug in PostgreSQL and a real payment provider without changing the use case:

```ts
// 1. Ports and adapters (hexagonal architecture): the domain defines the interfaces it needs;
//    infrastructure plugs in from outside. The domain imports nothing from databases or SDKs.

// ---- domain (pure business rules) ----
type Order = { id: string; customerId: string; totalPence: number; status: "placed" | "paid" | "rejected" };
interface OrderRepository { save(order: Order): Promise<void>; findById(id: string): Promise<Order | undefined> }
interface PaymentGateway { charge(customerId: string, amountPence: number): Promise<{ ok: boolean; reason?: string }> }

class PlaceOrder {
  constructor(private orders: OrderRepository, private payments: PaymentGateway) {}
  async execute(id: string, customerId: string, totalPence: number): Promise<Order> {
    if (totalPence <= 0) throw new Error("order total must be positive");      // a business rule
    const result = await this.payments.charge(customerId, totalPence);
    const order: Order = { id, customerId, totalPence, status: result.ok ? "paid" : "rejected" };
    await this.orders.save(order);
    return order;
  }
}

// ---- adapters (replaceable): in-memory for tests, real ones (PostgreSQL, Stripe) in production ----
class InMemoryOrders implements OrderRepository {
  rows = new Map<string, Order>();
  async save(o: Order) { this.rows.set(o.id, o); }
  async findById(id: string) { return this.rows.get(id); }
}
class FakePayments implements PaymentGateway {
  constructor(private declineAbovePence: number) {}
  async charge(_c: string, amount: number) { return amount > this.declineAbovePence ? { ok: false, reason: "limit" } : { ok: true }; }
}

const repo = new InMemoryOrders();
const useCase = new PlaceOrder(repo, new FakePayments(10_000));
console.log((await useCase.execute("o-1", "c-7", 4_500)).status);
console.log((await useCase.execute("o-2", "c-7", 25_000)).status);
try { await useCase.execute("o-3", "c-7", 0); } catch (e) { console.log("rejected by domain rule:", (e as Error).message); }
console.log("stored orders:", [...repo.rows.keys()].join(", "));

// 2. Measuring coupling: instability I = outgoing / (incoming + outgoing) dependencies.
//    Stable modules (I near 0) are depended on by many; they should be abstract and change rarely.
const deps: Record<string, string[]> = {
  "domain": [],
  "payments-adapter": ["domain"],
  "orders-api": ["domain", "payments-adapter", "postgres-adapter"],
  "postgres-adapter": ["domain"],
  "reports": ["domain", "postgres-adapter"],
};
for (const m of Object.keys(deps)) {
  const outgoing = deps[m]!.length;
  const incoming = Object.values(deps).filter((d) => d.includes(m)).length;
  const instability = outgoing + incoming === 0 ? 0 : outgoing / (incoming + outgoing);
  console.log(`${m.padEnd(17)} in ${incoming}  out ${outgoing}  instability ${instability.toFixed(2)}`);
}
```

**Output:**

```text
paid
rejected
rejected by domain rule: order total must be positive
stored orders: o-1, o-2
domain            in 4  out 0  instability 0.00
payments-adapter  in 1  out 1  instability 0.50
orders-api        in 0  out 3  instability 1.00
postgres-adapter  in 2  out 1  instability 0.33
reports           in 0  out 2  instability 1.00
```

The first four lines come from the use case; the last five measure coupling and are discussed below.

- `PlaceOrder` contains the **business rules** and depends only on `OrderRepository` and `PaymentGateway` — interfaces the domain defines (**dependency inversion**, {{ch:solid-principles}}).
- The tests ran in milliseconds with no database or network, covering the paid, rejected and invalid cases.
- Changing payment provider means writing a new adapter; the domain does not change. The same structure makes it easy to add an event publisher, a cache or a different storage engine.
- Do not over-apply it: a simple CRUD service with no real business logic does not need four layers of interfaces. Use the structure where rules are rich and change often.

### Level 3 — Dependencies and coupling

- **Dependencies should point towards stability**: modules that many others depend on should change rarely and be abstract; modules that change often (UI, API controllers, adapters) should depend on them, not the other way round.
- The last five lines of the output compute **instability** (outgoing ÷ total dependencies): the **domain** is fully stable (0.00) — everything depends on it, it depends on nothing — exactly as intended. The API and reports are fully unstable (1.00): they depend on others and nothing depends on them, so changing them is safe. A stable module that depends on many unstable ones is a warning sign.
- **No cycles**: cycles between modules mean they cannot be understood, tested or deployed separately. Enforce acyclic dependencies in CI (dependency-cruiser, ESLint boundaries, Nx module rules).
- **Shared code** (a "common" or "utils" package) quietly couples everything; keep it small and stable.

### Level 3 — Domain-driven design essentials

- **Ubiquitous language**: use the business's words in code (`Shipment`, `Refund`, `Reservation`), and agree on their meaning with domain experts.
- **Bounded contexts**: the same word can mean different things in different parts of the business ("customer" in billing versus marketing); give each context its own model and map between them explicitly.
- **Aggregates**: groups of objects changed together in one transaction with one root (an `Order` with its `OrderLines`), enforcing invariants — the natural units for transactions and, later, for service boundaries.
- **Domain events**: things that happened in the domain (`OrderPlaced`) — the bridge to event-driven integration.

## Decisions and communication

### Level 4 — Architecture decision records

Significant decisions should be written down, briefly, where the code lives (`docs/adr/0007-use-postgres-for-orders.md`):

```markdown
# 7. Store orders in PostgreSQL

Status: accepted (2026-11-21)

## Context
Orders need transactions across orders, order lines and payments; reporting needs ad-hoc queries.
Expected volume: 50,000 orders a day, growing 3x in two years.

## Decision
Use PostgreSQL (RDS, Multi-AZ) for the orders module, with an outbox table for events.

## Alternatives considered
- DynamoDB: scales effortlessly, but multi-item transactions and ad-hoc reporting are harder.
- MongoDB: flexible documents, but the team has more PostgreSQL experience.

## Consequences
+ Transactions and SQL reporting; familiar operations.
- Write scaling beyond one primary will need partitioning or sharding later.
- Reporting queries must move to a replica as load grows.
```

ADRs explain **why** the system is the way it is, help new team members, and stop the same debates from repeating. When a decision changes, write a new ADR that supersedes the old one ({{ch:engineering-decisions}}).

### Level 4 — Diagrams that communicate

The **C4 model** gives four zoom levels:
1. **Context**: the system, its users and the external systems it talks to.
2. **Containers**: deployable units — web app, API, database, queue, workers.
3. **Components**: the main parts inside one container.
4. **Code**: classes (rarely needed as a diagram).

Keep diagrams small, labelled, versioned with the code (diagrams as code: Structurizr, Mermaid, PlantUML) and drawn for an audience — a context diagram for product managers, a container diagram for new engineers ({{ch:code-review-and-documentation}}).

### Level 4 — Evolutionary architecture

- **Decide late where you can**: keep options open until you know more (start with a modular monolith; extract services when there is evidence).
- **Fitness functions**: automated checks that protect important properties — dependency rules, no cycles, response-time budgets, bundle size limits, security scans — running in CI ({{ch:cicd}}).
- **Manage technical debt deliberately**: record it, explain its cost, and pay it down continuously (a share of every iteration), especially in code that changes often.
- **Refactor towards the architecture incrementally**: the strangler fig pattern, branch by abstraction, feature flags — never a big-bang rewrite.
- **Review architecture** when context changes: new scale, new team structure, new regulations.

## From beginner to enterprise

**Level 1–2 — structure basics.** Quality attributes and their trade-offs; layered and modular code; keeping business logic out of controllers; clear module responsibilities.

**Level 3 — good internal architecture.** Ports and adapters for rich domains; dependency inversion; acyclic dependencies enforced in CI; DDD language, bounded contexts and aggregates.

**Level 4 — architectural practice.** ADRs; C4 diagrams; fitness functions; technical debt management; incremental migrations.

**Level 5 — senior practice.** Ranking qualities with stakeholders; choosing styles for the organisation and product stage; guiding several teams' designs; reviewing designs for long-term cost.

**Level 6 — enterprises.** Architecture across many systems: platform standards, reference architectures, governance that enables teams rather than blocking them.

## Real-world use cases

### The payment provider switch

- **Story**: a company had to move from one payment provider to another within two months because of pricing changes. Its checkout code called the old provider's SDK in 40 places. After the migration, the team introduced a `PaymentGateway` port with one adapter per provider; the next change of provider, two years later, took two weeks.

### The ADR that ended a debate

- **Story**: a team argued for the third time about moving to a document database. The tech lead found the ADR from a year earlier, which recorded the reasons for PostgreSQL and the conditions under which they would revisit (write volume beyond one primary). Those conditions had not occurred; the discussion took ten minutes.

## Common mistakes

### Beginner: business logic in controllers and SQL queries

**Consequence:** rules duplicated and hard to test. **Fix:** a domain or service layer with clear use cases.

### Beginner: frameworks at the centre

**Consequence:** business rules tied to an ORM or web framework. **Fix:** dependency inversion; frameworks at the edges.

### Intermediate: architecture astronautics

**Consequence:** many layers and abstractions for simple problems. **Fix:** structure proportional to complexity.

### Intermediate: dependency cycles and a giant "common" package

**Fix:** acyclic module graphs and small, stable shared code.

### Intermediate: undocumented decisions

**Consequence:** repeated debates and accidental reversals. **Fix:** ADRs.

### Production: big-bang rewrites

**Fix:** incremental evolution with fitness functions and the strangler fig pattern.

### Production: technical debt never paid

**Consequence:** delivery slows every month. **Fix:** continuous, visible repayment in high-change areas.

## Debugging and troubleshooting

When the architecture hurts:

- **Every change touches many files and teams**: boundaries do not follow how the system changes — look at which modules change together (change coupling from git history) and redraw boundaries.
- **Tests are slow and brittle**: business rules are tangled with infrastructure — introduce ports and in-memory adapters.
- **Nobody can explain how a request flows**: create context and container diagrams; add traces ({{ch:observability-and-incidents}}).
- **Performance or scaling problems in one part**: isolate that part behind an interface so it can be optimised or extracted.

## Security summary

- **Trust boundaries are architectural**: make them explicit in diagrams and code (where input is validated, where authorisation happens).
- **Centralise security-critical logic** (authentication, authorisation, cryptography) in well-tested modules rather than scattering it.
- **Least privilege between components**: each module or service gets only the data access it needs.
- **Record security decisions** in ADRs (encryption choices, data retention, third-party data sharing).

## How a senior engineer thinks about this

- **Architecture is about change.** Make the expensive decisions consciously and keep the rest easy to change.
- **Rank the qualities.** You cannot maximise everything; know what matters most now.
- **Protect the domain.** Business rules should not depend on frameworks, databases or vendors.
- **Write decisions down.** Context and consequences outlive the people in the meeting.
- **Evolve in small steps**, with automated checks guarding what matters.

## Exercises

### Exercise 1 — Rank the qualities

**Objective:** practise quality trade-offs.
**What to do:** rank the top three quality attributes for (a) a start-up's first product, (b) a hospital's medication records system, (c) a global video streaming service, and name one architectural consequence of each ranking.

<details>
<summary>Show the solution</summary>

- (a) **Speed of change, cost, simplicity** → a modular monolith on managed services; no microservices.
- (b) **Correctness and integrity, security and privacy, availability** → strong consistency, audit trails, strict access control, conservative change processes, redundancy.
- (c) **Scalability, availability, performance (latency)** → CDNs, regional deployments, asynchronous pipelines, aggressive caching, graceful degradation.

</details>

### Exercise 2 — Introduce a port

**Objective:** practise ports and adapters.
**The code:** an `InvoiceService` builds PDFs with a library and uploads them directly with the S3 SDK inside its methods; tests need real AWS access. Describe how to restructure it.

<details>
<summary>Show the solution</summary>

- Define ports the domain needs: `InvoiceRenderer` (`render(invoice): Promise<Buffer>`) and `DocumentStore` (`put(key, bytes, contentType): Promise<void>`).
- `InvoiceService` depends only on these interfaces and contains the rules (numbering, totals, which invoices to generate).
- Adapters: `PdfKitInvoiceRenderer`, `S3DocumentStore` in production; `FakeRenderer` and `InMemoryDocumentStore` in tests.
- Wire them at the application's entry point (composition root or a dependency-injection container, {{ch:nestjs-basics}}).
- Tests now run without AWS, and switching storage providers needs only a new adapter.

</details>

### Exercise 3 — Production scenario: the slowing team

**Objective:** practise architectural diagnosis.
**The scenario:** a team's delivery has slowed for a year. Features that once took a week take a month. Engineers say "everything is connected" and "we are scared to change the billing code". What do you do?

<details>
<summary>Show the solution</summary>

1. **Measure where it hurts**: change frequency and change coupling from git history (which files change together), defect rates per module, test run times.
2. **Map the current structure**: container and component diagrams; dependency graphs with cycles highlighted.
3. **Protect before changing**: add characterisation tests around the billing code so behaviour is captured.
4. **Introduce boundaries incrementally**: extract a billing module with a clear interface; break cycles; move rules out of controllers and queries into domain code; add dependency rules in CI as fitness functions.
5. **Pay down debt continuously** in the highest-change areas, a fixed share of each iteration, with visible progress.
6. **Record decisions** in ADRs and review progress with the team after a few iterations, measuring delivery speed again.

</details>

## Summary

**Software architecture** is the set of significant, hard-to-change decisions about a system's structure, chosen to achieve its **quality attributes** — maintainability, scalability, reliability, performance, security, testability and cost — which conflict and must be **ranked** for each product. Styles include **layered**, **hexagonal/clean**, **modular monolith**, **microservices**, **event-driven** and **serverless**, often combined.

Inside the code, keep **business rules at the centre**, depending only on **ports** that the domain defines, with **adapters** for databases, providers and frameworks at the edges — making rules testable in milliseconds and infrastructure replaceable. Point dependencies towards stable, abstract modules, measure coupling, forbid cycles, keep shared code small, and use DDD's ubiquitous language, bounded contexts and aggregates where the domain is rich.

Record decisions in **ADRs** with context, alternatives and consequences; communicate with **C4** diagrams kept as code; protect important properties with **fitness functions** in CI; manage **technical debt** deliberately; and evolve architecture incrementally rather than through rewrites.

## Key terms

- **Software architecture** — The significant structural decisions of a system and the reasoning behind them.
- **Quality attribute** — A property describing how well a system performs its functions.
- **Coupling** — The degree to which components depend on each other.
- **Cohesion** — How closely related the responsibilities within a component are.
- **Layered architecture** — Structuring code into presentation, business and data layers.
- **Hexagonal architecture** — A domain core with ports implemented by external adapters.
- **Port** — An interface defined by the domain for something it needs.
- **Adapter** — An implementation connecting a port to a technology.
- **Clean architecture** — An architecture where dependencies point inward to business rules.
- **Dependency inversion** — High-level code depending on abstractions rather than concrete details.
- **Instability (metric)** — Outgoing dependencies divided by all dependencies of a module.
- **Domain-driven design** — Designing software around the business domain and its language.
- **Ubiquitous language** — A shared vocabulary between developers and domain experts.
- **Aggregate** — A cluster of domain objects changed together through one root.
- **Architecture decision record** — A short document recording a decision, context and consequences.
- **C4 model** — A set of diagram levels: context, containers, components and code.
- **Fitness function** — An automated check that protects an architectural property.
- **Technical debt** — The future cost of expedient shortcuts.
- **Big ball of mud** — A system without discernible structure.

## What comes next

Architecture is a series of decisions under uncertainty. The next chapter, {{ch:engineering-decisions}}, is about making those decisions well: framing trade-offs, estimating effort and risk, writing design documents, choosing "good enough", and deciding with others.
