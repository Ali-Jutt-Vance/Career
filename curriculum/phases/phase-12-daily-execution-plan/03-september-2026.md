# Phase 12 — Chapter 3: September 2026

> **30 days · Day 15 to Day 44 · 90 scheduled hours · 4 rest days**

## Chapter Overview

This chapter covers weeks 3, 4, 5, 6, 7 of the 20-week plan. Every day below is a contract with yourself. Tick the tasks in the reader's **Plan** tab as you finish them — the app tracks your streak and completion rate across all 137 days.

| Week | Dates | Hours | Focus | Milestone |
|---|---|---|---|---|
| **W3** | 01 Sep – 07 Sep | 21h | Node.js Internals and Express in Production | You can explain the event loop phases from memory and demonstrate why one blocking handler freezes the whole server. |
| **W4** | 08 Sep – 14 Sep | 21h | REST APIs and Async Resilience | You can name the right status code for all nine situations in the REST chapter table, and explain why 404-not-403 matters. |
| **W5** | 15 Sep – 21 Sep | 21h | NestJS and Authentication — Project 1 Begins | Password auth that leaks nothing: no user enumeration on any endpoint, argon2id, constant-time comparison. |
| **W6** | 22 Sep – 28 Sep | 21h | Tokens, OAuth, and Multi-Tenancy | You can explain refresh-token rotation and reuse detection out loud, in three minutes, without notes. |
| **W7** | 29 Sep – 30 Sep | 21h | PostgreSQL and SQL to Interview Depth | You can write a window-function query and a recursive CTE from memory. |

---

## Week 3 — Node.js Internals and Express in Production

*Block II — Backend Core · 21 hours*

The reduced budget starts today: 3 hours on weekdays, 6 on Saturday, Sunday off. Less time means less breadth, not less depth — everything scheduled from here is interview-critical.

**Chapters this week:**

- [Nodejs](#phase-2-backend-engineering--nodejs)
- [Expressjs](#phase-2-backend-engineering--expressjs)
- [The Operating System](#phase-0-mission--the-operating-system)

**Deliverable:** A layered Express API skeleton: routes → controllers → services → repositories, with structured logging and one central error handler.

**Milestone:** You can explain the event loop phases from memory and demonstrate why one blocking handler freezes the whole server.

### Day 15 — Tuesday 1 September 2026

**The runtime underneath**

| Time | Track | Task |
|---|---|---|
| `05:30–07:00` | **Engineering** | Phase 2 Ch.1 Node.js — "Chapter Overview" and "Beginner Theory": libuv, the thread pool, the event loop phases. Draw the loop from memory afterwards. |
| `12:30–13:00` | **Business** | 3 Upwork proposals. Track which categories respond. |
| `21:00–22:00` | **Engineering** | Build the blocking-server demo from "Basic Examples". Hit /slow and / simultaneously and watch the fast request wait 5 seconds. This is the lesson. |

*Total: 3h 0m*

### Day 16 — Wednesday 2 September 2026

**Streams and backpressure**

| Time | Track | Task |
|---|---|---|
| `05:30–07:00` | **Engineering** | Node.js Ch.1 — streams, pipes, backpressure. Understand why `pipeline()` exists and what `.pipe()` gets wrong. |
| `12:30–13:00` | **Business** | 3 proposals. |
| `21:00–22:00` | **IELTS** | IELTS Writing Task 1: line graph, 20 min timed. Overview sentence is non-negotiable. |

*Total: 3h 0m*

### Day 17 — Thursday 3 September 2026

**Constant-memory processing**

| Time | Track | Task |
|---|---|---|
| `05:30–07:00` | **Engineering** | Node.js Ch.1 — "Intermediate Concepts": EventEmitter and custom Transform streams. |
| `12:30–13:00` | **Business** | 3 proposals. |
| `21:00–22:00` | **Engineering** | Build: a CSV→JSON transform stream that processes a 1GB file in constant memory. Prove memory stays flat with `process.memoryUsage()`. |

*Total: 3h 0m*

### Day 18 — Friday 4 September 2026

**Express architecture that survives growth**

| Time | Track | Task |
|---|---|---|
| `05:30–07:00` | **Engineering** | Phase 2 Ch.2 Express — middleware order, router composition, and the layered architecture. Middleware order is program order. |
| `12:30–13:00` | **Business** | 3 proposals. Review: any views? Any replies? |
| `21:00–22:00` | **IELTS** | IELTS Writing Task 2, 40 min timed. |

*Total: 3h 0m*

### Day 19 — Saturday 5 September 2026

**Weekend build: the API skeleton**

| Time | Track | Task |
|---|---|---|
| `08:00–11:00` | **Engineering** | Build: scaffold the layered API. Routes, controllers, services, repositories. No business logic in controllers, no `req`/`res` in services. Split `app.js` from `server.js`. |
| `11:30–13:00` | **Engineering** | Express Ch.2 — "Security" and the five Express-specific mistakes. Fix each one in your skeleton: trust proxy, body limits, error leakage, CORS allowlist, mass assignment. |
| `15:00–16:30` | **Review** | 2 LeetCode Medium. Then the Week 3 review — first week on the new budget: did 3 hours actually happen each day? |

*Total: 6h 0m*

### Day 20 — Sunday 6 September 2026 · REST

No tasks. Sunday is a genuine day off and it is part of the plan, not a gap in it. Rest is what makes the other six days sustainable for twenty weeks.

### Day 21 — Monday 7 September 2026

**Errors, logging, and the async trap**

| Time | Track | Task |
|---|---|---|
| `05:30–07:00` | **Engineering** | Express Ch.2 — the async error-handling deep dive (Q9). Understand why an unwrapped async handler hangs the request forever. |
| `12:30–13:00` | **Business** | 3 proposals. |
| `21:00–22:00` | **Engineering** | Build: the `asyncHandler` wrapper, a typed error hierarchy, one central error middleware, and request IDs propagated with AsyncLocalStorage. |

*Total: 3h 0m*

## Week 4 — REST APIs and Async Resilience

*Block II — Backend Core · 21 hours*

Two things separate a mid-level API from a senior one: a defensible resource design, and the assumption that every network call will fail.

**Chapters this week:**

- [Rest Apis](#phase-2-backend-engineering--rest-apis)
- [Asynchronous Programming](#phase-1-programming-foundations--asynchronous-programming)
- [Validation](#phase-2-backend-engineering--validation)
- [Error Handling](#phase-2-backend-engineering--error-handling)

**Deliverable:** Full CRUD with cursor pagination, idempotency keys, ETags, and correct status codes for every branch.

**Milestone:** You can name the right status code for all nine situations in the REST chapter table, and explain why 404-not-403 matters.

### Day 22 — Tuesday 8 September 2026

**Resource design and status codes**

| Time | Track | Task |
|---|---|---|
| `05:30–07:00` | **Engineering** | Phase 2 Ch.4 REST — resource modelling, status codes, the nine that people get wrong. Memorise 401 vs 403 vs 404 and why. |
| `12:30–13:00` | **Business** | 3 proposals. |
| `21:00–22:00` | **Engineering** | Build: CRUD endpoints with correct status codes on every branch, including the error paths. |

*Total: 3h 0m*

### Day 23 — Wednesday 9 September 2026

**Pagination and idempotency**

| Time | Track | Task |
|---|---|---|
| `05:30–07:00` | **Engineering** | REST Ch.4 — cursor vs offset pagination, and why offset breaks. Note the composite `(created_at, id)` detail. |
| `12:30–13:00` | **Business** | 3 proposals. |
| `21:00–22:00` | **IELTS** | IELTS Reading: one full passage, 20 min, focused on matching-headings technique. |

*Total: 3h 0m*

### Day 24 — Thursday 10 September 2026

**Idempotency and conditional requests**

| Time | Track | Task |
|---|---|---|
| `05:30–07:00` | **Engineering** | REST Ch.4 — idempotency keys, ETags, `If-None-Match`, `If-Match`, and 412 for optimistic concurrency. |
| `12:30–13:00` | **Business** | 3 proposals. |
| `21:00–22:00` | **Engineering** | Build: idempotency keys on POST with a 24h cache, and ETags on your list endpoint. Verify a 304 with curl. |

*Total: 3h 0m*

### Day 25 — Friday 11 September 2026

**Validation at the boundary**

| Time | Track | Task |
|---|---|---|
| `05:30–07:00` | **Engineering** | Phase 2 Ch.10 Validation + Ch.11 Error Handling. Operational vs programmer errors is a senior-level distinction. |
| `12:30–13:00` | **Business** | 3 proposals. |
| `21:00–22:00` | **IELTS** | IELTS Writing Task 2, 40 min timed. Different question type: discuss both views. |

*Total: 3h 0m*

### Day 26 — Saturday 12 September 2026

**Weekend build: resilience patterns**

| Time | Track | Task |
|---|---|---|
| `08:00–11:00` | **Engineering** | Phase 1 Ch.7 — build all four resilience patterns yourself: timeout with AbortController, retry with backoff AND jitter, circuit breaker, bounded concurrency. |
| `11:30–13:00` | **Engineering** | Wrap every outbound call in your API with all four. Then break a dependency deliberately and watch the breaker open. |
| `15:00–16:30` | **Review** | 2 LeetCode Medium. Week 4 review. |

*Total: 6h 0m*

### Day 27 — Sunday 13 September 2026 · REST

No tasks. Sunday is a genuine day off and it is part of the plan, not a gap in it. Rest is what makes the other six days sustainable for twenty weeks.

### Day 28 — Monday 14 September 2026

**Documentation as a contract**

| Time | Track | Task |
|---|---|---|
| `05:30–07:00` | **Engineering** | Phase 2 Ch.22 API Documentation — write the OpenAPI spec for what you have built. Generate types from it. |
| `12:30–13:00` | **Business** | 3 proposals. If 15+ sent with zero replies, stop and rewrite your positioning — not your luck. |
| `21:00–22:00` | **Engineering** | Publish `/docs` with working try-it-out and real example requests. |

*Total: 3h 0m*

## Week 5 — NestJS and Authentication — Project 1 Begins

*Block II — Backend Core · 21 hours*

Auth is where most portfolio projects quietly fail an interview. Build it properly once and be able to defend every decision.

**Chapters this week:**

- [Nestjs](#phase-2-backend-engineering--nestjs)
- [Authentication](#phase-2-backend-engineering--authentication)

**Deliverable:** PROJECT 1 starts: a multi-tenant SaaS API in NestJS with registration, login, email verification, and password reset.

**Milestone:** Password auth that leaks nothing: no user enumeration on any endpoint, argon2id, constant-time comparison.

### Day 29 — Tuesday 15 September 2026

**NestJS: modules, providers, DI**

| Time | Track | Task |
|---|---|---|
| `05:30–07:00` | **Engineering** | Phase 2 Ch.3 NestJS — modules, providers, injection scopes, lifecycle hooks. Understand why DI matters for testing, not just tidiness. |
| `12:30–13:00` | **Business** | 3 proposals. |
| `21:00–22:00` | **Engineering** | PROJECT 1 kickoff: scaffold the NestJS project. Modules: auth, users, tenants. Config validated at boot — fail fast on a missing env var. |

*Total: 3h 0m*

### Day 30 — Wednesday 16 September 2026

**Password auth done right**

| Time | Track | Task |
|---|---|---|
| `05:30–07:00` | **Engineering** | Phase 2 Ch.6 Authentication — argon2 vs bcrypt, timing attacks, account enumeration, password reset flows that cannot be abused. |
| `12:30–13:00` | **Business** | 3 proposals. |
| `21:00–22:00` | **IELTS** | IELTS Speaking Part 2 cue card, recorded. Then listen back at 1.5x and count the fillers. |

*Total: 3h 0m*

### Day 31 — Thursday 17 September 2026

**Registration and verification**

| Time | Track | Task |
|---|---|---|
| `05:30–07:00` | **Engineering** | Authentication Ch.6 — email verification and password reset token design. Single-use, short-lived, hashed at rest. |
| `12:30–13:00` | **Business** | 3 proposals. |
| `21:00–22:00` | **Engineering** | Build: registration, login, email verification. Argon2id. No endpoint reveals whether an email exists. |

*Total: 3h 0m*

### Day 32 — Friday 18 September 2026

**Reset flows and abuse cases**

| Time | Track | Task |
|---|---|---|
| `05:30–07:00` | **Engineering** | Study the abuse cases: reset token reuse, host-header poisoning in reset links, timing differences between known and unknown emails. |
| `12:30–13:00` | **Business** | 3 proposals. |
| `21:00–22:00` | **IELTS** | IELTS Writing Task 1: bar chart and table, 20 min each. |

*Total: 3h 0m*

### Day 33 — Saturday 19 September 2026

**Weekend build: attack your own auth**

| Time | Track | Task |
|---|---|---|
| `08:00–11:00` | **Engineering** | Build: password reset end to end. Then write the attack suite against it — token replay, expired token, reused token, enumeration via timing. All must fail correctly. |
| `11:30–13:00` | **Engineering** | Phase 2 Ch.12 Logging — structured JSON logs with request IDs. Log every authentication failure; you will need this for the monitoring chapter. |
| `15:00–16:30` | **Review** | 2 LeetCode Medium. Week 5 review. |

*Total: 6h 0m*

### Day 34 — Sunday 20 September 2026 · REST

No tasks. Sunday is a genuine day off and it is part of the plan, not a gap in it. Rest is what makes the other six days sustainable for twenty weeks.

### Day 35 — Monday 21 September 2026

**Guards, pipes, and interceptors**

| Time | Track | Task |
|---|---|---|
| `05:30–07:00` | **Engineering** | NestJS Ch.3 — guards, pipes, interceptors, and exception filters. Map each to the Express equivalent you already know. |
| `12:30–13:00` | **Business** | 3 proposals. |
| `21:00–22:00` | **Engineering** | Build: a global validation pipe with class-validator, and an exception filter that maps typed errors to status codes. |

*Total: 3h 0m*

## Week 6 — Tokens, OAuth, and Multi-Tenancy

*Block II — Backend Core · 21 hours*

Refresh-token rotation with reuse detection is the single most impressive thing a mid-level candidate can demonstrate. It is also genuinely hard to get right.

**Chapters this week:**

- [Jwt](#phase-2-backend-engineering--jwt)
- [Oauth](#phase-2-backend-engineering--oauth)
- [Session Management](#phase-2-backend-engineering--session-management)

**Deliverable:** Access + refresh tokens with rotation and reuse detection, Google/GitHub OAuth with PKCE, RBAC, and tenant isolation enforced at the query layer.

**Milestone:** You can explain refresh-token rotation and reuse detection out loud, in three minutes, without notes.

### Day 36 — Tuesday 22 September 2026

**JWT: what it is and what it is not**

| Time | Track | Task |
|---|---|---|
| `05:30–07:00` | **Engineering** | Phase 2 Ch.7 JWT — signing vs encryption, claims, why `alg: none` was a catastrophe, access vs refresh lifetimes. |
| `12:30–13:00` | **Business** | 3 proposals. |
| `21:00–22:00` | **Engineering** | Build: access tokens at 15 minutes, signed and verified with an explicit algorithm allowlist. Never trust the header. |

*Total: 3h 0m*

### Day 37 — Wednesday 23 September 2026

**Refresh-token rotation**

| Time | Track | Task |
|---|---|---|
| `05:30–07:00` | **Engineering** | JWT Ch.7 — rotation, token families, and reuse detection. Understand exactly what a stolen refresh token can and cannot do. |
| `12:30–13:00` | **Business** | 3 proposals. |
| `21:00–22:00` | **Engineering** | Build: refresh tokens with rotation. Store the family. On reuse of a rotated token, revoke the entire family. |

*Total: 3h 0m*

### Day 38 — Thursday 24 September 2026

**OAuth 2.0 and OIDC**

| Time | Track | Task |
|---|---|---|
| `05:30–07:00` | **Engineering** | Phase 2 Ch.8 OAuth — authorization code flow with PKCE, the `state` parameter, OAuth (authz) vs OIDC (authn). Draw the full sequence. |
| `12:30–13:00` | **Business** | 3 proposals. |
| `21:00–22:00` | **IELTS** | IELTS Speaking Part 3, recorded. Then Writing Task 2 planning practice: 5 essay outlines in 30 minutes, no full writing. |

*Total: 3h 0m*

### Day 39 — Friday 25 September 2026

**Sessions, RBAC, and tenancy**

| Time | Track | Task |
|---|---|---|
| `05:30–07:00` | **Engineering** | Phase 2 Ch.9 Sessions + the authorization models: RBAC vs ABAC vs ReBAC. Know when each is right. |
| `12:30–13:00` | **Business** | 3 proposals. |
| `21:00–22:00` | **Engineering** | Build: RBAC guards. Then tenant isolation at the QUERY layer, not the controller layer — that is how data leaks happen. |

*Total: 3h 0m*

### Day 40 — Saturday 26 September 2026

**Weekend build: OAuth and the IDOR sweep**

| Time | Track | Task |
|---|---|---|
| `08:00–11:00` | **Engineering** | Build: Google and GitHub OAuth with PKCE, plus account linking when the email already exists. |
| `11:30–13:00` | **Engineering** | Security sweep: attempt IDOR on every resource. Every lookup must include the ownership predicate in the WHERE clause, and return 404 rather than 403. |
| `15:00–16:30` | **Review** | Record yourself explaining the auth architecture in 3 minutes, no notes. Watch it back. Then the Week 6 and Block II review. |

*Total: 6h 0m*

### Day 41 — Sunday 27 September 2026 · REST

No tasks. Sunday is a genuine day off and it is part of the plan, not a gap in it. Rest is what makes the other six days sustainable for twenty weeks.

### Day 42 — Monday 28 September 2026

**Block II close-out**

| Time | Track | Task |
|---|---|---|
| `05:30–07:00` | **Engineering** | Write the Project 1 auth documentation: the flows, the token lifetimes, the revocation paths, and the trade-offs you rejected. |
| `12:30–13:00` | **Review** | Block II retrospective. Six weeks done. Is the 05:30 block actually happening, or has it migrated to the evening? |
| `21:00–22:00` | **Engineering** | 2 LeetCode Medium. Plan Block III. |

*Total: 3h 0m*

## Week 7 — PostgreSQL and SQL to Interview Depth

*Block III — Data & Delivery · 21 hours*

The highest-leverage skill for a backend senior. Most candidates know CRUD; almost none can read a query plan. That gap is your opportunity, and it is why this survived the budget cut intact.

**Chapters this week:**

- [Sql](#phase-3-databases--sql)
- [Postgresql](#phase-3-databases--postgresql)
- [Transactions](#phase-3-databases--transactions)

**Deliverable:** Project 1 on a real PostgreSQL schema with constraints and migrations, seeded with 1M+ rows for honest testing.

**Milestone:** You can write a window-function query and a recursive CTE from memory.

### Day 43 — Tuesday 29 September 2026

**SQL beyond SELECT**

| Time | Track | Task |
|---|---|---|
| `05:30–07:00` | **Engineering** | Phase 3 Ch.1 SQL — all join types, subqueries vs joins vs CTEs, and NULL three-valued logic (the part that catches everyone). |
| `12:30–13:00` | **Business** | 3 proposals. |
| `21:00–22:00` | **Engineering** | Build: seed a 1M-row dataset. Write 10 increasingly hard queries against it. Time each one. |

*Total: 3h 0m*

### Day 44 — Wednesday 30 September 2026

**Window functions**

| Time | Track | Task |
|---|---|---|
| `05:30–07:00` | **Engineering** | SQL Ch.1 — window functions: ROW_NUMBER, RANK, LAG/LEAD, running totals, frame clauses. These appear in senior SQL screens constantly. |
| `12:30–13:00` | **Business** | 3 proposals. |
| `21:00–22:00` | **Engineering** | Solve 6 analytics questions using only window functions: top-N per group, month-over-month growth, cohort retention. |

*Total: 3h 0m*

