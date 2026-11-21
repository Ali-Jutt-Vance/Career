# Writing a CV That Gets Read

> [!GOALS]
> - Understand how a CV is actually read: a quick scan first, a closer read only after a "maybe".
> - Build a one-page structure that puts your strongest evidence where the scan happens.
> - Write **outcome bullets** — action, result, context — instead of duties, including for maintenance work.
> - Estimate honestly and never invent scale.
> - Tailor quickly for each application, and keep the CV readable by **applicant tracking systems**.
> - Prepare to talk through every line of your CV in interviews.

## Why this matters

Your CV is the gate everything else sits behind. A strong engineer with a weak CV gets no interviews and wrongly concludes that the market has rejected them. A clear CV with concrete evidence turns the same experience into interviews.

Reviewers do not read CVs the way writers imagine. They scan dozens of them quickly, decide in seconds whether each is a "maybe", and only then read more carefully. This chapter shows how to write for that reality, using the evidence from {{ch:projects-that-prove-skill}} and the presentation habits from {{ch:portfolio-and-brand}}.

## The simple idea

A CV is like the front page of a newspaper. Most people only glance at it: the headline and the first lines decide whether they read further. A good front page puts the most important story at the top, says what happened in plain words, and includes the facts that make it real.

> [!ANALOGY]
> A CV is like a newspaper's front page: most readers only glance, so the most important evidence must be at the top, stated plainly, with concrete facts.
>
> **Where the analogy breaks:** a newspaper reader cannot question the journalist. Every line of your CV can and will be questioned in interviews. A CV is not an advertisement; it is a list of claims you must be able to defend in detail.

## The proper definition and key words

A **CV** (curriculum vitae; in American usage often a **résumé**) is a short document summarising your professional experience, projects, skills and education, used to decide whether to interview you.

Key words:

- **First pass / scan** — the quick look (often well under a minute) that decides "no" or "maybe".
- **Outcome bullet** — a line stating what you did and what changed, with context.
- **Duty bullet** — a line describing responsibilities; weak evidence.
- **Tailoring** — adjusting a CV for a specific job advert.
- **Applicant tracking system (ATS)** — software that stores and searches CVs, and sometimes filters them.
- **Keywords** — the technology and role names an advert uses.

## How CVs are read

### Level 1 — The scan

A reviewer with many CVs looks for four things, in this order:

1. Does the current or most recent role look like the role being hired for?
2. How much experience, and are there gaps or a pattern of very short jobs?
3. Do the technologies match the advert?
4. Is there anything **concrete** — a number, a link, a named project?

Consequences: the **top third of page one** carries most of the weight; anything that cannot be understood in seconds is effectively invisible; and links are only useful if the text next to them makes the reviewer want to click.

### Level 1 — The common faults

1. **More than one page** with a few years of experience — it shows you cannot judge what matters. One page until you have many years of experience.
2. **Duty bullets** — "Responsible for developing and maintaining web applications using PHP and AngularJS." Anyone in the same job could write it.
3. **A wall of technologies** with no sense of depth.
4. **A summary full of adjectives** — "passionate, hardworking, detail-oriented team player". It says nothing a reviewer can check.
5. **A badly named file** — `cv-final-v3(2).pdf`. Use `Firstname-Lastname-Software-Engineer.pdf` and send PDF.

## Structure

### Level 2 — One page, in scan order

1. **Name and contact**: name, the role you are targeting, city, phone, email, LinkedIn and GitHub links. In most international and many Pakistani tech companies, a photo, date of birth and marital status are not needed — leave them out unless a specific employer asks.
2. **Summary (optional, three factual lines)**: useful when your situation needs framing, such as a change of stack:
   > Software engineer with three years building and maintaining a PHP/AngularJS product used by around 2,000 customers. Recently moved to TypeScript, Node.js, PostgreSQL and AWS, with two deployed projects. Looking for a back-end role in a team with strong code review.
3. **Projects** — above experience when they are your strongest evidence (early career or a stack change). For each: name, one line on what it does, **live link and repository**, the stack, and two or three bullets — something designed, something measured, something hard.
   > **Clinic Bookings** — appointment booking for small clinics · live link · repository
   > TypeScript · NestJS · PostgreSQL · Redis · Docker · AWS
   > - Prevented double bookings with a PostgreSQL exclusion constraint; concurrency tests reproduce and verify it.
   > - Cut availability search from 600 ms to 25 ms at 200,000 appointments with a composite index (query plans in the repository).
   > - Refresh-token rotation with reuse detection; 85 tests run on every push with GitHub Actions.
4. **Experience**: reverse chronological; company, title, dates; three or four **outcome** bullets per role.
5. **Skills**: grouped, honest, and only what you can discuss for ten minutes:
   > **Languages:** TypeScript, JavaScript, SQL, PHP · **Back end:** Node.js, NestJS, Express, REST, PostgreSQL, Redis · **Front end:** React, HTML, CSS · **Infrastructure:** Docker, AWS (EC2, RDS, S3, IAM), GitHub Actions, Linux, NGINX
6. **Education and certifications**: one or two lines each.

### Level 2 — Writing outcome bullets

A strong bullet has a **verb**, **what you did**, **what changed** and **context**:

> Reduced the monthly billing report from 40 seconds to under 3 by rewriting the query and adding two composite indexes, on a PHP/MySQL system serving about 2,000 users.

Only the person who did the work could write it, and it invites a follow-up question you can answer well ({{ch:query-optimization}}).

## Difficult material

### Level 3 — Writing about maintenance work

"Maintenance" describes the context, not the work. Find the outcomes by answering, from memory and your commit history:

- What was slow and is now faster? By roughly how much?
- What broke regularly and stopped breaking?
- What did someone do by hand that now happens automatically?
- What feature did you add that people use, and roughly how many?
- What bug took longest to find, and why?
- What did you change that made the code easier to work with?
- How big is the system — users, records, screens, requests?

Before and after:

> ~~Worked on bug fixes and new features for the company's web application.~~
>
> - Rebuilt the invoice generation flow that failed on about 15% of runs because of unhandled currency edge cases; failures stopped completely.
> - Automated the monthly report, replacing a manual process that took a colleague about four hours each month.
> - Maintained and extended a PHP/AngularJS system of about 60 screens used by around 2,000 customers, as the only developer on the product.

"Only developer on the product" is a real strength: it shows ownership and honestly explains why code review is missing from your experience.

### Level 3 — Estimate honestly, never invent

You probably did not measure everything at the time. Estimate, and say so: "roughly", "about", "around". Interviewers accept honest estimates and ask how you know. What you must never do is **invent** scale — claiming a million users on a system with two thousand collapses at the first follow-up question and destroys trust in everything else on the page.

### Level 3 — Gaps and short jobs

- **Gaps**: one short, factual line is enough ("career break for family reasons", "studying full time and building projects"), with what you did during it if relevant.
- **Short jobs**: be ready to explain them briefly and without blame; group short contracts under one heading if that is clearer.
- **No experience yet**: projects, open-source contributions, internships and relevant study become the main sections.

## Tailoring and machines

### Level 3 — Tailoring in a few minutes

Full rewrites for every application are not sustainable or necessary. For each advert:

1. Note the five main technologies and themes it names.
2. Reorder your skills so those appear first, using **the same names** ("Node.js", not "NodeJS").
3. Adjust the middle sentence of your summary to lead with what they emphasise.
4. Order project bullets so the most relevant comes first (schema and transactions for back-end roles, React work for full-stack roles).

### Level 3 — Applicant tracking systems

Larger companies use software that parses CVs before people read them. Avoid breaking it:

- No tables, columns, text in images, or important information in headers and footers.
- Standard fonts and section headings: "Experience", "Projects", "Education", "Skills".
- A PDF created from a text document rather than exported from a design tool.
- The exact technology names from the advert.

A plain, clean, machine-readable CV beats an elaborate design.

### Level 4 — Keep it current

Update your CV whenever something meaningful ships: a project goes live, a number improves, a new responsibility starts. Do not wait for a perfect version before applying — an early, honest version plus regular updates beats a perfect CV that is never sent ({{ch:applying}}).

## Talking about your CV

### Level 4 — Questions you will be asked

- **"Walk me through your CV."** About 90 seconds: where you started, what you did, what you built recently, what you want next ({{ch:speaking-about-your-work}}).
- **"You have three years, but I don't see much building. What did you actually do?"** Answer directly, without apology: "For three years I was the only developer on a legacy product — mostly maintenance and incremental features. I learned what makes code hard to change, and I wanted to build properly, so I built two projects end to end. Can I show you the bookings one?"
- **"Which of these technologies do you know best?"** Be specific and show the edge of your knowledge: "PostgreSQL — I can design schemas, read query plans and have done real index work with measurements. Redis I've used for caching and sessions, but not at large scale."
- **Any line on the page**: prepare three-deep answers ({{ch:how-hiring-works}}).

## From beginner to enterprise

**Level 1–2 — a readable CV.** One page in scan order; outcome bullets; grouped honest skills; a well-named PDF.

**Level 3 — strong evidence.** Projects above experience when appropriate; outcomes found in maintenance work; honest estimates; gaps handled briefly; quick tailoring; ATS-friendly formatting.

**Level 4 — a living document.** Regular updates; consistent with LinkedIn and GitHub; every line prepared for questioning.

**Level 5 — senior CVs.** Scope and impact across teams, leadership and decisions; still concise.

**Level 6 — the other side.** Reading CVs as a hiring manager: what signals predict good engineers, and avoiding bias.

## Real-world use cases

### The rewrite that changed the replies

- **Story**: an engineer sent dozens of applications with a two-page CV of duty bullets and fourteen technologies, and received almost no replies. A one-page version with two projects at the top, outcome bullets and six grouped skill areas produced several recruiter screens from the next batch of similar applications.

### The invented number

- **Story**: a candidate claimed an API "handling 1M requests per day". Asked how it was measured and what the peak per second was, they could not answer. The interviewer's note questioned every other claim on the CV.

## Common mistakes

### Beginner: two or more pages early in a career

**Fix:** one page.

### Beginner: duty bullets

**Fix:** verb, action, result, context.

### Beginner: listing everything ever touched

**Fix:** only what you can defend.

### Intermediate: invented or unverifiable numbers

**Fix:** honest estimates, clearly marked.

### Intermediate: design-heavy layouts

**Fix:** plain, parseable formatting.

### Intermediate: the same CV for every role

**Fix:** a few minutes of tailoring per application.

## Debugging and troubleshooting

- **No replies**: check the top third — does it match the roles? Are there concrete results and links? Are you applying to roles far beyond your evidence?
- **Replies for the wrong roles**: your title, summary and skills point elsewhere.
- **Interviewers ask about things you cannot explain well**: remove or deepen those items.
- **ATS problems** (applications vanish at large companies): simplify formatting; use advert keywords; apply through referrals too ({{ch:referrals-and-recruiters}}).

## Security summary

- **Do not include sensitive personal data** you do not need: ID numbers, full home address, date of birth.
- **Confidential employer information** (client names under agreement, internal metrics) should be generalised.
- **Be careful where you upload your CV**: use reputable job sites and official company portals.

## How a senior engineer thinks about this

- **Write for the scan, defend in the interview.**
- **Evidence beats adjectives.** Outcomes, numbers and links.
- **Honesty is the foundation.** Estimates are fine; invention is fatal.
- **Less is more.** Every line must earn its place.

## Exercises

### Exercise 1 — Fix the bullets

**Objective:** practise outcome bullets.
**What to do:** rewrite: (a) "Worked on the payment module"; (b) "Responsible for database management"; (c) "Did code reviews".

<details>
<summary>Show the solution</summary>

- (a) "Integrated a second payment provider as a fallback, so checkout kept working during the primary provider's outages; about 8% of payments now go through the fallback."
- (b) "Added indexes and rewrote the five slowest MySQL queries, cutting the dashboard load time from about 6 s to under 1 s; set up nightly backups with a tested restore procedure."
- (c) "Reviewed most pull requests for a team of four and introduced a short review checklist, after which bugs reaching production dropped noticeably."

Use only what is true; adjust numbers to honest estimates.

</details>

### Exercise 2 — Order the sections

**Objective:** practise structure.
**What to do:** an engineer has one year of agency experience on WordPress sites and two strong Node.js projects. What order should their CV use, and why?

<details>
<summary>Show the solution</summary>

Name and contact; a three-line factual summary (one year of agency work, moving to back-end TypeScript with two deployed projects); **projects first**, because they are the strongest evidence for back-end roles; then experience with outcome bullets (client delivery, performance fixes, any back-end work); skills grouped; education. The scan then sees relevant back-end evidence in the top third.

</details>

### Exercise 3 — Prepare for questioning

**Objective:** practise defending the CV.
**What to do:** pick the strongest bullet on your CV and write the three follow-up questions an interviewer is likely to ask, with your answers.

<details>
<summary>Show the solution</summary>

Example bullet: "Cut availability search from 600 ms to 25 ms with a composite index."
1. *How did you find the slow query?* — Request timing logs showed the endpoint's p95, then `EXPLAIN ANALYZE` showed a sequential scan.
2. *Why a composite index and in which column order?* — The query filtered by clinic and sorted by start time, so `(clinic_id, starts_at)` let PostgreSQL read rows already in order ({{ch:indexes}}).
3. *What does the index cost?* — Extra storage and slower inserts; bookings are read far more than written, so it was worth it, and I checked insert times stayed acceptable.

</details>

## Summary

CVs are **scanned** before they are read: reviewers check whether your recent role matches, your experience pattern, matching technologies and concrete evidence, mostly in the **top third of page one**. Use **one page**, in scan order: contact details, an optional factual summary, **projects** (above experience when they are your strongest evidence), experience with **outcome bullets**, grouped and defensible skills, and education — in a well-named PDF without unnecessary personal data.

Every bullet needs a verb, an action, a result and context. Maintenance work contains outcomes — faster, more reliable, automated, used, simpler — which you find by asking specific questions; **estimate honestly** and never invent scale. Handle gaps and short jobs briefly, **tailor** each application in minutes by reordering skills and bullets with the advert's exact keywords, keep formatting **ATS-friendly**, update the CV as work ships, and prepare to defend every line in interviews.

## Key terms

- **CV / résumé** — A short summary of professional experience used in hiring.
- **First pass** — The quick scan that decides whether a CV is read further.
- **Outcome bullet** — A CV line describing an action and its result.
- **Duty bullet** — A CV line describing responsibilities rather than results.
- **Tailoring** — Adjusting a CV to a specific job advert.
- **Applicant tracking system (ATS)** — Software that stores, parses and searches applications.
- **Keyword matching** — Comparing CV terms with the terms in an advert.
- **Employment gap** — A period without employment shown on a CV.

## What comes next

A good CV needs to reach the right people. The next chapter, {{ch:applying}}, covers applying for jobs effectively: finding roles, choosing targets, writing short cover messages, tracking applications, running a steady pipeline and learning from results.
