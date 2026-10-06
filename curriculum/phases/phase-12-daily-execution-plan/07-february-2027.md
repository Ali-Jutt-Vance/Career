# Phase 12 — Chapter 7: February 2027

> **28 days · Day 134 to Day 161 · 120 scheduled hours**

## Chapter Overview

This chapter covers weeks 20, 21, 22, 23 of the 27-week plan. Every day below is a contract with yourself. Tick the tasks in the reader's **Plan** tab as you finish them — the app tracks your streak and completion rate across all 188 days.

| Week | Dates | Hours | Apps | DSA | Focus | Milestone |
|---|---|---|---|---|---|---|
| **W20** | 01 Feb – 07 Feb | 30h | 24 | Greedy — interval scheduling → DP — 1D, climbing & house robber | Nginx, TLS, DNS and the Network + CI/CD with GitHub Actions | You can explain what happens between typing a URL and receiving a response, including DNS, TCP, TLS and the proxy — end to end, from memory. · AND: A pull request with a failing test cannot be merged, and deployment happens on merge rather than by hand. |
| **W21** | 08 Feb – 14 Feb | 30h | 24 | DP — 1D, coin change → DP — 2D grids | Jenkins + AWS Foundations — IAM, EC2, S3 | BLOCK VI CLOSES. The same pipeline exists twice, in Actions and in Jenkins, and you can compare them from experience rather than opinion. · AND: You can explain the difference between an IAM user, a role and a policy, and why an application should use a role rather than an access key. |
| **W22** | 15 Feb – 21 Feb | 30h | 24 | DP — subsequences → DP — knapsack | Networking and Managed Data — VPC, RDS, ELB, Auto Scaling + Containers and Serverless on AWS — ECS, EKS, Lambda, SQS | You can draw your own VPC from memory and explain the path of a packet from the internet to the database and back. · AND: You can explain when you would choose ECS over EKS over Lambda, in terms of what each costs you rather than what each is called. |
| **W23** | 22 Feb – 28 Feb | 30h | 27 | DP — recognising the pattern cold → Mixed mediums — timed | Observability — CloudWatch, Prometheus, Grafana + LLM Fundamentals and Prompt Engineering | BLOCK VII CLOSES. You can answer "how do you know the service is healthy?" by opening a dashboard rather than describing an intention. · AND: You can state Project 3's cost per thousand requests, and explain what a token is and why a context window is a constraint rather than a feature. |

---

## Week 20 — Nginx, TLS, DNS and the Network + CI/CD with GitHub Actions

*Block VI — Linux, Docker and CI/CD · 30 hours*

What sits in front of your service, and how a request actually reaches it. Reverse proxying, certificates, DNS and the network layer — all of it asked about, most of it never learned properly by people who deploy to a platform that hides it.

Tests nobody runs are documentation. This week the tests run on every push, the image builds in the pipeline, and deployment stops being something you do by hand at eleven at night.

**Chapters this week:**

- [Nginx](#phase-5-devops--nginx)
- [Reverse Proxy](#phase-5-devops--reverse-proxy)
- [Ssl](#phase-5-devops--ssl)
- [Networking](#phase-5-devops--networking)
- [Dns](#phase-5-devops--dns)
- [Github Actions](#phase-5-devops--github-actions)
- [Cicd](#phase-5-devops--cicd)

**Deliverable:** Project 2 behind Nginx on a domain you own, with a real certificate that auto-renews, gzip, correct proxy headers, and a written trace of a request from DNS lookup to response. · ALSO: A GitHub Actions pipeline on Project 2: lint, test against a service database, build and push the image, deploy on merge to main — with branch protection that blocks a red build.

**Milestone:** You can explain what happens between typing a URL and receiving a response, including DNS, TCP, TLS and the proxy — end to end, from memory. · AND: A pull request with a failing test cannot be merged, and deployment happens on merge rather than by hand.

**Applications this week:** 24

**DSA drill:** Greedy — interval scheduling → DP — 1D, climbing & house robber — 7 problems

### Day 134 — Monday 1 February 2027

**TLS, properly · Proxy the real things**

| Time | Track | Task |
|---|---|---|
| `After Fajr + Quran` | **Engineering** | Phase 5 Chapter 11 (SSL/TLS) — the handshake, certificates, chains, and what a certificate authority actually asserts. Issue a real certificate with automatic renewal, then confirm renewal works rather than assuming it. |
| `10:00–11:00 + 16:00–16:30` | **Engineering** | Configure Nginx for what your app actually needs: WebSocket upgrade headers, gzip, client body size for uploads, sensible timeouts, and a rate limit at the edge. Then break each one and see the failure it causes. |
| `16:30–17:00` | **Job Hunt** | Three applications, tailored, logged. |
| `21:30–22:00` | **Communication** | Read Phase 10 Chapter 11 (Technical English for Engineers). Describe your Docker setup in the register you would use in a pull request. |

*Total: 4h 0m*

### Day 135 — Tuesday 2 February 2027

**The first workflow · Tests in CI with a real database**

| Time | Track | Task |
|---|---|---|
| `After Fajr + Quran` | **Engineering** | Phase 5 Chapter 6 (GitHub Actions) — workflows, jobs, steps, triggers, runners. Write one by hand that installs and lints on every push. Watch it fail, read the log, fix it. |
| `10:00–11:00 + 16:00–16:30` | **Engineering** | Add the test job with a Postgres and a Redis service container, migrations, and your week-27 suite. Getting a database to exist in CI is the step that teaches you what your local setup was hiding. |
| `16:30–17:00` | **Job Hunt** | Three applications, tailored, logged. |
| `21:30–22:00` | **Communication** | Write a two-minute answer to "what happens when you type a URL and press enter?" It is the most asked systems question there is. |

*Total: 4h 0m*

### Day 136 — Wednesday 3 February 2027

**Caching, matrices and speed · Secrets and environments**

| Time | Track | Task |
|---|---|---|
| `After Fajr + Quran` | **Engineering** | Phase 5 Chapter 6 — caching dependencies, Docker layer caching, parallel jobs. Get the pipeline under five minutes. A slow pipeline is one people learn to ignore. |
| `10:00–11:00 + 16:00–16:30` | **Engineering** | Phase 5 Chapter 7 (CI/CD) — secrets, environments, protected deployments, and the principle that CI must never see production credentials it does not need. Move every credential into repository secrets. |
| `16:30–17:00` | **Job Hunt** | Three applications, tailored, logged. |
| `21:30–22:00` | **Communication** | English speaking session with Claude: explain today's engineering work out loud as if to an interviewer, then answer two follow-up questions. Fix every grammar point it raises. |

*Total: 4h 0m*

### Day 137 — Thursday 4 February 2027

**Deploy on merge, and roll back · Run Jenkins yourself**

| Time | Track | Task |
|---|---|---|
| `After Fajr + Quran` | **Engineering** | Phase 5 Chapter 7 — deployment strategies, health-gated deploys and rollback. Wire deployment to run on merge after tests pass. Then break main deliberately, watch the pipeline stop it, and prove the rollback path works. |
| `10:00–11:00 + 16:00–16:30` | **Engineering** | Phase 5 Chapter 16 (Jenkins) — architecture: controller, agents, executors, workspaces. Run Jenkins in Docker, complete the setup wizard, install the plugins you need, and create your first pipeline job. Understand why the controller should not run builds. |
| `16:30–17:00` | **Job Hunt** | Three applications. Twelve this week. |
| `21:30–22:00` | **Communication** | English speaking session with Claude: explain today's engineering work out loud as if to an interviewer, then answer two follow-up questions. Fix every grammar point it raises. |

*Total: 4h 0m*

### Day 138 — Friday 5 February 2027

**The declarative Jenkinsfile · Agents, Docker and the real build**

| Time | Track | Task |
|---|---|---|
| `After Fajr + Quran` | **Engineering** | Phase 5 Chapter 16 — declarative versus scripted pipelines. Write a Jenkinsfile with agent, stages, steps, post conditions and environment. Commit it to the repository — the pipeline is code and lives with the code. |
| `10:00–11:00 + 16:00–16:30` | **Engineering** | Phase 5 Chapter 16 — running stages inside Docker agents, and sidecar containers for a test database. Get the full test suite running in Jenkins against a real Postgres, exactly as in Actions. |
| `16:30–17:00` | **Job Hunt** | Applications: one tailored application or one follow-up. Log it in TRACKER.md. |
| `21:30–22:00` | **Communication** | English speaking session with Claude: explain today's engineering work out loud as if to an interviewer, then answer two follow-up questions. Fix every grammar point it raises. |

*Total: 4h 0m*

### Day 139 — Saturday 6 February 2027

**Trace it end to end**

| Time | Track | Task |
|---|---|---|
| `10:00–12:00` | **Engineering** | Deep build, two hours: Project 2 live on your own domain over HTTPS behind Nginx. Then write the full request trace into the README — DNS, TCP, TLS, Nginx, Node, Postgres, and back. |
| `12:30–13:30` | **Engineering** | Drill: five networking and TLS questions, spoken, timed. |
| `14:00–15:00` | **Review** | Weekly review. Read next week ahead. |
| `15:30–16:00` | **Job Hunt** | Three applications, tailored, logged. |
| `16:00–16:30` | **Job Hunt** | Three applications, tailored, logged. |

*Total: 5h 0m*

### Day 140 — Sunday 7 February 2027

**Protect the branch**

| Time | Track | Task |
|---|---|---|
| `10:00–12:00` | **Engineering** | Deep build, two hours: branch protection on main — no direct pushes, required checks, required review. Then work the way a team works for the rest of the plan: branch, PR, review, merge. |
| `12:30–13:30` | **Engineering** | Drill: three problems, timed. Then explain your pipeline aloud in ninety seconds. |
| `14:00–15:00` | **Review** | Weekly review. Read next week ahead — Jenkins. |
| `15:30–16:00` | **Job Hunt** | Three applications, tailored, logged. |
| `16:00–16:30` | **Job Hunt** | Three applications. Twelve this week. |

*Total: 5h 0m*

## Week 21 — Jenkins + AWS Foundations — IAM, EC2, S3

*Block VI — Linux, Docker and CI/CD · 30 hours*

A large number of Pakistani employers run Jenkins, often self-hosted and inherited. GitHub Actions teaches you pipelines; Jenkins teaches you the version of pipelines that a real company asks you to maintain. Knowing both is a hiring advantage.

You have the certificate and have never built anything. This week gives it evidence: identity, a server you configured, and object storage wired into your own application.

**Chapters this week:**

- [Jenkins](#phase-5-devops--jenkins)
- [Cicd](#phase-5-devops--cicd)
- [Aws Overview](#phase-6-cloud--aws-overview)
- [Iam](#phase-6-cloud--iam)
- [Ec2](#phase-6-cloud--ec2)
- [S3](#phase-6-cloud--s3)
- [Terraform](#phase-5-devops--terraform)

**Deliverable:** A Jenkins instance running in Docker with a declarative Jenkinsfile in the Project 2 repository — checkout, install, lint, test against a database, build the image, deploy on main — plus credentials handled properly and one shared library function. · ALSO: An AWS account locked down with MFA and least-privilege users, a billing alarm, Project 2 running on EC2, and S3 handling uploads through pre-signed URLs with public access blocked.

**Milestone:** BLOCK VI CLOSES. The same pipeline exists twice, in Actions and in Jenkins, and you can compare them from experience rather than opinion. · AND: You can explain the difference between an IAM user, a role and a policy, and why an application should use a role rather than an access key.

**Applications this week:** 24

**DSA drill:** DP — 1D, coin change → DP — 2D grids — 8 problems

### Day 141 — Monday 8 February 2027

**Credentials, and never in the Jenkinsfile · Shared libraries and multibranch**

| Time | Track | Task |
|---|---|---|
| `After Fajr + Quran` | **Engineering** | Phase 5 Chapter 16 — the credentials store, withCredentials, and masking. Then deliberately echo a secret and watch Jenkins mask it — and understand why that masking is a safety net, not a strategy. |
| `10:00–11:00 + 16:00–16:30` | **Engineering** | Phase 5 Chapter 16 — multibranch pipelines, so every branch and PR builds automatically, and shared libraries, so five repositories do not copy the same eighty lines. Extract one function into a shared library and use it. |
| `16:30–17:00` | **Job Hunt** | Three applications, tailored, logged. |
| `21:30–22:00` | **Communication** | Write five sentences describing your pipeline. It goes in the README and it is an interview answer. |

*Total: 4h 0m*

### Day 142 — Tuesday 9 February 2027

**IAM first, and a billing alarm · Policies you can read**

| Time | Track | Task |
|---|---|---|
| `After Fajr + Quran` | **Engineering** | Phase 6 Chapter 2 (IAM) — users, groups, roles, policies, least privilege. Lock down the root account, enable MFA, create a working user. Then set a billing alarm at a number that would hurt. Do this before anything else. |
| `10:00–11:00 + 16:00–16:30` | **Engineering** | Phase 6 Chapter 2 — policy documents. Effect, Action, Resource, Condition. Write one by hand that allows exactly one bucket prefix and nothing else, attach it, and prove both the allow and the deny. Then read Phase 5 Chapter 8 (Terraform) and express that one policy as Terraform, so you have seen infrastructure as code before you need it. |
| `16:30–17:00` | **Job Hunt** | Three applications, tailored, logged. |
| `21:30–22:00` | **Communication** | Write a ninety-second answer to "what is the difference between Jenkins and GitHub Actions?" from having run both. |

*Total: 4h 0m*

### Day 143 — Wednesday 10 February 2027

**EC2, and a server you configured · Security groups are the firewall**

| Time | Track | Task |
|---|---|---|
| `After Fajr + Quran` | **Engineering** | Phase 6 Chapter 3 (EC2) — instance types, AMIs, security groups, key pairs, user data. Launch one, SSH in, install what Project 2 needs by hand, and run it. Everything from week 34 is for today. |
| `10:00–11:00 + 16:00–16:30` | **Engineering** | Phase 6 Chapter 3 — security groups versus network ACLs, stateful versus stateless. Lock the instance down to Nginx on 443 and SSH from your IP only. Then break your own access and fix it through the console — a useful thing to have done once. |
| `16:30–17:00` | **Job Hunt** | Three applications, tailored, logged. |
| `21:30–22:00` | **Communication** | English speaking session with Claude: explain today's engineering work out loud as if to an interviewer, then answer two follow-up questions. Fix every grammar point it raises. |

*Total: 4h 0m*

### Day 144 — Thursday 11 February 2027

**S3 and pre-signed uploads · Design the VPC**

| Time | Track | Task |
|---|---|---|
| `After Fajr + Quran` | **Engineering** | Phase 6 Chapter 4 (S3) — buckets, keys, storage classes, bucket policies and the public access block. Move the week-29 upload flow onto S3 with pre-signed URLs, then confirm the bucket is not publicly listable. |
| `10:00–11:00 + 16:00–16:30` | **Engineering** | Phase 6 Chapter 7 (VPC) — CIDR blocks, subnets, route tables, internet gateway, NAT. Draw the network on paper before building it: what is public, what is private, and what can reach the internet outbound only. |
| `16:30–17:00` | **Job Hunt** | Three applications. Twelve this week. |
| `21:30–22:00` | **Communication** | English speaking session with Claude: explain today's engineering work out loud as if to an interviewer, then answer two follow-up questions. Fix every grammar point it raises. |

*Total: 4h 0m*

### Day 145 — Friday 12 February 2027

**Build it and break it · RDS, private**

| Time | Track | Task |
|---|---|---|
| `After Fajr + Quran` | **Engineering** | Build the VPC. Then debug it, because it will not work first time: the classic failure is a private instance with no NAT route that cannot reach the package registry. Diagnose it from the route table rather than by guessing. |
| `10:00–11:00 + 16:00–16:30` | **Engineering** | Phase 6 Chapter 5 (RDS) — managed Postgres, subnet groups, parameter groups, automated backups, Multi-AZ. Create it with no public access, connect Project 2 to it from the private subnet, and restore a snapshot once so you know the procedure. |
| `16:30–17:00` | **Job Hunt** | Applications: one tailored application or one follow-up. Log it in TRACKER.md. |
| `21:30–22:00` | **Communication** | English speaking session with Claude: explain today's engineering work out loud as if to an interviewer, then answer two follow-up questions. Fix every grammar point it raises. |

*Total: 4h 0m*

### Day 146 — Saturday 13 February 2027

**BLOCK VI REVIEW**

| Time | Track | Task |
|---|---|---|
| `10:00–12:00` | **Engineering** | Deep build, two hours: finish the Jenkins pipeline end to end including deploy-on-main. Then write the comparison into the README: what each tool does better, and which you would choose for a new team and why. |
| `12:30–13:30` | **Engineering** | Block drill: ten infrastructure questions, spoken, timed — Docker, Nginx, TLS, CI/CD, Jenkins, rollback. |
| `14:00–15:00` | **Review** | BLOCK VI REVIEW. Could I be trusted with production at a tier-2 company today, honestly? Read Block VII ahead — AWS. |
| `15:30–16:00` | **Job Hunt** | Three applications, tailored, logged. |
| `16:00–16:30` | **Job Hunt** | Three applications, tailored, logged. |

*Total: 5h 0m*

### Day 147 — Sunday 14 February 2027

**Roles, not keys**

| Time | Track | Task |
|---|---|---|
| `10:00–12:00` | **Engineering** | Deep build, two hours: remove every hard-coded AWS key from Project 2 and use an instance role instead. Then search your git history for keys you committed earlier and rotate anything you find. |
| `12:30–13:30` | **Engineering** | Drill: five AWS questions, spoken, timed. Include "user versus role" and "how does your app authenticate to S3?" |
| `14:00–15:00` | **Review** | Weekly review. Check the bill. Read next week ahead. |
| `15:30–16:00` | **Job Hunt** | Three applications, tailored, logged. |
| `16:00–16:30` | **Job Hunt** | Three applications. Twelve this week. |

*Total: 5h 0m*

## Week 22 — Networking and Managed Data — VPC, RDS, ELB, Auto Scaling + Containers and Serverless on AWS — ECS, EKS, Lambda, SQS

*Block VII — AWS · 30 hours*

The part of AWS that is actually architecture. A private network, a managed database that is not reachable from the internet, a load balancer in front, and a group that replaces an instance when it dies.

Where your Docker work meets the cloud. ECS for running containers without operating Kubernetes, enough EKS to hold the conversation, Lambda for the work that suits it, and SQS because your queue should not depend on one Redis box.

**Chapters this week:**

- [Vpc](#phase-6-cloud--vpc)
- [Rds](#phase-6-cloud--rds)
- [Elb](#phase-6-cloud--elb)
- [Auto Scaling](#phase-6-cloud--auto-scaling)
- [Ecs](#phase-6-cloud--ecs)
- [Eks](#phase-6-cloud--eks)
- [Lambda](#phase-6-cloud--lambda)
- [Sns Sqs](#phase-6-cloud--sns-sqs)
- [Secrets Manager](#phase-6-cloud--secrets-manager)

**Deliverable:** Project 2 on a VPC you designed — public and private subnets, RDS in private with no public access, an application load balancer in front, and an auto-scaling group of at least two instances. · ALSO: Project 2 running on ECS Fargate — API and worker as separate services behind the load balancer, secrets from Secrets Manager, and one queue moved to SQS with a dead-letter queue.

**Milestone:** You can draw your own VPC from memory and explain the path of a packet from the internet to the database and back. · AND: You can explain when you would choose ECS over EKS over Lambda, in terms of what each costs you rather than what each is called.

**Applications this week:** 24

**DSA drill:** DP — subsequences → DP — knapsack — 8 problems

### Day 148 — Monday 15 February 2027

**The load balancer · Auto scaling, and statelessness**

| Time | Track | Task |
|---|---|---|
| `After Fajr + Quran` | **Engineering** | Phase 6 Chapter 11 (ELB) — the application load balancer, target groups, listeners, health checks and TLS termination. Put it in front of two instances. Your week-13 health check now earns its keep. |
| `10:00–11:00 + 16:00–16:30` | **Engineering** | Phase 6 Chapter 10 (Auto Scaling) — launch templates, groups, scaling policies, and the requirement that instances be disposable. Find everything in Project 2 that assumes one server — local files, in-memory state, a cron job — and fix each one. |
| `16:30–17:00` | **Job Hunt** | Three applications, tailored, logged. |
| `21:30–22:00` | **Communication** | Write five sentences on what least privilege means in practice, with an example from your own policy. |

*Total: 4h 0m*

### Day 149 — Tuesday 16 February 2027

**ECS and Fargate · The worker as its own service**

| Time | Track | Task |
|---|---|---|
| `After Fajr + Quran` | **Engineering** | Phase 6 Chapter 12 (ECS) — clusters, task definitions, services, and Fargate versus EC2 launch types. Push your image to ECR and run the API as a Fargate service behind the load balancer from last week. |
| `10:00–11:00 + 16:00–16:30` | **Engineering** | Run the worker as a second ECS service with its own scaling — it scales on queue depth, not on HTTP traffic. This separation is the argument for why the worker was a separate process from week 31. |
| `16:30–17:00` | **Job Hunt** | Three applications, tailored, logged. |
| `21:30–22:00` | **Communication** | Write a two-minute answer to "why would you put a database in a private subnet?" |

*Total: 4h 0m*

### Day 150 — Wednesday 17 February 2027

**Secrets, properly · SQS and SNS**

| Time | Track | Task |
|---|---|---|
| `After Fajr + Quran` | **Engineering** | Phase 6 Chapter 16 (Secrets Manager) — secrets versus parameters, rotation, and injecting them into a task definition rather than baking them into an image. Move every Project 2 secret across. |
| `10:00–11:00 + 16:00–16:30` | **Engineering** | Phase 6 Chapter 15 (SNS/SQS) — queues, topics, visibility timeout, and the managed dead-letter queue. Move one Project 2 queue to SQS. The visibility timeout is the part people get wrong; make sure you can explain it. |
| `16:30–17:00` | **Job Hunt** | Three applications, tailored, logged. |
| `21:30–22:00` | **Communication** | English speaking session with Claude: explain today's engineering work out loud as if to an interviewer, then answer two follow-up questions. Fix every grammar point it raises. |

*Total: 4h 0m*

### Day 151 — Thursday 18 February 2027

**Lambda, and EKS enough to discuss · What is worth measuring**

| Time | Track | Task |
|---|---|---|
| `After Fajr + Quran` | **Engineering** | Phase 6 Chapter 14 (Lambda) — the execution model, cold starts, and the work it genuinely suits. Write one real Lambda for a scheduled task. Then Phase 6 Chapter 13 (EKS): read it, understand pods, services and deployments, and be honest that you have not operated a cluster. |
| `10:00–11:00 + 16:00–16:30` | **Engineering** | Phase 5 Chapter 13 (Monitoring) — the four golden signals: latency, traffic, errors, saturation. Write down what each one means for Project 2 specifically before instrumenting anything. |
| `16:30–17:00` | **Job Hunt** | Three applications. Twelve this week. |
| `21:30–22:00` | **Communication** | English speaking session with Claude: explain today's engineering work out loud as if to an interviewer, then answer two follow-up questions. Fix every grammar point it raises. |

*Total: 4h 0m*

### Day 152 — Friday 19 February 2027

**Prometheus and instrumentation · PromQL**

| Time | Track | Task |
|---|---|---|
| `After Fajr + Quran` | **Engineering** | Phase 5 Chapter 14 (Prometheus) — the pull model, exporters, and metric types: counter, gauge, histogram, summary. Instrument Project 2 with a /metrics endpoint: request count, duration histogram, queue depth, error count. Understand why a histogram, not an average. |
| `10:00–11:00 + 16:00–16:30` | **Engineering** | Phase 5 Chapter 14 — PromQL. rate(), histogram_quantile(), aggregation by label. Write the four queries that matter: request rate, error rate, p95 latency, queue depth. Type them yourself until they stop being incantations. |
| `16:30–17:00` | **Job Hunt** | Applications: one tailored application or one follow-up. Log it in TRACKER.md. |
| `21:30–22:00` | **Communication** | English speaking session with Claude: explain today's engineering work out loud as if to an interviewer, then answer two follow-up questions. Fix every grammar point it raises. |

*Total: 4h 0m*

### Day 153 — Saturday 20 February 2027

**Kill an instance on purpose**

| Time | Track | Task |
|---|---|---|
| `10:00–12:00` | **Engineering** | Deep build, two hours: terminate an instance while making requests and prove the service stays up and a replacement arrives. Then draw the final architecture and put it in the README. |
| `12:30–13:30` | **Engineering** | Drill: five AWS networking questions, spoken, timed. Then present the architecture in three minutes as in a design round. |
| `14:00–15:00` | **Review** | Weekly review. Check the bill again. Read next week ahead. |
| `15:30–16:00` | **Job Hunt** | Three applications, tailored, logged. |
| `16:00–16:30` | **Job Hunt** | Three applications, tailored, logged. |

*Total: 5h 0m*

### Day 154 — Sunday 21 February 2027

**Deploy the whole thing**

| Time | Track | Task |
|---|---|---|
| `10:00–12:00` | **Engineering** | Deep build, two hours: API and worker both on ECS, secrets injected, SQS handling one queue, deploying from the pipeline. Then force a task to fail and watch ECS replace it. |
| `12:30–13:30` | **Engineering** | Drill: five questions on containers and serverless, spoken, timed. |
| `14:00–15:00` | **Review** | Weekly review. Check the bill. Read next week ahead. |
| `15:30–16:00` | **Job Hunt** | Three applications, tailored, logged. |
| `16:00–16:30` | **Job Hunt** | Three applications. Twelve this week. |

*Total: 5h 0m*

## Week 23 — Observability — CloudWatch, Prometheus, Grafana + LLM Fundamentals and Prompt Engineering

*Block VII — AWS · 30 hours*

You cannot operate what you cannot see. Logs you can search, metrics that mean something, dashboards that answer a question, and exactly one alarm that wakes you up — because an alert nobody acts on trains you to ignore alerts.

Not a course on AI. A working understanding of tokens, context, cost and failure modes, so that Project 3 is engineering rather than incantation — and so you answer AI questions like a backend engineer rather than a user.

**Chapters this week:**

- [Monitoring](#phase-5-devops--monitoring)
- [Cloudwatch](#phase-6-cloud--cloudwatch)
- [Prometheus](#phase-5-devops--prometheus)
- [Grafana](#phase-5-devops--grafana)
- [Cost Optimization](#phase-6-cloud--cost-optimization)
- [Professional Communication Reference](#phase-10-english-communication--professional-communication-reference)
- [Llm Fundamentals](#phase-8-ai-engineering--llm-fundamentals)
- [Prompt Engineering](#phase-8-ai-engineering--prompt-engineering)
- [Remote Work The Next Step](#phase-11-job-hunt-pakistan--remote-work-the-next-step)

**Deliverable:** Project 2 exporting application metrics to Prometheus, a Grafana dashboard answering four real questions, logs searchable in CloudWatch, and one alarm on a symptom that reaches your phone. · ALSO: PROJECT3.md with a one-paragraph scope and a chosen document set, plus a working API integration with token accounting, a hard cost ceiling, retries and a measured cost per request.

**Milestone:** BLOCK VII CLOSES. You can answer "how do you know the service is healthy?" by opening a dashboard rather than describing an intention. · AND: You can state Project 3's cost per thousand requests, and explain what a token is and why a context window is a constraint rather than a feature.

**Applications this week:** 27

**DSA drill:** DP — recognising the pattern cold → Mixed mediums — timed — 8 problems

### Day 155 — Monday 22 February 2027

**Grafana dashboards · Logs, alarms and the bill**

| Time | Track | Task |
|---|---|---|
| `After Fajr + Quran` | **Engineering** | Phase 5 Chapter 15 (Grafana) — data sources, panels, variables. Build one dashboard that answers four questions at a glance. A dashboard with thirty panels answers none; build the small one. |
| `10:00–11:00 + 16:00–16:30` | **Engineering** | Phase 6 Chapter 6 (CloudWatch) — log groups, retention, metric filters, alarms. Ship structured logs with request ids, then answer a question from the logs alone. Set exactly one alarm on a symptom a user would feel and route it to your phone. Then Phase 6 Chapter 19: read your bill line by line and cut the two largest avoidable items. |
| `16:30–17:00` | **Job Hunt** | Three applications, tailored, logged. |
| `21:30–22:00` | **Communication** | Write a ninety-second answer to "how do you scale a background worker independently of your API?" |

*Total: 4h 0m*

### Day 156 — Tuesday 23 February 2027

**Tokens, context and cost · Choose Project 3**

| Time | Track | Task |
|---|---|---|
| `After Fajr + Quran` | **Engineering** | Phase 8 Chapter 1 (LLM Fundamentals) — tokens, context windows, temperature, pricing. Tokenise three of your own documents and work out what a request would actually cost. Cost is an engineering constraint and most demos ignore it. |
| `10:00–11:00 + 16:00–16:30` | **Engineering** | Write PROJECT3.md: one paragraph of scope. It must answer questions over a real body of documents you have, be finishable in three weeks at this budget, and have a measurable answer quality. Small and finished beats ambitious and abandoned. |
| `16:30–17:00` | **Job Hunt** | Three applications, tailored, logged. |
| `21:30–22:00` | **Communication** | Write five sentences on why an average response time is a misleading number, and what you would report instead. |

*Total: 4h 0m*

### Day 157 — Wednesday 24 February 2027

**Prompts as an interface · Treat it as an unreliable dependency**

| Time | Track | Task |
|---|---|---|
| `After Fajr + Quran` | **Engineering** | Phase 8 Chapter 2 (Prompt Engineering) — structure, instructions, examples, output formats. Build a prompt that returns strict JSON your code can parse, then make your code handle the case where it does not. That failure path is the engineering. |
| `10:00–11:00 + 16:00–16:30` | **Engineering** | Wire the model API up properly: timeouts, retries with backoff, rate-limit handling, token accounting per request, and a hard cost ceiling. Everything from week 32 applies — it is a third-party service that will be slow and will fail. |
| `16:30–17:00` | **Job Hunt** | Three applications, tailored, logged. |
| `21:30–22:00` | **Communication** | English speaking session with Claude: explain today's engineering work out loud as if to an interviewer, then answer two follow-up questions. Fix every grammar point it raises. |

*Total: 4h 0m*

### Day 158 — Thursday 25 February 2027

**Ingest the documents · Embeddings, concretely**

| Time | Track | Task |
|---|---|---|
| `After Fajr + Quran` | **Engineering** | Load, clean and chunk your document set. Chunking strategy determines answer quality later — write down the size and overlap you chose and why, so you can change it deliberately next week rather than by feel. |
| `10:00–11:00 + 16:00–16:30` | **Engineering** | Phase 8 Chapter 3 (Embeddings and Vector Databases) — what an embedding is and what cosine similarity measures. Embed ten sentences you wrote and check which pairs come out closest. Intuition first, library second. |
| `16:30–17:00` | **Job Hunt** | Three applications. Twelve this week. |
| `21:30–22:00` | **Communication** | English speaking session with Claude: explain today's engineering work out loud as if to an interviewer, then answer two follow-up questions. Fix every grammar point it raises. |

*Total: 4h 0m*

### Day 159 — Friday 26 February 2027

**Store and query vectors · Build the evaluation set first**

| Time | Track | Task |
|---|---|---|
| `After Fajr + Quran` | **Engineering** | Phase 8 Chapter 3 — vector storage and index types. Use pgvector on the Postgres you already know rather than adding a new database — and be able to say why that is the right call for this size of problem. Embed your chunks, store them, query nearest neighbours. |
| `10:00–11:00 + 16:00–16:30` | **Engineering** | Write twenty questions against your documents and record by hand which chunk should answer each. This is tedious and it is the single thing that turns a demo into engineering — without it you cannot tell whether a change helped. |
| `16:30–17:00` | **Job Hunt** | Applications: one tailored application or one follow-up. Log it in TRACKER.md. |
| `21:30–22:00` | **Communication** | English speaking session with Claude: explain today's engineering work out loud as if to an interviewer, then answer two follow-up questions. Fix every grammar point it raises. |

*Total: 4h 0m*

### Day 160 — Saturday 27 February 2027

**BLOCK VII REVIEW**

| Time | Track | Task |
|---|---|---|
| `10:00–12:00` | **Engineering** | Deep build, two hours: trigger the alarm deliberately and confirm it arrives. Then write the operations section of the README — the dashboard, what the alarm means, where the logs are, how to roll back. |
| `12:30–13:30` | **Engineering** | Block drill: ten AWS and observability questions, spoken, timed. |
| `14:00–15:00` | **Review** | BLOCK VII REVIEW. Two services running on infrastructure I configured and can explain line by line — true or not? Read Block VIII ahead — AI engineering. |
| `15:30–16:00` | **Job Hunt** | Four applications, tailored, logged. The quota rises to fifteen — this is the push. |
| `16:00–16:30` | **Job Hunt** | Four applications, tailored, logged. |

*Total: 5h 0m*

### Day 161 — Sunday 28 February 2027

**The crude baseline**

| Time | Track | Task |
|---|---|---|
| `10:00–12:00` | **Engineering** | Deep build, two hours: the crudest end-to-end path — question in, whole document in context, answer out. It will be expensive and mediocre. That is the baseline retrieval has to beat, and you need the number. |
| `12:30–13:30` | **Engineering** | Drill: three LeetCode problems, timed, no AI. |
| `14:00–15:00` | **Review** | Weekly review. Write the baseline cost and quality into PROJECT3.md. Read next week ahead. |
| `15:30–16:00` | **Job Hunt** | Four applications, tailored, logged. |
| `16:00–16:30` | **Job Hunt** | Three applications. Fifteen this week. |

*Total: 5h 0m*

