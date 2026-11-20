# ECS: Running Containers

> [!GOALS]
> - Explain what Amazon ECS does and how it compares with running containers yourself, with EKS and with Lambda.
> - Understand **clusters**, **task definitions**, **tasks** and **services**, and the **Fargate** and **EC2** launch types.
> - Configure networking (`awsvpc`), load balancers, the **task role** and **execution role**, secrets and logs.
> - Deploy safely with rolling updates, health checks, the **deployment circuit breaker** and blue/green.
> - Scale services and run one-off and scheduled tasks.

## Why this matters

{{ch:docker}} packaged the application into an image, and {{ch:docker-compose}} ran several containers on one machine. Production needs more: containers spread across availability zones, replaced automatically when they fail, registered with a load balancer, scaled with traffic, deployed without downtime, and given permissions, secrets and logs. A system that does this is a **container orchestrator**.

**Amazon Elastic Container Service (ECS)** is AWS's own orchestrator. It is simpler than Kubernetes, deeply integrated with AWS (IAM, load balancers, CloudWatch, Secrets Manager), and with **Fargate** it runs containers without any servers for you to manage. Many companies — from start-ups to large enterprises — run their APIs and workers on ECS, and its concepts (a task definition, a desired count, rolling deployments, health checks) transfer directly to Kubernetes ({{ch:eks}}).

## The simple idea

Think of a staffing agency running a café chain. You give the agency a **job description** ("barista: needs an espresso machine, 2 GB of milk, these keys") and say "keep three baristas working at the high-street café at all times". The agency finds people, sends them to work, replaces anyone who falls ill, sends more when it gets busy, and swaps old staff for newly trained ones one at a time so the café never closes.

ECS is that agency for containers: the **task definition** is the job description, the **service** is "keep N running", and ECS does the hiring, replacing and swapping.

> [!ANALOGY]
> ECS is like a staffing agency: you write the job description and say how many workers you need, and it keeps that many working, replacing anyone who fails.
>
> **Where the analogy breaks:** an agency's workers remember their previous shifts. ECS tasks remember nothing — every task starts fresh from the image, and anything written to its local disk disappears when it stops. Workers can be replaced at any moment, so they must be stateless.

## The proper definition and key words

**Amazon ECS** is a managed container orchestration service. It runs **tasks** — one or more containers defined by a **task definition** — on a **cluster**, using **Fargate** (serverless capacity) or **EC2 instances**, and keeps **services** at their desired count, integrated with load balancers, auto scaling and IAM.

Key words:

- **Cluster** — a logical group of tasks and services (and EC2 capacity, if used).
- **Task definition** — a versioned description of containers: image, CPU, memory, ports, environment, secrets, logging, roles.
- **Task** — a running instance of a task definition.
- **Service** — keeps a desired number of tasks running, replaces failed ones, connects them to a load balancer and manages deployments.
- **Fargate** — AWS runs each task on capacity you never see; you pay per task's CPU and memory per second.
- **EC2 launch type / capacity provider** — tasks run on EC2 instances in your account, which you manage (or that capacity providers scale).
- **`awsvpc` network mode** — each task gets its own network interface, private IP and security groups.
- **Task role** — IAM permissions for the application code inside the task.
- **Task execution role** — IAM permissions ECS needs to start the task: pull the image, fetch secrets, write logs.
- **ECR** — Elastic Container Registry, AWS's private image registry.
- **Deployment circuit breaker** — stops and rolls back deployments whose tasks keep failing.

## The building blocks

### Level 1 — Where ECS fits

| Option | You manage | Good for |
|---|---|---|
| Containers on EC2 by hand | Everything | Rarely the right choice |
| **ECS on Fargate** | Images, task definitions, services | Most web APIs and workers on AWS; small and medium teams |
| ECS on EC2 | Also the instances (patching, scaling) | GPUs, special instance types, very large steady fleets for cost |
| EKS (Kubernetes) | Kubernetes resources, add-ons, often nodes | Teams invested in Kubernetes, portability, its ecosystem ({{ch:eks}}) |
| Lambda | Function code | Event-driven, spiky, short tasks ({{ch:lambda}}) |

### Level 1 — The pieces together

```text
 ECR: 111122223333.dkr.ecr.eu-west-2.amazonaws.com/shop-api:4f9c2e1
        │ image
 task definition shop-api:27  (0.5 vCPU, 1 GB, port 3000, env, secrets, logs, roles)
        │
 service shop-api  (desired 4, Fargate, private subnets a/b/c, security group sg-api,
        │           ALB target group, rolling deployment, circuit breaker on)
        ├── task (zone a, 10.20.48.17)   ├── task (zone b, 10.20.64.9)
        ├── task (zone c, 10.20.80.22)   └── task (zone a, 10.20.49.3)
        ▼
 ALB target group ← health checks GET /health
```

### Level 2 — A task definition

```json
{
  "family": "shop-api",
  "requiresCompatibilities": ["FARGATE"],
  "networkMode": "awsvpc",
  "cpu": "512",
  "memory": "1024",
  "runtimePlatform": { "cpuArchitecture": "ARM64", "operatingSystemFamily": "LINUX" },
  "executionRoleArn": "arn:aws:iam::111122223333:role/shop-api-execution",
  "taskRoleArn": "arn:aws:iam::111122223333:role/shop-api-task",
  "containerDefinitions": [{
    "name": "api",
    "image": "111122223333.dkr.ecr.eu-west-2.amazonaws.com/shop-api:4f9c2e1",
    "essential": true,
    "portMappings": [{ "containerPort": 3000, "protocol": "tcp" }],
    "environment": [
      { "name": "NODE_ENV", "value": "production" },
      { "name": "PORT", "value": "3000" }
    ],
    "secrets": [
      { "name": "DATABASE_URL", "valueFrom": "arn:aws:secretsmanager:eu-west-2:111122223333:secret:shop/db-url-AbC123" }
    ],
    "logConfiguration": {
      "logDriver": "awslogs",
      "options": { "awslogs-group": "/ecs/shop-api", "awslogs-region": "eu-west-2", "awslogs-stream-prefix": "api" }
    },
    "healthCheck": {
      "command": ["CMD-SHELL", "wget -qO- http://localhost:3000/health || exit 1"],
      "interval": 15, "timeout": 5, "retries": 3, "startPeriod": 20
    },
    "stopTimeout": 30
  }]
}
```

- **Image by commit tag** (or digest), never `latest` — each task definition **revision** pins exactly what runs, and rolling back means deploying the previous revision ({{ch:cicd}}).
- **CPU and memory** are set per task (Fargate allows fixed combinations, from 0.25 vCPU / 0.5 GB upwards). ARM64 (Graviton) is usually cheaper.
- **`environment`** for plain configuration; **`secrets`** for sensitive values, fetched from Secrets Manager or Parameter Store **at start** by the execution role and injected as environment variables — never written into the task definition ({{ch:secrets-manager}}).
- **`awslogs`** sends stdout and stderr to CloudWatch Logs ({{ch:cloudwatch}}); FireLens can route logs elsewhere.
- **`stopTimeout`** gives the application time to shut down after `SIGTERM` before `SIGKILL` ({{ch:docker}}).

### Level 2 — Two roles, two purposes

| | Task execution role | Task role |
|---|---|---|
| Used by | The ECS agent, before and around your container | Your application code |
| Typical permissions | Pull from ECR, read the task's secrets, write to its log group | Exactly what the app calls: its S3 prefix, its queue, its table |
| Mistake to avoid | Granting app permissions here | Using a broad role shared by all services |

Inside the container, the SDK receives the task role's temporary credentials automatically ({{ch:iam}}).

### Level 2 — Networking

With **`awsvpc`** mode, every task has its own elastic network interface and private IP in your subnets, and its own **security group** — so security rules apply per service ("the API's group accepts 3000 from the ALB's group") just as with EC2 ({{ch:vpc}}).

- Run tasks in **private subnets** without public IPs. They need outbound access to ECR, CloudWatch Logs and Secrets Manager — through a NAT gateway or, better, **VPC endpoints** (ECR API and DKR, S3 gateway for image layers, Logs, Secrets Manager).
- Each task uses an IP address: plan subnet sizes for the maximum task count, including deployments that temporarily double it.
- Services find each other through the load balancer, **Service Connect** or Cloud Map (DNS-based service discovery).

## Deploying and scaling

### Level 3 — Rolling deployments

Updating a service to a new task definition revision starts a **rolling deployment** governed by two settings: **`minimumHealthyPercent`** (how much capacity must stay healthy) and **`maximumPercent`** (how much may run in total). This model shows their effect when replacing four tasks:

```ts
// An ECS rolling deployment in a simplified model: replace 4 tasks of v1 with v2,
// never going below minimumHealthyPercent or above maximumPercent of the desired count.
type Task = { version: string; state: "running" | "starting" };

function deploy(desired: number, minHealthyPct: number, maxPct: number, newVersionHealthy = true) {
  const minHealthy = Math.ceil((desired * minHealthyPct) / 100);
  const maxTotal = Math.floor((desired * maxPct) / 100);
  let tasks: Task[] = Array.from({ length: desired }, () => ({ version: "v1", state: "running" as const }));
  const lines: string[] = [];
  for (let step = 1; step <= 10; step++) {
    // 1. tasks that were starting pass their health check (or fail it)
    tasks = tasks.flatMap((t) => (t.state === "starting" ? (newVersionHealthy ? [{ ...t, state: "running" as const }] : []) : [t]));
    const v2running = tasks.filter((t) => t.version === "v2" && t.state === "running").length;
    // 2. stop old tasks while staying at or above the minimum healthy count
    const healthy = tasks.filter((t) => t.state === "running").length;
    let canStop = Math.max(0, healthy - minHealthy);
    tasks = tasks.filter((t) => !(t.version === "v1" && canStop-- > 0 && v2running + healthy > minHealthy));
    // 3. start new tasks up to the maximum total
    const missing = desired - tasks.filter((t) => t.version === "v2").length;
    const room = maxTotal - tasks.length;
    for (let i = 0; i < Math.min(missing, room); i++) tasks.push({ version: "v2", state: "starting" });
    const count = (v: string, s?: string) => tasks.filter((t) => t.version === v && (!s || t.state === s)).length;
    lines.push(`  step ${step}: v1 running ${count("v1")}, v2 running ${count("v2", "running")}, v2 starting ${count("v2", "starting")}`);
    if (count("v1") === 0 && count("v2", "starting") === 0) { lines.push(`  done after ${step} steps`); break; }
    if (!newVersionHealthy && step === 4) { lines.push("  new tasks keep failing health checks -> circuit breaker rolls back to v1"); break; }
  }
  console.log(`desired ${desired}, minimumHealthyPercent ${minHealthyPct}, maximumPercent ${maxPct}:`);
  console.log(lines.join("\n"));
}

deploy(4, 100, 200);      // start all new tasks first, then stop old ones: fast, needs double capacity
deploy(4, 50, 100);       // no extra capacity: stop half, replace, repeat
deploy(4, 100, 150, false);
```

**Output:**

```text
desired 4, minimumHealthyPercent 100, maximumPercent 200:
  step 1: v1 running 4, v2 running 0, v2 starting 4
  step 2: v1 running 0, v2 running 4, v2 starting 0
  done after 2 steps
desired 4, minimumHealthyPercent 50, maximumPercent 100:
  step 1: v1 running 2, v2 running 0, v2 starting 2
  step 2: v1 running 0, v2 running 2, v2 starting 2
  step 3: v1 running 0, v2 running 4, v2 starting 0
  done after 3 steps
desired 4, minimumHealthyPercent 100, maximumPercent 150:
  step 1: v1 running 4, v2 running 0, v2 starting 2
  step 2: v1 running 4, v2 running 0, v2 starting 2
  step 3: v1 running 4, v2 running 0, v2 starting 2
  step 4: v1 running 4, v2 running 0, v2 starting 2
  new tasks keep failing health checks -> circuit breaker rolls back to v1
```

- **100 / 200** starts all new tasks first and stops old ones only when the new ones are healthy: fastest and safest, but needs double capacity for a while (on Fargate, just a short period of extra cost).
- **50 / 100** never exceeds the normal count but halves capacity during the deployment — acceptable only if half the tasks can carry the traffic.
- In the third case the new version never becomes healthy. Because the minimum is 100%, the old tasks keep serving everything — users see no outage — and the **deployment circuit breaker** stops retrying and **rolls back** automatically. Turn it on for every service.
- New tasks must pass the **load balancer health check** (and the container health check, if defined) before old ones are stopped; old tasks are **drained** by the target group's deregistration delay, then sent `SIGTERM` ({{ch:elb}}).
- For traffic-shifting deployments (canary or linear, with automatic rollback on alarms), ECS supports **blue/green** deployments natively or through CodeDeploy.

### Level 3 — Scaling services

- **Service auto scaling** (Application Auto Scaling) adjusts the desired count with target tracking on CPU, memory or **ALB requests per target**, plus scheduled scaling ({{ch:auto-scaling}}).
- Queue workers scale on backlog per task, using a custom metric ({{ch:sns-sqs}}).
- Fargate tasks start in tens of seconds (image size matters: small images start faster); **Fargate Spot** runs interruptible tasks at a large discount, with a two-minute warning.
- On EC2 capacity, **capacity providers** with managed scaling grow the cluster's instances to fit pending tasks.
- Remember downstream limits: database connections × maximum tasks ({{ch:rds}}).

### Level 3 — One-off and scheduled tasks

- **Database migrations**: run a task from the same image with a different command (`npm run migrate`) as a pipeline step **before** updating the service — not at application start, where several tasks would race to migrate ({{ch:database-design}}).
- **Scheduled jobs**: EventBridge Scheduler starts tasks on a schedule — the container equivalent of cron ({{ch:cron-jobs}}).
- **ECS Exec** opens a shell or runs a command inside a running task for debugging, controlled by IAM and logged — instead of SSH.

### Level 4 — A pipeline for ECS

```text
 merge to main
   → build image, tag with commit SHA, scan, push to ECR
   → register new task definition revision with the new image
   → run migration task (same image) and wait for success
   → update service to the new revision (rolling, circuit breaker on)
   → wait for the service to become stable; smoke tests
   → on failure: automatic rollback (circuit breaker) or redeploy previous revision
```

GitHub Actions has official actions for rendering and deploying task definitions, with OIDC credentials ({{ch:github-actions}}). Keep the task definition in the repository (or in Terraform, {{ch:terraform}}) so it is reviewed like code.

## Operating ECS

### Level 4 — Observability and reliability

- **Logs** in CloudWatch Logs per service; structured JSON logs make CloudWatch Logs Insights queries easy ({{ch:logging}}).
- **Metrics**: service CPU and memory, running task count, ALB metrics per target group; **Container Insights** adds per-task details.
- **Events**: the service's event log explains failed placements, failing health checks and stopped tasks; a task's **stopped reason** says why it died (essential container exited, out of memory, failed health check, image pull failure).
- **Spread** tasks across zones (the default for Fargate across the given subnets), with at least two tasks per service.
- **Memory**: containers that exceed their memory limit are killed (`OutOfMemoryError`); set Node.js's heap appropriately and watch memory metrics.

## From beginner to enterprise

**Level 1–2 — first services.** Images in ECR; Fargate task definitions with CPU, memory, ports, environment and logs; a service with desired count behind an ALB; tasks in private subnets with security groups.

**Level 3 — production services.** Separate task and execution roles; secrets from Secrets Manager; VPC endpoints; rolling deployments with health checks and the circuit breaker; auto scaling; migration tasks; ECS Exec.

**Level 4 — mature delivery.** Pipelines that register revisions and deploy with OIDC; blue/green with alarm-based rollback; Container Insights; Fargate Spot for workers; infrastructure as code for everything.

**Level 5 — senior practice.** Choosing Fargate versus EC2 capacity and ECS versus EKS; capacity and cost planning; service-to-service communication with Service Connect; designing deployment safety for each service.

**Level 6 — enterprises.** Platform teams providing service templates and golden pipelines, organisation-wide policies on images and roles, multi-account and multi-region container platforms.

## Real-world use cases

### A shop's API and workers

- **Set-up**: `shop-api` (Fargate, 3–20 tasks, ALB, target tracking on requests per target), `email-worker` (Fargate Spot, 1–10 tasks, scaling on SQS backlog), a nightly report as a scheduled task, and migrations as one-off tasks in the pipeline — all from one image repository and Terraform modules.

### The deployment that rolled itself back

- **What happened**: a release crashed on start because a new environment variable was missing in production. New tasks failed their health checks; the old tasks kept serving traffic; the circuit breaker rolled back after a few attempts. Users noticed nothing, and the pipeline reported the failed deployment.

## Common mistakes

### Beginner: `latest` image tags

**Consequence:** unknown versions running and impossible rollbacks. **Fix:** commit SHA tags or digests.

### Beginner: secrets in plain environment variables

**Consequence:** secrets visible to anyone who can read task definitions. **Fix:** `secrets` from Secrets Manager or Parameter Store.

### Beginner: tasks in public subnets with public IPs

**Fix:** private subnets, NAT or VPC endpoints, ALB in front.

### Intermediate: app permissions on the execution role

**Consequence:** confusing permissions and too much access. **Fix:** task role for the app, execution role for ECS.

### Intermediate: migrations at application start

**Consequence:** several tasks migrating at once. **Fix:** a one-off migration task before the deployment.

### Intermediate: no circuit breaker

**Consequence:** endless failing deployments. **Fix:** enable the circuit breaker with rollback.

### Production: subnets too small

**Consequence:** tasks cannot start during deployments or scaling. **Fix:** size subnets for the maximum, including deployments.

## Debugging and troubleshooting

- **Task stops immediately**: read the stopped reason and the container's logs — a crash, missing configuration, or an out-of-memory kill.
- **`CannotPullContainerError`**: no route to ECR (NAT or endpoints missing), wrong image tag, or the execution role lacks ECR permissions.
- **`ResourceInitializationError` for secrets**: the execution role cannot read the secret or decrypt it with its KMS key, or there is no route to Secrets Manager.
- **Tasks keep cycling**: failing ALB or container health checks — the path, port, start-up time (`startPeriod`, health check grace period) and security groups.
- **Deployment stuck**: not enough capacity or IP addresses for the new tasks, or health checks failing; read the service events.
- **AccessDenied from the app**: the task role's policy ({{ch:iam}}).

## Security summary

- **Least-privilege task roles** per service; minimal execution roles.
- **Secrets injected from managed stores**; never in images or plain environment variables.
- **Private subnets**, security groups per service, VPC endpoints.
- **Scanned, immutable images** from ECR; non-root users in containers; read-only root file systems where possible.
- **ECS Exec instead of SSH**, controlled and logged.
- **Task definitions and services as code**, reviewed and audited.

## How a senior engineer thinks about this

- **Let AWS run the servers.** Fargate unless there is a clear reason for EC2 capacity.
- **The task definition is the deployable unit.** Versioned, reviewed, rolled back by revision.
- **Deployments must protect users.** Health checks, minimum healthy capacity and automatic rollback.
- **Roles per service.** Separate permissions for starting a task and for running the app.
- **Stateless tasks, external state.** Databases, caches, queues and S3 hold everything that matters.

## Exercises

### Exercise 1 — Write the task definition essentials

**Objective:** practise task definitions.
**What to do:** list the key settings for a worker that reads from an SQS queue, needs a database URL secret, writes logs, and must finish its current message on shutdown (messages take up to 20 seconds).

<details>
<summary>Show the solution</summary>

- Fargate, `awsvpc`, an appropriate CPU and memory size; ARM64 if the image supports it.
- Image tagged with the commit SHA; command `node worker.js`.
- **Task role**: `sqs:ReceiveMessage`, `DeleteMessage`, `ChangeMessageVisibility`, `GetQueueAttributes` on that queue; anything else the worker calls.
- **Execution role**: ECR pull, read the database URL secret, write to its log group.
- `secrets`: `DATABASE_URL` from Secrets Manager; `environment`: queue URL.
- `awslogs` configuration.
- **`stopTimeout` of about 30 seconds** and code that stops receiving on `SIGTERM`, finishes the current message and exits.
- No port mappings or load balancer; a service with auto scaling on queue backlog per task.

</details>

### Exercise 2 — Choose deployment settings

**Objective:** practise rolling deployment settings.
**What to do:** choose `minimumHealthyPercent` and `maximumPercent` for (a) a public API that runs at 60% CPU at peak; (b) a background worker where a few minutes of reduced throughput is fine and cost matters.

<details>
<summary>Show the solution</summary>

- (a) **100 / 200** — never reduce serving capacity; new tasks start first. Capacity cannot drop, because at 60% CPU, losing half the tasks would overload the rest. Circuit breaker on.
- (b) **50 / 100** (or 0 / 100 if a short pause is acceptable) — no extra tasks during deployment; workers drain messages gracefully on `SIGTERM`.

</details>

### Exercise 3 — Production scenario: tasks will not start

**Objective:** practise ECS debugging.
**The scenario:** after moving a service's tasks from public to private subnets, every new task stops within a minute. The service events show "CannotPullContainerError … i/o timeout". The old tasks in public subnets are being drained. What is wrong, and what do you do now and next?

<details>
<summary>Show the solution</summary>

**Cause:** tasks in private subnets have no route to ECR — no NAT gateway and no VPC endpoints.

**Now:** roll back the service's network configuration (or the deployment) so tasks run where they can pull images; the circuit breaker may already have done this.

**Next:** add VPC endpoints for `ecr.api`, `ecr.dkr`, the S3 gateway endpoint (image layers), CloudWatch Logs and Secrets Manager — or a NAT gateway per zone — with security groups allowing 443 from the tasks. Test with one task, then redeploy. Add this to the network module so new services work by default ({{ch:vpc}}).

</details>

## Summary

**ECS** orchestrates containers on AWS. A **task definition** describes containers — image (pinned by commit), CPU and memory, ports, environment, **secrets** from managed stores, logging, health check, stop timeout and two IAM roles: the **execution role** that lets ECS pull images, read secrets and write logs, and the **task role** that gives the application its permissions. **Tasks** are running copies; a **service** keeps the desired count running across zones, registers tasks with a load balancer and manages deployments. **Fargate** runs tasks without servers; EC2 capacity suits special needs.

With **`awsvpc`** networking each task has its own IP and security group in private subnets, reaching AWS services through NAT or VPC endpoints; subnets must hold the maximum task count. **Rolling deployments** follow `minimumHealthyPercent` and `maximumPercent`, wait for health checks, drain old tasks, and the **deployment circuit breaker** rolls back failing releases; blue/green adds traffic shifting. Services **scale** with target tracking, workers on backlog; one-off tasks run migrations and scheduled jobs; **ECS Exec** replaces SSH for debugging.

Pipelines build and push images, register task definition revisions, run migrations, update services and verify stability. Observe services through logs, metrics, service events and stopped reasons, and keep everything — roles, networks, task definitions and services — in code.

## Key terms

- **ECS** — Amazon Elastic Container Service, AWS's container orchestrator.
- **Container orchestrator** — A system that runs, places, scales and replaces containers.
- **Cluster** — A logical grouping of ECS tasks, services and capacity.
- **Task definition** — A versioned description of the containers in a task.
- **Revision** — A numbered version of a task definition.
- **Task** — A running instance of a task definition.
- **Service** — An ECS resource that keeps a desired number of tasks running.
- **Fargate** — Serverless capacity for running containers.
- **Capacity provider** — A source of capacity for tasks, such as Fargate or an auto scaling group.
- **`awsvpc` network mode** — Giving each task its own network interface and IP address.
- **Task role** — The IAM role used by application code in a task.
- **Task execution role** — The IAM role ECS uses to start a task.
- **ECR** — Elastic Container Registry, AWS's image registry.
- **Rolling deployment** — Gradually replacing old tasks with new ones.
- **minimumHealthyPercent / maximumPercent** — Limits on healthy and total tasks during deployments.
- **Deployment circuit breaker** — A feature that stops and rolls back failing deployments.
- **Fargate Spot** — Discounted, interruptible Fargate capacity.
- **ECS Exec** — Running commands inside running tasks for debugging.
- **Service Connect** — ECS's built-in service-to-service communication.

## What comes next

ECS is AWS's own orchestrator; the industry-wide alternative is Kubernetes. The next chapter, {{ch:eks}}, introduces Kubernetes on AWS: pods, deployments, services, ingress, configuration and secrets, autoscaling, IAM for pods, and when Kubernetes is worth its complexity.
