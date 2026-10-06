# Phase 10 — Chapter 6: Answering Questions You Cannot Answer

> *"'I don't know' costs you one question. A confident wrong answer costs you the interview."*

---

## Chapter Overview

You will be asked things you do not know. This is not a sign that the interview is going badly — it is usually a sign that it is going well, because a good interviewer keeps going deeper until they find your limit. Finding your limit is the point of the exercise.

What is scored is not whether you hit a limit. It is what you do when you get there. This chapter is about that, and it is a genuinely learnable skill that converts your single most feared interview moment into a neutral or positive one.

## Why bluffing fails so badly

Three reasons, and they compound.

**They can tell.** An interviewer asking about database indexes has asked forty candidates about database indexes. They know exactly what a real answer sounds like and what a reconstructed one sounds like. The pattern — a general statement, vague language, no specifics, and a subtle shift away from the question — is unmistakable from the other side of the table.

**It destroys everything else.** Once they catch one fabricated answer, every previous answer becomes suspect. They now have to re-evaluate the whole conversation, and they cannot, so they discount all of it. One bluff can cost you five good answers.

**It predicts how you will behave at work.** This is the real reason it matters. Someone who bluffs in an interview bluffs in a code review, in a status update, and in an incident. That is expensive and dangerous, and hiring managers are explicitly screening for it.

## The structure that works

Four parts, in order:

> **State the limit → give what you do know → reason toward it → say how you would find out.**

Worked example. *"How would you handle database sharding at this scale?"*

> *"I haven't worked with sharding in production — the largest database I've run had a few hundred thousand rows, so I've never needed it."* (limit)
>
> *"What I understand is that it's splitting data across multiple database servers by some key, so no single server holds everything, and the trade-off is that queries spanning shards become expensive and you lose easy cross-shard transactions."* (what you know)
>
> *"For this case I'd want to shard by something that keeps related data together — probably tenant or customer id, so most queries land on one shard. The risk would be uneven distribution if one customer is much larger than the others."* (reasoning)
>
> *"If I were doing it for real I'd want to read how a couple of teams have handled the rebalancing, because that's the part I'd expect to get wrong."* (how you would find out)

That answer is better than a fabricated confident one and, for a mid-level candidate, it is often better than a rehearsed correct one. It demonstrates honesty, real partial knowledge, structured reasoning, and self-awareness — four things they are actively measuring.

## Three degrees of not knowing

Not all gaps are the same, and matching your response to the degree matters.

**You have heard of it but never used it.** Say exactly that, then reason. This is the case above and it is the most common.

**You know it but cannot recall it right now.** Be honest and specific about the shape of the gap. *"I know this — it's the isolation levels, and I can picture the table. I'm blanking on which one prevents phantom reads. I know read committed doesn't and serialisable does; it's the middle one I'm unsure about."* That answer demonstrates real knowledge with a specific hole in it, which is not the same as ignorance and interviewers score it differently.

**You have never heard of it.** Say so, and ask. *"I don't know that term. Could you tell me what it refers to? I might know the concept under a different name."* Perfectly reasonable, and frequently you do know it under another name.

## Ask for the context

Often the right move is to turn the question into a conversation rather than a test.

> *"I haven't done that specifically. Can I ask what problem you're solving with it? I might be able to reason about it from a related angle."*

This is legitimate, not evasion, and it often produces a genuinely useful exchange. Interviewers generally prefer a candidate who engages with a problem over one who produces a recited answer.

## Partial credit is real

Interviews are not marked right or wrong. Almost every question has partial credit available and most candidates leave it on the table by giving up too early.

*"What's the time complexity of this?"* — *"I'm not certain, but it's nested loops over the same array, so it's at least quadratic. The inner loop breaks early sometimes, so it might be better in the average case, but worst case I'd say O(n²)."* That is most of the marks even if the final figure is imprecise, because the reasoning is visible.

**Always say what you can see,** even when you cannot get to the answer. Visible reasoning is the thing being scored, not the final number.

## Recovering when you get something wrong

You will state something incorrectly and realise it mid-sentence, or be corrected.

**If you realise it yourself:** say so and correct it immediately. *"Actually, that's not right — I said the index would help there, but the column's wrapped in a function so it wouldn't be used. Let me redo that."* Self-correction is a strong signal. It shows you are actually thinking rather than reciting.

**If they correct you:** accept it cleanly and engage. *"Ah, you're right — so the index isn't used because of the function call. That explains something I saw in my own project, actually."* Do not argue, and do not over-apologise. One clean acknowledgement and move on.

**Do not spiral.** The most damaging thing about a wrong answer is not the answer; it is the ten minutes of shaken confidence afterwards. One wrong answer in a forty-five minute interview is nothing. Assume it cost you nothing and carry on at full confidence, because that assumption is usually true and it is always more useful than the alternative.

## When you genuinely do not know most of it

Occasionally you are in the wrong interview — the role is more senior than your experience, or in an area you have not worked in. It happens.

Be honest early rather than bluffing for forty minutes. *"I want to be upfront — most of what you're asking about is Kubernetes at a level I haven't worked at. I've used Docker and Compose, and I've deployed containers to a single EC2 instance, but not orchestration. I'm happy to keep going if it's useful, but I don't want to waste your time."*

Two things follow from that. Sometimes they redirect to what you do know and the interview improves. Sometimes it ends early, which saves you both time. Either way you leave with your credibility intact, and people remember candidates who were straight with them.

## Interview Preparation

**Practise the structure, aloud, on things you actually do not know.** Pick five topics from the book you have not studied yet, and answer a question on each using the four-part structure. It will feel strange to rehearse not knowing something. It is the single highest-return rehearsal available, because it converts your most feared moment into a routine one.

**Know your own edges before the interview.** For every item on your CV, write down where your knowledge stops. Knowing this in advance means you reach the edge calmly rather than being surprised by it.

**Prepare the phrases** so they are automatic under pressure:

- *"I haven't used that in production, but here's what I understand and how I'd approach it."*
- *"I don't know that term — could you tell me what it refers to?"*
- *"Let me think about that for a moment."*
- *"I'm not certain, but here's what I can reason out."*
- *"Actually, let me correct what I just said."*

## Self Assessment

- For every technology on my CV, do I know where my knowledge stops?
- Have I practised answering something I genuinely do not know, out loud?
- When I was last corrected, did I accept it cleanly or argue?
- Do I give up when I cannot see the full answer, or do I say what I can see?
- Are the five phrases above automatic, or would I have to construct them under pressure?

## Cheat Sheet

- **Being asked something you do not know means the interview is going well.** They are finding your limit, which is the point.
- **Never bluff.** They can tell, it discredits every other answer, and it predicts how you would behave at work.
- **The structure: state the limit → what you do know → reason toward it → how you would find out.**
- **Three degrees:** heard of it but never used it · know it but blanking · never heard of it. Match the response to the degree.
- **Ask what problem they are solving.** Turns a test into a conversation.
- **Partial credit is real.** Always say what you can see, even without the final answer.
- **Self-correction is a strong signal.** Catching your own error scores better than never making one.
- **One wrong answer costs almost nothing. Spiralling afterwards costs a lot.**
- **Rehearse not knowing.** It converts the most feared moment into a routine one.
