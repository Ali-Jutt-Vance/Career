# Phase 5 — Chapter 16: Jenkins

> **Target: 6,000 words · Core interview chapter · Week 38**
>
> GitHub Actions taught you what a pipeline is. Jenkins teaches you the version of
> pipelines that a real company hands you on your first day and asks you to keep
> working. In Pakistan specifically, a large number of employers run self-hosted
> Jenkins that somebody set up in 2019 and nobody has understood since. Being the
> person who understands it is worth money.

---

## Chapter Overview

Jenkins is an automation server. That is the whole idea: a long-running process that
watches for a trigger, checks out your code, runs commands, and reports what happened.
Everything else — the plugins, the Groovy, the blue and red balls — is decoration on
those four steps.

It matters for three reasons.

**It is everywhere.** Jenkins predates GitHub Actions by a decade and it is installed
inside thousands of companies that cannot or will not put their source on a hosted
runner. Banks, telecoms, government contractors, anyone with an on-premises rule.

**It runs on your infrastructure, which means you can break it.** A hosted CI service
hides the machine from you. Jenkins does not. You will deal with disk filling up with
old builds, agents going offline, plugins conflicting after an upgrade. That is a
burden and it is also why the skill is valuable: it is operational, not just
declarative.

**It is the clearest demonstration that a pipeline is just a program.** In Actions, YAML
hides the fact that something is executing your steps in order on a machine. In Jenkins
the machine is visible, the workspace is a real directory you can `ls`, and when a build
fails you can log in and look.

By the end of this chapter you will have run Jenkins yourself, written a declarative
`Jenkinsfile` that builds and tests a Node service against a real database, handled
credentials without leaking them, and understood the controller/agent split well enough
to say why the controller should not be running builds.

**What this chapter assumes.** You have done Week 35 (Docker) and Week 37 (GitHub
Actions). You know what an image is, what a container is, and what a pipeline is meant
to accomplish. If either is shaky, do those first — this chapter will feel like
memorisation otherwise.

---

## Beginner Theory

### The four things Jenkins actually does

Strip away every plugin and Jenkins is a loop:

1. **Wait for a trigger.** A timer, a webhook from your Git host, a manual click, or
   the completion of another job.
2. **Get the code.** Clone the repository into a directory called a *workspace*.
3. **Run your commands.** In order, in that directory, on some machine.
4. **Record the result.** Exit code, console log, artifacts, and a notification.

Every concept below is a name for part of that loop.

### Controller and agents

The **controller** (the old name was "master", and you will still see it in
documentation and error messages) is the Jenkins process itself. It serves the web UI,
stores configuration and build history on disk, schedules work, and talks to agents.

An **agent** (the old name was "slave", also still visible in the API) is a machine —
physical, virtual, or a container — that actually runs build steps. It connects to the
controller, receives work, and reports back.

An **executor** is one slot for concurrent work on an agent. An agent with four
executors can run four builds at once. Each executing build gets its own **workspace**
directory.

**The rule that matters: the controller should not run builds.** It ships with a couple
of built-in executors and it is tempting to use them. Do not. A build running on the
controller shares a filesystem and a JVM with the thing that holds all your credentials
and configuration. A malicious or merely careless `Jenkinsfile` can then read secrets
belonging to every other project on the server. Set the controller's executor count to
zero and make every build run on an agent. This is a real interview question and
"because builds shouldn't have access to the controller's filesystem and credentials"
is the answer.

### Jobs, and the kinds you will meet

A **job** (also called a *project* or an *item*) is a configured unit of work. Jenkins
has several types and you will encounter three:

- **Freestyle project** — the original. Configured entirely through the web UI: click
  boxes, paste shell commands into text areas. Easy to start, impossible to review,
  and the configuration lives only on the server. You will inherit these. You should
  not create them.
- **Pipeline** — the configuration is code, written in a file called `Jenkinsfile` that
  lives in your repository. Reviewable, version-controlled, and restorable if the server
  burns down.
- **Multibranch Pipeline** — a pipeline that scans your repository, finds every branch
  containing a `Jenkinsfile`, and creates a job for each automatically. New branch, new
  job; branch deleted, job removed. This is what you want for a real project.

### Declarative versus scripted

Pipelines come in two syntaxes and this confuses everyone at first.

**Scripted** pipelines are Groovy programs. They start with `node { ... }` and you can
write arbitrary logic. Maximum power, no guard rails, and a syntax error can be subtle.

**Declarative** pipelines start with `pipeline { ... }` and impose a structure: you must
declare an agent, your work goes in `stages`, each stage has `steps`. Jenkins validates
the structure before running anything, so a malformed pipeline fails fast with a useful
message.

**Write declarative.** It is what modern Jenkins documentation assumes, it is what
teams expect to read, and it has an escape hatch — a `script { }` block — for the rare
moment you genuinely need arbitrary Groovy. Nearly all of this chapter is declarative.

---

## Basic Examples

### Step 1 — Run Jenkins, and understand what you just started

You will run Jenkins in Docker, because that keeps your machine clean and because it
makes the controller/agent distinction concrete.

```bash
docker network create jenkins

docker run -d \
  --name jenkins \
  --network jenkins \
  -p 8080:8080 \
  -p 50000:50000 \
  -v jenkins_home:/var/jenkins_home \
  -v /var/run/docker.sock:/var/run/docker.sock \
  jenkins/jenkins:lts-jdk17
```

Read that command before you run it, line by line — this is the habit the whole book is
trying to build.

- `-p 8080:8080` — the web UI. You will open `http://localhost:8080`.
- `-p 50000:50000` — the **JNLP agent port**. Agents that connect *inbound* to the
  controller use this. You are not using inbound agents yet, but the port is part of the
  standard setup and knowing what it is for is the point.
- `-v jenkins_home:/var/jenkins_home` — **this is the important one.** Everything
  Jenkins knows lives in `/var/jenkins_home`: job configuration, build history,
  credentials, plugins, user accounts. Without this named volume, destroying the
  container destroys your entire Jenkins installation. With it, you can upgrade Jenkins
  by replacing the container and keep everything.
- `-v /var/run/docker.sock:/var/run/docker.sock` — mounts the host's Docker socket into
  the container so Jenkins can start sibling containers. This is what makes
  `agent { docker { ... } }` work later. **Be aware of what you just did:** anything
  that can talk to the Docker socket can start a privileged container on the host, which
  is effectively root. It is fine on your laptop for learning. It is a real decision in
  production, and an interviewer may well ask about it.

Now get the initial password. Jenkins writes it to a file and to the log:

```bash
docker exec jenkins cat /var/jenkins_home/secrets/initialAdminPassword
```

Open `http://localhost:8080`, paste it, choose **Install suggested plugins**, and create
an admin user. The suggested set includes Git, Pipeline, and the Credentials Binding
plugin, which is everything this chapter needs.

**Then, immediately:** go to *Manage Jenkins → Nodes → Built-In Node → Configure* and set
**Number of executors** to `0`. You will not be able to run a build until you add an
agent, which is exactly the constraint you want, and it is the first thing a competent
reviewer looks for.

### Step 2 — Add an agent

For learning, add a second container as an agent using the SSH method, which is the
clearest to reason about.

Generate a key pair:

```bash
ssh-keygen -t ed25519 -f ./jenkins_agent_key -N ""
```

Start an agent container with the public key baked in:

```bash
docker run -d --name jenkins-agent --network jenkins \
  -e "JENKINS_AGENT_SSH_PUBKEY=$(cat jenkins_agent_key.pub)" \
  jenkins/ssh-agent:latest
```

In Jenkins: *Manage Jenkins → Credentials → System → Global credentials → Add
Credentials*. Kind: **SSH Username with private key**. Username `jenkins`, paste the
contents of `jenkins_agent_key`, ID `jenkins-agent-key`.

Then *Manage Jenkins → Nodes → New Node*. Name it `linux-agent`, permanent agent.
Remote root directory `/home/jenkins/agent`, labels `linux docker`, launch method
**Launch agents via SSH**, host `jenkins-agent`, the credential you just made, and host
key verification strategy **Non-verifying** (acceptable for a local learning setup, not
for production — in production you pin the host key).

Save. Within a few seconds the node goes online.

**What just happened:** the controller opened an SSH connection to the agent, copied a
small Java program called the agent JAR across, and started it. That program now holds
an open channel back to the controller and waits for instructions. The `labels` you set
are how a pipeline asks for this machine specifically — `agent { label 'docker' }`.

### Step 3 — Your first Jenkinsfile

Create `Jenkinsfile` in the root of your project repository:

```groovy
pipeline {
    agent { label 'linux' }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }
        stage('Hello') {
            steps {
                sh 'echo "Building commit $(git rev-parse --short HEAD)"'
                sh 'node --version || echo "no node yet"'
            }
        }
    }

    post {
        always  { echo "Finished with status: ${currentBuild.currentResult}" }
        failure { echo 'This is where you would notify someone.' }
    }
}
```

Walk through it:

- `pipeline { }` — declarative. Jenkins parses and validates this whole block before
  executing a single step.
- `agent { label 'linux' }` — "run this on a machine labelled `linux`". Jenkins will
  queue the build until such an agent has a free executor.
- `stages` / `stage` / `steps` — the required nesting. Each `stage` becomes a column in
  the pipeline visualisation, which is how you see at a glance *where* a build failed.
- `checkout scm` — `scm` is injected by Jenkins and means "the repository and branch
  this job was configured from". Using it rather than a hard-coded Git URL is what makes
  the same `Jenkinsfile` work for every branch in a multibranch job.
- `sh` — run a shell command on the agent. **If the command exits non-zero, the stage
  fails and the pipeline stops.** That is the entire error-handling model, and it is why
  `set -e` habits from Week 34 matter here.
- `post` — blocks that run after the stages. `always`, `success`, `failure`,
  `unstable`, `changed`. This is where notification and cleanup live.

Now create the job: *New Item → Multibranch Pipeline*, add your repository as a branch
source, save. Jenkins scans the repository, finds `Jenkinsfile` on your branches, and
creates a job per branch. Push a commit and watch it build.

---

## Intermediate Concepts

### Running stages inside Docker containers

Installing Node on the agent and hoping it stays the right version is how build
environments rot. Instead, run each stage inside a container:

```groovy
pipeline {
    agent none

    stages {
        stage('Test') {
            agent {
                docker {
                    image 'node:20-alpine'
                    label 'docker'
                    args '-u root'
                }
            }
            steps {
                sh 'npm ci'
                sh 'npm test'
            }
        }
    }
}
```

`agent none` at the top means "do not allocate a machine for the whole pipeline"; each
stage declares its own. Jenkins then, for this stage: picks an agent labelled `docker`,
pulls `node:20-alpine`, starts a container with the workspace directory mounted inside
it, and runs your `sh` steps *within that container*. When the stage ends the container
is removed and the workspace — which lives on the agent, not in the container —
persists.

That mounting behaviour is the thing to understand. Files your build produces survive
the container because they were written to the mounted workspace. Anything installed
*outside* the workspace, such as a globally installed npm package, does not.

### A real database for your tests

Your Week 27 test suite needs Postgres and Redis. In Actions you got them from
`services:`. In Jenkins you start sidecar containers yourself:

```groovy
stage('Integration tests') {
    agent { label 'docker' }
    steps {
        script {
            docker.image('postgres:16-alpine').withRun(
                '-e POSTGRES_PASSWORD=test -e POSTGRES_DB=app_test'
            ) { db ->
                docker.image('redis:7-alpine').withRun() { cache ->
                    docker.image('node:20-alpine').inside(
                        "--link ${db.id}:db --link ${cache.id}:cache"
                    ) {
                        sh 'npm ci'
                        sh 'npx wait-on tcp:db:5432 -t 60000'
                        sh 'npm run migration:run'
                        sh 'npm run test:integration'
                    }
                }
            }
        }
    }
}
```

This is one of the places declarative syntax runs out and you drop into `script { }`.
Reading it from the inside out:

- `docker.image(...).withRun(args) { container -> ... }` starts a container, runs the
  closure, and **guarantees the container is stopped afterwards** even if the closure
  throws. That guarantee is why you use this rather than raw `sh 'docker run'` — a
  failed build that leaves a Postgres container running will eventually fill the agent.
- `.inside(args) { ... }` runs the closure inside that image with the workspace mounted.
- `--link ${db.id}:db` makes the Postgres container reachable at the hostname `db`.
  (`--link` is legacy Docker; a user-defined network is the modern equivalent and worth
  knowing, but `--link` is what most existing Jenkinsfiles use and you will read them.)
- `wait-on tcp:db:5432` is not optional. **The container starting is not the database
  being ready.** Postgres takes a second or two to initialise, and without this line
  your tests fail intermittently — which is the single most common cause of "flaky CI"
  and a good interview answer.

### Parallel stages

```groovy
stage('Checks') {
    parallel {
        stage('Lint') {
            agent { docker { image 'node:20-alpine'; label 'docker' } }
            steps { sh 'npm ci && npm run lint' }
        }
        stage('Unit tests') {
            agent { docker { image 'node:20-alpine'; label 'docker' } }
            steps { sh 'npm ci && npm run test:unit' }
        }
    }
}
```

Both branches need a free executor. With one agent and two executors they run
concurrently; with one executor they queue. This is the visible difference from Actions,
where capacity is somebody else's problem — here, pipeline concurrency is a capacity
decision you own.

### Conditional stages

```groovy
stage('Deploy') {
    when {
        branch 'main'
        beforeAgent true
    }
    agent { label 'linux' }
    steps {
        sh './scripts/deploy.sh'
    }
}
```

`when` gates the stage. `branch 'main'` only runs it on main. `beforeAgent true` is a
small but real optimisation: evaluate the condition *before* allocating an agent, so a
feature-branch build does not occupy an executor just to skip.

---

## Advanced Concepts

### Credentials, and never putting a secret in the Jenkinsfile

Jenkins has a credentials store. Add secrets at *Manage Jenkins → Credentials*, then
bind them into the environment only where needed:

```groovy
stage('Publish') {
    steps {
        withCredentials([
            usernamePassword(
                credentialsId: 'docker-registry',
                usernameVariable: 'REG_USER',
                passwordVariable: 'REG_PASS'
            ),
            string(credentialsId: 'npm-token', variable: 'NPM_TOKEN')
        ]) {
            sh '''
                echo "$REG_PASS" | docker login -u "$REG_USER" --password-stdin
                docker push myorg/app:${BUILD_NUMBER}
            '''
        }
    }
}
```

Three details that separate someone who has used this from someone who has read about
it:

**Single quotes on the `sh` block.** In Groovy, double-quoted strings are interpolated
*by Groovy, before the shell sees them* — which would bake the secret into the command
line, where it appears in the console log and in `ps`. Single quotes pass the string
through unchanged so `$REG_PASS` is expanded by the shell from the environment. Getting
this backwards is the classic Jenkins secret leak, and a reviewer will look for it.

**`--password-stdin`.** Passing a password as an argument puts it in the process list.
Piping it in does not.

**Masking is a safety net, not a strategy.** Jenkins replaces known secret values with
`****` in console output. Try it: `sh 'echo $REG_PASS'` and watch it get masked. Then
understand why you still must not do that — masking works on exact string matches, so a
secret that gets base64-encoded, split, or partially printed sails straight through.

### Shared libraries

Once you have five repositories, each `Jenkinsfile` contains the same eighty lines.
A shared library fixes that.

Create a separate repository with this structure:

```
vars/
  buildNodeService.groovy
src/
  com/yourorg/Notifier.groovy
```

`vars/buildNodeService.groovy`:

```groovy
def call(Map config = [:]) {
    def nodeImage = config.nodeImage ?: 'node:20-alpine'
    def deployBranch = config.deployBranch ?: 'main'

    pipeline {
        agent none
        options {
            timeout(time: 30, unit: 'MINUTES')
            disableConcurrentBuilds()
            buildDiscarder(logRotator(numToKeepStr: '30'))
        }
        stages {
            stage('Test') {
                agent { docker { image nodeImage; label 'docker' } }
                steps { sh 'npm ci'; sh 'npm test' }
            }
            stage('Deploy') {
                when { branch deployBranch }
                agent { label 'linux' }
                steps { sh './scripts/deploy.sh' }
            }
        }
    }
}
```

Register it at *Manage Jenkins → System → Global Pipeline Libraries* as
`shared-pipelines`. Now every repository's `Jenkinsfile` is:

```groovy
@Library('shared-pipelines') _

buildNodeService(nodeImage: 'node:20-alpine')
```

The bare `_` after `@Library` is not a typo — the annotation has to attach to something,
and `_` is the conventional placeholder.

**The trade-off, which is the interview answer:** a shared library removes duplication
and gives you one place to fix a problem across thirty repositories. It also means a
change to that library can break thirty pipelines at once, and a developer reading a
three-line `Jenkinsfile` cannot see what their build actually does. Version your library
(`@Library('shared-pipelines@v2')`) so consumers upgrade deliberately.

### Options worth setting on every pipeline

```groovy
options {
    timeout(time: 30, unit: 'MINUTES')
    disableConcurrentBuilds()
    buildDiscarder(logRotator(numToKeepStr: '30', artifactNumToKeepStr: '5'))
    timestamps()
    ansiColor('xterm')
}
```

- `timeout` — a hung build holds an executor forever. Always set one.
- `disableConcurrentBuilds` — stops two deploys of the same branch racing.
- `buildDiscarder` — **the single most important line in this chapter for anyone
  inheriting a Jenkins server.** Without it, every build's workspace, logs and artifacts
  are kept forever, and the eventual outcome is a full disk and an outage. "The disk
  filled up with old builds" is the most common Jenkins failure in the world.
- `timestamps` — every log line gets a time, which is how you find the slow stage.

---

## Industry Usage

In a company running Jenkins you will typically find:

- **A multibranch pipeline per repository**, so every PR is built before review.
- **Agents by capability**, labelled `linux`, `windows`, `gpu`, `deploy-prod`. The
  production-deploy agent often sits in a separate network segment and is the only
  machine holding production credentials.
- **An approval step before production**, using `input`:

  ```groovy
  stage('Approve production') {
      steps {
          timeout(time: 1, unit: 'HOURS') {
              input message: 'Deploy to production?', submitter: 'release-managers'
          }
      }
  }
  ```

  Note the `timeout` around it. An `input` without one holds an executor until somebody
  notices, sometimes for days.
- **Configuration as Code (JCasC)**, a plugin that defines the whole Jenkins
  configuration in a YAML file so the server itself is reproducible. Worth knowing the
  name; a company that has it is a company that has taken Jenkins seriously.
- **Inherited mess.** Freestyle jobs nobody can explain, plugins three years out of
  date, a `Jenkinsfile` with a commented-out stage from 2022. Your value is partly the
  willingness to read it and write down what it does.

---

## Alternatives

| Tool | Where it wins | Where it loses |
|---|---|---|
| **GitHub Actions** | Zero setup, hosted runners, huge marketplace, YAML everyone can read | Ties you to GitHub; self-hosted runners still need operating; per-minute cost at scale |
| **GitLab CI** | Tightly integrated with GitLab, excellent container registry story | Only if you are on GitLab |
| **CircleCI / Travis** | Fast, good caching, simple config | Hosted only, cost, less control |
| **Argo CD / Flux** | GitOps for Kubernetes deployment specifically | Deployment only — you still need CI to build and test |
| **Jenkins** | Runs anywhere, plugin for everything, no vendor lock-in, on-premises | You operate it: upgrades, disk, plugin conflicts, security patching |

**The honest summary, which is what you say in an interview:** for a new project on
GitHub with no compliance constraint, use Actions. Choose Jenkins when the code cannot
leave your network, when you need build machines with unusual hardware or licensed
software, or when — most commonly — the company already has it and switching is not the
problem worth solving this quarter.

---

## Security

Jenkins is a machine that runs arbitrary code, holds every credential your deployments
need, and often sits on an internal network with weak boundaries. Treat it accordingly.

- **Zero executors on the controller.** Repeating it because it is the one that matters.
- **Never run builds as root** where you can avoid it, and be deliberate about mounting
  the Docker socket — it is equivalent to giving the build root on the host.
- **Authorisation strategy.** Use *Matrix Authorization* or *Role-Based Strategy* so a
  developer can trigger builds without reading credentials or reconfiguring jobs. The
  default "logged-in users can do anything" is not a strategy.
- **Script security.** Scripted pipeline Groovy runs through a sandbox; when someone
  clicks "approve" on a script-approval request without reading it, the sandbox is gone.
  Read what you approve.
- **Update plugins deliberately.** Jenkins plugin CVEs are frequent and real. Patch on a
  schedule, and read the changelog rather than clicking "update all" on a Friday.
- **Credentials are scoped.** A credential added at system level is visible to every
  job. Folder-scoped credentials restrict them to one team's projects. Use folders.
- **Do not let a PR from a fork run with credentials.** A `Jenkinsfile` is code, and a
  pull request can modify it. If untrusted contributors can open PRs, build them without
  secrets.

---

## Performance

- **Set `buildDiscarder` everywhere.** Disk is the number-one Jenkins outage.
- **Cache dependencies across builds.** The workspace persists between builds on the
  same agent, so `npm ci` re-downloading everything each time is often avoidable —
  though be aware that a shared cache is also a way for one build to poison another.
- **Parallelise the independent things** — lint and unit tests do not depend on each
  other. Watch that you have the executors to make it real.
- **Keep the pipeline under ten minutes.** Beyond that people stop waiting for it and
  start merging on hope.
- **Use `stash`/`unstash` to move build output between stages** rather than rebuilding
  it, and `archiveArtifacts` only for things you genuinely need to download later —
  archived artifacts live on the controller's disk.
- **Watch the controller's memory.** Build history is held in memory lazily but a
  controller with thousands of retained builds will feel it.

---

## Debugging

A method, in the order you should apply it:

1. **Read the console output from the top, not the bottom.** The first error is the
   cause; the last one is usually a consequence.
2. **Check which agent it ran on.** The log's first lines say
   `Running on linux-agent in /home/jenkins/agent/workspace/...`. Half of "it works
   locally" turns out to be "it ran on a different machine with different software".
3. **Look at the workspace.** `docker exec -it jenkins-agent ls -la
   /home/jenkins/agent/workspace/<job>`. Unlike hosted CI, the evidence is still there.
4. **Reproduce the container locally.** If a stage runs `inside('node:20-alpine')`, run
   `docker run -it --rm -v $PWD:/app -w /app node:20-alpine sh` and try the command
   yourself. Most "CI-only" failures are a missing system package in a slim image.
5. **Add `sh 'env | sort'`** when a variable is not what you expect. Groovy
   interpolation versus shell expansion is a recurring trap.
6. **Use Replay.** Every pipeline build has a *Replay* button that lets you edit the
   `Jenkinsfile` and re-run immediately, without committing. This is the single biggest
   time-saver in Jenkins and most people do not know it exists. Once it works, commit
   the change.
7. **Check `/var/jenkins_home/logs` and the system log** for controller-level problems —
   agents disconnecting, plugin exceptions, out-of-memory.

**Common failures and their real causes:**

| Symptom | Usual cause |
|---|---|
| Build queues forever | No agent with that label online, or no free executor |
| `command not found` | The tool is not in the image or on the agent |
| Intermittent test failures | Service container not ready — you are missing `wait-on` |
| Secret appears in the log | Double-quoted `sh` block interpolated it in Groovy |
| Works on main, fails on PR | `when { branch }` or credentials scoped to a folder |
| Everything fails after a restart | Disk full — check `buildDiscarder` |

---

## Interview Preparation

**Q: What is the difference between the controller and an agent?**
The controller schedules work, serves the UI, and stores configuration and credentials.
Agents execute build steps. Builds should run on agents so that build code never has
access to the controller's filesystem or credential store — which is why you set the
controller's executor count to zero.

**Q: Declarative or scripted?**
Declarative, because it validates structure before executing and is readable by people
who do not know Groovy. Scripted, or a `script { }` block inside declarative, when you
need real logic — for example orchestrating sidecar containers with guaranteed cleanup.

**Q: How do you handle secrets?**
They go in the Jenkins credentials store, folder-scoped where possible, and are bound
into a narrow `withCredentials` block. The `sh` body uses single quotes so the shell
expands the variable rather than Groovy interpolating it into the command line. Masking
exists but is a safety net, not a control.

**Q: How do you run tests that need a database?**
Start it as a sidecar container in the pipeline, wait for it to accept connections
before running migrations, and ensure it is torn down even on failure — which is what
`withRun`'s closure gives you.

**Q: Jenkins or GitHub Actions?**
Actions for a new project on GitHub with no constraint against hosted runners. Jenkins
when the code cannot leave the network, when builds need specific hardware or licensed
tooling, or when the organisation already runs it. The real answer usually involves what
the team can operate, not which is technically superior.

**Q: A build passes locally and fails in Jenkins. Walk me through it.**
Check which agent and which image it ran on; compare the tool versions; look at the
workspace, which still exists; reproduce the container locally; check environment
variables; use Replay to iterate without committing.

**Q: What is a shared library and what does it cost you?**
A separate repository of pipeline code consumed by many projects. It removes duplication
and centralises fixes. It costs you visibility — a three-line `Jenkinsfile` hides what
the build does — and it creates a single point of failure, which is why you pin a
version.

**Q: Your Jenkins server keeps running out of disk. Why?**
Almost certainly no `buildDiscarder`, so every build's workspace, logs and artifacts are
retained forever. Set a rotation policy, and check for archived artifacts that did not
need archiving.

---

## Practical Tasks

1. Run Jenkins in Docker with a named volume. Set the controller to zero executors. Add
   an SSH agent and bring it online.
2. Write a declarative `Jenkinsfile` that checks out your Project 2 repository, installs
   dependencies and runs lint — all inside a `node:20-alpine` container.
3. Add a test stage with Postgres and Redis sidecars, migrations, and the Week 27 suite.
   Make it fail once by omitting the readiness wait, so you have seen the flake.
4. Add `withCredentials` to log in to a container registry and push an image tagged with
   `${BUILD_NUMBER}`. Then deliberately `echo` the secret and watch it get masked — and
   write down in `LOG.md` why masking is not sufficient.
5. Add a `Deploy` stage gated on `branch 'main'` with `beforeAgent true`.
6. Add `options` with a timeout, `disableConcurrentBuilds`, and `buildDiscarder`.
7. Convert the job to a multibranch pipeline. Push a feature branch and watch a job
   appear; delete the branch and watch it go.
8. Extract the whole thing into a shared library and reduce your `Jenkinsfile` to three
   lines.
9. Break the pipeline three ways — wrong label, missing tool in the image, secret leaked
   by double quotes — and fix each from the console log alone.
10. Write a one-page comparison of this pipeline and your Week 37 Actions pipeline: what
    each does better, and which you would choose for a new team, with a reason.

---

## Self Assessment

Answer out loud, without notes:

- Why should the controller have zero executors?
- What exactly does `checkout scm` resolve to, and why use it over a hard-coded URL?
- What is the difference between `agent` at pipeline level and at stage level?
- Why does the workspace survive a stage's container but a globally installed package
  does not?
- Why do single quotes matter in an `sh` block that uses a credential?
- What does `withRun`'s closure guarantee that a bare `docker run` does not?
- What does `beforeAgent true` save you?
- Name three things that fill a Jenkins disk.
- What does a shared library cost you, and how do you limit that cost?
- Your integration tests fail one build in five. What is your first hypothesis?

If you hesitated on more than two, re-read the relevant section before moving on. This
chapter is Week 38 and Block VI closes at the end of it.

---

## Cheat Sheet

```groovy
pipeline {
    agent none
    options {
        timeout(time: 30, unit: 'MINUTES')
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '30'))
        timestamps()
    }
    environment {
        IMAGE = "myorg/app:${env.BUILD_NUMBER}"
    }
    stages {
        stage('Test') {
            agent { docker { image 'node:20-alpine'; label 'docker' } }
            steps { sh 'npm ci'; sh 'npm test' }
        }
        stage('Build image') {
            agent { label 'docker' }
            steps { sh 'docker build -t $IMAGE .' }
        }
        stage('Deploy') {
            when { branch 'main'; beforeAgent true }
            agent { label 'linux' }
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'registry',
                    usernameVariable: 'U', passwordVariable: 'P')]) {
                    sh 'echo "$P" | docker login -u "$U" --password-stdin'
                    sh 'docker push $IMAGE'
                }
            }
        }
    }
    post {
        always  { cleanWs() }
        failure { echo 'notify here' }
    }
}
```

**Useful environment variables:** `BUILD_NUMBER`, `BUILD_URL`, `JOB_NAME`,
`BRANCH_NAME`, `GIT_COMMIT`, `WORKSPACE`, `CHANGE_ID` (set on pull requests).

**Steps worth remembering:** `sh`, `checkout scm`, `stash` / `unstash`,
`archiveArtifacts`, `junit`, `input`, `withCredentials`, `retry`, `timeout`, `cleanWs`.

**Rules:**
- Controller: zero executors.
- Secrets: credentials store, `withCredentials`, single-quoted `sh`.
- Always: `timeout` and `buildDiscarder`.
- Sidecars: wait for readiness before using them.
- Iterate with **Replay**, then commit.
