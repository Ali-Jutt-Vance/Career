# Making Engineering Decisions: Trade-offs, Estimates and "Good Enough"

> [!GOALS]
> - Make decisions deliberately: frame the problem, list options, compare trade-offs, decide and record.
> - Distinguish **reversible** from **irreversible** decisions and spend effort accordingly.
> - Estimate with **ranges** and confidence instead of single numbers, and communicate uncertainty.
> - Write **design documents** and RFCs that others can review.
> - Choose "**good enough**": avoid both over-engineering and dangerous shortcuts, and manage technical debt consciously.
> - Decide with other people: disagreement, consensus, "disagree and commit", and escalation.

## Why this matters

Engineering is a constant stream of decisions: which database, which library, build or buy, refactor now or later, how long will this take, ship today or wait for the extra test. Junior engineers mostly receive decisions; senior engineers make them, explain them and live with their consequences. Much of what makes someone "senior" is not knowing more technology but **deciding well under uncertainty** — and helping teams decide well together.

Bad decisions are rarely bad because of missing knowledge. They come from unclear problems, a single option considered, hidden assumptions, optimistic estimates, decisions nobody wrote down, or endless debate that delays everything. This chapter gives practical tools for each, connecting to architecture decision records ({{ch:software-architecture}}) and system design trade-offs ({{ch:system-design-fundamentals}}).

## The simple idea

Choosing a technology is like choosing a route for a journey. First be clear about the destination and what matters — arriving on time, cost, comfort. Look at more than one route. Ask how sure you are about each one's travel time. Prefer routes where you can change your mind halfway if there is traffic. And once you have chosen, tell your passengers why, so nobody argues at every junction.

> [!ANALOGY]
> Making an engineering decision is like choosing a route: know the destination, compare several routes on what matters, be honest about uncertain travel times, and prefer routes you can change halfway.
>
> **Where the analogy breaks:** a car journey's route can almost always be changed. Some engineering decisions — a public API format, a database holding years of data, a programming language for a large codebase — are very hard to reverse. Knowing which decisions are like that is half the skill.

## The proper definition and key words

**Engineering decision-making** is the practice of choosing between technical options by making the problem, constraints, alternatives, trade-offs and uncertainty explicit, then committing and recording the choice so it can be reviewed and revisited.

Key words:

- **Trade-off** — gaining one quality at the cost of another.
- **Constraint** — a fixed limit: deadline, budget, regulation, team skills.
- **One-way / two-way door** — irreversible / reversible decision.
- **Decision matrix** — options scored against weighted criteria.
- **Estimate** — a forecast of effort or time, with uncertainty.
- **Three-point estimate** — best case, most likely and worst case.
- **Confidence interval** — a range with a stated probability (85% chance of finishing within 22 days).
- **Design document / RFC** — a written proposal for review before building.
- **"Good enough"** — meeting the actual requirements without unnecessary cost.
- **YAGNI** — "you aren't gonna need it": do not build for speculative needs.
- **Technical debt** — the future cost of today's shortcuts.
- **Disagree and commit** — supporting a decision fully after voicing disagreement.

## Deciding well

### Level 1 — A simple decision process

1. **Frame the problem**: what are we trying to achieve, for whom, and how will we know it worked? Many arguments about solutions are really disagreements about the problem.
2. **List constraints and criteria**: deadline, budget, team skills, quality attributes ({{ch:software-architecture}}).
3. **Generate at least two or three options** — including "do nothing" and "the simplest thing".
4. **Compare trade-offs** honestly, including risks and costs over time (build, run, maintain, migrate away).
5. **Decide** — with the right people and at the right level.
6. **Record** it (an ADR or a short note) with the reasons and what would make you revisit it.
7. **Review** later: was the decision good given what was known?

### Level 2 — Reversible and irreversible decisions

- **Two-way doors** (easy to undo): a library inside one module, a UI layout, an internal API with one consumer, a feature behind a flag. **Decide quickly**, by the people closest to the work, and change course when you learn more. Slow processes here are waste.
- **One-way doors** (expensive to undo): public API contracts, data models holding years of data, core platform choices, security architecture, vendor contracts. **Slow down**: more options, more review, prototypes, written designs.
- **Make doors two-way** where you can: interfaces in front of vendors (ports and adapters), feature flags, gradual rollouts, data formats with versioning.

### Level 3 — Making trade-offs explicit

A weighted decision matrix forces the team to agree on **what matters** and **how much**, which is often where the real disagreement lies. This example compares search options for a shop, then turns task estimates into ranges:

```ts
// 1. A weighted decision matrix: make the criteria and their importance explicit
const criteria = { "time to deliver": 0.35, "operating cost": 0.2, "team familiarity": 0.25, "scales to 10x": 0.2 };
const options: Record<string, Record<keyof typeof criteria, number>> = {   // scores 1 (poor) to 5 (great)
  "PostgreSQL full-text search": { "time to deliver": 5, "operating cost": 5, "team familiarity": 5, "scales to 10x": 2 },
  "Managed OpenSearch":          { "time to deliver": 3, "operating cost": 2, "team familiarity": 2, "scales to 10x": 5 },
  "Hosted search SaaS":          { "time to deliver": 4, "operating cost": 2, "team familiarity": 3, "scales to 10x": 4 },
};
const scored = Object.entries(options).map(([name, s]) => ({
  name, score: (Object.keys(criteria) as (keyof typeof criteria)[]).reduce((sum, c) => sum + s[c] * criteria[c], 0),
})).sort((a, b) => b.score - a.score);
for (const o of scored) console.log(`${o.name.padEnd(28)} ${o.score.toFixed(2)}`);

// 2. Estimating with ranges: three-point estimates per task, then a simulation of the total
const tasks = [
  { name: "search index and queries", best: 3, likely: 5, worst: 10 },     // days
  { name: "API and filters", best: 2, likely: 3, worst: 6 },
  { name: "UI", best: 3, likely: 4, worst: 8 },
  { name: "relevance tuning", best: 1, likely: 3, worst: 9 },
];
let seed = 11;
const random = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
function triangular(a: number, m: number, b: number) {                     // sample a "best / likely / worst" estimate
  const u = random(), f = (m - a) / (b - a);
  return u < f ? a + Math.sqrt(u * (b - a) * (m - a)) : b - Math.sqrt((1 - u) * (b - a) * (b - m));
}
const totals = Array.from({ length: 10_000 }, () => tasks.reduce((s, t) => s + triangular(t.best, t.likely, t.worst), 0)).sort((a, b) => a - b);
const pct = (p: number) => totals[Math.floor((p / 100) * totals.length)]!.toFixed(1);
const sumLikely = tasks.reduce((s, t) => s + t.likely, 0);
console.log(`sum of "likely" estimates: ${sumLikely} days`);
console.log(`simulated: 50% chance by ${pct(50)} days, 85% chance by ${pct(85)} days, 95% by ${pct(95)} days`);
console.log(`chance of finishing within the "likely" sum: ${((totals.filter((x) => x <= sumLikely).length / totals.length) * 100).toFixed(0)}%`);
```

**Output:**

```text
PostgreSQL full-text search  4.40
Hosted search SaaS           3.35
Managed OpenSearch           2.95
sum of "likely" estimates: 15 days
simulated: 50% chance by 18.8 days, 85% chance by 21.7 days, 95% by 23.4 days
chance of finishing within the "likely" sum: 6%
```

The first three lines are the decision matrix; the rest are estimates, discussed below.

- With speed of delivery and familiarity weighted highest, **PostgreSQL full-text search** wins clearly: it is good enough now, and the matrix makes visible what it gives up (scaling to ten times the catalogue).
- Change the weights — scaling to 10× most important — and the answer changes. That is the point: the matrix moves the discussion from "my favourite tool" to "what matters most for us now".
- The numbers are not truth; they are a structured conversation. Record the decision with a **revisit condition** ("revisit when the catalogue exceeds 2 million products or search p95 exceeds 300 ms") so choosing the simple option is safe.

### Level 3 — Estimating honestly

- **Estimates are forecasts, not promises.** Give **ranges with confidence**, and update them as you learn.
- **Three-point estimates** per task (best, likely, worst) capture uncertainty. Summing the "likely" values gave 15 days; simulating the uncertainty showed only a **6%** chance of finishing that quickly, with a realistic 85% confidence date around 22 days. Tasks run over much more often than they finish early, and the overruns add up. Single-number estimates are almost always optimistic.
- **Break work down** until tasks are a few days at most; large tasks hide unknowns.
- **Use reference classes**: how long did similar work take last time? Historical data beats intuition.
- **Name the unknowns** and reduce them early with spikes (short timeboxed investigations).
- **Communicate trade-offs** to stakeholders: "We can ship the basic search in two weeks with 85% confidence; filters add another week; relevance tuning is the biggest uncertainty." Offer scope choices, not just dates.
- **Do not pad secretly**: make uncertainty visible, so everyone plans with the same picture.

## Documents and debt

### Level 4 — Design documents and RFCs

For one-way doors and significant changes, write a short design document before building:

```markdown
# Search for the product catalogue (RFC)

Author: … · Reviewers: … · Status: in review

## Problem and goals
Customers cannot find products; 30% of sessions use search and 40% of those end with no click.
Goal: relevant results in < 200 ms p95 for a catalogue of 200,000 products.
Non-goals: personalised ranking; search across orders.

## Options considered
1. PostgreSQL full-text search (recommended)  2. Managed OpenSearch  3. Hosted search SaaS
(trade-offs, costs, risks for each)

## Proposed design
Data flow, schema changes, API, rollout plan behind a feature flag, metrics.

## Risks and open questions
Relevance quality for misspellings; behaviour at 2 million products.

## Revisit when
Catalogue > 2M products, or search p95 > 300 ms, or relevance targets missed after tuning.
```

- Keep it short (often two to five pages); diagrams help ({{ch:software-architecture}}).
- Share early as a draft; ask specific reviewers for specific feedback; set a decision date.
- The document's main value is **thinking clearly** and surfacing objections **before** code exists.

### Level 4 — "Good enough" and technical debt

- **YAGNI**: build for today's requirements and the next likely step, not for every imaginable future. Most speculative flexibility is never used and costs complexity every day.
- **But do not cut corners that are expensive later**: security, data integrity, observability, and one-way-door decisions deserve care even in a prototype.
- **Technical debt** is fine when taken **deliberately**: "we hard-code the tax rules for one country to launch on time; we will generalise before entering a second country". Record it, estimate its "interest" (how much it slows future work), and pay it down where code changes often.
- **Reckless debt** — skipping tests, copying code, ignoring warnings — is not a trade-off, just a cost.

## Deciding with others

### Level 4 — Disagreement and commitment

- **Separate the problem from the person**: argue about criteria and evidence, not about who is right.
- **Ask for the strongest version of the other view** before rejecting it; often both sides weigh criteria differently.
- **Decide who decides**: for many decisions, the owner of the system decides after consultation; consensus is not required for everything, and unanimous agreement on everything is a recipe for paralysis.
- **Disagree and commit**: once decided, support the decision fully; revisit only with new information.
- **Escalate cleanly** when needed: together, write down the options and the disagreement and ask the right person to decide — do not escalate around colleagues.
- **Time-box** decisions: a two-way door debated for weeks costs more than either choice.

## From beginner to enterprise

**Level 1–2 — first decisions.** Framing problems; listing options; asking about constraints; three-point estimates for your own tasks.

**Level 3 — explicit trade-offs.** Decision matrices; reversible versus irreversible decisions; estimates as ranges with confidence; spikes for unknowns.

**Level 4 — team decisions.** Design documents and RFCs; ADRs; deliberate technical debt; disagree and commit; clean escalation.

**Level 5 — senior practice.** Choosing which decisions to make centrally and which to delegate; teaching teams to decide; communicating uncertainty to business stakeholders.

**Level 6 — organisations.** Decision frameworks across many teams, architecture review processes that enable rather than block, and learning from past decisions at scale.

## Real-world use cases

### The two-week debate

- **Story**: a team spent two weeks arguing about which state management library to use in a new front-end module — a two-way door affecting one team. The tech lead time-boxed the decision to one day, chose the option most of the team knew, and recorded a revisit condition. The module shipped, and the library never needed changing.

### The optimistic date

- **Story**: an engineer estimated "about three weeks" for a payment provider integration. It took eight. In the review, the team found the estimate had been the sum of best-case tasks and had ignored certification testing with the provider. Since then the team gives three-point estimates and lists external dependencies explicitly.

## Common mistakes

### Beginner: one option only

**Fix:** always compare at least two, including the simplest.

### Beginner: single-number estimates treated as promises

**Fix:** ranges with confidence, updated as you learn.

### Intermediate: treating every decision as irreversible

**Consequence:** slow teams. **Fix:** decide two-way doors quickly.

### Intermediate: treating irreversible decisions casually

**Consequence:** years of cost. **Fix:** design documents, reviews, prototypes.

### Intermediate: undocumented decisions

**Consequence:** repeated debates and confused newcomers. **Fix:** ADRs with revisit conditions.

### Production: over-engineering for imagined scale

**Fix:** YAGNI with a recorded path to scale.

### Production: hidden technical debt

**Fix:** record debt, its interest and its repayment plan.

## Debugging and troubleshooting

When decisions go wrong:

- **Was the problem framed correctly?** Many failures solve the wrong problem well.
- **Which assumption was wrong?** Record it so future estimates and decisions improve.
- **Was it a bad decision or a bad outcome?** A good decision can have an unlucky outcome; judge by what was knowable.
- **Is it reversible now?** Find the cheapest path back or forward.
- **Is the team stuck debating?** Identify the decider, time-box and write down the options.

## Security summary

- **Security and privacy are criteria in every significant decision**, not afterthoughts ({{ch:application-security}}).
- **Some shortcuts are never "good enough"**: secrets in code, missing authorisation, unencrypted personal data.
- **Vendor decisions** include security review: data location, access, certifications, breach history.
- **Record security trade-offs** and accepted risks with an owner and a review date.

## How a senior engineer thinks about this

- **Clarify the problem before choosing the solution.**
- **Speed for two-way doors, care for one-way doors.**
- **Make trade-offs and uncertainty visible**, with criteria, weights and ranges.
- **Good enough now, with a path to better.** Record when to revisit.
- **Decide, commit, record, review.** Teams move forward together.

## Exercises

### Exercise 1 — One-way or two-way?

**Objective:** practise classifying decisions.
**What to do:** classify and say how much process each deserves: (a) choosing a date-formatting library; (b) the JSON format of a public partner API; (c) moving the main database from PostgreSQL to a document store; (d) the colour of a button; (e) choosing a cloud provider for a new company.

<details>
<summary>Show the solution</summary>

- (a) **Two-way**: decide quickly, wrap it if widely used.
- (b) **One-way-ish**: partners will depend on it; design carefully, review, version from the start ({{ch:api-versioning}}).
- (c) **One-way**: years of data and code; design document, prototypes, migration plan.
- (d) **Two-way**: decide quickly; A/B test if it matters.
- (e) **One-way-ish**: expensive to move later; compare options carefully, but keep portability where cheap.

</details>

### Exercise 2 — Turn an estimate into a range

**Objective:** practise estimation.
**What to do:** a feature has three tasks: (best/likely/worst days) 2/3/5, 1/2/6, 3/5/12. A manager asks "when will it be done?". What do you answer?

<details>
<summary>Show the solution</summary>

The sum of likely values is 10 days, but worst cases are long (especially the third task), so a single "10 days" would probably be missed. A simple PERT estimate per task ((best + 4 × likely + worst) ÷ 6) gives about 3.2 + 2.5 + 5.8 ≈ 11.5 days on average, with more spread on the high side. Answer with a range and confidence: "Most likely 11–12 days; I'm about 85% confident in 14–15 days. The biggest uncertainty is the third task — I'll do a one-day spike on it first and update the estimate." Offer a scope option if the date matters.

</details>

### Exercise 3 — Production scenario: the stalled decision

**Objective:** practise team decision-making.
**The scenario:** two senior engineers disagree strongly about whether to split a service into two. The discussion has run for three weeks across many meetings, and the team's work is blocked. You are the tech lead. What do you do?

<details>
<summary>Show the solution</summary>

1. **Write down the decision**: the problem, the two options, the criteria each person values, and the evidence on each side — ask each engineer to write the strongest case for the **other** option.
2. **Classify the door**: is splitting reversible (start with a module boundary inside the service first)? Often a two-way first step exists.
3. **Agree the criteria and their weights** with both, perhaps in a decision matrix.
4. **Decide** (you or the system owner) by a set date; record it in an ADR with a revisit condition.
5. **Disagree and commit**: ask both to support the outcome; acknowledge the concerns of the person whose option was not chosen, and include them in the revisit plan.
6. **Unblock the team** immediately with work that does not depend on the decision.

</details>

## Summary

Good engineering decisions follow a process: **frame the problem**, list **constraints and criteria**, consider **several options** (including the simplest), compare **trade-offs** over the whole life of the choice, decide with the right people, **record** the reasons and a revisit condition, and review later. Spend effort in proportion to reversibility: decide **two-way doors** quickly and close to the work, slow down for **one-way doors**, and turn one-way doors into two-way ones with interfaces, flags and gradual rollouts.

**Decision matrices** make criteria and weights explicit, moving debate from preferences to priorities. **Estimates** are forecasts: use **three-point** estimates, ranges with confidence, small tasks, historical data and spikes — the sum of "likely" values is almost always too optimistic. **Design documents and RFCs** surface objections before code exists. Choose **good enough** with YAGNI, but never cut corners on security, data integrity or one-way doors; take **technical debt** deliberately and visibly. In teams, argue about evidence, decide who decides, time-box, **disagree and commit**, and escalate cleanly.

## Key terms

- **Trade-off** — Gaining one quality at the cost of another.
- **Constraint** — A fixed limit on possible solutions.
- **Two-way door** — A decision that is easy to reverse.
- **One-way door** — A decision that is expensive or impossible to reverse.
- **Decision matrix** — A table scoring options against weighted criteria.
- **Revisit condition** — A stated situation in which a decision should be reconsidered.
- **Estimate** — A forecast of effort or duration with uncertainty.
- **Three-point estimate** — An estimate with best, most likely and worst cases.
- **PERT estimate** — A weighted average of three-point estimates.
- **Confidence level** — The probability attached to an estimate range.
- **Spike** — A short, time-boxed investigation to reduce uncertainty.
- **Design document / RFC** — A written proposal reviewed before implementation.
- **YAGNI** — The principle of not building for speculative future needs.
- **Technical debt** — The future cost of shortcuts.
- **Disagree and commit** — Supporting a decision fully after voicing disagreement.
- **Escalation** — Asking a higher decision-maker to resolve a disagreement.

## What comes next

Making good decisions with others is the heart of leadership. The last chapter of this part, {{ch:technical-leadership}}, looks at technical leadership and career growth: what changes at senior, staff and lead levels, mentoring, influence without authority, managing your career, and choosing between the engineering and management paths.
