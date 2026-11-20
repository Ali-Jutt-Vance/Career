# CloudWatch

> [!GOALS]
> - Explain what Amazon CloudWatch collects: **metrics**, **logs**, **alarms**, **dashboards** and events.
> - Read AWS service metrics and publish **custom metrics**, including with the **Embedded Metric Format**.
> - Write **alarms** correctly: statistics, periods, "M out of N", missing data, composite alarms and actions.
> - Search logs with **Logs Insights**, set retention and extract metrics from logs.
> - Use tracing, synthetic canaries and Container Insights, and control CloudWatch costs.

## Why this matters

Every AWS service reports into **Amazon CloudWatch**: load balancers report requests and errors, RDS reports CPU and connections, Lambda reports invocations and duration, SQS reports queue age. Your applications send their logs there by default on ECS and Lambda ({{ch:ecs}}, {{ch:lambda}}). Alarms built on CloudWatch page the on-call engineer, scale services ({{ch:auto-scaling}}) and roll back deployments.

{{ch:monitoring}}, {{ch:prometheus}} and {{ch:grafana}} explained monitoring principles and the popular open-source tools. Many teams use those for application metrics — but on AWS, CloudWatch is always there, and knowing how to query its logs, read its metrics and write sound alarms is an everyday skill. Badly written CloudWatch alarms are a classic source of both missed incidents and 3 a.m. false alarms.

## The simple idea

CloudWatch is the building's central security and maintenance desk. Every system in the building — lifts, heating, doors — reports its readings to the desk automatically. Staff can look at charts of any reading, read the log book of events, and set rules: "if the temperature in the server room stays above 30 °C for five minutes, call the engineer".

> [!ANALOGY]
> CloudWatch is like a building's central desk where every system reports its readings, events are written in a log book, and rules call someone when a reading stays wrong.
>
> **Where the analogy breaks:** the desk records exactly what systems report — no more. If a service stops reporting, a rule written as "alarm when the error count is high" sees **no data**, not a high value, and may stay silent while the service is completely down. Deciding what silence means is part of every alarm.

## The proper definition and key words

**Amazon CloudWatch** is AWS's monitoring and observability service. It stores **metrics** (time series), **logs** (log groups of log streams), evaluates **alarms** on metrics, shows **dashboards**, and offers additional features such as **Logs Insights**, **Synthetics**, **Container Insights** and **Application Signals**.

Key words:

- **Namespace** — a container for metrics (`AWS/ApplicationELB`, `AWS/Lambda`, your own `Shop`).
- **Metric** — a time series identified by namespace, name and **dimensions** (`Service=checkout`).
- **Statistic** — how datapoints in a **period** are summarised: `Average`, `Sum`, `Maximum`, `Minimum`, `SampleCount`, percentiles (`p99`).
- **Period** — the length of time each datapoint covers (1 minute, 5 minutes…).
- **Custom metric** — a metric your application publishes.
- **Embedded Metric Format (EMF)** — structured log lines that CloudWatch turns into metrics.
- **Log group / log stream** — a set of logs with shared settings (retention, permissions) / one source's sequence of events.
- **Logs Insights** — a query language for searching and aggregating logs.
- **Metric filter** — a rule that creates metrics from matching log lines.
- **Alarm** — watches a metric or expression and changes state: `OK`, `ALARM`, `INSUFFICIENT_DATA`.
- **Composite alarm** — combines other alarms with AND, OR and NOT.
- **Synthetics canary** — a scheduled script that tests an endpoint or user journey.

## Metrics

### Level 1 — Reading AWS metrics

The metrics every back-end engineer should know where to find:

| Service | Key metrics |
|---|---|
| ALB | `RequestCount`, `TargetResponseTime` (p95/p99), `HTTPCode_Target_5XX_Count`, `HTTPCode_ELB_5XX_Count`, `UnHealthyHostCount` |
| ECS | Service `CPUUtilization`, `MemoryUtilization`, running task count |
| Lambda | `Invocations`, `Errors`, `Duration`, `Throttles`, `ConcurrentExecutions` |
| RDS | `CPUUtilization`, `DatabaseConnections`, `FreeStorageSpace`, `ReadLatency`/`WriteLatency`, `ReplicaLag` |
| SQS | `ApproximateAgeOfOldestMessage`, `ApproximateNumberOfMessagesVisible`, DLQ message count |

- Choose the **statistic** with care: `Sum` for counts (requests, errors), `Average` or percentiles for latency (percentiles are better — averages hide slow tails, {{ch:monitoring}}), `Maximum` for things like queue age.
- **Metric math** combines metrics: error rate = `100 * errors / requests`. Alarms can use these expressions.
- Most AWS metrics arrive every minute; EC2 basic monitoring is every five minutes unless detailed monitoring is on.

### Level 2 — Custom metrics with the Embedded Metric Format

The cheapest and simplest way to publish application metrics from Lambda or containers is to **log** them in the **Embedded Metric Format**: one JSON log line that CloudWatch Logs both stores as a log and converts into metrics, with no extra API calls:

```ts
// 1. Embedded Metric Format: one structured log line that CloudWatch also turns into metrics
function emf(namespace: string, dims: Record<string, string>, metrics: Record<string, { value: number; unit: string }>, extra: Record<string, unknown>, timestamp: number) {
  return JSON.stringify({
    _aws: {
      Timestamp: timestamp,
      CloudWatchMetrics: [{
        Namespace: namespace,
        Dimensions: [Object.keys(dims)],
        Metrics: Object.entries(metrics).map(([Name, m]) => ({ Name, Unit: m.unit })),
      }],
    },
    ...dims,
    ...Object.fromEntries(Object.entries(metrics).map(([k, m]) => [k, m.value])),
    ...extra,                                     // searchable in Logs Insights, but not a metric dimension
  });
}
console.log(emf("Shop", { Service: "checkout", Route: "POST /orders" },
  { OrderLatency: { value: 182, unit: "Milliseconds" }, OrdersPlaced: { value: 1, unit: "Count" } },
  { orderId: "1001", requestId: "req-7f3c" }, Date.UTC(2026, 10, 21, 9, 30)));

// 2. Alarm evaluation: "3 out of 5 datapoints above the threshold" with missing-data handling
type Treat = "missing" | "notBreaching" | "breaching";
function evaluate(points: (number | null)[], threshold: number, m: number, n: number, treat: Treat): string {
  const window = points.slice(-n);
  const known = window.filter((p) => p !== null).length;
  const breaching = window.filter((p) => (p === null ? treat === "breaching" : p > threshold)).length;
  if (treat === "missing" && known === 0) return "INSUFFICIENT_DATA";
  return breaching >= m ? "ALARM" : "OK";
}
const errorRate = [0.2, 0.3, 2.4, 0.4, 2.8];              // %, one datapoint per minute
const series: [string, (number | null)[]][] = [
  ["two short spikes        ", errorRate],
  ["sustained problem       ", [0.3, 2.1, 2.6, 3.0, 2.9]],
  ["service stopped sending ", [0.3, null, null, null, null]],
];
for (const [label, points] of series) {
  const asMissing = evaluate(points, 1, 3, 5, "missing");
  const asBreaching = evaluate(points, 1, 3, 5, "breaching");
  console.log(`${label} -> ${asMissing.padEnd(6)} (missing data as breaching: ${asBreaching})`);
}
```

**Output:**

```text
{"_aws":{"Timestamp":1795253400000,"CloudWatchMetrics":[{"Namespace":"Shop","Dimensions":[["Service","Route"]],"Metrics":[{"Name":"OrderLatency","Unit":"Milliseconds"},{"Name":"OrdersPlaced","Unit":"Count"}]}]},"Service":"checkout","Route":"POST /orders","OrderLatency":182,"OrdersPlaced":1,"orderId":"1001","requestId":"req-7f3c"}
two short spikes         -> OK     (missing data as breaching: OK)
sustained problem        -> ALARM  (missing data as breaching: ALARM)
service stopped sending  -> OK     (missing data as breaching: ALARM)
```

The first line is the EMF log line; the other three lines are explained in the next section.

- The `_aws` block declares that `OrderLatency` and `OrdersPlaced` are metrics in namespace `Shop` with **dimensions** `Service` and `Route`, whose values come from the same line.
- `orderId` and `requestId` are **not** dimensions: they are searchable in Logs Insights but do not create metrics. Every unique combination of dimension values is a separate metric with its own cost — the same **cardinality** concern as in {{ch:prometheus}}. Never use IDs as dimensions.
- Libraries do this for you: Powertools for AWS Lambda's Metrics utility, or the `aws-embedded-metrics` package.
- Alternatives: `PutMetricData` API calls (batched), the CloudWatch agent (host metrics, StatsD, Prometheus scraping), or OpenTelemetry exporters.

## Alarms

### Level 2 — How an alarm decides

An alarm compares a metric's **statistic** over a **period** with a **threshold**, using **datapoints to alarm**: "M out of N" periods must breach. The model in the previous example shows why that matters, and why missing data needs a decision.

The last three lines of the example's output above evaluate three series of error-rate datapoints against a "3 out of 5" rule with a 1% threshold.

- **Two short spikes** (2 of the last 5 minutes above 1%) did not alarm under a "3 out of 5" rule; a **sustained problem** did. "M out of N" filters noise without waiting for every single period to breach, which is better than "5 out of 5" (slow) or "1 out of 1" (noisy).
- **Missing data**: when the service **stopped sending** metrics, an alarm that treats missing data as *missing* evaluated only the one remaining healthy datapoint and stayed **OK** — while the service was down. Treating missing data as **breaching** raised the alarm.
- Choose per metric: for "errors" counts that are only emitted when errors happen, missing means healthy (`notBreaching`); for heartbeats, request counts or canaries, missing usually means broken (`breaching`). Adding a separate alarm on "no requests at all" is often clearest.

### Level 3 — Alarms worth having

```yaml
# fragment — CloudFormation-style alarm on the checkout error rate
CheckoutErrorRateAlarm:
  Type: AWS::CloudWatch::Alarm
  Properties:
    AlarmName: shop-checkout-5xx-rate
    AlarmDescription: "Checkout 5xx above 1% — runbook: https://runbooks.example.com/checkout-5xx"
    Metrics:
      - Id: errors
        MetricStat: { Metric: { Namespace: AWS/ApplicationELB, MetricName: HTTPCode_Target_5XX_Count, Dimensions: [{ Name: TargetGroup, Value: !GetAtt CheckoutTG.TargetGroupFullName }, { Name: LoadBalancer, Value: !GetAtt ALB.LoadBalancerFullName }] }, Period: 60, Stat: Sum }
        ReturnData: false
      - Id: requests
        MetricStat: { Metric: { Namespace: AWS/ApplicationELB, MetricName: RequestCount, Dimensions: [{ Name: TargetGroup, Value: !GetAtt CheckoutTG.TargetGroupFullName }, { Name: LoadBalancer, Value: !GetAtt ALB.LoadBalancerFullName }] }, Period: 60, Stat: Sum }
        ReturnData: false
      - Id: rate
        Expression: "100 * errors / requests"
        Label: "5xx %"
    ComparisonOperator: GreaterThanThreshold
    Threshold: 1
    EvaluationPeriods: 5
    DatapointsToAlarm: 3
    TreatMissingData: notBreaching
    AlarmActions: [!Ref PagerTopic]
    OKActions: [!Ref PagerTopic]
```

- Alarm on **symptoms** users feel — error rates, latency percentiles, queue age, failed canaries — and use resource metrics (CPU, memory) for dashboards and tickets ({{ch:monitoring}}).
- Every paging alarm has an **owner** and a **runbook link** in its description, and sends **OK** notifications too.
- **Composite alarms** reduce noise: page on "error rate high AND requests normal", or suppress child alarms during a known regional event.
- **Anomaly detection** alarms learn a metric's normal daily pattern and alert on unusual values — useful for traffic and business metrics.
- **Actions**: SNS topics to chat or paging tools, auto scaling policies, EC2 recovery, and Systems Manager runbooks ({{ch:systems-manager}}).
- Define alarms **in code** with the resources they watch ({{ch:cloudformation}}, {{ch:terraform}}).

## Logs

### Level 2 — Log groups, retention and structure

- ECS (`awslogs`), Lambda and many AWS services write to **log groups** such as `/ecs/shop-api` and `/aws/lambda/send-emails`.
- **Retention** is "never expire" by default — set it on every log group (for example 30 days for application logs, longer for audit logs where required). Unbounded retention is a common silent cost.
- Log **structured JSON** with consistent fields (`level`, `requestId`, `route`, `durationMs`); Logs Insights discovers JSON fields automatically ({{ch:logging}}).
- **Never log secrets or personal data**; use the data protection policies to detect and mask sensitive data.

### Level 3 — Logs Insights

Logs Insights queries search and aggregate across log groups:

```text
fields @timestamp, level, route, durationMs, msg
| filter level = "error" and route like /checkout/
| sort @timestamp desc
| limit 50
```

```text
filter ispresent(durationMs)
| stats count() as requests, avg(durationMs) as avgMs, pct(durationMs, 99) as p99Ms by route
| sort p99Ms desc
```

```text
filter msg like /payment declined/
| stats count() as declines by bin(5m)
```

- The first finds recent checkout errors; the second ranks routes by p99 latency from logs; the third charts payment declines in five-minute buckets.
- Queries are charged by data scanned: narrow the time range and log groups.
- **Metric filters** turn matching log lines into metrics (count of `"level":"error"` lines) for alarms; **subscription filters** stream logs to Lambda, Kinesis or OpenSearch.
- **Live Tail** streams logs in real time while you debug a deployment.

## Beyond metrics and logs

### Level 4 — Tracing, canaries and insights

- **X-Ray / Application Signals**: traces with service maps, latency per dependency and SLO tracking; OpenTelemetry-compatible.
- **Synthetics canaries**: scheduled Node.js or Python scripts (often headless browser scripts) that log in, search and check out every few minutes from several regions; alarms on their success rate catch failures before users report them ({{ch:monitoring}}).
- **Container Insights** for ECS and EKS: per-task and per-pod CPU, memory, network and restarts.
- **Lambda Insights** for function-level memory and cold starts.
- **Dashboards** for each service with golden signals and deployment annotations; **cross-account observability** lets a monitoring account see metrics and logs from many accounts.
- CloudWatch can also be a data source for Grafana ({{ch:grafana}}).

### Level 4 — Controlling cost

CloudWatch cost grows quietly:

- **Log ingestion** (per GB) is often the largest item: reduce noisy debug logs in production, sample high-volume logs, and set retention.
- **Custom metrics** are billed per metric: high-cardinality dimensions multiply them.
- **High-resolution** metrics and alarms, many dashboards, Logs Insights scans and canaries all add up.
- Review costs per service with Cost Explorer and the CloudWatch usage metrics ({{ch:cost-optimization}}).

## From beginner to enterprise

**Level 1–2 — first steps.** Finding service metrics; choosing statistics; structured logs in log groups with retention; basic alarms with SNS notifications.

**Level 3 — useful alarms and queries.** Metric math error rates; "M out of N" and missing-data choices; runbook links and OK actions; Logs Insights queries; EMF custom metrics without high cardinality.

**Level 4 — observability on AWS.** Composite and anomaly alarms; tracing; synthetic canaries; Container and Lambda Insights; alarms and dashboards as code; cost control.

**Level 5 — senior practice.** Choosing between CloudWatch and open-source or SaaS tools per signal; SLO-based alarms; cross-account observability design.

**Level 6 — enterprises.** Central monitoring accounts, organisation-wide alarm standards and log policies, telemetry budgets and governance.

## Real-world use cases

### The silent outage

- **What happened**: a deployment broke the API's start-up; no tasks ran, so no errors were logged and the error-rate alarm (missing data treated as missing) stayed OK for 40 minutes until customers complained.
- **Fix**: a canary on the main user journey, an alarm on `HealthyHostCount < 1` and on request count falling to zero, and missing data treated as breaching where silence means failure.

### Finding the slow route

- **Practice**: a Logs Insights query of p99 `durationMs` by route showed one search endpoint at 4 seconds; an index fixed it ({{ch:indexes}}). The query became a dashboard widget.

## Common mistakes

### Beginner: no log retention

**Consequence:** ever-growing costs. **Fix:** retention on every log group.

### Beginner: `Average` for latency alarms

**Consequence:** slow tails hidden. **Fix:** percentiles.

### Beginner: alarms with no actions

**Consequence:** nobody is told. **Fix:** SNS actions to the right channel and paging tool.

### Intermediate: 1-out-of-1 datapoint alarms

**Consequence:** noisy pages. **Fix:** "M out of N" with sensible periods.

### Intermediate: ignoring missing data

**Consequence:** silent outages. **Fix:** decide per alarm; add heartbeat and canary alarms.

### Intermediate: IDs as metric dimensions

**Consequence:** thousands of metrics and a large bill. **Fix:** IDs in logs, not dimensions.

### Production: alarms clicked together in the console

**Consequence:** undocumented, inconsistent alarms. **Fix:** alarms in code with runbooks.

## Debugging and troubleshooting

- **Metric missing**: wrong region, namespace or dimensions (all dimensions must match exactly); custom metrics may take a few minutes to appear.
- **Alarm in `INSUFFICIENT_DATA`**: no datapoints — the metric is not being sent, or the dimensions are wrong.
- **Alarm did not fire**: check its history: the statistic, period, datapoints to alarm and missing-data treatment.
- **No logs from a task or function**: the execution role lacks log permissions, the log group name differs, or the application writes to a file instead of stdout.
- **Logs Insights finds nothing**: time range, log group selection, or field names (JSON fields are case-sensitive).

## Security summary

- **No secrets or personal data in logs**; use data protection policies to mask.
- **Restrict log access** with IAM per log group; production logs can contain sensitive information.
- **Encrypt** log groups with KMS where required.
- **Protect alarm and log configuration** from changes; attackers disable monitoring first — CloudTrail records changes.
- **Monitor security signals**: CloudTrail events in CloudWatch, alarms on root logins and IAM changes ({{ch:iam}}).

## How a senior engineer thinks about this

- **Alarms are products.** Owned, documented, tested and reviewed after every page.
- **Silence is a signal.** Every alarm decides what missing data means.
- **Logs are for questions, metrics are for alerts.** Structured logs answer "why"; metrics and alarms answer "is it broken".
- **Watch the bill.** Telemetry cost needs the same attention as compute.

## Exercises

### Exercise 1 — Write the alarm

**Objective:** practise alarm design.
**What to do:** design an alarm for "the payment worker's SQS queue has messages waiting too long". Choose the metric, statistic, period, threshold, datapoints and missing-data treatment.

<details>
<summary>Show the solution</summary>

- Metric: `AWS/SQS` `ApproximateAgeOfOldestMessage`, dimension `QueueName = payments`.
- Statistic: `Maximum`; period 60 seconds.
- Threshold: above the normal processing time plus margin — for example 300 seconds.
- Datapoints: 3 out of 5.
- Missing data: `breaching` is too aggressive for SQS (it reports regularly, but treating missing as breaching could alarm during metric delays); `missing` with a separate alarm on the worker's health is reasonable.
- Action: page the payments team via SNS with a runbook link; also alarm on the DLQ having any messages.

</details>

### Exercise 2 — Write the queries

**Objective:** practise Logs Insights.
**What to do:** write queries to (a) count errors per route in the last hour, (b) find all log lines for request `req-7f3c`.

<details>
<summary>Show the solution</summary>

```text
filter level = "error"
| stats count() as errors by route
| sort errors desc
```

```text
fields @timestamp, @logStream, level, msg
| filter requestId = "req-7f3c"
| sort @timestamp asc
```

Run (b) across all relevant log groups so the request can be followed through several services — which works only if services propagate the same request ID ({{ch:logging}}).

</details>

### Exercise 3 — Production scenario: alarm fatigue

**Objective:** practise cleaning up alarms.
**The scenario:** the on-call engineer receives about 40 CloudWatch alarm notifications a week; most resolve themselves within minutes, and last week a real outage was missed among them. What do you do?

<details>
<summary>Show the solution</summary>

1. **List every alarm that fired** in the last month with how often and whether action was needed.
2. **Delete or downgrade** alarms that never needed action (CPU spikes, single errors) — to dashboards or tickets.
3. **Tune the rest**: "M out of N" instead of 1-out-of-1; longer periods; percentiles instead of averages; correct missing-data handling.
4. **Page on symptoms** with SLO burn-rate style alarms on error rates and latency ({{ch:monitoring}}); composite alarms to group related ones.
5. **Add runbooks and owners**; review every page afterwards.
6. Track pages per week as a team metric.

</details>

## Summary

**CloudWatch** stores **metrics** (identified by namespace, name and dimensions, summarised by a **statistic** over a **period**), **logs** (log groups and streams), and evaluates **alarms** that drive notifications, scaling and runbooks. Every AWS service reports metrics there; choose `Sum` for counts, percentiles for latency and `Maximum` for ages, and combine metrics with **metric math**. Publish application metrics cheaply with the **Embedded Metric Format** — structured log lines that become metrics — keeping IDs out of dimensions.

Alarms breach when **M out of N** datapoints cross the threshold, which filters noise; **missing data** must be treated deliberately, because a service that stops reporting can otherwise look healthy. Alarm on user-facing symptoms with runbooks, owners and OK actions; use composite and anomaly alarms; define alarms in code. Set **retention** on every log group, log structured JSON without secrets, and query with **Logs Insights**; metric and subscription filters turn logs into metrics and streams. Add tracing, **Synthetics canaries** and Container or Lambda Insights, and keep an eye on log ingestion and custom-metric costs.

## Key terms

- **CloudWatch** — AWS's monitoring and observability service.
- **Namespace** — A container that groups related metrics.
- **Dimension** — A name-value pair that identifies a metric variant.
- **Statistic** — The summary of datapoints over a period, such as Sum or p99.
- **Period** — The time span each datapoint covers.
- **Metric math** — Expressions that compute new series from metrics.
- **Custom metric** — A metric published by your application.
- **Embedded Metric Format** — A JSON log format that CloudWatch converts into metrics.
- **Log group** — A collection of log streams with shared settings.
- **Log stream** — A sequence of log events from one source.
- **Retention** — How long logs are kept.
- **Logs Insights** — CloudWatch's log query language and tool.
- **Metric filter** — A rule that creates metrics from log lines.
- **Alarm** — A rule that changes state based on a metric or expression.
- **Datapoints to alarm** — The M in "M out of N" breaching periods.
- **Missing data treatment** — How an alarm interprets periods without data.
- **Composite alarm** — An alarm combining other alarms with logic.
- **Anomaly detection** — Alarms based on a learned normal range.
- **Synthetics canary** — A scheduled script that tests an endpoint or journey.

## What comes next

Alarms, queues, roles and networks should all be created from code. The next chapter, {{ch:cloudformation}}, covers CloudFormation, AWS's own infrastructure-as-code service, and the CDK, which generates it from TypeScript: templates, stacks, change sets, drift, nested stacks and when to choose them over Terraform.
