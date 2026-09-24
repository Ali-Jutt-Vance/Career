# Phase 12 — Chapter 7: February 2027

> **28 days · Day 130 to Day 157 · 56 scheduled hours · 4 rest days**

## Chapter Overview

This chapter covers weeks 19, 20, 21, 22 of the fifty-week plan. Every day below is a contract with yourself. Tick the tasks in the reader's **Plan** tab as you finish them — the app tracks your streak and completion rate across all 353 days.

| Week | Dates | Hours | Apps | DSA | Focus | Milestone |
|---|---|---|---|---|---|---|
| **W19** | 01 Feb – 07 Feb | 14h | 5 | Sorting — custom comparators | Transactions and Concurrency — and AI Comes Back | ANCHOR — AI unlocked on Monday 1 February, as reviewer and teacher, never author. And you can describe a race condition you personally reproduced. |
| **W20** | 08 Feb – 14 Feb | 14h | 5 | Intervals — merge & overlap | ORMs — Prisma and TypeORM | You can name three things an ORM makes worse, not just three it makes better. And you can reproduce and fix an N+1 query on demand. |
| **W21** | 15 Feb – 21 Feb | 14h | 5 | Trees — DFS traversal | MongoDB and Modelling Without Joins | You can explain embedding versus referencing with a rule for choosing, and you can write an aggregation pipeline with $match, $group and $lookup from memory. |
| **W22** | 22 Feb – 28 Feb | 14h | 5 | Trees — BFS by level | Replication, Partitioning, Sharding — and the Block Close | BLOCK III CLOSES — ANCHOR: Project 1 has a complete, indexed, transactional data layer across SQL and NoSQL by Saturday 27 February. You can explain replication lag and why it breaks read-after-write. |

---

## Week 19 — Transactions and Concurrency — and AI Comes Back

*Block III — Databases · 14 hours*

Transactions separate a developer from an engineer in a backend interview. Two users buying the last item at the same moment is a question you will be asked, and the answer is not "I would check the stock first". Also: on Monday, AI returns as a reviewer.

**Chapters this week:**

- [Transactions](#phase-3-databases--transactions)
- [Small Talk And First Five Minutes](#phase-10-english-communication--small-talk-and-first-five-minutes)

**Deliverable:** week-19/ containing a demonstrated lost-update race condition and three different correct fixes, each with the SQL and a written explanation of its trade-off.

**Milestone:** ANCHOR — AI unlocked on Monday 1 February, as reviewer and teacher, never author. And you can describe a race condition you personally reproduced.

**Applications this week:** 5

**DSA drill:** Sorting — custom comparators — 3 problems

### Day 130 — Monday 1 February 2027

**AI UNLOCKED — the rules of use**

| Time | Track | Task |
|---|---|---|
| `05:00–06:30` | **Engineering** | Read the final section of Phase 0 Chapter 4 again. Then write the AI clause into your repository README: I may use AI to review, explain and check, never to author, and I must be able to explain every line here unaided. Eighteen weeks of building the muscle end today; do not undo them in a fortnight. |
| `13:00–13:30` | **Job Hunt** | Two applications, tailored, logged. |

*Total: 2h 0m*

### Day 131 — Tuesday 2 February 2027

**ACID, concretely**

| Time | Track | Task |
|---|---|---|
| `05:00–06:30` | **Engineering** | Phase 3 Chapter 6 (Transactions) — ACID. For each letter write your own example from Project 1. A definition you cannot illustrate is one you will fumble in an interview. |
| `13:00–13:30` | **Communication** | Read Phase 10 Chapter 5 (Small Talk and the First Five Minutes). Practise the first ninety seconds of a call aloud — greeting, one line about yourself, one question back. |

*Total: 2h 0m*

### Day 132 — Wednesday 3 February 2027

**Isolation levels and their anomalies**

| Time | Track | Task |
|---|---|---|
| `05:00–06:30` | **Engineering** | Phase 3 Chapter 6 — isolation levels. Dirty read, non-repeatable read, phantom read, and which level permits which. Find out what PostgreSQL actually defaults to and what that means for your code. |
| `13:00–13:30` | **Job Hunt** | Two applications, tailored, logged. |

*Total: 2h 0m*

### Day 133 — Thursday 4 February 2027

**Reproduce a race condition**

| Time | Track | Task |
|---|---|---|
| `05:00–06:30` | **Engineering** | No AI for this one — do it yourself. Open two psql sessions and deliberately produce a lost update on a Project 1 table. Watch it happen. Write down exactly what each session did and when. |
| `13:00–13:30` | **Communication** | Fifth application. Then rehearse: "how would you handle two users buying the last item at the same time?" You have now actually done it — say so. |

*Total: 2h 0m*

### Day 134 — Friday 5 February 2027

**Three ways to fix it**

| Time | Track | Task |
|---|---|---|
| `05:00–06:30` | **Engineering** | Phase 3 Chapter 6 — locking. Fix yesterday's race three ways: SELECT FOR UPDATE, an optimistic version column, and a single atomic UPDATE. Write the trade-off of each, then choose one for Project 1 and implement it. |
| `13:00–13:30` | **Job Hunt** | Check for any transaction in Project 1 that stays open across a network call. That is a production incident waiting, and finding one is a good interview story. |

*Total: 2h 0m*

### Day 135 — Saturday 6 February 2027

**Make Project 1 transaction-safe**

| Time | Track | Task |
|---|---|---|
| `08:00–10:00` | **Engineering** | Deep build, two hours: wrap every multi-step write in a proper transaction, then write a script that hammers one endpoint concurrently and prove the data stays consistent. AI may review what you wrote; it may not write it. |
| `10:30–11:30` | **Engineering** | Drill: five SQL questions including two on transactions and deadlocks, timed. No AI — the drill stays AI-free for the rest of the plan, because interviews are. |
| `12:00–13:00` | **Review** | Weekly review. Honest question: did AI creep back into authoring this week, and where? Read next week ahead. |

*Total: 4h 0m*

### Day 136 — Sunday 7 February 2027 · REST

No tasks. Sunday is a genuine day off and it is part of the plan, not a gap in it. Rest is what makes fourteen hours a week survivable for fifty straight weeks.

## Week 20 — ORMs — Prisma and TypeORM

*Block III — Databases · 14 hours*

Every team you interview with uses an ORM, and the useful answer to "why not raw SQL" is one you can only give having done both. You have written six weeks of SQL by hand; now learn what an ORM buys and what it quietly costs.

**Chapters this week:**

- [Orms](#phase-3-databases--orms)
- [Prisma](#phase-3-databases--prisma)
- [Typeorm](#phase-3-databases--typeorm)

**Deliverable:** Project 1 on Prisma, with three queries deliberately left in raw SQL and a comment on each saying why, plus a written comparison of Prisma and TypeORM from having used both.

**Milestone:** You can name three things an ORM makes worse, not just three it makes better. And you can reproduce and fix an N+1 query on demand.

**Applications this week:** 5

**DSA drill:** Intervals — merge & overlap — 4 problems

### Day 137 — Monday 8 February 2027

**What an ORM buys and costs**

| Time | Track | Task |
|---|---|---|
| `05:00–06:30` | **Engineering** | Phase 3 Chapter 12 (ORMs) — the mapping problem, leaky abstractions, and migration control. Then reproduce an N+1 query deliberately in your own project and measure it. You need to have seen it to talk about it. |
| `13:00–13:30` | **Job Hunt** | Two applications, tailored, logged. |

*Total: 2h 0m*

### Day 138 — Tuesday 9 February 2027

**Prisma — schema, client, migrations**

| Time | Track | Task |
|---|---|---|
| `05:00–06:30` | **Engineering** | Phase 3 Chapter 13 (Prisma) — schema definition, the generated client, and migrate. Express the Project 1 schema in Prisma and generate the client. Then read the SQL Prisma actually emits for three of your queries. |
| `13:00–13:30` | **Communication** | Write a ninety-second answer to "ORM or raw SQL?" that refuses the false choice and says when each. |

*Total: 2h 0m*

### Day 139 — Wednesday 10 February 2027

**TypeORM — because Nest defaults to it**

| Time | Track | Task |
|---|---|---|
| `05:00–06:30` | **Engineering** | Phase 3 Chapter 14 (TypeORM) — entities, decorators, the repository pattern, relations. Model two Project 1 entities in TypeORM on a branch. You need this specifically for the Nest block, and the decorator work from week 7 is why it will make sense. |
| `13:00–13:30` | **Job Hunt** | Two applications, tailored, logged. |

*Total: 2h 0m*

### Day 140 — Thursday 11 February 2027

**Port the data layer**

| Time | Track | Task |
|---|---|---|
| `05:00–06:30` | **Engineering** | Port Project 1's queries to Prisma. Keep three in raw SQL on purpose, where the ORM would make them worse, and comment each with the reason. AI may review; it may not write. |
| `13:00–13:30` | **Communication** | Fifth application. Then rehearse: "tell me about a time the ORM was the wrong tool." |

*Total: 2h 0m*

### Day 141 — Friday 12 February 2027

**Fix the N+1 three ways**

| Time | Track | Task |
|---|---|---|
| `05:00–06:30` | **Engineering** | Fix your N+1 with eager loading, with a single join query, and with a batched lookup. Measure all three. Then write down which you chose and why — this is a favourite interview question and you now have a real answer. |
| `13:00–13:30` | **Job Hunt** | Update the CV: Prisma and TypeORM both go on now, because you have used both. |

*Total: 2h 0m*

### Day 142 — Saturday 13 February 2027

**Raw versus ORM, measured**

| Time | Track | Task |
|---|---|---|
| `08:00–10:00` | **Engineering** | Deep build, two hours: write your three most complex Project 1 queries both ways and time both against seeded data. Write the comparison into PROJECT1.md with the numbers. |
| `10:30–11:30` | **Engineering** | Drill: five questions on ORMs, N+1 and transactions, spoken, timed. |
| `12:00–13:00` | **Review** | Weekly review. Read next week ahead — NoSQL. |

*Total: 4h 0m*

### Day 143 — Sunday 14 February 2027 · REST

No tasks. Sunday is a genuine day off and it is part of the plan, not a gap in it. Rest is what makes fourteen hours a week survivable for fifty straight weeks.

## Week 21 — MongoDB and Modelling Without Joins

*Block III — Databases · 14 hours*

NoSQL is not "SQL but easier", it is a different modelling discipline: you design around your queries instead of around your entities. Knowing when a document store is genuinely right — and saying so honestly — is worth more in an interview than knowing its syntax.

**Chapters this week:**

- [Mongodb](#phase-3-databases--mongodb)

**Deliverable:** A second copy of one Project 1 domain modelled in MongoDB, with the aggregation pipeline equivalents of three of your SQL reports, and a written argument for which store you would actually choose.

**Milestone:** You can explain embedding versus referencing with a rule for choosing, and you can write an aggregation pipeline with $match, $group and $lookup from memory.

**Applications this week:** 5

**DSA drill:** Trees — DFS traversal — 4 problems

### Day 144 — Monday 15 February 2027

**Documents, collections, and the model**

| Time | Track | Task |
|---|---|---|
| `05:00–06:30` | **Engineering** | Phase 3 Chapter 3 (MongoDB) — documents, collections, BSON, and _id. Install it, insert real data, and query it from the shell. Then write down the three things that feel wrong coming from SQL — those instincts are the lesson. |
| `13:00–13:30` | **Job Hunt** | Two applications, tailored, logged. |

*Total: 2h 0m*

### Day 145 — Tuesday 16 February 2027

**Embedding versus referencing**

| Time | Track | Task |
|---|---|---|
| `05:00–06:30` | **Engineering** | Phase 3 Chapter 3 — the central modelling decision. Embed when the data is read together and bounded; reference when it is large, shared, or grows without limit. Model one Project 1 domain both ways and write which you would ship and why. |
| `13:00–13:30` | **Communication** | Write a two-minute answer to "when would you choose MongoDB over PostgreSQL?" An honest "usually I would not, but here is when I would" is a strong answer. |

*Total: 2h 0m*

### Day 146 — Wednesday 17 February 2027

**The aggregation pipeline**

| Time | Track | Task |
|---|---|---|
| `05:00–06:30` | **Engineering** | Phase 3 Chapter 3 — aggregation. $match, $group, $project, $sort, $unwind, $lookup. Rewrite three of your SQL reports as pipelines. Notice where $lookup is painful and understand why that is the point. |
| `13:00–13:30` | **Job Hunt** | Two applications, tailored, logged. |

*Total: 2h 0m*

### Day 147 — Thursday 18 February 2027

**Indexes and the explain plan, again**

| Time | Track | Task |
|---|---|---|
| `05:00–06:30` | **Engineering** | Phase 3 Chapter 3 — indexes in MongoDB, compound index order, and explain(). Everything you learned in week 18 transfers. Prove it: index one slow pipeline and measure the difference. |
| `13:00–13:30` | **Communication** | Fifth application. Then rehearse: "how do transactions work in MongoDB?" — the honest answer includes what changed and what it costs. |

*Total: 2h 0m*

### Day 148 — Friday 19 February 2027

**Consistency, durability, and write concern**

| Time | Track | Task |
|---|---|---|
| `05:00–06:30` | **Engineering** | Phase 3 Chapter 3 — replica sets, write concern, read preference, and what "eventually consistent" means for your code. This is where NoSQL interview questions actually go, and where most candidates stop. |
| `13:00–13:30` | **Job Hunt** | Update the CV: MongoDB goes on with a sentence about the modelling work, not as a logo. |

*Total: 2h 0m*

### Day 149 — Saturday 20 February 2027

**Argue for one of them**

| Time | Track | Task |
|---|---|---|
| `08:00–10:00` | **Engineering** | Deep build, two hours: finish the MongoDB version of your domain, get the three pipelines working and indexed, then write the honest comparison in PROJECT1.md — which store, for this project, and why. |
| `10:30–11:30` | **Engineering** | Drill: five MongoDB questions, timed, plus one spoken comparison of the two stores. |
| `12:00–13:00` | **Review** | Weekly review. Read next week ahead — the last database week. |

*Total: 4h 0m*

### Day 150 — Sunday 21 February 2027 · REST

No tasks. Sunday is a genuine day off and it is part of the plan, not a gap in it. Rest is what makes fourteen hours a week survivable for fifty straight weeks.

## Week 22 — Replication, Partitioning, Sharding — and the Block Close

*Block III — Databases · 14 hours*

The scaling vocabulary. You will not shard anything this year, and you will be asked about it, because the question tests whether you understand the trade-offs rather than whether you have operated one.

**Chapters this week:**

- [Replication](#phase-3-databases--replication)
- [Partitioning](#phase-3-databases--partitioning)
- [Sharding](#phase-3-databases--sharding)
- [Database Scaling](#phase-7-system-design--database-scaling)

**Deliverable:** A working local replica of your Postgres database with reads served from it, one partitioned table with a demonstrated pruning benefit, and a written scaling path for Project 1 from one server to many.

**Milestone:** BLOCK III CLOSES — ANCHOR: Project 1 has a complete, indexed, transactional data layer across SQL and NoSQL by Saturday 27 February. You can explain replication lag and why it breaks read-after-write.

**Applications this week:** 5

**DSA drill:** Trees — BFS by level — 3 problems

### Day 151 — Monday 22 February 2027

**Replication, and the lag problem**

| Time | Track | Task |
|---|---|---|
| `05:00–06:30` | **Engineering** | Phase 3 Chapter 9 (Replication) — primary and replica, synchronous versus asynchronous, and failover. Set up a local replica. Then write to the primary, read immediately from the replica, and see stale data. That is read-after-write, and it is a real interview question. |
| `13:00–13:30` | **Job Hunt** | Two applications, tailored, logged. |

*Total: 2h 0m*

### Day 152 — Tuesday 23 February 2027

**Read replicas in application code**

| Time | Track | Task |
|---|---|---|
| `05:00–06:30` | **Engineering** | Route Project 1's reads to the replica and writes to the primary. Then find the endpoint that breaks because of lag and fix it honestly — read your own writes from the primary. Most people discover this in production. |
| `13:00–13:30` | **Communication** | Write a two-minute answer to "how would you scale reads?" that mentions lag before someone else does. |

*Total: 2h 0m*

### Day 153 — Wednesday 24 February 2027

**Partitioning**

| Time | Track | Task |
|---|---|---|
| `05:00–06:30` | **Engineering** | Phase 3 Chapter 10 (Partitioning) — range and list partitioning, and partition pruning. Partition one large Project 1 table by date, then prove with EXPLAIN that a date-filtered query touches only one partition. |
| `13:00–13:30` | **Job Hunt** | Two applications, tailored, logged. |

*Total: 2h 0m*

### Day 154 — Thursday 25 February 2027

**Sharding, and what it costs**

| Time | Track | Task |
|---|---|---|
| `05:00–06:30` | **Engineering** | Phase 3 Chapter 11 (Sharding) — shard keys, cross-shard queries, rebalancing, and why sharding is the answer of last resort. Write down what you would lose in Project 1 if you sharded it today. That list is the answer interviewers want. |
| `13:00–13:30` | **Communication** | Fifth application. Then rehearse the whole scaling ladder aloud: index, cache, replica, partition, shard — in that order, with the reason for each step. |

*Total: 2h 0m*

### Day 155 — Friday 26 February 2027

**The scaling path, written down**

| Time | Track | Task |
|---|---|---|
| `05:00–06:30` | **Engineering** | Phase 7 Chapter 7 (Database Scaling) — pull it together. Write the scaling path for Project 1 in PROJECT1.md: what you would do first, second and third as traffic grows, with the signal that would trigger each step. |
| `13:00–13:30` | **Job Hunt** | Rewrite the CV database section from scratch. You have nine weeks of real material and it should read nothing like the October version. |

*Total: 2h 0m*

### Day 156 — Saturday 27 February 2027

**BLOCK III REVIEW**

| Time | Track | Task |
|---|---|---|
| `08:00–10:00` | **Engineering** | Deep build, two hours: finish everything outstanding in the data layer. Then write the data-layer chapter of the README — schema, indexes, transactions, the NoSQL comparison, the scaling path. This document is why you get past screening calls. |
| `10:30–11:30` | **Engineering** | Block drill: ten database questions, spoken and written, timed. Compare your comfort against week 14. |
| `12:00–13:00` | **Review** | BLOCK III REVIEW. Honestly: could I hold a forty-minute database conversation with a tier-2 engineer today? Fifty-plus applications sent — what is the technical-round rate? Then read Block IV ahead — NestJS, and the framework your next job title names. |

*Total: 4h 0m*

### Day 157 — Sunday 28 February 2027 · REST

No tasks. Sunday is a genuine day off and it is part of the plan, not a gap in it. Rest is what makes fourteen hours a week survivable for fifty straight weeks.

