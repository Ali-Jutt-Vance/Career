# Phase 10 — Chapter 7: Talking About Code Out Loud

> *"An interviewer cannot score thinking they cannot hear. Silence is not neutral — it reads as being stuck."*

---

## Chapter Overview

Coding while narrating your reasoning to another person is a separate skill from coding. It is trained separately, it fails separately, and it is the specific thing the technical screening round measures.

For you it is doubly important. Three years as a sole developer with no code review means you have almost never explained a technical decision to a peer who was evaluating it. So even on a problem you could solve alone, the requirement to talk while solving consumes attention you need for the problem, and you fail a question you would otherwise pass. That is not a coding failure; it is an untrained skill, and eight weeks of deliberate practice fixes it.

This chapter is the method. The plan schedules it from week 1 — every evening build block, narrated aloud — precisely because it takes months rather than days.

## Why silence is scored badly

From inside your head, silence is concentration. From outside, silence is indistinguishable from being stuck, confused, or unable to proceed.

The interviewer has forty-five minutes to make a decision about you. What they can observe is what you say and what you type. If you type nothing and say nothing for four minutes while thinking hard, they have four minutes of no data, and no data reads as a negative in a scored interview.

Worse, they cannot help you. Interviewers routinely give hints to candidates who are on the right track and have got stuck on a detail. They can only do that if they know where you are. A silent candidate cannot be helped, so a small stumble becomes a failed round.

## The six phases of a live coding round

Follow this every single time until it is automatic. The structure is what stops panic, because when you are nervous you fall back on structure rather than judgement.

### 1. Restate the problem (20 seconds)

*"So I need a function that takes an array of integers and returns the first one that appears exactly once. If there isn't one, I return null — is that right?"*

This catches misunderstandings before they cost you twenty minutes, and it buys thinking time that looks like diligence rather than delay.

### 2. Ask two clarifying questions (20 seconds)

*"Can the array be empty? Can it contain negative numbers? Roughly how large might it get?"*

Asking is scored positively at every level. Assuming silently is not. Even if the answers do not change your approach, asking demonstrates that you do not charge at problems.

### 3. State the approach before typing (60 seconds)

*"My first thought is two passes. First pass builds a map of value to count. Second pass goes through the array in order and returns the first value whose count is one. That's linear time and linear space. Does that sound reasonable, or would you like me to think about doing it in constant space?"*

**This is the most important sixty seconds of the round.** If the approach is wrong, the interviewer will redirect you here — before you have spent twenty minutes implementing something that cannot work. Candidates who start typing immediately lose entire interviews to this.

### 4. Write the simple version (most of the time)

Say it explicitly: *"Let me get something correct working first, then look at improving it."* That sentence is itself a positive signal — it is what experienced engineers do.

While typing, narrate at the level of intent, not syntax:

- Good: *"I'm building the count map first, so I'll iterate and increment."*
- Not useful: *"I'm typing 'for', open bracket, let i equals zero…"*

Narrate **why**, not what your fingers are doing.

### 5. Test it aloud (60 seconds)

Walk through a small input by hand, out loud, line by line. *"With [2, 3, 2, 4]: first pass gives me 2 → 2, 3 → 1, 4 → 1. Second pass, 2 has count 2 so skip, 3 has count 1, return 3. That's right."*

Then edge cases: *"Empty array returns null, which is what we said. All duplicates returns null. Single element returns that element."*

Testing aloud catches your own bugs before the interviewer has to point them out, which is a materially better outcome.

### 6. State the complexity, unprompted

*"That's O(n) time and O(n) space. If space mattered more than time I could sort first and scan, but that loses the original ordering so I'd need to handle that separately."*

Volunteering the complexity, plus one alternative and its trade-off, closes the answer at a level above the question.

## Narrating while stuck

This is the part that separates people, and it is entirely learnable.

**Say what you know and what you are trying.**

> *"Okay — I know a hash map gets me the counts. What I'm working out is how to preserve the ordering, because iterating the map won't necessarily give me the original order. Let me think about whether I can do a second pass over the array instead."*

That is a strong interview moment. It shows structured thinking under pressure, and it gives the interviewer a place to help if they want to.

**When you are properly stuck, ask.**

> *"I'm going round in circles on the ordering. Can I talk through what I've considered and get your thoughts?"*

Asking for a hint costs a small amount. Sitting in silence for six minutes costs much more. Interviewers expect to give hints; it is part of the format.

**Do not apologise repeatedly.** One "sorry, let me think" is fine. Continuous apology reads as a lack of confidence and it consumes time you need.

## Talking about code you already wrote

A different mode, used in the project walkthrough and the deep dive. Here you are the expert on the material and the interviewer is not, so the burden of clarity is entirely yours.

**Start with the shape before the detail.** *"There are three layers — routes, services and repositories. Requests come into a route, which validates and calls a service; the service holds the logic and calls repositories, which are the only things that touch SQL."* Now they have a frame, and every detail you add afterwards has somewhere to sit.

**Point at what you are describing.** Share your screen, scroll to the file, name it. "Vague reference to code they cannot see" is the most common failure in this round.

**Say why, not just what.** *"This is a transaction because the settlement writes to three tables and a partial write would leave balances wrong."* The what is visible on screen; the why is the only thing you are adding.

**Volunteer the weaknesses.** *"This part I'd do differently — the error handling here is inconsistent with the rest of the codebase because I wrote it first."* Naming your own flaws before they find them is one of the strongest signals available, and it is free.

## Practising alone

You have this drill available every single evening, and it costs nothing.

**Narrate every build block.** For the whole ninety minutes, say what you are doing and why, out loud, to an empty room. It feels ridiculous for roughly four sessions and then becomes normal — and the normality is exactly the goal, because in an interview it should not be a new activity.

**Record one problem a week and watch it back.** Painful and unmatched as feedback. Watch for: how long were the silences, did I state the approach before typing, did I test aloud, did I say the complexity.

**Practise the phrases** until they are automatic:

- *"Let me restate the problem to make sure I have it."*
- *"Two quick questions before I start."*
- *"My approach would be… does that sound reasonable?"*
- *"Let me get something correct first, then improve it."*
- *"Let me walk through this with a small example."*
- *"I'm stuck on X — here's what I've considered."*
- *"That's O(n) time and O(n) space."*

Seven sentences. Learn them properly and you always have something to say, which means you are never silent.

## Self Assessment

- Do I narrate during my evening build block, or only when someone is watching?
- In my last recorded session, what was my longest silence?
- Do I state the approach before typing, or start typing immediately?
- Do I test aloud with an example before saying I am done?
- Are the seven phrases automatic, or would I have to construct them under pressure?

## Cheat Sheet

- **Silence reads as being stuck.** The interviewer cannot score or help what they cannot hear.
- **Six phases:** restate · two clarifying questions · **state the approach before typing** · simple version first · test aloud · state complexity unprompted.
- **The sixty seconds stating your approach is the most important part of the round.** It is where a wrong direction gets corrected for free.
- **Narrate intent, not syntax.** Why you are doing it, not what your fingers are typing.
- **When stuck: say what you know and what you are trying.** Then ask for a hint rather than sitting silent.
- **Explaining existing code: shape first, then detail. Point at what you mean. Say why, not what.**
- **Volunteer your own weaknesses** before they are found. Free credibility.
- **Narrate every evening build block.** Ridiculous for four sessions, then normal.
- **Learn the seven phrases** so that you are never silent.
