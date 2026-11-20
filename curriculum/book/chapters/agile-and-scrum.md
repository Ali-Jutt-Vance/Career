# How Teams Work: Agile and Scrum

> [!GOALS]
> - Explain why software projects so often went wrong under big up-front plans, and what "Agile" means — as values, not as a set of meetings.
> - Describe the **software development life cycle** and compare waterfall, iterative and continuous approaches.
> - Explain **Scrum** precisely: its roles, events and artefacts, and what each one is for.
> - Explain **Kanban**: visualising work, limiting work in progress and managing flow — and when it fits better than Scrum.
> - Write good **user stories** with testable acceptance criteria, and split large work into thin, valuable slices.
> - Estimate work with story points or by counting, forecast honestly with ranges, and read burndown charts and flow metrics.
> - Recognise how Agile goes wrong in practice ("cargo-cult" Scrum), and how to behave as a valuable engineer inside any process.

## Why this matters

Imagine a company decides to build a new delivery-management system. Following the traditional approach, a team spends three months writing a 200-page requirements document. Another three months go into a detailed design. Then nine months of building. Then three months of testing — during which hundreds of bugs are found, because pieces built separately do not fit together. Eighteen months after the start, the system is shown to the dispatchers who will use it.

They are polite, but troubled. Half the features are not what they needed. The most important feature — reassigning a parcel when a rider's motorbike breaks down — is missing, because nobody thought to ask. The market has changed: the company now partners with a courier service the design never imagined. The team built, very carefully, the wrong thing.

Stories like this were common enough in the software industry that people started asking a different question: **instead of trying to get the whole plan right at the start, what if we built something small, showed it to real users quickly, learned, and adjusted — again and again?** That question became the **Agile** movement.

Today, almost every software team you join will describe itself as "Agile", and most will use **Scrum**, **Kanban** or a mixture. You will attend planning meetings and daily stand-ups, pick up work from a board, estimate tasks, and demonstrate what you built. Understanding *why* these practices exist will make you far more useful in them — and will help you notice when a team is just going through the motions. Interviewers also ask about them, especially in behavioural rounds: "How did your team plan work?", "What happens when requirements change mid-sprint?".

## The simple idea

Think of driving to a city you have never visited. One approach is to plan the entire route in advance, print it, and follow it exactly — even when you hit a closed road, a traffic jam or a better route that just opened. The other approach is to know your destination, drive a short stretch, look at the road, check the map, adjust, and drive the next stretch. The second driver arrives more reliably, because they **use what they learn on the way**.

Agile development is the second kind of driving. You have a clear destination (the goal of the product), but you move in **short steps**, and after each step you look at the result — ideally with the people who will use it — and decide the next step.

> [!ANALOGY]
> Agile is like driving to an unfamiliar city by checking the road and the map every few minutes, instead of following a route planned entirely before you left.
>
> **Where the analogy breaks:** on a road trip, the destination is fixed. In software, the **destination itself** often changes as you learn: users discover what they really need only when they use something real. Agile is not just about adjusting the route — it is about being allowed to change where you are going. And unlike a car trip, building software in short steps needs engineering discipline (automated tests, clean code, small releases) so that changing direction stays cheap.

## The proper definition and key words

**Agile** is a set of values and principles for developing software in short, iterative cycles, with close collaboration between developers and the people who need the software, and with frequent adaptation based on feedback.

It is important to separate three levels:

- **Agile** is a **philosophy** — values and principles. It does not prescribe meetings or roles.
- **Scrum** and **Kanban** are **frameworks** — concrete ways of working that put the philosophy into practice.
- **Engineering practices** — automated testing, continuous integration, small releases, refactoring — are what make working this way **possible**. Without them, short iterations produce fragile software quickly.

Key words for this chapter:

- **Software development life cycle (SDLC)** — the stages software goes through: understanding the need, designing, building, testing, releasing, operating, and improving.
- **Iteration** — one short cycle of planning, building and reviewing. In Scrum, an iteration is called a **sprint**.
- **Increment** — a working, usable piece of the product produced by an iteration.
- **Backlog** — an ordered list of work still to be done.
- **Stakeholder** — anyone with an interest in the product: users, customers, managers, support staff, other teams.
- **User story** — a short description of a piece of functionality from the point of view of someone who needs it.
- **Work in progress (WIP)** — work that has been started but not finished.
- **Velocity** and **throughput** — measures of how much work a team finishes per sprint or per unit of time.

## How it works inside: feedback loops

The heart of Agile is the **feedback loop**: do something small, observe the result, learn, adjust.

```text
          ┌──────────────────────────────────────────┐
          │                                          │
          ▼                                          │
      PLAN a small step  ──▶  BUILD it  ──▶  SHOW / RELEASE it
                                                     │
                                                     ▼
                                          LEARN from real feedback
                                          (users, data, the team)
```

Why do short loops work better than one long plan?

- **Software requirements are discovered, not just collected.** People struggle to describe what they need in the abstract, but react precisely when they see something real: "No — when I press this, I need to see the rider's phone number."
- **Mistakes are cheaper when found early.** A misunderstanding caught after two weeks costs two weeks. The same misunderstanding caught after eighteen months may cost the project.
- **Risk is reduced continuously.** Each increment proves that some part of the system really works — technically and for users — instead of everything being uncertain until the end.
- **Value arrives earlier.** If the most important feature ships in month two, the business benefits from month two, not month eighteen.

Agile frameworks are, at bottom, different arrangements of nested feedback loops: from seconds (your tests in watch mode — {{ch:testing}}), to minutes (code review — {{ch:code-review-and-documentation}}), to a day (the daily stand-up), to a couple of weeks (a sprint review), to months (product strategy).

## From waterfall to Agile

### Level 2 — The waterfall model

The traditional approach is usually called **waterfall**, because work flows downward through phases, each completed before the next begins:

```text
  Requirements
       └──▶ Design
                └──▶ Implementation
                            └──▶ Testing
                                      └──▶ Deployment
                                                └──▶ Maintenance
```

Waterfall seems logical: decide what to build, design it, build it, check it, ship it. It works reasonably well when requirements are truly stable and well understood, and mistakes are extremely expensive to fix later — for example in some hardware, safety-critical and regulated systems, where approval processes demand extensive up-front specification.

For most software, though, it has a fatal weakness: **feedback arrives at the end**. Testing happens after building, so integration problems surface late. Users see the product after everything is built, so misunderstandings surface even later. Interestingly, the 1970 paper by Winston Royce that is usually cited as the origin of waterfall actually described this purely sequential model as risky, and recommended iterating — a point that was often lost.

### Level 2 — The Agile Manifesto

In February 2001, seventeen software practitioners met at a ski resort in Utah and wrote the **Manifesto for Agile Software Development**. It is short. Its core is four value statements:

```text
  Individuals and interactions   over   processes and tools
  Working software               over   comprehensive documentation
  Customer collaboration         over   contract negotiation
  Responding to change           over   following a plan
```

The manifesto adds an important sentence: *"while there is value in the items on the right, we value the items on the left more."* Agile does **not** reject processes, documentation, contracts or plans. It says that when they conflict, the things on the left matter more. A team that refuses to write any documentation "because we are Agile" has misread it ({{ch:code-review-and-documentation}}).

The manifesto also lists twelve principles. A few that shape daily work:

- Deliver working software **frequently**, from every couple of weeks to every couple of months, with a preference for the shorter timescale.
- **Welcome changing requirements**, even late in development.
- Business people and developers must **work together** daily throughout the project.
- **Working software is the primary measure of progress** — not documents, not hours spent, not percentage-complete estimates.
- Promote **sustainable development**: a pace the team can maintain indefinitely.
- **Continuous attention to technical excellence** and good design enhances agility.
- **Simplicity** — "the art of maximizing the amount of work not done" — is essential.
- At regular intervals, the team **reflects** on how to become more effective, and adjusts.

Notice "technical excellence" and "sustainable pace". Agile is not about rushing. It is about learning quickly, which requires code that is easy and safe to change — everything you studied in Part IV.

### Level 4 — Beyond sprints: continuous delivery

Many modern teams go further than a release at the end of each sprint. With automated tests and deployment pipelines ({{ch:cicd}}), they release **many times a day**, and the feedback loop from code to real users shrinks to minutes. This approach, together with shared responsibility for running software in production, is often called **DevOps**. Research by the DORA group (DevOps Research and Assessment, now part of Google Cloud), published in its annual *State of DevOps* reports, has found that high-performing teams combine frequent deployment with low failure rates — speed and stability together, not traded against each other. You will meet DORA's four key metrics later in this chapter.

## Scrum

**Scrum** is the most widely used Agile framework. It was developed by Ken Schwaber and Jeff Sutherland in the 1990s, and is defined in a short document, **The Scrum Guide**, which they maintain; the description below follows its 2020 version. Scrum is deliberately small: three roles (the Guide calls them "accountabilities"), five events and three artefacts.

### Level 2 — The big picture

```text
   Product Backlog          Sprint (fixed length, e.g. 2 weeks)
   (ordered list)          ┌──────────────────────────────────────────┐
   ┌───────────┐  Sprint   │  Sprint Backlog                          │
   │ story A   │ Planning  │  ┌─────────┐   Daily Scrum, every day    │
   │ story B   │──────────▶│  │ A  B  C │   ───────────────────────▶  │
   │ story C   │           │  └─────────┘   building, testing...      │
   │ story D   │           └───────────────────────────┬──────────────┘
   │ ...       │                                       │
   └───────────┘                                       ▼
        ▲                                    Increment (working, "Done")
        │                                              │
        │   Sprint Review (inspect product with stakeholders)
        └──────────────────────────────────────────────┤
            Sprint Retrospective (inspect how the team works)
```

### Level 3 — The Scrum Team

A **Scrum Team** is small — typically ten people or fewer — and contains three accountabilities:

**The Product Owner** is accountable for maximising the value of the product. They own the **Product Backlog**: deciding what is in it and, above all, its **order**. They talk constantly with users, customers and the business, and decide what is most valuable to build next. One person, not a committee — so there is one clear voice on priorities. Developers can and should challenge priorities, with reasons, but the Product Owner decides.

**The Scrum Master** is accountable for the team's effectiveness with Scrum. They are not a manager and do not assign work. They coach the team in the framework, facilitate events when useful, and — most importantly — help **remove impediments**: anything blocking the team, from a missing test environment to an unclear decision from another department. In many companies, this role is combined with others (an engineering manager or a senior developer), or shared.

**The Developers** are everyone who does the work of creating the increment — programmers, testers, designers, data specialists. They decide **how** to build the work, create the plan for the sprint (the Sprint Backlog), and hold each other accountable for quality, through the **Definition of Done**.

Scrum teams are meant to be **cross-functional** (together they have all the skills needed to deliver a working increment, without handing work to other teams) and **self-managing** (they decide internally who does what and how).

### Level 3 — The events

All Scrum events are **time-boxed**: they have a maximum length, so they cannot sprawl.

**The Sprint** is a fixed-length period of one month or less — two weeks is very common — during which the team creates a usable increment. A new sprint starts immediately after the previous one ends. Each sprint has a **Sprint Goal**: one objective that gives the work a focus ("Customers can track their parcel in real time"), not just a list of tasks.

**Sprint Planning** starts the sprint. The team answers three questions: *Why* is this sprint valuable (the Sprint Goal)? *What* can be done (which backlog items to take)? *How* will the work get done (a plan, often broken into tasks)? For a one-month sprint it is time-boxed to eight hours; for shorter sprints it is usually shorter.

**The Daily Scrum** (often called the **stand-up**) is a 15-minute event for the Developers, every working day, at the same time and place. Its purpose is to inspect progress towards the Sprint Goal and adjust the plan for the next day. A common format is each person saying what they finished since the last stand-up, what they will do next, and what is blocking them — but the Scrum Guide does not require this format, and many teams instead walk the board from right to left ("what is closest to done, and what does it need?"). Detailed problem-solving happens **after** the stand-up, with only the people involved.

**The Sprint Review** happens at the end of the sprint. The team shows what it built — **working software, not slides** — to stakeholders, and discusses what to do next. The Product Backlog is adjusted based on what everyone learned. It is a working session, not a ceremony of approval. (Time-box: four hours for a one-month sprint.)

**The Sprint Retrospective** ends the sprint. The team inspects **how it worked** — people, interactions, tools, processes, the Definition of Done — and agrees on concrete improvements to try in the next sprint. (Time-box: three hours for a one-month sprint.) This is the event that makes a team better over time; skipping it is one of the most common ways Scrum decays.

**Backlog refinement** is not a formal event in the Scrum Guide but an ongoing activity: the Product Owner and Developers clarify, split and estimate upcoming backlog items so they are ready for future sprint planning. Many teams hold a regular refinement session.

### Level 3 — The artefacts and their commitments

**The Product Backlog** is the single, ordered list of everything that might be needed in the product. Items near the top are small and well understood; items further down may be vague ideas. Its commitment is the **Product Goal**: the long-term objective the backlog serves.

**The Sprint Backlog** is the Sprint Goal, the backlog items selected for the sprint, and the Developers' plan for delivering them. It belongs to the Developers, and they update it throughout the sprint as they learn.

**The Increment** is a concrete step towards the Product Goal: everything completed so far, working together. Its commitment is the **Definition of Done (DoD)**: a shared, explicit checklist that every piece of work must satisfy to count as done. Work that does not meet it is not part of the increment and is not shown as finished.

A Definition of Done for a web team might be:

```text
Definition of Done
  ✓ Code reviewed and approved (at least one reviewer)
  ✓ Automated tests written and passing; no drop in coverage of changed code
  ✓ Lint and type-check pass in CI
  ✓ Acceptance criteria verified by someone other than the author
  ✓ Documentation, API docs and runbooks updated where affected
  ✓ Deployed to the staging environment and smoke-tested
  ✓ No known critical bugs; product owner has seen it
```

The Definition of Done protects **quality** and makes "done" mean the same thing to everyone. Without it, "done" quietly becomes "I wrote the code, but it's not tested or deployed" — and unfinished work accumulates invisibly.

### Level 4 — Changes during a sprint

What happens when a new request arrives in the middle of a sprint? By default, it goes into the **Product Backlog**, where the Product Owner orders it against everything else; the team considers it at the next sprint planning. This protects the team's focus and the Sprint Goal.

Real emergencies — a production outage, a security vulnerability — are handled immediately. The honest way to do this is to **trade**, not to pile on: the Product Owner and the team agree which planned work will be dropped to make room, rather than silently expanding the sprint. If the Sprint Goal itself becomes obsolete (for example, the business cancels the feature), the Product Owner can **cancel** the sprint and the team plans a new one. Teams that constantly absorb unplanned work into "committed" sprints end up with meaningless plans and exhausted people.

## Kanban

### Level 2 — The idea

**Kanban** comes from manufacturing — the Toyota Production System used *kanban* (Japanese for "signboard" or "card") to signal when more parts were needed. In software, it was adapted in the 2000s, notably by David J. Anderson. Kanban has no sprints and no prescribed roles. It starts from your current process and improves it through a few practices:

1. **Visualise the work** on a board, with a column for each stage.
2. **Limit work in progress** — set a maximum number of items in each stage.
3. **Manage flow** — watch how smoothly work moves, and remove what slows it.
4. **Make policies explicit** — write down the rules (what "ready for review" means, how urgent items are handled).
5. **Improve collaboratively**, using measurements and experiments.

```text
  ┌──────────┬────────────┬──────────────┬─────────────┬──────────┐
  │ Ready    │ In progress│ Code review  │ Testing     │ Done     │
  │          │  (limit 3) │  (limit 2)   │  (limit 2)  │          │
  ├──────────┼────────────┼──────────────┼─────────────┼──────────┤
  │ [D] [E]  │ [A] [B]    │ [C]          │             │ [X] [Y]  │
  │ [F]      │            │              │             │          │
  └──────────┴────────────┴──────────────┴─────────────┴──────────┘
```

### Level 2 — Why limit work in progress?

It seems that starting more work means finishing more work. The opposite is true. When everyone has five things started:

- Each item waits more — for review, for testing, for its owner's attention — so each takes **longer** to finish.
- People lose time **switching** between tasks.
- Problems hide: a stuck item is just one of many.
- Nothing reaches users until it is finished, so value and feedback are delayed.

A **WIP limit** forces a different behaviour: when the "In progress" column is full, you may not start something new. Instead you **help finish** something — review a teammate's pull request, help test, unblock a stuck item. The team's motto becomes **"stop starting, start finishing."**

There is a precise mathematical reason behind this, called **Little's Law** (from queueing theory, proved by John Little in 1961). For a stable system:

```text
  average cycle time  =  average work in progress  ÷  average throughput
```

- **Cycle time** — how long one item takes from start to finish.
- **Throughput** — how many items finish per unit of time.

If a team finishes about 5 items a week and has 20 items in progress, each item takes about 4 weeks on average. With the **same** throughput and only 10 items in progress, each takes about 2 weeks. Nothing about the people changed — only how much they started at once.

```ts
function averageCycleTimeDays(averageWip: number, throughputPerDay: number): number {
  return averageWip / throughputPerDay;
}

const throughputPerDay = 1; // the team finishes about one item per working day
for (const wip of [20, 10, 5]) {
  console.log(`WIP ${wip}: each item takes about ${averageCycleTimeDays(wip, throughputPerDay)} working days`);
}
```

**Output:**

```text
WIP 20: each item takes about 20 working days
WIP 10: each item takes about 10 working days
WIP 5: each item takes about 5 working days
```

The code is simple arithmetic, but the lesson is powerful: **to deliver each thing sooner, start fewer things at once.** (Little's Law describes averages over a stable period; it does not predict any single item.)

### Level 4 — Scrum or Kanban?

| | Scrum | Kanban |
|---|---|---|
| Cadence | Fixed-length sprints | Continuous flow |
| Commitment | A Sprint Goal and selected items per sprint | WIP limits; no batch commitment |
| Roles | Product Owner, Scrum Master, Developers | None required |
| Change during a cycle | Discouraged; goes to the backlog | Possible at any time, when capacity frees up |
| Main measures | Sprint goal achieved, velocity | Cycle time, throughput, WIP |
| Fits best | Product teams building features towards goals | Support, operations, maintenance, unpredictable incoming work |

Many teams combine them — sometimes called **Scrumban**: Scrum's planning, review and retrospective rhythm, with a Kanban board and WIP limits inside the sprint. The label matters much less than the feedback loops working.

## User stories and the backlog

### Level 3 — User stories

A **user story** describes a need from the point of view of someone who benefits from it. A common template:

```text
As a <type of user>,
I want <some capability>,
so that <some benefit>.
```

For example:

```text
As a delivery rider,
I want to mark a parcel as "customer not home" with one tap,
so that the dispatcher can reschedule it without calling me.
```

The template's value is in the **"so that"**. It tells developers **why**, which lets them suggest better solutions ("what if the app offered the customer a new time slot automatically?"). A story without a real benefit is often a solution looking for a problem.

Ron Jeffries described a story as having **three Cs**: the **Card** (the short written description), the **Conversation** (the discussions that fill in the details — the most important part) and the **Confirmation** (the acceptance criteria that confirm it is done). A story is a reminder to have a conversation, not a complete specification.

### Level 3 — Acceptance criteria

**Acceptance criteria** are the specific, testable conditions that must be true for the story to be accepted. They are often written in the **Given / When / Then** form you met as "arrange, act, assert" in {{ch:testing}}:

```text
Story: rider marks "customer not home"

Scenario: parcel rescheduled
  Given a parcel out for delivery assigned to a rider
  When the rider taps "Customer not home"
  Then the parcel status becomes "delivery failed – not home"
  And the dispatcher dashboard shows it within 30 seconds
  And the customer receives an SMS with a link to choose a new time

Scenario: no network
  Given the rider's phone has no network
  When the rider taps "Customer not home"
  Then the action is saved on the phone
  And it is sent automatically when the network returns

Scenario: wrong parcel
  Given a parcel already delivered
  Then the "Customer not home" button is not shown
```

Good acceptance criteria remove ambiguity before building starts — notice how "no network" exposes a requirement nobody had mentioned — and translate almost directly into automated tests.

### Level 3 — Good stories: INVEST

Bill Wake's **INVEST** checklist describes good backlog items:

- **Independent** — can be built and delivered without waiting for other stories, where possible.
- **Negotiable** — the details are open for discussion; it is not a fixed contract.
- **Valuable** — delivers something a user or the business cares about.
- **Estimable** — understood well enough to estimate.
- **Small** — fits comfortably in a sprint; ideally a few days of work.
- **Testable** — has clear acceptance criteria.

### Level 4 — Splitting work into thin vertical slices

Large items — often called **epics** — must be split into smaller stories. The most important skill here is splitting **vertically**, not horizontally.

- **Horizontal split (avoid):** "Build the database tables", then "Build the API", then "Build the screen". None of these delivers anything usable alone, none can be tested by a user, and integration problems appear only at the end — a mini-waterfall.
- **Vertical split (prefer):** each story goes through **all** layers but does less. For an epic "Customers can track parcels":
  1. Customer sees the current status of one parcel (text only, refreshed on page load).
  2. Customer sees the rider's location on a map.
  3. The map updates live, without refreshing ({{ch:websockets}}).
  4. Customer gets an SMS when the rider is ten minutes away.

```text
   horizontal (layers)                vertical (slices)
  ┌───────────────────┐             ┌────┬────┬────┬────┐
  │ UI                │             │    │    │    │    │
  ├───────────────────┤             │ 1  │ 2  │ 3  │ 4  │
  │ API               │             │    │    │    │    │
  ├───────────────────┤             │    │    │    │    │
  │ Database          │             │    │    │    │    │
  └───────────────────┘             └────┴────┴────┴────┘
  nothing usable until all done     each slice is usable and testable
```

Each slice is releasable, testable and gives feedback. If priorities change after slice 2, the team stops with something valuable instead of three half-finished layers. Useful ways to split: by workflow step, by user type, by business rule ("standard parcels first, fragile parcels later"), by data variation, by simple-before-complex ("manual first, automatic later"), and by separating the happy path from error handling.

### Level 4 — Definition of Ready

Some teams use a **Definition of Ready**: a short checklist a story must meet before it can be taken into a sprint — clear acceptance criteria, dependencies known, design available, small enough. Used lightly, it prevents teams from starting work nobody understands. Used rigidly, it becomes a bureaucratic gate; the Scrum Guide does not require it.

## Estimation and forecasting

### Level 2 — Why estimate at all?

Businesses need to make decisions: is this feature worth building? Can we promise it for the trade show? What should we do first? Estimates help answer these questions. But software estimates are famously unreliable, because most work involves something the team has not done before. The goal is not precise prediction, but **useful decisions with honest uncertainty**.

### Level 3 — Story points and planning poker

Many Scrum teams estimate in **story points**: a relative measure of the size of a piece of work, combining effort, complexity and uncertainty. Instead of asking "how many hours?", the team asks "how big is this compared with things we have done before?" A story estimated at 5 points is roughly two to three times bigger than a 2-point story.

Teams usually use a scale based loosely on the Fibonacci sequence — 1, 2, 3, 5, 8, 13, 20 — because the gaps grow with size. That reflects reality: you can tell 2 from 3, but not 13 from 14.

**Planning poker** is a common way to estimate together:

1. The Product Owner explains the story; the team asks questions.
2. Everyone privately chooses a card with their estimate.
3. All cards are revealed **at the same time**, so nobody anchors on the first person to speak (usually the most senior).
4. If the estimates differ widely — say 2 and 13 — the people with the highest and lowest explain their reasoning. This is the **valuable part**: often one person knows about a hidden difficulty ("the SMS provider needs approval for new message templates") or a shortcut ("we already have that component").
5. The team re-votes until estimates are close.

Notice that the real output of planning poker is a **shared understanding** of the work. The number is secondary.

### Level 4 — Velocity and forecasting

**Velocity** is the number of story points a team completes (to the Definition of Done) in a sprint. Averaged over several sprints, it helps forecast. Always forecast as a **range**, not a single date:

```ts
const recentVelocities = [34, 41, 29, 38, 36]; // points completed in the last five sprints
const remainingPoints = 180;

const sorted = [...recentVelocities].sort((a, b) => a - b);
const slowest = sorted[0]!;
const fastest = sorted.at(-1)!;
const average = recentVelocities.reduce((sum, v) => sum + v, 0) / recentVelocities.length;

const sprintsNeeded = (velocity: number) => Math.ceil(remainingPoints / velocity);

console.log(`average velocity: ${average.toFixed(1)} points per sprint`);
console.log(`likely: ${sprintsNeeded(average)} sprints`);
console.log(`range: ${sprintsNeeded(fastest)} to ${sprintsNeeded(slowest)} sprints`);
```

**Output:**

```text
average velocity: 35.6 points per sprint
likely: 6 sprints
range: 5 to 7 sprints
```

- The average gives a "likely" forecast; the fastest and slowest recent sprints give a **range**.
- `Math.ceil` rounds up: a partly used sprint is still a sprint.
- The honest message to stakeholders is "about six sprints — between five and seven, if the scope stays the same", and the forecast is updated every sprint as reality arrives.

Velocity has firm limits:

- It is **specific to one team**. Points are relative to that team's own past work; comparing velocities between teams is meaningless.
- It is a **planning tool, not a performance measure.** If managers push for higher velocity, teams simply inflate estimates — the number rises and nothing else changes. This is an example of **Goodhart's law**: "when a measure becomes a target, it ceases to be a good measure."
- It assumes the team and the kind of work stay roughly the same.

### Level 4 — Estimating without points

Some teams avoid story points entirely. They split work into stories of roughly similar, small size, and then simply **count** items: "we finish about 8 stories a sprint; there are 40 left, so about 5 sprints". Others forecast using their historical **throughput** and **cycle time** from the Kanban board. Advocates of this approach (sometimes discussed under the name *#NoEstimates*) argue that consistently small items plus real data predict as well as story points, with less effort. Both approaches are common; what matters is honest ranges and frequent updates.

### Level 4 — Burndown charts

A **sprint burndown chart** shows the work remaining in the sprint, day by day:

```text
 points
 left
  40 ●
     │ ·.
  30 │   ●·.  ●              · · ·  ideal line
     │       ·.  ●  ●             ●  actual
  20 │          ·.      ●
     │             ·.      ●
  10 │                ·.      ●
     │                   ·.      ●
   0 └────────────────────·.─────────●──
     1  2  3  4  5  6  7  8  9  10   working day
```

- The dotted **ideal** line goes from the total at the start to zero at the end.
- The **actual** line above the ideal means the team is behind; below means ahead.
- A **flat** actual line for several days usually means nothing is being *finished* — work is too large, blocked, or waiting for review — even if everyone is busy.

The chart is a prompt for a conversation at the stand-up ("we've been flat since day 3; what's stuck?"), not a verdict on people.

### Level 5 — Flow and delivery metrics

Teams also track:

- **Cycle time** and **lead time** — how long work takes from start (or from request) to delivery. Shorter and more predictable is better.
- **Throughput** — items finished per week.
- **Work item age** — how long current items have been in progress. Old items are early warnings.

For delivery performance as a whole, the DORA research mentioned earlier identified four widely used **key metrics**:

| Metric | Question |
|---|---|
| **Deployment frequency** | How often do we release to production? |
| **Lead time for changes** | How long from code committed to code running in production? |
| **Change failure rate** | What fraction of releases cause a failure needing a fix? |
| **Time to restore service** | How quickly do we recover when something fails? |

The first two measure speed; the last two measure stability. (DORA's more recent reports refine the names — for example, "time to restore service" became "failed deployment recovery time" — and have added related measures, but the four questions above remain the core idea.) The research found that the best teams do well on all four. These metrics describe a **team's system**, not individuals, and — like velocity — they are for learning, not for ranking people.

## From beginner to enterprise

**Level 3 — you, in a team.** Pick up work from the top of the board; keep your work in progress low; finish (to the Definition of Done) before starting new things; raise blockers at the stand-up immediately; ask questions during refinement.

**Level 4 — a team running Scrum or Kanban.** A refined, ordered backlog; thin vertical stories with acceptance criteria; an explicit Definition of Done; regular reviews with real stakeholders; retrospectives that produce one or two concrete changes each time — and follow up on them.

**Level 5 — professional practice.** The process is lightweight and adapted to the team, not followed blindly. Engineering practices — tests, CI, small releases, feature flags ({{ch:cicd}}) — make short iterations safe. Forecasts are given as ranges and updated. Metrics are used for improvement, never as targets for individuals.

**Level 6 — many teams.** Coordinating dozens of teams on one product introduces new problems: dependencies between teams, shared releases, consistent priorities. Organisations use approaches such as regular cross-team planning, platform teams that serve product teams, and scaling frameworks (for example SAFe, LeSS or Nexus), with very different levels of ceremony. Many experienced engineers argue that the most effective scaling technique is architectural: designing systems and team boundaries so that teams **need** to coordinate less — teams that own independent services and can release without waiting for each other ({{ch:microservices}}). The observation that a system's structure tends to mirror the communication structure of the organisation that built it is known as **Conway's law**.

## Real-world use cases

### A feature team adopting Scrum

- **Situation:** a six-person team builds features for a shop's mobile app; priorities change often and stakeholders complain they "never know what's happening".
- **Approach:** two-week sprints with a Sprint Goal; one Product Owner who orders the backlog; sprint reviews with the marketing and support teams; a Definition of Done that includes "released to 10% of users behind a feature flag".
- **Result:** stakeholders see working software every two weeks and influence the next sprint; surprises shrink.
- **Pitfall to watch:** sprint reviews that become slide presentations instead of live demos.

### A support and operations team adopting Kanban

- **Situation:** a platform team receives unpredictable requests — urgent incidents, access requests, small fixes. Two-week sprint commitments were broken every week.
- **Approach:** a Kanban board with WIP limits, an "expedite" lane for true emergencies (limited to one item), explicit policies for what counts as urgent, and weekly review of cycle-time data.
- **Result:** fewer half-finished tasks, faster response to urgent work, and data to show managers why requests wait.

### Recovering a failing "Agile" project

- **Situation:** a team holds every Scrum meeting, but nothing ships for months; each sprint ends with most stories "90% done".
- **Diagnosis:** stories are horizontal layers; there is no Definition of Done; testing is done by a separate team at the end; WIP is very high.
- **Approach:** split work vertically; add a Definition of Done that includes tested and deployed; bring testing into the team; set WIP limits; demo only what is truly done.
- **Result:** the first real increment ships within two sprints. The ceremonies were never the problem — the absence of the underlying practices was.

## Common mistakes

### Beginner: treating the stand-up as a status report

People recite activity lists to a manager ("I worked on the ticket, I'll keep working on the ticket"). **Fix:** focus on the Sprint Goal and on **blockers** — the stand-up exists so the team can help each other.

### Beginner: silently staying blocked

Waiting a day for an answer without telling anyone. **Fix:** raise blockers immediately, not just at the next stand-up; ask for help early.

### Beginner: "almost done"

Many tasks at 90%, none finished. **Fix:** stop starting, start finishing; respect WIP limits; work in thin slices.

### Intermediate: converting points to hours

"One point equals four hours." **Consequence:** the relative nature of points is lost, and estimates become disguised time promises. **Fix:** if you need hours, estimate in hours; otherwise keep points relative, or just count small items.

### Intermediate: using velocity to compare or pressure teams

**Consequence:** inflated estimates, lower quality, lost trust. **Fix:** velocity is the team's private planning tool.

### Production: no Definition of Done, or one without testing and deployment

**Consequence:** "done" work that is not working in production; hidden work piles up; bugs reach users. **Fix:** a Definition of Done that includes automated tests, review and deployment.

### Enterprise: "cargo-cult" Agile

All the ceremonies, none of the substance: sprints with no working increment, reviews with no real stakeholders, retrospectives whose actions are never taken, and a fixed scope and deadline decided in advance. The name comes from imitating the outward form of something without its function. **Fix:** go back to the purpose — short feedback loops with real users and real working software — and keep only the practices that serve it.

## Debugging and troubleshooting your process

**The sprint goal is missed sprint after sprint.** Check: are stories too large? Is unplanned work entering the sprint? Is the team over-committing to please someone? Look at the burndown shape and the amount of unplanned work, and discuss it in the retrospective.

**Work takes far longer than estimated.** Look at cycle time by stage on the board. Often the time is not in coding but in **waiting** — for review, for testing, for a decision. Shorten the waits (review faster, test inside the team, decide sooner) rather than pushing people to code faster.

**Retrospectives feel useless.** Usually because actions are vague ("communicate better") or never followed up. Agree on one or two specific, small changes with an owner ("reviews get a first response within a working day; Asma will check the open-PR list at stand-up"), and start the next retrospective by checking them.

**Stakeholders do not trust the team's forecasts.** Give ranges, show the data, update every sprint, and communicate early when the range moves. Trust comes from predictability and honesty more than from optimistic dates.

## Security and quality inside Agile

Short iterations do not excuse skipping security or quality. Professional teams build them into the flow:

- Security requirements appear in acceptance criteria ("only the parcel's customer can see the rider's location").
- The Definition of Done includes security checks: dependency scanning, secret scanning, code review of sensitive areas ({{ch:github}}).
- **Threat modelling** — asking "how could this be attacked?" — is done during refinement for risky stories ({{ch:application-security}}).
- Technical debt and maintenance work are visible in the backlog and prioritised honestly, not hidden ({{ch:clean-code}}).

Teams that treat quality and security as "a later sprint" accumulate risk that eventually stops all feature work.

## How a senior engineer thinks about this

- **The process serves the team, not the other way round.** They care about short feedback loops, working software and sustainable pace, and adapt or drop practices that do not help.
- **Finishing beats starting.** They keep their own work in progress low and help others finish.
- **They shape the work, not just do it.** They help the Product Owner split epics into thin vertical slices, surface technical risks early, and propose cheaper alternatives that achieve the same goal.
- **Estimates are communication.** They give ranges with assumptions ("about a week, if the payment provider's sandbox works as documented"), and raise changes early.
- **Retrospectives are where teams improve.** They bring specific, honest observations — including about their own mistakes.
- **They protect quality.** They push back, politely and with reasons, when deadlines are being met by skipping tests, reviews or security.

## Exercises

### Exercise 1 — Write a story

**Objective:** practise user stories and acceptance criteria.
**The scenario:** customers of an online pharmacy want to be reminded when a regular prescription is about to run out.
**What to do:** write one user story and at least three acceptance-criteria scenarios in Given/When/Then form, including at least one edge case.

<details>
<summary>Show the solution</summary>

```text
As a customer with a repeat prescription,
I want a reminder before my medicine runs out,
so that I can reorder in time and not miss doses.

Scenario: reminder sent before running out
  Given a repeat order of 30 tablets, one per day, delivered on 1 March
  When the date is 25 March (5 days before the supply ends)
  Then the customer receives an SMS and email reminder with a reorder link

Scenario: customer already reordered
  Given the customer placed a new order for the same medicine on 20 March
  When the reminder date is reached
  Then no reminder is sent

Scenario: customer opted out
  Given the customer has turned off reminders in their settings
  When the reminder date is reached
  Then no reminder is sent

Scenario: prescription expired
  Given the prescription expires before the next refill would be due
  When the reminder is sent
  Then it says a new prescription from the doctor is needed instead of a reorder link
```

**Walkthrough:** the "so that" explains the benefit (not missing doses), which guides decisions such as how early to remind. The scenarios include the normal case and three edge cases that a developer would otherwise have to guess about. "5 days before" is a business rule worth confirming with the Product Owner — writing it down makes that conversation happen.

</details>

### Exercise 2 — Split the epic

**Objective:** practise vertical slicing.
**The epic:** "Restaurant owners can manage their menu in our food-delivery app" (add, edit and remove dishes, with photos, prices, categories, availability and daily specials).
**What to do:** split it into five to seven thin vertical stories, ordered so that the first one alone is useful.

<details>
<summary>Show the solution</summary>

1. Owner can add a dish with a name and price, and it appears on the customer menu (text only).
2. Owner can edit a dish's name and price.
3. Owner can mark a dish as "sold out today" so customers cannot order it.
4. Owner can group dishes into categories (Starters, Mains, Drinks).
5. Owner can upload one photo per dish ({{ch:file-uploads}}).
6. Owner can remove a dish (hidden from customers; past orders unaffected).
7. Owner can schedule a daily special that appears only on chosen days.

**Walkthrough:** each story touches the screen, the API and the database, and is usable on its own. Story 1 already lets a restaurant go live with a basic menu. "Sold out today" comes early because it prevents failed orders — high value. Photos and specials are valuable but not essential, so they come later. A horizontal split ("design the menu database", "build menu API", "build menu screens") would deliver nothing usable until all three were done.

</details>

### Exercise 3 — Read the board

**Objective:** practise diagnosing flow problems.
**The scenario:** a team of five has this board in the middle of a sprint: Ready (6), In progress (9), Code review (7), Testing (1), Done (2). The burndown has been flat for four days. Everyone says they are busy. What is happening, and what should the team do?

<details>
<summary>Show the solution</summary>

**Diagnosis:** far too much work in progress. Nine items in progress for five people means people are juggling and switching. **Seven items waiting in code review** is the real bottleneck: work is being started but not reviewed, so nothing reaches testing or done. The flat burndown confirms that nothing is being **finished**, despite everyone being busy.

**Actions:**
1. **Stop starting.** Nobody picks up new items from Ready until the review queue is cleared.
2. **Swarm on reviews.** Everyone spends the next part of the day reviewing — oldest first.
3. **Set WIP limits** — for example, In progress ≤ 4 and Code review ≤ 3 — so a queue forms visibly before it grows this large.
4. **Look at PR size** in the retrospective: seven waiting reviews often means PRs are too big to review quickly ({{ch:code-review-and-documentation}}).

By Little's Law, cutting work in progress while keeping throughput the same directly shortens how long each item takes.

</details>

### Exercise 4 — Production scenario: the mid-sprint request

**Objective:** practise handling change professionally.
**The scenario:** on day 4 of a 10-day sprint with the goal "Customers can pay by bank transfer", the head of sales asks you directly to add a "bulk discount for corporate clients" by the end of the week, for a big customer meeting. What do you do?

<details>
<summary>Show the solution</summary>

1. **Be helpful, and redirect to the right decision-maker.** "Thanks — that sounds important. The Product Owner decides what we change mid-sprint; let's bring this to them together."
2. **Clarify the real need.** What exactly does the customer meeting require? Perhaps a quote calculated by hand, or a demo on a staging environment, would serve the meeting — far less work than a production feature.
3. **Make the trade-off visible.** With the Product Owner, estimate the work roughly. If it is genuinely more valuable than the current goal, the Product Owner decides what to **remove** from the sprint to make room, and stakeholders are told. If it threatens the Sprint Goal entirely, the Product Owner may decide to change or cancel the sprint.
4. **If it is not urgent,** it goes into the Product Backlog, ordered against everything else, for the next sprint planning.
5. **Do not quietly do both.** Silently adding work leads to a missed Sprint Goal, overtime, rushed quality — and stakeholders learning that the best way to get things done is to bypass the process.

**Why:** the process exists so priorities are decided openly by the person accountable for value, with everyone seeing the cost. Your job as a developer is to make the trade-off clear and the conversation easy, not to refuse or to secretly absorb the work.

</details>

## Summary

Big up-front plans fail for most software because requirements are discovered, not just collected, and feedback arrives too late. **Agile** answers with short **feedback loops**: build something small, show it, learn, adjust. The **Agile Manifesto** values individuals and interactions, working software, customer collaboration and responding to change — more than, not instead of, processes, documentation, contracts and plans — and stresses technical excellence and sustainable pace.

**Scrum** organises work into fixed-length **sprints** with a **Sprint Goal**. A **Product Owner** orders the **Product Backlog**; a **Scrum Master** helps the team work effectively and removes impediments; **Developers** plan and build the work. The events — **Sprint Planning**, the **Daily Scrum**, the **Sprint Review** and the **Retrospective** — are time-boxed inspection points, and the **Definition of Done** makes "done" mean tested, reviewed and shippable. **Kanban** visualises work, **limits work in progress** and manages flow; **Little's Law** shows why fewer items in progress means faster delivery of each.

Write **user stories** with a real "so that", testable **acceptance criteria** and the INVEST qualities, and split epics into thin **vertical slices**. Estimate with story points and planning poker, or by counting small items; forecast with **ranges** from real velocity or throughput, and never use these numbers as targets. Watch burndown, cycle time and the **DORA metrics** to improve the system, not to rank people. Above all, keep the substance — working software, real feedback, finishing before starting — rather than the ceremonies alone.

## Key terms

- **Agile** — A set of values and principles for building software in short iterations with close collaboration and frequent adaptation to feedback.
- **Agile Manifesto** — The 2001 statement of four values and twelve principles that founded the Agile movement.
- **Waterfall model** — A sequential approach in which each phase of development is completed before the next begins.
- **Software development life cycle (SDLC)** — The stages software passes through, from understanding needs to building, releasing, operating and improving it.
- **Feedback loop** — A cycle of acting, observing the result and adjusting based on what was learned.
- **Iteration** — One short cycle of planning, building and reviewing work.
- **Increment** — A working, usable addition to the product produced during an iteration.
- **Scrum** — An Agile framework built on fixed-length sprints, three accountabilities, five events and three artefacts.
- **Sprint** — A fixed-length period of one month or less in which a Scrum team creates a usable increment.
- **Sprint Goal** — The single objective that gives a sprint its focus.
- **Product Owner** — The person accountable for maximising product value and for ordering the Product Backlog.
- **Scrum Master** — The person accountable for the team's effectiveness with Scrum, including removing impediments.
- **Developers (Scrum)** — The members of a Scrum team who create the increment.
- **Sprint Planning** — The event that starts a sprint by setting its goal, selecting work and planning how to do it.
- **Daily Scrum (stand-up)** — A short daily event in which developers inspect progress towards the sprint goal and adjust their plan.
- **Sprint Review** — The event at the end of a sprint where the team and stakeholders inspect the increment and adapt the backlog.
- **Sprint Retrospective** — The event where the team inspects how it works and agrees on improvements.
- **Product Backlog** — The single ordered list of work that might be needed in the product.
- **Sprint Backlog** — The sprint goal, the items selected for the sprint and the plan for delivering them.
- **Definition of Done** — A shared checklist that work must satisfy to count as complete.
- **Backlog refinement** — The ongoing activity of clarifying, splitting and estimating upcoming backlog items.
- **Kanban** — A method for managing work by visualising it, limiting work in progress and improving flow.
- **Work in progress (WIP) limit** — A maximum number of items allowed in a stage of work at one time.
- **Little's Law** — The relationship stating that average cycle time equals average work in progress divided by average throughput.
- **Cycle time** — The time an item takes from when work starts on it until it is finished.
- **Throughput** — The number of work items finished per unit of time.
- **User story** — A short description of a capability from the point of view of someone who benefits from it.
- **Acceptance criteria** — Specific, testable conditions that must be true for a story to be accepted.
- **Epic** — A large body of work that is split into smaller user stories.
- **INVEST** — A checklist for good backlog items: independent, negotiable, valuable, estimable, small and testable.
- **Vertical slice** — A small piece of functionality that goes through every layer of the system and is usable on its own.
- **Story point** — A relative unit for estimating the size of work, combining effort, complexity and uncertainty.
- **Planning poker** — A team estimation technique in which everyone reveals estimates at the same time and discusses differences.
- **Velocity** — The amount of work, often in story points, a team completes in a sprint.
- **Burndown chart** — A chart showing the work remaining over the course of a sprint.
- **DORA metrics** — Four measures of software delivery performance: deployment frequency, lead time for changes, change failure rate and time to restore service.
- **Goodhart's law** — The observation that when a measure becomes a target, it stops being a good measure.
- **Conway's law** — The observation that a system's design tends to mirror the communication structure of the organisation that built it.
- **Cargo-cult Agile** — Following the outward rituals of an Agile framework without achieving its purpose.

## What comes next

Part V is complete. You now know how professional teams record changes, collaborate through pull requests, review code, document decisions and organise their work.

Part VI turns to building the part of software that users see and touch: the **frontend**. It begins at the foundation of every web page, {{ch:html}} — the language that gives a page its structure and meaning — and continues through CSS, the browser's Document Object Model, React and Next.js, all the way to performance, search engines and accessibility.
