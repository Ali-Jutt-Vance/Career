# EKS and Kubernetes

> [!GOALS]
> - Explain what Kubernetes is, why it became the industry's standard container platform, and what EKS manages for you.
> - Understand the core objects: **pods**, **deployments**, **services**, **ingress**, **config maps**, **secrets** and **namespaces**.
> - Set resource **requests and limits**, **probes** and rolling updates, and understand how the **scheduler** places pods.
> - Scale with the **Horizontal Pod Autoscaler** and node autoscalers such as Karpenter.
> - Give pods AWS permissions safely with **Pod Identity** or IRSA, and secure a cluster.
> - Decide when Kubernetes is worth its complexity compared with ECS.

## Why this matters

**Kubernetes** began at Google and is now run by every major cloud and countless companies. It is an open, extensible platform for running containers across a fleet of machines: it places them, restarts them, scales them, rolls out new versions, connects them and gives them configuration. Its API has become a common language — the same manifests run on AWS, Azure, Google Cloud and in a company's own data centre — and a huge ecosystem (ingress controllers, service meshes, GitOps tools, operators for databases) is built on it.

**Amazon EKS (Elastic Kubernetes Service)** runs the Kubernetes **control plane** for you, highly available across zones, and integrates it with AWS networking, IAM and load balancers. Many companies run their platforms on EKS, and Kubernetes appears in a large share of back-end and platform job descriptions.

Kubernetes is also famously complex. This chapter explains the essential concepts a back-end engineer needs to deploy and debug applications on it, and when a simpler service such as ECS ({{ch:ecs}}) is the better choice.

## The simple idea

Kubernetes works by **desired state**. You do not tell it "start three containers"; you write down "there should always be three copies of this container, with this much memory, reachable at this name" and hand that description to the cluster. Controllers inside Kubernetes then constantly compare what **is** with what **should be**, and act to close the gap: if a copy crashes, they start another; if you change the description to a new image, they replace the copies gradually.

> [!ANALOGY]
> Kubernetes is like a thermostat for your whole application: you set the desired state, and it keeps working to make reality match it.
>
> **Where the analogy breaks:** a thermostat controls one number. Kubernetes manages thousands of interacting objects through dozens of controllers, and each one only does what its description says. A typo in a label can silently disconnect a service from its pods, and a missing resource request can let one application starve its neighbours — the cluster obeys the description exactly, mistakes included.

## The proper definition and key words

**Kubernetes** is an open-source system for automating deployment, scaling and management of containerised applications. A **cluster** has a **control plane** (API server, scheduler, controllers, the etcd database) and **worker nodes** that run **pods**. You manage it by applying **manifests** — YAML descriptions of objects — through the Kubernetes API, usually with `kubectl`.

Key words:

- **Pod** — the smallest unit: one or more containers sharing a network address and storage, scheduled together.
- **Deployment** — keeps a number of identical pod replicas running and performs rolling updates.
- **ReplicaSet** — the object a deployment uses to keep a set number of pods.
- **Service** — a stable name and virtual IP for a set of pods selected by **labels**.
- **Ingress / Gateway** — rules routing external HTTP traffic to services.
- **ConfigMap / Secret** — configuration and sensitive values for pods.
- **Namespace** — a partition of the cluster for teams or environments.
- **Labels and selectors** — key-value tags and the queries that find objects by them.
- **Requests / limits** — the resources a container is guaranteed / the maximum it may use.
- **Probes** — liveness, readiness and startup checks.
- **Node group / Karpenter** — ways to provide and scale worker nodes on EKS.
- **Helm** — a package manager for Kubernetes manifests.

## Core objects

### Level 1 — The control plane and the nodes

```text
 kubectl / CI ──► API server (EKS-managed, across 3 zones)
                    │ stores desired state in etcd
                    ├── scheduler: chooses a node for each new pod
                    └── controllers: deployments, replica sets, nodes, services, …
                                │
     ┌──────────────────────────┼──────────────────────────┐
 node (zone a)              node (zone b)              node (zone c)     EC2 instances or Fargate
  kubelet + container runtime, pods: api-7d9f…, api-7d9f…, worker-…
```

- With EKS, AWS runs and upgrades the control plane; **you** provide worker nodes — **managed node groups** (EC2 auto scaling groups maintained by EKS), **Karpenter** (launches right-sized instances for pending pods), **EKS Auto Mode** (AWS manages nodes too) or **Fargate** (one pod per micro-VM).
- Each node runs the **kubelet**, which starts the containers the scheduler assigns and reports their status.

### Level 2 — A deployment and a service

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: shop-api
  namespace: shop
spec:
  replicas: 3
  selector:
    matchLabels: { app: shop-api }
  strategy:
    type: RollingUpdate
    rollingUpdate: { maxUnavailable: 0, maxSurge: 1 }
  template:
    metadata:
      labels: { app: shop-api }
    spec:
      serviceAccountName: shop-api
      containers:
        - name: api
          image: 111122223333.dkr.ecr.eu-west-2.amazonaws.com/shop-api:4f9c2e1
          ports: [{ containerPort: 3000 }]
          envFrom:
            - configMapRef: { name: shop-api-config }
          env:
            - name: DATABASE_URL
              valueFrom: { secretKeyRef: { name: shop-api-secrets, key: database-url } }
          resources:
            requests: { cpu: 250m, memory: 384Mi }
            limits: { memory: 512Mi }
          readinessProbe:
            httpGet: { path: /health, port: 3000 }
            periodSeconds: 5
          livenessProbe:
            httpGet: { path: /health, port: 3000 }
            periodSeconds: 10
            failureThreshold: 3
          securityContext:
            runAsNonRoot: true
            readOnlyRootFilesystem: true
            allowPrivilegeEscalation: false
---
apiVersion: v1
kind: Service
metadata:
  name: shop-api
  namespace: shop
spec:
  selector: { app: shop-api }
  ports: [{ port: 80, targetPort: 3000 }]
```

- The **deployment** keeps three replicas of the pod **template**. Changing the template (a new image tag) creates a new ReplicaSet and rolls pods over: `maxSurge: 1` adds one new pod at a time, `maxUnavailable: 0` never removes an old one before a new one is ready — the same ideas as ECS's minimum healthy and maximum percent.
- The **service** selects pods by the label `app: shop-api` and gives them one stable DNS name inside the cluster: `shop-api.shop.svc.cluster.local` (or just `shop-api` from the same namespace). If the labels do not match, the service has no endpoints and requests fail — check labels first.
- **ConfigMaps and Secrets** provide configuration. Kubernetes Secrets are only base64-encoded by default; on EKS, enable envelope encryption with KMS, restrict access with RBAC, and often sync values from AWS Secrets Manager with the Secrets Store CSI driver or External Secrets ({{ch:secrets-manager}}).
- The **security context** runs the container as non-root with a read-only file system ({{ch:docker}}).

### Level 2 — Probes

- **Readiness probe**: may this pod receive traffic now? Failing pods are removed from the service's endpoints — not restarted. Use it during start-up and for temporary inability to serve.
- **Liveness probe**: is this container stuck beyond repair? Failing containers are **restarted**. Keep it simple; never check databases in a liveness probe, or a database blip restarts every pod at once ({{ch:monitoring}}).
- **Startup probe**: protects slow-starting containers from liveness restarts until they have started.
- On termination, Kubernetes removes the pod from endpoints and sends `SIGTERM`; the application should drain and exit within `terminationGracePeriodSeconds`. A short `preStop` sleep helps load balancers notice before the process stops.

### Level 3 — Requests, limits and the scheduler

The **scheduler** places each pod on a node that has enough **unrequested** CPU and memory for the pod's **requests**. Requests are what the scheduler reserves; **limits** are the most a container may use — exceeding a memory limit kills the container (`OOMKilled`), exceeding a CPU limit throttles it. This model shows the Horizontal Pod Autoscaler's formula and the scheduler's placement by requests:

```ts
// 1. The Horizontal Pod Autoscaler's formula:
//    desired = ceil(current * currentMetric / targetMetric), ignored if within the 10% tolerance
function hpa(current: number, currentCpu: number, targetCpu: number, min: number, max: number): number {
  const ratio = currentCpu / targetCpu;
  if (Math.abs(ratio - 1) <= 0.1) return current;                       // close enough: do nothing
  return Math.min(max, Math.max(min, Math.ceil(current * ratio)));
}
for (const [pods, cpu] of [[4, 0.52], [4, 0.9], [10, 0.2], [6, 1.5]] as const) {
  console.log(`${pods} pods at ${Math.round(cpu * 100)}% CPU (target 60%) -> ${hpa(pods, cpu, 0.6, 2, 20)} pods`);
}

// 2. The scheduler places pods by their resource *requests*, not by what they actually use
type Node = { name: string; cpu: number; memMi: number; pods: string[] };
const nodes: Node[] = [
  { name: "node-a", cpu: 2000, memMi: 4096, pods: [] },     // 2 vCPU, 4 GiB allocatable (simplified)
  { name: "node-b", cpu: 2000, memMi: 4096, pods: [] },
];
const pods = [
  ...Array.from({ length: 6 }, (_, i) => ({ name: `api-${i + 1}`, cpu: 500, memMi: 512 })),
  { name: "search-1", cpu: 1500, memMi: 3072 },
];
for (const pod of pods) {
  const node = nodes.find((n) => n.cpu >= pod.cpu && n.memMi >= pod.memMi);   // first node with room
  if (!node) { console.log(`${pod.name}: Pending (no node has ${pod.cpu}m CPU and ${pod.memMi}Mi free)`); continue; }
  node.cpu -= pod.cpu; node.memMi -= pod.memMi; node.pods.push(pod.name);
}
for (const n of nodes) console.log(`${n.name}: ${n.pods.join(", ")}  (free: ${n.cpu}m CPU, ${n.memMi}Mi)`);
```

**Output:**

```text
4 pods at 52% CPU (target 60%) -> 4 pods
4 pods at 90% CPU (target 60%) -> 6 pods
10 pods at 20% CPU (target 60%) -> 4 pods
6 pods at 150% CPU (target 60%) -> 15 pods
search-1: Pending (no node has 1500m CPU and 3072Mi free)
node-a: api-1, api-2, api-3, api-4  (free: 0m CPU, 2048Mi)
node-b: api-5, api-6  (free: 1000m CPU, 3072Mi)
```

- The **HPA** computes `ceil(current × currentMetric ÷ target)`: 4 pods at 90% against a 60% target become 6; 10 pods at 20% shrink to 4. CPU utilisation is measured **relative to requests**, so requests also drive scaling.
- The **scheduler** filled the nodes by requests (`250m` = a quarter of a CPU; here, 500m per API pod). The search pod needs 1.5 CPUs on **one** node; there are 1000m free in total, so it stays **Pending**. A node autoscaler (Karpenter or Cluster Autoscaler) sees pending pods and adds a node that fits.
- **Requests set too high** waste money (nodes look full while idle); **too low** pack too many pods onto a node, which then runs out of memory. Measure real usage and set requests close to it; set memory limits; be careful with CPU limits, which can throttle latency-sensitive services.

## Traffic, scaling and permissions on EKS

### Level 3 — Getting traffic in

The **AWS Load Balancer Controller** creates AWS load balancers from Kubernetes objects:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: shop
  namespace: shop
  annotations:
    alb.ingress.kubernetes.io/scheme: internet-facing
    alb.ingress.kubernetes.io/target-type: ip
    alb.ingress.kubernetes.io/listen-ports: '[{"HTTPS":443}]'
    alb.ingress.kubernetes.io/certificate-arn: arn:aws:acm:eu-west-2:111122223333:certificate/abcd-1234
spec:
  ingressClassName: alb
  rules:
    - host: api.cornershop.example
      http:
        paths:
          - path: /
            pathType: Prefix
            backend: { service: { name: shop-api, port: { number: 80 } } }
```

- The controller creates an ALB with the certificate and registers **pod IPs** directly as targets (with the VPC CNI, pods get real VPC addresses) ({{ch:elb}}).
- A `Service` of type `LoadBalancer` creates a Network Load Balancer instead.
- Alternatively, an in-cluster ingress controller such as NGINX handles routing behind one load balancer ({{ch:nginx-reverse-proxy}}); the newer **Gateway API** is replacing Ingress for richer routing.

### Level 3 — Scaling pods and nodes

- **Horizontal Pod Autoscaler** scales replicas on CPU, memory or custom metrics (requests per second, queue length through KEDA).
- **Karpenter** watches for pending pods and launches EC2 instances of suitable types and sizes (including Spot), and consolidates nodes when they are underused ({{ch:cost-optimization}}).
- **PodDisruptionBudgets** keep a minimum number of pods available during voluntary disruptions such as node upgrades and consolidation.
- **Topology spread constraints** spread replicas across zones and nodes, so one zone failure does not take all replicas.

### Level 4 — AWS permissions for pods

Pods must not share the node's IAM role. **EKS Pod Identity** (or the older **IRSA**, IAM Roles for Service Accounts) associates a Kubernetes **service account** with an IAM role; pods using that service account receive the role's temporary credentials, and the AWS SDK picks them up automatically ({{ch:iam}}). Each application gets its own service account and least-privilege role. Block pod access to the node's instance metadata (IMDSv2 with a hop limit of 1) so pods cannot borrow the node's credentials ({{ch:ec2}}).

### Level 4 — Securing and operating a cluster

- **Access**: EKS access entries map IAM roles to Kubernetes permissions; **RBAC** roles grant per-namespace rights. Developers usually get read access in production, and changes flow through pipelines.
- **GitOps**: tools like Argo CD or Flux keep the cluster in sync with manifests in Git — every change reviewed, every state reproducible ({{ch:cicd}}).
- **Helm** charts and Kustomize package and customise manifests per environment.
- **Network policies** restrict which pods may talk to which.
- **Policy engines** (Kyverno, OPA Gatekeeper) reject unsafe manifests — no root containers, required resource requests, only images from your registry.
- **Upgrades**: Kubernetes releases a minor version about three times a year and EKS supports each for a limited period; plan regular control-plane, add-on and node upgrades, testing in staging first.
- **Observability**: logs from stdout collected by Fluent Bit to CloudWatch or another store; metrics with Prometheus ({{ch:prometheus}}); `kubectl get events` for what the cluster did.

### Level 4 — Kubernetes or ECS?

| Choose EKS when… | Choose ECS when… |
|---|---|
| The organisation already runs Kubernetes or wants portability across clouds | The team is small and runs only on AWS |
| You need its ecosystem: operators, service meshes, GitOps, custom controllers | You want the fewest moving parts and AWS-native integration |
| A platform team can own cluster upgrades, add-ons and security | Nobody wants to operate a platform |

Both run containers reliably; the difference is how much platform you want to own.

## From beginner to enterprise

**Level 1–2 — first workloads.** Pods, deployments and services; labels and selectors; ConfigMaps and Secrets; `kubectl get`, `describe`, `logs`, `apply`; probes.

**Level 3 — production workloads.** Resource requests and limits from measurements; rolling update settings; ingress through the AWS Load Balancer Controller; HPA; PodDisruptionBudgets; spreading across zones; Pod Identity per service.

**Level 4 — operating clusters.** Karpenter; RBAC and access entries; GitOps; Helm or Kustomize; network policies; policy engines; regular upgrades; logging and metrics.

**Level 5 — senior practice.** Multi-tenant cluster design; cost management of requests and node choices; capacity planning; deciding what belongs on Kubernetes at all.

**Level 6 — enterprises.** Platform engineering with internal developer platforms on Kubernetes, fleets of clusters across regions and accounts, and organisation-wide policy and security baselines.

## Real-world use cases

### A platform for forty services

- **Set-up**: one EKS cluster per environment; namespaces per team; Argo CD deploying from Git; Karpenter with Spot and On-Demand nodes; the AWS Load Balancer Controller for ingress; Pod Identity roles per service; Kyverno requiring requests, limits and non-root containers.

### The pods that kept restarting

- **What happened**: during a database failover, every API pod was restarted repeatedly, prolonging the outage.
- **Cause**: the liveness probe checked the database.
- **Fix**: liveness checks only the process; readiness reflects ability to serve; the application retries database connections.

## Common mistakes

### Beginner: no resource requests

**Consequence:** unpredictable placement and noisy neighbours. **Fix:** requests and memory limits on every container.

### Beginner: labels that do not match the service selector

**Consequence:** "no endpoints" and failing requests. **Fix:** check `kubectl get endpoints` and labels.

### Beginner: `latest` tags

**Fix:** immutable tags or digests.

### Intermediate: dependency checks in liveness probes

**Consequence:** mass restarts during dependency blips. **Fix:** liveness for the process only.

### Intermediate: secrets as plain Kubernetes Secrets without encryption or RBAC

**Fix:** KMS envelope encryption, RBAC, external secret stores.

### Intermediate: pods using the node's IAM role

**Fix:** Pod Identity or IRSA per service account; block metadata access.

### Production: never upgrading

**Consequence:** unsupported versions and forced, risky upgrades. **Fix:** a regular upgrade routine.

## Debugging and troubleshooting

- **Pod `Pending`**: `kubectl describe pod` — insufficient CPU or memory for its requests, no matching node, or a volume that cannot attach. Check the node autoscaler.
- **`CrashLoopBackOff`**: `kubectl logs pod --previous` shows why the container keeps exiting.
- **`ImagePullBackOff`**: wrong image name or tag, or nodes lacking ECR access.
- **`OOMKilled`**: the container exceeded its memory limit; raise it or fix the memory use.
- **Service not reachable**: `kubectl get endpoints` (empty means labels or readiness), then DNS from inside a pod, then network policies.
- **Ingress not working**: the controller's logs, the ALB's target health, and security groups.
- **What changed?**: `kubectl get events --sort-by=.lastTimestamp` and `kubectl rollout history`.

## Security summary

- **Least privilege** everywhere: RBAC per namespace, Pod Identity roles per service, no node-role use by pods.
- **Hardened pods**: non-root, read-only file systems, no privilege escalation, minimal images from your registry.
- **Secrets** encrypted with KMS, synced from managed stores, restricted by RBAC.
- **Network policies** limiting pod-to-pod traffic; private API endpoint or restricted public access.
- **Admission policies** enforcing standards; image scanning; regular upgrades and patching.
- **Audit logs** for the control plane enabled and retained.

## How a senior engineer thinks about this

- **Desired state is the interface.** Manifests in Git describe the system; controllers make it so.
- **Requests are a contract.** They drive scheduling, scaling and cost — measure and set them.
- **Probes must mean something.** Readiness for traffic, liveness for stuck processes.
- **Platform cost is real.** Kubernetes pays off when its ecosystem and portability are needed and someone owns it.
- **Security is layered.** RBAC, IAM, network policy and pod security together.

## Exercises

### Exercise 1 — Debug the service

**Objective:** practise Kubernetes debugging.
**The situation:** a deployment's pods are `Running` and `Ready`, but requests to the service time out with no responses. `kubectl get endpoints shop-api` shows `<none>`. What is wrong?

<details>
<summary>Show the solution</summary>

The service's **selector does not match the pods' labels** (for example the service selects `app: shop-api` while the pods are labelled `app: shopapi`), so the service has no endpoints. Compare `kubectl get svc shop-api -o yaml` (selector) with `kubectl get pods --show-labels`. Also check that the service's `targetPort` matches the container port. Fix the labels or selector and the endpoints appear immediately.

</details>

### Exercise 2 — Set resources and probes

**Objective:** practise pod settings.
**What to do:** an API uses about 150m CPU and 300 MiB memory normally, peaks at 400 MiB, starts in 20 seconds, and has a cheap `/health` endpoint. Write its resources and probes.

<details>
<summary>Show the solution</summary>

```yaml
resources:
  requests: { cpu: 200m, memory: 400Mi }
  limits: { memory: 512Mi }            # headroom above the peak; no CPU limit to avoid throttling
startupProbe:
  httpGet: { path: /health, port: 3000 }
  periodSeconds: 5
  failureThreshold: 12                 # up to 60 s to start
readinessProbe:
  httpGet: { path: /health, port: 3000 }
  periodSeconds: 5
livenessProbe:
  httpGet: { path: /health, port: 3000 }
  periodSeconds: 10
  failureThreshold: 3
```

The memory request is set near the peak so the scheduler reserves enough; the limit protects the node. Adjust from real metrics.

</details>

### Exercise 3 — Production scenario: should we move to Kubernetes?

**Objective:** practise platform decisions.
**The scenario:** a team of six engineers runs eight services on ECS Fargate. Deployments are automated and reliable. A new engineer proposes moving everything to EKS "because everyone uses Kubernetes". How do you evaluate the proposal?

<details>
<summary>Show the solution</summary>

Ask what problem it solves:
- **Needs**: Is portability across clouds required? Do they need Kubernetes-only tools (operators, specific ecosystem projects)? Is the team hitting real ECS limits?
- **Costs**: cluster upgrades several times a year, add-ons (load balancer controller, autoscaler, logging, secrets sync), RBAC and policies, more failure modes, and learning time — likely needing a person's sustained attention in a six-person team.
- **Benefits**: a large ecosystem, transferable skills, a standard API.

For a small team with working ECS deployments and no Kubernetes-specific needs, staying on ECS is usually the better engineering decision. Revisit if the organisation standardises on Kubernetes, the service count grows greatly, or specific needs appear. Record the decision and its reasons ({{ch:engineering-decisions}}).

</details>

## Summary

**Kubernetes** manages containers by **desired state**: you apply manifests to the API server, and controllers keep reality matching them. **EKS** runs the highly available control plane; you supply nodes through managed node groups, Karpenter, Auto Mode or Fargate. **Pods** are the smallest unit; **deployments** keep replicas running and perform rolling updates (`maxSurge`, `maxUnavailable`); **services** give pods selected by **labels** a stable name; **Ingress** (with the AWS Load Balancer Controller) or the Gateway API brings in external traffic; **ConfigMaps** and **Secrets** configure pods; **namespaces** divide the cluster.

The **scheduler** places pods by their resource **requests**; **limits** cap usage (memory overruns kill containers). **Readiness** probes control traffic, **liveness** probes restart stuck containers, **startup** probes protect slow starts. The **HPA** scales replicas with `ceil(current × metric ÷ target)`, node autoscalers add capacity for pending pods, and PodDisruptionBudgets and topology spread keep services available.

Pods get AWS permissions through **Pod Identity** or IRSA per service account, never the node role. Secure clusters with RBAC, KMS-encrypted secrets, network policies, admission policies and regular upgrades; operate them with GitOps, Helm or Kustomize and good observability. Choose EKS when its ecosystem and portability are worth owning a platform; ECS when simplicity matters more.

## Key terms

- **Kubernetes** — An open-source system for running and managing containerised applications across machines.
- **EKS** — Amazon Elastic Kubernetes Service, AWS's managed Kubernetes.
- **Control plane** — The components that store desired state and run controllers and the scheduler.
- **Node** — A machine that runs pods.
- **kubelet** — The agent on each node that runs the pods assigned to it.
- **Pod** — One or more containers scheduled together, sharing network and storage.
- **Deployment** — An object that keeps replicas of a pod running and rolls out updates.
- **ReplicaSet** — An object that maintains a set number of identical pods.
- **Service** — A stable network name and address for a set of pods.
- **Ingress** — Rules for routing external HTTP traffic to services.
- **ConfigMap** — An object holding non-sensitive configuration.
- **Secret** — An object holding sensitive values.
- **Namespace** — A partition of a cluster.
- **Label / selector** — A key-value tag and the query that matches it.
- **Resource request** — The CPU and memory reserved for a container.
- **Resource limit** — The maximum CPU or memory a container may use.
- **Readiness / liveness / startup probe** — Checks for traffic eligibility, restart and slow start.
- **Horizontal Pod Autoscaler** — A controller that scales replicas from metrics.
- **Karpenter** — A node autoscaler that launches instances for pending pods.
- **PodDisruptionBudget** — A limit on how many pods may be disrupted voluntarily at once.
- **Pod Identity / IRSA** — Ways to give pods IAM roles through service accounts.
- **RBAC** — Role-based access control for the Kubernetes API.
- **GitOps** — Keeping a cluster's state in sync with manifests stored in Git.
- **Helm** — A package manager for Kubernetes applications.

## What comes next

Containers still need servers or clusters underneath, even when AWS manages them. The next chapter, {{ch:lambda}}, goes further: functions that run only when events arrive, scale automatically to zero and to thousands, and are billed per request — with their own limits, cold starts and design patterns.
