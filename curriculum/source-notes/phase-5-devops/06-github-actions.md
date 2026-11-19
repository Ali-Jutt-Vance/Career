# Phase 5 — Chapter 6: GitHub Actions

---

## Chapter Overview

GitHub Actions is the standard CI/CD platform for GitHub repositories. It automates testing, building, linting, security scanning, and deployment on every push, pull request, or schedule.

**Topics:**
- Workflow syntax: triggers, jobs, steps
- Runners (GitHub-hosted and self-hosted)
- Actions (reusable steps from the marketplace)
- Matrix builds (test multiple Node/Python versions)
- Caching dependencies
- Secrets and environment variables
- Artifacts and outputs
- Deployment workflows

---

## Basic Examples

### CI Workflow (Node.js)

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
  workflow_dispatch:                    # allow manual trigger

env:
  NODE_VERSION: "22"
  PNPM_VERSION: "9"

jobs:
  # ─── Lint ───────────────────────────────────────────────
  lint:
    name: Lint
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: "npm"                   # cache node_modules based on lockfile

      - name: Install dependencies
        run: npm ci

      - name: Run ESLint
        run: npm run lint

      - name: Type check
        run: npm run typecheck

  # ─── Test ───────────────────────────────────────────────
  test:
    name: Test (Node ${{ matrix.node-version }})
    runs-on: ubuntu-latest
    
    # Matrix: run tests on multiple Node.js versions
    strategy:
      matrix:
        node-version: ["20", "22"]
      fail-fast: false                   # don't cancel other jobs on failure

    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_DB:       test_db
          POSTGRES_USER:     test_user
          POSTGRES_PASSWORD: test_pass
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

      redis:
        image: redis:7-alpine
        ports: ["6379:6379"]
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-retries 5

    env:
      DATABASE_URL:  postgresql://test_user:test_pass@localhost:5432/test_db
      REDIS_URL:     redis://localhost:6379
      JWT_SECRET:    test-secret-key-for-ci
      NODE_ENV:      test

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Run database migrations
        run: npm run db:migrate

      - name: Run unit tests
        run: npm run test:unit

      - name: Run integration tests
        run: npm run test:integration

      - name: Upload coverage report
        uses: actions/upload-artifact@v4
        if: matrix.node-version == '22'  # only upload once
        with:
          name: coverage-report
          path: coverage/
          retention-days: 7

      - name: Upload to Codecov
        if: matrix.node-version == '22'
        uses: codecov/codecov-action@v4
        with:
          token: ${{ secrets.CODECOV_TOKEN }}

  # ─── Build ──────────────────────────────────────────────
  build:
    name: Build
    runs-on: ubuntu-latest
    needs: [lint, test]               # only run if lint + test pass

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: "npm"

      - run: npm ci

      - name: Build application
        run: npm run build

      - name: Upload build artifacts
        uses: actions/upload-artifact@v4
        with:
          name: build-output
          path: dist/
          retention-days: 1

  # ─── Security Scan ──────────────────────────────────────
  security:
    name: Security Scan
    runs-on: ubuntu-latest
    needs: build
    permissions:
      security-events: write           # required for SARIF upload

    steps:
      - uses: actions/checkout@v4

      - name: Run Trivy vulnerability scan
        uses: aquasecurity/trivy-action@master
        with:
          scan-type:  "fs"
          scan-ref:   "."
          severity:   "CRITICAL,HIGH"
          format:     "sarif"
          output:     "trivy-results.sarif"

      - name: Upload SARIF to GitHub Security
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: trivy-results.sarif
```

### CD Workflow (Deploy to AWS EC2)

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]
  workflow_dispatch:

concurrency:
  group: deploy-production            # only one deploy at a time
  cancel-in-progress: false          # don't cancel in-progress deploys

jobs:
  deploy:
    name: Deploy
    runs-on: ubuntu-latest
    environment:                      # use GitHub environment with protection rules
      name: production
      url: https://myapp.com

    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id:     ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region:            us-east-1

      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2

      - name: Build, tag, push Docker image to ECR
        env:
          ECR_REGISTRY:   ${{ steps.login-ecr.outputs.registry }}
          ECR_REPOSITORY: myapp
          IMAGE_TAG:       ${{ github.sha }}
        run: |
          docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG .
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
          docker tag $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG $ECR_REGISTRY/$ECR_REPOSITORY:latest
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:latest
          echo "image=$ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG" >> $GITHUB_OUTPUT

      - name: Deploy to EC2 via SSH
        uses: appleboy/ssh-action@v1
        with:
          host:       ${{ secrets.EC2_HOST }}
          username:   deploy
          key:        ${{ secrets.EC2_SSH_KEY }}
          port:       22
          script: |
            cd /opt/myapp
            export IMAGE_TAG=${{ github.sha }}
            docker compose -f compose.yml -f compose.prod.yml pull
            docker compose -f compose.yml -f compose.prod.yml up -d --no-build
            docker compose exec app npm run db:migrate
            docker image prune -f

      - name: Health check
        run: |
          sleep 15
          response=$(curl -sf https://myapp.com/health)
          echo "$response"
          echo "$response" | grep -q '"status":"ok"' || exit 1

      - name: Notify Slack on success
        if: success()
        uses: 8398a7/action-slack@v3
        with:
          status: success
          text:   "Deployed ${{ github.sha }} to production ✓"
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}

      - name: Notify Slack on failure
        if: failure()
        uses: 8398a7/action-slack@v3
        with:
          status: failure
          text:   "Deploy FAILED for ${{ github.sha }}"
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

---

## Intermediate Concepts

### Reusable Workflows

```yaml
# .github/workflows/reusable-deploy.yml
name: Reusable Deploy

on:
  workflow_call:
    inputs:
      environment:
        required: true
        type:     string
      image-tag:
        required: true
        type:     string
    secrets:
      EC2_HOST:       { required: true }
      EC2_SSH_KEY:    { required: true }
      SLACK_WEBHOOK:  { required: false }

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: ${{ inputs.environment }}
    steps:
      - name: Deploy
        uses: appleboy/ssh-action@v1
        with:
          host:     ${{ secrets.EC2_HOST }}
          username: deploy
          key:      ${{ secrets.EC2_SSH_KEY }}
          script:   |
            export IMAGE_TAG=${{ inputs.image-tag }}
            cd /opt/myapp
            docker compose up -d

# ─── Caller ─────────────────────────────────────────────
# .github/workflows/deploy-staging.yml
name: Deploy Staging
on: [push]
jobs:
  deploy:
    uses: ./.github/workflows/reusable-deploy.yml
    with:
      environment: staging
      image-tag:   ${{ github.sha }}
    secrets:
      EC2_HOST:     ${{ secrets.STAGING_EC2_HOST }}
      EC2_SSH_KEY:  ${{ secrets.STAGING_EC2_SSH_KEY }}
```

### Caching

```yaml
# Cache node_modules
- uses: actions/setup-node@v4
  with:
    node-version: "22"
    cache: "npm"              # built-in npm cache (based on package-lock.json)

# Manual cache (for other tools)
- uses: actions/cache@v4
  with:
    path: |
      ~/.npm
      ${{ github.workspace }}/.next/cache
    key:    ${{ runner.os }}-nextjs-${{ hashFiles('**/package-lock.json') }}-${{ hashFiles('**.[jt]s', '**.[jt]sx') }}
    restore-keys: |
      ${{ runner.os }}-nextjs-${{ hashFiles('**/package-lock.json') }}-
      ${{ runner.os }}-nextjs-

# Docker layer caching with GitHub Actions Cache
- uses: docker/setup-buildx-action@v3

- uses: docker/build-push-action@v5
  with:
    context: .
    push:    true
    tags:    myapp:latest
    cache-from: type=gha
    cache-to:   type=gha,mode=max
```

### GitHub-Hosted vs. Self-Hosted Runners

Every job needs a machine to actually execute its steps — that machine is called a "runner." GitHub provides free, ephemeral runners, but sometimes you need your own.

```yaml
# GitHub-hosted runner (the default) — a fresh VM for every single job run,
# destroyed afterward. Zero maintenance, but has limits.
jobs:
  test:
    runs-on: ubuntu-latest   # or windows-latest, macos-latest
    steps:
      - run: npm test

# Self-hosted runner — a machine YOU provision and maintain, registered
# to your repo/org. GitHub sends jobs to it instead of spinning up its own VM.
jobs:
  deploy:
    runs-on: [self-hosted, linux, production]  # match by custom labels
    steps:
      - run: ./deploy.sh
```

```
When to use GitHub-hosted (default choice):
  - Standard CI: linting, testing, building
  - No need for special hardware or network access
  - Fine with a 6-hour job time limit and standard CPU/RAM

When to use self-hosted:
  - The job needs access to a private network (deploying to an EC2
    instance in a VPC with no public endpoint, for example)
  - You need specific hardware (GPU for ML training, more RAM/CPU than
    GitHub's hosted tier offers)
  - You're running so many jobs that GitHub's hosted-runner minutes
    become a significant cost, and your own hardware is cheaper

Trade-off: self-hosted runners are YOUR responsibility to patch, secure,
and scale. A self-hosted runner registered to a public repo is also a
security risk — anyone who can open a PR could potentially run code on
your infrastructure, so self-hosted runners should generally only be used
on private repos, or with strict rules about which workflows can use them.
```

---

## Interview Preparation

**Q1: What is the difference between `on: push` and `on: pull_request`?**
A: `on: push` triggers when commits are pushed directly to a branch — used for deployment triggers (push to main = deploy). `on: pull_request` triggers when a PR is opened, synchronized (new commit pushed to the PR branch), or reopened — used for CI checks that must pass before merging. The important security difference: `on: pull_request` from a fork runs with read-only permissions (the fork can't access your secrets). Use `on: pull_request_target` (caution!) to access secrets for forked PRs, but be aware of the security risk of running untrusted code with secrets.

**Q2: What are GitHub Actions environments and why use them?**
A: Environments (Settings → Environments) provide: protection rules (require manual approval before deploying to production), environment-specific secrets (different database URLs for staging vs. production), deployment history tracking, and required reviewers. Without environments, a malicious PR could read production secrets in workflow steps. With environments, only workflows targeting the `production` environment can access production secrets, and you can require 1+ reviewers to approve production deploys. Best practice: create `staging` and `production` environments, require review for production.

**Q3: How do you avoid running redundant workflows on every push?**
A: Several strategies: `concurrency` group to cancel in-progress duplicate runs. `paths` filter to only trigger when relevant files change: `on: push: paths: ["src/**", "package.json"]`. `if` conditions on jobs or steps: `if: github.ref == 'refs/heads/main'` to skip deployment jobs on non-main branches. `workflow_dispatch` for manual triggers. `on: push: branches: [main]` to only trigger on main. Matrix `fail-fast: false` to let all matrix jobs complete even if one fails. Cache dependencies to reduce build time rather than skipping builds.

---

## Practical Tasks

### Beginner (10 Tasks)
1. Create a CI workflow that runs on push and PR.
2. Add a Node.js setup step with version pinning.
3. Run `npm ci`, `npm run lint`, `npm test` in sequence.
4. Add a PostgreSQL service container to the job.
5. Cache `node_modules` using `actions/setup-node` cache option.
6. Upload test coverage as an artifact.
7. Add a secret (`DATABASE_URL`) and use it in the workflow.
8. Add `workflow_dispatch` for manual triggering.
9. Add a matrix build for Node.js 20 and 22.
10. Make the deploy job depend on the test job with `needs: [test]`.

### Intermediate (10 Tasks)
1. Build and push a Docker image to ECR.
2. Deploy to EC2 via SSH after successful build.
3. Add a health check step after deployment.
4. Create a `production` environment with required reviewers.
5. Use `concurrency` to prevent parallel deploys.
6. Add Slack notification on deploy success/failure.
7. Use `on: push: paths` to skip CI when only docs changed.
8. Add Trivy security scan with SARIF upload to GitHub Security.
9. Use `github.sha` as Docker image tag.
10. Use `actions/cache@v4` for Next.js build cache.

### Advanced (10 Tasks)
1. Create a reusable workflow for deployment.
2. Implement rollback workflow that reverts the last deploy.
3. Add Lighthouse CI check on PR (fail if performance drops).
4. Implement PR size labels (warn on large PRs).
5. Create a nightly scheduled workflow for cleanup.
6. Add SAST scan with CodeQL.
7. Implement feature flag check (deploy only if feature is enabled).
8. Create release workflow: tag → changelog → GitHub Release → deploy.
9. Implement self-hosted runner on EC2 for private network access.
10. Add matrix deploy: deploy to eu-west-1 and us-east-1 in parallel.

---

## Self Assessment
1. What is the difference between `on: push` and `on: pull_request`?
2. What are `jobs` and `steps` in a workflow?
3. What is a matrix strategy?
4. What does `needs` do?
5. How do you add secrets to a workflow?
6. What is a `service` container?
7. What is `concurrency` used for?
8. What is a reusable workflow?
9. What does `uses: actions/checkout@v4` do?
10. What is an environment in GitHub Actions?

---

## Cheat Sheet

```yaml
name: CI/CD
on:
  push:    { branches: [main] }
  pull_request: { branches: [main] }
  workflow_dispatch:

env:
  NODE_VERSION: "22"

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env: { POSTGRES_DB: test, POSTGRES_USER: test, POSTGRES_PASSWORD: test }
        ports: ["5432:5432"]
        options: --health-cmd pg_isready --health-interval 10s --health-retries 5

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "${{ env.NODE_VERSION }}", cache: "npm" }
      - run: npm ci
      - run: npm test
        env: { DATABASE_URL: postgresql://test:test@localhost:5432/test }

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    environment: production
    concurrency: { group: deploy-prod, cancel-in-progress: false }
    steps:
      - uses: actions/checkout@v4
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
      - run: docker build -t myapp:${{ github.sha }} .
      - run: docker push 123456.dkr.ecr.us-east-1.amazonaws.com/myapp:${{ github.sha }}
```
