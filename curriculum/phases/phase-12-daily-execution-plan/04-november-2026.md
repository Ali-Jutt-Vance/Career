# Phase 12 — Chapter 4: November 2026

> **30 days · Day 38 to Day 67 · 58 scheduled hours · 5 rest days**

## Chapter Overview

This chapter covers weeks 5, 6, 7, 8, 9, 10 of the fifty-week plan. Every day below is a contract with yourself. Tick the tasks in the reader's **Plan** tab as you finish them — the app tracks your streak and completion rate across all 353 days.

| Week | Dates | Hours | Apps | DSA | Focus | Milestone |
|---|---|---|---|---|---|---|
| **W5** | 01 Nov – 01 Nov | 14h | 3 | Two pointers | Git Properly, and the First Applications | Three applications out. You can explain the difference between merge and rebase, and what git reset --hard actually destroys, without looking it up. |
| **W6** | 02 Nov – 08 Nov | 14h | 3 | Two pointers — sorted arrays | OOP and SOLID — The Shape NestJS Assumes | You can explain dependency inversion with an example from your own code, and you have written a DI container yourself — so Nest's providers will be obvious rather than magical. |
| **W7** | 09 Nov – 15 Nov | 14h | 3 | Sliding window — fixed size | TypeScript for Backend Engineers | BLOCK I CLOSES. You can type a function, an object and a generic without help, you know what strict mode turns on, and you can explain what a decorator is at runtime. |
| **W8** | 16 Nov – 22 Nov | 14h | 3 | Sliding window — variable size | The Node Runtime — Modules, npm, Process | You can explain module resolution, the difference between CommonJS and ESM, and what an unhandled rejection does to a Node process. |
| **W9** | 23 Nov – 29 Nov | 14h | 3 | Strings — parsing & building | Node Internals — Event Loop Phases, Streams, Buffers | You can name the event loop phases in order, explain what runs in the thread pool and what does not, and demonstrate backpressure with code you wrote. |
| **W10** | 30 Nov – 30 Nov | 14h | 3 | Strings — anagrams & palindromes | Express — Routing, Middleware, the Request Lifecycle | You can draw the path of a request through an Express app from memory, including where errors go and why middleware order is not cosmetic. |

---

## Week 5 — Git Properly, and the First Applications

*Block I — Foundations · 14 hours*

Applications open — three a week, every one tailored. Three is deliberately small: at this stage each application is a test of the CV, not a lottery ticket. The engineering half is Git, which you have used for three years and do not actually understand.

**Chapters this week:**

- [Git](#phase-1-programming-foundations--git)
- [Github](#phase-1-programming-foundations--github)
- [Applying Without Wasting Shots](#phase-11-job-hunt-pakistan--applying-without-wasting-shots)

**Deliverable:** Three tailored applications logged in APPLICATIONS.md, and a practice repository where you have created and resolved a merge conflict, rebased a branch, and recovered a lost commit from the reflog.

**Milestone:** Three applications out. You can explain the difference between merge and rebase, and what git reset --hard actually destroys, without looking it up.

**Applications this week:** 3

**DSA drill:** Two pointers — 4 problems

### Day 38 — Sunday 1 November 2026 · REST

No tasks. Sunday is a genuine day off and it is part of the plan, not a gap in it. Rest is what makes fourteen hours a week survivable for fifty straight weeks.

## Week 6 — OOP and SOLID — The Shape NestJS Assumes

*Block I — Foundations · 14 hours*

NestJS is an opinionated object-oriented framework built on dependency injection. If classes, interfaces and inversion of control are vague to you, Nest will feel like magic and you will never debug it confidently. This week removes the magic before you meet it.

**Chapters this week:**

- [Oop](#phase-1-programming-foundations--oop)
- [Solid Principles](#phase-1-programming-foundations--solid-principles)
- [The Pakistani Market](#phase-11-job-hunt-pakistan--the-pakistani-market)

**Deliverable:** week-06/ containing a small library system modelled in classes, refactored so the storage mechanism can be swapped without touching business logic, plus your own hand-written dependency-injection container in about thirty lines.

**Milestone:** You can explain dependency inversion with an example from your own code, and you have written a DI container yourself — so Nest's providers will be obvious rather than magical.

**Applications this week:** 3

**DSA drill:** Two pointers — sorted arrays — 3 problems

### Day 39 — Monday 2 November 2026

**Classes, inheritance, composition**

| Time | Track | Task |
|---|---|---|
| `05:00–06:30` | **Engineering** | Phase 1 Chapter 5 (OOP) — classes, constructors, inheritance, and why composition usually beats inheritance. No AI: model a small library system in classes from a blank file. |
| `13:00–13:30` | **Job Hunt** | Read Phase 11 Chapter 1 (The Pakistani Market). In TARGETS.md, mark which tier each of your fifteen companies sits in and the realistic band. |

*Total: 2h 0m*

### Day 40 — Tuesday 3 November 2026

**Encapsulation, interfaces, polymorphism**

| Time | Track | Task |
|---|---|---|
| `05:00–06:30` | **Engineering** | Phase 1 Chapter 5 — encapsulation, polymorphism, abstract types. Refactor yesterday's library so the storage mechanism can be swapped without touching business logic. That refactor is the whole lesson. |
| `13:00–13:30` | **Job Hunt** | One application, tailored, logged. |

*Total: 2h 0m*

### Day 41 — Wednesday 4 November 2026

**Single responsibility and open/closed**

| Time | Track | Task |
|---|---|---|
| `05:00–06:30` | **Engineering** | Phase 1 Chapter 9 (SOLID) — single responsibility and open/closed. Find the fattest class in your library system and split it. Then add a new storage type without modifying any existing file. |
| `13:00–13:30` | **Communication** | Write a two-minute spoken answer to "how do you decide when to split a class?" using your own refactor as the example. |

*Total: 2h 0m*

### Day 42 — Thursday 5 November 2026

**Dependency inversion — the one that matters for Nest**

| Time | Track | Task |
|---|---|---|
| `05:00–06:30` | **Engineering** | Phase 1 Chapter 9 — dependency inversion. Stop your classes constructing their own dependencies; pass them in. Then, no AI: write a thirty-line container that registers classes by token and resolves their constructor dependencies for you. You have just written the core of Nest. |
| `13:00–13:30` | **Job Hunt** | Second application, tailored, logged. |

*Total: 2h 0m*

### Day 43 — Friday 6 November 2026

**Liskov and interface segregation, briefly**

| Time | Track | Task |
|---|---|---|
| `05:00–06:30` | **Engineering** | Phase 1 Chapter 9 — the remaining two principles. These matter least day to day and are still asked. One worked example each, from your own code, in LOG.md. |
| `13:00–13:30` | **Communication** | Third application. Then rehearse: "tell me about a refactor you did and why." |

*Total: 2h 0m*

### Day 44 — Saturday 7 November 2026

**Build with your own DI container**

| Time | Track | Task |
|---|---|---|
| `08:00–10:00` | **Engineering** | Deep build, two hours, no AI: rebuild the expense tracker from week 3 on your own DI container — a service, a repository interface, two storage implementations, wired by token. When Nest does this for you in week 23, you will know exactly what it is doing. |
| `10:30–11:30` | **Engineering** | Drill: three LeetCode problems, timed. Then explain dependency injection aloud in ninety seconds without using the word "framework". |
| `12:00–13:00` | **Review** | Weekly review. Read next week ahead. |

*Total: 4h 0m*

### Day 45 — Sunday 8 November 2026 · REST

No tasks. Sunday is a genuine day off and it is part of the plan, not a gap in it. Rest is what makes fourteen hours a week survivable for fifty straight weeks.

## Week 7 — TypeScript for Backend Engineers

*Block I — Foundations · 14 hours*

TypeScript is not optional at the tier you are targeting, and NestJS is built on its decorators and metadata. This week is types that carry weight — generics, narrowing, and the compiler settings that actually catch bugs — plus the decorator mechanics Nest depends on.

**Chapters this week:**

- [Typescript](#phase-1-programming-foundations--typescript)
- [Functional Programming](#phase-1-programming-foundations--functional-programming)

**Deliverable:** The expense tracker ported to strict TypeScript with no any, plus a worked file demonstrating decorators and metadata reflection from first principles.

**Milestone:** BLOCK I CLOSES. You can type a function, an object and a generic without help, you know what strict mode turns on, and you can explain what a decorator is at runtime.

**Applications this week:** 3

**DSA drill:** Sliding window — fixed size — 3 problems

### Day 46 — Monday 9 November 2026

**Types, interfaces, unions**

| Time | Track | Task |
|---|---|---|
| `05:00–06:30` | **Engineering** | Phase 1 Chapter 2 (TypeScript) — basic types, interfaces, type aliases, unions. Set up a project from scratch by hand, no starter template. Read every line of the tsconfig you wrote and know what it does. |
| `13:00–13:30` | **Job Hunt** | One application, tailored, logged. |

*Total: 2h 0m*

### Day 47 — Tuesday 10 November 2026

**Strict mode, and what it catches**

| Time | Track | Task |
|---|---|---|
| `05:00–06:30` | **Engineering** | Turn on strict, strictNullChecks and noImplicitAny. Fix every error the compiler finds instead of silencing it. Write in LOG.md the three real bugs it caught that you would have shipped. |
| `13:00–13:30` | **Communication** | Write a four-sentence answer to "What is TypeScript for?" that does not say "it adds types". Say what problem it removes. |

*Total: 2h 0m*

### Day 48 — Wednesday 11 November 2026

**Generics and narrowing**

| Time | Track | Task |
|---|---|---|
| `05:00–06:30` | **Engineering** | Phase 1 Chapter 2 — generics and narrowing. No AI: write a typed result wrapper (ok/error) and a typed fetch helper. Ban the word any and feel where it hurts. |
| `13:00–13:30` | **Job Hunt** | Second application, tailored, logged. |

*Total: 2h 0m*

### Day 49 — Thursday 12 November 2026

**Decorators and metadata — the Nest prerequisite**

| Time | Track | Task |
|---|---|---|
| `05:00–06:30` | **Engineering** | Phase 1 Chapter 2 — decorators. Turn on experimentalDecorators and emitDecoratorMetadata. No AI: write a class decorator, a method decorator and a parameter decorator, and print what each receives. Then use reflect-metadata to read a constructor parameter's type at runtime. That single trick is how Nest injects. |
| `13:00–13:30` | **Communication** | Third application. Then rehearse: "how comfortable are you with TypeScript?" Answer with what you built this week, not a rating. |

*Total: 2h 0m*

### Day 50 — Friday 13 November 2026

**Functional habits that keep services testable**

| Time | Track | Task |
|---|---|---|
| `05:00–06:30` | **Engineering** | Phase 1 Chapter 6 (Functional Programming) — pure functions, immutability, side effects at the edges. Pull the pure logic out of one of your services so it can be tested without mocks. This habit is what makes week 27 easy. |
| `13:00–13:30` | **Job Hunt** | Update the CV: TypeScript goes on it now, because you can defend it. |

*Total: 2h 0m*

### Day 51 — Saturday 14 November 2026

**BLOCK I REVIEW**

| Time | Track | Task |
|---|---|---|
| `08:00–10:00` | **Engineering** | Deep build, two hours, no AI: port the expense tracker to strict TypeScript, typed end to end, on your own DI container. Seven weeks of foundations in one piece of code. |
| `10:30–11:30` | **Engineering** | Block drill: five LeetCode Easy, timed, no help. Compare directly against your week-1 baseline and write both numbers in BASELINE.md. |
| `12:00–13:00` | **Review** | BLOCK I REVIEW. Honestly: did the dawn block hold for seven weeks? Did the no-AI rule hold? Unaided problem count now versus week 1? Then read Block II ahead — Node starts. |

*Total: 4h 0m*

### Day 52 — Sunday 15 November 2026 · REST

No tasks. Sunday is a genuine day off and it is part of the plan, not a gap in it. Rest is what makes fourteen hours a week survivable for fifty straight weeks.

## Week 8 — The Node Runtime — Modules, npm, Process

*Block II — Node and Express · 14 hours*

You have written server code for three years without knowing what the runtime does. This week is modules, resolution, the standard library and the process itself — the ground everything else stands on.

**Chapters this week:**

- [Nodejs](#phase-2-backend-engineering--nodejs)
- [Explaining Technical Work](#phase-10-english-communication--explaining-technical-work)

**Deliverable:** week-08/ containing a three-module project built by hand in both CommonJS and ESM, a directory-walker using fs and path correctly, and a script that fails properly with a non-zero exit code.

**Milestone:** You can explain module resolution, the difference between CommonJS and ESM, and what an unhandled rejection does to a Node process.

**Applications this week:** 3

**DSA drill:** Sliding window — variable size — 4 problems

### Day 53 — Monday 16 November 2026

**Modules and resolution**

| Time | Track | Task |
|---|---|---|
| `05:00–06:30` | **Engineering** | Phase 2 Chapter 1 (Node.js) — modules. CommonJS versus ESM, how require actually resolves a path, what each package.json field means. No AI: build a three-module project by hand, both ways, and note what breaks when you mix them. |
| `13:00–13:30` | **Job Hunt** | One application, tailored, logged. |

*Total: 2h 0m*

### Day 54 — Tuesday 17 November 2026

**npm, versions, and the lockfile**

| Time | Track | Task |
|---|---|---|
| `05:00–06:30` | **Engineering** | Phase 2 Chapter 1 — npm. Semver ranges, the lockfile, dependencies versus devDependencies versus peerDependencies, and what npm ci does differently from npm install. Then read your own lockfile and find one transitive dependency you did not know you had. |
| `13:00–13:30` | **Communication** | Read Phase 10 Chapter 2 (Explaining Technical Work). Explain module resolution aloud, in two minutes, to an imaginary non-engineer. Record it. |

*Total: 2h 0m*

### Day 55 — Wednesday 18 November 2026

**The standard library you never opened**

| Time | Track | Task |
|---|---|---|
| `05:00–06:30` | **Engineering** | Phase 2 Chapter 1 — fs, path, os, crypto, events. No AI: write a directory-walker that reports total size by file extension. Use path correctly so it works on Windows and Linux. Then use crypto to hash each file and find duplicates. |
| `13:00–13:30` | **Job Hunt** | Second application, tailored, logged. |

*Total: 2h 0m*

### Day 56 — Thursday 19 November 2026

**EventEmitter, and the pattern Node is built on**

| Time | Track | Task |
|---|---|---|
| `05:00–06:30` | **Engineering** | Phase 2 Chapter 1 — events. No AI: write your own EventEmitter from a blank file — on, once, emit, off, and correct behaviour when a listener throws. Then read how streams use it. |
| `13:00–13:30` | **Communication** | Third application. Then write five sentences on why Node chose an event-driven model, in the register you would use in an interview. |

*Total: 2h 0m*

### Day 57 — Friday 20 November 2026

**Process, environment, and dying correctly**

| Time | Track | Task |
|---|---|---|
| `05:00–06:30` | **Engineering** | Phase 2 Chapter 1 — process, environment variables, exit codes, uncaught exceptions and unhandled rejections. No AI: write a script that fails properly — non-zero exit, useful message, nothing swallowed. Then make it handle SIGTERM and shut down cleanly. |
| `13:00–13:30` | **Job Hunt** | Update the CV with Node — not as a bullet point but as a sentence about what you built with it this week. |

*Total: 2h 0m*

### Day 58 — Saturday 21 November 2026

**Build the CLI**

| Time | Track | Task |
|---|---|---|
| `08:00–10:00` | **Engineering** | Deep build, two hours, no AI: a file-processing CLI — read a large CSV, filter rows by a flag, aggregate a column, write a report. Flags parsed by hand, no library. Correct exit codes. |
| `10:30–11:30` | **Engineering** | Drill: three LeetCode Easy and one Medium, timed, no help. String problems. |
| `12:00–13:00` | **Review** | Weekly review. Read next week ahead. |

*Total: 4h 0m*

### Day 59 — Sunday 22 November 2026 · REST

No tasks. Sunday is a genuine day off and it is part of the plan, not a gap in it. Rest is what makes fourteen hours a week survivable for fifty straight weeks.

## Week 9 — Node Internals — Event Loop Phases, Streams, Buffers

*Block II — Node and Express · 14 hours*

The week that separates you from every other candidate who says "Node is non-blocking" and cannot go further. Libuv phases, the thread pool, streams and backpressure, and what a Buffer actually is.

**Chapters this week:**

- [Nodejs](#phase-2-backend-engineering--nodejs)
- [Asynchronous Programming](#phase-1-programming-foundations--asynchronous-programming)

**Deliverable:** week-09/ containing a measured demonstration of a blocked event loop, a stream pipeline that processes a file larger than memory, and a written explanation of backpressure in your own words.

**Milestone:** You can name the event loop phases in order, explain what runs in the thread pool and what does not, and demonstrate backpressure with code you wrote.

**Applications this week:** 3

**DSA drill:** Strings — parsing & building — 3 problems

### Day 60 — Monday 23 November 2026

**The phases, in order**

| Time | Track | Task |
|---|---|---|
| `05:00–06:30` | **Engineering** | Phase 2 Chapter 1 — the event loop phases: timers, pending callbacks, poll, check, close. Then process.nextTick versus setImmediate versus setTimeout(0). Predict the ordering of a five-line script before running it, and keep predicting until you are right first time. |
| `13:00–13:30` | **Job Hunt** | One application, tailored, logged. |

*Total: 2h 0m*

### Day 61 — Tuesday 24 November 2026

**Blocking, measured**

| Time | Track | Task |
|---|---|---|
| `05:00–06:30` | **Engineering** | No AI: write a script that blocks the loop with a synchronous loop and measure the delay it introduces into a timer. Then do the same with a synchronous fs call and with JSON.parse on a huge string. Write the three numbers down — those numbers are an interview answer. |
| `13:00–13:30` | **Communication** | Write a ninety-second spoken answer to "what does it mean that Node is single-threaded?" that is accurate, including the part where it is not. |

*Total: 2h 0m*

### Day 62 — Wednesday 25 November 2026

**The thread pool**

| Time | Track | Task |
|---|---|---|
| `05:00–06:30` | **Engineering** | Phase 2 Chapter 1 — libuv's thread pool. Which operations use it (fs, dns, crypto, zlib) and which do not (network I/O). Change UV_THREADPOOL_SIZE and measure the difference on four parallel crypto operations. Most candidates have never done this. |
| `13:00–13:30` | **Job Hunt** | Second application, tailored, logged. |

*Total: 2h 0m*

### Day 63 — Thursday 26 November 2026

**Streams and backpressure**

| Time | Track | Task |
|---|---|---|
| `05:00–06:30` | **Engineering** | Phase 2 Chapter 1 — streams. Readable, writable, duplex, transform. No AI: read a large CSV line by line and write a filtered version out without loading the file into memory. Then remove the pipe, write manually, ignore the return value of write(), and watch memory climb. That is backpressure. |
| `13:00–13:30` | **Communication** | Third application. Then explain backpressure aloud in two minutes using what you just watched happen. |

*Total: 2h 0m*

### Day 64 — Friday 27 November 2026

**Buffers and binary**

| Time | Track | Task |
|---|---|---|
| `05:00–06:30` | **Engineering** | Phase 2 Chapter 1 — Buffer and binary data. Encodings, why a Buffer is not a string, and what happens when you slice one. No AI: parse a small binary file format by hand — read a header, seek, read records. |
| `13:00–13:30` | **Job Hunt** | Update the CV bullet for Node with something specific from this week — streams, or the thread pool measurement. |

*Total: 2h 0m*

### Day 65 — Saturday 28 November 2026

**A transform pipeline**

| Time | Track | Task |
|---|---|---|
| `08:00–10:00` | **Engineering** | Deep build, two hours, no AI: a three-stage stream pipeline — read, transform, write — with a custom Transform stream you wrote, correct error propagation, and a progress report. Run it on a file larger than your available memory. |
| `10:30–11:30` | **Engineering** | Drill: three problems, timed. Then explain the event loop phases aloud from memory, in order. |
| `12:00–13:00` | **Review** | Weekly review. Read next week ahead. |

*Total: 4h 0m*

### Day 66 — Sunday 29 November 2026 · REST

No tasks. Sunday is a genuine day off and it is part of the plan, not a gap in it. Rest is what makes fourteen hours a week survivable for fifty straight weeks.

## Week 10 — Express — Routing, Middleware, the Request Lifecycle

*Block II — Node and Express · 14 hours*

Express is small enough to understand completely, and understanding it completely is what lets you answer the most common backend interview question at this level: what happens between the request arriving and the response leaving.

**Chapters this week:**

- [Expressjs](#phase-2-backend-engineering--expressjs)
- [Agile Scrum](#phase-9-software-engineering--agile-scrum)
- [Projects That Prove Three Years](#phase-11-job-hunt-pakistan--projects-that-prove-three-years)

**Deliverable:** week-10/ containing an Express server with a hand-written middleware stack — request id, logging, timing, body limit, auth check, central error handler — every one written by you, and a diagram of the request lifecycle drawn by you.

**Milestone:** You can draw the path of a request through an Express app from memory, including where errors go and why middleware order is not cosmetic.

**Applications this week:** 3

**DSA drill:** Strings — anagrams & palindromes — 3 problems

### Day 67 — Monday 30 November 2026

**Routing and the Router**

| Time | Track | Task |
|---|---|---|
| `05:00–06:30` | **Engineering** | Phase 2 Chapter 2 (Express.js) — routing, route parameters, query strings, the Router. No AI: build a server with six routes and a mounted router from a blank file. No generator, no template. |
| `13:00–13:30` | **Job Hunt** | One application, tailored, logged. |

*Total: 2h 0m*

