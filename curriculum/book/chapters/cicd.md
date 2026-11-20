# CI/CD: Automatic Testing and Deployment

> [!GOALS]
> - Explain **continuous integration**, **continuous delivery** and **continuous deployment**, and why teams that ship often ship more safely.
> - Design a pipeline: the stages, their order, and the **quality gates** that stop a bad change.
> - Build once and promote the same artifact through environments.
> - Compare deployment strategies — **rolling**, **blue-green**, **canary** — and separate deploying from releasing with **feature flags**.
> - Plan **rollbacks** and safe database changes.
> - Keep pipelines fast, reliable and secure.

## Why this matters

In many companies, releasing software used to be an event. Changes piled up for weeks; someone merged them all into a release branch; testers checked it by hand for days; and on release night, engineers followed a long checklist, copied files to servers and hoped. When something broke, nobody knew which of the hundreds of changes caused it, and rolling back was another long manual procedure. So teams released less often — which made each release bigger and riskier.

**CI/CD** reverses this. Every change is built and tested automatically within minutes of being pushed; every change that passes can be deployed by an automated, repeatable process; and deployments become so small and so routine that they happen many times a day. Small changes are easy to review, easy to test, easy to understand when they break and easy to undo. The research behind the DORA metrics found the same thing again and again: teams that deploy more often also have **fewer** failures and recover from them **faster**.

Every professional team you join will have a pipeline. You will write code that must pass it, read its failures, add checks to it and, as you grow, design it. This chapter explains the ideas; the next two show the two common tools, {{ch:github-actions}} and {{ch:jenkins}}.

## The simple idea

Think of a bakery with a quality line. Every tray of bread passes the same stations in the same order: weighed, checked for colour, checked for shape, packed. A tray that fails any station is taken off the line straight away — it never reaches the shop. Because every tray passes the same checks, the bakery can bake all day without the owner tasting every loaf.

A CI/CD pipeline is that line for code. Every change passes the same automated stations — install, lint, test, build, scan, deploy to a test environment, check — and a change that fails a station stops there.

> [!ANALOGY]
> A pipeline is like a bakery's quality line: every tray passes the same stations, and a tray that fails one is taken off before it reaches the shop.
>
> **Where the analogy breaks:** bread checks are physical and obvious. Software checks are only as good as the tests that someone wrote — a pipeline can be completely green while the change is still wrong, because nobody tested that behaviour. And unlike bread, software can be "un-baked": a good pipeline also makes it fast to **roll back** a change that slipped through.

## The proper definition and key words

**Continuous integration (CI)** is the practice of merging every developer's changes into the main branch frequently — at least daily — with every change automatically built and tested. **Continuous delivery (CD)** extends this so that every change that passes is automatically prepared and **can** be deployed to production at any moment, usually with a final approval. **Continuous deployment** goes one step further: every change that passes is deployed to production automatically, with no human step.

Key words:

- **Pipeline** — the automated sequence of stages a change passes through.
- **Stage / job / step** — a pipeline's parts: a stage groups jobs (which may run in parallel); a job runs steps on a machine.
- **Runner / agent** — the machine that executes pipeline jobs.
- **Quality gate** — a check that must pass for the pipeline to continue (tests, coverage, lint, security scans).
- **Artifact** — what the build produces and what is deployed: a container image, a bundle, a binary.
- **Environment** — a place the application runs: development, staging, production.
- **Promotion** — deploying the same artifact to the next environment.
- **Deployment strategy** — how new versions replace old ones: rolling, blue-green, canary.
- **Feature flag** — a switch that turns code paths on or off at runtime, separating deployment from release.
- **Rollback** — returning to the previous working version.
- **Trunk-based development** — everyone integrates into one main branch with short-lived branches.
- **DORA metrics** — deployment frequency, lead time for changes, change failure rate and time to restore service.

## Continuous integration

### Level 1 — What CI means in practice

CI is a habit before it is a tool:

- **Integrate often.** Work in small branches that live hours or a day or two, not weeks, and merge them into `main` ({{ch:git}}). Long-lived branches drift apart and produce painful merges — the "integration hell" CI was named against.
- **Every push is built and tested** automatically, on a clean machine, not on someone's laptop.
- **Pull requests show the result** before review; merging is blocked until the checks pass.
- **A broken `main` is fixed first.** If the main branch fails, the team stops and fixes (or reverts) it, because everyone builds on it.

### Level 2 — Stages and quality gates

A typical pipeline for a back-end service, in the order the checks run:

```text
 push / pull request
        │
 ┌──────▼──────────────────────────── CI ──────────────────────────────────┐
 │ checkout → install (cached) → lint + type check → unit tests → build    │
 │      → integration tests (real database) → security scans → push image │
 └──────┬───────────────────────────────────────────────────────────────────┘
        │ only on main
 ┌──────▼──────────────────────────── CD ──────────────────────────────────┐
 │ deploy to staging → smoke / end-to-end tests → (approval) → production  │
 │      → health checks and monitoring → automatic rollback if unhealthy   │
 └──────────────────────────────────────────────────────────────────────────┘
```

The order matters: **cheap, fast checks first**. Linting and type checks take seconds and catch many mistakes; unit tests take a minute or two; integration tests with real databases take longer; end-to-end tests longest. Failing fast saves runner time and, more importantly, gives the developer feedback sooner.

Here is the core logic of every pipeline tool, reduced to a few lines: run each stage as a real command and stop at the first failure.

```ts
import { spawnSync } from "node:child_process";

// A tiny pipeline runner: each stage is a real command; the first failure stops the pipeline.
type Stage = { name: string; command: string[] };

const node = process.execPath;
const stages: Stage[] = [
  { name: "install", command: [node, "-e", "console.log('dependencies installed')"] },
  { name: "lint", command: [node, "-e", "console.log('0 problems')"] },
  { name: "unit tests", command: [node, "-e", "console.log('42 passed')"] },
  { name: "integration tests", command: [node, "-e", "console.error('expected 201, got 500 (POST /orders)'); process.exit(1)"] },
  { name: "build image", command: [node, "-e", "console.log('built')"] },
  { name: "deploy to staging", command: [node, "-e", "console.log('deployed')"] },
];

function runPipeline(list: Stage[]): boolean {
  for (const [i, stage] of list.entries()) {
    const [cmd, ...args] = stage.command;
    const r = spawnSync(cmd!, args, { encoding: "utf8" });
    const out = (r.stdout + r.stderr).trim();
    const status = r.status === 0 ? "passed" : `FAILED (exit ${r.status})`;
    console.log(`${i + 1}. ${stage.name.padEnd(18)} ${status.padEnd(16)} ${out}`);
    if (r.status !== 0) {
      console.log(`pipeline stopped: ${list.length - i - 1} later stages skipped, nothing deployed`);
      return false;
    }
  }
  console.log("pipeline green");
  return true;
}

runPipeline(stages);
```

**Output:**

```text
1. install            passed           dependencies installed
2. lint               passed           0 problems
3. unit tests         passed           42 passed
4. integration tests  FAILED (exit 1)  expected 201, got 500 (POST /orders)
pipeline stopped: 2 later stages skipped, nothing deployed
```

- Each stage is just a **command with an exit code** — `0` means success, anything else means failure ({{ch:shell-scripting}}). Pipeline tools are built on this contract, so any tool (a test runner, a linter, a scanner, your own script) can be a quality gate if it exits non-zero on failure.
- The failing integration test stopped the pipeline: the image was never built and nothing reached staging. That is the whole point.
- Real tools add the rest: running jobs on fresh machines, running independent jobs **in parallel**, caching, secrets, logs, and reporting results on the pull request.

Common quality gates:

| Gate | What it catches |
|---|---|
| Formatting, lint, type check | Style drift, many bugs, unsafe code ({{ch:clean-code}}) |
| Unit and integration tests | Broken behaviour ({{ch:testing}}) |
| Coverage threshold or "no drop" rule | Untested new code (a weak signal — see the mistakes) |
| Build | Code that does not compile or bundle |
| Dependency audit, SAST, secret scan, image scan | Known vulnerabilities, leaked keys ({{ch:application-security}}) |
| Migration check | Destructive or locking schema changes |
| Contract or API-diff check | Breaking API changes ({{ch:api-versioning}}) |

### Level 2 — Keeping CI fast and trustworthy

A pipeline that takes 40 minutes is worked around; a pipeline that fails randomly is ignored. Both destroy its value.

- **Fast**: cache dependencies and Docker layers; run jobs in parallel; split large test suites across machines; run only affected tests in monorepos. Aim for about ten minutes from push to result.
- **Reliable**: fix or quarantine **flaky tests** immediately (tests that pass or fail randomly — usually timing, shared state, order dependence or real network calls) ({{ch:testing}}). A team that is used to "just re-run it" will eventually re-run a real failure.
- **Reproducible**: pinned tool versions, lock files and `npm ci`, the same container images in CI as in production.

## Continuous delivery

### Level 3 — Build once, promote everywhere

The artifact deployed to production should be **exactly** the artifact that was tested. So the pipeline builds once — for example a container image tagged with the git commit SHA ({{ch:docker}}) — and **promotes** that same image: first to staging, then to production. Only configuration differs between environments (environment variables, secrets) ({{ch:nodejs}}).

Rebuilding for each environment breaks this: a dependency may have changed between builds, and production would run something nobody tested. Tagging with the commit SHA also makes every deployment traceable ("which code is in production?") and rollbacks exact ("deploy image `a1b2c3d` again").

### Level 3 — Environments and approvals

- **Staging** mirrors production as closely as is affordable: same image, same infrastructure code, similar data shapes (never real customer data without protection).
- **Smoke tests** after each deployment call a few key endpoints to confirm the service is up and its main paths work.
- **Approvals**: continuous **delivery** adds a manual "deploy to production" button or approval; continuous **deployment** removes it once the team trusts its tests and monitoring.
- **Deployment freezes and windows** exist in some organisations (holiday trading peaks, regulated releases), but the safer long-term answer is smaller, more frequent changes with good rollback.

### Level 3 — Deployment strategies

How do you replace version 1 with version 2 while users are using the system?

- **Recreate**: stop everything, start the new version. Simple; causes downtime. Acceptable for internal tools and some batch systems only.
- **Rolling**: replace instances a few at a time, waiting for each new instance to pass its health check. No extra infrastructure, the default in Kubernetes and ECS ({{ch:ecs}}). For a while, **both versions serve traffic** — so they must be compatible with each other and with the database.
- **Blue-green**: run the new version (green) next to the old one (blue), test it, then switch all traffic at the load balancer ({{ch:elb}}). Rollback is switching back — instant. It costs double capacity during the switch.
- **Canary**: send a small share of traffic (say 5%) to the new version, compare its metrics with the old version's, and increase the share step by step — or roll back automatically if it looks worse. It limits the **blast radius** of a bad release to a few users.

The canary decision is a comparison of measurements, which tools like Argo Rollouts, Flagger or AWS CodeDeploy automate:

```ts
// Canary analysis: compare the new version's metrics with the stable version's
type Metrics = { requests: number; errors: number; p95Ms: number };
type Verdict = "promote" | "rollback" | "wait";

function judgeCanary(stable: Metrics, canary: Metrics): { verdict: Verdict; reason: string } {
  if (canary.requests < 500) return { verdict: "wait", reason: `only ${canary.requests} requests so far, need 500` };
  const errStable = stable.errors / stable.requests;
  const errCanary = canary.errors / canary.requests;
  if (errCanary > errStable * 2 && errCanary > 0.01)
    return { verdict: "rollback", reason: `error rate ${(errCanary * 100).toFixed(2)}% vs ${(errStable * 100).toFixed(2)}%` };
  if (canary.p95Ms > stable.p95Ms * 1.25)
    return { verdict: "rollback", reason: `p95 ${canary.p95Ms} ms vs ${stable.p95Ms} ms` };
  return { verdict: "promote", reason: "error rate and latency within limits" };
}

const stable: Metrics = { requests: 95_000, errors: 190, p95Ms: 180 };
const checks: [string, Metrics][] = [
  ["after 1 minute ", { requests: 320, errors: 1, p95Ms: 175 }],
  ["healthy canary ", { requests: 5_000, errors: 11, p95Ms: 186 }],
  ["buggy canary   ", { requests: 5_000, errors: 160, p95Ms: 190 }],
  ["slow canary    ", { requests: 5_000, errors: 9, p95Ms: 260 }],
];
for (const [label, m] of checks) {
  const { verdict, reason } = judgeCanary(stable, m);
  console.log(`${label} -> ${verdict.padEnd(8)} (${reason})`);
}
```

**Output:**

```text
after 1 minute  -> wait     (only 320 requests so far, need 500)
healthy canary  -> promote  (error rate and latency within limits)
buggy canary    -> rollback (error rate 3.20% vs 0.20%)
slow canary     -> rollback (p95 260 ms vs 180 ms)
```

- The analysis **waits** for enough traffic — a canary with one error in 300 requests tells you little.
- It compares the canary with the **stable version at the same time**, not with a fixed number, so normal daily changes in traffic do not cause false alarms.
- A buggy release was caught when it had served 5,000 requests instead of millions. The metrics come from monitoring ({{ch:monitoring}}).

### Level 4 — Deploying is not releasing: feature flags

A **feature flag** lets you deploy code that is switched off, then turn it on separately — for internal users first, then a percentage of customers, then everyone. Deployment becomes a technical event with no visible change; **release** becomes a business decision that can be undone in seconds without a deployment.

```ts
import { createHash } from "node:crypto";

// A percentage rollout behind a feature flag: deploy the code dark, then release it gradually.
// Hashing the user ID makes the choice stable: a user stays in (or out) as the percentage grows.
function bucket(flag: string, userId: string): number {
  const hash = createHash("sha256").update(`${flag}:${userId}`).digest();
  return hash.readUInt32BE(0) % 100;            // 0..99
}

function isEnabled(flag: string, userId: string, percent: number): boolean {
  return bucket(flag, userId) < percent;
}

const users = Array.from({ length: 10_000 }, (_, i) => `user-${i}`);
for (const percent of [0, 5, 25, 100]) {
  const on = users.filter((u) => isEnabled("new-checkout", u, percent)).length;
  console.log(`${String(percent).padStart(3)}% rollout -> ${on} of ${users.length} users see the new checkout`);
}

const inAt5 = users.filter((u) => isEnabled("new-checkout", u, 5));
const stillIn = inAt5.filter((u) => isEnabled("new-checkout", u, 25)).length;
console.log(`users enabled at 5% who are still enabled at 25%: ${stillIn} of ${inAt5.length}`);
```

**Output:**

```text
  0% rollout -> 0 of 10000 users see the new checkout
  5% rollout -> 494 of 10000 users see the new checkout
 25% rollout -> 2466 of 10000 users see the new checkout
100% rollout -> 10000 of 10000 users see the new checkout
users enabled at 5% who are still enabled at 25%: 494 of 494
```

- Hashing gives each user a fixed bucket from 0 to 99, so the same user always gets the same answer — no flickering between old and new checkout on every request — and growing the percentage only **adds** users (all 494 early users stayed in).
- Including the flag name in the hash gives each flag a different set of early users.
- Real systems (LaunchDarkly, Unleash, GrowthBook, OpenFeature-compatible tools, or a simple flags table) add targeting rules, audit logs and instant updates.
- Flags are **temporary**: once a feature is fully released, delete the flag and the old code path. Hundreds of forgotten flags make code hard to reason about.

### Level 4 — Rollbacks and database changes

Every deployment needs an answer to "how do we undo this?":

- **Roll back the code** by redeploying the previous image (exact, because images are tagged by commit), switching blue-green traffic back, or aborting the canary. Practise it; a rollback nobody has tried is a hope, not a plan.
- **Or roll forward**: for a small, well-understood bug, a quick fix through the normal pipeline can be safer than a rollback. Decide by what restores service fastest with least risk.
- **Database migrations cannot simply be rolled back** once new data is written. So schema changes must work with **both** the old and the new code, because both run during a rolling deployment and the old code returns after a rollback. Use the **expand and contract** pattern ({{ch:database-design}}): add the new column or table first (expand), deploy code that writes both and reads the new, backfill, and only in a later release remove the old one (contract). Never rename or drop a column in the same release as the code change.

## Pipeline security

### Level 4 — The pipeline is a production system

A pipeline can change production, so an attacker who controls it controls production:

- **No long-lived cloud keys in CI.** Use **OIDC** short-lived credentials, where the cloud trusts the CI provider's signed identity token for a specific repository and branch ({{ch:iam}}).
- **Least privilege** for each job: the test job does not need production deployment rights.
- **Protect secrets**: use the CI tool's secret store, never print secrets, and do not expose them to pull requests from forks ({{ch:secrets-manager}}).
- **Protect branches and environments**: required reviews and checks for `main`, and approvals or restricted branches for production deployments.
- **Pin third-party actions and plugins** to exact versions or commit SHAs — they run with your secrets ({{ch:github-actions}}).
- **Supply chain**: lock files, dependency scanning, signed artifacts and recorded provenance (which commit and pipeline built this image).

## From beginner to enterprise

**Level 1–2 — first pipelines.** Tests and linting on every pull request; merging blocked until checks pass; fast feedback; the habit of small, frequent merges.

**Level 3 — continuous delivery.** Build once, tag by commit, promote through staging to production; smoke tests; approvals; rolling or blue-green deployments with health checks.

**Level 4 — safe releases.** Canary analysis and automatic rollbacks; feature flags; expand-and-contract migrations; OIDC credentials; security scanning gates.

**Level 5 — senior practice.** Measuring DORA metrics and pipeline duration; removing flaky tests and slow stages; designing deployment strategies per service; making rollback a routine, practised action.

**Level 6 — enterprises.** Shared pipeline templates and golden paths maintained by platform teams; policy as code (required scans, signed images, approved base images); audit trails for regulated changes; progressive delivery across many regions.

## Real-world use cases

### A small team's first pipeline

- **Before**: one engineer deploys from their laptop on Fridays; nobody else knows how.
- **After**: every pull request runs lint, type check and tests; merging to `main` builds an image tagged with the commit SHA, deploys it to staging, runs smoke tests and waits for a one-click approval to production. Anyone on the team can deploy — or roll back — the same way.

### Checkout at a large online shop

- **Practice**: every change is deployed to one region as a canary for 15 minutes with automated analysis of error rate, latency and order completion; then region by region. The new checkout flow itself sits behind a feature flag, released to staff, then 1%, 10% and 100% of customers over several days, with the old flow one click away.

## Common mistakes

### Beginner: long-lived feature branches

**Consequence:** painful merges and late surprises. **Fix:** small branches merged often; flags for unfinished work.

### Beginner: ignoring or re-running red builds

**Consequence:** real failures slip through. **Fix:** a red `main` is fixed or reverted first; flaky tests are fixed or quarantined with an owner.

### Intermediate: rebuilding per environment

**Consequence:** production runs an untested build. **Fix:** build once, promote the same artifact.

### Intermediate: coverage as the goal

**Consequence:** tests written to touch lines, not to check behaviour. **Fix:** use coverage to find untested areas; review test quality.

### Intermediate: slow pipelines

**Consequence:** batched changes and frustrated developers. **Fix:** caching, parallel jobs, fast checks first, test splitting.

### Production: no tested rollback

**Consequence:** a long outage while someone works out how. **Fix:** automated, practised rollback; images tagged by commit.

### Production: breaking migrations in the same release

**Consequence:** errors during the rollout and impossible rollbacks. **Fix:** expand and contract over several releases.

### Production: powerful static credentials in CI

**Consequence:** one leak exposes production. **Fix:** OIDC, least privilege, protected environments.

## Debugging and troubleshooting

- **"Works locally, fails in CI"**: differences in tool versions, environment variables, time zone, file-name case sensitivity (Linux runners), missing services, or uncommitted files. Reproduce with the same container image the pipeline uses.
- **Flaky test**: run it many times in a loop; look for shared state, real time, test order and network calls ({{ch:testing}}).
- **Slow pipeline**: look at the per-step timings; usually dependency installs without caches, serial jobs or a few very slow tests.
- **Deployment stuck**: new instances failing health checks — read their logs and check configuration and secrets for the new environment.
- **Bad release in production**: roll back first, investigate second; then add the missing test or check so the pipeline catches it next time.

## Security summary

- The pipeline can reach production: protect it like production.
- **Short-lived OIDC credentials**, least privilege per job, protected branches and environments.
- **Secrets** in the CI secret store, never in logs or code, never available to untrusted forks.
- **Pin and review** third-party actions and plugins.
- **Scan** dependencies, code, secrets and images as quality gates.
- **Signed, traceable artifacts**: know exactly which commit and pipeline produced what runs in production.

## How a senior engineer thinks about this

- **Small batches are safer.** Frequent small deployments beat rare big ones on both speed and stability.
- **The pipeline is a product.** Fast, reliable and trusted — or people route around it.
- **Make the safe way the easy way.** Templates, defaults and automation instead of instructions.
- **Separate deploy from release.** Flags and progressive delivery make releases reversible business decisions.
- **Plan the undo.** Every change has a rollback story, including the database.
- **Measure it.** Deployment frequency, lead time, change failure rate and time to restore.

## Exercises

### Exercise 1 — Order the pipeline

**Objective:** practise stage ordering.
**What to do:** put these in order and say which can run in parallel: deploy to staging, unit tests, lint, build image, integration tests, push image, smoke tests, type check, install dependencies, image scan.

<details>
<summary>Show the solution</summary>

1. Install dependencies (cached).
2. **In parallel**: lint, type check, unit tests — fast and independent.
3. Integration tests (slower, need a database) — can also run in parallel with the build to save time.
4. Build image.
5. Image scan (fail on high-severity issues).
6. Push image (tagged with the commit SHA).
7. Deploy to staging.
8. Smoke tests against staging.

Cheap and fast checks first, so failures are reported quickly; the artifact is built once and the same image is scanned, pushed and deployed.

</details>

### Exercise 2 — Choose a deployment strategy

**Objective:** practise comparing strategies.
**What to do:** choose a strategy for (a) an internal admin tool used during office hours, (b) a payments API with strict uptime needs and a team that wants instant rollback, (c) a high-traffic recommendation service where a subtle bug could reduce sales.

<details>
<summary>Show the solution</summary>

- **(a)** Rolling (or even recreate outside office hours) — simple, and brief overlap or downtime is acceptable.
- **(b)** Blue-green — the new version is fully tested before traffic switches, and rollback is switching back. Database changes must still be backwards compatible.
- **(c)** Canary with automated analysis of business metrics (click-through, conversion) as well as errors and latency, increasing traffic gradually — subtle problems show up as metric differences at small scale, limiting the damage. A feature flag for the new algorithm adds a fast off switch.

</details>

### Exercise 3 — Production scenario: the risky Friday release

**Objective:** practise improving a delivery process.
**The scenario:** a team deploys once a month. Each release contains about 80 changes, takes a whole evening, and last time a column rename broke the old servers during the rollout and rollback was impossible. What would you change, in what order?

<details>
<summary>Show the solution</summary>

1. **Automate the pipeline**: tests and checks on every pull request; build once per commit; deploy to staging automatically.
2. **Deploy much more often** — first weekly, then daily — so each release is small and easy to diagnose.
3. **Rolling or blue-green deployments with health checks**, and a practised one-command rollback to the previous image.
4. **Expand-and-contract migrations**: add the new column, deploy code that writes both and reads the new one, backfill, and remove the old column in a later release; never rename in place.
5. **Feature flags** for larger features, so unfinished work can be merged and released separately.
6. **Measure** deployment frequency, change failure rate and time to restore to show the improvement.

</details>

## Summary

**Continuous integration** means merging small changes into the main branch often, with every change automatically built and tested. **Continuous delivery** means every passing change can be deployed at any time through an automated process; **continuous deployment** deploys every passing change automatically. Small, frequent changes are easier to review, test, diagnose and undo — which is why frequent deployers also fail less and recover faster.

A **pipeline** runs **stages** of commands, and each command's exit code makes it a **quality gate**: lint and type checks, unit and integration tests, builds, security scans. Fast checks go first; the first failure stops the pipeline. Pipelines must be **fast**, **reliable** (no tolerated flaky tests) and **reproducible**. The pipeline **builds once**, tags the artifact with the commit SHA and **promotes** the same artifact through staging to production, changing only configuration.

**Deployment strategies** replace versions safely: **rolling** (gradual, both versions live), **blue-green** (switch traffic, instant rollback), **canary** (a small share of traffic compared against the stable version, with automatic promotion or rollback). **Feature flags** separate deploying from releasing. Every change needs a **rollback** plan, and database changes use **expand and contract** so old and new code both work. The pipeline is a production system: OIDC credentials, least privilege, protected secrets and environments, pinned third-party steps and traceable artifacts.

## Key terms

- **Continuous integration (CI)** — Frequently merging changes into the main branch, with every change built and tested automatically.
- **Continuous delivery** — Keeping every passing change ready to deploy through an automated process, often with a final approval.
- **Continuous deployment** — Automatically deploying every passing change to production.
- **Pipeline** — The automated sequence of stages that builds, tests and deploys changes.
- **Runner** — A machine that executes pipeline jobs.
- **Quality gate** — A check that must pass before the pipeline continues.
- **Flaky test** — A test that sometimes passes and sometimes fails without code changes.
- **Artifact** — The build output that is deployed, such as a container image.
- **Promotion** — Deploying the same artifact to the next environment.
- **Staging** — A pre-production environment that mirrors production.
- **Smoke test** — A quick check that a deployed system's main functions work.
- **Rolling deployment** — Replacing instances gradually with the new version.
- **Blue-green deployment** — Switching traffic from the old environment to a fully prepared new one.
- **Canary deployment** — Sending a small share of traffic to a new version and comparing its metrics before widening.
- **Blast radius** — How many users or systems a failure affects.
- **Feature flag** — A runtime switch that enables or disables a code path.
- **Rollback** — Returning to the previous working version.
- **Roll forward** — Fixing a problem with a new deployment instead of reverting.
- **Expand and contract** — Making schema changes in backwards-compatible steps across several releases.
- **Trunk-based development** — Integrating all work into one main branch through short-lived branches.
- **DORA metrics** — Deployment frequency, lead time for changes, change failure rate and time to restore service.
- **OIDC credentials** — Short-lived cloud credentials issued to a pipeline based on its signed identity.

## What comes next

The ideas in this chapter need a tool to run them. The next chapter, {{ch:github-actions}}, builds real pipelines with GitHub Actions: workflows, triggers, jobs and steps, caching, service containers for integration tests, matrices, secrets and OIDC, reusable workflows and deployment environments.
