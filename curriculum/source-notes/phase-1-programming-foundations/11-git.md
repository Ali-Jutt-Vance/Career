# Phase 1 — Chapter 11: Git

> *"In software development, version control is not optional — it's the foundation."*

---

## Chapter Overview

### Why Git Exists

Before version control, teams kept backups like `project_v1.zip`, `project_FINAL.zip`, `project_FINAL_FINAL.zip`. Merging changes from two developers meant manually comparing files. A wrong save could destroy weeks of work.

**Linus Torvalds created Git in 2005** for Linux kernel development. The requirements were brutal: thousands of contributors, millions of lines of code, no central server, and cryptographic integrity guarantees.

Git is a **distributed** version control system (DVCS). Every developer has the full repository history locally. You can commit, branch, merge, and diff without internet access. There's no single point of failure.

**Why Git won:**
- Speed: local operations, no network round-trip
- Branching is cheap (a branch is just a 41-byte pointer)
- Staging area (index) gives fine-grained control over commits
- Cryptographic integrity (SHA-1/SHA-256 content addressing)
- Distributed: every clone is a full backup
- Free and open source

### What Git Manages

Git tracks **content, not files**. Internally, everything is a hash of content:
- **Blob**: file content snapshot
- **Tree**: directory listing (filenames + blob hashes)
- **Commit**: tree pointer + parent pointer(s) + metadata
- **Tag**: named pointer to a commit (usually with a message)

---

## Beginner Theory

### The Three States of Git

```
Working Directory → Staging Area (Index) → Repository (.git/)
     (modified)          (staged)              (committed)

git add ──────────────────►
                        git commit ─────────────────────────────►
git checkout ◄────────────────────────────────────────────────
```

**Working Directory**: Files you see and edit on disk.
**Staging Area (Index)**: A preparation area — choose exactly which changes go into the next commit.
**Repository**: The `.git/` folder — permanent history of all commits.

### Essential Configuration

```bash
# Identity (stored in ~/.gitconfig)
git config --global user.name "Your Name"
git config --global user.email "you@example.com"

# Default editor (VSCode)
git config --global core.editor "code --wait"

# Default branch name
git config --global init.defaultBranch main

# Auto-detect line endings (Windows: true, Mac/Linux: input)
git config --global core.autocrlf input   # or true on Windows

# Better diffs
git config --global core.pager "less -FRX"

# Useful aliases
git config --global alias.st status
git config --global alias.co checkout
git config --global alias.br branch
git config --global alias.lg "log --oneline --graph --all --decorate"
git config --global alias.unstage "restore --staged"

# View all config
git config --list
```

### Starting a Repository

```bash
# Initialize new repository
mkdir my-project && cd my-project
git init                     # creates .git/

# Clone existing repository
git clone https://github.com/user/repo.git
git clone https://github.com/user/repo.git my-folder   # custom directory
git clone --depth 1 https://github.com/user/repo.git   # shallow clone (recent history only)
git clone --branch develop https://github.com/user/repo.git  # clone specific branch
```

### The Basic Workflow

```bash
# 1. See current state
git status                   # show modified/staged/untracked files
git status -s                # short format

# 2. Stage changes
git add filename.js          # add specific file
git add src/                 # add directory
git add *.ts                 # add by pattern
git add -p                   # interactive — stage by chunk (hunk)
git add -u                   # stage all modified tracked files (not new files)
git add .                    # stage everything (use carefully)

# 3. Commit
git commit -m "feat: add user authentication"
git commit                   # opens editor for multi-line message
git commit -am "message"     # add tracked + commit (skip staging step)

# 4. View history
git log                      # full log
git log --oneline            # condensed
git log --oneline --graph    # with branch graph
git log --oneline --all      # include all branches/tags
git log -5                   # last 5 commits
git log --since="2 weeks ago" --author="Alice"
git log -- path/to/file      # history for specific file
git log -p                   # show diffs with each commit

# 5. Compare changes
git diff                     # working dir vs staging
git diff --staged            # staging vs last commit
git diff main..feature       # between two branches
git diff HEAD~3..HEAD        # last 3 commits
git diff --name-only         # only show changed file names
```

---

## Basic Examples

### Creating Your First Commits

```bash
# Initialize project
mkdir todo-app && cd todo-app
git init

# Create initial files
echo "# Todo App" > README.md
cat > package.json << 'EOF'
{
  "name": "todo-app",
  "version": "1.0.0"
}
EOF

# Stage and commit
git add README.md package.json
git status
# On branch main
# Changes to be committed:
#   new file: README.md
#   new file: package.json

git commit -m "chore: initial project setup"

# Make changes
echo "const todos = [];" > app.js
git add app.js
git commit -m "feat: add empty todos array"

# View history
git log --oneline
# 8f3a2c1 feat: add empty todos array
# 2b7d4e3 chore: initial project setup
```

### The .gitignore File

```bash
# .gitignore — patterns of files NOT to track

node_modules/      # installed packages
dist/              # build output
.env               # environment variables (secrets!)
*.log              # log files
.DS_Store          # macOS metadata
Thumbs.db          # Windows metadata
coverage/          # test coverage reports
.next/             # Next.js build cache
*.local            # local override files

# Negate a pattern (track even if directory is ignored)
!src/generated/.gitkeep

# Test .gitignore rules
git check-ignore -v node_modules/lodash/index.js
# .gitignore:1:node_modules/   node_modules/lodash/index.js

# Global gitignore (OS-specific files)
git config --global core.excludesfile ~/.gitignore_global
```

---

## Intermediate Concepts

### Branching and Merging

A branch in Git is a 41-byte text file containing a commit SHA. Creating and switching branches is instantaneous.

```bash
# List branches
git branch              # local branches
git branch -r           # remote branches
git branch -a           # all branches
git branch -v           # with last commit info

# Create branch
git branch feature/user-auth
git checkout feature/user-auth
# Or in one command:
git checkout -b feature/user-auth

# Modern syntax (Git 2.23+)
git switch -c feature/user-auth     # create and switch
git switch main                     # switch without -c

# Delete branch
git branch -d feature/done          # safe delete (must be merged)
git branch -D feature/abandoned     # force delete
git push origin --delete feature/done  # delete remote branch

# Merge
git checkout main
git merge feature/user-auth         # fast-forward if possible
git merge --no-ff feature/user-auth # always create merge commit
git merge --squash feature/user-auth # squash all commits then commit manually
```

### Merge Conflicts

```bash
# When the same lines are modified in both branches:
git merge feature/auth
# CONFLICT (content): Merge conflict in src/user.js

# File will show:
<<<<<<< HEAD
  const getUser = () => db.findUser();
=======
  const getUser = async () => await userRepo.findUser();
>>>>>>> feature/auth

# Steps to resolve:
# 1. Edit file — pick what's correct, remove conflict markers
# 2. git add src/user.js
# 3. git commit   (merge commit message auto-generated)

# Abort a conflicted merge
git merge --abort

# Use a merge tool
git mergetool               # opens configured visual tool

# After merging, verify
git log --oneline --graph -10
```

### Rebasing

Rebase replays your commits on top of another branch, creating a linear history. Use for feature branches before merging to main.

```bash
# Interactive rebase — reorder, squash, edit commits
git checkout feature/my-feature
git rebase main                     # replay feature commits on top of current main

# Interactive rebase — rewrite last 3 commits
git rebase -i HEAD~3
# Opens editor:
# pick 8f3a2c1 feat: add todos
# pick 2b7d4e3 fix: typo
# pick 9d1c4f5 chore: cleanup
#
# Commands: pick, reword, edit, squash (s), fixup (f), drop (d)

# Squash fixup commits:
# pick 8f3a2c1 feat: add todos
# f    2b7d4e3 fix: typo        ← merge into pick above, discard message
# f    9d1c4f5 chore: cleanup   ← merge into pick above, discard message

# GOLDEN RULE: Never rebase commits that have been pushed to a shared branch
# Rebase rewrites history — causes divergence for others
```

### Remote Operations

```bash
# Add remote
git remote add origin https://github.com/user/repo.git
git remote -v                      # list remotes

# Fetch (download but don't merge)
git fetch origin                   # fetch all remote branches
git fetch origin main              # fetch specific branch

# Pull (fetch + merge)
git pull                           # fetch + merge current tracking branch
git pull --rebase                  # fetch + rebase (preferred for linear history)
git pull origin main               # explicit

# Push
git push origin feature/my-branch         # push branch
git push -u origin feature/my-branch      # set upstream tracking
git push                                  # push to tracked remote
git push --force-with-lease              # force push (safe — fails if remote changed)

# Tracking
git branch -u origin/main         # set tracking branch for current branch
git branch --track main origin/main
```

### Undoing Changes

```bash
# Unstage file (keep working dir changes)
git restore --staged filename.js         # Git 2.23+
git reset HEAD filename.js               # older syntax

# Discard working directory changes (destructive!)
git restore filename.js                  # Git 2.23+
git checkout -- filename.js              # older syntax

# Undo last commit (keep changes staged)
git reset --soft HEAD~1

# Undo last commit (keep changes in working dir, unstaged)
git reset --mixed HEAD~1                 # (default)

# Undo last commit (discard changes completely) (DESTRUCTIVE)
git reset --hard HEAD~1

# Undo a specific commit without rewriting history
git revert abc1234                       # creates a new "undo" commit

# Amend last commit message or add forgotten file
git add forgotten.js
git commit --amend --no-edit             # amend without changing message

# Find a commit that introduced a bug
git bisect start
git bisect bad                           # current commit is bad
git bisect good v1.0.0                   # tag/commit that was good
# Git checkouts midpoint automatically, test it:
git bisect good   # or: git bisect bad
# Repeat until bisect finds the culprit
git bisect reset                         # exit bisect mode
```

### Stashing

```bash
# Save work-in-progress without committing
git stash                        # stash modified tracked files
git stash push -m "auth progress" # named stash
git stash -u                     # include untracked files
git stash -p                     # interactive — stash specific hunks

# List stashes
git stash list
# stash@{0}: On feature/auth: auth progress
# stash@{1}: WIP on main: abc1234 fix: something

# Apply stash
git stash pop                    # apply most recent + remove from stash list
git stash apply stash@{1}        # apply specific stash (keep in list)
git stash drop stash@{0}         # delete a stash
git stash clear                  # delete all stashes
git stash branch new-branch      # create branch from stash
```

---

## Advanced Concepts

### Git Internals — Object Model

```bash
# Every file and commit is content-addressed by SHA-1

# Create a blob directly
echo "hello world" | git hash-object -w --stdin
# 8ab686eafeb1f44702738c8b0f24f2567c36da6d

# Inspect objects
git cat-file -t 8ab686e    # type: blob
git cat-file -p 8ab686e    # content: hello world

# Inspect a commit
git log --oneline -1
# 3f8a2b1 feat: add todos

git cat-file -p 3f8a2b1
# tree 7d3e1a2...
# parent 1c9f4b0...
# author Your Name <you@example.com> 1706745600 +0000
# committer Your Name <you@example.com> 1706745600 +0000
#
# feat: add todos

# Inspect a tree
git cat-file -p 7d3e1a2
# 100644 blob abc... README.md
# 100644 blob def... package.json
# 040000 tree ghi... src
```

### Advanced Log

```bash
# Find commits by message
git log --grep="auth"

# Find commits that changed a string
git log -S "getUser"               # pickaxe search

# Find commits that changed a pattern
git log -G "getUser\(.*\)"         # regex pickaxe

# Show who changed which line
git blame src/app.js               # annotate file by commit
git blame -L 20,40 src/app.js      # lines 20-40 only
git blame -w src/app.js            # ignore whitespace

# Show what a commit changed
git show abc1234                   # show commit diff
git show abc1234:src/app.js        # show file at that commit
```

### Tags

```bash
# Lightweight tag (pointer only)
git tag v1.0.0

# Annotated tag (has tagger, date, message — preferred for releases)
git tag -a v1.0.0 -m "Release v1.0.0: initial stable release"

# List tags
git tag
git tag -l "v1.*"              # filter by pattern

# Push tags to remote
git push origin v1.0.0         # specific tag
git push origin --tags         # all tags

# Delete tag
git tag -d v1.0.0              # local
git push origin --delete v1.0.0  # remote

# Checkout at a tag
git checkout v1.0.0            # detached HEAD state
```

### Cherry-Picking

```bash
# Apply a specific commit from another branch
git cherry-pick abc1234         # apply commit to current branch

# Apply range of commits
git cherry-pick abc1234..def5678

# Cherry-pick without committing (just apply changes)
git cherry-pick -n abc1234
```

### Worktrees

Check out multiple branches simultaneously in separate directories:

```bash
# Create a worktree (check out a branch in a separate directory)
git worktree add ../hotfix-branch hotfix/critical-bug

# Work in ../hotfix-branch without disturbing your main working directory

# Remove worktree
git worktree remove ../hotfix-branch
git worktree list
```

### Git Hooks

Scripts that run automatically on Git events. Stored in `.git/hooks/`:

```bash
#!/bin/sh
# .git/hooks/pre-commit  (chmod +x required)
# Runs before every commit — block commit by exiting non-zero

# Run linting
npm run lint
if [ $? -ne 0 ]; then
  echo "Lint failed. Commit aborted."
  exit 1
fi

# Run type check
npx tsc --noEmit
if [ $? -ne 0 ]; then
  echo "TypeScript errors found. Commit aborted."
  exit 1
fi

exit 0
```

```bash
# commit-msg hook — enforce conventional commit format
#!/bin/sh
# .git/hooks/commit-msg
COMMIT_MSG=$(cat "$1")
PATTERN="^(feat|fix|docs|style|refactor|test|chore|perf|ci|build|revert)(\(.+\))?: .{1,100}"

if ! echo "$COMMIT_MSG" | grep -qE "$PATTERN"; then
  echo "ERROR: Commit message must follow Conventional Commits format:"
  echo "  type(scope?): subject"
  echo "  Example: feat(auth): add OAuth2 login"
  exit 1
fi
```

**Shareable hooks** (team-wide enforcement):
```bash
# Use husky to manage hooks in package.json
npm install -D husky
npx husky init
# Edit .husky/pre-commit
```

---

## Commit Message Conventions (Conventional Commits)

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: new feature
- `fix`: bug fix
- `docs`: documentation
- `style`: formatting (no logic change)
- `refactor`: restructuring (no feature/bug change)
- `test`: adding/fixing tests
- `chore`: build process, dependencies
- `perf`: performance improvement
- `ci`: CI/CD changes
- `revert`: revert a commit

**Examples:**
```
feat(auth): add JWT token refresh endpoint

Adds POST /auth/refresh that accepts a valid refresh token
and returns a new access token + refresh token pair.

Closes #142

---

fix(cart): prevent negative item quantities

Validates quantity is positive before updating cart item.
Previously, a quantity of -1 could reduce the total below zero.

Fixes #89

---

BREAKING CHANGE: remove deprecated /api/v1 endpoints

Removed in favor of /api/v2. See migration guide in MIGRATION.md.

BREAKING CHANGE: deleteUser() now returns void instead of User
```

---

## Git Workflows

### GitHub Flow (Recommended for most teams)

```
main ──────────────────────────────────────────►
         │                             ▲
         ▼                             │
    feature/login ──────────────────────
    (branch, commit, PR, review, merge)
```

1. `main` is always deployable
2. Create a feature branch for every change
3. Commit frequently
4. Open a Pull Request early (for visibility and feedback)
5. Merge after review + CI passes
6. Deploy immediately after merge to main

### GitFlow (Complex release cycles)

```
main       ──────────────────────────────────────────►  (production)
             ▲                ▲              ▲
hotfix/──────┘                │              │
             main merge       │              │
develop    ──────────────────────────────────►          (integration)
             ▲       ▲        ▲
feature/a ───┘       │        │
feature/b ───────────┘        │
release/1.0 ──────────────────┘
```

- `main`: production-ready code
- `develop`: integration branch
- `feature/*`: feature branches off develop
- `release/*`: stabilization branch before production
- `hotfix/*`: emergency patches off main

**Use GitFlow when:**
- Multiple versions in production simultaneously
- Formal release cycles (enterprise, mobile apps)
- Strict QA gates before release

**Use GitHub Flow when:**
- Continuous deployment
- Single production version
- Small to mid-size teams
- SaaS applications

---

## Industry Usage

- **Every professional software team** uses Git (97%+ of companies, per JetBrains surveys)
- **GitHub**: 100M+ developers, 420M+ repositories
- **GitLab**: Popular for self-hosted and enterprise
- **Bitbucket**: Common in Atlassian stacks (Jira, Confluence)
- **Gerrit**: Google's code review system built on Git
- **Monorepos**: Google, Meta, Twitter store entire company codebases in one repository

---

## Security

```bash
# Never commit secrets
echo ".env" >> .gitignore
echo "*.pem" >> .gitignore
echo "*.key" >> .gitignore

# If you accidentally commit a secret:
# 1. Immediately rotate/revoke the secret (tokens, passwords)
# 2. Remove from history using git-filter-repo:
pip install git-filter-repo
git filter-repo --path .env --invert-paths --force
# 3. Force-push to remote
# 4. Coordinate with team (everyone must re-clone)

# Detect secrets before commit
# Use tools: truffleHog, git-secrets, gitleaks
npm install -g @secretlint/secretlint
secretlint "**/*"

# GPG-signed commits (verified identity)
gpg --gen-key
git config --global user.signingkey KEY_ID
git config --global commit.gpgsign true
git commit -S -m "feat: signed commit"
git log --show-signature -1
```

---

## Performance

```bash
# Clone only recent history (for large repos)
git clone --depth 50 https://github.com/user/large-repo.git

# Partial clone (don't download blobs by default)
git clone --filter=blob:none https://github.com/user/large-repo.git

# Sparse checkout (only materialize some directories)
git clone --sparse https://github.com/user/monorepo.git
cd monorepo
git sparse-checkout set packages/my-package

# Speed up git on large repos
git config core.preloadindex true
git config core.fscache true      # Windows
git config gc.auto 256

# Maintenance commands
git gc                            # garbage collect, optimize
git prune                         # remove unreferenced objects
```

---

## Debugging

```bash
# What just happened?
git reflog                        # every HEAD movement (branch switches, commits, resets)
# Use this to recover from accidental git reset --hard

# Recover lost commit
git reflog
# HEAD@{2}: commit: feat: add user auth
git checkout -b recovered-branch HEAD@{2}

# Find who introduced a bug
git bisect start
git bisect bad                    # HEAD is broken
git bisect good v2.0.0            # tag that worked
# Test at each checkout:
# git bisect good / git bisect bad
git bisect run npm test           # automate with test command
git bisect reset

# Find file deletion
git log --all --full-history -- path/to/deleted-file.js

# Restore deleted file
git checkout HEAD~1 -- path/to/deleted-file.js
```

---

## Interview Preparation

**Q1: What's the difference between `git merge` and `git rebase`?**
A: Both integrate changes from one branch into another. `merge` creates a merge commit that preserves the exact history, including when and how branches diverged — great for traceability. `rebase` replays commits on top of another branch, creating a linear history — cleaner for reading history but rewrites commit SHAs. The golden rule: never rebase shared/public branches. Use rebase on local feature branches before merging to keep main history clean.

**Q2: What is a detached HEAD?**
A: HEAD normally points to a branch name, and the branch name points to a commit. In detached HEAD state, HEAD points directly to a commit (not a branch). This happens when you check out a tag, commit hash, or remote branch directly. New commits won't be on any branch and can be lost if you switch away. Solution: `git checkout -b new-branch` to capture your changes.

**Q3: What's the difference between `git reset --soft`, `--mixed`, and `--hard`?**
A: All three move HEAD to a previous commit. `--soft` keeps all changes staged (index unchanged). `--mixed` (default) unstages changes but keeps them in the working directory. `--hard` discards all changes — the working directory matches the target commit. Use `--hard` with extreme care, and only when you're certain you want to discard work.

**Q4: What is `git stash` and when would you use it?**
A: Stash saves your uncommitted changes (both staged and unstaged) onto a stack so you can switch branches with a clean working directory. Use it when you need to urgently switch context — fix a hotfix on main, but you're mid-feature on another branch. `git stash push`, switch branch, fix, switch back, `git stash pop`.

**Q5: What is a fast-forward merge?**
A: When the current branch has no diverging commits from the target — i.e., the target is directly ahead in the commit chain — Git simply moves the branch pointer forward to the target's latest commit without creating a merge commit. The history is linear. Use `--no-ff` to force a merge commit for clarity in history.

**Q6: How do you revert a commit that has already been pushed to a shared branch?**
A: Use `git revert <commit-hash>`. This creates a new commit that undoes the changes from the specified commit, without rewriting history. This is safe for shared branches. Never use `git reset` on a commit that others may have already pulled — it rewrites history and causes divergence.

**Q7: Explain the Git object model.**
A: Git stores everything as four object types, all content-addressed by SHA-1. Blobs store file content. Trees store directory listings (filename + blob hash). Commits store a tree pointer, parent commit pointer(s), metadata (author, message). Tags are named pointers to commits. Every object is immutable — Git never changes stored content, only creates new objects. This is how Git guarantees integrity.

---

## Practical Tasks

### Beginner (10 Tasks)
1. Initialize a repository, create 5 commits with meaningful messages, and view the log with `--oneline --graph`.
2. Create a `.gitignore` that excludes `node_modules/`, `.env`, `dist/`, and `*.log`.
3. Use `git add -p` to stage only specific hunks of a modified file.
4. Create a branch, make 3 commits, then merge it back to main.
5. Simulate and resolve a merge conflict between two branches that modify the same line.
6. Use `git stash` to pause mid-feature work, make a hotfix on main, then resume.
7. Use `git log --grep` to find all commits containing "auth" in the message.
8. Use `git blame` to find who last modified each line of a file.
9. Use `git revert` to undo a specific commit without rewriting history.
10. Write 5 properly formatted Conventional Commit messages for various change types.

### Intermediate (10 Tasks)
1. Use `git rebase -i` to squash 4 commits into 1 with a clean message.
2. Use `git bisect` to find which commit introduced a bug (write a script to automate it).
3. Set up a `pre-commit` hook that runs ESLint and blocks commits on failure.
4. Set up a `commit-msg` hook that enforces Conventional Commits format.
5. Implement GitFlow workflow: create develop, feature, release, and hotfix branches.
6. Use `git reflog` to recover a branch deleted by accident.
7. Use `git cherry-pick` to apply a bug-fix commit from one branch to another.
8. Set up GPG signing for commits and verify the signature.
9. Use `git worktree` to work on two branches simultaneously.
10. Configure and use `git bisect run npm test` to automatically find a regression.

### Advanced (10 Tasks)
1. Remove a file containing a secret from Git history using `git filter-repo`.
2. Set up a monorepo with sparse checkout so developers only clone the packages they need.
3. Implement a custom Git hook workflow enforced via Husky for a team project.
4. Write a script that enforces the Conventional Commits specification across a team.
5. Analyze a large repository's object storage (`git count-objects -vH`) and optimize with `git gc`.
6. Create a git alias set that improves daily workflow significantly (document each alias).
7. Configure shallow clones and partial clones for a CI environment with bandwidth constraints.
8. Write a `post-receive` hook on a remote that deploys code on push to main.
9. Set up branch protection rules (CLI or web) that require 1 reviewer + CI to pass before merge.
10. Migrate a SVN repository to Git, preserving history and converting SVN users to Git authors.

---

## Mini Project

**Git Statistics Dashboard**: Write a Node.js script that analyzes a Git repository and generates a report:
- Total commits per author (sorted)
- Files with most changes (hotspots)
- Commit frequency by day of week
- Average commits per week for the last 3 months
- Branches older than 30 days (cleanup candidates)
- Mean lines changed per commit

---

## Production Project

**Git Workflow Automation Tool**: Build a CLI that enforces team workflow:
- `git-flow start <type> <name>`: create a properly named branch from correct base
- `git-flow finish`: push branch and open a PR template
- Lint commit messages on push
- Check branch naming convention
- Generate changelog from Conventional Commits since last tag

---

## Capstone Project

**Contribute to an Open Source Git Tool**: Find a GitHub project related to Git tooling (e.g., git-extra, conventional-commits tools, gitignore generators). Submit a meaningful PR that adds a feature or fixes a real issue. Document your contribution process, including how you used Git's advanced features.

---

## Self Assessment
1. What are the three states of a file in Git?
2. What does `git add -p` do and when is it useful?
3. What is the difference between a merge commit and a rebase?
4. When should you NOT rebase a branch?
5. What is a detached HEAD state? How do you fix it?
6. What is the difference between `git fetch` and `git pull`?
7. What are the differences between `--soft`, `--mixed`, and `--hard` resets?
8. What is the golden rule of rebasing?
9. What is `git reflog` and what can you use it for?
10. What is a fast-forward merge? When does it happen?
11. What is cherry-picking? Name a use case.
12. What are Git hooks? Give two examples.
13. What is the Conventional Commits specification?
14. What is GitFlow? What is GitHub Flow? When would you use each?
15. How do you permanently remove a file from Git history?

---

## Cheat Sheet

### Daily Workflow
```bash
git status          # what's changed?
git add -p          # stage interactively
git commit -m ""    # commit with message
git pull --rebase   # sync with remote
git push            # push to remote
git log --oneline --graph --all  # visualize history
```

### Branching
```bash
git switch -c feature/name      # new branch
git switch main                  # switch branch
git merge --no-ff feature/name   # merge with commit
git branch -d feature/name       # delete merged branch
```

### Undoing
```bash
git restore --staged <file>      # unstage
git restore <file>               # discard changes
git reset --soft HEAD~1          # undo commit (keep staged)
git revert <hash>                # safe undo (public branches)
git reflog                       # find lost commits
```

### Stash
```bash
git stash                        # save WIP
git stash pop                    # restore WIP
git stash list                   # list stashes
```

### Rebase
```bash
git rebase main                  # replay on main
git rebase -i HEAD~N             # interactive: squash/edit/drop
# NEVER rebase pushed commits!
```

### Remote
```bash
git remote -v                    # list remotes
git fetch origin                 # download changes
git push -u origin branch-name  # push + set upstream
git push --force-with-lease     # safe force push
```

### Commit Message Format
```
type(scope): subject

feat / fix / docs / style / refactor / test / chore / perf
```
