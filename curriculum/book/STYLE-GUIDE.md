# How Every Chapter of This Book Is Written

This file is for whoever writes or rewrites a chapter. It is not shown in the book.

## Who the reader is

An absolute beginner who wants to become a complete software engineer (full-stack, strong on
backend), able to pass interviews at top companies and eventually work at the level of an
engineer with five years of experience.

- They cannot learn from documentation, short videos or books written for experienced developers.
- Their English is good but not native. Write **simple, clear English**: short sentences,
  common words, no idioms that a non-native reader would trip on.
- They are intelligent. Patient and thorough — never childish, never baby-talk, never "it's easy!".

The writer is a senior engineer with decades of experience and unlimited patience, sitting beside
the reader. Write in the second person ("you"), warmly and directly.

## The non-negotiable rules

1. **Never assume knowledge.** Every technical term is explained the first time it appears in the
   chapter, even if an earlier chapter explained it — in that case a one-line reminder plus
   "(you met this in Chapter N)" is enough. Every abbreviation is spelled out on first use.
2. **Never show code you do not explain.** After every code block that matters, walk through it
   line by line (or small group of lines by small group): what it does, what the syntax means,
   what values flow where, what happens internally, what breaks if you remove or change it.
   Show the expected output in a separate block labelled `Output:`.
3. **Never use a concept before teaching it.** If an example needs something not yet taught,
   either teach it right there (briefly but properly) or choose a different example.
4. **Why before how.** For every concept: what problem existed before it, what happens without it,
   what alternatives exist, why this solution won.
5. **No schedules, dates, days, streaks, "today's task" or progress tracking.** Not anywhere.
   No motivational filler. No "watch this video", no "see the documentation" as a substitute for
   explaining. (Pointing to official docs as *further* reading after a full explanation is fine.)
6. **No filler and no repetition for length.** Depth comes from explaining more of the mechanism,
   more of the reasoning and more realistic cases — not from saying the same thing twice. When a
   hard idea needs a second explanation, give it from a *different angle*.
7. **Honesty about real companies.** Only state that a named company does something if it is
   well documented publicly (e.g. their engineering blog). Otherwise frame it as illustrative:
   "Imagine an online shop…", "A typical logistics company might…". Never invent statistics.
8. **Correct and current.** Technical content must be accurate as of 2026. Prefer current tools and
   syntax (modern JavaScript, `let`/`const`, ES modules where appropriate, current Node LTS
   behaviour, current React with function components and hooks, etc.). Mention when something
   older is still common in real codebases.
9. **Short paragraphs** (1–4 sentences). One difficult idea at a time. Use headings generously so
   the reader always knows where they are.
10. **Analogies are tools, not truths.** After every important analogy, say where it stops being
    accurate.

## The six levels

Major concepts climb through these levels. Use the level names in headings where it helps
(e.g. `### Level 3 — Building it yourself`), but do not force them mechanically on small ideas.

1. **Absolute beginner** — plain English, a familiar real-world situation.
2. **Basic technical understanding** — the real terminology and the core mechanism.
3. **Practical implementation** — a small, complete, runnable example, fully explained.
4. **Real application** — how it appears inside a real app (a shop, a clinic system, a delivery app).
5. **Professional engineering** — design decisions, trade-offs, limitations, team practices.
6. **Advanced and enterprise** — large scale, many users, distributed systems, operations.

## Chapter shape

Use this shape with judgment. Every chapter needs the items marked ★. Others appear when they fit.

```
# Chapter title                              (H1 — exactly one per file, no "Chapter N:" prefix)

> [!GOALS]                                    ★ what you will understand by the end (4–8 bullets)

## Why this matters                           ★ the problem, life before the solution
## The simple idea                            ★ plain English + analogy (+ where the analogy breaks)
## The proper definition and key words        ★ technical definition, terminology explained
## How it works inside                        ★ internal mechanics, step by step, with diagrams
## (Teaching sections — as many as needed)    ★ the main body: concept → code → walkthrough → output
## From beginner to enterprise                  levels 3–6 implementations / use cases
## Real-world use cases                         business problem, technical problem, solution,
                                                architecture, reasoning, pros, cons, limits,
                                                failure scenarios, alternatives
## Common mistakes                            ★ beginner / intermediate / production / enterprise
## Debugging and troubleshooting                symptoms → cause → how to find → fix
## Security / Performance / Trade-offs          where relevant
## How a senior engineer thinks about this      decision-making, when "good enough" is enough
## Exercises                                  ★ graded, with full hidden solutions (see below)
## Summary                                    ★ the essential ideas, in prose or a short list
## Key terms                                  ★ glossary entries (exact format below)
## What comes next                            ★ how this connects to the next chapter
```

## Callout boxes

Write them as blockquotes starting with a tag. The reader renders each in its own style.

```
> [!GOALS]
> - Explain what a variable is ...

> [!ANALOGY]
> A variable is like a labelled box ...
> **Where the analogy breaks:** ...

> [!INSIDE]
> What the computer is actually doing ...

> [!WARNING]
> A mistake that causes real damage ...

> [!TIP]
> A useful habit or shortcut ...

> [!SENIOR]
> How an experienced engineer thinks about this ...

> [!TRY]
> A short thing to try yourself right now ...

> [!RECAP]
> A quick reminder of something from an earlier chapter ...
```

## Code

- Always give the language on the fence: ```` ```js ````, ```` ```ts ````, ```` ```sql ````,
  ```` ```bash ````, ```` ```text ```` (for diagrams and output).
- Comments in code are short; the real explanation goes in the prose after the block.
- Keep examples small and complete enough to run. Say how to run them (`node file.js`).
- Output goes in its own block preceded by a line `**Output:**`.

## Diagrams

The book is read offline, so diagrams are drawn in plain text inside ```` ```text ```` blocks
using boxes and arrows. Keep them under ~70 characters wide. Always explain a diagram in the prose
underneath it; never leave it to speak for itself. Tables are good for comparisons.

## Mistakes

For each important mistake: what it looks like (code), why people make it, what happens, how to
spot it, how to fix it, how to prevent it, and the real consequence in production. Do not exaggerate.

## Exercises

Graded from easy to realistic (small exercise → practical build → debugging task → production
scenario). Each exercise states: objective, starting point, what to build, any new terms, hints.
The solution is hidden in a details block, then explained line by line, with expected output and
common wrong approaches:

```
### Exercise 2 — Title

**Objective:** ...
**Starting point:** ...
**What to build:** ...
**Hints:** ...

<details>
<summary>Show the solution</summary>

(solution code, walkthrough, expected output, common wrong approaches)

</details>
```

Leave a blank line after `<summary>…</summary>` and before `</details>` so the markdown inside renders.

## Key terms (feeds the book's glossary automatically)

The `## Key terms` section must use exactly this format, one term per line:

```
## Key terms

- **Variable** — A named place in memory that holds a value your program can read and change.
- **Runtime** — The program that runs your code and provides it with tools such as files and timers.
```

Definitions are one or two plain sentences that make sense on their own, out of context.

## Length

Length follows depth, not the other way round. A typical chapter is 7,000–14,000 words; a narrow
topic may be shorter, a huge one longer (split it if it passes ~18,000). Do not pad.

## Using the source notes

Most chapters list "source notes" in `book/toc.json` — the old, terse chapters in `source-notes/`.
Read them first. Keep their valuable technical content (facts, examples, interview questions,
production cases) but re-teach all of it properly. Remove any dates, schedules, plan references,
"week N", deadlines or tracking from them. Fix anything outdated or wrong.
