# Phase 12 — Chapter 4: November 2026

> **30 days · Day 42 to Day 71 · 129 scheduled hours**

## Chapter Overview

This chapter covers weeks 6, 7, 8, 9, 10, 11 of the 27-week plan. Every day below is a contract with yourself. Tick the tasks in the reader's **Plan** tab as you finish them — the app tracks your streak and completion rate across all 188 days.

| Week | Dates | Hours | Apps | DSA | Focus | Milestone |
|---|---|---|---|---|---|---|
| **W6** | 01 Nov – 01 Nov | 30h | 6 | Sliding window — variable size → Strings — parsing & building | The Node Runtime — Modules, npm, Process + Node Internals — Event Loop Phases, Streams, Buffers | You can explain module resolution, the difference between CommonJS and ESM, and what an unhandled rejection does to a Node process. · AND: You can name the event loop phases in order, explain what runs in the thread pool and what does not, and demonstrate backpressure with code you wrote. |
| **W7** | 02 Nov – 08 Nov | 30h | 6 | Strings — anagrams & palindromes → Prefix sums | Express — Routing, Middleware, the Request Lifecycle + REST API Design a Reviewer Would Approve | You can draw the path of a request through an Express app from memory, including where errors go and why middleware order is not cosmetic. · AND: You can defend every status code your API returns, and explain cursor versus offset pagination and when each breaks. |
| **W8** | 09 Nov – 15 Nov | 30h | 8 | Matrix traversal → Stacks — monotonic & matching | Validation, Error Handling, Logging + Deploy It — The API Goes Public | You can trace a single request end to end through your logs by its id, and you can explain the difference between an operational error and a programmer error. · AND: ANCHOR — the API is reachable from the public internet on Saturday 15 November. Application quota rises to five a week because the CV now points at something running. |
| **W9** | 16 Nov – 22 Nov | 30h | 10 | Queues & deques → Linked lists — traversal & reversal | SQL I — Selects, Joins, Thinking in Sets + SQL II — Window Functions and the Hard Queries | You can write a three-table join with grouping and a having clause from a blank editor, first try, without looking up the syntax. · AND: You can produce a per-group top-N query and a running total with a window function, from memory, and explain what the frame clause does. |
| **W10** | 23 Nov – 29 Nov | 30h | 10 | Linked lists — cycle & merge → Binary search — exact match | Schema Design and Normalization + PostgreSQL in Depth | Given a described business problem you can produce a normalised schema on paper in twenty minutes and defend each decision. · AND: You can use psql without a GUI, and you can explain why timestamptz and numeric exist and what goes wrong without them. |
| **W11** | 30 Nov – 30 Nov | 30h | 10 | Binary search — on the answer → Sorting — custom comparators | Indexes and Query Plans + Transactions and Concurrency — and AI Comes Back | You can read an EXPLAIN ANALYZE plan, say which line is the problem, and predict whether an index will help before you create it. · AND: ANCHOR — AI unlocked on Monday 1 December, as reviewer and teacher, never author. And you can describe a race condition you personally reproduced. |

---

## Week 6 — The Node Runtime — Modules, npm, Process + Node Internals — Event Loop Phases, Streams, Buffers

*Block II — Node and Express · 30 hours*

You have written server code for three years without knowing what the runtime does. This week is modules, resolution, the standard library and the process itself — the ground everything else stands on.

The week that separates you from every other candidate who says "Node is non-blocking" and cannot go further. Libuv phases, the thread pool, streams and backpressure, and what a Buffer actually is.

**Chapters this week:**

- [Nodejs](#phase-2-backend-engineering--nodejs)
- [Explaining Technical Work](#phase-10-english-communication--explaining-technical-work)
- [Asynchronous Programming](#phase-1-programming-foundations--asynchronous-programming)

**Deliverable:** week-08/ containing a three-module project built by hand in both CommonJS and ESM, a directory-walker using fs and path correctly, and a script that fails properly with a non-zero exit code. · ALSO: week-09/ containing a measured demonstration of a blocked event loop, a stream pipeline that processes a file larger than memory, and a written explanation of backpressure in your own words.

**Milestone:** You can explain module resolution, the difference between CommonJS and ESM, and what an unhandled rejection does to a Node process. · AND: You can name the event loop phases in order, explain what runs in the thread pool and what does not, and demonstrate backpressure with code you wrote.

**Applications this week:** 6

**DSA drill:** Sliding window — variable size → Strings — parsing & building — 7 problems

### Day 42 — Sunday 1 November 2026

**A transform pipeline**

| Time | Track | Task |
|---|---|---|
| `10:00–12:00` | **Engineering** | Deep build, two hours, no AI: a three-stage stream pipeline — read, transform, write — with a custom Transform stream you wrote, correct error propagation, and a progress report. Run it on a file larger than your available memory. |
| `12:30–13:30` | **Engineering** | Drill: three problems, timed. Then explain the event loop phases aloud from memory, in order. |
| `14:00–15:00` | **Review** | Weekly review. Read next week ahead. |
| `15:30–16:00` | **Job Hunt** | Update the CV bullet for Node with something specific from this week — streams, or the thread pool measurement. |
| `16:00–16:30` | **Job Hunt** | One application, tailored, logged. |

*Total: 5h 0m*

## Week 7 — Express — Routing, Middleware, the Request Lifecycle + REST API Design a Reviewer Would Approve

*Block II — Node and Express · 30 hours*

Express is small enough to understand completely, and understanding it completely is what lets you answer the most common backend interview question at this level: what happens between the request arriving and the response leaving.

Anyone can make an endpoint return JSON. This week is the decisions a reviewer looks at: resource naming, status codes, pagination, filtering, idempotency, versioning, and what your API does when the client sends nonsense.

**Chapters this week:**

- [Expressjs](#phase-2-backend-engineering--expressjs)
- [Agile Scrum](#phase-9-software-engineering--agile-scrum)
- [Projects That Prove Three Years](#phase-11-job-hunt-pakistan--projects-that-prove-three-years)
- [Rest Apis](#phase-2-backend-engineering--rest-apis)
- [Api Versioning](#phase-2-backend-engineering--api-versioning)
- [Api Documentation](#phase-2-backend-engineering--api-documentation)
- [Written English At Work](#phase-10-english-communication--written-english-at-work)

**Deliverable:** week-10/ containing an Express server with a hand-written middleware stack — request id, logging, timing, body limit, auth check, central error handler — every one written by you, and a diagram of the request lifecycle drawn by you. · ALSO: The Project 1 API with two resources, full CRUD, pagination, filtering, a single documented error shape, and an OpenAPI document that matches the implementation.

**Milestone:** You can draw the path of a request through an Express app from memory, including where errors go and why middleware order is not cosmetic. · AND: You can defend every status code your API returns, and explain cursor versus offset pagination and when each breaks.

**Applications this week:** 6

**DSA drill:** Strings — anagrams & palindromes → Prefix sums — 6 problems

### Day 43 — Monday 2 November 2026

**Parsing, headers, status codes · Choose Project 1**

| Time | Track | Task |
|---|---|---|
| `After Fajr + Quran` | **Engineering** | Phase 2 Chapter 2 — body parsing, content types, headers, and status codes that mean what they say. Learn when 400, 401, 403, 404, 409 and 422 are each correct, and set a body size limit before someone finds out you did not. |
| `10:00–11:00 + 16:00–16:30` | **Engineering** | Choose PROJECT 1 and write its scope in one paragraph in PROJECT1.md. It must be a backend you would actually use, small enough to finish, and large enough to need auth, relationships, search and background work. You will carry it for fifteen weeks and rebuild it in Nest in week 23. |
| `16:30–17:00` | **Job Hunt** | Read Phase 9 Chapter 1 (Agile and Scrum). Write how your current team actually works, honestly, and what you would change. You will be asked. |
| `21:30–22:00` | **Communication** | Write a ninety-second spoken answer to "what does it mean that Node is single-threaded?" that is accurate, including the part where it is not. |

*Total: 4h 0m*

### Day 44 — Tuesday 3 November 2026

**Resources, verbs, naming · Status codes and one error shape**

| Time | Track | Task |
|---|---|---|
| `After Fajr + Quran` | **Engineering** | Phase 2 Chapter 4 (REST APIs) — resources, naming, HTTP verbs, and what "RESTful" actually commits you to. Design the full route table for Project 1 on paper before writing any of it. |
| `10:00–11:00 + 16:00–16:30` | **Engineering** | Phase 2 Chapter 4 — status codes and error responses. No AI: define your API's error shape once, in writing, then implement it so every error from every endpoint uses it. Consistency here is a reviewer's first impression. |
| `16:30–17:00` | **Job Hunt** | Third application, tailored, logged. |
| `21:30–22:00` | **Communication** | Third application. Then explain backpressure aloud in two minutes using what you just watched happen. |

*Total: 4h 0m*

### Day 45 — Wednesday 4 November 2026

**Pagination, filtering, sorting · Idempotency and versioning**

| Time | Track | Task |
|---|---|---|
| `After Fajr + Quran` | **Engineering** | Phase 2 Chapter 4 — pagination and query design. Offset versus cursor, and why offset pagination gets slower on every page. No AI: implement offset pagination with a maximum page size, then write down what you would change at a million rows. |
| `10:00–11:00 + 16:00–16:30` | **Engineering** | Phase 2 Chapter 4 and Chapter 21 (API Versioning) — idempotency, PUT versus PATCH, and versioning strategies. Write in PROJECT1.md which versioning approach you chose and why. An interviewer will ask, and "I did not think about it" is a real answer people give. |
| `16:30–17:00` | **Communication** | Write the one-paragraph description of Project 1 for your CV — present tense, specific, no adjectives. |
| `21:30–22:00` | **Communication** | Second application. Then write a ninety-second answer to "walk me through what happens when a request hits your server". |

*Total: 4h 0m*

### Day 46 — Thursday 5 November 2026

**Document the API · Validate at the boundary**

| Time | Track | Task |
|---|---|---|
| `After Fajr + Quran` | **Engineering** | Phase 2 Chapter 22 (API Documentation). Document every endpoint by hand first — method, path, parameters, request, response, errors — so you understand the shape. Then generate an OpenAPI document and make it match the implementation exactly. |
| `10:00–11:00 + 16:00–16:30` | **Engineering** | Phase 2 Chapter 10 (Validation) — schema validation at the edge, and why validating inside the handler is already too late. No AI: add schema validation to every endpoint that accepts a body or a query parameter, and return your standard error shape on failure. |
| `16:30–17:00` | **Job Hunt** | Applications: one tailored application or one follow-up. Log it in TRACKER.md. |
| `21:30–22:00` | **Communication** | English speaking session with Claude: explain today's engineering work out loud as if to an interviewer, then answer two follow-up questions. Fix every grammar point it raises. |

*Total: 4h 0m*

### Day 47 — Friday 6 November 2026

**Types and validators should agree · An error taxonomy, not a pile of try/catch**

| Time | Track | Task |
|---|---|---|
| `After Fajr + Quran` | **Engineering** | Derive your TypeScript types from your validation schemas so they cannot drift apart. Then deliberately change a schema and watch the compiler find every place that assumed the old shape. This is the payoff for week 7. |
| `10:00–11:00 + 16:00–16:30` | **Engineering** | Phase 2 Chapter 11 (Error Handling) — operational versus programmer errors, custom error classes, and the boundary where an internal error becomes an HTTP response. No AI: refactor Project 1 onto one taxonomy with a base error class. |
| `16:30–17:00` | **Job Hunt** | Applications: one tailored application or one follow-up. Log it in TRACKER.md. |
| `21:30–22:00` | **Communication** | English speaking session with Claude: explain today's engineering work out loud as if to an interviewer, then answer two follow-up questions. Fix every grammar point it raises. |

*Total: 4h 0m*

### Day 48 — Saturday 7 November 2026

**Build the middleware stack**

| Time | Track | Task |
|---|---|---|
| `10:00–12:00` | **Engineering** | Deep build, two hours, no AI: the Project 1 skeleton with a full hand-written middleware stack — request id, logging, timing, body limit, fake auth check, central error handler — each with a comment saying why it sits where it does. |
| `12:30–13:30` | **Engineering** | Drill: draw the Express request lifecycle from memory on paper. Then three LeetCode problems, timed. |
| `14:00–15:00` | **Review** | Weekly review. Read next week ahead. |
| `15:30–16:00` | **Job Hunt** | One application, tailored, logged. |
| `16:00–16:30` | **Job Hunt** | Second application, tailored, logged. |

*Total: 5h 0m*

### Day 49 — Sunday 8 November 2026

**Build the API**

| Time | Track | Task |
|---|---|---|
| `10:00–12:00` | **Engineering** | Deep build, two hours, no AI: Project 1 with two resources, full CRUD, pagination, filtering, consistent errors, in-memory storage. The database arrives in Block III; the shape is what matters today. |
| `12:30–13:30` | **Engineering** | Drill: three problems, timed, then explain one solution aloud as if to an interviewer. |
| `14:00–15:00` | **Review** | Weekly review. Read next week ahead. |
| `15:30–16:00` | **Job Hunt** | Put the Project 1 repository link on your CV and LinkedIn now, even though it is not deployed. It is real and it is readable. |
| `16:00–16:30` | **Job Hunt** | One application, tailored, logged. |

*Total: 5h 0m*

## Week 8 — Validation, Error Handling, Logging + Deploy It — The API Goes Public

*Block II — Node and Express · 30 hours*

The unglamorous week that separates a project that looks like a tutorial from one that looks like production. None of it is hard and all of it is visible to a reviewer within thirty seconds of opening your repository.

A deployed thing you can link to changes every conversation you have from here on. It is not finished and that is the point: deploy early, deploy badly, learn what breaks, and then have a URL on your CV for the remaining thirty-seven weeks.

**Chapters this week:**

- [Validation](#phase-2-backend-engineering--validation)
- [Error Handling](#phase-2-backend-engineering--error-handling)
- [Logging](#phase-2-backend-engineering--logging)
- [Api Documentation](#phase-2-backend-engineering--api-documentation)
- [Referrals And Recruiters](#phase-11-job-hunt-pakistan--referrals-and-recruiters)

**Deliverable:** Project 1 with schema validation on every input, a real error taxonomy with custom error classes, and structured logging where a request id flows through every log line for one request. · ALSO: PROJECT 1 API DEPLOYED at a public URL over HTTPS, with a health check, environment-based configuration, and a README a stranger can follow.

**Milestone:** You can trace a single request end to end through your logs by its id, and you can explain the difference between an operational error and a programmer error. · AND: ANCHOR — the API is reachable from the public internet on Saturday 15 November. Application quota rises to five a week because the CV now points at something running.

**Applications this week:** 8

**DSA drill:** Matrix traversal → Stacks — monotonic & matching — 7 problems

### Day 50 — Monday 9 November 2026

**Structured logging and request ids · Async context, so ids flow by themselves**

| Time | Track | Task |
|---|---|---|
| `After Fajr + Quran` | **Engineering** | Phase 2 Chapter 12 (Logging) — structured logs, levels, request ids, and what must never be logged (passwords, tokens, personal data). No AI: add a request id that flows through every log line, then trace one request end to end. |
| `10:00–11:00 + 16:00–16:30` | **Engineering** | Use AsyncLocalStorage so the request id reaches your logger without being passed through every function signature. Understand what it is doing before you use it — this is a genuinely advanced Node feature and a strong interview talking point. |
| `16:30–17:00` | **Job Hunt** | Second application, tailored, logged. |
| `21:30–22:00` | **Communication** | Read Phase 10 Chapter 4 (Written English at Work). Write the Project 1 README — what it is, why it exists, how to run it. Three paragraphs, no filler. |

*Total: 4h 0m*

### Day 51 — Tuesday 10 November 2026

**Configuration and secrets · Health checks and readiness**

| Time | Track | Task |
|---|---|---|
| `After Fajr + Quran` | **Engineering** | Make Project 1 deployable: every secret and every environment difference in environment variables, validated at startup so the process refuses to boot with a missing one. Then check your git history for anything you committed earlier and deal with it honestly. |
| `10:00–11:00 + 16:00–16:30` | **Engineering** | Add a health endpoint that actually verifies the dependencies — not one that returns 200 unconditionally. Learn the difference between liveness and readiness, because it will matter in week 41 when this runs on ECS. |
| `16:30–17:00` | **Job Hunt** | Check APPLICATIONS.md. Anything with no reply after fourteen days is dead — mark it and move on. Do not chase twice. |
| `21:30–22:00` | **Communication** | Third application. Then rehearse the answer to "how would you version a breaking change without breaking existing clients?" |

*Total: 4h 0m*

### Day 52 — Wednesday 11 November 2026

**Pick a host and read its documentation · Graceful shutdown**

| Time | Track | Task |
|---|---|---|
| `After Fajr + Quran` | **Engineering** | Choose a host, create the account, and read its Node deployment documentation end to end before writing anything. Then write your deployment steps down as a checklist. AWS comes in Block VII; today you want it live, not perfect. |
| `10:00–11:00 + 16:00–16:30` | **Engineering** | Handle SIGTERM: stop accepting connections, finish in-flight requests, close resources, exit zero. Then test it by deploying while making requests and proving nothing was dropped. Most candidates have never thought about this. |
| `16:30–17:00` | **Communication** | Third application. Then rehearse: "a user reports an error from yesterday and gives you a timestamp. What do you do?" |
| `21:30–22:00` | **Communication** | Write five sentences on what your API does when something goes wrong. If the honest answer is "returns 500", that is this week's work. |

*Total: 4h 0m*

### Day 53 — Thursday 12 November 2026

**Deployment rehearsal · Build the practice ground**

| Time | Track | Task |
|---|---|---|
| `After Fajr + Quran` | **Engineering** | Rehearse the whole deployment locally against a production-style configuration. Write down every step. It will still fail on Saturday, but it will fail for a reason you can find. |
| `10:00–11:00 + 16:00–16:30` | **Engineering** | Install PostgreSQL locally. Create a practice database with five related tables — customers, orders, order_items, products, categories — and seed a few thousand rows with a script you write yourself. This database is your practice ground for nine weeks. |
| `16:30–17:00` | **Job Hunt** | Applications: one tailored application or one follow-up. Log it in TRACKER.md. |
| `21:30–22:00` | **Communication** | English speaking session with Claude: explain today's engineering work out loud as if to an interviewer, then answer two follow-up questions. Fix every grammar point it raises. |

*Total: 4h 0m*

### Day 54 — Friday 13 November 2026

**SELECT, WHERE, and NULL · Joins — all of them, deliberately**

| Time | Track | Task |
|---|---|---|
| `After Fajr + Quran` | **Engineering** | Phase 3 Chapter 1 (SQL) — selection and filtering. Ten exercises by hand. Pay real attention to NULL: why NULL = NULL is not true, what that breaks in a WHERE clause, and why COUNT(column) and COUNT(*) disagree. |
| `10:00–11:00 + 16:00–16:30` | **Engineering** | Phase 3 Chapter 1 — joins. Inner, left, right, full, cross, self. Ten exercises. For each, predict the row count before running it. The prediction is the exercise, not the query. |
| `16:30–17:00` | **Job Hunt** | Applications: one tailored application or one follow-up. Log it in TRACKER.md. |
| `21:30–22:00` | **Communication** | English speaking session with Claude: explain today's engineering work out loud as if to an interviewer, then answer two follow-up questions. Fix every grammar point it raises. |

*Total: 4h 0m*

### Day 55 — Saturday 14 November 2026

**Harden the whole API**

| Time | Track | Task |
|---|---|---|
| `10:00–12:00` | **Engineering** | Deep build, two hours, no AI: every endpoint validated, every error on the taxonomy, every log line carrying a request id. Then send ten deliberately malformed requests and confirm every one returns a correct, useful, non-leaking response. |
| `12:30–13:30` | **Engineering** | Drill: three problems, timed. Then explain your error taxonomy aloud in two minutes. |
| `14:00–15:00` | **Review** | Weekly review. Next week the API goes live. Write the deployment checklist tonight. Read next week ahead. |
| `15:30–16:00` | **Job Hunt** | Two applications, tailored, logged. The quota rises to five a week from today. |
| `16:00–16:30` | **Job Hunt** | Two applications, tailored, logged. |

*Total: 5h 0m*

### Day 56 — Sunday 15 November 2026

**ANCHOR — the API goes live**

| Time | Track | Task |
|---|---|---|
| `10:00–12:00` | **Engineering** | Deep build, two hours, no AI: DEPLOY. Public URL, HTTPS, environment variables set, health check answering. It will not work the first time. That is the exercise. |
| `12:30–13:30` | **Engineering** | Verify from outside: call every endpoint from your phone on mobile data. Then put the URL in the README, on the CV, and on LinkedIn. |
| `14:00–15:00` | **Review** | Weekly review. Write in LOG.md exactly what broke during the deploy and what you learned from each failure. That list is an interview answer. Read next week ahead — databases, and the most important nine weeks in this plan. |
| `15:30–16:00` | **Job Hunt** | Fifth application of the week. Then prepare the CV line you will use once the URL is live. |
| `16:00–16:30` | **Job Hunt** | Two applications, tailored, logged. |

*Total: 5h 0m*

## Week 9 — SQL I — Selects, Joins, Thinking in Sets + SQL II — Window Functions and the Hard Queries

*Block III — Databases · 30 hours*

You have written SQL for three years and most of it was generated. SQL is the highest-return subject in this book: asked in almost every interview, testable in fifteen minutes, and being genuinely good at it is rare enough to be a differentiator.

The second SQL week, and the one that makes you unusual. Window functions are asked at tier 2, rarely known at tier 4, and they turn a category of "impossible without application code" questions into four lines.

**Chapters this week:**

- [Sql](#phase-3-databases--sql)
- [Query Optimization](#phase-3-databases--query-optimization)

**Deliverable:** A seeded PostgreSQL practice database of five related tables and a few thousand rows, plus forty solved exercises written by hand with no AI and no copied answers. · ALSO: week-15/ containing thirty more solved exercises covering window functions, ranking, running totals, gaps and islands, and set operations.

**Milestone:** You can write a three-table join with grouping and a having clause from a blank editor, first try, without looking up the syntax. · AND: You can produce a per-group top-N query and a running total with a window function, from memory, and explain what the frame clause does.

**Applications this week:** 10

**DSA drill:** Queues & deques → Linked lists — traversal & reversal — 7 problems

### Day 57 — Monday 16 November 2026

**Aggregation and grouping · Subqueries and CTEs**

| Time | Track | Task |
|---|---|---|
| `After Fajr + Quran` | **Engineering** | Phase 3 Chapter 1 — GROUP BY, aggregates, HAVING. Ten exercises, at least three needing a join and a group together. That combination is the classic interview question. |
| `10:00–11:00 + 16:00–16:30` | **Engineering** | Phase 3 Chapter 1 — subqueries, correlated subqueries, and common table expressions. Ten exercises. Rewrite three of them both ways and note which reads better and why. |
| `16:30–17:00` | **Job Hunt** | Two applications, tailored, logged. |
| `21:30–22:00` | **Communication** | Read Phase 11 Chapter 4 (Referrals and Recruiters). List five people you already know who work at a target company. |

*Total: 4h 0m*

### Day 58 — Tuesday 17 November 2026

**Window functions — the model · Ranking and per-group top-N**

| Time | Track | Task |
|---|---|---|
| `After Fajr + Quran` | **Engineering** | Phase 3 Chapter 1 — window functions. OVER, PARTITION BY, ORDER BY, and how a window differs from a GROUP BY: the rows stay. Six exercises. Say the difference out loud before you move on. |
| `10:00–11:00 + 16:00–16:30` | **Engineering** | ROW_NUMBER, RANK, DENSE_RANK, and the per-group top-N pattern. Six exercises. This exact question — "the three biggest orders for each customer" — is asked constantly and beats most candidates. |
| `16:30–17:00` | **Job Hunt** | Update the CV: PostgreSQL moves from a listed skill to a sentence about what you did with it. |
| `21:30–22:00` | **Communication** | Message one referral contact — no ask in the first message, just a real reconnection. |

*Total: 4h 0m*

### Day 59 — Wednesday 18 November 2026

**Running totals and frames · Set operations and gaps**

| Time | Track | Task |
|---|---|---|
| `After Fajr + Quran` | **Engineering** | Running totals, moving averages, LAG and LEAD, and the frame clause (ROWS versus RANGE). Six exercises. The frame clause is where people who half-know window functions come unstuck. |
| `10:00–11:00 + 16:00–16:30` | **Engineering** | UNION versus UNION ALL, INTERSECT, EXCEPT, and the gaps-and-islands pattern for finding missing sequences and consecutive runs. Six exercises. |
| `16:30–17:00` | **Communication** | Fifth application. Then write the three SQL questions you would ask about your practice schema if you were interviewing yourself. |
| `21:30–22:00` | **Communication** | Write the difference between WHERE and HAVING in three sentences, as if explaining to a junior. |

*Total: 4h 0m*

### Day 60 — Thursday 19 November 2026

**Rewrite your own queries · Entities, relationships, keys**

| Time | Track | Task |
|---|---|---|
| `After Fajr + Quran` | **Engineering** | Six exercises against your Project 1 data. Then find two places in Project 1 where you pulled rows into Node and looped over them, and replace each with one query. Write down how many round trips you removed. |
| `10:00–11:00 + 16:00–16:30` | **Engineering** | Phase 3 Chapter 4 (Database Design) — entities, relationships, primary and foreign keys, one-to-many and many-to-many. Redesign the Project 1 schema on paper before touching a migration file. |
| `16:30–17:00` | **Job Hunt** | Applications: one tailored application or one follow-up. Log it in TRACKER.md. |
| `21:30–22:00` | **Communication** | English speaking session with Claude: explain today's engineering work out loud as if to an interviewer, then answer two follow-up questions. Fix every grammar point it raises. |

*Total: 4h 0m*

### Day 61 — Friday 20 November 2026

**Normal forms as anomalies prevented · Constraints are enforced documentation**

| Time | Track | Task |
|---|---|---|
| `After Fajr + Quran` | **Engineering** | Phase 3 Chapter 5 (Normalization) — first, second and third normal form. Learn each as the anomaly it prevents, not a definition to recite. Then find a table at your current job that violates 3NF and write what could go wrong. |
| `10:00–11:00 + 16:00–16:30` | **Engineering** | Phase 3 Chapter 4 — constraints. NOT NULL, UNIQUE, CHECK, foreign keys, ON DELETE behaviour. No AI: add real constraints to every Project 1 table, then try to insert bad data and watch the database refuse it. |
| `16:30–17:00` | **Job Hunt** | Applications: one tailored application or one follow-up. Log it in TRACKER.md. |
| `21:30–22:00` | **Communication** | English speaking session with Claude: explain today's engineering work out loud as if to an interviewer, then answer two follow-up questions. Fix every grammar point it raises. |

*Total: 4h 0m*

### Day 62 — Saturday 21 November 2026

**SQL under time pressure**

| Time | Track | Task |
|---|---|---|
| `10:00–12:00` | **Engineering** | Deep build, two hours, no AI: connect Project 1 to PostgreSQL. Replace in-memory storage with real tables and hand-written SQL. No ORM yet, on purpose — you will appreciate it more in week 20. |
| `12:30–13:30` | **Engineering** | Drill: five SQL questions, fifteen minutes each, blank editor, no reference. This is exactly the format of a screening test. |
| `14:00–15:00` | **Review** | Weekly review. Count your forty exercises honestly. Read next week ahead. |
| `15:30–16:00` | **Job Hunt** | Two applications, tailored, logged. |
| `16:00–16:30` | **Job Hunt** | Two applications, tailored, logged. |

*Total: 5h 0m*

### Day 63 — Sunday 22 November 2026

**Reporting endpoints, done in SQL**

| Time | Track | Task |
|---|---|---|
| `10:00–12:00` | **Engineering** | Deep build, two hours, no AI: add three reporting endpoints to Project 1 that would have been painful without window functions. All the work happens in the database. |
| `12:30–13:30` | **Engineering** | Drill: five SQL questions, timed, blank editor. Include one window function question. |
| `14:00–15:00` | **Review** | Weekly review. Read next week ahead. |
| `15:30–16:00` | **Job Hunt** | Check the funnel: how many replies from your first thirty applications? Under three means the CV is the problem, not the volume. |
| `16:00–16:30` | **Job Hunt** | Two applications, tailored, logged. |

*Total: 5h 0m*

## Week 10 — Schema Design and Normalization + PostgreSQL in Depth

*Block III — Databases · 30 hours*

Design questions separate three-year engineers from each other. Anyone can query a schema someone else designed. This week is designing one that does not have to be rescued in eighteen months.

PostgreSQL specifically, not "a database". Types that prevent bugs, JSONB for the genuinely schemaless parts, psql instead of a GUI, and the features that make Postgres the default answer at the companies you are targeting.

**Chapters this week:**

- [Database Design](#phase-3-databases--database-design)
- [Normalization](#phase-3-databases--normalization)
- [The Interview Conversation](#phase-10-english-communication--the-interview-conversation)
- [Postgresql](#phase-3-databases--postgresql)

**Deliverable:** A designed, documented and migrated schema for Project 1 — entities, relationships, keys, constraints — with a written justification for every denormalisation you chose. · ALSO: Project 1 using correct Postgres types throughout, one justified JSONB column with an index on it, and a written note on every type choice you changed and why.

**Milestone:** Given a described business problem you can produce a normalised schema on paper in twenty minutes and defend each decision. · AND: You can use psql without a GUI, and you can explain why timestamptz and numeric exist and what goes wrong without them.

**Applications this week:** 10

**DSA drill:** Linked lists — cycle & merge → Binary search — exact match — 6 problems

### Day 64 — Monday 23 November 2026

**When to denormalise, and how to say so · Migrations, properly**

| Time | Track | Task |
|---|---|---|
| `After Fajr + Quran` | **Engineering** | Phase 3 Chapter 5 — denormalisation as a trade of write complexity for read speed. Write every one you have chosen into PROJECT1.md with the exact reason. If you cannot write the reason, undo it. |
| `10:00–11:00 + 16:00–16:30` | **Engineering** | No AI: move the schema into versioned migrations. Write one that adds a column and one that backfills it, then roll both back. A schema you cannot roll back is a schema you cannot change. |
| `16:30–17:00` | **Job Hunt** | Two applications, tailored, logged. |
| `21:30–22:00` | **Communication** | Explain the difference between RANK and DENSE_RANK aloud, with an example, in sixty seconds. |

*Total: 4h 0m*

### Day 65 — Tuesday 24 November 2026

**Types that prevent bugs · psql, properly**

| Time | Track | Task |
|---|---|---|
| `After Fajr + Quran` | **Engineering** | Phase 3 Chapter 2 (PostgreSQL) — types. timestamptz versus timestamp, numeric versus float for money, text versus varchar, enums, arrays. Fix every wrong type in Project 1 and write down what each one could have cost you. |
| `10:00–11:00 + 16:00–16:30` | **Engineering** | Phase 3 Chapter 2 — psql. \dt, \d+, \timing, \x, \ef, and running a file. Stop using a GUI for the rest of the plan. Then inspect your own schema entirely from the command line. |
| `16:30–17:00` | **Job Hunt** | Ask one referral contact directly whether they would refer you. Have the CV and a two-line summary ready in the same message. |
| `21:30–22:00` | **Communication** | Fifth application. Then rehearse: "tell me about the most complex query you have written." |

*Total: 4h 0m*

### Day 66 — Wednesday 25 November 2026

**JSONB, and when a column is a document · Constraints, defaults and generated columns**

| Time | Track | Task |
|---|---|---|
| `After Fajr + Quran` | **Engineering** | Phase 3 Chapter 2 — JSONB. Operators, containment, and GIN indexes. The honest answer to when it is correct: genuinely schemaless data, not a way to avoid designing a table. Add one justified JSONB column to Project 1, query it, and index it. |
| `10:00–11:00 + 16:00–16:30` | **Engineering** | Phase 3 Chapter 2 — CHECK constraints, defaults, generated columns, and partial unique indexes. Push one rule that currently lives in your Node code down into the database, and notice that it is now impossible to violate. |
| `16:30–17:00` | **Communication** | Fifth application. Then practise "how would you design the schema for X" using your own project, ninety seconds, aloud. |
| `21:30–22:00` | **Communication** | Read Phase 10 Chapter 3 (The Interview Conversation). Note the three things you currently do that the chapter warns against. |

*Total: 4h 0m*

### Day 67 — Thursday 26 November 2026

**Full-text search, before you reach for Elasticsearch · What an index actually is**

| Time | Track | Task |
|---|---|---|
| `After Fajr + Quran` | **Engineering** | Phase 3 Chapter 2 — tsvector, tsquery and full-text search. Add search to Project 1 with Postgres alone. Knowing that Postgres can do this is worth an interview answer on its own, because most people add a second system too early. |
| `10:00–11:00 + 16:00–16:30` | **Engineering** | Phase 3 Chapter 7 (Indexes) — B-tree structure, and why an index is a trade: faster reads, slower writes, more disk. Look at your tables and predict which columns need indexes before measuring anything. Write the predictions down. |
| `16:30–17:00` | **Job Hunt** | Applications: one tailored application or one follow-up. Log it in TRACKER.md. |
| `21:30–22:00` | **Communication** | English speaking session with Claude: explain today's engineering work out loud as if to an interviewer, then answer two follow-up questions. Fix every grammar point it raises. |

*Total: 4h 0m*

### Day 68 — Friday 27 November 2026

**EXPLAIN ANALYZE · Composite indexes and column order**

| Time | Track | Task |
|---|---|---|
| `After Fajr + Quran` | **Engineering** | Phase 3 Chapter 8 (Query Optimization) — reading a plan. Sequential scan versus index scan, nested loop versus hash versus merge join, and what the cost, rows and actual time numbers mean. Run it on five of your own queries and read every line. |
| `10:00–11:00 + 16:00–16:30` | **Engineering** | Phase 3 Chapter 7 — composite indexes and why column order matters. No AI: create one, then write one query it helps and one it does not, and prove both with EXPLAIN. The left-prefix rule is a standard interview question. |
| `16:30–17:00` | **Job Hunt** | Applications: one tailored application or one follow-up. Log it in TRACKER.md. |
| `21:30–22:00` | **Communication** | English speaking session with Claude: explain today's engineering work out loud as if to an interviewer, then answer two follow-up questions. Fix every grammar point it raises. |

*Total: 4h 0m*

### Day 69 — Saturday 28 November 2026

**Design under interview conditions**

| Time | Track | Task |
|---|---|---|
| `10:00–12:00` | **Engineering** | Deep build, two hours, no AI: finish the Project 1 schema — every entity, relationship and constraint, seeded with realistic data by a script you wrote. |
| `12:30–13:30` | **Engineering** | Drill: design a normalised schema for a clinic, a courier and a small marketplace. Twenty minutes each, on paper, timed. |
| `14:00–15:00` | **Review** | Weekly review. Read next week ahead. |
| `15:30–16:00` | **Job Hunt** | Two applications, tailored, logged. |
| `16:00–16:30` | **Job Hunt** | Two applications, tailored, logged. |

*Total: 5h 0m*

### Day 70 — Sunday 29 November 2026

**Make the data layer solid**

| Time | Track | Task |
|---|---|---|
| `10:00–12:00` | **Engineering** | Deep build, two hours, no AI: every type correct, constraints in place, search working, JSONB where justified. Then write the data-layer section of PROJECT1.md explaining each decision. |
| `12:30–13:30` | **Engineering** | Drill: five SQL and Postgres questions, timed. Then explain JSONB versus a normalised table aloud, with your own example. |
| `14:00–15:00` | **Review** | Weekly review. Read next week ahead. |
| `15:30–16:00` | **Job Hunt** | Update the CV with a specific Postgres line — JSONB, or full-text search, or the type corrections. |
| `16:00–16:30` | **Job Hunt** | Two applications, tailored, logged. |

*Total: 5h 0m*

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

**Milestone:** You can read an EXPLAIN ANALYZE plan, say which line is the problem, and predict whether an index will help before you create it. · AND: ANCHOR — AI unlocked on Monday 1 December, as reviewer and teacher, never author. And you can describe a race condition you personally reproduced.

**Applications this week:** 10

**DSA drill:** Binary search — on the answer → Sorting — custom comparators — 7 problems

### Day 71 — Monday 30 November 2026

**The other index types · The optimisations that are not indexes**

| Time | Track | Task |
|---|---|---|
| `After Fajr + Quran` | **Engineering** | Phase 3 Chapter 7 — partial indexes, covering indexes and index-only scans, GIN for JSONB and full-text. Add a partial index to Project 1 where most rows are irrelevant, and measure the size difference. |
| `10:00–11:00 + 16:00–16:30` | **Engineering** | Phase 3 Chapter 8 — SELECT *, N+1, unnecessary sorts, functions on indexed columns that disable them, and pagination that degrades. Find at least three of these in your own code and fix them. |
| `16:30–17:00` | **Job Hunt** | Two applications, tailored, logged. |
| `21:30–22:00` | **Communication** | Write a two-minute answer to "why PostgreSQL for this project?" about your project specifically, not a generic comparison. |

*Total: 4h 0m*

