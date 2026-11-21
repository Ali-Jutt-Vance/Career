# Your First Ninety Days

> [!GOALS]
> - Leave your previous job well: notice, handover and reputation.
> - In the first phase, **understand before changing**: ask questions, fix small things, ship early, learn the people.
> - In the second phase, use **code review** as the most valuable learning tool you have.
> - In the third phase, contribute **beyond your tickets**: ownership, documentation, stretch work and explicit feedback.
> - Build lasting habits that keep you growing instead of plateauing.
> - Plan the next steps of your career from a strong environment.

## Why this matters

A new job is not the finish line; it is the environment that shapes what you become over the next few years. The same engineer can grow quickly in one team and stand still in another — and, perhaps surprisingly, the same engineer can stand still even in a good team if they keep old habits: not asking questions, avoiding review, merging code they cannot fully explain, learning only what each ticket requires.

The first three months matter disproportionately. People form their impression of you early; you have permission to ask "basic" questions now that you will not have later; and the habits you set now tend to stay. This chapter is a practical guide to using that period well, and to the habits that keep a career compounding. It builds on {{ch:technical-leadership}} and {{ch:negotiating-offers}}.

## The simple idea

Joining a new team is like moving to a new city. At first you explore, ask for directions, find the shops and learn who your neighbours are. You do not start rearranging the streets in your first week. After a while you know your way around and start contributing — joining the community, fixing something in your street. People remember how the newcomer behaved in the first months.

> [!ANALOGY]
> Starting a new job is like moving to a new city: first explore and ask for directions, then settle in, then start contributing — and people remember how you behaved at the start.
>
> **Where the analogy breaks:** a city does not give you written feedback on how you walk its streets. A good engineering team does, through code review, several times a week — which makes a new job a far faster learning opportunity than a new city, if you use it.

## The proper definition and key words

**Onboarding** is the period in which a new employee learns the organisation, its systems, people and practices and becomes productive. The **first ninety days** is a common way to plan and judge that period.

Key words:

- **Onboarding buddy / mentor** — a colleague assigned to help you start.
- **Starter task** — a small, low-risk task for learning the workflow.
- **Code review** — colleagues reading and commenting on your changes before merging ({{ch:code-review-and-documentation}}).
- **Tribal knowledge** — knowledge in people's heads rather than in documentation.
- **Ownership** — taking responsibility for an outcome, not just a task.
- **Work log** — your short record of what you did and learned.
- **Level criteria** — the expectations for promotion to the next level.

## Before you start

### Level 1 — Leaving well

- **Serve your notice properly**: finish what you can and document what you cannot. The software industry, in Pakistan and elsewhere, is small; reputations travel.
- **Write a handover document**: systems you looked after, where things are, known problems, contacts. Nobody may ask; do it anyway.
- **Rest if you can**: even a few days between jobs helps you start with energy.
- **Keep learning lightly in the gap**: a small project or reading keeps your momentum.

## The first phase: understand before you change

### Level 1 — Ask, write down, fix small things

- **Ask questions constantly** and write down the answers — the first weeks are the one period when "I don't know what that means" costs nothing. Keep your own notes of systems, terms and decisions.
- **Learn the codebase through small fixes**: a tiny bug fix teaches you the build, the tests, the review process and the deployment pipeline end to end.
- **Ship something early**, however small: it builds confidence in you and momentum for you.
- **Set up your environment fully** and note what was hard — useful later for improving onboarding documentation.
- **Map the people**: who knows which part of the system, who reviews what, who decides, and who is generous with their time.

### Level 2 — Hold your opinions

You will see things that look wrong. Some are; many have a history you do not know yet. Write them down privately, learn why they exist, and raise them later with context and a proposal rather than criticism. Arriving with strong opinions about everything is the most common newcomer mistake; arriving silent and afraid to ask is the second.

### Level 2 — Understand the context

- What does the product do, for whom, and how does it make money?
- What are the team's goals this quarter, and how is success measured?
- How do work, reviews, releases and on-call function?
- What does your manager expect from you in the first months? Ask directly.

## The second phase: use code review

### Level 2 — Review comments are free teaching

If you have worked without review before, this is the biggest change. Every comment is a colleague teaching you, in writing, about your code:

- **Ask why, not only what**: when a reviewer says "use a transaction here", ask what goes wrong without one. The answer teaches more than the fix ({{ch:transactions}}).
- **Respond professionally**: thank, ask, fix, or explain your reasoning politely when you disagree — and accept the team's standard when it is a matter of style.
- **Track recurring themes**: if several people comment on your error handling, that is a real gap identified for you; write down the patterns and fix them for good.
- **Keep changes small**: small pull requests get faster, better reviews.

### Level 3 — Review others' code early

Reviewing feels presumptuous when you are new, but it is the fastest way to learn the codebase and the team's standards. You do not need to find problems — ask questions: "Why did you choose this approach?" is a useful review comment. Over time you start noticing real issues, and the team sees you contributing.

### Level 3 — Understand every line you merge

Never merge code you cannot explain, whether you wrote it, copied it or generated it with an AI tool ({{ch:learning-and-ai}}). Code you do not understand becomes production incidents you cannot debug — and it stops you learning.

## The third phase: contribute beyond your tickets

### Level 3 — Ownership and documentation

- **Take one thing nobody owns**: a slow test suite, a flaky deployment step, missing documentation, a noisy alert. Fixing it is visible, valuable and teaches you parts of the system you would not otherwise see ({{ch:observability-and-incidents}}).
- **Write things down**: the onboarding notes you wish you had, a runbook, an explanation of a confusing module. Documentation creates a reputation that lasts.
- **Volunteer for what you are weakest at**: a front-end ticket if you avoided the front end, a change to the deployment pipeline if you never touched it. Stretch work builds range.

### Level 4 — Ask for feedback explicitly

After about three months, ask your manager specific questions — "How am I doing?" produces "fine":

- "What is one thing I should do differently?"
- "What would make you say I'm ready for the next level, and what am I missing?"
- "What do you need from me in the coming months?"

Write the answers down and act on them visibly.

## Lasting habits

### Level 4 — Habits that prevent a plateau

1. **Never merge what you cannot explain.**
2. **Struggle briefly, then ask**: try for a reasonable time (twenty minutes is a good rule), then ask with what you tried. Asking too early stops learning; asking too late wastes days.
3. **Keep building something outside work**, even small: it broadens your skills beyond one employer's needs and keeps your portfolio current ({{ch:portfolio-and-brand}}).
4. **Learn one substantial thing deliberately** at regular intervals — chosen, studied and applied, not passively absorbed.
5. **Keep a work log**: one line a day on what you did and learned. It makes reviews, CV updates and interview stories easy ({{ch:the-cv}}).
6. **Stay interviewable**: update your CV regularly and talk to the market occasionally even when you are happy; it keeps you calibrated.

### Level 4 — Where it goes next

After a year or more of real engineering with real review, new routes open:

- **Senior at the same company**: if it is a good environment, learn the level criteria and work towards them explicitly ({{ch:technical-leadership}}).
- **A stronger product company or international engineering office**: with recognisable experience and reviewed production work, interviews that were out of reach become realistic ({{ch:the-job-market}}).
- **International remote work**: the largest financial step for many engineers, requiring strong independence and communication ({{ch:remote-work}}).

## From beginner to enterprise

**Level 1–2 — a good start.** Leaving well; asking, documenting and fixing small things; shipping early; mapping people; holding opinions until you understand.

**Level 3 — learning fast.** Using review as teaching; reviewing others; understanding every line; taking ownership of something unowned; documenting.

**Level 4 — growing deliberately.** Explicit feedback; lasting habits; planning the next step.

**Level 5 — helping others start.** Being an onboarding buddy, improving onboarding documentation, mentoring new joiners.

**Level 6 — organisations.** Designing onboarding programmes that make new engineers productive and confident quickly.

## Real-world use cases

### The onboarding document

- **Story**: a new engineer kept notes of every confusing step while setting up the project and turned them into a README section. The next three new joiners set up in hours instead of days, and the team lead mentioned it in the engineer's review.

### The repeated comment

- **Story**: in their first two months, an engineer received similar review comments about missing error handling in five pull requests. They wrote a personal checklist, studied the team's error-handling patterns, and the comments stopped ({{ch:error-handling}}).

## Common mistakes

### Beginner: not asking questions

**Fix:** ask early and often, with notes.

### Beginner: criticising the codebase immediately

**Fix:** learn the history first; propose improvements later.

### Beginner: large first pull requests

**Fix:** small, frequent changes.

### Intermediate: treating review as criticism

**Fix:** treat it as teaching; ask why.

### Intermediate: merging code you cannot explain

**Fix:** understand every line.

### Intermediate: only doing assigned tickets

**Fix:** take ownership of something unowned.

### Career: stopping learning once settled

**Fix:** deliberate learning and a work log.

## Debugging and troubleshooting

- **Feeling lost after weeks**: ask your buddy or manager for a guided tour of the architecture; draw it yourself ({{ch:software-architecture}}).
- **Reviews take very long**: smaller pull requests, clear descriptions, ask who should review.
- **Unclear expectations**: ask your manager directly what success looks like.
- **Imposter feelings**: normal for everyone; your notes and work log show your progress.

## Security summary

- **Follow security practices from the start**: access requests through proper channels, no secrets in code, careful with production access ({{ch:application-security}}).
- **Respect confidentiality** of your old and new employers.
- **Ask before using AI tools** with company code; follow the company's policy.

## How a senior engineer thinks about this

- **The environment helps only if you use it.**
- **Questions early are cheap.** Later they cost more.
- **Review is a gift.** Learn from every comment.
- **Ownership builds trust.** Fix what nobody owns.
- **Growth is a habit.** Deliberate learning, every year.

## Exercises

### Exercise 1 — Plan your first phase

**Objective:** practise onboarding.
**What to do:** write five questions you would ask in your first days on a back-end team.

<details>
<summary>Show the solution</summary>

1. "What are the main services, and how does a request flow through them?"
2. "How do we deploy, and how do we roll back?"
3. "What are the team's goals this quarter, and how do we measure them?"
4. "Who should I ask about the database and data model?"
5. "What would you like me to have achieved in my first three months?"

</details>

### Exercise 2 — Respond to review

**Objective:** practise handling feedback.
**The comment:** "This loop makes one query per item — please batch it." Write your response.

<details>
<summary>Show the solution</summary>

"Thanks — good catch. I see it's an N+1 pattern; I'll fetch all the items with one `where id = any($1)` query and map them in memory. Is there an existing helper for batching in this codebase I should use?" Then fix it and note the pattern for future work ({{ch:performance-engineering}}).

</details>

### Exercise 3 — Ask for feedback

**Objective:** practise growth conversations.
**What to do:** write the questions you would ask in a feedback conversation after three months.

<details>
<summary>Show the solution</summary>

- "What's one thing I should do differently?"
- "What's going well that I should keep doing?"
- "What does the next level look like here, and what's the biggest gap between that and my work now?"
- "Is there an area of the system or a problem you'd like me to take ownership of?"

Write down the answers, agree on one or two actions, and check progress in later conversations.

</details>

## Summary

Your first months shape both how others see you and the habits you keep. **Leave your previous job well** with proper notice and a handover. In the **first phase**, understand before changing: ask questions constantly and write down the answers, learn through small fixes, ship something early, map the people and context, and hold your opinions until you know the history.

In the **second phase**, use **code review** as free teaching — ask why, respond professionally, track recurring themes, keep changes small — review others' code early, and never merge code you cannot explain. In the **third phase**, contribute beyond tickets: own something nobody owns, document what confused you, take stretch work, and ask for specific feedback and level criteria. Keep lasting habits — understand every line, struggle briefly then ask, build outside work, learn deliberately, keep a work log, stay interviewable — and use a strong environment to open the next steps: senior roles, stronger companies or remote work.

## Key terms

- **Onboarding** — Becoming productive in a new organisation.
- **Onboarding buddy** — A colleague who helps a new joiner start.
- **Starter task** — A small task for learning the workflow.
- **Handover document** — Notes passing your responsibilities to someone else.
- **Tribal knowledge** — Undocumented knowledge held by people.
- **Ownership** — Taking responsibility for outcomes.
- **Stretch assignment** — Work beyond your current comfort zone.
- **Work log** — A short daily record of work and learning.
- **Level criteria** — Expectations for the next career level.

## What comes next

Many engineers eventually work remotely, for local or international employers. The last chapter of this part, {{ch:remote-work}}, covers remote work: finding remote roles, working across time zones, written communication, payments and contracts, and staying effective and visible from a distance.
