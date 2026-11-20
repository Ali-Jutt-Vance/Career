# What the Cloud Is, and a Map of AWS

> [!GOALS]
> - Explain what cloud computing is and why most companies now rent infrastructure instead of owning it.
> - Understand **regions**, **availability zones** and **edge locations**, and why architectures spread across zones.
> - Know the **shared responsibility model**: what AWS secures and what you must secure.
> - Recognise the main AWS service families and the services a back-end engineer uses most.
> - Understand **accounts**, **organisations**, the **root user** and how to explore AWS safely without surprise bills.
> - Use the console, the CLI, SDKs and infrastructure as code appropriately.

## Why this matters

Twenty years ago, launching an online business meant buying servers, renting space in a data centre, waiting weeks for hardware and paying for capacity you might need one day. Today, a developer can create a database, a fleet of servers, a global content network and a queue in minutes, pay by the hour or by the request, and delete it all when it is no longer needed. That change — **cloud computing** — is why small teams can build systems that serve millions of users.

**Amazon Web Services (AWS)** is the largest cloud provider, followed by Microsoft Azure and Google Cloud. Most back-end job descriptions mention AWS, and many companies expect engineers to deploy, operate and debug their services on it. The services in this part — IAM, EC2, S3, RDS, VPC, load balancers, containers, Lambda, messaging, secrets, monitoring and infrastructure as code — are the everyday building blocks. This chapter gives you the map: the ideas that apply to every service, and how the pieces fit together.

## The simple idea

Think of electricity. Factories once built their own power stations. Then public power grids arrived: you plug in, use what you need and pay for what you used. Nobody builds a power station to run a factory any more — unless they have very special needs.

The cloud is the same for computing. Instead of buying and running servers, storage and networks, you rent them from a provider over the internet, use as much or as little as you need, and pay for what you use.

> [!ANALOGY]
> The cloud is like the electricity grid: instead of running your own power station, you plug in, use what you need and pay for what you use.
>
> **Where the analogy breaks:** electricity is simple and identical everywhere. Cloud resources are hundreds of different services with their own prices, limits and configuration — and, unlike a light you forget to switch off, a forgotten database or a misconfigured public storage bucket can cost thousands or leak customer data. With the grid, the power company handles safety up to your socket; in the cloud, a large part of the security is **your** job.

## The proper definition and key words

**Cloud computing** is on-demand access, over a network, to shared computing resources — servers, storage, databases, networks, software — that can be provisioned and released quickly with minimal management, and are paid for by usage.

Key words:

- **IaaS, PaaS, SaaS** — infrastructure (virtual servers, networks), platforms (managed databases, container platforms), software (complete applications) as a service.
- **Region** — a geographic area containing several data centres (`eu-west-2` is London).
- **Availability zone (AZ)** — one or more separate data centres within a region, with independent power, cooling and networking (`eu-west-2a`).
- **Edge location** — a smaller site near users for content delivery and DNS.
- **Managed service** — a service where AWS runs the underlying software and servers (RDS, SQS, Lambda).
- **Shared responsibility model** — the division of security duties between AWS and the customer.
- **Account** — the container for AWS resources, billing and security boundaries.
- **Root user** — the account's original, all-powerful login.
- **ARN** — Amazon Resource Name, the unique identifier of a resource (`arn:aws:s3:::cornershop-uploads`).
- **Elasticity** — adding and removing capacity automatically as demand changes.

## The ideas behind every service

### Level 1 — Why companies move to the cloud

- **No up-front hardware**: pay for usage instead of buying capacity in advance.
- **Speed**: minutes to create resources, so teams experiment and ship faster.
- **Elasticity**: scale up for a sale or a launch, scale down at night ({{ch:auto-scaling}}).
- **Global reach**: run close to users on several continents.
- **Managed services**: let AWS patch databases, run queues and replace failed disks, so your team focuses on your product.
- **Reliability building blocks**: multiple zones and regions that would be enormously expensive to build yourself.

The trade-offs are real too: costs can grow quietly, the platform is complex, some services lock you in, and you must learn to configure security correctly.

### Level 1 — Regions, availability zones and edge locations

```text
 Region eu-west-2 (London)                      Region us-east-1 (N. Virginia)
 ┌────────────────────────────────────┐          ┌──────────────────────────┐
 │  AZ eu-west-2a   AZ eu-west-2b      │          │  AZ a   AZ b   AZ c ...  │
 │  ┌──────────┐    ┌──────────┐       │          └──────────────────────────┘
 │  │ data     │    │ data     │  AZ c │
 │  │ centre(s)│◄──►│ centre(s)│◄──►…  │   low-latency private links between AZs
 │  └──────────┘    └──────────┘       │
 └────────────────────────────────────┘
        edge locations in many cities: CloudFront (content) and Route 53 (DNS)
```

- **Regions** are independent of each other. Choose one close to your users, where your data is legally allowed to live (data residency rules), and where the services you need are available. Prices differ between regions.
- **Availability zones** within a region are kilometres apart, so a fire, flood or power failure in one does not affect the others, but close enough for fast connections between them (typically a millisecond or two).
- **Edge locations** in hundreds of cities serve cached content and DNS answers near users ({{ch:cloudfront}}, {{ch:route53}}).

Production systems run in **at least two availability zones**. The arithmetic shows why:

```ts
// Why AWS architectures spread across availability zones: the arithmetic of redundancy.
// Assume each zone-local copy of the app is up 99.5% of the time, and zones fail independently.
const zoneAvailability = 0.995;
const secondsPerMonth = 30 * 24 * 3600;

function atLeastOneUp(copies: number, a: number): number {
  return 1 - (1 - a) ** copies;                    // down only if every copy is down at once
}
function inSeries(...parts: number[]): number {
  return parts.reduce((x, y) => x * y, 1);         // every part is needed
}

for (const zones of [1, 2, 3]) {
  const app = atLeastOneUp(zones, zoneAvailability);
  console.log(`${zones} zone(s): ${(app * 100).toFixed(6).padStart(10)}%  ~${Math.round((1 - app) * secondsPerMonth).toLocaleString("en-GB").padStart(6)} seconds down per month`);
}

// But a chain is only as strong as its weakest link: app in 3 zones, database in only 1 zone
const appIn3 = atLeastOneUp(3, zoneAvailability);
const singleZoneDb = 0.995;
const multiAzDb = atLeastOneUp(2, 0.995);
console.log(`app x3 + single-AZ database: ${(inSeries(appIn3, singleZoneDb) * 100).toFixed(4)}%`);
console.log(`app x3 + Multi-AZ database:  ${(inSeries(appIn3, multiAzDb) * 100).toFixed(4)}%`);
```

**Output:**

```text
1 zone(s):  99.500000%  ~12,960 seconds down per month
2 zone(s):  99.997500%  ~    65 seconds down per month
3 zone(s):  99.999988%  ~     0 seconds down per month
app x3 + single-AZ database: 99.5000%
app x3 + Multi-AZ database:  99.9975%
```

- One zone at 99.5% means about **3.6 hours** of downtime a month. With two independent zones, the application is down only when both are down at the same time — about a minute a month.
- A system is only as available as its **least redundant part**: three zones of application servers do not help if the database lives in one zone. That is why managed databases offer Multi-AZ deployments ({{ch:rds}}) and load balancers span zones ({{ch:elb}}).
- The model assumes **independent** failures. Real failures are often correlated — a bad deployment, a configuration change or a region-wide service problem hits every zone at once. Zones protect against data-centre failures, not against your own mistakes; for those you need careful deployments ({{ch:cicd}}), and for region-wide events, multi-region designs.

### Level 2 — The shared responsibility model

AWS is responsible for security **of** the cloud; you are responsible for security **in** the cloud:

| AWS secures | You secure |
|---|---|
| Physical data centres, hardware, power | Who can access your account and resources (IAM) |
| The global network | Network configuration: security groups, public access |
| The virtualisation layer | Operating systems and patches on your EC2 instances |
| Managed services' underlying infrastructure | Your data: encryption choices, backups, bucket policies |
| | Your application code and its dependencies |

The line moves with the service type. On **EC2**, you patch the operating system. On **RDS**, AWS patches the database engine, but you choose who can connect. On **Lambda** and **S3**, AWS runs everything underneath, but you still control access and data. Almost every serious cloud security incident — public buckets, leaked access keys, databases open to the internet — is on the customer's side of the line ({{ch:iam}}).

### Level 2 — A map of the services you will use

AWS has more than 200 services. A back-end engineer uses a few dozen regularly:

| Family | Services | Chapter |
|---|---|---|
| Identity and security | IAM, IAM Identity Center, KMS, Secrets Manager | {{ch:iam}}, {{ch:secrets-manager}} |
| Compute | EC2, Auto Scaling, Lambda | {{ch:ec2}}, {{ch:auto-scaling}}, {{ch:lambda}} |
| Containers | ECR, ECS, Fargate, EKS | {{ch:ecs}}, {{ch:eks}} |
| Storage | S3, EBS, EFS | {{ch:s3}} |
| Databases | RDS, Aurora, DynamoDB, ElastiCache | {{ch:rds}} |
| Networking | VPC, ELB, Route 53, CloudFront, API Gateway | {{ch:vpc}}, {{ch:elb}}, {{ch:route53}}, {{ch:cloudfront}} |
| Messaging | SQS, SNS, EventBridge | {{ch:sns-sqs}} |
| Operations | CloudWatch, CloudTrail, Systems Manager | {{ch:cloudwatch}}, {{ch:systems-manager}} |
| Infrastructure as code | CloudFormation, CDK (and Terraform) | {{ch:cloudformation}}, {{ch:terraform}} |

A typical web application uses them like this:

```text
 users ──► Route 53 (DNS) ──► CloudFront (CDN, static files from S3)
                                   │
                                   ▼
                      Application Load Balancer (2+ AZs, public subnets)
                                   │
                    ┌──────────────┴──────────────┐
             ECS tasks / EC2 in AZ a       ECS tasks / EC2 in AZ b   (private subnets)
                    │            │                 │
             RDS PostgreSQL Multi-AZ   ElastiCache Redis   SQS queue ──► worker
                    │
   Secrets Manager (credentials), CloudWatch (logs, metrics, alarms), IAM roles everywhere
```

### Level 3 — Accounts, organisations and safe set-up

- An **AWS account** is a hard boundary for resources, permissions and billing. Mature organisations use **many accounts** — separate production, staging, development, security and logging accounts — managed with **AWS Organizations**, so a mistake or breach in one cannot reach another.
- The **root user** (the email used to create the account) can do anything, including closing the account. Protect it with a strong password and multi-factor authentication, never create access keys for it, and use it only for the few tasks that require it.
- People sign in through **IAM Identity Center** (single sign-on) with roles and temporary credentials, not long-lived IAM users with access keys ({{ch:iam}}).
- **CloudTrail** records every API call — who did what, when — and should be enabled in every account and sent to a protected logging account.

### Level 3 — Cost awareness from day one

Pay-as-you-go cuts both ways. Many resources are billed **per hour whether or not anyone uses them**:

```ts
// Pay-as-you-go: a rough monthly estimate for a small production setup.
// Prices are illustrative round numbers in US dollars; always check the AWS Pricing Calculator.
type Line = { item: string; unitPrice: number; unit: string; quantity: number };

const hoursPerMonth = 730;
const estimate: Line[] = [
  { item: "2 x small app servers", unitPrice: 0.0416, unit: "per server-hour", quantity: 2 * hoursPerMonth },
  { item: "managed PostgreSQL, Multi-AZ", unitPrice: 0.13, unit: "per hour", quantity: hoursPerMonth },
  { item: "database storage 100 GB", unitPrice: 0.23, unit: "per GB-month", quantity: 100 },
  { item: "load balancer", unitPrice: 0.0225, unit: "per hour", quantity: hoursPerMonth },
  { item: "NAT gateway", unitPrice: 0.045, unit: "per hour", quantity: hoursPerMonth },
  { item: "file storage 500 GB", unitPrice: 0.023, unit: "per GB-month", quantity: 500 },
  { item: "data transfer out 200 GB", unitPrice: 0.09, unit: "per GB", quantity: 200 },
];

let total = 0;
for (const l of estimate) {
  const cost = l.unitPrice * l.quantity;
  total += cost;
  console.log(`${l.item.padEnd(30)} $${cost.toFixed(2).padStart(7)}`);
}
console.log(`${"total per month".padEnd(30)} $${total.toFixed(2).padStart(7)}`);
const idle = estimate.filter((l) => l.unit.includes("hour")).reduce((s, l) => s + l.unitPrice * l.quantity, 0);
console.log(`charged by the hour, even with zero users: $${idle.toFixed(2)} (${((100 * idle) / total).toFixed(0)}%)`);
```

**Output:**

```text
2 x small app servers          $  60.74
managed PostgreSQL, Multi-AZ   $  94.90
database storage 100 GB        $  23.00
load balancer                  $  16.43
NAT gateway                    $  32.85
file storage 500 GB            $  11.50
data transfer out 200 GB       $  18.00
total per month                $ 257.41
charged by the hour, even with zero users: $204.91 (80%)
```

- About 80% of this small bill is charged by the hour even if nobody visits the site. A forgotten test environment costs the same as a busy one.
- Surprising items appear: **NAT gateways** and **data transfer out** to the internet are classic causes of unexpected bills ({{ch:vpc}}).
- The prices are illustrative; real prices vary by region and change over time. Use the AWS Pricing Calculator before building, and set up **AWS Budgets alerts** on day one — the very first thing to do in a new account, along with MFA on the root user ({{ch:cost-optimization}}).

### Level 3 — Ways to work with AWS

- **Console** (web interface): good for learning and exploring, and for looking at things during incidents. Changes made by clicking are not reviewed or repeatable — avoid them for real infrastructure.
- **CLI** (`aws s3 ls`, `aws sts get-caller-identity`): scripting, quick checks and automation.
- **SDKs** (`@aws-sdk/client-s3` for JavaScript and TypeScript): your application's calls to AWS services, such as uploading files or sending messages.
- **Infrastructure as code** (Terraform, CloudFormation, CDK): how real environments are created and changed ({{ch:terraform}}, {{ch:cloudformation}}).

All of them call the same **APIs**, signed with credentials. Every action is an API call that IAM allows or denies and CloudTrail records.

```bash
# fragment
aws sts get-caller-identity            # "who am I?" — the first command when credentials behave strangely
aws configure sso                      # sign in through IAM Identity Center
aws s3 ls --profile staging            # use a named profile for a specific account and role
```

## From beginner to enterprise

**Level 1–2 — first steps.** Understanding regions, zones and the shared responsibility model; a personal account with root MFA and a budget alert; exploring services in the console; using the CLI with SSO.

**Level 3 — real projects.** Multi-AZ designs; managed services instead of self-run software; infrastructure as code; separate accounts for production and non-production; cost estimates before building.

**Level 4 — production operation.** IAM roles everywhere, no long-lived keys; CloudTrail and centralised logging; monitoring and alarms; tagging and cost reports; backups and tested restores.

**Level 5 — senior practice.** Choosing services by trade-offs (managed versus self-run, serverless versus containers); designing for failure, including region-level events where justified; cost and security reviews.

**Level 6 — enterprises.** Landing zones with AWS Organizations and Control Tower; service control policies; account vending; central security, networking and logging accounts; enterprise discount agreements.

## Real-world use cases

### A start-up's first production environment

- **Set-up**: an organisation with production and staging accounts, SSO for engineers, ECS on Fargate behind a load balancer in two zones, RDS PostgreSQL Multi-AZ, S3 and CloudFront for files, all defined in Terraform, with budget alerts and CloudTrail from the first day.

### A retailer's peak season

- **Practice**: auto scaling adds application capacity for a sale and removes it afterwards; read replicas take reporting load; the bill rises for two weeks and falls again — capacity that would have sat idle for 50 weeks if bought as hardware.

## Common mistakes

### Beginner: using the root user day to day

**Consequence:** one leaked password or key gives total control. **Fix:** MFA on root, SSO roles for daily work.

### Beginner: no budget alerts

**Consequence:** surprise bills from forgotten resources. **Fix:** AWS Budgets on day one; delete test resources.

### Beginner: access keys in code or on laptops

**Consequence:** leaked keys used by attackers within minutes. **Fix:** roles and temporary credentials ({{ch:iam}}).

### Intermediate: everything in one availability zone

**Consequence:** a data-centre failure takes the system down. **Fix:** at least two zones for every layer.

### Intermediate: clicking production into existence

**Consequence:** unrepeatable, unreviewed environments. **Fix:** infrastructure as code.

### Production: one account for everything

**Consequence:** a staging mistake can delete production. **Fix:** separate accounts with AWS Organizations.

### Production: assuming AWS secures your data

**Consequence:** public buckets, open databases. **Fix:** know your side of the shared responsibility model.

## Debugging and troubleshooting

- **"Access denied"**: check who you are (`aws sts get-caller-identity`), which account and region you are in, and the policies involved ({{ch:iam}}).
- **"I can't see my resources"**: wrong region in the console or CLI — the most common confusion of all.
- **Unexpected bill**: Cost Explorer grouped by service, then by usage type; look for NAT gateways, data transfer, idle instances and old snapshots.
- **Service limits**: "limit exceeded" errors mean you hit a quota; Service Quotas shows and raises them.
- **Is AWS itself having problems?** Check the AWS Health Dashboard for your account and region.

## Security summary

- **Root user**: MFA, no access keys, rarely used.
- **SSO and roles** with temporary credentials; least privilege ({{ch:iam}}).
- **CloudTrail** everywhere, logs in a protected account.
- **Separate accounts** for production and other environments.
- **Your side of shared responsibility**: network exposure, data encryption and access, patching what you run, application security.
- **Budgets and alerts** also detect abuse — a compromised account mining cryptocurrency shows up first on the bill.

## How a senior engineer thinks about this

- **Design for failure.** Every component can fail; zones and managed services make recovery automatic.
- **Prefer managed services** unless there is a clear reason to run software yourself.
- **Everything as code.** Accounts, networks, permissions and services are reviewed and repeatable.
- **Security and cost are design inputs**, not afterthoughts.
- **Know the trade-offs.** Convenience versus lock-in, serverless versus containers, one region versus many.

## Exercises

### Exercise 1 — Shared responsibility

**Objective:** practise the responsibility model.
**What to do:** for each item, say whether AWS or the customer is responsible: (a) patching the Linux kernel on an EC2 instance; (b) replacing a failed disk in a data centre; (c) making sure an S3 bucket is not public; (d) patching PostgreSQL on RDS; (e) choosing who can connect to the RDS database.

<details>
<summary>Show the solution</summary>

- (a) Customer — on EC2, you manage the operating system.
- (b) AWS — physical infrastructure.
- (c) Customer — access configuration and data protection.
- (d) AWS — RDS is managed; you choose the maintenance window and version upgrades.
- (e) Customer — security groups, network placement, database users.

</details>

### Exercise 2 — Find the weak link

**Objective:** practise availability reasoning.
**What to do:** an application runs on four EC2 instances across two zones behind a load balancer, uses an RDS database in a single zone, and stores sessions in one Redis node. What limits availability, and how would you fix it?

<details>
<summary>Show the solution</summary>

The **single-zone database** and the **single Redis node** are single points of failure — if either zone or node fails, the whole application fails, however many application servers there are.

**Fixes:** RDS **Multi-AZ** (automatic failover to a standby in another zone); ElastiCache Redis with a **replica in another zone** and automatic failover — or keep sessions somewhere already redundant ({{ch:sessions}}). Then all layers span at least two zones.

</details>

### Exercise 3 — Production scenario: the new AWS account

**Objective:** practise safe account set-up.
**The scenario:** your small company has just created its first AWS account. The founder created an IAM user with administrator rights and access keys, shared it with three developers, and everyone uses it from their laptops. What do you change first?

<details>
<summary>Show the solution</summary>

1. **Secure the root user**: strong password, MFA, no access keys.
2. **Set budget alerts** immediately.
3. **Enable CloudTrail** in all regions.
4. **Replace the shared admin user**: set up IAM Identity Center with one identity per person and roles with appropriate permissions; then delete the shared user's access keys and the user.
5. **Create separate accounts** for production and staging under AWS Organizations as soon as there is anything in production.
6. **Move infrastructure to code** before the environment grows.

</details>

## Summary

**Cloud computing** rents computing resources on demand over the internet and charges by usage, replacing up-front hardware with speed, elasticity, global reach and managed services — at the price of complexity, cost discipline and your own security work. **AWS** is the largest provider.

AWS is organised into independent **regions**, each with several isolated **availability zones**, plus **edge locations** near users. Production systems span at least two zones, and every layer must be redundant — a system is only as available as its weakest component, and zones protect against data-centre failures, not your own mistakes. Under the **shared responsibility model**, AWS secures the cloud itself and you secure what you put in it: access, network exposure, data, operating systems you run, and your code.

The core service families are identity and security, compute, containers, storage, databases, networking, messaging, operations and infrastructure as code. Use **separate accounts** under AWS Organizations, protect the **root user**, give people **SSO roles** with temporary credentials, enable **CloudTrail**, set **budget alerts** on day one, and remember that many resources cost money by the hour even when idle. Explore with the console, automate with the CLI and SDKs, and build real environments with infrastructure as code.

## Key terms

- **Cloud computing** — On-demand, pay-per-use access to computing resources over a network.
- **IaaS / PaaS / SaaS** — Infrastructure, platform and software offered as a service.
- **AWS** — Amazon Web Services, the largest cloud provider.
- **Region** — A geographic area containing multiple availability zones.
- **Availability zone** — One or more isolated data centres within a region.
- **Edge location** — A site close to users for content delivery and DNS.
- **Managed service** — A service whose underlying software and servers the provider operates.
- **Shared responsibility model** — The division of security duties between the provider and the customer.
- **Elasticity** — Automatically adding and removing capacity as demand changes.
- **AWS account** — A container and security boundary for resources and billing.
- **AWS Organizations** — A service for managing many accounts centrally.
- **Root user** — The original, all-powerful identity of an AWS account.
- **IAM Identity Center** — AWS's single sign-on service for people.
- **CloudTrail** — A service recording the API calls made in an account.
- **ARN** — Amazon Resource Name, a unique identifier for an AWS resource.
- **AWS Budgets** — A service that alerts when costs exceed thresholds.
- **Service quota** — A limit on how much of a resource an account can use.

## What comes next

Every action in AWS — by a person, a pipeline or an application — passes through one gate: **IAM**. The next chapter, {{ch:iam}}, explains identities, roles, policies and how AWS decides whether a request is allowed, so you can give every person and service exactly the access it needs and nothing more.
