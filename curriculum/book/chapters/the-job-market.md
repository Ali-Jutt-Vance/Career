# Understanding the Job Market

> [!GOALS]
> - See the software job market as a map: the main **types of employers**, how they make money, and what that means for what they pay and expect.
> - Understand the Pakistani market specifically — tiers of companies, cities, referrals, salary questions, notice periods and bonds — and how it differs from advice written for the United States.
> - Know what actually moves you from one tier to the next.
> - Choose a technology stack and a target with the market in mind.
> - Read early application results correctly instead of losing confidence.

## Why this matters

Most job-hunting advice online is written for the American market: different processes, different salary structures, different signals. Following it blindly in another market produces confusing results — perfectly good applications to the wrong kind of company, preparation for interviews that are not asked, salary conversations handled in ways that backfire.

Before you send a single application, you need a map of the market you are actually in: who hires, what they need, how they hire, and where you fit. This chapter gives that map, with particular attention to Pakistan's software industry, where many readers of this book will start their careers, and with principles that apply anywhere. It builds on {{ch:how-hiring-works}} and leads into projects, portfolios and CVs.

## The simple idea

Job hunting without understanding the market is like fishing without knowing which fish live where. You can cast all day in the wrong lake. Knowing the market tells you which lakes exist, what lives in each, what bait each kind of fish takes, and which lake you can realistically fish in now.

> [!ANALOGY]
> Understanding the job market is like knowing which lakes have which fish: it tells you where to cast, what bait to use and what you can realistically catch now.
>
> **Where the analogy breaks:** lakes do not change while you fish. Job markets do — demand for skills, salaries and remote opportunities move every year, and your own position improves as you build skills and projects. Treat any map, including this one, as a starting point to correct with what you see in your own interviews.

## The proper definition and key words

The **software job market** is the set of employers seeking engineers and the engineers seeking work, with its own patterns of demand, pay, hiring processes and career paths.

Key words:

- **Product company** — builds and sells its own software product.
- **Service company / outsourcing / software house** — builds software for clients on contract.
- **Agency** — a small service company, often doing websites and apps for local or freelance clients.
- **Engineering office (captive centre)** — a local office of a foreign company, building that company's products.
- **Tier** — a rough grouping of employers by how they make money, how they hire and what they pay.
- **Band** — the salary range for a level.
- **Referral** — an employee recommending you for a role.
- **Notice period** — how long you must work after resigning.
- **Bond / training agreement** — a contract requiring you to stay for a period, with a penalty for leaving early.

## The shape of the market

### Level 1 — What kind of company is it?

The most useful question about an employer is **who its customer is and how it makes money**, because that decides what it needs from you:

| Type | Customer | What it values in engineers | Typical environment |
|---|---|---|---|
| **Small agency** | Local businesses, freelance-platform clients | Speed, versatility with whatever the client asked for | Few seniors, little code review, many small projects |
| **Large service company** | Foreign clients on contract | Reliable delivery, communication with clients, mainstream stacks | Real process, code review, seniors; architecture decided elsewhere |
| **Strong service firm / product company** | Demanding clients or their own users | Fundamentals, depth, design, ownership | Strong engineering culture, mentoring, real design work |
| **Product company at scale / international office** | Large user bases, global markets | Strong algorithms, system design, communication | Competitive hiring, high pay, high expectations |
| **Remote international employer** | Global | Independence, written communication, senior skills | Distributed teams, overlap hours ({{ch:remote-work}}) |

### Level 2 — The Pakistani market in tiers

A practical way to see Pakistan's software industry is four tiers. The figures below are **rough, approximate monthly ranges** for an engineer with about three years of experience, as observed in the mid-2020s; they change every year, so treat them as a map to correct from your own interviews, not as facts.

- **Tier 4 — small shops and agencies** (ten to forty people; local or freelance clients; often PHP, WordPress and older frameworks). Approximately PKR 50,000–120,000. Hiring is often a short conversation or a small task, sometimes decided by a non-technical owner. The main cost is learning: little review, few seniors, few standards.
- **Tier 3 — large service and outsourcing companies** (hundreds or thousands of engineers delivering to foreign clients). Approximately PKR 120,000–250,000. A real process — screening, a live coding interview of moderate difficulty, a manager or client-fit round — with continuous, high-volume hiring. A large improvement in environment: seniors, process and code review.
- **Tier 2 — strong service firms and product companies**. Approximately PKR 250,000–450,000. Four to five stages including deep technical rounds and system design ({{ch:how-hiring-works}}). They screen for **fundamentals you can defend**, not technologies you can list.
- **Tier 1 — product companies at scale and international engineering offices**. Approximately PKR 400,000–800,000 or more, sometimes with equity. The full loop: a strong algorithmic bar, system design, deep language questions and high communication standards, with long processes and high rejection rates.

Moving up one tier usually improves both pay and — more importantly — what you learn. A few years in a strong engineering environment shape a career far more than the same years without review or mentoring.

### Level 2 — How hiring runs in Pakistan

- **Referrals dominate**: a referred application is usually read by a person within days; a cold application on a portal may never be read. Referrals are the highest-return activity in a job search ({{ch:referrals-and-recruiters}}).
- **Salary is asked early and directly**: current salary questions often appear in the first call or on the application form. Prepare your answer before your first screening call ({{ch:the-salary-conversation}}).
- **Notice periods are long**: one month is standard, two common, three possible. Know your own contract's notice period, and expect offers to start one to three months after signing.
- **Bonds and training agreements** exist, especially at some large service companies. Read any clause about minimum service and penalties carefully before signing, and include it in your comparison of offers ({{ch:negotiating-offers}}).
- **Processes are relatively fast**: a few weeks from application to offer is common at service companies, somewhat longer at stronger firms.
- **Cities**: Lahore has the largest concentration and widest range of employers; Islamabad and Rawalpindi host many product companies and foreign engineering offices; Karachi has a large market with strengths in finance and enterprise. Outside the main cities, look for genuinely remote roles. Hybrid work with some office days is common.

## Moving up

### Level 3 — What actually moves you up a tier

It is rarely more technologies on the CV — a list of fourteen technologies reads as a warning, because nobody can defend fourteen. It is rarely certifications alone — a certificate matters when attached to something you built and can explain ({{ch:aws-certification}}). In order of weight, what bridges the gap is:

1. **Two real projects you built and deployed and can explain in depth** for twenty minutes — the single biggest differentiator ({{ch:projects-that-prove-skill}}).
2. **Fundamentals you can produce without help**: writing a function from an empty file, explaining what happens underneath, designing a schema on a whiteboard.
3. **Database depth**: reading a query plan and explaining an index makes you memorable, because it is the most commonly under-prepared area ({{ch:query-optimization}}).
4. **Clear English under pressure**: many strong employers serve foreign clients; a candidate who explains clearly often beats one who codes slightly better but cannot ({{ch:explaining-technical-work}}).

Years of experience, university and your previous stack matter mostly at the screening stage.

### Level 3 — Choosing a stack and a target

- **JavaScript and TypeScript across the stack** (Node.js, React) form one of the largest hiring areas in Pakistan and internationally, which is why this book uses them. **Java and .NET** are strong in enterprise and finance with comparable pay; **Python** is strong in data and AI work.
- **Depth beats breadth**: one stack known deeply, with transferable fundamentals (HTTP, databases, testing, system design), is worth more than five known superficially.
- **Switching stacks is not wasted experience**: explain what your previous work taught you — for example, that maintaining a legacy system taught you what makes code expensive to change — and show the new stack through projects. Never be defensive about older technologies; most interviewers have maintained some.
- **Pick a realistic next step**: the tier above your current one, with a path to the next after a year or two of strong experience. Aiming two tiers up at once is possible but needs more preparation.

### Level 4 — Reading your early results

- Of your first ten applications, **zero or one reply is normal**. Job searching works on volume and time; meaningful signal appears after dozens of well-targeted applications, not ten ({{ch:applying}}).
- **Diagnose by stage**: no replies → CV or targeting problem ({{ch:the-cv}}); screens but no technical passes → interview practice ({{ch:technical-interview-guide}}); late-stage rejections → behavioural stories, communication or negotiation.
- **Update your map**: every interview tells you real ranges, real questions and real expectations. Write them down.

## From beginner to enterprise

**Level 1–2 — knowing the market.** Types of employers and what they value; tiers and approximate ranges; referrals, salary questions, notice periods and bonds.

**Level 3 — positioning.** What moves you up a tier; choosing a stack and a realistic target; turning previous experience into a strength.

**Level 4 — running the search.** Reading early results correctly; diagnosing by stage; updating your map from real interviews.

**Level 5 — long-term strategy.** Planning moves across tiers over several years; considering remote and international options; building a reputation that brings opportunities to you ({{ch:portfolio-and-brand}}).

**Level 6 — the other side.** Understanding the market as a hiring manager: competing for talent, setting bands, building teams.

## Real-world use cases

### The two-step move

- **Story**: an engineer at a small agency aimed directly at large product companies and was rejected repeatedly at algorithm rounds. They changed plan: built two deployed projects, deepened database knowledge, joined a strong service firm with good code review, and two years later interviewed successfully at a product company with a recognisable name on their CV.

### The bond clause

- **Story**: an offer from a large service company looked better than another by a small margin, but included a two-year bond with a penalty of several months' salary. Comparing total value and flexibility, the engineer chose the other offer — and asked the first company whether the bond was negotiable, which it partly was.

## Common mistakes

### Beginner: applying everywhere without knowing the type of company

**Fix:** know each target's customer, stack and tier.

### Beginner: a CV with every technology ever touched

**Fix:** depth in a few, defended with projects.

### Beginner: improvising salary answers

**Fix:** prepare before the first call.

### Intermediate: ignoring referrals

**Fix:** make referrals your main channel.

### Intermediate: signing bonds without reading them

**Fix:** read and price every clause.

### Intermediate: concluding "the market rejected me" after a few applications

**Fix:** judge after enough volume, and diagnose by stage.

## Debugging and troubleshooting

- **No replies at all**: CV not matching the advert, applying far above your evidence, cold applications only.
- **Replies only from low-paying tiers**: your evidence (projects, fundamentals) does not yet support the next tier; build it.
- **Offers below expectations**: research ranges from interviews and people in the industry; improve negotiation preparation.
- **Few opportunities in your city**: remote roles, relocation or hybrid roles with occasional travel.

## Security summary

- **Fake job offers and recruitment scams** exist: never pay to apply, verify companies, and be careful with personal documents until an offer is real.
- **Read contracts carefully**: bonds, confidentiality, non-compete and intellectual-property clauses.
- **Protect your current employer's confidential information** in interviews and take-home tasks.

## How a senior engineer thinks about this

- **Know what each employer needs**, and show them that.
- **Optimise for learning early**, pay follows strong environments.
- **Depth and evidence beat lists.**
- **Markets change**: keep your map current from real conversations.

## Exercises

### Exercise 1 — Classify your targets

**Objective:** practise market mapping.
**What to do:** list ten companies you might apply to. For each, write its type (agency, service, product, international office), customers, main stack, and the tier you think it is.

<details>
<summary>Show the solution</summary>

A useful table has columns: company, type, customers, stack, tier estimate, referral route (yes/no and who), and notes from their careers page or engineering blog. Fill gaps by reading job adverts, LinkedIn profiles of their engineers and their public engineering content. The table usually shows that a few companies match your evidence and goals best — focus on those, and find referral routes into them first.

</details>

### Exercise 2 — Explain your move

**Objective:** prepare the "why are you leaving?" answer.
**What to do:** write a 90-second answer for an engineer leaving a small agency after three years of maintaining a legacy PHP system.

<details>
<summary>Show the solution</summary>

"For three years I've maintained and extended a legacy PHP and AngularJS product, mostly on my own. I learned a lot about what makes a codebase expensive to change, and about keeping a live system running for real customers. What I haven't had is code review and senior engineers to learn from, and I've realised that matters more for my next few years than anything else. Over the past months I've moved to TypeScript, Node.js, PostgreSQL and AWS, and built two projects that are deployed and documented. I'm looking for a team where I can do serious engineering with good review — which is why this role interests me."

No criticism of the employer; it explains the gap and ends on action.

</details>

### Exercise 3 — Diagnose the search

**Objective:** practise reading results.
**The situation:** after 60 applications you have 6 recruiter screens, 4 technical screens and 0 offers; feedback twice mentioned "struggled to explain the project". What do you change?

<details>
<summary>Show the solution</summary>

The CV and targeting work (screens are happening). The problem is in the technical stages, specifically explaining projects. Prepare a structured project walkthrough (problem, design, schema, hard part, trade-offs, what you would change), practise it aloud and record yourself ({{ch:speaking-about-your-work}}); build three-deep answers for every CV item; do mock interviews with another engineer. Keep applying at the same volume while practising.

</details>

## Summary

The job market is a map of employers who differ mainly by **who their customer is and how they make money** — agencies, service companies, strong service and product firms, large product companies and international offices, and remote employers — which decides what they pay, how they hire and what you learn there. Pakistan's market can be seen in four **tiers**, from small agencies to large product companies and international offices, with approximate pay ranges that rise sharply between tiers and change every year. **Referrals** dominate, **salary is asked early**, **notice periods** are long, **bonds** need careful reading, processes are relatively fast, and cities differ.

Moving up a tier depends on **deployed projects you can explain deeply**, **fundamentals without help**, **database depth** and **clear English under pressure**, not on long lists of technologies or certificates alone. Choose a stack with large demand and learn it deeply, present previous experience as a strength, aim for a realistic next step, and read early application results by volume and stage, updating your map from every real interview.

## Key terms

- **Software job market** — Employers and engineers exchanging work, with its patterns of demand and pay.
- **Product company** — A company that builds its own software products.
- **Service company** — A company that builds software for clients.
- **Software house** — A common term for a service company, especially in South Asia.
- **Engineering office** — A local office building a foreign company's products.
- **Tier** — A rough grouping of employers by business model, hiring and pay.
- **Salary band** — The pay range for a role and level.
- **Referral** — A recommendation from an employee of the hiring company.
- **Notice period** — The time you must work after resigning.
- **Bond** — A contract requiring you to stay for a minimum period, with penalties for leaving early.
- **Hybrid work** — Working partly in the office and partly remotely.

## What comes next

The strongest evidence you can bring to any employer is something you built. The next chapter, {{ch:projects-that-prove-skill}}, shows how to choose, build, deploy and document projects that prove real engineering skill — and how to talk about them in interviews.
