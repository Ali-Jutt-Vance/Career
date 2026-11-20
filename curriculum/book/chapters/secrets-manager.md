# Secrets Manager

> [!GOALS]
> - Explain what counts as a secret and why secrets must not live in code, images or plain configuration.
> - Store and retrieve secrets with **AWS Secrets Manager** and **Systems Manager Parameter Store**, and choose between them.
> - Control access with IAM and **KMS**, and audit every read.
> - Deliver secrets to EC2, ECS, Lambda, EKS and CI pipelines safely.
> - **Rotate** secrets automatically, and write applications that survive rotation.
> - Respond to a leaked secret.

## Why this matters

Every real system has secrets: database passwords, API keys for payment and email providers, signing keys for tokens ({{ch:jwt}}), OAuth client secrets ({{ch:oauth}}), webhook secrets, encryption keys. Leaked secrets are one of the most common causes of breaches: a password committed to Git, an API key in a Docker image layer, credentials printed in logs, a `.env` file copied to a public bucket. Attackers scan public repositories and images continuously, and a working key can be abused within minutes.

**AWS Secrets Manager** stores secrets encrypted, controls who may read them with IAM, records every access in CloudTrail, and can **rotate** them automatically. **Parameter Store** (part of Systems Manager) stores configuration and simpler secrets at lower cost. Together they let applications fetch secrets at runtime instead of carrying them around. This chapter builds on the configuration principles from {{ch:nodejs}} and the IAM foundations from {{ch:iam}}.

## The simple idea

Instead of giving every employee a copy of the office safe's combination written on paper, the company keeps the combination in a guarded room. Staff who are allowed to open the safe show their badge, the guard checks a list, writes the visit in a log book, and tells them the combination. Every few months the combination changes, and the guard always knows the current one.

Secrets Manager is the guarded room: applications prove who they are with their IAM role, the service checks permissions, records the access, and returns the current secret.

> [!ANALOGY]
> Secrets Manager is like a guarded room holding the safe's combination: allowed staff show their badge, every visit is logged, and the combination changes regularly.
>
> **Where the analogy breaks:** once an employee has read the combination, they know it until it changes. Once an application has read a secret, it holds it in memory — and could write it to a log, an error message or a crash dump. A secrets store protects secrets at rest and controls who reads them; it cannot stop careless code from leaking a secret after reading it.

## The proper definition and key words

A **secret** is any value that grants access or proves identity and must be known only to authorised parties. **AWS Secrets Manager** is a managed service that stores secrets encrypted with **KMS**, serves them to authorised principals through an API, versions them and rotates them with **rotation functions**. **Parameter Store** stores hierarchical configuration values, including encrypted **SecureString** parameters.

Key words:

- **Secret value** — the protected data, often a JSON object (`{"username": "...", "password": "..."}`).
- **Version and staging labels** — each value is a version; `AWSCURRENT` marks the active one, `AWSPENDING` a new one during rotation, `AWSPREVIOUS` the last one.
- **Rotation** — replacing a secret's value regularly, in the store and in the system that checks it.
- **KMS key** — the encryption key protecting a secret; its key policy is another access control.
- **Resource policy** — a policy on the secret itself, for example allowing another account.
- **SecureString** — an encrypted Parameter Store value.
- **Caching** — keeping a secret in memory for a while to avoid fetching it on every use.
- **Secret sprawl** — copies of secrets spread across files, chats, pipelines and machines.

## Storing and retrieving secrets

### Level 1 — Where secrets must not be

- **Not in code** or Git history (rewriting history does not help once it has been pushed — rotate).
- **Not in container images** or AMIs: anyone who can pull the image can read every layer ({{ch:docker}}).
- **Not in plain environment variables in task definitions, Lambda configuration or user data**, where anyone with read access to the configuration sees them.
- **Not in logs, error messages or analytics events** ({{ch:logging}}).
- **Not shared in chat or email.**

Secrets belong in a secrets store, fetched at runtime by an identity that is allowed to read them.

### Level 2 — Secrets Manager or Parameter Store?

| | Secrets Manager | Parameter Store |
|---|---|---|
| Purpose | Secrets, especially credentials that rotate | Configuration and simple secrets |
| Encryption | Always (KMS) | Optional per parameter (SecureString) |
| Rotation | Built in, with managed rotation for RDS and others | Not built in |
| Cross-account access | Resource policies | Limited (advanced tier sharing) |
| Size | Up to 64 KB | 4 KB standard, 8 KB advanced |
| Price | Per secret per month plus per 10,000 API calls | Standard parameters free; advanced and higher throughput paid |

A common split: database credentials, third-party API keys and signing keys in **Secrets Manager**; feature settings, URLs and non-secret configuration in **Parameter Store** (`/shop/production/api/log-level`).

### Level 2 — Reading a secret in TypeScript

```ts
// fragment
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";

const client = new SecretsManagerClient({ region: "eu-west-2" });   // credentials from the role

export async function getDatabaseSecret(): Promise<{ username: string; password: string; host: string }> {
  const res = await client.send(new GetSecretValueCommand({ SecretId: "shop/production/db" }));
  return JSON.parse(res.SecretString!);
}
```

- The application's **role** must allow `secretsmanager:GetSecretValue` on that secret (and `kms:Decrypt` on its key, if it is a customer-managed key) — nothing else ({{ch:iam}}).
- Every call is billed and logged; fetching on **every request** adds latency, cost and a dependency on the service. **Cache** secrets in memory and refresh them periodically.

### Level 3 — Delivering secrets to compute

- **ECS**: list secrets in the task definition's `secrets`; the **execution role** fetches them at task start and injects them as environment variables — visible to the process but not in the task definition ({{ch:ecs}}). New values require new tasks (a deployment), so for rotating secrets, fetch them in code instead.
- **Lambda**: fetch at initialisation and cache, or use the Parameters and Secrets extension, which caches locally ({{ch:lambda}}).
- **EKS**: the Secrets Store CSI driver or External Secrets Operator syncs Secrets Manager values into pods, using pod IAM roles ({{ch:eks}}).
- **EC2**: fetch at start-up or in code using the instance role — never in user data ({{ch:ec2}}).
- **CI/CD**: prefer **OIDC** roles that need no stored secret at all; where a secret is unavoidable, keep it in the CI secret store, scoped to protected environments ({{ch:github-actions}}).
- **Local development**: developers use their own SSO credentials to read development secrets, or local `.env` files with **development-only** values, never production ones.

## Rotation

### Level 3 — Why and how rotation works

Rotation limits how long a leaked secret is useful, and makes "change the password" a routine, tested operation instead of a frightening one. Secrets Manager rotates with a Lambda **rotation function** in four steps:

1. **createSecret** — generate a new value and store it as version `AWSPENDING`.
2. **setSecret** — set the new value in the target system (for example, change the database user's password).
3. **testSecret** — check that the new value works.
4. **finishSecret** — move the `AWSCURRENT` label to the new version (the old one becomes `AWSPREVIOUS`).

**Managed rotation** exists for RDS, Aurora, Redshift and DocumentDB — including RDS's option to manage the master password itself ({{ch:rds}}). Two strategies:

- **Single user**: the same user's password changes. Simple, but there is a brief moment where cached copies of the old password fail.
- **Alternating users**: two database users take turns; the new password goes to the inactive user, so the old credentials keep working until the next rotation. Smoother for applications, slightly more set-up.

### Level 3 — Applications that survive rotation

Applications cache secrets — so after a rotation, a cached old password may stop working. The usual answer: cache with a time limit, and on an **authentication failure**, refresh the secret once and retry:

```ts
// A secret cache that survives rotation. The "secret store" and "database" are small fakes so the
// sequence is visible; in production the fetch is GetSecretValue and the database is real.
let clock = 0;                                              // seconds, a fake clock
const store = { current: { username: "shop_app", password: "pw-v1" }, version: 1, fetches: 0 };
const database = { acceptedPasswords: new Set(["pw-v1"]) };

async function fetchSecret() { store.fetches++; return { ...store.current }; }

function createSecretCache(ttlSeconds: number) {
  let value: { username: string; password: string } | undefined;
  let fetchedAt = -Infinity;
  return {
    async get(force = false) {
      if (force || !value || clock - fetchedAt >= ttlSeconds) { value = await fetchSecret(); fetchedAt = clock; }
      return value;
    },
  };
}

const cache = createSecretCache(300);                      // refresh at most every 5 minutes

async function query(label: string) {
  for (let attempt = 1; attempt <= 2; attempt++) {
    const secret = await cache.get(attempt > 1);           // second attempt: bypass the cache
    if (database.acceptedPasswords.has(secret.password)) { console.log(`t=${clock}s ${label}: ok (password ${secret.password})`); return; }
    console.log(`t=${clock}s ${label}: authentication failed with ${secret.password}, refreshing the secret`);
  }
  console.log(`t=${clock}s ${label}: still failing, giving up`);
}

await query("request 1");
clock = 60; await query("request 2");                      // served from the cache: no fetch

// Single-user rotation: the new password is set in the database, made current, and the old one stops working.
clock = 120;
database.acceptedPasswords.add("pw-v2");                    // 1. createSecret/setSecret: database accepts the new one
store.current = { username: "shop_app", password: "pw-v2" }; store.version = 2;   // 2. finishSecret: new value is current
database.acceptedPasswords.delete("pw-v1");                 // 3. the old password no longer works
clock = 180; await query("request 3");                      // cached old password fails once, then refreshes
clock = 240; await query("request 4");
console.log(`secret fetched ${store.fetches} times for 4 requests`);
```

**Output:**

```text
t=0s request 1: ok (password pw-v1)
t=60s request 2: ok (password pw-v1)
t=180s request 3: authentication failed with pw-v1, refreshing the secret
t=180s request 3: ok (password pw-v2)
t=240s request 4: ok (password pw-v2)
secret fetched 2 times for 4 requests
```

- The cache served request 2 without a fetch — four requests needed only two fetches.
- After rotation, request 3 failed once with the cached old password, **forced a refresh** and succeeded with the new one. The user saw a slightly slower request, not an error.
- Retry **only on authentication errors**, and only once; repeated failures are a real problem to report.
- For database pools, the pool must use the new credentials for **new connections** (create connections with a function that reads the cached secret, or recreate the pool on authentication errors). With **alternating users** or **RDS Proxy** (which reads the secret itself), applications barely notice rotation.
- AWS provides caching clients for several languages; in Node.js, a small cache like this or the Lambda extension is common.

## Access control and auditing

### Level 4 — Least privilege, KMS and audit

- **Per-service secrets and permissions**: the API's role can read `shop/production/db` and `shop/production/stripe`, not the analytics service's secrets. Name secrets in a hierarchy (`team/env/service/name`) so policies can use prefixes.
- **Separate environments**: production secrets in the production account; developers have no read access to them by default ({{ch:aws-overview}}).
- **Customer-managed KMS keys** add a second control: even with `GetSecretValue`, a principal without `kms:Decrypt` on the key cannot read the value; key usage is logged too.
- **CloudTrail** records every `GetSecretValue`: who read which secret and when. Alert on unusual readers or volumes ({{ch:cloudwatch}}).
- **Resource policies** for cross-account access, and to deny access except through your VPC endpoints.
- **Deletion** is delayed (7–30 days recovery window), protecting against accidental loss.

### Level 4 — When a secret leaks

1. **Rotate or revoke immediately** — generate a new value and invalidate the old one at its source (the database, the payment provider's dashboard). Deleting the file or commit is not enough.
2. **Check usage**: CloudTrail for AWS credentials; the provider's logs for API keys; database logs for passwords.
3. **Assess impact**: what could the secret access, and was it used?
4. **Find the cause**: committed file, log line, image layer, shared screen — and fix the process (pre-commit secret scanning, CI scanning, log redaction) ({{ch:cicd}}).
5. Treat it as an incident, with a short write-up ({{ch:observability-and-incidents}}).

## From beginner to enterprise

**Level 1–2 — first steps.** Secrets out of code and images; `.env` files for development only and in `.gitignore`; secrets in Secrets Manager or Parameter Store; roles to read them.

**Level 3 — application integration.** Secrets injected by ECS or fetched and cached in code; least-privilege access per service; managed rotation for databases; applications that refresh on authentication failure.

**Level 4 — production governance.** Customer-managed KMS keys; CloudTrail alerts; separate accounts per environment; secret scanning in CI; leaked-secret runbooks.

**Level 5 — senior practice.** Removing secrets entirely where possible (IAM authentication, OIDC, managed identities); designing rotation for third-party keys; reviewing secret sprawl.

**Level 6 — enterprises.** Central secrets platforms (Secrets Manager or Vault) with policies as code, automated rotation programmes, and audits of every secret's owner and lifetime.

## Real-world use cases

### Database credentials that rotate themselves

- **Set-up**: RDS manages its master password in Secrets Manager with rotation; the application user's secret rotates every 30 days with the alternating-users strategy; the API reads through RDS Proxy, which picks up new credentials automatically.

### The key in the image

- **What happened**: a payment API key was copied into a Docker image during a build. A public image registry exposed it.
- **Response**: the key was revoked at the provider and a new one issued from Secrets Manager; builds now fetch nothing secret; image scanning includes secret detection.

## Common mistakes

### Beginner: secrets in Git

**Consequence:** permanent exposure through history and forks. **Fix:** secrets stores, `.gitignore`, pre-commit scanning — and rotation if it happens.

### Beginner: production secrets on laptops

**Fix:** development-only values locally; production access through roles and audit.

### Intermediate: secrets as plain environment variables in task or function configuration

**Fix:** `secrets` references or runtime fetching.

### Intermediate: fetching on every request

**Consequence:** latency, cost and throttling. **Fix:** caching with a time limit.

### Intermediate: one shared secret for many services

**Consequence:** one compromise exposes all; rotation needs everyone to change at once. **Fix:** per-service credentials.

### Production: rotation without application support

**Consequence:** outages after each rotation. **Fix:** refresh on authentication failure, alternating users, or RDS Proxy.

### Production: no response plan for leaks

**Fix:** a runbook: rotate, check usage, assess, fix the cause.

## Debugging and troubleshooting

- **AccessDenied on GetSecretValue**: the role's policy, the secret's resource policy, and the KMS key policy (`kms:Decrypt`).
- **ResourceNotFoundException**: wrong name, region or account.
- **ECS tasks fail to start with secret errors**: the execution role (not the task role) lacks permissions, or there is no network path to Secrets Manager (VPC endpoint or NAT).
- **Authentication failures after rotation**: cached old values — check the cache refresh logic; check the rotation function's logs for failed steps.
- **Rotation stuck**: the rotation Lambda cannot reach the database (VPC, security groups) or lacks permissions; check `AWSPENDING` versions.

## Security summary

- **Never in code, images, logs or plain configuration.**
- **Least-privilege reading** per service; separate accounts for production.
- **KMS** keys and key policies as a second control.
- **Audit** reads with CloudTrail and alert on anomalies.
- **Rotate** automatically and make applications tolerate it.
- **Prefer no secret at all**: IAM roles, OIDC and IAM database authentication.
- **Have a leak runbook** and practise it.

## How a senior engineer thinks about this

- **The best secret is no secret.** Use identities and short-lived credentials wherever possible.
- **Secrets have owners and lifetimes.** Every secret should be known, scoped and rotated.
- **Rotation is a feature to test.** If rotating is scary, it will not happen.
- **Assume leaks.** Detect them, limit their reach, and recover fast.

## Exercises

### Exercise 1 — Find the secrets

**Objective:** practise spotting secret sprawl.
**The project:** a `config.ts` with a hard-coded Stripe key; a Dockerfile with `ENV DATABASE_URL=postgres://admin:...@prod-db/shop`; a GitHub Actions workflow with AWS access keys in repository secrets; a Lambda with `JWT_SECRET` in its environment variables. Fix each.

<details>
<summary>Show the solution</summary>

- **Stripe key in code**: revoke and replace it; store it in Secrets Manager; the API fetches and caches it with its role.
- **Database URL in the Dockerfile**: rotate the password; remove it from the image; inject at runtime (ECS `secrets` or runtime fetch); use a per-application database user, not `admin`.
- **AWS keys in GitHub**: replace with OIDC and a deploy role; delete the keys.
- **JWT secret in Lambda environment**: move to Secrets Manager, fetched at initialisation and cached; plan rotation (support two keys during a changeover, for example by key ID) ({{ch:jwt}}).

</details>

### Exercise 2 — Design the access

**Objective:** practise least privilege for secrets.
**What to do:** three services — `api`, `worker`, `reports` — share one database, and the API also uses an email provider key. Design secrets and permissions.

<details>
<summary>Show the solution</summary>

- Three database users with only the privileges each needs (`reports` read-only); three secrets: `shop/production/db/api`, `.../db/worker`, `.../db/reports`.
- `shop/production/email/api-key` for the email provider.
- Each service's role may read only its own secrets (`api` reads its database secret and the email key).
- A customer-managed KMS key for production secrets with decrypt rights for those roles.
- Rotation for the database secrets (alternating users); the email key rotated through the provider's dashboard and updated in Secrets Manager on a schedule.

</details>

### Exercise 3 — Production scenario: the leaked password

**Objective:** practise incident response.
**The scenario:** a developer accidentally pasted a production database connection string, including the password, into a public GitHub issue an hour ago. What do you do?

<details>
<summary>Show the solution</summary>

1. **Rotate the password now** (Secrets Manager rotation or manually), ensuring applications pick up the new value (refresh on auth failure, or redeploy).
2. **Remove the issue content** — and remember it may already be copied.
3. **Check for misuse**: database logs for connections from unknown addresses during the last hour; is the database even reachable from the internet? (It should not be — private subnets — {{ch:vpc}}.)
4. **Assess** what the user could access; involve security and, if data was accessed, follow the data-breach process.
5. **Prevent recurrence**: developers should not have production connection strings at all; access through roles and audited tools; secret scanning alerts on GitHub.

</details>

## Summary

Secrets — passwords, API keys, signing keys — must never live in code, images, plain configuration, logs or chat. **Secrets Manager** stores them encrypted with **KMS**, serves them to principals allowed by IAM, versions them with staging labels and **rotates** them; **Parameter Store** holds configuration and simpler **SecureString** secrets at lower cost.

Applications fetch secrets with their role, **cache** them with a time limit, and receive them through ECS `secrets`, Lambda initialisation or extensions, EKS secret sync, or runtime calls on EC2; pipelines use OIDC instead of stored keys. **Rotation** runs create, set, test and finish steps (managed for RDS), with single-user or alternating-user strategies; applications survive it by refreshing on authentication failure, or by using RDS Proxy.

Control access per service and per environment, use customer-managed KMS keys as a second control, audit reads with CloudTrail, and prefer removing secrets entirely with identities and short-lived credentials. When a secret leaks, rotate first, then check usage, assess impact and fix the cause.

## Key terms

- **Secret** — A value that grants access or proves identity and must be protected.
- **AWS Secrets Manager** — AWS's service for storing, serving and rotating secrets.
- **Parameter Store** — Systems Manager's store for configuration values and SecureStrings.
- **SecureString** — An encrypted Parameter Store parameter.
- **KMS key** — An encryption key managed by AWS Key Management Service.
- **Key policy** — The resource policy controlling use of a KMS key.
- **Staging label** — A label such as AWSCURRENT that marks a secret version's role.
- **Rotation** — Regularly replacing a secret's value.
- **Rotation function** — A Lambda function that performs rotation steps.
- **Single-user rotation** — Changing the password of one user.
- **Alternating-users rotation** — Rotating between two users so old credentials keep working.
- **Secret caching** — Keeping a secret in memory to avoid repeated fetches.
- **Secret sprawl** — Uncontrolled copies of secrets across systems.
- **Secret scanning** — Automatically detecting secrets in code and images.

## What comes next

Secrets Manager is one part of a larger toolbox for operating AWS resources. The next chapter, {{ch:systems-manager}}, covers Systems Manager: Session Manager access without SSH, Run Command, Patch Manager, Parameter Store in depth, automation runbooks and inventory for fleets of machines.
