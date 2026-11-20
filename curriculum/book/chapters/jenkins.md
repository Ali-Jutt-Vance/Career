# Jenkins

> [!GOALS]
> - Explain what Jenkins is, why so many companies still run it, and how it differs from hosted CI such as GitHub Actions.
> - Understand the **controller and agents** architecture and the kinds of jobs.
> - Read and write **declarative pipelines** in a `Jenkinsfile`: stages, steps, `post`, environment, options.
> - Run stages in **Docker containers**, run stages in **parallel**, and add **conditions** and approvals.
> - Use **credentials** safely and share logic with **shared libraries**.
> - Operate Jenkins responsibly: security, plugins, backups and performance.

## Why this matters

{{ch:github-actions}} showed CI/CD as a hosted service built into the code platform. Before that model existed, teams ran their own automation server — and the most popular one by far was **Jenkins**. It is open source, runs anywhere, connects to almost anything through about two thousand plugins, and has been the backbone of CI/CD in banks, telecoms, game studios, governments and large enterprises for more than fifteen years.

Many of these companies still run Jenkins today, often with hundreds of pipelines. Some need to keep builds inside their own network for regulatory reasons; some build on special hardware (consoles, embedded devices, GPUs); some simply have years of investment in it. If you join such a company, you will read and edit `Jenkinsfile`s, debug failed builds and perhaps help migrate pipelines. The CI/CD ideas are the same as in {{ch:cicd}}; this chapter shows how Jenkins expresses them and what running your own CI server involves.

## The simple idea

GitHub Actions is like ordering from a restaurant: you send the recipe, someone else's kitchen cooks it. Jenkins is **your own kitchen**: you buy the equipment, hire the cooks (agents), keep the place clean (updates, plugins, backups) and lock the doors (security). You get complete control — any equipment, any location, any recipe — and complete responsibility.

> [!ANALOGY]
> Jenkins is like running your own kitchen instead of ordering from a restaurant: full control over equipment and recipes, and full responsibility for cleaning, repairs and security.
>
> **Where the analogy breaks:** a kitchen that is not cleaned smells bad and everyone notices. A Jenkins server that is not updated keeps working perfectly while its old plugins collect known security holes — and because it holds credentials for production, a neglected Jenkins is one of the most valuable targets an attacker can find.

## The proper definition and key words

**Jenkins** is an open-source, self-hosted automation server. A central **controller** stores configuration, schedules work and shows results; **agents** execute the work. Pipelines are usually defined as code in a **`Jenkinsfile`** using a Groovy-based **declarative** syntax and stored in the project's repository.

Key words:

- **Controller** — the Jenkins server: web interface, configuration, scheduling, results.
- **Agent** — a machine (or container) that runs builds, connected to the controller.
- **Executor** — a slot on an agent for running one build at a time.
- **Label** — a tag on agents (`linux`, `docker`, `gpu`) used to choose where a stage runs.
- **Job / project** — a configured unit of work; **build** — one run of it.
- **Pipeline** — a job defined by a `Jenkinsfile`.
- **Multibranch pipeline** — a job that discovers branches and pull requests in a repository and runs each one's `Jenkinsfile`.
- **Declarative pipeline** — the structured `pipeline { … }` syntax; **scripted pipeline** — the older, free-form Groovy syntax.
- **Stage / step** — a named phase of the pipeline / one action within it.
- **`post`** — actions that run after a stage or pipeline depending on the result (`always`, `success`, `failure`).
- **Credentials** — secrets stored by Jenkins and injected into builds.
- **Plugin** — an extension adding integrations and features.
- **Shared library** — a versioned repository of reusable pipeline code.

## The architecture

### Level 1 — Controller and agents

```text
             developers / webhooks from Git
                         │
                ┌────────▼─────────┐
                │    controller     │  web UI, configuration, job history,
                │ (no builds here)  │  credentials, scheduling, plugins
                └──┬──────┬──────┬──┘
          ┌────────┘      │      └─────────┐
   ┌──────▼─────┐  ┌──────▼─────┐  ┌───────▼─────┐
   │ agent:     │  │ agent:     │  │ agent:       │
   │ linux,     │  │ windows    │  │ cloud/k8s    │  started on demand,
   │ docker     │  │            │  │ (ephemeral)  │  removed after the build
   └────────────┘  └────────────┘  └──────────────┘
```

- The **controller** should run **no builds** itself (set its executors to 0). Builds run arbitrary code; on the controller, that code could read every stored credential and configuration.
- **Agents** connect over SSH or an inbound agent connection. **Static** agents are long-lived machines; **ephemeral** agents (Docker containers, Kubernetes pods, cloud instances) are created for one build and destroyed afterwards — clean, scalable and safer.
- **Labels** route work: `agent { label 'linux && docker' }` runs on any agent with both labels.

### Level 1 — Kinds of jobs

- **Freestyle jobs**: configured by clicking in the web interface. Easy to start, impossible to review or version — avoid them for anything important.
- **Pipeline jobs**: defined by a `Jenkinsfile`.
- **Multibranch pipelines** and **organisation folders**: point Jenkins at a repository or a whole GitHub/GitLab organisation; it finds every branch and pull request with a `Jenkinsfile` and builds it, reporting status back. This is the modern default.

## Pipelines as code

### Level 2 — A declarative `Jenkinsfile`

```groovy
// Jenkinsfile — at the root of the repository
pipeline {
  agent { label 'linux && docker' }

  options {
    timeout(time: 20, unit: 'MINUTES')          // never hang forever
    disableConcurrentBuilds(abortPrevious: true) // a new push aborts the old build of this branch
    buildDiscarder(logRotator(numToKeepStr: '30'))
    timestamps()
  }

  environment {
    CI = 'true'
    IMAGE = "registry.example.com/shop-api:${env.GIT_COMMIT}"
  }

  stages {
    stage('Install') {
      steps {
        sh 'node --version'
        sh 'npm ci'
      }
    }
    stage('Lint and types') {
      steps {
        sh 'npm run lint'
        sh 'npm run typecheck'
      }
    }
    stage('Unit tests') {
      steps {
        sh 'npm run test:unit -- --reporter=junit --outputFile=reports/unit.xml'
      }
      post {
        always { junit 'reports/unit.xml' }      // test results and trends in the UI
      }
    }
  }

  post {
    failure { echo "Build failed: ${env.BUILD_URL}" }
    always  { cleanWs() }                        // leave the workspace clean
  }
}
```

Reading it:

- **`agent`** chooses where the whole pipeline runs, by label.
- **`options`**: a timeout, aborting older builds of the same branch, keeping only the last 30 builds, and timestamps in the log. Set these on every pipeline.
- **`environment`** defines variables for all steps. `env.GIT_COMMIT` is provided by Jenkins, so the image is tagged with the commit ({{ch:cicd}}).
- **`stages`** run in order; each `sh` step runs a shell command, and a non-zero exit code fails the stage and stops the pipeline ({{ch:shell-scripting}}).
- **`post`** blocks run after a stage or the whole pipeline: `always`, `success`, `failure`, `unstable`, `changed`. Publishing JUnit test reports gives Jenkins test trends and per-test failure details.
- **Declarative** syntax is structured and validated before running; prefer it. The older **scripted** syntax (`node { … }`) is full Groovy — powerful but easy to make unreadable.

### Level 3 — Stages inside Docker containers, and a real database

Installing Node.js and every other tool on every agent leads to "works on agent 3 only". Running stages inside containers makes the toolchain part of the pipeline ({{ch:docker}}):

```groovy
pipeline {
  agent none
  stages {
    stage('Test') {
      agent {
        docker {
          image 'node:22-alpine'
          label 'docker'
          args '-v npm-cache:/root/.npm'          // a named volume as a dependency cache
        }
      }
      steps {
        sh 'npm ci'
        sh 'npm test'
      }
    }
    stage('Integration tests') {
      agent { label 'docker' }
      steps {
        script {
          docker.image('postgres:18').withRun('-e POSTGRES_PASSWORD=test -e POSTGRES_DB=shop_test') { db ->
            docker.image('postgres:18').inside("--link ${db.id}:db") {
              sh 'until pg_isready -h db -U postgres; do sleep 1; done'
            }
            docker.image('node:22-alpine').inside("--link ${db.id}:db") {
              sh 'npm ci'
              sh 'DATABASE_URL=postgres://postgres:test@db:5432/shop_test npm run test:integration'
            }
          }
        }
      }
    }
  }
}
```

- `agent { docker { image … } }` runs the stage's steps inside a `node:22-alpine` container on an agent labelled `docker`; the workspace is mounted into it.
- The integration stage starts PostgreSQL with `withRun` (stopped automatically afterwards), waits until it accepts connections, then runs the tests in a Node container that can reach it as `db`. The same idea as GitHub Actions service containers, expressed with the Docker Pipeline plugin. Many teams run `docker compose up -d` in a `sh` step instead ({{ch:docker-compose}}).
- On Kubernetes, the Kubernetes plugin goes further: each build gets a pod with several containers (Node, PostgreSQL, tools), created and destroyed per build.

### Level 3 — Parallel stages, conditions and approvals

```groovy
pipeline {
  agent { label 'linux && docker' }
  stages {
    stage('Checks') {
      parallel {
        stage('Lint')       { steps { sh 'npm run lint' } }
        stage('Types')      { steps { sh 'npm run typecheck' } }
        stage('Unit tests') { steps { sh 'npm run test:unit' } }
      }
    }
    stage('Build and push image') {
      when { branch 'main' }
      steps {
        withCredentials([usernamePassword(credentialsId: 'registry-push',
                                          usernameVariable: 'REG_USER',
                                          passwordVariable: 'REG_PASS')]) {
          sh '''
            echo "$REG_PASS" | docker login registry.example.com -u "$REG_USER" --password-stdin
            docker build -t "$IMAGE" .
            docker push "$IMAGE"
          '''
        }
      }
    }
    stage('Deploy to production') {
      when { branch 'main' }
      steps {
        timeout(time: 1, unit: 'HOURS') {
          input message: "Deploy ${env.GIT_COMMIT.take(7)} to production?", submitter: 'release-managers'
        }
        sh './scripts/deploy.sh "$IMAGE" production'
      }
    }
  }
}
```

- **`parallel`** runs independent checks at the same time — on one agent here, or on separate agents with their own `agent` blocks.
- **`when`** conditions skip stages: `branch 'main'`, `changeRequest()` (pull requests), `changeset 'src/**'`, `environment`, `expression { … }`.
- **`input`** pauses the pipeline for a human approval, restricted to a group, with a timeout so builds do not wait for ever. Do not hold an agent's executor while waiting: in real pipelines put the approval stage on `agent none`.
- **`withCredentials`** injects a stored credential as environment variables only inside the block. Note the **single quotes** around the shell script: the variables are expanded by the **shell**, not by Groovy. Groovy string interpolation (`"${REG_PASS}"` in double quotes) would put the secret into the command text, where it can leak into logs and process lists — Jenkins warns about it.

## Running Jenkins well

### Level 4 — Credentials and secrets

- Store secrets in the **credentials store** (or an external store such as Vault or AWS Secrets Manager through plugins) — never in the `Jenkinsfile` or job configuration ({{ch:secrets-manager}}).
- **Scope** credentials to the folders that need them, not globally.
- Jenkins **masks** known credential values in logs, but transformations (base64, splitting) defeat masking.
- Prefer **short-lived cloud credentials** — for example, agents running in the cloud with an attached role, or OIDC-style federation — over static access keys ({{ch:iam}}).

### Level 4 — Shared libraries

When dozens of repositories need the same pipeline, a **shared library** — a separate Git repository with Groovy code in `vars/` — provides reusable steps:

```groovy
// in the library repository: vars/nodeServicePipeline.groovy
def call(Map config = [:]) {
  pipeline {
    agent { label 'linux && docker' }
    options { timeout(time: 20, unit: 'MINUTES') }
    stages {
      stage('Install') { steps { sh 'npm ci' } }
      stage('Test')    { steps { sh 'npm test' } }
      stage('Deploy')  {
        when { branch 'main' }
        steps { sh "./scripts/deploy.sh ${config.service}" }
      }
    }
  }
}
```

```groovy
// in each service: Jenkinsfile
@Library('platform-pipelines@v4') _
nodeServicePipeline(service: 'shop-api')
```

Every service's `Jenkinsfile` shrinks to two lines, and improvements reach everyone by moving the library version. Pin the version (`@v4`) so a library change cannot break every pipeline at once. Library code runs with high trust, so its repository needs the same reviews as production code.

### Level 4 — Security and operations

Jenkins is a server **you** operate:

- **Update** Jenkins core and plugins regularly; follow the security advisories. Old plugins are the most common way Jenkins servers are compromised. Keep the plugin list short.
- **Authentication and authorisation**: single sign-on, a role-based or matrix authorisation strategy, no anonymous access, and few administrators.
- **No builds on the controller**; ephemeral agents where possible; agents isolated from each other and from production networks except where deployment needs access.
- **Never expose Jenkins directly to the internet** without strong authentication; put it behind a reverse proxy with TLS ({{ch:nginx-reverse-proxy}}).
- **Untrusted pull requests**: building pull requests from forks runs strangers' code on your agents — keep it disabled or tightly isolated.
- **Configuration as code**: the Configuration as Code (JCasC) plugin stores system configuration in YAML, so a Jenkins server can be rebuilt from Git.
- **Back up** the Jenkins home directory (job history, credentials, configuration) and test restores.
- **Performance**: enough executors on agents, not on the controller; discard old builds; archive large artifacts to external storage; watch the controller's memory and disk.

### Level 4 — Jenkins or hosted CI?

| | Jenkins | Hosted CI (GitHub Actions, GitLab CI, CircleCI) |
|---|---|---|
| Hosting | You run it | Provider runs it (self-hosted runners optional) |
| Control | Complete: any network, hardware, plugin | Within the provider's model |
| Maintenance | Updates, plugins, backups, scaling — yours | Mostly the provider's |
| Pipeline definition | Groovy `Jenkinsfile`, shared libraries | YAML, reusable workflows |
| Typical fit | Large estates, private networks, special hardware, existing investment | Most new projects and teams |

New projects usually start with the CI built into their code platform. Jenkins still makes sense where builds must stay on private networks or special hardware, or where large existing pipelines work well. Migrations happen pipeline by pipeline, keeping the same stages and quality gates.

## From beginner to enterprise

**Level 1–2 — first pipelines.** Understanding controller and agents; reading build logs; writing a declarative `Jenkinsfile` with stages, `post` and options; multibranch pipelines.

**Level 3 — good pipelines.** Containers for toolchains; real databases for integration tests; parallel stages; conditions; test reports; approvals that do not hold executors.

**Level 4 — safe pipelines.** Scoped credentials with `withCredentials` and shell-side expansion; shared libraries with pinned versions; ephemeral agents; regular updates.

**Level 5 — senior practice.** Operating Jenkins as a product: configuration as code, backups, monitoring, plugin hygiene, capacity planning and migration strategies.

**Level 6 — enterprises.** Many controllers per business unit or a managed distribution (CloudBees), central shared libraries, policy enforcement and audit, and gradual migrations to newer platforms.

## Real-world use cases

### A bank's build system

- **Setup**: Jenkins inside the bank's network, because builds and artifacts may not leave it; Kubernetes pods as ephemeral agents; a shared library giving every service the same stages, security scans and approval steps; JCasC so the controller can be rebuilt from Git.

### A game studio

- **Setup**: Windows and console development kits as labelled static agents; nightly builds producing large game packages archived to external storage; parallel stages per platform.

## Common mistakes

### Beginner: freestyle jobs configured by clicking

**Consequence:** unreviewed, unversioned pipelines. **Fix:** a `Jenkinsfile` in the repository.

### Beginner: builds running on the controller

**Consequence:** build code can read all secrets and configuration. **Fix:** zero executors on the controller.

### Intermediate: secrets in Groovy-interpolated strings

**Consequence:** secrets in logs and process lists. **Fix:** `withCredentials` and single-quoted shell scripts.

### Intermediate: tools installed by hand on agents

**Consequence:** "works on agent 3 only". **Fix:** container-based stages.

### Intermediate: `input` holding an executor

**Consequence:** agents blocked for hours. **Fix:** approvals on `agent none`, with a timeout.

### Production: outdated core and plugins

**Consequence:** known vulnerabilities in a server holding production credentials. **Fix:** regular updates and a minimal plugin set.

### Production: no backups or configuration as code

**Consequence:** a lost server means lost pipelines and history. **Fix:** JCasC, backups and tested restores.

## Debugging and troubleshooting

- **Read the console output** from the top of the failing stage; the Blue Ocean or pipeline graph views show which stage failed.
- **"Works locally, fails in Jenkins"**: different tool versions on the agent, missing environment variables, a different user or working directory. Container stages fix most of these.
- **Pipeline syntax errors**: the declarative linter (the "Pipeline Syntax" page or the CLI's `declarative-linter`) validates a `Jenkinsfile` before you push.
- **"Scripts not permitted to use method …"**: the Groovy sandbox blocked a method; avoid complex Groovy, or move it into a shared library that administrators approve.
- **Builds queued and not starting**: no online agent with the required label, or all executors busy.
- **Jenkins slow**: too many old builds or large artifacts on the controller's disk, too little memory, or builds running on the controller.

## Security summary

- Jenkins holds production credentials: **protect and update** it like production.
- **No builds on the controller**; ephemeral, isolated agents.
- **SSO and role-based permissions**; no anonymous access.
- **Credentials** in the store or an external secrets manager, scoped narrowly, injected with `withCredentials`, expanded by the shell.
- **Minimal, current plugins**; follow security advisories.
- **No untrusted fork builds** on shared agents.
- **Behind TLS and authentication**, never openly on the internet.

## How a senior engineer thinks about this

- **Pipelines as code, server as code.** `Jenkinsfile`s, shared libraries and JCasC — nothing important lives only in clicks.
- **Self-hosting is a commitment.** Updates, backups, security and capacity are ongoing work; count that cost.
- **Containers make agents boring.** The toolchain belongs to the pipeline, not to the machine.
- **Same principles, any tool.** Fast feedback, build once, quality gates, safe deployments — Jenkins is just one way to express them.
- **Migrate deliberately.** Move pipelines where there is clear benefit, one at a time, preserving gates.

## Exercises

### Exercise 1 — Write a `Jenkinsfile`

**Objective:** practise declarative pipelines.
**What to do:** write a declarative pipeline that runs on agents labelled `docker`, uses `node:22-alpine` as the build container, runs `npm ci`, then lint and unit tests in parallel, publishes `reports/*.xml` as JUnit results even on failure, has a 15-minute timeout and cleans the workspace at the end.

<details>
<summary>Show the solution</summary>

```groovy
pipeline {
  agent {
    docker { image 'node:22-alpine'; label 'docker' }
  }
  options {
    timeout(time: 15, unit: 'MINUTES')
    timestamps()
  }
  stages {
    stage('Install') { steps { sh 'npm ci' } }
    stage('Checks') {
      parallel {
        stage('Lint')  { steps { sh 'npm run lint' } }
        stage('Tests') { steps { sh 'npm test -- --reporter=junit --outputFile=reports/unit.xml' } }
      }
    }
  }
  post {
    always {
      junit allowEmptyResults: true, testResults: 'reports/*.xml'
      cleanWs()
    }
  }
}
```

</details>

### Exercise 2 — Find the problems

**Objective:** practise pipeline review.
**The pipeline:** runs with `agent any` on a controller with 4 executors; contains `environment { DB_PASSWORD = 'Pr0d-p4ss!' }`; deploys with `sh "deploy.sh --token ${TOKEN}"` inside `withCredentials`; has an `input` step on the same agent without a timeout; and was last updated, with its plugins, two years ago.

<details>
<summary>Show the solution</summary>

1. **Builds may run on the controller** (`agent any` with controller executors) — set controller executors to 0 and use labelled agents.
2. **A password in the `Jenkinsfile`** — visible to everyone with repository access and kept in Git history. Rotate it; store it as a credential.
3. **Groovy interpolation of a secret** (`"…${TOKEN}"`) — put it in single quotes so the shell expands `$TOKEN`.
4. **`input` holding an agent, without a timeout** — move the approval to `agent none` and add `timeout`.
5. **Two-year-old core and plugins** — known vulnerabilities; update and establish a regular schedule.

</details>

### Exercise 3 — Production scenario: the fragile Jenkins

**Objective:** practise operating Jenkins.
**The scenario:** a company's single Jenkins server runs builds on the controller, has 140 plugins, freestyle jobs edited by hand, and no backups. Builds randomly fail with "command not found" depending on which agent they land on. The disk filled up last month and Jenkins went down for a day. What do you do?

<details>
<summary>Show the solution</summary>

1. **Back up now** (Jenkins home), then add JCasC so configuration lives in Git.
2. **Stop building on the controller**; add labelled agents, preferably ephemeral (Kubernetes or cloud).
3. **Container-based stages** so tools come from images, ending "command not found" differences.
4. **Convert freestyle jobs to `Jenkinsfile`s** in multibranch pipelines, using a shared library for the common stages.
5. **Plugin hygiene**: remove unused plugins, update the rest and core, follow advisories.
6. **Disk**: build discarders on every job, artifacts archived externally, disk monitoring and alerts ({{ch:monitoring}}).
7. Consider whether some teams would be better served by hosted CI, and migrate those pipelines gradually.

</details>

## Summary

**Jenkins** is an open-source, self-hosted automation server. A **controller** stores configuration and schedules work; **agents** — static or ephemeral, chosen by **labels** — run the builds; the controller itself should run none. **Multibranch pipelines** discover branches and pull requests and build each one's **`Jenkinsfile`**.

A **declarative pipeline** has an `agent`, `options` (timeouts, aborting old builds, discarding old builds), `environment`, ordered `stages` of `steps` such as `sh`, and `post` blocks for results, test reports and cleanup. Stages can run **inside Docker containers** so toolchains are consistent, start real databases for integration tests, run in **parallel**, be skipped with **`when`**, and wait for approval with **`input`** and a timeout. **Credentials** are injected with `withCredentials` and expanded by the shell, never by Groovy interpolation. **Shared libraries** give many repositories the same pipeline with pinned versions.

Running Jenkins means owning it: regular core and plugin updates, single sign-on and role-based permissions, no builds on the controller, isolated agents, TLS, configuration as code, backups and capacity management. New projects usually choose hosted CI; Jenkins remains common where builds must stay in private networks or need special hardware.

## Key terms

- **Jenkins** — An open-source, self-hosted automation server for CI/CD.
- **Controller** — The central Jenkins server that stores configuration and schedules builds.
- **Agent** — A machine or container that executes builds for the controller.
- **Executor** — A slot on an agent that runs one build at a time.
- **Label** — A tag used to select which agents run a pipeline or stage.
- **Ephemeral agent** — An agent created for one build and destroyed afterwards.
- **Freestyle job** — A job configured through the web interface rather than code.
- **Jenkinsfile** — A file in the repository defining a pipeline as code.
- **Multibranch pipeline** — A job that builds every branch and pull request containing a `Jenkinsfile`.
- **Declarative pipeline** — Jenkins's structured pipeline syntax.
- **Scripted pipeline** — Jenkins's older, free-form Groovy pipeline syntax.
- **`post` section** — Steps that run after a stage or pipeline, depending on its result.
- **`when` directive** — A condition that decides whether a stage runs.
- **`input` step** — A pause that waits for a human approval.
- **Credentials store** — Jenkins's storage for secrets used by builds.
- **`withCredentials`** — A step that exposes a credential to a block as environment variables.
- **Shared library** — A versioned repository of reusable pipeline code.
- **Configuration as Code (JCasC)** — Defining Jenkins system configuration in YAML files.
- **Plugin** — An extension that adds features or integrations to Jenkins.

## What comes next

Pipelines deploy applications onto infrastructure — networks, servers, databases, load balancers. Creating that infrastructure by clicking in a cloud console has the same problems as freestyle jobs: no review, no history, no repeatability. The next chapter, {{ch:terraform}}, describes infrastructure as code with Terraform: providers, resources, state, plans, modules and safe changes to real cloud environments.
