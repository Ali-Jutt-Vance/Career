# Continue the book rewrite here

Instructions for whoever continues this project (a person or Claude Code), on any computer.

## What this project is

The old dated "career plan" was turned into one teaching book: **Becoming a Software Engineer**,
176 chapters in 15 parts, for an absolute beginner, in simple English. No schedules, dates,
streaks or tracking anywhere. Interview/career and English parts are kept at the end.

## Where things are

- `book/toc.json` — the master table of contents (every chapter, its id, its old source notes).
- `book/STYLE-GUIDE.md` — **read this first**: how every chapter must teach (six levels,
  line-by-line code walkthroughs, Output blocks, callout boxes, mistakes, exercises with
  hidden solutions, `## Key terms` in the exact format, `{{ch:id}}` cross-references).
- `book/chapters/<id>.md` — the rewritten chapters.
- `source-notes/` — the old condensed chapters; raw material for each new chapter.
- `REWRITE-STATUS.md` — generated list of which chapters are done.
- `node compile.js` builds the reader (`output/index.html`); `node scripts/check.js` validates.

## How to continue

1. `git pull` on the `book-rewrite` branch.
2. Open `REWRITE-STATUS.md`; take the first chapter that is not rewritten, in order.
3. Read its source notes (listed in `toc.json`) and the style guide.
4. Write `book/chapters/<id>.md` (typically 7,000–12,000 words).
5. **Verify every code example by running it.** Extract the ```ts blocks into a scratch
   folder (outside the repo), compile with
   `npx tsc --strict --noUncheckedIndexedAccess --target ES2023 --module NodeNext --moduleResolution NodeNext file.ts`,
   run the output with `node`, and make every `**Output:**` block in the chapter match exactly.
   This step caught about twenty wrong outputs in chapters 1–32 — do not skip it.
6. `node scripts/check.js` (must show 0 errors), then commit the chapter.
7. Every few chapters, run `node compile.js` and commit `output/` and `REWRITE-STATUS.md`.
8. Commit locally after each chapter. Push only when the owner asks.

## Prompt to give Claude Code at home

> Continue the book rewrite in curriculum/. Read curriculum/CONTINUE-HERE.md and
> curriculum/book/STYLE-GUIDE.md, then write the next unfinished chapter following them
> exactly, verifying every code example, and commit after each chapter.

## Progress when this note was written

All 176 chapters done (Parts I–XV). The rewrite is complete; the reader in `output/` is
rebuilt from the final chapters. Future work is revision only: fix errors, update facts
that go out of date, and re-run `node compile.js` after any change.
