# Git: Saving the History of Your Code

> [!GOALS]
> - Explain what version control is, what problems it solves, and why Git became the standard.
> - Understand Git's three areas — working directory, staging area and repository — and move changes between them confidently.
> - Make good commits: small, focused, with clear messages.
> - Understand what Git stores **inside** — blobs, trees, commits and references — so its behaviour stops being mysterious.
> - Create branches, merge them, resolve conflicts, and understand rebasing and when not to use it.
> - Undo almost anything safely: `restore`, `amend`, `revert`, `reset` and the `reflog`.
> - Work with remote repositories: clone, fetch, pull and push.
> - Keep secrets and junk out of history with `.gitignore`, and know what to do if a secret is committed.

## Why this matters

Imagine writing a program without version control. You make a change that breaks something, and you cannot remember what the code looked like an hour ago. So you start keeping copies: `shop-final.zip`, `shop-final-2.zip`, `shop-final-REALLY-final-fixed.zip`. Now a teammate joins. You email files back and forth. You both edit `checkout.js` on the same afternoon, and whoever saves last silently overwrites the other's work. A customer reports a bug that appeared "sometime last month", and nobody can tell which change caused it, or why it was made.

Every one of these problems is real, and every software team before version control lived with them. **Version control systems** solve them:

- Every saved change is recorded, with **who** made it, **when**, and **why**.
- You can go back to any earlier version of any file, or of the whole project.
- Many people can work on the same code at the same time, on separate **branches**, and combine their work later — with the tool telling you exactly where changes collide.
- You can try risky ideas without fear: if an experiment fails, throw the branch away.
- You can find which change introduced a bug, often automatically.

**Git** is the version control system used by almost every software team today. It was written by Linus Torvalds in 2005 to manage the Linux kernel's source code, after the tool the kernel developers had been using stopped being available to them for free. It was designed to be fast, to work fully offline, and to support thousands of developers working in parallel.

You will use Git every working day of your career. Every pull request, code review, deployment pipeline and open-source contribution is built on it. Employers assume you know it, and confusion with Git — a lost commit, a messy merge, a force-push over a teammate's work — is one of the most visible ways a new developer can cause trouble. This chapter teaches it properly, from the inside.

## The simple idea

Think of a video game that lets you **save** your progress. Before a difficult fight, you save. If the fight goes badly, you load the save and try again. Some games let you keep many save slots, so you can explore two different paths from the same point and keep whichever turns out better.

Git gives your project save points, called **commits**. Each commit is a snapshot of the whole project at a moment, with a label explaining what changed. You can return to any of them. And **branches** are like separate save slots that start from the same point: one where you try a new checkout page, another where a teammate fixes a bug, both continuing from the same starting snapshot.

> [!ANALOGY]
> Git commits are like save points in a game, and branches are separate save slots that grew from a shared save.
>
> **Where the analogy breaks:** in a game, two save slots never combine. In Git, the whole point of branches is that they **merge** back together, combining the work done on each. And a game save stores everything once per save; Git is cleverer — unchanged files are stored only once and shared between snapshots, so thousands of commits take surprisingly little space.

## The proper definition and key words

**Git** is a **distributed version control system**: a tool that records snapshots of a set of files over time, and in which every copy of a project contains its **complete history**.

The key words:

- **Repository (repo)** — a project tracked by Git: your files plus a hidden `.git` folder that holds the entire history.
- **Commit** — a saved snapshot of the project, with an author, a date, a message and a link to the previous commit(s).
- **Working directory** (or working tree) — the actual files you see and edit.
- **Staging area** (or **index**) — a preparation area where you assemble exactly what will go into the next commit.
- **Branch** — a movable name that points to a commit and moves forward as you add commits.
- **HEAD** — Git's pointer to "where you are now": usually the branch you are working on.
- **Merge** — combining the work of two branches.
- **Remote** — another copy of the repository, usually on a server such as GitHub, that you exchange commits with.
- **Clone, fetch, pull, push** — copying a repository, downloading new commits, downloading and integrating them, and uploading your commits.

**Distributed** is important. Older systems, such as Subversion (SVN), were **centralised**: the history lived on one server, and developers had only the latest files. Every action — viewing history, committing — needed the server. In Git, **every clone is a full copy of the history**. You can commit, branch, view history and compare versions on a plane with no internet. The server is just one more copy that the team agrees to treat as the shared one.

## Setting up Git

Git is a command-line program ({{ch:the-terminal}}). Install it from git-scm.com (it comes with Git Bash on Windows), or through your system's package manager, then check it works:

```bash
git --version
```

**Output (your version may be newer):**

```text
git version 2.53.0
```

Before your first commit, tell Git who you are. This information is written into every commit you make:

```bash
git config --global user.name "Sara Ahmed"
git config --global user.email "sara@example.com"
git config --global init.defaultBranch main
```

- `--global` saves these settings for every repository on your computer (in a file called `.gitconfig` in your home folder). Without `--global`, a setting applies only to the current repository — useful for using a work email in work projects.
- `init.defaultBranch main` makes new repositories start with a branch called `main`. (Older Git versions used `master`; you will still see it in older projects.)

> [!TIP]
> Use the same email address as your GitHub account ({{ch:github}}), so your commits are linked to your profile. If you want to keep your email private, GitHub provides a special "noreply" address you can use instead.

## Your first repository

### Level 3 — Creating a repository

```bash
mkdir shop
cd shop
git init
```

**Output:**

```text
Initialized empty Git repository in /home/sara/shop/.git/
```

`git init` creates the hidden `.git` folder. That folder **is** the repository: the history, the branches, the configuration. The files around it are just your working copy. Delete `.git`, and the folder becomes an ordinary folder with no history.

The most useful command in Git is `git status`. It tells you where you are and what has changed. Run it constantly:

```bash
git status
```

**Output:**

```text
On branch main

No commits yet

nothing to commit (create/copy files and use "git add" to track)
```

### Level 3 — The three areas

Create two files:

```bash
printf '# Corner Shop\n' > README.md
printf 'export const VAT = 0.17;\n' > prices.js
git status
```

**Output:**

```text
On branch main

No commits yet

Untracked files:
  (use "git add <file>..." to include in what will be committed)
	README.md
	prices.js

nothing added to commit but untracked files present (use "git add" to track)
```

Git sees the files, but they are **untracked**: Git is not recording them yet. To understand what happens next, you need the most important picture in this chapter:

```text
  Working directory        Staging area            Repository
  (your files)             (the index)             (.git history)
  ───────────────          ───────────────         ───────────────
       edit  ──git add──▶   prepared for    ──git commit──▶  saved
                            the next commit                  snapshot
       ◀──────────────── git restore / git switch ─────────────
```

- The **working directory** is what you see in your editor.
- The **staging area** is a draft of your next commit. You choose exactly which changes go into it.
- The **repository** holds the permanent snapshots — the commits.

Why have a staging area at all, instead of committing everything that changed? Because you often change several unrelated things at once — fix a bug, rename a variable, and add a half-finished feature. The staging area lets you commit them **separately**, as clean, focused snapshots, even though you edited them together.

Stage one file:

```bash
git add README.md
git status
```

**Output:**

```text
On branch main

No commits yet

Changes to be committed:
  (use "git rm --cached <file>..." to unstage)
	new file:   README.md

Untracked files:
  (use "git add <file>..." to include in what will be committed)
	prices.js
```

`README.md` is now in the staging area ("Changes to be committed"); `prices.js` is still untracked. Stage it too and commit:

```bash
git add prices.js
git commit -m "Add README and VAT rate"
```

**Output:**

```text
[main (root-commit) ac94a09] Add README and VAT rate
 2 files changed, 2 insertions(+)
 create mode 100644 README.md
 create mode 100644 prices.js
```

- `-m "..."` gives the commit message. Without `-m`, Git opens a text editor for you to write one.
- `main` is the branch; `(root-commit)` means this is the first commit, with no parent.
- `ac94a09` is the start of the commit's unique **id**. Yours will be different — you will see why below.
- `create mode 100644` records that the files were created as normal, non-executable files.

### Level 3 — Seeing history

```bash
git log
```

**Output:**

```text
commit ac94a09f5070b51ee6e87dacb1a8118dde98b9bd
Author: Sara Ahmed <sara@example.com>
Date:   Thu Nov 19 21:19:54 2026 +0500

    Add README and VAT rate
```

The long hexadecimal string is the commit's full id. For daily use, the short form is easier:

```bash
git log --oneline
```

**Output:**

```text
ac94a09 Add README and VAT rate
```

### Level 3 — Changing a file: `diff`

Change the VAT rate:

```bash
printf 'export const VAT = 0.18;\n' > prices.js
git status
```

**Output:**

```text
On branch main
Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
  (use "git restore <file>..." to discard changes in working directory)
	modified:   prices.js

no changes added to commit (use "git add" and/or "git commit -a")
```

Before committing, look at **exactly** what changed:

```bash
git diff
```

**Output:**

```text
diff --git a/prices.js b/prices.js
index b2434c0..416573b 100644
--- a/prices.js
+++ b/prices.js
@@ -1 +1 @@
-export const VAT = 0.17;
+export const VAT = 0.18;
```

Reading a diff:

- `--- a/prices.js` is the old version; `+++ b/prices.js` is the new one.
- `@@ -1 +1 @@` is a **hunk header**: the change starts at line 1 in both versions.
- Lines starting with `-` were removed; lines starting with `+` were added. Lines with a space at the start (none here) are unchanged context.

Two forms you will use every day:

- `git diff` — changes in the working directory that are **not yet staged**.
- `git diff --staged` — changes that **are** staged, i.e. what will go into the next commit.

Stage and commit:

```bash
git add prices.js
git commit -m "Update VAT to 18%"
```

> [!TIP]
> Make `git diff --staged` a habit before every commit. It is the moment to notice a stray `console.log`, a debugging change, or a file you did not mean to include.

### Shortcuts and care

- `git add .` stages every change in the current folder and below. Convenient — and the most common way people accidentally commit things they should not (secret files, huge build outputs). Always run `git status` first.
- `git add -p` ("patch") goes through your changes **piece by piece** and asks whether to stage each one. It is the best tool for splitting a messy set of edits into clean commits.
- `git commit -a -m "..."` stages all changes to **already tracked** files and commits in one step. It never adds new files.

## What makes a good commit

A commit is a message to the future: to reviewers, to teammates hunting a bug, to yourself next year. Good commits are:

- **Small and focused.** One logical change per commit: "Fix rounding of VAT", not "Fix VAT, rename variables, update README and start new checkout page". A focused commit is easy to review, easy to understand, and easy to undo if it causes trouble.
- **Complete.** Each commit should leave the project in a working state — the code builds and the tests pass. This makes tools such as `git bisect` (later) useful.
- **Well described.** The message explains **what** changed and, above all, **why**.

A good message has a short **subject line** (around 50 characters, written as a command: "Add", "Fix", "Remove"), a blank line, and then, if needed, a body explaining the reasoning:

```text
Round VAT per line instead of per order

Finance reported invoices that differed by one paisa from the
receipt printer, which rounds each line separately. Rounding per
line makes our totals match the printed receipts exactly.

Fixes BILL-412
```

Many teams use **Conventional Commits**, a convention that starts each subject with a type:

```text
feat: add Eid sale coupon codes
fix: round VAT per line instead of per order
docs: explain local setup in README
refactor: extract shipping rules into their own module
test: cover the free-shipping threshold
chore: upgrade vitest
```

The prefixes make history easy to scan, and tools can use them to generate release notes and version numbers automatically.

Bad messages are easy to recognise: "fix", "update", "changes", "asdf", "final", "wip". They tell the future reader nothing.

## How it works inside: what Git actually stores

Git's commands become far less mysterious once you know what is inside `.git`. The design is simple and elegant.

### Level 2 — Content-addressed objects

Git stores everything as **objects** in a database inside `.git/objects`. Each object is identified by a **hash** of its contents: a 40-character hexadecimal fingerprint calculated with the SHA-1 algorithm. (Git can also use the stronger SHA-256, and is gradually moving towards it.)

A **hash function** turns any amount of data into a fixed-size fingerprint. The same content always gives the same hash; different content gives a different hash, with overwhelming probability. So the hash works as a name **derived from the content itself**. This is called **content addressing**.

There are three main kinds of object:

- A **blob** stores the contents of one file — just the bytes, without the file name.
- A **tree** stores one directory: a list of names, each pointing to a blob (a file) or another tree (a sub-directory).
- A **commit** stores a pointer to one tree (the snapshot of the whole project), pointers to its **parent** commit(s), the author, the committer, dates and the message.

You can look at them directly with `git cat-file -p` ("pretty-print"). Here is the second commit:

```bash
git cat-file -p HEAD
```

**Output:**

```text
tree 6b8e59fa811c986ab1b722b47b68ae5b30b5b179
parent ac94a09f5070b51ee6e87dacb1a8118dde98b9bd
author Sara Ahmed <sara@example.com> 1795105200 +0500
committer Sara Ahmed <sara@example.com> 1795105200 +0500

Update VAT to 18%
```

The tree it points to:

```bash
git cat-file -p HEAD^{tree}
```

**Output:**

```text
100644 blob 5b6454babcdfc3b71fa684cb79053c07e52914ae	README.md
100644 blob 416573b4ab7142c2cd31b441cc2a0161c2081d45	prices.js
```

And one blob:

```bash
git cat-file -p 416573b
```

**Output:**

```text
export const VAT = 0.18;
```

(The date in a commit object is stored as a number of seconds since 1 January 1970 — a **Unix timestamp** — plus the time-zone offset.)

Here is the whole structure for our two commits:

```text
  commit 8111997 ───parent──▶ commit ac94a09
  "Update VAT to 18%"         "Add README and VAT rate"
        │                            │
        ▼                            ▼
     tree 6b8e59                  tree (first)
     ├── README.md ──▶ blob 5b6454 ◀── README.md   (shared!)
     └── prices.js ──▶ blob 416573     prices.js ──▶ blob b2434c
                       (VAT 0.18)                    (VAT 0.17)
```

Several important facts follow from this design:

- **Each commit is a full snapshot**, not a list of changes. Git computes diffs when you ask for them, by comparing snapshots.
- **Unchanged files are stored once.** `README.md` did not change, so both trees point to the **same** blob. That is why history is cheap.
- **History cannot be silently altered.** A commit's id is a hash of its contents, **including its parent's id**. Change anything in an old commit — one character of one file — and its hash changes, so every later commit's hash changes too. This chain of hashes makes Git history **tamper-evident**.
- **Commits never change.** Commands that seem to "edit" history — amend, rebase — actually create **new** commits with new ids, and move pointers to them. The old commits still exist for a while, which is why you can usually recover from mistakes (see the reflog, below).
- **Your commit ids differ from these** because the author, email and timestamp are part of the hashed content.

### Level 2 — References: branches and HEAD

If commits are identified by long hashes, how does Git know which one is "the latest on main"? Through **references** — small files containing a commit id:

```bash
cat .git/HEAD
cat .git/refs/heads/main
```

**Output:**

```text
ref: refs/heads/main
81119978e32804bafcf9fbeb892714b0ef9fcfc0
```

- A **branch** is nothing more than a file containing the id of one commit. `main` points to commit `8111997...`.
- `HEAD` normally points to a **branch**, not directly to a commit: "I am on `main`".
- When you commit, Git creates the new commit with the current branch's commit as its parent, then **moves the branch** to point at the new commit. HEAD follows, because it points at the branch.

```text
   before commit:   HEAD ─▶ main ─▶ C2 ─▶ C1
   after commit:    HEAD ─▶ main ─▶ C3 ─▶ C2 ─▶ C1
```

This is why branches in Git are so cheap — creating one writes a 41-byte file — and why Git encourages using many of them.

> [!INSIDE]
> If HEAD points directly at a commit instead of a branch — which happens if you check out an old commit by its id — Git says you are in a **"detached HEAD"** state. You can look around and even commit, but no branch will move to keep track of those commits. If you want to keep work done there, create a branch (`git switch -c new-branch-name`) before switching away.

## Branches

### Level 2 — Why branch

On a real team, `main` should always contain working code that could be released. New work — a feature, a bug fix, an experiment — happens on its own **branch**. When the work is finished and reviewed, it is **merged** into `main`. Meanwhile, others work on their own branches without disturbing each other.

### Level 3 — Creating and switching

```bash
git switch -c add-discount
```

**Output:**

```text
Switched to a new branch 'add-discount'
```

- `git switch -c name` creates a branch at the current commit and switches to it. (`git switch name` without `-c` switches to an existing branch.)
- You will also see the older command `git checkout -b name`, which does the same thing. `checkout` does many unrelated jobs, so newer Git versions split them into `switch` (branches) and `restore` (files). Both forms work.
- `git branch` lists branches; the current one is marked with `*`.

Now commit a change on the branch, then go back to `main` and commit something else there:

```bash
printf 'export const VAT = 0.18;\nexport const DISCOUNT = 0.1;\n' > prices.js
git commit -am "Add 10% discount"
git switch main
printf '# Corner Shop\n\nPrices include VAT.\n' > README.md
git commit -am "Explain VAT in README"
git log --oneline --graph --all
```

**Output:**

```text
* e2e4f65 Explain VAT in README
| * a5416dd Add 10% discount
|/  
* 8111997 Update VAT to 18%
* ac94a09 Add README and VAT rate
```

`--graph` draws the history as a graph, and `--all` shows every branch, not just the current one. The two lines of work have **diverged** from commit `8111997`: one commit on `main`, one on `add-discount`. When you switch branches, Git changes the files in your working directory to match the snapshot of that branch.

### Level 3 — Merging

To bring the discount into `main`, switch to `main` (already there) and merge:

```bash
git merge add-discount -m "Merge branch 'add-discount'"
git log --oneline --graph
```

**Output:**

```text
Merge made by the 'ort' strategy.
 prices.js | 1 +
 1 file changed, 1 insertion(+)
*   46da272 Merge branch 'add-discount'
|\  
| * a5416dd Add 10% discount
* | e2e4f65 Explain VAT in README
|/  
* 8111997 Update VAT to 18%
* ac94a09 Add README and VAT rate
```

Git found the **merge base** — the last commit both branches share (`8111997`) — and combined the changes made on each side since then. Because `main` changed `README.md` and the branch changed `prices.js`, there was no overlap, and Git combined them automatically. The result is a **merge commit**, `46da272`, which has **two parents**. ("ort" is the name of Git's default merge algorithm.)

### Level 3 — Fast-forward merges

If `main` has **not** moved since the branch was created, there is nothing to combine: Git simply moves `main` forward to the branch's latest commit. This is a **fast-forward**:

```bash
git switch -c tidy
printf '# Corner Shop\n\nAll prices include VAT.\n' > README.md
git commit -am "Reword README"
git switch main
git merge tidy
```

**Output:**

```text
Updating 46da272..5a79307
Fast-forward
 README.md | 2 +-
 1 file changed, 1 insertion(+), 1 deletion(-)
```

No merge commit was created; history stays a straight line. When a branch is finished, delete it — its commits are now part of `main`:

```bash
git branch -d tidy add-discount
```

**Output:**

```text
Deleted branch tidy (was 5a79307).
Deleted branch add-discount (was a5416dd).
```

`-d` refuses to delete a branch whose commits are not merged anywhere, protecting you from losing work. `-D` forces the deletion.

### Level 3 — Merge conflicts

A **conflict** happens when both branches changed **the same lines** of the same file, and Git cannot know which version is right. Suppose marketing set the discount to 25% for an Eid sale on one branch, while someone else raised it to 15% on `main`:

```bash
git merge eid-sale
```

**Output:**

```text
Auto-merging prices.js
CONFLICT (content): Merge conflict in prices.js
Automatic merge failed; fix conflicts and then commit the result.
```

Git has paused the merge. `git status` explains the situation:

```text
On branch main
You have unmerged paths.
  (fix conflicts and run "git commit")
  (use "git merge --abort" to abort the merge)

Unmerged paths:
  (use "git add <file>..." to mark resolution)
	both modified:   prices.js
```

Open the file. Git has written both versions into it, between **conflict markers**:

```text
export const VAT = 0.18;
<<<<<<< HEAD
export const DISCOUNT = 0.15;
=======
export const DISCOUNT = 0.25;
>>>>>>> eid-sale
```

- Between `<<<<<<< HEAD` and `=======` is **your current branch's** version (`main`).
- Between `=======` and `>>>>>>> eid-sale` is the **incoming branch's** version.
- Lines outside the markers (the VAT line) merged without trouble.

To resolve the conflict:

1. **Decide what the correct result is.** This is a human decision, often needing a conversation: does the Eid sale override the normal discount? Perhaps the right answer is neither version, but a combination.
2. **Edit the file** to contain exactly the final content, and **delete all the markers**.
3. **Stage** the file to tell Git it is resolved: `git add prices.js`.
4. **Complete the merge**: `git commit` (Git prepares the merge message for you).

If you are not ready to resolve it, `git merge --abort` returns everything to how it was before the merge.

> [!WARNING]
> Never commit a file that still contains `<<<<<<<` or `>>>>>>>` markers. It will break the build — or, worse, in a format such as JSON or configuration, cause strange behaviour. Search for the markers before committing, and run the tests. Editors such as VS Code highlight conflicts and offer buttons to accept one side or both.

**Conflicts are normal**, not a sign of failure. You can make them rarer and smaller by keeping branches short-lived, merging `main` into your branch (or rebasing onto it) often, and keeping commits focused.

## Rebasing

### Level 2 — The idea

**Rebasing** is another way to integrate changes. Instead of joining two lines of history with a merge commit, `git rebase` **replays your branch's commits on top of** another branch, as if you had started your work from its latest commit.

Before:

```text
* d2fc4f3 Ignore node_modules          (main)
| * 1c077b7 Add receipt footer          (receipts)
|/
* a44d7c0 ...
```

```bash
git switch receipts
git rebase main
```

**Output:**

```text
Successfully rebased and updated refs/heads/receipts.
```

After:

```text
* 4751543 Add receipt footer           (receipts)
* d2fc4f3 Ignore node_modules          (main)
* a44d7c0 ...
```

Notice that the commit "Add receipt footer" has a **new id** (`4751543` instead of `1c077b7`). Its parent changed, so — as you learned above — its hash changed. Rebasing does not move commits; it **creates new copies** and moves the branch to them. Now `main` can fast-forward to `receipts`, giving a straight, linear history.

### Level 5 — Merge or rebase?

| | Merge | Rebase |
|---|---|---|
| History | Records exactly what happened, including parallel work | Rewritten to look linear |
| Commits | Unchanged; adds a merge commit | Replaced by new copies with new ids |
| Safe on shared branches? | Yes | **No** — never rebase commits others have based work on |
| Conflicts | Resolved once, in the merge | May need resolving for each replayed commit |

The **golden rule of rebasing**: **do not rebase commits that you have pushed and others may have built on.** Their copies of the old commits and your new copies will diverge, and the team ends up with duplicated, confusing history.

A common, safe practice: rebase **your own unshared branch** onto the latest `main` to keep it up to date and clean, then integrate it into `main` through a pull request ({{ch:github}}). Many teams also use **squash merging**, which combines all of a branch's commits into a single commit on `main`.

**Interactive rebase** — `git rebase -i main` — lets you rewrite your own branch's commits before sharing: reorder them, combine ("squash") them, edit their messages, or drop them. It is a powerful way to turn a messy series of "wip" commits into a clean, reviewable story. (It opens an editor, so it is for interactive terminal use.)

## Undoing things

Most Git anxiety comes from fear of losing work. In fact, Git makes it hard to lose anything that was ever committed. Here is how to undo each kind of change.

| Situation | Command | What it does |
|---|---|---|
| Discard uncommitted edits to a file | `git restore file` | Puts the file back to its last committed (or staged) state. **Uncommitted edits are lost.** |
| Unstage a file but keep the edits | `git restore --staged file` | Removes it from the staging area only |
| Fix the last commit's message or add a forgotten file | `git commit --amend` | Replaces the last commit with a new one |
| Undo a commit that is already shared | `git revert <commit>` | Adds a **new** commit that reverses it |
| Move the branch back, keeping changes | `git reset --soft <commit>` or `--mixed` | Moves the branch; your files keep the changes |
| Move the branch back, throwing changes away | `git reset --hard <commit>` | Moves the branch **and** overwrites your files |
| Recover from almost any mistake | `git reflog` | Lists everywhere HEAD has been |

### Amend

You committed with a typo in the message:

```bash
git commit -am "Add free shiping threshold"
git commit --amend -m "Add free shipping threshold"
git log --oneline -2
```

**Output:**

```text
18c915a Add free shipping threshold
55c4cbd Merge branch 'eid-sale'
```

To add a forgotten file, stage it, then `git commit --amend --no-edit` (keep the same message). Amend creates a **new** commit replacing the old one, so — like rebase — use it only on commits you have **not** pushed yet.

### Revert: the safe undo for shared history

Suppose the free-shipping change caused a problem in production, and it has already been pushed and pulled by teammates. Do not rewrite history; **revert** it:

```bash
git revert --no-edit HEAD
git log --oneline -3
```

**Output:**

```text
a44d7c0 Revert "Add free shipping threshold"
18c915a Add free shipping threshold
55c4cbd Merge branch 'eid-sale'
```

`git revert` creates a **new** commit that applies the opposite of the chosen commit. History only moves forward: everyone can pull it safely, and the record shows both the change and its reversal. This is the standard way to undo a bad change on `main`.

### Reset: moving the branch pointer

`git reset` moves the current branch to another commit. Its three modes differ in what happens to your files:

```text
                    moves branch   resets staging   resets working files
  git reset --soft       yes             no                no
  git reset --mixed      yes             yes               no      (default)
  git reset --hard       yes             yes               yes     (destructive)
```

- `--soft HEAD~1` "uncommits" the last commit but keeps its changes staged — useful to redo a commit differently. (`HEAD~1` means "one commit before HEAD"; `HEAD~2`, two before.)
- `--mixed` keeps the changes in your files but unstaged.
- `--hard` makes everything — branch, staging area and files — match the target commit. **Uncommitted work is destroyed and cannot be recovered by Git.**

### The reflog: your safety net

What if you run `git reset --hard HEAD~2` by mistake, and two commits seem to vanish?

```bash
git reset --hard HEAD~2
git reflog -5
```

**Output:**

```text
HEAD is now at 55c4cbd Merge branch 'eid-sale'
55c4cbd HEAD@{0}: reset: moving to HEAD~2
a44d7c0 HEAD@{1}: revert: Revert "Add free shipping threshold"
18c915a HEAD@{2}: commit (amend): Add free shipping threshold
8f61717 HEAD@{3}: commit: Add free shiping threshold
55c4cbd HEAD@{4}: commit (merge): Merge branch 'eid-sale'
```

The **reflog** ("reference log") records every position HEAD has had in **your** local repository: commits, resets, rebases, amends, branch switches. The "lost" commits are still there — `a44d7c0` is one step back. Restore it:

```bash
git reset --hard HEAD@{1}
```

**Output:**

```text
HEAD is now at a44d7c0 Revert "Add free shipping threshold"
```

You can even see the commit with the typo (`8f61717`) that `--amend` replaced. Commits that no branch points to are kept for a while (by default, at least 30 days for unreachable reflog entries) before Git's garbage collection removes them. So: **committed work is almost never truly lost.** Uncommitted work, on the other hand, can be — which is one more reason to commit often.

### Stash: putting work aside

You are halfway through a change when an urgent bug needs fixing on another branch. You cannot switch branches cleanly with half-done work, and it is not ready to commit. **Stash** it:

```bash
git stash
git stash list
```

**Output:**

```text
Saved working directory and index state WIP on receipts: 4751543 Add receipt footer
stash@{0}: WIP on receipts: 4751543 Add receipt footer
```

Your working directory is now clean. Switch branches, fix the bug, come back, and restore the work:

```bash
git stash pop
```

`pop` re-applies the most recent stash and removes it from the list. Stashes are meant for short interruptions; for anything longer, a commit on a branch (even a "wip" one you clean up later) is safer and easier to find.

## Ignoring files

Some files must **never** be committed:

- **Dependencies**, such as `node_modules/`, which can be reinstalled from `package.json` and contain tens of thousands of files ({{ch:modules-and-npm}}).
- **Build output**, such as `dist/`, generated from your source.
- **Secrets**: `.env` files with passwords, API keys and private keys.
- **Machine-specific files**: editor settings, operating system files such as `.DS_Store` or `Thumbs.db`, log files.

List them in a file called `.gitignore` at the root of the repository:

```text
# dependencies
node_modules/

# build output
dist/
coverage/

# environment and secrets
.env
.env.*
!.env.example
*.pem

# logs and OS files
*.log
.DS_Store
```

- Each line is a pattern. A trailing `/` matches folders; `*` matches any characters.
- A line starting with `!` makes an **exception**: here, `.env.example` (a template with fake values, safe to share) is **not** ignored, even though `.env.*` would match it.
- Lines starting with `#` are comments.
- Commit `.gitignore` itself, so the whole team shares it. GitHub keeps a collection of standard `.gitignore` templates for many languages.

`.gitignore` only affects files that are **not yet tracked**. If a file was already committed, adding it to `.gitignore` does nothing; you must also stop tracking it with `git rm --cached file` (which removes it from the repository but keeps your local copy).

### If you commit a secret

This happens to experienced engineers too. Act in this order:

1. **Revoke or rotate the secret immediately** — create a new API key or password and disable the old one. This is the step that actually protects you. Assume that anything pushed to a remote, even for a minute, has been copied: automated bots scan public repositories for keys within minutes of a push.
2. **Remove it from the code** and commit.
3. **Remove it from history** if needed, with a tool designed for rewriting history safely, such as `git filter-repo`. Because this rewrites commit ids, the whole team must coordinate (re-clone or reset their copies).

Deleting the file in a new commit is **not** enough: the secret is still in every earlier commit, available to anyone with the history. Prevention is far better: keep secrets in environment variables loaded from ignored files, and use a secret-scanning tool (such as gitleaks) in a pre-commit hook or in CI. GitHub also scans pushes for known key formats.

## Working with remotes

### Level 2 — Remotes

So far everything has been on your computer. A **remote** is another copy of the repository, usually hosted on a service such as GitHub or GitLab, which the team uses as the shared meeting point. You will learn GitHub in detail in {{ch:github}}; here are the Git commands underneath.

```text
      your computer                         server (e.g. GitHub)
  ┌──────────────────────┐              ┌──────────────────────┐
  │ local repository     │──── push ───▶│ remote repository    │
  │  main                │              │  main                │
  │  origin/main (copy)  │◀─── fetch ───│                      │
  └──────────────────────┘              └──────────────────────┘
```

### Level 3 — Clone, fetch, pull, push

**Clone** copies an existing remote repository, with its whole history:

```bash
git clone https://github.com/example-org/corner-shop.git
```

This creates a folder `corner-shop` with a working copy, the full history, and a remote named **`origin`** pointing at the URL.

**Fetch** downloads new commits from the remote **without changing your branches**:

```bash
git fetch origin
```

After fetching, Git keeps **remote-tracking branches** such as `origin/main` — read-only bookmarks showing where the remote's branches were at the last fetch. You can inspect what others did before integrating it: `git log main..origin/main` lists commits on the remote that you do not have yet.

**Pull** is fetch followed by integration (a merge by default, or a rebase if configured):

```bash
git pull
```

**Push** uploads your commits to the remote:

```bash
git push origin main
```

The first time you push a new branch, set its **upstream** — the remote branch it tracks — so that later `git push` and `git pull` know where to go without arguments:

```bash
git push -u origin add-discount
```

### Level 4 — Rejected pushes and force-pushing

If someone pushed to the same branch since your last fetch, Git **rejects** your push, because accepting it would discard their commits. The fix is to integrate their work first (`git pull`, resolve any conflicts, run the tests), then push again.

After rebasing or amending a branch you already pushed, a normal push is rejected too, because the history differs. You can overwrite the remote with a **force push** — but only on a branch that is **yours alone**, such as your own feature branch, and preferably with the safer form:

```bash
git push --force-with-lease
```

`--force-with-lease` refuses to overwrite the remote if someone else has pushed commits you have not seen, protecting their work. A plain `--force` on a shared branch such as `main` can erase teammates' commits; most teams forbid it entirely using **branch protection** on the server ({{ch:github}}).

### Pulling with rebase

By default, `git pull` creates a merge commit whenever your local branch and the remote have both moved — producing many small "Merge branch 'main' of ..." commits. Many developers prefer:

```bash
git config --global pull.rebase true
```

Then `git pull` replays your **local, unpushed** commits on top of the fetched ones, keeping history linear. Because those commits are not shared yet, this does not break the golden rule.

## Useful tools for investigating history

- **`git log -p file`** — every change to a file, with diffs.
- **`git log --author="Sara" --since="2 weeks ago"`** — filter history.
- **`git log -S "DISCOUNT"`** — find commits that added or removed a piece of text. Excellent for "when did this constant appear?".
- **`git blame file`** — shows, for each line, the commit and author that last changed it. Use it to find the **context** of a line — the commit message and pull request explain why it exists — not to blame people.
- **`git show <commit>`** — the details and diff of one commit.
- **`git bisect`** — finds the commit that introduced a bug by **binary search** ({{ch:recursion-sorting-searching}}). You mark one commit as "good" and one as "bad"; Git checks out the middle commit; you test it and mark it good or bad; Git halves the range again. Among 1,000 commits, it finds the culprit in about 10 steps. With `git bisect run npm test`, Git runs your tests at each step automatically. This works best when every commit leaves the project in a working state.
- **`git cherry-pick <commit>`** — copies one commit from another branch onto the current one: for example, applying an urgent fix to a release branch.
- **`git tag v1.4.0`** — marks a commit with a permanent name, usually a release version. Annotated tags (`git tag -a v1.4.0 -m "Release 1.4.0"`) also store a message, author and date, and are preferred for releases.

## Team workflows

A **branching strategy** is a team's agreement about how branches are used. The two you will meet most:

**Trunk-based development / GitHub flow** (the most common today):

```text
  main  ──●──────●───────────●──────●────▶   always releasable
           \    ↗            \     ↗
            ●──●  feature-a    ●──●  fix-b
           (short-lived branches, merged via pull requests)
```

- `main` is always deployable.
- All work happens on **short-lived** branches — hours to a few days — merged into `main` through reviewed pull requests ({{ch:github}}).
- Unfinished features can be merged but hidden behind **feature flags** (settings that turn a feature on or off without deploying new code), so branches never live long.
- Deployment from `main` is automated ({{ch:cicd}}).

**GitFlow** (older, still found in some companies):

- Long-lived `main` and `develop` branches, plus `feature/*`, `release/*` and `hotfix/*` branches.
- Suited to software released in scheduled versions — installed applications, embedded systems, mobile apps that pass through store review.
- Heavier: long-lived branches drift apart and produce big, painful merges.

For web applications deployed continuously, most teams now prefer the simpler, trunk-based approach. The underlying lesson is the same whichever you meet: **the longer a branch lives, the harder it is to merge.** Integrate early and often.

## From beginner to enterprise

**Level 3 — personal projects.** Commit small, focused changes with clear messages. Use branches for experiments. Use `.gitignore` from the very first commit.

**Level 4 — team projects.** Every change on a branch; integration through pull requests; `main` protected from direct pushes; rebase your own branch onto `main` before review; never force-push shared branches.

**Level 5 — professional practice.** Conventional commit messages; commits that each pass the tests (so `bisect` works); **Git hooks** — scripts Git runs automatically at certain moments — such as a pre-commit hook that runs the formatter, linter and a secret scanner (commonly set up with tools such as Husky and lint-staged); signed commits, which prove a commit really came from its claimed author.

**Level 6 — large organisations.** Some companies keep enormous codebases in a single repository — a **monorepo**. Google has publicly described its monorepo, though it uses its own version control system rather than plain Git. Very large Git repositories use techniques such as **shallow clones** (`--depth`, which downloads only recent history), **partial clones** (`--filter=blob:none`, which downloads file contents only when needed) and **sparse checkout** (which materialises only some folders), plus build tools that rebuild and test only what a change affects. Release management, audit requirements and tamper-evident history all rely on the properties of Git you learned in this chapter.

## Real-world use cases

### Hotfixing production while a feature is in progress

- **Situation:** you are halfway through a large feature branch when production breaks.
- **Approach:** commit or stash your work; switch to `main`; create `fix-checkout-crash`; write a failing test, fix, push, open a pull request; after it merges and deploys, return to your feature branch and rebase it onto the new `main` so it includes the fix.
- **Why it works:** branches isolate the two pieces of work completely. The fix ships without any half-finished feature code.

### Finding when a bug started

- **Situation:** order totals are wrong in some cases; nobody knows since when; 400 commits have been made since the last known-good release.
- **Approach:** write a small script or test that reproduces the wrong total; `git bisect start`, mark the current commit bad and the last release tag good, then `git bisect run` the script. About nine steps later, Git names the commit; its message and pull request explain the intent of the change.
- **Limit:** if many commits in the range do not build, bisect must skip them (`git bisect skip`), which reduces its power — another reason every commit should work.

### Recovering a deleted branch

- **Situation:** someone deleted a local branch with `-D` before merging it.
- **Approach:** `git reflog` shows the branch's last commit id; `git switch -c recovered <id>` brings it back.
- **Limit:** the reflog is **local**. Commits that existed only on a colleague's laptop, which was then wiped, cannot be recovered from yours — push your branches regularly.

## Common mistakes

### Beginner: committing everything with `git add .`

`.env`, `node_modules`, build output and editor files end up in history. **Prevention:** a `.gitignore` before the first commit; `git status` and `git diff --staged` before every commit.

### Beginner: huge commits with vague messages

"update stuff", touching forty files. **Consequence:** impossible to review, impossible to revert partially, useless in `git log` and `bisect`. **Fix:** commit each logical change separately; use `git add -p` to split mixed edits.

### Beginner: panicking during a merge conflict

Deleting the folder and cloning again, losing local work. **Fix:** read `git status`; resolve the markers; or `git merge --abort` to return to safety.

### Intermediate: long-lived branches

A branch open for six weeks, now hundreds of commits behind `main`, with a merge full of conflicts. **Fix:** small branches; integrate `main` frequently; feature flags for long work.

### Intermediate: rebasing or amending shared commits

Teammates' history diverges from yours; duplicated commits appear. **Fix:** rewrite only commits that are yours alone and unpushed (or on your own branch); use `revert` for shared history.

### Production: force-pushing to `main`

Teammates' merged work vanishes from the remote. **Fix:** branch protection rules that forbid force-pushes and direct pushes to `main`; `--force-with-lease` only on personal branches. If it happens, someone who still has the lost commits locally (or the reflog on a machine that had them) can push them back.

### Production: a secret in history

**Fix:** revoke first, then clean history, then prevent recurrence with scanning — as described above.

## Debugging and troubleshooting

**"fatal: not a git repository"** — you are not inside a folder with a `.git` directory. `cd` into the project, or run `git init` if it really is new.

**"Your branch is behind 'origin/main' by 3 commits"** — others pushed; run `git pull`. "**ahead** by 2 commits" means you have local commits to push. "**have diverged**" means both; pull (merge or rebase), then push.

**"error: Your local changes to the following files would be overwritten by checkout"** — you have uncommitted changes that conflict with the branch you are switching to. Commit them, stash them, or discard them with `git restore`.

**"! [rejected] main -> main (fetch first)"** — the remote has commits you do not have. Pull, resolve, test, push.

**"You are in 'detached HEAD' state"** — you checked out a commit rather than a branch. To keep any work done there, `git switch -c new-branch`; otherwise `git switch main`.

**A file in `.gitignore` is still tracked** — it was committed before being ignored. `git rm --cached file`, then commit.

**Every line of a file shows as changed** — usually **line endings**. Windows traditionally ends lines with CRLF (two characters), Linux and macOS with LF. If editors or Git settings convert them inconsistently, whole files appear changed. Teams avoid this with a `.gitattributes` file such as `* text=auto eol=lf`, which tells Git how to normalise line endings for everyone.

**"I lost my commits"** — run `git reflog`. They are almost certainly there.

## Security and performance

**Security.** Never commit secrets; scan for them automatically. Treat everything pushed as permanent and public to anyone who can read the repository. Use SSH keys or personal access tokens (never your account password) to authenticate to remotes ({{ch:github}}). Protect important branches on the server. In high-trust environments, require **signed commits**, which use a cryptographic key to prove who created a commit — the author name and email alone can be set to anything by anyone.

**Performance.** Git is fast for normal projects. Large repositories slow down when they contain **large binary files** (videos, design files, datasets): each version is stored in full and every clone downloads them all. Keep such files out of Git, or use **Git LFS** (Large File Storage), which stores them on a separate server and keeps only small pointers in the repository. For huge histories, use shallow or partial clones in CI to save time.

## How a senior engineer thinks about this

- **History is documentation.** They write commit messages for the engineer who will run `git blame` on this line in two years.
- **Small, frequent integration** beats big, rare merges. They keep branches short and pull often.
- **Safety by default:** branch protection, required reviews, no force-pushes to shared branches, secret scanning, `--force-with-lease`.
- **Know the model, not just the commands.** When something strange happens, they reason about commits, trees and pointers — and use `git log --graph --all` and `git reflog` to see the truth — rather than trying random commands.
- **Calm about mistakes.** Committed work is recoverable. They teach juniors the reflog early, so nobody is afraid of Git.

## Exercises

### Exercise 1 — The three areas

**Objective:** practise moving changes between the working directory, staging area and repository.
**What to do:** in a new repository, create `a.txt` and `b.txt`, and commit only `a.txt`. Then change `a.txt` again and stage it; change `b.txt` but do not stage it. Predict the output of `git status --short` before running it. Then unstage `a.txt` without losing your edit.
**Hint:** `git status --short` prints two columns: the first for the staging area, the second for the working directory.

<details>
<summary>Show the solution</summary>

```bash
mkdir areas && cd areas && git init
echo "one" > a.txt
echo "two" > b.txt
git add a.txt
git commit -m "Add a.txt"
echo "one, edited" > a.txt
git add a.txt
echo "two, edited" > b.txt
git status --short
```

**Output:**

```text
M  a.txt
?? b.txt
```

- `M ` (M in the first column) means `a.txt` is modified **and staged**.
- `??` means `b.txt` is **untracked** — it was never committed, so Git does not consider it "modified", just new. (If `b.txt` had been committed before, you would see ` M` — M in the **second** column, modified but not staged.)

Unstage `a.txt`, keeping the edit:

```bash
git restore --staged a.txt
git status --short
```

**Output:**

```text
 M a.txt
?? b.txt
```

Now `a.txt` shows ` M`: modified in the working directory, not staged. The edit is still in the file. **Common mistake:** using `git restore a.txt` (without `--staged`), which would **discard** the edit.

</details>

### Exercise 2 — Create and resolve a conflict

**Objective:** practise conflict resolution calmly.
**What to do:** create a file `config.txt` containing `timeout=30` on `main` and commit it. Create a branch `slow-network` and change the line to `timeout=60`; commit. Back on `main`, change it to `timeout=45`; commit. Merge `slow-network` into `main`. Resolve the conflict by choosing `timeout=60`, and finish the merge.

<details>
<summary>Show the solution</summary>

```bash
git switch main
echo "timeout=30" > config.txt
git add config.txt && git commit -m "Add config"
git switch -c slow-network
echo "timeout=60" > config.txt
git commit -am "Increase timeout for slow networks"
git switch main
echo "timeout=45" > config.txt
git commit -am "Tune timeout"
git merge slow-network
```

Git reports `CONFLICT (content): Merge conflict in config.txt`. The file now contains:

```text
<<<<<<< HEAD
timeout=45
=======
timeout=60
>>>>>>> slow-network
```

Resolve it: replace the whole content with the chosen line, removing all markers:

```bash
echo "timeout=60" > config.txt
git add config.txt
git commit --no-edit
git log --oneline --graph -4
```

The graph shows a merge commit with two parents. **Walkthrough:** `HEAD`'s side is the current branch (`main`, 45); the other side is the incoming branch (60). `git add` marks the conflict as resolved; `git commit --no-edit` completes the merge with Git's prepared message. **Common mistakes:** leaving a marker in the file; staging the file before actually editing it (Git will happily commit the markers).

</details>

### Exercise 3 — Undo the right way

**Objective:** choose the correct undo command for each situation.
**What to do:** for each situation, give the command and say why.

1. You edited `checkout.js` for an hour; the approach is wrong; nothing is committed. You want to throw the edits away.
2. You just committed, not pushed, and forgot to include `checkout.test.js`.
3. A commit pushed to `main` earlier broke the invoice page. Teammates have pulled it.
4. You committed three small "wip" commits on your own unpushed branch and want them to be one commit.
5. You ran `git reset --hard HEAD~3` on your branch by mistake.

<details>
<summary>Show the solution</summary>

1. `git restore checkout.js` — discards uncommitted changes to that file. (Be sure: they cannot be recovered.)
2. `git add checkout.test.js` then `git commit --amend --no-edit` — safe because the commit is not shared.
3. `git revert <commit-id>` and push — creates a new commit undoing it; history stays intact for everyone. Never reset shared `main`.
4. `git reset --soft HEAD~3` then `git commit -m "Add discount rules"` — moves the branch back three commits but keeps all changes staged, so one new commit contains them. (Interactive rebase with "squash" achieves the same.)
5. `git reflog`, find the commit before the reset (for example `HEAD@{1}`), then `git reset --hard HEAD@{1}` — the reflog remembers where the branch was.

</details>

### Exercise 4 — Production scenario: a leaked key

**Objective:** respond correctly to a real incident.
**The scenario:** a teammate pushed a commit containing `.env` with the live payment provider's secret key to the company's repository on GitHub, two hours ago. Several people have pulled since. Write the response plan, in order, with the reasoning.

<details>
<summary>Show the solution</summary>

1. **Rotate the key now.** In the payment provider's dashboard, create a new secret key and revoke the leaked one. Update the new key in the production secret store ({{ch:secrets-manager}}) and redeploy. This is the only step that stops misuse; everything else is clean-up. Check the provider's logs for any unexpected activity during the two hours.
2. **Stop it happening again immediately:** add `.env` (and `.env.*`, with an exception for `.env.example`) to `.gitignore`; remove the tracked file with `git rm --cached .env`; commit and push.
3. **Decide whether to rewrite history.** The key is already revoked, so the old value in history is useless to an attacker. Many teams stop here. If policy requires removal (or the file contained other unrevokable data), use `git filter-repo` to remove `.env` from all commits, force-push with the team's agreement, and ask everyone to re-clone; also contact the hosting service if cached copies must be purged.
4. **Prevent recurrence:** add a secret-scanning pre-commit hook and a CI check; enable the hosting platform's secret scanning and push protection; make sure new projects start with a standard `.gitignore`.
5. **Write a short blameless incident note** — what happened, how it was fixed, what changed — so the whole team learns ({{ch:observability-and-incidents}}).

**Why this order:** removing the secret from Git does not un-leak it. Bots scan pushes within minutes, so the only safe assumption is that the key was copied. Rotation first; history second.

</details>

## Summary

Version control records every change to a project with its author, time and reason, lets you return to any version, and lets many people work in parallel. Git is a **distributed** system: every clone holds the full history and works offline.

Changes move through three areas: the **working directory**, the **staging area** (where you assemble focused commits with `git add`, ideally checking `git diff --staged`) and the **repository** (`git commit`). Good commits are small, complete and explain **why**.

Inside, Git is a content-addressed database of **blobs** (file contents), **trees** (directories) and **commits** (snapshots with parents), each named by a hash of its content. A **branch** is just a pointer to a commit, and **HEAD** points to the current branch. Commits never change; amend and rebase create new commits.

Branches isolate work; **merge** combines it (fast-forward or merge commit); **conflicts** arise when both sides changed the same lines and are resolved by editing, staging and committing. **Rebase** replays commits on a new base for linear history — never on commits others have built on. Undo with `restore`, `amend`, `revert` (safe for shared history), `reset` (careful with `--hard`), and recover almost anything with the **reflog**. Keep junk and secrets out with `.gitignore`, and rotate any leaked secret immediately. Share work through remotes with clone, fetch, pull and push, never force-pushing shared branches. Prefer short-lived branches and frequent integration.

## Key terms

- **Version control system** — Software that records changes to files over time so earlier versions can be recovered and work can be combined.
- **Git** — The most widely used distributed version control system, created in 2005 for the Linux kernel.
- **Distributed version control** — Version control in which every copy of a repository contains its complete history.
- **Repository** — A project tracked by version control, including its files and full history.
- **Commit** — A saved snapshot of a project with an author, date, message and link to its parent commits.
- **Working directory** — The files of a repository as they currently exist on disk, which you edit.
- **Staging area (index)** — The place where changes are assembled before being saved in the next commit.
- **Untracked file** — A file in the working directory that Git has not been told to record.
- **Diff** — A description of the differences between two versions of files, line by line.
- **Hash** — A fixed-size fingerprint computed from data, used by Git to name objects by their content.
- **Blob** — A Git object that stores the contents of one file.
- **Tree (Git)** — A Git object that lists the files and sub-directories of one directory.
- **Branch** — A movable name that points to a commit and advances as new commits are made.
- **HEAD** — Git's pointer to the current position, usually the checked-out branch.
- **Detached HEAD** — The state in which HEAD points directly to a commit rather than to a branch.
- **Merge** — Combining the changes from two lines of history.
- **Merge base** — The most recent commit shared by two branches being merged.
- **Fast-forward** — A merge in which the branch pointer simply moves forward because there are no diverging changes.
- **Merge commit** — A commit with two or more parents that records a merge.
- **Merge conflict** — A situation where two branches changed the same part of a file and Git needs a person to choose the result.
- **Rebase** — Replaying a branch's commits on top of another commit, producing new commits and a linear history.
- **Revert** — Creating a new commit that undoes the changes of an earlier commit.
- **Reset** — Moving the current branch to a different commit, optionally changing the staging area and files.
- **Reflog** — A local record of every position HEAD and branches have had, used to recover lost commits.
- **Stash** — A temporary store for uncommitted changes, so they can be set aside and restored later.
- **.gitignore** — A file listing patterns of files that Git should not track.
- **Remote** — Another copy of a repository, usually on a server, that you exchange commits with.
- **Remote-tracking branch** — A local, read-only reference such as `origin/main` that records where a remote branch was at the last fetch.
- **Clone** — Making a full local copy of a remote repository.
- **Fetch** — Downloading new commits from a remote without changing local branches.
- **Pull** — Fetching from a remote and integrating the changes into the current branch.
- **Push** — Uploading local commits to a remote repository.
- **Force push** — A push that overwrites the remote branch's history, which can destroy others' commits.
- **Tag** — A permanent name attached to a specific commit, often a release version.
- **Git bisect** — A Git command that finds the commit that introduced a bug by binary search through history.
- **Conventional Commits** — A convention for commit messages that starts each with a type such as `feat` or `fix`.
- **Trunk-based development** — A workflow in which developers integrate small changes into the main branch frequently, using short-lived branches.
- **Git hook** — A script that Git runs automatically at a certain point, such as before a commit.

## What comes next

Git records history and lets branches combine — but on its own, it does not give a team a place to discuss changes, review each other's code, track issues or run automated checks before merging. The next chapter, {{ch:github}}, covers the platform that most teams use for all of that: hosting repositories, pull requests, code review, issues, branch protection, and the first taste of automation that you will build out fully in later chapters.
