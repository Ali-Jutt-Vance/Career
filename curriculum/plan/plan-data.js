/**
 * THE 137-DAY PLAN — 18 August 2026 → 1 January 2027
 * ===================================================
 *
 * Built for: employed full-time, switching to a senior remote role.
 *
 * TWO BUDGET REGIMES
 * ------------------
 * Weeks 1–2  (18–31 August)   — the original ramp: 4h30 weekdays, 7h weekend days.
 * Weeks 3–20 (1 Sep → 1 Jan)  — the sustainable budget: 3h Mon–Fri, 6h Saturday,
 *                               SUNDAY OFF. 21 hours a week, every week.
 *
 * The switch happens on Tuesday 1 September 2026, which falls exactly on a week
 * boundary. From that date Sunday carries no tasks at all — it is a real day off,
 * and the streak counter treats it as such.
 *
 * WEEKDAY (3h, from 1 Sep)        SATURDAY (6h, from 1 Sep)
 *   05:30–07:00  Deep Study  90m    08:00–11:00  Deep Build  180m
 *   12:30–13:00  Outreach    30m    11:30–13:00  Study        90m
 *   21:00–22:00  Build/Drill 60m    15:00–16:30  Drill+Review 90m
 *   SUNDAY: rest. No tasks. Deliberate, and part of the plan.
 *
 * Four tracks run through every working day:
 *   ENG   — Engineering mastery (chapters + building)
 *   IELTS — English, targeting Band 7.5+ (exam Sat 14 Nov 2026)
 *   BIZ   — Clients, freelancing, and the business
 *   JOB   — Applications, interview prep, offers
 *
 * WHAT THE REDUCED BUDGET CUT (444h vs 713h — a 38% reduction):
 *   • Project 3 (full-stack Next.js app) — replaced by a one-page portfolio site
 *   • Frontend phase demoted to reference reading, not scheduled study
 *   • GraphQL, MongoDB, TypeORM, EKS, CloudFormation — reference only
 *   • LeetCode volume cut from ~250 to ~140 problems, weighted to Mediums
 *   • Weekly proposal volume cut from 15 to 10
 *   What is PROTECTED, because it decides the offer: PostgreSQL depth,
 *   system design, AI engineering, auth, and the full IELTS ramp.
 *
 * Day specs are in CALENDAR ORDER (Tue → Mon). Weeks 3–20 list six working days;
 * the builder inserts the Sunday rest day automatically.
 */

const TRACKS = {
  ENG:   { label: 'Engineering', color: '#2563eb' },
  IELTS: { label: 'IELTS',       color: '#7c3aed' },
  BIZ:   { label: 'Business',    color: '#059669' },
  JOB:   { label: 'Job Hunt',    color: '#dc2626' },
  REV:   { label: 'Review',      color: '#64748b' },
};

/** The date the reduced budget takes effect. Must fall on a week boundary. */
const BUDGET_SWITCH = '2026-09-01';

const SLOTS = {
  // ── Weeks 1–2 only ──────────────────────────────────────────────
  legacyWeekday: [
    { id: 'dawn',  time: '05:30–07:00', mins: 90,  name: 'Deep Study' },
    { id: 'lunch', time: '12:30–13:00', mins: 30,  name: 'Outreach' },
    { id: 'night', time: '20:00–22:00', mins: 120, name: 'Build' },
    { id: 'late',  time: '22:00–22:30', mins: 30,  name: 'Drill' },
  ],
  legacyWeekend: [
    { id: 'dawn',  time: '08:00–11:00', mins: 180, name: 'Deep Build' },
    { id: 'lunch', time: '11:30–13:00', mins: 90,  name: 'Study' },
    { id: 'night', time: '15:00–17:00', mins: 120, name: 'Drill' },
    { id: 'late',  time: '20:00–20:30', mins: 30,  name: 'Review' },
  ],

  // ── From 1 September 2026 ───────────────────────────────────────
  weekday: [
    { id: 'dawn',  time: '05:30–07:00', mins: 90, name: 'Deep Study' },
    { id: 'lunch', time: '12:30–13:00', mins: 30, name: 'Outreach' },
    { id: 'night', time: '21:00–22:00', mins: 60, name: 'Build' },
  ],
  saturday: [
    { id: 'dawn',  time: '08:00–11:00', mins: 180, name: 'Deep Build' },
    { id: 'lunch', time: '11:30–13:00', mins: 90,  name: 'Study' },
    { id: 'night', time: '15:00–16:30', mins: 90,  name: 'Drill + Review' },
  ],
  rest: [],
};

// Anchor events the whole plan bends around.
const ANCHORS = {
  ieltsBooking:  '2026-08-22',
  ieltsExam:     '2026-11-14',
  ieltsResult:   '2026-11-27',
  applyStart:    '2026-10-06',
  proposalStart: '2026-08-31',
  deadline:      '2027-01-01',
};

/**
 * WEEKS — day specs in CALENDAR ORDER (Tue, Wed, Thu, Fri, Sat, [Sun], Mon).
 * Weeks 1–2 list all seven days. Weeks 3–20 list six; Sunday is inserted as rest.
 * Task shape: [track, slot, text]
 */
const WEEKS = [

// ══════════════════════════════════════════════════════════════════
// BLOCK I — FOUNDATIONS & LAUNCH (W1–W2, original budget)
// ══════════════════════════════════════════════════════════════════
{
  n: 1, block: 'I — Foundations & Launch',
  title: 'Baseline, Setup, and JavaScript to Mastery',
  theme: 'You cannot fix what you have not measured. This week you establish honest baselines in all four tracks, then start the language work that everything else sits on.',
  chapters: [
    'phase-0-mission/01-how-to-use-this-book',
    'phase-1-programming-foundations/01-javascript',
    'phase-10-ielts-english/01-ielts-overview-and-strategy',
    'phase-11-freelancing-remote/01-freelancing-fundamentals',
  ],
  deliverable: 'A public GitHub repo `senior-track-2027` with a daily log, plus baseline scores recorded for DSA, IELTS, and your current résumé.',
  milestone: 'IELTS test booked and paid for. Upwork + LinkedIn profiles live. First commit pushed.',
  d: [
    { focus: 'Baselines and the honest audit', tasks: [
      ['ENG','dawn','Read Phase 0 Ch.1 (How to Use This Book) and Ch.2 (The Mission) in full. Then Phase 1 Ch.1 JavaScript — "Chapter Overview" and "Beginner Theory".'],
      ['JOB','lunch','Write down your current title and salary, and the exact title and salary you want by 1 Jan 2027. One paragraph. You will re-read this every week.'],
      ['ENG','night','Set up the workspace: create GitHub repo `senior-track-2027`, add `LOG.md`, commit "Day 1". Then a timed DSA baseline — 3 LeetCode Easy, 25 min each, no hints. Record how many you solved unaided.'],
      ['IELTS','late','Read Phase 10 Ch.1 IELTS Overview & Strategy. Identify which of the four sections you fear most.'],
    ]},
    { focus: 'IELTS diagnostic and the booking decision', tasks: [
      ['ENG','dawn','JavaScript Ch.1 — "Basic Examples" and "Intermediate Concepts". Type every example by hand. Running it counts; reading it does not.'],
      ['BIZ','lunch','Open Upwork and Fiverr. Do not build a profile yet — study 20 job posts in your stack and write down the exact words clients use for their problems.'],
      ['IELTS','night','Full IELTS Listening + Reading diagnostic under real timing (60 min each). Mark it honestly.'],
      ['IELTS','late','Score the diagnostic. Write one line: "My weakest section is ___ because ___."'],
    ]},
    { focus: 'Closures, scope, and the résumé teardown', tasks: [
      ['ENG','dawn','JavaScript Ch.1 — closures, scope chain, the `this` binding rules. Write five snippets demonstrating each `this` rule and predict the output before running.'],
      ['JOB','lunch','Delete your old résumé summary. Rewrite it as three lines: what you build, at what scale, with what result.'],
      ['ENG','night','Build: an `EventEmitter` from scratch using closures — `on`, `off`, `once`, `emit`. No libraries. Tests included.'],
      ['IELTS','late','IELTS Speaking Part 1: record yourself answering 6 personal questions. Listen back. Note filler words.'],
    ]},
    { focus: 'Prototypes, the event loop, and booking the exam', tasks: [
      ['ENG','dawn','JavaScript Ch.1 — prototype chain and inheritance. Draw the chain for `class Dog extends Animal` by hand on paper.'],
      ['IELTS','lunch','BOOK THE IELTS EXAM for Saturday 14 November 2026. Pay for it today. A booked, paid exam is the only version of this that happens.'],
      ['ENG','night','JavaScript Ch.1 — the event loop, microtasks vs macrotasks. Predict the output of 6 mixed setTimeout/Promise/queueMicrotask puzzles, then verify.'],
      ['ENG','late','2 LeetCode Easy — arrays and hash maps.'],
    ]},
    { focus: 'Weekend deep block: profiles go live', tasks: [
      ['BIZ','dawn','Build the Upwork profile end to end: title, overview (using your positioning line), skills, portfolio placeholders, rate. Then create 3 Fiverr gigs.'],
      ['ENG','lunch','JavaScript Ch.1 — "Security" and "Performance". Note the three attacks you did not know about.'],
      ['IELTS','night','IELTS Writing Task 2: read the Phase 10 Ch.3 structures. Write one full opinion essay, 40 minutes, timed.'],
      ['REV','late','Week 1 review: what got done, what slipped, and why. Update `LOG.md`.'],
    ]},
    { focus: 'TypeScript entry and the LinkedIn rebuild', tasks: [
      ['ENG','dawn','Read Phase 1 Ch.2 TypeScript through "Intermediate Concepts". Convert your EventEmitter to fully-typed TypeScript with generics.'],
      ['JOB','lunch','Rebuild LinkedIn: headline, about, experience bullets rewritten as outcomes with numbers. Turn on "Open to work" for recruiters only.'],
      ['ENG','night','3 LeetCode Easy + revisit the two you failed on Day 1. Can you solve them now unaided?'],
      ['REV','late','Plan week 2. Confirm: exam booked ✓, profiles live ✓, repo has commits ✓.'],
    ]},
    { focus: 'Async mastery and freelance positioning', tasks: [
      ['ENG','dawn','JavaScript Ch.1 — "Advanced Concepts": generators, iterators, proxies, symbols. One working example of each.'],
      ['BIZ','lunch','Read Phase 11 Ch.1 — the niche section. Write your positioning: "I build ___ for ___ so they can ___." Then two alternatives.'],
      ['ENG','night','Build: a promise pool with a concurrency limit — `mapWithConcurrency(items, n, fn)`. Handle rejection without losing results. Push it.'],
      ['IELTS','late','IELTS Writing Task 1: study the structure of a line-graph description. Read two Band 9 models.'],
    ]},
  ],
},

{
  n: 2, block: 'I — Foundations & Launch',
  title: 'TypeScript, Data Structures, and Algorithmic Fluency',
  theme: 'Senior interviews assume you can reason about types and complexity without thinking. This is the last week at the higher budget — use it.',
  chapters: [
    'phase-0-mission/03-beginner-to-mastery-path',
    'phase-1-programming-foundations/02-typescript',
    'phase-1-programming-foundations/03-data-structures',
    'phase-1-programming-foundations/04-algorithms',
    'phase-10-ielts-english/02-ielts-speaking',
  ],
  deliverable: 'A typed, tested utility library on GitHub demonstrating generics, conditional types, and discriminated unions.',
  milestone: '25 LeetCode problems solved total. Big-O of every core data structure operation known from memory.',
  d: [
    { focus: 'The type system as a proof engine', tasks: [
      ['ENG','dawn','TypeScript Ch.2 — generics, conditional types, mapped types, `infer`. Write your own `DeepPartial<T>`, `Awaited<T>`, `ReturnType<T>`.'],
      ['BIZ','lunch','Study 10 Upwork posts. For each, one sentence on what the client is actually afraid of. This is the skill that wins proposals.'],
      ['ENG','night','Build: a typed `Result<T,E>` with `map`, `flatMap`, `unwrapOr`, using discriminated unions. No `any` anywhere.'],
      ['IELTS','late','IELTS Speaking Part 2: one cue card. 1 min prep, 2 min talk, recorded.'],
    ]},
    { focus: 'Arrays, hash maps, and the two-pointer pattern', tasks: [
      ['ENG','dawn','Phase 1 Ch.3 — arrays, dynamic arrays, hash maps. Implement a hash map with separate chaining from scratch.'],
      ['JOB','lunch','Build the job target list: 30 companies hiring senior remote backend/cloud/AI. Columns: company, role, source, status.'],
      ['ENG','night','4 LeetCode: Two Sum, Contains Duplicate, Valid Anagram, Group Anagrams. Then write the shared pattern in one sentence.'],
      ['IELTS','late','Speaking Part 3 abstract questions — 4 answers recorded, 2 min each.'],
    ]},
    { focus: 'Linked lists, stacks, queues', tasks: [
      ['ENG','dawn','Data Structures — linked lists, stacks, queues, deques. Implement a doubly-linked list with an LRU cache on top.'],
      ['BIZ','lunch','Write your proposal framework v1 — as slots, never a template to paste. Their problem, your approach, one proof, one question, one next step.'],
      ['ENG','night','4 LeetCode: Reverse Linked List, Merge Two Sorted Lists, Valid Parentheses, Min Stack.'],
      ['IELTS','late','Phase 10 Ch.2 — the fluency and coherence band descriptors. Score your Day 8 recording against them.'],
    ]},
    { focus: 'Trees and recursion', tasks: [
      ['ENG','dawn','Data Structures — binary trees, BSTs, traversals. Implement all four traversals iteratively, not just recursively.'],
      ['JOB','lunch','Rewrite one résumé bullet as a STAR story. Situation, Task, Action, Result — with a number in the Result.'],
      ['ENG','night','4 LeetCode: Invert Binary Tree, Max Depth, Same Tree, Validate BST.'],
      ['IELTS','late','Vocabulary: build a topic bank for "Technology" — 15 Band 8 phrases you would actually say.'],
    ]},
    { focus: 'Weekend: sorting, searching, and the utility library', tasks: [
      ['ENG','dawn','Phase 1 Ch.4 — binary search variants, merge sort, quicksort, heap sort. Then binary search on answer space, the pattern interviews love.'],
      ['ENG','lunch','Package your week-2 utilities into a typed library with tests, README, and CI. Publish it.'],
      ['IELTS','night','Full IELTS Speaking mock: all three parts, recorded, self-scored against the descriptors.'],
      ['REV','late','Week 2 review. Count total LeetCode solved. Update `LOG.md`.'],
    ]},
    { focus: 'Complexity, OOP, and consolidation', tasks: [
      ['ENG','dawn','Phase 1 Ch.5 OOP + Ch.9 SOLID. Refactor the Result library to obey every principle; note where you broke one deliberately and why.'],
      ['ENG','lunch','Big-O drill: complexity of every operation on every structure you built this week, from memory. Then check.'],
      ['JOB','night','5 more STAR stories drafted: a failure, a conflict, a performance win, a leadership moment, a decision you reversed.'],
      ['REV','late','Read Phase 0 Ch.5 (The Operating System). From Tuesday the budget drops to 3h/day with Sundays off — plan for it.'],
    ]},
    { focus: 'Graphs, and the last day of the ramp', tasks: [
      ['ENG','dawn','Phase 1 Ch.4 — graph representations, BFS, DFS, topological sort. Implement each on an adjacency list.'],
      ['BIZ','lunch','Send your first 2 Upwork proposals. They will not be perfect. Sending is the skill.'],
      ['ENG','night','4 LeetCode: Number of Islands, Clone Graph, Course Schedule, Pacific Atlantic Water Flow.'],
      ['REV','late','Set up for the new rhythm: 05:30–07:00, 12:30–13:00, 21:00–22:00, Sundays off. Put it in the calendar tonight.'],
    ]},
  ],
},

// ══════════════════════════════════════════════════════════════════
// BLOCK II — BACKEND CORE (W3–W6) · 21h/week from here
// ══════════════════════════════════════════════════════════════════
{
  n: 3, block: 'II — Backend Core',
  title: 'Node.js Internals and Express in Production',
  theme: 'The reduced budget starts today: 3 hours on weekdays, 6 on Saturday, Sunday off. Less time means less breadth, not less depth — everything scheduled from here is interview-critical.',
  chapters: [
    'phase-2-backend-engineering/01-nodejs',
    'phase-2-backend-engineering/02-expressjs',
    'phase-0-mission/05-the-operating-system',
  ],
  deliverable: 'A layered Express API skeleton: routes → controllers → services → repositories, with structured logging and one central error handler.',
  milestone: 'You can explain the event loop phases from memory and demonstrate why one blocking handler freezes the whole server.',
  d: [
    { focus: 'The runtime underneath', tasks: [
      ['ENG','dawn','Phase 2 Ch.1 Node.js — "Chapter Overview" and "Beginner Theory": libuv, the thread pool, the event loop phases. Draw the loop from memory afterwards.'],
      ['BIZ','lunch','3 Upwork proposals. Track which categories respond.'],
      ['ENG','night','Build the blocking-server demo from "Basic Examples". Hit /slow and / simultaneously and watch the fast request wait 5 seconds. This is the lesson.'],
    ]},
    { focus: 'Streams and backpressure', tasks: [
      ['ENG','dawn','Node.js Ch.1 — streams, pipes, backpressure. Understand why `pipeline()` exists and what `.pipe()` gets wrong.'],
      ['BIZ','lunch','3 proposals.'],
      ['IELTS','night','IELTS Writing Task 1: line graph, 20 min timed. Overview sentence is non-negotiable.'],
    ]},
    { focus: 'Constant-memory processing', tasks: [
      ['ENG','dawn','Node.js Ch.1 — "Intermediate Concepts": EventEmitter and custom Transform streams.'],
      ['BIZ','lunch','3 proposals.'],
      ['ENG','night','Build: a CSV→JSON transform stream that processes a 1GB file in constant memory. Prove memory stays flat with `process.memoryUsage()`.'],
    ]},
    { focus: 'Express architecture that survives growth', tasks: [
      ['ENG','dawn','Phase 2 Ch.2 Express — middleware order, router composition, and the layered architecture. Middleware order is program order.'],
      ['BIZ','lunch','3 proposals. Review: any views? Any replies?'],
      ['IELTS','night','IELTS Writing Task 2, 40 min timed.'],
    ]},
    { focus: 'Weekend build: the API skeleton', tasks: [
      ['ENG','dawn','Build: scaffold the layered API. Routes, controllers, services, repositories. No business logic in controllers, no `req`/`res` in services. Split `app.js` from `server.js`.'],
      ['ENG','lunch','Express Ch.2 — "Security" and the five Express-specific mistakes. Fix each one in your skeleton: trust proxy, body limits, error leakage, CORS allowlist, mass assignment.'],
      ['REV','night','2 LeetCode Medium. Then the Week 3 review — first week on the new budget: did 3 hours actually happen each day?'],
    ]},
    { focus: 'Errors, logging, and the async trap', tasks: [
      ['ENG','dawn','Express Ch.2 — the async error-handling deep dive (Q9). Understand why an unwrapped async handler hangs the request forever.'],
      ['BIZ','lunch','3 proposals.'],
      ['ENG','night','Build: the `asyncHandler` wrapper, a typed error hierarchy, one central error middleware, and request IDs propagated with AsyncLocalStorage.'],
    ]},
  ],
},

{
  n: 4, block: 'II — Backend Core',
  title: 'REST APIs and Async Resilience',
  theme: 'Two things separate a mid-level API from a senior one: a defensible resource design, and the assumption that every network call will fail.',
  chapters: [
    'phase-2-backend-engineering/04-rest-apis',
    'phase-1-programming-foundations/07-asynchronous-programming',
    'phase-2-backend-engineering/10-validation',
    'phase-2-backend-engineering/11-error-handling',
  ],
  deliverable: 'Full CRUD with cursor pagination, idempotency keys, ETags, and correct status codes for every branch.',
  milestone: 'You can name the right status code for all nine situations in the REST chapter table, and explain why 404-not-403 matters.',
  d: [
    { focus: 'Resource design and status codes', tasks: [
      ['ENG','dawn','Phase 2 Ch.4 REST — resource modelling, status codes, the nine that people get wrong. Memorise 401 vs 403 vs 404 and why.'],
      ['BIZ','lunch','3 proposals.'],
      ['ENG','night','Build: CRUD endpoints with correct status codes on every branch, including the error paths.'],
    ]},
    { focus: 'Pagination and idempotency', tasks: [
      ['ENG','dawn','REST Ch.4 — cursor vs offset pagination, and why offset breaks. Note the composite `(created_at, id)` detail.'],
      ['BIZ','lunch','3 proposals.'],
      ['IELTS','night','IELTS Reading: one full passage, 20 min, focused on matching-headings technique.'],
    ]},
    { focus: 'Idempotency and conditional requests', tasks: [
      ['ENG','dawn','REST Ch.4 — idempotency keys, ETags, `If-None-Match`, `If-Match`, and 412 for optimistic concurrency.'],
      ['BIZ','lunch','3 proposals.'],
      ['ENG','night','Build: idempotency keys on POST with a 24h cache, and ETags on your list endpoint. Verify a 304 with curl.'],
    ]},
    { focus: 'Validation at the boundary', tasks: [
      ['ENG','dawn','Phase 2 Ch.10 Validation + Ch.11 Error Handling. Operational vs programmer errors is a senior-level distinction.'],
      ['BIZ','lunch','3 proposals.'],
      ['IELTS','night','IELTS Writing Task 2, 40 min timed. Different question type: discuss both views.'],
    ]},
    { focus: 'Weekend build: resilience patterns', tasks: [
      ['ENG','dawn','Phase 1 Ch.7 — build all four resilience patterns yourself: timeout with AbortController, retry with backoff AND jitter, circuit breaker, bounded concurrency.'],
      ['ENG','lunch','Wrap every outbound call in your API with all four. Then break a dependency deliberately and watch the breaker open.'],
      ['REV','night','2 LeetCode Medium. Week 4 review.'],
    ]},
    { focus: 'Documentation as a contract', tasks: [
      ['ENG','dawn','Phase 2 Ch.22 API Documentation — write the OpenAPI spec for what you have built. Generate types from it.'],
      ['BIZ','lunch','3 proposals. If 15+ sent with zero replies, stop and rewrite your positioning — not your luck.'],
      ['ENG','night','Publish `/docs` with working try-it-out and real example requests.'],
    ]},
  ],
},

{
  n: 5, block: 'II — Backend Core',
  title: 'NestJS and Authentication — Project 1 Begins',
  theme: 'Auth is where most portfolio projects quietly fail an interview. Build it properly once and be able to defend every decision.',
  chapters: [
    'phase-2-backend-engineering/03-nestjs',
    'phase-2-backend-engineering/06-authentication',
  ],
  deliverable: 'PROJECT 1 starts: a multi-tenant SaaS API in NestJS with registration, login, email verification, and password reset.',
  milestone: 'Password auth that leaks nothing: no user enumeration on any endpoint, argon2id, constant-time comparison.',
  d: [
    { focus: 'NestJS: modules, providers, DI', tasks: [
      ['ENG','dawn','Phase 2 Ch.3 NestJS — modules, providers, injection scopes, lifecycle hooks. Understand why DI matters for testing, not just tidiness.'],
      ['BIZ','lunch','3 proposals.'],
      ['ENG','night','PROJECT 1 kickoff: scaffold the NestJS project. Modules: auth, users, tenants. Config validated at boot — fail fast on a missing env var.'],
    ]},
    { focus: 'Password auth done right', tasks: [
      ['ENG','dawn','Phase 2 Ch.6 Authentication — argon2 vs bcrypt, timing attacks, account enumeration, password reset flows that cannot be abused.'],
      ['BIZ','lunch','3 proposals.'],
      ['IELTS','night','IELTS Speaking Part 2 cue card, recorded. Then listen back at 1.5x and count the fillers.'],
    ]},
    { focus: 'Registration and verification', tasks: [
      ['ENG','dawn','Authentication Ch.6 — email verification and password reset token design. Single-use, short-lived, hashed at rest.'],
      ['BIZ','lunch','3 proposals.'],
      ['ENG','night','Build: registration, login, email verification. Argon2id. No endpoint reveals whether an email exists.'],
    ]},
    { focus: 'Reset flows and abuse cases', tasks: [
      ['ENG','dawn','Study the abuse cases: reset token reuse, host-header poisoning in reset links, timing differences between known and unknown emails.'],
      ['BIZ','lunch','3 proposals.'],
      ['IELTS','night','IELTS Writing Task 1: bar chart and table, 20 min each.'],
    ]},
    { focus: 'Weekend build: attack your own auth', tasks: [
      ['ENG','dawn','Build: password reset end to end. Then write the attack suite against it — token replay, expired token, reused token, enumeration via timing. All must fail correctly.'],
      ['ENG','lunch','Phase 2 Ch.12 Logging — structured JSON logs with request IDs. Log every authentication failure; you will need this for the monitoring chapter.'],
      ['REV','night','2 LeetCode Medium. Week 5 review.'],
    ]},
    { focus: 'Guards, pipes, and interceptors', tasks: [
      ['ENG','dawn','NestJS Ch.3 — guards, pipes, interceptors, and exception filters. Map each to the Express equivalent you already know.'],
      ['BIZ','lunch','3 proposals.'],
      ['ENG','night','Build: a global validation pipe with class-validator, and an exception filter that maps typed errors to status codes.'],
    ]},
  ],
},

{
  n: 6, block: 'II — Backend Core',
  title: 'Tokens, OAuth, and Multi-Tenancy',
  theme: 'Refresh-token rotation with reuse detection is the single most impressive thing a mid-level candidate can demonstrate. It is also genuinely hard to get right.',
  chapters: [
    'phase-2-backend-engineering/07-jwt',
    'phase-2-backend-engineering/08-oauth',
    'phase-2-backend-engineering/09-session-management',
  ],
  deliverable: 'Access + refresh tokens with rotation and reuse detection, Google/GitHub OAuth with PKCE, RBAC, and tenant isolation enforced at the query layer.',
  milestone: 'You can explain refresh-token rotation and reuse detection out loud, in three minutes, without notes.',
  d: [
    { focus: 'JWT: what it is and what it is not', tasks: [
      ['ENG','dawn','Phase 2 Ch.7 JWT — signing vs encryption, claims, why `alg: none` was a catastrophe, access vs refresh lifetimes.'],
      ['BIZ','lunch','3 proposals.'],
      ['ENG','night','Build: access tokens at 15 minutes, signed and verified with an explicit algorithm allowlist. Never trust the header.'],
    ]},
    { focus: 'Refresh-token rotation', tasks: [
      ['ENG','dawn','JWT Ch.7 — rotation, token families, and reuse detection. Understand exactly what a stolen refresh token can and cannot do.'],
      ['BIZ','lunch','3 proposals.'],
      ['ENG','night','Build: refresh tokens with rotation. Store the family. On reuse of a rotated token, revoke the entire family.'],
    ]},
    { focus: 'OAuth 2.0 and OIDC', tasks: [
      ['ENG','dawn','Phase 2 Ch.8 OAuth — authorization code flow with PKCE, the `state` parameter, OAuth (authz) vs OIDC (authn). Draw the full sequence.'],
      ['BIZ','lunch','3 proposals.'],
      ['IELTS','night','IELTS Speaking Part 3, recorded. Then Writing Task 2 planning practice: 5 essay outlines in 30 minutes, no full writing.'],
    ]},
    { focus: 'Sessions, RBAC, and tenancy', tasks: [
      ['ENG','dawn','Phase 2 Ch.9 Sessions + the authorization models: RBAC vs ABAC vs ReBAC. Know when each is right.'],
      ['BIZ','lunch','3 proposals.'],
      ['ENG','night','Build: RBAC guards. Then tenant isolation at the QUERY layer, not the controller layer — that is how data leaks happen.'],
    ]},
    { focus: 'Weekend build: OAuth and the IDOR sweep', tasks: [
      ['ENG','dawn','Build: Google and GitHub OAuth with PKCE, plus account linking when the email already exists.'],
      ['ENG','lunch','Security sweep: attempt IDOR on every resource. Every lookup must include the ownership predicate in the WHERE clause, and return 404 rather than 403.'],
      ['REV','night','Record yourself explaining the auth architecture in 3 minutes, no notes. Watch it back. Then the Week 6 and Block II review.'],
    ]},
    { focus: 'Block II close-out', tasks: [
      ['ENG','dawn','Write the Project 1 auth documentation: the flows, the token lifetimes, the revocation paths, and the trade-offs you rejected.'],
      ['REV','lunch','Block II retrospective. Six weeks done. Is the 05:30 block actually happening, or has it migrated to the evening?'],
      ['ENG','night','2 LeetCode Medium. Plan Block III.'],
    ]},
  ],
},

// ══════════════════════════════════════════════════════════════════
// BLOCK III — DATA & DELIVERY (W7–W10)
// ══════════════════════════════════════════════════════════════════
{
  n: 7, block: 'III — Data & Delivery',
  title: 'PostgreSQL and SQL to Interview Depth',
  theme: 'The highest-leverage skill for a backend senior. Most candidates know CRUD; almost none can read a query plan. That gap is your opportunity, and it is why this survived the budget cut intact.',
  chapters: [
    'phase-3-databases/01-sql',
    'phase-3-databases/02-postgresql',
    'phase-3-databases/06-transactions',
  ],
  deliverable: 'Project 1 on a real PostgreSQL schema with constraints and migrations, seeded with 1M+ rows for honest testing.',
  milestone: 'You can write a window-function query and a recursive CTE from memory.',
  d: [
    { focus: 'SQL beyond SELECT', tasks: [
      ['ENG','dawn','Phase 3 Ch.1 SQL — all join types, subqueries vs joins vs CTEs, and NULL three-valued logic (the part that catches everyone).'],
      ['BIZ','lunch','3 proposals.'],
      ['ENG','night','Build: seed a 1M-row dataset. Write 10 increasingly hard queries against it. Time each one.'],
    ]},
    { focus: 'Window functions', tasks: [
      ['ENG','dawn','SQL Ch.1 — window functions: ROW_NUMBER, RANK, LAG/LEAD, running totals, frame clauses. These appear in senior SQL screens constantly.'],
      ['BIZ','lunch','3 proposals.'],
      ['ENG','night','Solve 6 analytics questions using only window functions: top-N per group, month-over-month growth, cohort retention.'],
    ]},
    { focus: 'Recursive CTEs and PostgreSQL specifics', tasks: [
      ['ENG','dawn','Phase 3 Ch.2 PostgreSQL — MVCC, vacuum, table bloat, JSONB, arrays, full-text search.'],
      ['BIZ','lunch','3 proposals.'],
      ['IELTS','night','IELTS Reading, 20 min. Then Listening Section 4 note-completion.'],
    ]},
    { focus: 'Transactions and isolation', tasks: [
      ['ENG','dawn','Phase 3 Ch.6 Transactions — ACID, the four isolation levels, and the exact anomaly each one permits.'],
      ['BIZ','lunch','3 proposals.'],
      ['ENG','night','Reproduce a lost update and a write skew yourself, in two psql sessions. Seeing it is worth more than reading it.'],
    ]},
    { focus: 'Weekend build: the real schema', tasks: [
      ['ENG','dawn','Build: redesign the Project 1 schema properly. Foreign keys, check constraints, unique partial indexes, generated columns. Migrations, not manual DDL.'],
      ['ENG','lunch','Build: optimistic locking with a version column, and pessimistic locking with SELECT FOR UPDATE. Cause a deadlock deliberately and read the log.'],
      ['REV','night','2 LeetCode Medium. Week 7 review.'],
    ]},
    { focus: 'The ORM trade-off', tasks: [
      ['ENG','dawn','Phase 3 Ch.13 Prisma + Ch.12 ORMs — migrations, the N+1 problem, and when dropping to raw SQL is correct rather than a failure.'],
      ['BIZ','lunch','3 proposals.'],
      ['ENG','night','Build: wire Prisma into Project 1. Then create an N+1 deliberately, detect it in the query log, and fix it three different ways.'],
    ]},
  ],
},

{
  n: 8, block: 'III — Data & Delivery',
  title: 'Indexes, Query Plans — and Applications Open',
  theme: 'From Tuesday, job applications are a daily habit rather than an event. Applications take 4–8 weeks to convert, and there are 12 weeks left.',
  chapters: [
    'phase-3-databases/07-indexes',
    'phase-3-databases/08-query-optimization',
    'phase-3-databases/04-database-design',
  ],
  deliverable: 'Your three slowest queries taken under 50ms, with EXPLAIN ANALYZE output before and after in the README.',
  milestone: 'APPLICATIONS OPEN — 5 tailored applications every weekday from here to the deadline. No exceptions.',
  d: [
    { focus: 'How indexes actually work', tasks: [
      ['ENG','dawn','Phase 3 Ch.7 Indexes — B-tree structure, composite column order, covering indexes, partial indexes, GIN/GiST/BRIN and when each wins.'],
      ['JOB','lunch','APPLICATIONS OPEN. 5 applications today, each tailored — the company name and one specific thing about them in the first line.'],
      ['ENG','night','For each of your 10 queries, design the optimal index. Measure before and after.'],
    ]},
    { focus: 'Reading a query plan', tasks: [
      ['ENG','dawn','Phase 3 Ch.8 — EXPLAIN ANALYZE: seq scan vs index scan vs bitmap heap scan; nested loop vs hash join vs merge join.'],
      ['JOB','lunch','5 applications.'],
      ['ENG','night','Read 10 real plans from your own queries. Say out loud what each node is doing before reading the row counts.'],
    ]},
    { focus: 'The cost of indexes', tasks: [
      ['ENG','dawn','Query Optimization Ch.8 — statistics, ANALYZE, planner estimates going wrong, and why an index can make a query slower.'],
      ['JOB','lunch','5 applications.'],
      ['ENG','night','Benchmark write throughput with 0, 3, and 8 indexes on the same table. Now the trade-off is in your bones, not your notes.'],
    ]},
    { focus: 'Schema design and normalisation', tasks: [
      ['ENG','dawn','Phase 3 Ch.4 Database Design + Ch.5 Normalization — 1NF to BCNF, and the specific cases where denormalising is correct.'],
      ['JOB','lunch','5 applications.'],
      ['IELTS','night','IELTS Writing Task 2, 40 min timed.'],
    ]},
    { focus: 'Weekend build: make it fast', tasks: [
      ['ENG','dawn','Take your 3 slowest queries. Get each under 50ms. Document exactly what you changed and why — this becomes a blog post and an interview story.'],
      ['ENG','lunch','Find and drop every index that is never used (`pg_stat_user_indexes`). Unused indexes cost write throughput for nothing.'],
      ['REV','night','2 LeetCode Medium. Week 8 review — and your first application-funnel count.'],
    ]},
    { focus: 'Publish the result', tasks: [
      ['ENG','dawn','Write it up: "How I took a query from Xs to Yms", with the plan before and after.'],
      ['JOB','lunch','5 applications.'],
      ['BIZ','night','Publish the post to LinkedIn and your repo README. Technical posts with real numbers are what get recruiters to message you first.'],
    ]},
  ],
},

{
  n: 9, block: 'III — Data & Delivery',
  title: 'Redis, Caching, Queues, and Rate Limiting',
  theme: 'Everything this week answers one question: what do you do when it gets slow? Seniors answer with measurement, not guesses.',
  chapters: [
    'phase-2-backend-engineering/18-redis',
    'phase-2-backend-engineering/19-caching',
    'phase-2-backend-engineering/16-queues',
    'phase-2-backend-engineering/20-rate-limiting',
  ],
  deliverable: 'Project 1 with cache-aside on the hottest endpoint, a BullMQ queue with retries and a DLQ, and distributed rate limiting.',
  milestone: 'p99 latency on your hottest endpoint cut by 10x, measured before and after.',
  d: [
    { focus: 'Redis and cache strategy', tasks: [
      ['ENG','dawn','Phase 2 Ch.18 Redis + Ch.19 Caching — cache-aside, write-through, write-behind; TTL strategy; the thundering herd.'],
      ['JOB','lunch','5 applications.'],
      ['ENG','night','Build: cache-aside on your hottest endpoint, with a single-flight lock so a cache miss cannot stampede the database.'],
    ]},
    { focus: 'Cache invalidation', tasks: [
      ['ENG','dawn','Caching Ch.19 — invalidation strategies, negative caching, and why cache keys need versioning.'],
      ['JOB','lunch','5 applications.'],
      ['ENG','night','Create a stale-cache bug deliberately. Then fix it with event-driven invalidation and write it up as an incident report.'],
    ]},
    { focus: 'Queues and background work', tasks: [
      ['ENG','dawn','Phase 2 Ch.16 Queues — at-least-once vs at-most-once, idempotent consumers, dead-letter queues, backoff.'],
      ['JOB','lunch','5 applications.'],
      ['ENG','night','Build: BullMQ for email and report generation. Retries with backoff, a DLQ, and idempotency keys so a replay cannot double-charge anyone.'],
    ]},
    { focus: 'Rate limiting', tasks: [
      ['ENG','dawn','Phase 2 Ch.20 — token bucket, leaky bucket, sliding window log vs counter. Know which one you are actually implementing.'],
      ['JOB','lunch','5 applications.'],
      ['IELTS','night','IELTS Listening full mock, 40 min. Score it and categorise every error: spelling, distraction, or not-heard.'],
    ]},
    { focus: 'Weekend build: measure the improvement', tasks: [
      ['ENG','dawn','Build: a distributed sliding-window limiter in Redis using a Lua script for atomicity. Then load-test the whole system with autocannon.'],
      ['ENG','lunch','Document the p99 before and after every change from weeks 8 and 9. Numbers, not adjectives — this table is interview material.'],
      ['REV','night','2 LeetCode Medium. Week 9 review.'],
    ]},
    { focus: 'Real-time, briefly', tasks: [
      ['ENG','dawn','Phase 2 Ch.17 WebSockets — auth on the handshake, and horizontal-scale-safe pub/sub. Read only; do not build a chat app.'],
      ['JOB','lunch','5 applications. Follow up on anything older than 10 days.'],
      ['ENG','night','Build: notifications over WebSocket with Redis pub/sub, authenticated at the handshake. Timebox to one hour — this is a nice-to-have.'],
    ]},
  ],
},

{
  n: 10, block: 'III — Data & Delivery',
  title: 'Docker, CI/CD — Project 1 Goes Live',
  theme: 'A project that is not deployed is a hobby. This week Project 1 becomes a real, publicly reachable system with a URL you can put in an application.',
  chapters: [
    'phase-5-devops/03-docker',
    'phase-5-devops/04-docker-compose',
    'phase-5-devops/06-github-actions',
    'phase-5-devops/07-cicd',
    'phase-5-devops/05-nginx',
  ],
  deliverable: 'PROJECT 1 LIVE at a public HTTPS URL, auto-deploying on every push to main, with rollback.',
  milestone: 'A stranger can read your API docs and make a real authenticated request.',
  d: [
    { focus: 'Docker images that are not 1.2GB', tasks: [
      ['ENG','dawn','Phase 5 Ch.3 Docker — layers, build cache, multi-stage builds, and the security rules: non-root, read-only rootfs, dropped capabilities.'],
      ['JOB','lunch','5 applications.'],
      ['ENG','night','Build: containerise Project 1. Target under 150MB, non-root, healthcheck, correct signal handling for graceful shutdown.'],
    ]},
    { focus: 'The full local stack', tasks: [
      ['ENG','dawn','Phase 5 Ch.4 Compose — service dependencies, healthcheck gating, named volumes, network isolation.'],
      ['JOB','lunch','5 applications.'],
      ['ENG','night','Build: one `docker compose up` brings up API + Postgres + Redis + worker, seeded and ready. This is what a new teammate would need.'],
    ]},
    { focus: 'CI/CD you would trust', tasks: [
      ['ENG','dawn','Phase 5 Ch.6 GitHub Actions + Ch.7 CI/CD — stages, caching, matrix builds, environments, secrets, deployment strategies.'],
      ['JOB','lunch','5 applications.'],
      ['ENG','night','Build: lint → typecheck → unit → integration → build image → push. Get it green.'],
    ]},
    { focus: 'The edge: Nginx and TLS', tasks: [
      ['ENG','dawn','Phase 5 Ch.5 Nginx + Ch.11 SSL — TLS termination, HTTP/2, proxy headers, and why X-Forwarded-For needs care.'],
      ['JOB','lunch','5 applications.'],
      ['IELTS','night','IELTS Writing Task 1 and Task 2, 20 + 40 min, back to back under exam timing.'],
    ]},
    { focus: 'Weekend: ship it', tasks: [
      ['ENG','dawn','Deploy Project 1 to a real host. Public HTTPS URL, custom domain, real certificate, working end to end. Do not stop until a stranger could use it.'],
      ['ENG','lunch','Finish the pipeline: deploy on push to main, smoke test after deploy, automatic rollback on failure. Then write the case-study README — problem, architecture, trade-offs, the latency numbers.'],
      ['REV','night','Week 10 and Block III review. Project 1 is LIVE — add it to your résumé, Upwork portfolio, and LinkedIn featured section tonight.'],
    ]},
    { focus: 'Tell people it exists', tasks: [
      ['ENG','dawn','Draw the architecture diagram. Every arrow labelled with the protocol and the auth mechanism.'],
      ['JOB','lunch','5 applications — and update every earlier application\'s follow-up with the live link.'],
      ['BIZ','night','LinkedIn launch post: the diagram, the live link, the latency numbers. This is your first real signal to the market.'],
    ]},
  ],
},

// ══════════════════════════════════════════════════════════════════
// BLOCK IV — CLOUD, DESIGN & THE EXAM (W11–W13)
// ══════════════════════════════════════════════════════════════════
{
  n: 11, block: 'IV — Cloud, Design & the Exam',
  title: 'AWS Core, and the IELTS Ramp Begins',
  theme: 'Cloud fluency is what moves you from mid to senior on the salary band. Meanwhile the exam is three weeks out, so IELTS takes the evening slots from here.',
  chapters: [
    'phase-6-cloud/02-iam',
    'phase-6-cloud/07-vpc',
    'phase-6-cloud/12-ecs',
    'phase-6-cloud/05-rds',
    'phase-6-cloud/04-s3',
  ],
  deliverable: 'Project 1 re-deployed on AWS: ECS Fargate, RDS PostgreSQL, S3, ALB, CloudWatch alarms.',
  milestone: 'You can draw a 3-tier VPC from memory and explain why the database sits in a private subnet.',
  d: [
    { focus: 'IAM and the security model', tasks: [
      ['ENG','dawn','Phase 6 Ch.2 IAM — policy evaluation logic, roles vs users, assume-role, instance profiles, least privilege in practice.'],
      ['JOB','lunch','5 applications.'],
      ['ENG','night','Build: harden the AWS account. Root locked with MFA, admin via IAM Identity Center, billing alarms, CloudTrail on.'],
    ]},
    { focus: 'VPC and the network', tasks: [
      ['ENG','dawn','Phase 6 Ch.7 VPC — subnets, route tables, IGW vs NAT, security groups vs NACLs. Draw a 3-tier VPC from memory afterwards.'],
      ['JOB','lunch','5 applications.'],
      ['IELTS','night','IELTS Reading full test, 60 min. Then a time audit: which passage cost you the most, and why.'],
    ]},
    { focus: 'Compute and managed data', tasks: [
      ['ENG','dawn','Phase 6 Ch.12 ECS + Ch.5 RDS — Fargate vs EC2 launch type; Multi-AZ vs read replicas; automated backups and PITR.'],
      ['JOB','lunch','5 applications.'],
      ['ENG','night','Build: VPC with public and private subnets across two AZs, correctly scoped security groups.'],
    ]},
    { focus: 'Storage and secrets', tasks: [
      ['ENG','dawn','Phase 6 Ch.4 S3 + Ch.16 Secrets Manager — storage classes, lifecycle rules, presigned URLs, bucket policies.'],
      ['JOB','lunch','5 applications.'],
      ['IELTS','night','IELTS Writing Task 2, 40 min. Then rewrite the weakest paragraph, improving only grammatical range.'],
    ]},
    { focus: 'Weekend build: Project 1 on AWS', tasks: [
      ['ENG','dawn','Build: Project 1 on ECS Fargate behind an ALB. RDS PostgreSQL Multi-AZ in private subnets. Secrets in Secrets Manager, never in env files.'],
      ['ENG','lunch','Build: CloudWatch dashboards for the four golden signals, with alarms into email. Then price the architecture and cut it by a third.'],
      ['REV','night','Week 11 review. Draw the full AWS architecture diagram and add it to the README.'],
    ]},
    { focus: 'System design starts', tasks: [
      ['ENG','dawn','Phase 7 Ch.1 Fundamentals — the interview framework itself, functional vs non-functional requirements, back-of-envelope estimation. Memorise the latency numbers table.'],
      ['JOB','lunch','5 applications.'],
      ['ENG','night','Design and speak: a URL shortener. Full framework, 12 minutes, recorded. Watch it back — you will hate it, and that is the point.'],
    ]},
  ],
},

{
  n: 12, block: 'IV — Cloud, Design & the Exam',
  title: 'System Design Foundations and IELTS Intensive',
  theme: 'Design is a verbal skill, so every session ends with you speaking out loud. IELTS now takes both evening slots and half of Saturday — the exam is nine days away.',
  chapters: [
    'phase-7-system-design/02-scalability',
    'phase-7-system-design/03-caching',
    'phase-7-system-design/04-message-brokers',
    'phase-10-ielts-english/03-ielts-writing',
    'phase-10-ielts-english/05-grammar-for-band-7',
  ],
  deliverable: 'Four system designs recorded, and IELTS Writing consistently hitting Band 7 structure.',
  milestone: 'You can run the full design framework — requirements, estimation, API, data model, high level, deep dive, bottlenecks — without notes.',
  d: [
    { focus: 'Scaling: stateless, load balancing, hashing', tasks: [
      ['ENG','dawn','Phase 7 Ch.2 Scalability — load balancing algorithms, statelessness, sticky sessions and why they are a trap, consistent hashing.'],
      ['JOB','lunch','5 applications.'],
      ['IELTS','night','Phase 10 Ch.5 Grammar for Band 7 — complex sentences, conditionals, relative clauses, articles. Grammatical range is a quarter of your writing score.'],
    ]},
    { focus: 'Caching at architecture level', tasks: [
      ['ENG','dawn','Phase 7 Ch.3 Caching — the full hierarchy from browser to CDN to app to DB, eviction policies, and where a cache actually helps.'],
      ['JOB','lunch','5 applications.'],
      ['IELTS','night','IELTS Writing Task 2, 40 min. Deliberately use three of yesterday\'s complex structures.'],
    ]},
    { focus: 'Message brokers and async architecture', tasks: [
      ['ENG','dawn','Phase 7 Ch.4 Brokers + Ch.5 Event-Driven — Kafka vs RabbitMQ vs SQS, partitions, consumer groups, ordering guarantees, exactly-once as a myth.'],
      ['JOB','lunch','5 applications.'],
      ['ENG','night','Design and speak: a rate limiter for a public API at 1M req/s. Recorded, 12 minutes.'],
    ]},
    { focus: 'Writing Task 1 precision', tasks: [
      ['IELTS','dawn','Task 1 intensive: line graph, bar chart, table, process, map — one of each, 20 min apiece. Overview sentence in every single one.'],
      ['JOB','lunch','5 applications.'],
      ['ENG','night','Design and speak: a news feed read path at 100M DAU. Recorded.'],
    ]},
    { focus: 'Weekend: full IELTS simulation', tasks: [
      ['IELTS','dawn','FULL IELTS MOCK under exam conditions: Listening 40m, Reading 60m, Writing 60m, back to back, no breaks.'],
      ['IELTS','lunch','Score it honestly. Write your predicted band per section. Then two hours on whichever section scored lowest.'],
      ['REV','night','Speaking mock, all three parts, recorded and self-scored. Then Week 12 review.'],
    ]},
    { focus: 'Distributed systems, then taper into exam week', tasks: [
      ['ENG','dawn','Phase 7 Ch.6 Distributed Systems — CAP and its misreadings, eventual vs strong consistency, quorums, and idempotency as the practical answer.'],
      ['JOB','lunch','5 applications.'],
      ['IELTS','night','Speaking: ten cue cards, 2 minutes each, standard one-minute prep. Build the reflex.'],
    ]},
  ],
},

{
  n: 13, block: 'IV — Cloud, Design & the Exam',
  title: 'IELTS Exam Week',
  theme: 'One goal this week. Engineering drops to maintenance and applications continue on autopilot. The exam is Saturday 14 November.',
  chapters: [
    'phase-10-ielts-english/04-ielts-listening-and-reading',
    'phase-10-ielts-english/06-vocabulary-and-topic-banks',
    'phase-10-ielts-english/07-practice-test-and-model-answers',
  ],
  deliverable: 'IELTS taken. Band 7.5+ targeted.',
  milestone: 'EXAM SATURDAY 14 NOVEMBER. Walk out knowing you did every section the way you practised.',
  d: [
    { focus: 'Listening technique', tasks: [
      ['IELTS','dawn','Phase 10 Ch.4 — Listening: prediction before the audio, spelling and number traps, Section 4 note-completion. Two full sections.'],
      ['JOB','lunch','5 applications.'],
      ['IELTS','night','Two more Listening sections, then review every error and categorise it.'],
    ]},
    { focus: 'Reading technique', tasks: [
      ['IELTS','dawn','Reading: matching headings, True/False/Not Given, and the paragraph-matching questions that eat the clock. Two passages, timed.'],
      ['JOB','lunch','5 applications.'],
      ['IELTS','night','Full Reading test, 60 min.'],
    ]},
    { focus: 'Writing final calibration', tasks: [
      ['IELTS','dawn','Phase 10 Ch.7 — study three Band 9 models closely. Annotate what makes each sentence score.'],
      ['JOB','lunch','5 applications.'],
      ['IELTS','night','Task 1 + Task 2 under exam timing. Then memorise your Task 2 skeleton: intro, two bodies with a named example each, conclusion.'],
    ]},
    { focus: 'Speaking calibration, then taper', tasks: [
      ['IELTS','dawn','Speaking: full mock, recorded. Focus on EXTENDING answers — most band losses are underdeveloped answers, not grammar.'],
      ['JOB','lunch','5 applications.'],
      ['REV','night','Stop. Nothing new after tonight. Confirm venue, time, ID, what to bring. Lay it all out. Sleep by 22:00, no screens after 21:30.'],
    ]},
    { focus: 'IELTS EXAM DAY', exam: true, tasks: [
      ['IELTS','dawn','IELTS EXAM. Arrive 45 minutes early. Trust the preparation — it is done, and today is only delivery.'],
      ['REV','lunch','Rest. Genuinely — no studying. You have earned the afternoon.'],
      ['REV','night','Write down how it went, section by section, while it is fresh. Useful if you retake; useful for confidence if you do not.'],
    ]},
    { focus: 'Return to engineering', tasks: [
      ['ENG','dawn','Back to full engineering. Phase 7 Ch.7 Database Scaling — read replicas, replication lag, shard key selection, resharding pain.'],
      ['JOB','lunch','5 applications.'],
      ['ENG','night','Design and speak: sharding a 10TB users table with no downtime. This is a real senior question. Recorded.'],
    ]},
  ],
},

// ══════════════════════════════════════════════════════════════════
// BLOCK V — DIFFERENTIATION (W14–W16)
// ══════════════════════════════════════════════════════════════════
{
  n: 14, block: 'V — Differentiation',
  title: 'System Design Case Studies',
  theme: 'The named designs are interview currency, but the reasoning transfers to whatever they invent on the spot. With the exam behind you, evenings return to engineering.',
  chapters: [
    'phase-7-system-design/09-microservices',
    'phase-7-system-design/08-api-gateway',
    'phase-7-system-design/10-designing-twitter',
    'phase-7-system-design/11-designing-whatsapp',
    'phase-7-system-design/12-designing-youtube',
  ],
  deliverable: 'Five named system designs delivered fluently on camera, each under 30 minutes.',
  milestone: 'You can design Twitter, WhatsApp, or YouTube cold, handling follow-up pressure.',
  d: [
    { focus: 'Microservices and the decomposition question', tasks: [
      ['ENG','dawn','Phase 7 Ch.9 Microservices — service boundaries, the distributed monolith failure mode, data ownership, and the honest case for staying monolithic.'],
      ['JOB','lunch','5 applications.'],
      ['ENG','night','Design and speak: decompose Project 1 into services. Then argue the opposite case. A senior can argue both sides.'],
    ]},
    { focus: 'Gateways and cross-cutting concerns', tasks: [
      ['ENG','dawn','Phase 7 Ch.8 API Gateway — routing, auth offloading, edge rate limiting, BFF, and where a service mesh earns its complexity.'],
      ['JOB','lunch','5 applications.'],
      ['ENG','night','Design and speak: Twitter. Fan-out on write vs read, the celebrity problem, timeline generation. Recorded.'],
    ]},
    { focus: 'Real-time messaging at scale', tasks: [
      ['ENG','dawn','Phase 7 Ch.11 WhatsApp — connection management, delivery receipts, message ordering, offline queues, E2E encryption at design level.'],
      ['JOB','lunch','5 applications.'],
      ['ENG','night','Design and speak: WhatsApp. Then answer three hostile follow-ups you wrote for yourself beforehand.'],
    ]},
    { focus: 'Video, storage, CDN economics', tasks: [
      ['ENG','dawn','Phase 7 Ch.12 YouTube — the transcoding pipeline, adaptive bitrate, CDN strategy, view-count consistency at scale.'],
      ['JOB','lunch','5 applications. Check for IELTS results.'],
      ['ENG','night','Design and speak: YouTube. Recorded.'],
    ]},
    { focus: 'Weekend: design under pressure', tasks: [
      ['ENG','dawn','Mock marathon: three designs back to back, 45 min each, no breaks — Uber, Dropbox, a ticketing system. This simulates a real onsite loop.'],
      ['ENG','lunch','Review the recordings. Where did you freeze? Study that topic now, while the discomfort is fresh.'],
      ['REV','night','Week 14 review. Redo the weakest of the five named designs — the delta between take 1 and take 2 is the whole point.'],
    ]},
    { focus: 'AI engineering begins', tasks: [
      ['ENG','dawn','Phase 8 Ch.1 LLM Fundamentals — tokens, context windows, temperature, sampling, and the actual cost model per million tokens.'],
      ['JOB','lunch','5 applications.'],
      ['ENG','night','PROJECT 2 scoping: a one-page spec for an AI product solving a problem you have actually seen. Name the AI-specific hard part.'],
    ]},
  ],
},

{
  n: 15, block: 'V — Differentiation',
  title: 'AI Engineering — RAG With Measured Retrieval',
  theme: 'The highest-paid specialisation you can add this year, and the one most candidates fake. Build a retrieval system that measurably works and you are in a small group.',
  chapters: [
    'phase-8-ai-engineering/02-prompt-engineering',
    'phase-8-ai-engineering/03-embeddings-vector-databases',
    'phase-8-ai-engineering/04-rag',
  ],
  deliverable: 'PROJECT 2: a RAG system with a 50-question golden set and a measured precision@5, not a demo that merely looks fine.',
  milestone: 'Retrieval precision improved from a measured baseline, with the number in your README.',
  d: [
    { focus: 'Prompting as engineering, not vibes', tasks: [
      ['ENG','dawn','Phase 8 Ch.2 Prompt Engineering — system prompts, few-shot, chain of thought, structured output, and the evaluation loop.'],
      ['JOB','lunch','5 applications.'],
      ['ENG','night','Build: a prompt evaluation harness. 20 test cases, automated scoring, so prompt versions can be compared with a number.'],
    ]},
    { focus: 'Embeddings and vector search', tasks: [
      ['ENG','dawn','Phase 8 Ch.3 — what an embedding is, cosine vs dot product, HNSW and IVF indexes, dimensionality trade-offs.'],
      ['JOB','lunch','5 applications.'],
      ['ENG','night','Build: pgvector in your existing Postgres. Ingest a real corpus. HNSW index. Measure query latency at 100k vectors.'],
    ]},
    { focus: 'Chunking, which decides quality', tasks: [
      ['ENG','dawn','Phase 8 Ch.4 RAG — the full pipeline, and the chunking strategies: fixed, recursive, semantic, structure-aware.'],
      ['JOB','lunch','5 applications.'],
      ['ENG','night','Build: the 50-question golden set. This is the unglamorous work that makes everything after it measurable.'],
    ]},
    { focus: 'Hybrid search and reranking', tasks: [
      ['ENG','dawn','RAG Ch.4 — hybrid search (BM25 + vector), reciprocal rank fusion, cross-encoder reranking, query rewriting.'],
      ['JOB','lunch','5 applications.'],
      ['ENG','night','Build: implement three chunking strategies. Measure precision@5 for each against the golden set. Pick the winner with data.'],
    ]},
    { focus: 'Weekend build: make retrieval good', tasks: [
      ['ENG','dawn','Build: add hybrid search and a reranker. Re-measure precision@5. Document the improvement — this number goes in the README and in interviews.'],
      ['ENG','lunch','Build: citation enforcement with span-level attribution, and correct refusal when context is insufficient. Make it say "I do not know".'],
      ['REV','night','Week 15 review. Record a 3-minute Project 2 demo showing the retrieval numbers, not just the chat window.'],
    ]},
    { focus: 'Production concerns', tasks: [
      ['ENG','dawn','Phase 8 Ch.7 AI SaaS — usage metering, prompt-injection defence, and the unit economics of an AI product.'],
      ['JOB','lunch','5 applications.'],
      ['ENG','night','Build: streaming responses, per-request token cost tracking, embedding cache, and a fallback model. Then answer: what does one user cost per month?'],
    ]},
  ],
},

{
  n: 16, block: 'V — Differentiation',
  title: 'Agents, MCP, and Shipping Project 2',
  theme: 'Agents are where the senior AI roles are. Ship Project 2 this week — it is the portfolio piece that makes you memorable.',
  chapters: [
    'phase-8-ai-engineering/05-ai-agents',
    'phase-8-ai-engineering/06-mcp',
  ],
  deliverable: 'PROJECT 2 LIVE with a public demo, plus an agent with real tools and error recovery.',
  milestone: 'Two projects live with case studies. Portfolio page published with both.',
  d: [
    { focus: 'Agent loops and tool use', tasks: [
      ['ENG','dawn','Phase 8 Ch.5 AI Agents — the agent loop, tool definitions, and when an agent beats a fixed pipeline versus when it is an expensive if-statement.'],
      ['JOB','lunch','5 applications.'],
      ['ENG','night','Build: an agent with three real tools over Project 1\'s API. Handle tool errors, retries, and a hard step limit.'],
    ]},
    { focus: 'MCP and interoperability', tasks: [
      ['ENG','dawn','Phase 8 Ch.6 MCP — the protocol, servers, resources, tools, and why a standard interface matters commercially.'],
      ['JOB','lunch','5 applications.'],
      ['ENG','night','Build: an MCP server exposing your Project 1 data. Connect a client and actually use it.'],
    ]},
    { focus: 'Polish, because unpolished reads as junior', tasks: [
      ['ENG','dawn','Prompt-injection defences on Project 2: untrusted content boundaries, tool-call allowlists, output validation.'],
      ['JOB','lunch','5 applications.'],
      ['ENG','night','Build: error states, loading states, empty states. Then deploy Project 2 to a public URL with a working sample corpus.'],
    ]},
    { focus: 'The portfolio page', tasks: [
      ['ENG','dawn','Write the Project 2 case study: the problem, the pipeline, the golden set, the precision numbers, what you would change at 100x scale.'],
      ['JOB','lunch','5 applications.'],
      ['ENG','night','Build: a single-page portfolio site. Three sections — Project 1, Project 2, about. Problem, architecture, result, live link. Static HTML is fine.'],
    ]},
    { focus: 'Weekend: launch and interview prep', tasks: [
      ['ENG','dawn','Deploy the portfolio page to a custom domain. Test every link as a stranger would. This URL goes in every application from now on.'],
      ['JOB','lunch','Rewrite the résumé with everything from sixteen weeks. One page. Outcomes with numbers. Then update every profile — Upwork, Fiverr, LinkedIn.'],
      ['REV','night','Week 16 and Block V review. LinkedIn post: Project 2, the demo video, the precision numbers.'],
    ]},
    { focus: 'Interview intensive begins', tasks: [
      ['ENG','dawn','Phase 9 Ch.4 Interview Guide — the behavioural question bank. Map your STAR stories to the 20 most common questions.'],
      ['JOB','lunch','5 applications. Prioritise roles posted in the last 72 hours — recency raises response rate sharply.'],
      ['JOB','night','Record all 12 STAR stories. Each under 2 minutes, each with a number in the Result.'],
    ]},
  ],
},

// ══════════════════════════════════════════════════════════════════
// BLOCK VI — CONVERSION (W17–W20)
// ══════════════════════════════════════════════════════════════════
{
  n: 17, block: 'VI — Conversion',
  title: 'Interview Execution',
  theme: 'Applications have been running for eleven weeks; interviews are landing now. Everything from here serves conversion, and new learning only fills gaps interviews have exposed.',
  chapters: [
    'phase-9-software-engineering/04-three-year-developer-interview-guide',
    'phase-5-devops/08-terraform',
    'phase-5-devops/13-monitoring',
  ],
  deliverable: 'Project 1 infrastructure in Terraform, monitoring dashboards live, and a complete interview kit.',
  milestone: 'Two mock interviews with real humans completed. At least three active interview processes.',
  d: [
    { focus: 'Coding interview patterns', tasks: [
      ['ENG','dawn','Pattern review: sliding window, two pointers, fast/slow, monotonic stack, top-K with heap, binary search on answer.'],
      ['JOB','lunch','5 applications.'],
      ['ENG','night','4 LeetCode Medium, 25 min each, narrating out loud the entire time. Silent solving does not transfer to interviews.'],
    ]},
    { focus: 'Infrastructure as code', tasks: [
      ['ENG','dawn','Phase 5 Ch.8 Terraform — modules, remote state with locking, plan discipline, importing existing resources.'],
      ['JOB','lunch','5 applications.'],
      ['ENG','night','Build: convert the Project 1 VPC and networking to Terraform.'],
    ]},
    { focus: 'Monitoring and the on-call story', tasks: [
      ['ENG','dawn','Phase 5 Ch.13 Monitoring — the four golden signals, RED and USE methods, SLIs/SLOs/error budgets.'],
      ['JOB','lunch','5 applications.'],
      ['JOB','night','Write two incident-response STAR stories. Seniors get asked about production failures constantly.'],
    ]},
    { focus: 'Company-specific preparation', tasks: [
      ['JOB','dawn','For each live process: research their stack, read their engineering blog, prepare three questions that prove you did.'],
      ['JOB','lunch','5 applications. Follow up on anything silent for 5 days.'],
      ['ENG','night','4 LeetCode Medium + one system design, recorded.'],
    ]},
    { focus: 'Weekend: mock with a real human', tasks: [
      ['JOB','dawn','Real mock interview with another person — Pramp, interviewing.io, or a peer. The discomfort is the training effect.'],
      ['JOB','lunch','Debrief honestly. Write the three things you did badly, then drill the worst one for the rest of the slot.'],
      ['REV','night','Week 17 review. Funnel analysis: applications → screens → technicals. Which stage is weakest? Fix that stage, not the volume.'],
    ]},
    { focus: 'Terraform completion and negotiation prep', tasks: [
      ['ENG','dawn','Finish the Terraform conversion. `terraform destroy` then `apply` and the whole stack returns. That is the proof.'],
      ['JOB','lunch','5 applications.'],
      ['JOB','night','Phase 9 Ch.3 — salary research for your target roles and regions. Write your number and your walk-away number.'],
    ]},
  ],
},

{
  n: 18, block: 'VI — Conversion',
  title: 'Converting: Final Rounds and Signed Work',
  theme: 'December opens. Companies want to close hires before the holidays — this is a hiring window, not a dead zone.',
  chapters: [
    'phase-11-freelancing-remote/02-winning-proposals-and-profiles',
    'phase-11-freelancing-remote/05-pricing-contracts-client-management',
    'phase-10-ielts-english/10-job-interview-english',
  ],
  deliverable: 'Final-round interviews completed. Client work delivered and invoiced.',
  milestone: 'At least one offer in negotiation, or one signed client contract.',
  d: [
    { focus: 'Gap-driven study', tasks: [
      ['ENG','dawn','Study only what interviews have exposed as weak. Be honest about which topic that is.'],
      ['JOB','lunch','5 applications.'],
      ['ENG','night','3 LeetCode Medium + one design, recorded.'],
    ]},
    { focus: 'Proposal quality over quantity', tasks: [
      ['BIZ','dawn','Phase 11 Ch.2 — rewrite your proposal framework using the response data from fifteen weeks of sending.'],
      ['JOB','lunch','5 applications.'],
      ['BIZ','night','3 proposals with a personalised Loom video each. Video proposals convert several times better than text.'],
    ]},
    { focus: 'Contracts and getting paid', tasks: [
      ['BIZ','dawn','Phase 11 Ch.5 — scope creep defence, milestone structuring, deposits, and the clauses that protect you.'],
      ['JOB','lunch','5 applications.'],
      ['BIZ','night','Finalise the contract template, onboarding questionnaire, and invoice template. Ready to send within an hour of a client saying yes.'],
    ]},
    { focus: 'Negotiation rehearsal', tasks: [
      ['IELTS','dawn','Phase 10 Ch.10 Job Interview English — the phrasing that makes non-native speakers sound senior.'],
      ['JOB','lunch','5 applications.'],
      ['JOB','night','Rehearse out loud: deflecting the early salary question, countering a low offer, handling competing offers, asking for a deadline extension.'],
    ]},
    { focus: 'Weekend: interview simulation and delivery', tasks: [
      ['JOB','dawn','Full mock loop: 45 min coding, 45 min design, 30 min behavioural, no breaks. Recorded.'],
      ['BIZ','lunch','Client delivery, or if no active client, 6 proposals with video. Deliver early and over-deliver — you are buying a review.'],
      ['REV','night','Week 18 review. Offer comparison sheet if anything has landed: base, equity, growth, the actual work, the manager.'],
    ]},
    { focus: 'Push every process forward', tasks: [
      ['JOB','dawn','Review every live process. Anything stalled more than 5 days gets a polite, specific nudge today.'],
      ['JOB','lunch','5 applications. Do not stop applying because you have interviews — offers fall through.'],
      ['ENG','night','3 LeetCode Medium.'],
    ]},
  ],
},

{
  n: 19, block: 'VI — Conversion',
  title: 'Offers, Negotiation, and the Holiday Window',
  theme: 'Most candidates stop this week. That is exactly why it works. Reduced volume, maintained consistency.',
  chapters: [
    'phase-9-software-engineering/03-career-growth',
  ],
  deliverable: 'Offers negotiated. Client retainer proposed.',
  milestone: 'Consistency held through the week everyone else quits.',
  d: [
    { focus: 'Leverage', tasks: [
      ['JOB','dawn','If you have one offer, tell the other processes you have a deadline. This is the single most effective accelerator in hiring.'],
      ['JOB','lunch','5 applications.'],
      ['ENG','night','2 LeetCode Medium + one design. Keep the skills warm.'],
    ]},
    { focus: 'Evaluate properly', tasks: [
      ['JOB','dawn','Build the offer comparison sheet. Salary alone is a bad decision framework — weigh growth, the work, the manager, remote policy.'],
      ['JOB','lunch','5 applications. Backchannel: talk to current or former engineers at the companies you are considering.'],
      ['BIZ','night','Propose a retainer to your best client. Monthly recurring beats project work, permanently.'],
    ]},
    { focus: 'Christmas Eve — wind down', tasks: [
      ['ENG','dawn','Light session: 60 minutes on the most interesting remaining gap. Curiosity, not obligation.'],
      ['JOB','lunch','3 applications.'],
      ['BIZ','night','Client check-in and January pipeline. Send anything that should not wait for the new year.'],
    ]},
    { focus: 'Christmas Day — rest', tasks: [
      ['REV','dawn','Rest day. Optional: 30 minutes reading something technical purely for pleasure.'],
      ['REV','lunch','Rest.'],
      ['REV','night','Rest. Deliberate rest is part of the plan, not a failure of it. Log one line so the streak holds.'],
    ]},
    { focus: 'Weekend: portfolio and pipeline', tasks: [
      ['ENG','dawn','Finish anything unfinished. Everything should be genuinely done, not 90% — a 90% project is worth nothing in an interview.'],
      ['JOB','lunch','Pipeline review: what lands in January, and what needs a nudge before then?'],
      ['REV','night','Week 19 review. Start the year-end document: what you learned, shipped, earned, and would do differently.'],
    ]},
    { focus: 'Decide or extend', tasks: [
      ['JOB','dawn','Decision day for anything with a deadline. If you need more time, ask explicitly — it is almost always granted.'],
      ['JOB','lunch','5 applications — hiring managers clearing inboxes before the new year do respond in this window.'],
      ['BIZ','night','Business planning for January: targets, channels, and a raised rate.'],
    ]},
  ],
},

{
  n: 20, block: 'VI — Conversion',
  title: 'Close-Out and the 2027 Setup',
  theme: 'Finish properly. Whatever the outcome, you end this with a portfolio, a band score, a pipeline, and a system that keeps working.',
  chapters: [],
  deliverable: 'The complete year-end review, a 2027 plan, and every loose end closed.',
  milestone: '1 JANUARY 2027 — job closed, or a pipeline that closes one within weeks.',
  d: [
    { focus: 'Final applications push', tasks: [
      ['JOB','dawn','Prepare 10 tailored applications, ready to send on 1 January. Companies post new requisitions that week and inboxes are empty.'],
      ['JOB','lunch','Follow up on every live process. Clear, direct, no apology.'],
      ['ENG','night','2 LeetCode Medium + one design.'],
    ]},
    { focus: 'Complete the year-end review', tasks: [
      ['REV','dawn','Count it all: chapters read, problems solved, projects shipped, applications sent, interviews done, proposals sent, revenue earned, IELTS band.'],
      ['JOB','lunch','5 applications.'],
      ['REV','night','Write the 2027 plan: the next target, the next skill, the next revenue number.'],
    ]},
    { focus: "New Year's Eve", tasks: [
      ['REV','dawn','Read the Day 1 log entry, then yesterday\'s, back to back. That gap is 136 days of work.'],
      ['JOB','lunch','Send any remaining follow-ups so nothing sits over the new year.'],
      ['REV','night','Rest. Close the year.'],
    ]},
    { focus: '1 JANUARY 2027', tasks: [
      ['REV','dawn','Read your 2027 plan out loud. Set the first target date.'],
      ['JOB','lunch','Send the 10 applications you prepared. New year, new requisitions, empty inboxes — the response rate this week is unusually good.'],
      ['BIZ','night','Send January client outreach. Raise your rate. Begin again, from a completely different starting point than 18 August.'],
    ]},
  ],
},

];

module.exports = { TRACKS, SLOTS, ANCHORS, WEEKS, BUDGET_SWITCH };
