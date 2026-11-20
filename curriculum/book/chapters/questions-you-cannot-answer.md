# Answering Questions You Cannot Answer

> [!GOALS]
> - Understand why being asked something you don't know is normal — and why bluffing is so damaging.
> - Use a four-part structure: **state the limit → say what you know → reason towards it → say how you would find out**.
> - Match your response to the kind of gap: never used it, can't recall it, or never heard of it.
> - Earn partial credit, ask for context, and recover cleanly from mistakes.
> - Apply the same honesty at work: in meetings, reviews and incidents.

## Why this matters

You will be asked things you do not know. In an interview this is usually a sign that it is going well: a good interviewer keeps raising the difficulty until they find the edge of your knowledge. What they assess is not *whether* you reach a limit, but *what you do* when you get there.

The same happens at work: a manager asks when the fix will be ready, a client asks whether the data was exposed, a senior engineer asks why the query plan changed. "I don't know" costs you one question. A confident wrong answer can cost an interview, a client's trust or a bad decision made on false information. This chapter turns the moment people fear most into a routine one. It builds on {{ch:the-interview-conversation}} and {{ch:talking-about-code}}.

## The simple idea

Answering at the edge of your knowledge is like a guide on a mountain path who reaches a fork they have never taken. A bad guide pretends to know and leads the group the wrong way. A good guide says "I haven't taken this path. The map shows the river is east, the sun is behind us, so I think it's left — let me check with the hut ahead." The group trusts the second guide more, not less.

> [!ANALOGY]
> Answering what you don't know is like a guide at an unfamiliar fork: admit it, use what you can see, reason towards a choice and say how you'd confirm it.
>
> **Where the analogy breaks:** on a mountain the cost of a wrong turn is physical and immediate. In an interview, the interviewer usually already knows the answer — they are watching *how* you reason. The "right path" matters less than showing a sound method.

## The proper definition and key words

**Answering at the edge of your knowledge** means responding honestly and usefully to a question you cannot fully answer.

Key words:

- **Bluffing** — presenting a guess as knowledge.
- **Knowledge boundary** — where your real understanding stops.
- **Partial credit** — value given for correct reasoning even without the complete answer.
- **Self-correction** — noticing and fixing your own mistake.

## Why bluffing fails

### Level 1 — Three reasons

1. **They can tell.** Interviewers ask the same questions many times; they know what a real answer and a constructed one sound like. Vague phrasing, missing specifics and confident tone with no content are easy to spot.
2. **It damages everything else.** Once one answer is caught as invented, every earlier answer becomes doubtful.
3. **It predicts how you will behave at work.** Someone who bluffs in an interview bluffs in code reviews, status updates and incidents — where false confidence causes real damage ({{ch:observability-and-incidents}}). This is the real reason employers care.

## The structure that works

### Level 1 — Four parts

> **State the limit → say what you know → reason towards it → say how you would find out.**

Example — "How would you handle database sharding at this scale?":

> **Limit:** "I haven't worked with sharding in production — the largest database I've run had a few hundred thousand rows, so I've never needed it."
>
> **What you know:** "I understand it means splitting data across several database servers by a key, so no single server holds everything. The trade-off is that queries spanning shards get expensive, and moving data when you add shards is hard."
>
> **Reasoning:** "Here I'd want a key that keeps related data together — probably tenant or customer ID, so most queries hit one shard. The risk is a very large tenant creating a hot shard."
>
> **Finding out:** "If I were doing it for real, I'd read how other teams handled rebalancing, because that's the part I'd expect to get wrong." ({{ch:database-scaling}})

That answer beats a confident invented one — and for a junior or mid-level candidate, it can beat a memorised correct one, because it shows honesty, real partial understanding, sound reasoning and awareness of risk.

## Three kinds of not knowing

### Level 2 — Match the gap

| Gap | What to say |
|---|---|
| **Heard of it, never used it** | Say exactly that, then reason, as above. The most common case. |
| **Know it, but can't recall it now** | Be honest about the shape of the gap: "I know this — it's the isolation levels, and I can picture the table, but I'm blanking on which level prevents phantom reads. Let me reason it out…" ({{ch:transactions}}) |
| **Never heard of it** | Say so and ask: "I don't know that term — could you tell me what it refers to? I might know the idea under another name." Often you do. |

### Level 2 — Ask for the context

Turn a test into a conversation:

> "I haven't done that specifically. Can I ask what problem you're solving with it? I might be able to reason about it from a related angle."

This is not evasion. Interviewers generally prefer a candidate who engages with a problem over one who produces a memorised definition.

## Partial credit

### Level 3 — Say what you can see

Answers are rarely simply right or wrong, and many candidates lose credit by giving up too early.

> "What's the time complexity of this?"
>
> "I'm not certain, but there are nested loops over the same array, so it's at most quadratic. The inner loop sometimes exits early, so the average might be better — but the worst case is still O(n²)." ({{ch:big-o}})

**Always say what you can see**, even when you cannot reach the final answer. The visible reasoning is what is being assessed.

### Level 3 — Useful hedges, used accurately

| Situation | Phrase |
|---|---|
| Reasoning, not recalled | "I'm not certain, but here's what I can work out." |
| Likely but unverified | "I believe it's X — I'd confirm in the documentation before relying on it." |
| Buying time | "Let me think about that for a moment." |
| Clarifying | "Do you mean in a single database, or across services?" |

Hedging is accurate when you really are uncertain. Hedging *everything* — including what you know well — undersells you ({{ch:speaking-about-your-work}}).

## Recovering from mistakes

### Level 3 — Correct yourself

You will sometimes say something wrong and realise it halfway through:

> "Actually, that's not right — I said the index would help, but the column is wrapped in a function call, so the index can't be used. We'd need an expression index or to rewrite the condition." ({{ch:indexes}})

Self-correction is a strong signal: catching your own error looks better than never making one.

### Level 3 — Accept corrections cleanly

If the interviewer corrects you, accept it and engage:

> "Ah, you're right — so the index isn't used because of the function call. That explains something I saw in my own project, actually."

Do not argue, and do not over-apologise.

### Level 3 — Don't spiral

The worst part of a wrong answer is not the answer; it is the shaken confidence for the rest of the conversation. One wrong answer in a long interview costs very little. Ten minutes of rattled answers afterwards costs much more. Note it, let it go, and give the next question your full attention ({{ch:interview-under-pressure}}).

## When you don't know most of it

### Level 4 — Be honest early

Sometimes you are in the wrong interview — the role is more senior than your experience, or in an area you have not worked in. Say so early, rather than bluffing for forty minutes:

> "I want to be upfront — most of what you're asking about is Kubernetes at a level I haven't worked at. I've used Docker and Compose in production, and I understand the main Kubernetes concepts, but I haven't run a cluster. I'm happy to go deeper on what I have done, or reason through this if that's useful." ({{ch:eks}})

Sometimes the interviewer redirects to what you know and the interview improves. Sometimes it ends early, which saves everyone time. Either way, you leave with your credibility intact — and possibly a recommendation for a better-matched role.

## At work

### Level 4 — The same honesty, higher stakes

- **In meetings**: "I don't know yet — I'll find out and reply by this afternoon." Then do it.
- **In incidents**: say what is confirmed, what is suspected and what is unknown ({{ch:technical-english}}). "We've confirmed the API is returning errors; we suspect the database; we don't yet know whether data was affected."
- **With clients**: never guess about security, data or deadlines. "I want to give you an accurate answer — I'll confirm with the team and come back to you today."
- **In code review**: "I'm not sure this handles concurrent updates — could you explain how?" is better than approving what you don't understand.

## From beginner to enterprise

**Level 1 — no bluffing.** The four-part structure: limit, what you know, reasoning, how you'd find out.

**Level 2 — the kind of gap.** Never used, can't recall, never heard of it; asking for context.

**Level 3 — partial credit and recovery.** Saying what you can see, accurate hedging, self-correction, accepting corrections, not spiralling.

**Level 4 — honest early.** Admitting a mismatch; carrying the same honesty into meetings, incidents and client work.

**Level 5 — the senior engineer.** "I don't know" as a normal, unthreatening phrase that makes it safe for the whole team to admit gaps.

**Level 6 — the culture.** Teams where uncertainty is stated openly make better decisions and recover from incidents faster ({{ch:technical-leadership}}).

## Real-world use cases

### The confident wrong answer

- **Story**: a candidate confidently explained that MongoDB "doesn't support transactions". The interviewer, who knew multi-document transactions exist, gently corrected them; the candidate argued. The rest of the interview was spent doubting their other answers ({{ch:mongodb}}).

### The honest reasoning

- **Story**: asked about consistent hashing, which they had never used, a candidate said so, described what they knew about hashing and sharding, and reasoned that adding a server should not move most keys. The interviewer explained the rest and noted "excellent reasoning under uncertainty".

## Common mistakes

### Beginner: bluffing

**Fix:** state the limit, then reason.

### Beginner: "I don't know" and stopping

**Fix:** say what you know and how you'd find out.

### Intermediate: giving up when the full answer isn't visible

**Fix:** claim partial credit by saying what you can see.

### Intermediate: arguing with corrections

**Fix:** accept, engage and move on.

### Intermediate: spiralling after a mistake

**Fix:** reset for the next question.

## Debugging and troubleshooting

- **You panic when you don't know**: use the four-part structure — it gives you something to say immediately.
- **You blank on something you know**: describe the shape of the gap, then reason.
- **The interviewer keeps going deeper**: that is normal; they are finding your limit. Keep reasoning.
- **You realise an earlier answer was wrong**: go back to it — "I'd like to correct something I said earlier."

## Security summary

- **Never guess about security.** "Was data exposed?", "Is this endpoint protected?" — if you are not sure, say so and find out. A wrong "no" can cause serious harm ({{ch:application-security}}).
- **In incidents, follow the process** for what can be said to customers; don't speculate publicly.

## How a senior engineer thinks about this

- **"I don't know" is a professional answer**, followed by how you'll find out.
- **Reasoning is visible value.** Show it.
- **Correct yourself publicly.** It builds trust.
- **Certainty must be earned.** Say what is confirmed and what is a guess.

## Exercises

### Exercise 1 — The four parts

**Objective:** practise the structure.
**What to do:** answer "How does a CDN decide when to fetch a fresh copy of a file?" as someone who has never configured a CDN.

<details>
<summary>Show the solution</summary>

"I haven't configured a CDN myself (limit). I know a CDN caches copies of files at locations close to users, and I believe it respects cache headers like `Cache-Control` from the origin (what I know). So I'd expect it to serve the cached copy until its max-age expires, then fetch a fresh one — and there's probably a way to force a refresh, an invalidation (reasoning). I'd confirm in the CDN's documentation how invalidation works and how long it takes (how I'd find out)." ({{ch:cloudfront}})

</details>

### Exercise 2 — Recover

**Objective:** practise self-correction.
**What to do:** you said "a PUT request should never be idempotent". You realise it's wrong. What do you say?

<details>
<summary>Show the solution</summary>

"Actually, let me correct that — I had it backwards. PUT *should* be idempotent: sending the same PUT twice leaves the resource in the same state. It's POST that usually isn't." ({{ch:rest-apis}})

</details>

### Exercise 3 — At work

**Objective:** practise honest status.
**What to do:** your manager asks in a meeting, "Will the payment fix be ready for tomorrow's release?" You don't know yet — tests are still running and one edge case is unresolved.

<details>
<summary>Show the solution</summary>

"I don't know yet. The main fix is done, but one edge case — partial refunds — is still failing, and the full test suite is running. I'll know within two hours and will message you then. If it's not ready, we can release without it and ship it separately."

</details>

## Summary

Being asked something you don't know is normal, and often means an interview is going well. **Never bluff**: interviewers can tell, it casts doubt on every other answer, and it predicts how you would behave at work. Use the four-part structure: **state the limit → say what you know → reason towards it → say how you would find out**.

Match your response to the kind of gap — never used it, can't recall it, or never heard of it — and ask what problem the interviewer is solving when that helps. Claim **partial credit** by saying what you can see; hedge only when you are truly uncertain. **Correct yourself** openly, **accept corrections** cleanly, and **don't spiral** after a mistake. If most of an interview is beyond your experience, say so early. At work, apply the same honesty in meetings, incidents, client communication and code review — and never guess about security or data.

## Key terms

- **Bluffing** — Presenting a guess as knowledge.
- **Knowledge boundary** — Where your real understanding stops.
- **Four-part structure** — Limit, what you know, reasoning, how you'd find out.
- **Partial credit** — Value for visible correct reasoning without a complete answer.
- **Self-correction** — Fixing your own mistake openly.
- **Spiralling** — Losing confidence for the rest of a conversation after one error.

## What comes next

Knowing what to say is one thing; saying it while nervous is another. The next chapter, {{ch:interview-under-pressure}}, covers speaking under pressure: why nerves affect language, how to prepare and practise so your English holds up, and what to do in the moment when your mind goes blank.
