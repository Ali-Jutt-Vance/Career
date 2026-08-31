# Phase 0 — Chapter 3: The Path — Beginner to Mastery

> *"An expert is a person who has made all the mistakes that can be made in a very narrow field."* — Niels Bohr

---

## Chapter Overview

"Senior engineer" is not a quantity of years. It is a set of specific, observable behaviours, and the reason many engineers stall at mid-level for a decade is that nobody ever told them which behaviours those are. They keep getting better at the thing they were already good at — writing code that works — and never develop the things that actually define the next level.

This chapter is the map. It defines five levels of competence, tells you what each looks like from the outside, shows you how the curriculum ladders through them, and gives you a way to locate yourself honestly on each topic.

## The five levels

These apply to every topic in the book. You will be at different levels for different topics, and that is expected.

### Level 1 — Beginner: *I can follow a tutorial*

You can reproduce a working result by following instructions. You recognise the vocabulary. You can identify the technology when you see it. When something deviates from the tutorial, you are stuck.

**Observable behaviour:** copies code, changes the values, hopes.
**Typical statement:** "I've used Docker."
**In the book:** the *Chapter Overview* and *Beginner Theory* sections.

### Level 2 — Competent: *I can build the standard thing*

You can build a normal implementation without a tutorial. You know the common API surface. You can debug ordinary errors by reading the message. You do not yet know why the tool works the way it does, so unusual problems take a long time.

**Observable behaviour:** builds working software; reaches for Stack Overflow when it breaks in an unfamiliar way.
**Typical statement:** "I've built REST APIs with authentication."
**In the book:** *Basic Examples* and *Practical Tasks*.

**This is where most engineers with three years of experience sit, across most topics.** It is a perfectly respectable place to be, and it is also the exact ceiling that stops international senior offers.

### Level 3 — Proficient: *I understand the mechanism*

You know what the tool is doing underneath. You can predict its behaviour in situations you have not encountered. You know the failure modes and the cost model. You choose configurations deliberately rather than by default.

**Observable behaviour:** reads the error, forms a hypothesis, tests it, is usually right first time.
**Typical statement:** "Docker layer caching invalidates from the first changed layer down, so lockfiles get copied before source."
**In the book:** *Intermediate Concepts*, *Performance*, *Debugging*.

**This is the minimum bar for a senior offer.**

### Level 4 — Advanced: *I know the trade-offs and can defend a choice*

You know not only how it works but when not to use it. You can compare it against the alternatives with specifics rather than preferences. You can predict how it behaves at ten times the current scale, and you know which of your current decisions will break first.

**Observable behaviour:** argues both sides of a technical decision competently; names the conditions under which they would reverse it.
**Typical statement:** "We'd use SQS over Kafka here — we need at-least-once with a DLQ, not replay or ordering, and the operational cost of Kafka isn't justified below about 50K messages a second."
**In the book:** *Advanced Concepts*, *Alternatives*, *Industry Usage*, and the system design case studies.

**This is what gets you the upper half of the salary band.**

### Level 5 — Mastery: *I can teach it, extend it, and reason from first principles*

You can derive the correct approach for a novel problem without precedent. You can explain the topic clearly to someone at every other level. You know the history — why the design is the way it is, and what it was reacting against. You can read the source code when the documentation is insufficient.

**Observable behaviour:** teaches; writes; is the person others escalate to.
**Typical statement:** explains why MVCC makes Postgres `UPDATE` write a new row version, and what that implies for your index and vacuum strategy.
**In the book:** *Capstone Projects*, the *Interview Preparation* answers, and the act of writing your own explanations in `LOG.md`.

You will not reach level 5 in every topic in 442 hours. That is not the goal. The goal is **level 3 across the board, level 4 in your specialisation, and level 5 in two or three things you can be known for.**

## The realistic target profile by 1 January 2027

This is what the plan is actually engineered to produce.

| Topic | Start (typical) | Target | Weeks |
|---|---|---|---|
| JavaScript / TypeScript | 2–3 | **4** | 1–2 |
| Data structures & algorithms | 1–2 | **3** | 2, then daily |
| Node.js internals | 2 | **4** | 3 |
| API design (REST) | 2 | **4** | 4 |
| Authentication & authorisation | 2 | **4** | 5–6 |
| SQL & PostgreSQL | 2 | **4–5** | 7–8 |
| Caching, queues, Redis | 1–2 | **4** | 9 |
| Docker & CI/CD | 2 | **4** | 10 |
| AWS | 1–2 | **3–4** | 11, 17 |
| System design | 1–2 | **4** | 12, 14 |
| AI engineering / RAG | 0–1 | **4** | 15–16 |
| Frontend (React/Next.js) | 2 | **2** | Reference only — cut with the reduced budget |
| Infrastructure as code | 0–1 | **3** | 17 |
| Observability | 1 | **3** | 17 |
| English (IELTS) | — | **Band 7.5** | 1–13 |
| Client acquisition | 0–1 | **3** | 1–20, daily |

Note the deliberate asymmetry, which the reduced budget made sharper rather than softer. **Databases and system design are pushed to 4–5** because they are the highest-leverage discriminators in senior interviews and the ones fewest candidates have. **Frontend drops to level 2 and leaves the schedule entirely** — at 21 hours a week something had to go, and frontend is the cheapest thing to lose when you are not targeting frontend roles.

That is the general principle behind every cut: spending equal effort everywhere is how people end up mid-level at everything. A candidate who is level 4 at databases and level 2 at React beats a candidate who is level 3 at both, because interviews probe depth and discount breadth.

## How the curriculum ladders you through the levels

Each technical chapter is built as a ladder, and the daily plan tells you how far up it to climb on a given day.

```
Chapter Overview      →  context and motivation        (why this exists)
Beginner Theory       →  Level 1                       (the mental model)
Basic Examples        →  Level 1 → 2                   (make it work)
Practical Tasks       →  Level 2                       (make it work unaided)
Intermediate Concepts →  Level 2 → 3                   (understand the mechanism)
Mini Project          →  Level 3                       (apply it in combination)
Advanced Concepts     →  Level 3 → 4                   (know the edges)
Security / Performance/  Level 3 → 4                   (know the cost and the risk)
   Debugging
Industry Usage /      →  Level 4                       (know the trade-offs)
   Alternatives
Production Project    →  Level 4                       (operate it for real)
Interview Preparation →  Level 4                       (articulate it under pressure)
Capstone Project      →  Level 4 → 5                   (extend beyond the material)
Self Assessment       →  honest placement
Cheat Sheet           →  retention
```

The critical transition is **Level 2 → Level 3**, and it has exactly one reliable mechanism: **build it, break it deliberately, and explain it out loud.**

- *Build it* — a working implementation you typed, not copied.
- *Break it deliberately* — force the failure mode. Cause the deadlock. Trigger the cache stampede. Send the replayed token. Watching the failure teaches more than the success.
- *Explain it out loud* — to a camera, in three minutes, without notes. The moment you cannot explain it is the moment you discover you did not understand it. This is why the plan has you recording yourself constantly; it is not vanity, it is the cheapest gap detector that exists.

## The mastery loop

Every topic in the book runs through the same five-step loop. When you feel lost on a day, return to this.

**1. Motivate.** Read the Chapter Overview. Understand what problem this solves and what the world looked like before it. Unmotivated material does not stick, and the overview sections exist entirely for this.

**2. Model.** Build the mental model before touching code. Draw it. For a database index, draw the B-tree. For OAuth, draw the sequence. For the event loop, draw the phases. If you cannot draw it, you do not have a model yet — you have vocabulary.

**3. Make.** Type the code. Never copy-paste during learning. The typing is slow and that is precisely the point; the friction is where attention lives. Run it. Change one thing. Predict what will happen before you run it again. Being wrong in that prediction is the single most valuable event in the whole loop.

**4. Break.** Deliberately induce the failure. Set the TTL to zero. Remove the index and watch the plan change. Replay the token. Kill the container mid-request. You are building a library of failure signatures, and that library is what makes senior engineers fast at debugging — they have seen the shape of this before.

**5. Articulate.** Explain it in three minutes to a camera. Then write the explanation in `LOG.md` in your own words. Writing forces the gaps to the surface in a way that reading never does, and the log becomes your revision material for interviews in December.

Five steps, every topic, across 120 working days. It is not complicated. It is just relentless — and the seventeen Sundays off are what make "relentless" survivable for twenty weeks.

## The order of the path, and why it is this order

The curriculum is not sequenced by difficulty. It is sequenced by **dependency and by leverage**.

**Weeks 1–2 — Language foundations.** Everything else is written in TypeScript and runs in Node. Getting these to level 4 first means every subsequent week compounds rather than fighting the language. These two weeks run at the higher budget deliberately.

**Weeks 3–6 — Services and auth.** Node internals, Express, REST, then NestJS and the whole authentication surface. Auth gets two full weeks because refresh rotation with reuse detection is the single most impressive thing a mid-level candidate can demonstrate, and because getting it wrong is the most common way a portfolio project fails an interview.

**Weeks 7–9 — Data.** Given the most depth of any technical block because databases are where senior interviews go deep and where most candidates are shallowest. Reading a query plan is rare and disproportionately valued. Project 1 also needs the schema before it needs the infrastructure.

**Week 10 — Delivery.** Docker and CI/CD, only useful once there is something worth deploying. Deploying a toy teaches you nothing; deploying the system you spent five weeks building teaches you everything. Project 1 goes live here.

**Week 11 — Cloud.** AWS on top of a system that already works locally, so the cloud concepts attach to something concrete.

**Weeks 12 and 14 — System design.** Split around the exam. It requires the previous ten weeks as raw material — you cannot meaningfully design a distributed cache before you have operated a single one. Attempting system design first, a very common mistake, produces memorised answers that collapse under one follow-up question.

**Week 13 — the IELTS exam.** Everything else drops to maintenance for one week.

**Weeks 15–16 — AI engineering.** Placed here because it needs the database (pgvector), the API skills, and the infrastructure, and because it must ship before the December interview push so it can be discussed while it is fresh.

**Weeks 17–20 — Conversion.** Interviews, offers, client closing. Learning becomes gap-driven rather than curriculum-driven: you study only what an interview has exposed as weak.

## Diagnosing your own level honestly

The most common self-assessment error is confusing *familiarity* with *competence*. Having read about something recently feels identical from the inside to understanding it. Use these tests instead — they are unfaked.

| Test | If you pass, you are at least |
|---|---|
| I can build a working version without looking anything up | Level 2 |
| I can predict what happens when I change a setting, before running it | Level 3 |
| I can name three ways this fails in production | Level 3 |
| I can explain it to a camera for three minutes with no notes | Level 3 |
| I can argue convincingly for *not* using it | Level 4 |
| I can estimate its cost and performance at 10× current scale | Level 4 |
| Someone asked me a question about it that I could answer from first principles, having never seen that specific case | Level 5 |

Run the three-minute camera test on any topic you believe you know. Most engineers discover they are one level lower than they thought on roughly half their topics. That discovery is good news — it is a map of exactly where the returns are.

## Practical Tasks

1. Copy the target profile table into `LOG.md`. Fill in your honest current level for every row today, before you start.
2. Pick the three rows with the largest gap between current and target. Those are your leverage points; note which weeks address them and protect those weeks.
3. Choose your specialisation — the one area you will push to level 4–5 and be known for. Backend depth, cloud, or AI. Everything else supports it.
4. Run the three-minute camera test on the topic you feel most confident about. Watch it back. Adjust your self-assessment.
5. Re-score every row at the end of each block (weeks 2, 6, 10, 13, 16, 20). The movement is the evidence that this is working.

## Self Assessment

- Do I know the difference between level 2 and level 3, in behaviour rather than in feeling?
- Have I honestly scored myself, including the rows where the answer is embarrassing?
- Have I chosen a specialisation rather than trying to be level 4 at everything?
- Do I understand why "explain it out loud" is a competence test and not a communication exercise?

## Cheat Sheet

- **L1** follow a tutorial · **L2** build the standard thing · **L3** understand the mechanism · **L4** know the trade-offs · **L5** teach and extend
- **Senior bar = level 3 everywhere, level 4 in your specialisation**
- **The 2→3 transition:** build it · break it deliberately · explain it out loud
- **The mastery loop:** Motivate → Model → Make → Break → Articulate
- **The unfakeable test:** three minutes to a camera, no notes
- **Push to 4–5:** databases, system design, your specialisation. **Cap at 3:** frontend, IaC, observability
