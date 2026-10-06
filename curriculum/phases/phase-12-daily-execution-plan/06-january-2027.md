# Phase 12 — Chapter 6: January 2027

> **31 days · Day 103 to Day 133 · 134 scheduled hours**

## Chapter Overview

This chapter covers weeks 15, 16, 17, 18, 19 of the 27-week plan. Every day below is a contract with yourself. Tick the tasks in the reader's **Plan** tab as you finish them — the app tracks your streak and completion rate across all 188 days.

| Week | Dates | Hours | Apps | DSA | Focus | Milestone |
|---|---|---|---|---|---|---|
| **W15** | 01 Jan – 03 Jan | 30h | 16 | Heaps — streaming median → Recursion — the base-case habit | Authentication and Authorisation in Nest + Testing — Unit, Integration, End to End | You can explain why a JWT in localStorage is a risk, what refresh-token rotation solves, and how you log a user out of a stateless system. Nobody at this level should be guessing here. · AND: The suite runs green from empty, covers every endpoint at least once including failure paths, and you can explain what you deliberately chose not to test. |
| **W16** | 04 Jan – 10 Jan | 30h | 16 | Backtracking — subsets → Backtracking — permutations | GraphQL and WebSockets in Nest + The Work That Happens Later — Uploads, Email, Cron, Microservices | You can explain the N+1 problem in GraphQL specifically and how DataLoader batches it, and you can say when WebSockets are the wrong choice. · AND: BLOCK IV CLOSES. You can explain why a cron job on three instances runs three times and the three ways to stop it — which is a question that catches most candidates. |
| **W17** | 11 Jan – 17 Jan | 30h | 16 | Graphs — build the adjacency list → Graphs — BFS shortest path | Redis and Caching Strategies + Queues, Workers and Message Brokers | You can name four caching strategies and say which one you used and why, and you can describe a cache stampede and how you would prevent it. · AND: You can explain at-least-once versus at-most-once delivery, why idempotent consumers are mandatory, and what a dead-letter queue is for. |
| **W18** | 18 Jan – 24 Jan | 30h | 16 | Graphs — DFS & connected components → Graphs — topological sort | Rate Limiting, API Gateways and Resilience + Ship Project 2 | You can explain the difference between a fixed window, a sliding window and a token bucket, and why an in-memory rate limiter is wrong the moment you run two instances. · AND: ANCHOR — Project 2 live by Sunday 24 January. A NestJS service with a real data layer, auth, queues, caching, real-time and tests, running at a public URL. |
| **W19** | 25 Jan – 31 Jan | 30h | 24 | Graphs — cycle detection → Union-find | Linux and the Shell + Docker and Docker Compose | You can diagnose a Linux box over SSH with no GUI: what is listening, what is eating memory, what filled the disk, what the logs say. · AND: A stranger can clone Project 2 and run the whole stack with one command, and you can explain the difference between an image and a container without hedging. |

---

## Week 15 — Authentication and Authorisation in Nest + Testing — Unit, Integration, End to End

*Block IV — NestJS · 30 hours*

Auth is the most commonly implemented and most commonly implemented-badly part of a backend, and a favourite interview subject because the wrong answers are so recognisable. Build it properly once, in Nest, and understand every trade-off you chose.

You have never written a test. At tier 2 that is disqualifying, and it is the easiest gap in this book to close: one week of real tests on a project you already understand changes how your repository reads to a reviewer.

**Chapters this week:**

- [Authentication](#phase-2-backend-engineering--authentication)
- [Jwt](#phase-2-backend-engineering--jwt)
- [Session Management](#phase-2-backend-engineering--session-management)
- [Oauth](#phase-2-backend-engineering--oauth)
- [Testing](#phase-9-software-engineering--testing)
- [Code Reviews Documentation](#phase-9-software-engineering--code-reviews-documentation)
- [Talking About Code Out Loud](#phase-10-english-communication--talking-about-code-out-loud)

**Deliverable:** Project 2 with registration, login, refresh, logout, role-based authorisation on at least two routes, and a written justification of the session-versus-token decision. · ALSO: A real test suite on Project 2 — unit tests on business logic, integration tests on the repository layer against a throwaway database, e2e tests on every endpoint — running green from a clean checkout.

**Milestone:** You can explain why a JWT in localStorage is a risk, what refresh-token rotation solves, and how you log a user out of a stateless system. Nobody at this level should be guessing here. · AND: The suite runs green from empty, covers every endpoint at least once including failure paths, and you can explain what you deliberately chose not to test.

**Applications this week:** 16

**DSA drill:** Heaps — streaming median → Recursion — the base-case habit — 6 problems

### Day 103 — Friday 1 January 2027

**The N+1 problem, in GraphQL · Errors, auth and limits in GraphQL**

| Time | Track | Task |
|---|---|---|
| `After Fajr + Quran` | **Engineering** | Phase 2 Chapter 5 — nested resolvers and why they produce N+1 by construction. Reproduce it, watch the query log, then fix it with DataLoader and watch the log again. Two log outputs, before and after, are your interview answer. |
| `10:00–11:00 + 16:00–16:30` | **Engineering** | Phase 2 Chapter 5 — error handling, guards on resolvers, and query depth and complexity limits. An unbounded GraphQL endpoint is a denial-of-service waiting; add the limits and understand what they compute. |
| `16:30–17:00` | **Job Hunt** | Applications: one tailored application or one follow-up. Log it in TRACKER.md. |
| `21:30–22:00` | **Communication** | English speaking session with Claude: explain today's engineering work out loud as if to an interviewer, then answer two follow-up questions. Fix every grammar point it raises. |

*Total: 4h 0m*

### Day 104 — Saturday 2 January 2027

**Finish and attack it**

| Time | Track | Task |
|---|---|---|
| `10:00–12:00` | **Engineering** | Deep build, two hours: finish the auth flow end to end, then attack it yourself — expired token, tampered signature, missing role, reused refresh token, login brute force. Fix everything that gets through. |
| `12:30–13:30` | **Engineering** | Drill: five auth questions, spoken, timed. Include "why not localStorage" and "how do you revoke a token". |
| `14:00–15:00` | **Review** | Weekly review. Read next week ahead — testing, and the chapter the old book did not have. |
| `15:30–16:00` | **Job Hunt** | Two applications, tailored, logged. |
| `16:00–16:30` | **Job Hunt** | Three applications, tailored, logged. |

*Total: 5h 0m*

### Day 105 — Sunday 3 January 2027

**Cover every endpoint**

| Time | Track | Task |
|---|---|---|
| `10:00–12:00` | **Engineering** | Deep build, two hours: every endpoint covered including one failure path each. Then run the whole suite from a clean checkout and fix whatever only worked on your machine. |
| `12:30–13:30` | **Engineering** | Drill: three LeetCode problems, timed, then write tests for one afterwards — some companies interview exactly this way. |
| `14:00–15:00` | **Review** | Weekly review. Read next week ahead. |
| `15:30–16:00` | **Job Hunt** | Three applications, tailored, logged. |
| `16:00–16:30` | **Job Hunt** | Two applications, tailored, logged. |

*Total: 5h 0m*

## Week 16 — GraphQL and WebSockets in Nest + The Work That Happens Later — Uploads, Email, Cron, Microservices

*Block IV — NestJS · 30 hours*

Two protocols beyond REST that appear constantly in job descriptions at this tier. Neither is hard once you have REST properly; both are asked about, and having shipped each once is the difference between an opinion and an answer.

The last Nest week. Everything a real service does besides answer requests: accept files, send email, run scheduled work, and talk to other services. Plus Nest's microservice transports, so you can speak about distributed systems from having touched one.

**Chapters this week:**

- [Graphql](#phase-2-backend-engineering--graphql)
- [Websockets](#phase-2-backend-engineering--websockets)
- [File Upload](#phase-2-backend-engineering--file-upload)
- [Email Services](#phase-2-backend-engineering--email-services)
- [Cron Jobs](#phase-2-backend-engineering--cron-jobs)
- [Microservices](#phase-7-system-design--microservices)
- [Design Patterns](#phase-1-programming-foundations--design-patterns)

**Deliverable:** A GraphQL layer over part of the Project 2 domain with a solved N+1 via DataLoader, and a WebSocket gateway pushing live updates to connected clients. · ALSO: Project 2 with pre-signed direct file upload, transactional email, two scheduled jobs that are safe to run on multiple instances, and one module extracted into a separate microservice.

**Milestone:** You can explain the N+1 problem in GraphQL specifically and how DataLoader batches it, and you can say when WebSockets are the wrong choice. · AND: BLOCK IV CLOSES. You can explain why a cron job on three instances runs three times and the three ways to stop it — which is a question that catches most candidates.

**Applications this week:** 16

**DSA drill:** Backtracking — subsets → Backtracking — permutations — 7 problems

### Day 106 — Monday 4 January 2027

**WebSockets and gateways · Scaling real-time, honestly**

| Time | Track | Task |
|---|---|---|
| `After Fajr + Quran` | **Engineering** | Phase 2 Chapter 17 (WebSockets) — the upgrade handshake, and why it is not HTTP after that. Build a Nest gateway that pushes an update when a record changes. Authenticate the connection — most tutorials do not. |
| `10:00–11:00 + 16:00–16:30` | **Engineering** | Phase 2 Chapter 17 — what breaks with two server instances: a client connected to instance A never sees an event emitted on instance B. Understand the Redis adapter that fixes it. You will wire it up next week when Redis arrives. |
| `16:30–17:00` | **Job Hunt** | Three applications, tailored, logged. |
| `21:30–22:00` | **Communication** | Write a ninety-second answer to "what is your approach to testing?" Having a policy, and saying where you stop, beats claiming full coverage. |

*Total: 4h 0m*

### Day 107 — Tuesday 5 January 2027

**File upload, without proxying the bytes · Email that is not a side effect**

| Time | Track | Task |
|---|---|---|
| `After Fajr + Quran` | **Engineering** | Phase 2 Chapter 13 (File Upload) — multipart, size limits, type validation that checks content rather than the filename, and pre-signed URLs so the file never passes through your API. Implement the pre-signed path. |
| `10:00–11:00 + 16:00–16:30` | **Engineering** | Phase 2 Chapter 14 (Email Services) — transactional email, templates, and why sending inside a request handler is wrong. Send it from a queue instead — and if the queue is not there yet, write the interface and fake it until next week. |
| `16:30–17:00` | **Job Hunt** | Three applications, tailored, logged. |
| `21:30–22:00` | **Communication** | Rehearse: "how would you test this endpoint?" — pick one of your own and answer in three layers. |

*Total: 4h 0m*

### Day 108 — Wednesday 6 January 2027

**Scheduled work · Idempotency, because jobs retry**

| Time | Track | Task |
|---|---|---|
| `After Fajr + Quran` | **Engineering** | Phase 2 Chapter 15 (Cron Jobs) — the scheduler, cron expressions, and the multi-instance problem: three instances run the job three times. Learn the three fixes — a leader lock, a distributed lock, or a dedicated worker — and implement one. |
| `10:00–11:00 + 16:00–16:30` | **Engineering** | Make both scheduled jobs idempotent — running twice must not double anything. Then deliberately run one twice and prove it. This is the discipline that makes queues safe next week. |
| `16:30–17:00` | **Communication** | Rehearse: "when would you use WebSockets over polling, and when would you not?" |
| `21:30–22:00` | **Communication** | Write a two-minute answer to "REST or GraphQL?" that names a concrete situation for each. |

*Total: 4h 0m*

### Day 109 — Thursday 7 January 2027

**Microservices, honestly · Redis as a data structure server**

| Time | Track | Task |
|---|---|---|
| `After Fajr + Quran` | **Engineering** | Phase 7 Chapter 9 (Microservices) and Nest's transports. Extract one module into a separate service talking over TCP or Redis. Then write down what you lost: transactions across the boundary, one deploy, easy debugging. That honest list is the interview answer, not enthusiasm. Read Phase 1 Chapter 8 (Design Patterns) alongside it and name the patterns already in your own code. |
| `10:00–11:00 + 16:00–16:30` | **Engineering** | Phase 2 Chapter 18 (Redis) — strings, hashes, lists, sets, sorted sets, TTL. Not "a cache" — a data structure server. Build a leaderboard with a sorted set and a rate counter with a hash, both from the CLI first. |
| `16:30–17:00` | **Job Hunt** | Applications: one tailored application or one follow-up. Log it in TRACKER.md. |
| `21:30–22:00` | **Communication** | English speaking session with Claude: explain today's engineering work out loud as if to an interviewer, then answer two follow-up questions. Fix every grammar point it raises. |

*Total: 4h 0m*

### Day 110 — Friday 8 January 2027

**Measure before caching · The four strategies**

| Time | Track | Task |
|---|---|---|
| `After Fajr + Quran` | **Engineering** | Phase 2 Chapter 19 (Caching) — measure first. Find the most expensive read path in Project 2 with real timings. Write the number down before you cache anything, because the number is what makes this an engineering decision. |
| `10:00–11:00 + 16:00–16:30` | **Engineering** | Phase 7 Chapter 3 (Caching) — cache-aside, read-through, write-through, write-behind. Implement cache-aside on your expensive path, measure again, and write both numbers in the README. |
| `16:30–17:00` | **Job Hunt** | Applications: one tailored application or one follow-up. Log it in TRACKER.md. |
| `21:30–22:00` | **Communication** | English speaking session with Claude: explain today's engineering work out loud as if to an interviewer, then answer two follow-up questions. Fix every grammar point it raises. |

*Total: 4h 0m*

### Day 111 — Saturday 9 January 2027

**Ship both**

| Time | Track | Task |
|---|---|---|
| `10:00–12:00` | **Engineering** | Deep build, two hours: GraphQL layer working with DataLoader and limits, WebSocket gateway authenticated and pushing live updates. Then document both in the README with the N+1 before-and-after. |
| `12:30–13:30` | **Engineering** | Drill: five questions on GraphQL and real-time, spoken, timed. |
| `14:00–15:00` | **Review** | Weekly review. Read next week ahead. |
| `15:30–16:00` | **Job Hunt** | Two applications, tailored, logged. |
| `16:00–16:30` | **Job Hunt** | Three applications, tailored, logged. |

*Total: 5h 0m*

### Day 112 — Sunday 10 January 2027

**BLOCK IV REVIEW**

| Time | Track | Task |
|---|---|---|
| `10:00–12:00` | **Engineering** | Deep build, two hours: finish uploads, email, scheduling and the extracted service. Then write the architecture section of the Project 2 README with a diagram. |
| `12:30–13:30` | **Engineering** | Block drill: ten Nest questions, spoken, timed — pipeline order, DI, scopes, transactions, testing, cron on multiple instances. |
| `14:00–15:00` | **Review** | BLOCK IV REVIEW. Honestly: if someone said "you are a Nest developer", could I defend it for forty minutes? Read Block V ahead. |
| `15:30–16:00` | **Job Hunt** | Three applications, tailored, logged. |
| `16:00–16:30` | **Job Hunt** | Two applications, tailored, logged. |

*Total: 5h 0m*

## Week 17 — Redis and Caching Strategies + Queues, Workers and Message Brokers

*Block V — Caching and Queues · 30 hours*

Caching is easy to add and hard to invalidate, and "cache invalidation" jokes are told by people who have never had to do it. This week is Redis as a real data structure server, and caching as a decision with a written invalidation strategy.

The moment a request does work the user should not wait for, you need a queue — and the moment you have a queue you need to think about retries, failures and ordering. This is the backbone of every serious backend and it is where system design interviews go.

**Chapters this week:**

- [Redis](#phase-2-backend-engineering--redis)
- [Caching](#phase-2-backend-engineering--caching)
- [Caching](#phase-7-system-design--caching)
- [Queues](#phase-2-backend-engineering--queues)
- [Message Brokers](#phase-7-system-design--message-brokers)
- [Event Driven Systems](#phase-7-system-design--event-driven-systems)

**Deliverable:** Project 2 with a measured cache on its most expensive read path, a written invalidation strategy, and Redis-backed sessions and WebSocket fan-out. · ALSO: Project 2 with a real job queue and a separate worker process, retries with backoff, a dead-letter queue, and one event-driven flow where a write publishes an event that two handlers consume.

**Milestone:** You can name four caching strategies and say which one you used and why, and you can describe a cache stampede and how you would prevent it. · AND: You can explain at-least-once versus at-most-once delivery, why idempotent consumers are mandatory, and what a dead-letter queue is for.

**Applications this week:** 16

**DSA drill:** Graphs — build the adjacency list → Graphs — BFS shortest path — 7 problems

### Day 113 — Monday 11 January 2027

**Invalidation, the actual hard part · Stampedes and the failure modes**

| Time | Track | Task |
|---|---|---|
| `After Fajr + Quran` | **Engineering** | Phase 2 Chapter 19 — invalidation. TTL, explicit invalidation on write, and key versioning. Write your strategy down in the README, then deliberately update a record and prove the cache does not serve stale data. |
| `10:00–11:00 + 16:00–16:30` | **Engineering** | Phase 7 Chapter 3 — stampede, penetration, avalanche. Simulate a stampede: expire a hot key, fire fifty concurrent requests, and watch fifty identical database queries. Then fix it with a lock or a stale-while-revalidate, and measure. |
| `16:30–17:00` | **Job Hunt** | Three applications, tailored, logged. |
| `21:30–22:00` | **Communication** | Write five sentences on what should happen when the email provider is down and a user has just registered. |

*Total: 4h 0m*

### Day 114 — Tuesday 12 January 2027

**A queue and a worker · Retries, backoff and dead letters**

| Time | Track | Task |
|---|---|---|
| `After Fajr + Quran` | **Engineering** | Phase 2 Chapter 16 (Queues) — producers, consumers, and why the worker is a separate process rather than a function. Move email sending onto a BullMQ queue with a real worker. Kill the worker mid-job and see what happens. |
| `10:00–11:00 + 16:00–16:30` | **Engineering** | Phase 2 Chapter 16 — retry policies, exponential backoff, attempt limits, and the dead-letter queue. Make a job fail deliberately and watch it retry, back off and land in the DLQ. Then build the endpoint that lets you inspect and replay it. |
| `16:30–17:00` | **Job Hunt** | Three applications, tailored, logged. |
| `21:30–22:00` | **Communication** | Rehearse: "your nightly job ran twice and sent duplicate emails. What went wrong and how do you prevent it?" |

*Total: 4h 0m*

### Day 115 — Wednesday 13 January 2027

**Idempotent consumers · Brokers — the vocabulary**

| Time | Track | Task |
|---|---|---|
| `After Fajr + Quran` | **Engineering** | Phase 2 Chapter 16 — at-least-once delivery means your consumer will run twice. Make every job idempotent with an idempotency key, then deliver one twice on purpose and prove nothing doubled. |
| `10:00–11:00 + 16:00–16:30` | **Engineering** | Phase 7 Chapter 4 (Message Brokers) — queues versus topics, RabbitMQ versus Kafka, partitions, consumer groups, ordering guarantees. You will not run Kafka this year; you must be able to say when you would and what it costs. |
| `16:30–17:00` | **Communication** | Rehearse: "how do you keep a cache consistent with the database?" An honest answer includes the window where it is not. |
| `21:30–22:00` | **Communication** | Write a ninety-second answer to "how do you decide what to cache?" that starts with measuring. |

*Total: 4h 0m*

### Day 116 — Thursday 14 January 2027

**Event-driven, in your own service · The algorithms**

| Time | Track | Task |
|---|---|---|
| `After Fajr + Quran` | **Engineering** | Phase 7 Chapter 5 (Event-Driven Systems) — events versus commands, and the outbox pattern for publishing reliably from a transaction. Make one Project 2 write publish an event that two independent handlers consume. |
| `10:00–11:00 + 16:00–16:30` | **Engineering** | Phase 2 Chapter 20 (Rate Limiting) — fixed window, sliding window log, sliding window counter, token bucket, leaky bucket. Implement two by hand against Redis and show the boundary burst problem that fixed windows have. |
| `16:30–17:00` | **Job Hunt** | Applications: one tailored application or one follow-up. Log it in TRACKER.md. |
| `21:30–22:00` | **Communication** | English speaking session with Claude: explain today's engineering work out loud as if to an interviewer, then answer two follow-up questions. Fix every grammar point it raises. |

*Total: 4h 0m*

### Day 117 — Friday 15 January 2027

**Distributed, and honest about it · Timeouts, retries and budgets**

| Time | Track | Task |
|---|---|---|
| `After Fajr + Quran` | **Engineering** | Make the limiter correct across instances — the check and increment must be atomic, which means a Lua script or an atomic Redis operation, not a get followed by a set. Then run two instances and prove the limit holds across both. |
| `10:00–11:00 + 16:00–16:30` | **Engineering** | Phase 7 Chapter 6 (Distributed Systems) — every network call needs a timeout, and every retry needs a budget and jitter. Add both to every outbound call in Project 2. Then write down what your default timeout is and why that number. |
| `16:30–17:00` | **Job Hunt** | Applications: one tailored application or one follow-up. Log it in TRACKER.md. |
| `21:30–22:00` | **Communication** | English speaking session with Claude: explain today's engineering work out loud as if to an interviewer, then answer two follow-up questions. Fix every grammar point it raises. |

*Total: 4h 0m*

### Day 118 — Saturday 16 January 2027

**Redis everywhere it belongs**

| Time | Track | Task |
|---|---|---|
| `10:00–12:00` | **Engineering** | Deep build, two hours: move sessions into Redis, wire the WebSocket Redis adapter from week 28, and confirm two local instances now deliver each other's events. Then check what happens to your app when Redis is down — it should degrade, not die. |
| `12:30–13:30` | **Engineering** | Drill: five caching and Redis questions, spoken, timed. |
| `14:00–15:00` | **Review** | Weekly review. Read next week ahead. |
| `15:30–16:00` | **Job Hunt** | Two applications, tailored, logged. |
| `16:00–16:30` | **Job Hunt** | Three applications, tailored, logged. |

*Total: 5h 0m*

### Day 119 — Sunday 17 January 2027

**Run it under load**

| Time | Track | Task |
|---|---|---|
| `10:00–12:00` | **Engineering** | Deep build, two hours: queue, worker, retries, DLQ and the event flow all working. Then push a thousand jobs through and watch the worker keep up or not. Write the throughput number down. |
| `12:30–13:30` | **Engineering** | Drill: five queue and messaging questions, spoken, timed. |
| `14:00–15:00` | **Review** | Weekly review. Read next week ahead. |
| `15:30–16:00` | **Job Hunt** | Three applications, tailored, logged. |
| `16:00–16:30` | **Job Hunt** | Two applications, tailored, logged. |

*Total: 5h 0m*

## Week 18 — Rate Limiting, API Gateways and Resilience + Ship Project 2

*Block V — Caching and Queues · 30 hours*

Protecting a service from its callers, and from its own dependencies. Rate limiting, circuit breakers, timeouts and retries — the difference between a service that degrades and one that falls over and takes its neighbours with it.

A finished project is one a stranger can use, understand and evaluate without you in the room. This week is the last ten per cent, which is always more than ten per cent — and at the end you have two shipped backend services, which is two more than most candidates.

**Chapters this week:**

- [Rate Limiting](#phase-2-backend-engineering--rate-limiting)
- [Api Gateway](#phase-7-system-design--api-gateway)
- [Distributed Systems](#phase-7-system-design--distributed-systems)
- [Code Reviews Documentation](#phase-9-software-engineering--code-reviews-documentation)
- [Portfolio And Personal Brand](#phase-11-job-hunt-pakistan--portfolio-and-personal-brand)

**Deliverable:** Project 2 with a Redis-backed distributed rate limiter, timeouts and a circuit breaker on every outbound call, and a written note on what the service does when each dependency is unavailable. · ALSO: PROJECT 2 LIVE — deployed, documented, with a demo account, an architecture diagram, a two-minute demo video, and the measured numbers from weeks 18, 28, 30 and 31 in the README.

**Milestone:** You can explain the difference between a fixed window, a sliding window and a token bucket, and why an in-memory rate limiter is wrong the moment you run two instances. · AND: ANCHOR — Project 2 live by Sunday 24 January. A NestJS service with a real data layer, auth, queues, caching, real-time and tests, running at a public URL.

**Applications this week:** 16

**DSA drill:** Graphs — DFS & connected components → Graphs — topological sort — 7 problems

### Day 120 — Monday 18 January 2027

**Circuit breakers and graceful degradation · The gateway layer**

| Time | Track | Task |
|---|---|---|
| `After Fajr + Quran` | **Engineering** | Phase 7 Chapter 6 — the circuit breaker, its three states, and graceful degradation. Add one around a dependency, then take that dependency down and confirm the service degrades with a useful response instead of hanging. |
| `10:00–11:00 + 16:00–16:30` | **Engineering** | Phase 7 Chapter 8 (API Gateway) — what belongs at the edge: routing, auth, rate limiting, TLS termination. Draw where each concern lives in your architecture, and notice which you have implemented twice. |
| `16:30–17:00` | **Job Hunt** | Three applications, tailored, logged. |
| `21:30–22:00` | **Communication** | Write a ninety-second answer to "what happens to a job that keeps failing?" |

*Total: 4h 0m*

### Day 121 — Tuesday 19 January 2027

**Deploy it · Seed, and a demo account**

| Time | Track | Task |
|---|---|---|
| `After Fajr + Quran` | **Engineering** | Deploy Project 2 — API, worker, Postgres and Redis. The worker is a separate process and must be deployed as one; discovering that today is better than discovering it in week 41. |
| `10:00–11:00 + 16:00–16:30` | **Engineering** | A live demo with an empty database is a dead demo. Seed realistic data, create a demo account a reviewer can log into, and make every empty state say something useful. |
| `16:30–17:00` | **Job Hunt** | Three applications, tailored, logged. |
| `21:30–22:00` | **Communication** | Rehearse: "RabbitMQ or Kafka?" — answer with the shape of the problem, not a preference. |

*Total: 4h 0m*

### Day 122 — Wednesday 20 January 2027

**Review it as a hostile reviewer · Put the numbers in**

| Time | Track | Task |
|---|---|---|
| `After Fajr + Quran` | **Engineering** | Read Phase 9 Chapter 2 (Code Reviews and Documentation). Then review Project 2 as someone trying to reject you: dead code, commented-out blocks, secrets in history, TODOs, inconsistent naming, tests that assert nothing. Fix all of it. |
| `10:00–11:00 + 16:00–16:30` | **Engineering** | Collect every measurement you have taken — the index before-and-after, the N+1 fix, the cache hit rate, the queue throughput, the stampede fix — and put them in the README with the method. Measured numbers are what separate your repository from a tutorial. |
| `16:30–17:00` | **Communication** | Rehearse: "a downstream service is slow. What happens to yours?" The answer describes a mechanism, not a hope. |
| `21:30–22:00` | **Communication** | Write five sentences on why an in-memory rate limiter is wrong behind a load balancer. |

*Total: 4h 0m*

### Day 123 — Thursday 21 January 2027

**Put the link everywhere · Filesystem, users, permissions**

| Time | Track | Task |
|---|---|---|
| `After Fajr + Quran` | **Engineering** | Final pass: every journey tested on the deployed app from a phone, logged out and logged in. Tag the release. |
| `10:00–11:00 + 16:00–16:30` | **Engineering** | Phase 5 Chapter 1 (Linux) — filesystem layout, users, groups, permissions. Learn what 644 and 755 actually mean and why a private key with the wrong mode is refused. Practise on a real box, not a diagram. |
| `16:30–17:00` | **Job Hunt** | Applications: one tailored application or one follow-up. Log it in TRACKER.md. |
| `21:30–22:00` | **Communication** | English speaking session with Claude: explain today's engineering work out loud as if to an interviewer, then answer two follow-up questions. Fix every grammar point it raises. |

*Total: 4h 0m*

### Day 124 — Friday 22 January 2027

**Processes, ports, resources · Text processing and logs**

| Time | Track | Task |
|---|---|---|
| `After Fajr + Quran` | **Engineering** | Phase 5 Chapter 1 — ps, top, kill, lsof, ss, df, du, free. Then answer three questions on a running box: what is listening on port 3000, what is eating memory, what filled the disk. |
| `10:00–11:00 + 16:00–16:30` | **Engineering** | Phase 5 Chapter 1 — grep, sed, awk, cut, sort, uniq, tail -f, journalctl. No AI: take a raw access log and answer four questions from the command line alone — top endpoints, error rate, slowest paths, busiest hour. |
| `16:30–17:00` | **Job Hunt** | Applications: one tailored application or one follow-up. Log it in TRACKER.md. |
| `21:30–22:00` | **Communication** | English speaking session with Claude: explain today's engineering work out loud as if to an interviewer, then answer two follow-up questions. Fix every grammar point it raises. |

*Total: 4h 0m*

### Day 125 — Saturday 23 January 2027

**Break your own service**

| Time | Track | Task |
|---|---|---|
| `10:00–12:00` | **Engineering** | Deep build, two hours: take down Redis, the database and the email provider one at a time and observe. Fix every case where the service hangs or returns 500 rather than degrading. Write the failure matrix into the README. |
| `12:30–13:30` | **Engineering** | Drill: five resilience questions, spoken, timed. |
| `14:00–15:00` | **Review** | Weekly review. Next week Project 2 ships. Write the checklist tonight. Read next week ahead. |
| `15:30–16:00` | **Job Hunt** | Two applications, tailored, logged. |
| `16:00–16:30` | **Job Hunt** | Three applications, tailored, logged. |

*Total: 5h 0m*

### Day 126 — Sunday 24 January 2027

**ANCHOR — Project 2 live, Block V closes**

| Time | Track | Task |
|---|---|---|
| `10:00–12:00` | **Engineering** | Deep build, two hours: whatever is unfinished. If nothing is, write the "what I would do differently" section — reviewers read that one first. |
| `12:30–13:30` | **Engineering** | Drill: present both projects back to back, five minutes, as in a first round. Record it and watch it once. |
| `14:00–15:00` | **Review** | BLOCK V REVIEW. Two services live. Honestly: which would I lead with for a backend role at a product company? What is the technical-round rate now? Read Block VI ahead — the operational half. |
| `15:30–16:00` | **Job Hunt** | Three applications. Then rewrite the CV around two shipped services. It should look nothing like the October version — Nest, Postgres, Redis, queues, tests, all defensible. |
| `16:00–16:30` | **Job Hunt** | Three applications, tailored, logged. The quota rises to twelve a week — you are now the candidate the CV describes. |

*Total: 5h 0m*

## Week 19 — Linux and the Shell + Docker and Docker Compose

*Block VI — Linux, Docker and CI/CD · 30 hours*

Every server you will touch is Linux and every pipeline is a shell script. You have avoided both for three years. One week to stop being a tourist on the command line.

Containers are the vocabulary of every infrastructure conversation you will have. The goal is not memorising commands — it is understanding images, layers and networking well enough to debug when it does not work.

**Chapters this week:**

- [Linux](#phase-5-devops--linux)
- [Shell Scripting](#phase-5-devops--shell-scripting)
- [Docker](#phase-5-devops--docker)
- [Docker Compose](#phase-5-devops--docker-compose)
- [Technical English For Engineers](#phase-10-english-communication--technical-english-for-engineers)

**Deliverable:** week-34/ containing a backup script that dumps a database, compresses, rotates anything older than seven days, logs every step and exits non-zero on failure — plus a successful restore from it. · ALSO: Project 2 fully containerised — a multi-stage Dockerfile under 200MB running as a non-root user, and a compose file bringing up API, worker, Postgres and Redis with one command.

**Milestone:** You can diagnose a Linux box over SSH with no GUI: what is listening, what is eating memory, what filled the disk, what the logs say. · AND: A stranger can clone Project 2 and run the whole stack with one command, and you can explain the difference between an image and a container without hedging.

**Applications this week:** 24

**DSA drill:** Graphs — cycle detection → Union-find — 6 problems

### Day 127 — Monday 25 January 2027

**Shell scripting that fails loudly · SSH, keys and cron**

| Time | Track | Task |
|---|---|---|
| `After Fajr + Quran` | **Engineering** | Phase 5 Chapter 2 (Shell Scripting) — variables, conditionals, loops, exit codes, and set -euo pipefail. Write a script that fails loudly instead of continuing quietly, then test every failure path. |
| `10:00–11:00 + 16:00–16:30` | **Engineering** | Phase 5 Chapter 1 — SSH keys, config and agent. Then cron: schedule your backup script, watch it not run, find out why from the logs, and fix it. Cron failing silently is a rite of passage and a good interview story. |
| `16:30–17:00` | **Job Hunt** | Three applications, tailored, logged. |
| `21:30–22:00` | **Communication** | Read Phase 11 Chapter 8 (Portfolio and Personal Brand). Then write the README properly: what it does, the stack, the architecture diagram, how to run it, and what you would do next. |

*Total: 4h 0m*

### Day 128 — Tuesday 26 January 2027

**Images, layers, containers · Multi-stage builds and size**

| Time | Track | Task |
|---|---|---|
| `After Fajr + Quran` | **Engineering** | Phase 5 Chapter 3 (Docker) — images, layers, containers, and the build cache. Write the Dockerfile for your API by hand. Change one line and watch which layers rebuild — that observation is the whole caching lesson. |
| `10:00–11:00 + 16:00–16:30` | **Engineering** | Phase 5 Chapter 3 — multi-stage builds, base image choice, .dockerignore, and running as a non-root user. Get the image under 200MB and write the before and after down. |
| `16:30–17:00` | **Job Hunt** | Three applications, tailored, logged. |
| `21:30–22:00` | **Communication** | Record the two-minute demo: the problem, the main journey, one technical decision you are proud of. Re-record until it is clean. |

*Total: 4h 0m*

### Day 129 — Wednesday 27 January 2027

**Volumes, networks, environment · Compose the whole stack**

| Time | Track | Task |
|---|---|---|
| `After Fajr + Quran` | **Engineering** | Phase 5 Chapter 3 — volumes, networks, port publishing, environment. Then deliberately break container-to-container networking and fix it. That failure is exactly what interviewers ask about. |
| `10:00–11:00 + 16:00–16:30` | **Engineering** | Phase 5 Chapter 4 (Docker Compose) — services, depends_on, healthchecks, named volumes. Bring up API, worker, Postgres and Redis together. Make the database survive a restart and the API wait for it properly. |
| `16:30–17:00` | **Job Hunt** | Three applications. Twelve this week. |
| `21:30–22:00` | **Communication** | Write the six steps you would take if a production server stopped responding, in order. This is a real interview question. |

*Total: 4h 0m*

### Day 130 — Thursday 28 January 2027

**Debugging containers · Nginx as a reverse proxy**

| Time | Track | Task |
|---|---|---|
| `After Fajr + Quran` | **Engineering** | Logs, exec, inspect, and why a container exits immediately. Break your own stack three ways — wrong env var, wrong port, database not ready — and diagnose each from the logs alone. |
| `10:00–11:00 + 16:00–16:30` | **Engineering** | Phase 5 Chapter 5 (Nginx) and Chapter 12 (Reverse Proxy) — server blocks, location matching, proxy_pass, and the headers a proxy must forward. Put Nginx in front of Project 2 by hand and understand every line you wrote. |
| `16:30–17:00` | **Job Hunt** | Applications: one tailored application or one follow-up. Log it in TRACKER.md. |
| `21:30–22:00` | **Communication** | English speaking session with Claude: explain today's engineering work out loud as if to an interviewer, then answer two follow-up questions. Fix every grammar point it raises. |

*Total: 4h 0m*

### Day 131 — Friday 29 January 2027

**The network path · DNS**

| Time | Track | Task |
|---|---|---|
| `After Fajr + Quran` | **Engineering** | Phase 5 Chapter 9 (Networking) — TCP handshake, ports, keep-alive, and where latency actually comes from. Then trace a real request with curl -v and dig and write down every step it took. |
| `10:00–11:00 + 16:00–16:30` | **Engineering** | Phase 5 Chapter 10 (DNS) — record types, TTL, propagation, and why a low TTL matters before a migration. Point a domain you own at your server and watch the change propagate with dig. |
| `16:30–17:00` | **Job Hunt** | Applications: one tailored application or one follow-up. Log it in TRACKER.md. |
| `21:30–22:00` | **Communication** | English speaking session with Claude: explain today's engineering work out loud as if to an interviewer, then answer two follow-up questions. Fix every grammar point it raises. |

*Total: 4h 0m*

### Day 132 — Saturday 30 January 2027

**Build the backup script**

| Time | Track | Task |
|---|---|---|
| `10:00–12:00` | **Engineering** | Deep build, two hours: a real backup script for Project 2 — dump, compress, timestamp, upload, rotate past seven days, log every step, non-zero exit on failure. Then restore from it, because a backup you have not restored is not a backup. |
| `12:30–13:30` | **Engineering** | Drill: three LeetCode problems, timed, no AI. Then one spoken answer on debugging a server you cannot reproduce locally. |
| `14:00–15:00` | **Review** | Weekly review. Read next week ahead. |
| `15:30–16:00` | **Job Hunt** | Three applications, tailored, logged. |
| `16:00–16:30` | **Job Hunt** | Three applications, tailored, logged. |

*Total: 5h 0m*

### Day 133 — Sunday 31 January 2027

**One command, verified**

| Time | Track | Task |
|---|---|---|
| `10:00–12:00` | **Engineering** | Deep build, two hours: finish compose and the README section. Then test the claim — clean clone into a new folder, one command, working stack. More than one command means it is not done. |
| `12:30–13:30` | **Engineering** | Drill: three problems, timed. Then explain images versus containers aloud in sixty seconds. |
| `14:00–15:00` | **Review** | Weekly review. Read next week ahead. |
| `15:30–16:00` | **Job Hunt** | Three applications, tailored, logged. |
| `16:00–16:30` | **Job Hunt** | Three applications. Twelve this week. |

*Total: 5h 0m*

