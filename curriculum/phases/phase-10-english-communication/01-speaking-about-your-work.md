# Phase 10 — Chapter 1: Speaking About Your Work

> *"You will be judged on how clearly you describe what you did, not on how well you did it. The interviewer cannot see the code."*

---

## Chapter Overview

At a Tier 2 Pakistani company, communication is not a soft extra. Their clients are foreign, their teams are often distributed, and a candidate who cannot explain their work clearly is expensive regardless of how good the work was. Interviewers know this, so they weight it heavily.

This chapter is about the most fundamental version of that skill: describing your own work out loud, in English, clearly, without rambling and without apologising. It is the foundation everything else in this phase builds on, and it starts in week 1 of the plan rather than week 14, because it takes months rather than days.

**Your English does not need to be perfect.** This is worth stating early because it is the fear that stops people practising. Nobody in a Pakistani engineering interview is scoring your accent or your article usage. They are scoring whether they understood you, whether you were clear, and whether you sounded confident about your own work. All three are trainable independently of vocabulary.

## The four problems, and which one is yours

Diagnose before you practise, because the four have different fixes.

**Rambling.** You start answering and keep going, adding detail, doubling back, until the interviewer interrupts. The listener loses the thread and the answer scores as "unclear" even though everything in it was true. This is the most common problem by far.

**Under-answering.** Three words where three sentences were wanted. "Did you use transactions?" "Yes." The interviewer now has to extract everything, which is work, and the impression is either that you do not know or that you cannot articulate.

**Hedging.** Every sentence wrapped in qualifiers. "I think maybe we sort of used a kind of caching approach, I'm not really sure if it was the best way." The content may be correct and the delivery destroys it. This one is almost always confidence rather than language.

**Vocabulary gaps under pressure.** The word will not come, so you stop, restart, and lose the thread. Genuinely a language issue, and the fix is the topic banks and rehearsal, not general English study.

Record yourself answering "what do you do at your current job?" and listen back once. You will identify yours within thirty seconds.

## The shape of a good answer

Almost every question about your work can be answered in the same four-part shape. Learn the shape and you stop having to invent structure under pressure.

> **Context → Problem → What I did → Result**

*"I was the only developer on a billing system for about two thousand users. The monthly report was taking forty seconds to load and people were complaining. I looked at the query and found it was joining four tables without an index on the date column, so I added a composite index and rewrote the aggregation. It came down to under three seconds."*

Four sentences. Complete. Under thirty seconds. It answers the question, it invites a follow-up, and it does not ramble.

**The most important part is stopping.** After the result, stop talking. Silence feels like failure and it is not — it is the interviewer's turn. Candidates who cannot tolerate that silence keep adding detail, and the added detail is where the answer gets worse.

## The three answers to have ready

Not scripts to recite. Prepared structures that you have said aloud enough times that they come out fluently.

### 1. "Tell me about yourself" — ninety seconds

Asked in every interview. It sets the frame for the whole conversation, and an unprepared answer wastes the most valuable ninety seconds you get.

Four parts, one or two sentences each:

- **Now.** *"I'm a software engineer with three years' experience, currently working on a PHP and AngularJS product as the sole developer."*
- **What that involved.** *"It's a billing and reporting system for around two thousand users. I've handled everything — features, bugs, deployments, and talking to the client."*
- **What you've done recently.** *"Over the last few months I've moved into modern JavaScript — Node, React and PostgreSQL — and built two applications end to end. The first is a shared expense tracker running on AWS with token authentication; it's live and the code is public."*
- **What you want.** *"I'm looking for a team with senior engineers and real code review, because that's the thing I haven't had."*

Ninety seconds. Then stop.

### 2. "Why are you leaving?" — sixty seconds

Never criticise your employer. Name what you want rather than what you are escaping, and end on what you have already done about it.

*"It's been a stable job and I've learned a lot about maintaining a system I didn't write. But there was no code review and no engineers more senior than me, so I plateaued. I decided to fix it myself — I rebuilt my fundamentals over the last few months and shipped two projects — and now I'm looking for somewhere I can keep growing at that rate."*

### 3. The project walkthrough — twelve minutes

The most valuable answer you own by December, and it has its own structure:

1. **What it does and who for** — thirty seconds
2. **Why you built it** — thirty seconds
3. **The architecture** — two minutes, and draw it if you can
4. **The data model** — two minutes
5. **The hardest part** — three minutes; this is where the value is
6. **What you measured** — two minutes; numbers separate you
7. **What you would do differently** — two minutes; this is what senior sounds like

Point six and point seven are the two that most candidates skip and the two that most impress. Numbers prove you measured rather than assumed. Naming your own design flaws proves judgement rather than defensiveness.

## Practising, alone

You do not need a partner to build this, which is fortunate because you will not have one most mornings.

**Record on your phone, once a day, for two minutes.** Answer one question aloud. Listen back once — only once, because the point is to notice, not to be miserable.

Listening for three things: **How long was I silent?** Silence is the thing interviewers notice most. **Did I ramble past the answer?** Find the sentence where you should have stopped. **How many hedges?** Count "I think", "maybe", "sort of", "kind of". Aim to halve the count over four weeks.

**Narrate while you code.** Every evening build block, say what you are doing as you type. It feels absurd for about four sessions and then becomes normal. This single habit trains the exact skill the technical interview measures, and it costs nothing extra.

**Do it in English, always.** Thinking in Urdu and translating adds a delay that reads as uncertainty. If you code in English and read in English, speaking about code in English is a shorter jump than it feels.

## Confidence, and where it comes from

The hedging problem is the one that most damages your interviews and it is not a language problem.

Confidence in an interview comes from exactly one place: **having actually done the thing you are describing.** You cannot talk your way into sounding confident about work you did not do, and you barely have to try when describing work you did.

This is another reason the projects matter so much. When you describe a system you designed, built, deployed and measured, the hedging disappears on its own, because there is nothing to hedge about. By December you will have two of those, and the difference in how you sound will be audible in the recordings.

Until then, one mechanical fix: **delete the hedges from your prepared answers in writing first.** Write the answer down, cross out every "I think" and "maybe", and read the remaining version aloud. Most of them were adding nothing.

## Interview Preparation

**"What do you do at your current job?"**

Context, problem, what I did, result. Thirty to sixty seconds. Have one concrete example ready rather than a general description of your duties.

**"What's the most complex thing you've worked on?"**

Choose something you can go deep on, not something that sounds impressive. Depth beats scale in this answer. A simple system you understand completely produces a better answer than a large one you touched a corner of.

**"Explain your project to someone non-technical."**

Occasionally asked directly, and it is testing whether you can adjust your level. No jargon at all. *"It's an app for splitting expenses in a group — like when friends go on a trip and everyone pays for different things, it works out who owes what to whom."* If you cannot do this, you may not understand the problem as well as you think.

## Self Assessment

- Which of the four problems is mine — rambling, under-answering, hedging, or vocabulary?
- Can I deliver the ninety-second introduction right now, without notes?
- How many hedge words did I use in my last recording? Count them.
- Do I narrate while coding, or only when someone is watching?
- Can I explain my project to someone with no technical background?

## Cheat Sheet

- **Communication is weighted heavily at Tier 2** because their clients are foreign. It is not a soft extra.
- **Your English does not need to be perfect.** Clear, structured and confident is what is scored.
- **Four problems:** rambling · under-answering · hedging · vocabulary under pressure. Diagnose yours from a recording.
- **The universal shape: Context → Problem → What I did → Result.** Four sentences, then **stop talking**.
- **Three prepared answers:** the ninety-second introduction, the reason for leaving, and the twelve-minute project walkthrough.
- **The two parts everyone skips:** what you measured, and what you would do differently. They are what senior sounds like.
- **Record two minutes daily. Listen back once.** Count silences, rambles and hedges.
- **Narrate while you code, every evening.** Absurd for four sessions, then normal.
- **Confidence comes from having actually done the work.** It is the real reason the projects matter.
