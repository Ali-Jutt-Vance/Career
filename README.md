# Career Book

**One book. One app. One deadline: 1 January 2027.**

Everything in this folder is a single system with a single purpose — a signed senior
remote engineering offer, a running client business, and IELTS Band 7.5+, by
**1 January 2027**.

---

## Open it

Double-click **Career Book** on your Desktop.

It opens in a chromeless window with its own icon and taskbar entry — no address bar,
no tabs. It has its own browser profile, so your progress is never cleared by normal
browsing.

The app opens on **today's plan** every time.

---

## The schedule

| | Mon–Fri | Saturday | Sunday |
|---|---|---|---|
| **Weeks 1–2** (18–31 Aug) | 4h 30m | 7h | 7h |
| **Weeks 3–20** (1 Sep → 1 Jan) | **3h** | **6h** | **OFF** |

**21 hours a week, held for eighteen straight weeks.** Sunday carries no tasks at all —
it is a scheduled rest day, and the streak counter treats it as neutral so resting never
breaks it.

**Weekday (3h)** — `05:30` deep study (90m) · `12:30` outreach (30m) · `21:00` build (60m)
**Saturday (6h)** — `08:00` deep build (180m) · `11:30` study (90m) · `15:00` drill + weekly review (90m)

The dawn block is what makes this work while employed. Evening study is the first thing
life cancels; 05:30 is not.

---

## What's inside

| | |
|---|---|
| **145 chapters** | ~406,000 words across 14 phases |
| **137 days** | 18 Aug 2026 → 1 Jan 2027 — **120 working, 17 rest** |
| **374 tasks** | **442 hours**, four tracks in parallel |
| **20 weeks** | 6 blocks, each with a deliverable and a pass/fail milestone |

### The four tracks, every working day

- **Engineering** — chapters, code, two shipped projects + a portfolio page
- **IELTS** — Band 7.5+, exam anchored to **Sat 14 Nov 2026**
- **Business** — proposals from 31 Aug, clients, contracts, revenue
- **Job Hunt** — applications open **6 Oct**, 5 per weekday, no exceptions

### The phases

| Phase | Title |
|---|---|
| **0** | Mission & Method — read this one straight through, before day one |
| 1 | Programming Foundations |
| 2 | Backend Engineering |
| 3 | Databases |
| 4 | Frontend Engineering *(reference only under the reduced budget)* |
| 5 | DevOps |
| 6 | Cloud Engineering (AWS) |
| 7 | System Design |
| 8 | AI Engineering |
| 9 | Software Engineering Practice |
| 10 | IELTS & Professional English |
| 11 | Freelancing & Remote Work |
| **12** | The Daily Execution Plan — all 137 days, dated |
| 13 | Appendix — the Italy study route |

---

## Using the app

**Plan tab** (opens by default) — today's tasks in their time slots, tick boxes that
persist, your streak, completion percentage, track progress, and the countdown to
1 Jan 2027. Sundays show a rest card instead of a schedule. The week card links straight
into the chapters you need that week.

**Chapters tab** — the full curriculum. Reading position is saved.

**Q&A tab** — every interview section in the book, collapsed. For the fifteen minutes
before a call.

**Search** — full text across all 145 chapters, not just titles.

### Keyboard

| Key | Action |
|---|---|
| `T` | Jump to today |
| `/` | Focus search |
| `←` `→` | Previous / next day (or chapter) |

Theme toggle and text size are in the top-right. Everything persists locally.

---

## Fixed anchors

| Date | Anchor |
|---|---|
| 22 Aug 2026 | IELTS booked and **paid** |
| 31 Aug 2026 | Client proposals begin |
| **1 Sep 2026** | **Budget drops to 3h/day · Sundays off** |
| 6 Oct 2026 | Job applications open — 5/weekday |
| **14 Nov 2026** | **IELTS EXAM** |
| 27 Nov 2026 | IELTS results |
| **1 Jan 2027** | **DEADLINE** |

---

## What the reduced budget cut

Going from 36 to 21 hours a week is a 38% cut (713h → 442h). Content was removed rather
than compressed:

- **Project 3** (full-stack Next.js app) → replaced by a one-page portfolio site
- **Frontend phase** → reference reading, not scheduled study
- **GraphQL, MongoDB, TypeORM, EKS, CloudFormation** → reference only
- **Algorithms** → ~250 problems down to ~140, weighted to Mediums
- **Proposals** → 15/week down to 10/week

Protected, because it is what decides a senior offer: **PostgreSQL depth, system design,
AI engineering, authentication, the full IELTS ramp**, and five applications every
weekday from 6 October.

---

## Rebuilding

Everything is generated. Edit the sources, then rebuild.

```bash
cd curriculum

npm run build          # plan + reader + smoke test    (~20s)
npm run build:all      # + PDF + icon + shortcut
npm run pdf            # include the PDF render        (slow)
npm run plan           # regenerate the 137-day plan only
npm run test           # smoke-test the reader in a real browser
npm run install:app    # recreate the Desktop shortcut
node plan/audit.js     # chapter-depth audit → EXPANSION-STATUS.md
```

### Where things live

```
curriculum/
  phases/                     the book — one folder per phase, markdown chapters
  plan/
    plan-data.js              THE PLAN — 20 weeks, authored day by day
    build-plan.js             expands it into data/plan.json + Phase 12 chapters
    audit.js                  chapter-depth audit
    smoke-test.js             drives the built app in a real browser
  scripts/reader.js           the reader app
  styles/reader.css           base theme
  styles/reader-v2.css        dark theme, Plan tab, rest days, search
  app/
    make-icon.js              generates the multi-resolution .ico
    install-app.ps1           creates the Desktop + Start Menu shortcuts
    profile/                  the app's own browser profile (your progress)
  output/index.html           the built app  ← the shortcut points here
  compile.js                  markdown → reader + PDF
  build.js                    one-command pipeline
  EXPANSION-STATUS.md         chapter depth tracker
```

**To change the plan**, edit [curriculum/plan/plan-data.js](curriculum/plan/plan-data.js)
and run `npm run build`. Days, dates, and chapters regenerate automatically.

The build **asserts** on every run: 137 continuous days, 17 Sundays off with zero tasks,
weekdays exactly 180 minutes and Saturdays exactly 360 from 1 September, weeks 3–19 at
exactly 21h, the exam on Saturday 14 November, applications opening 6 October, and every
chapter reference resolving to a real file. If any of that breaks, the build fails.

---

## Chapter depth

Chapters are being expanded to a consistent beginner→mastery arc:

> Overview · Beginner Theory · Basic Examples · Intermediate · Advanced ·
> Industry Usage · Alternatives · Security · Performance · Debugging ·
> **Interview Preparation** · Practical Tasks · Mini/Production/Capstone Projects ·
> Self Assessment · Cheat Sheet

Depth bands: core interview chapters 6,000+ words · standard 5,000+ · support 2,500+.

Expansion order follows the **daily plan order**, so material is always ready ahead of
where you are. Run `node plan/audit.js` for current status — it rewrites the table in
[curriculum/EXPANSION-STATUS.md](curriculum/EXPANSION-STATUS.md) and prints what's next.

---

## Notes

- `_archive-old-copy-2026-08/` is a stale duplicate of an earlier version, kept for
  safety and excluded from the build. Delete it when you're confident.
- `dollars-first.html` has been folded into the book as Phase 13.
- Progress lives in the app's browser profile under `curriculum/app/profile/`.
  Back that folder up if you reinstall.
