# Reference: Professional Communication Phrases

> [!GOALS]
> - Have ready-to-use phrases for stand-ups, design meetings, planning, presentations and incidents.
> - Use templates for status reports and for communicating delays and risks.
> - Ask good questions, listen actively, agree, disagree and escalate professionally.
> - Reduce filler words and replace dated or confusing phrasing.
> - Use this chapter as a quick reference to keep open while you work.

## Why this matters

Most of the communication skills in this part come down to having the right sentence ready at the right moment. Under pressure — in a meeting with senior people, on an incident call, presenting to a client — you will not build elegant sentences from nothing. You will reach for what you have used before.

This chapter collects those sentences in one place, grouped by situation. It is a reference rather than a lesson: skim it once, then come back when you need a phrase. The ideas behind the phrases are covered in {{ch:speaking-about-your-work}}, {{ch:explaining-technical-work}}, {{ch:written-english}} and {{ch:presenting-a-design}}.

## The simple idea

A phrase bank is like a first-aid kit. You hope not to need it, you don't read it for entertainment, but when something happens you want the right item in a known place, ready to use.

> [!ANALOGY]
> A phrase reference is like a first-aid kit: the right item, in a known place, when you need it quickly.
>
> **Where the analogy breaks:** first-aid items are used exactly as packaged. Phrases are starting points — adapt them to your own voice and situation, or they sound memorised.

## The proper definition and key words

**Professional communication** is clear, respectful, purposeful communication at work, spoken or written.

Key words:

- **Stand-up** — a short regular team meeting to share progress and blockers.
- **Stakeholder** — anyone affected by or interested in your work: managers, product owners, clients.
- **Escalation** — raising a problem to someone with more authority or resources.
- **Action item** — a task agreed in a meeting, with an owner and a deadline.
- **Active listening** — listening to understand, and showing that you have.

## Meetings

### Level 1 — Stand-ups

A stand-up synchronises the team and surfaces blockers. It is not a detailed report to a manager.

| Part | Phrase |
|---|---|
| Done | "Since the last stand-up I finished the login endpoint and its tests — the PR is open for review." |
| Next | "Today I'm starting the password reset flow, ticket 412." |
| Blocked | "One blocker: I need write access to the staging database. Ahsan, could we sort that out after the stand-up?" |
| No blockers | "No blockers — on track to finish by Thursday." |
| Taking it offline | "That's a longer discussion — shall we pick it up after the stand-up?" |

Vague: "I was doing some back-end stuff, will continue with that, might have database issues."
Specific: "I finished the authentication endpoint; today I'm on password reset; I'm blocked on staging access."

### Level 1 — Joining and taking part

| Situation | Phrase |
|---|---|
| Joining a call | "Hi everyone — [name] here, from the payments team." |
| Wanting to speak | "Could I add something here?" / "Sorry to jump in — a quick point on that." |
| Being interrupted | "Could I just finish this point? Then I'd love to hear your view." |
| Didn't hear | "Sorry, you cut out for a moment — could you repeat the last part?" |
| Asking for a summary | "Could we quickly recap what we've decided?" |
| Off-topic | "That's a good point, but maybe for a separate discussion — shall I add it to the notes?" |

### Level 2 — Running a design meeting

| Moment | Phrase |
|---|---|
| Opening | "Thanks for joining. We're reviewing the design for order notifications. We have 45 minutes: 15 for the walkthrough, 20 for questions and concerns, and 10 to agree next steps." |
| Inviting input | "We haven't heard from the mobile team yet — any concerns from your side?" |
| Keeping time | "We have ten minutes left; let's move on to next steps." |
| Closing | "Let me summarise. Decision one: we'll use a queue for notifications, because it isolates the API from email delays. Action: Sara will check the provider's rate limits by Friday. Open question: SMS support — to discuss with product. Anything to correct before I send the notes?" |

### Level 2 — Asking good questions in reviews

| Purpose | Phrase |
|---|---|
| Understanding | "Could you walk me through what happens when the payment provider times out?" |
| Edge cases | "How does this handle two users editing the same record?" |
| Alternatives | "Is there a reason we chose A over B? I'm thinking about the migration cost." |
| Failure | "What are the failure modes? What happens if the cache is unavailable?" |
| Open, not leading | "What did you consider for the storage layer?" — rather than "Wouldn't Redis be better?" |

### Level 2 — Planning and estimation

| Situation | Phrase |
|---|---|
| Giving an estimate | "I'd estimate about three days — the third-party integration adds uncertainty." |
| Unclear requirements | "The acceptance criteria aren't clear enough to estimate. Can we refine this first?" |
| Too big | "This feels too large for one iteration — could we split web and mobile?" |
| Over-commitment | "We've planned noticeably more than we usually complete. I'd suggest moving the reporting story out, or agreeing with the product owner what's truly critical." |

## Presentations

### Level 2 — Structure and signposts

A short technical presentation often follows: **context → current state → proposal → trade-offs and risks → questions and next steps**.

| Moment | Phrase |
|---|---|
| Strong opening | "I want to talk about a problem that's slowing checkout for every customer." |
| Purpose | "The goal today is to agree on the caching approach so we can start building it." |
| Context | "To give you some context first…" |
| Moving on | "Now let's look at the proposed solution." |
| Checking | "Before I move on — any questions about this part?" |
| Summarising | "To summarise what we've covered so far…" |
| Risks | "Finally, the risks we've identified…" |
| Closing | "So the decision we need today is…" |

**Avoid** opening with "So, um, today I'm going to talk about…" or "Sorry, I put this together quickly" — never apologise before you have said anything.

### Level 3 — Handling questions

| Situation | Phrase |
|---|---|
| Good question, need a moment | "Good question — let me think for a second." |
| Don't have the data | "I don't have that number with me — I'll follow up after the session." |
| Not sure | "I'm honestly not sure. Bilal, do you know?" ({{ch:questions-you-cannot-answer}}) |
| Out of scope | "That's outside today's scope, but worth exploring — shall I add it to the action items?" |
| Hostile question | "I understand the concern. Here's how we've thought about it…" |
| Clarifying | "Do you mean the cost of running it, or of building it?" |

### Level 3 — Filler words

Common fillers: "um", "uh", "like", "you know", "basically", "actually", "kind of", "sort of".

- **Replace fillers with a pause.** Silence sounds thoughtful, not awkward.
- **Slow down.** Slower speakers sound more confident and are easier to follow, especially for international listeners.
- **Breathe before answering** instead of starting with "umm…".
- **Record yourself** explaining a project for two minutes, count the fillers, and try again ({{ch:speaking-about-your-work}}).

## Stakeholder communication

### Level 3 — Status reports

A regular written status report should answer: what is done, what is in progress, what is blocked, what is next, and whether you are on track.

```text
Subject: Orders team update

Completed
- User authentication (login, logout, token refresh)
- Orders table migration — deployed to staging
- Order list performance fix (1.8 s -> 140 ms at p95)

In progress
- Password reset — email sending done, screens in progress

Blocked
- Payment integration: waiting for payment provider API keys from Finance
  (requested on Monday). Could you help escalate?

Next
- Finish password reset and its tests
- Start payment integration once keys arrive

Status: on track for the release on 5 July.
Risk: if the keys don't arrive by Wednesday, payments move to the next release.
```

Name the blocker, the person who can remove it and the impact ({{ch:written-english}}).

### Level 3 — Communicating delays and risks

Raise delays **early**, with options. A formula: **what → why → impact → options → recommendation → decision needed by when**.

> "I need to flag a risk to the payments release. The webhook handling for failed payments is more complex than we estimated — there are eight edge cases we didn't plan for. My revised estimate is three more days.
>
> Options:
> A) Move the release back three days.
> B) Release without failed-payment handling and add it next release — customers would see a generic error in those cases.
> C) Bring in Sara to pair on the webhooks, which should save about two days.
>
> I recommend C — Sara built similar handling before. Could we decide by tomorrow so we can update the client?"

### Level 4 — Escalating

| Situation | Phrase |
|---|---|
| Gentle reminder | "Following up on the API keys — is there anything you need from me?" |
| Escalating politely | "This is now blocking the release. Could you help me find the right person to unblock it?" |
| Escalating to your manager | "I've asked Finance twice without a reply, and it now puts the release at risk. Could you help escalate?" |
| Agreeing a deadline | "If we don't have it by Wednesday, we'll move payments to the next release. Does that work for you?" |

Escalation is not complaining; it is making sure the right person knows in time ({{ch:first-ninety-days}}).

## Listening, agreeing and disagreeing

### Level 4 — Active listening

| Technique | Phrase |
|---|---|
| Paraphrase | "So if I understand correctly, you're suggesting we move caching to the gateway instead of each service — is that right?" |
| Acknowledge | "That makes sense." / "Good point — I hadn't considered that." |
| Ask for more | "Could you say more about the cost side?" |
| Confirm at the end | "Just to confirm: we decided X and Y, and I'm responsible for Z by Friday. Is that right?" |

### Level 4 — Agreeing and disagreeing

| Strength | Phrase |
|---|---|
| Strong agreement | "I completely agree." / "That's exactly the issue." |
| Partial agreement | "I agree with the approach, but I'm not sure about the timeline." |
| Polite disagreement | "I see why you'd do it that way — the simplicity is appealing. My concern is the migration cost. How are you thinking about that?" |
| Proposing instead | "What if we tried X first and measured?" |
| Disagree and commit | "I'd still lean towards B, but I'm happy to go with A. Let's record the reasoning and revisit if latency becomes a problem." ({{ch:engineering-decisions}}) |

## Incidents

### Level 4 — Incident communication

Say what is **confirmed**, **suspected** and **unknown**, and when the next update will come ({{ch:observability-and-incidents}}):

| Moment | Phrase |
|---|---|
| Declaring | "I'm declaring an incident: checkout errors are above 20% since 14:05. I'll coordinate; Ahmed, could you take the database?" |
| Update | "Update at 14:20: confirmed — the payment service is timing out. Suspected cause: the deployment at 14:00. We're rolling back now. Next update at 14:35." |
| Resolved | "Resolved at 14:40: errors back to normal after the rollback. We'll write an incident review and share it." |
| To customers (through the agreed channel) | "Some customers could not complete payments between 14:05 and 14:40. The issue is fixed. No payment was charged twice." — only what has been confirmed. |

## Words to replace

### Level 4 — International, modern English

| Instead of | Use |
|---|---|
| "Kindly do the needful." | "Could you please [specific action]?" |
| "Revert back to me." | "Let me know." / "Get back to me." |
| "I have a doubt." | "I have a question." |
| "Please find attached herewith." | "I've attached…" |
| "ASAP" | A specific time: "by 15:00 today". |
| "Prepone" | "Move earlier." |
| "Any update?" | "Is X still on track for today?" |

See {{ch:technical-english}} for more.

## From beginner to enterprise

**Level 1 — everyday meetings.** Stand-up and participation phrases.

**Level 2 — structured meetings and talks.** Running design meetings, asking review questions, estimating, presenting.

**Level 3 — stakeholders.** Handling questions, cutting fillers, status reports, delays and risks.

**Level 4 — difficult moments.** Escalation, listening, disagreement, incidents and modern phrasing.

**Level 5 — leading communication.** Facilitating meetings and writing for executives and clients ({{ch:technical-leadership}}).

**Level 6 — shaping norms.** Templates and habits that make a whole organisation communicate clearly.

## Real-world use cases

### The early delay

- **Story**: an engineer flagged a delay with three options as soon as they found the extra complexity. The manager chose to bring in help, the release went out on time, and the client never knew there had been a risk.

### The clean incident update

- **Story**: during an outage, regular updates in the confirmed / suspected / unknown format meant the support team could answer customers accurately, and nobody needed to interrupt the engineers for news.

## Common mistakes

### Beginner: vague stand-up updates

**Fix:** specific done / next / blocked.

### Beginner: starting presentations with apologies or fillers

**Fix:** a strong opening sentence and pauses instead of "um".

### Intermediate: hiding delays until the last moment

**Fix:** what → why → impact → options → recommendation.

### Intermediate: leading questions in reviews

**Fix:** open questions.

### Intermediate: guessing in incident updates

**Fix:** confirmed, suspected, unknown, next update time.

## Debugging and troubleshooting

- **Meetings end without decisions**: close with a summary of decisions, actions and owners.
- **Blockers stay unresolved**: name the person, the impact and a deadline; escalate politely.
- **People talk over you**: "Could I finish this point?" — calmly.
- **You lose your place in a presentation**: signpost — "Let me summarise where we are."

## Security summary

- **Never share secrets or customer data** in meetings, chat, slides or status emails; redact screenshots and logs ({{ch:secrets-manager}}).
- **Incident communication outside the team** goes through the agreed channel and only states confirmed facts.
- **Verify unusual requests** — urgent payment or credential requests — through a separate channel ({{ch:application-security}}).

## How a senior engineer thinks about this

- **Clarity is kindness.** Specific updates save everyone time.
- **Bad news early.** With options and a recommendation.
- **Listen first.** Paraphrase before you disagree.
- **Every meeting ends with decisions and owners.**

## Exercises

### Exercise 1 — Fix the stand-up

**Objective:** practise specific updates.
**What to do:** rewrite: "I was working on the API stuff, will continue today, maybe some issues with the tests."

<details>
<summary>Show the solution</summary>

"Since the last stand-up I added validation to `POST /orders`. Today I'm fixing two failing integration tests — they time out against the test database. If I can't fix them by midday, I'll ask Sara, since she set up the test environment."

</details>

### Exercise 2 — Flag a delay

**Objective:** practise the delay formula.
**What to do:** the search feature will be two days late because the search library doesn't support Urdu text well. Write the message.

<details>
<summary>Show the solution</summary>

"I need to flag a delay on search. The library we chose doesn't tokenise Urdu text correctly, so Urdu product names aren't found. I estimate two extra days. Options: (A) delay search by two days and switch to a library with better Unicode support; (B) release English-only search on time and add Urdu after. I recommend A, since a large share of our product names are in Urdu. Could we decide today?"

</details>

### Exercise 3 — Close a meeting

**Objective:** practise summarising.
**What to do:** write the closing summary for a meeting that decided to adopt feature flags, assigned Ali to evaluate two tools by Friday, and left the question of cost open.

<details>
<summary>Show the solution</summary>

"Let me summarise. Decision: we'll use feature flags so we can separate deploying from releasing. Action: Ali will compare the two tools and share a recommendation by Friday. Open question: cost — we'll decide once we have Ali's comparison. Anything I've missed? I'll send the notes shortly."

</details>

## Summary

This chapter is a phrase bank for professional situations. For **stand-ups**, be specific about done, next and blocked. In **meetings**, join, interrupt and recap politely; when running a design meeting, set the goal and timings, invite input and close with decisions, actions, owners and open questions. In **reviews**, ask open questions about behaviour, edge cases, alternatives and failure modes. In **planning**, give estimates with reasons and flag over-commitment.

In **presentations**, open strongly, signpost each section, handle questions honestly and replace fillers with pauses. For **stakeholders**, write status reports with done, in progress, blocked, next and on-track; raise **delays early** with what, why, impact, options, a recommendation and a decision deadline; and **escalate** politely with impact and deadlines. **Listen actively** by paraphrasing and confirming, disagree by acknowledging first, and in **incidents** state what is confirmed, suspected and unknown with the time of the next update. Replace dated phrases with modern international English, and never share secrets in any channel.

## Key terms

- **Stand-up** — A short team meeting about progress and blockers.
- **Stakeholder** — Anyone affected by or interested in your work.
- **Action item** — An agreed task with an owner and deadline.
- **Signposting** — Telling listeners where you are in a talk.
- **Escalation** — Raising a problem to someone who can resolve it.
- **Active listening** — Listening to understand and showing it.
- **Filler word** — A word like "um" or "basically" used while thinking.
- **Disagree and commit** — Supporting a decision after voicing disagreement.

## What comes next

The final chapter, {{ch:interview-english-reference}}, is the companion reference for the hiring process: phrases for every stage of a job interview, from the first recruiter call to accepting an offer.
