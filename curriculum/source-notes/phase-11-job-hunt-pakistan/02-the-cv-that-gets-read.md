# Phase 11 — Chapter 2: The CV That Gets Read

> *"Nobody reads your CV. They scan it for eight seconds, decide, and then read it only if the decision was yes."*

---

## Chapter Overview

Your CV is the highest-leverage document you own, because it is the gate everything else sits behind. A strong candidate with a weak CV gets no interviews and concludes the market rejected them. That is the position you have probably been in.

This chapter rebuilds it. It covers what a reviewer actually does in the first eight seconds, the specific faults that sink most Pakistani CVs, how to write about three years of maintenance work honestly and well, and what to do about the fact that your best evidence does not exist yet.

By the end of week 3 this document must be finished, because applications open on 28 September and every application sent with a weak CV is a shot wasted at a company you cannot easily reapply to.

## What actually happens to your CV

A recruiter or engineering manager has forty CVs and an hour. Yours gets somewhere between six and fifteen seconds in the first pass.

In those seconds they are looking for four things, in this order:

1. **Does the current or most recent role look roughly like the role being hired for?**
2. **How many years, and is there a gap or a pattern of very short tenures?**
3. **Do the technologies match the advert?**
4. **Is there anything concrete — a number, a link, a project?**

That is the whole first pass. Everything else on the page is read only after a "maybe", and only for about ninety seconds.

This has three direct consequences for how the document is built. The top third of page one carries almost all the weight. Anything a scanner cannot extract in seconds does not exist. And a link they can click — a live project, a GitHub profile — is worth more than a paragraph, because it converts a claim into something checkable.

## The five faults that sink most CVs here

In roughly the order of how much damage they do.

**1. More than one page.** With three years of experience, two pages signals that you cannot judge what matters. One page, always, until you have eight or more years. The discipline of cutting is itself the signal.

**2. Bullets that describe duties instead of outcomes.** This is the most common and the most expensive fault.

> ~~"Responsible for developing and maintaining web applications using PHP and AngularJS."~~

That sentence describes a job description, not a person. Every candidate for the same role could have written it. Compare:

> "Reduced the monthly billing report from 40 seconds to under 3 by rewriting the query and adding two composite indexes, on a PHP/MySQL system serving ~2,000 users."

The second sentence contains a problem, an action, a measured result and a context. It could only have been written by the person who did it, and it invites a follow-up question you can answer well.

**3. A wall of technologies.** Fourteen technologies listed flat, with no indication of depth, reads as either padding or as someone who has touched everything and knows nothing. Group them, and be honest about levels.

**4. An objective or summary full of adjectives.** "Passionate, hardworking, detail-oriented team player seeking a challenging role." This sentence appears on a third of the CVs in the pile and carries no information whatsoever. Either write a summary with facts in it, or omit the section entirely.

**5. A file named badly.** `cv-final-v3(2).pdf` arrives in an inbox next to forty others. Name it `Firstname-Lastname-Software-Engineer.pdf`. Send PDF, never Word, because Word documents reformat unpredictably on someone else's machine.

## The structure

One page, in this order. The order is not stylistic; it follows the eight-second scan.

**1. Name and contact.** Name, role title you are targeting, city, phone, email, LinkedIn URL, GitHub URL. Two lines. No photo, no address, no date of birth, no marital status — these are conventions on older Pakistani CV templates and they cost you space that should carry evidence.

**2. Summary — three lines, optional but useful for you.** Because your situation needs framing, a short factual summary earns its space here. Facts only:

> *Software engineer, 3 years, building and maintaining a PHP/AngularJS product for ~2,000 users. Rebuilt into modern JavaScript over 2026: two production applications shipped on Node, React, PostgreSQL and AWS — links below. AWS Cloud Practitioner certified.*

Three sentences, entirely verifiable, and it pre-empts the "why the stack change?" question before the reviewer has to form it.

**3. Projects — before employment.** This is unusual and, for you, correct. Your two built projects are stronger evidence of what you can do now than three years of maintenance work is, so they go higher. Each one gets:

- Name, one line on what it does, and the **live URL and repository link**
- The stack, named precisely
- Two or three bullets: something you designed, something you measured, something that was hard

> **SplitLedger** — shared expense tracking for groups. **live URL** · **repository link**
> Node · Express · PostgreSQL · React · Docker · AWS (EC2, RDS, S3)
> - Designed a 6-table normalised schema; settlement runs as a single transaction across 3 tables with rollback verified under induced failure.
> - Cut the group-summary endpoint from 380 ms to 45 ms by replacing an N+1 query pattern with a single join and a composite index.
> - Token authentication with refresh rotation and reuse detection; 34 integration tests running on every push via GitHub Actions.

Every one of those bullets survives a follow-up question, which is the only test that matters.

**4. Experience.** Reverse chronological. Company, title, dates. Then three or four outcome bullets — not eight. Section 4 below is entirely about how to write these when the work was maintenance.

**5. Skills.** Grouped and honest.

> **Languages:** JavaScript, TypeScript, SQL, PHP
> **Backend:** Node.js, Express, REST APIs, authentication, PostgreSQL
> **Frontend:** React, AngularJS, HTML, CSS, Tailwind
> **Infrastructure:** Docker, AWS (EC2, RDS, S3, IAM), GitHub Actions, Linux, Nginx

Do not list anything you could not survive ten minutes of questioning on. Every item on that list is an invitation, and an item you cannot defend costs you more than its absence would have.

**6. Education and certifications.** Two lines. Degree, institution, year. IBM Full Stack JavaScript Developer, AWS Certified Cloud Practitioner.

## Writing about three years of maintenance work

This is the part you are dreading, and it is more tractable than it feels.

The instinct is that you have nothing to write because you did not build anything impressive. But "maintenance" is a description of the context, not of the work. Inside three years of maintenance there were bugs you diagnosed, features you added, things that got faster, things that stopped breaking, and users who were affected. Those are outcomes, and they are what the bullets are made of.

### Find the outcomes

Sit with a blank page for thirty minutes and answer these, from memory and from your commit history:

- What was slow, that is now faster? By how much, approximately?
- What broke regularly, that stopped breaking?
- What did a person do by hand, that now happens automatically?
- What feature did you add that users actually use, and roughly how many people use it?
- What bug took you longest to find, and what was the cause?
- What did you change that made the codebase easier to work in?
- How big is the system — users, records, requests, tables? Any number gives scale.

You will find more than you expect. Three years of anything produces material; the problem is that you have never been asked to articulate it, so it has never been converted into language.

### Estimate honestly, do not invent

You probably did not measure anything at the time. That is normal and it is not a barrier.

Estimate, and mark it as an estimate: "reduced page load from roughly 6 seconds to under 2". "approximately 2,000 active users". "around 40 support tickets a month, down to fewer than 10". An interviewer will not challenge an approximation, and if they ask how you measured it, "I timed it before and after in the browser, informally" is a perfectly good answer.

What you must not do is invent scale you did not have. Claiming a million users on a system with two thousand will collapse the moment someone asks a follow-up question, and it will take everything else on the page down with it.

### Before and after

> ~~"Worked on bug fixes and new features for the company's web application."~~

Becomes:

> - Rebuilt the invoice generation flow that failed on ~15% of runs due to unhandled currency edge cases; failures dropped to zero over the following six months.
> - Added automated monthly report generation, replacing a manual process that took a colleague around 4 hours each month.
> - Maintained and extended a PHP/AngularJS system of ~60 screens serving approximately 2,000 users, working as the sole developer on the product.

That last bullet is worth noting: "sole developer" is a genuine strength and you should say it. It explains the absence of code review on your CV, and it demonstrates ownership.

## The gap between now and the evidence

There is an obvious problem in week 2: the projects section is empty, because the projects do not exist yet.

This is why the CV is built in two passes. The first pass, in weeks 2 and 3, is the version you send from 28 September — experience, skills, education, and whatever exists of the first project. It is honest and it is enough to start the funnel.

The second pass happens continuously. Every time something ships, the CV is updated the same week: the first API goes live in week 8, the full-stack application in week 10, AWS in week 12, the second project in week 13. By November you are sending a materially different document from the one you sent in September, and the December version bears almost no resemblance to the one that exists today.

Do not wait for the finished version before applying. The funnel needs the weeks more than the early applications need the perfect document.

## Tailoring, and how much is worth doing

Full rewrites for each application are not sustainable at twenty-five applications a week, and they are not necessary. Do this instead, in about four minutes per application:

- Read the advert and note the five technologies it names.
- Reorder your Skills section so those appear first.
- Adjust the summary's middle sentence to lead with whatever they emphasise.
- If they clearly want backend, put the project bullet about the schema and the transaction first; if frontend, lead with the React work.

That is enough. It moves the matching keywords into the top third of the page, which is where the scan happens, and it takes four minutes rather than forty.

## Applicant tracking systems

Larger companies run software that parses your CV before a human sees it. You do not need to game it, but you should avoid breaking it:

- No tables, no columns, no text inside images, no headers or footers carrying important information.
- A standard font and standard section headings — "Experience", "Education", "Skills".
- PDF, generated from a text document rather than exported from a design tool.
- Use the exact technology names from the advert. "Node.js" and "NodeJS" may not match the same search.

A visually elaborate CV is a liability rather than an asset here. Plain, clean, and machine-readable wins.

## Interview Preparation

**"Walk me through your CV."**

Usually the first question, and the answer should take ninety seconds, not five minutes. The structure that works: one sentence on where you started, one on what you did for three years, two on what you built recently and why, and one on what you are looking for. Then stop talking. Candidates lose this question by narrating their entire history chronologically until the interviewer interrupts.

**"You have three years but I don't see much building. What did you actually do?"**

Answer it directly rather than defensively, and get to the projects fast. *"For three years I was the sole developer on a legacy PHP and AngularJS product — mostly maintenance and incremental features, with no code review and no seniors. I learned a lot about maintaining a system I did not write, but I was not growing. So over the last four months I rebuilt my fundamentals in Node, React and PostgreSQL, and built two applications end to end — here is the first one, and I can walk you through any part of it."*

That answer is honest, it does not apologise, and it hands them something concrete to ask about.

**"Which of these technologies do you know best?"**

Answer honestly and specifically, and volunteer the edge of your knowledge. *"PostgreSQL, comfortably. I can design a normalised schema, read a query plan, and I have done real index work with measured before-and-after numbers. Docker I am solid on for building and composing; I have not run anything in production orchestration."* Naming your own limit makes everything else you claim more credible, and every experienced interviewer knows this.

## Self Assessment

- Is my CV exactly one page? Count it.
- Does every experience bullet contain a verb and a result, or do some describe duties?
- Is there a single number anywhere on the page? There should be several.
- Are the live project links at the top, above employment?
- Could I survive ten minutes of questioning on every item in my skills list? Delete anything I could not.
- Is the file named with my name and role, and is it a PDF?

## Cheat Sheet

- **One page. PDF. Named `Firstname-Lastname-Software-Engineer.pdf`.**
- **Eight seconds, top third of the page.** That is the whole first pass.
- **Projects go above employment,** because they are your strongest current evidence.
- **Every bullet: verb, what you did, what changed.** Duties are worthless; outcomes are everything.
- **Estimate honestly and say "approximately".** Never invent scale — one follow-up question destroys it.
- **"Sole developer" is a strength.** It explains the missing code review and demonstrates ownership.
- **No photo, no date of birth, no marital status, no objective full of adjectives.**
- **Skills list is an invitation.** Remove anything you cannot defend for ten minutes.
- **Tailor in four minutes:** reorder skills to match the advert, adjust one summary sentence, lead with the relevant project bullet.
- **Update the CV the same week anything ships.** The December version should not resemble the September one.
