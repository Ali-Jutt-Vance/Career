# How Technical Hiring Works

> [!GOALS]
> - Understand hiring from the company's side: why it hires, who decides, and what it is afraid of.
> - Know the stages of a typical software engineering interview process and **what each stage actually scores**.
> - Prepare differently for each stage instead of preparing for "the interview" as one thing.
> - Handle take-home tasks, waiting periods, feedback and rejection sensibly.
> - Recognise how hiring differs between start-ups, product companies, service companies and large international companies.

## Why this matters

Many capable engineers fail interviews not because they lack skill, but because they misunderstand what is being measured. They spend months solving algorithm puzzles and then lose the job in a conversation with the hiring manager about ownership. Or they prepare a beautiful project walkthrough and then freeze when asked to write a simple function while someone watches.

A hiring process is a series of different tests, run by different people, each scoring something different. Once you see the process from the inside — what the company needs, what each interviewer is looking for, and what makes them nervous — preparation becomes focused and much less stressful. This chapter opens Part XIV, about getting hired; the following chapters cover the job market, projects, portfolios, the CV, applications, referrals, interviews, offers and your first months in a new job.

## The simple idea

Hiring is a company trying to reduce risk. Bringing in an engineer is expensive: salary, months of onboarding, access to systems and customers. A bad hire costs even more — wasted time, mistakes, a difficult exit. So the company builds a series of checks, each answering one question: Does this person match what we need on paper? Can they actually write code? Do they understand things deeply? Can they reason about bigger systems? Will they work well with us and stay?

> [!ANALOGY]
> A hiring process is like a series of checkpoints, each answering one question about a candidate: does the paperwork match, can they do the work, do they understand it deeply, will they fit and stay.
>
> **Where the analogy breaks:** checkpoints usually apply fixed rules. Interviews are run by people, who have limited time, different styles and bad days. The same candidate can pass at one company and fail at another for reasons that have little to do with skill. That is why one rejection says much less than it feels like it says.

## The proper definition and key words

**Technical hiring** is the process by which a company finds, evaluates and selects engineers, usually through a sequence of interviews and assessments designed to predict job performance and fit.

Key words:

- **Recruiter / talent acquisition** — the people who run the process, screen candidates and coordinate interviews.
- **Hiring manager** — the person the new engineer would report to; usually the final decision-maker.
- **Interview loop** — the full set of interviews for one candidate.
- **Screen** — an early, shorter interview that filters candidates.
- **Technical round / coding interview** — writing code while an interviewer watches.
- **Deep dive** — a discussion probing the depth of your knowledge and experience.
- **System design interview** — designing a larger system out loud ({{ch:system-design-fundamentals}}).
- **Behavioural interview** — questions about past situations: ownership, conflict, failure.
- **Take-home task** — an assignment completed in your own time.
- **Debrief** — the meeting where interviewers share their scores and decide.
- **Band / level** — the salary range and seniority level the role is hired at.

## The company's side

### Level 1 — Why companies hire, and what they fear

A company opens a role because there is work it cannot do: a product to build, a team that is overloaded, an engineer who left. The hiring manager wants someone who will **reduce that problem quickly** and **not create new ones**.

Their fears are predictable:

- The candidate looks good on paper but **cannot actually build** things.
- The candidate is technically strong but **hard to work with** — does not communicate, does not accept feedback, blames others.
- The candidate will **leave soon**, or does not really want this job.
- The candidate **overstated** their experience.

Every stage is designed to address one of these fears. Your job in each stage is to make the relevant fear go away with evidence.

### Level 1 — Who is involved

- **The recruiter** runs the process and screens early. They are your guide: ask them about the stages, the format and the salary range.
- **Engineers** run the technical rounds and write detailed feedback.
- **A senior engineer or lead** runs the deep dive or design round.
- **The hiring manager** runs the final conversation and usually makes the decision, guided by everyone's feedback in the **debrief**.
- At small companies, one or two people may do everything — the founder might run three of the "stages" in one conversation.

## The stages

### Level 2 — A typical interview loop

| Stage | Who | Typical length | What it really scores |
|---|---|---|---|
| **1. Recruiter screen** | Recruiter | 20–30 min | Match on paper, clear communication, availability, salary within the band |
| **2. Technical screen** | An engineer | 45–60 min | Writing correct code while observed; fundamentals; a short project discussion |
| **3. Technical deep dive** | Senior engineer or lead | 60–90 min | Depth: how things work underneath, design choices, trade-offs |
| **4. System design** (mid-level and above) | Senior engineer or architect | 45–60 min | Structured reasoning about a system you have not built |
| **5. Manager / culture round** | Hiring manager | 30–45 min | Ownership, collaboration, motivation, whether you will stay |

Some companies add a **take-home task** before stage 2, combine stages 3 and 4, or add a conversation with a founder or director at the end. The overall order rarely changes. The whole process commonly takes **two to six weeks**, and gaps of a week between stages are normal.

### Level 2 — Stage 1: the recruiter screen

**Scored on**: does your background match the job advert; can you talk clearly and concisely in English; when can you start; is your salary expectation inside their range.

**What loses it**: a rambling answer to "tell me about yourself", being unable to describe your current work simply, sounding unsure what you want, a salary expectation far outside the band, bad audio.

**Prepare three things**:

1. **A two-minute introduction**: where you are now, what you have done, something you built recently, and what you are looking for. Practise it until it is natural ({{ch:speaking-about-your-work}}).
2. **Why you are looking**: a short, honest reason with no criticism of your current employer, ending on what you are doing about it.
3. **Your salary answer**: prepared in advance, never improvised ({{ch:the-salary-conversation}}).

**Ask before the call ends**: what the process is, how many stages, what the technical rounds cover, and the range for the role. Recruiters usually answer.

### Level 2 — Stage 2: the technical screen

**Scored on**: can you write **correct** code while another person watches and talks to you — not the cleverest solution, but a correct one, with your thinking visible.

How to run the room:

1. **Restate the problem** in your own words — it catches misunderstandings and gives you time to think.
2. **Ask clarifying questions**: input size, empty inputs, duplicates, expected output format. Asking is scored positively.
3. **Say your approach before typing**: "I'll count occurrences with a hash map, then find the first item with count one — linear time and space."
4. **Write a simple correct version first**, then improve it.
5. **Narrate while you type.** Silence is the most damaging thing in this round: interviewers cannot score thinking they cannot hear ({{ch:talking-about-code}}).
6. **Test out loud** with a small example and state the complexity ({{ch:big-o}}).

When stuck, say what you know and what you are trying to work out — that is a good moment, not a failure ({{ch:questions-you-cannot-answer}}). The last ten minutes are often about a project: have a short walkthrough ready ({{ch:projects-that-prove-skill}}).

### Level 3 — Stage 3: the technical deep dive

**Scored on**: depth. The interviewer picks something on your CV and goes **three questions deep**: "You used JWTs." → "Why not sessions?" → "How do you log someone out?" → "What if the refresh token is stolen?" ({{ch:jwt}}).

**Prepare** by writing that chain yourself for every technology and project on your CV: what it is, why you chose it, what can go wrong, what the alternatives are. If you cannot go three levels deep on something, learn it — or remove it from your CV.

**The strongest answer** in this round is often an honest limit stated clearly: "I haven't run this at scale in production; I know it can fail in these ways, and this is what I would watch." Experienced interviewers trust candidates who know where their knowledge ends ({{ch:technical-interview-guide}}).

### Level 3 — Stage 4: system design

**Scored on**: structure, not a "correct" answer. Interviewers watch whether you clarify requirements before designing, estimate scale, define interfaces, name trade-offs and know where the design would break.

Follow the method visibly: clarify (about five minutes), estimate, define the main API, draw a simple high-level design, go deep on one component, discuss bottlenecks and what changes at ten times the load ({{ch:system-design-fundamentals}}, {{ch:presenting-a-design}}). Answers drawn from systems you have actually built and deployed are especially convincing.

### Level 3 — Stage 5: the manager conversation

**Scored on**: ownership, handling disagreement and failure, motivation for **this** job, and whether you will stay.

Common questions:

- Tell me about yourself.
- Why are you leaving your current job?
- Tell me about a difficult bug you solved.
- Tell me about a disagreement about a technical decision.
- Tell me about a time you failed or shipped something broken.
- What is the hardest thing you have built?
- What do you want to be doing in two years?
- What questions do you have for us?

Write each answer as a story in **STAR** form — **S**ituation, **T**ask, **A**ction, **R**esult — then practise saying each in about two minutes ({{ch:the-interview-conversation}}). Prepare three specific questions about the work: how code is reviewed, what the team struggles with, what the first months would look like. Asking nothing suggests you are not really interested.

### Level 3 — Take-home tasks

- **Decide your time budget** in advance and keep to it; these tasks grow without limit if you let them.
- **Always include**: a README explaining how to run it and what you decided, some tests, a clean commit history, and a short note on **what you left out and why**.
- **Do not over-build**: a small, clean, tested and documented solution beats a large, messy one ({{ch:clean-code}}, {{ch:testing}}).

## After the interviews

### Level 4 — The debrief and the decision

Interviewers write feedback independently, then meet. A common pattern: each gives a recommendation (strong yes, yes, no, strong no) with evidence. One strong concern — about honesty, collaboration or a fundamental skill gap — can outweigh several positive rounds. The hiring manager decides, sometimes with a senior approver, then the recruiter discusses the offer ({{ch:negotiating-offers}}).

### Level 4 — Waiting, feedback and rejection

- **Waiting** a week or two between stages is normal; silence after a final round often means internal delays or another candidate in the process. Follow up politely once after about a week.
- **Keep applying** while processes are running. Slowing your search because one process is going well is the most common self-inflicted problem ({{ch:applying}}).
- **Ask for feedback** after a rejection; some companies give it, many do not. Take what you get calmly.
- **Rejection is noisy**: interviewers differ, roles change, internal candidates appear. Review what you can improve, and continue.

### Level 4 — How different companies hire

- **Start-ups**: fewer, less formal stages; founders involved; practical tasks; speed and breadth valued.
- **Product companies**: structured loops similar to the table above; strong focus on fundamentals and ownership.
- **Service companies and agencies** (common in Pakistan's software industry): often a technical test and interviews focused on the technologies clients use, communication with clients, and how quickly you can be productive on projects.
- **Large international companies**: highly structured, with several coding rounds, system design for experienced roles, behavioural interviews with standard rubrics, and hiring committees.
- **Remote roles for international employers**: extra weight on written communication, independence and overlap with their working hours ({{ch:remote-work}}).

## From beginner to enterprise

**Level 1–2 — understanding the process.** What companies fear; who is involved; the stages; preparing the introduction, the reason for leaving and the salary answer; running a coding round out loud.

**Level 3 — preparing each stage.** Three-deep chains for every CV item; a visible system design method; written and rehearsed STAR stories; take-home discipline.

**Level 4 — managing the process.** Understanding debriefs; keeping several processes going; handling waiting and rejection; adapting to different kinds of companies.

**Level 5 — the other side.** Interviewing others: writing fair questions, scoring with evidence, avoiding bias, and writing useful feedback.

**Level 6 — organisations.** Designing hiring processes and rubrics that predict performance and treat candidates well.

## Real-world use cases

### The candidate who prepared for the wrong test

- **Story**: an engineer solved hundreds of algorithm problems, passed the coding rounds easily, then failed the manager round: asked about a past failure, they said they could not think of one, and asked no questions about the team. With written STAR stories and prepared questions, the next process ended in an offer.

### The honest deep dive

- **Story**: in a deep dive, a candidate said "I configured Redis caching, but I haven't handled cache invalidation in a complicated case — here is how I would think about it." The interviewer later wrote that this honesty was the strongest signal in the round.

## Common mistakes

### Beginner: preparing only algorithms

**Fix:** prepare each stage for what it scores.

### Beginner: silence in coding rounds

**Fix:** narrate your thinking all the time.

### Beginner: improvising "tell me about yourself"

**Fix:** a practised two-minute introduction.

### Intermediate: CV items you cannot discuss deeply

**Fix:** three-deep chains, or remove the item.

### Intermediate: jumping into design without clarifying

**Fix:** spend the first minutes on requirements.

### Intermediate: asking no questions

**Fix:** three specific questions about the work.

### Process: pausing applications while one process looks good

**Fix:** keep applying until an offer is signed.

## Debugging and troubleshooting

- **You pass screens but fail technical rounds**: practise coding aloud with a timer and another person watching (mock interviews).
- **You pass technical rounds but fail manager rounds**: write and rehearse STAR stories; work on concise answers.
- **You are rejected at the CV stage**: the CV or targeting is the problem ({{ch:the-cv}}, {{ch:applying}}).
- **You freeze under pressure**: practise in realistic conditions; learn recovery phrases ({{ch:interview-under-pressure}}).
- **Feedback mentions communication**: practise explaining your work simply ({{ch:explaining-technical-work}}).

## Security summary

- **Protect personal data**: share ID documents, salary slips and bank details only once an offer is real, and only through official channels.
- **Watch for scams**: fake recruiters asking for payment, "interviews" on unusual apps, or tasks that look like free work on a real product.
- **Take-home tasks**: do not include your current employer's code or confidential information.

## How a senior engineer thinks about this

- **Every stage answers a question.** Prepare the answer each interviewer needs.
- **Evidence beats claims.** Projects, stories and visible thinking convince.
- **Honesty is a strength.** Knowing your limits is part of seniority.
- **The process is noisy.** Keep going, keep improving, keep several options open.

## Exercises

### Exercise 1 — Write your introduction

**Objective:** prepare the most-asked question.
**What to do:** write a two-minute "tell me about yourself" for your current situation.

<details>
<summary>Show the solution</summary>

A model structure:

"I'm a back-end developer with [N] years of experience, currently at [company type], where I build [what] using [main technologies]. Recently I [a concrete achievement — 'built a payments integration that now processes all online orders' or 'reduced the main API's response time by moving reports to a background queue']. Outside work, I built [project], which [what it does and what you learned]. I'm now looking for a role where [what you want: working on larger systems, in a team with strong code review, on a product with real users], which is why this position interested me."

Keep it to about 250 words, practise it aloud until it sounds natural, and adapt the last sentence to each company.

</details>

### Exercise 2 — Build a three-deep chain

**Objective:** prepare for deep dives.
**What to do:** pick one technology on your CV and write three levels of questions and your answers.

<details>
<summary>Show the solution</summary>

Example for PostgreSQL indexes:

1. *Why did you add an index on `orders(customer_id)`?* — The order history page filtered by customer and was doing a sequential scan on a large table.
2. *How did you know it helped?* — `EXPLAIN ANALYZE` showed an index scan instead of a sequential scan, and the page's p95 latency dropped from about 900 ms to 40 ms ({{ch:query-optimization}}).
3. *What is the cost of the index?* — Extra storage and slower writes, because every insert updates the index; for this read-heavy table it was worth it. A composite index `(customer_id, created_at)` would also help the sort ({{ch:indexes}}).

If you cannot answer the third level, study it before the interview.

</details>

### Exercise 3 — Prepare a STAR story

**Objective:** prepare for the manager round.
**What to do:** write a STAR story for "tell me about a time you shipped something broken".

<details>
<summary>Show the solution</summary>

- **Situation**: "I released a change to our checkout discount logic on a Friday afternoon."
- **Task**: "Customers with only free items started getting errors at checkout; I was responsible for the release."
- **Action**: "I rolled back within fifteen minutes, then found a division by zero for orders with a zero total. I added tests for edge cases, and suggested we stop releasing late on Fridays and add a checkout success alert."
- **Result**: "About forty customers were affected; support contacted them with a voucher. The alert and tests are still in place, and we have not had a similar incident."

Keep the focus on what **you** did, be honest about the mistake, and end with what changed.

</details>

## Summary

Hiring is a company reducing risk: it fears candidates who cannot build, are hard to work with, will leave soon or overstate their experience. A typical **interview loop** has a **recruiter screen** (match, communication, availability, salary band), a **technical screen** (correct code written out loud), a **deep dive** (three questions deep on anything you claimed), a **system design** round for experienced roles (structure, estimates, trade-offs) and a **manager round** (ownership, motivation, staying), sometimes with a take-home task.

Prepare for each stage separately: a practised introduction, an honest reason for leaving and a prepared salary answer; coding that restates, clarifies, explains, starts simple, narrates and tests; three-deep chains for every CV item and honest limits; a visible design method; written and rehearsed **STAR** stories and good questions; and disciplined take-home tasks. Decisions come from a **debrief**; waiting is normal, rejection is noisy, and you should keep applying until an offer is signed. Different kinds of companies — start-ups, product companies, service companies, large international employers and remote roles — weight the stages differently.

## Key terms

- **Technical hiring** — The process of finding, evaluating and selecting engineers.
- **Recruiter** — The person who runs the hiring process and screens candidates.
- **Hiring manager** — The person who would manage the new hire and usually decides.
- **Interview loop** — The complete set of interviews for one candidate.
- **Recruiter screen** — An early call checking basic fit and expectations.
- **Technical screen** — An early coding interview.
- **Deep dive** — An interview probing the depth of a candidate's knowledge.
- **System design interview** — An interview about designing a large system.
- **Behavioural interview** — An interview about past situations and behaviour.
- **STAR method** — Structuring stories as Situation, Task, Action and Result.
- **Take-home task** — An assignment completed outside the interview.
- **Debrief** — The meeting where interviewers combine feedback and decide.
- **Salary band** — The range of pay for a role and level.

## What comes next

Knowing how hiring works is half the picture; the other half is knowing where the jobs are. The next chapter, {{ch:the-job-market}}, looks at the software job market: types of employers, what they look for, how demand differs by skill and level, and how to position yourself.
