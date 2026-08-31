# Phase 5 — Chapter 8: Terraform

---

## Chapter Overview

Terraform is the standard Infrastructure as Code (IaC) tool. Instead of clicking through the AWS console, you define infrastructure in HCL (HashiCorp Configuration Language) files, version them in git, and apply them. This chapter covers core Terraform concepts and real AWS infrastructure patterns.

**Topics:**
- HCL syntax: providers, resources, variables, outputs
- Terraform state and remote backends (S3 + DynamoDB lock)
- Modules for reusable infrastructure
- Workspaces for environments
- Common AWS resources (EC2, VPC, RDS, S3)
- CI/CD with Terraform (Atlantis / GitHub Actions)

---

## Beginner Theory

### Core Concepts

```
Provider:   Plugin for a cloud/service (AWS, GCP, Azure, GitHub, PagerDuty)
Resource:   Infrastructure object (aws_instance, aws_s3_bucket, aws_rds_cluster)
Data:       Read existing infrastructure (aws_ami, aws_availability_zones)
Variable:   Input to a configuration
Output:     Value exposed for use by other configurations or users
State:      Terraform's view of current infrastructure (terraform.tfstate)
Module:     Reusable group of resources
Workspace:  Separate state for the same configuration (dev, staging, prod)

terraform init      ← download providers, initialize backend
terraform plan      ← show what changes would be applied
terraform apply     ← apply changes (creates/updates/destroys resources)
terraform destroy   ← destroy all resources
terraform output    ← show outputs
terraform state     ← inspect/manipulate state
```

---

## Basic Examples

### VPC + EC2 Infrastructure

```hcl
# terraform/main.tf

terraform {
  required_version = ">= 1.8"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Remote state in S3 (shared across team)
  backend "s3" {
    bucket         = "mycompany-terraform-state"
    key            = "myapp/production/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-state-lock"  # prevents concurrent applies
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "myapp"
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

# Data sources
data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_ami" "amazon_linux_2023" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-*-x86_64"]
  }
}

# VPC
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = { Name = "${var.project}-${var.environment}-vpc" }
}

# Internet Gateway
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
  tags   = { Name = "${var.project}-${var.environment}-igw" }
}

# Public subnets
resource "aws_subnet" "public" {
  count             = 2
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 4, count.index)
  availability_zone = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true

  tags = { Name = "${var.project}-public-${count.index + 1}" }
}

# Private subnets
resource "aws_subnet" "private" {
  count             = 2
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 4, count.index + 4)
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = { Name = "${var.project}-private-${count.index + 1}" }
}

# Public route table
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }
  tags = { Name = "${var.project}-public-rt" }
}

resource "aws_route_table_association" "public" {
  count          = length(aws_subnet.public)
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

# Security group for app servers
resource "aws_security_group" "app" {
  name        = "${var.project}-${var.environment}-app"
  description = "Security group for app servers"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "HTTP from ALB"
    from_port       = 3000
    to_port         = 3000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${var.project}-app-sg" }
}

# EC2 instance
resource "aws_instance" "app" {
  count         = var.instance_count
  ami           = data.aws_ami.amazon_linux_2023.id
  instance_type = var.instance_type
  subnet_id     = aws_subnet.private[count.index % length(aws_subnet.private)].id

  vpc_security_group_ids = [aws_security_group.app.id]
  iam_instance_profile   = aws_iam_instance_profile.app.name

  root_block_device {
    volume_type = "gp3"
    volume_size = 20
    encrypted   = true
  }

  user_data = base64encode(templatefile("${path.module}/templates/user_data.sh.tpl", {
    environment    = var.environment
    database_url   = var.database_url
    redis_url      = var.redis_url
  }))

  lifecycle {
    create_before_destroy = true  # for rolling updates
  }

  tags = { Name = "${var.project}-app-${count.index + 1}" }
}
```

### Variables and Outputs

```hcl
# terraform/variables.tf

variable "aws_region" {
  description = "AWS region for all resources"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name (dev, staging, production)"
  type        = string
  validation {
    condition     = contains(["dev", "staging", "production"], var.environment)
    error_message = "Environment must be one of: dev, staging, production."
  }
}

variable "project" {
  description = "Project name, used in resource naming"
  type        = string
}

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.micro"
}

variable "instance_count" {
  description = "Number of app instances"
  type        = number
  default     = 2
}

variable "database_url" {
  description = "PostgreSQL connection URL"
  type        = string
  sensitive   = true  # masked in logs
}

variable "redis_url" {
  description = "Redis connection URL"
  type        = string
  sensitive   = true
}

# terraform/outputs.tf

output "vpc_id" {
  description = "VPC ID"
  value       = aws_vpc.main.id
}

output "public_subnet_ids" {
  description = "Public subnet IDs"
  value       = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  description = "Private subnet IDs"
  value       = aws_subnet.private[*].id
}

output "app_instance_ids" {
  description = "App server instance IDs"
  value       = aws_instance.app[*].id
}

output "alb_dns_name" {
  description = "Load balancer DNS name"
  value       = aws_lb.app.dns_name
}
```

---

## Intermediate Concepts

### Modules

```hcl
# modules/rds/main.tf — reusable RDS module
variable "identifier"          { type = string }
variable "engine_version"      { type = string; default = "16.4" }
variable "instance_class"      { type = string; default = "db.t3.micro" }
variable "db_name"             { type = string }
variable "db_username"         { type = string }
variable "db_password"         { type = string; sensitive = true }
variable "subnet_ids"          { type = list(string) }
variable "vpc_security_group_ids" { type = list(string) }
variable "multi_az"            { type = bool; default = false }
variable "backup_retention"    { type = number; default = 7 }

resource "aws_db_subnet_group" "this" {
  name       = "${var.identifier}-subnet-group"
  subnet_ids = var.subnet_ids
}

resource "aws_db_instance" "this" {
  identifier        = var.identifier
  engine            = "postgres"
  engine_version    = var.engine_version
  instance_class    = var.instance_class
  allocated_storage = 20
  storage_type      = "gp3"
  storage_encrypted = true

  db_name  = var.db_name
  username = var.db_username
  password = var.db_password

  db_subnet_group_name   = aws_db_subnet_group.this.name
  vpc_security_group_ids = var.vpc_security_group_ids

  multi_az               = var.multi_az
  backup_retention_period = var.backup_retention
  backup_window          = "03:00-04:00"
  maintenance_window     = "Mon:04:00-Mon:05:00"

  deletion_protection = true
  skip_final_snapshot = false
  final_snapshot_identifier = "${var.identifier}-final"

  enabled_cloudwatch_logs_exports = ["postgresql"]

  lifecycle {
    prevent_destroy = true
    ignore_changes  = [password]  # rotate via Secrets Manager, not Terraform
  }
}

output "endpoint" { value = aws_db_instance.this.endpoint }
output "port"     { value = aws_db_instance.this.port }
output "arn"      { value = aws_db_instance.this.arn }

# ─── Module usage ────────────────────────────────────────
# modules/rds are reused in main.tf:
module "rds" {
  source = "./modules/rds"

  identifier             = "${var.project}-${var.environment}-db"
  db_name                = "myapp"
  db_username            = "myapp_user"
  db_password            = var.db_password
  subnet_ids             = module.vpc.private_subnet_ids
  vpc_security_group_ids = [aws_security_group.rds.id]
  multi_az               = var.environment == "production"
  backup_retention       = var.environment == "production" ? 30 : 7
}
```

### Terraform Workspaces for Environments

```bash
# Create workspaces for each environment
terraform workspace new staging
terraform workspace new production
terraform workspace list
# * production
#   staging
#   default

# Switch workspace
terraform workspace select staging

# Use workspace in config
# terraform/main.tf
locals {
  env_config = {
    staging    = { instance_type = "t3.small",  instance_count = 1, multi_az = false }
    production = { instance_type = "t3.medium", instance_count = 3, multi_az = true  }
  }
  config = local.env_config[terraform.workspace]
}

resource "aws_instance" "app" {
  count         = local.config.instance_count
  instance_type = local.config.instance_type
}

# Apply to staging
terraform workspace select staging
terraform plan -var="project=myapp"
terraform apply -var="project=myapp"

# Apply to production
terraform workspace select production
terraform plan -var="project=myapp"
terraform apply -var="project=myapp"
```

### CI/CD with Terraform (Atlantis)

Running `terraform apply` from an engineer's laptop is risky — there's no review step, no record of who ran what, and no guarantee the person applying has the latest state pulled. **Atlantis** solves this by moving Terraform execution into the pull request workflow itself, so infrastructure changes get the same review process as code changes.

```
How Atlantis fits into a PR workflow:

1. Engineer opens a PR that changes a .tf file.
2. Atlantis (running as a webhook-triggered service) automatically
   comments on the PR with the output of `terraform plan` — showing
   exactly what will be added, changed, or destroyed.
3. A teammate reviews the PR AND the plan output together — "this change
   to the security group rule also happens to resize the RDS instance,
   was that intended?"
4. Once approved, a reviewer comments `atlantis apply` directly on the PR.
5. Atlantis runs `terraform apply` and comments the result back on the PR.
6. The PR is merged — main branch and real infrastructure are now in sync.

Why not just run `terraform apply` in a normal GitHub Actions CI job on
merge? You can — many teams do. Atlantis's advantage is showing the PLAN
during review (before merge), so reviewers see the actual infrastructure
diff, not just the code diff, before approving. A GitHub Actions-only
approach either applies before review (risky) or requires a second manual
step after merge.
```

```yaml
# atlantis.yaml — project configuration (lives in repo root)
version: 3
projects:
  - name: production
    dir: terraform/environments/production
    workflow: default
    apply_requirements: [approved, mergeable]  # require PR approval before apply

  - name: staging
    dir: terraform/environments/staging
    workflow: default
```

The alternative — running `terraform plan`/`apply` as ordinary GitHub Actions jobs — works fine for smaller teams; Atlantis earns its keep once multiple engineers touch infrastructure daily and you need a stricter review gate specifically on infra changes.

---

## Interview Preparation

**Q1: What is Terraform state and why store it remotely?**
A: Terraform state is a JSON file that maps your HCL resources to real infrastructure objects (e.g., `aws_instance.app[0]` → `i-1234567890`). Without state, Terraform couldn't know which real resources correspond to which config. Remote state (S3 + DynamoDB): shared across team members — without it, two engineers applying Terraform simultaneously could corrupt state. S3 provides durable storage and versioning (can restore previous state). DynamoDB provides a state lock — prevents concurrent `terraform apply` operations that could corrupt state. The `backend "s3"` block configures remote state.

**Q2: What is the difference between `terraform plan` and `terraform apply`?**
A: `terraform plan` shows what changes would be made — creates a diff between current state and desired state. It reads current state, queries the cloud provider for actual resource attributes, and shows additions (+), removals (-), and modifications (~). It does NOT make any changes. `terraform apply` executes the plan. Best practice: always run `plan` first, review the diff, then `apply`. In CI/CD: generate plan as PR comment (Atlantis), then apply on merge. Never run `terraform apply --auto-approve` in production without reviewing the plan.

**Q3: What is a Terraform module and when should you create one?**
A: A module is a directory of `.tf` files that represents a reusable piece of infrastructure. You call it with `module "name" { source = "./path" }` and pass inputs via variables. Create a module when: you use the same group of resources in multiple places (VPC module used by staging and production), or when a group of resources logically belongs together (RDS module encapsulates DB instance + subnet group + parameter group). Good modules have: input variables with validation, sensible defaults, output values for consumers, and a README. Use public registry modules for standard infrastructure (e.g., `terraform-aws-modules/vpc/aws`).

---

## Practical Tasks

### Beginner (10 Tasks)
1. Install Terraform and configure AWS credentials.
2. Write a Terraform config to create an S3 bucket.
3. Run `terraform plan` and `terraform apply`.
4. Add a tag to the S3 bucket and `terraform apply` again.
5. Destroy the S3 bucket with `terraform destroy`.
6. Configure a remote S3 backend for state storage.
7. Add a variable for the bucket name and use it.
8. Add an output for the bucket ARN.
9. Use a `data` source to look up the current AWS region.
10. Create an EC2 security group with Terraform.

### Intermediate (10 Tasks)
1. Create a complete VPC with public and private subnets.
2. Launch an EC2 instance in the VPC.
3. Create a module for the VPC and reuse it.
4. Create an RDS PostgreSQL instance in private subnets.
5. Create an Application Load Balancer.
6. Use `terraform workspace` for dev and production environments.
7. Add `sensitive = true` to password variables.
8. Use `count` to create multiple subnets in different AZs.
9. Add `lifecycle { prevent_destroy = true }` to the RDS instance.
10. Use `depends_on` to ensure correct resource creation order.

### Advanced (10 Tasks)
1. Create a complete 3-tier app: VPC + ALB + EC2 + RDS.
2. Build an ECS Fargate service with Terraform.
3. Implement `terraform import` to bring existing infrastructure under management.
4. Create a CI/CD pipeline with Atlantis for PR plan/apply workflow.
5. Use `for_each` instead of `count` for subnet creation.
6. Store secrets in AWS Secrets Manager and read with `data`.
7. Create a custom IAM role and instance profile.
8. Implement Terraform across multiple AWS accounts.
9. Write Terratest (Go) unit tests for a Terraform module.
10. Implement cost estimation with Infracost in CI.

---

## Self Assessment
1. What is Infrastructure as Code?
2. What is Terraform state?
3. What is a remote backend?
4. What does `terraform plan` do?
5. What is a resource?
6. What is a data source?
7. What is a module?
8. What is the purpose of the DynamoDB state lock table?
9. What does `sensitive = true` on a variable do?
10. What is `lifecycle { prevent_destroy = true }` used for?

---

## Cheat Sheet

```hcl
# Provider
terraform { required_providers { aws = { source = "hashicorp/aws", version = "~> 5.0" } }
  backend "s3" { bucket = "tfstate", key = "app/prod.tfstate", region = "us-east-1", dynamodb_table = "tf-lock" }
}
provider "aws" { region = var.aws_region }

# Variables
variable "env"      { type = string; validation { condition = contains(["dev","prod"], var.env); error_message = "..." } }
variable "password" { type = string; sensitive = true }

# Resource
resource "aws_vpc" "main" { cidr_block = "10.0.0.0/16"; tags = { Name = "vpc" } }

# Data
data "aws_ami" "al2023" { most_recent = true; owners = ["amazon"]; filter { name = "name"; values = ["al2023-ami-*"] } }

# Output
output "vpc_id" { value = aws_vpc.main.id }

# Module
module "rds" { source = "./modules/rds"; identifier = "myapp-db"; db_name = "myapp" }

# Count
resource "aws_subnet" "pub" { count = 2; cidr_block = cidrsubnet("10.0.0.0/16", 4, count.index) }

# Lifecycle
lifecycle { prevent_destroy = true; create_before_destroy = true }
```

```bash
terraform init           # download providers + initialize backend
terraform plan           # preview changes
terraform apply          # apply changes
terraform apply -auto-approve  # no confirmation (CI only)
terraform destroy        # destroy all
terraform output         # show outputs
terraform state list     # list managed resources
terraform workspace new staging; terraform workspace select staging
terraform import aws_s3_bucket.my my-existing-bucket
```
