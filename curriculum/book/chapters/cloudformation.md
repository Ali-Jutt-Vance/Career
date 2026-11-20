# CloudFormation

> [!GOALS]
> - Explain CloudFormation, AWS's own infrastructure-as-code service, and how it differs from Terraform.
> - Read and write templates: **parameters**, **resources**, **intrinsic functions**, **outputs**, conditions.
> - Work with **stacks**, **change sets**, rollbacks, **drift detection** and deletion policies.
> - Use the **AWS CDK** to define infrastructure in TypeScript, with reusable **constructs**, and understand what `cdk synth` produces.
> - Organise stacks across environments and accounts, and run them from pipelines safely.

## Why this matters

{{ch:terraform}} introduced infrastructure as code with a tool that works across many platforms. **AWS CloudFormation** is AWS's native IaC service: you describe resources in a **template**, and CloudFormation creates, updates and deletes them as one **stack**, rolling back automatically if something fails. It needs no state file to manage — AWS keeps the state — and every new AWS feature eventually appears in it.

You will meet CloudFormation constantly on AWS, even if your team writes Terraform: AWS SAM and the **AWS CDK** generate CloudFormation, many AWS solutions and partner products are delivered as CloudFormation templates, and AWS Control Tower and StackSets use it to configure whole organisations. The CDK in particular is popular with TypeScript teams, because infrastructure is written in the same language as the application, with types, loops, functions and reusable components.

## The simple idea

A CloudFormation template is a **parts list and assembly drawing** for a set of AWS resources. You hand it to AWS; AWS builds everything in the right order, and if any part fails to install, it takes the whole thing back to how it was. To change the building, you hand in an updated drawing, and AWS works out what to add, change or remove.

The CDK is a **drawing program** that produces those drawings from code: instead of drawing every bolt by hand, you call "add a queue with a dead-letter queue and an alarm", and it draws all the parts for you.

> [!ANALOGY]
> A CloudFormation template is like an assembly drawing handed to a builder who builds everything in order and undoes it all if any step fails; the CDK is software that produces the drawings from code.
>
> **Where the analogy breaks:** a builder notices that someone has knocked down a wall since last time. CloudFormation mostly trusts its own record of what it built. If someone changes resources by hand, the stack "drifts", and a later update can fail or quietly undo the manual change.

## The proper definition and key words

**AWS CloudFormation** provisions and manages AWS resources from declarative **templates** (JSON or YAML). A deployed template is a **stack**; CloudFormation tracks the stack's resources and updates them through **change sets**.

Key words:

- **Template** — the declarative description: `Parameters`, `Mappings`, `Conditions`, `Resources`, `Outputs`.
- **Stack** — a deployed instance of a template, managed as a unit.
- **Logical ID / physical ID** — the resource's name in the template / the real resource's identifier in AWS.
- **Intrinsic functions** — built-in functions such as `!Ref`, `!GetAtt`, `!Sub`, `!If`, `!ImportValue`.
- **Change set** — a preview of what an update will add, modify, replace or delete.
- **Rollback** — undoing a failed create or update automatically.
- **Drift** — differences between the stack's resources and the template.
- **DeletionPolicy / UpdateReplacePolicy** — what happens to a resource when it is removed or replaced (`Delete`, `Retain`, `Snapshot`).
- **Nested stack / StackSet** — a stack used inside another / one template deployed to many accounts and regions.
- **AWS CDK** — a framework that defines infrastructure in TypeScript (and other languages) and **synthesises** CloudFormation templates.
- **Construct** — a CDK building block, from one resource to whole architectures.

## Templates and stacks

### Level 1 — A template

```yaml
AWSTemplateFormatVersion: "2010-09-09"
Description: Corner Shop uploads bucket and email queue

Parameters:
  Environment:
    Type: String
    AllowedValues: [staging, production]

Conditions:
  IsProduction: !Equals [!Ref Environment, production]

Resources:
  UploadsBucket:
    Type: AWS::S3::Bucket
    DeletionPolicy: Retain
    UpdateReplacePolicy: Retain
    Properties:
      BucketName: !Sub "cornershop-${Environment}-uploads-${AWS::AccountId}"
      PublicAccessBlockConfiguration:
        BlockPublicAcls: true
        BlockPublicPolicy: true
        IgnorePublicAcls: true
        RestrictPublicBuckets: true
      VersioningConfiguration:
        Status: !If [IsProduction, Enabled, Suspended]

  EmailDlq:
    Type: AWS::SQS::Queue
    Properties:
      MessageRetentionPeriod: 1209600          # 14 days

  EmailQueue:
    Type: AWS::SQS::Queue
    Properties:
      VisibilityTimeout: 60
      RedrivePolicy:
        deadLetterTargetArn: !GetAtt EmailDlq.Arn
        maxReceiveCount: 5

Outputs:
  EmailQueueUrl:
    Value: !Ref EmailQueue
    Export:
      Name: !Sub "${AWS::StackName}-EmailQueueUrl"
```

- **Parameters** make one template work for several environments; **conditions** (`IsProduction`) switch properties on or off.
- **`!Ref`** returns a resource's main identifier (a queue's URL, a bucket's name); **`!GetAtt`** returns other attributes (the DLQ's ARN); **`!Sub`** builds strings with variables, including pseudo-parameters like `${AWS::AccountId}`.
- References create **dependencies**: CloudFormation creates the DLQ before the queue that points to it, and runs independent creations in parallel.
- **`DeletionPolicy: Retain`** keeps the bucket (and its data) even if it is removed from the template or the stack is deleted. Use it, or `Snapshot`, on everything holding data ({{ch:s3}}, {{ch:rds}}).
- **Outputs** expose values; **exports** let other stacks import them with `!ImportValue`.

### Level 2 — Deploying: change sets and rollbacks

```bash
# fragment
aws cloudformation deploy \
  --stack-name shop-production-storage \
  --template-file storage.yaml \
  --parameter-overrides Environment=production \
  --no-execute-changeset                         # create a change set to review first
aws cloudformation describe-change-set --stack-name shop-production-storage --change-set-name <name>
aws cloudformation execute-change-set --stack-name shop-production-storage --change-set-name <name>
```

- A **change set** lists each resource with its action (`Add`, `Modify`, `Remove`) and, for modifications, whether it requires **replacement** — the same danger as Terraform's `-/+` ({{ch:terraform}}). Renaming a bucket or changing a database's identifier replaces the resource. Read every `Remove` and `Replacement: True` before executing.
- If any resource fails during an update, CloudFormation **rolls back** the whole stack to the previous working state. Creation failures roll back (delete) what was created.
- **Stack policies** can forbid updates to critical resources; **termination protection** prevents deleting the stack itself.
- **Drift detection** compares real resources with the template and reports manual changes — fix them in the template or revert them.

## The AWS CDK

### Level 3 — Infrastructure in TypeScript

The CDK lets you write infrastructure as TypeScript classes. **Constructs** combine resources with good defaults, and `cdk synth` turns the app into CloudFormation templates. This app defines a reusable `WorkQueue` construct — a queue that always comes with a dead-letter queue and an alarm — and a stack using it; then it synthesises the template in-process and lists the resources:

```ts
import { App, Stack, Duration, RemovalPolicy, type StackProps } from "aws-cdk-lib";
import { Bucket, BlockPublicAccess, BucketEncryption } from "aws-cdk-lib/aws-s3";
import { Queue } from "aws-cdk-lib/aws-sqs";
import { Alarm, ComparisonOperator, TreatMissingData } from "aws-cdk-lib/aws-cloudwatch";
import { Construct } from "constructs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// A reusable construct: a work queue that always comes with a dead-letter queue and an alarm on it
class WorkQueue extends Construct {
  readonly queue: Queue;
  constructor(scope: Construct, id: string, props: { visibilityTimeout: Duration }) {
    super(scope, id);
    const dlq = new Queue(this, "Dlq", { retentionPeriod: Duration.days(14) });
    this.queue = new Queue(this, "Queue", {
      visibilityTimeout: props.visibilityTimeout,
      deadLetterQueue: { queue: dlq, maxReceiveCount: 5 },
    });
    new Alarm(this, "DlqNotEmpty", {
      metric: dlq.metricApproximateNumberOfMessagesVisible({ period: Duration.minutes(1) }),
      threshold: 0,
      comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
      evaluationPeriods: 1,
      treatMissingData: TreatMissingData.NOT_BREACHING,
    });
  }
}

class ShopStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps & { environment: "staging" | "production" }) {
    super(scope, id, props);
    new Bucket(this, "Uploads", {
      encryption: BucketEncryption.S3_MANAGED,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      versioned: props.environment === "production",
      removalPolicy: props.environment === "production" ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
    });
    new WorkQueue(this, "Emails", { visibilityTimeout: Duration.seconds(60) });
  }
}

const app = new App({ outdir: mkdtempSync(join(tmpdir(), "cdk-")) });
const stack = new ShopStack(app, "ShopProduction", { environment: "production" });
const assembly = app.synth();                                 // what `cdk synth` does: TypeScript -> CloudFormation
const template = assembly.getStackByName(stack.stackName).template as {
  Resources: Record<string, { Type: string; Properties?: Record<string, unknown>; DeletionPolicy?: string }>;
};

for (const [logicalId, r] of Object.entries(template.Resources)) {
  console.log(`${logicalId.padEnd(36)} ${r.Type}${r.DeletionPolicy ? `  (DeletionPolicy: ${r.DeletionPolicy})` : ""}`);
}
const queue = Object.values(template.Resources).find((r) => r.Type === "AWS::SQS::Queue" && r.Properties?.["RedrivePolicy"]);
console.log("main queue properties:", JSON.stringify(queue?.Properties));
```

**Output:**

```text
Uploads4F6EB0FD                      AWS::S3::Bucket  (DeletionPolicy: Retain)
UploadsPolicy148F8199                AWS::S3::BucketPolicy
EmailsDlqEDA5A7DF                    AWS::SQS::Queue  (DeletionPolicy: Delete)
EmailsQueueF3588977                  AWS::SQS::Queue  (DeletionPolicy: Delete)
EmailsDlqNotEmptyC43C99A1            AWS::CloudWatch::Alarm
main queue properties: {"RedrivePolicy":{"deadLetterTargetArn":{"Fn::GetAtt":["EmailsDlqEDA5A7DF","Arn"]},"maxReceiveCount":5},"VisibilityTimeout":60}
```

- A few lines of TypeScript produced **five** CloudFormation resources. `enforceSSL: true` generated a **bucket policy** denying non-TLS requests; `removalPolicy: RETAIN` became `DeletionPolicy: Retain` in production.
- The `WorkQueue` construct **encodes a team standard**: nobody can create a work queue without a DLQ and an alarm on it ({{ch:sns-sqs}}). Constructs are shared as npm packages across teams.
- **Logical IDs** are derived from the construct path (`Emails` + `Dlq`) plus a hash, and they are **stable** — but renaming or moving a construct changes them, which CloudFormation sees as "delete the old resource, create a new one". For resources holding data, keep IDs stable or override them deliberately.
- The SQS queues got `DeletionPolicy: Delete` — the CDK's default for queues. Choose removal policies consciously for anything whose loss would hurt.
- The template references are real CloudFormation (`Fn::GetAtt`): the CDK is a generator; CloudFormation still does the deployment.

### Level 3 — The CDK workflow

```bash
# fragment
npx cdk bootstrap aws://111122223333/eu-west-2   # once per account and region: assets bucket and deploy roles
npx cdk synth                                    # generate templates into cdk.out/
npx cdk diff ShopProduction                      # compare with the deployed stack (like a change set)
npx cdk deploy ShopProduction                    # create a change set and execute it
```

- **Construct levels**: L1 (`CfnBucket`, one-to-one with CloudFormation), L2 (`Bucket`, with defaults and helper methods such as `bucket.grantRead(role)`, which writes least-privilege IAM policies for you) and L3 patterns (for example a load-balanced Fargate service in one construct).
- **Tests**: the `aws-cdk-lib/assertions` module checks templates in unit tests ("every queue has a redrive policy", "no bucket is public") — infrastructure checked like code ({{ch:testing}}).
- **cdk-nag** and similar tools check templates against security rules.
- Keep CDK apps **deterministic**: no network calls or random values during synthesis; context values are cached in `cdk.context.json`, which belongs in Git.

## Organising infrastructure

### Level 4 — Stacks, environments and accounts

- **Split stacks** by lifetime and blast radius: network, data stores, application services — so deploying an application cannot touch the VPC, and deployments stay fast.
- **Cross-stack references** (exports and imports) create hard dependencies: an exported value cannot change while imported. Prefer passing values through Parameter Store or CDK stack properties where you can ({{ch:systems-manager}}).
- **One stack per environment and account** (`ShopStaging` in the staging account, `ShopProduction` in production), built from the same code with different properties.
- **StackSets** deploy baseline templates (CloudTrail, budget alerts, security roles) to every account and region in an organisation.
- **Pipelines**: CDK Pipelines, or GitHub Actions running `cdk diff` on pull requests and `cdk deploy` on merge with an OIDC role; production deployments behind approvals ({{ch:github-actions}}).

### Level 4 — CloudFormation/CDK or Terraform?

| | CloudFormation / CDK | Terraform / OpenTofu |
|---|---|---|
| Scope | AWS (plus registry extensions) | Many clouds and SaaS providers |
| State | Managed by AWS | You manage state backends and locking |
| Language | YAML/JSON; CDK in TypeScript, Python, Java, Go… | HCL (CDK for Terraform exists) |
| Failure handling | Automatic stack rollback | Partial applies; you fix forward |
| New AWS features | Usually available quickly | Depends on provider releases (often fast) |

Both are good choices. Teams working only on AWS with TypeScript skills often prefer the CDK; teams managing several platforms often prefer Terraform. Mixing them is possible but needs clear ownership of each resource.

## From beginner to enterprise

**Level 1–2 — first stacks.** Reading templates; parameters, `!Ref`, `!GetAtt`, `!Sub`; outputs; change sets before updates; automatic rollbacks; retain policies for data.

**Level 3 — the CDK.** L2 constructs with secure defaults; `grant` methods for IAM; custom constructs encoding team standards; synth, diff and deploy; template assertions in tests.

**Level 4 — organised infrastructure.** Stacks split by layer; environments per account; pipelines with diffs on pull requests and approvals; drift detection; StackSets for organisation baselines.

**Level 5 — senior practice.** Designing construct libraries; managing refactors without replacing stateful resources; choosing between CDK and Terraform; reviewing change sets for blast radius.

**Level 6 — enterprises.** Landing zones built with Control Tower and StackSets, central construct libraries published internally, policy checks on every synthesised template.

## Real-world use cases

### A construct library for a platform team

- **Practice**: the platform team publishes `@cornershop/constructs` with `WorkQueue`, `ServiceDatabase` (encrypted, Multi-AZ, retained, alarms) and `ApiService` (Fargate, ALB, alarms, dashboards). Product teams compose stacks from them; a security fix in a construct reaches every service with a version bump.

### The renamed construct

- **What happened**: a developer tidied the CDK code, moving a database construct into a new parent. The diff showed the old database being **removed** and a new one **added** — a replacement of production data.
- **Fix**: the reviewer caught it in `cdk diff`; the logical ID was kept with `overrideLogicalId`, and the database had `RETAIN` and deletion protection as a second line of defence.

## Common mistakes

### Beginner: updating without a change set or diff

**Consequence:** surprise replacements. **Fix:** review change sets; never skip `cdk diff`.

### Beginner: no retain policies on data

**Consequence:** stack deletion or replacement deletes data. **Fix:** `Retain` or `Snapshot`, plus service-level deletion protection.

### Beginner: hard-coded names everywhere

**Consequence:** stacks cannot be deployed twice (names collide) and changes force replacement. **Fix:** let CloudFormation generate names where possible.

### Intermediate: manual changes to stack resources

**Consequence:** drift and failed updates. **Fix:** change through code; run drift detection.

### Intermediate: one giant stack

**Consequence:** slow, risky deployments and resource limits. **Fix:** split by layer.

### Intermediate: refactoring CDK code without checking logical IDs

**Consequence:** resources replaced. **Fix:** diff on every change; keep IDs stable for stateful resources.

### Production: secrets in templates or parameters

**Fix:** dynamic references to Secrets Manager or SSM SecureString (`{{resolve:secretsmanager:…}}`), or generate secrets in AWS ({{ch:secrets-manager}}).

## Debugging and troubleshooting

- **Stack update failed and rolled back**: the stack's **events** list the first failing resource and its reason — start there, not at the last event.
- **`UPDATE_ROLLBACK_FAILED`**: a resource could not be returned to its old state (often changed by hand); fix the resource or continue the rollback, skipping it carefully.
- **"Export cannot be updated as it is in use"**: another stack imports the value; remove the import first.
- **CDK deploy permissions errors**: the account was not bootstrapped, or the pipeline role cannot assume the CDK deploy roles.
- **Resource already exists**: a hard-coded name collides with an existing resource; import it into the stack or rename.
- **Drift**: run drift detection to see exactly which properties changed outside CloudFormation.

## Security summary

- **Least-privilege deployment roles**; pipelines with OIDC; humans do not deploy production from laptops.
- **Retain and protect** stateful resources; termination protection on important stacks.
- **No secrets** in templates or plain parameters; dynamic references instead.
- **Policy checks** on templates (cdk-nag, cfn-guard, Checkov) in CI.
- **Review** change sets and diffs for IAM changes and public exposure.

## How a senior engineer thinks about this

- **The diff is the review.** What will change matters more than what was edited.
- **Encode standards in constructs.** Make the secure, observable way the easiest way.
- **Protect data from your own code.** Retain policies, deletion protection and stable logical IDs.
- **Small stacks, clear ownership.** Layers and environments separated by blast radius.

## Exercises

### Exercise 1 — Read the template

**Objective:** practise template reading.
**What to do:** in the chapter's YAML template, what does each of these do: `!If [IsProduction, Enabled, Suspended]`, `!GetAtt EmailDlq.Arn`, `DeletionPolicy: Retain`, and the `Export` on the output?

<details>
<summary>Show the solution</summary>

- `!If` sets bucket versioning to `Enabled` in production and `Suspended` elsewhere, using the `IsProduction` condition.
- `!GetAtt EmailDlq.Arn` reads the DLQ's ARN for the main queue's redrive policy — creating a dependency, so the DLQ is created first.
- `DeletionPolicy: Retain` keeps the bucket and its data if the resource is removed from the template or the stack is deleted.
- `Export` publishes the queue URL under a stack-specific name that other stacks can import with `!ImportValue`.

</details>

### Exercise 2 — Write a construct

**Objective:** practise CDK constructs.
**What to do:** sketch a CDK construct `PrivateBucket` that always blocks public access, enforces TLS, encrypts with S3-managed keys, enables versioning, retains on delete, and exposes a method to grant read access to a role.

<details>
<summary>Show the solution</summary>

```ts
// fragment
import { RemovalPolicy } from "aws-cdk-lib";
import { Bucket, BlockPublicAccess, BucketEncryption } from "aws-cdk-lib/aws-s3";
import type { IGrantable } from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";

export class PrivateBucket extends Construct {
  readonly bucket: Bucket;
  constructor(scope: Construct, id: string) {
    super(scope, id);
    this.bucket = new Bucket(this, "Bucket", {
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      encryption: BucketEncryption.S3_MANAGED,
      versioned: true,
      removalPolicy: RemovalPolicy.RETAIN,
    });
  }
  grantRead(grantee: IGrantable) {
    return this.bucket.grantRead(grantee);        // writes a least-privilege IAM policy
  }
}
```

A unit test with `Template.fromStack(stack)` can assert that every bucket has a public access block and a TLS-only policy.

</details>

### Exercise 3 — Production scenario: the stuck stack

**Objective:** practise CloudFormation operations.
**The scenario:** a production stack update failed, the rollback also failed, and the stack is in `UPDATE_ROLLBACK_FAILED`. The events show the rollback could not modify a security group because someone had deleted a rule by hand. What do you do?

<details>
<summary>Show the solution</summary>

1. **Read the events** to identify the resource and the exact error.
2. **Fix the resource** so CloudFormation can complete the rollback — here, re-create the security group rule the template expects (or make the resource match the old template) — then choose **continue update rollback**.
3. If the resource cannot be fixed, **continue the rollback while skipping** that resource, knowing the stack will no longer match reality for it; then repair it through a follow-up update.
4. Afterwards: run **drift detection**, find out why someone changed the security group by hand, restrict manual changes with IAM, and review the original failed update with a change set before retrying.

</details>

## Summary

**CloudFormation** deploys **templates** — parameters, conditions, resources, outputs — as **stacks**, resolving dependencies from intrinsic functions such as `!Ref`, `!GetAtt` and `!Sub`, and **rolling back** automatically when an update fails. **Change sets** preview additions, modifications, **replacements** and removals and must be reviewed; **deletion and update-replace policies** protect data; **drift detection** finds manual changes; stack policies and termination protection add guardrails.

The **AWS CDK** defines infrastructure in TypeScript and **synthesises** CloudFormation: L2 constructs bring secure defaults and `grant` methods, custom **constructs** encode team standards (a queue always with a DLQ and alarm), and template assertions test infrastructure like code. Logical IDs come from construct paths, so refactors can replace resources — check every `cdk diff`. Organise stacks by layer and environment, separate accounts, deploy from pipelines with OIDC and approvals, use StackSets for organisation baselines, and choose between CDK and Terraform by the platforms you manage and the skills of your team.

## Key terms

- **AWS CloudFormation** — AWS's native infrastructure-as-code service.
- **Template** — A JSON or YAML description of resources for CloudFormation.
- **Stack** — A deployed template managed as one unit.
- **Logical ID** — A resource's name within a template.
- **Physical ID** — The identifier of the real resource in AWS.
- **Intrinsic function** — A built-in template function such as `!Ref` or `!GetAtt`.
- **Parameter** — An input value for a template.
- **Condition** — A template rule that includes or changes resources based on parameters.
- **Output / export** — A value a stack exposes / a value other stacks can import.
- **Change set** — A preview of the changes an update will make.
- **Rollback** — Automatically returning a stack to its previous state after a failure.
- **Drift** — Differences between deployed resources and the template.
- **DeletionPolicy** — What happens to a resource when it is deleted from the stack.
- **Nested stack** — A stack created as a resource inside another stack.
- **StackSet** — A template deployed to many accounts and regions.
- **AWS CDK** — A framework that defines infrastructure in programming languages and synthesises CloudFormation.
- **Construct** — A reusable CDK component.
- **Synthesis** — Generating CloudFormation templates from a CDK app.
- **Bootstrapping** — Preparing an account and region for CDK deployments.

## What comes next

Everything built in this part costs money every hour it runs. The next chapter, {{ch:cost-optimization}}, covers controlling cloud costs: understanding the bill, tagging and budgets, right-sizing, pricing models, storage and data transfer costs, and building cost awareness into engineering decisions.
