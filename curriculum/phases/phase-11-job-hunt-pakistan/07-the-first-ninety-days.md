# Phase 11 — Chapter 7: The First Ninety Days

> *"The job is not the outcome. The job is the environment that decides what you are worth in three years."*

---

## Chapter Overview

This chapter exists because of a specific risk, and it is worth naming bluntly: **you could do everything in this book, sign a good offer, and then repeat the last three years at a better company.**

The mechanism that produced your current position was not PHP and it was not the salary. It was an environment with no review, no seniors, and no standards, combined with a habit of reaching for a tool instead of understanding a problem. A new job removes the first half automatically. It does not remove the second half. Habits travel.

So this chapter is about the ninety days after you start: how to arrive, how to use code review, how to be someone who compounds rather than plateaus, and what to do in the second year so that the next move is upward rather than sideways.

Read it in week 16, whether or not an offer exists yet. If one does, it is your plan. If one does not, it is a reminder of what you are aiming at.

## Before you start

**Serve your notice properly.** Finish what you can, document what you cannot, and hand over cleanly. Pakistan's engineering market is small and reputations travel further than people expect. The developer you leave behind may interview you in four years.

**Write the handover document your successor will need.** Nobody will ask you to. Do it anyway — it takes a day and it is the last thing anyone at that company will remember about you.

**Take a break if the timing allows it.** Even three or four days. You will have run sixteen weeks at twenty-eight hours a week on top of a full-time job, and starting a new role already depleted is a bad opening.

**Do not stop building in the gap.** Two weeks of nothing is fine; four weeks is where the reflex you spent eight weeks rebuilding starts to soften. Keep a small daily habit going.

## Days 1–30: understand before you change

The most common new-starter mistake is arriving with opinions. The second most common is arriving silent and afraid to ask anything.

**Ask questions constantly, and write down the answers.** The first month is the only period where "I don't know what that means" carries no cost at all. Every question you swallow in month one becomes a thing you pretend to know in month six. Keep a running document of terminology, systems, people and acronyms — it will be forty pages by day thirty and you will reread it.

**Learn the codebase by fixing small things.** Ask for the smallest bugs available. A tiny fix teaches you the build, the test suite, the review process, the deployment pipeline and the people, all at once, and it does it in a low-risk way.

**Ship something in week one.** Anything, however small. It establishes momentum for you and confidence in you, and both are easier to establish than to recover.

**Map the people.** Who knows which part of the system. Who reviews what. Who makes decisions. Who is generous with their time — that person is the most valuable relationship in your first year, and every good engineering team has one.

**Say nothing critical about the codebase.** You will see things that look wrong. Some of them are wrong; many have a history you do not yet know. Write them in your own notes and raise them at ninety days, when you have earned the standing and have the context.

## Days 31–60: use the code review

This is the part that matters most, because code review is the thing whose absence created your gap, and it is now available for the first time.

**Treat every review comment as free teaching.** In your last three years, nobody told you your code was wrong. Now someone will, in writing, several times a week. That is not criticism; it is the single most efficient learning mechanism in software, and you have three years of it to catch up on.

**Ask why, not just what.** When a reviewer says "use a transaction here", do not simply comply. Ask what specifically goes wrong without it. The answer is worth more than the change, and reviewers almost always enjoy explaining.

**Review other people's code, early and often.** This feels presumptuous when you are new and it is the fastest way to learn a codebase and a team's standards. You do not need to find defects. Asking "why this approach rather than X?" is a completely legitimate review comment and it teaches you more than reading the code silently.

**Notice the patterns in your own reviews.** If three different people flag your error handling, that is a real gap and it is being handed to you for free. Write the recurring themes in your log and work on them deliberately.

**Keep the AI contract in force.** The same rule from week 9 of this plan applies permanently and it matters more now, not less: you must be able to explain every line you submit. The difference is that now someone will actually check. Submitting a review with code you cannot defend is the fastest way to lose credibility on a new team, and it is a very easy trap to fall into in month two when you are trying to look fast.

## Days 61–90: start contributing beyond your tickets

By now you know the codebase, the people and the process. This is where a good engineer separates from an adequate one, and the difference is small and specific.

**Take one thing nobody owns.** Every codebase has something everyone complains about and nobody fixes — a slow test suite, a flaky deployment step, missing documentation, a manual process. Fix it. This is the highest-return action available to a new engineer, because it is visible, it is appreciated, and it is entirely within your control.

**Write things down.** Document what confused you when you arrived. Write the onboarding note you wish you had. This costs a few hours and creates a reputation that lasts years.

**Volunteer for the thing you are worst at.** If you have avoided the frontend, take a frontend ticket. If you have never touched the deployment pipeline, ask to. The instinct is to specialise in what you are already good at, and it is the instinct that produces a plateau.

**Ask for feedback explicitly at ninety days.** Not "how am I doing?" — that produces "fine". Ask: *"What is the one thing I should be doing differently? And what would I need to demonstrate to be considered for the next level?"* Both answers are actionable and most managers will give them honestly if asked directly.

## The habits that prevent a repeat

Six, and they are the entire point of the chapter.

**1. Never merge code you cannot explain.** The permanent rule. It is what separates using a tool from being used by one.

**2. Keep the twenty-minute rule.** Stuck means stuck for twenty minutes before you reach for help — including asking a colleague. Then ask, because asking after genuine effort is a strength and asking immediately is a habit.

**3. Build something outside work, continuously.** A small project, a contribution, anything. Work code alone narrows you to whatever your employer needs. This is also what keeps your CV alive between jobs.

**4. Learn one substantial thing a quarter, deliberately.** Not passively absorbed — chosen, studied and applied. Four a year is twelve in three years, and that is the difference between three years of experience and one year repeated three times.

**5. Keep a work log.** One line a day on what you did and what you learned. It takes ninety seconds and it makes your review conversations, your CV updates and your interview stories trivial to write. Everyone who does this finds it disproportionately useful.

**6. Stay interviewable.** Refresh your CV every six months whether or not you are looking, and take an interview once a year even when you are happy. It calibrates your market value and keeps the skill from rusting. The engineers who get stuck are the ones who have not interviewed in five years and no longer know what they are worth.

## The second year, and where this goes next

Twelve to eighteen months at a Tier 2 company, doing real engineering with real review, changes your position materially. At that point three routes open.

**Senior at the same company.** The path of least friction if the company is genuinely good. Ask at ninety days what the criteria are, then work to them explicitly.

**Tier 1, or a foreign product company's Pakistan office.** With a recognisable company on your CV and two years of reviewed production work, the interview that is out of reach today becomes reasonable. This is where the algorithmic preparation you deliberately skipped becomes worth doing properly.

**International remote.** The largest financial step available — typically two to five times a strong local salary — and the natural destination given what you will have built. It wants a recognisable employer, strong English, a real portfolio, and timezone overlap. Chapter 9 covers it, and the honest sequencing is that it becomes much easier after the Tier 2 job, not before it.

All three of these are available in two years. None of them are available today. That is the actual reason the sixteen weeks matter — not the salary in December, but the fact that December puts you somewhere that compounds.

## Interview Preparation

**"What would your first ninety days here look like?"**

Asked in manager rounds, and most candidates answer with generalities. A specific answer stands out: *"First month, mostly questions and small fixes — I want to learn the codebase by touching it rather than reading it, and understand how you deploy and review. Second month, taking normal tickets and reviewing other people's code, because that's the fastest way to learn a team's standards. By the third month I'd want to have taken ownership of something nobody currently owns."*

**"How do you handle critical code review feedback?"**

Your honest answer is unusually strong here: *"I've had almost none, which is one of the reasons I'm leaving. I was the sole developer for three years with nobody reviewing my work, and I think it slowed me down considerably. Review is one of the things I'm actively looking for."* That answer is candid, it explains a gap, and it describes someone who will use the environment rather than resent it.

**"Where do you see yourself in two years?"**

Be concrete and connect it to them: *"Senior, and genuinely deep in one area rather than shallow across many — most likely backend and data, since that's where I've found the work most interesting. I'd want to be the person others ask about that part of the system."*

## Self Assessment

At ninety days in the new role:

- How many questions did I ask in month one, and how many did I swallow?
- Have I submitted any code I could not explain line by line?
- What are the recurring themes in my code review comments?
- Have I taken one thing nobody owns?
- Have I asked directly what I need to demonstrate for the next level?
- Am I still building something outside work, or has that stopped?

## Cheat Sheet

- **The risk is repeating the last three years at a better company.** The environment changes automatically; the habits do not.
- **Days 1–30:** ask everything, write it down, fix small things, ship in week one, map the people, criticise nothing.
- **Days 31–60:** use code review as free teaching. Ask *why*, review others' code, track the recurring themes in your own.
- **Days 61–90:** take one thing nobody owns. Write documentation. Volunteer for what you are worst at. Ask directly for feedback and level criteria.
- **Six permanent habits:** never merge what you cannot explain · twenty-minute rule · build outside work · one substantial thing a quarter · a daily work log · stay interviewable.
- **Serve your notice properly.** The market is small and reputations travel.
- **In two years this opens three doors** — senior internally, Tier 1, or international remote. None of them are open today. That is what December is actually buying.
