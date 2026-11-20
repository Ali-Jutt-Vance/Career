# Building AI Products

> [!GOALS]
> - Choose problems where AI genuinely helps, and define success in user and business terms.
> - Build **evaluations** that decide releases: datasets, metrics, slices and regression gates.
> - Add **guardrails**: input and output checks, confidence routing, human review and fallbacks.
> - Design the **user experience** of uncertain output: transparency, editing, feedback and graceful failure.
> - Operate AI features: monitoring quality, cost and latency; handling model changes; incident response.
> - Build responsibly: privacy, fairness, safety and honest communication with users.

## Why this matters

A demo of an AI feature takes an afternoon. A product that thousands of people rely on takes much more: it must be right often enough to be useful, fail safely when it is wrong, stay affordable at scale, keep working when models change, and earn users' trust. Many AI projects stall exactly here — impressive prototypes that never become dependable products, because nobody measured quality, planned for errors or controlled costs.

This chapter is about that gap. It ties together the previous chapters of this part — models ({{ch:llm-fundamentals}}), prompts ({{ch:prompt-engineering}}), retrieval ({{ch:rag}}), agents ({{ch:ai-agents}}) and integrations ({{ch:mcp}}) — with the product, reliability and engineering practices of the rest of the book.

## The simple idea

Building an AI product is like hiring a talented but sometimes unpredictable new colleague. Before giving them customers, you test them on real cases, decide which tasks they can do alone and which need checking, give them clear guidelines, watch their work, collect feedback, and keep a manager on call for the cases they cannot handle. You do not judge them by one brilliant interview answer.

> [!ANALOGY]
> Building an AI product is like bringing a talented but unpredictable colleague onto a team: test them on real cases, decide what they may do alone, check their risky work, and keep watching.
>
> **Where the analogy breaks:** a colleague improves steadily and tells you when they are unsure. A model can change behaviour overnight when its provider updates it or when you change a prompt, and its expressed confidence is not always reliable — so measurement, not trust, has to tell you how it is doing.

## The proper definition and key words

An **AI product** (or AI feature) is a user-facing capability in which a machine-learning model, here usually a large language model, performs part of the work, embedded in a system that measures, constrains and supports it so that it is useful, safe and economical.

Key words:

- **Evaluation (eval)** — measuring a system's quality on a defined dataset with defined metrics.
- **Golden dataset** — a curated set of inputs with expected outputs or grading criteria.
- **Slice** — a subset of the evaluation (a language, a customer type, a hard case) measured separately.
- **Regression gate** — an automatic check that blocks releases that make quality worse.
- **Online evaluation** — measuring quality in production: feedback, A/B tests, sampled reviews.
- **Guardrail** — a check or constraint around model input or output.
- **Human in the loop** — people reviewing, approving or correcting outputs.
- **Confidence routing** — sending uncertain cases to humans or slower paths.
- **Fallback** — what happens when the model fails, refuses or is unavailable.
- **Model drift / provider change** — behaviour changes from model updates or changed inputs.
- **Unit economics** — cost per useful outcome (per resolved ticket, per document processed).

## Choosing what to build

### Level 1 — Good problems for AI

Good candidates have:

- **High volume or high effort** for people today (triaging tickets, summarising calls, drafting replies, extracting data).
- **Tolerance for imperfection**, or a cheap way to catch errors (a human reviews drafts; outputs are validated against rules).
- **Available context**: the information needed is in documents or systems the model can access.
- **Measurable outcomes**: time saved, resolution rate, conversion, accuracy against labels.

Poor candidates: decisions with severe consequences and no review (medical, legal or financial decisions without a qualified person), tasks needing exact calculation without tools, and features that exist only because "we need AI".

### Level 1 — Define success first

Write down before building:

- **User outcome**: "support agents resolve routine tickets 40% faster".
- **Quality bar**: "suggested replies need no or minor edits in 80% of cases; no factual errors about policy".
- **Safety bar**: "never promises refunds outside policy; never reveals other customers' data".
- **Cost and latency budget**: "under $0.05 per ticket; first suggestion within 3 seconds".

These become the evaluation's metrics and the launch criteria.

## Evaluation

### Level 2 — Evaluations decide releases

Every change — a prompt edit, a new model, a different retrieval setting — can improve some cases and break others. An evaluation set with **slices** shows both. This example compares a candidate with the current baseline, then shows how a confidence threshold trades automation for accuracy, and finally computes cost per resolved case:

```ts
// 1. A release gate: compare a candidate (new prompt or model) with the baseline on every slice of the eval set
type Result = { slice: string; baseline: boolean; candidate: boolean };
const results: Result[] = [];
const add = (slice: string, n: number, baseOk: number, candOk: number) => {
  for (let i = 0; i < n; i++) results.push({ slice, baseline: i < baseOk, candidate: i < candOk });
};
add("delivery questions", 120, 108, 114);
add("refund questions", 80, 66, 74);
add("non-English emails", 40, 34, 29);          // the candidate is better overall, but worse here
add("injection attempts", 20, 20, 20);
const pct = (ok: number, n: number) => (100 * ok) / n;
let blocked = false;
for (const slice of [...new Set(results.map((r) => r.slice))]) {
  const rs = results.filter((r) => r.slice === slice);
  const b = pct(rs.filter((r) => r.baseline).length, rs.length), c = pct(rs.filter((r) => r.candidate).length, rs.length);
  const regression = c < b - 2;                   // tolerate small noise, block real drops
  if (regression) blocked = true;
  console.log(`${slice.padEnd(20)} baseline ${b.toFixed(1).padStart(5)}%  candidate ${c.toFixed(1).padStart(5)}%  ${regression ? "REGRESSION" : ""}`.trimEnd());
}
const total = (k: "baseline" | "candidate") => pct(results.filter((r) => r[k]).length, results.length).toFixed(1);
console.log(`overall: baseline ${total("baseline")}%, candidate ${total("candidate")}% -> ${blocked ? "release BLOCKED" : "release allowed"}`);

// 2. Choosing how much to automate: route by the model's confidence score, measured on labelled data
const scored = Array.from({ length: 1000 }, (_, i) => {
  const confidence = ((i * 7919) % 1000) / 1000;                   // spread evenly over 0..1
  const correct = (i * 104729) % 100 < 55 + confidence * 44;       // higher confidence -> more often right
  return { confidence, correct };
});
console.log("threshold  automated  accuracy of automated  sent to humans");
for (const t of [0.0, 0.5, 0.7, 0.9]) {
  const auto = scored.filter((s) => s.confidence >= t);
  const acc = pct(auto.filter((s) => s.correct).length, auto.length);
  console.log(`${t.toFixed(1).padStart(9)}  ${String(auto.length).padStart(9)}  ${acc.toFixed(1).padStart(20)}%  ${String(1000 - auto.length).padStart(14)}`);
}

// 3. Cost per resolved case, not per request
const costPerCall = 0.012, callsPerCase = 3.2, resolvedRate = 0.78, humanCostPerCase = 4.5;
const aiCostPerResolved = (costPerCall * callsPerCase) / resolvedRate;
console.log(`AI cost per resolved case $${aiCostPerResolved.toFixed(3)}; unresolved cases still cost a human $${humanCostPerCase.toFixed(2)}`);
console.log(`blended cost per case $${(costPerCall * callsPerCase + (1 - resolvedRate) * humanCostPerCase).toFixed(2)} vs $${humanCostPerCase.toFixed(2)} fully human`);
```

**Output:**

```text
delivery questions   baseline  90.0%  candidate  95.0%
refund questions     baseline  82.5%  candidate  92.5%
non-English emails   baseline  85.0%  candidate  72.5%  REGRESSION
injection attempts   baseline 100.0%  candidate 100.0%
overall: baseline 87.7%, candidate 91.2% -> release BLOCKED
threshold  automated  accuracy of automated  sent to humans
      0.0       1000                  77.4%               0
      0.5        500                  88.8%             500
      0.7        300                  93.3%             700
      0.9        100                  99.0%             900
AI cost per resolved case $0.049; unresolved cases still cost a human $4.50
blended cost per case $1.03 vs $4.50 fully human
```

- **Overall improved** (87.7% → 91.2%), yet the gate **blocked** the release: non-English emails dropped from 85% to 72.5%. An average hides regressions for specific users — measure **slices** that matter (languages, customer types, hard cases, safety cases) and block on any meaningful drop.
- **Confidence routing**: automating everything gives 77% accuracy; automating only cases above 0.7 confidence gives 93% accuracy on 30% of cases, sending the rest to humans. The right threshold depends on the cost of an error versus the cost of a human review — choose it from labelled data, not intuition, and check that confidence scores really predict correctness on your data.
- **Unit economics**: the model's cost per **resolved** case is a few cents, but unresolved cases still need a person. The blended cost ($1.03 versus $4.50) is the number that matters for the business — measure per completed outcome, not per API call.

### Level 3 — Building good evaluation sets

- **Start from real data**: past tickets, documents, questions — anonymised and representative. Add synthetic cases only to fill gaps.
- **Cover the edges**: rare but important cases, ambiguous inputs, adversarial and injection attempts, empty or malformed inputs, other languages.
- **Grade appropriately**: exact match for classifications and extractions; rubrics graded by people or by a model grader (calibrated against human judgements) for open-ended text; task completion for agents ({{ch:ai-agents}}).
- **Grow it continuously**: every production failure and user complaint becomes a test case.
- **Keep a held-out set** that is not used while tuning, to detect overfitting the prompt to the evaluation.
- **Automate it in CI**, so every change runs the evaluation like a test suite ({{ch:cicd}}).

## Guardrails and experience

### Level 3 — Guardrails

- **Input checks**: size limits, language detection, personal data detection and masking, abuse and injection screening, rate limits ({{ch:rate-limiting}}).
- **Output checks**: schema validation, policy rules in code (refund amounts, allowed actions), groundedness and citation checks for RAG ({{ch:rag}}), toxicity and safety classifiers where relevant, escaping before display.
- **Routing**: low confidence, sensitive topics or failed checks go to a human or a safer path.
- **Fallbacks**: if the model times out, refuses or is down, the product still works — a manual flow, a cached answer, a simpler model, or a clear message ({{ch:distributed-systems}}).
- **Limits on actions**: AI proposes, code and people approve high-impact actions.

### Level 3 — User experience for uncertain output

- **Be honest that it is AI** and about what it can do; avoid presenting guesses as facts.
- **Show sources and reasoning** where useful (citations, "based on your last three orders").
- **Make editing easy**: drafts that people review and change beat outputs that must be accepted or rejected whole.
- **Design for wrong answers**: easy correction, undo, "report a problem", and a path to a human.
- **Stream responses** so users see progress; show clear states for "thinking", "searching", "done".
- **Collect feedback** in the flow (thumbs, edits, escalations) — edits are especially valuable signals of quality.

## Operating AI features

### Level 4 — Monitoring in production

- **Quality**: feedback rates, edit distance on drafts, escalation and override rates, sampled human reviews, automated checks failing.
- **Safety**: flagged outputs, injection attempts detected, policy violations.
- **Cost**: tokens and dollars per request and per outcome, by feature and customer; cache hit rates.
- **Latency**: time to first token and total time, per stage (retrieval, model, tools) ({{ch:monitoring}}).
- **Drift**: changes in input mix (new products, languages, seasons) that the evaluation set does not cover.

### Level 4 — Changing models and prompts safely

- **Pin model versions** and treat upgrades as releases: run the evaluation, compare slices, then roll out gradually (a percentage of traffic, or shadow mode comparing outputs) with monitoring and a quick way back ({{ch:cicd}}).
- **Version prompts and configurations** together with code.
- **A/B test** when offline evaluation cannot capture the real effect (user satisfaction, conversion).
- **Keep provider flexibility** where it is cheap: a thin internal interface around model calls makes it easier to switch or use several models ({{ch:software-architecture}}).

### Level 4 — Incidents and responsibility

- AI features need **incident response** like any other: a bad output pattern ("the assistant is promising free delivery") is an incident — mitigate fast with a feature flag or a prompt rollback, then investigate ({{ch:observability-and-incidents}}).
- **Privacy**: send only necessary data to models; know your provider's retention and training policies; honour deletion; avoid logging personal data in prompts and outputs.
- **Fairness**: check slices for quality differences between groups of users (languages, regions); fix the gaps.
- **Transparency and regulation**: AI regulations (such as the EU AI Act) and sector rules may require disclosure, risk assessment, human oversight and record keeping for some uses — involve legal and compliance early.
- **Safety**: decide what the product must refuse, test it, and handle model refusals gracefully.

## From beginner to enterprise

**Level 1–2 — first AI features.** Choosing suitable problems; defining success; a small evaluation set; validating outputs; honest UX with editing and feedback.

**Level 3 — dependable features.** Sliced evaluations in CI with regression gates; guardrails on inputs and outputs; confidence routing and human review; fallbacks; streaming and clear states.

**Level 4 — operated products.** Production monitoring of quality, safety, cost and latency; pinned models with gradual rollouts; A/B tests; incident response; privacy, fairness and compliance.

**Level 5 — senior practice.** Choosing where AI creates value; designing evaluation strategy and launch criteria; balancing automation against risk; unit economics.

**Level 6 — organisations.** AI platforms with shared evaluation tools, guardrails, model gateways, cost governance and responsible-AI review processes.

## Real-world use cases

### Support reply drafts

- **Product**: drafts for agents with cited policy sources; agents edit and send; edits and escalations feed the evaluation set; a release gate on 600 labelled tickets with slices per language and topic; confidence routing sends low-confidence tickets without a draft. Handling time fell by about a third, with no increase in complaints.

### The silent model change

- **What happened**: after switching to a newer model without running the evaluation, extraction of invoice dates started using a different format for some suppliers, breaking an accounting import.
- **Fix**: model versions pinned; upgrades go through the evaluation with a slice per supplier format; schema validation of dates before import; a shadow period comparing old and new outputs.

## Common mistakes

### Beginner: building before defining success

**Fix:** user outcome, quality, safety, cost and latency targets first.

### Beginner: judging by demos

**Fix:** evaluation sets from real data.

### Intermediate: looking only at the overall score

**Consequence:** regressions for some users. **Fix:** slices and per-slice gates.

### Intermediate: no fallback

**Consequence:** the feature breaks whenever the model does. **Fix:** fallbacks and graceful degradation.

### Intermediate: accept-or-reject UX

**Fix:** editable drafts, sources and easy correction.

### Production: unpinned models and unversioned prompts

**Fix:** versioning, evaluation and gradual rollout for every change.

### Production: measuring cost per call instead of per outcome

**Fix:** unit economics per resolved case or completed task.

## Debugging and troubleshooting

- **Users complain but evaluations pass**: the evaluation does not represent production — sample real traffic, add the failing cases, check slices.
- **Quality dropped suddenly**: a model, prompt, retrieval or input-mix change; compare recent outputs with the baseline and roll back.
- **Costs rising**: longer inputs, more retries or agent steps, cache misses; break down tokens per stage.
- **Latency rising**: retrieval, tool calls or model time per stage; stream, cache, right-size.
- **Humans override the AI often in one area**: a weak slice — focus evaluation and improvements there.

## Security summary

- **Prompt injection and data leakage** are product risks: separation of data and instructions, least privilege, output checks ({{ch:application-security}}).
- **Abuse**: rate limits, quotas and monitoring for expensive features.
- **Privacy by design**: minimal data to models, masking, retention controls, provider agreements.
- **Audit trails** for AI-assisted decisions with consequences.

## How a senior engineer thinks about this

- **Outcomes over outputs.** Measure what users and the business get, per completed task.
- **Evaluation is the backbone.** No change ships without it.
- **Design for being wrong.** Guardrails, review, fallbacks and honest UX.
- **Change is constant.** Models and inputs shift; version, monitor and roll out gradually.
- **Responsibility is part of quality.** Privacy, fairness and safety are requirements.

## Exercises

### Exercise 1 — Define success

**Objective:** practise product definition.
**What to do:** define success criteria for an AI feature that summarises long customer calls for account managers.

<details>
<summary>Show the solution</summary>

- **User outcome**: account managers spend under 2 minutes reviewing a call instead of 15 listening.
- **Quality**: summaries capture all agreed actions and customer concerns in 90% of evaluated calls (rubric graded by people on 100 calls); no invented commitments.
- **Safety and privacy**: no payment details or personal data beyond what account managers may see; transcripts not retained by the provider beyond policy.
- **Cost and latency**: under $0.10 per call; summary ready within 5 minutes of call end.
- **Feedback**: thumbs and an "edit summary" option; edits tracked.

</details>

### Exercise 2 — Choose the threshold

**Objective:** practise confidence routing.
**What to do:** using the chapter's routing table, a wrong automated answer costs $20 in refunds and goodwill, and a human review costs $3. Which threshold is cheapest per 1,000 cases?

<details>
<summary>Show the solution</summary>

Cost = errors among automated cases × $20 + human-reviewed cases × $3.
- 0.0: 1,000 × 22.6% ≈ 226 errors → $4,520; 0 reviews → **$4,520**.
- 0.5: 500 × 11.2% = 56 errors → $1,120; 500 × $3 = $1,500 → **$2,620**.
- 0.7: 300 × 6.7% ≈ 20 errors → $400; 700 × $3 = $2,100 → **$2,500**.
- 0.9: 100 × 1% = 1 error → $20; 900 × $3 = $2,700 → **$2,720**.

0.7 is cheapest here, and the answer changes if error or review costs change — which is why thresholds should be chosen from data and revisited.

</details>

### Exercise 3 — Production scenario: the model upgrade

**Objective:** practise safe change management.
**The scenario:** a newer model promises better quality at lower cost. Your AI feature handles 50,000 requests a day. How do you upgrade?

<details>
<summary>Show the solution</summary>

1. **Offline evaluation**: run the full evaluation set with slices on both models; review per-slice differences and sample outputs; adjust prompts for the new model if needed (newer models often need less forceful instructions).
2. **Check non-quality aspects**: latency, cost per outcome, refusal behaviour, output format stability.
3. **Shadow mode**: send a sample of production traffic to the new model without showing results; compare automatically and by sampled human review.
4. **Gradual rollout**: 5% → 25% → 100% behind a flag, monitoring quality signals (edits, escalations, feedback), cost and latency.
5. **Rollback plan**: flip back instantly if metrics degrade.
6. **Record** the decision and results; pin the new version.

</details>

## Summary

Building **AI products** means turning capable but imperfect models into features people can rely on. Choose problems with high value, available context, tolerance for errors or cheap checks, and measurable outcomes, and define success up front: user outcome, quality bar, safety bar, cost and latency budget.

**Evaluations** are the backbone: real-data **golden sets** with edge and adversarial cases, appropriate grading, held-out sets, CI automation and **slices** with **regression gates** — an overall improvement can hide a regression for one group of users. **Confidence routing** trades automation for accuracy, chosen from labelled data and the costs of errors and reviews; **unit economics** measure cost per completed outcome.

**Guardrails** check inputs and outputs, route risky cases to people, enforce policy in code and provide **fallbacks**. Good UX is honest, shows sources, makes editing and correction easy, streams progress and collects feedback. Operate AI features with monitoring of quality, safety, cost, latency and drift; pinned models and versioned prompts with evaluated, gradual rollouts and A/B tests; incident response; and responsible practices for privacy, fairness, safety and regulation.

## Key terms

- **AI product** — A user-facing capability in which a model performs part of the work within a supporting system.
- **Evaluation (eval)** — Measuring quality on a defined dataset with defined metrics.
- **Golden dataset** — A curated evaluation set with expected outputs or criteria.
- **Slice** — A subset of evaluation data measured separately.
- **Regression gate** — An automatic check that blocks releases that reduce quality.
- **Held-out set** — Evaluation data not used during tuning.
- **Online evaluation** — Measuring quality with real production traffic.
- **Guardrail** — A check or constraint around model inputs or outputs.
- **Confidence routing** — Sending low-confidence cases to humans or safer paths.
- **Fallback** — The behaviour used when the model fails or is unavailable.
- **Shadow mode** — Running a new model on real traffic without showing its outputs.
- **Model drift** — Changes in behaviour or inputs over time.
- **Unit economics** — Cost per useful outcome.
- **Responsible AI** — Practices for privacy, fairness, safety and transparency in AI systems.

## What comes next

Part XIV turns from building software to building a career. The next chapter, {{ch:how-hiring-works}}, explains how software engineering hiring works from the inside: who is involved, the stages of a hiring process, what each stage tests, and how decisions are made.
