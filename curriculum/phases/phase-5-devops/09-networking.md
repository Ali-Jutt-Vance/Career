# Phase 5 — Chapter 9: Networking

---

## Chapter Overview

Networking knowledge is essential for cloud and backend engineers — understanding how data flows from browser to server, how subnets and routing work, how ports and protocols are used, and how to troubleshoot connectivity issues.

**Topics:**
- OSI model
- IP addressing and subnets (CIDR)
- TCP/IP handshake
- DNS resolution
- HTTP/HTTPS protocol
- Ports and protocols
- VPC networking
- Firewalls and security groups
- Load balancing

---

## Beginner Theory

### OSI Model (Simplified)

```
Layer 7  Application   HTTP, HTTPS, WebSocket, gRPC, DNS, SMTP
Layer 6  Presentation  TLS/SSL encryption, JSON, XML encoding
Layer 5  Session       Authentication sessions, NetBIOS
Layer 4  Transport     TCP (reliable), UDP (unreliable), ports
Layer 3  Network       IP addressing, routing (packets)
Layer 2  Data Link     MAC addresses, Ethernet, Wi-Fi frames
Layer 1  Physical      Cables, radio waves, bits

As a backend engineer you primarily work with layers 4, 7:
  Layer 4: TCP connections, port management, load balancers
  Layer 7: HTTP/HTTPS, API design, application firewalls
```

### IP Addressing and CIDR

```
IPv4: 32-bit address written as 4 octets (0-255)
  10.0.0.1       Private (RFC 1918)
  192.168.1.100  Private
  172.31.0.5     Private (AWS default VPC range)
  8.8.8.8        Public (Google DNS)

Private address ranges (not routable on internet):
  10.0.0.0/8        10.x.x.x        16.7 million addresses
  172.16.0.0/12     172.16.x.x–172.31.x.x
  192.168.0.0/16    192.168.x.x

CIDR (Classless Inter-Domain Routing): IP/prefix-length
  10.0.0.0/8     = 10.0.0.0 → 10.255.255.255  (16.7M addresses)
  10.0.0.0/16    = 10.0.0.0 → 10.0.255.255    (65K addresses)
  10.0.0.0/24    = 10.0.0.0 → 10.0.0.255      (254 usable hosts)
  10.0.0.0/28    = 10.0.0.0 → 10.0.0.15       (14 usable hosts)
  
  /24 ← typical subnet (256 addresses, 254 usable)
  /16 ← VPC (65K addresses)
  
  Formula: 2^(32-prefix) = total addresses
  /24 = 2^8 = 256 addresses

  cidrsubnet("10.0.0.0/16", 8, 0) = "10.0.0.0/24"  ← Terraform helper
  cidrsubnet("10.0.0.0/16", 8, 1) = "10.0.1.0/24"
```

---

## Basic Examples

### TCP Handshake and Connection Flow

```
TCP Three-Way Handshake (connection setup):

Client                              Server
  │──── SYN (seq=x) ──────────────►│  "I want to connect"
  │◄─── SYN-ACK (seq=y, ack=x+1) ──│  "OK, I'm ready"
  │──── ACK (ack=y+1) ─────────────►│  "Great, let's talk"
  │◄══════════ Data Exchange ══════►│
  │──── FIN ───────────────────────►│  "I'm done"
  │◄─── FIN-ACK ────────────────────│  "OK, bye"

HTTP Request Flow:
  1. Browser resolves DNS: api.myapp.com → 54.23.45.67
  2. TCP handshake with server on port 443
  3. TLS handshake (negotiate cipher, exchange certificates)
  4. HTTP request sent over encrypted TLS tunnel
  5. Server responds
  6. Connection reused (HTTP/1.1 keep-alive) or new request

Key insight: Each TCP connection has overhead.
  HTTP/1.1: 6 parallel connections max per domain
  HTTP/2:   Multiple requests multiplexed over ONE connection
  HTTP/3:   QUIC (UDP-based), eliminates head-of-line blocking
```

### Common Ports

```
Well-known ports (0-1023, require root to bind):
  22    SSH
  25    SMTP
  53    DNS (TCP/UDP)
  80    HTTP
  443   HTTPS

Registered ports (1024-49151):
  3000  Node.js convention (development)
  3306  MySQL
  5432  PostgreSQL
  6379  Redis
  8080  Alternate HTTP
  8443  Alternate HTTPS
  27017 MongoDB

Dynamic/private ports (49152-65535):
  Used by OS for outbound connections (ephemeral ports)

Application ports (convention):
  9200  Elasticsearch HTTP
  5601  Kibana
  9090  Prometheus
  3000  Grafana
  4222  NATS
  5672  RabbitMQ AMQP
  15672 RabbitMQ Management UI
```

---

## Intermediate Concepts

### DNS Resolution Deep Dive

```
Browser enters: api.myapp.com

1. Check /etc/hosts (or Windows hosts file) — local override
2. Check OS DNS cache
3. Query recursive resolver (ISP or 8.8.8.8)
4. Resolver queries root nameserver → gets .com TLD nameserver
5. Resolver queries .com TLD → gets myapp.com authoritative NS
6. Resolver queries myapp.com nameserver → gets A record: 54.23.45.67
7. Resolver caches result (TTL: 300s = 5 min)
8. Returns IP to browser

DNS Record Types:
  A       hostname → IPv4         api.myapp.com → 54.23.45.67
  AAAA    hostname → IPv6         api.myapp.com → 2001:db8::1
  CNAME   alias → canonical       www.myapp.com → myapp.com
  MX      mail server             myapp.com → mail.myapp.com (priority 10)
  TXT     text (SPF, DKIM, verify) "v=spf1 include:sendgrid.net ~all"
  NS      nameserver              myapp.com → ns1.route53.amazonaws.com
  SOA     start of authority (zone metadata)
  SRV     service discovery       _http._tcp.myapp.com → priority/weight/port/target

TTL (Time To Live): how long resolvers cache the record
  Low TTL (60s):    fast DNS propagation, useful during migrations
  High TTL (86400s): reduces DNS load, but slow to change

DNS in AWS:
  Route 53 → A record (Alias to ALB) or CNAME to ALB DNS name
  Alias records have no TTL, free queries, support APEX domain
  CNAME cannot be used for APEX domain (myapp.com) — use Alias
```

### VPC Networking

```
AWS VPC Architecture:

Internet ←→ Internet Gateway ←→ Public Subnet ←→ NAT Gateway ←→ Private Subnet

Subnets:
  Public:  Has route 0.0.0.0/0 → IGW. Resources get public IPs.
           Load balancers, bastion hosts, NAT gateways
  Private: No route to IGW. Resources get private IPs only.
           App servers, databases, caches
  
Security Groups (stateful firewall on ENI level):
  - Applied to: EC2 instances, RDS, Lambda, ALB
  - Rules: allow-only (no explicit deny)
  - Stateful: if you allow inbound port 3000, return traffic is auto-allowed
  - Can reference other SGs (app-sg allows from alb-sg on port 3000)
  
NACLs (stateless firewall on subnet level):
  - Applied to: entire subnet
  - Rules: allow AND deny
  - Stateless: must explicitly allow both inbound and outbound
  - Lower rule number = higher priority
  - Usually not needed; security groups are sufficient

NAT Gateway:
  - Allows private subnet instances to reach internet (npm install, OS updates)
  - Not needed for inbound traffic (private instances can't be reached from internet)
  - One NAT Gateway per AZ for high availability

Route Tables:
  Public RT:  0.0.0.0/0 → IGW
  Private RT: 0.0.0.0/0 → NAT Gateway
              10.0.0.0/16 → local (VPC internal)
```

### Load Balancing

A load balancer sits in front of a fleet of servers and distributes incoming traffic across them — so no single server is overwhelmed, and if one server fails, traffic simply routes around it.

```
Common load balancing algorithms:

Round Robin:          Request 1 → Server A, Request 2 → Server B,
                       Request 3 → Server C, Request 4 → Server A...
                       Simple, works well when servers are equally powerful
                       and requests are roughly equal cost.

Least Connections:    Send the next request to whichever server currently
                       has the fewest active connections.
                       Better when request processing time varies a lot
                       (some requests are slow, some are fast).

IP Hash:               Hash the client's IP to consistently route the same
                       client to the same server.
                       Useful for "sticky sessions" without needing shared
                       session storage.

Weighted:              Give more traffic to more powerful servers
                       (e.g., a server with 2x the CPU gets 2x the requests).

Layer 4 (Transport) vs Layer 7 (Application) load balancing:
  L4: routes based on IP + port only, doesn't inspect HTTP content.
      Faster, protocol-agnostic (works for any TCP traffic).
  L7: routes based on HTTP data — path, headers, cookies.
      Enables routing /api/* to one service and /admin/* to another,
      from the SAME load balancer. AWS ALB is Layer 7; AWS NLB is Layer 4.
```

Health checks are what make a load balancer resilient rather than just a traffic splitter: it periodically pings each server (e.g., `GET /health` every 30s) and stops routing traffic to any server that fails several checks in a row — automatically routing around a crashed or overloaded instance without a human intervening.

---

## Interview Preparation

**Q1: What is the difference between a Security Group and a NACL in AWS?**
A: Security Groups are stateful firewalls applied at the ENI (network interface) level — to individual EC2 instances, RDS instances, etc. Stateful means: if you allow inbound port 80, the return traffic (outbound) is automatically allowed even if you don't have an outbound rule. They are allow-only (no explicit deny, just deny by omission). NACLs (Network Access Control Lists) are stateless subnet-level firewalls — they apply to all traffic entering or leaving a subnet. Stateless means: you must explicitly allow both inbound AND outbound traffic. They support both allow and deny rules. In practice, use Security Groups for fine-grained access control (most use cases). Only use NACLs for subnet-level blocking (e.g., block a specific IP range at the subnet boundary).

**Q2: What is the difference between HTTP/1.1, HTTP/2, and HTTP/3?**
A: HTTP/1.1: one request at a time per TCP connection. Browsers open 6 parallel connections per domain to workaround this. Head-of-line blocking: a slow request blocks subsequent requests on the same connection. HTTP/2: multiplexes multiple requests over a single TCP connection (streams). No head-of-line blocking at the HTTP layer. Header compression (HPACK). Server push. HTTP/3: uses QUIC (UDP-based) instead of TCP. Eliminates head-of-line blocking at the transport layer (TCP packet loss blocks all streams; UDP doesn't). Faster connection establishment (0-RTT), better for mobile (connection migration when switching Wi-Fi to 4G). HTTP/2 is the current standard for HTTPS; HTTP/3 is gaining adoption (Cloudflare, Google serve it).

**Q3: Explain what happens when you type `https://myapp.com` in a browser.**
A: 1. URL parsing — browser identifies protocol (https), host (myapp.com), path (/). 2. DNS resolution — OS checks hosts file, local DNS cache, then queries recursive resolver to get the A record IP (54.23.45.67). 3. TCP handshake — three-way handshake with the server on port 443 (SYN, SYN-ACK, ACK). 4. TLS handshake — negotiate TLS version, cipher suite, exchange certificates, verify certificate against CA, establish encrypted session (about 1-2 RTTs for TLS 1.3). 5. HTTP request — browser sends `GET / HTTP/2` with headers (Host, User-Agent, Accept, etc.) over encrypted channel. 6. Server responds — server processes request, returns 200 OK with HTML body. 7. Browser renders — parses HTML, discovers CSS/JS/image resources, makes additional requests. Entire flow: ~50-300ms depending on geography and caching.

---

## Practical Tasks

### Beginner (10 Tasks)
1. Use `dig` to look up A, CNAME, MX records for a domain.
2. Use `ping` and `traceroute` to test connectivity.
3. Use `ss -tlnp` to see what ports are listening on your machine.
4. Use `curl -I` to inspect HTTP response headers.
5. Calculate subnet ranges for 10.0.0.0/24 and 10.0.0.0/28.
6. Use `nslookup` to look up DNS with a specific resolver.
7. View TCP connections with `ss -tn`.
8. Use `curl -v` to see the full TLS handshake.
9. Set up UFW to allow SSH, HTTP, HTTPS and deny everything else.
10. Use `netcat` to test if a port is open.

### Intermediate (10 Tasks)
1. Set up a VPC with public and private subnets manually in AWS.
2. Configure a Security Group allowing app traffic only from ALB.
3. Test routing: verify private instance can reach internet via NAT.
4. Configure a CNAME record pointing your subdomain to an ALB.
5. Set up Route 53 health check with failover routing.
6. Use `tcpdump` to capture and analyze HTTP traffic.
7. Configure HTTPS on an ALB with ACM certificate.
8. Set up VPC Peering between two VPCs.
9. Block a specific IP range using NACL.
10. Configure a bastion host for SSH access to private instances.

### Advanced (10 Tasks)
1. Design a multi-AZ VPC with redundant NAT gateways.
2. Set up AWS PrivateLink to expose a service privately.
3. Configure Route 53 latency-based routing for multi-region.
4. Set up Direct Connect or VPN for private connectivity.
5. Implement network flow logs and analyze with Athena.
6. Build a zero-trust network with Tailscale.
7. Configure IPv6 dual-stack in a VPC.
8. Implement AWS Network Firewall for deep packet inspection.
9. Design and implement service mesh with AWS App Mesh.
10. Perform packet analysis during a DDoS simulation.

---

## Self Assessment
1. What is CIDR notation?
2. What is the difference between private and public IP?
3. What is the TCP three-way handshake?
4. What is a DNS A record vs. CNAME?
5. What is the difference between TCP and UDP?
6. What is a Security Group?
7. What is the difference between a public and private subnet?
8. What is a NAT Gateway used for?
9. What is HTTP/2's main advantage over HTTP/1.1?
10. What port does HTTPS use?

---

## Cheat Sheet

```bash
# DNS
dig myapp.com A; dig myapp.com MX; dig @8.8.8.8 myapp.com
nslookup myapp.com; host myapp.com

# Connectivity
ping 8.8.8.8; traceroute google.com
nc -zv host 443    # test if port is open
ss -tlnp           # listening ports
ss -tn             # established TCP connections

# HTTP
curl -I https://example.com           # headers only
curl -v https://example.com           # verbose (shows TLS)
curl -X POST -H "Content-Type: application/json" -d '{}' https://api.example.com/data

# tcpdump
tcpdump -i eth0 port 80 -A            # capture HTTP
tcpdump -i eth0 host 10.0.1.50       # traffic to/from IP
```

```
CIDR Quick Reference:
  /32 = 1 host (single IP)
  /30 = 4 addresses (2 usable)
  /28 = 16 addresses (14 usable)
  /24 = 256 addresses (254 usable) ← typical subnet
  /22 = 1024 addresses
  /20 = 4096 addresses
  /16 = 65536 addresses ← typical VPC
  /8  = 16.7M addresses

Common ports: 22=SSH, 80=HTTP, 443=HTTPS, 5432=PostgreSQL, 3306=MySQL, 6379=Redis, 27017=MongoDB
```
