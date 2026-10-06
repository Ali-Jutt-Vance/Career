# Phase 10 — Chapter 4: Written English at Work

> *"Most of your professional communication will be read, not heard. It is also the only kind you get to edit before anyone sees it."*

---

## Chapter Overview

Written English is the easier half of this phase and the one with the fastest return, because you can revise before sending. Nobody sees the three drafts.

It is also the first thing a company sees of you. Your application message, your reply to a recruiter, your follow-up after an interview — all of them arrive in writing before anyone hears you speak. A clear, short, well-structured message stands out immediately, because the average one is neither short nor structured.

This chapter covers the messages you will actually send during the job hunt, and the ones you will send every day once you are hired.

## Four rules

**Shortest version that is still complete.** Length is not effort and it is not respect. A four-line message that answers everything is better than twelve lines that circle the point. Write it, then delete a third of it.

**The point first.** English professional writing is front-loaded: say what you want in the first sentence, then explain. Burying the request under three sentences of preamble means it may not be read at all.

**One message, one purpose.** Two requests in one message means one gets answered.

**Plain over formal.** "Please find attached herewith the requisite documents for your kind perusal" is a register that reads as dated and slightly evasive in a modern engineering company. "I've attached my CV" is better in every way. This matters particularly at Tier 2 companies with foreign clients, where the house style is direct.

## Messages you will send in the job hunt

### Replying to a recruiter

Fast and specific. Reply within hours if you can; recruiters move down their list quickly.

> Hi Sana — thanks for reaching out, I'm interested.
>
> Quick summary: three years' experience, currently on PHP/AngularJS as the sole developer on a billing product. Over the last few months I've moved into Node, React and PostgreSQL and shipped two applications — here's one: [link].
>
> I'm available for a call any weekday after 6pm, or any time Saturday. Could you tell me the range for the role and what the process looks like?
>
> Thanks,
> Ali

Four short paragraphs. It answers, it evidences, it gives availability, and it asks the two questions you need answered. Asking for the range in writing, early, is normal and it is the easiest time to ask.

### Following up on silence

Five working days after applying. Short, no apology, no pressure.

> Hi — following up on my application for the Backend Engineer role, sent on 2 October. Still very interested, and happy to send anything that would be useful. Thank you.

Two sentences. A long follow-up reads as anxiety.

### After an interview

Within twenty-four hours. Reference one specific thing that was discussed, so it is clearly not a template.

> Hi Usman — thank you for the time today. I enjoyed the discussion, particularly the part about how you handle schema migrations across the client deployments; that's a problem I hadn't thought about at that scale.
>
> If it would help, I'm happy to share the performance write-up I mentioned. Looking forward to hearing about next steps.

### Asking for feedback after a rejection

One message, one specific question. Roughly one in five will answer, and one honest answer is worth more than twenty guesses.

> Thank you for letting me know, and for the time your team spent. If you have a moment, I'd find it genuinely useful to know the main gap — was it the coding round, the depth, or the fit? I'm working on this deliberately and any specific pointer would help.
>
> Either way, thanks, and I'd be glad to be considered in future.

### Declining an offer

Short, warm, no criticism. You may want them next year.

> Thank you very much for the offer and for the time everyone invested. After thinking it through I've decided to accept another role, but I really appreciated the conversations and I'd be glad to stay in touch.

## Messages you will send once hired

### The status update

The most common thing you will write, and the shape matters:

> **Done:** invoice export endpoint, with tests. Merged this morning.
> **In progress:** the currency conversion bug — reproduced it, it's a race between the rate fetch and the total calculation. Fix by tomorrow.
> **Blocked:** need access to the staging database to verify the migration. Asked Ahsan yesterday.

Three headings. Scannable in five seconds. **Always state blockers explicitly** — a blocker your manager does not know about is your problem; one they know about is theirs.

### Asking for help

Bad: *"The API isn't working, can you help?"*

Good:

> I'm getting a 500 on POST /expenses when the amount has more than two decimal places. I've checked the validation schema (it allows it) and the database column is numeric(10,2), so I think it's rounding at insert. I've tried casting explicitly and it still fails. Any idea what I'm missing?

The second version shows what you tried, which respects the reader's time and makes it far more likely to be answered quickly. It also demonstrates that you thought before asking — which is a reputation you build in your first month and keep for years.

### Disagreeing in writing

Written disagreement escalates more easily than spoken disagreement, because tone does not survive text. Three habits keep it productive:

- **State the shared goal first.** "We both want this to be maintainable."
- **Say what you would do and why, not what is wrong with theirs.** "I'd lean toward doing it in the database because…" rather than "your approach doesn't handle…"
- **Leave a genuine opening.** "What am I missing?" — and mean it.

### The pull request description

Small, and it does a lot of work for how you are perceived:

> **What:** adds pagination to the expenses list endpoint.
> **Why:** the endpoint was returning every row; one test group has 4,000 expenses and the response was 2.3 MB.
> **How:** cursor-based, using (created_at, id). Chose cursor over offset because the list is append-heavy and offset drifts when rows are inserted during paging.
> **Notes:** the frontend still calls it without parameters and gets the first 50 — no breaking change.

The "why" and the reasoning in "how" are what a reviewer actually needs, and most descriptions omit both.

## Common patterns worth fixing

These are habits rather than errors, and correcting them noticeably lifts how your writing reads:

- **"Kindly do the needful"** and similar formulations read as dated. Say what you want: "Could you review this when you have a moment?"
- **"Revert back to me"** — "revert" means undo. Use "get back to me" or "let me know".
- **"Doubt" for "question."** In international English a doubt is scepticism. "I have a question about the schema", not "I have a doubt".
- **Excessive apology.** "Sorry to disturb you" at the start of every message. Once in a while, fine; every time, it reads as low status. Just ask.
- **"Please find attached herewith."** "I've attached."
- **Passive voice hiding who did what.** "The bug was introduced" — by whom? Own it: "I introduced this bug in the migration."

None of these are grammar mistakes. They are register, and register is what makes writing sound professional or not.

## Practising

**Rewrite one of your own messages each week.** Take something you sent, cut it by a third, and put the point in the first sentence. Four weeks of this changes your default.

**Read the writing at companies you admire.** Engineering blogs, changelogs, public documentation. Notice how short the sentences are.

**Write your daily log entries in English,** properly, in full sentences rather than fragments. Ninety seconds a day of real writing practice, attached to something you are doing anyway.

## Self Assessment

- Does my last sent message put the point in the first sentence?
- Could I cut it by a third without losing anything?
- Do I state blockers explicitly, or hope they resolve before anyone notices?
- When I ask for help, do I say what I already tried?
- Am I using any of the dated formulations above?

## Cheat Sheet

- **Shortest complete version. Point first. One purpose per message. Plain over formal.**
- **Reply to recruiters within hours,** with a summary, a link, availability, and two questions — including the range.
- **Follow up once at five working days.** Two sentences, no apology.
- **Thank-you within 24 hours,** referencing one specific thing discussed.
- **Ask every rejection one specific question.** One in five answers.
- **Status update: Done · In progress · Blocked.** Always state blockers explicitly.
- **Asking for help: say what you already tried.** It is the difference between a good and a bad reputation in month one.
- **PR description: what · why · how (with the reasoning) · notes.**
- **Fix the register:** no "do the needful", no "revert back", "question" not "doubt", stop apologising for existing.
