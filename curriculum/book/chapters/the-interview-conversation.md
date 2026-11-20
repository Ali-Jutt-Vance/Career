# The Interview Conversation

> [!GOALS]
> - Recognise the **four question types** — factual, experience, hypothetical and behavioural — and shape each answer to fit.
> - Answer behavioural questions with **STAR**, keeping the focus on what *you* did.
> - Prepare a bank of stories that covers most behavioural questions.
> - Manage the conversation: pause, signpost, clarify, notice interruptions and check in.
> - Ask strong questions of your own and handle the practical details of a video interview.

## Why this matters

An interview is not an exam. It is a conversation in which someone decides whether they want to work with you. Two candidates with the same knowledge can get opposite results: one answers each question at the right length, with clear structure and specific examples; the other gives a four-minute history to a forty-second question and one sentence to a question that wanted a story.

The English needed is not advanced. What matters is **shape**: knowing what kind of answer each question wants. {{ch:technical-interview-guide}} covers the stages and technical rounds; this chapter covers how to talk through them.

## The simple idea

Answering interview questions is like serving food in the right container. Soup goes in a bowl, a sandwich on a plate. The food might be excellent, but soup on a plate is a mess. Each question type has its container — a short direct answer, a story, a structured reasoning process — and the skill is noticing which one is needed.

> [!ANALOGY]
> Interview answers are like food in the right container: good content in the wrong shape still makes a mess.
>
> **Where the analogy breaks:** a waiter knows the order before serving. In an interview you sometimes cannot tell what depth is wanted — so you serve a small portion and ask: "Would you like me to go deeper?"

## The proper definition and key words

The **interview conversation** is the spoken exchange in which an interviewer assesses your skills, experience and how you work with others.

Key words:

- **Behavioural question** — "Tell me about a time when…", asking about past behaviour as evidence of future behaviour.
- **STAR** — Situation, Task, Action, Result: a structure for behavioural answers.
- **Signposting** — telling the listener the shape of your answer before giving it.
- **Clarifying question** — a question you ask to understand an open problem before answering.

## The four question types

### Level 1 — Match the shape

| Type | Example | Typical length | Shape |
|---|---|---|---|
| **Factual** | "What's the difference between an inner join and a left join?" | 20–40 seconds | Direct answer, then one example |
| **Experience** | "Tell me about a project you built." | 2–5 minutes | Context → problem → what you did → result |
| **Hypothetical** | "How would you design a URL shortener?" | 5–45 minutes | Clarify → structure → reason aloud → trade-offs |
| **Behavioural** | "Tell me about a time you disagreed with a colleague." | About 2 minutes | STAR |

The most common error is answering a **factual** question like an **experience** question: "What is an index?" wants forty seconds, not the history of your last project. The opposite error is just as costly: answering an experience question in one sentence, which suggests thin experience or difficulty explaining.

**When in doubt, answer briefly and offer more:**

> "That's the short version — would you like me to go into how we implemented it?"

This hands the depth decision to the interviewer, which is where it belongs.

A factual answer in the right shape:

> "An inner join returns only the rows that match in both tables; a left join returns every row from the left table, with NULLs where there's no match. For example, a left join from customers to orders also lists customers who have never ordered." ({{ch:sql}})

## STAR for behavioural questions

### Level 2 — The structure

- **Situation** — where and when. One or two sentences.
- **Task** — what needed to happen and what your responsibility was. One sentence.
- **Action** — what **you** specifically did. Most of the answer.
- **Result** — what happened, with a number if one exists, and what you learned.

Example — "Tell me about a difficult bug":

> **Situation:** "A client reported that some invoices had wrong totals — roughly one in twenty."
> **Task:** "I was the only developer on the product, so finding it was my job."
> **Action:** "I couldn't reproduce it locally, so I added logging around the total calculation and waited for it to happen in production. The logs showed the currency rate was sometimes fetched after the total was calculated — a race condition between two asynchronous calls. I changed the code to await the rate first, and added a test that delays the rate fetch to prove the order."
> **Result:** "The wrong totals stopped completely. I also added a check that flags any invoice whose total doesn't match its line items, which has caught two unrelated problems since."

About two minutes, complete, and it shows a debugging method without being asked ({{ch:asynchronous-javascript}}).

### Level 2 — "I", not "we"

Under pressure, people describe what the team did: "we decided", "we changed". The interviewer is assessing **you**. Say "I" when it was you, and "we" when it truly was the team — then say what your part was: "We chose to move to queues; I wrote the migration plan and the consumer."

### Level 2 — A story bank

Write these stories in STAR form in advance. Most behavioural questions map to one of them:

1. A difficult bug you found and fixed.
2. A disagreement about a technical decision.
3. A failure, or a time you shipped something broken.
4. A time you had to learn something quickly.
5. An unreasonable deadline or a changing requirement.
6. Something you built that you are proud of.
7. Explaining something technical to a non-technical person ({{ch:explaining-technical-work}}).
8. Taking on something nobody asked you to do.

Your commit history, old tickets and pull requests are good sources: going through them brings forgotten stories back. One story can often answer several questions — the bug story also works for "a time you worked under pressure".

## Hard questions

### Level 3 — Answer honestly

Some questions feel dangerous. Honest, calm answers work better than defensive ones.

**"Why did you stay so long somewhere you weren't growing?"**

> "It was stable, the product depended on me, and I learned a lot about owning a system end to end. It took time to see clearly that I wasn't going to grow further there — once I did, I started building skills in [specific technologies], and that's what led me to apply here."

**"How much of this did you write yourself?"** — for example when a portfolio was built with AI help:

> "Honestly, early on I relied on AI-generated code more than I'm comfortable with. I noticed I couldn't always explain it, so I changed how I work: I write the core logic myself, use AI for suggestions and reviews, and make sure I can explain every line. I'm happy to walk through any part of this project now." ({{ch:projects-that-prove-skill}})

Candour that ends with evidence is persuasive; defensiveness is not.

**"What's your biggest weakness?"** — a real one, with what you are doing about it:

> "I used to say yes to too many things and then rush. Now I estimate before agreeing and tell people early if something won't fit."

## Managing the conversation

### Level 3 — Habits that help

- **Pause before answering.** Two or three seconds to structure your answer is normal and gives a better answer than starting immediately and getting lost.
- **Signpost long answers.** "There were three things that made it hard — first…" The listener now knows the shape.
- **Ask clarifying questions** for open problems. One or two questions before answering is viewed positively at every level ({{ch:system-design-fundamentals}}).
- **Stop when interrupted.** It usually means they have what they need, or you have gone off track. Continuing over an interruption is a common mistake.
- **Check in on long answers.** "Is this the level of detail you wanted, or should I go deeper on the implementation?"
- **Use their name** once or twice; it makes the exchange feel like a discussion.

### Level 3 — Hypothetical questions

For "How would you…?" questions, think aloud with structure ({{ch:talking-about-code}}, {{ch:presenting-a-design}}):

> "Let me check the requirements first — how many URLs per day, and do links expire? … OK. I'd start with a simple design: an API, a database table mapping short codes to URLs, and a cache for popular links. Then I'll look at how to generate unique codes and what happens at higher scale."

## Your questions for them

### Level 4 — Ask well

Every interview ends with "Do you have any questions?" This is part of the assessment, not a formality: asking nothing is a negative signal. Prepare several specific questions about the work:

- "How is code reviewed here? What does it look like day to day?"
- "What is the team struggling with most at the moment?"
- "What would the first three months look like for someone joining?" ({{ch:first-ninety-days}})
- "How are technical decisions made — who decides, and how?"
- "How do you handle on-call and incidents?" ({{ch:observability-and-incidents}})

Save salary, leave and working hours for the recruiter or the offer stage, not a technical round ({{ch:the-salary-conversation}}). Choose questions that connect to what you have said — if you said you want stronger code review, ask about code review.

### Level 4 — Practical details

- **Audio** — test it first. Bad audio makes a good candidate sound uncertain, and interviewers may not say so.
- **Camera** at eye level; look at the camera when making a point.
- **Water** within reach.
- **Notes** are fine as bullet points, not scripts — reading an answer is audible.
- **Close everything else.** Notifications show on your face.

## From beginner to enterprise

**Level 1 — question types.** Matching length and shape to factual, experience, hypothetical and behavioural questions.

**Level 2 — STAR and the story bank.** Prepared stories with a clear "I".

**Level 3 — conversation management.** Pauses, signposts, clarifying questions, interruptions, check-ins, honest answers to hard questions.

**Level 4 — closing.** Strong questions and good practical set-up.

**Level 5 — senior interviews.** Stories about influence, trade-offs and leadership; discussing strategy ({{ch:technical-leadership}}).

**Level 6 — the interviewer.** Asking structured questions and assessing fairly — the same skills from the other side.

## Real-world use cases

### The four-minute index

- **Story**: asked "What is a database index?", a candidate spent four minutes describing their last project before defining the term. Practising a forty-second answer plus "Would you like an example from my work?" changed the feel of their next interviews.

### The "we" answer

- **Story**: a candidate's stories all used "we". The interviewer could not tell what they had done and rated them low on ownership. Rewritten with "I" for their actions, the same stories showed clear impact.

## Common mistakes

### Beginner: long answers to factual questions

**Fix:** direct answer, one example, offer more.

### Beginner: improvising behavioural stories

**Fix:** a written story bank in STAR form.

### Intermediate: "we" for everything

**Fix:** "I" for your actions.

### Intermediate: talking over interruptions

**Fix:** stop and listen.

### Intermediate: no questions at the end

**Fix:** several prepared, specific questions.

## Debugging and troubleshooting

- **Answers feel rambling**: signpost and use STAR.
- **Interviewers seem to want more**: check in — "Would you like more detail?"
- **You freeze on a behavioural question**: map it to a story in your bank; pause to choose ({{ch:interview-under-pressure}}).
- **You don't know an answer**: say so and reason towards it ({{ch:questions-you-cannot-answer}}).

## Security summary

- **Protect confidential details in stories.** Describe problems without naming clients or revealing internal systems, security weaknesses or data. "A payments client" is enough.
- **Never share code** from a current or past employer as an example unless it is public.

## How a senior engineer thinks about this

- **Shape is half the answer.** Match the question type.
- **Evidence over claims.** Stories with actions and results.
- **Own your part.** "I" when it was you.
- **It's a conversation.** Check in, clarify and ask questions back.

## Exercises

### Exercise 1 — Identify the type

**Objective:** practise recognition.
**What to do:** classify: (a) "What does HTTP 401 mean?" (b) "How would you scale a chat app?" (c) "Tell me about a time you missed a deadline." (d) "Walk me through your portfolio project."

<details>
<summary>Show the solution</summary>

(a) Factual — a short direct answer ("unauthenticated: the request lacks valid credentials"). (b) Hypothetical — clarify, structure, reason aloud. (c) Behavioural — STAR. (d) Experience — context, problem, what you did, result.

</details>

### Exercise 2 — A STAR answer

**Objective:** practise STAR.
**What to do:** write a STAR answer for "Tell me about a time you learned something quickly", about learning Docker to deploy a project.

<details>
<summary>Show the solution</summary>

**Situation:** "My portfolio project ran on my laptop, but I wanted it on a real server so interviewers could try it."
**Task:** "I had to learn enough Docker to package and deploy it."
**Action:** "I went through the official tutorial, then containerised the API and database with Docker Compose. My first image was over a gigabyte, so I learned multi-stage builds and got it to about 150 MB. I wrote a short README so anyone could run it."
**Result:** "It's deployed, and I now use Compose for every project. I also understand containers well enough to discuss them in interviews like this one." ({{ch:docker}})

</details>

### Exercise 3 — Questions for them

**Objective:** practise closing.
**What to do:** write three questions for a back-end role at a company that recently moved to microservices.

<details>
<summary>Show the solution</summary>

"How has the move to microservices gone — what has been harder than expected?" "How do teams handle changes to shared APIs between services?" "What would the first three months look like for someone joining the back-end team?"

</details>

## Summary

An interview is a conversation, and the shape of each answer matters as much as the content. Recognise the **four question types**: **factual** (a short direct answer and an example), **experience** (context, problem, actions, result), **hypothetical** (clarify, structure, reason aloud, trade-offs) and **behavioural** (STAR). When unsure of the depth wanted, answer briefly and offer more.

Use **STAR** — Situation, Task, Action, Result — with most time on the Action and "I" for what you did. Prepare a **story bank** covering bugs, disagreements, failures, fast learning, deadlines, pride, explaining and initiative. Answer hard questions honestly and end with evidence. Manage the conversation by pausing, signposting, asking clarifying questions, stopping when interrupted and checking in. Finish with specific **questions of your own** about the work, and get the practical details — audio, camera, notes — right.

## Key terms

- **Factual question** — A question with a direct technical answer.
- **Experience question** — A question about work you have done.
- **Hypothetical question** — A "how would you…" problem to reason through.
- **Behavioural question** — A "tell me about a time…" question about past behaviour.
- **STAR** — Situation, Task, Action, Result.
- **Story bank** — Prepared STAR stories covering common behavioural themes.
- **Signposting** — Announcing the structure of your answer.
- **Clarifying question** — A question to understand a problem before answering.

## What comes next

In technical rounds you are asked to code while someone watches and listens. The next chapter, {{ch:talking-about-code}}, covers thinking aloud: describing code, explaining your approach, narrating as you write and discussing code with reviewers.
