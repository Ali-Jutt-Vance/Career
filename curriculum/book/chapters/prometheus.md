# Prometheus

> [!GOALS]
> - Explain how Prometheus works: a **pull-based** time-series database that **scrapes** metrics endpoints.
> - Instrument a Node.js service with **counters**, **gauges** and **histograms**, using good names and labels.
> - Write **PromQL**: `rate`, aggregation with `sum by`, error ratios and `histogram_quantile` percentiles.
> - Use **recording rules** and **alerting rules**, and route alerts with **Alertmanager**.
> - Avoid the classic mistakes: high cardinality, averaging percentiles, `rate` on gauges, missing `for` durations.

## Why this matters

{{ch:monitoring}} explained what to measure and why. **Prometheus** is the open-source system most teams use to actually collect, store, query and alert on those measurements. It began at SoundCloud, became the second project to graduate from the Cloud Native Computing Foundation after Kubernetes, and is now the standard for metrics in the cloud-native world: Kubernetes components expose Prometheus metrics, nearly every database and proxy has an exporter, and managed services (Amazon Managed Service for Prometheus, Grafana Cloud) speak its protocol and query language.

As a back-end engineer, you will add metrics to your services, read and write PromQL queries in dashboards ({{ch:grafana}}) and alerts, and debug why a graph looks wrong. All of these need a clear picture of how Prometheus's data model works — especially counters, rates and histograms, which confuse almost everyone at first.

## The simple idea

Imagine a nurse doing rounds in a hospital. Every few minutes, the nurse visits each patient, reads the numbers on the monitor beside the bed — heart rate, temperature, blood pressure — and writes them in a chart with the time. Patients do not have to phone the nurse; they just keep their monitors up to date. From the charts, doctors see trends, and an alarm rings if a number stays dangerous.

Prometheus is the nurse. Each service keeps its current numbers on a web page (`/metrics`); every 15 to 30 seconds, Prometheus visits ("**scrapes**") every service, records the numbers with a timestamp, and evaluates alert rules over the history.

> [!ANALOGY]
> Prometheus is like a nurse doing rounds: every few seconds it visits each service, reads the numbers it shows, and writes them in a chart with the time.
>
> **Where the analogy breaks:** a nurse notices a patient who has disappeared from the bed. Prometheus does record a failed scrape (the `up` metric becomes 0), but **the numbers between visits are lost** — a spike that starts and ends between two scrapes is invisible. That is why services expose **counters** that only go up, so that even if Prometheus misses a moment, the total tells it how much happened.

## The proper definition and key words

**Prometheus** is an open-source monitoring system and time-series database. It periodically **scrapes** HTTP endpoints that expose metrics in a text format, stores each series of timestamped values identified by a **metric name** and **labels**, evaluates **rules** over them, and offers the **PromQL** query language.

Key words:

- **Time series** — a sequence of timestamped values for one metric name with one set of labels.
- **Label** — a key-value pair identifying a series (`route="/orders"`, `status="500"`).
- **Scrape / target / job** — reading a `/metrics` endpoint / one endpoint / a group of similar targets.
- **Exporter** — a program that exposes metrics for a system that cannot do it itself (node exporter for Linux hosts, postgres exporter).
- **Counter** — a value that only increases (and resets to zero on restart): requests, errors, bytes.
- **Gauge** — a value that goes up and down: memory, queue length, requests in flight.
- **Histogram** — counts of observations in cumulative **buckets**, plus a sum and a count: request durations, sizes.
- **Summary** — percentiles computed inside the application (cannot be aggregated across instances).
- **PromQL** — the Prometheus query language.
- **Instant vector / range vector** — the latest value per series / values over a time window (`[5m]`).
- **Recording rule** — a query computed regularly and stored as a new series.
- **Alerting rule** — a query that fires an alert when it returns results for a set duration.
- **Alertmanager** — the component that groups, silences and routes alerts to people.

## How Prometheus works

### Level 1 — The architecture

```text
  ┌──────────────┐   ┌──────────────┐   ┌───────────────────┐
  │ shop-api x3  │   │ worker x2    │   │ postgres exporter │   targets expose /metrics
  │ /metrics     │   │ /metrics     │   │ /metrics          │
  └──────▲───────┘   └──────▲───────┘   └─────────▲─────────┘
         │ scrape every 15 s (HTTP GET)            │
  ┌──────┴──────────────────┴──────────────────────┴───────┐
  │                     Prometheus                          │
  │  service discovery → scrape → time-series database      │
  │  rules: recording + alerting (evaluated every 15–60 s)  │
  └──────┬───────────────────────────────┬──────────────────┘
         │ PromQL                        │ firing alerts
  ┌──────▼──────┐                 ┌──────▼────────┐
  │  Grafana    │                 │ Alertmanager  │ → Slack, PagerDuty, email
  └─────────────┘                 └───────────────┘
```

- **Pull model**: Prometheus fetches metrics. Targets do not need to know where Prometheus is, and a failed scrape is itself a signal (`up == 0`). Short-lived batch jobs, which may finish before a scrape, push to a **Pushgateway** or record results in another way.
- **Service discovery** finds targets automatically — Kubernetes pods, EC2 instances, DNS records, files — so new instances are scraped without editing configuration.
- A single Prometheus server stores data on local disk for days or weeks. Long-term storage and global views use remote-write systems (Thanos, Mimir, Cortex, managed services).

A minimal configuration:

```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: shop-api
    static_configs:
      - targets: ["api-1:3000", "api-2:3000", "api-3:3000"]
  - job_name: postgres
    static_configs:
      - targets: ["postgres-exporter:9187"]

rule_files:
  - rules/*.yml

alerting:
  alertmanagers:
    - static_configs:
        - targets: ["alertmanager:9093"]
```

Prometheus adds `job` and `instance` labels to every scraped series, so you can always tell which target it came from.

## Instrumenting a service

### Level 2 — Counters, gauges and histograms in Node.js

The `prom-client` library implements the metric types and the text format. This service counts requests, records durations in a histogram and tracks requests in flight; then the example scrapes its own `/metrics` page, exactly as Prometheus would:

```ts
import { createServer, get } from "node:http";
import type { AddressInfo } from "node:net";
import { Registry, Counter, Histogram, Gauge } from "prom-client";

const registry = new Registry();

const httpRequests = new Counter({
  name: "http_requests_total",
  help: "HTTP requests handled, by route, method and status code",
  labelNames: ["route", "method", "status"] as const,
  registers: [registry],
});
const httpDuration = new Histogram({
  name: "http_request_duration_seconds",
  help: "HTTP request duration in seconds",
  labelNames: ["route"] as const,
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2.5],
  registers: [registry],
});
const inFlight = new Gauge({
  name: "http_requests_in_flight",
  help: "Requests currently being handled",
  registers: [registry],
});

// A fake clock so the example's durations are always the same.
const fakeDurations: Record<string, number> = { "/products": 0.03, "/orders": 0.4 };

const server = createServer(async (req, res) => {
  if (req.url === "/metrics") {
    res.setHeader("Content-Type", registry.contentType);
    res.end(await registry.metrics());
    return;
  }
  inFlight.inc();
  const route = req.url === "/products" || req.url === "/orders" ? req.url : "unmatched";  // routes, not raw URLs
  const status = route === "unmatched" ? 404 : req.url === "/orders" && req.method === "GET" ? 500 : 200;
  res.statusCode = status;
  res.end();
  httpRequests.inc({ route, method: req.method ?? "GET", status: String(status) });
  httpDuration.observe({ route }, fakeDurations[route] ?? 0.001);
  inFlight.dec();
});
await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
const port = (server.address() as AddressInfo).port;

const fetchText = (path: string) =>
  new Promise<string>((resolve) => get({ port, path, host: "127.0.0.1" }, (res) => {
    let body = ""; res.on("data", (c) => (body += c)); res.on("end", () => resolve(body));
  }));

for (let i = 0; i < 5; i++) await fetchText("/products");
for (let i = 0; i < 2; i++) await fetchText("/orders");
await fetchText("/does-not-exist?id=123");

// What Prometheus sees when it scrapes /metrics (only the lines for two series, to keep it short)
const text = await fetchText("/metrics");
console.log(text.split("\n").filter((l) =>
  l.startsWith("# HELP http_requests_total") || l.startsWith("# TYPE http_requests_total") ||
  l.startsWith("http_requests_total") ||
  (l.includes("http_request_duration_seconds") && l.includes('route="/orders"'))
).join("\n"));
server.close();
```

**Output:**

```text
# HELP http_requests_total HTTP requests handled, by route, method and status code
# TYPE http_requests_total counter
http_requests_total{route="/products",method="GET",status="200"} 5
http_requests_total{route="/orders",method="GET",status="500"} 2
http_requests_total{route="unmatched",method="GET",status="404"} 1
http_request_duration_seconds_bucket{le="0.05",route="/orders"} 0
http_request_duration_seconds_bucket{le="0.1",route="/orders"} 0
http_request_duration_seconds_bucket{le="0.25",route="/orders"} 0
http_request_duration_seconds_bucket{le="0.5",route="/orders"} 2
http_request_duration_seconds_bucket{le="1",route="/orders"} 2
http_request_duration_seconds_bucket{le="2.5",route="/orders"} 2
http_request_duration_seconds_bucket{le="+Inf",route="/orders"} 2
http_request_duration_seconds_sum{route="/orders"} 0.8
http_request_duration_seconds_count{route="/orders"} 2
```

Reading the exposition format:

- Each line is one **series**: a metric name, labels in braces, and the current value. `# HELP` and `# TYPE` describe the metric.
- The **counter** `http_requests_total` has one series per combination of route, method and status. Its value is a running total since the process started — Prometheus computes rates from it.
- The **histogram** produces several series: `_bucket` series with an `le` ("less than or equal") label, which are **cumulative** (each bucket counts everything up to its bound, ending with `+Inf` = all requests), plus `_sum` (total seconds) and `_count`. Both `/orders` requests took 0.4 s, so they appear from the `0.5` bucket onwards.
- The unknown URL was recorded as `route="unmatched"`, **not** as `/does-not-exist?id=123`. Labels must have a small, fixed set of values. Raw URLs, user IDs or order IDs as labels create a new series for every value — **cardinality explosion** — which slows Prometheus down and can crash it. In a framework, use the route pattern (`/orders/:id`), which Express and NestJS make available ({{ch:express}}).
- The fake clock keeps this example's output fixed. A real service measures time with `const end = httpDuration.startTimer({ route }); … end();`.
- `collectDefaultMetrics({ register: registry })` adds process metrics: CPU, memory, event-loop lag, garbage collection.

### Level 2 — Naming and choosing metric types

- **Names**: `snake_case`, the unit as a suffix in base units — `_seconds`, `_bytes` — and `_total` for counters: `http_request_duration_seconds`, `orders_created_total`, `queue_messages_waiting`.
- **Counter or gauge?** If it only ever goes up (requests, errors, bytes sent, orders), it is a counter. If it goes up and down (memory, connections in use, queue depth, temperature), it is a gauge.
- **Histogram or summary?** Prefer **histograms**: they can be aggregated across instances and the percentile chosen at query time. Choose buckets around your SLO thresholds (for example 0.1, 0.25, 0.5, 1 seconds for a 250 ms objective).
- **Labels**: a few with bounded values: route, method, status class, queue name. Every extra label multiplies the number of series.

## PromQL

### Level 3 — Rates, sums and ratios

Raw counter values are rarely useful — "2,417,903 requests since the last restart". Queries turn them into rates:

```promql
# requests per second over the last 5 minutes, for each series
rate(http_requests_total[5m])

# total requests per second for the service, per route (summing away instance, method, status)
sum by (route) (rate(http_requests_total[5m]))

# error ratio: share of requests that returned 5xx, per route
  sum by (route) (rate(http_requests_total{status=~"5.."}[5m]))
/
  sum by (route) (rate(http_requests_total[5m]))

# a gauge is used directly (never with rate)
sum(http_requests_in_flight)

# which targets are down?
up == 0
```

- **`rate(counter[5m])`** gives the per-second increase averaged over the last 5 minutes, and correctly handles counter **resets** when a process restarts. Use it only on counters. The window should be at least four times the scrape interval.
- **`sum by (route)`** adds up series, keeping only the `route` label — essential because each instance and status code is a separate series.
- **Label matchers**: `=`, `!=`, `=~` (regular expression), `!~`. `status=~"5.."` matches every 5xx code.
- **Order matters**: `sum(rate(x[5m]))` — rate first, then sum. Summing raw counters first breaks reset handling.
- `increase(x[1h])` is the total increase over the window — handy for "orders in the last hour" — and has the same reset handling as `rate`.

### Level 3 — Percentiles from histograms

```promql
# p95 latency per route over 5 minutes, across all instances
histogram_quantile(
  0.95,
  sum by (route, le) (rate(http_request_duration_seconds_bucket[5m]))
)

# latency SLI: share of requests faster than 250 ms
  sum(rate(http_request_duration_seconds_bucket{le="0.25"}[5m]))
/
  sum(rate(http_request_duration_seconds_count[5m]))
```

The bucket rates are summed across instances **keeping the `le` label**, and then `histogram_quantile` estimates the percentile. This is what it does with the bucket counts:

```ts
// How Prometheus answers "p95 latency" from histogram buckets (what histogram_quantile does)
type Bucket = { le: number; count: number };       // cumulative: requests with duration <= le

function histogramQuantile(q: number, buckets: Bucket[]): number {
  const total = buckets.at(-1)!.count;              // the +Inf bucket holds every request
  const rank = q * total;
  let prevLe = 0, prevCount = 0;
  for (const b of buckets) {
    if (b.count >= rank) {
      if (!Number.isFinite(b.le)) return prevLe;     // answer lies in +Inf: report the highest finite bound
      // linear interpolation inside the bucket
      return prevLe + (b.le - prevLe) * ((rank - prevCount) / (b.count - prevCount));
    }
    prevLe = b.le; prevCount = b.count;
  }
  return NaN;
}

// requests counted in the last 5 minutes, per bucket (already the rate() over the window)
const checkout: Bucket[] = [
  { le: 0.05, count: 6100 }, { le: 0.1, count: 8800 }, { le: 0.25, count: 9500 },
  { le: 0.5, count: 9850 }, { le: 1, count: 9960 }, { le: 2.5, count: 9995 }, { le: Infinity, count: 10000 },
];
for (const q of [0.5, 0.9, 0.95, 0.99]) {
  console.log(`p${q * 100}: ${(histogramQuantile(q, checkout) * 1000).toFixed(0)} ms`);
}
console.log(`share of requests under 250 ms (a latency SLI): ${((9500 / 10000) * 100).toFixed(1)}%`);
```

**Output:**

```text
p50: 41 ms
p90: 143 ms
p95: 250 ms
p99: 727 ms
share of requests under 250 ms (a latency SLI): 95.0%
```

- The function finds the bucket containing the requested rank and **interpolates linearly** inside it. The answer is an **estimate**: p99 is "somewhere between 500 ms and 1 s", reported as 727 ms. Bucket boundaries near the values you care about give better estimates.
- The **SLI ratio** at an exact bucket boundary (250 ms) is precise, not estimated — another reason to put a bucket boundary exactly at your SLO threshold ({{ch:monitoring}}).
- Because buckets from different instances can be summed, histograms give a correct service-wide p95. **Averaging the p95 of each instance does not** — percentiles cannot be averaged.

## Rules and alerts

### Level 3 — Recording rules

Complex queries used by many dashboards and alerts are expensive to compute again and again. **Recording rules** compute them on a schedule and store the result as a new series:

```yaml
# rules/shop-api.yml
groups:
  - name: shop-api-recording
    rules:
      - record: route:http_requests:rate5m
        expr: sum by (route) (rate(http_requests_total[5m]))
      - record: route:http_errors:ratio_rate5m
        expr: |
          sum by (route) (rate(http_requests_total{status=~"5.."}[5m]))
          /
          sum by (route) (rate(http_requests_total[5m]))
```

The naming convention `level:metric:operations` says what the series contains.

### Level 4 — Alerting rules and Alertmanager

```yaml
# rules/shop-api-alerts.yml
groups:
  - name: shop-api-alerts
    rules:
      - alert: CheckoutErrorBudgetBurn
        expr: |
          (
            sum(rate(http_requests_total{route="/checkout",status=~"5.."}[1h]))
            / sum(rate(http_requests_total{route="/checkout"}[1h]))
          ) > (14.4 * 0.001)
          and
          (
            sum(rate(http_requests_total{route="/checkout",status=~"5.."}[5m]))
            / sum(rate(http_requests_total{route="/checkout"}[5m]))
          ) > (14.4 * 0.001)
        for: 2m
        labels:
          severity: page
          team: checkout
        annotations:
          summary: "Checkout is burning its 99.9% error budget fast"
          runbook_url: "https://runbooks.example.com/checkout-errors"

      - alert: TargetDown
        expr: up{job="shop-api"} == 0
        for: 5m
        labels:
          severity: ticket
        annotations:
          summary: "{{ $labels.instance }} has not been scraped for 5 minutes"
```

- The first rule is the **multi-window burn-rate alert** from {{ch:monitoring}}: the one-hour error ratio shows significant budget burn, and the five-minute ratio confirms it is still happening (so the alert clears quickly after a fix).
- **`for: 2m`** — the condition must hold for two minutes before the alert fires, filtering out brief blips. Without `for`, a single bad evaluation pages someone.
- **Labels** (`severity`, `team`) drive routing; **annotations** carry the human message and the **runbook** link.
- **Alertmanager** receives firing alerts and **routes** them by labels (pages to PagerDuty, tickets to a chat channel), **groups** related alerts into one notification, **inhibits** lesser alerts when a bigger one fires (no "high latency" pages while "datacenter down" is firing), and supports **silences** during planned maintenance.
- Test rules with `promtool check rules` and unit tests (`promtool test rules`) in CI ({{ch:cicd}}).

## Operating Prometheus

### Level 4 — Scale, retention and high availability

- **Cardinality is the main cost.** Watch the number of series (`prometheus_tsdb_head_series`) and find the biggest metrics; drop or relabel bad labels at scrape time if needed.
- **Retention**: local storage typically keeps 15–30 days. For longer history and global queries across clusters, use remote write to Thanos, Mimir or a managed service.
- **High availability**: run two identical Prometheus servers scraping the same targets; Alertmanager deduplicates their alerts.
- **Exporters**: node exporter (CPU, memory, disk, network of hosts), PostgreSQL, Redis and NGINX exporters, blackbox exporter (probing HTTP, DNS and TCP from outside — simple synthetic checks).
- **OpenTelemetry**: applications instrumented with OpenTelemetry can export metrics to Prometheus too, so one instrumentation feeds metrics, traces and logs.

## From beginner to enterprise

**Level 1–2 — first metrics.** Exposing `/metrics` with default and HTTP metrics; scraping it; understanding counters, gauges and histograms; naming and bounded labels.

**Level 3 — useful queries.** `rate`, `sum by`, error ratios, `histogram_quantile`; recording rules for common queries; dashboards built on them.

**Level 4 — alerting.** SLO burn-rate alerts with `for`, labels and runbooks; Alertmanager routing, grouping, inhibition and silences; rule tests in CI.

**Level 5 — senior practice.** Cardinality budgets; bucket design around SLOs; exporters for every dependency; reviewing instrumentation in code review.

**Level 6 — enterprises.** Federated or remote-write architectures across many clusters and regions; multi-tenant metrics platforms; organisation-wide recording rules and SLO tooling.

## Real-world use cases

### Instrumenting a new service

- **Practice**: the service template already includes `prom-client` with default metrics, an HTTP middleware recording a request counter and a duration histogram by route pattern, and business counters (`orders_created_total`). Dashboards and SLO alerts come from shared templates that use the standard names.

### The surprise bill

- **What happened**: a developer added `user_id` as a label to a request counter. Within a day, the metrics platform held 3 million new series and its cost tripled.
- **Fix**: the label was removed; a CI check now lints metric definitions; per-user details went into logs and traces.

## Common mistakes

### Beginner: raw counters on dashboards

**Consequence:** ever-rising lines that mean little. **Fix:** `rate()` or `increase()`.

### Beginner: `rate()` on a gauge

**Consequence:** meaningless numbers. **Fix:** use gauges directly, or `deriv()` for trends.

### Beginner: unbounded label values

**Consequence:** cardinality explosion. **Fix:** route patterns and fixed sets; IDs in logs.

### Intermediate: averaging percentiles

**Consequence:** wrong latency numbers. **Fix:** sum bucket rates by `le`, then `histogram_quantile`.

### Intermediate: summing before rating

**Consequence:** broken results at restarts. **Fix:** `sum(rate(x[5m]))`.

### Intermediate: alerts without `for`

**Consequence:** pages from momentary blips. **Fix:** a `for` duration and multi-window conditions.

### Production: buckets that do not fit the data

**Consequence:** all requests in one bucket and useless percentiles. **Fix:** buckets around SLO thresholds and typical latencies.

## Debugging and troubleshooting

- **No data**: check the target's status page in Prometheus (`/targets`) — is it up, what is the scrape error? Open the `/metrics` URL yourself.
- **Gaps in graphs**: failed scrapes, restarts or a range window too small for the scrape interval.
- **Strange spikes after deployments**: counter resets combined with summing before `rate`.
- **Slow queries or a struggling Prometheus**: high cardinality; find top metrics by series count; add recording rules.
- **Alert not firing**: run the expression in the query page; check `for`, label matchers and the rule's evaluation state; then Alertmanager routing and silences.

## Security summary

- **Metrics endpoints reveal internals** (routes, versions, error rates): do not expose them publicly; restrict by network or authentication.
- **Never put secrets or personal data in labels.**
- **Protect Prometheus and Alertmanager UIs and APIs**: they show your whole system and allow silencing alerts.
- **Monitor security signals**: authentication failures, 403s, rate-limit rejections ({{ch:rate-limiting}}).

## How a senior engineer thinks about this

- **Counters plus `rate` are the foundation.** They survive missed scrapes and restarts.
- **Histograms for latency, buckets at the SLO.** Percentiles you can aggregate and SLIs you can trust.
- **Cardinality is a budget.** Every label is a multiplication.
- **Standard names, shared dashboards.** Consistency across services makes incidents faster.
- **Alerts are code.** Tested, reviewed, with runbooks and owners.

## Exercises

### Exercise 1 — Choose the metric types

**Objective:** practise metric types and names.
**What to do:** name and type metrics for: orders created; current number of database connections in use; payment API call durations; bytes uploaded; messages waiting in a queue.

<details>
<summary>Show the solution</summary>

- `orders_created_total` — counter.
- `db_pool_connections_in_use` — gauge.
- `payment_api_request_duration_seconds` — histogram (labels: `operation`, `outcome`).
- `upload_bytes_total` — counter.
- `queue_messages_waiting` — gauge (label: `queue`).

</details>

### Exercise 2 — Write the queries

**Objective:** practise PromQL.
**What to do:** write PromQL for (a) total requests per second across the service; (b) the 5xx error ratio for `/checkout`; (c) p99 latency per route; (d) orders created in the last hour.

<details>
<summary>Show the solution</summary>

```promql
# (a)
sum(rate(http_requests_total[5m]))

# (b)
  sum(rate(http_requests_total{route="/checkout",status=~"5.."}[5m]))
/ sum(rate(http_requests_total{route="/checkout"}[5m]))

# (c)
histogram_quantile(0.99, sum by (route, le) (rate(http_request_duration_seconds_bucket[5m])))

# (d)
sum(increase(orders_created_total[1h]))
```

</details>

### Exercise 3 — Production scenario: the overloaded Prometheus

**Objective:** practise diagnosing Prometheus problems.
**The scenario:** dashboards have become slow, Prometheus restarts with out-of-memory errors, and the number of series has grown from 400,000 to 9 million in a month. What do you do?

<details>
<summary>Show the solution</summary>

1. **Find the cause**: query the top metrics by series count (`topk(10, count by (__name__)({__name__=~".+"}))`) and the labels with the most values on them.
2. **Fix the instrumentation**: usually a new label with unbounded values (user IDs, URLs with IDs, error messages). Replace with bounded labels; move details to logs and traces.
3. **Immediate relief**: drop or relabel the offending labels or metrics at scrape time (`metric_relabel_configs`).
4. **Prevent recurrence**: lint metric definitions in CI, set per-target series limits (`sample_limit`), alert on series growth.
5. **Speed up dashboards** with recording rules for heavy queries.

</details>

## Summary

**Prometheus** is a pull-based monitoring system and time-series database. It **scrapes** `/metrics` endpoints on **targets** found through **service discovery**, stores each **time series** identified by a metric name and **labels**, evaluates **recording** and **alerting rules**, and answers **PromQL** queries; **Alertmanager** routes, groups, inhibits and silences alerts; **exporters** expose metrics for systems that cannot.

Applications use client libraries such as `prom-client` for the metric types: **counters** (only increase; requests, errors, bytes), **gauges** (up and down; memory, queue depth) and **histograms** (cumulative buckets plus sum and count; durations). Names use base units and `_total` for counters; labels must have small, bounded sets of values — **cardinality** is the main cost and risk.

In PromQL, **`rate(counter[5m])`** turns counters into per-second rates (handling resets), **`sum by (…)`** aggregates across instances, ratios give error rates and SLIs, and **`histogram_quantile`** estimates percentiles from summed bucket rates by interpolation — never average percentiles. **Recording rules** precompute common queries; **alerting rules** with `for` durations, severity labels and runbook annotations implement burn-rate alerts. Operate Prometheus with cardinality limits, suitable retention, remote storage for long-term data, and pairs of servers for high availability.

## Key terms

- **Prometheus** — An open-source, pull-based monitoring system and time-series database.
- **Scrape** — Prometheus fetching the current metrics from a target's endpoint.
- **Target** — An endpoint Prometheus scrapes.
- **Service discovery** — Automatically finding targets from platforms such as Kubernetes or cloud APIs.
- **Exporter** — A program that exposes metrics on behalf of another system.
- **Time series** — Timestamped values for one metric name and label set.
- **Label** — A key-value pair that identifies and dimensions a series.
- **Counter** — A metric that only increases, except for resets on restart.
- **Gauge** — A metric that can increase and decrease.
- **Histogram** — A metric counting observations in cumulative buckets, with a sum and count.
- **Bucket** — A range boundary in a histogram, labelled `le`.
- **Exposition format** — The text format of a `/metrics` page.
- **PromQL** — Prometheus's query language.
- **`rate()`** — A PromQL function computing a counter's per-second increase over a window.
- **`histogram_quantile()`** — A PromQL function estimating a percentile from histogram buckets.
- **Recording rule** — A rule that stores a query's result as a new series.
- **Alerting rule** — A rule that fires an alert when its expression returns results for a duration.
- **Alertmanager** — The component that groups, routes, inhibits and silences alerts.
- **Cardinality explosion** — A rapid growth in series caused by labels with unbounded values.
- **Pushgateway** — A component that lets short-lived jobs push metrics for scraping.

## What comes next

Prometheus stores and queries the numbers; people need to **see** them. The next chapter, {{ch:grafana}}, builds dashboards on Prometheus data: panels and visualisations, variables for switching between services and environments, dashboards as code, linking metrics to logs and traces, and alerting from Grafana.
