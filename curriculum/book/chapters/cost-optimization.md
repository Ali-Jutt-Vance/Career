# Controlling Cloud Costs

> [!GOALS]
> - Explain why cloud costs grow quietly, and why cost is an engineering concern, not only a finance one.
> - Read the bill: **Cost Explorer**, **tags** and **cost allocation**, **budgets** and **anomaly detection**.
> - Find waste: idle and oversized resources, storage and logs without lifecycles, forgotten environments.
> - Choose pricing models: **On-Demand**, **Savings Plans**, **Reserved Instances**, **Spot**, Graviton.
> - Understand the hidden costs of **data transfer** and **NAT gateways**.
> - Build cost awareness into architecture and everyday engineering.

## Why this matters

In the cloud, every engineer can spend money. Launching an instance, keeping a test environment overnight, logging every request at debug level, sending data across regions — each is a few clicks or lines of code, and each appears on the bill at the end of the month. Companies regularly discover that a third of their cloud spend is waste: idle resources, oversized instances, unneeded data stored forever.

Cost is also a design constraint. The same feature can cost ten times more with one architecture than another. Engineers who understand costs make better trade-offs, catch runaway spending early, and are trusted with bigger decisions. **FinOps** — the practice of making cloud spending visible, accountable and optimised — is now a standard discipline, and "how much will this cost?" is a common question in design reviews and interviews ({{ch:system-design-fundamentals}}).

## The simple idea

Think of household electricity. When the bill shocks you, you look at what uses the most: the heater left on in an empty room, the old fridge, the lights in the garage nobody switched off. Some fixes are free (switch it off), some need a small change (a timer), and some are bigger decisions (a better boiler or a fixed-price tariff because you know you will use a steady amount).

Cloud cost work is the same: see where the money goes, switch off what nobody uses, size things to what they really need, and commit to discounts for steady use.

> [!ANALOGY]
> Controlling cloud costs is like cutting a household electricity bill: find the big users, switch off what nobody needs, right-size the rest, and choose a cheaper tariff for steady use.
>
> **Where the analogy breaks:** at home, one person sees the whole bill. In a company, hundreds of engineers create resources in many accounts, and the bill arrives as millions of line items with machine-generated names. Without **tags** and ownership, nobody can tell whose "heater" is running.

## The proper definition and key words

**Cloud cost optimisation** is reducing spend without harming the outcomes the spend supports, by improving visibility, eliminating waste, matching resources to demand, and choosing the best pricing. **FinOps** is the operating model in which engineering, finance and business share responsibility for cloud costs.

Key words:

- **Cost Explorer** — AWS's tool for viewing and analysing spend over time.
- **Cost allocation tags** — tags (`team`, `service`, `environment`) activated for cost reports.
- **AWS Budgets** — alerts when actual or forecast spend crosses thresholds.
- **Cost Anomaly Detection** — machine-learned alerts for unusual spending.
- **Right-sizing** — matching resource size to measured usage.
- **Savings Plans / Reserved Instances** — discounts for committing to usage for one or three years.
- **Spot** — spare capacity at a deep discount that can be interrupted.
- **Unit cost** — cost per business unit: per order, per customer, per million requests.
- **Data transfer** — charges for data leaving AWS, crossing regions, or crossing availability zones.
- **Showback / chargeback** — reporting costs to teams / billing teams for them.

## Seeing the money

### Level 1 — The bill and its biggest lines

For a typical web application, the largest costs are usually:

1. **Compute**: EC2, ECS/Fargate, EKS nodes, Lambda.
2. **Databases**: RDS, Aurora, ElastiCache, DynamoDB.
3. **Storage**: S3, EBS volumes and **snapshots**.
4. **Networking**: **NAT gateways**, data transfer out to the internet, cross-zone and cross-region transfer, load balancers.
5. **Observability**: CloudWatch Logs ingestion and custom metrics ({{ch:cloudwatch}}).

**Cost Explorer** shows spend by service, account, region, usage type and tag. Look at trends: a line that grows faster than traffic is a problem.

### Level 2 — Tags, budgets and alerts

- **Tag everything** with at least `team`, `service` and `environment`, enforced in infrastructure code (`default_tags` in Terraform, tags on CDK apps) and by organisation **tag policies** ({{ch:terraform}}, {{ch:cloudformation}}). Activate them as cost allocation tags.
- **Separate accounts** per environment and team make costs visible even without perfect tags ({{ch:aws-overview}}).
- **AWS Budgets** with alerts at 50%, 80% and 100% of the expected monthly spend — and on **forecast** spend, which warns earlier.
- **Cost Anomaly Detection** catches sudden changes (a runaway Lambda loop, a leaked key mining cryptocurrency) within a day.
- **Showback**: a monthly report per team of their spend and its trend turns cost into something engineers can see and act on.

## Finding waste

### Level 2 — Idle and oversized resources

Most savings come from resources that are bigger than needed or not needed at all. Decisions must come from **measurements** over a representative period, not guesses. This example applies simple rules to a small fleet's 14-day metrics, then shows how much of a commitment to buy:

```ts
// 1. Right-sizing from measurements: p95 CPU and peak memory over 14 days (illustrative prices, USD/hour)
type Instance = { id: string; type: string; pricePerHour: number; vcpu: number; memGb: number; p95Cpu: number; peakMemGb: number; env: string };
const fleet: Instance[] = [
  { id: "api-1", type: "m7g.xlarge", pricePerHour: 0.1632, vcpu: 4, memGb: 16, p95Cpu: 0.18, peakMemGb: 3.1, env: "production" },
  { id: "api-2", type: "m7g.xlarge", pricePerHour: 0.1632, vcpu: 4, memGb: 16, p95Cpu: 0.21, peakMemGb: 3.4, env: "production" },
  { id: "search", type: "r7g.large", pricePerHour: 0.1071, vcpu: 2, memGb: 16, p95Cpu: 0.55, peakMemGb: 13.2, env: "production" },
  { id: "old-test", type: "c7g.2xlarge", pricePerHour: 0.289, vcpu: 8, memGb: 16, p95Cpu: 0.01, peakMemGb: 0.4, env: "staging" },
];
const smaller: Record<string, { type: string; pricePerHour: number; vcpu: number; memGb: number }> = {
  "m7g.xlarge": { type: "m7g.large", pricePerHour: 0.0816, vcpu: 2, memGb: 8 },
};
const hours = 730;
let saving = 0;
for (const i of fleet) {
  let advice = "keep";
  if (i.p95Cpu < 0.05) { advice = "idle: stop or delete"; saving += i.pricePerHour * hours; }
  else {
    const s = smaller[i.type];
    // the smaller size must keep p95 CPU under 60% and memory under 80%
    if (s && (i.p95Cpu * i.vcpu) / s.vcpu < 0.6 && i.peakMemGb / s.memGb < 0.8) {
      advice = `downsize to ${s.type}`; saving += (i.pricePerHour - s.pricePerHour) * hours;
    }
  }
  console.log(`${i.id.padEnd(9)} ${i.type.padEnd(12)} p95 CPU ${String(Math.round(i.p95Cpu * 100)).padStart(2)}%  mem ${i.peakMemGb}/${i.memGb} GB  -> ${advice}`);
}
console.log(`monthly saving: $${saving.toFixed(2)}`);

// 2. How much to commit: cover the steady baseline, not the peak
const hourlySpend = [8, 8, 7, 7, 7, 8, 11, 15, 18, 19, 19, 18, 18, 19, 19, 18, 17, 16, 14, 12, 11, 10, 9, 8]; // $/hour across a day
const discount = 0.3;                                 // a commitment discount of about 30% (illustrative)
function dailyCost(commitPerHour: number) {
  return hourlySpend.reduce((sum, spend) => {
    const covered = Math.min(spend, commitPerHour);
    return sum + commitPerHour * (1 - discount) + (spend - covered);   // pay the commitment whether used or not
  }, 0);
}
const onDemand = hourlySpend.reduce((a, b) => a + b, 0);
for (const commit of [0, 7, 10, 14, 19]) {
  const cost = dailyCost(commit);
  console.log(`commit $${String(commit).padStart(2)}/hour -> $${cost.toFixed(2)}/day (${(((onDemand - cost) / onDemand) * 100).toFixed(1)}% saved)`);
}
```

**Output:**

```text
api-1     m7g.xlarge   p95 CPU 18%  mem 3.1/16 GB  -> downsize to m7g.large
api-2     m7g.xlarge   p95 CPU 21%  mem 3.4/16 GB  -> downsize to m7g.large
search    r7g.large    p95 CPU 55%  mem 13.2/16 GB  -> keep
old-test  c7g.2xlarge  p95 CPU  1%  mem 0.4/16 GB  -> idle: stop or delete
monthly saving: $330.11
commit $ 0/hour -> $316.00/day (0.0% saved)
commit $ 7/hour -> $265.60/day (15.9% saved)
commit $10/hour -> $262.00/day (17.1% saved)
commit $14/hour -> $277.20/day (12.3% saved)
commit $19/hour -> $319.20/day (-1.0% saved)
```

- The API instances use under a quarter of their CPU and a fifth of their memory; the next size down still keeps CPU below 60% and memory below 80%. The **search** node is memory-bound and stays. The forgotten **test instance** is the easiest saving of all — and the most common.
- Use **p95** or peak values, not averages, so right-sizing does not break peak hours; leave headroom; change one thing at a time and watch latency ({{ch:monitoring}}).
- **AWS Compute Optimizer** gives recommendations like these from CloudWatch data for EC2, auto scaling groups, EBS, Lambda and ECS on Fargate.
- Other common waste: **unattached EBS volumes**, old **snapshots** and AMIs, idle load balancers, unused Elastic IPs, development databases running at night, Lambda functions with far more memory than needed.
- **Schedule non-production**: stopping staging and development outside working hours saves about two thirds of their compute cost.

### Level 3 — Storage and logs

- **S3 lifecycle rules** move ageing objects to cheaper classes and delete temporary data; **Intelligent-Tiering** for unknown access patterns; expire old object versions ({{ch:s3}}).
- **EBS**: gp3 instead of gp2 (cheaper for the same performance), snapshot lifecycle policies.
- **Logs**: retention on every log group, less debug logging in production, sampling of high-volume logs.
- **Databases**: right-size instances, delete unused read replicas, use storage autoscaling instead of over-provisioning ({{ch:rds}}).

## Pricing models

### Level 3 — Commitments: cover the baseline, not the peak

**Savings Plans** (and the older Reserved Instances) give large discounts — often 30% or more — in exchange for committing to a dollar amount of usage per hour for one or three years. The commitment is charged **whether you use it or not**. The second half of the example's output shows the trade-off for a service whose spend varies through the day between $7 and $19 per hour:

- Committing **$7/hour** (the lowest hour) saved 15.9%; **$10/hour** saved more, 17.1%, because the extra commitment was used most of the day.
- Committing **$14/hour** saved **less** (12.3%): for many hours the commitment was paid but not used.
- Committing to the **peak** ($19/hour) cost **more** than not committing at all.
- The rule: commit to the **steady baseline** you are confident about for the term, cover the rest with On-Demand and Spot, and review coverage and utilisation monthly. **Compute Savings Plans** apply across EC2, Fargate and Lambda and across instance families and regions, so they survive architecture changes better than instance-specific reservations.

### Level 3 — Spot, Graviton and serverless

- **Spot** capacity costs much less but can be reclaimed with two minutes' notice. Use it for stateless, interruptible work: CI runners, batch jobs, queue workers, part of an auto scaling group with mixed instances ({{ch:auto-scaling}}, {{ch:ec2}}).
- **Graviton** (ARM) instances and Lambda functions usually cost noticeably less for the same work; most Node.js workloads move with a multi-architecture image ({{ch:docker}}).
- **Serverless** is cheapest for low and spiky usage and can become more expensive at steady high volume — model both ({{ch:lambda}}).

## Hidden costs in architecture

### Level 4 — Data transfer and NAT

- **Data transfer out to the internet** is charged per GB; serving large files through **CloudFront** is usually cheaper and faster than from S3 or EC2 directly ({{ch:cloudfront}}).
- **NAT gateways** charge per hour and per GB processed. Container image pulls, S3 traffic and log shipping through NAT can become one of the largest items; **VPC endpoints** (the S3 gateway endpoint is free) remove much of it ({{ch:vpc}}).
- **Cross-AZ traffic** between services, and between applications and databases, costs per GB in both directions. It is the price of high availability, but chatty designs multiply it.
- **Cross-region replication** and transfer cost more again; replicate only what disaster recovery or latency really requires.

### Level 4 — Cost as part of design

- Estimate costs **before building** with the AWS Pricing Calculator; include the cost in design documents ({{ch:engineering-decisions}}).
- Track **unit costs** — cost per order, per active customer, per million API requests. Total spend can rightly grow with the business; unit cost should fall.
- Treat cost regressions like performance regressions: a deployment that doubles log volume or Lambda duration should be noticed in a day, not at month end.
- Weigh engineering time: saving $50 a month is not worth a week of work; deleting a forgotten $3,000-a-month cluster is worth an afternoon.

## From beginner to enterprise

**Level 1–2 — cost awareness.** Budget alerts in every account; reading Cost Explorer; tagging resources; deleting what you created for experiments; schedules for non-production.

**Level 3 — optimisation.** Right-sizing from measurements; storage and log lifecycles; Savings Plans for the baseline; Spot and Graviton where suitable; VPC endpoints instead of NAT traffic.

**Level 4 — cost-aware architecture.** Unit cost metrics; cost estimates in design reviews; anomaly detection; data transfer awareness; cost checks for infrastructure changes.

**Level 5 — senior practice.** Balancing cost, reliability and speed explicitly; commitment strategies; leading cost reviews with finance; choosing architectures with cost in mind.

**Level 6 — enterprises.** FinOps teams, chargeback across business units, enterprise discount agreements, organisation-wide tagging and policy enforcement.

## Real-world use cases

### The quarterly clean-up

- **Practice**: a team sorted Cost Explorer by service and tag, found an old proof-of-concept EKS cluster ($2,800/month), unattached volumes and snapshots ($600), debug logging in production ($900 in CloudWatch Logs) and a NAT bill that an S3 endpoint halved. Total: about 30% off the monthly bill in two days of work.

### The runaway function

- **What happened**: a Lambda function triggered by S3 writes wrote its output into the same prefix, triggering itself endlessly. Cost Anomaly Detection alerted the next morning after a $1,200 day.
- **Fix**: outputs to a separate prefix, a concurrency cap on the function, and a budget alert on forecast spend per account ({{ch:lambda}}).

## Common mistakes

### Beginner: no budget alerts

**Consequence:** surprises at month end. **Fix:** budgets and anomaly detection on day one.

### Beginner: forgotten experiments

**Fix:** tags with owners and expiry dates; regular clean-ups; infrastructure as code so environments can be destroyed and recreated.

### Intermediate: right-sizing from averages

**Consequence:** slow peaks and outages. **Fix:** p95 and peaks over representative periods, with headroom.

### Intermediate: committing to the peak

**Consequence:** paying for unused commitments. **Fix:** commit to the baseline; review coverage and utilisation.

### Intermediate: logs and storage kept forever

**Fix:** retention and lifecycle rules.

### Production: ignoring NAT and data transfer

**Consequence:** networking costs larger than compute. **Fix:** endpoints, CloudFront, fewer cross-AZ and cross-region hops.

### Production: cutting costs that protect reliability

**Consequence:** a single-AZ database saves money until the outage. **Fix:** optimise waste first; change reliability deliberately.

## Debugging and troubleshooting

- **Spend jumped**: Cost Explorer daily view grouped by service, then usage type, then resource or tag; check recent deployments and anomaly alerts.
- **Unknown resources**: untagged items — use resource IDs, CloudTrail creation events and AWS Config to find the creator.
- **High NAT gateway cost**: VPC flow logs show what talks through NAT; usually image pulls, S3 and logs.
- **High CloudWatch cost**: ingestion by log group; custom metrics count; Logs Insights scans.
- **Savings Plan underused**: coverage and utilisation reports; architecture changes may have moved usage to other services.

## Security summary

- **Cost spikes can be attacks**: leaked credentials are often used for crypto-mining — anomaly alerts are a security control ({{ch:iam}}).
- **Limit who can create expensive resources** with IAM and service control policies (allowed regions and instance types).
- **Do not trade away security** to save money (disabling CloudTrail, encryption or backups).
- **Delete data you no longer need** — less data is cheaper and less to protect.

## How a senior engineer thinks about this

- **Cost is a feature of the design.** Estimate it, measure it, review it.
- **Visibility first.** Tags, accounts and budgets before optimisation.
- **Waste before discounts.** Delete and right-size, then commit for the baseline.
- **Unit costs tell the truth.** Growth is fine; rising cost per order is not.
- **Spend engineering time where the money is.** Sort by size and start at the top.

## Exercises

### Exercise 1 — Find the savings

**Objective:** practise identifying waste.
**What to do:** a monthly bill shows: EC2 $4,000 (average CPU 12%), NAT gateways $1,800, CloudWatch Logs $1,200 (no retention set), S3 $900 (growing 10% a month, mostly old exports), RDS $1,500 (Multi-AZ, CPU 40%). Where do you start and what do you do?

<details>
<summary>Show the solution</summary>

1. **EC2** (largest): right-size from p95 metrics, schedule non-production, consider Graviton and Savings Plans for the remaining baseline.
2. **NAT** ($1,800): flow logs to see what passes; add the free S3 gateway endpoint and interface endpoints for ECR and Logs.
3. **CloudWatch Logs**: set retention on every group; reduce debug logging; sample noisy logs.
4. **S3**: lifecycle rules to expire old exports and move ageing data to cheaper classes.
5. **RDS**: keep Multi-AZ (reliability); CPU 40% looks reasonable — check memory and connections before resizing; consider a reserved instance or Savings Plan only once the size is stable.

</details>

### Exercise 2 — Choose a commitment

**Objective:** practise commitment sizing.
**What to do:** compute spend is never below $20/hour, averages $35/hour and peaks at $60/hour during sales. Next year's traffic is expected to grow. How much would you commit to, and with which kind of plan?

<details>
<summary>Show the solution</summary>

Commit close to the **steady minimum** — around $20/hour — perhaps slightly more if growth is very likely, using a **Compute Savings Plan** (flexible across EC2, Fargate, Lambda, instance families and regions), probably for one year while the architecture is still changing. Cover the rest with On-Demand, and the interruptible part with Spot. Review coverage and utilisation monthly and add further commitments as the baseline grows. Committing to the average or peak risks paying for unused capacity.

</details>

### Exercise 3 — Production scenario: the cost-cutting request

**Objective:** practise trade-offs.
**The scenario:** leadership asks the team to cut the AWS bill by 40% in a quarter. A colleague proposes: move the database to a single AZ, turn off CloudTrail and reduce backups to one day. What do you propose instead?

<details>
<summary>Show the solution</summary>

Explain the risks of the proposal — a zone failure becomes an outage with data loss, CloudTrail is required for security and audit, and one day of backups cannot recover from slowly discovered mistakes. Then propose:

1. **Visibility**: a ranked list of spend by service and team.
2. **Waste**: delete idle resources, old snapshots, unused environments; schedule non-production.
3. **Right-sizing** from measurements; Graviton where possible.
4. **Storage and logs**: lifecycle rules and retention.
5. **Networking**: VPC endpoints, CloudFront for downloads, reduced cross-AZ chatter.
6. **Commitments**: Savings Plans for the remaining baseline (often 20–30% on that part).
7. **Unit costs** tracked monthly to show progress.

Estimate each item's saving so the team can show what 40% realistically requires and which trade-offs, if any, leadership must explicitly accept.

</details>

## Summary

Cloud costs grow quietly because every engineer can create resources, so cost is an engineering responsibility. Make spending visible with **Cost Explorer**, **cost allocation tags**, separate accounts, **budgets** on actual and forecast spend, **anomaly detection** and showback per team.

Remove **waste** first: idle resources, oversized instances (right-size from p95 and peak metrics with headroom, using tools like Compute Optimizer), unattached volumes and old snapshots, non-production running at night, storage and logs without lifecycles or retention. Then choose pricing: **Savings Plans** or reservations for the **steady baseline** only — committing to the peak can cost more than On-Demand — **Spot** for interruptible work, **Graviton** for cheaper compute, and serverless for spiky usage.

Watch architectural costs that hide in networking — **NAT gateways**, **data transfer out**, cross-AZ and cross-region traffic — and use VPC endpoints and CloudFront. Estimate costs in designs, track **unit costs**, treat cost regressions like performance regressions, and never cut the reliability and security controls that protect the business without an explicit decision.

## Key terms

- **Cloud cost optimisation** — Reducing cloud spend without harming the outcomes it supports.
- **FinOps** — The practice of shared accountability for cloud spending.
- **Cost Explorer** — AWS's tool for analysing spend.
- **Cost allocation tag** — A tag used to group costs in reports.
- **AWS Budgets** — Alerts on actual or forecast spending thresholds.
- **Cost Anomaly Detection** — Automatic alerts on unusual spending patterns.
- **Right-sizing** — Matching resource sizes to measured needs.
- **Savings Plan** — A discount in exchange for committed hourly spend over one or three years.
- **Reserved Instance** — A discount for committing to specific instance usage.
- **Spot capacity** — Discounted, interruptible spare capacity.
- **Commitment coverage / utilisation** — How much usage commitments cover / how much of a commitment is used.
- **Unit cost** — Cost per unit of business value, such as per order.
- **Data transfer cost** — Charges for data moving out of AWS or between zones and regions.
- **Showback / chargeback** — Reporting costs to teams / billing them internally.
- **Compute Optimizer** — An AWS service that recommends right-sizing from usage metrics.

## What comes next

This part has covered the AWS services back-end engineers use every day. The last chapter of the part, {{ch:aws-certification}}, shows how to prepare for the AWS Solutions Architect – Associate exam: what it covers, how to study, how to approach scenario questions, and how the certification fits a career plan.
