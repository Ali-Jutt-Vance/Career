# Route 53: DNS on AWS

> [!GOALS]
> - Explain what Route 53 does: domain registration, authoritative DNS and health checking.
> - Create **hosted zones** and records, and use **alias records** for AWS resources.
> - Choose **routing policies** — simple, weighted, failover, latency, geolocation — and connect them to **health checks**.
> - Use **private hosted zones** for internal names inside VPCs.
> - Plan DNS changes safely around **TTLs**, and protect domains from takeover.

## Why this matters

Users never type IP addresses. They type `cornershop.example`, and DNS turns that into the address of your load balancer or CDN ({{ch:dns}}). If DNS is wrong, slow or down, your whole application is unreachable, however healthy the servers are. DNS also quietly does more: it can send users to the nearest region, shift traffic gradually between old and new environments, and move everything to a standby region when the primary fails.

**Amazon Route 53** is AWS's DNS service — named after DNS's port number, 53. It hosts your domain's records on a global network of servers with a 100% availability service level, integrates with load balancers, CloudFront and S3 through alias records, and checks the health of endpoints to route around failures. Back-end engineers use it to point domains at services, create records for certificate validation ({{ch:tls-ssl}}), name internal services and plan migrations.

## The simple idea

DNS is the internet's phone book, and Route 53 is a phone-book office that you control for your own names. You decide which number each name points to. You can also give smarter instructions: "send nine out of ten callers to the main office and one to the new office", "if the main office does not answer, give out the backup number", or "give each caller the number of the office closest to them".

> [!ANALOGY]
> Route 53 is like a phone-book office for your own names, which can also give out different numbers depending on health, location or a chosen share of callers.
>
> **Where the analogy breaks:** once someone has looked up a phone number, they might keep using it for a while — and DNS resolvers do exactly that, caching answers for the record's **TTL**. When you change a record, some users keep the old answer until their cache expires. DNS changes are therefore never instant, and DNS-based failover takes at least as long as the TTL plus health-check detection.

## The proper definition and key words

**Amazon Route 53** is a highly available DNS service providing **domain registration**, **authoritative DNS** through **hosted zones**, **health checks**, and **routing policies** that choose answers based on weights, health, latency or location.

Key words:

- **Domain registration** — registering a domain name (Route 53 can be the registrar, or another company can).
- **Hosted zone** — the container of records for a domain; **public** (internet) or **private** (inside VPCs).
- **Name servers (NS)** — the servers authoritative for the zone; the registrar must point to them.
- **Record** — a name, type and value: `A`, `AAAA`, `CNAME`, `MX`, `TXT`, `CAA`, `NS`.
- **Alias record** — a Route 53 extension that points a name directly at an AWS resource (load balancer, CloudFront, S3 website), works at the zone apex, and follows the resource's addresses automatically.
- **TTL** — how long resolvers may cache an answer.
- **Routing policy** — how Route 53 picks among several records with the same name.
- **Health check** — Route 53 checking an endpoint (or a CloudWatch alarm) from several locations.
- **Zone apex** — the bare domain (`cornershop.example`) without a subdomain.

## Zones and records

### Level 1 — Hosted zones and delegation

When you create a public hosted zone for `cornershop.example`, Route 53 assigns four name servers. The domain's **registrar** must list those name servers; that **delegation** makes Route 53 authoritative for the domain. If the registrar still lists old name servers, your records in Route 53 have no effect at all.

Common records for a web application:

```text
 cornershop.example.          A      ALIAS → CloudFront distribution         (website)
 www.cornershop.example.      CNAME  cornershop.example.                     (or another alias)
 api.cornershop.example.      A      ALIAS → application load balancer       (API)
 cornershop.example.          MX     10 inbound-smtp.eu-west-1.amazonaws.com. (email)
 cornershop.example.          TXT    "v=spf1 include:amazonses.com -all"      (email sender policy)
 _dmarc.cornershop.example.   TXT    "v=DMARC1; p=reject; rua=mailto:…"
 cornershop.example.          CAA    0 issue "amazon.com"                     (who may issue certificates)
 _3f1….api.cornershop.example. CNAME _9a2….acm-validations.aws.             (ACM certificate validation)
```

The email records come from {{ch:email}}; the certificate validation record lets AWS Certificate Manager issue and **automatically renew** TLS certificates, as long as the record stays in place.

### Level 2 — Alias records

A **CNAME** cannot exist at the zone apex (the DNS standard forbids it alongside the apex's required records), and it costs an extra lookup. Route 53's **alias records** solve both:

```hcl
resource "aws_route53_record" "api" {
  zone_id = aws_route53_zone.public.zone_id
  name    = "api.cornershop.example"
  type    = "A"
  alias {
    name                   = aws_lb.api.dns_name
    zone_id                = aws_lb.api.zone_id
    evaluate_target_health = true      # do not answer with this record if the load balancer is unhealthy
  }
}
```

- An alias answers with the **current** addresses of the load balancer or CloudFront distribution, which change over time — never create `A` records with a load balancer's IP addresses.
- Alias queries to AWS resources are free, and they work at the apex.
- `evaluate_target_health` connects the record to the target's health, used by routing policies.

## Routing policies

### Level 3 — Choosing among several answers

| Policy | Chooses | Typical use |
|---|---|---|
| **Simple** | The one record | Most records |
| **Weighted** | Records in proportion to weights | Gradual migrations, DNS-level canaries, A/B splits |
| **Failover** | Primary while healthy, otherwise secondary | Active-passive disaster recovery |
| **Latency** | The region with the lowest latency for the user | Multi-region applications |
| **Geolocation / geoproximity** | By the user's country, continent or distance | Legal data residency, localised content |
| **Multivalue answer** | Up to eight healthy records | Simple client-side load spreading |

This simplified model shows how the main policies decide:

```ts
// How Route 53 routing policies choose an answer (a simplified model).
type Rec = { id: string; value: string; weight?: number; role?: "PRIMARY" | "SECONDARY"; region?: string; healthy: boolean };

let seed = 7;                                          // fixed pseudo-random sequence for a repeatable run
const random = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);

function weighted(records: Rec[]): Rec {
  const live = records.filter((r) => r.healthy);
  const pool = live.length > 0 ? live : records;       // if every record is unhealthy, answer anyway
  const total = pool.reduce((s, r) => s + (r.weight ?? 0), 0);
  let pick = random() * total;
  for (const r of pool) { pick -= r.weight ?? 0; if (pick < 0) return r; }
  return pool.at(-1)!;
}
function failover(records: Rec[]): Rec {
  const primary = records.find((r) => r.role === "PRIMARY")!;
  return primary.healthy ? primary : records.find((r) => r.role === "SECONDARY")!;
}
function latency(records: Rec[], latencyMs: Record<string, number>): Rec {
  return records.filter((r) => r.healthy).sort((a, b) => latencyMs[a.region!]! - latencyMs[b.region!]!)[0]!;
}

// 1. Weighted: send about 10% of answers to the new stack (a canary at the DNS level)
const canary: Rec[] = [
  { id: "blue", value: "blue-alb.eu-west-2.elb.amazonaws.com", weight: 90, healthy: true },
  { id: "green", value: "green-alb.eu-west-2.elb.amazonaws.com", weight: 10, healthy: true },
];
const counts: Record<string, number> = { blue: 0, green: 0 };
for (let i = 0; i < 10_000; i++) counts[weighted(canary).id]!++;
console.log(`weighted 90/10 over 10,000 queries: blue ${counts.blue}, green ${counts.green}`);

// 2. Failover: the primary's health check fails, answers switch to the standby region
const dr: Rec[] = [
  { id: "london", value: "alb-london", role: "PRIMARY", healthy: true },
  { id: "dublin", value: "alb-dublin", role: "SECONDARY", healthy: true },
];
console.log(`failover, primary healthy:   ${failover(dr).value}`);
dr[0]!.healthy = false;
console.log(`failover, primary unhealthy: ${failover(dr).value}`);

// 3. Latency: answer with the region that is fastest for this user, skipping unhealthy ones
const global: Rec[] = [
  { id: "eu", value: "alb-eu-west-2", region: "eu-west-2", healthy: true },
  { id: "us", value: "alb-us-east-1", region: "us-east-1", healthy: true },
  { id: "ap", value: "alb-ap-south-1", region: "ap-south-1", healthy: true },
];
const fromKarachi = { "eu-west-2": 140, "us-east-1": 230, "ap-south-1": 35 };
console.log(`latency, user in Karachi:            ${latency(global, fromKarachi).value}`);
global[2]!.healthy = false;
console.log(`latency, Mumbai region unhealthy:    ${latency(global, fromKarachi).value}`);
```

**Output:**

```text
weighted 90/10 over 10,000 queries: blue 9004, green 996
failover, primary healthy:   alb-london
failover, primary unhealthy: alb-dublin
latency, user in Karachi:            alb-ap-south-1
latency, Mumbai region unhealthy:    alb-eu-west-2
```

- **Weighted** records send roughly the chosen share of **DNS answers** — not of requests. Each resolver caches its answer for the TTL and may serve many users, so the real traffic split is lumpy; for precise canaries, use load balancer weights instead ({{ch:elb}}, {{ch:cicd}}).
- **Failover** answers with the primary while its health check passes, and with the secondary otherwise.
- **Latency** routing uses AWS's measurements between user networks and regions, and skips unhealthy regions.
- Policies can be **nested**: latency routing between regions, with failover or weighted records inside each region.

### Level 3 — Health checks

Route 53 health checkers in many locations call your endpoint (HTTP, HTTPS or TCP) every 10 or 30 seconds; when enough of them see failures, the check becomes unhealthy and records using it are taken out of answers.

- Check a **meaningful endpoint** — a `/health` route that verifies the service can work, not just that a port is open ({{ch:monitoring}}).
- **Calculated** health checks combine others ("healthy if at least 2 of 3"); **CloudWatch alarm** health checks can mark private resources unhealthy.
- Allow the health checkers' IP ranges in security groups, or use alarm-based checks for private endpoints.
- Health checks have alarms of their own — know when a region is failing over.

### Level 4 — What DNS failover can and cannot do

- **Time to fail over** = detection (for example 3 failures × 10 s) + TTL of cached answers + client behaviour. With a 60-second TTL, expect one to three minutes, and some clients that cache longer.
- The **secondary must really work**: its data must be current (cross-region replicas, {{ch:rds}}), its capacity sufficient, and it must be tested regularly. A secondary that has not been tried is a guess.
- DNS failover moves **new** connections; existing connections to a failing region still need application-level timeouts.

## Internal DNS and operations

### Level 3 — Private hosted zones

A **private hosted zone** (for example `internal.cornershop.example`) is visible only to the VPCs associated with it:

- Give internal services stable names: `db.internal.cornershop.example` → the RDS endpoint (CNAME), `search.internal…` → an internal load balancer.
- Changing the target later (a new database) needs only a DNS change, not new configuration in every service.
- Split-horizon DNS: the same name can resolve differently inside the VPC (private zone) and on the internet (public zone).
- **Route 53 Resolver** endpoints connect DNS between VPCs and on-premises networks.

### Level 4 — Safe changes and TTLs

- **Lower the TTL before a migration**: if a record has a one-day TTL, lower it to 60 seconds a day (one old TTL) **before** the change, so caches expire quickly when you switch; raise it again afterwards.
- **Records in code** ({{ch:terraform}}), reviewed like other infrastructure — a deleted record is an outage.
- **Use weighted records** to move traffic gradually between old and new environments, watching metrics at each step.

### Level 4 — Protecting your domains

- **Dangling records** cause **subdomain takeover**: if `promo.cornershop.example` still points (CNAME) at a deleted S3 website bucket, CloudFront distribution or third-party service, an attacker may create that resource name and serve content on your domain. Remove records when you remove resources; scan for dangling records.
- **Registrar security**: transfer lock, auto-renewal (an expired domain is a total outage and a takeover risk), strong account security on the registrar.
- **DNSSEC signing** protects against forged answers where your resolvers validate it; **CAA records** restrict which certificate authorities may issue for your domain.
- Restrict who may change hosted zones with IAM; record changes appear in CloudTrail.

## From beginner to enterprise

**Level 1–2 — first domains.** Hosted zones and delegation; A, CNAME, MX and TXT records; alias records for load balancers and CloudFront; certificate validation records.

**Level 3 — routing.** Weighted migrations; health checks on meaningful endpoints; failover and latency policies; private hosted zones for internal names.

**Level 4 — production DNS.** Records as code; TTL planning; tested failover; DNSSEC and CAA; registrar protection; dangling-record clean-up.

**Level 5 — senior practice.** Designing multi-region routing with nested policies; understanding resolver caching effects on migrations; DNS as part of disaster recovery plans.

**Level 6 — enterprises.** Central DNS accounts, Resolver rules shared across accounts, hybrid DNS with on-premises networks, and domain portfolio management.

## Real-world use cases

### Moving to a new platform

- **Practice**: the team lowered `api.cornershop.example`'s TTL to 60 seconds, created weighted records (old 95, new 5), watched errors and latency, moved to 50/50 and then 0/100 over two days, and kept the old environment for a quick rollback for a week.

### The forgotten campaign site

- **What happened**: a marketing subdomain pointed at a deleted S3 website bucket. Someone created a bucket with the same name and served a phishing page on the company's domain.
- **Fix**: record removed; automated scanning for records pointing at non-existent resources; resource deletion in code now deletes the matching records.

## Common mistakes

### Beginner: registrar not pointing to Route 53's name servers

**Consequence:** records have no effect. **Fix:** check the NS delegation.

### Beginner: A records with load balancer IPs

**Consequence:** outages when the addresses change. **Fix:** alias records.

### Intermediate: long TTLs during migrations

**Consequence:** slow, unpredictable switches and rollbacks. **Fix:** lower TTLs in advance.

### Intermediate: health checks on trivial endpoints

**Consequence:** failover never triggers, or triggers on noise. **Fix:** meaningful health endpoints.

### Intermediate: expecting exact traffic splits from weighted DNS

**Fix:** load balancer weights for precise canaries.

### Production: untested failover regions

**Consequence:** failing over to a broken standby. **Fix:** regular failover tests.

### Production: dangling records and expired domains

**Fix:** clean-up with resources; auto-renew and transfer lock.

## Debugging and troubleshooting

- **Check what the authoritative servers answer**: `dig @ns-123.awsdns-45.com api.cornershop.example` — this bypasses caches.
- **Check what users get**: `dig api.cornershop.example` through public resolvers; look at the TTL counting down.
- **Check delegation**: `dig NS cornershop.example` should list the Route 53 name servers.
- **Private zone not resolving**: the VPC must be associated with the zone, and VPC DNS settings enabled.
- **Health check unhealthy**: look at the check's last failure reason from each region; security groups often block the checkers.
- **Certificate stuck "pending validation"**: the validation CNAME is missing or in the wrong zone.

## Security summary

- **IAM-restricted** changes to hosted zones; changes audited in CloudTrail; records managed as code.
- **No dangling records**; remove DNS together with the resources it points to.
- **Registrar lock and auto-renewal**; strong registrar account security.
- **CAA records** and **DNSSEC** where appropriate.
- **Private hosted zones** for internal names, so internal structure is not published.

## How a senior engineer thinks about this

- **DNS is a dependency of everything.** Treat changes with the same care as deployments.
- **Caches are part of the system.** TTLs decide how fast you can change your mind.
- **Alias, don't hard-code.** Let AWS keep addresses current.
- **Failover is only real when tested.**
- **Clean up names.** A forgotten record can become someone else's website.

## Exercises

### Exercise 1 — Create the records

**Objective:** practise record types.
**What to do:** list the records for: the website at the apex on CloudFront; the API on an ALB; email sent through Amazon SES and received by Google Workspace; ACM certificate validation for `api`.

<details>
<summary>Show the solution</summary>

- `cornershop.example` — `A` (and `AAAA`) **alias** to the CloudFront distribution.
- `api.cornershop.example` — `A` alias to the ALB.
- `cornershop.example` — `MX` records for Google Workspace.
- `cornershop.example` — `TXT` SPF including both Google and SES; DKIM `CNAME` or `TXT` records for both; `_dmarc` `TXT` ({{ch:email}}).
- The ACM validation `CNAME` for `api.cornershop.example`, kept permanently for automatic renewal.

</details>

### Exercise 2 — Plan the migration

**Objective:** practise safe DNS changes.
**What to do:** `api.cornershop.example` has a TTL of 86,400 seconds and points to an old load balancer. You must move it to a new platform with the ability to roll back quickly. Plan the steps.

<details>
<summary>Show the solution</summary>

1. At least a day before: lower the TTL to 60 seconds.
2. Create weighted records: old with weight 100, new with weight 0, both as aliases with target health evaluation.
3. Shift gradually (5 → 25 → 50 → 100) while watching error rates and latency on both.
4. Roll back by setting the new record's weight to 0 — effective within about a minute.
5. After a stable period, remove the old record and environment, and raise the TTL again (for example to 300 seconds).

</details>

### Exercise 3 — Production scenario: failover that did not fail over

**Objective:** practise failover analysis.
**The scenario:** the primary region had a 40-minute outage. Route 53 failover records existed with a secondary region, but most users saw errors for 30 minutes, and when traffic did arrive in the secondary region, it failed because the database replica was not promoted. What went wrong and how do you fix it?

<details>
<summary>Show the solution</summary>

**Likely causes:** the health check targeted an endpoint that stayed "up" (a static page or the load balancer itself) while the application failed; a long TTL kept users on the primary; the secondary depended on a manual database promotion that nobody had practised.

**Fixes:**
- Health checks on a meaningful `/health` endpoint, or on a CloudWatch alarm for error rates.
- TTLs of about 60 seconds on failover records.
- An automated (or rehearsed) runbook for promoting the cross-region replica, or Aurora Global Database with managed failover.
- Regular failover exercises, measuring the real time to recover.

</details>

## Summary

**Route 53** provides domain registration, authoritative DNS and health checks. A **hosted zone** holds a domain's records, and the registrar must delegate to its **name servers**. Records include `A`, `AAAA`, `CNAME`, `MX`, `TXT` and `CAA`; **alias records** point names — even the zone apex — at AWS resources such as load balancers and CloudFront and follow their changing addresses.

**Routing policies** choose among records: **weighted** for gradual migrations (shares of DNS answers, not of requests), **failover** for active-passive recovery, **latency** and **geolocation** for multi-region applications, and nested combinations. **Health checks** remove unhealthy endpoints from answers; they must test something meaningful, and DNS failover takes detection time plus TTL, to a secondary that must be tested. **Private hosted zones** give internal names inside VPCs.

Plan changes around **TTLs** — lower them before migrations — and manage records as code. Protect domains against **subdomain takeover** from dangling records, keep registrations locked and auto-renewed, and use CAA records and DNSSEC where appropriate.

## Key terms

- **Route 53** — AWS's DNS, domain registration and health-checking service.
- **Hosted zone** — The set of DNS records for a domain in Route 53.
- **Private hosted zone** — A hosted zone visible only inside associated VPCs.
- **Delegation** — The registrar pointing a domain to its authoritative name servers.
- **Name server** — A server that answers authoritatively for a zone.
- **Alias record** — A Route 53 record that points directly to an AWS resource.
- **Zone apex** — The bare domain name without a subdomain.
- **TTL** — The time resolvers may cache a DNS answer.
- **Routing policy** — The rule Route 53 uses to choose among records.
- **Weighted routing** — Choosing records in proportion to assigned weights.
- **Failover routing** — Answering with a secondary record when the primary is unhealthy.
- **Latency routing** — Answering with the region that has the lowest latency for the user.
- **Geolocation routing** — Answering based on the user's location.
- **Health check** — Route 53's regular checking of an endpoint's health.
- **Subdomain takeover** — An attacker claiming a resource that a dangling DNS record still points to.
- **CAA record** — A record listing which certificate authorities may issue certificates for a domain.
- **DNSSEC** — Cryptographic signing of DNS records to prevent forged answers.

## What comes next

DNS sends users to your application; the next step is making it fast for users everywhere. The next chapter, {{ch:cloudfront}}, covers CloudFront, AWS's content delivery network: edge caching, cache keys and behaviours, serving private S3 content, cache invalidation, and security at the edge.
