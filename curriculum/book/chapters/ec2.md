# EC2: Virtual Servers

> [!GOALS]
> - Explain what EC2 is and when virtual servers are the right choice compared with containers and serverless.
> - Choose **instance types**, **AMIs** and **storage** (EBS and instance store).
> - Control network access with **security groups**, and log in safely with **Session Manager** instead of open SSH.
> - Give instances permissions with **instance roles**, and protect credentials with **IMDSv2**.
> - Configure instances automatically with **user data** and launch templates, and understand pricing options.

## Why this matters

**Amazon EC2 (Elastic Compute Cloud)** rents virtual servers by the second. It was one of the first AWS services and is still the foundation under many others: container platforms, managed databases, load balancers and CI runners all run on EC2 capacity, whether you see it or not.

Even if your team deploys with containers or serverless functions, you will meet EC2: a bastion or utility host, a self-managed service (a search engine, a legacy application), the worker nodes of a Kubernetes cluster ({{ch:eks}}), an ECS cluster on EC2 ({{ch:ecs}}), or a GPU machine for machine learning. The concepts here — instance types, images, storage, security groups, roles and metadata — appear again in every compute service. And the classic security mistakes — SSH open to the world, credentials stolen through the metadata service — still happen in real companies.

## The simple idea

EC2 is like renting a computer in someone else's building. You choose the size (how many processors, how much memory), the operating system that comes pre-installed, how much disk space, and which doors are open to the network. You can switch it on in a minute, switch it off when you do not need it, and pay only for the time it runs.

> [!ANALOGY]
> EC2 is like renting computers in someone else's building: you choose the size and the installed system, switch them on in a minute, and pay for the time they run.
>
> **Where the analogy breaks:** a rented computer under your desk keeps its files when switched off and stays the same machine. An EC2 instance is a **virtual** machine on shared hardware; its local "instance store" disk is wiped when it stops, a terminated instance is gone for good, and AWS may need to move or retire the underlying hardware. Treat instances as **replaceable** — anything important belongs on durable storage or can be rebuilt automatically.

## The proper definition and key words

**Amazon EC2** provides resizable virtual machines, called **instances**, launched from **machine images** onto chosen **instance types**, attached to **block storage**, placed in a **subnet** of a VPC and protected by **security groups**.

Key words:

- **Instance** — a virtual server.
- **Instance type** — the hardware profile: family, generation and size (`t4g.small`, `m7i.large`, `c7g.xlarge`).
- **AMI (Amazon Machine Image)** — the template an instance boots from: operating system and any pre-installed software.
- **EBS (Elastic Block Store)** — network-attached, durable disk volumes; **snapshots** back them up.
- **Instance store** — fast local disk that is lost when the instance stops.
- **Security group** — a stateful firewall attached to instances.
- **Key pair** — SSH keys for logging in (often unnecessary with Session Manager).
- **Instance profile / role** — the IAM role that gives an instance's software AWS permissions.
- **IMDS** — the instance metadata service at `169.254.169.254`, providing instance information and role credentials.
- **User data** — a script that runs at first boot.
- **Launch template** — a saved instance configuration used by auto scaling and others.
- **On-Demand, Savings Plans, Reserved, Spot** — pricing models.

## Choosing and launching instances

### Level 1 — Instance types

An instance type name tells you a lot: `m7g.large` is family **m** (general purpose), generation **7**, **g** for AWS Graviton (ARM) processors, size **large**.

| Family | Optimised for | Typical use |
|---|---|---|
| **t** (burstable) | Low average CPU with short bursts, using CPU credits | Small services, development, low-traffic tools |
| **m** (general purpose) | Balanced CPU and memory | Application servers, most workloads |
| **c** (compute) | More CPU per GB of memory | CPU-heavy APIs, batch processing, encoding |
| **r / x** (memory) | More memory per CPU | Caches, in-memory analytics, large databases |
| **i / d** (storage) | Fast local disks | Search engines, self-managed databases |
| **g / p** (accelerated) | GPUs | Machine learning, graphics |

- Each size step usually doubles CPU, memory and price.
- **Graviton (ARM)** instances are often noticeably cheaper for the same performance; Node.js and most container images run on ARM without changes, but build multi-architecture images ({{ch:docker}}).
- **Burstable (`t`) instances** accumulate CPU credits when idle and spend them in bursts. Under constant load they run out and slow down (or, in "unlimited" mode, cost extra). A common surprise in production.
- Right-size from **measurements** (CPU, memory, network over weeks), not guesses ({{ch:cost-optimization}}).

### Level 1 — Images and storage

- **AMIs**: start from official images (Amazon Linux, Ubuntu) or your organisation's **golden images**, pre-hardened and patched, often built automatically with Packer or EC2 Image Builder. Never use random community images in production.
- **EBS volumes** are network disks that survive stops and reboots, can be resized, and are backed up with **snapshots**. **gp3** is the general-purpose default; io2 gives guaranteed high IOPS. An EBS volume lives in **one availability zone**.
- **Encrypt** EBS volumes and snapshots (turn on default encryption for the account).
- **Instance store** is very fast but **temporary** — only for caches and scratch data.

### Level 2 — Security groups

A **security group** is a stateful firewall around an instance: you list what traffic may come **in**; replies to allowed traffic are allowed out automatically.

```text
 internet ──► ALB security group: allow 443 from 0.0.0.0/0
                    │
                    ▼
 app security group: allow 3000 only from the ALB security group
                    │
                    ▼
 database security group: allow 5432 only from the app security group
```

- Reference **other security groups** instead of IP ranges: "allow port 3000 from the load balancer's group". As instances come and go, the rules stay correct.
- Security groups only **allow**; anything not allowed is blocked. There is no "deny" rule (network ACLs, at the subnet level, have them — {{ch:vpc}}).
- **Never open SSH (22), RDP (3389) or database ports to `0.0.0.0/0`.** Automated scanners find open ports within minutes.

### Level 2 — Logging in without open ports

The modern way to get a shell on an instance is **AWS Systems Manager Session Manager** ({{ch:systems-manager}}):

```bash
# fragment
aws ssm start-session --target i-0abc12345def67890
```

- No inbound ports open at all — the SSM agent on the instance connects **out** to AWS.
- Access is controlled by **IAM** (who may start sessions on which instances), not by shared SSH keys.
- Sessions can be logged to S3 or CloudWatch for auditing.
- Instances in private subnets need a route to the SSM endpoints (NAT or VPC endpoints).

If you must use SSH, allow it only from a VPN or a specific address, use key pairs managed carefully, and prefer EC2 Instance Connect, which pushes short-lived keys.

## Permissions and metadata

### Level 3 — Instance roles and the metadata service

Software on an instance gets AWS permissions through an **instance profile**: an IAM role attached to the instance ({{ch:iam}}). The SDK fetches the role's temporary credentials from the **instance metadata service (IMDS)** at `http://169.254.169.254`, which also provides the instance ID, availability zone and user data.

That convenience has a famous danger. If an application has a **server-side request forgery (SSRF)** bug — it fetches a URL supplied by a user, for example to import an image — an attacker can ask it to fetch `http://169.254.169.254/latest/meta-data/iam/security-credentials/<role>` and receive the role's credentials. With the original **IMDSv1**, a simple GET was enough; this exact bug led to one of the best-known cloud breaches. **IMDSv2** requires a session token obtained with a `PUT` request and sent in a header, which a typical SSRF bug cannot do. This local stand-in for the metadata service shows the difference:

```ts
import { createServer, request } from "node:http";
import type { AddressInfo } from "node:net";
import { randomBytes } from "node:crypto";

// A local stand-in for the EC2 instance metadata service (IMDS), which on a real instance lives at
// http://169.254.169.254. It serves the instance's identity and its role's temporary credentials.
const tokens = new Set<string>();
const imds = createServer((req, res) => {
  if (req.method === "PUT" && req.url === "/latest/api/token") {
    if (req.headers["x-forwarded-for"]) { res.statusCode = 403; return res.end(); }  // IMDSv2 refuses proxied token requests
    const token = randomBytes(16).toString("hex");
    tokens.add(token);
    return res.end(token);
  }
  const token = req.headers["x-aws-ec2-metadata-token"];
  if (typeof token !== "string" || !tokens.has(token)) { res.statusCode = 401; return res.end(); }  // IMDSv2: token required
  const data: Record<string, string> = {
    "/latest/meta-data/instance-id": "i-0abc12345def67890",
    "/latest/meta-data/placement/availability-zone": "eu-west-2a",
    "/latest/meta-data/iam/security-credentials/shop-api-role": '{"AccessKeyId":"ASIA…","Expiration":"…"}',
  };
  const body = data[req.url ?? ""];
  res.statusCode = body ? 200 : 404;
  res.end(body ?? "");
});
await new Promise<void>((r) => imds.listen(0, "127.0.0.1", r));
const port = (imds.address() as AddressInfo).port;

function call(method: string, path: string, headers: Record<string, string> = {}) {
  return new Promise<{ status: number; body: string }>((resolve) => {
    const req = request({ host: "127.0.0.1", port, method, path, headers }, (res) => {
      let body = ""; res.on("data", (c) => (body += c)); res.on("end", () => resolve({ status: res.statusCode ?? 0, body }));
    });
    req.end();
  });
}

// 1. How the AWS SDK on the instance does it: get a session token with PUT, then read with the token
const { body: token } = await call("PUT", "/latest/api/token", { "x-aws-ec2-metadata-token-ttl-seconds": "21600" });
for (const path of ["instance-id", "placement/availability-zone"]) {
  const r = await call("GET", `/latest/meta-data/${path}`, { "x-aws-ec2-metadata-token": token });
  console.log(`${path.padEnd(28)} ${r.status} ${r.body}`);
}

// 2. An SSRF bug: the app fetches any URL a user gives it, e.g. ?imageUrl=http://169.254.169.254/...
//    With IMDSv1 a plain GET returned the role's credentials. With IMDSv2 the GET has no token:
const stolen = await call("GET", "/latest/meta-data/iam/security-credentials/shop-api-role");
console.log(`SSRF GET without token       ${stolen.status} ${stolen.body || "(nothing)"}`);
// and a token request that went through a proxy is refused too
const proxied = await call("PUT", "/latest/api/token", { "x-forwarded-for": "203.0.113.9" });
console.log(`token request via a proxy    ${proxied.status}`);
imds.close();
```

**Output:**

```text
instance-id                  200 i-0abc12345def67890
placement/availability-zone  200 eu-west-2a
SSRF GET without token       401 (nothing)
token request via a proxy    403
```

- The SDK's normal flow — `PUT` for a token, then `GET` with the token header — works. Current AWS SDKs do this automatically.
- A plain `GET`, which is all most SSRF bugs can make, is refused. A token request that passed through a proxy (it carries `X-Forwarded-For`) is refused as well.
- On real instances, **require IMDSv2** (`HttpTokens: required` in the launch template; make it the account default) and set the **hop limit** to 1 unless containers on the instance need metadata access, so that a token cannot travel further than the instance itself.
- And still fix SSRF in the application: validate and restrict outbound URLs ({{ch:application-security}}).

### Level 3 — User data and launch templates

**User data** runs a script at first boot — installing software, writing configuration, starting the application:

```bash
#!/bin/bash
# fragment
set -euo pipefail
dnf install -y nodejs
mkdir -p /opt/shop-api
aws s3 cp s3://cornershop-artifacts/shop-api-4f9c2e1.tar.gz /tmp/app.tar.gz
tar -xzf /tmp/app.tar.gz -C /opt/shop-api
cat > /etc/systemd/system/shop-api.service <<'EOF'
[Unit]
Description=Shop API
After=network-online.target
[Service]
User=shop
WorkingDirectory=/opt/shop-api
ExecStart=/usr/bin/node server.js
Restart=always
Environment=NODE_ENV=production
[Install]
WantedBy=multi-user.target
EOF
useradd --system shop || true
systemctl daemon-reload && systemctl enable --now shop-api
```

- The script downloads a specific build using the instance role (no keys), installs it as a **systemd** service that restarts on failure, and runs it as an unprivileged user ({{ch:linux}}).
- Never put secrets in user data — anyone who can describe the instance can read it. Fetch secrets at runtime from Secrets Manager or Parameter Store ({{ch:secrets-manager}}).
- Heavy installation at boot makes scaling slow. **Bake** software into an AMI and keep user data for small, instance-specific configuration — or move to containers.
- A **launch template** saves the AMI, instance type, security groups, role, IMDSv2 settings and user data, so auto scaling groups create identical instances ({{ch:auto-scaling}}).

## Running EC2 well

### Level 4 — Pricing models

| Model | How it works | Best for |
|---|---|---|
| **On-Demand** | Pay per second, no commitment | Variable or short-lived workloads, starting out |
| **Savings Plans / Reserved Instances** | Commit to 1 or 3 years of usage for a large discount | Steady, predictable baseline |
| **Spot** | Use spare capacity at a deep discount; AWS can reclaim it with a two-minute warning | Fault-tolerant work: batch jobs, CI runners, stateless workers in mixed groups |

A common mix: Savings Plans cover the steady baseline, On-Demand handles growth, Spot runs interruptible work. Stopped instances still pay for their EBS volumes; forgotten instances and unattached volumes are classic waste ({{ch:cost-optimization}}).

### Level 4 — Treat instances as cattle

- Instances should be **replaceable**: built from images and code, configured automatically, with no data that exists only on them. Patching means building a new image and replacing instances, not logging in to update them by hand.
- Run them in **auto scaling groups** across several availability zones behind a load balancer, even if the group size is fixed — failed instances are then replaced automatically ({{ch:elb}}).
- Ship logs and metrics off the instance with the CloudWatch agent ({{ch:cloudwatch}}).
- Patch operating systems regularly (Systems Manager Patch Manager), or rebuild images on a schedule.

## From beginner to enterprise

**Level 1–2 — first instances.** Choosing types and AMIs; EBS volumes; security groups referencing each other; Session Manager instead of SSH; stopping what you do not use.

**Level 3 — configured instances.** Instance roles instead of keys; IMDSv2 required; user data and launch templates; systemd services; encrypted volumes and snapshots.

**Level 4 — production fleets.** Golden AMIs built by pipelines; auto scaling groups across zones; central logging and patching; pricing mix of Savings Plans, On-Demand and Spot.

**Level 5 — senior practice.** Deciding between EC2, containers and serverless for each workload; right-sizing from data; Graviton migrations; designing for Spot interruptions.

**Level 6 — enterprises.** Organisation-wide AMI pipelines and approved images, SCPs enforcing IMDSv2 and encryption, central capacity and cost management.

## Real-world use cases

### A self-managed search cluster

- **Set-up**: OpenSearch-compatible nodes on storage-optimised instances across three zones, EBS snapshots to S3, AMIs built by a pipeline, access only through Session Manager, IMDSv2 required.

### Cheaper CI

- **Practice**: CI runners on Spot instances in an auto scaling group; jobs that are interrupted are retried. CI costs fell by about two thirds compared with On-Demand.

## Common mistakes

### Beginner: SSH open to the world

**Consequence:** constant brute-force attempts and real compromises. **Fix:** Session Manager; no inbound SSH.

### Beginner: access keys on the instance

**Consequence:** leaked long-lived credentials. **Fix:** instance roles.

### Beginner: data only on the instance

**Consequence:** lost when it is terminated or fails. **Fix:** EBS snapshots, S3, managed databases; replaceable instances.

### Intermediate: IMDSv1 still enabled

**Consequence:** SSRF bugs leak role credentials. **Fix:** require IMDSv2; hop limit 1.

### Intermediate: burstable instances under constant load

**Consequence:** throttled CPU or surprise charges. **Fix:** watch CPU credits; use `m` or `c` families for steady load.

### Production: hand-patched "pet" servers

**Consequence:** drift and fear of change. **Fix:** images built by pipelines; replace instead of repair.

### Production: secrets in user data

**Fix:** fetch from Secrets Manager or Parameter Store at runtime.

## Debugging and troubleshooting

- **Cannot connect to the application**: check the security group (port and source), the subnet's route table, network ACLs, and that the application listens on `0.0.0.0` ({{ch:networking}}).
- **Session Manager does not work**: the instance needs the SSM agent, an instance role with the `AmazonSSMManagedInstanceCore` policy, and a route to SSM endpoints.
- **Instance fails status checks**: the system log and instance screenshot in the console show boot problems; an unreachable instance usually needs replacing.
- **User data did not run as expected**: read `/var/log/cloud-init-output.log`.
- **Application gets AccessDenied**: check that the instance profile is attached and its policy allows the action ({{ch:iam}}).
- **Slow performance**: CPU credits (burstable), EBS throughput limits, or memory pressure — check CloudWatch metrics.

## Security summary

- **No inbound SSH or RDP from the internet**; Session Manager with IAM control and logging.
- **Instance roles**, never stored keys; **IMDSv2 required**, hop limit 1.
- **Security groups** that reference each other with minimal ports.
- **Encrypted EBS volumes and snapshots**; snapshots never shared publicly.
- **Hardened, patched golden images**; regular replacement.
- **No secrets in user data or AMIs.**

## How a senior engineer thinks about this

- **Is EC2 the right level?** Managed containers or serverless often remove the operating system work entirely.
- **Cattle, not pets.** Images and code define instances; replacement beats repair.
- **Identity, not keys.** Roles and IMDSv2, Session Manager instead of SSH.
- **Measure, then size.** Right-size and choose pricing from real usage.
- **Spread across zones.** Every fleet runs in an auto scaling group across several zones.

## Exercises

### Exercise 1 — Choose instance types

**Objective:** practise choosing instances.
**What to do:** choose an instance family for: (a) a low-traffic internal admin tool; (b) a steady, CPU-heavy image-resizing service; (c) a self-managed Redis with 100 GB of data in memory; (d) nightly batch jobs that can be retried.

<details>
<summary>Show the solution</summary>

- (a) A small burstable instance (`t4g.small`) — low average CPU.
- (b) Compute-optimised (`c7g`) — steady high CPU; consider Graviton.
- (c) Memory-optimised (`r7g`) with enough memory for data plus overhead — or, better, managed ElastiCache.
- (d) Spot instances in a mixed group of several instance types, with retries.

</details>

### Exercise 2 — Fix the security groups

**Objective:** practise network security.
**What to do:** an application instance's security group allows 22 from `0.0.0.0/0`, 3000 from `0.0.0.0/0` and 5432 from `0.0.0.0/0` (the database runs on the same instance). Users reach the app through a load balancer. Redesign.

<details>
<summary>Show the solution</summary>

- Remove port 22 entirely; use Session Manager.
- Allow 3000 **only from the load balancer's security group**.
- Remove 5432 from the internet. Better: move the database to RDS with its own security group allowing 5432 only from the application's security group ({{ch:rds}}).
- The load balancer's security group allows 443 (and 80 for redirects) from the internet.

</details>

### Exercise 3 — Production scenario: the stolen credentials

**Objective:** practise incident analysis.
**The scenario:** CloudTrail shows the role of your image-import service listing and downloading every object in several S3 buckets — from an IP address outside AWS. The service has a feature that fetches an image from a URL the user provides. What probably happened, and what do you do?

<details>
<summary>Show the solution</summary>

**Likely cause:** an **SSRF** bug — the attacker supplied `http://169.254.169.254/latest/meta-data/iam/security-credentials/<role>` as the image URL, received the role's temporary credentials (IMDSv1 enabled), and used them from outside.

**Respond:** revoke the role's active sessions (an inline deny on sessions issued before now), require IMDSv2 on all instances, fix the SSRF (allow-list hosts, block private and link-local addresses, fetch through a restricted proxy), review what was accessed in CloudTrail and handle the data exposure, and reduce the role's permissions to only the buckets and actions it needs ({{ch:iam}}). Add a CloudWatch alarm for the role's credentials being used from outside your network.

</details>

## Summary

**EC2** rents virtual servers, called **instances**, by the second. An **instance type** sets the hardware (general purpose `m`, compute `c`, memory `r`, burstable `t`, storage and GPU families; Graviton ARM options are often cheaper). Instances boot from **AMIs** — official or hardened golden images — and store data on durable, zonal **EBS** volumes backed up by snapshots, or on temporary **instance store** disks.

**Security groups** are stateful allow-only firewalls; reference other security groups and never expose SSH, RDP or databases to the internet. Log in with **Session Manager**, controlled by IAM and audited, instead of open SSH. Software on instances gets AWS permissions from an **instance role**, whose temporary credentials come from the **metadata service** — require **IMDSv2**, whose session tokens stop SSRF bugs from stealing them, and fix SSRF in code too. **User data** configures instances at boot, **launch templates** save configurations for auto scaling, and secrets never belong in either.

Choose **On-Demand**, **Savings Plans** or **Spot** pricing by workload. Treat instances as replaceable cattle: built from images, run in auto scaling groups across zones, patched by replacement, with logs and data stored elsewhere.

## Key terms

- **EC2** — Amazon Elastic Compute Cloud, AWS's virtual server service.
- **Instance** — A virtual server running on EC2.
- **Instance type** — The hardware profile of an instance.
- **Burstable instance** — An instance type that accumulates and spends CPU credits.
- **Graviton** — AWS's ARM-based processors.
- **AMI** — Amazon Machine Image, the template an instance boots from.
- **Golden image** — A pre-hardened, approved AMI used across an organisation.
- **EBS** — Elastic Block Store, durable network-attached disk volumes.
- **Snapshot** — A point-in-time backup of an EBS volume.
- **Instance store** — Temporary local disk storage lost when an instance stops.
- **Security group** — A stateful, allow-only firewall for instances.
- **Session Manager** — A Systems Manager feature for shell access without inbound ports.
- **Instance profile** — The container that attaches an IAM role to an instance.
- **IMDS** — The instance metadata service at 169.254.169.254.
- **IMDSv2** — The token-based version of the metadata service that resists SSRF.
- **SSRF** — Server-side request forgery, tricking a server into making requests for an attacker.
- **User data** — A script or configuration run when an instance first boots.
- **Launch template** — A saved instance configuration.
- **Spot instance** — Spare capacity at a discount that AWS can reclaim with short notice.
- **Savings Plan** — A usage commitment that gives discounted prices.

## What comes next

Instances and containers should not keep files on their own disks. The next chapter, {{ch:s3}}, introduces S3, AWS's object storage: buckets and objects, storage classes, keeping buckets private, pre-signed URLs for browser uploads and downloads, versioning, lifecycle rules and events.
