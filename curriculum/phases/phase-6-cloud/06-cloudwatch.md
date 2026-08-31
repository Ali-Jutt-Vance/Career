# Phase 6 — Chapter 6: CloudWatch

---

## Chapter Overview

CloudWatch is AWS's observability service — metrics, logs, alarms, dashboards, and events in one place. Every AWS service publishes metrics to CloudWatch automatically. You add custom metrics and logs from your application.

**Topics:**
- Metrics and namespaces
- CloudWatch Logs and Log Insights
- Alarms and composite alarms
- Dashboards
- CloudWatch Agent (EC2 system metrics + app logs)
- CloudWatch Logs Insights query language
- EventBridge (formerly CloudWatch Events)
- Container Insights for ECS/EKS

---

## Basic Examples

### CloudWatch Logs in Node.js

```typescript
// Using Pino with CloudWatch transport
// Or direct SDK calls for custom events

import { CloudWatchLogsClient, PutLogEventsCommand, CreateLogGroupCommand, CreateLogStreamCommand } from "@aws-sdk/client-cloudwatch-logs";

const cwl = new CloudWatchLogsClient({ region: process.env.AWS_REGION });

const LOG_GROUP  = `/myapp/${process.env.NODE_ENV}`;
const LOG_STREAM = new Date().toISOString().split("T")[0];   // one stream per day

// Initialize log group/stream (idempotent)
async function initLogger() {
  try {
    await cwl.send(new CreateLogGroupCommand({ logGroupName: LOG_GROUP }));
  } catch (e: any) {
    if (e.name !== "ResourceAlreadyExistsException") throw e;
  }

  try {
    await cwl.send(new CreateLogStreamCommand({
      logGroupName:  LOG_GROUP,
      logStreamName: LOG_STREAM
    }));
  } catch (e: any) {
    if (e.name !== "ResourceAlreadyExistsException") throw e;
  }
}

// Put log events (batch multiple events)
async function putLogs(messages: string[]) {
  await cwl.send(new PutLogEventsCommand({
    logGroupName:  LOG_GROUP,
    logStreamName: LOG_STREAM,
    logEvents:     messages.map(m => ({
      message:   m,
      timestamp: Date.now()
    }))
  }));
}
```

### CloudWatch Agent Config

```json
// /opt/aws/amazon-cloudwatch-agent/bin/config.json
// Ship EC2 system metrics + application logs to CloudWatch
{
  "agent": {
    "metrics_collection_interval": 60,
    "logfile": "/opt/aws/amazon-cloudwatch-agent/logs/amazon-cloudwatch-agent.log"
  },

  "metrics": {
    "namespace": "MyApp/EC2",
    "metrics_collected": {
      "cpu": {
        "measurement": ["cpu_usage_idle", "cpu_usage_user", "cpu_usage_system"],
        "metrics_collection_interval": 60
      },
      "mem": {
        "measurement": ["mem_used_percent"],
        "metrics_collection_interval": 60
      },
      "disk": {
        "measurement": ["disk_used_percent"],
        "resources": ["/"],
        "metrics_collection_interval": 300
      },
      "diskio": {
        "measurement": ["diskio_reads", "diskio_writes"],
        "resources": ["nvme0n1"],
        "metrics_collection_interval": 60
      },
      "net": {
        "measurement": ["net_bytes_recv", "net_bytes_sent"],
        "resources": ["eth0"],
        "metrics_collection_interval": 60
      }
    }
  },

  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/var/log/myapp/app.log",
            "log_group_name":  "/myapp/production",
            "log_stream_name": "{instance_id}",
            "timestamp_format": "%Y-%m-%dT%H:%M:%S",
            "timezone": "UTC"
          },
          {
            "file_path": "/var/log/nginx/access.log",
            "log_group_name":  "/nginx/access",
            "log_stream_name": "{instance_id}"
          },
          {
            "file_path": "/var/log/nginx/error.log",
            "log_group_name":  "/nginx/error",
            "log_stream_name": "{instance_id}"
          }
        ]
      }
    }
  }
}
```

### CloudWatch Alarms with Terraform

```hcl
# SNS topic for alarm notifications
resource "aws_sns_topic" "alerts" {
  name = "myapp-alerts"
}

resource "aws_sns_topic_subscription" "email" {
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = "ops@myapp.com"
}

# EC2 CPU alarm
resource "aws_cloudwatch_metric_alarm" "ec2_cpu" {
  alarm_name          = "myapp-ec2-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = 300    # 5 minutes
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "EC2 CPU > 80% for 10 min"

  dimensions = {
    InstanceId = aws_instance.app.id
  }

  alarm_actions             = [aws_sns_topic.alerts.arn]
  ok_actions                = [aws_sns_topic.alerts.arn]
  insufficient_data_actions = [aws_sns_topic.alerts.arn]
}

# RDS CPU alarm
resource "aws_cloudwatch_metric_alarm" "rds_cpu" {
  alarm_name          = "myapp-rds-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "RDS CPU > 80% for 15 min"

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.main.identifier
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
}

# Custom metric alarm (from application)
resource "aws_cloudwatch_metric_alarm" "error_rate" {
  alarm_name          = "myapp-high-error-rate"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "ErrorRate"
  namespace           = "MyApp"
  period              = 300
  statistic           = "Average"
  threshold           = 5  # 5% errors
  alarm_description   = "Application error rate > 5%"

  alarm_actions = [aws_sns_topic.alerts.arn]
}

# Composite alarm: page only if BOTH CPU high AND error rate high
resource "aws_cloudwatch_composite_alarm" "critical" {
  alarm_name = "myapp-critical-composite"
  alarm_rule = "ALARM(${aws_cloudwatch_metric_alarm.ec2_cpu.alarm_name}) AND ALARM(${aws_cloudwatch_metric_alarm.error_rate.alarm_name})"

  alarm_actions = [aws_sns_topic.alerts.arn]
}

# CloudWatch Dashboard
resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = "MyApp-Production"

  dashboard_body = jsonencode({
    widgets = [
      {
        type = "metric"
        properties = {
          title = "EC2 CPU Utilization"
          metrics = [["AWS/EC2", "CPUUtilization", "InstanceId", aws_instance.app.id]]
          period = 300
          stat   = "Average"
          view   = "timeSeries"
        }
      },
      {
        type = "metric"
        properties = {
          title = "RDS Connections"
          metrics = [["AWS/RDS", "DatabaseConnections", "DBInstanceIdentifier", aws_db_instance.main.identifier]]
          period = 60
          stat   = "Average"
        }
      },
      {
        type = "log"
        properties = {
          title = "Recent Errors"
          query = "SOURCE '/myapp/production' | filter level = 'error' | limit 20"
          view  = "table"
        }
      }
    ]
  })
}
```

---

## Intermediate Concepts

### CloudWatch Logs Insights Queries

```sql
-- CloudWatch Logs Insights query syntax (runs across multiple log groups)

-- Count errors per minute
filter level = "error"
| stats count() as errors by bin(1m)
| sort bin asc

-- P95 latency from JSON logs
filter ispresent(duration)
| stats pct(duration, 95) as p95,
        avg(duration) as avg_duration,
        count() as count
  by bin(5m)
| sort bin asc

-- Top 10 slowest routes
filter ispresent(path) and ispresent(duration)
| stats avg(duration) as avg_ms, max(duration) as max_ms, count() as count
  by path
| sort avg_ms desc
| limit 10

-- Error breakdown by type
filter level = "error"
| stats count() as count by errorCode
| sort count desc

-- Specific user journey
filter userId = "user-123"
| sort @timestamp asc
| fields @timestamp, level, message, path, duration

-- Find requests taking > 5 seconds
filter duration > 5000
| fields @timestamp, path, userId, duration
| sort duration desc
| limit 50

-- Requests with 500 status
filter statusCode >= 500
| stats count() as errors, avg(duration) as avg_ms by path
| sort errors desc

-- Unique users in time window
filter ispresent(userId)
| stats count_distinct(userId) as unique_users by bin(1h)
```

### Custom Metrics from Application

```typescript
import { CloudWatchClient, PutMetricDataCommand } from "@aws-sdk/client-cloudwatch";

const cw = new CloudWatchClient({ region: process.env.AWS_REGION });

// Publish custom metric
async function publishMetric(
  metricName: string,
  value: number,
  unit: "Count" | "Milliseconds" | "Percent" | "Bytes" | "Count/Second",
  dimensions?: Record<string, string>
) {
  await cw.send(new PutMetricDataCommand({
    Namespace:  "MyApp",
    MetricData: [{
      MetricName: metricName,
      Value:      value,
      Unit:       unit,
      Timestamp:  new Date(),
      Dimensions: Object.entries(dimensions ?? {}).map(([Name, Value]) => ({ Name, Value }))
    }]
  }));
}

// Usage examples
await publishMetric("OrdersCreated",  1,    "Count",        { Environment: "production" });
await publishMetric("OrderAmount",    149,  "Count",        { PaymentMethod: "stripe" });
await publishMetric("CheckoutTime",   1250, "Milliseconds", { Route: "/checkout" });
await publishMetric("ErrorRate",      2.5,  "Percent");
await publishMetric("QueueDepth",     45,   "Count",        { Queue: "email" });

// Batch publish (max 20 metrics per call)
async function publishMetricsBatch(metrics: Array<{ name: string; value: number; unit: string }>) {
  await cw.send(new PutMetricDataCommand({
    Namespace:  "MyApp",
    MetricData: metrics.map(m => ({
      MetricName: m.name,
      Value:      m.value,
      Unit:       m.unit as any,
      Timestamp:  new Date()
    }))
  }));
}
```

### EventBridge (Event-Driven Automation)

EventBridge (originally "CloudWatch Events") is a rules engine that reacts to events — either from AWS services themselves (an EC2 instance changes state, an alarm fires) or on a fixed schedule — and routes them to a target (Lambda, SQS, SNS, Step Functions) without you writing any polling code.

```hcl
# Rule 1: react to a CloudWatch Alarm changing state
resource "aws_cloudwatch_event_rule" "alarm_state_change" {
  name = "alarm-to-remediation"

  event_pattern = jsonencode({
    source      = ["aws.cloudwatch"]
    "detail-type" = ["CloudWatch Alarm State Change"]
    detail = {
      alarmName = [aws_cloudwatch_metric_alarm.ec2_cpu.alarm_name]
      state     = { value = ["ALARM"] }
    }
  })
}

resource "aws_cloudwatch_event_target" "remediate" {
  rule = aws_cloudwatch_event_rule.alarm_state_change.name
  arn  = aws_lambda_function.auto_remediate.arn
  # e.g., the Lambda restarts the service, or scales out automatically
}

# Rule 2: run on a fixed schedule (replaces cron on a server)
resource "aws_cloudwatch_event_rule" "nightly_cleanup" {
  name                = "nightly-cleanup"
  schedule_expression = "cron(0 3 * * ? *)"   # every day at 3 AM UTC
}

resource "aws_cloudwatch_event_target" "cleanup" {
  rule = aws_cloudwatch_event_rule.nightly_cleanup.name
  arn  = aws_lambda_function.cleanup_old_data.arn
}
```

The pattern to remember: CloudWatch tells you something happened (metric crossed a threshold, an alarm fired); EventBridge is what lets you automatically DO something in response — without a human in the loop, and without a server sitting around polling for the condition.

---

## Interview Preparation

**Q1: What is the difference between CloudWatch Metrics and CloudWatch Logs?**
A: Metrics: numerical time-series data. Aggregated measurements with a minimum resolution of 1 second (high-resolution) or 60 seconds (standard). Stored for 15 months with varying resolution: 3 hours at 1s, 15 days at 1m, 63 days at 5m, 15 months at 1h. Used for alarms, dashboards, Auto Scaling triggers. Cheap to store, fast to query. Logs: raw event records. Every log line from your application, nginx, Lambda, etc. Stored indefinitely (configurable retention). Queryable with Logs Insights (SQL-like). More expensive per GB than metrics. Use metrics for: "what is happening" (aggregated). Use logs for: "what happened to this specific request." Both together give full observability.

**Q2: How do CloudWatch Alarms work?**
A: An alarm monitors a metric over a time period (e.g., average CPU over 5 minutes). States: OK (metric within threshold), ALARM (metric breached threshold), INSUFFICIENT_DATA (not enough data). Evaluation: evaluation_periods × period = total window evaluated. E.g., 2 periods × 300 seconds = 10 minutes. If threshold is breached for both evaluation periods, alarm fires. Actions: SNS notification (email, PagerDuty, Slack via Lambda), Auto Scaling policy (scale up on high CPU), EC2 action (stop/terminate/reboot instance). Composite alarms: AND/OR multiple alarms — reduce alert noise (only alert if CPU AND memory are both high). Best practice: add insufficient_data_actions to catch cases where the instance stops sending metrics entirely.

**Q3: What is CloudWatch Logs Insights and when would you use it over a grep?**
A: Logs Insights is a managed query service for CloudWatch Logs. You write SQL-like queries that run across one or more log groups and time ranges, with aggregations, sorting, and filtering. Advantages over grep: queries run across all log streams in a group (multiple EC2 instances, Lambda invocations), supports aggregations (avg, pct, count_distinct, stats), can query structured JSON fields directly (no parsing pipeline), faster and doesn't require SSH access. Use cases: "which routes have the most errors?", "what's the p95 latency by endpoint?", "show me all logs for user X in the last hour." Limitation: not real-time (ingestion lag ~1-2 min), cost per GB scanned. For real-time tailing: `aws logs tail /log-group --follow`.

---

## Practical Tasks

### Beginner (10 Tasks)
1. View EC2 CPU metric in CloudWatch console.
2. View RDS CPU and connection metrics.
3. Create a CloudWatch alarm for EC2 CPU > 80%.
4. Subscribe an email to an SNS topic.
5. Connect the alarm to the SNS topic.
6. View Lambda invocation logs in CloudWatch.
7. Create a simple CloudWatch Dashboard.
8. Set log group retention to 30 days.
9. Use `aws logs tail` to follow a log group in real time.
10. Publish a custom metric with `aws cloudwatch put-metric-data`.

### Intermediate (10 Tasks)
1. Install CloudWatch Agent on EC2 for memory and disk metrics.
2. Ship application logs from EC2 to CloudWatch using the agent.
3. Write a Logs Insights query to find the top 10 slowest endpoints.
4. Create a Terraform CloudWatch alarm for RDS connections > 100.
5. Set up a composite alarm (CPU AND Error Rate).
6. Publish custom business metrics from Node.js.
7. Create a CloudWatch Dashboard with custom + AWS metrics.
8. Set up a Logs Insights scheduled query (saved query).
9. Create a CloudWatch alarm based on a Logs Insights metric filter.
10. Set up cross-account CloudWatch using observability access manager.

### Advanced (10 Tasks)
1. Set up CloudWatch Container Insights for ECS cluster.
2. Create metric filters to extract error counts from log lines.
3. Build anomaly detection alarm (ML-based threshold).
4. Set up CloudWatch Synthetics canaries for endpoint monitoring.
5. Configure CloudWatch Application Insights for automatic problem detection.
6. Build a custom CloudWatch dashboard as code with Terraform.
7. Set up CloudWatch cross-region dashboard.
8. Implement structured log pipeline: app → CW Logs → Logs Insights.
9. Use EventBridge to trigger Lambda on CloudWatch alarm state change.
10. Set up CloudWatch RUM (Real User Monitoring) for frontend.

---

## Self Assessment
1. What is a CloudWatch Metric?
2. What is a CloudWatch Alarm?
3. What are the three alarm states?
4. What is a composite alarm?
5. What is CloudWatch Logs Insights?
6. What is the CloudWatch Agent?
7. What is the difference between standard and high-resolution metrics?
8. What is CloudWatch Logs retention?
9. What is an SNS topic in the context of CloudWatch?
10. What is EventBridge?

---

## Cheat Sheet

```bash
# CloudWatch CLI
aws cloudwatch list-metrics --namespace AWS/EC2
aws cloudwatch get-metric-statistics \
  --namespace AWS/EC2 \
  --metric-name CPUUtilization \
  --dimensions Name=InstanceId,Value=i-1234567890 \
  --start-time 2025-01-15T00:00:00Z \
  --end-time   2025-01-15T01:00:00Z \
  --period 300 --statistics Average

aws cloudwatch put-metric-data \
  --namespace MyApp \
  --metric-name OrdersCreated \
  --value 1 \
  --unit Count

# CloudWatch Logs
aws logs describe-log-groups
aws logs create-log-group --log-group-name /myapp/production
aws logs put-retention-policy --log-group-name /myapp/production --retention-in-days 30
aws logs tail /myapp/production --follow  # real-time tail
aws logs filter-log-events --log-group-name /myapp/production --filter-pattern "ERROR"

# CloudWatch Agent
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a fetch-config -m ec2 \
  -s -c file:/opt/aws/amazon-cloudwatch-agent/bin/config.json
```

```
Key CloudWatch Alarm config:
  comparison_operator: GreaterThanThreshold | LessThanThreshold | etc.
  evaluation_periods:  how many periods must breach
  period:              seconds (60 | 300 | 3600)
  statistic:           Average | Sum | Maximum | Minimum | SampleCount
  threshold:           numeric threshold
  treat_missing_data:  notBreaching | breaching | ignore | missing
```
