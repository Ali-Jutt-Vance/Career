# Scalability

> [!GOALS]
> - Define scalability precisely, and distinguish it from performance.
> - Compare **vertical** and **horizontal** scaling, and explain why **stateless** services scale out easily.
> - Use **Little's Law**, **Amdahl's Law** and the **Universal Scalability Law** to reason about limits.
> - Find and remove **bottlenecks**: shared state, databases, locks, hot keys, synchronous chains.
> - Apply the main scaling patterns: load balancing, caching, asynchronous processing, partitioning, read replicas and CDNs.
> - Protect systems under overload with back-pressure, timeouts, rate limits and load shedding.

## Why this matters

A system that works for 100 users can fall over at 10,000. Usually it is not the code's logic that fails, but some limit nobody noticed: database connections, one lock that every request needs, a single server's memory, a third-party API's rate limit, a query that was fast on a small table. Growth — from a successful launch, a sale or a viral post — finds these limits at the worst possible moment.

**Scalability** is the ability of a system to handle more load by adding resources, without being redesigned. It is one of the main themes of system design ({{ch:system-design-fundamentals}}) and of senior engineering work: knowing which parts will break first, and making sure that adding servers actually helps.

## The simple idea

A coffee shop with one barista serves a limited number of customers per hour. You can hire a faster barista and buy a bigger machine (**scale up**), or open more counters with more baristas (**scale out**). Scaling out only works if any barista can serve any customer — if every order had to be approved by the one manager, adding baristas would just lengthen the queue at the manager's desk.

> [!ANALOGY]
> Scaling is like adding baristas to a coffee shop: it helps only if they do not all have to wait for the same manager, the same till or the same coffee grinder.
>
> **Where the analogy breaks:** adding baristas never makes the shop *slower*. In software, adding servers to a system with heavy coordination — shared locks, chatty consensus, a central database — can reduce total throughput, because each new server adds more coordination work for all the others.

## The proper definition and key words

**Scalability** is a system's ability to increase its capacity in proportion to added resources, while keeping acceptable performance. **Performance** is how fast it does work at a given load; a fast system may not scale, and a scalable system may be slow for one user.

Key words:

- **Vertical scaling (scale up)** — a bigger machine: more CPU, memory, faster disks.
- **Horizontal scaling (scale out)** — more machines sharing the load.
- **Stateless service** — keeps no client-specific data between requests; any instance can serve any request.
- **Bottleneck** — the resource that limits throughput.
- **Contention** — work waiting for a shared resource (a lock, a row, a connection).
- **Coherency cost** — the work of keeping copies or nodes in agreement.
- **Hot spot / hot key** — a part of the data or load that receives far more traffic than the rest.
- **Partitioning (sharding)** — splitting data or work by a key so different machines handle different parts.
- **Back-pressure** — slowing producers when consumers cannot keep up.
- **Load shedding** — rejecting some work deliberately to protect the rest.
- **Elasticity** — scaling automatically with demand ({{ch:auto-scaling}}).

## Scaling up and out

### Level 1 — Vertical and horizontal

| | Vertical | Horizontal |
|---|---|---|
| How | Bigger machine | More machines |
| Simplicity | Simple: no code changes | Requires statelessness, load balancing, distribution |
| Limit | The largest machine available, and its price | Very high, if the design allows it |
| Availability | One machine is a single point of failure | Survives the loss of machines and zones |
| Typical for | Databases (to a point), quick relief | Web and API tiers, workers, caches, storage |

In practice you do both: application servers scale out; databases first scale up, then out with replicas and partitioning ({{ch:database-scaling}}).

### Level 2 — Stateless services

A service scales out easily when **any instance can handle any request**. That means keeping state elsewhere:

- **Sessions** in Redis or signed tokens, not in server memory ({{ch:sessions}}, {{ch:jwt}}).
- **Files** in object storage, not on local disks ({{ch:s3}}).
- **Data** in databases and caches shared by all instances.
- **Background work** in queues, not in-process timers that run on every instance ({{ch:queues}}).
- **Configuration** from the environment, identical for every instance ({{ch:nodejs}}).

Then a load balancer can spread requests across instances, instances can be added and removed at any time, and failures only lose in-flight requests ({{ch:elb}}).

## The laws of scaling

### Level 3 — Three formulas worth knowing

```ts
// 1. Little's Law: requests in flight = arrival rate x time in system
const rps = 2_000, latencySeconds = 0.150;
console.log(`in flight at ${rps} req/s and ${latencySeconds * 1000} ms: ${rps * latencySeconds} requests`);
console.log(`if a slow dependency raises latency to 1.5 s: ${rps * 1.5} requests in flight (pools and memory must hold them)`);

// 2. Amdahl's Law: the part that cannot be parallelised limits the speed-up
const amdahl = (serialFraction: number, n: number) => 1 / (serialFraction + (1 - serialFraction) / n);
for (const n of [2, 8, 32, 128]) console.log(`${String(n).padStart(3)} workers, 5% serial: speed-up x${amdahl(0.05, n).toFixed(1)}`);

// 3. Universal Scalability Law: contention (alpha) and coordination (beta) make throughput peak, then fall
const usl = (n: number, alpha: number, beta: number, single = 500) => (single * n) / (1 + alpha * (n - 1) + beta * n * (n - 1));
console.log("instances  shared-nothing  with a hot shared lock");
for (const n of [1, 4, 16, 32, 64, 128]) {
  const ideal = usl(n, 0.0, 0.0), contended = usl(n, 0.03, 0.0005);
  console.log(`${String(n).padStart(9)}  ${ideal.toFixed(0).padStart(14)}  ${contended.toFixed(0).padStart(22)}`);
}
```

**Output:**

```text
in flight at 2000 req/s and 150 ms: 300 requests
if a slow dependency raises latency to 1.5 s: 3000 requests in flight (pools and memory must hold them)
  2 workers, 5% serial: speed-up x1.9
  8 workers, 5% serial: speed-up x5.9
 32 workers, 5% serial: speed-up x12.5
128 workers, 5% serial: speed-up x17.4
instances  shared-nothing  with a hot shared lock
        1             500                     500
        4            2000                    1825
       16            8000                    5096
       32           16000                    6595
       64           32000                    6523
      128           64000                    4947
```

- **Little's Law** (L = λ × W): the number of requests in progress equals the arrival rate times the time each spends in the system. When a dependency slows from 150 ms to 1.5 s at the same traffic, **ten times** as many requests are in flight — exhausting connection pools, threads and memory. This is how one slow service brings down others: timeouts are a scaling tool ({{ch:distributed-systems}}).
- **Amdahl's Law**: if 5% of the work is serial, even 128 workers give only a 17× speed-up — the maximum is 20×. Find and shrink the serial part (a single writer, a global lock, one database transaction everything waits for).
- The **Universal Scalability Law** adds **coordination**: with some contention and a little coherency cost, throughput **peaks** (here around 32 instances) and then **falls** as more instances are added. A shared-nothing design keeps growing linearly. Real measurements — load tests at several sizes — let you fit these curves to your own system ({{ch:performance-engineering}}).

## Finding bottlenecks

### Level 3 — Where systems usually break

- **The database**: too many connections, slow queries, missing indexes, lock contention on hot rows, write volume beyond one primary ({{ch:query-optimization}}, {{ch:indexes}}).
- **Shared locks and counters**: a single row updated by every request (a global counter, an inventory row for a popular product).
- **Hot keys**: one celebrity's profile, one viral product, one tenant much larger than the rest — partitioning by that key puts all their load on one machine.
- **Synchronous chains**: request → service A → B → C; latencies add and failures multiply.
- **External limits**: third-party API rate limits, email sending quotas, payment provider throughput.
- **Per-instance limits**: file descriptors, memory for in-flight requests, the Node.js event loop blocked by CPU work ({{ch:the-event-loop}}).

Find them by **measuring**: load tests that increase load step by step, with metrics on every resource (the USE method from {{ch:monitoring}}), and traces showing where time goes.

## Scaling patterns

### Level 3 — The toolbox

| Pattern | Helps when | Chapter |
|---|---|---|
| Stateless instances + load balancing | Request-handling capacity | {{ch:elb}}, {{ch:auto-scaling}} |
| Caching (in-process, distributed, CDN) | Repeated reads, expensive computations | {{ch:caching-at-scale}}, {{ch:cloudfront}} |
| Read replicas | Read-heavy databases | {{ch:replication}} |
| Asynchronous processing with queues | Slow or spiky work; protecting downstream systems | {{ch:message-brokers}} |
| Partitioning / sharding | Data or write volume beyond one machine | {{ch:sharding}}, {{ch:database-scaling}} |
| Denormalisation and precomputation | Expensive reads on the hot path | {{ch:designing-twitter}} |
| Batching | Many small operations with fixed overhead | — |
| CDN and edge | Static and cacheable content worldwide | {{ch:cloudfront}} |

Each has costs — caches can be stale, queues add delay, partitions make cross-partition queries hard. Apply them where measurements show the need.

### Level 4 — Surviving overload

Even scalable systems meet loads they cannot handle immediately (scaling takes minutes). Design for it:

- **Timeouts** on every remote call, shorter than the caller's own timeout, so slowness does not pile up (Little's Law).
- **Back-pressure**: bounded queues and pools; when full, slow down producers or reject new work instead of growing memory until a crash.
- **Rate limiting and quotas** per client, so one customer cannot take all capacity ({{ch:rate-limiting}}).
- **Load shedding**: under overload, reject low-priority requests (analytics, recommendations) fast to keep high-priority ones (checkout) working; return 503 with `Retry-After`.
- **Circuit breakers** stop calling a failing dependency for a while ({{ch:distributed-systems}}).
- **Retries with backoff and jitter**, limited in number — unlimited retries turn a small problem into a retry storm.
- **Graceful degradation**: hide the recommendations widget rather than failing the page.

## From beginner to enterprise

**Level 1–2 — scaling basics.** Vertical versus horizontal; stateless services; sessions, files and jobs moved out of instances; load balancers.

**Level 3 — finding limits.** Load testing; Little's Law, Amdahl's Law and the USL; database, lock and hot-key bottlenecks; caching, replicas and queues where measured.

**Level 4 — resilient scale.** Timeouts, back-pressure, rate limits and load shedding; partitioning; precomputation; capacity planning from growth trends.

**Level 5 — senior practice.** Designing shared-nothing architectures; choosing partition keys that avoid hot spots; balancing consistency against scale; cost per unit at scale.

**Level 6 — enterprises.** Multi-region active-active systems, cell-based architectures that limit blast radius, organisation-wide capacity planning.

## Real-world use cases

### The flash sale

- **What happened**: a sale on one product sent every request to update the same inventory row; the database spent its time waiting on the row lock and the whole shop slowed down.
- **Fix**: inventory reserved through a Redis counter with atomic decrements and reconciled to the database asynchronously; a queue for order processing; the product page cached at the CDN.

### The slow dependency

- **What happened**: a recommendations service slowed to 3 seconds. The product page waited for it without a timeout; Little's Law did the rest — requests piled up, the API ran out of connections, and the whole site failed.
- **Fix**: a 200 ms timeout with a fallback (no recommendations), a circuit breaker, and bulkheads (separate connection pools per dependency).

## Common mistakes

### Beginner: state in instance memory

**Consequence:** lost sessions and inconsistent behaviour when scaling. **Fix:** stateless instances.

### Beginner: scaling the app tier and forgetting the database

**Fix:** measure the database; caching, replicas, connection pooling.

### Intermediate: no timeouts

**Consequence:** one slow dependency exhausts everything. **Fix:** timeouts and fallbacks on every call.

### Intermediate: unbounded queues and pools

**Consequence:** memory exhaustion under load. **Fix:** bounds and back-pressure.

### Intermediate: partition keys with hot spots

**Fix:** keys with even distribution; special handling for very large tenants or keys.

### Production: retry storms

**Fix:** limited retries with exponential backoff and jitter; circuit breakers.

### Production: guessing capacity

**Fix:** load tests and capacity models based on measurements.

## Debugging and troubleshooting

- **Throughput stops growing as you add instances**: a shared bottleneck — database, lock, external API. Plot throughput against instance count (the USL curve).
- **Latency rises sharply at a certain load**: a resource near saturation; check utilisation and queue lengths.
- **One partition or node much busier than others**: a hot key; check key distribution.
- **Everything slow after one dependency slowed**: missing timeouts and bulkheads; check in-flight request counts.
- **Errors during scaling events**: new instances receiving traffic before they are ready, or connection limits reached.

## Security summary

- **Rate limits and quotas** are both scalability and security controls against abuse and denial of service.
- **Expensive operations** (search, exports, image processing) need limits and authentication, or attackers use them to overload you.
- **Shared caches and partitions** must still enforce tenant isolation.
- **Autoscaling limits** cap the cost of attacks.

## How a senior engineer thinks about this

- **Measure, do not guess.** Load tests and metrics find the real bottleneck.
- **Shared things limit scale.** Remove or partition shared state, locks and hot keys.
- **Slowness spreads.** Timeouts, bounds and circuit breakers stop it.
- **Overload is a design case.** Decide in advance what to reject and what to protect.
- **Simple first.** Scale up and cache before sharding; add complexity only for measured needs.

## Exercises

### Exercise 1 — Make it stateless

**Objective:** practise preparing a service for scale-out.
**The service:** stores sessions in memory, writes uploaded files to `/var/uploads`, runs a `setInterval` every minute that sends reminder emails, and caches product data in a module-level object. What must change before running ten instances?

<details>
<summary>Show the solution</summary>

- **Sessions** → Redis or signed tokens.
- **Uploads** → S3 with pre-signed URLs.
- **The interval job** → would run on all ten instances and send ten emails; move to a scheduled job with a lock, or a queue consumed by workers, idempotent per reminder ({{ch:cron-jobs}}).
- **In-process cache** → acceptable for small, rarely changing data with short TTLs (each instance has its own copy); for shared or frequently changing data, use Redis and invalidation ({{ch:caching}}).

</details>

### Exercise 2 — Apply Little's Law

**Objective:** practise capacity reasoning.
**What to do:** an API receives 500 requests per second; each request holds a database connection for 40 ms. How many connections are in use on average? What happens if a slow query makes it 400 ms?

<details>
<summary>Show the solution</summary>

L = λ × W = 500 × 0.04 = **20 connections** on average (plan for peaks above that). At 400 ms, L = 500 × 0.4 = **200 connections** — likely above the pool size and the database's comfortable limit, so requests wait for connections, latency rises further and the system can collapse. Fix the slow query, set statement timeouts, and size pools with headroom.

</details>

### Exercise 3 — Production scenario: adding servers did not help

**Objective:** practise bottleneck diagnosis.
**The scenario:** traffic doubled; the team doubled API instances from 10 to 20, but throughput rose only 15% and latency got worse. Database CPU is 45%, but "lock wait" time is high. What is happening and what do you do?

<details>
<summary>Show the solution</summary>

**Contention**: requests are waiting on database **locks**, not CPU — likely a hot row or table updated by many requests (a counter, a status row, a sequence of updates in long transactions). More instances add more waiters (the USL curve flattening or falling).

**Actions**: find the locking queries (lock wait statistics, slow query logs); shorten transactions; avoid updating a shared row per request (aggregate counters in Redis or batch them; use append-only records instead of updates); add indexes so updates lock fewer rows; and consider partitioning the hot data. Then re-run load tests at several instance counts.

</details>

## Summary

**Scalability** is handling more load by adding resources, as distinct from **performance** at a given load. **Vertical scaling** is simple but limited and a single point of failure; **horizontal scaling** needs **stateless** services, with sessions, files, data, jobs and configuration kept outside instances, behind load balancers.

Three laws explain the limits: **Little's Law** (in-flight work = rate × time) shows why slow dependencies exhaust pools and memory; **Amdahl's Law** shows how a serial fraction caps speed-up; the **Universal Scalability Law** shows contention and coordination making throughput peak and fall. Bottlenecks hide in databases, shared locks and counters, hot keys, synchronous chains, external limits and per-instance resources — found by load testing and measurement.

The scaling toolbox — load balancing, caching, read replicas, queues, partitioning, precomputation, batching and CDNs — is applied where measurements show need. Overload is designed for with **timeouts**, **back-pressure**, **rate limits**, **load shedding**, **circuit breakers**, limited retries with jitter and **graceful degradation**.

## Key terms

- **Scalability** — The ability to handle more load by adding resources.
- **Performance** — How fast a system works at a given load.
- **Vertical scaling** — Increasing the size of a machine.
- **Horizontal scaling** — Adding more machines.
- **Stateless service** — A service that keeps no client-specific state between requests.
- **Bottleneck** — The resource that limits throughput.
- **Contention** — Waiting for a shared resource.
- **Coherency cost** — The cost of keeping nodes or copies in agreement.
- **Little's Law** — In-flight work equals arrival rate times time in the system.
- **Amdahl's Law** — The serial part of work limits parallel speed-up.
- **Universal Scalability Law** — A model of throughput including contention and coherency costs.
- **Hot key** — A data key that receives disproportionate traffic.
- **Partitioning** — Dividing data or work by key across machines.
- **Back-pressure** — Slowing producers when consumers cannot keep up.
- **Load shedding** — Deliberately rejecting some work under overload.
- **Bulkhead** — Isolating resources so one failing part cannot exhaust all of them.
- **Retry storm** — A surge of retries that overloads a struggling system.
- **Jitter** — Random variation added to retry delays to spread them out.

## What comes next

Caching is the most powerful and most dangerous scaling tool. The next chapter, {{ch:caching-at-scale}}, looks at caching in large systems: cache layers, consistency and invalidation strategies, stampedes, hot keys, eviction, and the failure modes that caches introduce.
