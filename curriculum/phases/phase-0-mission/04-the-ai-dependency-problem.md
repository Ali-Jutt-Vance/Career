# Phase 0 — Chapter 4: The AI Dependency Problem

> *"The tool is not the problem. The problem is what the tool let you skip."*

---

## Chapter Overview

This chapter is about the specific thing that happened to you over the last three years, why it happened, why it was not a moral failure, and exactly how it gets undone.

It is placed at the front of the book, before any code, because everything that follows depends on it. If you carry the old habit into week one, you will read every chapter, tick every box, and arrive in December no more able to write code under observation than you are today. The plan will have run and nothing will have changed. That is the failure mode this chapter exists to prevent.

Read it slowly. It is not a lecture and it is not an accusation. It is a diagnosis, and a diagnosis is good news, because an undiagnosed problem cannot be treated.

## What actually happened

Here is the sequence, and it is worth reading because you almost certainly think it was unique to you.

You joined a small company. The work was mostly maintenance: existing PHP, existing AngularJS, tickets that said "the report is wrong" or "add a field to this form". Nobody sat with you. Nobody reviewed your code line by line and explained why a particular approach was wrong. There was no senior engineer whose habits you could absorb by watching. There was a deadline, a codebase you did not write, and you.

Then a tool arrived that could produce working code from a description of the problem.

From that point the incentives were completely one-sided. Writing the function yourself took forty minutes, produced something that worked, and taught you something. Asking the tool took ninety seconds, produced something that worked, and taught you nothing. **Both paths closed the ticket.** Nobody at your company could tell the difference between the two, because nobody was looking at how the work was done — only at whether it was done.

So you took the ninety-second path. Not once. Every day, for three years, several times a day, because it was the rational choice every single time you made it.

That is the whole mechanism. There is no character flaw in it anywhere. You optimised correctly for the environment you were in. The problem is that the environment was measuring the wrong thing, and you have now discovered — painfully, and probably in an interview — that the market measures something else.

### Why it feels so much worse than it is

Two things make this feel like a catastrophe rather than a gap.

The first is that the damage is invisible until it is tested. You can read code fine. You can debug a familiar system fine. You can talk about architecture fine. Nothing in your daily work reveals the gap, so you did not know it was growing. Then someone shares a screen and says "write a function that returns the second-largest number in an array" and your mind is completely blank, and the size of that gap arrives all at once, in front of a stranger, in a single moment. Of course that felt like a verdict on your intelligence. It was not. It was one specific untrained skill failing under load.

The second is the comparison you are making. You are comparing yourself to an imaginary three-year engineer who spent those three years at a company with code review, mentorship, and hard problems. That person exists, and they are ahead of you. But you are not comparing yourself to the actual distribution of three-year engineers in this market, which includes an enormous number of people in exactly your position, most of whom have not noticed yet and are not doing anything about it.

You noticed. That is not nothing — it is the entire prerequisite.

## What you actually have

Before the rebuild, an honest inventory of the assets, because you are discounting all of them right now.

**Three years of shipping context.** You have seen software go to production. You have watched a deploy fail on a Friday. You have dealt with a client changing requirements halfway through. You have worked inside a codebase you did not write and could not fully understand. None of that is available to a fresh graduate, no matter how many algorithm problems they have solved, and interviewers who have hired graduates know exactly how much it costs to teach.

**Legacy system experience.** PHP and AngularJS are not fashionable, and that is irrelevant. What matters is that you have maintained a system somebody else built, under constraints you did not choose. A large share of real engineering work is exactly that, and most candidates have only ever built greenfield toy projects where every decision was theirs.

**A working mental model of the web.** Requests, responses, forms, sessions, databases, deployment, the browser. You already know how a web application is shaped. When you learn Node, you are not learning what a server is — you are learning a new way of writing one. That is a fundamentally smaller task than it feels like, and it is why the plan can move as fast as it does.

**Two real certifications.** The IBM Full Stack JavaScript certificate and AWS Cloud Practitioner. On their own, certificates are weak signals — everyone knows they can be passed by memorising. But a certificate *plus* a deployed system using that technology is a strong combination, because it proves the vocabulary was attached to something real. Week 12 exists specifically to attach the AWS certificate to a running architecture.

**And the thing nobody else has:** three years of intensive, daily experience with what these tools can and cannot do. That is genuinely valuable, and by week 13 of this plan you will be building with it rather than hiding it.

## The three specific skills that atrophied

"I can't code" is not a diagnosis, it is a feeling. Here is what actually degraded, precisely, because each one has a different treatment.

### 1. Cold generation

This is the ability to produce code from an empty file. Not to recognise correct code, not to modify existing code, but to sit in front of nothing and generate something.

It is a distinct skill with its own memory. When you delegate it for long enough, the retrieval path weakens the way any unused path weakens. This is why you can read a solution and think "yes, obviously" and still be unable to produce it thirty seconds later. Recognition and generation are different operations, and only one of them has been running.

**Treatment:** volume of unaided production. Not reading, not watching, not understanding. Producing. This is why weeks 1 through 8 forbid AI entirely, and why every single night block in those weeks says *write it yourself*.

### 2. Sitting with not knowing

This is the harder one, and it is the one people underestimate.

Every engineer who learned before these tools has thousands of hours of experience being stuck — genuinely stuck, for twenty minutes or an hour or an afternoon — and pushing through anyway. That experience builds two things: a set of debugging strategies, and a tolerance for the discomfort of not knowing. The tolerance is the important half. Being stuck is the normal state of engineering work, and someone who has never learned to sit in it will reach for an escape the moment it starts.

For three years you have had an escape available within one second of feeling that discomfort. So the tolerance never built. Now, when you get stuck, the feeling is not "this is normal, let me work through it" but "something is wrong with me".

**Treatment:** deliberate, bounded struggle. The rule in this book is twenty minutes. When you are stuck, you sit with it for twenty minutes before you look anything up. Most of the time you will solve it in eight. The other times, you will have understood the problem well enough that the answer actually teaches you something instead of just closing the ticket.

### 3. Speaking while thinking

Every interview you will sit requires you to code while narrating your reasoning to another person. This is not a natural act. It is a performance skill, and it is trained separately from coding itself.

You have never done it. Three years of solo work in a small company with no code review means you have almost certainly never explained a technical decision to a peer who was evaluating it. So even on a problem you can solve, the requirement to talk while solving consumes attention you need for the problem, and you fail a question you would have passed alone.

**Treatment:** talking out loud, on purpose, while coding, from week one — long before any interview. The plan schedules it as a distinct activity because it is a distinct skill. It will feel absurd to narrate your thinking to an empty room. Do it anyway. The absurdity wears off in about four sessions, and what remains is the ability to think in speech, which is what the interview actually measures.

## The rule: eight weeks, no assistance

From day one until Monday 2 November, **no AI writes code for you**. Not a function, not a snippet, not a regular expression, not a "just this once because I am tired".

The boundaries, stated precisely so you cannot negotiate with yourself later:

**Allowed.** Official documentation. The book in front of you. Language reference material. Error messages, read carefully. Your own earlier code. A search engine used to find documentation, which is different from a search engine used to find a finished answer.

**Not allowed.** Any AI tool producing code. Autocomplete that suggests more than the current identifier. Copying a complete solution from a forum or an article. Asking anyone else to write it for you.

**Allowed with a condition.** After you have genuinely attempted something and failed — twenty minutes minimum, with a written note of what you tried — you may ask an AI to *explain a concept*, in the abstract, without reference to your code. "How does the dependency array in an effect hook decide whether to re-run?" is allowed. "Here is my component, fix it" is not.

### Why eight weeks

Long enough for the discomfort to pass and the reflex to rebuild — the change in how it feels typically arrives somewhere in weeks three to five. Short enough that you are not handicapping yourself for the whole plan, because in the second half you need the leverage back to ship two projects.

The date is fixed. It is not "when I feel ready", because you will not feel ready, and a rule with a feeling as its condition is not a rule.

### What happens when you break it

You will, at least once. Probably at 22:15 on a Thursday when something has not worked for an hour and you have work in the morning.

Write it in the log. Not as self-flagellation — as data. What was the task, how long had you been stuck, what time was it, how tired were you? After three or four of these you will see the pattern, and the pattern is almost always about energy and time of day rather than difficulty. That tells you something actionable: move the hard building earlier, or shorten the session, or accept that Thursday nights are for review rather than construction.

One breach recorded honestly is worth more than a perfect record you have quietly edited.

## What comes back on 2 November

On Monday 2 November, week 9, AI returns — permanently, and under a contract you write yourself in the log that morning.

The contract has one clause that matters:

> **You must be able to explain, unaided, every line of code in your repository.**

That single rule preserves everything the eight weeks bought you, because it makes the useful uses comfortable and the harmful ones impossible.

What it permits, and what senior engineers actually do:

- **Review.** "Here is my authentication middleware. What are the security problems with it?" You wrote it; the tool critiques it. This is genuinely valuable and it is the closest thing to code review you have ever had access to.
- **Explanation.** "Why does Postgres choose a sequential scan here?" Learning, on demand, at the exact moment of confusion. This is the best thing these tools do.
- **Boilerplate you have written before.** The tenth Dockerfile, the fifth validation schema. Once you can produce something from scratch, having it produced for you is leverage rather than substitution. The order matters absolutely: competence first, then automation.
- **Naming, wording, and documentation.** Zero risk, real time saved.

What it forbids permanently:

- Generating code that solves a problem you have not yet understood.
- Accepting anything you could not defend line by line in an interview tomorrow.
- Reaching for it inside the twenty-minute window, which stays in force for the rest of the plan and, if you are sensible, for the rest of your career.

There is a symmetry in this plan worth noticing now. The habit that put you here is, by week 13, the subject of the project that will most distinguish you — a retrieval system you build yourself, with an LLM as a component you understand rather than a crutch you lean on. When an interviewer asks about it, you will have a genuinely strong answer: *I used these tools as a substitute for thinking for three years, I spent eight weeks rebuilding without them, and now I build systems with them.* Told plainly, that story is more impressive than never having had the problem, because it demonstrates something rarer than talent, which is the willingness to look at your own work honestly and fix it.

## The honest timeline

Because false expectations are the other way this fails.

**Weeks 1 to 2 — bad.** Everything takes four times longer than it used to. You will write code that is worse than what the tool produced. You will feel, viscerally, that you are wasting time. This is the most likely quitting point, and it is also completely universal. Nothing has gone wrong.

**Weeks 3 to 5 — the turn.** Something you would have delegated in week 1, you do without noticing. The twenty-minute rule starts producing solutions rather than frustration. Speed is still poor; the difference is that the blankness is gone.

**Weeks 6 to 8 — usable.** You can sit at an empty file and produce a working solution to a medium-difficulty problem. Not quickly, not elegantly, but reliably. This is the point at which you stop being afraid of a live coding round, which is worth more than the skill itself.

**Weeks 9 to 16 — compounding.** With the tools back under a rule, you are faster than you ever were before, because now you can tell when the output is wrong. That is the actual end state, and it is strictly better than where you started three years ago.

## Self Assessment

Answer these in writing, in LOG.md, today. Not in your head — in writing, where you can reread them in December.

- In the last three months of work, name one function you wrote entirely yourself. If you cannot, write "none". That is the honest baseline and it is the point of the exercise.
- When you get stuck, how many seconds pass before you reach for help? Estimate honestly.
- Have you ever explained a technical decision out loud to another engineer who was evaluating it? When?
- What is the most complex thing you understand well enough to redraw on a whiteboard from memory?
- Which of the three atrophied skills — cold generation, sitting with not knowing, speaking while thinking — is worst for you? Be specific, because your weakest one needs extra attention in the drills.
- What will you do at 22:15 on the night you are stuck and exhausted and the rule is in the way? Decide now, in writing, while you are calm.

## Cheat Sheet

- **The cause was environmental, not personal.** No review, no mentorship, a tool that closed tickets. You optimised correctly for a system that measured the wrong thing.
- **Three specific skills atrophied:** cold generation, tolerance for being stuck, and speaking while thinking. Each is separately trainable.
- **Weeks 1–8: no AI writes code.** Documentation and this book are allowed. Concept explanations are allowed *after* twenty minutes of genuine attempt.
- **The twenty-minute rule:** stuck means stuck for twenty minutes before you look anything up. It stays in force permanently.
- **2 November: AI returns as reviewer, never as author.** The permanent test is whether you can explain every line in your repository unaided.
- **Weeks 1–2 will feel like going backwards.** They are not. Everybody who does this feels that, and it turns somewhere around week 4.
- **Record every breach in the log as data, not as guilt.** The pattern in the breaches is more useful than a clean record.
- **You are not a beginner.** You are three years in with a hollow middle, and a hollow middle fills faster than an empty one.
