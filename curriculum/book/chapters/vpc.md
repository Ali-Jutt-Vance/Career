# VPC: Your Private Network in the Cloud

> [!GOALS]
> - Explain what a VPC is and why every AWS workload lives in one.
> - Plan **CIDR** address ranges and **subnets** across availability zones.
> - Understand **public** and **private** subnets, **route tables**, **internet gateways** and **NAT gateways**.
> - Control traffic with **security groups** and **network ACLs**.
> - Reach AWS services privately with **VPC endpoints**, and connect networks with peering and Transit Gateway.
> - Design a standard three-tier network and debug connectivity problems.

## Why this matters

Every EC2 instance, RDS database, load balancer, ECS task and many Lambda functions run inside a **Virtual Private Cloud (VPC)** — your own private network in AWS. The VPC decides what can reach what: which servers are reachable from the internet, which can only be reached from inside, and how private servers download updates or call AWS services.

Networking mistakes are among the most common and most dangerous cloud problems. A database in a public subnet with a permissive security group can be attacked from anywhere. A wrong route table makes a service mysteriously unable to reach its database. An unnoticed NAT gateway can quietly add hundreds of dollars to the bill. And address ranges chosen carelessly on day one can block connecting networks together years later.

This chapter applies the networking basics from {{ch:networking}} — IP addresses, CIDR ranges, routing, ports — to AWS.

## The simple idea

A VPC is like a private office building that you rent inside a huge business park. You decide the floor plan: which rooms face the street with a public entrance (public subnets), which are inner rooms reachable only through the corridors (private subnets), where the doors are, and who the receptionist lets in (security rules). Staff in inner rooms can still send post out through the mailroom (NAT gateway) without outsiders being able to walk in.

> [!ANALOGY]
> A VPC is like a rented office building: you design the floor plan, decide which rooms have street doors, and control who may enter each room.
>
> **Where the analogy breaks:** in a real building, an inner room is private because of the walls. In a VPC, "private" means only that a subnet's **route table** has no route to the internet gateway. Nothing physical separates the rooms; one wrong line in a route table or a security group can open an "inner room" to the whole internet.

## The proper definition and key words

A **VPC** is a logically isolated virtual network in one AWS region, defined by one or more IPv4 **CIDR blocks** (and optionally IPv6). It is divided into **subnets**, each in one availability zone, whose traffic is directed by **route tables** and filtered by **security groups** and **network ACLs**.

Key words:

- **CIDR block** — an IP range such as `10.20.0.0/16` (65,536 addresses).
- **Subnet** — a range within the VPC in one availability zone.
- **Route table** — rules sending traffic for destination ranges to targets; attached to subnets.
- **Internet gateway (IGW)** — the VPC's connection to the internet.
- **Public subnet** — a subnet whose route table sends `0.0.0.0/0` to the internet gateway.
- **Private subnet** — a subnet with no route to the internet gateway.
- **NAT gateway** — lets private resources make outbound internet connections without being reachable from the internet.
- **Security group** — a stateful firewall on network interfaces.
- **Network ACL** — a stateless allow/deny filter on subnets.
- **VPC endpoint** — private access to AWS services without the internet (gateway endpoints for S3 and DynamoDB, interface endpoints for most others).
- **VPC peering / Transit Gateway** — connecting VPCs together.
- **Flow logs** — records of accepted and rejected network traffic.

## Designing the address space

### Level 1 — CIDR ranges and subnets

A VPC's CIDR range should be **private** (`10.0.0.0/8`, `172.16.0.0/12` or `192.168.0.0/16`), large enough for growth, and **unique across your organisation** — overlapping ranges cannot be connected later by peering or VPN. A `/16` per VPC is common. This example plans one:

```ts
// Planning a VPC: split 10.20.0.0/16 into subnets, and see how a route table picks a route.
const toInt = (ip: string) => ip.split(".").reduce((n, part) => (n << 8) + Number(part), 0) >>> 0;
const toIp = (n: number) => [24, 16, 8, 0].map((s) => (n >>> s) & 255).join(".");

function cidr(block: string) {
  const [ip, bits] = block.split("/");
  const prefix = Number(bits);
  const size = 2 ** (32 - prefix);
  const start = toInt(ip!) & ~(size - 1) >>> 0;
  return { block, prefix, start: start >>> 0, size };
}

// carve /20 subnets (4,096 addresses each) out of the /16 for three tiers in three zones
const vpc = cidr("10.20.0.0/16");
const tiers = ["public", "private-app", "private-data"];
const zones = ["eu-west-2a", "eu-west-2b", "eu-west-2c"];
let next = vpc.start;
const subnets: { name: string; block: string }[] = [];
for (const tier of tiers) for (const zone of zones) {
  const block = `${toIp(next)}/20`;
  subnets.push({ name: `${tier}-${zone.slice(-1)}`, block });
  next += 2 ** 12;
}
console.log(`VPC ${vpc.block}: ${vpc.size.toLocaleString("en-GB")} addresses`);
for (const s of subnets) {
  const c = cidr(s.block);
  // AWS reserves 5 addresses per subnet: network, router, DNS, future use, broadcast
  console.log(`  ${s.name.padEnd(16)} ${s.block.padEnd(15)} ${`${toIp(c.start)} - ${toIp(c.start + c.size - 1)}`.padEnd(28)} usable ${c.size - 5}`);
}
console.log(`  left for later growth: ${((vpc.start + vpc.size - next) / 2 ** 12)} more /20 blocks`);

// A private subnet's route table: the most specific matching route wins (longest prefix match)
const routes = [
  { dest: "10.20.0.0/16", target: "local" },
  { dest: "10.30.0.0/16", target: "pcx-peering-to-shared-services" },
  { dest: "0.0.0.0/0", target: "nat-gateway (eu-west-2a)" },
];
function route(ip: string): string {
  const n = toInt(ip);
  const match = routes
    .map((r) => ({ ...r, c: cidr(r.dest) }))
    .filter((r) => (n >>> 0) >= r.c.start && (n >>> 0) < r.c.start + r.c.size)
    .sort((a, b) => b.c.prefix - a.c.prefix)[0]!;
  return `${ip.padEnd(14)} -> ${match.target} (via ${match.dest})`;
}
for (const ip of ["10.20.40.17", "10.30.2.9", "52.95.150.10"]) console.log(route(ip));
```

**Output:**

```text
VPC 10.20.0.0/16: 65,536 addresses
  public-a         10.20.0.0/20    10.20.0.0 - 10.20.15.255     usable 4091
  public-b         10.20.16.0/20   10.20.16.0 - 10.20.31.255    usable 4091
  public-c         10.20.32.0/20   10.20.32.0 - 10.20.47.255    usable 4091
  private-app-a    10.20.48.0/20   10.20.48.0 - 10.20.63.255    usable 4091
  private-app-b    10.20.64.0/20   10.20.64.0 - 10.20.79.255    usable 4091
  private-app-c    10.20.80.0/20   10.20.80.0 - 10.20.95.255    usable 4091
  private-data-a   10.20.96.0/20   10.20.96.0 - 10.20.111.255   usable 4091
  private-data-b   10.20.112.0/20  10.20.112.0 - 10.20.127.255  usable 4091
  private-data-c   10.20.128.0/20  10.20.128.0 - 10.20.143.255  usable 4091
  left for later growth: 7 more /20 blocks
10.20.40.17    -> local (via 10.20.0.0/16)
10.30.2.9      -> pcx-peering-to-shared-services (via 10.30.0.0/16)
52.95.150.10   -> nat-gateway (eu-west-2a) (via 0.0.0.0/0)
```

- Three **tiers** (public, application, data) in three **zones** give nine subnets. Each subnet lives in exactly one zone, so spreading a tier across zones is how a VPC survives a zone failure ({{ch:aws-overview}}).
- AWS reserves **five addresses** in every subnet (the network address, the VPC router, DNS, one for future use, and the last address).
- Leave room: seven `/20` blocks remain for new tiers or zones. Container platforms give **every task or pod its own IP address**, so application subnets fill up faster than you expect ({{ch:ecs}}, {{ch:eks}}). Public subnets often need far fewer addresses — only load balancers and NAT gateways live there.
- The **route table** picks the **most specific** matching route (longest prefix): VPC addresses stay `local`, the peered network goes through the peering connection, and everything else goes to the NAT gateway.

### Level 2 — Public and private subnets

```text
                        internet
                           │
                  ┌────────▼────────┐
                  │ internet gateway │
 VPC 10.20.0.0/16 └────────┬────────┘
 ┌─────────────────────────┼─────────────────────────────────────────┐
 │ public subnets (a, b, c): route 0.0.0.0/0 → internet gateway       │
 │    load balancer nodes        NAT gateway (one per zone)           │
 ├────────────────────────────────────────────────────────────────────┤
 │ private app subnets: route 0.0.0.0/0 → NAT gateway in same zone    │
 │    ECS tasks / EC2 instances (no public IPs)                       │
 ├────────────────────────────────────────────────────────────────────┤
 │ private data subnets: no internet route at all                     │
 │    RDS, ElastiCache                                                │
 └────────────────────────────────────────────────────────────────────┘
   gateway endpoint for S3; interface endpoints for ECR, Secrets Manager, CloudWatch Logs …
```

- A subnet is **public** only because its route table sends `0.0.0.0/0` to the **internet gateway**; resources there also need public IP addresses to be reachable.
- Only things that must accept connections from the internet go in public subnets — in a typical application, just the **load balancer** ({{ch:elb}}) and NAT gateways.
- **Application servers** go in private subnets: reachable only through the load balancer, with outbound internet access (for third-party APIs and package downloads) through a **NAT gateway**.
- **Databases** go in private data subnets with no internet route at all ({{ch:rds}}).

### Level 2 — NAT gateways and their cost

A **NAT gateway** translates private addresses to its own public address for outbound connections; replies come back, but nobody outside can start a connection inwards.

- It lives in one zone. For high availability, use **one NAT gateway per zone**, with each zone's private route table pointing at its own — otherwise a zone failure cuts internet access for all zones, and cross-zone traffic adds charges.
- NAT gateways charge **per hour and per gigabyte processed**. Pulling container images, sending logs and calling S3 through NAT can become one of the largest items on the bill ({{ch:cost-optimization}}). **VPC endpoints** avoid this.

## Controlling traffic

### Level 3 — Security groups and network ACLs

| | Security group | Network ACL |
|---|---|---|
| Attached to | Network interfaces (instances, tasks, databases, load balancers) | Subnets |
| Rules | Allow only | Allow and deny, numbered, evaluated in order |
| State | **Stateful**: replies to allowed traffic are allowed automatically | **Stateless**: return traffic needs its own rule (ephemeral ports) |
| Typical use | Main access control, referencing other security groups | Coarse subnet-level guardrails, blocking specific ranges |

Security groups do almost all the work: the load balancer's group allows 443 from the internet; the application's group allows its port only from the load balancer's group; the database's group allows 5432 only from the application's group ({{ch:ec2}}). Most teams leave network ACLs at their default (allow all) and add rules only for specific needs.

### Level 3 — VPC endpoints

Without endpoints, a private application calling S3, ECR or Secrets Manager goes out through the NAT gateway to the public service address. **VPC endpoints** keep that traffic inside AWS's network:

- **Gateway endpoints** (S3 and DynamoDB): a route table entry; **free**. Always add the S3 gateway endpoint.
- **Interface endpoints** (most other services: ECR, Secrets Manager, SSM, CloudWatch Logs, STS, SQS): private network interfaces in your subnets with private DNS names. They cost per hour and per GB, but often less than NAT for heavy traffic — and they let data subnets with no internet route still use AWS services.
- **Endpoint policies** and bucket policy conditions (`aws:SourceVpce`) can restrict which buckets may be reached through an endpoint, and require that a bucket is only accessed from your VPC — a strong defence against data being copied out with stolen credentials.

### Level 4 — Connecting networks

- **VPC peering**: a private connection between two VPCs (in any account or region). Not transitive — A↔B and B↔C does not give A↔C — so it gets messy beyond a few VPCs.
- **Transit Gateway**: a regional hub connecting many VPCs, VPNs and Direct Connect links, with its own route tables. The standard choice for organisations with many accounts.
- **Site-to-site VPN** and **Direct Connect**: connecting offices and data centres.
- **PrivateLink**: exposing one service (behind a Network Load Balancer) privately to other VPCs, without connecting the whole networks.
- All of these require **non-overlapping CIDR ranges** — the reason to plan addresses centrally from the start (often with IPAM).

## Operating networks

### Level 4 — Visibility and design for production

- **Flow logs** record accepted and rejected traffic per interface, subnet or VPC — essential for debugging ("is the traffic arriving and being rejected?") and security investigations. Send them to S3 or CloudWatch Logs.
- **Reachability Analyzer** checks whether a path between two resources is possible and which component blocks it.
- **DNS**: keep `enableDnsSupport` and `enableDnsHostnames` on; private hosted zones give internal names ({{ch:route53}}).
- **Define the network in code** with a well-tested module ({{ch:terraform}}); use separate VPCs (in separate accounts) for production and non-production.
- **IPv6** is increasingly supported, and avoids NAT for outbound traffic through an egress-only internet gateway.

## From beginner to enterprise

**Level 1–2 — first networks.** CIDR planning; public and private subnets in several zones; internet gateway and route tables; load balancers public, everything else private.

**Level 3 — secure networks.** Security groups referencing each other; NAT gateway per zone; S3 gateway endpoint and interface endpoints for key services; data subnets without internet routes; flow logs.

**Level 4 — connected networks.** Peering or Transit Gateway; VPN and Direct Connect; PrivateLink for shared services; endpoint policies restricting data access.

**Level 5 — senior practice.** Organisation-wide IP address management; network cost analysis (NAT, cross-zone, data transfer); designing for container IP consumption; debugging with flow logs and Reachability Analyzer.

**Level 6 — enterprises.** Hub-and-spoke network accounts, central egress with inspection firewalls, shared VPCs, and network guardrails enforced by policy.

## Real-world use cases

### The standard three-tier VPC

- **Design**: a `/16` per environment; public, application and data subnets in three zones; an ALB in public subnets; ECS tasks in application subnets; RDS and ElastiCache in data subnets; NAT per zone; S3 gateway endpoint; interface endpoints for ECR, Secrets Manager and CloudWatch Logs; flow logs to S3.

### The NAT bill

- **What happened**: a team noticed that NAT gateway processing cost more than their whole compute. Container image pulls, log shipping and S3 uploads all went through NAT.
- **Fix**: an S3 gateway endpoint (free) and interface endpoints for ECR and CloudWatch Logs cut NAT traffic by about 90%.

## Common mistakes

### Beginner: databases and servers in public subnets

**Consequence:** exposed to internet scanning. **Fix:** private subnets; only load balancers public.

### Beginner: one availability zone

**Consequence:** a zone failure takes everything down. **Fix:** every tier in at least two zones.

### Intermediate: overlapping CIDR ranges

**Consequence:** networks that can never be connected. **Fix:** central address planning.

### Intermediate: subnets too small

**Consequence:** containers cannot start when IP addresses run out. **Fix:** generous application subnets.

### Intermediate: single NAT gateway

**Consequence:** a zone failure breaks outbound access everywhere, plus cross-zone charges. **Fix:** one per zone.

### Production: no endpoints

**Consequence:** large NAT bills and AWS traffic via the internet path. **Fix:** S3 gateway endpoint and key interface endpoints.

### Production: no flow logs

**Consequence:** blind debugging and investigations. **Fix:** flow logs on.

## Debugging and troubleshooting

Work through the path in order:

1. **DNS**: does the name resolve to the expected (private) address?
2. **Route table** of the source subnet: is there a route to the destination (local, NAT, endpoint, peering)? And on the way back?
3. **Security groups**: does the destination's group allow the port from the source's group or range?
4. **Network ACLs**: if customised, are both directions and ephemeral ports allowed?
5. **The application**: is it listening on the right port and interface?
6. **Flow logs**: `REJECT` entries show which side blocked it; nothing at all suggests routing or DNS.
7. **Reachability Analyzer** for a definitive path check.

Classic cases: a private instance cannot download packages (no NAT route); an ECS task cannot pull images (no NAT and no ECR endpoints); a Lambda in a VPC cannot reach the internet (it needs private subnets with NAT, not public subnets).

## Security summary

- **Least exposure**: only load balancers in public subnets; no public IPs on servers.
- **Security groups referencing each other**; no `0.0.0.0/0` on administrative or database ports.
- **Data subnets without internet routes**; VPC endpoints for AWS services.
- **Endpoint and bucket policies** restricting access to your VPC.
- **Flow logs** for detection and investigation.
- **Separate VPCs and accounts** for production; network changes reviewed as code.

## How a senior engineer thinks about this

- **Plan addresses for the future.** Overlaps and tiny subnets are expensive to fix.
- **Private by default.** Public exposure is a deliberate, minimal exception.
- **Every zone is independent.** Subnets, NAT gateways and capacity in each.
- **Network traffic has a price.** NAT, cross-zone and outbound transfer are design inputs.
- **Debug by the path.** DNS, routes, security groups, ACLs, application — in order.

## Exercises

### Exercise 1 — Plan the subnets

**Objective:** practise address planning.
**What to do:** plan a VPC for a new environment that will run many containers, in two zones, with public, application and data tiers, leaving room to add a third zone later.

<details>
<summary>Show the solution</summary>

One possibility with `10.40.0.0/16`:
- Public: `10.40.0.0/24` (a), `10.40.1.0/24` (b) — small; only load balancers and NAT gateways.
- Application: `10.40.16.0/20` (a), `10.40.32.0/20` (b) — large, for container IP addresses.
- Data: `10.40.8.0/24` (a), `10.40.9.0/24` (b).
- Reserve `10.40.2.0/24`, `10.40.48.0/20` and `10.40.10.0/24` for zone c, and keep the rest free.

Check the `/16` does not overlap any other VPC, office network or VPN range in the organisation.

</details>

### Exercise 2 — Why can't it connect?

**Objective:** practise connectivity debugging.
**The situation:** an ECS task in a private subnet fails to start with "CannotPullContainerError: … i/o timeout" when pulling from ECR. What do you check?

<details>
<summary>Show the solution</summary>

The task cannot reach ECR. Check:
1. The private subnet's **route table**: is there a `0.0.0.0/0` route to a working NAT gateway?
2. Or, without NAT: **interface endpoints** for `ecr.api` and `ecr.dkr`, plus the **S3 gateway endpoint** (image layers come from S3), with private DNS enabled.
3. The **endpoints' security group** allows 443 from the task's security group.
4. The **task's security group** allows outbound 443.
5. Network ACLs, if customised.
6. Flow logs to see whether traffic leaves and is rejected.

</details>

### Exercise 3 — Production scenario: a flat network

**Objective:** practise network redesign.
**The scenario:** a company runs everything — web servers, API servers, PostgreSQL and Redis — in the default VPC's public subnets, with public IPs and security groups allowing 22 and 5432 from anywhere. How do you move to a safe design with minimal downtime?

<details>
<summary>Show the solution</summary>

1. **Immediately**: tighten security groups — remove 22 (use Session Manager) and 5432 from anywhere; allow the database only from the application's security group.
2. **Build a new VPC in code**: non-overlapping CIDR, public, application and data subnets in several zones, NAT per zone, endpoints, flow logs.
3. **Move the database**: create an RDS instance (Multi-AZ, private data subnets) and migrate with replication or AWS DMS to minimise downtime; switch over in a short window.
4. **Move the applications** behind a new load balancer in the public subnets, with tasks or instances in the application subnets.
5. **Switch DNS** to the new load balancer; keep the old environment briefly for rollback; then remove it and its public IPs.

</details>

## Summary

A **VPC** is your isolated network in one region, defined by a **CIDR range** that should be private, large enough and unique across your organisation. It is divided into **subnets**, each in one availability zone; spread every tier across zones, plan for containers that use an IP address each, and remember AWS reserves five addresses per subnet.

**Route tables** send traffic by the most specific matching route. A subnet is **public** when it routes `0.0.0.0/0` to an **internet gateway**; only load balancers and NAT gateways belong there. Applications run in **private subnets** with outbound access through a **NAT gateway** per zone, and databases in data subnets with no internet route. **Security groups** (stateful, allow-only, referencing each other) do most access control; **network ACLs** (stateless, ordered allow and deny) are subnet guardrails.

**VPC endpoints** reach AWS services privately — the S3 gateway endpoint is free — cutting NAT costs and allowing endpoint-restricted data access. **Peering**, **Transit Gateway**, VPN, Direct Connect and **PrivateLink** connect networks, all requiring non-overlapping ranges. Use **flow logs** and Reachability Analyzer, define networks in code, and debug in order: DNS, routes, security groups, ACLs, application.

## Key terms

- **VPC** — Virtual Private Cloud, an isolated virtual network in an AWS region.
- **CIDR block** — A notation for an IP address range, such as `10.20.0.0/16`.
- **Subnet** — A part of a VPC's address range in one availability zone.
- **Route table** — Rules that direct traffic from subnets to targets.
- **Longest prefix match** — Choosing the most specific matching route.
- **Internet gateway** — The component connecting a VPC to the internet.
- **Public subnet** — A subnet with a route to the internet gateway.
- **Private subnet** — A subnet without a route to the internet gateway.
- **NAT gateway** — A managed service allowing outbound internet access from private subnets.
- **Security group** — A stateful, allow-only firewall on network interfaces.
- **Network ACL** — A stateless subnet-level filter with allow and deny rules.
- **Ephemeral ports** — Temporary client ports used for return traffic.
- **VPC endpoint** — Private access from a VPC to an AWS service.
- **Gateway endpoint** — A free, route-based endpoint for S3 and DynamoDB.
- **Interface endpoint** — A network-interface-based endpoint for most AWS services.
- **VPC peering** — A private connection between two VPCs.
- **Transit Gateway** — A hub connecting many VPCs and on-premises networks.
- **PrivateLink** — Exposing a single service privately to other VPCs.
- **Flow logs** — Records of network traffic accepted or rejected in a VPC.
- **Reachability Analyzer** — A tool that checks network paths between resources.

## What comes next

Inside the VPC, services find each other by name — and outside, users find your application by its domain name. The next chapter, {{ch:route53}}, covers Route 53: hosted zones, record types and alias records, routing policies for latency and failover, health checks and private DNS.
