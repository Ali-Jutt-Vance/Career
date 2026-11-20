# Monitoring

> [!GOALS]
> - Explain why monitoring exists and what "the system is healthy" actually means.
> - Know the three kinds of telemetry — **metrics**, **logs** and **traces** — and when each helps.
> - Use the **golden signals**, **RED** and **USE** methods to decide what to measure.
> - Understand **percentiles** and why averages hide problems.
> - Define **SLIs**, **SLOs** and **error budgets**, and alert on **symptoms** with **burn rates** instead of noisy thresholds.
> - Build dashboards, health checks and on-call habits that help in real incidents.

## Why this matters

Once software is in production, the most important question is the simplest: **is it working for our users right now?** Without monitoring, you find out from angry customers, a drop in sales or a message from your manager — usually hours after the problem began. With good monitoring, you know within minutes, you can see what changed, and often you can fix it before most users notice.

Monitoring also answers slower questions: Is the service getting slower month by month? Will the database run out of disk next quarter? Did last week's release make checkout faster or slower? Are we meeting what we promised customers?

Every production team relies on monitoring, and every engineer on such a team uses it — to check a deployment ({{ch:cicd}}), to investigate a bug report, or when paged at night. This chapter covers the concepts that apply in every tool. The next two chapters use the most common open-source pair: {{ch:prometheus}} for collecting metrics and {{ch:grafana}} for dashboards and alerts.

## The simple idea

Think of the instruments in a car. You do not open the bonnet every minute to check the engine. Instead a few gauges — speed, fuel, engine temperature — tell you the important things at a glance, and warning lights come on only when something needs attention. A good car does not light up for every tiny change; when a light comes on, you act.

Monitoring is the instrument panel for software: a few well-chosen measurements showing how the system is doing, and alerts that come on only when a human needs to act.

> [!ANALOGY]
> Monitoring is like a car's instrument panel: a few gauges for the important things, and warning lights only when you need to act.
>
> **Where the analogy breaks:** a car's gauges were designed by the manufacturer, and the warning lights are already set. In software, **you** choose what to measure and when to alert. Choose badly and you get a panel with hundreds of gauges nobody understands and warning lights that flash all night — so people learn to ignore them, including on the night it matters.

## The proper definition and key words

**Monitoring** is collecting, storing, displaying and alerting on measurements of a system's behaviour, so that people can tell whether it is working and find out why it is not. **Observability** is the wider property of a system that lets you understand its internal state from its outputs — especially for problems you did not predict ({{ch:observability-and-incidents}}).

Key words:

- **Telemetry** — data a system emits about itself: metrics, logs, traces.
- **Metric** — a number measured over time (requests per second, error count, memory used).
- **Log** — a record of an individual event ({{ch:logging}}).
- **Trace** — the path of one request through several services, with timing for each step.
- **Golden signals** — latency, traffic, errors and saturation.
- **Percentile (p50, p95, p99)** — the value below which that percentage of measurements fall.
- **SLI (service level indicator)** — a measured quantity that reflects user experience, such as the share of successful requests.
- **SLO (service level objective)** — a target for an SLI over a time window, such as 99.9% over 30 days.
- **SLA (service level agreement)** — a contract with customers, with consequences if it is missed.
- **Error budget** — the amount of failure an SLO allows.
- **Burn rate** — how fast the error budget is being used.
- **Alert** — a notification that a human must act; **page** — an urgent alert that wakes someone.
- **Cardinality** — the number of distinct label combinations of a metric.

## What to measure

### Level 1 — Three kinds of telemetry

| | Metrics | Logs | Traces |
|---|---|---|---|
| What | Numbers over time | Individual events with details | One request's path across services |
| Example | `http_requests_total{status="500"}` = 1,204 | `order 1042 failed: card declined` | checkout → payments (840 ms) → bank API (790 ms) |
| Good for | Trends, dashboards, alerts — "is something wrong?" | Details of specific events — "what happened to this order?" | Finding where time goes in distributed systems — "which service is slow?" |
| Cost | Cheap: small, fixed size | Grows with traffic | Usually sampled |

They work together. A **metric** alert says the error rate has risen; a **dashboard** shows it started at 14:05, right after a deployment; **logs** filtered to that service and time show the error message; a **trace** of a failing request shows which downstream call fails. Linking them — log lines that include the trace ID, dashboards that link to logs — makes this fast ({{ch:logging}}). OpenTelemetry is the common open standard for producing all three.

### Level 2 — The golden signals, RED and USE

You cannot measure everything usefully. Three well-known checklists tell you where to start:

- **The four golden signals** (from Google's SRE practice), for any user-facing service:
  - **Latency** — how long requests take (separately for successful and failed requests: fast failures can make latency look better).
  - **Traffic** — how much demand: requests per second, messages per second.
  - **Errors** — the rate of failed requests: HTTP 5xx, timeouts, wrong answers.
  - **Saturation** — how full the service is: CPU, memory, connection pools, queue length.
- **RED** for every service: **R**ate, **E**rrors, **D**uration — the golden signals without saturation.
- **USE** for every resource (CPU, disk, database connections): **U**tilisation, **S**aturation (work waiting), **E**rrors.

For a typical API, this means: requests per second by route; error rate by route and status; latency percentiles by route; plus CPU, memory, event-loop delay ({{ch:the-event-loop}}), database pool usage and queue backlogs ({{ch:queues}}). Add **business metrics** too — orders per minute, payments succeeded — because they often reveal problems technical metrics miss.

### Level 2 — Percentiles: why averages lie

Latency is never one number. Most requests are fast; a few are slow, and those few are exactly the ones users complain about. An **average** mixes them into a number that describes nobody:

```ts
// Why averages hide problems: 1,000 request latencies where 3% of requests are very slow.
function percentile(sorted: number[], p: number): number {
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)]!;
}

let seed = 42;                                      // a fixed pseudo-random sequence, so the run is repeatable
const random = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);

const latencies: number[] = [];
for (let i = 0; i < 1000; i++) {
  const slow = random() < 0.03;                      // 3% hit a slow database query
  latencies.push(Math.round(slow ? 1800 + random() * 1200 : 40 + random() * 60));
}
latencies.sort((a, b) => a - b);

const average = latencies.reduce((s, x) => s + x, 0) / latencies.length;
console.log(`average: ${average.toFixed(0)} ms`);
for (const p of [50, 90, 95, 99]) console.log(`p${p}:     ${percentile(latencies, p)} ms`);
console.log(`max:     ${latencies.at(-1)} ms`);
console.log(`requests slower than 1 second: ${latencies.filter((x) => x > 1000).length} of ${latencies.length}`);
```

**Output:**

```text
average: 149 ms
p50:     70 ms
p90:     96 ms
p95:     99 ms
p99:     2574 ms
max:     2933 ms
requests slower than 1 second: 35 of 1000
```

- The **average** (149 ms) matches no real request: the typical request takes about 70 ms, and the slow ones take two to three seconds.
- **p50** (the median) says what a typical user sees; **p95** says 95% of requests are under 99 ms — and still hides the problem, because 3.5% of requests are slow.
- **p99** reveals it: 1 in 100 requests takes over 2.5 seconds. On a page that makes 30 API calls, most page loads include at least one of those slow calls. That is why teams watch **p95 and p99**, not averages.
- Percentiles cannot be averaged across servers or time windows; monitoring systems compute them from **histograms** (counts of requests in latency buckets), as {{ch:prometheus}} shows.

## Service level objectives

### Level 3 — SLIs, SLOs and SLAs

Which numbers really matter? The ones that describe **user experience**. An **SLI** expresses one as a ratio of good events to all events:

- **Availability**: successful requests ÷ all requests (excluding the client's own 4xx errors).
- **Latency**: requests faster than 300 ms ÷ all requests.
- **Freshness** for pipelines: data updated within 10 minutes ÷ all checks.

An **SLO** sets a target over a window: "99.9% of checkout requests succeed over 30 days" and "99% complete within 500 ms". An **SLA** is a contract built on looser targets, with refunds if broken — engineers aim for internal SLOs tighter than the SLA.

Why not aim for 100%? Because nothing is 100% reliable (networks, clouds and dependencies all fail), each extra "nine" costs much more effort, and users cannot tell 99.99% from 100% through their own unreliable mobile network. The SLO states **how reliable is reliable enough** — and makes the rest a budget.

### Level 3 — Error budgets and burn rates

```ts
// SLOs and error budgets: how much failure the objective allows, and how fast it is being spent.
const slo = 0.999;                                   // 99.9% of requests succeed, over 30 days
const windowDays = 30;
const requestsPer30Days = 90_000_000;

const budget = Math.round((1 - slo) * requestsPer30Days);
console.log(`SLO ${slo * 100}% -> error budget: ${budget.toLocaleString("en-GB")} failed requests per ${windowDays} days`);
console.log(`as downtime: ${((1 - slo) * windowDays * 24 * 60).toFixed(1)} minutes per ${windowDays} days`);

// Burn rate = observed error rate / allowed error rate. 1 means "exactly spending the budget over 30 days".
function burnRate(errors: number, requests: number): number {
  return errors / requests / (1 - slo);
}
function daysUntilEmpty(rate: number): string {
  return rate <= 1 ? "budget lasts the whole window" : `budget gone in ${(windowDays / rate).toFixed(1)} days`;
}

const lastHour = [
  ["normal hour        ", 120, 125_000],
  ["small bug          ", 600, 125_000],
  ["bad deploy         ", 9_000, 125_000],
] as const;
for (const [label, errors, requests] of lastHour) {
  const rate = burnRate(errors, requests);
  const page = rate >= 14.4 ? "PAGE someone now" : rate >= 3 ? "open a ticket" : "no alert";
  console.log(`${label} error rate ${((100 * errors) / requests).toFixed(2)}%  burn rate ${rate.toFixed(1).padStart(4)}  ${daysUntilEmpty(rate).padEnd(30)} -> ${page}`);
}
```

**Output:**

```text
SLO 99.9% -> error budget: 90,000 failed requests per 30 days
as downtime: 43.2 minutes per 30 days
normal hour         error rate 0.10%  burn rate  1.0  budget lasts the whole window  -> no alert
small bug           error rate 0.48%  burn rate  4.8  budget gone in 6.3 days        -> open a ticket
bad deploy          error rate 7.20%  burn rate 72.0  budget gone in 0.4 days        -> PAGE someone now
```

- A 99.9% SLO allows 0.1% failures: 90,000 failed requests, or about **43 minutes** of full downtime, per 30 days. That is the **error budget**.
- The **burn rate** compares the current error rate with the allowed rate. At 1, the budget lasts exactly the window — normal. At 72, the whole month's budget is gone in about ten hours — a human must act **now**.
- Alerting on burn rate means **urgency follows impact**: a small bug creates a ticket for working hours; a bad deploy wakes someone. A widely used rule pages when the one-hour burn rate exceeds 14.4 (2% of a 30-day budget spent in one hour), confirmed by a shorter window so the alert also stops quickly when the problem is fixed.
- The budget is also a **decision tool**: while there is budget left, the team ships features and takes reasonable risks; when it is spent, reliability work comes first. This turns "move fast" versus "be stable" from an argument into a number both sides agreed.

## Alerting

### Level 3 — Alert on symptoms, not causes

Good alerts share three properties: they are **urgent**, **actionable** and **about user impact**.

- **Page on symptoms**: high error rates, high latency, SLO burn, a failing checkout synthetic check — things users feel.
- **Do not page on causes**: CPU at 85%, one server restarting, a queue at 1,000 messages. These may not hurt users at all (the system may be coping fine). Show them on dashboards, or send low-urgency tickets — **except** where a cause predicts certain user impact soon: a disk 95% full and filling, certificates expiring in 7 days ({{ch:tls-ssl}}).
- **Every page has a runbook**: what this alert means, how to check impact, first steps, how to escalate.
- **Every page is reviewed**: if an alert fired and nobody needed to do anything, change it or delete it. **Alert fatigue** — so many alerts that people stop reading them — is how real incidents get missed.

### Level 3 — Health checks and synthetic monitoring

- **Liveness checks** answer "is the process alive?" — if not, the platform restarts it. Keep them simple; checking the database here causes all instances to be restarted whenever the database blips.
- **Readiness checks** answer "can this instance serve traffic?" — dependencies reachable, warm-up done. Failing instances are removed from the load balancer, not restarted ({{ch:docker}}).
- **Synthetic monitoring** runs scripted requests from outside — log in, search, add to basket — every minute from several regions. It catches problems even when there is no traffic (at night, after a DNS change) and measures the experience as users see it.
- **Real user monitoring (RUM)** measures actual page loads and errors in users' browsers ({{ch:frontend-performance}}).

## Dashboards and on-call

### Level 4 — Dashboards that answer questions

- **One overview per service**: the golden signals (traffic, error rate, latency percentiles, saturation) for the last few hours, with deployment markers, at the top. Someone paged at 3 a.m. should understand the situation in 30 seconds.
- **Drill-down dashboards** for components: database, cache, queues, dependencies.
- **Consistent layout and units** across services, built from code or templates ({{ch:grafana}}).
- **Fewer, better panels**: a dashboard with 80 graphs answers no question.

### Level 4 — Costs and cardinality

Monitoring systems store each unique combination of labels as a separate time series. Labels like route, method and status are fine (a few hundred combinations). Labels like **user ID, order ID or full URL** create millions of series, slow down queries and can cost a fortune. Put per-request details in logs and traces, not metric labels ({{ch:prometheus}}). Also: keep high-resolution data for days, downsampled data for months; sample traces; set log retention by value.

## From beginner to enterprise

**Level 1–2 — first monitoring.** Uptime checks; the golden signals for each service; structured logs; percentiles instead of averages; a dashboard per service.

**Level 3 — reliable alerting.** SLIs and SLOs for key user journeys; burn-rate alerts; symptom-based paging with runbooks; liveness and readiness checks; synthetic checks.

**Level 4 — operational maturity.** Linked metrics, logs and traces with OpenTelemetry; deployment markers; dashboards as code; cardinality and cost control; on-call rotations with alert reviews.

**Level 5 — senior practice.** Negotiating SLOs with product owners; using error budgets for release decisions; capacity planning from trends; designing telemetry into new services from the start.

**Level 6 — enterprises.** Central observability platforms; organisation-wide SLO reporting; standard instrumentation libraries; cost governance for telemetry at scale.

## Real-world use cases

### The quiet checkout failure

- **What happened**: a payment provider's change made 4% of card payments fail. Servers were healthy, CPU normal, no exceptions in the API — the provider returned a "declined" status.
- **Caught by**: a business metric — payment success rate — with a burn-rate alert on its SLO, 12 minutes after the change. Technical metrics alone would never have shown it.

### The slow creep

- **What happened**: p99 latency of the product search rose a little every week as the catalogue grew.
- **Caught by**: a monthly SLO review showing the latency SLO budget being spent faster each month; an index was added ({{ch:indexes}}) before users complained.

## Common mistakes

### Beginner: averages instead of percentiles

**Consequence:** slow requests hidden. **Fix:** p50, p95 and p99 from histograms.

### Beginner: monitoring only servers, not user experience

**Consequence:** "all green" during an outage. **Fix:** SLIs from requests and user journeys; synthetic checks.

### Intermediate: paging on causes

**Consequence:** alert fatigue. **Fix:** page on symptoms and SLO burn; causes go to dashboards and tickets.

### Intermediate: alerts without runbooks or owners

**Consequence:** confusion at 3 a.m. **Fix:** every alert has an owner and a runbook.

### Intermediate: liveness checks that test dependencies

**Consequence:** a database blip restarts every instance. **Fix:** keep liveness simple; dependencies in readiness.

### Production: high-cardinality labels

**Consequence:** slow, expensive monitoring. **Fix:** IDs in logs and traces, not metric labels.

### Production: SLO of 100%

**Consequence:** impossible targets and no room to ship. **Fix:** realistic SLOs agreed with the business, with error budgets.

## Debugging and troubleshooting

- **Start from the user-facing symptom**: which SLI moved, when, and for which routes, regions or customers.
- **Look for change**: deployment markers, configuration changes, traffic shifts, dependency incidents.
- **Narrow with dimensions**: split by route, status, instance and version; a problem on one instance or one version tells a different story than one everywhere.
- **Go to logs and traces** for the narrowed slice; follow a failing request's trace.
- **Missing data is a signal**: a graph that stops is often a service that stopped reporting — alert on absent data for key metrics.

## Security summary

- **Telemetry can leak data**: never put passwords, tokens or personal data in metric labels, logs or trace attributes ({{ch:logging}}).
- **Protect monitoring endpoints and tools**: metrics endpoints and dashboards reveal internals; require authentication and keep them off the public internet.
- **Monitor for security**: spikes in 401/403 responses, login failures, rate-limit hits and unusual traffic sources can show attacks ({{ch:rate-limiting}}).
- **Audit logs** for administrative actions belong in tamper-resistant storage.

## How a senior engineer thinks about this

- **Measure what users feel.** SLIs for key journeys come first; everything else supports them.
- **Every alert costs sleep.** Page only when a human must act now; review every page.
- **Percentiles and budgets, not averages and perfection.**
- **Telemetry is part of the feature.** New endpoints ship with metrics, logs and traces.
- **Monitoring is never finished.** Each incident teaches what was missing.

## Exercises

### Exercise 1 — Choose the signals

**Objective:** practise choosing metrics.
**What to do:** list what you would measure for an orders API that writes to PostgreSQL and publishes messages to a queue for a separate email worker.

<details>
<summary>Show the solution</summary>

**API (RED):** requests per second by route; error rate by route and status class; p50, p95, p99 latency by route.
**Saturation (USE):** CPU and memory; event-loop delay; database pool in use and waiting; queue publish failures.
**Database:** query latency, connections, slow queries, replication lag, disk usage.
**Queue and worker:** queue depth and age of the oldest message; worker processing rate and failures; dead-letter queue size ({{ch:queues}}).
**Business:** orders created per minute; payment success rate; emails sent.
**SLIs:** the share of successful order requests and the share completed under 500 ms; the share of confirmation emails sent within five minutes.

</details>

### Exercise 2 — Fix the alerts

**Objective:** practise alert design.
**The alerts:** page when CPU > 80% for 1 minute; page when any 5xx happens; page when average latency > 1 s; email when the disk is 99% full. Improve them.

<details>
<summary>Show the solution</summary>

- **CPU > 80%**: a cause, often harmless; show it on dashboards, and perhaps a ticket if saturation persists for hours.
- **Any 5xx**: far too noisy; page on **SLO burn rate** of the availability SLI (for example a one-hour burn rate above 14.4, confirmed by a short window), and create tickets for slower burns.
- **Average latency**: use a **latency SLI** — the share of requests under the threshold — with burn-rate alerts, or p99 per route.
- **Disk 99% full by email**: too late and too quiet; alert on **predicted** exhaustion (for example "full within 4 hours" from the growth trend) as a page, and earlier thresholds as tickets.
- Give every remaining page a runbook and owner.

</details>

### Exercise 3 — Production scenario: "all green, users unhappy"

**Objective:** practise diagnosing monitoring gaps.
**The scenario:** customer support reports many complaints that the mobile app is "slow and sometimes fails at checkout". The team's dashboards show CPU and memory normal, average latency 120 ms and an error rate of 0.2%. What is missing, and how do you investigate?

<details>
<summary>Show the solution</summary>

**Likely gaps**: averages hide slow tails; one overall error rate hides one failing route; server-side metrics miss failures before requests reach the servers (DNS, TLS, CDN, mobile networks); technical errors miss business failures (payment declines).

**Investigate**
1. Look at **p95 and p99** latency **per route**, especially checkout.
2. Break errors down **by route, app version, region and payment provider**.
3. Check **business metrics**: checkout completion and payment success rates over time.
4. Look at **client-side** data (mobile RUM, crash reports) and synthetic checks of the checkout journey.
5. Follow **traces** of slow checkouts to find the slow dependency.

**Then** define checkout SLIs (success and latency), set SLOs with burn-rate alerts, and add a synthetic checkout check.

</details>

## Summary

**Monitoring** tells you whether a system is working for its users and helps you find out why not. Systems emit three kinds of **telemetry**: **metrics** (cheap numbers over time, for trends and alerts), **logs** (individual events, for details) and **traces** (one request's path through services, for finding where time goes) — most useful when linked together.

Decide what to measure with the **golden signals** (latency, traffic, errors, saturation), **RED** for services and **USE** for resources, plus business metrics. Measure latency with **percentiles** from histograms: averages describe nobody and hide slow tails, while p95 and p99 show what unlucky users see.

**SLIs** measure user experience as good events ÷ all events; **SLOs** set targets over a window; **SLAs** are contracts. The gap between the SLO and 100% is the **error budget**, and the **burn rate** shows how fast it is being spent — the basis for alerts whose urgency matches the impact, and for decisions between shipping features and reliability work. **Page on symptoms**, not causes; give every alert an owner and a runbook; review every page to prevent **alert fatigue**. Use simple **liveness** checks, dependency-aware **readiness** checks and **synthetic** journeys. Build overview dashboards around the golden signals, control **cardinality**, and keep secrets and personal data out of telemetry.

## Key terms

- **Monitoring** — Collecting, displaying and alerting on measurements of a system's behaviour.
- **Observability** — How well a system's internal state can be understood from its outputs.
- **Telemetry** — Data a system emits about itself.
- **Metric** — A numerical measurement recorded over time.
- **Trace** — A record of one request's path through a system, with timings.
- **Golden signals** — Latency, traffic, errors and saturation.
- **RED method** — Monitoring services by rate, errors and duration.
- **USE method** — Monitoring resources by utilisation, saturation and errors.
- **Percentile** — The value below which a given percentage of measurements fall.
- **Histogram** — Counts of measurements in ranges (buckets), used to compute percentiles.
- **SLI** — A measured indicator of user experience, usually good events divided by all events.
- **SLO** — A target value for an SLI over a time window.
- **SLA** — A contractual commitment to customers about service levels.
- **Error budget** — The amount of failure an SLO allows within its window.
- **Burn rate** — How fast the error budget is being consumed relative to the allowed rate.
- **Alert fatigue** — Ignoring alerts because there are too many unhelpful ones.
- **Runbook** — Instructions for responding to a specific alert.
- **Liveness check** — A check that a process is alive, used to restart it.
- **Readiness check** — A check that an instance can serve traffic, used to route traffic.
- **Synthetic monitoring** — Scripted checks that exercise a system from outside on a schedule.
- **Cardinality** — The number of distinct label combinations for a metric.

## What comes next

These ideas need a system that collects and queries metrics. The next chapter, {{ch:prometheus}}, introduces Prometheus: instrumenting a Node.js service with counters, gauges and histograms, how scraping works, PromQL queries for rates, error ratios and percentiles, recording rules and alerting rules.
