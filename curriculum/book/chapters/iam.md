# IAM: Who Can Do What

> [!GOALS]
> - Explain what IAM controls: **authentication** (who you are) and **authorisation** (what you may do) for every AWS request.
> - Know the identities — **users**, **groups**, **roles** — and why **roles with temporary credentials** are the default.
> - Read and write **policies**: effect, action, resource, condition.
> - Understand how AWS **evaluates** a request: explicit deny, allow, implicit deny — and the other policy types that limit permissions.
> - Give applications, pipelines and people **least-privilege** access, and debug "access denied" errors.

## Why this matters

Every action in AWS is an API call: launching a server, reading a file from S3, deleting a database, sending a message to a queue. **Identity and Access Management (IAM)** decides, for every single call, whether it is allowed. It is the front door, the keys and the locks of your whole cloud.

Most serious cloud breaches are IAM failures: an access key committed to a public repository, an application role allowed to do `*` on everything, a developer account without multi-factor authentication. Attackers scan GitHub for leaked keys constantly, and a working key can be used within minutes. On the other side, permissions that are too strict break applications at 3 a.m. with "AccessDenied" errors.

As a back-end engineer you will give your services the permissions they need, set up pipelines that deploy with temporary credentials ({{ch:github-actions}}), and debug access errors. Understanding IAM is the most important security skill on AWS.

## The simple idea

Think of a hotel. At reception, you prove who you are with a passport (**authentication**). You get a key card that opens your room, the gym and the pool — but not other guests' rooms or the manager's office (**authorisation**). The card stops working when you check out (**temporary credentials**). Staff have different cards for different jobs: cleaners open guest rooms during the day, the night manager opens the safe.

IAM is that system for AWS: it checks who is making each request and whether their "card" opens that particular door.

> [!ANALOGY]
> IAM is like a hotel's key-card system: reception checks who you are, and your card opens only the doors your role needs, for as long as your stay lasts.
>
> **Where the analogy breaks:** a hotel has a few hundred doors. AWS has thousands of actions on millions of resources, and a single line like `"Action": "*"` gives a card that opens every door in every building, including the one that demolishes the hotel. And if someone copies a permanent card (a long-lived access key), it keeps working from anywhere in the world until someone notices.

## The proper definition and key words

**AWS IAM** is the service that manages identities and their permissions. Each request is **authenticated** (signed with credentials belonging to a **principal**) and **authorised** by evaluating the applicable **policies**: JSON documents that allow or deny **actions** on **resources** under optional **conditions**.

Key words:

- **Principal** — the identity making a request: a user, a role session, an AWS service.
- **IAM user** — a long-lived identity with a password and/or access keys. Rarely the right choice today.
- **IAM group** — a set of users sharing policies.
- **IAM role** — an identity with permissions but no permanent credentials; trusted principals **assume** it and receive temporary credentials.
- **Temporary credentials** — an access key, secret key and session token that expire (minutes to hours), issued by AWS STS.
- **Policy** — a JSON document of statements with `Effect`, `Action`, `Resource` and optional `Condition`.
- **Identity-based policy** — attached to a user, group or role: what that identity may do.
- **Resource-based policy** — attached to a resource (S3 bucket, SQS queue, KMS key): who may use it.
- **Trust policy** — the resource-based policy of a role: who may assume it.
- **Least privilege** — granting only the permissions needed for the task.
- **Permissions boundary / SCP** — guardrails limiting the maximum permissions of a role or a whole account.

## Identities

### Level 1 — Users, groups and roles

- **The root user** can do everything; protect it with MFA and do not use it ({{ch:aws-overview}}).
- **People** should sign in through **IAM Identity Center** (single sign-on with the company's identity provider). They choose an account and a **permission set**, and receive temporary role credentials. When they leave the company, disabling them in one place removes all access.
- **IAM users with access keys** are long-lived secrets. Avoid them; where something truly needs one (an old tool outside AWS), restrict it tightly and rotate its keys.
- **Applications on AWS** use **roles**: an EC2 instance profile ({{ch:ec2}}), an ECS task role ({{ch:ecs}}), a Lambda execution role ({{ch:lambda}}), a Kubernetes service account mapped to a role ({{ch:eks}}). The AWS SDK finds the role's temporary credentials automatically — there is no key in the code or configuration at all.
- **Pipelines** assume roles through **OIDC federation**: GitHub Actions presents a signed token, and the role's trust policy accepts only tokens for a specific repository and branch ({{ch:github-actions}}).

### Level 2 — How roles work

A role has two policies:

```json
// trust policy: WHO may assume the role — here, ECS tasks
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "Service": "ecs-tasks.amazonaws.com" },
    "Action": "sts:AssumeRole"
  }]
}
```

```json
// permissions policy: WHAT the role may do once assumed
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "ReadWriteUploads",
    "Effect": "Allow",
    "Action": ["s3:GetObject", "s3:PutObject"],
    "Resource": "arn:aws:s3:::cornershop-uploads/*"
  }]
}
```

When the ECS task starts, AWS assumes the role on its behalf and makes temporary credentials available inside the container; the SDK refreshes them before they expire. A stolen copy of those credentials stops working within hours, and they never appear in your repository.

## Policies and evaluation

### Level 2 — Reading a policy statement

- **`Effect`**: `Allow` or `Deny`.
- **`Action`**: API operations, written `service:Operation` — `s3:GetObject`, `sqs:SendMessage`. Wildcards are allowed (`s3:Get*`), and `*` means every action in every service.
- **`Resource`**: ARNs the statement applies to. `arn:aws:s3:::cornershop-uploads/*` means every object in that bucket — note the bucket itself (`arn:aws:s3:::cornershop-uploads`) is a different resource, needed for actions like `s3:ListBucket`.
- **`Condition`** (optional): extra requirements — MFA present, request from a certain network or VPC endpoint, a tag value, encryption required, a time window.

### Level 3 — How AWS decides

For requests within one account, the rule is short:

1. Everything starts **denied** (implicit deny).
2. If any applicable policy has an explicit **Deny** that matches, the answer is **deny** — nothing can override it.
3. Otherwise, if any applicable policy has a matching **Allow**, the answer is **allow**.
4. Otherwise, it stays **denied**.

This model implements that logic for identity policies:

```ts
// A simplified model of how IAM evaluates identity policies:
// explicit Deny wins, then any Allow, otherwise the default is an implicit deny.
type Statement = {
  Sid: string;
  Effect: "Allow" | "Deny";
  Action: string[];
  Resource: string[];
  Condition?: { Bool?: Record<string, "true" | "false">; StringEquals?: Record<string, string> };
};
type Request = { action: string; resource: string; context: Record<string, string> };

const matches = (pattern: string, value: string) =>
  new RegExp("^" + pattern.split("*").map((p) => p.replace(/[.+?^${}()|[\]\\]/g, "\\$&")).join(".*") + "$").test(value);

function conditionHolds(st: Statement, ctx: Record<string, string>): boolean {
  for (const [key, want] of Object.entries(st.Condition?.Bool ?? {})) if ((ctx[key] ?? "false") !== want) return false;
  for (const [key, want] of Object.entries(st.Condition?.StringEquals ?? {})) if (ctx[key] !== want) return false;
  return true;
}

function evaluate(policy: Statement[], req: Request): string {
  const applies = (st: Statement) =>
    st.Action.some((a) => matches(a, req.action)) && st.Resource.some((r) => matches(r, req.resource)) && conditionHolds(st, req.context);
  const deny = policy.find((st) => st.Effect === "Deny" && applies(st));
  if (deny) return `DENY (explicit, ${deny.Sid})`;
  const allow = policy.find((st) => st.Effect === "Allow" && applies(st));
  if (allow) return `ALLOW (${allow.Sid})`;
  return "DENY (implicit: nothing allows it)";
}

// The policy attached to the shop API's role
const apiPolicy: Statement[] = [
  { Sid: "ReadWriteUploads", Effect: "Allow", Action: ["s3:GetObject", "s3:PutObject"], Resource: ["arn:aws:s3:::cornershop-uploads/*"] },
  { Sid: "SendOrderEvents", Effect: "Allow", Action: ["sqs:SendMessage"], Resource: ["arn:aws:sqs:eu-west-2:111122223333:orders"] },
  { Sid: "ReadDbSecret", Effect: "Allow", Action: ["secretsmanager:GetSecretValue"], Resource: ["arn:aws:secretsmanager:eu-west-2:111122223333:secret:shop/db-*"] },
  { Sid: "NeverDeleteInvoices", Effect: "Deny", Action: ["s3:DeleteObject*"], Resource: ["arn:aws:s3:::cornershop-uploads/invoices/*"] },
];

const requests: Request[] = [
  { action: "s3:PutObject", resource: "arn:aws:s3:::cornershop-uploads/products/42.jpg", context: {} },
  { action: "s3:DeleteObject", resource: "arn:aws:s3:::cornershop-uploads/invoices/2026-11.pdf", context: {} },
  { action: "s3:GetObject", resource: "arn:aws:s3:::cornershop-backups/db.dump", context: {} },
  { action: "secretsmanager:GetSecretValue", resource: "arn:aws:secretsmanager:eu-west-2:111122223333:secret:shop/db-AbC123", context: {} },
  { action: "sqs:DeleteQueue", resource: "arn:aws:sqs:eu-west-2:111122223333:orders", context: {} },
];
for (const r of requests) console.log(`${r.action.padEnd(30)} ${r.resource.split(":").pop()!.padEnd(42)} -> ${evaluate(apiPolicy, r)}`);

// A human admin policy that requires MFA for anything dangerous
const adminPolicy: Statement[] = [
  { Sid: "AdminAccess", Effect: "Allow", Action: ["*"], Resource: ["*"] },
  { Sid: "DenyTerminateWithoutMfa", Effect: "Deny", Action: ["ec2:TerminateInstances", "rds:Delete*"], Resource: ["*"],
    Condition: { Bool: { "aws:MultiFactorAuthPresent": "false" } } },
];
const del: Omit<Request, "context"> = { action: "rds:DeleteDBInstance", resource: "arn:aws:rds:eu-west-2:111122223333:db:shop-db" };
console.log(`admin without MFA deletes database -> ${evaluate(adminPolicy, { ...del, context: {} })}`);
console.log(`admin with MFA deletes database    -> ${evaluate(adminPolicy, { ...del, context: { "aws:MultiFactorAuthPresent": "true" } })}`);
```

**Output:**

```text
s3:PutObject                   cornershop-uploads/products/42.jpg         -> ALLOW (ReadWriteUploads)
s3:DeleteObject                cornershop-uploads/invoices/2026-11.pdf    -> DENY (explicit, NeverDeleteInvoices)
s3:GetObject                   cornershop-backups/db.dump                 -> DENY (implicit: nothing allows it)
secretsmanager:GetSecretValue  shop/db-AbC123                             -> ALLOW (ReadDbSecret)
sqs:DeleteQueue                orders                                     -> DENY (implicit: nothing allows it)
admin without MFA deletes database -> DENY (explicit, DenyTerminateWithoutMfa)
admin with MFA deletes database    -> ALLOW (AdminAccess)
```

- The API role can upload product images, but **cannot** delete invoices — the explicit deny wins even though nothing else mentioned deletion.
- Reading from the backups bucket and deleting the queue are denied **implicitly**: no statement allows them. You do not need to list everything that is forbidden; least privilege comes from allowing only what is needed.
- The wildcard in `shop/db-*` matters for Secrets Manager, which adds a random six-character suffix to secret ARNs.
- The admin policy allows everything but **denies destructive actions without MFA** — a common guardrail. (In real policies, use `BoolIfExists` for this condition, so requests without the MFA key at all — for example, made with long-lived access keys — are also treated as "no MFA", as the model does.)
- Real evaluation includes more policy types, below; the IAM Policy Simulator and IAM Access Analyzer evaluate real policies for you.

### Level 3 — The other policy types

Several layers can limit what an identity may do. A request is allowed only if **every** applicable layer allows it:

```text
 Organization SCP (max for the account) ─┐
 Permissions boundary (max for the role) ┼──► all must allow, and no explicit deny anywhere
 Identity policy (what the role may do)  ┤
 Session policy (optional, per session)  ┘
 + resource-based policy (bucket, queue, key) — and for cross-account access, both sides must allow
```

- **Service control policies (SCPs)** in AWS Organizations set the maximum for whole accounts: "nobody in any account may disable CloudTrail", "only these regions may be used". They grant nothing on their own.
- **Permissions boundaries** set the maximum for a role — useful when developers may create roles for their services but must not create roles more powerful than a limit.
- **Resource-based policies** on buckets, queues, topics and KMS keys say who may use the resource. For access from **another account**, both the identity policy in the caller's account and the resource policy (or role trust policy) in the target account must allow it.

## Least privilege in practice

### Level 3 — Building good policies

- **Start from the actions the code really calls.** An API that uploads and downloads files needs `s3:GetObject` and `s3:PutObject` on one bucket prefix — not `s3:*` on `*`.
- **Scope resources** to specific ARNs and prefixes.
- **Separate roles per service** (and per environment), so one compromised service cannot reach another's data.
- **Use conditions** for extra safety: require TLS (`aws:SecureTransport`), restrict to your VPC endpoint, require tags (attribute-based access control, ABAC).
- **Refine with data**: IAM Access Analyzer can generate policies from CloudTrail activity and lists unused permissions and roles; "last accessed" information shows services a role never uses.
- **AWS managed policies** like `AdministratorAccess` or `AmazonS3FullAccess` are convenient but broad. Fine for learning; too broad for production services.

### Level 4 — Credentials hygiene

- **No long-lived keys in code, images, environment files or CI secrets.** Roles for workloads, SSO for people, OIDC for pipelines.
- **If a key leaks**: deactivate it immediately, check CloudTrail for what it did, rotate anything it could read, then delete it. AWS and GitHub scan for leaked keys and may notify you — do not rely on it.
- **MFA** for every human, especially for privileged actions.
- **Break-glass access**: an emergency role with strong controls and alerts for when SSO is down.
- **Monitor**: alert on root user use, IAM changes, policy changes, and access denied spikes (CloudTrail and CloudWatch, {{ch:cloudwatch}}).

### Level 4 — Using roles from TypeScript

The AWS SDK reads credentials from the **default provider chain**: environment variables, SSO profiles on a developer's machine, the container or instance role in AWS. The same code works everywhere without credentials in it:

```ts
// fragment
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({ region: "eu-west-2" });      // no keys here: the role provides them

await s3.send(new PutObjectCommand({
  Bucket: "cornershop-uploads",
  Key: `products/${productId}.jpg`,
  Body: image,
  ContentType: "image/jpeg",
}));
```

If the role lacks `s3:PutObject` on that key, the call throws an `AccessDenied` error naming the action and the role — which is exactly where debugging starts.

## From beginner to enterprise

**Level 1–2 — first permissions.** Root MFA; SSO for people; roles for EC2, ECS and Lambda; reading policies; understanding explicit and implicit deny.

**Level 3 — least privilege.** One role per service and environment; scoped actions and resources; resource policies for buckets and queues; conditions; Access Analyzer findings.

**Level 4 — production hygiene.** No long-lived keys; OIDC for CI; MFA guardrails; alerts on IAM changes and root use; leaked-key procedures; regular reviews of unused access.

**Level 5 — senior practice.** Designing permission models for teams (permission sets, boundaries); attribute-based access control with tags; cross-account access patterns; reviewing IAM changes in infrastructure code.

**Level 6 — enterprises.** Multi-account landing zones with SCP guardrails; central identity with Identity Center; automated policy validation in pipelines; periodic access certification for audits.

## Real-world use cases

### The leaked key

- **What happened**: a developer committed an access key with administrator rights to a public repository. Within an hour, someone launched hundreds of large instances in several regions to mine cryptocurrency.
- **Lessons**: no long-lived admin keys at all; SCPs limiting allowed regions; budget alerts; secret scanning in CI ({{ch:cicd}}); a practised response procedure.

### Many services, one account

- **Practice**: each service has its own task role with access only to its own bucket prefix, queue and secrets. When a dependency in one service was compromised, the attacker's credentials could read only that service's data, and CloudTrail showed exactly what had been accessed.

## Common mistakes

### Beginner: `"Action": "*"`, `"Resource": "*"` for applications

**Consequence:** one bug or compromise exposes everything. **Fix:** specific actions on specific resources.

### Beginner: access keys in code or `.env` files

**Consequence:** leaks. **Fix:** roles and the default credential chain.

### Beginner: shared users

**Consequence:** no accountability, no clean offboarding. **Fix:** one identity per person through SSO.

### Intermediate: forgetting bucket versus object ARNs

**Consequence:** `ListBucket` denied while `GetObject` works. **Fix:** grant bucket-level actions on the bucket ARN, object actions on `bucket/*`.

### Intermediate: one role for every service

**Consequence:** large blast radius. **Fix:** a role per service and environment.

### Production: no MFA or guardrails for destructive actions

**Fix:** MFA conditions, SCPs and deletion protection on critical resources.

### Production: unused permissions never removed

**Fix:** regular reviews with Access Analyzer and last-accessed data.

## Debugging and troubleshooting

- **Start with "who am I?"**: `aws sts get-caller-identity` shows the account and role actually making requests — often not the one you expected.
- **Read the error**: modern AccessDenied messages name the action, the resource and often which policy type denied it (identity policy, SCP, boundary, resource policy).
- **Check every layer**: identity policy, resource policy (bucket policy, key policy), permissions boundary, SCP, session policy — and for encrypted data, the **KMS key policy** too.
- **Simulate**: the IAM Policy Simulator tests a principal's policies against an action and resource.
- **CloudTrail**: find the denied event to see the exact action, resource and principal.
- **Cross-account**: both sides must allow; check the trust policy of the role being assumed.

## Security summary

- **Root**: MFA, no keys, rarely used.
- **People**: SSO, MFA, permission sets with least privilege, one identity each.
- **Workloads**: roles with temporary credentials; never long-lived keys.
- **Pipelines**: OIDC federation scoped to repository, branch and environment.
- **Policies**: specific actions, scoped resources, conditions, explicit denies for dangerous actions.
- **Guardrails**: SCPs and permissions boundaries; CloudTrail and alerts on IAM changes.
- **Review**: remove unused access regularly; have a leaked-credential procedure.

## How a senior engineer thinks about this

- **Identity is the perimeter.** In the cloud, permissions matter more than networks.
- **No long-lived secrets.** Temporary credentials everywhere; there is nothing to leak.
- **Small blast radius.** One role per service, separate accounts per environment.
- **Guardrails, not gates.** SCPs and boundaries let teams move fast inside safe limits.
- **Permissions are code.** Reviewed in pull requests and validated automatically.

## Exercises

### Exercise 1 — Write a least-privilege policy

**Objective:** practise writing policies.
**What to do:** a worker reads messages from the `emails` SQS queue (receive and delete), reads the secret `shop/smtp` and writes logs to CloudWatch Logs in the log group `/shop/email-worker`. Write its permissions policy (account `111122223333`, region `eu-west-2`).

<details>
<summary>Show the solution</summary>

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ConsumeEmails",
      "Effect": "Allow",
      "Action": ["sqs:ReceiveMessage", "sqs:DeleteMessage", "sqs:GetQueueAttributes", "sqs:ChangeMessageVisibility"],
      "Resource": "arn:aws:sqs:eu-west-2:111122223333:emails"
    },
    {
      "Sid": "ReadSmtpSecret",
      "Effect": "Allow",
      "Action": "secretsmanager:GetSecretValue",
      "Resource": "arn:aws:secretsmanager:eu-west-2:111122223333:secret:shop/smtp-*"
    },
    {
      "Sid": "WriteLogs",
      "Effect": "Allow",
      "Action": ["logs:CreateLogStream", "logs:PutLogEvents"],
      "Resource": "arn:aws:logs:eu-west-2:111122223333:log-group:/shop/email-worker:*"
    }
  ]
}
```

Plus a trust policy allowing only the worker's compute service (for example `ecs-tasks.amazonaws.com`) to assume the role. If the secret uses a customer-managed KMS key, the role also needs `kms:Decrypt` on that key.

</details>

### Exercise 2 — Explain the decision

**Objective:** practise policy evaluation.
**What to do:** a role's identity policy allows `s3:*` on `arn:aws:s3:::reports/*`. The account's SCP denies `s3:DeleteObject` everywhere. The bucket policy allows nothing extra. Is `s3:DeleteObject` on `reports/2026.csv` allowed? Is `s3:GetObject` allowed? Is `s3:ListBucket` on `reports` allowed?

<details>
<summary>Show the solution</summary>

- **DeleteObject**: **denied** — the SCP's explicit deny overrides the identity policy's allow.
- **GetObject**: **allowed** — the identity policy allows it, the SCP does not deny it (assuming the SCP otherwise allows S3), and same-account access does not require a bucket-policy allow.
- **ListBucket**: **denied** — `reports/*` covers objects, not the bucket itself; listing needs `s3:ListBucket` on `arn:aws:s3:::reports`.

</details>

### Exercise 3 — Production scenario: cleaning up access

**Objective:** practise IAM hardening.
**The scenario:** an account has 23 IAM users (some for people who left), 11 with active access keys older than a year, the production API runs with a role that has `AdministratorAccess`, and GitHub Actions deploys with an access key stored as a secret. Plan the clean-up.

<details>
<summary>Show the solution</summary>

1. **Inventory**: the IAM credential report shows users, key ages and last use; Access Analyzer shows unused roles and permissions.
2. **Remove departed users immediately**; deactivate unused keys, then delete them.
3. **Move people to IAM Identity Center** with permission sets and MFA; then remove their IAM users.
4. **Replace the API's admin role** with a least-privilege policy, generated from CloudTrail activity with Access Analyzer and reviewed; deploy and watch for AccessDenied errors in staging first.
5. **Replace the GitHub key with OIDC**: a deploy role trusting only the repository's `main` branch and production environment; delete the stored key.
6. **Add guardrails**: SCPs (protect CloudTrail, restrict regions), alerts on IAM changes and root use, scheduled access reviews.

</details>

## Summary

**IAM** authenticates and authorises every AWS API call. **Principals** — users, role sessions, services — sign requests with credentials, and **policies** decide what they may do. People should use **SSO** through IAM Identity Center with MFA; workloads use **roles** (instance profiles, task roles, execution roles) whose **temporary credentials** the SDK finds automatically; pipelines use **OIDC federation**. Long-lived access keys are the most common cause of cloud breaches and should be avoided.

A policy statement has an **Effect**, **Actions**, **Resources** and optional **Conditions**. Evaluation starts from **implicit deny**; any matching **explicit deny** wins; otherwise a matching **allow** permits the request. **Identity-based** policies say what an identity may do; **resource-based** policies (bucket, queue, key policies, role **trust policies**) say who may use a resource; **SCPs** and **permissions boundaries** cap the maximum; cross-account access needs both sides to allow.

**Least privilege** means specific actions on specific resources, one role per service and environment, conditions for extra safety, and regular removal of unused access with Access Analyzer. Debug access errors by checking the caller's identity, reading the error, checking every policy layer (including KMS key policies) and using CloudTrail and the policy simulator.

## Key terms

- **IAM** — AWS Identity and Access Management, which controls authentication and authorisation.
- **Authentication** — Proving who is making a request.
- **Authorisation** — Deciding whether a request is allowed.
- **Principal** — The identity making a request.
- **IAM user** — A long-lived identity with a password or access keys.
- **IAM group** — A collection of users that share policies.
- **IAM role** — An identity without permanent credentials that trusted principals assume.
- **Temporary credentials** — Expiring credentials issued for a role session.
- **AWS STS** — The Security Token Service that issues temporary credentials.
- **Policy** — A JSON document of statements allowing or denying actions on resources.
- **Statement** — One rule in a policy with effect, action, resource and condition.
- **Identity-based policy** — A policy attached to a user, group or role.
- **Resource-based policy** — A policy attached to a resource that specifies who may use it.
- **Trust policy** — A role's policy stating who may assume it.
- **Implicit deny** — The default refusal when nothing allows a request.
- **Explicit deny** — A Deny statement that overrides any allow.
- **Service control policy (SCP)** — An organisation policy that limits the maximum permissions in accounts.
- **Permissions boundary** — A limit on the maximum permissions an identity can have.
- **Least privilege** — Granting only the permissions required.
- **OIDC federation** — Assuming a role with an identity token from an external provider such as GitHub.
- **IAM Access Analyzer** — A tool that finds external access, unused access and generates policies from activity.

## What comes next

With identities and permissions in place, you can start running things. The next chapter, {{ch:ec2}}, introduces EC2 virtual servers: instance types, images, storage, security groups, key pairs and Session Manager access, instance roles and user data — the foundation that containers, load balancers and auto scaling build on.
