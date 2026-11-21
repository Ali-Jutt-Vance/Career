# Performance Engineering

> [!GOALS]
> - Treat performance as an engineering discipline: **requirements, measurement, analysis, change, verification**.
> - Measure the right things: latency percentiles, throughput, resource utilisation and user-perceived speed.
> - Find where time goes with **traces** and **profilers**, including in Node.js.
> - Fix the most common causes of slowness: N+1 queries, missing indexes, chatty networks, blocking the event loop, memory leaks and bad algorithms.
> - Run meaningful **load tests** and plan capacity.
> - Prevent performance regressions with budgets and continuous checks.

## Why this matters

Speed is a feature. Slow pages lose customers — studies by large online retailers have repeatedly linked fractions of a second of extra latency to measurable drops in conversion — and slow APIs cost money in servers, frustrate users and cause timeouts that cascade into outages ({{ch:distributed-systems}}). But performance work is also a trap: engineers love to optimise, and optimising the wrong thing wastes time and makes code harder to read.

Senior engineers approach performance like scientists: they define what "fast enough" means, **measure** where time goes, change the biggest cause, and **verify** the effect. This chapter gives that method and the most common real causes of slowness, building on {{ch:frontend-performance}} for the browser side, {{ch:query-optimization}} for databases and {{ch:monitoring}} for measurement.

## The simple idea

If your car journey to work takes too long, you do not start by polishing the car to reduce air resistance. You time each part of the trip: ten minutes driving, thirty minutes stuck at one junction, five minutes parking. Then you fix the junction — leave earlier or take another route. Optimising anything else first is wasted effort.

> [!ANALOGY]
> Performance work is like speeding up a commute: time each part of the journey first, then fix the one junction where you wait thirty minutes.
>
> **Where the analogy breaks:** a commute has a few stages you can see. A request in a distributed system may pass through dozens of steps across many machines, and the slow part is often invisible without instruments — a lock, a garbage-collection pause, a retry inside a library. And fixing one junction moves the queue to the next one.

## The proper definition and key words

**Performance engineering** is the practice of ensuring a system meets its performance requirements — latency, throughput, resource use and cost — through measurement-driven design, analysis and optimisation across its life.

Key words:

- **Latency** — time to complete one operation; measured as **percentiles** (p50, p95, p99).
- **Throughput** — operations per second.
- **Utilisation / saturation** — how busy a resource is / work waiting for it.
- **Bottleneck** — the resource limiting performance.
- **Profiling** — measuring where a program spends CPU time or allocates memory.
- **Flame graph** — a visualisation of profiled stack samples.
- **Distributed trace** — timings of one request across services, split into **spans**.
- **Load test / stress test / soak test** — performance under expected load / beyond capacity / over a long period.
- **Performance budget** — a limit (such as "p95 under 200 ms") enforced in development.
- **Regression** — a change that makes performance worse.
- **Amdahl's Law** — speeding up one part only helps in proportion to its share of the total ({{ch:scalability}}).

## The method

### Level 1 — Measure first

1. **Define the target**: "checkout API p95 under 300 ms at 2,000 requests per second", "home page Largest Contentful Paint under 2.5 s on a mid-range phone".
2. **Measure the current state** in realistic conditions — production metrics and traces, or a load test with production-like data.
3. **Find the biggest contributor** with traces and profiles.
4. **Change one thing**, the biggest contributor.
5. **Verify** with the same measurement; keep the change only if it helped.
6. **Repeat** until the target is met — then stop.

The rule from Amdahl's Law: making a step that takes 5% of the time twice as fast saves 2.5%; halving a step that takes 60% saves 30%.

### Level 2 — Measure the right things

- **Percentiles, not averages**: averages hide slow tails ({{ch:monitoring}}).
- **Per endpoint and per step**: one global latency number hides which route is slow.
- **User-perceived speed**: front-end metrics (Core Web Vitals) and mobile network conditions, not just server time ({{ch:frontend-performance}}).
- **Resources**: CPU, memory, garbage collection, event-loop delay, database time, connection pool waits.
- **Under realistic load and data**: a query fast on 1,000 rows may be slow on 10 million.

## Common causes and fixes

### Level 2 — Counting the work

Many performance problems are visible without a stopwatch, just by counting operations. This example counts database round trips and comparisons, and reads a latency budget from a trace:

```ts
// Count work instead of timing it, so the comparison is the same on every machine.
// 1. The N+1 query problem, and batching
let roundTrips = 0;
const customers = new Map(Array.from({ length: 50 }, (_, i) => [i, { id: i, name: `customer ${i}` }]));
const orders = Array.from({ length: 200 }, (_, i) => ({ id: i, customerId: i % 50 }));
const ROUND_TRIP_MS = 2;                                        // a typical in-region database round trip

async function getCustomer(id: number) { roundTrips++; return customers.get(id)!; }
async function getCustomers(ids: number[]) { roundTrips++; return ids.map((id) => customers.get(id)!); }

roundTrips = 0;
for (const o of orders) await getCustomer(o.customerId);        // one query per order
console.log(`N+1:     ${roundTrips} queries  ~${roundTrips * ROUND_TRIP_MS} ms of waiting`);

roundTrips = 0;
const unique = [...new Set(orders.map((o) => o.customerId))];
const byId = new Map((await getCustomers(unique)).map((c) => [c.id, c]));
const named = orders.map((o) => ({ ...o, customer: byId.get(o.customerId)!.name }));
console.log(`batched: ${roundTrips} query    ~${roundTrips * ROUND_TRIP_MS} ms of waiting (${named.length} orders named)`);

// 2. Algorithmic cost: finding products in a list versus an index
const products = Array.from({ length: 10_000 }, (_, i) => ({ sku: `SKU-${i}`, price: i }));
const wanted = Array.from({ length: 1_000 }, (_, i) => `SKU-${i * 7}`);
let comparisons = 0;
for (const sku of wanted) { for (const p of products) { comparisons++; if (p.sku === sku) break; } }
console.log(`linear search: ${comparisons.toLocaleString("en-GB")} comparisons`);
const index = new Map(products.map((p) => [p.sku, p]));
let lookups = 0;
for (const sku of wanted) { lookups++; index.get(sku); }
console.log(`Map index:     ${lookups.toLocaleString("en-GB")} lookups (+ ${products.length.toLocaleString("en-GB")} inserts to build it once)`);

// 3. Where does the time go? A latency budget for one request, from a trace
const spans = [["auth middleware", 3], ["load cart (cache hit)", 2], ["price rules (CPU)", 38], ["inventory API", 95], ["save order (DB)", 12], ["serialise response", 4]] as const;
const totalMs = spans.reduce((s, [, ms]) => s + ms, 0);
for (const [name, ms] of [...spans].sort((a, b) => b[1] - a[1])) console.log(`${name.padEnd(22)} ${String(ms).padStart(3)} ms  ${"#".repeat(Math.round((ms / totalMs) * 40))}`);
console.log(`total ${totalMs} ms; the top item is ${Math.round((95 / totalMs) * 100)}% of it — start there`);
```

**Output:**

```text
N+1:     200 queries  ~400 ms of waiting
batched: 1 query    ~2 ms of waiting (200 orders named)
linear search: 3,497,500 comparisons
Map index:     1,000 lookups (+ 10,000 inserts to build it once)
inventory API           95 ms  #########################
price rules (CPU)       38 ms  ##########
save order (DB)         12 ms  ###
serialise response       4 ms  #
auth middleware          3 ms  #
load cart (cache hit)    2 ms  #
total 154 ms; the top item is 62% of it — start there
```

- **N+1 queries**: loading the customer for each of 200 orders made **200** database round trips; at 2 ms each, 400 ms of pure waiting. Batching the unique IDs into one query (`where id = any($1)`) made it **one**. ORMs create N+1 problems easily through lazy loading; use eager loading, joins or DataLoader-style batching ({{ch:orms}}, {{ch:graphql}}).
- **Algorithms and data structures**: searching a list for each of 1,000 SKUs took about 3.5 million comparisons; a `Map` index made it 1,000 lookups. Quadratic loops hide easily in "small" code that later meets large data ({{ch:big-o}}).
- **The latency budget** from a trace shows where to start: the inventory API call is 62% of the request. Optimising serialisation (4 ms) would be pointless; options for inventory are caching, calling it in parallel with price rules, or a faster endpoint.

### Level 3 — Databases and networks

- **Missing indexes and bad query plans**: use `EXPLAIN ANALYZE`, `pg_stat_statements` and slow query logs ({{ch:indexes}}, {{ch:query-optimization}}).
- **Too much data**: select only needed columns; paginate with keysets; avoid loading large objects you do not use.
- **Chatty communication**: many small calls between services or to the database — batch, cache, or move the work closer to the data.
- **Serial calls that could be parallel**: `await a(); await b();` when the two are independent — use `Promise.all`.
- **Connection pools**: too small (requests wait for connections) or too large (database overload) ({{ch:rds}}).
- **Payload size**: compress responses, avoid huge JSON, use pagination.

### Level 3 — Node.js specifics

- **Do not block the event loop**: CPU-heavy work (large JSON parsing, image processing, cryptography with synchronous APIs, big sorts) stops every other request on that process. Move it to worker threads, a separate service or a queue ({{ch:the-event-loop}}).
- **Measure event-loop delay** (`monitorEventLoopDelay` from `perf_hooks`) and alert when it grows.
- **Profile CPU** with `node --cpu-prof` or `--inspect` and Chrome DevTools, or tools like 0x and Clinic.js, and read the **flame graph**: wide boxes are where time goes.
- **Memory leaks**: growing heaps from unbounded caches, listeners never removed or closures holding large objects; compare heap snapshots over time.
- **Garbage collection**: allocating many short-lived objects in hot paths causes GC pauses; reuse buffers, avoid needless copies.
- **Streams** for large files and responses instead of loading everything into memory.

### Level 3 — Caching and precomputation

The fastest work is work not done: cache repeated reads ({{ch:caching-at-scale}}), precompute expensive results in the background, and serve static or cacheable content from a CDN ({{ch:cloudfront}}). Always measure the hit ratio and the freshness cost.

## Load testing and capacity

### Level 4 — Load tests that mean something

- **Tools**: k6, Gatling, Locust, Artillery or JMeter, run against an environment like production.
- **Realistic scenarios**: the real mix of endpoints, realistic data volumes, think times between user actions, logged-in users, and caches in their normal state (not all warm, not all cold).
- **Types**: **load** (expected peak), **stress** (find the breaking point and how it breaks), **spike** (sudden bursts), **soak** (hours, to find leaks and slow degradation).
- **Watch the whole system** during tests: latency percentiles, errors, CPU, memory, database, queues — find which resource saturates first.
- **Open versus closed models**: tools that wait for each response before sending the next (closed) hide overload; real users keep arriving (open model, constant arrival rate).

### Level 4 — Capacity planning and budgets

- **Capacity model**: from load tests, how many requests per second one instance handles at the target latency; with growth forecasts, how many instances and how much database capacity you need ({{ch:auto-scaling}}).
- **Headroom**: run at 50–70% of measured capacity to absorb spikes and failures.
- **Performance budgets**: limits in CI for front-end bundle sizes and Lighthouse scores, benchmark tests for critical functions, and latency SLOs with alerts in production ({{ch:monitoring}}).
- **Regression detection**: compare p95 latency and resource use before and after each deployment; automated canary analysis catches regressions early ({{ch:cicd}}).

## From beginner to enterprise

**Level 1–2 — the method.** Defining targets; measuring percentiles per endpoint; fixing N+1 queries, missing indexes and obvious algorithmic problems; parallelising independent calls.

**Level 3 — analysis.** Distributed traces and latency budgets; CPU and memory profiling in Node.js; event-loop monitoring; caching and precomputation with measured effects.

**Level 4 — performance at scale.** Realistic load, stress, spike and soak tests; capacity models and headroom; budgets and regression checks in CI and canaries.

**Level 5 — senior practice.** Choosing architectures for performance (async processing, data locality); balancing performance against simplicity and cost; teaching teams to measure first.

**Level 6 — enterprises.** Performance engineering teams, organisation-wide SLOs and budgets, and continuous performance testing across hundreds of services.

## Real-world use cases

### The slow order history

- **What happened**: the "My orders" page took 3 seconds for customers with many orders.
- **Analysis**: a trace showed 180 database queries per request — an N+1 pattern loading items and products per order.
- **Fix**: two batched queries and a cache for product names. p95 fell to 120 ms.

### The midday slowdown

- **What happened**: every day at noon, API latency doubled for an hour.
- **Analysis**: event-loop delay metrics spiked at the same time; a CPU profile showed synchronous PDF generation for a daily report running in the API process.
- **Fix**: report generation moved to a worker reading from a queue.

## Common mistakes

### Beginner: optimising without measuring

**Fix:** profile and trace first; change the biggest contributor.

### Beginner: averages instead of percentiles

**Fix:** p95 and p99 per endpoint.

### Intermediate: N+1 queries from ORMs

**Fix:** eager loading, batching, joins.

### Intermediate: blocking the event loop

**Fix:** worker threads, queues or separate services for CPU work.

### Intermediate: serial independent calls

**Fix:** run them in parallel.

### Production: load tests with unrealistic data or a closed model

**Consequence:** false confidence. **Fix:** production-like data and constant arrival rates.

### Production: no regression detection

**Fix:** budgets in CI and canary analysis on deployments.

## Debugging and troubleshooting

- **One endpoint slow**: trace it; look at spans for database, external calls and CPU.
- **Everything slow at once**: shared resources — database, event loop, garbage collection, a saturated dependency, CPU throttling in containers.
- **Slowly getting worse over hours**: memory leaks, growing caches, connection leaks — soak tests and heap snapshots.
- **Fast in tests, slow in production**: data volume, cold caches, network distance, noisy neighbours.
- **Latency spikes every few minutes**: garbage collection, cron jobs, cache expiry waves, autoscaling events.

## Security summary

- **Performance and security interact**: expensive endpoints are denial-of-service targets — rate limits, timeouts and size limits ({{ch:rate-limiting}}).
- **Caches** must not leak data between users.
- **Profiles and heap snapshots** can contain secrets and personal data — handle them like production data.
- **Never disable security checks** (TLS, validation, authorisation) to gain speed.

## How a senior engineer thinks about this

- **Measure, change, measure.** Intuition about performance is usually wrong.
- **The biggest share first.** Amdahl's Law decides where effort pays.
- **Good enough is a target.** Stop when the requirement is met.
- **Count round trips.** Network and database waits dominate most back-end latency.
- **Protect performance continuously.** Budgets, SLOs and regression checks.

## Exercises

### Exercise 1 — Read the trace

**Objective:** practise prioritising.
**What to do:** a request takes 900 ms: 20 ms authentication, 600 ms in 30 sequential calls to a product service (20 ms each), 200 ms in a database query, 80 ms rendering. What would you change first?

<details>
<summary>Show the solution</summary>

The 30 sequential product calls (600 ms, two thirds of the time). Options: one **batch** endpoint taking all 30 IDs, calling them **in parallel** (limited concurrency), or **caching** product data. A batch call could bring 600 ms down to about 20–40 ms. Then look at the 200 ms query (`EXPLAIN ANALYZE`, indexes).

</details>

### Exercise 2 — Find the event-loop blocker

**Objective:** practise Node.js diagnosis.
**What to do:** an API's p99 latency for all endpoints jumps from 50 ms to 2 s for a few seconds every few minutes, though CPU averages 30%. How do you investigate?

<details>
<summary>Show the solution</summary>

All endpoints being affected at once suggests the **event loop** is blocked (or garbage-collection pauses). Check event-loop delay metrics and GC metrics for the same moments; take a CPU profile during a spike (or run with `--cpu-prof`) and look for one wide synchronous function — often a large `JSON.parse` or `JSON.stringify`, a synchronous crypto or compression call, a big sort, or a periodic job inside the API process. Move that work to worker threads or a separate worker, or make it streaming or incremental.

</details>

### Exercise 3 — Production scenario: will it survive the sale?

**Objective:** practise capacity planning.
**The scenario:** marketing expects five times normal traffic during a sale next month. What do you do to be confident the system will cope?

<details>
<summary>Show the solution</summary>

1. **Model the traffic**: the expected mix of endpoints at 5× (more product views and checkouts, fewer account pages).
2. **Load test** in a production-like environment at 5× and beyond, with an open arrival model and realistic data.
3. **Find the first bottleneck** (often the database or an external payment or inventory API); fix or add capacity; repeat.
4. **Plan scaling**: pre-scale (scheduled scaling) before the sale; confirm autoscaling limits, database connections and third-party rate limits ({{ch:auto-scaling}}).
5. **Protect the critical path**: cache product pages at the CDN, queue non-critical work, prepare load shedding for low-priority features.
6. **Prepare operations**: dashboards, alerts, an on-call plan and a rollback plan.

</details>

## Summary

**Performance engineering** is measurement-driven: define targets, measure in realistic conditions, find the biggest contributor with **traces** and **profiles**, change it, verify, and stop when the target is met. Measure **percentiles** per endpoint, user-perceived speed, and resources including event-loop delay and database time.

Most back-end slowness comes from **counting problems** — **N+1 queries**, sequential calls that could be parallel or batched, chatty services, algorithms with quadratic cost — and from databases (missing indexes, large reads, pool sizing). In Node.js, avoid **blocking the event loop**, profile with flame graphs, find memory leaks with heap snapshots, and use streams for large data. Cache and precompute where it pays.

**Load tests** — load, stress, spike and soak, with realistic data and open arrival models — reveal bottlenecks and feed **capacity plans** with headroom. **Performance budgets**, SLOs and canary analysis catch **regressions** before users do.

## Key terms

- **Performance engineering** — Ensuring a system meets performance requirements through measurement and optimisation.
- **Latency percentile** — The latency below which a given share of requests fall.
- **Throughput** — Operations completed per unit of time.
- **Bottleneck** — The resource that limits performance.
- **Profiling** — Measuring where a program spends time or memory.
- **Flame graph** — A visualisation of where CPU time is spent in call stacks.
- **Distributed trace** — Timings of one request across components.
- **Span** — One timed operation within a trace.
- **N+1 query problem** — Issuing one query per item instead of one query for all items.
- **Event-loop delay** — How long tasks wait for Node.js's event loop.
- **Memory leak** — Memory that is never released and keeps growing.
- **Load test** — Testing performance at expected load.
- **Stress test** — Testing beyond capacity to find breaking points.
- **Soak test** — Testing over a long period to find gradual problems.
- **Open workload model** — Load generation where requests arrive regardless of responses.
- **Performance budget** — An enforced limit on a performance metric.
- **Performance regression** — A change that makes performance worse.
- **Capacity planning** — Estimating the resources needed for expected load.

## What comes next

Measuring performance is part of a wider skill: understanding what production systems are doing, and responding well when they fail. The next chapter, {{ch:observability-and-incidents}}, covers observability with logs, metrics and traces, and the practice of handling production incidents: on-call, incident roles, communication, mitigation and blameless reviews.
