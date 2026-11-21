# Technical English for Engineers

> [!GOALS]
> - Build precise vocabulary for back-end, cloud, performance, reliability and system design work.
> - Use strong, exact **verbs** for engineering actions.
> - Describe **numbers, changes, comparisons and uncertainty** accurately.
> - Avoid common confusions and word-for-word translations that confuse international colleagues.
> - Pronounce and spell common technical terms correctly, and expand abbreviations on first use.

## Why this matters

In engineering, words carry precise meanings. "Latency" and "throughput" are different measurements; "authentication" and "authorisation" are different checks; "the deploy failed" and "the build failed" send colleagues to different places. Vague or wrong words cost time: a teammate investigates the wrong problem, a manager misunderstands the risk, a client loses confidence.

Precision matters even more when you work with people from other countries. Expressions that are common in your local English may be unfamiliar or misunderstood elsewhere. This chapter collects the vocabulary and patterns that make technical English clear and professional. It supports {{ch:explaining-technical-work}} and {{ch:written-english}}, and the reference chapters {{ch:professional-communication-reference}} and {{ch:interview-english-reference}}.

## The simple idea

Technical vocabulary is like a toolbox. A carpenter does not say "the thing that makes holes" — they say "drill", and if precision matters, "a 6 mm masonry bit". The right word does the job in one go; the wrong word or a vague one leads to the wrong tool, and the job takes longer.

> [!ANALOGY]
> Technical vocabulary is like a carpenter's toolbox: the exact word does the job in one go, while a vague word sends people looking for the wrong tool.
>
> **Where the analogy breaks:** tools are the same in every workshop. Words are not: some terms mean slightly different things in different teams ("service", "deploy", "environment"), and some everyday English phrases differ between countries. When in doubt, define the term once, and listen to how your team uses it.

## The proper definition and key words

**Technical English** is the vocabulary, phrasing and conventions used to communicate precisely about technical work.

Key words:

- **Term of art** — a word with a specific technical meaning ("idempotent", "throughput").
- **Collocation** — words that naturally go together ("deploy a service", "run a query", "raise an alert").
- **Hedge** — a word that softens certainty ("probably", "likely") — useful when accurate, harmful when automatic ({{ch:speaking-about-your-work}}).
- **Abbreviation / acronym** — shortened forms (API, SLA); expand them the first time for unfamiliar readers.

## Core vocabulary

### Level 1 — APIs and back ends

| Term | Meaning | Example sentence |
|---|---|---|
| Endpoint | A URL and method that accepts requests | "The `POST /orders` endpoint creates an order." |
| Payload / request body | Data sent with a request | "The payload is missing the `currency` field." |
| Response schema | The structure of returned data | "We added an optional field to the response schema." |
| Authentication / authorisation | Who you are / what you may do | "Authentication succeeded, but authorisation failed — the user isn't an admin." |
| Idempotent | Repeating it has the same effect as doing it once | "The payment endpoint is idempotent when you send an idempotency key." |
| Rate limit / throttle | A cap on requests per period / slowing requests down | "The partner hit their rate limit and got 429s." |
| Backward compatible / breaking change | Old clients keep working / they do not | "Renaming the field is a breaking change" ({{ch:api-versioning}}). |
| Validation | Checking input is correct | "Validation rejects negative quantities." |

### Level 1 — Performance and reliability

| Term | Meaning | Example sentence |
|---|---|---|
| Latency | Time for one request | "p95 latency rose to 900 ms." |
| Throughput | Work done per second | "Throughput is about 2,000 requests per second." |
| Bottleneck | The component limiting performance | "The database is the bottleneck, not the API." |
| Cache hit / miss | Found / not found in the cache | "The hit ratio dropped after the deploy." |
| Timeout | Giving up after a set time | "The call to the payment provider timed out after 3 seconds." |
| Retry with backoff | Trying again with growing delays | "We retry three times with exponential backoff." |
| Degrade gracefully | Keep working with reduced features | "If recommendations fail, the page degrades gracefully." |
| Outage / incident | Service unavailable / an unplanned disruption | "We had a 20-minute outage during the incident." |
| Uptime / availability | Share of time working | "Availability was 99.95% last quarter." |
| Regression | Something that used to work and now does not | "The release caused a performance regression." |

### Level 2 — Cloud, delivery and data

| Term | Meaning |
|---|---|
| Provision | Create and configure infrastructure ("we provisioned a new database") |
| Deploy / release / roll out / roll back | Put code on servers / make it available to users / gradually deploy / return to the previous version ({{ch:cicd}}) |
| Build / pipeline | Compile and package / the automated sequence of steps |
| Environment | Where the system runs: development, staging, production |
| Scale up / scale out | Bigger machines / more machines ({{ch:scalability}}) |
| Replica / primary | A copy of a database / the main writable one ({{ch:replication}}) |
| Migration | A controlled change to the database schema or data |
| Schema | The structure of tables and columns |
| Shard / partition | Split data across databases / within one database |
| Eventual consistency | Copies become the same after a delay ({{ch:distributed-systems}}) |

### Level 2 — Strong verbs

Precise verbs make sentences short and clear:

| Instead of | Say |
|---|---|
| "did some changes to" | **refactored**, **rewrote**, **extracted**, **simplified** |
| "made it faster" | **optimised**, **cached**, **indexed**, **batched**, **parallelised** |
| "looked into the problem" | **investigated**, **reproduced**, **traced**, **profiled**, **isolated** |
| "fixed" (when more is true) | **patched**, **resolved**, **mitigated** (reduced impact without fully fixing), **worked around** |
| "put it on the server" | **deployed**, **shipped**, **released**, **rolled out** |
| "made" | **designed**, **implemented**, **built**, **introduced**, **automated** |
| "checked" | **verified**, **validated**, **tested**, **reviewed**, **confirmed** |

## Describing numbers and change

### Level 2 — Precise quantities

- **From… to…**: "Response time fell **from** 400 ms **to** 40 ms."
- **By**: "It **fell by** 90%" (the size of the change). "It increased **by** 20 ms."
- **Times**: "It's **ten times faster**" — or more precisely "response time is a tenth of what it was".
- **Percentages versus percentage points**: an error rate going from 2% to 3% rose by **one percentage point**, or by **50%**. Be clear which you mean.
- **Approximations**: "about", "roughly", "around", "approximately" for estimates; "at least", "at most", "up to" for bounds; "fewer" with countable things (fewer errors), "less" with amounts (less memory).
- **Units**: milliseconds (ms), seconds, requests per second, GB, Mbit/s — always say the unit.
- **Percentiles**: "p95 latency is 200 ms" means 95% of requests are faster than 200 ms ({{ch:monitoring}}).

### Level 3 — Certainty and uncertainty

Say exactly how sure you are:

| Certainty | Phrases |
|---|---|
| Confirmed | "I've confirmed that…", "The logs show…", "We measured…" |
| Strong belief | "This is very likely caused by…", "All the evidence points to…" |
| Hypothesis | "My hypothesis is…", "One possibility is…; I'm checking it now." |
| Unknown | "We don't know yet. The next step is…" |

This is different from automatic hedging: accurate uncertainty is professional and builds trust ({{ch:questions-you-cannot-answer}}).

### Level 3 — Comparing options

- "**Compared with** Redis, Memcached is simpler but has fewer data structures."
- "PostgreSQL **is better suited to** relational data; DynamoDB **scales more easily** for simple key lookups."
- "**The main advantage** of A is…; **the downside** is…"
- "**On the other hand**, B would…"
- "**Given** our traffic, **I'd recommend**…" ({{ch:engineering-decisions}})

## Common confusions

### Level 3 — Words that are easy to mix up

| Pair | Difference |
|---|---|
| affect / effect | *affect* is usually a verb ("the change affects login"); *effect* is usually a noun ("the effect was positive") |
| latency / throughput | time per request / requests per time |
| authentication / authorisation | identity / permission |
| deploy / release | put on servers / make available to users (feature flags separate them) |
| bug / issue / incident | a defect / any tracked problem or task / a live disruption |
| ensure / insure / assure | make certain / financial insurance / tell someone confidently |
| lose / loose | fail to keep / not tight |
| its / it's | belonging to it / it is |
| complement / compliment | complete / praise |
| data (plural or uncountable) | "the data shows" is accepted in engineering; be consistent |

### Level 3 — Local phrases that confuse international colleagues

Some expressions common in South Asian English are not understood, or sound odd, to colleagues elsewhere. Use the international alternative at work:

| Local usage | International alternative |
|---|---|
| "Please do the needful." | "Could you please [specific action]?" |
| "Kindly revert." | "Please reply." / "Let me know." ("Revert" means "go back to a previous state" — in engineering, "revert a commit") |
| "Prepone the meeting." | "Move the meeting earlier." |
| "I have a doubt." | "I have a question." |
| "Discuss about the design." | "Discuss the design." (no "about") |
| "Same is done." | "That's done." |
| "Passed out of university in 2022." | "Graduated in 2022." |
| "Today itself" / "only" for emphasis | "Today" / "just" or rephrase |
| "Out of station." | "Away" / "travelling" |

These are not "wrong" English — they are regional. Choosing the international form avoids misunderstanding ({{ch:written-english}}).

### Level 4 — Pronunciation and spelling

- **Common terms**: *cache* (said like "cash"), *queue* ("cue"), *SQL* ("S-Q-L" or "sequel" — both used), *Nginx* ("engine-x"), *Kubernetes* ("koo-ber-NET-eez"), *GUID* ("goo-id"), *char* ("char" or "care" — both used), *sudo* ("soo-doo").
- **Product names**: spell them as their owners do: JavaScript, TypeScript, Node.js, PostgreSQL, GitHub, macOS, AWS.
- **Abbreviations**: expand on first use for unfamiliar readers — "service level objective (SLO)".
- **British or American spelling**: either is fine (*optimise/optimize*, *behaviour/behavior*); be consistent within a document, and follow your team's style.

## From beginner to enterprise

**Level 1–2 — the vocabulary.** Core terms for APIs, performance, reliability, cloud and data; strong verbs; precise numbers with units.

**Level 3 — precision.** Expressing certainty accurately; comparing options; avoiding confusing pairs and regional phrases.

**Level 4 — polish.** Pronunciation of common terms; correct product names; expanded abbreviations; consistent spelling.

**Level 5 — senior language.** Writing and speaking about trade-offs, risks and strategy with exact language.

**Level 6 — shaping language.** Defining team glossaries and conventions so a whole organisation communicates precisely.

## Real-world use cases

### The wrong word

- **Story**: an engineer wrote "the deploy is broken" in the team channel. Two people investigated the deployment pipeline for an hour; the real problem was a failing database migration after a successful deploy. "The release succeeded, but the migration failed on the `orders` table" would have saved the hour.

### The confused client

- **Story**: a client in Germany received "kindly revert at the earliest" and was unsure what to revert. The team switched to "please reply when you can" in client communication.

## Common mistakes

### Beginner: vague verbs ("did changes", "looked into")

**Fix:** precise verbs.

### Beginner: numbers without units or baselines

**Fix:** from–to, with units.

### Intermediate: mixing latency and throughput, authentication and authorisation

**Fix:** learn the pairs.

### Intermediate: regional phrases with international colleagues

**Fix:** international alternatives.

### Intermediate: unexplained abbreviations

**Fix:** expand them on first use.

## Debugging and troubleshooting

- **People misunderstand your messages**: check for vague verbs, missing units, ambiguous "it", and regional phrases.
- **You search for words under pressure**: build topic banks — write the ten sentences you use most about your projects and practise them ({{ch:interview-under-pressure}}).
- **Unsure of a term's meaning in your team**: ask; teams often use words slightly differently.

## Security summary

- **Precise words in security incidents** matter: "breach" (data accessed by an unauthorised party), "vulnerability" (a weakness), "exploit" (using a weakness), "exposure" (data was reachable) have different legal and business meanings — use them carefully and follow your company's incident process ({{ch:application-security}}).

## How a senior engineer thinks about this

- **Words are part of the system.** Imprecise language causes real mistakes.
- **Exact numbers, exact certainty.** Say what you measured and how sure you are.
- **Write for the widest audience.** International, clear English over local idiom.
- **Define and listen.** Agree on terms with your team.

## Exercises

### Exercise 1 — Make it precise

**Objective:** practise vocabulary.
**What to do:** rewrite: "We did some changes and now the API is much better, around 50% better."

<details>
<summary>Show the solution</summary>

"We added a composite index on `orders(customer_id, created_at)` and batched the customer lookups. p95 latency for `GET /orders` fell from about 800 ms to 400 ms — a 50% reduction." Specific action, metric, units, baseline and result.

</details>

### Exercise 2 — Fix the confusions

**Objective:** practise common pairs.
**What to do:** correct: "The deploy effected the authentication of admins — they could log in but couldn't access the admin pages, and it's latency dropped to 50 requests per second."

<details>
<summary>Show the solution</summary>

"The release **affected** admin **authorisation**: admins could log in (authentication worked) but couldn't open the admin pages. **Its throughput** dropped to 50 requests per second." Effect → affect; authentication → authorisation (they could log in); it's → its; requests per second measures throughput, not latency.

</details>

### Exercise 3 — International phrasing

**Objective:** practise clear professional English.
**What to do:** rewrite this message for an international team: "Dear team, I have a doubt regarding the API, kindly do the needful and revert by today itself. Also please prepone tomorrow's meeting."

<details>
<summary>Show the solution</summary>

"Hi team — I have a question about the orders API: should cancelled orders be included in `GET /orders` by default? Could someone reply today if possible? Also, could we move tomorrow's meeting earlier — would 10:00 work instead of 14:00?"

</details>

## Summary

Technical English is precise vocabulary used consistently. Learn the core terms for **APIs** (endpoint, payload, idempotent, authentication versus authorisation, breaking change), **performance and reliability** (latency, throughput, bottleneck, timeout, backoff, regression), and **cloud, delivery and data** (provision, deploy, release, roll back, environment, replica, migration, eventual consistency). Use **strong verbs** — refactor, optimise, reproduce, mitigate, deploy, verify — instead of vague ones.

Describe numbers with **from–to**, **by**, units, baselines and the difference between percentages and percentage points; express **certainty** accurately (confirmed, likely, hypothesis, unknown); and compare options with clear phrases. Avoid common confusions (affect/effect, latency/throughput, deploy/release, its/it's) and prefer **international phrasing** over regional expressions such as "do the needful" or "kindly revert". Pronounce common terms correctly, write product names as their owners do, expand abbreviations on first use, and keep spelling consistent.

## Key terms

- **Technical English** — Vocabulary and conventions for precise technical communication.
- **Term of art** — A word with a specific technical meaning.
- **Collocation** — Words that naturally appear together.
- **Strong verb** — A precise verb describing a specific action.
- **Percentage point** — The arithmetic difference between two percentages.
- **Baseline** — The starting value a change is compared with.
- **Regional usage** — Phrases common in one region but unfamiliar elsewhere.
- **Acronym** — An abbreviation formed from initial letters, such as API.

## What comes next

Most engineering communication is written. The next chapter, {{ch:written-english}}, covers writing at work: messages, emails, pull request descriptions, commit messages, bug reports, status updates and documentation that people can act on.
