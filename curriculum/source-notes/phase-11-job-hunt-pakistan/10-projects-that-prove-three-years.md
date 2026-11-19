# Phase 11 — Chapter 10: Projects That Prove Three Years

> **Core chapter · Week 10, and referenced whenever you ship**
>
> The problem this chapter solves: you have three years of experience and a CV that a
> reviewer will quietly discount, because most of that time was maintenance on PHP and
> AngularJS and a lot of the code was not yours. Projects are how you close that gap —
> but only projects built to a specific standard. A tutorial clone widens the gap.

---

## Chapter Overview

When a reviewer at a tier-2 company opens your GitHub, they are answering one question in
about ninety seconds: **does this person's code look like it came from someone with three
years of production experience, or from someone who has done a course?**

They are not counting features. They are looking for a small number of specific signals,
and the presence or absence of those signals is what decides whether your three years get
believed.

**What makes a project read as a tutorial:**

- It works only on the happy path.
- Errors return 500, or a raw stack trace, or `{"error": "something went wrong"}`.
- No tests, or tests that assert the framework works.
- `README` is the framework's generated one, or says "run npm start".
- Secrets in the repository, or a `.env` committed in the first ten commits.
- Every commit is "update" or "fix".
- Nothing is measured. No numbers anywhere.
- It is not deployed, so nobody can try it.

**What makes a project read as production experience:**

- **It is live**, with a demo account, and it does not fall over.
- **Failure paths are handled** — the database is down, the third party timed out, the
  input was malformed, two users acted at once.
- **There are real tests**, including failure cases, and they run in CI.
- **The README explains decisions**, not just commands: why this database, why this auth
  approach, what you would do differently.
- **There are measured numbers** — a query that went from 400ms to 12ms, a cache hit rate,
  retrieval accuracy, queue throughput.
- **Commits are readable.** A reviewer can follow how it was built.
- **You can explain every line.** This is the one that actually matters, because it is the
  one they test in the interview.

That last point is why the AI rule in this plan exists. A beautiful repository you cannot
defend is worse than a modest one you can, because the interview goes badly *after* they
were impressed, which is a worse outcome than never being impressed.

---

## The Standard Every Project Must Meet

Before the specifics, the bar that applies to all three. A project is **not finished**
until all of this is true:

| | Requirement |
|---|---|
| **Live** | Deployed at a public URL over HTTPS, with seeded data and a demo account a stranger can log into |
| **Runnable** | `git clone` then one command. You have tested this in an empty folder |
| **Documented** | README with the problem, the stack, an architecture diagram, how to run it, the decisions, and an honest limitations section |
| **Tested** | Real test suite, including failure paths, running green in CI on every push |
| **Observable** | Structured logs with request ids, a health check that verifies dependencies, at least one metric |
| **Safe** | No secrets in the repository or its history. Validation on every input. Errors that leak nothing |
| **Measured** | At least three numbers you produced, with the method |
| **Defensible** | You can explain any line, unaided, and name one thing you would do differently |

**The "what I would do differently" section is not modesty.** It is the clearest signal of
seniority a README can carry, because it proves you evaluated your own work after building
it. Reviewers read it first. Write it honestly — "the cache invalidation is TTL-only,
which means up to sixty seconds of staleness on the dashboard; with more time I would
invalidate on write" beats any amount of polish.

---

## Project 1 — The API With A Serious Data Layer

**Built:** Weeks 8–22 · **Stack:** Node, Express, TypeScript, PostgreSQL

This is the one that proves you understand data. In this market that is the single
highest-value thing you can demonstrate, because it is where the gap between a 120k
developer and a 250k engineer actually sits.

**Choose a domain you would use yourself** — an inventory tracker for a small shop, a
booking system for a clinic, a delivery dispatch tool. It must be small enough to finish
and large enough to need relationships, search, auth and background work. Avoid a to-do
app and avoid a blog; reviewers have seen ten thousand of each and they signal nothing.

### What it must contain

- **A schema you designed and can defend.** Entities, relationships, real foreign keys,
  CHECK constraints, ON DELETE behaviour chosen deliberately. Versioned migrations that
  run from empty.
- **Indexes with evidence.** At least five queries with `EXPLAIN ANALYZE` output before
  and after, and the timing difference, saved in the repository.
- **Transactions where they are needed**, with a documented race condition you reproduced
  and the fix you chose from the three available.
- **Full-text search using PostgreSQL itself**, not a second system added too early.
- **Pagination that does not degrade**, and a written note on what you would change at a
  million rows.
- **One JSONB column, justified in writing** — or none, also justified.

### The numbers to produce

1. The index before-and-after on your slowest query.
2. The N+1 you found and removed, with the query count before and after.
3. Rows seeded, and the query time at that volume.

### What it proves

That you can design a data model, read a query plan, and reason about concurrency. Very
few three-year candidates in this market can do all three, and it is exactly what a
backend interview probes.

---

## Project 2 — The NestJS Service

**Built:** Weeks 23–33 · **Stack:** NestJS, TypeScript, PostgreSQL, Redis, BullMQ, Docker

This is the one you lead with. Same domain as Project 1, rebuilt properly — and the fact
that it is a *rebuild* is itself a talking point, because you can describe concretely what
the first version got wrong.

### What it must contain

- **A module structure with deliberate boundaries.** Each module exports the smallest
  surface it can, and you can say why for each one.
- **The full request pipeline in use** — validation pipes on every DTO, a role guard using
  metadata you defined, a timing interceptor, one global exception filter producing one
  error shape.
- **Repositories behind interfaces**, so the data layer can be replaced in a test without
  mocking the module system.
- **Authentication and role-based authorisation**, with refresh-token rotation and a
  written justification of sessions versus tokens.
- **A real test suite** — unit on the logic, integration against a throwaway Postgres, e2e
  on every endpoint including the 401 and 400 paths.
- **Redis doing two jobs** — a measured cache on the most expensive read path with a
  written invalidation strategy, and sessions or WebSocket fan-out.
- **A queue and a separate worker process**, with retries, exponential backoff, a
  dead-letter queue, and **idempotent consumers you proved by delivering twice**.
- **Real-time updates over WebSockets**, authenticated, with the Redis adapter so two
  instances see each other's events.
- **Resilience** — timeouts on every outbound call, one circuit breaker, and a written
  failure matrix saying what the service does when each dependency is down.
- **Containerised**, with a CI pipeline that lints, tests against a service database,
  builds the image and deploys on merge.

### The numbers to produce

1. Cache hit rate and the latency before and after.
2. Queue throughput — jobs per second sustained.
3. Test count and what the suite covers.
4. Image size after the multi-stage build.

### What it proves

That you can work the way a team works: structure, tests, CI, background processing,
caching, failure handling. This is the project that makes "three years of experience"
credible, because nothing in it looks like a course exercise.

**The strongest single thing in it** is the failure matrix. Take Redis down and have the
service degrade rather than die; write that down. Almost nobody at your level has thought
about it, and it is a five-minute conversation you will win.

---

## Project 3 — The Retrieval Service

**Built:** Weeks 43–45 · **Stack:** NestJS, PostgreSQL + pgvector, an LLM API

This is the modern one — the project that makes you interesting rather than merely
competent, and the reason is counter-intuitive: **not because it uses an LLM, but because
you measured it.**

Every second candidate now has a RAG demo. Almost none of them can tell you how often
their retrieval returns the right source, what a query costs, or what happens when the
model API is down. Being the one who can is the entire differentiator.

### What it must contain

- **A real document set** you actually have — your own notes, a company's public docs, a
  set of PDFs.
- **A deliberate chunking strategy**, written down with the size and overlap and why.
- **pgvector on the Postgres you already run**, not a new database — and be ready to say
  why that is the right call at this size.
- **An evaluation set of at least twenty question-and-expected-source pairs**, built by
  hand. This is the tedious part and it is the whole point: without it you cannot tell
  whether any change helped.
- **A measured retrieval accuracy**, and a before-and-after from changing exactly one
  variable.
- **Grounded answers with citations**, and an honest "I do not know" when the answer is
  not in the documents.
- **Cost accounting per request and a hard ceiling**, plus rate limiting per user.
- **Graceful failure** when the model API is slow or down.

### The numbers to produce

1. Retrieval accuracy against your evaluation set, before and after one change.
2. Cost per query and per thousand queries.
3. p95 latency, and how much of it is the model.

### What it proves

That you treat AI as an engineering problem with constraints and measurements, rather than
as a demo. In interviews this reads as judgement, which is the thing three years is
supposed to have bought you.

---

## The Things That Signal "Modern" — and the Ones That Do Not

**Worth having, because they come up constantly in job descriptions and you will be asked:**

| Signal | Where it lives in your work |
|---|---|
| TypeScript end to end, strict mode on | All three |
| Containerised, one-command local setup | P2, P3 |
| CI that blocks a red build | P2, P3 |
| Background jobs with retries and a DLQ | P2 |
| Caching with a written invalidation strategy | P2 |
| Real-time over WebSockets, scaled across instances | P2 |
| Structured logs, request ids, a health check, one metric | P2, P3 |
| Cloud deployment you configured — VPC, private RDS, roles not keys | P2 |
| Vector search and measured retrieval | P3 |
| Idempotency, proven | P2 |

**Not worth chasing, and a reviewer may count them against you:**

- **Microservices** for a project one person built. Extracting one service to understand
  the trade-off is a good exercise; shipping six is a signal you follow fashion rather
  than reason. Say so out loud — it lands well.
- **Kubernetes** you do not operate. Knowing pods and deployments is enough at this level;
  claiming EKS experience you do not have ends badly in round two.
- **Every buzzword in the README.** A stack list longer than the feature list reads as
  insecurity.
- **A blockchain or a "GPT wrapper" with no measurement.** Both signal chasing rather than
  engineering.

---

## The README That Does The Work

A reviewer spends ninety seconds. This is the order that survives it:

1. **One sentence on what it is and who it is for.** Not "a Node.js application using
   Express" — what problem it solves.
2. **The live link and the demo credentials.** Above the fold. If they cannot try it in
   ten seconds you have lost most of the value of building it.
3. **A screenshot or a two-minute demo video.**
4. **The stack**, as a short list.
5. **An architecture diagram.** One image. Boxes and arrows is fine — request path,
   database, cache, queue, worker.
6. **How to run it locally** — one command, and you have tested that claim in an empty
   folder.
7. **The decisions.** Three to six of them: why this database, why this auth approach, why
   the cache invalidates the way it does. Each two or three sentences.
8. **The numbers.** Your measurements, with the method.
9. **What I would do differently.** Honest, specific, and the section reviewers reach for.

**Commit history counts too.** Small, readable commits with real messages tell a story a
reviewer can follow. One commit called "initial commit" containing forty thousand lines
tells them either you dumped a tutorial or you cannot use Git.

---

## Talking About Them In Interviews

Prepare three lengths for each project, and rehearse all three aloud:

- **Thirty seconds** — what it is, the stack, one number. For "tell me about yourself".
- **Two minutes** — the problem, the architecture, one hard decision and the trade-off.
  For "walk me through a project".
- **Ten minutes of depth** — any component, any decision, any line of code. This one you
  cannot rehearse, only earn.

**The questions you will be asked, on every project:**

- "Why did you choose X over Y?" — have a reason that is about *your* constraints.
- "What was the hardest part?" — pick a real technical problem, not "finding time".
- "What would you do differently?" — the README section, spoken.
- "How would this handle a thousand users?" — the scaling ladder: index, cache, replica,
  partition. In that order, with the signal that triggers each step.
- "Show me a piece of code you are proud of." — know which file that is, in advance.

**Never claim a project is production-used if it is not.** Say "I built and deployed it;
it is not carrying real traffic". Everyone can tell, and the honesty buys you more than
the inflation would.

---

## Addressing The Three Years Directly

At some point someone will ask why three years of experience does not show more, or will
probe your PHP and AngularJS background. Have an answer ready, and make it a true one:

> "Most of my three years was maintenance on a legacy PHP and AngularJS product at a small
> company — real production context, but narrow, and no senior engineers to learn from.
> This year I rebuilt the fundamentals deliberately and shipped three backend services on
> Node, Nest and Postgres. The API is live, the second one has tests and queues and runs
> in CI, and I can walk you through any decision in them."

That answer works because every clause is verifiable and none of it is spin. It converts
the weakness into a story about self-direction, which is what the projects are evidence
for.

**What not to say:** anything that implies your previous work was worthless (it taught you
production context, shipping, and working with other people's code), and anything that
inflates what you did (it collapses in the technical round).

---

## Self Assessment

Per project, honestly:

- Is it live right now, and can a stranger log in and use it?
- Does a clean clone run with one command? Have you actually tested that this month?
- Does the README have decisions and numbers, or only commands?
- Can I explain every file, unaided, including the parts I wrote eight months ago?
- What happens when the database is down? Do I know, or do I assume?
- Are there tests for the failure paths, not just the happy ones?
- Is there a secret anywhere in the git history?
- Can I name one thing I would do differently, specifically?
- Which project do I lead with for a backend role, and why that one?

---

## Cheat Sheet

**The bar:** live · one-command runnable · documented decisions · tested including
failures · observable · no secrets · measured · defensible line by line.

**The three:**

| | Proves |
|---|---|
| **P1 — Express + Postgres** | You understand data: schema, indexes, query plans, transactions |
| **P2 — NestJS service** | You work like a team: structure, tests, CI, queues, cache, resilience |
| **P3 — Retrieval service** | You engineer AI rather than demo it: measured, costed, bounded |

**README order:** what it is → live link + demo login → screenshot → stack → architecture
diagram → one-command run → decisions → numbers → what I would do differently.

**Skip:** microservices you do not need · Kubernetes you do not operate · buzzword lists ·
any demo with no numbers.

**The line that matters more than all of it:** *you can explain every line, unaided.*
