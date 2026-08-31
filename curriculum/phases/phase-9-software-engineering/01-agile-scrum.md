# Phase 9 — Chapter 1: Agile, Scrum, and SDLC

---

## Chapter Overview

### Why Agile Exists

Before Agile, most software was built using **Waterfall**: gather every requirement up front, design the entire system, build it all, test it all, then ship. This sounds reasonable until you notice the flaw — customers rarely know exactly what they want until they see a working product, and by the time a year-long Waterfall project shipped, the market (or the customer's mind) had often already moved on. Teams would spend 12 months building the wrong thing perfectly.

Agile emerged in 2001 when 17 software practitioners, frustrated with heavyweight, documentation-driven processes, wrote the **Agile Manifesto** — a short statement of values favoring working software, customer collaboration, and adapting to change over rigid up-front planning. Scrum is the most widely adopted concrete *framework* for putting those values into practice: short, fixed-length iterations ("sprints") that each produce a working increment of the product, with structured checkpoints for planning and feedback.

### Problems It Solves

**1. Late feedback in Waterfall.** By building and shipping in 1-4 week sprints instead of one long cycle, a team discovers within weeks — not months — if they've misunderstood a requirement.

**2. Requirements changing mid-project.** Waterfall treats a changed requirement as a crisis (it breaks the plan). Agile treats it as expected and welcome, even late in a project, because responding to change is one of the four core values.

**3. Lack of visibility for stakeholders.** A daily standup and a demo at the end of every sprint give business stakeholders constant visibility into real progress, rather than a single "trust us" until the final delivery date.

**4. Unsustainable crunch.** The Agile principle of "sustainable development" pushes back directly against the death-march culture that Waterfall's fixed, immovable deadlines often created.

### Industry Adoption

Agile/Scrum (or a close variant like Kanban or "Scrumban") is the default way software is built at the overwhelming majority of tech companies today — from two-person startups to Google and Amazon. Nearly every job posting for a software engineer mentions "Agile environment" or "Scrum team" because it has become the baseline expectation, not a differentiator.

---

## Beginner Theory

### Core Concepts

**Agile** is a set of *values and principles* — it does not prescribe specific meetings or roles. **Scrum** is one specific *framework* that implements those values with concrete roles (Product Owner, Scrum Master, Development Team), concrete artifacts (backlogs, increment), and concrete events (sprint planning, daily standup, review, retrospective). **Kanban** is a different, lighter-weight framework that also implements Agile values, but through continuous flow instead of fixed-length sprints. Understanding the distinction matters: "we do Agile" is a philosophy; "we do Scrum" is a specific, checkable set of practices.

### The Agile Manifesto — Four Values

```
Individuals and interactions   OVER processes and tools
Working software                OVER comprehensive documentation
Customer collaboration          OVER contract negotiation
Responding to change            OVER following a plan
```

Read each line carefully: the manifesto does not say tools, documentation, contracts, and plans are worthless — it says that when the two are in tension, the left side wins. A comprehensive requirements document is still useful; it's just not more important than shipping working software the customer can actually react to.

### Terminology

| Term | Definition |
|---|---|
| **Sprint** | A fixed-length iteration (typically 1-4 weeks) that produces one working increment |
| **Product Backlog** | The single, ordered master list of everything the product might ever need |
| **Sprint Backlog** | The subset of the product backlog the team has committed to build in this sprint |
| **Increment** | The sum of all completed backlog items at the end of a sprint — must be usable and meet the Definition of Done |
| **Velocity** | The average number of story points a team completes per sprint, used to forecast future delivery dates |
| **Definition of Done (DoD)** | The team's agreed checklist that a piece of work must satisfy before it counts as "complete" |
| **Story Point** | A unit of *relative* complexity/effort for a user story — deliberately not a unit of time |
| **Burndown Chart** | A chart showing remaining work in a sprint over time, used to see if the team is on track |

### Mental Model: A Sprint Is a Small Waterfall, Repeated

Instead of one giant Waterfall cycle (requirements → design → build → test → deploy) spanning a year, Scrum runs that *same* cycle in miniature every 1-4 weeks. Each tiny cycle produces working software and a checkpoint for feedback, so the "requirements" step for sprint 5 can be corrected based on what was learned from actually using the output of sprint 4 — something a single year-long Waterfall cycle can never do.

```
Waterfall:  [ Requirements ─ Design ─ Build ─ Test ─ Deploy ]  (12 months, 1 feedback point)

Agile/Scrum: [Req-Design-Build-Test-Deploy] → feedback →
             [Req-Design-Build-Test-Deploy] → feedback →
             [Req-Design-Build-Test-Deploy] → feedback →   (2-week sprints, feedback every cycle)
```

---

## Basic Examples

### Example 1: The Three Scrum Roles in Practice

Each role has a distinct, non-overlapping responsibility — confusion between them is one of the most common reasons Scrum fails in practice.

```
Product Owner (PO):
  Owns and prioritizes the Product Backlog — decides WHAT gets built and in
  what order, based on business value. Represents the customer/stakeholders
  to the team. Example: the PO decides that "password reset" ranks above
  "dark mode" because support tickets show users are locked out daily.

Scrum Master:
  A servant-leader, NOT a manager or team lead. Facilitates the Scrum events,
  removes blockers the team can't remove themselves (e.g., "we're waiting on
  IT to grant us database access"), and coaches the team on Scrum practice.
  Example: if a developer is stuck for two days waiting on another team's API
  to be documented, the Scrum Master's job is to chase that down so the
  developer can get back to building.

Development Team:
  Self-organizing (decides HOW to build the sprint backlog) and
  cross-functional (design, dev, QA, DevOps skills all represented).
  Typically 3-9 people. Collectively accountable for the sprint's outcome —
  no single developer "owns" one ticket in isolation; the whole team owns
  the sprint goal.
```

### Example 2: The Scrum Artifacts in Practice

```
Product Backlog (owned by the PO):
  #1  Password reset via email             [Priority: High]
  #2  Two-factor authentication            [Priority: High]
  #3  Dark mode                            [Priority: Low]
  #4  Export data to CSV                   [Priority: Medium]
  ... (continuously refined — reprioritized as business needs change)

Sprint Backlog (this sprint's committed subset):
  Sprint 14 (2 weeks): items #1 and #2 selected from the product backlog,
  broken into tasks by the Development Team:
    - Build password-reset API endpoint (dev)
    - Design reset-email template (design)
    - Write integration tests (QA)
    - Add rate limiting to reset endpoint (dev)

Increment:
  At the end of Sprint 14: working, deployed password reset and 2FA features
  that meet the team's Definition of Done — this IS the increment.
```

### Example 3: A Complete User Story with Acceptance Criteria

```
User Story format:
  As a [type of user],
  I want [goal/desire],
  So that [benefit/reason].

Concrete example:
  As a registered user,
  I want to reset my password via email,
  So that I can regain access to my account if I forget it.

Acceptance Criteria (what "done" means for THIS specific story):
  - User can click "Forgot Password" on the login page
  - User receives a reset email within 2 minutes
  - The reset link expires after 24 hours
  - User can set a new password (minimum 8 characters)
  - User is redirected to login after a successful reset
  - The old password no longer works after reset

Notice the acceptance criteria are specific and testable — a QA engineer
could write automated tests directly from this list without asking any
follow-up questions.
```

### Example 4: Estimating with Planning Poker and Story Points

```
Story point scale (Fibonacci-like, deliberately non-linear):
  1, 2, 3, 5, 8, 13, 21

Why Fibonacci, not 1-10? Because the gaps GROW as size grows, mirroring
real uncertainty — the difference between a 1-point and 2-point task is
usually clear, but the difference between "13" and "14" is not meaningfully
estimable, so the scale simply doesn't offer that false precision.

Planning Poker session for the story above:
  1. PO reads the story and acceptance criteria aloud.
  2. Each team member privately selects a card (1,2,3,5,8,13...) representing
     their estimate of relative complexity.
  3. Everyone reveals simultaneously (prevents anchoring — no one's guess
     influences anyone else's before they commit).
  4. If estimates cluster (e.g., 3,3,5,3) — take the average or discuss briefly.
  5. If estimates spread widely (e.g., 2,3,13,8) — the outliers explain their
     reasoning ("I said 13 because I don't think we've handled email
     deliverability before") and the team re-votes with that new information.

Result for our example: team converges on 5 points — moderate complexity,
some unknowns (email deliverability, rate limiting), roughly 2-4 days of work.
```

### Example 5: Using Velocity to Forecast a Release Date

```
Given:
  Team's average velocity over the last 4 sprints: 40 story points/sprint
  Remaining product backlog for the "v2 launch": 200 story points

Forecast:
  200 points ÷ 40 points/sprint = 5 sprints remaining
  At 2 weeks/sprint → 10 weeks until the v2 launch backlog is complete

Important caveat to say out loud when forecasting like this: velocity is a
TREND, not a guarantee. A team new to a codebase, or one that just lost a
member, will see velocity dip — the forecast should be re-run every sprint
with the latest rolling average, not calculated once and treated as fixed.
```

### Example 6: Reading a Burndown Chart

A burndown chart plots remaining work (story points or hours) against time within a single sprint. It's the fastest way to tell, at a glance, whether a sprint is on track — without waiting until the last day to find out.

```
Story
Points
Remaining
  40 |●
     | \
  35 |  ●\
     |    \___
  30 |        ●\           ← Ideal line (straight diagonal): if the team
     |          \             burns exactly 4 points/day, remaining work
  25 |           ●\           hits zero exactly on the last day.
     |             \
  20 |              ●\
     |                \___
  15 |                    ●          ← Actual line (dots): tracks what
     |                      \           REALLY happened, day by day.
  10 |                       ●\
     |                         \
   5 |                          ●
     |                            \___
   0 |______________________________●___
     Day1  2   3   4   5   6   7   8  9  10
                                            (Sprint length: 10 working days)

Three things to read off this chart:

1. Actual line ABOVE ideal line → team is BEHIND. On day 6 above, actual
   (25 points remaining) is higher than ideal (~20 points remaining) —
   the team has more work left than the plan assumed at this point.

2. Actual line BELOW ideal line → team is AHEAD of schedule (rare, but
   worth investigating too — did the team underestimate the stories?).

3. A FLAT actual line for multiple days → no work is being marked
   complete, even if people are busy. This is often a sign of stories
   that are too large (nothing finishes until the very end) or blocked
   work that isn't being surfaced in standup.

The chart only tells you THAT something is off — a good Scrum Master uses
it to prompt the conversation in the next standup ("we're behind pace
since day 4 — is anyone blocked, or did we under-estimate the checkout
story?"), not as an automatic verdict on the team.
```

---

## Intermediate Concepts

### SDLC Models Compared

```
Waterfall (traditional):
  Sequential — each phase fully completes before the next begins.
  Requirement → Design → Build → Test → Deploy.
  Weakness: requirements changes are expensive; feedback arrives only at the
  very end, often too late to act on cheaply.

Agile SDLC:
  Iterative — short cycles (sprints) repeat the full requirement-to-deploy
  cycle at small scale. Each sprint: plan a small slice of requirements →
  design → build → test → deploy. Feedback incorporated every sprint.

DevOps-extended SDLC:
  CI/CD collapses the build/test/deploy phases into an automated pipeline:
  Plan → Code → Build → Test (automated) → Release → Deploy → Operate → Monitor → back to Plan.
  Code can be merged and deployed many times per day rather than once per sprint,
  because automation — not a human release manager — gates the deploy.
```

### Scrum Events in Detail

```
Sprint Planning (max 1 day for a 1-month sprint, proportionally shorter for shorter sprints):
  The team selects backlog items for the sprint and plans HOW to build them.

Daily Standup (15 minutes, same time/place every day):
  Each person answers: what did I complete yesterday? What will I work on
  today? Any blockers? This is a synchronization point, NOT a status report
  to a manager — the team is talking to each other, not performing for the PO.

Sprint Review (max 4 hours for a 1-month sprint):
  Demo the working increment to stakeholders and gather feedback. This is
  where "working software is the primary measure of progress" gets enacted —
  a demo of running software, not a slide deck describing planned software.

Sprint Retrospective (max 3 hours for a 1-month sprint):
  The team reflects on ITS OWN process: what went well, what didn't, what to
  change. This is the mechanism behind the Agile principle "teams reflect on
  how to become more effective at regular intervals."

Backlog Refinement (ongoing, not a fixed single event):
  The team and PO continuously clarify and estimate upcoming backlog items so
  sprint planning doesn't start from zero understanding each time.
```

### Common Mistakes

- **Treating the daily standup as a status report to a manager** instead of a peer-to-peer sync — this kills the collaborative spirit and turns Scrum into surveillance.
- **Converting story points into hours** ("1 point = 4 hours") — this defeats the purpose of relative estimation and reintroduces the false precision Agile was designed to avoid.
- **Allowing constant mid-sprint scope changes** — this breaks the team's ability to commit to anything and destroys the value of a sprint boundary entirely.

---

## Advanced Concepts

### Scrum vs. Kanban — When Each Fits Better

Scrum's fixed-length sprints and committed sprint backlog work best when the team can reasonably predict and commit to a batch of work — typical for product feature teams. Kanban's continuous flow, with a strict **Work-In-Progress (WIP) limit** per board column instead of a sprint commitment, fits better for teams whose work arrives unpredictably — support/ops teams, or teams handling a constant stream of incoming bugs — where forcing that work into a fixed sprint commitment would be artificial. Many real teams run "Scrumban": a Kanban board *within* Scrum's sprint cadence, keeping the retrospective and planning rhythm while dropping the rigid sprint-backlog commitment.

### Handling Scope Changes Mid-Sprint

The sprint backlog is a *protected* commitment. When new work arrives mid-sprint, the default path is: it goes into the Product Backlog, the PO prioritizes it against existing items, and it's picked up in the *next* sprint planning — not injected immediately. The exception is a genuine emergency (a production-down bug, a security vulnerability): in that case, the PO and Scrum Master explicitly negotiate trading out an equivalent amount of already-committed work, rather than silently expanding the sprint's scope. Teams that skip this negotiation and simply pile new work onto an already-committed sprint see their velocity become meaningless, because "velocity" no longer reflects what was actually planned versus delivered.

---

## Interview Preparation

**Q1: What is the difference between Scrum and Kanban?**

A: Scrum uses time-boxed iterations (sprints) with a fixed team, defined roles (PO, Scrum Master, Development Team), a set of ceremonies (planning, daily standup, review, retrospective), and velocity-based forecasting. It fits best for product teams with a reasonably predictable feature roadmap. Kanban uses continuous flow instead of sprints: work is visualized on a board, Work-In-Progress is limited per column, and the team focuses on cycle time and throughput rather than sprint commitments. It has no required roles or ceremonies and fits best for ops/support teams or any team whose incoming work is unpredictable. Both are Agile — the core difference is that Scrum has a cadence and a per-sprint commitment, while Kanban has no commitment and work simply flows continuously. Many teams combine them as "Scrumban."

**Q2: How do you handle scope creep or mid-sprint scope changes?**

A: The sprint backlog is protected once committed — new requests should not be added mid-sprint except for genuine emergencies. The default process: a new request goes into the product backlog, the Product Owner prioritizes it, and it's picked up in the next sprint. If something is truly urgent — a production incident, a security issue — the PO and Scrum Master evaluate together and may explicitly trade out an equivalent amount of already-committed work, rather than silently expanding scope. Uncontrolled scope creep destroys both velocity as a useful metric and team morale, since the team never gets to finish what it actually committed to.

**Q3: What is a Definition of Done, and why does every team need its own?**

A: A Definition of Done is the team's explicit, agreed checklist that a piece of work must satisfy before it's counted as complete — for example: code written, unit tests passing, code reviewed and approved, integration tests passing, deployed to staging, and acceptance criteria verified by the PO. Without an explicit DoD, "done" means something different to each team member — a developer might consider a ticket done once code compiles, while QA considers it done only after full regression testing. This mismatch causes disputes about whether a sprint goal was actually met and undermines the reliability of the team's velocity. Every team should write its own DoD collaboratively, since the right checklist depends on the team's tech stack and quality bar.

**Q4: Explain story points versus hours — why does Scrum deliberately avoid time-based estimation?**

A: Story points measure *relative* complexity and effort, not a fixed unit of time. A 5-point story might take one experienced engineer a day and a newer engineer three days — the point value describes the size of the problem, not who's solving it or how fast. This matters because hour-based estimates are consistently and predictably wrong (engineers systematically underestimate), while relative sizing ("is this bigger or smaller than that other story we did last sprint?") is a comparison the human brain is much better at. Velocity then converts the team's own historical points-per-sprint into a forecast, without ever needing anyone to guess in hours.

---

## Practical Tasks

### Beginner (8 Tasks)
1. Write a complete user story with acceptance criteria for a feature you use daily (e.g., "reset password").
2. List the three Scrum roles and one core responsibility for each, in your own words.
3. Run a mock daily standup with two other people — 15 minutes, three questions each.
4. Draw the Scrum event cycle for a 2-week sprint (planning → daily standups → review → retro).
5. Estimate 5 sample user stories using the Fibonacci story-point scale, alone first, then compare with a partner.
6. Write a Definition of Done checklist for a personal project.
7. Compare Waterfall and Agile SDLC side by side for a hypothetical mobile app project.
8. Identify which of your daily tasks would fit better under Scrum vs. Kanban, and explain why.

### Intermediate (6 Tasks)
1. Run a full Planning Poker session with a group on 8 real backlog items; document where estimates diverged and why.
2. Calculate a team's velocity from 4 mock sprints and forecast a delivery date for a 150-point backlog.
3. Facilitate a Sprint Retrospective using the Start/Stop/Continue format for a real or simulated project.
4. Design a Kanban board (columns + WIP limits) for a support team handling unpredictable incoming tickets.
5. Write a policy for handling mid-sprint emergency requests, including who approves trade-offs.
6. Draft a Product Backlog of 15 items for a real app idea, ordered by business priority with justification.

### Advanced (4 Tasks)
1. Design a "Scrumban" process for a team that needs both sprint-based feature work and continuous bug-fix flow.
2. Build a burndown chart from real or simulated daily task-completion data and interpret whether the sprint is on track.
3. Propose a process for scaling Scrum across 3 teams working on the same product (dependencies, shared backlog, cross-team standups).
4. Write an incident postmortem template that fits into a Sprint Retrospective for a team practicing continuous deployment.

---

## Cheat Sheet

```
Scrum quick reference:
  Roles:     Product Owner, Scrum Master, Development Team
  Artifacts: Product Backlog, Sprint Backlog, Increment
  Events:    Sprint, Planning, Daily Standup, Review, Retrospective

Daily standup (3 questions, 15 min max):
  1. What did I complete yesterday?
  2. What will I work on today?
  3. Any blockers?

Story point scale (Fibonacci):
  1:  trivial, no unknowns
  2:  small, clear scope
  3:  well-understood, 1-2 days
  5:  moderate, some questions
  8:  complex, multiple unknowns
  13: very complex → consider splitting
  21: epic → definitely split

Definition of Done checklist:
  Code complete
  Unit tests written and passing
  Code reviewed (PR approved)
  Integration tests passing
  Deployed to staging
  Acceptance criteria met (PO verified)
  No known blocking bugs

Retro format (Start/Stop/Continue):
  Start:    what should we START doing?
  Stop:     what is NOT working, should STOP?
  Continue: what IS working, should CONTINUE?

Scrum vs Kanban at a glance:
  Scrum:  fixed sprints, committed backlog, defined roles/ceremonies
  Kanban: continuous flow, WIP limits, no fixed roles or ceremonies
```
