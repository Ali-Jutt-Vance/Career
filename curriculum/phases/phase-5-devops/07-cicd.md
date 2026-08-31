# Phase 5 — Chapter 7: CI/CD Pipelines

---

## Chapter Overview

CI/CD (Continuous Integration / Continuous Delivery) is the practice of automating the path from code commit to production. This chapter covers pipeline design principles, stages, quality gates, deployment strategies, and rollback patterns — going beyond GitHub Actions syntax into pipeline architecture.

**CI (Continuous Integration):** Automatically build and test every commit.
**CD (Continuous Delivery):** Automatically deploy every commit that passes CI (to staging or production).
**CD (Continuous Deployment):** Every passing commit auto-deploys to production.

---

## Beginner Theory

### CI/CD Pipeline Stages

```
Developer pushes code
        │
        ▼
┌─────────────────────────────────────────────────────────┐
│                      CI Stage                           │
│  1. Code Checkout & Setup                               │
│  2. Dependency Install (cached)                         │
│  3. Lint + Type Check                    (< 2 min)      │
│  4. Unit Tests + Coverage                (< 5 min)      │
│  5. Integration Tests (with test DB)     (< 10 min)     │
│  6. Security Scan (Trivy, Snyk, SAST)   (< 5 min)      │
│  7. Build (Docker image or bundle)       (< 5 min)      │
│  8. Push to Registry                                    │
└────────────────────────┬────────────────────────────────┘
                         │ (all gates pass)
                         ▼
┌─────────────────────────────────────────────────────────┐
│                   CD Staging Stage                      │
│  9. Deploy to staging environment                       │
│  10. Run E2E / smoke tests                              │
│  11. Performance test baseline                          │
│  12. Manual QA / approval (optional)                    │
└────────────────────────┬────────────────────────────────┘
                         │ (approved)
                         ▼
┌─────────────────────────────────────────────────────────┐
│                CD Production Stage                      │
│  13. Deploy to production (blue-green / canary)         │
│  14. Health check                                       │
│  15. Synthetic monitoring                               │
│  16. Notification (Slack/PagerDuty)                     │
└─────────────────────────────────────────────────────────┘
```

---

## Basic Examples

### Complete Pipeline with Quality Gates

```yaml
# .github/workflows/pipeline.yml
name: Full CI/CD Pipeline

on:
  push:
    branches: [main, "release/*"]
  pull_request:
    branches: [main]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: ${{ github.ref != 'refs/heads/main' }}  # cancel PR runs, not main

jobs:
  # ─── Stage 1: Quality Gates ─────────────────────────────
  quality-gates:
    name: Quality Gates
    runs-on: ubuntu-latest
    outputs:
      should-deploy: ${{ steps.check.outputs.should-deploy }}

    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0                         # full history for coverage diff

      - uses: actions/setup-node@v4
        with: { node-version: "22", cache: "npm" }

      - run: npm ci

      - name: Lint
        run: npm run lint

      - name: Type Check
        run: npm run typecheck

      - name: Unit Tests
        run: npm run test:unit -- --coverage

      - name: Coverage Gate (must be ≥ 80%)
        run: |
          COVERAGE=$(node -e "const c = require('./coverage/coverage-summary.json'); console.log(c.total.lines.pct)")
          echo "Coverage: $COVERAGE%"
          if (( $(echo "$COVERAGE < 80" | bc -l) )); then
            echo "FAIL: Coverage $COVERAGE% is below 80% threshold"
            exit 1
          fi

      - name: Check for secrets in code
        uses: trufflesecurity/trufflehog@main
        with:
          extra_args: --only-verified

      - id: check
        run: echo "should-deploy=${{ github.ref == 'refs/heads/main' }}" >> $GITHUB_OUTPUT

  # ─── Stage 2: Integration Tests ─────────────────────────
  integration-tests:
    name: Integration Tests
    runs-on: ubuntu-latest
    needs: quality-gates

    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_DB:       test
          POSTGRES_USER:     test
          POSTGRES_PASSWORD: test
        ports: ["5432:5432"]
        options: --health-cmd pg_isready --health-interval 5s --health-retries 10
      redis:
        image: redis:7-alpine
        ports: ["6379:6379"]
        options: --health-cmd "redis-cli ping" --health-interval 5s --health-retries 10

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "22", cache: "npm" }
      - run: npm ci
      - run: npm run db:migrate
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/test
      - run: npm run test:integration
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/test
          REDIS_URL:    redis://localhost:6379

  # ─── Stage 3: Build & Scan ──────────────────────────────
  build-and-scan:
    name: Build & Security Scan
    runs-on: ubuntu-latest
    needs: [quality-gates, integration-tests]
    permissions:
      id-token: write        # for AWS OIDC
      security-events: write # for SARIF upload

    steps:
      - uses: actions/checkout@v4

      - uses: docker/setup-buildx-action@v3

      - name: Configure AWS credentials (OIDC — no long-lived keys)
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume:  ${{ secrets.AWS_ROLE_ARN }}
          aws-region:      us-east-1

      - name: Login to ECR
        id: ecr
        uses: aws-actions/amazon-ecr-login@v2

      - name: Build & Push Docker image
        uses: docker/build-push-action@v5
        with:
          context:    .
          push:       true
          tags: |
            ${{ steps.ecr.outputs.registry }}/myapp:${{ github.sha }}
            ${{ steps.ecr.outputs.registry }}/myapp:latest
          cache-from: type=gha
          cache-to:   type=gha,mode=max

      - name: Security scan image
        uses: aquasecurity/trivy-action@master
        with:
          image-ref:  ${{ steps.ecr.outputs.registry }}/myapp:${{ github.sha }}
          severity:   CRITICAL
          exit-code:  1                # fail if CRITICAL vulnerabilities found
          format:     sarif
          output:     trivy.sarif

      - uses: github/codeql-action/upload-sarif@v3
        with: { sarif_file: trivy.sarif }

  # ─── Stage 4: Deploy Staging ────────────────────────────
  deploy-staging:
    name: Deploy to Staging
    runs-on: ubuntu-latest
    needs: build-and-scan
    if: github.ref == 'refs/heads/main'
    environment:
      name: staging
      url:  https://staging.myapp.com

    steps:
      - uses: actions/checkout@v4
      - uses: aws-actions/configure-aws-credentials@v4
        with: { role-to-assume: ${{ secrets.STAGING_AWS_ROLE_ARN }}, aws-region: us-east-1 }
      - name: Deploy to staging ECS
        run: |
          aws ecs update-service \
            --cluster myapp-staging \
            --service myapp \
            --force-new-deployment \
            --task-definition $(aws ecs describe-task-definition --task-definition myapp --query 'taskDefinition.taskDefinitionArn' --output text)
      - name: Wait for stable deployment
        run: aws ecs wait services-stable --cluster myapp-staging --services myapp

  # ─── Stage 5: Deploy Production ─────────────────────────
  deploy-production:
    name: Deploy to Production
    runs-on: ubuntu-latest
    needs: deploy-staging
    environment:
      name: production
      url:  https://myapp.com

    steps:
      - uses: actions/checkout@v4
      - uses: aws-actions/configure-aws-credentials@v4
        with: { role-to-assume: ${{ secrets.PROD_AWS_ROLE_ARN }}, aws-region: us-east-1 }
      - name: Deploy to production
        run: |
          aws ecs update-service \
            --cluster myapp-production \
            --service myapp \
            --force-new-deployment
      - name: Wait for stable deployment
        run: aws ecs wait services-stable --cluster myapp-production --services myapp
      - name: Production health check
        run: |
          for i in {1..10}; do
            curl -sf https://myapp.com/health && break
            sleep 10
          done
```

---

## Intermediate Concepts

### Deployment Strategies

```bash
# ─── 1. Rolling Deployment ───────────────────────────────
# Replace instances one at a time
# Good: simple, no extra infrastructure
# Bad: during deploy, old + new version serve traffic simultaneously

# ECS rolling update (built-in)
aws ecs update-service --cluster prod --service myapp --force-new-deployment
# minimum-healthy-percent: 50 means replace 50% at a time

# ─── 2. Blue-Green Deployment ───────────────────────────
# Run two identical environments; switch traffic with zero downtime
# Good: instant rollback (switch back to blue)
# Bad: needs 2x infrastructure during deploy

# With AWS Application Load Balancer
# Blue: target group pointing to current version
# Green: new target group with new version
aws elbv2 modify-listener \
  --listener-arn $LISTENER_ARN \
  --default-actions Type=forward,TargetGroupArn=$GREEN_TG_ARN
# Rollback: switch back to blue TG

# ─── 3. Canary Deployment ───────────────────────────────
# Route small % of traffic to new version, gradually increase
# Good: limit blast radius, measure real user impact
# Bad: complex traffic routing needed

# 5% of traffic → new version, 95% → old version
aws elbv2 modify-listener --listener-arn $LISTENER_ARN \
  --default-actions Type=forward,ForwardConfig='{
    "TargetGroups": [
      {"TargetGroupArn": "'$BLUE_TG'", "Weight": 95},
      {"TargetGroupArn": "'$GREEN_TG'", "Weight": 5}
    ]
  }'

# After validation: 100% to new version
# On failure: 100% back to old version

# ─── 4. Feature Flags ───────────────────────────────────
# Deploy code but disable new features behind a flag
# Good: decouple deploy from release
# Bad: flag cleanup debt

# Using LaunchDarkly / GrowthBook / custom feature flags
if (featureFlags.isEnabled("new-checkout", userId)) {
  return newCheckoutFlow(cart);
} else {
  return legacyCheckoutFlow(cart);
}
```

### Rollback Strategy

```bash
#!/usr/bin/env bash
# rollback.sh — revert to previous Docker image

set -euo pipefail

SERVICE_NAME="myapp"
CLUSTER="myapp-production"

# Get previous task definition (one revision back)
CURRENT_REVISION=$(aws ecs describe-services \
  --cluster $CLUSTER \
  --services $SERVICE_NAME \
  --query 'services[0].taskDefinition' \
  --output text)

FAMILY=$(echo $CURRENT_REVISION | cut -d: -f1)
CURRENT_REV_NUM=$(echo $CURRENT_REVISION | cut -d: -f2)
PREVIOUS_REV=$((CURRENT_REV_NUM - 1))

echo "Rolling back from $CURRENT_REVISION to ${FAMILY}:${PREVIOUS_REV}"

# Update service to previous task definition
aws ecs update-service \
  --cluster $CLUSTER \
  --service $SERVICE_NAME \
  --task-definition "${FAMILY}:${PREVIOUS_REV}" \
  --force-new-deployment

aws ecs wait services-stable --cluster $CLUSTER --services $SERVICE_NAME

echo "Rollback complete. Now running ${FAMILY}:${PREVIOUS_REV}"

# Alert
curl -X POST $SLACK_WEBHOOK -H 'Content-type: application/json' \
  --data "{\"text\": \"ROLLBACK: $SERVICE_NAME reverted to revision $PREVIOUS_REV\"}"
```

---

## Interview Preparation

**Q1: What is the difference between Continuous Delivery and Continuous Deployment?**
A: Continuous Delivery: every commit that passes the pipeline is deployable to production automatically, but the actual production push requires a manual approval/trigger. This is appropriate for organizations that want control over when features go live (release management, marketing coordination). Continuous Deployment: every commit that passes the pipeline is automatically deployed to production without human intervention. This requires very high test coverage, feature flags for incomplete features, and excellent monitoring/rollback. Most mature companies practice Continuous Delivery with short-lived feature flags and automated canary deployment.

**Q2: What is blue-green deployment and how does it enable zero-downtime releases?**
A: Blue-green maintains two identical production environments: blue (current live) and green (new version). When deploying: deploy new version to green, run smoke tests on green, switch the load balancer/DNS to point to green (instant, no traffic interruption). Users now hit green. Rollback: switch LB back to blue (also instant). No downtime because the traffic switch is atomic. Tradeoff: requires 2x infrastructure cost during deployments. Best practice: keep blue running for 30+ minutes after switch so rollback remains available, then terminate blue.

**Q3: What quality gates should block a deployment to production?**
A: Minimum quality gates: test suite must pass (all tests green), coverage must meet threshold (≥ 80% typical), linting and type checking must pass, no critical security vulnerabilities (Trivy/Snyk scan), no secrets committed (TruffleHog), build must succeed. Additional production-specific gates: E2E tests on staging must pass, Lighthouse performance score must not regress, database migration dry-run on staging must succeed, required reviewer approval (manual gate). The goal: catch problems before users do, while keeping the pipeline fast enough that developers get feedback within 15 minutes.

---

## Practical Tasks

### Beginner (10 Tasks)
1. Create a CI pipeline with lint, test, and build stages.
2. Add a coverage gate that fails if coverage < 80%.
3. Add `needs:` to sequence jobs correctly.
4. Add a manual approval step for production deployment.
5. Use `concurrency` to prevent duplicate deployments.
6. Add a health check step after deployment.
7. Trigger pipeline only on push to `main`.
8. Add environment variables for staging and production separately.
9. Add Slack notification on success and failure.
10. Test rollback by deploying the previous SHA.

### Intermediate (10 Tasks)
1. Implement blue-green deployment with an ALB listener rule swap.
2. Add security scan with Trivy blocking on CRITICAL vulnerabilities.
3. Set up OIDC-based AWS authentication (no static keys).
4. Implement pipeline with staging → production gate.
5. Add E2E tests (Playwright) in the staging stage.
6. Implement canary deployment (5% → 50% → 100%).
7. Build a rollback workflow that reverts to the previous image.
8. Add secret scanning with TruffleHog.
9. Implement parallel test execution across 4 runners.
10. Add Dependabot for automatic dependency updates.

### Advanced (10 Tasks)
1. Build a fully automated release pipeline (tag → changelog → GitHub release → deploy).
2. Implement progressive delivery with LaunchDarkly feature flags.
3. Add automated database migration testing in CI.
4. Implement synthetic canary monitoring post-deployment.
5. Build a multi-region deployment pipeline (us-east-1 → eu-west-1).
6. Add DAST (dynamic application security testing) in the pipeline.
7. Implement GitOps with ArgoCD and GitHub Actions.
8. Add performance regression testing in CI with k6.
9. Build a self-healing pipeline: auto-rollback on error rate spike.
10. Implement full SLSA Level 3 supply chain security.

---

## Self Assessment
1. What is CI and what does it automate?
2. What is the difference between CD (Delivery) and CD (Deployment)?
3. What are quality gates?
4. What is blue-green deployment?
5. What is canary deployment?
6. What is a rollback?
7. What is OIDC authentication for CI/CD?
8. What is a release strategy?
9. What is the main benefit of feature flags in CD?
10. What is GitOps?

---

## Cheat Sheet

```yaml
# Pipeline structure
jobs:
  lint:     { runs-on: ubuntu-latest }
  test:     { needs: lint }
  build:    { needs: test }
  staging:  { needs: build, environment: staging, if: "github.ref == 'refs/heads/main'" }
  production: { needs: staging, environment: production }

# Quality gate pattern
- name: Coverage check
  run: |
    PCT=$(node -p "require('./coverage/coverage-summary.json').total.lines.pct")
    [ $(echo "$PCT >= 80" | bc) -eq 1 ] || { echo "Coverage $PCT% < 80%"; exit 1; }

# AWS OIDC (no keys!)
- uses: aws-actions/configure-aws-credentials@v4
  with: { role-to-assume: arn:aws:iam::123:role/GitHubActionsRole, aws-region: us-east-1 }
  permissions: { id-token: write }

# Deploy strategies
# Rolling:    aws ecs update-service --force-new-deployment
# Blue-green: aws elbv2 modify-listener --default-actions Type=forward,TargetGroupArn=$NEW_TG
# Canary:     aws elbv2 modify-listener (weighted target groups 5%/95%)
# Rollback:   aws ecs update-service --task-definition family:prev-revision
```
