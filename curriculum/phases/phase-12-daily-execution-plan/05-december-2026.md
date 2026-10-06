# Phase 12 — Chapter 5: December 2026

> **31 days · Day 72 to Day 102 · 132 scheduled hours**

## Chapter Overview

This chapter covers weeks 11, 12, 13, 14, 15 of the 27-week plan. Every day below is a contract with yourself. Tick the tasks in the reader's **Plan** tab as you finish them — the app tracks your streak and completion rate across all 188 days.

| Week | Dates | Hours | Apps | DSA | Focus | Milestone |
|---|---|---|---|---|---|---|
| **W11** | 01 Dec – 06 Dec | 30h | 10 | Binary search — on the answer → Sorting — custom comparators | Indexes and Query Plans + Transactions and Concurrency — and AI Comes Back | You can read an EXPLAIN ANALYZE plan, say which line is the problem, and predict whether an index will help before you create it. · AND: ANCHOR — AI unlocked on Tuesday 1 December, as reviewer and teacher, never author. And you can describe a race condition you personally reproduced. |
| **W12** | 07 Dec – 13 Dec | 30h | 10 | Intervals — merge & overlap → Trees — DFS traversal | ORMs — Prisma and TypeORM + MongoDB and Modelling Without Joins | You can name three things an ORM makes worse, not just three it makes better. And you can reproduce and fix an N+1 query on demand. · AND: You can explain embedding versus referencing with a rule for choosing, and you can write an aggregation pipeline with $match, $group and $lookup from memory. |
| **W13** | 14 Dec – 20 Dec | 30h | 13 | Trees — BFS by level → Binary search trees | Replication, Partitioning, Sharding — and the Block Close + NestJS Fundamentals — Modules, Controllers, Providers, DI | BLOCK III CLOSES — ANCHOR: Project 1 has a complete, indexed, transactional data layer across SQL and NoSQL by Saturday 19 December. You can explain replication lag and why it breaks read-after-write. · AND: You can explain what the Nest DI container does at startup, what a provider token is, and why a circular dependency between two modules happens — without calling any of it magic. |
| **W14** | 21 Dec – 27 Dec | 30h | 16 | Trees — path & depth problems → Heaps — top K | The Request Pipeline — Pipes, Guards, Interceptors, Filters + The Nest Data Layer — TypeORM, Prisma, Transactions | You can draw the Nest request pipeline in order from memory and say what each stage is for and what it must not do. · AND: You can explain how a transaction spans two services in Nest without passing a connection object through every method signature. |
| **W15** | 28 Dec – 31 Dec | 30h | 16 | Heaps — streaming median → Recursion — the base-case habit | Authentication and Authorisation in Nest + Testing — Unit, Integration, End to End | You can explain why a JWT in localStorage is a risk, what refresh-token rotation solves, and how you log a user out of a stateless system. Nobody at this level should be guessing here. · AND: The suite runs green from empty, covers every endpoint at least once including failure paths, and you can explain what you deliberately chose not to test. |

---

## Week 11 — Indexes and Query Plans + Transactions and Concurrency — and AI Comes Back

*Block III — Databases · 30 hours*

The single most valuable week in the plan for your market position. Very few three-year candidates in this market can honestly say "I read query plans". After this week you can, with numbers from your own project.

Transactions separate a developer from an engineer in a backend interview. Two users buying the last item at the same moment is a question you will be asked, and the answer is not "I would check the stock first". Also: on Monday, AI returns as a reviewer.

**Chapters this week:**

- [Indexes](#phase-3-databases--indexes)
- [Query Optimization](#phase-3-databases--query-optimization)
- [Transactions](#phase-3-databases--transactions)
- [Small Talk And First Five Minutes](#phase-10-english-communication--small-talk-and-first-five-minutes)

**Deliverable:** A written before-and-after for five queries you indexed, with the EXPLAIN ANALYZE output for each and the timing difference. · ALSO: week-19/ containing a demonstrated lost-update race condition and three different correct fixes, each with the SQL and a written explanation of its trade-off.

**Milestone:** You can read an EXPLAIN ANALYZE plan, say which line is the problem, and predict whether an index will help before you create it. · AND: ANCHOR — AI unlocked on Tuesday 1 December, as reviewer and teacher, never author. And you can describe a race condition you personally reproduced.

**Applications this week:** 10

**DSA drill:** Binary search — on the answer → Sorting — custom comparators — 7 problems

### Day 72 — Tuesday 1 December 2026

**AI UNLOCKED — the rules of use · ACID, concretely**

| Time | Track | Task |
|---|---|---|
| `After Fajr + Quran` | **Engineering** | Read the final section of Phase 0 Chapter 4 again. Then write the AI clause into your repository README: I may use AI to review, explain and check, never to author, and I must be able to explain every line here unaided. Eighteen weeks of building the muscle end today; do not undo them in a fortnight. |
| `10:00–11:00 + 16:00–16:30` | **Engineering** | Phase 3 Chapter 6 (Transactions) — ACID. For each letter write your own example from Project 1. A definition you cannot illustrate is one you will fumble in an interview. |
| `16:30–17:00` | **Job Hunt** | Update the CV with a measured number: "reduced X from Nms to Mms". You now have real ones. |
| `21:30–22:00` | **Communication** | Fifth application. Then rehearse: "where do you put business rules — application or database?" Have a real position and a reason. |

*Total: 4h 0m*

### Day 73 — Wednesday 2 December 2026

**Isolation levels and their anomalies · Reproduce a race condition**

| Time | Track | Task |
|---|---|---|
| `After Fajr + Quran` | **Engineering** | Phase 3 Chapter 6 — isolation levels. Dirty read, non-repeatable read, phantom read, and which level permits which. Find out what PostgreSQL actually defaults to and what that means for your code. |
| `10:00–11:00 + 16:00–16:30` | **Engineering** | No AI for this one — do it yourself. Open two psql sessions and deliberately produce a lost update on a Project 1 table. Watch it happen. Write down exactly what each session did and when. |
| `16:30–17:00` | **Communication** | Fifth application. Then rehearse: "this query is slow. Walk me through what you would do." Have an ordered method, not a guess. |
| `21:30–22:00` | **Communication** | Write a two-minute explanation of what an index is for a non-technical manager, then a ninety-second one for an interviewer. Both aloud. |

*Total: 4h 0m*

### Day 74 — Thursday 3 December 2026

**Three ways to fix it · What an ORM buys and costs**

| Time | Track | Task |
|---|---|---|
| `After Fajr + Quran` | **Engineering** | Phase 3 Chapter 6 — locking. Fix yesterday's race three ways: SELECT FOR UPDATE, an optimistic version column, and a single atomic UPDATE. Write the trade-off of each, then choose one for Project 1 and implement it. |
| `10:00–11:00 + 16:00–16:30` | **Engineering** | Phase 3 Chapter 12 (ORMs) — the mapping problem, leaky abstractions, and migration control. Then reproduce an N+1 query deliberately in your own project and measure it. You need to have seen it to talk about it. |
| `16:30–17:00` | **Job Hunt** | Applications: one tailored application or one follow-up. Log it in TRACKER.md. |
| `21:30–22:00` | **Communication** | English speaking session with Claude: explain today's engineering work out loud as if to an interviewer, then answer two follow-up questions. Fix every grammar point it raises. |

*Total: 4h 0m*

### Day 75 — Friday 4 December 2026

**Prisma — schema, client, migrations · TypeORM — because Nest defaults to it**

| Time | Track | Task |
|---|---|---|
| `After Fajr + Quran` | **Engineering** | Phase 3 Chapter 13 (Prisma) — schema definition, the generated client, and migrate. Express the Project 1 schema in Prisma and generate the client. Then read the SQL Prisma actually emits for three of your queries. |
| `10:00–11:00 + 16:00–16:30` | **Engineering** | Phase 3 Chapter 14 (TypeORM) — entities, decorators, the repository pattern, relations. Model two Project 1 entities in TypeORM on a branch. You need this specifically for the Nest block, and the decorator work from week 7 is why it will make sense. |
| `16:30–17:00` | **Job Hunt** | Applications: one tailored application or one follow-up. Log it in TRACKER.md. |
| `21:30–22:00` | **Communication** | English speaking session with Claude: explain today's engineering work out loud as if to an interviewer, then answer two follow-up questions. Fix every grammar point it raises. |

*Total: 4h 0m*

### Day 76 — Saturday 5 December 2026

**Measure everything**

| Time | Track | Task |
|---|---|---|
| `10:00–12:00` | **Engineering** | Deep build, two hours, no AI: index Project 1 properly. Five queries, before and after, EXPLAIN ANALYZE output saved for each. Then write it up — that document is interview material for the rest of the plan. |
| `12:30–13:30` | **Engineering** | Drill: five query-plan questions, timed. Read a plan and say what is wrong with it. |
| `14:00–15:00` | **Review** | Weekly review. Read next week ahead. |
| `15:30–16:00` | **Job Hunt** | Two applications, tailored, logged. |
| `16:00–16:30` | **Job Hunt** | Two applications, tailored, logged. |

*Total: 5h 0m*

### Day 77 — Sunday 6 December 2026

**Make Project 1 transaction-safe**

| Time | Track | Task |
|---|---|---|
| `10:00–12:00` | **Engineering** | Deep build, two hours: wrap every multi-step write in a proper transaction, then write a script that hammers one endpoint concurrently and prove the data stays consistent. AI may review what you wrote; it may not write it. |
| `12:30–13:30` | **Engineering** | Drill: five SQL questions including two on transactions and deadlocks, timed. No AI — the drill stays AI-free for the rest of the plan, because interviews are. |
| `14:00–15:00` | **Review** | Weekly review. Honest question: did AI creep back into authoring this week, and where? Read next week ahead. |
| `15:30–16:00` | **Job Hunt** | Check for any transaction in Project 1 that stays open across a network call. That is a production incident waiting, and finding one is a good interview story. |
| `16:00–16:30` | **Job Hunt** | Two applications, tailored, logged. |

*Total: 5h 0m*

## Week 12 — ORMs — Prisma and TypeORM + MongoDB and Modelling Without Joins

*Block III — Databases · 30 hours*

Every team you interview with uses an ORM, and the useful answer to "why not raw SQL" is one you can only give having done both. You have written six weeks of SQL by hand; now learn what an ORM buys and what it quietly costs.

NoSQL is not "SQL but easier", it is a different modelling discipline: you design around your queries instead of around your entities. Knowing when a document store is genuinely right — and saying so honestly — is worth more in an interview than knowing its syntax.

**Chapters this week:**

- [Orms](#phase-3-databases--orms)
- [Prisma](#phase-3-databases--prisma)
- [Typeorm](#phase-3-databases--typeorm)
- [Mongodb](#phase-3-databases--mongodb)

**Deliverable:** Project 1 on Prisma, with three queries deliberately left in raw SQL and a comment on each saying why, plus a written comparison of Prisma and TypeORM from having used both. · ALSO: A second copy of one Project 1 domain modelled in MongoDB, with the aggregation pipeline equivalents of three of your SQL reports, and a written argument for which store you would actually choose.

**Milestone:** You can name three things an ORM makes worse, not just three it makes better. And you can reproduce and fix an N+1 query on demand. · AND: You can explain embedding versus referencing with a rule for choosing, and you can write an aggregation pipeline with $match, $group and $lookup from memory.

**Applications this week:** 10

**DSA drill:** Intervals — merge & overlap → Trees — DFS traversal — 8 problems

### Day 78 — Monday 7 December 2026

**Port the data layer · Fix the N+1 three ways**

| Time | Track | Task |
|---|---|---|
| `After Fajr + Quran` | **Engineering** | Port Project 1's queries to Prisma. Keep three in raw SQL on purpose, where the ORM would make them worse, and comment each with the reason. AI may review; it may not write. |
| `10:00–11:00 + 16:00–16:30` | **Engineering** | Fix your N+1 with eager loading, with a single join query, and with a batched lookup. Measure all three. Then write down which you chose and why — this is a favourite interview question and you now have a real answer. |
| `16:30–17:00` | **Job Hunt** | Two applications, tailored, logged. |
| `21:30–22:00` | **Communication** | Read Phase 10 Chapter 5 (Small Talk and the First Five Minutes). Practise the first ninety seconds of a call aloud — greeting, one line about yourself, one question back. |

*Total: 4h 0m*

### Day 79 — Tuesday 8 December 2026

**Documents, collections, and the model · Embedding versus referencing**

| Time | Track | Task |
|---|---|---|
| `After Fajr + Quran` | **Engineering** | Phase 3 Chapter 3 (MongoDB) — documents, collections, BSON, and _id. Install it, insert real data, and query it from the shell. Then write down the three things that feel wrong coming from SQL — those instincts are the lesson. |
| `10:00–11:00 + 16:00–16:30` | **Engineering** | Phase 3 Chapter 3 — the central modelling decision. Embed when the data is read together and bounded; reference when it is large, shared, or grows without limit. Model one Project 1 domain both ways and write which you would ship and why. |
| `16:30–17:00` | **Job Hunt** | Update the CV: Prisma and TypeORM both go on now, because you have used both. |
| `21:30–22:00` | **Communication** | Fifth application. Then rehearse: "how would you handle two users buying the last item at the same time?" You have now actually done it — say so. |

*Total: 4h 0m*

### Day 80 — Wednesday 9 December 2026

**The aggregation pipeline · Indexes and the explain plan, again**

| Time | Track | Task |
|---|---|---|
| `After Fajr + Quran` | **Engineering** | Phase 3 Chapter 3 — aggregation. $match, $group, $project, $sort, $unwind, $lookup. Rewrite three of your SQL reports as pipelines. Notice where $lookup is painful and understand why that is the point. |
| `10:00–11:00 + 16:00–16:30` | **Engineering** | Phase 3 Chapter 3 — indexes in MongoDB, compound index order, and explain(). Everything you learned in week 18 transfers. Prove it: index one slow pipeline and measure the difference. |
| `16:30–17:00` | **Communication** | Fifth application. Then rehearse: "tell me about a time the ORM was the wrong tool." |
| `21:30–22:00` | **Communication** | Write a ninety-second answer to "ORM or raw SQL?" that refuses the false choice and says when each. |

*Total: 4h 0m*

### Day 81 — Thursday 10 December 2026

**Consistency, durability, and write concern · Replication, and the lag problem**

| Time | Track | Task |
|---|---|---|
| `After Fajr + Quran` | **Engineering** | Phase 3 Chapter 3 — replica sets, write concern, read preference, and what "eventually consistent" means for your code. This is where NoSQL interview questions actually go, and where most candidates stop. |
| `10:00–11:00 + 16:00–16:30` | **Engineering** | Phase 3 Chapter 9 (Replication) — primary and replica, synchronous versus asynchronous, and failover. Set up a local replica. Then write to the primary, read immediately from the replica, and see stale data. That is read-after-write, and it is a real interview question. |
| `16:30–17:00` | **Job Hunt** | Applications: one tailored application or one follow-up. Log it in TRACKER.md. |
| `21:30–22:00` | **Communication** | English speaking session with Claude: explain today's engineering work out loud as if to an interviewer, then answer two follow-up questions. Fix every grammar point it raises. |

*Total: 4h 0m*

### Day 82 — Friday 11 December 2026

**Read replicas in application code · Partitioning**

| Time | Track | Task |
|---|---|---|
| `After Fajr + Quran` | **Engineering** | Route Project 1's reads to the replica and writes to the primary. Then find the endpoint that breaks because of lag and fix it honestly — read your own writes from the primary. Most people discover this in production. |
| `10:00–11:00 + 16:00–16:30` | **Engineering** | Phase 3 Chapter 10 (Partitioning) — range and list partitioning, and partition pruning. Partition one large Project 1 table by date, then prove with EXPLAIN that a date-filtered query touches only one partition. |
| `16:30–17:00` | **Job Hunt** | Applications: one tailored application or one follow-up. Log it in TRACKER.md. |
| `21:30–22:00` | **Communication** | English speaking session with Claude: explain today's engineering work out loud as if to an interviewer, then answer two follow-up questions. Fix every grammar point it raises. |

*Total: 4h 0m*

### Day 83 — Saturday 12 December 2026

**Raw versus ORM, measured**

| Time | Track | Task |
|---|---|---|
| `10:00–12:00` | **Engineering** | Deep build, two hours: write your three most complex Project 1 queries both ways and time both against seeded data. Write the comparison into PROJECT1.md with the numbers. |
| `12:30–13:30` | **Engineering** | Drill: five questions on ORMs, N+1 and transactions, spoken, timed. |
| `14:00–15:00` | **Review** | Weekly review. Read next week ahead — NoSQL. |
| `15:30–16:00` | **Job Hunt** | Two applications, tailored, logged. |
| `16:00–16:30` | **Job Hunt** | Two applications, tailored, logged. |

*Total: 5h 0m*

### Day 84 — Sunday 13 December 2026

**Argue for one of them**

| Time | Track | Task |
|---|---|---|
| `10:00–12:00` | **Engineering** | Deep build, two hours: finish the MongoDB version of your domain, get the three pipelines working and indexed, then write the honest comparison in PROJECT1.md — which store, for this project, and why. |
| `12:30–13:30` | **Engineering** | Drill: five MongoDB questions, timed, plus one spoken comparison of the two stores. |
| `14:00–15:00` | **Review** | Weekly review. Read next week ahead — the last database week. |
| `15:30–16:00` | **Job Hunt** | Update the CV: MongoDB goes on with a sentence about the modelling work, not as a logo. |
| `16:00–16:30` | **Job Hunt** | Two applications, tailored, logged. |

*Total: 5h 0m*

## Week 13 — Replication, Partitioning, Sharding — and the Block Close + NestJS Fundamentals — Modules, Controllers, Providers, DI

*Block III — Databases · 30 hours*

The scaling vocabulary. You will not shard anything this year, and you will be asked about it, because the question tests whether you understand the trade-offs rather than whether you have operated one.

The architecture, and why it exists. Nest is Angular's structure applied to the server: modules that declare what they own, providers resolved by a container, and controllers that do nothing but translate HTTP. You built a crude version of this in week 6; now see it done properly.

**Chapters this week:**

- [Replication](#phase-3-databases--replication)
- [Partitioning](#phase-3-databases--partitioning)
- [Sharding](#phase-3-databases--sharding)
- [Database Scaling](#phase-7-system-design--database-scaling)
- [Nestjs](#phase-2-backend-engineering--nestjs)

**Deliverable:** A working local replica of your Postgres database with reads served from it, one partitioned table with a demonstrated pruning benefit, and a written scaling path for Project 1 from one server to many. · ALSO: PROJECT 2 started — the Nest skeleton of your Project 1 domain, with two feature modules, controllers, services and repositories, wired by DI, and a written comparison against your own week-6 container.

**Milestone:** BLOCK III CLOSES — ANCHOR: Project 1 has a complete, indexed, transactional data layer across SQL and NoSQL by Saturday 19 December. You can explain replication lag and why it breaks read-after-write. · AND: You can explain what the Nest DI container does at startup, what a provider token is, and why a circular dependency between two modules happens — without calling any of it magic.

**Applications this week:** 13

**DSA drill:** Trees — BFS by level → Binary search trees — 6 problems

### Day 85 — Monday 14 December 2026

**Sharding, and what it costs · The scaling path, written down**

| Time | Track | Task |
|---|---|---|
| `After Fajr + Quran` | **Engineering** | Phase 3 Chapter 11 (Sharding) — shard keys, cross-shard queries, rebalancing, and why sharding is the answer of last resort. Write down what you would lose in Project 1 if you sharded it today. That list is the answer interviewers want. |
| `10:00–11:00 + 16:00–16:30` | **Engineering** | Phase 7 Chapter 7 (Database Scaling) — pull it together. Write the scaling path for Project 1 in PROJECT1.md: what you would do first, second and third as traffic grows, with the signal that would trigger each step. |
| `16:30–17:00` | **Job Hunt** | Two applications, tailored, logged. |
| `21:30–22:00` | **Communication** | Write a two-minute answer to "when would you choose MongoDB over PostgreSQL?" An honest "usually I would not, but here is when I would" is a strong answer. |

*Total: 4h 0m*

### Day 86 — Tuesday 15 December 2026

**The module graph · Providers and the injector**

| Time | Track | Task |
|---|---|---|
| `After Fajr + Quran` | **Engineering** | Phase 2 Chapter 3 (NestJS) — modules. imports, providers, controllers, exports, and what each one means for visibility. Create the Project 2 skeleton by hand with the CLI, then read every generated file and explain it to yourself line by line. |
| `10:00–11:00 + 16:00–16:30` | **Engineering** | Phase 2 Chapter 3 — providers and dependency injection. Class providers, useValue, useFactory, useClass, and injection tokens. Then open your week-6 container beside it and write down the four things Nest does that yours did not. |
| `16:30–17:00` | **Job Hunt** | Rewrite the CV database section from scratch. You have nine weeks of real material and it should read nothing like the October version. |
| `21:30–22:00` | **Communication** | Fifth application. Then rehearse: "how do transactions work in MongoDB?" — the honest answer includes what changed and what it costs. |

*Total: 4h 0m*

### Day 87 — Wednesday 16 December 2026

**Controllers as a thin translation layer · Services, repositories, and layering**

| Time | Track | Task |
|---|---|---|
| `After Fajr + Quran` | **Engineering** | Phase 2 Chapter 3 — controllers, routing decorators, and parameter decorators. Build two controllers for Project 2. Keep them thin: parse, delegate, return. If a controller has business logic in it, that logic is in the wrong file. |
| `10:00–11:00 + 16:00–16:30` | **Engineering** | Phase 2 Chapter 3 — services and the layering Nest assumes. Controller, service, repository. Move your Project 1 business logic across into services and notice what refuses to move cleanly — that is where Project 1 was badly layered. |
| `16:30–17:00` | **Communication** | Fifth application. Then rehearse the whole scaling ladder aloud: index, cache, replica, partition, shard — in that order, with the reason for each step. |
| `21:30–22:00` | **Communication** | Write a two-minute answer to "how would you scale reads?" that mentions lag before someone else does. |

*Total: 4h 0m*

### Day 88 — Thursday 17 December 2026

**Scopes, lifecycle, and configuration · The order, drawn from memory**

| Time | Track | Task |
|---|---|---|
| `After Fajr + Quran` | **Engineering** | Phase 2 Chapter 3 — provider scopes (singleton, request, transient) and why the default is singleton. Then lifecycle hooks, and ConfigModule for environment configuration with schema validation at boot. |
| `10:00–11:00 + 16:00–16:30` | **Engineering** | Phase 2 Chapter 3 — the request lifecycle. Middleware, guards, interceptors (before), pipes, handler, interceptors (after), exception filters. Draw it on paper. Then add a console log at every stage and prove the order empirically. |
| `16:30–17:00` | **Job Hunt** | Applications: one tailored application or one follow-up. Log it in TRACKER.md. |
| `21:30–22:00` | **Communication** | English speaking session with Claude: explain today's engineering work out loud as if to an interviewer, then answer two follow-up questions. Fix every grammar point it raises. |

*Total: 4h 0m*

### Day 89 — Friday 18 December 2026

**Pipes and DTO validation · Guards and authorisation**

| Time | Track | Task |
|---|---|---|
| `After Fajr + Quran` | **Engineering** | Phase 2 Chapter 3 and Chapter 10 — pipes. ValidationPipe, class-validator, class-transformer, and whitelist/forbidNonWhitelisted so unknown fields are rejected rather than ignored. Write DTOs for every Project 2 endpoint and turn validation on globally. |
| `10:00–11:00 + 16:00–16:30` | **Engineering** | Phase 2 Chapter 3 — guards and the execution context. Build a role guard using a custom decorator and Reflector metadata — the reflect-metadata work from week 7 is exactly this. Protect one route with it. |
| `16:30–17:00` | **Job Hunt** | Applications: one tailored application or one follow-up. Log it in TRACKER.md. |
| `21:30–22:00` | **Communication** | English speaking session with Claude: explain today's engineering work out loud as if to an interviewer, then answer two follow-up questions. Fix every grammar point it raises. |

*Total: 4h 0m*

### Day 90 — Saturday 19 December 2026

**BLOCK III REVIEW**

| Time | Track | Task |
|---|---|---|
| `10:00–12:00` | **Engineering** | Deep build, two hours: finish everything outstanding in the data layer. Then write the data-layer chapter of the README — schema, indexes, transactions, the NoSQL comparison, the scaling path. This document is why you get past screening calls. |
| `12:30–13:30` | **Engineering** | Block drill: ten database questions, spoken and written, timed. Compare your comfort against week 14. |
| `14:00–15:00` | **Review** | BLOCK III REVIEW. Honestly: could I hold a forty-minute database conversation with a tier-2 engineer today? Fifty-plus applications sent — what is the technical-round rate? Then read Block IV ahead — NestJS, and the framework your next job title names. |
| `15:30–16:00` | **Job Hunt** | Two applications, tailored, logged. The quota rises to eight a week — you can now hold a database conversation. |
| `16:00–16:30` | **Job Hunt** | Three applications, tailored, logged. |

*Total: 5h 0m*

### Day 91 — Sunday 20 December 2026

**Build the skeleton**

| Time | Track | Task |
|---|---|---|
| `10:00–12:00` | **Engineering** | Deep build, two hours: Project 2 skeleton — two feature modules, controllers, services, repository interfaces, configuration validated at startup, running and answering. AI may review; it may not write. |
| `12:30–13:30` | **Engineering** | Drill: three LeetCode problems, timed, no AI. Then explain the Nest bootstrap sequence aloud from memory. |
| `14:00–15:00` | **Review** | Weekly review. Read next week ahead. |
| `15:30–16:00` | **Job Hunt** | Three applications, tailored, logged. |
| `16:00–16:30` | **Job Hunt** | Two applications, tailored, logged. |

*Total: 5h 0m*

## Week 14 — The Request Pipeline — Pipes, Guards, Interceptors, Filters + The Nest Data Layer — TypeORM, Prisma, Transactions

*Block IV — NestJS · 30 hours*

Nest's request pipeline is Express middleware with names and ordering guarantees. Knowing the exact order — middleware, guards, interceptors, pipes, handler, interceptors again, filters — is the single most asked Nest interview question.

Connecting Block III to Block IV. The repository pattern Nest assumes, migrations that run in CI, and transactions that span services — which is the part every tutorial skips and every real system needs.

**Chapters this week:**

- [Nestjs](#phase-2-backend-engineering--nestjs)
- [Validation](#phase-2-backend-engineering--validation)
- [Error Handling](#phase-2-backend-engineering--error-handling)
- [Typeorm](#phase-3-databases--typeorm)
- [Transactions](#phase-3-databases--transactions)

**Deliverable:** Project 2 with a validation pipe on every DTO, a guard protecting one route, a logging interceptor adding timing, and a global exception filter producing your standard error shape. · ALSO: Project 2 on a real database with entities, migrations, a repository layer behind interfaces, and one multi-service operation wrapped in a single transaction.

**Milestone:** You can draw the Nest request pipeline in order from memory and say what each stage is for and what it must not do. · AND: You can explain how a transaction spans two services in Nest without passing a connection object through every method signature.

**Applications this week:** 16

**DSA drill:** Trees — path & depth problems → Heaps — top K — 8 problems

### Day 92 — Monday 21 December 2026

**Interceptors · Exception filters**

| Time | Track | Task |
|---|---|---|
| `After Fajr + Quran` | **Engineering** | Phase 2 Chapter 3 — interceptors and the RxJS stream they operate on. Build a logging interceptor that times every request, and a transform interceptor that wraps every response in your standard envelope. You do not need to know RxJS deeply; you do need to know what the observable is. |
| `10:00–11:00 + 16:00–16:30` | **Engineering** | Phase 2 Chapter 3 and Chapter 11 — exception filters. Build a global filter that turns your domain error classes into HTTP responses with the exact error shape you defined in week 11. One taxonomy, two frameworks. |
| `16:30–17:00` | **Job Hunt** | Three applications, tailored, logged. |
| `21:30–22:00` | **Communication** | Explain dependency injection aloud in ninety seconds, using your own container as the example and Nest as the grown-up version. |

*Total: 4h 0m*

### Day 93 — Tuesday 22 December 2026

**Entities and the repository pattern · Migrations, and never synchronize**

| Time | Track | Task |
|---|---|---|
| `After Fajr + Quran` | **Engineering** | Phase 3 Chapter 14 (TypeORM) with Nest — entities, decorators, relations, and the injected repository. Model the Project 2 schema. Everything you designed in week 16 carries over; only the expression changes. |
| `10:00–11:00 + 16:00–16:30` | **Engineering** | Generate migrations from your entities, review the SQL they produce line by line, and run them. Then turn synchronize off permanently and write in the README why it must never be true in production. This is a real interview question. |
| `16:30–17:00` | **Job Hunt** | Three applications, tailored, logged. |
| `21:30–22:00` | **Communication** | Write a two-minute answer to "how do you structure a Nest application?" using your own module graph. |

*Total: 4h 0m*

### Day 94 — Wednesday 23 December 2026

**Repositories behind interfaces · Transactions across services**

| Time | Track | Task |
|---|---|---|
| `After Fajr + Quran` | **Engineering** | Put your repositories behind interfaces and inject them by token, so a service depends on an abstraction rather than TypeORM. This is dependency inversion from week 6, and it is what makes week 27's tests easy rather than painful. |
| `10:00–11:00 + 16:00–16:30` | **Engineering** | Phase 3 Chapter 6 with Nest — transactions. Wrap one multi-step operation spanning two services in a single transaction. Do it the ugly way first (pass the manager through), then with AsyncLocalStorage so it flows invisibly. Compare the two and keep the better one. |
| `16:30–17:00` | **Communication** | Rehearse: "what is the difference between a guard, an interceptor and a middleware?" Ninety seconds, with an example of each. |
| `21:30–22:00` | **Communication** | Write five sentences on why validation belongs in a pipe and not in the service. |

*Total: 4h 0m*

### Day 95 — Thursday 24 December 2026

**Query performance in the ORM · Passwords, properly**

| Time | Track | Task |
|---|---|---|
| `After Fajr + Quran` | **Engineering** | Turn on query logging and read every statement one endpoint produces. Find the N+1 that TypeORM introduced, fix it with a relation load or a query builder, and measure. Week 18 and week 20 both pay off here. |
| `10:00–11:00 + 16:00–16:30` | **Engineering** | Phase 2 Chapter 6 (Authentication) — hashing versus encryption, bcrypt and argon2, salts, and what a work factor is for. Implement registration and login in Nest with hashed passwords and a timing-safe comparison. |
| `16:30–17:00` | **Job Hunt** | Applications: one tailored application or one follow-up. Log it in TRACKER.md. |
| `21:30–22:00` | **Communication** | English speaking session with Claude: explain today's engineering work out loud as if to an interviewer, then answer two follow-up questions. Fix every grammar point it raises. |

*Total: 4h 0m*

### Day 96 — Friday 25 December 2026

**Passport strategies and guards · JWT, refresh, and revocation**

| Time | Track | Task |
|---|---|---|
| `After Fajr + Quran` | **Engineering** | Phase 2 Chapter 3 with Passport — the strategy pattern, a local strategy for login, a JWT strategy for requests, and the guards that invoke them. Read the strategy source once: it is a class with a validate method, and that is all. |
| `10:00–11:00 + 16:00–16:30` | **Engineering** | Phase 2 Chapter 7 (JWT) — structure, signing, expiry, and the fact that a JWT is signed, not encrypted. Decode one of your own tokens by hand to prove the payload is readable. Then implement refresh with rotation, and answer in writing: how do you actually revoke? |
| `16:30–17:00` | **Job Hunt** | Applications: one tailored application or one follow-up. Log it in TRACKER.md. |
| `21:30–22:00` | **Communication** | English speaking session with Claude: explain today's engineering work out loud as if to an interviewer, then answer two follow-up questions. Fix every grammar point it raises. |

*Total: 4h 0m*

### Day 97 — Saturday 26 December 2026

**Wire the pipeline up**

| Time | Track | Task |
|---|---|---|
| `10:00–12:00` | **Engineering** | Deep build, two hours: every DTO validated, one guarded route, timing on every request, one error shape everywhere. Then send ten malformed requests and confirm each returns something correct and non-leaking. |
| `12:30–13:30` | **Engineering** | Drill: draw the pipeline from memory, then three LeetCode problems, timed. |
| `14:00–15:00` | **Review** | Weekly review. Read next week ahead. |
| `15:30–16:00` | **Job Hunt** | Two applications, tailored, logged. |
| `16:00–16:30` | **Job Hunt** | Three applications, tailored, logged. |

*Total: 5h 0m*

### Day 98 — Sunday 27 December 2026

**Finish the data layer**

| Time | Track | Task |
|---|---|---|
| `10:00–12:00` | **Engineering** | Deep build, two hours: Project 2 fully on the database, migrations clean from empty, seeded, indexed, transactional. Then drop the database, run the migrations from scratch, and seed it — if that does not work, it is not finished. |
| `12:30–13:30` | **Engineering** | Drill: five questions on ORMs, migrations and transactions, spoken, timed. |
| `14:00–15:00` | **Review** | Weekly review. Read next week ahead. |
| `15:30–16:00` | **Job Hunt** | Three applications, tailored, logged. |
| `16:00–16:30` | **Job Hunt** | Two applications, tailored, logged. |

*Total: 5h 0m*

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

### Day 99 — Monday 28 December 2026

**Sessions, and when they are the better answer · Roles, permissions and OAuth**

| Time | Track | Task |
|---|---|---|
| `After Fajr + Quran` | **Engineering** | Phase 2 Chapter 9 (Session Management) — server-side sessions in Redis, cookie flags (HttpOnly, Secure, SameSite), and session fixation. Implement session auth on a branch, then write down which approach Project 2 ships with and why. |
| `10:00–11:00 + 16:00–16:30` | **Engineering** | Phase 2 Chapter 8 (OAuth) — the authorisation code flow and PKCE. Add one social login. Then build role-based authorisation with a custom decorator and your Reflector guard, and protect two routes with different roles. |
| `16:30–17:00` | **Job Hunt** | Three applications, tailored, logged. |
| `21:30–22:00` | **Communication** | Write a ninety-second answer to "how do you manage schema changes across environments?" |

*Total: 4h 0m*

### Day 100 — Tuesday 29 December 2026

**The first unit tests · Test doubles, and the Nest testing module**

| Time | Track | Task |
|---|---|---|
| `After Fajr + Quran` | **Engineering** | Phase 9 Chapter 5 (Testing) — the anatomy of a test, arrange/act/assert, and one behaviour per test. Write ten unit tests on the pure business logic in Project 2 — the functions with no database and no HTTP. |
| `10:00–11:00 + 16:00–16:30` | **Engineering** | Phase 9 Chapter 5 — stubs, mocks, spies and fakes, and when each is honest. Then Nest's Test.createTestingModule: build a module with your repository interface overridden by a fake. Week 25's interfaces are why this is three lines. |
| `16:30–17:00` | **Job Hunt** | Three applications, tailored, logged. |
| `21:30–22:00` | **Communication** | Rehearse: "how do you keep two writes consistent when they live in different services?" |

*Total: 4h 0m*

### Day 101 — Wednesday 30 December 2026

**Integration tests against a real database · End-to-end tests**

| Time | Track | Task |
|---|---|---|
| `After Fajr + Quran` | **Engineering** | Phase 9 Chapter 5 — integration testing. A throwaway Postgres in Docker, migrations run before the suite, clean state between tests. Test one repository properly, including the constraint violations you added in week 16. |
| `10:00–11:00 + 16:00–16:30` | **Engineering** | Phase 9 Chapter 5 — e2e with supertest against the real Nest application. Test one full journey: register, log in, create, read it back, delete it, confirm it is gone. Then test the unauthorised path for each. |
| `16:30–17:00` | **Communication** | Rehearse: "sessions or tokens?" — a candidate with a reasoned answer beats one with a preference. |
| `21:30–22:00` | **Communication** | Write a two-minute answer to "walk me through authentication in your project", including one trade-off you chose and why. |

*Total: 4h 0m*

### Day 102 — Thursday 31 December 2026

**A written testing policy · Schema, resolvers, code-first**

| Time | Track | Task |
|---|---|---|
| `After Fajr + Quran` | **Engineering** | Write TESTING.md: what gets a unit test, what gets an integration test, what gets e2e, what is not worth testing, and why. Then delete every test you wrote this week that only tests the framework. A policy you can defend is worth more than coverage. |
| `10:00–11:00 + 16:00–16:30` | **Engineering** | Phase 2 Chapter 5 (GraphQL) — the type system, queries, mutations, resolvers. Build a code-first GraphQL layer in Nest over one Project 2 module. The decorators will feel familiar now. |
| `16:30–17:00` | **Job Hunt** | Applications: one tailored application or one follow-up. Log it in TRACKER.md. |
| `21:30–22:00` | **Communication** | English speaking session with Claude: explain today's engineering work out loud as if to an interviewer, then answer two follow-up questions. Fix every grammar point it raises. |

*Total: 4h 0m*

