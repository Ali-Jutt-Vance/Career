# Phase 5 — Chapter 11: SSL/TLS

---

## Chapter Overview

SSL/TLS encrypts data in transit between clients and servers — protecting passwords, tokens, PII, and API data from eavesdropping and tampering. In 2025, HTTPS is mandatory for all web applications (browsers flag HTTP as insecure, search engines penalize it).

**Topics:**
- How TLS works (handshake, certificates, cipher suites)
- Certificate types (DV, OV, EV, wildcard, multi-domain)
- Let's Encrypt (free, automated)
- AWS Certificate Manager (ACM)
- TLS configuration best practices
- HSTS, OCSP stapling, certificate pinning
- mTLS (mutual TLS for service-to-service)

---

## Beginner Theory

### TLS Handshake (TLS 1.3)

```
Client                                  Server
  │──── ClientHello (TLS 1.3, ciphers) ────►│
  │◄─── ServerHello + Certificate ──────────│
  │◄─── EncryptedExtensions + Finished ─────│
  │──── Verify Certificate ─────────────────│ (check against trusted CAs)
  │──── Finished ──────────────────────────►│
  │◄══════════ Encrypted Data ══════════════│

TLS 1.3 improvements over TLS 1.2:
  - 1-RTT handshake (vs 2-RTT in 1.2) — 50% faster
  - 0-RTT for resumed connections (send data with ClientHello)
  - Removed insecure cipher suites (RC4, DES, 3DES, MD5)
  - Forward secrecy by default (DHE/ECDHE key exchange)
  - Encrypted certificate (privacy improvement)

Certificate Chain:
  Root CA (trusted by OS/browser)
      ↓ signs
  Intermediate CA
      ↓ signs
  Your Server Certificate
  
  Server sends: your cert + intermediate cert
  Client verifies chain up to a trusted root
```

### Certificate Types: DV, OV, EV, Wildcard, Multi-Domain

Not all TLS certificates verify the same thing — they differ in how much the Certificate Authority checks about the entity requesting the certificate before issuing it.

```
DV (Domain Validated):
  The CA only verifies that the requester controls the domain (via a DNS
  TXT record, an HTTP file, or an email to admin@domain). Takes minutes,
  often free (Let's Encrypt issues only DV certificates). Sufficient for
  the vast majority of websites — the padlock only ever meant "this
  connection is encrypted," never "this business is verified."

OV (Organization Validated):
  The CA additionally verifies the legal existence of the organization
  (business registration lookup). Takes 1-3 days, costs money. The
  certificate includes the organization's verified name — visible if you
  inspect the certificate details, though browsers no longer display it
  prominently in the address bar.

EV (Extended Validation):
  The strictest tier — the CA performs a thorough legal, physical, and
  operational verification of the business (this used to trigger the
  green address bar in older browsers; modern browsers removed that
  visual distinction because users didn't understand or check it).
  Mostly relevant now for compliance/contractual requirements, not
  actual security improvement over DV.

Wildcard (*.myapp.com):
  Covers the base domain AND all direct subdomains (api.myapp.com,
  www.myapp.com) with ONE certificate. Does NOT cover second-level
  subdomains (dev.api.myapp.com needs its own wildcard or SAN entry).
  Requires DNS validation (not HTTP validation) since there's no single
  file path that proves control of every possible subdomain.

Multi-Domain (SAN — Subject Alternative Name):
  One certificate covering multiple, unrelated domain names
  (myapp.com, myapp.io, myapp.co) — useful when one server or CDN
  serves several distinct brands.

Practical takeaway: for 95% of applications, a free DV certificate from
Let's Encrypt (or ACM) is the correct choice. OV/EV are usually purchased
for compliance checkboxes (some enterprise procurement forms still ask
for them), not because they make the connection more secure.
```

---

## Basic Examples

### Let's Encrypt with Certbot

```bash
# Install Certbot on Ubuntu
apt install certbot python3-certbot-nginx

# Obtain certificate and auto-configure Nginx
certbot --nginx -d myapp.com -d www.myapp.com

# Or obtain without configuring nginx (manual mode)
certbot certonly --nginx -d myapp.com -d www.myapp.com

# Certificate files stored at:
# /etc/letsencrypt/live/myapp.com/fullchain.pem  ← cert + intermediate chain
# /etc/letsencrypt/live/myapp.com/privkey.pem     ← private key
# /etc/letsencrypt/live/myapp.com/cert.pem        ← cert only

# Test renewal (no actual renewal)
certbot renew --dry-run

# Auto-renewal is set up automatically by certbot as a cron/systemd timer
systemctl list-timers | grep certbot

# Wildcard certificate via DNS challenge (requires DNS API access)
certbot certonly \
  --dns-route53 \
  -d myapp.com \
  -d "*.myapp.com"

# For Docker: use acme.sh or certbot with volume mount
docker run -it --rm \
  -v /etc/letsencrypt:/etc/letsencrypt \
  -p 80:80 \
  certbot/certbot certonly --standalone \
  -d myapp.com --agree-tos -m admin@myapp.com
```

### Nginx TLS Configuration (A+ on SSL Labs)

```nginx
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    http2 on;
    server_name myapp.com www.myapp.com;

    # Certificate
    ssl_certificate     /etc/letsencrypt/live/myapp.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/myapp.com/privkey.pem;

    # Protocol — TLS 1.2 and 1.3 only (1.0 and 1.1 are deprecated)
    ssl_protocols TLSv1.2 TLSv1.3;

    # Cipher suites — strong only, forward secrecy
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305;
    ssl_prefer_server_ciphers off;  # Let client pick (better with TLS 1.3)

    # DH parameters (for TLS 1.2 DHE key exchange)
    ssl_dhparam /etc/ssl/dhparam4096.pem;  # openssl dhparam -out /etc/ssl/dhparam4096.pem 4096

    # Session caching (performance)
    ssl_session_cache   shared:SSL:10m;   # 10MB shared cache = ~40K sessions
    ssl_session_timeout 1d;
    ssl_session_tickets off;              # disable — breaks forward secrecy between restarts

    # OCSP Stapling — server pre-fetches revocation status, faster for clients
    ssl_stapling         on;
    ssl_stapling_verify  on;
    ssl_trusted_certificate /etc/letsencrypt/live/myapp.com/chain.pem;
    resolver             8.8.8.8 8.8.4.4 valid=300s;
    resolver_timeout     5s;

    # HSTS — tell browsers to always use HTTPS (max 2 years)
    # WARNING: test on a subdomain first, hard to undo if HTTPS breaks
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;

    # Other security headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Redirect HTTP → HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name myapp.com www.myapp.com;
    return 301 https://$host$request_uri;
}
```

---

## Intermediate Concepts

### AWS Certificate Manager (ACM)

```hcl
# Request a certificate in ACM (free, auto-renews)
resource "aws_acm_certificate" "main" {
  domain_name       = "myapp.com"
  subject_alternative_names = ["*.myapp.com", "www.myapp.com"]
  validation_method = "DNS"    # DNS validation (preferred) or EMAIL

  lifecycle {
    create_before_destroy = true  # required when used with ALB
  }
}

# Create DNS validation records in Route 53
resource "aws_route53_record" "cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.main.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      type   = dvo.resource_record_type
      value  = dvo.resource_record_value
    }
  }

  zone_id = aws_route53_zone.main.zone_id
  name    = each.value.name
  type    = each.value.type
  ttl     = 60
  records = [each.value.value]
}

# Wait for certificate validation
resource "aws_acm_certificate_validation" "main" {
  certificate_arn         = aws_acm_certificate.main.arn
  validation_record_fqdns = [for r in aws_route53_record.cert_validation : r.fqdn]
}

# Attach to ALB HTTPS listener
resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.main.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"  # TLS 1.2+ with TLS 1.3
  certificate_arn   = aws_acm_certificate_validation.main.certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app.arn
  }
}

# HTTP → HTTPS redirect listener
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = "redirect"
    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}
```

### mTLS (Mutual TLS for Service-to-Service)

```bash
# Generate CA and client/server certificates
# 1. Create CA
openssl req -x509 -sha256 -days 3650 -newkey rsa:4096 \
  -keyout ca.key -out ca.crt \
  -subj "/CN=MyApp Internal CA"

# 2. Server certificate
openssl req -newkey rsa:4096 -keyout server.key -out server.csr \
  -subj "/CN=api.internal.myapp.com"
openssl x509 -req -days 365 -CA ca.crt -CAkey ca.key -in server.csr -out server.crt

# 3. Client certificate (for service-to-service)
openssl req -newkey rsa:4096 -keyout client.key -out client.csr \
  -subj "/CN=worker-service"
openssl x509 -req -days 365 -CA ca.crt -CAkey ca.key -in client.csr -out client.crt

# Nginx mTLS config
server {
    ssl_client_certificate /etc/ssl/ca.crt;   # CA to verify client certs
    ssl_verify_client      on;                # require client cert
    
    # Access the client CN in your app
    proxy_set_header X-Client-Cert-CN $ssl_client_s_dn_cn;
}

# Node.js client with mTLS
const https = require("https");
const fs    = require("fs");

const agent = new https.Agent({
  cert: fs.readFileSync("client.crt"),
  key:  fs.readFileSync("client.key"),
  ca:   fs.readFileSync("ca.crt")
});

fetch("https://api.internal.myapp.com/data", { agent });
```

---

## Interview Preparation

**Q1: What is the difference between symmetric and asymmetric encryption in TLS?**
A: Asymmetric encryption (RSA, ECDSA) uses a key pair: public key encrypts, private key decrypts. Computationally expensive but enables key exchange without prior shared secret — the server's certificate contains its public key. Symmetric encryption (AES-GCM, ChaCha20) uses a single shared key — both parties encrypt and decrypt with the same key. Fast and efficient for bulk data. TLS uses both: asymmetric encryption during the handshake to securely establish a shared session key (ephemeral key exchange with ECDHE for forward secrecy), then symmetric encryption (AES-256-GCM) for all actual data transfer. This combines the key distribution advantage of asymmetric with the performance of symmetric.

**Q2: What is forward secrecy and why is it important?**
A: Forward secrecy (Perfect Forward Secrecy / PFS) means that compromising the server's long-term private key cannot be used to decrypt past recorded traffic. Without PFS: an attacker can capture encrypted TLS traffic today, and if they obtain the private key later (via breach, court order, NSA), they can decrypt all previously captured traffic. With PFS (ECDHE key exchange): a new ephemeral key pair is generated for each TLS session. Even if the server's certificate private key is compromised, past sessions cannot be decrypted because the ephemeral keys are discarded after the session. TLS 1.3 requires forward secrecy. In TLS 1.2, ensure cipher suites with ECDHE (not RSA key exchange) are used.

**Q3: What is OCSP stapling and how does it improve TLS performance?**
A: OCSP (Online Certificate Status Protocol) lets browsers verify that a certificate hasn't been revoked. Without stapling: browser makes an OCSP request to the CA's OCSP server (adds latency, privacy concern). With OCSP stapling: the server periodically fetches and caches a signed OCSP response from the CA, then "staples" it to the TLS handshake. The client receives the revocation status without a separate request. Benefits: faster TLS handshake (no extra OCSP round-trip), better privacy (CA doesn't see which sites you're visiting), works even if CA's OCSP server is down.

---

## Practical Tasks

### Beginner (10 Tasks)
1. Generate a self-signed certificate for local development.
2. Install Certbot and obtain a Let's Encrypt certificate.
3. Configure Nginx to use the certificate.
4. Test SSL configuration with `curl -v`.
5. Force HTTP → HTTPS redirect in Nginx.
6. Add HSTS header to Nginx config.
7. Check certificate expiry date.
8. Verify the certificate chain is correct.
9. Set up auto-renewal with Certbot and test with `--dry-run`.
10. Test your SSL config rating on SSL Labs (target: A+).

### Intermediate (10 Tasks)
1. Configure TLS 1.2 + 1.3 only (disable older versions).
2. Configure strong cipher suites in Nginx.
3. Enable OCSP stapling in Nginx.
4. Generate DH parameters (4096-bit) for Nginx.
5. Request an ACM wildcard certificate with DNS validation.
6. Attach ACM certificate to an ALB HTTPS listener.
7. Configure ALB to redirect HTTP to HTTPS.
8. Set up a wildcard Let's Encrypt certificate via DNS-01 challenge.
9. Configure certificate pinning in a mobile app.
10. Monitor certificate expiry with a cronjob that alerts when < 30 days.

### Advanced (10 Tasks)
1. Implement mTLS between two services.
2. Set up a private PKI with internal CA for microservices.
3. Implement HSTS preloading (submit to browsers' preload list).
4. Set up TLS termination at the ALB and pass client cert info to app.
5. Automate certificate rotation without downtime.
6. Implement certificate transparency monitoring (crt.sh alerts).
7. Configure TLS 1.3 0-RTT for faster repeat connections.
8. Implement TLS offloading benchmark and measure improvement.
9. Set up cert-manager in Kubernetes with Let's Encrypt.
10. Audit all services for weak TLS configurations with `testssl.sh`.

---

## Self Assessment
1. What is the difference between SSL and TLS?
2. What is a Certificate Authority (CA)?
3. What is the difference between DV, OV, and EV certificates?
4. What is Let's Encrypt?
5. What is forward secrecy?
6. What is HSTS?
7. What is OCSP stapling?
8. What is mTLS?
9. What is ACM?
10. What does `ssl_protocols TLSv1.2 TLSv1.3` do?

---

## Cheat Sheet

```bash
# Let's Encrypt
certbot --nginx -d myapp.com -d www.myapp.com
certbot certonly --dns-route53 -d "*.myapp.com"
certbot renew --dry-run

# Check certificate
openssl s_client -connect myapp.com:443 -servername myapp.com
openssl x509 -in cert.pem -text -noout | grep -E "Not (Before|After)"
curl -vI https://myapp.com 2>&1 | grep -E "expire|SSL"

# Generate self-signed (dev only)
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes

# Generate DH params
openssl dhparam -out /etc/ssl/dhparam.pem 4096
```

```nginx
# Nginx TLS best practices
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
ssl_prefer_server_ciphers off;
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 1d;
ssl_session_tickets off;
ssl_stapling on; ssl_stapling_verify on;
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
```
