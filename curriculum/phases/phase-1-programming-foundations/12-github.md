# Phase 1 — Chapter 12: GitHub

> *"GitHub is where the world builds software."*

---

## Chapter Overview

### Why GitHub Exists

Git solves version control locally. GitHub solves **collaboration at scale**. Before GitHub (founded 2008), sharing code required email patches, FTP uploads, or setting up your own Git server. GitHub provided:
- A hosted Git remote for every developer
- A web UI to browse code, commits, and branches
- Pull Requests as a structured code review workflow
- Issues for bug tracking and feature requests
- Actions for CI/CD automation

**GitHub's impact:** It became the de facto platform for open source (200M+ repositories) and is standard at most tech companies. In 2018, Microsoft acquired GitHub for $7.5 billion.

**Key alternatives:**
- **GitLab**: Self-hosted option, built-in CI/CD, popular in enterprise
- **Bitbucket**: Atlassian ecosystem (Jira integration)
- **Azure DevOps**: Microsoft enterprise toolchain
- **Gitea**: Lightweight self-hosted option

### Why You Need GitHub (Beyond Storage)

1. **Portfolio**: Your public profile is your resume proof
2. **Pull Requests**: Industry-standard code review workflow
3. **GitHub Actions**: Free CI/CD for public repos
4. **GitHub Copilot**: AI pair programming
5. **GitHub Packages**: Host npm, Docker, Maven packages
6. **GitHub Pages**: Free static site hosting
7. **GitHub Codespaces**: Cloud development environments

---

## Beginner Theory

### Core Concepts

**Repository (Repo)**: A project hosted on GitHub. Contains all files, history, issues, PRs, and settings.

**Fork**: Your personal copy of someone else's repository. Changes don't affect the original. Used for open source contributions.

**Pull Request (PR)**: A request to merge changes from one branch into another. Contains diffs, discussion, reviews, and CI status.

**Issue**: A bug report, feature request, or discussion. Can be linked to PRs, assigned to team members, labeled, and organized into milestones.

**GitHub Actions**: CI/CD workflows defined in YAML files (`.github/workflows/`) that run on GitHub's infrastructure.

**GitHub Pages**: Free static website hosting directly from a repo. Used for docs, portfolios, and project sites.

---

## Basic Examples

### Setting Up Your GitHub Account

```bash
# Generate SSH key for authentication
ssh-keygen -t ed25519 -C "you@example.com"
# Add to ssh-agent
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519

# Copy public key to GitHub:
# Settings → SSH and GPG keys → New SSH key
cat ~/.ssh/id_ed25519.pub

# Test connection
ssh -T git@github.com
# Hi username! You've successfully authenticated...

# Configure Git to use SSH
git remote set-url origin git@github.com:username/repo.git
```

### GitHub CLI (gh)

The GitHub CLI (`gh`) lets you use GitHub from the terminal without the web UI.

```bash
# Install (Windows)
winget install GitHub.cli

# Authenticate
gh auth login
# Choose: GitHub.com → SSH → generate new key → authenticate via browser

# Create repository
gh repo create my-app --public --description "My awesome app" --clone

# View repository info
gh repo view

# Create a PR
gh pr create --title "feat: add authentication" --body "Adds JWT auth"

# List PRs
gh pr list

# Review a PR
gh pr checkout 42                    # check out PR locally
gh pr review 42 --approve
gh pr review 42 --request-changes --body "Please add tests"

# Merge a PR
gh pr merge 42 --squash --delete-branch

# List issues
gh issue list
gh issue create --title "Bug: login fails on mobile"
gh issue close 10

# Run workflows
gh workflow list
gh workflow run deploy.yml
gh run list
gh run view 1234567

# Clone any repository
gh repo clone owner/repo
```

### Creating and Managing a Repository

```bash
# Initialize local project and push to GitHub
mkdir my-project && cd my-project
git init
echo "# My Project" > README.md
echo "node_modules/" > .gitignore
git add .
git commit -m "chore: initial commit"

# Create repo on GitHub and push
gh repo create my-project --public --push --source=.

# Or manually:
# 1. Go to github.com/new
# 2. Fill in name and settings
# 3. Copy the remote URL
git remote add origin git@github.com:username/my-project.git
git push -u origin main
```

---

## Intermediate Concepts

### Pull Request Workflow

**The PR lifecycle:**
1. Create a feature branch locally
2. Commit changes
3. Push branch to GitHub
4. Open a PR from branch → main
5. Request reviewers
6. Address review comments
7. CI passes
8. PR is approved
9. Merge (squash/merge commit/rebase)
10. Branch auto-deleted

```bash
# Create feature branch
git switch -c feature/user-auth

# Make commits
git add .
git commit -m "feat(auth): add JWT login endpoint"

# Push to GitHub
git push -u origin feature/user-auth

# Open PR via CLI
gh pr create \
  --title "feat: add JWT authentication" \
  --body "$(cat <<'EOF'
## Summary
- Adds POST /auth/login endpoint
- Returns JWT access token (15min) + refresh token (7d)
- Implements rate limiting (5 attempts per IP per minute)

## Testing
- Unit tests in src/auth/__tests__/
- Integration test: test/auth.test.ts
- Manual test: see TESTING.md

## Checklist
- [x] Tests added
- [x] Documentation updated
- [ ] Security review requested
EOF
)" \
  --assignee "@me" \
  --label "feature,auth"

# After receiving review comments:
git add -p
git commit -m "fix(auth): address review feedback - add input validation"
git push    # PR updates automatically

# Check PR status
gh pr status
gh pr checks 42
```

### GitHub Actions (CI/CD)

GitHub Actions are defined as YAML workflow files in `.github/workflows/`.

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  lint-and-test:
    runs-on: ubuntu-latest

    strategy:
      matrix:
        node-version: [20.x, 22.x]

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Run linter
        run: npm run lint

      - name: Run type check
        run: npm run typecheck

      - name: Run tests
        run: npm test -- --coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          token: ${{ secrets.CODECOV_TOKEN }}
```

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production    # requires manual approval

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "22"
          cache: "npm"

      - name: Install & Build
        run: |
          npm ci
          npm run build

      - name: Deploy to AWS
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          AWS_REGION: us-east-1
        run: |
          npm install -g aws-cdk
          cdk deploy --require-approval never
```

```yaml
# .github/workflows/release.yml
# Automated release using Conventional Commits
name: Release

on:
  push:
    branches: [main]

permissions:
  contents: write
  pull-requests: write

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0   # need full history for changelog

      - uses: google-github-actions/release-please-action@v4
        with:
          release-type: node
          token: ${{ secrets.GITHUB_TOKEN }}
```

### Branch Protection Rules

Prevent direct pushes to main; require PR review and CI before merge.

```bash
# Via GitHub CLI
gh api repos/{owner}/{repo}/branches/main/protection \
  --method PUT \
  --field required_status_checks='{"strict":true,"contexts":["lint-and-test"]}' \
  --field enforce_admins=true \
  --field required_pull_request_reviews='{"required_approving_review_count":1,"dismiss_stale_reviews":true}' \
  --field restrictions=null
```

Or via **Settings → Branches → Add rule**:
- Branch name pattern: `main`
- ✅ Require a pull request before merging
  - Required approvals: 1
  - ✅ Dismiss stale reviews when new commits are pushed
- ✅ Require status checks to pass before merging
  - ✅ Require branches to be up to date
  - Status checks: `lint-and-test`
- ✅ Require conversation resolution before merging
- ✅ Include administrators

### GitHub Secrets and Environments

```bash
# Store secrets (never commit credentials)
gh secret set AWS_ACCESS_KEY_ID --body "AKIA..."
gh secret set DATABASE_URL --body "postgresql://..."
gh secret list

# Secrets are available in Actions as:
# ${{ secrets.AWS_ACCESS_KEY_ID }}

# Environments (for deploy gates)
# Settings → Environments → New environment: "production"
# Add required reviewers — manual approval gate before deploy
```

### Issues and Project Management

```bash
# Create issue
gh issue create \
  --title "Bug: cart total shows negative on empty cart" \
  --body "Steps to reproduce:
1. Add item to cart
2. Remove all items
3. Total shows -$0.00

Expected: $0.00" \
  --label "bug,priority:high" \
  --assignee "username"

# Close issue via commit message
git commit -m "fix(cart): prevent negative total on empty cart

Closes #42"

# Issue templates (.github/ISSUE_TEMPLATE/bug_report.md)
# PR templates (.github/PULL_REQUEST_TEMPLATE.md)
```

```markdown
<!-- .github/PULL_REQUEST_TEMPLATE.md -->
## Description
Brief description of what this PR does.

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
Describe how you tested the changes.

## Checklist
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No console.log statements
- [ ] No commented-out code
- [ ] Self-reviewed the diff
```

---

## Advanced Concepts

### GitHub Actions — Advanced Patterns

```yaml
# Reusable workflow
# .github/workflows/reusable-test.yml
name: Reusable Test

on:
  workflow_call:
    inputs:
      node-version:
        required: true
        type: string
    secrets:
      NPM_TOKEN:
        required: true

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ inputs.node-version }}
      - run: npm ci
      - run: npm test

---

# Calling the reusable workflow
# .github/workflows/ci.yml
jobs:
  test-node-20:
    uses: ./.github/workflows/reusable-test.yml
    with:
      node-version: "20"
    secrets:
      NPM_TOKEN: ${{ secrets.NPM_TOKEN }}

  test-node-22:
    uses: ./.github/workflows/reusable-test.yml
    with:
      node-version: "22"
    secrets:
      NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

```yaml
# Caching dependencies for speed
- name: Cache node modules
  uses: actions/cache@v4
  with:
    path: ~/.npm
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
    restore-keys: |
      ${{ runner.os }}-node-

# Parallel jobs with needs dependency
jobs:
  lint:
    runs-on: ubuntu-latest
    steps: [ ... ]

  test:
    runs-on: ubuntu-latest
    steps: [ ... ]

  deploy:
    needs: [lint, test]         # run only after both pass
    runs-on: ubuntu-latest
    steps: [ ... ]

# Docker image build and push
- name: Build and push Docker image
  uses: docker/build-push-action@v5
  with:
    context: .
    push: true
    tags: |
      ghcr.io/owner/app:latest
      ghcr.io/owner/app:${{ github.sha }}
    cache-from: type=gha
    cache-to: type=gha,mode=max
```

### Dependabot

Automatically open PRs to update dependencies:

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
    reviewers:
      - "your-username"
    labels:
      - "dependencies"
    groups:
      dev-dependencies:
        dependency-type: "development"
        patterns: ["*"]
    ignore:
      - dependency-name: "lodash"
        update-types: ["version-update:semver-major"]

  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "monthly"
```

### GitHub Packages (Private npm Registry)

```bash
# Publish your package to GitHub Packages
# package.json
{
  "name": "@your-username/my-package",
  "publishConfig": {
    "registry": "https://npm.pkg.github.com"
  }
}

# .npmrc
@your-username:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}

# Publish
npm publish

# Install
npm install @your-username/my-package
```

### GitHub Pages + GitHub Actions

```yaml
# .github/workflows/deploy-docs.yml
name: Deploy Documentation

on:
  push:
    branches: [main]
    paths: ['docs/**', 'mkdocs.yml']

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.x'
      - run: pip install mkdocs-material
      - run: mkdocs build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: site/
      - id: deployment
        uses: actions/deploy-pages@v4
```

### Code Security — GitHub Advanced Security

```yaml
# .github/workflows/codeql.yml
name: CodeQL Security Analysis

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  schedule:
    - cron: "0 6 * * 1"    # Every Monday at 6am

jobs:
  analyze:
    runs-on: ubuntu-latest
    permissions:
      security-events: write

    steps:
      - uses: actions/checkout@v4
      - uses: github/codeql-action/init@v3
        with:
          languages: javascript-typescript

      - uses: github/codeql-action/autobuild@v3

      - uses: github/codeql-action/analyze@v3
```

---

## Industry Usage

**How professional teams use GitHub:**

- **PR-only merges**: Direct pushes to main are blocked; all changes go through PRs
- **CI as gate**: No PR merges without CI passing
- **Code owners**: `.github/CODEOWNERS` ensures domain experts review relevant changes
- **Conventional commits + release-please**: Automated changelog and versioning
- **Monorepo + path filters**: GitHub Actions only run affected workflows on file changes
- **Dependabot**: Automated dependency updates prevent security debt
- **GitHub Discussions**: Community Q&A for open source projects
- **GitHub Projects**: Kanban boards for sprint planning

```
# .github/CODEOWNERS
# Global owner
* @tech-lead

# Infrastructure files require DevOps review
/.github/workflows/   @devops-team
/terraform/           @devops-team

# Database changes require DBA review
/src/migrations/      @dba-team @tech-lead

# Security-sensitive code
/src/auth/            @security-team @tech-lead
```

---

## Security

```bash
# GitHub secrets — never hardcode credentials
# Store in: Settings → Secrets → Actions

# Secret scanning (automatic on public repos)
# GitHub scans for committed API keys, tokens, passwords
# Set up in Settings → Security → Secret scanning

# Vulnerability alerts
# Settings → Security → Dependabot alerts
# GitHub auto-opens PRs for vulnerable dependencies

# OSSF Scorecard — measures open source project security hygiene
name: Scorecard
on:
  schedule:
    - cron: "0 12 * * 6"   # weekly
jobs:
  scorecard:
    runs-on: ubuntu-latest
    steps:
      - uses: ossf/scorecard-action@v2.4.0
        with:
          results_format: sarif
          publish_results: true

# Repository security settings
# Require signed commits
# Enable private vulnerability reporting
# Set up security policy (SECURITY.md)
```

```markdown
<!-- SECURITY.md -->
# Security Policy

## Supported Versions
| Version | Supported |
|---------|-----------|
| 2.x     | ✅        |
| 1.x     | ❌        |

## Reporting a Vulnerability
**Do not open a public issue for security vulnerabilities.**

Please email security@yourcompany.com with:
- Description of the vulnerability
- Steps to reproduce
- Potential impact

We'll respond within 48 hours and aim to patch critical issues within 7 days.
```

---

## Performance

```yaml
# Optimize GitHub Actions for speed
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      # Use specific version tags (not latest) for caching stability
      - uses: actions/checkout@v4

      # Cache all node_modules — saves ~30-60 seconds
      - name: Cache dependencies
        id: cache
        uses: actions/cache@v4
        with:
          path: node_modules
          key: ${{ runner.os }}-node-${{ hashFiles('package-lock.json') }}

      - name: Install (only on cache miss)
        if: steps.cache.outputs.cache-hit != 'true'
        run: npm ci

      # Run tests in parallel
      - run: npm test -- --runInBand=false --maxWorkers=4

      # Skip on [skip ci] in commit message
      # Add to PR title: [skip ci] for documentation PRs
```

---

## Debugging

```bash
# Debug GitHub Actions locally with act
npm install -g act
act push              # simulate push event locally
act pull_request      # simulate PR event
act -j deploy         # run specific job

# Debug a failing workflow step
# Add this step temporarily:
- name: Debug environment
  run: |
    echo "Node: $(node -v)"
    echo "npm: $(npm -v)"
    echo "Working dir: $(pwd)"
    ls -la

# Enable debug logging
# Go to Settings → Secrets → Add secret:
# ACTIONS_RUNNER_DEBUG = true
# ACTIONS_STEP_DEBUG = true

# Check workflow run logs
gh run list
gh run view 1234567890 --log

# Re-run failed jobs
gh run rerun 1234567890 --failed

# Cancel a running workflow
gh run cancel 1234567890
```

---

## Interview Preparation

**Q1: What is a Pull Request? How does the PR workflow improve code quality?**
A: A Pull Request is a request to merge code from one branch into another. It provides a structured venue for code review: reviewers see the diff, leave inline comments, and can approve or request changes. CI runs automatically, catching test failures and lint errors before merge. The workflow improves quality by enforcing peer review, catching issues early, sharing knowledge across the team, and creating a discussion thread that serves as documentation for why changes were made.

**Q2: What is GitHub Actions? How does it work?**
A: GitHub Actions is a CI/CD platform built into GitHub. Workflows are YAML files in `.github/workflows/` that define jobs triggered by GitHub events (push, PR, schedule). Each job runs on a virtual machine (runner), executes a series of steps, and can use prebuilt actions from the marketplace. Actions support matrix builds, reusable workflows, secrets for sensitive data, and can deploy to any cloud provider.

**Q3: How do you handle secrets in GitHub Actions?**
A: Store secrets in GitHub Settings → Secrets → Actions. Reference them in workflows as `${{ secrets.SECRET_NAME }}`. Never print secrets (they're masked in logs). Use environments for deployment secrets that require approval gates. Rotate secrets regularly. For sensitive workloads, use OIDC (OpenID Connect) to get short-lived cloud provider tokens instead of long-lived keys.

**Q4: What is a fork vs. a branch?**
A: A branch is a diverging line of development within the same repository. A fork is a complete copy of a repository in a different GitHub account. Forks are used for open source contributions — you fork the repo to your account, make changes in a branch, then open a PR back to the original repository. Branches are used within a team on the same repository.

**Q5: What is CODEOWNERS and why is it useful?**
A: CODEOWNERS is a file that maps file paths or patterns to GitHub users or teams. When a PR touches a file matching a pattern, the corresponding owner is automatically added as a required reviewer. This ensures security-sensitive code (auth, payment) is reviewed by domain experts, and prevents unreviewed changes to critical infrastructure.

**Q6: What are the differences between merge commit, squash merge, and rebase merge?**
A: **Merge commit**: preserves all feature branch commits plus adds a merge commit. Full history, but can be noisy. **Squash merge**: condenses all feature commits into one commit on main. Clean main history; detail in PR. **Rebase merge**: replays feature commits on top of main without a merge commit. Linear history, preserves individual commits. Best practice: use squash for feature branches (clean history), rebase for sync.

---

## Practical Tasks

### Beginner (10 Tasks)
1. Set up SSH key authentication with GitHub and test with `ssh -T git@github.com`.
2. Create a public repository with README, .gitignore (Node), and MIT license via the GitHub UI.
3. Fork an open-source project, make a meaningful README improvement, and submit a PR.
4. Set up GitHub CLI (`gh`) and create a repository entirely from the terminal.
5. Create a GitHub Actions workflow that installs Node.js and runs `npm test` on every push.
6. Use `gh issue create` to file a well-formatted bug report for a real project.
7. Set up a `.github/PULL_REQUEST_TEMPLATE.md` for a project.
8. Enable Dependabot security updates on a Node.js project.
9. Create a GitHub profile README (`username/username` repo) with your professional summary.
10. Set up GitHub Pages to host a static site from the `docs/` folder.

### Intermediate (10 Tasks)
1. Set up branch protection rules on main: require 1 review + CI passing before merge.
2. Build a CI/CD pipeline: test on PR, deploy to staging on push to main.
3. Implement a matrix build that tests against Node.js 20 and 22.
4. Set up CODEOWNERS so auth files require review from a specific GitHub user.
5. Build a workflow that auto-labels PRs based on which files they touch.
6. Set up Dependabot with weekly updates grouped by dependency type.
7. Implement semantic versioning automation with `release-please` or `semantic-release`.
8. Set up CodeQL security scanning in a workflow.
9. Create a reusable workflow and call it from two different workflows.
10. Build a workflow that runs only on changes to specific paths (`paths:` filter).

### Advanced (10 Tasks)
1. Implement OIDC authentication from GitHub Actions to AWS (no long-lived keys).
2. Build a custom GitHub Action (JavaScript or Docker) and publish it to the marketplace.
3. Set up a self-hosted runner and use it for a private workflow.
4. Implement a deployment workflow with manual approval gate using GitHub Environments.
5. Build a monorepo CI setup that only runs affected package tests on PR.
6. Set up GitHub Advanced Security (CodeQL + secret scanning + Dependabot) for an org.
7. Create an automated changelog workflow using Conventional Commits + GitHub releases.
8. Build a workflow that commentss on PRs with performance benchmark results.
9. Implement a GitHub App (not Actions) that enforces commit message format via the Checks API.
10. Set up GitHub Packages as a private npm registry and publish/consume a package in CI.

---

## Mini Project

**Team Workflow Setup**: Bootstrap a complete GitHub setup for a team project:
- Repository with README, .gitignore, CODEOWNERS, PR template, issue templates
- Branch protection on main
- CI workflow: lint, typecheck, test, coverage report
- CD workflow: deploy to staging (simulate with echo commands)
- Dependabot configuration
- CodeQL security scanning
- A documented contribution guide (CONTRIBUTING.md)

---

## Production Project

**GitHub Actions Workflow Library**: Build a collection of reusable GitHub Actions workflows for a company:
- Reusable Node.js test workflow (matrix, caching)
- Reusable Docker build-push workflow (GHCR, semantic tags)
- Reusable deploy workflow with environment gates
- Reusable release workflow (changelog, GitHub release, npm publish)
- Security scanning workflow (CodeQL + Trivy container scan)
- PR size labeler (auto-label based on lines changed)

---

## Capstone Project

**Open Source Contribution Journey**: Make a meaningful contribution to a popular open-source project on GitHub:
1. Find a project with `good first issue` or `help wanted` labels
2. Read CONTRIBUTING.md, set up local dev environment
3. Open an issue to discuss your intended change before coding
4. Fork → branch → implement → test → PR
5. Respond to all reviewer feedback
6. Get your PR merged
7. Write a blog post documenting the process, what you learned, and what surprised you about the codebase

---

## Self Assessment
1. What is the difference between a fork and a branch?
2. What is a Pull Request? What information does it contain?
3. What is GitHub Actions? What file format does it use?
4. How do you store secrets in GitHub Actions? How do you access them?
5. What is CODEOWNERS? Give an example use case.
6. What is the difference between squash merge, merge commit, and rebase merge?
7. What are branch protection rules? List 4 things they can enforce.
8. What is Dependabot? What problems does it solve?
9. What is GitHub Pages? What are its limitations?
10. What is `gh`? How does it improve developer workflow?
11. What are GitHub Environments? Why are they useful for deployments?
12. How does OIDC improve CI/CD security compared to static secrets?
13. What is CodeQL? What does it detect?
14. What is a reusable workflow? When would you create one?
15. What is a self-hosted runner? When would you use one?

---

## Cheat Sheet

### GitHub CLI Daily Commands
```bash
gh repo create name --public --clone    # new repo
gh repo clone owner/repo                # clone
gh pr create --title "" --body ""       # open PR
gh pr list                              # list PRs
gh pr checkout 42                       # check out PR
gh pr merge 42 --squash                 # merge PR
gh issue create --title "" --body ""    # create issue
gh issue list --state open              # list issues
gh issue close 10                       # close issue
gh run list                             # list CI runs
gh run view 123 --log                   # view logs
gh secret set NAME --body "value"       # store secret
gh workflow run deploy.yml              # trigger workflow
```

### GitHub Actions Quick Reference
```yaml
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "22"
          cache: "npm"
      - run: npm ci
      - run: npm test
```

### Key Files
```
.github/
  workflows/
    ci.yml               # CI on PR/push
    deploy.yml           # CD on main merge
    release.yml          # automated releases
  CODEOWNERS             # auto-assign reviewers
  PULL_REQUEST_TEMPLATE.md
  ISSUE_TEMPLATE/
    bug_report.md
    feature_request.md
  dependabot.yml         # auto-update dependencies
SECURITY.md              # vulnerability reporting
CONTRIBUTING.md          # how to contribute
```

### Branch Protection (Recommended)
```
✓ Require PR before merging
✓ Required approvals: 1+
✓ Dismiss stale reviews on new commit
✓ Require status checks to pass
✓ Require branches up to date before merge
✓ Require conversation resolution
✓ Include administrators
```
