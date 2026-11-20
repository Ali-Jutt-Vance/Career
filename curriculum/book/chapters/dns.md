# DNS

> [!GOALS]
> - Explain what DNS does and how a name is resolved: stub resolvers, recursive resolvers, root, TLD and authoritative servers.
> - Use the common record types correctly: **A**, **AAAA**, **CNAME**, **ALIAS**, **MX**, **TXT**, **NS**, **CAA** and **SRV**.
> - Understand **caching and TTLs**, and why DNS changes "take time to propagate".
> - Plan DNS changes for deployments and migrations safely.
> - Use DNS for email authentication, certificate validation, load balancing and failover.
> - Diagnose DNS problems with `dig` and friends, and protect domains from takeover and hijacking.

## Why this matters

Every request your users make starts with DNS. Before a browser can connect to `cornershop.example`, something must turn that name into an IP address. When DNS is wrong, nothing else matters: the site is "down" for everyone, email bounces, certificates fail to renew, and microservices cannot find each other.

DNS is also involved in many tasks you will perform as a back-end engineer: pointing a domain at a load balancer or CDN ({{ch:cloudfront}}), verifying domain ownership for email providers and certificate authorities, setting up SPF, DKIM and DMARC records ({{ch:email}}), moving a site to a new host with minimal downtime, and service discovery inside private networks.

DNS is old, simple in principle, and full of details that cause real outages: a TTL of one day that turns a five-minute rollback into a day-long incident, a CNAME on the bare domain that the standard forbids, a dangling record that lets an attacker take over a subdomain. This chapter explains how DNS works and how to change it safely.

## The simple idea

DNS is the internet's phone book — but distributed. No single book lists every name. Instead, there is a chain of directories: the top-level directory knows who handles `.com`, `.org` and `.example`; the `.example` directory knows who handles `cornershop.example`; and the `cornershop.example` directory knows the actual numbers. Your computer asks a helper (a resolver) who walks this chain on your behalf and remembers answers for a while, so the next lookup is instant.

> [!ANALOGY]
> DNS is like a chain of phone directories: a top-level directory points to the directory for `.example`, which points to the directory for `cornershop.example`, which has the actual numbers. A helper walks the chain for you and remembers the answers for a while.
>
> **Where the analogy breaks:** an old phone book stays the same until next year's edition. DNS answers are cached by helpers all over the world for whatever time each record specifies — so when you change a number, some callers keep dialling the old one until their cached copy expires, and you cannot recall those copies. Planning changes means planning around caches you do not control.

## The proper definition and key words

The **Domain Name System (DNS)** is a hierarchical, distributed database that maps domain names to records — most often IP addresses — answered by authoritative servers and cached by resolvers.

Key words:

- **Domain name** — a hierarchical name such as `api.cornershop.example.` (the final dot is the **root**).
- **Zone** — the part of the namespace managed by one administrator, stored on its **authoritative** name servers.
- **Authoritative name server** — a server that holds the official records for a zone.
- **Recursive resolver** — a server that answers clients' queries by asking authoritative servers and caching results (your ISP's, `1.1.1.1`, `8.8.8.8`, or the cloud network's resolver).
- **Stub resolver** — the small resolver library in the operating system that asks a recursive resolver.
- **Record** — an entry in a zone: a name, a type, a value and a **TTL**.
- **TTL** (time to live) — how many seconds resolvers may cache a record.
- **Registrar** — the company where a domain is registered, which sets the domain's name servers in the parent zone.
- **Delegation** — a parent zone pointing to the name servers of a child zone with **NS** records.
- **Apex** (root domain, naked domain) — the zone's own name, such as `cornershop.example`.

## How resolution works

### Level 2 — Walking the hierarchy

```text
  browser / app
       │ "cornershop.example?"
       ▼
  stub resolver (OS) ──▶ recursive resolver (cache!)
                              │ 1. root servers: "ask the .example servers"
                              │ 2. .example TLD servers: "ask ns1.cornershop-dns"
                              │ 3. ns1.cornershop-dns (authoritative): "203.0.113.10, TTL 300"
                              ▼
                         answer cached for 300 s, returned to the app
```

This miniature implementation follows the same steps — asking the root, following the delegation to the TLD, then to the authoritative server — and caches answers according to their TTLs:

```ts
// A miniature DNS: root → .example → cornershop.example, with a caching resolver
type Rec = { type: "NS" | "A" | "CNAME"; value: string; ttl: number };
const servers: Record<string, Record<string, Rec[]>> = {
  "root":               { "example.": [{ type: "NS", value: "tld-server", ttl: 172800 }] },
  "tld-server":         { "cornershop.example.": [{ type: "NS", value: "ns1.cornershop-dns", ttl: 86400 }] },
  "ns1.cornershop-dns": {
    "cornershop.example.":     [{ type: "A", value: "203.0.113.10", ttl: 300 }],
    "www.cornershop.example.": [{ type: "CNAME", value: "cornershop.example.", ttl: 3600 }],
  },
};

let clock = 0;
const cache = new Map<string, { recs: Rec[]; expires: number }>();
const log: string[] = [];

function ask(server: string, name: string): Rec[] {
  log.push(`ask ${server} for ${name}`);
  const zone = servers[server]!;
  const exact = zone[name];
  if (exact) return exact;
  const delegation = Object.keys(zone).find((suffix) => name.endsWith(suffix));      // "I don't know, ask them"
  return delegation ? zone[delegation]! : [];
}

function resolve(name: string): string {
  const cached = cache.get(name);
  if (cached && cached.expires > clock) {
    log.push(`cache hit ${name}`);
    return follow(cached.recs);
  }
  let server = "root";
  for (;;) {
    const recs = ask(server, name);
    if (recs[0]?.type === "NS") { server = recs[0].value; continue; }               // follow the delegation
    cache.set(name, { recs, expires: clock + Math.min(...recs.map((r) => r.ttl)) * 1000 });
    return follow(recs);
  }
}
const follow = (recs: Rec[]): string => (recs[0]!.type === "CNAME" ? resolve(recs[0]!.value) : recs[0]!.value);

console.log("www →", resolve("www.cornershop.example."));
console.log(log.splice(0).join("\n"));
clock += 60_000;                                   // a minute later: everything is cached
console.log("www →", resolve("www.cornershop.example."));
console.log(log.splice(0).join("\n"));
clock += 300_000;                                  // the A record's 300 s TTL has expired; the CNAME's 3600 s has not
console.log("www →", resolve("www.cornershop.example."));
console.log(log.splice(0).join("\n"));
```

**Output:**

```text
www → 203.0.113.10
ask root for www.cornershop.example.
ask tld-server for www.cornershop.example.
ask ns1.cornershop-dns for www.cornershop.example.
ask root for cornershop.example.
ask tld-server for cornershop.example.
ask ns1.cornershop-dns for cornershop.example.
www → 203.0.113.10
cache hit www.cornershop.example.
cache hit cornershop.example.
www → 203.0.113.10
cache hit www.cornershop.example.
ask root for cornershop.example.
ask tld-server for cornershop.example.
ask ns1.cornershop-dns for cornershop.example.
```

- The **first** lookup walks the hierarchy. `www` is a **CNAME** (an alias) for `cornershop.example`, so the resolver must then resolve that name too — two chains of questions.
- A minute later, **both answers are cached**: no servers are contacted.
- After six minutes, the CNAME (TTL 3600 s) is still cached but the A record (TTL 300 s) has expired, so only it is looked up again.
- Real resolvers also cache the **delegations** (the NS records), so they would skip straight to the authoritative server; this miniature caches only final answers to keep it short.

Caching happens at many levels — the browser, the operating system, the recursive resolver, sometimes the application runtime — which is why DNS is fast and why changes are slow to reach everyone.

## Record types

### Level 2 — The records you will use

| Type | Maps a name to | Example | Notes |
|---|---|---|---|
| **A** | An IPv4 address | `cornershop.example. 300 A 203.0.113.10` | Several A records give simple round-robin |
| **AAAA** | An IPv6 address | `cornershop.example. 300 AAAA 2001:db8::10` | Publish alongside A when you support IPv6 |
| **CNAME** | Another name (an alias) | `www 3600 CNAME cornershop.example.` | Not allowed at the apex; cannot coexist with other records for the same name |
| **ALIAS / ANAME** (provider feature) | Another name, resolved by the provider into A/AAAA | `cornershop.example. ALIAS lb-123.elb.example.` | How apex domains point at load balancers and CDNs (Route 53 "alias", Cloudflare "CNAME flattening") |
| **MX** | Mail servers, with priority | `cornershop.example. MX 10 inbound-smtp.provider.example.` | Where email **to** your domain is delivered |
| **TXT** | Arbitrary text | `"v=spf1 include:amazonses.com -all"` | SPF, DKIM, DMARC, domain verification ({{ch:email}}) |
| **NS** | The zone's name servers | `cornershop.example. NS ns-123.awsdns.example.` | Delegation; set at the registrar |
| **CAA** | Which certificate authorities may issue certificates | `cornershop.example. CAA 0 issue "letsencrypt.org"` | Limits mis-issuance ({{ch:tls-ssl}}) |
| **SRV** | A service's host and port | `_sip._tcp.example. SRV 10 5 5060 sip.example.` | Used by some protocols and service discovery |
| **PTR** | An IP back to a name (reverse DNS) | `10.113.0.203.in-addr.arpa. PTR mail.cornershop.example.` | Important for mail servers |

### Level 3 — Checking a change before it ships

Several of these rules are easy to break. A simple check over a planned set of records catches the classic mistakes — the kind of validation good DNS tooling performs, and that infrastructure-as-code pipelines can run before applying changes ({{ch:terraform}}):

```ts
// Checking a planned DNS change before applying it
type Record = { name: string; type: string; value: string; ttl: number };

function problems(records: Record[]): string[] {
  const out: string[] = [];
  const byName = new Map<string, Record[]>();
  for (const r of records) byName.set(r.name, [...(byName.get(r.name) ?? []), r]);
  for (const [name, recs] of byName) {
    if (recs.some((r) => r.type === "CNAME") && recs.length > 1) out.push(`${name}: a CNAME cannot coexist with other records`);
    if (recs.filter((r) => r.type === "TXT" && r.value.startsWith("v=spf1")).length > 1) out.push(`${name}: more than one SPF record`);
  }
  for (const r of records) {
    if (r.type === "A" && !/^(\d{1,3}\.){3}\d{1,3}$/.test(r.value)) out.push(`${r.name}: "${r.value}" is not an IPv4 address`);
    if (r.type === "CNAME" && r.name === "cornershop.example.") out.push(`${r.name}: CNAME at the zone apex is not allowed (use an ALIAS/flattened record)`);
    if (r.ttl > 3600 && ["A", "AAAA", "CNAME"].includes(r.type)) out.push(`${r.name}: TTL ${r.ttl}s makes changes slow to roll back`);
  }
  return out;
}

const plan: Record[] = [
  { name: "cornershop.example.", type: "CNAME", value: "lb-123.eu-west-1.elb.example.", ttl: 300 },
  { name: "api.cornershop.example.", type: "A", value: "203.0.113.25", ttl: 86400 },
  { name: "shop.cornershop.example.", type: "CNAME", value: "cornershop.example.", ttl: 300 },
  { name: "shop.cornershop.example.", type: "TXT", value: "verification=abc", ttl: 300 },
  { name: "cornershop.example.", type: "TXT", value: "v=spf1 include:amazonses.com -all", ttl: 3600 },
  { name: "cornershop.example.", type: "TXT", value: "v=spf1 include:_spf.google.com -all", ttl: 3600 },
];
problems(plan).forEach((p) => console.log("✗", p));
```

**Output:**

```text
✗ cornershop.example.: a CNAME cannot coexist with other records
✗ cornershop.example.: more than one SPF record
✗ shop.cornershop.example.: a CNAME cannot coexist with other records
✗ cornershop.example.: CNAME at the zone apex is not allowed (use an ALIAS/flattened record)
✗ api.cornershop.example.: TTL 86400s makes changes slow to roll back
```

- **A CNAME means "this name is entirely another name"**, so it cannot sit alongside any other record for the same name. That is also why the **apex** cannot be a CNAME: the apex must have NS and SOA records. To point the bare domain at a load balancer or CDN, use your provider's **ALIAS** feature.
- **Only one SPF record** per name is allowed; merge the includes into one: `v=spf1 include:amazonses.com include:_spf.google.com -all`.
- **A one-day TTL** on an address record means that if the new server is broken, some users keep reaching it for up to a day after you switch back.

## TTLs and changes

### Level 3 — Planning a DNS change

Because resolvers cache answers for the TTL, a change takes up to the **old** record's TTL to reach everyone. ("Propagation" is mostly caches expiring.) A safe migration of `api.cornershop.example` to a new server:

1. **Lower the TTL** of the record (for example, from 3600 to 60 seconds) — at least one **old TTL** before the change, so caches hold the short TTL by switching time.
2. **Prepare the new target** and test it directly (`curl --resolve api.cornershop.example:443:<new-ip> https://api.cornershop.example/health`).
3. **Switch the record.** Within about a minute, most clients use the new server.
4. **Keep the old server running** for a while: some clients and resolvers ignore TTLs, and long-lived connections stay open.
5. **Raise the TTL** again once stable (5 minutes to an hour for most records).

Other caching to remember: **negative caching** (a resolver remembers that a name does **not** exist, for a time set by the zone's SOA record — so creating a record right after someone looked it up may take minutes to appear), application runtimes that cache DNS indefinitely by default (older JVM settings, some connection pools), and long-lived database or HTTP connections that never re-resolve.

### Level 3 — DNS in deployments and operations

- **Pointing at cloud services**: load balancers and CDNs give you a **name**, not a fixed IP (their IPs change). Use CNAME for subdomains and ALIAS at the apex — never copy their current IPs into A records.
- **Weighted and failover routing**: managed DNS (Route 53, Cloudflare, Azure DNS, Google Cloud DNS) can return different answers by weight (gradual migrations, canaries), by health check (failover to a standby region), by latency or by location ({{ch:route53}}). DNS-based failover is limited by TTLs and client caching, so it is a coarse tool — minutes, not milliseconds.
- **Private DNS**: inside a cloud network or a Kubernetes cluster, internal names (`orders.internal`, `db.prod.svc.cluster.local`) resolve to private addresses; services find each other by name rather than by changing IPs ({{ch:microservices}}).
- **Verification records**: email providers, certificate authorities (DNS-01 challenges for wildcard certificates, {{ch:tls-ssl}}) and SaaS tools prove you control a domain by asking you to publish a TXT record.

## Diagnosing DNS

### Level 3 — `dig` and friends

```bash
# fragment
dig cornershop.example                     # full answer: records, TTLs, which server answered
dig +short cornershop.example A            # just the addresses
dig +short www.cornershop.example          # follows CNAMEs: shows the chain
dig cornershop.example MX                  # mail servers
dig cornershop.example TXT                 # SPF, verification records
dig @1.1.1.1 cornershop.example            # ask a specific resolver
dig @ns-123.awsdns.example cornershop.example   # ask the authoritative server directly (bypasses caches)
dig +trace cornershop.example              # walk the hierarchy from the root, like a resolver
dig -x 203.0.113.10                        # reverse lookup (PTR)
getent hosts cornershop.example            # what this machine's programs will actually get (includes /etc/hosts)
```

Typical problems:

- **"NXDOMAIN"** — the name does not exist: a typo, a missing record, or the domain's NS records at the registrar point to the wrong provider.
- **"SERVFAIL"** — the resolver could not get an answer: broken delegation, DNSSEC validation failure, unreachable authoritative servers.
- **Different answers from different places** — caches holding old values (compare the authoritative answer with public resolvers), or geo/latency routing by design.
- **Works with `dig` but not in the app** — the machine's `/etc/hosts`, a different resolver inside containers, or the application caching an old address.

## From beginner to enterprise

**Level 1–2 — basics.** What DNS does; A, AAAA, CNAME and MX records; pointing a domain at a server; registrars versus DNS hosting.

**Level 3 — operating domains.** TTL planning for changes; ALIAS at the apex; TXT records for SPF, DKIM, DMARC and verification; CAA records; diagnosing with `dig`.

**Level 4 — production DNS.** DNS managed as code with reviews ({{ch:terraform}}); weighted and failover routing; private DNS for internal services; monitoring of record correctness and certificate validation; application DNS caching under control.

**Level 5 — senior practice.** Multi-provider DNS for resilience; DNSSEC where required; global traffic management; DNS in disaster-recovery plans.

**Level 6 — enterprises.** Large portfolios of domains with centralised governance, registrar locks, monitoring for typosquatting and takeover risks, and split-horizon DNS across hybrid networks.

## Real-world use cases

### Moving the shop to a new load balancer

- **Plan**: lower the TTL of `cornershop.example` (ALIAS) and `www` (CNAME) to 60 s a day ahead; deploy and test the new load balancer with `curl --resolve`; switch the records; watch traffic move in the new load balancer's metrics; keep the old one running for a day; restore TTLs to 300–3600 s.

### Setting up email for a new domain

- **Records**: MX records for the mail provider; one SPF TXT record including all sending services; DKIM CNAMEs or TXT records from each provider; a DMARC TXT record at `_dmarc` starting with `p=none` ({{ch:email}}); a PTR for any self-run mail server.

## Common mistakes

### Beginner: copying a load balancer's IP into an A record

**Consequence:** breaks when the provider changes IPs. **Fix:** CNAME or ALIAS to the provider's name.

### Beginner: CNAME at the apex, or CNAME beside other records

**Fix:** ALIAS/flattening at the apex; separate names for other records.

### Intermediate: long TTLs before a migration

**Consequence:** slow switching and slower rollback. **Fix:** lower TTLs at least one old-TTL in advance.

### Intermediate: multiple SPF records

**Fix:** merge into one.

### Intermediate: forgetting negative caching

**Fix:** create records before announcing names; expect a delay if someone queried the name first.

### Production: dangling DNS records

A CNAME pointing to a deleted cloud resource (a storage bucket, an app service). **Consequence:** an attacker creates a resource with that name and takes over your subdomain. **Fix:** remove records when resources are deleted; audit regularly.

### Production: DNS changes by hand in a web console

**Fix:** DNS as code, reviewed and versioned.

## Debugging and troubleshooting

- Compare **authoritative** (`dig @ns… name`) and **cached** (`dig @1.1.1.1 name`) answers to tell "wrong record" from "old cache".
- Use `dig +trace` to find where a broken delegation stops.
- Check the domain's **name servers at the registrar** match the DNS provider hosting the zone.
- Inside containers and Kubernetes, check `/etc/resolv.conf` and search domains; internal names may need fully qualified names.
- For certificate validation failures, check CAA records and the DNS-01 TXT record's exact name and value.

## Security summary

- **Lock the registrar account**: strong authentication, registrar lock, limited access — taking over the registrar account means taking over the domain.
- **Remove dangling records** to prevent subdomain takeover.
- **CAA records** restrict which certificate authorities may issue certificates.
- **Email authentication** (SPF, DKIM, DMARC) through DNS prevents spoofing of your domain ({{ch:email}}).
- **DNSSEC** signs zones so resolvers can detect forged answers; useful for high-value domains, with operational care.
- Treat DNS changes like code changes: reviewed, audited and reversible.

## How a senior engineer thinks about this

- **DNS is the first dependency of everything.** Changes are planned, reviewed and reversible.
- **Caches you do not control decide your timeline.** TTLs are lowered before changes and raised after.
- **Point at names, not IPs, for managed services.** ALIAS and CNAME follow the provider's changes.
- **Every record is an attack surface.** Dangling records, registrar access and CAA are part of security.
- **DNS failover is coarse.** Fast failover belongs in load balancers and health checks; DNS handles the slower, larger moves.

## Exercises

### Exercise 1 — Write the records

**Objective:** practise record types.
**What to do:** write DNS records for: the apex domain pointing to a load balancer `lb-7.example-cloud.net`; `www` as an alias of the apex; `api` pointing to `203.0.113.25` (with IPv6 `2001:db8::25`); mail handled by a provider with servers `mx1.mail.example` (priority 10) and `mx2.mail.example` (priority 20); SPF allowing that provider and Amazon SES; only Let's Encrypt may issue certificates.

<details>
<summary>Show the solution</summary>

```text
cornershop.example.      300   ALIAS  lb-7.example-cloud.net.      ; provider-specific (Route 53 alias / CNAME flattening)
www.cornershop.example.  300   CNAME  cornershop.example.
api.cornershop.example.  300   A      203.0.113.25
api.cornershop.example.  300   AAAA   2001:db8::25
cornershop.example.      3600  MX     10 mx1.mail.example.
cornershop.example.      3600  MX     20 mx2.mail.example.
cornershop.example.      3600  TXT    "v=spf1 include:mail.example include:amazonses.com -all"
cornershop.example.      3600  CAA    0 issue "letsencrypt.org"
```

Lower MX priority values are tried first. One SPF record includes both senders. A CAA record limits issuance; add `0 iodef "mailto:security@cornershop.example"` to receive reports of refused requests.

</details>

### Exercise 2 — Plan the migration timeline

**Objective:** practise TTL reasoning.
**What to do:** `api.cornershop.example` has an A record with TTL 86400 (one day). You must move the API to a new server on Friday at 10:00 with the ability to roll back within minutes. What do you do, and when?

<details>
<summary>Show the solution</summary>

1. **By Thursday 10:00 at the latest** (one old TTL before the switch), change the TTL to 60 seconds. Caches that fetched the record before the change may hold the one-day TTL until Thursday 10:00; after that, everyone has the 60-second version.
2. **Friday before 10:00**: test the new server directly with `curl --resolve`.
3. **Friday 10:00**: change the A record to the new IP (or better, switch to a CNAME/ALIAS to a load balancer, so future moves need no DNS change).
4. **Rollback**: change the record back — effective for most clients within about a minute.
5. **Afterwards**: keep the old server running for at least a day; raise the TTL to 300–3600 seconds once stable.

Starting the TTL reduction on Friday morning would be too late: some caches would hold the old address for up to a day.

</details>

### Exercise 3 — Production scenario: the hijacked subdomain

**Objective:** practise DNS security.
**The scenario:** a security researcher reports that `promo.cornershop.example` shows a page selling counterfeit goods. The record is a CNAME to `cornershop-promo.storage.example-cloud.net`, a storage bucket website the marketing team deleted last year. Explain what happened and what to do.

<details>
<summary>Show the solution</summary>

**What happened:** a **dangling CNAME**. When marketing deleted the bucket, the DNS record still pointed at its name. Bucket names are global, so an attacker created a bucket with the same name and now serves content under your domain — trusted by users and browsers, possibly able to set cookies for parent domains depending on configuration.

**Now:**
1. Delete the CNAME (or point it to a page you control).
2. Check whether the attacker's page could have read or set cookies for `cornershop.example` (cookie scope) and assess impact; invalidate sessions if needed.
3. Search all zones for other records pointing to resources that no longer exist.

**Prevent:**
- Manage DNS as code alongside the resources it points to, so deleting a resource removes its record ({{ch:terraform}}).
- Run automated scans for dangling records.
- Restrict cookie scope and use separate domains for user-generated or marketing content ({{ch:file-uploads}}).

</details>

## Summary

The **Domain Name System** maps names to records through a hierarchy: **recursive resolvers** answer clients by asking the **root**, then **TLD** servers, then the zone's **authoritative** servers, following **NS delegations** set at the **registrar**, and **caching** every answer for its **TTL**. Caching makes DNS fast and makes changes take up to the old TTL to reach everyone — plus **negative caching** of names that did not exist.

The common records are **A** and **AAAA** (addresses), **CNAME** (aliases — not at the apex and not beside other records), provider **ALIAS** records for apex domains, **MX** (mail), **TXT** (SPF, DKIM, DMARC, verification — one SPF per name), **NS**, **CAA** (allowed certificate authorities), **SRV** and **PTR**. Point domains at managed services by name, never by copied IPs.

Change DNS safely by lowering TTLs at least one old TTL in advance, testing the new target directly, switching, keeping the old target running and raising TTLs afterwards. Managed DNS adds weighted, latency, geo and failover routing — coarse tools bounded by caching — and private DNS supports service discovery. Diagnose with `dig` (including `+short`, `+trace`, `@server`) and `getent`, distinguishing NXDOMAIN, SERVFAIL and stale caches. Protect domains with registrar locks, CAA, email authentication, DNSSEC where needed, and by removing **dangling records** that enable subdomain takeover.

## Key terms

- **DNS** — The hierarchical, distributed system mapping domain names to records such as IP addresses.
- **Domain name** — A hierarchical name such as `api.cornershop.example.`.
- **Zone** — A portion of the DNS namespace managed as a unit.
- **Apex domain** — The zone's own name, without a subdomain.
- **Authoritative name server** — A server holding the official records for a zone.
- **Recursive resolver** — A server that resolves names for clients and caches answers.
- **Stub resolver** — The operating system component that sends queries to a recursive resolver.
- **Root servers** — The top of the DNS hierarchy, pointing to top-level domain servers.
- **TLD (top-level domain)** — The last label of a domain, such as `.com` or `.example`.
- **Registrar** — A company through which domains are registered and their name servers set.
- **Delegation** — A parent zone pointing to a child zone's name servers with NS records.
- **TTL (DNS)** — The time a resolver may cache a record.
- **Negative caching** — Caching the fact that a name does not exist.
- **A / AAAA record** — Records mapping a name to an IPv4 or IPv6 address.
- **CNAME record** — A record making one name an alias of another.
- **ALIAS record** — A provider feature resolving an apex name to another name's addresses.
- **MX record** — A record naming mail servers for a domain, with priorities.
- **TXT record** — A record holding text, used for SPF, DKIM, DMARC and verification.
- **NS record** — A record listing a zone's name servers.
- **CAA record** — A record listing certificate authorities allowed to issue certificates for a domain.
- **SRV record** — A record giving a service's host and port.
- **PTR record** — A reverse DNS record mapping an IP address to a name.
- **NXDOMAIN** — The DNS response meaning a name does not exist.
- **SERVFAIL** — The DNS response meaning the resolver could not obtain an answer.
- **dig** — A command-line tool for querying DNS.
- **Weighted / failover routing** — DNS answers chosen by weight or by health checks.
- **Dangling DNS record** — A record pointing to a resource that no longer exists, risking takeover.
- **Subdomain takeover** — An attacker claiming the resource a dangling record points to.
- **DNSSEC** — Extensions that sign DNS data so resolvers can verify it.

## What comes next

Once a name resolves and a connection opens, it must be secure. The next chapter, {{ch:tls-ssl}}, explains TLS: how encryption and certificates protect traffic, the handshake, certificate authorities and chains of trust, getting and renewing certificates automatically, configuring HTTPS correctly, and mutual TLS between services.
