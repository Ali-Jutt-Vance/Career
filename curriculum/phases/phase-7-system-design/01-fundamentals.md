# Phase 7 — Chapter 1: System Design Fundamentals

---

## Chapter Overview

### Why System Design Exists as a Discipline

Writing code that works on your laptop is a different skill from designing a system that keeps working when 50 million people use it at once. A function that queries a database is trivial to write; making that same query survive 100,000 requests per second, across three continents, without losing data when a server catches fire, is an entirely different problem. System design is the discipline of making those decisions *before* you write code — because the wrong data model or the wrong consistency guarantee, chosen on day one, can be nearly impossible to change once a system has real traffic and real data in it.

This is also why system design dominates senior and staff-level interviews: writing a working function proves you can code, but designing a system that scales, stays available during failures, and makes sound trade-offs proves you can be trusted with decisions that are expensive to reverse.

### Problems It Solves

**1. Prevents architecture decisions made by accident.** Without deliberate design, systems accrete a data model and a set of services based on whatever was easiest to build first — not what the actual traffic pattern requires.

**2. Surfaces trade-offs before they become incidents.** Deciding "should this be strongly consistent or eventually consistent?" on a whiteboard costs nothing. Discovering the answer during a production outage, at 3 AM, costs a lot.

**3. Gives a shared vocabulary for scale.** Terms like QPS, p99 latency, and availability "nines" let engineers compare designs precisely instead of arguing about vague words like "fast" or "reliable."

**4. Enables capacity planning.** Back-of-envelope estimation tells you, before you provision anything, roughly how many servers, how much storage, and how much bandwidth a system will need — so you don't discover you're under-provisioned only after launch.

### Real-World Examples

| System | Design Decision That Mattered |
|---|---|
| **Twitter's timeline** | Chose to precompute (fan-out-on-write) feeds for most users but fan-out-on-read for celebrity accounts with millions of followers — a hybrid approach driven directly by back-of-envelope math on write amplification |
| **Amazon DynamoDB's origin (Dynamo paper)** | Chose availability over strict consistency (AP over CP) because for a shopping cart, showing a slightly stale cart is better than showing an error page during a network partition |
| **Netflix** | Designed for regional failure from day one — an entire AWS region can go down and Netflix reroutes traffic, a decision baked into their system design, not bolted on afterward |

### Industry Adoption
Every FAANG-tier company and most well-funded startups run formal system design interviews for senior+ roles, and internally require an **RFC** or **design doc** before any significant new service is built — a lightweight, written version of the same process.

---

## Beginner Theory

### Core Concepts

**Functional requirements** describe *what* the system does — the features a user directly experiences. **Non-functional requirements** describe *how well* it does it — the qualities that aren't a single feature but shape every part of the architecture (how fast, how available, how much scale). Beginners often only think about functional requirements; senior engineers spend most of their design time on the non-functional ones, because those are what actually determine the architecture.

**Back-of-envelope estimation** is the practice of using rough, round numbers to size a system before building it — how many requests per second, how much data per day, how much bandwidth. It doesn't need to be precise; it needs to be *directionally correct* so you can decide "does this fit on one Postgres instance, or do I need a distributed database?"

### Terminology

| Term | Definition |
|---|---|
| **QPS** | Queries Per Second — the core unit of "how much traffic" |
| **Latency** | Time from request sent to response received, usually measured at p50 (median), p95, and p99 (99th percentile) |
| **Throughput** | Total amount of work done per unit time (requests/sec or MB/sec) |
| **Availability** | The percentage of time a system is operational and responding correctly |
| **Durability** | The probability that stored data is *not* lost, ever, even if the system is temporarily unavailable |
| **SLA** | Service Level Agreement — an external, often contractual, promise to a customer |
| **SLO** | Service Level Objective — an internal target a team holds itself to (usually stricter than the SLA) |
| **SLI** | Service Level Indicator — the actual measured number (e.g., today's real p99 latency) |
| **Error budget** | The allowed amount of unreliability implied by an SLO — a 99.9% SLO leaves an 0.1% "budget" to spend on deploys, experiments, and acceptable risk |

### Mental Model: The SLA/SLO/SLI Triangle

Think of these three as a promise, a target, and a measurement. The **SLA** is the promise you make to the outside world ("99.9% uptime, or we refund you"). The **SLO** is the internal bar your team sets to make sure you *never* miss that promise (say, 99.95%, giving you margin for error). The **SLI** is what a dashboard shows you *right now*. If the SLI ever approaches the SLO, that's your warning to slow down risky changes — long before you'd ever breach the customer-facing SLA.

```
   SLA (external promise): 99.9% uptime
        ▲ margin of safety
   SLO (internal target):  99.95% uptime
        ▲ constantly measured
   SLI (actual, live):     99.97% this week ✓ healthy
```

---

## Basic Examples

### Example 1: Gathering Requirements for a Concrete System

Given a prompt like "design a system like Twitter," the first move is separating functional from non-functional requirements — never skip straight to architecture.

```
FUNCTIONAL REQUIREMENTS (what the system does):
  - A user can post a tweet (≤ 280 characters, optional image/video)
  - A user can follow other users
  - A user sees a feed of tweets from the people they follow
  - A user can like and reply to tweets

NON-FUNCTIONAL REQUIREMENTS (how well it does it) — always ask these explicitly:
  - Scale: "How many users? Is this read-heavy or write-heavy?"
    → e.g. 300 million monthly active users, reads vastly outnumber writes
  - Latency: "What's the target feed-load time?"
    → e.g. p99 under 200ms
  - Consistency: "If I post a tweet, must my followers see it instantly, or is a
    few seconds of delay acceptable?"
    → e.g. eventual consistency is fine for a feed; NOT fine for a bank balance
  - Availability: "What uptime target?"
    → e.g. 99.99%
  - Durability: "Can we ever lose a posted tweet?"
    → e.g. no — once accepted, a tweet must never be lost

Notice: none of these answers are "given" — in a real interview or a real
project kickoff, you ask for every one of them rather than assuming.
```

### Example 2: Back-of-Envelope Traffic Estimation

Taking the requirements above and turning them into concrete numbers you can design around.

```
Given: 300 million MAU, 50% log in daily → 150 million DAU
Given: each active user posts ~2 tweets/day and reads ~20 tweets/day

Step 1 — convert "per day" into "per second" using the rounding trick:
  1 day = 86,400 seconds ≈ 100,000 seconds (close enough for estimation)

Step 2 — Write QPS:
  150,000,000 users × 2 tweets/day ÷ 100,000 sec/day = 3,000 writes/sec

Step 3 — Read QPS:
  150,000,000 users × 20 reads/day ÷ 100,000 sec/day = 30,000 reads/sec

Step 4 — Read:Write ratio:
  30,000 : 3,000  =  10 : 1
  → This system is heavily READ-heavy. That single number tells you to invest
    in caching and read replicas long before you worry about write scaling.
```

### Example 3: Back-of-Envelope Storage Estimation

Continuing the same system, now sizing the database rather than the traffic.

```
Given: a tweet is ~280 characters. At 2 bytes/char (Unicode) that's 560 bytes;
       round up to ~1 KB once you include metadata (user ID, timestamp, likes count).

Storage per day:
  3,000 writes/sec × 86,400 sec/day × 1 KB = 259,200,000 KB ≈ 260 GB/day

Storage per year:
  260 GB/day × 365 days ≈ 95 TB/year

Now the media (10% of tweets include a ~1 MB image):
  3,000 writes/sec × 10% × 1 MB = 300 MB/sec of image data being written
  → This is far too much to store as rows in a relational database.
    Conclusion: tweet TEXT goes in a database; tweet MEDIA goes in blob
    storage (S3) with only a URL reference stored in the database row.
```

### Example 4: Applying Latency Numbers to a Design Decision

Knowing rough latency numbers lets you predict, before building anything, where a design will feel slow.

```
Latency numbers every engineer should know (approximate, illustrative):
  L1 cache reference:                0.5 ns
  Main memory (RAM) reference:       100 ns
  SSD random read:                   100 microseconds (μs)
  Redis GET (same data center):      ~0.5 ms
  PostgreSQL indexed query:          ~10 ms
  Network round trip, same DC:       ~0.5 ms
  Network round trip, cross-country: ~150 ms
  S3 GET request:                    ~100 ms
  CloudFront (CDN) cached GET:       ~5 ms

Design implication:
  If your target p99 latency is 200ms, and a single request requires:
    1 cross-country round trip (150ms) + 1 uncached PostgreSQL query (10ms)
    + 1 S3 GET for a profile image (100ms)
  ...that's already 260ms — OVER budget before your own code runs at all.
  Fix: serve the profile image from CloudFront (5ms) instead of directly from
  S3 (100ms), and you're back under budget. This is why "add a CDN" is such a
  common system design answer — the latency numbers justify it directly.
```

### Example 5: Walking Through the Interview Framework on a Real Prompt

Applying the 5-step framework to "design a URL shortener" end to end, briefly:

```
STEP 1 — Clarify (2-3 min):
  "How many URLs shortened per day? Do short codes need to be unpredictable
   (security) or is sequential fine? Do we need click analytics? Custom
   aliases?" → Assume: 100M new URLs/day, need basic click analytics.

STEP 2 — Estimate (2 min):
  Write QPS: 100,000,000 / 100,000 sec ≈ 1,000 writes/sec
  Read QPS (redirects are read-heavy, ~100:1): ≈ 100,000 reads/sec
  Storage per URL: ~500 bytes (long URL + short code + metadata)
  Storage/year: 1,000 × 86,400 × 365 × 500 bytes ≈ 15 TB/year

STEP 3 — High-level design:
  Client → Load Balancer → API servers → Redis cache → PostgreSQL
  (cache absorbs the 100,000 reads/sec so the database only sees cache misses)

STEP 4 — Deep dive (pick ONE component, e.g. short-code generation):
  Base62 encode an auto-incrementing ID (not random) — guarantees uniqueness
  without a collision-check round trip to the database.

STEP 5 — Bottlenecks:
  "At 100,000 reads/sec, a single Redis instance may become the bottleneck —
   I'd shard by short-code hash across multiple Redis nodes, and put a CDN
   in front of the redirect endpoint since redirects are cacheable."
```

---

## Design Vocabulary Reference

```
Throughput:   Requests or data processed per unit time (QPS, MB/s)
Latency:      Time from request to response (p50/p95/p99)
Availability: % time the system is operational
              99.9%   = 8.7 hours downtime/year
              99.99%  = 52 minutes downtime/year
              99.999% = 5 minutes downtime/year
Durability:   Probability of NOT losing stored data (S3: "11 nines")
Reliability:  Probability of functioning correctly on demand
Scalability:  Ability to handle growth (vertical vs. horizontal)
Consistency:  All readers see the same data at the same time
Partition:    A subset of data distributed across nodes

SLA: Service Level Agreement — contract with customer (external, business)
SLO: Service Level Objective — internal target (99.95% latency < 200ms)
SLI: Service Level Indicator — the actual measured metric (today's real p99)
Error budget: 1 - SLO availability (99.9% SLO → 8.7h/year error budget)
```

---

## Intermediate Concepts

### The Full System Design Interview Framework

```
Step 1: Clarify Requirements (5 min)
  Ask about: scale, read/write ratio, latency, global vs. regional, features in scope.
  Never assume — every unstated assumption is a hidden risk in your design.

Step 2: Estimate Scale (3 min)
  QPS (read + write), storage, bandwidth. Show your math out loud —
  interviewers are evaluating the process, not just the final number.

Step 3: High-Level Design (10 min)
  Draw: clients → CDN → API gateway → services → databases.
  State the major decisions explicitly: SQL vs NoSQL, sync vs async, cache layer.

Step 4: Deep Dive (15 min)
  Pick 2-3 critical components to detail: database schema, API design,
  caching strategy, queue processing. Let the interviewer's questions guide
  which parts they want more depth on.

Step 5: Address Bottlenecks and Trade-offs (5 min)
  "The bottleneck is the database at 100k QPS — I'd add a read replica..."
  Discuss single points of failure, the scaling plan, and the trade-offs of
  your choices — there is rarely one "right" answer, but there are decisions
  you can't justify.
```

### Common Mistakes

- **Jumping straight to architecture** before clarifying requirements — you end up designing for an assumed scale that may be off by 100x.
- **Estimating too precisely.** Back-of-envelope math should use round numbers (100,000 seconds/day, not 86,400) — precision here is a waste of interview time and adds no value.
- **Ignoring the read:write ratio.** Most real-world systems are heavily read-skewed; designing as if reads and writes are equal usually leads to over-engineering the write path and under-engineering caching.

---

## Advanced Concepts

### Error Budgets Driving Engineering Decisions

An SLO of 99.9% availability implies an error budget of about 8.7 hours of downtime per year. Google's SRE practice formalizes this: as long as a team is within its error budget, they're free to ship risky changes and deploy frequently. Once the error budget is exhausted, all further releases are frozen until reliability recovers. This turns an abstract reliability target into a concrete, actionable policy that resolves the tension between "ship fast" and "stay reliable" without endless debate.

### Estimation as a Living Document

In production systems, back-of-envelope estimates aren't a one-time interview exercise — they're revisited whenever traffic patterns shift meaningfully (a viral feature launch, a new market). Teams that skip this step are the ones who discover their database is out of capacity during a traffic spike instead of before it.

---

## Interview Preparation

**Q1: What is the difference between vertical and horizontal scaling?**

A: Vertical scaling (scale-up) means adding more resources to a single machine — a bigger CPU, more RAM, a faster disk. It requires no code changes and avoids distributed-systems complexity, but has a hard ceiling (there's a maximum machine size), typically requires downtime to resize, and leaves you with a single point of failure. Horizontal scaling (scale-out) means adding more machines and distributing load across them, which enables near-unlimited scale but requires a load balancer, a stateless application design (sessions stored in Redis, not in server memory), and a data layer that can be distributed. Most modern large-scale systems scale horizontally because vertical scaling eventually hits a ceiling that no amount of budget can raise.

**Q2: What is the CAP theorem, and how does it actually affect design decisions?**

A: In a distributed system, during a network partition you can only guarantee two of three properties: Consistency (every node sees the same data at the same instant), Availability (every request gets a response), and Partition Tolerance (the system keeps working despite network failures). Because network partitions are unavoidable in any real distributed system, partition tolerance isn't really optional — the real choice is between C and A *during* a partition. CP systems (e.g., HBase, Zookeeper, etcd) return an error rather than stale data when partitioned — right for systems like leader election or financial ledgers, where wrong data is worse than no data. AP systems (e.g., DynamoDB, Cassandra) keep responding with possibly stale data — right for systems like a shopping cart or a social feed, where a few-second-old view is far better than an error page.

**Q3: What are the five steps of a system design interview, and why does the order matter?**

A: 1) Clarify requirements — functional and non-functional — because designing before you know the scale means designing for the wrong scale. 2) Estimate scale with back-of-envelope math, so every later decision (single database vs. sharded, cache or not) is justified by a number rather than a guess. 3) Draw the high-level design — boxes and arrows for clients, CDN, load balancer, services, cache, database, queues — establishing the shared picture before diving into any one part. 4) Deep-dive into 2-3 components, usually guided by what the interviewer probes on, showing you can go from "I know the pattern" to "I can implement the pattern." 5) Discuss bottlenecks and trade-offs, because every design has weaknesses, and an engineer who can name theirs unprompted is more trustworthy than one who claims a perfect design.

**Q4: How do you decide between eventual consistency and strong consistency for a given feature?**

A: Ask what happens if a user sees stale data for a few seconds. For a social media feed, like count, or view count, a stale value causes no harm — eventual consistency (AP) is the right, higher-availability choice. For a bank balance, an inventory count during checkout, or a seat reservation, a stale value can cause real damage (double-spending, overselling) — strong consistency (CP) is required even at the cost of availability during a partition. The rule of thumb: consistency requirements come from the *business impact* of being wrong, not from a general preference for "correctness."

---

## Practical Tasks

### Beginner (10 Tasks)
1. Estimate QPS for a Twitter-like app (100M DAU, 10 tweets/day).
2. Estimate storage for 1B users, 1 KB profile each.
3. Calculate 99.9% availability downtime per year.
4. Draw a high-level diagram for a URL shortener.
5. List functional and non-functional requirements for Instagram.
6. Identify the read:write ratio for a news feed.
7. Estimate bandwidth for 10,000 concurrent video streams at 5 Mbps.
8. Draw the high-level architecture for a key-value store.
9. Calculate storage for 1M images at 1 MB each.
10. Practice explaining a design out loud in 5 minutes, timing yourself.

### Intermediate (10 Tasks)
1. Design a URL shortener (tinyurl.com) — complete design using all 5 framework steps.
2. Design a rate limiter service.
3. Design a notification system (email, SMS, push).
4. Design a distributed cache.
5. Design a job scheduling system.
6. Design a simple API gateway.
7. Design a content delivery system.
8. Design a distributed logging system.
9. Design a pub-sub messaging system.
10. Design a leaderboard for a gaming platform.

### Advanced (10 Tasks)
1. Design Twitter/X (feed, follow, tweet).
2. Design YouTube (upload, transcode, stream).
3. Design Uber (real-time location, matching).
4. Design WhatsApp (real-time messaging, presence).
5. Design a distributed file system (Dropbox).
6. Design a hotel booking system (Booking.com).
7. Design a stock exchange (order matching engine).
8. Design a recommendation system.
9. Design a distributed search engine.
10. Do a mock interview: 45 minutes, with a peer giving feedback against the 5-step framework.

---

## Cheat Sheet

```
Estimation cheat sheet:
  1 day ≈ 100,000 seconds
  1 char = 1 byte (ASCII), 2 bytes (Unicode)
  Average user session = 10 min = 600 sec
  Typical web page = 1 MB
  Image (compressed) = 300 KB
  Video (1 min, 480p) = 50 MB
  Redis: 100,000+ GET/sec
  PostgreSQL: ~1,000-10,000 QPS
  MySQL: similar
  Cassandra: ~1M reads/sec per node

Design decisions cheat sheet:
  Need SQL ACID + joins?                 → PostgreSQL
  Need scale to billions at low latency?  → DynamoDB, Cassandra
  Need full-text search?                 → Elasticsearch/OpenSearch
  Need time series?                      → TimescaleDB, Timestream
  Need leaderboard/sorted sets?          → Redis Sorted Sets (ZSET)
  Need pub/sub?                          → Redis Pub/Sub, Kafka, SNS
  Need job queues?                       → SQS, Redis BullMQ, RabbitMQ
  Need file storage?                     → S3
  Need CDN?                              → CloudFront
  Need analytics/OLAP?                   → Redshift, BigQuery, ClickHouse

5-Step Interview Framework:
  1. Clarify requirements (functional + non-functional)
  2. Estimate scale (QPS, storage, bandwidth)
  3. High-level design (boxes and arrows)
  4. Deep dive (2-3 components)
  5. Bottlenecks and trade-offs
```
