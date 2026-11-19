# Phase 10 — Chapter 10: Job Interview English for Software Engineering Roles

---

## Chapter Overview

Software engineering interviews at international companies test both your technical ability and your ability to communicate clearly under pressure. This chapter covers how to express your experience in English, answer behavioral questions using the STAR method, think aloud during coding rounds, and sell yourself without sounding arrogant.

**Topics:**
- Self-introduction (the 2-minute opening)
- Talking about experience with PHP, AngularJS, AWS, REST APIs
- STAR method in practice (with engineering examples)
- Thinking aloud during coding interviews
- System design communication patterns
- Salary and compensation negotiation in English
- Questions to ask at the end of the interview

---

## Self-Introduction

```
The "Tell me about yourself" question is the most important 2 minutes of the interview.
It sets the tone, controls the narrative, and covers your key selling points.

Structure (Present → Past → Future):
  Present: Who you are and current/recent role
  Past:    Key experience that is relevant to THIS job
  Future:  Why you want THIS role at THIS company

Template:
  "I'm a software engineer with [X] years of experience focused on [domain].
   
   Currently / Most recently, I've been [description of current/recent work + 1 key achievement].
   
   Before that, I [key experience relevant to this role].
   
   The reason I'm excited about this role is [specific, genuine reason linked to company/role].
   I'd love to bring [specific skill] to [specific thing this company does]."

Model answer (tailored for backend engineer with your background):
  "I'm a backend software engineer with around two and a half years of experience,
  primarily focused on building REST APIs and enterprise web applications.
  
  In my most recent role, I worked on a PHP-based enterprise platform where I
  was responsible for building and maintaining REST APIs consumed by AngularJS
  frontends, as well as integrating third-party services and managing SQL databases.
  One of my significant contributions was optimizing a set of frequently-called
  database queries that reduced API response times by over 60%.
  
  I also have experience with cloud infrastructure — specifically AWS, where I hold
  the Cloud Practitioner certification — and I've been deepening my expertise in
  Node.js and TypeScript over the past year to position myself for modern backend
  roles.
  
  I'm excited about this opportunity because [company name] is known for [specific
  technology or product], and I see a strong alignment between my experience in
  [X] and the challenges described in the job description. I'm looking forward to
  working at scale and contributing to a team that values engineering quality."

Length: 90–120 seconds. Time it.
Key rules:
  - Never read from memory — it sounds scripted
  - Don't mention salary, personal life, or why you left in the opening
  - End with WHY this company (shows you prepared)
```

---

## Talking About Your PHP and Legacy Experience

```
Many engineers are embarrassed about PHP — don't be. Frame it as:
  1. Demonstrating foundation (you understand backend fundamentals)
  2. Showing breadth (you can adapt to modern stacks)
  3. Showing ownership (you built real things used by real people)

How to describe PHP experience positively:
  ✗ "I only know PHP. It's an old language."
  ✓ "My early career was in PHP building enterprise applications — which gave me
     a deep understanding of server-side fundamentals, database interactions, and
     REST API design. Over the past year, I've been actively expanding into
     Node.js and TypeScript, and the transition has been very natural because
     the underlying concepts are the same."

Describing AngularJS (legacy version, not Angular 2+):
  "I worked extensively with AngularJS — the first version — building single-page
  applications on the frontend of our enterprise platform. While the framework
  itself is now considered legacy, it gave me a solid understanding of MVC patterns,
  two-way data binding, dependency injection, and state management — concepts
  that transferred directly when I started learning React."

Describing SQL experience:
  "I have strong experience with relational databases — primarily MySQL and
  PostgreSQL. I've written complex queries involving multiple JOINs, window functions,
  and CTEs. I've also worked on query optimization — identifying slow queries through
  EXPLAIN plans and adding indexes to reduce response times significantly."
```

---

## STAR Method — Engineering Examples

```
Behavioral questions follow the pattern: "Tell me about a time when..."
Answer format: Situation → Task → Action → Result

Key: The Action section should be the longest. Be specific about what YOU did.
Quantify results whenever possible.

Q: "Tell me about a time you solved a difficult technical problem."

S: "At my previous company, we were experiencing significant performance issues
    with our main API — response times had degraded to around 3 seconds, which was
    causing users to abandon the platform and generating customer complaints."

T: "I was asked to investigate and resolve the issue. This was a high-stakes task
    because our monthly retention figures were being directly affected."

A: "I started by analyzing our slow query log and APM dashboard to identify the
    bottleneck. I discovered that our order listing endpoint was executing an N+1
    query pattern — one query to fetch orders, then a separate database call for
    each order to fetch the associated user. At 1,000 orders, this meant over
    1,000 database queries per request.
    
    I rewrote the query using a single JOIN with a subquery, added a composite
    index on the frequently filtered columns, and implemented result caching
    with a 60-second TTL for the most-requested queries."

R: "The response time dropped from 3 seconds to under 150 milliseconds — a 20x
    improvement. Database load fell by 85%. We received positive feedback from
    the product team and it was highlighted in the company's quarterly review
    as a significant infrastructure improvement."

---

Q: "Tell me about a time you disagreed with a technical decision."

S: "Our team was planning to store user session data directly in our primary
    PostgreSQL database to keep the infrastructure simple."

T: "I had concerns about the database load this would introduce at scale and 
    felt the decision needed more discussion before we committed."

A: "Rather than dismissing the idea outright, I put together a quick benchmark
    comparison and presented it to the team. I showed that at our projected 
    load of 50,000 concurrent sessions, PostgreSQL would be handling an additional
    500,000 reads per minute — about 30% of our current total database load —
    while Redis could serve the same data with sub-millisecond latency and
    near-zero impact on our main database.
    
    I proposed we try Redis with persistence enabled — which kept the operational
    simplicity they valued while solving the load concern. I offered to handle
    the implementation myself to make the switch easy for the team."

R: "The team agreed after seeing the benchmark data. We implemented Redis for
    sessions, which also turned out to reduce our database costs by around $200/month
    at our current scale. It also set a precedent for using data to drive technical
    decisions rather than preference."
```

---

## Thinking Aloud in Coding Interviews

```
Why: Interviewers don't just want the answer — they want to see how you think.
     A candidate who gets the right answer silently scores less than one who
     walks through their reasoning even if they make a small error.

Step-by-step process (say each step out loud):

Step 1 — Clarify:
  "Before I start, let me make sure I understand the problem correctly.
   We have an array of integers and we need to find [goal]. Is there a constraint
   on the size of the input? Can there be negative numbers? What should I return
   if the array is empty?"

Step 2 — Example:
  "Let me trace through a quick example to confirm my understanding.
   Input: [2, 7, 11, 15], target: 9.
   Expected output: [0, 1] — because 2 + 7 = 9. That matches."

Step 3 — Brute force first:
  "The naive approach would be to check every pair with two nested loops —
   that's O(n²) time and O(1) space. Let me think about whether we can do better."

Step 4 — Optimize:
  "If I use a hash map to store each number and its index as I iterate,
   I can check in O(1) whether the complement exists.
   That brings us to O(n) time and O(n) space. Let me code that up."

Step 5 — Code:
  Talk while coding: "I'll initialize an empty map... now iterate through the array...
   for each element I check if target minus current number is in the map...
   if yes, I return the indices... if not, I add current to the map."

Step 6 — Test:
  "Let me trace through with the example: 2 → map={2:0}, target-2=7 not found.
   7 → map={2:0, 7:1}, target-7=2 found at index 0. Return [0,1]. ✓"

Step 7 — Edge cases:
  "What if the array is empty? My loop won't run, and I'll return undefined.
   Should I return an empty array? What behavior do you prefer?"

Useful phrases during coding:
  "I'm going to start with a brute force approach, then optimize..."
  "The time complexity here is O(n log n) because of the sort..."
  "I'm thinking about edge cases — what if [X]?"
  "Let me test this with the original example..."
  "I think this solution is correct, but I notice [potential issue] — let me check..."
```

---

## System Design Interview Communication

```
The 5-step framework (say each out loud):

Step 1 — Clarify requirements (5 minutes):
  "Before I dive into the design, I want to make sure I understand the scope.
   Are we designing this for [feature scope]? What's the expected scale —
   how many users, what's the read/write ratio? Are there specific latency or
   availability requirements? Any geographic distribution to consider?"

Step 2 — Back-of-envelope math (3 minutes):
  "Let me do some rough math. With 10 million daily active users and assuming
   an average of 5 writes per user per day, we're looking at about 50 million
   writes per day — roughly 580 writes per second. Reads are typically 10x
   writes, so around 5,800 reads per second. This tells me we'll need
   horizontal scaling and likely read replicas."

Step 3 — High-level design (10 minutes):
  "At a high level, I'd propose this architecture: clients talk to a load
   balancer, which distributes to a fleet of API servers. API servers talk
   to a primary database for writes and read replicas for reads. We'd add
   Redis for caching frequently-read data and a CDN for static assets."
  [Draw while explaining]

Step 4 — Deep dive on critical components (15 minutes):
  "The most interesting part of this design is [critical component]. Let me
   go deeper here. The challenge is [specific challenge]. I'd solve this by..."

Step 5 — Trade-offs (5 minutes):
  "This design has some trade-offs worth discussing. The main one is [trade-off].
   We could handle it by [alternative], but that introduces [different problem].
   Given the requirements, I think [chosen approach] is the right call because..."

Vocabulary for system design:
  "This creates a single point of failure — we should add redundancy by..."
  "At this scale, we'd hit the limits of vertical scaling and need to shard..."
  "The trade-off between consistency and availability here is..."
  "We could use eventual consistency here since users don't need real-time accuracy for..."
  "The hot-spot problem arises when [condition] — we'd handle it by..."
```

---

## Salary Negotiation

```
Never give the first number. Never accept without asking.

When asked about salary expectations:
  "I'm flexible and keen to find a number that reflects the value I bring.
   Could you share the budgeted range for this role?"

If they push for a number:
  "Based on my research for [role] in [location] with my experience level,
   I'm targeting around [number]. I'm confident we can find something that
   works for both of us — what's the range you're working with?"

When you receive an offer:
  Never accept immediately, even if it's great.
  "Thank you so much — this is very exciting. Would it be alright if I
   had 48 hours to review the complete package before responding?"

Countering:
  "I'm very excited about this opportunity. The offer is below what I was
   targeting based on [research/other offers]. Is there flexibility to get
   to [target number]? I'm committed to joining if we can close that gap."

If they say no to more base:
  "I completely understand. Could we explore a higher sign-on bonus or
   an earlier performance review to revisit compensation after [X months]?"

Key phrases:
  "Is there flexibility in the offer?"
  "I have another offer at [X] — this is my first choice if we can match it."
  "What does the total compensation package include?" (ask about equity, bonus, benefits)
  "Based on my research on levels.fyi, the market rate for this level is [X]."
```

---

## Questions to Ask the Interviewer

```
Asking good questions signals genuine interest and intelligence.
Prepare 5 questions, expect to ask 2–3.

Technical culture questions:
  "What does the engineering team's deployment process look like?
   How often do you ship to production?"
  
  "How does the team handle technical debt? Is there dedicated time 
   for refactoring and improvements?"
  
  "What does your observability stack look like? How do you know when 
   something goes wrong in production?"

Team and growth questions:
  "What does the career progression path look like for engineers at this level?"
  
  "How does the team approach knowledge sharing? Are there regular 
   design reviews, tech talks, or architecture discussions?"
  
  "What are the biggest technical challenges the team is working on 
   in the next 6–12 months?"

About the interviewer:
  "What do you personally enjoy most about working here?"
  
  "What's been the biggest technical challenge you've faced since joining?"

AVOID asking:
  "How many vacation days do I get?" (save for after offer)
  "Can I work from home?" (save for after offer)
  "What does [company name] do?" (you should know before the interview)
```

---

## Cheat Sheet

```
Self-introduction structure (90–120 seconds):
  Present → Past → Future
  "I'm a [role] with [X] years in [domain]. Currently [achievement].
  Previously [relevant experience]. I'm interested in this role because [specific reason]."

STAR method:
  Situation (brief) → Task (your role) → Action (detailed, what YOU did) → Result (quantified)

Coding interview phrases:
  "Let me clarify..." → "My approach is..." → "Time complexity is O(n) because..."
  → "Let me test with the example..." → "Edge case: what if [X]?"

System design framework:
  Clarify (5 min) → Math (3 min) → High-level (10 min) → Deep dive (15 min) → Trade-offs (5 min)

Salary negotiation:
  Never give first number: "What's the range for this role?"
  Counter professionally: "Is there flexibility to get to [X]?"
  Ask for 48 hours after receiving offer

Questions to ask:
  "How often do you deploy to production?"
  "How is technical debt managed?"
  "What are the biggest engineering challenges in the next 6 months?"

Speaking clearly under pressure:
  Slow down — nerves speed up your speech
  Pause instead of "um" — silence is confidence
  If lost: "Let me think for a moment" → then answer
  If you don't know: "I don't have experience with that specifically,
                      but I'd approach it by [reasoning]..."
```
