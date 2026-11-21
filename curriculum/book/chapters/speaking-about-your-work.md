# Speaking About Your Work

> [!GOALS]
> - Understand why clear spoken English about your work matters as much as the work itself in interviews and in teams.
> - Diagnose your own problem: **rambling**, **under-answering**, **hedging** or **vocabulary gaps under pressure**.
> - Use one shape for almost every answer: **context → problem → what I did → result**, then stop.
> - Prepare three core answers: "tell me about yourself", "why are you leaving?" and the **project walkthrough**.
> - Practise alone effectively, and build real confidence.

## Why this matters

An interviewer cannot see your code while you talk. They judge your work by how clearly you describe it. Two engineers who did the same work can leave completely different impressions: one gives a clear, specific, confident answer; the other rambles, hedges, or says three words and waits. In many companies — especially those that serve foreign clients or work in distributed teams — the ability to explain your work in English is not an extra; it is part of the job.

The good news: **your English does not need to be perfect**. Nobody in a good engineering interview is scoring your accent or grammar. They are listening for clarity, structure and confidence, and all three can be learned with deliberate practice. This chapter opens Part XV, on communication in English; it builds on the hiring chapters in Part XIV, especially {{ch:how-hiring-works}}.

## The simple idea

Telling someone about your work is like giving directions to a visitor. Good directions start from where they are, give the main route, mention the one tricky turn, and stop. Bad directions either describe every building on the way ("rambling") or just point vaguely ("under-answering"), and a nervous guide adds "I think, maybe" to everything ("hedging") until the visitor trusts none of it.

> [!ANALOGY]
> Describing your work is like giving directions: start from where the listener is, give the main route, mention the tricky turn, and stop.
>
> **Where the analogy breaks:** a visitor follows your directions and finds out whether they were right. An interviewer cannot check your work — they only hear the description. So a vague description of excellent work scores worse than a clear description of good work.

## The proper definition and key words

**Speaking about your work** means describing what you built, decided and achieved in a way that a listener can follow, remember and question.

Key words:

- **Rambling** — continuing past the answer, adding detail until the listener is lost.
- **Under-answering** — giving too little, so the listener must ask repeatedly.
- **Hedging** — weakening every statement with "I think", "maybe", "sort of", "kind of".
- **Filler** — sounds and words that fill silence: "umm", "like", "basically", "actually".
- **Signposting** — telling the listener the structure: "there were two problems — first…, second…".
- **Topic bank** — prepared vocabulary and phrases for subjects you talk about often.

## Diagnose your problem

### Level 1 — The four common problems

| Problem | Sounds like | Effect | Fix |
|---|---|---|---|
| **Rambling** | Starting, adding detail, going back, never finishing | Listener loses the thread; scored as "unclear" | The four-part shape; stop after the result |
| **Under-answering** | "Did you use transactions?" — "Yes." | Interviewer must pull every detail; seems shallow or unsure | Always add *what* and *why* |
| **Hedging** | "I think maybe we sort of used a kind of caching approach…" | Sounds unsure even when correct | Remove hedges from prepared answers |
| **Vocabulary gaps under pressure** | Stopping mid-sentence, searching for a word, restarting | Lost thread, nervousness | Topic banks and rehearsal ({{ch:technical-english}}) |

Record yourself answering "What do you do at your current job?" and listen once. You will recognise your main problem quickly.

## The shape of a good answer

### Level 1 — Context → problem → what I did → result

> "I was the only developer on a billing system used by about two thousand customers **(context)**. The monthly report took forty seconds to load and users were complaining **(problem)**. I looked at the query, found it was scanning the whole invoices table, rewrote it and added two composite indexes **(what I did)**. It now loads in under three seconds, and the complaints stopped **(result)**."

Four sentences, under thirty seconds. It answers the question, it is specific, and it invites a good follow-up question ("How did you choose the indexes?").

**Then stop talking.** The silence after your result is not failure — it is the interviewer's turn. People who cannot bear the silence keep adding detail and turn a strong answer into a rambling one.

### Level 2 — Useful phrases

| Purpose | Phrases |
|---|---|
| Setting context | "I was working on…", "The system was…", "Our team was responsible for…" |
| Stating the problem | "The problem was that…", "Users were seeing…", "We needed to…" |
| Describing actions | "I investigated…", "I found that…", "I decided to…, because…", "I tried… first, but…" |
| Giving results | "As a result…", "That reduced… from… to…", "Since then…" |
| Signposting | "There were two parts to this. First… Second…", "The short answer is…; the longer answer is…" |
| Checking depth | "Would you like me to go into more detail on the database part?" |

Use **"I"** for what you did and **"we"** for what the team did — interviewers need to know your part ({{ch:the-interview-conversation}}).

## Three answers to prepare

### Level 2 — "Tell me about yourself" (about ninety seconds)

Asked in almost every interview. Four parts, one or two sentences each:

1. **Now**: "I'm a software engineer with three years of experience, currently the only developer on a PHP and AngularJS product."
2. **What that involves**: "It's a billing and reporting system for about two thousand customers. I handle everything — features, bugs, deployments and talking to the client."
3. **Recent work**: "Recently I've moved into TypeScript, Node.js, React and PostgreSQL, and built two applications end to end — the main one is a booking API with measured performance work."
4. **What you want**: "I'm looking for a team with senior engineers and real code review, because that's what I haven't had."

Then stop.

### Level 2 — "Why are you leaving?" (about sixty seconds)

Never criticise your employer. Say what you **want**, and end on what you have already done about it:

> "It's been a stable job, and I've learned a lot about maintaining a system I didn't write. But there's no code review and no one more senior to learn from, so I stopped growing. I decided to fix that myself: I learned a modern stack and built two projects properly. Now I want to keep growing in a team where that's normal."

### Level 3 — The project walkthrough (about twelve minutes, adjustable)

1. **What it does and for whom** (about thirty seconds).
2. **Why you built it** (about thirty seconds).
3. **Architecture** (about two minutes) — draw it if you can ({{ch:presenting-a-design}}).
4. **Data model** (about two minutes).
5. **The hardest part** (about three minutes) — where most of the value is.
6. **What you measured** (about two minutes) — numbers separate you from others.
7. **What you would do differently** (about two minutes) — this is what senior engineers sound like.

Most candidates skip parts 6 and 7; they impress interviewers most, because numbers prove you measured and naming your own flaws proves judgement ({{ch:projects-that-prove-skill}}). Practise a two-minute version too.

## Practice and confidence

### Level 3 — Practising alone

- **Record yourself** answering one question for about two minutes; listen back **once**, to notice, not to criticise yourself.
- **Listen for three things**: long silences, the point where you should have stopped, and hedge words. Count them; aim to reduce them.
- **Narrate while you code**: say what you are doing as you type, in English. It feels strange at first and becomes normal; it trains exactly the skill coding interviews test ({{ch:talking-about-code}}).
- **Think in English about technical work**: translating from another language in your head adds delays that sound like uncertainty. Since you already read and write code in English, speaking about it in English is a short step.
- **Practise with people** when you can: friends, study groups, mock interviews ({{ch:technical-interview-guide}}).

### Level 3 — Removing hedges

Write your prepared answers down, **cross out** every "I think", "maybe", "sort of", "kind of", "basically", and read the shorter version aloud. Compare:

- Hedged: "I think we maybe used Redis for kind of caching, I'm not sure if it was the best way."
- Clear: "We used Redis to cache product pages for sixty seconds. It cut database load by about half. The trade-off was that prices could be up to a minute stale."

Honest uncertainty is different from hedging: "I haven't measured that, but I'd expect…" is precise and confident ({{ch:questions-you-cannot-answer}}).

### Level 4 — Where confidence comes from

Confidence in interviews comes mainly from **having done the thing you describe**. When you designed, built, deployed and measured something yourself, there is nothing to hedge about — the uncertainty disappears because you know. That is another reason the projects in this book matter: they give you work you can describe with conviction.

### Level 4 — Adjusting to the listener

- **Non-technical listeners** (recruiters, managers from other departments, clients): no jargon. "It's an app for splitting expenses in a group — like when friends go on a trip and everyone pays for different things, it works out who owes whom" ({{ch:explaining-technical-work}}).
- **Technical listeners**: name technologies and decisions, and be ready to go deeper.
- **Ask when unsure**: "Would you like the high-level picture or the technical details?"

## From beginner to enterprise

**Level 1–2 — clear basics.** Diagnosing your problem; the four-part shape; stopping after the result; useful phrases; prepared introduction and reason for leaving.

**Level 3 — prepared and practised.** The project walkthrough in several lengths; recording and reviewing yourself; narrating while coding; removing hedges.

**Level 4 — confident and adaptable.** Confidence from real work; adjusting to technical and non-technical listeners; checking what depth the listener wants.

**Level 5 — senior communication.** Explaining complex decisions to executives, presenting to large groups, representing your team ({{ch:technical-leadership}}).

**Level 6 — influence.** Talks, demos and explanations that shape decisions across an organisation.

## Real-world use cases

### The rambling answer fixed

- **Story**: an engineer's answer to "what do you do at your job?" took four minutes and wandered through five topics. Using the four-part shape and one concrete example, the same answer took forty seconds — and the interviewer asked three follow-up questions about it.

### The non-technical explanation

- **Story**: in a final round with a product director, a candidate explained their booking system's double-booking protection as "the database itself refuses two appointments in the same slot, so even if two people click at the same moment, only one booking succeeds". The director remembered that sentence in the debrief.

## Common mistakes

### Beginner: memorising scripts word for word

**Consequence:** sounds robotic and breaks when interrupted. **Fix:** prepare structures and key phrases, not exact words.

### Beginner: no concrete example

**Fix:** one specific story per question.

### Beginner: one-word answers

**Fix:** answer, then add what and why.

### Intermediate: filling every silence

**Fix:** finish with the result and stop.

### Intermediate: "we" for everything

**Fix:** say clearly what you did.

### Intermediate: jargon with non-technical listeners

**Fix:** everyday comparisons and outcomes.

## Debugging and troubleshooting

- **"Your answers were too long"**: practise the four-part shape with a timer; aim for under a minute.
- **"I wanted more depth"**: add the why and the numbers; offer to go deeper.
- **Freezing when a word will not come**: describe around it ("the thing that stores the precomputed results — the cache"), then continue ({{ch:interview-under-pressure}}).
- **Feeling nervous about accent**: focus on clarity — speak a little slower, finish sentences, pause between ideas.

## Security summary

- **Do not reveal confidential details** when describing your work: generalise client names, internal numbers and security details.
- **Describe security work carefully**: talk about the kind of problem and the fix, not exploitable details of a live system.

## How a senior engineer thinks about this

- **Clarity is respect.** A clear answer saves the listener work.
- **Structure first.** Context, problem, action, result — then stop.
- **Specific beats impressive.** One real example beats any general claim.
- **Confidence comes from doing.** Build things worth describing.

## Exercises

### Exercise 1 — Use the shape

**Objective:** practise the four-part answer.
**What to do:** answer "Tell me about a problem you solved recently" in four sentences.

<details>
<summary>Show the solution</summary>

"I was building the booking API for my clinic project **(context)**. When I load-tested it, two patients could book the same slot if they clicked at the same moment **(problem)**. I reproduced it with a concurrency test and added a PostgreSQL exclusion constraint so the database rejects overlapping appointments, with the API returning a clear 409 error **(action)**. The test now passes under load, and double bookings are impossible even if the application has a bug **(result)**."

</details>

### Exercise 2 — Remove the hedges

**Objective:** practise confident language.
**What to do:** rewrite: "I think I basically maybe improved the API performance a bit by sort of adding some caching, I guess."

<details>
<summary>Show the solution</summary>

"I improved the product API's performance by caching the product list in Redis for sixty seconds. The p95 response time dropped from about 300 ms to 40 ms. The trade-off is that new prices can take up to a minute to appear."

If you are unsure of a number, say so precisely: "I didn't measure it carefully at the time, but it went from noticeably slow to almost instant."

</details>

### Exercise 3 — Two audiences

**Objective:** practise adjusting level.
**What to do:** explain "we added a message queue between the order service and the email service" to (a) an engineer and (b) a non-technical manager.

<details>
<summary>Show the solution</summary>

- **(a)** "Order creation now publishes an event to an SQS queue; a separate email worker consumes it with retries and a dead-letter queue, so email provider outages no longer fail checkout, and duplicate deliveries are handled by an idempotency check" ({{ch:sns-sqs}}).
- **(b)** "Before, if the email system was slow or down, customers couldn't finish their orders. Now orders are completed straight away, and the confirmation emails are sent shortly afterwards — even if the email system has a problem, it catches up later."

</details>

## Summary

In interviews and teams, your work is judged largely by how clearly you describe it, and perfect English is not required — clarity, structure and confidence are. Diagnose your main problem from a recording: **rambling**, **under-answering**, **hedging** or **vocabulary gaps under pressure**. Answer almost everything with **context → problem → what I did → result**, use clear "I" and "we", signpost structure, and **stop** after the result.

Prepare three answers as structures, not scripts: a ninety-second **introduction** (now, what it involves, recent work, what you want), a sixty-second **reason for leaving** (what you want, what you did about it, no criticism), and a **project walkthrough** in several lengths, including what you measured and what you would do differently. Practise by recording and listening once, narrating while you code in English, removing hedges in writing, and practising with people. Real confidence comes from having done the work, and good communicators adjust their level to the listener.

## Key terms

- **Rambling** — Talking past the point until the listener loses the thread.
- **Under-answering** — Giving answers too short to be useful.
- **Hedging** — Weakening statements with unnecessary qualifiers.
- **Filler words** — Words that fill silence without meaning.
- **Signposting** — Telling the listener how your answer is structured.
- **Four-part answer** — Context, problem, action and result.
- **Project walkthrough** — A structured explanation of a project.
- **Topic bank** — Prepared vocabulary for frequent subjects.

## What comes next

Describing your own work is the start; explaining technical ideas so others understand them is the next skill. The next chapter, {{ch:explaining-technical-work}}, covers explaining concepts, systems and decisions to different audiences — with analogies, levels of detail and checks for understanding.
