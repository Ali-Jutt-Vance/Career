# Becoming a Software Engineer

A patient, complete course — from your very first line of code to the level of an engineer
with five years of experience. It is written for an absolute beginner, in simple English, and
teaches every topic like a personal tutor: why it exists, how it works inside, code explained
line by line with its real output, how it is used from small apps to large companies, the
mistakes engineers make, and exercises with full solutions.

There is no schedule and no tracking. It is a book, read from the beginning.

## Open it

- Double-click **`curriculum/output/index.html`** — it opens in Chrome or Edge.
- Or double-click **`Install Desktop Icon.cmd`** once, to get a "Career Book" icon that opens
  the book in its own window.

Inside the reader: the contents panel on the left lists every part and chapter (the open
chapter shows its sections), the search box searches the whole book, and the **Glossary** and
**Index** at the bottom explain every technical term and list every topic A–Z.

## What the book covers

| Part | Chapters | Topic |
|---|---|---|
| I | 1–8 | Foundations: computers, programs, the terminal, the internet, the web, your tools, how to learn |
| II | 9–24 | JavaScript from zero, then TypeScript |
| III | 25–32 | Problem solving, Big O, data structures, algorithms, interview patterns |
| IV | 33–38 | Writing good software: OOP, functional programming, clean code, SOLID, patterns, testing |
| V | 39–42 | Git, GitHub, code review, agile teamwork |
| VI | 43–55 | Frontend: HTML, CSS, the DOM, React, Next.js, performance, accessibility |
| VII | 56–76 | Backend: Node.js, Express, REST, authentication, queues, NestJS and more |
| VIII | 77–92 | Databases: SQL, PostgreSQL, design, indexes, transactions, ORMs, MongoDB, Redis |
| IX | 93–107 | DevOps: Linux, networking, Docker, CI/CD, Terraform, monitoring |
| X | 108–127 | The cloud with AWS |
| XI | 128–139 | System design, with case studies |
| XII | 140–145 | Senior engineering: security, performance, incidents, architecture, leadership |
| XIII | 146–152 | AI engineering: LLMs, RAG, agents, MCP |
| XIV | 153–163 | Getting hired |
| XV | 164–176 | English for engineers |

## Status

The book is being rewritten chapter by chapter. **`curriculum/REWRITE-STATUS.md`** lists exactly
which chapters are finished. Chapters not yet rewritten still show their original condensed
notes, clearly marked as such.

## Project layout

```
curriculum/
  book/
    toc.json          the table of contents (all 176 chapters)
    STYLE-GUIDE.md    how every chapter is written
    chapters/         the rewritten chapters, one Markdown file each
  source-notes/       the old condensed chapters, raw material for unfinished ones
  compile.js          builds the reader from the chapters
  build.js            checks the chapters, then compiles
  scripts/            reader code, chapter checks, smoke test
  styles/             reader styles
  app/                desktop-icon installer
  output/index.html   the built book
  CONTINUE-HERE.md    how to continue the rewrite on any computer
  REWRITE-STATUS.md   generated progress record
```

## Rebuild

```
cd curriculum
npm install
npm run build
```

`npm run build` validates every chapter (`scripts/check.js`) and regenerates
`output/index.html`, the glossary, the index and `REWRITE-STATUS.md`.
