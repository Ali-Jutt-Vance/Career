# GitHub and Working Together

> [!GOALS]
> - Explain the difference between Git and GitHub, and what a code-hosting platform adds to a team.
> - Set up GitHub securely: an account with two-factor authentication, SSH keys or tokens, and the `gh` command-line tool.
> - Create a repository, push to it, and give it the files every professional repository has: README, `.gitignore`, licence.
> - Work through the full **pull request** cycle: branch, push, open, review, update, merge — and choose a merge method.
> - Contribute to projects you do not own using **forks**.
> - Protect important branches with rules, and assign reviewers automatically with `CODEOWNERS`.
> - Organise work with issues, labels, milestones and projects, and link it to code.
> - Understand the automation and security features you will build on later: Actions, Dependabot, secret scanning and releases.

## Why this matters

In {{ch:git}} you learned how Git records history and combines branches. But Git alone is a tool for **files and commits**. A team needs more than that:

- A **shared copy** of the repository that everyone can reach, that is backed up, and that controls who can read and change it.
- A place to **propose** a change and **discuss** it before it becomes part of the product: "Here is my fix. Does this look right? Have I missed a case?"
- A way to make sure **nobody** — not even by accident, not even the most senior person — puts untested, unreviewed code into `main`.
- A place to record bugs and planned work, and to connect each change to the reason it was made.
- **Automation**: tests that run on every proposed change, dependencies that update themselves, secrets that are caught before they leak.

**Code-hosting platforms** provide all of this on top of Git. **GitHub** is by far the largest: it is where most open-source software lives, and a very large share of companies use it for their private code. GitLab and Bitbucket offer similar features, and the concepts in this chapter transfer directly to them — GitLab even uses a different name for a pull request (a "merge request"), but it is the same thing.

GitHub also matters for **your career**. Your GitHub profile is often the first thing a technical reviewer looks at: your projects, how you write commit messages, whether your repositories have READMEs and tests. Contributing to open-source projects on GitHub is one of the best ways to show real-world skills before your first job ({{ch:portfolio-and-brand}}).

## The simple idea

Think of Git as the way you keep a detailed diary of your work. GitHub is the **office** where the team meets: a shared filing room holding the official copy of every diary, a meeting room where proposals are discussed before they are approved, a notice board of tasks, and security guards at the door who check that every approved change has been reviewed and tested.

> [!ANALOGY]
> Git is your personal record-keeping system; GitHub is the shared office built around it — official copies, a meeting room for proposals, a task board and guards at the door.
>
> **Where the analogy breaks:** an office has one location and one copy of each document. With Git, every developer has a **full copy** of the whole history; GitHub's copy is special only because the team agrees to treat it as the official one. If GitHub were unavailable for a day, everyone could keep working and committing locally.

## The proper definition and key words

**GitHub** is a web platform that hosts Git repositories and adds collaboration, review, project-management, automation and security features around them.

The key words:

- **Git versus GitHub** — Git is the version control program on your computer. GitHub is a service that hosts repositories. You can use Git without GitHub; you cannot use GitHub without Git.
- **Pull request (PR)** — a proposal to merge the commits of one branch into another, with a page for discussion, review and automated checks. (It is called a "pull request" because you are asking the maintainers to *pull* your changes into their branch.)
- **Review** — another developer reads the changes in a pull request and comments on them, approves them or asks for changes.
- **Fork** — your own copy of someone else's repository on GitHub, used to propose changes to projects you cannot write to.
- **Issue** — a tracked item: a bug report, a feature request or a task, with discussion.
- **Branch protection** (and its newer, more flexible form, **rulesets**) — rules that restrict how a branch can be changed, for example "only through approved pull requests whose checks pass".
- **GitHub Actions** — GitHub's built-in automation system, which runs **workflows** (for example: install, lint, test) when events happen, such as a new pull request.
- **Organisation** — a shared GitHub account for a company or group, owning repositories and containing **teams** with different permissions.

## How it works inside

When you push to GitHub, your Git talks to GitHub's servers over one of two protocols: **HTTPS** or **SSH**. Either way, the exchange is the same one you learned in {{ch:git}}: Git works out which commits the other side is missing, sends those objects, and asks the server to move a branch pointer.

GitHub then stores the repository and, around it, a separate database of everything Git does not know about:

```text
                    ┌────────────────────────────────────────────┐
  git push / fetch  │  GitHub                                    │
  ─────────────────▶│   Git repository (commits, trees, blobs)   │
                    │                                            │
   web, gh, API ───▶│   Platform data (NOT in Git):              │
                    │     pull requests, reviews, comments       │
                    │     issues, labels, projects, milestones   │
                    │     permissions, branch rules, secrets     │
                    │                                            │
                    │   Events ──▶ webhooks, Actions workflows   │
                    └────────────────────────────────────────────┘
```

Two consequences matter:

- **Pull requests, issues and reviews live on GitHub, not in your repository.** Cloning a repository gives you the code and history, not the discussions. If a company moves from GitHub to another platform, migrating this data is a separate task.
- **Everything that happens is an event.** A push, a new pull request, a comment, a label added — each produces an event that can trigger automation: an Actions workflow, or a **webhook** (an HTTP request GitHub sends to another service, such as a chat tool or a deployment system).

## Setting up GitHub securely

### Level 3 — Account and two-factor authentication

Create an account at github.com. Choose a professional username — it appears in your profile URL, which you will put on your CV.

Then, immediately, turn on **two-factor authentication (2FA)** in the security settings. With 2FA, logging in needs your password **and** a second proof, such as a code from an authenticator app or a hardware security key. GitHub requires 2FA for anyone who contributes code. A stolen GitHub account can be used to push malicious code into every project its owner can write to, so this protection matters for everyone who depends on that code.

### Level 3 — Authenticating Git: SSH keys

Git needs to prove who you are when it pushes. GitHub does not accept your account password for Git operations. The two standard methods are **SSH keys** and **access tokens**.

An **SSH key** is a pair of files: a **private key**, which stays secret on your computer, and a **public key**, which you give to GitHub. When you connect, your computer proves it holds the private key without ever sending it, using public-key cryptography (you will learn how this works in {{ch:tls-ssl}}).

Create a key:

```bash
ssh-keygen -t ed25519 -C "sara@example.com"
```

- `-t ed25519` chooses the Ed25519 algorithm: modern, fast and secure.
- `-C` adds a comment (usually your email) to help you recognise the key later.
- Press Enter to accept the default location (`~/.ssh/id_ed25519`), and set a **passphrase**. The passphrase encrypts the private key on disk, so a stolen laptop does not mean a stolen key.

This creates `id_ed25519` (private — never share it) and `id_ed25519.pub` (public). Copy the **public** key's contents into GitHub under *Settings → SSH and GPG keys → New SSH key*. Then test the connection:

```bash
ssh -T git@github.com
```

**Output (with your username):**

```text
Hi sara-ahmed! You've successfully authenticated, but GitHub does not provide shell access.
```

From now on, use SSH addresses for repositories: `git@github.com:sara-ahmed/corner-shop.git`.

### Level 3 — Or: tokens over HTTPS

Alternatively, use HTTPS addresses (`https://github.com/sara-ahmed/corner-shop.git`) with a **personal access token** — a long, random password created for a specific purpose. Prefer **fine-grained tokens**, which can be limited to particular repositories and permissions, and give them an expiry date. Never paste a token into code or commit it ({{ch:git}}). In practice, the easiest way to use HTTPS safely is to let a **credential helper** store the token in your operating system's secure keychain — the GitHub CLI below sets this up for you.

### Level 3 — The GitHub CLI

**`gh`** is GitHub's official command-line tool. It lets you do from the terminal what you would otherwise do on the website: create repositories, open and review pull requests, manage issues, watch automation runs. Install it from cli.github.com, then:

```bash
gh auth login
```

It asks a few questions (GitHub.com, SSH or HTTPS, log in with a browser) and stores your credentials securely. Check it:

```bash
gh auth status
```

You will see the account you are logged in as and the protocol it uses.

## Creating a repository

### Level 3 — From an existing local project

You have the `shop` repository from {{ch:git}} on your computer. Create a matching repository on GitHub and push it, in one command:

```bash
cd shop
gh repo create corner-shop --private --source=. --remote=origin --push
```

- `corner-shop` is the repository name on GitHub.
- `--private` makes it visible only to you and people you invite. (`--public` makes it visible to everyone. Start private if unsure; you can make it public later.)
- `--source=.` uses the current folder.
- `--remote=origin` adds the GitHub repository as a remote called `origin`.
- `--push` pushes your commits.

The same can be done on the website (*New repository*) followed by the Git commands GitHub shows you:

```bash
git remote add origin git@github.com:sara-ahmed/corner-shop.git
git push -u origin main
```

`git remote add` records the address under the name `origin`; `-u` sets `origin/main` as the upstream of your `main` branch ({{ch:git}}).

### Level 4 — Files every professional repository has

**`README.md`** — the front page. GitHub displays it below the file list. A good README answers, in this order:

1. What is this project, in one or two sentences?
2. How do I run it locally? (Exact commands: install, configure, start.)
3. How do I run the tests?
4. How is it structured, and where do I start reading?
5. How do I contribute, and who do I ask?

```text
# Corner Shop

An online shop for a neighbourhood store: product catalogue, cart,
checkout with cash on delivery, and an admin page for stock.

## Running locally

    npm install
    cp .env.example .env      # then fill in the database URL
    npm run dev               # http://localhost:3000

## Tests

    npm test                  # unit tests
    npm run test:integration  # needs a local PostgreSQL

## Project structure

    src/catalogue   products and search
    src/checkout    cart, pricing, orders
    src/admin       stock management
```

**`.gitignore`** — from the very first commit ({{ch:git}}).

**`LICENSE`** — for public code, a licence states what others may legally do with it. Without one, the default under copyright law is that **nobody** may reuse your code, even if it is publicly visible. Common open-source licences are **MIT** (very permissive: do almost anything, keep the copyright notice), **Apache 2.0** (permissive, with an explicit patent grant) and **GPL** (others may use it, but software that includes it must also be released under the GPL). Company code is usually private and governed by employment contracts instead.

**`.env.example`** — a template listing the environment variables the app needs, with placeholder values, so a new developer knows what to configure — while the real `.env` stays ignored.

Optional but common: `CONTRIBUTING.md` (how to contribute), `SECURITY.md` (how to report vulnerabilities privately), `CODEOWNERS` (below), and templates for issues and pull requests (below).

## The pull request workflow

This is the heart of how professional teams work. Every change — a one-line fix or a large feature — follows the same cycle:

```text
  1. update main        git switch main && git pull
  2. branch             git switch -c fix-vat-rounding
  3. commit             small, focused commits, tests included
  4. push               git push -u origin fix-vat-rounding
  5. open a PR          describe what and why; link the issue
  6. checks run         automated tests, lint, type-check
  7. review             teammates comment; you respond and push fixes
  8. merge             once approved and green; delete the branch
  9. deploy            often automatic after merging (see the CI/CD chapter)
```

### Level 3 — Opening a pull request

After pushing a branch, open a PR with the CLI:

```bash
gh pr create --base main --title "Round VAT per line instead of per order" --body-file pr.md
```

or on the website, where GitHub shows a "Compare & pull request" button after a push. The **description** is as important as the code. A useful template:

```text
## What

Round VAT on each order line instead of on the order total.

## Why

Invoices differed by up to a few paisa from the receipt printer, which
rounds per line. Finance asked for them to match exactly. Closes #87.

## How

- `lineTotalPaisa` now rounds VAT per line.
- `orderTotalPaisa` sums the rounded lines.
- No database changes.

## Testing

- New unit tests for the rounding boundary (see `pricing.test.ts`).
- Checked three real invoices from the finance report: all now match.

## Risks

Order totals may change by a few paisa for orders created after release.
Old invoices are not recalculated.
```

This tells the reviewer what to look for, gives them the business reason, and shows how you verified it. A reviewer who understands **why** can find real problems; one who only sees **what** can only check style.

Keep pull requests **small**. A PR of 150 changed lines gets a careful review within hours. A PR of 3,000 lines gets a quick skim days later — or a rubber-stamp approval — and real problems slip through. If a feature is large, split it into a series of small PRs, each one complete and safe to merge.

> [!TIP]
> Open a **draft pull request** early (`gh pr create --draft`) when you want feedback on an approach before the work is finished. Drafts cannot be merged, and they signal "not ready for full review yet". Mark it ready when it is.

### Level 3 — Linking issues

If the description contains a **closing keyword** followed by an issue number — `Closes #87`, `Fixes #87`, `Resolves #87` (and their variants such as `close`, `fixed`, `resolved`) — GitHub links the PR to the issue and **closes the issue automatically** when the PR is merged into the default branch. The issue's history then shows exactly which change fixed it.

### Level 3 — Reviewing and updating

Reviewers read the **Files changed** tab, leave comments on specific lines, and finally submit a review: **Comment** (feedback only), **Approve**, or **Request changes**. You will study the craft of reviewing — what to look for and how to write kind, useful comments — in {{ch:code-review-and-documentation}}.

When a reviewer asks for changes, you do **not** open a new pull request. Make the changes on the same branch, commit, and push; the PR updates automatically and the checks run again. Reply to each comment — "Done in 3f2a1c0", or a reason for disagreeing — and mark conversations as resolved when they are.

You can review a teammate's PR locally, running the code yourself:

```bash
gh pr checkout 42
npm test
```

`gh pr checkout` fetches the PR's branch and switches to it, even if it comes from a fork.

### Level 4 — Keeping a PR up to date

While your PR waits, `main` moves on. If the same lines changed, GitHub shows "This branch has conflicts that must be resolved". Update your branch:

```bash
git switch fix-vat-rounding
git fetch origin
git rebase origin/main          # or: git merge origin/main
# resolve any conflicts, run the tests
git push --force-with-lease     # needed after a rebase
```

Rebasing your **own** PR branch is the normal case where force-pushing is acceptable — the branch belongs to you. Use `--force-with-lease`, never plain `--force` ({{ch:git}}). If teammates have pushed commits to your branch, merge instead of rebasing.

### Level 4 — Merge methods

When a PR is approved and its checks pass, it can be merged. GitHub offers three methods, and repository settings can allow or forbid each:

| Method | What happens on `main` | Pros | Cons |
|---|---|---|---|
| **Create a merge commit** | All the branch's commits, plus a merge commit | Complete, true history | Busy history with "fix typo" commits |
| **Squash and merge** | One new commit containing all the branch's changes | One clean commit per PR; easy to revert a whole feature | Individual commits of the branch are lost from `main` |
| **Rebase and merge** | The branch's commits, replayed onto `main`, no merge commit | Linear history that keeps each commit | Every commit must be clean and working |

**Squash and merge** is very common in teams using short-lived branches: each PR becomes exactly one commit on `main`, whose message can include the PR number, making `git log` a readable list of changes. After merging, delete the branch (GitHub can do this automatically).

```bash
gh pr merge 42 --squash --delete-branch
```

## Forks: contributing to projects you do not own

You cannot push branches to someone else's repository. To contribute to an open-source project, you work through a **fork**: your own copy of their repository on GitHub.

```text
   upstream: example-org/date-utils      (the original; you can read, not write)
        │  fork (on GitHub)
        ▼
   origin:   sara-ahmed/date-utils       (your copy; you can push)
        │  clone
        ▼
   your computer
```

The workflow:

```bash
gh repo fork example-org/date-utils --clone
cd date-utils
git remote -v
```

`gh repo fork --clone` creates the fork, clones it, and sets up **two** remotes: `origin` (your fork) and `upstream` (the original project). Then:

1. Create a branch, commit your change with tests, and push it to **your fork** (`origin`).
2. Open a pull request **from your fork's branch to the upstream repository's main branch**.
3. Before starting new work, update from upstream: `git fetch upstream` and `git rebase upstream/main` (or `gh repo sync`).

### Open-source etiquette

Open-source maintainers are often volunteers with little time. To make your contribution welcome:

- **Read `CONTRIBUTING.md`** and follow its rules: code style, commit format, how tests are run, whether a contributor licence agreement is required.
- **Discuss before large changes.** Open or comment on an issue first: "I'd like to add X; would you accept a PR?" A big unrequested PR is often closed, however good it is.
- **Start small.** Many projects label beginner-friendly issues `good first issue`. Documentation fixes and small, well-tested bug fixes are excellent first contributions.
- **Make the PR easy to accept.** Small, focused, with tests and a clear description. Respond politely to feedback, even when you disagree.
- **Be patient.** A review may take days or weeks.

## Protecting branches

On a team, `main` must never receive untested or unreviewed code — whether by accident, in a hurry, or from a compromised account. **Branch protection rules** (configured in the repository's settings under *Branches*, or through the newer **rulesets** under *Rules*) enforce this on the server. Common rules for `main`:

- **Require a pull request before merging** — nobody can push directly to `main`.
- **Require approvals** — for example, at least one approving review from someone other than the author.
- **Dismiss stale approvals when new commits are pushed** — an approval applies to the code that was reviewed, not to later changes.
- **Require status checks to pass** — the automated tests and linters ({{ch:github-actions}}) must succeed before the merge button is enabled.
- **Require branches to be up to date before merging** — the checks must have run against the latest `main`, so two PRs that each pass alone cannot combine into a broken `main`.
- **Require conversation resolution** — every review comment must be resolved.
- **Block force pushes and deletion** of the branch.
- **Apply the rules to administrators too** — rules that the most senior people can skip "just this once" will be skipped exactly when it matters most.

With these rules, the only way into `main` is: a pull request, reviewed, approved, passing all checks. That is the guard at the office door from the analogy.

### CODEOWNERS

A file at `.github/CODEOWNERS` maps parts of the repository to the people or teams responsible for them:

```text
# Default owners for everything
*                       @corner-shop/backend

# Payment code needs the payments team
/src/checkout/payments/ @corner-shop/payments

# Infrastructure files need the platform team
/infra/                 @corner-shop/platform
*.tf                    @corner-shop/platform
```

When a PR changes files matching a pattern, GitHub automatically requests a review from the listed owners. Combined with the branch rule **"require review from code owners"**, a change to payment code **cannot** be merged without approval from the payments team. Later lines take priority over earlier ones for the same files.

## Organising work: issues, labels, milestones and projects

### Issues

An **issue** records a piece of work: a bug, a feature, a question, a task. A good bug report contains:

```text
Title: Checkout total shows NaN when the cart contains a gift card

Steps to reproduce
1. Add any product to the cart.
2. Add a gift card worth Rs 1,000.
3. Go to checkout.

Expected: total = product price − Rs 1,000
Actual: total shows "Rs NaN"

Environment: production, Chrome 131 on Android. Started after release 2.14.
Order IDs affected: ORD-55102, ORD-55117
```

Clear steps, expected versus actual, environment, and evidence. A report like this can often be fixed within the hour; "checkout is broken" cannot.

**Issue templates** (Markdown or form files in `.github/ISSUE_TEMPLATE/`) prompt people for exactly this information when they open an issue. A **pull request template** (`.github/pull_request_template.md`) pre-fills every PR description with sections like the one shown earlier.

### Labels, assignees and milestones

- **Labels** categorise issues and PRs: `bug`, `feature`, `documentation`, `good first issue`, `priority: high`, `area: checkout`. Teams can filter by them and automate around them.
- **Assignees** show who is working on something. One owner per issue avoids "I thought you were doing it".
- **Milestones** group issues towards a target, such as a release ("v2.15") — and show progress as issues close.

### Projects

**GitHub Projects** are planning boards and tables built from issues and PRs: columns such as *To do*, *In progress*, *In review*, *Done*, with custom fields such as priority or size, and filtered views. Teams that follow Agile processes ({{ch:agile-and-scrum}}) often run their planning here. Many companies use a separate tool such as Jira instead; the ideas are the same.

### Discussions, wikis and the rest

**Discussions** are forum-style threads for questions and ideas that are not yet concrete work — common in open-source projects, to keep the issue list for actionable items. **Wikis** hold longer documentation, although many teams prefer documentation in the repository itself, where it is reviewed and versioned with the code ({{ch:code-review-and-documentation}}).

## Automation and security features

These features are introduced briefly here; you will use several of them in depth later.

### GitHub Actions

**GitHub Actions** runs **workflows** — YAML files in `.github/workflows/` — when events happen. The most common workflow runs your checks on every pull request:

```yaml
name: CI
on:
  pull_request:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm test
```

- `on:` lists the events that start the workflow: any pull request, and pushes to `main`.
- `runs-on: ubuntu-latest` runs the job on a fresh Linux virtual machine provided by GitHub.
- Each step either **uses** a ready-made action (here: check out the code; install Node.js with npm caching) or **runs** a command.
- `npm ci` installs the exact versions in `package-lock.json` — the right command for automated environments ({{ch:modules-and-npm}}).

The result appears on the pull request as a **status check**, with a green tick or red cross. Branch protection can then require it to pass. {{ch:cicd}} explains continuous integration and delivery, and {{ch:github-actions}} teaches Actions in full: secrets, environments, matrices, caching, deployments.

### Dependabot

Your project depends on dozens of npm packages, which receive bug fixes and **security patches**. **Dependabot** watches your dependency files and opens pull requests that update them, and alerts you when a dependency has a known vulnerability. It is configured with `.github/dependabot.yml`:

```yaml
version: 2
updates:
  - package-ecosystem: npm
    directory: /
    schedule:
      interval: weekly
    groups:
      dev-dependencies:
        dependency-type: development
```

Because Dependabot's PRs run through the same checks as everyone else's, good tests ({{ch:testing}}) are what make it safe to accept updates quickly. The `groups` setting bundles related updates into one PR, reducing noise.

### Secret scanning and push protection

GitHub scans repositories for strings that look like known secret formats — cloud keys, payment provider keys, tokens. With **push protection** enabled, a push containing a recognised secret is **blocked** before it reaches the server, with a message telling you which file and line. This catches many of the mistakes described in {{ch:git}}, but only for secret formats it recognises, so it complements — not replaces — keeping secrets out of the code entirely.

### Code scanning

**Code scanning** (powered by CodeQL, GitHub's code-analysis engine) analyses your code for common vulnerability patterns — for example, user input flowing into a database query without being parameterised — and reports findings on pull requests. You will learn these vulnerability classes in {{ch:application-security}}.

### Secrets for automation

Workflows often need credentials — for example, to deploy. These are stored as encrypted **Actions secrets** in the repository or organisation settings, and are available to workflows as variables without ever appearing in the code or logs. **Environments** (such as `staging` and `production`) can have their own secrets and can require a human approval before a deployment job runs ({{ch:github-actions}}).

### Releases and packages

A **release** is a GitHub page attached to a Git **tag** ({{ch:git}}), with release notes and optional downloadable files. GitHub can draft release notes automatically from the titles of merged PRs — another reason to write good PR titles.

```bash
gh release create v2.15.0 --generate-notes
```

**GitHub Packages** can host private npm packages and container images ({{ch:docker}}) for an organisation.

### GitHub Pages

**GitHub Pages** serves a static website directly from a repository: documentation, a personal portfolio, a project homepage. A personal site at `username.github.io` is a simple, free way to publish a portfolio ({{ch:portfolio-and-brand}}).

## Organisations, teams and permissions

Companies use **organisations**: shared accounts that own the repositories, with members grouped into **teams** (backend, frontend, payments, platform). Permissions are granted to teams rather than individuals, at levels such as **read**, **triage** (manage issues), **write** (push branches, merge where allowed), **maintain** and **admin**.

Good practice is the **principle of least privilege**: give each person and each automated system only the access it needs. Most developers need *write* on their team's repositories; very few need *admin*. When someone leaves the company, removing them from the organisation removes all their access at once.

## Your public profile

For job-seekers, GitHub is part of your CV. Reviewers commonly look at:

- **Pinned repositories** — choose up to six that show your best work ({{ch:projects-that-prove-skill}}).
- **READMEs** — does each project explain itself, with setup instructions and perhaps screenshots?
- **Commit history** — small, well-described commits over time look very different from one giant "initial commit" uploaded the day before applying.
- **Tests and CI** — a green checkmark from a test workflow shows professional habits.
- **A profile README** — a repository named exactly like your username, whose README appears at the top of your profile: a short introduction, what you are working on, how to contact you.

The contribution graph (the green squares) is not a measure of skill, and experienced reviewers know it. Real, well-documented projects matter far more than a long streak of trivial commits.

## From beginner to enterprise

**Level 3 — personal projects.** Repositories with READMEs and `.gitignore`; pushing over SSH; issues as a to-do list; pull requests even when working alone, to practise the workflow and run checks.

**Level 4 — a team.** Protected `main`; PRs with descriptions and linked issues; at least one review; required CI checks; squash merging; PR and issue templates; Dependabot.

**Level 5 — professional practice.** CODEOWNERS and required code-owner reviews for sensitive areas; environments with approvals for production deployments; secret scanning with push protection; organisation-wide rulesets so every repository follows the same baseline; small PRs as a cultural norm.

**Level 6 — large organisations.** Hundreds or thousands of repositories managed through organisation policies; single sign-on (SSO) connected to the company's identity system; audit logs of who did what; required signed commits in regulated industries; internal "inner source", where teams contribute to each other's repositories through the same fork-and-PR model used in open source; self-hosted runners for Actions inside the company network. Some very large companies run GitHub Enterprise Server on their own infrastructure for compliance reasons.

## Real-world use cases

### A small team adopting pull requests

- **Problem:** four developers push directly to `main`; production breaks a few times a month from untested changes.
- **Change:** protect `main`; require a PR with one approval and a passing CI check (lint and unit tests); squash merging.
- **Result:** most breakages are caught by tests or reviewers before merging; history becomes a readable list of PRs.
- **Costs:** changes take a little longer to land, and reviews can become a bottleneck. Mitigation: small PRs, an agreed review response time, and rotating review duty.

### A security-sensitive area

- **Problem:** payment code must be reviewed by people who understand payments, but anyone can approve any PR.
- **Change:** CODEOWNERS assigns `/src/checkout/payments/` to the payments team; the ruleset requires code-owner approval.
- **Limit:** reviews are only as good as the reviewers' attention. Combine with tests for payment edge cases and code scanning.

### Contributing a fix upstream

- **Problem:** a bug in an open-source date library breaks your shop's delivery-date calculation.
- **Approach:** reproduce it with a minimal failing test; search the project's issues; open an issue if none exists; fork, fix with a test, open a PR referencing the issue. Meanwhile, work around the bug in your own code (or temporarily use your fork) so your shop is not blocked on the maintainers.
- **Result:** the fix benefits everyone, and you gain a real open-source contribution for your profile.

## Common mistakes

### Beginner: pushing to someone else's `main`, or working directly on `main`

Even when you have permission, committing directly to `main` skips review and checks. **Fix:** always branch; let protection rules make the safe way the only way.

### Beginner: empty PR descriptions

A title like "fix" and no description. **Consequence:** reviewers cannot judge whether the change is right, only whether it looks tidy. **Fix:** what, why, how, testing, risks — every time.

### Beginner: committing credentials while setting up

Pasting a token into a config file in the repository, or into a workflow file. **Fix:** credential helpers, `gh auth login`, Actions secrets; push protection as a safety net.

### Intermediate: giant pull requests

**Consequence:** slow, shallow reviews; painful conflicts; risky deployments. **Fix:** split into a sequence of small, independently safe PRs; use feature flags for unfinished functionality.

### Intermediate: opening new PRs to address review comments

**Consequence:** the discussion is scattered across several PRs. **Fix:** push new commits to the same branch.

### Production: rules that admins can bypass

Branch protection exists, but administrators are exempt, and an urgent "quick fix" pushed directly to `main` takes down production. **Fix:** include administrators; create an explicit, documented emergency process (for example, a fast-track review), rather than bypassing safety silently.

### Enterprise: permission sprawl

Former contractors still in the organisation; everyone with admin rights; old tokens with full access that never expire. **Fix:** regular access reviews, team-based permissions, least privilege, SSO, fine-grained tokens with expiry dates.

## Debugging and troubleshooting

**"Permission denied (publickey)"** when pushing over SSH — GitHub did not accept any key your computer offered. Check that the public key is added to your account, that your SSH agent has the private key loaded (`ssh-add -l`), and test with `ssh -T git@github.com`.

**"remote: Permission to org/repo.git denied"** — you are authenticated, but your account lacks write access to that repository. For open-source projects, use a fork.

**"Support for password authentication was removed"** — you tried to use your account password over HTTPS. Use a token, `gh auth login`, or SSH.

**"protected branch hook declined"** — you tried to push directly to a protected branch. Push to a new branch and open a PR.

**The merge button is disabled** — read the checks area at the bottom of the PR: a required check failed or is still running, a required review is missing, conversations are unresolved, or the branch is out of date with `main`.

**A closing keyword did not close the issue** — the PR was merged into a branch other than the default branch, or the keyword was in a commit on a different branch, or the issue is in another repository (use the full form `owner/repo#87`).

**Your fork is "N commits behind"** — sync it: `gh repo sync`, or fetch `upstream` and merge or rebase.

## Security and performance

**Security.** Enable 2FA; protect your SSH private key with a passphrase; prefer fine-grained, expiring tokens; never put credentials in repositories or workflow files; enable secret scanning with push protection and Dependabot alerts; protect default branches, including for admins; give the least access necessary. Be careful with third-party Actions: a workflow step that `uses:` someone else's action runs their code with access to your repository and secrets. Use well-known actions, and for sensitive workflows pin them to an exact commit id rather than a movable tag ({{ch:github-actions}}). Treat pull requests from forks with care: by default GitHub does not give them access to your secrets, and you should keep it that way.

**Performance.** For large repositories, CI time dominates developer waiting time: cache dependencies, run fast checks first, and use shallow clones in workflows (the checkout action does this by default). Keep large binary files out of Git (or in Git LFS) so clones stay fast.

## How a senior engineer thinks about this

- **The pull request is a communication tool**, not a formality. They write descriptions for reviewers and for whoever reads the history later.
- **Make the safe path the easy path.** Rules, templates, CODEOWNERS and automation are configured so that doing the right thing requires no willpower.
- **Small and frequent.** Small PRs get better reviews, merge with fewer conflicts and deploy with less risk.
- **Reviews are about the code, not the person**, in both directions ({{ch:code-review-and-documentation}}).
- **Access is a liability.** Every token, admin right and third-party integration is a possible attack path; they keep these minimal and reviewed.

## Exercises

### Exercise 1 — Your first remote repository

**Objective:** practise connecting a local repository to GitHub.
**What to do:** take any small project (or create one with a README and one code file), create a **private** GitHub repository for it with `gh`, push it, and confirm that `git status` shows your branch tracking `origin/main`. Then add a `.gitignore` and a README with "Running locally" instructions, commit, and push.

<details>
<summary>Show the solution</summary>

```bash
cd my-project
git init                                # if it is not a repository yet
git add .
git commit -m "Initial commit"
gh repo create my-project --private --source=. --remote=origin --push
git status
```

`git status` should report `Your branch is up to date with 'origin/main'.`

Then:

```bash
printf 'node_modules/\n.env\n' > .gitignore
# write README.md with a description and "Running locally" commands
git add .gitignore README.md
git commit -m "Add .gitignore and README"
git push
```

**Check:** on GitHub, the README is displayed under the file list. **Common mistakes:** running `git add .` before creating `.gitignore`, which commits `node_modules` or `.env` — if that happens, remove them with `git rm -r --cached node_modules .env`, commit, and (for `.env`) rotate any real secrets in it ({{ch:git}}).

</details>

### Exercise 2 — A complete pull request

**Objective:** practise the whole PR cycle, even alone.
**What to do:** in your repository, protect `main` so that changes require a pull request. Create an issue "Add a health-check endpoint" (or any small task). On a branch, make the change with a test, push, and open a PR whose description follows the what / why / how / testing format and closes the issue. Merge it with squash, delete the branch, and confirm the issue closed automatically.

<details>
<summary>Show the solution</summary>

```bash
gh issue create --title "Add a health-check endpoint" --body "Monitoring needs a URL that returns 200 when the app is running."
# suppose it is issue #1

git switch main && git pull
git switch -c health-check
# ...make the change and add a test...
git add -A
git commit -m "feat: add GET /health endpoint"
git push -u origin health-check

gh pr create --base main --title "Add GET /health endpoint" --body "## What
Adds GET /health returning {\"status\":\"ok\"}.

## Why
Monitoring needs a cheap endpoint to check the app is up. Closes #1.

## Testing
New test health.test.ts checks status 200 and the body."

gh pr merge --squash --delete-branch
gh issue view 1
```

`gh issue view 1` shows the issue as **closed**, linked to the PR. **Walkthrough:** branch protection (set in *Settings → Branches* or *Rules*) makes the PR the only path into `main`. The closing keyword links and closes the issue on merge. Squash merging gives one clean commit on `main`. **Note:** on a personal repository, you cannot approve your own PR, so set the required approvals to zero for this exercise; on a team, require at least one.

</details>

### Exercise 3 — Debug a blocked merge

**Objective:** practise reading what GitHub tells you.
**The scenario:** a teammate says, "My PR is approved but the merge button is grey." The PR page shows: "Review required — 1 approving review is required by reviewers with write access. ✔ 1 approval", "Some checks were not successful — 1 failing", and "This branch is out-of-date with the base branch". What is blocking the merge, and what should they do, in what order?

<details>
<summary>Show the solution</summary>

The approval requirement is satisfied (one approval present). Two things block the merge:

1. **A failing required check.** Open the failing check's details, read the log, reproduce locally (`npm test`), fix, commit and push.
2. **The branch is out of date with `main`.** Update it — `git fetch origin && git rebase origin/main` (then `git push --force-with-lease`), or the "Update branch" button, which merges `main` into the PR branch.

**Order:** update the branch first, then fix the failure. The failure might come from the outdated base (for example, a test that changed on `main`), and every push re-runs the checks anyway. **Also watch for:** if the repository dismisses stale approvals on new commits, the push will remove the existing approval, and the teammate must ask for a quick re-review. That is the rule working as intended — the reviewer approved older code.

</details>

### Exercise 4 — Production scenario: set up a repository for a new team

**Objective:** apply this chapter's practices together.
**The scenario:** you are the first engineer on a new five-person team building a delivery-tracking service. Write a checklist of how you would configure the GitHub repository on day one, with a one-line reason for each item.

<details>
<summary>Show the solution</summary>

1. **Repository in the company organisation, private, team-based permissions** (write for the team, admin for one or two leads) — least privilege, easy offboarding.
2. **README** with purpose, local setup, tests and structure — every new teammate starts here.
3. **`.gitignore` and `.env.example`** — keep dependencies and secrets out from the first commit.
4. **Ruleset on `main`:** PR required, one approval, dismiss stale approvals, required CI checks, up to date before merge, conversations resolved, no force pushes or deletions, no bypass for admins — the only route into `main` is reviewed and tested.
5. **CI workflow** running install, lint, type-check and tests on every PR — automatic, consistent quality gate ({{ch:github-actions}}).
6. **Squash merging only, auto-delete branches** — readable history, no stale branches.
7. **PR template** (what, why, how, testing, risks) and **issue templates** (bug, feature) — consistent, useful descriptions.
8. **CODEOWNERS** — at least a default team; stricter owners for sensitive folders later.
9. **Dependabot** version updates and security alerts, grouped — dependencies stay current with little noise.
10. **Secret scanning with push protection and code scanning** — catch leaked keys and common vulnerabilities early.
11. **Labels and a project board** agreed with the team — shared view of work ({{ch:agile-and-scrum}}).
12. **Environments** for staging and production, with secrets stored there and approval required for production — safe deployments later ({{ch:cicd}}).

</details>

## Summary

Git records history; **GitHub** hosts repositories and adds what a team needs around them: a shared official copy, **pull requests** for proposing and reviewing changes, **issues** and projects for organising work, **branch protection** for enforcing rules, and **automation** and **security** features. Pull requests, reviews and issues live on the platform, not in the Git repository, and every action is an event that can trigger automation.

Set up securely: two-factor authentication, an SSH key with a passphrase (or fine-grained tokens through a credential helper), and the `gh` CLI. Give every repository a README, `.gitignore`, `.env.example` and, if public, a licence.

The pull request workflow — branch, commit, push, open with a clear what/why/how description, pass checks, get reviewed, update the same branch, merge (often by squash), delete the branch — is how professional teams change code. Keep PRs small, link issues with closing keywords, and update branches with rebase and `--force-with-lease` when they are yours alone. Contribute to projects you do not own through **forks**, following their contribution rules. Protect `main` with rules that apply to everyone, and use **CODEOWNERS** to require the right reviewers. Use Actions for checks, Dependabot for updates, and secret scanning with push protection — all foundations you will build on in later chapters.

## Key terms

- **GitHub** — A web platform that hosts Git repositories and adds collaboration, review, project management, automation and security features.
- **Code-hosting platform** — A service, such as GitHub, GitLab or Bitbucket, that stores Git repositories and supports team workflows around them.
- **Pull request (PR)** — A request to merge one branch into another, with a page for description, discussion, review and automated checks.
- **Draft pull request** — A pull request marked as not yet ready for full review, which cannot be merged.
- **Code review** — The practice of other developers reading and commenting on a change before it is merged.
- **Closing keyword** — A word such as "Closes" or "Fixes" followed by an issue number in a pull request, which closes the issue when the PR is merged.
- **Squash and merge** — A merge method that combines all of a pull request's commits into a single commit on the target branch.
- **Fork** — A personal copy of another account's repository on a hosting platform, used to propose changes without write access.
- **Upstream** — The original repository from which a fork was made.
- **Issue** — A tracked item on a hosting platform, such as a bug report, feature request or task.
- **Label** — A tag used to categorise issues and pull requests.
- **Milestone** — A group of issues and pull requests that together make up a target, such as a release.
- **Branch protection** — Server-side rules that restrict how a branch can be changed, such as requiring reviewed pull requests and passing checks.
- **Ruleset** — GitHub's flexible system for defining branch and tag rules, which can apply across many repositories.
- **Status check** — The pass or fail result of an automated process, such as tests, reported on a pull request.
- **CODEOWNERS** — A file that maps parts of a repository to the people or teams who must review changes to them.
- **SSH key** — A pair of cryptographic keys, one private and one public, used to authenticate without a password.
- **Personal access token** — A long random credential, ideally limited in scope and lifetime, used instead of a password for automated or HTTPS access.
- **Two-factor authentication (2FA)** — Logging in with a second proof of identity in addition to a password.
- **GitHub CLI (gh)** — GitHub's official command-line tool for repositories, pull requests, issues and more.
- **GitHub Actions** — GitHub's automation system, which runs workflows in response to repository events.
- **Workflow** — An automated process defined in a YAML file that runs jobs and steps when triggered by events.
- **Webhook** — An HTTP request that a platform sends to another service when an event occurs.
- **Dependabot** — A GitHub feature that opens pull requests to update dependencies and alerts on known vulnerabilities.
- **Secret scanning** — Automatic detection of credentials, such as API keys, in repository content.
- **Push protection** — A feature that blocks pushes containing detected secrets before they reach the server.
- **Release** — A GitHub page tied to a Git tag, with notes and optional files, marking a version of the software.
- **Open-source licence** — A legal statement of what others may do with publicly shared code.
- **Organisation (GitHub)** — A shared account that owns repositories and groups members into teams with permissions.
- **Principle of least privilege** — Giving every person and system only the access they need to do their job.

## What comes next

A pull request is only as valuable as the review it receives — and code is only as maintainable as the documentation that explains it. The next chapter, {{ch:code-review-and-documentation}}, teaches both crafts: what reviewers should look for, how to give and receive feedback that improves code without hurting people, how to write documentation that stays useful, and how teams record the important decisions behind their designs.
