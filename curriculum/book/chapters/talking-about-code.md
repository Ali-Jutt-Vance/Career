# Talking About Code Out Loud

> [!GOALS]
> - Understand why silence during live coding is scored badly, and why narrating is a separate skill.
> - Follow a **six-phase structure** for live coding: restate, clarify, state the approach, write the simple version, test aloud, state the complexity.
> - Narrate **intent rather than syntax**, and keep talking usefully when you are stuck.
> - Explain code you have already written: shape first, point at what you mean, say why, and volunteer weaknesses.
> - Practise the phrases until you are never stuck for something to say.

## Why this matters

Coding while explaining your reasoning to another person is a different skill from coding. It is trained separately and it fails separately — and it is exactly what live coding interviews, pair programming and code reviews test.

From inside your head, silence is concentration. From outside, silence looks exactly like being stuck or confused. An interviewer has limited time to decide about you, and they can only judge what they can see and hear. Four minutes of typing nothing and saying nothing gives them nothing to score — and they cannot help you, because they do not know where you are. Interviewers often give hints to candidates on the right track who are stuck on a detail, but only if they can hear the track.

Engineers who worked alone, without code review or pairing, have often never explained a technical decision aloud to a peer. That is fine — the skill is learnable, and this chapter is the method. It builds on {{ch:the-interview-conversation}} and {{ch:explaining-technical-work}}.

## The simple idea

Live coding with narration is like a driving test. The examiner cannot see inside your head, so a good learner says what they are checking — "mirror, signal, checking the blind spot" — and the examiner can score the judgement, not just the result.

> [!ANALOGY]
> Narrating your code is like a learner driver saying "mirror, signal, blind spot": it lets the examiner see your judgement, not only the car's position.
>
> **Where the analogy breaks:** a driving examiner rarely helps. An interviewer often will — narration invites hints and turns the test into a collaboration. Saying what you are stuck on is a strength here, not a failure.

## The proper definition and key words

**Thinking aloud** is narrating your reasoning — goals, choices, doubts and checks — while you solve a problem in front of someone.

Key words:

- **Restating** — repeating the problem in your own words to confirm understanding.
- **Clarifying question** — asking about inputs, limits and edge cases before you start.
- **Approach** — your plan for solving the problem, stated before coding.
- **Dry run / trace** — walking through code with a small input by hand.
- **Complexity** — how time and memory grow with input size ({{ch:big-o}}).

## The six phases of a live coding round

Follow the same structure every time until it is automatic. Under pressure people fall back on habits, so make the habit a good one.

### Level 1 — 1. Restate the problem

> "So I need a function that takes an array of integers and returns the first one that appears exactly once, and null if there isn't one — is that right?"

This catches misunderstandings before they cost you twenty minutes, and it buys thinking time that looks like care rather than delay.

### Level 1 — 2. Ask clarifying questions

> "Can the array be empty? Can it contain negative numbers? Roughly how large might it get?"

Asking is viewed positively at every level; assuming silently is not. Even if the answers do not change your approach, asking shows you think before you charge in.

### Level 1 — 3. State the approach before typing

> "My first thought is two passes. The first builds a map from value to count. The second goes through the array in order and returns the first value with count one. That's linear time with a map's worth of extra space. Does that sound reasonable before I write it?"

**This is the most important minute of the round.** If the approach is wrong, the interviewer will usually redirect you now — before you spend twenty minutes building the wrong thing.

### Level 2 — 4. Write the simple version first

Say it explicitly: "Let me get something correct working first, then look at improving it." That sentence is itself a good signal; it is how experienced engineers work.

While typing, narrate **intent**, not syntax:

- Useful: "I'm building the count map first, so I'll loop and increment."
- Not useful: "I'm typing for, open bracket, let i equals zero…"

The finished code, with the narration as comments:

```ts
// "First pass counts each value; second pass returns the first value seen exactly once."
function firstUnique(values: number[]): number | null {
  const counts = new Map<number, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1); // pass 1: count
  for (const v of values) if (counts.get(v) === 1) return v;        // pass 2: keep original order
  return null;                                                       // no unique value
}

// "Let me test it aloud: the example, then the edge cases we agreed."
const cases: [string, number[]][] = [
  ["example", [2, 3, 2, 4]],
  ["empty", []],
  ["all duplicates", [5, 5, 7, 7]],
  ["single element", [9]],
  ["negatives", [-1, 4, -1]],
];
for (const [name, input] of cases) {
  console.log(`${name.padEnd(15)} ${JSON.stringify(input).padEnd(12)} -> ${firstUnique(input)}`);
}
```

### Level 2 — 5. Test it aloud

Walk through a small input by hand before running anything:

> "With [2, 3, 2, 4]: the first pass gives 2 → 2, 3 → 1, 4 → 1. The second pass: 2 has count two, skip; 3 has count one, return 3. Good. Edge cases: empty returns null, as we agreed; all duplicates returns null; a single element returns that element."

Testing aloud catches your own bugs before the interviewer points them out — a much better result than being corrected ({{ch:testing}}).

### Level 2 — 6. State the complexity, unprompted

> "That's O(n) time and O(n) space. If memory mattered more, I could sort a copy and scan for runs, which is O(n log n) time — but sorting loses the original order, so I'd need to track the original positions to return the *first* unique value."

Volunteering the complexity, plus one alternative and its trade-off, finishes the answer above the level of the question ({{ch:big-o}}).

## Narrating while stuck

### Level 3 — Say what you know and what you are trying

This is what separates candidates, and it is learnable:

> "OK — I know a map gives me the counts. What I'm working out is how to keep the original order, because iterating over the map's keys gives insertion order, which is the same as first appearance here… actually, simpler: I'll loop over the original array again."

That shows structured thinking under pressure, and gives the interviewer a place to help.

### Level 3 — Ask for help well

When you are truly stuck:

> "I'm going round in circles on the ordering. Can I talk through what I've considered and get your thoughts?"

Asking for a hint costs a little. Six minutes of silence costs much more. Interviewers expect to give hints; it is part of the format.

### Level 3 — Apologise once, not constantly

One "sorry, let me think for a moment" is fine. Repeated apologies sound like low confidence and use up time. Replace them with what you are doing: "Let me check this loop condition."

## Talking about code you already wrote

### Level 4 — The walkthrough

In project walkthroughs, code reviews and deep dives, you are the expert and the listener is not — so clarity is entirely your job ({{ch:projects-that-prove-skill}}).

- **Shape before detail.** "There are three layers — routes, services and repositories. A request comes into a route, which validates it and calls a service; the service holds the business rules and calls a repository for data. Let me show you one request end to end."
- **Point at what you mean.** Share your screen, open the file, name it, highlight the lines. Vague references to code the listener cannot see are the most common failure.
- **Say why, not just what.** "This is a transaction because settlement writes to three tables, and a partial write would leave balances wrong." The *what* is visible on the screen; the *why* is what they are assessing ({{ch:transactions}}).
- **Volunteer weaknesses.** "I'd do this part differently — the error handling here is inconsistent because I wrote it first." Naming your own weak spots before someone finds them builds credibility.

### Level 4 — In code review

The same habits apply when you discuss code with colleagues ({{ch:code-review-and-documentation}}):

- Ask about intent before suggesting changes: "What was the reason for caching here?"
- Suggest rather than command: "What do you think about extracting this into a function?"
- Separate must-fix from preference: "Blocking: this query isn't parameterised. Optional: I'd rename `d` to `dueDate`."

## Useful phrases

Learn these until they come without effort, and you will always have something useful to say:

| Moment | Phrase |
|---|---|
| Start | "Let me restate the problem to make sure I have it." |
| Clarify | "A couple of quick questions before I start." |
| Approach | "My approach would be… does that sound reasonable?" |
| Build | "Let me get something correct first, then improve it." |
| Test | "Let me walk through this with a small example." |
| Stuck | "I'm stuck on X — here's what I've considered." |
| Finish | "That's O(n) time and O(n) space. An alternative would be…" |
| Walkthrough | "Let me start with the overall structure, then go into one request." |

## Practising alone

- **Narrate while you build.** When working on your own projects, say what you are doing and why, out loud. It feels strange for the first few sessions, then normal.
- **Record yourself** solving a problem and watch it back. Uncomfortable, but excellent feedback. Look for: long silences, starting to type before stating the approach, finishing without testing aloud, not stating complexity.
- **Explain your project to an empty room**, using the walkthrough structure.
- **Practise with a friend** who interrupts and asks questions, as interviewers do ({{ch:interview-under-pressure}}).

## From beginner to enterprise

**Level 1 — structure.** Restate, clarify, and state the approach before typing.

**Level 2 — build and check.** Simple version first, intent-level narration, testing aloud, stating complexity.

**Level 3 — stuck well.** Saying what you know, asking for hints, avoiding constant apology.

**Level 4 — walkthroughs and reviews.** Shape first, pointing, why over what, volunteering weaknesses, respectful review comments.

**Level 5 — pairing and mentoring.** Thinking aloud with colleagues as an everyday habit; teaching juniors by narrating your process ({{ch:technical-leadership}}).

**Level 6 — the interviewer.** Running live coding interviews that let candidates show their thinking.

## Real-world use cases

### The silent solution

- **Story**: a candidate solved a problem correctly in silence and was rejected — the interviewer could not tell whether they understood it or remembered it. After practising narration, the same candidate's next round included a wrong first approach that the interviewer redirected within a minute; they passed.

### The volunteered weakness

- **Story**: in a project walkthrough, a candidate pointed out that their error handling was inconsistent and described how they would fix it. The interviewer noted "good self-awareness" and spent the remaining time on design rather than looking for flaws.

## Common mistakes

### Beginner: typing before stating the approach

**Fix:** a minute of approach first, with "does that sound reasonable?".

### Beginner: narrating syntax

**Fix:** narrate intent and reasons.

### Intermediate: long silences when stuck

**Fix:** say what you know and what you are trying; ask for a hint.

### Intermediate: saying "done" without testing

**Fix:** a dry run with a small example and edge cases.

### Intermediate: walkthroughs that start in the details

**Fix:** shape first, then one request end to end.

## Debugging and troubleshooting

- **The interviewer seems lost**: go back to the approach — "Let me summarise where I am."
- **You discover a bug while testing aloud**: say so calmly — "I see a problem: the loop skips the last element. Let me fix that." Finding your own bug is a good sign.
- **You run out of time**: describe what you would do next — "The remaining step is handling the empty input; I'd add a guard here."
- **Your mind goes blank**: restate the problem and your approach; structure brings thinking back ({{ch:interview-under-pressure}}).

## Security summary

- **In walkthroughs, show code you are allowed to show** — your own projects or public code, not an employer's private repository.
- **Close anything sensitive before screen sharing**: environment files, password managers, private messages and customer data ({{ch:secrets-manager}}).
- **Mention security as you code** where it matters: "I'll use a parameterised query here to avoid SQL injection." It shows good habits ({{ch:application-security}}).

## How a senior engineer thinks about this

- **Make thinking visible.** People can only trust reasoning they can follow.
- **Agree on the approach before building.** It is cheaper to correct a plan than code.
- **Check your own work.** Test aloud; find your own bugs.
- **Explain the why.** It is what reviewers and interviewers need.

## Exercises

### Exercise 1 — State the approach

**Objective:** practise phase 3.
**What to do:** write what you would say before coding a function that checks whether two strings are anagrams.

<details>
<summary>Show the solution</summary>

"Two strings are anagrams if they have the same characters with the same counts. My approach: if the lengths differ, return false. Otherwise count characters in the first string with a map, decrement for the second, and check every count ends at zero. That's O(n) time and O(k) space for k distinct characters. An alternative is sorting both and comparing, which is O(n log n) but simpler. Shall I go with the counting approach?"

</details>

### Exercise 2 — Narrating while stuck

**Objective:** practise phase 4 under pressure.
**What to do:** you are writing a function to find the longest substring without repeating characters, and you are not sure how to move the window's start. Write what you would say.

<details>
<summary>Show the solution</summary>

"I'm using a sliding window with a map of each character's last index. I know that when I see a repeated character I need to move the start forward — what I'm working out is exactly where. I think it's one past the previous position of that character, but only if that's ahead of the current start, otherwise I'd move it backwards. Let me check that with 'abba'… yes, at the second 'a' the start must stay after the second 'b'. So start = max(start, lastIndex + 1)."

</details>

### Exercise 3 — A project walkthrough opening

**Objective:** practise shape first.
**What to do:** write the first three sentences of a walkthrough of a project with a React front end, a Node.js API and PostgreSQL.

<details>
<summary>Show the solution</summary>

"It's an expense-sharing app with three parts: a React front end, a Node.js API, and a PostgreSQL database. The API is split into routes, services and repositories, so business rules live in one place. Let me follow one request — adding an expense — from the button click to the database and back."

</details>

## Summary

Explaining while coding is a separate skill from coding, and silence reads as being stuck: interviewers can only score and help with what they can hear. Use the **six phases** every time: **restate** the problem, **ask clarifying questions**, **state the approach before typing** (the most important minute), **write the simple version first** while narrating intent rather than syntax, **test aloud** with a small example and edge cases, and **state the complexity** with an alternative.

When stuck, **say what you know and what you are trying**, ask for a hint rather than sitting in silence, and apologise once at most. When explaining code you wrote, give the **shape first**, **point** at what you mean, say **why** rather than what, and **volunteer weaknesses**. Learn the key phrases until they are automatic, narrate while you build, and record yourself to find silences and skipped steps.

## Key terms

- **Thinking aloud** — Narrating your reasoning while solving a problem.
- **Restating** — Repeating a problem in your own words.
- **Approach** — The plan for solving a problem, stated before coding.
- **Narrating intent** — Explaining why you are doing something, not the keystrokes.
- **Dry run** — Tracing code by hand with a small input.
- **Edge case** — An unusual input such as an empty or single-element array.
- **Walkthrough** — Explaining existing code to someone, shape first.

## What comes next

Sooner or later you will be asked something you do not know. The next chapter, {{ch:questions-you-cannot-answer}}, covers how to answer honestly and usefully: saying what you know, reasoning towards an answer, asking for clarification and recovering from mistakes.
