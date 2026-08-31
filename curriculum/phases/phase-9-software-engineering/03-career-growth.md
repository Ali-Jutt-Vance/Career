# Phase 9 — Chapter 3: Career Growth, Interviews, and Leadership

---

## Chapter Overview

Technical skills get you the interview. Communication, leadership, and career strategy get you promoted and into senior roles. This chapter covers how to navigate a software engineering career from intermediate to senior and beyond.

**Topics:**
- Career levels (junior → mid → senior → staff → principal)
- Interview preparation (behavioral, system design, coding)
- Portfolio and public presence
- 1-on-1s and feedback loops
- Technical leadership without authority
- Managing up and communicating with stakeholders
- Negotiating offers

---

## Career Levels

```
Junior Engineer (0-2 years):
  Scope:    Single tasks assigned by others. Well-defined problems.
  Output:   Implement features, fix bugs under guidance.
  Skills:   Core language + framework, basic debugging, reading code.
  Growth:   Absorb everything, ask many questions, ship features.
  Signs you're ready to level up: working independently, unblocking yourself.

Mid-Level Engineer (2-5 years):
  Scope:    Own features end-to-end. Define the HOW, not just implement.
  Output:   Complete features including testing, deployment, monitoring.
  Skills:   Debugging complex issues, code reviews, mentoring juniors.
  Growth:   Take ownership of systems, improve processes, reduce dependencies.
  Signs you're ready to level up: influencing team decisions, others follow your patterns.

Senior Engineer (5+ years):
  Scope:    Own technical direction for a team or service.
  Output:   Architecture decisions, cross-team solutions, raise bar.
  Skills:   System design, trade-off analysis, mentorship, stakeholder communication.
  Growth:   Think in systems, solve ambiguous problems, multiply team output.
  Signs you're ready to level up: you're "the expert" others come to for guidance.

Staff Engineer (8+ years):
  Scope:    Cross-team or company-wide technical impact.
  Output:   Strategic technical initiatives, engineering standards, org-wide design.
  Skills:   Technical strategy, organization influence, managing ambiguity.
  Growth:   Define the engineering culture, solve company-level technical problems.

IC vs. Management:
  IC track: Senior → Staff → Principal → Distinguished → Fellow
  Manager track: Senior → Engineering Manager → Director → VP → CTO
  Neither is superior — both are valued at top companies.
  Most engineers should explicitly decide at Senior level which path to pursue.
```

---

## Interview Preparation

### The STAR Method (Behavioral)

```
Most behavioral questions follow: Tell me about a time when...

STAR structure:
  Situation: What was the context? (1-2 sentences)
  Task:      What was YOUR responsibility? (1 sentence)
  Action:    What did YOU do? (most of the answer — be specific)
  Result:    What was the outcome? (quantify if possible)

Common behavioral questions (prepare 2-3 stories each):
  Conflict:      "Tell me about a disagreement with a coworker."
  Failure:       "Tell me about a time you failed."
  Leadership:    "Tell me about a time you led without authority."
  Ambiguity:     "Tell me about a time you solved an unclear problem."
  Impact:        "Tell me about your most impactful project."
  Growth:        "Tell me about a time you learned something difficult."

Story bank for 2.5+ years of enterprise experience:
  - CI/CD pipeline improvements (impact: deployment time, reliability)
  - Performance optimization with SQL queries
  - Cross-team API integration challenges
  - Mentoring junior developers
  - Legacy PHP codebase refactoring
  - REST API design decisions
  - AWS infrastructure improvements

Quantify results whenever possible:
  "Reduced deployment time by 40% by adding automated testing to CI pipeline"
  "Cut query time from 3 seconds to 50ms with proper indexing"
  "Onboarded 2 junior developers, both now fully independent"
```

### Coding Interview Preparation

```
Top topics (in priority order):
  1. Arrays and strings
  2. Hash maps and sets
  3. Two pointers
  4. Sliding window
  5. Binary search
  6. Trees (BFS, DFS)
  7. Dynamic programming (top-down + bottom-up)
  8. Graphs (BFS, DFS, Dijkstra)
  9. Heaps / priority queues
  10. Backtracking

Problem-solving framework (say this out loud):
  1. Clarify: edge cases, input range, expected output
  2. Examples: trace through 2 examples manually
  3. Approach: brute force first, then optimize
  4. Complexity: state time/space complexity
  5. Code: clean, readable
  6. Test: trace through your code, catch bugs
  
Practice platforms:
  LeetCode (primary): focus on Easy + Medium, explore Hard
  Neetcode.io: curated 150 problems with video solutions (best resource)
  AlgoExpert: structured learning
  
Resources:
  "Neetcode 150": covers 95% of real interview questions
  "System Design Interview" by Alex Xu: gold standard
  "Designing Data-Intensive Applications" by Martin Kleppmann: deep dive
```

---

## Technical Leadership

```
Leading without authority (most common senior engineer challenge):
  You don't have direct reports, but you need others to change direction.

Techniques:
  1. Build credibility first
     Be the person who ships reliably, solves hard problems, is always right.
     People follow those who've demonstrated judgment.

  2. Use data, not opinion
     "I think X is better" → ignored
     "I benchmarked X vs Y: X is 3x faster and uses 60% less memory" → convincing

  3. Prototype, don't just propose
     Build a working PoC to make alternatives concrete.
     "Here's the branch" is more convincing than "we should try..."

  4. Write RFCs / Design Docs
     Request For Comments: circulate a design, gather feedback, build consensus.
     Makes your thinking visible, invites collaboration.
     Others feel ownership when they contribute.

  5. Disagree and commit
     After discussion, if team decides differently, commit to the decision.
     Log your disagreement if you want ("noted for the retrospective").
     Don't undermine the decision after it's made.

  6. Mentor, don't dictate
     "Have you considered...?" vs. "You should do..."
     Give engineers agency to find the solution with your guidance.

Communicating with stakeholders:
  Lead with: impact, timeline, risk
  NOT: technical implementation details
  "We discovered a database bottleneck. We estimate 3 days to fix. 
   Until then, the orders page may be 2-3x slower."
  NOT: "The PostgreSQL query plan shows a seq scan on the orders table..."
```

---

## Negotiating Offers

```
Key principles:
  Always negotiate — 80%+ of offers are negotiable.
  The first offer is not final.
  Never give a number first: "I'd like to know the range for this role."
  Have competing offers (or act like you do).

What to negotiate:
  Base salary (most important at low-to-mid levels)
  Sign-on bonus (easier to negotiate than base)
  Equity/RSUs (important at startups, valuable at big tech)
  Start date (you need time)
  Title (affects future negotiation anchor)
  Remote policy

Counter-offer script:
  "Thank you so much for the offer — I'm very excited about this role.
   Based on my research and experience in [X, Y, Z], I was hoping we could get
   to [target number]. Is there flexibility there?"
   
  If they push back:
  "I understand. Could we explore a sign-on bonus to bridge the gap?"

Competing offer leverage:
  "I have another offer at $X. This role is my first choice,
   but I need to make a decision by [date]."

Know your market rate:
  levels.fyi:     real compensation data by level at big tech
  glassdoor.com:  broader industry
  LinkedIn Salary: industry average
  Blind app:       anonymous peer discussions
  
Important: total comp = base + bonus + equity (vesting) + benefits
  At FAANG: equity can be 2-5x base salary
  At startups: options may be worth $0 or make you a millionaire
```

---

## Cheat Sheet

```
Level progression milestones:
  Junior → Mid:     working independently, unblocking yourself
  Mid → Senior:     influencing team direction, others follow your patterns
  Senior → Staff:   cross-team impact, org-wide standards, amplify others

Interview prep per type:
  Behavioral:  STAR stories, 2+ examples per common question type
  Coding:      Neetcode 150, practice daily, verbalize thought process
  System design: Alex Xu's book, practice designing known systems

STAR structure:
  Situation (brief) → Task (my role) → Action (what I did) → Result (quantified)

Negotiation:
  Always negotiate. Never give first number.
  Target: base + sign-on + equity (total comp)
  Use: levels.fyi for real data

Leadership without authority:
  Build credibility → use data → prototype → write RFC → commit to decisions

Feedback loops:
  Weekly 1-on-1 with manager: share blockers, get feedback
  Quarterly self-review: what have I shipped, what have I improved?
  Peer feedback: actively seek it, act on it visibly
  Skip-level: know your manager's manager's priorities

Remote work tips:
  Over-communicate (write > talk in async culture)
  Document everything (decisions, context, blockers)
  Visible work: daily status in Slack/standup
  Build relationships intentionally (virtual coffees)
```
