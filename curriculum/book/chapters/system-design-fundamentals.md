# System Design Fundamentals

> [!GOALS]
> - Explain what system design is and why it matters for every engineer, not only architects.
> - Turn a vague problem into **functional** and **non-functional requirements**.
> - Make **back-of-the-envelope estimates** of traffic, storage and bandwidth.
> - Draw a **high-level design** from standard building blocks, then go deeper where it matters.
> - Reason about the core trade-offs: **latency** and **throughput**, **availability** and **consistency** (**CAP** and **PACELC**), cost and complexity.
> - Use a repeatable method in design discussions and system design interviews.

## Why this matters

Writing a function that works is programming. Deciding how many servers you need, where the data lives, what happens when a database fails, how a request crosses five services in under 200 milliseconds and how much it will all cost — that is **system design**. Every feature that serves real users involves some of it: where to cache, whether to process something now or in a queue, how to keep two copies of data in sync.

System design is also a standard part of hiring for back-end roles beyond junior level ({{ch:technical-interview-guide}}). Interviewers give an open problem — "design a URL shortener", "design a chat app" — and watch how you clarify requirements, estimate, propose a design, find the weak points and discuss trade-offs. There is no single right answer; there is a right **way of thinking**.

This part of the book builds that way of thinking: this chapter gives the method and the basic trade-offs; the following chapters cover scalability, caching, databases, messaging, distributed systems, gateways and microservices; and three case studies put it all together.

## The simple idea

Designing a system is like planning a restaurant before building it. First you ask what kind of restaurant: how many guests, what food, how fast must meals arrive, what happens when the oven breaks? Then you estimate: 200 guests at lunch needs this many tables, cooks and fridges. Then you draw the layout — dining room, kitchen, store room — and only then decide details such as which oven to buy. Changing a wall after opening is expensive; changing it on paper is free.

> [!ANALOGY]
> System design is like planning a restaurant before building it: decide what it must do, estimate how big it must be, draw the layout, then choose the equipment.
>
> **Where the analogy breaks:** a restaurant's guests arrive in predictable numbers and nobody copies the kitchen across three cities. Software systems can grow a hundredfold in months, run in several regions at once, and fail in partial, confusing ways — a database that is slow rather than down, a network that loses one message in a million. Designs must expect growth and partial failure from the start.

## The proper definition and key words

**System design** is the process of defining a system's architecture — its components, their responsibilities, the data they store and the ways they communicate — so that it meets functional requirements and non-functional qualities such as scale, reliability, latency, security and cost.

Key words:

- **Functional requirements** — what the system does (users can post photos; followers see them in a feed).
- **Non-functional requirements** — how well it does it: scale, latency, availability, durability, consistency, security, cost.
- **Latency** — the time for one operation; **throughput** — operations per unit of time.
- **QPS / RPS** — queries or requests per second.
- **Availability** — the share of time the system works (99.9% ≈ 43 minutes of downtime a month).
- **Durability** — the probability that stored data is not lost.
- **Consistency** — whether every reader sees the latest write.
- **CAP theorem** — during a network partition, a distributed system must choose between consistency and availability.
- **PACELC** — and Else (when there is no partition), between latency and consistency.
- **Single point of failure (SPOF)** — a component whose failure stops the whole system.
- **Bottleneck** — the component that limits throughput.
- **Back-of-the-envelope estimate** — a quick, rough calculation to size a design.

## The method

### Level 1 — Four steps

1. **Requirements**: clarify what to build and how well it must work. Write them down.
2. **Estimates**: traffic, data size, bandwidth — enough to know whether this is one server or a thousand.
3. **High-level design**: draw the main components and data flow for the core use cases.
4. **Deep dives**: zoom into the hardest parts — the data model, the hot path, scaling bottlenecks, failure handling — and discuss trade-offs.

Then review: where are the single points of failure? What breaks first at ten times the load? What does it cost? Design is iterative; each step can change earlier ones.

### Level 1 — Requirements first

Take "design a photo-sharing feature". Before drawing anything, ask:

- **Functional**: upload a photo; view a photo; see a feed of followed users' photos; like and comment? (Agree on the **core** two or three; list the rest as out of scope.)
- **Scale**: how many daily active users? How many uploads and views per user?
- **Latency**: the feed should load in under 200 ms at p95; uploads may take a few seconds.
- **Availability vs consistency**: is it acceptable if a new photo appears in followers' feeds a few seconds later? (Usually yes — **eventual consistency** is fine for feeds; it is not fine for payments.)
- **Durability**: photos must never be lost.
- **Other**: regions, privacy, moderation, cost limits.

Requirements change the design completely: a feed for 1,000 users is a SQL query; for 100 million users it is a precomputed structure ({{ch:designing-twitter}}).

### Level 2 — Back-of-the-envelope estimates

Estimates decide which designs are even possible. Use round numbers, show the working, and state assumptions:

```ts
// Back-of-the-envelope estimation for a photo-sharing feature. Round numbers on purpose.
const dailyActiveUsers = 10_000_000;
const uploadsPerUserPerDay = 0.2;           // one in five users uploads one photo a day
const viewsPerUserPerDay = 30;
const avgPhotoBytes = 2_000_000;            // 2 MB original
const thumbnailBytes = 50_000;              // a thumbnail per photo, used by most views
const secondsPerDay = 86_400;
const peakFactor = 3;                       // peak hour traffic compared with the daily average

const fmt = (n: number) => n >= 1e15 ? `${(n / 1e15).toFixed(1)} PB` : n >= 1e12 ? `${(n / 1e12).toFixed(1)} TB` : n >= 1e9 ? `${(n / 1e9).toFixed(1)} GB` : `${(n / 1e6).toFixed(1)} MB`;

const uploadsPerDay = dailyActiveUsers * uploadsPerUserPerDay;
const writeQps = uploadsPerDay / secondsPerDay;
const readQps = (dailyActiveUsers * viewsPerUserPerDay) / secondsPerDay;
console.log(`uploads: ${uploadsPerDay.toLocaleString("en-GB")}/day = ${writeQps.toFixed(0)}/s average, ${(writeQps * peakFactor).toFixed(0)}/s at peak`);
console.log(`views:   ${(readQps).toFixed(0)}/s average, ${(readQps * peakFactor).toFixed(0)}/s at peak  (read:write about ${(readQps / writeQps).toFixed(0)}:1)`);

const storagePerDay = uploadsPerDay * (avgPhotoBytes + thumbnailBytes);
console.log(`new storage: ${fmt(storagePerDay)}/day, ${fmt(storagePerDay * 365)}/year, ${fmt(storagePerDay * 365 * 5)} over 5 years (before replication)`);

const egressPerSecondPeak = readQps * peakFactor * thumbnailBytes;
console.log(`peak outbound bandwidth for thumbnails: ${((egressPerSecondPeak * 8) / 1e9).toFixed(1)} Gbit/s  -> a CDN, not the app servers`);

// How many app servers? Assume one instance handles 1,000 simple requests per second at the target CPU.
const perServer = 1_000;
const servers = Math.ceil((readQps * peakFactor + writeQps * peakFactor) / perServer);
const perZone = Math.ceil(servers / 2);    // 3 zones: any 2 must carry the whole peak if one zone fails
console.log(`app servers at peak: ${servers}; to survive losing 1 of 3 zones run ${perZone} per zone = ${perZone * 3}`);

// Latency budget for one page load: where the milliseconds go
const budget = [["DNS + TLS (cached)", 20], ["CDN thumbnails (parallel)", 40], ["API (cache hit)", 5], ["render", 30]] as const;
console.log("latency budget:", budget.map(([k, ms]) => `${k} ${ms}ms`).join(", "), `= ${budget.reduce((s, [, ms]) => s + ms, 0)}ms`);
```

**Output:**

```text
uploads: 2,000,000/day = 23/s average, 69/s at peak
views:   3472/s average, 10417/s at peak  (read:write about 150:1)
new storage: 4.1 TB/day, 1.5 PB/year, 7.5 PB over 5 years (before replication)
peak outbound bandwidth for thumbnails: 4.2 Gbit/s  -> a CDN, not the app servers
app servers at peak: 11; to survive losing 1 of 3 zones run 6 per zone = 18
latency budget: DNS + TLS (cached) 20ms, CDN thumbnails (parallel) 40ms, API (cache hit) 5ms, render 30ms = 95ms
```

What the numbers tell you:

- **Read-heavy (150:1)**: optimise reads — caching ({{ch:caching-at-scale}}), CDNs ({{ch:cloudfront}}), read replicas or precomputed feeds.
- **Petabytes of photos**: they cannot live in a relational database or on app server disks — **object storage** (S3) holds the files; the database holds only metadata ({{ch:s3}}).
- **Gigabits per second of images**: serve them from a **CDN**; app servers handle only API calls.
- **Tens of thousands of requests per second**: many stateless app servers behind load balancers, sized for losing a whole zone ({{ch:scalability}}).
- **A latency budget** splits the target between steps, showing where to focus.

Useful round numbers to remember: a day has about **86,400 seconds** (~10⁵); 1 million requests a day ≈ **12 per second**; reading from memory takes about 100 ns, from an SSD about 100 µs, a round trip within a data centre about 0.5 ms, across a continent tens of milliseconds and across the world ~150 ms or more.

### Level 2 — The high-level design

Most web systems are built from the same blocks:

```text
 clients ──► DNS ──► CDN (static files, images)
    │
    └──► load balancer ──► stateless API servers (auto scaled, several zones)
                              │         │            │
                         cache (Redis)  │       message queue ──► workers (thumbnails, emails, feeds)
                              │         │
                    primary database ◄──┘  + read replicas          object storage (photos)
                    (metadata)                                       │
                                                                     └──► CDN
```

For the photo feature: the client gets a **pre-signed URL** and uploads the photo directly to object storage; the API stores metadata in the database; an event in a queue triggers workers that create thumbnails and update followers' feeds; reads go through a cache and the CDN serves images. Each arrow is a decision with alternatives — the deep dives examine them.

## Core trade-offs

### Level 3 — Latency and throughput

- **Latency** is what one user feels; **throughput** is how much the system handles. They interact: as utilisation approaches 100%, queues build and latency rises sharply. Systems run with headroom (often 50–70% utilisation) for that reason.
- **Tail latency** matters: with many backend calls per page, the slowest one decides the page time. Watch p95 and p99 ({{ch:monitoring}}).
- Reduce latency with **caching**, **fewer round trips** (batching, denormalisation), **parallel calls**, **asynchronous work** (do slow parts later, through queues) and **proximity** (CDNs, regions near users).

### Level 3 — Availability, consistency and CAP

A system that keeps copies of data on several machines (for availability and scale) must decide what happens when those machines cannot talk to each other.

- The **CAP theorem**: during a **network partition**, a distributed system can be **consistent** (every read sees the latest write, so some requests must fail or wait) or **available** (every request gets an answer, which may be stale) — not both.
- **PACELC** adds the normal case: **else**, when there is no partition, the trade-off is **latency versus consistency** — synchronous replication to another region makes writes consistent but slow.
- Choose **per use case**: account balances, stock levels for the last item and payments need **strong consistency**; feeds, like counts, recommendations and search indexes can be **eventually consistent** ({{ch:distributed-systems}}).

### Level 3 — Availability arithmetic

- **Serial dependencies multiply**: an API that needs a database (99.95%), a cache (99.9%) and a payment service (99.9%) can be at most about 99.75% available — every dependency lowers the total.
- **Redundancy adds nines**: two independent copies of a 99% component are available 99.99% of the time ({{ch:aws-overview}}).
- Remove **single points of failure**: one database, one zone, one load balancer, one person who knows how to deploy.
- **Degrade gracefully**: if recommendations fail, show the page without them; if the cache fails, serve slower from the database rather than not at all.

### Level 4 — Cost, complexity and evolution

- Every extra component — a cache, a queue, a second region, microservices — adds **operational cost** and new failure modes. Prefer the **simplest design that meets the requirements** and know what you would change at ten times the scale.
- **Cost** is a requirement: estimate it for the main components (storage, compute, data transfer) ({{ch:cost-optimization}}).
- **Design for change**: clear boundaries between components, stable interfaces and data models that can be migrated ({{ch:software-architecture}}).
- **Write it down**: a design document with requirements, estimates, the design, alternatives considered and risks lets others review it ({{ch:engineering-decisions}}).

## From beginner to enterprise

**Level 1–2 — the method.** Clarifying requirements; estimating traffic and storage; drawing standard building blocks; knowing why each is there.

**Level 3 — trade-offs.** Latency versus throughput; consistency versus availability per use case; availability arithmetic; removing single points of failure; caching and asynchronous processing.

**Level 4 — real designs.** Data models and access patterns; failure handling and graceful degradation; cost estimates; design documents and reviews.

**Level 5 — senior practice.** Designing for growth and evolution; choosing boring technology; balancing team skills and operational load; leading design reviews.

**Level 6 — enterprises.** Multi-region architectures, organisation-wide platforms and standards, and architectural governance across many teams.

## Real-world use cases

### The design review that saved a launch

- **What happened**: a team planned to store uploaded videos in PostgreSQL as binary columns. A ten-minute estimate in the design review — thousands of videos a day, hundreds of megabytes each — showed the database would grow by terabytes per week.
- **Change**: videos in S3 with pre-signed uploads, metadata in PostgreSQL, a CDN for playback — before any code was written.

### The interview

- **Practice**: given "design a URL shortener", the candidate asked about scale and features, estimated a read-heavy workload, proposed an ID generation scheme, a key-value store, a cache and a CDN-backed redirect service, and discussed what happens when the cache fails. The interviewer cared more about the reasoning than the final diagram.

## Common mistakes

### Beginner: designing before clarifying requirements

**Consequence:** solving the wrong problem. **Fix:** ask, write down and agree requirements first.

### Beginner: no numbers

**Consequence:** designs that are absurdly over- or under-built. **Fix:** rough estimates with stated assumptions.

### Intermediate: one consistency model for everything

**Consequence:** slow systems or wrong data. **Fix:** decide consistency per use case.

### Intermediate: hidden single points of failure

**Fix:** walk every component and ask "what if this fails?".

### Intermediate: storing large files in databases

**Fix:** object storage for files, databases for metadata.

### Production: complexity before need

**Consequence:** microservices, multiple regions and Kafka for a product with 500 users. **Fix:** the simplest design that meets requirements, with a plan to grow.

### Interviews: jumping to technology names

**Consequence:** "we use Kafka and Cassandra" without reasons. **Fix:** explain the requirement each choice serves and its trade-offs.

## Debugging and troubleshooting

When a running system misbehaves, the same thinking applies:

- **Find the bottleneck**: which resource is saturated — CPU, memory, database connections, a lock, network? ({{ch:performance-engineering}})
- **Follow a request**: traces show which hop takes the time ({{ch:observability-and-incidents}}).
- **Check the assumptions**: has the read:write ratio changed? Did data grow beyond the cache? Did traffic shift to one hot key?
- **Look for partial failures**: slow dependencies and retries that multiply load are often worse than clean failures.

## Security summary

- **Security is a non-functional requirement** from the first step: who are the users, what data is sensitive, what are the threats? ({{ch:application-security}})
- **Defence in depth**: edge protection, authentication at the boundary, least-privilege service permissions, encryption in transit and at rest.
- **Minimise data**: store only what is needed, for as long as needed.
- **Design for abuse**: rate limits, quotas and protection against expensive requests ({{ch:rate-limiting}}).

## How a senior engineer thinks about this

- **Requirements drive everything.** The same problem at different scales has different answers.
- **Numbers before diagrams.** Estimates expose impossible designs early.
- **Every choice is a trade-off.** Name what you gain and what you give up.
- **Simple until proven otherwise.** Complexity must be earned by requirements.
- **Assume failure.** Every component, network and dependency will fail sometimes.

## Exercises

### Exercise 1 — Write the requirements

**Objective:** practise requirement gathering.
**What to do:** for "design a URL shortener", write the functional and non-functional requirements and three clarifying questions you would ask.

<details>
<summary>Show the solution</summary>

**Functional**: create a short link for a long URL; redirect from the short link to the long URL; optionally custom aliases, expiry dates and click statistics.

**Non-functional**: very read-heavy (redirects far outnumber creations); redirects fast (p95 under ~50 ms); highly available (a broken redirect breaks every place the link was shared); short links never collide; links durable for years; abuse protection (spam and malware URLs).

**Questions**: how many new links per day and redirects per day? Do links expire, and can users delete them? Are analytics needed in real time or is daily enough?

</details>

### Exercise 2 — Estimate

**Objective:** practise estimation.
**What to do:** 100 million new short links a month, each redirected on average 50 times, each record about 500 bytes. Estimate average and peak redirects per second, writes per second, and storage for five years.

<details>
<summary>Show the solution</summary>

- Writes: 100M ÷ (30 × 86,400 ≈ 2.6M s) ≈ **40/s**; peak (×3) ≈ 120/s.
- Redirects: 50 × 100M = 5 billion a month ≈ **1,900/s** average; peak ≈ 6,000/s.
- Storage: 100M × 12 × 5 = 6 billion records × 500 B ≈ **3 TB** over five years (plus indexes and replicas).

Conclusions: a read-heavy key-value workload; a cache in front of the store would serve most redirects; storage fits a partitioned database or a managed key-value store.

</details>

### Exercise 3 — Production scenario: the single point of failure

**Objective:** practise finding weaknesses.
**The design:** two API servers behind a load balancer in one availability zone, one PostgreSQL instance, one Redis node for sessions, a cron job on one of the API servers that sends invoices each night. List the single points of failure and fixes.

<details>
<summary>Show the solution</summary>

1. **One zone** — spread API servers across at least two zones.
2. **One PostgreSQL instance** — Multi-AZ with automatic failover; tested backups ({{ch:rds}}).
3. **One Redis node** — a replica with failover, or sessions that tolerate cache loss ({{ch:sessions}}).
4. **The cron job on one server** — if that server is replaced or down, invoices are not sent; and if both servers run it, invoices are sent twice. Move it to a scheduled task with a lock or a scheduler service, idempotent per invoice ({{ch:cron-jobs}}).
5. Also check: the load balancer (managed ones are redundant), DNS, deployment process and the one person who knows it.

</details>

## Summary

**System design** defines a system's components, data and communication so that it meets **functional requirements** and **non-functional** ones — scale, latency, availability, durability, consistency, security and cost. Use a repeatable method: **clarify requirements**, **estimate** traffic, storage and bandwidth with round numbers and stated assumptions, draw a **high-level design** from standard blocks (CDN, load balancer, stateless servers, cache, database with replicas, queue and workers, object storage), then **deep-dive** into the hardest parts and review for failures, bottlenecks and cost.

Estimates reveal the design's shape: read-heavy workloads want caches and CDNs, large files belong in object storage, high request rates need many stateless servers sized to survive a zone loss, and a latency budget shows where time goes. The core trade-offs are **latency versus throughput** (utilisation headroom, tail latency), **consistency versus availability** under partitions (**CAP**) and **latency versus consistency** otherwise (**PACELC**) — chosen per use case — and **availability arithmetic**: serial dependencies multiply, redundancy adds nines, single points of failure must go, and systems should degrade gracefully. Prefer the simplest design that meets the requirements, include cost, and write designs down for review.

## Key terms

- **System design** — Defining a system's architecture to meet functional and non-functional requirements.
- **Functional requirement** — What a system must do.
- **Non-functional requirement** — How well a system must perform its functions.
- **Latency** — The time taken by one operation.
- **Throughput** — The number of operations handled per unit of time.
- **QPS** — Queries per second.
- **Availability** — The proportion of time a system is working.
- **Durability** — The likelihood that stored data survives.
- **Consistency** — Whether reads reflect the most recent write.
- **Eventual consistency** — Copies converge to the same value over time.
- **Strong consistency** — Every read returns the most recent write.
- **Network partition** — A failure that prevents parts of a system from communicating.
- **CAP theorem** — Under a partition, a system must choose consistency or availability.
- **PACELC** — Under a partition choose availability or consistency; else choose latency or consistency.
- **Single point of failure** — A component whose failure stops the whole system.
- **Bottleneck** — The component that limits overall throughput.
- **Back-of-the-envelope estimate** — A quick rough calculation used to size a design.
- **Latency budget** — The division of a latency target among the steps of a request.
- **Graceful degradation** — Continuing with reduced functionality when parts fail.

## What comes next

The first pressure on any successful system is growth. The next chapter, {{ch:scalability}}, covers scaling up and out, stateless services, load balancing, partitioning work, finding bottlenecks and the patterns that let a system grow from one server to thousands.
