# Phase 10 — Chapter 3: The Interview Conversation

> *"An interview is not an exam. It is a conversation in which somebody decides whether they want to work with you."*

---

## Chapter Overview

Every question you will be asked falls into one of four types, and each type wants a differently shaped answer. Knowing which type you are being asked is most of the skill, because it tells you how long to talk, how much detail to give, and when to stop.

This chapter covers the four types, the STAR structure for the behavioural ones, how to manage the shape of the whole conversation, and the small mechanical habits that make a candidate easy to listen to.

## The four question types

| Type | Example | Length | Shape |
|---|---|---|---|
| **Factual** | "What is the difference between a left join and an inner join?" | 20–40 sec | Direct answer, then one example |
| **Experience** | "Tell me about a project you built." | 2–5 min | Context → problem → what you did → result |
| **Hypothetical** | "How would you design a URL shortener?" | 5–45 min | Clarify → structure → reason aloud → trade-offs |
| **Behavioural** | "Tell me about a time you disagreed with a colleague." | 2 min | STAR |

The most common error is answering a factual question as though it were an experience question. "What is an index?" wants forty seconds, not a four-minute history of your query optimisation work. The interviewer has a list and you have just consumed the time for two other questions.

The opposite error is equally costly: answering an experience question in one sentence, which reads as either thin experience or an inability to articulate.

**When in doubt, answer briefly and then offer:** *"That's the short version — would you like me to go into how we implemented it?"* This hands the depth decision to the person who owns the clock, and it is a signal of good judgement in itself.

## STAR, and why it exists

Behavioural questions — "tell me about a time when…" — are answered with STAR:

- **Situation.** Where and when. One or two sentences.
- **Task.** What needed to happen and what your responsibility was. One sentence.
- **Action.** What *you* specifically did. This is most of the answer.
- **Result.** What happened, with a number if one exists.

*"We had a client report that invoices were occasionally wrong — maybe one in twenty."* (Situation) *"I was the only developer, so finding it was mine."* (Task) *"I couldn't reproduce it, so I added structured logging around the calculation with a request id and left it running for two days. That showed the failures were all multi-currency invoices where the exchange rate was fetched after the total was calculated. I moved the fetch before the calculation and added a test with a fixed rate."* (Action) *"No incorrect invoices in the six months after that, and the logging has caught two unrelated bugs since."* (Result)

Two minutes. Complete. Answers the question and demonstrates a debugging method without being asked about one.

**The trap is the Action section.** Under pressure people describe what the team did — "we decided", "we changed". The interviewer is scoring *you*. Say "I" when it was you, and say "we" only when it genuinely was. If it was a team decision that you argued for, say that: it is a better story than pretending you did it alone.

## The eight stories to have written

Write all eight in STAR form, in advance. Almost every behavioural question maps to one of them, and having them written is the difference between a two-minute answer and a five-minute ramble.

1. A difficult bug you found and fixed
2. A time you disagreed with someone about a technical decision
3. A time you failed, or shipped something broken
4. A time you had to learn something quickly
5. A time you dealt with an unreasonable deadline or a shifting requirement
6. Something you built that you are proud of
7. A time you had to explain something technical to a non-technical person
8. A time you took on something nobody asked you to do

Three years as a sole developer produces all eight; you have simply never been asked to articulate them. Sit with your commit history for an hour and they will surface.

## The two hard ones, for you

**"Why did you stay three years somewhere you weren't growing?"**

Answer honestly. It was stable, you were the only developer and the product depended on you, and it took time to see clearly that the environment was not going to develop you. Then move immediately to what you did once you saw it — the rebuilt fundamentals, the two projects, the daily commits. That answer describes self-awareness followed by action, which is exactly what the question is testing. A defensive answer fails it.

**"How much of your work did you do yourself?"**

If AI-assisted work comes up, do not panic and do not lie. The honest version is genuinely strong by December: *"Honestly, more of it was AI-generated than I'm comfortable with — it was a small company with no review and it closed tickets. I realised that was a problem, and I spent eight weeks rebuilding from scratch with no assistance at all, which is where these two projects come from. I use AI now, but for review and explanation, not to write things I don't understand."*

Almost nobody says that in an interview. It is candid, it demonstrates self-correction, and it ends on evidence.

## Managing the conversation

**Take a pause before answering.** Two or three seconds of silence to structure your answer is fine, and it produces a better answer than starting immediately and finding your way. If you want to make it explicit: *"Let me think about that for a second."*

**Signpost long answers.** *"There were three things that made it hard — the first was…"* The listener now knows the shape and can follow. Without signposting, a four-minute answer feels twice as long.

**Ask clarifying questions.** For anything open-ended, one or two questions before answering is scored positively at every level. It shows you do not charge at problems.

**Watch for the interrupt.** If they cut in, stop immediately. It usually means they have what they need or you have gone off track. Continuing over an interruption is one of the few genuinely damaging habits in an interview.

**Check in on long answers.** *"Is this the level of detail you wanted, or should I go deeper on the implementation?"* Asking makes you easy to interview.

## Your questions for them

Every interview ends with "do you have any questions?" and this is a scored part of the conversation, not a formality. Asking nothing is a genuine negative.

Have three, specific, about the work:

- How is code reviewed here? What does the process look like day to day?
- What is the team struggling with most at the moment?
- What would the first three months look like for someone joining?
- How are technical decisions made — who decides, and how?

Avoid asking about salary, leave or working hours in a technical round — that is a conversation for the recruiter or the offer stage.

For you, the code review question is the most valuable one to ask, and asking it is consistent with everything else you have said about why you are leaving.

## Small mechanics that matter

**Audio.** Test it before the call. Bad audio makes a good candidate sound uncertain, and the interviewer may not tell you.

**Camera on, at eye level.** Look at the camera when you make a point rather than at your own image.

**Have water.** Your mouth will dry.

**Notes are fine.** Bullet points, not scripts. Reading an answer is audible.

**Close everything else.** Notifications are visible on your face, and every interviewer knows what that looks like.

**Say the interviewer's name once or twice.** It changes the register of the conversation from examination to discussion.

## Self Assessment

- Can I tell which of the four types a question is, as it is being asked?
- Are all eight stories written down, or do I intend to improvise them?
- In my last practice recording, did I say "I" or "we" in the Action section?
- Do I have three specific questions to ask, about the work?
- Have I tested my audio and camera on the platform they will use?

## Cheat Sheet

- **Four types: factual (40 sec) · experience (2–5 min) · hypothetical (structured reasoning) · behavioural (STAR, 2 min).**
- **Answering a factual question as an experience question** is the most common length error.
- **When unsure: answer briefly, then offer depth.** *"Would you like me to go into it?"*
- **STAR: Situation, Task, Action, Result.** The Action is most of the answer and it must be "I".
- **Write all eight stories in advance.** Three years as a sole developer produces every one of them.
- **The two hard questions have honest answers** — why you stayed, and how much you wrote yourself. Candour beats defence.
- **Pause before answering. Signpost long answers. Stop instantly when interrupted.**
- **Always have three questions,** and make one of them about code review.
- **Test the audio.** Bad audio makes a good candidate sound uncertain.
