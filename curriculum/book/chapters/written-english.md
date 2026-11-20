# Written English at Work

> [!GOALS]
> - Apply four rules that make professional writing clear: **shortest complete version, point first, one purpose, plain over formal**.
> - Write the messages of a job search: replying to recruiters, following up, thanking interviewers, asking for feedback and declining offers.
> - Write the messages of daily engineering work: status updates, requests for help, written disagreement, pull request descriptions, commit messages and bug reports.
> - Recognise dated or confusing phrasing and replace it with modern international English.

## Why this matters

Most of your professional communication is read, not heard. Your application, your reply to a recruiter, your pull requests, your status updates and your incident notes are all written — and they are read by people deciding whether to trust you, hire you, review your code quickly or escalate a problem.

Writing is also the half of English with the fastest return, because you can revise before sending. Nobody sees your three drafts. A non-native speaker who writes clearly is judged on the clarity, not on their accent. This chapter builds on {{ch:technical-english}} and {{ch:explaining-technical-work}}.

## The simple idea

Good work writing is like a good road sign: the reader is moving fast, so the sign says the one thing they need, in the fewest words, at the moment they need it. A road sign that began with a paragraph of greetings would cause accidents.

> [!ANALOGY]
> Work writing is like a road sign: one clear message for a reader who is busy and moving fast.
>
> **Where the analogy breaks:** road signs never need context or reasons. Work messages often do — a pull request needs the *why*, a request for help needs what you already tried. "Short" means no wasted words, not missing information.

## The proper definition and key words

**Professional written English** is writing that lets a busy reader understand and act with minimum effort.

Key words:

- **Register** — the level of formality. Modern engineering writing is plain and direct, not ceremonial.
- **Front-loading** — putting the main point or request in the first sentence.
- **Scannable** — structured (short paragraphs, headings, bullets) so the reader finds what they need quickly.
- **Call to action** — the specific thing you want the reader to do.

## Four rules

### Level 1 — The rules

1. **Shortest version that is still complete.** Length is not effort and it is not respect. A four-line message that answers everything beats twelve lines that circle the point.
2. **Point first.** Say what you want in the first sentence, then explain. A request buried under three sentences of background is often missed.
3. **One message, one purpose.** Two requests in one message often means only one gets answered. If you must combine them, number them.
4. **Plain over formal.** "Please find attached herewith the requisite documents for your kind perusal" reads as dated. "I've attached the documents" is professional.

Before:

> Dear Sir, Hope you are doing well. I am writing this message to inform you that regarding the issue we discussed in the meeting, I have done some investigation and it seems there may be some problem in the database side, so kindly guide me on how to proceed further.

After:

> Hi Bilal — could you advise on the slow `orders` query? I've traced it to a missing index on `orders(customer_id)`. Adding it on production needs your approval because the table is large. Shall I schedule it for the low-traffic window?

## Messages in the job search

### Level 1 — Replying to a recruiter

Reply promptly and specifically:

> Hi Sana — thanks for reaching out, I'm interested.
>
> A quick summary: three years' experience, currently the sole developer on a billing product in PHP. I've recently moved into Node.js, React and PostgreSQL — my portfolio project is here: [link].
>
> I'm available for a call on weekday evenings. Could you tell me the salary range for the role and what the interview process looks like?
>
> Thanks,
> [Your name]

It answers, it gives evidence, it offers availability, and it asks the two questions you need answered. Asking for the range early, in writing, is normal ({{ch:referrals-and-recruiters}}, {{ch:negotiating-offers}}).

### Level 1 — Following up on silence

A few working days after applying, a short follow-up with no apology:

> Hi — following up on my application for the Backend Engineer role. I'm still very interested and happy to send anything useful. Thank you.

Two sentences. A long follow-up reads as anxious.

### Level 2 — After an interview

Send it soon after, and reference one specific thing so it is clearly not a template:

> Hi Usman — thank you for the time today. I enjoyed the discussion, especially how your team handles schema migrations across client deployments; it's a problem I've worked on myself. If useful, I'm happy to share the performance write-up I mentioned. I look forward to hearing about next steps.

### Level 2 — Asking for feedback after a rejection

One message, one specific question:

> Thank you for letting me know, and for your team's time. If you have a moment, I'd find it really useful to know the main gap — was it the coding round, the system design discussion or experience level? Either way, thank you, and I'd be glad to be considered in future.

Many companies will not reply; the ones that do give you information worth far more than guessing.

### Level 2 — Declining an offer

Short, warm, no criticism — you may want to work with them later:

> Thank you very much for the offer and for everyone's time. After careful thought I've decided to accept another role, but I really enjoyed our conversations and hope our paths cross again.

## Messages at work

### Level 2 — The status update

The most common thing you will write. Use a fixed shape:

> **Done:** invoice export endpoint, with tests. Merged.
> **In progress:** the currency conversion bug — reproduced; it's a race between the rate fetch and the total calculation. I expect a fix in review by end of day.
> **Blocked:** need access to the staging database to verify the migration. I've requested it from Ahsan.

Three headings, scannable in seconds. **State blockers explicitly** — a blocker your manager does not know about is your problem; one they know about is a problem they can help solve ({{ch:first-ninety-days}}, {{ch:remote-work}}).

### Level 2 — Asking for help

Bad: *"The API isn't working, can you help?"*

Good:

> I'm getting a 500 on `POST /expenses` when the amount has more than two decimal places. I've checked the validation schema (it allows it) and the column is `numeric(10,2)`, so I think the database is rejecting it — but the error is swallowed and logged only as "internal error". Could you point me to where database errors are mapped? Here's the request I'm sending: [snippet].

It says what happens, what you tried and what you need. It respects the reader's time and gets a faster answer.

### Level 3 — Disagreeing in writing

Tone does not survive text, so written disagreement escalates easily. Three habits keep it productive:

- **State the shared goal first.** "We both want this to be easy to maintain."
- **Say what you would do and why**, rather than what is wrong with their idea. "I'd lean towards doing it in the database, because the constraint then holds for every writer."
- **Leave a genuine opening.** "What am I missing?" — and mean it.

If a thread goes back and forth more than a couple of times, suggest a short call and write the outcome down afterwards ({{ch:engineering-decisions}}).

### Level 3 — The pull request description

Small, but it shapes how reviewers see you:

> **What:** adds pagination to the expenses list endpoint.
> **Why:** the endpoint returned every row; one test group has 4,000 expenses and the response was 2.3 MB.
> **How:** cursor-based, using `(created_at, id)`. I chose cursors over offsets because the list is append-heavy, and offsets drift when rows are inserted during paging.
> **Testing:** unit tests for the cursor encoding; manual check against the seeded data set.
> **Notes:** the front end still calls it without parameters and gets the first 50 — no breaking change.

The *why* and the reasoning in *how* are what a reviewer needs most, and many descriptions omit both ({{ch:code-review-and-documentation}}).

### Level 3 — Commit messages

A common convention is a short summary line with a type and optional scope:

```text
fix(orders): reject quantities below one

Negative quantities created negative totals. Validation now rejects
quantity < 1 with a 400 and a clear error message.
```

- The summary is in the imperative ("reject", not "rejected" or "rejects"), short, with no full stop.
- The body explains *why*, wrapped at around 72 characters.
- Common types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore` ({{ch:git}}).

### Level 3 — Bug reports

A bug report someone can act on without asking you questions:

> **Title:** Checkout returns 500 when the cart contains a deleted product
>
> **Environment:** staging, release 2.14.0
> **Steps to reproduce:**
> 1. Add product 1042 to the cart.
> 2. Delete product 1042 in the admin panel.
> 3. Open the cart and click Checkout.
>
> **Expected:** a message saying the product is no longer available.
> **Actual:** HTTP 500; the log shows `TypeError: Cannot read properties of null (reading 'price')` in `cart-total.ts`.
> **Impact:** affects any customer with a removed product in their cart.

A bad report says "checkout is broken, please fix ASAP". The good one gives the environment, exact steps, expected versus actual, evidence and impact ({{ch:errors-and-debugging}}).

## Phrases worth replacing

### Level 4 — Register, not grammar

These are habits rather than errors, but changing them noticeably improves how your writing reads:

| Instead of | Write |
|---|---|
| "Kindly do the needful." | "Could you review this when you have a moment?" |
| "Revert back to me." | "Get back to me." / "Let me know." ("Revert" means undo.) |
| "I have a doubt." | "I have a question." (In international English a doubt is scepticism.) |
| "Sorry to disturb you…" in every message | Just ask. Apologise when there is a reason. |
| "Please find attached herewith." | "I've attached…" |
| "The bug was introduced." | "I introduced this bug in the migration." (Own it.) |
| "ASAP" | A real time: "by 15:00 so we can release today". |
| "Any update?" | "Is the review on track for today? I'd like to deploy before the freeze." |

Passive voice that hides who did what reads as evasive; active voice is clearer and shows ownership ({{ch:technical-leadership}}).

## From beginner to enterprise

**Level 1 — the rules.** Short and complete, point first, one purpose, plain register.

**Level 2 — the routine messages.** Recruiter replies, follow-ups, thank-yous, status updates, requests for help.

**Level 3 — engineering writing.** Pull requests, commit messages, bug reports, written disagreement.

**Level 4 — polish.** Modern register, active voice, specific times instead of "ASAP".

**Level 5 — senior writing.** Design documents, incident reviews and decision records that shape how a team thinks ({{ch:presenting-a-design}}).

**Level 6 — writing culture.** Templates, review norms and documentation that make a whole organisation communicate clearly.

## Real-world use cases

### The buried request

- **Story**: a developer wrote a long email about an outage, with the request for budget approval in the fifth paragraph. The manager read the first two paragraphs, replied "thanks for the update", and the request was missed. Rewritten with the request in the first line, it was approved within the hour.

### The pull request nobody reviewed

- **Story**: a large pull request titled "changes" sat unreviewed. After it was split and given What / Why / How descriptions, reviewers approved the parts quickly.

## Common mistakes

### Beginner: long greetings and background before the point

**Fix:** point first.

### Beginner: several requests in one message

**Fix:** one purpose, or numbered requests.

### Intermediate: dated, ceremonial register

**Fix:** plain international English.

### Intermediate: hidden blockers in status updates

**Fix:** a "Blocked" line, always.

### Intermediate: pull requests and bug reports without context

**Fix:** What / Why / How; steps, expected and actual.

## Debugging and troubleshooting

- **Messages go unanswered**: is the request in the first line? Is there one clear call to action?
- **Written disagreements escalate**: state the shared goal, propose rather than criticise, move to a call.
- **Reviewers ask many questions**: add the why and the testing to the pull request description.
- **Unsure your message is clear**: read it as the busiest person who will receive it; cut what they do not need.

## Security summary

- **Never paste secrets** — passwords, API keys, tokens, customer personal data — into chats, tickets, pull requests or emails. Use the secrets manager and redact logs before sharing ({{ch:secrets-manager}}).
- **Be careful with public channels**: incident details and customer names belong in restricted channels.
- **Verify unusual requests** (a "manager" asking for credentials or payments by message) through another channel — this is a common phishing pattern ({{ch:application-security}}).

## How a senior engineer thinks about this

- **Writing is work, not overhead.** A clear message saves everyone's time.
- **The reader is busy.** Point first, scannable, complete.
- **Own it in writing.** Active voice, explicit blockers, honest status.
- **The why is the valuable part.** In pull requests, commits and decisions.

## Exercises

### Exercise 1 — Point first

**Objective:** practise front-loading.
**What to do:** rewrite: "Hello sir, hope you are fine. As discussed I was working on the report feature and there were some issues with the data and I tried some things. Kindly let me know if I can get access to the analytics database because I need to check the data."

<details>
<summary>Show the solution</summary>

"Hi Ahmed — could I get read access to the analytics database? The report totals don't match the orders table, and I need to compare the raw rows to find where they diverge. Read-only access is enough."

</details>

### Exercise 2 — A status update

**Objective:** practise the Done / In progress / Blocked shape.
**What to do:** write a status update for: you merged the login rate-limiting change; you're halfway through adding tests for password reset; you can't test emails because the staging mail service credentials are missing.

<details>
<summary>Show the solution</summary>

**Done:** login rate limiting — merged, with tests.
**In progress:** password reset tests — about half written; I expect them in review by end of day.
**Blocked:** can't test reset emails on staging — the mail service credentials are missing. I've asked the platform team; could you help if it isn't resolved today?

</details>

### Exercise 3 — A pull request description

**Objective:** practise What / Why / How.
**What to do:** write a description for a change that adds a Redis cache to the product details endpoint, with a 5-minute expiry and invalidation when a product is updated.

<details>
<summary>Show the solution</summary>

**What:** caches product details in Redis.
**Why:** the endpoint is the most frequently called and each request runs three queries; p95 latency is about 300 ms at peak.
**How:** cache-aside with a 5-minute TTL; the cache entry is deleted when a product is updated, so prices are never stale for long ({{ch:caching-at-scale}}).
**Testing:** unit tests for hit, miss and invalidation; load test on staging showed p95 fall to about 40 ms.
**Notes:** if Redis is unavailable, the endpoint falls back to the database.

</details>

## Summary

Most professional communication is written, and writing can be revised before anyone sees it. Follow four rules: the **shortest complete version**, **point first**, **one purpose per message**, and **plain over formal**.

In a job search, reply to recruiters promptly with a summary, evidence, availability and questions; follow up once, briefly; thank interviewers with a specific reference; ask for feedback with one question; and decline offers warmly. At work, write **status updates** as Done / In progress / Blocked, **ask for help** with what you tried, **disagree in writing** by stating the shared goal and proposing, and write **pull requests** (What / Why / How / Testing / Notes), **commit messages** (imperative summary, body explaining why) and **bug reports** (environment, steps, expected, actual, impact) that others can act on. Replace dated phrases such as "do the needful", "revert back" and "I have a doubt", use active voice, give real times instead of "ASAP", and never paste secrets into messages.

## Key terms

- **Register** — The level of formality in writing.
- **Front-loading** — Putting the main point first.
- **Call to action** — The specific thing you want the reader to do.
- **Status update** — A short Done / In progress / Blocked report.
- **Blocker** — Something preventing progress that someone else can remove.
- **Imperative mood** — The command form of a verb ("fix", "add"), used in commit summaries.
- **Steps to reproduce** — The exact actions that cause a bug.
- **Active voice** — A sentence where the subject performs the action ("I introduced the bug").

## What comes next

Writing gives you time to think; conversation does not. The next chapter, {{ch:small-talk}}, covers the first few minutes of interviews and meetings — greetings, small talk and the informal English that sets the tone before the technical discussion begins.
