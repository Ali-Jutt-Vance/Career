# Phase 10 — Chapter 10: Presenting a Design

> *"In a system design round they are not marking the architecture. They are marking whether you can be reasoned with."*

---

## Chapter Overview

The system design round is a communication exercise disguised as a technical one. There is no correct answer, the interviewer usually has no fixed solution in mind, and two candidates can produce completely different designs and both pass.

What is being scored is how you get there: whether you clarify before you draw, whether you can hold a structure over forty-five minutes, whether you name trade-offs instead of pretending there are none, and whether you are the kind of person a team can design something with.

This chapter is about the presentation half. Phase 7 covers the technical content — the components, the scaling patterns, the worked examples. Read them together in week 15.

## The structure, and why it carries most of the marks

Follow this visibly. Say the headings out loud as you move between them, so the interviewer can hear the structure rather than having to infer it.

**1. Clarify the requirements — five minutes, genuinely.**

This is the part candidates skip, and skipping it loses more marks than any technical error. Ask:

- What does it actually need to do? What is explicitly out of scope?
- Who uses it, and roughly how many?
- Is it read-heavy or write-heavy?
- How fresh does the data need to be? Is eventual consistency acceptable?
- What matters most here — latency, availability, cost, or simplicity?

Then **summarise back** what you heard: *"So: a link shortener, roughly ten million new links a month, very read-heavy, redirects need to be fast, and analytics can lag by a few minutes. Anything I've missed?"*

That summary alone is a strong signal. It shows you can take an ambiguous brief and turn it into a bounded problem, which is most of what senior engineers actually do.

**2. Estimate the scale — two minutes.**

Rough numbers, out loud. *"Ten million writes a month is about four a second, and if reads are a hundred to one that's four hundred reads a second — which is not large. Storage, at maybe 500 bytes a record, is around 5 GB a year."*

Nobody expects precision. What is being checked is whether you reason about magnitude before choosing technology, because that is what stops people reaching for a distributed system to solve a single-server problem.

**3. Define the interface — two minutes.**

The two or three main operations. *"POST /links takes a URL and returns a short code. GET /:code redirects. GET /links/:code/stats returns the click count."* This anchors everything after it and it is quick.

**4. Draw the high-level design — five minutes.**

Simple first: client, load balancer, service, database, cache. Draw it if you have a whiteboard or a shared canvas, and **narrate as you draw** — a diagram appearing in silence is much harder to follow than one being explained.

Resist the urge to add components to look thorough. An unnecessary message queue is a worse signal than not having one, because the follow-up question is "why is that there?" and there is no good answer.

**5. Go deep on one component — fifteen minutes.**

Ask which one: *"I could go deeper on the data model, or on how the redirect stays fast under load. Which is more useful?"* Asking hands them control of their own interview and is universally well received.

This is where the marks are. Depth on one thing beats a shallow pass over eight.

**6. Name the bottlenecks and what you would do next — five minutes.**

*"The first thing to break is the database on reads. I'd add a cache in front of the redirect path, since codes are immutable so invalidation is trivial. After that it's the write path, and I'd look at read replicas before sharding."*

Ending on where it breaks, unprompted, is what senior sounds like.

## The habits that carry it

**Narrate every box as you draw it.** Say what it is and why it is there in one sentence. *"Load balancer here, because I'll want more than one instance of the service and I need somewhere to terminate TLS."*

**Say the trade-off out loud, every time.** This is the single most important verbal habit in the round.

> *"I'll cache the redirect lookups. That gets reads off the database and makes the hot path fast. The cost is another moving piece to operate, and a window where a deleted link still redirects until the entry expires — which for this use case I think is acceptable."*

A decision presented without its cost reads as a decision you did not actually make. Every design choice you announce should be followed by "the trade-off is…".

**Think out loud when choosing between options.** *"I could store the analytics in the same database or push them to a separate store. Same database is simpler and it's one less thing to run; separate keeps the write load off the redirect path. At four hundred reads a second I'd start with the same database and split it later if it hurts."* That reasoning is worth more than either choice.

**Ask before going deeper.** *"Do you want me to go into how the short codes are generated, or is the high level enough?"* It keeps you aligned with what they are trying to assess.

**Manage the clock.** Forty-five minutes goes quickly. If you are twenty minutes in and still clarifying, you have mismanaged it. A quick check helps: *"We're about halfway — shall I go deeper here or move on to the bottlenecks?"*

## Using your own systems

This is your specific advantage in this round and you should use it deliberately.

By week 15 you will have designed, built, deployed and measured two real systems. Most candidates at your level are reasoning entirely from articles. When something in the design touches something you actually did, say so:

> *"In my expense-splitting app I hit exactly this at a much smaller scale — the group summary endpoint was doing an N+1 and it took 380 milliseconds. One join and a composite index brought it to 45. The same principle applies here, just at a different order of magnitude."*

Two things happen. The answer stops being theoretical, and the interviewer now has a concrete thing they can probe — which is a conversation you are strong in.

Do not overreach with it. If your experience is at a smaller scale, say so plainly. *"I've only run this at a few hundred thousand rows, so I'm reasoning about the larger case rather than describing it."* That honesty makes the rest of what you say more credible.

## Drawing legibly

**Boxes and arrows, nothing else.** No decorative shapes, no colours you have to explain.

**Left to right, following the request.** Client on the left, storage on the right. The reader's eye should follow the data.

**Label the arrows** with what flows along them, not just that something does.

**Leave space.** You will add things. A cramped diagram becomes unreadable at exactly the point it gets interesting.

**On a video call,** use whatever they offer — a shared drawing tool, or your own screen. Practise this beforehand; fumbling with an unfamiliar tool for four minutes costs real interview time. A tablet, or even paper held to the camera, is entirely acceptable if you say so up front.

## Handling pushback

Interviewers will challenge your design. This is not disagreement — it is the standard mechanism for finding out how you think.

**"What if this database goes down?"** They are not saying your design is wrong. They are asking whether you have thought about failure. *"Right now that's a single point of failure. For this scale I'd start with automated backups and accept a short recovery window; if the availability requirement were higher I'd add a replica with automatic failover, at roughly double the database cost."*

**"Why not use X instead?"** Engage genuinely. *"That would work. The reason I leaned this way is Y. If Z mattered more, X would be the better choice."* Never defend a decision past the point where it is clearly weaker — changing your mind in response to a good argument is scored positively, not negatively.

**"This won't scale."** Ask for the number. *"What load are you thinking about? At ten times this I'd expect the read path to break first, and I'd add caching before anything else."*

The one thing to avoid is defensiveness. The round is a simulation of designing something together, and they are finding out what that would be like.

## Self Assessment

- Do I spend five full minutes on requirements, or do I start drawing immediately?
- Do I say the trade-off out loud after every design decision?
- Can I narrate a diagram while drawing it, or do I go silent while my hand moves?
- Have I practised on the drawing tool a remote interview will use?
- When challenged, do I engage with the argument or defend the design?

## Cheat Sheet

- **They are marking the process, not the architecture.** There is no correct answer.
- **Six steps:** clarify (5 min) · estimate scale · define the interface · high-level design · **one deep dive** · bottlenecks and next steps.
- **Summarise the requirements back.** Turning an ambiguous brief into a bounded problem is most of the job.
- **Say the headings out loud** so the structure is audible.
- **Every decision followed by "the trade-off is…"** A decision with no stated cost reads as no decision.
- **Ask which component to go deep on.** Depth on one beats a shallow pass over eight.
- **Do not add components to look thorough.** An unexplained queue is worse than no queue.
- **Use your own systems as evidence,** and state the scale honestly.
- **Draw left to right, label the arrows, leave space.** Practise the remote drawing tool in advance.
- **Pushback is the mechanism, not disagreement.** Changing your mind for a good reason scores well.
