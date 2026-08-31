# Phase 6 — Chapter 16: Secrets Manager & Parameter Store

---

## Chapter Overview

AWS Secrets Manager and AWS Systems Manager Parameter Store are two services for managing application secrets (database passwords, API keys, connection strings). Secrets Manager provides automatic rotation; Parameter Store is simpler and has a free tier.

**Topics:**
- Secrets Manager: storing and retrieving secrets
- Automatic rotation with Lambda
- Secret versioning (AWSCURRENT, AWSPENDING, AWSPREVIOUS)
- Parameter Store: types (String, StringList, SecureString)
- SSM Parameter Store hierarchy
- Injecting secrets into ECS, Lambda, EC2
- Secrets Manager SDK in Node.js
- Cross-account secret access

---

## Beginner Theory

### Secrets Manager vs. Parameter Store

```
Secrets Manager:
  Purpose: Store and automatically rotate sensitive secrets
  Cost: $0.40/secret/month + $0.05 per 10,000 API calls
  Features: automatic rotation (Lambda), secret versioning, cross-account
  Integration: RDS (built-in rotation), Redshift, DocumentDB, custom
  Best for: database passwords, API keys that need rotation

Parameter Store:
  Purpose: Store configuration and secrets
  Cost: Standard parameters FREE, Advanced $0.05/10,000 API calls
        SecureString (encrypted) Standard: FREE
        SecureString Advanced: $0.05/advanced param/month
  Features: hierarchical naming (/app/prod/db-url), no auto-rotation
  Integration: SSM, EC2 user data, CloudFormation, ECS
  Best for: app configuration, feature flags, non-rotating secrets

Hierarchy advice:
  Secrets Manager: credentials that MUST rotate (DB passwords, access keys)
  Parameter Store: configuration values, ARNs, feature flags, API endpoints
  Both: use IAM least-privilege to restrict access per environment
```

---

## Basic Examples

### Secrets Manager in Node.js

```typescript
import { SecretsManagerClient, GetSecretValueCommand, CreateSecretCommand } from "@aws-sdk/client-secrets-manager";

const client = new SecretsManagerClient({ region: process.env.AWS_REGION });

// Cache secrets to avoid repeated API calls (cold start vs. warm)
const secretCache = new Map<string, { value: string; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;  // 5 minutes

export async function getSecret(secretId: string): Promise<string> {
  const cached = secretCache.get(secretId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const response = await client.send(new GetSecretValueCommand({
    SecretId:     secretId,
    VersionStage: "AWSCURRENT"  // always get the current version
  }));

  const value = response.SecretString!;
  secretCache.set(secretId, { value, expiresAt: Date.now() + CACHE_TTL_MS });
  return value;
}

// Get JSON secret (common pattern for DB credentials)
export async function getDbCredentials() {
  const raw = await getSecret("myapp/production/database");
  return JSON.parse(raw) as {
    host:     string;
    port:     number;
    dbname:   string;
    username: string;
    password: string;
  };
}

// Build connection string from secret
export async function getDatabaseUrl() {
  const creds = await getDbCredentials();
  return `postgresql://${creds.username}:${encodeURIComponent(creds.password)}@${creds.host}:${creds.port}/${creds.dbname}`;
}

// Create/update a secret (admin operations)
export async function storeSecret(name: string, value: string | object) {
  await client.send(new CreateSecretCommand({
    Name:         name,
    SecretString: typeof value === "string" ? value : JSON.stringify(value),
    Description:  `MyApp ${name}`,
    Tags: [
      { Key: "Environment", Value: process.env.NODE_ENV || "development" },
      { Key: "Application", Value: "myapp" }
    ]
  }));
}
```

### Secrets Manager with Terraform

```hcl
# Database credentials secret
resource "aws_secretsmanager_secret" "db" {
  name                    = "myapp/${var.environment}/database"
  description             = "MyApp PostgreSQL credentials"
  recovery_window_in_days = 7   # 7 day recovery window before permanent deletion
  kms_key_id              = aws_kms_key.secrets.arn  # customer-managed KMS key
}

resource "aws_secretsmanager_secret_version" "db" {
  secret_id = aws_secretsmanager_secret.db.id

  secret_string = jsonencode({
    host:     aws_db_instance.main.address
    port:     aws_db_instance.main.port
    dbname:   aws_db_instance.main.db_name
    username: aws_db_instance.main.username
    password: random_password.db.result
    engine:   "postgres"
  })
}

# Enable automatic rotation (every 30 days)
resource "aws_secretsmanager_secret_rotation" "db" {
  secret_id           = aws_secretsmanager_secret.db.id
  rotation_lambda_arn = aws_lambda_function.rotation.arn

  rotation_rules {
    automatically_after_days = 30
  }
}

# IAM: allow app to read only this secret
resource "aws_iam_role_policy" "read_secret" {
  name = "read-db-secret"
  role = aws_iam_role.app.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["secretsmanager:GetSecretValue", "secretsmanager:DescribeSecret"]
      Resource = aws_secretsmanager_secret.db.arn
    }]
  })
}
```

### Parameter Store

```hcl
# SSM Parameter Store
resource "aws_ssm_parameter" "db_url" {
  name        = "/myapp/production/database-url"
  type        = "SecureString"     # encrypted with KMS
  value       = "postgresql://..."
  description = "Database connection URL"
  tier        = "Standard"         # or Advanced (> 4KB)
}

resource "aws_ssm_parameter" "stripe_key" {
  name  = "/myapp/production/stripe/secret-key"
  type  = "SecureString"
  value = var.stripe_secret_key
}

resource "aws_ssm_parameter" "feature_flags" {
  name  = "/myapp/production/features"
  type  = "String"   # not sensitive
  value = jsonencode({ new_checkout: true, dark_mode: false })
}
```

```typescript
// Parameter Store in Node.js
import { SSMClient, GetParameterCommand, GetParametersByPathCommand } from "@aws-sdk/client-ssm";

const ssm = new SSMClient({ region: process.env.AWS_REGION });

// Get single parameter
export async function getParameter(name: string): Promise<string> {
  const response = await ssm.send(new GetParameterCommand({
    Name:           name,
    WithDecryption: true   // decrypt SecureString
  }));
  return response.Parameter!.Value!;
}

// Get all parameters under a path hierarchy
export async function getParametersByPath(path: string) {
  const params: Record<string, string> = {};
  let nextToken: string | undefined;

  do {
    const response = await ssm.send(new GetParametersByPathCommand({
      Path:           path,
      WithDecryption: true,
      Recursive:      true,
      NextToken:      nextToken
    }));

    for (const param of response.Parameters ?? []) {
      // Extract last part of path as key: /myapp/prod/db-url → db-url
      const key = param.Name!.split("/").pop()!;
      params[key] = param.Value!;
    }

    nextToken = response.NextToken;
  } while (nextToken);

  return params;
}

// Usage: load all production config at startup
const config = await getParametersByPath("/myapp/production");
// config = { "database-url": "...", "redis-url": "...", "stripe-key": "..." }
```

---

## Interview Preparation

**Q1: What is secret rotation and why is it important?**
A: Rotation: automatically replacing a secret value on a schedule (e.g., generate new DB password every 30 days, update both the DB and the secret). Why important: limits the window of exposure if credentials are compromised. A static password leaked 2 years ago is still valid if never rotated. With rotation: leaked password expired within 30 days maximum. For compliance: PCI-DSS, SOC2, ISO27001 require periodic credential rotation. AWS Secrets Manager rotation: uses a Lambda function that: 1) generates a new password, 2) updates the database user's password, 3) tests the new credentials, 4) marks the new version as AWSCURRENT. The Lambda is triggered on the rotation schedule. AWS provides pre-built rotation functions for RDS, Redshift, DocumentDB.

**Q2: What is the difference between Secrets Manager and Parameter Store?**
A: Secrets Manager: built specifically for secrets. Has automatic rotation (critical differentiator), native RDS integration (rotation Lambda provided), cross-account secret sharing, secret versioning. $0.40/secret/month. Parameter Store: hierarchical configuration store. Up to 4 KB per parameter (Standard) or 8 KB (Advanced). Hierarchical naming (`/app/prod/db-url`) enables bulk loading per environment. Standard tier is free. No built-in rotation. Supports String, StringList, SecureString (KMS-encrypted). Choose: Secrets Manager for credentials that must rotate, Parameter Store for app configuration and non-rotating secrets. For a startup: Parameter Store first (free), add Secrets Manager when you need rotation compliance.

**Q3: How do you inject secrets into a running container without hardcoding them?**
A: Multiple approaches: 1) ECS task definition secrets: `"secrets": [{"name": "DB_PASSWORD", "valueFrom": "arn:aws:secretsmanager:..."}]` — ECS fetches the secret at container start and injects as environment variable. 2) Lambda: same pattern via `secrets` in function environment config. 3) App startup: app code fetches from Secrets Manager SDK on startup, stores in memory (no env var exposure). 4) EC2 user data: fetch from Secrets Manager via AWS CLI in the bootstrap script. 5) Kubernetes + External Secrets Operator: syncs Secrets Manager to Kubernetes Secrets. Never: put secrets in Docker images, environment variables in Terraform state file, or source code. Always: restrict IAM access (app can only read its own secrets).

---

## Practical Tasks

### Beginner (10 Tasks)
1. Store an API key in Secrets Manager via console.
2. Retrieve the secret with the AWS CLI.
3. Add a random_password resource in Terraform.
4. Store database credentials as a JSON secret.
5. Retrieve the secret in a Node.js script.
6. Add caching to avoid repeated API calls.
7. Create a SecureString parameter in Parameter Store.
8. Read the parameter from CLI (`aws ssm get-parameter --with-decryption`).
9. Inject a secret as an environment variable in Lambda.
10. Use hierarchical naming: `/myapp/production/db-url`.

### Intermediate (10 Tasks)
1. Create Secrets Manager secret with Terraform.
2. Inject secrets into ECS task definition.
3. Inject secrets into Lambda via secrets config.
4. Retrieve all parameters by path in Node.js.
5. Set up IAM policy granting access to specific secret only.
6. Enable automatic rotation for RDS password with Secrets Manager.
7. Set a recovery window and test deletion + recovery.
8. Tag all secrets by environment for cost attribution.
9. Encrypt secrets with customer-managed KMS key.
10. Set up CloudTrail alert on secret access from unusual source.

### Advanced (10 Tasks)
1. Build custom rotation Lambda for third-party API key rotation.
2. Implement cross-account secret sharing with resource policies.
3. Build a secret synchronization tool (Secrets Manager → Kubernetes Secrets).
4. Implement audit logging for all secret access.
5. Set up secrets expiration alerting (warn before rotation).
6. Build a secrets scanning tool in CI/CD to detect hardcoded secrets.
7. Implement environment-specific secrets isolation via separate AWS accounts.
8. Build Terraform module for standardized secret lifecycle.
9. Implement secret rotation with zero-downtime (multi-user rotation).
10. Set up AWS Config rule to detect unencrypted secrets.

---

## Self Assessment
1. What is Secrets Manager?
2. What is Parameter Store?
3. What is the difference between the two?
4. What is secret rotation?
5. What are the three secret version stages?
6. What is AWSCURRENT?
7. What is a SecureString parameter?
8. What is the parameter hierarchy?
9. Why should you cache secrets?
10. How do you inject secrets into ECS containers?

---

## Cheat Sheet

```bash
# Secrets Manager
aws secretsmanager list-secrets
aws secretsmanager get-secret-value --secret-id myapp/production/database
aws secretsmanager create-secret --name myapp/prod/apikey --secret-string '{"key":"abc123"}'
aws secretsmanager update-secret --secret-id myapp/prod/apikey --secret-string '{"key":"new123"}'
aws secretsmanager rotate-secret --secret-id myapp/prod/database

# Parameter Store
aws ssm get-parameter --name /myapp/prod/db-url --with-decryption
aws ssm get-parameters-by-path --path /myapp/production/ --with-decryption --recursive
aws ssm put-parameter --name /myapp/prod/feature-flags --type SecureString --value '{"flag":true}'
aws ssm delete-parameter --name /myapp/prod/old-key
```

```typescript
// Quick patterns
// Cache secrets (Node.js)
const cache = new Map<string, string>();
async function secret(id: string) {
  if (!cache.has(id)) {
    const r = await sm.send(new GetSecretValueCommand({ SecretId: id }));
    cache.set(id, r.SecretString!);
  }
  return cache.get(id)!;
}

// Parse JSON secret
const creds = JSON.parse(await secret("myapp/db"));
const url = `postgresql://${creds.username}:${creds.password}@${creds.host}/${creds.dbname}`;
```

```
Version stages:
  AWSCURRENT:  Active version (what your app should use)
  AWSPENDING:  New version during rotation (being tested)
  AWSPREVIOUS: Last version (kept for rollback)
  Custom:      You can attach custom labels to any version

Secrets Manager pricing:
  $0.40 per secret per month
  $0.05 per 10,000 API calls
  RDS rotation lambda: included

Parameter Store pricing:
  Standard String/SecureString: FREE
  Advanced parameters: $0.05/parameter/month
  API calls: FREE (standard), $0.05/10,000 (advanced)
```
