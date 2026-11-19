# Phase 6 — Chapter 1: AWS Overview

---

## Chapter Overview

Amazon Web Services (AWS) is the world's largest cloud provider with 200+ services across compute, storage, databases, networking, AI/ML, security, and more. This chapter establishes the conceptual framework before diving into individual services.

**Topics:**
- AWS global infrastructure (Regions, AZs, Edge Locations)
- AWS shared responsibility model
- AWS pricing model (pay-as-you-go, Reserved, Spot)
- Core service categories
- IAM fundamentals
- AWS CLI and SDKs
- Cost management

---

## Beginner Theory

### Global Infrastructure

```
Region:             Geographic area with 2+ AZs (e.g., us-east-1, eu-west-1)
                    ~33 regions worldwide (2025)

Availability Zone:  One or more discrete data centers with redundant power,
                    networking, connectivity in a Region (e.g., us-east-1a)
                    Deploy across 2+ AZs for high availability

Edge Location:      Points of Presence (PoPs) for CloudFront CDN, Route 53
                    ~600+ worldwide — serve cached content close to users

Local Zone:         Extension of a Region closer to a metropolitan area
                    Ultra-low latency for specific cities

Wavelength Zone:    5G carrier network integration for mobile edge computing

Choosing a Region:
  1. Compliance / data residency (GDPR → EU regions)
  2. Latency to your users (check with CloudPing.info)
  3. Service availability (not all services in all regions)
  4. Cost (prices vary by region — us-east-1 usually cheapest)
```

### Shared Responsibility Model

```
AWS Responsible For ("security OF the cloud"):
  Physical security of data centers
  Hardware and network infrastructure
  Hypervisor and virtualization layer
  Global infrastructure (regions, AZs, edge)
  Managed service security (RDS, Lambda, S3 encryption at rest)

You Responsible For ("security IN the cloud"):
  Data encryption (at rest and in transit)
  Identity and Access Management (IAM)
  Network security (security groups, NACLs, VPC config)
  OS patches (for EC2 — not for managed services like RDS)
  Application security
  Customer data

Rule of thumb:
  EC2 (IaaS): you manage OS, patching, runtime, application
  RDS (PaaS):  AWS manages OS and database engine, you manage schema/data
  Lambda (FaaS): AWS manages everything below your function code
```

---

## Basic Examples

### AWS CLI Setup

```bash
# Install AWS CLI v2
# Linux
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# macOS
brew install awscli

# Windows
winget install Amazon.AWSCLI

# Configure
aws configure
# AWS Access Key ID [None]: AKIA...
# AWS Secret Access Key [None]: ...
# Default region name [None]: us-east-1
# Default output format [None]: json

# Multiple profiles
aws configure --profile production
aws configure --profile staging

# Use profile
aws s3 ls --profile production
export AWS_PROFILE=production  # set for session

# With SSO (recommended for companies)
aws configure sso
aws sso login --profile mycompany-prod

# Common commands
aws sts get-caller-identity           # who am I?
aws ec2 describe-instances            # list EC2 instances
aws s3 ls                             # list S3 buckets
aws s3 ls s3://my-bucket/            # list bucket contents
aws ec2 describe-regions              # list available regions
aws ec2 describe-availability-zones --region us-east-1  # list AZs

# Using AWS CLI with MFA
aws sts get-session-token \
  --serial-number arn:aws:iam::123456789:mfa/myuser \
  --token-code 123456
```

### AWS SDK (Node.js)

```typescript
// Install
// npm install @aws-sdk/client-s3 @aws-sdk/client-ec2 @aws-sdk/client-sts

import { STSClient, GetCallerIdentityCommand } from "@aws-sdk/client-sts";
import { EC2Client, DescribeInstancesCommand } from "@aws-sdk/client-ec2";
import { S3Client, ListBucketsCommand }        from "@aws-sdk/client-s3";

// Client creation (region from env or config)
const sts = new STSClient({ region: process.env.AWS_REGION || "us-east-1" });
const ec2 = new EC2Client({ region: "us-east-1" });
const s3  = new S3Client({ region: "us-east-1" });

// Who am I?
const identity = await sts.send(new GetCallerIdentityCommand({}));
console.log(identity.Account, identity.UserId, identity.Arn);

// List buckets
const { Buckets } = await s3.send(new ListBucketsCommand({}));
console.log(Buckets?.map(b => b.Name));

// Credentials order (automatic):
// 1. Environment variables (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
// 2. ~/.aws/credentials file
// 3. EC2 instance profile / ECS task role / Lambda role (recommended for production)
// Never hardcode credentials in code!
```

---

## Intermediate Concepts

### AWS Pricing Model

```
On-Demand:
  Pay by the second/hour for what you use
  No upfront commitment, no discounts
  Best for: variable workloads, testing, getting started

Reserved Instances (EC2, RDS, ElastiCache):
  1 or 3-year commitment
  Up to 72% discount vs. On-Demand
  Standard: fixed instance type and region
  Convertible: can change instance type
  Best for: predictable, steady-state workloads

Savings Plans:
  1 or 3-year commitment to a spend amount ($/hour)
  More flexible than RIs — applies across EC2, Lambda, Fargate
  Compute Savings Plan: 66% discount
  EC2 Instance Savings Plan: 72% discount (most rigid)

Spot Instances:
  Unused EC2 capacity at 70-90% discount
  Can be interrupted with 2-minute notice
  Best for: fault-tolerant batch workloads, ML training, CI/CD

Free Tier:
  12-month free tier for new accounts (EC2 t2.micro 750h/mo)
  Always-free tier (Lambda 1M requests/mo, DynamoDB 25GB, S3 5GB)

Cost reduction strategies:
  Right-size instances (monitor with CloudWatch, use Compute Optimizer)
  Use Reserved Instances for baseline load
  Use Spot for burst/batch
  Use S3 Intelligent-Tiering for unknown access patterns
  Enable Cost Explorer and set budget alerts
  Delete unused resources (snapshots, EIPs, idle instances)
```

### Core Service Categories

With 200+ AWS services, the way to keep from feeling overwhelmed is to organize them by the problem they solve rather than memorizing each one individually:

```
Compute:      EC2 (VMs), Lambda (serverless functions), ECS/EKS (containers),
              Fargate (serverless containers)
              → "where does my code actually run?"

Storage:      S3 (object storage), EBS (block storage attached to EC2),
              EFS (shared file storage)
              → "where do I keep files/blobs?"

Database:     RDS (managed relational: Postgres/MySQL), DynamoDB (NoSQL),
              ElastiCache (Redis/Memcached), Aurora (AWS's own RDS engine)
              → "where do I keep structured data?"

Networking:   VPC (private network), Route 53 (DNS), CloudFront (CDN),
              ELB (load balancing), API Gateway
              → "how does traffic reach my services?"

Security:     IAM (access control), Secrets Manager, KMS (encryption keys),
              GuardDuty (threat detection), WAF (web application firewall)
              → "who can do what, and how is data protected?"

Messaging:    SQS (queues), SNS (pub/sub notifications), EventBridge (event bus)
              → "how do services talk to each other asynchronously?"

Monitoring:   CloudWatch (metrics/logs/alarms), CloudTrail (API audit log),
              X-Ray (distributed tracing)
              → "how do I know what's happening in production?"

This chapter's remaining sections in Phase 6 work through these categories
roughly in this order — the categories above are the mental map; the
individual chapters are the details.
```

---

## Interview Preparation

**Q1: What is AWS's shared responsibility model?**
A: AWS is responsible for "security OF the cloud" — the physical infrastructure, hardware, network, hypervisor, and managed service security. You are responsible for "security IN the cloud" — everything you build on top: IAM configuration, data encryption, network security (security groups, VPC), OS patching (for IaaS like EC2), application code, and protecting customer data. The boundary shifts depending on the service: with EC2, you're responsible for the OS; with RDS, AWS handles the OS and database engine patches; with Lambda, AWS handles everything below your function. This model means you can't "opt out" of your security responsibilities by assuming AWS handles it all.

**Q2: What is the difference between an AWS Region and an Availability Zone?**
A: A Region is a geographic area (e.g., `us-east-1` = Northern Virginia, `eu-west-1` = Ireland) composed of multiple isolated Availability Zones. Regions are completely independent — failure of one region doesn't affect others. An Availability Zone (AZ) is one or more physically separate data centers within a Region, connected with low-latency networking. AZs in a region share the same geographic area but are far enough apart to be independent of each other (separate power grids, flood zones, buildings). Deploy across 2-3 AZs for high availability within a region. Deploy across regions for disaster recovery or global distribution.

**Q3: How do you optimize AWS costs for a production application?**
A: Analyze with Cost Explorer and AWS Trusted Advisor. Right-size EC2 instances — use CloudWatch metrics and Compute Optimizer recommendations. Use Reserved Instances or Savings Plans for predictable baseline (1-year commitment for 40% savings, 3-year for 60%). Replace idle On-Demand instances with Spot for batch/CI workloads. For RDS, use Reserved DB Instances. Set up billing alerts with AWS Budgets. Use S3 Intelligent-Tiering and lifecycle policies to move old data to Glacier. Use NAT Gateway sparingly — it charges per GB ($0.045/GB). Use VPC endpoints to avoid data transfer costs for S3/DynamoDB. Tag all resources for cost allocation reports.

---

## Practical Tasks

### Beginner (10 Tasks)
1. Create an AWS account and set up MFA on the root account.
2. Create an IAM admin user (don't use root for daily use).
3. Install AWS CLI and configure with the IAM user credentials.
4. Run `aws sts get-caller-identity` to verify.
5. Create an S3 bucket and upload a file.
6. Launch a t2.micro EC2 instance (free tier).
7. SSH into the EC2 instance.
8. View EC2 instances with `aws ec2 describe-instances`.
9. Set up AWS Budget with $10 alert.
10. Install and try AWS CloudShell in the console.

### Intermediate (10 Tasks)
1. Use AWS CLI with multiple profiles (dev + prod).
2. Use AWS SDK to list S3 buckets programmatically.
3. Enable CloudTrail for audit logging.
4. Enable Cost Explorer and explore spending.
5. Create an IAM role with EC2 permissions.
6. Attach the role to an EC2 instance.
7. Use instance metadata to get the current region from EC2.
8. Set up AWS Config for resource configuration tracking.
9. Enable GuardDuty for threat detection.
10. Review Trusted Advisor recommendations.

### Advanced (10 Tasks)
1. Set up AWS Organizations for multi-account management.
2. Configure AWS SSO (IAM Identity Center) for team access.
3. Implement AWS Control Tower for landing zone governance.
4. Set up Service Control Policies (SCPs) to restrict actions.
5. Build a cost attribution system with resource tagging strategy.
6. Set up AWS Budgets with actions (auto-shutdown on spend).
7. Implement AWS Security Hub for security posture management.
8. Configure AWS Config rules for compliance checking.
9. Build Terraform modules for all common AWS resources.
10. Pass the AWS Solutions Architect Associate exam.

---

## Self Assessment
1. What is an AWS Region?
2. What is an Availability Zone?
3. What is the shared responsibility model?
4. What is AWS IAM?
5. What is the AWS Free Tier?
6. What is a Reserved Instance?
7. What is a Spot Instance?
8. What does `aws sts get-caller-identity` return?
9. What is CloudTrail?
10. What is the difference between IaaS, PaaS, and FaaS on AWS?

---

## Cheat Sheet

```bash
# AWS CLI basics
aws configure                          # set up credentials
aws configure --profile prod           # named profile
export AWS_PROFILE=prod                # use profile for session
export AWS_REGION=us-east-1

aws sts get-caller-identity            # who am I?
aws s3 ls                              # list buckets
aws s3 ls s3://mybucket/              # list bucket content
aws s3 cp file.txt s3://mybucket/     # upload
aws s3 sync ./dist s3://mybucket/     # sync directory

aws ec2 describe-instances --query 'Reservations[].Instances[].{ID:InstanceId,State:State.Name,IP:PublicIpAddress}'
aws ec2 start-instances --instance-ids i-1234567890
aws ec2 stop-instances  --instance-ids i-1234567890

# Regions and AZs
aws ec2 describe-regions --output table
aws ec2 describe-availability-zones --region us-east-1 --output table

# Cost
aws ce get-cost-and-usage \
  --time-period Start=2025-01-01,End=2025-01-31 \
  --granularity MONTHLY \
  --metrics BlendedCost
```

```
Key AWS Concepts:
  ARN:   Amazon Resource Name (arn:aws:s3:::mybucket)
  IAM:   Identity and Access Management
  VPC:   Virtual Private Cloud
  EC2:   Elastic Compute Cloud (VMs)
  S3:    Simple Storage Service (object storage)
  RDS:   Relational Database Service
  ECS:   Elastic Container Service
  EKS:   Elastic Kubernetes Service
  Lambda: Serverless function execution
  ALB:   Application Load Balancer
  Route 53: DNS service
  CloudFront: CDN
  CloudWatch: Monitoring and logs
```
