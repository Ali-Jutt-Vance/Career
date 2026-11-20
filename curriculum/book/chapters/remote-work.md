# Remote Work

> [!GOALS]
> - Understand the kinds of remote work — remote-friendly versus remote-first, employee versus contractor — and what employers worry about.
> - Find legitimate remote roles and recognise scams.
> - Present yourself for remote work: CV, portfolio, communication evidence and time-zone plans.
> - Work effectively at a distance: asynchronous communication, written updates, overlap hours, visibility and boundaries.
> - Handle contracts, payments and taxes sensibly, with professional advice where needed.

## Why this matters

Remote work opened the global market to engineers wherever they live. An engineer in Lahore or Karachi can work for a company in London, Berlin, Dubai or San Francisco, often for considerably more than local salaries, without moving. For many engineers, especially in markets like Pakistan, international remote work is one of the biggest career and financial steps available.

It is also demanding. Remote employers hire people they cannot see, so they look hard at independence, reliability and — above all — written communication. Remote engineers must manage time zones, stay visible, protect their working hours and handle contracts and payments across borders. This chapter covers how to get remote roles and how to succeed in them; it closes Part XIV and connects strongly to the communication chapters in Part XV, especially {{ch:written-english}}.

## The simple idea

Working remotely is like being part of a team that shares a building but works on different floors with different opening hours. You cannot lean over to ask a question or overhear what others are doing. So you leave clear notes, keep a shared noticeboard up to date, agree on the hours when everyone is in, and make sure people can see your work without having to look for you.

> [!ANALOGY]
> Remote work is like a team on different floors with different hours: no leaning over to ask, so clear notes, shared boards and agreed overlap hours do the work of the office.
>
> **Where the analogy breaks:** in a building you can always walk upstairs. Remotely, a question asked at the end of your day may not be answered until your next morning — so unclear messages cost a whole day each, and good written communication becomes the most valuable skill you have.

## The proper definition and key words

**Remote work** is doing your job from a location other than the employer's office, usually from home, coordinating with colleagues through digital tools.

Key words:

- **Remote-first** — the company is organised around remote work: written decisions, asynchronous processes, everyone equal regardless of location.
- **Remote-friendly** — an office-centred company that allows some remote employees.
- **Fully remote / hybrid** — no office / some office days.
- **Asynchronous (async) communication** — messages and documents that do not need everyone present at the same time.
- **Synchronous communication** — meetings and calls.
- **Overlap hours** — working hours shared with your team.
- **Employee of record (EOR)** — a service that legally employs you on behalf of a foreign company.
- **Contractor / freelancer** — working under a service contract rather than as an employee.

## Getting remote work

### Level 1 — What remote employers worry about

- **Communication**: will this person's messages, documents and pull requests be clear without a conversation?
- **Independence**: will they make progress without someone checking, and ask for help at the right time?
- **Reliability**: will they be online when they say, deliver what they promise and raise problems early?
- **Time zones**: when can we actually talk?
- **Skill level**: remote roles often hire experienced engineers, because there is less hands-on mentoring.

Your application should answer each worry with evidence.

### Level 1 — Where to find roles

- **LinkedIn Jobs** with remote filters and the countries you can work for; recruiters' and engineering managers' posts.
- **Remote job boards** that specialise in remote roles (for example We Work Remotely, Remotive, Himalayas); start-up job platforms.
- **Companies known for remote-first work**, many of which publish their remote practices and handbooks — check their careers pages.
- **Regional options with closer time zones**: companies in the Gulf and Europe often have good overlap with Pakistan.
- **Referrals** from engineers already working remotely — as everywhere, the strongest channel ({{ch:referrals-and-recruiters}}).
- **Freelance work** leading to long-term contracts, for some engineers.

### Level 2 — Present yourself for remote work

- **CV**: state that you have worked remotely or asynchronously if you have; highlight independent ownership, written documentation and collaboration across teams ({{ch:the-cv}}).
- **Portfolio**: case studies and READMEs are evidence of written communication ({{ch:portfolio-and-brand}}).
- **Communication samples**: design documents, blog posts and clear pull request descriptions in your public projects.
- **Time-zone plan**: say exactly when you will overlap with their team.
- **Cover message**: short, specific, and itself an example of clear writing ({{ch:applying}}).

### Level 2 — Planning overlap hours

Overlap depends on both time zones **and** daylight-saving changes in the employer's country. This example uses the real time-zone database to compute shared hours for an engineer working 11:00–20:00 Pakistan time with teams working 9:00–17:00 local time, in winter and summer:

```ts
// Working-hours overlap between Pakistan and a team elsewhere, on a given date, using the real
// time-zone database (so daylight-saving changes are handled for you).
function hourIn(zone: string, utc: Date): number {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: zone, hour: "numeric", hourCycle: "h23" }).formatToParts(utc);
  return Number(parts.find((p) => p.type === "hour")!.value);
}
function overlap(day: string, mine: { zone: string; start: number; end: number }, theirs: { zone: string; start: number; end: number }) {
  const hours: { pk: number; local: number }[] = [];
  for (let h = 0; h < 24; h++) {
    const utc = new Date(`${day}T${String(h).padStart(2, "0")}:00:00Z`);
    const a = hourIn(mine.zone, utc), b = hourIn(theirs.zone, utc);
    if (a >= mine.start && a < mine.end && b >= theirs.start && b < theirs.end) hours.push({ pk: a, local: b });
  }
  return hours;
}
const me = { zone: "Asia/Karachi", start: 11, end: 20 };            // a shifted working day, 11:00-20:00 Pakistan time
for (const [team, zone] of [["London", "Europe/London"], ["Berlin", "Europe/Berlin"], ["New York", "America/New_York"], ["Dubai", "Asia/Dubai"]] as const) {
  for (const day of ["2026-01-15", "2026-07-15"]) {
    const h = overlap(day, me, { zone, start: 9, end: 17 });
    const range = h.length ? ` — ${h[0]!.pk}:00-${h.at(-1)!.pk + 1}:00 Pakistan, ${h[0]!.local}:00-${h.at(-1)!.local + 1}:00 ${team}` : "";
    console.log(`${team.padEnd(8)} ${day}: ${h.length} shared hour${h.length === 1 ? "" : "s"}${range}`);
  }
}
```

**Output:**

```text
London   2026-01-15: 6 shared hours — 14:00-20:00 Pakistan, 9:00-15:00 London
London   2026-07-15: 7 shared hours — 13:00-20:00 Pakistan, 9:00-16:00 London
Berlin   2026-01-15: 7 shared hours — 13:00-20:00 Pakistan, 9:00-16:00 Berlin
Berlin   2026-07-15: 8 shared hours — 12:00-20:00 Pakistan, 9:00-17:00 Berlin
New York 2026-01-15: 1 shared hour — 19:00-20:00 Pakistan, 9:00-10:00 New York
New York 2026-07-15: 2 shared hours — 18:00-20:00 Pakistan, 9:00-11:00 New York
Dubai    2026-01-15: 7 shared hours — 11:00-18:00 Pakistan, 10:00-17:00 Dubai
Dubai    2026-07-15: 7 shared hours — 11:00-18:00 Pakistan, 10:00-17:00 Dubai
```

- `Intl.DateTimeFormat` with a `timeZone` converts each UTC hour to local time using the time-zone database, including **daylight saving**: London and Berlin move their clocks in summer, so overlap grows by an hour; Pakistan and Dubai do not change.
- **UK and Europe** give most of a working day of overlap with a modest shift; **the Gulf** overlaps almost completely; **the US East Coast** gives only one or two hours unless you work late into the evening — which some engineers do, by agreement, for a few days a week.
- State your plan concretely in interviews: "I work 11:00 to 20:00 Pakistan time, which overlaps with your team from 9:00 to 15:00 London time in winter; I can join occasional later calls for important meetings."
- Never store or compare times in local time inside systems; store UTC and convert for display — the same lesson applies to software ({{ch:cron-jobs}}).

### Level 3 — Avoiding scams

Warning signs:

- An offer **without any interview**, or a salary wildly above the market.
- Requests to **pay** for anything: training, equipment, background checks, "processing".
- Requests for **bank details or ID documents** before a genuine offer.
- Communication only through personal email addresses or messaging apps for a "serious" role; no company website, no LinkedIn employees, no verifiable history.
- Requests to install unusual software or handle money transfers.

Verify: real employees on LinkedIn, a company domain email, independent reviews, the role on the company's own careers page. A legitimate process has a recruiter call, technical interviews and a written offer naming salary, start date and manager ({{ch:how-hiring-works}}).

## Working remotely

### Level 3 — Async communication

- **Write complete messages**: context, the question, what you have tried, what you need and by when. "Hi" followed by silence wastes a day across time zones.
- **Daily or regular written updates**: what you did, what you will do, anything blocking you.
- **Document decisions** in shared places (tickets, design documents, pull requests), not only in calls.
- **Clear pull request descriptions**: what, why, how to test, screenshots where useful ({{ch:code-review-and-documentation}}).
- **Respond predictably**: people should know when they will hear from you.

### Level 3 — Visibility and trust

- **Show progress** through small, frequent pull requests and updates; silence for days looks like no progress, even when you are working hard.
- **Raise problems early**: "I'm blocked on X; I've tried Y; I'll try Z unless you suggest otherwise."
- **Be reliable** about availability: tell the team when you are offline, on holiday or have a public holiday they may not know.
- **Use video calls well**: good audio, camera on when the team does, prepared agendas ({{ch:small-talk}}, {{ch:speaking-about-your-work}}).
- **Build relationships**: short informal conversations matter even more remotely.

### Level 4 — Contracts, payments and tax

- **Employment models**: direct employment (rare across borders), **employer-of-record** employment (a local legal employer on behalf of the foreign company, with local benefits), or **contractor** agreements (you invoice; fewer benefits and protections).
- **Payments**: bank transfers and payment services; understand fees, exchange rates and how long transfers take. Pakistan's rules on foreign remittances and freelancer income can change, so check current regulations.
- **Taxes**: income from foreign employers is generally taxable where you live; rules for freelancers and exporters of IT services can have special rates or registration requirements. Take advice from a qualified local tax adviser rather than relying on online posts.
- **Contract terms**: payment schedule, notice periods, intellectual property, confidentiality, equipment, holidays and what happens if the client is late paying.
- **Savings**: contractors should plan for gaps between contracts and for benefits an employer would normally provide (health insurance, retirement).

### Level 4 — Sustainable remote work

- **A dedicated workspace**, reliable internet and a backup (mobile data, power backup for load-shedding where relevant).
- **Boundaries**: fixed working hours, especially with evening overlap; avoid answering messages all day and night.
- **Routines and breaks**: movement, real lunch, an end-of-day ritual.
- **Loneliness**: communities, co-working spaces, local meetups and friends in the industry help.

## From beginner to enterprise

**Level 1–2 — getting remote roles.** Understanding employer concerns; finding legitimate roles; presenting communication evidence and an overlap plan.

**Level 3 — working well remotely.** Async-first communication; written updates; visible progress; early warnings; reliable availability; scam awareness.

**Level 4 — sustainable remote careers.** Contracts, payments and tax with professional advice; boundaries and routines; relationships at a distance.

**Level 5 — senior remote engineers.** Leading through writing (design documents, decision records), mentoring remotely, and shaping team processes ({{ch:technical-leadership}}).

**Level 6 — remote organisations.** Building remote-first cultures, handbooks and processes across time zones.

## Real-world use cases

### The update that built trust

- **Story**: a remote engineer working with a team six hours away posted a short written update at the end of each day: done, next, blocked. Within weeks, the team lead said they trusted the engineer's progress more than colleagues in the office, because it was always visible.

### The fake offer

- **Story**: an engineer received a "remote developer" offer without an interview, with a salary far above the market, asking them to buy a laptop from a "partner store" to be reimbursed later. Searching the company found no employees and no website history. It was a scam; the engineer reported it and moved on.

## Common mistakes

### Beginner: vague messages across time zones

**Fix:** complete messages with context and the question.

### Beginner: no overlap plan

**Fix:** state your working hours and overlap clearly.

### Beginner: ignoring scam signs

**Fix:** never pay; verify companies.

### Intermediate: invisible progress

**Fix:** small pull requests and regular written updates.

### Intermediate: always online

**Consequence:** burnout. **Fix:** agreed hours and boundaries.

### Intermediate: ignoring tax and contracts

**Fix:** read contracts; get professional tax advice.

## Debugging and troubleshooting

- **Many remote applications, no replies**: more communication evidence (case studies, writing), referrals, closer time zones, or roles matching your seniority.
- **Feedback that you are "hard to reach"**: publish working hours, respond within agreed times, set status messages.
- **Misunderstandings**: write decisions down; confirm understanding in writing after calls ({{ch:written-english}}).
- **Late payments as a contractor**: clear payment terms in contracts; invoices on time; follow up professionally.

## Security summary

- **Verify employers**; never pay for jobs; protect ID and bank documents until a genuine offer.
- **Secure your devices**: disk encryption, screen locks, updates, password manager, multi-factor authentication.
- **Follow the company's security policies**: VPNs, approved devices, no company data on personal storage.
- **Public networks**: avoid sensitive work on untrusted Wi-Fi without the company VPN.

## How a senior engineer thinks about this

- **Writing is the job.** Remote work runs on clear, complete written communication.
- **Make progress visible.** Trust follows evidence.
- **Plan time deliberately.** Overlap for collaboration, focus time for work, boundaries for life.
- **Protect yourself.** Verify, read contracts, take professional advice.

## Exercises

### Exercise 1 — Write an async message

**Objective:** practise remote communication.
**The situation:** you are blocked because a staging database migration failed; your team lead starts work four hours after you finish. Write the message.

<details>
<summary>Show the solution</summary>

"Hi Anna — the migration `0042_add_order_index` failed on staging with 'could not create unique index — duplicate key value' (log link). There are duplicate rows in `orders.external_ref` from the old import. I've written a query that lists them (link) — 37 rows. Options: (1) delete the older duplicates, or (2) make the index non-unique for now. I'd suggest (1) after a backup, but it touches order data, so I'd like your OK. Meanwhile I'm continuing with the API changes that don't depend on the migration. I'll check messages at the start of my day tomorrow."

Context, evidence, options, a recommendation, what you are doing meanwhile, and when you will respond.

</details>

### Exercise 2 — Plan your overlap

**Objective:** practise time-zone planning.
**What to do:** using the chapter's output, propose working hours for a role with a Berlin team that holds stand-ups at 10:00 Berlin time.

<details>
<summary>Show the solution</summary>

10:00 Berlin is 14:00 Pakistan time in winter and 13:00 in summer. Working 12:00–21:00 or 11:00–20:00 Pakistan time covers the stand-up all year and gives seven to eight hours of overlap. State it: "I'll work 11:00 to 20:00 Pakistan time, which covers your stand-up and overlaps until 16:00 or 17:00 Berlin time depending on daylight saving."

</details>

### Exercise 3 — Spot the scam

**Objective:** practise verification.
**The message:** "Congratulations! You have been selected as Senior Developer at Global Tech Solutions, $150/hour, no interview required. Please send your CNIC copy and bank details to hr.globaltech@gmail.com to process your first payment." What do you do?

<details>
<summary>Show the solution</summary>

Treat it as a scam: no interview, an unrealistic rate, a personal email address, and requests for ID and bank details before any genuine process. Do not reply with documents. Search for the company and its employees; you will likely find nothing credible. Report or block the sender, and warn others in your community if appropriate.

</details>

## Summary

Remote work gives engineers access to global employers, but remote employers worry about communication, independence, reliability, time zones and skill, and look for evidence of each. Find roles through LinkedIn, remote job boards, remote-first companies, regions with good time-zone overlap and — best — referrals; present written communication evidence and a concrete **overlap plan**, computed with real time-zone data including daylight saving. Recognise **scams**: offers without interviews, unrealistic pay, requests for money, documents or bank details early, and unverifiable companies.

Work **async-first**: complete messages, regular written updates, documented decisions and clear pull requests; keep progress visible, raise problems early, be reliable about availability and build relationships. Understand **employment models** (employer of record, contractor), payments and fees, and take qualified advice on **tax** and contracts. Protect your devices and your boundaries with a proper workspace, backups for internet and power, fixed hours and routines.

## Key terms

- **Remote work** — Working away from the employer's office.
- **Remote-first** — A company organised around remote work.
- **Remote-friendly** — An office-centred company allowing some remote work.
- **Hybrid work** — A mix of office and remote days.
- **Asynchronous communication** — Communication that does not require simultaneous presence.
- **Overlap hours** — Working hours shared across time zones.
- **Daylight saving time** — Seasonal clock changes in some countries.
- **Employer of record (EOR)** — A company that legally employs workers on behalf of another.
- **Contractor** — A person providing services under contract rather than employment.
- **Remittance** — Money sent from abroad.

## What comes next

Part XV focuses on the skill that runs through every chapter of Part XIV: communication in English. The next chapter, {{ch:speaking-about-your-work}}, starts with speaking about your work — introducing yourself, describing projects and explaining what you do clearly and confidently.
