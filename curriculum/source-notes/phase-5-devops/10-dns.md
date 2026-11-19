# Phase 5 — Chapter 10: DNS

---

## Chapter Overview

DNS (Domain Name System) is the internet's phonebook — translating human-readable domain names into IP addresses. Every application engineer needs to understand DNS for: configuring domains, troubleshooting connectivity, managing subdomains, configuring email records, and understanding propagation.

**Topics:**
- DNS hierarchy and resolution flow
- Record types (A, AAAA, CNAME, MX, TXT, NS, SOA, SRV, CAA)
- TTL and propagation
- Route 53 features (health checks, routing policies, private hosted zones)
- DNS for email (SPF, DKIM, DMARC)
- DNS security (DNSSEC)

---

## Basic Examples

### Common DNS Records

```bash
# Query records with dig
dig myapp.com A           # IPv4 address
dig myapp.com AAAA        # IPv6 address
dig myapp.com NS          # nameservers
dig myapp.com MX          # mail exchangers
dig myapp.com TXT         # text records (SPF, DKIM, verification)
dig myapp.com CNAME       # canonical name (alias)
dig myapp.com CAA         # certificate authority authorization
dig myapp.com SOA         # start of authority
dig myapp.com ANY         # all records (often blocked)

# Query specific nameserver
dig @ns1.route53.amazonaws.com myapp.com A

# Check if change has propagated globally
dig @8.8.8.8 myapp.com A   # Google DNS
dig @1.1.1.1 myapp.com A   # Cloudflare DNS
dig @9.9.9.9 myapp.com A   # Quad9 DNS

# Trace full DNS resolution path
dig +trace myapp.com A

# Check TTL remaining
dig myapp.com A +nocmd +noall +answer
# myapp.com.  299  IN  A  54.23.45.67
#             ^^^
#             TTL in seconds (299s = about 5 min remaining)
```

### Route 53 with Terraform

```hcl
# Hosted Zone (must match your registered domain)
resource "aws_route53_zone" "main" {
  name = "myapp.com"

  tags = { Environment = "production" }
}

# A record — apex domain → ALB (Alias, no TTL charge)
resource "aws_route53_record" "apex" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "myapp.com"
  type    = "A"

  alias {
    name                   = aws_lb.main.dns_name
    zone_id                = aws_lb.main.zone_id
    evaluate_target_health = true  # use ALB health checks for routing
  }
}

# www → apex (redirect or alias)
resource "aws_route53_record" "www" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "www.myapp.com"
  type    = "CNAME"
  ttl     = 300
  records = ["myapp.com"]
}

# API subdomain → different ALB
resource "aws_route53_record" "api" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "api.myapp.com"
  type    = "A"

  alias {
    name                   = aws_lb.api.dns_name
    zone_id                = aws_lb.api.zone_id
    evaluate_target_health = true
  }
}

# MX records for email (e.g., Google Workspace)
resource "aws_route53_record" "mx" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "myapp.com"
  type    = "MX"
  ttl     = 3600
  records = [
    "1 aspmx.l.google.com.",
    "5 alt1.aspmx.l.google.com.",
    "5 alt2.aspmx.l.google.com.",
  ]
}

# TXT record for SPF (email authentication)
resource "aws_route53_record" "spf" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "myapp.com"
  type    = "TXT"
  ttl     = 3600
  records = ["v=spf1 include:_spf.google.com include:sendgrid.net ~all"]
}

# DKIM for SendGrid
resource "aws_route53_record" "dkim_sendgrid" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "s1._domainkey.myapp.com"
  type    = "CNAME"
  ttl     = 3600
  records = ["s1.domainkey.u12345.wl012.sendgrid.net"]
}

# DMARC policy
resource "aws_route53_record" "dmarc" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "_dmarc.myapp.com"
  type    = "TXT"
  ttl     = 3600
  records = ["v=DMARC1; p=quarantine; rua=mailto:dmarc@myapp.com; pct=100"]
}

# CAA — only Let's Encrypt and Amazon can issue SSL certificates
resource "aws_route53_record" "caa" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "myapp.com"
  type    = "CAA"
  ttl     = 3600
  records = [
    "0 issue \"letsencrypt.org\"",
    "0 issue \"amazon.com\"",
    "0 issuewild \"letsencrypt.org\""
  ]
}
```

---

## Intermediate Concepts

### Route 53 Routing Policies

```hcl
# 1. Latency-Based Routing — route to lowest latency region
resource "aws_route53_record" "api_us" {
  zone_id        = aws_route53_zone.main.zone_id
  name           = "api.myapp.com"
  type           = "A"
  set_identifier = "us-east-1"

  latency_routing_policy {
    region = "us-east-1"
  }

  alias {
    name    = aws_lb.us.dns_name
    zone_id = aws_lb.us.zone_id
    evaluate_target_health = true
  }
}

resource "aws_route53_record" "api_eu" {
  zone_id        = aws_route53_zone.main.zone_id
  name           = "api.myapp.com"
  type           = "A"
  set_identifier = "eu-west-1"

  latency_routing_policy {
    region = "eu-west-1"
  }

  alias {
    name    = aws_lb.eu.dns_name
    zone_id = aws_lb.eu.zone_id
    evaluate_target_health = true
  }
}

# 2. Health Check + Failover
resource "aws_route53_health_check" "primary" {
  fqdn              = "myapp.com"
  port              = 443
  type              = "HTTPS"
  resource_path     = "/health"
  failure_threshold = 3
  request_interval  = 30
}

resource "aws_route53_record" "primary" {
  zone_id        = aws_route53_zone.main.zone_id
  name           = "myapp.com"
  type           = "A"
  set_identifier = "primary"

  failover_routing_policy { type = "PRIMARY" }
  health_check_id = aws_route53_health_check.primary.id

  alias { name = aws_lb.primary.dns_name; zone_id = aws_lb.primary.zone_id; evaluate_target_health = true }
}

resource "aws_route53_record" "secondary" {
  zone_id        = aws_route53_zone.main.zone_id
  name           = "myapp.com"
  type           = "A"
  set_identifier = "secondary"

  failover_routing_policy { type = "SECONDARY" }

  alias { name = aws_lb.secondary.dns_name; zone_id = aws_lb.secondary.zone_id; evaluate_target_health = true }
}

# 3. Weighted Routing — for canary deploys via DNS
# 95% → v1, 5% → v2
resource "aws_route53_record" "api_v1" {
  zone_id        = aws_route53_zone.main.zone_id
  name           = "api.myapp.com"
  type           = "A"
  set_identifier = "v1"
  weighted_routing_policy { weight = 95 }
  alias { name = aws_lb.v1.dns_name; zone_id = aws_lb.v1.zone_id; evaluate_target_health = true }
}

resource "aws_route53_record" "api_v2" {
  zone_id        = aws_route53_zone.main.zone_id
  name           = "api.myapp.com"
  type           = "A"
  set_identifier = "v2"
  weighted_routing_policy { weight = 5 }
  alias { name = aws_lb.v2.dns_name; zone_id = aws_lb.v2.zone_id; evaluate_target_health = true }
}
```

### Private Hosted Zones (Internal DNS)

```hcl
# Internal DNS zone — only resolvable inside your VPC
resource "aws_route53_zone" "internal" {
  name = "internal.myapp.com"

  vpc {
    vpc_id = aws_vpc.main.id
  }
}

# Internal service discovery
resource "aws_route53_record" "postgres" {
  zone_id = aws_route53_zone.internal.zone_id
  name    = "postgres.internal.myapp.com"
  type    = "CNAME"
  ttl     = 60
  records = [aws_db_instance.main.endpoint]
}

resource "aws_route53_record" "redis" {
  zone_id = aws_route53_zone.internal.zone_id
  name    = "redis.internal.myapp.com"
  type    = "CNAME"
  ttl     = 60
  records = [aws_elasticache_cluster.main.cache_nodes[0].address]
}

# App can now use "postgres.internal.myapp.com" instead of raw endpoints
# This makes DNS the single source of truth — easy to change the endpoint
```

### DNS Security (DNSSEC)

Plain DNS has no authentication built in — a resolver has no way to verify that the answer it received actually came from the domain's real nameserver rather than an attacker who intercepted the query (a "DNS spoofing" or "cache poisoning" attack). This could redirect users of `mybank.com` to a phishing site while the address bar still shows the real domain.

DNSSEC (DNS Security Extensions) fixes this by adding cryptographic signatures to DNS records, so a resolver can verify a response's authenticity the same way TLS lets a browser verify a certificate.

```
How DNSSEC works:
  1. The zone owner signs their DNS records with a private key, creating
     RRSIG (signature) records alongside the normal A/CNAME/MX records.
  2. The zone publishes its public key as a DNSKEY record.
  3. The parent zone (e.g., the .com registry) publishes a DS record — a
     hash of the child zone's public key — creating a "chain of trust"
     from the DNS root all the way down to your domain.
  4. A validating resolver fetches the RRSIG alongside the answer, verifies
     it against the DNSKEY, and checks the chain of trust up to a trusted
     root. If verification fails, the resolver refuses to return the answer.

Enabling DNSSEC on Route 53 (conceptually):
  1. Enable DNSSEC signing on the hosted zone (Route 53 manages the keys).
  2. Route 53 generates a DS record.
  3. You add that DS record at your domain REGISTRAR (not the hosted zone
     itself) — this is the step people forget, and without it the chain
     of trust is broken and DNSSEC silently does nothing.

Trade-off: DNSSEC adds complexity (key rotation, larger DNS responses) and
most consumer browsers don't independently validate it (they trust their
configured resolver to have done so) — but it's considered a baseline best
practice for high-value domains (banks, government, registrars).
```

---

## Interview Preparation

**Q1: What is the difference between an A record, CNAME, and an Alias record in Route 53?**
A: An A record maps a hostname directly to an IPv4 address. A CNAME maps a hostname to another hostname (canonical name) — the resolver performs another lookup for the target. CNAMEs cannot be used at the zone apex (root domain, e.g., `myapp.com`) — only subdomains. Route 53 Alias records are AWS-proprietary — they map a hostname to an AWS resource (ALB, CloudFront, S3, etc.) and the resolution happens internally within Route 53 without extra DNS lookups. Aliases work at the zone apex (unlike CNAMEs), support health check evaluation, and don't charge for queries. Best practice: use Alias records for all AWS resources.

**Q2: What is DNS TTL and how does it affect deployments?**
A: TTL (Time To Live) is how many seconds resolvers cache a DNS record before re-querying. If TTL is 3600 (1 hour), a resolver that cached your old IP will continue using it for up to 1 hour after you change the record. Before a migration: lower TTL to 60s several days in advance (wait for old caches to expire), make the IP change, verify, then optionally raise TTL back. If you need instant failover, keep TTL low (60s) permanently — but this increases DNS query volume. For records that rarely change (NS, MX), high TTL (86400s = 1 day) is fine.

**Q3: What are SPF, DKIM, and DMARC and why do you need all three?**
A: SPF (Sender Policy Framework): TXT record listing which mail servers are authorized to send email on behalf of your domain. Prevents forged MAIL FROM. DKIM (DomainKeys Identified Mail): CNAME pointing to a public key. Your email provider signs outgoing emails with the matching private key. Recipients verify the signature — proves the email wasn't modified in transit and came from the authorized sender. DMARC (Domain-based Message Authentication, Reporting, and Conformance): ties SPF and DKIM together with a policy — what to do when both fail (none/quarantine/reject) and where to send reports. You need all three: SPF alone is bypassable, DKIM alone doesn't prevent domain spoofing, DMARC tells receivers to actually enforce the policies. Together they prevent email spoofing and phishing using your domain.

---

## Practical Tasks

### Beginner (10 Tasks)
1. Use `dig` to look up A, MX, TXT, NS records for a public domain.
2. Trace full DNS resolution with `dig +trace example.com`.
3. Register a domain with Route 53 or any registrar.
4. Create an A record pointing to an EC2 instance IP.
5. Create a CNAME pointing a subdomain to another hostname.
6. Create a TXT record for domain verification.
7. Check DNS propagation across multiple resolvers.
8. Lower TTL to 60s before a planned IP change.
9. Add MX records for Google Workspace email.
10. Create a hosted zone in Route 53 and update NS records at registrar.

### Intermediate (10 Tasks)
1. Create an Alias record pointing to an ALB.
2. Configure SPF, DKIM, and DMARC for your domain.
3. Set up a Route 53 health check for your app endpoint.
4. Configure failover routing (primary/secondary).
5. Implement latency-based routing for a multi-region app.
6. Configure a private hosted zone for internal service discovery.
7. Create a CAA record restricting certificate authorities.
8. Set up weighted routing for a canary deploy.
9. Use Route 53 Resolver for hybrid cloud DNS.
10. Validate DMARC configuration with `dig _dmarc.example.com TXT`.

### Advanced (10 Tasks)
1. Configure DNSSEC for a Route 53 hosted zone.
2. Implement geo-location based routing.
3. Set up DNS firewall with Route 53 Resolver.
4. Automate DNS record management with Terraform for all services.
5. Implement split-horizon DNS (different responses inside/outside VPC).
6. Monitor DNS query volume and latency with CloudWatch.
7. Automate certificate renewal with cert-manager via DNS-01 challenge.
8. Implement blue-green deployment via weighted DNS routing.
9. Configure custom DNS resolvers for a multi-account AWS setup.
10. Implement domain takeover prevention with CAA and SPF monitoring.

---

## Self Assessment
1. What is a DNS A record?
2. What is a CNAME and when can't you use it?
3. What is DNS TTL?
4. What is DNS propagation?
5. What is a Route 53 Alias record?
6. What is SPF?
7. What is DKIM?
8. What is DMARC?
9. What is a private hosted zone?
10. What is the difference between latency-based and geo-location routing?

---

## Cheat Sheet

```bash
# DNS lookup
dig example.com A            # IPv4
dig example.com MX           # mail servers
dig example.com TXT          # text (SPF, DKIM)
dig example.com NS           # nameservers
dig +trace example.com       # full resolution trace
dig @8.8.8.8 example.com A  # query Google DNS directly

# Check propagation
for ns in 8.8.8.8 1.1.1.1 9.9.9.9; do
  echo "$ns: $(dig @$ns example.com A +short)"
done

# Check remaining TTL
dig example.com A +nocmd +noall +answer | awk '{print "TTL:", $2, "IP:", $5}'

# Email validation
dig example.com TXT | grep spf      # SPF
dig s1._domainkey.example.com CNAME # DKIM
dig _dmarc.example.com TXT          # DMARC
```

```hcl
# Route 53 quick reference
# A record
resource "aws_route53_record" "r" { zone_id = "Z...", name = "myapp.com", type = "A", ttl = 300, records = ["1.2.3.4"] }

# Alias (recommended for AWS resources)
resource "aws_route53_record" "r" { zone_id = "Z...", name = "myapp.com", type = "A"
  alias { name = alb.dns_name; zone_id = alb.zone_id; evaluate_target_health = true } }

# TXT
resource "aws_route53_record" "spf" { type = "TXT"; records = ["v=spf1 include:sendgrid.net ~all"] }

# Health check + failover
resource "aws_route53_health_check" "h" { fqdn = "myapp.com"; port = 443; type = "HTTPS"; resource_path = "/health" }
resource "aws_route53_record" "r" { ... failover_routing_policy { type = "PRIMARY" }; health_check_id = aws_route53_health_check.h.id }
```
