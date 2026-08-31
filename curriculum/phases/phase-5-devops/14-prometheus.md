# Phase 5 — Chapter 14: Prometheus

---

## Chapter Overview

Prometheus is the industry-standard open-source monitoring and alerting system. It scrapes metrics from instrumented applications, stores them as time-series data, and enables querying with PromQL. Combined with Grafana, it's the most common monitoring stack for Kubernetes and containerized applications.

**Topics:**
- Prometheus architecture and pull model
- Metric types: Counter, Gauge, Histogram, Summary
- PromQL queries
- Labels and cardinality
- Alerting with Alertmanager
- Service discovery
- Node Exporter and common exporters

---

## Beginner Theory

### Architecture

```
┌──────────────────────────────────────────────────────────┐
│                     Prometheus Server                     │
│                                                           │
│  Retrieval         TSDB Storage        HTTP API / UI      │
│  (scrape jobs) ──► (time series DB) ──► /metrics query    │
│                                                           │
│  Scrape targets:                                          │
│    http://app:3000/metrics     every 15s                  │
│    http://node-exporter:9100/metrics                      │
│    http://postgres-exporter:9187/metrics                  │
└──────────────────────────────────────────────────────────┘
           │                              │
           ▼                              ▼
    Alertmanager                       Grafana
  (route alerts to               (visualization)
   PagerDuty/Slack)

Pull model (vs push):
  Prometheus PULLS metrics from targets (HTTP GET /metrics)
  Benefits: central config (what to scrape), easy to discover if target is down,
  no need for target to know where Prometheus is
  Alternative: Pushgateway for short-lived jobs that can't be scraped
```

---

## Basic Examples

### Prometheus Config

```yaml
# prometheus.yml
global:
  scrape_interval:     15s   # how often to scrape targets
  evaluation_interval: 15s   # how often to evaluate alert rules

alerting:
  alertmanagers:
    - static_configs:
        - targets: ["alertmanager:9093"]

rule_files:
  - "rules/*.yml"   # alert rule files

scrape_configs:
  # Prometheus itself
  - job_name: "prometheus"
    static_configs:
      - targets: ["localhost:9090"]

  # Application metrics
  - job_name: "myapp"
    metrics_path: "/metrics"
    static_configs:
      - targets: ["app:3000", "app2:3000"]
    relabel_configs:
      - source_labels: [__address__]
        target_label: instance

  # Node Exporter (system metrics: CPU, memory, disk, network)
  - job_name: "node"
    static_configs:
      - targets: ["node-exporter:9100"]

  # PostgreSQL exporter
  - job_name: "postgres"
    static_configs:
      - targets: ["postgres-exporter:9187"]

  # Docker: service discovery from Docker API
  - job_name: "docker"
    docker_sd_configs:
      - host: "unix:///var/run/docker.sock"
        refresh_interval: 30s
    relabel_configs:
      # Only scrape containers with label prometheus.io/scrape=true
      - source_labels: [__meta_docker_container_label_prometheus_io_scrape]
        action: keep
        regex: "true"
      - source_labels: [__meta_docker_container_label_prometheus_io_port]
        target_label: __address__
        regex: (.+)
        replacement: ${1}
```

### PromQL Queries

```promql
# ─── Counter queries ─────────────────────────────────────
# Total HTTP requests
http_requests_total

# Request rate per second (over 5-minute window)
rate(http_requests_total[5m])

# Request rate by endpoint
rate(http_requests_total[5m]) by (route, method)

# Error rate (4xx + 5xx)
rate(http_requests_total{status=~"[45].."}[5m])

# Error rate as percentage
rate(http_requests_total{status=~"[45].."}[5m])
  /
rate(http_requests_total[5m])
* 100

# ─── Histogram queries ───────────────────────────────────
# p95 latency (response time 95th percentile)
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# p50, p95, p99 latency by route
histogram_quantile(0.95, 
  sum by (route, le) (rate(http_request_duration_seconds_bucket[5m]))
)

# Average latency
rate(http_request_duration_seconds_sum[5m])
  /
rate(http_request_duration_seconds_count[5m])

# ─── Gauge queries ───────────────────────────────────────
# Current memory usage (from node_exporter)
node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes

# Memory usage percentage
(node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes)
  / node_memory_MemTotal_bytes * 100

# Disk usage
(node_filesystem_size_bytes{mountpoint="/"} - node_filesystem_avail_bytes{mountpoint="/"})
  / node_filesystem_size_bytes{mountpoint="/"} * 100

# CPU usage (per core, over 5 min)
100 - avg by (instance) (irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100

# ─── Aggregation ─────────────────────────────────────────
# Sum across all instances
sum(rate(http_requests_total[5m]))

# Average latency across all routes
avg(rate(http_request_duration_seconds_sum[5m]) / rate(http_request_duration_seconds_count[5m]))

# Top 5 slowest routes
topk(5, rate(http_request_duration_seconds_sum[5m]) / rate(http_request_duration_seconds_count[5m]))
```

---

## Intermediate Concepts

### Alert Rules

```yaml
# rules/myapp.yml
groups:
  - name: myapp
    interval: 60s   # evaluate every 60s (overrides global)
    rules:
      # High error rate
      - alert: HighErrorRate
        expr: |
          rate(http_requests_total{status=~"[45].."}[5m])
            / rate(http_requests_total[5m]) * 100 > 5
        for: 2m      # must be true for 2 min before firing (reduces flapping)
        labels:
          severity: critical
          team:     backend
        annotations:
          summary:     "High error rate on {{ $labels.instance }}"
          description: "Error rate is {{ $value | printf \"%.1f\" }}% (threshold: 5%)"
          runbook:     "https://wiki.myapp.com/runbooks/high-error-rate"

      # Slow responses
      - alert: SlowP95Latency
        expr: |
          histogram_quantile(0.95,
            sum by (le, route) (rate(http_request_duration_seconds_bucket[5m]))
          ) > 1.0
        for: 5m
        labels:
          severity: warning
          team:     backend
        annotations:
          summary:     "Slow p95 latency on {{ $labels.route }}"
          description: "p95 latency is {{ $value | printf \"%.2f\" }}s (threshold: 1s)"

      # Service down
      - alert: ServiceDown
        expr: up{job="myapp"} == 0
        for: 1m
        labels:
          severity: critical
          team:     backend
        annotations:
          summary: "Instance {{ $labels.instance }} is down"

      # High memory usage
      - alert: HighMemoryUsage
        expr: |
          (node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes)
            / node_memory_MemTotal_bytes * 100 > 90
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage on {{ $labels.instance }}: {{ $value | printf \"%.0f\" }}%"

      # Disk space
      - alert: LowDiskSpace
        expr: |
          (node_filesystem_size_bytes{mountpoint="/"} - node_filesystem_avail_bytes{mountpoint="/"})
            / node_filesystem_size_bytes{mountpoint="/"} * 100 > 85
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Disk usage at {{ $value | printf \"%.0f\" }}% on {{ $labels.instance }}"

  - name: slo
    rules:
      # SLO: 99.9% availability — burn rate > 5x
      - alert: SLOErrorBudgetBurnRate
        expr: |
          (
            rate(http_requests_total{status=~"[45].."}[1h])
              / rate(http_requests_total[1h])
          ) > (0.001 * 5)   # burning 5x faster than budget allows
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "SLO error budget burning too fast"
          description: "Error rate {{ $value | humanizePercentage }} exceeds 5x burn rate"
```

### Alertmanager Config

```yaml
# alertmanager.yml
global:
  resolve_timeout:       5m
  slack_api_url:        "https://hooks.slack.com/services/..."

route:
  group_by:        ["alertname", "instance"]
  group_wait:      30s          # wait before sending group (collect related alerts)
  group_interval:  5m           # wait before re-sending group with new alerts
  repeat_interval: 4h           # re-send if still firing
  receiver:        "slack-warnings"
  
  routes:
    - match:
        severity: critical
      receiver:   "pagerduty-critical"
    
    - match:
        team: backend
      receiver:   "slack-backend"

receivers:
  - name: "slack-warnings"
    slack_configs:
      - channel:    "#alerts"
        send_resolved: true
        title:    "{{ .GroupLabels.alertname }}: {{ .Status | toUpper }}"
        text:     "{{ range .Alerts }}{{ .Annotations.summary }}\n{{ end }}"

  - name: "pagerduty-critical"
    pagerduty_configs:
      - routing_key: "{{ .CommonLabels.pagerduty_key }}"
        description: "{{ .GroupLabels.alertname }}"

  - name: "slack-backend"
    slack_configs:
      - channel:   "#backend-alerts"
        send_resolved: true

inhibit_rules:
  # Suppress warning if critical already firing for same instance
  - source_match:  { severity: critical }
    target_match:  { severity: warning }
    equal:         ["instance"]
```

---

## Interview Preparation

**Q1: Why does Prometheus use a pull model instead of push?**
A: Pull advantages: central config — Prometheus decides what to scrape, when, and how often. No need to configure each target with the Prometheus address. Easy to detect when a target is down (failed scrape vs. target that stopped pushing). Easier to debug — you can curl the `/metrics` endpoint directly to see what Prometheus would scrape. Consistent collection timing (prevents timestamp skew). Push alternative (Pushgateway) exists for batch jobs that can't be scraped. For truly push-based scenarios (very short-lived jobs), use the Pushgateway, but for long-lived services, pull is strongly preferred.

**Q2: What is label cardinality and why is it important?**
A: Labels identify the dimensions of a metric (e.g., `{method="GET", route="/users", status="200"}`). Cardinality is the number of unique label value combinations. High cardinality explodes storage: if you add `user_id` as a label with 1M users, one metric creates 1M time series. Rules: never use high-cardinality values as labels (user IDs, request IDs, IP addresses, UUIDs). Use low-cardinality dimensions (method, route, status code, environment). If you need per-user analytics, use logs or a different storage system. Each unique label combination creates a new time series — Prometheus stores each separately.

**Q3: What is the difference between a Histogram and a Summary in Prometheus?**
A: Histogram: pre-defines fixed buckets (e.g., 0.1s, 0.5s, 1s, 5s). Counts observations that fall into each bucket. Quantiles calculated at query time with `histogram_quantile()`. Can be aggregated across instances. Recommended for latency. Summary: pre-defines quantile streams (e.g., 0.5, 0.95, 0.99). Quantiles calculated client-side. Cannot be aggregated across instances (each instance computes its own). Uses more client memory. Use Histogram in almost all cases — it's more flexible and allows PromQL aggregation. Use Summary only if you need accurate client-side quantile calculation for a single instance and don't need cross-instance aggregation.

---

## Practical Tasks

### Beginner (10 Tasks)
1. Run Prometheus and Grafana with Docker Compose.
2. Browse Prometheus UI at `:9090` and explore metrics.
3. Run a PromQL query: total HTTP request count.
4. Query request rate: `rate(metric[5m])`.
5. Query p95 latency with `histogram_quantile(0.95, ...)`.
6. Add Node Exporter and query CPU and memory metrics.
7. Create an alert rule for error rate > 5%.
8. Set up Alertmanager to route alerts to Slack.
9. Query which targets are up: `up`.
10. Add a custom counter metric to a Node.js app.

### Intermediate (10 Tasks)
1. Add a Histogram for HTTP request duration.
2. Create a business metric counter (orders created).
3. Add Gauge for active WebSocket connections.
4. Configure Prometheus service discovery via Docker labels.
5. Add PostgreSQL Exporter and query active connections.
6. Write an alert for service down (fires in 1 min).
7. Write an SLO burn rate alert.
8. Configure Alertmanager routing: critical → PagerDuty, warning → Slack.
9. Add inhibit rules to prevent duplicate alerts.
10. Build a PromQL query for top 5 slowest routes.

### Advanced (10 Tasks)
1. Implement Prometheus federation for multi-cluster.
2. Add Thanos for long-term metrics storage.
3. Implement recording rules to pre-aggregate expensive queries.
4. Build SLO dashboards with burn rate and error budget.
5. Add exemplar support for traces-metrics correlation.
6. Implement multi-tenant Prometheus with separate namespaces.
7. Add custom exporter for a third-party service.
8. Tune scrape intervals and retention for performance.
9. Set up remote_write to Grafana Cloud.
10. Build capacity planning queries (disk growth rate, memory trend).

---

## Self Assessment
1. What is the Prometheus pull model?
2. What are the four metric types?
3. What is a Counter?
4. What is a Gauge?
5. What is a Histogram?
6. What is `rate()` used for?
7. What is `histogram_quantile()` used for?
8. What is a label?
9. What is cardinality?
10. What does Alertmanager do?

---

## Cheat Sheet

```yaml
# prometheus.yml
scrape_configs:
  - job_name: "myapp"
    static_configs:
      - targets: ["app:3000"]
    metrics_path: "/metrics"
    scrape_interval: 15s
```

```promql
# Rate (requests/sec)
rate(http_requests_total[5m])

# Error rate %
rate(http_requests_total{status=~"[45].."}[5m]) / rate(http_requests_total[5m]) * 100

# p95 latency
histogram_quantile(0.95, sum by (le) (rate(http_request_duration_seconds_bucket[5m])))

# Memory %
(node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes * 100

# CPU %
100 - avg(irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100

# Service up
up{job="myapp"}
```

```typescript
// Node.js metrics
import promClient from "prom-client";
promClient.collectDefaultMetrics();
const counter   = new promClient.Counter({ name: "requests_total", help: "...", labelNames: ["method", "status"] });
const histogram = new promClient.Histogram({ name: "duration_seconds", help: "...", buckets: [0.1, 0.5, 1, 5] });
counter.inc({ method: "GET", status: "200" });
histogram.observe({ route: "/api/users" }, 0.42);
```
