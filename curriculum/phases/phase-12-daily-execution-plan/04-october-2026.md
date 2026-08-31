# Phase 12 — Chapter 4: October 2026

> **31 days · Day 45 to Day 75 · 96 scheduled hours · 4 rest days**

## Chapter Overview

This chapter covers weeks 7, 8, 9, 10, 11 of the 20-week plan. Every day below is a contract with yourself. Tick the tasks in the reader's **Plan** tab as you finish them — the app tracks your streak and completion rate across all 137 days.

| Week | Dates | Hours | Focus | Milestone |
|---|---|---|---|---|
| **W7** | 01 Oct – 05 Oct | 21h | PostgreSQL and SQL to Interview Depth | You can write a window-function query and a recursive CTE from memory. |
| **W8** | 06 Oct – 12 Oct | 21h | Indexes, Query Plans — and Applications Open | APPLICATIONS OPEN — 5 tailored applications every weekday from here to the deadline. No exceptions. |
| **W9** | 13 Oct – 19 Oct | 21h | Redis, Caching, Queues, and Rate Limiting | p99 latency on your hottest endpoint cut by 10x, measured before and after. |
| **W10** | 20 Oct – 26 Oct | 21h | Docker, CI/CD — Project 1 Goes Live | A stranger can read your API docs and make a real authenticated request. |
| **W11** | 27 Oct – 31 Oct | 21h | AWS Core, and the IELTS Ramp Begins | You can draw a 3-tier VPC from memory and explain why the database sits in a private subnet. |

---

## Week 7 — PostgreSQL and SQL to Interview Depth

*Block III — Data & Delivery · 21 hours*

The highest-leverage skill for a backend senior. Most candidates know CRUD; almost none can read a query plan. That gap is your opportunity, and it is why this survived the budget cut intact.

**Chapters this week:**

- [Sql](#phase-3-databases--sql)
- [Postgresql](#phase-3-databases--postgresql)
- [Transactions](#phase-3-databases--transactions)

**Deliverable:** Project 1 on a real PostgreSQL schema with constraints and migrations, seeded with 1M+ rows for honest testing.

**Milestone:** You can write a window-function query and a recursive CTE from memory.

### Day 45 — Thursday 1 October 2026

**Recursive CTEs and PostgreSQL specifics**

| Time | Track | Task |
|---|---|---|
| `05:30–07:00` | **Engineering** | Phase 3 Ch.2 PostgreSQL — MVCC, vacuum, table bloat, JSONB, arrays, full-text search. |
| `12:30–13:00` | **Business** | 3 proposals. |
| `21:00–22:00` | **IELTS** | IELTS Reading, 20 min. Then Listening Section 4 note-completion. |

*Total: 3h 0m*

### Day 46 — Friday 2 October 2026

**Transactions and isolation**

| Time | Track | Task |
|---|---|---|
| `05:30–07:00` | **Engineering** | Phase 3 Ch.6 Transactions — ACID, the four isolation levels, and the exact anomaly each one permits. |
| `12:30–13:00` | **Business** | 3 proposals. |
| `21:00–22:00` | **Engineering** | Reproduce a lost update and a write skew yourself, in two psql sessions. Seeing it is worth more than reading it. |

*Total: 3h 0m*

### Day 47 — Saturday 3 October 2026

**Weekend build: the real schema**

| Time | Track | Task |
|---|---|---|
| `08:00–11:00` | **Engineering** | Build: redesign the Project 1 schema properly. Foreign keys, check constraints, unique partial indexes, generated columns. Migrations, not manual DDL. |
| `11:30–13:00` | **Engineering** | Build: optimistic locking with a version column, and pessimistic locking with SELECT FOR UPDATE. Cause a deadlock deliberately and read the log. |
| `15:00–16:30` | **Review** | 2 LeetCode Medium. Week 7 review. |

*Total: 6h 0m*

### Day 48 — Sunday 4 October 2026 · REST

No tasks. Sunday is a genuine day off and it is part of the plan, not a gap in it. Rest is what makes the other six days sustainable for twenty weeks.

### Day 49 — Monday 5 October 2026

**The ORM trade-off**

| Time | Track | Task |
|---|---|---|
| `05:30–07:00` | **Engineering** | Phase 3 Ch.13 Prisma + Ch.12 ORMs — migrations, the N+1 problem, and when dropping to raw SQL is correct rather than a failure. |
| `12:30–13:00` | **Business** | 3 proposals. |
| `21:00–22:00` | **Engineering** | Build: wire Prisma into Project 1. Then create an N+1 deliberately, detect it in the query log, and fix it three different ways. |

*Total: 3h 0m*

## Week 8 — Indexes, Query Plans — and Applications Open

*Block III — Data & Delivery · 21 hours*

From Tuesday, job applications are a daily habit rather than an event. Applications take 4–8 weeks to convert, and there are 12 weeks left.

**Chapters this week:**

- [Indexes](#phase-3-databases--indexes)
- [Query Optimization](#phase-3-databases--query-optimization)
- [Database Design](#phase-3-databases--database-design)

**Deliverable:** Your three slowest queries taken under 50ms, with EXPLAIN ANALYZE output before and after in the README.

**Milestone:** APPLICATIONS OPEN — 5 tailored applications every weekday from here to the deadline. No exceptions.

### Day 50 — Tuesday 6 October 2026

**How indexes actually work**

| Time | Track | Task |
|---|---|---|
| `05:30–07:00` | **Engineering** | Phase 3 Ch.7 Indexes — B-tree structure, composite column order, covering indexes, partial indexes, GIN/GiST/BRIN and when each wins. |
| `12:30–13:00` | **Job Hunt** | APPLICATIONS OPEN. 5 applications today, each tailored — the company name and one specific thing about them in the first line. |
| `21:00–22:00` | **Engineering** | For each of your 10 queries, design the optimal index. Measure before and after. |

*Total: 3h 0m*

### Day 51 — Wednesday 7 October 2026

**Reading a query plan**

| Time | Track | Task |
|---|---|---|
| `05:30–07:00` | **Engineering** | Phase 3 Ch.8 — EXPLAIN ANALYZE: seq scan vs index scan vs bitmap heap scan; nested loop vs hash join vs merge join. |
| `12:30–13:00` | **Job Hunt** | 5 applications. |
| `21:00–22:00` | **Engineering** | Read 10 real plans from your own queries. Say out loud what each node is doing before reading the row counts. |

*Total: 3h 0m*

### Day 52 — Thursday 8 October 2026

**The cost of indexes**

| Time | Track | Task |
|---|---|---|
| `05:30–07:00` | **Engineering** | Query Optimization Ch.8 — statistics, ANALYZE, planner estimates going wrong, and why an index can make a query slower. |
| `12:30–13:00` | **Job Hunt** | 5 applications. |
| `21:00–22:00` | **Engineering** | Benchmark write throughput with 0, 3, and 8 indexes on the same table. Now the trade-off is in your bones, not your notes. |

*Total: 3h 0m*

### Day 53 — Friday 9 October 2026

**Schema design and normalisation**

| Time | Track | Task |
|---|---|---|
| `05:30–07:00` | **Engineering** | Phase 3 Ch.4 Database Design + Ch.5 Normalization — 1NF to BCNF, and the specific cases where denormalising is correct. |
| `12:30–13:00` | **Job Hunt** | 5 applications. |
| `21:00–22:00` | **IELTS** | IELTS Writing Task 2, 40 min timed. |

*Total: 3h 0m*

### Day 54 — Saturday 10 October 2026

**Weekend build: make it fast**

| Time | Track | Task |
|---|---|---|
| `08:00–11:00` | **Engineering** | Take your 3 slowest queries. Get each under 50ms. Document exactly what you changed and why — this becomes a blog post and an interview story. |
| `11:30–13:00` | **Engineering** | Find and drop every index that is never used (`pg_stat_user_indexes`). Unused indexes cost write throughput for nothing. |
| `15:00–16:30` | **Review** | 2 LeetCode Medium. Week 8 review — and your first application-funnel count. |

*Total: 6h 0m*

### Day 55 — Sunday 11 October 2026 · REST

No tasks. Sunday is a genuine day off and it is part of the plan, not a gap in it. Rest is what makes the other six days sustainable for twenty weeks.

### Day 56 — Monday 12 October 2026

**Publish the result**

| Time | Track | Task |
|---|---|---|
| `05:30–07:00` | **Engineering** | Write it up: "How I took a query from Xs to Yms", with the plan before and after. |
| `12:30–13:00` | **Job Hunt** | 5 applications. |
| `21:00–22:00` | **Business** | Publish the post to LinkedIn and your repo README. Technical posts with real numbers are what get recruiters to message you first. |

*Total: 3h 0m*

## Week 9 — Redis, Caching, Queues, and Rate Limiting

*Block III — Data & Delivery · 21 hours*

Everything this week answers one question: what do you do when it gets slow? Seniors answer with measurement, not guesses.

**Chapters this week:**

- [Redis](#phase-2-backend-engineering--redis)
- [Caching](#phase-2-backend-engineering--caching)
- [Queues](#phase-2-backend-engineering--queues)
- [Rate Limiting](#phase-2-backend-engineering--rate-limiting)

**Deliverable:** Project 1 with cache-aside on the hottest endpoint, a BullMQ queue with retries and a DLQ, and distributed rate limiting.

**Milestone:** p99 latency on your hottest endpoint cut by 10x, measured before and after.

### Day 57 — Tuesday 13 October 2026

**Redis and cache strategy**

| Time | Track | Task |
|---|---|---|
| `05:30–07:00` | **Engineering** | Phase 2 Ch.18 Redis + Ch.19 Caching — cache-aside, write-through, write-behind; TTL strategy; the thundering herd. |
| `12:30–13:00` | **Job Hunt** | 5 applications. |
| `21:00–22:00` | **Engineering** | Build: cache-aside on your hottest endpoint, with a single-flight lock so a cache miss cannot stampede the database. |

*Total: 3h 0m*

### Day 58 — Wednesday 14 October 2026

**Cache invalidation**

| Time | Track | Task |
|---|---|---|
| `05:30–07:00` | **Engineering** | Caching Ch.19 — invalidation strategies, negative caching, and why cache keys need versioning. |
| `12:30–13:00` | **Job Hunt** | 5 applications. |
| `21:00–22:00` | **Engineering** | Create a stale-cache bug deliberately. Then fix it with event-driven invalidation and write it up as an incident report. |

*Total: 3h 0m*

### Day 59 — Thursday 15 October 2026

**Queues and background work**

| Time | Track | Task |
|---|---|---|
| `05:30–07:00` | **Engineering** | Phase 2 Ch.16 Queues — at-least-once vs at-most-once, idempotent consumers, dead-letter queues, backoff. |
| `12:30–13:00` | **Job Hunt** | 5 applications. |
| `21:00–22:00` | **Engineering** | Build: BullMQ for email and report generation. Retries with backoff, a DLQ, and idempotency keys so a replay cannot double-charge anyone. |

*Total: 3h 0m*

### Day 60 — Friday 16 October 2026

**Rate limiting**

| Time | Track | Task |
|---|---|---|
| `05:30–07:00` | **Engineering** | Phase 2 Ch.20 — token bucket, leaky bucket, sliding window log vs counter. Know which one you are actually implementing. |
| `12:30–13:00` | **Job Hunt** | 5 applications. |
| `21:00–22:00` | **IELTS** | IELTS Listening full mock, 40 min. Score it and categorise every error: spelling, distraction, or not-heard. |

*Total: 3h 0m*

### Day 61 — Saturday 17 October 2026

**Weekend build: measure the improvement**

| Time | Track | Task |
|---|---|---|
| `08:00–11:00` | **Engineering** | Build: a distributed sliding-window limiter in Redis using a Lua script for atomicity. Then load-test the whole system with autocannon. |
| `11:30–13:00` | **Engineering** | Document the p99 before and after every change from weeks 8 and 9. Numbers, not adjectives — this table is interview material. |
| `15:00–16:30` | **Review** | 2 LeetCode Medium. Week 9 review. |

*Total: 6h 0m*

### Day 62 — Sunday 18 October 2026 · REST

No tasks. Sunday is a genuine day off and it is part of the plan, not a gap in it. Rest is what makes the other six days sustainable for twenty weeks.

### Day 63 — Monday 19 October 2026

**Real-time, briefly**

| Time | Track | Task |
|---|---|---|
| `05:30–07:00` | **Engineering** | Phase 2 Ch.17 WebSockets — auth on the handshake, and horizontal-scale-safe pub/sub. Read only; do not build a chat app. |
| `12:30–13:00` | **Job Hunt** | 5 applications. Follow up on anything older than 10 days. |
| `21:00–22:00` | **Engineering** | Build: notifications over WebSocket with Redis pub/sub, authenticated at the handshake. Timebox to one hour — this is a nice-to-have. |

*Total: 3h 0m*

## Week 10 — Docker, CI/CD — Project 1 Goes Live

*Block III — Data & Delivery · 21 hours*

A project that is not deployed is a hobby. This week Project 1 becomes a real, publicly reachable system with a URL you can put in an application.

**Chapters this week:**

- [Docker](#phase-5-devops--docker)
- [Docker Compose](#phase-5-devops--docker-compose)
- [Github Actions](#phase-5-devops--github-actions)
- [Cicd](#phase-5-devops--cicd)
- [Nginx](#phase-5-devops--nginx)

**Deliverable:** PROJECT 1 LIVE at a public HTTPS URL, auto-deploying on every push to main, with rollback.

**Milestone:** A stranger can read your API docs and make a real authenticated request.

### Day 64 — Tuesday 20 October 2026

**Docker images that are not 1.2GB**

| Time | Track | Task |
|---|---|---|
| `05:30–07:00` | **Engineering** | Phase 5 Ch.3 Docker — layers, build cache, multi-stage builds, and the security rules: non-root, read-only rootfs, dropped capabilities. |
| `12:30–13:00` | **Job Hunt** | 5 applications. |
| `21:00–22:00` | **Engineering** | Build: containerise Project 1. Target under 150MB, non-root, healthcheck, correct signal handling for graceful shutdown. |

*Total: 3h 0m*

### Day 65 — Wednesday 21 October 2026

**The full local stack**

| Time | Track | Task |
|---|---|---|
| `05:30–07:00` | **Engineering** | Phase 5 Ch.4 Compose — service dependencies, healthcheck gating, named volumes, network isolation. |
| `12:30–13:00` | **Job Hunt** | 5 applications. |
| `21:00–22:00` | **Engineering** | Build: one `docker compose up` brings up API + Postgres + Redis + worker, seeded and ready. This is what a new teammate would need. |

*Total: 3h 0m*

### Day 66 — Thursday 22 October 2026

**CI/CD you would trust**

| Time | Track | Task |
|---|---|---|
| `05:30–07:00` | **Engineering** | Phase 5 Ch.6 GitHub Actions + Ch.7 CI/CD — stages, caching, matrix builds, environments, secrets, deployment strategies. |
| `12:30–13:00` | **Job Hunt** | 5 applications. |
| `21:00–22:00` | **Engineering** | Build: lint → typecheck → unit → integration → build image → push. Get it green. |

*Total: 3h 0m*

### Day 67 — Friday 23 October 2026

**The edge: Nginx and TLS**

| Time | Track | Task |
|---|---|---|
| `05:30–07:00` | **Engineering** | Phase 5 Ch.5 Nginx + Ch.11 SSL — TLS termination, HTTP/2, proxy headers, and why X-Forwarded-For needs care. |
| `12:30–13:00` | **Job Hunt** | 5 applications. |
| `21:00–22:00` | **IELTS** | IELTS Writing Task 1 and Task 2, 20 + 40 min, back to back under exam timing. |

*Total: 3h 0m*

### Day 68 — Saturday 24 October 2026

**Weekend: ship it**

| Time | Track | Task |
|---|---|---|
| `08:00–11:00` | **Engineering** | Deploy Project 1 to a real host. Public HTTPS URL, custom domain, real certificate, working end to end. Do not stop until a stranger could use it. |
| `11:30–13:00` | **Engineering** | Finish the pipeline: deploy on push to main, smoke test after deploy, automatic rollback on failure. Then write the case-study README — problem, architecture, trade-offs, the latency numbers. |
| `15:00–16:30` | **Review** | Week 10 and Block III review. Project 1 is LIVE — add it to your résumé, Upwork portfolio, and LinkedIn featured section tonight. |

*Total: 6h 0m*

### Day 69 — Sunday 25 October 2026 · REST

No tasks. Sunday is a genuine day off and it is part of the plan, not a gap in it. Rest is what makes the other six days sustainable for twenty weeks.

### Day 70 — Monday 26 October 2026

**Tell people it exists**

| Time | Track | Task |
|---|---|---|
| `05:30–07:00` | **Engineering** | Draw the architecture diagram. Every arrow labelled with the protocol and the auth mechanism. |
| `12:30–13:00` | **Job Hunt** | 5 applications — and update every earlier application's follow-up with the live link. |
| `21:00–22:00` | **Business** | LinkedIn launch post: the diagram, the live link, the latency numbers. This is your first real signal to the market. |

*Total: 3h 0m*

## Week 11 — AWS Core, and the IELTS Ramp Begins

*Block IV — Cloud, Design & the Exam · 21 hours*

Cloud fluency is what moves you from mid to senior on the salary band. Meanwhile the exam is three weeks out, so IELTS takes the evening slots from here.

**Chapters this week:**

- [Iam](#phase-6-cloud--iam)
- [Vpc](#phase-6-cloud--vpc)
- [Ecs](#phase-6-cloud--ecs)
- [Rds](#phase-6-cloud--rds)
- [S3](#phase-6-cloud--s3)

**Deliverable:** Project 1 re-deployed on AWS: ECS Fargate, RDS PostgreSQL, S3, ALB, CloudWatch alarms.

**Milestone:** You can draw a 3-tier VPC from memory and explain why the database sits in a private subnet.

### Day 71 — Tuesday 27 October 2026

**IAM and the security model**

| Time | Track | Task |
|---|---|---|
| `05:30–07:00` | **Engineering** | Phase 6 Ch.2 IAM — policy evaluation logic, roles vs users, assume-role, instance profiles, least privilege in practice. |
| `12:30–13:00` | **Job Hunt** | 5 applications. |
| `21:00–22:00` | **Engineering** | Build: harden the AWS account. Root locked with MFA, admin via IAM Identity Center, billing alarms, CloudTrail on. |

*Total: 3h 0m*

### Day 72 — Wednesday 28 October 2026

**VPC and the network**

| Time | Track | Task |
|---|---|---|
| `05:30–07:00` | **Engineering** | Phase 6 Ch.7 VPC — subnets, route tables, IGW vs NAT, security groups vs NACLs. Draw a 3-tier VPC from memory afterwards. |
| `12:30–13:00` | **Job Hunt** | 5 applications. |
| `21:00–22:00` | **IELTS** | IELTS Reading full test, 60 min. Then a time audit: which passage cost you the most, and why. |

*Total: 3h 0m*

### Day 73 — Thursday 29 October 2026

**Compute and managed data**

| Time | Track | Task |
|---|---|---|
| `05:30–07:00` | **Engineering** | Phase 6 Ch.12 ECS + Ch.5 RDS — Fargate vs EC2 launch type; Multi-AZ vs read replicas; automated backups and PITR. |
| `12:30–13:00` | **Job Hunt** | 5 applications. |
| `21:00–22:00` | **Engineering** | Build: VPC with public and private subnets across two AZs, correctly scoped security groups. |

*Total: 3h 0m*

### Day 74 — Friday 30 October 2026

**Storage and secrets**

| Time | Track | Task |
|---|---|---|
| `05:30–07:00` | **Engineering** | Phase 6 Ch.4 S3 + Ch.16 Secrets Manager — storage classes, lifecycle rules, presigned URLs, bucket policies. |
| `12:30–13:00` | **Job Hunt** | 5 applications. |
| `21:00–22:00` | **IELTS** | IELTS Writing Task 2, 40 min. Then rewrite the weakest paragraph, improving only grammatical range. |

*Total: 3h 0m*

### Day 75 — Saturday 31 October 2026

**Weekend build: Project 1 on AWS**

| Time | Track | Task |
|---|---|---|
| `08:00–11:00` | **Engineering** | Build: Project 1 on ECS Fargate behind an ALB. RDS PostgreSQL Multi-AZ in private subnets. Secrets in Secrets Manager, never in env files. |
| `11:30–13:00` | **Engineering** | Build: CloudWatch dashboards for the four golden signals, with alarms into email. Then price the architecture and cut it by a third. |
| `15:00–16:30` | **Review** | Week 11 review. Draw the full AWS architecture diagram and add it to the README. |

*Total: 6h 0m*

