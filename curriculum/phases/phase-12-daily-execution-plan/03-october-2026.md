# Phase 12 — Chapter 3: October 2026

> **31 days · Day 11 to Day 41 · 119 scheduled hours · 1 rest days**

## Chapter Overview

This chapter covers weeks 2, 3, 4, 5, 6 of the 27-week plan. Every day below is a contract with yourself. Tick the tasks in the reader's **Plan** tab as you finish them — the app tracks your streak and completion rate across all 188 days.

| Week | Dates | Hours | Apps | DSA | Focus | Milestone |
|---|---|---|---|---|---|---|
| **W2** | 01 Oct – 04 Oct | 14h | – | Arrays & hashing | Scope, Closures, and the this Keyword | You can define a closure out loud, unaided, in one sentence, and produce a working example from a blank file in under five minutes. |
| **W3** | 05 Oct – 11 Oct | 26h | – | Arrays & hashing | Arrays, Objects, and Reading Errors Like an Engineer | You can use reduce correctly from memory, and you can set a breakpoint, step into a call, and read the call stack without looking anything up. |
| **W4** | 12 Oct – 18 Oct | 30h | 3 | Hash maps — frequency & lookup → Two pointers | The Event Loop, Promises, and the Paperwork Gate + Git Properly, and the First Applications | GATE — CV, LinkedIn and GitHub finished by Saturday 17 October. Not "nearly". A stranger can find you, read one page, and know what you do. And you can explain the event loop out loud in ninety seconds. · AND: Three applications out. You can explain the difference between merge and rebase, and what git reset --hard actually destroys, without looking it up. |
| **W5** | 19 Oct – 25 Oct | 30h | 6 | Two pointers — sorted arrays → Sliding window — fixed size | OOP and SOLID — The Shape NestJS Assumes + TypeScript for Backend Engineers | You can explain dependency inversion with an example from your own code, and you have written a DI container yourself — so Nest's providers will be obvious rather than magical. · AND: BLOCK I CLOSES. You can type a function, an object and a generic without help, you know what strict mode turns on, and you can explain what a decorator is at runtime. |
| **W6** | 26 Oct – 31 Oct | 30h | 6 | Sliding window — variable size → Strings — parsing & building | The Node Runtime — Modules, npm, Process + Node Internals — Event Loop Phases, Streams, Buffers | You can explain module resolution, the difference between CommonJS and ESM, and what an unhandled rejection does to a Node process. · AND: You can name the event loop phases in order, explain what runs in the thread pool and what does not, and demonstrate backpressure with code you wrote. |

---

## Week 2 — Scope, Closures, and the this Keyword

*Block I — Foundations · 14 hours*

Closures are the most common intermediate JavaScript interview question, and "this" is the one people three years in still get wrong. Both are the same idea: a function carries context with it. Get this week right and a whole category of questions stops being frightening.

**Chapters this week:**

- [Javascript](#phase-1-programming-foundations--javascript)
- [Beginner To Mastery Path](#phase-0-mission--beginner-to-mastery-path)
- [The Operating System](#phase-0-mission--the-operating-system)

**Deliverable:** week-02/ containing a counter factory, a private-variable module, a memoisation wrapper, and a written explanation of the var-in-a-loop problem in your own words.

**Milestone:** You can define a closure out loud, unaided, in one sentence, and produce a working example from a blank file in under five minutes.

**DSA drill:** Arrays & hashing — 3 problems

### Day 11 — Thursday 1 October 2026

**The var-in-a-loop problem**

| Time | Track | Task |
|---|---|---|
| `05:00–06:30` | **Engineering** | No AI: loop over an array with var inside a setTimeout and explain in LOG.md why it prints what it prints. Then fix it three ways — let, an IIFE, a bound argument — and explain why each works. |
| `13:00–13:30` | **Communication** | Read Phase 0 Chapter 5 (The Operating System). Write one paragraph on which current habit this plan asks you to break, and which one you expect to fail at first. |

*Total: 2h 0m*

### Day 12 — Friday 2 October 2026

**this, call, apply, bind**

| Time | Track | Task |
|---|---|---|
| `05:00–06:30` | **Engineering** | Phase 1 Chapter 1 — the "this" sections. Learn the four binding rules and why arrow functions have no this of their own. No AI: write one example of each rule and predict the output before running. |
| `13:00–13:30` | **Job Hunt** | Rewrite the remaining CV bullets in the achievement format. Content first, design later. |

*Total: 2h 0m*

### Day 13 — Saturday 3 October 2026

**Build something with closures in it**

| Time | Track | Task |
|---|---|---|
| `08:00–10:00` | **Engineering** | Deep build, two hours, no AI: extend the contact book with an undo stack and a simple event system (on/emit). Both are closure exercises wearing a coat. No packages. |
| `10:30–11:30` | **Engineering** | Drill: three LeetCode Easy, timed, no help. Then explain one solution out loud in English as if to an interviewer. Record it. |
| `12:00–13:00` | **Review** | Weekly review. Did the dawn block hold five days out of five? Where did it slip, and what caused the slip? Read next week ahead. |

*Total: 4h 0m*

### Day 14 — Sunday 4 October 2026 · REST

No tasks. Sunday is a genuine day off and it is part of the plan, not a gap in it. Rest is what makes fourteen hours a week survivable for fifty straight weeks.

## Week 3 — Arrays, Objects, and Reading Errors Like an Engineer

*Block I — Foundations · 26 hours*

The array and object methods that appear in nearly every screening test, and the debugger — because the fastest way to look like a three-year engineer is to read a stack trace correctly instead of guessing.

**Chapters this week:**

- [Javascript](#phase-1-programming-foundations--javascript)
- [Clean Code](#phase-1-programming-foundations--clean-code)
- [Speaking About Your Work](#phase-10-english-communication--speaking-about-your-work)

**Deliverable:** week-03/ containing an order-analysis script built with map/filter/reduce, and a written record of four bugs you introduced deliberately and fixed using only the debugger.

**Milestone:** You can use reduce correctly from memory, and you can set a breakpoint, step into a call, and read the call stack without looking anything up.

**DSA drill:** Arrays & hashing — 4 problems

### Day 15 — Monday 5 October 2026

**map, filter, reduce**

| Time | Track | Task |
|---|---|---|
| `05:00–06:30` | **Engineering** | Phase 1 Chapter 1 — array methods. Write each of map, filter and reduce yourself from scratch as a plain function before using the built-in. That is the exercise that makes reduce stop being scary. |
| `13:00–13:30` | **Job Hunt** | Read Phase 11 Chapter 2 (The CV That Gets Read), first half. Note every rule your current CV breaks. |

*Total: 2h 0m*

### Day 16 — Tuesday 6 October 2026

**Destructuring, spread, and object shapes**

| Time | Track | Task |
|---|---|---|
| `05:00–06:30` | **Engineering** | Phase 1 Chapter 1 — objects, destructuring, spread. No AI: write five functions that pull values cleanly out of a deeply nested object. Learn what optional chaining actually protects you from. |
| `13:00–13:30` | **Communication** | Phase 10 Chapter 1 — finish it. Rewrite your four-sentence "what do you do" answer using what the chapter says about concrete detail. |

*Total: 2h 0m*

### Day 17 — Wednesday 7 October 2026

**The order-analysis exercise · The debugger**

| Time | Track | Task |
|---|---|---|
| `After Fajr + Quran` | **Engineering** | No AI: from twenty fake order objects produce total revenue, revenue per customer, the top three customers, and a lookup map keyed by id. Use reduce at least twice. Commit it. |
| `10:00–11:00 + 16:00–16:30` | **Engineering** | Phase 1 Chapter 1 — the "Debugging" section. Breakpoints, step over versus step into, the call stack. Practise on yesterday's order script until you stop using console.log as your only tool. |
| `16:30–17:00` | **Job Hunt** | Rewrite your CV summary — three lines, no clichés, naming your stack and your years. Delete every "passionate", "hardworking" and "team player". |
| `21:30–22:00` | **Communication** | Write a five-sentence explanation of what a stack trace is, aimed at a junior. Read it aloud. If you cannot explain it simply, you have not learned it. |

*Total: 4h 0m*

### Day 18 — Thursday 8 October 2026

**Break it on purpose, fix it with the debugger · The event loop — why JavaScript does not block**

| Time | Track | Task |
|---|---|---|
| `After Fajr + Quran` | **Engineering** | No AI: break the order script four ways — undefined property, wrong type, off-by-one, async result used too early — and fix each using only the debugger and the stack trace. Write what each error message actually told you. |
| `10:00–11:00 + 16:00–16:30` | **Engineering** | Phase 1 Chapter 7 (Asynchronous Programming) — the event loop. Call stack, task queue, microtask queue. Draw it on paper. Then predict the output of five setTimeout/Promise ordering puzzles before running them. |
| `16:30–17:00` | **Job Hunt** | Read Phase 1 Chapter 10 (Clean Code) — naming and function length only. Rename every variable in this week's code you would be embarrassed to explain in a review. |
| `21:30–22:00` | **Communication** | English speaking session with Claude: explain today's engineering work out loud as if to an interviewer, then answer two follow-up questions. Fix every grammar point it raises. |

*Total: 4h 0m*

### Day 19 — Friday 9 October 2026

**Callbacks, and why they became a problem · Promises from the inside**

| Time | Track | Task |
|---|---|---|
| `After Fajr + Quran` | **Engineering** | Phase 1 Chapter 7 — callbacks and the error-first convention. No AI: write a three-level nested callback chain, feel it, then write down exactly what is unpleasant about it. You need to have felt this to explain why promises exist. |
| `10:00–11:00 + 16:00–16:30` | **Engineering** | Phase 1 Chapter 7 — promises. Then, no AI: write your own tiny promise-like class with then and catch. It will not be spec-compliant and that is fine. Building it is what makes .then() stop being magic. |
| `16:30–17:00` | **Job Hunt** | CV gate polish: improve one of CV, LinkedIn or the GitHub profile README — one concrete fix, then commit or save it. |
| `21:30–22:00` | **Communication** | English speaking session with Claude: explain today's engineering work out loud as if to an interviewer, then answer two follow-up questions. Fix every grammar point it raises. |

*Total: 4h 0m*

### Day 20 — Saturday 10 October 2026

**Consolidate the language weeks**

| Time | Track | Task |
|---|---|---|
| `10:00–12:00` | **Engineering** | Deep build, two hours, no AI: a small expense tracker in plain Node — add, list by category, monthly totals, biggest category, JSON storage. Use the array methods deliberately, not accidentally. |
| `12:30–13:30` | **Engineering** | Drill: four LeetCode Easy, timed, no help. Array-heavy ones. Compare the count against week 1. |
| `14:00–15:00` | **Review** | Weekly review. Name the three JavaScript ideas you now hold that you did not three weeks ago, and the one you are still faking. Read next week ahead. |
| `15:30–16:00` | **Job Hunt** | Phase 11 Chapter 2 — finish it. Then build CV draft one: one page, standard headings, no columns, no photo, no skill bars. Structure only this pass. |
| `16:00–16:30` | **Job Hunt** | CV pass two: every bullet starts with a verb, every bullet says what changed. Cut anything you could not defend for sixty seconds. One page, hard limit. |

*Total: 5h 0m*

### Day 21 — Sunday 11 October 2026

**Catch-up day — clear weeks 1–3 before the new timetable starts**

| Time | Track | Task |
|---|---|---|
| `10:00–12:00` | **Engineering** | Catch-up build: open weeks 1–3 in the Plan and do every unticked dawn task in order — the backend-mastery repo, the coding baseline, coercion, closures, the contact book. Tick each as you finish. No AI writes code. |
| `12:30–13:30` | **Engineering** | DSA catch-up: arrays & hashing — four LeetCode Easy, timed, no help. Explain one solution out loud in English. |
| `14:00–15:00` | **Review** | Weekly review in LOG.md: what got done in weeks 1–3, what did not, and why. Then read the new timetable — dawn block after Fajr and Quran, office study 10–11 and 4–5, English at 21:30 — and set every alarm in the Personal OS app. |
| `15:30–16:30` | **Job Hunt** | CV gate push: CV, LinkedIn headline and About, GitHub profile README. The CV gate is Saturday 17 October — finish the drafts today so the week only needs polish. |

*Total: 5h 0m*

## Week 4 — The Event Loop, Promises, and the Paperwork Gate + Git Properly, and the First Applications

*Block I — Foundations · 30 hours*

Async is where self-taught confidence collapses, and it is asked in every backend interview you will sit. In parallel the paperwork has to finish this week, because applications open on Monday and a gate that slips is a gate that never closes.

Applications open — three a week, every one tailored. Three is deliberately small: at this stage each application is a test of the CV, not a lottery ticket. The engineering half is Git, which you have used for three years and do not actually understand.

**Chapters this week:**

- [Asynchronous Programming](#phase-1-programming-foundations--asynchronous-programming)
- [The Cv That Gets Read](#phase-11-job-hunt-pakistan--the-cv-that-gets-read)
- [Portfolio And Personal Brand](#phase-11-job-hunt-pakistan--portfolio-and-personal-brand)
- [Git](#phase-1-programming-foundations--git)
- [Github](#phase-1-programming-foundations--github)
- [Applying Without Wasting Shots](#phase-11-job-hunt-pakistan--applying-without-wasting-shots)

**Deliverable:** CV version one as a real PDF, a rewritten LinkedIn profile, a GitHub profile with a README and no empty repositories, and week-04/ with hand-written promise exercises. · ALSO: Three tailored applications logged in APPLICATIONS.md, and a practice repository where you have created and resolved a merge conflict, rebased a branch, and recovered a lost commit from the reflog.

**Milestone:** GATE — CV, LinkedIn and GitHub finished by Saturday 17 October. Not "nearly". A stranger can find you, read one page, and know what you do. And you can explain the event loop out loud in ninety seconds. · AND: Three applications out. You can explain the difference between merge and rebase, and what git reset --hard actually destroys, without looking it up.

**Applications this week:** 3

**DSA drill:** Hash maps — frequency & lookup → Two pointers — 7 problems

### Day 22 — Monday 12 October 2026

**Promise combinators · async/await, and the errors it hides**

| Time | Track | Task |
|---|---|---|
| `After Fajr + Quran` | **Engineering** | Phase 1 Chapter 7 — Promise.all, allSettled, race, any. No AI: write one realistic use for each, then a retry-with-backoff helper from a blank file. Commit it. |
| `10:00–11:00 + 16:00–16:30` | **Engineering** | Phase 1 Chapter 7 — async/await. Learn what await does to the function around it, and why a missing try/catch in an async function is the most common production bug in Node. No AI: convert your retry helper to async/await. |
| `16:30–17:00` | **Job Hunt** | LinkedIn: headline, About, experience entries. Same rules as the CV. Add your GitHub link. Turn on "open to work" for recruiters only. |
| `21:30–22:00` | **Communication** | English speaking session with Claude: explain today's engineering work out loud as if to an interviewer, then answer two follow-up questions. Fix every grammar point it raises. |

*Total: 4h 0m*

### Day 23 — Tuesday 13 October 2026

**APPLICATIONS OPEN — the object model · Branching and merging, on purpose**

| Time | Track | Task |
|---|---|---|
| `After Fajr + Quran` | **Engineering** | Phase 1 Chapter 11 (Git) — the object model. Commits, trees, blobs, refs. Understand that a branch is a moving pointer to a commit and most of Git stops being frightening. |
| `10:00–11:00 + 16:00–16:30` | **Engineering** | Phase 1 Chapter 11 — branching and merging. In a throwaway repository: create a conflict deliberately, resolve it by hand, and write in LOG.md what the conflict markers actually mean. |
| `16:30–17:00` | **Job Hunt** | GitHub profile: add a profile README saying who you are and what you are building. Archive every empty or abandoned repository. Pin backend-mastery. |
| `21:30–22:00` | **Communication** | English speaking session with Claude: explain today's engineering work out loud as if to an interviewer, then answer two follow-up questions. Fix every grammar point it raises. |

*Total: 4h 0m*

### Day 24 — Wednesday 14 October 2026

**Rebase, and when not to · Undo, recover, and the reflog**

| Time | Track | Task |
|---|---|---|
| `After Fajr + Quran` | **Engineering** | Phase 1 Chapter 11 — rebase, interactive rebase, and the golden rule about rewriting shared history. Squash this week's commits into three meaningful ones on a practice branch. |
| `10:00–11:00 + 16:00–16:30` | **Engineering** | Phase 1 Chapter 11 — reset, revert, stash, reflog. Deliberately lose a commit with reset --hard and recover it from the reflog. Knowing this is the difference between a bad afternoon and a lost day. |
| `16:30–17:00` | **Job Hunt** | Read Phase 11 Chapter 8 (Portfolio and Personal Brand). Export CV version one to PDF as FirstnameLastname-CV.pdf. Send it to yourself and open it on a phone. |
| `21:30–22:00` | **Communication** | English speaking session with Claude: explain today's engineering work out loud as if to an interviewer, then answer two follow-up questions. Fix every grammar point it raises. |

*Total: 4h 0m*

### Day 25 — Thursday 15 October 2026

**GitHub as a working surface · Classes, inheritance, composition**

| Time | Track | Task |
|---|---|---|
| `After Fajr + Quran` | **Engineering** | Phase 1 Chapter 12 (GitHub) — pull requests, reviews, issues. Open a PR against your own backend-mastery repository, review it as if you were someone else, and leave three real comments. |
| `10:00–11:00 + 16:00–16:30` | **Engineering** | Phase 1 Chapter 5 (OOP) — classes, constructors, inheritance, and why composition usually beats inheritance. No AI: model a small library system in classes from a blank file. |
| `16:30–17:00` | **Job Hunt** | CV gate polish: improve one of CV, LinkedIn or the GitHub profile README — one concrete fix, then commit or save it. |
| `21:30–22:00` | **Communication** | English speaking session with Claude: explain today's engineering work out loud as if to an interviewer, then answer two follow-up questions. Fix every grammar point it raises. |

*Total: 4h 0m*

### Day 26 — Friday 16 October 2026

**Encapsulation, interfaces, polymorphism · Single responsibility and open/closed**

| Time | Track | Task |
|---|---|---|
| `After Fajr + Quran` | **Engineering** | Phase 1 Chapter 5 — encapsulation, polymorphism, abstract types. Refactor yesterday's library so the storage mechanism can be swapped without touching business logic. That refactor is the whole lesson. |
| `10:00–11:00 + 16:00–16:30` | **Engineering** | Phase 1 Chapter 9 (SOLID) — single responsibility and open/closed. Find the fattest class in your library system and split it. Then add a new storage type without modifying any existing file. |
| `16:30–17:00` | **Job Hunt** | CV gate polish: improve one of CV, LinkedIn or the GitHub profile README — one concrete fix, then commit or save it. |
| `21:30–22:00` | **Communication** | English speaking session with Claude: explain today's engineering work out loud as if to an interviewer, then answer two follow-up questions. Fix every grammar point it raises. |

*Total: 4h 0m*

### Day 27 — Saturday 17 October 2026

**THE GATE — paperwork finished**

| Time | Track | Task |
|---|---|---|
| `10:00–12:00` | **Engineering** | Deep build, two hours, no AI: a script that calls three public APIs in parallel, handles partial failure with allSettled, retries on timeout, and prints a combined result. The async chapter as a working thing. |
| `12:30–13:30` | **Job Hunt** | GATE CHECK. CV, LinkedIn and GitHub side by side. All three finished today. If one is not, finish it now — the rest of the plan assumes it is done. |
| `14:00–15:00` | **Review** | Weekly review. Then: explain the event loop out loud, timed, ninety seconds, recorded. If you cannot, that is Monday's dawn block. Read next week ahead — applications open Monday. |
| `15:30–16:00` | **Job Hunt** | APPLICATIONS OPEN. Read Phase 11 Chapter 3 (Applying Without Wasting Shots), then send one application from TARGETS.md. Tailor the CV summary line to it. Log company, role, date, link and channel in APPLICATIONS.md. |
| `16:00–16:30` | **Job Hunt** | Second application, tailored, logged. |

*Total: 5h 0m*

### Day 28 — Sunday 18 October 2026

**Async under load**

| Time | Track | Task |
|---|---|---|
| `10:00–12:00` | **Engineering** | Deep build, two hours, no AI: a promise pool that runs N async jobs with a concurrency limit, then use it to fetch fifty URLs five at a time. This is a real interview question at the companies you are targeting. |
| `12:30–13:30` | **Engineering** | Drill: three LeetCode Easy and one Medium, timed, no help. The Medium will probably beat you. Write where you got stuck — that is the useful output, not the solve. |
| `14:00–15:00` | **Review** | Weekly review. Applications sent: 3. Responses: record honestly. Read next week ahead. |
| `15:30–16:00` | **Job Hunt** | Third application, tailored, logged. Then review the week's three: which did you tailor properly, and which did you send because the slot was open? |
| `16:00–16:30` | **Job Hunt** | Read Phase 11 Chapter 1 (The Pakistani Market). In TARGETS.md, mark which tier each of your fifteen companies sits in and the realistic band. |

*Total: 5h 0m*

## Week 5 — OOP and SOLID — The Shape NestJS Assumes + TypeScript for Backend Engineers

*Block I — Foundations · 30 hours*

NestJS is an opinionated object-oriented framework built on dependency injection. If classes, interfaces and inversion of control are vague to you, Nest will feel like magic and you will never debug it confidently. This week removes the magic before you meet it.

TypeScript is not optional at the tier you are targeting, and NestJS is built on its decorators and metadata. This week is types that carry weight — generics, narrowing, and the compiler settings that actually catch bugs — plus the decorator mechanics Nest depends on.

**Chapters this week:**

- [Oop](#phase-1-programming-foundations--oop)
- [Solid Principles](#phase-1-programming-foundations--solid-principles)
- [The Pakistani Market](#phase-11-job-hunt-pakistan--the-pakistani-market)
- [Typescript](#phase-1-programming-foundations--typescript)
- [Functional Programming](#phase-1-programming-foundations--functional-programming)

**Deliverable:** week-06/ containing a small library system modelled in classes, refactored so the storage mechanism can be swapped without touching business logic, plus your own hand-written dependency-injection container in about thirty lines. · ALSO: The expense tracker ported to strict TypeScript with no any, plus a worked file demonstrating decorators and metadata reflection from first principles.

**Milestone:** You can explain dependency inversion with an example from your own code, and you have written a DI container yourself — so Nest's providers will be obvious rather than magical. · AND: BLOCK I CLOSES. You can type a function, an object and a generic without help, you know what strict mode turns on, and you can explain what a decorator is at runtime.

**Applications this week:** 6

**DSA drill:** Two pointers — sorted arrays → Sliding window — fixed size — 6 problems

### Day 29 — Monday 19 October 2026

**Dependency inversion — the one that matters for Nest · Liskov and interface segregation, briefly**

| Time | Track | Task |
|---|---|---|
| `After Fajr + Quran` | **Engineering** | Phase 1 Chapter 9 — dependency inversion. Stop your classes constructing their own dependencies; pass them in. Then, no AI: write a thirty-line container that registers classes by token and resolves their constructor dependencies for you. You have just written the core of Nest. |
| `10:00–11:00 + 16:00–16:30` | **Engineering** | Phase 1 Chapter 9 — the remaining two principles. These matter least day to day and are still asked. One worked example each, from your own code, in LOG.md. |
| `16:30–17:00` | **Job Hunt** | One application, tailored, logged. |
| `21:30–22:00` | **Communication** | Write the cover note you will reuse: four sentences, naming the company and one specific thing about them. Not a letter — something a recruiter reads in twelve seconds. |

*Total: 4h 0m*

### Day 30 — Tuesday 20 October 2026

**Types, interfaces, unions · Strict mode, and what it catches**

| Time | Track | Task |
|---|---|---|
| `After Fajr + Quran` | **Engineering** | Phase 1 Chapter 2 (TypeScript) — basic types, interfaces, type aliases, unions. Set up a project from scratch by hand, no starter template. Read every line of the tsconfig you wrote and know what it does. |
| `10:00–11:00 + 16:00–16:30` | **Engineering** | Turn on strict, strictNullChecks and noImplicitAny. Fix every error the compiler finds instead of silencing it. Write in LOG.md the three real bugs it caught that you would have shipped. |
| `16:30–17:00` | **Job Hunt** | Second application, tailored, logged. |
| `21:30–22:00` | **Communication** | Write a sixty-second spoken answer to "Why are you looking to leave your current job?" that is honest and does not criticise your employer. |

*Total: 4h 0m*

### Day 31 — Wednesday 21 October 2026

**Generics and narrowing · Decorators and metadata — the Nest prerequisite**

| Time | Track | Task |
|---|---|---|
| `After Fajr + Quran` | **Engineering** | Phase 1 Chapter 2 — generics and narrowing. No AI: write a typed result wrapper (ok/error) and a typed fetch helper. Ban the word any and feel where it hurts. |
| `10:00–11:00 + 16:00–16:30` | **Engineering** | Phase 1 Chapter 2 — decorators. Turn on experimentalDecorators and emitDecoratorMetadata. No AI: write a class decorator, a method decorator and a parameter decorator, and print what each receives. Then use reflect-metadata to read a constructor parameter's type at runtime. That single trick is how Nest injects. |
| `16:30–17:00` | **Communication** | Third application. Then rehearse: "tell me about a refactor you did and why." |
| `21:30–22:00` | **Communication** | Write a two-minute spoken answer to "how do you decide when to split a class?" using your own refactor as the example. |

*Total: 4h 0m*

### Day 32 — Thursday 22 October 2026

**Functional habits that keep services testable · Modules and resolution**

| Time | Track | Task |
|---|---|---|
| `After Fajr + Quran` | **Engineering** | Phase 1 Chapter 6 (Functional Programming) — pure functions, immutability, side effects at the edges. Pull the pure logic out of one of your services so it can be tested without mocks. This habit is what makes week 27 easy. |
| `10:00–11:00 + 16:00–16:30` | **Engineering** | Phase 2 Chapter 1 (Node.js) — modules. CommonJS versus ESM, how require actually resolves a path, what each package.json field means. No AI: build a three-module project by hand, both ways, and note what breaks when you mix them. |
| `16:30–17:00` | **Job Hunt** | Applications: one tailored application or one follow-up. Log it in TRACKER.md. |
| `21:30–22:00` | **Communication** | English speaking session with Claude: explain today's engineering work out loud as if to an interviewer, then answer two follow-up questions. Fix every grammar point it raises. |

*Total: 4h 0m*

### Day 33 — Friday 23 October 2026

**npm, versions, and the lockfile · The standard library you never opened**

| Time | Track | Task |
|---|---|---|
| `After Fajr + Quran` | **Engineering** | Phase 2 Chapter 1 — npm. Semver ranges, the lockfile, dependencies versus devDependencies versus peerDependencies, and what npm ci does differently from npm install. Then read your own lockfile and find one transitive dependency you did not know you had. |
| `10:00–11:00 + 16:00–16:30` | **Engineering** | Phase 2 Chapter 1 — fs, path, os, crypto, events. No AI: write a directory-walker that reports total size by file extension. Use path correctly so it works on Windows and Linux. Then use crypto to hash each file and find duplicates. |
| `16:30–17:00` | **Job Hunt** | Applications: one tailored application or one follow-up. Log it in TRACKER.md. |
| `21:30–22:00` | **Communication** | English speaking session with Claude: explain today's engineering work out loud as if to an interviewer, then answer two follow-up questions. Fix every grammar point it raises. |

*Total: 4h 0m*

### Day 34 — Saturday 24 October 2026

**Build with your own DI container**

| Time | Track | Task |
|---|---|---|
| `10:00–12:00` | **Engineering** | Deep build, two hours, no AI: rebuild the expense tracker from week 3 on your own DI container — a service, a repository interface, two storage implementations, wired by token. When Nest does this for you in week 23, you will know exactly what it is doing. |
| `12:30–13:30` | **Engineering** | Drill: three LeetCode problems, timed. Then explain dependency injection aloud in ninety seconds without using the word "framework". |
| `14:00–15:00` | **Review** | Weekly review. Read next week ahead. |
| `15:30–16:00` | **Job Hunt** | One application, tailored, logged. |
| `16:00–16:30` | **Job Hunt** | Second application, tailored, logged. |

*Total: 5h 0m*

### Day 35 — Sunday 25 October 2026

**BLOCK I REVIEW**

| Time | Track | Task |
|---|---|---|
| `10:00–12:00` | **Engineering** | Deep build, two hours, no AI: port the expense tracker to strict TypeScript, typed end to end, on your own DI container. Seven weeks of foundations in one piece of code. |
| `12:30–13:30` | **Engineering** | Block drill: five LeetCode Easy, timed, no help. Compare directly against your week-1 baseline and write both numbers in BASELINE.md. |
| `14:00–15:00` | **Review** | BLOCK I REVIEW. Honestly: did the dawn block hold for seven weeks? Did the no-AI rule hold? Unaided problem count now versus week 1? Then read Block II ahead — Node starts. |
| `15:30–16:00` | **Job Hunt** | Update the CV: TypeScript goes on it now, because you can defend it. |
| `16:00–16:30` | **Job Hunt** | One application, tailored, logged. |

*Total: 5h 0m*

## Week 6 — The Node Runtime — Modules, npm, Process + Node Internals — Event Loop Phases, Streams, Buffers

*Block II — Node and Express · 30 hours*

You have written server code for three years without knowing what the runtime does. This week is modules, resolution, the standard library and the process itself — the ground everything else stands on.

The week that separates you from every other candidate who says "Node is non-blocking" and cannot go further. Libuv phases, the thread pool, streams and backpressure, and what a Buffer actually is.

**Chapters this week:**

- [Nodejs](#phase-2-backend-engineering--nodejs)
- [Explaining Technical Work](#phase-10-english-communication--explaining-technical-work)
- [Asynchronous Programming](#phase-1-programming-foundations--asynchronous-programming)

**Deliverable:** week-08/ containing a three-module project built by hand in both CommonJS and ESM, a directory-walker using fs and path correctly, and a script that fails properly with a non-zero exit code. · ALSO: week-09/ containing a measured demonstration of a blocked event loop, a stream pipeline that processes a file larger than memory, and a written explanation of backpressure in your own words.

**Milestone:** You can explain module resolution, the difference between CommonJS and ESM, and what an unhandled rejection does to a Node process. · AND: You can name the event loop phases in order, explain what runs in the thread pool and what does not, and demonstrate backpressure with code you wrote.

**Applications this week:** 6

**DSA drill:** Sliding window — variable size → Strings — parsing & building — 7 problems

### Day 36 — Monday 26 October 2026

**EventEmitter, and the pattern Node is built on · Process, environment, and dying correctly**

| Time | Track | Task |
|---|---|---|
| `After Fajr + Quran` | **Engineering** | Phase 2 Chapter 1 — events. No AI: write your own EventEmitter from a blank file — on, once, emit, off, and correct behaviour when a listener throws. Then read how streams use it. |
| `10:00–11:00 + 16:00–16:30` | **Engineering** | Phase 2 Chapter 1 — process, environment variables, exit codes, uncaught exceptions and unhandled rejections. No AI: write a script that fails properly — non-zero exit, useful message, nothing swallowed. Then make it handle SIGTERM and shut down cleanly. |
| `16:30–17:00` | **Job Hunt** | Second application, tailored, logged. |
| `21:30–22:00` | **Communication** | Write a four-sentence answer to "What is TypeScript for?" that does not say "it adds types". Say what problem it removes. |

*Total: 4h 0m*

### Day 37 — Tuesday 27 October 2026

**The phases, in order · Blocking, measured**

| Time | Track | Task |
|---|---|---|
| `After Fajr + Quran` | **Engineering** | Phase 2 Chapter 1 — the event loop phases: timers, pending callbacks, poll, check, close. Then process.nextTick versus setImmediate versus setTimeout(0). Predict the ordering of a five-line script before running it, and keep predicting until you are right first time. |
| `10:00–11:00 + 16:00–16:30` | **Engineering** | No AI: write a script that blocks the loop with a synchronous loop and measure the delay it introduces into a timer. Then do the same with a synchronous fs call and with JSON.parse on a huge string. Write the three numbers down — those numbers are an interview answer. |
| `16:30–17:00` | **Job Hunt** | Update the CV with Node — not as a bullet point but as a sentence about what you built with it this week. |
| `21:30–22:00` | **Communication** | Third application. Then rehearse: "how comfortable are you with TypeScript?" Answer with what you built this week, not a rating. |

*Total: 4h 0m*

### Day 38 — Wednesday 28 October 2026

**The thread pool · Streams and backpressure**

| Time | Track | Task |
|---|---|---|
| `After Fajr + Quran` | **Engineering** | Phase 2 Chapter 1 — libuv's thread pool. Which operations use it (fs, dns, crypto, zlib) and which do not (network I/O). Change UV_THREADPOOL_SIZE and measure the difference on four parallel crypto operations. Most candidates have never done this. |
| `10:00–11:00 + 16:00–16:30` | **Engineering** | Phase 2 Chapter 1 — streams. Readable, writable, duplex, transform. No AI: read a large CSV line by line and write a filtered version out without loading the file into memory. Then remove the pipe, write manually, ignore the return value of write(), and watch memory climb. That is backpressure. |
| `16:30–17:00` | **Communication** | Third application. Then write five sentences on why Node chose an event-driven model, in the register you would use in an interview. |
| `21:30–22:00` | **Communication** | Read Phase 10 Chapter 2 (Explaining Technical Work). Explain module resolution aloud, in two minutes, to an imaginary non-engineer. Record it. |

*Total: 4h 0m*

### Day 39 — Thursday 29 October 2026

**Buffers and binary · Routing and the Router**

| Time | Track | Task |
|---|---|---|
| `After Fajr + Quran` | **Engineering** | Phase 2 Chapter 1 — Buffer and binary data. Encodings, why a Buffer is not a string, and what happens when you slice one. No AI: parse a small binary file format by hand — read a header, seek, read records. |
| `10:00–11:00 + 16:00–16:30` | **Engineering** | Phase 2 Chapter 2 (Express.js) — routing, route parameters, query strings, the Router. No AI: build a server with six routes and a mounted router from a blank file. No generator, no template. |
| `16:30–17:00` | **Job Hunt** | Applications: one tailored application or one follow-up. Log it in TRACKER.md. |
| `21:30–22:00` | **Communication** | English speaking session with Claude: explain today's engineering work out loud as if to an interviewer, then answer two follow-up questions. Fix every grammar point it raises. |

*Total: 4h 0m*

### Day 40 — Friday 30 October 2026

**Middleware, and why order matters · Error handling in Express**

| Time | Track | Task |
|---|---|---|
| `After Fajr + Quran` | **Engineering** | Phase 2 Chapter 2 — middleware. What next() does, what happens when you forget it, and why the order of app.use is load-bearing. No AI: write request-logging and timing middleware by hand, then move one above the other and observe what changes. |
| `10:00–11:00 + 16:00–16:30` | **Engineering** | Phase 2 Chapter 2 — the four-argument error middleware and why it has four arguments. No AI: build a central error handler returning consistent JSON that never leaks a stack trace. Then throw from inside an async handler and discover that Express does not catch it — and fix that. |
| `16:30–17:00` | **Job Hunt** | Applications: one tailored application or one follow-up. Log it in TRACKER.md. |
| `21:30–22:00` | **Communication** | English speaking session with Claude: explain today's engineering work out loud as if to an interviewer, then answer two follow-up questions. Fix every grammar point it raises. |

*Total: 4h 0m*

### Day 41 — Saturday 31 October 2026

**Build the CLI**

| Time | Track | Task |
|---|---|---|
| `10:00–12:00` | **Engineering** | Deep build, two hours, no AI: a file-processing CLI — read a large CSV, filter rows by a flag, aggregate a column, write a report. Flags parsed by hand, no library. Correct exit codes. |
| `12:30–13:30` | **Engineering** | Drill: three LeetCode Easy and one Medium, timed, no help. String problems. |
| `14:00–15:00` | **Review** | Weekly review. Read next week ahead. |
| `15:30–16:00` | **Job Hunt** | One application, tailored, logged. |
| `16:00–16:30` | **Job Hunt** | Second application, tailored, logged. |

*Total: 5h 0m*

