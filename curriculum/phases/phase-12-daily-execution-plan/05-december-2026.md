# Phase 12 — Chapter 5: December 2026

> **31 days · Day 68 to Day 98 · 62 scheduled hours · 4 rest days**

## Chapter Overview

This chapter covers weeks 10, 11, 12, 13, 14 of the fifty-week plan. Every day below is a contract with yourself. Tick the tasks in the reader's **Plan** tab as you finish them — the app tracks your streak and completion rate across all 353 days.

| Week | Dates | Hours | Apps | DSA | Focus | Milestone |
|---|---|---|---|---|---|---|
| **W10** | 01 Dec – 06 Dec | 14h | 3 | Strings — anagrams & palindromes | Express — Routing, Middleware, the Request Lifecycle | You can draw the path of a request through an Express app from memory, including where errors go and why middleware order is not cosmetic. |
| **W11** | 07 Dec – 13 Dec | 14h | 3 | Prefix sums | REST API Design a Reviewer Would Approve | You can defend every status code your API returns, and explain cursor versus offset pagination and when each breaks. |
| **W12** | 14 Dec – 20 Dec | 14h | 3 | Matrix traversal | Validation, Error Handling, Logging | You can trace a single request end to end through your logs by its id, and you can explain the difference between an operational error and a programmer error. |
| **W13** | 21 Dec – 27 Dec | 14h | 5 | Stacks — monotonic & matching | Deploy It — The API Goes Public | ANCHOR — the API is reachable from the public internet on Saturday 26 December. Application quota rises to five a week because the CV now points at something running. |
| **W14** | 28 Dec – 31 Dec | 14h | 5 | Queues & deques | SQL I — Selects, Joins, Thinking in Sets | You can write a three-table join with grouping and a having clause from a blank editor, first try, without looking up the syntax. |

---

## Week 10 — Express — Routing, Middleware, the Request Lifecycle

*Block II — Node and Express · 14 hours*

Express is small enough to understand completely, and understanding it completely is what lets you answer the most common backend interview question at this level: what happens between the request arriving and the response leaving.

**Chapters this week:**

- [Expressjs](#phase-2-backend-engineering--expressjs)
- [Agile Scrum](#phase-9-software-engineering--agile-scrum)
- [Projects That Prove Three Years](#phase-11-job-hunt-pakistan--projects-that-prove-three-years)

**Deliverable:** week-10/ containing an Express server with a hand-written middleware stack — request id, logging, timing, body limit, auth check, central error handler — every one written by you, and a diagram of the request lifecycle drawn by you.

**Milestone:** You can draw the path of a request through an Express app from memory, including where errors go and why middleware order is not cosmetic.

**Applications this week:** 3

**DSA drill:** Strings — anagrams & palindromes — 3 problems

### Day 68 — Tuesday 1 December 2026

**Middleware, and why order matters**

| Time | Track | Task |
|---|---|---|
| `05:00–06:30` | **Engineering** | Phase 2 Chapter 2 — middleware. What next() does, what happens when you forget it, and why the order of app.use is load-bearing. No AI: write request-logging and timing middleware by hand, then move one above the other and observe what changes. |
| `13:00–13:30` | **Job Hunt** | Read Phase 9 Chapter 1 (Agile and Scrum). Write how your current team actually works, honestly, and what you would change. You will be asked. |

*Total: 2h 0m*

### Day 69 — Wednesday 2 December 2026

**Error handling in Express**

| Time | Track | Task |
|---|---|---|
| `05:00–06:30` | **Engineering** | Phase 2 Chapter 2 — the four-argument error middleware and why it has four arguments. No AI: build a central error handler returning consistent JSON that never leaks a stack trace. Then throw from inside an async handler and discover that Express does not catch it — and fix that. |
| `13:00–13:30` | **Communication** | Second application. Then write a ninety-second answer to "walk me through what happens when a request hits your server". |

*Total: 2h 0m*

### Day 70 — Thursday 3 December 2026

**Parsing, headers, status codes**

| Time | Track | Task |
|---|---|---|
| `05:00–06:30` | **Engineering** | Phase 2 Chapter 2 — body parsing, content types, headers, and status codes that mean what they say. Learn when 400, 401, 403, 404, 409 and 422 are each correct, and set a body size limit before someone finds out you did not. |
| `13:00–13:30` | **Job Hunt** | Third application, tailored, logged. |

*Total: 2h 0m*

### Day 71 — Friday 4 December 2026

**Choose Project 1**

| Time | Track | Task |
|---|---|---|
| `05:00–06:30` | **Engineering** | Choose PROJECT 1 and write its scope in one paragraph in PROJECT1.md. It must be a backend you would actually use, small enough to finish, and large enough to need auth, relationships, search and background work. You will carry it for fifteen weeks and rebuild it in Nest in week 23. |
| `13:00–13:30` | **Communication** | Write the one-paragraph description of Project 1 for your CV — present tense, specific, no adjectives. |

*Total: 2h 0m*

### Day 72 — Saturday 5 December 2026

**Build the middleware stack**

| Time | Track | Task |
|---|---|---|
| `08:00–10:00` | **Engineering** | Deep build, two hours, no AI: the Project 1 skeleton with a full hand-written middleware stack — request id, logging, timing, body limit, fake auth check, central error handler — each with a comment saying why it sits where it does. |
| `10:30–11:30` | **Engineering** | Drill: draw the Express request lifecycle from memory on paper. Then three LeetCode problems, timed. |
| `12:00–13:00` | **Review** | Weekly review. Read next week ahead. |

*Total: 4h 0m*

### Day 73 — Sunday 6 December 2026 · REST

No tasks. Sunday is a genuine day off and it is part of the plan, not a gap in it. Rest is what makes fourteen hours a week survivable for fifty straight weeks.

## Week 11 — REST API Design a Reviewer Would Approve

*Block II — Node and Express · 14 hours*

Anyone can make an endpoint return JSON. This week is the decisions a reviewer looks at: resource naming, status codes, pagination, filtering, idempotency, versioning, and what your API does when the client sends nonsense.

**Chapters this week:**

- [Rest Apis](#phase-2-backend-engineering--rest-apis)
- [Api Versioning](#phase-2-backend-engineering--api-versioning)
- [Api Documentation](#phase-2-backend-engineering--api-documentation)
- [Written English At Work](#phase-10-english-communication--written-english-at-work)

**Deliverable:** The Project 1 API with two resources, full CRUD, pagination, filtering, a single documented error shape, and an OpenAPI document that matches the implementation.

**Milestone:** You can defend every status code your API returns, and explain cursor versus offset pagination and when each breaks.

**Applications this week:** 3

**DSA drill:** Prefix sums — 3 problems

### Day 74 — Monday 7 December 2026

**Resources, verbs, naming**

| Time | Track | Task |
|---|---|---|
| `05:00–06:30` | **Engineering** | Phase 2 Chapter 4 (REST APIs) — resources, naming, HTTP verbs, and what "RESTful" actually commits you to. Design the full route table for Project 1 on paper before writing any of it. |
| `13:00–13:30` | **Job Hunt** | One application, tailored, logged. |

*Total: 2h 0m*

### Day 75 — Tuesday 8 December 2026

**Status codes and one error shape**

| Time | Track | Task |
|---|---|---|
| `05:00–06:30` | **Engineering** | Phase 2 Chapter 4 — status codes and error responses. No AI: define your API's error shape once, in writing, then implement it so every error from every endpoint uses it. Consistency here is a reviewer's first impression. |
| `13:00–13:30` | **Communication** | Read Phase 10 Chapter 4 (Written English at Work). Write the Project 1 README — what it is, why it exists, how to run it. Three paragraphs, no filler. |

*Total: 2h 0m*

### Day 76 — Wednesday 9 December 2026

**Pagination, filtering, sorting**

| Time | Track | Task |
|---|---|---|
| `05:00–06:30` | **Engineering** | Phase 2 Chapter 4 — pagination and query design. Offset versus cursor, and why offset pagination gets slower on every page. No AI: implement offset pagination with a maximum page size, then write down what you would change at a million rows. |
| `13:00–13:30` | **Job Hunt** | Second application, tailored, logged. |

*Total: 2h 0m*

### Day 77 — Thursday 10 December 2026

**Idempotency and versioning**

| Time | Track | Task |
|---|---|---|
| `05:00–06:30` | **Engineering** | Phase 2 Chapter 4 and Chapter 21 (API Versioning) — idempotency, PUT versus PATCH, and versioning strategies. Write in PROJECT1.md which versioning approach you chose and why. An interviewer will ask, and "I did not think about it" is a real answer people give. |
| `13:00–13:30` | **Communication** | Third application. Then rehearse the answer to "how would you version a breaking change without breaking existing clients?" |

*Total: 2h 0m*

### Day 78 — Friday 11 December 2026

**Document the API**

| Time | Track | Task |
|---|---|---|
| `05:00–06:30` | **Engineering** | Phase 2 Chapter 22 (API Documentation). Document every endpoint by hand first — method, path, parameters, request, response, errors — so you understand the shape. Then generate an OpenAPI document and make it match the implementation exactly. |
| `13:00–13:30` | **Job Hunt** | Put the Project 1 repository link on your CV and LinkedIn now, even though it is not deployed. It is real and it is readable. |

*Total: 2h 0m*

### Day 79 — Saturday 12 December 2026

**Build the API**

| Time | Track | Task |
|---|---|---|
| `08:00–10:00` | **Engineering** | Deep build, two hours, no AI: Project 1 with two resources, full CRUD, pagination, filtering, consistent errors, in-memory storage. The database arrives in Block III; the shape is what matters today. |
| `10:30–11:30` | **Engineering** | Drill: three problems, timed, then explain one solution aloud as if to an interviewer. |
| `12:00–13:00` | **Review** | Weekly review. Read next week ahead. |

*Total: 4h 0m*

### Day 80 — Sunday 13 December 2026 · REST

No tasks. Sunday is a genuine day off and it is part of the plan, not a gap in it. Rest is what makes fourteen hours a week survivable for fifty straight weeks.

## Week 12 — Validation, Error Handling, Logging

*Block II — Node and Express · 14 hours*

The unglamorous week that separates a project that looks like a tutorial from one that looks like production. None of it is hard and all of it is visible to a reviewer within thirty seconds of opening your repository.

**Chapters this week:**

- [Validation](#phase-2-backend-engineering--validation)
- [Error Handling](#phase-2-backend-engineering--error-handling)
- [Logging](#phase-2-backend-engineering--logging)

**Deliverable:** Project 1 with schema validation on every input, a real error taxonomy with custom error classes, and structured logging where a request id flows through every log line for one request.

**Milestone:** You can trace a single request end to end through your logs by its id, and you can explain the difference between an operational error and a programmer error.

**Applications this week:** 3

**DSA drill:** Matrix traversal — 3 problems

### Day 81 — Monday 14 December 2026

**Validate at the boundary**

| Time | Track | Task |
|---|---|---|
| `05:00–06:30` | **Engineering** | Phase 2 Chapter 10 (Validation) — schema validation at the edge, and why validating inside the handler is already too late. No AI: add schema validation to every endpoint that accepts a body or a query parameter, and return your standard error shape on failure. |
| `13:00–13:30` | **Job Hunt** | One application, tailored, logged. |

*Total: 2h 0m*

### Day 82 — Tuesday 15 December 2026

**Types and validators should agree**

| Time | Track | Task |
|---|---|---|
| `05:00–06:30` | **Engineering** | Derive your TypeScript types from your validation schemas so they cannot drift apart. Then deliberately change a schema and watch the compiler find every place that assumed the old shape. This is the payoff for week 7. |
| `13:00–13:30` | **Communication** | Write five sentences on what your API does when something goes wrong. If the honest answer is "returns 500", that is this week's work. |

*Total: 2h 0m*

### Day 83 — Wednesday 16 December 2026

**An error taxonomy, not a pile of try/catch**

| Time | Track | Task |
|---|---|---|
| `05:00–06:30` | **Engineering** | Phase 2 Chapter 11 (Error Handling) — operational versus programmer errors, custom error classes, and the boundary where an internal error becomes an HTTP response. No AI: refactor Project 1 onto one taxonomy with a base error class. |
| `13:00–13:30` | **Job Hunt** | Second application, tailored, logged. |

*Total: 2h 0m*

### Day 84 — Thursday 17 December 2026

**Structured logging and request ids**

| Time | Track | Task |
|---|---|---|
| `05:00–06:30` | **Engineering** | Phase 2 Chapter 12 (Logging) — structured logs, levels, request ids, and what must never be logged (passwords, tokens, personal data). No AI: add a request id that flows through every log line, then trace one request end to end. |
| `13:00–13:30` | **Communication** | Third application. Then rehearse: "a user reports an error from yesterday and gives you a timestamp. What do you do?" |

*Total: 2h 0m*

### Day 85 — Friday 18 December 2026

**Async context, so ids flow by themselves**

| Time | Track | Task |
|---|---|---|
| `05:00–06:30` | **Engineering** | Use AsyncLocalStorage so the request id reaches your logger without being passed through every function signature. Understand what it is doing before you use it — this is a genuinely advanced Node feature and a strong interview talking point. |
| `13:00–13:30` | **Job Hunt** | Check APPLICATIONS.md. Anything with no reply after fourteen days is dead — mark it and move on. Do not chase twice. |

*Total: 2h 0m*

### Day 86 — Saturday 19 December 2026

**Harden the whole API**

| Time | Track | Task |
|---|---|---|
| `08:00–10:00` | **Engineering** | Deep build, two hours, no AI: every endpoint validated, every error on the taxonomy, every log line carrying a request id. Then send ten deliberately malformed requests and confirm every one returns a correct, useful, non-leaking response. |
| `10:30–11:30` | **Engineering** | Drill: three problems, timed. Then explain your error taxonomy aloud in two minutes. |
| `12:00–13:00` | **Review** | Weekly review. Next week the API goes live. Write the deployment checklist tonight. Read next week ahead. |

*Total: 4h 0m*

### Day 87 — Sunday 20 December 2026 · REST

No tasks. Sunday is a genuine day off and it is part of the plan, not a gap in it. Rest is what makes fourteen hours a week survivable for fifty straight weeks.

## Week 13 — Deploy It — The API Goes Public

*Block II — Node and Express · 14 hours*

A deployed thing you can link to changes every conversation you have from here on. It is not finished and that is the point: deploy early, deploy badly, learn what breaks, and then have a URL on your CV for the remaining thirty-seven weeks.

**Chapters this week:**

- [Api Documentation](#phase-2-backend-engineering--api-documentation)
- [Referrals And Recruiters](#phase-11-job-hunt-pakistan--referrals-and-recruiters)

**Deliverable:** PROJECT 1 API DEPLOYED at a public URL over HTTPS, with a health check, environment-based configuration, and a README a stranger can follow.

**Milestone:** ANCHOR — the API is reachable from the public internet on Saturday 26 December. Application quota rises to five a week because the CV now points at something running.

**Applications this week:** 5

**DSA drill:** Stacks — monotonic & matching — 4 problems

### Day 88 — Monday 21 December 2026

**Configuration and secrets**

| Time | Track | Task |
|---|---|---|
| `05:00–06:30` | **Engineering** | Make Project 1 deployable: every secret and every environment difference in environment variables, validated at startup so the process refuses to boot with a missing one. Then check your git history for anything you committed earlier and deal with it honestly. |
| `13:00–13:30` | **Job Hunt** | Two applications, tailored, logged. The quota rises to five a week from today. |

*Total: 2h 0m*

### Day 89 — Tuesday 22 December 2026

**Health checks and readiness**

| Time | Track | Task |
|---|---|---|
| `05:00–06:30` | **Engineering** | Add a health endpoint that actually verifies the dependencies — not one that returns 200 unconditionally. Learn the difference between liveness and readiness, because it will matter in week 41 when this runs on ECS. |
| `13:00–13:30` | **Communication** | Read Phase 11 Chapter 4 (Referrals and Recruiters). List five people you already know who work at a target company. |

*Total: 2h 0m*

### Day 90 — Wednesday 23 December 2026

**Pick a host and read its documentation**

| Time | Track | Task |
|---|---|---|
| `05:00–06:30` | **Engineering** | Choose a host, create the account, and read its Node deployment documentation end to end before writing anything. Then write your deployment steps down as a checklist. AWS comes in Block VII; today you want it live, not perfect. |
| `13:00–13:30` | **Job Hunt** | Two applications, tailored, logged. |

*Total: 2h 0m*

### Day 91 — Thursday 24 December 2026

**Graceful shutdown**

| Time | Track | Task |
|---|---|---|
| `05:00–06:30` | **Engineering** | Handle SIGTERM: stop accepting connections, finish in-flight requests, close resources, exit zero. Then test it by deploying while making requests and proving nothing was dropped. Most candidates have never thought about this. |
| `13:00–13:30` | **Communication** | Message one referral contact — no ask in the first message, just a real reconnection. |

*Total: 2h 0m*

### Day 92 — Friday 25 December 2026

**Deployment rehearsal**

| Time | Track | Task |
|---|---|---|
| `05:00–06:30` | **Engineering** | Rehearse the whole deployment locally against a production-style configuration. Write down every step. It will still fail on Saturday, but it will fail for a reason you can find. |
| `13:00–13:30` | **Job Hunt** | Fifth application of the week. Then prepare the CV line you will use once the URL is live. |

*Total: 2h 0m*

### Day 93 — Saturday 26 December 2026

**ANCHOR — the API goes live**

| Time | Track | Task |
|---|---|---|
| `08:00–10:00` | **Engineering** | Deep build, two hours, no AI: DEPLOY. Public URL, HTTPS, environment variables set, health check answering. It will not work the first time. That is the exercise. |
| `10:30–11:30` | **Engineering** | Verify from outside: call every endpoint from your phone on mobile data. Then put the URL in the README, on the CV, and on LinkedIn. |
| `12:00–13:00` | **Review** | Weekly review. Write in LOG.md exactly what broke during the deploy and what you learned from each failure. That list is an interview answer. Read next week ahead — databases, and the most important nine weeks in this plan. |

*Total: 4h 0m*

### Day 94 — Sunday 27 December 2026 · REST

No tasks. Sunday is a genuine day off and it is part of the plan, not a gap in it. Rest is what makes fourteen hours a week survivable for fifty straight weeks.

## Week 14 — SQL I — Selects, Joins, Thinking in Sets

*Block III — Databases · 14 hours*

You have written SQL for three years and most of it was generated. SQL is the highest-return subject in this book: asked in almost every interview, testable in fifteen minutes, and being genuinely good at it is rare enough to be a differentiator.

**Chapters this week:**

- [Sql](#phase-3-databases--sql)

**Deliverable:** A seeded PostgreSQL practice database of five related tables and a few thousand rows, plus forty solved exercises written by hand with no AI and no copied answers.

**Milestone:** You can write a three-table join with grouping and a having clause from a blank editor, first try, without looking up the syntax.

**Applications this week:** 5

**DSA drill:** Queues & deques — 3 problems

### Day 95 — Monday 28 December 2026

**Build the practice ground**

| Time | Track | Task |
|---|---|---|
| `05:00–06:30` | **Engineering** | Install PostgreSQL locally. Create a practice database with five related tables — customers, orders, order_items, products, categories — and seed a few thousand rows with a script you write yourself. This database is your practice ground for nine weeks. |
| `13:00–13:30` | **Job Hunt** | Two applications, tailored, logged. |

*Total: 2h 0m*

### Day 96 — Tuesday 29 December 2026

**SELECT, WHERE, and NULL**

| Time | Track | Task |
|---|---|---|
| `05:00–06:30` | **Engineering** | Phase 3 Chapter 1 (SQL) — selection and filtering. Ten exercises by hand. Pay real attention to NULL: why NULL = NULL is not true, what that breaks in a WHERE clause, and why COUNT(column) and COUNT(*) disagree. |
| `13:00–13:30` | **Communication** | Write the difference between WHERE and HAVING in three sentences, as if explaining to a junior. |

*Total: 2h 0m*

### Day 97 — Wednesday 30 December 2026

**Joins — all of them, deliberately**

| Time | Track | Task |
|---|---|---|
| `05:00–06:30` | **Engineering** | Phase 3 Chapter 1 — joins. Inner, left, right, full, cross, self. Ten exercises. For each, predict the row count before running it. The prediction is the exercise, not the query. |
| `13:00–13:30` | **Job Hunt** | Two applications, tailored, logged. |

*Total: 2h 0m*

### Day 98 — Thursday 31 December 2026

**Aggregation and grouping**

| Time | Track | Task |
|---|---|---|
| `05:00–06:30` | **Engineering** | Phase 3 Chapter 1 — GROUP BY, aggregates, HAVING. Ten exercises, at least three needing a join and a group together. That combination is the classic interview question. |
| `13:00–13:30` | **Communication** | Fifth application. Then write the three SQL questions you would ask about your practice schema if you were interviewing yourself. |

*Total: 2h 0m*

