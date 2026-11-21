# Reference: Job Interview English

> [!GOALS]
> - Have ready phrases for every stage of a software engineering interview, from the first recruiter call to accepting an offer.
> - Give a strong self-introduction using **present → past → future**.
> - Describe older or less fashionable experience positively and honestly.
> - Use model phrases for STAR answers, live coding, system design and salary discussions.
> - Ask good questions and follow up professionally.

## Why this matters

Interviews at international companies test two things at once: your technical ability and your ability to communicate it clearly under pressure. Many capable engineers lose offers not because they lack skill, but because the right words don't come at the right moment.

This chapter is the companion to {{ch:professional-communication-reference}}: a quick reference, organised by interview stage, to read before an interview and keep beside you while preparing. The ideas behind it are in {{ch:technical-interview-guide}}, {{ch:the-interview-conversation}}, {{ch:talking-about-code}}, {{ch:presenting-a-design}} and {{ch:the-salary-conversation}}.

## The simple idea

An interview phrase reference is like a pilot's checklist. Pilots know how to fly; the checklist makes sure nothing important is forgotten when the workload is high and the stakes are real.

> [!ANALOGY]
> Interview phrases are like a pilot's checklist: they don't replace skill, but they make sure nothing important is missed under pressure.
>
> **Where the analogy breaks:** a pilot reads the checklist aloud word for word. You should not — memorised answers sound scripted. Learn the structure and the key phrases, then speak naturally.

## The proper definition and key words

**Interview English** is the vocabulary and phrasing used to present your experience, reasoning and goals during a hiring process.

Key words:

- **Screening call** — a short first conversation, usually with a recruiter.
- **Self-introduction** — your answer to "Tell me about yourself".
- **Behavioural question** — "Tell me about a time when…", answered with STAR.
- **Live coding** — solving a problem while the interviewer watches.
- **Offer** — the formal proposal of a job with pay and terms.

## Stage 1 — The recruiter call

### Level 1 — Opening and basics

| Situation | Phrase |
|---|---|
| Answering | "Hi, this is [name] — thanks for calling." |
| Interest | "Yes, I'm interested — could you tell me a bit more about the role and the team?" |
| Notice period | "My notice period is one month." |
| Availability | "I'm available for interviews on weekday evenings, or I can arrange time off for a longer round." |
| Location / remote | "I'm based in Lahore and open to remote or hybrid work." ({{ch:remote-work}}) |
| The process | "What does the interview process look like, and roughly how long does it take?" |
| Salary range | "Could you share the budgeted range for the role?" |

## Stage 2 — "Tell me about yourself"

### Level 1 — Present → past → future

The most important minute or two of the interview: it sets the tone and gives the interviewer things to ask about.

- **Present** — who you are and what you do now, with one achievement.
- **Past** — the experience most relevant to *this* role.
- **Future** — why you want *this* role at *this* company.

Template:

> "I'm a back-end engineer with [X] years of experience, mostly building [domain].
>
> Most recently I've been [current work], and one thing I'm proud of is [achievement with a number].
>
> Before that, I [relevant experience].
>
> I'm excited about this role because [specific reason linked to the company or job description], and I'd like to bring my experience in [skill] to [something they do]."

Model answer:

> "I'm a back-end engineer with about three years of experience building REST APIs and business web applications.
>
> In my current role I build and maintain the APIs behind a billing platform, integrate third-party services and manage the SQL database. One thing I'm proud of is reducing the response time of our most-used report endpoint from about two seconds to under 200 milliseconds, by fixing an N+1 query and adding the right index.
>
> Recently I've been building in Node.js, TypeScript and PostgreSQL, and I've deployed two projects on AWS with Docker and a CI pipeline.
>
> I'm excited about this role because your team is moving its billing system to Node.js and TypeScript, which is exactly where my experience overlaps — and I'd like to work on a team with strong code review and engineering practices."

Rules: aim for about ninety seconds to two minutes; learn the structure, not a script; don't mention salary, personal problems or complaints about your employer; end with why *this* company ({{ch:speaking-about-your-work}}).

## Stage 3 — Describing your experience

### Level 2 — Older technology, positively

Many engineers feel embarrassed about older stacks such as PHP or AngularJS. Don't be. Frame them as foundations, breadth and ownership — honestly.

| Avoid | Say |
|---|---|
| "I only know PHP. It's an old language." | "I started in PHP, building business applications — which gave me a solid grounding in server-side development, databases and REST API design. I've since moved into Node.js and TypeScript, and the transition felt natural because the fundamentals are the same." |
| "I used AngularJS, which nobody uses now." | "I built single-page applications in AngularJS. The framework is legacy now, but it taught me component structure, dependency injection and state management, which carried over directly to React." |
| "I know some SQL." | "I'm comfortable with relational databases — mainly MySQL and PostgreSQL. I write joins, CTEs and window functions, and I've optimised slow queries using `EXPLAIN` and indexes." ({{ch:query-optimization}}) |

### Level 2 — Accurate scope

| Situation | Phrase |
|---|---|
| Your own work | "I designed and built the export feature myself." |
| Team work | "We moved to queues as a team; my part was the consumer and the migration plan." |
| Limited exposure | "I've used Kubernetes in a learning project, not in production." |
| Learning now | "I'm currently learning Go — I've built a small CLI with it." |
| Certifications | "I hold the AWS Cloud Practitioner certification, and I've used EC2, S3 and RDS in my own deployments." ({{ch:aws-certification}}) |

## Stage 4 — Behavioural questions

### Level 2 — STAR phrases

**Situation → Task → Action → Result**, with the Action longest and "I" for what you did ({{ch:the-interview-conversation}}).

| Part | Starter phrases |
|---|---|
| Situation | "At my previous company…" / "On a project where…" |
| Task | "I was responsible for…" / "My job was to…" |
| Action | "First, I… Then I… Finally, I…" / "The key decision I made was…" |
| Result | "As a result…" / "That reduced… from… to…" / "What I learned was…" |

Model — "Tell me about a time you solved a difficult technical problem":

> **S:** "Our main order listing API had slowed to about three seconds, and customers were complaining."
> **T:** "I was asked to find and fix the cause."
> **A:** "I checked the slow query log and found an N+1 pattern: one query for the orders, then one query per order for the customer. I replaced it with a single join, added a composite index on the filtered columns, and added a short cache for the most common requests. I measured before and after on staging with realistic data."
> **R:** "Response time fell from about three seconds to under 150 milliseconds, and database load dropped noticeably. I also added a query-count check to our tests so the pattern can't come back unnoticed."

Model — "Tell me about a time you disagreed with a technical decision":

> **S:** "The team planned to store user sessions in our main PostgreSQL database to keep the infrastructure simple."
> **T:** "I was worried about the extra load and wanted the decision based on data."
> **A:** "Rather than just arguing, I wrote a quick benchmark comparing PostgreSQL and Redis for our expected session load, shared the results, and acknowledged the simplicity argument. I proposed Redis with persistence enabled and offered to implement it."
> **R:** "The team agreed after seeing the numbers. More importantly, we started using small benchmarks to settle technical disagreements." ({{ch:engineering-decisions}})

### Level 3 — Common behavioural questions

| Question | Story to use |
|---|---|
| "Tell me about a mistake you made." | A real failure, what you did, what changed afterwards |
| "A time you learned something quickly." | A new technology for a real need |
| "A time you had a tight deadline." | Prioritising, communicating early, what you cut |
| "A conflict with a colleague." | Shared goal, data, a respectful outcome |
| "Something you're proud of." | A project with measurable impact |
| "Explaining something technical to a non-technical person." | An analogy and a decision they could make ({{ch:explaining-technical-work}}) |

## Stage 5 — Live coding

### Level 3 — Phrases for each step

| Step | Phrase |
|---|---|
| Clarify | "Before I start, let me check I understand: we need to return the indices of two numbers that add up to the target. Can there be negative numbers? What should I return if there's no pair?" |
| Example | "Let me trace a quick example: [2, 7, 11, 15] with target 9 should give [0, 1], since 2 + 7 = 9." |
| Brute force | "The simple approach is to check every pair with two loops — O(n²) time, O(1) space. Let me see if we can do better." |
| Optimise | "If I store each number's index in a map as I go, I can check for the complement in constant time. That's O(n) time and O(n) space. Shall I code that?" |
| Coding | "I'll create the map… loop through the array… compute the complement… if it's in the map, return both indices; otherwise store the current number." |
| Test | "Let me trace it: 2 — complement 7 not seen, store 2. 7 — complement 2 is at index 0, so return [0, 1]." |
| Edge cases | "With an empty array the loop doesn't run, so we return null, as we agreed. Duplicates like [3, 3] work because we check before storing." |

The code that narration describes:

```ts
// "I'll store each number's index as I go, and check whether its complement is already there."
function twoSum(nums: number[], target: number): [number, number] | null {
  const seen = new Map<number, number>();            // value -> index
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i]!;
    const j = seen.get(complement);
    if (j !== undefined) return [j, i];              // found the pair
    seen.set(nums[i]!, i);
  }
  return null;                                       // agreed with the interviewer: null if no pair
}

console.log(twoSum([2, 7, 11, 15], 9));  // the example from the problem
console.log(twoSum([3, 3], 6));          // duplicates
console.log(twoSum([1, 2, 3], 100));     // no pair
console.log(twoSum([], 5));              // empty input
```

**Output:**

```text
[ 0, 1 ]
[ 0, 1 ]
null
null
```

More phrases: "I'll start simple, then optimise." · "The complexity is O(n log n) because of the sort." · "I think this is correct, but I'm worried about one case — let me check." · "I'm stuck on X; here's what I've considered." ({{ch:talking-about-code}}, {{ch:arrays-strings-hash-maps}})

## Stage 6 — System design

### Level 3 — Phrases for each step

| Step | Phrase |
|---|---|
| Clarify | "Before designing, I'd like to understand the scope. How many users? What's the read/write ratio? Any latency or availability targets?" |
| Summarise | "So: ten million daily users, read-heavy, feeds should load in under 200 ms, and a few seconds of delay for new posts is acceptable. Is that right?" |
| Estimate | "Let me do rough maths: ten million users making five writes a day is fifty million writes, about 580 a second on average. If reads are ten times that, around 5,800 a second." |
| High level | "At a high level: clients go through a load balancer to stateless API servers, which write to a primary database and read from replicas, with Redis caching hot data and a CDN for media." |
| Deep dive | "The most interesting part is the feed. Shall I go deeper there?" |
| Trade-off | "The trade-off here is consistency versus availability: I'd accept eventual consistency for the feed, because users don't need it to the second." ({{ch:distributed-systems}}) |
| Failure | "This creates a single point of failure — I'd add a replica with automatic failover." |
| Scaling | "At this scale a single database is the limit, so I'd shard by user ID — the risk is hot spots for very popular accounts." ({{ch:database-scaling}}) |

## Stage 7 — Salary and offers

### Level 4 — Key phrases

| Moment | Phrase |
|---|---|
| Asked for expectations (first try) | "Could you share the budgeted range for the role? I'm sure we can find something that works." |
| Asked again | "Based on my research for this role and level in Lahore, I'm looking at [X] to [Y]. Is that within your band?" — then stop talking. |
| Current salary | "I'd rather not anchor on my current salary; my expectation for this role is [X] to [Y]." |
| Receiving an offer | "Thank you — this is great news. Could I have a day or two to review the full package before I respond?" |
| Countering | "I'm very excited about the role. Is there flexibility to get to [X]? I'm bringing [one specific reason]." |
| Fixed base | "I understand. Could we look at a signing bonus, or a written salary review after six months?" |
| Total package | "What does the full package include — bonus, health insurance, equipment, learning budget?" |
| Competing offer (only if true) | "I have another offer at [X]. This role is my first choice — is there any way to close the gap?" |
| Accepting | "I'm happy to accept. Could you send the final offer in writing, and let me know the next steps?" |

Never invent a competing offer — it is dishonest and easily exposed. See {{ch:the-salary-conversation}} for delivery and {{ch:negotiating-offers}} for strategy.

## Stage 8 — Your questions

### Level 4 — Prepare several, ask two or three

| Topic | Question |
|---|---|
| Delivery | "What does your deployment process look like? How often do you release to production?" |
| Quality | "How is code reviewed? How do you handle technical debt?" |
| Operations | "How do you know when something breaks in production? What does on-call look like?" |
| Growth | "What does career progression look like for engineers at this level?" |
| Learning | "Do you have design reviews, tech talks or mentoring?" |
| Challenges | "What are the biggest technical challenges the team is facing this year?" |
| The interviewer | "What do you enjoy most about working here?" |
| Next steps | "What are the next steps, and when might I hear back?" |

Save leave, working from home and benefits for after an offer, unless they are deal-breakers. Never ask what the company does — find out beforehand.

## Stage 9 — After the interview

### Level 4 — Follow-up messages

| Situation | Message |
|---|---|
| Thank-you | "Thank you for your time today — I especially enjoyed discussing how you handle schema migrations. I'm very interested in the role and look forward to hearing about next steps." |
| No reply | "Hi — following up on my interview for the Back-end Engineer role. I'm still very interested; is there an update on the timeline?" |
| Rejection | "Thank you for letting me know. If possible, I'd value any feedback on the main gap. I'd be glad to be considered for future roles." |
| Declining | "Thank you very much for the offer. After careful thought, I've decided to accept another role, but I really enjoyed meeting the team." |

See {{ch:written-english}} for more.

## Under pressure

### Level 4 — Recovery phrases

| Situation | Phrase |
|---|---|
| Need time | "Let me think about that for a moment." |
| Didn't understand | "Could you rephrase the question?" / "Do you mean X or Y?" |
| Don't know | "I haven't used that in production, but here's how I'd approach it…" ({{ch:questions-you-cannot-answer}}) |
| Lost the thread | "Let me start that answer again." |
| Rambling | "To put it more simply…" |
| Wrong earlier | "I'd like to correct something I said earlier." |
| Audio problem | "Sorry, the connection dropped — could you repeat the last part?" |

Slow down, pause instead of "um", and breathe ({{ch:interview-under-pressure}}).

## From beginner to enterprise

**Level 1 — first contact.** Recruiter calls and the self-introduction.

**Level 2 — your experience.** Positive, accurate framing; STAR phrases.

**Level 3 — technical rounds.** Live coding and system design phrases.

**Level 4 — closing.** Salary, questions, follow-ups and recovery.

**Level 5 — senior interviews.** Discussing leadership, influence, strategy and cross-team impact ({{ch:technical-leadership}}).

**Level 6 — interviewing others.** Asking clear questions and giving candidates the space to show their thinking.

## Real-world use cases

### The rehearsed introduction

- **Story**: a candidate who had always started interviews with "So, um, I did my degree in…" rehearsed a present → past → future introduction ending with why the company. Interviewers began asking about the achievements it mentioned — topics the candidate was strong in.

### The legacy stack

- **Story**: a developer apologised for "only knowing PHP" in early interviews. After reframing it as foundations plus recent Node.js projects, the same experience became a strength in the conversation.

## Common mistakes

### Beginner: a life story instead of an introduction

**Fix:** present → past → future, about two minutes.

### Beginner: apologising for your stack

**Fix:** foundations, breadth and recent evidence.

### Intermediate: silent coding

**Fix:** narrate each step.

### Intermediate: accepting an offer on the call

**Fix:** ask for time to review.

### Intermediate: no questions at the end

**Fix:** prepare several; ask two or three.

## Debugging and troubleshooting

- **Interviews feel scripted**: learn structures and key phrases, not full answers.
- **You can't think of a STAR story**: go through your commits, tickets and projects to find one ({{ch:projects-that-prove-skill}}).
- **You freeze on salary**: rehearse the sentences aloud until they are automatic.
- **Feedback says "communication"**: record mock interviews and compare against this chapter.

## Security summary

- **Don't share confidential details** about current or past employers' clients, code, security or incidents in interview stories.
- **Beware fake recruiters** who ask for fees, bank details or identity documents before a genuine offer, or move you to unofficial channels. Verify the company and recruiter independently.
- **Close sensitive windows** before sharing your screen in coding interviews ({{ch:secrets-manager}}).

## How a senior engineer thinks about this

- **Structure beats memorisation.** Know the shape of each answer.
- **Evidence beats adjectives.** Numbers, decisions and results.
- **Honesty beats polish.** Accurate scope and real stories.
- **The interview is a conversation.** Ask, clarify and listen.

## Exercises

### Exercise 1 — Your introduction

**Objective:** practise present → past → future.
**What to do:** write your own introduction of about 150–200 words using the template, with one measured achievement and a specific reason for a company you would like to join.

<details>
<summary>Show the solution</summary>

Check your draft against this list: it starts with your role and years of experience; it names your current work with **one achievement with a number**; it mentions the past experience most relevant to the role; it ends with a reason **specific to that company** (a product, a technology, a published engineering practice); it contains no salary, complaints or personal history; and it takes about ninety seconds to two minutes when said aloud. Record it and listen for fillers and hedges.

</details>

### Exercise 2 — Reframe experience

**Objective:** practise positive framing.
**What to do:** rewrite: "I've only worked on one old jQuery website for a small company, nothing serious."

<details>
<summary>Show the solution</summary>

"I've been the main developer on a production website for a small business, built with jQuery. Being the only developer meant I handled everything — features, bugs, deployment and talking to the client. I'm now applying those skills with modern tools: I've rebuilt part of the site as a React and TypeScript project, which I can show you."

</details>

### Exercise 3 — Narrate a solution

**Objective:** practise live coding phrases.
**What to do:** write what you would say for the clarify, approach and edge-case steps for "reverse a string".

<details>
<summary>Show the solution</summary>

**Clarify:** "Should I handle Unicode characters such as emoji correctly, or can I assume plain ASCII? And can I use built-in methods?"
**Approach:** "If built-ins are fine, I'd split into characters, reverse and join — O(n) time and space. To handle emoji properly I'd split with `Array.from`, which splits by code point rather than UTF-16 unit."
**Edge cases:** "An empty string returns an empty string; a single character returns itself." ({{ch:types-of-data}})

</details>

## Summary

This chapter is a phrase reference for every stage of a software engineering interview. On the **recruiter call**, confirm interest, notice period, availability, the process and the salary range. For **"Tell me about yourself"**, use **present → past → future**, with one measured achievement and a reason specific to the company. **Describe experience** — including older stacks — positively and accurately, separating your work from the team's.

Answer **behavioural questions** with STAR phrases and real stories. In **live coding**, narrate clarification, an example, the brute force, the optimisation, the code, a trace and the edge cases. In **system design**, clarify, summarise, estimate, sketch the high level, go deep, and name trade-offs and failure points. For **salary**, ask for the range, state a number plainly, take time on offers, counter once and never invent competing offers. **Ask good questions**, **follow up** promptly and politely, and use **recovery phrases** under pressure. Learn the structures and key phrases rather than scripts, so you sound prepared and natural.

## Key terms

- **Screening call** — A first conversation, usually with a recruiter.
- **Present → past → future** — A structure for self-introductions.
- **STAR** — Situation, Task, Action, Result.
- **Brute force** — The simplest correct approach, usually inefficient.
- **Back-of-envelope estimate** — A rough calculation of scale.
- **Counter-offer** — A request for better terms after an offer.
- **Follow-up** — A short message after an interview or during silence.

## What comes next

This is the last chapter of the book. You now have the path from your first program to production systems, cloud infrastructure, system design, senior engineering practice, AI applications, getting hired and communicating clearly in English. What comes next is practice: build, deploy, measure, explain and apply. Return to any chapter when you need it — starting, perhaps, with {{ch:projects-that-prove-skill}} for your next project, and {{ch:the-cv}} when it's ready to show the world.
