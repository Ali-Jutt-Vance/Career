# Presenting a Design

> [!GOALS]
> - Understand that a design presentation is assessed on **process and reasoning**, not a single correct architecture.
> - Follow a visible six-step structure: **clarify, estimate, define the interface, high-level design, deep dive, bottlenecks**.
> - Narrate diagrams, state the **trade-off** of every decision, and manage time.
> - Use your own systems as evidence, honestly scaled.
> - Draw clearly, handle pushback without defensiveness, and write a design document that supports the conversation.

## Why this matters

In a system design interview, there is usually no correct answer, and the interviewer often has no fixed solution in mind. Two candidates can propose completely different architectures and both pass — or both fail. What is assessed is *how* you get there: whether you clarify before drawing, keep a clear structure, name trade-offs instead of presenting choices as obvious, and respond to challenges by reasoning rather than defending.

The same skills matter at work, when you present a design to your team, propose an architecture change to senior engineers or explain a plan to managers. People are deciding whether they can **reason with you**. The technical content is covered in {{ch:system-design-fundamentals}} and the worked designs ({{ch:designing-twitter}}, {{ch:designing-whatsapp}}, {{ch:designing-youtube}}); this chapter covers presenting it.

## The simple idea

Presenting a design is like an architect walking a client through house plans. A good architect starts by asking how many people will live there and what they care about, shows the overall layout before the plumbing, explains why the kitchen faces east and what that costs, and listens when the client asks "what if we add a floor?"

> [!ANALOGY]
> Presenting a design is like an architect walking a client through house plans: understand the needs, show the overall layout, explain each choice and its cost, and adapt to questions.
>
> **Where the analogy breaks:** a house is built once and rarely changes. Software designs evolve constantly, so a good presentation also says what will break first as the system grows and what you would change then.

## The proper definition and key words

**Presenting a design** means explaining a proposed system — its requirements, structure and trade-offs — so others can understand, question and improve it.

Key words:

- **Requirements** — what the system must do (functional) and how well (non-functional: latency, availability, cost).
- **Back-of-envelope estimate** — a rough calculation of scale to guide decisions.
- **Trade-off** — what you gain and what you give up with a choice ({{ch:engineering-decisions}}).
- **Bottleneck** — the part that limits the system first as load grows.
- **Design document** — a written description of a design, its alternatives and decisions.

## The six-step structure

Say the steps out loud as you move between them, so the listener hears the structure rather than having to guess it.

### Level 1 — 1. Clarify the requirements

This is the step people skip, and skipping it costs more than any technical mistake. Ask:

- What does it need to do? What is explicitly out of scope?
- Who uses it, and roughly how many?
- Is it read-heavy or write-heavy?
- How fresh must data be? Is eventual consistency acceptable? ({{ch:distributed-systems}})
- What matters most — latency, availability, cost or simplicity?

Then **summarise back**:

> "So: a link shortener, about ten million new links a month, very read-heavy, redirects must be fast, and analytics can lag by a few minutes. Custom domains are out of scope. Is that right?"

That summary alone is a strong signal: it shows you can turn a vague brief into a bounded problem — much of what senior engineers do.

### Level 1 — 2. Estimate the scale

Rough numbers, out loud. Nobody expects precision; the point is to reason about size *before* choosing technology, which stops you reaching for complex distributed systems for a modest load ({{ch:scalability}}). The arithmetic is simple enough to do in your head, but here it is as code:

```ts
// Back-of-envelope estimate for a link shortener, said out loud in step 2 of a design round.
const SECONDS_PER_MONTH = 30 * 24 * 3600;
const assumptions = {
  newLinksPerMonth: 10_000_000,
  readsPerWrite: 100,          // "very read-heavy"
  peakFactor: 3,               // peak traffic vs. average
  bytesPerLink: 500,           // code + URL + metadata, rounded up
  years: 5,
};

const writesPerSec = assumptions.newLinksPerMonth / SECONDS_PER_MONTH;
const readsPerSec = writesPerSec * assumptions.readsPerWrite;
const storageGB = (assumptions.newLinksPerMonth * 12 * assumptions.years * assumptions.bytesPerLink) / 1e9;

const round = (n: number) => (n < 10 ? n.toFixed(1) : Math.round(n).toString());
console.log(`writes/s average: ${round(writesPerSec)}   peak: ${round(writesPerSec * assumptions.peakFactor)}`);
console.log(`reads/s  average: ${round(readsPerSec)}   peak: ${round(readsPerSec * assumptions.peakFactor)}`);
console.log(`storage after ${assumptions.years} years: ${round(storageGB)} GB`);
console.log(`short codes needed: ${(assumptions.newLinksPerMonth * 12 * assumptions.years).toLocaleString("en-US")}`);
console.log(`7-char base62 codes available: ${(62 ** 7).toLocaleString("en-US")}`);
```

**Output:**

```text
writes/s average: 3.9   peak: 12
reads/s  average: 386   peak: 1157
storage after 5 years: 300 GB
short codes needed: 600,000,000
7-char base62 codes available: 3,521,614,606,208
```

Said aloud:

> "That's about four writes a second and a few hundred reads — around a thousand at peak. Storage is a few hundred gigabytes over five years. None of that is large: one well-indexed database with a cache can handle it. Seven-character codes give us billions of combinations, far more than we need."

### Level 1 — 3. Define the interface

Name the two or three main operations:

> "`POST /links` takes a URL and returns a short code. `GET /:code` redirects. `GET /links/:code/stats` returns the click count." ({{ch:rest-apis}})

This anchors the rest of the design in something concrete.

### Level 2 — 4. Draw the high-level design

Simple first: client, load balancer, service, database, cache. **Narrate as you draw** — a diagram appearing in silence is hard to follow.

```text
           ┌──────────────┐     ┌─────────────┐     ┌──────────────┐
client ──▶ │ load balancer│ ──▶ │ link service│ ──▶ │ cache (Redis)│
           └──────────────┘     │  (2+ copies)│     └──────┬───────┘
                                └──────┬──────┘            │ miss
                                       │ writes            ▼
                                       └──────────▶ ┌──────────────┐
                                                    │  PostgreSQL  │
                                                    └──────────────┘
```

Resist adding components to look thorough. An unexplained message queue is worse than none, because the next question is "why is that there?" — and "it's standard" is not an answer.

### Level 2 — 5. Go deep on one component

Ask which:

> "I could go deeper on the data model, or on keeping redirects fast under load. Which is more useful?"

Asking lets the interviewer steer towards what they want to assess. **Depth on one component beats a shallow pass over eight.** This is where most of the assessment happens.

### Level 2 — 6. Bottlenecks and next steps

> "The first thing to break is the database on reads. I'd put a cache in front of the redirect path — codes never change, so invalidation is simple. After that, the analytics writes; I'd move click counting to a queue and aggregate asynchronously." ({{ch:caching-at-scale}}, {{ch:message-brokers}})

Ending with where the design breaks, unprompted, is what senior engineers sound like.

## Habits that carry the presentation

### Level 3 — Narrate every box

Say what each component is and why it's there, in one sentence: "Load balancer here, because I want more than one copy of the service for availability."

### Level 3 — Say the trade-off, every time

This is the most important habit:

> "I'll cache redirect lookups. That takes reads off the database and makes the hot path fast. The cost is another component to run, and a short window where a deleted link might still redirect. For a link shortener, that's acceptable."

A decision presented without its cost sounds like a decision you didn't really make. Follow every choice with "the trade-off is…".

### Level 3 — Think aloud when choosing

> "I could store analytics in the same database or in a separate store. The same database is simpler and fine at this scale; a separate store is better if analytics queries get heavy. I'll start with the same database and split later if needed."

### Level 3 — Check in and manage time

- "Do you want me to go into how short codes are generated, or is the high level enough?"
- "We're about halfway — shall I move to the deep dive?"

If you are twenty minutes into a forty-five-minute round and still clarifying, you have mismanaged the time.

## Using your own systems

### Level 3 — Evidence, honestly scaled

Projects you have built and measured are a real advantage ({{ch:projects-that-prove-skill}}). When the design touches something you have done, say so:

> "In my expense-sharing app I hit this on a smaller scale — the group summary endpoint had an N+1 query and took 380 ms. A join and a composite index brought it to about 20 ms. So here I'd check the query plan before reaching for a cache." ({{ch:query-optimization}})

The answer becomes concrete, and the interviewer can probe an area where you are strong. Do not overreach: "I've only run this with a few hundred thousand rows, so I'm reasoning about the larger scale" is honest and fine.

## Drawing clearly

### Level 4 — Diagram habits

- **Boxes and arrows only** — no decoration you have to explain.
- **Left to right, following the request** — client on the left, storage on the right.
- **Label arrows** with what flows along them ("writes", "cache miss").
- **Leave space** — you will add things later.
- **On video calls**, practise the drawing tool in advance; fumbling with an unfamiliar tool wastes precious minutes.

## Handling pushback

### Level 4 — Challenge is the method

Interviewers and colleagues will challenge your design. This is not disagreement — it is how they learn how you think.

| They say | A good response |
|---|---|
| "What if this database goes down?" | "Right now that's a single point of failure. I'd add a replica with automatic failover; we'd lose a few seconds of writes in the worst case, which seems acceptable here." ({{ch:replication}}) |
| "Why not use X instead?" | "X would work. I leaned this way because Y. If Z mattered more, X would be the better choice." |
| "This won't scale." | "What load are you thinking of? At ten times this I'd expect the read path to break first, and I'd add caching before anything more complex." |
| "That seems complicated." | "Fair — let me simplify. Do we need the queue at this scale? Probably not; I'll remove it." |

Changing your mind for a good reason is a strength. Defensiveness is the one thing to avoid: the round simulates designing something *together*.

## The design document

### Level 4 — Writing it down

At work, presentations are usually backed by a short design document ({{ch:software-architecture}}). A common structure:

1. **Context** — the problem and why it matters now.
2. **Requirements** — functional and non-functional, with numbers.
3. **Proposal** — the design, with a diagram.
4. **Alternatives considered** — and why they were not chosen.
5. **Trade-offs and risks** — what this costs and what could go wrong.
6. **Rollout plan** — migration, monitoring and rollback.
7. **Open questions** — what still needs deciding.

Send it before the meeting, so the meeting is for discussion rather than reading.

## From beginner to enterprise

**Level 1 — structure.** Clarify, estimate, define the interface.

**Level 2 — the design.** A simple high-level diagram, one deep dive, bottlenecks.

**Level 3 — reasoning aloud.** Narrating, trade-offs, thinking aloud, checking in, using your own evidence.

**Level 4 — clarity and challenge.** Clean diagrams, graceful pushback, a supporting design document.

**Level 5 — design reviews at work.** Presenting to senior engineers and stakeholders; writing decision records ({{ch:engineering-decisions}}).

**Level 6 — shaping architecture.** Leading design reviews, asking the questions that improve other people's designs ({{ch:technical-leadership}}).

## Real-world use cases

### The skipped requirements

- **Story**: a candidate designed a globally distributed, sharded system for a URL shortener in the first ten minutes. When asked about scale, the answer was a few hundred requests per second — a single database would do. The design was not wrong, just unjustified; the interviewer marked down judgement.

### The changed mind

- **Story**: challenged on whether a queue was needed, a candidate said, "You're right, at this scale it adds complexity without much benefit — I'll remove it and revisit if analytics writes grow." The interviewer noted it as a strong moment.

## Common mistakes

### Beginner: drawing before clarifying

**Fix:** requirements and a summary first.

### Beginner: drawing in silence

**Fix:** narrate every box.

### Intermediate: decisions without trade-offs

**Fix:** "the trade-off is…" every time.

### Intermediate: a shallow pass over everything

**Fix:** ask which component to go deep on.

### Intermediate: defending a design against every challenge

**Fix:** engage, reason and change your mind when the reason is good.

## Debugging and troubleshooting

- **You run out of time**: check in at milestones; keep the high-level design short.
- **The interviewer seems unconvinced**: ask what concerns them — "Which part worries you most?"
- **You don't know a component well**: say so and reason ({{ch:questions-you-cannot-answer}}).
- **The diagram is a mess**: redraw it simply — "Let me tidy this up."

## Security summary

- **Mention security in every design**: authentication at the edge, authorisation in services, encryption in transit and at rest, rate limiting, secrets in a secrets manager ({{ch:application-security}}).
- **Include abuse cases**: for a link shortener, malicious URLs and spam — "I'd check new URLs against a blocklist and rate-limit creation per user."
- **In design documents**, a short "Security considerations" section is standard.

## How a senior engineer thinks about this

- **Requirements decide the design.** Clarify before drawing.
- **Every choice has a cost.** Say it.
- **Simple until proven otherwise.** Add complexity when numbers justify it.
- **Designing is collaborative.** Challenge improves designs.

## Exercises

### Exercise 1 — Clarify and summarise

**Objective:** practise step 1.
**What to do:** you are asked to "design a notification system". Write five clarifying questions and a one-sentence summary based on plausible answers.

<details>
<summary>Show the solution</summary>

Questions: Which channels — email, SMS, push? Roughly how many notifications per day? Must they arrive in seconds, or are minutes acceptable? Do users control preferences? Do we need delivery tracking?

Summary: "So: email and push, about five million notifications a day, delivery within a minute, user preferences respected, and delivery status tracked. SMS is out of scope. Is that right?"

</details>

### Exercise 2 — The trade-off sentence

**Objective:** practise naming costs.
**What to do:** write trade-off sentences for (a) adding a read replica, (b) using a message queue for sending emails.

<details>
<summary>Show the solution</summary>

(a) "A read replica takes read load off the primary, but reads may be slightly stale because of replication lag, so I'd keep reads that must be current on the primary."

(b) "A queue decouples sending from the request, so the API stays fast and retries are easy. The cost is another system to run and monitor, and emails become asynchronous — the user won't know immediately if sending failed." ({{ch:sns-sqs}})

</details>

### Exercise 3 — Handle pushback

**Objective:** practise responding to challenges.
**What to do:** you proposed PostgreSQL; the interviewer asks, "Why not MongoDB?" Write your answer.

<details>
<summary>Show the solution</summary>

"MongoDB would work. I chose PostgreSQL because the data is relational — users, links, clicks — and I want constraints and joins for the analytics. If the data were document-shaped, or we needed very flexible schemas, MongoDB would be a better fit. Is there something about the workload that makes you lean towards it?" ({{ch:mongodb}})

</details>

## Summary

A design presentation is assessed on **process and reasoning**, not on one correct architecture. Follow six visible steps: **clarify** the requirements and summarise them back; **estimate** the scale with rough numbers; **define the interface**; draw a **simple high-level design** while narrating; **go deep on one component**, after asking which; and finish with the **bottlenecks** and what you would do next.

Narrate every component, **state the trade-off** of every decision, think aloud when choosing, check in and manage time. Use your own measured projects as evidence, with honest scale. Draw boxes and arrows left to right with labelled arrows and space to grow. Treat **pushback** as the method, not an attack: engage, reason and change your mind for good reasons. At work, support the presentation with a **design document** covering context, requirements, proposal, alternatives, trade-offs, rollout and open questions — and include security in every design.

## Key terms

- **Functional requirement** — What the system must do.
- **Non-functional requirement** — How well it must do it (latency, availability, cost).
- **Back-of-envelope estimate** — A rough calculation of scale.
- **High-level design** — The main components and how they connect.
- **Deep dive** — Detailed discussion of one component.
- **Trade-off** — The gain and cost of a choice.
- **Bottleneck** — The first part to limit the system as load grows.
- **Design document** — A written proposal with alternatives and decisions.

## What comes next

One conversation in the hiring process carries more money than any other. The next chapter, {{ch:the-salary-conversation}}, covers the language of discussing pay: answering expectation questions, stating a number, responding to an offer and negotiating politely in English.
