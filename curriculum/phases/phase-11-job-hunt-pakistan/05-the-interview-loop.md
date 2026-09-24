# Phase 11 — Chapter 5: The Interview Loop

> *"Every stage is scored on a different thing. Preparing for the wrong one is the most common way good candidates lose."*

---

## Chapter Overview

The interview process at a Tier 2 Pakistani company has four or five distinct stages, and each measures something different. Candidates routinely prepare for all of them as though they were one thing — usually by grinding algorithm problems — and then fail the screening call, which does not contain any algorithms at all.

This chapter walks through each stage: what it is for, who runs it, what they are actually scoring, how to prepare, and the specific ways your profile is likely to be probed. Read it in week 10, before your first serious loop, and reread the relevant section the night before each stage.

## The shape of a typical loop

| Stage | Who | Length | What it actually measures |
|---|---|---|---|
| **1. Recruiter screen** | HR or talent acquisition | 20–30 min | Do you match on paper, communicate clearly, and fit the band |
| **2. Technical screen** | An engineer | 45–60 min | Fundamentals, one moderate coding problem, your project |
| **3. Technical deep dive** | Senior engineer or lead | 60–90 min | Depth, design, trade-offs, and how you think |
| **4. System design** *(T2 and above)* | Senior or architect | 45–60 min | Structured reasoning about a system you have not built |
| **5. Manager / culture** | Hiring manager | 30–45 min | Ownership, collaboration, motivation, whether you will stay |

Some companies fold 3 and 4 together, some add a take-home task before stage 2, some add a founder or director conversation at the end. The order rarely changes.

**Total elapsed time: two to six weeks.** Between-stage waits of a week are normal and mean nothing.

## Stage 1 — the recruiter screen

Twenty minutes, usually on the phone or a video call, often within days of a referred application.

**What it is scored on:** whether your background matches the advert, whether you can hold a clear conversation in English, your notice period and availability, and whether your salary expectation is inside their band. That is genuinely all.

**What loses it:** rambling on "tell me about yourself"; being unable to explain your current work concisely; sounding uncertain about what you want; naming a salary expectation far outside the band; poor audio.

**Prepare three things and nothing else.**

*The two-minute introduction.* Where you are now, what you have done for three years, what you have built recently, what you are looking for. Rehearsed until it is automatic, because it is asked every single time and it sets the tone for everything after it.

*The reason for leaving.* Ninety seconds, no criticism of your employer, ending on what you have done about it. The version in Chapter 1 is the model.

*The salary answer.* Do not improvise this. Chapter 6 is the whole handling, and this is the stage at which it is asked.

**Ask them, before the call ends:** what the full process is, how many stages, what the technical round covers, and what the band for the role is. Internal recruiters usually answer all four, and the answers shape your preparation for the next three weeks.

## Stage 2 — the technical screen

Forty-five to sixty minutes with an engineer. Usually one coding problem of easy-to-medium difficulty, some language questions, and ten minutes on your projects.

**What it is scored on:** can you write correct code while another person watches and talks to you. Not elegance, not optimality — correctness, and the visibility of your thinking.

**This is the stage your last three years hurt most,** and it is the reason the plan forbids AI for eight weeks and drills speaking aloud from week one.

**How to run the room:**

1. **Restate the problem in your own words** before writing anything. This catches misunderstandings and it buys you thirty seconds of thinking time that looks like diligence.
2. **Ask two clarifying questions.** Input size? Can it be empty? Duplicates allowed? Asking is scored positively; assuming silently is not.
3. **Say your approach out loud before you type it.** "I'll use a hash map to count occurrences, then one pass to find the first with a count of one — that's linear time and linear space." If the approach is wrong, the interviewer will often redirect you here, before you have wasted twenty minutes.
4. **Write the simple version first.** A working brute-force solution beats an elegant one that does not compile. Say "let me get something correct first, then improve it" — that sentence is itself a positive signal.
5. **Narrate while you type.** Silence is the single most damaging thing in this round. An interviewer cannot score thinking they cannot hear.
6. **Test it out loud** with a small input, walking through line by line. Then say the complexity of what you wrote, unprompted.

**When you are stuck:** say so, and say what you have. *"I know a hash map gets me the counts. I'm trying to work out how to keep the ordering — let me think about that for a moment."* That is a good moment in an interview. Silent panic is not, and it is the same thing from the outside.

**The project questions.** Ten minutes on something you built. Have the twelve-minute walkthrough ready — problem, design, schema, hard part, what you would change. This is the part you will be strongest on by December, and it is where you can move a mediocre coding round into a pass.

## Stage 3 — the technical deep dive

Sixty to ninety minutes with a senior engineer. Less coding, more questioning. This is where depth is measured, and it is where preparation shows most.

**What they will go into:** how your framework works underneath, database design and indexing, authentication, error handling, testing, and any technology on your CV.

**The pattern of the round:** they pick something you claimed and go three questions deep. "You used JWTs." → "Why not sessions?" → "How do you log someone out?" → "What if the refresh token is stolen?" Each layer separates people who used a tutorial from people who understood the design.

**Preparation that works:** for every item on your CV, write out the three-deep chain yourself. What is it, why did I choose it, what breaks, what is the alternative. If you cannot get three levels deep on something, either study it or remove it from the CV.

**The most valuable answer in this round** is a genuine limit stated clearly. *"I have not run this in production at scale — I have read about how it fails and here is what I would watch for."* Senior engineers are calibrating your self-knowledge as much as your knowledge, and a candidate who knows their own edge is much safer to hire than one who does not.

## Stage 4 — system design

Forty-five to sixty minutes, at Tier 2 and above. You are given an open-ended prompt — design a URL shortener, a ride-hailing backend, a chat application — and asked to work through it.

**What it is scored on:** structure, not the answer. There is no correct design. They are watching whether you clarify before designing, whether you can estimate scale, whether you name trade-offs, and whether you know what you do not know.

**The method, and follow it visibly:**

1. **Clarify requirements** — five minutes, genuinely. What does it need to do? How many users? Read-heavy or write-heavy? What is explicitly out of scope? Candidates who skip this and start drawing boxes lose most of the marks available.
2. **Estimate scale** — rough numbers. Requests per second, storage per year. Approximate is expected.
3. **Define the interface** — the main API endpoints. This anchors everything after it.
4. **Draw the high-level design** — client, load balancer, service, database, cache. Simple first.
5. **Go deep on one component** — usually the data model or the hardest path. Ask which one they want.
6. **Name the bottlenecks and the trade-offs** — where it breaks, what you would do at ten times the load, what you deliberately did not do.

**Your advantage here** is that you will have built and deployed two real systems on AWS with a documented architecture. When they ask about caching or database scaling, you can answer from something you actually ran rather than from an article. Use it: "In my expense-splitting application I had exactly this problem at a much smaller scale, and what I did was…"

## Stage 5 — the manager conversation

Thirty to forty-five minutes with the person who would manage you. Almost no technical content.

**What it is scored on:** ownership, how you handle disagreement and failure, why you want this specific job, and whether you will still be there in two years.

**The eight questions that cover most of it:**

- Tell me about yourself.
- Why are you leaving?
- Tell me about a difficult bug you solved.
- Tell me about a time you disagreed with someone about a technical decision.
- Tell me about a time you failed, or shipped something broken.
- What is the hardest thing you have built?
- What do you want to be doing in two years?
- What questions do you have for us?

Write all eight out in **STAR** form — Situation, Task, Action, Result — and rehearse each aloud at two minutes. Written first, spoken after. Improvised stories ramble, and rambling is what loses this round.

**The hard one, for you:** *"Why did you stay three years somewhere you weren't growing?"*

Answer it honestly. It was a stable job, you were the only developer and the product depended on you, and it took time to see clearly that the environment was not going to develop you. Then move to what you did when you did see it. That answer describes self-awareness and follow-through, which is exactly what the question is probing. A defensive or evasive answer is far worse than the honest one.

**Your questions for them matter.** Three, specific, and about the work: How is code reviewed here? What does the team struggle with most right now? What would the first three months look like for me? Asking nothing is a genuine negative signal.

## Take-home tasks

Common at Tier 2 and Tier 3. Usually a small application, with a stated four-to-eight-hour budget.

**Decide your maximum in advance** and hold to it. These expand indefinitely if you let them.

**Always include four things**, because they are what actually gets scored: a README explaining how to run it and what you decided; tests, even a handful; clean commit history rather than one commit called "done"; and a short "what I left out and why" section. That last one is the strongest differentiator on a take-home, because it demonstrates judgement about scope, which is the thing the exercise is really testing.

**Do not over-build.** A clean, well-tested, well-documented small solution beats a sprawling one every time.

## The waiting

Between-stage gaps of a week are normal. Two weeks is normal. Silence for three weeks after a final round usually means an internal delay or another candidate in process, not necessarily a rejection.

Follow up once after a week, politely, and then continue with everything else. The most common self-inflicted wound in a job hunt is slowing down the pipeline because one process is going well. Keep applying at full volume until you have signed something.

## Self Assessment

- Can I deliver the two-minute introduction without notes, right now?
- For every item on my CV, can I go three questions deep?
- Have I done a full mock loop with a real person, or only practised alone?
- Are all eight behavioural stories written down, or do I intend to improvise them?
- Do I know the process, the number of stages, and the band for each live opportunity?

## Cheat Sheet

- **Five stages, five different scores.** Screen: communication. Technical: correctness under observation. Deep dive: depth. Design: structure. Manager: ownership.
- **Recruiter screen: prepare three things** — the two-minute introduction, the reason for leaving, and the salary answer.
- **Ask the recruiter the process, the stages, the format and the band.** Most will tell you.
- **Coding round: restate · clarify · say the approach · simple version first · narrate constantly · test aloud · state complexity.**
- **Silence is the most damaging thing in a coding round.** Say what you are stuck on.
- **Deep dive goes three questions deep on anything you claimed.** Prepare the chain yourself, or remove the claim.
- **Design: clarify five minutes · estimate · interface · high level · one deep dive · bottlenecks.** Structure is the score, not the answer.
- **Manager round: eight STAR stories, written then rehearsed at two minutes each.**
- **Take-home: fixed time budget, README, tests, clean commits, and "what I left out and why".**
- **Keep applying at full volume** until a contract is signed.
