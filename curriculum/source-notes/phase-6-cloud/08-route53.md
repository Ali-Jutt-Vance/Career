# Phase 6 — Chapter 8: Route 53

---

## Chapter Overview

Route 53 is AWS's highly available and scalable DNS service. It handles domain registration, DNS routing, health checks, and traffic routing policies — including latency-based, geolocation, failover, and weighted routing.

**Topics:**
- Hosted zones (public and private)
- Record types (A, AAAA, CNAME, Alias, MX, TXT)
- Routing policies
- Health checks
- Private hosted zones for internal service discovery
- Route 53 Resolver for hybrid DNS

---

## Basic Examples

### Route 53 with Terraform

```hcl
# Public Hosted Zone
resource "aws_route53_zone" "main" {
  name = "myapp.com"
}

# A Record: root domain → ALB
resource "aws_route53_record" "root" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "myapp.com"
  type    = "A"

  alias {
    name                   = aws_lb.main.dns_name
    zone_id                = aws_lb.main.zone_id
    evaluate_target_health = true
  }
}

# A Record: www → ALB (same alias)
resource "aws_route53_record" "www" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "www.myapp.com"
  type    = "A"

  alias {
    name                   = aws_lb.main.dns_name
    zone_id                = aws_lb.main.zone_id
    evaluate_target_health = true
  }
}

# CNAME: api subdomain → ALB DNS name (or use alias)
resource "aws_route53_record" "api" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "api.myapp.com"
  type    = "CNAME"
  ttl     = 300
  records = [aws_lb.main.dns_name]
}

# TXT record: domain verification
resource "aws_route53_record" "txt_verification" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "myapp.com"
  type    = "TXT"
  ttl     = 300
  records = ["v=spf1 include:sendgrid.net ~all", "google-site-verification=abc123"]
}

# MX record: email
resource "aws_route53_record" "mx" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "myapp.com"
  type    = "MX"
  ttl     = 300
  records = [
    "10 inbound-smtp.us-east-1.amazonaws.com",  # SES
  ]
}

# Health Check for failover routing
resource "aws_route53_health_check" "primary" {
  fqdn              = "primary.myapp.com"
  port              = 443
  type              = "HTTPS"
  resource_path     = "/health"
  failure_threshold = 3
  request_interval  = 30

  tags = { Name = "myapp-primary-health" }
}

# Failover routing: primary + secondary
resource "aws_route53_record" "primary" {
  zone_id        = aws_route53_zone.main.zone_id
  name           = "myapp.com"
  type           = "A"
  set_identifier = "primary"

  failover_routing_policy {
    type = "PRIMARY"
  }

  health_check_id = aws_route53_health_check.primary.id

  alias {
    name                   = aws_lb.primary.dns_name
    zone_id                = aws_lb.primary.zone_id
    evaluate_target_health = true
  }
}

resource "aws_route53_record" "secondary" {
  zone_id        = aws_route53_zone.main.zone_id
  name           = "myapp.com"
  type           = "A"
  set_identifier = "secondary"

  failover_routing_policy {
    type = "SECONDARY"
  }

  alias {
    name                   = aws_lb.dr.dns_name
    zone_id                = aws_lb.dr.zone_id
    evaluate_target_health = true
  }
}

# Weighted routing: 90% prod / 10% canary
resource "aws_route53_record" "prod" {
  zone_id        = aws_route53_zone.main.zone_id
  name           = "api.myapp.com"
  type           = "A"
  set_identifier = "prod"

  weighted_routing_policy {
    weight = 90
  }

  alias {
    name                   = aws_lb.prod.dns_name
    zone_id                = aws_lb.prod.zone_id
    evaluate_target_health = true
  }
}

resource "aws_route53_record" "canary" {
  zone_id        = aws_route53_zone.main.zone_id
  name           = "api.myapp.com"
  type           = "A"
  set_identifier = "canary"

  weighted_routing_policy {
    weight = 10
  }

  alias {
    name                   = aws_lb.canary.dns_name
    zone_id                = aws_lb.canary.zone_id
    evaluate_target_health = true
  }
}
```

### Private Hosted Zone (Internal DNS)

```hcl
# Private hosted zone — resolves only within VPC
resource "aws_route53_zone" "internal" {
  name = "internal.myapp.local"

  vpc {
    vpc_id = aws_vpc.main.id
  }
}

# Internal DNS for PostgreSQL (so app doesn't hardcode RDS endpoint)
resource "aws_route53_record" "postgres" {
  zone_id = aws_route53_zone.internal.zone_id
  name    = "postgres.internal.myapp.local"
  type    = "CNAME"
  ttl     = 60
  records = [aws_db_instance.main.address]
}

# Internal DNS for Redis
resource "aws_route53_record" "redis" {
  zone_id = aws_route53_zone.internal.zone_id
  name    = "redis.internal.myapp.local"
  type    = "CNAME"
  ttl     = 60
  records = [aws_elasticache_cluster.main.cache_nodes[0].address]
}

# App connects to: postgres://postgres.internal.myapp.local:5432/myapp
# When you replace RDS, just update the CNAME — app code doesn't change
```

---

## Interview Preparation

**Q1: What is the difference between a CNAME and an Alias record in Route 53?**
A: CNAME maps one domain name to another. Limitation: cannot be used at the zone apex (root domain) — you cannot create a CNAME for `myapp.com` (only `www.myapp.com`). Also: CNAME adds a DNS lookup hop, which adds latency. Alias record: Route 53-specific. Looks like an A/AAAA record from the outside but internally maps to AWS resource DNS names (ALB, CloudFront, S3 website, Elastic Beanstalk, etc.). Can be used at the zone apex. No extra DNS lookup — Route 53 resolves it to IP addresses directly. Free (no charge for Alias DNS queries). Use Alias for: ALB, CloudFront, S3 website endpoints, other Route 53 records. Use CNAME for: third-party services that give you a hostname.

**Q2: What are Route 53 routing policies?**
A: Simple: single resource, single IP. No health check. Failover: primary + secondary. Switches to secondary automatically when primary health check fails. For active-passive DR. Weighted: distribute traffic across multiple resources by percentage (90/10 for canary, 50/50 for A/B). Latency: routes to the resource with lowest latency for the user's location. Multiple endpoints in multiple regions. Geolocation: route based on user's country or continent (GDPR compliance — route EU users to EU servers). Geoproximity: route based on geographic distance, can adjust bias. Multivalue Answer: like Simple but with health checks and up to 8 records (round-robin with health checking — not a replacement for ALB).

**Q3: What is a Route 53 private hosted zone and why use it?**
A: A private hosted zone resolves only within specified VPCs (not on the public internet). Uses: internal service discovery — `postgres.internal.myapp.local` resolves to your RDS endpoint inside the VPC, but not from outside. This decouples app configuration from infrastructure details — change the underlying resource, update only the DNS record. Microservices find each other by DNS name (`user-service.internal.local`) instead of hardcoded IPs. Route 53 Resolver (AmazonProvidedDNS at VPC+2 address) automatically resolves private hosted zones for instances in associated VPCs. Also enables hybrid DNS: Route 53 Resolver Rules can forward specific domains to on-premises DNS servers.

---

## Practical Tasks

### Beginner (10 Tasks)
1. Register or transfer a domain to Route 53.
2. Create a public hosted zone for your domain.
3. Create an A record pointing to an EC2 instance's public IP.
4. Create a CNAME `www` record pointing to the apex domain.
5. Add a TXT record for domain verification.
6. Add an MX record for email.
7. Query DNS with `dig myapp.com A` and `dig www.myapp.com CNAME`.
8. Create an Alias record pointing to an ALB.
9. Change TTL to 60 seconds before a migration.
10. Verify propagation with `dig @8.8.8.8 myapp.com`.

### Intermediate (10 Tasks)
1. Set up failover routing (primary ALB + secondary static S3 page).
2. Create a health check for the primary endpoint.
3. Set up weighted routing (90/10) for canary deployment.
4. Create a private hosted zone for internal DNS.
5. Add `postgres.internal.local` CNAME to RDS endpoint.
6. Set up latency-based routing for a multi-region app.
7. Configure ACM DNS validation with Route 53 records.
8. Manage Route 53 with Terraform (zone + records).
9. Automate DNS record creation in GitHub Actions CI/CD.
10. Set up SPF, DKIM, DMARC records for email security.

### Advanced (10 Tasks)
1. Implement automated failover testing (kill primary, verify failover in < 60s).
2. Set up geolocation routing (EU users → EU region, US → US region).
3. Configure Route 53 Resolver for hybrid on-premises DNS.
4. Implement DNSSEC for domain authentication.
5. Build multi-region active-active architecture with latency routing.
6. Set up Route 53 Application Recovery Controller for AZ failover.
7. Implement Route 53 Traffic Flow with visual routing policies.
8. Monitor Route 53 query volume and latency with CloudWatch.
9. Automate DNS failback after primary recovery.
10. Set up Route 53 Resolver Query Logging for security audit.

---

## Self Assessment
1. What is a hosted zone?
2. What is the difference between a public and private hosted zone?
3. What is an A record?
4. What is a CNAME record?
5. What is an Alias record?
6. Why can't CNAME be used at zone apex?
7. What are the Route 53 routing policies?
8. What is a Route 53 health check?
9. What is failover routing?
10. What is weighted routing used for?

---

## Cheat Sheet

```bash
# Route 53 CLI
aws route53 list-hosted-zones
aws route53 get-hosted-zone --id Z1234567890ABC
aws route53 list-resource-record-sets --hosted-zone-id Z1234567890ABC

# Create/update record (via change batch)
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890ABC \
  --change-batch '{
    "Changes": [{
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "api.myapp.com",
        "Type": "A",
        "TTL": 300,
        "ResourceRecords": [{ "Value": "1.2.3.4" }]
      }
    }]
  }'

# DNS debugging
dig myapp.com A
dig myapp.com NS
dig @ns-123.awsdns-45.com myapp.com A  # query specific nameserver
nslookup myapp.com
host myapp.com
```

```
Record types:
  A     → IPv4 address (1.2.3.4)
  AAAA  → IPv6 address (2001:db8::1)
  CNAME → Canonical name (alias → actual hostname)
  ALIAS → AWS-specific, like A but points to AWS resource DNS names
  MX    → Mail server (priority + hostname)
  TXT   → Text (SPF, DKIM verification, site verification)
  NS    → Name server (who answers for this zone)
  SOA   → Start of authority (zone metadata)
  SRV   → Service record (host + port for services)
  CAA   → Which CAs can issue SSL certs for this domain

Routing policies:
  Simple     → one resource
  Failover   → primary/secondary (health-check driven)
  Weighted   → percentage split
  Latency    → lowest latency region
  Geolocation → user's country/continent
  Multivalue → up to 8 healthy records
```
