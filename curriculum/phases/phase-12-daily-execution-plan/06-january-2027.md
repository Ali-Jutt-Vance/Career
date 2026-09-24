# Phase 12 — Chapter 6: January 2027

> **31 days · Day 99 to Day 129 · 62 scheduled hours · 5 rest days**

## Chapter Overview

This chapter covers weeks 14, 15, 16, 17, 18 of the fifty-week plan. Every day below is a contract with yourself. Tick the tasks in the reader's **Plan** tab as you finish them — the app tracks your streak and completion rate across all 353 days.

| Week | Dates | Hours | Apps | DSA | Focus | Milestone |
|---|---|---|---|---|---|---|
| **W14** | 01 Jan – 03 Jan | 14h | 5 | Queues & deques | SQL I — Selects, Joins, Thinking in Sets | You can write a three-table join with grouping and a having clause from a blank editor, first try, without looking up the syntax. |
| **W15** | 04 Jan – 10 Jan | 14h | 5 | Linked lists — traversal & reversal | SQL II — Window Functions and the Hard Queries | You can produce a per-group top-N query and a running total with a window function, from memory, and explain what the frame clause does. |
| **W16** | 11 Jan – 17 Jan | 14h | 5 | Linked lists — cycle & merge | Schema Design and Normalization | Given a described business problem you can produce a normalised schema on paper in twenty minutes and defend each decision. |
| **W17** | 18 Jan – 24 Jan | 14h | 5 | Binary search — exact match | PostgreSQL in Depth | You can use psql without a GUI, and you can explain why timestamptz and numeric exist and what goes wrong without them. |
| **W18** | 25 Jan – 31 Jan | 14h | 5 | Binary search — on the answer | Indexes and Query Plans | You can read an EXPLAIN ANALYZE plan, say which line is the problem, and predict whether an index will help before you create it. |

---

## Week 14 — SQL I — Selects, Joins, Thinking in Sets

*Block III — Databases · 14 hours*

You have written SQL for three years and most of it was generated. SQL is the highest-return subject in this book: asked in almost every interview, testable in fifteen minutes, and being genuinely good at it is rare enough to be a differentiator.

**Chapters this week:**

- [Sql](#phase-3-databases--sql)

**Deliverable:** A seeded PostgreSQL practice database of five related tables and a few thousand rows, plus forty solved exercises written by hand with no AI and no copied answers.

**Milestone:** You can write a three-table join with grouping and a having clause from a blank editor, first try, without looking up the syntax.

**Applications this week:** 5

**DSA drill:** Queues & deques — 3 problems

### Day 99 — Friday 1 January 2027

**Subqueries and CTEs**

| Time | Track | Task |
|---|---|---|
| `05:00–06:30` | **Engineering** | Phase 3 Chapter 1 — subqueries, correlated subqueries, and common table expressions. Ten exercises. Rewrite three of them both ways and note which reads better and why. |
| `13:00–13:30` | **Job Hunt** | Update the CV: PostgreSQL moves from a listed skill to a sentence about what you did with it. |

*Total: 2h 0m*

### Day 100 — Saturday 2 January 2027

**SQL under time pressure**

| Time | Track | Task |
|---|---|---|
| `08:00–10:00` | **Engineering** | Deep build, two hours, no AI: connect Project 1 to PostgreSQL. Replace in-memory storage with real tables and hand-written SQL. No ORM yet, on purpose — you will appreciate it more in week 20. |
| `10:30–11:30` | **Engineering** | Drill: five SQL questions, fifteen minutes each, blank editor, no reference. This is exactly the format of a screening test. |
| `12:00–13:00` | **Review** | Weekly review. Count your forty exercises honestly. Read next week ahead. |

*Total: 4h 0m*

### Day 101 — Sunday 3 January 2027 · REST

No tasks. Sunday is a genuine day off and it is part of the plan, not a gap in it. Rest is what makes fourteen hours a week survivable for fifty straight weeks.

## Week 15 — SQL II — Window Functions and the Hard Queries

*Block III — Databases · 14 hours*

The second SQL week, and the one that makes you unusual. Window functions are asked at tier 2, rarely known at tier 4, and they turn a category of "impossible without application code" questions into four lines.

**Chapters this week:**

- [Sql](#phase-3-databases--sql)
- [Query Optimization](#phase-3-databases--query-optimization)

**Deliverable:** week-15/ containing thirty more solved exercises covering window functions, ranking, running totals, gaps and islands, and set operations.

**Milestone:** You can produce a per-group top-N query and a running total with a window function, from memory, and explain what the frame clause does.

**Applications this week:** 5

**DSA drill:** Linked lists — traversal & reversal — 4 problems

### Day 102 — Monday 4 January 2027

**Window functions — the model**

| Time | Track | Task |
|---|---|---|
| `05:00–06:30` | **Engineering** | Phase 3 Chapter 1 — window functions. OVER, PARTITION BY, ORDER BY, and how a window differs from a GROUP BY: the rows stay. Six exercises. Say the difference out loud before you move on. |
| `13:00–13:30` | **Job Hunt** | Two applications, tailored, logged. |

*Total: 2h 0m*

### Day 103 — Tuesday 5 January 2027

**Ranking and per-group top-N**

| Time | Track | Task |
|---|---|---|
| `05:00–06:30` | **Engineering** | ROW_NUMBER, RANK, DENSE_RANK, and the per-group top-N pattern. Six exercises. This exact question — "the three biggest orders for each customer" — is asked constantly and beats most candidates. |
| `13:00–13:30` | **Communication** | Explain the difference between RANK and DENSE_RANK aloud, with an example, in sixty seconds. |

*Total: 2h 0m*

### Day 104 — Wednesday 6 January 2027

**Running totals and frames**

| Time | Track | Task |
|---|---|---|
| `05:00–06:30` | **Engineering** | Running totals, moving averages, LAG and LEAD, and the frame clause (ROWS versus RANGE). Six exercises. The frame clause is where people who half-know window functions come unstuck. |
| `13:00–13:30` | **Job Hunt** | Two applications, tailored, logged. |

*Total: 2h 0m*

### Day 105 — Thursday 7 January 2027

**Set operations and gaps**

| Time | Track | Task |
|---|---|---|
| `05:00–06:30` | **Engineering** | UNION versus UNION ALL, INTERSECT, EXCEPT, and the gaps-and-islands pattern for finding missing sequences and consecutive runs. Six exercises. |
| `13:00–13:30` | **Communication** | Fifth application. Then rehearse: "tell me about the most complex query you have written." |

*Total: 2h 0m*

### Day 106 — Friday 8 January 2027

**Rewrite your own queries**

| Time | Track | Task |
|---|---|---|
| `05:00–06:30` | **Engineering** | Six exercises against your Project 1 data. Then find two places in Project 1 where you pulled rows into Node and looped over them, and replace each with one query. Write down how many round trips you removed. |
| `13:00–13:30` | **Job Hunt** | Check the funnel: how many replies from your first thirty applications? Under three means the CV is the problem, not the volume. |

*Total: 2h 0m*

### Day 107 — Saturday 9 January 2027

**Reporting endpoints, done in SQL**

| Time | Track | Task |
|---|---|---|
| `08:00–10:00` | **Engineering** | Deep build, two hours, no AI: add three reporting endpoints to Project 1 that would have been painful without window functions. All the work happens in the database. |
| `10:30–11:30` | **Engineering** | Drill: five SQL questions, timed, blank editor. Include one window function question. |
| `12:00–13:00` | **Review** | Weekly review. Read next week ahead. |

*Total: 4h 0m*

### Day 108 — Sunday 10 January 2027 · REST

No tasks. Sunday is a genuine day off and it is part of the plan, not a gap in it. Rest is what makes fourteen hours a week survivable for fifty straight weeks.

## Week 16 — Schema Design and Normalization

*Block III — Databases · 14 hours*

Design questions separate three-year engineers from each other. Anyone can query a schema someone else designed. This week is designing one that does not have to be rescued in eighteen months.

**Chapters this week:**

- [Database Design](#phase-3-databases--database-design)
- [Normalization](#phase-3-databases--normalization)
- [The Interview Conversation](#phase-10-english-communication--the-interview-conversation)

**Deliverable:** A designed, documented and migrated schema for Project 1 — entities, relationships, keys, constraints — with a written justification for every denormalisation you chose.

**Milestone:** Given a described business problem you can produce a normalised schema on paper in twenty minutes and defend each decision.

**Applications this week:** 5

**DSA drill:** Linked lists — cycle & merge — 3 problems

### Day 109 — Monday 11 January 2027

**Entities, relationships, keys**

| Time | Track | Task |
|---|---|---|
| `05:00–06:30` | **Engineering** | Phase 3 Chapter 4 (Database Design) — entities, relationships, primary and foreign keys, one-to-many and many-to-many. Redesign the Project 1 schema on paper before touching a migration file. |
| `13:00–13:30` | **Job Hunt** | Two applications, tailored, logged. |

*Total: 2h 0m*

### Day 110 — Tuesday 12 January 2027

**Normal forms as anomalies prevented**

| Time | Track | Task |
|---|---|---|
| `05:00–06:30` | **Engineering** | Phase 3 Chapter 5 (Normalization) — first, second and third normal form. Learn each as the anomaly it prevents, not a definition to recite. Then find a table at your current job that violates 3NF and write what could go wrong. |
| `13:00–13:30` | **Communication** | Read Phase 10 Chapter 3 (The Interview Conversation). Note the three things you currently do that the chapter warns against. |

*Total: 2h 0m*

### Day 111 — Wednesday 13 January 2027

**Constraints are enforced documentation**

| Time | Track | Task |
|---|---|---|
| `05:00–06:30` | **Engineering** | Phase 3 Chapter 4 — constraints. NOT NULL, UNIQUE, CHECK, foreign keys, ON DELETE behaviour. No AI: add real constraints to every Project 1 table, then try to insert bad data and watch the database refuse it. |
| `13:00–13:30` | **Job Hunt** | Two applications, tailored, logged. |

*Total: 2h 0m*

### Day 112 — Thursday 14 January 2027

**When to denormalise, and how to say so**

| Time | Track | Task |
|---|---|---|
| `05:00–06:30` | **Engineering** | Phase 3 Chapter 5 — denormalisation as a trade of write complexity for read speed. Write every one you have chosen into PROJECT1.md with the exact reason. If you cannot write the reason, undo it. |
| `13:00–13:30` | **Communication** | Fifth application. Then practise "how would you design the schema for X" using your own project, ninety seconds, aloud. |

*Total: 2h 0m*

### Day 113 — Friday 15 January 2027

**Migrations, properly**

| Time | Track | Task |
|---|---|---|
| `05:00–06:30` | **Engineering** | No AI: move the schema into versioned migrations. Write one that adds a column and one that backfills it, then roll both back. A schema you cannot roll back is a schema you cannot change. |
| `13:00–13:30` | **Job Hunt** | Ask one referral contact directly whether they would refer you. Have the CV and a two-line summary ready in the same message. |

*Total: 2h 0m*

### Day 114 — Saturday 16 January 2027

**Design under interview conditions**

| Time | Track | Task |
|---|---|---|
| `08:00–10:00` | **Engineering** | Deep build, two hours, no AI: finish the Project 1 schema — every entity, relationship and constraint, seeded with realistic data by a script you wrote. |
| `10:30–11:30` | **Engineering** | Drill: design a normalised schema for a clinic, a courier and a small marketplace. Twenty minutes each, on paper, timed. |
| `12:00–13:00` | **Review** | Weekly review. Read next week ahead. |

*Total: 4h 0m*

### Day 115 — Sunday 17 January 2027 · REST

No tasks. Sunday is a genuine day off and it is part of the plan, not a gap in it. Rest is what makes fourteen hours a week survivable for fifty straight weeks.

## Week 17 — PostgreSQL in Depth

*Block III — Databases · 14 hours*

PostgreSQL specifically, not "a database". Types that prevent bugs, JSONB for the genuinely schemaless parts, psql instead of a GUI, and the features that make Postgres the default answer at the companies you are targeting.

**Chapters this week:**

- [Postgresql](#phase-3-databases--postgresql)

**Deliverable:** Project 1 using correct Postgres types throughout, one justified JSONB column with an index on it, and a written note on every type choice you changed and why.

**Milestone:** You can use psql without a GUI, and you can explain why timestamptz and numeric exist and what goes wrong without them.

**Applications this week:** 5

**DSA drill:** Binary search — exact match — 3 problems

### Day 116 — Monday 18 January 2027

**Types that prevent bugs**

| Time | Track | Task |
|---|---|---|
| `05:00–06:30` | **Engineering** | Phase 3 Chapter 2 (PostgreSQL) — types. timestamptz versus timestamp, numeric versus float for money, text versus varchar, enums, arrays. Fix every wrong type in Project 1 and write down what each one could have cost you. |
| `13:00–13:30` | **Job Hunt** | Two applications, tailored, logged. |

*Total: 2h 0m*

### Day 117 — Tuesday 19 January 2027

**psql, properly**

| Time | Track | Task |
|---|---|---|
| `05:00–06:30` | **Engineering** | Phase 3 Chapter 2 — psql. \dt, \d+, \timing, \x, \ef, and running a file. Stop using a GUI for the rest of the plan. Then inspect your own schema entirely from the command line. |
| `13:00–13:30` | **Communication** | Write a two-minute answer to "why PostgreSQL for this project?" about your project specifically, not a generic comparison. |

*Total: 2h 0m*

### Day 118 — Wednesday 20 January 2027

**JSONB, and when a column is a document**

| Time | Track | Task |
|---|---|---|
| `05:00–06:30` | **Engineering** | Phase 3 Chapter 2 — JSONB. Operators, containment, and GIN indexes. The honest answer to when it is correct: genuinely schemaless data, not a way to avoid designing a table. Add one justified JSONB column to Project 1, query it, and index it. |
| `13:00–13:30` | **Job Hunt** | Two applications, tailored, logged. |

*Total: 2h 0m*

### Day 119 — Thursday 21 January 2027

**Constraints, defaults and generated columns**

| Time | Track | Task |
|---|---|---|
| `05:00–06:30` | **Engineering** | Phase 3 Chapter 2 — CHECK constraints, defaults, generated columns, and partial unique indexes. Push one rule that currently lives in your Node code down into the database, and notice that it is now impossible to violate. |
| `13:00–13:30` | **Communication** | Fifth application. Then rehearse: "where do you put business rules — application or database?" Have a real position and a reason. |

*Total: 2h 0m*

### Day 120 — Friday 22 January 2027

**Full-text search, before you reach for Elasticsearch**

| Time | Track | Task |
|---|---|---|
| `05:00–06:30` | **Engineering** | Phase 3 Chapter 2 — tsvector, tsquery and full-text search. Add search to Project 1 with Postgres alone. Knowing that Postgres can do this is worth an interview answer on its own, because most people add a second system too early. |
| `13:00–13:30` | **Job Hunt** | Update the CV with a specific Postgres line — JSONB, or full-text search, or the type corrections. |

*Total: 2h 0m*

### Day 121 — Saturday 23 January 2027

**Make the data layer solid**

| Time | Track | Task |
|---|---|---|
| `08:00–10:00` | **Engineering** | Deep build, two hours, no AI: every type correct, constraints in place, search working, JSONB where justified. Then write the data-layer section of PROJECT1.md explaining each decision. |
| `10:30–11:30` | **Engineering** | Drill: five SQL and Postgres questions, timed. Then explain JSONB versus a normalised table aloud, with your own example. |
| `12:00–13:00` | **Review** | Weekly review. Read next week ahead. |

*Total: 4h 0m*

### Day 122 — Sunday 24 January 2027 · REST

No tasks. Sunday is a genuine day off and it is part of the plan, not a gap in it. Rest is what makes fourteen hours a week survivable for fifty straight weeks.

## Week 18 — Indexes and Query Plans

*Block III — Databases · 14 hours*

The single most valuable week in the plan for your market position. Very few three-year candidates in this market can honestly say "I read query plans". After this week you can, with numbers from your own project.

**Chapters this week:**

- [Indexes](#phase-3-databases--indexes)
- [Query Optimization](#phase-3-databases--query-optimization)

**Deliverable:** A written before-and-after for five queries you indexed, with the EXPLAIN ANALYZE output for each and the timing difference.

**Milestone:** You can read an EXPLAIN ANALYZE plan, say which line is the problem, and predict whether an index will help before you create it.

**Applications this week:** 5

**DSA drill:** Binary search — on the answer — 4 problems

### Day 123 — Monday 25 January 2027

**What an index actually is**

| Time | Track | Task |
|---|---|---|
| `05:00–06:30` | **Engineering** | Phase 3 Chapter 7 (Indexes) — B-tree structure, and why an index is a trade: faster reads, slower writes, more disk. Look at your tables and predict which columns need indexes before measuring anything. Write the predictions down. |
| `13:00–13:30` | **Job Hunt** | Two applications, tailored, logged. |

*Total: 2h 0m*

### Day 124 — Tuesday 26 January 2027

**EXPLAIN ANALYZE**

| Time | Track | Task |
|---|---|---|
| `05:00–06:30` | **Engineering** | Phase 3 Chapter 8 (Query Optimization) — reading a plan. Sequential scan versus index scan, nested loop versus hash versus merge join, and what the cost, rows and actual time numbers mean. Run it on five of your own queries and read every line. |
| `13:00–13:30` | **Communication** | Write a two-minute explanation of what an index is for a non-technical manager, then a ninety-second one for an interviewer. Both aloud. |

*Total: 2h 0m*

### Day 125 — Wednesday 27 January 2027

**Composite indexes and column order**

| Time | Track | Task |
|---|---|---|
| `05:00–06:30` | **Engineering** | Phase 3 Chapter 7 — composite indexes and why column order matters. No AI: create one, then write one query it helps and one it does not, and prove both with EXPLAIN. The left-prefix rule is a standard interview question. |
| `13:00–13:30` | **Job Hunt** | Two applications, tailored, logged. |

*Total: 2h 0m*

### Day 126 — Thursday 28 January 2027

**The other index types**

| Time | Track | Task |
|---|---|---|
| `05:00–06:30` | **Engineering** | Phase 3 Chapter 7 — partial indexes, covering indexes and index-only scans, GIN for JSONB and full-text. Add a partial index to Project 1 where most rows are irrelevant, and measure the size difference. |
| `13:00–13:30` | **Communication** | Fifth application. Then rehearse: "this query is slow. Walk me through what you would do." Have an ordered method, not a guess. |

*Total: 2h 0m*

### Day 127 — Friday 29 January 2027

**The optimisations that are not indexes**

| Time | Track | Task |
|---|---|---|
| `05:00–06:30` | **Engineering** | Phase 3 Chapter 8 — SELECT *, N+1, unnecessary sorts, functions on indexed columns that disable them, and pagination that degrades. Find at least three of these in your own code and fix them. |
| `13:00–13:30` | **Job Hunt** | Update the CV with a measured number: "reduced X from Nms to Mms". You now have real ones. |

*Total: 2h 0m*

### Day 128 — Saturday 30 January 2027

**Measure everything**

| Time | Track | Task |
|---|---|---|
| `08:00–10:00` | **Engineering** | Deep build, two hours, no AI: index Project 1 properly. Five queries, before and after, EXPLAIN ANALYZE output saved for each. Then write it up — that document is interview material for the rest of the plan. |
| `10:30–11:30` | **Engineering** | Drill: five query-plan questions, timed. Read a plan and say what is wrong with it. |
| `12:00–13:00` | **Review** | Weekly review. Read next week ahead. |

*Total: 4h 0m*

### Day 129 — Sunday 31 January 2027 · REST

No tasks. Sunday is a genuine day off and it is part of the plan, not a gap in it. Rest is what makes fourteen hours a week survivable for fifty straight weeks.

