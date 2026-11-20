# Grafana

> [!GOALS]
> - Explain what Grafana is and how it relates to data sources such as Prometheus, Loki and Tempo.
> - Build useful **panels**: time series, stats, tables, heatmaps — with correct units, thresholds and legends.
> - Use **variables** to make one dashboard serve every environment, service and instance.
> - Design dashboards people can read during an incident, with a clear layout and links between metrics, logs and traces.
> - Manage dashboards and alerts **as code**, and secure Grafana properly.

## Why this matters

Prometheus ({{ch:prometheus}}) stores millions of numbers and answers precise queries — but nobody can understand a system by reading query results. People need **pictures**: a line rising after a deployment, a red number where an SLO is missed, a heatmap showing latency spreading out. **Grafana** is the open-source tool most teams use to draw those pictures. It connects to Prometheus and dozens of other data sources (Loki for logs, Tempo and Jaeger for traces, CloudWatch, PostgreSQL, Elasticsearch) and puts them side by side on dashboards.

Grafana dashboards are often the first thing you open when something seems wrong, the screen on the wall in an operations room, and the evidence in an incident review ({{ch:observability-and-incidents}}). A good dashboard shortens an incident from an hour to minutes; a confusing one wastes the most stressful minutes of an engineer's week. Knowing how to build and read them well is a practical, everyday skill.

## The simple idea

Grafana is a **window** onto your data, not a store of it. Prometheus is the filing cabinet full of measurements; Grafana is the person who takes out the right sheets, draws clear charts and pins them on a board — and can draw charts from several cabinets (metrics, logs, traces, a SQL database) on the same board.

> [!ANALOGY]
> Grafana is like a display board that draws charts from several filing cabinets: it stores no measurements itself, it asks each cabinet and draws the answers side by side.
>
> **Where the analogy breaks:** a board pinned with printed charts shows the same thing to everyone, always. Grafana re-runs every query each time someone opens or refreshes the dashboard — so a dashboard with 60 heavy panels refreshing every 5 seconds on a wall screen can put real load on Prometheus, and a chart is only as correct as the query behind it.

## The proper definition and key words

**Grafana** is an open-source platform for querying, visualising and alerting on data from many **data sources**. Dashboards contain **panels**; each panel runs one or more **queries** against a data source and draws the result with a **visualisation**.

Key words:

- **Data source** — a configured connection to a backend: Prometheus, Loki, Tempo, CloudWatch, PostgreSQL.
- **Dashboard** — a page of panels, stored as JSON.
- **Panel** — one visualisation with its queries: time series, stat, gauge, table, bar chart, heatmap, logs.
- **Query / target** — the request a panel sends to its data source, such as a PromQL expression.
- **Variable (template variable)** — a dropdown value (`$env`, `$service`, `$instance`) used inside queries.
- **Unit, threshold, override** — how values are formatted, coloured and customised per series.
- **Annotation** — a marker on time-series panels for an event, such as a deployment.
- **Row** — a collapsible group of panels.
- **Explore** — Grafana's view for ad-hoc queries without building a dashboard.
- **Provisioning** — loading data sources, dashboards and alerts from files.
- **Grafana Alerting** — rules evaluated by Grafana, with contact points and notification policies.

## Building dashboards

### Level 1 — Data sources and the first panel

After connecting Prometheus as a data source, a panel is created by choosing a visualisation and writing a query:

```promql
sum by (route) (rate(http_requests_total{job="shop-api"}[$__rate_interval]))
```

- **`$__rate_interval`** is a Grafana built-in variable that picks a `rate()` window suited to the panel's time range and the scrape interval — use it instead of a fixed `[5m]`, which can give empty or misleading graphs when zoomed in or out.
- **Legend**: set the legend format to `{{route}}` so lines are labelled `/orders` rather than the full label set.
- **Unit**: choose `requests/sec`, `seconds`, `percent (0.0–1.0)` or `bytes`. A latency panel showing `0.25` without a unit makes people guess whether that is seconds or milliseconds; with the unit set, Grafana displays `250 ms`.

### Level 2 — Choosing visualisations

| Visualisation | Use it for | Example |
|---|---|---|
| **Time series** | How values change over time | Requests per second by route; p95 latency |
| **Stat** | One current number, coloured by thresholds | Availability over 30 days: 99.95% (green) |
| **Gauge / bar gauge** | A value against a known maximum | Disk 72% full; pool 18 of 20 connections |
| **Table** | Comparing many items | Top 10 slowest routes with p95, rate, errors |
| **Heatmap** | Distribution over time | Latency histogram buckets: see the spread and outliers |
| **Logs** | Log lines from Loki or similar | Errors for the selected service and time |
| **State timeline** | States over time | Circuit breaker open/closed; deploy in progress |

Rules of thumb: time series for anything that changes; stats for the few headline numbers; tables for "which one is worst"; heatmaps for latency distributions (they show what percentiles hide — two groups of slow requests, for example). Avoid pie charts and 3D-looking gauges for operational data.

### Level 2 — Thresholds, colours and annotations

- **Thresholds** colour values: green under the latency SLO, red above. Use colour **sparingly** and consistently — red should always mean "bad" — and never as the only signal (some viewers cannot distinguish red and green; add text or symbols).
- **Overrides** change the display for specific series: show errors in red, put a second unit on the right axis.
- **Annotations** mark events on all time-series panels: deployments (from CI, through Grafana's API), incidents, configuration changes. "The error rate rose at the exact moment of the 14:05 deploy" is the most common first clue in an incident ({{ch:cicd}}).

### Level 3 — Variables: one dashboard for everything

Without variables, teams copy a dashboard for each environment and service — and the copies drift. **Variables** make one dashboard serve them all:

```promql
# variable "env": custom values
staging,production

# variable "service": values queried from Prometheus
label_values(http_requests_total{env="$env"}, job)

# variable "instance": depends on the two above, with "All" enabled
label_values(http_requests_total{env="$env", job="$service"}, instance)

# a panel query using them
sum by (route) (rate(http_requests_total{env="$env", job="$service", instance=~"$instance"}[$__rate_interval]))
```

- Variables appear as dropdowns at the top; changing one re-runs every panel.
- **Chained variables**: `instance` depends on `service`, which depends on `env`.
- **Multi-value and "All"**: use the regex matcher `=~` in queries so several selected values work.
- The URL includes the variable values (`?var-env=production&var-service=shop-api`), so a link in an alert or chat message opens the dashboard on exactly the right view.

## Designing for incidents

### Level 3 — A layout that answers questions in order

Design every service dashboard to answer, from top to bottom, the questions asked during an incident:

```text
┌─────────────────────────────────────────────────────────────────────┐
│ $env ▼  $service ▼  $instance ▼            last 6 hours  ⟳ 1m       │
├───────────────┬───────────────┬───────────────┬─────────────────────┤
│ Availability  │ Latency SLI   │ Error budget  │ Requests/s now      │  1. Are users OK?
│ 99.95% ✓      │ 99.2% ✓       │ 61% left      │ 1,240               │     (SLO stats)
├───────────────┴───────────────┴───────────────┴─────────────────────┤
│ Traffic by route        │ Error ratio by route   │ p50/p95/p99       │  2. What changed, when?
│ (deploy annotations ▲)  │                        │ latency           │     (golden signals)
├─────────────────────────┴────────────────────────┴───────────────────┤
│ ▸ Saturation: CPU, memory, event-loop lag, DB pool, queue depth      │  3. Why? (collapsed rows)
│ ▸ Dependencies: database, cache, payment API latency and errors      │
│ ▸ Logs: errors for $service (Loki)                                   │
└───────────────────────────────────────────────────────────────────────┘
```

- **Top**: the SLO status — are users affected? ({{ch:monitoring}})
- **Middle**: the golden signals over time, with deployment annotations — what changed and when?
- **Bottom**, in collapsed rows: saturation, dependencies and logs — why?
- Keep each dashboard focused; link to drill-down dashboards for the database, queues or a dependency instead of adding 80 panels.
- Add a short **text panel** at the top with the service owner, runbook links and what "normal" looks like.

### Level 4 — From a metric to logs and traces

Grafana is most powerful when metrics, logs and traces are connected:

- **Data links** on a panel open another dashboard or system with the same variables and time range ("open the database dashboard for this instance").
- **Metrics to logs**: a panel's "Explore" or a logs panel shows Loki logs for the same `$service` and time window — same labels, so the views line up ({{ch:logging}}).
- **Logs to traces**: a derived field turns the `traceId` in a log line into a link to the trace in Tempo or Jaeger.
- **Exemplars**: Prometheus histograms can store example trace IDs with bucket counts; Grafana shows them as dots on a latency graph, so you can click a slow point and open that exact request's trace.

## Dashboards and alerts as code

### Level 4 — Why code

Dashboards edited by clicking drift, break silently when metrics are renamed and cannot be reviewed. Treating them as code gives the same benefits as infrastructure as code ({{ch:terraform}}): version history, reviews, consistency and recovery. Options include provisioning JSON files, the Grafana Terraform provider, Jsonnet (Grafonnet) or the Foundation SDK in TypeScript or Go. This example generates the golden-signals dashboard for any service from one function, and lints it before upload:

```ts
// Dashboards as code: generate the same golden-signals dashboard for every service from one function.
type Panel = {
  title: string;
  type: "timeseries" | "stat";
  gridPos: { x: number; y: number; w: number; h: number };
  targets: { expr: string; legendFormat?: string }[];
  fieldConfig: { defaults: { unit: string; thresholds?: { steps: { color: string; value: number | null }[] } } };
};

function goldenSignalsDashboard(service: string, sloLatencySeconds: number) {
  const sel = `job="${service}", env="$env"`;
  const panels: Panel[] = [
    {
      title: "Availability (30 days)", type: "stat", gridPos: { x: 0, y: 0, w: 6, h: 4 },
      targets: [{ expr: `1 - (sum(increase(http_requests_total{${sel}, status=~"5.."}[30d])) / sum(increase(http_requests_total{${sel}}[30d])))` }],
      fieldConfig: { defaults: { unit: "percentunit", thresholds: { steps: [{ color: "red", value: null }, { color: "green", value: 0.999 }] } } },
    },
    {
      title: "Traffic", type: "timeseries", gridPos: { x: 6, y: 0, w: 9, h: 8 },
      targets: [{ expr: `sum by (route) (rate(http_requests_total{${sel}}[$__rate_interval]))`, legendFormat: "{{route}}" }],
      fieldConfig: { defaults: { unit: "reqps" } },
    },
    {
      title: "Error ratio", type: "timeseries", gridPos: { x: 15, y: 0, w: 9, h: 8 },
      targets: [{ expr: `sum by (route) (rate(http_requests_total{${sel}, status=~"5.."}[$__rate_interval])) / sum by (route) (rate(http_requests_total{${sel}}[$__rate_interval]))`, legendFormat: "{{route}}" }],
      fieldConfig: { defaults: { unit: "percentunit" } },
    },
    {
      title: `p95 latency (SLO ${sloLatencySeconds * 1000} ms)`, type: "timeseries", gridPos: { x: 0, y: 8, w: 12, h: 8 },
      targets: [{ expr: `histogram_quantile(0.95, sum by (route, le) (rate(http_request_duration_seconds_bucket{${sel}}[$__rate_interval])))`, legendFormat: "{{route}}" }],
      fieldConfig: { defaults: { unit: "s", thresholds: { steps: [{ color: "green", value: null }, { color: "red", value: sloLatencySeconds }] } } },
    },
    {
      title: "Saturation: requests in flight", type: "timeseries", gridPos: { x: 12, y: 8, w: 12, h: 8 },
      targets: [{ expr: `sum by (instance) (http_requests_in_flight{${sel}})`, legendFormat: "{{instance}}" }],
      fieldConfig: { defaults: { unit: "short" } },
    },
  ];
  return {
    uid: `${service}-golden`,
    title: `${service} — golden signals`,
    tags: ["generated", "golden-signals"],
    time: { from: "now-6h", to: "now" },
    templating: { list: [{ name: "env", type: "custom", query: "staging,production", current: { value: "production" } }] },
    panels,
  };
}

// Simple checks that run in CI before dashboards are uploaded
function lint(d: ReturnType<typeof goldenSignalsDashboard>): string[] {
  const problems: string[] = [];
  for (const p of d.panels) {
    for (const t of p.targets) {
      if (/rate\([^)]*\[\d+[smh]\]\)/.test(t.expr) && !t.expr.includes("[30d]")) problems.push(`${p.title}: fixed rate window, use $__rate_interval`);
      if (!t.expr.includes('env="$env"')) problems.push(`${p.title}: query ignores the env variable`);
    }
    if (p.gridPos.x + p.gridPos.w > 24) problems.push(`${p.title}: wider than the 24-column grid`);
  }
  return problems;
}

for (const service of ["shop-api", "payments"]) {
  const d = goldenSignalsDashboard(service, service === "payments" ? 0.5 : 0.25);
  console.log(`${d.uid}: "${d.title}", ${d.panels.length} panels, lint problems: ${lint(d).length}`);
}
const sample = goldenSignalsDashboard("shop-api", 0.25);
console.log(sample.panels[3]!.title);
console.log(sample.panels[3]!.targets[0]!.expr);
console.log(JSON.stringify(sample).length, "bytes of dashboard JSON");

// a hand-edited panel that the lint catches
const edited = goldenSignalsDashboard("search", 0.25);
edited.panels[1]!.targets[0]!.expr = `sum(rate(http_requests_total{job="search"}[5m]))`;
console.log(lint(edited).join("\n"));
```

**Output:**

```text
shop-api-golden: "shop-api — golden signals", 5 panels, lint problems: 0
payments-golden: "payments — golden signals", 5 panels, lint problems: 0
p95 latency (SLO 250 ms)
histogram_quantile(0.95, sum by (route, le) (rate(http_request_duration_seconds_bucket{job="shop-api", env="$env"}[$__rate_interval])))
2008 bytes of dashboard JSON
Traffic: fixed rate window, use $__rate_interval
Traffic: query ignores the env variable
```

- One function produces a consistent dashboard for every service — the same layout, units and thresholds, with each service's own latency SLO — so engineers moving between services already know where to look.
- A dashboard is just **JSON**: panels with `gridPos` on a 24-column grid, `targets` with queries, and `fieldConfig` with units and thresholds. A stable `uid` keeps URLs working across updates.
- The **lint** catches problems before they reach Grafana — here a hand-edited panel with a fixed rate window and a query that ignores the environment selector, which would silently show production data while the dropdown said staging.
- In CI, the generated JSON is uploaded through Grafana's HTTP API or provisioning; hand edits in the UI are either disallowed or exported back into code.

Provisioning from files:

```yaml
# /etc/grafana/provisioning/dashboards/shop.yml
apiVersion: 1
providers:
  - name: shop-dashboards
    folder: Shop
    type: file
    allowUiUpdates: false          # the files are the source of truth
    options:
      path: /var/lib/grafana/dashboards/shop
```

### Level 4 — Grafana Alerting

Grafana can evaluate alert rules on any data source and send notifications:

- **Alert rules**: a query, a condition (for example, the burn rate above 14.4), a pending period (like Prometheus's `for`) and labels such as `severity` and `team`.
- **Contact points**: where notifications go — PagerDuty, Slack, email, webhooks.
- **Notification policies**: a routing tree matching labels to contact points, with grouping and timing; **silences** and **mute timings** for maintenance.
- Teams that already use Prometheus rules and Alertmanager often keep alerting there, versioned with the service ({{ch:prometheus}}), and use Grafana for dashboards. Either way, alerts belong in code, link to a dashboard and a runbook, and follow the symptom-based rules from {{ch:monitoring}}.

## Operating Grafana

### Level 4 — Security and performance

- **Authentication**: single sign-on (OIDC, SAML) with team-based roles; disable anonymous access and the default `admin` password on day one.
- **Authorisation**: folders with permissions per team; viewers cannot edit; few administrators. Data source permissions matter — a SQL data source with a powerful database user lets dashboard editors run any query.
- **Data source credentials**: read-only users, stored encrypted in Grafana or provisioned from a secrets manager ({{ch:secrets-manager}}).
- **Never put secrets or personal data in dashboards** — titles, text panels, or query results showing customer data to everyone with view access.
- **Performance**: fewer panels per dashboard, sensible refresh intervals (1 minute, not 5 seconds), recording rules for heavy queries, and query caching.
- **High availability**: Grafana keeps its own data (users, dashboards, alert state) in a database — use PostgreSQL or MySQL rather than the default SQLite for shared, production installations, and back it up.

## From beginner to enterprise

**Level 1–2 — first dashboards.** Connecting Prometheus; time-series and stat panels with correct units, legends and thresholds; `$__rate_interval`; annotations for deployments.

**Level 3 — useful dashboards.** Variables for environment, service and instance; a layout that answers incident questions in order; heatmaps for latency; text panels with owners and runbooks.

**Level 4 — connected and managed.** Links from metrics to logs and traces; exemplars; dashboards and alerts as code with reviews and lint; SSO, folder permissions and read-only data sources.

**Level 5 — senior practice.** Standard dashboards for every service generated from templates; SLO dashboards for product owners; removing unused dashboards; reviewing dashboards after incidents.

**Level 6 — enterprises.** Central observability platforms with Grafana fronting many data sources and tenants; organisation-wide dashboard libraries; governance of access, cost and retention.

## Real-world use cases

### The deploy that slowed checkout

- **How it was found**: the on-call engineer opened the checkout dashboard from the alert link; the p99 panel jumped at a deployment annotation; the heatmap showed a new band of 2-second requests; an exemplar on that band opened a trace showing a new, unindexed database query ({{ch:query-optimization}}).

### One dashboard library for forty services

- **Practice**: a TypeScript generator produces the golden-signals dashboard, a dependency dashboard and an SLO dashboard for each service from a small configuration file. New services get them automatically; a change to the template reaches all forty services in one reviewed pull request.

## Common mistakes

### Beginner: no units, or wrong units

**Consequence:** misread numbers ("is that 0.25 seconds or 0.25%?"). **Fix:** set units on every panel.

### Beginner: fixed `rate()` windows

**Consequence:** empty or misleading graphs at some zoom levels. **Fix:** `$__rate_interval`.

### Beginner: copied dashboards per environment

**Consequence:** drift and confusion. **Fix:** variables.

### Intermediate: dashboards with dozens of panels

**Consequence:** slow loading and no clear story. **Fix:** a focused overview with links to drill-downs.

### Intermediate: averages and pie charts for operational data

**Fix:** percentiles, heatmaps and time series.

### Production: hand-edited dashboards only

**Consequence:** silent breakage, no history, lost work. **Fix:** dashboards as code with reviews.

### Production: weak access control

**Consequence:** data leaks and accidental changes. **Fix:** SSO, folder permissions, read-only data sources, no anonymous access.

## Debugging and troubleshooting

- **"No data"**: run the query in Explore; check the data source, the time range, label values and the variable values selected; check whether the metric exists at all in Prometheus.
- **Numbers differ between panels**: different rate windows, `sum` versus `avg`, or one panel filtering by a variable and another not.
- **Graph looks jagged or flat**: a rate window too small or too large for the scrape interval; use `$__rate_interval`.
- **Dashboard slow**: open the query inspector to find slow queries; reduce panels, add recording rules, lengthen the refresh interval.
- **Alert not notifying**: check the rule's state and pending period, then the notification policy matching and the contact point's test notification.

## Security summary

- **SSO and role-based access**; no anonymous access; change default credentials immediately.
- **Folder and data source permissions** per team; read-only database users for SQL data sources.
- **Encrypt and provision credentials** from a secrets manager; never in dashboard JSON.
- **No secrets or personal data** in panels, titles or text.
- **Keep Grafana updated** and behind TLS and authentication; never expose it openly to the internet ({{ch:nginx-reverse-proxy}}).

## How a senior engineer thinks about this

- **A dashboard answers questions.** Users first, then what changed, then why.
- **Consistency beats creativity.** The same layout for every service saves minutes in every incident.
- **Connect the signals.** Metrics lead to logs, logs lead to traces.
- **Dashboards are code.** Generated, reviewed and linted — and deleted when unused.
- **Every panel costs something.** Query load, attention and maintenance.

## Exercises

### Exercise 1 — Choose the visualisation

**Objective:** practise choosing panels.
**What to do:** choose a visualisation for: (a) requests per second by route over the last 6 hours; (b) availability over 30 days; (c) the ten slowest routes right now; (d) the distribution of checkout latency over a day; (e) database pool usage out of 20 connections.

<details>
<summary>Show the solution</summary>

- (a) Time series, unit requests/sec, legend `{{route}}`.
- (b) Stat with thresholds (green at or above the SLO, red below), unit percent.
- (c) Table sorted by p95, with rate and error ratio columns.
- (d) Heatmap of the histogram buckets.
- (e) Bar gauge or time series with a maximum of 20 and a threshold near it.

</details>

### Exercise 2 — Make the dashboard reusable

**Objective:** practise variables.
**What to do:** a dashboard has panels with `job="shop-api", env="production"` hard-coded. Make it work for any environment and service, and for one or several instances.

<details>
<summary>Show the solution</summary>

Create variables:
- `env`: custom values `staging,production`.
- `service`: `label_values(http_requests_total{env="$env"}, job)`.
- `instance`: `label_values(http_requests_total{env="$env", job="$service"}, instance)`, multi-value with "All".

Rewrite queries, for example:

```promql
sum by (route) (rate(http_requests_total{env="$env", job="$service", instance=~"$instance"}[$__rate_interval]))
```

Share links with the variables in the URL. Better still, generate the dashboard from code so the rules are enforced.

</details>

### Exercise 3 — Production scenario: the dashboard nobody trusts

**Objective:** practise improving dashboards.
**The scenario:** the team's main dashboard has 70 panels, takes 40 seconds to load, mixes staging and production data, shows average latency, and three panels show "No data" since a metric was renamed months ago. During the last incident, the on-call engineer gave up on it and read logs instead. What do you do?

<details>
<summary>Show the solution</summary>

1. **Restructure**: a focused overview — SLO stats at the top, golden signals with deployment annotations, saturation and dependencies in collapsed rows — and move the rest into linked drill-down dashboards or delete it.
2. **Fix correctness**: add an `env` variable and use it in every query; replace average latency with p95/p99 from histograms and a heatmap; fix or remove the broken panels.
3. **Speed**: recording rules for heavy queries, fewer panels, a 1-minute refresh.
4. **Connect**: links to logs and traces, runbook links in a text panel.
5. **Prevent regression**: generate the dashboard from code with a lint (units, variables, `$__rate_interval`) in CI, so renamed metrics fail the build instead of producing "No data" silently.
6. Ask the on-call engineers to use it in the next game day or incident review and improve it from their feedback.

</details>

## Summary

**Grafana** visualises and alerts on data from many **data sources** — Prometheus for metrics, Loki for logs, Tempo or Jaeger for traces, and more — without storing the data itself. **Dashboards** contain **panels**; each panel runs queries and draws them with a visualisation: **time series** for change over time, **stat** for headline numbers, **tables** for comparisons, **heatmaps** for distributions. Correct **units**, clear **legends**, sparing **thresholds** and **annotations** for deployments make panels readable; `$__rate_interval` keeps rate queries correct at every zoom level.

**Variables** make one dashboard serve every environment, service and instance, and put the selected view in the URL. Good dashboards follow the order of incident questions: are users affected (SLO stats), what changed and when (golden signals with annotations), and why (saturation, dependencies, logs in collapsed rows). **Data links**, logs panels, trace links and **exemplars** connect metrics to logs and traces.

Dashboards and alerts belong **in code** — generated, linted, reviewed and provisioned — so they stay consistent and recoverable. Grafana Alerting uses rules, contact points and notification policies; many teams keep alerts in Prometheus and dashboards in Grafana. Secure Grafana with SSO, team folder permissions, read-only data source credentials, no anonymous access and no sensitive data in panels; keep it fast with focused dashboards, recording rules and sensible refresh rates.

## Key terms

- **Grafana** — An open-source platform for visualising and alerting on data from many sources.
- **Data source** — A configured connection from Grafana to a data backend.
- **Dashboard** — A page of panels, stored as JSON.
- **Panel** — One visualisation with its queries.
- **Visualisation** — The type of chart a panel draws, such as time series or heatmap.
- **Template variable** — A dashboard dropdown whose value is used in queries.
- **`$__rate_interval`** — A Grafana variable that chooses a suitable window for `rate()`.
- **Unit** — The format in which a panel displays values.
- **Threshold** — A value at which a panel changes colour.
- **Override** — A display setting applied to specific series or fields.
- **Annotation** — A marker for an event on time-series panels.
- **Heatmap** — A visualisation showing how a distribution changes over time.
- **Data link** — A link from a panel to another dashboard or system with context.
- **Exemplar** — An example trace ID stored with a metric sample, linking metrics to traces.
- **Explore** — Grafana's view for ad-hoc querying.
- **Provisioning** — Loading Grafana configuration, dashboards and alerts from files.
- **Contact point** — A destination for alert notifications.
- **Notification policy** — Rules that route alerts to contact points by labels.

## What comes next

This completes the DevOps part of the book: Linux, networking, containers, pipelines, infrastructure as code and monitoring. Part X moves to the cloud platform where most of it runs. The next chapter, {{ch:aws-overview}}, introduces Amazon Web Services: regions and availability zones, the shared responsibility model, accounts and organisations, the main service families, and how to explore AWS safely without surprise bills.
