# Explaining Technical Work

> [!GOALS]
> - Adjust your explanations to three levels: a **teammate**, an **engineer outside your system**, and a **non-technical listener**.
> - Explain any concept with **what it is → why it exists → how it works → when it breaks**.
> - Use **analogies** well: one analogy, then back to the real mechanism.
> - Explain failures with **what happened → impact → cause → fix → prevention**, calmly and without blame.
> - Explain decisions with **what I chose → what I compared → the deciding factor → what I gave up**.
> - Use explaining as a test of your own understanding.

## Why this matters

Engineers spend a large part of their working lives explaining: to teammates in code reviews, to product managers about estimates, to support staff about an outage, to managers about a decision, to interviewers about everything. Engineers who explain well are trusted with bigger problems; those who cannot are often overlooked, however good their code.

Explaining is also a tool for learning. When you try to explain something out loud, every gap in your understanding shows itself as the place where you stall. If you cannot explain it simply, the problem is usually not your vocabulary — it is your understanding. This chapter gives you structures for explaining concepts, failures and decisions to different audiences; it builds on {{ch:speaking-about-your-work}}.

## The simple idea

Explaining is like being a tour guide who leads different groups through the same museum. For art students you use technical terms; for tourists you tell the story behind each painting; for children you point out what to look for. The museum does not change — the route and the words do.

> [!ANALOGY]
> Explaining technical work is like guiding different groups through the same museum: the facts stay the same, but the words, the route and the level of detail change with the audience.
>
> **Where the analogy breaks:** a museum guide can repeat the same tour every day. Your listeners interrupt, ask unexpected questions and have different goals — a manager wants to know "when", a support agent "what do I tell customers", an engineer "how". Listen for what they need, not only what they know.

## The proper definition and key words

**Technical explanation** is communicating how something technical works, why it exists, what went wrong or why a decision was made, at a level of detail suited to the listener.

Key words:

- **Audience** — the people you are explaining to, with their knowledge and goals.
- **Jargon** — specialist vocabulary; precise among experts, confusing to others.
- **Analogy** — a comparison with something familiar.
- **Level of abstraction** — how much detail you include.
- **Check for understanding** — asking a question that shows whether the listener followed.
- **Blameless** — explaining failures in terms of systems and causes, not individuals ({{ch:observability-and-incidents}}).

## Three levels

### Level 1 — Choose the level deliberately

The most common failure is explaining at **your** level regardless of who is listening.

| Listener | Example explanation of an N+1 query fix |
|---|---|
| **Teammate** | "The endpoint had an N+1 — one query for the groups, then one per group for members. I replaced it with one join and a composite index; it went from 380 ms to 45 ms." |
| **Engineer outside your system** | "We had a page listing expense groups. For each group it made a separate database query to load the members — so twenty groups meant twenty-one queries. I changed it to load all members in one query; the page got about eight times faster." |
| **Non-technical person** | "The page was asking the database twenty-one separate questions instead of one — like going to the shop twenty-one times for twenty-one items. Now it goes once, and the page loads almost instantly." |

Try the third version for your own project out loud. If you cannot, that is useful to discover.

### Level 2 — Ask what they need

Before or during an explanation, find out:

- **What do they already know?** "Have you worked with Redis before?"
- **What do they need to do with it?** A manager needs a decision or a date; support needs what to tell customers; an engineer needs the mechanism.
- **How much time do they have?** Offer the short version first: "The short answer is… Would you like the details?"

## Explaining concepts

### Level 2 — What it is → why it exists → how it works → when it breaks

Applied to a JSON Web Token ({{ch:jwt}}):

> **What**: "A JSON Web Token is a signed piece of data that proves who a user is."
>
> **Why**: "It exists so the server doesn't need to store a session for every logged-in user — the token carries the identity, and any server can check it without a database lookup."
>
> **How**: "It has three parts: a header, the data, and a signature made with a secret key. The server recalculates the signature to confirm the data hasn't been changed."
>
> **When it breaks**: "You can't easily cancel a token once issued — it stays valid until it expires. So if it's stolen, you can't just delete it like a session. That's why access tokens are short-lived and paired with refresh tokens you can revoke."

The fourth part is what makes an explanation sound senior: anyone can say what something is; describing when it fails shows you have used it and thought about it.

### Level 3 — Analogies: helpful and dangerous

A good analogy makes something unfamiliar familiar in one sentence; a bad one creates a wrong mental model that must be corrected later. Useful examples:

- **Index** — the index at the back of a book: without it you read every page; it also makes the book bigger and must be updated when the content changes ({{ch:indexes}}).
- **Cache** — keeping the things you use most on your desk instead of in the filing cabinet: fast, until the cabinet's copy changes and yours is out of date ({{ch:caching}}).
- **Transaction** — a bank transfer: money leaves one account and arrives in the other, or neither happens ({{ch:transactions}}).
- **Load balancer** — the person at the front of a queue sending people to whichever counter is free ({{ch:elb}}).

**The rule**: one analogy, then return to the real mechanism — and, if it matters, say where the analogy breaks (as this book does in every chapter). An explanation made entirely of analogies suggests you only understand the analogy.

### Level 3 — Visuals and checks

- **Draw** when you can: boxes and arrows for systems, a timeline for a sequence of events ({{ch:presenting-a-design}}).
- **Use a concrete example** with real numbers: "Imagine two people book the 10:00 slot at the same moment…"
- **Check understanding** with a question, not "Does that make sense?" (people say yes): "So what do you think happens if the cache server restarts?"

## Explaining failures and decisions

### Level 3 — What went wrong

> **What happened → impact → cause → fix → prevention**

> "The report endpoint returned errors for about forty minutes this morning **(what happened)**. Around thirty users saw an error page; no data was lost **(impact)**. A database migration added a required column without a default, and the old code still running on one server couldn't insert rows **(cause)**. We rolled back the migration and redeployed with a default value **(fix)**. We're adding a migration check to CI and will make schema changes in two steps from now on **(prevention)**" ({{ch:database-design}}).

Calm, complete, no blame, ending on what stops it happening again. Useful phrases:

- "Here's what happened and what we've done about it."
- "The impact was limited to…"
- "The root cause was…; a contributing factor was…"
- "To prevent this, we're going to…"
- When it was your mistake: "I made a mistake in the migration — here's what I've changed so it can't happen again." Owning it clearly builds trust.

### Level 3 — Why you chose something

> **What I chose → what I compared it against → the deciding factor → what I gave up**

> "I used PostgreSQL rather than MongoDB **(chose, compared)**. The data is very relational — groups, members, expenses and settlements all reference each other — and settlement needs transactions across several tables **(deciding factor)**. What I gave up is schema flexibility: changing the structure needs migrations, which is more work early on **(cost)**."

Naming what you gave up is the key: a decision with no cost was not really a decision ({{ch:engineering-decisions}}). If you did not compare alternatives, say so honestly: "I chose it mainly because I knew it; if I were choosing now, I'd compare it with…"

## Practising

### Level 4 — Explaining as a learning tool

- **Explain to an empty room**: after studying a topic, explain it aloud for two minutes. Where you stall is where your understanding is thin — go back to that part.
- **The non-technical test**: explain what you built to a friend or family member. If they can repeat it back roughly correctly, you understand it.
- **Write it, then say it**: for anything you expect to be asked, write the four-part explanation first; writing forces precision, and speaking then has a structure to follow ({{ch:written-english}}).
- **Teach others**: answering questions from newer engineers deepens your own understanding.

## From beginner to enterprise

**Level 1–2 — clear explanations.** Three levels chosen deliberately; asking what the listener needs; the four-part concept explanation.

**Level 3 — complete explanations.** Analogies used carefully; visuals and concrete examples; checking understanding; explaining failures and decisions with clear structures.

**Level 4 — learning by explaining.** Using explanation to find gaps; writing then speaking; teaching others.

**Level 5 — senior explanations.** Explaining trade-offs to executives, writing design documents and incident reviews, aligning teams around complex decisions ({{ch:technical-leadership}}).

**Level 6 — organisational communication.** Talks, technical strategy documents and explanations that shape decisions across many teams.

## Real-world use cases

### The estimate explanation

- **Story**: a product manager pushed for a feature in one week. Instead of saying "it's complicated", the engineer explained at the manager's level: "The feature itself is two days. The other three are making sure existing orders aren't affected — we'd need to migrate data, and if that goes wrong, customers see wrong totals." The manager agreed to the estimate and to releasing behind a feature flag.

### The incident update

- **Story**: during an outage, an engineer posted updates in the what-happened → impact → cause → fix → prevention format. Support staff could tell customers exactly what was affected, and leadership trusted the team's handling.

## Common mistakes

### Beginner: one level for everyone

**Fix:** choose the level for the listener.

### Beginner: definitions without "why" or "when it breaks"

**Fix:** use all four parts.

### Intermediate: only analogies

**Fix:** analogy, then mechanism.

### Intermediate: defensive failure explanations

**Fix:** calm structure, own mistakes, end on prevention.

### Intermediate: decisions without costs

**Fix:** always say what you gave up.

### Intermediate: "Does that make sense?"

**Fix:** ask a question that checks understanding.

## Debugging and troubleshooting

- **Listeners look lost**: you are too detailed or use jargon; step back to the outcome and an example.
- **Listeners are bored**: you are too basic for them; ask what they already know.
- **You stall mid-explanation**: your understanding has a gap there — study it ({{ch:questions-you-cannot-answer}}).
- **Long, unfocused explanations**: lead with the one-sentence answer, then expand only if asked.

## Security summary

- **Explain security issues responsibly**: describe the type of problem and its fix without publishing exploitable details of live systems.
- **Incident communication**: share facts appropriate for the audience; customer-facing messages follow your company's process ({{ch:application-security}}).

## How a senior engineer thinks about this

- **Explaining is understanding.** Where you cannot explain, you do not yet understand.
- **Meet the listener where they are.** Their knowledge and their goal decide the explanation.
- **Costs and failures show depth.** "When it breaks" and "what I gave up" are the senior parts.
- **Blameless and calm.** Failures explained well build trust.

## Exercises

### Exercise 1 — Three levels

**Objective:** practise adjusting level.
**What to do:** explain database replication to a teammate, an engineer from another team and a non-technical manager.

<details>
<summary>Show the solution</summary>

- **Teammate**: "We stream WAL from the primary to two async replicas; reads for reports go to replicas, so we have to handle a few seconds of lag" ({{ch:replication}}).
- **Other engineer**: "Every change on the main database is copied to two read-only copies. We send heavy report queries to the copies so the main database stays fast; the copies can be a few seconds behind."
- **Manager**: "We keep two live copies of the database. Reports run on the copies so customers aren't slowed down, and if the main database fails we have a copy ready. The only catch is that reports can be a few seconds out of date."

</details>

### Exercise 2 — Explain a concept fully

**Objective:** practise the four-part structure.
**What to do:** explain a database index with what, why, how and when it breaks.

<details>
<summary>Show the solution</summary>

- **What**: "An index is a separate data structure that lets the database find rows quickly by the values of certain columns."
- **Why**: "Without it, the database reads every row to find matches — fine for small tables, very slow for millions of rows."
- **How**: "PostgreSQL usually uses a B-tree, sorted by the indexed columns, so it can jump to the right place and read only matching rows."
- **When it breaks**: "Indexes slow down writes and use storage, and a query may not use one — for example if it wraps the column in a function or the index's column order doesn't match the query" ({{ch:indexes}}).

</details>

### Exercise 3 — Explain a failure

**Objective:** practise blameless explanation.
**The situation:** you deployed a change that sent duplicate confirmation emails to about 500 customers for an hour. Write the explanation for your manager.

<details>
<summary>Show the solution</summary>

"Between 14:00 and 15:00 about 500 customers received two confirmation emails for the same order. No orders or payments were affected. The cause was my change to the email worker: it retried messages after a timeout but didn't check whether the email had already been sent, so slow sends were repeated. I rolled it back at 15:00. I've added an idempotency check keyed on the order ID, a test that delivers the same message twice, and support has a short note for customers who ask" ({{ch:queues}}).

</details>

## Summary

Explaining well is a core engineering skill and a test of understanding. Choose the **level** for the listener — teammate, engineer outside your system, or non-technical — and ask what they already know and need. Explain concepts with **what it is → why it exists → how it works → when it breaks**; the last part shows depth. Use **one analogy, then the real mechanism**, say where the analogy breaks, draw and use concrete examples, and check understanding with real questions.

Explain failures with **what happened → impact → cause → fix → prevention**, calmly, without blame, owning your mistakes. Explain decisions with **what I chose → what I compared → the deciding factor → what I gave up**. Practise by explaining to an empty room, testing explanations on non-technical people, writing before speaking and teaching others.

## Key terms

- **Technical explanation** — Communicating technical ideas at a suitable level.
- **Audience** — The listeners and their knowledge and goals.
- **Jargon** — Specialist vocabulary.
- **Analogy** — A comparison with something familiar.
- **Level of abstraction** — The amount of detail included.
- **Check for understanding** — A question that shows whether the listener followed.
- **Root cause** — The underlying reason a failure happened.
- **Blameless explanation** — Describing failures in terms of systems and causes.
- **Trade-off** — What you gained and what you gave up in a decision.

## What comes next

Good explanations need precise words. The next chapter, {{ch:technical-english}}, builds the vocabulary of technical English: verbs for engineering work, words for systems and problems, common confusions, and how to describe numbers, changes and comparisons accurately.
