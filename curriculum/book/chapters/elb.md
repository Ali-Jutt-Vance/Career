# Load Balancers (ELB)

> [!GOALS]
> - Explain what a load balancer does and why every scalable service sits behind one.
> - Choose between **Application Load Balancers** (HTTP) and **Network Load Balancers** (TCP/UDP).
> - Configure **listeners**, **rules**, **target groups** and **health checks**.
> - Terminate **TLS** at the load balancer and route by host and path.
> - Understand **connection draining**, **sticky sessions**, cross-zone balancing and timeouts.
> - Debug 502, 503 and 504 errors.

## Why this matters

One server is a single point of failure and a hard limit on capacity. Run several, and you need something in front that spreads requests between them, notices when one is broken and stops sending it traffic, and lets you add and remove servers without users noticing. That is a **load balancer**.

**Elastic Load Balancing (ELB)** provides AWS's managed load balancers. They run across several availability zones, scale automatically with traffic, terminate TLS with certificates from ACM, and integrate with auto scaling groups ({{ch:auto-scaling}}), ECS services ({{ch:ecs}}), Kubernetes ({{ch:eks}}) and Lambda. Nearly every production web application on AWS has one in front of it — usually behind CloudFront ({{ch:cloudfront}}) and in front of tasks in private subnets ({{ch:vpc}}).

Load balancers also produce the most common production errors you will debug: 502 Bad Gateway, 503 Service Unavailable, 504 Gateway Timeout. Knowing what each means saves hours.

## The simple idea

Think of the queue manager at a big post office. Customers join one queue, and the manager sends each to the next free counter. If a clerk goes on a break or the counter's computer breaks, the manager stops sending people there. When the post office opens more counters at busy times, the manager starts using them straight away.

> [!ANALOGY]
> A load balancer is like a post office queue manager: one queue, customers sent to the next available counter, and broken counters skipped.
>
> **Where the analogy breaks:** the queue manager can see that a counter is empty. A load balancer only knows what its **health checks** tell it — every few seconds it asks each server "are you OK?". Between checks, a server that has just crashed may still receive requests, and a health check that tests the wrong thing can keep sending customers to a counter that answers "hello" but cannot actually serve anyone.

## The proper definition and key words

A **load balancer** distributes incoming connections or requests across a group of **targets**, using health checks to send traffic only to healthy ones. ELB offers **Application Load Balancers (ALB)** for HTTP and HTTPS at layer 7, **Network Load Balancers (NLB)** for TCP, UDP and TLS at layer 4, and **Gateway Load Balancers** for network appliances.

Key words:

- **Listener** — a port and protocol the load balancer accepts (`HTTPS:443`).
- **Rule** — on an ALB listener, conditions (host, path, header, method, query) and actions (forward, redirect, fixed response).
- **Target group** — a set of targets (instances, IP addresses, Lambda functions) with a port, protocol and health check.
- **Health check** — a regular request to each target; results decide whether it receives traffic.
- **Healthy / unhealthy threshold** — consecutive successes or failures needed to change state.
- **Deregistration delay (connection draining)** — time given to in-flight requests when a target is removed.
- **Sticky sessions** — sending a client to the same target repeatedly, using a cookie.
- **Cross-zone load balancing** — spreading traffic evenly across targets in all zones.
- **Idle timeout** — how long a connection may be idle before the load balancer closes it.
- **TLS termination** — decrypting HTTPS at the load balancer.

## Load balancer types

### Level 1 — ALB or NLB?

| | Application Load Balancer | Network Load Balancer |
|---|---|---|
| Layer | 7 — understands HTTP | 4 — forwards TCP/UDP connections |
| Routing | Host, path, headers, methods, query strings | Port only |
| Features | Redirects, fixed responses, authentication (OIDC/Cognito), WAF, HTTP/2, WebSockets, gRPC | Static IP addresses per zone, preserves client IP, very high throughput and low latency, TLS pass-through |
| Typical use | Web applications and APIs | Non-HTTP protocols, extreme scale, fixed IPs for firewall allow-lists, PrivateLink |

For a typical web API, choose an **ALB**.

### Level 1 — The pieces of an ALB

```text
 client ──HTTPS:443──► listener 443 (certificate from ACM)
                         │ rules, in priority order:
                         ├─ host api.cornershop.example, path /v2/*  → target group api-v2
                         ├─ host api.cornershop.example              → target group api
                         ├─ host admin.cornershop.example            → authenticate (OIDC) → target group admin
                         └─ default                                   → fixed response 404
 client ──HTTP:80───► listener 80 → redirect to HTTPS (301)

 target group api: ECS tasks by IP, port 3000, health check GET /health every 10 s
   10.20.48.17:3000 (zone a)   10.20.64.9:3000 (zone b)   10.20.80.22:3000 (zone c)
```

- One ALB can serve many services and domains through **rules**, saving cost and simplifying DNS ({{ch:route53}}).
- **Target groups** decouple the load balancer from servers: ECS and auto scaling register and deregister targets automatically as they come and go.
- The ALB has nodes in each enabled zone, in **public subnets**; targets live in **private subnets**, with security groups allowing traffic only from the ALB's security group ({{ch:ec2}}).

## Health checks and target lifecycle

### Level 2 — How health checks decide

This small load balancer does what a target group does: round-robin across targets in service, two failed checks take a target out, three successful checks bring it back:

```ts
import { createServer, request, type Server } from "node:http";
import type { AddressInfo } from "node:net";

// Three application "targets". Each can be made unhealthy, as a crashed or overloaded task would be.
type Target = { name: string; port: number; healthy: boolean; server: Server; inService: boolean; failures: number; successes: number };
const targets: Target[] = [];
for (const name of ["task-a", "task-b", "task-c"]) {
  const t = { name, port: 0, healthy: true, inService: true, failures: 0, successes: 0 } as Target;
  t.server = createServer((req, res) => {
    if (req.url === "/health") { res.statusCode = t.healthy ? 200 : 503; return res.end(); }
    res.end(name);
  });
  await new Promise<void>((r) => t.server.listen(0, "127.0.0.1", r));
  t.port = (t.server.address() as AddressInfo).port;
  targets.push(t);
}

const get = (port: number, path: string) => new Promise<{ status: number; body: string }>((resolve) => {
  const req = request({ host: "127.0.0.1", port, path }, (res) => {
    let body = ""; res.on("data", (c) => (body += c)); res.on("end", () => resolve({ status: res.statusCode ?? 0, body }));
  });
  req.on("error", () => resolve({ status: 0, body: "" }));
  req.end();
});

// Health checks like a target group: 2 failures -> out of service, 3 successes -> back in service
async function healthCheckRound() {
  for (const t of targets) {
    const ok = (await get(t.port, "/health")).status === 200;
    if (ok) { t.successes++; t.failures = 0; if (!t.inService && t.successes >= 3) t.inService = true; }
    else { t.failures++; t.successes = 0; if (t.inService && t.failures >= 2) t.inService = false; }
  }
  return targets.filter((t) => t.inService).map((t) => t.name).join(", ");
}

// The load balancer: round robin over targets that are in service
let next = 0;
const lb = createServer(async (_req, res) => {
  const live = targets.filter((t) => t.inService);
  if (live.length === 0) { res.statusCode = 503; return res.end("no healthy targets"); }
  const t = live[next++ % live.length]!;
  const r = await get(t.port, "/");
  res.end(r.body);
});
await new Promise<void>((r) => lb.listen(0, "127.0.0.1", r));
const lbPort = (lb.address() as AddressInfo).port;

async function sendRequests(n: number) {
  const seen: Record<string, number> = {};
  for (let i = 0; i < n; i++) { const { body } = await get(lbPort, "/products"); seen[body] = (seen[body] ?? 0) + 1; }
  return JSON.stringify(seen);
}

console.log("all healthy:            ", await sendRequests(9));
targets[1]!.healthy = false;                                      // task-b starts failing its health check
console.log("health check 1, in service:", await healthCheckRound());
console.log("health check 2, in service:", await healthCheckRound());
console.log("task-b out of service:   ", await sendRequests(9));
targets[1]!.healthy = true;                                       // task-b recovers
for (let i = 1; i <= 3; i++) console.log(`recovery check ${i}, in service:`, await healthCheckRound());

lb.close(); for (const t of targets) t.server.close();
```

**Output:**

```text
all healthy:             {"task-a":3,"task-b":3,"task-c":3}
health check 1, in service: task-a, task-b, task-c
health check 2, in service: task-a, task-c
task-b out of service:    {"task-c":5,"task-a":4}
recovery check 1, in service: task-a, task-c
recovery check 2, in service: task-a, task-c
recovery check 3, in service: task-a, task-b, task-c
```

- One failed check is not enough — it could be a blip. After the **unhealthy threshold** (here 2), task-b is removed and the other targets take all traffic. During the detection time, real traffic would still reach the failing target, so keep intervals short (5–10 seconds) and let clients retry safe requests.
- A recovering target must pass the **healthy threshold** (here 3) before it gets traffic again, so a flapping target does not keep coming and going.
- If **all** targets fail their checks, an ALB "fails open" and sends traffic to all of them rather than none — the health check is assumed to be wrong.

### Level 2 — What to check

- The health endpoint should show that the instance **can serve requests**: the process is up, it has finished starting, its essential configuration loaded. Keep it fast and cheap.
- Be careful about checking **shared dependencies** (the database) in the load balancer's health check: if the database blips, every target fails together, and the load balancer (and ECS, which replaces unhealthy tasks) may restart everything at once. Many teams check dependencies in a separate readiness endpoint or with alarms instead ({{ch:monitoring}}).
- A **grace period** after start (ECS and auto scaling both have one) prevents new targets from being killed while they are still warming up.

### Level 3 — Deregistration and graceful shutdown

When a target is removed — a deployment, scale-in, a failed task — the load balancer stops sending it **new** requests but lets **in-flight** requests finish during the **deregistration delay** (300 seconds by default; 30–60 seconds suits most APIs).

For zero-error deployments, the application must cooperate ({{ch:docker}}):

1. The orchestrator deregisters the target and sends `SIGTERM`.
2. The application keeps serving in-flight requests, stops accepting new connections, finishes work and exits.
3. The deregistration delay must be **longer** than the slowest normal request, and the orchestrator's stop timeout long enough for the shutdown.

## Traffic handling

### Level 3 — TLS termination

- The HTTPS listener uses an **ACM certificate** (free, auto-renewed) and a **security policy** that sets the allowed TLS versions and ciphers — choose a modern one ({{ch:tls-ssl}}).
- Traffic from the ALB to targets can be HTTP inside the VPC, or HTTPS where regulations require encryption everywhere.
- The client's real address arrives in **`X-Forwarded-For`**, and the original protocol in `X-Forwarded-Proto`. Configure your framework to trust the proxy (`app.set("trust proxy", …)` in Express) so logs, rate limiting and redirects use the right values ({{ch:express}}, {{ch:rate-limiting}}).
- An NLB can **pass TLS through** to targets, or terminate it.

### Level 3 — Sticky sessions and state

**Sticky sessions** send a user back to the same target using a cookie. They help applications that keep session state in memory — but they cause uneven load, lose the session when that target dies, and fight auto scaling. Prefer **stateless** targets with sessions in Redis or tokens ({{ch:sessions}}, {{ch:scalability}}); use stickiness only for special cases such as some WebSocket set-ups ({{ch:websockets}}).

### Level 3 — Timeouts

- The ALB **idle timeout** (60 seconds by default) closes connections with no data. Long-running requests need a longer timeout — or better, an asynchronous design (start a job, poll for its result, {{ch:queues}}).
- The application's **keep-alive timeout must be longer** than the load balancer's idle timeout. If the server closes an idle connection at the moment the load balancer reuses it, the request fails with a 502. Node.js's default keep-alive timeout is 5 seconds — shorter than the ALB's 60 — so set `server.keepAliveTimeout` to, say, 65 seconds (and `headersTimeout` a little higher). This is one of the most common causes of random 502s on AWS.

### Level 4 — Cross-zone balancing and slow start

- **Cross-zone load balancing** (always on for ALBs) spreads requests evenly across all targets, whatever their zone. Without it, a zone with fewer targets gives each of them more traffic.
- **Slow start** gradually increases the share of traffic for new targets, useful for applications that need to warm caches or compile code.
- **Least outstanding requests** routing sends new requests to the target with fewest in progress — better than round-robin when request times vary a lot.
- **Weighted target groups** in a rule split traffic between versions — the basis of blue-green and canary deployments at the load balancer ({{ch:cicd}}).

## Operating load balancers

### Level 4 — Monitoring and logs

Key CloudWatch metrics ({{ch:cloudwatch}}):

- **`HTTPCode_Target_5XX_Count`** (errors from your application) versus **`HTTPCode_ELB_5XX_Count`** (errors generated by the load balancer: 502, 503, 504).
- **`TargetResponseTime`** (latency percentiles), **`RequestCount`**, **`HealthyHostCount`** and **`UnHealthyHostCount`** per target group.
- **Access logs** to S3 record every request with timings, status codes and target — invaluable for debugging.

### Level 4 — The meaning of 502, 503 and 504

| Error | Generated by | Usually means |
|---|---|---|
| **502 Bad Gateway** | Load balancer | The target closed the connection or sent an invalid response — crash, keep-alive timeout mismatch, malformed headers |
| **503 Service Unavailable** | Load balancer | No registered or healthy targets in the target group |
| **504 Gateway Timeout** | Load balancer | The target did not respond within the idle timeout — slow queries, stuck process, security group blocking |
| 500 (and other 5xx) | Your application | An application error passed through |

## From beginner to enterprise

**Level 1–2 — first load balancers.** An ALB in public subnets with an HTTPS listener and ACM certificate; HTTP-to-HTTPS redirect; one target group with a health check; targets in private subnets reachable only from the ALB.

**Level 3 — correct behaviour.** Meaningful, cheap health checks with suitable thresholds; graceful shutdown with a tuned deregistration delay; keep-alive timeouts longer than the idle timeout; `X-Forwarded-For` handling; stateless targets.

**Level 4 — production traffic.** Host and path rules for several services; weighted target groups for deployments; WAF; access logs; alarms on ELB and target 5xx and unhealthy hosts.

**Level 5 — senior practice.** Choosing ALB versus NLB versus API Gateway; routing algorithms; capacity and cost of shared load balancers; debugging tail latency with access logs.

**Level 6 — enterprises.** Shared ingress layers, PrivateLink services behind NLBs, central certificate and security policy management.

## Real-world use cases

### The random 502s

- **What happened**: about 0.1% of requests failed with 502, randomly, with nothing in the application logs.
- **Cause**: Node's 5-second keep-alive timeout was shorter than the ALB's 60-second idle timeout; occasionally the server closed a connection the ALB was about to reuse.
- **Fix**: `server.keepAliveTimeout = 65_000` and `server.headersTimeout = 66_000`. The 502s disappeared.

### Zero-downtime deploys

- **Practice**: ECS rolling deployments with the ALB health check, a 30-second deregistration delay and `SIGTERM` handling in the application; error rates stay flat during deployments.

## Common mistakes

### Beginner: targets in public subnets reachable directly

**Fix:** private subnets; security groups allowing only the ALB.

### Beginner: health checks on `/` that do heavy work

**Consequence:** slow checks, load and false failures. **Fix:** a cheap `/health` endpoint.

### Intermediate: database checks in the load balancer health check

**Consequence:** every target removed or restarted during a database blip. **Fix:** check what each target controls; monitor dependencies separately.

### Intermediate: keep-alive timeout shorter than the idle timeout

**Consequence:** random 502s. **Fix:** longer application keep-alive timeout.

### Intermediate: no graceful shutdown

**Consequence:** errors on every deployment. **Fix:** `SIGTERM` handling and a suitable deregistration delay.

### Production: relying on sticky sessions

**Consequence:** uneven load and lost sessions. **Fix:** stateless targets.

### Production: ignoring the client IP header

**Consequence:** logs and rate limits see only the load balancer's address. **Fix:** trust the proxy correctly.

## Debugging and troubleshooting

- **503**: check the target group — are targets registered and healthy? Look at the health check failure reasons in the console.
- **Targets unhealthy**: the health check path and port, the expected status code, security groups (the ALB's group must reach the target's port), and the application's start-up time.
- **502**: application crashes or restarts, keep-alive mismatches, responses with invalid headers; check access logs' `target_status_code`.
- **504**: slow targets — database queries, external calls without timeouts; compare `TargetResponseTime` and the idle timeout.
- **Uneven load**: sticky sessions, long-lived connections (WebSockets, HTTP/2), or slow start.
- **Wrong client IPs in logs**: `X-Forwarded-For` not trusted or parsed.

## Security summary

- **TLS** with ACM certificates and modern security policies; redirect HTTP to HTTPS.
- **Targets private**, reachable only from the load balancer's security group.
- **WAF** on internet-facing ALBs; ALB authentication for internal tools.
- **Trust `X-Forwarded-For` only from the load balancer**, never from arbitrary clients.
- **Access logs** for investigation; restrict who can change listeners and rules.
- **Drop invalid headers** (an ALB setting) to reduce request-smuggling risks.

## How a senior engineer thinks about this

- **Targets are disposable.** Health checks and draining make replacing them invisible to users.
- **Health checks are a contract.** Check what the target controls, cheaply and quickly.
- **Timeouts must line up.** Client, load balancer, application and database timeouts in the right order.
- **502, 503 and 504 tell different stories.** Read them before guessing.
- **Keep targets stateless.** Load balancing is easy when any target can serve any request.

## Exercises

### Exercise 1 — Configure the listener

**Objective:** practise ALB configuration.
**What to do:** describe listeners and rules for `api.cornershop.example` (versions `/v1` and `/v2` served by different services) and `admin.cornershop.example` (an internal tool that requires company login), with HTTP redirected to HTTPS.

<details>
<summary>Show the solution</summary>

- Listener **80**: redirect to HTTPS 443 (301).
- Listener **443** with ACM certificates for both names and a modern TLS policy. Rules:
  1. Host `api.cornershop.example` and path `/v2/*` → target group `api-v2`.
  2. Host `api.cornershop.example` → target group `api-v1`.
  3. Host `admin.cornershop.example` → **authenticate-oidc** with the company identity provider, then forward to `admin`.
  4. Default → fixed response 404.
- Each target group has its own health check; targets accept traffic only from the ALB's security group.

</details>

### Exercise 2 — Read the errors

**Objective:** practise error diagnosis.
**What to do:** what do you check first for each? (a) Every request returns 503 after a deployment. (b) Occasional 502s at a steady 0.05% rate. (c) 504s on the `/reports` endpoint only.

<details>
<summary>Show the solution</summary>

- (a) **No healthy targets**: the new version fails its health check (wrong path or port, crash on start, missing configuration, slow start with too short a grace period). Check target health reasons and task logs.
- (b) **Keep-alive timeout mismatch** (application timeout shorter than the ALB's idle timeout), or occasional crashes. Check `keepAliveTimeout` and access logs.
- (c) **Slow requests** exceeding the idle timeout — a slow report query. Optimise it, or make reports asynchronous (generate in the background, notify or poll).

</details>

### Exercise 3 — Production scenario: errors during every deploy

**Objective:** practise zero-downtime deployments.
**The scenario:** every deployment of the API causes about 30 seconds of errors: some requests get 502, some take very long. The deregistration delay is 300 seconds, the application exits immediately on `SIGTERM`, and new tasks receive traffic as soon as they register. What do you change?

<details>
<summary>Show the solution</summary>

1. **Graceful shutdown**: on `SIGTERM`, stop accepting new connections, finish in-flight requests, then exit — instead of exiting immediately (the cause of 502s).
2. **Deregistration delay** around 30–60 seconds — longer than the slowest normal request, but not 300 seconds, which slows deployments.
3. **Stop timeout** in the orchestrator long enough for the graceful shutdown.
4. **Health checks and a grace period** so new tasks get traffic only after they are ready (warm-up done, configuration loaded); consider slow start.
5. **Keep-alive timeout** longer than the ALB idle timeout.
6. Verify with a load test that runs during a deployment, watching ELB and target 5xx counts.

</details>

## Summary

A **load balancer** spreads requests over **targets**, sends traffic only to healthy ones and lets targets come and go without users noticing. **ALBs** work at HTTP level with **listeners**, prioritised **rules** (host, path, header) and actions such as forward, redirect, authenticate and fixed responses; **NLBs** forward TCP and UDP at very high throughput with static IPs. Load balancers live in public subnets, across zones; targets live in private subnets, reachable only from the load balancer's security group.

**Target groups** hold targets and a **health check**: consecutive failures remove a target, consecutive successes restore it, and if all fail the ALB sends traffic to all. Health checks should be cheap and test what the target itself controls. **Deregistration delay** lets in-flight requests finish; combined with `SIGTERM` handling it gives zero-error deployments.

TLS terminates at the load balancer with ACM certificates; client addresses arrive in `X-Forwarded-For`. Prefer stateless targets to **sticky sessions**. Keep the application's **keep-alive timeout longer than the idle timeout** to avoid random 502s. Read errors carefully: **502** — the target closed or broke the connection; **503** — no healthy targets; **504** — the target was too slow. Monitor ELB and target 5xx counts, healthy hosts and response times, and keep access logs.

## Key terms

- **Load balancer** — A component that distributes requests across multiple targets.
- **Elastic Load Balancing (ELB)** — AWS's family of managed load balancers.
- **Application Load Balancer (ALB)** — A layer-7 load balancer for HTTP and HTTPS.
- **Network Load Balancer (NLB)** — A layer-4 load balancer for TCP, UDP and TLS.
- **Listener** — A port and protocol on which a load balancer accepts connections.
- **Listener rule** — Conditions and actions that route requests on an ALB.
- **Target group** — A set of targets with a port, protocol and health check.
- **Target** — An instance, IP address or function receiving traffic.
- **Health check** — A periodic request that determines whether a target is healthy.
- **Healthy threshold / unhealthy threshold** — Consecutive results needed to change a target's state.
- **Deregistration delay** — Time for in-flight requests to complete after a target is removed.
- **Connection draining** — Letting existing connections finish while sending no new ones.
- **Sticky sessions** — Routing a client repeatedly to the same target.
- **Cross-zone load balancing** — Spreading traffic evenly across targets in all zones.
- **Idle timeout** — The time after which an inactive connection is closed.
- **Keep-alive timeout** — How long a server keeps an idle connection open for reuse.
- **TLS termination** — Decrypting TLS at the load balancer.
- **X-Forwarded-For** — A header carrying the original client IP address.
- **Slow start** — Gradually increasing traffic to newly added targets.

## What comes next

A load balancer can spread traffic across targets, but how many targets should there be? The next chapter, {{ch:auto-scaling}}, covers adding and removing capacity automatically: auto scaling groups, scaling policies and metrics, warm-up, scaling for containers, and scaling safely with databases and other limits.
