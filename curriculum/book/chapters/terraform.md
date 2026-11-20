# Terraform and Infrastructure as Code

> [!GOALS]
> - Explain **infrastructure as code** and why clicking in cloud consoles does not scale.
> - Understand Terraform's model: **providers**, **resources**, **data sources**, **variables**, **outputs** and **state**.
> - Use the core workflow — `init`, `fmt`, `validate`, `plan`, `apply` — and read a plan safely, especially **replacements**.
> - Store state remotely with locking, and organise code into **modules** and **environments**.
> - Run Terraform in CI/CD with reviews, and avoid the mistakes that destroy production resources.

## Why this matters

A real application needs infrastructure: a network, subnets, security groups, a database, a cache, a container service, a load balancer, DNS records, certificates, storage buckets and permissions. You can create all of that by clicking in the AWS console. The first time, that is fine. But then:

- Someone needs a **staging** environment that matches production. Nobody remembers every setting.
- A security group was "temporarily" opened to the whole internet months ago. Nobody knows who did it or why.
- A region goes down and you must rebuild everything elsewhere. From memory.
- An auditor asks who changed the database configuration and when.

**Infrastructure as code (IaC)** answers all of these the way software engineering answers similar questions about application code: the infrastructure is described in **files**, stored in **Git**, **reviewed** in pull requests, **applied by automation** and **repeatable** for every environment. **Terraform** (and its open-source fork **OpenTofu**, which uses the same language) is the most widely used IaC tool, working with AWS, Azure, Google Cloud, Cloudflare, GitHub, Datadog and hundreds of other platforms. You will meet it in most teams that run on a cloud ({{ch:aws-overview}}).

## The simple idea

Imagine giving an architect's drawing to a building company instead of phoning instructions each day. The drawing says what the finished house should look like: three bedrooms, two bathrooms, a blue door. The builders compare the drawing with what exists, then do whatever is needed to make reality match — build a wall, paint the door, remove a shed that is not in the drawing.

Terraform works the same way. You **describe the infrastructure you want** — not the steps to create it — and Terraform works out the differences and the actions needed to make the real world match the description.

> [!ANALOGY]
> Terraform is like handing builders an architect's drawing: you describe the finished result, and they compare it with what exists and do the work needed to match it.
>
> **Where the analogy breaks:** builders look at the actual house. Terraform mostly looks at its own **records** of what it built (the state file), refreshed from the cloud's APIs. If someone changes things by hand, or the records are lost, Terraform's view and reality can disagree — and some "small" changes to the drawing mean demolishing and rebuilding a room (a database!) rather than repainting it.

## The proper definition and key words

**Infrastructure as code** is managing infrastructure through machine-readable definition files that are versioned, reviewed and applied automatically. **Terraform** is a declarative IaC tool: configuration written in **HCL** (HashiCorp Configuration Language) declares resources; Terraform compares it with the recorded **state** and the real infrastructure, produces a **plan** of changes and **applies** it through **providers** that call each platform's API.

Key words:

- **Declarative** — describing the desired result, not the steps.
- **Provider** — a plugin that talks to one platform's API (`aws`, `cloudflare`, `github`).
- **Resource** — a piece of infrastructure Terraform manages (`aws_db_instance`, `aws_s3_bucket`).
- **Data source** — read-only information looked up from a platform (an existing VPC, the latest image ID).
- **Variable / output / local** — inputs to a configuration, values it exposes, and named intermediate expressions.
- **State** — Terraform's record mapping each resource in the configuration to a real object, with its attributes.
- **Backend** — where state is stored (local file, S3, Terraform Cloud).
- **State locking** — preventing two runs from changing the same state at once.
- **Plan / apply** — the computed list of changes / carrying them out.
- **Drift** — differences between real infrastructure and the configuration, usually from manual changes.
- **Module** — a reusable, parameterised group of resources.
- **Replacement (`-/+`)** — destroying and recreating a resource because an attribute cannot change in place.

## The language and the workflow

### Level 1 — A first configuration

```hcl
# versions.tf
terraform {
  required_version = ">= 1.9"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }
}

provider "aws" {
  region = var.region
  default_tags {
    tags = { project = "cornershop", environment = var.environment, managed_by = "terraform" }
  }
}

# variables.tf
variable "region" {
  type    = string
  default = "eu-west-2"
}

variable "environment" {
  type = string
  validation {
    condition     = contains(["staging", "production"], var.environment)
    error_message = "environment must be staging or production."
  }
}

# main.tf
resource "aws_s3_bucket" "uploads" {
  bucket = "cornershop-${var.environment}-uploads"
}

resource "aws_s3_bucket_public_access_block" "uploads" {
  bucket                  = aws_s3_bucket.uploads.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_versioning" "uploads" {
  bucket = aws_s3_bucket.uploads.id
  versioning_configuration {
    status = "Enabled"
  }
}

# outputs.tf
output "uploads_bucket" {
  value = aws_s3_bucket.uploads.bucket
}
```

Reading it:

- The **`terraform`** block pins Terraform's and the provider's versions. `~> 6.0` allows 6.x updates but not 7.0. A **lock file** (`.terraform.lock.hcl`, committed to Git) records the exact provider versions and checksums.
- The **`provider`** block configures the AWS provider; `default_tags` labels every resource, which helps cost reports and ownership ({{ch:cost-optimization}}). Credentials are **not** in the code — they come from the environment, a profile, or a CI role ({{ch:iam}}).
- **Variables** are the configuration's inputs, with types, defaults and validation.
- A **resource** block has a type (`aws_s3_bucket`) and a local name (`uploads`); its **address** is `aws_s3_bucket.uploads`.
- **References** like `aws_s3_bucket.uploads.id` connect resources. Terraform builds a **dependency graph** from them, so it creates the bucket before its access block and versioning, and runs independent operations in parallel. You rarely need explicit ordering (`depends_on`).
- The **output** exposes the bucket name for people, scripts or other configurations ({{ch:s3}}).

### Level 1 — The workflow

```bash
# fragment
terraform init                     # download providers, configure the backend
terraform fmt -recursive           # format the code
terraform validate                 # check syntax and types
terraform plan -var environment=staging -out=staging.tfplan   # compute and save the changes
terraform apply staging.tfplan     # apply exactly the saved plan
terraform output uploads_bucket    # read an output
```

- **`init`** prepares the working directory: providers, modules and the backend.
- **`plan`** refreshes what it knows about real resources, compares configuration with state, and shows what will happen. Nothing changes yet.
- **`apply`** with a saved plan file executes **exactly** what was reviewed — no surprises if something changed between plan and apply.
- **`destroy`** removes everything in the configuration — useful for temporary environments and dangerous anywhere else.

### Level 2 — How a plan is computed, and why replacements matter

A plan is a comparison. For each resource address, Terraform asks: is it in the configuration but not the state (create)? In the state but not the configuration (destroy)? In both with different attributes (update) — and can the provider change those attributes **in place**, or must it **replace** the object? Here is that logic in a simplified model:

```ts
// The heart of Terraform's "plan": compare what the configuration wants with what the state says exists.
type Attrs = Record<string, string | number | boolean>;
type Resource = { type: string; attrs: Attrs };
type Schema = Record<string, { forcesNew: string[] }>;   // which attributes cannot change in place

const schema: Schema = {
  aws_s3_bucket: { forcesNew: ["bucket"] },
  aws_db_instance: { forcesNew: ["engine", "identifier"] },
  aws_security_group: { forcesNew: ["name"] },
};

function plan(desired: Record<string, Resource>, state: Record<string, Resource>): string[] {
  const lines: string[] = [];
  const counts = { add: 0, change: 0, destroy: 0 };
  for (const [address, want] of Object.entries(desired)) {
    const have = state[address];
    if (!have) { lines.push(`  + ${address} will be created`); counts.add++; continue; }
    const changed = Object.keys({ ...want.attrs, ...have.attrs })
      .filter((k) => want.attrs[k] !== have.attrs[k]);
    if (changed.length === 0) continue;
    const replace = changed.filter((k) => schema[want.type]?.forcesNew.includes(k));
    const detail = changed.map((k) => `${k}: ${JSON.stringify(have.attrs[k])} -> ${JSON.stringify(want.attrs[k])}`).join(", ");
    if (replace.length > 0) {
      lines.push(`-/+ ${address} must be replaced (${replace.join(", ")} forces replacement): ${detail}`);
      counts.add++; counts.destroy++;
    } else {
      lines.push(`  ~ ${address} will be updated in-place: ${detail}`);
      counts.change++;
    }
  }
  for (const address of Object.keys(state)) {
    if (!(address in desired)) { lines.push(`  - ${address} will be destroyed`); counts.destroy++; }
  }
  lines.push(`Plan: ${counts.add} to add, ${counts.change} to change, ${counts.destroy} to destroy.`);
  return lines;
}

const state: Record<string, Resource> = {
  "aws_s3_bucket.uploads": { type: "aws_s3_bucket", attrs: { bucket: "cornershop-uploads", versioning: false } },
  "aws_db_instance.main": { type: "aws_db_instance", attrs: { identifier: "shop-db", engine: "postgres", instance_class: "db.t4g.small" } },
  "aws_security_group.old_admin": { type: "aws_security_group", attrs: { name: "old-admin", port: 22 } },
};

const desired: Record<string, Resource> = {
  "aws_s3_bucket.uploads": { type: "aws_s3_bucket", attrs: { bucket: "cornershop-uploads", versioning: true } },
  "aws_db_instance.main": { type: "aws_db_instance", attrs: { identifier: "shop-db", engine: "postgres", instance_class: "db.t4g.medium" } },
  "aws_s3_bucket.invoices": { type: "aws_s3_bucket", attrs: { bucket: "cornershop-invoices", versioning: true } },
};
console.log(plan(desired, state).join("\n"));

console.log("\n--- a one-word change to the database identifier:");
const risky = { ...desired, "aws_db_instance.main": { type: "aws_db_instance", attrs: { identifier: "shop-db-main", engine: "postgres", instance_class: "db.t4g.medium" } } };
console.log(plan(risky, state).filter((l) => l.includes("db_instance")).join("\n"));
```

**Output:**

```text
  ~ aws_s3_bucket.uploads will be updated in-place: versioning: false -> true
  ~ aws_db_instance.main will be updated in-place: instance_class: "db.t4g.small" -> "db.t4g.medium"
  + aws_s3_bucket.invoices will be created
  - aws_security_group.old_admin will be destroyed
Plan: 1 to add, 2 to change, 1 to destroy.

--- a one-word change to the database identifier:
-/+ aws_db_instance.main must be replaced (identifier forces replacement): identifier: "shop-db" -> "shop-db-main", instance_class: "db.t4g.small" -> "db.t4g.medium"
```

- The symbols are the same ones Terraform prints: **`+`** create, **`~`** update in place, **`-`** destroy, **`-/+`** destroy and recreate.
- Removing a block from the configuration **destroys** the real resource — the old security group here. Terraform does exactly what the configuration says.
- The second plan is the one that matters. Renaming the database's identifier looks harmless in the code, but the provider cannot rename it in place, so the plan says **replace**: delete the production database and create a new, empty one. Real plans mark these lines clearly ("forces replacement"). **Always read every `-` and `-/+` in a plan** before applying, and protect important resources:

```hcl
resource "aws_db_instance" "main" {
  identifier          = "shop-db"
  engine              = "postgres"
  instance_class      = "db.t4g.medium"
  deletion_protection = true            # the AWS API itself refuses to delete it
  skip_final_snapshot = false
  # ...

  lifecycle {
    prevent_destroy = true              # Terraform refuses any plan that would destroy it
  }
}
```

(The simplified model above keeps versioning as an attribute; in the real AWS provider it is the separate `aws_s3_bucket_versioning` resource shown earlier.)

## State

### Level 2 — What state is and why it matters

Terraform stores a **state file** mapping each address (`aws_db_instance.main`) to a real object ID (`shop-db`) and its attributes. Without it, Terraform would not know which real resources it manages. State has three properties that shape how teams work:

- It must be **shared**: everyone and every pipeline must use the same state, or they will try to create the same resources twice.
- It must be **locked** during changes: two simultaneous applies can corrupt it.
- It **contains secrets**: database passwords, generated keys and other sensitive attributes are stored in plain text inside it.

So production state never lives on a laptop or in Git. It goes in a **remote backend** with locking, encryption and restricted access:

```hcl
terraform {
  backend "s3" {
    bucket       = "cornershop-terraform-state"
    key          = "production/network/terraform.tfstate"
    region       = "eu-west-2"
    encrypt      = true
    use_lockfile = true                 # S3-native locking (older setups use a DynamoDB table)
  }
}
```

The state bucket itself has versioning (to recover an earlier state), encryption, blocked public access and tight IAM permissions ({{ch:s3}}).

### Level 3 — Drift, imports and refactoring

- **Drift**: someone changes a resource by hand. The next `plan` shows Terraform wanting to change it **back**. Either revert the manual change through Terraform, or update the code to match. Scheduled `plan` runs in CI detect drift early.
- **Importing existing resources**: an `import` block (`import { to = aws_s3_bucket.legacy  id = "old-bucket" }`) brings a manually created resource under management without recreating it; `terraform plan -generate-config-out=generated.tf` can write a starting configuration.
- **Refactoring without destroying**: renaming a resource's address in the code looks to Terraform like "destroy the old, create the new". A **`moved` block** (`moved { from = aws_s3_bucket.files  to = aws_s3_bucket.uploads }`) tells it the object simply has a new address.
- `terraform state` commands (`list`, `show`, `mv`, `rm`) exist for repairs; use them rarely and carefully, after backing up the state.

## Organising real configurations

### Level 3 — Modules

A **module** is a directory of Terraform files with variables as inputs and outputs as results. Every configuration is a module (the root module); it can call others:

```hcl
# modules/postgres/variables.tf (part of a reusable module)
variable "name"            { type = string }
variable "instance_class"  { type = string }
variable "subnet_ids"      { type = list(string) }
variable "allowed_sg_ids"  { type = list(string) }

# environments/production/main.tf
module "database" {
  source         = "../../modules/postgres"
  name           = "shop-production"
  instance_class = "db.r7g.large"
  subnet_ids     = module.network.private_subnet_ids
  allowed_sg_ids = [module.api.security_group_id]
}

module "network" {
  source  = "terraform-aws-modules/vpc/aws"     # a public module from the registry
  version = "~> 6.0"
  # ...
}
```

- Modules package **good defaults** — encryption on, backups configured, private subnets only — so every team creates databases the safe way ({{ch:rds}}).
- Pin module versions, from the public registry or your own Git tags.
- Avoid giant modules with dozens of options and tiny modules that wrap one resource; a module should represent a meaningful building block.

### Level 3 — Environments and splitting state

- **One directory per environment** (`environments/staging`, `environments/production`) calling the same modules with different variables is the clearest structure. Workspaces exist but make it easy to apply to the wrong environment.
- **Split state by lifetime and blast radius**: network, data stores and applications in separate configurations, so an application change cannot touch the network and plans stay fast. They share values through outputs (or data sources and parameter stores).
- **Separate cloud accounts** for production and non-production, so a mistake in staging cannot reach production at all ({{ch:aws-overview}}).

## Terraform in a team

### Level 4 — Plans in pull requests, applies by the pipeline

```text
 pull request changes environments/production/*.tf
        │
        ▼
 CI: fmt -check → validate → lint/security scan (tflint, Checkov/Trivy)
        → terraform plan → post the plan as a pull request comment
        │
        ▼  reviewers read the plan (especially every "-" and "-/+")
 merge to main
        │
        ▼
 CD: terraform apply of the reviewed plan, with a production approval,
     using short-lived OIDC credentials for a deploy role
```

- **Nobody applies from a laptop to production.** The pipeline does, with a role that only the pipeline can assume ({{ch:github-actions}}).
- **The plan is the review.** Reviewers check the plan output, not only the code — a small code change can produce a large plan.
- **Policy as code** (OPA/Conftest, Sentinel, Checkov rules) blocks plans that open databases to the internet, create unencrypted storage or miss required tags.
- **Small, frequent changes** — the same principle as {{ch:cicd}}.

### Level 4 — Secrets and Terraform

- Do not write secrets in `.tf` or `.tfvars` files in Git.
- Let services **generate** secrets (for example, RDS can manage the master password in AWS Secrets Manager) or read them through data sources at apply time ({{ch:secrets-manager}}).
- Mark outputs and variables `sensitive = true` to hide them in plan output — but remember they are still stored in state, which is why state needs encryption and strict access.

## From beginner to enterprise

**Level 1–2 — first configurations.** Providers, resources, variables, outputs; `init`, `plan`, `apply`; reading plan symbols; understanding state.

**Level 3 — real projects.** Remote state with locking and encryption; modules; one directory per environment; split states; `moved` and `import` blocks; drift detection.

**Level 4 — team practice.** Plans in pull requests; applies by CI with OIDC; policy as code and security scanning; `prevent_destroy` and deletion protection on data stores; no secrets in code.

**Level 5 — senior practice.** Designing module libraries and state boundaries; planning large refactors and migrations without downtime; reviewing plans for blast radius.

**Level 6 — enterprises.** Platform teams publishing approved modules; account vending (new cloud accounts created through code); organisation-wide policies; managed platforms (Terraform Cloud, Spacelift, env0, Atlantis) for runs, audit and approvals.

## Real-world use cases

### A new staging environment in an afternoon

- **Before**: two weeks of clicking, and staging never quite matched production.
- **After**: `environments/staging` calls the same modules as production with smaller instance sizes; a pull request, a reviewed plan and an apply create the whole environment.

### The security review

- **Practice**: Checkov runs on every pull request and blocks a change that would make an S3 bucket public; the plan comment shows reviewers exactly which security group rules change; every infrastructure change has an author, a reviewer and a commit.

## Common mistakes

### Beginner: applying without reading the plan

**Consequence:** unexpected destroys and replacements. **Fix:** read every `-` and `-/+`; apply saved plans.

### Beginner: state on a laptop or in Git

**Consequence:** lost state, conflicts and leaked secrets. **Fix:** a remote backend with locking, encryption and versioning.

### Beginner: manual changes in the console

**Consequence:** drift, and Terraform reverting "fixes". **Fix:** all changes through code; drift detection.

### Intermediate: renaming resources without `moved`

**Consequence:** destroy and recreate. **Fix:** `moved` blocks.

### Intermediate: one huge state for everything

**Consequence:** slow plans and a huge blast radius. **Fix:** split by layer and environment.

### Intermediate: unpinned providers and modules

**Consequence:** surprising changes on the next `init`. **Fix:** version constraints and the committed lock file.

### Production: no protection on data stores

**Consequence:** one plan deletes a production database. **Fix:** `prevent_destroy`, deletion protection, backups and reviewed plans.

### Production: broad credentials on laptops

**Fix:** pipeline-only applies with short-lived role credentials.

## Debugging and troubleshooting

- **"Error acquiring the state lock"**: another run is in progress — or crashed. Check before using `terraform force-unlock` with the lock ID.
- **The plan wants to change something nobody touched**: drift, a provider upgrade with new defaults, or a value computed differently; read the attribute diff.
- **Unexpected replacement**: look for "forces replacement" next to an attribute; change it differently, or plan a migration.
- **Cycle errors**: two resources reference each other; split one relationship into a separate resource (for example, security group rules as separate resources).
- **Provider authentication errors**: check which credentials and region the provider is using (`aws sts get-caller-identity`).
- **More detail**: `TF_LOG=DEBUG terraform plan` shows the API calls.

## Security summary

- **State contains secrets**: remote, encrypted, versioned, locked, tightly permissioned.
- **No secrets in code or variable files in Git**; generate or fetch them at apply time; mark sensitive values.
- **Pipeline applies with short-lived credentials** and least-privilege roles; no production access from laptops.
- **Scan and enforce policy** on every plan.
- **Protect critical resources** with `prevent_destroy` and the provider's deletion protection.
- **Pin providers and modules**; review third-party modules like dependencies.

## How a senior engineer thinks about this

- **Infrastructure is code.** Reviewed, versioned, tested and changed in small steps.
- **The plan is the truth.** Review what will happen, not just what was edited.
- **Design for blast radius.** Split state, separate accounts, protect data.
- **Make the right way the default.** Modules with secure defaults and policies that catch the rest.
- **No snowflakes.** Every environment comes from the same code; manual changes are bugs.

## Exercises

### Exercise 1 — Read the plan

**Objective:** practise reading plans.
**The plan summary** after a pull request: `~ aws_ecs_service.api` (desired_count 2 → 4); `-/+ aws_db_instance.main` (engine_version change forces replacement); `+ aws_cloudwatch_metric_alarm.cpu_high`; `- aws_s3_bucket.exports`. Would you approve it?

<details>
<summary>Show the solution</summary>

No — not as it is.

- `~ aws_ecs_service.api`: fine, scaling up.
- `+ aws_cloudwatch_metric_alarm`: fine.
- **`-/+ aws_db_instance.main`**: replacing the production database would delete it and create an empty one. Engine upgrades should be done in place where the provider supports it (for example, with `allow_major_version_upgrade` and an upgrade plan), or through a planned migration with a snapshot and downtime window. Find out why this change forces replacement.
- **`- aws_s3_bucket.exports`**: why is it being destroyed? Was the block removed on purpose? Does the bucket contain data? Was it renamed (needs a `moved` block)?

Ask for the plan to be fixed so that only the intended changes remain.

</details>

### Exercise 2 — Write a module call

**Objective:** practise variables and modules.
**What to do:** write a variable `environment` that only allows `staging` or `production`, and a module call to `../../modules/postgres` that uses `db.t4g.small` in staging and `db.r7g.large` in production.

<details>
<summary>Show the solution</summary>

```hcl
variable "environment" {
  type = string
  validation {
    condition     = contains(["staging", "production"], var.environment)
    error_message = "environment must be staging or production."
  }
}

module "database" {
  source         = "../../modules/postgres"
  name           = "shop-${var.environment}"
  instance_class = var.environment == "production" ? "db.r7g.large" : "db.t4g.small"
}
```

With one directory per environment, the instance class can also simply be written in each environment's own file.

</details>

### Exercise 3 — Production scenario: the console-built estate

**Objective:** practise adopting IaC.
**The scenario:** a company's AWS production environment was built by hand over three years. There is no staging environment, a few security groups are open to the internet, and nobody is sure what everything does. Leadership wants infrastructure as code. How do you approach it?

<details>
<summary>Show the solution</summary>

1. **Inventory**: list resources (AWS Config, tags, cost reports); identify owners and what is unused.
2. **Set up foundations**: a remote state backend with locking and encryption; a CI pipeline with plans in pull requests and OIDC-based applies.
3. **Import gradually**, layer by layer (network, then data stores, then applications), using `import` blocks and generated configuration, refining until `plan` shows **no changes** — proof that code matches reality.
4. **Fix risks through code**: close the open security groups via reviewed changes; add deletion protection and `prevent_destroy` to data stores.
5. **Extract modules** from the imported code, then build **staging** from the same modules.
6. **Stop manual changes**: restrict console write access; detect drift with scheduled plans.

</details>

## Summary

**Infrastructure as code** describes infrastructure in versioned, reviewed files applied by automation, making environments repeatable and changes traceable. **Terraform** (and OpenTofu) is **declarative**: HCL configuration declares **resources** through **providers**, uses **variables**, **locals**, **data sources** and **outputs**, and builds a dependency graph from references.

The workflow is `init`, `fmt`, `validate`, `plan`, `apply`. A **plan** compares configuration with **state** and reality, showing **`+`** create, **`~`** update in place, **`-`** destroy and **`-/+`** replace. Replacement of data stores is the classic disaster: read every plan, apply saved plans, and use `prevent_destroy` and deletion protection. **State** maps addresses to real objects and contains secrets, so it lives in a **remote backend** with locking, encryption, versioning and strict access. **Drift** comes from manual changes; **`import`** and **`moved`** blocks adopt and refactor resources without recreating them.

Real configurations use **modules** with secure defaults, one directory per environment, states split by layer and blast radius, and separate accounts. In teams, CI posts plans to pull requests, policies and scanners check them, and only the pipeline applies, with short-lived credentials. Secrets stay out of code and are marked sensitive, remembering that state still holds them.

## Key terms

- **Infrastructure as code (IaC)** — Managing infrastructure through versioned definition files applied automatically.
- **Terraform** — A declarative infrastructure-as-code tool using HCL and providers.
- **OpenTofu** — An open-source fork of Terraform using the same language.
- **HCL** — HashiCorp Configuration Language, Terraform's configuration language.
- **Declarative** — Describing the desired end result rather than the steps.
- **Provider** — A plugin that manages resources through one platform's API.
- **Resource** — An infrastructure object managed by Terraform.
- **Data source** — A read-only lookup of information from a platform.
- **Variable** — An input value for a configuration or module.
- **Output** — A value a configuration or module exposes.
- **State** — Terraform's record of the real objects it manages.
- **Backend** — The storage location for state.
- **State locking** — Preventing concurrent operations on the same state.
- **Plan** — The computed set of changes Terraform will make.
- **Apply** — Executing a plan's changes.
- **Replacement** — Destroying and recreating a resource because an attribute cannot change in place.
- **Drift** — Differences between real infrastructure and its configuration.
- **Module** — A reusable, parameterised group of Terraform resources.
- **`moved` block** — A declaration that a resource's address changed, avoiding recreation.
- **`import` block** — A declaration that brings an existing resource under Terraform management.
- **`prevent_destroy`** — A lifecycle setting that makes Terraform refuse to destroy a resource.
- **Policy as code** — Automated rules that check infrastructure changes before they are applied.

## What comes next

Infrastructure and pipelines put the application into production; then you need to know whether it is **working**. The next chapter, {{ch:monitoring}}, introduces monitoring: metrics, logs and traces, the golden signals, service level objectives, alerting that wakes people only when it should, and the dashboards that tell you how a system is doing.
