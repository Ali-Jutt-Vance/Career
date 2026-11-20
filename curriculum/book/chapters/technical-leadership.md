# Technical Leadership and Career Growth

> [!GOALS]
> - Understand engineering career levels — junior, mid-level, senior, staff and beyond — and what really changes between them.
> - Lead without formal authority: influence, writing, reviews and setting technical direction.
> - Mentor and grow other engineers, and make a team better than the sum of its people.
> - Work effectively with product managers, designers and leadership.
> - Choose between the **individual contributor** and **management** paths.
> - Manage your own career: feedback, visibility, promotions and sustainable growth.

## Why this matters

The first years of an engineering career are mostly about **your own output**: writing good code, finishing tasks, learning the stack. Then something changes. The engineers whose influence grows are not simply those who code fastest; they are the ones who make the **whole team** effective — who spot the risky design before it is built, unblock others, explain decisions clearly, mentor newcomers and steer the technical direction.

That shift confuses many engineers. They keep doing more of what got them here — more tickets, more hours — and wonder why the next level does not come. This chapter explains what is expected at each level, how leadership works in engineering (mostly without anyone reporting to you), and how to manage your own growth deliberately. It brings together the people side of earlier chapters: code review ({{ch:code-review-and-documentation}}), teamwork ({{ch:agile-and-scrum}}), decisions ({{ch:engineering-decisions}}) and architecture ({{ch:software-architecture}}).

## The simple idea

Think of a football team. A young player is valued for playing their own position well. A senior player also reads the game, talks to teammates, covers when someone is out of position and steadies the team when it is losing. A captain does all that and helps set how the team plays. None of them is the coach, but the team is much better because of them.

> [!ANALOGY]
> Growing as an engineer is like growing as a footballer: first play your position well, then read the game and lift the players around you, and eventually help decide how the team plays.
>
> **Where the analogy breaks:** in football, everyone can see the captain's influence on the pitch. In engineering, the most valuable leadership work — a design review that prevented a bad decision, a document that aligned three teams, an hour of mentoring — is often invisible unless you make it visible.

## The proper definition and key words

**Technical leadership** is guiding the technical direction and effectiveness of a team or organisation — through decisions, standards, mentoring, communication and example — with or without formal authority. **Career growth** is the deliberate expansion of your skills, scope and impact over time.

Key words:

- **Individual contributor (IC)** — an engineer whose main work is technical, not managing people.
- **Career ladder** — a company's description of levels and expectations.
- **Scope** — the size of the problems you own: a task, a feature, a system, several teams, the organisation.
- **Impact** — the difference your work makes to the product, customers and team.
- **Staff / principal engineer** — senior IC levels with cross-team technical leadership.
- **Tech lead** — the engineer leading a team's technical work, often a role rather than a level.
- **Engineering manager** — responsible for people, team health, hiring and delivery.
- **Influence** — changing outcomes through persuasion, trust and clarity, not authority.
- **Mentoring / sponsorship** — giving advice and teaching / actively creating opportunities for someone.
- **Brag document** — your own running record of achievements and impact.

## Levels and what changes

### Level 1 — The career ladder

Ladders differ between companies, but the pattern is similar:

| Level | Typical scope | What success looks like |
|---|---|---|
| **Junior** | Well-defined tasks | Learns quickly, asks good questions, delivers tasks with guidance, writes tested code |
| **Mid-level** | Features | Delivers features independently end to end; good code reviews; handles ambiguity within a feature |
| **Senior** | Systems or a team's technical area | Designs systems; leads projects; makes good trade-offs; mentors; improves how the team works; owns production quality |
| **Staff** | Several teams or a large area | Sets technical direction; solves problems no single team owns; aligns teams; raises the bar across the organisation |
| **Principal and beyond** | The organisation | Shapes long-term technical strategy; works on the most consequential problems; represents engineering widely |

The main change between levels is not technical depth alone — it is **scope** (bigger problems), **ambiguity** (less defined problems) and **leverage** (impact through others).

### Level 2 — From mid-level to senior

The most common and important step. Senior engineers:

- **Own outcomes, not tasks**: "checkout is reliable", not "I closed my tickets". They notice problems nobody assigned and fix or raise them.
- **Design before building**: write short design documents for significant work, consider alternatives, and get feedback early ({{ch:engineering-decisions}}).
- **Make good trade-offs**: good enough versus perfect, now versus later, and they explain the reasoning.
- **Think about production**: monitoring, failure modes, rollbacks, security, cost — not only "it works on my machine" ({{ch:observability-and-incidents}}).
- **Multiply others**: thoughtful code reviews, pairing, mentoring, documentation, unblocking teammates.
- **Communicate clearly**: status, risks and decisions, in writing, to people outside engineering too ({{ch:professional-communication-reference}}).

## Leading without authority

### Level 3 — How influence works

Most technical leadership happens without anyone reporting to you. Influence comes from:

- **Trust**: being reliable, honest about mistakes and uncertainty, and competent in your area.
- **Clarity**: writing well — design documents, RFCs, decision records and clear messages are the main tools of technical leadership.
- **Listening**: understanding other people's constraints and goals before proposing solutions; the best ideas survive scrutiny.
- **Making it easy**: prototypes, data and ready-to-use solutions persuade better than opinions.
- **Credit**: giving credit generously; people follow leaders who make them look good.
- **Picking battles**: insisting on the few things that really matter (security, data integrity, one-way doors) and letting the rest go.

### Level 3 — The tech lead role

A tech lead is responsible for a team's technical direction and delivery, usually while still coding:

- **Shape the work**: break projects into deliverable pieces, identify risks early, sequence work so the riskiest parts come first.
- **Guard quality**: standards for code, tests, reviews and operations; lead by example.
- **Decide or facilitate decisions**, and record them.
- **Unblock**: answer questions, connect people with other teams, remove obstacles — often more valuable than writing code yourself.
- **Balance coding and leading**: take tasks off the critical path, so that your meetings do not block the team.
- **Partner with the product manager and engineering manager**: product owns *what and why*, engineering owns *how*, and the manager owns *people and team health* — the best teams decide together.

### Level 3 — Mentoring and growing others

- **Ask before telling**: "what options have you considered?" builds thinking; giving answers builds dependence.
- **Give specific, timely feedback**: describe the situation, the behaviour and its impact; praise in public, correct in private.
- **Delegate real problems** with support, not just easy tasks — growth comes from stretch.
- **Review code to teach**: explain the why, suggest rather than command, and distinguish must-fix from nice-to-have ({{ch:code-review-and-documentation}}).
- **Sponsor**: recommend people for interesting projects, mention their work to leaders, give them visible opportunities. Sponsorship changes careers more than advice does.
- **Create psychological safety**: people must feel safe to ask questions, admit mistakes and disagree — the foundation of learning teams.

## Two paths

### Level 4 — Individual contributor or manager?

| | Staff+ individual contributor | Engineering manager |
|---|---|---|
| Main focus | Technical direction, hard problems, architecture across teams | People: hiring, growth, performance, team health, delivery |
| Day-to-day | Designing, reviewing, writing, prototyping, coding some | One-to-ones, planning, hiring, stakeholder work, coaching |
| Success measured by | Technical outcomes and the effectiveness of engineers around you | The team's results, growth and wellbeing |
| You enjoy | Deep technical problems, influence through ideas | Helping people succeed, organisation, communication |

Management is **a different job**, not a promotion from senior engineering. Many companies have parallel ladders so that excellent engineers can grow without managing. Moving between the paths is possible — some engineers try management and return, often better at both.

### Level 4 — Staff-level work

Staff engineers typically work in a few recurring ways: as a **tech lead** for a large area, as an **architect** setting direction across teams, as a **solver** sent to the hardest problems, or as a **right hand** extending a senior leader's reach. Common activities:

- Writing technical strategy and vision documents that align teams.
- Leading cross-team designs and migrations ({{ch:microservices}}).
- Spotting systemic problems (reliability, developer productivity, security) and organising solutions.
- Raising engineering standards: reviews, design processes, incident practices.
- Sponsoring and developing other senior engineers.

## Managing your career

### Level 4 — Growth on purpose

- **Know the expectations**: read your company's ladder; ask your manager what the next level means in practice and where you stand.
- **Ask for feedback regularly**, not only at review time; act on it visibly.
- **Keep a brag document**: problems solved, impact (numbers when possible), people helped, decisions led. It makes promotion discussions and CVs far easier ({{ch:the-cv}}).
- **Seek scope**: volunteer for ambiguous problems, incidents, migrations, cross-team work; those build senior skills fastest.
- **Make work visible**: short written updates on outcomes, demos, design docs, internal talks — not self-promotion, but helping others know what is done.
- **Learn continuously but selectively**: depth in your core area, breadth around it; fundamentals outlast frameworks ({{ch:learning-and-ai}}).
- **Find mentors and sponsors** inside and outside your company.
- **Protect sustainability**: long hours are not a strategy; burnout ends careers. Consistent, focused work and rest outperform heroics over years.

## From beginner to enterprise

**Level 1–2 — growing yourself.** Understanding the ladder; owning tasks and features; asking good questions; learning from reviews; keeping a brag document.

**Level 3 — leading in a team.** Owning outcomes; designing before building; mentoring and reviewing to teach; acting as tech lead; influencing through clarity and trust.

**Level 4 — leading across teams.** Choosing the IC or management path; staff-level archetypes; technical strategy; sponsorship; growth on purpose.

**Level 5 — senior leadership.** Setting direction for an engineering organisation; developing leaders; shaping culture and processes.

**Level 6 — organisations.** Career frameworks, promotion processes and leadership development that let many engineers grow.

## Real-world use cases

### The senior engineer who stopped coding more

- **Story**: a strong mid-level engineer was frustrated not to be promoted despite closing the most tickets. Their manager suggested owning the team's on-call quality instead. Over two quarters they reduced pages by 70%, wrote runbooks, mentored two juniors through their first incidents and led the design of a safer deployment process. They were promoted — while writing less code than before.

### The influential staff engineer

- **Story**: three teams each built their own retry and timeout logic, causing an outage chain. A staff engineer wrote a two-page proposal for a shared resilience library, built a prototype with one team, measured the improvement and presented it. Within a quarter all three teams had adopted it — without any authority over them.

## Common mistakes

### Beginner: waiting to be told what to do

**Fix:** ask about goals; propose next steps; notice and raise problems.

### Beginner: hiding mistakes

**Fix:** report quickly and honestly — trust grows from how you handle mistakes.

### Intermediate: measuring yourself by tickets closed

**Fix:** measure outcomes and impact on the team.

### Intermediate: the "hero" pattern

**Consequence:** a team that cannot work without you, and burnout. **Fix:** share knowledge, document, delegate.

### Intermediate: reviews that judge instead of teach

**Fix:** explain reasoning; separate must-fix from preferences.

### Senior: winning arguments instead of building agreement

**Fix:** listen, write clearly, use evidence, disagree and commit.

### Career: moving into management for the title

**Fix:** choose the path by the work you want to do.

## Debugging and troubleshooting

When your career feels stuck:

- **Is the gap clear?** Ask your manager for specific examples of next-level behaviour you are missing.
- **Is your work visible?** Check whether decision-makers know your impact; share outcomes in writing.
- **Is your scope growing?** If every task is well defined, ask for an ambiguous problem.
- **Is the environment right?** Some teams have no room to grow; a move inside or outside the company may be the fix.
- **Are you burning out?** Reduce load and talk to your manager; sustainable growth beats sprints.

## Security summary

- **Leaders set the security culture**: making secure practices normal, rewarding people who raise risks, and never punishing honest reports ({{ch:application-security}}).
- **Own production responsibly**: incidents, access and secrets handled with care, setting an example.
- **Mentor on security** as part of code review and design review.

## How a senior engineer thinks about this

- **Impact over activity.** Outcomes for customers and the team matter more than hours or tickets.
- **Leverage through others.** The biggest contributions often come through people you help.
- **Clarity is leadership.** Writing and listening move organisations.
- **Trust is earned slowly and lost quickly.** Reliability and honesty are the foundation.
- **Careers are long.** Learn steadily, rest, and choose work you want to do for years.

## Exercises

### Exercise 1 — Map your next level

**Objective:** practise career planning.
**What to do:** write down three behaviours of the next level above yours, an example where you already show each, and one concrete opportunity to practise each in the coming months.

<details>
<summary>Show the solution</summary>

An example for a mid-level engineer aiming for senior:

1. **Designs before building** — example: wrote a short proposal for the export feature. Opportunity: write an RFC for the next significant project and ask two senior reviewers for feedback.
2. **Owns production quality** — example: fixed a recurring alert. Opportunity: join the on-call rotation and improve two runbooks.
3. **Multiplies others** — example: helped a new joiner set up the project. Opportunity: mentor the newest engineer through their first feature with weekly pairing sessions.

Share the plan with your manager and review it together regularly.

</details>

### Exercise 2 — Give feedback

**Objective:** practise feedback.
**The situation:** a junior engineer's pull requests are often very large, hard to review and arrive just before deadlines. Write the feedback you would give.

<details>
<summary>Show the solution</summary>

In private, specific and focused on impact and help:

"In the last three pull requests — the export, the filters and the invoice email — the changes were 1,500 to 2,000 lines and arrived the day before the deadline (situation and behaviour). That made them hard to review carefully, and we found bugs late (impact). Smaller pull requests of a few hundred lines, opened as drafts early, would get you faster feedback and fewer surprises. Shall we split your next task together and pair on the first one?"

Then follow up and notice publicly when it improves.

</details>

### Exercise 3 — Production scenario: the new tech lead

**Objective:** practise team leadership.
**The scenario:** you have just become tech lead of a team of five. Deployments are risky, two engineers often disagree in reviews, the product manager complains about missed dates, and you still have your own coding tasks. What do you do in your first months?

<details>
<summary>Show the solution</summary>

1. **Listen first**: one-to-ones with each engineer, the product manager and the engineering manager — goals, frustrations, ideas.
2. **Pick a few priorities**: safer deployments (automated tests, smaller releases, rollbacks — {{ch:cicd}}), predictable planning, healthier reviews.
3. **Planning**: break work into smaller pieces, give estimates as ranges, surface risks early; agree with the product manager on scope trade-offs ({{ch:engineering-decisions}}).
4. **Reviews**: agree team review guidelines (what blocks a merge, what is a preference); mediate the two engineers' disagreement by focusing on agreed standards.
5. **Your own work**: take tasks off the critical path, so your leadership work does not block the team.
6. **Make progress visible**: short regular updates on outcomes, and ask for feedback on your leadership.

</details>

## Summary

Engineering careers grow by **scope**, **ambiguity** and **leverage**: from well-defined tasks (junior) to features (mid-level), systems and team-wide quality (senior), and cross-team direction (staff and beyond). The step to senior means owning outcomes, designing before building, making explicit trade-offs, caring about production, multiplying others and communicating clearly.

Technical leadership mostly works **without authority**, through trust, clear writing, listening, prototypes and data, generous credit and well-chosen battles. Tech leads shape and sequence work, guard quality, facilitate decisions and unblock their teams, in partnership with product and engineering managers. Good mentors ask before telling, give specific feedback, delegate real problems, **sponsor** people and create psychological safety.

The **individual contributor** and **management** paths are different jobs; choose by the work you want, knowing you can move between them. Manage your career deliberately: understand expectations, ask for feedback, keep a **brag document**, seek scope, make work visible, learn steadily, find mentors and sponsors, and keep a sustainable pace.

## Key terms

- **Technical leadership** — Guiding a team's technical direction and effectiveness.
- **Individual contributor** — An engineer whose role is technical rather than people management.
- **Career ladder** — A framework describing levels and expectations.
- **Scope** — The size and breadth of the problems someone owns.
- **Impact** — The difference someone's work makes to outcomes.
- **Leverage** — Achieving impact through others and systems, not only personal output.
- **Tech lead** — The engineer leading a team's technical work.
- **Staff engineer** — A senior individual contributor leading across teams.
- **Engineering manager** — A manager responsible for people, team health and delivery.
- **Influence** — Changing outcomes through trust and persuasion.
- **Mentoring** — Advising and teaching another person.
- **Sponsorship** — Actively creating opportunities for someone.
- **Psychological safety** — A team climate where people can speak up without fear.
- **Brag document** — A personal record of achievements and impact.
- **Technical strategy** — A written direction for how technology will meet goals over time.

## What comes next

Part XIII turns to a technology reshaping software work: large language models. The next chapter, {{ch:llm-fundamentals}}, explains what LLMs are, how they produce text, tokens and context windows, their strengths and failure modes, and how to call them from code.
