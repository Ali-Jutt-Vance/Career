# Phase 0 — Chapter 6: The Scoreboard

> *"What gets measured gets managed — even when it is pointless to measure and manage it."* — Simon Caulkin, on the misuse of Drucker

---

## Chapter Overview

The quote above is a warning as much as an instruction. Measuring the wrong things produces confident, well-tracked failure. This chapter defines the small number of metrics that actually predict whether you close a job by 1 January, and explicitly names the ones that feel productive but predict nothing.

## Leading versus lagging

A **lagging indicator** tells you the outcome: offers received, revenue earned, band score. These are what you want, and they are useless for steering, because by the time they move it is too late to change what caused them.

A **leading indicator** tells you whether the outcome is coming: applications sent, proposals sent, problems solved, commits pushed. These move daily and they are the only things you actually control.

**Manage the leading indicators. Grade yourself on the lagging ones at block boundaries.**

The failure mode this prevents is checking your inbox for offers every day in October. The inbox is a lagging indicator and staring at it produces nothing but anxiety. The question that matters in October is "did I send five applications today", because that is the input, and the input is the only part you own.

## The daily scoreboard

Five numbers, checked in the app, taking under a minute.

| Metric | Target | Why it matters |
|---|---|---|
| **Tasks completed** | 3 of 3 weekdays · 3 of 3 Saturday | The direct measure of whether the day happened |
| **Streak** | Unbroken | The identity metric. Sundays are neutral — they never break it. |
| **Commits pushed** | ≥ 1 on working days | Proof that building happened rather than only reading |
| **Applications** (from 6 Oct) | 5 per weekday | The single strongest predictor of a January offer |
| **Proposals** (from 31 Aug) | 3 per weekday | The pipeline input |

The reader app tracks the first two automatically. The other three go in `LOG.md`.

## The weekly scoreboard

Reviewed in the 30-minute weekly review. Nine numbers.

| Metric | Weekly target | Notes |
|---|---|---|
| Working days completed | 6 of 6 | 4 is acceptable. 2 is a broken week that needs diagnosis. Sunday is not counted. |
| Chapters finished | 3–5 | Per the week's chapter list |
| Algorithm problems | 8–10 | Cumulative target 140+ by January |
| Systems designed and spoken | 2–3 | From week 12 onward. Recorded, not just thought about. |
| Applications sent | 25 | From 6 October |
| Proposals sent | 10 | From 31 August |
| IELTS sections completed | 3–5 | Full timed sections, not exercises. Rises sharply from week 11. |
| Sundays actually taken off | 1 of 1 | Working Sundays in October is why December collapses |
| Milestone | Pass / fail | Binary. No partial credit. |
| Project progress | Something shipped | Deployed, merged, or published |

## The block scoreboard

At the end of every block the lagging indicators get graded. This is where you find out whether the leading indicators are actually producing anything.

### Block I · End of week 2 · Monday 31 August

| Target | Pass condition |
|---|---|
| IELTS booked and paid | Booked ✓ |
| Upwork, Fiverr, LinkedIn live | All three complete ✓ |
| Payment infrastructure working | Payoneer + Wise verified and tested ✓ |
| Algorithm problems | ≥ 25 |
| Positioning statement | Written and tested |
| Commit streak | 14 days |
| Calendar reset for the 3h budget | Blocks moved, Sundays marked busy |

### Block II · End of week 6 · Monday 28 September

| Target | Pass condition |
|---|---|
| Project 1 auth | Refresh rotation + OAuth + RBAC, defensible out loud in 3 minutes |
| IDOR sweep | Every lookup carries the ownership predicate |
| Algorithm problems | ≥ 55 |
| Proposals | ≥ 60 sent, response rate known |
| IELTS | ≥ 6 timed sections completed |
| Dawn block | Still happening at 05:30, four weeks into the reduced budget |

### Block III · End of week 10 · Monday 26 October

| Target | Pass condition |
|---|---|
| Project 1 | **LIVE at a public HTTPS URL, auto-deploying** |
| Query optimisation | 3 queries under 50ms, with plans before and after |
| Applications | Open since 6 Oct, ≥ 60 sent |
| Algorithm problems | ≥ 85 |
| Public writing | ≥ 1 technical post published with real numbers |
| IELTS full mocks | ≥ 2 completed, predicted band known |

### Block IV · End of week 13 · Monday 16 November

| Target | Pass condition |
|---|---|
| IELTS | **Taken on 14 November** |
| AWS | Project 1 on ECS + RDS, architecture diagrammed |
| System designs delivered | ≥ 4 recorded |
| Applications | ≥ 100 total |
| Interviews | ≥ 2 screens completed |
| First client | Contract signed, or a diagnosed reason why not |

### Block V · End of week 16 · Monday 7 December

| Target | Pass condition |
|---|---|
| Project 2 (AI/RAG) | **Live, with a measured precision@5** |
| Portfolio page | Published, both projects linked, custom domain |
| System designs delivered | ≥ 10 recorded |
| IELTS band | 7.5+ received |
| Applications | ≥ 130 total |
| Interview processes | ≥ 3 active |
| Algorithm problems | ≥ 115 |

### Final · Day 137 · 1 January 2027

| Target | Pass condition |
|---|---|
| **Offer** | **Signed or in negotiation** |
| **or Client revenue** | **≥ $1,500 in a single month** |
| IELTS | 7.5+ certificate in hand |
| Projects | 2 live with case studies, plus a portfolio page |
| Applications | ≥ 150 |
| Proposals | ≥ 130 |
| Algorithm problems | ≥ 140 |
| Working days completed | ≥ 100 of 120 |

## The funnel, which is the real diagnostic tool

When results are not appearing, the useless response is "apply more". The useful response is to find the stage that is broken, because each stage has a completely different fix.

### Job funnel

```
Applications sent
   ↓  8–15% expected
Recruiter screens
   ↓  50–70% expected
Technical interviews
   ↓  40–60% expected
Final rounds
   ↓  25–40% expected
Offers
```

**Reading it:**

| Symptom | Broken stage | The actual fix |
|---|---|---|
| 50 applications, 0 screens | Application → screen | The résumé and profile. Not the volume. Rewrite them. |
| Screens happen, no technicals | Screen → technical | Your verbal self-presentation, or a compensation mismatch surfacing early |
| Technicals fail | Technical → final | Algorithms or system design. The recordings tell you which. |
| Finals fail | Final → offer | Behavioural depth, or seniority signals. Usually the stories. |
| Offers below target | Negotiation | Practise the conversation. Get a competing process running. |

The most common error is diagnosing this as "I need to apply more" when the true rate at the first stage is zero. Ten times zero is still zero. Fix the stage, then increase the volume.

### Client funnel

```
Proposals sent
   ↓  10–20% expected
Replies
   ↓  40–60% expected
Calls
   ↓  25–40% expected
Contracts
```

| Symptom | Broken stage | The actual fix |
|---|---|---|
| 30 proposals, 0 replies | Proposal → reply | Positioning is too broad, or proposals are generic. Rewrite the positioning. |
| Replies but no calls | Reply → call | Response speed, or no clear next step offered |
| Calls but no contracts | Call → contract | Pricing, or failing to restate their problem before proposing a solution |
| Contracts but low value | Pricing | Move from hourly to outcome pricing. Raise the rate. |

## What not to measure

These feel like progress and predict nothing. Some of them actively mislead.

- **Hours spent.** Four hours of tutorial watching is not four hours of work. Measure completed tasks and shipped output.
- **Chapters read.** Reading without building is roughly ten per cent effective. A chapter without a commit did not happen.
- **Videos watched.** The most comfortable form of fake progress available.
- **Notes taken.** Notes are a by-product. Extensive notes with no implementation is a warning sign, not an achievement.
- **Total problems solved, unqualified.** Fifty easy problems is not progress after week 4. Count mediums.
- **Tools set up.** Configuring your editor, trying a new note system, redesigning your workflow — all pure avoidance. It always occurs in the week the material gets hard.
- **Followers or likes.** Post because writing clarifies thinking and because it produces inbound interest. The engagement number is not the point.

If a metric can be increased without producing anything a stranger could evaluate, it is not a metric.

## The one-page dashboard

Keep this at the top of `LOG.md` and update it at the weekly review.

```markdown
# SCOREBOARD — updated Sat 10 Oct 2026 (Day 54 of 137)

Streak:        46 working days
Days left:     83   (72 working)

ENGINEERING
  Chapters:    34 / 145
  Problems:    71   (44 easy · 26 medium · 1 hard)
  Designs:     0 recorded  (starts W12)
  Projects:    P1 deploying this week · P2 starts W15

JOB HUNT
  Applications: 22        Screens: 2      Technicals: 0     Offers: 0
  Funnel:       app→screen 9%  ✓ healthy

BUSINESS
  Proposals:    71        Replies: 9      Calls: 3          Contracts: 1
  Funnel:       prop→reply 13% ✓ healthy
  Revenue:      $250

IELTS
  Mocks:        2         Predicted: L7.5 R7.0 W6.5 S7.0
  Weakest:      Writing Task 2 — coherence
  Exam:         14 Nov (35 days)

REST
  Sundays taken off:  6 / 6   ✓ holding

THIS WEEK'S ONE PRIORITY
  Get Writing Task 2 to Band 7 structure. Everything else is on track.
```

One page. Ten seconds to read. It tells you immediately where the problem is — in this example, writing, and nothing else.

## Practical Tasks

1. Copy the dashboard template into the top of `LOG.md` today, with zeros in it.
2. Build the application tracker and the proposal tracker as two spreadsheets, with a column for every funnel stage.
3. Put the five block-review dates in your calendar: 31 Aug, 28 Sep, 26 Oct, 16 Nov, 7 Dec, and the final on 1 Jan.
4. Write your five daily numbers on a sticky note where you work.
5. At the first block review, calculate your two funnel conversion rates. From then on you are steering with data rather than feeling.

## Self Assessment

- Do I know the difference between a leading and a lagging indicator, and am I managing the right one?
- Can I name the single stage of my job funnel that is currently weakest?
- Am I measuring anything on the "do not measure" list and mistaking it for progress?
- Is my dashboard current, or has it not been updated in two weeks?

## Cheat Sheet

- **Manage leading indicators daily. Grade lagging indicators at block boundaries.**
- **Daily five:** tasks 3/3 · streak · ≥1 commit · 5 applications · 3 proposals
- **Block reviews:** 31 Aug · 28 Sep · 26 Oct · 16 Nov · 7 Dec · 1 Jan
- **Job funnel:** apply → screen 8–15% → technical 50–70% → final 40–60% → offer 25–40%
- **Client funnel:** proposal → reply 10–20% → call 40–60% → contract 25–40%
- **Fix the broken stage, then raise the volume. Ten times zero is zero.**
- **Never measure:** hours · chapters read · videos · notes · tools configured · likes
