# Preparing for the AWS Solutions Architect Exam

> [!GOALS]
> - Decide whether an AWS certification is worth it for you, and which one to take first.
> - Understand the **Solutions Architect – Associate** exam: its domains, format and the kind of thinking it tests.
> - Build a study plan that combines reading, **hands-on practice** and practice exams.
> - Read scenario questions well: requirement keywords, elimination, and the "most AWS-native" answer.
> - Use the certification honestly in your CV and interviews, alongside real projects.

## Why this matters

Many job adverts for back-end and cloud roles list AWS experience, and some — especially at consultancies, AWS partners and companies in regulated industries — ask for certifications. The **AWS Certified Solutions Architect – Associate** is the most widely recognised AWS certification. It shows that you can choose and combine AWS services into secure, resilient, performant and cost-effective designs: exactly the material in this part of the book.

A certification is not a substitute for experience. Hiring managers know that people can pass exams without having built anything. But it gives structure to learning, fills gaps you would not meet in one job, gets your CV past keyword filters ({{ch:the-cv}}), and gives you a shared vocabulary for system design interviews ({{ch:system-design-fundamentals}}). Studied properly — with hands-on practice — it makes you a better engineer, not just a certificate holder.

## The simple idea

Preparing for the exam is like preparing for a driving test. You study the rules, but you mainly pass by **driving** — lots of practice in real traffic — and by doing mock tests until you recognise the situations examiners like. The test checks judgement: what to do in this situation, with these constraints.

> [!ANALOGY]
> Preparing for the AWS exam is like preparing for a driving test: rules matter, but practice and mock tests are what make you pass.
>
> **Where the analogy breaks:** passing a driving test means you may drive alone. Passing the AWS exam does not mean you can run production systems alone — it tests choosing services from descriptions, not debugging a failing deployment at 3 a.m. Treat it as a map of the territory, and keep building real things.

## The proper definition and key words

**AWS Certifications** are exams from Amazon Web Services at Foundational, Associate, Professional and Specialty levels. The **Solutions Architect – Associate** (exam code SAA-C03 at the time of writing) tests designing solutions on AWS across four **domains**.

Key words:

- **Exam guide** — AWS's official document listing domains, task statements and in-scope services. Always read the current version.
- **Domain** — a weighted area of the exam.
- **Scenario question** — a short story with requirements, asking for the best solution.
- **Multiple choice / multiple response** — one correct answer / two or more correct answers.
- **Scaled score** — results reported from 100 to 1,000; the pass mark for this exam is 720.
- **Unscored questions** — questions AWS is testing for future exams, mixed in and not counted.
- **Recertification** — certifications are valid for three years.

## The exam

### Level 1 — Which certification first?

| Certification | For |
|---|---|
| Cloud Practitioner (Foundational) | People new to cloud or in non-technical roles; optional for engineers |
| **Solutions Architect – Associate** | Most back-end and cloud engineers: the broadest, most recognised |
| Developer – Associate | Engineers focused on serverless, SDKs, CI/CD and application integration |
| SysOps Administrator – Associate | Operations-focused roles |
| Professional and Specialty | Experienced engineers going deeper (architecture, DevOps, security, networking, data, machine learning) |

For a back-end engineer, the Solutions Architect – Associate is usually the best first choice; the Cloud Practitioner can be skipped if you have worked through this part of the book.

### Level 1 — Format and domains

At the time of writing, the exam has **65 questions** (50 scored, 15 unscored) in **130 minutes**, is taken at a test centre or online with a proctor, and is passed with a scaled score of **720**. The domains and their weights:

| Domain | Weight | What it covers | Chapters |
|---|---|---|---|
| Design secure architectures | 30% | IAM, roles and policies, encryption with KMS, network security, data protection | {{ch:iam}}, {{ch:vpc}}, {{ch:secrets-manager}} |
| Design resilient architectures | 26% | Multi-AZ and multi-region designs, decoupling with queues, backups and disaster recovery | {{ch:rds}}, {{ch:sns-sqs}}, {{ch:route53}} |
| Design high-performing architectures | 24% | Choosing compute, storage, databases and caching; scaling; content delivery | {{ch:ec2}}, {{ch:auto-scaling}}, {{ch:cloudfront}} |
| Design cost-optimised architectures | 20% | Pricing models, storage classes, right-sizing, data transfer | {{ch:cost-optimization}}, {{ch:s3}} |

AWS updates exams every few years. Before studying, **download the current exam guide** from the AWS certification site and check the version, domains and service list.

### Level 2 — How questions work

Almost every question is a **scenario** with constraints, and several options are technically possible. The exam asks for the one that fits **all** the constraints best. Requirement words decide the answer:

- **"MOST cost-effective"**, **"LEAST operational overhead"**, **"highly available"**, **"fault tolerant"**, **"lowest latency"**, **"with minimal changes to the application"**, **"securely"**, **"in near real time"**, **"decouple"**.
- "Least operational overhead" usually points to **managed** or **serverless** services and built-in features over custom code.
- "Highly available" means **multiple availability zones**; "disaster recovery across regions" means **multi-region** with replication.

This example applies that method to a typical storage question, then uses practice-exam results to decide what to study next:

```ts
// Reading a scenario question: underline the requirement words, then eliminate options that break them.
type Option = { letter: string; text: string; traits: string[] };
const question = {
  scenario: "A company stores uploaded invoices in S3. Invoices are read often for 30 days, rarely after that, " +
    "and must be kept for 7 years. The solution must be the MOST cost-effective and require the LEAST operational effort.",
  requirements: ["cost-effective", "least-operations", "keeps-7-years", "fast-reads-first-30-days"],
};
const options: Option[] = [
  { letter: "A", text: "Keep everything in S3 Standard", traits: ["least-operations", "keeps-7-years", "fast-reads-first-30-days"] },
  { letter: "B", text: "Lifecycle rule: Standard, then Standard-IA after 30 days and Glacier Flexible Retrieval after 1 year, expire after 7 years",
    traits: ["cost-effective", "least-operations", "keeps-7-years", "fast-reads-first-30-days"] },
  { letter: "C", text: "A nightly Lambda that copies old invoices to Glacier and deletes them from Standard",
    traits: ["cost-effective", "keeps-7-years", "fast-reads-first-30-days"] },
  { letter: "D", text: "Store invoices on an EBS volume attached to an EC2 instance", traits: ["fast-reads-first-30-days"] },
];
for (const o of options) {
  const missing = question.requirements.filter((r) => !o.traits.includes(r));
  console.log(`${o.letter}: ${missing.length === 0 ? "meets every requirement" : `fails: ${missing.join(", ")}`}`);
}

// A simple study tracker: score practice exams by domain to decide what to study next
const weights = { "Secure architectures": 0.30, "Resilient architectures": 0.26, "High-performing architectures": 0.24, "Cost-optimised architectures": 0.20 };
const practice: Record<keyof typeof weights, { correct: number; total: number }> = {
  "Secure architectures": { correct: 14, total: 20 },
  "Resilient architectures": { correct: 15, total: 17 },
  "High-performing architectures": { correct: 13, total: 16 },
  "Cost-optimised architectures": { correct: 7, total: 12 },
};
let weighted = 0;
const ranked = (Object.keys(weights) as (keyof typeof weights)[])
  .map((d) => {
    const pct = practice[d].correct / practice[d].total;
    weighted += pct * weights[d];
    return { d, pct, lost: (1 - pct) * weights[d] };       // points lost, weighted by the domain's share
  })
  .sort((a, b) => b.lost - a.lost);
for (const r of ranked) console.log(`${r.d.padEnd(30)} ${(r.pct * 100).toFixed(0).padStart(3)}%   weighted points lost ${(r.lost * 100).toFixed(1)}`);
console.log(`weighted practice score: ${(weighted * 100).toFixed(1)}%  -> study "${ranked[0]!.d}" first`);
```

**Output:**

```text
A: fails: cost-effective
B: meets every requirement
C: fails: least-operations
D: fails: cost-effective, least-operations, keeps-7-years
Secure architectures            70%   weighted points lost 9.0
Cost-optimised architectures    58%   weighted points lost 8.3
High-performing architectures   81%   weighted points lost 4.5
Resilient architectures         88%   weighted points lost 3.1
weighted practice score: 75.1%  -> study "Secure architectures" first
```

- **Option A** works but is expensive for data read rarely; **C** saves money but adds custom code to run and monitor — S3 lifecycle rules already do this; **D** is neither durable storage for seven years nor cheap. **B** meets every requirement with a built-in feature: the typical "right" answer ({{ch:s3}}).
- Writing the requirements down and checking each option against **all** of them is the most reliable technique; most wrong answers fail exactly one requirement.
- The study tracker weights each domain's mistakes by the domain's share of the exam. Cost optimisation had the lowest percentage, but security lost more points because it is worth 30%: study the domain that costs you the most points first.

## Studying

### Level 2 — A study plan

A realistic plan for someone who has worked through this part of the book takes several weeks of regular study:

1. **Read the exam guide** and list the services in scope; mark the ones you have not used.
2. **Learn by building** in your own account (with budget alerts and cleanup, {{ch:aws-overview}}): a VPC with public and private subnets; an ALB with an auto scaling group or ECS service; RDS Multi-AZ; S3 with lifecycle rules and a CloudFront distribution; SQS with a DLQ and a Lambda consumer; IAM roles and policies; CloudWatch alarms. Use infrastructure as code so you can destroy and recreate it ({{ch:terraform}}).
3. **Follow a structured course** or AWS Skill Builder's official exam preparation, and read AWS's **Well-Architected Framework** — its six pillars (operational excellence, security, reliability, performance efficiency, cost optimisation, sustainability) are the exam's way of thinking.
4. **Practice exams**: take one early to find gaps; review **every** explanation, including for questions you answered correctly; keep a notebook of mistakes and the rule behind each.
5. **Spaced review**: flashcards for comparisons that are easy to mix up (storage classes, database choices, load balancer types, Savings Plans versus Reserved Instances versus Spot).
6. **Book the exam** when practice scores are consistently above about 80%.

### Level 3 — Comparisons the exam loves

| Topic | Know the differences between |
|---|---|
| Storage | S3 classes (Standard, Intelligent-Tiering, IA, Glacier tiers); EBS vs EFS vs instance store |
| Databases | RDS vs Aurora vs DynamoDB vs ElastiCache; Multi-AZ vs read replicas; Aurora Global Database |
| Compute | EC2 vs ECS/Fargate vs EKS vs Lambda; pricing models |
| Networking | Security groups vs network ACLs; NAT gateway vs VPC endpoints; peering vs Transit Gateway vs PrivateLink; Direct Connect vs VPN |
| Load balancing | ALB vs NLB vs Gateway Load Balancer |
| Messaging | SQS standard vs FIFO; SNS fan-out; EventBridge; Kinesis |
| Security | IAM policies vs resource policies vs SCPs; KMS keys; Secrets Manager vs Parameter Store; WAF and Shield |
| Disaster recovery | Backup and restore, pilot light, warm standby, multi-site active-active — and their recovery time and point objectives |

### Level 3 — Exam day

- **Time**: about two minutes per question. Do not get stuck: **flag** hard questions, answer your best guess, and come back at the end. There is **no penalty for guessing** — never leave a question blank.
- **Read the last sentence first** (what is being asked), then the scenario for constraints.
- **Eliminate** options that break any requirement; between two plausible answers, prefer the managed, built-in, multi-AZ and least-privilege one.
- **Multiple-response** questions say how many answers to choose.
- For online exams, test your computer and room set-up beforehand; the proctor's rules are strict.

## Using the certification

### Level 4 — On your CV and in interviews

- List it with the year under certifications, and — more importantly — show **projects** where you used the services: "deployed a containerised API on ECS Fargate behind an ALB with RDS Multi-AZ, defined in Terraform" ({{ch:projects-that-prove-skill}}).
- Expect interviewers to ask **why**: why SQS rather than direct calls, why Multi-AZ, how you would cut the cost. Use the trade-off language you practised ({{ch:technical-interview-guide}}).
- Do not overstate: "certified" is not "ran production for years". Honesty about the difference builds trust.
- Keep it current: certifications expire after three years; recertify, or move on to a Professional certification if your role goes deeper.

## From beginner to enterprise

**Level 1–2 — getting started.** Choosing the right certification; reading the exam guide; learning core services by building in a personal account with budget alerts.

**Level 3 — exam readiness.** Practice exams with careful review; a mistakes notebook; the classic comparisons; requirement-keyword reading and elimination.

**Level 4 — beyond the exam.** Real projects with the services; infrastructure as code; explaining trade-offs in interviews.

**Level 5 — senior practice.** Professional-level certifications or specialties where useful; applying the Well-Architected Framework in design reviews; mentoring others through certification.

**Level 6 — organisations.** Certification programmes for teams, especially at AWS partners, where certified staff counts are part of partnership levels.

## Real-world use cases

### From developer to cloud-ready

- **Story**: a Node.js developer studied for the associate exam over two months, building each architecture in Terraform in a personal account and destroying it afterwards. In interviews, the certification got the CV shortlisted; the Terraform repository and the explanations of trade-offs got the offer.

### Failing the first attempt

- **Story**: an engineer who read only video summaries failed with 690. On the second attempt they built the networking labs by hand and reviewed every practice question explanation, and passed with 810. The difference was hands-on practice and reading requirements carefully.

## Common mistakes

### Beginner: memorising without building

**Consequence:** scenario questions feel ambiguous. **Fix:** build the architectures yourself.

### Beginner: studying from an old exam version

**Fix:** check the current exam guide and the material's version.

### Intermediate: reviewing only wrong answers

**Consequence:** lucky guesses stay misunderstood. **Fix:** read every explanation.

### Intermediate: ignoring requirement keywords

**Consequence:** choosing a working but not "best" answer. **Fix:** list the requirements and check each option against all of them.

### Intermediate: running out of time

**Fix:** flag and move on; answer every question.

### Production: treating the certificate as experience

**Fix:** pair it with real projects and honest descriptions of what you have done.

## Debugging and troubleshooting

- **Practice scores stuck**: look at which domain loses the most weighted points; build labs for that area.
- **Two answers always seem right**: you are missing a requirement — reread for cost, operations, availability or "minimal changes" words.
- **Forgetting comparisons**: flashcards and spaced review; draw the architectures from memory.
- **Exam anxiety**: full-length timed practice exams; a plan for flagging and returning ({{ch:interview-under-pressure}}).

## Security summary

- **Practise in a separate personal account**, with MFA on root, budget alerts and least-privilege users — not in your employer's production account.
- **Clean up** lab resources; never leave instances, NAT gateways or open security groups running.
- **Never commit access keys** from labs to public repositories ({{ch:iam}}).
- **Use only official and legitimate practice material**; exam "dumps" violate the exam agreement and teach nothing.

## How a senior engineer thinks about this

- **The exam is a curriculum, not a goal.** Its value is the knowledge and judgement it structures.
- **Requirements decide architecture.** The same habit — list constraints, eliminate options — works in real design reviews.
- **Build to understand.** Hands-on practice beats any amount of reading.
- **Be honest about experience.** Certifications open doors; real work keeps you in the room.

## Exercises

### Exercise 1 — Answer the scenario

**Objective:** practise requirement-driven answers.
**The question:** a web application runs on EC2 instances in one availability zone with a single RDS instance. The company needs the application to survive the failure of an availability zone with the LEAST operational overhead. What should it do?

<details>
<summary>Show the solution</summary>

Run the EC2 instances in an **auto scaling group across at least two availability zones** behind an **Application Load Balancer**, and change the database to **RDS Multi-AZ**. These are built-in, managed features (least operational overhead) that survive a zone failure automatically. Custom scripts to copy data or start instances elsewhere would work but add operations; read replicas alone need manual promotion.

</details>

### Exercise 2 — Plan your study

**Objective:** practise study planning.
**What to do:** your first practice exam gives: secure 60%, resilient 80%, high-performing 75%, cost 70%. Using the domain weights, what do you study first, and which labs would you build?

<details>
<summary>Show the solution</summary>

Weighted points lost: secure (1 − 0.60) × 30 = 12; high-performing 0.25 × 24 = 6; cost 0.30 × 20 = 6; resilient 0.20 × 26 = 5.2. **Security first**: IAM roles and policies (identity versus resource policies, SCPs), KMS encryption, security groups versus network ACLs, VPC endpoints, Secrets Manager, WAF. Labs: a private application with an instance role reading an encrypted S3 bucket through a VPC endpoint; a bucket policy limited to that endpoint; a cross-account role. Then high-performing and cost.

</details>

### Exercise 3 — Production scenario: the interview question

**Objective:** practise using exam knowledge in interviews.
**The scenario:** in an interview, you mention your certification, and the interviewer asks: "Our image-processing service gets bursts of uploads; sometimes processing falls hours behind and sometimes servers sit idle. How would you redesign it on AWS?" Outline your answer.

<details>
<summary>Show the solution</summary>

1. **Clarify** requirements: how fast must images be processed, how large are bursts, what does processing involve, and what is the budget?
2. **Decouple**: uploads go straight to S3 with pre-signed URLs; S3 events go to an **SQS** queue (with a DLQ) ({{ch:s3}}, {{ch:sns-sqs}}).
3. **Scale on backlog**: workers on ECS Fargate (or Lambda for short jobs) scaling on queue backlog per worker, with Fargate Spot for cost; idempotent processing.
4. **Observe**: alarms on the age of the oldest message and DLQ size.
5. **Trade-offs**: Lambda for short, spiky jobs; containers for long or heavy processing; a maximum worker count to protect downstream systems.

Speak in requirements and trade-offs, not service names alone — that shows understanding beyond the exam.

</details>

## Summary

AWS certifications give structure to learning and help CVs pass keyword filters; for most back-end engineers the **Solutions Architect – Associate** is the best first choice. At the time of writing it has 65 questions in 130 minutes, a pass mark of 720 out of 1,000, and four weighted domains — secure (30%), resilient (26%), high-performing (24%) and cost-optimised (20%) architectures. Always check the current exam guide.

Questions are **scenarios**: list the requirement keywords (most cost-effective, least operational overhead, highly available, minimal changes), check every option against all of them, and prefer managed, built-in, multi-AZ, least-privilege answers. Study by **building** the architectures in a personal account with budget alerts and infrastructure as code, follow a structured course and the Well-Architected Framework, take practice exams and review every explanation, focus on the domain that loses the most weighted points, and master the classic comparisons. On exam day, flag and move on, and answer every question. Use the certification honestly, alongside projects that prove you can build.

## Key terms

- **AWS Certification** — An exam-based credential from Amazon Web Services.
- **Solutions Architect – Associate** — AWS's most widely recognised associate-level certification.
- **Exam guide** — AWS's official description of an exam's domains and scope.
- **Domain** — A weighted area of exam content.
- **Scenario question** — A question describing a situation and constraints, asking for the best solution.
- **Multiple-response question** — A question with more than one correct answer.
- **Scaled score** — An exam result reported on a 100 to 1,000 scale.
- **Well-Architected Framework** — AWS's guidance on designing workloads, organised into six pillars.
- **Recovery time objective (RTO)** — How long a system may take to recover.
- **Recovery point objective (RPO)** — How much data loss, measured in time, is acceptable.
- **Practice exam** — A timed set of sample questions for preparation.
- **Recertification** — Renewing a certification before it expires.

## What comes next

Part X covered the building blocks on AWS. Part XI puts them together. The next chapter, {{ch:system-design-fundamentals}}, begins system design: gathering requirements, estimating scale, drawing high-level architectures, and making the trade-offs between consistency, availability, latency and cost that every large system — and every system design interview — depends on.
