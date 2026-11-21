# Your Portfolio and Professional Profile

> [!GOALS]
> - Present your work so that reviewers find the evidence quickly: GitHub, a portfolio page and LinkedIn.
> - Write **case studies** that explain problems, decisions and results, not just links.
> - Optimise a **GitHub profile** and pinned repositories.
> - Write a **LinkedIn** headline, about section and experience bullets that are specific and honest.
> - Share your work in public in ways that build reputation, without hype.
> - Keep your professional presence accurate, safe and consistent.

## Why this matters

Your projects only help if the right people see them and understand them quickly. A reviewer deciding whether to interview you might spend a minute on your GitHub profile and less on your LinkedIn. A remote employer or client who has never met you judges you entirely by what they can find online. A good professional presence makes your evidence easy to find, easy to understand and easy to trust.

This is not about self-promotion or "personal branding" slogans. It is about **communication**: presenting real work clearly, the same skill as a good README or design document. This chapter builds on {{ch:projects-that-prove-skill}} and prepares for {{ch:the-cv}}, {{ch:applying}} and {{ch:remote-work}}.

## The simple idea

Think of a shop window. The goods inside may be excellent, but people decide in a few seconds whether to walk in, based on what they see from the street: is it tidy, is it clear what is sold, are the best items visible? Your profile pages are your shop window. They do not need decoration; they need the best work at the front, clearly labelled.

> [!ANALOGY]
> Your professional profile is like a shop window: in a few seconds people decide whether to come in, so the best work must be at the front and clearly labelled.
>
> **Where the analogy breaks:** a shop window can show attractive items the shop does not really sell. Your profile cannot — interviewers will ask about everything you show, so every claim must be true and something you can explain in depth.

## The proper definition and key words

A **professional profile** is the set of public places where people learn about your work — typically GitHub, LinkedIn and optionally a personal portfolio site or blog — presented consistently and accurately.

Key words:

- **Profile README** — a README shown at the top of your GitHub profile (from a repository named exactly like your username).
- **Pinned repositories** — up to six repositories featured on your GitHub profile.
- **Case study** — a short write-up of a project: problem, solution, architecture, challenges, results.
- **Headline** — the line under your name on LinkedIn, shown in searches.
- **About section** — your LinkedIn summary.
- **Building in public** — sharing what you are building and learning as you go.
- **Social proof** — recommendations, contributions and visible results that support your claims.

## GitHub

### Level 1 — The profile README

Write it as a short professional introduction, not a wall of badges:

```markdown
# Your Name — Back-end Engineer

I build reliable APIs and data-heavy back ends with TypeScript, Node.js and PostgreSQL,
deployed on AWS.

**Selected projects**
- [Clinic Bookings API](link) — NestJS, PostgreSQL, Redis and a job queue; double-booking
  prevention with database constraints; deployed with Docker and GitHub Actions.
- [Docs Q&A](link) — retrieval over public documentation with citations and an evaluation
  set (recall@5 measured); pgvector and an LLM API.

**Technologies I use regularly:** TypeScript · Node.js · NestJS · PostgreSQL · Redis · Docker · AWS

**Open to:** back-end engineering roles (on-site, hybrid or remote)
[LinkedIn](link) · [Portfolio](link) · contact through LinkedIn
```

Keep it short, specific and true. Put contact details you are comfortable making public; a professional email address or a link to LinkedIn is enough.

### Level 2 — Repositories reviewers will open

- **Pin your best three to six** — normally your proof projects ({{ch:projects-that-prove-skill}}).
- **Every pinned repository has a strong README**: problem, live link, screenshot or short animation, architecture diagram, how to run, decisions, numbers, limitations.
- **Readable history**: meaningful commit messages; no "update" or "fix stuff" sequences ({{ch:git}}).
- **Topics** on repositories (`nodejs`, `postgresql`, `rest-api`) help search.
- **Tidy up**: make abandoned experiments and copied tutorials private or archive them; a few strong repositories beat many weak ones.
- **No secrets**, ever — reviewers notice `.env` files and keys in history ({{ch:secrets-manager}}).
- **Activity** matters less than quality. Regular, meaningful work is good; artificial commits to fill a contribution graph fool nobody.

## Case studies and a portfolio page

### Level 2 — The case study format

A portfolio page (a simple static site, a pinned repository or a well-formatted README) turns each project into a case study that a non-technical reader can follow in two minutes:

1. **Title and one-line description.**
2. **The problem**: who has it, why it matters.
3. **My solution**: what you built, in plain language.
4. **Architecture**: a diagram and a paragraph — services, database, cache, queue, deployment.
5. **Key technical challenges**: two or three, each with what you tried and chose.
6. **Results and numbers**: query times, throughput, recall, costs, test coverage — with how you measured them.
7. **What I would do differently.**
8. **Links**: live demo, repository, short video walkthrough if you have one.

Hiring managers and clients who are not engineers read case studies; engineers read the code. Serve both.

### Level 3 — Personal site or GitHub only?

- A **GitHub profile with good READMEs** is enough for most engineering roles.
- A **personal site** helps for freelance work, remote roles and if you write: it gives one link with case studies, writing and contact details. Keep it simple, fast and accessible — it is also a small demonstration of your front-end care ({{ch:accessibility}}, {{ch:frontend-performance}}).

## LinkedIn

### Level 2 — Headline, about and experience

- **Headline**: role, main skills and what you are open to.
  - Weak: "Software Engineer at Company | Looking for opportunities".
  - Stronger: "Back-end Engineer | TypeScript · Node.js · PostgreSQL · AWS | Open to remote roles".
- **About section**: the first two lines are visible without clicking — say what you build and for whom. Then three to five specific lines about your strengths and two or three concrete results, and what you are looking for.
- **Experience bullets**: specific actions and results instead of duties.
  - Weak: "Worked on REST APIs and database optimisation."
  - Stronger: "Built and maintained 12 REST endpoints used by the mobile app; rewrote the 5 slowest queries with new indexes, cutting the order page's p95 time from 900 ms to 120 ms."
  - Use numbers only when they are real and you can explain how you know them; "about" is fine where exact figures are confidential.
- **Skills**: list the ones you can discuss in depth; endorsements matter less than consistency with your CV and projects.
- **Open to work**: LinkedIn lets you show recruiters that you are looking, with an option visible only to recruiters; set job types and locations you really want.

### Level 3 — Consistency with your CV

Your CV, LinkedIn and GitHub must tell the **same story**: same job titles, dates, technologies and projects. Inconsistencies — different dates, a technology on LinkedIn you cannot discuss — create doubt ({{ch:the-cv}}).

## Building in public

### Level 3 — Sharing work usefully

Writing short posts or articles about real problems you solved builds a visible record, helps others and often brings contacts and opportunities. Good topics:

- "How I found and fixed an N+1 query problem — 501 queries per request down to 2" ({{ch:performance-engineering}}).
- "The architecture of my RAG project, and what its evaluation set showed" ({{ch:rag}}).
- "Three things I'd do differently if I rebuilt this API."
- A short explanation of a concept you just learned deeply.

A simple post structure: a first line that states the result or the problem; three to five short paragraphs with the substance (what was wrong, how you found it, what you changed, the numbers); a closing question or lesson.

Avoid: posts without substance ("still grinding"), generic motivation, exaggerated claims, and sharing anything confidential from your employer or clients.

### Level 4 — Reputation over time

- **Open-source contributions**: documentation fixes, bug fixes and small features in tools you use show collaboration and code review skills ({{ch:github}}).
- **Answering questions** in communities, giving a short talk at a local meetup, or writing about a hard problem all build reputation.
- **Recommendations** from colleagues and managers are strong social proof; give them to others too.
- **Consistency beats intensity**: a few useful contributions over time are worth more than a burst followed by silence.

## From beginner to enterprise

**Level 1–2 — the basics.** A short profile README; pinned proof projects with strong READMEs; a clear LinkedIn headline and specific experience bullets; no secrets anywhere.

**Level 3 — clear presentation.** Case studies for each project; a simple portfolio page if useful; consistent CV, LinkedIn and GitHub; occasional useful posts about real work.

**Level 4 — reputation.** Open-source contributions, writing, talks and recommendations that build trust over time.

**Level 5 — senior presence.** Known for specific expertise; people come to you with opportunities.

**Level 6 — industry presence.** Conference talks, widely used open-source work, and influence beyond one company.

## Real-world use cases

### The case study that got the interview

- **Story**: a freelance client hiring for a back-end contract shortlisted an engineer because their portfolio page explained, in plain language, how they had cut an API's response time and what it meant for users — the client could understand it without reading code.

### The confidential screenshot

- **Story**: an engineer posted a screenshot of an internal dashboard to illustrate a performance win. It showed customer names. The post was removed, and the employer was not pleased. Since then they describe results without showing internal systems.

## Common mistakes

### Beginner: a profile full of badges and no explanation

**Fix:** a short, specific introduction with linked projects.

### Beginner: tutorial clones pinned

**Fix:** pin finished proof projects.

### Beginner: duty-based LinkedIn bullets

**Fix:** actions and real results.

### Intermediate: inconsistent CV and profiles

**Fix:** one story across all of them.

### Intermediate: exaggerated numbers

**Consequence:** interviews expose them. **Fix:** only real, explainable figures.

### Intermediate: sharing confidential material

**Fix:** describe, never show, internal systems and data.

## Debugging and troubleshooting

- **No profile views or messages**: unclear headline, missing keywords for the roles you want, or no recent activity.
- **Messages for the wrong roles**: your headline and about section describe something other than what you want; rewrite them.
- **Reviewers do not open your projects**: link them directly from your CV and LinkedIn with one-line descriptions.
- **Posts get no response**: more substance and specific results; fewer generic statements.

## Security summary

- **Share only what you are comfortable making public**: avoid home addresses, phone numbers and ID documents.
- **No secrets** in repositories or screenshots.
- **No confidential employer or client information**, even in anonymised screenshots.
- **Be careful with unexpected messages** offering jobs that require payment or unusual software.

## How a senior engineer thinks about this

- **Presentation is communication.** Make evidence easy to find and understand.
- **Truth is non-negotiable.** Everything public will be tested in interviews.
- **Quality beats quantity**, in repositories and in posts.
- **Reputation is built slowly**, by consistently useful work.

## Exercises

### Exercise 1 — Rewrite the headline and bullets

**Objective:** practise specific writing.
**What to do:** rewrite this headline and bullet: "Software developer at XYZ | Seeking new opportunities" and "Responsible for backend development and bug fixing."

<details>
<summary>Show the solution</summary>

- Headline: "Back-end Developer | PHP → TypeScript, Node.js, PostgreSQL | Open to back-end roles".
- Bullet: "Maintained and extended the order management back end (PHP, MySQL) for a retail client; fixed a long-standing stock synchronisation bug by adding database transactions, ending weekly manual corrections."

Specific system, specific action, specific result — all things you can explain in an interview.

</details>

### Exercise 2 — Write a case study

**Objective:** practise presenting a project.
**What to do:** write the "problem", "solution" and "results" parts of a case study for a project you have built.

<details>
<summary>Show the solution</summary>

Example:

- **Problem**: small clinics take bookings by phone and paper diaries, leading to double bookings and missed appointments.
- **Solution**: a booking API and simple web app where patients book available slots; double bookings are impossible because the database rejects overlapping appointments; reminders are sent by a background worker.
- **Results**: availability search under 30 ms at 200,000 seeded appointments after adding a composite index (from 600 ms); 85 tests including concurrency tests for double booking; deployed on AWS with CI/CD.

Write for a reader who is not an engineer, and link the technical details for those who are.

</details>

### Exercise 3 — Plan a post

**Objective:** practise building in public.
**What to do:** outline a short post about a technical problem you solved.

<details>
<summary>Show the solution</summary>

- **First line**: "My API made 501 database queries to show one page of orders."
- **Body**: what the page did (fetched 500 orders, then each customer separately); how you found it (query logging and a trace); the fix (one batched query for customers); the result (2 queries, page time from 3 s to under 100 ms); the lesson (ORMs hide N+1 problems; count queries in tests).
- **Close**: "How do you catch N+1 queries before production?"

No confidential details; real numbers you measured.

</details>

## Summary

Your professional presence makes your evidence easy to find and trust. On **GitHub**, write a short, specific **profile README**, **pin** your best proof projects with strong READMEs, keep history readable and secrets out, and remove clutter. Turn projects into **case studies** — problem, solution, architecture, challenges, numbers, what you would change, links — on a simple portfolio page when it helps, especially for freelance and remote work.

On **LinkedIn**, write a headline with your role, main skills and what you want; an about section with specific strengths and real results; and experience bullets about actions and outcomes rather than duties, keeping everything consistent with your CV. **Build in public** with useful posts about real problems and results, contribute to open source, collect recommendations, and build reputation steadily — always truthfully, and never sharing confidential information.

## Key terms

- **Professional profile** — Your public presence describing your work.
- **Profile README** — The introduction shown at the top of a GitHub profile.
- **Pinned repository** — A repository featured on a GitHub profile.
- **Case study** — A short structured write-up of a project and its results.
- **Portfolio site** — A personal website presenting your work.
- **LinkedIn headline** — The line under your name on LinkedIn.
- **About section** — The summary on a LinkedIn profile.
- **Building in public** — Sharing your work and learning publicly as you go.
- **Social proof** — Evidence from others, such as recommendations or contributions.

## What comes next

The document most employers still read first is your CV. The next chapter, {{ch:the-cv}}, shows how to write a CV that gets read: structure, bullet points that prove impact, tailoring to each role, applicant tracking systems and common mistakes.
