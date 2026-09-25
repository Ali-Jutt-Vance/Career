/**
 * THE BACKEND MASTERY PLAN — 25 September 2026 → 12 September 2027
 * ===============================================================
 *
 * Built for: three years at a small company, very little real coding, AI writing
 * most of it. Currently on PHP and AngularJS at PKR 85,000/month. Target: a real
 * BACKEND engineering job at a top-tier Pakistani software company on Node,
 * NestJS, TypeScript, PostgreSQL, MongoDB, Redis, Docker, AWS — at 3–5x the
 * current salary.
 *
 * WHAT THIS VERSION IS
 * --------------------
 * Zero to backend expert, in the specific shape a three-year backend developer
 * is hired at: Node and NestJS in real depth, SQL *and* NoSQL, the data layer,
 * caching and queues, Linux, Docker, Nginx, CI/CD including Jenkins, AWS,
 * Prometheus and Grafana, and AI/RAG as a genuine backend specialism.
 *
 * FRONTEND IS DEMOTED ON PURPOSE. Two weeks, late, and only far enough to put a
 * usable face on your own APIs and not be helpless in a full-stack interview.
 * The frontend chapters stay in the book as reference. They are not the skill.
 *
 * THE ONE BUDGET
 * --------------
 * 2h Mon–Fri · 4h Saturday · SUNDAY OFF. Fourteen hours a week, fifty weeks
 * straight. 700 scheduled hours in total.
 *
 * WEEKDAY (2h)                        SATURDAY (4h)
 *   05:00–06:30  Deep Work     90m      08:00–10:00  Deep Build       120m
 *   13:00–13:30  Job / English 30m      10:30–11:30  Drill             60m
 *                                       12:00–13:00  Review + Apply    60m
 *   SUNDAY: rest. Zero tasks. Deliberate, and load-bearing.
 *
 * The dawn block carries study on some days and building on others — the day's
 * spec says which. Do not merge them.
 *
 * Three tracks run through the week:
 *   ENG  — Engineering: the chapters, and code you write yourself
 *   JOB  — Job Hunt: CV, GitHub, applications, referrals, interviews, offers
 *   COMM — English & communication: the half of the interview that is not code
 *   REV  — The Saturday review (one task a week, and the most important one)
 *
 * THE RULE: for the first eighteen weeks, no AI writes code for you. Not a line.
 * Documentation yes; asking an AI to *explain* after twenty minutes of genuine
 * attempt, yes. Generated code, no. From 1 February AI returns as a reviewer and
 * a rubber duck, never as an author.
 *
 * THREE PROJECTS, each one the previous one's argument taken further:
 *   Project 1 (W8–W22)  — an Express REST API with a serious data layer
 *   Project 2 (W23–W33) — the same domain rebuilt in NestJS, with queues,
 *                         Redis, WebSockets and real tests
 *   Project 3 (W43–W45) — a retrieval service over your own documents, measured
 *
 * Day specs are in CALENDAR ORDER (Mon → Sat). Every week lists six working
 * days; the builder appends the Sunday rest day automatically.
 */

const TRACKS = {
  ENG:  { label: 'Engineering',   color: '#5b84b8' },
  JOB:  { label: 'Job Hunt',      color: '#c0705a' },
  COMM: { label: 'Communication', color: '#8f7bbf' },
  REV:  { label: 'Review',        color: '#7f8a96' },
};

const SLOTS = {
  weekday: [
    { id: 'dawn',  time: '05:00–06:30', mins: 90, name: 'Deep Work' },
    { id: 'lunch', time: '13:00–13:30', mins: 30, name: 'Job / English' },
  ],
  saturday: [
    { id: 'dawn',  time: '08:00–10:00', mins: 120, name: 'Deep Build' },
    { id: 'mid',   time: '10:30–11:30', mins: 60,  name: 'DSA Drill' },
    { id: 'late',  time: '12:00–13:00', mins: 60,  name: 'Review + Apply' },
  ],
  rest: [],
};

/** Anchor dates the whole plan bends around. These do not move. */
const ANCHORS = {
  start:       '2026-09-25',  // Day 1 — the lead-in (Week 0)
  cvReady:     '2026-10-24',  // CV, LinkedIn and GitHub finished — the gate
  applyStart:  '2026-10-26',  // Applications open, on a weekly quota
  apiLive:     '2026-12-26',  // Project 1 API deployed at a public URL
  aiUnlock:    '2027-02-01',  // AI allowed back — as reviewer, never as author
  project1:    '2027-02-27',  // Project 1 complete: full data layer, SQL + NoSQL
  project2:    '2027-05-15',  // Project 2 live: NestJS, queues, Redis, tested
  project3:    '2027-08-07',  // Project 3 live: retrieval service, measured
  mockStart:   '2027-08-30',  // First mock interview with a real person
  deadline:    '2027-09-11',  // Final review — the plan closes
};

/**
 * APPLICATION QUOTA — applications per week, from the week it starts in.
 * It ramps because an application in week 43, with three shipped backend
 * services attached, is worth ten in week 5.
 */
const APPLY_QUOTA = [
  { fromWeek: 5,  perWeek: 3,  note: 'Targeted only. You are testing the CV and learning the process, not filling a pipeline.' },
  { fromWeek: 13, perWeek: 5,  note: 'The API is live and linkable. The CV finally points at something.' },
  { fromWeek: 23, perWeek: 8,  note: 'The data layer is real. You can hold a database conversation.' },
  { fromWeek: 34, perWeek: 12, note: 'Two services shipped, Nest and Postgres and Redis. You are the candidate the CV describes.' },
  { fromWeek: 43, perWeek: 15, note: 'The push. Ops, AWS and AI on top. Everything you have goes out.' },
];

/**
 * CORE — the chapters the plan holds to a depth target. Everything else in the
 * book is LATER: reference for when a job needs it, and explicitly NOT work you
 * are behind on. This list is backend-shaped on purpose.
 */
const CORE = [
  // Phase 0 — mission
  'phase-0-mission/01-how-to-use-this-book',
  'phase-0-mission/02-the-mission',
  'phase-0-mission/03-beginner-to-mastery-path',
  'phase-0-mission/04-the-ai-dependency-problem',
  'phase-0-mission/05-the-operating-system',
  'phase-0-mission/06-the-scoreboard',
  'phase-0-mission/07-the-whole-day',
  // Phase 1 — language and craft
  'phase-1-programming-foundations/01-javascript',
  'phase-1-programming-foundations/02-typescript',
  'phase-1-programming-foundations/03-data-structures',
  'phase-1-programming-foundations/04-algorithms',
  'phase-1-programming-foundations/05-oop',
  'phase-1-programming-foundations/06-functional-programming',
  'phase-1-programming-foundations/07-asynchronous-programming',
  'phase-1-programming-foundations/08-design-patterns',
  'phase-1-programming-foundations/09-solid-principles',
  'phase-1-programming-foundations/10-clean-code',
  'phase-1-programming-foundations/11-git',
  'phase-1-programming-foundations/12-github',
  'phase-1-programming-foundations/13-dsa-interview-patterns',
  // Phase 2 — backend engineering, all of it
  'phase-2-backend-engineering/01-nodejs',
  'phase-2-backend-engineering/02-expressjs',
  'phase-2-backend-engineering/03-nestjs',
  'phase-2-backend-engineering/04-rest-apis',
  'phase-2-backend-engineering/05-graphql',
  'phase-2-backend-engineering/06-authentication',
  'phase-2-backend-engineering/07-jwt',
  'phase-2-backend-engineering/08-oauth',
  'phase-2-backend-engineering/09-session-management',
  'phase-2-backend-engineering/10-validation',
  'phase-2-backend-engineering/11-error-handling',
  'phase-2-backend-engineering/12-logging',
  'phase-2-backend-engineering/13-file-upload',
  'phase-2-backend-engineering/14-email-services',
  'phase-2-backend-engineering/15-cron-jobs',
  'phase-2-backend-engineering/16-queues',
  'phase-2-backend-engineering/17-websockets',
  'phase-2-backend-engineering/18-redis',
  'phase-2-backend-engineering/19-caching',
  'phase-2-backend-engineering/20-rate-limiting',
  'phase-2-backend-engineering/21-api-versioning',
  'phase-2-backend-engineering/22-api-documentation',
  // Phase 3 — databases, SQL and NoSQL, all of it
  'phase-3-databases/01-sql',
  'phase-3-databases/02-postgresql',
  'phase-3-databases/03-mongodb',
  'phase-3-databases/04-database-design',
  'phase-3-databases/05-normalization',
  'phase-3-databases/06-transactions',
  'phase-3-databases/07-indexes',
  'phase-3-databases/08-query-optimization',
  'phase-3-databases/09-replication',
  'phase-3-databases/10-partitioning',
  'phase-3-databases/11-sharding',
  'phase-3-databases/12-orms',
  'phase-3-databases/13-prisma',
  'phase-3-databases/14-typeorm',
  // Phase 4 — frontend, only far enough to be passable
  'phase-4-frontend/01-html',
  'phase-4-frontend/02-css',
  'phase-4-frontend/03-tailwind',
  'phase-4-frontend/04-react',
  'phase-4-frontend/07-forms',
  'phase-4-frontend/08-authentication',
  // Phase 5 — the operational half
  'phase-5-devops/01-linux',
  'phase-5-devops/02-shell-scripting',
  'phase-5-devops/03-docker',
  'phase-5-devops/04-docker-compose',
  'phase-5-devops/05-nginx',
  'phase-5-devops/06-github-actions',
  'phase-5-devops/07-cicd',
  'phase-5-devops/08-terraform',
  'phase-5-devops/09-networking',
  'phase-5-devops/10-dns',
  'phase-5-devops/11-ssl',
  'phase-5-devops/12-reverse-proxy',
  'phase-5-devops/13-monitoring',
  'phase-5-devops/14-prometheus',
  'phase-5-devops/15-grafana',
  'phase-5-devops/16-jenkins',
  // Phase 6 — AWS
  'phase-6-cloud/01-aws-overview',
  'phase-6-cloud/02-iam',
  'phase-6-cloud/03-ec2',
  'phase-6-cloud/04-s3',
  'phase-6-cloud/05-rds',
  'phase-6-cloud/06-cloudwatch',
  'phase-6-cloud/07-vpc',
  'phase-6-cloud/10-auto-scaling',
  'phase-6-cloud/11-elb',
  'phase-6-cloud/12-ecs',
  'phase-6-cloud/13-eks',
  'phase-6-cloud/14-lambda',
  'phase-6-cloud/15-sns-sqs',
  'phase-6-cloud/16-secrets-manager',
  'phase-6-cloud/19-cost-optimization',
  // Phase 7 — system design
  'phase-7-system-design/01-fundamentals',
  'phase-7-system-design/02-scalability',
  'phase-7-system-design/03-caching',
  'phase-7-system-design/04-message-brokers',
  'phase-7-system-design/05-event-driven-systems',
  'phase-7-system-design/06-distributed-systems',
  'phase-7-system-design/07-database-scaling',
  'phase-7-system-design/08-api-gateway',
  'phase-7-system-design/09-microservices',
  'phase-7-system-design/10-designing-twitter',
  // Phase 8 — AI engineering as a backend specialism
  'phase-8-ai-engineering/01-llm-fundamentals',
  'phase-8-ai-engineering/02-prompt-engineering',
  'phase-8-ai-engineering/03-embeddings-vector-databases',
  'phase-8-ai-engineering/04-rag',
  'phase-8-ai-engineering/05-ai-agents',
  'phase-8-ai-engineering/06-mcp',
  'phase-8-ai-engineering/07-ai-saas',
  // Phase 9 — practice
  'phase-9-software-engineering/01-agile-scrum',
  'phase-9-software-engineering/02-code-reviews-documentation',
  'phase-9-software-engineering/04-three-year-developer-interview-guide',
  'phase-9-software-engineering/05-testing',
  // Phase 10 — communication
  'phase-10-english-communication/01-speaking-about-your-work',
  'phase-10-english-communication/02-explaining-technical-work',
  'phase-10-english-communication/03-the-interview-conversation',
  'phase-10-english-communication/04-written-english-at-work',
  'phase-10-english-communication/05-small-talk-and-first-five-minutes',
  'phase-10-english-communication/06-answering-questions-you-cannot-answer',
  'phase-10-english-communication/07-talking-about-code-out-loud',
  'phase-10-english-communication/08-the-salary-conversation',
  'phase-10-english-communication/09-interview-under-pressure',
  'phase-10-english-communication/10-presenting-a-design',
  'phase-10-english-communication/11-technical-english-for-engineers',
  'phase-10-english-communication/12-professional-communication-reference',
  'phase-10-english-communication/13-job-interview-english-reference',
  // Phase 11 — the job hunt
  'phase-11-job-hunt-pakistan/01-the-pakistani-market',
  'phase-11-job-hunt-pakistan/02-the-cv-that-gets-read',
  'phase-11-job-hunt-pakistan/03-applying-without-wasting-shots',
  'phase-11-job-hunt-pakistan/04-referrals-and-recruiters',
  'phase-11-job-hunt-pakistan/05-the-interview-loop',
  'phase-11-job-hunt-pakistan/06-negotiating-your-offer',
  'phase-11-job-hunt-pakistan/07-the-first-ninety-days',
  'phase-11-job-hunt-pakistan/08-portfolio-and-personal-brand',
  'phase-11-job-hunt-pakistan/09-remote-work-the-next-step',
  'phase-11-job-hunt-pakistan/10-projects-that-prove-three-years',
];

/**
 * WEEKS — day specs in CALENDAR ORDER (Mon, Tue, Wed, Thu, Fri, Sat).
 * Task shape: [track, slot, text]
 *   weekday slots:  dawn (90m) | lunch (30m)
 *   saturday slots: dawn (120m) | mid (60m) | late (60m)
 */
const WEEKS = [

// ══════════════════════════════════════════════════════════════════
// BLOCK I — FOUNDATIONS (W1–W7)
// The language, the craft, and the paperwork. Seven weeks before you
// touch a framework, because a Nest expert who cannot explain a closure
// is a Nest user. No AI writes a line of code in this block.
// ══════════════════════════════════════════════════════════════════
{
  // WEEK 0 — the lead-in. The plan starts on Friday 25 September, so the
  // first calendar week is short: Friday, Saturday, and Sunday off. It sets
  // up the tools and the habit so that Week 1 opens on Monday already moving.
  n: 0, block: 'I — Foundations', leadIn: true,
  dsa: { topic: 'Warm-up — arrays', problems: 2 },
  title: 'The Lead-In: Tools, Repository, and the First Early Morning',
  theme: 'Three days before Week 1 begins. No theory yet — just the machine, the repository and the routine, set up so that Monday at 05:00 is spent learning and not installing things. The no-AI rule starts today.',
  chapters: [
    'phase-0-mission/01-how-to-use-this-book',
    'phase-0-mission/07-the-whole-day',
  ],
  deliverable: 'A working machine (Node LTS, Git, VS Code, a terminal you are comfortable in), a GitHub account with a profile photo and name, and a first commit in a practice repository.',
  milestone: 'Both lead-in days done at their scheduled times, including the 05:00 start on Friday. Sunday taken off properly.',
  d: [
    { focus: 'Set up the machine — before anything else', tasks: [
      ['ENG','dawn','Install Node.js LTS, Git and VS Code. Configure git user.name and user.email. From a terminal, check that node -v, npm -v and git --version all work. Create a folder called practice, run git init, add a README.md with one line, and commit it. No AI — use the official install pages.'],
      ['JOB','lunch','Log in to GitHub (create an account if needed). Set a real profile photo, your full name and your city. This profile is going to be read by recruiters in a month, so it starts looking professional today.'],
    ]},
    { focus: 'Walk through the plan, then a first warm-up', tasks: [
      ['ENG','dawn','Skim Phase 0 Chapter 1 (How to Use This Book) — you read it properly on Monday. Then go through the Plan tab: read the Phase 12 overview chapter (The Plan) end to end, and look through Weeks 1–4 day by day. Then put the plan\'s times in your phone calendar as recurring events — 05:00–06:30 and 13:00–13:30 on weekdays, 08:00–13:00 on Saturdays.'],
      ['ENG','mid','DSA warm-up, no AI: create a LeetCode account and solve two Easy array problems (for example Two Sum and Contains Duplicate). Take up to twenty-five minutes each. This is not the baseline — that is on Tuesday. It only gets the rust off.'],
      ['REV','late','First review: write down which setup steps were harder than they should have been, and what time you actually woke up on Friday. Then read Phase 0 Chapter 7 (The Whole Day): set up your prayer-times app, gym split and phone rules, and book the urologist and dermatologist from its 30-day health checklist. Get everything for Monday ready tonight — the laptop, the chapter open, the alarm set. Sunday is off.'],
    ]},
    { focus: 'Rest day — no tasks', rest: true, tasks: [] },
  ],
},
{
  n: 1, block: 'I — Foundations',
  dsa: { topic: 'Arrays & hashing', problems: 3 },
  title: 'The Honest Audit, and JavaScript You Actually Understand',
  theme: 'Nothing improves until it is measured honestly. This week you write down exactly where you are — including the parts that are embarrassing — and start the language work everything else sits on. No AI writes a line of code for you. That rule is the whole point.',
  chapters: [
    'phase-0-mission/01-how-to-use-this-book',
    'phase-0-mission/02-the-mission',
    'phase-0-mission/04-the-ai-dependency-problem',
    'phase-1-programming-foundations/01-javascript',
    'phase-1-programming-foundations/13-dsa-interview-patterns',
  ],
  deliverable: 'A public GitHub repository named backend-mastery containing LOG.md (one honest paragraph per day), week-01/ with every exercise you wrote by hand, and BASELINE.md recording your starting scores.',
  milestone: 'Six consecutive days with at least one commit. Baseline recorded for: LeetCode Easy solved unaided, JavaScript self-quiz score, and one honest sentence naming what you actually built in three years.',
  d: [
    { focus: 'The audit — write down where you really are', tasks: [
      ['ENG','dawn','Read Phase 0 Chapter 1 (How to Use This Book) and Chapter 2 (The Mission) end to end. Then start Chapter 4 (The AI Dependency Problem) — it is about you, and it is not an insult.'],
      ['JOB','lunch','Open BASELINE.md. Write three things: your current title and salary, the title and salary you want by 11 September 2027, and one honest paragraph naming what you personally built in three years versus what an AI built for you. Nobody else reads this. Lying here costs you the plan.'],
    ]},
    { focus: 'The coding baseline — three problems, no help', tasks: [
      ['ENG','dawn','Create the GitHub repository backend-mastery (public). Add LOG.md and BASELINE.md, commit, push. Then the coding baseline: three LeetCode Easy problems, twenty-five minutes each, no AI, no searching beyond language documentation. Record how many you finished unaided. If the answer is zero, write zero.'],
      ['JOB','lunch','List ten target companies with backend teams. Start with: Arbisoft, Systems Ltd, 10Pearls, VentureDive, Devsinc, Tkxel, Motive, Careem, Folio3, Confiz. Find each careers page URL and write it into TARGETS.md.'],
    ]},
    { focus: 'Values, types, and what === is really doing', tasks: [
      ['ENG','dawn','Phase 1 Chapter 1 (JavaScript) — "Chapter Overview" and "Beginner Theory" in full. Focus on primitives versus objects, and why == and === behave differently. Write notes in your own words in LOG.md, not copied sentences.'],
      ['JOB','lunch','Create a plain-text master CV file. List every project you touched in three years, one line each: what it did, what you did on it, and one number if you can find one.'],
    ]},
    { focus: 'Coercion, by hand', tasks: [
      ['ENG','dawn','No AI: write ten small functions that each demonstrate one type-coercion rule. Predict the output of each before running it. Every wrong prediction is the lesson — write down why you were wrong. Commit it.'],
      ['COMM','lunch','Read Phase 10 Chapter 1 (Speaking About Your Work). Write a four-sentence answer to "What do you do at your current job?" Say it aloud three times. Record yourself once and listen back.'],
    ]},
    { focus: 'Name the habit you are here to break', tasks: [
      ['ENG','dawn','Finish Phase 0 Chapter 4. Then write in LOG.md the three specific things you have reached for AI to do in the last month that you could not do alone. Be exact — "wrote the SQL for the report screen", not "helped with backend". Those three lines are your syllabus.'],
      ['JOB','lunch','Write your LinkedIn headline and About section as a draft. Headline formula: the role you want (Backend Engineer), your core stack, one proof point. Not "aspiring" anything.'],
    ]},
    { focus: 'First build, first review', tasks: [
      ['ENG','dawn','Deep build, two hours, no AI: a command-line contact book in plain Node — add, list, search, delete, saved to a JSON file. No framework, no packages. If you get stuck, read documentation and sit with it. This is the muscle.'],
      ['ENG','mid','DSA drill — read Phase 1 Chapter 13 (DSA Interview Patterns), Chapter Overview and the ladder table. Then this week\'s set: arrays and hashing, timed, no help. Every Saturday from here follows that ladder, and the app shows the week\'s topic.'],
      ['REV','late','Weekly review in LOG.md: how many days did I hit both blocks? Did I break the no-AI rule, and where? What do I understand today that I did not on Monday? Then read next week ahead.'],
    ]},
  ],
},

{
  n: 2, block: 'I — Foundations',
  dsa: { topic: 'Arrays & hashing', problems: 3 },
  title: 'Scope, Closures, and the this Keyword',
  theme: 'Closures are the most common intermediate JavaScript interview question, and "this" is the one people three years in still get wrong. Both are the same idea: a function carries context with it. Get this week right and a whole category of questions stops being frightening.',
  chapters: [
    'phase-1-programming-foundations/01-javascript',
    'phase-0-mission/03-beginner-to-mastery-path',
    'phase-0-mission/05-the-operating-system',
  ],
  deliverable: 'week-02/ containing a counter factory, a private-variable module, a memoisation wrapper, and a written explanation of the var-in-a-loop problem in your own words.',
  milestone: 'You can define a closure out loud, unaided, in one sentence, and produce a working example from a blank file in under five minutes.',
  d: [
    { focus: 'Scope chains and hoisting', tasks: [
      ['ENG','dawn','Phase 1 Chapter 1 — scope and hoisting. Learn the difference between var, let and const in terms of where the binding lives, not just "var is old". Predict the output of five hoisting puzzles before running them.'],
      ['JOB','lunch','Rewrite the three strongest CV lines as achievement bullets: verb, what you did, result. No adjectives. If you cannot find a number, say what changed instead.'],
    ]},
    { focus: 'Closures — the definition that sticks', tasks: [
      ['ENG','dawn','Phase 1 Chapter 1 — closures. A closure is a function that remembers the variables around it after the outer function has finished. Read until you can say that sentence in your own words and mean it, then write it in LOG.md without looking.'],
      ['COMM','lunch','Read Phase 0 Chapter 3 (Beginner to Mastery Path). Write which of the five levels you are honestly at for JavaScript, and what evidence you have for that answer.'],
    ]},
    { focus: 'Closures, by hand', tasks: [
      ['ENG','dawn','No AI: build a counter factory, a private-variable module, and a memoisation wrapper. Three classic closure exercises, blank file each time. Commit all three.'],
      ['JOB','lunch','Find five more target companies that are NOT in the famous ten — smaller product companies and credible software houses with real backend teams. Add them to TARGETS.md.'],
    ]},
    { focus: 'The var-in-a-loop problem', tasks: [
      ['ENG','dawn','No AI: loop over an array with var inside a setTimeout and explain in LOG.md why it prints what it prints. Then fix it three ways — let, an IIFE, a bound argument — and explain why each works.'],
      ['COMM','lunch','Read Phase 0 Chapter 5 (The Operating System). Write one paragraph on which current habit this plan asks you to break, and which one you expect to fail at first.'],
    ]},
    { focus: 'this, call, apply, bind', tasks: [
      ['ENG','dawn','Phase 1 Chapter 1 — the "this" sections. Learn the four binding rules and why arrow functions have no this of their own. No AI: write one example of each rule and predict the output before running.'],
      ['JOB','lunch','Rewrite the remaining CV bullets in the achievement format. Content first, design later.'],
    ]},
    { focus: 'Build something with closures in it', tasks: [
      ['ENG','dawn','Deep build, two hours, no AI: extend the contact book with an undo stack and a simple event system (on/emit). Both are closure exercises wearing a coat. No packages.'],
      ['ENG','mid','Drill: three LeetCode Easy, timed, no help. Then explain one solution out loud in English as if to an interviewer. Record it.'],
      ['REV','late','Weekly review. Did the dawn block hold five days out of five? Where did it slip, and what caused the slip? Read next week ahead.'],
    ]},
  ],
},

{
  n: 3, block: 'I — Foundations',
  dsa: { topic: 'Arrays & hashing', problems: 4 },
  title: 'Arrays, Objects, and Reading Errors Like an Engineer',
  theme: 'The array and object methods that appear in nearly every screening test, and the debugger — because the fastest way to look like a three-year engineer is to read a stack trace correctly instead of guessing.',
  chapters: [
    'phase-1-programming-foundations/01-javascript',
    'phase-1-programming-foundations/10-clean-code',
    'phase-10-english-communication/01-speaking-about-your-work',
  ],
  deliverable: 'week-03/ containing an order-analysis script built with map/filter/reduce, and a written record of four bugs you introduced deliberately and fixed using only the debugger.',
  milestone: 'You can use reduce correctly from memory, and you can set a breakpoint, step into a call, and read the call stack without looking anything up.',
  d: [
    { focus: 'map, filter, reduce', tasks: [
      ['ENG','dawn','Phase 1 Chapter 1 — array methods. Write each of map, filter and reduce yourself from scratch as a plain function before using the built-in. That is the exercise that makes reduce stop being scary.'],
      ['JOB','lunch','Read Phase 11 Chapter 2 (The CV That Gets Read), first half. Note every rule your current CV breaks.'],
    ]},
    { focus: 'Destructuring, spread, and object shapes', tasks: [
      ['ENG','dawn','Phase 1 Chapter 1 — objects, destructuring, spread. No AI: write five functions that pull values cleanly out of a deeply nested object. Learn what optional chaining actually protects you from.'],
      ['COMM','lunch','Phase 10 Chapter 1 — finish it. Rewrite your four-sentence "what do you do" answer using what the chapter says about concrete detail.'],
    ]},
    { focus: 'The order-analysis exercise', tasks: [
      ['ENG','dawn','No AI: from twenty fake order objects produce total revenue, revenue per customer, the top three customers, and a lookup map keyed by id. Use reduce at least twice. Commit it.'],
      ['JOB','lunch','Rewrite your CV summary — three lines, no clichés, naming your stack and your years. Delete every "passionate", "hardworking" and "team player".'],
    ]},
    { focus: 'The debugger', tasks: [
      ['ENG','dawn','Phase 1 Chapter 1 — the "Debugging" section. Breakpoints, step over versus step into, the call stack. Practise on yesterday\'s order script until you stop using console.log as your only tool.'],
      ['COMM','lunch','Write a five-sentence explanation of what a stack trace is, aimed at a junior. Read it aloud. If you cannot explain it simply, you have not learned it.'],
    ]},
    { focus: 'Break it on purpose, fix it with the debugger', tasks: [
      ['ENG','dawn','No AI: break the order script four ways — undefined property, wrong type, off-by-one, async result used too early — and fix each using only the debugger and the stack trace. Write what each error message actually told you.'],
      ['JOB','lunch','Read Phase 1 Chapter 10 (Clean Code) — naming and function length only. Rename every variable in this week\'s code you would be embarrassed to explain in a review.'],
    ]},
    { focus: 'Consolidate the language weeks', tasks: [
      ['ENG','dawn','Deep build, two hours, no AI: a small expense tracker in plain Node — add, list by category, monthly totals, biggest category, JSON storage. Use the array methods deliberately, not accidentally.'],
      ['ENG','mid','Drill: four LeetCode Easy, timed, no help. Array-heavy ones. Compare the count against week 1.'],
      ['REV','late','Weekly review. Name the three JavaScript ideas you now hold that you did not three weeks ago, and the one you are still faking. Read next week ahead.'],
    ]},
  ],
},

{
  n: 4, block: 'I — Foundations',
  dsa: { topic: 'Hash maps — frequency & lookup', problems: 3 },
  title: 'The Event Loop, Promises, and the Paperwork Gate',
  theme: 'Async is where self-taught confidence collapses, and it is asked in every backend interview you will sit. In parallel the paperwork has to finish this week, because applications open on Monday and a gate that slips is a gate that never closes.',
  chapters: [
    'phase-1-programming-foundations/07-asynchronous-programming',
    'phase-11-job-hunt-pakistan/02-the-cv-that-gets-read',
    'phase-11-job-hunt-pakistan/08-portfolio-and-personal-brand',
  ],
  deliverable: 'CV version one as a real PDF, a rewritten LinkedIn profile, a GitHub profile with a README and no empty repositories, and week-04/ with hand-written promise exercises.',
  milestone: 'GATE — CV, LinkedIn and GitHub finished by Saturday 24 October. Not "nearly". A stranger can find you, read one page, and know what you do. And you can explain the event loop out loud in ninety seconds.',
  d: [
    { focus: 'The event loop — why JavaScript does not block', tasks: [
      ['ENG','dawn','Phase 1 Chapter 7 (Asynchronous Programming) — the event loop. Call stack, task queue, microtask queue. Draw it on paper. Then predict the output of five setTimeout/Promise ordering puzzles before running them.'],
      ['JOB','lunch','Phase 11 Chapter 2 — finish it. Then build CV draft one: one page, standard headings, no columns, no photo, no skill bars. Structure only this pass.'],
    ]},
    { focus: 'Callbacks, and why they became a problem', tasks: [
      ['ENG','dawn','Phase 1 Chapter 7 — callbacks and the error-first convention. No AI: write a three-level nested callback chain, feel it, then write down exactly what is unpleasant about it. You need to have felt this to explain why promises exist.'],
      ['JOB','lunch','CV pass two: every bullet starts with a verb, every bullet says what changed. Cut anything you could not defend for sixty seconds. One page, hard limit.'],
    ]},
    { focus: 'Promises from the inside', tasks: [
      ['ENG','dawn','Phase 1 Chapter 7 — promises. Then, no AI: write your own tiny promise-like class with then and catch. It will not be spec-compliant and that is fine. Building it is what makes .then() stop being magic.'],
      ['JOB','lunch','LinkedIn: headline, About, experience entries. Same rules as the CV. Add your GitHub link. Turn on "open to work" for recruiters only.'],
    ]},
    { focus: 'Promise combinators', tasks: [
      ['ENG','dawn','Phase 1 Chapter 7 — Promise.all, allSettled, race, any. No AI: write one realistic use for each, then a retry-with-backoff helper from a blank file. Commit it.'],
      ['JOB','lunch','GitHub profile: add a profile README saying who you are and what you are building. Archive every empty or abandoned repository. Pin backend-mastery.'],
    ]},
    { focus: 'async/await, and the errors it hides', tasks: [
      ['ENG','dawn','Phase 1 Chapter 7 — async/await. Learn what await does to the function around it, and why a missing try/catch in an async function is the most common production bug in Node. No AI: convert your retry helper to async/await.'],
      ['JOB','lunch','Read Phase 11 Chapter 8 (Portfolio and Personal Brand). Export CV version one to PDF as FirstnameLastname-CV.pdf. Send it to yourself and open it on a phone.'],
    ]},
    { focus: 'THE GATE — paperwork finished', tasks: [
      ['ENG','dawn','Deep build, two hours, no AI: a script that calls three public APIs in parallel, handles partial failure with allSettled, retries on timeout, and prints a combined result. The async chapter as a working thing.'],
      ['JOB','mid','GATE CHECK. CV, LinkedIn and GitHub side by side. All three finished today. If one is not, finish it now — the rest of the plan assumes it is done.'],
      ['REV','late','Weekly review. Then: explain the event loop out loud, timed, ninety seconds, recorded. If you cannot, that is Monday\'s dawn block. Read next week ahead — applications open Monday.'],
    ]},
  ],
},

{
  n: 5, block: 'I — Foundations',
  dsa: { topic: 'Two pointers', problems: 4 },
  title: 'Git Properly, and the First Applications',
  theme: 'Applications open — three a week, every one tailored. Three is deliberately small: at this stage each application is a test of the CV, not a lottery ticket. The engineering half is Git, which you have used for three years and do not actually understand.',
  chapters: [
    'phase-1-programming-foundations/11-git',
    'phase-1-programming-foundations/12-github',
    'phase-11-job-hunt-pakistan/03-applying-without-wasting-shots',
  ],
  deliverable: 'Three tailored applications logged in APPLICATIONS.md, and a practice repository where you have created and resolved a merge conflict, rebased a branch, and recovered a lost commit from the reflog.',
  milestone: 'Three applications out. You can explain the difference between merge and rebase, and what git reset --hard actually destroys, without looking it up.',
  d: [
    { focus: 'APPLICATIONS OPEN — the object model', tasks: [
      ['ENG','dawn','Phase 1 Chapter 11 (Git) — the object model. Commits, trees, blobs, refs. Understand that a branch is a moving pointer to a commit and most of Git stops being frightening.'],
      ['JOB','lunch','APPLICATIONS OPEN. Read Phase 11 Chapter 3 (Applying Without Wasting Shots), then send one application from TARGETS.md. Tailor the CV summary line to it. Log company, role, date, link and channel in APPLICATIONS.md.'],
    ]},
    { focus: 'Branching and merging, on purpose', tasks: [
      ['ENG','dawn','Phase 1 Chapter 11 — branching and merging. In a throwaway repository: create a conflict deliberately, resolve it by hand, and write in LOG.md what the conflict markers actually mean.'],
      ['COMM','lunch','Write the cover note you will reuse: four sentences, naming the company and one specific thing about them. Not a letter — something a recruiter reads in twelve seconds.'],
    ]},
    { focus: 'Rebase, and when not to', tasks: [
      ['ENG','dawn','Phase 1 Chapter 11 — rebase, interactive rebase, and the golden rule about rewriting shared history. Squash this week\'s commits into three meaningful ones on a practice branch.'],
      ['JOB','lunch','Second application, tailored, logged.'],
    ]},
    { focus: 'Undo, recover, and the reflog', tasks: [
      ['ENG','dawn','Phase 1 Chapter 11 — reset, revert, stash, reflog. Deliberately lose a commit with reset --hard and recover it from the reflog. Knowing this is the difference between a bad afternoon and a lost day.'],
      ['COMM','lunch','Write a sixty-second spoken answer to "Why are you looking to leave your current job?" that is honest and does not criticise your employer.'],
    ]},
    { focus: 'GitHub as a working surface', tasks: [
      ['ENG','dawn','Phase 1 Chapter 12 (GitHub) — pull requests, reviews, issues. Open a PR against your own backend-mastery repository, review it as if you were someone else, and leave three real comments.'],
      ['JOB','lunch','Third application, tailored, logged. Then review the week\'s three: which did you tailor properly, and which did you send because the slot was open?'],
    ]},
    { focus: 'Async under load', tasks: [
      ['ENG','dawn','Deep build, two hours, no AI: a promise pool that runs N async jobs with a concurrency limit, then use it to fetch fifty URLs five at a time. This is a real interview question at the companies you are targeting.'],
      ['ENG','mid','Drill: three LeetCode Easy and one Medium, timed, no help. The Medium will probably beat you. Write where you got stuck — that is the useful output, not the solve.'],
      ['REV','late','Weekly review. Applications sent: 3. Responses: record honestly. Read next week ahead.'],
    ]},
  ],
},

{
  n: 6, block: 'I — Foundations',
  dsa: { topic: 'Two pointers — sorted arrays', problems: 3 },
  title: 'OOP and SOLID — The Shape NestJS Assumes',
  theme: 'NestJS is an opinionated object-oriented framework built on dependency injection. If classes, interfaces and inversion of control are vague to you, Nest will feel like magic and you will never debug it confidently. This week removes the magic before you meet it.',
  chapters: [
    'phase-1-programming-foundations/05-oop',
    'phase-1-programming-foundations/09-solid-principles',
    'phase-11-job-hunt-pakistan/01-the-pakistani-market',
  ],
  deliverable: 'week-06/ containing a small library system modelled in classes, refactored so the storage mechanism can be swapped without touching business logic, plus your own hand-written dependency-injection container in about thirty lines.',
  milestone: 'You can explain dependency inversion with an example from your own code, and you have written a DI container yourself — so Nest\'s providers will be obvious rather than magical.',
  d: [
    { focus: 'Classes, inheritance, composition', tasks: [
      ['ENG','dawn','Phase 1 Chapter 5 (OOP) — classes, constructors, inheritance, and why composition usually beats inheritance. No AI: model a small library system in classes from a blank file.'],
      ['JOB','lunch','Read Phase 11 Chapter 1 (The Pakistani Market). In TARGETS.md, mark which tier each of your fifteen companies sits in and the realistic band.'],
    ]},
    { focus: 'Encapsulation, interfaces, polymorphism', tasks: [
      ['ENG','dawn','Phase 1 Chapter 5 — encapsulation, polymorphism, abstract types. Refactor yesterday\'s library so the storage mechanism can be swapped without touching business logic. That refactor is the whole lesson.'],
      ['JOB','lunch','One application, tailored, logged.'],
    ]},
    { focus: 'Single responsibility and open/closed', tasks: [
      ['ENG','dawn','Phase 1 Chapter 9 (SOLID) — single responsibility and open/closed. Find the fattest class in your library system and split it. Then add a new storage type without modifying any existing file.'],
      ['COMM','lunch','Write a two-minute spoken answer to "how do you decide when to split a class?" using your own refactor as the example.'],
    ]},
    { focus: 'Dependency inversion — the one that matters for Nest', tasks: [
      ['ENG','dawn','Phase 1 Chapter 9 — dependency inversion. Stop your classes constructing their own dependencies; pass them in. Then, no AI: write a thirty-line container that registers classes by token and resolves their constructor dependencies for you. You have just written the core of Nest.'],
      ['JOB','lunch','Second application, tailored, logged.'],
    ]},
    { focus: 'Liskov and interface segregation, briefly', tasks: [
      ['ENG','dawn','Phase 1 Chapter 9 — the remaining two principles. These matter least day to day and are still asked. One worked example each, from your own code, in LOG.md.'],
      ['COMM','lunch','Third application. Then rehearse: "tell me about a refactor you did and why."'],
    ]},
    { focus: 'Build with your own DI container', tasks: [
      ['ENG','dawn','Deep build, two hours, no AI: rebuild the expense tracker from week 3 on your own DI container — a service, a repository interface, two storage implementations, wired by token. When Nest does this for you in week 23, you will know exactly what it is doing.'],
      ['ENG','mid','Drill: three LeetCode problems, timed. Then explain dependency injection aloud in ninety seconds without using the word "framework".'],
      ['REV','late','Weekly review. Read next week ahead.'],
    ]},
  ],
},

{
  n: 7, block: 'I — Foundations',
  dsa: { topic: 'Sliding window — fixed size', problems: 3 },
  title: 'TypeScript for Backend Engineers',
  theme: 'TypeScript is not optional at the tier you are targeting, and NestJS is built on its decorators and metadata. This week is types that carry weight — generics, narrowing, and the compiler settings that actually catch bugs — plus the decorator mechanics Nest depends on.',
  chapters: [
    'phase-1-programming-foundations/02-typescript',
    'phase-1-programming-foundations/06-functional-programming',
  ],
  deliverable: 'The expense tracker ported to strict TypeScript with no any, plus a worked file demonstrating decorators and metadata reflection from first principles.',
  milestone: 'BLOCK I CLOSES. You can type a function, an object and a generic without help, you know what strict mode turns on, and you can explain what a decorator is at runtime.',
  d: [
    { focus: 'Types, interfaces, unions', tasks: [
      ['ENG','dawn','Phase 1 Chapter 2 (TypeScript) — basic types, interfaces, type aliases, unions. Set up a project from scratch by hand, no starter template. Read every line of the tsconfig you wrote and know what it does.'],
      ['JOB','lunch','One application, tailored, logged.'],
    ]},
    { focus: 'Strict mode, and what it catches', tasks: [
      ['ENG','dawn','Turn on strict, strictNullChecks and noImplicitAny. Fix every error the compiler finds instead of silencing it. Write in LOG.md the three real bugs it caught that you would have shipped.'],
      ['COMM','lunch','Write a four-sentence answer to "What is TypeScript for?" that does not say "it adds types". Say what problem it removes.'],
    ]},
    { focus: 'Generics and narrowing', tasks: [
      ['ENG','dawn','Phase 1 Chapter 2 — generics and narrowing. No AI: write a typed result wrapper (ok/error) and a typed fetch helper. Ban the word any and feel where it hurts.'],
      ['JOB','lunch','Second application, tailored, logged.'],
    ]},
    { focus: 'Decorators and metadata — the Nest prerequisite', tasks: [
      ['ENG','dawn','Phase 1 Chapter 2 — decorators. Turn on experimentalDecorators and emitDecoratorMetadata. No AI: write a class decorator, a method decorator and a parameter decorator, and print what each receives. Then use reflect-metadata to read a constructor parameter\'s type at runtime. That single trick is how Nest injects.'],
      ['COMM','lunch','Third application. Then rehearse: "how comfortable are you with TypeScript?" Answer with what you built this week, not a rating.'],
    ]},
    { focus: 'Functional habits that keep services testable', tasks: [
      ['ENG','dawn','Phase 1 Chapter 6 (Functional Programming) — pure functions, immutability, side effects at the edges. Pull the pure logic out of one of your services so it can be tested without mocks. This habit is what makes week 27 easy.'],
      ['JOB','lunch','Update the CV: TypeScript goes on it now, because you can defend it.'],
    ]},
    { focus: 'BLOCK I REVIEW', tasks: [
      ['ENG','dawn','Deep build, two hours, no AI: port the expense tracker to strict TypeScript, typed end to end, on your own DI container. Seven weeks of foundations in one piece of code.'],
      ['ENG','mid','Block drill: five LeetCode Easy, timed, no help. Compare directly against your week-1 baseline and write both numbers in BASELINE.md.'],
      ['REV','late','BLOCK I REVIEW. Honestly: did the dawn block hold for seven weeks? Did the no-AI rule hold? Unaided problem count now versus week 1? Then read Block II ahead — Node starts.'],
    ]},
  ],
},

// ══════════════════════════════════════════════════════════════════
// BLOCK II — NODE AND EXPRESS, PROPERLY (W8–W13)
// Six weeks on the runtime itself before any framework. The difference
// between a Node user and a Node engineer is whether they can say what
// blocks the loop, what a stream is for, and what happens between a
// request arriving and a response leaving. Project 1 starts here and the
// API is on the public internet by 26 December.
// ══════════════════════════════════════════════════════════════════
{
  n: 8, block: 'II — Node and Express',
  dsa: { topic: 'Sliding window — variable size', problems: 4 },
  title: 'The Node Runtime — Modules, npm, Process',
  theme: 'You have written server code for three years without knowing what the runtime does. This week is modules, resolution, the standard library and the process itself — the ground everything else stands on.',
  chapters: [
    'phase-2-backend-engineering/01-nodejs',
    'phase-10-english-communication/02-explaining-technical-work',
  ],
  deliverable: 'week-08/ containing a three-module project built by hand in both CommonJS and ESM, a directory-walker using fs and path correctly, and a script that fails properly with a non-zero exit code.',
  milestone: 'You can explain module resolution, the difference between CommonJS and ESM, and what an unhandled rejection does to a Node process.',
  d: [
    { focus: 'Modules and resolution', tasks: [
      ['ENG','dawn','Phase 2 Chapter 1 (Node.js) — modules. CommonJS versus ESM, how require actually resolves a path, what each package.json field means. No AI: build a three-module project by hand, both ways, and note what breaks when you mix them.'],
      ['JOB','lunch','One application, tailored, logged.'],
    ]},
    { focus: 'npm, versions, and the lockfile', tasks: [
      ['ENG','dawn','Phase 2 Chapter 1 — npm. Semver ranges, the lockfile, dependencies versus devDependencies versus peerDependencies, and what npm ci does differently from npm install. Then read your own lockfile and find one transitive dependency you did not know you had.'],
      ['COMM','lunch','Read Phase 10 Chapter 2 (Explaining Technical Work). Explain module resolution aloud, in two minutes, to an imaginary non-engineer. Record it.'],
    ]},
    { focus: 'The standard library you never opened', tasks: [
      ['ENG','dawn','Phase 2 Chapter 1 — fs, path, os, crypto, events. No AI: write a directory-walker that reports total size by file extension. Use path correctly so it works on Windows and Linux. Then use crypto to hash each file and find duplicates.'],
      ['JOB','lunch','Second application, tailored, logged.'],
    ]},
    { focus: 'EventEmitter, and the pattern Node is built on', tasks: [
      ['ENG','dawn','Phase 2 Chapter 1 — events. No AI: write your own EventEmitter from a blank file — on, once, emit, off, and correct behaviour when a listener throws. Then read how streams use it.'],
      ['COMM','lunch','Third application. Then write five sentences on why Node chose an event-driven model, in the register you would use in an interview.'],
    ]},
    { focus: 'Process, environment, and dying correctly', tasks: [
      ['ENG','dawn','Phase 2 Chapter 1 — process, environment variables, exit codes, uncaught exceptions and unhandled rejections. No AI: write a script that fails properly — non-zero exit, useful message, nothing swallowed. Then make it handle SIGTERM and shut down cleanly.'],
      ['JOB','lunch','Update the CV with Node — not as a bullet point but as a sentence about what you built with it this week.'],
    ]},
    { focus: 'Build the CLI', tasks: [
      ['ENG','dawn','Deep build, two hours, no AI: a file-processing CLI — read a large CSV, filter rows by a flag, aggregate a column, write a report. Flags parsed by hand, no library. Correct exit codes.'],
      ['ENG','mid','Drill: three LeetCode Easy and one Medium, timed, no help. String problems.'],
      ['REV','late','Weekly review. Read next week ahead.'],
    ]},
  ],
},

{
  n: 9, block: 'II — Node and Express',
  dsa: { topic: 'Strings — parsing & building', problems: 3 },
  title: 'Node Internals — Event Loop Phases, Streams, Buffers',
  theme: 'The week that separates you from every other candidate who says "Node is non-blocking" and cannot go further. Libuv phases, the thread pool, streams and backpressure, and what a Buffer actually is.',
  chapters: [
    'phase-2-backend-engineering/01-nodejs',
    'phase-1-programming-foundations/07-asynchronous-programming',
  ],
  deliverable: 'week-09/ containing a measured demonstration of a blocked event loop, a stream pipeline that processes a file larger than memory, and a written explanation of backpressure in your own words.',
  milestone: 'You can name the event loop phases in order, explain what runs in the thread pool and what does not, and demonstrate backpressure with code you wrote.',
  d: [
    { focus: 'The phases, in order', tasks: [
      ['ENG','dawn','Phase 2 Chapter 1 — the event loop phases: timers, pending callbacks, poll, check, close. Then process.nextTick versus setImmediate versus setTimeout(0). Predict the ordering of a five-line script before running it, and keep predicting until you are right first time.'],
      ['JOB','lunch','One application, tailored, logged.'],
    ]},
    { focus: 'Blocking, measured', tasks: [
      ['ENG','dawn','No AI: write a script that blocks the loop with a synchronous loop and measure the delay it introduces into a timer. Then do the same with a synchronous fs call and with JSON.parse on a huge string. Write the three numbers down — those numbers are an interview answer.'],
      ['COMM','lunch','Write a ninety-second spoken answer to "what does it mean that Node is single-threaded?" that is accurate, including the part where it is not.'],
    ]},
    { focus: 'The thread pool', tasks: [
      ['ENG','dawn','Phase 2 Chapter 1 — libuv\'s thread pool. Which operations use it (fs, dns, crypto, zlib) and which do not (network I/O). Change UV_THREADPOOL_SIZE and measure the difference on four parallel crypto operations. Most candidates have never done this.'],
      ['JOB','lunch','Second application, tailored, logged.'],
    ]},
    { focus: 'Streams and backpressure', tasks: [
      ['ENG','dawn','Phase 2 Chapter 1 — streams. Readable, writable, duplex, transform. No AI: read a large CSV line by line and write a filtered version out without loading the file into memory. Then remove the pipe, write manually, ignore the return value of write(), and watch memory climb. That is backpressure.'],
      ['COMM','lunch','Third application. Then explain backpressure aloud in two minutes using what you just watched happen.'],
    ]},
    { focus: 'Buffers and binary', tasks: [
      ['ENG','dawn','Phase 2 Chapter 1 — Buffer and binary data. Encodings, why a Buffer is not a string, and what happens when you slice one. No AI: parse a small binary file format by hand — read a header, seek, read records.'],
      ['JOB','lunch','Update the CV bullet for Node with something specific from this week — streams, or the thread pool measurement.'],
    ]},
    { focus: 'A transform pipeline', tasks: [
      ['ENG','dawn','Deep build, two hours, no AI: a three-stage stream pipeline — read, transform, write — with a custom Transform stream you wrote, correct error propagation, and a progress report. Run it on a file larger than your available memory.'],
      ['ENG','mid','Drill: three problems, timed. Then explain the event loop phases aloud from memory, in order.'],
      ['REV','late','Weekly review. Read next week ahead.'],
    ]},
  ],
},

{
  n: 10, block: 'II — Node and Express',
  dsa: { topic: 'Strings — anagrams & palindromes', problems: 3 },
  title: 'Express — Routing, Middleware, the Request Lifecycle',
  theme: 'Express is small enough to understand completely, and understanding it completely is what lets you answer the most common backend interview question at this level: what happens between the request arriving and the response leaving.',
  chapters: [
    'phase-2-backend-engineering/02-expressjs',
    'phase-9-software-engineering/01-agile-scrum',
    'phase-11-job-hunt-pakistan/10-projects-that-prove-three-years',
  ],
  deliverable: 'week-10/ containing an Express server with a hand-written middleware stack — request id, logging, timing, body limit, auth check, central error handler — every one written by you, and a diagram of the request lifecycle drawn by you.',
  milestone: 'You can draw the path of a request through an Express app from memory, including where errors go and why middleware order is not cosmetic.',
  d: [
    { focus: 'Routing and the Router', tasks: [
      ['ENG','dawn','Phase 2 Chapter 2 (Express.js) — routing, route parameters, query strings, the Router. No AI: build a server with six routes and a mounted router from a blank file. No generator, no template.'],
      ['JOB','lunch','One application, tailored, logged.'],
    ]},
    { focus: 'Middleware, and why order matters', tasks: [
      ['ENG','dawn','Phase 2 Chapter 2 — middleware. What next() does, what happens when you forget it, and why the order of app.use is load-bearing. No AI: write request-logging and timing middleware by hand, then move one above the other and observe what changes.'],
      ['JOB','lunch','Read Phase 9 Chapter 1 (Agile and Scrum). Write how your current team actually works, honestly, and what you would change. You will be asked.'],
    ]},
    { focus: 'Error handling in Express', tasks: [
      ['ENG','dawn','Phase 2 Chapter 2 — the four-argument error middleware and why it has four arguments. No AI: build a central error handler returning consistent JSON that never leaks a stack trace. Then throw from inside an async handler and discover that Express does not catch it — and fix that.'],
      ['COMM','lunch','Second application. Then write a ninety-second answer to "walk me through what happens when a request hits your server".'],
    ]},
    { focus: 'Parsing, headers, status codes', tasks: [
      ['ENG','dawn','Phase 2 Chapter 2 — body parsing, content types, headers, and status codes that mean what they say. Learn when 400, 401, 403, 404, 409 and 422 are each correct, and set a body size limit before someone finds out you did not.'],
      ['JOB','lunch','Third application, tailored, logged.'],
    ]},
    { focus: 'Choose Project 1', tasks: [
      ['ENG','dawn','Choose PROJECT 1 and write its scope in one paragraph in PROJECT1.md. It must be a backend you would actually use, small enough to finish, and large enough to need auth, relationships, search and background work. You will carry it for fifteen weeks and rebuild it in Nest in week 23.'],
      ['COMM','lunch','Write the one-paragraph description of Project 1 for your CV — present tense, specific, no adjectives.'],
    ]},
    { focus: 'Build the middleware stack', tasks: [
      ['ENG','dawn','Deep build, two hours, no AI: the Project 1 skeleton with a full hand-written middleware stack — request id, logging, timing, body limit, fake auth check, central error handler — each with a comment saying why it sits where it does.'],
      ['ENG','mid','Drill: draw the Express request lifecycle from memory on paper. Then three LeetCode problems, timed.'],
      ['REV','late','Weekly review. Read next week ahead.'],
    ]},
  ],
},

{
  n: 11, block: 'II — Node and Express',
  dsa: { topic: 'Prefix sums', problems: 3 },
  title: 'REST API Design a Reviewer Would Approve',
  theme: 'Anyone can make an endpoint return JSON. This week is the decisions a reviewer looks at: resource naming, status codes, pagination, filtering, idempotency, versioning, and what your API does when the client sends nonsense.',
  chapters: [
    'phase-2-backend-engineering/04-rest-apis',
    'phase-2-backend-engineering/21-api-versioning',
    'phase-2-backend-engineering/22-api-documentation',
    'phase-10-english-communication/04-written-english-at-work',
  ],
  deliverable: 'The Project 1 API with two resources, full CRUD, pagination, filtering, a single documented error shape, and an OpenAPI document that matches the implementation.',
  milestone: 'You can defend every status code your API returns, and explain cursor versus offset pagination and when each breaks.',
  d: [
    { focus: 'Resources, verbs, naming', tasks: [
      ['ENG','dawn','Phase 2 Chapter 4 (REST APIs) — resources, naming, HTTP verbs, and what "RESTful" actually commits you to. Design the full route table for Project 1 on paper before writing any of it.'],
      ['JOB','lunch','One application, tailored, logged.'],
    ]},
    { focus: 'Status codes and one error shape', tasks: [
      ['ENG','dawn','Phase 2 Chapter 4 — status codes and error responses. No AI: define your API\'s error shape once, in writing, then implement it so every error from every endpoint uses it. Consistency here is a reviewer\'s first impression.'],
      ['COMM','lunch','Read Phase 10 Chapter 4 (Written English at Work). Write the Project 1 README — what it is, why it exists, how to run it. Three paragraphs, no filler.'],
    ]},
    { focus: 'Pagination, filtering, sorting', tasks: [
      ['ENG','dawn','Phase 2 Chapter 4 — pagination and query design. Offset versus cursor, and why offset pagination gets slower on every page. No AI: implement offset pagination with a maximum page size, then write down what you would change at a million rows.'],
      ['JOB','lunch','Second application, tailored, logged.'],
    ]},
    { focus: 'Idempotency and versioning', tasks: [
      ['ENG','dawn','Phase 2 Chapter 4 and Chapter 21 (API Versioning) — idempotency, PUT versus PATCH, and versioning strategies. Write in PROJECT1.md which versioning approach you chose and why. An interviewer will ask, and "I did not think about it" is a real answer people give.'],
      ['COMM','lunch','Third application. Then rehearse the answer to "how would you version a breaking change without breaking existing clients?"'],
    ]},
    { focus: 'Document the API', tasks: [
      ['ENG','dawn','Phase 2 Chapter 22 (API Documentation). Document every endpoint by hand first — method, path, parameters, request, response, errors — so you understand the shape. Then generate an OpenAPI document and make it match the implementation exactly.'],
      ['JOB','lunch','Put the Project 1 repository link on your CV and LinkedIn now, even though it is not deployed. It is real and it is readable.'],
    ]},
    { focus: 'Build the API', tasks: [
      ['ENG','dawn','Deep build, two hours, no AI: Project 1 with two resources, full CRUD, pagination, filtering, consistent errors, in-memory storage. The database arrives in Block III; the shape is what matters today.'],
      ['ENG','mid','Drill: three problems, timed, then explain one solution aloud as if to an interviewer.'],
      ['REV','late','Weekly review. Read next week ahead.'],
    ]},
  ],
},

{
  n: 12, block: 'II — Node and Express',
  dsa: { topic: 'Matrix traversal', problems: 3 },
  title: 'Validation, Error Handling, Logging',
  theme: 'The unglamorous week that separates a project that looks like a tutorial from one that looks like production. None of it is hard and all of it is visible to a reviewer within thirty seconds of opening your repository.',
  chapters: [
    'phase-2-backend-engineering/10-validation',
    'phase-2-backend-engineering/11-error-handling',
    'phase-2-backend-engineering/12-logging',
  ],
  deliverable: 'Project 1 with schema validation on every input, a real error taxonomy with custom error classes, and structured logging where a request id flows through every log line for one request.',
  milestone: 'You can trace a single request end to end through your logs by its id, and you can explain the difference between an operational error and a programmer error.',
  d: [
    { focus: 'Validate at the boundary', tasks: [
      ['ENG','dawn','Phase 2 Chapter 10 (Validation) — schema validation at the edge, and why validating inside the handler is already too late. No AI: add schema validation to every endpoint that accepts a body or a query parameter, and return your standard error shape on failure.'],
      ['JOB','lunch','One application, tailored, logged.'],
    ]},
    { focus: 'Types and validators should agree', tasks: [
      ['ENG','dawn','Derive your TypeScript types from your validation schemas so they cannot drift apart. Then deliberately change a schema and watch the compiler find every place that assumed the old shape. This is the payoff for week 7.'],
      ['COMM','lunch','Write five sentences on what your API does when something goes wrong. If the honest answer is "returns 500", that is this week\'s work.'],
    ]},
    { focus: 'An error taxonomy, not a pile of try/catch', tasks: [
      ['ENG','dawn','Phase 2 Chapter 11 (Error Handling) — operational versus programmer errors, custom error classes, and the boundary where an internal error becomes an HTTP response. No AI: refactor Project 1 onto one taxonomy with a base error class.'],
      ['JOB','lunch','Second application, tailored, logged.'],
    ]},
    { focus: 'Structured logging and request ids', tasks: [
      ['ENG','dawn','Phase 2 Chapter 12 (Logging) — structured logs, levels, request ids, and what must never be logged (passwords, tokens, personal data). No AI: add a request id that flows through every log line, then trace one request end to end.'],
      ['COMM','lunch','Third application. Then rehearse: "a user reports an error from yesterday and gives you a timestamp. What do you do?"'],
    ]},
    { focus: 'Async context, so ids flow by themselves', tasks: [
      ['ENG','dawn','Use AsyncLocalStorage so the request id reaches your logger without being passed through every function signature. Understand what it is doing before you use it — this is a genuinely advanced Node feature and a strong interview talking point.'],
      ['JOB','lunch','Check APPLICATIONS.md. Anything with no reply after fourteen days is dead — mark it and move on. Do not chase twice.'],
    ]},
    { focus: 'Harden the whole API', tasks: [
      ['ENG','dawn','Deep build, two hours, no AI: every endpoint validated, every error on the taxonomy, every log line carrying a request id. Then send ten deliberately malformed requests and confirm every one returns a correct, useful, non-leaking response.'],
      ['ENG','mid','Drill: three problems, timed. Then explain your error taxonomy aloud in two minutes.'],
      ['REV','late','Weekly review. Next week the API goes live. Write the deployment checklist tonight. Read next week ahead.'],
    ]},
  ],
},

{
  n: 13, block: 'II — Node and Express',
  dsa: { topic: 'Stacks — monotonic & matching', problems: 4 },
  title: 'Deploy It — The API Goes Public',
  theme: 'A deployed thing you can link to changes every conversation you have from here on. It is not finished and that is the point: deploy early, deploy badly, learn what breaks, and then have a URL on your CV for the remaining thirty-seven weeks.',
  chapters: [
    'phase-2-backend-engineering/22-api-documentation',
    'phase-11-job-hunt-pakistan/04-referrals-and-recruiters',
  ],
  deliverable: 'PROJECT 1 API DEPLOYED at a public URL over HTTPS, with a health check, environment-based configuration, and a README a stranger can follow.',
  milestone: 'ANCHOR — the API is reachable from the public internet on Saturday 26 December. Application quota rises to five a week because the CV now points at something running.',
  d: [
    { focus: 'Configuration and secrets', tasks: [
      ['ENG','dawn','Make Project 1 deployable: every secret and every environment difference in environment variables, validated at startup so the process refuses to boot with a missing one. Then check your git history for anything you committed earlier and deal with it honestly.'],
      ['JOB','lunch','Two applications, tailored, logged. The quota rises to five a week from today.'],
    ]},
    { focus: 'Health checks and readiness', tasks: [
      ['ENG','dawn','Add a health endpoint that actually verifies the dependencies — not one that returns 200 unconditionally. Learn the difference between liveness and readiness, because it will matter in week 41 when this runs on ECS.'],
      ['COMM','lunch','Read Phase 11 Chapter 4 (Referrals and Recruiters). List five people you already know who work at a target company.'],
    ]},
    { focus: 'Pick a host and read its documentation', tasks: [
      ['ENG','dawn','Choose a host, create the account, and read its Node deployment documentation end to end before writing anything. Then write your deployment steps down as a checklist. AWS comes in Block VII; today you want it live, not perfect.'],
      ['JOB','lunch','Two applications, tailored, logged.'],
    ]},
    { focus: 'Graceful shutdown', tasks: [
      ['ENG','dawn','Handle SIGTERM: stop accepting connections, finish in-flight requests, close resources, exit zero. Then test it by deploying while making requests and proving nothing was dropped. Most candidates have never thought about this.'],
      ['COMM','lunch','Message one referral contact — no ask in the first message, just a real reconnection.'],
    ]},
    { focus: 'Deployment rehearsal', tasks: [
      ['ENG','dawn','Rehearse the whole deployment locally against a production-style configuration. Write down every step. It will still fail on Saturday, but it will fail for a reason you can find.'],
      ['JOB','lunch','Fifth application of the week. Then prepare the CV line you will use once the URL is live.'],
    ]},
    { focus: 'ANCHOR — the API goes live', tasks: [
      ['ENG','dawn','Deep build, two hours, no AI: DEPLOY. Public URL, HTTPS, environment variables set, health check answering. It will not work the first time. That is the exercise.'],
      ['ENG','mid','Verify from outside: call every endpoint from your phone on mobile data. Then put the URL in the README, on the CV, and on LinkedIn.'],
      ['REV','late','Weekly review. Write in LOG.md exactly what broke during the deploy and what you learned from each failure. That list is an interview answer. Read next week ahead — databases, and the most important nine weeks in this plan.'],
    ]},
  ],
},

// ══════════════════════════════════════════════════════════════════
// BLOCK III — DATABASES (W14–W22)
// Nine weeks. The longest block in the plan, deliberately. In this
// market the difference between a 120k backend developer and a 250k one
// is almost always the data layer: whether they can design a schema,
// read a query plan, reason about a transaction, and say honestly when
// a document database is the right answer. SQL first, then NoSQL, then
// the scaling vocabulary.
// ══════════════════════════════════════════════════════════════════
{
  n: 14, block: 'III — Databases',
  dsa: { topic: 'Queues & deques', problems: 3 },
  title: 'SQL I — Selects, Joins, Thinking in Sets',
  theme: 'You have written SQL for three years and most of it was generated. SQL is the highest-return subject in this book: asked in almost every interview, testable in fifteen minutes, and being genuinely good at it is rare enough to be a differentiator.',
  chapters: [
    'phase-3-databases/01-sql',
  ],
  deliverable: 'A seeded PostgreSQL practice database of five related tables and a few thousand rows, plus forty solved exercises written by hand with no AI and no copied answers.',
  milestone: 'You can write a three-table join with grouping and a having clause from a blank editor, first try, without looking up the syntax.',
  d: [
    { focus: 'Build the practice ground', tasks: [
      ['ENG','dawn','Install PostgreSQL locally. Create a practice database with five related tables — customers, orders, order_items, products, categories — and seed a few thousand rows with a script you write yourself. This database is your practice ground for nine weeks.'],
      ['JOB','lunch','Two applications, tailored, logged.'],
    ]},
    { focus: 'SELECT, WHERE, and NULL', tasks: [
      ['ENG','dawn','Phase 3 Chapter 1 (SQL) — selection and filtering. Ten exercises by hand. Pay real attention to NULL: why NULL = NULL is not true, what that breaks in a WHERE clause, and why COUNT(column) and COUNT(*) disagree.'],
      ['COMM','lunch','Write the difference between WHERE and HAVING in three sentences, as if explaining to a junior.'],
    ]},
    { focus: 'Joins — all of them, deliberately', tasks: [
      ['ENG','dawn','Phase 3 Chapter 1 — joins. Inner, left, right, full, cross, self. Ten exercises. For each, predict the row count before running it. The prediction is the exercise, not the query.'],
      ['JOB','lunch','Two applications, tailored, logged.'],
    ]},
    { focus: 'Aggregation and grouping', tasks: [
      ['ENG','dawn','Phase 3 Chapter 1 — GROUP BY, aggregates, HAVING. Ten exercises, at least three needing a join and a group together. That combination is the classic interview question.'],
      ['COMM','lunch','Fifth application. Then write the three SQL questions you would ask about your practice schema if you were interviewing yourself.'],
    ]},
    { focus: 'Subqueries and CTEs', tasks: [
      ['ENG','dawn','Phase 3 Chapter 1 — subqueries, correlated subqueries, and common table expressions. Ten exercises. Rewrite three of them both ways and note which reads better and why.'],
      ['JOB','lunch','Update the CV: PostgreSQL moves from a listed skill to a sentence about what you did with it.'],
    ]},
    { focus: 'SQL under time pressure', tasks: [
      ['ENG','dawn','Deep build, two hours, no AI: connect Project 1 to PostgreSQL. Replace in-memory storage with real tables and hand-written SQL. No ORM yet, on purpose — you will appreciate it more in week 20.'],
      ['ENG','mid','Drill: five SQL questions, fifteen minutes each, blank editor, no reference. This is exactly the format of a screening test.'],
      ['REV','late','Weekly review. Count your forty exercises honestly. Read next week ahead.'],
    ]},
  ],
},

{
  n: 15, block: 'III — Databases',
  dsa: { topic: 'Linked lists — traversal & reversal', problems: 4 },
  title: 'SQL II — Window Functions and the Hard Queries',
  theme: 'The second SQL week, and the one that makes you unusual. Window functions are asked at tier 2, rarely known at tier 4, and they turn a category of "impossible without application code" questions into four lines.',
  chapters: [
    'phase-3-databases/01-sql',
    'phase-3-databases/08-query-optimization',
  ],
  deliverable: 'week-15/ containing thirty more solved exercises covering window functions, ranking, running totals, gaps and islands, and set operations.',
  milestone: 'You can produce a per-group top-N query and a running total with a window function, from memory, and explain what the frame clause does.',
  d: [
    { focus: 'Window functions — the model', tasks: [
      ['ENG','dawn','Phase 3 Chapter 1 — window functions. OVER, PARTITION BY, ORDER BY, and how a window differs from a GROUP BY: the rows stay. Six exercises. Say the difference out loud before you move on.'],
      ['JOB','lunch','Two applications, tailored, logged.'],
    ]},
    { focus: 'Ranking and per-group top-N', tasks: [
      ['ENG','dawn','ROW_NUMBER, RANK, DENSE_RANK, and the per-group top-N pattern. Six exercises. This exact question — "the three biggest orders for each customer" — is asked constantly and beats most candidates.'],
      ['COMM','lunch','Explain the difference between RANK and DENSE_RANK aloud, with an example, in sixty seconds.'],
    ]},
    { focus: 'Running totals and frames', tasks: [
      ['ENG','dawn','Running totals, moving averages, LAG and LEAD, and the frame clause (ROWS versus RANGE). Six exercises. The frame clause is where people who half-know window functions come unstuck.'],
      ['JOB','lunch','Two applications, tailored, logged.'],
    ]},
    { focus: 'Set operations and gaps', tasks: [
      ['ENG','dawn','UNION versus UNION ALL, INTERSECT, EXCEPT, and the gaps-and-islands pattern for finding missing sequences and consecutive runs. Six exercises.'],
      ['COMM','lunch','Fifth application. Then rehearse: "tell me about the most complex query you have written."'],
    ]},
    { focus: 'Rewrite your own queries', tasks: [
      ['ENG','dawn','Six exercises against your Project 1 data. Then find two places in Project 1 where you pulled rows into Node and looped over them, and replace each with one query. Write down how many round trips you removed.'],
      ['JOB','lunch','Check the funnel: how many replies from your first thirty applications? Under three means the CV is the problem, not the volume.'],
    ]},
    { focus: 'Reporting endpoints, done in SQL', tasks: [
      ['ENG','dawn','Deep build, two hours, no AI: add three reporting endpoints to Project 1 that would have been painful without window functions. All the work happens in the database.'],
      ['ENG','mid','Drill: five SQL questions, timed, blank editor. Include one window function question.'],
      ['REV','late','Weekly review. Read next week ahead.'],
    ]},
  ],
},

{
  n: 16, block: 'III — Databases',
  dsa: { topic: 'Linked lists — cycle & merge', problems: 3 },
  title: 'Schema Design and Normalization',
  theme: 'Design questions separate three-year engineers from each other. Anyone can query a schema someone else designed. This week is designing one that does not have to be rescued in eighteen months.',
  chapters: [
    'phase-3-databases/04-database-design',
    'phase-3-databases/05-normalization',
    'phase-10-english-communication/03-the-interview-conversation',
  ],
  deliverable: 'A designed, documented and migrated schema for Project 1 — entities, relationships, keys, constraints — with a written justification for every denormalisation you chose.',
  milestone: 'Given a described business problem you can produce a normalised schema on paper in twenty minutes and defend each decision.',
  d: [
    { focus: 'Entities, relationships, keys', tasks: [
      ['ENG','dawn','Phase 3 Chapter 4 (Database Design) — entities, relationships, primary and foreign keys, one-to-many and many-to-many. Redesign the Project 1 schema on paper before touching a migration file.'],
      ['JOB','lunch','Two applications, tailored, logged.'],
    ]},
    { focus: 'Normal forms as anomalies prevented', tasks: [
      ['ENG','dawn','Phase 3 Chapter 5 (Normalization) — first, second and third normal form. Learn each as the anomaly it prevents, not a definition to recite. Then find a table at your current job that violates 3NF and write what could go wrong.'],
      ['COMM','lunch','Read Phase 10 Chapter 3 (The Interview Conversation). Note the three things you currently do that the chapter warns against.'],
    ]},
    { focus: 'Constraints are enforced documentation', tasks: [
      ['ENG','dawn','Phase 3 Chapter 4 — constraints. NOT NULL, UNIQUE, CHECK, foreign keys, ON DELETE behaviour. No AI: add real constraints to every Project 1 table, then try to insert bad data and watch the database refuse it.'],
      ['JOB','lunch','Two applications, tailored, logged.'],
    ]},
    { focus: 'When to denormalise, and how to say so', tasks: [
      ['ENG','dawn','Phase 3 Chapter 5 — denormalisation as a trade of write complexity for read speed. Write every one you have chosen into PROJECT1.md with the exact reason. If you cannot write the reason, undo it.'],
      ['COMM','lunch','Fifth application. Then practise "how would you design the schema for X" using your own project, ninety seconds, aloud.'],
    ]},
    { focus: 'Migrations, properly', tasks: [
      ['ENG','dawn','No AI: move the schema into versioned migrations. Write one that adds a column and one that backfills it, then roll both back. A schema you cannot roll back is a schema you cannot change.'],
      ['JOB','lunch','Ask one referral contact directly whether they would refer you. Have the CV and a two-line summary ready in the same message.'],
    ]},
    { focus: 'Design under interview conditions', tasks: [
      ['ENG','dawn','Deep build, two hours, no AI: finish the Project 1 schema — every entity, relationship and constraint, seeded with realistic data by a script you wrote.'],
      ['ENG','mid','Drill: design a normalised schema for a clinic, a courier and a small marketplace. Twenty minutes each, on paper, timed.'],
      ['REV','late','Weekly review. Read next week ahead.'],
    ]},
  ],
},

{
  n: 17, block: 'III — Databases',
  dsa: { topic: 'Binary search — exact match', problems: 3 },
  title: 'PostgreSQL in Depth',
  theme: 'PostgreSQL specifically, not "a database". Types that prevent bugs, JSONB for the genuinely schemaless parts, psql instead of a GUI, and the features that make Postgres the default answer at the companies you are targeting.',
  chapters: [
    'phase-3-databases/02-postgresql',
  ],
  deliverable: 'Project 1 using correct Postgres types throughout, one justified JSONB column with an index on it, and a written note on every type choice you changed and why.',
  milestone: 'You can use psql without a GUI, and you can explain why timestamptz and numeric exist and what goes wrong without them.',
  d: [
    { focus: 'Types that prevent bugs', tasks: [
      ['ENG','dawn','Phase 3 Chapter 2 (PostgreSQL) — types. timestamptz versus timestamp, numeric versus float for money, text versus varchar, enums, arrays. Fix every wrong type in Project 1 and write down what each one could have cost you.'],
      ['JOB','lunch','Two applications, tailored, logged.'],
    ]},
    { focus: 'psql, properly', tasks: [
      ['ENG','dawn','Phase 3 Chapter 2 — psql. \\dt, \\d+, \\timing, \\x, \\ef, and running a file. Stop using a GUI for the rest of the plan. Then inspect your own schema entirely from the command line.'],
      ['COMM','lunch','Write a two-minute answer to "why PostgreSQL for this project?" about your project specifically, not a generic comparison.'],
    ]},
    { focus: 'JSONB, and when a column is a document', tasks: [
      ['ENG','dawn','Phase 3 Chapter 2 — JSONB. Operators, containment, and GIN indexes. The honest answer to when it is correct: genuinely schemaless data, not a way to avoid designing a table. Add one justified JSONB column to Project 1, query it, and index it.'],
      ['JOB','lunch','Two applications, tailored, logged.'],
    ]},
    { focus: 'Constraints, defaults and generated columns', tasks: [
      ['ENG','dawn','Phase 3 Chapter 2 — CHECK constraints, defaults, generated columns, and partial unique indexes. Push one rule that currently lives in your Node code down into the database, and notice that it is now impossible to violate.'],
      ['COMM','lunch','Fifth application. Then rehearse: "where do you put business rules — application or database?" Have a real position and a reason.'],
    ]},
    { focus: 'Full-text search, before you reach for Elasticsearch', tasks: [
      ['ENG','dawn','Phase 3 Chapter 2 — tsvector, tsquery and full-text search. Add search to Project 1 with Postgres alone. Knowing that Postgres can do this is worth an interview answer on its own, because most people add a second system too early.'],
      ['JOB','lunch','Update the CV with a specific Postgres line — JSONB, or full-text search, or the type corrections.'],
    ]},
    { focus: 'Make the data layer solid', tasks: [
      ['ENG','dawn','Deep build, two hours, no AI: every type correct, constraints in place, search working, JSONB where justified. Then write the data-layer section of PROJECT1.md explaining each decision.'],
      ['ENG','mid','Drill: five SQL and Postgres questions, timed. Then explain JSONB versus a normalised table aloud, with your own example.'],
      ['REV','late','Weekly review. Read next week ahead.'],
    ]},
  ],
},

{
  n: 18, block: 'III — Databases',
  dsa: { topic: 'Binary search — on the answer', problems: 4 },
  title: 'Indexes and Query Plans',
  theme: 'The single most valuable week in the plan for your market position. Very few three-year candidates in this market can honestly say "I read query plans". After this week you can, with numbers from your own project.',
  chapters: [
    'phase-3-databases/07-indexes',
    'phase-3-databases/08-query-optimization',
  ],
  deliverable: 'A written before-and-after for five queries you indexed, with the EXPLAIN ANALYZE output for each and the timing difference.',
  milestone: 'You can read an EXPLAIN ANALYZE plan, say which line is the problem, and predict whether an index will help before you create it.',
  d: [
    { focus: 'What an index actually is', tasks: [
      ['ENG','dawn','Phase 3 Chapter 7 (Indexes) — B-tree structure, and why an index is a trade: faster reads, slower writes, more disk. Look at your tables and predict which columns need indexes before measuring anything. Write the predictions down.'],
      ['JOB','lunch','Two applications, tailored, logged.'],
    ]},
    { focus: 'EXPLAIN ANALYZE', tasks: [
      ['ENG','dawn','Phase 3 Chapter 8 (Query Optimization) — reading a plan. Sequential scan versus index scan, nested loop versus hash versus merge join, and what the cost, rows and actual time numbers mean. Run it on five of your own queries and read every line.'],
      ['COMM','lunch','Write a two-minute explanation of what an index is for a non-technical manager, then a ninety-second one for an interviewer. Both aloud.'],
    ]},
    { focus: 'Composite indexes and column order', tasks: [
      ['ENG','dawn','Phase 3 Chapter 7 — composite indexes and why column order matters. No AI: create one, then write one query it helps and one it does not, and prove both with EXPLAIN. The left-prefix rule is a standard interview question.'],
      ['JOB','lunch','Two applications, tailored, logged.'],
    ]},
    { focus: 'The other index types', tasks: [
      ['ENG','dawn','Phase 3 Chapter 7 — partial indexes, covering indexes and index-only scans, GIN for JSONB and full-text. Add a partial index to Project 1 where most rows are irrelevant, and measure the size difference.'],
      ['COMM','lunch','Fifth application. Then rehearse: "this query is slow. Walk me through what you would do." Have an ordered method, not a guess.'],
    ]},
    { focus: 'The optimisations that are not indexes', tasks: [
      ['ENG','dawn','Phase 3 Chapter 8 — SELECT *, N+1, unnecessary sorts, functions on indexed columns that disable them, and pagination that degrades. Find at least three of these in your own code and fix them.'],
      ['JOB','lunch','Update the CV with a measured number: "reduced X from Nms to Mms". You now have real ones.'],
    ]},
    { focus: 'Measure everything', tasks: [
      ['ENG','dawn','Deep build, two hours, no AI: index Project 1 properly. Five queries, before and after, EXPLAIN ANALYZE output saved for each. Then write it up — that document is interview material for the rest of the plan.'],
      ['ENG','mid','Drill: five query-plan questions, timed. Read a plan and say what is wrong with it.'],
      ['REV','late','Weekly review. Read next week ahead.'],
    ]},
  ],
},

{
  n: 19, block: 'III — Databases',
  dsa: { topic: 'Sorting — custom comparators', problems: 3 },
  title: 'Transactions and Concurrency — and AI Comes Back',
  theme: 'Transactions separate a developer from an engineer in a backend interview. Two users buying the last item at the same moment is a question you will be asked, and the answer is not "I would check the stock first". Also: on Monday, AI returns as a reviewer.',
  chapters: [
    'phase-3-databases/06-transactions',
    'phase-10-english-communication/05-small-talk-and-first-five-minutes',
  ],
  deliverable: 'week-19/ containing a demonstrated lost-update race condition and three different correct fixes, each with the SQL and a written explanation of its trade-off.',
  milestone: 'ANCHOR — AI unlocked on Monday 1 February, as reviewer and teacher, never author. And you can describe a race condition you personally reproduced.',
  d: [
    { focus: 'AI UNLOCKED — the rules of use', tasks: [
      ['ENG','dawn','Read the final section of Phase 0 Chapter 4 again. Then write the AI clause into your repository README: I may use AI to review, explain and check, never to author, and I must be able to explain every line here unaided. Eighteen weeks of building the muscle end today; do not undo them in a fortnight.'],
      ['JOB','lunch','Two applications, tailored, logged.'],
    ]},
    { focus: 'ACID, concretely', tasks: [
      ['ENG','dawn','Phase 3 Chapter 6 (Transactions) — ACID. For each letter write your own example from Project 1. A definition you cannot illustrate is one you will fumble in an interview.'],
      ['COMM','lunch','Read Phase 10 Chapter 5 (Small Talk and the First Five Minutes). Practise the first ninety seconds of a call aloud — greeting, one line about yourself, one question back.'],
    ]},
    { focus: 'Isolation levels and their anomalies', tasks: [
      ['ENG','dawn','Phase 3 Chapter 6 — isolation levels. Dirty read, non-repeatable read, phantom read, and which level permits which. Find out what PostgreSQL actually defaults to and what that means for your code.'],
      ['JOB','lunch','Two applications, tailored, logged.'],
    ]},
    { focus: 'Reproduce a race condition', tasks: [
      ['ENG','dawn','No AI for this one — do it yourself. Open two psql sessions and deliberately produce a lost update on a Project 1 table. Watch it happen. Write down exactly what each session did and when.'],
      ['COMM','lunch','Fifth application. Then rehearse: "how would you handle two users buying the last item at the same time?" You have now actually done it — say so.'],
    ]},
    { focus: 'Three ways to fix it', tasks: [
      ['ENG','dawn','Phase 3 Chapter 6 — locking. Fix yesterday\'s race three ways: SELECT FOR UPDATE, an optimistic version column, and a single atomic UPDATE. Write the trade-off of each, then choose one for Project 1 and implement it.'],
      ['JOB','lunch','Check for any transaction in Project 1 that stays open across a network call. That is a production incident waiting, and finding one is a good interview story.'],
    ]},
    { focus: 'Make Project 1 transaction-safe', tasks: [
      ['ENG','dawn','Deep build, two hours: wrap every multi-step write in a proper transaction, then write a script that hammers one endpoint concurrently and prove the data stays consistent. AI may review what you wrote; it may not write it.'],
      ['ENG','mid','Drill: five SQL questions including two on transactions and deadlocks, timed. No AI — the drill stays AI-free for the rest of the plan, because interviews are.'],
      ['REV','late','Weekly review. Honest question: did AI creep back into authoring this week, and where? Read next week ahead.'],
    ]},
  ],
},

{
  n: 20, block: 'III — Databases',
  dsa: { topic: 'Intervals — merge & overlap', problems: 4 },
  title: 'ORMs — Prisma and TypeORM',
  theme: 'Every team you interview with uses an ORM, and the useful answer to "why not raw SQL" is one you can only give having done both. You have written six weeks of SQL by hand; now learn what an ORM buys and what it quietly costs.',
  chapters: [
    'phase-3-databases/12-orms',
    'phase-3-databases/13-prisma',
    'phase-3-databases/14-typeorm',
  ],
  deliverable: 'Project 1 on Prisma, with three queries deliberately left in raw SQL and a comment on each saying why, plus a written comparison of Prisma and TypeORM from having used both.',
  milestone: 'You can name three things an ORM makes worse, not just three it makes better. And you can reproduce and fix an N+1 query on demand.',
  d: [
    { focus: 'What an ORM buys and costs', tasks: [
      ['ENG','dawn','Phase 3 Chapter 12 (ORMs) — the mapping problem, leaky abstractions, and migration control. Then reproduce an N+1 query deliberately in your own project and measure it. You need to have seen it to talk about it.'],
      ['JOB','lunch','Two applications, tailored, logged.'],
    ]},
    { focus: 'Prisma — schema, client, migrations', tasks: [
      ['ENG','dawn','Phase 3 Chapter 13 (Prisma) — schema definition, the generated client, and migrate. Express the Project 1 schema in Prisma and generate the client. Then read the SQL Prisma actually emits for three of your queries.'],
      ['COMM','lunch','Write a ninety-second answer to "ORM or raw SQL?" that refuses the false choice and says when each.'],
    ]},
    { focus: 'TypeORM — because Nest defaults to it', tasks: [
      ['ENG','dawn','Phase 3 Chapter 14 (TypeORM) — entities, decorators, the repository pattern, relations. Model two Project 1 entities in TypeORM on a branch. You need this specifically for the Nest block, and the decorator work from week 7 is why it will make sense.'],
      ['JOB','lunch','Two applications, tailored, logged.'],
    ]},
    { focus: 'Port the data layer', tasks: [
      ['ENG','dawn','Port Project 1\'s queries to Prisma. Keep three in raw SQL on purpose, where the ORM would make them worse, and comment each with the reason. AI may review; it may not write.'],
      ['COMM','lunch','Fifth application. Then rehearse: "tell me about a time the ORM was the wrong tool."'],
    ]},
    { focus: 'Fix the N+1 three ways', tasks: [
      ['ENG','dawn','Fix your N+1 with eager loading, with a single join query, and with a batched lookup. Measure all three. Then write down which you chose and why — this is a favourite interview question and you now have a real answer.'],
      ['JOB','lunch','Update the CV: Prisma and TypeORM both go on now, because you have used both.'],
    ]},
    { focus: 'Raw versus ORM, measured', tasks: [
      ['ENG','dawn','Deep build, two hours: write your three most complex Project 1 queries both ways and time both against seeded data. Write the comparison into PROJECT1.md with the numbers.'],
      ['ENG','mid','Drill: five questions on ORMs, N+1 and transactions, spoken, timed.'],
      ['REV','late','Weekly review. Read next week ahead — NoSQL.'],
    ]},
  ],
},

{
  n: 21, block: 'III — Databases',
  dsa: { topic: 'Trees — DFS traversal', problems: 4 },
  title: 'MongoDB and Modelling Without Joins',
  theme: 'NoSQL is not "SQL but easier", it is a different modelling discipline: you design around your queries instead of around your entities. Knowing when a document store is genuinely right — and saying so honestly — is worth more in an interview than knowing its syntax.',
  chapters: [
    'phase-3-databases/03-mongodb',
  ],
  deliverable: 'A second copy of one Project 1 domain modelled in MongoDB, with the aggregation pipeline equivalents of three of your SQL reports, and a written argument for which store you would actually choose.',
  milestone: 'You can explain embedding versus referencing with a rule for choosing, and you can write an aggregation pipeline with $match, $group and $lookup from memory.',
  d: [
    { focus: 'Documents, collections, and the model', tasks: [
      ['ENG','dawn','Phase 3 Chapter 3 (MongoDB) — documents, collections, BSON, and _id. Install it, insert real data, and query it from the shell. Then write down the three things that feel wrong coming from SQL — those instincts are the lesson.'],
      ['JOB','lunch','Two applications, tailored, logged.'],
    ]},
    { focus: 'Embedding versus referencing', tasks: [
      ['ENG','dawn','Phase 3 Chapter 3 — the central modelling decision. Embed when the data is read together and bounded; reference when it is large, shared, or grows without limit. Model one Project 1 domain both ways and write which you would ship and why.'],
      ['COMM','lunch','Write a two-minute answer to "when would you choose MongoDB over PostgreSQL?" An honest "usually I would not, but here is when I would" is a strong answer.'],
    ]},
    { focus: 'The aggregation pipeline', tasks: [
      ['ENG','dawn','Phase 3 Chapter 3 — aggregation. $match, $group, $project, $sort, $unwind, $lookup. Rewrite three of your SQL reports as pipelines. Notice where $lookup is painful and understand why that is the point.'],
      ['JOB','lunch','Two applications, tailored, logged.'],
    ]},
    { focus: 'Indexes and the explain plan, again', tasks: [
      ['ENG','dawn','Phase 3 Chapter 3 — indexes in MongoDB, compound index order, and explain(). Everything you learned in week 18 transfers. Prove it: index one slow pipeline and measure the difference.'],
      ['COMM','lunch','Fifth application. Then rehearse: "how do transactions work in MongoDB?" — the honest answer includes what changed and what it costs.'],
    ]},
    { focus: 'Consistency, durability, and write concern', tasks: [
      ['ENG','dawn','Phase 3 Chapter 3 — replica sets, write concern, read preference, and what "eventually consistent" means for your code. This is where NoSQL interview questions actually go, and where most candidates stop.'],
      ['JOB','lunch','Update the CV: MongoDB goes on with a sentence about the modelling work, not as a logo.'],
    ]},
    { focus: 'Argue for one of them', tasks: [
      ['ENG','dawn','Deep build, two hours: finish the MongoDB version of your domain, get the three pipelines working and indexed, then write the honest comparison in PROJECT1.md — which store, for this project, and why.'],
      ['ENG','mid','Drill: five MongoDB questions, timed, plus one spoken comparison of the two stores.'],
      ['REV','late','Weekly review. Read next week ahead — the last database week.'],
    ]},
  ],
},

{
  n: 22, block: 'III — Databases',
  dsa: { topic: 'Trees — BFS by level', problems: 3 },
  title: 'Replication, Partitioning, Sharding — and the Block Close',
  theme: 'The scaling vocabulary. You will not shard anything this year, and you will be asked about it, because the question tests whether you understand the trade-offs rather than whether you have operated one.',
  chapters: [
    'phase-3-databases/09-replication',
    'phase-3-databases/10-partitioning',
    'phase-3-databases/11-sharding',
    'phase-7-system-design/07-database-scaling',
  ],
  deliverable: 'A working local replica of your Postgres database with reads served from it, one partitioned table with a demonstrated pruning benefit, and a written scaling path for Project 1 from one server to many.',
  milestone: 'BLOCK III CLOSES — ANCHOR: Project 1 has a complete, indexed, transactional data layer across SQL and NoSQL by Saturday 27 February. You can explain replication lag and why it breaks read-after-write.',
  d: [
    { focus: 'Replication, and the lag problem', tasks: [
      ['ENG','dawn','Phase 3 Chapter 9 (Replication) — primary and replica, synchronous versus asynchronous, and failover. Set up a local replica. Then write to the primary, read immediately from the replica, and see stale data. That is read-after-write, and it is a real interview question.'],
      ['JOB','lunch','Two applications, tailored, logged.'],
    ]},
    { focus: 'Read replicas in application code', tasks: [
      ['ENG','dawn','Route Project 1\'s reads to the replica and writes to the primary. Then find the endpoint that breaks because of lag and fix it honestly — read your own writes from the primary. Most people discover this in production.'],
      ['COMM','lunch','Write a two-minute answer to "how would you scale reads?" that mentions lag before someone else does.'],
    ]},
    { focus: 'Partitioning', tasks: [
      ['ENG','dawn','Phase 3 Chapter 10 (Partitioning) — range and list partitioning, and partition pruning. Partition one large Project 1 table by date, then prove with EXPLAIN that a date-filtered query touches only one partition.'],
      ['JOB','lunch','Two applications, tailored, logged.'],
    ]},
    { focus: 'Sharding, and what it costs', tasks: [
      ['ENG','dawn','Phase 3 Chapter 11 (Sharding) — shard keys, cross-shard queries, rebalancing, and why sharding is the answer of last resort. Write down what you would lose in Project 1 if you sharded it today. That list is the answer interviewers want.'],
      ['COMM','lunch','Fifth application. Then rehearse the whole scaling ladder aloud: index, cache, replica, partition, shard — in that order, with the reason for each step.'],
    ]},
    { focus: 'The scaling path, written down', tasks: [
      ['ENG','dawn','Phase 7 Chapter 7 (Database Scaling) — pull it together. Write the scaling path for Project 1 in PROJECT1.md: what you would do first, second and third as traffic grows, with the signal that would trigger each step.'],
      ['JOB','lunch','Rewrite the CV database section from scratch. You have nine weeks of real material and it should read nothing like the October version.'],
    ]},
    { focus: 'BLOCK III REVIEW', tasks: [
      ['ENG','dawn','Deep build, two hours: finish everything outstanding in the data layer. Then write the data-layer chapter of the README — schema, indexes, transactions, the NoSQL comparison, the scaling path. This document is why you get past screening calls.'],
      ['ENG','mid','Block drill: ten database questions, spoken and written, timed. Compare your comfort against week 14.'],
      ['REV','late','BLOCK III REVIEW. Honestly: could I hold a forty-minute database conversation with a tier-2 engineer today? Fifty-plus applications sent — what is the technical-round rate? Then read Block IV ahead — NestJS, and the framework your next job title names.'],
    ]},
  ],
},

// ══════════════════════════════════════════════════════════════════
// BLOCK IV — NESTJS (W23–W29)
// Seven weeks on the framework your next job title names. You arrive
// here having written your own DI container (W6), your own decorators
// (W7), and a complete Express service with a real data layer — so Nest
// is not magic, it is a well-made version of things you have built by
// hand. Project 2 is Project 1 rebuilt properly.
// Applications rise to eight a week.
// ══════════════════════════════════════════════════════════════════
{
  n: 23, block: 'IV — NestJS',
  dsa: { topic: 'Binary search trees', problems: 3 },
  title: 'NestJS Fundamentals — Modules, Controllers, Providers, DI',
  theme: 'The architecture, and why it exists. Nest is Angular\'s structure applied to the server: modules that declare what they own, providers resolved by a container, and controllers that do nothing but translate HTTP. You built a crude version of this in week 6; now see it done properly.',
  chapters: [
    'phase-2-backend-engineering/03-nestjs',
  ],
  deliverable: 'PROJECT 2 started — the Nest skeleton of your Project 1 domain, with two feature modules, controllers, services and repositories, wired by DI, and a written comparison against your own week-6 container.',
  milestone: 'You can explain what the Nest DI container does at startup, what a provider token is, and why a circular dependency between two modules happens — without calling any of it magic.',
  d: [
    { focus: 'The module graph', tasks: [
      ['ENG','dawn','Phase 2 Chapter 3 (NestJS) — modules. imports, providers, controllers, exports, and what each one means for visibility. Create the Project 2 skeleton by hand with the CLI, then read every generated file and explain it to yourself line by line.'],
      ['JOB','lunch','Two applications, tailored, logged. The quota rises to eight a week — you can now hold a database conversation.'],
    ]},
    { focus: 'Providers and the injector', tasks: [
      ['ENG','dawn','Phase 2 Chapter 3 — providers and dependency injection. Class providers, useValue, useFactory, useClass, and injection tokens. Then open your week-6 container beside it and write down the four things Nest does that yours did not.'],
      ['COMM','lunch','Explain dependency injection aloud in ninety seconds, using your own container as the example and Nest as the grown-up version.'],
    ]},
    { focus: 'Controllers as a thin translation layer', tasks: [
      ['ENG','dawn','Phase 2 Chapter 3 — controllers, routing decorators, and parameter decorators. Build two controllers for Project 2. Keep them thin: parse, delegate, return. If a controller has business logic in it, that logic is in the wrong file.'],
      ['JOB','lunch','Three applications, tailored, logged.'],
    ]},
    { focus: 'Services, repositories, and layering', tasks: [
      ['ENG','dawn','Phase 2 Chapter 3 — services and the layering Nest assumes. Controller, service, repository. Move your Project 1 business logic across into services and notice what refuses to move cleanly — that is where Project 1 was badly layered.'],
      ['COMM','lunch','Write a two-minute answer to "how do you structure a Nest application?" using your own module graph.'],
    ]},
    { focus: 'Scopes, lifecycle, and configuration', tasks: [
      ['ENG','dawn','Phase 2 Chapter 3 — provider scopes (singleton, request, transient) and why the default is singleton. Then lifecycle hooks, and ConfigModule for environment configuration with schema validation at boot.'],
      ['JOB','lunch','Three applications, tailored, logged.'],
    ]},
    { focus: 'Build the skeleton', tasks: [
      ['ENG','dawn','Deep build, two hours: Project 2 skeleton — two feature modules, controllers, services, repository interfaces, configuration validated at startup, running and answering. AI may review; it may not write.'],
      ['ENG','mid','Drill: three LeetCode problems, timed, no AI. Then explain the Nest bootstrap sequence aloud from memory.'],
      ['REV','late','Weekly review. Read next week ahead.'],
    ]},
  ],
},

{
  n: 24, block: 'IV — NestJS',
  dsa: { topic: 'Trees — path & depth problems', problems: 4 },
  title: 'The Request Pipeline — Pipes, Guards, Interceptors, Filters',
  theme: 'Nest\'s request pipeline is Express middleware with names and ordering guarantees. Knowing the exact order — middleware, guards, interceptors, pipes, handler, interceptors again, filters — is the single most asked Nest interview question.',
  chapters: [
    'phase-2-backend-engineering/03-nestjs',
    'phase-2-backend-engineering/10-validation',
    'phase-2-backend-engineering/11-error-handling',
  ],
  deliverable: 'Project 2 with a validation pipe on every DTO, a guard protecting one route, a logging interceptor adding timing, and a global exception filter producing your standard error shape.',
  milestone: 'You can draw the Nest request pipeline in order from memory and say what each stage is for and what it must not do.',
  d: [
    { focus: 'The order, drawn from memory', tasks: [
      ['ENG','dawn','Phase 2 Chapter 3 — the request lifecycle. Middleware, guards, interceptors (before), pipes, handler, interceptors (after), exception filters. Draw it on paper. Then add a console log at every stage and prove the order empirically.'],
      ['JOB','lunch','Two applications, tailored, logged.'],
    ]},
    { focus: 'Pipes and DTO validation', tasks: [
      ['ENG','dawn','Phase 2 Chapter 3 and Chapter 10 — pipes. ValidationPipe, class-validator, class-transformer, and whitelist/forbidNonWhitelisted so unknown fields are rejected rather than ignored. Write DTOs for every Project 2 endpoint and turn validation on globally.'],
      ['COMM','lunch','Write five sentences on why validation belongs in a pipe and not in the service.'],
    ]},
    { focus: 'Guards and authorisation', tasks: [
      ['ENG','dawn','Phase 2 Chapter 3 — guards and the execution context. Build a role guard using a custom decorator and Reflector metadata — the reflect-metadata work from week 7 is exactly this. Protect one route with it.'],
      ['JOB','lunch','Three applications, tailored, logged.'],
    ]},
    { focus: 'Interceptors', tasks: [
      ['ENG','dawn','Phase 2 Chapter 3 — interceptors and the RxJS stream they operate on. Build a logging interceptor that times every request, and a transform interceptor that wraps every response in your standard envelope. You do not need to know RxJS deeply; you do need to know what the observable is.'],
      ['COMM','lunch','Rehearse: "what is the difference between a guard, an interceptor and a middleware?" Ninety seconds, with an example of each.'],
    ]},
    { focus: 'Exception filters', tasks: [
      ['ENG','dawn','Phase 2 Chapter 3 and Chapter 11 — exception filters. Build a global filter that turns your domain error classes into HTTP responses with the exact error shape you defined in week 11. One taxonomy, two frameworks.'],
      ['JOB','lunch','Three applications, tailored, logged.'],
    ]},
    { focus: 'Wire the pipeline up', tasks: [
      ['ENG','dawn','Deep build, two hours: every DTO validated, one guarded route, timing on every request, one error shape everywhere. Then send ten malformed requests and confirm each returns something correct and non-leaking.'],
      ['ENG','mid','Drill: draw the pipeline from memory, then three LeetCode problems, timed.'],
      ['REV','late','Weekly review. Read next week ahead.'],
    ]},
  ],
},

{
  n: 25, block: 'IV — NestJS',
  dsa: { topic: 'Heaps — top K', problems: 4 },
  title: 'The Nest Data Layer — TypeORM, Prisma, Transactions',
  theme: 'Connecting Block III to Block IV. The repository pattern Nest assumes, migrations that run in CI, and transactions that span services — which is the part every tutorial skips and every real system needs.',
  chapters: [
    'phase-2-backend-engineering/03-nestjs',
    'phase-3-databases/14-typeorm',
    'phase-3-databases/06-transactions',
  ],
  deliverable: 'Project 2 on a real database with entities, migrations, a repository layer behind interfaces, and one multi-service operation wrapped in a single transaction.',
  milestone: 'You can explain how a transaction spans two services in Nest without passing a connection object through every method signature.',
  d: [
    { focus: 'Entities and the repository pattern', tasks: [
      ['ENG','dawn','Phase 3 Chapter 14 (TypeORM) with Nest — entities, decorators, relations, and the injected repository. Model the Project 2 schema. Everything you designed in week 16 carries over; only the expression changes.'],
      ['JOB','lunch','Two applications, tailored, logged.'],
    ]},
    { focus: 'Migrations, and never synchronize', tasks: [
      ['ENG','dawn','Generate migrations from your entities, review the SQL they produce line by line, and run them. Then turn synchronize off permanently and write in the README why it must never be true in production. This is a real interview question.'],
      ['COMM','lunch','Write a ninety-second answer to "how do you manage schema changes across environments?"'],
    ]},
    { focus: 'Repositories behind interfaces', tasks: [
      ['ENG','dawn','Put your repositories behind interfaces and inject them by token, so a service depends on an abstraction rather than TypeORM. This is dependency inversion from week 6, and it is what makes week 27\'s tests easy rather than painful.'],
      ['JOB','lunch','Three applications, tailored, logged.'],
    ]},
    { focus: 'Transactions across services', tasks: [
      ['ENG','dawn','Phase 3 Chapter 6 with Nest — transactions. Wrap one multi-step operation spanning two services in a single transaction. Do it the ugly way first (pass the manager through), then with AsyncLocalStorage so it flows invisibly. Compare the two and keep the better one.'],
      ['COMM','lunch','Rehearse: "how do you keep two writes consistent when they live in different services?"'],
    ]},
    { focus: 'Query performance in the ORM', tasks: [
      ['ENG','dawn','Turn on query logging and read every statement one endpoint produces. Find the N+1 that TypeORM introduced, fix it with a relation load or a query builder, and measure. Week 18 and week 20 both pay off here.'],
      ['JOB','lunch','Three applications, tailored, logged.'],
    ]},
    { focus: 'Finish the data layer', tasks: [
      ['ENG','dawn','Deep build, two hours: Project 2 fully on the database, migrations clean from empty, seeded, indexed, transactional. Then drop the database, run the migrations from scratch, and seed it — if that does not work, it is not finished.'],
      ['ENG','mid','Drill: five questions on ORMs, migrations and transactions, spoken, timed.'],
      ['REV','late','Weekly review. Read next week ahead.'],
    ]},
  ],
},

{
  n: 26, block: 'IV — NestJS',
  dsa: { topic: 'Heaps — streaming median', problems: 3 },
  title: 'Authentication and Authorisation in Nest',
  theme: 'Auth is the most commonly implemented and most commonly implemented-badly part of a backend, and a favourite interview subject because the wrong answers are so recognisable. Build it properly once, in Nest, and understand every trade-off you chose.',
  chapters: [
    'phase-2-backend-engineering/06-authentication',
    'phase-2-backend-engineering/07-jwt',
    'phase-2-backend-engineering/09-session-management',
    'phase-2-backend-engineering/08-oauth',
  ],
  deliverable: 'Project 2 with registration, login, refresh, logout, role-based authorisation on at least two routes, and a written justification of the session-versus-token decision.',
  milestone: 'You can explain why a JWT in localStorage is a risk, what refresh-token rotation solves, and how you log a user out of a stateless system. Nobody at this level should be guessing here.',
  d: [
    { focus: 'Passwords, properly', tasks: [
      ['ENG','dawn','Phase 2 Chapter 6 (Authentication) — hashing versus encryption, bcrypt and argon2, salts, and what a work factor is for. Implement registration and login in Nest with hashed passwords and a timing-safe comparison.'],
      ['JOB','lunch','Two applications, tailored, logged.'],
    ]},
    { focus: 'Passport strategies and guards', tasks: [
      ['ENG','dawn','Phase 2 Chapter 3 with Passport — the strategy pattern, a local strategy for login, a JWT strategy for requests, and the guards that invoke them. Read the strategy source once: it is a class with a validate method, and that is all.'],
      ['COMM','lunch','Write a two-minute answer to "walk me through authentication in your project", including one trade-off you chose and why.'],
    ]},
    { focus: 'JWT, refresh, and revocation', tasks: [
      ['ENG','dawn','Phase 2 Chapter 7 (JWT) — structure, signing, expiry, and the fact that a JWT is signed, not encrypted. Decode one of your own tokens by hand to prove the payload is readable. Then implement refresh with rotation, and answer in writing: how do you actually revoke?'],
      ['JOB','lunch','Three applications, tailored, logged.'],
    ]},
    { focus: 'Sessions, and when they are the better answer', tasks: [
      ['ENG','dawn','Phase 2 Chapter 9 (Session Management) — server-side sessions in Redis, cookie flags (HttpOnly, Secure, SameSite), and session fixation. Implement session auth on a branch, then write down which approach Project 2 ships with and why.'],
      ['COMM','lunch','Rehearse: "sessions or tokens?" — a candidate with a reasoned answer beats one with a preference.'],
    ]},
    { focus: 'Roles, permissions and OAuth', tasks: [
      ['ENG','dawn','Phase 2 Chapter 8 (OAuth) — the authorisation code flow and PKCE. Add one social login. Then build role-based authorisation with a custom decorator and your Reflector guard, and protect two routes with different roles.'],
      ['JOB','lunch','Three applications, tailored, logged.'],
    ]},
    { focus: 'Finish and attack it', tasks: [
      ['ENG','dawn','Deep build, two hours: finish the auth flow end to end, then attack it yourself — expired token, tampered signature, missing role, reused refresh token, login brute force. Fix everything that gets through.'],
      ['ENG','mid','Drill: five auth questions, spoken, timed. Include "why not localStorage" and "how do you revoke a token".'],
      ['REV','late','Weekly review. Read next week ahead — testing, and the chapter the old book did not have.'],
    ]},
  ],
},

{
  n: 27, block: 'IV — NestJS',
  dsa: { topic: 'Recursion — the base-case habit', problems: 3 },
  title: 'Testing — Unit, Integration, End to End',
  theme: 'You have never written a test. At tier 2 that is disqualifying, and it is the easiest gap in this book to close: one week of real tests on a project you already understand changes how your repository reads to a reviewer.',
  chapters: [
    'phase-9-software-engineering/05-testing',
    'phase-9-software-engineering/02-code-reviews-documentation',
    'phase-10-english-communication/07-talking-about-code-out-loud',
  ],
  deliverable: 'A real test suite on Project 2 — unit tests on business logic, integration tests on the repository layer against a throwaway database, e2e tests on every endpoint — running green from a clean checkout.',
  milestone: 'The suite runs green from empty, covers every endpoint at least once including failure paths, and you can explain what you deliberately chose not to test.',
  d: [
    { focus: 'The first unit tests', tasks: [
      ['ENG','dawn','Phase 9 Chapter 5 (Testing) — the anatomy of a test, arrange/act/assert, and one behaviour per test. Write ten unit tests on the pure business logic in Project 2 — the functions with no database and no HTTP.'],
      ['JOB','lunch','Two applications, tailored, logged.'],
    ]},
    { focus: 'Test doubles, and the Nest testing module', tasks: [
      ['ENG','dawn','Phase 9 Chapter 5 — stubs, mocks, spies and fakes, and when each is honest. Then Nest\'s Test.createTestingModule: build a module with your repository interface overridden by a fake. Week 25\'s interfaces are why this is three lines.'],
      ['COMM','lunch','Write a ninety-second answer to "what is your approach to testing?" Having a policy, and saying where you stop, beats claiming full coverage.'],
    ]},
    { focus: 'Integration tests against a real database', tasks: [
      ['ENG','dawn','Phase 9 Chapter 5 — integration testing. A throwaway Postgres in Docker, migrations run before the suite, clean state between tests. Test one repository properly, including the constraint violations you added in week 16.'],
      ['JOB','lunch','Three applications, tailored, logged.'],
    ]},
    { focus: 'End-to-end tests', tasks: [
      ['ENG','dawn','Phase 9 Chapter 5 — e2e with supertest against the real Nest application. Test one full journey: register, log in, create, read it back, delete it, confirm it is gone. Then test the unauthorised path for each.'],
      ['COMM','lunch','Rehearse: "how would you test this endpoint?" — pick one of your own and answer in three layers.'],
    ]},
    { focus: 'A written testing policy', tasks: [
      ['ENG','dawn','Write TESTING.md: what gets a unit test, what gets an integration test, what gets e2e, what is not worth testing, and why. Then delete every test you wrote this week that only tests the framework. A policy you can defend is worth more than coverage.'],
      ['JOB','lunch','Three applications, tailored, logged.'],
    ]},
    { focus: 'Cover every endpoint', tasks: [
      ['ENG','dawn','Deep build, two hours: every endpoint covered including one failure path each. Then run the whole suite from a clean checkout and fix whatever only worked on your machine.'],
      ['ENG','mid','Drill: three LeetCode problems, timed, then write tests for one afterwards — some companies interview exactly this way.'],
      ['REV','late','Weekly review. Read next week ahead.'],
    ]},
  ],
},

{
  n: 28, block: 'IV — NestJS',
  dsa: { topic: 'Backtracking — subsets', problems: 4 },
  title: 'GraphQL and WebSockets in Nest',
  theme: 'Two protocols beyond REST that appear constantly in job descriptions at this tier. Neither is hard once you have REST properly; both are asked about, and having shipped each once is the difference between an opinion and an answer.',
  chapters: [
    'phase-2-backend-engineering/05-graphql',
    'phase-2-backend-engineering/17-websockets',
  ],
  deliverable: 'A GraphQL layer over part of the Project 2 domain with a solved N+1 via DataLoader, and a WebSocket gateway pushing live updates to connected clients.',
  milestone: 'You can explain the N+1 problem in GraphQL specifically and how DataLoader batches it, and you can say when WebSockets are the wrong choice.',
  d: [
    { focus: 'Schema, resolvers, code-first', tasks: [
      ['ENG','dawn','Phase 2 Chapter 5 (GraphQL) — the type system, queries, mutations, resolvers. Build a code-first GraphQL layer in Nest over one Project 2 module. The decorators will feel familiar now.'],
      ['JOB','lunch','Two applications, tailored, logged.'],
    ]},
    { focus: 'The N+1 problem, in GraphQL', tasks: [
      ['ENG','dawn','Phase 2 Chapter 5 — nested resolvers and why they produce N+1 by construction. Reproduce it, watch the query log, then fix it with DataLoader and watch the log again. Two log outputs, before and after, are your interview answer.'],
      ['COMM','lunch','Write a two-minute answer to "REST or GraphQL?" that names a concrete situation for each.'],
    ]},
    { focus: 'Errors, auth and limits in GraphQL', tasks: [
      ['ENG','dawn','Phase 2 Chapter 5 — error handling, guards on resolvers, and query depth and complexity limits. An unbounded GraphQL endpoint is a denial-of-service waiting; add the limits and understand what they compute.'],
      ['JOB','lunch','Three applications, tailored, logged.'],
    ]},
    { focus: 'WebSockets and gateways', tasks: [
      ['ENG','dawn','Phase 2 Chapter 17 (WebSockets) — the upgrade handshake, and why it is not HTTP after that. Build a Nest gateway that pushes an update when a record changes. Authenticate the connection — most tutorials do not.'],
      ['COMM','lunch','Rehearse: "when would you use WebSockets over polling, and when would you not?"'],
    ]},
    { focus: 'Scaling real-time, honestly', tasks: [
      ['ENG','dawn','Phase 2 Chapter 17 — what breaks with two server instances: a client connected to instance A never sees an event emitted on instance B. Understand the Redis adapter that fixes it. You will wire it up next week when Redis arrives.'],
      ['JOB','lunch','Three applications, tailored, logged.'],
    ]},
    { focus: 'Ship both', tasks: [
      ['ENG','dawn','Deep build, two hours: GraphQL layer working with DataLoader and limits, WebSocket gateway authenticated and pushing live updates. Then document both in the README with the N+1 before-and-after.'],
      ['ENG','mid','Drill: five questions on GraphQL and real-time, spoken, timed.'],
      ['REV','late','Weekly review. Read next week ahead.'],
    ]},
  ],
},

{
  n: 29, block: 'IV — NestJS',
  dsa: { topic: 'Backtracking — permutations', problems: 3 },
  title: 'The Work That Happens Later — Uploads, Email, Cron, Microservices',
  theme: 'The last Nest week. Everything a real service does besides answer requests: accept files, send email, run scheduled work, and talk to other services. Plus Nest\'s microservice transports, so you can speak about distributed systems from having touched one.',
  chapters: [
    'phase-2-backend-engineering/13-file-upload',
    'phase-2-backend-engineering/14-email-services',
    'phase-2-backend-engineering/15-cron-jobs',
    'phase-7-system-design/09-microservices',
    'phase-1-programming-foundations/08-design-patterns',
  ],
  deliverable: 'Project 2 with pre-signed direct file upload, transactional email, two scheduled jobs that are safe to run on multiple instances, and one module extracted into a separate microservice.',
  milestone: 'BLOCK IV CLOSES. You can explain why a cron job on three instances runs three times and the three ways to stop it — which is a question that catches most candidates.',
  d: [
    { focus: 'File upload, without proxying the bytes', tasks: [
      ['ENG','dawn','Phase 2 Chapter 13 (File Upload) — multipart, size limits, type validation that checks content rather than the filename, and pre-signed URLs so the file never passes through your API. Implement the pre-signed path.'],
      ['JOB','lunch','Two applications, tailored, logged.'],
    ]},
    { focus: 'Email that is not a side effect', tasks: [
      ['ENG','dawn','Phase 2 Chapter 14 (Email Services) — transactional email, templates, and why sending inside a request handler is wrong. Send it from a queue instead — and if the queue is not there yet, write the interface and fake it until next week.'],
      ['COMM','lunch','Write five sentences on what should happen when the email provider is down and a user has just registered.'],
    ]},
    { focus: 'Scheduled work', tasks: [
      ['ENG','dawn','Phase 2 Chapter 15 (Cron Jobs) — the scheduler, cron expressions, and the multi-instance problem: three instances run the job three times. Learn the three fixes — a leader lock, a distributed lock, or a dedicated worker — and implement one.'],
      ['JOB','lunch','Three applications, tailored, logged.'],
    ]},
    { focus: 'Idempotency, because jobs retry', tasks: [
      ['ENG','dawn','Make both scheduled jobs idempotent — running twice must not double anything. Then deliberately run one twice and prove it. This is the discipline that makes queues safe next week.'],
      ['COMM','lunch','Rehearse: "your nightly job ran twice and sent duplicate emails. What went wrong and how do you prevent it?"'],
    ]},
    { focus: 'Microservices, honestly', tasks: [
      ['ENG','dawn','Phase 7 Chapter 9 (Microservices) and Nest\'s transports. Extract one module into a separate service talking over TCP or Redis. Then write down what you lost: transactions across the boundary, one deploy, easy debugging. That honest list is the interview answer, not enthusiasm. Read Phase 1 Chapter 8 (Design Patterns) alongside it and name the patterns already in your own code.'],
      ['JOB','lunch','Three applications, tailored, logged.'],
    ]},
    { focus: 'BLOCK IV REVIEW', tasks: [
      ['ENG','dawn','Deep build, two hours: finish uploads, email, scheduling and the extracted service. Then write the architecture section of the Project 2 README with a diagram.'],
      ['ENG','mid','Block drill: ten Nest questions, spoken, timed — pipeline order, DI, scopes, transactions, testing, cron on multiple instances.'],
      ['REV','late','BLOCK IV REVIEW. Honestly: if someone said "you are a Nest developer", could I defend it for forty minutes? Read Block V ahead.'],
    ]},
  ],
},

// ══════════════════════════════════════════════════════════════════
// BLOCK V — CACHING, QUEUES AND SCALE (W30–W33)
// Four weeks on the layer between the API and the database, and the
// layer between services. Redis, caching strategies, background jobs,
// message brokers and rate limiting — the vocabulary of every backend
// system design conversation you will have. Project 2 ships at the end.
// ══════════════════════════════════════════════════════════════════
{
  n: 30, block: 'V — Caching and Queues',
  dsa: { topic: 'Graphs — build the adjacency list', problems: 3 },
  title: 'Redis and Caching Strategies',
  theme: 'Caching is easy to add and hard to invalidate, and "cache invalidation" jokes are told by people who have never had to do it. This week is Redis as a real data structure server, and caching as a decision with a written invalidation strategy.',
  chapters: [
    'phase-2-backend-engineering/18-redis',
    'phase-2-backend-engineering/19-caching',
    'phase-7-system-design/03-caching',
  ],
  deliverable: 'Project 2 with a measured cache on its most expensive read path, a written invalidation strategy, and Redis-backed sessions and WebSocket fan-out.',
  milestone: 'You can name four caching strategies and say which one you used and why, and you can describe a cache stampede and how you would prevent it.',
  d: [
    { focus: 'Redis as a data structure server', tasks: [
      ['ENG','dawn','Phase 2 Chapter 18 (Redis) — strings, hashes, lists, sets, sorted sets, TTL. Not "a cache" — a data structure server. Build a leaderboard with a sorted set and a rate counter with a hash, both from the CLI first.'],
      ['JOB','lunch','Two applications, tailored, logged.'],
    ]},
    { focus: 'Measure before caching', tasks: [
      ['ENG','dawn','Phase 2 Chapter 19 (Caching) — measure first. Find the most expensive read path in Project 2 with real timings. Write the number down before you cache anything, because the number is what makes this an engineering decision.'],
      ['COMM','lunch','Write a ninety-second answer to "how do you decide what to cache?" that starts with measuring.'],
    ]},
    { focus: 'The four strategies', tasks: [
      ['ENG','dawn','Phase 7 Chapter 3 (Caching) — cache-aside, read-through, write-through, write-behind. Implement cache-aside on your expensive path, measure again, and write both numbers in the README.'],
      ['JOB','lunch','Three applications, tailored, logged.'],
    ]},
    { focus: 'Invalidation, the actual hard part', tasks: [
      ['ENG','dawn','Phase 2 Chapter 19 — invalidation. TTL, explicit invalidation on write, and key versioning. Write your strategy down in the README, then deliberately update a record and prove the cache does not serve stale data.'],
      ['COMM','lunch','Rehearse: "how do you keep a cache consistent with the database?" An honest answer includes the window where it is not.'],
    ]},
    { focus: 'Stampedes and the failure modes', tasks: [
      ['ENG','dawn','Phase 7 Chapter 3 — stampede, penetration, avalanche. Simulate a stampede: expire a hot key, fire fifty concurrent requests, and watch fifty identical database queries. Then fix it with a lock or a stale-while-revalidate, and measure.'],
      ['JOB','lunch','Three applications, tailored, logged.'],
    ]},
    { focus: 'Redis everywhere it belongs', tasks: [
      ['ENG','dawn','Deep build, two hours: move sessions into Redis, wire the WebSocket Redis adapter from week 28, and confirm two local instances now deliver each other\'s events. Then check what happens to your app when Redis is down — it should degrade, not die.'],
      ['ENG','mid','Drill: five caching and Redis questions, spoken, timed.'],
      ['REV','late','Weekly review. Read next week ahead.'],
    ]},
  ],
},

{
  n: 31, block: 'V — Caching and Queues',
  dsa: { topic: 'Graphs — BFS shortest path', problems: 4 },
  title: 'Queues, Workers and Message Brokers',
  theme: 'The moment a request does work the user should not wait for, you need a queue — and the moment you have a queue you need to think about retries, failures and ordering. This is the backbone of every serious backend and it is where system design interviews go.',
  chapters: [
    'phase-2-backend-engineering/16-queues',
    'phase-7-system-design/04-message-brokers',
    'phase-7-system-design/05-event-driven-systems',
  ],
  deliverable: 'Project 2 with a real job queue and a separate worker process, retries with backoff, a dead-letter queue, and one event-driven flow where a write publishes an event that two handlers consume.',
  milestone: 'You can explain at-least-once versus at-most-once delivery, why idempotent consumers are mandatory, and what a dead-letter queue is for.',
  d: [
    { focus: 'A queue and a worker', tasks: [
      ['ENG','dawn','Phase 2 Chapter 16 (Queues) — producers, consumers, and why the worker is a separate process rather than a function. Move email sending onto a BullMQ queue with a real worker. Kill the worker mid-job and see what happens.'],
      ['JOB','lunch','Two applications, tailored, logged.'],
    ]},
    { focus: 'Retries, backoff and dead letters', tasks: [
      ['ENG','dawn','Phase 2 Chapter 16 — retry policies, exponential backoff, attempt limits, and the dead-letter queue. Make a job fail deliberately and watch it retry, back off and land in the DLQ. Then build the endpoint that lets you inspect and replay it.'],
      ['COMM','lunch','Write a ninety-second answer to "what happens to a job that keeps failing?"'],
    ]},
    { focus: 'Idempotent consumers', tasks: [
      ['ENG','dawn','Phase 2 Chapter 16 — at-least-once delivery means your consumer will run twice. Make every job idempotent with an idempotency key, then deliver one twice on purpose and prove nothing doubled.'],
      ['JOB','lunch','Three applications, tailored, logged.'],
    ]},
    { focus: 'Brokers — the vocabulary', tasks: [
      ['ENG','dawn','Phase 7 Chapter 4 (Message Brokers) — queues versus topics, RabbitMQ versus Kafka, partitions, consumer groups, ordering guarantees. You will not run Kafka this year; you must be able to say when you would and what it costs.'],
      ['COMM','lunch','Rehearse: "RabbitMQ or Kafka?" — answer with the shape of the problem, not a preference.'],
    ]},
    { focus: 'Event-driven, in your own service', tasks: [
      ['ENG','dawn','Phase 7 Chapter 5 (Event-Driven Systems) — events versus commands, and the outbox pattern for publishing reliably from a transaction. Make one Project 2 write publish an event that two independent handlers consume.'],
      ['JOB','lunch','Three applications, tailored, logged.'],
    ]},
    { focus: 'Run it under load', tasks: [
      ['ENG','dawn','Deep build, two hours: queue, worker, retries, DLQ and the event flow all working. Then push a thousand jobs through and watch the worker keep up or not. Write the throughput number down.'],
      ['ENG','mid','Drill: five queue and messaging questions, spoken, timed.'],
      ['REV','late','Weekly review. Read next week ahead.'],
    ]},
  ],
},

{
  n: 32, block: 'V — Caching and Queues',
  dsa: { topic: 'Graphs — DFS & connected components', problems: 4 },
  title: 'Rate Limiting, API Gateways and Resilience',
  theme: 'Protecting a service from its callers, and from its own dependencies. Rate limiting, circuit breakers, timeouts and retries — the difference between a service that degrades and one that falls over and takes its neighbours with it.',
  chapters: [
    'phase-2-backend-engineering/20-rate-limiting',
    'phase-7-system-design/08-api-gateway',
    'phase-7-system-design/06-distributed-systems',
  ],
  deliverable: 'Project 2 with a Redis-backed distributed rate limiter, timeouts and a circuit breaker on every outbound call, and a written note on what the service does when each dependency is unavailable.',
  milestone: 'You can explain the difference between a fixed window, a sliding window and a token bucket, and why an in-memory rate limiter is wrong the moment you run two instances.',
  d: [
    { focus: 'The algorithms', tasks: [
      ['ENG','dawn','Phase 2 Chapter 20 (Rate Limiting) — fixed window, sliding window log, sliding window counter, token bucket, leaky bucket. Implement two by hand against Redis and show the boundary burst problem that fixed windows have.'],
      ['JOB','lunch','Two applications, tailored, logged.'],
    ]},
    { focus: 'Distributed, and honest about it', tasks: [
      ['ENG','dawn','Make the limiter correct across instances — the check and increment must be atomic, which means a Lua script or an atomic Redis operation, not a get followed by a set. Then run two instances and prove the limit holds across both.'],
      ['COMM','lunch','Write five sentences on why an in-memory rate limiter is wrong behind a load balancer.'],
    ]},
    { focus: 'Timeouts, retries and budgets', tasks: [
      ['ENG','dawn','Phase 7 Chapter 6 (Distributed Systems) — every network call needs a timeout, and every retry needs a budget and jitter. Add both to every outbound call in Project 2. Then write down what your default timeout is and why that number.'],
      ['JOB','lunch','Three applications, tailored, logged.'],
    ]},
    { focus: 'Circuit breakers and graceful degradation', tasks: [
      ['ENG','dawn','Phase 7 Chapter 6 — the circuit breaker, its three states, and graceful degradation. Add one around a dependency, then take that dependency down and confirm the service degrades with a useful response instead of hanging.'],
      ['COMM','lunch','Rehearse: "a downstream service is slow. What happens to yours?" The answer describes a mechanism, not a hope.'],
    ]},
    { focus: 'The gateway layer', tasks: [
      ['ENG','dawn','Phase 7 Chapter 8 (API Gateway) — what belongs at the edge: routing, auth, rate limiting, TLS termination. Draw where each concern lives in your architecture, and notice which you have implemented twice.'],
      ['JOB','lunch','Three applications, tailored, logged.'],
    ]},
    { focus: 'Break your own service', tasks: [
      ['ENG','dawn','Deep build, two hours: take down Redis, the database and the email provider one at a time and observe. Fix every case where the service hangs or returns 500 rather than degrading. Write the failure matrix into the README.'],
      ['ENG','mid','Drill: five resilience questions, spoken, timed.'],
      ['REV','late','Weekly review. Next week Project 2 ships. Write the checklist tonight. Read next week ahead.'],
    ]},
  ],
},

{
  n: 33, block: 'V — Caching and Queues',
  dsa: { topic: 'Graphs — topological sort', problems: 3 },
  title: 'Ship Project 2',
  theme: 'A finished project is one a stranger can use, understand and evaluate without you in the room. This week is the last ten per cent, which is always more than ten per cent — and at the end you have two shipped backend services, which is two more than most candidates.',
  chapters: [
    'phase-9-software-engineering/02-code-reviews-documentation',
    'phase-11-job-hunt-pakistan/08-portfolio-and-personal-brand',
  ],
  deliverable: 'PROJECT 2 LIVE — deployed, documented, with a demo account, an architecture diagram, a two-minute demo video, and the measured numbers from weeks 18, 28, 30 and 31 in the README.',
  milestone: 'ANCHOR — Project 2 live by Saturday 15 May. A NestJS service with a real data layer, auth, queues, caching, real-time and tests, running at a public URL.',
  d: [
    { focus: 'Deploy it', tasks: [
      ['ENG','dawn','Deploy Project 2 — API, worker, Postgres and Redis. The worker is a separate process and must be deployed as one; discovering that today is better than discovering it in week 41.'],
      ['JOB','lunch','Two applications, tailored, logged.'],
    ]},
    { focus: 'Seed, and a demo account', tasks: [
      ['ENG','dawn','A live demo with an empty database is a dead demo. Seed realistic data, create a demo account a reviewer can log into, and make every empty state say something useful.'],
      ['COMM','lunch','Read Phase 11 Chapter 8 (Portfolio and Personal Brand). Then write the README properly: what it does, the stack, the architecture diagram, how to run it, and what you would do next.'],
    ]},
    { focus: 'Review it as a hostile reviewer', tasks: [
      ['ENG','dawn','Read Phase 9 Chapter 2 (Code Reviews and Documentation). Then review Project 2 as someone trying to reject you: dead code, commented-out blocks, secrets in history, TODOs, inconsistent naming, tests that assert nothing. Fix all of it.'],
      ['JOB','lunch','Three applications, tailored, logged.'],
    ]},
    { focus: 'Put the numbers in', tasks: [
      ['ENG','dawn','Collect every measurement you have taken — the index before-and-after, the N+1 fix, the cache hit rate, the queue throughput, the stampede fix — and put them in the README with the method. Measured numbers are what separate your repository from a tutorial.'],
      ['COMM','lunch','Record the two-minute demo: the problem, the main journey, one technical decision you are proud of. Re-record until it is clean.'],
    ]},
    { focus: 'Put the link everywhere', tasks: [
      ['ENG','dawn','Final pass: every journey tested on the deployed app from a phone, logged out and logged in. Tag the release.'],
      ['JOB','lunch','Three applications. Then rewrite the CV around two shipped services. It should look nothing like the October version — Nest, Postgres, Redis, queues, tests, all defensible.'],
    ]},
    { focus: 'ANCHOR — Project 2 live, Block V closes', tasks: [
      ['ENG','dawn','Deep build, two hours: whatever is unfinished. If nothing is, write the "what I would do differently" section — reviewers read that one first.'],
      ['ENG','mid','Drill: present both projects back to back, five minutes, as in a first round. Record it and watch it once.'],
      ['REV','late','BLOCK V REVIEW. Two services live. Honestly: which would I lead with for a backend role at a product company? What is the technical-round rate now? Read Block VI ahead — the operational half.'],
    ]},
  ],
},

// ══════════════════════════════════════════════════════════════════
// BLOCK VI — LINUX, DOCKER, NGINX, CI/CD (W34–W38)
// Five weeks moving you from "can build a service" to "can be trusted
// with production" — which is most of the gap between tier 3 and tier 2.
// Everything here you configure yourself rather than click.
// Applications rise to twelve a week: two services shipped.
// ══════════════════════════════════════════════════════════════════
{
  n: 34, block: 'VI — Linux, Docker and CI/CD',
  dsa: { topic: 'Graphs — cycle detection', problems: 3 },
  title: 'Linux and the Shell',
  theme: 'Every server you will touch is Linux and every pipeline is a shell script. You have avoided both for three years. One week to stop being a tourist on the command line.',
  chapters: [
    'phase-5-devops/01-linux',
    'phase-5-devops/02-shell-scripting',
  ],
  deliverable: 'week-34/ containing a backup script that dumps a database, compresses, rotates anything older than seven days, logs every step and exits non-zero on failure — plus a successful restore from it.',
  milestone: 'You can diagnose a Linux box over SSH with no GUI: what is listening, what is eating memory, what filled the disk, what the logs say.',
  d: [
    { focus: 'Filesystem, users, permissions', tasks: [
      ['ENG','dawn','Phase 5 Chapter 1 (Linux) — filesystem layout, users, groups, permissions. Learn what 644 and 755 actually mean and why a private key with the wrong mode is refused. Practise on a real box, not a diagram.'],
      ['JOB','lunch','Three applications, tailored, logged. The quota rises to twelve a week — you are now the candidate the CV describes.'],
    ]},
    { focus: 'Processes, ports, resources', tasks: [
      ['ENG','dawn','Phase 5 Chapter 1 — ps, top, kill, lsof, ss, df, du, free. Then answer three questions on a running box: what is listening on port 3000, what is eating memory, what filled the disk.'],
      ['COMM','lunch','Write the six steps you would take if a production server stopped responding, in order. This is a real interview question.'],
    ]},
    { focus: 'Text processing and logs', tasks: [
      ['ENG','dawn','Phase 5 Chapter 1 — grep, sed, awk, cut, sort, uniq, tail -f, journalctl. No AI: take a raw access log and answer four questions from the command line alone — top endpoints, error rate, slowest paths, busiest hour.'],
      ['JOB','lunch','Three applications, tailored, logged.'],
    ]},
    { focus: 'Shell scripting that fails loudly', tasks: [
      ['ENG','dawn','Phase 5 Chapter 2 (Shell Scripting) — variables, conditionals, loops, exit codes, and set -euo pipefail. Write a script that fails loudly instead of continuing quietly, then test every failure path.'],
      ['JOB','lunch','Three applications, tailored, logged.'],
    ]},
    { focus: 'SSH, keys and cron', tasks: [
      ['ENG','dawn','Phase 5 Chapter 1 — SSH keys, config and agent. Then cron: schedule your backup script, watch it not run, find out why from the logs, and fix it. Cron failing silently is a rite of passage and a good interview story.'],
      ['JOB','lunch','Three applications. Twelve this week.'],
    ]},
    { focus: 'Build the backup script', tasks: [
      ['ENG','dawn','Deep build, two hours: a real backup script for Project 2 — dump, compress, timestamp, upload, rotate past seven days, log every step, non-zero exit on failure. Then restore from it, because a backup you have not restored is not a backup.'],
      ['ENG','mid','Drill: three LeetCode problems, timed, no AI. Then one spoken answer on debugging a server you cannot reproduce locally.'],
      ['REV','late','Weekly review. Read next week ahead.'],
    ]},
  ],
},

{
  n: 35, block: 'VI — Linux, Docker and CI/CD',
  dsa: { topic: 'Union-find', problems: 3 },
  title: 'Docker and Docker Compose',
  theme: 'Containers are the vocabulary of every infrastructure conversation you will have. The goal is not memorising commands — it is understanding images, layers and networking well enough to debug when it does not work.',
  chapters: [
    'phase-5-devops/03-docker',
    'phase-5-devops/04-docker-compose',
    'phase-10-english-communication/11-technical-english-for-engineers',
  ],
  deliverable: 'Project 2 fully containerised — a multi-stage Dockerfile under 200MB running as a non-root user, and a compose file bringing up API, worker, Postgres and Redis with one command.',
  milestone: 'A stranger can clone Project 2 and run the whole stack with one command, and you can explain the difference between an image and a container without hedging.',
  d: [
    { focus: 'Images, layers, containers', tasks: [
      ['ENG','dawn','Phase 5 Chapter 3 (Docker) — images, layers, containers, and the build cache. Write the Dockerfile for your API by hand. Change one line and watch which layers rebuild — that observation is the whole caching lesson.'],
      ['JOB','lunch','Three applications, tailored, logged.'],
    ]},
    { focus: 'Multi-stage builds and size', tasks: [
      ['ENG','dawn','Phase 5 Chapter 3 — multi-stage builds, base image choice, .dockerignore, and running as a non-root user. Get the image under 200MB and write the before and after down.'],
      ['COMM','lunch','Read Phase 10 Chapter 11 (Technical English for Engineers). Describe your Docker setup in the register you would use in a pull request.'],
    ]},
    { focus: 'Volumes, networks, environment', tasks: [
      ['ENG','dawn','Phase 5 Chapter 3 — volumes, networks, port publishing, environment. Then deliberately break container-to-container networking and fix it. That failure is exactly what interviewers ask about.'],
      ['JOB','lunch','Three applications, tailored, logged.'],
    ]},
    { focus: 'Compose the whole stack', tasks: [
      ['ENG','dawn','Phase 5 Chapter 4 (Docker Compose) — services, depends_on, healthchecks, named volumes. Bring up API, worker, Postgres and Redis together. Make the database survive a restart and the API wait for it properly.'],
      ['JOB','lunch','Three applications, tailored, logged.'],
    ]},
    { focus: 'Debugging containers', tasks: [
      ['ENG','dawn','Logs, exec, inspect, and why a container exits immediately. Break your own stack three ways — wrong env var, wrong port, database not ready — and diagnose each from the logs alone.'],
      ['JOB','lunch','Three applications. Twelve this week.'],
    ]},
    { focus: 'One command, verified', tasks: [
      ['ENG','dawn','Deep build, two hours: finish compose and the README section. Then test the claim — clean clone into a new folder, one command, working stack. More than one command means it is not done.'],
      ['ENG','mid','Drill: three problems, timed. Then explain images versus containers aloud in sixty seconds.'],
      ['REV','late','Weekly review. Read next week ahead.'],
    ]},
  ],
},

{
  n: 36, block: 'VI — Linux, Docker and CI/CD',
  dsa: { topic: 'Greedy — interval scheduling', problems: 3 },
  title: 'Nginx, TLS, DNS and the Network',
  theme: 'What sits in front of your service, and how a request actually reaches it. Reverse proxying, certificates, DNS and the network layer — all of it asked about, most of it never learned properly by people who deploy to a platform that hides it.',
  chapters: [
    'phase-5-devops/05-nginx',
    'phase-5-devops/12-reverse-proxy',
    'phase-5-devops/11-ssl',
    'phase-5-devops/09-networking',
    'phase-5-devops/10-dns',
  ],
  deliverable: 'Project 2 behind Nginx on a domain you own, with a real certificate that auto-renews, gzip, correct proxy headers, and a written trace of a request from DNS lookup to response.',
  milestone: 'You can explain what happens between typing a URL and receiving a response, including DNS, TCP, TLS and the proxy — end to end, from memory.',
  d: [
    { focus: 'Nginx as a reverse proxy', tasks: [
      ['ENG','dawn','Phase 5 Chapter 5 (Nginx) and Chapter 12 (Reverse Proxy) — server blocks, location matching, proxy_pass, and the headers a proxy must forward. Put Nginx in front of Project 2 by hand and understand every line you wrote.'],
      ['JOB','lunch','Three applications, tailored, logged.'],
    ]},
    { focus: 'The network path', tasks: [
      ['ENG','dawn','Phase 5 Chapter 9 (Networking) — TCP handshake, ports, keep-alive, and where latency actually comes from. Then trace a real request with curl -v and dig and write down every step it took.'],
      ['COMM','lunch','Write a two-minute answer to "what happens when you type a URL and press enter?" It is the most asked systems question there is.'],
    ]},
    { focus: 'DNS', tasks: [
      ['ENG','dawn','Phase 5 Chapter 10 (DNS) — record types, TTL, propagation, and why a low TTL matters before a migration. Point a domain you own at your server and watch the change propagate with dig.'],
      ['JOB','lunch','Three applications, tailored, logged.'],
    ]},
    { focus: 'TLS, properly', tasks: [
      ['ENG','dawn','Phase 5 Chapter 11 (SSL/TLS) — the handshake, certificates, chains, and what a certificate authority actually asserts. Issue a real certificate with automatic renewal, then confirm renewal works rather than assuming it.'],
      ['JOB','lunch','Three applications, tailored, logged.'],
    ]},
    { focus: 'Proxy the real things', tasks: [
      ['ENG','dawn','Configure Nginx for what your app actually needs: WebSocket upgrade headers, gzip, client body size for uploads, sensible timeouts, and a rate limit at the edge. Then break each one and see the failure it causes.'],
      ['JOB','lunch','Three applications. Twelve this week.'],
    ]},
    { focus: 'Trace it end to end', tasks: [
      ['ENG','dawn','Deep build, two hours: Project 2 live on your own domain over HTTPS behind Nginx. Then write the full request trace into the README — DNS, TCP, TLS, Nginx, Node, Postgres, and back.'],
      ['ENG','mid','Drill: five networking and TLS questions, spoken, timed.'],
      ['REV','late','Weekly review. Read next week ahead.'],
    ]},
  ],
},

{
  n: 37, block: 'VI — Linux, Docker and CI/CD',
  dsa: { topic: 'DP — 1D, climbing & house robber', problems: 4 },
  title: 'CI/CD with GitHub Actions',
  theme: 'Tests nobody runs are documentation. This week the tests run on every push, the image builds in the pipeline, and deployment stops being something you do by hand at eleven at night.',
  chapters: [
    'phase-5-devops/06-github-actions',
    'phase-5-devops/07-cicd',
  ],
  deliverable: 'A GitHub Actions pipeline on Project 2: lint, test against a service database, build and push the image, deploy on merge to main — with branch protection that blocks a red build.',
  milestone: 'A pull request with a failing test cannot be merged, and deployment happens on merge rather than by hand.',
  d: [
    { focus: 'The first workflow', tasks: [
      ['ENG','dawn','Phase 5 Chapter 6 (GitHub Actions) — workflows, jobs, steps, triggers, runners. Write one by hand that installs and lints on every push. Watch it fail, read the log, fix it.'],
      ['JOB','lunch','Three applications, tailored, logged.'],
    ]},
    { focus: 'Tests in CI with a real database', tasks: [
      ['ENG','dawn','Add the test job with a Postgres and a Redis service container, migrations, and your week-27 suite. Getting a database to exist in CI is the step that teaches you what your local setup was hiding.'],
      ['COMM','lunch','Write five sentences describing your pipeline. It goes in the README and it is an interview answer.'],
    ]},
    { focus: 'Caching, matrices and speed', tasks: [
      ['ENG','dawn','Phase 5 Chapter 6 — caching dependencies, Docker layer caching, parallel jobs. Get the pipeline under five minutes. A slow pipeline is one people learn to ignore.'],
      ['JOB','lunch','Three applications, tailored, logged.'],
    ]},
    { focus: 'Secrets and environments', tasks: [
      ['ENG','dawn','Phase 5 Chapter 7 (CI/CD) — secrets, environments, protected deployments, and the principle that CI must never see production credentials it does not need. Move every credential into repository secrets.'],
      ['JOB','lunch','Three applications, tailored, logged.'],
    ]},
    { focus: 'Deploy on merge, and roll back', tasks: [
      ['ENG','dawn','Phase 5 Chapter 7 — deployment strategies, health-gated deploys and rollback. Wire deployment to run on merge after tests pass. Then break main deliberately, watch the pipeline stop it, and prove the rollback path works.'],
      ['JOB','lunch','Three applications. Twelve this week.'],
    ]},
    { focus: 'Protect the branch', tasks: [
      ['ENG','dawn','Deep build, two hours: branch protection on main — no direct pushes, required checks, required review. Then work the way a team works for the rest of the plan: branch, PR, review, merge.'],
      ['ENG','mid','Drill: three problems, timed. Then explain your pipeline aloud in ninety seconds.'],
      ['REV','late','Weekly review. Read next week ahead — Jenkins.'],
    ]},
  ],
},

{
  n: 38, block: 'VI — Linux, Docker and CI/CD',
  dsa: { topic: 'DP — 1D, coin change', problems: 4 },
  title: 'Jenkins',
  theme: 'A large number of Pakistani employers run Jenkins, often self-hosted and inherited. GitHub Actions teaches you pipelines; Jenkins teaches you the version of pipelines that a real company asks you to maintain. Knowing both is a hiring advantage.',
  chapters: [
    'phase-5-devops/16-jenkins',
    'phase-5-devops/07-cicd',
  ],
  deliverable: 'A Jenkins instance running in Docker with a declarative Jenkinsfile in the Project 2 repository — checkout, install, lint, test against a database, build the image, deploy on main — plus credentials handled properly and one shared library function.',
  milestone: 'BLOCK VI CLOSES. The same pipeline exists twice, in Actions and in Jenkins, and you can compare them from experience rather than opinion.',
  d: [
    { focus: 'Run Jenkins yourself', tasks: [
      ['ENG','dawn','Phase 5 Chapter 16 (Jenkins) — architecture: controller, agents, executors, workspaces. Run Jenkins in Docker, complete the setup wizard, install the plugins you need, and create your first pipeline job. Understand why the controller should not run builds.'],
      ['JOB','lunch','Three applications, tailored, logged.'],
    ]},
    { focus: 'The declarative Jenkinsfile', tasks: [
      ['ENG','dawn','Phase 5 Chapter 16 — declarative versus scripted pipelines. Write a Jenkinsfile with agent, stages, steps, post conditions and environment. Commit it to the repository — the pipeline is code and lives with the code.'],
      ['COMM','lunch','Write a ninety-second answer to "what is the difference between Jenkins and GitHub Actions?" from having run both.'],
    ]},
    { focus: 'Agents, Docker and the real build', tasks: [
      ['ENG','dawn','Phase 5 Chapter 16 — running stages inside Docker agents, and sidecar containers for a test database. Get the full test suite running in Jenkins against a real Postgres, exactly as in Actions.'],
      ['JOB','lunch','Three applications, tailored, logged.'],
    ]},
    { focus: 'Credentials, and never in the Jenkinsfile', tasks: [
      ['ENG','dawn','Phase 5 Chapter 16 — the credentials store, withCredentials, and masking. Then deliberately echo a secret and watch Jenkins mask it — and understand why that masking is a safety net, not a strategy.'],
      ['JOB','lunch','Three applications, tailored, logged.'],
    ]},
    { focus: 'Shared libraries and multibranch', tasks: [
      ['ENG','dawn','Phase 5 Chapter 16 — multibranch pipelines, so every branch and PR builds automatically, and shared libraries, so five repositories do not copy the same eighty lines. Extract one function into a shared library and use it.'],
      ['JOB','lunch','Three applications. Twelve this week.'],
    ]},
    { focus: 'BLOCK VI REVIEW', tasks: [
      ['ENG','dawn','Deep build, two hours: finish the Jenkins pipeline end to end including deploy-on-main. Then write the comparison into the README: what each tool does better, and which you would choose for a new team and why.'],
      ['ENG','mid','Block drill: ten infrastructure questions, spoken, timed — Docker, Nginx, TLS, CI/CD, Jenkins, rollback.'],
      ['REV','late','BLOCK VI REVIEW. Could I be trusted with production at a tier-2 company today, honestly? Read Block VII ahead — AWS.'],
    ]},
  ],
},

// ══════════════════════════════════════════════════════════════════
// BLOCK VII — AWS (W39–W42)
// Four weeks attaching your Cloud Practitioner certificate to something
// real. IAM first and a billing alarm before anything else, then the
// services a backend engineer actually touches, then observability.
// Project 2 moves onto AWS properly.
// ══════════════════════════════════════════════════════════════════
{
  n: 39, block: 'VII — AWS',
  dsa: { topic: 'DP — 2D grids', problems: 4 },
  title: 'AWS Foundations — IAM, EC2, S3',
  theme: 'You have the certificate and have never built anything. This week gives it evidence: identity, a server you configured, and object storage wired into your own application.',
  chapters: [
    'phase-6-cloud/01-aws-overview',
    'phase-6-cloud/02-iam',
    'phase-6-cloud/03-ec2',
    'phase-6-cloud/04-s3',
    'phase-5-devops/08-terraform',
  ],
  deliverable: 'An AWS account locked down with MFA and least-privilege users, a billing alarm, Project 2 running on EC2, and S3 handling uploads through pre-signed URLs with public access blocked.',
  milestone: 'You can explain the difference between an IAM user, a role and a policy, and why an application should use a role rather than an access key.',
  d: [
    { focus: 'IAM first, and a billing alarm', tasks: [
      ['ENG','dawn','Phase 6 Chapter 2 (IAM) — users, groups, roles, policies, least privilege. Lock down the root account, enable MFA, create a working user. Then set a billing alarm at a number that would hurt. Do this before anything else.'],
      ['JOB','lunch','Three applications, tailored, logged.'],
    ]},
    { focus: 'Policies you can read', tasks: [
      ['ENG','dawn','Phase 6 Chapter 2 — policy documents. Effect, Action, Resource, Condition. Write one by hand that allows exactly one bucket prefix and nothing else, attach it, and prove both the allow and the deny. Then read Phase 5 Chapter 8 (Terraform) and express that one policy as Terraform, so you have seen infrastructure as code before you need it.'],
      ['COMM','lunch','Write five sentences on what least privilege means in practice, with an example from your own policy.'],
    ]},
    { focus: 'EC2, and a server you configured', tasks: [
      ['ENG','dawn','Phase 6 Chapter 3 (EC2) — instance types, AMIs, security groups, key pairs, user data. Launch one, SSH in, install what Project 2 needs by hand, and run it. Everything from week 34 is for today.'],
      ['JOB','lunch','Three applications, tailored, logged.'],
    ]},
    { focus: 'Security groups are the firewall', tasks: [
      ['ENG','dawn','Phase 6 Chapter 3 — security groups versus network ACLs, stateful versus stateless. Lock the instance down to Nginx on 443 and SSH from your IP only. Then break your own access and fix it through the console — a useful thing to have done once.'],
      ['JOB','lunch','Three applications, tailored, logged.'],
    ]},
    { focus: 'S3 and pre-signed uploads', tasks: [
      ['ENG','dawn','Phase 6 Chapter 4 (S3) — buckets, keys, storage classes, bucket policies and the public access block. Move the week-29 upload flow onto S3 with pre-signed URLs, then confirm the bucket is not publicly listable.'],
      ['JOB','lunch','Three applications. Twelve this week.'],
    ]},
    { focus: 'Roles, not keys', tasks: [
      ['ENG','dawn','Deep build, two hours: remove every hard-coded AWS key from Project 2 and use an instance role instead. Then search your git history for keys you committed earlier and rotate anything you find.'],
      ['ENG','mid','Drill: five AWS questions, spoken, timed. Include "user versus role" and "how does your app authenticate to S3?"'],
      ['REV','late','Weekly review. Check the bill. Read next week ahead.'],
    ]},
  ],
},

{
  n: 40, block: 'VII — AWS',
  dsa: { topic: 'DP — subsequences', problems: 4 },
  title: 'Networking and Managed Data — VPC, RDS, ELB, Auto Scaling',
  theme: 'The part of AWS that is actually architecture. A private network, a managed database that is not reachable from the internet, a load balancer in front, and a group that replaces an instance when it dies.',
  chapters: [
    'phase-6-cloud/07-vpc',
    'phase-6-cloud/05-rds',
    'phase-6-cloud/11-elb',
    'phase-6-cloud/10-auto-scaling',
  ],
  deliverable: 'Project 2 on a VPC you designed — public and private subnets, RDS in private with no public access, an application load balancer in front, and an auto-scaling group of at least two instances.',
  milestone: 'You can draw your own VPC from memory and explain the path of a packet from the internet to the database and back.',
  d: [
    { focus: 'Design the VPC', tasks: [
      ['ENG','dawn','Phase 6 Chapter 7 (VPC) — CIDR blocks, subnets, route tables, internet gateway, NAT. Draw the network on paper before building it: what is public, what is private, and what can reach the internet outbound only.'],
      ['JOB','lunch','Three applications, tailored, logged.'],
    ]},
    { focus: 'Build it and break it', tasks: [
      ['ENG','dawn','Build the VPC. Then debug it, because it will not work first time: the classic failure is a private instance with no NAT route that cannot reach the package registry. Diagnose it from the route table rather than by guessing.'],
      ['COMM','lunch','Write a two-minute answer to "why would you put a database in a private subnet?"'],
    ]},
    { focus: 'RDS, private', tasks: [
      ['ENG','dawn','Phase 6 Chapter 5 (RDS) — managed Postgres, subnet groups, parameter groups, automated backups, Multi-AZ. Create it with no public access, connect Project 2 to it from the private subnet, and restore a snapshot once so you know the procedure.'],
      ['JOB','lunch','Three applications, tailored, logged.'],
    ]},
    { focus: 'The load balancer', tasks: [
      ['ENG','dawn','Phase 6 Chapter 11 (ELB) — the application load balancer, target groups, listeners, health checks and TLS termination. Put it in front of two instances. Your week-13 health check now earns its keep.'],
      ['JOB','lunch','Three applications, tailored, logged.'],
    ]},
    { focus: 'Auto scaling, and statelessness', tasks: [
      ['ENG','dawn','Phase 6 Chapter 10 (Auto Scaling) — launch templates, groups, scaling policies, and the requirement that instances be disposable. Find everything in Project 2 that assumes one server — local files, in-memory state, a cron job — and fix each one.'],
      ['JOB','lunch','Three applications. Twelve this week.'],
    ]},
    { focus: 'Kill an instance on purpose', tasks: [
      ['ENG','dawn','Deep build, two hours: terminate an instance while making requests and prove the service stays up and a replacement arrives. Then draw the final architecture and put it in the README.'],
      ['ENG','mid','Drill: five AWS networking questions, spoken, timed. Then present the architecture in three minutes as in a design round.'],
      ['REV','late','Weekly review. Check the bill again. Read next week ahead.'],
    ]},
  ],
},

{
  n: 41, block: 'VII — AWS',
  dsa: { topic: 'DP — knapsack', problems: 4 },
  title: 'Containers and Serverless on AWS — ECS, EKS, Lambda, SQS',
  theme: 'Where your Docker work meets the cloud. ECS for running containers without operating Kubernetes, enough EKS to hold the conversation, Lambda for the work that suits it, and SQS because your queue should not depend on one Redis box.',
  chapters: [
    'phase-6-cloud/12-ecs',
    'phase-6-cloud/13-eks',
    'phase-6-cloud/14-lambda',
    'phase-6-cloud/15-sns-sqs',
    'phase-6-cloud/16-secrets-manager',
  ],
  deliverable: 'Project 2 running on ECS Fargate — API and worker as separate services behind the load balancer, secrets from Secrets Manager, and one queue moved to SQS with a dead-letter queue.',
  milestone: 'You can explain when you would choose ECS over EKS over Lambda, in terms of what each costs you rather than what each is called.',
  d: [
    { focus: 'ECS and Fargate', tasks: [
      ['ENG','dawn','Phase 6 Chapter 12 (ECS) — clusters, task definitions, services, and Fargate versus EC2 launch types. Push your image to ECR and run the API as a Fargate service behind the load balancer from last week.'],
      ['JOB','lunch','Three applications, tailored, logged.'],
    ]},
    { focus: 'The worker as its own service', tasks: [
      ['ENG','dawn','Run the worker as a second ECS service with its own scaling — it scales on queue depth, not on HTTP traffic. This separation is the argument for why the worker was a separate process from week 31.'],
      ['COMM','lunch','Write a ninety-second answer to "how do you scale a background worker independently of your API?"'],
    ]},
    { focus: 'Secrets, properly', tasks: [
      ['ENG','dawn','Phase 6 Chapter 16 (Secrets Manager) — secrets versus parameters, rotation, and injecting them into a task definition rather than baking them into an image. Move every Project 2 secret across.'],
      ['JOB','lunch','Three applications, tailored, logged.'],
    ]},
    { focus: 'SQS and SNS', tasks: [
      ['ENG','dawn','Phase 6 Chapter 15 (SNS/SQS) — queues, topics, visibility timeout, and the managed dead-letter queue. Move one Project 2 queue to SQS. The visibility timeout is the part people get wrong; make sure you can explain it.'],
      ['JOB','lunch','Three applications, tailored, logged.'],
    ]},
    { focus: 'Lambda, and EKS enough to discuss', tasks: [
      ['ENG','dawn','Phase 6 Chapter 14 (Lambda) — the execution model, cold starts, and the work it genuinely suits. Write one real Lambda for a scheduled task. Then Phase 6 Chapter 13 (EKS): read it, understand pods, services and deployments, and be honest that you have not operated a cluster.'],
      ['JOB','lunch','Three applications. Twelve this week.'],
    ]},
    { focus: 'Deploy the whole thing', tasks: [
      ['ENG','dawn','Deep build, two hours: API and worker both on ECS, secrets injected, SQS handling one queue, deploying from the pipeline. Then force a task to fail and watch ECS replace it.'],
      ['ENG','mid','Drill: five questions on containers and serverless, spoken, timed.'],
      ['REV','late','Weekly review. Check the bill. Read next week ahead.'],
    ]},
  ],
},

{
  n: 42, block: 'VII — AWS',
  dsa: { topic: 'DP — recognising the pattern cold', problems: 4 },
  title: 'Observability — CloudWatch, Prometheus, Grafana',
  theme: 'You cannot operate what you cannot see. Logs you can search, metrics that mean something, dashboards that answer a question, and exactly one alarm that wakes you up — because an alert nobody acts on trains you to ignore alerts.',
  chapters: [
    'phase-5-devops/13-monitoring',
    'phase-6-cloud/06-cloudwatch',
    'phase-5-devops/14-prometheus',
    'phase-5-devops/15-grafana',
    'phase-6-cloud/19-cost-optimization',
    'phase-10-english-communication/12-professional-communication-reference',
  ],
  deliverable: 'Project 2 exporting application metrics to Prometheus, a Grafana dashboard answering four real questions, logs searchable in CloudWatch, and one alarm on a symptom that reaches your phone.',
  milestone: 'BLOCK VII CLOSES. You can answer "how do you know the service is healthy?" by opening a dashboard rather than describing an intention.',
  d: [
    { focus: 'What is worth measuring', tasks: [
      ['ENG','dawn','Phase 5 Chapter 13 (Monitoring) — the four golden signals: latency, traffic, errors, saturation. Write down what each one means for Project 2 specifically before instrumenting anything.'],
      ['JOB','lunch','Three applications, tailored, logged.'],
    ]},
    { focus: 'Prometheus and instrumentation', tasks: [
      ['ENG','dawn','Phase 5 Chapter 14 (Prometheus) — the pull model, exporters, and metric types: counter, gauge, histogram, summary. Instrument Project 2 with a /metrics endpoint: request count, duration histogram, queue depth, error count. Understand why a histogram, not an average.'],
      ['COMM','lunch','Write five sentences on why an average response time is a misleading number, and what you would report instead.'],
    ]},
    { focus: 'PromQL', tasks: [
      ['ENG','dawn','Phase 5 Chapter 14 — PromQL. rate(), histogram_quantile(), aggregation by label. Write the four queries that matter: request rate, error rate, p95 latency, queue depth. Type them yourself until they stop being incantations.'],
      ['JOB','lunch','Three applications, tailored, logged.'],
    ]},
    { focus: 'Grafana dashboards', tasks: [
      ['ENG','dawn','Phase 5 Chapter 15 (Grafana) — data sources, panels, variables. Build one dashboard that answers four questions at a glance. A dashboard with thirty panels answers none; build the small one.'],
      ['JOB','lunch','Three applications, tailored, logged.'],
    ]},
    { focus: 'Logs, alarms and the bill', tasks: [
      ['ENG','dawn','Phase 6 Chapter 6 (CloudWatch) — log groups, retention, metric filters, alarms. Ship structured logs with request ids, then answer a question from the logs alone. Set exactly one alarm on a symptom a user would feel and route it to your phone. Then Phase 6 Chapter 19: read your bill line by line and cut the two largest avoidable items.'],
      ['JOB','lunch','Three applications. Twelve this week.'],
    ]},
    { focus: 'BLOCK VII REVIEW', tasks: [
      ['ENG','dawn','Deep build, two hours: trigger the alarm deliberately and confirm it arrives. Then write the operations section of the README — the dashboard, what the alarm means, where the logs are, how to roll back.'],
      ['ENG','mid','Block drill: ten AWS and observability questions, spoken, timed.'],
      ['REV','late','BLOCK VII REVIEW. Two services running on infrastructure I configured and can explain line by line — true or not? Read Block VIII ahead — AI engineering.'],
    ]},
  ],
},

// ══════════════════════════════════════════════════════════════════
// BLOCK VIII — AI ENGINEERING (W43–W45)
// Three weeks treating AI as a backend specialism rather than a demo:
// tokens and cost as engineering constraints, retrieval as a search
// problem, and evaluation as the thing that separates a service from a
// toy. Project 3 is small, finished and measured.
// Applications rise to fifteen a week — the final push.
// ══════════════════════════════════════════════════════════════════
{
  n: 43, block: 'VIII — AI Engineering',
  dsa: { topic: 'Mixed mediums — timed', problems: 4 },
  title: 'LLM Fundamentals and Prompt Engineering',
  theme: 'Not a course on AI. A working understanding of tokens, context, cost and failure modes, so that Project 3 is engineering rather than incantation — and so you answer AI questions like a backend engineer rather than a user.',
  chapters: [
    'phase-8-ai-engineering/01-llm-fundamentals',
    'phase-8-ai-engineering/02-prompt-engineering',
    'phase-11-job-hunt-pakistan/09-remote-work-the-next-step',
  ],
  deliverable: 'PROJECT3.md with a one-paragraph scope and a chosen document set, plus a working API integration with token accounting, a hard cost ceiling, retries and a measured cost per request.',
  milestone: 'You can state Project 3\'s cost per thousand requests, and explain what a token is and why a context window is a constraint rather than a feature.',
  d: [
    { focus: 'Tokens, context and cost', tasks: [
      ['ENG','dawn','Phase 8 Chapter 1 (LLM Fundamentals) — tokens, context windows, temperature, pricing. Tokenise three of your own documents and work out what a request would actually cost. Cost is an engineering constraint and most demos ignore it.'],
      ['JOB','lunch','Four applications, tailored, logged. The quota rises to fifteen — this is the push.'],
    ]},
    { focus: 'Choose Project 3', tasks: [
      ['ENG','dawn','Write PROJECT3.md: one paragraph of scope. It must answer questions over a real body of documents you have, be finishable in three weeks at this budget, and have a measurable answer quality. Small and finished beats ambitious and abandoned.'],
      ['COMM','lunch','Read Phase 11 Chapter 9 (Remote Work). Write down whether remote international work is a goal after this plan, and what it would require that you do not have.'],
    ]},
    { focus: 'Prompts as an interface', tasks: [
      ['ENG','dawn','Phase 8 Chapter 2 (Prompt Engineering) — structure, instructions, examples, output formats. Build a prompt that returns strict JSON your code can parse, then make your code handle the case where it does not. That failure path is the engineering.'],
      ['JOB','lunch','Four applications, tailored, logged.'],
    ]},
    { focus: 'Treat it as an unreliable dependency', tasks: [
      ['ENG','dawn','Wire the model API up properly: timeouts, retries with backoff, rate-limit handling, token accounting per request, and a hard cost ceiling. Everything from week 32 applies — it is a third-party service that will be slow and will fail.'],
      ['JOB','lunch','Four applications, tailored, logged.'],
    ]},
    { focus: 'Ingest the documents', tasks: [
      ['ENG','dawn','Load, clean and chunk your document set. Chunking strategy determines answer quality later — write down the size and overlap you chose and why, so you can change it deliberately next week rather than by feel.'],
      ['JOB','lunch','Three applications. Fifteen this week.'],
    ]},
    { focus: 'The crude baseline', tasks: [
      ['ENG','dawn','Deep build, two hours: the crudest end-to-end path — question in, whole document in context, answer out. It will be expensive and mediocre. That is the baseline retrieval has to beat, and you need the number.'],
      ['ENG','mid','Drill: three LeetCode problems, timed, no AI.'],
      ['REV','late','Weekly review. Write the baseline cost and quality into PROJECT3.md. Read next week ahead.'],
    ]},
  ],
},

{
  n: 44, block: 'VIII — AI Engineering',
  dsa: { topic: 'Mixed mediums — timed', problems: 4 },
  title: 'Embeddings, Vector Search and RAG',
  theme: 'Retrieval is a search problem wearing new clothes, and the engineering is the unglamorous half: chunking, indexing, and evaluating whether what you retrieved was any good. The evaluation set is what makes this engineering.',
  chapters: [
    'phase-8-ai-engineering/03-embeddings-vector-databases',
    'phase-8-ai-engineering/04-rag',
  ],
  deliverable: 'A working retrieval pipeline on pgvector with an evaluation set of at least twenty question-and-expected-source pairs, and a measured retrieval accuracy you can quote.',
  milestone: 'You can explain what an embedding is without hand-waving, and you have a number for how often your retrieval returns the right source.',
  d: [
    { focus: 'Embeddings, concretely', tasks: [
      ['ENG','dawn','Phase 8 Chapter 3 (Embeddings and Vector Databases) — what an embedding is and what cosine similarity measures. Embed ten sentences you wrote and check which pairs come out closest. Intuition first, library second.'],
      ['JOB','lunch','Four applications, tailored, logged.'],
    ]},
    { focus: 'Store and query vectors', tasks: [
      ['ENG','dawn','Phase 8 Chapter 3 — vector storage and index types. Use pgvector on the Postgres you already know rather than adding a new database — and be able to say why that is the right call for this size of problem. Embed your chunks, store them, query nearest neighbours.'],
      ['COMM','lunch','Write a two-minute explanation of vector search for a non-technical person. If it needs the word "embedding", simplify further.'],
    ]},
    { focus: 'Build the evaluation set first', tasks: [
      ['ENG','dawn','Write twenty questions against your documents and record by hand which chunk should answer each. This is tedious and it is the single thing that turns a demo into engineering — without it you cannot tell whether a change helped.'],
      ['JOB','lunch','Four applications, tailored, logged.'],
    ]},
    { focus: 'Measure, then change one thing', tasks: [
      ['ENG','dawn','Phase 8 Chapter 4 (RAG) — the retrieve-then-generate pipeline. Measure retrieval accuracy against your twenty questions. Then change exactly one variable — chunk size — and measure again. One variable at a time, numbers written down.'],
      ['JOB','lunch','Four applications, tailored, logged.'],
    ]},
    { focus: 'Grounded generation with citations', tasks: [
      ['ENG','dawn','Build the generation half: retrieved chunks in the prompt, an instruction to answer only from them, and a source citation on every answer. Then test what it does when the answer is genuinely not in the documents. Saying "I do not know" is a feature.'],
      ['JOB','lunch','Three applications. Fifteen this week.'],
    ]},
    { focus: 'Improve one number', tasks: [
      ['ENG','dawn','Deep build, two hours: pick the weakest number and improve it — better chunking, hybrid keyword-plus-vector search, or a reranking step. Measure before and after and record both.'],
      ['ENG','mid','Drill: three problems, timed. Then explain your retrieval pipeline aloud in two minutes.'],
      ['REV','late','Weekly review. Read next week ahead — Project 3 ships.'],
    ]},
  ],
},

{
  n: 45, block: 'VIII — AI Engineering',
  dsa: { topic: 'Mixed mediums — narrated aloud', problems: 4 },
  title: 'Agents, MCP, and Ship Project 3',
  theme: 'Where tool-calling fits and where it does not, the protocol that is becoming the standard way to expose tools to models, and then the same shipping discipline as the first two projects.',
  chapters: [
    'phase-8-ai-engineering/05-ai-agents',
    'phase-8-ai-engineering/06-mcp',
    'phase-8-ai-engineering/07-ai-saas',
  ],
  deliverable: 'PROJECT 3 LIVE — deployed with a demo account, guardrails and cost caps, a README stating measured retrieval accuracy and cost per query, and one MCP server exposing a Project 2 capability as a tool.',
  milestone: 'ANCHOR — Project 3 live by Saturday 7 August, with measured retrieval quality. Three shipped backend services, all linkable, all explainable line by line.',
  d: [
    { focus: 'Tool calling and loops', tasks: [
      ['ENG','dawn','Phase 8 Chapter 5 (AI Agents) — tool use, the agent loop, and where it goes wrong: loops that do not terminate, tools with side effects, and costs that compound. Add one tool call to Project 3 and cap the iterations.'],
      ['JOB','lunch','Four applications, tailored, logged.'],
    ]},
    { focus: 'MCP — exposing your own service', tasks: [
      ['ENG','dawn','Phase 8 Chapter 6 (MCP) — the protocol, and tools, resources and prompts as its primitives. Build a small MCP server exposing one Project 2 capability as a tool. This is a genuinely current thing to have built and very few candidates have.'],
      ['COMM','lunch','Write a ninety-second answer to "how would you let an AI assistant use our internal API safely?" — the answer is about authorisation and blast radius, not about models.'],
    ]},
    { focus: 'Guardrails and cost control', tasks: [
      ['ENG','dawn','Phase 8 Chapter 7 (AI SaaS) — rate limiting per user, a per-user cost cap, input length limits, and a sensible response when the model API is down. A public AI demo without a cost cap is a bill waiting to arrive.'],
      ['JOB','lunch','Four applications, tailored, logged.'],
    ]},
    { focus: 'Deploy it', tasks: [
      ['ENG','dawn','Deploy Project 3 on the same pattern as Project 2 — container, pipeline, TLS, metrics. It should be fast this time, and noticing that it is fast is the point.'],
      ['JOB','lunch','Four applications, tailored, logged.'],
    ]},
    { focus: 'Document the limits honestly', tasks: [
      ['ENG','dawn','Write the README: what it does, the measured accuracy, the cost per query, and an honest limitations section — what it answers badly and what you would fix first. Reviewers trust a project more for having one.'],
      ['JOB','lunch','Three applications. Fifteen this week. Then update the CV around three shipped services.'],
    ]},
    { focus: 'ANCHOR — Project 3 live, Block VIII closes', tasks: [
      ['ENG','dawn','Deep build, two hours: finish everything outstanding, record the two-minute demo, and put all three project links on the CV, LinkedIn and GitHub profile.'],
      ['ENG','mid','Drill: present all three projects in seven minutes total, as in a first round. Record it and watch it once.'],
      ['REV','late','BLOCK VIII REVIEW. Three services live. Which do I lead with for a backend role, and which for an AI-adjacent one? Read Block IX ahead — two weeks of frontend, and only two.'],
    ]},
  ],
},

// ══════════════════════════════════════════════════════════════════
// BLOCK IX — FRONTEND, JUST PASSABLE (W46–W47)
// Two weeks, late, and deliberately shallow. Enough to put a usable face
// on your own APIs and not be helpless when a full-stack interviewer
// asks. This is not your skill and the plan does not pretend otherwise.
// The remaining frontend chapters stay in the book as reference.
// ══════════════════════════════════════════════════════════════════
{
  n: 46, block: 'IX — Frontend, Just Passable',
  dsa: { topic: 'Weak-area targeted set', problems: 4 },
  title: 'HTML, CSS and Tailwind — Enough to Not Be Helpless',
  theme: 'One week on markup and layout. The goal is a clean, responsive page you built yourself, not a design career. Semantic HTML and flexbox will carry ninety per cent of what you ever need.',
  chapters: [
    'phase-4-frontend/01-html',
    'phase-4-frontend/02-css',
    'phase-4-frontend/03-tailwind',
    'phase-10-english-communication/06-answering-questions-you-cannot-answer',
  ],
  deliverable: 'A responsive, accessible admin page for Project 2 built in Tailwind — navigation, a data table, a form — that works on a phone.',
  milestone: 'You can build a two-column responsive layout from a blank file and explain what semantic HTML gives you beyond neatness.',
  d: [
    { focus: 'Semantic HTML and forms', tasks: [
      ['ENG','dawn','Phase 4 Chapter 1 (HTML) — semantic elements, forms, labels, and the accessibility tree. Build a form with correct labels and error associations, then navigate it with the keyboard only.'],
      ['JOB','lunch','Four applications, tailored, logged.'],
    ]},
    { focus: 'The box model and layout', tasks: [
      ['ENG','dawn','Phase 4 Chapter 2 (CSS) — box model, display, position, stacking context. Reproduce two layouts from screenshots using the box model alone, then write down why the first one broke.'],
      ['COMM','lunch','Rehearse the honest answer to "how are you on frontend?" — "I am a backend engineer; I can build a working interface for my own services and here is one" is a strong answer. Pretending is not.'],
    ]},
    { focus: 'Flexbox and grid', tasks: [
      ['ENG','dawn','Phase 4 Chapter 2 — flexbox and grid, and which one each layout wants. Build a dashboard shell — sidebar, header, responsive content — and notice which tool was right.'],
      ['JOB','lunch','Four applications, tailored, logged.'],
    ]},
    { focus: 'Tailwind', tasks: [
      ['ENG','dawn','Phase 4 Chapter 3 (Tailwind) — utilities, responsive prefixes, extracting components. Rebuild the shell in Tailwind. Notice what got faster and what got uglier, and have an opinion about it.'],
      ['JOB','lunch','Four applications, tailored, logged.'],
    ]},
    { focus: 'Responsive, on a real phone', tasks: [
      ['ENG','dawn','Make it genuinely responsive, then open it on your own phone and fix what is broken. Half of frontend work is this loop.'],
      ['JOB','lunch','Three applications. Fifteen this week.'],
    ]},
    { focus: 'Build the admin shell', tasks: [
      ['ENG','dawn','Deep build, two hours: the static admin page for Project 2 — navigation, data table, form. No data yet. Responsive and accessible.'],
      ['ENG','mid','Drill: three LeetCode problems, timed, no AI.'],
      ['REV','late','Weekly review. Read next week ahead.'],
    ]},
  ],
},

{
  n: 47, block: 'IX — Frontend, Just Passable',
  dsa: { topic: 'Weak-area targeted set', problems: 4 },
  title: 'React — Enough to Demo Your Own APIs',
  theme: 'One week of React. Components, state, data fetching, forms, and an authenticated route. Enough to show your backends working and to answer React questions without bluffing.',
  chapters: [
    'phase-4-frontend/04-react',
    'phase-4-frontend/07-forms',
    'phase-4-frontend/08-authentication',
  ],
  deliverable: 'A working admin interface for Project 2 — list, detail, create, edit, login, protected routes — reading live data, with loading, error and empty states handled everywhere.',
  milestone: 'BLOCK IX CLOSES. You can demo all three services through an interface you built, and no screen renders undefined.',
  d: [
    { focus: 'The model, and components', tasks: [
      ['ENG','dawn','Phase 4 Chapter 4 (React) — the rendering model: you describe the UI for a state and change the state. Then components, props and composition. Build the card, list and layout components for the admin page.'],
      ['JOB','lunch','Four applications, tailored, logged.'],
    ]},
    { focus: 'State, and where it belongs', tasks: [
      ['ENG','dawn','Phase 4 Chapter 4 — useState, lifting state, lists and keys. Build a filterable, sortable table. Put the state in the wrong place first, feel the problem, then lift it.'],
      ['COMM','lunch','Write a ninety-second answer to "what is the difference between React and AngularJS?" — you have used both, so answer from experience.'],
    ]},
    { focus: 'Data fetching and the four states', tasks: [
      ['ENG','dawn','Phase 4 Chapter 4 — useEffect and what it is actually for. Connect to your deployed Project 2 API. Every fetch has four outcomes — loading, error, success, and success with nothing in it. Handle all four.'],
      ['JOB','lunch','Four applications, tailored, logged.'],
    ]},
    { focus: 'Forms that agree with the server', tasks: [
      ['ENG','dawn','Phase 4 Chapter 7 (Forms) — controlled inputs, validation timing, error display. Make the client validation match the DTO rules from week 24, then prove with curl that the server still rejects a bad request. Client validation is convenience, never security.'],
      ['JOB','lunch','Four applications, tailored, logged.'],
    ]},
    { focus: 'Login and protected routes', tasks: [
      ['ENG','dawn','Phase 4 Chapter 8 (Frontend Authentication) — where the token lives, protected routes, redirect after login, and transparent refresh. Wire it to the auth you built in week 26.'],
      ['JOB','lunch','Three applications. Fifteen this week.'],
    ]},
    { focus: 'BLOCK IX REVIEW', tasks: [
      ['ENG','dawn','Deep build, two hours: finish the admin interface, deploy it, and point it at the live API. Then hand your phone to someone who has never seen it and watch them use it without helping.'],
      ['ENG','mid','Drill: three problems, timed. Then demo all three projects through the interface, five minutes, recorded.'],
      ['REV','late','Weekly review. Read Block X ahead — everything from here is interview performance.'],
    ]},
  ],
},

// ══════════════════════════════════════════════════════════════════
// BLOCK X — THE INTERVIEW MACHINE AND THE CLOSE (W48–W50)
// The building is done. Three weeks turning what you know into what you
// can demonstrate under pressure, with someone watching, in English.
// You have also drilled every Saturday for forty-seven weeks, so this is
// consolidation rather than a standing start.
// ══════════════════════════════════════════════════════════════════
{
  n: 48, block: 'X — The Interview Machine',
  dsa: { topic: 'Full review — 40 problems across the week', problems: 40 },
  title: 'Data Structures, Algorithms and Forty Problems',
  theme: 'Not competitive programming. The specific patterns that appear in Pakistani technical rounds, solved unaided, out loud, under a clock — with forty-seven weeks of Saturday drills already behind you.',
  chapters: [
    'phase-1-programming-foundations/03-data-structures',
    'phase-1-programming-foundations/04-algorithms',
    'phase-10-english-communication/13-job-interview-english-reference',
  ],
  deliverable: 'Forty problems solved unaided across the week, each with a written note on its pattern and complexity, plus a one-page pattern sheet in your own words.',
  milestone: 'ANCHOR approaches — forty problems unaided. Given an unseen medium problem you can name a plausible pattern within two minutes.',
  d: [
    { focus: 'Complexity, said out loud', tasks: [
      ['ENG','dawn','Phase 1 Chapter 3 (Data Structures) — big-O and the cost of every operation on each structure. State the complexity of five functions you wrote in Project 2. Hesitation is the gap.'],
      ['JOB','lunch','Four applications, tailored, logged.'],
    ]},
    { focus: 'Hash maps and strings', tasks: [
      ['ENG','dawn','Phase 1 Chapter 3 — hash maps and sets. Eight problems, unaided, timed, narrated aloud. Most easy and medium problems are a hash map in disguise and recognising that fast is most of the skill.'],
      ['COMM','lunch','Read Phase 10 Chapter 13 (Job Interview English Reference). Practise stating a complexity aloud: "this is O of n, because we pass over the array once."'],
    ]},
    { focus: 'Two pointers and sliding window', tasks: [
      ['ENG','dawn','Phase 1 Chapter 4 (Algorithms) — two pointers and the sliding window. Eight problems, unaided, timed. Write the tell for each pattern in your own words.'],
      ['JOB','lunch','Four applications, tailored, logged.'],
    ]},
    { focus: 'Sorting, searching, trees', tasks: [
      ['ENG','dawn','Phase 1 Chapter 4 — binary search with the boundary conditions right, and tree traversal. Eight problems, unaided, timed. Tree traversal is the highest-frequency recursion question.'],
      ['JOB','lunch','Four applications, tailored, logged.'],
    ]},
    { focus: 'Greedy and simple DP', tasks: [
      ['ENG','dawn','Phase 1 Chapter 4 — greedy, and memoisation. Eight problems, unaided, timed. You are not aiming to be strong at DP; you are aiming not to freeze when one appears.'],
      ['JOB','lunch','Three applications. Fifteen this week.'],
    ]},
    { focus: 'Under the clock, narrated', tasks: [
      ['ENG','dawn','Deep drill, two hours: eight mixed problems, fifteen minutes each, narrated aloud and recorded. Clarify, plan, code, test, state complexity — every time.'],
      ['ENG','mid','Watch one recording back and write three verbal habits to fix. Then write the one-page pattern sheet from memory.'],
      ['REV','late','Weekly review. Count the forty and how many were fully unaided. Compare against week 1. Read next week ahead.'],
    ]},
  ],
},

{
  n: 49, block: 'X — The Interview Machine',
  dsa: { topic: 'Mock-format sets', problems: 6 },
  title: 'System Design, and Mock Loops With Real People',
  theme: 'At three years you are not expected to design a global system. You are expected to reason out loud, ask about scale before designing for it, and justify a cache or a replica. You have built all of it — this week is learning to perform it.',
  chapters: [
    'phase-7-system-design/01-fundamentals',
    'phase-7-system-design/02-scalability',
    'phase-7-system-design/10-designing-twitter',
    'phase-10-english-communication/10-presenting-a-design',
    'phase-10-english-communication/09-interview-under-pressure',
  ],
  deliverable: 'Four designs produced under a clock on one page each, a written script for the first five minutes of any design round, and at least three mock interviews with real people with written feedback.',
  milestone: 'ANCHOR — first mock with a real person on Monday 30 August. Three mocks done by Saturday, feedback written down and acted on.',
  d: [
    { focus: 'ANCHOR — mock 1, and the answer structure', tasks: [
      ['ENG','dawn','MOCK 1 — coding, with a real person. A friend, a peer, a paid interviewer. Live, watched, timed. It will be worse than practising alone and that is the entire reason to do it. Get written feedback.'],
      ['JOB','lunch','Four applications, logged. Then book mocks 2 and 3 for Wednesday and Friday now.'],
    ]},
    { focus: 'The shape of a design answer', tasks: [
      ['ENG','dawn','Phase 7 Chapter 1 (System Design Fundamentals) — requirements, estimates, API, data model, high-level design, bottlenecks, trade-offs. Write the structure on a card and use it every time this week. Then design a URL shortener, forty-five minutes, spoken.'],
      ['COMM','lunch','Read Phase 10 Chapter 10 (Presenting a Design). Practise the first five minutes of a design round aloud — the clarifying questions, not the answer.'],
    ]},
    { focus: 'Mock 2 — system design', tasks: [
      ['ENG','dawn','MOCK 2 — system design with a real person, forty-five minutes. Use the card. Ask about scale before designing for it. Get written feedback.'],
      ['JOB','lunch','Four applications, tailored, logged.'],
    ]},
    { focus: 'Scaling, and a full design', tasks: [
      ['ENG','dawn','Phase 7 Chapter 2 (Scalability) and Chapter 10 (Designing Twitter). Read the chapter, then do it yourself from scratch on paper, spoken, forty-five minutes, and compare afterwards. Everything you built in Blocks V and VII is the vocabulary.'],
      ['JOB','lunch','Four applications, tailored, logged.'],
    ]},
    { focus: 'Mock 3 — behavioural and project deep-dive', tasks: [
      ['ENG','dawn','Prepare six behavioural answers from the last eleven months — a hard bug, a disagreement, a mistake you caused, something learned fast, something shipped, something you would do differently. Then MOCK 3: behavioural plus a deep dive on Project 2, expecting "why did you do it that way" on every decision.'],
      ['JOB','lunch','Three applications. Fifteen this week.'],
    ]},
    { focus: 'Consolidate the feedback', tasks: [
      ['ENG','dawn','Deep drill, two hours: read all three feedback notes together and find the pattern underneath them — there usually is one. Drill that one thing for the full two hours.'],
      ['ENG','mid','Final timed set: three problems narrated, plus one five-minute project presentation, recorded.'],
      ['REV','late','Weekly review. One week left. What is the single thing most likely to cost me an offer, and what am I doing about it on Monday? Read the final week ahead.'],
    ]},
  ],
},

{
  n: 50, block: 'X — The Interview Machine',
  dsa: { topic: 'Final timed sets', problems: 4 },
  title: 'Offers, Negotiation, and the Honest Accounting',
  theme: 'Two jobs this week. Convert whatever is in the pipeline, and decide honestly what happens next — because the plan closing is not the same as the search closing, and the worst outcome is drifting back to where you started.',
  chapters: [
    'phase-11-job-hunt-pakistan/05-the-interview-loop',
    'phase-11-job-hunt-pakistan/06-negotiating-your-offer',
    'phase-10-english-communication/08-the-salary-conversation',
    'phase-11-job-hunt-pakistan/07-the-first-ninety-days',
    'phase-0-mission/06-the-scoreboard',
    'phase-9-software-engineering/04-three-year-developer-interview-guide',
  ],
  deliverable: 'A written final accounting — every number from BASELINE.md then and now, the full application funnel — and a concrete plan for the next eight weeks with dates on it.',
  milestone: 'DEADLINE — the plan closes on Saturday 11 September 2027. The accounting is written, the next eight weeks are planned, and nothing is left vague.',
  d: [
    { focus: 'Know your number before anyone asks', tasks: [
      ['ENG','dawn','Read Phase 11 Chapter 6 (Negotiating Your Offer). Write three numbers down: what you will ask for, what you will accept, and what you will walk away from. Written, before any conversation.'],
      ['JOB','lunch','Four applications, tailored, logged. Keep applying through the final week — the pipeline does not care that your plan is ending.'],
    ]},
    { focus: 'The salary conversation, rehearsed', tasks: [
      ['ENG','dawn','Read Phase 10 Chapter 8 (The Salary Conversation). Rehearse aloud: deflecting the first ask, giving a range with a reason, and the silence after you state a number. That silence is the hardest part and it is practisable.'],
      ['COMM','lunch','Write the counter-offer email you would actually send — polite, specific, with a reason about the role rather than your rent.'],
    ]},
    { focus: 'Push every live conversation', tasks: [
      ['ENG','dawn','Read Phase 9 Chapter 4 (Three-Year Developer Interview Guide) as a checklist against yourself. Then go through APPLICATIONS.md completely: every live conversation gets a next step today. Nothing stays open with no next action.'],
      ['JOB','lunch','Four applications, tailored, logged.'],
    ]},
    { focus: 'The first ninety days, either way', tasks: [
      ['ENG','dawn','Read Phase 11 Chapter 7 (The First Ninety Days). With an offer in hand this is your plan for starting; without one it is your plan for the next role, and reading it now means you will not be improvising later.'],
      ['JOB','lunch','Four applications. Then write the funnel honestly: applications, replies, screens, technical rounds, finals, offers.'],
    ]},
    { focus: 'The scoreboard', tasks: [
      ['ENG','dawn','Read Phase 0 Chapter 6 (The Scoreboard). Write the final accounting in BASELINE.md: every number from week 1 next to the same number today. Unaided problems, services shipped, salary, offers. No commentary — just the numbers.'],
      ['JOB','lunch','Three applications. Fifteen this week. Then update CV, LinkedIn and GitHub one last time.'],
    ]},
    { focus: 'DEADLINE — the close', tasks: [
      ['ENG','dawn','Final review, two hours. Read LOG.md from week 1 forward — all fifty weeks. Then write one page: what changed, what did not, what you were wrong about in September 2026, and what you now know you can do.'],
      ['ENG','mid','Write the next eight weeks with dates. With an offer: what you will learn in the first ninety days and the gap you walk in with. Without one: which part of the funnel is failing and what specifically changes — doing the same thing for eight more weeks is not a plan.'],
      ['REV','late','THE CLOSE. Three backend services live. Forty problems unaided. Node, Nest, TypeScript, Postgres, Mongo, Redis, queues, Docker, Nginx, CI/CD, Jenkins, AWS, Prometheus and a measured RAG service — all of it built, not listed. Fifty weeks held at fourteen hours a week while employed full-time. Whatever today\'s offer situation is, the engineer reading this is not the one who wrote BASELINE.md. Write that down, then put the next eight weeks in your calendar.'],
    ]},
  ],
},

];

/**
 * ROUTINE — the whole day around the plan's study slots: prayers, Quran,
 * office, gym, park, sleep. Shown in the app's Plan tab under each day's
 * tasks. Full reasoning in Phase 0 Chapter 7 (The Whole Day).
 * kind: study | faith | health | work | life | sleep
 * The study rows must match SLOTS above.
 */
const ROUTINE = {
  weekday: [
    { time: '04:40',       kind: 'faith',  what: 'Wake · wudu · Fajr', note: 'Nov–Feb: Fajr starts after 05:00 — pray at 06:30' },
    { time: '05:00–06:30', kind: 'study',  what: 'Deep Work — today\'s plan task' },
    { time: '06:30–06:50', kind: 'faith',  what: 'Quran — recitation with translation' },
    { time: '06:50–07:45', kind: 'life',   what: 'Shower · protein breakfast · dress' },
    { time: '07:45–19:00', kind: 'work',   what: 'Office and travel', note: 'Dhuhr, Asr (and Maghrib in winter) at the office · audio, not feeds, on the commute' },
    { time: '13:00–13:30', kind: 'study',  what: 'Job / English — today\'s lunch task', note: 'Dhuhr and lunch in the rest of the break' },
    { time: '19:00–20:00', kind: 'health', what: 'Gym', note: 'Mon push · Tue legs · Wed pull · Thu legs + core · Fri full body · pray Maghrib first if it is in' },
    { time: '20:20',       kind: 'faith',  what: 'Home · shower · Isha' },
    { time: '20:30–21:00', kind: 'life',   what: 'Dinner — protein and vegetables' },
    { time: '21:00–21:20', kind: 'life',   what: 'Family time — no screens' },
    { time: '21:20–21:35', kind: 'life',   what: 'Tomorrow ready · 5-min muhasaba · phone out of the bedroom' },
    { time: '21:45',       kind: 'sleep',  what: 'Sleep' },
  ],
  saturday: [
    { time: '05:00',       kind: 'faith',  what: 'Wake · Fajr' },
    { time: '05:20–05:45', kind: 'faith',  what: 'Quran' },
    { time: '06:00–07:15', kind: 'health', what: 'Park — brisk walk, easy jog, stretching' },
    { time: '08:00–13:00', kind: 'study',  what: 'Deep Build · DSA Drill · Review + Apply — today\'s plan tasks' },
    { time: '13:00',       kind: 'faith',  what: 'Dhuhr · lunch · short nap' },
    { time: 'Afternoon',   kind: 'life',   what: 'Errands, barber, groceries, prepare the week' },
    { time: '17:00–18:00', kind: 'life',   what: 'Money and business hour' },
    { time: 'Evening',     kind: 'life',   what: 'Family, friends · 2 episodes max, chosen in advance' },
    { time: '22:00',       kind: 'sleep',  what: 'Sleep' },
  ],
  sunday: [
    { time: '05:00',       kind: 'faith',  what: 'Wake · Fajr' },
    { time: '05:20–06:00', kind: 'faith',  what: 'Quran with tafsir — the long session' },
    { time: '06:15–07:45', kind: 'health', what: 'Long park session — walk, jog or intervals, bodyweight, mobility' },
    { time: '12:00–12:50', kind: 'life',   what: 'Weekly planning + money review' },
    { time: 'Afternoon',   kind: 'life',   what: 'Rest, family, relatives, friends' },
    { time: 'Evening',     kind: 'life',   what: 'Prepare the week — clothes, gym bag, meals' },
    { time: '21:45',       kind: 'sleep',  what: 'Sleep — Monday starts at 04:40' },
  ],
};

module.exports = { TRACKS, SLOTS, ANCHORS, APPLY_QUOTA, CORE, WEEKS, ROUTINE };
