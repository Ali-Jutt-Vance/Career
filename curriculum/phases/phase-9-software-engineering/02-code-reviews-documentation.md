# Phase 9 — Chapter 2: Code Reviews, Documentation, and ADRs

---

## Chapter Overview

Code reviews are the primary mechanism for knowledge sharing, quality assurance, and mentorship in professional software teams. Documentation is how teams scale knowledge. Architecture Decision Records (ADRs) capture why decisions were made.

**Topics:**
- Code review best practices (author and reviewer)
- PR description standards
- Review anti-patterns to avoid
- Technical documentation types
- README standards
- Architecture Decision Records (ADRs)
- When to document vs. when code speaks for itself

---

## Code Reviews

### For Authors (PR Submitter)

```
Before opening a PR:
  ✓ Self-review your diff first (catch obvious issues)
  ✓ Write a clear PR description (what, why, how to test)
  ✓ Keep PRs small: aim for < 400 lines changed
  ✓ One PR = one logical change (don't mix features + refactors)
  ✓ Reference the ticket/issue
  ✓ Add screenshots for UI changes
  ✓ Mark WIP/draft if not ready for full review

PR Description template:
  ## What
  [1-2 sentences: what does this change do?]
  
  ## Why
  [Why is this change needed? Link to ticket/design doc]
  
  ## How
  [Key implementation decisions. What's non-obvious?]
  
  ## Testing
  [How to test this manually. What automated tests cover it?]
  
  ## Checklist
  - [ ] Tests added/updated
  - [ ] Documentation updated
  - [ ] No console.log left in
  - [ ] Env vars documented

Responding to feedback:
  Address every comment (resolve or discuss)
  If you disagree: explain why, don't just ignore it
  "Done" or a commit reference for implemented fixes
  Thank reviewers — it's free learning
```

### For Reviewers

```
What to look for (in priority order):
  1. Correctness:  Does it do what it's supposed to?
  2. Tests:        Are there tests? Do they test the right things?
  3. Security:     SQL injection, XSS, auth bypass, secret exposure?
  4. Performance:  N+1 queries, missing indexes, unnecessary work?
  5. Design:       Is this the right approach? Could it be simpler?
  6. Readability:  Is the code clear? Are names good?
  7. Style:        Is it consistent with the codebase? (lowest priority)

How to give feedback:
  Be specific: "This will cause N+1 queries" not "bad code"
  Explain why: "This loop runs O(n²) — try a hash map"
  Offer alternatives: "Consider using Array.reduce() here instead"
  Distinguish blocking from non-blocking:
    [MUST]: blocking, must fix before merge
    [NIT]: optional, your choice
    [QUESTION]: asking for clarification, not a request to change
  Be kind: "Could we..." / "What do you think about..." / "I noticed..."
  NOT: "This is wrong", "Why would you do this?", "Bad"

What NOT to nitpick:
  Code formatting (let the linter/prettier handle it)
  Naming that's fine but not your preference
  "I would have done it differently" without a clear benefit
  Personal style in comments that don't affect behavior

Review timing:
  Review within 1 business day (unreviewed PRs block teammates)
  If you can't review in time, say so
  Use GitHub review request to assign correct reviewer
```

---

## Architecture Decision Records (ADRs)

```
ADR: a short document capturing an important architectural decision.
  When: chosen a database, a framework, an API pattern, a caching strategy.
  Why: future team members will ask "why did we use MongoDB?" — ADR answers it.
  Format: Michael Nygard's template (most common)

ADR Template:
────────────────────────────────────────
# ADR-{number}: {Title}

Date: YYYY-MM-DD
Status: Proposed | Accepted | Deprecated | Superseded by ADR-{N}

## Context
What is the problem we're solving? What forces are at play?
What are the constraints?

## Decision
What did we decide to do?

## Consequences
What are the positive and negative consequences of this decision?
What becomes easier? What becomes harder?

## Alternatives Considered
What else did we consider? Why was this option chosen?
────────────────────────────────────────

Example ADR:
────────────────────────────────────────
# ADR-007: Use PostgreSQL with pgvector for Vector Search

Date: 2025-03-15
Status: Accepted

## Context
We need to add semantic search for our document knowledge base.
We evaluated: Pinecone, Qdrant, Weaviate, and pgvector.
Our infrastructure already uses PostgreSQL on RDS.
Team has strong SQL expertise. Vector dataset: ~500K documents.

## Decision
Use pgvector extension on our existing PostgreSQL RDS instance.

## Consequences
Positive:
  - No new infrastructure (reuses existing RDS)
  - SQL joins with existing tables (filter by org_id, etc.)
  - Team already knows PostgreSQL
  - HNSW index supports our query volume (< 1,000 searches/min)
Negative:
  - Not as performant as dedicated vector DBs for >10M vectors
  - Must be revisited if vector count exceeds 5M or QPS exceeds 5,000

## Alternatives Considered
  Pinecone: best managed solution but $70+/month, new dependency
  Qdrant: excellent performance, would require Docker/K8s deployment
  Weaviate: hybrid search built-in, higher operational complexity
────────────────────────────────────────

Store ADRs in: docs/adr/ directory in the repository
File format: 0007-use-pgvector.md
Never delete ADRs — mark as Deprecated/Superseded
```

---

## Documentation Standards

```
What to document:
  ✓ Project README (every repository)
  ✓ Architecture decisions (ADRs)
  ✓ Non-obvious "why" in code (comments)
  ✓ API contracts (OpenAPI/Swagger)
  ✓ Runbooks (how to deploy, rollback, debug)
  ✓ Onboarding guide

What NOT to document:
  ✗ Every function (self-explanatory code speaks for itself)
  ✗ What the code does (just read the code)
  ✗ Outdated docs that nobody updates (worse than no docs)

README template:
  # Project Name
  One-line description.

  ## Quick Start
  ```
  git clone ...
  cd project
  npm install
  cp .env.example .env  # fill in values
  npm run dev
  ```
  
  ## Architecture
  [Brief overview, diagram if helpful]
  
  ## Environment Variables
  | Variable        | Description              | Required |
  |-----------------|--------------------------|----------|
  | DATABASE_URL    | PostgreSQL connection URL | Yes      |
  | REDIS_URL       | Redis connection URL      | Yes      |
  | JWT_SECRET      | JWT signing secret        | Yes      |
  
  ## Development
  [How to run tests, linting, build]
  
  ## Deployment
  [How to deploy, what CI/CD does]
  
  ## Contributing
  [PR guidelines, code style, review process]

Good code comments:
  // Why: not what
  // GOOD: cache here because this query runs 10,000x/day and takes 200ms
  // BAD:  cache the result

  // Warn about non-obvious behavior
  // GOOD: avoid using `Date.now()` here — breaks idempotency in tests
  
  // Reference external context
  // GOOD: See RFC-3986 for URI encoding rules — this handles edge case X
```

---

## Interview Preparation

**Q1: What makes a good code review?**
A: A good code review: focuses on correctness, security, and design before style. Is specific — points to exact lines with clear explanations. Explains WHY, not just what to change. Distinguishes blocking issues from optional suggestions (use MUST/NIT/QUESTION labels). Is done promptly (within 1 business day). Is kind — frames feedback as collaboration, not criticism. Covers: does it work, are there tests, are there security issues, does the design make sense. A good code review is NOT a hunt for every imperfection — it's asking "is this safe to ship?" and "does this improve the codebase?" Great reviewers ask questions to understand intent before judging.

**Q2: When should you write an ADR?**
A: Write an ADR whenever you make a significant architectural decision that: 1) Affects multiple teams or services. 2) Involves choosing between meaningful alternatives (database, framework, pattern). 3) Will constrain future development. 4) Would be non-obvious to future team members. Examples: choosing a database type, adopting a new framework, deciding on a caching strategy, choosing sync vs. async communication, selecting a deployment platform. You don't need an ADR for: implementation details within a service, bug fixes, routine configuration changes. The test: "Will a new engineer ask 'why did we do it this way?' in 6 months?" If yes, write an ADR.

---

## Cheat Sheet

```
PR review labels:
  [MUST]: blocking — must fix before merge
  [NIT]:  optional, take it or leave it
  [QUESTION]: need clarification, not necessarily a change

Good reviewer checklist:
  ✓ Does it work? (correctness)
  ✓ Does it have tests?
  ✓ Any security issues?
  ✓ Any performance issues?
  ✓ Is the design right?
  ✓ Is it readable?

ADR when:
  ✓ Choosing between meaningful database/framework/pattern alternatives
  ✓ Decision affects multiple teams
  ✓ Decision constrains future work
  ✓ "Why did we do it this way?" would be asked later

ADR fields:
  Status: Proposed | Accepted | Deprecated | Superseded by ADR-N
  Context: the problem
  Decision: what we chose
  Consequences: pros + cons
  Alternatives: what else was considered

Documentation priority:
  1. README (every repo)
  2. ADRs (architecture decisions)
  3. API docs (OpenAPI)
  4. Runbooks (ops procedures)
  5. Comments (non-obvious code only)
```
