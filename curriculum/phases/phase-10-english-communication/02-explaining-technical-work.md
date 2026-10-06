# Phase 10 — Chapter 2: Explaining Technical Work

> *"If you cannot explain it simply, the gap is not in your vocabulary. It is in your understanding."*

---

## Chapter Overview

There is a specific skill that separates engineers who get promoted from engineers who do not, and it has nothing to do with code: the ability to explain something technical to someone who does not share your context. A manager, a client, a colleague from another team, an interviewer who has not seen your codebase.

It is also a diagnostic tool you can use on yourself. Explaining forces you to make every implicit thing explicit, and the place where the explanation breaks down is precisely where your understanding is thin. This is why the plan asks you to explain things aloud from week 1 — not because you will need it in an interview in December, but because it will show you, tonight, what you do not actually know.

## Adjust the level, always

The single most common failure is explaining at your own level regardless of who is listening. Three levels, and you should be able to move between them deliberately.

**To another engineer on your team.** Jargon is fine; it is precision, not showing off. *"The endpoint was doing an N+1 — one query for the groups, then one per group for the members. Replaced it with a single join and added a composite index on (group_id, created_at)."*

**To an engineer who does not know your system.** Same content, but define the specifics of your world. *"We had a page listing expense groups. For each group it was making a separate database call to fetch the members, so twenty groups meant twenty-one queries. I replaced it with one query that joins the two tables, and added an index so the join is fast."*

**To a non-technical person.** No jargon at all. Analogy, then the outcome. *"The page was asking the database twenty-one separate questions instead of one, which is like going to the shop twenty-one times instead of writing a list. I changed it to ask once. The page went from four seconds to under half a second."*

The test of whether you can do this: try the third version out loud, right now, on your own project. Most engineers cannot, and discovering that is the point.

## The structure that always works

**What it is → why it exists → how it works → when it breaks.**

Applied to something you will certainly be asked about:

> *"A JSON Web Token is a signed piece of data that proves who a user is."* (what)
> *"It exists so the server doesn't have to store a session for every logged-in user — the token itself carries the identity, so any server can verify it without a database lookup."* (why)
> *"It has three parts: some metadata, the data itself, and a signature made with a secret key. The server checks the signature to know the data hasn't been altered."* (how)
> *"The trade-off is that you can't easily cancel one. Once it's issued it's valid until it expires, so if it's stolen you can't just delete it the way you'd delete a session. That's why you keep them short-lived and use a refresh token you can revoke."* (when it breaks)

That fourth part is what makes the answer senior. Anyone can describe what something is. Describing when it fails proves you have used it and thought about it.

## Analogies — useful, and easy to overuse

A good analogy makes an unfamiliar thing familiar in one sentence. A bad one creates a wrong model that has to be corrected later.

Useful and accurate:

- **An index** is the index at the back of a book. Without it you read every page to find a topic. It also makes the book bigger and it has to be reprinted when the content changes — which is exactly why an index speeds up reads and slows down writes.
- **A cache** is keeping the things you use most on your desk instead of in the filing cabinet. Fast, until the filing cabinet copy changes and yours is out of date.
- **A transaction** is a bank transfer. Money leaves one account and arrives in the other, or neither happens. Never one without the other.
- **A load balancer** is the person at the front of a queue directing people to whichever till is free.

**The rule:** use one analogy, then return to the real mechanism. An explanation made entirely of analogies signals that you only understand the analogy.

## Explaining what went wrong

A distinct skill and one you will use constantly at work, in status updates and in incident conversations. There is a structure, and it keeps you from sounding either defensive or disorganised.

> **What happened → impact → cause → fix → prevention**

*"The report endpoint was returning a 500 for about forty minutes this morning. Around thirty users would have seen an error page. The cause was a migration that added a NOT NULL column without a default, so existing rows failed validation. I rolled the migration back and the endpoint recovered. I've added a check to the deployment step that runs migrations against a copy of production data first."*

Calm, complete, no blame, and it ends on what stops it recurring. That last part is what distinguishes a professional account from an apology.

## Explaining a decision

You will be asked "why did you choose X?" constantly, in interviews and in reviews. The answer is not a list of features. It is a comparison.

> **What I chose → what I compared it against → the deciding factor → what I gave up**

*"I used PostgreSQL rather than MongoDB. The data is highly relational — groups, members, expenses, settlements all reference each other — and I needed transactions for the settlement operation, which has to update three tables atomically. Mongo could have done it, but I'd have been managing consistency in application code. What I gave up is schema flexibility; every change now needs a migration, which has been slightly slower to work with."*

**Naming what you gave up is the whole trick.** A decision with no cost was not a decision. Interviewers are specifically listening for whether you understand that.

## Practising this

**The explain-to-nobody habit.** At the end of every study block, explain what you just learned out loud, to an empty room, in two minutes. Where you stall is where your understanding is thin. This costs two minutes and it is the highest-value diagnostic in the plan.

**The non-technical test.** Once a week, explain what you built to someone with no technical background — a family member, a friend. If they can repeat it back roughly correctly, you understand it. If their eyes glaze, you do not, or you are hiding behind vocabulary.

**Write it, then say it.** For anything you will be asked about in an interview, write the four-part explanation down first. Writing forces precision; speaking then has something to follow.

## Interview Preparation

**"Explain how authentication works in your project."**

Use the four-part structure. What it is, why you chose that approach, how the flow runs, and what it costs. Draw it if there is a whiteboard — a diagram makes a two-minute answer clearer than four minutes of speech.

**"Explain [any technology] to me as if I don't know it."**

Genuinely common, and it is testing exactly the level-adjustment skill in this chapter. Do not simplify by removing accuracy; simplify by removing jargon and adding one analogy. Then check: *"Does that level work, or would it help to go deeper?"* Asking that question is itself a strong signal.

**"Why did you choose this over that?"**

Chosen, compared, deciding factor, what you gave up. If you have no comparison, say so honestly: *"I chose it mainly because it's what I knew — if I were choosing now I'd weigh it against X, and the deciding factor would probably be Y."* That is a much better answer than a fabricated justification, and interviewers can tell the difference.

## Self Assessment

- Can I explain my main project to a non-technical person in under a minute?
- For the last decision I made in code, can I name what I compared it against and what I gave up?
- Where did I stall the last time I explained something aloud? That is my thin spot.
- Do I use analogies and then return to the mechanism, or do I stop at the analogy?

## Cheat Sheet

- **Three levels: peer · engineer outside your system · non-technical.** Choose deliberately; failing to adjust is the most common fault.
- **The universal structure: what it is → why it exists → how it works → when it breaks.** The fourth part is what sounds senior.
- **One analogy, then return to the real mechanism.**
- **Explaining a failure: what happened → impact → cause → fix → prevention.** No blame, end on prevention.
- **Explaining a decision: chosen → compared → deciding factor → what I gave up.** A decision with no cost was not a decision.
- **Explain aloud to an empty room after every study block.** Where you stall is what you do not know.
- **The non-technical test once a week.** If they can repeat it back, you understand it.
