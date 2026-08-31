# Phase 6 — Chapter 7: VPC (Virtual Private Cloud)

---

## Chapter Overview

VPC is your private network in AWS. Every resource — EC2, RDS, Lambda (VPC-attached), ECS tasks — lives inside a VPC. Understanding VPC architecture is required for secure, scalable AWS deployments.

**Topics:**
- VPC CIDR blocks and subnets
- Internet Gateway (IGW) and NAT Gateway
- Route Tables
- Security Groups vs. NACLs
- VPC Endpoints (Gateway and Interface)
- VPC Peering and Transit Gateway
- PrivateLink
- Flow Logs

---

## Beginner Theory

### VPC Architecture

```
VPC: 10.0.0.0/16 (65,536 IPs)
│
├── Public Subnet AZ-a: 10.0.1.0/24 (256 IPs)   ← ALB, NAT GW, Bastion
│     Route: 0.0.0.0/0 → Internet Gateway
│
├── Public Subnet AZ-b: 10.0.2.0/24
│     Route: 0.0.0.0/0 → Internet Gateway
│
├── Private Subnet AZ-a: 10.0.10.0/24            ← EC2, ECS, RDS
│     Route: 0.0.0.0/0 → NAT Gateway (in AZ-a public subnet)
│
├── Private Subnet AZ-b: 10.0.20.0/24
│     Route: 0.0.0.0/0 → NAT Gateway (in AZ-b public subnet)
│
└── Database Subnet AZ-a: 10.0.30.0/24           ← RDS, ElastiCache
      Database Subnet AZ-b: 10.0.31.0/24
      Route: no internet route (fully isolated)

Internet Gateway (IGW):
  Attached to VPC. Allows public subnets to reach the internet.
  Bidirectional: internet → VPC (with public IP) and VPC → internet.

NAT Gateway:
  Lives in PUBLIC subnet. Allows PRIVATE subnet instances to reach internet
  (OS updates, npm install, ECR pull) WITHOUT being directly accessible.
  One-directional: VPC → internet only. $0.045/hr + $0.045/GB.
  Best practice: one NAT GW per AZ (AZ fault tolerance).

Route Table:
  Controls where network traffic goes.
  Each subnet is associated with one route table.
  Public subnet route table:  local + 0.0.0.0/0 → IGW
  Private subnet route table: local + 0.0.0.0/0 → NAT GW
  Database subnet route table: local only (no internet)
```

---

## Basic Examples

### VPC with Terraform

```hcl
# VPC
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = { Name = "myapp-vpc" }
}

# Internet Gateway
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
  tags   = { Name = "myapp-igw" }
}

# Public Subnets
resource "aws_subnet" "public" {
  count             = 2
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.${count.index + 1}.0/24"
  availability_zone = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true

  tags = { Name = "myapp-public-${count.index + 1}" }
}

# Private Subnets (app tier)
resource "aws_subnet" "private" {
  count             = 2
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.${count.index + 10}.0/24"
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = { Name = "myapp-private-${count.index + 1}" }
}

# Database Subnets (DB tier — no internet)
resource "aws_subnet" "database" {
  count             = 2
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.${count.index + 30}.0/24"
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = { Name = "myapp-database-${count.index + 1}" }
}

# Elastic IPs for NAT Gateways
resource "aws_eip" "nat" {
  count  = 2
  domain = "vpc"
  tags   = { Name = "myapp-nat-eip-${count.index + 1}" }
}

# NAT Gateways (one per AZ for HA)
resource "aws_nat_gateway" "main" {
  count         = 2
  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id

  tags = { Name = "myapp-nat-${count.index + 1}" }
  depends_on = [aws_internet_gateway.main]
}

# Public Route Table
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = { Name = "myapp-public-rt" }
}

resource "aws_route_table_association" "public" {
  count          = 2
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

# Private Route Tables (one per AZ — each routes through its AZ's NAT GW)
resource "aws_route_table" "private" {
  count  = 2
  vpc_id = aws_vpc.main.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main[count.index].id
  }

  tags = { Name = "myapp-private-rt-${count.index + 1}" }
}

resource "aws_route_table_association" "private" {
  count          = 2
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private[count.index].id
}

# Database Route Table (local only, no internet)
resource "aws_route_table" "database" {
  vpc_id = aws_vpc.main.id
  tags   = { Name = "myapp-database-rt" }
}

resource "aws_route_table_association" "database" {
  count          = 2
  subnet_id      = aws_subnet.database[count.index].id
  route_table_id = aws_route_table.database.id
}
```

### VPC Endpoints (Save NAT Gateway Costs)

```hcl
# S3 Gateway Endpoint — free, routes S3 traffic inside AWS network
resource "aws_vpc_endpoint" "s3" {
  vpc_id            = aws_vpc.main.id
  service_name      = "com.amazonaws.${var.region}.s3"
  vpc_endpoint_type = "Gateway"
  route_table_ids   = concat(
    aws_route_table.private[*].id,
    [aws_route_table.database.id]
  )

  tags = { Name = "myapp-s3-endpoint" }
}

# DynamoDB Gateway Endpoint — free
resource "aws_vpc_endpoint" "dynamodb" {
  vpc_id            = aws_vpc.main.id
  service_name      = "com.amazonaws.${var.region}.dynamodb"
  vpc_endpoint_type = "Gateway"
  route_table_ids   = aws_route_table.private[*].id
}

# ECR Interface Endpoints — allow ECS tasks in private subnets to pull images without NAT GW
resource "aws_vpc_endpoint" "ecr_dkr" {
  vpc_id              = aws_vpc.main.id
  service_name        = "com.amazonaws.${var.region}.ecr.dkr"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = aws_subnet.private[*].id
  security_group_ids  = [aws_security_group.vpc_endpoints.id]
  private_dns_enabled = true
}

resource "aws_vpc_endpoint" "ecr_api" {
  vpc_id              = aws_vpc.main.id
  service_name        = "com.amazonaws.${var.region}.ecr.api"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = aws_subnet.private[*].id
  security_group_ids  = [aws_security_group.vpc_endpoints.id]
  private_dns_enabled = true
}

# Secrets Manager endpoint (avoid NAT GW for secrets retrieval)
resource "aws_vpc_endpoint" "secretsmanager" {
  vpc_id              = aws_vpc.main.id
  service_name        = "com.amazonaws.${var.region}.secretsmanager"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = aws_subnet.private[*].id
  security_group_ids  = [aws_security_group.vpc_endpoints.id]
  private_dns_enabled = true
}

# VPC Endpoint Security Group
resource "aws_security_group" "vpc_endpoints" {
  name   = "myapp-vpc-endpoints-sg"
  vpc_id = aws_vpc.main.id

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = [aws_vpc.main.cidr_block]  # allow from entire VPC
  }
}
```

### Connecting VPCs: Peering, Transit Gateway, and PrivateLink

Once an organization has more than one VPC (dev/staging/production, or per-team VPCs), a common need arises: services in one VPC need to reach services in another. AWS offers three different tools for this, each suited to a different shape of problem.

```
VPC Peering — direct 1-to-1 connection between two VPCs:

  VPC A (10.0.0.0/16) ◄──── peering connection ────► VPC B (10.1.0.0/16)

  - Simplest option, free (only pay for data transfer)
  - Traffic stays on AWS's private network, never touches the internet
  - Does NOT transit — if A is peered with B, and B is peered with C,
    A cannot reach C through B. Every pair needing connectivity needs
    its own peering connection (n VPCs → up to n(n-1)/2 connections)
  - CIDR blocks must not overlap between peered VPCs
  - Best for: a small, fixed number of VPCs that need to talk to each other

Transit Gateway — a central hub that many VPCs connect to:

           VPC A ─┐
           VPC B ─┼──► Transit Gateway ──► VPC D
           VPC C ─┘         │
                            └──► On-premises (via VPN/Direct Connect)

  - Solves the "n-squared peering connections" problem — each VPC makes
    ONE connection to the Transit Gateway, and can then reach every other
    attached VPC (subject to route table rules)
  - Also connects on-premises networks via VPN or Direct Connect
  - Costs more than peering (hourly charge + per-GB data processing)
  - Best for: organizations with many VPCs (10+), or hybrid cloud/on-prem setups

PrivateLink — expose ONE specific service privately, without connecting
entire networks:

  Your VPC:  [Service running on NLB] ──► PrivateLink endpoint service
                                                    │
  Consumer's VPC:  [Interface Endpoint] ◄───────────┘ (private IP in their VPC)

  - Unlike peering/Transit Gateway, PrivateLink does NOT give the consumer
    access to your whole VPC — only to the single specific service you
    exposed. The consumer's traffic never leaves their VPC's private
    address space to reach it.
  - This is how AWS itself exposes services like S3 and Secrets Manager
    via VPC endpoints internally — and it's the same mechanism SaaS
    vendors use to let customers reach their service without any public
    internet exposure.
  - Best for: exposing a specific API/service to other teams or other
    companies, without granting broad network access.

Decision rule: 2-3 VPCs that need full mutual access → Peering.
Many VPCs, or on-prem connectivity → Transit Gateway.
One service exposed to many consumers who shouldn't see your whole
network → PrivateLink.
```

---

## Interview Preparation

**Q1: What is the difference between a Security Group and a NACL?**
A: Security Group: stateful, instance-level firewall. You define inbound and outbound rules. Stateful means if you allow inbound on port 80, the return traffic is automatically allowed — you don't need an outbound rule for port 80 responses. Security groups can reference other security groups (e.g., "allow traffic from the ALB security group"). Changes take effect immediately. NACL (Network Access Control List): stateless, subnet-level firewall. Each rule has an allow or deny action. Stateless means you need explicit rules for both inbound AND outbound. Rules are evaluated in order (lowest number first). Default NACL allows all traffic. Custom NACLs deny all by default. NACLs are good for blocking IP ranges across a subnet. Best practice: primarily use Security Groups (simpler, stateful), add NACLs only for network-level allow/deny rules.

**Q2: What is a VPC Endpoint and when would you use one?**
A: Without a VPC Endpoint, traffic from your EC2/ECS instances to S3, DynamoDB, ECR etc. routes through the NAT Gateway ($0.045/GB processed), which adds cost and latency. A VPC Endpoint keeps the traffic inside the AWS network — it never leaves to the internet. Gateway Endpoints: free, for S3 and DynamoDB — adds route to route table. Interface Endpoints: creates an ENI in your subnet with a private IP — used for 200+ AWS services (ECR, Secrets Manager, SSM, KMS, SQS, SNS, etc.). Cost: $0.01/hr per AZ + $0.01/GB. For ECS Fargate in private subnets, you need ECR endpoints to pull images without NAT Gateway (significant cost saving at scale).

**Q3: How would you design a VPC for a multi-tier web application?**
A: Three-tier VPC design: Public tier (public subnets): ALB (load balancer), NAT Gateways, Bastion host or AWS Systems Manager for admin access. Private tier (private subnets): EC2/ECS application servers, Lambda functions. Has internet access via NAT GW (for outbound only). Database tier (database subnets): RDS, ElastiCache. No internet route — completely isolated. Security: Security groups with least-privilege rules (ALB → App → DB chain). NACLs optional for subnet-level rules. VPC Flow Logs for network audit. VPC Endpoints for S3, DynamoDB, ECR, Secrets Manager. High availability: subnets in 2-3 AZs. NAT GW per AZ (to avoid cross-AZ traffic cost). Multi-AZ ALB, RDS, and ECS tasks.

---

## Practical Tasks

### Beginner (10 Tasks)
1. Create a VPC with CIDR 10.0.0.0/16.
2. Create 2 public and 2 private subnets in different AZs.
3. Create an Internet Gateway and attach it to the VPC.
4. Create a public route table with 0.0.0.0/0 → IGW.
5. Associate public subnets with the public route table.
6. Create a NAT Gateway in one public subnet.
7. Create a private route table with 0.0.0.0/0 → NAT GW.
8. Launch an EC2 in a public subnet and verify internet access.
9. Launch an EC2 in a private subnet and verify no public IP.
10. Verify the private EC2 can reach the internet via NAT GW.

### Intermediate (10 Tasks)
1. Build a full VPC with Terraform (public/private/database tiers).
2. Add VPC S3 Gateway Endpoint and verify no NAT GW for S3.
3. Add Security Group rules for ALB → App → DB chain.
4. Enable VPC Flow Logs to CloudWatch for network audit.
5. Create a Bastion host in public subnet; SSH into private EC2.
6. Replace Bastion with SSM Session Manager (no public IP needed).
7. Set up VPC Peering between dev and staging VPCs.
8. Add Interface Endpoints for ECR + Secrets Manager.
9. Configure NACLs to block specific IP ranges.
10. Set up Private Hosted Zone in Route 53 for internal DNS.

### Advanced (10 Tasks)
1. Design and implement a multi-region VPC architecture.
2. Set up Transit Gateway for hub-and-spoke multi-VPC connectivity.
3. Implement AWS Network Firewall for deep packet inspection.
4. Set up VPN connection to on-premises network.
5. Configure AWS Direct Connect (conceptual architecture).
6. Implement PrivateLink to expose a service to another AWS account.
7. Build VPC modules in Terraform with variable CIDR blocks.
8. Set up IPv6 dual-stack VPC.
9. Implement network segmentation with dedicated subnets per service.
10. Analyze VPC Flow Logs with Athena for security investigation.

---

## Self Assessment
1. What is a VPC?
2. What is an Internet Gateway?
3. What is a NAT Gateway?
4. What is the difference between public and private subnets?
5. What is a Route Table?
6. What is a Security Group?
7. What is a NACL?
8. What is the difference between SG and NACL?
9. What is a VPC Endpoint?
10. What are Gateway Endpoints vs. Interface Endpoints?

---

## Cheat Sheet

```bash
# VPC CLI commands
aws ec2 describe-vpcs
aws ec2 describe-subnets --filters "Name=vpc-id,Values=vpc-12345"
aws ec2 describe-route-tables --filters "Name=vpc-id,Values=vpc-12345"
aws ec2 describe-security-groups --filters "Name=vpc-id,Values=vpc-12345"
aws ec2 describe-internet-gateways
aws ec2 describe-nat-gateways

# VPC Flow Logs
aws ec2 create-flow-logs \
  --resource-type VPC \
  --resource-ids vpc-12345 \
  --traffic-type ALL \
  --log-destination-type cloud-watch-logs \
  --log-group-name /vpc/flowlogs \
  --deliver-logs-permission-arn arn:aws:iam::123:role/FlowLogsRole
```

```
VPC CIDR Design:
  /16 → 65,536 IPs (recommended for VPC)
  /24 → 256 IPs    (typical subnet)
  /28 → 16 IPs     (small subnet, endpoints)

AWS reserves 5 IPs per subnet:
  x.x.x.0   Network address
  x.x.x.1   VPC router
  x.x.x.2   DNS resolver
  x.x.x.3   Reserved by AWS
  x.x.x.255 Broadcast

Cost:
  VPC:           Free
  Subnets:       Free
  IGW:           Free
  Route Table:   Free
  NAT Gateway:   $0.045/hr + $0.045/GB
  Interface VPC Endpoint: $0.01/hr/AZ + $0.01/GB
  VPC Peering Data Transfer: $0.01/GB (same region)
```
