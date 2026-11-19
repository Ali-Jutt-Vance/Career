# Phase 6 — Chapter 2: IAM (Identity and Access Management)

---

## Chapter Overview

AWS IAM controls who (identity) can do what (access) to which resources. It is the first line of defense for every AWS account. Every API call, every CLI command, every SDK call goes through IAM authorization.

**Topics:**
- IAM Users, Groups, Roles, Policies
- Policy types and evaluation logic
- Least privilege principle
- IAM Roles for services (EC2, Lambda, ECS)
- Permission boundaries
- AWS Organizations and SCPs
- Cross-account access

---

## Beginner Theory

### IAM Core Concepts

```
Principal:   Who is making the request
             - IAM User:    long-term credentials (access key + secret)
             - IAM Role:    assumed temporarily (no long-term credentials)
             - AWS Service: Lambda, EC2, ECS assume roles
             - Federated:   SSO/SAML/OIDC identity providers

Policy:      JSON document defining permissions
             - Effect: Allow | Deny
             - Action: s3:GetObject, ec2:StartInstances, * (all)
             - Resource: ARN of the resource(s)
             - Condition: optional constraints

Group:       Collection of IAM users — attach policies to the group
             A user in a group inherits all group policies
             Users can belong to multiple groups

Role:        Identity with policies, assumed by services or users
             Has no long-term credentials — generates temporary credentials
             Common: EC2 instance profile, Lambda execution role, cross-account

Policy evaluation logic (in order):
  1. Explicit Deny wins over everything (never override a Deny)
  2. SCP (org-level) must Allow
  3. Permission boundary must Allow
  4. Identity policy must Allow
  5. Resource policy (if exists) must Allow (for cross-account)
  Default: Deny (deny everything not explicitly allowed)
```

---

## Basic Examples

### IAM Policy JSON

```json
// Least privilege policy: read-only access to a specific S3 bucket
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowS3ReadAccess",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:ListBucket",
        "s3:GetObjectAcl"
      ],
      "Resource": [
        "arn:aws:s3:::my-app-bucket",
        "arn:aws:s3:::my-app-bucket/*"
      ]
    }
  ]
}

// EC2 full access for a specific region (condition)
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "ec2:*",
      "Resource": "*",
      "Condition": {
        "StringEquals": {
          "aws:RequestedRegion": "us-east-1"
        }
      }
    }
  ]
}

// Deny if MFA not present (force MFA for IAM actions)
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DenyWithoutMFA",
      "Effect": "Deny",
      "NotAction": [
        "iam:CreateVirtualMFADevice",
        "iam:EnableMFADevice",
        "iam:GetUser",
        "iam:ListMFADevices",
        "iam:ListVirtualMFADevices",
        "iam:ResyncMFADevice",
        "sts:GetSessionToken"
      ],
      "Resource": "*",
      "Condition": {
        "BoolIfExists": {
          "aws:MultiFactorAuthPresent": "false"
        }
      }
    }
  ]
}
```

### IAM Role for EC2 (Terraform)

```hcl
# IAM Role for EC2 — allows EC2 to assume this role
resource "aws_iam_role" "ec2_role" {
  name = "myapp-ec2-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

# Policy: allow EC2 to read from S3 and write to CloudWatch Logs
resource "aws_iam_role_policy" "ec2_policy" {
  name = "myapp-ec2-policy"
  role = aws_iam_role.ec2_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["s3:GetObject", "s3:ListBucket"]
        Resource = [
          "arn:aws:s3:::${var.app_bucket}",
          "arn:aws:s3:::${var.app_bucket}/*"
        ]
      },
      {
        Effect   = "Allow"
        Action   = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      },
      {
        Effect   = "Allow"
        Action   = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = "arn:aws:secretsmanager:us-east-1:${data.aws_caller_identity.current.account_id}:secret:myapp/*"
      }
    ]
  })
}

# Instance profile — wraps the role for EC2 use
resource "aws_iam_instance_profile" "ec2_profile" {
  name = "myapp-ec2-profile"
  role = aws_iam_role.ec2_role.name
}

# Attach to EC2 instance
resource "aws_instance" "app" {
  ami                  = data.aws_ami.amazon_linux_2.id
  instance_type        = "t3.micro"
  iam_instance_profile = aws_iam_instance_profile.ec2_profile.name
  # ...
}
```

---

## Intermediate Concepts

### IAM Role for Lambda

```hcl
# Lambda execution role
resource "aws_iam_role" "lambda_role" {
  name = "myapp-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

# Basic Lambda execution + VPC access + specific services
resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda_role.name
  # AWS managed: logs:CreateLogGroup, logs:CreateLogStream, logs:PutLogEvents
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy_attachment" "lambda_vpc" {
  role       = aws_iam_role.lambda_role.name
  # VPC: ec2:CreateNetworkInterface, ec2:DescribeNetworkInterfaces, ec2:DeleteNetworkInterface
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}

# Custom policy: DynamoDB + SES + Secrets
resource "aws_iam_role_policy" "lambda_custom" {
  name = "lambda-custom-permissions"
  role = aws_iam_role.lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:Query", "dynamodb:UpdateItem"]
        Resource = aws_dynamodb_table.main.arn
      },
      {
        Effect   = "Allow"
        Action   = ["ses:SendEmail", "ses:SendRawEmail"]
        Resource = "*"
        Condition = {
          StringEquals = { "ses:FromAddress" = "noreply@myapp.com" }
        }
      }
    ]
  })
}
```

### OIDC Role for GitHub Actions (No Long-Term Keys)

```hcl
# GitHub Actions OIDC provider
resource "aws_iam_openid_connect_provider" "github" {
  url = "https://token.actions.githubusercontent.com"

  client_id_list = ["sts.amazonaws.com"]

  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1"]
}

# Role that GitHub Actions can assume
resource "aws_iam_role" "github_actions" {
  name = "github-actions-deploy-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Federated = aws_iam_openid_connect_provider.github.arn
      }
      Action = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = {
          "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
        }
        StringLike = {
          # Only allow from specific repo and branch
          "token.actions.githubusercontent.com:sub" = "repo:myorg/myrepo:ref:refs/heads/main"
        }
      }
    }]
  })
}

resource "aws_iam_role_policy" "github_actions" {
  name = "github-actions-deploy"
  role = aws_iam_role.github_actions.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ecr:GetAuthorizationToken",
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:PutImage",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload"
        ]
        Resource = "*"
      },
      {
        Effect   = "Allow"
        Action   = ["ecs:UpdateService", "ecs:DescribeServices"]
        Resource = aws_ecs_service.main.id
      }
    ]
  })
}

# In GitHub Actions workflow:
# - uses: aws-actions/configure-aws-credentials@v4
#   with:
#     role-to-assume: arn:aws:iam::123456789:role/github-actions-deploy-role
#     aws-region: us-east-1
```

### Permission Boundaries

A permission boundary is a second policy attached to a role or user that caps the MAXIMUM permissions it can ever have — even if someone later attaches a much more permissive policy to it. It solves a specific delegation problem: you want a team lead to be able to create IAM roles for their own team's Lambda functions, but you don't want them to be able to accidentally (or deliberately) create a role with admin access.

```hcl
# The boundary itself — defines the ceiling, not the actual grant
resource "aws_iam_policy" "developer_boundary" {
  name = "developer-permission-boundary"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["lambda:*", "logs:*", "dynamodb:*", "s3:GetObject", "s3:PutObject"]
        Resource = "*"
      },
      {
        # Explicitly block the dangerous stuff no matter what identity policy says
        Effect   = "Deny"
        Action   = ["iam:*", "organizations:*", "ec2:TerminateInstances"]
        Resource = "*"
      }
    ]
  })
}

# A developer can create THIS role (a Lambda execution role, say) themselves...
resource "aws_iam_role" "team_lambda_role" {
  name                 = "team-a-lambda-role"
  assume_role_policy    = data.aws_iam_policy_document.lambda_trust.json
  permissions_boundary = aws_iam_policy.developer_boundary.arn
}

# ...even if they (mistakenly or maliciously) attach AdministratorAccess to it,
# the boundary caps the EFFECTIVE permissions to the intersection of the
# attached policy AND the boundary — so admin access never actually applies.
```

The key mental model: the boundary and the identity policy are ANDed together. Actual effective permissions = (what the identity policy grants) ∩ (what the boundary allows). Neither one alone determines access.

### Cross-Account Access

Larger organizations split workloads across multiple AWS accounts (one per environment, or one per team) for blast-radius isolation — but engineers still need a controlled way to reach into another account, e.g., a read-only view from a "tooling" account into "production."

```hcl
# In the PRODUCTION account: a role that trusts the DEV/tooling account
resource "aws_iam_role" "cross_account_readonly" {
  name = "dev-account-readonly-access"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { AWS = "arn:aws:iam::111111111111:root" }  # the DEV account ID
      Action    = "sts:AssumeRole"
      Condition = {
        StringEquals = { "sts:ExternalId" = "shared-secret-known-to-both-accounts" }
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "cross_account_readonly" {
  role       = aws_iam_role.cross_account_readonly.name
  policy_arn = "arn:aws:iam::aws:policy/ReadOnlyAccess"
}
```

```bash
# From the DEV account, an engineer assumes the role in PRODUCTION
aws sts assume-role \
  --role-arn arn:aws:iam::222222222222:role/dev-account-readonly-access \
  --role-session-name alice-debugging-prod \
  --external-id shared-secret-known-to-both-accounts

# The response contains temporary credentials (AccessKeyId, SecretAccessKey,
# SessionToken) scoped to READ-ONLY access in production, expiring in 1 hour.
# Every assumption is logged in CloudTrail in the production account,
# including WHO in the dev account did it.
```

The `ExternalId` condition exists specifically to prevent the "confused deputy" problem — where a third party who is legitimately given the role ARN could otherwise trick another account into assuming a role on their behalf.

---

## Interview Preparation

**Q1: What is the difference between an IAM User and an IAM Role?**
A: IAM User: a permanent identity with long-term credentials (password for console, access key + secret key for programmatic access). Tied to a person or application. Long-term credentials are a security risk — they never expire and if leaked, are valid until rotated. IAM Role: a set of permissions that can be assumed by any principal — EC2 instance, Lambda, another AWS account, SAML/OIDC federated identity. Roles use temporary credentials (STS tokens: 15 minutes to 12 hours). No long-term credentials. Best practice: never use long-term credentials for applications — use instance profiles for EC2, execution roles for Lambda, task roles for ECS, OIDC roles for GitHub Actions.

**Q2: How does IAM policy evaluation work when there are multiple policies?**
A: Evaluation order (all must pass for access to be granted): 1) SCPs (Service Control Policies from AWS Organizations) — a SCP must explicitly Allow the action, otherwise denied. 2) Permission boundaries — if set on a role, restrict what policies can grant. 3) Identity-based policies — the user/role's own policies must Allow. 4) Resource-based policies — if the resource has a policy (S3 bucket policy, KMS key policy), it must allow. The absolute rule: an explicit Deny anywhere wins. There is no "override a Deny." So if a SCP denies an action, no identity policy can grant it.

**Q3: What is the principle of least privilege and how do you implement it?**
A: Least privilege: grant only the minimum permissions needed to perform the specific task — nothing more. Implementation: 1) Start with deny-all, add only what's needed. 2) Use `Resource` ARNs instead of `"*"` wherever possible. 3) Use conditions to restrict by region, IP, MFA, time of day. 4) Separate roles per function (Lambda for email vs. Lambda for database). 5) Use IAM Access Analyzer to find unused permissions. 6) Review with IAM Access Advisor (shows last-used dates for services). 7) Rotate and audit access keys. 8) Enable CloudTrail to audit all API calls. 9) Use permission boundaries for delegated admin scenarios.

---

## Practical Tasks

### Beginner (10 Tasks)
1. Create an IAM user with console access and MFA.
2. Create an IAM group `Developers` and attach `ReadOnlyAccess`.
3. Add the user to the group and verify access.
4. Create an IAM role for EC2 with S3 read access.
5. Launch an EC2 instance with the role and verify it can access S3 without hardcoded credentials.
6. Write a least-privilege policy for reading a specific S3 bucket.
7. Use `aws iam list-attached-user-policies` to audit a user.
8. Create a role that denies all actions outside us-east-1.
9. Set up MFA enforcement with a Deny-without-MFA policy.
10. Use IAM Access Advisor to find unused permissions on a user.

### Intermediate (10 Tasks)
1. Create an IAM role for Lambda with DynamoDB read + CloudWatch Logs write.
2. Set up a GitHub Actions OIDC role (no access keys).
3. Create a cross-account role for a dev account to access prod read-only.
4. Set up permission boundaries to restrict what delegated admins can grant.
5. Use IAM Access Analyzer to identify external access to S3 buckets.
6. Create an IAM policy using conditions (MFA, IP range, region).
7. Enable CloudTrail and query API calls for a specific user.
8. Implement resource-level permissions for EC2 (allow start/stop only tagged instances).
9. Use `aws iam simulate-principal-policy` to test a policy.
10. Set up AWS Organizations with SCP denying deletion of CloudTrail.

### Advanced (10 Tasks)
1. Design IAM strategy for 3-account setup: management, staging, production.
2. Implement AWS SSO with permission sets mapped to groups.
3. Build a custom IAM policy generator tool using AWS SDK.
4. Implement attribute-based access control (ABAC) using tags.
5. Audit all IAM roles/users with unused permissions (Access Advisor).
6. Set up AWS Config rule checking for root account usage.
7. Implement just-in-time access with automated role assumption workflow.
8. Create Terraform modules for standardized IAM roles.
9. Build a CI/CD pipeline role with minimal EC2 deploy permissions.
10. Implement emergency break-glass role with strict audit trail.

---

## Self Assessment
1. What is an IAM User?
2. What is an IAM Role?
3. What is an IAM Policy?
4. What is an IAM Group?
5. What is the principle of least privilege?
6. What is an IAM Instance Profile?
7. What is STS (Security Token Service)?
8. What is the policy evaluation order?
9. What is a resource-based policy?
10. What is a permission boundary?

---

## Cheat Sheet

```json
// Policy structure
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect":    "Allow",               // Allow | Deny
    "Action":    ["s3:GetObject"],      // service:action or "*"
    "Resource":  ["arn:aws:s3:::bucket/*"],  // ARN or "*"
    "Condition": {}                     // optional constraints
  }]
}
```

```bash
# IAM CLI commands
aws iam create-user --user-name alice
aws iam create-group --group-name Developers
aws iam add-user-to-group --user-name alice --group-name Developers
aws iam attach-group-policy --group-name Developers --policy-arn arn:aws:iam::aws:policy/ReadOnlyAccess
aws iam list-attached-user-policies --user-name alice
aws iam simulate-principal-policy --policy-source-arn arn:aws:iam::123:user/alice --action-names s3:GetObject --resource-arns arn:aws:s3:::mybucket/file.txt

# Create role with trust policy
aws iam create-role --role-name MyRole --assume-role-policy-document file://trust-policy.json
aws iam put-role-policy --role-name MyRole --policy-name MyPolicy --policy-document file://policy.json

# Assume role (get temp credentials)
aws sts assume-role --role-arn arn:aws:iam::123:role/MyRole --role-session-name session1
```

```
Key ARN formats:
  arn:aws:iam::ACCOUNT:user/USERNAME
  arn:aws:iam::ACCOUNT:role/ROLENAME
  arn:aws:iam::ACCOUNT:group/GROUPNAME
  arn:aws:iam::aws:policy/MANAGED_POLICY_NAME   ← AWS managed
  arn:aws:s3:::BUCKETNAME                        ← no region/account for S3
  arn:aws:ec2:REGION:ACCOUNT:instance/i-1234567
```
