# Observability and Production Incidents

> [!GOALS]
> - Explain **observability** and how it extends monitoring to questions you did not predict.
> - Connect **logs, metrics and traces** with shared context, using **OpenTelemetry** and trace propagation.
> - Run **on-call** sustainably, with good alerts, runbooks and escalation.
> - Handle an **incident**: severity, roles, communication, mitigation first, then resolution.
> - Write and run **blameless post-incident reviews** that make systems better.
> - Build reliability habits: SLOs, game days, chaos experiments and learning from near misses.

## Why this matters

Every production system fails sometimes. Disks fill, dependencies slow down, a deployment contains a bug, a certificate expires, a traffic spike arrives. What separates good teams from struggling ones is not whether incidents happen, but how quickly they **notice**, how calmly and effectively they **respond**, and whether they **learn** so the same failure does not happen again.

**Observability** is what makes that possible: being able to ask "why is this slow for customers in Germany using the mobile app?" and get an answer from your telemetry, without deploying new code. **Incident management** is the human process around it. Both are core senior-engineer skills — the person who can lead an incident calmly at 3 a.m. and run a review that improves the system is trusted with the most important work. This chapter builds on {{ch:logging}}, {{ch:monitoring}}, {{ch:prometheus}}, {{ch:grafana}} and {{ch:cloudwatch}}.

## The simple idea

Think of a hospital emergency department. Monitors on each patient show vital signs (metrics), nurses write notes (logs), and a patient's journey through triage, X-ray and surgery is tracked (traces). When an emergency arrives, there is a clear process: someone takes charge, others have defined jobs, the family is kept informed, the patient is stabilised first, and the cause is investigated afterwards. Later, the team reviews what happened to improve — without blaming individuals for honest mistakes.

> [!ANALOGY]
> Handling production incidents is like an emergency department: instruments show what is happening, one person leads, everyone has a role, the patient is stabilised first, and the team reviews afterwards to improve.
>
> **Where the analogy breaks:** a hospital's patients are separate people. Software components are connected, so one failure spreads into symptoms everywhere — the "patient" with the loudest alarms is often not the one with the problem. And software lets you undo the last change in seconds, which is often the fastest treatment.

## The proper definition and key words

**Observability** is the ability to understand a system's internal state from its external outputs — logs, metrics, traces and events — well enough to answer new questions without changing the code. An **incident** is an unplanned event that disrupts or degrades a service, requiring an urgent response.

Key words:

- **Telemetry** — logs, metrics, traces (and profiles, events) emitted by the system.
- **Cardinality / dimensionality** — how many distinct values and attributes telemetry carries; high-dimensional events answer more questions.
- **OpenTelemetry (OTel)** — the open standard and SDKs for producing and exporting telemetry.
- **Trace context propagation** — passing trace IDs between services (W3C `traceparent` header).
- **On-call** — the rotation of engineers responsible for responding to alerts.
- **Runbook / playbook** — step-by-step instructions for known alerts and situations.
- **Severity (SEV)** — a classification of an incident's impact that sets the response.
- **Incident commander (IC)** — the person coordinating the response.
- **Mitigation** — stopping the impact (rollback, failover, feature flag off), before the root cause is fixed.
- **MTTD / MTTM / MTTR** — mean time to detect / mitigate / resolve (or recover).
- **Post-incident review (postmortem)** — a written analysis of an incident and actions to prevent recurrence.
- **Blameless** — focusing on systems and conditions, not on punishing individuals.

## Observability

### Level 1 — From monitoring to observability

Monitoring answers **known questions**: is the error rate above 1%? Observability answers **new** ones: which customers, which version, which region, which dependency, why now? It needs:

- **Rich context on every signal**: service, version, environment, region, route, customer tier, feature flags, trace ID.
- **The three signals linked**: a metric spike leads to traces of slow requests, which lead to logs of those requests.
- **The ability to slice**: group by any attribute to find what the failing requests have in common.

### Level 2 — Connecting signals with trace context

The key to linking signals across services is a **trace ID** created at the edge and passed along with every call, attached to every log line, metric exemplar and span. This example propagates context with Node's `AsyncLocalStorage` and the W3C `traceparent` header across three simulated services:

```ts
import { AsyncLocalStorage } from "node:async_hooks";

// 1. Trace context propagation: every log line in every service carries the same trace ID,
//    passed between services in the W3C `traceparent` header.
type Ctx = { traceId: string; spanId: string; service: string };
const als = new AsyncLocalStorage<Ctx>();
let spanCounter = 0;
const newSpanId = () => (++spanCounter).toString(16).padStart(16, "0");

function log(level: string, msg: string, extra: Record<string, unknown> = {}) {
  const c = als.getStore()!;
  console.log(JSON.stringify({ level, service: c.service, traceId: c.traceId, spanId: c.spanId, msg, ...extra }));
}
// "Calling" another service: build the header, then the callee continues the trace from it
function traceparent() { const c = als.getStore()!; return `00-${c.traceId}-${c.spanId}-01`; }
async function handle<T>(service: string, header: string | undefined, fn: () => Promise<T>): Promise<T> {
  const traceId = header ? header.split("-")[1]! : "4bf92f3577b34da6a3ce929d0e0e4736";   // new trace at the edge
  return als.run({ traceId, spanId: newSpanId(), service }, fn);
}

async function paymentService(header: string) {
  return handle("payments", header, async () => {
    log("error", "card declined by provider", { provider: "acme-pay", code: "insufficient_funds" });
    return { ok: false };
  });
}
async function orderService(header: string) {
  return handle("orders", header, async () => {
    log("info", "creating order", { orderId: "1001" });
    const result = await paymentService(traceparent());
    log(result.ok ? "info" : "warn", "payment failed, order not placed", { orderId: "1001" });
    return result;
  });
}
await handle("gateway", undefined, async () => {
  log("info", "POST /checkout");
  await orderService(traceparent());
  log("info", "responded 402");
});

// 2. Incident timeline metrics
const t = (hhmm: string) => { const [h, m] = hhmm.split(":").map(Number); return h! * 60 + m!; };
const incident = { started: "14:02", detected: "14:09", mitigated: "14:31", resolved: "15:40" };
console.log(`time to detect ${t(incident.detected) - t(incident.started)} min, to mitigate ${t(incident.mitigated) - t(incident.started)} min, to resolve ${t(incident.resolved) - t(incident.started)} min`);
```

**Output:**

```text
{"level":"info","service":"gateway","traceId":"4bf92f3577b34da6a3ce929d0e0e4736","spanId":"0000000000000001","msg":"POST /checkout"}
{"level":"info","service":"orders","traceId":"4bf92f3577b34da6a3ce929d0e0e4736","spanId":"0000000000000002","msg":"creating order","orderId":"1001"}
{"level":"error","service":"payments","traceId":"4bf92f3577b34da6a3ce929d0e0e4736","spanId":"0000000000000003","msg":"card declined by provider","provider":"acme-pay","code":"insufficient_funds"}
{"level":"warn","service":"orders","traceId":"4bf92f3577b34da6a3ce929d0e0e4736","spanId":"0000000000000002","msg":"payment failed, order not placed","orderId":"1001"}
{"level":"info","service":"gateway","traceId":"4bf92f3577b34da6a3ce929d0e0e4736","spanId":"0000000000000001","msg":"responded 402"}
time to detect 7 min, to mitigate 29 min, to resolve 98 min
```

The last line is the incident timing example discussed later.

- All five log lines, from three services, share one **trace ID**: searching for it shows the whole story of one checkout — the payment provider declined the card, the order was not placed, the client received 402.
- Each service has its own **span ID**; the `traceparent` header (`00-<trace-id>-<parent-span-id>-01`) tells the next service which span called it, so tracing tools can draw the call tree with timings.
- `AsyncLocalStorage` keeps the context across `await`s without passing it through every function — the mechanism OpenTelemetry's Node.js SDK uses.
- In practice, use **OpenTelemetry**: auto-instrumentation for HTTP, databases and messaging creates spans and propagates context; exporters send telemetry to Jaeger, Tempo, X-Ray, Honeycomb, Datadog or others. Put the trace ID in every structured log line ({{ch:logging}}).
- For asynchronous messaging, carry the trace context in message attributes so traces continue through queues ({{ch:message-brokers}}).

### Level 3 — Useful telemetry

- **Structured, wide events**: one log line per request with many fields (route, status, duration, user tier, version, flags, error type) is more useful than many small lines.
- **Metrics for alerting and trends** (cheap, aggregated); **traces and wide events for investigation** (rich, sampled).
- **Sampling**: keep all traces for errors and slow requests (tail-based sampling), and a fraction of normal ones.
- **Deployment and change markers** on dashboards: most incidents follow a change.
- **No secrets or unnecessary personal data** in telemetry.

## On-call and incidents

### Level 3 — Sustainable on-call

- **Alerts that matter**: page only for user-facing symptoms and imminent risks (SLO burn, error rates, a disk about to fill); everything else becomes a ticket or a dashboard ({{ch:monitoring}}).
- **Runbooks** for every paging alert: what it means, how to check impact, first steps, how to escalate.
- **Rotations** that are fair and humane: a primary and a secondary, handovers with notes, compensation or time off after busy nights, and limits on how many pages a shift should receive.
- **Access ready in advance**: on-call engineers can reach dashboards, logs and deployment tools without waiting for permissions.
- **Review the pager load** regularly; every unnecessary page is a bug to fix.

### Level 3 — Running an incident

```text
 detect ──► declare (severity) ──► assemble (IC, ops, comms) ──► mitigate ──► monitor ──► resolve ──► review
```

1. **Declare early**. If in doubt, declare an incident — it is cheap to close one that turns out minor. Assign a **severity** (for example SEV1: major outage or data loss; SEV2: significant degradation; SEV3: minor impact).
2. **Roles**:
   - **Incident commander**: coordinates, decides, keeps the timeline — does not debug.
   - **Operations lead(s)**: investigate and make changes.
   - **Communications lead**: updates stakeholders, support and the status page.
   - **Scribe** (often the IC at first): records actions and times.
3. **One channel** for the incident (a chat room and a call), with regular summaries: "current impact, what we know, what we are trying, next update in 15 minutes".
4. **Mitigate first**: restore service before finding the root cause. The most effective mitigations are often the simplest — **roll back the last deployment**, turn a feature flag off, fail over, scale up, block abusive traffic, shed load ({{ch:cicd}}).
5. **Change carefully**: one change at a time, announced in the channel, with a way back.
6. **Resolve** when impact is over and the system is stable; schedule the review.

The timing line in the example shows the measures teams track: **7 minutes to detect**, **29 to mitigate** and **98 to resolve**. Better alerts shorten detection; practised rollbacks and runbooks shorten mitigation.

### Level 3 — Communication

- **Internally**: regular, factual updates at a promised cadence; no speculation about cause in wide channels.
- **To customers**: a status page acknowledging impact early ("we are investigating errors at checkout"), updates as the situation changes, and a summary afterwards.
- **To leadership**: impact (who, how many, since when), current actions and expected next steps.

## Learning from incidents

### Level 4 — Blameless post-incident reviews

Within a few days, write a review:

- **Summary**: what happened, impact (duration, users, money, data), severity.
- **Timeline**: detection, key decisions and actions, mitigation and resolution, with times.
- **Contributing factors**: not "Ali deployed a bug" but "the change passed review and tests because integration tests did not cover the discount path; the canary did not include the affected customer segment; the alert fired after seven minutes because the threshold was high". Complex failures usually have several contributing causes; "human error" is a starting point for questions, not a conclusion.
- **What went well** and what was lucky.
- **Action items**: specific, owned, prioritised and tracked — better tests, alerts, safer deployment steps, runbooks, design changes.

**Blameless** does not mean no accountability: it means people can describe their actions honestly without fear, which is the only way to learn what really happened. Share reviews widely; patterns across many incidents show where to invest.

### Level 4 — Building reliability proactively

- **SLOs and error budgets** guide when to prioritise reliability work ({{ch:monitoring}}).
- **Game days**: practise incidents — fail over the database, revoke a credential, take down a zone — in staging or carefully in production, with the team watching dashboards and runbooks.
- **Chaos engineering**: deliberately inject failures (latency, errors, instance termination) with a hypothesis and a blast-radius limit, to find weaknesses before real incidents do ({{ch:distributed-systems}}).
- **Near misses**: review the incidents that almost happened, too.
- **Operational readiness reviews** before launching new services: alerts, dashboards, runbooks, on-call, capacity and rollback tested.

## From beginner to enterprise

**Level 1–2 — foundations.** Structured logs with request IDs; metrics and dashboards; knowing how to find logs for a failing request; joining an incident and following the commander.

**Level 3 — observability and response.** OpenTelemetry tracing with context propagation; wide events; sustainable on-call with runbooks; incident roles, severities and communication; mitigation first.

**Level 4 — learning organisations.** Blameless reviews with tracked actions; SLO-driven priorities; game days and chaos experiments; operational readiness reviews.

**Level 5 — senior practice.** Leading major incidents as commander; designing observability into new systems; reducing pager load; spotting patterns across incidents.

**Level 6 — enterprises.** Incident management programmes, reliability engineering teams, organisation-wide telemetry standards and cross-team incident coordination.

## Real-world use cases

### The quiet bad deploy

- **What happened**: a release made 3% of checkouts fail for customers using one payment method. Error-rate alerts did not fire (the overall rate stayed low).
- **Detection**: a dashboard slice by payment method, linked to traces showing a new validation error, found it after a support ticket.
- **Learning**: alerts per payment method on checkout success, canary analysis including business metrics, and a test for that payment path.

### The well-run outage

- **What happened**: a database failover left the application connected to the old primary. The IC declared SEV1 within five minutes, the ops lead restarted the connection pools, communications posted status updates every 15 minutes, and service returned in 22 minutes. The review led to DNS TTL fixes in the database client and a runbook step for pool resets ({{ch:rds}}).

## Common mistakes

### Beginner: logs without context

**Consequence:** impossible to connect events. **Fix:** structured logs with trace and request IDs.

### Beginner: debugging before mitigating

**Consequence:** longer outages. **Fix:** roll back or turn off first, investigate after.

### Intermediate: no incident commander

**Consequence:** everyone debugging, nobody coordinating or communicating. **Fix:** clear roles from the start.

### Intermediate: too many alerts

**Consequence:** alert fatigue and missed incidents. **Fix:** symptom-based paging and regular alert reviews.

### Intermediate: blame in reviews

**Consequence:** people hide information; the same failures repeat. **Fix:** blameless reviews focused on systems.

### Production: action items that never get done

**Fix:** owned, prioritised, tracked actions with follow-up.

### Production: never practising failure

**Fix:** game days, chaos experiments and tested runbooks.

## Debugging and troubleshooting

During an incident, work methodically:

1. **What is the user impact?** Which SLIs moved, for whom.
2. **What changed?** Deployments, configuration, traffic, dependencies, infrastructure events.
3. **Where?** Slice by service, version, region, route, customer, host.
4. **Follow a failing request** through traces and logs.
5. **Form a hypothesis, test it, and mitigate** with the smallest safe change.

Avoid chasing loud symptoms: the service with the most errors may be the victim of a slow dependency.

## Security summary

- **Security incidents** follow the same process with extra steps: preserving evidence, involving security and legal, and possibly notifying regulators and customers ({{ch:application-security}}).
- **Telemetry is sensitive**: restrict access; never log secrets; minimise personal data.
- **Incident access** should be pre-approved and audited (break-glass roles).
- **Communication** about security incidents is coordinated; avoid sharing details in wide channels.

## How a senior engineer thinks about this

- **Failure is normal; learning is optional.** Make it mandatory.
- **Mitigate first.** Restore users, then understand.
- **Context is everything.** Trace IDs, versions and attributes turn data into answers.
- **Calm structure beats heroics.** Roles, cadence and communication make incidents shorter.
- **Fix the system, not the person.** Blameless reviews with real follow-through.

## Exercises

### Exercise 1 — Add trace context

**Objective:** practise observability design.
**What to do:** a request goes from the gateway to the orders service, which publishes an event to a queue consumed by the email service. How do you make one trace cover all of it, and what should every log line contain?

<details>
<summary>Show the solution</summary>

- The gateway starts a trace (or continues one from the client) and calls orders with a `traceparent` header.
- The orders service continues the trace, creates spans for its work and **adds the trace context to the message attributes** when publishing the event.
- The email service extracts the context from the message and continues the trace (as a linked or child span).
- Use OpenTelemetry instrumentation for HTTP and messaging to do this automatically.
- Every log line: timestamp, level, service, version, environment, **trace ID and span ID**, request or message ID, and the relevant business IDs (order ID) — without secrets.

</details>

### Exercise 2 — Lead the first ten minutes

**Objective:** practise incident response.
**The scenario:** you are on call. At 14:05 an alert fires: checkout error rate 12%. A deployment of the pricing service finished at 13:58. What do you do in the first ten minutes?

<details>
<summary>Show the solution</summary>

1. **Acknowledge** the alert; look at the checkout dashboard to confirm user impact.
2. **Declare an incident** (SEV2 or SEV1 depending on impact), open the incident channel, take the IC role or hand it to someone.
3. **Check what changed**: the pricing deployment seven minutes before is the prime suspect.
4. **Mitigate**: roll back the pricing deployment (or turn off its feature flag) — announce it in the channel.
5. **Watch** the error rate recover; meanwhile ask someone to look at traces for failing checkouts to confirm the cause.
6. **Communicate**: post a status update internally and on the status page if customers are affected; set the next update time.

</details>

### Exercise 3 — Write the review

**Objective:** practise blameless reviews.
**The scenario:** the pricing rollback fixed the incident after 25 minutes. The cause was a discount rule that divided by zero for orders with only free items. Write the contributing factors and three action items.

<details>
<summary>Show the solution</summary>

**Contributing factors** (examples):
- No test covered orders consisting only of free items.
- The canary deployment ran for five minutes but used error-rate thresholds that the small canary traffic did not reach.
- The checkout error alert fired seven minutes after the impact began because it used a 5-minute window and a high threshold.
- The pricing service returned 500 for the whole checkout instead of degrading (charging without the discount, or rejecting only the affected orders).

**Action items** (owned, with dates):
1. Add property-based tests for discount calculations with edge cases (zero totals, free items) — pricing team.
2. Canary analysis on checkout success rate with statistical comparison, not fixed thresholds — platform team.
3. Make pricing failures degrade gracefully and alert on checkout success rate with a burn-rate alert — checkout team.

</details>

## Summary

**Observability** lets you answer new questions about production from telemetry: **logs, metrics and traces** carrying rich context and linked by **trace IDs** propagated across services (W3C `traceparent`, OpenTelemetry, async context in Node.js, message attributes for queues). Use metrics for alerting and trends, traces and wide structured events for investigation, sampling that keeps errors and slow requests, and change markers on dashboards.

**On-call** works when alerts are few and meaningful, runbooks exist, access is ready and rotations are humane. **Incidents** follow a clear process: detect, declare early with a **severity**, assign roles — **incident commander**, operations, communications, scribe — work in one channel with regular updates, **mitigate first** (rollback, flags, failover, load shedding), then resolve. Track time to detect, mitigate and resolve.

Afterwards, **blameless post-incident reviews** record impact, timeline, contributing factors (not blame), what went well, and owned, tracked actions. Build reliability proactively with SLOs and error budgets, game days, chaos experiments, near-miss reviews and operational readiness reviews.

## Key terms

- **Observability** — The ability to understand a system's internal state from its outputs.
- **Telemetry** — Data a system emits about itself.
- **OpenTelemetry** — An open standard and SDKs for traces, metrics and logs.
- **Trace context propagation** — Passing trace identifiers between services.
- **traceparent** — The W3C header carrying trace and parent span IDs.
- **Wide event** — A structured record with many attributes describing one unit of work.
- **Tail-based sampling** — Deciding which traces to keep after seeing how they ended.
- **On-call** — Being responsible for responding to production alerts.
- **Runbook** — Step-by-step instructions for handling a specific alert or task.
- **Incident** — An unplanned disruption that needs an urgent response.
- **Severity level** — A classification of incident impact.
- **Incident commander** — The person coordinating an incident response.
- **Mitigation** — Action that stops user impact without necessarily fixing the root cause.
- **MTTD / MTTR** — Mean time to detect / to resolve.
- **Status page** — A public page reporting service health and incidents.
- **Post-incident review** — A written analysis of an incident with improvement actions.
- **Blameless culture** — Learning from failures without punishing individuals for honest mistakes.
- **Game day** — A planned exercise that simulates failures.
- **Chaos engineering** — Experimenting by injecting failures to find weaknesses.

## What comes next

Incidents often trace back to structure: how a system is divided, coupled and allowed to evolve. The next chapter, {{ch:software-architecture}}, covers software architecture: architectural styles, boundaries and dependencies, quality attributes, architecture decision records, and how architecture evolves with a product and a team.
