# Auto Scaling

> [!GOALS]
> - Explain why systems scale automatically and what **horizontal scaling** requires of an application.
> - Configure **Auto Scaling groups**: launch templates, minimum, maximum and desired capacity, zones and health checks.
> - Choose scaling policies — **target tracking**, step, scheduled and predictive — and the right metrics.
> - Understand **warm-up**, **cooldown** and why scaling always lags behind traffic.
> - Scale containers and serverless workloads, and protect the parts that cannot scale freely, such as databases.
> - Use lifecycle hooks, instance refresh and mixed instance policies in production.

## Why this matters

Traffic is never flat. A shop is quiet at 4 a.m., busy at lunchtime and overwhelmed when a sale starts or a celebrity mentions a product. Provisioning for the peak wastes money most of the day; provisioning for the average means slow pages and errors exactly when customers want to buy.

**Auto scaling** adds capacity when demand rises and removes it when demand falls — automatically, using metrics. On AWS, **EC2 Auto Scaling groups** manage fleets of instances ({{ch:ec2}}), **Application Auto Scaling** does the same for ECS services, DynamoDB and others ({{ch:ecs}}), and Kubernetes has its own autoscalers ({{ch:eks}}). Auto scaling also gives **self-healing**: a group with a fixed size still replaces failed instances.

It is not magic. New capacity takes minutes to arrive, some components cannot scale at all, and a badly chosen metric can make a system scale the wrong way. This chapter shows how to scale well.

## The simple idea

Think of a supermarket opening extra checkouts. When queues grow, the manager calls more cashiers to open tills; when the shop is quiet, cashiers go back to stocking shelves. But a cashier needs a few minutes to arrive, log in and open a till — so a good manager watches the queues and calls staff **before** the queues become terrible, and knows that Saturday mornings are always busy.

> [!ANALOGY]
> Auto scaling is like a supermarket opening more checkouts when queues grow and closing them when the shop is quiet.
>
> **Where the analogy breaks:** extra cashiers make the whole shop faster only if the rest of the shop keeps up. If all cashiers must share **one** card terminal in the back office (your database), opening twenty tills just makes a longer queue at the terminal. Scaling one layer can overload the next.

## The proper definition and key words

**Auto scaling** automatically adjusts the number of compute resources based on demand, schedules or health. An **Auto Scaling group (ASG)** maintains a set of EC2 instances between a **minimum** and **maximum** size, at a **desired capacity** set by **scaling policies**, replacing unhealthy instances.

Key words:

- **Horizontal scaling (scale out/in)** — adding or removing instances; **vertical scaling (scale up/down)** — making an instance bigger or smaller.
- **Launch template** — what each new instance looks like (AMI, type, security groups, role, user data).
- **Minimum / maximum / desired capacity** — the limits and the current target size.
- **Target tracking policy** — keep a metric (for example average CPU) near a target value.
- **Step scaling policy** — add or remove amounts in steps based on alarm thresholds.
- **Scheduled scaling** — change capacity at known times.
- **Predictive scaling** — forecast demand from history and scale ahead of it.
- **Warm-up** — the time a new instance needs before its metrics count and it can serve traffic.
- **Cooldown** — a waiting period between scaling actions.
- **Health check grace period** — time after launch before health checks can mark an instance unhealthy.
- **Lifecycle hook** — a pause during launch or termination for custom actions.
- **Instance refresh** — replacing all instances gradually with a new launch template version.

## Auto Scaling groups

### Level 1 — The group

```text
 launch template v12 (AMI, m7g.large, security groups, role, IMDSv2, user data)
        │
 Auto Scaling group: min 2, desired 4, max 12, subnets in zones a, b, c
        │   health checks: EC2 status + load balancer target health
        ├── i-01 (a)   i-02 (b)   i-03 (c)   i-04 (a)      registered in the ALB target group
        │
 scaling policy: target tracking — average CPU 50%
```

- The group spreads instances **across zones** and rebalances them. If a zone fails, it launches replacements in the others.
- With **ELB health checks** enabled, instances failing the load balancer's health check are replaced too, not just ones whose hardware fails ({{ch:elb}}).
- **Minimum** protects availability (never fewer than 2, one per zone at least); **maximum** protects your budget and your dependencies; **desired** is what policies change.
- Instances must be **stateless and identical**: any of them can be terminated at any time, so nothing important may live only on one (sessions in Redis, files in S3, data in databases — {{ch:scalability}}).

### Level 2 — Target tracking

The simplest and usually best policy: choose a metric and a target value, and AWS adds or removes capacity to keep the metric near it — like a thermostat. Good metrics are proportional to load per instance: **average CPU**, **requests per target** from the load balancer, or a custom metric such as queue backlog per worker.

This simulation follows a sale: each instance handles 100 requests per second at full CPU, the target is 50% CPU, and new instances need three minutes before they serve traffic:

```ts
// Target tracking in a simplified model: keep average CPU near 50% as traffic rises and falls.
// Each instance handles 100 requests/second at 100% CPU; new instances need 3 minutes to start.
const capacityPerInstance = 100;
const target = 0.5;
const warmupMinutes = 3;
const minSize = 2, maxSize = 12;

// requests per second, minute by minute: quiet, a sale starts, a peak, then it calms down
const traffic = [120, 130, 300, 420, 520, 600, 640, 650, 640, 600, 450, 300, 200, 150, 140, 130];

let running = 2;
const starting: number[] = [];          // minutes at which pending instances become ready
let lastScaleIn = -Infinity;

console.log("min  req/s  running  cpu   action");
traffic.forEach((rps, minute) => {
  while (starting.length && starting[0]! <= minute) { starting.shift(); running++; }
  const serving = running;
  const cpu = Math.min(1, rps / (serving * capacityPerInstance));
  const wanted = Math.min(maxSize, Math.max(minSize, Math.ceil(rps / (capacityPerInstance * target))));
  const planned = running + starting.length;
  let action = "";
  if (wanted > planned) {
    for (let i = 0; i < wanted - planned; i++) starting.push(minute + warmupMinutes);
    action = `scale out +${wanted - planned} (ready at minute ${minute + warmupMinutes})`;
  } else if (wanted < running && starting.length === 0 && minute - lastScaleIn >= 5) {
    action = `scale in -1`;                                   // remove gradually, with a cooldown
    running--; lastScaleIn = minute;
  }
  const overloaded = cpu >= 0.9 ? " overloaded!" : "";
  console.log(`${String(minute).padStart(3)}  ${String(rps).padStart(5)}  ${String(serving).padStart(7)}  ${(cpu * 100).toFixed(0).padStart(3)}%  ${action}${overloaded}`.trimEnd());
});
```

**Output:**

```text
min  req/s  running  cpu   action
  0    120        2   60%  scale out +1 (ready at minute 3)
  1    130        2   65%
  2    300        2  100%  scale out +3 (ready at minute 5) overloaded!
  3    420        3  100%  scale out +3 (ready at minute 6) overloaded!
  4    520        3  100%  scale out +2 (ready at minute 7) overloaded!
  5    600        6  100%  scale out +1 (ready at minute 8) overloaded!
  6    640        9   71%
  7    650       11   59%
  8    640       12   53%
  9    600       12   50%
 10    450       12   38%  scale in -1
 11    300       11   27%
 12    200       11   18%
 13    150       11   14%
 14    140       11   13%
 15    130       11   12%  scale in -1
```

- Scaling out worked — capacity grew from 2 to 12 — but for **four minutes** the fleet was overloaded, because new instances took three minutes to become useful while traffic kept rising. **Scaling always lags**: detection (metric periods, alarms), launch, boot, application start and health checks all take time.
- The cure is to **start faster** (pre-built AMIs or container images instead of installing software at boot), keep **headroom** (a lower target such as 40–50%, a higher minimum), and **scale ahead** with scheduled or predictive scaling for known events.
- Scaling **in** is deliberately slow and cautious: removing capacity too fast after a peak risks being caught out by the next spike. Target tracking scales in gradually by design. The cost is paying for extra instances for a while.
- The maximum (12) was reached. Maxima protect budgets and downstream systems — but must be high enough for real peaks, and alarms should tell you when the group sits at its maximum.

### Level 3 — Other policies

- **Step scaling**: CloudWatch alarms with thresholds — "CPU above 70%: add 2; above 85%: add 4". More control, more tuning; useful for metrics that are not proportional to instance count.
- **Scheduled scaling**: raise the minimum before the 9 a.m. rush or the Friday sale, lower it at night. Simple and very effective for predictable patterns.
- **Predictive scaling**: learns daily and weekly patterns from history and launches capacity ahead of forecast demand; combine it with target tracking for surprises.
- **Queue-based scaling** for workers: scale on **backlog per instance** (messages waiting ÷ workers), not CPU — a worker fleet may idle on CPU while thousands of messages wait ({{ch:sns-sqs}}).

### Level 3 — Warm-up, health checks and lifecycle

- **Instance warm-up** (default instance warm-up) stops new instances' metrics from counting until they are ready, so the group does not over-react to their low CPU during start.
- The **health check grace period** stops a starting instance from being killed before the application is up.
- **Lifecycle hooks** pause launches (to register with a service, warm a cache) or terminations (to drain work, upload logs) until your code signals that it is finished.
- **Termination**: the load balancer's deregistration delay drains connections, and the application must handle `SIGTERM` gracefully ({{ch:docker}}).
- **Scale-in protection** can protect specific instances — for example, workers in the middle of long jobs.

## Scaling in practice

### Level 3 — Containers and serverless

- **ECS services** scale the number of **tasks** with Application Auto Scaling (target tracking on CPU, memory or ALB requests per target). With EC2 capacity, **capacity providers** scale the underlying instances to fit the tasks; with **Fargate** there are no instances to manage ({{ch:ecs}}).
- **Kubernetes** uses the Horizontal Pod Autoscaler for pods and Cluster Autoscaler or Karpenter for nodes ({{ch:eks}}).
- **Lambda** scales automatically per request, within concurrency limits — which can then overwhelm a database that does not scale the same way ({{ch:lambda}}).
- Containers start in seconds rather than minutes, which shortens the lag shown above considerably.

### Level 4 — Protecting what cannot scale

Scaling the application tier multiplies pressure on everything behind it:

- **Database connections**: 12 instances × 20 pool connections = 240 connections. Budget connections for the **maximum** size, or put RDS Proxy in front ({{ch:rds}}).
- **Database load**: more instances send more queries; cache reads ({{ch:caching}}), add read replicas, and optimise queries before scaling the app further.
- **Third-party APIs** with rate limits, licences per instance, and downstream services owned by other teams.
- **Queues as buffers**: accept work quickly and process it at a rate the database can handle, scaling workers within a safe maximum ({{ch:queues}}).
- **Load tests** that include scaling to the maximum find these limits before customers do.

### Level 4 — Deployments and instance types

- **Instance refresh** replaces instances gradually when the launch template changes (a new AMI), keeping a minimum healthy percentage and rolling back on failed health checks.
- **Mixed instances policies** combine several instance types and **On-Demand plus Spot** capacity; capacity-rebalancing replaces Spot instances that receive interruption warnings ({{ch:cost-optimization}}).
- **Warm pools** keep pre-initialised, stopped instances ready, cutting launch time for slow-starting applications.

## From beginner to enterprise

**Level 1–2 — first groups.** Launch templates; groups across zones with ELB health checks; stateless instances; a target tracking policy on CPU or requests per target.

**Level 3 — tuned scaling.** Warm-up and grace periods; scheduled and predictive scaling for known patterns; queue-based scaling for workers; lifecycle hooks and graceful termination.

**Level 4 — safe scaling.** Connection and dependency budgets at maximum size; load tests including scaling; alarms on sitting at maximum; instance refresh for deployments; mixed instances and Spot.

**Level 5 — senior practice.** Choosing metrics that reflect real load; balancing headroom against cost; designing systems where every layer scales or is buffered; capacity planning beyond auto scaling.

**Level 6 — enterprises.** Organisation-wide capacity management, reserved capacity for critical events, and platform defaults for scaling policies across many services.

## Real-world use cases

### The weekly sale

- **Practice**: a scheduled action raises the minimum from 4 to 16 instances 30 minutes before the Friday sale; target tracking handles surprises; the minimum returns to 4 two hours later. Pages stayed fast through the first rush, which target tracking alone was too slow to catch.

### Workers and a queue

- **Practice**: email workers scale on "messages waiting per worker" between 1 and 20 instances; the database-heavy invoice workers are capped at 6 so they never exhaust database connections, and the queue absorbs bursts.

## Common mistakes

### Beginner: state on instances

**Consequence:** lost sessions and files when instances are terminated. **Fix:** stateless instances.

### Beginner: one zone or a minimum of 1

**Consequence:** no availability during failures. **Fix:** at least two zones and a minimum of 2.

### Intermediate: slow start-up

**Consequence:** scaling arrives after the peak. **Fix:** baked images or containers, warm pools, scheduled and predictive scaling.

### Intermediate: CPU scaling for queue workers

**Consequence:** backlogs grow while CPU looks fine. **Fix:** backlog per worker.

### Intermediate: scaling in too aggressively

**Consequence:** flapping and errors on the next spike. **Fix:** conservative scale-in, cooldowns.

### Production: unlimited scaling against a fixed database

**Consequence:** database overload and connection exhaustion. **Fix:** maxima from dependency budgets, RDS Proxy, caching, queues.

### Production: no graceful termination

**Consequence:** errors whenever the group scales in. **Fix:** deregistration delay, lifecycle hooks and `SIGTERM` handling.

## Debugging and troubleshooting

- **Group does not scale out**: check the policy's alarms and metric, the maximum size, warm-up settings, and the activity history for launch failures (capacity, quotas, invalid template, missing permissions).
- **Instances launch then terminate**: failing health checks before the application is ready — increase the grace period or fix start-up; read the instance's logs.
- **Flapping** (scale out and in repeatedly): a metric that drops sharply when capacity is added, or too short cooldowns.
- **Uneven zones**: capacity shortages for an instance type in one zone; use several instance types.
- **Scaling but still slow**: the bottleneck is elsewhere — database, cache, external API ({{ch:performance-engineering}}).

## Security summary

- **Launch templates** carry security settings for every new instance: IMDSv2 required, least-privilege roles, encrypted volumes, no secrets in user data ({{ch:ec2}}).
- **Patched images** applied with instance refresh.
- **Maximum sizes** also limit the damage from abuse or runaway costs.
- **Restrict who can change** groups, templates and policies; changes are visible in CloudTrail.

## How a senior engineer thinks about this

- **Stateless first.** Auto scaling only works when any instance can disappear.
- **Scaling lags.** Start fast, keep headroom and scale ahead for known events.
- **Pick the metric that is the load.** Requests per target, backlog per worker — not just CPU.
- **Every layer must cope.** Budget the database and dependencies for the maximum size.
- **Self-healing is a feature.** Even fixed-size services belong in groups.

## Exercises

### Exercise 1 — Choose the policy

**Objective:** practise choosing scaling policies.
**What to do:** choose policies for (a) an API with steady daily patterns and occasional unannounced spikes; (b) image-processing workers reading from SQS; (c) an internal tool used only during office hours.

<details>
<summary>Show the solution</summary>

- (a) **Target tracking** on ALB requests per target (or CPU) plus **predictive scaling** for the daily pattern; a minimum of 2 across zones.
- (b) **Target tracking on backlog per instance** (queue depth ÷ running workers), with a maximum based on downstream limits; scale-in protection or graceful draining for jobs in progress.
- (c) **Scheduled scaling**: a minimum of 2 during office hours, 0 or 1 outside them (with an acceptable cold start), plus target tracking.

</details>

### Exercise 2 — Read the simulation

**Objective:** practise reasoning about lag.
**What to do:** in this chapter's simulation, the fleet was overloaded for four minutes. Name three changes that would shorten or remove that period, and what each costs.

<details>
<summary>Show the solution</summary>

1. **Faster start-up** (containers or pre-baked images, warm pools) — engineering effort; warm pools cost a little for stopped instances' storage.
2. **More headroom**: a lower target (for example 35%) or a higher minimum — more instances running all the time, so higher cost.
3. **Scheduled or predictive scaling** before known peaks — requires knowing or learning the pattern; does not help with truly random spikes.

Also: protecting the system during the lag with rate limiting or queues, so overload degrades gracefully instead of failing.

</details>

### Exercise 3 — Production scenario: scaling made it worse

**Objective:** practise diagnosing scaling side effects.
**The scenario:** during a traffic spike, the API group scaled from 6 to 30 instances as designed. Then error rates jumped: the database reported "too many connections" and CPU at 100%, and response times got worse as more instances were added. What happened and how do you fix it?

<details>
<summary>Show the solution</summary>

**What happened:** each new instance opened its own connection pool and sent more queries; the database — which does not scale automatically — became the bottleneck. More instances meant more contention, not more throughput.

**Fixes:**
- **Connection budget**: pool size × maximum instances below the database limit; **RDS Proxy** to multiplex connections.
- **Reduce database load**: cache hot reads, add read replicas for read-heavy routes, optimise the most expensive queries ({{ch:query-optimization}}).
- **Lower the group's maximum** to what the database can support, and use **rate limiting** or queues to shed or delay excess load gracefully.
- **Load test** to the maximum size to find the true limit; alarm on database saturation as well as API metrics.

</details>

## Summary

**Auto scaling** adjusts capacity to demand and replaces failed resources. An **Auto Scaling group** keeps EC2 instances from a **launch template** between a **minimum** and **maximum**, at a **desired capacity**, spread across zones, replacing instances that fail EC2 or load balancer health checks. Instances must be stateless and identical.

**Target tracking** keeps a load-proportional metric — CPU, requests per target, backlog per worker — near a target; **step**, **scheduled** and **predictive** policies add control and foresight. Scaling always **lags**: detection, launch and start-up take minutes, so start fast, keep headroom and scale ahead of known peaks; scale in cautiously. **Warm-up**, **grace periods**, **lifecycle hooks** and graceful termination keep scaling smooth.

Containers and serverless scale faster, but every layer behind them must cope: budget database connections for the maximum size, use RDS Proxy, caches, replicas and queues, and load-test scaling. Use **instance refresh** for new images and **mixed instances** with Spot for cost.

## Key terms

- **Auto scaling** — Automatically adjusting capacity based on demand, schedules or health.
- **Horizontal scaling** — Adding or removing instances.
- **Vertical scaling** — Changing the size of an instance.
- **Auto Scaling group** — A managed set of EC2 instances kept within size limits.
- **Launch template** — The configuration used for new instances.
- **Desired capacity** — The number of instances a group currently aims to run.
- **Target tracking policy** — A policy that keeps a metric near a target value.
- **Step scaling policy** — A policy that changes capacity in steps based on alarm thresholds.
- **Scheduled scaling** — Changing capacity at set times.
- **Predictive scaling** — Scaling ahead of demand forecast from history.
- **Warm-up** — The time a new instance needs before it is counted and useful.
- **Cooldown** — A waiting period between scaling actions.
- **Health check grace period** — Time after launch during which health checks are ignored.
- **Lifecycle hook** — A pause during instance launch or termination for custom actions.
- **Instance refresh** — Gradually replacing instances with a new configuration.
- **Mixed instances policy** — Using several instance types and purchase options in one group.
- **Warm pool** — Pre-initialised instances kept ready to join a group quickly.
- **Backlog per instance** — Queue messages waiting divided by the number of workers.
- **Self-healing** — Automatically replacing failed components.

## What comes next

Auto scaling groups manage machines; most modern teams would rather manage containers. The next chapter, {{ch:ecs}}, covers ECS: task definitions, services, Fargate and EC2 capacity, networking, IAM roles for tasks, secrets, logging, deployments and scaling of containerised applications.
