# Phase 5 — Chapter 15: Grafana

---

## Chapter Overview

Grafana is the standard visualization layer for metrics, logs, and traces. It connects to Prometheus, Loki, Tempo, CloudWatch, Elasticsearch, and 80+ data sources, enabling rich dashboards and alerting.

**Topics:**
- Dashboard panels and visualizations
- Data sources: Prometheus, Loki, CloudWatch
- Variables for dynamic dashboards
- Alerting in Grafana
- Dashboard provisioning (as code)
- Grafana Loki for logs
- Tempo for traces

---

## Basic Examples

### Docker Compose Full Monitoring Stack

```yaml
# compose.yml — complete o11y stack
services:
  # ─── Prometheus ──────────────────────────────────────────
  prometheus:
    image: prom/prometheus:v2.53.0
    container_name: prometheus
    restart: unless-stopped
    volumes:
      - ./monitoring/prometheus:/etc/prometheus:ro
      - prometheus-data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.retention.time=30d'
      - '--web.enable-admin-api'
    ports: ["9090:9090"]
    networks: [monitoring]

  # ─── Grafana ─────────────────────────────────────────────
  grafana:
    image: grafana/grafana:11.1.0
    container_name: grafana
    restart: unless-stopped
    environment:
      GF_SECURITY_ADMIN_USER:          admin
      GF_SECURITY_ADMIN_PASSWORD:      ${GRAFANA_PASSWORD}
      GF_SECURITY_SECRET_KEY:          ${GRAFANA_SECRET}
      GF_USERS_ALLOW_SIGN_UP:          "false"
      GF_SERVER_DOMAIN:                monitoring.myapp.com
      GF_SMTP_ENABLED:                 "true"
      GF_SMTP_HOST:                    "smtp.sendgrid.net:587"
      GF_SMTP_USER:                    apikey
      GF_SMTP_PASSWORD:                ${SENDGRID_API_KEY}
      GF_SMTP_FROM_ADDRESS:            "alerts@myapp.com"
      GF_INSTALL_PLUGINS:              "grafana-clock-panel,grafana-worldmap-panel"
    volumes:
      - grafana-data:/var/lib/grafana
      - ./monitoring/grafana/provisioning:/etc/grafana/provisioning:ro
      - ./monitoring/grafana/dashboards:/var/lib/grafana/dashboards:ro
    ports: ["3001:3000"]
    networks: [monitoring]
    depends_on: [prometheus, loki]

  # ─── Loki (log aggregation) ──────────────────────────────
  loki:
    image: grafana/loki:3.1.0
    container_name: loki
    restart: unless-stopped
    volumes:
      - ./monitoring/loki:/etc/loki:ro
      - loki-data:/loki
    command: -config.file=/etc/loki/loki-config.yml
    ports: ["3100:3100"]
    networks: [monitoring]

  # ─── Promtail (log shipper: Docker → Loki) ───────────────
  promtail:
    image: grafana/promtail:3.1.0
    container_name: promtail
    restart: unless-stopped
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - /var/log:/var/log:ro
      - ./monitoring/promtail:/etc/promtail:ro
    command: -config.file=/etc/promtail/promtail-config.yml
    networks: [monitoring]

  # ─── Node Exporter ───────────────────────────────────────
  node-exporter:
    image: prom/node-exporter:v1.8.1
    container_name: node-exporter
    restart: unless-stopped
    pid: host
    volumes:
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
      - /:/rootfs:ro
    command:
      - '--path.procfs=/host/proc'
      - '--path.sysfs=/host/sys'
      - '--path.rootfs=/rootfs'
      - '--collector.filesystem.mount-points-exclude=^/(sys|proc|dev|host|etc)($$|/)'
    ports: ["9100:9100"]
    networks: [monitoring]

  # ─── Alertmanager ────────────────────────────────────────
  alertmanager:
    image: prom/alertmanager:v0.27.0
    container_name: alertmanager
    restart: unless-stopped
    volumes:
      - ./monitoring/alertmanager:/etc/alertmanager:ro
      - alertmanager-data:/data
    command: --config.file=/etc/alertmanager/alertmanager.yml
    ports: ["9093:9093"]
    networks: [monitoring]

networks:
  monitoring:

volumes:
  prometheus-data:
  grafana-data:
  loki-data:
  alertmanager-data:
```

### Grafana Dashboard as Code (JSON Provisioning)

```json
// monitoring/grafana/dashboards/myapp-overview.json
{
  "title": "MyApp Overview",
  "uid":   "myapp-overview",
  "tags":  ["myapp", "production"],
  "refresh": "30s",
  "time": { "from": "now-1h", "to": "now" },

  "templating": {
    "list": [
      {
        "name":       "instance",
        "type":       "query",
        "datasource": "Prometheus",
        "query":      "label_values(up{job=\"myapp\"}, instance)",
        "refresh":    2,
        "multi":      true,
        "includeAll": true,
        "current":    { "text": "All", "value": "$__all" }
      },
      {
        "name":       "interval",
        "type":       "interval",
        "values":     ["1m", "5m", "15m", "1h"],
        "auto":       true
      }
    ]
  },

  "panels": [
    {
      "type":  "stat",
      "title": "Request Rate",
      "gridPos": { "h": 4, "w": 6, "x": 0, "y": 0 },
      "targets": [{
        "datasource": "Prometheus",
        "expr":       "sum(rate(http_requests_total{instance=~\"$instance\"}[$interval]))",
        "legendFormat": "req/s"
      }],
      "fieldConfig": {
        "defaults": {
          "unit": "reqps",
          "thresholds": {
            "steps": [
              { "color": "green", "value": null },
              { "color": "yellow", "value": 1000 },
              { "color": "red",    "value": 5000 }
            ]
          }
        }
      }
    },
    {
      "type":  "stat",
      "title": "Error Rate",
      "gridPos": { "h": 4, "w": 6, "x": 6, "y": 0 },
      "targets": [{
        "datasource": "Prometheus",
        "expr":       "sum(rate(http_requests_total{instance=~\"$instance\",status=~\"[45]..\"}[$interval])) / sum(rate(http_requests_total{instance=~\"$instance\"}[$interval])) * 100",
        "legendFormat": "error %"
      }],
      "fieldConfig": {
        "defaults": {
          "unit": "percent",
          "thresholds": {
            "steps": [
              { "color": "green",  "value": null },
              { "color": "yellow", "value": 1 },
              { "color": "red",    "value": 5 }
            ]
          }
        }
      }
    },
    {
      "type":  "timeseries",
      "title": "Request Duration p50/p95/p99",
      "gridPos": { "h": 8, "w": 12, "x": 0, "y": 4 },
      "targets": [
        {
          "datasource": "Prometheus",
          "expr":       "histogram_quantile(0.5, sum by (le) (rate(http_request_duration_seconds_bucket{instance=~\"$instance\"}[$interval])))",
          "legendFormat": "p50"
        },
        {
          "datasource": "Prometheus",
          "expr":       "histogram_quantile(0.95, sum by (le) (rate(http_request_duration_seconds_bucket{instance=~\"$instance\"}[$interval])))",
          "legendFormat": "p95"
        },
        {
          "datasource": "Prometheus",
          "expr":       "histogram_quantile(0.99, sum by (le) (rate(http_request_duration_seconds_bucket{instance=~\"$instance\"}[$interval])))",
          "legendFormat": "p99"
        }
      ],
      "fieldConfig": { "defaults": { "unit": "s" } }
    }
  ]
}
```

### Loki Configuration and LogQL

```yaml
# monitoring/loki/loki-config.yml
auth_enabled: false

server:
  http_listen_port: 3100

common:
  storage:
    filesystem:
      chunks_directory: /loki/chunks
      rules_directory:  /loki/rules
  replication_factor: 1
  ring:
    instance_addr: 127.0.0.1
    kvstore:
      store: inmemory

schema_config:
  configs:
    - from: 2024-01-01
      store:         tsdb
      object_store:  filesystem
      schema:        v13
      index:
        prefix: index_
        period: 24h

limits_config:
  retention_period: 744h  # 31 days

analytics:
  reporting_enabled: false
```

```logql
# LogQL queries (for Grafana Loki data source)

# All logs from myapp
{service="myapp"}

# Error logs
{service="myapp"} |= "ERROR"

# JSON-parsed logs with filter
{service="myapp"} | json | level="error"

# Count errors per minute
count_over_time({service="myapp"} |= "ERROR" [1m])

# Error rate (%) per 5 minutes
sum(rate({service="myapp"} |= "ERROR" [5m])) 
  / sum(rate({service="myapp"} [5m])) * 100

# Extract and filter specific field
{service="myapp"} | json | statusCode >= 500

# Latency from logs
{service="myapp"} | json | duration > 1000 | line_format "{{.path}} took {{.duration}}ms"

# Count by route
sum by (path) (count_over_time({service="myapp"} | json [5m]))
```

---

## Promtail Config (Ship Docker Logs to Loki)

```yaml
# monitoring/promtail/promtail-config.yml
server:
  http_listen_port: 9080

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  - job_name: docker
    docker_sd_configs:
      - host: unix:///var/run/docker.sock
        refresh_interval: 5s

    relabel_configs:
      # Drop containers without the logging label
      - source_labels: [__meta_docker_container_label_logging]
        action: keep
        regex: promtail

      # Use container name as service label
      - source_labels: [__meta_docker_container_name]
        regex: /(.*)
        target_label: service

      - source_labels: [__meta_docker_container_label_com_docker_compose_service]
        target_label: compose_service

    pipeline_stages:
      # Parse JSON logs
      - json:
          expressions:
            level:     level
            message:   message
            trace_id:  traceId
            timestamp: timestamp

      # Add label from parsed JSON
      - labels:
          level:
          service:

      # Extract timestamp from log
      - timestamp:
          source: timestamp
          format: RFC3339Nano

      # Drop DEBUG logs in production (reduce storage costs)
      - drop:
          expression: ".*\"level\":\"debug\".*"
```

### Tempo for Distributed Traces

Tempo is Grafana Labs' tracing backend — it stores traces (the "how a request flowed through multiple services" data) the same cost-effective way Loki stores logs: indexed only by a small set of identifiers (trace ID), with the bulk of trace data in cheap object storage rather than an expensive full-text index.

```yaml
# monitoring/tempo/tempo-config.yml
server:
  http_listen_port: 3200

distributor:
  receivers:
    otlp:                          # accept traces via OpenTelemetry protocol
      protocols:
        grpc:
        http:

storage:
  trace:
    backend: local
    local:
      path: /tmp/tempo/traces

compactor:
  compaction:
    block_retention: 336h          # keep traces for 14 days
```

```yaml
# compose.yml addition — add Tempo to the stack from the earlier example
services:
  tempo:
    image: grafana/tempo:2.5.0
    container_name: tempo
    command: -config.file=/etc/tempo/tempo-config.yml
    volumes:
      - ./monitoring/tempo:/etc/tempo:ro
      - tempo-data:/tmp/tempo
    ports:
      - "3200:3200"   # Tempo query API
      - "4317:4317"   # OTLP gRPC receiver — your app sends traces here
    networks: [monitoring]
```

```typescript
// App side — send traces via OpenTelemetry SDK to Tempo's OTLP endpoint
import { NodeSDK } from "@opentelemetry/sdk-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-grpc";

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({ url: "http://tempo:4317" }),
  serviceName: "myapp"
});
sdk.start();
// Every incoming HTTP request and outgoing DB/HTTP call is now automatically
// captured as a span and shipped to Tempo — no manual instrumentation needed
// for common libraries (Express, pg, Redis clients, etc.)
```

The payoff of running Tempo alongside Loki and Prometheus in the same Grafana instance: click a slow request in a Loki log line, jump directly to its full distributed trace in Tempo, then jump to the exact Prometheus dashboard panel for the service that was slow — all three signals cross-linked via the same `traceId`, in one UI.

---

## Interview Preparation

**Q1: What is Grafana Loki and how is it different from Elasticsearch?**
A: Loki is a log aggregation system from Grafana Labs — designed to be cost-effective and operationally simple. Like Prometheus for logs: logs are labeled (same label model as Prometheus) and indexed only by those labels, not by log content. The log content is stored as compressed chunks. Querying with LogQL can filter by labels instantly (indexed), then grep log lines by content (not indexed — full scan of chunks in that label set). Elasticsearch indexes every word in every log line, making content search fast but storage expensive (10x more storage than Loki). Loki is best for: high-volume logs, cost-sensitive environments, teams already using Grafana/Prometheus. Elasticsearch is better for: full-text search, analytics on log content, complex aggregations.

**Q2: How do you create a useful SLO dashboard in Grafana?**
A: An SLO (Service Level Objective) dashboard should show: Current availability (e.g., "99.92% over last 30 days"). Error budget remaining (e.g., "43% of monthly error budget consumed"). Burn rate (e.g., "burning at 2.3x — will exhaust budget in 5.2 days"). These are calculated from Prometheus error rate metrics. Panel types: Stat panels for current values with color thresholds (green/yellow/red). Time series for error rate and burn rate trends. Gauge for error budget consumption. Variables for time window (daily/weekly/monthly) and service. Alerting: add Grafana alert on burn rate panel to page on-call when burn rate > 5x.

**Q3: What is the difference between Grafana dashboards and Grafana alerting?**
A: Dashboards: visualization panels for humans to view — time series graphs, stat panels, heatmaps. They show historical data and current state. Engineers view them for analysis. Alerting: automatic notifications when a metric crosses a threshold. Grafana Unified Alerting evaluates PromQL expressions on a schedule. When the condition is true for a configured duration (pending period), it fires and sends notifications via Alertmanager or built-in contact points (Slack, PagerDuty, email). Alerts are triggered automatically without a human watching the dashboard. Both use the same PromQL queries but serve different purposes: dashboards are for investigation, alerts are for automated notification.

---

## Practical Tasks

### Beginner (10 Tasks)
1. Run the full o11y stack (Prometheus + Grafana + Loki) with Docker Compose.
2. Log in to Grafana and explore the default datasources.
3. Add Prometheus as a data source.
4. Create a simple time series panel for request rate.
5. Add a Stat panel for error rate with color thresholds.
6. Import the Node Exporter dashboard (ID: 1860).
7. Add Loki as a data source.
8. Explore logs in Grafana Explore view with LogQL.
9. Create a dashboard variable for instance selection.
10. Set a 30-second dashboard refresh.

### Intermediate (10 Tasks)
1. Build a complete app overview dashboard (request rate, error rate, p95 latency).
2. Add a logs panel showing recent errors.
3. Set up Promtail to ship Docker container logs to Loki.
4. Create a business metrics dashboard (orders/min, revenue/hour).
5. Set up a Grafana alert for high error rate.
6. Configure Alertmanager contact points in Grafana.
7. Use dashboard variables with multi-select for instances.
8. Provision a dashboard as JSON (as code, not manual UI).
9. Create a heatmap panel for request latency distribution.
10. Set up Grafana alerts routing to PagerDuty on severity=critical.

### Advanced (10 Tasks)
1. Build a full SLO dashboard with error budget tracking.
2. Implement dashboard as code with Grafonnet (Jsonnet).
3. Set up Tempo for distributed traces and correlate with Loki.
4. Implement trace-to-logs correlation via traceId.
5. Create a cost dashboard (EC2 cost, bandwidth, storage).
6. Implement Grafana LDAP or OAuth authentication.
7. Set up Grafana Oncall for automated escalation policies.
8. Build a capacity planning dashboard with trend lines.
9. Implement anomaly detection alerts using ML threshold.
10. Set up Grafana in production with HA and persistent storage.

---

## Self Assessment
1. What is Grafana?
2. What is Loki?
3. What is Promtail?
4. What is LogQL?
5. What is a Grafana data source?
6. What is a Grafana variable?
7. What is dashboard provisioning?
8. What is an SLO?
9. What is the difference between a Stat panel and a Time Series panel?
10. What is Grafana Alerting?

---

## Cheat Sheet

```logql
# Loki / LogQL
{service="myapp"}                         # all logs from myapp
{service="myapp"} |= "ERROR"             # filter by string
{service="myapp"} | json | level="error" # JSON parse + filter
count_over_time({service="myapp"} |= "ERROR" [5m])   # count over time
rate({service="myapp"} |= "ERROR" [5m])              # per-second rate
```

```yaml
# Grafana provisioning datasources/prometheus.yml
apiVersion: 1
datasources:
  - name: Prometheus
    type: prometheus
    url:  http://prometheus:9090
    isDefault: true

  - name: Loki
    type: loki
    url:  http://loki:3100
    jsonData:
      derivedFields:
        - datasourceUid: tempo
          matcherRegex:  '"traceId":"(\\w+)"'
          name:          traceId
          url:           "$${__value.raw}"

# Grafana provisioning dashboards/default.yml
apiVersion: 1
providers:
  - name: default
    folder: MyApp
    type:   file
    options:
      path: /var/lib/grafana/dashboards
      foldersFromFilesStructure: true
```

```
Key panel types:
  timeseries  ← trend over time (request rate, latency)
  stat        ← single number (current error rate, uptime)
  gauge       ← percentage (error budget, disk usage)
  heatmap     ← distribution (latency histogram)
  table       ← structured data (top routes by error count)
  logs        ← Loki log lines
  traces      ← Tempo trace list
```
