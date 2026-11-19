# Phase 6 — Chapter 19: AWS Cost Optimization

---

## Chapter Overview

AWS bills every resource every second/hour. Without deliberate cost management, bills grow uncontrollably. This chapter covers the AWS cost optimization framework, key tools, and the most impactful techniques per service.

**Topics:**
- AWS Cost Explorer, Budgets, and Cost Allocation Tags
- Compute: Right-sizing, Reserved Instances, Savings Plans, Spot
- Storage: S3 tiers, EBS snapshots, lifecycle policies
- Networking: NAT Gateway, data transfer costs
- Database: RDS Reserved, Aurora Serverless
- Identifying waste: idle resources, zombie workloads
- FinOps culture

---

## Core Concepts

### The Four Pillars of Cost Optimization

```
1. Right-sizing:
   Match resource size to actual usage.
   Running m5.4xlarge at 5% CPU? → downsize to m5.large.
   Use CloudWatch metrics + AWS Compute Optimizer.

2. Pricing model:
   On-Demand:    full price, no commitment
   Reserved:     1- or 3-year commit → 40–72% discount
   Savings Plans: flexible commit ($/hr) → 40–66% discount
   Spot:          spare capacity → 70–90% discount (can be interrupted)
   Use: On-Demand for variable, Reserved/Savings for baseline, Spot for burst/batch.

3. Match supply to demand:
   Auto Scaling (EC2, ECS): don't run 10 instances at 3 AM for daytime load.
   Scheduled scaling: scale down nights, weekends.
   Lambda: pay only when invoked (zero cost at zero load).

4. Optimized storage and data transfer:
   Delete unused EBS volumes, old snapshots, empty S3 buckets.
   Use S3 lifecycle policies to move to cheaper tiers.
   Avoid unnecessary cross-AZ/cross-region data transfer.
   Use VPC endpoints to avoid NAT GW data charges for S3/DynamoDB.
```

---

## Key Tools

### Cost Explorer and Budgets

```bash
# Cost Explorer (via CLI)
aws ce get-cost-and-usage \
  --time-period Start=2025-01-01,End=2025-02-01 \
  --granularity MONTHLY \
  --metrics "BlendedCost" "UsageQuantity" \
  --group-by '[{"Type":"DIMENSION","Key":"SERVICE"}]'

# Set Budget alert
aws budgets create-budget \
  --account-id 123456789012 \
  --budget '{
    "BudgetName": "myapp-monthly",
    "BudgetLimit": {"Amount": "500", "Unit": "USD"},
    "TimeUnit": "MONTHLY",
    "BudgetType": "COST"
  }' \
  --notifications-with-subscribers '[{
    "Notification": {
      "NotificationType": "ACTUAL",
      "ComparisonOperator": "GREATER_THAN",
      "Threshold": 80,
      "ThresholdType": "PERCENTAGE"
    },
    "Subscribers": [{"SubscriptionType": "EMAIL", "Address": "ops@myapp.com"}]
  }]'

# Tag resources for cost attribution
aws ec2 create-tags \
  --resources i-1234567890 \
  --tags Key=Project,Value=myapp Key=Environment,Value=production Key=Team,Value=backend
```

### Compute Optimizer

```bash
# Get EC2 rightsizing recommendations
aws compute-optimizer get-ec2-instance-recommendations \
  --account-ids 123456789012

# Get Lambda rightsizing recommendations
aws compute-optimizer get-lambda-function-recommendations

# Output: Finding (OVER_PROVISIONED/UNDER_PROVISIONED/OPTIMIZED)
# + recommended instance types with risk and projected savings
```

---

## Service-Specific Optimizations

### EC2 Cost Optimization

```bash
# Find idle instances (CPU < 5% for 2 weeks)
aws cloudwatch get-metric-statistics \
  --namespace AWS/EC2 \
  --metric-name CPUUtilization \
  --dimensions Name=InstanceId,Value=i-1234567890 \
  --start-time $(date -u -d '14 days ago' '+%Y-%m-%dT%H:%M:%SZ') \
  --end-time $(date -u '+%Y-%m-%dT%H:%M:%SZ') \
  --period 1209600 \
  --statistics Average

# Find unattached EBS volumes (not attached to any instance)
aws ec2 describe-volumes \
  --filters Name=status,Values=available \
  --query 'Volumes[].{ID:VolumeId,Size:Size,Type:VolumeType,Cost:"$"}'

# Find old snapshots (> 90 days)
aws ec2 describe-snapshots --owner-ids self \
  --query 'Snapshots[?StartTime<`2024-10-01`].{ID:SnapshotId,Size:VolumeSize,Date:StartTime}'

# Find unattached Elastic IPs (charged even when idle)
aws ec2 describe-addresses \
  --query 'Addresses[?!InstanceId].PublicIp'

# Reserved Instance recommendations
aws ce get-reservation-purchase-recommendation \
  --service EC2 \
  --lookback-period-in-days SIXTY_DAYS
```

### S3 Cost Optimization

```hcl
# Lifecycle policy: auto-tier based on access pattern
resource "aws_s3_bucket_lifecycle_configuration" "cost_optimized" {
  bucket = aws_s3_bucket.main.id

  rule {
    id     = "intelligent-tiering-all"
    status = "Enabled"

    # Move all objects to Intelligent-Tiering (auto-moves between tiers)
    transition {
      days          = 0
      storage_class = "INTELLIGENT_TIERING"
    }

    # Expire old multipart uploads
    abort_incomplete_multipart_upload { days_after_initiation = 7 }
  }

  rule {
    id     = "expire-old-logs"
    status = "Enabled"

    filter { prefix = "logs/" }

    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = 90
      storage_class = "GLACIER"
    }

    expiration { days = 365 }
  }
}
```

### NAT Gateway Cost Reduction

```
NAT Gateway: $0.045/hr + $0.045/GB processed
  A single instance downloading 1 TB/month via NAT = $45/month just in data
  
Solutions:
1. VPC Endpoints (FREE for S3/DynamoDB, ~$0.01/hr for others):
   → AWS SDK calls to S3, DynamoDB, ECR, SSM etc. bypass NAT GW
   → Single-biggest cost reduction for apps using AWS services heavily

2. Reduce cross-AZ traffic:
   → Use NAT GW in the same AZ as your instances
   → Cross-AZ data transfer: $0.01/GB — add up fast with microservices

3. Gateway Load Balancer or shared services:
   → One NAT GW per AZ (not per subnet) — avoid duplicate NATGWs

4. Lambda in VPC: use VPC endpoints instead of NAT for AWS service calls

Potential savings: If running 3 NAT GWs 24/7 = $99/mo just for the hourly fee
```

---

## Interview Preparation

**Q1: What is the difference between Reserved Instances and Savings Plans?**
A: Reserved Instances: commit to a specific instance type, size, and region for 1 or 3 years. Standard RI: can't change (e.g., m5.large in us-east-1 only). Convertible RI: can change instance family/type. Up to 72% discount. Good for predictable, fixed workloads. Savings Plans: commit to a dollar-per-hour spend for 1 or 3 years (more flexible). Compute Savings Plan: applies to EC2, Lambda, Fargate regardless of family/size/region/OS — 66% discount. EC2 Instance Savings Plan: specific family in region — 72% discount. More flexible than RIs. Recommendation: buy Compute Savings Plans first (widest coverage), then EC2 Instance SPs for specific heavily-used families. Use AWS Cost Explorer Savings Plan recommendations to see exactly what to buy based on your usage.

**Q2: What are the most impactful quick wins for reducing an AWS bill?**
A: In priority order: 1) Delete idle resources: unattached EBS volumes, unused Elastic IPs, old snapshots, stopped EC2 instances (still paying for EBS). Check Cost Explorer for "idle" findings. 2) Right-size over-provisioned EC2 — Compute Optimizer shows OVER_PROVISIONED instances. Downsizing one m5.4xlarge to m5.large saves $500+/month. 3) Add VPC Endpoints for S3 and DynamoDB — eliminates NAT Gateway charges for these (common services). 4) Purchase Savings Plans for baseline compute. 5) Use S3 Intelligent-Tiering for buckets with unknown access patterns. 6) Turn off dev/test environments on nights and weekends (Scheduled EC2 actions or Lambda to stop/start). 7) Enable S3 lifecycle policies to expire old versions and logs.

**Q3: How do you implement FinOps (cloud financial operations) in a team?**
A: FinOps is the practice of bringing financial accountability to cloud spending. Key practices: Cost visibility: tagging all resources with team/project/environment, using Cost Explorer with cost allocation tags, generating weekly/monthly reports per team. Ownership: each team owns their cloud spend, sees their costs. Budgets and alerts: per-team budgets with SNS alerts at 80%, 100%. Cost reviews: weekly review of top cost drivers, review of unused resources. Cloud cost in roadmaps: estimate cost impact of new features before building. Rightsizing culture: engineers regularly review and right-size their workloads. Savings commitment: FinOps team buys RIs/Savings Plans for committed baseline. Culture shift: "you build it, you run it, you pay for it."

---

## Practical Tasks

### Beginner (10 Tasks)
1. Enable Cost Explorer in the AWS console.
2. Set up a monthly budget with $50 alert at 80%.
3. Enable cost allocation tags in the billing console.
4. Tag all EC2 instances with `Team` and `Project` tags.
5. Find all unattached EBS volumes with AWS CLI.
6. Delete unattached Elastic IPs.
7. View Cost Explorer breakdown by service.
8. View Cost Explorer breakdown by tagged `Team`.
9. Enable AWS Trusted Advisor and review cost recommendations.
10. Check Compute Optimizer recommendations for EC2.

### Intermediate (10 Tasks)
1. Add VPC S3 Gateway Endpoint to save NAT GW costs.
2. Set up S3 lifecycle policy: 30d → Standard-IA, 90d → Glacier.
3. Enable S3 Intelligent-Tiering on a bucket.
4. Create a Lambda to stop dev EC2 instances at 8 PM daily.
5. Analyze NAT Gateway costs in Cost Explorer.
6. Buy a Compute Savings Plan based on Cost Explorer recommendations.
7. Set up AWS Budgets action to auto-stop EC2 when budget exceeded.
8. Enable S3 Storage Lens for cross-bucket cost analysis.
9. Schedule RDS stop for dev instance (weeknights + weekends).
10. Identify and delete old EBS snapshots > 90 days.

### Advanced (10 Tasks)
1. Implement automated resource cleanup with Lambda + Cost Explorer.
2. Build a weekly cost report emailed to each team.
3. Implement cost anomaly detection with AWS Cost Anomaly Detection.
4. Build Terraform module that auto-applies cost tags to all resources.
5. Set up per-environment AWS accounts for clear cost boundaries.
6. Implement Reserved Instance expiration alerts.
7. Analyze data transfer costs and optimize cross-AZ traffic.
8. Build a Spot instance fleet for CI/CD workloads.
9. Implement Graviton (ARM) migration for 20% cost reduction.
10. Present a quarterly FinOps review with findings and actions.

---

## Cheat Sheet

```bash
# Find unused/idle resources
aws ec2 describe-volumes --filters Name=status,Values=available   # unattached EBS
aws ec2 describe-addresses --query 'Addresses[?!InstanceId]'      # unattached EIPs
aws ec2 describe-snapshots --owner-ids self --query 'Snapshots[?StartTime<`2024-01-01`]'

# Cost Explorer
aws ce get-cost-and-usage \
  --time-period Start=2025-01-01,End=2025-02-01 \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --group-by Type=DIMENSION,Key=SERVICE

aws ce get-savings-plans-purchase-recommendation \
  --savings-plans-type COMPUTE_SP \
  --term-in-years ONE_YEAR \
  --payment-option NO_UPFRONT \
  --lookback-period-in-days SIXTY_DAYS
```

```
Key cost drivers:
  EC2: instance hours × instance type price
  RDS: instance hours + storage + I/O
  NAT GW: $0.045/hr + $0.045/GB
  S3: $0.023/GB standard, $0.004/GB Glacier
  CloudFront: $0.0075/GB transfer
  ALB: $0.008/hr + $0.008/LCU
  ECS Fargate: $0.04048/vCPU/hr + $0.004445/GB/hr

Quick wins ranking:
  1. Delete idle resources (immediate, zero commitment)
  2. Right-size EC2 (immediate savings, low risk)
  3. VPC endpoints for S3/DynamoDB (immediate, free)
  4. S3 lifecycle policies (gradual, automatic)
  5. Savings Plans purchase (40-66% on committed compute)
  6. Dev env scheduling (stop nights/weekends = ~70% compute savings)
  7. Spot for batch/CI workloads (70-90% discount)
```
