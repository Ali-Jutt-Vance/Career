# Phase 10 — Chapter 8: Technical English for Software Engineers

---

## Chapter Overview

Professional English for software engineers goes beyond IELTS. It means communicating precisely in code reviews, technical documents, Slack messages, design discussions, and client meetings. This chapter covers the vocabulary, structures, and communication styles that distinguish senior engineers in global teams.

**Topics:**
- Technical vocabulary by domain (backend, cloud, AI, system design)
- Writing clear bug reports, commit messages, and PR descriptions
- Explaining technical concepts to non-technical stakeholders
- Email and Slack communication patterns
- Running technical meetings effectively
- Writing ADRs and design documents
- Disagreeing professionally in technical discussions

---

## Core Technical Vocabulary

### Backend Engineering

```
API-related:
  endpoint (specific URL that accepts requests)
  payload (data sent in the body of a request)
  response schema (structure of the returned data)
  authentication (verifying who you are)
  authorization (verifying what you're allowed to do)
  rate limiting (restricting how many requests per time period)
  idempotent (same request → same result, no side effects if repeated)
  
  Example: "The /orders endpoint accepts a POST request with a JSON payload
           containing the order details. It's idempotent — sending the same
           request twice won't create duplicate orders."

Performance-related:
  latency (time from request to response, measured in milliseconds)
  throughput (number of requests processed per second)
  bottleneck (the slowest component limiting overall performance)
  cache hit/miss (data found/not found in cache)
  N+1 query (inefficient pattern: 1 query for list + N queries for each item)
  
  Example: "We were experiencing high latency — around 2 seconds per request.
           After profiling, we identified an N+1 query problem as the bottleneck."

Error-related:
  exception (unexpected runtime error)
  stack trace (sequence of function calls leading to an error)
  graceful degradation (system still functions partially when a component fails)
  retry with exponential backoff (retry failed requests with increasing delays)
  circuit breaker (stop requests to a failing service to prevent cascade failures)
```

### Cloud and DevOps

```
Infrastructure:
  provisioning (setting up and configuring infrastructure)
  deployment pipeline (automated sequence: code → build → test → deploy)
  rollback (revert to a previous version)
  blue/green deployment (two identical environments — switch traffic between them)
  canary release (roll out to small % of users first, monitor, then expand)
  
Container/Orchestration:
  containerize (package application and dependencies into a Docker image)
  orchestrate (automatically manage multiple containers — Kubernetes)
  replica (copy of a running service for redundancy and load distribution)
  horizontal scaling (adding more instances of a service)
  vertical scaling (adding more CPU/RAM to an existing instance)
  
Monitoring:
  telemetry (data about system behavior: metrics, logs, traces)
  alerting (automatic notification when metric exceeds threshold)
  SLA (Service Level Agreement — contractual uptime commitment)
  SLO (Service Level Objective — internal target: e.g., 99.9% uptime)
  SLI (Service Level Indicator — the actual measured metric)
  
  Example: "Our SLA with the client is 99.9% uptime. Our SLO is 99.95% to
           give us a buffer. Our SLI — measured uptime this quarter — was 99.97%."
```

### System Design Vocabulary

```
Distributed systems:
  consistency (all nodes see the same data at the same time)
  availability (system responds to every request, even during failures)
  partition tolerance (system works even if network partitions occur)
  eventual consistency (data will become consistent — but not immediately)
  replication lag (delay between a write on primary and update on replicas)
  
Scalability:
  stateless (no session data on server — any instance can serve any request)
  sharding (splitting data across multiple database instances by a shard key)
  connection pooling (reusing database connections instead of creating new ones)
  CDN (Content Delivery Network — edge servers closer to users)
  
Patterns:
  pub/sub (publisher sends messages to a topic; subscribers receive them)
  event-driven (components react to events rather than calling each other directly)
  saga pattern (managing distributed transactions via a sequence of local transactions)
  CQRS (Command Query Responsibility Segregation — separate read/write models)
```

---

## Writing Technical Documents

### Bug Reports

```
A good bug report contains exactly what a developer needs to reproduce and fix the issue.

Template:
  Title:          One-sentence summary (specific and scannable)
  Environment:    OS, browser/runtime, version numbers
  Steps to Reproduce: Numbered, precise steps
  Expected Result: What should happen
  Actual Result:  What actually happens
  Screenshots/Logs: Error messages, stack traces
  Severity:       Critical / High / Medium / Low
  Assignee:       Who should look at this

Bad bug report:
  "The login doesn't work"

Good bug report:
  Title: "POST /auth/login returns 500 when email contains uppercase letters"
  
  Environment:
    - Node.js 22.17.0, Express 4.18
    - Tested on: Chrome 120, Safari 17 (same result)
  
  Steps to Reproduce:
    1. Navigate to /login
    2. Enter email: "User@Example.com" (note uppercase U and E)
    3. Enter any valid password
    4. Click "Login"
  
  Expected Result:
    User is authenticated and redirected to dashboard (as with lowercase email)
  
  Actual Result:
    Server returns 500 Internal Server Error
    Error log: "TypeError: Cannot read property 'toLowerCase' of undefined"
    Stack trace: auth.controller.ts:42 → user.service.ts:87
  
  Root Cause (if known):
    email.toLowerCase() is called before null check — fails if email is undefined
    after the query returns no match (case-sensitive DB query).
  
  Severity: High — blocks users with email clients that auto-capitalize
```

### Commit Messages

```
Format: <type>(<scope>): <short description>
        [blank line]
        [optional body — what and why, not how]
        [optional footer — breaking changes, issue references]

Types:
  feat:     New feature
  fix:      Bug fix
  refactor: Code restructuring (no behavior change)
  perf:     Performance improvement
  test:     Adding/updating tests
  docs:     Documentation only
  chore:    Build tools, dependencies, CI config

Good commit messages:
  feat(auth): add OAuth2 login with Google

  Implements Google OAuth2 flow using passport.js.
  Users can now sign in with their Google account.
  Session is stored in Redis with 24h TTL.

  Closes #142

  fix(database): prevent N+1 query in order listing

  Replaced per-order user lookup loop with a single JOIN query.
  Reduces database calls from O(n) to O(1) for the /orders endpoint.
  Average response time improved from 1.8s to 140ms.

  Refs #156

Bad commit messages (avoid these):
  "fix stuff"
  "WIP"
  "update"
  "changes"
  "asdfgh"
```

---

## Explaining Technical Concepts to Non-Technical People

```
The Feynman technique for engineers:
  1. Explain it in plain words (no jargon)
  2. If you need jargon, define it immediately
  3. Use an analogy from everyday life
  4. Confirm understanding before going deeper

Common analogies:
  Database:        "Like a very organized filing cabinet — data is stored in 
                   labeled folders (tables) and you can find any file instantly"
                   
  API:             "Like a waiter in a restaurant — you (the app) tell the waiter 
                   (API) what you want, they go to the kitchen (server) and bring 
                   back your order (response)"
                   
  Cache:           "Like keeping your most-used tools on your desk instead of 
                   going to the storage room every time"
                   
  Load balancer:   "Like a traffic officer directing cars to different lanes to 
                   prevent any one lane from getting jammed"
                   
  Docker container: "Like a shipping container — contains everything the application 
                    needs to run, works the same way on any ship (server)"

Communicating slowdowns/outages to management:
  Don't say: "There's an N+1 query problem causing database connection pool exhaustion"
  Do say:    "A performance issue is causing our order page to load slowly.
             We've identified the cause and are deploying a fix in the next 30 minutes.
             No data has been lost. Approximately 200 users in the past hour experienced
             slow load times. We're monitoring and will send an update at 4pm."
  
  Formula: What happened → Who is affected → Status of fix → Next update time
```

---

## Professional Email and Slack Patterns

```
Email for requesting a technical review:
  Subject: [Review Request] Database sharding design for orders table — PRD-204

  Hi [Team],

  I've completed the design for horizontal sharding of our orders table and would 
  appreciate your feedback before we proceed to implementation.

  Summary of the design:
    - Shard key: user_id (consistent hash ring with 16 virtual nodes)
    - 4 initial shards, expandable to 16 without re-sharding
    - Read replicas on each shard for reporting queries
    - Estimated query latency improvement: 60% reduction at 10M+ records

  Design document: [link]
  Discussion deadline: Thursday EOD

  Specific feedback I'm looking for:
    1. Is user_id a good shard key for our query patterns?
    2. Are there any cross-shard query scenarios I haven't addressed?
    3. Migration strategy — does the phased approach make sense?

  Happy to discuss in our Thursday design review.

  Thanks,
  [Your name]

Slack — being clear and concise:
  Bad: "hey so i was working on the auth thing and it's not working"
  
  Good: "@[person] Auth issue: POST /login returns 403 for users created before 
        March 2025. Seems related to the JWT secret rotation we did last week.
        Looking into it now. ETA: 1 hour."
  
  Format for asking for help:
  "I'm working on [task]. I expected [X] but I'm seeing [Y].
  I've already tried [A] and [B]. Is there something obvious I'm missing?
  [Code snippet or link]"
```

---

## Disagreeing Professionally in Technical Discussions

```
Scenario: Your team lead proposes storing sessions in the database.
          You believe Redis is better. How do you disagree?

WRONG approach:
  "That won't work. Redis is obviously better for sessions."
  (Dismissive, doesn't explain reasoning, creates conflict)

RIGHT approach — the SEEP framework:
  State your position once, briefly
  Explain your reasoning with data
  Explore their perspective (ask why)
  Propose a path forward

  "I see the appeal of using the database for sessions — it's simpler
  to operate. I do have a concern though: with 50,000 concurrent users,
  session reads will add significant load to our primary database, which
  could impact query performance during peak hours. 
  
  I'm curious about the motivation behind the database approach — is it
  about simplifying our infrastructure? If so, we could potentially use
  Redis with persistence enabled, which would give us simplicity while
  keeping session reads off the main database.
  
  I'm happy to benchmark both approaches if you think it would help
  the decision."

Key phrases for professional disagreement:
  "I see the reasoning behind that, and I'd like to add a consideration..."
  "That's an interesting approach. I wonder if we've accounted for..."
  "I may be missing something, but wouldn't X also cause Y?"
  "Could we explore X as an alternative? My concern with the current proposal is..."
  "I want to make sure we've considered [risk]. How are you thinking about that?"
```

---

## Cheat Sheet

```
Technical vocabulary quick reference:
  latency:      time from request to response (ms)
  throughput:   requests processed per second
  bottleneck:   the slowest component
  idempotent:   same request, same result
  sharding:     splitting DB across instances
  canary:       rolling out to small % first
  SLA/SLO/SLI: agreement / objective / measured indicator

Bug report essentials:
  Title → Steps to Reproduce → Expected → Actual → Severity

Commit format:
  feat/fix/refactor/perf/test/docs/chore(scope): description
  Body: why, not what

Explaining to non-technical people:
  Use analogies. Lead with impact, not implementation.
  Format: What happened → Who affected → Fix status → Next update

Disagreeing professionally (SEEP):
  State position → Explain reasoning → Explore their view → Propose forward

Email subject format:
  [Type] Description — [Ticket Reference]
  e.g., "[Review Request] Cache invalidation design — ENG-407"
```
