# Phase 6 — Chapter 20: AWS Solutions Architect Associate — Exam Prep

---

## Chapter Overview

The AWS Solutions Architect Associate (SAA-C03) validates your ability to design resilient, cost-optimized, secure, and performant solutions on AWS. It is one of the most valuable cloud certifications in the industry.

**Exam Facts:**
- 65 questions, 130 minutes
- Passing score: 720/1000
- Cost: $150 USD
- Format: Multiple choice, multiple select
- Valid for 3 years

---

## Domain 1: Design Resilient Architectures (26%)

```
High Availability vs Fault Tolerance:
  HA: system remains available despite failures (Auto Scaling, Multi-AZ)
  FT: system operates without ANY degradation despite failures (harder, more expensive)

Multi-AZ for HA:
  RDS Multi-AZ:           automatic failover, standby not read-able
  Aurora:                 up to 15 read replicas, faster failover
  EC2 + ASG:              instances across 2-3 AZs
  ALB:                    spans 2+ AZs automatically
  ElastiCache Multi-AZ:   primary + replicas across AZs

Multi-Region for DR:
  Active-Passive:         one region active, other on standby (failover routing)
  Active-Active:          both regions serve traffic (latency routing)
  RTO / RPO:
    RTO: Recovery Time Objective — how long to recover
    RPO: Recovery Point Objective — how much data loss is acceptable
  Pilot Light:            minimal infrastructure in DR (scale up on disaster)
  Warm Standby:           scaled-down version always running
  Hot Standby:            full-scale copy always running

Key HA patterns:
  ELB + ASG across 2 AZs                 → EC2 HA
  RDS Multi-AZ + read replicas           → DB HA
  S3 CRR (Cross-Region Replication)      → object HA
  Route 53 failover routing + health checks → DNS-level HA
  SQS as buffer between tiers            → decoupled HA
```

---

## Domain 2: Design High-Performing Architectures (24%)

```
Compute performance:
  EC2:    right instance type (compute/memory/GPU), Spot for cost
  Lambda: memory = CPU, provisioned concurrency for consistent latency
  ECS Fargate: serverless containers, scale per task
  EKS:    Kubernetes for complex orchestration at scale

Caching:
  CloudFront:     CDN cache at edge (static assets, API responses)
  ElastiCache:    Redis or Memcached for in-memory DB query caching
  DAX:            DynamoDB Accelerator (microsecond reads for DynamoDB)
  RDS Read Replica: scale reads, offload from primary

Database selection:
  Relational (OLTP):   RDS PostgreSQL, Aurora
  Relational (OLAP):   Redshift (data warehouse)
  Key-Value / NoSQL:   DynamoDB
  Document:            DocumentDB (MongoDB-compatible)
  In-Memory:           ElastiCache (Redis/Memcached)
  Search:              OpenSearch
  Time Series:         Timestream
  Ledger:              QLDB (immutable ledger)

Storage performance:
  gp3 EBS: baseline 3,000 IOPS (independent of size)
  io2 Block Express: up to 64,000 IOPS (for databases)
  Instance Store: highest IOPS, ephemeral (dies with instance)
  EFS: shared file system, scales automatically
  S3: unlimited storage, use multipart for large files

S3 performance:
  3,500 PUT/COPY/POST/DELETE per second per prefix
  5,500 GET/HEAD per second per prefix
  Use multiple prefixes (hash keys) for high-throughput
  S3 Transfer Acceleration: faster uploads via CloudFront edge
```

---

## Domain 3: Design Secure Architectures (30%)

```
IAM best practices:
  Root account: MFA only, never use for daily tasks
  Users: individual users, enforce MFA
  Groups: permissions to groups, not individual users
  Roles: for services (EC2, Lambda), federated users, cross-account
  Least privilege: start with no permissions, add minimum needed
  Service Control Policies (SCPs): org-level guardrails

Network security:
  VPC: private by default
  Private subnets: no public IPs, NAT for outbound
  Security Groups: stateful, instance-level
  NACLs: stateless, subnet-level, explicit allow AND deny
  VPC Flow Logs: network traffic audit
  WAF: web application firewall (L7, on CloudFront/ALB)
  Shield Standard: always-on DDoS protection (free)
  Shield Advanced: enhanced DDoS protection ($3,000/mo)
  GuardDuty: threat detection (ML on CloudTrail/VPC logs/DNS)
  Macie: sensitive data discovery in S3

Data protection:
  Encryption at rest: S3 SSE-S3/SSE-KMS, EBS, RDS, Secrets Manager
  Encryption in transit: TLS, HTTPS (ACM certificates)
  KMS: key management, envelope encryption
  CloudHSM: dedicated hardware security module (FIPS 140-2 Level 3)
  Secrets Manager: automatic rotation, KMS-encrypted

Identity federation:
  SAML 2.0: enterprise SSO (Active Directory → AWS)
  OIDC/Cognito: web/mobile app authentication
  AWS SSO (Identity Center): multi-account access management

Audit and compliance:
  CloudTrail: API call logging (who did what, when, from where)
  AWS Config: resource configuration history and compliance rules
  Security Hub: centralized security findings
  Amazon Inspector: vulnerability scanning (EC2, ECR, Lambda)
```

---

## Domain 4: Design Cost-Optimized Architectures (20%)

```
Compute:
  On-Demand → Reserved Instances (40-72% off) for baseline
  Savings Plans (66% off) for flexibility
  Spot Instances (70-90% off) for fault-tolerant workloads
  Lambda: $0.20/1M requests (excellent for spiky/low-volume)
  Fargate Spot: 70% off Fargate On-Demand

Storage:
  S3 Standard → IA → Glacier (lifecycle policies)
  S3 Intelligent-Tiering: auto-optimizes access pattern
  EBS: gp3 cheapest SSD, delete unattached volumes
  EFS Infrequent Access: 92% cheaper for rarely accessed files

Database:
  RDS Reserved Instances: 40-69% discount
  Aurora Serverless v2: scale to zero when idle
  DynamoDB On-Demand: pay-per-request (unpredictable load)
  DynamoDB Provisioned + Auto Scaling: cheaper for steady load

Architecture patterns for cost:
  S3 static website + CloudFront: cheaper than EC2 for static content
  Lambda vs EC2: Lambda at low volume, EC2 at sustained high volume
  SQS + Lambda: decoupled, pay only for messages processed
  EventBridge: serverless event routing (no server to run)
```

---

## Top 50 Exam Scenarios

```
Q: Need to share files across multiple EC2 instances?
A: EFS (NFS-compatible, multi-AZ, shared)

Q: Object storage with auto-tiering for unknown access pattern?
A: S3 Intelligent-Tiering

Q: Secure access to S3 from private EC2 without NAT GW?
A: VPC Gateway Endpoint for S3

Q: Globally accelerate file uploads from users worldwide?
A: S3 Transfer Acceleration

Q: Cache RDS reads to reduce latency and DB load?
A: ElastiCache (Redis or Memcached)

Q: Cache DynamoDB reads with microsecond latency?
A: DynamoDB Accelerator (DAX)

Q: Schedule Lambda to run daily at 3 AM?
A: EventBridge (CloudWatch Events) cron

Q: Run containers without managing servers?
A: ECS Fargate or EKS Fargate

Q: Auto-scale EC2 instances based on queue depth?
A: ASG with custom CloudWatch metric (SQS ApproximateNumberOfMessages)

Q: Decouple microservices for resilience?
A: SQS (queue) or SNS (pub/sub fan-out)

Q: Process SQS messages reliably with retry + DLQ?
A: Lambda event source mapping with ReportBatchItemFailures + DLQ

Q: Serve static website globally with HTTPS?
A: S3 + CloudFront + ACM + Route 53

Q: Lowest latency DB reads across regions?
A: DynamoDB Global Tables or Aurora Global Database

Q: Migrate on-premises database to RDS with minimal downtime?
A: AWS Database Migration Service (DMS)

Q: Reduce EC2 costs for batch processing that can tolerate interruption?
A: Spot Instances

Q: Prevent users from bypassing CloudFront and accessing S3 directly?
A: Origin Access Control (OAC) + bucket policy

Q: Route 5% of traffic to new version for testing?
A: ALB weighted target groups or Route 53 weighted routing

Q: Automatically failover to secondary region on health check failure?
A: Route 53 failover routing with health checks

Q: Encrypt data with customer-provided keys?
A: SSE-C (customer-provided keys) for S3, or CloudHSM

Q: Audit all AWS API calls in the account?
A: CloudTrail (enable in all regions, store in S3)

Q: Detect threats from CloudTrail/VPC flow logs without rules?
A: GuardDuty (ML-based threat detection)

Q: Scan EC2 instances for OS vulnerabilities?
A: Amazon Inspector

Q: Discover PII/sensitive data in S3?
A: Amazon Macie

Q: Centralize security findings from multiple services?
A: AWS Security Hub

Q: EC2 access without SSH key or bastion?
A: SSM Session Manager

Q: Secure secret rotation for RDS password every 30 days?
A: Secrets Manager with RDS rotation Lambda

Q: Deploy infrastructure consistently across 100 AWS accounts?
A: CloudFormation StackSets

Q: Zero-downtime RDS upgrade?
A: Multi-AZ (Aurora): promotion failover; Standard RDS: blue-green deployments

Q: Store session state for stateless application across multiple EC2?
A: ElastiCache (Redis) for session storage

Q: Trigger Lambda when new object uploaded to S3?
A: S3 Event Notification → Lambda

Q: Process events in strict order (one order at a time per customer)?
A: SQS FIFO queue with MessageGroupId

Q: Reduce Lambda cold starts for latency-sensitive app?
A: Provisioned Concurrency

Q: Connect on-premises data center to VPC securely?
A: AWS Direct Connect (dedicated) or Site-to-Site VPN

Q: Allow VPC A to communicate with VPC B in same account?
A: VPC Peering

Q: Hub-and-spoke network for many VPCs?
A: Transit Gateway

Q: Content delivery with edge computing?
A: CloudFront with Lambda@Edge or CloudFront Functions

Q: Reindex petabytes of S3 data without EC2?
A: S3 Batch Operations + Lambda

Q: Serverless data warehouse for analytics?
A: Athena (S3) or Redshift Serverless

Q: Fan-out one event to multiple consumers?
A: SNS topic with multiple SQS subscriptions (SNS-SQS fan-out)

Q: Reliably deliver webhook notifications?
A: SNS with HTTP/S subscription + retry + DLQ

Q: Scale reads for PostgreSQL without changing application code?
A: RDS Read Replica (same connection string via read endpoint)

Q: Cost-effective warm DR in another region?
A: Pilot Light (replication only) or Warm Standby (scaled-down)

Q: Prevent accidental termination of production EC2?
A: Termination protection + IAM deny for terminate actions

Q: Enforce password policy for all IAM users?
A: IAM Account Password Policy

Q: Prevent any account in org from disabling CloudTrail?
A: Service Control Policy (SCP) denying cloudtrail:DeleteTrail

Q: Automatically remediate non-compliant resources?
A: AWS Config + Remediation Action (SSM Automation)

Q: Data archive with lowest cost?
A: S3 Glacier Deep Archive ($0.00099/GB/month)

Q: Near real-time data streaming processing?
A: Kinesis Data Streams + Lambda/Kinesis Data Analytics

Q: Migrate large datasets to S3 (100 TB) over slow internet?
A: AWS Snowball Edge (physical device shipped to you)
```

---

## Exam Strategies

```
Time management:
  130 min ÷ 65 questions = 2 min/question
  Flag and skip uncertain questions, return at end
  Eliminate clearly wrong answers first

Keywords to watch:
  "most cost-effective" → Spot, Lambda, S3 tiers, Reserved
  "highest performance" → Provisioned IOPS, instance store, ElastiCache, DAX
  "most resilient / HA" → Multi-AZ, ASG, Multi-Region
  "most secure" → private subnets, IAM least privilege, encryption
  "no servers / serverless" → Lambda, Fargate, DynamoDB, SQS, S3, EventBridge
  "shared file system" → EFS (not EBS, not S3)
  "ordered messages" → SQS FIFO
  "fan-out" → SNS → SQS
  "decouple" → SQS, SNS, EventBridge

Common traps:
  EBS ≠ shared storage (EBS = one EC2 only, use EFS for shared)
  S3 ≠ file system (object storage, eventual consistency for list)
  RDS Multi-AZ ≠ read scaling (standby doesn't serve reads)
  Security Group = stateful, NACL = stateless
  CloudFront works with on-premises origins (not just S3)
  Lambda timeout max = 15 min (not for long-running jobs)
```

---

## Study Resources

```
Official:
  AWS Skill Builder: free practice exams + official course
  AWS Exam Guide: SAA-C03 (download from AWS)
  AWS FAQ pages: S3, EC2, RDS, Lambda, VPC

Practice exams (600-750 score goal before attempting):
  Tutorials Dojo: 350+ practice questions, detailed explanations
  Whizlabs: full-length practice exams
  AWS Official: 20-question practice exam ($20 on skill builder)

Courses:
  Stephane Maarek (Udemy): comprehensive, updated regularly
  Adrian Cantrill (cantrill.io): deep dives, labs
  freeCodeCamp on YouTube: free overview course

Hands-on:
  Build all services covered in this Phase 6
  Use the AWS Free Tier for experiments
  AWS CloudQuest (gamified labs)
```

---

## Self Assessment
1. What is the difference between HA and fault tolerance?
2. What is RTO vs RPO?
3. What is the difference between pilot light and warm standby?
4. When would you use SQS FIFO vs Standard?
5. What is the SNS fan-out pattern?
6. What is the difference between Security Groups and NACLs?
7. When would you use Lambda vs EC2?
8. What is the difference between RDS Multi-AZ and Read Replicas?
9. What is EFS and when would you use it over EBS?
10. What are the four exam domains and their weightings?
